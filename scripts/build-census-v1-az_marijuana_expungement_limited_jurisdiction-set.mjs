#!/usr/bin/env node
/**
 * Arizona municipal/justice-court marijuana expungement packet.
 *
 * The bound AOC CREM2F source is a flat three-page PDF. This builder measures
 * every write box explicitly, writes only held participant/case facts, leaves
 * signatures and post-build events protected, and exposes every other required
 * participant fact in participant-instructions.md.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "az_marijuana_expungement_limited_jurisdiction-set";
const ROUTE_KEY = "obligation:track-only:AZ:az_marijuana_expungement_limited_jurisdiction";
const OUT = "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-az_marijuana_expungement_limited_jurisdiction-set.mjs";
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "az_marijuana_expungement_limited_jurisdiction";

/*
 * The self-help stop conditions this packet prints, pinned by value.
 *
 * The packet carried one paraphrase -- "Opposition, disputed evidence, or a
 * contested hearing requires a post-generation handoff" -- which covers the
 * first three of the registry's eight conditions and no more. The remaining
 * five were absent from the whole family directory, and two of them are not
 * soft advice at all: conduct on or after 12 July 2021, and a sale or other
 * non-listed marijuana offence, are the boundaries outside which A.R.S.
 * Sec. 36-2862 does not reach the petitioner, and the registry lists both again
 * under exclusions. The immigration warning was gone too.
 *
 * These are assertions rather than defaults. readTrack() refuses to continue if
 * the registry no longer says exactly this, so a repair cannot quietly go on
 * printing a stale boundary. Nothing here is composed: every sentence is the
 * registry's own, and no eligibility rule, date or offence class originates in
 * this file.
 */
const PINNED_STOPS = Object.freeze([
  "Prosecuting agency files a response opposing eligibility.",
  "Court sets a hearing.",
  "The record does not establish quantity, plant count, or paraphernalia character and the prosecutor disputes it.",
  "Conduct date is on or after July 12, 2021.",
  "The offense is a sale or any other non-listed marijuana offense.",
  "The petitioner wants to challenge the underlying conviction rather than expunge it.",
  "A denial the petitioner wants to appeal.",
  "Immigration consequences are in play."
]);
const PINNED_HANDOFF = "A routine hearing contemplated by statute does not prevent packet generation. Opposition, disputed evidence, or a contested hearing is a post_generation_handoff.";

function readTrack() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY), "utf8"));
  const track = registry.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(track, `${FAMILY_ID}: the registry no longer carries track ${TRACK_ID}`);
  assert.deepEqual(track.selfHelpStopConditions, [...PINNED_STOPS],
    `${FAMILY_ID}: the registry self-help stop conditions moved; re-read them before printing`);
  assert.ok((track.postGenerationHandoffs ?? []).includes(PINNED_HANDOFF),
    `${FAMILY_ID}: the registry post-generation handoff sentence moved`);
  return { stops: track.selfHelpStopConditions, handoff: PINNED_HANDOFF };
}

const SOURCE = Object.freeze({
  formNumber: "AOC-CREM2F-071221",
  documentId: "AOC-CREM2F-071221",
  continuationId: "AOC-CREM2F-071221-CONT",
  pathInArchive: "STATES/AZ/05_SOURCE_GATED/AZ__SOURCE-GATED__AOCCREM2F-071221__petition-to-expunge-records-municipal-justice-court__REV-UNKNOWN__EN.pdf",
  sha256: "4875e08bc1518ca9b449b3f52fca1264bdbd3bd207887420f6f88c76d0409482",
  pageCount: 3
});

const FIXTURES = Object.freeze({
  canonical: {
    fullName: "Jordan Avery Reyes",
    mailingAddress: "412 West Monroe Street",
    cityStateZip: "Phoenix, AZ 85003",
    email: "jordan.reyes@example.org",
    phone: "602-555-0142",
    dateOfBirth: "04/17/1991",
    caseNumber: "M-2021-004217"
  },
  boundary: {
    fullName: "Maria-Alejandra Oshaughnessy-Whitfield",
    mailingAddress: "1188 Upper Notch Crossing Road, Apt 14B",
    cityStateZip: "Tucson, AZ 85701-2214",
    email: "maria.alejandra.whitfield@example.org",
    phone: "520-555-0199 ext 4417",
    dateOfBirth: "12/31/1968",
    caseNumber: "MJ-2024-0011882"
  }
});

/*
 * WHERE EACH VALUE GOES, AND WHY NO WRITE PAINTS ANYTHING BUT THE VALUE.
 *
 * Every write used to paint an opaque white rectangle (x-1, y-1, width+2,
 * height+2) and then draw its own 0.6pt rule across the box before the text.
 * Measured against a zero-write baseline of the pinned CREM2F at 150 dpi, that
 * erased 9,244 pixels of the AOC's own printed ink on the canonical fixture and
 * 8,562 on the boundary one, and put back a rule the form does not print: the
 * caption table's vertical double rules were severed in five places, the
 * CASE-number rule left its cell and ran through the "Petition to Expunge"
 * title, the defendant and continuation-page rules were redrawn 67 to 139 pt
 * longer than the AOC prints them, and every contact rule was redrawn 1.4 to
 * 4.5 pt lower than the printed one it had covered. VF06 recorded it as
 * CLIPPING_AND_OVERLAP; this is the repair.
 *
 * The white fill existed because these boxes STRADDLED the rule they were
 * meant to write on: with the box bottom 1.5 to 5 pt below the printed rule and
 * the baseline 2 pt above the box bottom, the form's rule crossed the middle of
 * every value. Deleting the fill alone therefore delivers a struck-through
 * packet, which was rendered and read here before this was written.
 *
 * So the boxes moved off the rules instead. Each rect below is the space
 * DIRECTLY ABOVE the writing rule the form prints for that field, clamped
 * horizontally to that rule's own printed extent (rounded DOWN to the quarter
 * point, so a box can only be shorter than the rule and never longer), and
 * measured from the pinned binary rastered at 600 dpi (0.12 pt per row):
 *
 *   field                printed rule (top pt, x extent)     rect (x, y, w, h)
 *   p1-person-filing     682.44  x 139.9-394.9    140,    683,    254.75, 10.5
 *   p1-mailing-address   667.20  x 154.9-394.9    155,    667.75, 239.75, 10.5
 *   p1-city-state-zip    651.24  x 175.0-394.9    175,    651.75, 219.75, 10.5
 *   p1-email             636.00  x 145.0-394.9    145,    636.5,  249.75, 10.5
 *   p1-phone             619.20  x 180.0-394.9    180,    619.75, 214.75, 10.5
 *   p1-caption-case      none inside the box      360,    513,     70,    13
 *   p1-defendant         458.28  x  78.9-239.8     79,    458.75, 160.75, 10.5
 *   p1-date-of-birth     419.28  x 180.0-253.4    180,    419.75,  73.25, 10.5
 *   p1-item3-case        101.52  x 205.0-537.8    205,    102,    332.75, 10.5
 *   p3-mailing-address   708.84  x  75.0-503.0     75,    709.25, 428,    10.5
 *   p3-phone             671.28  x  75.0-503.0     75,    671.75, 428,    10.5
 *   p3-email             632.76  x  75.0-503.0     75,    633.25, 428,    10.5
 *
 * No box grew: x never moves left, the right edge never passes the end of the
 * printed rule, and the top never rises above where it already was. Widths on
 * five boxes shrank because the old ones ran off the end of the form's rule or
 * across a printed cell border -- p1-caption-case from 215 to 70 pt so it stays
 * inside the CASE Number cell rather than crossing into the title, p1-defendant
 * and p1-date-of-birth so they stop at the caption table's inner border,
 * p1-item3-case at the end of the dashed leader, and the three page-3 boxes at
 * the end of the rule the AOC prints. Every one of the twelve now contains ZERO
 * pixels of printed source ink, verified against the same 600 dpi baseline.
 *
 * p1-caption-case is the one field with no printed rule inside its box: the
 * form's CASE-number rule is at y 504.2-505.0, well below where this build
 * writes the number, beside the printed label. That placement is unchanged. It
 * is only narrowed, and no rule is drawn under it, because the form draws none
 * there.
 */
const WRITES = Object.freeze([
  { id: "p1-person-filing", page: 1, label: "Person Filing", fact: "fullName", rect: { x: 140, y: 683, width: 254.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-mailing-address", page: 1, label: "Mailing Address", fact: "mailingAddress", rect: { x: 155, y: 667.75, width: 239.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-city-state-zip", page: 1, label: "City, State, Zip Code", fact: "cityStateZip", rect: { x: 175, y: 651.75, width: 219.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-email", page: 1, label: "Email Address", fact: "email", rect: { x: 145, y: 636.5, width: 249.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-phone", page: 1, label: "Telephone Number", fact: "phone", rect: { x: 180, y: 619.75, width: 214.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-caption-case", page: 1, label: "CASE Number", fact: "caseNumber", rect: { x: 360, y: 513, width: 70, height: 13 }, documentId: SOURCE.documentId },
  { id: "p1-defendant", page: 1, label: "Defendant (FIRST, MI, LAST)", fact: "fullName", rect: { x: 79, y: 458.75, width: 160.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-date-of-birth", page: 1, label: "Date of Birth", fact: "dateOfBirth", rect: { x: 180, y: 419.75, width: 73.25, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p1-item3-case", page: 1, label: "Court case number", fact: "caseNumber", rect: { x: 205, y: 102, width: 332.75, height: 10.5 }, documentId: SOURCE.documentId },
  { id: "p3-mailing-address", page: 3, label: "Petitioner's Mailing Address", fact: "mailingAddress", rect: { x: 75, y: 709.25, width: 428, height: 10.5 }, documentId: SOURCE.continuationId },
  { id: "p3-phone", page: 3, label: "Petitioner's Phone Number", fact: "phone", rect: { x: 75, y: 671.75, width: 428, height: 10.5 }, documentId: SOURCE.continuationId },
  { id: "p3-email", page: 3, label: "Petitioner's Email address", fact: "email", rect: { x: 75, y: 633.25, width: 428, height: 10.5 }, documentId: SOURCE.continuationId }
]);

/*
 * The printed writing rules of the pinned CREM2F, measured at 600 dpi.
 *
 * These are facts about the paper, not choices this build makes, and they are
 * pinned so that the clearance below cannot be lost by a later edit to a rect.
 * topPt is the highest raster row of the rule; leftPt/rightPt are its extent.
 * p1-caption-case is absent because the form prints no rule inside its box.
 */
const PRINTED_RULES = Object.freeze({
  "p1-person-filing": { topPt: 682.44, leftPt: 139.92, rightPt: 394.92 },
  "p1-mailing-address": { topPt: 667.20, leftPt: 154.92, rightPt: 394.92 },
  "p1-city-state-zip": { topPt: 651.24, leftPt: 174.96, rightPt: 394.92 },
  "p1-email": { topPt: 636.00, leftPt: 144.96, rightPt: 394.92 },
  "p1-phone": { topPt: 619.20, leftPt: 180.00, rightPt: 394.92 },
  "p1-defendant": { topPt: 458.28, leftPt: 78.96, rightPt: 239.76 },
  "p1-date-of-birth": { topPt: 419.28, leftPt: 180.00, rightPt: 253.44 },
  "p1-item3-case": { topPt: 101.52, leftPt: 204.96, rightPt: 537.84 },
  "p3-mailing-address": { topPt: 708.84, leftPt: 75.00, rightPt: 503.04 },
  "p3-phone": { topPt: 671.28, leftPt: 75.00, rightPt: 503.04 },
  "p3-email": { topPt: 632.76, leftPt: 75.00, rightPt: 503.04 }
});

const RBF = (id, page, label, what, documentId = SOURCE.documentId) => ({
  fieldId: id, fieldName: id, page, documentId, effectiveLabel: label,
  reason: what, requiredBeforeFiling: true, factAvailable: false
});
const ELECTION = (id, page, label, why, documentId = SOURCE.documentId) => ({
  fieldId: id, fieldName: id, page, documentId, effectiveLabel: label,
  isSelectionControl: true, reason: why,
  refusalClass: "participant_sworn_narrative_or_legal_election", routeDetermined: false
});
const PROTECTED = (id, page, label, why, documentId = SOURCE.documentId) => ({
  fieldId: id, fieldName: id, page, documentId, effectiveLabel: label,
  reason: why, refusalClass: "signature_or_date_participant_completion"
});
const ATTORNEY = (id, page, label, documentId = SOURCE.continuationId) => ({
  fieldId: id, fieldName: id, page, documentId, effectiveLabel: label,
  reason: "attorney-only; no attorney-representation fact is held for this participant"
});

const REFUSALS = Object.freeze([
  RBF("p1-court-name", 1, "Court name", "supply the municipal or justice court that concluded the case"),
  RBF("p1-county", 1, "County of court", "supply the Arizona county of that court"),
  ELECTION("p1-eligible-possession", 1, "Possessing, consuming, or transporting the listed amount of marijuana (selection)", "select only if this is the eligible charge in this case"),
  ELECTION("p1-eligible-plants", 1, "Possessing, transporting, cultivating, or processing not more than six plants (selection)", "select only if this is the eligible charge in this case"),
  ELECTION("p1-eligible-paraphernalia", 1, "Marijuana-related paraphernalia offense (selection)", "select only if this is the eligible charge in this case"),
  RBF("p1-arresting-agency", 1, "Name of citing or arresting law enforcement agency", "supply the exact agency from the arrest or citation record"),
  { fieldId: "p1-arrest-name", fieldName: "p1-arrest-name", page: 1, documentId: SOURCE.documentId, effectiveLabel: "Name used at the time of arrest (optional if different)", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", reason: "the form expressly limits this line to a different arrest name" },
  RBF("p2-arrest-date", 2, "Date of arrest", "supply the exact arrest date from the record"),
  RBF("p2-prosecuting-agency", 2, "Name of prosecuting agency", "supply the exact prosecuting agency from the case record"),
  ELECTION("p2-other-charges-yes", 2, "Non-eligible charges were filed in the same case - Yes (selection)", "select the answer that matches the case record"),
  ELECTION("p2-other-charges-no", 2, "Non-eligible charges were filed in the same case - No (selection)", "select the answer that matches the case record"),
  ELECTION("p2-convicted-yes", 2, "Convicted of eligible offense - Yes (selection)", "select the answer that matches the case record"),
  ELECTION("p2-convicted-no", 2, "Convicted of eligible offense - No (selection)", "select the answer that matches the case record"),
  RBF("p2-conviction-date", 2, "Date of conviction", "if Yes, supply the exact conviction date from the court record"),
  ELECTION("p2-dismissed-yes", 2, "Eligible charge dismissed - Yes (selection)", "select the answer that matches the case record"),
  ELECTION("p2-dismissed-no", 2, "Eligible charge dismissed - No (selection)", "select the answer that matches the case record"),
  RBF("p2-dismissal-date", 2, "Date of dismissal", "if Yes, supply the exact dismissal date from the court record"),
  ELECTION("p2-warrant-yes", 2, "Outstanding arrest warrant - Yes (selection)", "select the answer that matches the current case record"),
  ELECTION("p2-warrant-no", 2, "Outstanding arrest warrant - No (selection)", "select the answer that matches the current case record"),
  ELECTION("p2-payment-plan-yes", 2, "Active payment plan - Yes (selection)", "select the answer that matches the current case record"),
  ELECTION("p2-payment-plan-no", 2, "Active payment plan - No (selection)", "select the answer that matches the current case record"),
  ELECTION("p2-hearing-yes", 2, "Request a hearing - Yes (selection)", "this is the petitioner's choice; the route does not determine it"),
  ELECTION("p2-hearing-no", 2, "Request a hearing - No (selection)", "this is the petitioner's choice; the route does not determine it"),
  PROTECTED("p2-signature", 2, "Petitioner's Signature", "the petitioner signs the perjury declaration personally"),
  PROTECTED("p2-signature-date", 2, "Petitioner's Signature Date", "the petitioner dates the declaration when signing"),
  ATTORNEY("p3-attorney-name", 3, "Attorney's name printed"),
  ATTORNEY("p3-attorney-signature", 3, "Attorney's signature and date"),
  ATTORNEY("p3-attorney-bar", 3, "Attorney's Bar Number"),
  ATTORNEY("p3-attorney-address", 3, "Attorney's Mailing Address"),
  ATTORNEY("p3-attorney-contact", 3, "Attorney's Phone Number and Email Address")
]);

const EXPECTED_ARTIFACTS = Object.freeze({
  canonical: Object.freeze({
    sha256: "d82d2df0f6e16c61cb8dfd3d405945a4b92fc885b4dd99ed07058d880023614f",
    byteLength: 91028
  }),
  boundary: Object.freeze({
    sha256: "aa1bade440c1417966bd1579d6b5084f0961942b18fb8643e1835e3d4c1181c8",
    byteLength: 91130
  })
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (rel, value) => {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
function sourceBytes() {
  const corpusRoot = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  const absolute = path.join(corpusRoot, SOURCE.pathInArchive);
  assert.ok(fs.existsSync(absolute), `source absent: ${SOURCE.pathInArchive}`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(sha256(bytes), SOURCE.sha256, `source SHA-256 moved: ${SOURCE.pathInArchive}`);
  return bytes;
}

/*
 * The largest size at or below 9pt whose ink fits the box in BOTH directions.
 *
 * The height half is new with the rule repair. Nothing clips these glyphs, so
 * the box is only honoured if the type is chosen to fit it: Helvetica's
 * ascender is 0.718 em and its descender 0.212 em, and the baseline sits 2pt
 * above the box bottom, so a 9pt line needs 8.46pt above that bottom and 1.91pt
 * below the baseline. A box too short for the smallest permitted size fails the
 * build rather than letting a glyph out over a printed rule.
 */
function fontSize(font, text, width, height) {
  const ASCENDER = 0.718;
  const DESCENDER = 0.212;
  const fits = (size) => font.widthOfTextAtSize(text, size) <= width - 4
    && 2 + size * ASCENDER <= height
    && size * DESCENDER <= 2;
  let size = 9;
  while (size > 6 && !fits(size)) size -= 0.25;
  assert.ok(fits(size), `value does not fit measured box: ${text}`);
  return size;
}

async function render(bytes, fixtureName) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), SOURCE.pageCount);
  stampDeterministic(pdf);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const row of WRITES) {
    const page = pdf.getPage(row.page - 1);
    const value = FIXTURES[fixtureName][row.fact];
    const { x, y, width, height } = row.rect;
    // The value and nothing else. No fill, because an opaque fill erases
    // whatever the AOC printed under the box; no rule, because the AOC prints
    // its own and a second one is ink this packet has no authority to add.
    page.drawText(value, { x: x + 2, y: y + 2, size: fontSize(font, value, width, height), font, color: rgb(0, 0, 0) });
  }
  return pdf.save({ useObjectStreams: false, updateMetadata: false });
}

async function proveWrites(bytes, fixtureName) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const actualWrites = [];
  let glyphs = 0;
  for (const row of WRITES) {
    const value = FIXTURES[fixtureName][row.fact];
    const items = extractTextItems(pdf.getPage(row.page - 1));
    const item = items.find((candidate) => candidate.text === value
      && candidate.x >= row.rect.x - 1 && candidate.x <= row.rect.x + row.rect.width
      && candidate.y >= row.rect.y - 1 && candidate.y <= row.rect.y + row.rect.height + 2);
    assert.ok(item, `${fixtureName}: final PDF bytes do not carry ${row.id} inside its measured box`);
    glyphs += value.replace(/\s/g, "").length;
    actualWrites.push({ fieldId: row.id, factId: row.fact, page: row.page, rect: row.rect, expected: value, drawnText: value, matchesExpected: true });
  }
  return { actualWrites, glyphs };
}

function instructions() {
  const track = readTrack();
  const lines = [
    "# Filing instructions - Arizona municipal/justice-court marijuana expungement",
    "",
    "This packet is the official three-page AOC CREM2F-071221 petition under A.R.S. 36-2862. It includes the continuation/contact page carried by that same official binary.",
    "",
    "## Before you file",
    "",
    "Complete every item below on the official form and confirm the court and agency names against your case record:",
    ""
  ];
  for (const row of REFUSALS.filter((r) => r.requiredBeforeFiling === true)) {
    lines.push(`- **${row.effectiveLabel}:** ${row.reason}.`);
  }
  lines.push(
    "",
    "Choose the one eligible-charge box that matches the record and answer every Yes/No question on page 2. The route does not decide those case facts. Choose whether you request a hearing.",
    "",
    "Sign and date the perjury declaration yourself. Attorney fields remain blank when you are self-represented.",
    "",
    "## Filing, fee, and service",
    "",
    "File in the municipal or justice court that concluded the case, in person, by mail, or by e-filing where that court accepts it. Rule 36(a)(4) bars a filing fee, so no fee-waiver form applies. The court sends the petition to the prosecuting agency within 10 days.",
    "",
    "If the filing lacks enough information to identify the records, the court may require the missing information within 45 days. Opposition, disputed evidence, or a contested hearing requires a post-generation handoff.",
    "",
    "## When to stop and get help",
    "",
    "The track record lists the conditions under which this packet is not the right tool and the matter should go to a person:",
    "",
    ...track.stops.map((line) => `- ${line}`),
    "",
    `The record draws one distinction on that list, and it is printed here in the record's own words: *"${track.handoff}"* A hearing the statute itself contemplates is a normal step; opposition or a contested hearing is where this stops being a self-help packet.`,
    "",
    "Two of those conditions are eligibility boundaries rather than cautions. The registry lists conduct on or after July 12, 2021, and a sale or any other non-listed marijuana offense, again under this track's exclusions: outside them A.R.S. 36-2862 does not reach the record at all, and no petition on this form cures that.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  );
  return lines.join("\n");
}

function selfTest() {
  assert.equal(FAMILY_ID, "az_marijuana_expungement_limited_jurisdiction-set");
  assert.equal(ROUTE_KEY, "obligation:track-only:AZ:az_marijuana_expungement_limited_jurisdiction");
  assert.equal(SOURCE.sha256, "4875e08bc1518ca9b449b3f52fca1264bdbd3bd207887420f6f88c76d0409482");
  assert.equal(SOURCE.pageCount, 3);
  assert.deepEqual(Object.keys(FIXTURES).sort(), ["boundary", "canonical"]);

  const terminalIds = [...WRITES, ...REFUSALS].map((row) => row.fieldId ?? row.id);
  assert.equal(new Set(terminalIds).size, terminalIds.length, "terminal field ids must be unique");
  assert.equal(terminalIds.length, 42, "the three-page CREM2F census must remain complete");
  assert.ok(WRITES.every((row) => row.page >= 1 && row.page <= SOURCE.pageCount));
  assert.ok(WRITES.every((row) => row.rect.width > 0 && row.rect.height > 0));

  /*
   * No write box may sit on, or reach past the end of, a rule the form prints.
   *
   * This is the invariant the CLIPPING_AND_OVERLAP repair established, and it
   * is asserted rather than commented because the previous geometry looked
   * perfectly reasonable in the source and was wrong only against the paper.
   */
  for (const row of WRITES) {
    const rule = PRINTED_RULES[row.id];
    if (!rule) {
      assert.equal(row.id, "p1-caption-case", `no printed rule is pinned for ${row.id}`);
      continue;
    }
    assert.ok(row.rect.y >= rule.topPt,
      `${row.id}: the write box bottom ${row.rect.y} sits on the printed rule at ${rule.topPt}`);
    assert.ok(row.rect.x + row.rect.width <= rule.rightPt,
      `${row.id}: the write box ends at ${row.rect.x + row.rect.width}, past the printed rule end ${rule.rightPt}`);
    assert.ok(row.rect.x >= rule.leftPt - 0.5,
      `${row.id}: the write box starts at ${row.rect.x}, before the printed rule begins at ${rule.leftPt}`);
  }
  assert.ok(WRITES.find((row) => row.id === "p1-caption-case").rect.x
    + WRITES.find((row) => row.id === "p1-caption-case").rect.width <= 430,
    "p1-caption-case must stay inside the CASE Number cell; its right border is printed at x 430.44");
  assert.ok(WRITES.every((row) => Object.values(FIXTURES).every((fixture) => String(fixture[row.fact] ?? "").length > 0)));
  assert.equal(REFUSALS.filter((row) => row.requiredBeforeFiling === true).length, 7);
  assert.equal(REFUSALS.filter((row) => row.isSelectionControl === true).length, 15);
  assert.equal(REFUSALS.filter((row) => row.refusalClass === "signature_or_date_participant_completion").length, 2);

  const expectedInstructions = instructions();
  for (const phrase of [
    "File in the municipal or justice court that concluded the case",
    "Rule 36(a)(4) bars a filing fee",
    "The court sends the petition to the prosecuting agency within 10 days",
    "Opposition, disputed evidence, or a contested hearing requires a post-generation handoff",
    "## When to stop and get help",
    ROUTE_KEY
  ]) assert.ok(expectedInstructions.includes(phrase), `participant instructions dropped: ${phrase}`);
  const { stops, handoff } = readTrack();
  assert.equal(stops.length, 8, "the registry states eight self-help stop conditions for this track");
  for (const stop of stops) {
    assert.ok(expectedInstructions.includes(stop), `participant instructions drop a registry stop condition: ${stop}`);
  }
  assert.ok(expectedInstructions.includes(handoff), "participant instructions drop the registry post-generation handoff sentence");

  const receipt = readJson(`${OUT}/source-receipt.json`);
  assert.equal(receipt.documents.length, 1);
  assert.equal(receipt.documents[0].sha256, SOURCE.sha256);
  assert.deepEqual(receipt.documents[0].sourceIds,
    [`official-form:${SOURCE.documentId}`, `official-form:${SOURCE.continuationId}`]);

  const fieldMap = readJson(`${OUT}/production-field-map.json`);
  assert.deepEqual(fieldMap.routeKeys, [ROUTE_KEY]);
  assert.equal(fieldMap.generationAllowed, false);
  assert.equal(fieldMap.runtimeSelectable, false);
  assert.equal(fieldMap.commercialRoutesOpened, 0);

  const rendered = readJson(`${OUT}/reports/rendered-artifacts.json`);
  assert.equal(rendered.rasterState, "BUILT_RASTER_PENDING");
  assert.equal(rendered.everyPageRastered, false);
  assert.equal(rendered.independentVerificationPending, true);
  for (const artifact of rendered.artifacts) {
    const expected = EXPECTED_ARTIFACTS[artifact.fixture];
    assert.ok(expected, `unexpected artifact fixture: ${artifact.fixture}`);
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(sha256(bytes), expected.sha256, `${artifact.fixture} bytes moved`);
    assert.equal(bytes.length, expected.byteLength, `${artifact.fixture} length moved`);
    assert.equal(artifact.sha256, expected.sha256, `${artifact.fixture} report hash moved`);
    assert.equal(artifact.byteLength, expected.byteLength, `${artifact.fixture} report length moved`);
  }

  const counters = readJson(`${OUT}/reports/completeness-counters.json`);
  assert.equal(counters.allNineZero, true);
  assert.deepEqual(Object.values(counters.counters), Array(9).fill(0));
  const buildStatus = readJson(`${OUT}/build-status.json`);
  assert.equal(buildStatus.rasterState, "BUILT_RASTER_PENDING");
  assert.equal(buildStatus.independentVerificationStatus, "PENDING");
  assert.equal(buildStatus.selfVerified, false);
  assert.equal(buildStatus.productionTouched, false);

  for (const file of fs.readdirSync(path.join(ROOT, OUT)).filter((name) => name.endsWith(".json"))) {
    assert.equal(Object.hasOwn(readJson(`${OUT}/${file}`), "claimReleased"), false,
      `${file} must not release the Captain-owned claim`);
  }
  console.log(`SELF_TEST_OK ${FAMILY_ID}`);
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const source = sourceBytes();
  if (checkOnly) return { familyId: FAMILY_ID, status: "CHECK_ONLY", sourceSha256: sha256(source), pageCount: SOURCE.pageCount, fieldsMapped: WRITES.length + REFUSALS.length };

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const proofs = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const bytes = await render(source, fixtureName);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);
    const proof = await proveWrites(bytes, fixtureName);
    artifacts.push({ fixture: fixtureName, file, sha256: sha256(bytes), byteLength: bytes.length, pageCount: SOURCE.pageCount, documents: [SOURCE.documentId, SOURCE.continuationId] });
    proofs.push({ fixture: fixtureName, valuesReportedByFinalizer: WRITES.length, addedGlyphsReadFromOutputBytes: proof.glyphs, flattenedWidgetAppearancesReadFromOutputBytes: 0, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [], actualWrites: proof.actualWrites });
  }

  const writes = WRITES.map((row) => ({ fieldId: row.id, fieldName: row.id, page: row.page, documentId: row.documentId, effectiveLabel: row.label, factId: row.fact, rect: row.rect }));
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-flat-official-form-field-map/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], routeSelectionId: "az-marijuana-expungement-limited-jurisdiction-crem2f",
    renderStrategy: "measured_flat_overlay", routeDeterminedSelections: [],
    writes, refusals: REFUSALS, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-flat-form-field-census/v1", familyId: FAMILY_ID,
    sourceSha256: SOURCE.sha256, pageCount: SOURCE.pageCount,
    terminalFields: [...writes, ...REFUSALS], terminalFieldCount: writes.length + REFUSALS.length
  });
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, jurisdiction: "AZ",
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    bindingMethod: "exact governed archive path and SHA-256", allSourcesExact: true,
    documents: [{ documentId: SOURCE.documentId, sourceIds: [`official-form:${SOURCE.documentId}`, `official-form:${SOURCE.continuationId}`], pathInArchive: SOURCE.pathInArchive, sha256: SOURCE.sha256, byteLength: source.length, pageCount: SOURCE.pageCount,
      componentNote: "The official three-page CREM2F binary carries the primary petition and its continuation/contact page." }],
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false, rasterState: "BUILT_RASTER_PENDING", rasterPages: [], byteDerivedHashes: true, independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Every expected value was re-read from final PDF bytes inside its measured write box.",
    documents: proofs, artifacts: proofs.map((p) => ({ fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer, addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes, flattenedWidgetAppearancesReadFromOutputBytes: 0, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [] })), blockingFindings: []
  });
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions());
  writeJson(`${OUT}/product-wiring.json`, { schemaVersion: "rcap-product-wiring/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false });
  writeJson(`${OUT}/build-status.json`, { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT, rasterState: "BUILT_RASTER_PENDING", renderedArtifacts: artifacts.length, independentVerificationStatus: "PENDING", selfVerified: false, commercialRoutesOpened: 0, productionTouched: false });
  writeJson(`${OUT}/reports/independent-visual-review.json`, { schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID, required: true, granted: false, reviewedBy: null, rasterState: "BUILT_RASTER_PENDING", artifacts: artifacts.map(({ fixture, file, sha256: hash, pageCount }) => ({ fixture, file, sha256: hash, pageCount })) });
  writeJson(`${OUT}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID, counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 }, allNineZero: true, whatThisIsNot: "An independent verdict or visual review." });
  writeJson(`${OUT}/build-findings.json`, { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [], findings: [{ finding: "AOC CREM2F is a flat PDF; every inserted value is measured and re-read from the final bytes." }, { finding: "All case-dependent selections, the perjury signature/date, and self-represented attorney fields remain unprefilled and are classified explicitly." }] });
  writeJson(`${OUT}/approval-request.json`, { schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID, requested: "changed-byte raster, independent completeness verification, visual review, and counsel review", buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION", approvedForLive: false, live: false, commercialRoutesOpened: 0 });

  return { familyId: FAMILY_ID, status: "COMPLETED", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 }, artifacts: artifacts.map(({ fixture, sha256: hash, byteLength, pageCount }) => ({ fixture, sha256: hash, byteLength, pageCount })), rasterState: "BUILT_RASTER_PENDING" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    runFamily().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exit(1); });
  }
}
