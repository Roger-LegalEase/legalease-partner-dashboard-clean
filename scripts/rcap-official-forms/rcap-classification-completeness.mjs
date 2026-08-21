// The two completeness counters, derived once, for every classification writer.
//
// Both platform-ready approval channels ask the same arithmetic question of a
// family's field-classification.json: how many fields or anchors did this
// document actually declare, and how many of them carry a terminal disposition.
// Only `rcap-field-classification/v2-complete` answered it. The other three
// writers emitted entries and class counts and no denominator at all, so a
// classification that had silently stopped short of the census read exactly
// like one that had covered it — which is the defect the counters exist to
// make impossible.
//
// The contract implemented here is v2-complete's, unchanged:
//
//   AcroForm      discoveredFieldsOrAnchors = field-census.json fields[] length
//   flat overlay  discoveredFieldsOrAnchors = overlay-profile.json anchors[]
//                                             plus deliberatelyUnbound[]
//   either        classifiedFieldsOrAnchors = the entries carrying exactly one
//                                             terminal class or refusal
//
// and the invariant 0 <= classified <= discovered, with approval completeness
// only at equality.
//
// WIDGETS ARE NOT FIELDS. AK TF-800 declares 26 AcroForm fields across 29
// widgets, two of them drawn twice. The canonical census collapses widgets into
// the field that owns them, so the denominator is 26; counting widgets would
// report a form as under-classified forever, and counting them the other way
// would let a field be classified twice and still balance. The census is the
// authority on what one field is, and this module never recounts it.

/** The controlling model. Every other writer emits the same two counters. */
export const COMPLETENESS_CONTRACT = "rcap-field-classification/v2-complete";

/**
 * Every terminal disposition any retained writer emits, named as an allowlist.
 *
 * An allowlist rather than a denylist for the same reason the writable classes
 * are one: a class nobody has thought about yet must read as UNCLASSIFIED, so a
 * tenth class added to a classifier drops the classified count below the
 * denominator and the gate refuses the family, rather than silently passing an
 * entry whose meaning no reader has agreed on.
 *
 * The refusals are terminal dispositions too. `protected`, `prohibited`,
 * `court_or_agency`, `outside_party`, `signature` and `not_applicable` each say
 * the packet will write nothing here and why, which is an answer; only an
 * absent or unrecognised disposition is not.
 */
export const TERMINAL_DISPOSITIONS = new Set([
  // rcap-field-classification/v4-nine-class
  "participant", "deterministic", "manual", "unused",
  "signature", "protected", "prohibited", "court_or_agency", "outside_party",
  // rcap-field-classification/v1, as emitted by the census upgrade pass
  "manual_participant", "prosecutor_or_outside_party",
  // rcap-field-classification/v2-complete and the shared classifier
  "participant_writable", "not_applicable"
]);

export const ACROFORM_DENOMINATOR_BASIS = "field-census.json fields[] (canonical first-hand census)";
export const FLAT_OVERLAY_DENOMINATOR_BASIS = "overlay-profile.json anchors + deliberatelyUnbound (v2-complete denominator)";

/** The disposition an entry carries, whichever key its schema records it under. */
export const dispositionOf = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry.class ?? entry.classification ?? null;
  return typeof raw === "string" && TERMINAL_DISPOSITIONS.has(raw) ? raw : null;
};

/** Entries carrying exactly one terminal class or refusal. Nothing else counts. */
export function classifiedCount(entries) {
  if (!Array.isArray(entries)) return 0;
  return entries.filter((entry) => dispositionOf(entry) !== null).length;
}

/**
 * The AcroForm denominator: the canonical census field count.
 *
 * `fields[]` is the count, not `fieldCount` — the recorded total is a claim
 * about the array and the array is the census. Where the two disagree the
 * census package is internally inconsistent, which this reports rather than
 * silently resolving in either direction.
 */
export function acroformDenominator(census) {
  const fields = Array.isArray(census?.fields) ? census.fields : null;
  if (!fields) return { count: 0, disagreement: null };
  const recorded = Number.isInteger(census.fieldCount) ? census.fieldCount : null;
  return {
    count: fields.length,
    disagreement: recorded !== null && recorded !== fields.length
      ? `field-census.json reports fieldCount ${recorded} against ${fields.length} fields[]`
      : null
  };
}

/** The flat-overlay denominator: measured anchors plus deliberate refusals. */
export function flatOverlayDenominator(profile) {
  const anchors = Array.isArray(profile?.anchors) ? profile.anchors.length : 0;
  const unbound = Array.isArray(profile?.deliberatelyUnbound) ? profile.deliberatelyUnbound.length : 0;
  return { count: anchors + unbound, anchors, deliberatelyUnbound: unbound };
}

/**
 * The counters and the deterministic metadata that says where they came from.
 *
 * `denominatorBasis` is emitted beside the numbers on purpose: a bare count
 * cannot be re-derived by a reader who does not already know which file it was
 * taken from, and a denominator nobody can re-derive is not evidence.
 */
export function completenessCounters({ familyKind, census = null, overlayProfile = null, entries = [] }) {
  const flat = familyKind === "flat_overlay";
  const discovered = flat ? flatOverlayDenominator(overlayProfile).count : acroformDenominator(census).count;
  const classified = classifiedCount(entries);
  return {
    denominatorBasis: flat ? FLAT_OVERLAY_DENOMINATOR_BASIS : ACROFORM_DENOMINATOR_BASIS,
    discoveredFieldsOrAnchors: discovered,
    classifiedFieldsOrAnchors: classified,
    complete: discovered > 0 && classified === discovered
  };
}

/**
 * Every way the counters on a classification record can be wrong, named.
 *
 * Returns the failures rather than a boolean, because "the denominator is
 * missing" and "the denominator disagrees with the census" are different
 * defects with different remedies, and a caller that has to guess will guess.
 */
export function completenessFailures(record, { census = null, overlayProfile = null, familyKind = null, label = "the classification" } = {}) {
  const out = [];
  if (!record || typeof record !== "object") return [`${label}: there is no classification record`];

  const entries = Array.isArray(record.entries) ? record.entries : [];
  const discovered = record.discoveredFieldsOrAnchors;
  const classified = record.classifiedFieldsOrAnchors;

  if (!Number.isInteger(discovered)) out.push(`${label}: carries no discoveredFieldsOrAnchors`);
  if (!Number.isInteger(classified)) out.push(`${label}: carries no classifiedFieldsOrAnchors`);
  if (!Number.isInteger(discovered) || !Number.isInteger(classified)) return out;

  if (discovered < 0) out.push(`${label}: discoveredFieldsOrAnchors is negative (${discovered})`);
  if (classified < 0) out.push(`${label}: classifiedFieldsOrAnchors is negative (${classified})`);
  if (classified > discovered) {
    out.push(`${label}: classified (${classified}) exceeds discovered (${discovered}), so the record claims to have classified fields the document does not declare`);
  }

  // The count has to be of the entries that are actually there. A falsified
  // pair balances perfectly and hides an unclassified entry, so the entries are
  // recounted rather than trusted.
  const recounted = classifiedCount(entries);
  if (recounted !== classified) {
    out.push(`${label}: reports ${classified} classified against ${recounted} entries carrying a terminal disposition`);
  }
  const unresolved = entries.filter((entry) => dispositionOf(entry) === null).length;
  if (unresolved > 0) {
    out.push(`${label}: ${unresolved} entr(y/ies) carry no recognised terminal class or refusal`);
  }

  // And the denominator has to be the census, not a number that agrees with
  // itself. This is the clause that catches a widget count standing in for a
  // field count.
  const kind = familyKind ?? (overlayProfile ? "flat_overlay" : "acroform");
  if (kind === "flat_overlay") {
    if (overlayProfile) {
      const expected = flatOverlayDenominator(overlayProfile);
      if (expected.count !== discovered) {
        out.push(`${label}: reports ${discovered} discovered against ${expected.count} measured (${expected.anchors} anchor(s) plus ${expected.deliberatelyUnbound} deliberately unbound)`);
      }
    }
  } else if (census) {
    const expected = acroformDenominator(census);
    if (expected.disagreement) out.push(`${label}: ${expected.disagreement}`);
    if (expected.count !== discovered) {
      out.push(`${label}: reports ${discovered} discovered against ${expected.count} field(s) in the canonical census`);
    }
    // Widgets are the other number in the census, and it is not this one.
    const widgets = (Array.isArray(census.fields) ? census.fields : [])
      .reduce((n, field) => n + (Array.isArray(field.widgets) ? field.widgets.length : 0), 0);
    if (widgets !== expected.count && discovered === widgets) {
      out.push(`${label}: reports ${discovered} discovered, which is this form's WIDGET count; the census collapses ${widgets} widget(s) into ${expected.count} field(s) and the field is the unit`);
    }
  }

  if (record.complete !== undefined && record.complete !== (discovered > 0 && classified === discovered)) {
    out.push(`${label}: records complete=${record.complete} against ${classified}/${discovered}`);
  }
  return out;
}
