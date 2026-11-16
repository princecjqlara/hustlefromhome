import pg from "pg";
import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
const id = "test-" + randomUUID();
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("artifacts/supabase-ca.crt", "utf8"),
  },
});
async function webhook(text, mid) {
  const body = JSON.stringify({
    object: "page",
    entry: [
      {
        id,
        messaging: [
          {
            sender: { id: "synthetic-psid" },
            recipient: { id },
            timestamp: Date.now(),
            message: { mid, text },
          },
        ],
      },
    ],
  });
  const r = await fetch(base + "/api/webhooks/facebook", {
    method: "POST",
    body,
    headers: {
      "x-hub-signature-256":
        "sha256=" +
        createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
          .update(body)
          .digest("hex"),
    },
  });
  assert.equal(r.status, 200);
  return body;
}
async function tick() {
  const r = await fetch(base + "/api/jobs/tick", {
    method: "POST",
    headers: { authorization: "Bearer " + process.env.CRON_SECRET },
  });
  assert.equal(r.status, 200);
  return r.json();
}
try {
  await client.connect();
  assert.equal(
    (
      await client.query(
        "select automation_enabled from settings where id='business'",
      )
    ).rows[0].automation_enabled,
    false,
    "Run this synthetic check only before enabling automation",
  );
  await client.query(
    "insert into pages(id,name,token_encrypted,connected) values($1,'Synthetic verification','invalid',false)",
    [id],
  );
  await client.query(
    "insert into contacts(page_id,psid,name) values($1,'synthetic-psid','Synthetic verification')",
    [id],
  );
  const raw = await webhook("Hello, I have an inquiry", id + "-first");
  await tick();
  let c = (await client.query("select * from contacts where page_id=$1", [id]))
    .rows[0];
  assert.ok(c.last_inbound_at);
  assert.equal(c.opted_out, false);
  const signature =
    "sha256=" +
    createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
      .update(raw)
      .digest("hex");
  assert.equal(
    (
      await fetch(base + "/api/webhooks/facebook", {
        method: "POST",
        body: raw,
        headers: { "x-hub-signature-256": signature },
      })
    ).status,
    200,
  );
  await tick();
  assert.equal(
    Number(
      (
        await client.query(
          "select count(*) from messages where contact_id=$1",
          [c.id],
        )
      ).rows[0].count,
    ),
    1,
  );
  await webhook("STOP", id + "-stop");
  await tick();
  c = (await client.query("select * from contacts where page_id=$1", [id]))
    .rows[0];
  assert.equal(c.opted_out, true);
  assert.equal(c.human_takeover, true);
  assert.equal(
    Number(
      (
        await client.query(
          "select count(*) from outbound_attempts where contact_id=$1",
          [c.id],
        )
      ).rows[0].count,
    ),
    0,
  );
  console.log(
    "Synthetic webhook workflow passed: persistence, duplicate protection, cron processing, immediate opt-out, and no outbound sends.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client
    .query(
      "delete from jobs where contact_id in(select id from contacts where page_id=$1) or payload->>page_id=$1",
      [id],
    )
    .catch(() => {});
  await client
    .query("delete from webhook_events where payload->>page_id=$1", [id])
    .catch(() => {});
  await client
    .query(
      "delete from contact_locks where contact_id in(select id from contacts where page_id=$1)",
      [id],
    )
    .catch(() => {});
  await client
    .query("delete from contacts where page_id=$1", [id])
    .catch(() => {});
  await client.query("delete from pages where id=$1", [id]).catch(() => {});
  await client.end();
}
