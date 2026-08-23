// What a family package has to show before a reviewer can approve it.
//
// The previous contract asked for a picture and a hash. Both reviewers then
// returned defects it could not have caught, and they were the same shape of
// defect twice:
//
//   * NC AOC-CR-288 writes the petitioner's name into the judge's FINDINGS OF
//     FACT block on page 2. The evidence package rasterised page 1.
//   * KY AOC-334 draws the case number into `Court` and the participant's name
//     onto the rule captioned `Date`. Both values are present in the text, both
//     are spelled exactly as expected, and a check that asks "is the value
//     visible?" answers yes to both.
//
// So the contract now asks two harder questions. Not "is the value on the
// page" but "is it inside the box it was declared for", and not "does a
// picture exist" but "does a picture exist for every page that carries a
// field". A value in the wrong box is invisible to text search and obvious in
// geometry; a defect on page 2 is invisible to a page-1 raster and obvious to
// one that covers the form.
//
// Nothing here decides whether a family is approved. It decides whether the
// evidence is complete enough that approving it would mean anything.

import { pageRegions, groupIntoLines, extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import { regionProtectCategoryOf } from "./rcap-field-semantics.mjs";

export const EVIDENCE_CONTRACT_VERSION = "rcap-evidence-contract/v2-all-pages-and-geometry";

/** Slack, in points, allowed when asking whether a drawn value sits in a rect. */
const CONTAINMENT_TOLERANCE = 3;

/**
 * The pages a reviewer has to be able to look at.
 *
 * Every page carrying a widget — writable or protected — because a protected
 * page is exactly where an intrusion hides, and it is the page a page-1
 * package always omits. A form whose fields all sit on page 1 legitimately
 * needs one page; a form with a Certificate of Service on page 2 needs two,
 * and no amount of clean page-1 evidence substitutes.
 */
export function pagesRequiringRaster(census) {
  const pages = new Set();
  for (const field of census?.fields ?? []) {
    for (const widget of field.widgets ?? []) {
      if (Number.isInteger(widget.page)) pages.add(widget.page);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

/**
 * Is the raster coverage complete, and is it about the bytes it claims?
 *
 * Two failures, kept apart because they need different fixes. A missing page
 * means rasterise more; a hash that no longer matches means the picture is of
 * an artifact that has since been replaced, and a stale picture read as
 * current is worse than no picture — it is the failure mode that let a
 * corrected map sit beside an uncorrected artifact for a whole wave.
 */
export function rasterContract({ requiredPages, renderedPages, manifestArtifactSha256, currentArtifactSha256 }) {
  const rendered = new Set(renderedPages ?? []);
  const missingPages = (requiredPages ?? []).filter((p) => !rendered.has(p));
  const stale = Boolean(manifestArtifactSha256) && Boolean(currentArtifactSha256)
    && manifestArtifactSha256 !== currentArtifactSha256;

  const refusals = [];
  if (missingPages.length) {
    refusals.push({
      code: "RASTER_COVERAGE_INCOMPLETE",
      because: `page(s) ${missingPages.join(", ")} carry fields and were not rasterised; a page-1 package cannot approve a ${Math.max(...(requiredPages ?? [1]))}-page form`
    });
  }
  if (stale) {
    refusals.push({
      code: "RASTER_BOUND_TO_SUPERSEDED_BYTES",
      because: `the raster manifest names ${String(manifestArtifactSha256).slice(0, 16)}… and the committed artifact hashes to ${String(currentArtifactSha256).slice(0, 16)}…`
    });
  }
  return { requiredPages: requiredPages ?? [], renderedPages: [...rendered].sort((a, b) => a - b), missingPages, stale, refusals, complete: refusals.length === 0 };
}

/** The box a drawn run occupies, from its baseline, size and measured width. */
function boxOf(item) {
  const size = item.size ?? 10;
  return { x0: item.x, x1: item.x + (item.width ?? 0), y0: item.y - size * 0.25, y1: item.y + size * 0.75 };
}

const rectBox = (rect) => ({ x0: rect.x, x1: rect.x + rect.width, y0: rect.y, y1: rect.y + rect.height });

/**
 * Is a drawn run inside a widget rectangle?
 *
 * Vertical containment is checked on the baseline rather than the whole box,
 * because a glyph's ascender routinely rises past the top of the box it was
 * drawn into and that is not an escape. Horizontal containment asks that the
 * run start inside the rect: a value that starts inside and overruns the right
 * edge is a clipping defect, which the overflow report owns, not a placement
 * defect, which is what this decides.
 */
function inside(item, rect) {
  const box = rectBox(rect);
  const b = boxOf(item);
  const t = CONTAINMENT_TOLERANCE;
  return item.y >= box.y0 - t && item.y <= box.y1 + t && b.x0 >= box.x0 - t && b.x0 <= box.x1 + t;
}

/** Every widget on a page, flattened with the field it belongs to. */
function widgetsOfPage(census, page) {
  const out = [];
  for (const field of census?.fields ?? []) {
    for (const widget of field.widgets ?? []) {
      if (widget.page === page && widget.rect) out.push({ field: field.name, rect: widget.rect, effectiveLabel: field.effectiveLabel ?? null, regionHeading: field.regionHeading ?? null });
    }
  }
  return out;
}

/**
 * The printed region a point falls in, and whether that region is one the
 * participant does not complete.
 *
 * This is the check NC AOC-CR-288 needed and did not get. The binder refuses a
 * field whose NAME matches a protected category; nothing refused a field whose
 * name says nothing and whose rectangle sits three inches below a printed
 * heading reading FINDINGS OF FACT. The heading is on the page, in the bytes,
 * and asking about it costs one lookup.
 */
export function regionAt(regions, y) {
  for (const region of regions) {
    if (region.isDocumentTitle) continue;
    if (y <= region.yTop && y > region.yBottom) return region;
  }
  return null;
}

export function protectedRegionAt(regions, y) {
  const region = regionAt(regions, y);
  if (!region) return null;
  const category = regionProtectCategoryOf(region.heading);
  if (!category) return null;
  return { heading: region.heading, category };
}

/**
 * Audit where every participant value actually landed.
 *
 * `values` is the fixture value for each declared binding, keyed by field name,
 * so the question asked per binding is the specific one: did THIS value reach
 * THIS field's rectangle. Three answers are defects and they are reported
 * apart, because a value in the wrong box, a value in nobody's box and a value
 * that never appeared are three different bugs with three different fixes:
 *
 *   placedOutsideIntendedGeometry — declared, drawn, landed somewhere else;
 *   drawnIntoAProtectedSlot       — landed in a field or region the participant
 *                                   does not complete;
 *   declaredButNeverDrawn         — declared and absent from the page entirely.
 */
export function auditPlacements({ doc, census, map, values }) {
  const bindings = map?.bindings ?? [];
  const unwritable = new Set((map?.unwritableFields ?? []).map((f) => String(f.field ?? f.name ?? f)));
  const refused = new Set((map?.bindingRefusals ?? []).map((f) => String(f.field ?? f.name ?? f)));
  const declared = new Map(bindings.map((b) => [String(b.field), b]));
  const writable = (field) => declared.has(field) && !unwritable.has(field) && !refused.has(field);

  const placements = [];
  const drawnIntoAProtectedSlot = [];
  const placedOutsideIntendedGeometry = [];
  const satisfied = new Set();

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    const pageNumber = i + 1;
    const items = extractTextItems(pages[i]);
    const regions = pageRegions(pages[i], groupIntoLines(items), { isFirstPage: pageNumber === 1 });
    const widgets = widgetsOfPage(census, pageNumber);

    for (const item of items) {
      const text = String(item.text ?? "").trim();
      if (!text) continue;
      // The same fixture value can be declared for several fields, so an
      // occurrence is attributed to the field whose rectangle actually contains
      // it -- not to every field that shares the value. Attributing by value
      // alone produced one spurious row per (occurrence x field) pair and
      // buried the two real defects in a cross product of its own making.
      const values_here = Object.entries(values).filter(([, v]) => v && text.includes(v));
      if (!values_here.length) continue;

      // Widget rectangles overlap, and often almost exactly: NE DC 1:15 draws
      // `plaintiffdefendant` at [104,540 199x109] inside `adoptionof` at
      // [100,537 265x109], and NE CC 6:11's county box encloses its county
      // dropdown. Taking the first rectangle that contains the ink therefore
      // reported the value as intruding into a neighbouring field it had never
      // been written to. So among every containing rectangle: the one this
      // value was declared for wins, and failing that the smallest, which is
      // the most specific claim the page makes about that spot.
      const containing = widgets.filter((w) => inside(item, w.rect));
      const declaredHere = containing.find((w) => values_here.some(([field]) => field === w.field)) ?? null;
      const container = declaredHere
        ?? containing.slice().sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height))[0]
        ?? null;

      const owner = container && values_here.find(([field]) => field === container.field);
      const [forField, value] = owner ?? values_here[0];

      // Which printed section a value sits in is a fact about the BLANK form,
      // and the census recorded it from the blank source. Re-deriving it from
      // the filled artifact gets it wrong in a specific and misleading way: the
      // drawn value merges into the caption line beside it, so on NC AOC-CR-288
      // the petitioner's city read back as part of the heading "Name And
      // Address Of Petitioner's Attorney", and the value was accused of
      // intruding into a block it was nowhere near. The census association is
      // also column-aware, which a y-band lookup is not. So the recorded region
      // is used wherever a widget contains the value, and the band lookup
      // survives only for ink that sits in no widget at all -- where there is
      // no recorded region to consult and a rough answer beats none.
      const protectedRegion = container
        ? (regionProtectCategoryOf(container.regionHeading)
          ? { heading: container.regionHeading, category: regionProtectCategoryOf(container.regionHeading), basis: "recorded in the census from the blank source" }
          : null)
        : protectedRegionAt(regions, item.y);
      const record = {
        value, forField: owner ? forField : `${forField} (or another binding carrying the same value)`,
        page: pageNumber,
        drawnAt: { x: Number(item.x.toFixed(2)), y: Number(item.y.toFixed(2)), width: Number((item.width ?? 0).toFixed(2)) },
        landedInField: container?.field ?? null,
        landedInRegion: regionAt(regions, item.y)?.heading ?? null
      };
      placements.push(record);

      if (owner) satisfied.add(container.field);

      if (container && !writable(container.field)) {
        // The KY AOC-334 defect: the map is already right and the bytes did not
        // follow it. A value inside a field the family's own map calls
        // unwritable, refused, or does not declare at all.
        drawnIntoAProtectedSlot.push({ ...record,
          because: unwritable.has(container.field) ? `"${container.field}" is recorded unwritable in this family's own map`
            : refused.has(container.field) ? `"${container.field}" is recorded under bindingRefusals in this family's own map`
              : `no binding declares "${container.field}", so nothing authorised a value here` });
      } else if (protectedRegion) {
        // The NC AOC-CR-288 defect: the field name is innocent, the printed
        // heading above the rectangle is not, and only geometry can tell.
        drawnIntoAProtectedSlot.push({ ...record, protectedRegion,
          because: `drawn inside a page region headed "${protectedRegion.heading}", which is ${protectedRegion.category} territory whatever the field is called` });
      } else if (!container) {
        placedOutsideIntendedGeometry.push({ ...record,
          because: "drawn inside no widget rectangle on this page, so no declared binding accounts for it" });
      } else if (owner) {
        satisfied.add(container.field);
      } else {
        // Contained by a writable declared field, but not the one this value
        // was declared for -- and the value is shared, so which binding fed it
        // cannot be told apart here. Recorded, not accused.
        satisfied.add(container.field);
      }
    }
  }

  const declaredButNeverDrawn = [...declared.keys()]
    .filter((field) => values[field] && !satisfied.has(field))
    .filter((field) => !unwritable.has(field) && !refused.has(field))
    .map((field) => ({ forField: field, value: values[field],
      because: "the map declares this binding and the finalized bytes carry the value in its rectangle nowhere: a declared binding that silently produces nothing is neither written nor refused" }));

  const refusals = [];
  if (drawnIntoAProtectedSlot.length) {
    refusals.push({ code: "PARTICIPANT_VALUE_IN_PROTECTED_GEOMETRY",
      because: `${drawnIntoAProtectedSlot.length} participant value(s) landed in a field or page region the participant does not complete` });
  }
  if (placedOutsideIntendedGeometry.length) {
    refusals.push({ code: "VALUE_OUTSIDE_INTENDED_GEOMETRY",
      because: `${placedOutsideIntendedGeometry.length} drawn value(s) landed inside no declared rectangle` });
  }
  if (declaredButNeverDrawn.length) {
    refusals.push({ code: "DECLARED_BINDING_NEVER_DRAWN",
      because: `${declaredButNeverDrawn.length} declared binding(s) produced no ink in their own rectangle: ${declaredButNeverDrawn.map((d) => d.forField).join(", ")}` });
  }

  return { placements, drawnIntoAProtectedSlot, placedOutsideIntendedGeometry, declaredButNeverDrawn, refusals, clean: refusals.length === 0 };
}

/**
 * Written-versus-declared, in both directions.
 *
 * Reviewer A found the scan counting 7 written against a map declaring 5 and
 * passing, and 1 written against a map declaring 2 and passing, because it
 * never compared the two numbers. One comparison catches an undeclared write
 * and a silently dropped write, which were being reported as two separate
 * findings and are one missing check.
 */
export function reconcileWrittenAgainstDeclared({ writtenFields, declaredBindings, refusedFields = [] }) {
  const written = new Set((writtenFields ?? []).map(String));
  const declared = new Set((declaredBindings ?? []).map(String));
  // A binding the renderer refused and said why about is accounted for. The
  // defect this check exists to catch is the one that leaves no trace: KY
  // AOC-496.3's county dropdown was declared, produced nothing, and the record
  // said it was populated. A dropdown whose options do not include the fixture
  // county is a limit of the fixture, is written down as such, and is not the
  // same finding.
  const refused = new Set((refusedFields ?? []).map((f) => String(f?.field ?? f?.anchor ?? f?.name ?? f)));
  const writtenButNotDeclared = [...written].filter((f) => !declared.has(f));
  const declaredButNotWritten = [...declared].filter((f) => !written.has(f) && !refused.has(f));
  const declaredAndRefusedWithAReason = [...declared].filter((f) => !written.has(f) && refused.has(f));
  const refusals = [];
  if (writtenButNotDeclared.length) {
    refusals.push({ code: "WRITTEN_BUT_NOT_DECLARED", fields: writtenButNotDeclared,
      because: "the artifact draws into field(s) the map does not declare" });
  }
  if (declaredButNotWritten.length) {
    refusals.push({ code: "DECLARED_BUT_NOT_WRITTEN", fields: declaredButNotWritten,
      because: "the map declares binding(s) the artifact never draws, and neither refuses them" });
  }
  return { writtenCount: written.size, declaredCount: declared.size, writtenButNotDeclared,
    declaredButNotWritten, declaredAndRefusedWithAReason, refusals, balanced: refusals.length === 0 };
}

/**
 * The fixture value each declared binding was rendered from, keyed by field.
 *
 * Taken from the driver's own canonical fact table via the family's
 * populated-fields report, so the evidence asks about the values that were
 * actually drawn rather than a second table that can drift. Values shorter
 * than four characters are left out and named in `tooShortToLocate`: a
 * two-letter state code matches inside dozens of printed words, and a
 * placement finding built on that would be noise wearing a defect's clothes.
 */
export function placementValuesFor({ populatedFields, facts, minimumLength = 4 }) {
  const values = {};
  const tooShortToLocate = [];
  const noFactValue = [];
  const refusedAtRender = [];
  for (const row of populatedFields ?? []) {
    const field = String(row.field ?? "");
    // A binding the renderer refused for a recorded reason is not a silent
    // drop, and conflating the two would report the same finding for a form
    // whose county dropdown does not offer the fixture's county as for one
    // whose value vanished with no explanation. The first is a limit of the
    // fixture; the second is a defect.
    if (row.written === false) {
      refusedAtRender.push({ field, factId: row.factId ?? null, because: row.notWrittenBecause ?? "no reason recorded" });
      continue;
    }
    const value = facts?.[row.factId];
    if (typeof value !== "string" || !value) { noFactValue.push({ field, factId: row.factId ?? null }); continue; }
    if (value.length < minimumLength) { tooShortToLocate.push({ field, factId: row.factId, value }); continue; }
    values[field] = value;
  }
  return { values, tooShortToLocate, noFactValue, refusedAtRender };
}
