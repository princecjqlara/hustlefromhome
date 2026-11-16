import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
let cookies = "";
async function request(path, options = {}) {
  const r = await fetch(base + path, {
    redirect: "manual",
    ...options,
    headers: { ...options.headers, ...(cookies ? { cookie: cookies } : {}) },
  });
  if (path === "/api/auth" && r.ok)
    cookies = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  return r;
}
assert.equal((await request("/login")).status, 200);
assert.equal((await request("/api/data")).status, 401);
assert.equal((await request("/overview")).status, 307);
assert.equal((await request("/api/jobs/tick", { method: "POST" })).status, 401);
assert.equal(
  (
    await request(
      "/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test",
    )
  ).status,
  403,
);
assert.equal(
  await (
    await request(
      "/api/webhooks/facebook?" +
        new URLSearchParams({
          "hub.mode": "subscribe",
          "hub.verify_token": process.env.FACEBOOK_VERIFY_TOKEN,
          "hub.challenge": "verification-ok",
        }),
    )
  ).text(),
  "verification-ok",
);
assert.equal(
  (await request("/api/webhooks/facebook", { method: "POST", body: "{}" }))
    .status,
  401,
);
const body = JSON.stringify({ object: "page", entry: [] });
const signature =
  "sha256=" +
  createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
    .update(body)
    .digest("hex");
assert.equal(
  (
    await request("/api/webhooks/facebook", {
      method: "POST",
      body,
      headers: { "X-Hub-Signature-256": signature },
    })
  ).status,
  200,
);
const login = await request("/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json", origin: base },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
});
assert.equal(login.status, 200, await login.text());
const data = await request("/api/data");
assert.equal(data.status, 200);
const payload = await data.json();
assert.equal(payload.user.role, "admin");
assert.ok(Array.isArray(payload.contacts));
assert.equal(payload.settings[0].automation_enabled, false);
assert.ok(!JSON.stringify(payload).includes(process.env.SUPABASE_SECRET_KEY));
assert.ok(!JSON.stringify(payload).includes(process.env.FACEBOOK_APP_SECRET));
assert.equal(
  (
    await request("/api/actions", {
      method: "POST",
      headers: {
        origin: "https://unrelated.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "jobs.run" }),
    })
  ).status,
  403,
);
for (const section of [
  "overview",
  "inbox",
  "contacts",
  "questionnaire",
  "faq",
  "qualification",
  "followups",
  "meetings",
  "calendar",
  "campaigns",
  "advertising",
  "settings",
]) {
  const r = await request("/" + section);
  assert.equal(r.status, 200, section);
  const html = await r.text();
  assert.ok(html.includes("hustle"), section);
  assert.ok(!html.includes("Internal Server Error"), section);
}
const tick = await request("/api/jobs/tick", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
});
assert.equal(tick.status, 200);
console.log(
  "HTTP checks passed: login, admin authorization, CSRF, secret redaction, webhook verification/signature, cron authorization, and 12 application screens.",
);
