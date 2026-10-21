#!/usr/bin/env node
// Regression tests for the delivery-scope admission rule used by the F1
// staging case route_scoped_refuses_outsiders.
//
// The case previously required the in-scope identity to reach exactly 402.
// requireCurrentPacketVerification sits between admission and payment and the
// staging stack never seeds a verification, so 402 was unreachable and the case
// failed for a reason unrelated to scoping. These tests pin the replacement so
// it cannot drift into something that would pass a scope that refuses.
//
//   node --test scripts/verify-f1-scope-admission.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { scopeAdmissionVerdict } from "./f1-scope-admission.mjs";

const v = (authStatus, anonStatus = 401, appUp = true) => scopeAdmissionVerdict({ appUp, authStatus, anonStatus });

test("the payment gate proves admission", () => {
  assert.equal(v(402).passed, true);
  assert.match(v(402).gate, /payment gate/);
});

test("a downstream gate on the packet proves admission", () => {
  assert.equal(v(403).passed, true);
  assert.match(v(403).gate, /downstream gate/);
});

test("the scope refusing the in-scope identity fails, and says so", () => {
  const r = v(503);
  assert.equal(r.passed, false);
  assert.match(r.gate, /REFUSED BY THE DELIVERY SCOPE/);
});

test("an in-scope identity refused as unauthenticated fails", () => {
  assert.equal(v(401).passed, false);
});

test("an outsider who is NOT refused fails the case, whatever the insider got", () => {
  for (const anon of [200, 202, 402, 403, 404, 503]) {
    assert.equal(v(402, anon).passed, false, `an anonymous ${anon} is not a refusal`);
    assert.equal(v(403, anon).passed, false, `an anonymous ${anon} is not a refusal`);
  }
});

test("an app that never came up cannot pass", () => {
  assert.equal(v(402, 401, false).passed, false);
});

test("an unexpected status fails and is named rather than swallowed", () => {
  const r = v(500);
  assert.equal(r.passed, false);
  assert.match(r.gate, /unexpected status \(500\)/);
});

test("ownership refusal is not admission", () => {
  /* 404 means the scope admitted the request and ownership refused it. That is
   * a real signal, but this case is not satisfied by it: item A is A's own, so
   * a 404 here means the fixture is wrong and the run should say so. */
  const r = v(404);
  assert.equal(r.passed, false);
  assert.match(r.gate, /item ownership/);
});
