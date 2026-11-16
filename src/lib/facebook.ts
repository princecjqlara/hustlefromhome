import "server-only";
import { db, checked, audit } from "./db";
import { decrypt } from "./crypto";
import { eligibility, type SendMode } from "./policy";
export class Blocked extends Error {}
export class Uncertain extends Error {}
export async function graph(path: string, token: string, body?: unknown) {
  const r = await fetch(
    `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || "v27.0"}/${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    },
  );
  const json = await r.json();
  if (!r.ok || json.error)
    throw new Error(json.error?.message || "Meta request failed");
  return json;
}
export async function enqueue(
  kind: string,
  key: string,
  contactId: string | null,
  payload: unknown,
  dueAt = new Date().toISOString(),
) {
  const r = await db()
    .from("jobs")
    .upsert(
      { kind, action_key: key, contact_id: contactId, payload, due_at: dueAt },
      { onConflict: "action_key", ignoreDuplicates: true },
    );
  checked(r);
}
export async function send(
  contactId: string,
  message: Record<string, any>,
  key: string,
  mode: SendMode = "standard",
  manual = false,
  guard?: { expectedInbound: string },
) {
  const s = db();
  const contact = checked(
    await s.from("contacts").select("*").eq("id", contactId).single(),
  );
  const page = checked(
    await s.from("pages").select("*").eq("id", contact.page_id).single(),
  );
  if (!page.connected) throw new Blocked("Page is disconnected");
  const reason = eligibility(contact, mode, manual, page.capabilities);
  if (reason) throw new Blocked(reason);
  if (mode === "utility") {
    if (!message.template?.name)
      throw new Blocked("Choose an approved utility template");
    const templates = await graph(
      page.id +
        "/message_templates?fields=name,status,category,language&name=" +
        encodeURIComponent(message.template.name),
      decrypt(page.token_encrypted),
    );
    if (
      !templates.data?.some(
        (t: any) =>
          t.name === message.template.name &&
          t.language === message.template.language?.code &&
          t.status === "APPROVED" &&
          t.category === "UTILITY",
      )
    )
      throw new Blocked("Template is not approved for this Page");
  }
  const prior = checked(
    await s
      .from("outbound_attempts")
      .select("*")
      .eq("action_key", key)
      .maybeSingle(),
  );
  if (prior?.status === "sent") return prior.message_id;
  if (prior) throw new Uncertain("Prior send outcome requires review");
  // Wrap external button URLs with per-contact tracked redirects.
  message = JSON.parse(JSON.stringify(message));
  const buttonGroups = [
    message.attachment?.payload?.buttons,
    ...(message.attachment?.payload?.elements || []).map((e: any) => e.buttons),
  ].filter(Boolean);
  for (const buttons of buttonGroups)
    for (const button of buttons) {
      if (
        button.type === "web_url" &&
        !button.url.startsWith(process.env.APP_URL + "/r/")
      ) {
        const link = checked(
          await s
            .from("tracked_links")
            .insert({ contact_id: contactId, url: button.url })
            .select("id")
            .single(),
        );
        button.url = process.env.APP_URL + "/r/" + link.id;
      }
    }
  let result;
  const current = checked(
    await s.from("contacts").select("*").eq("id", contactId).single(),
  );
  const currentReason = eligibility(current, mode, manual, page.capabilities);
  if (currentReason) throw new Blocked(currentReason);
  if (guard) {
    const config = checked(
      await s
        .from("settings")
        .select("automation_enabled")
        .eq("id", "business")
        .single(),
    );
    if (
      !config.automation_enabled ||
      current.human_takeover ||
      !["new", "incomplete"].includes(current.status) ||
      current.last_inbound_at !== guard.expectedInbound
    )
      throw new Blocked("Conversation changed before follow-up dispatch");
  }
  const reservation = await s
    .from("outbound_attempts")
    .insert({ action_key: key, contact_id: contactId });
  if (reservation.error) throw new Uncertain("Send already reserved");
  try {
    result = await graph(`${page.id}/messages`, decrypt(page.token_encrypted), {
      recipient: { id: contact.psid },
      messaging_type:
        mode === "utility"
          ? "UTILITY"
          : mode === "human_agent"
            ? "MESSAGE_TAG"
            : "RESPONSE",
      ...(mode === "human_agent" ? { tag: "HUMAN_AGENT" } : {}),
      message,
    });
  } catch (e) {
    await s
      .from("outbound_attempts")
      .update({
        status: "uncertain",
        reason: "Meta request outcome needs review",
      })
      .eq("action_key", key);
    throw new Uncertain(
      e instanceof Error ? e.message : "Send outcome unknown",
    );
  }
  checked(
    await s
      .from("outbound_attempts")
      .update({ status: "sent", message_id: result.message_id })
      .eq("action_key", key),
  );
  checked(
    await s.from("messages").upsert(
      {
        contact_id: contactId,
        external_id: result.message_id,
        direction: "out",
        text:
          message.text ||
          message.template?.name ||
          message.attachment?.payload?.text ||
          message.attachment?.payload?.elements?.[0]?.title ||
          "",
        media: message.attachment ? [message.attachment] : [],
        status: "sent",
      },
      { onConflict: "external_id" },
    ),
  );
  checked(
    await s
      .from("contacts")
      .update({ last_outbound_at: new Date().toISOString() })
      .eq("id", contactId),
  );
  await audit("message.sent", {
    contact_id: contactId,
    mode,
    message_id: result.message_id,
  });
  return result.message_id;
}
export function contentMessage(text: string, url?: string, type = "image") {
  if (url) return { attachment: { type, payload: { url, is_reusable: true } } };
  return { text };
}

export function buttonMessage(
  text: string,
  buttons?: { title: string; url: string }[],
) {
  if (!buttons?.length) return { text };
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: text.slice(0, 640),
        buttons: buttons.map((b) => ({
          type: "web_url",
          title: b.title,
          url: b.url,
        })),
      },
    },
  };
}
