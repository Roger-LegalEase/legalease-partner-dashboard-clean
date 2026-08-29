#!/usr/bin/env node
// Lane D — North Dakota composed-pleading Grade-A reference packet artifacts.
//
//   node scripts/generate-nd-composed-packet-artifacts.mjs           # write
//   node scripts/generate-nd-composed-packet-artifacts.mjs --check    # verify
//
// Writes, under data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition:
//
//   spec.json                    the versioned packet specification, canonical bytes
//   fixtures/*.json              deterministic synthetic fixtures
//   rendered/canonical.txt       the composed packet text
//   rendered/canonical.pdf       a complete application/pdf of the same text
//   rendered/render-report.json  page count, document manifest, hashes, scans
//
// --check re-derives everything and fails on any drift, so a change to the
// specification, the state pack, the composer, or the shared renderer that moves
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
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { renderNdComposedPacketPdf, PDFDocument } from "./lib/nd-composed-packet-pdf.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(
  rootDir,
  "data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition"
);

const {
  ND_NONCONVICTION_PETITION_SPEC,
  ndComposedPacketSpecHash,
  ndComposedPacketSpecCanonicalJson
} = await import("../src/lib/record-clearing/north-dakota-nonconviction-spec.ts");
const { composeNdNonconvictionPacket, ND_PACKET_LAYOUT } = await import(
  "../src/lib/record-clearing/composers/nd-composed-packet-composer.ts"
);
const { runPleadingQa } = await import("../src/lib/record-clearing/pleading-qa.ts");
const { ndNonconvictionClosingConfig } = await import(
  "../src/lib/record-clearing/north-dakota-nonconviction-config.ts"
);

const check = process.argv.includes("--check");
const failures = [];

// ---------------------------------------------------------------------------
// Fixtures — synthetic, deterministic, and each one exercises a stated property
// ---------------------------------------------------------------------------

/**
 * `canonical` is the reference matter. `multiline` is the same matter with
 * values long enough to force wrapping and a page break in every document.
 * `boundary` sits one day before the split (the last day the petition branch
 * applies) and `automatic` sits exactly on it (the first day it does not).
 * `negative` is an excluded case.
 */
export const FIXTURES = {
  canonical: {
    fixtureId: "canonical",
    intent: "Reference matter on the petition branch with every governed fact present.",
    expect: "composed",
    facts: {
      petitionerName: "Jordan Avery Sample",
      petitionerAddress: "412 North Sample Avenue, Bismarck, ND 58501",
      otherNamesUsed: "Jordan A. Sample",
      courtName: "District Court, Burleigh County, North Dakota",
      countyName: "Burleigh",
      judicialDistrict: "South Central Judicial District",
      caseNumber: "08-2019-CR-00742",
      charge: "Criminal trespass",
      nonconvictionOrderDate: "2021-04-12",
      allChargesDismissedOrAcquitted: true,
      clerkOfCourtDestination: "Clerk of District Court, Burleigh County, South Central Judicial District",
      prosecutorOffice: "Burleigh County State's Attorney",
      arrestingAgency: "Bismarck Police Department",
      arrestDate: "2019-09-03"
    }
  },
  multiline: {
    fixtureId: "multiline",
    intent:
      "Long names, addresses, court identification and charge text: proves wrapping and pagination stay filing-readable.",
    expect: "composed",
    facts: {
      petitionerName:
        "Maximiliana Genevieve Okonkwo-Vandersteen Rasmussen Thorbjornsdottir",
      petitionerAddress:
        "Apartment 14C, 18827 Northwest Meadowlark Prairie Boulevard, Post Office Box 448827, Grand Forks, North Dakota 58203-4488",
      otherNamesUsed:
        "Maximiliana G. Okonkwo-Vandersteen; Maxie Rasmussen; Maximiliana Genevieve Thorbjornsdottir-Rasmussen",
      courtName:
        "District Court, Grand Forks County, State of North Dakota, Northeast Central Judicial District, Grand Forks County Courthouse",
      countyName: "Grand Forks",
      judicialDistrict: "Northeast Central Judicial District",
      caseNumber: "18-2018-CR-00001234567890123456789012345678901234567890",
      charge:
        "Criminal trespass in a dwelling and disorderly conduct and preventing arrest and unlawful possession of drug paraphernalia in a manner alleged to have occurred in a single continuous course of conduct",
      nonconvictionOrderDate: "2020-11-30",
      allChargesDismissedOrAcquitted: true,
      clerkOfCourtDestination:
        "Clerk of District Court, Grand Forks County Courthouse, Northeast Central Judicial District, Grand Forks, North Dakota",
      prosecutorOffice: "Grand Forks County State's Attorney",
      arrestingAgency: "Grand Forks County Sheriff's Department",
      arrestDate: "2018-06-17"
    }
  },
  boundary: {
    fixtureId: "boundary",
    intent:
      "The last day the petition branch applies: 2025-07-31, one day before the August 1, 2025 split.",
    expect: "composed",
    facts: {
      petitionerName: "Riley Quinn Sample",
      courtName: "District Court, Cass County, North Dakota",
      countyName: "Cass",
      judicialDistrict: "East Central Judicial District",
      caseNumber: "09-2025-CR-00031",
      charge: "Simple assault",
      nonconvictionOrderDate: "2025-07-31",
      allChargesDismissedOrAcquitted: true,
      clerkOfCourtDestination: "Clerk of District Court, Cass County, East Central Judicial District"
    }
  },
  automatic: {
    fixtureId: "automatic",
    intent:
      "The first day the petition branch does not apply: 2025-08-01. No packet exists for this matter.",
    expect: "refused",
    expectReasonCode: "route_not_composed_packet",
    facts: {
      petitionerName: "Riley Quinn Sample",
      courtName: "District Court, Cass County, North Dakota",
      countyName: "Cass",
      judicialDistrict: "East Central Judicial District",
      caseNumber: "09-2025-CR-00032",
      charge: "Simple assault",
      nonconvictionOrderDate: "2025-08-01",
      allChargesDismissedOrAcquitted: true,
      clerkOfCourtDestination: "Clerk of District Court, Cass County, East Central Judicial District"
    }
  },
  negative: {
    fixtureId: "negative",
    intent: "An excluded case: the dismissal was part of a plea agreement on another offense.",
    expect: "refused",
    expectReasonCode: "route_not_composed_packet",
    facts: {
      petitionerName: "Riley Quinn Sample",
      courtName: "District Court, Cass County, North Dakota",
      countyName: "Cass",
      judicialDistrict: "East Central Judicial District",
      caseNumber: "09-2024-CR-00033",
      charge: "Simple assault",
      nonconvictionOrderDate: "2024-02-02",
      allChargesDismissedOrAcquitted: true,
      clerkOfCourtDestination: "Clerk of District Court, Cass County, East Central Judicial District",
      exclusions: ["dismissal_part_of_plea_agreement"]
    }
  }
};

const PRODUCT_NAME = "LegalEase RCAP";

// ---------------------------------------------------------------------------
// Deterministic PDF
// ---------------------------------------------------------------------------

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const specHash = ndComposedPacketSpecHash();
const specJson = ndComposedPacketSpecCanonicalJson();

const results = {};
for (const fixture of Object.values(FIXTURES)) {
  const result = composeNdNonconvictionPacket({
    facts: fixture.facts,
    productName: PRODUCT_NAME,
    expectedJurisdiction: "ND",
    expectedSpecId: ND_NONCONVICTION_PETITION_SPEC.specId,
    expectedSpecVersion: ND_NONCONVICTION_PETITION_SPEC.specVersion,
    expectedSpecHash: specHash
  });
  results[fixture.fixtureId] = result;
  if (result.status !== fixture.expect) {
    failures.push(
      `Fixture ${fixture.fixtureId}: expected ${fixture.expect}, got ${result.status}${result.status === "refused" ? ` (${result.reasonCode})` : ""}.`
    );
  }
  if (fixture.expectReasonCode && result.status === "refused" && result.reasonCode !== fixture.expectReasonCode) {
    failures.push(
      `Fixture ${fixture.fixtureId}: expected refusal ${fixture.expectReasonCode}, got ${result.reasonCode}.`
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
  config: ndNonconvictionClosingConfig,
  renderResult: canonical.packet.pleadingRenderResult,
  prohibitedTerms: ["expungement", "expunge", "set aside", "set-aside", "annulment", "vacatur"]
});

const canonicalText = `${canonical.packet.fullText}\n`;

// A page-ruled rendition of the same bytes. The rules are review scaffolding and
// are never part of the artifact: the PDF and canonical.txt carry the packet's
// exact lines, and this file exists so the page-by-page visual review has a
// reviewable page boundary to look at.
let pageCursor = 0;
const pagedText = `${canonical.packet.documents
  .map((document) =>
    document.pages
      .map((pageLines) => {
        pageCursor += 1;
        return [
          `===== ${document.documentId} — packet page ${pageCursor} (document page ${document.pages.indexOf(pageLines) + 1} of ${document.pageCount}) =====`,
          ...pageLines
        ].join("\n");
      })
      .join("\n\n")
  )
  .join("\n\n")}\n`;
const rendered = await renderNdComposedPacketPdf(
  canonical.packet,
  ND_PACKET_LAYOUT,
  "North Dakota Petition to Close Nonconviction Records"
);
for (const overlong of rendered.overlongLines) {
  failures.push(`Composed line exceeds the ${ND_PACKET_LAYOUT.measureChars}-character measure — ${overlong}`);
}
const pdfBytes = rendered.bytes;
const parsed = await PDFDocument.load(pdfBytes);
const pdfPageCount = parsed.getPageCount();
if (pdfPageCount !== canonical.packet.totalPageCount) {
  failures.push(
    `PDF page count ${pdfPageCount} does not equal the composed page count ${canonical.packet.totalPageCount}.`
  );
}

const renderReport = {
  schemaVersion: "rcap-lane-d-render-report/v1",
  lane: "D",
  jurisdiction: "ND",
  routeId: ND_NONCONVICTION_PETITION_SPEC.routeId,
  specId: canonical.packet.specId,
  specVersion: canonical.packet.specVersion,
  specHash: canonical.packet.specHash,
  composerVersion: canonical.packet.composerVersion,
  provider: ND_NONCONVICTION_PETITION_SPEC.provider,
  sources: ND_NONCONVICTION_PETITION_SPEC.sources,
  fixtureId: "canonical",
  generatedBy: "scripts/generate-nd-composed-packet-artifacts.mjs",
  layout: ND_PACKET_LAYOUT,
  artifact: {
    contentType: "application/pdf",
    fileName: "canonical.pdf",
    byteSize: pdfBytes.length,
    sha256: sha256(pdfBytes),
    pageCount: pdfPageCount
  },
  pagedText: {
    fileName: "canonical-pages.txt",
    note: "Review scaffolding: the same bytes with a page rule inserted before each page. Not an artifact of the packet.",
    sha256: sha256(Buffer.from(pagedText, "utf8"))
  },
  text: {
    fileName: "canonical.txt",
    byteSize: Buffer.byteLength(canonicalText, "utf8"),
    sha256: sha256(Buffer.from(canonicalText, "utf8")),
    composedTextSha256: canonical.packet.fullTextSha256
  },
  documentManifest: canonical.packet.documentManifest,
  totalPageCount: canonical.packet.totalPageCount,
  placeholderScan: canonical.packet.placeholderScan,
  composerWarnings: canonical.packet.warnings,
  qa: { passed: qa.passed, failures: qa.failures, warnings: qa.warnings },
  branchOutcomes: Object.fromEntries(
    Object.values(FIXTURES).map((fixture) => {
      const result = results[fixture.fixtureId];
      return [
        fixture.fixtureId,
        result.status === "composed"
          ? {
            status: "composed",
            totalPageCount: result.packet.totalPageCount,
            fullTextSha256: result.packet.fullTextSha256
          }
          : { status: "refused", reasonCode: result.reasonCode, detail: result.detail }
      ];
    })
  )
};

if (canonical.packet.placeholderScan.disallowedTokens.length > 0) {
  failures.push(
    `Canonical packet carries disallowed tokens: ${canonical.packet.placeholderScan.disallowedTokens.join(", ")}.`
  );
}
if (!qa.passed) {
  for (const failure of qa.failures) failures.push(`Pleading QA: ${failure}`);
}

// ---------------------------------------------------------------------------
// Write or check
// ---------------------------------------------------------------------------

const artifacts = [
  ["spec.json", Buffer.from(specJson, "utf8")],
  ["rendered/canonical.txt", Buffer.from(canonicalText, "utf8")],
  ["rendered/canonical-pages.txt", Buffer.from(pagedText, "utf8")],
  ["rendered/canonical.pdf", pdfBytes],
  ["rendered/render-report.json", Buffer.from(`${JSON.stringify(renderReport, null, 2)}\n`, "utf8")],
  ...Object.values(FIXTURES).map((fixture) => [
    `fixtures/${fixture.fixtureId}.json`,
    Buffer.from(
      `${JSON.stringify(
        {
          schemaVersion: "rcap-lane-d-fixture/v1",
          fixtureId: fixture.fixtureId,
          intent: fixture.intent,
          synthetic: true,
          expect: fixture.expect,
          expectReasonCode: fixture.expectReasonCode ?? null,
          specId: ND_NONCONVICTION_PETITION_SPEC.specId,
          specVersion: ND_NONCONVICTION_PETITION_SPEC.specVersion,
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
  console.error(`ND composed-packet artifacts ${check ? "CHECK" : "GENERATION"} FAILED`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`ND composed-packet artifacts ${check ? "check passed" : "written"}.`);
console.log(`  spec:            ${renderReport.specId}@${renderReport.specVersion}`);
console.log(`  spec sha256:     ${renderReport.specHash}`);
console.log(`  documents:       ${renderReport.documentManifest.length}`);
console.log(`  pages:           ${renderReport.totalPageCount}`);
console.log(`  pdf sha256:      ${renderReport.artifact.sha256}`);
console.log(`  pdf bytes:       ${renderReport.artifact.byteSize}`);
console.log(`  qa passed:       ${qa.passed}`);
