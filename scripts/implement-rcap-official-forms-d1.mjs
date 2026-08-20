// Completes the D1 implementation for every family whose canonical binary is
// present and hash-verified.
//
// Per family: first-hand census with widget geometry, nine-class field
// classification, field map / overlay profile, canonical + boundary +
// negative fixtures, filled PDFs, a blank-vs-filled contact sheet built by
// embedding the real pages, and protected-field / placeholder / clipping /
// overflow / drift checks.
//
// Ownership is decided per document and then re-checked per field. A document
// that only carries instructions produces no fill. A court-issued order
// accepts caption facts and nothing else -- never a decretal finding. An
// opposing party's response is never written at all. Everything else runs the
// full field-level gate, where judge, clerk, prosecutor, agency-use,
// signature, notarization, service and court-use-only fields are unwritable
// regardless of what the document is called.
//
// A flat PDF gets no fabricated coordinates. It gets an overlay profile that
// names the measured page boxes and demands anchor capture against this exact
// sha256.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { decideBinding as decideTypedBinding, selectOnePerSlot } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { artifactProvenance } from "./rcap-official-forms/rcap-artifact-provenance.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "./rcap-official-forms/rcap-contact-sheet.mjs";
import { reconcileWrittenAgainstDeclared } from "./rcap-official-forms/rcap-evidence-contract.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, StandardFonts, rgb } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.RCAP_BUNDLE_EXTRACT
  ?? "/tmp/claude-0/-home-user-legalease-partner-dashboard-clean/54ff2bf1-37ee-5073-8d13-dc21b63a0975/scratchpad/bundle/extracted";
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const RENDERER_VERSION = "implement-rcap-official-forms-d1/v2-provenance-sidecar";
// Pinned rather than read from the clock, so re-running unchanged inputs
// produces an identical record and a drift check keeps its meaning.
const GENERATED_AT = "2026-08-19T00:00:00.000Z";
const readJson = (p, fallback) => {
  if (fallback !== undefined && !fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
};

// pdf-lib stamps a fresh ModDate on every save, which would make each run
// produce byte-different fixtures and turn any drift check into noise. Pinning
// it makes a re-render reproducible: identical inputs give identical bytes.
const RENDER_DATE = new Date("2026-08-12T00:00:00.000Z");

// Stamped into every map this builder writes. The shared verifier applies the
// D0-remediated invariants only to packages carrying it, so a package built by
// the previous factory stays valid until its own state session regenerates it.
const FACTORY_VERSION = "d0-remediated-v1";
const stamp = (doc) => { doc.setModificationDate(RENDER_DATE); return doc; };

// --- name normalization -----------------------------------------------------
// Field names in this corpus arrive in at least four conventions: camelCase
// (`caseNo`), dotted paths (`Def.Address.City`), PascalCase (`PetitionerName`)
// and squashed lowercase (`citystatezip`). Every rule below is matched against
// a haystack holding both a separator-normalized and a fully squashed form, so
// a pattern written with `\s*` between tokens hits all four.
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
  const squashed = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${spaced} || ${squashed}`;
}

// A Type0/Identity-H subset font with no ToUnicode map decodes to glyph
// indices, which surface as NUL-padded text. Those runs name nothing and
// are excluded from anchor placement rather than guessed at.
const CID_ENCODED = /\u0000/;

// --- document ownership -----------------------------------------------------
const OWNERSHIP = {
  INSTRUCTIONAL: "instructional_no_participant_fill",
  OUTSIDE_PARTY: "outside_party_completed",
  COURT_ORDER: "court_issued_caption_only",
  PARTICIPANT: "participant_completed"
};
function determineOwnership(record) {
  const fileSlug = (record.canonicalBundlePath ?? "").split("/").pop() ?? "";
  const signal = haystack([record.documentRole ?? "", fileSlug.replace(/\.pdf$/i, ""), record.officialTitle ?? ""].join(" "));
  if (record.libraryFolder === "03_INSTRUCTIONS") return OWNERSHIP.INSTRUCTIONAL;
  if (/\binstructions?\b|completing\s*the|how\s*to\s*(file|complete)/.test(signal)) return OWNERSHIP.INSTRUCTIONAL;
  if (/\bresponse\s*to\s*petition\b|objection\s*to\s*petition/.test(signal)) return OWNERSHIP.OUTSIDE_PARTY;
  // A combined "Petition and Order" packet is driven by its petition half.
  if (/\bpetition\b|\bmotion\b|\bapplication\b|\baffidavit\b|\brequest\b|\bstipulation\b|in\s*forma\s*pauperis|fee\s*waiver/.test(signal)) {
    return OWNERSHIP.PARTICIPANT;
  }
  if (/\border\b|\bjudgment\b|\bdecree\b|notice\s*of\s*hearing|certificate\s*of\s*expunge/.test(signal)) return OWNERSHIP.COURT_ORDER;
  return OWNERSHIP.PARTICIPANT;
}

// --- nine-class field classification ----------------------------------------
// Order matters: the first match wins, so the unwritable classes are tested
// before any participant pattern can claim a field.
const RULES = [
  [/for\s*(court|office|clerk|agency|official)\s*use|court\s*use\s*only|do\s*not\s*write|office\s*use\s*only|scan\s*num|barcode|bar\s*code|file\s*stamp|filed\s*stamp|court\s*seal/, "prohibited"],
  [/notar|jurat|acknowledg(ed|ment)\s*before\s*me|sworn\s*to\s*before|my\s*commission\s*expires|notary\s*public/, "protected"],
  [/certificate\s*of\s*service|proof\s*of\s*service|service\s*of\s*process|process\s*server|\bserved\s*(on|by|upon)\b/, "protected"],
  [/signature|\bsigned\s*by\b|\bsign\s*here\b|^\s*sign\b|\bsig\b/, "signature"],
  [/judge|magistrate|commissioner|so\s*ordered|bench|hearing\s*officer|referee/, "court_or_agency"],
  [/\bclerk\b|deputy\s*clerk|date\s*filed|filing\s*stamp|entered\s*on|distribution/, "court_or_agency"],
  [/it\s*is\s*(hereby\s*)?ordered|ordered\s*(and\s*)?adjudged|is\s*(hereby\s*)?(granted|denied)|ruling|adjudged|decree|disposition\s*of\s*(this\s*)?(petition|motion)|hearing\s*(date|time|result)/, "court_or_agency"],
  [/prosecut|district\s*attorney|commonwealth\s*s?\s*attorney|state\s*s?\s*attorney|solicitor|county\s*attorney|opposing/, "outside_party"],
  [/(sheriff|police|law\s*enforcement|bureau|state\s*patrol)\s*(use|only)|agency\s*use|apsin|acic\s*use/, "outside_party"],
  [/ssn|social\s*security|driver\s*s?\s*licen[cs]e|\bdl\s*num|state\s*id\s*num|\boln\b|jail\s*id|\bsid\b|fbi\s*num/, "manual"],
  // Participant-supplied, but not derivable from the participant fact set:
  // counsel of record, ages computed against an offense date, a court
  // division number, and free-text race/sex descriptors.
  [/attorney|counsel|\besq\b|law\s*firm|bar\s*(no|num)/, "manual"],
  // An agency block on a petition carries the arresting or record-holding
  // agency's own address. It is transcribed from the participant's record,
  // never populated from the participant's contact facts.
  [/agency|sheriff|police|law\s*enforcement|bureau|state\s*patrol|probation|parole/, "manual"],
  [/\bage\s*at\b|age\s*of\s*(the\s*)?(petitioner|defendant)|\bage\b/, "manual"],
  [/\bdivision\b/, "manual"],
  [/date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/, "deterministic"],
  [/printed\s*name|petitioner|applicant|defendant|movant|\bdef\b|your\s*name|full\s*legal\s*name|first\s*name|last\s*name|middle\s*(name|initial)|party\s*names?|case\s*name|^\s*name\b/, "participant"],
  [/city\s*state\s*zip/, "participant"],
  [/street\s*addr|mailing\s*addr|^\s*addr|\baddress\b|\bcity\b|\bstate\b|\bzip\b|postal|phone|telephone|\bemail\b/, "participant"],
  [/\bdob\b|date\s*of\s*birth|birth\s*date/, "participant"],
  [/\bcounty\b|court\s*name|type\s*of\s*court|judicial\s*(district|circuit)|\bdivision\b|\bvenue\b/, "participant"],
  [/case\s*(no|num|#)|docket|citation\s*(no|num)|cause\s*(no|num)|file\s*(no|num)|case\s*id/, "participant"],
  [/charge|offense|statute|violation|\bcount\b|arrest\s*date|date\s*of\s*arrest|conviction\s*date|disposition\s*date/, "participant"]
];
const UNUSED_NAME = /^\s*$|^(text|field|untitled|undefined|blank|fill)\s*\d*\s*(\|\||$)/;

function classify(name, type, ownership) {
  const hay = haystack(name);
  for (const [re, cls] of RULES) if (re.test(hay)) return cls;
  if (UNUSED_NAME.test(hay)) return "unused";
  // A named election the renderer cannot decide from participant facts.
  if (type === "checkbox" || type === "radio" || type === "dropdown" || type === "optionlist") return "manual";
  if (ownership === OWNERSHIP.COURT_ORDER) return "court_or_agency";
  return "manual";
}
const POPULATABLE = new Set(["participant", "deterministic"]);
// Which classes may be written, stated as an allowlist.
//
// This was a denylist of the classes that may not be, and a denylist is only
// ever as complete as the last class somebody remembered to add. `manual` was
// added after the binder wrote into a box the classifier had declined to
// describe; `unused` was not, and KY AOC-334's `Text1` -- classified `unused`
// -- was bound and written anyway. The classifier emits `unused`,
// `not_applicable`, `manual_participant` and `prosecutor_or_outside_party`
// besides, none of which the denylist named.
//
// Inverted, a class nobody has thought about yet is refused by default, and
// adding a tenth class to the classifier cannot silently reopen the hole.
const WRITABLE_CLASSES = new Set(["participant", "deterministic", "participant_writable"]);
const isUnwritableClass = (klass) => !WRITABLE_CLASSES.has(String(klass));

// --- fact bindings ----------------------------------------------------------
// Strictly most-specific first. `PetitionerCity` and `Def.VitalStats.DOB` both
// carry a party token, so any generic person-name pattern has to sit at the
// very bottom or it swallows every compound field on the form.
const FACT_BINDINGS = [
  [/city\s*state\s*zip/, "participant.city_state_zip"],
  [/\bdob\b|date\s*of\s*birth|birth\s*date/, "participant.date_of_birth"],
  [/first\s*name/, "participant.first_name"],
  [/last\s*name|surname/, "participant.last_name"],
  [/middle\s*(name|initial)/, "participant.middle_name"],
  [/street\s*addr|mailing\s*addr|addr(ess)?\s*(line\s*)?\d|^\s*addr|\baddress\b/, "participant.street_address"],
  [/\bcity\b/, "participant.city"],
  [/\bzip\b|postal/, "participant.zip"],
  [/phone|telephone/, "participant.phone"],
  [/\bemail\b/, "participant.email"],
  [/\bstate\b/, "participant.state"],
  [/\bcounty\b/, "matter.county"],
  [/court\s*name|type\s*of\s*court|judicial\s*(district|circuit)/, "matter.court"],
  [/case\s*(no|num|#)|docket|cause\s*(no|num)|file\s*(no|num)|case\s*id/, "matter.case_number"],
  [/citation\s*(no|num)/, "matter.citation_number"],
  [/arrest\s*date|date\s*of\s*arrest/, "matter.arrest_date"],
  [/offense\s*date|date\s*of\s*offense|violation\s*date/, "matter.offense_date"],
  [/conviction\s*date/, "matter.conviction_date"],
  [/disposition\s*date/, "matter.disposition_date"],
  [/charge|offense|statute|violation/, "matter.charge"],
  [/date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/, "deterministic.filing_date"],
  [/printed\s*name|full\s*legal\s*name|your\s*name|petitioner|applicant|defendant|movant|\bdef\b|party\s*names?|case\s*name|\bname\b/, "participant.full_legal_name"]
];
// A court-issued order is only ever completed by the filer in its caption.
const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

// A checkbox, radio group or multi-select is a legal election, never a
// transcription of a participant fact, so no fact ever binds to one.
const BINDABLE_TYPES = new Set(["text", "dropdown"]);
// A charge table repeats one row of facts N times (`DateOfArrest1..10`).
// Every row must address its own charge, or one offense gets stamped down the
// whole table.
const ROW_FACTS = new Set([
  "matter.case_number", "matter.citation_number", "matter.charge",
  "matter.arrest_date", "matter.offense_date", "matter.conviction_date", "matter.disposition_date"
]);
function rowIndexOf(name) {
  const m = /^(.*?)(\d{1,2})$/.exec(String(name).trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 40 ? n - 1 : null;
}
function bindingFor(name, type, cls, ownership) {
  if (!POPULATABLE.has(cls)) return null;
  if (!BINDABLE_TYPES.has(type)) return null;
  const hay = haystack(name);
  for (const [re, target] of FACT_BINDINGS) {
    if (!re.test(hay)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    const row = ROW_FACTS.has(target) ? rowIndexOf(name) : null;
    return row === null ? target : `matter.charges[${row}].${target.slice("matter.".length)}`;
  }
  return null;
}
// Printed labels on a flat form are prose, not field names, so they get their
// own matcher. It is deliberately narrower than the AcroForm binder: an
// overlay writes blind, so only labels whose meaning is unambiguous qualify,
// and any label belonging to a court, agency, opposing party, signature,
// notarization or service block is refused outright.
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
// A fill-in-the-blank form carries its answer boxes as runs of underscores
// inside prose. The prose on either side of a blank is what names it, so each
// blank is matched against the text that immediately precedes it and, failing
// that, the text that immediately follows.
const BLANK_BINDINGS = [
  [/case\s*(no|number)\.?\s*:?\s*$/i, null, "matter.case_number"],
  [/citation\s*(no|number)\.?\s*:?\s*$/i, null, "matter.citation_number"],
  [/\bcounty\s*(of)?\s*:?\s*$/i, null, "matter.county"],
  [/\bin\s+the\s*$/i, /^\s*court\b/i, "matter.court"],
  [/court\s+of\s*$/i, null, "matter.county"],
  [/date\s*of\s*birth\s*:?\s*$/i, null, "participant.date_of_birth"],
  [/(mailing\s*|street\s*)?address\s*:?\s*$/i, null, "participant.street_address"],
  [/\bcity\s*:?\s*$/i, null, "participant.city"],
  [/\bzip(\s*code)?\s*:?\s*$/i, null, "participant.zip"],
  [/(telephone|phone)(\s*(no|number))?\s*:?\s*$/i, null, "participant.phone"],
  [/e-?mail(\s*address)?\s*:?\s*$/i, null, "participant.email"],
  [/(petitioner|defendant|applicant|movant)(\s*'?s)?\s*(name)?\s*:?\s*$/i, null, "participant.full_legal_name"],
  [/(printed\s*name|full\s*name|name)\s*:?\s*$/i, null, "participant.full_legal_name"],
  [null, /^\s*,?\s*(defendant|petitioner|applicant|movant)\b/i, "participant.full_legal_name"],
  [null, /^\s*,?\s*county\b/i, "matter.county"]
];
function blankFactFor(before, after, ownership) {
  const b = before.slice(-60), a = after.slice(0, 40);
  if (OVERLAY_LABEL_DENY.test(b) || OVERLAY_LABEL_DENY.test(a)) return null;
  for (const [beforeRe, afterRe, target] of BLANK_BINDINGS) {
    if (beforeRe && !beforeRe.test(b)) continue;
    if (afterRe && !afterRe.test(a)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

// Locates every rule line on a text line and names it from the surrounding
// prose. Positions come straight from the glyph metrics, so a blank's start
// and end are measured, not estimated.
function blankAnchorsOn(line, ownership, minChars = 5) {
  const chars = line.chars ?? [];
  const out = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i].c !== "_") { i++; continue; }
    let j = i;
    while (j < chars.length && (chars[j].c === "_" || (chars[j].c === " " && chars[j + 1]?.c === "_"))) j++;
    const span = chars.slice(i, j);
    const underscores = span.filter((c) => c.c === "_").length;
    if (underscores >= minChars) {
      const before = chars.slice(0, i).map((c) => c.c).join("");
      const after = chars.slice(j).map((c) => c.c).join("");
      const target = blankFactFor(before, after, ownership);
      if (target) {
        const x1 = span[0].x, x2 = span[span.length - 1].x + span[span.length - 1].w;
        out.push({ factId: target, x1, x2,
          labelBefore: before.trim().slice(-40), labelAfter: after.trim().slice(0, 30) });
      }
    }
    i = j;
  }
  return out;
}

function overlayFactFor(label, ownership) {
  const clean = label.replace(/[\s:. ]+$/g, "").trim();
  if (OVERLAY_LABEL_DENY.test(clean)) return null;
  for (const [re, target] of OVERLAY_LABEL_BINDINGS) {
    if (!re.test(clean)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

// Resolves both plain fact ids and indexed charge-row ids.
function resolveFact(facts, id) {
  const m = /^matter\.charges\[(\d+)\]\.(.+)$/.exec(id);
  if (!m) return facts[id];
  return facts["matter.charges"]?.[Number(m[1])]?.[m[2]];
}

export const CANONICAL = {
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
  // One charge, so every unused table row stays blank in the canonical fixture.
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
  // Three charges, so multi-row tables are exercised and single-charge forms
  // are forced to report the rows they cannot carry.
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

function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

// Importing this module must not regenerate every state package. The whole
// build is a top-level side effect, so anything that imports it -- a test, a
// helper, an editor's language server -- would otherwise rewrite the corpus on
// import. The entry point is now explicit.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  console.error("implement-rcap-official-forms-d1: imported rather than run; no packages were regenerated.");
} else {
await main();
}

async function main() {
// The source root has to be there before anything is processed.
//
// Every family resolves its bytes under SRC and is skipped when the file is
// absent, which is correct per family and catastrophic in aggregate: with no
// extract mounted, EVERY family is skipped, and the run then rewrote
// implementation-index.json from an empty result set. A no-source run
// therefore replaced a populated index with one describing nothing, deleting
// the record of 146 families while reporting success and exiting 0.
//
// A run that processed nothing has learned nothing, and must not be allowed to
// overwrite what a run that processed everything recorded. So the source root
// is validated up front, and the index write below is gated on having actually
// rendered something.
if (!fs.existsSync(SRC) || !fs.statSync(SRC).isDirectory()) {
  console.error(`FAIL official-forms D1 — the source root is absent: ${SRC}`);
  console.error("Set RCAP_BUNDLE_EXTRACT to the mounted Master Library extract. Nothing was written.");
  process.exit(1);
}

const index = readJson(path.join(OUT, "verified-binary-index.json"));
const results = [];
// Families whose pinned bytes were actually read and matched. Not results.length:
// that also counts families skipped for an approved map or for source drift,
// and a run made entirely of skips is exactly the run this guard exists to stop.
let processedFamilies = 0;

for (const fam of index.families) {
  const jurisdictionSlug = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
    KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" }[fam.jurisdiction];
  const familyDir = path.join(OUT, jurisdictionSlug, fam.familySlug);
  const srPath = path.join(familyDir, "source-record.json");
  if (!fs.existsSync(srPath)) continue;

  // A family whose map an independent reviewer has approved is not this
  // driver's to rewrite. Running it over WI CR-266 replaced seven write boxes
  // measured from the content stream and corrected across four review rounds
  // with a fresh label capture, and left the approved fixtures pointing at a
  // map that no longer described them. Rebuilding a reviewed family is a
  // deliberate act: delete the approval first.
  const approvedMap = readJson(path.join(familyDir, "overlay-profile.json"), null);
  if (approvedMap?.independentReview?.verdict === "approved_for_platform_ready") {
    results.push({ jurisdiction: fam.jurisdiction, family: fam.familySlug,
      status: "skipped_independently_approved",
      reason: "an independent reviewer approved this family's map and artifacts; regenerating it would discard the reviewed geometry" });
    continue;
  }
  const record = readJson(srPath);
  if (!record.canonicalBundlePath) continue;
  const abs = path.join(SRC, record.canonicalBundlePath.split("Edition_1/")[1]);
  if (!fs.existsSync(abs)) continue;

  const bytes = fs.readFileSync(abs);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha !== record.sha256) { results.push({ family: fam.familySlug, status: "source_drift_detected" }); continue; }
  // Past the byte read and the hash match: this family is genuinely source-backed.
  processedFamilies += 1;

  const ownership = determineOwnership(record);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  let fields = [];
  try { fields = doc.getForm().getFields(); } catch { fields = []; }

  const census = fields.map((f) => {
    const type = fieldType(f);
    const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pref = w.P?.()?.toString?.();
      return { page: pref ? (pageIndexOf.get(pref) ?? null) : null,
        rect: r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } : null };
    });
    const e = { name: f.getName(), type, widgets };
    if (type === "text") { try { e.maxLength = f.getMaxLength() ?? null; } catch {} try { e.multiline = f.isMultiline?.() ?? null; } catch {} }
    if (["dropdown", "optionlist", "radio"].includes(type)) { try { e.options = f.getOptions(); } catch {} }
    return e;
  });
  // The widget context channel. Until now the binder saw a field's internal
  // AcroForm name and nothing else: not the words the form prints beside the
  // box, and not the section of the page the box sits in. Both are measured
  // here, out of this document's own content streams, and attached to the
  // census so the binder, the finalizer and every later reader see the same
  // three channels.
  //
  // A widget with no rectangle, or on a page whose content stream will not
  // decode, gets nulls. A missing channel is a missing channel; it is never
  // filled in with a guess.
  const widgetsByPage = new Map();
  for (const entry of census) {
    for (const w of entry.widgets) {
      if (!w.page || !w.rect) continue;
      if (!widgetsByPage.has(w.page)) widgetsByPage.set(w.page, []);
      widgetsByPage.get(w.page).push({ name: entry.name, rect: w.rect });
    }
  }
  const contextByField = new Map();
  for (const [pageNumber, widgets] of widgetsByPage) {
    const page = pages[pageNumber - 1];
    if (!page) continue;
    let contexts = [];
    try { contexts = captureWidgetContext(page, widgets); } catch { contexts = []; }
    for (const context of contexts) {
      // A field with widgets on more than one page keeps the first context
      // measured for it: the same field drawn twice is one field, and its
      // binding is decided once.
      if (!contextByField.has(context.name)) contextByField.set(context.name, context);
    }
  }
  for (const entry of census) {
    const context = contextByField.get(entry.name) ?? null;
    entry.effectiveLabel = context?.effectiveLabel ?? null;
    entry.labelBasis = context?.labelBasis ?? "no_widget_geometry_available";
    entry.regionHeading = context?.regionHeading ?? null;
    entry.regionBasis = context?.regionBasis ?? "no_widget_geometry_available";
  }

  const classification = census.map((c) => ({
    name: c.name, type: c.type, class: classify(c.name, c.type, ownership),
    effectiveLabel: c.effectiveLabel, regionHeading: c.regionHeading
  }));

  const noFill = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.OUTSIDE_PARTY;
  // Binding is decided by the typed, fail-closed binder rather than by a
  // name-pattern sweep: every field starts protected, and only an allowlisted
  // fact descriptor of a matching type on a writable field type gets through.
  // The refusals are kept because a refused field with its reason is what
  // makes the protection auditable.
  const explicitMappings = record.explicitFieldMappings ?? {};
  const availableChargeRows = Array.isArray(CANONICAL["matter.charges"]) ? CANONICAL["matter.charges"].length : 0;
  const bindings = [];
  const bindingRefusals = [];
  for (const c of classification) {
    const decision = decideTypedBinding(
      { name: c.name, pdfType: c.type, effectiveLabel: c.effectiveLabel, regionHeading: c.regionHeading },
      { explicitMappings, captionOnly: ownership === OWNERSHIP.COURT_ORDER,
        availableChargeRows, documentAcceptsFill: !noFill }
    );
    // The binder decides from the field's NAME; this file has already decided
    // from its ROLE. Where they disagree the role wins. Arkansas's Act 346
    // order carries "Judges Printed Name", classified court_or_agency here and
    // matched as a name by the binder, and the map recorded a binding of the
    // participant's legal name onto the judge's line. The same role refusal is
    // now handed to the finalizer as well, so the artifact refuses exactly what
    // the map refuses. It did not before: the comment here asserted the factory
    // would refuse these at render time and nothing did, and six families
    // carried values in fields their own maps called unwritable.
    if (decision.writable && isUnwritableClass(c.class)) {
      bindingRefusals.push({ field: c.name, reason: "classified_unwritable_by_role", category: c.class });
    } else if (decision.writable) {
      // `factBasis` says which channel bound it — the field's own name, or the
      // caption the form prints beside it. A map that does not say which is a
      // map a reviewer cannot check against the paper.
      bindings.push({ field: c.name, class: c.class, factId: decision.factId,
        factBasis: decision.factBasis ?? "field_name",
        effectiveLabel: c.effectiveLabel ?? null });
    } else {
      bindingRefusals.push({ field: c.name, reason: decision.reason, category: decision.category ?? null,
        regionHeading: decision.regionHeading ?? null });
    }
  }
  // One widget per slot. The per-field decisions above are each correct and
  // still put three widgets on Nebraska's caption band, all matching
  // matter.court and all overlapping between x 138 and x 242. This pass keeps
  // one and records the rest as refusals, so the map says which widget carries
  // the value and why the others do not.
  const censusByName = new Map(census.map((c) => [c.name, c]));
  const slots = selectOnePerSlot(bindings.map((b) => {
    const entry = censusByName.get(b.field);
    return { ...b, name: b.field, pdfType: entry?.type ?? null,
      page: entry?.widgets?.[0]?.page ?? null, rect: entry?.widgets?.[0]?.rect ?? null };
  }));
  bindings.length = 0;
  for (const keeper of slots.kept) bindings.push({ field: keeper.field, class: keeper.class, factId: keeper.factId,
    factBasis: keeper.factBasis, effectiveLabel: keeper.effectiveLabel ?? null });
  for (const loser of slots.refused) bindingRefusals.push({ field: loser.field, reason: loser.reason,
    category: loser.category, factId: loser.factId, keptInstead: loser.keptInstead, overlapsWith: loser.overlapsWith });

  const boundNames = new Set(bindings.map((b) => b.field));

  fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });
  fs.writeFileSync(path.join(familyDir, "field-census.json"), JSON.stringify({
    schemaVersion: "rcap-field-census/v3-first-hand", censusBasis: "first_hand_inspection_of_verified_binary",
    sha256: sha, structuralClass: record.structuralClassObserved, fieldCount: census.length,
    pageGeometry: record.pageGeometry, fields: census }, null, 2) + "\n");
  fs.writeFileSync(path.join(familyDir, "field-classification.json"), JSON.stringify({
    schemaVersion: "rcap-field-classification/v4-nine-class", documentOwnership: ownership,
    ownershipBasis: "document role, canonical filename and official title, re-checked field by field",
    classCounts: classification.reduce((a, c) => (a[c.class] = (a[c.class] ?? 0) + 1, a), {}),
    entries: classification }, null, 2) + "\n");

  const mapKind = record.structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";

  // A flat PDF carries no widgets, so its anchors are measured out of the page
  // content streams: every anchor below is a label the document actually draws,
  // at the position it draws it.
  let anchors = [], anchorPages = [], candidateLabels = [];
  if (mapKind === "flat_overlay" && !noFill) {
    const helvA = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (let pi = 0; pi < pages.length; pi++) {
      const lines = groupIntoLines(extractTextItems(pages[pi]));
      const readable = lines.filter((l) => !CID_ENCODED.test(l.text));
      anchorPages.push({ page: pi + 1, lines: lines.length, readableLines: readable.length,
        unreadableLines: lines.length - readable.length });
      for (const line of readable) {
        // Rule-line blanks first: they carry measured start and end positions.
        for (const blank of blankAnchorsOn(line, ownership)) {
          const size = Math.max(7, Math.min(11, line.size || 9));
          if (blank.x2 - blank.x1 < 24) continue;
          anchors.push({ page: pi + 1, kind: "rule_line_blank",
            label: `${blank.labelBefore} ___ ${blank.labelAfter}`.trim(), factId: blank.factId,
            baselineY: line.y, fontSize: size,
            writeBox: { x: Number((blank.x1 + 2).toFixed(1)), y: Number((line.y + 2).toFixed(1)),
              width: Number((blank.x2 - blank.x1 - 4).toFixed(1)), height: Number((size * 1.25).toFixed(1)) },
            measurement: { blankStartMeasured: true, blankEndMeasured: true, fromGlyphMetrics: true } });
        }
        // A caption-box label names a cell whose value position is set by the
        // box, not by the label. The label's own geometry is measured here and
        // recorded; no write box is derived from it, because deriving one
        // would mean inventing the form's cell convention.
        const lineLabel = line.text.trim().replace(/[:.\s]+$/, "");
        const lineTarget = overlayFactFor(lineLabel, ownership);
        if (lineTarget && lineLabel.length >= 3) {
          candidateLabels.push({ page: pi + 1, label: lineLabel, factId: lineTarget,
            labelX: line.x, baselineY: line.y, fontSize: line.size,
            writeBoxDerivable: false,
            reason: "Standalone caption label with no rule line. The value's position is set by the printed cell, which this document does not express as a measurable rectangle, so no coordinate is asserted." });
        }
        for (const run of line.runs) {
          if (CID_ENCODED.test(run.text)) continue;
          const label = run.text.trim();
          if (label.length < 3) continue;
          const target = overlayFactFor(label, ownership);
          if (!target) continue;
          const size = Math.max(7, Math.min(11, line.size || 9));
          const labelWidth = helvA.widthOfTextAtSize(label, size);
          const nextX = line.runs.filter((r) => r.x > run.x + 1).map((r) => r.x).sort((a, b) => a - b)[0] ?? null;
          const x = run.x + labelWidth + 4;
          const right = nextX !== null ? nextX - 3 : pages[pi].getWidth() - 36;
          if (right - x < 24) continue;
          anchors.push({ page: pi + 1, kind: "trailing_label", label, factId: target,
            labelX: run.x, baselineY: line.y, fontSize: size,
            writeBox: { x: Number(x.toFixed(1)), y: Number((line.y).toFixed(1)),
              width: Number((right - x).toFixed(1)), height: Number((size * 1.25).toFixed(1)) },
            measurement: { labelPositionMeasured: true, rightBoundaryMeasured: nextX !== null,
              leftEdgeEstimatedFromLabelWidth: true } });
        }
      }
    }
    // One anchor per fact per page: the first occurrence wins.
    const seen = new Set();
    anchors = anchors.filter((a) => { const k = `${a.page}:${a.factId}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  fs.writeFileSync(path.join(familyDir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json"),
    JSON.stringify({ schemaVersion: `rcap-${mapKind}-map/v5`, family: fam.familySlug, documentOwnership: ownership,
      sha256: sha, pageGeometry: record.pageGeometry,
      captionOnly: ownership === OWNERSHIP.COURT_ORDER,
      factoryVersion: FACTORY_VERSION,
      bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs)",
      bindings,
      bindingRefusals,
      unwritableFields: classification.filter((c) => isUnwritableClass(c.class)).map((c) => ({ field: c.name, class: c.class })),
      manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
      anchorCapture: mapKind === "flat_overlay"
        ? { basis: "text drawn by this exact sha256, read from the page content streams",
            pages: anchorPages, anchorCount: anchors.length, anchors,
            candidateLabelCount: candidateLabels.length, candidateLabels,
            note: "Label position and the right boundary are measured. The write box's left edge is derived from the label's rendered width, so it is the one estimated number here and is what independent visual review confirms." }
        : null,
      overflowPolicy: { longText: "shrink_to_fit_then_addendum", multiline: "wrap_within_widget_rect" } }, null, 2) + "\n");

  let filled = 0, contactSheet = false;
  const findings = [];
  let finalizedReport = null;

  // One pipeline for both shapes. The fixture written is the finalized
  // participant artifact -- values materialized into appearances, flattened,
  // sanitized of active content and byte-reproducible -- because that is what
  // a participant would actually file and therefore the only thing worth
  // reviewing. The contact sheet is built from that artifact and refuses to
  // exist unless its values are provably visible.
  // A document that says of itself that it is not for filing must never be
  // filled. The notice was referenced here and never defined, so every call
  // threw a ReferenceError that the catch below recorded as a per-family
  // finding -- which is why this driver had produced no fixture and no contact
  // sheet for any family at all. It is derived from the document's own printed
  // text, and only from phrases that describe the document rather than
  // instruct the participant: "do not file" appears legitimately in filing
  // instructions, and treating that as a hold would silently stop a form from
  // ever rendering, which is exactly the failure this line caused.
  // Read for every family, not only the flat ones: an AcroForm can be stamped
  // "sample only" just as a flat scan can.
  const documentTextLines = [];
  for (const page of pages) {
    try { documentTextLines.push(...groupIntoLines(extractTextItems(page))); } catch { /* unreadable page */ }
  }

  const NOT_FOR_FILING = /\bnot\s+for\s+filing\b|\bsample\s+only\b|\bspecimen\s+copy\b|\bfor\s+illustration\s+only\b|\bdo\s+not\s+file\s+this\s+form\b/i;
  const notForFilingLine = (documentTextLines ?? []).map((l) => l.text).find((t) => NOT_FOR_FILING.test(t)) ?? null;
  const notForFilingNotice = notForFilingLine;
  if (notForFilingNotice) {
    findings.push({ check: "document_states_it_is_not_for_filing", notice: notForFilingNotice });
  }

  const renderable = mapKind === "acroform" ? bindings.length > 0 : anchors.length > 0;
  if (!noFill && renderable) {
    try {
      const rendered = {};
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const result = mapKind === "acroform"
          ? await finalizeOfficialForm({
              sourceBytes: bytes, expectedSha256: sha, census, facts, explicitMappings,
              // The same role refusals the map records, so the artifact and the
              // map cannot disagree about what may be written.
              unwritableFields: classification.filter((c) => isUnwritableClass(c.class)).map((c) => ({ field: c.name, class: c.class })),
              captionOnly: ownership === OWNERSHIP.COURT_ORDER,
              nonFilingNotice: notForFilingNotice,
              title: `${fam.jurisdiction} ${record.documentId}`
            })
          : await finalizeFlatOverlay({
              sourceBytes: bytes, expectedSha256: sha, anchors, facts,
              nonFilingNotice: notForFilingNotice,
              title: `${fam.jurisdiction} ${record.documentId}`
            });
        fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), result.bytes);
        rendered[label] = result;
        for (const u of result.report.unfittable) {
          findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
        }
        for (const r of result.report.refused) {
          if (r.category === "unfittable") continue;
          findings.push({ fixture: label, check: "binding_refused", ...r });
        }
        if (label === "canonical") { filled = result.report.written.length; finalizedReport = result.report; }
      }

      fs.writeFileSync(path.join(familyDir, "fixtures", "negative.json"), JSON.stringify({
        schemaVersion: "rcap-negative-fixture/v4-typed",
        assertion: "With no participant facts supplied nothing is written. Every field starts protected: money, race, arrest and disposition dates without an explicit mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction rather than by a deny pattern.",
        refusedFields: rendered.canonical.report.refused
      }, null, 2) + "\n");

      const sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: rendered.canonical.bytes,
        expectedValues: rendered.canonical.report.expectedValues,
        heading: `${fam.jurisdiction} ${record.documentId} — blank (left) vs finalized fill (right)`
      });
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "contact-sheet-proof.json"),
        JSON.stringify(sheet.proof, null, 2) + "\n");

      // Provenance beside the artifact, never inside it. The finalized PDF
      // carries the issuing court's own Info dictionary, so nothing about which
      // factory produced it can be read from the file. Without this sidecar the
      // finalized-artifact audit has no record naming these artifacts and
      // treats every one of them as uncertifiable -- which is what it was
      // doing for all 62 families.
      const provenance = await artifactProvenance({
        jurisdiction: fam.jurisdiction, documentId: record.documentId, sourceSha256: sha,
        sourceRevision: record.revision ?? null,
        fieldMap: mapKind === "acroform" ? bindings : anchors,
        rendererVersion: RENDERER_VERSION,
        generatedAt: GENERATED_AT,
        artifacts: [
          { rel: "fixtures/canonical-filled.pdf", bytes: rendered.canonical.bytes },
          { rel: "fixtures/boundary-filled.pdf", bytes: rendered.boundary.bytes },
          { rel: "contact-sheet/blank-vs-filled.pdf", bytes: sheet.bytes }
        ]
      });
      fs.writeFileSync(path.join(familyDir, "artifact-provenance.json"),
        JSON.stringify(provenance, null, 2) + "\n");
      contactSheet = true;
    } catch (error) {
      // A refusal is an outcome, not a crash: it is recorded against the
      // family, which then simply carries no fixture.
      if (error instanceof NonFilingHoldError) {
        findings.push({ check: "non_filing_hold_enforced", notice: error.notice });
      } else if (error instanceof ContactSheetProofError) {
        findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null });
      } else {
        findings.push({ check: "finalize_refused", message: String(error.message).slice(0, 300) });
      }
    }
  }

  // Reports.
  // What the map DECLARES, annotated with what the renderer actually DID.
  //
  // This listed the declared bindings alone, so a binding the renderer refused
  // read as populated. KY AOC-496.3 and four Nebraska families declare a county
  // dropdown, the fixture county is not among the form's real options, the
  // renderer correctly refused it -- and this file said it was populated, while
  // the scan below counted 1 written against 2 declared and passed. A declared
  // binding that silently produces nothing is neither written nor refused, and
  // the record has to be able to say which.
  const writtenByRenderer = new Map((finalizedReport?.written ?? []).map((w) => [String(w.field ?? w.anchor), w]));
  const refusedByRenderer = new Map((finalizedReport?.refused ?? []).map((r) => [String(r.field ?? r.anchor), r]));
  fs.writeFileSync(path.join(familyDir, "reports/populated-fields.json"), JSON.stringify(
    bindings.map((b) => ({
      field: b.field, class: b.class, factId: b.factId,
      written: finalizedReport ? writtenByRenderer.has(b.field) : null,
      notWrittenBecause: finalizedReport && !writtenByRenderer.has(b.field)
        ? (refusedByRenderer.get(b.field)?.reason ?? "the renderer neither wrote nor refused this field")
        : null
    })), null, 2) + "\n");
  fs.writeFileSync(path.join(familyDir, "reports/protected-fields.json"), JSON.stringify({
    documentOwnership: ownership, wholeDocumentUnwritable: noFill,
    unwritableFields: classification.filter((c) => isUnwritableClass(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name) }, null, 2) + "\n");
  fs.writeFileSync(path.join(familyDir, "reports/overflow-and-clipping.json"), JSON.stringify({
    schemaVersion: "rcap-overflow-report/v2", boundaryFixtureApplied: !noFill && mapKind === "acroform" && bindings.length > 0,
    findings }, null, 2) + "\n");

  // Protected-field, visibility and placeholder scan.
  //
  // The finalized fixture is flattened, so it carries no form fields to read
  // back: a scan that compares field values against the source can no longer
  // see anything and would pass vacuously. What still means something is what
  // the renderer wrote -- recorded field by field -- checked against what is
  // actually visible on the finalized page.
  const canonicalPath = path.join(familyDir, "fixtures/canonical-filled.pdf");
  if (finalizedReport && fs.existsSync(canonicalPath)) {
    const finalizedDoc = await PDFDocument.load(fs.readFileSync(canonicalPath), { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalizedDoc);
    const missing = missingExpectedValues(visible, finalizedReport.expectedValues);
    // Scanned against the values this factory wrote, not against the whole
    // page. Reading the rendered document flagged the Spanish word "todo" on
    // NC AOC-CR-287-es and a preprinted "XXX" ruler on AL C-94A as placeholder
    // values we had written -- neither is ours, and a check that fails on the
    // court's own printed words teaches everyone to ignore it.
    const placeholder = (finalizedReport.expectedValues ?? [])
      .map((v) => /\b(tbd|todo|lorem|xxx+|placeholder|sample text|fixme|\{\{|\$\{)/i.exec(String(v)))
      .find(Boolean) ?? null;
    // Only the AcroForm report carries protectedFields: a flat overlay has no
    // field dictionary to refuse from, and its refusals are recorded against
    // anchors instead. This scan had never run -- every finalize call threw --
    // so the shape difference had not been reached before.
    const protectedList = finalizedReport.protectedFields ?? [];
    const protectedNames = new Set(protectedList.map((p) => p.field));
    const writtenProtected = finalizedReport.written.filter((w) => protectedNames.has(w.field ?? w.anchor));
    const residue = finalizedReport.activeContentScan?.hits ?? [];
    // Compared against the declaration this family actually has. A flat overlay
    // declares anchors and its report writes anchor labels; an AcroForm family
    // declares bindings and writes field names. Reconciling one against the
    // other reported every overlay anchor as an undeclared write, which is not
    // a defect in the family -- it is a defect in the comparison.
    const reconciliation = reconcileWrittenAgainstDeclared({
      writtenFields: finalizedReport.written.map((w) => w.field ?? w.anchor),
      declaredBindings: mapKind === "acroform" ? bindings.map((b) => b.field) : anchors.map((a) => a.label),
      refusedFields: finalizedReport.refused
    });
    fs.writeFileSync(path.join(familyDir, "reports/protected-fields-scan.json"), JSON.stringify({
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      writtenFields: finalizedReport.written.length,
      refusedFields: finalizedReport.refused.length,
      protectedFieldsRefused: protectedList.length,
      violations: writtenProtected,
      valuesWrittenButNotVisible: missing,
      placeholderValues: placeholder ? [placeholder[0]] : [],
      activeContentResidue: residue,
      // Written against declared, in both directions.
      //
      // The scan reported both numbers and never compared them, so an
      // undeclared write and a silently dropped write both passed. One
      // comparison catches both, and both had been found by hand.
      writtenVersusDeclared: reconciliation,
      pass: writtenProtected.length === 0 && missing.length === 0 && !placeholder && residue.length === 0
        && reconciliation.balanced
    }, null, 2) + "\n");
    if (writtenProtected.length || missing.length || placeholder || residue.length || !reconciliation.balanced) {
      findings.push({ check: "protected_or_visibility_violation", writtenProtected, missing, residue,
        writtenVersusDeclared: reconciliation.balanced ? null : reconciliation.refusals });
    }
  }

  // Hash receipt for every rendered artifact, so a later drift is detectable
  // without re-deriving the render.
  const renderedArtifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    const p2 = path.join(familyDir, rel);
    if (!fs.existsSync(p2)) continue;
    const buf = fs.readFileSync(p2);
    renderedArtifacts[rel] = { sha256: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
  }
  fs.writeFileSync(path.join(familyDir, "reports/rendered-artifacts.json"), JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1",
    sourceSha256: sha,
    renderer: "scripts/implement-rcap-official-forms-d1.mjs",
    reproducible: "Modification dates are pinned, so re-rendering from the same source binary reproduces these hashes byte for byte.",
    artifacts: renderedArtifacts }, null, 2) + "\n");

  record.documentOwnership = ownership;
  record.participantFillable = !noFill;
  record.implementationStatus = noFill
    ? (ownership === OWNERSHIP.INSTRUCTIONAL ? "no_fill_instructional_document" : "no_fill_outside_party_document")
    : mapKind === "flat_overlay"
      ? (anchors.length > 0 ? "overlay_implemented_pending_independent_review"
        : candidateLabels.length > 0 ? "overlay_labels_measured_write_box_pending_review"
        : anchorPages.reduce((a, p) => a + p.readableLines, 0) > 0
          ? "overlay_no_participant_label_matched"
          : "overlay_no_extractable_text_layer")
    : bindings.length > 0 ? "implemented_pending_independent_review"
    : "acroform_mapped_all_fields_manual_or_unwritable";
  record.censusBasis = "first_hand_inspection_of_verified_binary";
  record.ownershipDetermination = {
    [OWNERSHIP.INSTRUCTIONAL]: "Instructional document. It is read, not filed, so no participant fill is produced.",
    [OWNERSHIP.OUTSIDE_PARTY]: "Completed by the opposing party, not the participant. No fill is produced.",
    [OWNERSHIP.COURT_ORDER]: "Court-issued order. Only caption facts are bound; no decretal or dispositional field is ever written.",
    [OWNERSHIP.PARTICIPANT]: "Participant-completed filing. Participant and deterministic fields are bound; every other class is unwritable."
  }[ownership];
  record.coBrandingRule = "No LegalEase or partner branding may be added to the official form.";
  fs.writeFileSync(srPath, JSON.stringify(record, null, 2) + "\n");

  results.push({ jurisdiction: fam.jurisdiction, family: fam.familySlug, ownership, mapKind,
    fields: census.length, bound: bindings.length, anchors: anchors.length,
    candidateLabels: candidateLabels.length, filled, contactSheet,
    findings: findings.length, status: record.implementationStatus,
    holds: record.productionHolds?.length ?? 0 });
}

// A run that rendered nothing does not get to describe the corpus.
//
// The index is left exactly as it was -- not rewritten with the same content,
// not touched at all -- so a refusal is provably non-destructive by mtime as
// well as by hash.
if (processedFamilies === 0) {
  console.error("FAIL official-forms D1 — 0 source-backed families were processed.");
  console.error(`Source root: ${SRC}`);
  console.error("Every family was skipped, which means the extract does not carry their pinned bytes.");
  console.error("implementation-index.json was NOT written and is unchanged.");
  process.exit(1);
}

fs.writeFileSync(path.join(OUT, "implementation-index.json"), JSON.stringify({
  schemaVersion: "rcap-d1-implementation-index/v2", generatedAt: "2026-08-12", families: results }, null, 2) + "\n");

const sum = (p) => results.filter(p).length;
console.log(JSON.stringify({
  families: results.length,
  implemented: sum((r) => r.status === "implemented_pending_independent_review"),
  overlayImplemented: sum((r) => r.status === "overlay_implemented_pending_independent_review"),
  overlayLabelsMeasured: sum((r) => r.status === "overlay_labels_measured_write_box_pending_review"),
  overlayNoLabelMatched: sum((r) => r.status === "overlay_no_participant_label_matched"),
  overlayNoTextLayer: sum((r) => r.status === "overlay_no_extractable_text_layer"),
  allManual: sum((r) => r.status === "acroform_mapped_all_fields_manual_or_unwritable"),
  instructional: sum((r) => r.status === "no_fill_instructional_document"),
  outsideParty: sum((r) => r.status === "no_fill_outside_party_document"),
  totalFields: results.reduce((a, r) => a + (r.fields ?? 0), 0),
  boundFields: results.reduce((a, r) => a + (r.bound ?? 0), 0),
  contactSheets: sum((r) => r.contactSheet),
  findings: results.reduce((a, r) => a + (r.findings ?? 0), 0)
}, null, 2));
}
