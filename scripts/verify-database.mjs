import pg from "pg";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(
      process.env.DATABASE_CA_FILE || "artifacts/supabase-ca.crt",
      "utf8",
    ),
  },
});
try {
  await db.connect();
  await db.query("begin");
  await db.query(
    "insert into pages(id,name,token_encrypted) values('test-page-verification','Test','not-a-token')",
  );
  const c = (
    await db.query(
      "insert into contacts(page_id,psid,name) values('test-page-verification','test-psid','Test contact') returning id",
    )
  ).rows[0].id;
  const c2 = (
    await db.query(
      "insert into contacts(page_id,psid,name) values('test-page-verification','test-psid-2','Second test') returning id",
    )
  ).rows[0].id;
  assert.equal(
    (await db.query("select acquire_contact_lock($1) as result", [c])).rows[0]
      .result,
    true,
  );
  assert.equal(
    (await db.query("select acquire_contact_lock($1) as result", [c])).rows[0]
      .result,
    false,
  );
  await db.query("select release_contact_lock($1)", [c]);
  assert.equal(
    (await db.query("select acquire_contact_lock($1) as result", [c])).rows[0]
      .result,
    true,
  );
  const m = (
    await db.query(
      "insert into meetings(title,starts_at,url,capacity) values('Test',now()+interval '1 day','https://example.com',1) returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into invitations(meeting_id,contact_id) values($1,$2),($1,$3)",
    [m, c, c2],
  );
  assert.equal(
    (await db.query("select rsvp_meeting($1,$2,'yes') as result", [m, c]))
      .rows[0].result,
    "yes",
  );
  assert.equal(
    (await db.query("select rsvp_meeting($1,$2,'yes') as result", [m, c2]))
      .rows[0].result,
    "full",
  );
  assert.equal(
    (await db.query("select rsvp_meeting($1,$2,'yes') as result", [m, c]))
      .rows[0].result,
    "yes",
  );
  const l = (
    await db.query(
      "insert into tracked_links(contact_id,meeting_id,url) values($1,$2,'https://example.com') returning id",
      [c, m],
    )
  ).rows[0].id;
  assert.equal(
    (await db.query("select track_click($1) as result", [l])).rows[0].result,
    "https://example.com",
  );
  assert.equal(
    (await db.query("select clicks from tracked_links where id=$1", [l]))
      .rows[0].clicks,
    1,
  );
  await db.query(
    "insert into jobs(action_key,kind) values('test-claim-unique','test') on conflict do nothing",
  );
  const claimed = (await db.query("select * from claim_jobs(20)")).rows;
  assert.ok(claimed.some((j) => j.action_key === "test-claim-unique"));
  assert.equal(
    (await db.query("select * from claim_jobs(20)")).rows.some(
      (j) => j.action_key === "test-claim-unique",
    ),
    false,
  );
  await db.query("set local role authenticated");
  let blocked = false;
  try {
    await db.query("select token_encrypted from pages");
  } catch {
    blocked = true;
  }
  assert.equal(blocked, true);
  await db.query("rollback");
  console.log(
    "Database checks passed: RLS, contact locks, capacity, idempotent RSVP, clicks, job claims. Test data rolled back.",
  );
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
