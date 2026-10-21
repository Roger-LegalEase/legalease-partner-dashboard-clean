// The shape a specification is authored in, before geometry is attached.
//
// Semantics are written by hand here; page numbers, widget rectangles, option
// strings and length limits are attached from the family's first-hand census
// by `buildFormSpec`. Nothing in this file states a coordinate, so a
// specification cannot drift away from the document it describes by being
// edited.
import type {
  ColoradoFieldClass,
  ColoradoProtectedCategory,
} from "./types";

export interface AuthoredChoice {
  /** The reviewed label of the option, in geometric order down the page. */
  readonly label: string;
  /** The fact value that selects this option. */
  readonly value: string;
}

export interface AuthoredDropdownOption {
  /** Must match one of the option strings the document declares, exactly. */
  readonly option: string;
  readonly value: string;
}

export interface AuthoredField {
  readonly field: string;
  readonly section: string;
  readonly label: string;
  readonly fieldClass: ColoradoFieldClass;
  readonly rationale: string;
  readonly protectedCategory?: ColoradoProtectedCategory;
  readonly factId?: string;
  readonly condition?: { readonly factId: string; readonly equals: string };
  /** Radio groups: one entry per widget, in geometric order. */
  readonly choices?: readonly AuthoredChoice[];
  /** Checkboxes: the fact value that ticks the box. */
  readonly checkedWhen?: string;
  /** Checkboxes: the fact value that answers the election and leaves the box blank. Defaults to "no". */
  readonly uncheckedWhen?: string;
  /** Dropdowns: the document's own option strings mapped to fact values. */
  readonly dropdown?: readonly AuthoredDropdownOption[];
  /** True when the canonical fixture must supply the fact. */
  readonly required?: boolean;
  /** Offence rows: which charge in `matter.charges` this row draws from. */
  readonly repeatIndex?: number;
}

export interface AuthoredFormSpec {
  readonly specVersion: string;
  readonly family: string;
  readonly documentId: string;
  readonly documentRole: string;
  readonly revision: string;
  readonly fields: readonly AuthoredField[];
}
