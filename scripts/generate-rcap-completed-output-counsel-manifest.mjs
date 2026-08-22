#!/usr/bin/env node
// The completed-output legal approval manifest: one row per packet family.
//
// The decision owner has closed this gate. Counsel reviewed and approved the
// completed-output packet families; Roger Roman approved those conclusions and
// the exception annex, and recorded that decision in the repository's existing
// authorization register as auth-2026-08-19-owner-legal-approval-completed-output.
// This manifest therefore records an approval that already exists. It is no
// longer a signable instrument: there is no signature field, no initials field
// and no place to invent signer details, and no generator here decides anything.
// Each row's legalApprovalResult is read from the owner's decision, and a family
// the decision does not name reads back as owner_approval_pending.
//
// The history below is kept because it explains why the gate was open at all.
//
// EXT-ADOPT-01 adopted the LEGAL DESIGN of the packet corpus on 2026-08-08, at
// family level, across 57 families and 45 jurisdictions. It says of itself that
// it "is the legal gate only", and four independent artifacts in this
// repository agree that output review never followed it:
//
//   * every one of the 57 bound families' own packet proofs records
//     counselAdopted=false with completedOutputLegalReview pending;
//   * legal-design-track-registry records legalDesignStatus approved for all
//     497 tracks and legalStatus=legal_review_pending for all 497;
//   * its runtimeDisabledReason is, verbatim, "Output review, visual review and
//     technical proof are all outstanding";
//   * packetReadyCount is 0, and the authority gate takes the hypothetical
//     packet-ready count from 32 to 0.
//
// So the outstanding legal work was never 232 pathway reviews. It was completed
// output review at the packet-family level: one row per family, plus a short
// exception annex for the families and jurisdictions the standing adoption does
// not reach. That is exactly the scope the owner's decision names.
//
// This creates no approval. It reads one.
//
//   node scripts/generate-rcap-completed-output-counsel-manifest.mjs [--check]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OWNER_APPROVED,
  OWNER_PENDING,
  annexJurisdictionStatus,
  familyLegalStatus,
  legalActionStatus,
  readOwnerLegalDecision
} from "./lib/rcap-owner-legal-decision.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT = path.join(rootDir, "data/rcap-ledger/completed-output-counsel-manifest.json");
const MARKDOWN = path.join(rootDir, "docs/RCAP_COMPLETED_OUTPUT_COUNSEL_MANIFEST.md");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const hashOf = (rel) => {
  const abs = path.join(rootDir, rel);
  return fs.existsSync(abs) ? crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex") : null;
};

const ADOPTION = "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json";
const adoption = read(ADOPTION);
const trackRegistry = read("data/record-clearing/legal-design-track-registry.json");
const join = read("data/rcap-ledger/paid-pathway-legal-join.json");

const trackById = new Map((trackRegistry.tracks ?? []).map((t) => [t.trackId, t]));
const supersededFamilies = new Map(
  (adoption.familiesCarryingSupersededTechnicalResult ?? []).map((f) => [f.familyJobId, f])
);

// Which intended-paid pathways each family serves, from the join this manifest
// is generated beside. A family reviewer needs to see what their signature
// unblocks.
const pathwaysByFamily = new Map();
for (const row of join.pathways ?? []) {
  for (const family of row.packetFamilies ?? []) {
    if (!pathwaysByFamily.has(family)) pathwaysByFamily.set(family, []);
    pathwaysByFamily.get(family).push(row.pathwayKey);
  }
}

const ownerDecision = readOwnerLegalDecision();
const decisionRecord = ownerDecision.approved ? ownerDecision.records[0] : null;

const rows = [];
for (const family of adoption.boundFamilies) {
  const proofPath = family.packetProofPath;
  const proof = proofPath && fs.existsSync(path.join(rootDir, proofPath)) ? read(proofPath) : null;
  const tracks = [...new Set((proof?.samplePackets ?? []).map((s) => s.trackId).filter(Boolean))];
  const registryTracks = tracks.map((id) => trackById.get(id)).filter(Boolean);

  rows.push({
    familyId: family.familyJobId,
    jurisdictions: [...new Set([family.jurisdiction, ...registryTracks.map((t) => t.jurisdiction)])].sort(),
    tracksServed: tracks.sort(),
    intendedPaidPathwaysUnblocked: (pathwaysByFamily.get(family.familyJobId) ?? []).sort(),

    adoptedLegalDesignRecord: adoption.recordId,
    adoptedLegalDesignRecordSha256: hashOf(ADOPTION),
    adoptedOn: adoption.adoptedOn,
    legalDesignMemoPath: family.legalDesignMemoPath ?? null,
    legalDesignMemoSha256: family.legalDesignMemoSha256 ?? null,
    legalDesignStatus: [...new Set(registryTracks.map((t) => t.legalDesignStatus))].sort(),

    packetProofPath: proofPath ?? null,
    packetProofSha256: family.packetProofSha256 ?? null,
    currentPacketProofSha256: proofPath ? hashOf(proofPath) : null,
    implementationOutputs: (proof?.implementationOutputs ?? []).map((o) => ({ path: o.path, sha256: o.sha256 })),
    finalizedSampleOutputs: (proof?.samplePackets ?? []).map((s) => ({
      trackId: s.trackId,
      assembledFileName: s.assembledFileName,
      assembledSha256: s.assembledSha256,
      assembledPageCount: s.assembledPageCount
    })),

    technicalReviewResult: proof?.technicalEvidence ?? null,
    visualReviewResult: proof?.visualReview ?? null,
    completedOutputLegalReview: proof?.completedOutputLegalReview ?? null,
    counselAdoptedToday: proof?.counselAdopted ?? null,
    packetReadyToday: proof?.packetReady ?? null,

    substantiveDifferencesFromAdoptedDesign: supersededFamilies.has(family.familyJobId)
      ? [supersededFamilies.get(family.familyJobId).note]
      : [],
    unresolvedLegalQuestions: [...new Set(registryTracks.flatMap((t) => t.openLegalQuestions ?? []))],
    counselConfirmationRequired: [...new Set(registryTracks.flatMap((t) => t.counselQuestions ?? []))],

    // Read from the owner's recorded decision, never decided here. A family the
    // decision does not name reads back pending; there is no signature field to
    // fill and no signer detail to invent.
    legalApprovalResult: familyLegalStatus(ownerDecision, family.familyJobId),
    legalDecisionRecordId: decisionRecord?.recordId ?? null,
    legalDecisionOwner: decisionRecord?.decisionOwner ?? null,
    legalDecisionAuthority: decisionRecord?.authority ?? null,
    legalDecisionEffectiveDate: decisionRecord?.effectiveDate ?? null
  });
}

// The exception annex: what the standing adoption does not reach.
const boundJurisdictions = new Set(adoption.boundFamilies.map((f) => f.jurisdiction));
const allJurisdictions = [...new Set((trackRegistry.tracks ?? []).map((t) => t.jurisdiction))].sort();
//
// Each annex item carries the owner decision's result for it, so a reader never
// has to cross-reference the register by hand to learn whether an exception is
// closed.
const annexLegalActionKeys = [...new Set([
  ...(join.pathways ?? []).filter((p) => p.namedLegalActionRequired).map((p) => p.pathwayKey),
  ...(decisionRecord ? [...ownerDecision.legalActionPathwayKeys] : [])
])].sort();

const exceptions = {
  jurisdictionsOutsideStandingScope: allJurisdictions
    .filter((j) => !boundJurisdictions.has(j))
    .map((jurisdiction) => ({
      jurisdiction,
      legalApprovalResult: annexJurisdictionStatus(ownerDecision, jurisdiction)
    })),
  familiesWithSupersededTechnicalEvidence: [...supersededFamilies.keys()].sort().map((familyId) => ({
    familyId,
    legalApprovalResult: familyLegalStatus(ownerDecision, familyId),
    note: supersededFamilies.get(familyId).note
  })),
  namedLegalActionRequired: annexLegalActionKeys.map((pathwayKey) => ({
    pathwayKey,
    legalApprovalResult: legalActionStatus(ownerDecision, pathwayKey)
  })),
  // Not a legal question. These pathways have no track-to-family bridge in this
  // repository, and an owner decision cannot supply one.
  pathwaysWithNoFamilyBridge: (join.pathways ?? [])
    .filter((p) => String(p.disposition).startsWith("family_bridge_missing"))
    .length
};

const manifest = {
  schemaVersion: "rcap-completed-output-counsel-manifest/v2",
  generatedBy: "scripts/generate-rcap-completed-output-counsel-manifest.mjs",
  instrument: "record of the decision owner's completed-output legal approval",
  reviewUnit: "packet_family",
  createsApproval: false,
  selfApproved: false,
  requiresSignature: false,
  ownerLegalDecision: ownerDecision.approved
    ? {
        approved: true,
        result: ownerDecision.result,
        records: ownerDecision.records,
        annexAdopted: ownerDecision.annexApproved,
        note: "Counsel reviewed and approved these completed-output packet families; the decision owner approved those conclusions and the exception annex, and that instruction is the controlling internal authorization. No signed manifest, uploaded PDF, signature record, initials or separate counsel artifact is required, and none is represented here."
      }
    : { approved: false, reason: ownerDecision.reason },
  standingLegalDesignAdoption: {
    recordId: adoption.recordId,
    adoptedOn: adoption.adoptedOn,
    scopeLevel: adoption.scope.level,
    boundFamilies: adoption.boundFamilies.length,
    boundJurisdictions: [...boundJurisdictions].sort(),
    isLegalGateOnly: true
  },
  whyThisInstrumentExists: [
    "EXT-ADOPT-01 adopted the legal design on 2026-08-08 and says of itself that it is the legal gate only, so completed-output review remained open in the artifacts: all 497 tracks carried legalStatus legal_review_pending, all 57 adopted families recorded counselAdopted=false, and packetReadyCount was 0.",
    "The decision owner has closed that gate directly for these 57 families and for the exception annex, so this file records an approval rather than requesting one.",
    "Approval is recorded at the packet-family level. A pathway using an approved family still needs a public witness, a renderer, a deterministic artifact and a route-to-artifact test — none of which is a legal question."
  ],
  familyRows: rows.length,
  familyRowsApproved: rows.filter((r) => r.legalApprovalResult === OWNER_APPROVED).length,
  familyRowsPending: rows.filter((r) => r.legalApprovalResult === OWNER_PENDING).length,
  exceptions,
  families: rows
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

const annexLine = (result) => (result === OWNER_APPROVED ? "approved" : "**pending**");

const md = [
  "# Completed-output legal approval manifest",
  "",
  `One row per packet family. **${manifest.familyRowsApproved} of ${rows.length}** families are approved; **${manifest.familyRowsPending}** are pending.`,
  "",
  decisionRecord
    ? `Approved by **${decisionRecord.decisionOwner}** on ${decisionRecord.effectiveDate}, recorded as \`${decisionRecord.recordId}\` in \`data/rcap-authorization-queue.json\`. Counsel reviewed and approved these completed outputs; the decision owner approved those conclusions and the exception annex. No signature, signed manifest or separate counsel artifact is required, and this file contains no signature field.`
    : "No approved `owner_legal_decision` entry exists in `data/rcap-authorization-queue.json`, so every row reads back `owner_approval_pending`.",
  "",
  "EXT-ADOPT-01 adopted the legal *design* of this corpus on 2026-08-08 and says of itself that it",
  "\"is the legal gate only\", which is why completed-output review was still open in the artifacts:",
  "every family records `counselAdopted: false`, all 497 tracks carry `legalStatus: legal_review_pending`,",
  "and `packetReadyCount` is 0. The owner's decision closes that gate; those older fields are the",
  "historical record of the design adoption, not a live gate.",
  "",
  "Approval is recorded at the **packet family** level. A pathway using an approved family still needs",
  "a public witness, a renderer, a deterministic artifact and a route-to-artifact test — none of which",
  "is a legal question, and none of which this file answers.",
  "",
  "| family | jurisdictions | tracks | intended-paid pathways unblocked | technical | visual | legal approval |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| \`${r.familyId}\` | ${r.jurisdictions.join(", ")} | ${r.tracksServed.length} | ${r.intendedPaidPathwaysUnblocked.length} | ${r.technicalReviewResult ?? "—"} | ${r.visualReviewResult ?? "—"} | ${r.legalApprovalResult} |`),
  "",
  "## Exception annex",
  "",
  "What the 2026-08-08 standing adoption never reached, and what the owner's decision says about each.",
  "",
  `- Jurisdictions outside EXT-ADOPT-01's exact scope: ${exceptions.jurisdictionsOutsideStandingScope.map((e) => `${e.jurisdiction} (${annexLine(e.legalApprovalResult)})`).join(", ") || "none"}`,
  `- Families with superseded technical evidence: ${exceptions.familiesWithSupersededTechnicalEvidence.map((e) => `\`${e.familyId}\` (${annexLine(e.legalApprovalResult)})`).join(", ") || "none"}`,
  `- Named legal actions: ${exceptions.namedLegalActionRequired.map((e) => `\`${e.pathwayKey}\` (${annexLine(e.legalApprovalResult)})`).join(", ") || "none"}`,
  `- Intended-paid pathways with no packet-family bridge in this repository: ${exceptions.pathwaysWithNoFamilyBridge} — a data gap, not a legal one, and no owner decision can close it.`,
  ""
].join("\n");

if (CHECK) {
  const stale = (fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "") !== serialized
    || (fs.existsSync(MARKDOWN) ? fs.readFileSync(MARKDOWN, "utf8") : "") !== md;
  if (stale) {
    console.error("completed-output counsel manifest is stale; regenerate with node scripts/generate-rcap-completed-output-counsel-manifest.mjs");
    process.exit(1);
  }
  console.log(`completed-output legal approval manifest current — ${manifest.familyRowsApproved}/${rows.length} families approved, ${manifest.familyRowsPending} pending`);
  process.exit(0);
}

fs.writeFileSync(OUT, serialized);
fs.writeFileSync(MARKDOWN, md);
console.log(`Wrote ${path.relative(rootDir, OUT)} and ${path.relative(rootDir, MARKDOWN)}`);
console.log(
  decisionRecord
    ? `${manifest.familyRowsApproved} of ${rows.length} packet families approved by ${decisionRecord.decisionOwner} on ${decisionRecord.effectiveDate} under ${decisionRecord.recordId}; ${manifest.familyRowsPending} pending.`
    : `No owner legal decision is recorded, so all ${rows.length} packet families read back ${OWNER_PENDING}.`
);
const annexPending = [
  ...exceptions.jurisdictionsOutsideStandingScope,
  ...exceptions.familiesWithSupersededTechnicalEvidence,
  ...exceptions.namedLegalActionRequired
].filter((e) => e.legalApprovalResult !== OWNER_APPROVED).length;
console.log(`Exception annex: ${exceptions.jurisdictionsOutsideStandingScope.length} jurisdictions outside the standing scope, ${exceptions.familiesWithSupersededTechnicalEvidence.length} families with superseded technical evidence, ${exceptions.namedLegalActionRequired.length} named legal actions; ${annexPending} annex items still pending.`);
console.log(`${exceptions.pathwaysWithNoFamilyBridge} intended-paid pathways still have no packet-family bridge — a data gap, not a legal one.`);
