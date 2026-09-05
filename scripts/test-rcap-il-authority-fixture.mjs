// Test-only registry fixture. No application import or request injection path.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { fulfillmentRecordSha256, resetFulfillmentRegistryCache, loadFulfillmentRegistry } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { resetObservationCache, resolveObservation } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const GRADE_A_ADMISSION_SCHEMA_VERSION = "rcap-grade-a-fulfillment-authority/v2";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function completenessProof(overrides = {}) {
  const covered = (basis) => ({ state: "covered", basis });
  return {
    specificationId: "zz-synthetic-spec",
    specificationVersion: "1.0.0",
    specificationSha256: sha256("spec"),
    filingApplication: covered("documents[0]"),
    proposedOrder: covered("documents[1]"),
    attachmentsAndSchedules: covered("attachments"),
    serviceAndNotice: covered("serviceAndNotice"),
    filingDestination: covered("filingDestination"),
    feeAndWaiverInstructions: covered("feeAndWaiver"),
    copyRequirements: covered("copyRequirements"),
    postFilingSteps: covered("postFilingTimeline"),
    hearingAndObjectionStopConditions: covered("hearingAndObjectionStops"),
    customPleadingAuthority: { required: true, approved: true, authorityId: "zz-drafting-authority" },
    filingFormatArtifact: {
      format: "pdf",
      sha256: sha256("filing.pdf"),
      pageCount: 4,
      producedBy: {
        renderer: "ghcr.io/example/rcap-render-worker@sha256:0000000000000000000000000000000000000000000000000000000000000001",
        matchesRecordProvider: true,
        reconciliation: null,
        deterministicRenderVerified: true
      }
    },
    ...overrides
  };
}

function provenRecord(overrides = {}) {
  const record = {
    schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION,
    recordId: "grade-a-zz-hardening-v1",
    routeId: "ZZ:hardening-route",
    jurisdiction: "ZZ",
    pathwayId: "hardening-route",
    packetFamilyId: "rcap-zz-hardening",
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: "2026-08-29",
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: "auth-zz", version: "auth-zz", status: "approved_by_decision_owner",
      effectiveDate: "2026-08-29", scopeSha256: sha256("scope")
    },
    packetSpecification: { specId: "zz-set", sha256: sha256("packet-spec"), complete: true },
    officialSources: [{
      sourceId: "ZZ-FORM-1",
      // The document digest, never the digest of the identifier.
      sha256: sha256("ZZ-FORM-1-document-bytes"),
      expectedSha256: sha256("ZZ-FORM-1-document-bytes"),
      installedSha256: sha256("ZZ-FORM-1-document-bytes"),
      corpusReleaseId: "source-corpus-2026-08-28",
      corpusArchiveSha256: sha256("synthetic-corpus-archive"),
      verifiedAt: "corpus-import:source-corpus-2026-08-28",
      verificationRecord: "data/rcap-grade-a/official-source-registry.json"
    }],
    provider: {
      providerId: "ghcr.io/example/rcap-render-worker", rendererKind: "packet_document_v1",
      rendererVersion: "1.0.0",
      imageDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000001"
    },
    fixture: { fixtureId: "ZZ:hardening-route", sha256: sha256("fixture"), deterministic: true },
    artifactValidation: { state: "validated", artifactSha256: sha256("artifact"), validatedAt: "2026-08-29" },
    packetCompleteness: completenessProof(),
    visualReview: {
      state: "passed", pagesReviewed: 4, pageCount: 4, evidenceSha256: sha256("sheet"),
      reviewedBy: "synthetic reviewer", reviewedAt: "2026-08-29"
    },
    outputLegalApproval: {
      state: "passed", reviewerId: "synthetic counsel", decidedAt: "2026-08-29", scopeSha256: sha256("output")
    },
    finalVerification: {
      state: "bound", verifierId: "hardening-gate", boundInputsSha256: sha256("bound"), verifiedAt: "2026-08-29"
    },
    history: [],
    ...overrides
  };
  record.history = [{
    version: record.version, changeKind: "created", changedAt: "2026-08-29",
    changedBy: "scripts/verify-rcap-grade-a-fulfillment-hardening.mjs",
    reason: "Synthetic hardening record; in memory only, never written to the registry.",
    recordSha256: fulfillmentRecordSha256(record), supersedesRecordSha256: null
  }];
  return record;
}

function provenObservation(record) {
  return {
    observedAt: "2026-08-29",
    legalAuthority: {
      version: record.legalAuthority.version, status: record.legalAuthority.status,
      scopeSha256: record.legalAuthority.scopeSha256
    },
    packetSpecificationSha256: record.packetSpecification.sha256,
    officialSourceSha256ById: Object.fromEntries(record.officialSources.map((s) => [s.sourceId, s.sha256])),
    corpusReleaseId: "source-corpus-2026-08-28",
    corpusArchiveSha256: sha256("synthetic-corpus-archive"),
    provider: { ...record.provider },
    fixtureSha256: record.fixture.sha256,
    artifactSha256: record.artifactValidation.artifactSha256,
    visualReviewEvidenceSha256: record.visualReview.evidenceSha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256
  };
}


export function syntheticIllinoisRegistry() {
  const specPath = "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json";
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const record = provenRecord({
    recordId: "SYNTHETIC-IL-delivery-test-only", routeId: spec.routeKey,
    jurisdiction: spec.jurisdiction, pathwayId: spec.pathwayId, packetFamilyId: spec.packetFamily,
    packetSpecification: { specId: `${spec.specificationId}@${spec.specificationVersion}`, sha256: sha256(fs.readFileSync(specPath)), complete: true },
    packetCompleteness: completenessProof({ specificationId: spec.specificationId, specificationVersion: spec.specificationVersion, specificationSha256: sha256(fs.readFileSync(specPath)) }),
    provider: { providerId: "ghcr.io/roger-legalease/rcap-render-worker", rendererKind: "packet_document_v1", rendererVersion: "1.0.0", imageDigest: `sha256:${sha256("synthetic-worker")}` }
  });
  record.history[0].recordSha256 = fulfillmentRecordSha256(record);
  return { document: { schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION, records: [record] }, observation: provenObservation(record) };
}

// Exercise the production disk loader, structure/history validation, evaluator
// and observation reader. Change cwd only while loading into process-local
// caches, then restore it before any rendering. Never modify a tracked file.
export async function withIllinoisRegistry(run, mutate = () => {}) {
  const fixture = syntheticIllinoisRegistry();
  mutate(fixture);
  for (const record of fixture.document.records) record.history.at(-1).recordSha256 = fulfillmentRecordSha256(record);
  const cwd = process.cwd();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-il-authority-"));
  try {
    fs.mkdirSync(path.join(temporary, "data/rcap-grade-a"), { recursive: true });
    fs.writeFileSync(path.join(temporary, "data/rcap-grade-a/fulfillment-authority-registry.json"), JSON.stringify(fixture.document));
    fs.writeFileSync(path.join(temporary, "data/rcap-grade-a/fulfillment-observation-snapshot.json"), JSON.stringify({ routes: { "IL:felony-prostitution-relief": fixture.observation } }));
    process.chdir(temporary);
    resetFulfillmentRegistryCache(); resetObservationCache();
    const loaded = loadFulfillmentRegistry();
    assert.deepEqual(loaded.problems, []);
    resolveObservation("IL:felony-prostitution-relief");
    process.chdir(cwd);
    return await run(fixture);
  } finally {
    process.chdir(cwd);
    resetFulfillmentRegistryCache(); resetObservationCache();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
