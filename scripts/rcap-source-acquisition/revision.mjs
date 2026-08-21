// Reads the revision a form prints about ITSELF, and compares it to what the
// register expected.
//
// Every receipt this repository writes has carried
// `editionOrRevision: "unread — take it from the document's own printed
// revision line"`. That line is on the page: courts stamp it in the footer.
// Nothing was reading it, so no acquisition could say which edition arrived,
// and a new revision of a form was indistinguishable from the held one except
// by a hash that changes for any reason at all — a re-save, a new producer, a
// compression change.
//
// What this module does and does not settle:
//
//   it reads    what the document says its own revision is
//   it compares that against a revision the register expected
//   it does NOT establish that this is the currently published edition
//
// The last one needs the publisher's own forms index and stays a review
// decision. A form can print "Rev. 3/19" and still be what the court serves
// today; a form can print nothing at all and still be current.
//
// The patterns here were taken from the forms this repository actually holds,
// not invented: California prints `CR-180 [Rev. January 1, 2024]`, Minnesota
// `EXP107 State ENG Rev 01/15`, Florida `Revised October 2019`, and one form
// prints `(Rev. 12.20.18)`. So were the traps — "Ohio Revised Code" is a
// statute citation and must never be read as a revision date.
import zlib from "node:zlib";

// Streams that hold an embedded font, image or metadata payload rather than
// page text. Their bytes decode into thousands of nonsense "words" that swamp
// any real revision line.
const NON_TEXT_STREAM = /\/(Image|FontFile\d?|Type1C|CIDFontType0C|CIDFontType2|Metadata|XML|EmbeddedFile|ICCBased)\b/;

// Enough of the object dictionary to see what the stream is, without scanning
// backwards through the whole file for every stream in it.
const DICT_LOOKBACK = 500;

// A page content stream is ASCII operator text. Below this share of printable
// bytes it is a binary program that happened to survive the dictionary check.
const MIN_PRINTABLE_SHARE = 0.9;

/**
 * The text a PDF prints, as far as it can be read without rendering it.
 *
 * Returns `{ text, streamsRead, extractable }`. `extractable: false` means the
 * document yielded no readable text — a scan, an unmapped CID font, an
 * encrypted body. That is a fact about the document, not a failure to report:
 * a form whose text cannot be read simply has no printed revision this way,
 * and saying so is the honest answer.
 */
export function extractPdfText(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return { text: "", streamsRead: 0, extractable: false };
  }
  const latin = bytes.toString("latin1");
  const chunks = [];
  const streamStart = /stream\r?\n/g;
  let match;
  while ((match = streamStart.exec(latin))) {
    const dict = latin.slice(Math.max(0, match.index - DICT_LOOKBACK), match.index);
    if (NON_TEXT_STREAM.test(dict)) continue;

    const start = match.index + match[0].length;
    const end = latin.indexOf("endstream", start);
    if (end < 0) continue;

    let decoded;
    if (/\/FlateDecode/.test(dict)) {
      try {
        decoded = zlib.inflateSync(bytes.subarray(start, end)).toString("latin1");
      } catch {
        continue;
      }
    } else {
      decoded = latin.slice(start, end);
    }

    // Text-showing operators, or it is not a page content stream.
    if (!/BT[\s\r\n]/.test(decoded) || !/\bTf\b/.test(decoded) || !/\bET\b/.test(decoded)) continue;
    if (printableShare(decoded) < MIN_PRINTABLE_SHARE) continue;

    chunks.push(decoded);
  }

  const text = chunks.map(literalStrings).join("\n").replace(/[ \t]+/g, " ");
  return { text, streamsRead: chunks.length, extractable: text.trim().length > 0 };
}

function printableShare(value) {
  if (value.length === 0) return 0;
  let printable = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) printable += 1;
  }
  return printable / value.length;
}

/**
 * PDF literal strings, scanned linearly.
 *
 * Deliberately not a regular expression. The obvious one — alternating a
 * string against a TJ array — backtracks catastrophically on a one-megabyte
 * content stream and hangs the process; a scanner that walks the buffer once
 * cannot.
 */
function literalStrings(chunk) {
  const parts = [];
  const n = chunk.length;
  let i = 0;
  while (i < n) {
    const open = chunk.indexOf("(", i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    let buf = "";
    while (j < n && depth > 0) {
      const c = chunk[j];
      if (c === "\\") {
        const next = chunk[j + 1];
        if (next >= "0" && next <= "7") {
          // An octal escape is one glyph; which glyph needs the font's
          // encoding, which is not read here. A space keeps words apart
          // instead of fusing them.
          let k = j + 1;
          let digits = 0;
          while (k < n && digits < 3 && chunk[k] >= "0" && chunk[k] <= "7") { k += 1; digits += 1; }
          buf += " ";
          j = k;
          continue;
        }
        buf += next === "(" || next === ")" || next === "\\" ? next : " ";
        j += 2;
        continue;
      }
      if (c === "(") { depth += 1; buf += c; j += 1; continue; }
      if (c === ")") { depth -= 1; if (depth === 0) { j += 1; break; } buf += c; j += 1; continue; }
      buf += c;
      j += 1;
    }
    parts.push(buf);
    i = j;
  }
  return parts.join(" ");
}

// "Ohio Revised Code", "Revised Statutes", "Revised Ordinances" — a citation to
// a body of law, never a statement about this form's edition. Reading one as a
// revision would stamp a form with a date taken from a statute reference.
const STATUTE_CITATION_AFTER_MARKER = /^\s*(code|statutes?|stat\.|ordinances?|rules?)\b/i;

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};
const MONTH_NAME = Object.keys(MONTHS).join("|");

// A revision marker followed by the date it stamps. The window after the
// marker is short on purpose: a date three sentences later is a different fact.
const REVISION_PATTERNS = [
  // CR-180 [Rev. January 1, 2024]   /   Rev. January 2024
  {
    kind: "month_name",
    re: new RegExp(`\\b(rev(?:ised|\\.|\\b)|effective)\\.?\\s*:?\\s*(${MONTH_NAME})\\s+(\\d{1,2})\\s*,\\s*(\\d{4})\\b`, "gi"),
    read: (m) => ({ year: Number(m[4]), month: MONTHS[m[2].toLowerCase()], day: Number(m[3]) })
  },
  {
    kind: "month_name_year",
    re: new RegExp(`\\b(rev(?:ised|\\.|\\b)|effective)\\.?\\s*:?\\s*(${MONTH_NAME})\\s+(\\d{4})\\b`, "gi"),
    read: (m) => ({ year: Number(m[3]), month: MONTHS[m[2].toLowerCase()], day: null })
  },
  // Rev. 12/20/2018, Rev 1-5-24
  {
    kind: "numeric_date",
    re: /\b(rev(?:ised|\.|\b)|effective)\.?\s*:?\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/gi,
    read: (m) => ({ year: fourDigitYear(m[4]), month: Number(m[2]), day: Number(m[3]) })
  },
  // EXP107 State ENG Rev 01/15  — month and two-digit year, no day.
  //
  // The lookahead keeps this off the front of a full date. Without it
  // "Rev. 12.20.18" is read twice: once correctly as 20 December 2018, and
  // again as its own prefix "Rev. 12.20" — December 2020, a revision the
  // document never printed.
  {
    kind: "month_year",
    re: /\b(rev(?:ised|\.|\b)|effective)\.?\s*:?\s*(\d{1,2})[/.-](\d{2,4})\b(?![/.-]\d)/gi,
    read: (m) => ({ year: fourDigitYear(m[3]), month: Number(m[2]), day: null })
  }
];

function fourDigitYear(raw) {
  const n = Number(raw);
  if (raw.length === 4) return n;
  // A court form's two-digit year is the recent past, not the near future.
  return n <= 79 ? 2000 + n : 1900 + n;
}

function normalize({ year, month, day }) {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) return null;
  const ym = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  return day === null ? ym : `${ym}-${String(day).padStart(2, "0")}`;
}

/**
 * Every revision this document prints about itself.
 *
 * A form usually prints the same stamp in every page footer, so identical
 * reads collapse to one, carrying how many times they occurred. Two DIFFERENT
 * stamps do not collapse: a packet that prints two revisions is describing more
 * than one form, and choosing between them here would hide that.
 *
 * `nearFormNumber` records whether the form's own number sits beside the stamp,
 * which is what distinguishes this form's revision from one printed by an
 * attached exhibit.
 */
export function readPrintedRevisions(text, { formNumber = null } = {}) {
  const source = String(text ?? "");
  const found = new Map();

  for (const pattern of REVISION_PATTERNS) {
    pattern.re.lastIndex = 0;
    let m;
    while ((m = pattern.re.exec(source))) {
      const after = source.slice(m.index + m[0].length);
      // "Revised Code" — the marker belongs to a statute citation.
      if (STATUTE_CITATION_AFTER_MARKER.test(source.slice(m.index + m[1].length, m.index + m[1].length + 16))) continue;

      const parts = pattern.read(m);
      const normalized = normalize(parts);
      const raw = m[0].replace(/\s+/g, " ").trim();
      const key = normalized ?? `raw:${raw.toLowerCase()}`;

      const context = source.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20);
      const existing = found.get(key);
      if (existing) {
        existing.occurrences += 1;
        existing.nearFormNumber = existing.nearFormNumber || mentionsForm(context, formNumber);
        continue;
      }
      found.set(key, {
        raw,
        marker: m[1].toLowerCase().replace(/\.$/, ""),
        kind: pattern.kind,
        normalized,
        // A stamp we matched but could not turn into a date is reported as
        // read-but-unparseable. Text extraction damages spacing often enough
        // ("Form CR-65 Rev. / 202") that inventing a date from the wreckage
        // would be worse than saying it could not be read.
        parsed: normalized !== null,
        occurrences: 1,
        nearFormNumber: mentionsForm(context, formNumber),
        context: context.replace(/\s+/g, " ").trim()
      });
      void after;
    }
  }

  return [...found.values()].sort((a, b) => {
    if (a.nearFormNumber !== b.nearFormNumber) return a.nearFormNumber ? -1 : 1;
    if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
    return String(a.normalized ?? a.raw) < String(b.normalized ?? b.raw) ? -1 : 1;
  });
}

function mentionsForm(context, formNumber) {
  if (!formNumber) return false;
  const tokens = formTokens(formNumber);
  const haystack = context.toLowerCase().replace(/\s+/g, "");
  return tokens.some((t) => t.length >= 3 && haystack.includes(t));
}

/** Comparable spellings of a form number: "AOC-CR-287" → aoc-cr-287, aoccr287. */
export function formTokens(formNumber) {
  const raw = String(formNumber ?? "").trim().toLowerCase();
  if (!raw) return [];
  const compact = raw.replace(/[^a-z0-9]/g, "");
  return [...new Set([raw, compact])].filter(Boolean);
}

/**
 * Compare what the document printed against what the register expected.
 *
 * The verdicts are deliberately separate states, because the decisions they
 * lead to are different:
 *
 *   confirmed              the document prints the expected revision
 *   contradicted           it prints a DIFFERENT one — the pin is stale, or the
 *                          publisher reissued the form
 *   no_expectation_recorded  nothing to confirm against; the read stands alone
 *   not_printed            the document prints no revision this reader can find
 *   unreadable             no text could be extracted at all
 *   ambiguous              it prints more than one revision and none is tied to
 *                          this form number
 *
 * `not_printed` is never reported as a contradiction. A form without a printed
 * revision line is common and says nothing against the register.
 */
export function confirmRevision({ printed = [], expected = null, extractable = true } = {}) {
  const readings = [...printed];
  const expectation = expected === null || expected === undefined || expected === "" ? null : String(expected);

  if (!extractable) {
    return {
      verdict: "unreadable",
      expected: expectation,
      printedRevisions: [],
      why: "no page text could be extracted, so the document's own revision line could not be read"
    };
  }
  if (readings.length === 0) {
    return {
      verdict: "not_printed",
      expected: expectation,
      printedRevisions: [],
      why: "the document prints no revision line this reader recognises; that is not evidence against the expected revision"
    };
  }

  // The reading tied to this form's own number wins over one that is not.
  const tied = readings.filter((r) => r.nearFormNumber);
  const primary = tied.length > 0 ? tied[0] : readings[0];
  const distinct = new Set(readings.map((r) => r.normalized ?? r.raw.toLowerCase()));

  if (expectation === null) {
    return {
      verdict: "no_expectation_recorded",
      expected: null,
      printedRevision: primary.normalized ?? primary.raw,
      printedRevisions: readings,
      ambiguousReading: tied.length === 0 && distinct.size > 1,
      why: "the document's revision was read; the register recorded no expected revision to confirm it against"
    };
  }

  if (tied.length === 0 && distinct.size > 1) {
    return {
      verdict: "ambiguous",
      expected: expectation,
      printedRevisions: readings,
      why: "more than one revision is printed and none sits beside this form's number, so which one is this form's is undecided"
    };
  }

  const matches = readings.some((r) => sameRevision(r, expectation));
  return {
    verdict: matches ? "confirmed" : "contradicted",
    expected: expectation,
    printedRevision: primary.normalized ?? primary.raw,
    printedRevisions: readings,
    why: matches
      ? "the document prints the revision the register expected"
      : "the document prints a different revision from the one the register expected; either the pin is stale or the publisher reissued the form"
  };
}

function sameRevision(reading, expectation) {
  const want = expectation.trim().toLowerCase();
  if (reading.normalized && reading.normalized.toLowerCase() === want) return true;
  // An expectation written the way the form prints it ("Rev. January 1, 2024")
  // is still the same claim as the normalized date.
  const normalizedExpectation = normalizeExpectation(want);
  if (normalizedExpectation && reading.normalized && normalizedExpectation === reading.normalized) return true;
  return reading.raw.trim().toLowerCase() === want;
}

/** An expected revision written in prose, reduced to the same shape as a read one. */
export function normalizeExpectation(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(raw)) return raw;

  const named = raw.match(new RegExp(`(${MONTH_NAME})\\s+(\\d{1,2})\\s*,\\s*(\\d{4})`));
  if (named) return normalize({ year: Number(named[3]), month: MONTHS[named[1]], day: Number(named[2]) });

  const namedYear = raw.match(new RegExp(`(${MONTH_NAME})\\s+(\\d{4})`));
  if (namedYear) return normalize({ year: Number(namedYear[2]), month: MONTHS[namedYear[1]], day: null });

  const full = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (full) return normalize({ year: fourDigitYear(full[3]), month: Number(full[1]), day: Number(full[2]) });

  const short = raw.match(/(\d{1,2})[/.-](\d{2,4})/);
  if (short) return normalize({ year: fourDigitYear(short[2]), month: Number(short[1]), day: null });

  return null;
}

/** The whole read, for one acquired document. */
export function readRevisionFromPdf(bytes, { formNumber = null, expectedRevision = null } = {}) {
  const { text, streamsRead, extractable } = extractPdfText(bytes);
  const printed = readPrintedRevisions(text, { formNumber });
  const confirmation = confirmRevision({ printed, expected: expectedRevision, extractable });
  return { ...confirmation, streamsRead, textCharacters: text.length };
}
