// The fields this product may never write, and the check that proves it didn't.
//
// The specification names a protected category per field, but a specification
// is a claim. This module is the independent side: it re-derives protection
// from the field's own name and from the text the form prints beside it, and a
// specification that disagrees with it is rejected rather than trusted.
//
// So a future edit that quietly reclassifies `Sig1_Signature` as participant
// text does not weaken anything — the name still matches a signature rule, the
// re-derivation still says protected, and the specification fails validation.
import type {
  ColoradoFieldSpec,
  ColoradoProtectedCategory,
} from "./types";

interface ProtectionRule {
  readonly category: ColoradoProtectedCategory;
  /** Matched against the AcroForm field name. */
  readonly namePattern: RegExp;
  /** Matched against the label printed beside the widget. */
  readonly labelPattern: RegExp;
  /**
   * When set, the label alone is not enough: the field's section must match
   * too.
   *
   * One rule needs this. "Date:" is the whole label of the field beside a
   * signature line and also the whole label of the field that records when an
   * appellate court ruled, and only the first is an execution date. Reading
   * the label alone protected JDF 612's appeal-result date, which is an
   * ordinary case fact the participant is asked for.
   */
  readonly labelRequiresSection?: RegExp;
  readonly reason: string;
}

/**
 * Every actor whose fields are off limits. A rule fires when either the field
 * name or the printed label matches, because the two forms disagree about
 * which one carries the meaning: JDF 612 names its execution block
 * `Sig1_Signature` and prints "Signature:", while JDF 417 names the same block
 * `Sig` and prints the same label.
 */
const PROTECTION_RULES: readonly ProtectionRule[] = [
  {
    category: "judicial_signature",
    namePattern: /(^|[^a-z])(judge|judicial|magistrate)/i,
    labelPattern: /\b(judge|magistrate|judicial officer)\b/i,
    reason: "A judicial officer signs this. No party may write it.",
  },
  {
    category: "judicial_finding",
    namePattern: /(finding|orders?_?the|decree|adjudicat)/i,
    labelPattern: /\b(the court (finds|orders|concludes)|it is (so )?ordered|hereby ordered)\b/i,
    reason: "A judicial finding. Only the court states it.",
  },
  {
    category: "clerk_only",
    namePattern: /\bclerk\b/i,
    labelPattern: /\b(clerk|deputy clerk|filed on behalf of the court)\b/i,
    reason: "The clerk of court completes this.",
  },
  {
    category: "prosecutor_only",
    namePattern: /(district_?attorney|prosecut)/i,
    labelPattern: /\b(district attorney(?:'s)? (?:signature|use)|prosecuting attorney(?:'s)? signature)\b/i,
    reason: "The prosecuting authority completes this.",
  },
  {
    category: "agency_only",
    namePattern: /(agency_?use|agency_?only|cbi_?use)/i,
    labelPattern: /\bfor agency use\b/i,
    reason: "The receiving agency completes this.",
  },
  {
    category: "court_use_only",
    namePattern: /(court_?use|event_?code)/i,
    labelPattern: /\b(for court use only|this box is for court use only|case event code)\b/i,
    reason: "The form marks this box for court use only.",
  },
  {
    category: "counsel_attestation",
    namePattern: /^Sig_(Esq|Bar)$/,
    labelPattern: /\besq\.?\s*(reg(?:istration)?\.?\s*no)?\b/i,
    reason:
      "Counsel's attestation and registration number. The product is not counsel and may not assert a bar admission.",
  },
  {
    category: "counsel_signature",
    namePattern: /(Sig_?Aty|Sig_?Lawyer|counsel_?sign|attorney_?sign)/i,
    labelPattern: /\bcounsel signature\b/i,
    reason: "Counsel executes this personally.",
  },
  {
    category: "participant_execution_date",
    namePattern: /^Sig\d*_?Date$/i,
    labelPattern: /^\s*date\s*:?\s*$/i,
    labelRequiresSection: /sign\s*&?\s*date|signature/i,
    reason:
      "The date inside the execution block. Writing it asserts when the participant signed, which has not happened yet.",
  },
  {
    category: "participant_signature",
    namePattern: /^Sig(\d+_?Signature)?$/i,
    labelPattern: /\bsignature\b/i,
    reason: "The participant executes this personally.",
  },
];

/**
 * The protection a field attracts on its own evidence, or null.
 *
 * The execution-date rule is checked before the signature rule: `Sig1_Date`
 * matches the signature name pattern's prefix under a looser reading, and the
 * date is the more precise account of what the field is.
 */
export function derivedProtection(
  fieldName: string,
  label: string,
  section = "",
): { category: ColoradoProtectedCategory; reason: string } | null {
  for (const rule of PROTECTION_RULES) {
    if (rule.namePattern.test(fieldName)) {
      return { category: rule.category, reason: rule.reason };
    }
    if (!rule.labelPattern.test(label)) continue;
    if (rule.labelRequiresSection && !rule.labelRequiresSection.test(section)) continue;
    return { category: rule.category, reason: rule.reason };
  }
  return null;
}

export interface ProtectionDisagreement {
  readonly field: string;
  readonly problem:
    | "specification_writes_a_field_that_re_derives_as_protected"
    | "specification_protects_a_field_with_no_category"
    | "specification_category_disagrees_with_re_derivation";
  readonly specified: ColoradoProtectedCategory | null;
  readonly derived: ColoradoProtectedCategory | null;
  readonly detail: string;
}

/**
 * Re-derives protection for every field and reports where the specification
 * and the re-derivation disagree.
 *
 * A specification that protects a field the rules do not reach is accepted:
 * review may withhold more than the rules require, and that direction is safe.
 * The reverse — writing a field the rules protect — is always a disagreement.
 */
export function auditProtection(
  fields: readonly ColoradoFieldSpec[],
): readonly ProtectionDisagreement[] {
  const problems: ProtectionDisagreement[] = [];
  for (const field of fields) {
    const derived = derivedProtection(field.field, field.label, field.section);
    const isProtected = field.fieldClass === "protected";

    if (!isProtected && derived) {
      problems.push({
        field: field.field,
        problem: "specification_writes_a_field_that_re_derives_as_protected",
        specified: null,
        derived: derived.category,
        detail: `${derived.reason} The specification classes it ${field.fieldClass}.`,
      });
      continue;
    }
    if (isProtected && field.protectedCategory === null) {
      problems.push({
        field: field.field,
        problem: "specification_protects_a_field_with_no_category",
        specified: null,
        derived: derived?.category ?? null,
        detail: "A protected field must name the actor it is reserved for.",
      });
      continue;
    }
    if (isProtected && derived && derived.category !== field.protectedCategory) {
      problems.push({
        field: field.field,
        problem: "specification_category_disagrees_with_re_derivation",
        specified: field.protectedCategory,
        derived: derived.category,
        detail: `The field's own name and label read as ${derived.category}.`,
      });
    }
  }
  return problems;
}

/** The categories no Colorado field may ever be written under. */
export const COLORADO_PROTECTED_CATEGORIES: readonly ColoradoProtectedCategory[] = [
  "judicial_signature",
  "judicial_finding",
  "clerk_only",
  "prosecutor_only",
  "agency_only",
  "court_use_only",
  "participant_signature",
  "participant_execution_date",
  "counsel_signature",
  "counsel_attestation",
];
