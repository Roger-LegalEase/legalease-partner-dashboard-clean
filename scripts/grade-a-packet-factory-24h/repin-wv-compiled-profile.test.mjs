#!/usr/bin/env node
/*
 * The WV compiled profile drifted when the unrelated SCA-C903 source
 * inventory was corrected. These tests drive the real receipt and the real
 * historical blob through the adapter, then prove that route and shared-rule
 * changes refuse rather than riding an identity refresh.
 *
 * This file is read-only with respect to receipts, queues, source records and
 * packet outputs. All mutations are made to in-memory clones.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  ADAPTERS,
  Refusal,
  compareAnchors,
  composeRefreshedReceipt,
  planReceipt,
  readsAsUnmoved,
  recoverBytesByDigest,
  sha256
} from "./repin-lapsed-source-identities.mjs";

const FAMILY = "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement";
const ROUTE_KEY = "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement";
const GOVERNED_C903_PATHWAY = "first-offense-drug-possession-conditional-discharge-relief";
const UNRELATED_C903_PATHWAY = "pardon-based-expungement";
const OWN_ROUTE_PATHWAY = "sex-trafficking-victim-vacatur-and-expungement";
const DIRECTORY = "data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading";
const RECEIPT = `${DIRECTORY}/source-receipt.json`;
const PROFILE = "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json";
const OLD_PROFILE_SHA256 = "0d5885d3ee56f516ee8bb9c6ce8d99d9aaa72a90d6670f8b6c8a52242db08b78";
const OLD_PROFILE_BLOB = "b63bf67a56902e6ffb39973c1bc86eefd85e8a67";
const adapter = ADAPTERS.get(PROFILE);

assert.ok(adapter, "the WV compiled-profile adapter must be registered");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const currentProfile = readJson(PROFILE);
const receipt = readJson(RECEIPT);
const historical = recoverBytesByDigest(PROFILE, OLD_PROFILE_SHA256);
assert.ok(historical.bytes, `the historical WV profile blob must be recoverable: ${historical.why}`);
const oldProfile = JSON.parse(historical.bytes.toString("utf8"));
const pin = receipt.committedRecords.find((record) => record.pathInRepository === PROFILE);
assert.ok(pin, "the WV route receipt must carry the compiled-profile pin");

/* Keep the refresh proof independent of whether native integration has already
 * consumed the real receipt. This is an in-memory stale pin over the same
 * current receipt shape; it never writes or replaces the live receipt. */
const pinnedReceipt = structuredClone(receipt);
const pinnedProfile = pinnedReceipt.committedRecords.find((record) => record.pathInRepository === PROFILE);
assert.ok(pinnedProfile, "the in-memory fixture must carry the compiled-profile pin");
pinnedProfile.sha256 = OLD_PROFILE_SHA256;
pinnedProfile.byteLength = historical.bytes.length;
delete pinnedProfile.identityRefresh;
const pinnedReceiptText = `${JSON.stringify(pinnedReceipt, null, 2)}\n`;

test("the WV route is refreshable from an explicit stale receipt fixture on five identical scoped anchors", () => {
  const plan = planReceipt({
    familyId: FAMILY,
    directory: DIRECTORY,
    receiptPath: RECEIPT,
    beforeText: pinnedReceiptText,
    on: new Date("2026-09-13T00:00:00.000Z")
  });
  assert.equal(plan.outcome, "REFRESHABLE", plan.why);
  assert.equal(plan.records.length, 1);
  const record = plan.records[0];
  assert.equal(record.path, PROFILE);
  assert.equal(record.outcome, "REFRESHABLE");
  assert.equal(record.anchorsCompared, 5);
  assert.equal(record.anchorsIdentical, 5);
  assert.equal(record.recovery.blobId, OLD_PROFILE_BLOB);
  assert.equal(sha256(historical.bytes), OLD_PROFILE_SHA256);
  assert.deepEqual(record.scope.derivation.builderAnchorStatements.map((row) => row.name), [
    "shared fee rule",
    "pathway id",
    "pathway summary",
    "legal-aid referral",
    "rehabilitation label"
  ]);
  assert.deepEqual(record.entriesThatMovedInThisRecord, [
    "compiledProfile:packetGenerator:allSourceFiles:SCA-C-903.pdf",
    "compiledProfile:packetGenerator:formInventory:SCA-C-903.pdf",
    "compiledProfile:packetGeneratorPathway:first-offense-drug-possession-conditional-discharge-relief",
    "compiledProfile:source:allFolderFiles:SCA-C-903.pdf",
    "compiledProfile:source:historicalComparisonBindings",
    "compiledProfile:source:selectedOfficialEdition",
    "compiledProfile:source:sourceCorpusBindingNote"
  ]);
});

test("the planned annotation is source-bound and the receipt remains unwritten", () => {
  const before = fs.readFileSync(RECEIPT);
  const plan = planReceipt({
    familyId: FAMILY,
    directory: DIRECTORY,
    receiptPath: RECEIPT,
    beforeText: pinnedReceiptText,
    on: new Date("2026-09-13T00:00:00.000Z")
  });
  const composed = composeRefreshedReceipt(plan);
  assert.equal(readsAsUnmoved(plan.beforeText, composed.text).ok, true);
  const next = JSON.parse(composed.text);
  const nextPin = next.committedRecords.find((record) => record.pathInRepository === PROFILE);
  assert.equal(nextPin.sha256, "bf9709154f74544ea0f5089439b822c88226ea42a031f8ccdfc72f29417a5f00");
  assert.equal(nextPin.identityRefresh.anchorsCompared, 5);
  assert.equal(nextPin.identityRefresh.anchorsIdentical, 5);
  assert.deepEqual(fs.readFileSync(RECEIPT), before, "the focused proof must not write the source receipt");
});

test("a changed route pathway refuses", () => {
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile });
  const changed = structuredClone(currentProfile);
  const pathway = changed.pathways.find((entry) => entry.id === "sex-trafficking-victim-vacatur-and-expungement");
  pathway.frontendBranch = { ...pathway.frontendBranch, matchedResult: "needs_review" };
  const comparison = compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: changed, scope });
  assert.ok(comparison.differing.includes("compiledProfile:pathway:sex-trafficking-victim-vacatur-and-expungement"));
  assert.notEqual(comparison.anchorsCompared, comparison.anchorsIdentical);
});

test("a changed shared rule refuses", () => {
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile });
  const changed = structuredClone(currentProfile);
  const routeRule = changed.orderedDecisionRules.find((entry) => entry.id === "rule-11-sex-trafficking-victim-vacatur-expungement-61-14-9-pros");
  assert.ok(routeRule, "the route-specific shared decision rule must be present");
  routeRule.then = { ...routeRule.then, suggestedResultCode: "needs_review" };
  const comparison = compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: changed, scope });
  assert.ok(comparison.differing.includes("compiledProfile:sharedCore"));

  const feeChanged = structuredClone(currentProfile);
  feeChanged.packetGenerator.feeRules[0] = `${feeChanged.packetGenerator.feeRules[0]} changed`;
  const feeComparison = compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: feeChanged, scope });
  assert.ok(feeComparison.differing.includes("compiledProfile:packetGeneratorStable"));
});

test("SCA-C903 filtering is limited to the governed transition", () => {
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: currentProfile });
  const exactC903 = structuredClone(currentProfile.packetGenerator.pathways
    .find((entry) => entry.pathwayId === GOVERNED_C903_PATHWAY)
    .formCandidates.find((entry) => entry.fileName === "SCA-C-903.pdf"));
  assert.ok(exactC903, "the governed transition must carry the exact current C903 entry");

  for (const pathwayId of [OWN_ROUTE_PATHWAY, UNRELATED_C903_PATHWAY]) {
    const changed = structuredClone(currentProfile);
    const pathway = changed.packetGenerator.pathways.find((entry) => entry.pathwayId === pathwayId);
    assert.ok(pathway, `the ${pathwayId} packet pathway must be present`);
    pathway.formCandidates = [...(pathway.formCandidates ?? []), structuredClone(exactC903)];
    const comparison = compareAnchors({ adapter, oldDoc: oldProfile, currentDoc: changed, scope });
    assert.ok(
      comparison.differing.includes("compiledProfile:packetGeneratorStable"),
      `${pathwayId} C903 additions must remain visible to the packet-generator anchor`
    );
  }
});

test("a hidden field on a filtered C903 entry refuses the transition", () => {
  const changed = structuredClone(currentProfile);
  const pathway = changed.packetGenerator.pathways.find((entry) => entry.pathwayId === GOVERNED_C903_PATHWAY);
  const c903 = pathway.formCandidates.find((entry) => entry.fileName === "SCA-C-903.pdf");
  c903.unexpectedDependency = "must not ride the governed identity transition";
  assert.throws(
    () => adapter.scopeFrom({ receipt, pin, currentDoc: changed }),
    (error) => error instanceof Refusal && /complete recorded current binding/.test(error.message)
  );
});

test("all current C903 custody-selection fields are required", () => {
  for (const field of ["selectedOfficialEdition", "historicalComparisonBindings", "sourceCorpusBindingNote"]) {
    const changed = structuredClone(currentProfile);
    delete changed.source[field];
    assert.throws(
      () => adapter.scopeFrom({ receipt, pin, currentDoc: changed }),
      (error) => error instanceof Refusal && /must carry all three recorded SCA-C903 custody-selection fields/.test(error.message),
      `omitting ${field} must refuse the identity transition`
    );
  }
});

test("an ambiguous pathway or altered C903 transition refuses", () => {
  const duplicatePathway = structuredClone(currentProfile);
  duplicatePathway.pathways.push(structuredClone(duplicatePathway.pathways.find((entry) => entry.id === "sex-trafficking-victim-vacatur-and-expungement")));
  assert.throws(
    () => adapter.scopeFrom({ receipt, pin, currentDoc: duplicatePathway }),
    (error) => error instanceof Refusal && /ambiguous current WV compiled profile pathway/.test(error.message)
  );

  const changedC903 = structuredClone(currentProfile);
  changedC903.source.selectedOfficialEdition.role = "different route";
  assert.throws(
    () => adapter.scopeFrom({ receipt, pin, currentDoc: changedC903 }),
    (error) => error instanceof Refusal && /unexpected selected SCA-C903 binding/.test(error.message)
  );

  const wrongRoute = { ...receipt, routeKeys: ["obligation:runtime-only:WV:another-route"] };
  assert.throws(
    () => adapter.scopeFrom({ receipt: wrongRoute, pin, currentDoc: currentProfile }),
    (error) => error instanceof Refusal && /ambiguous or unrelated route key/.test(error.message)
  );
});
