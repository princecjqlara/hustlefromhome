import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { publicGet } from "./public-http.mjs";
const appId = process.env.FACEBOOK_APP_ID;
const base = (
  process.env.FACEBOOK_PUBLIC_APP_URL || "https://hustle-from-home.vercel.app"
).replace(/\/$/, "");
const callback = base + "/api/webhooks/facebook";
const fields = [
  "messages",
  "messaging_postbacks",
  "messaging_referrals",
  "message_deliveries",
  "message_reads",
  "message_echoes",
];
const token = appId + "|" + process.env.FACEBOOK_APP_SECRET;
async function meta(path, params) {
  const r = await fetch(
    "https://graph.facebook.com/" +
      process.env.FACEBOOK_GRAPH_VERSION +
      "/" +
      path,
    {
      method: params ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(params
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
      },
      body: params ? new URLSearchParams(params) : undefined,
      signal: AbortSignal.timeout(30000),
    },
  );
  const d = await r.json();
  if (!r.ok || d.error)
    throw new Error(d.error?.message || "Meta request failed");
  return d;
}
try {
  const before = await meta(appId + "/subscriptions");
  mkdirSync("artifacts", { recursive: true });
  if (!existsSync("artifacts/facebook-subscriptions-before-setup.json"))
    writeFileSync(
      "artifacts/facebook-subscriptions-before-setup.json",
      JSON.stringify(before, null, 2),
    );
  const challenge = "hustle-webhook-setup-check";
  const probe = await publicGet(
    callback +
      "?" +
      new URLSearchParams({
        "hub.mode": "subscribe",
        "hub.verify_token": process.env.FACEBOOK_VERIFY_TOKEN,
        "hub.challenge": challenge,
      }),
  );
  assert.equal(probe.status, 200, "Public webhook must be reachable");
  assert.equal(await probe.text(), challenge);
  if (process.argv.includes("--apply")) {
    const result = await meta(appId + "/subscriptions", {
      object: "page",
      callback_url: callback,
      verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
      fields: fields.join(","),
    });
    assert.ok(result.success, "Meta must confirm subscription");
  }
  const after = await meta(appId + "/subscriptions");
  const page = after.data?.find((s) => s.object === "page");
  const report = {
    app_id: appId,
    callback_url: page?.callback_url,
    active: page?.active,
    fields: page?.fields?.map((f) => f.name),
    matches_expected: page?.callback_url === callback,
    verification_endpoint_passed: true,
  };
  writeFileSync(
    "artifacts/facebook-setup-status.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes("--settings")) {
    const readFields =
      "id,name,app_domains,website_url,privacy_policy_url,contact_email";
    const basic = await meta(appId + "?fields=" + readFields);
    if (!existsSync("artifacts/facebook-app-settings-before-setup.json"))
      writeFileSync(
        "artifacts/facebook-app-settings-before-setup.json",
        JSON.stringify(basic, null, 2),
      );
    const domains = Array.from(
      new Set([...(basic.app_domains || []), new URL(base).hostname]),
    );
    const privacy = await fetch(base + "/privacy", {
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(privacy.status, 200);
    const changed = await meta(appId, {
      app_domains: JSON.stringify(domains),
      website_url: base + "/",
      privacy_policy_url: base + "/privacy",
      contact_email: process.env.ADMIN_EMAIL,
    });
    assert.ok(changed.success, "Meta must confirm app settings");
    const verified = await meta(appId + "?fields=" + readFields);
    writeFileSync(
      "artifacts/facebook-app-settings-status.json",
      JSON.stringify(verified, null, 2),
    );
    console.log(JSON.stringify({ app_settings: verified }, null, 2));
  }
  if (process.argv.includes("--apply")) {
    assert.equal(report.matches_expected, true);
    assert.equal(report.active, true);
    for (const field of fields)
      assert.ok(report.fields.includes(field), "Missing field " + field);
  }
} catch (e) {
  console.error("Facebook setup failed:", e.message);
  process.exitCode = 1;
}
