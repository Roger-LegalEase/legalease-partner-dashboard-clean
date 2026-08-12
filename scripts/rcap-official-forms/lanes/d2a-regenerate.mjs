// Lane D2A — first build of the official-form packages for AZ, IL, WA, KS and MN.
//
// These five states had no package root at the D0 base: no directories, no
// source records, no index entries. Everything here is established from the
// Edition 1 source pack, whose STATE_MANIFEST.csv is the identity authority.
//
// The lane drives the D0 factory modules directly rather than going through
// `scripts/implement-rcap-official-forms-d1.mjs`, because that script reads and
// rewrites the two shared indexes (`verified-binary-index.json` and
// `implementation-index.json`) that seven concurrent lanes would collide on,
// and its index does not list these states in any case. Each state instead gets
// a lane-scoped `state-index.json`, which the captain merges at import.
//
// Nothing in `scripts/rcap-official-forms/` outside this file is modified, and
// no compiled profile is touched. Where the profile's legacy `formInventory`
// sha256 disagrees with the pack manifest, the pack manifest wins and the
// disagreement is recorded as a state-pack fidelity finding.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf, FACT_DESCRIPTORS, haystack as d0Haystack }
  from "../rcap-field-semantics.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, StandardFonts } =
  require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const LANE = "D2A";
const FACTORY_VERSION = "d0-remediated-v1";
const PACK_ROOT = process.env.RCAP_D2_PACK ?? "/tmp/rcap-source-packs/D2A/extracted";
const PACK_SHA256 = "8f7ef41b7077105dc0bc23e7e3963cff88104004db0745012bf76e6b47c14557";

const STATES = [
  { code: "AZ", slug: "arizona", profile: "AZ-arizona" },
  { code: "IL", slug: "illinois", profile: "IL-illinois" },
  { code: "WA", slug: "washington", profile: "WA-washington" },
  { code: "KS", slug: "kansas", profile: "KS-kansas" },
  { code: "MN", slug: "minnesota", profile: "MN-minnesota" }
];

// A form that states this on its own face is never filled. The notice is read
// out of the binary's own text layer, so the hold is a property of the document
// rather than a flag somebody remembered to set.
const NON_FILING_NOTICE = /DO\s+NOT\s+COMPLETE\s+THIS\s+FORM\s+FOR\s+FILING/i;

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
};

// --- Edition 1 manifest -----------------------------------------------------

/** RFC4180 parse. The manifest quotes note fields that contain commas. */
function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const ASSET_SUFFIX = {
  packet_form: "form",
  source_gated: "source-gated",
  supporting_process: "support",
  instructions: "instructions"
};
const LIBRARY_FOLDER = {
  packet_form: "02_PACKET_FORMS",
  source_gated: "05_SOURCE_GATED",
  supporting_process: "04_SUPPORTING_PROCESS",
  instructions: "03_INSTRUCTIONS",
  legal_review: "01_LEGAL_REVIEW"
};

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const familySlugOf = (row) =>
  `${slugify(row.document_id)}-${ASSET_SUFFIX[row.asset_class] ?? "asset"}-${String(row.language || "en").toLowerCase()}`;

// --- ownership --------------------------------------------------------------
//
// Decided from the manifest's own `document_role` and `asset_class` rather than
// from a filename guess, and then re-checked field by field by the D0 binder.
const OWNERSHIP = {
  INSTRUCTIONAL: "instructional_no_participant_fill",
  SERVICE: "service_block_no_participant_fill",
  COURT_ORDER: "court_issued_caption_only",
  PARTICIPANT: "participant_completed"
};
function determineOwnership(row) {
  if (row.asset_class === "instructions" || row.document_role === "INSTRUCTIONS") return OWNERSHIP.INSTRUCTIONAL;
  // A proof of service records who served what on whom, and where. D0 protects
  // a service block wherever it appears on another form; a document that is
  // nothing but a service block is protected the same way, end to end.
  if (row.document_role === "SERVICE") return OWNERSHIP.SERVICE;
  if (row.document_role === "ORDER") return OWNERSHIP.COURT_ORDER;
  return OWNERSHIP.PARTICIPANT;
}

// --- nine-class classification ----------------------------------------------
//
// The same ordering the D1 packages carry, so the merged corpus reads
// consistently: every unwritable class is tested before a participant pattern
// can claim a field. Classification is descriptive; the D0 binder, not this
// table, decides what may be written.
const CLASS_RULES = [
  [/for\s*(court|office|clerk|agency|official)\s*use|court\s*use\s*only|do\s*not\s*write|office\s*use\s*only|scan\s*num|barcode|bar\s*code|file\s*stamp|filed\s*stamp|court\s*seal/, "prohibited"],
  [/notar|jurat|acknowledg(ed|ment)\s*before\s*me|sworn\s*to\s*before|my\s*commission\s*expires|notary\s*public/, "protected"],
  [/certificate\s*of\s*service|proof\s*of\s*service|service\s*of\s*process|process\s*server|\bserved\s*(on|by|upon)\b/, "protected"],
  [/\brace\b|\bethnic|white|black|asian|pacific\s*island|american\s*indian|hispanic/, "protected"],
  [/signature|\bsigned\s*by\b|\bsign\s*here\b|^\s*sign\b|\bsig\b/, "signature"],
  [/judge|magistrate|commissioner|so\s*ordered|bench|hearing\s*officer|referee/, "court_or_agency"],
  [/\bclerk\b|deputy\s*clerk|date\s*filed|filing\s*stamp|entered\s*on|distribution/, "court_or_agency"],
  [/it\s*is\s*(hereby\s*)?ordered|ordered\s*(and\s*)?adjudged|is\s*(hereby\s*)?(granted|denied)|ruling|adjudged|decree|disposition\s*of\s*(this\s*)?(petition|motion)|hearing\s*(date|time|result)/, "court_or_agency"],
  [/prosecut|district\s*attorney|commonwealth\s*s?\s*attorney|state\s*s?\s*attorney|solicitor|county\s*attorney|opposing/, "outside_party"],
  [/(sheriff|police|law\s*enforcement|bureau|state\s*patrol)\s*(use|only)|agency\s*use|arresting\s*law\s*enforcement/, "outside_party"],
  [/\$|\bfee\b|\bfees\b|\bcost[s]?\b|\bamount\b|\brestitution\b|\bfine[s]?\b|\bsurcharge\b|\bowed\b/, "protected"],
  [/ssn|social\s*security|driver\s*s?\s*licen[cs]e|\bdl\s*num|state\s*id\s*num|\boln\b|jail\s*id|\bsid\b|fbi\s*num/, "manual"],
  [/attorney|counsel|\besq\b|law\s*firm|bar\s*(no|num)/, "manual"],
  [/agency|sheriff|police|law\s*enforcement|bureau|state\s*patrol|probation|parole/, "manual"],
  [/\bage\s*at\b|age\s*of\s*(the\s*)?(petitioner|defendant)|\bage\b/, "manual"],
  [/\bdivision\b/, "manual"],
  [/date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/, "deterministic"],
  [/printed\s*name|petitioner|applicant|defendant|movant|\bdef\b|your\s*name|full\s*legal\s*name|first\s*name|last\s*name|middle\s*(name|initial)|party\s*names?|case\s*name|\bname\b/, "participant"],
  [/city\s*state\s*zip/, "participant"],
  [/street\s*addr|mailing\s*addr|^\s*addr|\baddress\b|\bcity\b|\bstate\b|\bzip\b|postal|phone|telephone|\bemail\b/, "participant"],
  [/\bdob\b|date\s*of\s*birth|birth\s*date/, "participant"],
  [/\bcounty\b|court\s*name|type\s*of\s*court|judicial\s*(district|circuit)|\bvenue\b/, "participant"],
  [/case\s*(no|num|#)|docket|citation\s*(no|num)|cause\s*(no|num)|file\s*(no|num)|case\s*id/, "participant"],
  [/charge|offense|statute|violation|\bcount\b|arrest\s*date|date\s*of\s*arrest|conviction\s*date|disposition\s*date/, "participant"]
];
const UNUSED_NAME = /^\s*$|^(text|field|untitled|undefined|blank|fill)\s*\d*\s*(\|\||$)/;
const NEVER_WRITE = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);

function haystack(name) {
  const raw = String(name ?? "");
  const spaced = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${spaced} || ${raw.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}
function classify(name, type, ownership) {
  const hay = haystack(name);
  for (const [re, cls] of CLASS_RULES) if (re.test(hay)) return cls;
  if (UNUSED_NAME.test(hay)) return "unused";
  if (["checkbox", "radio", "dropdown", "optionlist"].includes(type)) return "manual";
  if (ownership === OWNERSHIP.COURT_ORDER) return "court_or_agency";
  return "manual";
}

// --- explicit mappings ------------------------------------------------------
//
// D0's sanctioned escape hatch, and the only way a `requiresExplicitMapping`
// descriptor (the charge itself and the arrest, offense, conviction and
// disposition dates) can ever bind. Each entry below was authored against the
// binary's own printed labels, read first-hand, and each carries the reason it
// is safe. An explicit mapping can never override a protect rule or a type
// guard: D0 applies those first, and this table cannot reach them.
//
// The sentinel value is the opposite instruction. D0 refuses any field whose
// explicit mapping disagrees with what its name resolves to, so naming a field
// here with the sentinel forces a refusal through D0's own conflict guard. It
// is used where first-hand inspection shows a generically-named widget sits
// inside another party's block -- Kansas names the prosecutor's and the
// arresting agency's address lines `Address 1_2` and `Address 1_3`, which the
// name-only binder would otherwise fill with the participant's own address.
const LANE_REFUSED = "lane.refused_by_first_hand_review";

const EXPLICIT_MAPPINGS = {
  // Arizona AOCCRSL1F — Petition to Seal Criminal Case Records.
  // `Charge` is the single free-text charge line in the petition's own recital
  // of the case being sealed; it is the participant's charge, transcribed.
  "AZ:AOCCRSL1F-050825": {
    Charge: "matter.charge"
  },
  // Kansas Notice of Hearing. The petitioner's own contact block is named
  // `Name Print` / `Address 1` / `Address 2` / `City State Zip` / `Telephone
  // Number` / `Email Address`. The two blocks below it repeat those names with
  // `_2` and `_3` suffixes and belong to the prosecuting attorney and the
  // arresting law-enforcement agency, both of which are service recipients.
  "KS:KS-NOTICE-OF-HEARING-ON-PETITION-FOR-EXPUNGEM": {
    "Address 1_2": LANE_REFUSED,
    "Address 1_3": LANE_REFUSED,
    "Address 2_2": LANE_REFUSED,
    "Address 2_3": LANE_REFUSED,
    "City State Zip_2": LANE_REFUSED,
    "City State Zip_3": LANE_REFUSED
  }
};

// Per-field decisions authored against the printed binary, keyed by
// `<jurisdiction>:<document id>`. A decision can only resolve an ambiguity the
// descriptor list leaves open, or refuse a field the descriptors read as
// something the form does not mean. It can never reach a protect rule or a
// type guard: D0 applies those before any of this is consulted, and a field
// refused there stays refused.
//
//   { bind: "<factId>", why: "..." }   resolve a multi-descriptor tie
//   { refuse: true,     why: "..." }   refuse what the descriptors would write
const LANE_FIELD_DECISIONS = {
  // Arizona — Order Regarding Petition to Seal. The order's caption records the
  // name the petitioner was arrested under, which is the name on the record
  // rather than necessarily the participant's current legal name.
  "AZ:AOCCRSL2F-050825": {
    NameArrest: { refuse: true, why: "The printed line reads \"the name of ___ at the time of arrest\". A name used at arrest is a record fact, not the participant's legal name, and this lane will not assert one for the other." }
  },
  // Kansas — Notice of Hearing. `City State Zip` sits in the petitioner's own
  // contact block, immediately under `Address 2`.
  "KS:KS-NOTICE-OF-HEARING-ON-PETITION-FOR-EXPUNGEM": {
    "City State Zip": { bind: "participant.city_state_zip", why: "The petitioner's own contact block, printed directly beneath their address lines. The composite descriptor is the one the form means; the bare city, state and zip descriptors also match the name and are not." },
    "Email Address": { refuse: true, why: "D0's descriptor list tests the street-address pattern before the email pattern, and `\\baddress\\b` matches `Email Address`, so the binder resolves this field to the participant's street address. Writing a street address into an email field is wrong and the ordering cannot be corrected from this lane, which may not edit rcap-field-semantics.mjs. The field is left blank and the ordering is reported as a factory finding." }
  },
  // Illinois — Order to Expunge and/or Seal. The two numbered tables are the
  // order's decretal relief: the cases the court orders expunged, and the cases
  // it orders sealed. Writing a case number into either is stating what the
  // court granted.
  "IL:EXP-AD-ORDER-GRANTING": {
    "arrest/case number 1": { refuse: true, why: "A row of the order's expungement relief table. Filling it states what the court ordered, which is a judicial finding and never a transcribed participant fact." },
    "arrest/case number - Sealing 1": { refuse: true, why: "A row of the order's sealing relief table. Same reason: the relief granted is the court's to state." }
  },
  // Illinois — Request to Expunge and/or Seal. Section 3 requests expungement
  // and section 4 requests sealing; a case goes in one or the other, and which
  // one is the participant's election rather than a fact this fixture holds.
  "IL:EXP-AD-REQUEST": {
    "List all charges for each case number - 1": { refuse: true, why: "The column asks for the charges on the case. D0 resolves the field's name to the case number, because `case number` appears in it, so the value offered is the wrong fact for the column." },
    "4 - List all charges for each case number - 1": { refuse: true, why: "As above, in the sealing section." },
    "4 - Arrest or Case Number - 1": { refuse: true, why: "Section 4 requests sealing where section 3 requests expungement. A case belongs in one section, and choosing between them is the participant's election; listing the same case in both would request contradictory relief." }
  },
  // Illinois — Application for Waiver of Court Fees (Civil). The caption's two
  // party boxes take whichever alignment the underlying case has.
  "IL:FW-CIV-APPLICATION": {
    "2 - Plaintiff/Petitioner or In RE": { refuse: true, why: "Which side of the caption the participant occupies depends on the case the waiver is filed in, and this form does not say. The applicant is named unambiguously at `6 - Your Name`, which is bound." },
    "3 - Defendant/Respondent": { refuse: true, why: "The opposing party box. Same reason: the caption's alignment is not determinable from this form, and filling both boxes with one name would name the participant on both sides." }
  },
  // Kansas — Judicial Council order. The caption reads
  // "IN THE ___ JUDICIAL DISTRICT", so the blank is the district's ordinal.
  "KS:KSJC": {
    "JUDICIAL DISTRICT": { refuse: true, why: "Measured context shows the widget sits between the printed words `THE` and `JUDICIAL DISTRICT`, so it carries the district's ordinal number. D0's descriptor list reads `judicial district` as a court name, which is a different fact." },
    NamePrint: { refuse: true, why: "The print-name line beneath `Signature of Defendant/Defendant's Attorney`. Whether the person signing is the participant or their counsel is not determinable from the form, and the whole block is a signature block." },
    NamePrint_2: { refuse: true, why: "The second signature block's print-name line, which belongs to the party opposing the petition." },
    "County Kansas on": { refuse: true, why: "The execution line, reading `at ___ County, Kansas, on ___`, sits under the court's signature block and records where the order was signed. That is the court's county, not the participant's." }
  }
};

// Deny rules this lane adds on top of D0's. They can only refuse. They exist
// because first-hand reading of these five states' forms turned up subjects
// D0's protect list does not name, and this lane may not edit that list.
const LANE_PROTECT_RULES = [
  // Illinois writes "lawyer" throughout where other states write "attorney",
  // and D0's attorney rule matches only the latter. Without this the binder
  // fills the lawyer's own address and telephone from participant facts.
  ["attorney", /\blawyer\b|\battorneys\b|\bcounsel\b|\bclient\b|\blaw\s*firm\b|\bprosecutors\b/],
  // A name the participant has also been known by is a record fact, not their
  // legal name, and the two are not interchangeable on a court filing.
  ["other_name", /\bother\s*name|\balias|\bmaiden\b|formerly\s*known|\ba\.?k\.?a\.?\b|name\s*at\s*(the\s*time\s*of\s*)?arrest|name\s*used/],
  // A court's own administrative subdivision, and the room a hearing sits in.
  ["court", /\bdivision\b|\bcourtroom\b|\bdepartment\s*(no|num|number)\b/],
  // A judicial district is identified by its ordinal, which is a fact about the
  // court rather than a court name.
  ["court", /judicial\s*(district|circuit)/],
  // A court's own mailing address. Washington prints "Court Address:" above a
  // rule line, which the generic address pattern reads as the participant's.
  ["court", /\bcourt\s*(address|street|mailing)|address\s*of\s*(the\s*)?court/],
  // The address a document was served at belongs to the recipient.
  ["service_block", /\bthis\s*address\b|\bserved\s*at\b|\bmailed\s*to\b|\bdelivered\s*to\b/]
];

function laneProtectCategoryOf(text) {
  if (!text) return null;
  const hay = d0Haystack(text);
  for (const [category, re] of LANE_PROTECT_RULES) if (re.test(hay)) return category;
  return null;
}

// --- fixtures ---------------------------------------------------------------
// The same canonical and boundary fact sets the D1 packages were rendered
// against, so a reviewer comparing two states is comparing the forms rather
// than the data.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};

// A county dropdown enumerates that state's own counties, so a placeholder
// county is not a value the control can carry and the fixture would prove
// nothing about it. The substitute is taken from the widget's own option list
// -- it is fixture data read out of the form, not an asserted legal fact.
function fixtureFor(base, form) {
  if (!form.countyOption) return base;
  return {
    ...base,
    "matter.county": form.countyOption,
    "matter.charges": base["matter.charges"]
  };
}

// --- census -----------------------------------------------------------------
function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

// A Type0/Identity-H subset font with no ToUnicode map decodes to glyph
// indices, which surface as NUL-padded runs. Those name nothing.
const CID_ENCODED = /\u0000/;

/**
 * The printed context a widget actually sits in, measured out of the page's
 * own content stream: the text on the widget's own baseline band to its left,
 * and the nearest line above whose horizontal span overlaps it.
 *
 * This exists because several forms in this pack name a widget generically and
 * rely on the printed block heading to say whose data it holds. Kansas is the
 * clear case: three identical `Address 1` / `City State Zip` blocks, one the
 * petitioner's and two belonging to service recipients.
 */
function measurePrintedContext(lines, rect) {
  if (!rect) return null;
  const readable = lines.filter((l) => !CID_ENCODED.test(l.text));
  const midY = rect.y + rect.height / 2;

  let left = null;
  for (const line of readable) {
    if (Math.abs(line.y - rect.y) > rect.height + 4) continue;
    for (const run of line.runs) {
      if (CID_ENCODED.test(run.text)) continue;
      if (run.x2 > rect.x + 2) continue;
      if (rect.x - run.x2 > 320) continue;
      if (!left || run.x2 > left.x2) left = run;
    }
  }

  let above = null;
  for (const line of readable) {
    const gap = line.y - (rect.y + rect.height);
    if (gap < -2 || gap > 26) continue;
    const spans = line.runs.filter((r) => r.x2 > rect.x - 30 && r.x < rect.x + rect.width + 30);
    if (spans.length === 0) continue;
    if (!above || line.y < above.y) above = { y: line.y, text: spans.map((r) => r.text).join("").trim() };
  }

  const leftText = left ? left.text.trim().slice(-70) : null;
  const aboveText = above ? above.text.slice(0, 70) : null;
  if (!leftText && !aboveText) return null;
  return {
    leftOfWidget: leftText,
    lineAboveWidget: aboveText,
    basis: "text drawn by this exact sha256, read from the page content streams at measured coordinates",
    midY: Number(midY.toFixed(1))
  };
}

// --- flat-overlay anchors ---------------------------------------------------
const OVERLAY_LABEL_DENY = /judge|magistrate|clerk|court use|prosecut|attorney|district attorney|sheriff|police|agency|notar|sworn|signature|\bsign\b|service|so ordered|it is ordered|hearing|granted|denied|for office/i;
const OVERLAY_LABEL_BINDINGS = [
  [/^name printed or typed$|^printed name$|^name of petitioner$|^petitioner'?s? name$|^defendant'?s? name$|^full name$|^your name$/i, "participant.full_legal_name"],
  [/^date of birth$|^dob$|^birth date$/i, "participant.date_of_birth"],
  [/^case no\.?$|^case number$|^docket no\.?$|^file no\.?$|^case #$/i, "matter.case_number"],
  [/^county$|^county of$/i, "matter.county"],
  [/^address$|^mailing address$|^street address$/i, "participant.street_address"],
  [/^city$/i, "participant.city"],
  [/^state$/i, "participant.state"],
  [/^zip$|^zip code$|^postal code$/i, "participant.zip"],
  [/^city, state,? zip$|^city\/state\/zip$/i, "participant.city_state_zip"],
  [/^(telephone|phone)( no\.?| number)?$/i, "participant.phone"],
  [/^e-?mail( address)?$/i, "participant.email"]
];
const BLANK_BINDINGS = [
  [/case\s*(no|number)\.?\s*:?\s*$/i, null, "matter.case_number"],
  [/citation\s*(no|number)\.?\s*:?\s*$/i, null, "matter.citation_number"],
  [/\bcounty\s*(of)?\s*:?\s*$/i, null, "matter.county"],
  [/court\s+of\s*$/i, null, "matter.county"],
  [/date\s*of\s*birth\s*:?\s*$/i, null, "participant.date_of_birth"],
  // Email and telephone are tested first. "Email Address:" ends in the word
  // "address", so a generic address pattern claims it -- the same ordering
  // defect D0's descriptor list has, and the reason an anchor built from that
  // label is dropped rather than written.
  [/e-?mail(\s*address)?\s*:?\s*$/i, null, "participant.email"],
  [/(telephone|phone)(\s*(no|number)s?)?(\s*\(s\))?\s*:?\s*$/i, null, "participant.phone"],
  [/(mailing\s*|street\s*)?address\s*:?\s*$/i, null, "participant.street_address"],
  [/\bcity\s*:?\s*$/i, null, "participant.city"],
  [/\bzip(\s*code)?\s*:?\s*$/i, null, "participant.zip"],
  [/(petitioner|defendant|applicant|movant)(\s*'?s)?\s*(name)?\s*:?\s*$/i, null, "participant.full_legal_name"],
  [/(printed\s*name|full\s*name|name)\s*:?\s*$/i, null, "participant.full_legal_name"],
  [null, /^\s*,?\s*(defendant|petitioner|applicant|movant)\b/i, "participant.full_legal_name"],
  [null, /^\s*,?\s*county\b/i, "matter.county"]
];

function blankFactFor(before, after, captionOnly) {
  const b = before.slice(-60), a = after.slice(0, 40);
  if (OVERLAY_LABEL_DENY.test(b) || OVERLAY_LABEL_DENY.test(a)) return null;
  for (const [beforeRe, afterRe, target] of BLANK_BINDINGS) {
    if (beforeRe && !beforeRe.test(b)) continue;
    if (afterRe && !afterRe.test(a)) continue;
    if (captionOnly && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}
const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

function blankAnchorsOn(line, captionOnly, nextLineText = "", minChars = 5) {
  const chars = line.chars ?? [];
  const out = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i].c !== "_") { i += 1; continue; }
    let j = i;
    while (j < chars.length && (chars[j].c === "_" || (chars[j].c === " " && chars[j + 1]?.c === "_"))) j += 1;
    const span = chars.slice(i, j);
    const underscores = span.filter((c) => c.c === "_").length;
    if (underscores >= minChars) {
      const before = chars.slice(0, i).map((c) => c.c).join("");
      // A court caption names its parties on the line beneath the rule, not
      // beside it: Washington prints the blank, a comma, and then `Defendant.`
      // on the following line. Where the blank runs to the end of its own line
      // the next line's opening text is what names it, and that text is
      // measured from the document like everything else here.
      const tail = chars.slice(j).map((c) => c.c).join("");
      const after = /\S/.test(tail.replace(/[,\s]/g, "")) ? tail : `${tail} ${nextLineText}`;
      const target = blankFactFor(before, after, captionOnly);
      if (target) {
        out.push({
          factId: target,
          x1: span[0].x,
          x2: span[span.length - 1].x + span[span.length - 1].w,
          labelBefore: before.trim().slice(-40),
          labelAfter: after.trim().slice(0, 30)
        });
      }
    }
    i = j;
  }
  return out;
}

function overlayFactFor(label, captionOnly) {
  const clean = label.replace(/[\s:.]+$/g, "").trim();
  if (OVERLAY_LABEL_DENY.test(clean)) return null;
  for (const [re, target] of OVERLAY_LABEL_BINDINGS) {
    if (!re.test(clean)) continue;
    if (captionOnly && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

// --- the build --------------------------------------------------------------

async function buildFamily({ state, row, packPath, profileInventory }) {
  const familySlug = familySlugOf(row);
  const familyDir = path.join(OUT, state.slug, familySlug);
  const id = `${state.code}/${familySlug}`;
  const workflowKey = row.workflow_key;

  // Every file under a family directory is written by this lane, so the
  // directory is cleared before it is rebuilt. Without this a re-run leaves
  // behind whatever the previous run produced and the earlier one no longer
  // does: a fixture and a contact sheet for a form this run decided must not
  // be filled would survive, and the package would show a fill it no longer
  // stands behind.
  fs.rmSync(familyDir, { recursive: true, force: true });

  const bytes = fs.readFileSync(packPath);
  const sha = sha256(bytes);
  const byteLength = bytes.length;

  const findings = [];
  const result = {
    jurisdiction: state.code, family: familySlug, documentId: row.document_id,
    workflowKey, sourceSha256: sha
  };

  // 1. Identity. The manifest is the authority; a disagreement blocks this
  //    family and nothing else.
  const sourceHashMatches = sha === row.sha256;
  const byteLengthMatches = String(byteLength) === row.bytes;
  if (!sourceHashMatches) {
    findings.push({ check: "source_identity", detail: `manifest ${row.sha256}, delivered ${sha}` });
    writeJson(path.join(familyDir, "source-record.json"), {
      schemaVersion: "rcap-official-form-source-record/v2-verified-binary", lane: LANE,
      jurisdiction: state.code, documentId: row.document_id, workflowKey,
      sha256: sha, sha256VerifiedAgainstBundleManifest: false,
      implementationStatus: "blocked_source_identity_mismatch",
      productionHolds: ["edition_1_runtime_disabled", "f_independent_visual_review_required", "source_identity_mismatch"]
    });
    return { ...result, status: "blocked_source_identity_mismatch", sourceHashMatches: false, findings };
  }

  // 2. First-hand inspection of the actual binary.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageGeometry = pages.map((p, i) => ({
    page: i + 1,
    width: Math.round(p.getWidth()),
    height: Math.round(p.getHeight()),
    orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
  }));
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  const linesByPage = pages.map((p) => {
    try { return groupIntoLines(extractTextItems(p)); } catch { return []; }
  });
  const documentText = linesByPage.flat().map((l) => l.text).join("\n");
  const readableLineCount = linesByPage.flat().filter((l) => !CID_ENCODED.test(l.text)).length;

  let formFields = [];
  try { formFields = doc.getForm().getFields(); } catch { formFields = []; }
  const structuralClassObserved = formFields.length > 0 ? "acroform" : "flat";
  const structuralClassDeclared = row.structural_class;
  const structuralClassAgrees =
    (structuralClassObserved === "acroform" && structuralClassDeclared === "acroform_pdf") ||
    (structuralClassObserved === "flat" && structuralClassDeclared === "flat_pdf");

  // 3. Non-filing hold, read off the document's own face.
  const nonFilingMatch = NON_FILING_NOTICE.exec(documentText.replace(/\s+/g, " "));
  const nonFilingNotice = nonFilingMatch ? nonFilingMatch[0] : null;

  const ownership = determineOwnership(row);
  const captionOnly = ownership === OWNERSHIP.COURT_ORDER;
  const noFill = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.SERVICE;

  // 4. Field census: every field, its type, per-widget page and rectangle,
  //    declared maximum length, multiline flag, option list, and the printed
  //    context the widget sits in.
  const census = formFields.map((f) => {
    const type = fieldType(f);
    const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pref = w.P?.()?.toString?.();
      const page = pref ? (pageIndexOf.get(pref) ?? null) : null;
      return {
        page,
        rect: r ? {
          x: Math.round(r.x), y: Math.round(r.y),
          width: Math.round(r.width), height: Math.round(r.height)
        } : null
      };
    });
    const entry = { name: f.getName(), type, widgets };
    if (type === "text") {
      try { entry.maxLength = f.getMaxLength() ?? null; } catch { entry.maxLength = null; }
      try { entry.multiline = f.isMultiline?.() ?? null; } catch { entry.multiline = null; }
    }
    if (["dropdown", "optionlist", "radio"].includes(type)) {
      try { entry.options = f.getOptions(); } catch { /* unreadable option list */ }
    }
    // The printed context is recorded as evidence and used only to refuse.
    //
    // It is deliberately not offered to the binder as an `effectiveLabel`.
    // D0 resolves a name to the first descriptor that matches it, so adding
    // surrounding prose can only add matches, and an earlier-listed descriptor
    // then wins on text that was never the field's label: Illinois prints
    // "County Where You Are Filing the Case" above the widget it names
    // "2 - Your name", and the county descriptor is listed before the name one.
    // Context is sound for protection, where more matches mean more refusals,
    // and unsound for selection, so it is used for exactly one of the two.
    const first = widgets[0];
    if (first?.rect && first.page) {
      const context = measurePrintedContext(linesByPage[first.page - 1] ?? [], first.rect);
      if (context) {
        // Only the text on the widget's own baseline is treated as its label.
        // The line above is recorded because a reviewer wants to see it, but it
        // is not acted on: on a dense form it is usually the previous row's
        // label, and Illinois prints "Other Names Used In These Cases" directly
        // above the widget it names "4 - Date of birth".
        entry.printedContext = {
          ...context,
          protectCategory: protectCategoryOf(context.leftOfWidget ?? "")
            ?? laneProtectCategoryOf(context.leftOfWidget ?? ""),
          protectionBasis: "leftOfWidget only",
          lineAboveWidgetActedOn: false,
          usedFor: "refusal only — never for fact selection"
        };
      }
    }
    return entry;
  });

  const classification = census.map((c) => ({ name: c.name, type: c.type, class: classify(c.name, c.type, ownership) }));
  const classOf = new Map(classification.map((c) => [c.name, c.class]));

  // A county control that enumerates its own state's counties.
  const countyField = census.find((c) => c.type === "dropdown" && /county/i.test(c.name) && Array.isArray(c.options));
  const countyOption = countyField?.options?.find((o) => String(o).trim().length > 2) ?? null;

  const explicitMappings = EXPLICIT_MAPPINGS[workflowKeyBase(row)] ?? {};

  // 5. Binding, decided twice and bound only on agreement.
  //
  //    Pass one is D0's default: the field name alone. Pass two adds the
  //    printed context measured above. A field binds only when both passes
  //    reach the same fact, so the measured label can refuse a field the name
  //    would have written but can never write one the name would have refused.
  //    The result is strictly no weaker than D0 on its own.
  const availableChargeRows = CANONICAL["matter.charges"].length;
  const laneDecisions = LANE_FIELD_DECISIONS[workflowKeyBase(row)] ?? {};
  const bindings = [];
  const bindingRefusals = [];
  const laneEnforcedRefusals = { ...explicitMappings };
  for (const c of census) {
    const options = { explicitMappings, captionOnly, availableChargeRows, documentAcceptsFill: !noFill };
    const decision = decideBinding({ name: c.name, pdfType: c.type }, options);

    // Four further gates. Every one of them can only refuse; none can write
    // anything D0 would not have written on its own.
    //
    // The class gate: a field the nine-class classifier placed in an unwritable
    // class, or could not name at all, is never bound.
    //
    // The lane protect gate: D0's deny list plus this lane's additions, applied
    // to the field's name and to the text measured beside its widget. Illinois
    // writes "lawyer" where D0's rule reads "attorney"; without this the
    // binder fills counsel's own address from participant facts.
    //
    // The ambiguity gate: a name matching more than one allowlisted descriptor
    // is bound only where this lane read the binary and said which one the form
    // means. `Email Address` matches the address descriptor, which D0 lists
    // first, as well as the email one.
    //
    // The lane-decision gate: a refusal authored against the printed form, for
    // a field the generic descriptors read as something the document does not
    // mean.
    const cls = classOf.get(c.name);
    const classAllows = !NEVER_WRITE.has(cls) && cls !== "unused";
    const laneProtect = laneProtectCategoryOf(c.name)
      ?? c.printedContext?.protectCategory
      ?? null;
    const ambiguity = descriptorsMatching(c.name);
    const laneDecision = laneDecisions[c.name] ?? null;
    const ambiguityResolved = ambiguity.length <= 1 || laneDecision?.bind === decision.factId;
    const laneAllows = !laneDecision || laneDecision.bind === decision.factId;

    if (decision.writable && classAllows && !laneProtect && ambiguityResolved && laneAllows) {
      bindings.push({ field: c.name, class: cls, factId: decision.factId });
      continue;
    }
    const reason = !decision.writable ? decision.reason
      : !classAllows ? "classified_unwritable_or_unnamed"
      : laneProtect ? "lane_protect_rule"
      : laneDecision ? "lane_first_hand_review_refused"
      : "field_name_matches_more_than_one_fact_descriptor";
    bindingRefusals.push({
      field: c.name, reason,
      category: !decision.writable ? (decision.category ?? null)
        : laneProtect ?? (laneDecision ? "lane_review" : !classAllows ? cls : "descriptor_ambiguity"),
      binderDecision: { writable: decision.writable, reason: decision.reason ?? null, factId: decision.factId ?? null },
      classifiedAs: cls,
      matchingDescriptors: ambiguity.length > 1 ? ambiguity : undefined,
      laneReviewNote: laneDecision?.why ?? null,
      printedContext: c.printedContext ?? null
    });
    // Finalization re-runs the binder against the same field name, so anything
    // only this lane refuses has to be refused there too. Naming the field in
    // `explicitMappings` with the lane sentinel makes D0's own conflict guard
    // do it, rather than this lane deciding for itself what gets written.
    if (decision.writable && laneEnforcedRefusals[c.name] === undefined) {
      laneEnforcedRefusals[c.name] = LANE_REFUSED;
    }
  }

  // A block that prints `Address 1` and `Address 2` is one address split over
  // two printed lines, and there is one participant street address to put in
  // it. Binding both stamps the same value twice, which reads on the finished
  // page as a mistake. Only the first line of such a run is kept, and the rest
  // are refused with the reason. A name that merely ends in a digit is not
  // enough: the sibling with the same stem and a lower index has to exist in
  // this same form, and both have to have resolved to the same fact.
  const indexedStem = (name) => {
    const m = /^(.*?)[\s_-]*(\d{1,2})$/.exec(String(name).trim());
    return m ? { stem: m[1].trim(), index: Number(m[2]) } : null;
  };
  for (const b of [...bindings]) {
    const self = indexedStem(b.field);
    if (!self || self.index < 2) continue;
    const sibling = bindings.find((o) => {
      if (o === b || o.factId !== b.factId) return false;
      const other = indexedStem(o.field);
      return other && other.stem === self.stem && other.index < self.index;
    });
    if (!sibling) continue;
    bindings.splice(bindings.indexOf(b), 1);
    bindingRefusals.push({
      field: b.field, reason: "continuation_line_of_a_block_already_bound",
      category: "repeated_line", boundSibling: sibling.field, factId: b.factId,
      note: "One printed block split across numbered lines. The fact set holds a single value for it, and stamping that value into every line of the block would duplicate it on the page."
    });
    if (laneEnforcedRefusals[b.field] === undefined) laneEnforcedRefusals[b.field] = LANE_REFUSED;
  }

  // 6. Flat-overlay anchors, measured out of the page content streams.
  let anchors = [], anchorPages = [], candidateLabels = [];
  if (structuralClassObserved === "flat" && !noFill) {
    const probe = await PDFDocument.create();
    const helvetica = await probe.embedFont(StandardFonts.Helvetica);
    for (let pi = 0; pi < pages.length; pi += 1) {
      const lines = linesByPage[pi];
      const readable = lines.filter((l) => !CID_ENCODED.test(l.text));
      anchorPages.push({
        page: pi + 1, lines: lines.length, readableLines: readable.length,
        unreadableLines: lines.length - readable.length
      });
      // Lines come back sorted top-down, so the "next" line is the one printed
      // directly beneath.
      for (let li = 0; li < readable.length; li += 1) {
        const line = readable[li];
        const nextLineText = readable[li + 1]?.text ?? "";
        for (const blank of blankAnchorsOn(line, captionOnly, nextLineText)) {
          if (blank.x2 - blank.x1 < 24) continue;
          const size = Math.max(7, Math.min(11, line.size || 9));
          anchors.push({
            page: pi + 1, kind: "rule_line_blank",
            label: `${blank.labelBefore} ___ ${blank.labelAfter}`.trim(),
            factId: blank.factId, baselineY: line.y, fontSize: size,
            writeBox: {
              x: Number((blank.x1 + 2).toFixed(1)), y: Number((line.y + 2).toFixed(1)),
              width: Number((blank.x2 - blank.x1 - 4).toFixed(1)), height: Number((size * 1.25).toFixed(1))
            },
            measurement: { blankStartMeasured: true, blankEndMeasured: true, fromGlyphMetrics: true,
              namedByFollowingLine: blank.labelAfter.length === 0 || /^[,\s]*$/.test(blank.labelAfter) }
          });
        }
        const lineLabel = line.text.trim().replace(/[:.\s]+$/, "");
        const lineTarget = overlayFactFor(lineLabel, captionOnly);
        if (lineTarget && lineLabel.length >= 3) {
          candidateLabels.push({
            page: pi + 1, label: lineLabel, factId: lineTarget,
            labelX: line.x, baselineY: line.y, fontSize: line.size, writeBoxDerivable: false,
            reason: "Standalone caption label with no rule line. The value's position is set by the printed cell, which this document does not express as a measurable rectangle, so no coordinate is asserted."
          });
        }
        for (const run of line.runs) {
          if (CID_ENCODED.test(run.text)) continue;
          const label = run.text.trim();
          if (label.length < 3) continue;
          const target = overlayFactFor(label, captionOnly);
          if (!target) continue;
          const size = Math.max(7, Math.min(11, line.size || 9));
          const labelWidth = helvetica.widthOfTextAtSize(label, size);
          const nextX = line.runs.filter((r) => r.x > run.x + 1).map((r) => r.x).sort((a, b) => a - b)[0] ?? null;
          const x = run.x + labelWidth + 4;
          const right = nextX !== null ? nextX - 3 : pages[pi].getWidth() - 36;
          if (right - x < 24) continue;
          anchors.push({
            page: pi + 1, kind: "trailing_label", label, factId: target,
            labelX: run.x, baselineY: line.y, fontSize: size,
            writeBox: {
              x: Number(x.toFixed(1)), y: Number(line.y.toFixed(1)),
              width: Number((right - x).toFixed(1)), height: Number((size * 1.25).toFixed(1))
            },
            measurement: {
              labelPositionMeasured: true, rightBoundaryMeasured: nextX !== null,
              leftEdgeEstimatedFromLabelWidth: true
            }
          });
        }
      }
    }
    // One anchor per fact per page: the first occurrence wins.
    const seen = new Set();
    anchors = anchors.filter((a) => {
      const k = `${a.page}:${a.factId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // An anchor whose composed label does not resolve, under D0, to the fact it
    // claims is dropped rather than written blind.
    anchors = anchors.filter((a) => {
      const laneProtect = laneProtectCategoryOf(a.label);
      const d = decideBinding(
        { name: a.label, pdfType: "text", effectiveLabel: a.label },
        { captionOnly, availableChargeRows }
      );
      if (!laneProtect && d.writable && d.factId === a.factId) return true;
      bindingRefusals.push({
        field: `anchor:${a.label}`,
        reason: laneProtect ? "lane_protect_rule"
          : d.writable ? "anchor_fact_disagrees_with_label" : d.reason,
        category: laneProtect ?? d.category ?? null,
        anchorFactId: a.factId, binderFactId: d.factId ?? null
      });
      return false;
    });
  }

  // 7. Render. The fixture written is the finalized participant artifact:
  //    values materialized into appearances, flattened, sanitized, and
  //    byte-reproducible.
  const form = { countyOption };
  const canonicalFacts = fixtureFor(CANONICAL, form);
  const boundaryFacts = fixtureFor(BOUNDARY, form);
  const mapKind = structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";
  const renderable = !noFill && (mapKind === "acroform" ? bindings.length > 0 : anchors.length > 0);

  let finalizedReport = null;
  let contactSheet = false;
  let nonFilingEnforced = false;
  let deterministic = null;
  const renderedFacts = {};

  const finalize = (facts, notice) => (mapKind === "acroform"
    ? finalizeOfficialForm({
        sourceBytes: bytes, expectedSha256: sha, census, facts,
        explicitMappings: laneEnforcedRefusals, captionOnly,
        documentAcceptsFill: !noFill, nonFilingNotice: notice,
        title: `${state.code} ${row.document_id}`
      })
    : finalizeFlatOverlay({
        sourceBytes: bytes, expectedSha256: sha, anchors, facts,
        nonFilingNotice: notice, title: `${state.code} ${row.document_id}`
      }));

  if (renderable) {
    try {
      for (const [label, facts] of [["canonical", canonicalFacts], ["boundary", boundaryFacts]]) {
        const rendered = await finalize(facts, nonFilingNotice);
        fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
        fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), rendered.bytes);
        renderedFacts[label] = rendered;
        for (const u of rendered.report.unfittable) {
          findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
        }
        for (const r of rendered.report.refused) {
          if (r.category === "unfittable") continue;
          findings.push({ fixture: label, check: "binding_refused", ...r });
        }
        if (label === "canonical") finalizedReport = rendered.report;
      }

      // Determinism: the same source and the same facts must produce the same
      // bytes, or every drift check downstream is noise.
      const again = await finalize(canonicalFacts, nonFilingNotice);
      deterministic = {
        basis: "the canonical fixture rendered twice from the same source binary and the same facts",
        firstSha256: renderedFacts.canonical.report.outputSha256,
        secondSha256: again.report.outputSha256,
        identical: sha256(renderedFacts.canonical.bytes) === sha256(again.bytes)
      };
      if (!deterministic.identical) findings.push({ check: "render_not_deterministic", ...deterministic });

      const sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: renderedFacts.canonical.bytes,
        expectedValues: renderedFacts.canonical.report.expectedValues,
        heading: `${state.code} ${row.document_id} — blank (left) vs finalized fill (right)`
      });
      writeJson(path.join(familyDir, "contact-sheet", "contact-sheet-proof.json"), sheet.proof);
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
      contactSheet = true;
    } catch (error) {
      if (error instanceof NonFilingHoldError) {
        nonFilingEnforced = true;
        findings.push({ check: "non_filing_hold_enforced", notice: error.notice });
      } else if (error instanceof ContactSheetProofError) {
        findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null });
      } else {
        findings.push({ check: "finalize_refused", message: String(error.message).slice(0, 300) });
      }
    }
  }

  // 8. Source-drift and load-bearing mutation tests.
  const mutations = [];
  const record = (name, expectation, passed, detail) =>
    mutations.push({ mutation: name, expectation, passed, detail: detail ?? null });

  // Perturbing the source must be refused, not rendered.
  {
    const perturbed = Buffer.from(bytes);
    perturbed[Math.floor(perturbed.length / 2)] ^= 0xff;
    let refused = false, detail = null;
    try {
      await (mapKind === "acroform"
        ? finalizeOfficialForm({ sourceBytes: perturbed, expectedSha256: sha, census, facts: canonicalFacts })
        : finalizeFlatOverlay({ sourceBytes: perturbed, expectedSha256: sha, anchors, facts: canonicalFacts }));
    } catch (error) { refused = /source drift/.test(error.message); detail = error.message.slice(0, 120); }
    record("source_bytes_perturbed", "the factory refuses to render a source whose hash does not match its pin", refused, detail);
  }

  // The non-filing hold is a refusal, not a flag.
  {
    let held = false;
    try {
      await finalize(canonicalFacts, "DO NOT COMPLETE THIS FORM FOR FILING");
    } catch (error) { held = error instanceof NonFilingHoldError; }
    record("non_filing_notice_asserted", "a form stating it is not for filing raises NonFilingHoldError and produces no fill", held);
  }

  // The contact sheet's proof must be load-bearing: handed the blank document
  // as though it were the finalized one -- the exact F3 defect -- it must
  // refuse rather than emit a sheet nobody can review.
  if (finalizedReport && finalizedReport.expectedValues.length > 0) {
    let refused = false;
    try {
      await buildContactSheet({
        blankBytes: bytes, finalizedBytes: bytes,
        expectedValues: finalizedReport.expectedValues
      });
    } catch (error) { refused = error instanceof ContactSheetProofError; }
    record("contact_sheet_given_unfilled_artifact", "the sheet refuses when the filled panel is not the finalized artifact", refused);
  }

  // The readable-size floor must refuse rather than stamp illegible text.
  {
    const probe = await PDFDocument.create();
    const helvetica = await probe.embedFont(StandardFonts.Helvetica);
    const fit = fitTextToWidget({
      font: helvetica, text: "x".repeat(4000),
      rect: { x: 0, y: 0, width: 60, height: 12 }, multiline: false, minFontSize: MIN_READABLE_FONT_SIZE
    });
    record("value_far_exceeds_widget", `a value that cannot be drawn at ${MIN_READABLE_FONT_SIZE}pt is refused, not clipped`, fit.outcome === "refused", fit.reason ?? null);
  }

  // Every protected category the D0 binder found on this form is re-asserted
  // against the finalized map: nothing bound may be a protected name.
  {
    const leaked = bindings.filter((b) => protectCategoryOf(b.field) !== null);
    record("bound_field_is_protected_category", "no bound field matches a protect rule", leaked.length === 0,
      leaked.map((b) => b.field));
  }

  const mutationsPassed = mutations.every((m) => m.passed);
  if (!mutationsPassed) findings.push({ check: "mutation_test_failed", failed: mutations.filter((m) => !m.passed).map((m) => m.mutation) });

  // 9. Evidence.
  const holds = ["edition_1_runtime_disabled", "f_independent_visual_review_required"];
  if (row.generation_allowed !== "yes") holds.push("state_manifest_generation_allowed_no");
  if (row.asset_class === "source_gated") holds.push("source_gated_never_runtime_selectable");
  if (row.freshness_status && row.freshness_status !== "batch1_repo_ready") holds.push(`freshness_${row.freshness_status}`);
  if (row.legal_review_mapping_status) holds.push("legal_review_mapping_status_see_state_legal_review");
  if (state.legalReviewMissing) holds.push("state_legal_review_missing_release_blocker");
  if (state.legalReviewLanguageOnly) holds.push(`state_legal_review_supplied_only_in_${state.legalReviewLanguageOnly}`);
  if (nonFilingNotice) holds.push("document_states_not_for_filing");
  if (!structuralClassAgrees) holds.push("structural_class_disagrees_with_manifest");

  const inventoryRow = profileInventory.get(row.source_filename) ?? null;
  const fidelity = [];
  if (inventoryRow && inventoryRow.sha256 !== sha) {
    fidelity.push({
      issue: "compiled_profile_form_inventory_sha256_disagrees_with_edition_1_manifest",
      fileName: row.source_filename, profileSha256: inventoryRow.sha256, manifestSha256: row.sha256,
      deliveredSha256: sha,
      resolution: "The Edition 1 pack manifest is the canonical source of record and wins. The compiled profile is read-only to this lane and was not edited."
    });
  }
  if (!structuralClassAgrees) {
    fidelity.push({
      issue: "structural_class_declared_disagrees_with_binary",
      declared: structuralClassDeclared, observed: structuralClassObserved,
      resolution: "The binary is authoritative for how it is rendered; the manifest's declaration is recorded for the captain."
    });
  }
  if (row.field_count && Number(row.field_count) !== census.length) {
    fidelity.push({
      issue: "declared_field_count_disagrees_with_first_hand_census",
      declared: Number(row.field_count), observed: census.length,
      resolution: "The census is the first-hand reading of the binary and is what every binding decision was made against."
    });
  }

  const implementationStatus = noFill
    ? (ownership === OWNERSHIP.SERVICE ? "no_fill_service_block_document" : "no_fill_instructional_document")
    : nonFilingEnforced
      ? "non_filing_hold_no_fill_produced"
      : mapKind === "flat_overlay"
        ? (anchors.length > 0
            ? (contactSheet ? "overlay_implemented_pending_independent_review" : "overlay_render_refused")
            : candidateLabels.length > 0 ? "overlay_labels_measured_write_box_pending_review"
            : readableLineCount > 0 ? "overlay_no_participant_label_matched"
            : "overlay_no_extractable_text_layer")
        : bindings.length > 0
          ? (contactSheet ? "implemented_pending_independent_review" : "acroform_render_refused")
          : "acroform_mapped_all_fields_manual_or_unwritable";

  writeJson(path.join(familyDir, "source-record.json"), {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: LANE, jurisdiction: state.code, state: row.state,
    documentId: row.document_id, documentRole: row.document_role, assetClass: row.asset_class,
    officialTitle: row.official_title, revision: row.revision, language: row.language,
    workflowKey,
    canonicalBundlePath: `Expungement_AI_RCAP_Master_Library_Edition_1/${row.canonical_relative_path}`,
    sourcePack: { partition: "D2", sha256: PACK_SHA256, releaseTag: "rcap-d-source-packs-2026-08-12" },
    sha256: sha, sha256VerifiedAgainstBundleManifest: sourceHashMatches,
    byteLength, bundleDeclaredBytes: Number(row.bytes), byteLengthMatches,
    sourceUrl: row.source_url || null,
    sourceStatus: row.source_status, freshnessStatus: row.freshness_status,
    libraryFolder: LIBRARY_FOLDER[row.asset_class] ?? null,
    binaryPresent: true,
    lifecycleClassification: row.asset_class === "source_gated"
      ? "binary_present_source_gated" : "binary_present_and_current",
    structuralClassObserved, structuralClassDeclared, structuralClassAgrees,
    declaredFieldCount: row.field_count === "" ? null : Number(row.field_count),
    observedAcroFieldCount: census.length,
    pageGeometry, declaredPages: row.pages === "" ? null : Number(row.pages),
    pageCountAgrees: row.pages === "" ? null : Number(row.pages) === pages.length,
    renderStrategy: mapKind === "acroform" ? "acroform_fill" : "flat_overlay_anchor_draw",
    participantFillable: !noFill,
    generationAllowed: row.generation_allowed === "yes",
    nonFilingNotice,
    productionHolds: holds,
    statePackFidelityFindings: fidelity,
    manifestNotes: row.notes || null,
    requiredFollowUp: row.required_follow_up || null,
    ownershipDetermination: {
      [OWNERSHIP.INSTRUCTIONAL]: "Instructional document. It is read, not filed, so no participant fill is produced.",
      [OWNERSHIP.SERVICE]: "Proof of service. Every field on it records the service itself — who served, on whom, where and when — which D0 protects wherever it appears. No participant fill is produced.",
      [OWNERSHIP.COURT_ORDER]: "Court-issued order. Only caption facts are bound; no decretal or dispositional field is ever written.",
      [OWNERSHIP.PARTICIPANT]: "Participant-completed filing. Participant and deterministic fields are bound; every other class is unwritable."
    }[ownership],
    documentOwnership: ownership,
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    censusBasis: "first_hand_inspection_of_verified_binary",
    implementationStatus,
    factoryVersion: FACTORY_VERSION
  });

  writeJson(path.join(familyDir, "field-census.json"), {
    schemaVersion: "rcap-field-census/v3-first-hand",
    censusBasis: "first_hand_inspection_of_verified_binary",
    sha256: sha, structuralClass: structuralClassObserved,
    fieldCount: census.length, pageGeometry, fields: census
  });

  writeJson(path.join(familyDir, "field-classification.json"), {
    schemaVersion: "rcap-field-classification/v4-nine-class",
    documentOwnership: ownership,
    ownershipBasis: "Edition 1 manifest document_role and asset_class, re-checked field by field by the D0 typed binder",
    classCounts: classification.reduce((a, c) => (a[c.class] = (a[c.class] ?? 0) + 1, a), {}),
    entries: classification
  });

  writeJson(path.join(familyDir, "field-classification-policy.json"), {
    schemaVersion: "rcap-field-classification-policy/v2-d0",
    basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs — every field starts protected",
    laneAddition: "The fact is selected by D0 from the field name alone. Four further gates may then refuse it and can never write anything D0 would not: the nine-class classifier, this lane's additional deny rules (applied to the field name and to the text measured beside the widget), a refusal of any name matching more than one allowlisted descriptor unless this lane reviewed the binary, and per-field decisions authored against the printed form.",
    laneProtectRules: LANE_PROTECT_RULES.map(([category, re]) => ({ category, pattern: String(re) })),
    laneFieldDecisions: laneDecisions,
    defaultProtectedCategories: [
      "money", "race", "responsible_official", "signature", "notarization", "service_block",
      "licensing_board", "agency", "court", "clerk", "prosecutor", "attorney", "outside_party",
      "disposition_or_hearing", "non_text_controls", "unindexed_charge_rows"
    ],
    explicitMappings: Object.fromEntries(Object.entries(explicitMappings)),
    explicitMappingRationale: EXPLICIT_MAPPING_NOTES[workflowKeyBase(row)] ?? null,
    laneEnforcedRefusals: Object.entries(laneEnforcedRefusals)
      .filter(([, v]) => v === LANE_REFUSED).map(([k]) => k)
  });

  const mapPath = path.join(familyDir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json");
  writeJson(mapPath, {
    schemaVersion: `rcap-${mapKind}-map/v5`,
    family: familySlug, documentOwnership: ownership,
    sha256: sha, pageGeometry, captionOnly,
    factoryVersion: FACTORY_VERSION,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs) selecting from the field name, then narrowed by four refusal-only gates: the nine-class classifier, this lane's additional deny rules applied to the name and to the printed context measured from this exact sha256, a descriptor-ambiguity refusal, and per-field decisions read off the binary",
    bindings, bindingRefusals,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
    anchorCapture: mapKind === "flat_overlay"
      ? {
          basis: "text drawn by this exact sha256, read from the page content streams",
          pages: anchorPages, anchorCount: anchors.length, anchors,
          candidateLabelCount: candidateLabels.length, candidateLabels,
          note: "Label position and the right boundary are measured. The write box's left edge is derived from the label's rendered width, so it is the one estimated number here and is what independent visual review confirms."
        }
      : null,
    overflowPolicy: { longText: "shrink_to_fit_then_addendum", multiline: "wrap_within_widget_rect" }
  });

  writeJson(path.join(familyDir, "reports", "populated-fields.json"),
    bindings.map((b) => ({ field: b.field, class: b.class, factId: b.factId })));

  writeJson(path.join(familyDir, "reports", "protected-fields.json"), {
    documentOwnership: ownership, wholeDocumentUnwritable: noFill,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
    binderRefusals: bindingRefusals
  });

  writeJson(path.join(familyDir, "reports", "overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v2",
    boundaryFixtureApplied: Boolean(renderedFacts.boundary),
    unfittableRefusedNotClipped: (renderedFacts.canonical?.report.unfittable ?? [])
      .concat(renderedFacts.boundary?.report.unfittable ?? []),
    findings
  });

  writeJson(path.join(familyDir, "reports", "mutation-tests.json"), {
    schemaVersion: "rcap-mutation-tests/v1",
    basis: "each mutation removes or contradicts one load-bearing property and asserts the factory refuses",
    allPassed: mutationsPassed, mutations
  });

  writeJson(path.join(familyDir, "reports", "determinism.json"), deterministic ?? {
    rendered: false,
    reason: "no finalized artifact was produced for this family, so there is nothing to re-render"
  });

  // Negative fixture: with no participant facts, nothing is written.
  let negativeRefused = null;
  if (renderable && !nonFilingEnforced) {
    try {
      const empty = await finalize({}, nonFilingNotice);
      negativeRefused = {
        written: empty.report.written.length,
        refused: empty.report.refused.length,
        refusedFields: empty.report.refused
      };
    } catch (error) { negativeRefused = { error: String(error.message).slice(0, 200) }; }
  }
  writeJson(path.join(familyDir, "fixtures", "negative.json"), {
    schemaVersion: "rcap-negative-fixture/v4-typed",
    level: "participant_fact",
    assertion: "With no participant facts supplied nothing is written. Every field starts protected: money, race, arrest and disposition dates without an explicit mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction rather than by a deny pattern.",
    emptyFactSetRender: negativeRefused,
    refusedFields: renderedFacts.canonical?.report.refused ?? bindingRefusals
  });
  writeJson(path.join(familyDir, "fixtures", "canonical.json"), {
    schemaVersion: "rcap-fixture/v2", level: "participant_fact", fixture: "canonical", facts: canonicalFacts
  });
  writeJson(path.join(familyDir, "fixtures", "boundary.json"), {
    schemaVersion: "rcap-fixture/v2", level: "participant_fact", fixture: "boundary", facts: boundaryFacts
  });

  // Protected-field, visibility, clipping and active-content scan, read back
  // from the finalized artifact rather than asserted.
  const canonicalPath = path.join(familyDir, "fixtures/canonical-filled.pdf");
  if (finalizedReport && fs.existsSync(canonicalPath)) {
    const finalizedBytes = fs.readFileSync(canonicalPath);
    const finalizedDoc = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalizedDoc);
    const missing = missingExpectedValues(visible, finalizedReport.expectedValues);
    const placeholder = /\b(tbd|todo|lorem|placeholder|sample text|fixme|\{\{|\$\{)/i.exec(visible);
    const protectedNames = new Set(finalizedReport.protectedFields?.map((p) => p.field) ?? []);
    const writtenProtected = finalizedReport.written.filter((w) => protectedNames.has(w.field));
    const residue = scanBytesForActiveContent(finalizedBytes);
    let interactiveFieldsRemaining = 0;
    try { interactiveFieldsRemaining = finalizedDoc.getForm().getFields().length; } catch { /* no form: flattened */ }
    // One AcroForm field can own several widgets -- Illinois repeats the case
    // number in every page header from a single field -- so a value is expected
    // once per widget, not once per field.
    const widgetsOf = new Map(census.map((c) => [c.name, Math.max(1, c.widgets.length)]));
    const expectedOccurrences = new Map();
    for (const w of finalizedReport.written) {
      const value = String(resolveWrittenValue(finalizedReport, w));
      expectedOccurrences.set(value,
        (expectedOccurrences.get(value) ?? 0) + (widgetsOf.get(w.field) ?? 1));
    }
    const duplicated = countDuplicatedValues(
      visibleTextOfDocument(await PDFDocument.load(bytes, { ignoreEncryption: true })),
      visible, expectedOccurrences);
    writeJson(path.join(familyDir, "reports", "protected-fields-scan.json"), {
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      writtenFields: finalizedReport.written.length,
      refusedFields: finalizedReport.refused.length,
      protectedFieldsRefused: finalizedReport.protectedFields?.length ?? 0,
      violations: writtenProtected,
      valuesWrittenButNotVisible: missing,
      valuesVisibleMoreOftenThanWritten: duplicated,
      placeholderValues: placeholder ? [placeholder[0]] : [],
      activeContentResidue: residue.hits,
      activeContentInspectable: residue.inspectable,
      interactiveFieldsRemainingAfterFlatten: interactiveFieldsRemaining,
      pass: writtenProtected.length === 0 && missing.length === 0 && !placeholder
        && residue.hits.length === 0 && duplicated.length === 0 && interactiveFieldsRemaining === 0
    });
    if (writtenProtected.length || missing.length || placeholder || residue.hits.length || duplicated.length || interactiveFieldsRemaining) {
      findings.push({ check: "protected_or_visibility_violation", writtenProtected, missing, residue: residue.hits, duplicated, interactiveFieldsRemaining });
    }
  }

  const renderedArtifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    const p = path.join(familyDir, rel);
    if (!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    renderedArtifacts[rel] = { sha256: sha256(buf), bytes: buf.length };
  }
  writeJson(path.join(familyDir, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1", sourceSha256: sha,
    renderer: "scripts/rcap-official-forms/lanes/d2a-regenerate.mjs",
    reproducible: "Modification dates are pinned, so re-rendering from the same source binary reproduces these hashes byte for byte.",
    artifacts: renderedArtifacts
  });

  fs.writeFileSync(path.join(familyDir, "handoff.md"), handoffFor({
    state, row, familySlug, sha, ownership, structuralClassObserved, census, bindings,
    bindingRefusals, anchors, holds, fidelity, implementationStatus, contactSheet,
    nonFilingNotice, mutations, deterministic
  }));

  return {
    ...result, status: implementationStatus, ownership, mapKind,
    sourceHashMatches: true,
    fields: census.length, bound: bindings.length, refused: bindingRefusals.length,
    unfittable: (renderedFacts.canonical?.report.unfittable.length ?? 0)
      + (renderedFacts.boundary?.report.unfittable.length ?? 0),
    anchors: anchors.length, candidateLabels: candidateLabels.length,
    contactSheet, nonFilingHold: Boolean(nonFilingNotice), holds: holds.length,
    fidelityFindings: fidelity.length, mutationsPassed,
    deterministic: deterministic?.identical ?? null,
    findings: findings.length
  };
}

// A value drawn more times than the renderer placed it means a duplicated
// stamp. The blank document is subtracted first, because a form that prints
// "District Court" three times in its own caption is not evidence of anything,
// and the expected count is per widget rather than per field.
function countDuplicatedValues(blankText, visibleText, expectedOccurrences) {
  const normalize = (s) => String(s).replace(/\s+/g, "").toLowerCase();
  const occurrences = (hay, needle) => {
    let seen = 0, from = 0;
    for (;;) {
      const at = hay.indexOf(needle, from);
      if (at === -1) return seen;
      seen += 1;
      from = at + needle.length;
    }
  };
  const blank = normalize(blankText);
  const filled = normalize(visibleText);
  const out = [];
  for (const [value, expected] of expectedOccurrences) {
    const needle = normalize(value);
    if (needle.length < 6) continue;
    const added = occurrences(filled, needle) - occurrences(blank, needle);
    if (added > expected) out.push({ value, placedOnWidgets: expected, addedByFill: added });
  }
  return out;
}

// The finalize report records which fact each field carried; this recovers the
// value that was drawn so occurrences can be counted against it.
function resolveWrittenValue(report, written) {
  const index = report.written.indexOf(written);
  return report.expectedValues[index];
}

const workflowKeyBase = (row) => `${row.jurisdiction_code}:${row.document_id}`;

/**
 * Every allowlisted descriptor a field name matches.
 *
 * D0 takes the first and treats a tie as a defect in the authored list rather
 * than something to resolve at runtime. That is the right call for the shared
 * module, but this corpus contains real ties -- `Email Address` matches the
 * address descriptor, which is listed first, as well as the email one -- so a
 * tie is surfaced here and refused unless this lane reviewed the binary and
 * said which descriptor the form actually means.
 */
function descriptorsMatching(name) {
  const hay = d0Haystack(name);
  return FACT_DESCRIPTORS.filter((d) => d.match.test(hay)).map((d) => d.factId);
}

const EXPLICIT_MAPPING_NOTES = {
  "AZ:AOCCRSL1F-050825":
    "`Charge` is the petition's own single free-text description of the charge being sealed, printed immediately after the case caption. It is the participant's charge, transcribed from their record, and binds only because it is named here.",
  "KS:KS-NOTICE-OF-HEARING-ON-PETITION-FOR-EXPUNGEM":
    "The form carries three identically-named contact blocks. The first is the petitioner's. The second and third are the prosecuting attorney's and the arresting law-enforcement agency's, and are service recipients whose addresses must never be filled from participant facts. Naming them with the lane sentinel makes D0's own explicit-mapping conflict guard refuse them."
};

function handoffFor(f) {
  const lines = [];
  lines.push(`# ${f.state.code} — ${f.row.official_title}`);
  lines.push("");
  lines.push(`- Lane: ${LANE} (first build; this state had no package root at the D0 base)`);
  lines.push(`- Document: \`${f.row.document_id}\` ${f.row.revision} (${f.row.language})`);
  lines.push(`- Workflow key: \`${f.row.workflow_key}\``);
  lines.push(`- Source sha256: \`${f.sha}\` — verified against the Edition 1 STATE_MANIFEST`);
  lines.push(`- Structure: ${f.structuralClassObserved} (declared \`${f.row.structural_class}\`)`);
  lines.push(`- Ownership: ${f.ownership}`);
  lines.push(`- Status: \`${f.implementationStatus}\``);
  lines.push("");
  lines.push("## What was bound");
  lines.push("");
  if (f.structuralClassObserved === "acroform") {
    lines.push(`${f.census.length} fields inventoried first-hand, ${f.bindings.length} bound, ${f.bindingRefusals.length} refused.`);
  } else {
    lines.push(`Flat form with no widgets. ${f.anchors.length} overlay anchors measured out of the page content streams.`);
  }
  lines.push("");
  lines.push("Every field starts protected. A field binds only when D0's typed binder reaches the same fact from the field's name and from the printed context measured beside the widget. Court, clerk, prosecutor, attorney, agency, service-recipient, outside-party, signature, notary, money and race fields are refused by construction.");
  lines.push("");
  lines.push("## Holds carried forward");
  lines.push("");
  for (const h of f.holds) lines.push(`- \`${h}\``);
  if (f.nonFilingNotice) lines.push(`- The document states on its own face: "${f.nonFilingNotice}". No fill is produced.`);
  lines.push("");
  if (f.fidelity.length > 0) {
    lines.push("## State-pack fidelity findings");
    lines.push("");
    for (const item of f.fidelity) lines.push(`- **${item.issue}** — ${item.resolution}`);
    lines.push("");
  }
  lines.push("## Verification");
  lines.push("");
  for (const m of f.mutations) lines.push(`- ${m.passed ? "pass" : "FAIL"} — ${m.mutation}: ${m.expectation}`);
  if (f.deterministic) lines.push(`- ${f.deterministic.identical ? "pass" : "FAIL"} — the canonical fixture renders to identical bytes on a second run`);
  if (f.contactSheet) lines.push("- pass — the contact sheet is built from the finalized artifact and every expected value is provably visible in it");
  lines.push("");
  lines.push("This package is complete pending independent review. It is not approved, not terminal and not runtime-selectable.");
  lines.push("");
  return lines.join("\n");
}

// --- entry point ------------------------------------------------------------

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  console.error("d2a-regenerate: imported rather than run; no packages were regenerated.");
} else {
  await main();
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-")).map((s) => s.toUpperCase());
  const summary = [];

  for (const state of STATES) {
    if (only.length > 0 && !only.includes(state.code)) continue;
    const stateDir = path.join(PACK_ROOT, "STATES", state.code);
    const manifest = parseCsv(fs.readFileSync(path.join(stateDir, "STATE_MANIFEST.csv"), "utf8"));
    const readme = fs.readFileSync(path.join(stateDir, "STATE_README.md"), "utf8");

    // Release blockers the state's own README reports are preserved, never
    // cleared, whatever the binaries turn out to render like.
    state.legalReviewMissing = /Legal review:\s*missing/i.test(readme);
    const reviewRow = manifest.find((r) => r.asset_class === "legal_review");
    state.legalReviewLanguageOnly = reviewRow && reviewRow.language !== "EN" ? reviewRow.language.toLowerCase() : null;

    const profile = JSON.parse(fs.readFileSync(
      path.join(rootDir, `src/lib/rcap-engine/compiled/profiles/${state.profile}.json`), "utf8"));
    const profileInventory = new Map((profile.packetGenerator?.formInventory ?? []).map((r) => [r.fileName, r]));

    const families = [];
    const nonPdfSources = [];
    for (const row of manifest) {
      if (row.asset_class === "legal_review") continue;
      const rel = row.canonical_relative_path;
      if (!rel.toLowerCase().endsWith(".pdf")) {
        nonPdfSources.push({
          documentId: row.document_id, structuralClass: row.structural_class,
          canonicalRelativePath: rel, sha256: row.sha256,
          reason: "Not a PDF. The official-form factory renders PDFs only; this source is recorded, not rendered."
        });
        continue;
      }
      const packPath = path.join(PACK_ROOT, rel);
      if (!fs.existsSync(packPath)) {
        families.push({ jurisdiction: state.code, family: familySlugOf(row), documentId: row.document_id,
          status: "blocked_source_binary_absent_from_pack" });
        continue;
      }
      const built = await buildFamily({ state, row, packPath, profileInventory });
      families.push(built);
      console.log(`  ${state.code} ${built.family.padEnd(52)} ${built.status}`);
    }

    // Lane-scoped index. The two shared indexes are owned by the captain and
    // are never written here: seven concurrent lanes would collide on them.
    const profileOnlyRows = [...profileInventory.keys()]
      .filter((fileName) => !manifest.some((r) => r.source_filename === fileName));
    writeJson(path.join(OUT, state.slug, "state-index.json"), {
      schemaVersion: "rcap-lane-state-index/v1",
      lane: LANE, jurisdiction: state.code, jurisdictionSlug: state.slug,
      generatedAt: "2026-08-12",
      sourcePack: { partition: "D2", sha256: PACK_SHA256, releaseTag: "rcap-d-source-packs-2026-08-12" },
      factoryVersion: FACTORY_VERSION,
      firstBuild: true,
      mergeNote: "The captain merges these rows into verified-binary-index.json and implementation-index.json at import. This lane does not write either shared file.",
      stateReadme: {
        legalReviewMissing: state.legalReviewMissing,
        legalReviewLanguageOnly: state.legalReviewLanguageOnly
      },
      familyCount: families.length,
      families,
      nonPdfSources,
      statePackFidelity: {
        compiledProfileFormInventoryRowsWithNoEdition1Counterpart: profileOnlyRows,
        resolution: "The Edition 1 pack manifest is the canonical source of record. Rows the profile lists but Edition 1 does not supply are recorded as state-pack fidelity findings; the compiled profile is read-only to this lane and was not edited."
      }
    });

    summary.push({
      jurisdiction: state.code, families: families.length,
      implemented: families.filter((f) => /implemented_pending_independent_review$/.test(f.status)).length,
      bound: families.reduce((a, f) => a + (f.bound ?? 0), 0),
      fields: families.reduce((a, f) => a + (f.fields ?? 0), 0)
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}
