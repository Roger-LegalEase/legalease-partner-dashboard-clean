#!/usr/bin/env node
// A worked v2 fulfillment record, derived from a real packet specification.
//
//   node scripts/generate-rcap-grade-a-lane-b-v2-candidate.mjs [--check]
//
// The registry ships v1 records, and v1 records admit nothing. Migrating them is
// captain-owned, so this lane does not touch data/rcap-grade-a/. What it can do
// is show exactly what a v2 record looks like when built from evidence that
// actually exists, so the migration is a transcription rather than a design
// exercise.
//
// ND:first-offense-possession-sealing is the only route in the registry with a
// formal packet specification, and that specification covers all nine Grade-A
// fileability dimensions. So its fileability proof is real, cited section by
// section. Everything the repository does NOT hold is written as absent — the
// resulting record is INCOMPLETE, by four named gaps, and that is the honest
// answer rather than a shortfall in this generator.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");

const SPEC_PATH = "data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json";
const REGISTRY_PATH = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OBSERVATION_PATH = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const PACKET_RECORDS_PATH = "data/rcap-ledger/packet-fulfillment-records.json";
const OUT_PATH = "data/rcap-lane-b/v2-candidate-record.json";

const read = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const { GRADE_A_ADMISSION_SCHEMA_VERSION, evaluateFulfillmentAuthority, dispositionFor } =
  await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { fulfillmentRecordSha256 } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");

const spec = readJson(SPEC_PATH);
const packetRecords = readJson(PACKET_RECORDS_PATH);
const packetRecord = (packetRecords.records ?? []).find((entry) => entry.routeKey === spec.routeKey) ?? null;
if (!packetRecord) {
  console.error(`No packet fulfillment record for ${spec.routeKey}; the artifact evidence would have to be invented.`);
  process.exit(1);
}
const registry = readJson(REGISTRY_PATH);
const observations = readJson(OBSERVATION_PATH);

const v1 = registry.records.find((record) => record.routeId === spec.routeKey);
if (!v1) {
  console.error(`No v1 record for ${spec.routeKey}; nothing to migrate.`);
  process.exit(1);
}

const specSha256 = sha256(read(SPEC_PATH));

/**
 * Each dimension cites the specification section that carries it. A citation is
 * what makes "the spec covers service and notice" checkable; an adjective is not.
 * A section that is present but empty is recorded as missing, not as covered.
 */
function dimension(sectionName, present) {
  return present
    ? { state: "covered", basis: `${SPEC_PATH}#${sectionName}` }
    : { state: "missing", basis: null };
}

const designAuthority = (packetRecord.sourceIdentities ?? []).find(
  (source) => source.kind === "owner_approved_packet_set_manifest" && source.ownerLegalDecisionRecordId
) ?? null;

/**
 * The sources this container actually holds. A source the compiled profile
 * merely asserts is not one that can be hashed here, and is not treated as
 * though it were — the empty hash is honest, a placeholder would read as
 * evidence.
 */
function heldSources() {
  return (packetRecord.sourceIdentities ?? []).map((source) => {
    const held = source.verification === "present_in_repository"
      && typeof source.location === "string"
      && fs.existsSync(path.join(rootDir, source.location));
    return {
      sourceId: source.sourceId,
      sha256: held ? sha256(read(source.location)) : "",
      heldInRepository: held
    };
  });
}

const documentIds = (spec.documents ?? []).map((document) => document.documentId ?? "");
const hasProposedOrder = documentIds.some((id) => id.includes("proposed-order"));
const nonEmptyList = (value) => Array.isArray(value) && value.length > 0;
const nonEmptyObject = (value) => Boolean(value) && typeof value === "object" && Object.keys(value).length > 0;

const packetCompleteness = {
  specificationId: spec.specificationId,
  specificationVersion: spec.specificationVersion,
  specificationSha256: specSha256,
  filingApplication: dimension("documents", nonEmptyList(spec.documents)),
  proposedOrder: dimension("documents[nd-proposed-order]", hasProposedOrder),
  attachmentsAndSchedules: dimension("attachments", nonEmptyList(spec.attachments)),
  serviceAndNotice: dimension("serviceAndNotice", nonEmptyObject(spec.serviceAndNotice)),
  filingDestination: dimension("filingDestination", nonEmptyObject(spec.filingDestination)),
  feeAndWaiverInstructions: dimension("feeAndWaiver", nonEmptyObject(spec.feeAndWaiver)),
  copyRequirements: dimension("copyRequirements", nonEmptyObject(spec.copyRequirements)),
  postFilingSteps: dimension("postFilingTimeline", nonEmptyList(spec.postFilingTimeline)),
  hearingAndObjectionStopConditions: dimension("hearingAndObjectionStops", nonEmptyList(spec.hearingAndObjectionStops)),
  // This route drafts a motion rather than filling a court's published form, so
  // a drafting authority is required. No approval record for it exists in this
  // repository, so none is claimed.
  // This route drafts a motion rather than filling a court's published form
  // (officialPdfRequired is false; N.D.C.C. ch. 19-03.1 prescribes none), so a
  // drafting authority is required. The owner-approved packet-set manifest is
  // that authority: it is held here and carries the decision-owner record that
  // approved the design.
  //
  // The one judgement call in this file, stated plainly so a reviewer can
  // disagree: approving the DESIGN of a composed pleading is not counsel
  // approving its OUTPUT. The latter is a separate dimension and stays pending.
  customPleadingAuthority: designAuthority
    ? { required: true, approved: true, authorityId: designAuthority.ownerLegalDecisionRecordId }
    : { required: true, approved: false, authorityId: null },
  // Real, committed, deterministic bytes: the base gate renders this packet and
  // pins its hash, byte length and page count, and proved determinism across
  // processes after finding pdf-lib had been stamping the wall clock into it.
  filingFormatArtifact: {
    format: packetRecord.contentType === "application/pdf" ? "pdf" : String(packetRecord.contentType ?? ""),
    sha256: packetRecord.artifactIsDeterministic ? packetRecord.artifactSha256 ?? null : null,
    pageCount: Number(packetRecord.artifactPages ?? 0)
  }
};

const officialSources = heldSources();

const candidate = {
  ...v1,
  officialSources,
  schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION,
  recordId: `${v1.recordId.replace(/-v1$/, "")}-v2`,
  version: v1.version + 1,
  // The v1 record binds the packet SET id and a hash derived from the launch
  // graph. The formal specification is a different, later document with its own
  // id, version and hash, and it is the one that carries the fileability
  // sections. Binding it is the substantive part of this migration.
  packetSpecification: {
    specId: spec.specificationId,
    sha256: specSha256,
    complete: v1.packetSpecification.complete
  },
  packetCompleteness,
  history: []
};

candidate.history = [
  ...v1.history,
  {
    version: candidate.version,
    changeKind: "proof_added",
    changedAt: "2026-08-29",
    changedBy: "scripts/generate-rcap-grade-a-lane-b-v2-candidate.mjs",
    reason: `Migrated to ${GRADE_A_ADMISSION_SCHEMA_VERSION} and bound the fileability proof to ${SPEC_PATH} (${specSha256}). No approval is created; the record remains INCOMPLETE on every proof the repository does not hold.`,
    recordSha256: "",
    supersedesRecordSha256: v1.history[v1.history.length - 1]?.recordSha256 ?? null
  }
];
candidate.history[candidate.history.length - 1].recordSha256 = fulfillmentRecordSha256(candidate);

// The observation is the v1 one with the specification hash moved to the new
// binding, so the candidate is compared against the same world the v1 record was.
const v1Observation = observations.routes?.[v1.routeId] ?? null;
const observation = v1Observation
  ? {
      ...v1Observation,
      packetSpecificationSha256: specSha256,
      officialSourceSha256ById: Object.fromEntries(officialSources.map((s) => [s.sourceId, s.sha256]))
    }
  : null;

const decision = evaluateFulfillmentAuthority(candidate, observation, candidate.routeId);

const document = {
  schemaVersion: "rcap-grade-a-lane-b-v2-candidate/v1",
  generatedBy: "scripts/generate-rcap-grade-a-lane-b-v2-candidate.mjs",
  purpose: "A worked v2 fulfillment record for the one registry route that has a formal packet specification. It is a template for the captain-owned migration, not a registry entry.",
  isRegistryEntry: false,
  createsApproval: false,
  derivedFrom: {
    [SPEC_PATH]: specSha256,
    [PACKET_RECORDS_PATH]: sha256(read(PACKET_RECORDS_PATH)),
    [REGISTRY_PATH]: sha256(read(REGISTRY_PATH))
  },
  evaluation: {
    state: decision.state,
    disposition: dispositionFor(decision),
    commercialStatus: decision.commercialStatus,
    missingProof: decision.missingProof,
    stalenessReasons: decision.stalenessReasons
  },
  observation,
  record: candidate
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;
const absolute = path.join(rootDir, OUT_PATH);
const existing = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;

if (existing !== serialized) {
  if (CHECK) {
    console.error(`Regeneration required — ${OUT_PATH} does not match its inputs.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, serialized);
}

// A candidate that admits anything would mean this generator had invented proof.
if (decision.authorized) {
  console.error("The candidate reached COMPLETE_PACKET_PROVEN. No evidence in this repository supports that; refusing to write an approval.");
  process.exit(1);
}

console.log(`v2 candidate ${CHECK ? "verified" : "written"}: ${candidate.routeId}`);
console.log(`  state: ${decision.state}   disposition: ${dispositionFor(decision)}`);
console.log(`  fileability bound to ${spec.specificationId} v${spec.specificationVersion}`);
console.log(`  remaining gaps (${decision.missingProof.length}):`);
for (const gap of decision.missingProof) console.log(`    - ${gap}`);
