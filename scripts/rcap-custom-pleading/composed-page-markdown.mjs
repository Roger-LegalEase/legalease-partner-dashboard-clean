/**
 * Markdown emphasis delimiters, and why a composed page may never print them.
 *
 * The composed-pleading renderers draw participant-facing prose onto a PDF page
 * with one embedded face (Times-Roman) at one size, through
 * `sanitizePdfText`, which already normalises source characters the page cannot
 * carry: non-breaking spaces, the four dash variants, curly quotes, the section
 * sign, the ellipsis. Emphasis delimiters belong to that same class of source
 * markup. In participant-instructions.md they are markdown and render as
 * emphasis correctly; on a PDF page nothing renders them, so `**like this**`
 * arrives as four black asterisks at full body size in the middle of a
 * sentence.
 *
 * TWO WAYS TO FIX IT, AND WHY THIS IS THE ONE.
 *
 * A renderer could honour the emphasis by embedding a bold face and splitting
 * the drawn run. These renderers embed exactly one font, draw one `drawText`
 * per wrapped row, and measure every wrap against that one face; a second face
 * is a new markup system for a page that has never had one, and it would move
 * the bytes of every family that already ships. The delimiters are therefore
 * REMOVED, on the same footing as the characters `sanitizePdfText` already
 * normalises away, and the composer's own convention is preserved: a composed
 * page carries prose, not markup.
 *
 * WHAT IS REMOVED, AND WHAT IS NOT.
 *
 * Only a closed pair on the same logical line, opening on a non-space and
 * closing on a non-space -- `**a**` and `__a__`. A lone `**`, an unclosed run,
 * a `__` inside an identifier, and a pair whose content is empty or blank are
 * all left exactly as they are, because none of them is emphasis and guessing
 * at one would delete a character the source meant to print. This makes the
 * transform a no-op on every string that carries no emphasis pair, which is the
 * whole of every other family built through these renderers.
 *
 * Removal happens BEFORE wrapping, on the logical line, so a pair can never be
 * split across two drawn rows and left half-removed. It narrows the line by the
 * width of the removed characters and nothing else; whether that frees enough
 * room to pull another word up is a question for the wrap measurement, not for
 * this module.
 */

/**
 * `**a**` / `__a__` on one logical line: opens on non-space, closes on non-space.
 *
 * Two guards keep this from eating text that is not emphasis, and both were
 * written against real delivered bytes rather than imagined ones:
 *
 *  - A LONGER RUN OF THE SAME CHARACTER IS NOT A PAIR. A composed page rules a
 *    blank with a run of underscores, and 386 delivered fixtures in this corpus
 *    print `_____`. A naive pair match reads that as `__`+`_`+`__` and would
 *    quietly leave a one-character rule behind. So a pair may not be preceded
 *    or followed by its own delimiter character, and its content may not begin
 *    or end with one.
 *  - `__` MAY NOT SIT INSIDE A WORD, which is CommonMark's own rule and the
 *    reason `snake__case__name` keeps every character it has.
 *
 * Neither guard is a taste question. Deleting a character the source meant to
 * print is the same class of defect as printing one it did not.
 */
const pairPattern = (d, flags) =>
  new RegExp(`${d.openGuard}${d.pattern}(?=[^\\s${d.charClass}])([\\s\\S]*?[^\\s${d.charClass}])${d.pattern}${d.closeGuard}`, flags);

const DELIMITERS = [
  { name: "**", pattern: "\\*\\*", charClass: "*", openGuard: "(?<!\\*)", closeGuard: "(?!\\*)" },
  { name: "__", pattern: "__", charClass: "_", openGuard: "(?<![A-Za-z0-9_])", closeGuard: "(?![A-Za-z0-9_])" }
];

/**
 * The same string with every closed emphasis pair reduced to its content.
 * A string carrying no closed pair is returned unchanged, character for
 * character.
 */
export function stripMarkdownEmphasis(text) {
  let out = String(text);
  for (let pass = 0; pass < 8; pass += 1) {
    let next = out;
    for (const d of DELIMITERS) next = next.replace(pairPattern(d, "g"), "$1");
    if (next === out) return out;
    out = next;
  }
  return out;
}

/**
 * Every emphasis pair found in one delivered page's extracted text, with the
 * delimiter and the text it wraps. Empty when the page carries none.
 */
export function markdownDelimitersOnPage(pageText) {
  const found = [];
  const text = String(pageText ?? "");
  for (const d of DELIMITERS) {
    for (const m of text.matchAll(pairPattern(d, "g"))) {
      found.push({ delimiter: d.name, wraps: m[1], at: m.index, printed: m[0] });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

/**
 * THE REGRESSION.
 *
 * A delivered page that carries a markdown emphasis pair is an output defect
 * whatever the completeness counters say, so the build stops rather than
 * shipping it. Called on the text read back out of the SAVED packet bytes, not
 * on the builder's intent, so it catches markup arriving from any source: the
 * component body, a fixture fact value, or a future edit to either.
 */
export function assertNoMarkdownDelimitersOnDeliveredPages(pageTexts, fixtureName) {
  const defects = [];
  for (const [i, text] of pageTexts.entries()) {
    for (const hit of markdownDelimitersOnPage(text)) {
      defects.push(`page ${i + 1}: ${hit.delimiter} around "${hit.wraps.slice(0, 60)}"`);
    }
  }
  if (defects.length > 0) {
    throw new Error(
      `${fixtureName}: markdown emphasis delimiters are printed as body text on a delivered page `
      + `(${defects.length} occurrence${defects.length === 1 ? "" : "s"}): ${defects.join("; ")}. `
      + "A composed page carries prose, not markup; see scripts/rcap-custom-pleading/composed-page-markdown.mjs."
    );
  }
}
