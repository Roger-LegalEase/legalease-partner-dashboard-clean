#!/usr/bin/env node
/*
 * The NY compiled profile drifted when f5204e12d added two questionLifecycle
 * facts that only the CPL 160.59 petition consumes. These tests drive the real
 * DCJS correction receipt and the real historical blob through the adapter,
 * then prove that a fee change, a re-pointed or removed fact, an unknown field,
 * another route and a missing measured row refuse rather than ride a refresh.
 *
 * Read-only with respect to receipts, queues, source records and packet
 * outputs. All mutations are made to in-memory clones.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ADAPTERS,
  Refusal,
  compareAnchors,
  composeRefreshedReceipt,
  planReceipt,
  readsAsUnmoved,
  recoverBytesByDigest
} from "./repin-lapsed-source-identities.mjs";

const FAMILY = "agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission";
const DIRECTORY = "data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill";
const RECEIPT = `${DIRECTORY}/source-receipt.json`;
const PROFILE = "src/lib/rcap-engine/compiled/profiles/NY-new-york.json";
const OLD_PROFILE_SHA256 = "ee4926a11e1035c530f3e1cabd71783c260332c799726b175dc2f529f108fa1e";
const UNRELATED_PATHWAY = "discretionary-conviction-sealing-by-petition-under-cpl-160-59";
const adapter = ADAPTERS.get(PROFILE);

assert.ok(adapter, "the NY compiled-profile adapter must be registered");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const currentProfile = readJson(PROFILE);
const receipt = readJson(RECEIPT);
const historical = recoverBytesByDigest(PROFILE, OLD_PROFILE_SHA256);
assert.ok(historical.bytes, `the historical NY profile blob must be recoverable: ${historical.why}`);
const oldProfile = JSON.parse(historical.bytes.toString("utf8"));
const pin = receipt.committedRecords.find((record) => record.pathInRepository === PROFILE);
assert.ok(pin, "the DCJS correction receipt must carry the compiled-profile pin");

/* Independent of whether integration has already refreshed the live receipt:
 * an in-memory stale pin over the same receipt shape, never written. */
const pinnedReceipt = structuredClone(receipt);
const pinnedProfile = pinnedReceipt.committedRecords.find((record) => record.pathInRepository === PROFILE);
pinnedProfile.sha256 = OLD_PROFILE_SHA256;
pinnedProfile.byteLength = historical.bytes.length;
delete pinnedProfile.identityRefresh;
const pinnedReceiptText = `${JSON.stringify(pinnedReceipt, null, 2)}\n`;
const plan = () => planReceipt({ familyId: FAMILY, directory: DIRECTORY, receiptPath: RECEIPT, beforeText: pinnedReceiptText, on: new Date("2026-10-19T00:00:00.000Z") });
const lifecycleFact = (doc, keep) => Object.keys(doc.questionLifecycle.routeConsumers)
  .find((fact) => keep(doc.questionLifecycle.routeConsumers[fact]));

test("the DCJS route is refreshable: every scoped anchor identical, only the two 160.59 facts moved, a measured row named", () => {
  const p = plan();
  assert.equal(p.outcome, "REFRESHABLE", p.why);
  const record = p.records.find((r) => r.path === PROFILE);
  assert.equal(record.outcome, "REFRESHABLE", record.why);
  assert.equal(record.anchorsCompared, record.anchorsIdentical);
  assert.deepEqual(record.entriesThatMovedInThisRecord, [
    "compiledProfile:questionLifecycle:routeConsumers:ny_16059_later_conviction_entered",
    "compiledProfile:questionLifecycle:routeConsumers:ny_16059_undisposed_arrest"
  ]);
  assert.ok(record.scope.derivation.measuredReVerification.length > 0);
  assert.equal(record.scope.derivation.builderAnchorStatements.length, 6);
  const composed = composeRefreshedReceipt(p);
  assert.equal(readsAsUnmoved(p.beforeText, composed.text).ok, true);
});

test("the plan leaves the receipt unwritten", () => {
  const before = fs.readFileSync(RECEIPT);
  composeRefreshedReceipt(plan());
  assert.deepEqual(fs.readFileSync(RECEIPT), before);
});

test("a changed fee rule refuses", () => {
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile });
  const changed = structuredClone(currentProfile);
  changed.packetGenerator.feeRules[0] = `${changed.packetGenerator.feeRules[0]} changed`;
  const comparison = compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: changed, scope });
  assert.ok(comparison.differing.includes("compiledProfile:packetGenerator"));
});

test("a fact re-pointed away from, or removed from, another pathway refuses", () => {
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile });
  const shared = lifecycleFact(oldProfile, (list) => !list.every((id) => id === UNRELATED_PATHWAY));
  assert.ok(shared, "the profile must carry a fact some other pathway consumes");

  const repointed = structuredClone(currentProfile);
  repointed.questionLifecycle.routeConsumers[shared] = [UNRELATED_PATHWAY];
  assert.ok(compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: repointed, scope }).differing
    .includes("compiledProfile:questionLifecycle:routeConsumerIds"));

  const removed = structuredClone(currentProfile);
  delete removed.questionLifecycle.routeConsumers[shared];
  assert.throws(
    () => compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: removed, scope }),
    (error) => error instanceof Refusal && /lacks required anchor/.test(error.message)
  );
});

test("a new fact another pathway consumes is compared, not left out", () => {
  const added = structuredClone(currentProfile);
  added.questionLifecycle.routeConsumers.ny_new_shared_fact = [UNRELATED_PATHWAY, "automatic-non-conviction-sealing-under-cpl-160-50-160-55"];
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: added });
  assert.ok(scope.anchorIds.includes("compiledProfile:questionLifecycle:routeConsumers:ny_new_shared_fact"));
  assert.throws(
    () => compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: added, scope }),
    (error) => error instanceof Refusal && /lacks required anchor/.test(error.message)
  );
});

test("an unknown field, another route or another record refuses", () => {
  const unknown = { ...structuredClone(currentProfile), unexpectedTopLevel: true };
  assert.throws(() => adapter.scopeFrom({ receipt, pin, currentDoc: unknown }),
    (error) => error instanceof Refusal && /ambiguous current NY compiled profile fields: unexpectedTopLevel/.test(error.message));
  assert.throws(() => adapter.scopeFrom({ receipt: { ...receipt, routeKeys: ["obligation:research-decision-route:NY:another"] }, pin, currentDoc: currentProfile }),
    (error) => error instanceof Refusal && /ambiguous or unrelated route key/.test(error.message));
  assert.throws(() => adapter.scopeFrom({ receipt: { ...receipt, familyId: "another-family" }, pin, currentDoc: currentProfile }),
    (error) => error instanceof Refusal && /does not uniquely bind/.test(error.message));
});

test("no measured re-verification row at the current digest refuses", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "repin-ny-no-rows-"));
  try {
    assert.throws(() => adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile, laneReturnRoot: empty }),
      (error) => error instanceof Refusal && /no independent re-verification row/.test(error.message));
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
});
