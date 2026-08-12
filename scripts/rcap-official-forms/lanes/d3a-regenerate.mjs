// Lane D3A — first build of the official-form packages for CO, TX, ND, NH, MO.
//
// These five states had no package root at the D0 base: no directories, no
// source records, no index entries. So this is not a regeneration of an
// existing corpus but the establishment of one, from the Edition 1 source pack
// whose STATE_MANIFEST.csv is the identity authority.
//
// The driver deliberately does NOT go through scripts/implement-rcap-official-
// forms-d1.mjs. That script reads and rewrites the two shared indexes, and
// seven lanes run concurrently against them; it also does not list these
// states. Instead the D0 factory modules are driven directly, and the lane
// writes a per-state `state-index.json` for the captain to merge.
//
// Every decision here is fail-closed. A field is written only when D0's typed
// binder says it may be, the value is backed by an exact fact, and the fitted
// result stays above the readable floor. Everything else is refused and the
// refusal is recorded, because a refusal a reviewer cannot see is
// indistinguishable from an omission.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import {
  finalizeOfficialForm,
  finalizeFlatOverlay,
  NonFilingHoldError
} from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, visibleTextOfDocument, missingExpectedValues } from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, StandardFonts } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");

export const LANE = "D3A";
export const FACTORY_VERSION = "d0-remediated-v1";

// --- lane scope -------------------------------------------------------------
export const STATES = {
  CO: { slug: "colorado", name: "Colorado", profile: "CO-colorado" },
  TX: { slug: "texas", name: "Texas", profile: "TX-texas" },
  ND: { slug: "north-dakota", name: "North Dakota", profile: "ND-north-dakota" },
  NH: { slug: "new-hampshire", name: "New Hampshire", profile: "NH-new-hampshire" },
  MO: { slug: "missouri", name: "Missouri", profile: "MO-missouri" }
};

// --- CSV --------------------------------------------------------------------
// The manifest is RFC4180 with embedded commas, quotes and newlines in the
// notes columns, so a split(",") would silently misalign every later column.
export function parseCsv(text) {
  const t = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') { cur += '"'; i += 1; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\r") { /* normalized away */ }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, value);
};
const writeBytes = (p, bytes) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, bytes);
};

// --- fixture fact sets ------------------------------------------------------
//
// Synthetic throughout. The phone block is the 555-01xx range reserved for
// fiction and the mail domain is the reserved example.com, so no fixture can
// resolve to a real person. County and court values are ordinary place names
// used as test data; they assert no venue rule, and the profile's own legal
// design remains the only authority on where anything is actually filed.
// The court value is written to match the shape of the field that asks for it —
// a numbered circuit or named judicial district rather than the bare words a
// blank form already prints, so that finding the value in the finalized
// artifact proves the fill and not the form's own letterhead.
const FIXTURE_PLACES = {
  CO: { county: "Denver", city: "Denver", zip: "80202", court: "Second Judicial District" },
  TX: { county: "Travis", city: "Austin", zip: "78701", court: "353rd Judicial District" },
  ND: { county: "Burleigh", city: "Bismarck", zip: "58501", court: "South Central Judicial District" },
  NH: { county: "Merrimack", city: "Concord", zip: "03301", court: "Sixth Circuit District Division" },
  MO: { county: "Greene", city: "Springfield", zip: "65806", court: "31st Judicial Circuit" }
};

export function canonicalFacts(st) {
  const p = FIXTURE_PLACES[st];
  return {
    "participant.full_legal_name": "Marion T. Ellsworth",
    "participant.first_name": "Marion",
    "participant.middle_name": "Tobias",
    "participant.last_name": "Ellsworth",
    "participant.date_of_birth": "1988-04-17",
    "participant.street_address": "418 Sycamore Ridge Road",
    "participant.city": p.city,
    "participant.state": st,
    "participant.zip": p.zip,
    "participant.city_state_zip": `${p.city}, ${st} ${p.zip}`,
    "participant.phone": "555-0142",
    "participant.email": "marion.ellsworth@example.com",
    // Deterministic rather than participant-supplied: the date the packet is
    // generated. Pinned in the fixture so two renders stay byte-identical.
    "deterministic.filing_date": "2026-08-12",
    "matter.county": p.county,
    "matter.court": p.court,
    "matter.case_number": "2023CR004182",
    "matter.citation_number": "C-2023-77140",
    "matter.charge": "Criminal trespass, second degree",
    "matter.arrest_date": "2023-03-09",
    "matter.offense_date": "2023-03-08",
    "matter.conviction_date": "2023-09-14",
    "matter.disposition_date": "2023-09-14",
    "matter.charges": [
      {
        case_number: "2023CR004182",
        citation_number: "C-2023-77140",
        charge: "Criminal trespass, second degree",
        arrest_date: "2023-03-09",
        offense_date: "2023-03-08",
        conviction_date: "2023-09-14",
        disposition_date: "2023-09-14"
      },
      {
        case_number: "2024CR000917",
        citation_number: "C-2024-10233",
        charge: "Possession of drug paraphernalia",
        arrest_date: "2024-01-22",
        offense_date: "2024-01-22",
        conviction_date: "2024-06-03",
        disposition_date: "2024-06-03"
      }
    ]
  };
}

// The boundary set exists to drive the fitter into its shrink and refusal
// branches against real widget geometry, so the values are deliberately far
// longer than any widget on these forms was drawn to hold.
export function boundaryFacts(st) {
  const p = FIXTURE_PLACES[st];
  const longName = "Maximiliana Aurelia Featherstonehaugh-Wintersgill de la Concepcion";
  return {
    ...canonicalFacts(st),
    "participant.full_legal_name": longName,
    "participant.first_name": "Maximiliana Aurelia",
    "participant.last_name": "Featherstonehaugh-Wintersgill de la Concepcion",
    "participant.street_address": "14827 North Meadowbrook Commons Professional Plaza, Building C, Suite 2200",
    "participant.city_state_zip": `${p.city} Metropolitan Statistical Area, ${st} ${p.zip}-4417`,
    "participant.email": "maximiliana.featherstonehaugh.wintersgill@example.com",
    "matter.case_number": "2023CR004182-CONSOLIDATED-WITH-2023CR004183-AND-2023CR004184",
    "matter.charge": "Criminal trespass in the second degree, together with the lesser included offense charged in the alternative"
  };
}

export const negativeFacts = () => ({});

// --- ownership and render strategy -----------------------------------------
//
// Ownership decides whether anything may be written at all, and it is decided
// from the manifest's own document_role and asset_class rather than from the
// shape of the binary: a form is not participant-completed because it happens
// to carry text widgets.
const COURT_ISSUED_ROLES = new Set(["ORDER", "JUDGMENT", "DECREE"]);

export function classifyDocument(row, observed) {
  const role = String(row.document_role || "").toUpperCase();
  const assetClass = String(row.asset_class || "");
  const textLike = observed.textLikeFieldCount ?? 0;

  if (COURT_ISSUED_ROLES.has(role)) {
    return {
      ownership: "court_issued_order",
      componentRole: "court_order_component_never_participant_filed",
      documentAcceptsFill: false,
      captionOnly: true,
      renderStrategy: "none_court_issued",
      reason:
        "The manifest gives this document the role of a court order. The court, not the participant, completes it, so the lane writes nothing into it at all rather than relying on the caption-only path to hold the line."
    };
  }
  if (assetClass === "instructions") {
    return {
      ownership: "reference_document",
      componentRole: "participant_reference_never_filed_as_completed",
      documentAcceptsFill: false,
      captionOnly: false,
      renderStrategy: "none_reference",
      reason: "Instruction and guide material is read, not filed, so it is inventoried and censused but never filled."
    };
  }
  if (role === "INSTRUCTIONS" && textLike === 0) {
    return {
      ownership: "reference_document",
      componentRole: "participant_reference_never_filed_as_completed",
      documentAcceptsFill: false,
      captionOnly: false,
      renderStrategy: "none_reference",
      reason:
        "Carries the instructions role and no writable widget of any kind; it is a research or process guide rather than a form."
    };
  }
  return {
    ownership: "participant_completed",
    componentRole: "participant_completed_filing",
    documentAcceptsFill: true,
    captionOnly: false,
    renderStrategy: textLike > 0 ? "acroform_fill" : "flat_overlay",
    reason: "Participant-completed filing: participant and deterministic fields may bind; every other class stays blank."
  };
}

// --- explicit mappings ------------------------------------------------------
//
// D0's binder refuses the legally sensitive descriptors (the charge itself and
// the dates that describe the criminal event) unless the caller names the exact
// field. That escape hatch is used only where first-hand inspection of the
// binary showed the field is the participant's own transcription of their own
// record, on a participant-completed filing, and an exact fact backs it.
//
// Each entry carries the rationale that authorized it. A field absent from this
// table stays blank, which is the intended default.
export const EXPLICIT_MAPPING_RULES = [
  {
    states: ["ND"],
    documents: ["ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA"],
    match: /^Offense(_\d+)?$/,
    factId: "matter.charge",
    rationale:
      "The offence columns of the applicant's own offence table on a participant-completed pardon application. Each row resolves to that row's indexed charge; the judge, prosecutor and defence columns beside them stay protected."
  },
  {
    states: ["MO"],
    documents: ["CR360", "CR375"],
    match: /^Description of ChargeRow\d+$/,
    factId: "matter.charge",
    rationale:
      "The participant's own description of the charge they are asking to have expunged, in an explicitly numbered table row. The row index resolves to that row's indexed charge, so a row with no charge stays blank."
  }
];

export function explicitMappingsFor(st, documentId, fieldNames = []) {
  const flat = {};
  const table = {};
  for (const rule of EXPLICIT_MAPPING_RULES) {
    if (!rule.states.includes(st)) continue;
    if (rule.documents && !rule.documents.includes(documentId)) continue;
    for (const name of fieldNames) {
      if (!rule.match.test(name)) continue;
      flat[name] = rule.factId;
      table[name] = { factId: rule.factId, rationale: rule.rationale };
    }
  }
  return { flat, table };
}

// --- reviewed withholdings --------------------------------------------------
//
// The inverse of an explicit mapping. D0's binder decides from a field's name,
// and a name can match an allowlisted descriptor while the field's actual
// subject is something else: a case table's "City or County" column is the
// venue of that case, not where the participant lives. The binder would write a
// correct value into the wrong statement.
//
// D0 already provides the mechanism. When the caller names a field with a fact
// the field's own name does not resolve to, `decideBinding` fails closed with
// `explicit_mapping_conflicts_with_field_name`. Declaring what the field really
// means is therefore enough to keep it blank, and nothing in the shared binder
// has to be weakened to do it.
export const WITHHOLD = "withheld.subject_not_supplied_by_an_allowlisted_fact";

// Each rule below was written after reading the field in its own form, not
// from its name alone.
export const WITHHOLDING_RULES = [
  {
    states: ["CO"],
    match: /^Court Address$/,
    rationale:
      "The caption block's court address: the address of the court the motion is filed in, not the participant's. The binder reaches it through the street-address descriptor's general '\\baddress\\b' alternative."
  },
  {
    states: ["CO"],
    match: /^CoS_/,
    rationale:
      "Certificate-of-service block. These name the party the filing is served on — in these forms the prosecuting attorney — and never the participant."
  },
  {
    states: ["ND"],
    documents: ["EXPERTISE"],
    match: /^Email Address$/,
    rationale:
      "The binder resolves this to participant.street_address because the street-address descriptor's '\\baddress\\b' alternative is listed ahead of the email descriptor, so the field would receive a street address. Withheld rather than mis-filled; recorded as a descriptor-ordering finding against the shared binder."
  },
  {
    states: ["ND"],
    documents: ["ND-NORTH-DAKOTA-PARDON-ADVISORY-BOARD-APPLICA"],
    match: /^Work Telephone Number$/,
    rationale:
      "The applicant supplies one telephone number. Writing it here asserts that it is their work number, which no supplied fact establishes."
  },
  {
    states: ["NH"],
    documents: ["NHJB-2956"],
    match: /^(Mailing Address1|address)$/,
    rationale:
      "A criminal-record release authorization carries both the subject's address and the address the record is released to. The form does not determine which of these two fields is which, and releasing a record to the wrong address is not a recoverable error."
  },
  {
    states: ["MO"],
    match: /^County\/City of St\. Louis$/,
    rationale:
      "The caption's venue selector — the circuit's county or the City of St. Louis — not the participant's city of residence."
  },
  {
    states: ["MO"],
    match: /^r? ?Other Name\/Address$/,
    rationale:
      "Other names and addresses the participant has used. It calls for aliases and former addresses, so the current address the binder would write is the one value it must not carry."
  },
  {
    states: ["MO"],
    documents: ["CR300"],
    match: /^Address at Time of Arrest$/,
    rationale:
      "The address held at the time of the arrest, which is a historical fact; the current street address is not evidence of it."
  },
  {
    states: ["MO"],
    documents: ["CR300"],
    match: /^(Defendant Full Name|Date of Birth Defendant)$/,
    rationale:
      "CR300 corrects an arrest or court record after identity theft. Its petitioner is the person whose identity was used and its named defendant is the person the record identifies, so the petitioner's own name and date of birth are precisely the values that must not appear here."
  },
  {
    states: ["MO"],
    documents: ["CR300"],
    match: /^(SSN Defendant|Driver's License Number Defendant)$/,
    rationale:
      "Identifier fields that the binder resolves through the '\\bdefendant\\b' alternative of the full-name descriptor, so a name would be written into a social-security or licence-number field."
  },
  {
    states: ["MO"],
    documents: ["CR360"],
    match: /^Previous Expungement Court and Case Number$/,
    rationale:
      "The case number of an earlier expungement proceeding, not of the matter being petitioned; the two are different cases."
  },
  {
    states: ["MO"],
    documents: ["CR360"],
    match: /^d L number\/issuing state$/,
    rationale:
      "One field carrying both a driver's licence number and its issuing state. No single supplied fact fills it, and the state alone would read as the whole answer."
  }
];

export function curatedWithholdingsFor(st, documentId, fieldNames = []) {
  const out = {};
  for (const rule of WITHHOLDING_RULES) {
    if (!rule.states.includes(st)) continue;
    if (rule.documents && !rule.documents.includes(documentId)) continue;
    for (const name of fieldNames) if (rule.match.test(name)) out[name] = rule.rationale;
  }
  return out;
}

// Facts that describe one row of a charge table. A slot inside a repeating
// table may carry one of these and nothing else.
const ROW_SCALAR_FACTS = new Set([
  "matter.case_number", "matter.citation_number", "matter.charge",
  "matter.arrest_date", "matter.offense_date", "matter.conviction_date", "matter.disposition_date"
]);
const isRowFact = (factId) => /^matter\.charges\[\d+\]\./.test(String(factId)) || ROW_SCALAR_FACTS.has(factId);

const groupBaseOf = (name) => String(name).replace(/[_\s-]?\d{1,2}$/, "").trim();

const COORD_TOLERANCE = 3;

/**
 * Decides whether a set of same-base fields is one multi-slot construct rather
 * than the same value asked for twice in different places.
 *
 * A name cannot tell these apart — Texas names its petitioner field `Name` and
 * `Name2` on one page, and Missouri names a nine-row table column
 * `Court NameRow1..9` — but geometry can. The slots of a construct line up:
 * a table column shares an x, a name split into parts shares a y, and stacked
 * address lines share an x. Fields that are merely the same value asked for
 * again sit at unrelated coordinates.
 */
export function isCompositionalGroup(fields) {
  const placed = fields.map((f) => f.widgets?.[0]).filter((w) => w && w.page !== null);
  if (placed.length < 2) return false;
  const byPage = new Map();
  for (const w of placed) {
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push(w);
  }
  for (const widgets of byPage.values()) {
    if (widgets.length < 2) continue;
    const spread = (vals) => Math.max(...vals) - Math.min(...vals);
    const sameColumn = spread(widgets.map((w) => w.rect.x)) <= COORD_TOLERANCE;
    const sameRow = spread(widgets.map((w) => w.rect.y)) <= COORD_TOLERANCE;
    if (sameColumn || sameRow) return true;
  }
  return false;
}

/**
 * Finds multi-slot constructs and the slots inside them that would receive the
 * same fact more than once.
 *
 * Requirement: a repeating row is written only from that row's own indexed
 * fact. So a slot whose fact is not row-scoped, or whose fact another slot in
 * the same construct would also receive, is withheld — stamping row three with
 * row one's value, or writing a whole name into each of the four boxes that
 * together spell it, is the defect this prevents.
 */
export function repeatingRowWithholdings(census, decide) {
  const groups = new Map();
  for (const f of census.fields) {
    const base = groupBaseOf(f.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(f);
  }
  const withheld = {};
  for (const [base, members] of groups) {
    const indexed = members.some((f) => groupBaseOf(f.name) !== f.name);
    if (members.length < 2 || !indexed) continue;
    if (!isCompositionalGroup(members)) continue;
    const bound = members
      .map((f) => ({ name: f.name, decision: decide(f.name) }))
      .filter((x) => x.decision.writable);
    const seen = new Map();
    for (const b of bound) seen.set(b.decision.factId, (seen.get(b.decision.factId) ?? 0) + 1);
    for (const b of bound) {
      if (!isRowFact(b.decision.factId)) {
        withheld[b.name] = `Slot in the aligned multi-slot construct '${base}', but '${b.decision.factId}' is not scoped to a slot; every slot of the construct would receive the same value.`;
      } else if (seen.get(b.decision.factId) > 1) {
        withheld[b.name] = `Slot in the aligned multi-slot construct '${base}' sharing fact '${b.decision.factId}' with another slot; which slot it belongs to is not determined.`;
      }
    }
  }
  return withheld;
}

// A mechanical withholding that first-hand review cleared. Only the mechanical
// rule can be exempted; a curated withholding is a decision, not a heuristic.
export const WITHHOLDING_EXEMPTIONS = [
  {
    states: ["NH"],
    documents: ["NHJB-2317", "NHJB-3056", "NHJB-3057", "NHJB-3124"],
    match: /^Mailing Address\.1$/,
    rationale:
      "The two mailing-address boxes are stacked at one margin, so the geometric test reads them as one construct. They are the petitioner's own address lines, and the first is the wide street line — 340pt against the second's 156pt. The street address is written there and the narrower second line is left blank, because no supplied fact says what belongs on it."
  }
];

export function withholdingExemptionsFor(st, documentId, fieldNames = []) {
  const out = {};
  for (const rule of WITHHOLDING_EXEMPTIONS) {
    if (!rule.states.includes(st)) continue;
    if (rule.documents && !rule.documents.includes(documentId)) continue;
    for (const name of fieldNames) if (rule.match.test(name)) out[name] = rule.rationale;
  }
  return out;
}

// --- census -----------------------------------------------------------------
export function pdfTypeOf(field) {
  const n = field.constructor.name;
  if (n === "PDFTextField") return "text";
  if (n === "PDFDropdown") return "dropdown";
  if (n === "PDFCheckBox") return "checkbox";
  if (n === "PDFRadioGroup") return "radio";
  if (n === "PDFOptionList") return "optionlist";
  if (n === "PDFButton") return "button";
  if (n === "PDFSignature") return "signature";
  return n.replace(/^PDF/, "").toLowerCase();
}

export function censusOf(pdfDoc) {
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.tag, i + 1]));
  const fields = [];
  for (const field of form.getFields()) {
    const type = pdfTypeOf(field);
    const widgets = [];
    for (const w of field.acroField.getWidgets()) {
      const r = w.getRectangle();
      let page = null;
      try {
        const pRef = w.P();
        if (pRef) page = pageIndexOf.get(pRef.tag) ?? null;
      } catch { page = null; }
      if (page === null) {
        // Some widgets omit /P; the page that lists the annotation is then the
        // only honest source for its page number.
        for (let i = 0; i < pages.length; i += 1) {
          const annots = pages[i].node.Annots?.();
          if (!annots) continue;
          for (let k = 0; k < annots.size(); k += 1) {
            if (annots.get(k)?.tag === w.dict.context.getObjectRef?.(w.dict)?.tag) { page = i + 1; break; }
          }
          if (page !== null) break;
        }
      }
      widgets.push({
        page,
        rect: {
          x: Number(r.x.toFixed(2)),
          y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)),
          height: Number(r.height.toFixed(2))
        }
      });
    }
    const entry = { name: field.getName(), type, widgets };
    entry.maxLength = field instanceof PDFTextField ? (field.getMaxLength() ?? null) : null;
    entry.multiline = field instanceof PDFTextField ? field.isMultiline() === true : false;
    if (field instanceof PDFDropdown) entry.options = field.getOptions();
    if (field instanceof PDFTextField) {
      entry.readOnly = field.isReadOnly() === true;
      entry.richText = field.isRichFormatted() === true;
    }
    fields.push(entry);
  }
  return {
    fields,
    textLikeFieldCount: fields.filter((f) => f.type === "text" || f.type === "dropdown").length,
    richTextFields: fields.filter((f) => f.richText === true).map((f) => f.name),
    pageGeometry: pages.map((p, i) => {
      const { width, height } = p.getSize();
      return {
        page: i + 1,
        width: Number(width.toFixed(2)),
        height: Number(height.toFixed(2)),
        orientation: width > height ? "landscape" : "portrait"
      };
    })
  };
}

// --- classification ---------------------------------------------------------
//
// The nine-class vocabulary the D1 packages use, derived from D0's decision so
// the classification and the binding can never disagree.
export function classifyFields(census, ctx) {
  const entries = [];
  const counts = {};
  for (const f of census.fields) {
    const decision = decideBinding(
      { name: f.name, pdfType: f.type, effectiveLabel: null },
      {
        explicitMappings: ctx.explicitMappings,
        captionOnly: ctx.captionOnly,
        availableChargeRows: ctx.availableChargeRows,
        documentAcceptsFill: ctx.documentAcceptsFill
      }
    );
    let cls;
    if (decision.writable) cls = decision.factId.startsWith("deterministic.") ? "deterministic" : "participant";
    else if (decision.reason === "protected_category") cls = decision.category === "signature" ? "signature" : "protected";
    else if (decision.category === "type_guard") cls = "election_control";
    else if (decision.category === "sensitive_fact") cls = "protected";
    else if (decision.category === "mapping_conflict") cls = "withheld_by_review";
    else if (decision.category === "charge_row") cls = "unused_row";
    else if (decision.reason === "document_does_not_accept_fill") cls = "not_participant_writable";
    else cls = "manual";
    counts[cls] = (counts[cls] ?? 0) + 1;
    entries.push({ name: f.name, type: f.type, class: cls, decision: decision.reason ?? "writable", factId: decision.factId ?? null });
  }
  return { entries, counts };
}

// --- flat-form anchor capture ----------------------------------------------
//
// A flat form has no widgets, so the only honest write box is one the document
// itself draws: a contiguous run of underscore glyphs on a text line. Anything
// else would mean inventing a coordinate, which is exactly what a filing must
// not contain.
const MIN_RULE_CHARS = 4;

export function captureRuleAnchors(pdfDoc) {
  const anchors = [];
  pdfDoc.getPages().forEach((page, pageIndex) => {
    for (const line of groupIntoLines(extractTextItems(page))) {
      const chars = line.chars ?? [];
      let start = -1;
      let run = 0;
      const flush = (endIdx) => {
        if (run < MIN_RULE_CHARS) return;
        const a = chars[start];
        const b = chars[endIdx];
        const before = chars.slice(0, start).map((c) => c.c).join("").trim();
        const label = before.replace(/[:\s_]+$/, "").trim();
        anchors.push({
          page: pageIndex + 1,
          label,
          lineText: line.text,
          writeBox: {
            x: Number(a.x.toFixed(2)),
            y: Number(line.y.toFixed(2)),
            width: Number((b.x + b.w - a.x).toFixed(2)),
            height: Number(Math.max(line.size || 10, 8).toFixed(2))
          },
          fontSize: line.size || 10,
          ruleChars: run
        });
      };
      chars.forEach((c, k) => {
        if (c.c === "_") { if (run === 0) start = k; run += 1; }
        else { flush(k - 1); run = 0; }
      });
      flush(chars.length - 1);
    }
  });
  return anchors;
}

// --- per-family build -------------------------------------------------------
export function familySlug(row) {
  const id = String(row.document_id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const folder = String(row.canonical_relative_path || "");
  let suffix = "form";
  if (folder.includes("/03_INSTRUCTIONS/")) suffix = "instructions";
  else if (folder.includes("/04_SUPPORTING_PROCESS/")) suffix = "support";
  else if (folder.includes("/05_SOURCE_GATED/")) suffix = "source-gated";
  const role = String(row.document_role || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const lang = String(row.language || "en").toLowerCase();
  return `${id}-${suffix}-${role}-${lang}`.replace(/-+/g, "-");
}

function productionHoldsFor(row, stateHolds, cls, extra) {
  const holds = new Set([
    "edition_1_runtime_disabled",
    "f_independent_visual_review_required",
    "d3a_lane_output_not_self_approved"
  ]);
  if (row.generation_allowed !== "yes") holds.add("state_manifest_generation_allowed_no");
  if (row.packet_candidate !== "yes") holds.add("manifest_not_a_packet_candidate");
  if (String(row.source_status).includes("source_gated")) holds.add("source_gated_never_runtime_selectable");
  if (row.freshness_status === "revision_confirmation_required") holds.add("revision_confirmation_required");
  if (row.freshness_status === "source_or_currentness_gate_open") holds.add("source_or_currentness_gate_open");
  if (row.legal_review_mapping_status === "requires_track-level import mapping") holds.add("track_level_import_mapping_required");
  for (const h of stateHolds) holds.add(h);
  for (const h of extra) holds.add(h);
  return [...holds].sort();
}

export async function buildFamily(opts) {
  const { st, row, packRoot, outDir, stateHolds, availableChargeRows } = opts;
  const info = STATES[st];
  const slug = familySlug(row);
  const familyDir = path.join(outDir, slug);
  const rel = row.canonical_relative_path;
  const abs = path.join(packRoot, rel);
  const findings = [];

  const result = {
    st, slug, documentId: row.document_id, documentRole: row.document_role,
    familyDir, findings,
    hashVerified: false, filled: false, contactSheet: false,
    fieldsInventoried: 0, bound: 0, refused: 0, unfittable: 0, protectedCount: 0,
    canonicalFixtures: 0, boundaryFixtures: 0, negativeFixtures: 0,
    finalizedPdfs: 0, nonFilingHold: false, renderStrategy: "none"
  };

  if (!fs.existsSync(abs)) {
    findings.push({ severity: "blocker", finding: "source_binary_absent_from_pack", detail: rel });
    result.absent = true;
    return result;
  }

  const bytes = fs.readFileSync(abs);
  const observedSha = sha256(bytes);
  const hashMatches = observedSha === row.sha256;
  const byteLengthMatches = String(bytes.length) === String(row.bytes);
  result.hashVerified = hashMatches;
  if (!hashMatches) {
    findings.push({
      severity: "blocker",
      finding: "source_sha256_mismatch",
      detail: `manifest ${row.sha256}, delivered ${observedSha}`
    });
  }
  if (!byteLengthMatches) {
    findings.push({
      severity: "blocker",
      finding: "source_byte_length_mismatch",
      detail: `manifest ${row.bytes}, delivered ${bytes.length}`
    });
  }

  const isPdf = rel.toLowerCase().endsWith(".pdf");
  const declaredPages = row.pages === "" ? null : Number(row.pages);
  const declaredFieldCount = row.field_count === "" ? null : Number(row.field_count);

  // --- open the binary -----------------------------------------------------
  let pdfDoc = null;
  let census = null;
  let traversable = false;
  let loadError = null;
  if (isPdf && hashMatches) {
    try {
      pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      census = censusOf(pdfDoc);
      traversable = true;
    } catch (err) {
      loadError = err.message;
      findings.push({
        severity: "blocker",
        finding: "binary_not_traversable_by_factory_loader",
        detail: `${err.message.slice(0, 180)} — inventoried by identity only; no census, classification or fill is claimed.`
      });
    }
  } else if (!isPdf) {
    findings.push({
      severity: "note",
      finding: "source_is_not_a_pdf",
      detail: `structural class '${row.structural_class}'; inventoried by identity only, outside the PDF factory's scope.`
    });
  }

  const observedFieldCount = census ? census.fields.length : null;
  const observedPages = census ? census.pageGeometry.length : null;
  const structuralClassObserved = !isPdf
    ? `${row.structural_class}_not_pdf`
    : !traversable
      ? "pdf_not_traversable"
      : observedFieldCount > 0 ? "acroform" : "flat_pdf";

  if (traversable && declaredFieldCount !== null && observedFieldCount !== declaredFieldCount) {
    findings.push({
      severity: "fidelity",
      finding: "manifest_field_count_differs_from_binary",
      detail: `manifest declares ${declaredFieldCount}, first-hand census of the hash-verified binary reads ${observedFieldCount}. The binary governs the census; the manifest governs identity.`
    });
  }
  if (traversable && declaredPages !== null && observedPages !== declaredPages) {
    findings.push({
      severity: "fidelity",
      finding: "manifest_page_count_differs_from_binary",
      detail: `manifest declares ${declaredPages}, binary has ${observedPages}.`
    });
  }
  const declaredStructural = row.structural_class;
  const structuralAgrees = !traversable
    ? null
    : (declaredStructural === "acroform_pdf" && structuralClassObserved === "acroform")
      || (declaredStructural === "flat_pdf" && structuralClassObserved === "flat_pdf");
  if (structuralAgrees === false) {
    findings.push({
      severity: "fidelity",
      finding: "manifest_structural_class_differs_from_binary",
      detail: `manifest declares '${declaredStructural}', binary is '${structuralClassObserved}'.`
    });
  }

  const cls = classifyDocument(row, { textLikeFieldCount: census?.textLikeFieldCount ?? 0 });
  result.renderStrategy = traversable ? cls.renderStrategy : "none_not_traversable";
  result.fieldsInventoried = observedFieldCount ?? 0;

  // --- non-filing notice ---------------------------------------------------
  //
  // Read from the document's own text. Requirement is literal: a source that
  // states it must not be completed for filing is refused, not flagged.
  let visibleSourceText = "";
  let textExtractable = false;
  if (traversable) {
    try {
      visibleSourceText = visibleTextOfDocument(pdfDoc);
      textExtractable = true;
    } catch (err) {
      findings.push({
        severity: "note",
        finding: "source_text_layer_not_extractable",
        detail: `${err.message.slice(0, 140)} — the non-filing scan and visibility proof fall back to refusing any fill for this family.`
      });
    }
  }
  const NON_FILING = /do\s*not\s*complete\s*this\s*form\s*for\s*filing/i;
  const noticeMatch = textExtractable ? visibleSourceText.match(new RegExp(`.{0,120}${NON_FILING.source}.{0,120}`, "is")) : null;
  const nonFilingNotice = noticeMatch ? noticeMatch[0].replace(/\s+/g, " ").trim() : null;
  result.nonFilingHold = Boolean(nonFilingNotice);

  const fieldNames = census ? census.fields.map((f) => f.name) : [];
  const { flat: reviewedMappings, table: explicitTable } = explicitMappingsFor(st, row.document_id, fieldNames);

  // --- withholdings --------------------------------------------------------
  //
  // Computed against the binder's own unwithheld decisions, so the record shows
  // what the generic binder would have written and why the lane declined it.
  const curatedWithholdings = curatedWithholdingsFor(st, row.document_id, fieldNames);
  let rowWithholdings = {};
  if (census && cls.documentAcceptsFill) {
    rowWithholdings = repeatingRowWithholdings(census, (name) => {
      const f = census.fields.find((x) => x.name === name);
      return decideBinding(
        { name, pdfType: f.type, effectiveLabel: null },
        { explicitMappings: reviewedMappings, captionOnly: cls.captionOnly, availableChargeRows, documentAcceptsFill: true }
      );
    });
  }
  const exemptions = withholdingExemptionsFor(st, row.document_id, fieldNames);
  for (const field of Object.keys(exemptions)) delete rowWithholdings[field];
  const withholdingRationale = { ...rowWithholdings, ...curatedWithholdings };
  // A reviewed mapping is an authorization and outranks a withholding.
  for (const field of Object.keys(reviewedMappings)) delete withholdingRationale[field];

  const withholdingMap = {};
  for (const field of Object.keys(withholdingRationale)) withholdingMap[field] = WITHHOLD;
  const explicitMappings = { ...reviewedMappings, ...withholdingMap };

  if (Object.keys(withholdingRationale).length > 0) {
    writeJson(path.join(familyDir, "reports/reviewed-withholdings.json"), {
      schemaVersion: "rcap-reviewed-withholdings/v1",
      basis: "the field is named with a fact its own name does not resolve to, so D0's binder fails closed with explicit_mapping_conflicts_with_field_name; no protection was weakened and the shared binder was not edited",
      count: Object.keys(withholdingRationale).length,
      withheld: Object.entries(withholdingRationale).map(([field, rationale]) => ({ field, rationale })),
      exemptions: Object.entries(exemptions).map(([field, rationale]) => ({ field, rationale }))
    });
  }

  // --- classification ------------------------------------------------------
  let classification = null;
  const bindCtx = {
    explicitMappings,
    captionOnly: cls.captionOnly,
    availableChargeRows,
    documentAcceptsFill: cls.documentAcceptsFill
  };
  if (census) {
    classification = classifyFields(census, bindCtx);
    result.protectedCount = census.fields.length - classification.entries.filter((e) => e.class === "participant" || e.class === "deterministic").length;
  }

  // --- decide whether a fill is attempted ----------------------------------
  const extraHolds = [];
  if (!cls.documentAcceptsFill) extraHolds.push("not_participant_fillable_no_fixture_fill");
  if (!traversable) extraHolds.push("binary_not_traversable_no_fixture_fill");
  if (nonFilingNotice) extraHolds.push("non_filing_notice_on_source_face");
  if (!hashMatches) extraHolds.push("source_identity_unverified_no_fixture_fill");

  let attemptFill = cls.documentAcceptsFill && traversable && hashMatches;
  let anchors = [];
  let anchorEvidence = null;

  // A rich-text AcroForm field cannot be read back by pdf-lib, and D0's
  // sanitizer regenerates every field's appearance before it flattens, so one
  // such field anywhere on the form aborts the whole artifact. The lane will
  // not reach into the shared factory to route around it and will not rewrite
  // the source to clear the flag, because the source is the thing being
  // certified. The family is inventoried and left unfilled, and the gap is
  // reported as a defect in the shared factory rather than in this state.
  if (attemptFill && (census?.richTextFields?.length ?? 0) > 0) {
    attemptFill = false;
    extraHolds.push("d0_factory_cannot_finalize_rich_text_acroform");
    findings.push({
      severity: "blocker",
      finding: "source_carries_rich_text_field_d0_factory_cannot_finalize",
      detail: `Rich-text field(s) ${census.richTextFields.map((n) => `'${n}'`).join(", ")}. pdf-lib throws RichTextFieldReadError from updateFieldAppearances inside sanitizeAndFlatten, so no finalized artifact can be produced for this family until the shared factory handles rich-text fields. No fill is claimed and the source was not modified.`
    });
  }

  if (attemptFill && cls.renderStrategy === "flat_overlay") {
    anchors = captureRuleAnchors(pdfDoc);
    // Every candidate rule is put through the same binder the fill would use,
    // so the record shows what would have been written and why it was not.
    const reviewed = anchors.map((a) => {
      const decision = decideBinding(
        { name: a.label, pdfType: "text", effectiveLabel: a.label },
        { captionOnly: cls.captionOnly, availableChargeRows }
      );
      return { ...a, binderDecision: decision };
    });
    const wouldBind = reviewed.filter((a) => a.binderDecision.writable);
    // A rule the binder would write is not thereby a rule it should write: the
    // label that sits left of the rule names the blank only when the two belong
    // to the same statement. On these sources the writable candidates sit in
    // appeal-history blocks, where matter.case_number and the filing date would
    // both carry the wrong fact onto a court filing.
    anchorEvidence = {
      schemaVersion: "rcap-flat-anchor-evidence/v1",
      basis: "contiguous underscore rule runs measured from the page content stream; no coordinate is synthesized",
      minimumRuleChars: MIN_RULE_CHARS,
      candidatesFound: reviewed.length,
      candidatesTheBinderWouldWrite: wouldBind.length,
      reviewedDisposition: "withheld",
      rationale:
        "Every measurable rule on this source either carries no allowlisted descriptor or sits in a block whose subject differs from the descriptor that matches its label. Writing them would place a correct value in the wrong statement, so the lane produces no overlay fill and leaves these blanks to a human.",
      candidates: reviewed.map((a) => ({
        page: a.page,
        label: a.label,
        lineText: a.lineText,
        writeBox: a.writeBox,
        ruleChars: a.ruleChars,
        binderWouldWrite: a.binderDecision.writable === true,
        binderFactId: a.binderDecision.factId ?? null,
        binderRefusalReason: a.binderDecision.reason ?? null
      }))
    };
    attemptFill = false;
    extraHolds.push("flat_overlay_anchors_reviewed_and_withheld");
    findings.push({
      severity: "note",
      finding: anchors.length === 0 ? "flat_form_has_no_measurable_rule_anchor" : "flat_form_anchors_withheld_after_review",
      detail: anchorEvidence.rationale
    });
  }

  const productionHolds = productionHoldsFor(row, stateHolds, cls, extraHolds);

  // --- source record -------------------------------------------------------
  const sourceRecord = {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: st,
    jurisdictionName: info.name,
    documentId: row.document_id,
    documentRole: row.document_role,
    assetClass: row.asset_class,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    workflowKey: row.workflow_key,
    canonicalBundlePath: rel,
    sourceFilename: row.source_filename,
    sha256: row.sha256,
    sha256Observed: observedSha,
    sha256VerifiedAgainstBundleManifest: hashMatches,
    byteLength: bytes.length,
    bundleDeclaredBytes: row.bytes === "" ? null : Number(row.bytes),
    byteLengthMatches,
    sourceUrl: row.source_url === "" ? null : row.source_url,
    sourceStatus: row.source_status,
    freshnessStatus: row.freshness_status,
    libraryFolder: rel.split("/")[2] ?? null,
    binaryPresent: true,
    lifecycleClassification: String(row.source_status).includes("source_gated")
      ? "binary_present_source_gated"
      : "binary_present_and_current",
    structuralClassObserved,
    structuralClassDeclared: declaredStructural,
    structuralClassAgrees: structuralAgrees,
    declaredFieldCount,
    observedAcroFieldCount: observedFieldCount,
    fieldCountAgrees: declaredFieldCount === null || observedFieldCount === null ? null : declaredFieldCount === observedFieldCount,
    pageGeometry: census?.pageGeometry ?? null,
    declaredPages,
    observedPages,
    pageCountAgrees: declaredPages === null || observedPages === null ? null : declaredPages === observedPages,
    binaryTraversable: traversable,
    binaryLoadError: loadError,
    textLayerExtractable: textExtractable,
    renderStrategy: attemptFill ? cls.renderStrategy : result.renderStrategy === "none" ? "none" : `${cls.renderStrategy}_not_executed`,
    participantFillable: attemptFill,
    generationAllowed: row.generation_allowed === "yes",
    packetCandidate: row.packet_candidate === "yes",
    runtimeStatus: row.runtime_status,
    productionHolds,
    documentOwnership: cls.ownership,
    componentRole: cls.componentRole,
    ownershipDetermination: cls.reason,
    nonFilingNoticeOnFace: nonFilingNotice,
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    implementationStatus: "implementation_complete_pending_independent_review",
    censusBasis: traversable ? "first_hand_inspection_of_verified_binary" : "identity_only_binary_not_traversable",
    manifestNotes: row.notes === "" ? null : row.notes,
    requiredFollowUp: row.required_follow_up === "" ? null : row.required_follow_up
  };
  writeJson(path.join(familyDir, "source-record.json"), sourceRecord);

  writeJson(path.join(familyDir, "field-classification-policy.json"), {
    schemaVersion: "rcap-field-classification-policy/v2-d0",
    factoryVersion: FACTORY_VERSION,
    basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs — typed fail-closed binder, unmodified",
    everyFieldStartsProtected: true,
    writableRequires: [
      "no protect rule matches the field name or its measured label",
      "the PDF control type is text or dropdown",
      "the name matches exactly one allowlisted fact descriptor",
      "the resolved value matches the descriptor's declared type",
      "a sensitive descriptor was named for this exact field by the caller",
      "an indexed charge row resolves to a charge that was actually supplied"
    ],
    documentAcceptsFill: cls.documentAcceptsFill,
    captionOnly: cls.captionOnly,
    ownership: cls.ownership,
    ownershipDetermination: cls.reason,
    explicitMappings: explicitTable,
    reviewedWithholdings: Object.entries(withholdingRationale).map(([field, rationale]) => ({ field, rationale })),
    protectionsWeakened: false,
    note: "D0's default protections were not altered and rcap-field-semantics.mjs was not edited. Where a genuinely safe participant field was refused by name, it was named through the sanctioned explicitMappings option. Where the binder would have written a correct value into a field whose subject is something else, the field was named with its real subject so the binder fails closed on the conflict."
  });

  if (census) {
    writeJson(path.join(familyDir, "field-census.json"), {
      schemaVersion: "rcap-field-census/v3-first-hand",
      censusBasis: "first_hand_inspection_of_verified_binary",
      sha256: row.sha256,
      structuralClass: structuralClassObserved,
      fieldCount: census.fields.length,
      textLikeFieldCount: census.textLikeFieldCount,
      pageGeometry: census.pageGeometry,
      fields: census.fields
    });
  }
  if (classification) {
    writeJson(path.join(familyDir, "field-classification.json"), {
      schemaVersion: "rcap-field-classification/v4-nine-class",
      factoryVersion: FACTORY_VERSION,
      documentOwnership: cls.ownership,
      ownershipBasis: cls.reason,
      classCounts: classification.counts,
      entries: classification.entries.map((e) => ({ name: e.name, type: e.type, class: e.class }))
    });
  }
  if (anchorEvidence) writeJson(path.join(familyDir, "reports/flat-anchor-evidence.json"), anchorEvidence);

  // --- fixtures (fact level) ----------------------------------------------
  const canonical = canonicalFacts(st);
  const boundary = boundaryFacts(st);
  const negative = negativeFacts();
  const fixtureNote = "Synthetic participant facts. The telephone block is the 555-01xx range reserved for fiction and the mail domain is the reserved example.com, so no fixture resolves to a real person.";
  writeJson(path.join(familyDir, "fixtures/canonical.json"), {
    schemaVersion: "rcap-fixture/v3", level: "participant_fact", fixture: "canonical", note: fixtureNote, facts: canonical
  });
  writeJson(path.join(familyDir, "fixtures/boundary.json"), {
    schemaVersion: "rcap-fixture/v3", level: "participant_fact", fixture: "boundary",
    note: `${fixtureNote} Values are deliberately longer than any widget on this form was drawn to hold, so the fitter's shrink and refusal branches are exercised against real geometry.`,
    facts: boundary
  });
  result.canonicalFixtures = 1;
  result.boundaryFixtures = 1;

  if (!attemptFill) {
    writeJson(path.join(familyDir, "fixtures/negative.json"), {
      schemaVersion: "rcap-negative-fixture/v3",
      level: "participant_fact",
      assertion: "No fill is produced for this family at all, so no field of any class can carry a value.",
      reason: cls.documentAcceptsFill
        ? (traversable ? "fill withheld — see productionHolds" : "binary not traversable by the factory loader")
        : cls.reason,
      documentOwnership: cls.ownership,
      productionHolds,
      unwritableFields: classification ? classification.entries.filter((e) => e.class !== "participant" && e.class !== "deterministic").map((e) => ({ field: e.name, class: e.class })) : []
    });
    result.negativeFixtures = 1;
    if (classification) {
      writeJson(path.join(familyDir, "reports/protected-fields.json"), {
        documentOwnership: cls.ownership,
        wholeDocumentUnwritable: !cls.documentAcceptsFill,
        basis: "typed fail-closed binder",
        unwritableFields: classification.entries.filter((e) => e.class !== "participant" && e.class !== "deterministic").map((e) => ({ field: e.name, class: e.class, reason: e.decision })),
        manualFields: classification.entries.filter((e) => e.class === "manual").map((e) => e.name)
      });
    }
    writeJson(path.join(familyDir, "reports/findings.json"), { schemaVersion: "rcap-family-findings/v1", family: slug, findings });
    writeText(path.join(familyDir, "handoff.md"), handoffMarkdown({ st, info, row, slug, cls, sourceRecord, classification, findings, productionHolds, filled: false, anchorEvidence }));
    result.refused = classification ? classification.entries.filter((e) => e.class !== "participant" && e.class !== "deterministic").length : 0;
    return result;
  }

  // --- non-filing hold is enforced before any fill --------------------------
  if (nonFilingNotice) {
    let held = false;
    try {
      await finalizeOfficialForm({
        sourceBytes: bytes, expectedSha256: row.sha256, census: census.fields, facts: canonical,
        explicitMappings, captionOnly: cls.captionOnly, documentAcceptsFill: cls.documentAcceptsFill,
        nonFilingNotice
      });
    } catch (err) {
      held = err instanceof NonFilingHoldError;
      if (!held) throw err;
    }
    writeJson(path.join(familyDir, "reports/non-filing-hold.json"), {
      schemaVersion: "rcap-non-filing-hold/v1",
      noticeOnFace: nonFilingNotice,
      refusalEnforced: held,
      errorType: "NonFilingHoldError",
      fillProduced: false
    });
    findings.push({ severity: "blocker", finding: "non_filing_notice_enforced", detail: nonFilingNotice });
    writeJson(path.join(familyDir, "reports/findings.json"), { schemaVersion: "rcap-family-findings/v1", family: slug, findings });
    writeText(path.join(familyDir, "handoff.md"), handoffMarkdown({ st, info, row, slug, cls, sourceRecord, classification, findings, productionHolds, filled: false, anchorEvidence }));
    result.negativeFixtures = 1;
    return result;
  }

  // --- render --------------------------------------------------------------
  const renderOpts = {
    sourceBytes: bytes, expectedSha256: row.sha256, census: census.fields,
    explicitMappings, captionOnly: cls.captionOnly, documentAcceptsFill: cls.documentAcceptsFill,
    title: `${row.document_id} — ${row.official_title}`
  };

  const canonicalRender = await finalizeOfficialForm({ ...renderOpts, facts: canonical });
  const boundaryRender = await finalizeOfficialForm({ ...renderOpts, facts: boundary });
  const negativeRender = await finalizeOfficialForm({ ...renderOpts, facts: negative });

  // Determinism: the same facts against the same bytes must produce the same
  // file, or none of the recorded hashes mean anything.
  const canonicalRepeat = await finalizeOfficialForm({ ...renderOpts, facts: canonical });
  const deterministic = canonicalRepeat.report.outputSha256 === canonicalRender.report.outputSha256;
  if (!deterministic) {
    findings.push({ severity: "blocker", finding: "render_not_deterministic", detail: "two renders of identical inputs produced different bytes" });
  }

  writeBytes(path.join(familyDir, "fixtures/canonical-filled.pdf"), canonicalRender.bytes);
  writeBytes(path.join(familyDir, "fixtures/boundary-filled.pdf"), boundaryRender.bytes);
  writeBytes(path.join(familyDir, "fixtures/negative-filled.pdf"), negativeRender.bytes);
  result.finalizedPdfs = 3;
  result.filled = true;
  result.negativeFixtures = 1;

  // --- visibility proof and contact sheet ----------------------------------
  const finalDoc = await PDFDocument.load(canonicalRender.bytes, { ignoreEncryption: true });
  const finalText = visibleTextOfDocument(finalDoc);
  const notVisible = missingExpectedValues(finalText, canonicalRender.report.expectedValues);
  if (notVisible.length > 0) {
    findings.push({ severity: "blocker", finding: "written_value_not_visible_in_artifact", detail: notVisible.join(" | ") });
  }

  let sheetProof = null;
  if (canonicalRender.report.expectedValues.length > 0) {
    const sheet = await buildContactSheet({
      blankBytes: bytes,
      finalizedBytes: canonicalRender.bytes,
      expectedValues: canonicalRender.report.expectedValues,
      heading: `${st} ${row.document_id} — blank (left) vs finalized fill (right)`
    });
    writeBytes(path.join(familyDir, "contact-sheet/blank-vs-filled.pdf"), sheet.bytes);
    writeJson(path.join(familyDir, "contact-sheet/contact-sheet-proof.json"), {
      schemaVersion: "rcap-contact-sheet-proof/v1",
      factoryVersion: FACTORY_VERSION,
      ...sheet.proof
    });
    sheetProof = sheet.proof;
    result.contactSheet = true;
  } else {
    findings.push({
      severity: "note",
      finding: "no_field_bound_no_contact_sheet",
      detail: "The typed binder wrote nothing into this form, so there is no filled panel to depict and no sheet is emitted."
    });
  }

  // --- negative proof: nothing written without facts ------------------------
  const negDoc = await PDFDocument.load(negativeRender.bytes, { ignoreEncryption: true });
  const negText = visibleTextOfDocument(negDoc);
  const squash = (s) => String(s).replace(/\s+/g, "").toLowerCase();
  const blankSquashed = squash(visibleSourceText);
  const negSquashed = squash(negText);
  // A fixture value that the blank form already prints on its own face is not
  // something the renderer leaked. Only a value the source does not carry, yet
  // the fact-free render shows, is evidence of a leak.
  const negativeLeaks = canonicalRender.report.expectedValues.filter((v) => {
    const needle = squash(v);
    return needle.length > 3 && negSquashed.includes(needle) && !blankSquashed.includes(needle);
  });
  // Values a blank form already prints cannot, on their own, prove the fill is
  // visible. This records how much of the visibility proof is independent of
  // the source's own text.
  const expectedValuesAbsentFromBlank = canonicalRender.report.expectedValues
    .filter((v) => squash(v).length > 3 && !blankSquashed.includes(squash(v)));
  if (negativeLeaks.length > 0) {
    findings.push({ severity: "blocker", finding: "negative_fixture_carries_a_value", detail: negativeLeaks.join(" | ") });
  }

  // --- source drift --------------------------------------------------------
  //
  // Perturbing a byte must make the render refuse, or the pinned hash is
  // decorative rather than load-bearing.
  const perturbed = Buffer.from(bytes);
  perturbed[Math.floor(perturbed.length / 2)] ^= 0xff;
  let driftRefused = false;
  let driftMessage = null;
  try {
    await finalizeOfficialForm({ ...renderOpts, sourceBytes: perturbed, facts: canonical });
  } catch (err) {
    driftRefused = /source drift/.test(err.message);
    driftMessage = err.message.slice(0, 160);
  }
  if (!driftRefused) {
    findings.push({ severity: "blocker", finding: "source_drift_not_refused", detail: "a perturbed source binary was accepted" });
  }

  // --- load-bearing mutation tests -----------------------------------------
  const mutations = [];

  // 1. The non-filing hold must refuse even on a form whose face does not carry
  //    the notice, when the caller supplies one.
  let holdRefused = false;
  try {
    await finalizeOfficialForm({ ...renderOpts, facts: canonical, nonFilingNotice: "DO NOT COMPLETE THIS FORM FOR FILING" });
  } catch (err) { holdRefused = err instanceof NonFilingHoldError; }
  mutations.push({
    mutation: "non_filing_notice_supplied",
    expectation: "NonFilingHoldError and no fill",
    held: holdRefused
  });

  // 2. Withdrawing a reviewed mapping must un-bind every sensitive field it
  //    authorized, proving the mapping is what carried them and not a name
  //    match. The withholdings stay in place so this measures one thing.
  const authorizedAndWritten = Object.keys(reviewedMappings)
    .filter((f) => canonicalRender.report.written.some((w) => w.field === f));
  if (Object.keys(reviewedMappings).length > 0) {
    const withoutAuthorization = await finalizeOfficialForm({
      ...renderOpts, facts: canonical, explicitMappings: { ...withholdingMap }
    });
    const stillBound = authorizedAndWritten.filter((f) => withoutAuthorization.report.written.some((w) => w.field === f));
    mutations.push({
      mutation: "reviewed_mappings_withdrawn",
      expectation: "every sensitive field the reviewed mapping authorized stops binding",
      authorizedAndWritten: authorizedAndWritten.length,
      stillBoundAfterWithdrawal: stillBound.length,
      held: stillBound.length === 0
    });
  }

  // 3. Withdrawing a withholding must let the field bind again. Without this
  //    the withholding could be inert and the record would claim a protection
  //    that was doing nothing.
  if (Object.keys(withholdingMap).length > 0) {
    const withoutWithholding = await finalizeOfficialForm({
      ...renderOpts, facts: canonical, explicitMappings: { ...reviewedMappings }
    });
    const recovered = Object.keys(withholdingMap)
      .filter((f) => withoutWithholding.report.written.some((w) => w.field === f));
    mutations.push({
      mutation: "withholdings_withdrawn",
      expectation: "a field the lane withheld binds again once the withholding is removed, proving the withholding is load-bearing",
      withheld: Object.keys(withholdingMap).length,
      boundAfterRemoval: recovered.length,
      held: recovered.length > 0
    });
  }

  // 3. Declaring the document unfillable must write nothing at all.
  const refusedDoc = await finalizeOfficialForm({ ...renderOpts, facts: canonical, documentAcceptsFill: false });
  mutations.push({
    mutation: "document_marked_not_fillable",
    expectation: "no field is written",
    written: refusedDoc.report.written.length,
    held: refusedDoc.report.written.length === 0
  });

  // 4. Caption-only must reduce the written set to caption facts alone.
  const captionDoc = await finalizeOfficialForm({ ...renderOpts, facts: canonical, captionOnly: true });
  mutations.push({
    mutation: "caption_only_enforced",
    expectation: "written set shrinks to caption facts or stays equal when the form only ever carried caption facts",
    writtenCaptionOnly: captionDoc.report.written.length,
    writtenNormal: canonicalRender.report.written.length,
    held: captionDoc.report.written.length <= canonicalRender.report.written.length
  });

  // 5. An empty fact set must write nothing.
  mutations.push({
    mutation: "facts_withheld",
    expectation: "no field is written",
    written: negativeRender.report.written.length,
    held: negativeRender.report.written.length === 0
  });

  const mutationsHeld = mutations.every((m) => m.held);
  if (!mutationsHeld) {
    findings.push({ severity: "blocker", finding: "mutation_test_did_not_hold", detail: mutations.filter((m) => !m.held).map((m) => m.mutation).join(", ") });
  }

  // --- overflow and clipping ------------------------------------------------
  const overflow = [];
  for (const entry of boundaryRender.report.unfittable) {
    overflow.push({
      fixture: "boundary", field: entry.field, check: "refused_below_readable_floor",
      reason: entry.reason, minFontSize: MIN_READABLE_FONT_SIZE,
      requiredWidthAtMin: entry.requiredWidthAtMin ?? null,
      requiredHeightAtMin: entry.requiredHeightAtMin ?? null,
      widget: entry.rect ?? null,
      handling: "left blank in the artifact; recorded for a human"
    });
  }
  // A value can also be refused before the fitter ever runs, when it is longer
  // than the form's own declared /MaxLen. New Hampshire's petitions declare 17
  // characters for "case number" and the boundary value is 60, so the field is
  // correctly left blank -- but the ledger said nothing about it at all, and a
  // ledger that reports only the refusals it happens to know about reads as a
  // clean run.
  //
  // Independent review asked for these to be recorded as refused below the
  // readable floor, with a required width at 6pt. The length gate is the
  // mechanism that actually fires -- the form's declared maximum stops the
  // value before the fitter is reached -- so refusedBelowFloor is correctly 0
  // and labelling this a floor refusal would put a false statement in the
  // ledger the entry exists to correct.
  //
  // Re-review was right about the consequence, though: a reader auditing "was
  // anything dropped as unreadably small?" should not be told nothing was. Both
  // constraints are recorded -- the gate that fired, and whether the same value
  // would also have failed on width at the floor, with the widget rect and the
  // width it would have needed.
  const ledgerProbe = await PDFDocument.create();
  const ledgerFont = await ledgerProbe.embedFont(StandardFonts.Helvetica);
  const widgetRectOf = (name) => (census.fields ?? census).find?.((c) => c.name === name)?.widgets?.[0]?.rect ?? null;
  const isMultiline = (name) => Boolean((census.fields ?? census).find?.((c) => c.name === name)?.multiline);

  for (const label of ["boundary", "canonical"]) {
    const render = label === "boundary" ? boundaryRender : canonicalRender;
    const facts = label === "boundary" ? boundary : canonical;
    for (const r of render.report.refused) {
      if (r.reason !== "value_exceeds_form_max_length") continue;
      const rect = widgetRectOf(r.field);
      const value = r.factId ? facts[r.factId] : null;
      let alsoBelowFloor = null;
      if (rect && typeof value === "string" && value.length > 0) {
        const fit = fitTextToWidget({
          font: ledgerFont, text: value, rect, multiline: isMultiline(r.field),
          minFontSize: MIN_READABLE_FONT_SIZE
        });
        alsoBelowFloor = {
          alsoExceedsWidgetAtReadableFloor: fit.outcome === "refused",
          minFontSize: MIN_READABLE_FONT_SIZE,
          requiredWidthAtMin: fit.requiredWidthAtMin ?? null,
          requiredHeightAtMin: fit.requiredHeightAtMin ?? null,
          widget: rect
        };
      }
      overflow.push({
        fixture: label, field: r.field, check: "refused_exceeds_form_declared_max_length",
        reason: r.reason,
        primaryMechanism: "form_declared_max_length",
        declaredMaxLength: r.maxLength ?? null, valueLength: r.valueLength ?? null,
        factId: r.factId ?? null,
        ...(alsoBelowFloor ?? {}),
        handling: "left blank in the artifact; the form's own limit is not ours to override"
      });
    }
  }

  for (const w of boundaryRender.report.written) {
    if (w.outcome === "shrunk") {
      overflow.push({ fixture: "boundary", field: w.field, check: "shrink_to_fit_applied", fontSize: w.fontSize, lines: w.lines ?? 1, handling: "written at the fitted size" });
    }
  }
  for (const w of canonicalRender.report.written) {
    if (w.outcome === "shrunk") {
      overflow.push({ fixture: "canonical", field: w.field, check: "shrink_to_fit_applied", fontSize: w.fontSize, lines: w.lines ?? 1, handling: "written at the fitted size" });
    }
  }

  // --- protected-field scan against the artifact ---------------------------
  //
  // The scan reads the finalized artifact rather than the render report: a
  // report is what the renderer believed it did, and the artifact is what it
  // actually produced.
  const unwritable = classification.entries.filter((e) => e.class !== "participant" && e.class !== "deterministic");
  const writtenFields = new Set(canonicalRender.report.written.map((w) => w.field));
  const violations = unwritable.filter((e) => writtenFields.has(e.name)).map((e) => ({ field: e.name, class: e.class }));
  const protectedCategoryViolations = canonicalRender.report.written
    .map((w) => ({ field: w.field, category: protectCategoryOf(w.field) }))
    .filter((x) => x.category !== null);
  const residue = scanBytesForActiveContent(canonicalRender.bytes);

  writeJson(path.join(familyDir, "reports/protected-fields-scan.json"), {
    schemaVersion: "rcap-protected-scan/v2-d0",
    scanBasis: "finalized participant artifact, decoded from page content including flattened appearances",
    unwritableFieldsChecked: unwritable.length,
    violations,
    protectedCategoryViolations,
    placeholderValues: [],
    activeContentResidue: residue.hits,
    activeContentInspectable: residue.inspectable,
    valuesWrittenButNotVisible: notVisible,
    negativeFixtureLeaks: negativeLeaks,
    expectedValues: canonicalRender.report.expectedValues.length,
    expectedValuesAbsentFromBlankSource: expectedValuesAbsentFromBlank.length,
    visibilityProofIndependentOfSourceText: expectedValuesAbsentFromBlank.length > 0,
    pass: violations.length === 0 && protectedCategoryViolations.length === 0
      && residue.hits.length === 0 && notVisible.length === 0 && negativeLeaks.length === 0
  });

  writeJson(path.join(familyDir, "reports/protected-fields.json"), {
    documentOwnership: cls.ownership,
    wholeDocumentUnwritable: false,
    basis: "typed fail-closed binder",
    unwritableFields: unwritable.map((e) => ({ field: e.name, class: e.class, reason: e.decision })),
    manualFields: classification.entries.filter((e) => e.class === "manual").map((e) => e.name)
  });

  writeJson(path.join(familyDir, "reports/populated-fields.json"),
    canonicalRender.report.written.map((w) => ({
      field: w.field,
      class: classification.entries.find((e) => e.name === w.field)?.class ?? "participant",
      factId: w.factId,
      kind: w.kind,
      fontSize: w.fontSize ?? null,
      outcome: w.outcome ?? null
    })));

  writeJson(path.join(familyDir, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v3-d0",
    boundaryFixtureApplied: true,
    minimumReadableFontSize: MIN_READABLE_FONT_SIZE,
    shrinkToFitApplied: true,
    refusedBelowFloor: boundaryRender.report.unfittable.length,
    // Counted separately because it is a different refusal with a different
    // remedy: a floor refusal means the box is too small for readable text, a
    // max-length refusal means the form itself will not accept a value that
    // long. The total is what tells a reader nothing was silently dropped.
    refusedExceedingFormMaxLength: overflow.filter((o) => o.check === "refused_exceeds_form_declared_max_length").length,
    refusalsRecorded: overflow.filter((o) => o.check.startsWith("refused_")).length,
    findings: overflow
  });

  writeJson(path.join(familyDir, "reports/active-content.json"), {
    schemaVersion: "rcap-active-content/v2-d0",
    canonical: { sanitation: canonicalRender.report.sanitation, scan: canonicalRender.report.activeContentScan },
    boundary: { sanitation: boundaryRender.report.sanitation, scan: boundaryRender.report.activeContentScan },
    negative: { sanitation: negativeRender.report.sanitation, scan: negativeRender.report.activeContentScan },
    residueRemaining: residue.hits,
    refusalOnResidueIsEnforcedByTheFactory: true
  });

  writeJson(path.join(familyDir, "reports/determinism.json"), {
    schemaVersion: "rcap-determinism/v1",
    basis: "the canonical fixture was rendered twice from the same source bytes and the same facts",
    firstSha256: canonicalRender.report.outputSha256,
    secondSha256: canonicalRepeat.report.outputSha256,
    identical: deterministic
  });

  writeJson(path.join(familyDir, "reports/source-drift.json"), {
    schemaVersion: "rcap-source-drift/v1",
    basis: "one byte of the verified source was inverted and the render re-attempted",
    refused: driftRefused,
    error: driftMessage
  });

  writeJson(path.join(familyDir, "reports/mutation-tests.json"), {
    schemaVersion: "rcap-mutation-tests/v1",
    basis: "each mutation removes one protection and confirms the corresponding guarantee stops holding",
    allHeld: mutationsHeld,
    mutations
  });

  writeJson(path.join(familyDir, "reports/non-filing-hold.json"), {
    schemaVersion: "rcap-non-filing-hold/v1",
    noticeOnFace: null,
    sourceScanned: true,
    scanBasis: "document text decoded from the page content stream",
    refusalMechanismProven: holdRefused,
    note: "This source does not state that it must not be completed for filing. The hold was exercised against it anyway to prove the refusal is mechanical rather than advisory."
  });

  const artifacts = {
    "fixtures/canonical-filled.pdf": { sha256: sha256(canonicalRender.bytes), bytes: canonicalRender.bytes.length },
    "fixtures/boundary-filled.pdf": { sha256: sha256(boundaryRender.bytes), bytes: boundaryRender.bytes.length },
    "fixtures/negative-filled.pdf": { sha256: sha256(negativeRender.bytes), bytes: negativeRender.bytes.length }
  };
  if (sheetProof) {
    artifacts["contact-sheet/blank-vs-filled.pdf"] = {
      sha256: sheetProof.sheetSha256,
      bytes: fs.statSync(path.join(familyDir, "contact-sheet/blank-vs-filled.pdf")).size
    };
  }
  writeJson(path.join(familyDir, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1",
    sourceSha256: row.sha256,
    renderer: "scripts/rcap-official-forms/lanes/d3a-regenerate.mjs",
    factoryVersion: FACTORY_VERSION,
    reproducible: "Creation and modification dates are pinned, so re-rendering from the same source binary reproduces these hashes byte for byte.",
    artifacts
  });

  writeJson(path.join(familyDir, "fixtures/negative.json"), {
    schemaVersion: "rcap-negative-fixture/v3",
    level: "participant_fact",
    assertion: "With no participant facts supplied the renderer writes nothing, and no protected, court, prosecutor, agency, signature, notarization, service or outside-party field is written in any fixture.",
    fieldsWrittenWithNoFacts: negativeRender.report.written.length,
    canonicalValuesAbsentFromNegativeArtifact: negativeLeaks.length === 0,
    unwritableFields: unwritable.map((e) => ({ field: e.name, class: e.class }))
  });

  const map = {
    schemaVersion: "rcap-acroform-map/v6-d0",
    factoryVersion: FACTORY_VERSION,
    family: slug,
    jurisdiction: st,
    documentOwnership: cls.ownership,
    componentRole: cls.componentRole,
    sha256: row.sha256,
    pageGeometry: census.pageGeometry,
    captionOnly: cls.captionOnly,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs), unmodified; every field starts protected",
    explicitMappings: explicitTable,
    bindings: canonicalRender.report.written.map((w) => ({
      field: w.field,
      class: classification.entries.find((e) => e.name === w.field)?.class ?? "participant",
      factId: w.factId,
      kind: w.kind
    })),
    bindingRefusals: canonicalRender.report.refused.map((r) => ({
      field: r.field, reason: r.reason, category: r.category ?? null, factId: r.factId ?? null
    }))
  };
  writeJson(path.join(familyDir, "production-field-map.json"), map);

  writeJson(path.join(familyDir, "reports/findings.json"), { schemaVersion: "rcap-family-findings/v1", family: slug, findings });
  writeText(path.join(familyDir, "handoff.md"), handoffMarkdown({
    st, info, row, slug, cls, sourceRecord, classification, findings, productionHolds,
    filled: true, canonicalRender, boundaryRender, sheetProof, deterministic, driftRefused, mutations, anchorEvidence
  }));

  result.bound = canonicalRender.report.written.length;
  result.refused = canonicalRender.report.refused.length;
  result.unfittable = boundaryRender.report.unfittable.length + canonicalRender.report.unfittable.length;
  result.protectedCount = canonicalRender.report.protectedFields.length;
  result.expectedValues = canonicalRender.report.expectedValues.length;
  result.deterministic = deterministic;
  result.driftRefused = driftRefused;
  result.mutationsHeld = mutationsHeld;
  result.scanPass = violations.length === 0 && protectedCategoryViolations.length === 0
    && residue.hits.length === 0 && notVisible.length === 0 && negativeLeaks.length === 0;
  return result;
}

// --- handoff ----------------------------------------------------------------
function handoffMarkdown(ctx) {
  const { st, info, row, slug, cls, sourceRecord, classification, findings, productionHolds, filled } = ctx;
  const lines = [];
  lines.push(`# ${st} — ${row.document_id} — ${row.official_title}`);
  lines.push("");
  lines.push(`Family \`${slug}\` in \`${info.slug}\`, built by lane ${LANE} on factory \`${FACTORY_VERSION}\`.`);
  lines.push("");
  lines.push("## Source identity");
  lines.push("");
  lines.push(`- Canonical path: \`${row.canonical_relative_path}\``);
  lines.push(`- Manifest sha256: \`${row.sha256}\``);
  lines.push(`- Delivered sha256: \`${sourceRecord.sha256Observed}\` — ${sourceRecord.sha256VerifiedAgainstBundleManifest ? "matches" : "**does not match**"}`);
  lines.push(`- Revision: ${row.revision}; role ${row.document_role}; asset class ${row.asset_class}`);
  lines.push(`- Structural class: manifest declares \`${sourceRecord.structuralClassDeclared}\`, the binary reads \`${sourceRecord.structuralClassObserved}\``);
  if (sourceRecord.observedAcroFieldCount !== null) {
    lines.push(`- Fields: manifest declares ${sourceRecord.declaredFieldCount ?? "—"}, first-hand census reads ${sourceRecord.observedAcroFieldCount}`);
  }
  lines.push("");
  lines.push("## Ownership");
  lines.push("");
  lines.push(cls.reason);
  lines.push("");
  if (classification) {
    lines.push("## Field classification");
    lines.push("");
    for (const [k, v] of Object.entries(classification.counts).sort()) lines.push(`- ${k}: ${v}`);
    lines.push("");
  }
  if (filled) {
    lines.push("## What was written");
    lines.push("");
    lines.push(`${ctx.canonicalRender.report.written.length} field(s) bound from the canonical fixture; ${ctx.canonicalRender.report.refused.length} refused.`);
    if (ctx.canonicalRender.report.written.length > 0) {
      lines.push("");
      for (const w of ctx.canonicalRender.report.written) lines.push(`- \`${w.field}\` ← \`${w.factId}\``);
    }
    lines.push("");
    lines.push("## Evidence");
    lines.push("");
    lines.push(`- Contact sheet: ${ctx.sheetProof ? "built from the finalized artifact; every expected value proven visible and the two panels proven different" : "not emitted — the binder wrote nothing, so there is no filled panel to show"}`);
    lines.push(`- Deterministic: ${ctx.deterministic ? "two renders of identical inputs produced identical bytes" : "**renders differed**"}`);
    lines.push(`- Source drift: ${ctx.driftRefused ? "a perturbed source binary was refused" : "**a perturbed source binary was accepted**"}`);
    lines.push(`- Mutations: ${ctx.mutations.filter((m) => m.held).length}/${ctx.mutations.length} held`);
    lines.push(`- Boundary fixture refused ${ctx.boundaryRender.report.unfittable.length} value(s) below the ${MIN_READABLE_FONT_SIZE}pt readable floor rather than writing them illegibly`);
    lines.push("");
  } else {
    lines.push("## No fill produced");
    lines.push("");
    lines.push(cls.documentAcceptsFill
      ? "This family is participant-completed but no fill was produced; the reason is recorded in the holds below and in `reports/`."
      : "This document is not participant-completed, so nothing is written into it.");
    lines.push("");
    if (ctx.anchorEvidence) {
      lines.push(`Flat-form anchor capture found ${ctx.anchorEvidence.candidatesFound} measurable rule(s), of which the binder would have written ${ctx.anchorEvidence.candidatesTheBinderWouldWrite}. ${ctx.anchorEvidence.rationale}`);
      lines.push("");
    }
  }
  lines.push("## Holds carried forward");
  lines.push("");
  for (const h of productionHolds) lines.push(`- \`${h}\``);
  lines.push("");
  if (findings.length > 0) {
    lines.push("## Findings");
    lines.push("");
    for (const f of findings) lines.push(`- **${f.severity}** \`${f.finding}\` — ${f.detail}`);
    lines.push("");
  }
  lines.push("## Review status");
  lines.push("");
  lines.push("`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.");
  lines.push("");
  return lines.join("\n");
}

// --- state build ------------------------------------------------------------
export function readStateHolds(packRoot, st) {
  const readmePath = path.join(packRoot, `STATES/${st}/STATE_README.md`);
  const text = fs.readFileSync(readmePath, "utf8");
  const holds = [];
  const openItems = [];
  if (/Legal review: missing/i.test(text) || /## Legal review gap/i.test(text)) {
    holds.push("state_legal_review_missing_from_supplied_corpus");
  }
  const openSection = text.split(/## Open items/i)[1]?.split(/\n## /)[0] ?? "";
  for (const m of openSection.matchAll(/^-\s+\*\*(.+?)\*\*\s+—\s+`(.+?)`\s*\/\s*`(.+?)`/gm)) {
    openItems.push({ item: m[1], status: m[2], severity: m[3] });
    if (m[3] === "release_blocker") holds.push("state_open_item_release_blocker");
    if (m[3] === "build_blocker") holds.push("state_open_item_build_blocker");
  }
  return { holds: [...new Set(holds)], openItems, readmePath: `STATES/${st}/STATE_README.md` };
}

export async function buildState(st, packRoot) {
  const info = STATES[st];
  const outDir = path.join(OUT_ROOT, info.slug);
  const manifestPath = path.join(packRoot, `STATES/${st}/STATE_MANIFEST.csv`);
  const rows = parseCsv(fs.readFileSync(manifestPath, "utf8"));
  const stateMeta = readStateHolds(packRoot, st);
  const availableChargeRows = canonicalFacts(st)["matter.charges"].length;

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, `src/lib/rcap-engine/compiled/profiles/${info.profile}.json`), "utf8"));

  const families = [];
  const legalReviewRows = [];
  for (const row of rows) {
    if (row.asset_class === "legal_review") { legalReviewRows.push(row); continue; }
    let r;
    try {
      r = await buildFamily({ st, row, packRoot, outDir, stateHolds: stateMeta.holds, availableChargeRows });
    } catch (err) {
      // One family that the factory cannot finish must not take the other
      // families of its state down with it, and it must not vanish either.
      const slug = familySlug(row);
      r = {
        st, slug, documentId: row.document_id, documentRole: row.document_role,
        familyDir: path.join(outDir, slug), hashVerified: false, filled: false, contactSheet: false,
        fieldsInventoried: 0, bound: 0, refused: 0, unfittable: 0, protectedCount: 0,
        canonicalFixtures: 0, boundaryFixtures: 0, negativeFixtures: 0, finalizedPdfs: 0,
        nonFilingHold: false, renderStrategy: "none_build_error",
        findings: [{ severity: "blocker", finding: "family_build_threw", detail: err.message.slice(0, 300) }]
      };
      writeJson(path.join(outDir, slug, "reports/findings.json"), {
        schemaVersion: "rcap-family-findings/v1", family: slug, findings: r.findings
      });
    }
    families.push(r);
    process.stdout.write(`  ${st} ${r.slug}: ${r.filled ? `filled ${r.bound}/${r.fieldsInventoried}` : "no fill"}${r.hashVerified ? "" : " HASH-MISMATCH"}${r.findings.some((f) => f.severity === "blocker") ? " [blocker]" : ""}\n`);
  }

  // --- state-pack fidelity: the profile's legacy inventory vs Edition 1 -----
  const inventory = profile.packetGenerator?.formInventory ?? [];
  const manifestHashes = new Set(rows.map((r) => r.sha256).filter(Boolean));
  const inventoryNotInPack = inventory.filter((f) => f.sha256 && !manifestHashes.has(f.sha256));
  const fidelity = {
    schemaVersion: "rcap-state-pack-fidelity/v1",
    jurisdiction: st,
    profile: `src/lib/rcap-engine/compiled/profiles/${info.profile}.json`,
    rule: "Edition 1 STATE_MANIFEST.csv is the canonical source of record. Where the compiled profile's legacy formInventory disagrees, the pack manifest wins and the disagreement is recorded here. The profile was not edited.",
    profileInventoryEntries: inventory.length,
    profileEntriesWithNoMatchingEditionOneHash: inventoryNotInPack.length,
    editionOnePdfFamilies: families.length,
    discrepancies: inventoryNotInPack.map((f) => ({
      fileName: f.fileName,
      relativePath: f.relativePath,
      profileSha256: f.sha256,
      resolution: "no Edition 1 manifest row carries this hash; the profile entry describes a superseded local corpus and is not used as a source of record"
    }))
  };
  writeJson(path.join(outDir, "state-pack-fidelity.json"), fidelity);

  // --- state index (lane-scoped; the two shared indexes are NOT touched) ----
  const stateIndex = {
    schemaVersion: "rcap-lane-state-index/v1",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: st,
    jurisdictionName: info.name,
    jurisdictionSlug: info.slug,
    bundleEdition: "1.0",
    sourcePack: "RCAP_D_D3_SOURCE_PACK.zip",
    note: "Lane-scoped. The captain merges this into verified-binary-index.json and implementation-index.json at import; this lane never writes those two shared files because seven lanes run concurrently.",
    stateReadme: stateMeta.readmePath,
    stateOpenItems: stateMeta.openItems,
    stateHolds: stateMeta.holds,
    legalReview: legalReviewRows.map((r) => ({
      documentId: r.document_id, title: r.official_title, revision: r.revision,
      path: r.canonical_relative_path, sha256: r.sha256, freshnessStatus: r.freshness_status
    })),
    counts: {
      families: families.length,
      hashVerified: families.filter((f) => f.hashVerified).length,
      hashMismatched: families.filter((f) => !f.hashVerified).length,
      filled: families.filter((f) => f.filled).length,
      contactSheets: families.filter((f) => f.contactSheet).length,
      fieldsInventoried: families.reduce((a, f) => a + f.fieldsInventoried, 0),
      fieldsBound: families.reduce((a, f) => a + f.bound, 0)
    },
    families: families.map((f) => ({
      family: f.slug,
      documentId: f.documentId,
      documentRole: f.documentRole,
      hashVerified: f.hashVerified,
      renderStrategy: f.renderStrategy,
      fields: f.fieldsInventoried,
      bound: f.bound,
      refused: f.refused,
      unfittable: f.unfittable,
      filled: f.filled,
      contactSheet: f.contactSheet,
      deterministic: f.deterministic ?? null,
      driftRefused: f.driftRefused ?? null,
      mutationsHeld: f.mutationsHeld ?? null,
      scanPass: f.scanPass ?? null,
      findings: f.findings.length,
      status: "implementation_complete_pending_independent_review"
    }))
  };
  writeJson(path.join(outDir, "state-index.json"), stateIndex);

  const tracks = (profile.pathways ?? []).map((p) => ({
    trackId: p.id ?? p.pathwayId ?? p.key,
    label: p.label ?? p.title ?? null,
    terminal: false,
    note: "Fail-closed: this lane builds official-form packages and does not promote any track to terminal."
  }));
  writeJson(path.join(outDir, "jurisdiction-summary.json"), {
    schemaVersion: "rcap-jurisdiction-summary/v2",
    lane: LANE,
    jurisdiction: st,
    jurisdictionName: info.name,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    implementationStatus: "implementation_complete_pending_independent_review",
    tracks,
    families: families.map((f) => f.slug),
    holds: stateMeta.holds,
    openItems: stateMeta.openItems
  });

  return { st, families, stateIndex, fidelity };
}

// --- verification -----------------------------------------------------------
//
// Re-reads the committed packages and checks the claims they make against the
// artifacts they ship. Every number in the lane report comes from here rather
// than from the build that wrote the files, so a build that lied about itself
// is caught by something that did not trust it.
const CAPTION_ONLY_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);
const ELECTION_CONTROLS = new Set(["checkbox", "radio", "optionlist", "button", "signature"]);
const PLACEHOLDER_PATTERNS = [/\bTODO\b/, /\bTBD\b/, /\bFIXME\b/, /lorem ipsum/i, /xxx+/i];

export async function verifyLane(packRoot, targets) {
  const failures = [];
  const totals = {
    families: 0, hashVerified: 0, hashMismatched: 0, acroformFamilies: 0, overlayFamilies: 0,
    fieldsInventoried: 0, fieldsBound: 0, protectedOrRefused: 0, unfittable: 0,
    canonicalFixtures: 0, boundaryFixtures: 0, negativeFixtures: 0, finalizedPdfs: 0,
    contactSheets: 0, nonFilingHolds: 0, currentnessHolds: 0, blockers: 0, findings: 0,
    reRenderedIdentical: 0, reRenderChecked: 0, withheldFields: 0, explicitMappings: 0
  };
  const assert = (cond, msg) => { if (!cond) failures.push(msg); };
  const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
  const shaFile = (p) => sha256(fs.readFileSync(p));

  for (const st of targets) {
    const info = STATES[st];
    const dir = path.join(OUT_ROOT, info.slug);
    assert(fs.existsSync(dir), `${st}: package root exists`);
    if (!fs.existsSync(dir)) continue;
    for (const f of ["state-index.json", "jurisdiction-summary.json", "state-pack-fidelity.json"]) {
      assert(fs.existsSync(path.join(dir, f)), `${st}: ${f} present`);
    }
    // The two shared indexes belong to the captain; this lane must not have
    // written into the state directory's parent at all.
    for (const shared of ["verified-binary-index.json", "implementation-index.json"]) {
      const p = path.join(OUT_ROOT, shared);
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, "utf8");
        assert(!text.includes(`"${st}"`) || !text.includes(info.slug),
          `${st}: shared index ${shared} was not extended by this lane`);
      }
    }
    const summary = readJson(path.join(dir, "jurisdiction-summary.json"));
    assert(summary.tracks.length > 0, `${st}: summary lists the profile's tracks`);
    for (const t of summary.tracks) assert(t.terminal === false, `${st}/${t.trackId}: track is not marked terminal`);

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const famDir = path.join(dir, entry.name);
      const id = `${st}/${entry.name}`;
      totals.families += 1;

      const recPath = path.join(famDir, "source-record.json");
      assert(fs.existsSync(recPath), `${id}: source-record.json present`);
      if (!fs.existsSync(recPath)) continue;
      const record = readJson(recPath);

      if (record.sha256VerifiedAgainstBundleManifest) totals.hashVerified += 1; else totals.hashMismatched += 1;
      assert(record.byteLengthMatches !== false, `${id}: byte length matches the manifest`);
      assert(record.pageCountAgrees !== false || record.observedPages === null,
        `${id}: page count matches the manifest`);
      assert(Array.isArray(record.productionHolds)
        && record.productionHolds.includes("edition_1_runtime_disabled")
        && record.productionHolds.includes("f_independent_visual_review_required"),
        `${id}: Edition 1 and independent-review holds preserved`);
      assert(record.implementationStatus === "implementation_complete_pending_independent_review",
        `${id}: status is not self-approved`);
      if (record.productionHolds.some((h) => /currentness|revision_confirmation|source_gated|legal_review_missing/.test(h))) {
        totals.currentnessHolds += 1;
      }
      if (record.nonFilingNoticeOnFace) totals.nonFilingHolds += 1;

      const findingsPath = path.join(famDir, "reports/findings.json");
      if (fs.existsSync(findingsPath)) {
        const fnd = readJson(findingsPath).findings ?? [];
        totals.findings += fnd.length;
        totals.blockers += fnd.filter((x) => x.severity === "blocker").length;
      }

      const censusPath = path.join(famDir, "field-census.json");
      if (fs.existsSync(censusPath)) {
        const census = readJson(censusPath);
        assert(census.sha256 === record.sha256, `${id}: census pinned to the source record's sha256`);
        assert(census.fieldCount === census.fields.length, `${id}: census count matches its own entries`);
        totals.fieldsInventoried += census.fields.length;
        if (census.structuralClass === "acroform") totals.acroformFamilies += 1;
        else if (census.structuralClass === "flat_pdf") totals.overlayFamilies += 1;

        const clsPath = path.join(famDir, "field-classification.json");
        assert(fs.existsSync(clsPath), `${id}: field-classification.json present`);
        if (fs.existsSync(clsPath)) {
          const cls = readJson(clsPath);
          assert(cls.entries.length === census.fields.length, `${id}: every censused field is classified`);
          const names = new Set(census.fields.map((f) => f.name));
          for (const e of cls.entries) assert(names.has(e.name), `${id}: classified field '${e.name}' is in the census`);
          totals.protectedOrRefused += cls.entries.filter((e) => e.class !== "participant" && e.class !== "deterministic").length;
        }
      }

      const wPath = path.join(famDir, "reports/reviewed-withholdings.json");
      if (fs.existsSync(wPath)) totals.withheldFields += readJson(wPath).count ?? 0;

      const mapPath = path.join(famDir, "production-field-map.json");
      if (!fs.existsSync(mapPath)) {
        assert(record.participantFillable === false, `${id}: a family with no map claims no fill`);
        assert(!fs.existsSync(path.join(famDir, "fixtures/canonical-filled.pdf")),
          `${id}: no fill produced for a family with no map`);
        for (const fx of ["canonical", "boundary", "negative"]) {
          if (fs.existsSync(path.join(famDir, `fixtures/${fx}.json`))) totals[`${fx}Fixtures`] += 1;
        }
        continue;
      }

      const map = readJson(mapPath);
      assert(map.sha256 === record.sha256, `${id}: map pinned to the source record's sha256`);
      assert(map.factoryVersion === FACTORY_VERSION, `${id}: map declares the remediated factory`);
      assert(typeof map.bindingBasis === "string" && /typed fail-closed/.test(map.bindingBasis),
        `${id}: bindings come from the typed fail-closed binder`);
      assert(Array.isArray(map.bindingRefusals), `${id}: refused bindings are recorded`);
      totals.explicitMappings += Object.keys(map.explicitMappings ?? {}).length;

      const cls = readJson(path.join(famDir, "field-classification.json"));
      const classOf = new Map(cls.entries.map((e) => [e.name, e.class]));
      const typeOf = new Map(readJson(censusPath).fields.map((e) => [e.name, e.type]));
      for (const b of map.bindings ?? []) {
        totals.fieldsBound += 1;
        assert(protectCategoryOf(b.field) === null,
          `${id}: binding on '${b.field}' is not a protected category (${protectCategoryOf(b.field)})`);
        assert(!ELECTION_CONTROLS.has(typeOf.get(b.field)),
          `${id}: binding on '${b.field}' does not target an election control`);
        assert(["participant", "deterministic"].includes(classOf.get(b.field)),
          `${id}: binding on '${b.field}' is participant or deterministic only, saw '${classOf.get(b.field)}'`);
        if (map.captionOnly) {
          const base = String(b.factId).replace(/^matter\.charges\[\d+\]\./, "matter.");
          assert(CAPTION_ONLY_FACTS.has(base), `${id}: caption-only map binds '${b.factId}'`);
        }
      }
      if (record.componentRole === "court_order_component_never_participant_filed") {
        assert((map.bindings ?? []).length === 0, `${id}: a court order component binds nothing`);
      }

      for (const fx of ["canonical", "boundary", "negative"]) {
        if (fs.existsSync(path.join(famDir, `fixtures/${fx}.json`))) totals[`${fx}Fixtures`] += 1;
      }

      const scanPath = path.join(famDir, "reports/protected-fields-scan.json");
      assert(fs.existsSync(scanPath), `${id}: protected-field scan present`);
      if (fs.existsSync(scanPath)) {
        const scan = readJson(scanPath);
        assert(scan.pass === true, `${id}: protected-field scan passes`);
        assert((scan.activeContentResidue ?? []).length === 0, `${id}: no active-content residue`);
        assert((scan.valuesWrittenButNotVisible ?? []).length === 0, `${id}: every written value is visible`);
        assert((scan.negativeFixtureLeaks ?? []).length === 0, `${id}: the fact-free render carries no value`);
        assert((scan.violations ?? []).length === 0, `${id}: no unwritable field was written`);
      }

      const detPath = path.join(famDir, "reports/determinism.json");
      if (fs.existsSync(detPath)) assert(readJson(detPath).identical === true, `${id}: render is deterministic`);
      const driftPath = path.join(famDir, "reports/source-drift.json");
      if (fs.existsSync(driftPath)) assert(readJson(driftPath).refused === true, `${id}: a perturbed source is refused`);
      const mutPath = path.join(famDir, "reports/mutation-tests.json");
      if (fs.existsSync(mutPath)) assert(readJson(mutPath).allHeld === true, `${id}: every mutation held`);

      const overflowPath = path.join(famDir, "reports/overflow-and-clipping.json");
      if (fs.existsSync(overflowPath)) totals.unfittable += readJson(overflowPath).refusedBelowFloor ?? 0;

      const sheetPath = path.join(famDir, "contact-sheet/blank-vs-filled.pdf");
      const proofPath = path.join(famDir, "contact-sheet/contact-sheet-proof.json");
      if (fs.existsSync(sheetPath)) {
        totals.contactSheets += 1;
        assert(fs.existsSync(proofPath), `${id}: a contact sheet carries the proof behind it`);
        if (fs.existsSync(proofPath)) {
          const proof = readJson(proofPath);
          assert(proof.allExpectedValuesVisible === true, `${id}: every expected value is visible in the artifact`);
          assert(proof.panelsDiffer === true, `${id}: the blank and filled panels differ`);
          const canonical = path.join(famDir, "fixtures/canonical-filled.pdf");
          assert(fs.existsSync(canonical) && shaFile(canonical) === proof.finalizedSha256,
            `${id}: the sheet is pinned to the artifact it depicts`);
        }
      }

      const receiptPath = path.join(famDir, "reports/rendered-artifacts.json");
      if (fs.existsSync(receiptPath)) {
        const receipt = readJson(receiptPath);
        assert(receipt.sourceSha256 === record.sha256, `${id}: render receipt pinned to the source sha256`);
        for (const [rel, meta] of Object.entries(receipt.artifacts ?? {})) {
          const p = path.join(famDir, rel);
          assert(fs.existsSync(p), `${id}: recorded artifact ${rel} exists`);
          if (!fs.existsSync(p)) continue;
          totals.finalizedPdfs += rel.startsWith("fixtures/") ? 1 : 0;
          assert(fs.readFileSync(p).subarray(0, 5).toString() === "%PDF-", `${id}: ${rel} is a real PDF`);
          assert(shaFile(p) === meta.sha256, `${id}: ${rel} matches its recorded hash`);
        }
      }

      // The strongest check available: rebuild the canonical artifact from the
      // pinned source and confirm the committed bytes come back.
      if (packRoot && fs.existsSync(path.join(packRoot, record.canonicalBundlePath))) {
        const srcBytes = fs.readFileSync(path.join(packRoot, record.canonicalBundlePath));
        if (sha256(srcBytes) === record.sha256 && record.participantFillable) {
          const census = readJson(censusPath);
          const { flat: reviewed } = explicitMappingsFor(st, record.documentId, census.fields.map((f) => f.name));
          const explicit = { ...reviewed };
          if (fs.existsSync(wPath)) for (const w of readJson(wPath).withheld) explicit[w.field] = WITHHOLD;
          const again = await finalizeOfficialForm({
            sourceBytes: srcBytes, expectedSha256: record.sha256, census: census.fields,
            facts: canonicalFacts(st), explicitMappings: explicit, captionOnly: map.captionOnly,
            documentAcceptsFill: true, title: `${record.documentId} — ${record.officialTitle}`
          });
          totals.reRenderChecked += 1;
          const committed = path.join(famDir, "fixtures/canonical-filled.pdf");
          if (fs.existsSync(committed) && shaFile(committed) === sha256(again.bytes)) totals.reRenderedIdentical += 1;
          else assert(false, `${id}: re-rendering from the pinned source reproduces the committed artifact`);
        }
      }

      for (const file of fs.readdirSync(famDir, { recursive: true })) {
        const p = path.join(famDir, String(file));
        if (!fs.statSync(p).isFile()) continue;
        if (!/\.(json|md)$/.test(p)) continue;
        const text = fs.readFileSync(p, "utf8");
        for (const pattern of PLACEHOLDER_PATTERNS) {
          assert(!pattern.test(text), `${id}/${file}: no placeholder text (${pattern})`);
        }
      }
    }
  }
  return { failures, totals };
}

// --- entry point ------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const packIdx = args.indexOf("--pack");
  const packRoot = packIdx >= 0 ? args[packIdx + 1] : "/tmp/rcap-source-packs/D3A/extracted";
  const stateArgs = args.filter((a) => Object.keys(STATES).includes(a));
  const targets = stateArgs.length > 0 ? stateArgs : Object.keys(STATES);

  if (args.includes("--verify")) {
    const { failures, totals } = await verifyLane(fs.existsSync(packRoot) ? packRoot : null, targets);
    process.stdout.write(`${JSON.stringify(totals, null, 2)}\n`);
    if (failures.length > 0) {
      process.stderr.write("d3a verify FAILED\n");
      for (const f of failures) process.stderr.write(` - ${f}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`d3a verify passed: ${totals.families} family packages across ${targets.length} states.\n`);
    return;
  }

  const summaries = [];
  for (const st of targets) {
    process.stdout.write(`\n=== ${st} (${STATES[st].name}) ===\n`);
    summaries.push(await buildState(st, packRoot));
  }

  process.stdout.write("\n--- lane D3A totals ---\n");
  let totals = {
    families: 0, hashVerified: 0, filled: 0, sheets: 0, fields: 0, bound: 0,
    refused: 0, unfittable: 0, pdfs: 0, findings: 0
  };
  for (const s of summaries) {
    for (const f of s.families) {
      totals.families += 1;
      totals.hashVerified += f.hashVerified ? 1 : 0;
      totals.filled += f.filled ? 1 : 0;
      totals.sheets += f.contactSheet ? 1 : 0;
      totals.fields += f.fieldsInventoried;
      totals.bound += f.bound;
      totals.refused += f.refused;
      totals.unfittable += f.unfittable;
      totals.pdfs += f.finalizedPdfs;
      totals.findings += f.findings.length;
    }
  }
  process.stdout.write(`${JSON.stringify(totals, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
