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
  minFontSize = MIN_READABLE_FONT_SIZE,
  /*
   * Whether the declared minimum is actually tried before the value is refused.
   *
   * The descending ladder steps by 0.5 from a start size the box height decides,
   * so it only lands on `minFontSize` when the two happen to be half a point
   * apart. On a 12.96pt-high widget the start size is 10.96 and the last rung is
   * 6.46: 6.0 is never evaluated, and the effective floor is 6.46 rather than
   * the 6.0 this module declares. VF11 and VF12 found what that costs -- a
   * boundary email needing 165.6pt in a 170.7pt box was refused, and because the
   * refusal was in the finalizer's report rather than the family's, the packet
   * shipped with a mapped known prefill silently absent from its bytes.
   *
   * Trying the declared minimum as a final rung can only turn a refusal into a
   * write; it cannot change the size of any value that already fits, because
   * every rung above the minimum is evaluated first and unchanged. It is opt-in
   * all the same: forty-odd builders share this module, most under other
   * workers' claims, and a repair lane holding six families does not get to
   * change what the other families' next rebuild produces. The default keeps
   * the current ladder exactly.
   *
   * CAPTAIN DECISION: this default should flip to true once every family can be
   * rebuilt together. Until then each family opts in as it is repaired.
   */
  evaluateDeclaredMinimumSize = false
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

  const ladder = [];
  for (let size = startSize; size >= minFontSize; size -= 0.5) ladder.push(size);
  // The declared minimum, tried last and only when the ladder stepped past it.
  if (evaluateDeclaredMinimumSize && ladder[ladder.length - 1] !== minFontSize
    && startSize >= minFontSize) ladder.push(minFontSize);

  for (const size of ladder) {
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
