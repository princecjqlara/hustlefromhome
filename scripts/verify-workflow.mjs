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
async function webhook(text, mid, extra = {}) {
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
            ...extra,
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
  const watermark = Date.now();
  await client.query(
    "insert into messages(contact_id,external_id,direction,text,status,sent_at) values($1,$2,'out','Synthetic receipt verification','sent',now()-interval '1 second')",
    [c.id, id + "-out"],
  );
  await webhook("", id + "-read", { message: undefined, read: { watermark } });
  await tick();
  assert.equal(
    (
      await client.query("select status from messages where external_id=$1", [
        id + "-out",
      ])
    ).rows[0].status,
    "read",
  );
  await webhook("", id + "-delivery", {
    message: undefined,
    delivery: { watermark },
  });
  await tick();
  assert.equal(
    (
      await client.query("select status from messages where external_id=$1", [
        id + "-out",
      ])
    ).rows[0].status,
    "read",
  );
  await webhook("An older inquiry", id + "-stale", {
    timestamp: Date.parse(c.last_inbound_at) - 3600000,
  });
  await tick();
  assert.equal(
    new Date(
      (
        await client.query("select last_inbound_at from contacts where id=$1", [
          c.id,
        ])
      ).rows[0].last_inbound_at,
    ).getTime(),
    new Date(c.last_inbound_at).getTime(),
  );
  await webhook("STOP", id + "-stop");
  assert.equal(
    (await client.query("select opted_out from contacts where id=$1", [c.id]))
      .rows[0].opted_out,
    true,
    "Opt-out applies at receipt before the worker runs",
  );
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
    "Synthetic webhook workflow passed: persistence, deduplication, cron processing, read/delivery ordering, stale-message timestamps, immediate opt-out, and no outbound sends.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client
    .query(
      "delete from jobs where contact_id in(select id from contacts where page_id=$1) or payload->>'page_id'=$1",
      [id],
    )
    .catch((e) => {
      console.error("Fixture cleanup failed:", e.message);
      process.exitCode = 1;
    });
  await client
    .query("delete from webhook_events where payload->>'page_id'=$1", [id])
    .catch((e) => {
      console.error("Fixture cleanup failed:", e.message);
      process.exitCode = 1;
    });
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
