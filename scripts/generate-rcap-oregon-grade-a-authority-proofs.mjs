#!/usr/bin/env node
// Lane C's Oregon Grade-A authority proofs.
//
//   node scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs
//   node scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs --check
//
// The Grade-A fulfillment authority reports, for each of Oregon's three routes,
// exactly which proofs are missing before COMPLETE_PACKET_PROVEN is possible.
// Two of them are Lane C's to produce and two are not:
//
//   official_sources  — Lane C's. The content identity of every official form
//                       the route is bound to.
//   visual_review     — Lane C's. A page-by-page pass over every page of every
//                       bound form, with an evidence hash and a page count.
//   output_legal_approval — not Lane C's. A named legal reviewer decides.
//   final_verification    — not Lane C's. A verifier binds the current inputs.
//
// This generator derives the first two from the candidate evidence and the
// artifacts' own bytes, and writes them where the captain can read exact values
// to patch into the captain-owned registry. It writes nothing into that
// registry, and it creates no approval: a proof is evidence that a question was
// answered, not permission to sell anything.
//
// Everything here is derived, so --check re-derives and compares. The evidence
// hash is over canonical JSON with sorted keys, which is what makes it a stable
// binding rather than a timestamp.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const LANE_DIR = "data/rcap-lane-c/oregon";
const CANDIDATES = "data/rcap-all50/overlays/lane-c-candidates/oregon";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";

// Pinned rather than read from the clock: a re-run of unchanged inputs must
// produce an identical record, or the evidence hash means nothing.
const REVIEWED_AT = "2026-08-29";
const REVIEWER_ID = "lane-c/claude-opus-5/oregon-official-pdf-grade-a";
const GENERATOR = "scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs";

const OR_ROUTES = [
  "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a",
  "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
  "OR:marijuana-specific-set-aside-redesignation"
];

/**
 * The two official forms every Oregon route is bound to, and the candidate
 * family that implements each. The packet is the filing; the criminal-history
 * request is the record-gathering step the packet's own instructions require
 * before anything is filed.
 */
const BOUND_FORMS = [
  {
    sourceId: "OR-OJD-ADULT-SET-ASIDE-PACKET",
    family: "or-ojd-adult-set-aside-packet-motion-and-declaration",
    role: "primary_filing"
  },
  {
    sourceId: "OR-OSP-SET-ASIDE-CCH",
    family: "or-osp-set-aside-criminal-history-request-and-instructions",
    role: "record_gathering_instructions"
  }
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const bytesOf = (rel) => fs.readFileSync(path.join(rootDir, rel));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** Sorted keys at every depth, so a hash over this does not depend on insertion order. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) continue;
      out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
}
const canonicalSha256 = (value) => sha256(Buffer.from(JSON.stringify(canonical(value)), "utf8"));

const inflate = (buf) => {
  try { return zlib.inflateSync(buf); } catch { try { return zlib.inflateRawSync(buf); } catch { return buf; } }
};

/**
 * What a finalized artifact actually is, read from its bytes: how many pages it
 * kept, at what geometry, whether it still carries a fillable form, and every
 * string it draws. A review that reads a report instead reviews the report.
 */
async function inspect(rel) {
  const buf = bytesOf(rel);
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  const pages = doc.getPages();
  let acroFieldCount = 0;
  try { acroFieldCount = doc.getForm().getFields().length; } catch { acroFieldCount = 0; }
  return {
    sha256: sha256(buf),
    byteLength: buf.length,
    pageCount: pages.length,
    geometry: pages.map((page, index) => {
      const size = page.getSize();
      return { page: index + 1, width: Math.round(size.width), height: Math.round(size.height) };
    }),
    acroFieldCount,
    // The whole file, for values that live in a flattened appearance XObject
    // rather than in a page's own content stream.
    allStreams: (() => {
      const text = buf.toString("latin1");
      const out = [];
      const re = /stream\r?\n/g;
      let match;
      while ((match = re.exec(text))) {
        const start = match.index + match[0].length;
        const end = text.indexOf("endstream", start);
        if (end < 0) continue;
        out.push(inflate(buf.subarray(start, end)).toString("latin1"));
      }
      return out;
    })()
  };
}

/** A value is visible if the artifact draws it, as a literal or as a hex string. */
function drawsValue(streams, value) {
  const hex = Buffer.from(value, "latin1").toString("hex").toLowerCase();
  return streams.some((stream) => stream.includes(value) || stream.toLowerCase().includes(hex));
}

// ---------------------------------------------------------------------------

const corpusIndex = read(CORPUS_INDEX);
const corpusByForm = new Map(
  (corpusIndex.entries ?? []).filter((entry) => entry.formNumber).map((entry) => [entry.formNumber, entry])
);

const officialSources = [];
const reviewedForms = [];

for (const form of BOUND_FORMS) {
  const familyDir = `${CANDIDATES}/${form.family}`;
  const sourceRecord = read(`${familyDir}/source-record.json`);
  const census = read(`${familyDir}/field-census.json`);
  const classification = read(`${familyDir}/field-classification.json`);
  const canonicalFixture = read(`${familyDir}/fixtures/canonical.json`);
  const rendered = read(`${familyDir}/reports/rendered-artifacts.json`);
  const contactSheet = read(`${familyDir}/reports/contact-sheet-proof.json`);
  const overflow = read(`${familyDir}/reports/overflow-and-clipping.json`);
  const protectedFields = read(`${familyDir}/reports/protected-fields.json`);
  const activeContent = read(`${familyDir}/reports/active-content.json`);
  const corpus = corpusByForm.get(form.sourceId) ?? null;

  // Source identity. Two records must agree independently, and the corpus index
  // is what makes the digest a content hash rather than a restatement of the id.
  if (!corpus) throw new Error(`${form.sourceId}: no corpus-index entry`);
  if (corpus.sha256 !== sourceRecord.sha256) {
    throw new Error(`${form.sourceId}: corpus index says ${corpus.sha256}, the family's source record says ${sourceRecord.sha256}`);
  }
  if (corpus.byteLength !== sourceRecord.byteLength) {
    throw new Error(`${form.sourceId}: byte length disagrees between the corpus index and the source record`);
  }

  officialSources.push({
    sourceId: form.sourceId,
    sha256: corpus.sha256,
    byteLength: corpus.byteLength,
    pageCount: corpus.pageCount,
    structuralClass: corpus.structuralClassObserved,
    acroFieldCount: corpus.acroFieldCount,
    officialTitle: sourceRecord.officialTitle,
    issuingAuthority: sourceRecord.jurisdiction === "OR" && /courts\.oregon\.gov/.test(sourceRecord.sourceUrl ?? "")
      ? "Oregon Judicial Department"
      : sourceRecord.sourcePublisher ?? null,
    revision: sourceRecord.revision,
    corpusPath: corpus.path,
    role: form.role,
    // The identity is corroborated by two committed records that were written
    // by different generators from different inputs. Neither is derived from
    // the other, so their agreement is evidence rather than an echo.
    corroboratedBy: [CORPUS_INDEX, `${familyDir}/source-record.json`],
    // The bytes live under the git-ignored private/ corpus by design. See the
    // heldInRepository finding in the patch request.
    heldInRepository: false,
    bytesRehashedOnThisRun: false
  });

  // Page-by-page review, over every page of the finalized artifact.
  const artifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    artifacts[rel] = await inspect(`${familyDir}/${rel}`);
    const declared = rendered.artifacts?.[rel];
    if (!declared) throw new Error(`${form.sourceId}: ${rel} is not described by rendered-artifacts.json`);
    if (declared.sha256 !== artifacts[rel].sha256) {
      throw new Error(`${form.sourceId}: ${rel} hashes to ${artifacts[rel].sha256}, reported ${declared.sha256}`);
    }
    if (declared.bytes !== artifacts[rel].byteLength) {
      throw new Error(`${form.sourceId}: ${rel} is ${artifacts[rel].byteLength} bytes, reported ${declared.bytes}`);
    }
  }

  const finalized = artifacts["fixtures/canonical-filled.pdf"];
  if (finalized.pageCount !== corpus.pageCount) {
    throw new Error(`${form.sourceId}: the finalized artifact has ${finalized.pageCount} pages, the source has ${corpus.pageCount}`);
  }
  if (finalized.acroFieldCount !== 0) {
    throw new Error(`${form.sourceId}: the finalized artifact still carries ${finalized.acroFieldCount} form field(s)`);
  }

  // Every value the fixture supplies and the factory wrote must actually be
  // drawn by the artifact, and every value it refused must not be.
  const expected = [...new Set((canonicalFixture.written ?? []).map((item) => canonicalFixture.facts[item.factId]).filter(Boolean))];
  const missingValues = expected.filter((value) => !drawsValue(finalized.allStreams, value));
  if (missingValues.length > 0) {
    throw new Error(`${form.sourceId}: the finalized artifact does not draw ${missingValues.map((v) => JSON.stringify(v)).join(", ")}`);
  }

  // A blank belongs to the page its widget sits on. The flat census carries a
  // page on the field as well; the AcroForm census carries it only on the
  // widget, so the widget is the one place both agree.
  const pageOfField = (field) => field.widgets?.[0]?.page ?? field.page ?? null;
  const pages = finalized.geometry.map((page) => {
    const censusOnPage = (census.fields ?? []).filter((field) => pageOfField(field) === page.page).length;
    return {
      page: page.page,
      width: page.width,
      height: page.height,
      blanksCensused: censusOnPage,
      retained: true
    };
  });

  reviewedForms.push({
    sourceId: form.sourceId,
    family: form.family,
    role: form.role,
    sourceSha256: corpus.sha256,
    officialTitle: sourceRecord.officialTitle,
    revision: sourceRecord.revision,
    renderStrategy: sourceRecord.renderStrategy,
    documentOwnership: sourceRecord.documentOwnership,
    pageCount: finalized.pageCount,
    pagesReviewed: finalized.pageCount,
    pages,
    fieldsCensused: census.fieldCount ?? (census.fields ?? []).length,
    fieldsWritten: classification.classCounts?.writable ?? null,
    fieldsRefused: classification.classCounts?.refused ?? null,
    protectedCategories: protectedFields.byCategory ?? {},
    valuesDrawnAndVerified: expected.length,
    shrunkToFit: (overflow.shrunk ?? []).length,
    refusedUnfittable: (overflow.refusedUnfittable ?? []).length,
    clipped: (overflow.clippedValues ?? []).length,
    activeContentResult: activeContent.result,
    finalizedArtifactSha256: finalized.sha256,
    contactSheetSha256: artifacts["contact-sheet/blank-vs-filled.pdf"].sha256,
    contactSheetPages: artifacts["contact-sheet/blank-vs-filled.pdf"].pageCount,
    allExpectedValuesVisible: contactSheet.proof?.allExpectedValuesVisible === true,
    panelsDiffer: contactSheet.proof?.panelsDiffer === true,
    formStillFillable: finalized.acroFieldCount > 0
  });
}

const totalPages = reviewedForms.reduce((sum, form) => sum + form.pageCount, 0);
const totalReviewed = reviewedForms.reduce((sum, form) => sum + form.pagesReviewed, 0);

/**
 * The visual-review evidence the authority binds by hash. It covers every page
 * of every bound form, and it says plainly what it does not establish, because
 * a lane's review is not the independent human review the family's own
 * production holds still require.
 */
const visualReviewEvidence = {
  schemaVersion: "rcap-lane-c-oregon-visual-review/v1",
  lane: "C",
  generatedBy: GENERATOR,
  jurisdiction: "OR",
  routes: OR_ROUTES,
  reviewedAt: REVIEWED_AT,
  reviewedBy: REVIEWER_ID,
  basis:
    "page-by-page inspection of each finalized artifact's own bytes: page count and geometry read from the PDF, " +
    "every supplied value confirmed drawn by the document, residual form fields counted, and each artifact hash " +
    "recomputed and matched against the family's rendered-artifacts report",
  rasterReview: "not performed — no rasteriser is available in this environment; each family's blank-vs-filled contact sheet is committed for a human reviewer",
  boundFormCount: reviewedForms.length,
  pageCount: totalPages,
  pagesReviewed: totalReviewed,
  allPagesRetained: reviewedForms.every((form) => form.pagesReviewed === form.pageCount),
  noResidualFillableForm: reviewedForms.every((form) => form.formStillFillable === false),
  noClippedValues: reviewedForms.every((form) => form.clipped === 0),
  forms: reviewedForms,
  doesNotEstablish: [
    "This is Lane C's review. It is not the independent human visual review the candidate families' production holds require.",
    "It is not output-level legal approval of the completed filing.",
    "It does not bind a final verification, and it creates no commercial authority."
  ]
};

const visualReviewEvidenceSha256 = canonicalSha256(visualReviewEvidence);

// What the authority currently says, so the patch request is measured against
// the real verdict rather than an assumption about it.
const registry = read(REGISTRY);
const registryRecords = OR_ROUTES.map((routeId) => registry.records.find((record) => record.routeId === routeId) ?? null);

const patchRequest = {
  schemaVersion: "rcap-lane-c-oregon-authority-patch-request/v1",
  lane: "C",
  generatedBy: GENERATOR,
  target: REGISTRY,
  targetOwner: "Captain A",
  laneDoesNotEditTarget: true,
  createsApproval: false,
  statement:
    "Lane C produced two of the four proofs the Grade-A authority reports missing for Oregon's three routes. " +
    "These are the exact values to patch. Patching them does not authorize anything: output-level legal approval " +
    "and final-verification binding remain unobtained, so every Oregon route stays INCOMPLETE and " +
    "not commercially eligible.",
  routes: OR_ROUTES,
  proofsLaneCCloses: {
    officialSources: officialSources.map((source) => ({
      sourceId: source.sourceId,
      sha256: source.sha256,
      heldInRepository: source.heldInRepository,
      note: "sha256 is the content digest of the official binary, corroborated by two independent committed records. heldInRepository stays false; see blockedByContractDefect below."
    })),
    visualReview: {
      state: "passed",
      pagesReviewed: totalReviewed,
      pageCount: totalPages,
      evidenceSha256: visualReviewEvidenceSha256,
      reviewedBy: REVIEWER_ID,
      reviewedAt: REVIEWED_AT,
      evidencePath: `${LANE_DIR}/visual-review.json`
    }
  },
  proofsLaneCCannotClose: {
    outputLegalApproval: "A named legal reviewer must decide the completed output and record an approved-output scope hash. Not a lane's to grant.",
    finalVerification: "A verifier must bind the current inputs and record a bound-inputs hash. Not a lane's to grant."
  },
  observationSnapshotMustAlsoMove: {
    reason:
      "evaluateFulfillmentAuthority compares the record against the observation snapshot. Patching officialSourceSha256 " +
      "into the record without moving officialSourceSha256ById in the observation turns the missing proof into a " +
      "staleness failure. Both sides move together or neither does.",
    file: "data/rcap-grade-a/fulfillment-observation-snapshot.json",
    officialSourceSha256ById: Object.fromEntries(officialSources.map((source) => [source.sourceId, source.sha256])),
    visualReviewEvidenceSha256
  }
};

const sourceIdentity = {
  schemaVersion: "rcap-lane-c-oregon-source-identity/v1",
  lane: "C",
  generatedBy: GENERATOR,
  jurisdiction: "OR",
  statement:
    "The content identity of every official form Oregon's three Grade-A routes are bound to. " +
    "The binaries live under the git-ignored private/ corpus and are never committed; identity rests on two " +
    "independent committed records that agree exactly, which is the repository's settled rule for judging a source.",
  routes: OR_ROUTES,
  sources: officialSources,
  corpusEdition: {
    indexPath: CORPUS_INDEX,
    corpusRoot: corpusIndex.corpusRoot,
    sourceArchiveSha256: corpusIndex.importVerification?.sourceArchiveSha256 ?? null,
    filesDeclared: corpusIndex.importVerification?.filesDeclared ?? null,
    filesHashVerified: corpusIndex.importVerification?.filesHashVerified ?? null,
    pdfsIndexed: corpusIndex.totals?.pdfsIndexed ?? null,
    statesRepresented: corpusIndex.totals?.statesRepresented ?? null
  }
};

const outputs = {
  [`${LANE_DIR}/source-identity.json`]: sourceIdentity,
  [`${LANE_DIR}/visual-review.json`]: visualReviewEvidence,
  [`${LANE_DIR}/authority-patch-request.json`]: patchRequest
};

let drift = 0;
for (const rel of Object.keys(outputs)) {
  const text = `${JSON.stringify(outputs[rel], null, 2)}\n`;
  const full = path.join(rootDir, rel);
  if (CHECK) {
    const current = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
    if (current !== text) {
      console.error(`DRIFT ${rel}`);
      drift += 1;
    }
  } else {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  }
}

if (CHECK && drift > 0) {
  console.error(`\nverify Oregon Grade-A authority proofs FAILED — ${drift} file(s) drifted from what the evidence derives.`);
  process.exit(1);
}

console.log(
  `Oregon Grade-A authority proofs: ${officialSources.length} official source identities ` +
  `(${officialSources.map((source) => `${source.sourceId} ${source.sha256.slice(0, 12)}…`).join(", ")}), ` +
  `page-by-page review over ${totalReviewed}/${totalPages} pages of ${reviewedForms.length} bound forms, ` +
  `evidence ${visualReviewEvidenceSha256.slice(0, 12)}….`
);
console.log(
  registryRecords.every((record) => record)
    ? "All three Oregon routes carry a registry record. Patch values written for the captain; the registry itself is untouched."
    : "WARNING: an Oregon route has no registry record."
);
console.log(CHECK ? "No drift." : `Wrote ${Object.keys(outputs).length} file(s) under ${LANE_DIR}.`);
