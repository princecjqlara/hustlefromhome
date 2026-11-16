import { createHash } from "node:crypto";
import { validSignature, safeEqual } from "@/lib/crypto";
import { db, checked } from "@/lib/db";
import { enqueue } from "@/lib/facebook";
import { explicitOptOut } from "@/lib/policy";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (
    q.get("hub.mode") === "subscribe" &&
    safeEqual(
      q.get("hub.verify_token") || "",
      process.env.FACEBOOK_VERIFY_TOKEN || "unset",
    )
  )
    return new Response(q.get("hub.challenge") || "");
  return new Response("Verification failed", { status: 403 });
}
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 2000000)
    return new Response("Payload too large", { status: 413 });
  if (
    !validSignature(
      body,
      req.headers.get("x-hub-signature-256") || "",
      process.env.FACEBOOK_APP_SECRET!,
    )
  )
    return new Response("Invalid signature", { status: 401 });
  try {
    const data = JSON.parse(body);
    if (data.object !== "page") return new Response("Ignored");
    for (const entry of data.entry || []) {
      for (const event of entry.messaging || []) {
        if (
          !event.message?.is_echo &&
          event.message?.text &&
          explicitOptOut(event.message.text)
        ) {
          checked(
            await db()
              .from("contacts")
              .update({ opted_out: true, human_takeover: true })
              .eq("page_id", entry.id)
              .eq("psid", event.sender?.id || "missing"),
          );
        }
        const key = createHash("sha256")
          .update(entry.id + JSON.stringify(event))
          .digest("hex");
        checked(
          await db()
            .from("webhook_events")
            .upsert(
              { id: key, payload: { page_id: entry.id, event } },
              { onConflict: "id", ignoreDuplicates: true },
            ),
        );
        await enqueue("webhook", `event:${key}`, null, {
          page_id: entry.id,
          event,
          event_key: key,
        });
      }
    }
    return new Response("EVENT_RECEIVED");
  } catch {
    return new Response("Persistence failed; retry delivery", { status: 503 });
  }
}
