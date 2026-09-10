/*
 * THE FILL NORMALISER, EXTRACTED SO IT CAN BE TESTED WITHOUT RUNNING A PASS.
 *
 * account-stroke-only-against-pinned-sources.mjs asks one question: does this
 * delivered stroke-only appearance stream exist in the family's own pinned
 * sources? A byte-identical match means the form draws it and it is correct.
 *
 * A stream that matches nothing is not automatically invented ink. The
 * discriminator, named on the bytes by VF22 and FIX01, is a LEADING OPAQUE
 * BACKGROUND FILL: a source /AP /N stream whose leading fill has been stripped
 * is still the form's own ink, and its remedy RESTORES the fill. Ink the source
 * never shipped is invented and its remedy REMOVES it. Getting this backwards
 * erases what the court prints, which has already happened once in this cohort
 * and cost a 213.6pt rule.
 *
 * So both sides are skeletonised -- leading fill removed, whitespace collapsed
 * -- and compared by SHA-256. Only the leading fill is normalised away, and only
 * a fill that sits at the very start before any other painting.
 *
 * THREE BUGS HAVE LIVED IN THIS, AND NOT ONE OF THEM WAS THE FILL COLOUR.
 * `1 g` matches the alternation and always has.
 *
 * 1. WHITESPACE (FIX131). `^\s*` sat before the fill, so a source stream
 *    skeletonised from its next operator while the delivered stream -- which had
 *    the fill excised in place -- still began with the newlines left where it
 *    stood. Two whitespace bytes apart, and SHA-256 separated them. Whitespace
 *    is now collapsed on both sides after stripping.
 *
 * 2. THE FILL IS NOT ALWAYS FIRST (FIX131). The Texas order's /Off opens `q`
 *    before its fill, so the fill sat at no `^` at all and the pattern never
 *    fired. A non-painting preamble -- `q`, a `cm`, a `gs`, a `w`, a line cap, a
 *    dash -- is allowed to precede it, because none of those marks the page.
 *
 * 3. THE PREAMBLE WAS CONSUMED (measured on Michigan, 2026-09-10). Allowing a
 *    preamble also swallowed it, and the two sides do not carry it
 *    symmetrically. MC-227B's /Off appearance is, with newlines shown as spaces,
 *
 *        q | 1 g | 0 0 8.2573 12.2473 re | f | 0 G | 0 w | ...re | s | Q
 *
 *    and the delivered stream is that stream with the fill excised and the `q`
 *    KEPT. The source skeletonised to `0 G 0 w ... s Q`; the delivered stream,
 *    with no leading fill left to strip, skeletonised to `q 0 G 0 w ... s Q`.
 *    One leading `q` apart. The form's own check box on a proof of service was
 *    published as invented ink, whose remedy REMOVES it.
 *
 *    FIX133 reported the symptom and attributed it to the normaliser
 *    recognising grey and not white. That diagnosis is wrong and the correction
 *    matters, because acting on it would have widened the colour test while
 *    leaving the real defect in place.
 *
 *    The preamble is now re-emitted, with a separator so it does not fuse to the
 *    operator that follows it. Only the fill -- its colour operator, its
 *    rectangle and its fill operator -- is removed, which is what this
 *    normaliser always claimed to do and what stripOpaqueBackgroundPaint in
 *    scripts/rcap-official-forms/rcap-active-content.mjs actually does.
 */
import { createHash } from "node:crypto";

/** Operators that may precede the fill because none of them marks the page. */
export const PREAMBLE = "(?:\\s*(?:q|Q|[-\\d.]+(?:\\s+[-\\d.]+){5}\\s+cm|\\/[A-Za-z0-9_.-]+\\s+gs|[-\\d.]+\\s+w|[-\\d.]+\\s+[JjMi]|\\[[^\\]]*\\]\\s*[-\\d.]+\\s+d))*";

/** A leading opaque background fill, in its grey, rgb and separation forms. */
export const LEADING_FILL = new RegExp(
  "^(" + PREAMBLE + ")"
  + "\\s*(?:[\\d.]+\\s+g|[\\d.]+\\s+[\\d.]+\\s+[\\d.]+\\s+rg|\\/[A-Za-z0-9_.-]+\\s+cs\\s+[\\d.\\s]+scn)"
  + "\\s+[-\\d.]+\\s+[-\\d.]+\\s+[-\\d.]+\\s+[-\\d.]+\\s+re\\s+f\\*?\\s*");

/**
 * The stream with its leading background fill removed and whitespace collapsed.
 *
 * `changed` says whether this stream actually carried such a fill, so a caller
 * can tell "the source with its fill stripped" from "a stream that never had
 * one". It is not a defect finding on its own.
 */
export const skeleton = (buffer) => {
  const text = Buffer.isBuffer(buffer) ? buffer.toString("latin1") : String(buffer);
  const stripped = text.replace(LEADING_FILL, "$1 ");
  const normalised = stripped.replace(/\s+/g, " ").trim();
  return {
    changed: stripped !== text,
    normalised,
    sha256: createHash("sha256").update(Buffer.from(normalised, "latin1")).digest("hex"),
  };
};
