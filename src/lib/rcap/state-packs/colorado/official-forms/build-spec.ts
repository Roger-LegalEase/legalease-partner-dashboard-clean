// Turns an authored specification into a measured one.
//
// The authored file states meaning; this file states geometry, and it takes
// every coordinate, option string and length limit from the family's own
// first-hand census. Where the two disagree the build fails rather than
// preferring either — a specification that names a field the document does not
// have, or that offers a dropdown option the document does not declare, is not
// a specification of that document.
import type { AuthoredField, AuthoredFormSpec } from "./authoring";
import { auditProtection } from "./protected-fields";
import type {
  ColoradoChoiceOption,
  ColoradoControlKind,
  ColoradoFieldSpec,
  ColoradoFormSpec,
  ColoradoWidgetAnchor,
} from "./types";

export interface CensusWidget {
  readonly page: number;
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface CensusField {
  readonly name: string;
  readonly type: string;
  readonly widgets: readonly CensusWidget[];
  readonly maxLength: number | null;
  readonly multiline: boolean;
  readonly options?: readonly string[] | null;
}

export interface FieldCensus {
  readonly censusBasis: string;
  readonly sha256: string;
  readonly structuralClass: string;
  readonly fieldCount: number;
  readonly pageGeometry: readonly { readonly page: number }[];
  readonly fields: readonly CensusField[];
}

export class SpecificationBuildError extends Error {
  readonly problems: readonly string[];
  constructor(family: string, problems: readonly string[]) {
    super(`${family}: specification does not describe the document\n  - ${problems.join("\n  - ")}`);
    this.name = "SpecificationBuildError";
    this.problems = problems;
  }
}

/**
 * Widgets in the order the page draws them: page ascending, then down the
 * page, then left to right.
 *
 * The AcroForm's own kid order is not this order and is not safe to select by.
 * JDF 417's certificate-of-service group stores e-filing, "Other", regular
 * mail while printing e-filing, regular mail, "Other", so an ordinal read off
 * the array would tick "Other" for a participant who chose the post.
 */
export function inPrintedOrder(widgets: readonly CensusWidget[]): readonly CensusWidget[] {
  return [...widgets].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.rect.y - b.rect.y) > 1.5) return b.rect.y - a.rect.y;
    return a.rect.x - b.rect.x;
  });
}

function anchorOf(widget: CensusWidget): ColoradoWidgetAnchor {
  return {
    page: widget.page,
    rect: {
      x: round2(widget.rect.x),
      y: round2(widget.rect.y),
      width: round2(widget.rect.width),
      height: round2(widget.rect.height),
    },
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function controlOf(censusType: string): ColoradoControlKind | null {
  if (censusType === "text" || censusType === "dropdown" || censusType === "radio" || censusType === "checkbox") {
    return censusType;
  }
  return null;
}

function buildOptions(
  authored: AuthoredField,
  census: CensusField,
  control: ColoradoControlKind,
  widgets: readonly CensusWidget[],
  problems: string[],
): readonly ColoradoChoiceOption[] {
  if (control === "radio") {
    const choices = authored.choices ?? [];
    if (choices.length === 0) {
      problems.push(`${authored.field}: a radio group must declare one choice per widget; none declared`);
      return [];
    }
    if (choices.length !== widgets.length) {
      problems.push(
        `${authored.field}: declares ${choices.length} choice(s) but the document draws ${widgets.length} widget(s)`,
      );
      return [];
    }
    return choices.map((choice, index) => ({
      ordinal: index,
      anchor: anchorOf(widgets[index]),
      label: choice.label,
      selectsWhenFactEquals: choice.value,
    }));
  }

  if (control === "checkbox") {
    if (authored.checkedWhen === undefined) {
      problems.push(`${authored.field}: a checkbox must declare the fact value that ticks it`);
      return [];
    }
    if (widgets.length === 0) {
      problems.push(`${authored.field}: the document draws no widget for this checkbox`);
      return [];
    }
    return [
      {
        ordinal: 0,
        anchor: anchorOf(widgets[0]),
        label: authored.label,
        selectsWhenFactEquals: authored.checkedWhen,
      },
    ];
  }

  if (control === "dropdown") {
    const declared = authored.dropdown ?? [];
    if (declared.length === 0) {
      problems.push(`${authored.field}: a dropdown must map the document's own options to fact values`);
      return [];
    }
    const documentOptions = (census.options ?? []).map((option) => option.trim());
    for (const entry of declared) {
      if (!documentOptions.includes(entry.option.trim())) {
        problems.push(
          `${authored.field}: offers "${entry.option}", which the document does not declare (it declares ${JSON.stringify(census.options ?? [])})`,
        );
      }
    }
    return declared.map((entry, index) => ({
      ordinal: index,
      anchor: anchorOf(widgets[0] ?? { page: 0, rect: { x: 0, y: 0, width: 0, height: 0 } }),
      label: entry.option,
      selectsWhenFactEquals: entry.value,
    }));
  }

  if (authored.choices || authored.dropdown || authored.checkedWhen !== undefined) {
    problems.push(`${authored.field}: a text field cannot declare choices`);
  }
  return [];
}

export interface BuildInput {
  readonly authored: AuthoredFormSpec;
  readonly census: FieldCensus;
  /** Field name to the raw text decoded beside its widget. */
  readonly labelEvidence: Readonly<Record<string, string>>;
}

/** Builds the measured specification, or throws with every problem at once. */
export function buildFormSpec({ authored, census, labelEvidence }: BuildInput): ColoradoFormSpec {
  const problems: string[] = [];
  const censusByName = new Map(census.fields.map((field) => [field.name, field]));

  const seen = new Set<string>();
  for (const field of authored.fields) {
    if (seen.has(field.field)) problems.push(`${field.field}: named twice in the specification`);
    seen.add(field.field);
    if (!censusByName.has(field.field)) {
      problems.push(`${field.field}: named by the specification but absent from the document`);
    }
  }
  for (const field of census.fields) {
    if (!seen.has(field.name)) {
      problems.push(`${field.name}: present in the document but not named by the specification, so it fails closed`);
    }
  }

  const fields: ColoradoFieldSpec[] = [];
  for (const authoredField of authored.fields) {
    const censusField = censusByName.get(authoredField.field);
    if (!censusField) continue;

    const control = controlOf(censusField.type);
    if (!control) {
      problems.push(`${authoredField.field}: unsupported control type "${censusField.type}"`);
      continue;
    }

    const widgets = inPrintedOrder(censusField.widgets);
    const isProtected = authoredField.fieldClass === "protected";
    // A protected field is never written, so it has no options to resolve. A
    // protected checkbox that had to declare what ticks it would be declaring
    // how to do the thing it exists to forbid.
    const options = isProtected
      ? []
      : buildOptions(authoredField, censusField, control, widgets, problems);

    if (isProtected && authoredField.factId !== undefined) {
      problems.push(`${authoredField.field}: a protected field may not name a fact`);
    }
    if (!isProtected && authoredField.factId === undefined) {
      problems.push(`${authoredField.field}: a written field must name the fact it is written from`);
    }
    if (!isProtected && authoredField.protectedCategory !== undefined) {
      problems.push(`${authoredField.field}: only a protected field may name a protected category`);
    }

    fields.push({
      field: authoredField.field,
      control,
      fieldClass: authoredField.fieldClass,
      section: authoredField.section,
      label: authoredField.label,
      labelEvidence: labelEvidence[authoredField.field] ?? "",
      anchors: widgets.map(anchorOf),
      protectedCategory: authoredField.protectedCategory ?? null,
      rationale: authoredField.rationale,
      factId: authoredField.factId ?? null,
      condition: authoredField.condition ?? null,
      options,
      negativeValue:
        control === "checkbox" && !isProtected ? (authoredField.uncheckedWhen ?? "no") : null,
      requiredInCanonicalFixture: authoredField.required ?? false,
      maxLength: censusField.maxLength ?? null,
      multiline: censusField.multiline === true,
      repeatIndex: authoredField.repeatIndex ?? null,
    });
  }

  for (const disagreement of auditProtection(fields)) {
    problems.push(`${disagreement.field}: ${disagreement.problem} — ${disagreement.detail}`);
  }

  if (census.fieldCount !== census.fields.length) {
    problems.push(
      `the census counts ${census.fieldCount} field(s) but lists ${census.fields.length}`,
    );
  }

  if (problems.length > 0) throw new SpecificationBuildError(authored.family, problems);

  return {
    schemaVersion: "rcap-colorado-official-form-binding/v1",
    specVersion: authored.specVersion,
    family: authored.family,
    jurisdiction: "CO",
    documentId: authored.documentId,
    documentRole: authored.documentRole,
    revision: authored.revision,
    sourceSha256: census.sha256,
    pageCount: census.pageGeometry.length,
    fieldCount: census.fieldCount,
    fields,
  };
}
