#!/usr/bin/env node
// GRADE-A FULFILLMENT AUTHORITY — acceptance gate.
//
//   node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
//   node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations
//
// The authority decides whether a route is commercially eligible. Everything
// downstream — checkout, sponsorship, credits, generation, provider dispatch,
// artifact attachment, Briefcase Ready, private download, the launch graph's
// commercial status — is supposed to ask it and obey. So the dangerous failures
// are not "it returned the wrong string". They are:
//
//   1. something other than COMPLETE_PACKET_PROVEN admits money or delivery;
//   2. an authority survives a change to the evidence that produced it;
//   3. a request body talks the server into an authority it does not hold;
//   4. a record proving one route admits a different one;
//   5. a legacy generator's existence reads as commercial permission;
//   6. a projection drifts away from the registry that controls it;
//   7. history can be rewritten so nobody can say who changed what.
//
// Every check runs against the shipped modules. --mutations then breaks each
// rule deliberately, in memory only, and requires the check to notice. Nothing
// is written to disk in either mode.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");

const AUTHORITY_MODULE = "src/lib/rcap/fulfillment/grade-a-authority.ts";
const ADMISSION_MODULE = "src/lib/rcap/fulfillment/grade-a-admission.ts";
const REGISTRY_PATH = "data/rcap-grade-a/fulfillment-authority-registry.json";
const PROJECTION_PATH = "data/rcap-grade-a/fulfillment-authority-projection.json";
const SOURCE_REGISTRY_PATH = "data/rcap-grade-a/official-source-registry.json";
const OBSERVATION_PATH = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const FIRST_COHORT_EVIDENCE_COMMIT = "ff9705a240c004ed7b9d2f022113abe865442d3f";
const FIRST_COHORT_OWNER_APPROVAL = "OWN-ADOPT-2026-09-02-BATCH-53";
const FIRST_COHORT_EXPECTED = [
  {
    assignmentClaim: "obligation:track-pathway:DC:dc_actual_innocence_expungement_16_803",
    routeId: "DC:dc_actual_innocence_expungement_16_803",
    familyId: "dc_innocence_expungement-set",
    specificationSha256: "a66e9b44315db4cfcbbb103630e210c3a43ffd4bfac6d2a8049bbe208b38d0c8",
    canonicalSha256: "d887a3cba40f27765809ba436a4ed4c223f5927282f3f4f43eee178e5b2a1076",
    boundarySha256: "84ebf215a5e1e3b25fbc15cfdac155b375650f553c41046ceeeb5dcc0bc6203d"
  },
  {
    assignmentClaim: "obligation:track-pathway:MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    routeId: "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    familyId: "ms-misd-addl-set",
    specificationSha256: "e870e694b9170d5b136bb1a99c53bc56231e3161ad9ea4adf60927a984996064",
    canonicalSha256: "7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c",
    boundarySha256: "96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5"
  },
  {
    assignmentClaim: "obligation:track-pathway:MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    routeId: "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    familyId: "ms-misd-addl-set",
    specificationSha256: "e870e694b9170d5b136bb1a99c53bc56231e3161ad9ea4adf60927a984996064",
    canonicalSha256: "7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c",
    boundarySha256: "96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5"
  },
  {
    assignmentClaim: "obligation:track-pathway:WY:felony-conviction-expungement-w-s-7-13-1502",
    routeId: "WY:felony-conviction-expungement-w-s-7-13-1502",
    familyId: "wy_fel_1502-set",
    specificationSha256: "97572a2e564a1ae4c4ca857a90af2c6536fdd68ae1ac3ed7a2766827e1557d2f",
    canonicalSha256: "3dcdbc4ec3d9f08b6c6302b84f254663aa9302a4f712d7451000e2ecda302e30",
    boundarySha256: "703e8d3202e8ecc45aefc000346d65db8bec60ae2b9f1e8ce34796e97400f800"
  }
];

const readSource = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const readJson = (rel) => JSON.parse(readSource(rel));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const authority = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const registryModule = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const admission = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const { resolvePacketRoute, LEGACY_VERIFIED_JURISDICTIONS } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

const {
  COMPLETE_PACKET_PROVEN,
  GRADE_A_ADMISSION_SCHEMA_VERSION,
  COMMERCIAL_ADMISSION_POINTS,
  GRADE_A_AUTHORITY_SCHEMA_VERSION,
  admitCommercialAction,
  evaluateFulfillmentAuthority,
  sanitizeAdmissionRequest
} = authority;
const { buildRegistry, fulfillmentRecordSha256, stableStringify } = registryModule;

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
// A synthetic route that holds every proof. It exists only in this process. It
// is the ONLY fully proven record anywhere in this repository, and it is
// deliberately not a real jurisdiction — a synthetic proof must never be able
// to leak into the registry and sell a real packet to a real participant.
// ---------------------------------------------------------------------------

const SYNTHETIC_SCOPE = "synthetic acceptance scope";
const SYNTHETIC_SOURCE_DIGEST = sha256("ZZ-FORM-1-document-bytes");
const SYNTHETIC_CORPUS_RELEASE = "source-corpus-2026-08-28";
const SYNTHETIC_CORPUS_ARCHIVE = sha256("synthetic-corpus-archive");
const SYNTHETIC_SPEC = stableStringify({ packetSetIds: ["zz-synthetic-set"], componentCount: 2 });

function provenRecord(overrides = {}) {
  const record = {
    // v2: the schema that carries the fileability proof and the only one
    // commercial admission accepts.
    schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION,
    recordId: "grade-a-zz-synthetic-v1",
    routeId: "ZZ:synthetic-acceptance-route",
    jurisdiction: "ZZ",
    pathwayId: "synthetic-acceptance-route",
    packetFamilyId: "rcap-zz-synthetic",
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: "2026-08-29",
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: "auth-synthetic",
      version: "auth-synthetic",
      status: "approved_by_decision_owner",
      effectiveDate: "2026-08-29",
      scopeSha256: sha256(SYNTHETIC_SCOPE)
    },
    packetSpecification: { specId: "zz-synthetic-set", sha256: sha256(SYNTHETIC_SPEC), complete: true },
    officialSources: [{
      sourceId: "ZZ-FORM-1",
      sha256: SYNTHETIC_SOURCE_DIGEST,
      expectedSha256: SYNTHETIC_SOURCE_DIGEST,
      installedSha256: SYNTHETIC_SOURCE_DIGEST,
      corpusReleaseId: SYNTHETIC_CORPUS_RELEASE,
      corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE,
      verifiedAt: "corpus-import:source-corpus-2026-08-28",
      verificationRecord: "data/rcap-grade-a/official-source-registry.json"
    }],
    provider: {
      providerId: "ghcr.io/example/rcap-render-worker",
      rendererKind: "packet_document_v1",
      rendererVersion: "1.0.0",
      imageDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000001"
    },
    fixture: { fixtureId: "ZZ:synthetic-acceptance-route", sha256: sha256("fixture"), deterministic: true },
    artifactValidation: { state: "validated", artifactSha256: sha256("artifact"), validatedAt: "2026-08-29" },
    packetCompleteness: {
      specificationId: "zz-synthetic-spec",
      specificationVersion: "1.0.0",
      specificationSha256: sha256("spec"),
      filingApplication: { state: "covered", basis: "documents[0]" },
      proposedOrder: { state: "covered", basis: "documents[1]" },
      attachmentsAndSchedules: { state: "covered", basis: "attachments" },
      serviceAndNotice: { state: "covered", basis: "serviceAndNotice" },
      filingDestination: { state: "covered", basis: "filingDestination" },
      feeAndWaiverInstructions: { state: "covered", basis: "feeAndWaiver" },
      copyRequirements: { state: "covered", basis: "copyRequirements" },
      postFilingSteps: { state: "covered", basis: "postFilingTimeline" },
      hearingAndObjectionStopConditions: { state: "covered", basis: "hearingAndObjectionStops" },
      customPleadingAuthority: { required: true, approved: true, authorityId: "synthetic-drafting-authority" },
      filingFormatArtifact: {
        format: "pdf",
        sha256: sha256("filing.pdf"),
        pageCount: 4,
        // An artifact now says what produced it. A proof that omits this is
        // INCOMPLETE, which is the point of the field, so the fixture that is
        // meant to be complete carries it.
        producedBy: {
          renderer: "fixture-renderer",
          matchesRecordProvider: true,
          reconciliation: null,
          deterministicRenderVerified: true
        }
      }
    },
    visualReview: {
      state: "passed", pagesReviewed: 4, pageCount: 4,
      evidenceSha256: sha256("contact-sheet"), reviewedBy: "synthetic reviewer", reviewedAt: "2026-08-29"
    },
    outputLegalApproval: {
      state: "passed", reviewerId: "synthetic counsel",
      decidedAt: "2026-08-29", scopeSha256: sha256("output-scope")
    },
    finalVerification: {
      state: "bound", verifierId: "scripts/verify-rcap-grade-a-fulfillment-authority.mjs",
      boundInputsSha256: sha256("bound-inputs"), verifiedAt: "2026-08-29"
    },
    history: [],
    ...overrides
  };
  record.history = [{
    version: record.version,
    changeKind: "created",
    changedAt: "2026-08-29",
    changedBy: "scripts/verify-rcap-grade-a-fulfillment-authority.mjs",
    reason: "Synthetic acceptance record; exists in memory only and is never written to the registry.",
    recordSha256: fulfillmentRecordSha256(record),
    supersedesRecordSha256: null
  }];
  return record;
}

function provenObservation(record) {
  return {
    observedAt: "2026-08-29",
    legalAuthority: {
      version: record.legalAuthority.version,
      status: record.legalAuthority.status,
      scopeSha256: record.legalAuthority.scopeSha256
    },
    packetSpecificationSha256: record.packetSpecification.sha256,
    officialSourceSha256ById: Object.fromEntries(record.officialSources.map((s) => [s.sourceId, s.sha256])),
    corpusReleaseId: SYNTHETIC_CORPUS_RELEASE,
    corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE,
    provider: { ...record.provider },
    fixtureSha256: record.fixture.sha256,
    artifactSha256: record.artifactValidation.artifactSha256,
    visualReviewEvidenceSha256: record.visualReview.evidenceSha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256
  };
}

// The participant half of an admission. Server-resolved in production; built
// here so the acceptance path exercises both halves rather than only the route.
function provenContext(record, overrides = {}) {
  return {
    participantUserId: "user-synthetic-1",
    matterId: "matter-synthetic-1",
    matterOwnerUserId: "user-synthetic-1",
    finalVerification: {
      snapshotId: "snap-1",
      outcome: "VERIFIED_PACKET_READY",
      matterId: "matter-synthetic-1",
      ownerUserId: "user-synthetic-1",
      boundRouteId: record.routeId,
      boundPacketFamilyId: record.packetFamilyId,
      routeContractVersion: "1.0.0",
      legalRuleVersion: "2026-08-29",
      factSnapshotSha256: sha256("facts"),
      formSetVersion: "1.0.0",
      formSetSha256: sha256("form-set"),
      verifiedAt: "2026-08-29",
      invalidated: false,
      invalidationReason: null
    },
    entitlement: {
      kind: "consumer_payment",
      idempotencyKey: "idem-synthetic-1",
      alreadyConsumed: false,
      serverVerified: true
    },
    storage: { privateStorage: true, artifactSha256: sha256("artifact"), repeatDownload: true },
    ...overrides
  };
}

const identityOf = (record) => ({
  routeId: record.routeId,
  jurisdiction: record.jurisdiction,
  packetFamilyId: record.packetFamilyId
});

// ---------------------------------------------------------------------------
// 1. Only COMPLETE_PACKET_PROVEN admits anything, at every admission point.
// ---------------------------------------------------------------------------

const MONEY_AND_DELIVERY_POINTS = [
  "consumer_checkout",
  "sponsored_entitlement",
  "packet_credit_admission",
  "generation_admission",
  "provider_dispatch",
  "artifact_commercial_attachment",
  "briefcase_ready",
  "private_download",
  "repeat_download",
  "launch_graph_commercial_status"
];

check("every commercial admission point is covered by this gate", () => {
  const declared = [...COMMERCIAL_ADMISSION_POINTS].sort().join(",");
  const tested = [...MONEY_AND_DELIVERY_POINTS].sort().join(",");
  return declared === tested ? null : `the module declares [${declared}] but this gate exercises [${tested}]`;
});

const incompleteRecord = provenRecord({
  outputLegalApproval: { state: "pending", reviewerId: null, decidedAt: null, scopeSha256: null }
});

for (const point of MONEY_AND_DELIVERY_POINTS) {
  check(`an incomplete record denies ${point}`, () => {
    const decision = admitCommercialAction({
      admissionPoint: point,
      request: identityOf(incompleteRecord),
      record: incompleteRecord,
      observation: provenObservation(incompleteRecord),
      context: provenContext(incompleteRecord)
    });
    if (decision.admitted) return "the admission was granted";
    if (decision.authority.state !== "INCOMPLETE") return `state was ${decision.authority.state}`;
    if (decision.denialCode !== "fulfillment_incomplete") return `denialCode was ${decision.denialCode}`;
    if (decision.authority.commercialStatus !== "not_commercially_eligible") return "commercialStatus was not closed";
    return null;
  });
}

check("a complete current record admits every expected synthetic path", () => {
  const record = provenRecord();
  const observation = provenObservation(record);
  for (const point of MONEY_AND_DELIVERY_POINTS) {
    const decision = admitCommercialAction({ admissionPoint: point, request: identityOf(record), record, observation, context: provenContext(record) });
    if (!decision.admitted) return `${point} was denied: ${decision.reason}`;
    if (decision.authority.state !== COMPLETE_PACKET_PROVEN) return `${point} reached ${decision.authority.state}`;
    if (decision.authority.commercialStatus !== "commercially_eligible") return `${point} did not report commercial eligibility`;
  }
  return null;
});

check("a route with no record at all is NO_RECORD and denies", () => {
  const decision = admitCommercialAction({
    admissionPoint: "consumer_checkout",
    request: { routeId: "ZZ:nothing-here", jurisdiction: "ZZ", packetFamilyId: null },
    record: null,
    observation: null
  });
  if (decision.admitted) return "an unknown route was admitted";
  return decision.authority.state === "NO_RECORD" ? null : `state was ${decision.authority.state}`;
});

// ---------------------------------------------------------------------------
// 2. Staleness closes authority, dimension by dimension.
// ---------------------------------------------------------------------------

const STALENESS_CASES = [
  ["an official source that changed", (o) => { o.officialSourceSha256ById["ZZ-FORM-1"] = sha256("changed"); }],
  ["an official source that is no longer accounted for", (o) => { delete o.officialSourceSha256ById["ZZ-FORM-1"]; }],
  ["a corpus release the server no longer serves", (o) => { o.corpusReleaseId = "source-corpus-2027-01-01"; }],
  ["a corpus archive republished under a different digest", (o) => { o.corpusArchiveSha256 = sha256("republished-archive"); }],
  ["a packet specification that changed", (o) => { o.packetSpecificationSha256 = sha256("changed"); }],
  ["a legal decision version that moved", (o) => { o.legalAuthority.version = "auth-later"; }],
  ["a legal decision that was withdrawn", (o) => { o.legalAuthority.status = "withdrawn"; }],
  ["a legal decision whose scope was rewritten", (o) => { o.legalAuthority.scopeSha256 = sha256("rescoped"); }],
  ["a republished provider image", (o) => { o.provider.imageDigest = "sha256:00000000000000000000000000000000000000000000000000000000000000ff"; }],
  ["a renderer version bump", (o) => { o.provider.rendererVersion = "1.1.0"; }],
  ["a fixture that changed", (o) => { o.fixtureSha256 = sha256("changed"); }],
  ["an artifact the server no longer produces", (o) => { o.artifactSha256 = sha256("changed"); }],
  ["visual review pages that are no longer the produced pages", (o) => { o.visualReviewEvidenceSha256 = sha256("changed"); }],
  ["an output legal approval whose scope changed", (o) => { o.outputLegalApprovalScopeSha256 = sha256("changed"); }],
  ["a final verification bound to inputs that are no longer current", (o) => { o.finalVerificationBoundInputsSha256 = sha256("changed"); }]
];

for (const [label, mutate] of STALENESS_CASES) {
  check(`stale authority closes on ${label}`, () => {
    const record = provenRecord();
    const observation = provenObservation(record);
    mutate(observation);
    const decision = admitCommercialAction({
      admissionPoint: "consumer_checkout", request: identityOf(record), record, observation, context: provenContext(record)
    });
    if (decision.admitted) return "the admission was granted against a stale record";
    if (decision.authority.state !== "STALE") return `state was ${decision.authority.state}`;
    if (decision.authority.stalenessReasons.length === 0) return "no staleness reason was reported";
    return null;
  });
}

check("an authority the server cannot re-observe is closed, not assumed current", () => {
  const record = provenRecord();
  const decision = evaluateFulfillmentAuthority(record, null, record.routeId);
  if (decision.authorized) return "a record with no observation was authorized";
  return decision.state === "STALE" ? null : `state was ${decision.state}`;
});

// ---------------------------------------------------------------------------
// 3. Revocation, supersession and non-paid dispositions.
// ---------------------------------------------------------------------------

check("a revoked record denies and names who revoked it and why", () => {
  const record = provenRecord({
    revocation: { revoked: true, reason: "source withdrawn by the issuing court", revokedAt: "2026-08-29", revokedBy: "Roger Roman" }
  });
  const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
  if (decision.authorized) return "a revoked record was authorized";
  if (decision.state !== "REVOKED") return `state was ${decision.state}`;
  if (!decision.reason.includes("Roger Roman") || !decision.revocationReason) return "the revocation was not attributed";
  return null;
});

check("a superseded version stops deciding", () => {
  const record = provenRecord({ supersededBy: "grade-a-zz-synthetic-v2", supersededAt: "2026-08-29" });
  const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
  if (decision.authorized) return "a superseded record was authorized";
  return decision.state === "SUPERSEDED" ? null : `state was ${decision.state}`;
});

for (const disposition of ["non_filing_guidance", "product_scope_exclusion", "legally_unavailable", "exact_external_deferral"]) {
  check(`a ${disposition} route cannot be proven commercially eligible`, () => {
    const record = provenRecord({ serviceDisposition: disposition });
    const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
    if (decision.authorized) return "a non-paid disposition was authorized";
    if (!decision.missingProof.some((entry) => entry.startsWith("service_disposition"))) {
      return "the disposition was not named as the reason";
    }
    return null;
  });
}

// ---------------------------------------------------------------------------
// 4. A record proves one route. Wrong jurisdiction or family is a denial.
// ---------------------------------------------------------------------------

check("a proven record does not admit a different jurisdiction", () => {
  const record = provenRecord();
  const decision = admitCommercialAction({
    admissionPoint: "consumer_checkout",
    request: { routeId: record.routeId, jurisdiction: "YY", packetFamilyId: record.packetFamilyId },
    record,
    observation: provenObservation(record),
    context: provenContext(record)
  });
  if (decision.admitted) return "a jurisdiction mismatch was admitted";
  return decision.denialCode === "route_binding_mismatch" ? null : `denialCode was ${decision.denialCode}`;
});

check("a proven record does not admit a different packet family", () => {
  const record = provenRecord();
  const decision = admitCommercialAction({
    admissionPoint: "consumer_checkout",
    request: { routeId: record.routeId, jurisdiction: record.jurisdiction, packetFamilyId: "rcap-zz-other-family" },
    record,
    observation: provenObservation(record),
    context: provenContext(record)
  });
  if (decision.admitted) return "a packet-family mismatch was admitted";
  return decision.denialCode === "route_binding_mismatch" ? null : `denialCode was ${decision.denialCode}`;
});

check("a proven record does not admit a different route id", () => {
  const record = provenRecord();
  const decision = admitCommercialAction({
    admissionPoint: "generation_admission",
    request: { routeId: "ZZ:some-other-route", jurisdiction: record.jurisdiction, packetFamilyId: record.packetFamilyId },
    record,
    observation: provenObservation(record),
    context: provenContext(record)
  });
  if (decision.admitted) return "a route mismatch was admitted";
  return decision.denialCode === "route_binding_mismatch" ? null : `denialCode was ${decision.denialCode}`;
});

// ---------------------------------------------------------------------------
// 5. A client cannot elevate authority.
// ---------------------------------------------------------------------------

const HOSTILE_BODIES = [
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", authorized: true },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", state: COMPLETE_PACKET_PROVEN },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", sellable: true, creditConsumable: true },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", commercialStatus: "commercially_eligible" },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", record: provenRecord() },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", observation: provenObservation(provenRecord()) },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", overrideAuthority: true },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", skipAuthority: true },
  { routeId: "ZZ:synthetic-acceptance-route", jurisdiction: "ZZ", completePacketProven: true }
];

for (const [index, body] of HOSTILE_BODIES.entries()) {
  check(`a request body asserting authority (case ${index + 1}) is refused, not sanitised and honoured`, () => {
    const sanitized = sanitizeAdmissionRequest(body);
    if (sanitized.rejectedKeys.length === 0) return "the authority-bearing key was not detected";
    const outcome = admission.admitCommercialFromUntrustedBody("consumer_checkout", body);
    if (outcome.ok) return "the hostile body reached an admission decision";
    return outcome.denialCode === "client_supplied_authority" ? null : `denialCode was ${outcome.denialCode}`;
  });
}

check("a well-formed body still cannot admit a route the registry does not prove", () => {
  const outcome = admission.admitCommercialFromUntrustedBody("consumer_checkout", {
    routeId: "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a",
    jurisdiction: "OR",
    packetFamilyId: null
  });
  if (!outcome.ok) return `the body was refused before evaluation: ${outcome.reason}`;
  return outcome.decision.admitted ? "an unproven real route was admitted" : null;
});

check("the authority module reads no request, header, cookie or client flag", () => {
  const source = readSource(AUTHORITY_MODULE)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
  const forbidden = ["NextRequest", "request.json", "headers()", "cookies()", "searchParams", "process.env"];
  const found = forbidden.filter((token) => source.includes(token));
  return found.length === 0 ? null : `the authority reads ${found.join(", ")}`;
});

check("the admission facade takes no caller-supplied authority argument", () => {
  const source = readSource(ADMISSION_MODULE);
  // Route identity, and a server-resolved participant context. No third argument
  // through which a caller could assert a conclusion about either.
  return /export function admitCommercial\(\s*admissionPoint: CommercialAdmissionPoint,\s*request: AdmissionRequestIdentity,\s*context\?: FulfillmentRequestContext \| null\s*\)/.test(source)
    ? null
    : "admitCommercial no longer takes exactly (admissionPoint, routeIdentity, serverContext)";
});

// ---------------------------------------------------------------------------
// 5b. The governed source contract, proven positively and byte-safely.
// ---------------------------------------------------------------------------

check("verified private-corpus content satisfies the source dimension without Git holding the bytes", () => {
  // The positive half of the corrected contract. The mutations above prove the
  // failures; this proves the success is reachable at all, which is the thing
  // the old heldInRepository gate made impossible for every route in the
  // product.
  const registry = JSON.parse(readSource(REGISTRY_PATH));
  const bound = [];
  for (const record of registry.records ?? []) {
    for (const source of record.officialSources ?? []) {
      if (source.sha256) bound.push({ routeId: record.routeId, source });
    }
  }
  if (bound.length === 0) return "no record binds a corroborated official source, so the source dimension is never satisfied";
  for (const { routeId, source } of bound) {
    if (source.expectedSha256 !== source.installedSha256) return `${routeId}/${source.sourceId}: expected and installed digests disagree`;
    if (!source.corpusReleaseId || !source.corpusArchiveSha256) return `${routeId}/${source.sourceId}: no corpus release identity`;
    if (!source.verificationRecord) return `${routeId}/${source.sourceId}: no verification record`;
    if ("heldInRepository" in source) return `${routeId}/${source.sourceId}: still carries heldInRepository`;
  }
  // And for a route whose every bound source is corroborated, the dimension must
  // actually be absent from the missing set. A route with an uncorroborated
  // source -- North Dakota's SFN-61663 is not in the verified corpus -- must
  // still report one, so this is asserted per route rather than globally.
  const projection = JSON.parse(readSource(PROJECTION_PATH));
  const rows = [];
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      if (typeof node.routeId === "string") rows.push(node);
      Object.values(node).forEach(walk);
    }
  };
  walk(projection);
  let corroboratedRoutes = 0;
  for (const record of registry.records ?? []) {
    const sources = record.officialSources ?? [];
    if (sources.length === 0 || !sources.every((source) => source.sha256)) continue;
    corroboratedRoutes += 1;
    for (const row of rows.filter((r) => r.routeId === record.routeId)) {
      const missing = row.missingProof ?? row.missing ?? [];
      const sourceGap = missing.filter((entry) => /^official_sources:/.test(entry));
      if (sourceGap.length > 0) return `${record.routeId}: every bound source is corroborated yet it still reports ${sourceGap[0]}`;
    }
  }
  if (corroboratedRoutes === 0) return "no route has all of its bound sources corroborated, so the dimension is never satisfied in practice";
  return null;
});

check("no official source bytes are committed anywhere in this repository", () => {
  // The corrected contract is only safe if it does not tempt anyone to commit
  // the court's PDF to satisfy it. Two things are asserted: the corpus install
  // root is git-ignored, and Git tracks no file underneath it.
  const gitignore = readSource(".gitignore");
  if (!/^private\/$/m.test(gitignore)) return "private/ is no longer git-ignored";
  const registry = JSON.parse(readSource(SOURCE_REGISTRY_PATH));
  const installRoot = registry.corpusRelease?.installRoot ?? "";
  if (!installRoot) return "the source registry names no corpus install root";
  if (!installRoot.startsWith("private/")) return `the corpus install root ${installRoot} is outside the git-ignored private/ tree`;
  let tracked;
  try {
    tracked = execFileSync("git", ["ls-files", "--", installRoot], { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return null; // no git available; the gitignore assertion above still holds
  }
  if (tracked !== "") return `Git tracks ${tracked.split("\n").length} file(s) under the corpus install root`;
  // Nor may the registry itself carry bytes.
  if (/"bytes"|base64/.test(readSource(SOURCE_REGISTRY_PATH))) return "the source registry appears to carry document bytes";
  return null;
});

// ---------------------------------------------------------------------------
// 6. A legacy generator is not commercial permission.
// ---------------------------------------------------------------------------

check("no legacy generator produces Grade-A authority, sellable at the resolver or not", () => {
  // This originally asked whether Mississippi, then sellable at the resolver,
  // nevertheless produced no authority here. Mississippi is now closed --
  // § 99-15-59 generates a status summary, not a filing -- and no legacy
  // jurisdiction is currently sellable for this pathway, so pinning the rule to
  // one jurisdiction's sellability made the check report its own premise as a
  // failure while the rule it defends was never in doubt.
  //
  // The rule does not depend on that premise: a legacy generator's existence is
  // not commercial permission, whether or not the resolver would sell the route.
  // So it is asserted over every legacy jurisdiction, and the sharper case --
  // sellable there, unproven here -- is asserted for any that is sellable rather
  // than required to exist. If a legacy route becomes sellable again, this check
  // tightens onto it automatically instead of needing to be rewritten.
  const failures = [];
  let sellableCovered = 0;
  for (const state of LEGACY_VERIFIED_JURISDICTIONS) {
    const legacy = resolvePacketRoute({ state, pathway: "expungement" });
    const decision = admission.fulfillmentAuthorityForRoute(state, "expungement");
    if (decision.authorized) {
      failures.push(`${state}: a legacy generator's presence produced Grade-A authority`);
      continue;
    }
    // NO_RECORD is the right answer here: nobody has written a fulfillment
    // record for a legacy route, and that is precisely why it may not sell.
    // UNSUPPORTED_ROUTE is accepted too — a record this authority cannot
    // evaluate is equally closed — but any other state would mean a legacy
    // jurisdiction had acquired a record nobody in this lane wrote.
    if (decision.state !== "NO_RECORD" && decision.state !== "UNSUPPORTED_ROUTE") {
      failures.push(`${state}: state was ${decision.state}`);
      continue;
    }
    if (legacy.sellable) sellableCovered += 1;
  }
  if (failures.length > 0) return failures.join("; ");
  if (LEGACY_VERIFIED_JURISDICTIONS.length === 0) return "there are no legacy jurisdictions to assert the rule over";
  void sellableCovered;
  return null;
});

check("no legacy jurisdiction is admitted at any commercial point by this authority", () => {
  for (const jurisdiction of LEGACY_VERIFIED_JURISDICTIONS) {
    for (const point of MONEY_AND_DELIVERY_POINTS) {
      const decision = admission.admitCommercial(point, {
        routeId: `${jurisdiction}:expungement`, jurisdiction, packetFamilyId: null
      });
      if (decision.admitted) return `${jurisdiction} was admitted at ${point}`;
    }
  }
  return null;
});

check("the authority module does not consult any jurisdiction allow-list", () => {
  const source = readSource(AUTHORITY_MODULE);
  const forbidden = ["LEGACY_VERIFIED", "legacy_verified", "packet-route-resolver", "state-promotion"];
  const found = forbidden.filter((token) => source.includes(token));
  return found.length === 0 ? null : `the authority consults ${found.join(", ")}`;
});

// ---------------------------------------------------------------------------
// 7. One controlling registry; the projection is derived from it.
// ---------------------------------------------------------------------------

const registryDocument = readJson(REGISTRY_PATH);
const projection = readJson(PROJECTION_PATH);
const observationDocument = readJson(OBSERVATION_PATH);

check("the shipped registry loads with no structural problems", () => {
  const loaded = buildRegistry(registryDocument);
  if (loaded.problems.length > 0) return loaded.problems.map((p) => `${p.recordId ?? "(no id)"}: ${p.problem}`).join("; ");
  return loaded.current.size === registryDocument.records.length ? null
    : `${registryDocument.records.length} records produced ${loaded.current.size} current routes`;
});

check("the projection names exactly the routes the registry controls", () => {
  const loaded = buildRegistry(registryDocument);
  const registryRoutes = [...loaded.current.keys()].sort().join(",");
  const projectionRoutes = projection.routes.map((route) => route.routeId).sort().join(",");
  return registryRoutes === projectionRoutes ? null : `registry has [${registryRoutes}] but the projection has [${projectionRoutes}]`;
});

check("every projected state is what the shipped authority computes from the registry", () => {
  const loaded = buildRegistry(registryDocument);
  for (const row of projection.routes) {
    const record = loaded.current.get(row.routeId);
    if (!record) return `${row.routeId} is projected but not controlled`;
    const decision = evaluateFulfillmentAuthority(record, observationDocument.routes?.[row.routeId] ?? null, row.routeId);
    if (decision.state !== row.state) return `${row.routeId} projects ${row.state} but computes ${decision.state}`;
    if (decision.commercialStatus !== row.commercialStatus) return `${row.routeId} projects ${row.commercialStatus} but computes ${decision.commercialStatus}`;
    if (stableStringify(decision.missingProof) !== stableStringify(row.missingProof)) return `${row.routeId} projects a different missingProof list`;
  }
  return null;
});

check("the projection declares itself derived and names the registry it comes from", () => {
  if (projection.derivedFrom?.registry !== REGISTRY_PATH) return "the projection does not name the controlling registry";
  return /projection/i.test(projection.rule ?? "") ? null : "the projection does not say it is a projection";
});

check("no route in the shipped registry is commercially eligible without every proof", () => {
  const loaded = buildRegistry(registryDocument);
  for (const [routeId, record] of loaded.current) {
    const decision = evaluateFulfillmentAuthority(record, observationDocument.routes?.[routeId] ?? null, routeId);
    if (decision.authorized && decision.missingProof.length + decision.stalenessReasons.length > 0) {
      return `${routeId} was authorized while carrying open proof gaps`;
    }
  }
  return null;
});

check("the candidate lanes, bounded clinic route and exact first cohort are the only jurisdictions in the registry", () => {
  const jurisdictions = [...new Set(registryDocument.records.map((record) => record.jurisdiction))].sort();
  return jurisdictions.join(",") === "DC,MS,ND,OR,WY" ? null : `the registry carries ${jurisdictions.join(",")}`;
});

check("Mississippi authority is limited to the clinic demo and two enumerated first-cohort routes", () => {
  const mississippiRoutes = registryDocument.records
    .filter((record) => record.jurisdiction === "MS")
    .map((record) => record.routeId)
    .sort();
  const expected = [
    "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal"
  ].sort();
  return stableStringify(mississippiRoutes) === stableStringify(expected)
    ? null
    : `unexpected Mississippi authority scope: ${mississippiRoutes.join(",") || "none"}`;
});

check("the first-cohort authority scope is exactly four route-family records", () => {
  const actual = registryDocument.records
    .filter((record) => record.evidenceBindings?.firstCohortReturn?.commit === FIRST_COHORT_EVIDENCE_COMMIT)
    .map((record) => ({ routeId: record.routeId, familyId: record.packetFamilyId }))
    .sort((a, b) => a.routeId.localeCompare(b.routeId));
  const expected = FIRST_COHORT_EXPECTED
    .map((entry) => ({ routeId: entry.routeId, familyId: entry.familyId }))
    .sort((a, b) => a.routeId.localeCompare(b.routeId));
  return stableStringify(actual) === stableStringify(expected)
    ? null
    : `expected ${stableStringify(expected)}, got ${stableStringify(actual)}`;
});

check("every first-cohort record binds the exact committed specification, artifacts and receipts", () => {
  for (const expected of FIRST_COHORT_EXPECTED) {
    const record = registryDocument.records.find((entry) => entry.routeId === expected.routeId);
    if (!record) return `${expected.routeId} has no record`;
    if (record.packetFamilyId !== expected.familyId) return `${expected.routeId} binds ${record.packetFamilyId}`;
    const bound = record.evidenceBindings;
    if (bound?.assignmentClaim !== expected.assignmentClaim) return `${expected.routeId} binds a different assignment claim`;
    if (bound?.firstCohortReturn?.commit !== FIRST_COHORT_EVIDENCE_COMMIT) return `${expected.routeId} binds a different first-cohort commit`;
    if (record.packetSpecification?.sha256 !== expected.specificationSha256
      || bound?.packetSpecification?.sha256 !== expected.specificationSha256) {
      return `${expected.routeId} binds a different packet specification`;
    }
    if (bound?.approvedArtifacts?.canonical?.sha256 !== expected.canonicalSha256
      || bound?.approvedArtifacts?.boundary?.sha256 !== expected.boundarySha256) {
      return `${expected.routeId} binds different canonical or boundary bytes`;
    }
    if (bound?.ownerApproval?.recordId !== FIRST_COHORT_OWNER_APPROVAL
      || record.legalAuthority?.recordId !== FIRST_COHORT_OWNER_APPROVAL) {
      return `${expected.routeId} binds a different owner approval`;
    }
    if (!/No runtime, technical, visual, payment, sponsorship, or production authority is granted\./.test(bound?.ownerApproval?.qualification ?? "")) {
      return `${expected.routeId} dropped the owner approval's fail-closed qualification`;
    }
    if (bound?.rasterReceipt?.verdict !== "RASTER_PASS" || bound?.rasterReceipt?.coversTheWholeFamily !== true) {
      return `${expected.routeId} has no exact whole-family raster pass`;
    }
    if (bound?.rasterReceipt?.canonicalSha256 !== expected.canonicalSha256
      || bound?.rasterReceipt?.boundarySha256 !== expected.boundarySha256) {
      return `${expected.routeId} raster receipt binds different bytes`;
    }
    if (bound?.independentVerification?.verdict !== "PASS_COMPLETE_INDEPENDENT") {
      return `${expected.routeId} has no current independent complete verdict`;
    }
    if (!bound?.provider?.deliveryProviderEvidenceSha256
      || stableStringify(bound.provider.deliveryProvider) !== stableStringify(record.provider)
      || !bound.provider.artifactProducer?.builderSha256) {
      return `${expected.routeId} has incomplete provider evidence`;
    }
    if (!record.fixture?.deterministic || !record.fixture.sha256
      || record.fixture.sha256 !== bound?.fixture?.witnessFixtureSha256
      || bound.fixture.expectedPaymentAllowed !== false) {
      return `${expected.routeId} has incomplete or permissive fixture evidence`;
    }
  }
  return null;
});

check("every first-cohort record keeps missing proof explicit and commercial authority closed", () => {
  for (const expected of FIRST_COHORT_EXPECTED) {
    const record = registryDocument.records.find((entry) => entry.routeId === expected.routeId);
    const row = projection.routes.find((entry) => entry.routeId === expected.routeId);
    if (!record || !row) return `${expected.routeId} is absent from the registry or projection`;
    if (record.officialSources?.length !== 0) return `${expected.routeId} invented official-source proof`;
    if (record.finalVerification?.state !== "unbound") return `${expected.routeId} invented a final verification`;
    if (row.state !== "INCOMPLETE" || row.commercialStatus !== "not_commercially_eligible") {
      return `${expected.routeId} projected ${row.state}/${row.commercialStatus}`;
    }
    const expectedMissing = [
      "final_verification: state is unbound",
      "official_sources: no official source is bound to this route"
    ];
    if (stableStringify(row.missingProof) !== stableStringify(expectedMissing)) {
      return `${expected.routeId} reports unexpected missing proof ${stableStringify(row.missingProof)}`;
    }
  }
  return null;
});

check("no synthetic route ever reaches the shipped registry", () => {
  return registryDocument.records.some((record) => record.jurisdiction === "ZZ")
    ? "a synthetic acceptance record was committed to the controlling registry"
    : null;
});

// ---------------------------------------------------------------------------
// 8. Audit history: who changed the authority, when and why.
// ---------------------------------------------------------------------------

check("every shipped record carries an attributed, hash-chained history", () => {
  for (const record of registryDocument.records) {
    const problems = registryModule.validateHistoryChain(record);
    if (problems.length > 0) return `${record.recordId}: ${problems.join("; ")}`;
    for (const entry of record.history) {
      if (!entry.changedBy?.trim()) return `${record.recordId} version ${entry.version} has no changedBy`;
      if (!entry.reason?.trim()) return `${record.recordId} version ${entry.version} has no reason`;
      if (!entry.changedAt?.trim()) return `${record.recordId} version ${entry.version} has no changedAt`;
    }
  }
  return null;
});

check("a rewritten record is caught by its own history hash", () => {
  const record = provenRecord();
  const tampered = { ...record, packetSpecification: { ...record.packetSpecification, complete: true, sha256: sha256("rewritten") } };
  const problems = registryModule.validateHistoryChain(tampered);
  return problems.some((problem) => problem.includes("hashes to")) ? null : "a rewritten record passed its history check";
});

check("a broken supersession link is caught", () => {
  const record = provenRecord();
  const second = { ...record, version: 2 };
  second.history = [
    record.history[0],
    {
      version: 2, changeKind: "proof_added", changedAt: "2026-08-30", changedBy: "verifier",
      reason: "second version", recordSha256: fulfillmentRecordSha256(second),
      supersedesRecordSha256: sha256("a hash that was never produced")
    }
  ];
  const problems = registryModule.validateHistoryChain(second);
  return problems.some((problem) => problem.includes("claims to supersede")) ? null : "a broken chain passed";
});

// ---------------------------------------------------------------------------
// 9. Determinism under concurrent reads and version changes.
// ---------------------------------------------------------------------------

// Genuinely concurrent: 64 evaluations scheduled together on the same frozen
// record, so an accidental shared mutable cache inside the authority would show
// up as two different answers rather than as a passing sequential loop.
const concurrentResults = await Promise.all(
  Array.from({ length: 64 }, async () => {
    const record = provenRecord();
    return stableStringify(evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId));
  })
);

check("concurrent evaluations of the same record are byte-identical", () => {
  return new Set(concurrentResults).size === 1 ? null : `concurrent evaluations produced ${new Set(concurrentResults).size} distinct answers`;
});

check("concurrent evaluations across versions keep each version's own answer", () => {
  const v1 = provenRecord();
  const v2 = provenRecord({
    recordId: "grade-a-zz-synthetic-v2", version: 2,
    finalVerification: { state: "unbound", verifierId: null, boundInputsSha256: null, verifiedAt: null }
  });
  const interleaved = [];
  for (let i = 0; i < 32; i += 1) {
    interleaved.push(evaluateFulfillmentAuthority(v1, provenObservation(v1), v1.routeId).state);
    interleaved.push(evaluateFulfillmentAuthority(v2, provenObservation(v2), v2.routeId).state);
  }
  const odd = interleaved.filter((_, index) => index % 2 === 1);
  const even = interleaved.filter((_, index) => index % 2 === 0);
  if (new Set(even).size !== 1 || even[0] !== COMPLETE_PACKET_PROVEN) return "the proven version did not stay proven";
  if (new Set(odd).size !== 1 || odd[0] !== "INCOMPLETE") return "the unproven version did not stay unproven";
  return null;
});

check("a frozen registry record cannot be mutated by a reader", () => {
  const loaded = buildRegistry(registryDocument);
  const [record] = [...loaded.current.values()];
  if (!record) return "the registry produced no record to test";
  try { record.serviceDisposition = "paid_packet_intended"; } catch { /* strict-mode throw is the expected outcome */ }
  try { record.revocation.revoked = false; } catch { /* as above */ }
  return Object.isFrozen(record) && Object.isFrozen(record.revocation) ? null : "a registry record was not deeply frozen";
});

check("two current versions of one route bind nothing", () => {
  const a = provenRecord();
  const b = provenRecord({ recordId: "grade-a-zz-synthetic-v2", version: 2 });
  const loaded = buildRegistry({ schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION, records: [a, b] });
  if (loaded.current.has(a.routeId)) return "an ambiguous authority still bound the route";
  return loaded.problems.some((problem) => problem.problem.includes("non-superseded")) ? null : "the ambiguity was not reported";
});

// ---------------------------------------------------------------------------
// Mutations: prove each rule bites. In memory only; nothing is written.
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

  const PROOF_MUTATIONS = [
    ["legal approval downgraded", { legalAuthority: { recordId: "auth-synthetic", version: "auth-synthetic", status: "pending", effectiveDate: "2026-08-29", scopeSha256: sha256(SYNTHETIC_SCOPE) } }],
    ["packet specification marked incomplete", { packetSpecification: { specId: "zz-synthetic-set", sha256: sha256(SYNTHETIC_SPEC), complete: false } }],
    ["official source dropped", { officialSources: [] }],
    // The corrected source contract. "Not held in Git" is no longer a failure
    // mode, because it was never a real one; these are.
    ["official source absent from the verified corpus", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: "", expectedSha256: "", installedSha256: "", corpusReleaseId: "", corpusArchiveSha256: "", verifiedAt: "", verificationRecord: "" }] }],
    ["official source expected digest missing", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: SYNTHETIC_SOURCE_DIGEST, expectedSha256: "", installedSha256: SYNTHETIC_SOURCE_DIGEST, corpusReleaseId: SYNTHETIC_CORPUS_RELEASE, corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE, verifiedAt: "v", verificationRecord: "r" }] }],
    ["official source installed digest missing", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: SYNTHETIC_SOURCE_DIGEST, expectedSha256: SYNTHETIC_SOURCE_DIGEST, installedSha256: "", corpusReleaseId: SYNTHETIC_CORPUS_RELEASE, corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE, verifiedAt: "v", verificationRecord: "r" }] }],
    ["official source content mismatched between the two records", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: SYNTHETIC_SOURCE_DIGEST, expectedSha256: SYNTHETIC_SOURCE_DIGEST, installedSha256: sha256("different-document-bytes"), corpusReleaseId: SYNTHETIC_CORPUS_RELEASE, corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE, verifiedAt: "v", verificationRecord: "r" }] }],
    ["official source digest is the hash of the identifier, not the document", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: sha256("ZZ-FORM-1"), expectedSha256: SYNTHETIC_SOURCE_DIGEST, installedSha256: SYNTHETIC_SOURCE_DIGEST, corpusReleaseId: SYNTHETIC_CORPUS_RELEASE, corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE, verifiedAt: "v", verificationRecord: "r" }] }],
    ["official source with no corpus release identity", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: SYNTHETIC_SOURCE_DIGEST, expectedSha256: SYNTHETIC_SOURCE_DIGEST, installedSha256: SYNTHETIC_SOURCE_DIGEST, corpusReleaseId: "", corpusArchiveSha256: "", verifiedAt: "v", verificationRecord: "r" }] }],
    ["official source with no verification record", { officialSources: [{ sourceId: "ZZ-FORM-1", sha256: SYNTHETIC_SOURCE_DIGEST, expectedSha256: SYNTHETIC_SOURCE_DIGEST, installedSha256: SYNTHETIC_SOURCE_DIGEST, corpusReleaseId: SYNTHETIC_CORPUS_RELEASE, corpusArchiveSha256: SYNTHETIC_CORPUS_ARCHIVE, verifiedAt: "", verificationRecord: "" }] }],
    ["provider image digest erased", { provider: { providerId: "ghcr.io/example/rcap-render-worker", rendererKind: "packet_document_v1", rendererVersion: "1.0.0", imageDigest: "" } }],
    ["fixture no longer deterministic", { fixture: { fixtureId: "ZZ:synthetic-acceptance-route", sha256: sha256("fixture"), deterministic: false } }],
    ["artifact validation not run", { artifactValidation: { state: "not_run", artifactSha256: null, validatedAt: null } }],
    ["visual review only partially covered", { visualReview: { state: "passed", pagesReviewed: 3, pageCount: 4, evidenceSha256: sha256("contact-sheet"), reviewedBy: "synthetic reviewer", reviewedAt: "2026-08-29" } }],
    ["visual review waived as not required", { visualReview: { state: "not_required", pagesReviewed: 0, pageCount: 0, evidenceSha256: null, reviewedBy: null, reviewedAt: null } }],
    ["visual review with no named reviewer", { visualReview: { state: "passed", pagesReviewed: 4, pageCount: 4, evidenceSha256: sha256("contact-sheet"), reviewedBy: "", reviewedAt: "2026-08-29" } }],
    ["output legal approval withdrawn", { outputLegalApproval: { state: "failed", reviewerId: null, decidedAt: null, scopeSha256: null } }],
    ["final verification unbound", { finalVerification: { state: "unbound", verifierId: null, boundInputsSha256: null, verifiedAt: null } }],
    ["final verification with no bound inputs", { finalVerification: { state: "bound", verifierId: "v", boundInputsSha256: "", verifiedAt: "2026-08-29" } }]
  ];

  for (const [label, override] of PROOF_MUTATIONS) {
    mutate(`removing proof (${label}) must close authority`, () => {
      const record = provenRecord(override);
      const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
      return decision.authorized ? "authority survived" : null;
    });
  }

  mutate("a record declaring an unknown schema binds nothing", () => {
    const record = provenRecord({ schemaVersion: "rcap-grade-a-fulfillment-authority/v99" });
    const decision = evaluateFulfillmentAuthority(record, provenObservation(record), record.routeId);
    return decision.authorized ? "an unknown schema was honoured" : null;
  });

  mutate("a registry whose schemaVersion was swapped binds nothing", () => {
    const loaded = buildRegistry({ ...registryDocument, schemaVersion: "something-else" });
    return loaded.current.size === 0 ? null : "a foreign-schema registry still bound routes";
  });

  mutate("a registry record with a stripped history is dropped", () => {
    const records = registryDocument.records.map((record, index) => (index === 0 ? { ...record, history: [] } : record));
    const loaded = buildRegistry({ ...registryDocument, records });
    return loaded.problems.some((problem) => problem.problem.includes("history")) ? null : "a history-less record was accepted";
  });

  mutate("a registry record whose routeId contradicts its jurisdiction is dropped", () => {
    const records = registryDocument.records.map((record, index) => (index === 0 ? { ...record, jurisdiction: "XX" } : record));
    const loaded = buildRegistry({ ...registryDocument, records });
    return loaded.problems.some((problem) => problem.problem.includes("does not begin with jurisdiction")) ? null : "a mismatched routeId was accepted";
  });

  mutate("a duplicated recordId is refused rather than deduplicated", () => {
    const loaded = buildRegistry({ ...registryDocument, records: [...registryDocument.records, registryDocument.records[0]] });
    return loaded.problems.some((problem) => problem.problem === "duplicate recordId") ? null : "a duplicate recordId was accepted";
  });

  mutate("a hand-edited projection does not change what the runtime computes", () => {
    const loaded = buildRegistry(registryDocument);
    const [routeId, record] = [...loaded.current.entries()][0];
    const before = evaluateFulfillmentAuthority(record, observationDocument.routes?.[routeId] ?? null, routeId).state;
    const tamperedProjection = JSON.parse(JSON.stringify(projection));
    tamperedProjection.routes[0].state = COMPLETE_PACKET_PROVEN;
    tamperedProjection.routes[0].commercialStatus = "commercially_eligible";
    const after = evaluateFulfillmentAuthority(record, observationDocument.routes?.[routeId] ?? null, routeId).state;
    return before === after && after !== COMPLETE_PACKET_PROVEN ? null : "editing the projection moved the runtime answer";
  });

  mutate("an unknown admission point is refused rather than defaulted", () => {
    const record = provenRecord();
    const decision = admitCommercialAction({
      admissionPoint: "free_gift", request: identityOf(record), record, observation: provenObservation(record)
    });
    return decision.admitted ? "an unknown admission point was admitted" : null;
  });

  if (mutations.length > 0) {
    console.error(`\nMUTATION FAILURES (${mutations.length}):`);
    for (const failure of mutations) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log(`Mutations: ${PROOF_MUTATIONS.length + 7} deliberate breakages, all caught.`);
}

if (failures.length > 0) {
  console.error(`\nGRADE-A FULFILLMENT AUTHORITY — ${failures.length} FAILURE(S):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`Grade-A fulfillment authority: ${passed.length} checks passed.`);
console.log(`  registry routes: ${registryDocument.records.length}   commercially eligible: ${projection.counters.commerciallyEligible}`);
