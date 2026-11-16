import pg from "pg";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const connection = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8"),
  },
});
const report = {
  checked_at: new Date().toISOString(),
  app_url: process.env.TEST_APP_URL || "https://hustle-from-home.vercel.app",
};
try {
  await connection.connect();
  report.settings = (
    await connection.query(
      "select automation_enabled,jsonb_array_length(questions) question_count,jsonb_array_length(faqs) faq_count,length(trim(rules)) rule_characters,min_gap_hours,quiet_start,quiet_end from settings where id='business'",
    )
  ).rows[0];
  report.pages = (
    await connection.query(
      "select id,name,connected,capabilities from pages order by id",
    )
  ).rows;
  report.counts = (
    await connection.query(
      "select (select count(*) from contacts) contacts,(select count(*) from meetings) meetings,(select count(*) from ad_accounts) ad_accounts,(select count(*) from members where role='admin') admins",
    )
  ).rows[0];
  report.jobs = (
    await connection.query(
      "select status,kind,count(*) from jobs group by status,kind order by status,kind",
    )
  ).rows;
  const meta = await fetch(
    `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION}/${process.env.FACEBOOK_APP_ID}/subscriptions`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await meta.json();
  report.facebook = {
    status: meta.status,
    subscriptions: result.data?.map((s) => ({
      object: s.object,
      callback_url: s.callback_url,
      fields: s.fields?.map((f) => f.name),
    })),
    error: result.error?.message,
  };
  report.webhook_matches =
    report.facebook.subscriptions?.some(
      (s) =>
        s.object === "page" &&
        s.callback_url === report.app_url + "/api/webhooks/facebook",
    ) || false;
  const jev = await fetch("https://openrouter.ai/api/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.JEV_MODEL,
      state: "A contact says: Please stop contacting me.",
      questions: {
        intent: {
          type: "choice",
          instructions: "Classify whether the contact wants further outreach.",
          criteria: {
            stop: "Does not want more contact",
            continue: "Wants to continue",
          },
        },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const answer = await jev.json();
  report.jev = {
    status: jev.status,
    model: answer.model,
    intent: answer.answers?.intent?.choice,
    error: answer.error?.message,
  };
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/live-audit.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
