import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
// The CLI receives secret values over stdin, never command-line arguments.
const cli = join(
  process.env.APPDATA || "",
  "npm/node_modules/vercel/dist/index.js",
);
if (!existsSync(cli))
  throw new Error("Install Vercel CLI and sign in before deploying.");
function run(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [cli, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    p.stdout.on("data", (d) => (output += d));
    p.stderr.on("data", (d) => (output += d));
    p.stdin.end(input || "");
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0)
        reject(new Error(`Vercel ${args[0]} failed (exit ${code}).`));
      else resolve(output);
    });
  });
}
const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "FACEBOOK_VERIFY_TOKEN",
  "FACEBOOK_GRAPH_VERSION",
  "OPENROUTER_API_KEY",
  "JEV_MODEL",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "APP_URL",
];
for (const key of keys) {
  const value =
    key === "APP_URL"
      ? process.env.DEPLOY_APP_URL || "https://hustle-from-home.vercel.app"
      : process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  await run(
    [
      "env",
      "add",
      key,
      "production",
      "--force",
      ...(key.startsWith("NEXT_PUBLIC_") ||
      [
        "APP_URL",
        "FACEBOOK_APP_ID",
        "FACEBOOK_GRAPH_VERSION",
        "JEV_MODEL",
      ].includes(key)
        ? []
        : ["--sensitive"]),
    ],
    value,
  );
  console.log(`${key} configured.`);
}
console.log(await run(["deploy", "--prod", "--yes"]));
