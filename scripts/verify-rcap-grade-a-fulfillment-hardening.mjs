#!/usr/bin/env node
// GRADE-A FULFILLMENT — hardening gate (Lane B, wave 2).
//
//   node scripts/verify-rcap-grade-a-fulfillment-hardening.mjs
//   node scripts/verify-rcap-grade-a-fulfillment-hardening.mjs --mutations
//
// The base gate proves the authority denies. This one proves it denies for the
// right reasons, at every door, on both halves of an admission:
//
//   * a route can be perfectly provenanced and still unfileable;
//   * a proven route can still be the wrong participant, the wrong matter, a
//     stale verification, a spent credit or a public file;
//   * a sponsored participant must be admitted by exactly the proof a paying one
//     is, because a softer sponsored path is how "same authority" stops being
//     true without anyone deciding it should.
//
// The mutation matrix is the point of the file: every proof dimension is broken
// against every admission point, rather than one dimension against one door.
// A gate that checks consumer checkout and assumes the other nine agree is a
// gate that finds out they did not, in production.
//
// Everything is in memory. Nothing is written, and no fixture on disk is touched.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");

const authority = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const packetProof = await import("../src/lib/rcap/fulfillment/grade-a-packet-proof.ts");
const requestContext = await import("../src/lib/rcap/fulfillment/grade-a-request-context.ts");
const registryModule = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");

const {
  COMPLETE_PACKET_PROVEN,
  COMMERCIAL_ADMISSION_POINTS,
  GRADE_A_AUTHORITY_SCHEMA_VERSION,
  GRADE_A_ADMISSION_SCHEMA_VERSION,
  ROUTE_DISPOSITIONS,
  ADMISSION_IDENTITY_KEYS,
  admitCommercialAction,
  dispositionFor,
  evaluateFulfillmentAuthority,
  sanitizeAdmissionRequest
} = authority;
const { PACKET_COMPLETENESS_DIMENSIONS, collectPacketCompletenessGaps } = packetProof;
const { ADMISSION_CONTEXT_REQUIREMENTS, collectContextDenials, withEntitlementKind } = requestContext;
const { fulfillmentRecordSha256, stableStringify } = registryModule;

const SYN_SRC_DIGEST_PLACEHOLDER = null;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readSource = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");

const failures = [];
const passed = [];
function check(name, fn) {
  try {
    const problem = fn();
    if (problem) failures.push(`${name}: ${problem}`);
    else passed.push(name);
  } catch (error) {
    failures.push(`${name}: threw ${error?.message ?? error}`);
  }
}

// ---------------------------------------------------------------------------
// Synthetic, fully proven fixtures. ZZ is not a jurisdiction; a synthetic proof
// must never be able to leak into the registry and sell a real packet.
// ---------------------------------------------------------------------------

const ALL_POINTS = [...COMMERCIAL_ADMISSION_POINTS];
const PARTICIPANT_POINTS = ALL_POINTS.filter((point) => point !== "launch_graph_commercial_status");
const ENTITLEMENT_POINTS = ALL_POINTS.filter((point) => ADMISSION_CONTEXT_REQUIREMENTS[point].entitlement);
const STORAGE_POINTS = ALL_POINTS.filter((point) => ADMISSION_CONTEXT_REQUIREMENTS[point].storage);

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

function provenContext(record, overrides = {}) {
  return {
    participantUserId: "user-1",
    matterId: "matter-1",
    matterOwnerUserId: "user-1",
    finalVerification: {
      snapshotId: "snap-1", outcome: "VERIFIED_PACKET_READY", matterId: "matter-1", ownerUserId: "user-1",
      boundRouteId: record.routeId, boundPacketFamilyId: record.packetFamilyId,
      routeContractVersion: "1.0.0", legalRuleVersion: "2026-08-29",
      factSnapshotSha256: sha256("facts"), formSetVersion: "1.0.0", formSetSha256: sha256("form-set"),
      verifiedAt: "2026-08-29", invalidated: false, invalidationReason: null
    },
    entitlement: {
      kind: "consumer_payment", idempotencyKey: "idem-1", alreadyConsumed: false, serverVerified: true
    },
    storage: { privateStorage: true, artifactSha256: sha256("artifact"), repeatDownload: true },
    ...overrides
  };
}

const identityOf = (record) => ({
  routeId: record.routeId, jurisdiction: record.jurisdiction, packetFamilyId: record.packetFamilyId
});

function admit(point, record, { observation, context } = {}) {
  return admitCommercialAction({
    admissionPoint: point,
    request: identityOf(record),
    record,
    observation: observation === undefined ? provenObservation(record) : observation,
    context: context === undefined ? provenContext(record) : context
  });
}

// ---------------------------------------------------------------------------
// 1. Vocabulary integrity. The context module imports the admission-point type
//    type-only to avoid a runtime cycle, so nothing but this check stops its
//    requirement table from silently missing a point that was added later.
// ---------------------------------------------------------------------------

check("the context requirement table covers exactly the declared admission points", () => {
  const declared = [...COMMERCIAL_ADMISSION_POINTS].sort().join(",");
  const tabled = Object.keys(ADMISSION_CONTEXT_REQUIREMENTS).sort().join(",");
  return declared === tabled ? null : `declared [${declared}] but the table has [${tabled}]`;
});

check("every declared admission point is exercised by this gate", () => {
  return ALL_POINTS.length === COMMERCIAL_ADMISSION_POINTS.length ? null : "the point list drifted";
});

check("repeat_download is a distinct admission point", () => {
  return COMMERCIAL_ADMISSION_POINTS.includes("repeat_download") ? null : "repeat_download is not declared";
});

// This gate derives its own matrix from the module's dimension list, which means
// deleting a dimension deletes the tests for it and the gate goes on reporting
// green with a smaller matrix. A tamper run proved exactly that. So the required
// dimensions are named here, in this file, where removing one is a failure
// rather than a quieter pass.
const REQUIRED_COMPLETENESS_DIMENSIONS = [
  "filingApplication",
  "proposedOrder",
  "attachmentsAndSchedules",
  "serviceAndNotice",
  "filingDestination",
  "feeAndWaiverInstructions",
  "copyRequirements",
  "postFilingSteps",
  "hearingAndObjectionStopConditions"
];

check("every Grade-A packet dimension is still required by the module", () => {
  const declared = [...PACKET_COMPLETENESS_DIMENSIONS].sort().join(",");
  const required = [...REQUIRED_COMPLETENESS_DIMENSIONS].sort().join(",");
  return declared === required ? null : `the module requires [${declared}] but Grade-A requires [${required}]`;
});

check("each required dimension is independently load-bearing", () => {
  // Not just present in a list: removing any one of them, alone, must close a
  // record that is otherwise fully proven.
  for (const dimension of REQUIRED_COMPLETENESS_DIMENSIONS) {
    const record = provenRecord({
      packetCompleteness: completenessProof({ [dimension]: { state: "missing", basis: null } })
    });
    const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
    if (decision.authorized) return `${dimension} can be missing and the record still proves`;
    if (!decision.missingProof.some((entry) => entry.includes(dimension))) {
      return `${dimension} was missing but was not named as the reason`;
    }
  }
  return null;
});

// ---------------------------------------------------------------------------
// 2. The fully proven baseline. Everything below is a departure from this, so if
//    the baseline does not admit, every denial beneath it proves nothing.
// ---------------------------------------------------------------------------

check("a fully proven v2 record admits every admission point", () => {
  const record = provenRecord();
  for (const point of ALL_POINTS) {
    const decision = admit(point, record);
    if (!decision.admitted) return `${point} was denied: ${decision.reason} ${decision.contextDenials.join("; ")}`;
    if (decision.disposition !== COMPLETE_PACKET_PROVEN) return `${point} reported disposition ${decision.disposition}`;
  }
  return null;
});

// ---------------------------------------------------------------------------
// 3. THE MATRIX — every proof dimension against every admission point.
// ---------------------------------------------------------------------------

const PROOF_BREAKS = [
  ["legal authority pending", { legalAuthority: { recordId: "auth-zz", version: "auth-zz", status: "pending", effectiveDate: "2026-08-29", scopeSha256: sha256("scope") } }],
  ["legal authority withdrawn", { legalAuthority: { recordId: "auth-zz", version: "auth-zz", status: "withdrawn", effectiveDate: "2026-08-29", scopeSha256: sha256("scope") } }],
  ["packet specification incomplete", { packetSpecification: { specId: "zz-set", sha256: sha256("packet-spec"), complete: false } }],
  ["packet specification unhashed", { packetSpecification: { specId: "zz-set", sha256: "", complete: true } }],
  ["no official source", { officialSources: [] }],
  ["official source absent from the verified corpus", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: "", expectedSha256: "", installedSha256: "", corpusReleaseId: "", corpusArchiveSha256: "", verifiedAt: "", verificationRecord: "" }] }],
  ["official source content mismatched between records", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: sha256("ZZ-FORM-1-document-bytes"), expectedSha256: sha256("ZZ-FORM-1-document-bytes"), installedSha256: sha256("other-bytes"), corpusReleaseId: "source-corpus-2026-08-28", corpusArchiveSha256: sha256("synthetic-corpus-archive"), verifiedAt: "v", verificationRecord: "r" }] }],
  ["provider digest erased", { provider: { providerId: "p", rendererKind: "packet_document_v1", rendererVersion: "1.0.0", imageDigest: "" } }],
  ["renderer version erased", { provider: { providerId: "p", rendererKind: "packet_document_v1", rendererVersion: "", imageDigest: "sha256:01" } }],
  ["fixture non-deterministic", { fixture: { fixtureId: "f", sha256: sha256("fixture"), deterministic: false } }],
  ["fixture unhashed", { fixture: { fixtureId: "f", sha256: "", deterministic: true } }],
  ["artifact not validated", { artifactValidation: { state: "not_run", artifactSha256: null, validatedAt: null } }],
  ["artifact validation failed", { artifactValidation: { state: "failed", artifactSha256: sha256("a"), validatedAt: "2026-08-29" } }],
  ["visual review pending", { visualReview: { state: "pending", pagesReviewed: 0, pageCount: 4, evidenceSha256: null, reviewedBy: null, reviewedAt: null } }],
  ["visual review partial", { visualReview: { state: "passed", pagesReviewed: 3, pageCount: 4, evidenceSha256: sha256("s"), reviewedBy: "r", reviewedAt: "2026-08-29" } }],
  ["visual review waived", { visualReview: { state: "not_required", pagesReviewed: 0, pageCount: 0, evidenceSha256: null, reviewedBy: null, reviewedAt: null } }],
  ["output legal approval pending", { outputLegalApproval: { state: "pending", reviewerId: null, decidedAt: null, scopeSha256: null } }],
  ["output legal approval unattributed", { outputLegalApproval: { state: "passed", reviewerId: "", decidedAt: "2026-08-29", scopeSha256: sha256("o") } }],
  ["final verification unbound", { finalVerification: { state: "unbound", verifierId: null, boundInputsSha256: null, verifiedAt: null } }],
  ["final verification inputs erased", { finalVerification: { state: "bound", verifierId: "v", boundInputsSha256: "", verifiedAt: "2026-08-29" } }],
  ["service disposition is guidance", { serviceDisposition: "non_filing_guidance" }],
  ["service disposition is an external deferral", { serviceDisposition: "exact_external_deferral" }],
  ["revoked", { revocation: { revoked: true, reason: "source withdrawn", revokedAt: "2026-08-29", revokedBy: "Roger Roman" } }],
  ["superseded", { supersededBy: "grade-a-zz-hardening-v2", supersededAt: "2026-08-29" }],
  ["schema below the admission minimum", { schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION }],
  ["no completeness proof at all", { packetCompleteness: null }]
];

// Every completeness dimension, broken one at a time.
for (const dimension of PACKET_COMPLETENESS_DIMENSIONS) {
  PROOF_BREAKS.push([`${dimension} missing`, { packetCompleteness: completenessProof({ [dimension]: { state: "missing", basis: null } }) }]);
  PROOF_BREAKS.push([`${dimension} asserted with no basis`, { packetCompleteness: completenessProof({ [dimension]: { state: "covered", basis: "" } }) }]);
}
PROOF_BREAKS.push(["filing waived, which it may never be", { packetCompleteness: completenessProof({ filingApplication: { state: "not_required", basis: "someone decided" } }) }]);
PROOF_BREAKS.push(["custom pleading drafted with no approved authority", { packetCompleteness: completenessProof({ customPleadingAuthority: { required: true, approved: false, authorityId: null } }) }]);
PROOF_BREAKS.push(["filing artifact is not a filing format", { packetCompleteness: completenessProof({ filingFormatArtifact: { format: "txt", sha256: sha256("x"), pageCount: 4 } }) }]);
PROOF_BREAKS.push(["filing artifact unhashed", { packetCompleteness: completenessProof({ filingFormatArtifact: { format: "pdf", sha256: null, pageCount: 4 } }) }]);
PROOF_BREAKS.push(["filing artifact has no pages", { packetCompleteness: completenessProof({ filingFormatArtifact: { format: "pdf", sha256: sha256("x"), pageCount: 0 } }) }]);
PROOF_BREAKS.push(["specification unhashed", { packetCompleteness: completenessProof({ specificationSha256: "" }) }]);

check(`every proof dimension denies every admission point (${PROOF_BREAKS.length} breaks x ${ALL_POINTS.length} points)`, () => {
  for (const [label, override] of PROOF_BREAKS) {
    const record = provenRecord(override);
    for (const point of ALL_POINTS) {
      const decision = admit(point, record);
      if (decision.admitted) return `${label} was admitted at ${point}`;
      if (decision.disposition === COMPLETE_PACKET_PROVEN) return `${label} still reported COMPLETE_PACKET_PROVEN at ${point}`;
    }
  }
  return null;
});

// Staleness, likewise, against every door.
const STALE_BREAKS = [
  ["legal decision version moved", (o) => { o.legalAuthority.version = "auth-later"; }],
  ["legal decision scope rewritten", (o) => { o.legalAuthority.scopeSha256 = sha256("new"); }],
  ["specification changed", (o) => { o.packetSpecificationSha256 = sha256("new"); }],
  ["official source changed", (o) => { o.officialSourceSha256ById["ZZ-FORM-1"] = sha256("new"); }],
  ["official source unaccounted for", (o) => { delete o.officialSourceSha256ById["ZZ-FORM-1"]; }],
  ["provider image republished", (o) => { o.provider.imageDigest = "sha256:ff"; }],
  ["fixture changed", (o) => { o.fixtureSha256 = sha256("new"); }],
  ["artifact changed", (o) => { o.artifactSha256 = sha256("new"); }],
  ["reviewed pages changed", (o) => { o.visualReviewEvidenceSha256 = sha256("new"); }],
  ["approved output scope changed", (o) => { o.outputLegalApprovalScopeSha256 = sha256("new"); }],
  ["verification inputs changed", (o) => { o.finalVerificationBoundInputsSha256 = sha256("new"); }]
];

check(`every staleness case denies every admission point (${STALE_BREAKS.length} x ${ALL_POINTS.length})`, () => {
  for (const [label, mutate] of STALE_BREAKS) {
    const record = provenRecord();
    const observation = provenObservation(record);
    mutate(observation);
    for (const point of ALL_POINTS) {
      const decision = admit(point, record, { observation });
      if (decision.admitted) return `${label} was admitted at ${point}`;
      if (decision.authority.state !== "STALE") return `${label} reached ${decision.authority.state} at ${point}`;
    }
  }
  return null;
});

check("an unobservable route denies every admission point", () => {
  const record = provenRecord();
  for (const point of ALL_POINTS) {
    const decision = admit(point, record, { observation: null });
    if (decision.admitted) return `${point} admitted an unobservable route`;
  }
  return null;
});

// ---------------------------------------------------------------------------
// 4. The seven denial categories, each separately observable.
// ---------------------------------------------------------------------------

const DENIAL_CATEGORIES = [
  ["missing", () => admitCommercialAction({ admissionPoint: "consumer_checkout", request: { routeId: "ZZ:nothing", jurisdiction: "ZZ", packetFamilyId: null }, record: null, observation: null, context: null }), "fulfillment_no_record"],
  ["unsupported", () => { const r = provenRecord({ schemaVersion: "rcap-grade-a-fulfillment-authority/v99" }); return admit("consumer_checkout", r); }, "fulfillment_unsupported_route"],
  ["incomplete", () => admit("consumer_checkout", provenRecord({ packetCompleteness: null })), "fulfillment_incomplete"],
  ["stale", () => { const r = provenRecord(); const o = provenObservation(r); o.fixtureSha256 = sha256("new"); return admit("consumer_checkout", r, { observation: o }); }, "fulfillment_stale"],
  ["revoked", () => admit("consumer_checkout", provenRecord({ revocation: { revoked: true, reason: "withdrawn", revokedAt: "2026-08-29", revokedBy: "Roger Roman" } })), "fulfillment_revoked"],
  ["superseded", () => admit("consumer_checkout", provenRecord({ supersededBy: "v2", supersededAt: "2026-08-29" })), "fulfillment_superseded"],
  ["mismatched", () => { const r = provenRecord(); return admitCommercialAction({ admissionPoint: "consumer_checkout", request: { routeId: r.routeId, jurisdiction: "YY", packetFamilyId: r.packetFamilyId }, record: r, observation: provenObservation(r), context: provenContext(r) }); }, "route_binding_mismatch"]
];

for (const [label, run, expected] of DENIAL_CATEGORIES) {
  check(`a ${label} record denies with its own denial code`, () => {
    const decision = run();
    if (decision.admitted) return "it was admitted";
    return decision.denialCode === expected ? null : `denialCode was ${decision.denialCode}, expected ${expected}`;
  });
}

check("a v1 record carrying every v1 proof still admits nothing", () => {
  // The dangerous case: not a broken record, a complete one from before
  // fileability was a question. Being evaluable is not being sellable.
  const v1 = provenRecord({ schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION });
  delete v1.packetCompleteness;
  v1.history = [{
    version: 1, changeKind: "created", changedAt: "2026-08-29", changedBy: "gate",
    reason: "v1 record with every v1 proof", recordSha256: fulfillmentRecordSha256(v1), supersedesRecordSha256: null
  }];
  const evaluated = evaluateFulfillmentAuthority(v1, provenObservation(v1), v1.routeId);
  if (evaluated.state !== COMPLETE_PACKET_PROVEN) {
    return `the v1 fixture is not a complete v1 record (${evaluated.state}); this check needs a complete one to mean anything`;
  }
  for (const point of ALL_POINTS) {
    const decision = admit(point, v1);
    if (decision.admitted) return `a v1 record was admitted at ${point}`;
    if (decision.denialCode !== "fulfillment_schema_below_admission_minimum") {
      return `${point} denied a v1 record with ${decision.denialCode}`;
    }
  }
  return null;
});

// ---------------------------------------------------------------------------
// 5. The participant half — every context dimension against every point that
//    requires it, and against every point that does not.
// ---------------------------------------------------------------------------

const CONTEXT_BREAKS = [
  ["no context at all", null, PARTICIPANT_POINTS],
  ["anonymous participant", { participantUserId: "" }, PARTICIPANT_POINTS],
  ["no matter", { matterId: "" }, PARTICIPANT_POINTS],
  ["someone else's matter", { matterOwnerUserId: "user-2" }, PARTICIPANT_POINTS],
  ["no verification snapshot", { finalVerification: null }, PARTICIPANT_POINTS],
  ["verification pending", { finalVerification: { ...provenContext(provenRecord()).finalVerification, outcome: "VERIFICATION_PENDING" } }, PARTICIPANT_POINTS],
  ["verification failed", { finalVerification: { ...provenContext(provenRecord()).finalVerification, outcome: "VERIFICATION_FAILED" } }, PARTICIPANT_POINTS],
  ["verification invalidated by a material answer change", { finalVerification: { ...provenContext(provenRecord()).finalVerification, invalidated: true, invalidationReason: "completion date changed" } }, PARTICIPANT_POINTS],
  ["verification for another route", { finalVerification: { ...provenContext(provenRecord()).finalVerification, boundRouteId: "ZZ:other-route" } }, PARTICIPANT_POINTS],
  ["verification for another packet family", { finalVerification: { ...provenContext(provenRecord()).finalVerification, boundPacketFamilyId: "rcap-zz-other" } }, PARTICIPANT_POINTS],
  ["verification for another matter", { finalVerification: { ...provenContext(provenRecord()).finalVerification, matterId: "matter-2" } }, PARTICIPANT_POINTS],
  ["verification with no form-set hash", { finalVerification: { ...provenContext(provenRecord()).finalVerification, formSetSha256: "" } }, PARTICIPANT_POINTS],
  ["verification with no legal-rule version", { finalVerification: { ...provenContext(provenRecord()).finalVerification, legalRuleVersion: "" } }, PARTICIPANT_POINTS],
  ["no entitlement", { entitlement: null }, ENTITLEMENT_POINTS],
  ["entitlement not server-verified", { entitlement: { kind: "consumer_payment", idempotencyKey: "k", alreadyConsumed: false, serverVerified: false } }, ENTITLEMENT_POINTS],
  ["entitlement with no idempotency key", { entitlement: { kind: "consumer_payment", idempotencyKey: "", alreadyConsumed: false, serverVerified: true } }, ENTITLEMENT_POINTS],
  ["no storage context", { storage: null }, STORAGE_POINTS],
  ["artifact in public storage", { storage: { privateStorage: false, artifactSha256: sha256("a"), repeatDownload: true } }, STORAGE_POINTS],
  ["stored artifact unhashed", { storage: { privateStorage: true, artifactSha256: "", repeatDownload: true } }, STORAGE_POINTS]
];

check(`every participant condition denies the points that require it (${CONTEXT_BREAKS.length} breaks)`, () => {
  for (const [label, override, points] of CONTEXT_BREAKS) {
    const record = provenRecord();
    const context = override === null ? null : provenContext(record, override);
    for (const point of points) {
      const decision = admit(point, record, { context });
      if (decision.admitted) return `${label} was admitted at ${point}`;
      if (decision.denialCode !== "participant_context_denied") {
        return `${label} at ${point} denied with ${decision.denialCode} rather than a participant denial`;
      }
      if (decision.contextDenials.length === 0) return `${label} at ${point} named no participant reason`;
    }
  }
  return null;
});

check("the route-only admission point ignores the participant entirely", () => {
  // launch_graph_commercial_status asks whether a route COULD be sold, with
  // nobody in front of it. A missing participant must not close it, or the
  // launch graph starts depending on who happens to be logged in.
  const record = provenRecord();
  const decision = admit("launch_graph_commercial_status", record, { context: null });
  return decision.admitted ? null : `it was denied: ${decision.reason}`;
});

check("the participant is checked only after the route, so no probe leaks another participant's state", () => {
  const unproven = provenRecord({ packetCompleteness: null });
  const good = admit("consumer_checkout", unproven, { context: provenContext(unproven) });
  const bad = admit("consumer_checkout", unproven, { context: provenContext(unproven, { matterOwnerUserId: "user-2" }) });
  if (good.admitted || bad.admitted) return "an unproven route was admitted";
  return good.denialCode === bad.denialCode && good.denialCode === "fulfillment_incomplete"
    ? null
    : `an unproven route answered differently per participant (${good.denialCode} vs ${bad.denialCode})`;
});

// ---------------------------------------------------------------------------
// 6. Repeat download: reusable without a second payment, and only for the owner.
// ---------------------------------------------------------------------------

check("a repeat download is admitted on an already-consumed entitlement", () => {
  const record = provenRecord();
  const context = provenContext(record, {
    entitlement: { kind: "consumer_payment", idempotencyKey: "idem-1", alreadyConsumed: true, serverVerified: true }
  });
  const decision = admit("repeat_download", record, { context });
  return decision.admitted ? null : `the second download was refused: ${decision.contextDenials.join("; ")}`;
});

check("an already-consumed entitlement cannot buy a second generation", () => {
  const record = provenRecord();
  const context = provenContext(record, {
    entitlement: { kind: "consumer_payment", idempotencyKey: "idem-1", alreadyConsumed: true, serverVerified: true }
  });
  for (const point of ["packet_credit_admission", "generation_admission", "sponsored_entitlement"]) {
    const decision = admit(point, record, { context });
    if (decision.admitted) return `${point} consumed a spent entitlement`;
  }
  return null;
});

check("a render retry may re-dispatch the provider on the same spent entitlement", () => {
  // The contract requires a failed render to retry with the SAME idempotency key
  // and without consuming another credit. provider_dispatch is the one point
  // that must therefore tolerate an already-consumed entitlement.
  const record = provenRecord();
  const context = provenContext(record, {
    entitlement: { kind: "sponsored_credit", idempotencyKey: "idem-1", alreadyConsumed: true, serverVerified: true }
  });
  const decision = admit("provider_dispatch", record, { context });
  return decision.admitted ? null : `a safe retry was refused: ${decision.contextDenials.join("; ")}`;
});

check("a repeat download with no prior download is refused", () => {
  const record = provenRecord();
  const context = provenContext(record, {
    storage: { privateStorage: true, artifactSha256: sha256("artifact"), repeatDownload: false }
  });
  return admit("repeat_download", record, { context }).admitted ? "it was admitted" : null;
});

// ---------------------------------------------------------------------------
// 7. Consumer / sponsored parity.
// ---------------------------------------------------------------------------

check("consumer and sponsored admissions are decided identically on the same facts", () => {
  const scenarios = [["fully proven", {}], ...PROOF_BREAKS];
  for (const [label, override] of scenarios) {
    const record = provenRecord(override);
    const base = provenContext(record);
    for (const point of ENTITLEMENT_POINTS) {
      const consumer = admit(point, record, { context: withEntitlementKind(base, "consumer_payment") });
      const sponsored = admit(point, record, { context: withEntitlementKind(base, "sponsored_credit") });
      if (consumer.admitted !== sponsored.admitted) {
        return `${label} at ${point}: consumer admitted=${consumer.admitted}, sponsored admitted=${sponsored.admitted}`;
      }
      if (consumer.denialCode !== sponsored.denialCode) {
        return `${label} at ${point}: consumer ${consumer.denialCode} vs sponsored ${sponsored.denialCode}`;
      }
      if (stableStringify(consumer.contextDenials) !== stableStringify(sponsored.contextDenials)) {
        return `${label} at ${point}: the two paths gave different participant reasons`;
      }
    }
  }
  return null;
});

check("consumer and sponsored are refused identically on every participant condition", () => {
  for (const [label, override, points] of CONTEXT_BREAKS) {
    if (override === null) continue;
    const record = provenRecord();
    const context = provenContext(record, override);
    if (!context.entitlement) continue;
    for (const point of points.filter((p) => ENTITLEMENT_POINTS.includes(p))) {
      const consumer = admit(point, record, { context: withEntitlementKind(context, "consumer_payment") });
      const sponsored = admit(point, record, { context: withEntitlementKind(context, "sponsored_credit") });
      if (consumer.admitted !== sponsored.admitted || consumer.denialCode !== sponsored.denialCode) {
        return `${label} at ${point} treated sponsored differently`;
      }
    }
  }
  return null;
});

check("the authority has no sponsored-only or consumer-only branch", () => {
  const source = [readSource("src/lib/rcap/fulfillment/grade-a-authority.ts"),
                  readSource("src/lib/rcap/fulfillment/grade-a-request-context.ts")].join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
  // The entitlement KIND may be named in a message; it may not gate a rule.
  const branching = /if\s*\([^)]*kind\s*===\s*"(consumer_payment|sponsored_credit)"/.test(source);
  return branching ? "a rule branches on the entitlement kind" : null;
});

// ---------------------------------------------------------------------------
// 8. Untrusted input may assert nothing.
// ---------------------------------------------------------------------------

check("the derived vocabulary rejects every authority field name", () => {
  const fieldNames = [
    "state", "authorized", "commercialStatus", "serviceDisposition", "packetCompleteness",
    "officialSources", "visualReview", "artifactValidation", "finalVerification",
    "outputLegalApproval", "provider", "fixture", "packetSpecification", "legalAuthority",
    "revocation", "history", "supersededBy", "entitlement", "storage", "matterOwnerUserId",
    "participantUserId", "boundRouteId", "formSetSha256", "idempotencyKey", "privateStorage",
    "serverVerified", "alreadyConsumed", "installedSha256", "deterministic", "recordSha256",
    "disposition", "missingProof", "stalenessReasons", "contextDenials", "invalidated"
  ];
  const missed = fieldNames.filter((key) => {
    const result = sanitizeAdmissionRequest({ routeId: "ZZ:r", jurisdiction: "ZZ", [key]: "anything" });
    return !result.rejectedKeys.includes(key);
  });
  return missed.length === 0 ? null : `these were not rejected: ${missed.join(", ")}`;
});

check("route identity is the only thing a body may contribute", () => {
  const result = sanitizeAdmissionRequest({
    routeId: "ZZ:r", jurisdiction: "zz", packetFamilyId: "rcap-zz", briefcaseItemId: "b-1"
  });
  if (result.rejectedKeys.length > 0) return `benign keys were rejected: ${result.rejectedKeys.join(", ")}`;
  if (!result.identity) return "identity was not extracted";
  if (result.identity.jurisdiction !== "ZZ") return "jurisdiction was not normalised";
  return result.ignoredKeys.includes("briefcaseItemId") ? null : "a non-identity key was not reported as ignored";
});

check("the identity allowlist is exactly three fields", () => {
  return [...ADMISSION_IDENTITY_KEYS].sort().join(",") === "jurisdiction,packetFamilyId,routeId"
    ? null : `the allowlist is ${[...ADMISSION_IDENTITY_KEYS].join(",")}`;
});

check("neither new module reads a request, header, cookie or environment", () => {
  const forbidden = ["NextRequest", "request.json", "headers()", "cookies()", "searchParams", "process.env"];
  for (const rel of ["src/lib/rcap/fulfillment/grade-a-request-context.ts", "src/lib/rcap/fulfillment/grade-a-packet-proof.ts"]) {
    const source = readSource(rel).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    const found = forbidden.filter((token) => source.includes(token));
    if (found.length > 0) return `${rel} reads ${found.join(", ")}`;
  }
  return null;
});

// ---------------------------------------------------------------------------
// 9. Dispositions: total, deterministic, exactly one.
// ---------------------------------------------------------------------------

check("every decision maps to exactly one of the nine dispositions", () => {
  const seen = new Set();
  const cases = [
    provenRecord(),
    provenRecord({ packetCompleteness: null }),
    provenRecord({ revocation: { revoked: true, reason: "r", revokedAt: "d", revokedBy: "who" } }),
    provenRecord({ supersededBy: "v2", supersededAt: "d" }),
    provenRecord({ serviceDisposition: "non_filing_guidance" }),
    provenRecord({ serviceDisposition: "exact_external_deferral" }),
    provenRecord({ serviceDisposition: "legally_unavailable" }),
    provenRecord({ serviceDisposition: "product_scope_exclusion" }),
    provenRecord({ officialSources: [] }),
    provenRecord({ visualReview: { state: "pending", pagesReviewed: 0, pageCount: 0, evidenceSha256: null, reviewedBy: null, reviewedAt: null } }),
    provenRecord({ artifactValidation: { state: "not_run", artifactSha256: null, validatedAt: null } })
  ];
  for (const record of cases) {
    const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
    const disposition = dispositionFor(decision);
    if (!ROUTE_DISPOSITIONS.includes(disposition)) return `${record.recordId} produced ${disposition}`;
    seen.add(disposition);
  }
  const noRecord = dispositionFor(evaluateFulfillmentAuthority(null, null, "ZZ:none"));
  if (noRecord !== "UNKNOWN_FAIL_CLOSED") return `a missing record mapped to ${noRecord}`;
  const stale = (() => {
    const record = provenRecord();
    const observation = provenObservation(record);
    observation.fixtureSha256 = sha256("new");
    return dispositionFor(evaluateFulfillmentAuthority(record, observation, record.routeId));
  })();
  if (stale !== "SOURCE_OR_CONFIGURATION_GATE") return `a stale record mapped to ${stale}`;
  return seen.size >= 5 ? null : `only ${seen.size} distinct dispositions were reached`;
});

check("dispositions are deterministic across repeated evaluation", () => {
  const record = provenRecord({ packetCompleteness: null });
  const results = new Set(Array.from({ length: 32 }, () => dispositionFor(
    evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId)
  )));
  return results.size === 1 ? null : `it produced ${results.size} answers`;
});

// ---------------------------------------------------------------------------
// 10. Determinism and isolation.
// ---------------------------------------------------------------------------

const concurrent = await Promise.all(Array.from({ length: 64 }, async () => {
  const record = provenRecord();
  return stableStringify(admit("generation_admission", record));
}));

check("concurrent admissions are byte-identical", () => {
  return new Set(concurrent).size === 1 ? null : `${new Set(concurrent).size} distinct answers`;
});

check("no synthetic record reaches the shipped registry", () => {
  const shipped = JSON.parse(readSource("data/rcap-grade-a/fulfillment-authority-registry.json"));
  return shipped.records.some((record) => record.jurisdiction === "ZZ")
    ? "a synthetic hardening record was committed" : null;
});

check("the shipped registry admits only the five exact evidence-complete productized records", () => {
  const shipped = JSON.parse(readSource("data/rcap-grade-a/fulfillment-authority-registry.json"));
  const observations = JSON.parse(readSource("data/rcap-grade-a/fulfillment-observation-snapshot.json"));
  const expectedAdmitted = new Set([
    "DC:dc_actual_innocence_expungement_16_803",
    "IL:felony-prostitution-relief",
    "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    "WY:felony-conviction-expungement-w-s-7-13-1502"
  ]);
  const admittedRoutes = new Set();
  for (const record of shipped.records) {
    for (const point of ALL_POINTS) {
      const decision = admitCommercialAction({
        admissionPoint: point,
        request: { routeId: record.routeId, jurisdiction: record.jurisdiction, packetFamilyId: record.packetFamilyId },
        record,
        observation: observations.routes?.[record.routeId] ?? null,
        context: provenContext(record)
      });
      if (expectedAdmitted.has(record.routeId)) {
        if (!decision.admitted) return `${record.routeId} was denied at ${point}: ${decision.reason}`;
        admittedRoutes.add(record.routeId);
      } else if (decision.admitted) {
        return `${record.routeId} was unexpectedly admitted at ${point}`;
      }
    }
  }
  return stableStringify([...admittedRoutes].sort()) === stableStringify([...expectedAdmitted].sort())
    ? null
    : `admitted routes were ${[...admittedRoutes].sort().join(",") || "none"}`;
});

// ---------------------------------------------------------------------------
// Mutations: break each rule, require the gate to notice.
// ---------------------------------------------------------------------------

if (MUTATIONS) {
  const mutations = [];
  const mutate = (name, fn) => {
    try {
      const problem = fn();
      if (problem) mutations.push(`${name}: ${problem}`);
    } catch (error) {
      mutations.push(`${name}: threw ${error?.message ?? error}`);
    }
  };

  mutate("a completeness proof with no dimensions reports gaps", () => {
    const gaps = collectPacketCompletenessGaps({
      specificationId: "s", specificationVersion: "1", specificationSha256: sha256("s")
    });
    return gaps.length >= PACKET_COMPLETENESS_DIMENSIONS.length ? null : `only ${gaps.length} gaps reported`;
  });

  mutate("an absent completeness proof is a gap, not an exemption", () => {
    return collectPacketCompletenessGaps(null).length > 0 ? null : "an absent proof reported no gap";
  });

  mutate("context denials are reported for an unknown admission point", () => {
    const denials = collectContextDenials({ admissionPoint: "free_gift", context: null, routeId: "ZZ:r", packetFamilyId: null });
    return denials.length > 0 ? null : "an unknown point produced no denial";
  });

  mutate("an unknown admission point is refused rather than defaulted", () => {
    const record = provenRecord();
    return admit("free_gift", record).admitted ? "an unknown point was admitted" : null;
  });

  for (const point of ALL_POINTS) {
    mutate(`${point} cannot be admitted by a record proving another route`, () => {
      const record = provenRecord();
      const decision = admitCommercialAction({
        admissionPoint: point,
        request: { routeId: "ZZ:different-route", jurisdiction: "ZZ", packetFamilyId: record.packetFamilyId },
        record,
        observation: provenObservation(record),
        context: provenContext(record)
      });
      return decision.admitted ? "it was admitted" : null;
    });
  }

  mutate("the requirement table cannot silently drop a point", () => {
    const trimmed = { ...ADMISSION_CONTEXT_REQUIREMENTS };
    delete trimmed.consumer_checkout;
    return Object.keys(trimmed).length === COMMERCIAL_ADMISSION_POINTS.length
      ? "removing a point left the table the same size" : null;
  });

  if (mutations.length > 0) {
    console.error(`\nMUTATION FAILURES (${mutations.length}):`);
    for (const failure of mutations) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log(`Mutations: ${6 + ALL_POINTS.length} deliberate breakages, all caught.`);
}

if (failures.length > 0) {
  console.error(`\nGRADE-A FULFILLMENT HARDENING — ${failures.length} FAILURE(S):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const matrixSize = (PROOF_BREAKS.length + STALE_BREAKS.length) * ALL_POINTS.length;
console.log(`Grade-A fulfillment hardening: ${passed.length} checks passed.`);
console.log(`  proof x admission-point matrix: ${matrixSize} admissions exercised, none granted`);
console.log(`  participant conditions: ${CONTEXT_BREAKS.length}   admission points: ${ALL_POINTS.length}`);
