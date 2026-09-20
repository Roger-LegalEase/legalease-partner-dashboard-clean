// Decides, for one set of participant facts, exactly what would be written on
// the form and what would not.
//
// The binder produces a plan, never a PDF. Keeping the decision separate from
// the write is what makes it checkable: the plan can be compared against the
// committed field map, mutated to prove a refusal is mechanical, and asserted
// against the bytes of a rendered artifact, none of which needs the official
// binary to be present.
//
// Every field reaches exactly one outcome. There is no path on which a field
// is written without a specification entry, a fact, and a satisfied condition.
import type {
  ColoradoBindingOutcome,
  ColoradoBindingPlan,
  ColoradoChargeFact,
  ColoradoFactSet,
  ColoradoFieldSpec,
  ColoradoFormSpec,
  ColoradoRefusalReason,
} from "./types";

function refuse(
  spec: ColoradoFieldSpec,
  refusal: ColoradoRefusalReason,
): ColoradoBindingOutcome {
  return {
    field: spec.field,
    control: spec.control,
    fieldClass: spec.fieldClass,
    written: false,
    factId: spec.factId,
    value: null,
    refusal,
    protectedCategory: spec.protectedCategory,
  };
}

function write(spec: ColoradoFieldSpec, value: string): ColoradoBindingOutcome {
  return {
    field: spec.field,
    control: spec.control,
    fieldClass: spec.fieldClass,
    written: true,
    factId: spec.factId,
    value,
    refusal: null,
    protectedCategory: null,
  };
}

function isChargeList(value: unknown): value is readonly ColoradoChargeFact[] {
  return Array.isArray(value);
}

/**
 * The scalar a field draws on.
 *
 * The offence rows are the one indexed case: `matter.charges[].charge` reads
 * the charge out of the row's own entry, and a row whose entry does not exist
 * resolves to nothing rather than to the next row's charge.
 */
function resolveFact(spec: ColoradoFieldSpec, facts: ColoradoFactSet): string | null {
  if (spec.factId === null) return null;

  if (spec.factId.startsWith("matter.charges[]")) {
    const charges = facts["matter.charges"];
    if (!isChargeList(charges)) return null;
    if (spec.repeatIndex === null) return null;
    const charge = charges[spec.repeatIndex];
    if (charge === undefined) return null;
    const part = spec.factId.endsWith(".grade") ? charge.grade : charge.charge;
    return typeof part === "string" && part.trim() !== "" ? part : null;
  }

  const raw = facts[spec.factId];
  if (typeof raw !== "string") return null;
  return raw.trim() === "" ? null : raw;
}

function conditionHolds(spec: ColoradoFieldSpec, facts: ColoradoFactSet): boolean {
  if (spec.condition === null) return true;
  const actual = facts[spec.condition.factId];
  return typeof actual === "string" && actual === spec.condition.equals;
}

/** One field's outcome. Exported so a mutation test can drive a single field. */
export function bindField(spec: ColoradoFieldSpec, facts: ColoradoFactSet): ColoradoBindingOutcome {
  if (spec.fieldClass === "protected") return refuse(spec, "protected_category");
  if (spec.fieldClass === "unmapped") return refuse(spec, "unmapped_field_fails_closed");
  if (spec.factId === null) return refuse(spec, "unmapped_field_fails_closed");

  if (!conditionHolds(spec, facts)) return refuse(spec, "condition_not_met");

  const value = resolveFact(spec, facts);
  if (value === null) {
    if (spec.repeatIndex !== null) return refuse(spec, "repeat_row_has_no_charge");
    return refuse(spec, "fact_not_supplied");
  }

  const normalised = value.replace(/\s+/g, " ").trim();
  if (normalised === "") return refuse(spec, "value_empty_after_normalisation");

  if (spec.control === "radio" || spec.control === "checkbox" || spec.control === "dropdown") {
    if (spec.negativeValue !== null && normalised === spec.negativeValue) {
      return refuse(spec, "election_answered_in_the_negative");
    }
    const option = spec.options.find((candidate) => candidate.selectsWhenFactEquals === normalised);
    if (option === undefined) return refuse(spec, "value_not_an_offered_option");
    return write(spec, option.label);
  }

  if (spec.maxLength !== null && normalised.length > spec.maxLength) {
    return refuse(spec, "value_exceeds_declared_max_length");
  }

  return write(spec, normalised);
}

export interface BindOptions {
  /** Field names the live document actually has, when a document is at hand. */
  readonly documentFieldNames?: readonly string[];
}

/**
 * The whole plan for one form.
 *
 * Outcomes come back in the specification's own order, which is the order the
 * form is read, so two runs over the same facts produce the same plan in the
 * same sequence and the plan can be diffed.
 */
export function bindForm(
  spec: ColoradoFormSpec,
  facts: ColoradoFactSet,
  specSha256: string,
  options: BindOptions = {},
): ColoradoBindingPlan {
  const documentFields = options.documentFieldNames
    ? new Set(options.documentFieldNames)
    : null;

  const outcomes: ColoradoBindingOutcome[] = [];
  for (const field of spec.fields) {
    if (documentFields !== null && !documentFields.has(field.field)) {
      outcomes.push(refuse(field, "field_absent_from_document"));
      continue;
    }
    outcomes.push(bindField(field, facts));
  }

  if (documentFields !== null) {
    const specified = new Set(spec.fields.map((field) => field.field));
    for (const name of [...documentFields].sort()) {
      if (specified.has(name)) continue;
      outcomes.push({
        field: name,
        control: "text",
        fieldClass: "unmapped",
        written: false,
        factId: null,
        value: null,
        refusal: "document_field_not_in_specification",
        protectedCategory: null,
      });
    }
  }

  return {
    family: spec.family,
    specVersion: spec.specVersion,
    specSha256,
    sourceSha256: spec.sourceSha256,
    outcomes,
    writtenCount: outcomes.filter((outcome) => outcome.written).length,
    refusedCount: outcomes.filter((outcome) => !outcome.written).length,
    protectedCount: outcomes.filter((outcome) => outcome.protectedCategory !== null).length,
  };
}
