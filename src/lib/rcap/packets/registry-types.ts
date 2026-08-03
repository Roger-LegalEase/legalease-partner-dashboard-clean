// Field-mapping shapes for official-form components.
//
// These live apart from the registry itself so a per-jurisdiction registry can
// declare its own mappings without importing the aggregate registry that
// imports it back. `registry.ts` re-exports both names, so nothing that already
// imports them from there has to change.

/** Overlay placement on an official form. Rejected unless explicitly confirmed. */
export type OverlayPlacement = {
  componentId: string;
  fieldKey: string;
  page: number;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
  kind?: "text" | "checkbox";
  /**
   * True only when a human has looked at the rendered page and confirmed this
   * position sits in a blank. The placeholder anchors in the nationwide draft
   * corpus are all unconfirmed and must never be promoted by editing this flag
   * without doing the looking.
   */
  confirmed: boolean;
};

/**
 * Named AcroForm field mapping. Rejected unless the field exists in the source.
 *
 * `kind` records what the mapping author believes the field is. It is
 * documentation and a review aid, not dispatch: the fill strategy branches on
 * the field object the source document actually contains, so a mapping that
 * calls a dropdown a text field is caught by the source rather than trusted.
 */
export type AcroFieldMapping = {
  componentId: string;
  fieldKey: string;
  pdfFieldName: string;
  kind: "text" | "checkbox" | "dropdown";
  multiline?: boolean;
  /**
   * True where a blank is the correct output rather than a missing value.
   *
   * An official form carries fields that apply to some packets and not others —
   * the case-number blank beside an offence the participant was never convicted
   * of, an optional contact line. Without this the renderer reports each one as
   * an absent value, and a review manifest full of expected blanks is a review
   * manifest nobody reads. A mapping without it still warns, which is what keeps
   * a genuinely missing participant value visible.
   */
  expectedBlank?: boolean;
  /**
   * How many characters the blank on the official form can actually carry.
   *
   * A form field clips at its widget, and an auto-sizing field shrinks instead.
   * Both are silent: a value too long for its blank comes out truncated or in
   * microtype, and neither is visible in a page thumbnail. Declaring the
   * capacity turns a silent defect into a decision, taken by `overflow`.
   *
   * Use this only where the count is the real constraint — a comb field, or a
   * field whose own `maxLength` the mapping is restating. For an ordinary blank,
   * prefer `maxWidthPoints`: characters are not the same width, so the same
   * eighteen characters fit as digits and overrun as capitals.
   */
  maxCharacters?: number;
  /**
   * How wide the blank is, in PDF points, measured from the widget.
   *
   * The renderer measures the value in the form's own font at the size the
   * field's own default appearance declares, and applies `overflow` to the
   * result. Omitted, the widget's own width is used, which is right for almost
   * every field; supply it only to declare a narrower usable area than the
   * rectangle suggests.
   */
  maxWidthPoints?: number;
  /**
   * What to do when a value exceeds `maxCharacters`.
   *
   *   warn  record it and print anyway. The default, because it is what the
   *         renderer did before capacities existed.
   *   omit  leave the blank empty and record it. For an optional value where a
   *         truncated answer is worse than none — a half-printed email address
   *         invites a clerk to write to nobody.
   *   fail  refuse the component. For anything sworn: a truncated name, case
   *         number or address on a petition is a false statement to a court.
   */
  overflow?: "warn" | "omit" | "fail";
};
