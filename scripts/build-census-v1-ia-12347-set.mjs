#!/usr/bin/env node
/**
 * Iowa Rule 2.86 - Form 4: Application to Expunge Possession of Alcohol under
 * the Legal Age Court Records under Iowa Code section 123.47.
 *
 *   node scripts/build-census-v1-ia-12347-set.mjs [--no-raster]
 *
 * ONE BINARY, TWO COMPONENTS
 *
 * The custody reconciliation resolves BOTH official-form labels this family
 * names -- "Rule 2.86 Form 4" and "Certification of Service by Mailing or
 * Delivery" -- to the same two-page binary, on first-hand document text: the
 * certification is the section heading printed on page 2 of the application
 * itself. So the packet is one source document carrying two components, and the
 * source receipt says so rather than pretending to two files.
 *
 * A FLAT FORM
 *
 * The binary carries no AcroForm at all (0 fields, 2 pages, 612x792). Its
 * blanks are printed rules, so values are drawn into page content. Every
 * coordinate below was measured off THIS binary with a text-extent read of the
 * printed captions, and every write is verified back out of the saved bytes
 * rather than from the drawing call: the content streams are decompressed, the
 * hex-encoded show-text operators are decoded, and each drawn string is matched
 * to the box the map declared for it.
 *
 * WHAT THIS PACKET ANSWERS AND WHAT IT DOES NOT
 *
 * The two numbered items are the statutory elements of the section 123.47(9)
 * route this packet is built for, so the packet states them and writes the
 * conviction date.
 *
 * The two "Read Before Signing" boxes are NOT statutory elements. The form
 * prints "Please check each statement below after you have read it", which is
 * an act of the person filing, and nothing here can perform it for them. They
 * are carried as genuine participant elections, left unmarked, and disclosed.
 * The same holds for the A/B representation election, and for every field of
 * the certification of service: a certificate of mailing completed before the
 * mailing happened would be false on its face.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS, classifyField } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ia-12347-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-pathway:IA:ia-12347:underage-alcohol-12347";
const FORM_ID = "Rule 2.86 Form 4";
const CERT_ID = "Certification of Service by Mailing or Delivery";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const SOURCE = Object.freeze({
  path: "STATES/IA/02_PACKET_FORMS/IA__FORM__RULE-2.86-FORM-4__application-to-expunge-possession-of-alcohol-under-the-legal-age-court-records-under-iowa__REV-2024-08__EN.pdf",
  sha256: "279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45"
});
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const SIGNATURE_CLASS = "signature_or_date_participant_completion";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/* ------------------------------------------------------------------ *
 * The two fixtures. Synthetic participants, not real people.
 * ------------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Walnut Street, Apartment 7",
    "participant.city": "Des Moines",
    "participant.state": "Iowa",
    "participant.zip": "50309",
    "participant.phone_area_code": "515",
    "participant.phone_line": "555-0142",
    "participant.email": "jordan.reyes@example.org",
    "case.filing_county": "Polk",
    "case.case_number": "SMSM123456",
    "case.conviction_month": "June",
    "case.conviction_day": "14",
    "case.conviction_year": "2021"
  },
  boundary: {
    "participant.full_legal_name": "Alexandria Catherine Montgomery-Washington",
    "participant.street_address": "1188 Long Meadow Boulevard, Apartment 1407",
    "participant.city": "Council Bluffs",
    "participant.state": "Iowa",
    "participant.zip": "51503-4417",
    "participant.phone_area_code": "712",
    "participant.phone_line": "555-0199",
    "participant.email": "alexandria.montgomery.washington@example.org",
    "case.filing_county": "Pottawattamie",
    "case.case_number": "SMSM987654321",
    "case.conviction_month": "September",
    "case.conviction_day": "30",
    "case.conviction_year": "2019"
  }
};

/* ------------------------------------------------------------------ *
 * Every write, at coordinates measured off this exact binary.
 *
 * `rect` is the printed slot the value must land inside: x/y is the baseline
 * left, width the printed rule's usable run, height the line box. The byte
 * proof below reads each drawn string back out of the saved content streams and
 * refuses any that landed outside its own rect.
 * ------------------------------------------------------------------ */
const WRITES = [
  { id: "filing_county", page: 1, label: "County where you are filing this Application", factId: "case.filing_county",
    rect: { x: 302, y: 679, width: 130, height: 12 },
    basis: "the printed caption \"In the Iowa District Court for\" ends at x 295.8 and the printed word \"County\" resumes at x 436.1 on the same line" },
  { id: "case_number", page: 1, label: "Case no.", factId: "case.case_number",
    rect: { x: 365, y: 638, width: 168, height: 12 },
    basis: "the printed caption \"Case no.\" occupies x 314.9-359.0 and the rule runs to the caption block edge at x 540" },
  { id: "defendant_name", page: 1, label: "Defendant", factId: "participant.full_legal_name",
    rect: { x: 74, y: 583, width: 225, height: 12 },
    basis: "the printed sub-caption \"Defendant\" sits at x 72.0-130.7 directly beneath the rule this value is written on" },
  { id: "eligible_conviction_selected", page: 1, isSelectionControl: true,
    label: "Convicted under Iowa Code section 123.47, possession of alcohol under the legal age, or a similar local ordinance",
    factId: "route.ia_123_47_conviction",
    rect: { x: 91, y: 395, width: 8, height: 8 },
    box: { x0: 90.0, y0: 393.3, x1: 100.0, y1: 403.2 },
    basis: "the printed 10-point box beside numbered item one, measured at x 90.0-100.0 and y 393.3-403.2" },
  { id: "conviction_month", page: 1, label: "Month of the conviction", factId: "case.conviction_month",
    rect: { x: 110, y: 371, width: 74, height: 12 },
    basis: "the printed sub-caption \"Month\" sits at x 108.0-134.1 beneath this rule, which runs to the \"Day\" column at x 189" },
  { id: "conviction_day", page: 1, label: "Day of the conviction", factId: "case.conviction_day",
    rect: { x: 190, y: 371, width: 24, height: 12 },
    basis: "the printed sub-caption \"Day\" sits at x 189.0-205.7 and the printed comma follows at x 216.0" },
  { id: "conviction_year", page: 1, label: "Year of the conviction", factId: "case.conviction_year",
    rect: { x: 226, y: 371, width: 26, height: 12 },
    basis: "the printed sub-caption \"Year\" sits at x 225.0-243.9, after the printed comma at x 216.0" },
  { id: "no_later_disqualifying_conviction_selected", page: 1, isSelectionControl: true,
    label: "No criminal convictions in the two-year period following, other than local traffic violations or simple misdemeanor violations under Iowa Code chapter 321",
    factId: "route.no_later_disqualifying_conviction",
    rect: { x: 91, y: 338, width: 8, height: 8 },
    box: { x0: 90.0, y0: 336.6, x1: 100.0, y1: 346.6 },
    basis: "the printed 10-point box beside numbered item two, measured at x 90.0-100.0 and y 336.6-346.6" },
  { id: "self_represented_name", page: 2, label: "Print your full name: first, middle, last", factId: "participant.full_legal_name",
    rect: { x: 122, y: 641, width: 195, height: 12 },
    basis: "the printed \"I,\" ends at x 114.7 and the printed comma resumes at x 319.6 on the same line, over the sub-caption at x 139.9-295.0" },
  { id: "mailing_address", page: 2, label: "Mailing address", factId: "participant.street_address",
    rect: { x: 110, y: 554, width: 425, height: 12 },
    basis: "the printed sub-caption \"Mailing address\" sits at x 108.0-173.3 beneath this rule" },
  { id: "city", page: 2, label: "City", factId: "participant.city",
    rect: { x: 110, y: 523, width: 183, height: 12 },
    basis: "the printed sub-caption \"City\" sits at x 108.0-124.5 and the printed comma closes the column at x 297.0" },
  { id: "state", page: 2, label: "State", factId: "participant.state",
    rect: { x: 308, y: 523, width: 120, height: 12 },
    basis: "the printed sub-caption \"State\" sits at x 306.0-326.0 and the \"ZIP code\" column begins at x 432.0" },
  { id: "zip", page: 2, label: "ZIP code", factId: "participant.zip",
    rect: { x: 434, y: 523, width: 100, height: 12 },
    basis: "the printed sub-caption \"ZIP code\" sits at x 432.0-468.5 and the rule runs to the text block edge at x 540" },
  { id: "phone_area_code", page: 2, label: "Phone number area code", factId: "participant.phone_area_code",
    rect: { x: 116, y: 492, width: 24, height: 12 },
    basis: "the printed parentheses are drawn at x 108.0-112.0 and x 142.1-146.1 on this rule" },
  { id: "phone_line", page: 2, label: "Phone number", factId: "participant.phone_line",
    rect: { x: 150, y: 492, width: 140, height: 12 },
    basis: "the rule resumes after the printed closing parenthesis at x 146.1 and runs to the Email column at x 306.0" },
  { id: "email", page: 2, label: "Email address", factId: "participant.email",
    rect: { x: 308, y: 492, width: 228, height: 12 },
    basis: "the printed sub-caption \"Email address\" sits at x 306.0-363.5 and the rule runs to the text block edge at x 540" }
];

/* ------------------------------------------------------------------ *
 * Every blank, and the reason it is blank.
 * ------------------------------------------------------------------ */
const ELECTIONS = [
  { id: "service_acknowledgment", document: FORM_ID, page: 1,
    label: "I understand that I must provide a copy of this application to the county attorney",
    box: { x0: 72.0, y0: 241.6, x1: 82.0, y1: 251.6 },
    why: "the form prints \"Please check each statement below after you have read it\" above these boxes; reading is an act of the person filing and nothing here can perform it for them" },
  { id: "confidentiality_acknowledgment", document: FORM_ID, page: 1,
    label: "I understand that the records in a criminal case expunged under this section are confidential and exempt from public access",
    box: { x0: 72.0, y0: 221.8, x1: 82.0, y1: 231.8 },
    why: "the form prints \"Please check each statement below after you have read it\" above these boxes; reading is an act of the person filing and nothing here can perform it for them" },
  { id: "representation_election", document: FORM_ID, page: 2,
    label: "Check one: A if the defendant is self-represented, B if a lawyer is filing on the defendant's behalf",
    box: { x0: 90.0, y0: 678.8, x1: 100.0, y1: 688.7 },
    why: "the platform holds no representation fact; the self-represented block is drafted for review and the election itself stays with the person filing" }
];

const PROTECTED = [
  { id: "self_represented_signature", document: FORM_ID, page: 2, label: "Self-represented defendant's signature",
    reason: "signature or date field; never prefilled by this build" },
  { id: "self_represented_signature_date", document: FORM_ID, page: 2, label: "Date beside the self-represented defendant's signature",
    reason: "signature or date field; never prefilled by this build" },
  { id: "attorney_signature", document: FORM_ID, page: 2, label: "Attorney's signature",
    reason: "signature or date field; never prefilled by this build" },
  { id: "attorney_signature_date", document: FORM_ID, page: 2, label: "Date beside the attorney's signature",
    reason: "signature or date field; never prefilled by this build" },
  { id: "certificate_certifier_name", document: CERT_ID, page: 2, label: "Name of the person certifying the mailing or delivery",
    reason: "signature or date field; never prefilled by this build" },
  { id: "certificate_service_date", document: CERT_ID, page: 2, label: "Date on which the copy was mailed or delivered",
    reason: "signature or date field; never prefilled by this build" }
];

const ATTORNEY_ONLY = [
  { id: "attorney_law_firm", label: "Name of law firm, if applicable" },
  { id: "attorney_mailing_address", label: "Attorney mailing address" },
  { id: "attorney_city", label: "Attorney city" },
  { id: "attorney_state", label: "Attorney state" },
  { id: "attorney_zip", label: "Attorney ZIP code" },
  { id: "attorney_phone", label: "Attorney phone number" },
  { id: "attorney_email", label: "Attorney email address" },
  { id: "attorney_additional_email", label: "Attorney additional email address, if applicable" }
];

const REQUIRED_BEFORE_FILING = [
  { id: "certificate_recipient_name", document: CERT_ID, page: 2,
    label: "Name of person to whom I delivered or mailed it",
    supply: "the name of the county attorney, or the person in that office, you actually mail or hand the copy to" },
  { id: "certificate_recipient_mailing_address", document: CERT_ID, page: 2,
    label: "Mailing address of the person served",
    supply: "the street or post-office address of the county attorney's office for the county you are filing in" },
  { id: "certificate_recipient_city", document: CERT_ID, page: 2,
    label: "City of the person served",
    supply: "the city of that same county attorney's office" },
  { id: "certificate_recipient_state", document: CERT_ID, page: 2,
    label: "State of the person served",
    supply: "the state of that same county attorney's office" },
  { id: "certificate_recipient_zip", document: CERT_ID, page: 2,
    label: "ZIP code of the person served",
    supply: "the ZIP code of that same county attorney's office" },
  /*
   * The caption's second plaintiff line. The form prints "State of Iowa or
   * ______" because a section 123.47 charge may be prosecuted by the State or
   * by a city under a similar local ordinance, and the two produce different
   * captions. The platform holds the case number but not the prosecuting
   * entity's name, and inventing a city would put a false plaintiff on a filing
   * sworn under penalty of perjury. It is carried and disclosed rather than
   * left as an unaccounted printed rule.
   */
  { id: "caption_alternative_plaintiff", document: FORM_ID, page: 1,
    label: "Name of the city or town that prosecuted the case, where it was not the State of Iowa",
    supply: "the name of the city or town, if a city prosecuted this case under its own ordinance; leave it blank if the caption on your court record reads State of Iowa" }
];

/* ---- source binding ------------------------------------------------------ */
function resolveSource() {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) return { failure: { sourceIdentity: `official-form:${FORM_ID}`, why: `no committed index entry at ${SOURCE.path}` } };
  if (entry.sha256 !== SOURCE.sha256) return { failure: { sourceIdentity: `official-form:${FORM_ID}`, why: `the committed index pins ${entry.sha256}; this build binds ${SOURCE.sha256}` } };
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const absolute = resolver.resolve(entry);
  if (!absolute || !fs.existsSync(absolute)) return { failure: { sourceIdentity: `official-form:${FORM_ID}`, why: `the custody holding ${SOURCE.path} is not mounted here` } };
  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) return { failure: { sourceIdentity: `official-form:${FORM_ID}`, why: `SHA-256 drift: the corpus binary hashes ${digest}` } };
  return { bytes, byteLength: bytes.length, pathInArchive: SOURCE.path, sha256: digest, revision: "REV-2024-08" };
}

/** Both official-form labels this family names, and the custody evidence that resolves them. */
function custodyEvidence() {
  const custody = readJson(CUSTODY);
  const row = (custody.rows ?? []).find((r) => r.worklistGroupId === FAMILY_ID);
  assert.ok(row, "the custody reconciliation carries no row for this family");
  assert.equal(row.custodyClass, "SOURCE_ALREADY_HELD");
  const sources = row.documentSources.filter((s) => s.resolved && s.heldAs?.sha256 === SOURCE.sha256);
  assert.equal(sources.length, 2, "both official-form labels must resolve to this one binary");
  return sources.map((s) => ({ sourceId: s.sourceId, tier: s.tier, identityEvidence: s.identityEvidence }));
}

/* ---- render -------------------------------------------------------------- */
function fittedSize(font, text, width) {
  let size = 9.5;
  while (size > 5 && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  return { size, fits: font.widthOfTextAtSize(text, size) <= width };
}

async function renderFixture(sourceBytes, fixtureName, facts) {
  const pdf = await PDFDocument.load(sourceBytes);
  assert.equal(pdf.getPageCount(), 2, "Rule 2.86 Form 4 must remain a two-page document");
  assert.equal(pdf.getForm().getFields().length, 0, "Rule 2.86 Form 4 must remain the measured flat source");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const drawn = [];
  const unfittable = [];
  for (const row of WRITES) {
    const text = row.isSelectionControl ? "X" : String(facts[row.factId] ?? "");
    assert.ok(text.length > 0, `no fixture value for ${row.factId}`);
    const { size, fits } = fittedSize(font, text, row.rect.width);
    if (!fits) { unfittable.push({ field: row.id, text, width: row.rect.width }); continue; }
    pdf.getPage(row.page - 1).drawText(text, { x: row.rect.x, y: row.rect.y, size, font, color: rgb(0, 0, 0) });
    drawn.push({ ...row, text, fontSize: size, widthOfDrawnText: font.widthOfTextAtSize(text, size) });
  }
  assert.equal(unfittable.length, 0, `values that do not fit their measured slot: ${JSON.stringify(unfittable)}`);
  pdf.setTitle(`${FAMILY_ID} ${fixtureName}`);
  pdf.setAuthor("LegalEase packet factory");
  pdf.setSubject("Application to Expunge Possession of Alcohol under the Legal Age Court Records under Iowa Code section 123.47");
  pdf.setCreator("LegalEase deterministic flat-form builder");
  pdf.setProducer("pdf-lib 1.17.1");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, drawn };
}

/* ---- the byte proof ------------------------------------------------------
 *
 * Not the drawing call's own report. The saved bytes are re-opened, every page
 * content stream is decompressed, and the hex-encoded show-text operators are
 * decoded with the position matrix that precedes each one. A write is proved
 * when its exact string is found in the output at the coordinates the field map
 * declared, and the streams the source already carried are excluded so nothing
 * printed by the court is counted as ink this build added.
 * -------------------------------------------------------------------------- */
async function streamsOf(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const perPage = [];
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents();
    const list = contents && contents.constructor.name === "PDFArray"
      ? contents.asArray().map((ref) => pdf.context.lookup(ref))
      : contents ? [contents] : [];
    const decoded = [];
    for (const stream of list) {
      const raw = Buffer.from(stream.getContents());
      let text;
      try { text = zlib.inflateSync(raw).toString("latin1"); } catch { text = raw.toString("latin1"); }
      decoded.push(text);
    }
    perPage.push(decoded);
  }
  return perPage;
}

const SHOW_TEXT = /1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*\n<([0-9A-Fa-f]*)> Tj/g;
const FONT_SIZE = /\/[^\s]+ ([\d.]+) Tf/;

function parseAddedText(added) {
  const found = [];
  for (const stream of added) {
    const size = Number(FONT_SIZE.exec(stream)?.[1] ?? 0);
    SHOW_TEXT.lastIndex = 0;
    let m;
    while ((m = SHOW_TEXT.exec(stream)) !== null) {
      const text = Buffer.from(m[3], "hex").toString("latin1");
      found.push({ x: Number(m[1]), y: Number(m[2]), size, text });
    }
  }
  return found;
}

async function proveWrites(sourceBytes, outputBytes, drawn, fixtureName) {
  const before = await streamsOf(sourceBytes);
  const after = await streamsOf(outputBytes);
  assert.equal(before.length, after.length, "the output must carry the same page count as the source");
  const proofs = [];
  let addedGlyphs = 0;
  let outsideBoxes = 0;
  const unproved = [];
  for (let p = 0; p < after.length; p += 1) {
    const original = new Set(before[p]);
    const added = after[p].filter((s) => !original.has(s));
    const ops = parseAddedText(added);
    for (const op of ops) addedGlyphs += op.text.replace(/\s/g, "").length;
    for (const row of drawn.filter((r) => r.page === p + 1)) {
      const hit = ops.find((op) => op.text === row.text
        && Math.abs(op.x - row.rect.x) < 0.51 && Math.abs(op.y - row.rect.y) < 0.51);
      if (!hit) { unproved.push({ field: row.id, page: row.page, expected: row.text }); continue; }
      const right = hit.x + row.widthOfDrawnText;
      const inside = hit.x >= row.rect.x - 1 && right <= row.rect.x + row.rect.width + 1
        && hit.y >= row.rect.y - 3 && hit.y + hit.size <= row.rect.y + row.rect.height + 3;
      if (!inside) outsideBoxes += row.text.replace(/\s/g, "").length;
      proofs.push({
        field: `${row.document ?? FORM_ID}:${row.id}`, fieldName: row.id, effectiveLabel: row.label,
        documentId: row.document ?? FORM_ID, page: row.page, factId: row.factId,
        expected: row.text, drawnText: hit.text,
        drawnAt: { x: hit.x, y: hit.y, fontSize: hit.size },
        declaredRect: row.rect,
        visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true,
        insideDeclaredRect: inside
      });
    }
    // Any decoded show-text operator in an added stream that no declared write
    // accounts for is ink this build cannot explain, and it is counted as such.
    for (const op of ops) {
      const claimed = drawn.some((r) => r.page === p + 1 && r.text === op.text
        && Math.abs(op.x - r.rect.x) < 0.51 && Math.abs(op.y - r.rect.y) < 0.51);
      if (!claimed) outsideBoxes += op.text.replace(/\s/g, "").length;
    }
  }
  assert.equal(unproved.length, 0,
    `${unproved.length} declared write(s) are not readable in the ${fixtureName} output bytes: ${JSON.stringify(unproved)}`);
  return { proofs, addedGlyphs, outsideBoxes };
}

/* ---- the field map ------------------------------------------------------- */
function productionFieldMap(drawn) {
  const writes = drawn.map((row) => ({
    fieldId: `${row.document ?? FORM_ID}:${row.id}`, fieldName: row.id, field: row.id,
    effectiveLabel: row.label, printedLabel: row.label, sourceLabel: row.label,
    documentId: row.document ?? FORM_ID, page: row.page, factId: row.factId,
    rect: row.rect, rectBasis: row.basis, kind: row.isSelectionControl ? "selection_control" : "flat_slot",
    disposition: row.isSelectionControl ? "selected_by_route" : "written",
    routeDetermined: row.isSelectionControl === true
  }));
  const refusals = [
    ...ELECTIONS.map((row) => ({
      fieldId: `${row.document}:${row.id}`, fieldName: row.id, field: row.id,
      effectiveLabel: row.label, printedLabel: row.label,
      documentId: row.document, page: row.page, box: row.box, isSelectionControl: true, kind: "selection_control",
      reason: `a participant election the route does not determine: ${row.why}`,
      refusalClass: ELECTION_CLASS, completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
      requiredBeforeFiling: false, routeDetermined: false, factAvailable: false,
      why: row.why, role: "participant"
    })),
    ...PROTECTED.map((row) => ({
      fieldId: `${row.document}:${row.id}`, fieldName: row.id, field: row.id,
      effectiveLabel: row.label, printedLabel: row.label,
      documentId: row.document, page: row.page,
      reason: row.reason, refusalClass: SIGNATURE_CLASS,
      requiredBeforeFiling: false, routeDetermined: false, role: "protected",
      why: "a signature, a signature date, or a certificate of mailing that has not happened yet"
    })),
    ...ATTORNEY_ONLY.map((row) => ({
      fieldId: `${FORM_ID}:${row.id}`, fieldName: row.id, field: row.id,
      effectiveLabel: row.label, printedLabel: row.label,
      documentId: FORM_ID, page: 2,
      reason: "attorney-only field; no representation fact is held for this participant",
      refusalClass: null, requiredBeforeFiling: false, routeDetermined: false, role: "attorney",
      why: "this packet is drafted for a self-represented filer and never populates the attorney block"
    })),
    ...REQUIRED_BEFORE_FILING.map((row) => ({
      fieldId: `${row.document}:${row.id}`, fieldName: row.id, field: row.id,
      effectiveLabel: row.label, printedLabel: row.label,
      documentId: row.document, page: row.page,
      reason: `the participant supplies this before filing: ${row.supply}`,
      completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
      routeDetermined: false, factAvailable: false, factId: null,
      identity: `${row.document} slot ${row.id}`, role: "participant",
      participantMustSupply: row.supply,
      why: "the platform holds no value for this and the participant supplies it before filing"
    }))
  ];
  return {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "IA",
    implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY],
    structuralClass: "flat_overlay",
    captionBasis: "this binary carries no AcroForm. Every coordinate is a measured text extent of the printed caption that names the slot, recorded per row in rectBasis, and every write is proved back out of the saved content streams.",
    routeSelectionNote: "This packet is built for the Iowa Code section 123.47(9) underage-alcohol expungement route. The two numbered statutory elements are stated by the packet. The reading acknowledgments, the A/B representation election and every field of the certification of service stay with the person filing.",
    dispositionVocabulary: [SIGNATURE_CLASS, ELECTION_CLASS],
    writes, refusals
  };
}

/* ---- the builder's own counters (not a verdict) --------------------------- */
function builderCounters(map, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writes = map.writes.map((w) => ({ ...w, name: w.fieldName, label: w.effectiveLabel, document: w.documentId, isSelectionControl: false }));
  const blanks = map.refusals.map((r) => ({ ...r, name: r.fieldName, label: r.effectiveLabel, document: r.documentId, isSelectionControl: r.isSelectionControl === true }));

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.fieldId, label: w.label });
  }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      sourcePresentation: null,
      disposition: blank.completenessDisposition ?? null,
      ...(Object.hasOwn(blank, "requiredBeforeFiling") ? { requiredBeforeFiling: blank.requiredBeforeFiling === true } : {}),
      routeDetermined: blank.routeDetermined === true,
      factAvailable: (blank.factId ? availableFacts.has(String(blank.factId)) : false)
        || here.has(norm(blank.label)) || here.has(norm(blank.name)),
      routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: false, whyTheRouteCannotDetermineIt: null,
      factId: blank.factId ?? null, identity: blank.identity ?? blank.field ?? blank.fieldId
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass ?? null, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
  }
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.fieldId, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.fieldId, label: b.label });
  }
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }
  for (const a of artifacts) {
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((a.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of a.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: a.fixture, field: r });
  }
  const mapped = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  for (const doc of mapped) if (![FORM_ID, CERT_ID].includes(doc)) note("requiredComponentsMissing", { component: doc });
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- the two participant-facing documents -------------------------------- */
function participantInstructions(ledger) {
  const rbf = ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
  const elections = ledger.filter((x) => x.disposition === "PARTICIPANT_ELECTION_GENUINE");
  return `# Before you sign or file this application

This packet is an Iowa Rule 2.86 - Form 4 application to expunge the court
records of a conviction for possession of alcohol under the legal age, under
Iowa Code section 123.47(9). It is a prepared draft on the court's own form. It
is not legal advice, it is not signed, and it has not been filed.

## Read this first

The application is drafted for the section 123.47(9) route only. Two statements
on page 1 are already marked for you because they are the statutory elements of
that route:

- that you were convicted of violating Iowa Code section 123.47, possession of
  alcohol under the legal age, or a similar local ordinance, on the date shown;
- that you have had no criminal convictions in the two years after that
  conviction other than local traffic violations or simple misdemeanor
  violations under Iowa Code chapter 321.

Check both against your own court record before you sign. You are signing under
penalty of perjury. If either is not true of your case, this is the wrong
packet, and you should stop and talk to a lawyer.

## What you must do yourself, and nothing here can do for you

${elections.map((e) => `- **${e.label}.** ${e.why}`).join("\n")}

The two "Read Before Signing" boxes on page 1 are left empty on purpose. The
form says to check each statement after you have read it. Read them, then check
them.

## What you must supply before filing

${rbf.map((r) => `- **${r.label}** - ${r.participantMustSupply}.`).join("\n")}

## What is deliberately left blank

Your signature and the date beside it are blank. Sign and date the application
yourself, after you have read it. The whole certification of service on page 2
is blank, including the name of the person certifying and the date: a
certificate that says a copy was mailed on a date when it had not been mailed
would be false. Complete it at the time you mail or deliver the copy, and not
before.

The attorney block on page 2 is left empty because no lawyer is filing this for
you. If a lawyer takes your case, that block is theirs to complete.

## About your own details

Your name, address, city, state, ZIP code, phone number and email address are
already drafted into the self-represented block on page 2. Read them and correct
anything that is wrong before you sign.
`;
}

function filingInstructions() {
  return `# Filing instructions

## Where this goes

File the application in the Iowa District Court for the county shown in the
caption on page 1 - the county where the criminal case was handled - under the
case number shown beside it. Check both against your court record.

## The order of the steps

1. Read the whole application, including both "Read Before Signing" statements,
   and check those two boxes.
2. Check box A on page 2 if you are filing for yourself. Check box B instead
   only if a lawyer is filing for you, in which case the lawyer completes that
   block.
3. Correct anything in the drafted details that does not match your record.
4. Sign and date the application.
5. File it. If you can find your case on the Iowa Judicial Branch eFile System,
   file it there; the system serves the county attorney for you and you do not
   need the certification of service.
6. If you cannot find your case on eFile, file on paper at the clerk of court's
   office for that county. Before or when you file, mail or hand deliver a copy
   of the application to the county attorney for that county. Then, and only
   then, complete and sign the certification of service on page 2 with the real
   date and the real name and address of the person served.

## After filing

The county attorney has an opportunity to respond. Keep a copy of everything you
filed, including the completed certification of service if you filed on paper.

## Fees and orders

The held source establishes no filing fee for this application and carries no
proposed order. Nothing in this packet states an amount, and nothing here asks
the court to sign an order drafted by this packet.

## What this packet is not

This is a prepared set of the court's own form. It is not legal advice, it is
not filed for you, and it does not decide whether the court will expunge your
record.
`;
}

/* ---- build --------------------------------------------------------------- */
async function build(argv = process.argv.slice(2)) {
  const skipRaster = argv.includes("--no-raster");
  const source = resolveSource();
  if (source.failure) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: [source.failure], overlayDirectoryTouched: false };
  }
  const labels = custodyEvidence();
  const out = path.join(ROOT, OUT_REL);

  const fixtures = {};
  for (const [name, facts] of Object.entries(FIXTURES)) {
    const rendered = await renderFixture(source.bytes, name, facts);
    const proof = await proveWrites(source.bytes, rendered.bytes, rendered.drawn, name);
    fixtures[name] = { ...rendered, ...proof };
  }

  const map = productionFieldMap(fixtures.canonical.drawn);
  const artifactRows = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
    sha256: sha256(f.bytes), byteLength: f.bytes.length, pageCount: 2,
    documents: [
      { documentId: FORM_ID, componentKinds: ["primary_filing"], sourceSha256: source.sha256 },
      { documentId: CERT_ID, componentKinds: ["certificate_of_service"], sourceSha256: source.sha256 }
    ],
    pageManifest: [
      { packetPage: 1, component: "primary_filing", documentId: FORM_ID, sourcePage: 1, sourceSha256: source.sha256 },
      { packetPage: 2, component: "certificate_of_service", documentId: CERT_ID, sourcePage: 2, sourceSha256: source.sha256 }
    ]
  }));
  const artifactCounters = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture,
    valuesReportedByFinalizer: f.drawn.length,
    addedGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: f.outsideBoxes,
    refusedFieldsWithInk: []
  }));

  const preliminary = builderCounters(map, artifactCounters, "");
  const instructions = participantInstructions(preliminary.ledger);
  const audit = builderCounters(map, artifactCounters, instructions);
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  if (!allZero) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters, findings: audit.findings, overlayDirectoryTouched: false };
  }

  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, f] of Object.entries(fixtures)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), f.bytes);

  writeJson(path.join(out, "production-field-map.json"), map);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "IA",
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, allSourcesExact: true,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256, re-read at build time",
    oneBinaryTwoLabels: "Both official-form identities this family names resolve to the same two-page binary. The custody reconciliation records the first-hand document text that establishes it: the certification of service is the section heading printed on page 2 of the application. Two source rows are recorded against one file rather than a second file being implied.",
    officialFormLabels: labels,
    documents: [
      { sourceIds: [`official-form:${FORM_ID}`], formNumber: FORM_ID, documentId: FORM_ID, revision: source.revision,
        pathInArchive: source.pathInArchive, sha256: source.sha256, byteLength: source.byteLength,
        componentKinds: ["primary_filing"], pages: [1, 2] },
      { sourceIds: [`official-form:${CERT_ID}`], formNumber: CERT_ID, documentId: CERT_ID, revision: source.revision,
        pathInArchive: source.pathInArchive, sha256: source.sha256, byteLength: source.byteLength,
        componentKinds: ["certificate_of_service"], pages: [2], embeddedIn: FORM_ID }
    ],
    commercialRoutesOpened: 0
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    proofMethod: "each saved fixture is re-opened, its page content streams are decompressed, the streams the source already carried are excluded, and every remaining hex-encoded show-text operator is decoded with the position matrix that precedes it. A write is proved only when its exact string is found at the coordinates the field map declared.",
    documents: Object.entries(fixtures).map(([fixture, f]) => ({
      fixture, documentId: FORM_ID, formNumber: FORM_ID, sourceSha256: source.sha256,
      actualWrites: f.proofs
    })),
    artifacts: artifactCounters
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing", "certificate_of_service"],
    componentIdentityMode: "exact",
    artifacts: artifactRows,
    packets: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, documents: a.documents, pageManifest: a.pageManifest })),
    rasterEngine: skipRaster ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterState: "BUILT_RASTER_PENDING"
  });
  writeJson(path.join(out, "reports", "builder-completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: allZero,
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    findings: audit.findings
  });
  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blank-ledger/v1", familyId: FAMILY_ID,
    blanks: audit.ledger.map((b) => ({ field: b.fieldId, documentId: b.documentId, page: b.page, label: b.effectiveLabel, disposition: b.disposition, basis: b.basis, participantMustSupply: b.participantMustSupply ?? null }))
  });
  fs.writeFileSync(path.join(out, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions());
  writeJson(path.join(out, "build-status.json"), {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-ia-12347-set.mjs",
    rasterEngine: skipRaster ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  writeJson(path.join(out, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "Both official-form identities this family names -- \"Rule 2.86 Form 4\" and \"Certification of Service by Mailing or Delivery\" -- resolve to one two-page binary.", consequence: "The packet is one source document carrying two components. The source receipt records two source rows against one file and names the page each component occupies, rather than implying a second file that does not exist." },
      { finding: "The binary carries no AcroForm: 0 fields on 2 pages of 612x792.", consequence: "Values are drawn into page content at coordinates measured from the printed captions that name each slot. Every rect carries its own measurement basis in the field map." },
      { finding: "The form prints \"Please check each statement below after you have read it\" above the two Read Before Signing boxes.", consequence: "Both boxes are left unmarked and carried as genuine participant elections. Marking them would assert that a person had read something this build cannot know they read." },
      { finding: "The two numbered items are the statutory elements of the section 123.47(9) route this packet is built for.", consequence: "Both are marked as route determinations and the conviction date is written, so the application states which route it proceeds under rather than asking the participant." },
      { finding: "The certification of service on page 2 is completed only after a copy is actually mailed or delivered.", consequence: "Every field of it is left blank -- including the certifier's own printed name, which this packet holds -- because a certificate of mailing completed before the mailing happened would be false. The recipient's name and address are carried as disclosed required-before-filing items." },
      { finding: "The A/B representation election is not answered by this packet.", consequence: "The self-represented block is drafted for review and the election is carried as a participant election. The attorney block is refused as attorney-only on every field." }
    ]
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-family-approval-request/v2", familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY], buildStatus: "state_built",
    requested: "visual review and counsel review",
    components: [
      { kind: "primary_filing", documentId: FORM_ID },
      { kind: "certificate_of_service", documentId: CERT_ID }
    ],
    artifacts: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    counselQuestionsRaised: [
      "The two Read Before Signing boxes on page 1 are left unmarked on the ground that the form asks the filer to check them after reading. Confirm that a prepared draft should not mark them.",
      "The printed certifier name on the certification of service is refused along with the service date, on the ground that nothing on a certificate of mailing may be completed before the mailing happens. Confirm that is the intended treatment for the printed name as well.",
      "Numbered item two states that the participant has had no disqualifying conviction in the two years following. Confirm that screening evidence is a sufficient basis for the packet to state it, with the participant's own verification required before signing."
    ],
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  });

  const result = {
    familyId: FAMILY_ID, status: "COMPLETED", directory: OUT_REL,
    structuralClass: "flat_overlay",
    officialForms: [{ formNumber: FORM_ID, sha256: source.sha256 }, { formNumber: CERT_ID, sha256: source.sha256 }],
    components: ["primary_filing", "certificate_of_service"],
    terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank,
    counters: audit.counters, nineCountersZero: allZero,
    requiredBeforeFiling: audit.ledger.filter((b) => b.disposition === "REQUIRED_BEFORE_FILING").length,
    rasterState: "BUILT_RASTER_PENDING",
    artifactHashes: artifactRows.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL, WRITES };
