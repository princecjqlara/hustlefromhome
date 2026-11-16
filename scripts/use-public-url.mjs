import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
const target = new URL(process.argv[2] || "");
if (
  target.protocol !== "https:" ||
  target.username ||
  target.password ||
  target.pathname !== "/" ||
  target.search ||
  target.hash
)
  throw new Error("Provide an HTTPS origin, without a path or credentials.");
const origin = target.origin;
mkdirSync("artifacts", { recursive: true });
if (!existsSync("artifacts/env-before-public-tunnel.backup"))
  copyFileSync(".env.local", "artifacts/env-before-public-tunnel.backup");
let content = readFileSync(".env.local", "utf8");
for (const key of ["APP_URL", "FACEBOOK_PUBLIC_APP_URL"]) {
  const line = new RegExp("^" + key + "=.*$", "m");
  content = line.test(content)
    ? content.replace(line, key + "=" + origin)
    : content.trimEnd() + "\n" + key + "=" + origin + "\n";
}
writeFileSync(".env.local", content);
console.log(
  JSON.stringify(
    {
      app_url: origin,
      webhook_url: origin + "/api/webhooks/facebook",
      oauth_redirect_uri: origin + "/api/facebook/callback",
      cron_url: origin + "/api/jobs/tick",
    },
    null,
    2,
  ),
);
