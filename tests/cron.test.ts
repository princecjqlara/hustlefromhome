import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCron } from "../src/lib/cron";

const secret = "cron-test-only-secret";
function request(method: string, authorization?: string) {
  return new Request("https://example.com/api/jobs/tick", {
    method,
    headers: authorization ? { Authorization: authorization } : {},
  });
}

test("GET and POST cron requests require the bearer header before running jobs", async () => {
  let calls = 0;
  const run = async () => ++calls;
  for (const method of ["GET", "POST"]) {
    for (const authorization of [undefined, "Bearer wrong", secret]) {
      const response = await handleCron(
        request(method, authorization),
        run,
        secret,
      );
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "Unauthorized" });
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  }
  assert.equal(calls, 0);
});

test("authenticated GET and POST run jobs and return uncached results", async () => {
  let calls = 0;
  const results = [{ id: "job-id", status: "done" }];
  for (const method of ["GET", "POST"]) {
    const response = await handleCron(
      request(method, `Bearer ${secret}`),
      async () => {
        calls++;
        return results;
      },
      secret,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { results });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 2);
});

test("a missing configured cron secret fails closed even with a bearer header", async () => {
  let calls = 0;
  const response = await handleCron(
    request("GET", "Bearer undefined"),
    async () => ++calls,
    undefined,
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("HEAD checks authentication without executing jobs or returning a body", async () => {
  let calls = 0;
  for (const [authorization, status] of [
    [undefined, 401],
    ["Bearer wrong", 401],
    [`Bearer ${secret}`, 204],
  ] as const) {
    const response = await handleCron(
      request("HEAD", authorization),
      async () => ++calls,
      secret,
    );
    assert.equal(response.status, status);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 0);
});

test("cron runner failures return a generic uncached error", async () => {
  const response = await handleCron(
    request("GET", `Bearer ${secret}`),
    async () => {
      throw new Error("private provider details");
    },
    secret,
  );
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Job runner failed" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
