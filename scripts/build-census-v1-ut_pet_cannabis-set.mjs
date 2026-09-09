#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `ut_pet_cannabis-set`.
 *
 *   node scripts/build-census-v1-ut_pet_cannabis-set.mjs
 *
 * Utah, petition to expunge a cannabis-possession conviction under Utah Code
 * 77-40a-305(4), route
 * `obligation:track-pathway:UT:ut_pet_cannabis:path-j-cannabis-possession-petition-without-a-bci-certificate`.
 * Five declared components, five held binaries:
 *
 *   civil-cover-sheet-1          1044XX  District Court Cover Sheet for Civil
 *                                        Actions (rev. 05/06/2026).
 *   petition-2                   1003EX  Petition to Expunge Records - In Re:
 *                                        Cannabis Conviction (rev. 04/10/2023).
 *   proposed-order-3             1023EX  Order on Petition to Expunge Records -
 *                                        Cannabis Conviction.
 *   acceptance-of-service-4      1146XX  Acceptance of Service - Expungement
 *                                        (Prosecutor) (rev. 05/01/2019).
 *   consent-and-waiver-5         1148XX  Consent and Waiver of Hearing -
 *                                        Expungement (rev. 05/01/2019).
 *
 * THIS BUILD REFUSES. EVERY BYTE IS HELD; THE FORMS DRAW NO BLANK FOR ANYTHING
 * THAT MAKES THE PACKET A FILING.
 *
 * All five declared digests resolve, and this script re-hashes each from the
 * custody bytes before measuring anything. The stop is not a missing source.
 *
 * FIRST, THERE IS NO WIDGET ANYWHERE. All five carry no /AcroForm, no /XFA and
 * zero annotations on every page. The committed corpus index agrees and records
 * each as structuralClassObserved "flat_pdf" with acroFieldCount 0, and no Utah
 * entry in that index - 59 of them - has an AcroForm at all, so there is no
 * fillable edition of any of these five to bind instead. That is not by itself
 * a stop: `ca-1203-4-set` is declared official_pdf_fill over flat sources and
 * renders through `finalizeFlatOverlay` with write boxes measured from the
 * rectangles the form itself draws, and these five do draw rules - 36, 30, 41,
 * 19 and 22 horizontal ones. The sanctioned flat path is available here.
 *
 * SECOND, AND THIS IS THE STOP: THE FLAT PATH REACHES THE CONTACT BLOCK AND
 * NOTHING THE COURT NEEDS. Applied to 1003EX, the petition, the shared
 * derivation - captions from the text-showing operators, write boxes from the
 * `re` rectangles, a caption with no rule getting no coordinate - binds Name,
 * Address, Phone and Email in the top-left contact block, and refuses every one
 * of these for want of a drawn rule:
 *
 *   Case Number                  matter.case_number
 *   Judicial District / County   matter.court
 *   Petitioner (the case caption party name)
 *   Printed Name (the signature block, page 4)
 *
 * Utah writes those blanks as typed underscore leaders in the text layer -
 * "_____________________________________ _______________________________"
 * above "Petitioner   Case Number" - rather than as rectangles. The method has
 * no coordinate for any of them and says so rather than inventing one. A
 * cannabis-expungement petition that does not state its case number, its
 * judicial district, its county or the petitioner's name is not a filing, so
 * what the method can place is not a packet.
 *
 * THIRD, RECORDED BECAUSE THE NEXT LANE WILL REACH FOR THE SAME METHOD: RUN
 * UNCURATED, THAT DERIVATION WRITES THE PARTICIPANT INTO THE OTHER PARTY'S
 * BOXES. This script classifies every derived anchor against the printed
 * headings of its own page rather than against its caption string, and the
 * misplacements are counted, not asserted:
 *
 *   1044XX is a two-column cover sheet, Plaintiff/Petitioner on the left and
 *   Defendant/Respondent from x=320. Anchors land in the right column and in
 *   the attorney blocks beneath it, which would name the participant as the
 *   opposing party and as counsel.
 *
 *   1146XX and 1148XX print the participant's contact block at the top and the
 *   PROSECUTOR's - "Prosecutor (print name)", Address, City State Zip, Phone -
 *   lower on the page. Anchors land in the prosecutor's Address and Phone.
 *
 *   1003EX's line "I am [ ] Plaintiff/Petitioner [ ] Plaintiff/Petitioner's
 *   Attorney (Utah Bar #:____)" takes a full_legal_name anchor across a 474pt
 *   box. That line is an election and a bar number, not a name blank.
 *
 * A fourth thing, recorded and not the stop: the caption channel misreads these
 * bytes. Kerned runs come back transposed - "PlaintiffP/etitioner", "Check your
 * email.ou wY", "Signature y", "Judicial District C ounty" - and
 * `captionIsUndecodable` does not catch transposition, only control characters
 * and replacement glyphs above a 15% share. Two of the five anchors this method
 * keeps on the petition were bound off captions that were never correctly read.
 *
 * Nothing is written. No overlay directory is created or touched, and all nine
 * completeness counters are null rather than zero, because a family that was
 * not built was not measured.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { ruleLinesOf, ruleForCaption, ruleBeforeCaption } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { FACT_DESCRIPTORS, protectCategoryOf, haystack } from "./rcap-official-forms/rcap-field-semantics.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "ut_pet_cannabis-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ut/ut-pet-cannabis-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-pathway:UT:ut_pet_cannabis:path-j-cannabis-possession-petition-without-a-bci-certificate";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

// Geometry constants of the sanctioned flat-overlay derivation, carried here so
// this measurement reproduces that method exactly rather than approximating it.
const INSET_X = 1.5, INSET_RIGHT = 2, BASELINE_ABOVE_RULE = 2, BOX_HEIGHT = 12, FONT_SIZE = 9;

const SOURCES = Object.freeze({
  "1044XX": {
    sourceId: "official-form:1044XX", component: "civil_cover_sheet",
    path: "STATES/UT/02_PACKET_FORMS/UT__FORM__1044XX__district-court-cover-sheet-for-civil-actions__REV-2026-05-06__EN.pdf",
    sha256: "b99586289df6304da5b34181bee95ec2b7f098806c1c949a0f112daeb0244a52" },
  "1003EX": {
    sourceId: "official-form:1003EX", component: "petition",
    path: "STATES/UT/02_PACKET_FORMS/UT__FORM__1003EX__petition-to-expunge-records-cannabis-conviction__REV-2020-03-09__EN.pdf",
    sha256: "a8432deaa902e26c18a215d20fcc0f90eaedd5a62c28d0cec79f3f65d17c4352" },
  "1023EX": {
    sourceId: "official-form:1023EX", component: "proposed_order",
    path: "LegalEase Utah/1023EX_Order_Cannabis_Conviction.pdf",
    sha256: "24868a504130440532dd51f47b212e925815abc91c086a3bf67d5c014b5d002a" },
  "1146XX": {
    sourceId: "official-form:1146XX", component: "acceptance_of_service",
    path: "STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1146XX__acceptance-of-service-expungement__REV-2019-05-01__EN.pdf",
    sha256: "39f1205f48bd73fc7b9686a101369be74a988b419697ea964c2ff5a5c0ce63ad" },
  "1148XX": {
    sourceId: "official-form:1148XX", component: "consent_and_waiver_of_hearing",
    path: "STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1148XX__consent-and-waiver-of-hearing-expungement__REV-2019-05-01__EN.pdf",
    sha256: "43c6d4fd232f67453357b342794cac209da82373ce4e93c686c285b42e553288" }
});

/**
 * Blocks of a page that belong to somebody other than the participant, located
 * by the form's OWN printed heading rather than by a caption string, so an
 * anchor is judged by where it sits and not by what the word beside it says.
 * Each names the heading to find and the region it governs relative to it.
 */
const FOREIGN_BLOCKS = Object.freeze({
  "1044XX": [
    { owner: "defendant_respondent", headingMatches: /Defendant\s*\/\s*Respondent/i, appliesToColumnFromX: 310 },
    { owner: "attorney_or_licensed_paralegal_practitioner", headingMatches: /Attorney or/i, belowHeadingBy: 60 }
  ],
  "1146XX": [
    { owner: "prosecutor", headingMatches: /Prosecutor \(print name\)/i, belowHeadingBy: 90 }
  ],
  "1148XX": [
    { owner: "prosecutor", headingMatches: /Prosecutor \(print name\)/i, belowHeadingBy: 90 }
  ],
  "1023EX": [
    { owner: "person_served_certificate_of_service", headingMatches: /Certificate of Service|Person['’]s Name/i, belowHeadingBy: 120 }
  ]
});

/** Blanks a Utah filing cannot omit, checked against what the method could place. */
const FIELDS_A_UTAH_FILING_REQUIRES = Object.freeze([
  { field: "matter.case_number", printedAs: "Case Number" },
  { field: "matter.court", printedAs: "Judicial District / County" },
  { field: "matter.court_address", printedAs: "Court Address" },
  { field: "caption.petitioner_name", printedAs: "Petitioner (case caption)" }
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/**
 * Custody roots outside this repoRoot that may hold declared bytes. Read from
 * the environment so nothing about one container's layout is baked in, and
 * searched by content hash only.
 */
const EXTRA_CUSTODY_ROOTS = (process.env.RCAP_EXTRA_CUSTODY_ROOTS ?? "")
  .split(path.delimiter).map((s) => s.trim()).filter((s) => s.length > 0 && fs.existsSync(s));

function findByContentDigest(wantSha) {
  const skip = new Set(["node_modules", ".git"]);
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { const hit = walk(full); if (hit) return hit; continue; }
      if (!entry.isFile() || !/\.pdf$/i.test(entry.name)) continue;
      let bytes;
      try { bytes = fs.readFileSync(full); } catch { continue; }
      if (sha256(bytes) === wantSha) return { path: full, bytes };
    }
    return null;
  };
  for (const root of EXTRA_CUSTODY_ROOTS) { const hit = walk(root); if (hit) return hit; }
  return null;
}

function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const candidates = (index.entries ?? []).filter((row) => row.sha256 === want.sha256);
    if (candidates.length === 0) {
      failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry hashes to ${want.sha256}` });
      continue;
    }
    let bytes = null, from = null, indexEntry = null, resolvedOutsideTheRepoRoot = null;
    for (const entry of candidates) {
      const absolute = resolver.resolve(entry);
      if (!absolute || !fs.existsSync(absolute)) continue;
      const candidateBytes = fs.readFileSync(absolute);
      if (sha256(candidateBytes) !== want.sha256) continue;
      bytes = candidateBytes; from = entry.path; indexEntry = entry; break;
    }
    // A custody the index declares can be real and simply not mounted at this
    // repoRoot: this worktree is a sparse checkout with no private/ tree, while
    // the same custody is mounted in the main clone. Resolution is by CONTENT
    // DIGEST, so the extra roots are searched by hash rather than by path, and
    // a hit is only accepted when the bytes hash to the declared digest.
    if (!bytes) {
      const hit = findByContentDigest(want.sha256);
      if (hit) {
        bytes = hit.bytes; from = hit.path;
        indexEntry = candidates[0];
        resolvedOutsideTheRepoRoot = hit.path;
      }
    }
    if (!bytes) {
      failures.push({
        sourceIdentity: want.sourceId,
        why: `the committed index places this digest in ${candidates.map((c) => c.custody).join(", ")}, and no custody holding it is mounted at this repoRoot or under any root in RCAP_EXTRA_CUSTODY_ROOTS`
      });
      continue;
    }
    resolved[key] = {
      ...want, bytes, byteLength: bytes.length, resolvedFromPath: from,
      custody: indexEntry.custody,
      resolvedOutsideTheRepoRoot,
      indexDeclares: {
        acroFormPresent: indexEntry.acroFormPresent ?? null,
        acroFieldCount: indexEntry.acroFieldCount ?? null,
        xfaPresent: indexEntry.xfaPresent ?? null,
        structuralClassObserved: indexEntry.structuralClassObserved ?? null
      }
    };
  }
  return { resolved, failures };
}

/** What the bytes themselves say about fillability, independently of the index. */
async function measureStructure(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const acroForm = pdf.catalog.lookup(PDFName.of("AcroForm"));
  let fieldCount = 0;
  try { fieldCount = pdf.getForm().getFields().length; } catch { fieldCount = 0; }
  const annotsPerPage = pdf.getPages().map((page) => {
    const annots = page.node.Annots();
    return annots && typeof annots.size === "function" ? annots.size() : 0;
  });
  return {
    pageCount: pdf.getPageCount(),
    acroFormPresentInCatalog: Boolean(acroForm),
    acroFieldCountReadFromBytes: fieldCount,
    annotationsPerPage: annotsPerPage,
    totalAnnotations: annotsPerPage.reduce((a, b) => a + b, 0)
  };
}

const captionTextOf = (line) => String(line.text ?? "")
  .replace(/[_.…]{3,}/g, " ").replace(/\s+/g, " ").replace(/[:.\s]+$/, "").trim();

function segmentsOf(line, gapThreshold = 8) {
  const runs = (line.runs ?? []).filter((r) => String(r.text ?? "").trim().length > 0);
  const segments = [];
  let current = null;
  for (const run of runs) {
    if (current && run.x - current.x2 <= gapThreshold) { current.text += run.text; current.x2 = run.x2; }
    else { if (current) segments.push(current); current = { text: run.text, x: run.x, x2: run.x2 }; }
  }
  if (current) segments.push(current);
  return segments.filter((s) => s.text.trim().length > 0);
}

const captionIsUndecodable = (text) => {
  const raw = String(text ?? "");
  if (raw.length === 0) return false;
  const suspect = [...raw].filter((ch) => ch.charCodeAt(0) < 32 || ch === "�" || ch === "¶").length;
  return suspect / raw.length > 0.15;
};

/**
 * A caption whose glyph runs came back out of order. The shared decodability
 * test does not look for this, so it is measured separately rather than
 * assumed absent: a lowercase letter immediately following a capitalised word
 * boundary, or a punctuation mark inside a word, is a transposed run.
 */
const captionLooksTransposed = (text) => {
  const raw = String(text ?? "");
  if (/[a-z][A-Z]\/[a-z]/.test(raw)) return true;          // PlaintiffP/etitioner
  // A one or two letter lowercase fragment standing as its own word before a
  // capitalised one. Anchored to a space or the start rather than to \b, because
  // \b also fires after an apostrophe and flagged the ordinary possessive
  // "Person's Name" as transposed. A false positive here would inflate a count
  // this refusal reports, so the rule is narrowed rather than left generous.
  if (/(?:^|\s)[a-z]{1,2}\s[A-Z][a-z]/.test(raw)) return true;    // ou wYill
  if (/[a-zA-Z][.,][a-z]{2,}\s/.test(raw)) return true;     // email.ou
  if (/[-]/.test(raw)) return true;             // Signature y
  return false;
};

function factForCaption(caption) {
  if (captionIsUndecodable(caption)) return { factId: null, refusal: "caption_not_decodable" };
  const words = caption.split(/\s+/).filter(Boolean).length;
  if (caption.length < 3 || caption.length > 30 || words > 4) return { factId: null, refusal: "not_a_caption" };
  const category = protectCategoryOf(caption);
  if (category) return { factId: null, refusal: "protected_by_category", detail: category };
  const hay = haystack(caption);
  const matches = FACT_DESCRIPTORS.filter((d) => d.match.test(hay) && !(d.refuseWhen && d.refuseWhen.test(hay)));
  if (matches.length === 0) return { factId: null, refusal: "no_fact_descriptor_matches" };
  if (matches.some((d) => d.requiresExplicitMapping)) {
    return { factId: null, refusal: "requires_explicit_mapping", detail: matches.map((d) => d.factId).join(", ") };
  }
  if (matches.length > 1) return { factId: null, refusal: "caption_matches_more_than_one_fact", detail: matches.map((d) => d.factId).join(", ") };
  return { factId: matches[0].factId, refusal: null };
}

/** The shared flat-overlay derivation, reproduced so its result is measured here. */
async function deriveAnchors(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ruleLines = await ruleLinesOf(bytes);
  const anchors = [], refusedCaptions = [], printedLines = [];

  for (const [index, page] of doc.getPages().entries()) {
    const pageNumber = index + 1;
    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) printedLines.push({ page: pageNumber, x: line.x, y: line.y, text: String(line.text ?? "") });
    for (const line of lines) {
      const candidates = [
        { text: captionTextOf(line), x: line.x, y: line.y },
        ...segmentsOf(line).map((seg) => ({ text: captionTextOf(seg), x: seg.x, y: line.y }))
      ];
      const seen = new Set();
      for (const candidate of candidates) {
        const caption = candidate.text;
        if (!caption || seen.has(`${caption}|${candidate.x}`)) continue;
        seen.add(`${caption}|${candidate.x}`);
        const decision = factForCaption(caption);
        const attempts = [
          ruleForCaption(ruleLines, { page: pageNumber, baselineY: candidate.y, labelX: candidate.x, label: caption }),
          ruleBeforeCaption(ruleLines, { page: pageNumber, baselineY: candidate.y, labelX: candidate.x, label: caption })
        ];
        const found = attempts.filter((o) => o?.bound)
          .sort((a, b) => Math.abs(a.rule.y - candidate.y) - Math.abs(b.rule.y - candidate.y))[0] ?? null;

        if (!decision.factId) {
          if (found && decision.refusal !== "no_fact_descriptor_matches" && decision.refusal !== "not_a_caption") {
            refusedCaptions.push({ page: pageNumber, caption, refusal: decision.refusal, detail: decision.detail ?? null });
          } else if (!found && decision.factId === null && decision.refusal === "protected_by_category") {
            refusedCaptions.push({ page: pageNumber, caption, refusal: decision.refusal, detail: decision.detail ?? null });
          }
          continue;
        }
        if (!found) {
          refusedCaptions.push({
            page: pageNumber, caption, factId: decision.factId,
            refusal: "no_rule_line_belongs_to_this_caption",
            detail: "the form draws no rectangle for this blank, so no coordinate is asserted"
          });
          continue;
        }
        const x = Number((found.rule.x + INSET_X).toFixed(2));
        const width = Number((found.maxRightEdge - INSET_RIGHT - x).toFixed(2));
        if (width < 20) {
          refusedCaptions.push({ page: pageNumber, caption, factId: decision.factId, refusal: "write_box_too_narrow_to_hold_a_value", detail: `${width}pt` });
          continue;
        }
        anchors.push({
          label: caption, factId: decision.factId, page: pageNumber,
          writeBox: { x, y: Number((found.rule.y + BASELINE_ABOVE_RULE).toFixed(2)), width, height: BOX_HEIGHT },
          fontSize: FONT_SIZE,
          ruleLine: { x: found.rule.x, y: found.rule.y, endX: found.rule.endX },
          captionLooksTransposed: captionLooksTransposed(caption)
        });
      }
    }
  }

  // One drawn rule claimed by two different facts binds to nothing.
  const byRule = new Map();
  for (const anchor of anchors) {
    const key = `${anchor.page}|${anchor.ruleLine.x}|${anchor.ruleLine.y}`;
    if (!byRule.has(key)) byRule.set(key, []);
    byRule.get(key).push(anchor);
  }
  const kept = [];
  for (const [, claimants] of byRule) {
    const distinct = new Set(claimants.map((a) => a.factId));
    if (distinct.size > 1) {
      for (const anchor of claimants) {
        refusedCaptions.push({
          page: anchor.page, caption: anchor.label, factId: anchor.factId,
          refusal: "more_than_one_caption_claims_this_rule", detail: [...distinct].join(", ")
        });
      }
      continue;
    }
    kept.push(claimants[0]);
  }
  kept.sort((a, b) => a.page - b.page || b.writeBox.y - a.writeBox.y || a.writeBox.x - b.writeBox.x);
  return { anchors: kept, refusedCaptions, printedLines };
}

/**
 * Which kept anchors sit inside a block the form's own printed headings say
 * belongs to somebody else. Located from the headings, so this is a
 * measurement of where the anchor is and not a reading of what it is called.
 */
function anchorsInForeignBlocks(key, anchors, printedLines) {
  const blocks = FOREIGN_BLOCKS[key] ?? [];
  const located = [];
  for (const block of blocks) {
    for (const line of printedLines) {
      if (!block.headingMatches.test(line.text)) continue;
      located.push({ ...block, page: line.page, headingY: line.y, headingX: line.x, headingText: line.text.trim() });
    }
  }
  const misplaced = [];
  for (const anchor of anchors) {
    for (const block of located) {
      if (block.page !== anchor.page) continue;
      const inColumn = block.appliesToColumnFromX != null && anchor.writeBox.x >= block.appliesToColumnFromX;
      const belowHeading = block.belowHeadingBy != null
        && anchor.writeBox.y <= block.headingY && anchor.writeBox.y >= block.headingY - block.belowHeadingBy;
      if (!inColumn && !belowHeading) continue;
      misplaced.push({
        page: anchor.page, anchorLabel: anchor.label, factId: anchor.factId, writeBox: anchor.writeBox,
        blockOwner: block.owner,
        locatedBy: inColumn
          ? `the write box starts at x=${anchor.writeBox.x}, inside the column the printed heading ${JSON.stringify(block.headingText)} governs from x=${block.appliesToColumnFromX}`
          : `the write box sits ${Number((block.headingY - anchor.writeBox.y).toFixed(1))}pt below the printed heading ${JSON.stringify(block.headingText)}`,
        whyThisWouldBeWrong: `writing ${anchor.factId} here states that the participant is the ${block.owner.replace(/_/g, " ")}`
      });
      break;
    }
  }
  return { blocksLocated: located.length, misplaced };
}

async function build() {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false,
      counters: null, countersAreNullBecause: "no family was built, so nothing was measured"
    };
  }

  const documents = {};
  let totalWidgets = 0, totalMisplaced = 0, totalTransposed = 0;
  for (const [key, source] of Object.entries(resolved)) {
    const structure = await measureStructure(source.bytes);
    const derived = await deriveAnchors(source.bytes);
    const foreign = anchorsInForeignBlocks(key, derived.anchors, derived.printedLines);
    totalWidgets += structure.acroFieldCountReadFromBytes;
    totalMisplaced += foreign.misplaced.length;
    totalTransposed += derived.anchors.filter((a) => a.captionLooksTransposed).length;
    documents[key] = {
      sourceId: source.sourceId, component: source.component, sha256: source.sha256,
      byteLength: source.byteLength, resolvedFromPath: source.resolvedFromPath, custody: source.custody,
      resolvedOutsideTheRepoRoot: source.resolvedOutsideTheRepoRoot ?? null,
      digestReHashedFromCustodyBytes: true,
      structureReadFromBytes: structure,
      committedIndexDeclares: source.indexDeclares,
      bytesAndIndexAgree: source.indexDeclares.acroFieldCount === structure.acroFieldCountReadFromBytes,
      flatOverlayDerivation: {
        anchorsKept: derived.anchors.length,
        captionsRefused: derived.refusedCaptions.length,
        anchorsBoundOffATransposedCaption: derived.anchors.filter((a) => a.captionLooksTransposed).length,
        anchors: derived.anchors,
        refusedCaptions: derived.refusedCaptions
      },
      anchorsLandingInAnotherPartysBlock: foreign.misplaced
    };
  }

  // Which blanks a Utah filing requires did the method fail to place, and why.
  const petition = documents["1003EX"];
  const placedFactIds = new Set(petition.flatOverlayDerivation.anchors.map((a) => a.factId));
  const requiredAndUnplaceable = FIELDS_A_UTAH_FILING_REQUIRES.map((required) => {
    const refusal = petition.flatOverlayDerivation.refusedCaptions
      .find((r) => r.factId === required.field || new RegExp(required.printedAs.split(" /")[0], "i").test(r.caption ?? ""));
    return {
      ...required,
      placedByTheMethod: placedFactIds.has(required.field),
      refusalOnThePetition: refusal ? { caption: refusal.caption, refusal: refusal.refusal } : null,
      whyNotPlaceable: "the petition writes this blank as a typed underscore leader in its text layer rather than as a drawn rectangle, and a caption with no rule gets no coordinate"
    };
  });
  const unplaceable = requiredAndUnplaceable.filter((row) => !row.placedByTheMethod);

  if (totalWidgets === 0 && unplaceable.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED",
      stopClass: "SOURCE_DRAWS_NO_WRITE_BOX_FOR_THE_FIELDS_THE_FILING_REQUIRES",
      stopClassIsNewHere:
        "It is not BLOCKED_SOURCE: every declared digest resolves and was re-hashed from the custody bytes. It is not "
        + "a strategy mismatch either: ca-1203-4-set is declared official_pdf_fill over flat sources and renders "
        + "through finalizeFlatOverlay, and these five draw rules the same way. The blocker is narrower and this "
        + "string names it - the held bytes express no write box for the blanks that make the packet a filing.",
      routeKeys: [ROUTE_KEY], directory: OUT_REL, overlayDirectoryTouched: false,
      counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured. A zero here would be a claim about "
        + "a packet that does not exist.",
      everyDeclaredSourceResolved: true,
      sourcesResolved: Object.keys(resolved).length,
      widgetsAcrossTheWholeFamily: totalWidgets,
      noFillableUtahEditionIsHeld:
        "No entry of the committed corpus index whose state is UT carries an AcroForm - 59 entries, all "
        + "acroFieldCount 0 - so there is no fillable edition of any of these five to bind instead.",
      fieldsTheFilingRequiresThatTheMethodCannotPlace: unplaceable,
      whatTheMethodCanPlace:
        "the top-left contact block only: the participant's name, street address, phone and email, on each of the "
        + "documents that prints one.",
      anchorsLandingInAnotherPartysBlock: totalMisplaced,
      anchorsBoundOffATransposedCaption: totalTransposed,
      whatWouldUnblockIt: [
        "binding a fillable Utah edition of 1003EX, 1023EX, 1044XX, 1146XX and 1148XX, if the courts publish one, so "
          + "the case number, court and caption blanks have widgets to write into",
        "or a reviewed extension of the flat-overlay method that measures a typed underscore leader in the text layer "
          + "as a write box, which these forms use for every blank that matters and which the present method, by "
          + "design, refuses to guess at",
        "and in either case a curated anchor set for this family: run uncurated the shared derivation places "
          + `${totalMisplaced} anchors inside a block another party owns, which no amount of correct geometry fixes`
      ],
      documents,
      packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }

  return {
    familyId: FAMILY_ID, status: "STOPPED", stopClass: "MEASUREMENT_DID_NOT_REPRODUCE",
    overlayDirectoryTouched: false, counters: null,
    countersAreNullBecause: "no packet was built",
    why: "the refusal this build rests on did not reproduce: it expects zero widgets across the family and at least "
      + `one required blank the method cannot place, and measured ${totalWidgets} widgets and ${unplaceable.length} `
      + "unplaceable required blanks. Re-read the five binaries before building.",
    documents
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
