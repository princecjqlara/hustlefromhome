import type { Contact, Settings } from "./types";
export type SendMode = "standard" | "human_agent" | "utility" | "marketing";
export function eligibility(
  contact: Pick<
    Contact,
    "opted_out" | "last_inbound_at" | "utility_requested_at"
  >,
  mode: SendMode,
  manual: boolean,
  capabilities: Record<string, any> = {},
  now = Date.now(),
): string | null {
  if (contact.opted_out) return "Contact opted out";
  const age = contact.last_inbound_at
    ? now - new Date(contact.last_inbound_at).getTime()
    : Infinity;
  if (age < 0) return "Invalid inbound timestamp";
  if (mode === "standard")
    return age < 24 * 3600000
      ? null
      : "Standard 24-hour messaging window closed";
  if (mode === "human_agent")
    return !manual
      ? "HUMAN_AGENT requires an individual human reply"
      : !capabilities.human_agent
        ? "Human Agent access is not confirmed"
        : age < 7 * 86400000
          ? null
          : "Human Agent seven-day window closed";
  if (mode === "utility")
    return contact.utility_requested_at
      ? null
      : "Contact has not requested utility updates";
  return "Approved marketing access is not activated for this integration";
}
export function quietAt(date: Date, zone: string, start: number, end: number) {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: zone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
  return start === end
    ? false
    : start > end
      ? hour >= start || hour < end
      : hour >= start && hour < end;
}
export function bestTimes(
  timestamps: string[],
  zone = "Asia/Manila",
  first?: string,
  now = new Date(),
) {
  const dates = timestamps
    .map((t) => new Date(t))
    .filter(
      (d) =>
        Number.isFinite(d.getTime()) &&
        now.getTime() - d.getTime() <= 90 * 86400000 &&
        d <= now,
    );
  const local = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(d);
  const days = new Set(
    dates.map((d) =>
      local(d)
        .filter((p) => ["year", "month", "day"].includes(p.type))
        .map((p) => p.value)
        .join("-"),
    ),
  );
  const sufficient = dates.length >= 5 && days.size >= 3;
  const scores = Array(24).fill(0);
  for (const d of dates) {
    const h = Number(local(d).find((p) => p.type === "hour")?.value);
    const w = 2 ** (-(now.getTime() - d.getTime()) / 86400000 / 30);
    for (const offset of [-1, 0, 1])
      scores[(h + offset + 24) % 24] += w * (offset === 0 ? 1 : 0.5);
  }
  const anchor = Number(
    local(new Date(first || dates[0] || now)).find((p) => p.type === "hour")
      ?.value,
  );
  const hours = sufficient
    ? scores
        .map((score, h) => ({ hour: h, score }))
        .sort((a, b) => b.score - a.score)
    : [0, 1, -1, 2, -2, ...Array.from({ length: 19 }, (_, i) => i + 3)].map(
        (o, i) => ({ hour: (anchor + o + 24) % 24, score: 1 / (i + 1) }),
      );
  return {
    confidence: sufficient ? "observed" : "low",
    observations: dates.length,
    days: days.size,
    slots: hours.slice(0, 5),
  };
}
export function nextFollowup(
  timestamps: string[],
  contact: Contact,
  settings: Settings,
  now = new Date(),
) {
  const ranks = bestTimes(
    timestamps,
    contact.timezone,
    contact.first_inquiry_at,
    now,
  ).slots;
  const after = Math.max(
    now.getTime() + 60000,
    new Date(contact.last_outbound_at || 0).getTime() +
      settings.min_gap_hours * 3600000,
  );
  const deadline =
    new Date(contact.last_inbound_at || 0).getTime() + 24 * 3600000;
  const candidates: Date[] = [];
  for (
    let t = Math.ceil(after / 900000) * 900000;
    t < Math.min(deadline, after + 48 * 3600000);
    t += 900000
  ) {
    const date = new Date(t);
    if (
      quietAt(date, contact.timezone, settings.quiet_start, settings.quiet_end)
    )
      continue;
    candidates.push(date);
  }
  if (!candidates.length) return null;
  const hour = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en", {
        timeZone: contact.timezone,
        hour: "numeric",
        hourCycle: "h23",
      }).format(d),
    );
  return (
    candidates.find((d) => ranks.some((s) => s.hour === hour(d))) ||
    candidates[0]
  ).toISOString();
}
export function explicitOptOut(text: string) {
  return (
    /^(stop|unsubscribe|cancel|no thanks|not interested|ayoko|tama na)[.!\s]*$/i.test(
      text.trim(),
    ) ||
    /\b(stop messaging|do not contact|don't contact|wag na|huwag na|remove me)\b/i.test(
      text,
    )
  );
}
