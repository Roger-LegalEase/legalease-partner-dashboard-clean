// Colorado official-form binding — the vocabulary.
//
// Two Colorado filings are participant-completed: JDF 417 (Petition to Seal
// Arrest and Criminal Records, no charges filed) and JDF 612 (Motion to Seal
// Conviction Records, district or county court conviction). Everything the
// product may write onto either one is described here as data, so the rule
// that decides a field is reviewable on its own rather than buried in a
// renderer.
//
// The default is refusal. A field that no specification entry names is
// `unmapped` and is never written, so adding a field to a re-issued form
// cannot silently start receiving a value.

/** Where a field's value comes from, or why it has none. */
export type ColoradoFieldClass =
  /** A fact the participant supplied, written verbatim. */
  | "participant"
  /** A fact the document itself establishes — its own role, a printed "(Required)". */
  | "derived"
  /** A choice the participant makes: a radio, a checkbox or a dropdown. */
  | "election_control"
  /** Prose the participant wrote. Transcribed, never composed. */
  | "narrative"
  /** Never written, for a stated reason. */
  | "protected"
  /** No entry reaches it. Fails closed. */
  | "unmapped";

/**
 * Why a protected field is protected. Each value names an actor who alone may
 * complete the field; none of them is this product.
 */
export type ColoradoProtectedCategory =
  | "judicial_signature"
  | "judicial_finding"
  | "clerk_only"
  | "prosecutor_only"
  | "agency_only"
  | "court_use_only"
  | "participant_signature"
  | "participant_execution_date"
  | "counsel_signature"
  | "counsel_attestation";

/** The AcroForm control types these two forms use. */
export type ColoradoControlKind = "text" | "dropdown" | "radio" | "checkbox";

export interface ColoradoWidgetRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ColoradoWidgetAnchor {
  readonly page: number;
  readonly rect: ColoradoWidgetRect;
}

/**
 * A choice a control can express.
 *
 * `ordinal` is the widget's position in geometric order — page ascending, then
 * y descending, then x ascending — not its position in the AcroForm's kid
 * array. The two disagree: JDF 417's `GroupCoS` lists e-filing, then "Other",
 * then regular mail, while the page prints e-filing, regular mail, "Other".
 * Selecting by array index would have checked the wrong box, so the ordinal is
 * geometric and the widget it resolves to is pinned by `anchor`.
 */
export interface ColoradoChoiceOption {
  readonly ordinal: number;
  readonly anchor: ColoradoWidgetAnchor;
  /** The text printed beside this widget, read off the page. */
  readonly label: string;
  /** The fact value that selects this option. */
  readonly selectsWhenFactEquals: string;
}

/** A guard that must hold before a field is written at all. */
export interface ColoradoBindingCondition {
  readonly factId: string;
  readonly equals: string;
}

export interface ColoradoFieldSpec {
  readonly field: string;
  readonly control: ColoradoControlKind;
  readonly fieldClass: ColoradoFieldClass;
  /** The section of the official form this field sits in, for review. */
  readonly section: string;
  /** What the form prints for this field, as reviewed. */
  readonly label: string;
  /**
   * The raw text decoded from the page beside the widget, kept verbatim.
   *
   * JDF 612 is drawn with a subsetted encoding whose text layer comes back
   * transposed — "Sheriff's Department" decodes as "Sheriff\u00b6s De Sartment" —
   * so the reviewed label and the machine-read evidence are recorded
   * separately rather than one being passed off as the other.
   */
  readonly labelEvidence: string;
  readonly anchors: readonly ColoradoWidgetAnchor[];
  /** Set only when `fieldClass` is `protected`. */
  readonly protectedCategory: ColoradoProtectedCategory | null;
  /** Why this field is treated the way it is. Always present. */
  readonly rationale: string;
  /** The participant fact this field is written from. Null for protected and unmapped. */
  readonly factId: string | null;
  /** Written only when this guard holds. */
  readonly condition: ColoradoBindingCondition | null;
  /** Choices, for `radio`, `checkbox` and `dropdown`. Empty for text. */
  readonly options: readonly ColoradoChoiceOption[];
  /**
   * Checkboxes only: the answer that deliberately leaves the box unticked.
   *
   * A checkbox offers one thing — being ticked — so a participant who answers
   * "no" has answered, and the box staying blank is the answer being honoured.
   * Recording that separately from a value the document does not offer keeps
   * an answered election from reading as a rejected one.
   */
  readonly negativeValue: string | null;
  /** True when the canonical fixture is required to supply the fact. */
  readonly requiredInCanonicalFixture: boolean;
  /** Text controls only: the measured maximum length, when the form declares one. */
  readonly maxLength: number | null;
  readonly multiline: boolean;
  /** Set on the indexed offence rows so a row binds only to a charge that exists. */
  readonly repeatIndex: number | null;
}

export interface ColoradoFormSpec {
  readonly schemaVersion: "rcap-colorado-official-form-binding/v1";
  readonly specVersion: string;
  readonly family: string;
  readonly jurisdiction: "CO";
  readonly documentId: string;
  readonly documentRole: string;
  readonly revision: string;
  /** The official binary this specification was measured against. */
  readonly sourceSha256: string;
  readonly pageCount: number;
  readonly fieldCount: number;
  readonly fields: readonly ColoradoFieldSpec[];
}

/** One field's outcome when the binder ran. */
export interface ColoradoBindingOutcome {
  readonly field: string;
  readonly control: ColoradoControlKind;
  readonly fieldClass: ColoradoFieldClass;
  readonly written: boolean;
  readonly factId: string | null;
  /** Present only when `written`. */
  readonly value: string | null;
  /** Present only when the field was not written. */
  readonly refusal: ColoradoRefusalReason | null;
  readonly protectedCategory: ColoradoProtectedCategory | null;
}

export type ColoradoRefusalReason =
  | "protected_category"
  | "unmapped_field_fails_closed"
  | "fact_not_supplied"
  | "condition_not_met"
  | "value_not_an_offered_option"
  | "election_answered_in_the_negative"
  | "repeat_row_has_no_charge"
  | "value_empty_after_normalisation"
  | "value_exceeds_declared_max_length"
  | "field_absent_from_document"
  | "document_field_not_in_specification";

export interface ColoradoBindingPlan {
  readonly family: string;
  readonly specVersion: string;
  readonly specSha256: string;
  readonly sourceSha256: string;
  readonly outcomes: readonly ColoradoBindingOutcome[];
  readonly writtenCount: number;
  readonly refusedCount: number;
  readonly protectedCount: number;
}

/** Facts a caller supplies. Values are strings; a charge list is its own shape. */
export interface ColoradoChargeFact {
  readonly charge: string;
  /** "Misdemeanor" or "Felony", matching the dropdown the form offers. */
  readonly grade?: string;
}

export interface ColoradoFactSet {
  readonly [factId: string]: string | readonly ColoradoChargeFact[] | undefined;
}
