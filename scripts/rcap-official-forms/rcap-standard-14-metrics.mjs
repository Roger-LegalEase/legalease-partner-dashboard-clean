// Advance-width metrics for the fourteen standard PDF faces.
//
// WHY THIS EXISTS
//
// A geometry check computes a drawn string's width from font metrics and
// compares its end x against a write box, a clip window or a page margin. If
// the metrics do not come from the font the page actually uses, the check
// reports a number with nothing to do with the page. It fails silently and in
// BOTH directions, so neither outcome looks like an error.
//
// A subset font carries an explicit /Widths array and its advances come
// straight from the file. The base-14 faces -- Helvetica, Times-Roman, Courier
// and their variants, plus Symbol and ZapfDingbats -- carry NO /Widths: the
// viewer supplies AFM metrics from the /BaseFont name. A reader that only
// knows how to read /Widths therefore has to fall back to something, and
// whatever it falls back to is applied uniformly to every base-14 page.
//
// In this corpus that fallback was a uniform 500/1000 half-em advance, and the
// delivered census-v1 tree is 117,495 base-14 font-resource occurrences with no
// /Widths at all -- 73,641 Times-Roman, 42,140 Helvetica, 1,315 Helvetica-Bold,
// 329 ZapfDingbats, 38 Courier, 26 Times-Bold, 6 Symbol. Every one of them was
// measured at 500. Both errors are live in the same tree:
//
//   Times-Roman lowercase runs 444 (a, e), 500 (n), 389 (s). Measuring it at
//   500 reads roughly 10-12% WIDE on ordinary prose, which MANUFACTURES an
//   overflow that is not on the page and sends a repair lane after it.
//
//   Helvetica lowercase runs 556 (a, e, n), 500 (s). Measuring it at 500 reads
//   roughly 8-10% NARROW, which HIDES an overflow that is on the page and
//   ships a clipped filing under a green counter. That is the worse direction
//   and it is the one nobody sees.
//
// WHERE THE NUMBERS COME FROM
//
// Not a hand-typed table. `@pdf-lib/standard-fonts` is already in this tree as
// a pdf-lib dependency and carries the Adobe AFM data for all fourteen faces --
// the same metrics pdf-lib uses when a builder DRAWS with a standard font. So
// the ruler that measures a delivered page is now the same ruler that drew it.
// A hand-copied table is a second source of truth that can drift from the
// first; this cannot.
//
// WHAT IS NOT MEASURABLE IS NULL, NOT ZERO
//
// A font with no /Widths whose /BaseFont is not one of the fourteen is not
// measurable here, and this module says so by returning null rather than
// guessing. A guess produces a number a downstream check will compare against a
// rule and report on, and nothing downstream can tell it apart from a real
// measurement. Same discipline the nine counters use.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Font, FontNames, Encodings } = require("@pdf-lib/standard-fonts");

/** The fourteen /BaseFont names a viewer resolves from metrics it already has. */
export const STANDARD_14_FACES = Object.freeze([
  "Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique",
  "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
  "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic",
  "Symbol", "ZapfDingbats"
]);

const FACE_SET = new Set(STANDARD_14_FACES);

/**
 * Which built-in encoding a face uses when the font dictionary names none.
 *
 * Symbol and ZapfDingbats are symbolic: their code points mean nothing outside
 * their own encoding, and substituting WinAnsi for either produces glyph names
 * the AFM does not hold -- which is an unmeasurable run, not a wrong one.
 */
const BUILTIN_ENCODING = { Symbol: "Symbol", ZapfDingbats: "ZapfDingbats" };

/**
 * StandardEncoding for the printable ASCII range.
 *
 * It differs from WinAnsiEncoding at exactly two codes in this range, and both
 * are real width differences rather than spelling: 39 is `quoteright` (Helvetica
 * 222) under Standard and `quotesingle` (191) under WinAnsi; 96 is `quoteleft`
 * (222) under Standard and `grave` (333) under WinAnsi. A font dictionary with
 * no /Encoding at all gets Standard, so guessing WinAnsi there is wrong by up to
 * 111/1000 em per apostrophe -- small, but wrong in a place a caption is likely
 * to use.
 */
const STANDARD_ASCII_NAMES = (() => {
  const names = {
    32: "space", 33: "exclam", 34: "quotedbl", 35: "numbersign", 36: "dollar",
    37: "percent", 38: "ampersand", 39: "quoteright", 40: "parenleft",
    41: "parenright", 42: "asterisk", 43: "plus", 44: "comma", 45: "hyphen",
    46: "period", 47: "slash", 58: "colon", 59: "semicolon", 60: "less",
    61: "equal", 62: "greater", 63: "question", 64: "at", 91: "bracketleft",
    92: "backslash", 93: "bracketright", 94: "asciicircum", 95: "underscore",
    96: "quoteleft", 123: "braceleft", 124: "bar", 125: "braceright",
    126: "asciitilde"
  };
  const digits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  for (let i = 0; i < 10; i += 1) names[48 + i] = digits[i];
  for (let c = 65; c <= 90; c += 1) names[c] = String.fromCharCode(c);
  for (let c = 97; c <= 122; c += 1) names[c] = String.fromCharCode(c);
  return Object.freeze(names);
})();

/** code -> glyph name, for one of the encodings `@pdf-lib/standard-fonts` ships. */
function codeToNameFromEncoding(encoding) {
  const out = new Map();
  for (const key of Object.keys(encoding.unicodeMappings)) {
    const entry = encoding.unicodeMappings[key];
    if (!Array.isArray(entry)) continue;
    const [code, name] = entry;
    if (Number.isFinite(code) && typeof name === "string" && !out.has(code)) out.set(code, name);
  }
  return out;
}

const encodingTables = new Map();
function encodingTable(which) {
  if (encodingTables.has(which)) return encodingTables.get(which);
  let table;
  if (which === "Standard") {
    table = new Map(Object.entries(STANDARD_ASCII_NAMES).map(([c, n]) => [Number(c), n]));
  } else if (which === "Symbol") {
    table = codeToNameFromEncoding(Encodings.Symbol);
  } else if (which === "ZapfDingbats") {
    table = codeToNameFromEncoding(Encodings.ZapfDingbats);
  } else {
    table = codeToNameFromEncoding(Encodings.WinAnsi);
  }
  encodingTables.set(which, table);
  return table;
}

const afmCache = new Map();
function afmFor(face) {
  if (afmCache.has(face)) return afmCache.get(face);
  const key = Object.keys(FontNames).find((k) => FontNames[k] === face);
  let font = null;
  try { font = key ? Font.load(FontNames[key]) : null; } catch { font = null; }
  afmCache.set(face, font);
  return font;
}

/**
 * The /BaseFont name with a subset tag removed, or null if it is not a name.
 *
 * A subset tag is six uppercase letters and a plus, e.g. `HVCGOJ+TimesNewRomanPSMT`.
 * A subsetted font always carries its own /Widths, so a subset tag on a font
 * that reached this module is already a signal that something is off; stripping
 * it costs nothing and keeps the comparison honest.
 */
export function normalizeBaseFontName(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/^\//, "").trim();
  if (!text) return null;
  return text.replace(/^[A-Z]{6}\+/, "");
}

/**
 * Is this /BaseFont one of the fourteen faces every viewer already holds?
 *
 * Deliberately exact. `Arial` and `TimesNewRomanPSMT` are the faces a viewer
 * SUBSTITUTES a standard face for, and their real metrics are close but not
 * identical; treating a substitution as a measurement is how a ruler starts
 * reading a font the page does not use, which is the whole defect. A
 * non-standard name with no /Widths is unmeasurable and says so.
 */
export function isStandard14(baseFontName) {
  return FACE_SET.has(normalizeBaseFontName(baseFontName) ?? "");
}

/**
 * A code -> advance-width (1/1000 em) table for a standard-14 face, or null.
 *
 * `encoding` is the /Encoding value as written: a name (`WinAnsiEncoding`,
 * `MacRomanEncoding`, `StandardEncoding`), or null when the dictionary has
 * none. `differences` is the flattened /Differences array from an encoding
 * dictionary, which overrides individual codes.
 */
export function standard14Metrics(baseFontName, { encoding = null, differences = null } = {}) {
  const face = normalizeBaseFontName(baseFontName);
  if (!face || !FACE_SET.has(face)) return null;
  const afm = afmFor(face);
  if (!afm) return null;

  const named = String(encoding ?? "").replace(/^\//, "");
  const which = BUILTIN_ENCODING[face]
    ?? (named === "WinAnsiEncoding" ? "WinAnsi"
      : named === "StandardEncoding" ? "Standard"
        : named === "MacRomanEncoding" ? "WinAnsi"
          : named ? "WinAnsi"
            : "Standard");
  // MacRomanEncoding agrees with WinAnsi across ASCII and diverges only above
  // 127. This corpus draws no MacRoman page; if one appears, its high codes are
  // measured against WinAnsi names and any name the AFM does not hold comes
  // back unmeasurable rather than guessed.

  const table = new Map(encodingTable(which));
  if (Array.isArray(differences)) {
    let code = null;
    for (const entry of differences) {
      if (typeof entry === "number") { code = entry; continue; }
      if (typeof entry === "string" && code !== null) { table.set(code, entry.replace(/^\//, "")); code += 1; }
    }
  }

  const widths = new Map();
  for (const [code, glyphName] of table) {
    let w;
    try { w = afm.getWidthOfGlyph(glyphName); } catch { w = undefined; }
    if (Number.isFinite(w)) widths.set(code, w);
  }
  if (widths.size === 0) return null;
  return {
    face,
    encoding: which,
    widths,
    source: `afm:@pdf-lib/standard-fonts:${face}`,
    hasDifferences: Array.isArray(differences) && differences.length > 0
  };
}

/**
 * Advance width of a string at a size, in points, for a standard-14 face.
 *
 * Returns null when the face is not one of the fourteen, and reports
 * `exact: false` with the unmeasured codes named when the string uses a code
 * the resolved encoding does not map. A caller that wants a number regardless
 * has to decide that for itself; this will not decide it silently.
 */
export function measureStandard14(baseFontName, text, size, options = {}) {
  const metrics = standard14Metrics(baseFontName, options);
  if (!metrics) return null;
  let mils = 0;
  const unmapped = [];
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const w = metrics.widths.get(code);
    if (w === undefined) { unmapped.push(code); continue; }
    mils += w;
  }
  return {
    face: metrics.face,
    encoding: metrics.encoding,
    width: unmapped.length > 0 ? null : Number(((mils / 1000) * size).toFixed(4)),
    exact: unmapped.length === 0,
    unmappedCodes: unmapped,
    source: metrics.source
  };
}
