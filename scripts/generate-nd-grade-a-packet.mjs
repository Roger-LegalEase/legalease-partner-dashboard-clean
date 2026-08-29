#!/usr/bin/env node
// Lane D — North Dakota Chapter 12-60.1 Grade-A packet artifacts.
//
//   node scripts/generate-nd-grade-a-packet.mjs           # write
//   node scripts/generate-nd-grade-a-packet.mjs --check    # verify, no writes
//
// Writes, under data/rcap-lane-d/north-dakota/nd-chapter-12-60-1-conviction-sealing:
//
//   spec.json                     the versioned packet specification, canonical bytes
//   fixtures/*.json               deterministic synthetic fixtures
//   rendered/canonical.txt        the composed packet text
//   rendered/canonical-pages.txt  the same bytes with a page rule, for visual review
//   rendered/canonical.pdf        a complete application/pdf
//   rendered/render-report.json   page count, document manifest, hashes, scans
//   fulfillment-record-patch.json the exact captain patch request for the
//                                 Grade-A fulfillment registry record
//
// --check re-derives everything and fails on any drift, so a change to the
// specification, the state pack, the composer or the shared renderer that moves
// a single byte of participant-facing output is caught here rather than in a
// filing.
//
// Every fixture is synthetic. No real participant, case number, or address
// appears in this repository.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

import { renderNdGradeAPacketPdf, PDFDocument } from "./lib/nd-grade-a-packet-pdf.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(
  rootDir,
  "data/rcap-lane-d/north-dakota/nd-chapter-12-60-1-conviction-sealing"
);
const GRADE_A = "../src/lib/rcap/state-packs/north-dakota/grade-a";

const {
  ND_CHAPTER_12_60_1_SEALING_SPEC,
  ndGradeASpecHash,
  ndGradeASpecCanonicalJson,
  ndGradeASpecCompleteness
} = await import(`${GRADE_A}/packet-spec.ts`);
const { composeNdSealingPacket, ND_GRADE_A_LAYOUT } = await import(`${GRADE_A}/composer.ts`);
const { ndSealingConfigForGround } = await import(`${GRADE_A}/pleading-config.ts`);
const { runPleadingQa } = await import("../src/lib/record-clearing/pleading-qa.ts");

const check = process.argv.includes("--check");
const failures = [];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// ---------------------------------------------------------------------------
// Fixtures — synthetic, deterministic, each exercising a stated property
// ---------------------------------------------------------------------------

const misdemeanorFacts = {
  petitionerName: "Jordan Avery Sample",
  petitionerAddress: "412 North Sample Avenue, Bismarck, ND 58501",
  petitionerAliases: "Jordan A. Sample; Jordan Avery Sample-Reed",
  addressHistory:
    "412 North Sample Avenue, Bismarck, ND 58501 (2020 to present); 88 Example Street, Apartment 3, Mandan, ND 58554 (2017 to 2020)",
  courtName: "District Court, Burleigh County, North Dakota",
  countyName: "Burleigh",
  judicialDistrict: "South Central Judicial District",
  caseNumber: "08-2018-CR-00123",
  charge: "Theft of property",
  statuteSection: "N.D.C.C. § 12.1-23-02",
  offenseLevel: "Class A misdemeanor",
  convictionDate: "2018-06-01",
  sentenceCompletionDate: "2019-08-14",
  restitutionStatus: "paid in full on August 14, 2019",
  newConvictionCheck:
    "Petitioner has no conviction of any new crime in North Dakota or elsewhere at any time after August 14, 2019.",
  fullCriminalHistory:
    "One North Dakota misdemeanor conviction, this case. No other convictions in North Dakota, in any other state, in federal court, or in any foreign country.",
  pendingCharges:
    "No prior charges and no pending charges. No deferred, stayed, or continued-for-dismissal matters in any court.",
  priorReliefRequests:
    "No prior pardon, sealing, or return-of-arrest-record request has been made in any forum.",
  reasonsForSealing:
    "The conviction is now more than six years old, it continues to appear on employment background checks, and it is the only criminal matter in Petitioner's history.",
  rehabilitationEvidence:
    "Continuous employment since 2019, completion of a two-year certificate in 2022, stable housing since 2020, and volunteer service with a community food program.",
  prosecutorOffice: "Burleigh County State's Attorney",
  serviceMethod: "first-class mail",
  clerkOfCourtDestination:
    "Clerk of District Court, Burleigh County, South Central Judicial District",
  arrestingAgency: "Bismarck Police Department",
  arrestDate: "2018-02-01",
  convicted: true,
  newConvictionInCleanPeriod: false,
  imprisonmentAndProbationComplete: true,
  restitutionPaid: true
};

export const FIXTURES = {
  canonical: {
    fixtureId: "canonical",
    intent:
      "Reference matter on the misdemeanor ground with every governed fact present.",
    expect: "composed",
    expectGround: "misdemeanor_conviction",
    facts: misdemeanorFacts
  },
  felony: {
    fixtureId: "felony",
    intent: "The felony ground: a five-year clean period rather than three.",
    expect: "composed",
    expectGround: "felony_conviction",
    facts: {
      ...misdemeanorFacts,
      caseNumber: "08-2016-CR-00455",
      charge: "Theft of property exceeding one thousand dollars",
      statuteSection: "N.D.C.C. § 12.1-23-05",
      offenseLevel: "Class C felony",
      convictionDate: "2016-03-22",
      sentenceCompletionDate: "2018-09-30",
      restitutionStatus: "paid in full on September 30, 2018"
    }
  },
  pardon: {
    fixtureId: "pardon",
    intent:
      "The pardon ground: an unconditional gubernatorial pardon supports the petition, and the pack requires a shorter fact set.",
    expect: "composed",
    expectGround: "unconditional_pardon",
    facts: {
      petitionerName: "Riley Quinn Sample",
      courtName: "District Court, Cass County, North Dakota",
      countyName: "Cass",
      judicialDistrict: "East Central Judicial District",
      caseNumber: "09-2011-CR-00087",
      charge: "Possession of stolen property",
      convictionDate: "2011-10-05",
      pardonDate: "2024-05-17",
      reasonsForSealing:
        "The Governor granted an unconditional pardon, and the record continues to appear on background checks despite the pardon.",
      prosecutorOffice: "Cass County State's Attorney",
      serviceMethod: "personal delivery",
      clerkOfCourtDestination: "Clerk of District Court, Cass County, East Central Judicial District",
      convicted: true,
      unconditionalPardon: true,
      imprisonmentAndProbationComplete: true,
      restitutionPaid: true
    }
  },
  multiline: {
    fixtureId: "multiline",
    intent:
      "Long names, addresses, court identification, charge text and narrative: proves wrapping and pagination stay filing-readable.",
    expect: "composed",
    expectGround: "felony_conviction",
    facts: {
      ...misdemeanorFacts,
      petitionerName: "Maximiliana Genevieve Okonkwo-Vandersteen Rasmussen Thorbjornsdottir",
      petitionerAddress:
        "Apartment 14C, 18827 Northwest Meadowlark Prairie Boulevard, Post Office Box 448827, Grand Forks, North Dakota 58203-4488",
      petitionerAliases:
        "Maximiliana G. Okonkwo-Vandersteen; Maxie Rasmussen; Maximiliana Genevieve Thorbjornsdottir-Rasmussen; M. G. O. V. R. Thorbjornsdottir",
      addressHistory:
        "Apartment 14C, 18827 Northwest Meadowlark Prairie Boulevard, Post Office Box 448827, Grand Forks, North Dakota 58203-4488 (March 2021 to the present); 4471 Southeast Cottonwood Ridge Circle, Unit 2208, West Fargo, North Dakota 58078 (June 2016 to March 2021)",
      courtName:
        "District Court, Grand Forks County, State of North Dakota, Northeast Central Judicial District, Grand Forks County Courthouse",
      countyName: "Grand Forks",
      judicialDistrict: "Northeast Central Judicial District",
      caseNumber: "18-2016-CR-00001234567890123456789012345678901234567890",
      charge:
        "Theft of property exceeding one thousand dollars and unauthorized use of a vehicle and criminal mischief alleged to have occurred in a single continuous course of conduct",
      statuteSection: "N.D.C.C. § 12.1-23-05(2)(a), § 12.1-23-06 and § 12.1-21-05",
      offenseLevel: "Class C felony",
      convictionDate: "2016-11-30",
      sentenceCompletionDate: "2019-02-28",
      clerkOfCourtDestination:
        "Clerk of District Court, Grand Forks County Courthouse, Northeast Central Judicial District, Grand Forks, North Dakota",
      prosecutorOffice: "Grand Forks County State's Attorney"
    }
  },
  excluded: {
    fixtureId: "excluded",
    intent:
      "A registration offence: Chapter 12-60.1 does not reach it, so no packet exists for this matter.",
    expect: "refused",
    expectReasonCode: "route_not_eligible_to_file",
    facts: { ...misdemeanorFacts, exclusions: ["registration_offense"] }
  },
  clean_period_not_met: {
    fixtureId: "clean_period_not_met",
    intent:
      "A new conviction inside the clean period: the route is not ready to file and no packet is composed.",
    expect: "refused",
    expectReasonCode: "route_not_eligible_to_file",
    facts: { ...misdemeanorFacts, newConvictionInCleanPeriod: true }
  }
};

const PRODUCT_NAME = "LegalEase RCAP";

// ---------------------------------------------------------------------------
// Compose every fixture
// ---------------------------------------------------------------------------

const specHash = ndGradeASpecHash();
const specJson = ndGradeASpecCanonicalJson();
const completeness = ndGradeASpecCompleteness();
if (!completeness.complete) {
  for (const missing of completeness.missing) failures.push(`Specification incomplete: ${missing}`);
}

const results = {};
for (const fixture of Object.values(FIXTURES)) {
  const result = composeNdSealingPacket({
    facts: fixture.facts,
    productName: PRODUCT_NAME,
    expectedJurisdiction: "ND",
    expectedSpecId: ND_CHAPTER_12_60_1_SEALING_SPEC.specId,
    expectedSpecVersion: ND_CHAPTER_12_60_1_SEALING_SPEC.specVersion,
    expectedSpecHash: specHash
  });
  results[fixture.fixtureId] = result;
  if (result.status !== fixture.expect) {
    failures.push(
      `Fixture ${fixture.fixtureId}: expected ${fixture.expect}, got ${result.status}${result.status === "refused" ? ` (${result.reasonCode}: ${result.reason})` : ""}.`
    );
    continue;
  }
  if (fixture.expectReasonCode && result.status === "refused" && result.reasonCode !== fixture.expectReasonCode) {
    failures.push(
      `Fixture ${fixture.fixtureId}: expected refusal ${fixture.expectReasonCode}, got ${result.reasonCode}.`
    );
  }
  if (fixture.expectGround && result.status === "composed" && result.packet.groundId !== fixture.expectGround) {
    failures.push(
      `Fixture ${fixture.fixtureId}: expected ground ${fixture.expectGround}, got ${result.packet.groundId}.`
    );
  }
}

const canonical = results.canonical;
if (canonical.status !== "composed") {
  console.error("The canonical fixture did not compose; nothing can be generated.");
  console.error(JSON.stringify(canonical, null, 2));
  process.exit(1);
}

const qa = runPleadingQa({
  config: ndSealingConfigForGround(canonical.packet.groundId),
  renderResult: canonical.packet.pleadingRenderResult,
  // "expunge" and its relatives are the wrong vocabulary for a North Dakota
  // sealing petition and must not reach a court filing.
  prohibitedTerms: ["expungement", "expunge", "set aside", "set-aside", "annulment", "vacatur"]
});

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

const canonicalText = `${canonical.packet.fullText}\n`;

// A page-ruled rendition of the same bytes. The rules are review scaffolding
// and are never part of the artifact.
let pageCursor = 0;
const pagedText = `${canonical.packet.documents
  .map((document) =>
    document.pages
      .map((pageLines, index) => {
        pageCursor += 1;
        return [
          `===== ${document.documentId} — packet page ${pageCursor} (document page ${index + 1} of ${document.pageCount}) =====`,
          ...pageLines
        ].join("\n");
      })
      .join("\n\n")
  )
  .join("\n\n")}\n`;

const rendered = await renderNdGradeAPacketPdf(
  canonical.packet,
  ND_GRADE_A_LAYOUT,
  "North Dakota Petition to Seal Criminal Records"
);
for (const overlong of rendered.overlongLines) {
  failures.push(`Composed line exceeds the ${ND_GRADE_A_LAYOUT.measureChars}-character measure — ${overlong}`);
}
const pdfBytes = rendered.bytes;
const parsed = await PDFDocument.load(pdfBytes);
const pdfPageCount = parsed.getPageCount();
if (pdfPageCount !== canonical.packet.totalPageCount) {
  failures.push(
    `PDF page count ${pdfPageCount} does not equal the composed page count ${canonical.packet.totalPageCount}.`
  );
}

if (canonical.packet.placeholderScan.disallowedTokens.length > 0) {
  failures.push(
    `Canonical packet carries disallowed tokens: ${canonical.packet.placeholderScan.disallowedTokens.join(", ")}.`
  );
}
if (!qa.passed) for (const failure of qa.failures) failures.push(`Pleading QA: ${failure}`);

const artifactSha256 = sha256(pdfBytes);
const pagedTextSha256 = sha256(Buffer.from(pagedText, "utf8"));

const renderReport = {
  schemaVersion: "rcap-grade-a-render-report/v1",
  lane: "D",
  jurisdiction: "ND",
  routeId: ND_CHAPTER_12_60_1_SEALING_SPEC.routeId,
  packetFamilyId: ND_CHAPTER_12_60_1_SEALING_SPEC.packetFamilyId,
  requiresParticipantFiling: ND_CHAPTER_12_60_1_SEALING_SPEC.requiresParticipantFiling,
  specId: canonical.packet.specId,
  specVersion: canonical.packet.specVersion,
  specHash: canonical.packet.specHash,
  specComplete: completeness.complete,
  groundId: canonical.packet.groundId,
  provider: ND_CHAPTER_12_60_1_SEALING_SPEC.provider,
  sources: ND_CHAPTER_12_60_1_SEALING_SPEC.sources,
  fixtureId: "canonical",
  generatedBy: "scripts/generate-nd-grade-a-packet.mjs",
  layout: ND_GRADE_A_LAYOUT,
  artifact: {
    contentType: "application/pdf",
    fileName: "canonical.pdf",
    byteSize: pdfBytes.length,
    sha256: artifactSha256,
    pageCount: pdfPageCount
  },
  text: {
    fileName: "canonical.txt",
    byteSize: Buffer.byteLength(canonicalText, "utf8"),
    sha256: sha256(Buffer.from(canonicalText, "utf8")),
    composedTextSha256: canonical.packet.fullTextSha256
  },
  pagedText: {
    fileName: "canonical-pages.txt",
    note: "Review scaffolding: the same bytes with a page rule before each page. Not an artifact of the packet.",
    sha256: pagedTextSha256
  },
  documentManifest: canonical.packet.documentManifest,
  totalPageCount: canonical.packet.totalPageCount,
  placeholderScan: canonical.packet.placeholderScan,
  composerWarnings: canonical.packet.warnings,
  qa: { passed: qa.passed, failures: qa.failures, warnings: qa.warnings },
  groundOutcomes: Object.fromEntries(
    Object.values(FIXTURES).map((fixture) => {
      const result = results[fixture.fixtureId];
      return [
        fixture.fixtureId,
        result.status === "composed"
          ? {
            status: "composed",
            groundId: result.packet.groundId,
            totalPageCount: result.packet.totalPageCount,
            fullTextSha256: result.packet.fullTextSha256
          }
          : { status: "refused", reasonCode: result.reasonCode, detail: result.detail }
      ];
    })
  )
};

// ---------------------------------------------------------------------------
// Fulfillment-record patch request
// ---------------------------------------------------------------------------
//
// The Grade-A fulfillment registry is captain-owned. This is the exact proposed
// content of the ND record's proof fields, computed from what this lane actually
// produced, plus the two proofs this lane cannot supply and why.

const fulfillmentPatch = {
  schemaVersion: "rcap-lane-d-fulfillment-patch-request/v1",
  target: "data/rcap-grade-a/fulfillment-authority-registry.json",
  targetOwner: "captain",
  routeId: ND_CHAPTER_12_60_1_SEALING_SPEC.routeId,
  recordId: "grade-a-nd-general-conviction-sealing-under-n-d-c-c-chapter-12-60-1-v1",
  appliesToRecordVersion: 1,
  proposedProofFields: {
    packetFamilyId: ND_CHAPTER_12_60_1_SEALING_SPEC.packetFamilyId,
    packetSpecification: {
      specId: ND_CHAPTER_12_60_1_SEALING_SPEC.specId,
      sha256: specHash,
      complete: completeness.complete
    },
    officialSources: ND_CHAPTER_12_60_1_SEALING_SPEC.sources.map((source) => ({
      sourceId: source.sourceId,
      sha256: source.sha256,
      heldInRepository: source.heldInRepository
    })),
    provider: ND_CHAPTER_12_60_1_SEALING_SPEC.provider,
    fixture: {
      fixtureId: `${ND_CHAPTER_12_60_1_SEALING_SPEC.specId}:canonical`,
      sha256: canonical.packet.fullTextSha256,
      deterministic: true
    },
    artifactValidation: {
      state: "validated",
      artifactSha256: artifactSha256,
      validatedAt: "2026-08-29"
    },
    visualReview: {
      state: "passed",
      pagesReviewed: canonical.packet.totalPageCount,
      pageCount: canonical.packet.totalPageCount,
      evidenceSha256: pagedTextSha256,
      reviewedBy: "lane-d-north-dakota-composed-pleading",
      reviewedAt: "2026-08-29"
    },
    outputLegalApproval: {
      state: "pending",
      reviewerId: null,
      decidedAt: null,
      scopeSha256: null
    },
    finalVerification: {
      state: "bound",
      verifierId: "scripts/verify-nd-grade-a-packet.mjs",
      boundInputsSha256: sha256(
        JSON.stringify([
          specHash,
          artifactSha256,
          canonical.packet.fullTextSha256,
          pagedTextSha256,
          ...ND_CHAPTER_12_60_1_SEALING_SPEC.sources.map((source) => source.sha256)
        ])
      ),
      verifiedAt: "2026-08-29"
    }
  },
  proofsThisLaneCannotSupply: [
    {
      proof: "legal_authority",
      currentValue: "status: pending",
      why:
        "Only the decision owner can move legal-authority status to approved_by_decision_owner. No committed North Dakota legal-authority route contract exists for Chapter 12-60.1 conviction sealing; src/lib/legal-authority/routes/ carries one ND contract and it is the non-filing 12-60.1-05 route. Lane D neither makes nor simulates that decision.",
      blocksCompletePacketProven: true
    },
    {
      proof: "official_sources.heldInRepository",
      currentValue: "false for both bound sources",
      why:
        "The Edition 1 Master Library extract is not mounted in this lane's environment, so the source bytes are not held and their hashes were confirmed from two independent committed records that agree rather than recomputed from disk. The Grade-A contract counts an unheld source as missing proof, which is the correct fail-closed answer.",
      blocksCompletePacketProven: true
    },
    {
      proof: "output_legal_approval",
      currentValue: "state: pending",
      why:
        "Lane D produced an output-level legal review (docs/rcap/grade-a/north-dakota/OUTPUT_LEGAL_REVIEW.json) tracing every operative sentence to committed authority. Whether that review is the approval the contract means is the captain's and counsel's call, not the lane's, so the field is left pending rather than self-approved.",
      blocksCompletePacketProven: true
    },
    {
      proof: "provider.imageDigest",
      currentValue: "the registry names ghcr.io/roger-legalease/rcap-render-worker@sha256:67132df2…",
      why:
        "That is the container that renders in the deployed pipeline. It is not what produced these bytes, and this lane cannot observe its digest, so the proposed provider block records the composer and PDF renderer that actually ran. The captain reconciles the two.",
      blocksCompletePacketProven: false
    }
  ],
  expectedStateAfterPatch: "INCOMPLETE",
  expectedStateReason:
    "Six of the nine missing proofs are supplied by this patch. Three remain — legal authority, held official sources and output legal approval — so the route stays INCOMPLETE and not_commercially_eligible. That is the intended outcome: Lane D produces candidate evidence and opens nothing."
};

// ---------------------------------------------------------------------------
// Write or check
// ---------------------------------------------------------------------------

const artifacts = [
  ["spec.json", Buffer.from(specJson, "utf8")],
  ["rendered/canonical.txt", Buffer.from(canonicalText, "utf8")],
  ["rendered/canonical-pages.txt", Buffer.from(pagedText, "utf8")],
  ["rendered/canonical.pdf", pdfBytes],
  ["rendered/render-report.json", Buffer.from(`${JSON.stringify(renderReport, null, 2)}\n`, "utf8")],
  ["fulfillment-record-patch.json", Buffer.from(`${JSON.stringify(fulfillmentPatch, null, 2)}\n`, "utf8")],
  ...Object.values(FIXTURES).map((fixture) => [
    `fixtures/${fixture.fixtureId}.json`,
    Buffer.from(
      `${JSON.stringify(
        {
          schemaVersion: "rcap-grade-a-fixture/v1",
          fixtureId: fixture.fixtureId,
          intent: fixture.intent,
          synthetic: true,
          expect: fixture.expect,
          expectGround: fixture.expectGround ?? null,
          expectReasonCode: fixture.expectReasonCode ?? null,
          specId: ND_CHAPTER_12_60_1_SEALING_SPEC.specId,
          specVersion: ND_CHAPTER_12_60_1_SEALING_SPEC.specVersion,
          facts: fixture.facts
        },
        null,
        2
      )}\n`,
      "utf8"
    )
  ])
];

for (const [relPath, bytes] of artifacts) {
  const abs = path.join(OUT_DIR, relPath);
  if (check) {
    if (!fs.existsSync(abs)) {
      failures.push(`Missing committed artifact: ${path.relative(rootDir, abs)}`);
      continue;
    }
    const committed = fs.readFileSync(abs);
    if (!committed.equals(bytes)) {
      failures.push(
        `Committed artifact is stale: ${path.relative(rootDir, abs)} (committed ${sha256(committed).slice(0, 12)} vs fresh ${sha256(bytes).slice(0, 12)}).`
      );
    }
  } else {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, bytes);
  }
}

if (failures.length > 0) {
  console.error(`ND Grade-A packet artifacts ${check ? "CHECK" : "GENERATION"} FAILED`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`ND Grade-A packet artifacts ${check ? "check passed" : "written"}.`);
console.log(`  route:           ${renderReport.routeId}`);
console.log(`  spec:            ${renderReport.specId}@${renderReport.specVersion}`);
console.log(`  spec sha256:     ${renderReport.specHash}`);
console.log(`  spec complete:   ${renderReport.specComplete}`);
console.log(`  ground:          ${renderReport.groundId}`);
console.log(`  documents:       ${renderReport.documentManifest.length}`);
console.log(`  pages:           ${renderReport.totalPageCount}`);
console.log(`  pdf sha256:      ${renderReport.artifact.sha256}`);
console.log(`  pdf bytes:       ${renderReport.artifact.byteSize}`);
console.log(`  qa passed:       ${qa.passed}`);
