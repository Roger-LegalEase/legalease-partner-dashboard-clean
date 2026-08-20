// The one classification contract every retained form answers.
//
// A form's classification file used to be free-form, and CR-266 was put forward
// with one carrying zero entries while a separate report independently asserted
// a signature class and four manual fields — two artifacts describing one form,
// one of them blank. A classification that can be empty is not a classification;
// it is an absence with a filename.
//
// So the rule is arithmetic. Every AcroForm field the document declares and
// every flat-overlay anchor the geometry measured must appear exactly once, in
// exactly one class, and classified must equal discovered. There is no
// unresolved bucket and no default-writable.
//
// EVERY FIELD STARTS PROTECTED. A field becomes participant_writable only by
// clearing the shared semantic gate — which reads printed labels, geometry and
// the allowlisted fact descriptors, never a field name alone — and by naming
// the canonical participant data key it carries.
import crypto from "node:crypto";

import { decideBinding, protectCategoryOf } from "./rcap-field-semantics.mjs";

export const CLASSIFICATION_SCHEMA = "rcap-field-classification/v1";

export const CLASSIFICATIONS = ["participant_writable", "protected", "not_applicable"];

/**
 * The categories that are protected before anything else is considered.
 *
 * Each names a thing a participant must not author: someone else's decision,
 * someone else's identity, a judicial act, money, or a value whose meaning is
 * unresolved. A field matching one of these is protected even if a fact
 * descriptor would otherwise have matched its label.
 */
export const DEFAULT_PROTECTED_CATEGORIES = [
  "judge", "clerk", "prosecutor", "attorney", "court_staff", "responsible_official",
  "agency_decision", "grant_or_denial", "judicial_finding", "judicial_date",
  "signature", "notarization", "service_certification", "outside_party_address",
  "legal_conclusion", "money", "sensitive_classification", "ambiguous_checkbox",
  "unindexed_charge_row"
];

const PROTECTED_CATEGORY_SET = new Set(DEFAULT_PROTECTED_CATEGORIES);

/** Categories the semantic layer emits, mapped onto the contract's names. */
const CATEGORY_ALIASES = new Map([
  ["court", "judge"],
  ["agency", "agency_decision"],
  ["licensing_board", "agency_decision"],
  ["outside_party", "outside_party_address"],
  ["disposition_or_hearing", "judicial_finding"],
  ["notary", "notarization"],
  ["service", "service_certification"],
  ["unindexed_charge_row", "unindexed_charge_row"]
]);

const normalizeCategory = (category) => {
  if (!category) return null;
  const mapped = CATEGORY_ALIASES.get(category) ?? category;
  return PROTECTED_CATEGORY_SET.has(mapped) ? mapped : "legal_conclusion";
};

const hashJson = (value) => crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

/**
 * Classify one discovered field or measured anchor.
 *
 * `item` carries what was actually found: a stable id, the page, the printed
 * label, the geometry, and the field type. Nothing is decided from the id alone.
 */
export function classifyItem(item, options = {}) {
  const {
    id, page = null, printedLabel = "", geometry = null,
    fieldType = "text", sourceEvidence = "discovered", captionOnly = false
  } = item;

  const base = {
    id,
    page,
    printedLabel,
    geometry,
    fieldType,
    sourceEvidence,
    reviewState: options.reviewState ?? "generated_pending_independent_review"
  };

  const category = normalizeCategory(protectCategoryOf(printedLabel || id));
  if (category) {
    return {
      ...base,
      classification: "protected",
      participantDataKey: null,
      protectionCategory: category,
      reason: `the printed label names a ${category.replace(/_/g, " ")}, which a participant must not author`
    };
  }

  // A measured flat-overlay anchor is a place to draw text, so it enters the
  // semantic gate as text. Everything else keeps the type the document declared.
  const decision = decideBinding(
    { name: id, pdfType: fieldType === "flat_anchor" ? "text" : fieldType, effectiveLabel: printedLabel || id },
    { captionOnly, availableChargeRows: options.availableChargeRows ?? 0 }
  );

  if (decision.writable && decision.factId) {
    return {
      ...base,
      classification: "participant_writable",
      participantDataKey: decision.factId,
      protectionCategory: null,
      reason: `the printed label matches the allowlisted fact ${decision.factId}`
    };
  }

  // A checkbox or radio whose meaning is not resolved is protected, not
  // ignored: ticking the wrong box on a filing is an assertion, and an
  // unresolved one is an assertion nobody checked.
  if (decision.reason === "non_text_field_type") {
    const interactive = /check|radio|button|choice/i.test(String(fieldType));
    return interactive
      ? {
        ...base,
        classification: "protected",
        participantDataKey: null,
        protectionCategory: "ambiguous_checkbox",
        reason: `${fieldType} carries no resolved meaning, and ticking the wrong box on a filing is an assertion`
      }
      : {
        ...base,
        classification: "not_applicable",
        participantDataKey: null,
        protectionCategory: null,
        reason: `${fieldType} is not a place participant text is written`
      };
  }

  // A field nothing may write and nothing protects is not participant data at
  // all: a decorative rule, a page number, a caption with no blank beside it.
  if (decision.reason === "no_allowlisted_fact_matches") {
    return {
      ...base,
      classification: "not_applicable",
      participantDataKey: null,
      protectionCategory: null,
      reason: "no allowlisted participant fact matches this label, and it names no protected role"
    };
  }

  return {
    ...base,
    classification: "protected",
    participantDataKey: null,
    protectionCategory: normalizeCategory(decision.category) ?? "legal_conclusion",
    reason: decision.reason ?? "refused by the shared semantic gate"
  };
}

/**
 * The whole classification for one form.
 *
 * `discovered` is every AcroForm field the document declares plus every anchor
 * the content-stream geometry measured. Both are required: a form classified on
 * its AcroForm fields alone leaves every flat-overlay write box unaccounted for,
 * which is how a blank classification passed review.
 */
export function classifyForm({ jurisdiction, documentId, discovered, options = {} }) {
  const entries = discovered.map((item) => classifyItem(item, options));
  const counts = {
    discovered: discovered.length,
    classified: entries.length,
    participant_writable: entries.filter((e) => e.classification === "participant_writable").length,
    protected: entries.filter((e) => e.classification === "protected").length,
    not_applicable: entries.filter((e) => e.classification === "not_applicable").length
  };
  const record = {
    schemaVersion: CLASSIFICATION_SCHEMA,
    jurisdiction,
    documentId,
    counts,
    entries
  };
  return { ...record, classificationSha256: hashJson({ ...record, classificationSha256: undefined }) };
}

/**
 * Every way a classification can be wrong, named.
 *
 * Returns the list of failures rather than a boolean: "the file is empty" and
 * "one field is missing" are different defects, and a caller that has to guess
 * which one it hit will guess.
 */
export function classificationFailures(record, discovered) {
  const out = [];
  if (!record || record.schemaVersion !== CLASSIFICATION_SCHEMA) {
    return ["no classification record, or an unrecognised schema"];
  }
  const entries = Array.isArray(record.entries) ? record.entries : [];
  if (entries.length === 0) out.push("the classification is empty, which is an absence rather than a classification");

  const seen = new Map();
  for (const entry of entries) {
    if (!entry.id) { out.push("an entry carries no field or anchor id"); continue; }
    if (seen.has(entry.id)) out.push(`${entry.id} appears in more than one class`);
    seen.set(entry.id, entry);
    if (!CLASSIFICATIONS.includes(entry.classification)) {
      out.push(`${entry.id} carries the unknown classification ${JSON.stringify(entry.classification)}`);
    }
    if (entry.classification === "participant_writable") {
      if (!entry.participantDataKey) out.push(`${entry.id} is writable but names no canonical participant data key`);
      if (entry.protectionCategory) out.push(`${entry.id} is writable and protected at once`);
    }
    if (entry.classification === "protected") {
      if (entry.participantDataKey) out.push(`${entry.id} is protected but carries participant data`);
      if (!entry.protectionCategory) out.push(`${entry.id} is protected but names no protection category`);
    }
    if (!entry.reason) out.push(`${entry.id} carries no reason`);
    if (entry.page == null && entry.geometry == null) out.push(`${entry.id} carries neither a page nor geometry`);
  }

  const discoveredIds = new Set((discovered ?? []).map((d) => d.id));
  for (const id of discoveredIds) {
    if (!seen.has(id)) out.push(`${id} was discovered on the form and is not classified`);
  }
  for (const id of seen.keys()) {
    if (discoveredIds.size > 0 && !discoveredIds.has(id)) {
      out.push(`${id} is classified but is not a field or anchor this form has`);
    }
  }

  const counts = record.counts ?? {};
  if (discoveredIds.size > 0 && counts.discovered !== discoveredIds.size) {
    out.push(`the record reports ${counts.discovered} discovered against ${discoveredIds.size} actually found`);
  }
  if (counts.classified !== entries.length) {
    out.push(`the record reports ${counts.classified} classified against ${entries.length} entries`);
  }
  if (counts.discovered !== counts.classified) {
    out.push(`classified (${counts.classified}) does not equal discovered (${counts.discovered})`);
  }
  return out;
}
