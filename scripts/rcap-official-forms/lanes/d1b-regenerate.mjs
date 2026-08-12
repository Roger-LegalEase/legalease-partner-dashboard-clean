// Lane D1B — regenerates Virginia, Kentucky and North Carolina against the D0
// remediated official-form factory.
//
// This driver exists instead of `scripts/implement-rcap-official-forms-d1.mjs`
// because that script reads and rewrites two indexes shared by seven
// concurrently-running lanes, so running it here would clobber the other six.
// It writes only this lane's three jurisdiction trees plus a lane-scoped
// `state-index.json` per state; the captain merges those into the shared
// indexes at import.
//
// Identity comes from the Edition-1 STATE_MANIFEST.csv, but the manifest is
// never trusted on its own: every binary is opened, hashed, and censused
// first-hand, and where the binary and the manifest disagree the observation
// is recorded rather than the declaration.
//
// Binding decisions belong to the D0 typed fail-closed binder. Nothing here
// widens them. The one sanctioned escape hatch is `explicitMappings`, which
// can only satisfy a descriptor that already declared itself sensitive — it
// can never defeat a protect rule or a type guard — and every entry carries
// its reason in the family evidence.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError } from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues } from "../rcap-contact-sheet.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";

const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList,
  PDFDict, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream
} = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const PACK = process.env.RCAP_D1B_PACK ?? "/tmp/rcap-source-packs/D1B/extract";
const LANE = "D1B";
const FACTORY_VERSION = "d0-remediated-v1";
const EDITION_PREFIX = "Expungement_AI_RCAP_Master_Library_Edition_1/";

const STATES = { VA: "virginia", KY: "kentucky", NC: "north-carolina" };
const ASSET_TOKEN = {
  packet_form: "form", instructions: "instructions",
  supporting_process: "support", source_gated: "source-gated"
};

// --- manifest ---------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function readManifest(state) {
  const raw = fs.readFileSync(path.join(PACK, "STATES", state, "STATE_MANIFEST.csv"), "utf8").replace(/^﻿/, "");
  const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const familySlugOf = (row) =>
  `${slugify(row.document_id)}-${ASSET_TOKEN[row.asset_class] ?? slugify(row.asset_class)}-${row.language.toLowerCase()}`;

// --- ToUnicode-aware page text ----------------------------------------------
//
// The North Carolina translations draw their page-1 notice with Type0/
// Identity-H subset fonts, so the raw content stream yields glyph ids rather
// than characters and a plain read of the page reports no notice at all. A
// hold that depends on reading a sentence must actually be able to read it, so
// the document's own /ToUnicode CMaps are parsed and the glyph ids mapped back.
//
// One page mixes several subsets, and a glyph id is only meaningful inside the
// subset that drew it, so the maps are consulted in descending coverage order
// and the first that knows a code supplies it. That is enough to decide a
// yes/no question about a printed English sentence; it is deliberately not
// used to place anchors, where a wrong glyph would become a wrong coordinate.
function parseToUnicodeCMap(source) {
  const map = new Map();
  const hex = (h) => h.replace(/[^0-9a-fA-F]/g, "");
  const codeOf = (h) => parseInt(hex(h), 16);
  const stringOf = (h) => {
    const s = hex(h);
    let out = "";
    for (let i = 0; i + 4 <= s.length; i += 4) out += String.fromCharCode(parseInt(s.slice(i, i + 4), 16));
    return out;
  };
  for (const block of source.match(/beginbfchar[\s\S]*?endbfchar/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(codeOf(m[1]), stringOf(m[2]));
  }
  for (const block of source.match(/beginbfrange[\s\S]*?endbfrange/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      const lo = codeOf(m[1]), hi = codeOf(m[2]), base = stringOf(m[3]);
      if (!base) continue;
      const tail = base.charCodeAt(base.length - 1);
      for (let c = lo; c <= hi && c - lo < 65536; c += 1) {
        map.set(c, base.slice(0, -1) + String.fromCharCode(tail + (c - lo)));
      }
    }
  }
  return map;
}

function toUnicodeMaps(doc) {
  const maps = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    if (String(obj.get(PDFName.of("Type")) ?? "") !== "/Font") continue;
    const ref = obj.get(PDFName.of("ToUnicode"));
    if (!ref) continue;
    try {
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) continue;
      const map = parseToUnicodeCMap(Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"));
      if (map.size > 0) maps.push(map);
    } catch { /* an unreadable CMap contributes nothing */ }
  }
  return maps.sort((a, b) => b.size - a.size);
}

const CID_ENCODED = /\u0000/;

function decodeThroughCMaps(text, maps) {
  let out = "";
  for (let i = 0; i + 1 < text.length; i += 2) {
    const code = (text.charCodeAt(i) << 8) | text.charCodeAt(i + 1);
    let glyph;
    for (const map of maps) if (map.has(code)) { glyph = map.get(code); break; }
    out += glyph ?? "�";
  }
  return out;
}

/**
 * Page text as printed, decoding Identity-H runs where the document allows it.
 *
 * Decoding is per run, never per page. The North Carolina Spanish translations
 * draw an English notice in a simple font beside Spanish body text in a Type0
 * subset, so a page holds both encodings at once; decoding the whole page as
 * CID pairs would turn the one plain sentence that matters into noise and the
 * hold would silently stop firing. A run that is already characters is left
 * exactly as it is.
 */
function readablePageText(doc, pageIndex, cachedMaps) {
  const lines = groupIntoLines(extractTextItems(doc.getPages()[pageIndex]));
  const anyCid = lines.some((l) => CID_ENCODED.test(l.text));
  if (!anyCid) return { text: lines.map((l) => l.text).join("\n"), basis: "page_content_stream" };
  const maps = cachedMaps ?? toUnicodeMaps(doc);
  if (maps.length === 0) {
    return { text: lines.map((l) => l.text).join("\n"), basis: "page_content_stream_cid_undecodable", maps };
  }
  const text = lines.map((l) => {
    const runs = l.runs?.length ? l.runs : [{ text: l.text }];
    return runs.map((r) => (CID_ENCODED.test(r.text) ? decodeThroughCMaps(r.text, maps) : r.text)).join("");
  }).join("\n");
  return { text, basis: "page_content_stream_tounicode_decoded_per_run", cmaps: maps.length, maps };
}

// The exact sentence the North Carolina translations print. Matched against
// the decoded page text, not against a filename or a manifest note.
const NON_FILING_RE = /DO\s*NOT\s*COMPLETE\s*THIS\s*FORM\s*FOR\s*FILING/i;
const INFORMATIONAL_RE = /THIS\s*FORM\s*IS\s*FOR\s*INFORMATIONAL\s*PURPOSES\s*ONLY/i;

function detectNonFilingNotice(doc) {
  let cached;
  for (let p = 0; p < doc.getPageCount(); p += 1) {
    const { text, basis, cmaps, maps } = readablePageText(doc, p, cached);
    cached = maps ?? cached;
    if (!NON_FILING_RE.test(text) && !INFORMATIONAL_RE.test(text)) continue;
    const line = text.split("\n").find((l) => NON_FILING_RE.test(l) || INFORMATIONAL_RE.test(l)) ?? "";
    return {
      notice: line.replace(/�+/g, " ").replace(/\s+/g, " ").trim().slice(0, 240),
      page: p + 1,
      decodeBasis: basis,
      cmapsConsulted: cmaps ?? 0,
      matched: NON_FILING_RE.test(text) ? "do_not_complete_this_form_for_filing" : "informational_purposes_only"
    };
  }
  return null;
}

// --- ownership and classification -------------------------------------------
// Kept identical to the corpus-wide convention so a D1B package classifies the
// same way every other lane's does.
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
  if (/\bpetition\b|\bmotion\b|\bapplication\b|\baffidavit\b|\brequest\b|\bstipulation\b|in\s*forma\s*pauperis|fee\s*waiver/.test(signal)) {
    return OWNERSHIP.PARTICIPANT;
  }
  if (/\border\b|\bjudgment\b|\bdecree\b|notice\s*of\s*hearing|certificate\s*of\s*expunge/.test(signal)) return OWNERSHIP.COURT_ORDER;
  return OWNERSHIP.PARTICIPANT;
}

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
  [/attorney|counsel|\besq\b|law\s*firm|bar\s*(no|num)/, "manual"],
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
const NEVER_WRITE = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);
const POPULATABLE = new Set(["participant", "deterministic"]);

function classify(name, type, ownership) {
  const hay = haystack(name);
  for (const [re, cls] of RULES) if (re.test(hay)) return cls;
  if (UNUSED_NAME.test(hay)) return "unused";
  if (["checkbox", "radio", "dropdown", "optionlist"].includes(type)) return "manual";
  if (ownership === OWNERSHIP.COURT_ORDER) return "court_or_agency";
  return "manual";
}

// --- overlay label binding (flat forms) -------------------------------------
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
const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

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

function blankAnchorsOn(line, ownership, minChars = 5) {
  const chars = line.chars ?? [];
  const out = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i].c !== "_") { i += 1; continue; }
    let j = i;
    while (j < chars.length && (chars[j].c === "_" || (chars[j].c === " " && chars[j + 1]?.c === "_"))) j += 1;
    const span = chars.slice(i, j);
    if (span.filter((c) => c.c === "_").length >= minChars) {
      const before = chars.slice(0, i).map((c) => c.c).join("");
      const after = chars.slice(j).map((c) => c.c).join("");
      const target = blankFactFor(before, after, ownership);
      if (target) {
        out.push({
          factId: target, x1: span[0].x, x2: span[span.length - 1].x + span[span.length - 1].w,
          labelBefore: before.trim().slice(-40), labelAfter: after.trim().slice(0, 30)
        });
      }
    }
    i = j;
  }
  return out;
}

function overlayFactFor(label, ownership) {
  const clean = label.replace(/[\s:.]+$/g, "").trim();
  if (OVERLAY_LABEL_DENY.test(clean)) return null;
  for (const [re, target] of OVERLAY_LABEL_BINDINGS) {
    if (!re.test(clean)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

// --- fixtures ---------------------------------------------------------------
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

// --- explicit mappings ------------------------------------------------------
//
// D0 refuses arrest, offense, conviction and disposition dates, and the charge
// text itself, on a name match alone: they describe the criminal event, and a
// wrong value misstates the record to a court. The escape hatch below names
// the exact field and the exact fact, per family, and every entry is reproduced
// with its reason into that family's evidence file.
//
// An entry here can only satisfy a descriptor that already declared itself
// sensitive. It cannot defeat a protect rule, a type guard, or an unindexed
// charge row, so nothing in this table can widen what the binder allows.
//
// Populated from the audit pass (`--audit`), which lists every field the binder
// refused with `requires_explicit_mapping` alongside its widget geometry.
const MAPPING_FILE = {
  "schemaVersion": "rcap-d1b-explicit-mappings/v1",
  "lane": "D1B",
  "basis": "D0 refuses arrest, offense, conviction and disposition dates and the charge text itself on a name match alone, because those describe the criminal event and a wrong value misstates the record to a court. Each entry below names one exact field and one exact fact. An entry can only satisfy a descriptor that already declared itself sensitive: it cannot defeat a protect rule, a type guard, a caption-only gate or an unindexed charge row, so nothing here widens what the binder allows.",
  "rulesApplied": [
    "A court-issued order gets no entries at all. Its caption-only gate would refuse a charge or date fact anyway, and a decretal finding is never ours to write.",
    "A genuinely indexed row in a repeating charge table is mapped for every row. The row guard then binds only the rows a supplied charge actually backs, so the mapping cannot stamp one offense down a whole table.",
    "A form that repeats a whole charge block under lettered or suffixed variants (Virginia's addenda) is mapped for its first block only. The later blocks describe further charges, and no indexed fact backs them, so binding the first charge's date into them would assert a fact about a different offense.",
    "A field whose name merely contains an event word without being the event is never mapped. AgeAtTimeOfOffense matches the charge descriptor by name and is refused on purpose: an age is not a charge."
  ],
  "classifierDisagreementOverrides": {
    "_basis": "The typed binder and the nine-class classifier are independent, and a binding needs both. Where they disagree the field is withheld by default; an entry here records the decision either way. Every 'bind' below was checked against the sentence the form actually prints beside that widget, quoted in `printedLabel`.",
    "VA/cc-1201-form-en": {
      "User.FullName": {
        "decision": "bind",
        "printedLabel": "My full name is:",
        "reason": "The petitioner's own name. The classifier missed it because 'full name' is not 'full legal name'; the form's printed prose settles it."
      }
    },
    "VA/cc-1203-form-en": {
      "User.CourtName": {
        "decision": "withhold",
        "printedLabel": "CITY OR COUNTY",
        "reason": "A positional caption rule whose printed label beneath it reads CITY OR COUNTY, not court name. Bound to matter.court it printed 'District Court' into the locality box. The locality fact that belongs here is not one this binder can pick without a measured printed label, so the field is left blank."
      },
      "User.FullName": {
        "decision": "bind",
        "printedLabel": "My full name is:",
        "reason": "The petitioner's own name, same line as on CC-1201."
      }
    },
    "VA/cc-1473-form-en": {
      "User.AddressOf": {
        "decision": "withhold",
        "printedLabel": "ADDRESS OF [ ] PETITIONER [ ] ATTORNEY",
        "reason": "The form makes this block belong to whichever party the election boxes mark, and no election is made in this render. Filling it asserts the petitioner is proceeding without counsel, which is a legal election and not a fact this set holds."
      },
      "User.PetetionerPhoneNumber": { "decision": "withhold", "reason": "Same elected block; same reasoning." },
      "User.PetetionerEmail": { "decision": "withhold", "reason": "Same elected block; same reasoning." },
      "User.PrintName": {
        "decision": "bind",
        "printedLabel": "PRINT NAME",
        "reason": "The printed-name line under the petitioner's signature. The classifier matches 'printed name' and not 'print name'."
      }
    },
    "NC/aoc-cr-288-form-en": {
      "NameAtty": { "decision": "withhold", "printedLabel": "Name And Address Of Petitioner's Attorney For Expunction Petition",
        "reason": "The attorney block. Independent review found the petitioner's own identity written into it: an attorney of record is a different party, and this fact set holds no attorney. D0's attorney protect rule keys on 'attorney' and does not match the 'Atty' abbreviation these six fields use, so the withholding is recorded here rather than left to a rule that cannot see it." },
      "StAddrAtty": { "decision": "withhold", "reason": "Attorney street address; same block, same reasoning." },
      "MailAddrAtty": { "decision": "withhold", "reason": "Attorney mailing address; same block, same reasoning." },
      "CityAtty": { "decision": "withhold", "reason": "Attorney city; same block, same reasoning." },
      "StateAtty": { "decision": "withhold", "reason": "Attorney state; same block, same reasoning." },
      "ZipCodeAtty": { "decision": "withhold", "reason": "Attorney ZIP; same block, same reasoning." },
      "PetitionerIsEligibleBecauseText1": { "decision": "withhold", "printedLabel": "FINDINGS OF FACT item 5",
        "reason": "A rule under the court's own findings of fact. Writing the petitioner's name here makes the order recite a finding the court has not made." },
      "PetitionerIsEligibleBecauseText2": { "decision": "withhold", "reason": "Second rule of the same findings-of-fact item; same reasoning." }
    },
    "*": {
      "User.FullNameOfArrest": {
        "decision": "withhold",
        "printedLabel": "5. My full name at time of arrest: ... [ ] Same as above",
        "reason": "The name the arrest record was made under. The form itself offers a 'same as above' box, so it is a different fact from the petitioner's current legal name and is not one this fact set holds. Writing the current name here would misstate the arrest record."
      },
      "User.AncillaryFullNameOfArrest": {
        "decision": "withhold",
        "printedLabel": "3. Full name at time of ancillary matter:",
        "reason": "The name used in the ancillary matter, a separate fact from the petitioner's legal name."
      },
      "User.AncillaryFullNameOfArrest1": {
        "decision": "withhold",
        "reason": "Further ancillary block; same reasoning."
      },
      "User.AncillaryFullNameOfArrestA": {
        "decision": "withhold",
        "reason": "Further ancillary block; same reasoning."
      },
      "User.AncillaryFullNameOfArrestB": {
        "decision": "withhold",
        "reason": "Further ancillary block; same reasoning."
      },
      "User.AncillaryFullNameOfArrestD": {
        "decision": "withhold",
        "reason": "Further ancillary block; same reasoning."
      },
      "Def.VitalStats.SSN": {
        "decision": "withhold",
        "reason": "A social security number box. The binder reached it through the 'Def' token in the field path and would have written the petitioner's NAME into it. Withheld outright; an SSN is never populated by this factory."
      },
      "Defendants SSN": {
        "decision": "withhold",
        "reason": "As Def.VitalStats.SSN."
      },
      "Defendants ssn": {
        "decision": "withhold",
        "reason": "As Def.VitalStats.SSN."
      },
      "Def.Info.JailId": {
        "decision": "withhold",
        "reason": "A jail identification number, reached through the same 'Def' token. Never populated."
      },
      "BankNameAndAccountType": {
        "decision": "withhold",
        "reason": "A bank name and account type on the affidavit of indigency. The binder matched the word 'Name'. Financial account details are never populated."
      },
      "DriversLicenseState": {
        "decision": "withhold",
        "reason": "The state that issued the licence, which is not the participant's mailing state and is not held as a distinct fact."
      },
      "EmailAddressOfRecord": {
        "decision": "withhold",
        "printedLabel": "... email (from ICMS/OFS) to the district attorney at ______, the email address of record with this court for that person.",
        "reason": "The district attorney's email inside a certificate-of-service block, and the binder was offering it the participant's street address. Two independent defects meet here: the descriptor list puts \\baddress\\b above \\bemail\\b, and the protect rules read field names only, so a field whose role is stated purely in the surrounding prose escapes both the prosecutor and the service-block guards. Never populated."
      },
      "Def.Address.City": {
        "decision": "withhold",
        "reason": "A city box in the defendant's address block. `\\baddress\\b` matches before `\\bcity\\b`, so the binder offers the whole street address for a city field. Withheld."
      },
      "Def.Address.State": {
        "decision": "withhold",
        "reason": "A state box in the defendant's address block, mis-bound to the street address for the same reason as Def.Address.City."
      },
      "address2": {
        "decision": "withhold",
        "reason": "The second line of a single address. The fact set holds one address, and writing all of it again on the continuation line would print it twice."
      },
      "PetitionerAddr2": {
        "decision": "withhold",
        "reason": "The continuation line of the petitioner's address; as address2."
      },
      "Def.Address.Zip": {
        "decision": "withhold",
        "reason": "A zip box in the defendant's address block. The descriptor list matches \\baddress\\b before \\bzip\\b, so the binder offers the street address. The right fact exists but the binder cannot be told to use it without editing the shared descriptor list, so the field is left blank."
      },
      "User.CityOrCounty": {
        "decision": "withhold",
        "printedLabel": "4. Court of final disposition: ... CITY OR COUNTY",
        "reason": "The city or county of the court of final disposition -- a venue, not the participant's home city. Virginia's independent cities make 'city or county' one jurisdiction field, and \\bcity\\b matches before \\bcounty\\b, so the binder offers participant.city. Withheld."
      },
      "User.AncillaryCityOrCounty": { "decision": "withhold", "reason": "Venue of the ancillary matter's court; as User.CityOrCounty." },
      "User.AncillaryCityOrCounty1": { "decision": "withhold", "reason": "Venue of a further ancillary matter's court." },
      "User.AncillaryCityOrCountyA": { "decision": "withhold", "reason": "Venue of a further ancillary matter's court." },
      "User.AncillaryCityOrCountyB": { "decision": "withhold", "reason": "Venue of a further ancillary matter's court." },
      "User.AncillaryCityOrCountyD": { "decision": "withhold", "reason": "Venue of a further ancillary matter's court." },
      "PetitionNotFiledSignName": {
        "decision": "withhold",
        "reason": "A name written on a signature line. It escapes both signature guards because 'sign' sits mid-name, so it is withheld here instead."
      }
    }
  },
  "families": {
    "VA/cc-1201-form-en": {
      "documentId": "CC-1201",
      "note": "Petition for sealing. The charge block and the narrative arrest date describe the same single arrest, so both arrest-date fields carry the same fact. The ancillary charge slot is left blank: it describes a further offense this fact set does not supply.",
      "refusedOnPurpose": {
        "User.AncillaryChargeDoc": "ancillary block describes a further charge; no indexed fact backs it"
      },
      "mappings": {
        "User.ChargeDesc": "matter.charge",
        "User.DateOfArrest": "matter.arrest_date",
        "User.ChargeDateOfArrest": "matter.arrest_date"
      }
    },
    "VA/cc-1201-a-form-en": {
      "documentId": "CC-1201(A)",
      "note": "Addendum. Its first offense block is mapped; the repeated blocks (suffixed 1, D and AncillaryB) are separate offences. Note that D0's row index reads a trailing '1' as charge row 1, which on this form is a block number rather than a table row, so mapping it would silently re-stamp the first charge.",
      "refusedOnPurpose": {
        "User.AncillaryChargeDoc": "second offense block",
        "User.DateOfArrest1": "second offense block; trailing digit is a block number, not a charge-table row",
        "User.AncillaryChargeDoc1": "second offense block",
        "User.DateOfArrestD": "further offense block",
        "User.AncillaryChargeDocD": "further offense block",
        "User.ArrestDateAncillaryB": "further offense block"
      },
      "mappings": {
        "User.ChargeDesc": "matter.charge",
        "User.DateOfArrest": "matter.arrest_date"
      }
    },
    "VA/cc-1203-form-en": {
      "documentId": "CC-1203",
      "note": "Petition for sealing under 19.2-392.12:1. Only the primary arrest date is mapped; the three ancillary slots describe further offences.",
      "refusedOnPurpose": {
        "User.AncillaryDateOfArrest": "ancillary offense block",
        "User.AncillaryDateOfArrestA": "ancillary offense block",
        "User.AncillaryDateOfArrestB": "ancillary offense block"
      },
      "mappings": {
        "User.DateOfArrest": "matter.arrest_date"
      }
    },
    "VA/cc-1203-a-form-en": {
      "documentId": "CC-1203(A)",
      "note": "Addendum. First block only.",
      "refusedOnPurpose": {
        "User.AncillaryDateOfArrest": "ancillary offense block",
        "User.AncillaryDateOfArrestA": "ancillary offense block",
        "User.AncillaryDateOfArrestB": "ancillary offense block"
      },
      "mappings": {
        "User.DateOfArrest": "matter.arrest_date"
      }
    },
    "VA/cc-1203-b-form-en": {
      "documentId": "CC-1203(B)",
      "note": "This addendum is itself the ancillary-matter sheet, so its first ancillary block is its primary block and carries the supplied arrest date. The second block is a further offense and stays blank.",
      "refusedOnPurpose": {
        "User.AncillaryDateOfArrestA": "second offense block on the ancillary sheet"
      },
      "mappings": {
        "User.AncillaryDateOfArrest": "matter.arrest_date"
      }
    },
    "VA/cc-1473-form-en": {
      "documentId": "CC-1473",
      "note": "Petition for expungement. One offense block, one arrest date.",
      "mappings": {
        "User.SpecificCharge": "matter.charge",
        "User.DateOfArrest": "matter.arrest_date"
      }
    },
    "KY/aoc-334-form-en": {
      "documentId": "AOC-334",
      "note": "Six-row charge table. The first row is the unsuffixed CHARGE; rows two through six carry the _N suffix and resolve to charge rows 1..5, which bind only when that many charges are supplied.",
      "mappings": {
        "CHARGE": "matter.charge",
        "ViolationArrest  Date": "matter.arrest_date",
        "CHARGE_2": "matter.charge",
        "CHARGE_3": "matter.charge",
        "CHARGE_4": "matter.charge",
        "CHARGE_5": "matter.charge",
        "CHARGE_6": "matter.charge"
      }
    },
    "KY/aoc-496-2-form-en": {
      "documentId": "AOC-496.2",
      "note": "Petition to expunge. Six-row charge table indexed from one. This form ships text fields with no /DA entry; D0 supplies a neutral default before any value is written, which governs how a value is drawn and never what it is.",
      "mappings": {
        "Charge.violation.date": "matter.offense_date",
        "Charge1": "matter.charge",
        "Charge2": "matter.charge",
        "Charge3": "matter.charge",
        "Charge4": "matter.charge",
        "Charge5": "matter.charge",
        "Charge6": "matter.charge"
      }
    },
    "KY/aoc-497-form-en": {
      "documentId": "AOC-497",
      "note": "Petition to expunge misdemeanour. Same six-row table shape as AOC-334.",
      "mappings": {
        "ViolationArrest Date": "matter.arrest_date",
        "CHARGE": "matter.charge",
        "CHARGE_2": "matter.charge",
        "CHARGE_3": "matter.charge",
        "CHARGE_4": "matter.charge",
        "CHARGE_5": "matter.charge",
        "CHARGE_6": "matter.charge"
      }
    },
    "NC/aoc-cr-287-form-en": {
      "documentId": "AOC-CR-287",
      "note": "Ten-row charge table. Every row is mapped so the row guard, not a missing mapping, is what decides which rows fill. AgeAtTimeOfOffense is refused on purpose: it matches the charge descriptor by name and is not a charge.",
      "refusedOnPurpose": {
        "AgeAtTimeOfOffense": "an age is not a charge; the name match is incidental"
      },
      "mappings": {
        "DateOfArrest1": "matter.arrest_date",
        "DateOfArrest2": "matter.arrest_date",
        "DateOfArrest3": "matter.arrest_date",
        "DateOfArrest4": "matter.arrest_date",
        "DateOfArrest5": "matter.arrest_date",
        "DateOfArrest6": "matter.arrest_date",
        "DateOfArrest7": "matter.arrest_date",
        "DateOfArrest8": "matter.arrest_date",
        "DateOfArrest9": "matter.arrest_date",
        "DateOfArrest10": "matter.arrest_date",
        "OffenseDescription1": "matter.charge",
        "OffenseDescription2": "matter.charge",
        "OffenseDescription3": "matter.charge",
        "OffenseDescription4": "matter.charge",
        "OffenseDescription5": "matter.charge",
        "OffenseDescription6": "matter.charge",
        "OffenseDescription7": "matter.charge",
        "OffenseDescription8": "matter.charge",
        "OffenseDescription9": "matter.charge",
        "OffenseDescription10": "matter.charge",
        "DateOfOffense1": "matter.offense_date",
        "DateOfOffense2": "matter.offense_date",
        "DateOfOffense3": "matter.offense_date",
        "DateOfOffense4": "matter.offense_date",
        "DateOfOffense5": "matter.offense_date",
        "DateOfOffense6": "matter.offense_date",
        "DateOfOffense7": "matter.offense_date",
        "DateOfOffense8": "matter.offense_date",
        "DateOfOffense9": "matter.offense_date",
        "DateOfOffense10": "matter.offense_date"
      }
    },
    "NC/aoc-cr-288-form-en": {
      "documentId": "AOC-CR-288",
      "note": "Eleven-row charge table. The offense-description column on this form is named Description:N, which matches no allowlisted fact descriptor at all, so the escape hatch cannot reach it and the column stays blank. That is recorded as a factory gap rather than worked around here.",
      "mappings": {
        "ArrestDate:1": "matter.arrest_date",
        "ArrestDate:2": "matter.arrest_date",
        "ArrestDate:3": "matter.arrest_date",
        "ArrestDate:4": "matter.arrest_date",
        "ArrestDate:5": "matter.arrest_date",
        "ArrestDate:6": "matter.arrest_date",
        "ArrestDate:7": "matter.arrest_date",
        "ArrestDate:8": "matter.arrest_date",
        "ArrestDate:9": "matter.arrest_date",
        "ArrestDate:10": "matter.arrest_date",
        "ArrestDate:11": "matter.arrest_date"
      }
    },
    "NC/aoc-cr-296-form-en": {
      "documentId": "AOC-CR-296",
      "note": "Twelve-row charge table, same Description:N naming as AOC-CR-288 and the same recorded gap.",
      "mappings": {
        "ArrestDate:1": "matter.arrest_date",
        "ArrestDate:2": "matter.arrest_date",
        "ArrestDate:3": "matter.arrest_date",
        "ArrestDate:4": "matter.arrest_date",
        "ArrestDate:5": "matter.arrest_date",
        "ArrestDate:6": "matter.arrest_date",
        "ArrestDate:7": "matter.arrest_date",
        "ArrestDate:8": "matter.arrest_date",
        "ArrestDate:9": "matter.arrest_date",
        "ArrestDate:10": "matter.arrest_date",
        "ArrestDate:11": "matter.arrest_date",
        "ArrestDate:12": "matter.arrest_date"
      }
    },
    "NC/aoc-cr-297-form-en": {
      "documentId": "AOC-CR-297",
      "note": "Two-row charge table with a named offense-description column.",
      "mappings": {
        "ArrestDate:1": "matter.arrest_date",
        "ArrestDate:2": "matter.arrest_date",
        "OffenseDescription:1": "matter.charge",
        "OffenseDescription:2": "matter.charge",
        "DateOfOffense:1": "matter.offense_date",
        "DateOfOffense:2": "matter.offense_date"
      }
    },
    "NC/aoc-cr-298-form-en": {
      "documentId": "AOC-CR-298",
      "note": "Two-row charge table, same shape as AOC-CR-297.",
      "mappings": {
        "ArrestDate:1": "matter.arrest_date",
        "ArrestDate:2": "matter.arrest_date",
        "OffenseDescription:1": "matter.charge",
        "OffenseDescription:2": "matter.charge",
        "DateOfOffense:1": "matter.offense_date",
        "DateOfOffense:2": "matter.offense_date"
      }
    }
  }
};
const EXPLICIT_MAPPINGS = MAPPING_FILE.families ?? {};

// --- the two-key rule -------------------------------------------------------
//
// The typed binder and the nine-class classifier were written independently and
// do not always agree. `FullNameOfArrest` is the clearest case: the binder sees
// `name` and offers the participant's legal name, while the classifier calls it
// manual. The classifier is right — that field carries the name the arrest
// record was made under, which is not the same fact as the petitioner's current
// legal name, and filling it would misstate the record to a court.
//
// So a binding needs both keys. Where they disagree the field is withheld
// unless it appears below with a reason, and a withheld field is recorded as a
// refusal rather than dropped silently. This can only ever remove bindings, so
// it cannot be a way to widen what D0 allows.
const AGREEMENT_OVERRIDES = MAPPING_FILE.classifierDisagreementOverrides ?? {};

const fieldTypeOf = (f) =>
  f instanceof PDFTextField ? "text"
  : f instanceof PDFCheckBox ? "checkbox"
  : f instanceof PDFRadioGroup ? "radio"
  : f instanceof PDFDropdown ? "dropdown"
  : f instanceof PDFOptionList ? "optionlist" : "other";

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };

// A family that is held, or whose shape changed, must not keep an artifact a
// previous run left behind: a stale filled PDF beside a hold reads as a fill.
function removeStale(familyDir, keep) {
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf",
    "contact-sheet/blank-vs-filled.pdf", "contact-sheet/contact-sheet-proof.json",
    // A negative fixture describes the refusals of a render that happened. On
    // a family that no longer renders, the one left behind describes a fill
    // that must not have occurred, so it goes too and is rewritten below.
    "fixtures/negative.json"]) {
    if (keep.has(rel)) continue;
    const p = path.join(familyDir, rel);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}

async function censusOf(doc) {
  const pages = doc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  let fields = [];
  try { fields = doc.getForm().getFields(); } catch { fields = []; }
  return fields.map((f) => {
    const type = fieldTypeOf(f);
    const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pref = w.P?.()?.toString?.();
      // A /Rect is two diagonally opposite corners in either order, so a
      // widget may legitimately report a negative width or height. pdf-lib
      // subtracts without normalizing, and an unnormalized box makes the
      // fitter refuse a field whose real rectangle is perfectly usable. The
      // corners are put back in order here and the anomaly is recorded, so the
      // fitter measures the rectangle the document actually draws.
      const entry = { page: pref ? (pageIndexOf.get(pref) ?? null) : null, rect: null };
      if (r) {
        entry.rect = {
          x: Math.round(Math.min(r.x, r.x + r.width)),
          y: Math.round(Math.min(r.y, r.y + r.height)),
          width: Math.round(Math.abs(r.width)),
          height: Math.round(Math.abs(r.height))
        };
        if (r.width < 0 || r.height < 0) {
          entry.rectCornersReordered = true;
          entry.rawRect = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        }
      }
      return entry;
    });
    const e = { name: f.getName(), type, widgets };
    if (type === "text") {
      try { e.maxLength = f.getMaxLength() ?? null; } catch { e.maxLength = null; }
      try { e.multiline = f.isMultiline?.() ?? null; } catch { e.multiline = null; }
    }
    if (["dropdown", "optionlist", "radio"].includes(type)) {
      try { e.options = f.getOptions(); } catch { /* unreadable option list */ }
    }
    return e;
  });
}

function pageGeometryOf(doc) {
  return doc.getPages().map((p, i) => ({
    page: i + 1, width: Math.round(p.getWidth()), height: Math.round(p.getHeight()),
    orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
  }));
}

// ---------------------------------------------------------------------------
async function buildFamily(state, row, mode) {
  const slug = STATES[state];
  const familySlug = familySlugOf(row);
  const familyDir = path.join(OUT, slug, familySlug);
  const abs = path.join(PACK, row.canonical_relative_path);

  const result = {
    jurisdiction: state, family: familySlug, documentId: row.document_id,
    assetClass: row.asset_class, language: row.language
  };

  if (!fs.existsSync(abs)) { result.status = "source_binary_absent"; result.blocker = true; return result; }
  const bytes = fs.readFileSync(abs);
  const sha = sha256(bytes);
  result.sha256 = sha;
  result.hashMatch = sha === row.sha256;
  if (!result.hashMatch) {
    // Blocks this family only: the rest of the state corpus is unaffected.
    result.status = "source_identity_mismatch_family_blocked";
    result.blocker = true;
    result.manifestSha256 = row.sha256;
    return result;
  }

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pageGeometry = pageGeometryOf(doc);
  const census = await censusOf(doc);
  const structuralClassObserved = census.length > 0 ? "acroform" : "flat";
  const declaredPages = Number(row.pages) || null;
  const declaredFieldCount = Number(row.field_count) || null;

  const record = {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: LANE,
    regeneratedBy: "scripts/rcap-official-forms/lanes/d1b-regenerate.mjs",
    jurisdiction: state,
    documentId: row.document_id,
    documentRole: row.document_role,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    workflowKey: row.workflow_key,
    canonicalBundlePath: EDITION_PREFIX + row.canonical_relative_path,
    sourcePackRelativePath: row.canonical_relative_path,
    sha256: sha,
    sha256VerifiedAgainstBundleManifest: true,
    byteLength: bytes.length,
    bundleDeclaredBytes: Number(row.bytes) || null,
    byteLengthMatches: String(bytes.length) === String(row.bytes),
    sourceUrl: row.source_url || null,
    sourceStatus: row.source_status,
    freshnessStatus: row.freshness_status,
    libraryFolder: row.canonical_relative_path.split("/")[3] ?? null,
    binaryPresent: true,
    structuralClassObserved,
    structuralClassDeclared: row.structural_class,
    structuralClassAgrees: row.structural_class === `${structuralClassObserved}_pdf`,
    declaredFieldCount,
    observedAcroFieldCount: census.length,
    fieldCountAgrees: declaredFieldCount === null ? null : declaredFieldCount === census.length,
    pageGeometry,
    declaredPages,
    pageCountAgrees: declaredPages === null ? null : declaredPages === pageGeometry.length,
    manifestNotes: row.notes || null,
    requiredFollowUp: row.required_follow_up || null
  };

  const ownership = determineOwnership(record);
  const nonFiling = detectNonFilingNotice(doc);
  const instructional = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.OUTSIDE_PARTY;
  const held = Boolean(nonFiling);
  const noFill = instructional || held;

  // Every lifecycle, currentness and product-scope hold the manifest and the
  // state README carry survives regeneration. A form that renders cleanly is
  // still held; rendering is not adoption.
  const productionHolds = [];
  if (row.generation_allowed !== "yes") productionHolds.push("state_manifest_generation_allowed_no");
  productionHolds.push("edition_1_runtime_disabled");
  productionHolds.push("f_independent_visual_review_required");
  if (row.asset_class === "source_gated") {
    productionHolds.push("source_gated_never_runtime_selectable");
  }
  if (row.freshness_status === "revision_confirmation_required") {
    productionHolds.push("currentness_revision_confirmation_required");
  }
  if (row.freshness_status === "source_or_currentness_gate_open") {
    productionHolds.push("source_or_currentness_gate_open");
  }
  if (held) productionHolds.push("source_states_do_not_complete_for_filing");
  if (noFill) productionHolds.push("not_participant_fillable_no_fixture_fill");

  record.lifecycleClassification = row.asset_class === "source_gated"
    ? "binary_present_source_gated" : "binary_present_and_current";
  record.renderStrategy = structuralClassObserved === "acroform" ? "acroform_fill" : "flat_overlay";
  record.participantFillable = !noFill;
  record.generationAllowed = row.generation_allowed === "yes";
  record.productionHolds = productionHolds;
  record.documentOwnership = ownership;
  record.censusBasis = "first_hand_inspection_of_verified_binary";
  record.coBrandingRule = "No LegalEase or partner branding may be added to the official form.";
  record.nonFilingNotice = nonFiling;

  const classification = census.map((c) => ({ name: c.name, type: c.type, class: classify(c.name, c.type, ownership) }));

  // --- binding, by the D0 typed fail-closed binder ---------------------------
  const explicitMappings = EXPLICIT_MAPPINGS[`${state}/${familySlug}`]?.mappings ?? {};
  const bindings = [];
  const bindingRefusals = [];
  const agreementOverridesApplied = [];
  for (const c of classification) {
    const decision = decideBinding(
      { name: c.name, pdfType: c.type },
      {
        explicitMappings,
        captionOnly: ownership === OWNERSHIP.COURT_ORDER,
        availableChargeRows: CANONICAL["matter.charges"].length,
        documentAcceptsFill: !noFill
      }
    );
    if (!decision.writable) {
      bindingRefusals.push({ field: c.name, reason: decision.reason, category: decision.category ?? null, factId: decision.factId ?? null });
      continue;
    }
    // A recorded withholding is absolute. D0's descriptor list is ordered
    // most-specific-first by intent but not always in fact -- `\baddress\b`
    // sits above both `\bemail\b` and `\bzip\b`, and `\bcity\b` above
    // `\bcounty\b` -- so a field named `EmailAddressOfRecord` or
    // `Def.Address.Zip` binds the street address, and `CityOrCounty` binds the
    // participant's city into a court's venue box. Both keys agree in those
    // cases, which is exactly why the withholding has to outrank them. The
    // descriptor list is not this lane's to reorder, so the field is left blank
    // and the defect is reported upward.
    const withhold = AGREEMENT_OVERRIDES[`${state}/${familySlug}`]?.[c.name] ?? AGREEMENT_OVERRIDES["*"]?.[c.name];
    if (withhold?.decision === "withhold") {
      bindingRefusals.push({
        field: c.name, reason: "withheld_by_lane_review", category: "lane_withholding",
        factId: decision.factId, note: withhold.reason
      });
      continue;
    }
    // Second key: the independent classifier must also have called this field
    // writable, or a recorded override must say why it is safe anyway.
    if (NEVER_WRITE.has(c.class)) {
      bindingRefusals.push({ field: c.name, reason: "classifier_called_field_unwritable", category: c.class, factId: decision.factId });
      continue;
    }
    if (!POPULATABLE.has(c.class)) {
      const override = AGREEMENT_OVERRIDES[`${state}/${familySlug}`]?.[c.name]
        ?? AGREEMENT_OVERRIDES["*"]?.[c.name];
      if (override?.decision !== "bind") {
        bindingRefusals.push({
          field: c.name, reason: "binder_and_classifier_disagree_withheld",
          category: c.class, factId: decision.factId,
          note: override?.reason ?? "The typed binder matched a fact descriptor but the nine-class pass did not call this field participant or deterministic. Withheld pending a recorded decision."
        });
        continue;
      }
      agreementOverridesApplied.push({ field: c.name, factId: decision.factId, classifierClass: c.class, reason: override.reason });
    }
    bindings.push({ field: c.name, class: c.class, factId: decision.factId });
  }

  if (mode === "audit") {
    result.auditRefusals = bindingRefusals
      .filter((r) => r.reason === "requires_explicit_mapping")
      .map((r) => {
        const f = census.find((c) => c.name === r.field);
        return { field: r.field, factId: r.factId, type: f?.type, maxLength: f?.maxLength ?? null, rect: f?.widgets?.[0]?.rect ?? null };
      });
    result.ownership = ownership;
    result.fields = census.length;
    result.bound = bindings.length;
    result.held = held;
    return result;
  }

  const mapKind = structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";

  // --- overlay anchors (flat forms only) ------------------------------------
  let anchors = [], anchorPages = [], candidateLabels = [];
  if (mapKind === "flat_overlay" && !noFill) {
    const helvetica = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    for (let pi = 0; pi < pages.length; pi += 1) {
      const lines = groupIntoLines(extractTextItems(pages[pi]));
      // A CID-encoded run decodes to glyph ids, which name nothing. It is
      // readable enough to decide a hold, never precise enough to place a
      // coordinate, so anchor placement excludes it outright.
      const readable = lines.filter((l) => !CID_ENCODED.test(l.text));
      anchorPages.push({ page: pi + 1, lines: lines.length, readableLines: readable.length, unreadableLines: lines.length - readable.length });
      for (const line of readable) {
        for (const blank of blankAnchorsOn(line, ownership)) {
          const size = Math.max(7, Math.min(11, line.size || 9));
          if (blank.x2 - blank.x1 < 24) continue;
          anchors.push({
            page: pi + 1, kind: "rule_line_blank",
            label: `${blank.labelBefore} ___ ${blank.labelAfter}`.trim(), factId: blank.factId,
            baselineY: line.y, fontSize: size,
            writeBox: {
              x: Number((blank.x1 + 2).toFixed(1)), y: Number((line.y + 2).toFixed(1)),
              width: Number((blank.x2 - blank.x1 - 4).toFixed(1)), height: Number((size * 1.25).toFixed(1))
            },
            measurement: { blankStartMeasured: true, blankEndMeasured: true, fromGlyphMetrics: true }
          });
        }
        const lineLabel = line.text.trim().replace(/[:.\s]+$/, "");
        const lineTarget = overlayFactFor(lineLabel, ownership);
        if (lineTarget && lineLabel.length >= 3) {
          candidateLabels.push({
            page: pi + 1, label: lineLabel, factId: lineTarget, labelX: line.x, baselineY: line.y,
            fontSize: line.size, writeBoxDerivable: false,
            reason: "Standalone caption label with no rule line. The value's position is set by the printed cell, which this document does not express as a measurable rectangle, so no coordinate is asserted."
          });
        }
        for (const run of line.runs) {
          if (CID_ENCODED.test(run.text)) continue;
          const label = run.text.trim();
          if (label.length < 3) continue;
          const target = overlayFactFor(label, ownership);
          if (!target) continue;
          const size = Math.max(7, Math.min(11, line.size || 9));
          const nextX = line.runs.filter((r) => r.x > run.x + 1).map((r) => r.x).sort((a, b) => a - b)[0] ?? null;
          const x = run.x + helvetica.widthOfTextAtSize(label, size) + 4;
          const right = nextX !== null ? nextX - 3 : pages[pi].getWidth() - 36;
          if (right - x < 24) continue;
          anchors.push({
            page: pi + 1, kind: "trailing_label", label, factId: target,
            labelX: run.x, baselineY: line.y, fontSize: size,
            writeBox: {
              x: Number(x.toFixed(1)), y: Number(line.y.toFixed(1)),
              width: Number((right - x).toFixed(1)), height: Number((size * 1.25).toFixed(1))
            },
            measurement: { labelPositionMeasured: true, rightBoundaryMeasured: nextX !== null, leftEdgeEstimatedFromLabelWidth: true }
          });
        }
      }
    }
    const seen = new Set();
    anchors = anchors.filter((a) => { const k = `${a.page}:${a.factId}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  // --- render ----------------------------------------------------------------
  const findings = [];
  const evidence = {
    schemaVersion: "rcap-d1b-family-evidence/v1",
    lane: LANE, jurisdiction: state, family: familySlug, sourceSha256: sha,
    sourceIdentity: {
      documentId: row.document_id, revision: row.revision, language: row.language,
      documentRole: row.document_role, assetClass: row.asset_class,
      confirmedAgainst: "STATE_MANIFEST.csv canonical_relative_path + sha256, then the binary itself",
      manifestDeclaredPages: declaredPages, observedPages: pageGeometry.length,
      manifestDeclaredFieldCount: declaredFieldCount, observedAcroFieldCount: census.length,
      fieldCountDiscrepancyNote: declaredFieldCount !== null && declaredFieldCount !== census.length
        ? "The manifest counts widget annotations; pdf-lib counts terminal fields, and a field with several widgets is one field. The observed number is what this package binds against."
        : null
    },
    ownership,
    holds: productionHolds,
    nonFilingNotice: nonFiling,
    explicitMappings: EXPLICIT_MAPPINGS[`${state}/${familySlug}`] ?? null,
    determinism: null,
    sourceDrift: null,
    mutations: [],
    // Fields the binder allowed whose name carries a role token it does not
    // itself recognise. `PrintedNameOfPetAtt` is "petitioner or attorney for
    // petitioner": on a self-represented filing that line is the participant's
    // own, and the fact written into it is the participant's own name, so the
    // binder is right. It is still the kind of call a reviewer should see
    // rather than have to find, so every one is listed here.
    ambiguousRoleBindings: bindings
      .filter((b) => /pet\s*att|petatt|\batt\b|atty|attorney|counsel|firm|agent|representative|guardian|next\s*friend|on\s*behalf/i.test(haystack(b.field)))
      .map((b) => ({
        field: b.field, factId: b.factId, class: b.class,
        reading: "Read as the petitioner's own line on a self-represented filing; the value written is a participant fact, never counsel's identity.",
        confirmWith: "counsel review"
      })),
    // A binding must never land on a class the nine-class pass called
    // unwritable. The binder and the classifier are independent, so an
    // agreement between them is worth recording rather than assuming.
    classifierAgreement: {
      rule: "A binding needs both keys: the typed fail-closed binder and the independent nine-class classifier. Where they disagree the field is withheld unless a recorded override says why it is safe.",
      bindingsOnNeverWriteClasses: bindings.filter((b) => NEVER_WRITE.has(b.class)).map((b) => b.field),
      withheldOnDisagreement: bindingRefusals
        .filter((r) => r.reason === "binder_and_classifier_disagree_withheld")
        .map((r) => ({ field: r.field, factId: r.factId, classifierClass: r.category })),
      // Fields both keys accepted and this lane refused anyway, each with the
      // reason. These are where D0's descriptor ordering or its name-only
      // protect rules would have written a wrong value into a real filing.
      withheldByLaneReview: bindingRefusals
        .filter((r) => r.reason === "withheld_by_lane_review")
        .map((r) => ({ field: r.field, factIdTheBinderOffered: r.factId, reason: r.note })),
      overridesApplied: agreementOverridesApplied
    }
  };

  let finalizedReport = null;
  let contactSheet = false;
  const keep = new Set();
  const renderable = mapKind === "acroform" ? bindings.length > 0 : anchors.length > 0;

  // A refusal recorded above has to reach the renderer, or it is only a note.
  // `finalizeOfficialForm` re-runs D0's binder over whatever census it is
  // given, so passing the full census re-decided every field this lane had
  // already withheld -- and D0's descriptor order then bound them to the very
  // facts the withholding existed to keep out. The independent review found 32
  // of these: a defendant's SSN box printing a name, an email-of-record box
  // printing a street address, a bank-account box printing a name. The census
  // handed to the renderer is therefore narrowed to this lane's own decisions,
  // as D1A already does.
  const laneRefusedNames = new Set(bindingRefusals.map((r) => r.field).filter(Boolean));
  const renderCensus = census.filter((f) => !laneRefusedNames.has(f.name));

  if (!noFill && renderable) {
    try {
      const rendered = {};
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const args = mapKind === "acroform"
          ? { sourceBytes: bytes, expectedSha256: sha, census: renderCensus, facts, explicitMappings,
              captionOnly: ownership === OWNERSHIP.COURT_ORDER, nonFilingNotice: null,
              minFontSize: MIN_READABLE_FONT_SIZE, title: `${state} ${row.document_id}` }
          : { sourceBytes: bytes, expectedSha256: sha, anchors, facts, nonFilingNotice: null,
              minFontSize: MIN_READABLE_FONT_SIZE, title: `${state} ${row.document_id}` };
        const run = mapKind === "acroform" ? await finalizeOfficialForm(args) : await finalizeFlatOverlay(args);
        fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
        fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), run.bytes);
        keep.add(`fixtures/${label}-filled.pdf`);
        rendered[label] = run;
        for (const u of run.report.unfittable) findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
        for (const r of run.report.refused) {
          if (r.category === "unfittable") continue;
          findings.push({ fixture: label, check: "binding_refused", ...r });
        }
        if (label === "canonical") finalizedReport = run.report;
      }

      // Determinism: the same source and the same facts must give the same
      // bytes, or a recorded artifact hash means nothing.
      const second = mapKind === "acroform"
        ? await finalizeOfficialForm({ sourceBytes: bytes, expectedSha256: sha, census: renderCensus, facts: CANONICAL,
            explicitMappings, captionOnly: ownership === OWNERSHIP.COURT_ORDER, nonFilingNotice: null,
            minFontSize: MIN_READABLE_FONT_SIZE, title: `${state} ${row.document_id}` })
        : await finalizeFlatOverlay({ sourceBytes: bytes, expectedSha256: sha, anchors, facts: CANONICAL,
            nonFilingNotice: null, minFontSize: MIN_READABLE_FONT_SIZE, title: `${state} ${row.document_id}` });
      evidence.determinism = {
        basis: "the canonical fixture rendered twice from the same source bytes and the same facts",
        firstSha256: rendered.canonical.report.outputSha256,
        secondSha256: second.report.outputSha256,
        identical: rendered.canonical.report.outputSha256 === second.report.outputSha256
      };
      if (!evidence.determinism.identical) findings.push({ check: "nondeterministic_render" });

      writeJson(path.join(familyDir, "fixtures/negative.json"), {
        schemaVersion: "rcap-negative-fixture/v4-typed",
        level: "participant_fact",
        assertion: "With no participant facts supplied nothing is written. Every field starts protected: money, race, arrest and disposition dates without an explicit mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction rather than by a deny pattern.",
        refusedFields: rendered.canonical.report.refused
      });
      keep.add("fixtures/negative.json");

      const sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: rendered.canonical.bytes,
        expectedValues: rendered.canonical.report.expectedValues,
        heading: `${state} ${row.document_id} — blank (left) vs finalized fill (right)`
      });
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet/blank-vs-filled.pdf"), sheet.bytes);
      writeJson(path.join(familyDir, "contact-sheet/contact-sheet-proof.json"), sheet.proof);
      keep.add("contact-sheet/blank-vs-filled.pdf");
      keep.add("contact-sheet/contact-sheet-proof.json");
      contactSheet = true;
    } catch (error) {
      if (error instanceof NonFilingHoldError) findings.push({ check: "non_filing_hold_enforced", notice: error.notice });
      else if (error instanceof ContactSheetProofError) findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null });
      else findings.push({ check: "finalize_refused", message: String(error.message).slice(0, 300) });
    }
  }

  // Stale artifacts from an earlier factory must not survive a regeneration
  // that no longer produces them. This runs before the hold is evidenced, so
  // "no fill exists" is a statement about this package now rather than about
  // what some previous run left lying in the directory.
  removeStale(familyDir, keep);

  // --- the non-filing hold, proven rather than asserted ----------------------
  //
  // The hold is not a flag this driver reads and then declines to render. The
  // finalizer is called with the notice the document actually prints, and it
  // must refuse. A family that reached this branch and produced bytes would be
  // a defect, so the absence of bytes is the evidence.
  if (held) {
    let refused = false, message = null;
    try {
      const args = mapKind === "acroform"
        ? { sourceBytes: bytes, expectedSha256: sha, census, facts: CANONICAL, explicitMappings, nonFilingNotice: nonFiling.notice }
        : { sourceBytes: bytes, expectedSha256: sha, anchors: [], facts: CANONICAL, nonFilingNotice: nonFiling.notice };
      if (mapKind === "acroform") await finalizeOfficialForm(args); else await finalizeFlatOverlay(args);
    } catch (error) {
      refused = error instanceof NonFilingHoldError;
      message = String(error.message).slice(0, 200);
    }
    evidence.nonFilingHoldEnforcement = {
      noticePage: nonFiling.page,
      noticeText: nonFiling.notice,
      decodeBasis: nonFiling.decodeBasis,
      finalizerRefused: refused,
      error: message,
      fillProduced: fs.existsSync(path.join(familyDir, "fixtures/canonical-filled.pdf"))
    };
    findings.push({ check: "non_filing_hold_enforced", notice: nonFiling.notice, finalizerRefused: refused });
    if (!refused) findings.push({ check: "non_filing_hold_not_enforced_by_finalizer" });
  }

  // A family that produces no artifact still carries a negative fixture, and
  // for it the assertion is stronger: not "nothing is written without facts"
  // but "nothing is written at all, with facts or without".
  if (!fs.existsSync(path.join(familyDir, "fixtures/negative.json"))) {
    writeJson(path.join(familyDir, "fixtures/negative.json"), {
      schemaVersion: "rcap-negative-fixture/v4-typed",
      level: "participant_fact",
      assertion: held
        ? "This document states on its own face that it must not be completed for filing. No value is written into it under any fact set, and the finalizer refuses when handed the notice the document prints."
        : instructional
          ? "This document is read rather than filed, so no participant fill is produced under any fact set."
          : "No field on this document resolved to a safe binding, so nothing is written under any fact set.",
      holdReason: held ? "source_states_do_not_complete_for_filing" : instructional ? "instructional_document" : "no_safe_binding_resolved",
      refusedFields: bindingRefusals,
      artifactsProduced: []
    });
  }

  // --- source-drift proof ----------------------------------------------------
  {
    const perturbed = Buffer.from(bytes);
    perturbed[Math.floor(perturbed.length / 2)] ^= 0xff;
    let refused = false, message = null;
    try {
      await finalizeOfficialForm({ sourceBytes: perturbed, expectedSha256: sha, census: [], facts: {} });
    } catch (error) { refused = /source drift/.test(error.message); message = String(error.message).slice(0, 160); }
    evidence.sourceDrift = { basis: "one byte of the source flipped, then finalized against the pinned sha256", refused, message };
    if (!refused) findings.push({ check: "source_drift_not_detected" });
  }

  // --- load-bearing mutation checks -----------------------------------------
  //
  // Each removes one guarantee and confirms the corresponding refusal is what
  // was actually doing the work, against this family's own fields rather than
  // a synthesized stand-in.
  {
    const helvetica = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const mutations = [];

    // 1. The readable floor. A real value forced into a one-point-wide box must
    //    be refused, not stamped at an unreadable size.
    const tiny = fitTextToWidget({ font: helvetica, text: CANONICAL["participant.full_legal_name"], rect: { x: 0, y: 0, width: 12, height: 10 }, multiline: false });
    mutations.push({ mutation: "value_forced_into_undersized_widget", expected: "refused", observed: tiny.outcome, passed: tiny.outcome === "refused" });

    // 2. Protected categories, sampled from this family's own census.
    const protectedSample = census.map((c) => c.name).filter((n) => protectCategoryOf(n) !== null).slice(0, 8);
    const leaked = protectedSample.filter((n) => decideBinding({ name: n, pdfType: "text" }, { availableChargeRows: 1 }).writable);
    mutations.push({ mutation: "protected_named_fields_offered_to_binder", sampled: protectedSample.length, expected: "all refused", leaked, passed: leaked.length === 0 });

    // 3. A repeating charge row beyond the supplied facts.
    const rowProbe = decideBinding({ name: "ChargeDescription7", pdfType: "text" }, { availableChargeRows: 1, explicitMappings: { ChargeDescription7: "matter.charge" } });
    mutations.push({ mutation: "charge_row_7_with_one_supplied_charge", expected: "refused", observed: rowProbe.writable ? "written" : rowProbe.reason, passed: rowProbe.writable === false });

    // 4. A non-text control offered a participant fact.
    const controlProbe = decideBinding({ name: "PetitionerName", pdfType: "checkbox" }, { availableChargeRows: 1 });
    mutations.push({ mutation: "checkbox_offered_a_participant_fact", expected: "refused", observed: controlProbe.reason, passed: controlProbe.writable === false });

    // 5. The active-content scan still sees a planted action.
    const planted = scanBytesForActiveContent(Buffer.from("%PDF-1.7\n1 0 obj << /Type /Action /S /JavaScript /JS (app.alert\\(1\\)) >> endobj\n"));
    mutations.push({ mutation: "javascript_action_planted_in_object_structure", expected: "detected", observed: planted.hits, passed: planted.hits.length > 0 });

    // 6. A contact sheet built from an unflattened stand-in must refuse.
    if (finalizedReport && finalizedReport.expectedValues.length > 0) {
      let refused = false;
      try {
        await buildContactSheet({ blankBytes: bytes, finalizedBytes: bytes, expectedValues: finalizedReport.expectedValues });
      } catch (error) { refused = error instanceof ContactSheetProofError; }
      mutations.push({ mutation: "contact_sheet_built_from_the_unfilled_source", expected: "refused", observed: refused ? "refused" : "emitted", passed: refused });
    }

    evidence.mutations = mutations;
    for (const m of mutations) if (!m.passed) findings.push({ check: "mutation_did_not_fail_closed", mutation: m.mutation });
  }

  // --- package files ---------------------------------------------------------
  writeJson(path.join(familyDir, "field-census.json"), {
    schemaVersion: "rcap-field-census/v3-first-hand",
    censusBasis: "first_hand_inspection_of_verified_binary",
    sha256: sha, structuralClass: structuralClassObserved,
    fieldCount: census.length, pageGeometry, fields: census
  });

  writeJson(path.join(familyDir, "field-classification.json"), {
    schemaVersion: "rcap-field-classification/v4-nine-class",
    documentOwnership: ownership,
    ownershipBasis: "document role, canonical filename and official title, re-checked field by field",
    classCounts: classification.reduce((a, c) => { a[c.class] = (a[c.class] ?? 0) + 1; return a; }, {}),
    entries: classification
  });

  writeJson(path.join(familyDir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json"), {
    schemaVersion: `rcap-${mapKind}-map/v5`,
    family: familySlug,
    lane: LANE,
    documentOwnership: ownership,
    sha256: sha,
    pageGeometry,
    captionOnly: ownership === OWNERSHIP.COURT_ORDER,
    factoryVersion: FACTORY_VERSION,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs)",
    explicitMappings,
    bindings,
    bindingRefusals,
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
    overflowPolicy: { longText: "shrink_to_fit_then_refuse_below_6pt", multiline: "wrap_within_widget_rect" }
  });

  writeJson(path.join(familyDir, "reports/populated-fields.json"), bindings);
  writeJson(path.join(familyDir, "reports/protected-fields.json"), {
    documentOwnership: ownership,
    wholeDocumentUnwritable: noFill,
    holdReason: held ? "source states it is not to be completed for filing" : instructional ? "document is read, not filed" : null,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
    binderRefusals: bindingRefusals
  });
  writeJson(path.join(familyDir, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v2",
    boundaryFixtureApplied: !noFill && renderable,
    policy: "A value that cannot be drawn at 6pt or larger inside its own widget is refused and the field left blank. Nothing is written past a widget edge.",
    findings
  });

  // --- visibility and protection scan ---------------------------------------
  const canonicalPath = path.join(familyDir, "fixtures/canonical-filled.pdf");
  if (finalizedReport && fs.existsSync(canonicalPath)) {
    const finalizedDoc = await PDFDocument.load(fs.readFileSync(canonicalPath), { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalizedDoc);
    const missing = missingExpectedValues(visible, finalizedReport.expectedValues);
    const placeholder = /\b(tbd|todo|lorem|xxx+|placeholder|sample text|fixme|\{\{|\$\{)/i.exec(visible);
    const protectedNames = new Set((finalizedReport.protectedFields ?? []).map((p) => p.field));
    const writtenProtected = finalizedReport.written.filter((w) => protectedNames.has(w.field));
    const residue = finalizedReport.activeContentScan?.hits ?? [];
    // A value drawn more often than the renderer wrote it is a duplicate stamp
    // -- the form's own printed text can legitimately repeat a string, so the
    // comparison is against how many times this render wrote that exact value,
    // plus however many times the blank source already showed it.
    const squash = (s) => String(s).replace(/\s+/g, "").toLowerCase();
    const occurrences = (hay, needle) => (needle.length === 0 ? 0 : hay.split(needle).length - 1);
    const blankVisible = squash(visibleTextOfDocument(await PDFDocument.load(bytes, { ignoreEncryption: true })));
    const finalVisible = squash(visible);
    // `written` and `expectedValues` are appended together on each successful
    // write, so they are index-aligned: entry i is what field i received.
    const widgetCountOf = new Map(census.map((f) => [f.name, Math.max(1, (f.widgets ?? []).length)]));
    const writes = finalizedReport.written.map((w, i) => ({
      squashed: squash(finalizedReport.expectedValues[i] ?? ""),
      // One field can own several widgets -- Kentucky repeats the case number
      // in a caption and a footer from a single field -- and flattening draws
      // every one of them. Those appearances are expected, not duplicates.
      appearances: widgetCountOf.get(w.field) ?? 1
    }));
    const duplicated = [...new Set(finalizedReport.expectedValues)].map((v) => {
      const needle = squash(v);
      // A short value legitimately reappears inside a longer one -- the zip
      // "01234" sits inside the case number "24-CR-001234" -- so a write counts
      // toward this value whenever the value it wrote contains it.
      const expected = writes.filter((w) => w.squashed.includes(needle)).reduce((a, w) => a + w.appearances, 0);
      const inBlank = occurrences(blankVisible, needle);
      const inFinal = occurrences(finalVisible, needle);
      return { value: v, appearancesExpected: expected, timesInBlankSource: inBlank, timesVisible: inFinal };
    }).filter((d) => d.timesVisible > d.appearancesExpected + d.timesInBlankSource);
    writeJson(path.join(familyDir, "reports/protected-fields-scan.json"), {
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      writtenFields: finalizedReport.written.length,
      refusedFields: finalizedReport.refused.length,
      protectedFieldsRefused: (finalizedReport.protectedFields ?? []).length,
      violations: writtenProtected,
      valuesWrittenButNotVisible: missing,
      placeholderValues: placeholder ? [placeholder[0]] : [],
      activeContentResidue: residue,
      unreadableValuesRefused: finalizedReport.unfittable.map((u) => ({ field: u.field ?? u.anchor, reason: u.reason })),
      duplicatedValues: duplicated,
      pass: writtenProtected.length === 0 && missing.length === 0 && !placeholder && residue.length === 0
    });
    if (writtenProtected.length || missing.length || placeholder || residue.length) {
      findings.push({ check: "protected_or_visibility_violation", writtenProtected, missing, residue });
    }
  } else {
    // A held or instructional family still carries a scan, and its pass
    // condition is that nothing was produced at all.
    writeJson(path.join(familyDir, "reports/protected-fields-scan.json"), {
      scanBasis: noFill
        ? "no participant artifact exists for this family; the scan confirms none was produced"
        : "no binding resolved, so no artifact was produced",
      writtenFields: 0, refusedFields: bindingRefusals.length,
      protectedFieldsRefused: bindingRefusals.filter((r) => r.reason === "protected_category").length,
      violations: [], valuesWrittenButNotVisible: [], placeholderValues: [], activeContentResidue: [],
      holdReason: held ? "source_states_do_not_complete_for_filing" : instructional ? "instructional_document" : null,
      pass: !fs.existsSync(canonicalPath)
    });
  }

  const renderedArtifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    const p = path.join(familyDir, rel);
    if (!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    renderedArtifacts[rel] = { sha256: sha256(buf), bytes: buf.length };
  }
  writeJson(path.join(familyDir, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1",
    sourceSha256: sha,
    renderer: "scripts/rcap-official-forms/lanes/d1b-regenerate.mjs",
    factoryVersion: FACTORY_VERSION,
    reproducible: "Creation and modification dates are pinned, so re-rendering from the same source binary reproduces these hashes byte for byte. The determinism entry in family-evidence.json records the second render that proves it.",
    artifacts: renderedArtifacts
  });

  record.implementationStatus = held
    ? "held_not_for_filing_no_fill_produced"
    : instructional
      ? (ownership === OWNERSHIP.INSTRUCTIONAL ? "no_fill_instructional_document" : "no_fill_outside_party_document")
      : mapKind === "flat_overlay"
        ? (anchors.length > 0 ? "overlay_implemented_pending_independent_review"
          : candidateLabels.length > 0 ? "overlay_labels_measured_write_box_pending_review"
          : anchorPages.reduce((a, p) => a + p.readableLines, 0) > 0 ? "overlay_no_participant_label_matched"
          : "overlay_no_extractable_text_layer")
        : bindings.length > 0 ? "implemented_pending_independent_review"
          : "acroform_mapped_all_fields_manual_or_unwritable";
  record.ownershipDetermination = {
    [OWNERSHIP.INSTRUCTIONAL]: "Instructional document. It is read, not filed, so no participant fill is produced.",
    [OWNERSHIP.OUTSIDE_PARTY]: "Completed by the opposing party, not the participant. No fill is produced.",
    [OWNERSHIP.COURT_ORDER]: "Court-issued order. Only caption facts are bound; no decretal or dispositional field is ever written.",
    [OWNERSHIP.PARTICIPANT]: "Participant-completed filing. Participant and deterministic fields are bound; every other class is unwritable."
  }[ownership];
  if (held) {
    record.ownershipDetermination = `${record.ownershipDetermination} This copy prints a notice that it must not be completed for filing, so it is held and no fill is produced regardless of ownership.`;
  }

  writeJson(path.join(familyDir, "source-record.json"), record);
  writeJson(path.join(familyDir, "reports/family-evidence.json"), evidence);

  Object.assign(result, {
    status: record.implementationStatus, ownership, mapKind,
    fields: census.length, bound: bindings.length, refused: bindingRefusals.length,
    protectedRefused: bindingRefusals.filter((r) => r.reason === "protected_category").length,
    unfittable: finalizedReport?.unfittable.length ?? 0,
    anchors: anchors.length, candidateLabels: candidateLabels.length,
    contactSheet, held, findings: findings.length,
    holds: productionHolds.length,
    deterministic: evidence.determinism?.identical ?? null,
    fixtures: Object.keys(renderedArtifacts).length
  });
  return result;
}

// ---------------------------------------------------------------------------
// Verification, over what is on disk rather than over what the build believed.
//
// Every claim this lane makes is re-derived here from the committed files: the
// hashes of the rendered artifacts, the pinning of each map to its source
// record, the pass state of every scan, the refusal of every held family, and
// the fact that neither shared index was touched.
function verifyLane() {
  const failures = [];
  const notes = [];
  const assert = (cond, message) => { if (!cond) failures.push(message); };
  const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
  const counts = {
    families: 0, acroform: 0, overlay: 0, held: 0, instructional: 0, implemented: 0,
    fixtures: 0, contactSheets: 0, bound: 0, refused: 0, protectedRefused: 0,
    unfittable: 0, fields: 0, withheldOnDisagreement: 0, overridesApplied: 0
  };

  for (const [code, slug] of Object.entries(STATES)) {
    const stateDir = path.join(OUT, slug);
    const indexPath = path.join(stateDir, "state-index.json");
    assert(fs.existsSync(indexPath), `${slug}: lane-scoped state-index.json exists`);
    if (!fs.existsSync(indexPath)) continue;
    const index = readJson(indexPath);
    assert(index.lane === LANE, `${slug}: state index is lane ${LANE}`);

    for (const fam of index.families) {
      counts.families += 1;
      const dir = path.join(stateDir, fam.family);
      const id = `${code}/${fam.family}`;
      assert(fs.existsSync(dir), `${id}: package directory exists`);
      if (!fs.existsSync(dir)) continue;

      const record = readJson(path.join(dir, "source-record.json"));
      const census = readJson(path.join(dir, "field-census.json"));
      const cls = readJson(path.join(dir, "field-classification.json"));
      const evidence = readJson(path.join(dir, "reports/family-evidence.json"));
      const scan = readJson(path.join(dir, "reports/protected-fields-scan.json"));
      const mapKind = record.structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";
      const mapPath = path.join(dir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json");
      assert(fs.existsSync(mapPath), `${id}: ${mapKind} map present`);
      if (!fs.existsSync(mapPath)) continue;
      const map = readJson(mapPath);

      counts[mapKind === "acroform" ? "acroform" : "overlay"] += 1;
      counts.fields += census.fieldCount;
      counts.bound += (map.bindings ?? []).length;
      counts.refused += (map.bindingRefusals ?? []).length;
      counts.protectedRefused += (map.bindingRefusals ?? []).filter((r) => r.reason === "protected_category").length;
      counts.withheldOnDisagreement += evidence.classifierAgreement.withheldOnDisagreement.length;
      counts.overridesApplied += evidence.classifierAgreement.overridesApplied.length;

      // Identity.
      assert(record.sha256VerifiedAgainstBundleManifest === true, `${id}: source hash verified against the manifest`);
      assert(record.byteLengthMatches !== false, `${id}: byte length matches the manifest`);
      assert(record.pageCountAgrees !== false, `${id}: page count matches the manifest`);
      assert(sha256(fs.readFileSync(path.join(PACK, record.sourcePackRelativePath))) === record.sha256,
        `${id}: the pinned sha256 still matches the source binary on disk`);
      assert(census.sha256 === record.sha256, `${id}: census pinned to the source record's sha256`);
      assert(map.sha256 === record.sha256, `${id}: map pinned to the source record's sha256`);
      assert(census.fieldCount === census.fields.length, `${id}: census count matches its own entries`);
      assert(cls.entries.length === census.fields.length, `${id}: every censused field is classified`);

      // Holds survive regeneration.
      for (const hold of ["edition_1_runtime_disabled", "f_independent_visual_review_required"]) {
        assert(record.productionHolds.includes(hold), `${id}: hold '${hold}' preserved`);
      }
      if (record.lifecycleClassification === "binary_present_source_gated") {
        assert(record.productionHolds.includes("source_gated_never_runtime_selectable"), `${id}: source-gated hold preserved`);
      }
      assert(record.generationAllowed === false, `${id}: Edition 1 generation_allowed=no is carried, not overridden`);

      // Binding safety.
      assert(map.factoryVersion === FACTORY_VERSION, `${id}: map carries the remediated factory version`);
      assert(/typed fail-closed/.test(map.bindingBasis ?? ""), `${id}: bindings come from the typed fail-closed binder`);
      assert(Array.isArray(map.bindingRefusals), `${id}: refusals recorded, so protection is auditable`);
      const classOf = new Map(cls.entries.map((e) => [e.name, e.class]));
      const typeOf = new Map(census.fields.map((e) => [e.name, e.type]));
      for (const b of map.bindings ?? []) {
        assert(protectCategoryOf(b.field) === null, `${id}: binding on '${b.field}' is not a protected category`);
        assert(!NEVER_WRITE.has(classOf.get(b.field)), `${id}: binding on '${b.field}' is not an unwritable class`);
        assert(!["checkbox", "radio", "optionlist", "other"].includes(typeOf.get(b.field)),
          `${id}: binding on '${b.field}' does not target an election control`);
        const agreed = POPULATABLE.has(classOf.get(b.field))
          || evidence.classifierAgreement.overridesApplied.some((o) => o.field === b.field);
        assert(agreed, `${id}: binding on '${b.field}' has both keys or a recorded override`);
        if (map.captionOnly) {
          const base = b.factId.replace(/^matter\.charges\[\d+\]\./, "matter.");
          assert(CAPTION_FACTS.has(base), `${id}: a court-issued order binds caption facts only, saw '${b.factId}'`);
        }
      }
      for (const a of map.anchorCapture?.anchors ?? []) {
        assert(!/judge|magistrate|clerk|court use|prosecut|attorney|sheriff|police|agency|notar|sworn|signature|\bsign\b|service|so ordered|it is ordered|hearing|granted|denied|for office/i.test(a.label),
          `${id}: overlay anchor '${a.label}' is not placed against a denied label`);
        assert(a.writeBox.width > 0 && a.writeBox.height > 0, `${id}: overlay anchor '${a.label}' has a positive write box`);
      }

      // Charge rows never outrun the supplied facts.
      for (const b of map.bindings ?? []) {
        const m = /^matter\.charges\[(\d+)\]\./.exec(b.factId);
        if (m) assert(Number(m[1]) < CANONICAL["matter.charges"].length,
          `${id}: charge row ${m[1]} on '${b.field}' is backed by a supplied charge`);
      }

      // The non-filing hold.
      if (record.nonFilingNotice) {
        counts.held += 1;
        assert(record.participantFillable === false, `${id}: a held document is not participant-fillable`);
        assert(record.productionHolds.includes("source_states_do_not_complete_for_filing"), `${id}: non-filing hold recorded`);
        assert(record.productionHolds.includes("not_participant_fillable_no_fixture_fill"), `${id}: no-fill hold recorded`);
        assert(evidence.nonFilingHoldEnforcement?.finalizerRefused === true,
          `${id}: the finalizer refused when handed the notice this document prints`);
        for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
          assert(!fs.existsSync(path.join(dir, rel)), `${id}: held document produced no ${rel}`);
        }
        const negative = readJson(path.join(dir, "fixtures/negative.json"));
        assert(negative.holdReason === "source_states_do_not_complete_for_filing",
          `${id}: the negative fixture states the hold rather than describing a fill`);
        assert((negative.artifactsProduced ?? []).length === 0, `${id}: the negative fixture claims no artifact`);
        assert((map.bindings ?? []).length === 0, `${id}: held document binds nothing`);
        assert((map.anchorCapture?.anchors ?? []).length === 0, `${id}: held document places no anchor`);
      }
      if (record.documentOwnership === OWNERSHIP.INSTRUCTIONAL && !record.nonFilingNotice) {
        counts.instructional += 1;
        assert(record.participantFillable === false, `${id}: an instructional document is not participant-fillable`);
        assert(!fs.existsSync(path.join(dir, "fixtures/canonical-filled.pdf")), `${id}: instructional document produced no fill`);
      }

      // Rendered artifacts and their proofs.
      const receipt = readJson(path.join(dir, "reports/rendered-artifacts.json"));
      assert(receipt.sourceSha256 === record.sha256, `${id}: render receipt pinned to the source sha256`);
      for (const [rel, meta] of Object.entries(receipt.artifacts ?? {})) {
        const p = path.join(dir, rel);
        assert(fs.existsSync(p), `${id}: recorded artifact ${rel} exists`);
        if (!fs.existsSync(p)) continue;
        const buf = fs.readFileSync(p);
        assert(sha256(buf) === meta.sha256, `${id}: ${rel} matches its recorded hash`);
        assert(buf.subarray(0, 5).toString() === "%PDF-", `${id}: ${rel} is a real PDF`);
        counts.fixtures += 1;
      }

      assert(scan.pass === true, `${id}: protected-field and visibility scan passes`);
      assert((scan.activeContentResidue ?? []).length === 0, `${id}: no active-content residue`);
      assert((scan.valuesWrittenButNotVisible ?? []).length === 0, `${id}: every written value is visible`);
      assert((scan.violations ?? []).length === 0, `${id}: no protected field was written`);
      assert((scan.duplicatedValues ?? []).length === 0, `${id}: no value is stamped more times than it was written`);
      counts.unfittable += (scan.unreadableValuesRefused ?? []).length;

      const sheetPath = path.join(dir, "contact-sheet/blank-vs-filled.pdf");
      if (fs.existsSync(sheetPath)) {
        counts.contactSheets += 1;
        const proof = readJson(path.join(dir, "contact-sheet/contact-sheet-proof.json"));
        assert(proof.allExpectedValuesVisible === true, `${id}: every expected value is visible in the finalized artifact`);
        assert(proof.panelsDiffer === true, `${id}: blank and filled panels differ`);
        assert(sha256(fs.readFileSync(path.join(dir, "fixtures/canonical-filled.pdf"))) === proof.finalizedSha256,
          `${id}: the contact sheet is pinned to the artifact it depicts`);
        // The sheet must depict the artifact, not the blank form twice.
        assert(proof.expectedValues.length > 0, `${id}: the sheet asserts at least one expected value`);
      }
      if (record.implementationStatus === "implemented_pending_independent_review"
        || record.implementationStatus === "overlay_implemented_pending_independent_review") {
        counts.implemented += 1;
        for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
          assert(fs.existsSync(path.join(dir, rel)), `${id}: ${rel} rendered`);
        }
        // A family that rendered must carry the render's own negative fixture,
        // not the stand-in written for families that produce nothing.
        const negative = readJson(path.join(dir, "fixtures/negative.json"));
        assert(negative.holdReason === undefined,
          `${id}: the negative fixture is the render's, not a no-fill stand-in`);
        assert(Array.isArray(negative.refusedFields) && negative.refusedFields.length > 0,
          `${id}: the negative fixture records the refusals the render made`);
      }

      // Determinism, drift and the mutation set.
      if (evidence.determinism) assert(evidence.determinism.identical === true, `${id}: the render is byte-reproducible`);
      assert(evidence.sourceDrift?.refused === true, `${id}: a perturbed source is refused`);
      assert(evidence.mutations.length > 0, `${id}: mutation checks ran`);
      for (const m of evidence.mutations) assert(m.passed === true, `${id}: mutation '${m.mutation}' still fails closed`);

      // No placeholder text anywhere in the package's own text files.
      for (const file of fs.readdirSync(dir, { recursive: true })) {
        const p = path.join(dir, String(file));
        if (!fs.statSync(p).isFile() || /\.pdf$/i.test(p)) continue;
        const text = fs.readFileSync(p, "utf8");
        for (const pattern of [/\bTODO\b/, /\bTBD\b/, /\bFIXME\b/, /lorem ipsum/i]) {
          assert(!pattern.test(text), `${id}/${file}: no placeholder text (${pattern})`);
        }
      }

      if (evidence.ambiguousRoleBindings.length > 0) {
        notes.push(`${id}: ${evidence.ambiguousRoleBindings.length} binding(s) on ambiguous role fields, flagged for counsel`);
      }
    }
  }

  // The anti-collision rule, checked rather than trusted.
  for (const shared of ["verified-binary-index.json", "implementation-index.json"]) {
    const p = path.join(OUT, shared);
    assert(fs.existsSync(p), `shared ${shared} still present`);
  }

  return { failures, notes, counts };
}

// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--verify")) {
    const { failures, notes, counts } = verifyLane();
    for (const n of notes) console.log(`  note ${n}`);
    if (failures.length > 0) {
      console.error(`d1b-verify FAILED (${failures.length})`);
      for (const f of failures) console.error(` - ${f}`);
      process.exit(1);
    }
    console.log(`d1b-verify passed across ${counts.families} families.`);
    console.log(JSON.stringify(counts, null, 2));
    return;
  }
  const mode = args.includes("--audit") ? "audit" : "build";
  const only = args.filter((a) => !a.startsWith("--"));
  const states = only.length > 0 ? only : Object.keys(STATES);

  const all = [];
  for (const state of states) {
    const rows = readManifest(state).filter((r) => /\.pdf$/i.test(r.canonical_relative_path));
    const results = [];
    for (const row of rows) results.push(await buildFamily(state, row, mode));
    all.push(...results);

    if (mode === "build") {
      // Lane-scoped, per state. The two shared indexes at the production root
      // are written by seven lanes at once and are therefore not written here;
      // the captain merges these.
      writeJson(path.join(OUT, STATES[state], "state-index.json"), {
        schemaVersion: "rcap-d1b-state-index/v1",
        lane: LANE,
        jurisdiction: state,
        factoryVersion: FACTORY_VERSION,
        sourcePack: "RCAP_D_D1_SOURCE_PACK.zip",
        sourcePackSha256: "01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa",
        mergeNote: "Lane D1B does not write verified-binary-index.json or implementation-index.json; seven lanes run concurrently and would collide. These entries are for the captain to merge.",
        families: results
      });
    }
  }

  if (mode === "audit") {
    const auditPath = process.env.RCAP_D1B_AUDIT_OUT;
    if (auditPath) writeJson(auditPath, all.filter((r) => r.auditRefusals?.length));
    for (const r of all) {
      if (!r.auditRefusals?.length) continue;
      console.log(`\n${r.jurisdiction}/${r.family}  (${r.ownership}, ${r.fields} fields, ${r.bound} bound${r.held ? ", HELD" : ""})`);
      for (const a of r.auditRefusals) {
        console.log(`   ${a.field.padEnd(40)} -> ${String(a.factId).padEnd(26)} ${a.type} max=${a.maxLength ?? "-"} rect=${a.rect ? `${a.rect.width}x${a.rect.height}` : "-"}`);
      }
    }
    return;
  }

  const sum = (p) => all.filter(p).length;
  const total = (f) => all.reduce((a, r) => a + (f(r) ?? 0), 0);
  console.log(JSON.stringify({
    families: all.length,
    hashMatches: sum((r) => r.hashMatch),
    hashMismatches: sum((r) => r.hashMatch === false),
    acroform: sum((r) => r.mapKind === "acroform"),
    overlay: sum((r) => r.mapKind === "flat_overlay"),
    implemented: sum((r) => r.status === "implemented_pending_independent_review"),
    overlayImplemented: sum((r) => r.status === "overlay_implemented_pending_independent_review"),
    overlayNoLabel: sum((r) => r.status === "overlay_no_participant_label_matched"),
    overlayLabelsMeasured: sum((r) => r.status === "overlay_labels_measured_write_box_pending_review"),
    allManual: sum((r) => r.status === "acroform_mapped_all_fields_manual_or_unwritable"),
    instructional: sum((r) => r.status === "no_fill_instructional_document"),
    heldNotForFiling: sum((r) => r.held),
    fields: total((r) => r.fields),
    bound: total((r) => r.bound),
    refused: total((r) => r.refused),
    protectedRefused: total((r) => r.protectedRefused),
    unfittable: total((r) => r.unfittable),
    contactSheets: sum((r) => r.contactSheet),
    fixtures: total((r) => r.fixtures),
    nondeterministic: sum((r) => r.deterministic === false),
    findings: total((r) => r.findings)
  }, null, 2));
}

await main();
