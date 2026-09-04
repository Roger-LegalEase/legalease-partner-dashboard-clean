#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generator = path.join(repoRoot, "scripts/grade-a-packet-factory-24h/generate-first-cohort-selection.mjs");
const AUGUST_ID = "auth-2026-08-19-owner-legal-approval-completed-output";
const SEPTEMBER_ID = "OWN-ADOPT-2026-09-02-BATCH-53";

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (root, relativePath, value) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};

function makeFamily(root, familyId, slug) {
  const directory = `data/families/${slug}`;
  const pins = ["canonical", "boundary"].map((fixture) => {
    const file = `${directory}/fixtures/${fixture}.pdf`;
    const bytes = Buffer.from(`${familyId}:${fixture}:approved`);
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), bytes);
    return { fixture, file, sha256: sha(bytes) };
  });
  writeJson(root, `${directory}/product-wiring.json`, { familyId });
  return {
    master: {
      familyId,
      jurisdiction: "ZZ",
      state: "COMPLETE_PACKET_PROVEN",
      directory,
      routeKeys: [`obligation:test:${familyId}`],
      implementationStrategy: "custom_pleading",
      sourceBound: true,
      legalInputStatus: "SETTLED",
      holds: [],
      laneReturnLegalHold: false
    },
    pins
  };
}

function runScenario({
  staleSeptember = false,
  missingBoundary = false,
  overlap = false,
  septemberAudit = "matching"
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "first-cohort-owner-approval-"));
  try {
    const scriptDir = path.join(root, "scripts/grade-a-packet-factory-24h");
    fs.mkdirSync(scriptDir, { recursive: true });
    fs.copyFileSync(generator, path.join(scriptDir, path.basename(generator)));

    const august = makeFamily(root, "august-family", "august-family");
    const september = makeFamily(root, "september-family", "september-family");
    const exactTreatment = makeFamily(root, "composed-treatment:sc_17_22_950_summary", "exact-treatment");
    const similarlyNamedSet = makeFamily(root, "sc_17_22_950_summary-set", "similarly-named-set");
    const families = [august, september, exactTreatment, similarlyNamedSet];

    const returns = families.map(({ master }) => ({
      familyId: master.familyId,
      isIndependentVerification: true,
      verdict: "PASS_COMPLETE_INDEPENDENT",
      superseded: false,
      lane: "vf-test",
      verifiedAtBase: "1234567"
    }));
    const raster = families.map(({ master, pins }) => ({
      familyId: master.familyId,
      currentRasterState: "RASTER_PASS",
      coverage: { complete: true },
      canonicalPdfSha256: pins.find((pin) => pin.fixture === "canonical").sha256,
      boundaryPdfSha256: pins.find((pin) => pin.fixture === "boundary").sha256,
      rasterReceipt: {
        boundToCanonicalSha256: pins.find((pin) => pin.fixture === "canonical").sha256,
        boundToBoundarySha256: pins.find((pin) => pin.fixture === "boundary").sha256
      }
    }));

    writeJson(root, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json", { families: families.map((f) => f.master) });
    writeJson(root, "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json", { rows: returns });
    writeJson(root, "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json", { rows: raster });
    writeJson(root, "data/rcap-ledger/completed-output-counsel-manifest.json", {
      requiresSignature: false,
      ownerLegalDecision: { records: [{
        recordId: AUGUST_ID,
        legalApprovalResult: "approved",
        decisionOwner: "Roger Roman",
        effectiveDate: "2026-08-19"
      }] },
      families: [
        { familyId: "august-family", adoptedLegalDesignRecord: "august-design" },
        ...(overlap ? [{ familyId: "september-family", adoptedLegalDesignRecord: "ambiguous-design" }] : [])
      ]
    });

    const septemberPins = missingBoundary
      ? september.pins.filter((pin) => pin.fixture === "canonical")
      : september.pins;
    writeJson(root, "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json", {
      schemaVersion: "rcap-owner-batch-adoption/v1",
      recordId: SEPTEMBER_ID,
      decisionOwner: "Roger Roman",
      decidedOn: "2026-09-02",
      requiresSignature: false,
      adoption: {
        familiesAdopted: 2,
        familiesNotAdopted: 0,
        qualifications: [{
          ownerNote: "ADOPTED only for the exact family IDs and recorded shipping digests.",
          familyCount: 2,
          families: ["september-family", "composed-treatment:sc_17_22_950_summary"],
          digestConditionRecordedPerFamily: {
            "september-family": septemberPins,
            "composed-treatment:sc_17_22_950_summary": exactTreatment.pins
          }
        }]
      }
    });
    if (staleSeptember) {
      const canonical = september.pins.find((pin) => pin.fixture === "canonical");
      fs.writeFileSync(path.join(root, canonical.file), "changed after adoption");
    }

    const septemberAuditRows = septemberAudit === "missing" ? [] : [{
      familyId: "september-family",
      verdict: "COVERED_BY_EXISTING_APPROVAL",
      ...(septemberAudit === "matching" ? { reviewedAgainstApprovalRecordId: SEPTEMBER_ID } : {}),
      mayEnterTheFirstCohort: true
    }];
    writeJson(root, "data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json", {
      controllingRecord: { recordId: AUGUST_ID },
      families: [
        { familyId: "august-family", verdict: "COVERED_BY_EXISTING_APPROVAL", mayEnterTheFirstCohort: true },
        ...septemberAuditRows,
        {
          familyId: "composed-treatment:sc_17_22_950_summary",
          verdict: "COVERED_BY_EXISTING_APPROVAL",
          reviewedAgainstApprovalRecordId: SEPTEMBER_ID,
          mayEnterTheFirstCohort: true
        },
        {
          familyId: "sc_17_22_950_summary-set",
          verdict: "COVERED_BY_EXISTING_APPROVAL",
          reviewedAgainstApprovalRecordId: SEPTEMBER_ID,
          mayEnterTheFirstCohort: true
        }
      ]
    });
    writeJson(root, "data/rcap-grade-a/FIRST_COHORT_RUNTIME_IDENTITY.json", {});

    const run = spawnSync(process.execPath, [path.join(scriptDir, path.basename(generator))], {
      cwd: root,
      encoding: "utf8"
    });
    const outputPath = path.join(root, "data/rcap-grade-a/FIRST_ROUTE_COHORT.json");
    return {
      status: run.status,
      stdout: run.stdout,
      stderr: run.stderr,
      output: fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : null
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const current = runScenario();
assert.equal(current.status, 0, current.stderr || current.stdout);
const byId = new Map(current.output.allRows.map((row) => [row.familyId, row]));
assert.equal(byId.get("september-family").checks.coveredByAnExistingOwnerApproval, true,
  "a September exact-digest adoption must be selected when both pins still match");
assert.equal(byId.get("september-family").checks.noSubstantiveLegalChangeSinceThatApproval, true,
  "a condition-seven audit must bind the selected September approval identity");
assert.equal(byId.get("september-family").legalApproval.legalDecisionRecordId, SEPTEMBER_ID,
  "September approval provenance must not be mislabeled as the August decision");
assert.equal(byId.get("august-family").checks.coveredByAnExistingOwnerApproval, true,
  "August approval behavior must be preserved");
assert.equal(byId.get("august-family").legalApproval.legalDecisionRecordId, AUGUST_ID,
  "August approval provenance must be preserved");
assert.equal(byId.get("composed-treatment:sc_17_22_950_summary").checks.coveredByAnExistingOwnerApproval, true,
  "the exact adopted treatment ID must be covered");
assert.equal(byId.get("sc_17_22_950_summary-set").checks.coveredByAnExistingOwnerApproval, false,
  "a similarly named packet family must not inherit exact-ID adoption");
assert.equal(current.output.createsCommercialAuthority, false);
assert.equal(current.output.opensAnyRoute, false);
assert.equal(current.output.paymentRemainsFailClosed, true);

const stale = runScenario({ staleSeptember: true });
assert.equal(stale.status, 0, stale.stderr || stale.stdout);
const staleRow = stale.output.allRows.find((row) => row.familyId === "september-family");
assert.equal(staleRow.checks.coveredByAnExistingOwnerApproval, false,
  "changed shipping bytes must make the digest-conditioned approval non-current");
assert.equal(staleRow.inCohort, false, "stale adopted bytes must not enter the cohort");

const missingAudit = runScenario({ septemberAudit: "missing" });
assert.equal(missingAudit.status, 0, missingAudit.stderr || missingAudit.stdout);
const missingAuditRow = missingAudit.output.allRows.find((row) => row.familyId === "september-family");
assert.equal(missingAuditRow.checks.coveredByAnExistingOwnerApproval, true,
  "current September pins remain an approval even when condition-seven evidence is missing");
assert.equal(missingAuditRow.checks.noSubstantiveLegalChangeSinceThatApproval, false,
  "missing condition-seven evidence must fail closed");
assert.equal(missingAuditRow.inCohort, false, "an unaudited September family must not enter the cohort");

const wrongAudit = runScenario({ septemberAudit: "august" });
assert.equal(wrongAudit.status, 0, wrongAudit.stderr || wrongAudit.stdout);
const wrongAuditRow = wrongAudit.output.allRows.find((row) => row.familyId === "september-family");
assert.equal(wrongAuditRow.checks.noSubstantiveLegalChangeSinceThatApproval, false,
  "an August-bound audit must not satisfy condition seven for a September approval");
assert.equal(wrongAuditRow.inCohort, false, "mismatched audit authority must remain outside the cohort");

const missing = runScenario({ missingBoundary: true });
assert.notEqual(missing.status, 0, "a September adoption missing its boundary pin must be rejected");

const ambiguous = runScenario({ overlap: true });
assert.notEqual(ambiguous.status, 0, "a family present in both approval records must be rejected as ambiguous");

console.log("PASS first-cohort selection binds August and September approvals without widening authority");
