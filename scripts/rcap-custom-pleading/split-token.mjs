/**
 * The one separator-aware token splitter, shared.
 *
 * WHAT THIS REPLACES
 *
 * Every composed RCAP packet wraps its text into a 468pt column (612pt page,
 * 72pt margins, Times-Roman at 11pt — the geometry is identical in all 91
 * scripts carrying renderComposedPdf, which SCAN01 verified copy by copy).
 * Wrapping breaks on whitespace; a whitespace-free token longer than the
 * column has to be broken somewhere, and that decision is splitToken's.
 *
 * The original splitToken accumulated CHARACTERS and cut at whichever one
 * first reached the margin:
 *
 *     ("https://ccresourcecenter.org/state-restoration-profiles/oklahoma-restoration-of-rights-pardon-expungeme
 *     nt-sealing/")
 *
 * That is a link a participant cannot read off the page, cannot type, and
 * cannot recognise as one address. The page is full, every character is
 * present and the ink is where ink belongs, so a page-line census, a
 * completeness counter and a raster gate all pass it. Only a measurement of
 * the TOKEN sees it — which is what SCAN01 is for.
 *
 * The repair, first written by FIX16 and carried unchanged by FIX17, breaks
 * at the token's OWN separators and hard-splits only a run that has none:
 *
 *     ...-of-rights-pardon-
 *     expungement-sealing/")
 *
 * FIX16's copy and FIX17's copy are byte-identical once whitespace is
 * normalised; there was no "better of the two" to choose between. This module
 * is that implementation, moved out of the copies rather than rewritten.
 *
 * WHY IT TAKES A PREDICATE AND NOT A FONT
 *
 * SCAN01 reported two splitToken variants, repaired and faulty. Read as code
 * there are eight, and they differ in how they ASK about width, not in what
 * they do with the answer:
 *
 *     font.widthOfTextAtSize(s, fontSize) > maxWidth     (82 copies)
 *     font.widthOfTextAtSize(s, FONT_SIZE) > MAX_WIDTH   (5, IN + LA)
 *     font.widthOfTextAtSize(s, size)      > maxW        (4)
 *     body.widthOfTextAtSize(s, fontSize)  > maxWidth    (1, FL)
 *     renderedWidth(s)                     > maxWidth    (1, KS)
 *     !fits(s)                                           (5, the repaired)
 *
 * A module that named any one of those could only serve the copies that
 * happened to share its local variable names. This one takes `fits`, so all
 * eight shapes migrate by supplying a one-line predicate and deleting their
 * private copy — one design, not a second one per cohort.
 *
 * The `hardSplits` counter is the useful half of the Indiana/Louisiana
 * variant, kept: it lets a builder ASSERT that no token was chopped rather
 * than intending it, and lets a lane prove a change inert by counting zero
 * calls (which is how FIX17 proved the splitter inert for North Dakota).
 */

/**
 * Where a token may be broken without making it unreadable: after a colon,
 * underscore, slash, dot or hyphen. These are the separators route keys,
 * citation URLs and statute references are built from, and a reader carries
 * across them without losing the token's identity. The lookbehind keeps the
 * separator on the end of the piece before the break, so the broken line ends
 * "...-pardon-" and announces itself as continuing.
 */
export const TOKEN_SEPARATORS = /(?<=[:_/.-])/;

/**
 * Build a splitter over a width predicate.
 *
 *   fits(text) -> boolean   true when `text` fits the column
 *   onHardSplit(run)        optional; called once per chop of a separatorless
 *                           run, i.e. exactly when the output is still not
 *                           something a reader can read across
 *
 * Returns split(token) -> string[], carrying `.calls` and `.hardSplits`
 * counters so a caller can assert on them after a build.
 */
export function createTokenSplitter({ fits, onHardSplit } = {}) {
  if (typeof fits !== "function") throw new TypeError("createTokenSplitter needs a fits(text) predicate");

  const split = (token) => {
    split.calls += 1;
    const chunks = [];
    let current = "";

    /* A run with no separator in it cannot be broken anywhere a reader would
     * follow, so it is chopped at the margin — the old behaviour, now reached
     * only where there is genuinely no alternative, and counted when it is. */
    const flushOversized = () => {
      while (!fits(current)) {
        let cut = current.length - 1;
        while (cut > 1 && !fits(current.slice(0, cut))) cut--;
        split.hardSplits += 1;
        if (onHardSplit) onHardSplit(current.slice(0, cut));
        chunks.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    };

    for (const piece of String(token).split(TOKEN_SEPARATORS)) {
      if (current && !fits(`${current}${piece}`)) { chunks.push(current); current = piece; }
      else current += piece;
      flushOversized();
    }
    if (current) chunks.push(current);
    return chunks;
  };

  split.calls = 0;
  split.hardSplits = 0;
  split.reset = () => { split.calls = 0; split.hardSplits = 0; };
  return split;
}

/**
 * The predicate for the 92 copies that measure with a pdf-lib font handle.
 * `font` is whatever the copy calls it — font, body — and the call site reads
 * the same in all of them.
 */
export const fitsByFontMetrics = (font, fontSize, maxWidth) =>
  (text) => font.widthOfTextAtSize(text, fontSize) <= maxWidth;

/**
 * The predicate for a copy that measures through its own helper, such as
 * Kansas's renderedWidth.
 */
export const fitsByWidthFn = (widthOf, maxWidth) => (text) => widthOf(text) <= maxWidth;
