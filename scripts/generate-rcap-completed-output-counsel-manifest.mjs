#!/usr/bin/env node
// The completed-output counsel adoption manifest: one row per packet family.
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
// So the outstanding legal work is not 232 pathway reviews. It is completed
// output review at the packet-family level, and this generates the instrument
// for it: one signable row per family, plus a short exception annex for the
// families and jurisdictions the standing adoption does not reach.
//
// This creates no approval. Every disposition field is empty for a human to
// fill.
//
//   node scripts/generate-rcap-completed-output-counsel-manifest.mjs [--check]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

    // Left empty on purpose. A generator does not decide these.
    reviewerDisposition: "",
    reviewerInitials: "",
    reviewerDate: "",
    reviewerNote: ""
  });
}

// The exception annex: what the standing adoption does not reach.
const boundJurisdictions = new Set(adoption.boundFamilies.map((f) => f.jurisdiction));
const allJurisdictions = [...new Set((trackRegistry.tracks ?? []).map((t) => t.jurisdiction))].sort();
const exceptions = {
  jurisdictionsOutsideStandingScope: allJurisdictions.filter((j) => !boundJurisdictions.has(j)),
  familiesWithSupersededTechnicalEvidence: [...supersededFamilies.keys()].sort(),
  namedLegalActionRequired: (join.pathways ?? [])
    .filter((p) => p.disposition === "legal_action_required")
    .map((p) => ({ pathwayKey: p.pathwayKey, statement: p.statement })),
  pathwaysWithNoFamilyBridge: (join.pathways ?? [])
    .filter((p) => String(p.disposition).startsWith("family_bridge_missing"))
    .length
};

const manifest = {
  schemaVersion: "rcap-completed-output-counsel-manifest/v1",
  generatedBy: "scripts/generate-rcap-completed-output-counsel-manifest.mjs",
  instrument: "supplemental completed-output adoption",
  reviewUnit: "packet_family",
  createsApproval: false,
  selfApproved: false,
  standingLegalDesignAdoption: {
    recordId: adoption.recordId,
    adoptedOn: adoption.adoptedOn,
    scopeLevel: adoption.scope.level,
    boundFamilies: adoption.boundFamilies.length,
    boundJurisdictions: [...boundJurisdictions].sort(),
    isLegalGateOnly: true
  },
  whyThisInstrumentExists: [
    "All 497 tracks carry legalDesignStatus approved and legalStatus legal_review_pending.",
    "All 57 adopted families record counselAdopted=false with completed-output legal review pending.",
    "packetReadyCount is 0 and the Master Library authority gate takes the hypothetical packet-ready count from 32 to 0.",
    "Counsel reviews the packet family once. Every pathway using an approved family still needs an automated public witness and a route-to-artifact test, but not a duplicate human review of the same document family."
  ],
  familyRowsAwaitingReview: rows.length,
  familyRowsApproved: rows.filter((r) => r.reviewerDisposition === "approve").length,
  exceptions,
  families: rows
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

const md = [
  "# Completed-output counsel adoption manifest",
  "",
  `One row per packet family. **${rows.length} families** await completed-output review; **${manifest.familyRowsApproved}** are approved.`,
  "",
  "EXT-ADOPT-01 adopted the legal *design* of this corpus on 2026-08-08 and says of itself that it",
  "\"is the legal gate only\". Output review never followed it: every one of these families records",
  "`counselAdopted: false` with completed-output legal review pending, all 497 tracks carry",
  "`legalStatus: legal_review_pending`, and `packetReadyCount` is 0.",
  "",
  "Counsel reviews at the **packet family** level. A pathway using an approved family still needs an",
  "automated public witness and a route-to-artifact test — it does not need a second human review of",
  "the same document family.",
  "",
  "Fill `reviewerDisposition` (`approve` / `hold` / `not_applicable`), `reviewerInitials` and",
  "`reviewerDate` in `data/rcap-ledger/completed-output-counsel-manifest.json`. Nothing here is",
  "self-approved and no generator may fill them.",
  "",
  "| family | jurisdictions | tracks | intended-paid pathways unblocked | technical | visual | disposition |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| \`${r.familyId}\` | ${r.jurisdictions.join(", ")} | ${r.tracksServed.length} | ${r.intendedPaidPathwaysUnblocked.length} | ${r.technicalReviewResult ?? "—"} | ${r.visualReviewResult ?? "—"} | ${r.reviewerDisposition || "_(awaiting)_"} |`),
  "",
  "## Exception annex",
  "",
  `- Jurisdictions outside EXT-ADOPT-01's exact scope: ${exceptions.jurisdictionsOutsideStandingScope.join(", ") || "none"}`,
  `- Families with superseded technical evidence: ${exceptions.familiesWithSupersededTechnicalEvidence.join(", ") || "none"}`,
  `- Named legal actions required: ${exceptions.namedLegalActionRequired.length}`,
  `- Intended-paid pathways with no packet-family bridge in this repository: ${exceptions.pathwaysWithNoFamilyBridge}`,
  ""
].join("\n");

if (CHECK) {
  const stale = (fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "") !== serialized
    || (fs.existsSync(MARKDOWN) ? fs.readFileSync(MARKDOWN, "utf8") : "") !== md;
  if (stale) {
    console.error("completed-output counsel manifest is stale; regenerate with node scripts/generate-rcap-completed-output-counsel-manifest.mjs");
    process.exit(1);
  }
  console.log(`completed-output counsel manifest current — ${rows.length} family rows, ${manifest.familyRowsApproved} approved`);
  process.exit(0);
}

fs.writeFileSync(OUT, serialized);
fs.writeFileSync(MARKDOWN, md);
console.log(`Wrote ${path.relative(rootDir, OUT)} and ${path.relative(rootDir, MARKDOWN)}`);
console.log(`${rows.length} packet families await completed-output counsel review; ${manifest.familyRowsApproved} approved.`);
console.log(`Exception annex: ${exceptions.jurisdictionsOutsideStandingScope.length} jurisdictions outside scope, ${exceptions.familiesWithSupersededTechnicalEvidence.length} families with superseded technical evidence, ${exceptions.namedLegalActionRequired.length} named legal actions.`);
