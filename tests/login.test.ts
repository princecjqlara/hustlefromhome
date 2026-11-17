import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, loginFailure, allowedOrigin } from "../src/lib/login";
test("pasted email whitespace and capitalization are normalized", () => {
  assert.equal(normalizeEmail("  Admin@Example.COM\n"), "admin@example.com");
});
test("service failures and rate limits are distinct from wrong credentials", () => {
  assert.equal(loginFailure({ status: 429 }).status, 429);
  assert.equal(loginFailure({ name: "AuthRetryableFetchError" }).status, 503);
  assert.equal(loginFailure({ status: 502 }).status, 503);
  assert.equal(
    loginFailure({ code: "invalid_credentials", status: 400 }).status,
    401,
  );
  assert.equal(loginFailure({ code: "email_not_confirmed" }).status, 403);
  assert.equal(loginFailure({}).status, 503);
});
test("local aliases and configured public origin work while foreign origins are rejected", () => {
  const local = "http://localhost:3000/api/auth",
    publicUrl = "https://my-app.ngrok-free.dev";
  assert.equal(
    allowedOrigin("http://127.0.0.1:3000", local, "127.0.0.1:3000", publicUrl),
    true,
  );
  assert.equal(
    allowedOrigin(publicUrl, local, "127.0.0.1:3000", publicUrl),
    true,
  );
  assert.equal(
    allowedOrigin(
      "https://attacker.example",
      local,
      "127.0.0.1:3000",
      publicUrl,
    ),
    false,
  );
  assert.equal(
    allowedOrigin("null", local, "127.0.0.1:3000", publicUrl),
    false,
  );
  assert.equal(
    allowedOrigin("https://127.0.0.1:3000", local, "127.0.0.1:3000", publicUrl),
    false,
  );
});
