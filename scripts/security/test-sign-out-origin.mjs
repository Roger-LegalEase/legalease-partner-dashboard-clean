import assert from "node:assert/strict";
import { register } from "node:module";

register("../lib/ts-esm-loader.mjs", import.meta.url);
register("../lib/internal-auth-test-loader.mjs", import.meta.url);

const doubles = await import("../lib/internal-auth-test-doubles.mjs");
const signOutRoute = await import("../../src/app/sign-out/route.ts");

const user = {
  id: "70000000-0000-4000-8000-000000000001",
  email: "admin@legalease.test"
};

reset();
const shellResponse = await signOutRoute.POST(request({ origin: "https://internal.test" }));
assert.equal(shellResponse.status, 303);
assert.equal(shellResponse.headers.get("location"), "https://internal.test/sign-in?signedOut=1");
assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1);

reset();
const deniedPageResponse = await signOutRoute.POST(request({
  referer: "https://internal.test/internal/partners/provisioning",
  body: new URLSearchParams({ intent: "switch-account" })
}));
assert.equal(deniedPageResponse.status, 303);
assert.equal(deniedPageResponse.headers.get("location"), "https://internal.test/sign-in?switchAccount=1");
assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1);

for (const headers of [
  { origin: "https://evil.example" },
  { origin: "null" },
  { referer: "https://evil.example/forced-logout" },
  { origin: "https://evil.example", referer: "https://internal.test/internal" },
  {}
]) {
  reset();
  const response = await signOutRoute.POST(request(headers));
  assert.equal(response.status, 403);
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0, "unsafe request mutated the session");
  assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
  const payload = await response.json();
  assert.deepEqual(payload, { ok: false, error: "Invalid request origin." });
  assert.ok(!/session|partner|cookie|token/iu.test(JSON.stringify(payload)));
}

reset();
const getResponse = await signOutRoute.GET(new Request("https://internal.test/sign-out"));
assert.equal(getResponse.status, 303);
assert.equal(getResponse.headers.get("location"), "https://internal.test/sign-in");
assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0);
assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);

console.log("Sign Out same-origin security passed: shell and denial-page POSTs allowed; unsafe requests and GET never mutate the session.");

function reset() {
  doubles.setInternalAuthTestState({ user, rows: [] });
}

function request({ origin, referer, body } = {}) {
  const headers = new Headers({ host: "internal.test" });
  if (origin !== undefined) headers.set("origin", origin);
  if (referer !== undefined) headers.set("referer", referer);
  if (body) headers.set("content-type", "application/x-www-form-urlencoded");
  return new Request("https://internal.test/sign-out", {
    method: "POST",
    headers,
    body
  });
}
