import pg from "pg";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
const connection = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8"),
  },
});
let cookie = "",
  meetingId,
  originalSettings;
const pageId = "audit-" + randomUUID();
async function action(name, data) {
  const response = await fetch(base + "/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base, cookie },
    body: JSON.stringify({ action: name, data }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}
try {
  await connection.connect();
  const state = (
    await connection.query(
      "select (select count(*) from contacts) contacts,(select count(*) from jobs where status in ('pending','running')) active_jobs",
    )
  ).rows[0];
  assert.equal(
    Number(state.contacts),
    0,
    "Run action audit only before real contacts are imported",
  );
  assert.equal(
    Number(state.active_jobs),
    0,
    "Run only while the queue is idle",
  );
  originalSettings = (
    await connection.query("select * from settings where id='business'")
  ).rows[0];
  assert.equal(originalSettings.automation_enabled, false);
  const login = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  await connection.query(
    "insert into pages(id,name,token_encrypted,connected) values($1,'Audit fixture','invalid',false)",
    [pageId],
  );
  const qualified = (
    await connection.query(
      "insert into contacts(page_id,psid,name,status,last_inbound_at,tags) values($1,'qualified-audit','Audit qualified','qualified',now(),'{audit}') returning id",
      [pageId],
    )
  ).rows[0].id;
  const incomplete = (
    await connection.query(
      "insert into contacts(page_id,psid,name,status,last_inbound_at,human_takeover) values($1,'incomplete-audit','Audit incomplete','incomplete',now(),true) returning id",
      [pageId],
    )
  ).rows[0].id;
  const settings = {
    ...originalSettings,
    min_gap_hours: Number(originalSettings.min_gap_hours),
    confidence_threshold: Number(originalSettings.confidence_threshold),
    automation_enabled: false,
    questions: [
      {
        id: "experience",
        label: "What relevant experience do you have?",
        kind: "text",
        required: true,
      },
    ],
    faqs: [
      {
        id: "role",
        question: "What is the role?",
        answer: "A customer support position.",
        buttons: [{ title: "Role details", url: "https://example.com/role" }],
      },
    ],
    rules: "Relevant customer support experience is required.",
  };
  await action("settings.save", settings);
  const saved = (
    await connection.query("select * from settings where id='business'")
  ).rows[0];
  assert.equal(saved.questions[0].id, "experience");
  assert.equal(saved.faqs[0].buttons[0].title, "Role details");
  assert.ok(saved.rule_version > originalSettings.rule_version);
  await action("contact.update", {
    id: qualified,
    tags: ["audit", "reviewed"],
    details: { city: "Manila" },
    notes: "Audit note",
  });
  const edited = (
    await connection.query("select * from contacts where id=$1", [qualified])
  ).rows[0];
  assert.equal(edited.details.city, "Manila");
  assert.deepEqual(edited.tags, ["audit", "reviewed"]);
  const tracked = (
    await connection.query(
      "insert into tracked_links(contact_id,url) values($1,'https://example.com/audit-button') returning id",
      [qualified],
    )
  ).rows[0].id;
  const click = await fetch(base + "/r/" + tracked, { redirect: "manual" });
  assert.equal(click.status, 302);
  assert.equal(
    click.headers.get("location"),
    "https://example.com/audit-button",
  );
  const snapshot = await (
    await fetch(base + "/api/data", { headers: { cookie } })
  ).json();
  assert.equal(snapshot.tracked_links.find((l) => l.id === tracked).clicks, 1);
  // Resuming is exercised with automation still paused: no messages or jobs should escape.
  await action("contact.update", { id: incomplete, human_takeover: false });
  assert.equal(
    (
      await connection.query(
        "select human_takeover from contacts where id=$1",
        [incomplete],
      )
    ).rows[0].human_takeover,
    false,
  );
  const meeting = {
    title: "Audit meeting",
    starts_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    timezone: "Asia/Manila",
    url: "https://example.com/audit",
    capacity: 1,
    notes: "Please join on time.",
    reminder_minutes: [1440, 60],
    reminder_text: "Reminder: {{title}} at {{date}}.",
  };
  meetingId = (await action("meeting.save", meeting)).id;
  assert.ok(meetingId);
  const first = (
    await connection.query("select revision from meetings where id=$1", [
      meetingId,
    ])
  ).rows[0].revision;
  const invited = await action("meeting.invite", {
    id: meetingId,
    page_id: pageId,
    tag: "audit",
  });
  assert.equal(invited.queued, 1);
  await action("meeting.invite", {
    id: meetingId,
    page_id: pageId,
    tag: "audit",
  });
  assert.equal(
    Number(
      (
        await connection.query(
          "select count(*) from jobs where payload->>'meeting_id'=$1",
          [meetingId],
        )
      ).rows[0].count,
    ),
    1,
  );
  await action("meeting.save", {
    ...meeting,
    id: meetingId,
    notes: "Edited without changing the start time.",
  });
  const second = (
    await connection.query("select revision from meetings where id=$1", [
      meetingId,
    ])
  ).rows[0].revision;
  assert.notEqual(first, second);
  await action("meeting.invite", {
    id: meetingId,
    page_id: pageId,
    tag: "audit",
  });
  const jobs = (
    await connection.query(
      "select action_key,status from jobs where payload->>'meeting_id'=$1",
      [meetingId],
    )
  ).rows;
  assert.equal(jobs.length, 2);
  assert.ok(
    jobs.some((j) => j.action_key.includes(first) && j.status === "canceled"),
  );
  assert.ok(
    jobs.some((j) => j.action_key.includes(second) && j.status === "pending"),
  );
  const preview = await action("campaign.preview", {
    name: "Audit campaign",
    text: "Hello",
    mode: "standard",
    filter: { page_id: pageId, tag: "audit" },
  });
  assert.equal(preview.total, 1);
  assert.equal(preview.eligible, 0);
  assert.equal(preview.blocked, 1);
  await connection.query(
    "insert into contacts(page_id,psid,name,tags) select $1,'bulk-'||n,'Bulk audit '||n,'{bulk-audit}' from generate_series(1,1001) n",
    [pageId],
  );
  const bulkPreview = await action("campaign.preview", {
    name: "Bulk pagination audit",
    text: "Audit",
    mode: "standard",
    filter: { page_id: pageId, tag: "bulk-audit" },
  });
  assert.equal(
    bulkPreview.total,
    1001,
    "Bulk previews include recipients beyond PostgREST default limit",
  );
  assert.equal(bulkPreview.eligible, 0);
  await action("meeting.cancel", { id: meetingId });
  assert.equal(
    Number(
      (
        await connection.query(
          "select count(*) from jobs where payload->>'meeting_id'=$1 and status='pending'",
          [meetingId],
        )
      ).rows[0].count,
    ),
    0,
  );
  assert.equal(
    Number(
      (
        await connection.query(
          "select count(*) from outbound_attempts where contact_id in(select id from contacts where page_id=$1)",
          [pageId],
        )
      ).rows[0].count,
    ),
    0,
  );
  console.log(
    "Action audit passed: settings/FAQ/buttons persistence, contact edits, takeover resume, meeting edits/reinvites/idempotency/cancel, tag filtering, campaign eligibility. No customer messages sent.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (originalSettings) {
    const keys = Object.keys(originalSettings)
      .filter((k) => k !== "id")
      .map((k) => '"' + k.replaceAll('"', '""') + '"')
      .join(",");
    await connection
      .query(
        `update settings set (${keys})=(select ${keys} from jsonb_populate_record(null::settings,$1::jsonb)) where id='business'`,
        [JSON.stringify(originalSettings)],
      )
      .catch((e) => {
        console.error("Settings restoration failed:", e.message);
        process.exitCode = 1;
      });
  }
  for (const [query, parameters] of [
    [
      "delete from jobs where contact_id in(select id from contacts where page_id=$1)",
      [pageId],
    ],
    [
      "delete from invitations where contact_id in(select id from contacts where page_id=$1)",
      [pageId],
    ],
    [
      "delete from tracked_links where contact_id in(select id from contacts where page_id=$1)",
      [pageId],
    ],
    ["delete from contacts where page_id=$1", [pageId]],
    ["delete from pages where id=$1", [pageId]],
    ["delete from meetings where id=$1", [meetingId || randomUUID()]],
  ])
    await connection.query(query, parameters).catch((e) => {
      console.error("Fixture cleanup failed:", e.message);
      process.exitCode = 1;
    });
  await connection.end();
}
