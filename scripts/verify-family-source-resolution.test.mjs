#!/usr/bin/env node
// A form number is a label; a digest is an identity.
//
// familySources' form-number tier asked the committed corpus index one
// question — which entry carries this exact formNumber string — and called a
// source unresolvable when nothing answered. That is right when the document is
// absent and wrong when it is held under no declared number, which is true of an
// entire custody: all 380 nationwide_recovery_pool_2026_09_02 entries carry
// formNumber null, because the pool was recovered as human-named files rather
// than under the STATE__FORM__NUMBER__slug convention the other 604 entries
// follow. Every pool-held document was therefore unresolvable by construction —
// and the pool was mounted precisely to unblock these families. PF14 hit it on
// mo-art-xiv-marijuana-set and stopped the row BLOCKED_SOURCE while FI-05's
// bytes sat mounted and byte-exact. All 15 affected families measured
// UNRESOLVABLE before this repair.
//
// The repair does not trust MASTER_QUEUE's pin on its own — PF14 was right that
// "a hash recorded in a generated queue is not a committed source identity". It
// uses the pin to ask the committed index a better question: which entry has
// these bytes. That is why the refusals below must survive.
//
//   node --test scripts/verify-family-source-resolution.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  familySources,
  resolveCommittedKnownResidualBinding,
  resolveCommittedSourceRecoveryWave1Binding,
  resolveCommittedSourceRecoveryWave1Bindings,
  runAll
} from "./verify-packet-build-environment.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = path.join(ROOT, "scripts/verify-packet-build-environment.mjs");
const UT_FAMILY = "census-pending-family:UT:path-m-juvenile-expungement";
const UT_SOURCE = "official-form:1174XX";
const UT_PATH = "reference/utah/11_Petition_to_Expunge_Records_Juvenile-Revised-2023-08-14.pdf";
const UT_SHA = "b8488a2ebb43d9f94615a52bf52545283c47c147e45a9a4f02fa872cc1baf458";
const UT_LENGTH = 128760;
const CA_FAMILY = "ca-diversion-seal-set";
const CA_SOURCE = "official-form:SDSC-CRM-307";
const CA_RECOVERY_SOURCE = "CA-SDSC-CRM-307";
const CA_PATH = "reference/source-recovery/2026-09-11-wave1/crm307.pdf";
const CA_SHA = "da6852b5762dea47a17e8159a67e07215543a8524be623709f4856aed169b287";
const CA_LENGTH = 211228;
const CA_WAVE = "data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json";
const CA_PDF = path.join(ROOT, CA_PATH);
const RECOVERY = "data/rcap-grade-a/source-wave-integration/KNOWN_RESIDUAL_SOURCE_RECOVERY_2026-09-11.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const PDF = path.join(ROOT, UT_PATH);
const recoveryAdmission = JSON.parse(fs.readFileSync(path.join(ROOT, RECOVERY), "utf8"));
const caWaveAdmission = JSON.parse(fs.readFileSync(path.join(ROOT, CA_WAVE), "utf8"));
const MISSING_FAMILY = "synthetic-family:missing-indexed-body";
const MISSING_SOURCE = "official-form:synthetic-missing-body";
const MISSING_PATH = "reference/synthetic/missing-body.pdf";
const MISSING_SHA = "1".repeat(64);

const writeJson = (root, relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
};

const makeAdmissionFixture = ({ documentSources = [] } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ut-juvenile-preflight-"));
  fs.mkdirSync(path.dirname(path.join(root, UT_PATH)), { recursive: true });
  fs.copyFileSync(PDF, path.join(root, UT_PATH));
  writeJson(root, RECOVERY, JSON.parse(JSON.stringify(recoveryAdmission)));
  writeJson(root, CUSTODY, { rows: [
    { worklistGroupId: UT_FAMILY, custodyClass: "SOURCE_IDENTITY_UNRESOLVED", commissionAcquisition: true, documentSources },
    { worklistGroupId: "unrelated-family", custodyClass: "SOURCE_IDENTITY_UNRESOLVED", commissionAcquisition: true, documentSources: [] }
  ] });
  return root;
};

const makeMissingIndexedBodyFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ut-missing-indexed-body-"));
  writeJson(root, CORPUS_INDEX, { entries: [{ path: MISSING_PATH, formNumber: "synthetic-missing-body", sha256: MISSING_SHA }] });
  writeJson(root, WORKLIST, { packetFamilies: [{
    worklistGroupId: MISSING_FAMILY,
    routes: [{ requiredSourceIds: [MISSING_SOURCE] }]
  }] });
  return root;
};

const sourceIn = (admission) => admission.sources.find((source) => source.sourceObligationId === UT_SOURCE);

/** How family_sources_bind classified one family, from the verifier itself. */
const classify = (family) => {
  let out = "";
  try {
    out = execFileSync(process.execPath, [VERIFIER, "--family", family], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  // These sources are bodies held in the Master Library. Where the corpus is
  // not mounted, every one of them fails to bind — not because the resolution
  // is wrong but because there is nothing on disk to resolve against, and the
  // same run says so two lines earlier:
  //
  //   FAIL master_library_mounted  absent at private/source-imports/…
  //
  // Reading that as DOES_NOT_BIND reports a repaired binding as broken. The
  // absence of a custody is a different fact from a body that will not bind,
  // and the verifier already keeps them apart, so this reader does too.
  if (/FAIL\s+master_library_mounted/.test(out)) return "CORPUS_NOT_MOUNTED";
  const line = out.split("\n").find((l) => l.includes("family_sources_bind")) ?? "";
  if (line.includes("do not resolve to exactly one committed index entry")) return "UNRESOLVABLE";
  if (line.includes("do not bind")) return "DOES_NOT_BIND";
  if (line.includes("bind by exact SHA-256")) return "BINDS";
  return `UNRECOGNIZED: ${line.trim()}`;
};

/** True when the classification says the corpus, not the binding, is missing. */
const skipUnlessCorpusMounted = (t, verdict) => {
  if (verdict !== "CORPUS_NOT_MOUNTED") return false;
  t.skip("Master Library not mounted: run bash scripts/rcap-corpus/bootstrap-private-corpus.sh to measure this");
  return true;
};

test("the committed known-residual admission binds the exact UT body through repository custody", () => {
  const root = makeAdmissionFixture();
  try {
    const binding = resolveCommittedKnownResidualBinding(UT_FAMILY, recoveryAdmission, root);
    assert.deepEqual(binding, {
      sourceId: UT_SOURCE, path: UT_PATH, sha256: UT_SHA, byteLength: UT_LENGTH,
      tier: "exact_content_hash",
      resolvedBy: "committed_known_residual_acquisition_admission"
    });
    assert.deepEqual(familySources(UT_FAMILY, root).sources, [{ sourceId: UT_SOURCE, path: UT_PATH, sha256: UT_SHA, byteLength: UT_LENGTH, pathRoot: "repositoryRoot" }]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a missing or corrupt admitted body remains refused", () => {
  const missing = makeAdmissionFixture();
  try {
    fs.rmSync(path.join(missing, UT_PATH));
    assert.equal(resolveCommittedKnownResidualBinding(UT_FAMILY, recoveryAdmission, missing), null);
    assert.deepEqual(familySources(UT_FAMILY, missing).sources, []);
  } finally { fs.rmSync(missing, { recursive: true, force: true }); }

  const corrupt = makeAdmissionFixture();
  try {
    fs.writeFileSync(path.join(corrupt, UT_PATH), Buffer.from("corrupt body\n"));
    assert.equal(resolveCommittedKnownResidualBinding(UT_FAMILY, recoveryAdmission, corrupt), null);
    assert.deepEqual(familySources(UT_FAMILY, corrupt).sources, []);
  } finally { fs.rmSync(corrupt, { recursive: true, force: true }); }
});

test("a receipt with mismatched identity, path, hash, or length is refused", () => {
  for (const mutate of [
    (source) => { source.sourceId = "wrong-form"; },
    (source) => { source.sourceObligationId = "official-form:wrong-form"; },
    (source) => { source.heldCorpusPath = "/tmp/wrong.pdf"; },
    (source) => { source.sha256 = "0".repeat(64); },
    (source) => { source.byteLength = UT_LENGTH + 1; }
  ]) {
    const root = makeAdmissionFixture();
    try {
      const admission = JSON.parse(JSON.stringify(recoveryAdmission));
      mutate(sourceIn(admission));
      assert.equal(resolveCommittedKnownResidualBinding(UT_FAMILY, admission, root), null);
      writeJson(root, RECOVERY, admission);
      assert.deepEqual(familySources(UT_FAMILY, root).sources, []);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("a repository parent symlink cannot move the admitted body outside the checkout", () => {
  const root = makeAdmissionFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ut-parent-symlink-outside-"));
  try {
    const outsideUtah = path.join(outside, "utah");
    fs.mkdirSync(outsideUtah, { recursive: true });
    fs.copyFileSync(PDF, path.join(outsideUtah, path.basename(UT_PATH)));
    fs.rmSync(path.join(root, "reference/utah"), { recursive: true, force: true });
    fs.symlinkSync(outsideUtah, path.join(root, "reference/utah"), "dir");
    assert.equal(resolveCommittedKnownResidualBinding(UT_FAMILY, recoveryAdmission, root), null);
    assert.deepEqual(familySources(UT_FAMILY, root).sources, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("a conflicting 1174XX custody row cannot inherit the committed admission", () => {
  for (const mutate of [
    (held) => { held.path = "reference/utah/wrong-name.pdf"; },
    (held) => { held.sha256 = "0".repeat(64); },
    (held) => { held.byteLength = UT_LENGTH + 1; }
  ]) {
    const wrongPath = "reference/utah/wrong-name.pdf";
    const root = makeAdmissionFixture({ documentSources: [{
      sourceId: UT_SOURCE,
      kind: "form_label",
      resolved: true,
      heldAs: { path: UT_PATH, sha256: UT_SHA, byteLength: UT_LENGTH }
    }] });
    try {
      const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY), "utf8"));
      const held = custody.rows[0].documentSources[0].heldAs;
      mutate(held);
      if (held.path === wrongPath) {
        fs.mkdirSync(path.dirname(path.join(root, wrongPath)), { recursive: true });
        fs.copyFileSync(PDF, path.join(root, wrongPath));
      }
      writeJson(root, CUSTODY, custody);
      const resolved = familySources(UT_FAMILY, root);
      assert.equal(resolved.unresolvable.length, 1);
      assert.match(resolved.unresolvable[0].why, /path, SHA-256, or byte length/);
      const binding = runAll(root, { family: UT_FAMILY }).find((result) => result.id === "family_sources_bind");
      assert.equal(binding.ok, false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }

  const matching = makeAdmissionFixture({ documentSources: [{
    sourceId: UT_SOURCE,
    kind: "form_label",
    resolved: true,
    heldAs: { path: UT_PATH, sha256: UT_SHA, byteLength: UT_LENGTH }
  }] });
  try {
    const resolved = familySources(UT_FAMILY, matching);
    assert.deepEqual(resolved.unresolvable, []);
    assert.deepEqual(resolved.sources, [{ sourceId: UT_SOURCE, path: UT_PATH, sha256: UT_SHA }]);
  } finally { fs.rmSync(matching, { recursive: true, force: true }); }
});

test("the exact admission is scoped to UT juvenile and does not bind an unrelated family", () => {
  const root = makeAdmissionFixture();
  try {
    assert.equal(resolveCommittedKnownResidualBinding("unrelated-family", recoveryAdmission, root), null);
    assert.deepEqual(familySources("unrelated-family", root).sources, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});


const makeCaAdmissionFixture = ({ mutate = () => {}, includeBody = true } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ca-wave-preflight-"));
  if (includeBody) {
    fs.mkdirSync(path.dirname(path.join(root, CA_PATH)), { recursive: true });
    fs.copyFileSync(CA_PDF, path.join(root, CA_PATH));
  }
  const admission = JSON.parse(JSON.stringify(caWaveAdmission));
  mutate(admission);
  writeJson(root, CA_WAVE, admission);
  fs.copyFileSync(path.join(ROOT, "SOURCE_BLOCKED_RECOVERY_WAVE1_2026-09-11.json"), path.join(root, "SOURCE_BLOCKED_RECOVERY_WAVE1_2026-09-11.json"));
  writeJson(root, CUSTODY, { rows: [{
    worklistGroupId: CA_FAMILY,
    custodyClass: "SOURCE_GENUINELY_MISSING",
    commissionAcquisition: true,
    documentSources: [{
      sourceId: CA_SOURCE,
      kind: "form_label",
      resolved: false,
      heldAs: null,
      absence: "named_form_number_not_in_corpus"
    }]
  }] });
  return root;
};

test("the governed CA wave binds CRM-307 through the stale custody row", () => {
  const root = makeCaAdmissionFixture();
  try {
    assert.deepEqual(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, caWaveAdmission, root), {
      sourceId: CA_SOURCE,
      path: CA_PATH,
      sha256: CA_SHA,
      byteLength: CA_LENGTH,
      tier: "exact_content_hash",
      resolvedBy: "committed_source_recovery_wave1_governed_adoption"
    });
    assert.deepEqual(familySources(CA_FAMILY, root).sources, [{
      sourceId: CA_SOURCE,
      path: CA_PATH,
      sha256: CA_SHA,
      byteLength: CA_LENGTH,
      tier: "exact_content_hash",
      resolvedBy: "committed_source_recovery_wave1_governed_adoption",
      pathRoot: "repositoryRoot"
    }]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the CA wave refuses a wrong recovered hash", () => {
  const root = makeCaAdmissionFixture({ mutate: (admission) => {
    admission.sources.find((source) => source.sourceId === CA_RECOVERY_SOURCE).sha256 = "0".repeat(64);
  } });
  try {
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, JSON.parse(fs.readFileSync(path.join(root, CA_WAVE), "utf8")), root), null);
    assert.deepEqual(familySources(CA_FAMILY, root).sources, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the CA wave refuses when the governed body is missing", () => {
  const root = makeCaAdmissionFixture({ includeBody: false });
  try {
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, caWaveAdmission, root), null);
    assert.deepEqual(familySources(CA_FAMILY, root).sources, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the CA wave refuses a binding for another family", () => {
  const root = makeCaAdmissionFixture({ mutate: (admission) => {
    admission.sources.find((source) => source.sourceId === CA_RECOVERY_SOURCE)
      .familyBindings[0].familyId = "ca-other-family-set";
  } });
  try {
    const admission = JSON.parse(fs.readFileSync(path.join(root, CA_WAVE), "utf8"));
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, admission, root), null);
    assert.equal(resolveCommittedSourceRecoveryWave1Binding("ca-other-family-set", admission, root), null);
    assert.deepEqual(familySources(CA_FAMILY, root).sources, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

const GOVERNED_WAVE_FAMILIES = {
  "nc_auto_146_a4_agency_followup-set": ["official-form:AOC-G-260"],
  "ca-diversion-seal-set": ["official-form:SDSC-CRM-307"],
  "fl-sealing-set": ["official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION"],
  "ia-12346-set": ["official-form:Rule 2.86 Form 3"],
  "ia-901c3-set": ["official-form:Rule 2.86 Form 2"],
  "il-prb-cert-set": [
    "official-form:PRB Certificate of Expungement for Military Application",
    "official-form:PRB Certificate of Expungement for Military Eligibility Acknowledgement",
    "official-form:PRB Certificate of Sealing Application",
    "official-form:PRB Certificate of Sealing Eligibility Acknowledgement"
  ],
  "nd-prohibit-remote-public-access-set": [
    "official-form:ND-MOTION-PROHIBIT-PUBLIC-ACCESS",
    "official-form:ND-BRIEF-PROHIBIT-PUBLIC-ACCESS",
    "official-form:ND-PROPOSED-FINDINGS-PROHIBIT-PUBLIC-ACCESS",
    "official-form:ND-DECLARATION-OF-SERVICE"
  ],
  "ut_pet_remove_link-set": [
    "official-form:1501CR",
    "official-form:1501CR-C",
    "official-form:1502CR"
  ]
};

test("the governed wave resolves every recorded resolver-class family", () => {
  for (const [family, sourceIds] of Object.entries(GOVERNED_WAVE_FAMILIES)) {
    const bindings = resolveCommittedSourceRecoveryWave1Bindings(family, caWaveAdmission, ROOT);
    assert.ok(Array.isArray(bindings), family);
    assert.deepEqual(bindings.map((binding) => binding.sourceId).sort(), sourceIds.slice().sort(), family);
    const resolved = familySources(family, ROOT);
    assert.deepEqual(resolved.unresolvable, [], family);
    assert.ok(sourceIds.every((sourceId) => resolved.sources.some((source) => source.sourceId === sourceId)), family);
  }
});

test("the governed wave refuses stale manifest bytes, wrong source identity, and duplicate receipts", () => {
  const root = makeCaAdmissionFixture();
  try {
    const staleManifest = JSON.parse(JSON.stringify(caWaveAdmission));
    staleManifest.inputManifestSha256 = "0".repeat(64);
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, staleManifest, root), null);

    const wrongSource = JSON.parse(JSON.stringify(caWaveAdmission));
    wrongSource.sources.find((source) => source.sourceId === CA_RECOVERY_SOURCE).sourceId = "WRONG-RECOVERY-SOURCE";
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, wrongSource, root), null);

    const extraWrongSource = JSON.parse(JSON.stringify(caWaveAdmission));
    const originalSource = extraWrongSource.sources.find((source) => source.sourceId === CA_RECOVERY_SOURCE);
    extraWrongSource.sources.push({ ...originalSource, sourceId: "WRONG-RECOVERY-SOURCE" });
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, extraWrongSource, root), null);

    const duplicateReceipt = JSON.parse(JSON.stringify(caWaveAdmission));
    const caSource = duplicateReceipt.sources.find((source) => source.sourceId === CA_RECOVERY_SOURCE);
    caSource.existingReceiptCandidates.push({
      ...caSource.existingReceiptCandidates.find((receipt) => receipt.status === "acquired"),
      sha256: "0".repeat(64)
    });
    assert.equal(resolveCommittedSourceRecoveryWave1Binding(CA_FAMILY, duplicateReceipt, root), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("an unresolved heldAs conflict blocks the governed family bridge", () => {
  const root = makeCaAdmissionFixture();
  try {
    const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY), "utf8"));
    custody.rows[0].documentSources[0].heldAs = {
      path: CA_PATH,
      sha256: "0".repeat(64),
      byteLength: CA_LENGTH
    };
    writeJson(root, CUSTODY, custody);
    const resolved = familySources(CA_FAMILY, root);
    assert.equal(resolved.sources.length, 0);
    assert.equal(resolved.unresolvable.length, 1);
    assert.match(resolved.unresolvable[0].why, /path, SHA-256, or byte length/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("governed custody rejects contradictory duplicate rows but accepts identical duplicates", () => {
  const identical = makeCaAdmissionFixture();
  try {
    const custody = JSON.parse(fs.readFileSync(path.join(identical, CUSTODY), "utf8"));
    custody.rows.push(JSON.parse(JSON.stringify(custody.rows[0])));
    writeJson(identical, CUSTODY, custody);
    const resolved = familySources(CA_FAMILY, identical);
    assert.deepEqual(resolved.unresolvable, []);
    assert.equal(resolved.sources.length, 1);
  } finally { fs.rmSync(identical, { recursive: true, force: true }); }

  const contradictory = makeCaAdmissionFixture();
  try {
    const custody = JSON.parse(fs.readFileSync(path.join(contradictory, CUSTODY), "utf8"));
    custody.rows.push({
      ...JSON.parse(JSON.stringify(custody.rows[0])),
      documentSources: [{
        sourceId: CA_SOURCE,
        kind: "form_label",
        resolved: true,
        heldAs: { path: CA_PATH, sha256: "0".repeat(64), byteLength: CA_LENGTH }
      }]
    });
    writeJson(contradictory, CUSTODY, custody);
    const resolved = familySources(CA_FAMILY, contradictory);
    assert.ok(resolved.unresolvable.some((item) => /multiple custody rows/.test(item.why)));
    assert.equal(runAll(contradictory, { family: CA_FAMILY }).find((result) => result.id === "family_sources_bind").ok, false);
  } finally { fs.rmSync(contradictory, { recursive: true, force: true }); }
});

test("governed custody rejects recovery, unrelated, and sourceObligationId aliases", () => {
  for (const mutate of [
    (source) => { source.sourceId = CA_RECOVERY_SOURCE; },
    (source) => { source.sourceId = "WRONG-SOURCE-ID"; },
    (source) => { source.sourceObligationId = "WRONG-SOURCE-ID"; }
  ]) {
    const root = makeCaAdmissionFixture();
    try {
      const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY), "utf8"));
      const alias = { ...JSON.parse(JSON.stringify(custody.rows[0].documentSources[0])), resolved: true,
        heldAs: { path: CA_PATH, sha256: CA_SHA, byteLength: CA_LENGTH } };
      mutate(alias);
      custody.rows[0].documentSources.push(alias);
      writeJson(root, CUSTODY, custody);
      const resolved = familySources(CA_FAMILY, root);
      assert.ok(resolved.unresolvable.length > 0);
      assert.equal(runAll(root, { family: CA_FAMILY }).find((result) => result.id === "family_sources_bind").ok, false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("preloaded governed bytes retain repository custody, including exact duplicate rows", () => {
  for (const duplicate of [false, true]) {
    const root = makeCaAdmissionFixture();
    try {
      const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY), "utf8"));
      custody.rows[0].documentSources = [{
        sourceId: CA_SOURCE, resolved: true,
        heldAs: { path: CA_PATH, sha256: CA_SHA, byteLength: CA_LENGTH }
      }];
      if (duplicate) custody.rows.push(structuredClone(custody.rows[0]));
      writeJson(root, CUSTODY, custody);
      const resolved = familySources(CA_FAMILY, root);
      assert.deepEqual(resolved.unresolvable, []);
      assert.equal(resolved.sources.length, 1);
      assert.equal(resolved.sources[0].pathRoot, "repositoryRoot");
      assert.equal(resolved.sources[0].byteLength, CA_LENGTH);
      assert.equal(runAll(root, { family: CA_FAMILY }).find((result) => result.id === "family_sources_bind").ok, true);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test("preloaded governed bytes cannot bypass an invalid adoption record", () => {
  const root = makeCaAdmissionFixture({ mutate: (admission) => {
    admission.inputManifestSha256 = "0".repeat(64);
  } });
  try {
    const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY), "utf8"));
    custody.rows[0].documentSources[0] = {
      sourceId: CA_SOURCE,
      kind: "form_label",
      resolved: true,
      heldAs: { path: CA_PATH, sha256: CA_SHA, byteLength: CA_LENGTH }
    };
    writeJson(root, CUSTODY, custody);
    const resolved = familySources(CA_FAMILY, root);
    assert.ok(resolved.unresolvable.some((item) => /admission is absent, stale, or contradictory/.test(item.why)));
    assert.equal(runAll(root, { family: CA_FAMILY }).find((result) => result.id === "family_sources_bind").ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a pool-held source with no declared form number resolves through its confirmed pin", (t) => {
  // FI-05 is "LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf",
  // sha256 53f1e04e…, a committed index entry whose formNumber is null.
  const verdict = classify("mo-art-xiv-marijuana-set");
  if (skipUnlessCorpusMounted(t, verdict)) return;
  assert.equal(verdict, "BINDS");
});

test("the same repair reaches the other states the pool unblocked", (t) => {
  for (const f of ["wv_conv_nonviolent_felony-set", "ga-nonconv-pre2013-set", "ks-21-6614-conviction-set"]) {
    const verdict = classify(f);
    if (skipUnlessCorpusMounted(t, verdict)) return;
    assert.equal(verdict, "BINDS", f);
  }
});

test("a hermetic missing indexed body is refused even when identity is present", () => {
  const root = makeMissingIndexedBodyFixture();
  try {
    const resolved = familySources(MISSING_FAMILY, root);
    assert.deepEqual(resolved.sources, [{ sourceId: MISSING_SOURCE, path: MISSING_PATH, sha256: MISSING_SHA }]);
    assert.equal(fs.existsSync(path.join(root, MISSING_PATH)), false);
    const binding = runAll(root, { family: MISSING_FAMILY }).find((result) => result.id === "family_sources_bind");
    assert.equal(binding.ok, false);
    assert.deepEqual(binding.sources, [{
      sourceId: MISSING_SOURCE,
      present: false,
      bound: false,
      pinned: MISSING_SHA,
      observed: null,
      resolvedBy: null
    }]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the pin is a lead, never a verdict", () => {
  const src = fs.readFileSync(VERIFIER, "utf8");
  const helper = src.slice(src.indexOf("function queuePin("), src.indexOf("function familySources("));
  assert.match(helper, /return \/\^\[0-9a-f\]\{64\}\$\/\.test\(digest\) \? digest : null;/, "queuePin returns a digest, never a source");
  assert.doesNotMatch(helper, /sources\.push/, "queuePin must not resolve a source by itself");
  // And the caller must confirm it against the committed index before use.
  const tierStart = src.indexOf("const pinned = queuePin(");
  const tierEnd = src.indexOf("\n  return { tier:", tierStart);
  assert.ok(tierStart >= 0 && tierEnd > tierStart, "the digest-confirmation tier must remain in familySources");
  const tier = src.slice(tierStart, tierEnd);
  assert.match(tier, /index\.entries\.filter\(\(e\) => e\.sha256 === pinned\)/, "the pin must be confirmed against the committed index");
});

test("the recovery pool is the custody this repair exists for", () => {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const pool = idx.entries.filter((e) => e.custody === "nationwide_recovery_pool_2026_09_02");
  assert.ok(pool.length > 0, "the pool must be in the committed index");
  assert.equal(pool.filter((e) => e.formNumber).length, 0, "no pool entry declares a form number");
  const others = idx.entries.filter((e) => e.custody !== "nationwide_recovery_pool_2026_09_02");
  assert.ok(others.filter((e) => e.formNumber).length / others.length > 0.9, "every other custody declares them");
});

const NC_FAMILY = "nc_auto_146_a4_agency_followup-set";
const NC_SOURCE = "official-form:AOC-G-260";
const NC_PATH = "reference/source-recovery/2026-09-11-wave1/CODEX-CS1-SRC4__AOC-G-260__cf998cecefea.pdf";
const NC_SHA = "cf998cecefea090e4b3fce260b330b6f3896d66ae65ab9f9e7a698e6586a1817";
const NC_LENGTH = 290429;
function makeNcAdmissionFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nc-wave-preflight-"));
  for (const file of [NC_PATH, CA_WAVE, "SOURCE_BLOCKED_RECOVERY_WAVE1_2026-09-11.json"]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  }
  writeJson(root, CUSTODY, { rows: [{
    worklistGroupId: NC_FAMILY, custodyClass: "SOURCE_ALREADY_HELD",
    documentSources: [{sourceId: NC_SOURCE, resolved: true,
      heldAs: {path: NC_PATH, sha256: NC_SHA, byteLength: NC_LENGTH}}]
  }] });
  return root;
}
test("NC governed exact resolved and duplicate custody bind in repository namespace", () => {
  for (const duplicate of [false, true]) {
    const root = makeNcAdmissionFixture();
    try {
      const custody = JSON.parse(fs.readFileSync(path.join(root, CUSTODY)));
      if (duplicate) custody.rows.push(structuredClone(custody.rows[0]));
      writeJson(root, CUSTODY, custody);
      const resolved = familySources(NC_FAMILY, root);
      assert.deepEqual(resolved.unresolvable, []);
      assert.equal(resolved.sources.length, 1);
      assert.equal(resolved.sources[0].pathRoot, "repositoryRoot");
      assert.equal(resolved.sources[0].byteLength, NC_LENGTH);
      assert.equal(resolved.sources[0].sha256, NC_SHA);
      assert.equal(runAll(root, {family: NC_FAMILY}).find(r => r.id === "family_sources_bind").ok, true);
    } finally {fs.rmSync(root, {recursive: true, force: true});}
  }
});
test("NC governed missing or wrong bodies, aliases and adoption contradictions refuse", () => {
  const cases = [
    ["missing body", (root) => fs.unlinkSync(path.join(root, NC_PATH))],
    ["wrong body", (root) => {const b=fs.readFileSync(path.join(root, NC_PATH));b[100]^=1;fs.writeFileSync(path.join(root, NC_PATH),b);}],
    ["recovery alias", (_root,custody) => {custody.rows[0].documentSources[0].sourceId="NC-AOC-G-260";}],
    ["unknown alias", (_root,custody) => {custody.rows[0].documentSources[0].sourceId="WRONG-SOURCE";}],
    ["obligation alias", (_root,custody) => {custody.rows[0].documentSources[0].sourceObligationId="WRONG-SOURCE";}],
    ["bad manifest", (_root,_custody,admission) => {admission.inputManifestSha256="0".repeat(64);}],
    ["wrong adoption family", (_root,_custody,admission) => {admission.sources.find(s=>s.sourceId==="NC-AOC-G-260").familyBindings[0].familyId="WRONG-FAMILY";}],
    ["duplicate admission", (_root,_custody,admission) => {admission.sources.push(structuredClone(admission.sources.find(s=>s.sourceId==="NC-AOC-G-260")));}],
    ["contradictory custody", (_root,custody) => {const duplicate=structuredClone(custody.rows[0]);duplicate.documentSources[0].heldAs.sha256="0".repeat(64);custody.rows.push(duplicate);}]
  ];
  for (const [label,mutate] of cases) {
    const root=makeNcAdmissionFixture();
    try {
      const custody=JSON.parse(fs.readFileSync(path.join(root,CUSTODY)));
      const admission=JSON.parse(fs.readFileSync(path.join(root,CA_WAVE)));
      mutate(root,custody,admission);
      writeJson(root,CUSTODY,custody);writeJson(root,CA_WAVE,admission);
      assert.ok(familySources(NC_FAMILY,root).unresolvable.length>0,label);
      assert.equal(runAll(root,{family:NC_FAMILY}).find(r=>r.id==="family_sources_bind").ok,false,label);
    } finally {fs.rmSync(root,{recursive:true,force:true});}
  }
});

test("NC governed historical indexed custody requires exact restoration and index evidence", () => {
  for (const variation of ["valid","missing-index","wrong-index-hash","duplicate-index","wrong-restoration","wrong-custody-length","wrong-custody-root","wrong-index-length"]) {
    const root=makeNcAdmissionFixture();
    try {
      const custody=JSON.parse(fs.readFileSync(path.join(root,CUSTODY)));
      custody.rows[0].documentSources[0].heldAs={path:"LegalEase North Carolina/AOC-G-260_Rev-5-24.pdf",sha256:NC_SHA};
      const entry={path:"LegalEase North Carolina/AOC-G-260_Rev-5-24.pdf",custody:"src05_worker_materialization_2026_09_02",sha256:NC_SHA,byteLength:NC_LENGTH,formNumber:"AOC-G-260"};
      let entries=[entry];
      if(variation==="missing-index")entries=[];
      if(variation==="wrong-index-hash")entry.sha256="0".repeat(64);
      if(variation==="duplicate-index")entries.push(structuredClone(entry));
      if(variation==="wrong-custody-length")custody.rows[0].documentSources[0].heldAs.byteLength=1;
      if(variation==="wrong-restoration"){
        const admission=JSON.parse(fs.readFileSync(path.join(root,CA_WAVE)));
        admission.sources.find(s=>s.sourceId==="NC-AOC-G-260").restoredIndexedCustodyPaths=["WRONG"];
        writeJson(root,CA_WAVE,admission);
      }
      if(variation==="wrong-index-length")entry.byteLength=1;
      const custodies=[{id:"src05_worker_materialization_2026_09_02",root:variation==="wrong-custody-root"?"WRONG":"private/source-imports/src05-worker-materialization-2026-09-02",pathsRelativeTo:"custodyRoot"}];
      writeJson(root,CUSTODY,custody);writeJson(root,CORPUS_INDEX,{entries,custodies});
      const resolved=familySources(NC_FAMILY,root);
      const gate=runAll(root,{family:NC_FAMILY}).find(r=>r.id==="family_sources_bind");
      assert.equal(gate.ok,variation==="valid",variation);
      if(variation==="valid"){assert.equal(resolved.sources.length,1);assert.equal(resolved.sources[0].pathRoot,"repositoryRoot");}
      else assert.ok(resolved.unresolvable.length>0,variation);
    } finally {fs.rmSync(root,{recursive:true,force:true});}
  }
});
