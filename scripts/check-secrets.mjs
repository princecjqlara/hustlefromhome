import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const keys = [
  "SUPABASE_SECRET_KEY",
  "FACEBOOK_APP_SECRET",
  "OPENROUTER_API_KEY",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "FACEBOOK_VERIFY_TOKEN",
  "ADMIN_PASSWORD",
];
const secrets = keys.map((k) => process.env[k]).filter(Boolean);
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const hits = paths.filter((p) =>
  secrets.some((secret) => readFileSync(p, "utf8").includes(secret)),
);
if (hits.length) {
  console.error("Secrets found in tracked files:", hits.join(", "));
  process.exitCode = 1;
} else
  console.log("Tracked source contains none of the configured server secrets.");
