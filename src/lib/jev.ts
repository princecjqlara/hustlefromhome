import "server-only";
export type Decision = {
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  noul?: number;
};
export async function decide(
  state: unknown,
  questions: Record<string, unknown>,
): Promise<Record<string, Decision>> {
  const r = await fetch("https://openrouter.ai/api/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.JEV_MODEL || "typesafe/jev-1.14",
      state: JSON.stringify(state),
      questions,
    }),
    signal: AbortSignal.timeout(25000),
  });
  const json = await r.json();
  if (!r.ok || !json.answers)
    throw new Error("Jev unavailable; conversation needs review");
  return json.answers;
}
export function choice(answer: Decision | undefined, threshold: number) {
  if (!answer) return null;
  const entries = Object.entries(answer.probabilities || {}).sort(
    (a, b) => b[1] - a[1],
  );
  const label = answer.choice || entries[0]?.[0];
  const probability = label
    ? (answer.probabilities?.[label] ?? answer.confidence ?? 0)
    : 0;
  return probability >= threshold ? label : null;
}
