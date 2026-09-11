import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  applyUserSourceDeterminations,
  loadUserSourceAdoption,
} from "./user-source-adoption.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-user-source-adoption-"));
const recordPath = "data/adoption.json";
const bodyPath = "private/upload.pdf";
const bytes = Buffer.from("exact owner supplied source bytes\n");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.mkdirSync(path.join(root, "private"), { recursive: true });
fs.writeFileSync(path.join(root, bodyPath), bytes);

const source = {
  sourceId: "official-form:4-222",
  sourceObligationId: "official-form:4-222",
  familyIds: ["nm_conviction-set"],
  itemIds: ["nm_conviction-set::official-form:4-222"],
  result: "OFFICIAL_SOURCE_ALREADY_HELD",
  heldCorpusPath: bodyPath,
  sha256,
  byteLength: bytes.length,
};
const adoption = {
  schemaVersion: "rcap-source-custody-adoption/v1",
  sources: [source],
  familyDeterminations: [
    { familyId: "nm_conviction-set", group: "LATER", disposition: "SOURCE_READY", unresolvedObligations: [],
      requiredPacketSourceBindings: [{ sourceId: "official-form:4-222", sha256 }] },
    { familyId: "co_new-family-set", group: "LATER", disposition: "SOURCE_READY", additionalRequiredSourceIds: ["official-form:JDF-205"] },
  ],
};
const writeRecord = (value) => fs.writeFileSync(path.join(root, recordPath), `${JSON.stringify(value, null, 2)}\n`);
const mutated = (change) => {
  const value = structuredClone(adoption);
  change(value);
  writeRecord(value);
  return value;
};
const rejects = (change, pattern) => {
  mutated(change);
  assert.throws(() => loadUserSourceAdoption(root, { recordPath }), pattern);
};

try {
  writeRecord(adoption);
  assert.deepEqual(loadUserSourceAdoption(root, { recordPath }), adoption);
  rejects((value) => { value.sources[0].sha256 = "0".repeat(64); }, /SHA-256 drift/);
  rejects((value) => { value.sources[0].byteLength += 1; }, /byte length drift/);
  rejects((value) => { value.sources[0].heldCorpusPath = "private/missing.pdf"; }, /is missing/);
  rejects((value) => { value.sources.push(structuredClone(value.sources[0])); }, /duplicate sourceObligationId/);
  rejects((value) => {
    const second = structuredClone(value.sources[0]);
    second.sourceId = "official-form:JDF-205";
    second.sourceObligationId = "official-form:JDF-205";
    value.sources.push(second);
  }, /duplicate adopted itemId/);
  rejects((value) => { value.sources[0].familyIds.push(value.sources[0].familyIds[0]); }, /familyIds contains duplicates/);
  rejects((value) => { value.sources[0].itemIds = ["unknown-family::official-form:4-222"]; }, /familyIds::sourceObligationId exactly/);
  rejects((value) => { value.familyDeterminations.push(structuredClone(value.familyDeterminations[0])); }, /duplicate family determination/);
  rejects((value) => { value.familyDeterminations[0].requiredPacketSourceBindings[0].sha256 = "0".repeat(64); },
    /does not match the adopted source digest/);
  rejects((value) => { value.familyDeterminations[0].requiredPacketSourceBindings[0].sourceId = "official-form:unadopted"; },
    /is not an adopted source/);

  writeRecord(adoption);
  const historical = {
    schemaVersion: "historical/v1",
    determinations: [{ id: "immutable-history" }],
    reconciliation42: {
      schemaVersion: "rcap-source-reconciliation-42/v1",
      acquisitionEvidencePaths: ["data/old-evidence.json"],
      laterSourceBlockersKeptSeparate: ["co_new-family-set", "still-separate-set"],
      families: [
        { familyId: "nm_conviction-set", disposition: "SOURCE_BLOCKED", unresolvedObligations: ["official-form:4-222"], sourceReplacements: { old: ["kept"] } },
        { familyId: "unrelated-set", disposition: "PRODUCT_PATH_PENDING", productQuestion: "held" },
      ],
    },
  };
  const before = JSON.stringify(historical);
  const effective = applyUserSourceDeterminations(root, historical, { recordPath });
  assert.equal(JSON.stringify(historical), before, "historical input must remain byte-equivalent as parsed");
  assert.notEqual(effective, historical, "effective determinations must be a clone");
  assert.deepEqual(effective.reconciliation42.families.find((row) => row.familyId === "nm_conviction-set"),
    { ...historical.reconciliation42.families[0], ...adoption.familyDeterminations[0] },
    "the named family receives the additive override without losing unrelated historical fields");
  assert.deepEqual(effective.reconciliation42.families.find((row) => row.familyId === "co_new-family-set"),
    adoption.familyDeterminations[1], "a newly governed family is appended");
  assert.deepEqual(effective.reconciliation42.families.find((row) => row.familyId === "unrelated-set"),
    historical.reconciliation42.families[1], "unrelated historical rows remain unchanged");
  assert.deepEqual(effective.reconciliation42.acquisitionEvidencePaths,
    ["data/old-evidence.json", recordPath], "the acquisition walker receives the additive evidence path once");
  assert.deepEqual(effective.reconciliation42.laterSourceBlockersKeptSeparate, ["still-separate-set"],
    "an explicitly adopted family leaves the separate-blocker list while unrelated history remains");
  const appliedTwice = applyUserSourceDeterminations(root, effective, { recordPath });
  assert.equal(appliedTwice.reconciliation42.acquisitionEvidencePaths.filter((entry) => entry === recordPath).length, 1);
  assert.equal(appliedTwice.reconciliation42.families.filter((row) => row.familyId === "nm_conviction-set").length, 1);

  console.log("PASS user source adoption: exact adopted bytes, fail-closed drift/missing/duplicates, targeted cloned overrides and additive evidence routing");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

if (process.argv.includes("--generated")) {
  const repoRoot = process.cwd();
  const generated = JSON.parse(fs.readFileSync(path.join(repoRoot,
    "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));
  const raster = JSON.parse(fs.readFileSync(path.join(repoRoot,
    "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json"), "utf8"));
  const baseline = JSON.parse(execFileSync("git", ["show",
    "HEAD:data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"], {
      cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 28,
    }));
  const currentAdoption = loadUserSourceAdoption(repoRoot);
  const currentHistorical = JSON.parse(fs.readFileSync(path.join(repoRoot,
    "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json"), "utf8"));
  const byId = new Map(generated.families.map((family) => [family.familyId, family]));
  const expectedNmFailures = new Map([
    ["nm_conviction-set", ["KNOWN_PREFILLS", "SELF_HELP_STOP"]],
    ["nm_identity_theft-set", ["KNOWN_PREFILLS"]],
    ["nm_release_without_conviction-set", ["CLIPPING_AND_OVERLAP"]],
  ]);
  const nmPath = "private/source-imports/user-upload-20260911/ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de.pdf";
  const nmSha = "ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de";
  for (const [familyId, failures] of expectedNmFailures) {
    const family = byId.get(familyId);
    assert.equal(family.sourceReadiness.ready, true);
    assert.deepEqual(family.failedObligationNames, failures);
    assert.equal(family.state, "FAIL_REPAIR_REQUIRED");
    assert.equal(family.packetSourceAdoption.ready, false);
    assert.equal(family.packetSourceAdoption.status, "PACKET_SOURCE_ADOPTION_REQUIRED");
    assert.deepEqual(family.packetSourceAdoption.mismatches[0].observedSha256,
      ["809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a"]);
    assert.ok(family.sourceReadiness.boundSources.some((source) => source.sourceId === "official-form:4-222"
      && source.path === nmPath && source.sha256 === nmSha));
    assert.equal(family.sourceReconciliation.determinationInput,
      "data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json");
  }

  const ca = byId.get("official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b");
  assert.ok(ca.sourceReadiness.boundSources.some((source) => source.sourceId === "official-form:CR-432"
    && source.path === "private/source-imports/user-upload-20260911/8ef45f07cf9fac15af97addd4f7b7d5f08e2b5ad4b4134cf002484821bc0c43e.pdf"
    && source.sha256 === "8ef45f07cf9fac15af97addd4f7b7d5f08e2b5ad4b4134cf002484821bc0c43e"));

  const coConviction = byId.get("co_motion_seal_conviction-set");
  assert.deepEqual(new Set(coConviction.sourceReconciliation.additionalRequiredSourceIds),
    new Set(["official-form:JDF-613", "official-form:JDF-614", "official-form:JDF-205", "official-form:JDF-206"]));
  assert.ok(coConviction.sourceReadiness.boundSources.some((source) => source.sourceId === "official-form:JDF-615"
    && source.sha256 === "106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647"));
  const coNonconviction = byId.get("co_motion_seal_nonconviction-set");
  assert.deepEqual(new Set(coNonconviction.sourceReconciliation.additionalRequiredSourceIds),
    new Set(["official-form:JDF-492", "official-form:JDF-493"]));

  const louisiana = byId.get("la-987-set-aside-and-dismiss-set");
  assert.equal(louisiana.sourceReconciliation.authorityBindings.length, 3);
  assert.deepEqual(louisiana.sourceReconciliation.authorityBindings.map((row) => row.sourceId), [
    "official-authority:LA-CCRP-ART-986",
    "official-authority:LA-CCRP-ART-978.1",
    "official-authority:LA-CCRP-ART-987",
  ]);
  assert.equal(louisiana.sourceReconciliation.participantDocumentRequirements.length, 4);
  assert.ok(louisiana.sourceReconciliation.participantDocumentRequirements
    .every((row) => row.type === "participant-case-document" && row.mustCollectActualCaseDocument === true));

  const az = byId.get("az_set_aside-set");
  assert.equal(az.state, "SOURCE_BLOCKED");
  assert.deepEqual(az.sourceReconciliation.unresolvedObligations, [
    "official-form:R-26-0001 adopted Form 31(a)",
    "official-form:R-26-0001 adopted Form 31(b)",
  ]);
  assert.deepEqual(az.sourceReconciliation.sourceReplacements,
    applyUserSourceDeterminations(repoRoot, currentHistorical).reconciliation42.families
      .find((row) => row.familyId === "az_set_aside-set").sourceReplacements);

  const adoptedIds = new Set(currentAdoption.familyDeterminations.map((row) => row.familyId));
  const baselineStates = new Map(baseline.families.map((family) => [family.familyId, family.state]));
  const unrelatedStateChanges = generated.families.filter((family) => !adoptedIds.has(family.familyId)
    && baselineStates.has(family.familyId) && baselineStates.get(family.familyId) !== family.state)
    .map((family) => `${family.familyId}: ${baselineStates.get(family.familyId)} -> ${family.state}`);
  assert.deepEqual(unrelatedStateChanges, [], "additive source adoption must not change unrelated family states");
  const terminal = new Set(["COMPLETE_PACKET_PROVEN", "GUIDANCE_READY", "OUT_OF_SCOPE", "HANDOFF_READY", "PASS_COMPLETE_INDEPENDENT", "LEGAL_APPROVED", "LIVE"]);
  assert.deepEqual([...adoptedIds].filter((familyId) => terminal.has(byId.get(familyId)?.state)), [],
    "source custody alone must not issue terminal packet or commercial authority");
  assert.deepEqual(raster.rows.filter((row) => expectedNmFailures.has(row.familyId)).map((row) => row.familyId), [],
    "a packet still bound to the superseded source cannot remain raster-enrolled");
  for (const familyId of expectedNmFailures.keys()) {
    assert.ok(raster.notEligible.some((row) => row.familyId === familyId
      && row.why.includes("the current failed obligations have not been repaired")));
  }
  console.log("PASS generated user source adoption: NM/CA/CO/LA/AZ exact effects, packet failures preserved, no unrelated state change or source-only terminal promotion");
}
