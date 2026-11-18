import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptAnswers,
  answerCandidates,
  dispatchForm,
  formMessages,
  prepareAnswers,
  splitMessage,
} from "../src/lib/form";
import type { Question } from "../src/lib/types";

const questions: Question[] = [
  { id: "name", label: "Full name", kind: "text", required: true },
  { id: "email", label: "Email address", kind: "email", required: true },
  { id: "city", label: "City", kind: "text", required: true },
  {
    id: "experience",
    label: "Years of relevant experience",
    kind: "number",
    required: true,
  },
  {
    id: "shift",
    label: "Preferred shift",
    kind: "choice",
    options: ["Day", "Night"],
    required: false,
  },
];

function selected(
  prepared: ReturnType<typeof prepareAnswers>,
  values: Record<string, string>,
) {
  return Object.fromEntries(
    prepared.fields.flatMap((field) => {
      const index = field.candidates.indexOf(values[field.question.id]);
      return index >= 0
        ? [[field.key, { choice: `value_${index}`, confidence: 0.99 }]]
        : [];
    }),
  );
}

test("one reply supplies distinct values for several fields without overwriting saved answers", () => {
  const saved = { name: "Existing name" };
  const prepared = prepareAnswers(
    questions,
    saved,
    "Email: maria@example.com\nCity: Cebu\nExperience: 3\nShift: night",
    "email",
  );
  assert.ok(!prepared.fields.some((field) => field.question.id === "name"));
  const result = acceptAnswers(
    prepared,
    selected(prepared, {
      email: "maria@example.com",
      city: "Cebu",
      experience: "3",
      shift: "night",
    }),
    saved,
    0.85,
  );
  assert.deepEqual(result, {
    name: "Existing name",
    email: "maria@example.com",
    city: "Cebu",
    experience: "3",
    shift: "Night",
  });
});

test("missing and uncertain values stay unanswered, including out-of-range model choices", () => {
  const prepared = prepareAnswers(
    questions,
    {},
    "Maria Santos, maria@example.com",
    null,
  );
  const decisions = selected(prepared, {
    name: "Maria Santos",
    email: "maria@example.com",
  });
  decisions.answer_0.confidence = 0.3;
  Object.assign(decisions, {
    answer_2: { choice: "value_99999", confidence: 1 },
  });
  assert.deepEqual(acceptAnswers(prepared, decisions, {}, 0.85), {
    email: "maria@example.com",
  });
  assert.ok(!answerCandidates("I have no email yet", questions[1]).length);
  assert.ok(
    !answerCandidates("No relevant years provided", questions[3]).length,
  );
});

test("numbered, labelled and natural text values are exact source candidates", () => {
  const typed = prepareAnswers(
    questions,
    {},
    "2. maria@example.com\n4. 3",
    null,
  );
  assert.deepEqual(acceptAnswers(typed, {}, {}, 0.85), {
    email: "maria@example.com",
    experience: "3",
  });
  const numbered = prepareAnswers(questions, {}, "3. Cebu", null);
  assert.ok(
    !numbered.fields.some((field) => field.question.kind === "number"),
    "List markers are not numeric answers",
  );
  assert.ok(
    answerCandidates(
      "1. Maria Santos\n2. maria@example.com\n3. Cebu",
      questions[0],
    ).includes("Maria Santos"),
  );
  assert.ok(
    answerCandidates(
      "I'm Maria Santos and I live in Cebu",
      questions[0],
    ).includes("Maria Santos"),
  );
  assert.ok(!answerCandidates("Daydreaming", questions[4]).includes("Day"));
  const optional = prepareAnswers([questions[4]], {}, "1. SKIP", "shift");
  assert.deepEqual(
    acceptAnswers(optional, selected(optional, { shift: "SKIP" }), {}, 0.85),
    { shift: "[Skipped]" },
  );
  assert.ok(!answerCandidates("SKIP", questions[0]).length);
});

test("remaining form keeps original question numbers and sends ordered companion text, media and buttons", () => {
  const cfg = {
    questions,
    form_mode: "form" as const,
    form_intro: "Complete these:",
    process_messages: [
      {
        id: "first",
        text: "Step 1: Review the role",
        media_url: "https://example.com/video.mp4",
        media_type: "video" as const,
      },
      {
        id: "second",
        text: "Step 2: Prepare for the meeting",
        buttons: [{ title: "Details", url: "https://example.com/details" }],
      },
    ],
  };
  const messages = formMessages(cfg, {
    name: "Maria",
    email: "maria@example.com",
  });
  assert.match(messages[0].text, /3\. City/);
  assert.doesNotMatch(messages[0].text, /1\. Full name|2\. Email address/);
  assert.deepEqual(
    messages.map((part) => part.key),
    ["form:0", "process:first", "process:first:media", "process:second"],
  );
  assert.equal(messages[2].media_type, "video");
  assert.equal(messages[3].buttons?.[0].title, "Details");
  assert.deepEqual(
    formMessages(
      cfg,
      Object.fromEntries(questions.map((q) => [q.id, "answered"])),
    ),
    [],
  );
  assert.equal(
    formMessages({ ...cfg, form_mode: "single" }, {})[0].text.includes(
      "2. Email address",
    ),
    false,
  );
  assert.deepEqual(
    formMessages(cfg, {}),
    formMessages(cfg, {}),
    "Repeat sends preserve stable per-message keys",
  );
});

test("long forms split into bounded messages without losing questions or breaking emoji", () => {
  const text = "👋".repeat(2000);
  const split = splitMessage(text);
  assert.equal(split.join(""), text);
  assert.ok(
    split.every(
      (part) => part.length <= 1900 && !/[\uD800-\uDBFF]$/.test(part),
    ),
  );
  const parts = formMessages(
    { questions: questions.map((q) => ({ ...q, label: q.label.repeat(150) })) },
    {},
  );
  assert.ok(parts.length > 1);
  assert.ok(parts.every((part) => part.text.length <= 1900));
});

test("separate messages send sequentially and stop immediately after a failed or blocked send", async () => {
  const parts = formMessages(
    {
      questions,
      process_messages: [{ id: "step", text: "Process instructions" }],
    },
    {},
  );
  const events: string[] = [];
  await dispatchForm(parts, async (part) => {
    events.push(`start:${part.key}`);
    await Promise.resolve();
    events.push(`done:${part.key}`);
  });
  assert.deepEqual(events, [
    "start:form:0",
    "done:form:0",
    "start:process:step",
    "done:process:step",
  ]);
  const attempted: string[] = [];
  await assert.rejects(
    dispatchForm(parts, async (part) => {
      attempted.push(part.key);
      throw new Error("Contact opted out");
    }),
    /opted out/,
  );
  assert.deepEqual(attempted, ["form:0"]);
});
