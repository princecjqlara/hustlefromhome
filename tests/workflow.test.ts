import { test } from "node:test";
import assert from "node:assert/strict";
import {
  meetingVersion,
  needsFollowupResume,
  eventTime,
  incomingIsOlder,
} from "../src/lib/workflow";
test("same-time meeting edits produce different scheduling generations", () => {
  const before = { starts_at: "2026-12-01T00:00:00Z", revision: "first" };
  const after = { ...before, revision: "second" };
  assert.notEqual(
    `invite:meeting:contact:${meetingVersion(before)}`,
    `invite:meeting:contact:${meetingVersion(after)}`,
  );
  assert.equal(
    meetingVersion({ starts_at: before.starts_at }),
    before.starts_at,
  );
});
test("resuming takeover or restored consent re-arms followups; unrelated edits do not", () => {
  assert.equal(
    needsFollowupResume(
      { human_takeover: true, opted_out: false },
      { human_takeover: false },
    ),
    true,
  );
  assert.equal(
    needsFollowupResume(
      { human_takeover: false, opted_out: true },
      { opted_out: false },
    ),
    true,
  );
  assert.equal(
    needsFollowupResume(
      { human_takeover: false, opted_out: false },
      { human_takeover: true },
    ),
    false,
  );
  assert.equal(
    needsFollowupResume({ human_takeover: true, opted_out: true }, {}),
    false,
  );
});
test("stale webhook times compare instants across equivalent timezone representations", () => {
  assert.equal(
    incomingIsOlder("2026-11-17T12:00:00+08:00", "2026-11-17T04:00:00.000Z"),
    false,
  );
  assert.equal(
    incomingIsOlder("2026-11-17T03:59:59Z", "2026-11-17T04:00:00.000Z"),
    true,
  );
  assert.equal(incomingIsOlder("2026-11-17T05:00:00Z", null), false);
});
test("event timestamp normalization preserves inquiry time and rejects invalid/future values", () => {
  const now = Date.parse("2026-11-17T04:00:00Z");
  assert.equal(eventTime(now - 60000, now), "2026-11-17T03:59:00.000Z");
  assert.equal(eventTime("invalid", now), "2026-11-17T04:00:00.000Z");
  assert.equal(eventTime(now + 3600000, now), "2026-11-17T04:00:00.000Z");
  assert.equal(eventTime(undefined, now), "2026-11-17T04:00:00.000Z");
});
