import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  bindDeclaredUtPcraDelivery,
  normalizeDeclaredUtPcraBuildInputs,
  utPcraEvidenceFromRepository,
  UT_PCRA_COMPONENTS,
  UT_PCRA_DECISION,
  UT_PCRA_DIRECTORY,
  UT_PCRA_FAMILY,
  UT_PCRA_ROUTE,
  UT_PCRA_ROUTE_COMPONENT_IDS,
} from "./ut-pcra-declared-delivery.mjs";

const root = process.env.RCAP_TEST_ROOT ?? process.cwd();
const read = relative => JSON.parse(fs.readFileSync(`${root}/${relative}`, "utf8"));
const record = () => read(`${UT_PCRA_DIRECTORY}/product-wiring.json`);
const family = () => ({
  familyId: UT_PCRA_FAMILY,
  jurisdiction: "UT",
  directory: UT_PCRA_DIRECTORY,
  routeKeys: [UT_PCRA_ROUTE],
  packetComponents: [],
});
const resolution = read(UT_PCRA_DECISION).decisions.find(row => row.decisionId === "UT-TRAFFICKING-PCRA-RULE-65C");
const input = () => ({
  familyId: UT_PCRA_FAMILY,
  routes: [{
    routeKey: UT_PCRA_ROUTE,
    participantFacingInstrument: "stale label",
    currentOutputStrategy: "stale_strategy",
    requiredSourceIds: ["compiled-profile:UT", "official-form:1231XX", "authority:preserved"],
    authority: {preserved: true},
  }],
  implementationStrategy: "stale_strategy",
  sourceReconciliation: {preserved: true},
  treatment: {preserved: true},
  legalResolution: {...resolution, decisionRecord: UT_PCRA_DECISION},
});

test("normalizes only the exact PCRA route and appends its measured components", () => {
  const before = input();
  const output = normalizeDeclaredUtPcraBuildInputs(root, before);
  assert.equal(output.implementationStrategy, "official_pdf_fill");
  assert.equal(output.routes[0].participantFacingInstrument,
    "generic Rule 65C PCRA petition plus Attachments A-B");
  assert.equal(output.routes[0].currentOutputStrategy, "official_pdf_fill");
  assert.deepEqual(output.routes[0].requiredSourceIds,
    ["compiled-profile:UT", "official-form:1231XX", "authority:preserved", ...UT_PCRA_ROUTE_COMPONENT_IDS]);
  assert.deepEqual(output.routes[0].authority, {preserved: true});
  assert.deepEqual(output.sourceReconciliation, {preserved: true});
  assert.deepEqual(output.treatment, {preserved: true});
});

test("binds both measured documents while preserving source, raster and review fields", () => {
  const before = record();
  before.binding.acceptanceReceipt = {verdict: "RASTER_PASS", boundToCanonicalSha256: "a".repeat(64)};
  before.binding.lastIndependentVerification = {verdict: "PASS", lane: "vf-test", verifiedAtBase: "b".repeat(40)};
  const output = bindDeclaredUtPcraDelivery(before, family(), utPcraEvidenceFromRepository(root));
  assert.deepEqual(output.binding.packetComponents, UT_PCRA_COMPONENTS);
  assert.deepEqual(output.binding.acceptanceReceipt, before.binding.acceptanceReceipt);
  assert.deepEqual(output.binding.lastIndependentVerification, before.binding.lastIndependentVerification);
  assert.deepEqual(output.binding.sourceVersion, before.binding.sourceVersion);
  assert.equal(output.binding.paymentEligible, false);
  assert.equal(output.binding.sponsorshipEligible, false);
});

test("binding is idempotent and does not mutate its inputs", () => {
  const original = record();
  const frozen = JSON.stringify(original);
  const once = bindDeclaredUtPcraDelivery(original, family(), utPcraEvidenceFromRepository(root));
  const twice = bindDeclaredUtPcraDelivery(once, family(), utPcraEvidenceFromRepository(root));
  assert.deepEqual(twice, once);
  assert.equal(JSON.stringify(original), frozen);
});

test("unrelated families retain object identity and bytes", () => {
  const unrelatedInput = {...input(), familyId: "unrelated-family"};
  const unrelatedRecord = record();
  const unrelatedFamily = {...family(), familyId: "unrelated-family"};
  assert.equal(normalizeDeclaredUtPcraBuildInputs(root, unrelatedInput), unrelatedInput);
  assert.equal(bindDeclaredUtPcraDelivery(unrelatedRecord, unrelatedFamily, {}), unrelatedRecord);
});

test("wrong source identity is refused", () => {
  const evidence = utPcraEvidenceFromRepository(root);
  evidence.receipt.documents[0].sha256 = "0".repeat(64);
  assert.throws(() => bindDeclaredUtPcraDelivery(record(), family(), evidence), /sha256|Expected values/);
});

test("wrong route or component declarations are refused", () => {
  const wrongRoute = family();
  wrongRoute.routeKeys = ["other-route"];
  assert.throws(() => bindDeclaredUtPcraDelivery(record(), wrongRoute, utPcraEvidenceFromRepository(root)),
    /route scope/);
  const evidence = utPcraEvidenceFromRepository(root);
  evidence.report.packets[0].documents = ["UT-RULE-65C-PCRA"];
  assert.throws(() => bindDeclaredUtPcraDelivery(record(), family(), evidence), /document declaration/);
});

test("any pre-existing delivery authority is refused", () => {
  for (const mutate of [
    value => { value.generationAllowed = true; },
    value => { value.runtimeSelectable = true; },
    value => { value.opensCommercialRoute = true; },
    value => { value.binding.paymentEligible = true; },
    value => { value.binding.sponsorshipEligible = true; },
  ]) {
    const value = record();
    mutate(value);
    assert.throws(() => bindDeclaredUtPcraDelivery(value, family(), utPcraEvidenceFromRepository(root)));
  }
});
