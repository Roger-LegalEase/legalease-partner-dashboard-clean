// The geometry half of the visual-evidence contract.
//
// The defect this exists to close: a value was treated as visible because the
// string appeared somewhere on the page. "Somewhere" is not a contract. A
// petitioner's name that lands in the judge's findings of fact is visible, and
// it is also a filed document asserting something nobody wrote.
//
// So visibility is answered here as a question about rectangles: the value is
// drawn, and the box it occupies sits inside the widget rectangle the field map
// says it may occupy, and inside no other. Everything is read from the finalized
// artifact's own content stream at absolute page coordinates, so the answer is
// exact and needs no tolerance for resampling — unlike a pixel diff, which is
// the human-facing channel and lives in the raster manifest instead.
import { createRequire } from "node:module";
import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

/** Widget rects are in PDF points; a glyph box needs a point or two of slack. */
export const GEOMETRY_TOLERANCE_PT = 2;

/**
 * Page regions a participant value may never occupy, however the field that
 * carries them is named. Matched against the printed region heading the census
 * captured above each widget, so a rename cannot move a widget out of the
 * court's half of the page.
 */
export const COURT_OWNED_REGION_PATTERNS = [
  /findings?\s+of\s+fact/i, /conclusions?\s+of\s+law/i,
  /order\s+of\s+the\s+court/i, /it\s+is\s+(hereby\s+)?ordered/i, /so\s+ordered/i,
  /\bdecree\b/i, /\bjudgment\b/i,
  /certificate\s+of\s+service/i, /\bcertification\b/i, /notar/i, /\bverification\b/i,
  /clerk'?s?\s+use/i, /court\s+use\s+only/i, /for\s+office\s+use/i,
  /\bdecision\b/i
];

/**
 * A bare "ORDER" is not enough. Every one of these forms is titled "PETITION AND
 * ORDER OF EXPUNCTION", and treating the title as a court-owned region would
 * condemn the petitioner block printed directly under it. Only the phrases above
 * name a section the court owns; the title names the document.
 */
export const REGION_HEADING_NOTE = "court-owned regions are matched on section phrases, never on a bare ORDER token, so a form title cannot protect the petitioner block beneath it";

/** Refusal categories that mark a field as court-owned rather than merely unused. */
export const PROTECTED_REFUSAL_CATEGORIES = new Set([
  "service_block", "notarization", "court", "clerk", "prosecutor", "attorney",
  "outside_party", "responsible_official", "licensing_board", "agency",
  "government_identifier", "disposition_or_hearing", "signature", "decision"
]);

/** The box a drawn text run actually occupies, from its baseline and font size. */
export function runBox(item) {
  const size = Number(item.size) || 0;
  return {
    x0: item.x,
    x1: item.x + (Number(item.width) || 0),
    y0: item.y - size * 0.25,
    y1: item.y + size * 0.85
  };
}

/** A census widget rect as a box. */
export function rectBox(rect) {
  return { x0: rect.x, x1: rect.x + rect.width, y0: rect.y, y1: rect.y + rect.height };
}

export function contains(outer, inner, tol = GEOMETRY_TOLERANCE_PT) {
  return inner.x0 >= outer.x0 - tol && inner.x1 <= outer.x1 + tol
    && inner.y0 >= outer.y0 - tol && inner.y1 <= outer.y1 + tol;
}

export function intersects(a, b, tol = 0) {
  return a.x0 < b.x1 + tol && a.x1 > b.x0 - tol && a.y0 < b.y1 + tol && a.y1 > b.y0 - tol;
}

/** Every field in the census, indexed by name, with its widgets. */
export function censusIndex(census) {
  const rows = Array.isArray(census) ? census : (census.fields ?? []);
  return new Map(rows.map((r) => [r.name, r]));
}

/**
 * Which page-level rectangles a participant value may occupy (writable) and
 * which it may never (protected), derived from the committed map and census.
 *
 * A field is protected when the map refuses it on a protected category, when it
 * is listed unwritable, or when the census recorded a court-owned printed
 * heading above it — the last of these is what makes a rename ineffective.
 */
export function geometryOfFamily({ map, census }) {
  const byName = censusIndex(census);
  const writable = [];
  const protectedRects = [];

  for (const binding of map.bindings ?? []) {
    const row = byName.get(binding.field);
    if (!row) continue;
    for (const w of row.widgets ?? []) {
      writable.push({
        field: binding.field, factId: binding.factId, page: w.page,
        rect: w.rect, box: rectBox(w.rect), regionHeading: row.regionHeading ?? null
      });
    }
  }

  const protectedNames = new Map();
  for (const u of map.unwritableFields ?? []) {
    const name = typeof u === "string" ? u : u.field;
    protectedNames.set(name, { basis: "unwritable_field", category: (typeof u === "object" && u.class) || null });
  }
  for (const r of map.bindingRefusals ?? []) {
    if (r.reason === "protected_category" || PROTECTED_REFUSAL_CATEGORIES.has(r.category)) {
      protectedNames.set(r.field, { basis: "protected_refusal", category: r.category ?? null });
    }
  }
  for (const [name, row] of byName) {
    const heading = row.regionHeading ?? "";
    if (heading && COURT_OWNED_REGION_PATTERNS.some((p) => p.test(heading)) && !protectedNames.has(name)) {
      protectedNames.set(name, { basis: "court_owned_region_heading", category: null, regionHeading: heading });
    }
  }

  const writableFieldNames = new Set((map.bindings ?? []).map((b) => b.field));
  for (const [name, meta] of protectedNames) {
    const row = byName.get(name);
    if (!row) continue;
    // A field the map both binds and protects is a contradiction the binder must
    // resolve; it is reported by the verifier rather than silently taking one side.
    for (const w of row.widgets ?? []) {
      protectedRects.push({
        field: name, page: w.page, rect: w.rect, box: rectBox(w.rect),
        basis: meta.basis, category: meta.category ?? null,
        regionHeading: row.regionHeading ?? null,
        alsoBound: writableFieldNames.has(name)
      });
    }
  }
  return { writable, protected: protectedRects };
}

/**
 * Every text run in the artifact that draws one of the fixture's participant values.
 *
 * Values are matched longest-first and exact-before-substring, because the
 * fixture's own values overlap: the zip 01234 is a substring of the case number
 * 24-CR-001234, and labelling that run "zip" would put the case number's ink
 * under the wrong fact and hide a real misplacement behind a spurious one.
 */
export async function participantInk(bytes, values) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const wanted = [...new Set(values.filter((v) => typeof v === "string" && v.trim().length >= 2))]
    .sort((a, b) => b.length - a.length);
  const ink = [];
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    for (const item of extractTextItems(pages[i])) {
      const text = (item.text ?? "").trim();
      if (!text) continue;
      const value = wanted.find((v) => text === v) ?? wanted.find((v) => text.includes(v));
      if (!value) continue;
      ink.push({
        page: i + 1, value, text, box: runBox(item),
        x: item.x, y: item.y, size: item.size,
        exact: text === value
      });
    }
  }
  return { pageCount: pages.length, ink };
}

/**
 * The writable-geometry result.
 *
 * Grouped by expected value rather than by field, because several fields can
 * legitimately carry the same fact — a name in the caption and the same name in
 * the party block — and a per-field count would read every sibling's ink as a
 * duplicate. Runs are claimed by the slot that contains them; a slot left
 * unclaimed is a binding that did not reach the page, and a run left unclaimed
 * is ink in a place no binding declared.
 */
export function writableGeometryResult({ geometry, ink, facts = CANONICAL_FACTS, mapBindings = [] }) {
  const findings = [];
  const byValue = new Map();
  for (const slot of geometry.writable) {
    const expected = resolveFact(slot.factId, facts);
    if (typeof expected !== "string") {
      findings.push({ check: "expected_value_unknown", field: slot.field, factId: slot.factId, severity: "info" });
      continue;
    }
    if (!byValue.has(expected)) byValue.set(expected, []);
    byValue.get(expected).push(slot);
  }

  // A binding whose own widget sits under a court-owned printed heading is a
  // defect in the map, not in the render, and it is a defect whether or not the
  // value landed tidily inside the rectangle. Judged before any ink is matched,
  // so a well-placed value in the judge's findings of fact cannot pass by being
  // well placed.
  for (const slot of geometry.writable) {
    const heading = slot.regionHeading ?? "";
    if (heading && COURT_OWNED_REGION_PATTERNS.some((rx) => rx.test(heading))) {
      findings.push({
        check: "binding_declared_in_court_owned_region", field: slot.field,
        factId: slot.factId, page: slot.page, rect: slot.rect,
        regionHeading: heading, severity: "fail"
      });
    }
  }

  // A binding onto a field the classifier did not call participant. NEVER_WRITE
  // was corrected once by adding the literal class `manual`, which left every
  // other non-participant class — `unused` among them — still writable. Judged
  // on what the class is NOT, so a new class name cannot reopen the hole.
  for (const binding of (mapBindings ?? [])) {
    if (binding.class && binding.class !== "participant" && binding.class !== "deterministic") {
      findings.push({
        check: "binding_on_non_participant_class", field: binding.field,
        factId: binding.factId, classOfField: binding.class,
        effectiveLabel: binding.effectiveLabel ?? null, severity: "fail"
      });
    }
  }

  const claimedRuns = new Set();
  for (const [expected, slots] of byValue) {
    const runs = ink.filter((r) => r.value === expected);
    const takenBySlot = new Set();
    for (const slot of slots) {
      const idx = runs.findIndex((r, i) => !takenBySlot.has(i) && r.page === slot.page && contains(slot.box, r.box));
      if (idx >= 0) {
        takenBySlot.add(idx);
        claimedRuns.add(runs[idx]);
        continue;
      }
      const crossing = runs.findIndex((r, i) => !takenBySlot.has(i) && r.page === slot.page && intersects(slot.box, r.box));
      if (crossing >= 0) {
        takenBySlot.add(crossing);
        claimedRuns.add(runs[crossing]);
        findings.push({
          check: "value_crosses_field_boundary", field: slot.field, factId: slot.factId,
          page: slot.page, rect: slot.rect, observedBox: runs[crossing].box,
          value: expected, severity: "fail"
        });
        continue;
      }
      findings.push({
        check: "declared_binding_not_visible_in_its_rect", field: slot.field, factId: slot.factId,
        page: slot.page, rect: slot.rect, value: expected,
        sameValueDrawnElsewhereOnPage: runs.filter((r) => r.page === slot.page).length,
        severity: "fail"
      });
    }
    runs.forEach((r, i) => {
      if (takenBySlot.has(i)) return;
      findings.push({
        check: "value_drawn_outside_every_declared_slot", factId: slots[0].factId,
        declaredFields: slots.map((s) => s.field), page: r.page,
        observedBox: r.box, value: expected, severity: "fail"
      });
    });
  }
  return {
    values: byValue.size, slots: geometry.writable.length,
    runsClaimed: claimedRuns.size, claimedRuns, findings
  };
}

/**
 * The protected-geometry result: no participant-derived ink intersects a
 * protected rect.
 *
 * Only ink that no declared writable slot claimed is judged here. Official forms
 * routinely stack widgets — an address block where a mailing-address widget
 * overlaps the street-address widget that is legitimately bound — and ink
 * sitting correctly inside its own declared rectangle is correctly placed no
 * matter what else overlaps it. An overlap like that is a fact about the map,
 * reported separately as `overlaps`, not a misplaced value.
 */
export function protectedGeometryResult({ geometry, ink, claimedRuns = new Set() }) {
  const findings = [];
  const overlaps = [];
  for (const p of geometry.protected) {
    for (const w of geometry.writable) {
      if (w.page === p.page && intersects(p.box, w.box)) {
        overlaps.push({ protectedField: p.field, writableField: w.field, page: p.page });
      }
    }
    for (const r of ink.filter((r) => r.page === p.page)) {
      if (claimedRuns.has(r)) continue;
      if (!intersects(p.box, r.box)) continue;
      findings.push({
        check: "participant_value_in_protected_geometry",
        field: p.field, page: p.page, rect: p.rect, basis: p.basis,
        category: p.category, regionHeading: p.regionHeading,
        value: r.value, observedBox: r.box,
        alsoBound: p.alsoBound, severity: "fail"
      });
    }
  }
  return { protectedSlots: geometry.protected.length, overlaps, findings };
}

/**
 * Which pages carry anything a reviewer must see.
 *
 * A page is relevant when it holds a widget of any kind, any participant ink, or
 * a court-owned printed region. Only a page with none of those may be left out,
 * and the manifest has to say which test excused it.
 */
export function pageRelevance({ census, geometry, ink, pageCount }) {
  const rows = Array.isArray(census) ? census : (census.fields ?? []);
  const out = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const widgets = rows.flatMap((r) => (r.widgets ?? []).filter((w) => w.page === page).map(() => r.name));
    const writable = geometry.writable.filter((w) => w.page === page).length;
    const prot = geometry.protected.filter((p) => p.page === page).length;
    const values = ink.filter((r) => r.page === page).length;
    const relevant = widgets.length > 0 || writable > 0 || prot > 0 || values > 0;
    out.push({
      page, widgetsOnPage: widgets.length, writableSlots: writable,
      protectedSlots: prot, participantValuesDrawn: values, relevant,
      whyNotRelevant: relevant ? null : "no widget, no participant ink and no protected region on this page"
    });
  }
  return out;
}

/**
 * The canonical fixture's facts, in the same shape the binder writes them.
 *
 * Mirrors CANONICAL in scripts/implement-rcap-official-forms-d1.mjs. Kept here
 * rather than imported because that module is the implementation under review
 * and importing it would let a change there silently redefine what the evidence
 * expects to see. A drift check in the verifier compares the two.
 */
export const CANONICAL_FACTS = {
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
  "matter.charges": [{
    case_number: "24-CR-001234", citation_number: "C-889201",
    charge: "Possession of a controlled substance", arrest_date: "2019-03-08",
    offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15"
  }]
};

/**
 * Resolves a factId to the string the fixture writes, including the indexed
 * charge-row form `matter.charges[0].case_number` that several NC and VA maps
 * use. An unresolvable factId returns undefined and is reported rather than
 * quietly treated as "nothing expected".
 */
export function resolveFact(factId, facts = CANONICAL_FACTS) {
  if (typeof facts[factId] === "string") return facts[factId];
  const indexed = /^([\w.]+)\[(\d+)\]\.(\w+)$/.exec(factId ?? "");
  if (!indexed) return undefined;
  const [, base, index, key] = indexed;
  const row = Array.isArray(facts[base]) ? facts[base][Number(index)] : null;
  return row && typeof row[key] === "string" ? row[key] : undefined;
}

/** Every distinct string the canonical fixture can write, for ink matching. */
export function allFixtureValues(facts = CANONICAL_FACTS) {
  const out = [];
  for (const [, value] of Object.entries(facts)) {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) {
      for (const row of value) for (const v of Object.values(row ?? {})) if (typeof v === "string") out.push(v);
    }
  }
  return [...new Set(out)];
}
