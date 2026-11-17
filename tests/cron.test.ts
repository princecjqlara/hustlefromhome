import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCron } from "../src/lib/cron";

function request(method: string) {
  return new Request("https://example.com/api/jobs/tick", { method });
}

test("GET and POST run jobs without credentials and return uncached results", async () => {
  let calls = 0;
  const results = [{ id: "job-id", status: "done" }];
  for (const method of ["GET", "POST"]) {
    const response = await handleCron(request(method), async () => {
      calls++;
      return results;
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { results });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 2);
});

test("HEAD needs no credentials and never executes jobs or returns a body", async () => {
  let calls = 0;
  const response = await handleCron(request("HEAD"), async () => ++calls);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 0);
});

test("cron runner failures return a generic uncached error", async () => {
  const response = await handleCron(request("GET"), async () => {
    throw new Error("private provider details");
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Job runner failed" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
