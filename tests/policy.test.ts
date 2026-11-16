import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  eligibility,
  bestTimes,
  nextFollowup,
  quietAt,
  explicitOptOut,
} from "../src/lib/policy";
import { validSignature, encrypt, decrypt } from "../src/lib/crypto";
import type { Contact, Settings } from "../src/lib/types";
const now = Date.parse("2026-11-17T04:00:00Z");
const c = {
  opted_out: false,
  last_inbound_at: new Date(now - 3600000).toISOString(),
};
test("standard window closes exactly at 24 hours and opt-outs override all routes", () => {
  assert.equal(eligibility(c, "standard", false, {}, now), null);
  assert.match(
    eligibility(
      { ...c, last_inbound_at: new Date(now - 24 * 3600000).toISOString() },
      "standard",
      false,
      {},
      now,
    )!,
    /closed/,
  );
  assert.match(
    eligibility(
      { ...c, opted_out: true },
      "human_agent",
      true,
      { human_agent: true },
      now,
    )!,
    /opted out/,
  );
  assert.match(
    eligibility({ ...c, last_inbound_at: null }, "standard", false, {}, now)!,
    /closed/,
  );
});
test("Human Agent requires a human, approval, and an unexpired seven day window", () => {
  assert.match(
    eligibility(c, "human_agent", false, { human_agent: true }, now)!,
    /human reply/,
  );
  assert.match(eligibility(c, "human_agent", true, {}, now)!, /not confirmed/);
  assert.equal(
    eligibility(c, "human_agent", true, { human_agent: true }, now),
    null,
  );
  assert.match(
    eligibility(
      { ...c, last_inbound_at: new Date(now - 7 * 86400000).toISOString() },
      "human_agent",
      true,
      { human_agent: true },
      now,
    )!,
    /closed/,
  );
});
test("utility requires requested updates and marketing fails closed", () => {
  assert.match(eligibility(c, "utility", false, {}, now)!, /not requested/);
  assert.equal(
    eligibility(
      { ...c, utility_requested_at: new Date(now).toISOString() },
      "utility",
      true,
      {},
      now,
    ),
    null,
  );
  assert.match(eligibility(c, "marketing", false, {}, now)!, /not activated/);
});
test("sparse timing ranks first inquiry hour followed by nearby hours", () => {
  const result = bestTimes(
    ["2026-11-17T02:15:00Z"],
    "Asia/Manila",
    "2026-11-17T02:15:00Z",
    new Date(now),
  );
  assert.equal(result.confidence, "low");
  assert.deepEqual(
    result.slots.map((s) => s.hour),
    [10, 11, 9, 12, 8],
  );
  assert.equal(new Set(result.slots.map((s) => s.hour)).size, 5);
});
test("timing uses recent evidence and ignores future/outdated samples", () => {
  const dates = ["2026-11-12", "2026-11-13", "2026-11-14"].flatMap((d) => [
    d + "T03:00:00Z",
    d + "T03:15:00Z",
  ]);
  const result = bestTimes(
    [...dates, "2024-01-01T02:00:00Z", "2030-01-01T00:00:00Z"],
    "Asia/Manila",
    undefined,
    new Date(now),
  );
  assert.equal(result.confidence, "observed");
  assert.equal(result.observations, 6);
  assert.equal(result.slots[0].hour, 11);
});
test("quiet hours wrap midnight and can be disabled", () => {
  assert.equal(
    quietAt(new Date("2026-11-17T15:00:00Z"), "Asia/Manila", 21, 8),
    true,
  );
  assert.equal(
    quietAt(new Date("2026-11-17T04:00:00Z"), "Asia/Manila", 21, 8),
    false,
  );
  assert.equal(quietAt(new Date(now), "Asia/Manila", 0, 0), false);
});
test("follow-up respects spacing, quiet hours, and messaging expiry", () => {
  const contact = {
    ...c,
    timezone: "Asia/Manila",
    first_inquiry_at: "2026-11-17T03:00:00Z",
    last_outbound_at: new Date(now).toISOString(),
  } as Contact;
  const cfg = { min_gap_hours: 2, quiet_start: 21, quiet_end: 8 } as Settings;
  const next = nextFollowup([], contact, cfg, new Date(now));
  assert.ok(next);
  assert.ok(Date.parse(next) >= now + 2 * 3600000);
  assert.equal(quietAt(new Date(next), contact.timezone, 21, 8), false);
  assert.equal(
    nextFollowup(
      [],
      { ...contact, last_inbound_at: "2026-11-15T00:00:00Z" },
      cfg,
      new Date(now),
    ),
    null,
  );
});
test("English and Filipino explicit refusals suppress outreach", () => {
  for (const text of [
    "STOP",
    "not interested.",
    "Please stop messaging me",
    "ayoko",
    "huwag na po",
  ])
    assert.equal(explicitOptOut(text), true, text);
  for (const text of [
    "When do I start?",
    "Can you explain the role?",
    "I am interested",
  ])
    assert.equal(explicitOptOut(text), false, text);
});
test("webhook signatures bind to the exact raw body", () => {
  const body = '{"object":"page"}',
    secret = "test-secret",
    sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(validSignature(body, sig, secret), true);
  assert.equal(validSignature(body + " ", sig, secret), false);
  assert.equal(validSignature(body, "short", secret), false);
});
test("Page tokens round-trip with authenticated encryption and reject tampering", () => {
  process.env.TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  const encrypted = encrypt("test-page-token");
  assert.equal(decrypt(encrypted), "test-page-token");
  const parts = encrypted.split(".");
  parts[2] = "00" + parts[2].slice(2);
  assert.throws(() => decrypt(parts.join(".")));
});
