// Bounded font sizing and multiline handling against real widget geometry.
//
// The previous renderer measured overflow and then wrote the value anyway at a
// fixed size, so a long name simply ran past the edge of its box: the finding
// was reported and the defect shipped in the same artifact. Reporting is not
// remediation.
//
// This module makes fitting a decision with only three outcomes, and the
// caller cannot ignore any of them:
//
//   fit        the value fits the widget at a readable size;
//   wrapped    the widget is multiline and the value wraps within its height;
//   refused    the value cannot be made readable inside the widget.
//
// A refusal is deliberate. Below the minimum readable size the choice is
// between an illegible filing and no filing, and silently shipping 4pt text
// into a court document is the worse of the two, so this fails closed and
// leaves the field to a human.

export const MIN_READABLE_FONT_SIZE = 6;
export const DEFAULT_MAX_FONT_SIZE = 11;

// Horizontal padding inside a widget, and the share of a line's height taken
// by leading when wrapping.
const HORIZONTAL_PADDING = 4;
const LINE_HEIGHT_FACTOR = 1.15;

/**
 * Widths come from the embedding font, so this measures what will actually be
 * drawn rather than an average character width.
 */
function widthAt(font, text, size) {
  try { return font.widthOfTextAtSize(text, size); } catch { return Number.POSITIVE_INFINITY; }
}

/**
 * Greedy wrap at word boundaries, splitting a word that cannot fit a line on
 * its own so a single long token cannot silently overflow.
 */
export function wrapToWidth(font, text, size, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthAt(font, candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      if (widthAt(font, word, size) <= maxWidth) { line = word; continue; }
      // A single token wider than the line: break it at the last character
      // that still fits, repeatedly.
      let rest = word;
      line = "";
      while (rest.length > 0) {
        let take = rest.length;
        while (take > 1 && widthAt(font, rest.slice(0, take), size) > maxWidth) take -= 1;
        if (take >= rest.length) { line = rest; break; }
        lines.push(rest.slice(0, take));
        rest = rest.slice(take);
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

/**
 * Chooses a size and layout for one value inside one widget rectangle.
 *
 * `rect` is the widget's own rectangle, in points. `multiline` comes from the
 * field's flags, not from a guess about its shape.
 */
export function fitTextToWidget({
  font,
  text,
  rect,
  multiline = false,
  maxFontSize = DEFAULT_MAX_FONT_SIZE,
  minFontSize = MIN_READABLE_FONT_SIZE
}) {
  const value = String(text ?? "");
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
    return { outcome: "refused", reason: "widget_has_no_usable_rectangle", value };
  }

  const usableWidth = rect.width - HORIZONTAL_PADDING;
  if (usableWidth <= 0) {
    return { outcome: "refused", reason: "widget_narrower_than_its_padding", value, rect };
  }

  // A widget can never show text taller than itself, so the ceiling is the
  // smaller of the caller's maximum and what the box physically allows.
  const heightCeiling = multiline ? maxFontSize : Math.max(minFontSize, Math.min(maxFontSize, rect.height - 2));
  const startSize = Math.min(maxFontSize, heightCeiling);

  for (let size = startSize; size >= minFontSize; size -= 0.5) {
    if (!multiline) {
      if (widthAt(font, value, size) <= usableWidth && size <= rect.height - 1) {
        return { outcome: size === startSize ? "fit" : "shrunk", fontSize: size, lines: [value], value, rect };
      }
      continue;
    }
    const lines = wrapToWidth(font, value, size, usableWidth);
    const needed = lines.length * size * LINE_HEIGHT_FACTOR;
    if (needed <= rect.height - 2) {
      return { outcome: size === startSize ? "fit" : "shrunk", fontSize: size, lines, value, rect, wrapped: lines.length > 1 };
    }
  }

  // Nothing readable fits. Report what the smallest attempt would have needed,
  // so the refusal carries the evidence for it.
  const atMin = multiline
    ? wrapToWidth(font, value, minFontSize, usableWidth)
    : [value];
  return {
    outcome: "refused",
    reason: multiline ? "value_exceeds_widget_height_at_minimum_font" : "value_exceeds_widget_width_at_minimum_font",
    value,
    rect,
    minFontSize,
    requiredWidthAtMin: multiline ? undefined : Number(widthAt(font, value, minFontSize).toFixed(1)),
    requiredHeightAtMin: multiline ? Number((atMin.length * minFontSize * LINE_HEIGHT_FACTOR).toFixed(1)) : undefined
  };
}

/**
 * Applies a fitted result to a pdf-lib text field.
 *
 * Setting the size explicitly is what makes the fit real: left on auto-size, a
 * viewer re-decides at render time and the measured fit stops being a
 * guarantee.
 */
export function applyFitToTextField(textField, fit) {
  if (fit.outcome === "refused") return false;
  textField.setText(fit.lines.join("\n"));
  textField.setFontSize(fit.fontSize);
  return true;
}

/**
 * Confirms a written value actually reached the page whole.
 *
 * Everything above this measures what *should* happen: it asks the embedding
 * font how wide a string will be and picks a size that fits. The appearance is
 * then drawn by the field's own font through pdf-lib's generator, and the two
 * can disagree. Independent review found both failure modes shipping as clean
 * `shrunk` outcomes -- Vermont's 200-00631 drew a 70-character name cut to 39
 * characters mid-word and past the widget edge, and Virginia's CC-1203 drew a
 * case number past both edges -- while the overflow ledger recorded nothing.
 *
 * A measurement is a prediction. This reads the artifact.
 *
 * `runs` are the text items extracted from the finalized page, `rect` is the
 * widget's own rectangle, and `value` is what the caller meant to write.
 */
export function verifyWrittenValue({ value, rect, runs, tolerance = 0.5 }) {
  const expected = String(value ?? "");
  if (!rect || expected === "") return { outcome: "not_checkable", reason: "no widget rectangle or no value" };

  // Runs belonging to this widget: on its baseline band, and horizontally
  // overlapping it.
  //
  // Overlap rather than origin-inside, because a run that starts to the left of
  // the rectangle is precisely the case this exists to catch. Keying on the
  // origin would exclude it and report the field as empty, turning "drawn past
  // the left edge" into "nothing was drawn" -- still a refusal, but the wrong
  // diagnosis, and the ledger would say the wrong thing about why.
  const inside = runs.filter((r) => {
    const onBand = r.y >= rect.y - tolerance && r.y <= rect.y + rect.height + tolerance;
    if (!onBand) return false;
    const start = r.x;
    const end = r.x + (r.width ?? 0);
    return end >= rect.x - tolerance && start <= rect.x + rect.width + tolerance;
  });

  const norm = (s) => String(s).replace(/\s+/g, "").toLowerCase();
  const drawn = inside.map((r) => r.text).join("");
  const drawnNorm = norm(drawn);
  const expectedNorm = norm(expected);

  if (drawnNorm.length === 0) {
    return { outcome: "absent", reason: "nothing is drawn inside the widget", expected, drawn: "" };
  }

  // Past an edge, measured from each run's own extent rather than estimated.
  const overflow = inside
    .map((r) => ({ left: rect.x - r.x, right: (r.x + (r.width ?? 0)) - (rect.x + rect.width) }))
    .reduce((a, o) => ({ left: Math.max(a.left, o.left), right: Math.max(a.right, o.right) }), { left: 0, right: 0 });
  const leavesWidget = overflow.left > tolerance || overflow.right > tolerance;

  // Shorter than what was asked for. A wrapped multiline value legitimately
  // reorders whitespace, so the comparison is whitespace-insensitive and by
  // containment rather than equality.
  const truncated = !drawnNorm.includes(expectedNorm);

  if (truncated || leavesWidget) {
    return {
      outcome: "clipped",
      reason: truncated
        ? (leavesWidget ? "drawn text is shorter than the value and leaves the widget"
          : "drawn text is shorter than the value supplied")
        : "drawn text leaves the widget rectangle",
      expected, drawn,
      expectedChars: expected.length,
      drawnChars: drawn.length,
      overflowLeftPt: Number(Math.max(0, overflow.left).toFixed(2)),
      overflowRightPt: Number(Math.max(0, overflow.right).toFixed(2)),
      widget: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  }
  return { outcome: "complete", expected, drawnChars: drawn.length };
}
