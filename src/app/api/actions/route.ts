import { z } from "zod";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { member, sameOrigin, apiError } from "@/lib/auth";
import { db, checked, audit, allRows } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  send,
  enqueue,
  graph,
  contentMessage,
  buttonMessage,
} from "@/lib/facebook";
import { eligibility, type SendMode } from "@/lib/policy";
import { runJobs } from "@/lib/jobs";
import { scheduleFollowup } from "@/lib/automation";
import { meetingVersion, needsFollowupResume } from "@/lib/workflow";
import { defaultFormIntro } from "@/lib/form";
const uuid = z.string().uuid();
const url = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "Use an HTTPS URL");
const buttonsSchema = z
  .array(z.object({ title: z.string().min(1).max(20), url }))
  .max(3)
  .optional();
const filterSchema = z.object({
  page_id: z.string().optional(),
  tag: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
function applyFilter(q: any, f: z.infer<typeof filterSchema>) {
  if (f.page_id) q = q.eq("page_id", f.page_id);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.status) q = q.eq("status", f.status);
  if (f.search)
    q = q.ilike(
      "name",
      `%${f.search.replaceAll("%", "").replaceAll("_", "")}%`,
    );
  if (f.from) q = q.gte("first_inquiry_at", f.from);
  if (f.to) q = q.lte("first_inquiry_at", f.to);
  return q;
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await member();
    const body = await req.json();
    const s = db();
    if (user.role !== "admin")
      throw new Error("Forbidden: administrator required");
    let result: any = { ok: true };
    switch (body.action) {
      case "contact.utility_request": {
        const p = z
          .object({
            id: uuid,
            requested: z.boolean(),
            note: z.string().min(10).max(1000),
          })
          .parse(body.data);
        checked(
          await s
            .from("contacts")
            .update({
              utility_requested_at: p.requested
                ? new Date().toISOString()
                : null,
              utility_request_note: p.note,
            })
            .eq("id", p.id),
        );
        break;
      }
      case "template.create": {
        const p = z
          .object({
            page_id: z.string(),
            name: z.string().regex(/^[a-z0-9_]+$/),
            language: z.string().min(2),
            text: z.string().min(1).max(1024),
          })
          .parse(body.data);
        const page = checked(
          await s.from("pages").select("*").eq("id", p.page_id).single(),
        );
        result = await graph(
          page.id + "/message_templates",
          decrypt(page.token_encrypted),
          {
            name: p.name,
            language: p.language,
            category: "UTILITY",
            components: [{ type: "BODY", text: p.text }],
          },
        );
        break;
      }
      case "utility.send": {
        const p = z
          .object({
            contact_id: uuid,
            name: z.string().min(1),
            language: z.string().min(2),
            header: z.array(z.string().max(1000)).max(20),
            body: z.array(z.string().max(1000)).max(20),
          })
          .parse(body.data);
        const components = [
          ...(p.header.length
            ? [
                {
                  type: "header",
                  parameters: p.header.map((text) => ({ type: "text", text })),
                },
              ]
            : []),
          ...(p.body.length
            ? [
                {
                  type: "body",
                  parameters: p.body.map((text) => ({ type: "text", text })),
                },
              ]
            : []),
        ];
        await send(
          p.contact_id,
          {
            template: {
              name: p.name,
              language: { code: p.language },
              components,
            },
          },
          randomUUID(),
          "utility",
          true,
        );
        break;
      }
      case "contact.update": {
        const p = z
          .object({
            id: uuid,
            name: z.string().min(1).max(200).optional(),
            status: z
              .enum(["new", "incomplete", "review", "qualified", "unqualified"])
              .optional(),
            notes: z.string().max(20000).optional(),
            tags: z.array(z.string().min(1).max(60)).max(100).optional(),
            details: z.record(z.string(), z.string()).optional(),
            opted_out: z.boolean().optional(),
            human_takeover: z.boolean().optional(),
            timezone: z.string().optional(),
          })
          .parse(body.data);
        if (p.timezone) new Intl.DateTimeFormat("en", { timeZone: p.timezone });
        const { id, ...patch } = p;
        const before = checked(
          await s
            .from("contacts")
            .select("human_takeover,opted_out")
            .eq("id", id)
            .single(),
        );
        if (p.status)
          patch.tags = Array.from(
            new Set([
              ...(
                p.tags ||
                checked(
                  await s.from("contacts").select("tags").eq("id", id).single(),
                ).tags
              ).filter(
                (t: string) =>
                  t !== "pending-review" &&
                  t !== "qualified" &&
                  t !== "unqualified",
              ),
              ...(["qualified", "unqualified"].includes(p.status)
                ? [p.status]
                : []),
            ]),
          );
        checked(await s.from("contacts").update(patch).eq("id", id));
        if (p.status || p.opted_out || p.human_takeover)
          checked(
            await s
              .from("jobs")
              .update({
                status: "canceled",
                last_error: "Contact state changed",
              })
              .eq("contact_id", id)
              .eq("kind", "followup")
              .eq("status", "pending"),
          );
        if (needsFollowupResume(before, p))
          await scheduleFollowup(id, `resumed:${randomUUID()}`);
        break;
      }
      case "settings.save": {
        const p = z
          .object({
            automation_enabled: z.boolean(),
            questions: z
              .array(
                z.object({
                  id: z.string().min(1).max(60),
                  label: z.string().min(1).max(1000),
                  required: z.boolean(),
                  kind: z.enum(["text", "number", "email", "choice"]),
                  options: z.array(z.string()).optional(),
                }),
              )
              .max(50),
            form_mode: z.enum(["single", "form"]).default("form"),
            form_intro: z.string().max(2000).default(defaultFormIntro),
            process_messages: z
              .array(
                z
                  .object({
                    id: z.string().min(1).max(60),
                    text: z.string().max(2000),
                    media_url: z.union([url, z.literal("")]).optional(),
                    media_type: z
                      .enum(["image", "video", "audio", "file"])
                      .optional(),
                    buttons: buttonsSchema,
                  })
                  .refine(
                    (step) => !!step.text.trim() || !!step.media_url,
                    "Each process message needs text or media",
                  )
                  .refine(
                    (step) =>
                      !step.buttons?.length ||
                      (step.text.trim().length > 0 && step.text.length <= 640),
                    "Process messages with buttons need 1–640 characters of text",
                  ),
              )
              .max(10)
              .default([]),
            faqs: z
              .array(
                z.object({
                  id: z.string().min(1),
                  question: z.string().min(1),
                  answer: z.string().min(1).max(2000),
                  media_url: z.union([url, z.literal("")]).optional(),
                  media_type: z
                    .enum(["image", "video", "audio", "file"])
                    .optional(),
                  buttons: buttonsSchema,
                }),
              )
              .max(100),
            rules: z.string().max(20000),
            followup_text: z.string().min(1).max(2000),
            followup_buttons: buttonsSchema,
            followup_media_url: z.union([url, z.literal("")]).optional(),
            followup_media_type: z
              .enum(["image", "video", "audio", "file"])
              .optional(),
            min_gap_hours: z.number().min(0.25).max(168),
            quiet_start: z.number().int().min(0).max(23),
            quiet_end: z.number().int().min(0).max(23),
            confidence_threshold: z.number().min(0.5).max(1),
            completion_text: z.string().min(1).max(2000),
          })
          .parse(body.data);
        if (new Set(p.questions.map((q) => q.id)).size !== p.questions.length)
          throw new Error("Question IDs must be unique");
        if (
          new Set(p.process_messages.map((step) => step.id)).size !==
          p.process_messages.length
        )
          throw new Error("Process message IDs must be unique");
        if (p.questions.some((q) => q.kind === "choice" && !q.options?.length))
          throw new Error("Choice questions require options");
        if (p.automation_enabled && (!p.questions.length || !p.rules.trim()))
          throw new Error(
            "Add questions and qualification rules before enabling automation",
          );
        const old = checked(
          await s.from("settings").select("*").eq("id", "business").single(),
        );
        checked(
          await s
            .from("settings")
            .update({
              ...p,
              rule_version:
                old.rule_version +
                (old.rules !== p.rules ||
                JSON.stringify(old.questions) !== JSON.stringify(p.questions)
                  ? 1
                  : 0),
            })
            .eq("id", "business"),
        );
        if (p.automation_enabled && !old.automation_enabled) {
          const contacts = await allRows(
            s
              .from("contacts")
              .select("id")
              .in("status", ["new", "incomplete"])
              .eq("opted_out", false)
              .eq("human_takeover", false),
          );
          for (const c of contacts)
            await scheduleFollowup(c.id, `enabled:${randomUUID()}`);
        }
        break;
      }
      case "message.send": {
        const p = z
          .object({
            contact_id: uuid,
            text: z.string().max(2000),
            media_url: z.union([url, z.literal("")]).optional(),
            media_type: z.enum(["image", "video", "audio", "file"]).optional(),
            mode: z.enum(["standard", "human_agent"]),
          })
          .parse(body.data);
        if (!p.text.trim() && !p.media_url)
          throw new Error("Add a message or media");
        const key = randomUUID();
        if (p.text.trim())
          await send(p.contact_id, { text: p.text }, key, p.mode, true);
        if (p.media_url)
          await send(
            p.contact_id,
            contentMessage("", p.media_url, p.media_type),
            key + ":media",
            p.mode,
            true,
          );
        break;
      }
      case "meeting.save": {
        const p = z
          .object({
            id: uuid.optional(),
            title: z.string().min(1).max(80),
            starts_at: z.string().datetime(),
            timezone: z.string(),
            url,
            capacity: z.number().int().min(1).max(100000),
            notes: z.string().max(2000),
            reminder_minutes: z
              .array(z.number().int().min(1).max(43200))
              .max(10),
            reminder_text: z.string().min(1).max(2000),
          })
          .parse(body.data);
        new Intl.DateTimeFormat("en", { timeZone: p.timezone });
        if (new Date(p.starts_at).getTime() < Date.now())
          throw new Error("Choose a future meeting time");
        if (p.id) {
          checked(
            await s
              .from("meetings")
              .update({ ...p, revision: randomUUID() })
              .eq("id", p.id),
          );
          checked(
            await s
              .from("jobs")
              .update({
                status: "canceled",
                last_error: "Meeting edited; send updated invitations",
              })
              .eq("payload->>meeting_id", p.id)
              .eq("status", "pending"),
          );
        } else
          result = checked(
            await s.from("meetings").insert(p).select().single(),
          );
        break;
      }
      case "meeting.cancel": {
        const id = uuid.parse(body.data.id);
        checked(
          await s.from("meetings").update({ canceled: true }).eq("id", id),
        );
        checked(
          await s
            .from("jobs")
            .update({ status: "canceled", last_error: "Meeting canceled" })
            .eq("payload->>meeting_id", id)
            .eq("status", "pending"),
        );
        break;
      }
      case "meeting.invite": {
        const { id, tag, page_id } = z
          .object({
            id: uuid,
            tag: z.string().optional(),
            page_id: z.string().optional(),
          })
          .parse(body.data);
        const m = checked(
          await s.from("meetings").select("*").eq("id", id).single(),
        );
        if (m.canceled) throw new Error("Meeting canceled");
        const contacts = await allRows(
          applyFilter(
            s
              .from("contacts")
              .select("*")
              .eq("status", "qualified")
              .eq("opted_out", false),
            { tag, page_id },
          ),
        );
        for (const c of contacts) {
          checked(
            await s
              .from("invitations")
              .upsert(
                { meeting_id: id, contact_id: c.id },
                { onConflict: "meeting_id,contact_id", ignoreDuplicates: true },
              ),
          );
          await enqueue(
            "invitation",
            `invite:${id}:${c.id}:${meetingVersion(m)}`,
            c.id,
            {
              meeting_id: id,
              starts_at: m.starts_at,
              revision: meetingVersion(m),
            },
          );
        }
        result = { ok: true, queued: contacts.length };
        break;
      }
      case "invitation.attendance": {
        const p = z
          .object({ id: uuid, attended: z.boolean() })
          .parse(body.data);
        checked(
          await s
            .from("invitations")
            .update({ attended: p.attended })
            .eq("id", p.id),
        );
        break;
      }
      case "campaign.preview":
      case "campaign.send": {
        const p = z
          .object({
            name: z.string().min(1),
            text: z.string().max(2000),
            media_url: z.union([url, z.literal("")]).optional(),
            media_type: z.enum(["image", "video", "audio", "file"]).optional(),
            mode: z.enum(["standard", "utility", "marketing"]),
            buttons: buttonsSchema,
            filter: filterSchema,
          })
          .parse(body.data);
        if (!p.text && !p.media_url) throw new Error("Add message content");
        const contacts = await allRows(
          applyFilter(s.from("contacts").select("*"), p.filter),
        );
        const pages = checked(
          await s.from("pages").select("id,connected,capabilities"),
        );
        const eligible = contacts.filter((c: any) => {
          const page = pages.find((p) => p.id === c.page_id);
          return (
            page?.connected && !eligibility(c, p.mode, false, page.capabilities)
          );
        });
        result = {
          total: contacts.length,
          eligible: eligible.length,
          blocked: contacts.length - eligible.length,
        };
        if (body.action === "campaign.send") {
          if (p.mode !== "standard")
            throw new Error(
              "Template/marketing access must be activated before sending",
            );
          const campaign = checked(
            await s
              .from("campaigns")
              .insert({ name: p.name, content: p, filter: p.filter })
              .select()
              .single(),
          );
          for (const c of eligible) {
            if (p.text)
              await enqueue(
                "campaign",
                `campaign:${campaign.id}:${c.id}`,
                c.id,
                { mode: p.mode, message: buttonMessage(p.text, p.buttons) },
              );
            if (p.media_url)
              await enqueue(
                "campaign",
                `campaign:${campaign.id}:${c.id}:media`,
                c.id,
                {
                  mode: p.mode,
                  message: contentMessage("", p.media_url, p.media_type),
                },
              );
          }
          result.id = campaign.id;
        }
        break;
      }
      case "page.select": {
        const ids = z.array(z.string()).parse(body.data.ids);
        const jar = await cookies();
        const value = jar.get("meta_pending_pages")?.value;
        if (!value) throw new Error("Connect Facebook again");
        const session = checked(
          await s
            .from("oauth_sessions")
            .select("*")
            .eq("id", value)
            .eq("user_id", user.user_id)
            .gt("expires_at", new Date().toISOString())
            .single(),
        );
        const pages = JSON.parse(decrypt(session.pages_encrypted));
        for (const p of pages.filter((p: any) => ids.includes(p.id))) {
          await graph(`${p.id}/subscribed_apps`, p.access_token, {
            subscribed_fields:
              "messages,messaging_postbacks,messaging_referrals,message_deliveries,message_reads,message_echoes",
          });
          checked(
            await s.from("pages").upsert({
              id: p.id,
              name: p.name,
              token_encrypted: encrypt(p.access_token),
              connected: true,
              updated_at: new Date().toISOString(),
            }),
          );
        }
        checked(await s.from("oauth_sessions").delete().eq("id", value));
        jar.delete("meta_pending_pages");
        break;
      }
      case "page.update": {
        const p = z
          .object({
            id: z.string(),
            connected: z.boolean(),
            human_agent: z.boolean(),
          })
          .parse(body.data);
        checked(
          await s
            .from("pages")
            .update({
              connected: p.connected,
              capabilities: { human_agent: p.human_agent },
            })
            .eq("id", p.id),
        );
        break;
      }
      case "jobs.run":
        result = { results: await runJobs() };
        break;
      case "jobs.retry": {
        const id = uuid.parse(body.data.id);
        const j = checked(
          await s.from("jobs").select("*").eq("id", id).single(),
        );
        if (j.status === "uncertain" || j.kind === "webhook")
          throw new Error(
            "Uncertain sends cannot be automatically retried. Review the Meta conversation first.",
          );
        checked(
          await s
            .from("jobs")
            .update({
              status: "pending",
              due_at: new Date().toISOString(),
              attempts: 0,
            })
            .eq("id", id)
            .in("status", ["failed", "blocked"]),
        );
        break;
      }
      case "ads.sync": {
        const { from, to } = z
          .object({
            from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
          .parse(body.data);
        const accounts = checked(await s.from("ad_accounts").select("*"));
        let count = 0;
        for (const a of accounts) {
          const token = decrypt(a.token_encrypted);
          const q = new URLSearchParams({
            fields:
              "ad_id,ad_name,campaign_name,spend,account_currency,date_start",
            level: "ad",
            time_increment: "1",
            time_range: JSON.stringify({ since: from, until: to }),
            limit: "500",
          });
          let path = `${a.id}/insights?${q}`;
          for (let i = 0; i < 100; i++) {
            const r = await graph(path, token);
            for (const row of r.data || []) {
              checked(
                await s.from("ad_daily").upsert({
                  id: `${row.ad_id}:${row.date_start}`,
                  ad_id: row.ad_id,
                  date: row.date_start,
                  ad_name: row.ad_name,
                  campaign_name: row.campaign_name,
                  spend: Number(row.spend),
                  currency: row.account_currency,
                }),
              );
              count++;
            }
            if (!r.paging?.cursors?.after || !r.paging?.next) break;
            path = `${a.id}/insights?${q}&after=${encodeURIComponent(r.paging.cursors.after)}`;
          }
        }
        result = { ok: true, synced: count };
        break;
      }
      case "integration.credentials":
        result = {
          verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
        };
        break;
      default:
        throw new Error("Unknown action");
    }
    if (
      body.action !== "integration.credentials" &&
      body.action !== "campaign.preview"
    )
      await audit(
        body.action,
        { ...(body.data?.id ? { id: body.data.id } : {}) },
        user.user_id,
      );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
