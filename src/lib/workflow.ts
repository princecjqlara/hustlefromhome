export function meetingVersion(meeting: {
  revision?: string;
  starts_at: string;
}) {
  return meeting.revision || meeting.starts_at;
}
export function needsFollowupResume(
  before: { human_takeover: boolean; opted_out: boolean },
  after: { human_takeover?: boolean; opted_out?: boolean },
) {
  return (
    (before.human_takeover && after.human_takeover === false) ||
    (before.opted_out && after.opted_out === false)
  );
}
export function eventTime(timestamp: unknown, now = Date.now()) {
  const value = Number(timestamp);
  return new Date(
    Number.isFinite(value) && value > 0 ? Math.min(value, now) : now,
  ).toISOString();
}
export function incomingIsOlder(incoming: string, last: string | null) {
  return Boolean(last && Date.parse(incoming) < Date.parse(last));
}
