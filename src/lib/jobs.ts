import "server-only";
import { db, checked, audit } from "./db";
import { processEvent, settings, scheduleFollowup } from "./automation";
import {
  send,
  enqueue,
  contentMessage,
  Blocked,
  Uncertain,
  buttonMessage,
} from "./facebook";
import { choice, decide } from "./jev";
import { quietAt } from "./policy";
import type { Job } from "./types";
import { meetingVersion } from "./workflow";
import { sendForm } from "./form-dispatch";
async function execute(job: Job) {
  const s = db();
  if (job.kind === "webhook") {
    await processEvent(
      job.payload.event,
      job.payload.page_id,
      job.payload.event_key,
    );
    return;
  }
  const c = checked(
    await s.from("contacts").select("*").eq("id", job.contact_id).single(),
  );
  const cfg = await settings();
  if (job.kind === "followup") {
    if (
      !cfg.automation_enabled ||
      c.human_takeover ||
      c.opted_out ||
      !["new", "incomplete"].includes(c.status) ||
      c.last_inbound_at !== job.payload.expected_inbound
    )
      throw new Blocked("Follow-up no longer applies");
    if (
      quietAt(new Date(), c.timezone, cfg.quiet_start, cfg.quiet_end) ||
      Date.now() - new Date(c.last_outbound_at || 0).getTime() <
        cfg.min_gap_hours * 3600000
    ) {
      await scheduleFollowup(c.id, job.id);
      return;
    }
    const history = checked(
      await s
        .from("messages")
        .select("direction,text")
        .eq("contact_id", c.id)
        .order("sent_at", { ascending: false })
        .limit(50),
    ).reverse();
    const decision = await decide(
      { conversation: history },
      {
        action: {
          type: "choice",
          instructions:
            "Should this contact receive an approved follow-up to finish their unanswered questionnaire? Check their latest intent. Never send after refusal.",
          criteria: {
            send: "Interested and questionnaire is incomplete",
            stop: "No longer wants contact or to continue",
            review: "Unclear or needs a person",
          },
        },
      },
    );
    const action = choice(decision.action, cfg.confidence_threshold);
    if (action === "stop") {
      checked(
        await s.from("contacts").update({ opted_out: true }).eq("id", c.id),
      );
      throw new Blocked("Contact no longer wants outreach");
    }
    if (action !== "send") {
      checked(
        await s
          .from("contacts")
          .update({ human_takeover: true })
          .eq("id", c.id),
      );
      throw new Blocked("Jev requested human review");
    }
    await send(
      c.id,
      buttonMessage(cfg.followup_text, cfg.followup_buttons),
      job.id,
      "standard",
      false,
      { expectedInbound: c.last_inbound_at },
    );
    if (cfg.followup_media_url)
      await send(
        c.id,
        contentMessage("", cfg.followup_media_url, cfg.followup_media_type),
        `${job.id}:media`,
        "standard",
        false,
        { expectedInbound: c.last_inbound_at },
      );
    const current = checked(
      await s.from("contacts").select("answers").eq("id", c.id).single(),
    );
    await sendForm(
      c.id,
      cfg,
      current.answers,
      `followup-form:${job.id}`,
      c.last_inbound_at,
    );
    await scheduleFollowup(c.id, job.id);
    return;
  }
  if (job.kind === "invitation" || job.kind === "reminder") {
    const m = checked(
      await s
        .from("meetings")
        .select("*")
        .eq("id", job.payload.meeting_id)
        .single(),
    );
    const invite = checked(
      await s
        .from("invitations")
        .select("*")
        .eq("meeting_id", m.id)
        .eq("contact_id", c.id)
        .single(),
    );
    if (
      m.canceled ||
      new Date(m.starts_at).getTime() < Date.now() ||
      c.status !== "qualified" ||
      invite.rsvp === "no" ||
      job.payload.starts_at !== m.starts_at ||
      (job.payload.revision && job.payload.revision !== meetingVersion(m))
    )
      throw new Blocked("Meeting invitation or reminder no longer applies");
    const date =
      new Date(m.starts_at).toLocaleString("en-PH", {
        timeZone: m.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }) + ` (${m.timezone})`;
    if (job.kind === "reminder") {
      const text = m.reminder_text
        .replaceAll("{{title}}", m.title)
        .replaceAll("{{date}}", date)
        .replaceAll("{{notes}}", m.notes);
      await send(c.id, { text }, job.id);
      return;
    }
    let link = checked(
      await s
        .from("tracked_links")
        .select("id")
        .eq("contact_id", c.id)
        .eq("meeting_id", m.id)
        .maybeSingle(),
    );
    if (!link)
      link = checked(
        await s
          .from("tracked_links")
          .insert({ contact_id: c.id, meeting_id: m.id, url: m.url })
          .select("id")
          .single(),
      );
    checked(
      await s.from("tracked_links").update({ url: m.url }).eq("id", link.id),
    );
    await send(
      c.id,
      {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: m.title.slice(0, 80),
                subtitle: `${date}\n${m.notes}`.slice(0, 80),
                buttons: [
                  {
                    type: "postback",
                    title: "Confirm my seat",
                    payload: `rsvp:${m.id}:yes`,
                  },
                  {
                    type: "web_url",
                    title: "Meeting details",
                    url: `${process.env.APP_URL}/r/${link.id}`,
                  },
                  {
                    type: "postback",
                    title: "Cannot attend",
                    payload: `rsvp:${m.id}:no`,
                  },
                ],
              },
            ],
          },
        },
      },
      job.id,
    );
    if (m.notes) await send(c.id, { text: m.notes }, `${job.id}:notes`);
    for (const minutes of m.reminder_minutes) {
      const due = new Date(new Date(m.starts_at).getTime() - minutes * 60000);
      if (due.getTime() > Date.now())
        await enqueue(
          "reminder",
          `reminder:${invite.id}:${meetingVersion(m)}:${minutes}`,
          c.id,
          {
            meeting_id: m.id,
            starts_at: m.starts_at,
            revision: meetingVersion(m),
          },
          due.toISOString(),
        );
    }
    return;
  }
  if (job.kind === "campaign") {
    await send(
      c.id,
      job.payload.message,
      job.id,
      job.payload.mode || "standard",
      false,
    );
    return;
  }
  throw new Blocked("Unknown job type");
}
export async function runJobs() {
  const jobs = checked(
    await db().rpc("claim_jobs", { batch_size: 3 }),
  ) as Job[];
  return Promise.all(
    jobs.map(async (job) => {
      try {
        await execute(job);
        checked(
          await db()
            .from("jobs")
            .update({ status: "done", last_error: null })
            .eq("id", job.id),
        );
        return { id: job.id, status: "done" };
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Job failed";
        const busy = reason === "Conversation busy; retry later";
        const status =
          e instanceof Blocked
            ? "blocked"
            : e instanceof Uncertain
              ? "uncertain"
              : job.kind === "webhook" && !busy
                ? "failed"
                : job.attempts >= 4
                  ? "failed"
                  : "pending";
        checked(
          await db()
            .from("jobs")
            .update({
              status,
              last_error: reason,
              due_at: new Date(
                Date.now() + Math.min(60, 2 ** job.attempts) * 60000,
              ).toISOString(),
            })
            .eq("id", job.id),
        );
        if (job.kind === "webhook" && !busy) {
          let q = db().from("contacts").update({ human_takeover: true });
          q = job.contact_id
            ? q.eq("id", job.contact_id)
            : q
                .eq("page_id", job.payload.page_id)
                .eq("psid", job.payload.event?.sender?.id || "missing");
          checked(await q);
        }
        await audit("job." + status, { job_id: job.id, reason });
        return { id: job.id, status };
      }
    }),
  );
}
