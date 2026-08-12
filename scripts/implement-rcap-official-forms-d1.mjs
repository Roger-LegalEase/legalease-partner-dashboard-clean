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
import { extractTextItems, groupIntoLines } from "./lib/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, StandardFonts, rgb } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.RCAP_BUNDLE_EXTRACT
  ?? "/tmp/claude-0/-home-user-legalease-partner-dashboard-clean/54ff2bf1-37ee-5073-8d13-dc21b63a0975/scratchpad/bundle/extracted";
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

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
const NEVER_WRITE = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);

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

const index = readJson(path.join(OUT, "verified-binary-index.json"));
const results = [];

for (const fam of index.families) {
  const jurisdictionSlug = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
    KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" }[fam.jurisdiction];
  const familyDir = path.join(OUT, jurisdictionSlug, fam.familySlug);
  const srPath = path.join(familyDir, "source-record.json");
  if (!fs.existsSync(srPath)) continue;
  const record = readJson(srPath);
  if (!record.canonicalBundlePath) continue;
  const abs = path.join(SRC, record.canonicalBundlePath.split("Edition_1/")[1]);
  if (!fs.existsSync(abs)) continue;

  const bytes = fs.readFileSync(abs);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha !== record.sha256) { results.push({ family: fam.familySlug, status: "source_drift_detected" }); continue; }

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
  const classification = census.map((c) => ({ name: c.name, type: c.type, class: classify(c.name, c.type, ownership) }));

  const noFill = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.OUTSIDE_PARTY;
  const bindings = [];
  if (!noFill) {
    for (const c of classification) {
      const target = bindingFor(c.name, c.type, c.class, ownership);
      if (target) bindings.push({ field: c.name, class: c.class, factId: target });
    }
  }
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
      const readable = lines.filter((l) => !/ /.test(l.text));
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
          if (/ /.test(run.text)) continue;
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
      bindings,
      unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
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

  // Flat overlay render: draw the canonical and boundary values at the
  // measured anchors, then contact-sheet blank against filled.
  if (mapKind === "flat_overlay" && !noFill && anchors.length > 0) {
    const rendered = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await d.embedFont(StandardFonts.Helvetica);
      const dp = d.getPages();
      let n = 0;
      for (const a of anchors) {
        const v = resolveFact(facts, a.factId);
        if (v === undefined) continue;
        let size = a.fontSize;
        let text = String(v);
        let w = font.widthOfTextAtSize(text, size);
        while (w > a.writeBox.width && size > 5.5) { size -= 0.5; w = font.widthOfTextAtSize(text, size); }
        if (w > a.writeBox.width) {
          findings.push({ fixture: label, anchor: a.label, page: a.page, check: "clipping",
            boxWidth: a.writeBox.width, textWidthAt: Number(w.toFixed(1)), fontSize: size,
            handling: "shrunk_to_floor_then_reported" });
        }
        dp[a.page - 1].drawText(text, { x: a.writeBox.x, y: a.writeBox.y, size, font, color: rgb(0, 0, 0.55) });
        n++;
      }
      const out = await d.save();
      fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), out);
      rendered[label] = out;
      if (label === "canonical") filled = n;
    }
    fs.writeFileSync(path.join(familyDir, "fixtures", "negative.json"), JSON.stringify({
      schemaVersion: "rcap-negative-fixture/v3",
      assertion: "With no participant facts supplied the overlay draws nothing. No anchor is bound to a court, prosecutor, agency, signature, notarization or service label.",
      unwritableAnchorLabels: [] }, null, 2) + "\n");
    try {
      const sheet = await PDFDocument.create();
      const font = await sheet.embedFont(StandardFonts.Helvetica);
      const n = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
      for (let i = 0; i < n; i++) {
        const [bp] = await sheet.embedPdf(bytes, [i]);
        const [fp] = await sheet.embedPdf(rendered.canonical, [i]);
        const W = bp.width, H = bp.height, scale = 0.62, gap = 24, margin = 28, header = 34;
        const page = sheet.addPage([W * scale * 2 + gap + margin * 2, H * scale + margin * 2 + header]);
        page.drawText(`${fam.jurisdiction} ${record.documentId} — page ${i + 1} — blank (left) vs canonical overlay (right)`,
          { x: margin, y: H * scale + margin + 12, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        page.drawPage(bp, { x: margin, y: margin, xScale: scale, yScale: scale });
        page.drawPage(fp, { x: margin + W * scale + gap, y: margin, xScale: scale, yScale: scale });
      }
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), await sheet.save());
      contactSheet = true;
    } catch (e) { findings.push({ check: "contact_sheet_error", message: e.message }); }
  }
  if (!noFill && mapKind === "acroform" && bindings.length > 0) {
    const helv = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const rectOf = (name) => census.find((c) => c.name === name)?.widgets?.[0]?.rect ?? null;
    const rendered = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const d = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = d.getForm();
      let n = 0;
      for (const b of bindings) {
        const v = resolveFact(facts, b.factId);
        if (v === undefined) continue;
        try {
          const f = form.getField(b.field);
          if (f instanceof PDFTextField) {
            const max = f.getMaxLength?.() ?? null;
            let value = String(v);
            if (max && value.length > max) {
              findings.push({ fixture: label, field: b.field, check: "overflow", maxLength: max, valueLength: value.length, handling: "truncated_by_form_maxlength" });
              value = value.slice(0, max);
            }
            const rect = rectOf(b.field);
            const multiline = census.find((c) => c.name === b.field)?.multiline === true;
            if (rect && rect.width > 0 && !multiline) {
              const size = Math.min(10, Math.max(6, rect.height - 4));
              const w = helv.widthOfTextAtSize(value, size);
              if (w > rect.width - 4) {
                findings.push({ fixture: label, field: b.field, check: "clipping", widgetWidth: rect.width,
                  textWidthAt: Number(w.toFixed(1)), fontSize: size, handling: "shrink_to_fit_required_at_render" });
              }
            }
            f.setText(value); n++;
          } else if (f instanceof PDFDropdown) {
            const opts = f.getOptions?.() ?? [];
            const match = opts.find((o) => String(o).trim().toLowerCase() === String(v).trim().toLowerCase())
              ?? opts.find((o) => String(o).trim().toLowerCase() === String(v).replace(/\s*county$/i, "").trim().toLowerCase());
            if (match) { f.select(match); n++; }
            else findings.push({ fixture: label, field: b.field, check: "option_not_in_list", value: String(v), optionCount: opts.length, handling: "left_blank_for_participant_selection" });
          }
        } catch (e) { findings.push({ fixture: label, field: b.field, check: "fill_error", message: e.message }); }
      }
      const out = await d.save();
      fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), out);
      rendered[label] = out;
      if (label === "canonical") filled = n;
    }
    // Negative fixture: no participant facts supplied at all.
    fs.writeFileSync(path.join(familyDir, "fixtures", "negative.json"), JSON.stringify({
      schemaVersion: "rcap-negative-fixture/v3",
      assertion: "With no participant facts supplied the renderer writes nothing, and no court, prosecutor, agency-use, signature, notarization, service or court-use-only field is ever written in any fixture.",
      unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })) }, null, 2) + "\n");

    // Contact sheet: blank page beside filled page, from the real documents.
    try {
      const sheet = await PDFDocument.create();
      const font = await sheet.embedFont(StandardFonts.Helvetica);
      const blankDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const filledDoc = await PDFDocument.load(rendered.canonical, { ignoreEncryption: true });
      const n = Math.min(blankDoc.getPageCount(), filledDoc.getPageCount());
      for (let i = 0; i < n; i++) {
        const [bp] = await sheet.embedPdf(bytes, [i]);
        const [fp] = await sheet.embedPdf(rendered.canonical, [i]);
        const W = bp.width, H = bp.height, scale = 0.62, gap = 24, margin = 28, header = 34;
        const page = sheet.addPage([W * scale * 2 + gap + margin * 2, H * scale + margin * 2 + header]);
        page.drawText(`${fam.jurisdiction} ${record.documentId} — page ${i + 1} — blank (left) vs canonical fill (right)`,
          { x: margin, y: H * scale + margin + 12, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        page.drawPage(bp, { x: margin, y: margin, xScale: scale, yScale: scale });
        page.drawPage(fp, { x: margin + W * scale + gap, y: margin, xScale: scale, yScale: scale });
      }
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), await sheet.save());
      contactSheet = true;
    } catch (e) { findings.push({ check: "contact_sheet_error", message: e.message }); }
  }

  // Reports.
  fs.writeFileSync(path.join(familyDir, "reports/populated-fields.json"), JSON.stringify(
    bindings.map((b) => ({ field: b.field, class: b.class, factId: b.factId })), null, 2) + "\n");
  fs.writeFileSync(path.join(familyDir, "reports/protected-fields.json"), JSON.stringify({
    documentOwnership: ownership, wholeDocumentUnwritable: noFill,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name) }, null, 2) + "\n");
  fs.writeFileSync(path.join(familyDir, "reports/overflow-and-clipping.json"), JSON.stringify({
    schemaVersion: "rcap-overflow-report/v2", boundaryFixtureApplied: !noFill && mapKind === "acroform" && bindings.length > 0,
    findings }, null, 2) + "\n");

  // Placeholder and protected-field scan on the rendered artifact.
  //
  // Several official forms ship with static text already sitting in a form
  // field -- Kentucky's `Notice`, Nebraska's `fullcountystatementRIGHT`. A
  // non-empty value therefore proves nothing on its own. The scan compares
  // each field against the same field in the untouched source, so only a
  // value the renderer actually changed can register as a violation.
  const canonicalPath = path.join(familyDir, "fixtures/canonical-filled.pdf");
  if (fs.existsSync(canonicalPath)) {
    const baseDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const baseForm = baseDoc.getForm();
    const baselineText = new Map();
    for (const c of classification) {
      try { const f = baseForm.getField(c.name); if (f instanceof PDFTextField) baselineText.set(c.name, (f.getText() ?? "").trim()); } catch {}
    }
    const chk = await PDFDocument.load(fs.readFileSync(canonicalPath), { ignoreEncryption: true });
    const chkForm = chk.getForm();
    const written = [], placeholders = [], preExisting = [];
    for (const c of classification) {
      let text = null;
      try { const f = chkForm.getField(c.name); if (f instanceof PDFTextField) text = (f.getText() ?? "").trim(); } catch { continue; }
      if (text === null || text === "") continue;
      const base = baselineText.get(c.name) ?? "";
      if (text === base) { preExisting.push({ field: c.name, class: c.class }); continue; }
      if (NEVER_WRITE.has(c.class)) written.push({ field: c.name, class: c.class, reason: "unwritable_class_was_modified" });
      else if (!boundNames.has(c.name)) written.push({ field: c.name, class: c.class, reason: "modified_without_a_binding" });
      if (/\b(tbd|todo|lorem|xxx+|placeholder|sample text|fixme|\{\{|\$\{)/i.test(text)) placeholders.push({ field: c.name, value: text });
    }
    fs.writeFileSync(path.join(familyDir, "reports/protected-fields-scan.json"), JSON.stringify({
      scanBasis: "canonical fixture diffed against the untouched source binary",
      unwritableFieldsChecked: classification.filter((x) => NEVER_WRITE.has(x.class)).length,
      preExistingFormText: preExisting,
      violations: written, placeholderValues: placeholders,
      pass: written.length === 0 && placeholders.length === 0 }, null, 2) + "\n");
    if (written.length || placeholders.length) findings.push({ check: "protected_or_placeholder_violation", written, placeholders });
  }

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
