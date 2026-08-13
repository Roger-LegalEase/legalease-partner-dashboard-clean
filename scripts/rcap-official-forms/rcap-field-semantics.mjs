// Typed, fail-closed binding for official-form fields.
//
// The previous binder was permissive by construction: a field bound whenever
// its name matched any participant-ish pattern, and protection depended on a
// deny pattern having been thought of first. Anything unanticipated therefore
// defaulted to writable, which is the wrong direction for a document that gets
// filed in court.
//
// This module inverts that. Every field starts PROTECTED. A field becomes
// writable only when all of the following hold:
//
//   1. no protect rule matches it;
//   2. its PDF type is one this binder is willing to write (text or dropdown
//      -- never a checkbox, radio group, multi-select, button or signature,
//      because those encode legal elections rather than transcribed facts);
//   3. its name matches exactly one allowlisted fact descriptor;
//   4. the descriptor's declared value type is one the field can carry;
//   5. any descriptor marked `requiresExplicitMapping` has been named for this
//      exact field by the caller;
//   6. an indexed charge-row fact resolves to a row the caller actually
//      supplied.
//
// A field that fails any of these is reported with the reason it was refused,
// so a refusal is auditable rather than silent.

// --- PDF-level types --------------------------------------------------------
export const WRITABLE_PDF_TYPES = new Set(["text", "dropdown"]);

// --- protect rules ----------------------------------------------------------
// Deny-first. Each entry names the category so a refusal explains itself.
// Ordered most-specific first only where two categories could both match; the
// reported category is the first that fires.
export const PROTECT_RULES = [
  ["money", /\$|\bfee\b|\bfees\b|\bcost[s]?\b|\bamount\b|\bbalance\b|\bpaid\b|\bpayment\b|\brestitution\b|\bfine[s]?\b|\bsurcharge\b|\bdollar|\bowed\b|\barrears\b/],
  ["race", /\brace\b|\bethnic|\bskin\b|\bcomplexion\b/],
  ["responsible_official", /responsible\s*(official|party|person)|authorized\s*(official|representative|signer)|custodian\s*of\s*record|records?\s*officer|designee/],
  ["signature", /signature|\bsigned\b|\bsign\s*here\b|^\s*sign\b|\bsig\b|\binitials?\b/],
  ["notarization", /notar|jurat|acknowledg(ed|ment)\s*before\s*me|sworn\s*to\s*before|my\s*commission\s*expires|seal\s*of\s*office/],
  ["service_block", /certificate\s*of\s*service|proof\s*of\s*service|service\s*of\s*process|process\s*server|\bserved\s*(on|by|upon)\b|date\s*served|manner\s*of\s*service/],
  ["licensing_board", /licens(e|ing)\s*(board|authority|agency)|board\s*of\s*(nursing|medicine|pharmacy|education|examiners)|professional\s*board|certification\s*board/],
  ["agency", /\bagency\b|\bsheriff\b|\bpolice\b|law\s*enforcement|\bbureau\b|state\s*patrol|\bprobation\b|\bparole\b|department\s*of\s*(public\s*safety|justice|corrections)|\bdps\b|\bsbi\b|\bacic\b|\bapsin\b|\bfbi\b/],
  ["court", /\bjudge\b|magistrate|commissioner|hearing\s*officer|referee|so\s*ordered|it\s*is\s*(hereby\s*)?ordered|ordered\s*(and\s*)?adjudged|adjudged|\bdecree\b|is\s*(hereby\s*)?(granted|denied)|court\s*use\s*only|for\s*(court|office|clerk|official)\s*use|do\s*not\s*write|\bruling\b/],
  ["clerk", /\bclerk\b|deputy\s*clerk|file\s*stamp|filed\s*stamp|filing\s*stamp|court\s*seal|scan\s*num|\bbarcode\b|entered\s*on|\bdistribution\b/],
  ["prosecutor", /prosecut|district\s*attorney|commonwealth\s*s?\s*attorney|state\s*s?\s*attorney|county\s*attorney|solicitor/],
  ["attorney", /\battorney\b|\bcounsel\b|\besq\b|law\s*firm|bar\s*(no|num|number)/],
  // "Other", "additional" and "co-" mark a party who is not the participant.
  // Missouri's CR-145 has a widget named "Other Defendants" whose printed label
  // reads "Other (include name and address of agency)", and the participant's
  // own name was written into it: the petition named the petitioner as an
  // additional respondent agency. The qualifier is the whole signal -- a form
  // that says "other" is saying "not this person" -- so it protects the field
  // regardless of which party noun follows.
  ["outside_party", /\bopposing\b|third\s*party|\bvictim\b|\bcomplainant\b|\bemployer\b|\bwitness\b|\bco-?defendant\b|\b(other|others|additional|further|remaining|each)\s+(defendant|defendants|part(y|ies)|respondent|respondents|petitioner|petitioners|plaintiff|plaintiffs|person|persons|name|names)\b|\bother\s*\(/],
  ["disposition_or_hearing", /\bdisposition\b|hearing\s*(date|time|result)|\bsentenc(e|ing)\b|\bconvict(ed|ion)\b|\bplea\b|\bverdict\b/]
];

// --- allowlisted fact descriptors ------------------------------------------
// The ONLY things that may ever be written. Each declares the value type it
// carries and, where the fact is legally sensitive, that it may not bind
// without the caller naming the field explicitly.
export const FACT_DESCRIPTORS = [
  { factId: "participant.city_state_zip", valueType: "string", match: /city\s*state\s*zip/ },
  { factId: "participant.date_of_birth", valueType: "date", match: /\bdob\b|date\s*of\s*birth|birth\s*date/ },
  { factId: "participant.first_name", valueType: "string", match: /first\s*name/ },
  { factId: "participant.last_name", valueType: "string", match: /last\s*name|surname/ },
  { factId: "participant.middle_name", valueType: "string", match: /middle\s*(name|initial)/ },
  { factId: "participant.street_address", valueType: "string", match: /street\s*addr|mailing\s*addr|addr(ess)?\s*(line\s*)?\d|^\s*addr|\baddress\b/ },
  { factId: "participant.city", valueType: "string", match: /\bcity\b/ },
  { factId: "participant.zip", valueType: "string", match: /\bzip\b|postal/ },
  { factId: "participant.phone", valueType: "string", match: /\bphone\b|telephone/ },
  { factId: "participant.email", valueType: "string", match: /\bemail\b/ },
  { factId: "participant.state", valueType: "string", match: /\bstate\b/ },
  { factId: "matter.county", valueType: "string", match: /\bcounty\b/ },
  { factId: "matter.court", valueType: "string", match: /court\s*name|type\s*of\s*court|judicial\s*(district|circuit)/ },
  { factId: "matter.case_number", valueType: "string", match: /case\s*(no|num|#)|docket|cause\s*(no|num)|file\s*(no|num)|case\s*id/ },
  { factId: "matter.citation_number", valueType: "string", match: /citation\s*(no|num)/ },
  { factId: "participant.full_legal_name", valueType: "string", match: /printed\s*name|full\s*legal\s*name|your\s*name|petitioner|applicant|defendant|movant|\bdef\b|party\s*names?|case\s*name|\bname\b/ },
  { factId: "deterministic.filing_date", valueType: "date", match: /date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/ },
  // Legally sensitive dates. These describe the criminal event itself, and a
  // wrong value misstates the record to a court, so they never bind on a name
  // match alone -- the caller must name the field.
  { factId: "matter.arrest_date", valueType: "date", requiresExplicitMapping: true, match: /arrest\s*date|date\s*of\s*arrest/ },
  { factId: "matter.offense_date", valueType: "date", requiresExplicitMapping: true, match: /offense\s*date|date\s*of\s*offense|violation\s*date/ },
  { factId: "matter.conviction_date", valueType: "date", requiresExplicitMapping: true, match: /conviction\s*date/ },
  { factId: "matter.disposition_date", valueType: "date", requiresExplicitMapping: true, match: /disposition\s*date/ },
  { factId: "matter.charge", valueType: "string", requiresExplicitMapping: true, match: /\bcharge\b|\boffense\b|\bstatute\b|\bviolation\b|\bcount\b/ }
];

// Facts that describe one row of a charge table rather than the matter itself.
const ROW_FACTS = new Set([
  "matter.case_number", "matter.citation_number", "matter.charge",
  "matter.arrest_date", "matter.offense_date", "matter.conviction_date", "matter.disposition_date"
]);

// A caption fact is the only thing a court-issued order ever accepts.
export const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

// Field names arrive as camelCase, dotted paths, PascalCase and squashed
// lowercase, so every rule is matched against a haystack holding a
// separator-normalized and a fully squashed form at once.
export function haystack(name) {
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

/**
 * True when a field's name is an index rather than a description.
 *
 * Some forms name every widget by its position -- "1", "Text3", "fill_12",
 * "untitled" -- and matching an allowlisted fact against those either refuses
 * the whole form or, worse, matches something by accident. A positional name
 * is not weak evidence about a field's subject; it is no evidence, and the
 * printed label has to carry the question.
 */
export function isPositionalFieldName(name) {
  const raw = String(name ?? "").trim();
  if (raw === "") return true;
  return /^\d{1,3}$/.test(raw)
    || /^(text|field|fld|form|input|box|line|item|untitled|undefined|fill)[\s._-]*\d{0,3}$/i.test(raw)
    || /^(topmostsubform|form1)?\[\d+\]$/i.test(raw);
}

export function protectCategoryOf(name) {
  const hay = haystack(name);
  for (const [category, re] of PROTECT_RULES) if (re.test(hay)) return category;
  return null;
}

function rowIndexOf(name) {
  const m = /^(.*?)(\d{1,2})$/.exec(String(name).trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 40 ? n - 1 : null;
}

/**
 * Decides, for one field, whether anything may be written into it.
 *
 * Returns { writable: false, reason, category? } or
 * { writable: true, factId, valueType, rowIndex? }.
 *
 * `options.explicitMappings` is a map of fieldName -> factId supplied by the
 * caller. It is the only way a `requiresExplicitMapping` descriptor can bind,
 * and it can never override a protect rule or a type guard.
 */
export function decideBinding(field, options = {}) {
  const { name, pdfType, effectiveLabel } = field;
  const {
    explicitMappings = {},
    captionOnly = false,
    availableChargeRows = 0,
    documentAcceptsFill = true
  } = options;

  if (!documentAcceptsFill) return { writable: false, reason: "document_does_not_accept_fill" };

  // Either channel may protect a field. Only one of them may select for it,
  // and which one depends on whether the name means anything.
  //
  // A printed label is inferred from position, and position lies often enough
  // to matter: on Missouri's CR-145 the text above the "Case Number" widget is
  // the caption line "COUNTY, MISSOURI", and above "Criminal Case Number" is a
  // sentence of body prose. Where the name is a real name, it is the better
  // evidence -- it is the string the form's author bound the widget to -- and
  // letting a misread label choose the fact writes a county into a case number.
  //
  // Where the name is positional it is not evidence at all. Vermont's
  // 200-00631 names its ten widgets "1" through "10"; the form prints "Name of
  // Person Requesting Sealing Order" above the first and "Name of Requestor's
  // Criminal Justice Agency" above the second. Insisting on the name there
  // does not protect anything, it just refuses every field on the form.
  //
  // Protection is not symmetric with selection, because the costs are not
  // symmetric. An extra protection leaves a field blank for a human to fill; an
  // extra selection files the wrong fact with a court. So both channels
  // protect, and the same imprecise reading that cannot be trusted to choose a
  // fact is trusted to veto one -- which is what catches "Other Defendants"
  // sitting under "Other (include name and address of agency)".
  const labelCategory = effectiveLabel ? protectCategoryOf(effectiveLabel) : null;
  const nameCategory = protectCategoryOf(name);
  const category = nameCategory ?? labelCategory;
  if (category) {
    return {
      writable: false, reason: "protected_category", category,
      protectedBy: nameCategory ? "field_name" : "printed_label",
      printedLabel: nameCategory ? null : effectiveLabel
    };
  }

  if (!WRITABLE_PDF_TYPES.has(pdfType)) {
    return { writable: false, reason: "non_text_field_type", category: "type_guard", pdfType };
  }

  const positional = isPositionalFieldName(name);
  if (positional && !effectiveLabel) {
    return { writable: false, reason: "positional_field_name_with_no_measured_label", category: "unidentifiable_field" };
  }
  const subject = positional ? effectiveLabel : name;
  const subjectBasis = positional ? "measured_printed_label_positional_widget_name" : "acroform_field_name";

  const hay = haystack(subject);
  const matches = FACT_DESCRIPTORS.filter((d) => d.match.test(hay));
  if (matches.length === 0) return { writable: false, reason: "no_allowlisted_fact_matches" };

  // Most-specific-first ordering makes the first match the intended one; a
  // descriptor list is authored, not inferred, so ties are a defect in the
  // list rather than something to resolve at runtime.
  const descriptor = matches[0];

  const explicit = explicitMappings[name];
  if (descriptor.requiresExplicitMapping && explicit !== descriptor.factId) {
    return { writable: false, reason: "requires_explicit_mapping", category: "sensitive_fact", factId: descriptor.factId };
  }
  if (explicit && explicit !== descriptor.factId) {
    return { writable: false, reason: "explicit_mapping_conflicts_with_field_name", category: "mapping_conflict", factId: descriptor.factId };
  }

  if (captionOnly && !CAPTION_FACTS.has(descriptor.factId)) {
    return { writable: false, reason: "court_issued_order_accepts_caption_facts_only", category: "court", factId: descriptor.factId };
  }

  // A charge table repeats one row of facts N times. Row N may only be written
  // when the caller actually supplied an Nth charge; otherwise the row is left
  // alone rather than stamped with the first charge.
  if (ROW_FACTS.has(descriptor.factId)) {
    // Only a name that repeats a stem carries a row index -- "CaseNo1",
    // "CaseNo2". A purely positional name is an index of widgets, not of
    // charges: Vermont's tenth widget is called "10" and its printed label is
    // "Docket number", and reading that as charge row ten refuses the docket
    // number of every matter with fewer than ten charges.
    const row = positional ? null : rowIndexOf(name);
    if (row !== null) {
      if (row >= availableChargeRows) {
        return { writable: false, reason: "repeating_row_without_indexed_fact", category: "charge_row", factId: descriptor.factId, rowIndex: row };
      }
      const leaf = descriptor.factId.slice("matter.".length);
      return { writable: true, factId: `matter.charges[${row}].${leaf}`, valueType: descriptor.valueType, rowIndex: row, subject, subjectBasis };
    }
  }

  return { writable: true, factId: descriptor.factId, valueType: descriptor.valueType, subject, subjectBasis };
}

/** Confirms a resolved value matches the type its descriptor declared. */
export function valueMatchesType(value, valueType) {
  if (value === undefined || value === null) return false;
  const s = String(value);
  if (s.trim() === "") return false;
  if (valueType === "date") return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  return true;
}

/** Resolves a plain or indexed charge-row fact id against a fact set. */
export function resolveFact(facts, factId) {
  const m = /^matter\.charges\[(\d+)\]\.(.+)$/.exec(factId);
  if (!m) return facts[factId];
  return facts["matter.charges"]?.[Number(m[1])]?.[m[2]];
}
