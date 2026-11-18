// Synthetic Jev checks only: this script never connects to Meta or sends messages.
import assert from "node:assert/strict";
import { prepareAnswers, acceptAnswers } from "../src/lib/form";
import type { Decision } from "../src/lib/jev";
import type { Question } from "../src/lib/types";

const questions: Question[] = [
  { id: "name", label: "Full name", kind: "text", required: true },
  { id: "email", label: "Email address", kind: "email", required: true },
  { id: "city", label: "City where you live", kind: "text", required: true },
  {
    id: "experience",
    label: "Years of customer service experience",
    kind: "number",
    required: true,
  },
];
const fixtures = [
  {
    name: "labelled fields",
    text: "Full name: Maria Santos\nEmail: maria@example.com\nCity: Cebu\nExperience: 3",
    expected: {
      name: "Maria Santos",
      email: "maria@example.com",
      city: "Cebu",
      experience: "3",
    },
  },
  {
    name: "numbered fields",
    text: "1. Maria Santos\n2. maria@example.com\n3. Cebu\n4. 3",
    expected: {
      name: "Maria Santos",
      email: "maria@example.com",
      city: "Cebu",
      experience: "3",
    },
  },
  {
    name: "natural language and partial answer",
    text: "I'm Maria Santos and I live in Cebu. My email is maria@example.com",
    expected: {
      name: "Maria Santos",
      email: "maria@example.com",
      city: "Cebu",
    },
  },
  {
    name: "greeting leaves all questions unanswered",
    text: "Hello! Can you tell me about the job?",
    expected: {},
  },
  {
    name: "partial numbered reply is not experience",
    text: "3. Cebu",
    expected: { city: "Cebu" },
  },
];
async function main() {
  for (const fixture of fixtures) {
    const prepared = prepareAnswers(questions, {}, fixture.text, null);
    const response = await fetch("https://openrouter.ai/api/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.JEV_MODEL || "typesafe/jev-1.14",
        state: JSON.stringify({
          latest_message: fixture.text,
          questionnaire: questions.map((q, i) => ({ ...q, number: i + 1 })),
        }),
        questions: prepared.decisions,
      }),
      signal: AbortSignal.timeout(25000),
    });
    const json = await response.json();
    assert.ok(response.ok && json.answers, "Jev inference failed");
    const result: Record<string, Decision> = json.answers;
    const answers = acceptAnswers(prepared, result, {}, 0.85);
    console.log(JSON.stringify({ fixture: fixture.name, answers }));
    assert.deepEqual(answers, fixture.expected, fixture.name);
  }
  console.log(
    "Synthetic Jev multi-answer checks passed; no customer messages sent.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
