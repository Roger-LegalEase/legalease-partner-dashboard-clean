// Measures overlay anchors out of a flat PDF's own page content streams.
//
// A flat PDF has no AcroForm widgets, so there is nothing to fill and nothing
// to interrogate for geometry. The only honest way to place an overlay on one
// is to read where the form's printed labels actually sit. This module decodes
// each page's content stream, walks the text-showing operators while tracking
// the text and line matrices, and reports every drawn string with the device
// coordinates and font size it was drawn at.
//
// Nothing here infers or invents a coordinate: every anchor returned is a
// string that exists in the document, at the position the document draws it.
// Callers still decide which anchors are meaningful and where to write
// relative to them.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFRawStream, PDFArray, PDFName, PDFDict, decodePDFRawStream } = require("pdf-lib");

function contentBytesOf(page) {
  const contents = page.node.Contents();
  if (!contents) return new Uint8Array();
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => page.node.context.lookup(ref))
    : [contents];
  const parts = [];
  for (const s of streams) {
    if (!(s instanceof PDFRawStream)) continue;
    try { parts.push(decodePDFRawStream(s).decode()); } catch { /* undecodable stream: skip */ }
  }
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total + parts.length);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; out[o++] = 0x0a; }
  return out;
}

// PDF string literals allow nested parens and backslash escapes; a naive scan
// for the closing paren truncates any label containing "(CourtView)".
function readLiteralString(src, i) {
  let depth = 1, out = "";
  i++;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "\\") {
      const n = src[i + 1];
      const simple = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      if (n in simple) { out += simple[n]; i += 2; continue; }
      if (/[0-7]/.test(n)) {
        const m = /^[0-7]{1,3}/.exec(src.slice(i + 1));
        out += String.fromCharCode(parseInt(m[0], 8));
        i += 1 + m[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === "(") { depth++; out += ch; i++; continue; }
    if (ch === ")") { depth--; if (depth > 0) out += ch; i++; continue; }
    out += ch;
    i++;
  }
  return [out, i];
}

function readHexString(src, i) {
  const end = src.indexOf(">", i);
  const hex = src.slice(i + 1, end === -1 ? src.length : end).replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let k = 0; k + 1 < hex.length; k += 2) out += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
  return [out, end === -1 ? src.length : end + 1];
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "%") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "(") { const [s, ni] = readLiteralString(src, i); tokens.push({ t: "str", v: s }); i = ni; continue; }
    if (ch === "<" && src[i + 1] !== "<") { const [s, ni] = readHexString(src, i); tokens.push({ t: "str", v: s }); i = ni; continue; }
    if (ch === "<" && src[i + 1] === "<") { tokens.push({ t: "op", v: "<<" }); i += 2; continue; }
    if (ch === ">" && src[i + 1] === ">") { tokens.push({ t: "op", v: ">>" }); i += 2; continue; }
    if (ch === "[") { tokens.push({ t: "op", v: "[" }); i++; continue; }
    if (ch === "]") { tokens.push({ t: "op", v: "]" }); i++; continue; }
    if (ch === "/") {
      const m = /^\/[^\s/[\]()<>{}%]*/.exec(src.slice(i));
      tokens.push({ t: "name", v: m[0].slice(1) });
      i += m[0].length;
      continue;
    }
    const num = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (num) { tokens.push({ t: "num", v: Number(num[0]) }); i += num[0].length; continue; }
    const op = /^[A-Za-z'"*][A-Za-z0-9'"*]*/.exec(src.slice(i));
    if (op) { tokens.push({ t: "op", v: op[0] }); i += op[0].length; continue; }
    i++;
  }
  return tokens;
}

// Every font in this corpus carries an explicit /Widths array, so advances are
// computed from the document's own metrics rather than estimated. A font that
// does not (a Type0/Identity-H subset) is reported as inexact and its runs are
// excluded from anchor placement.
function loadFonts(res, ctx) {
  const out = new Map();
  if (!res) return out;
  let fonts;
  try { fonts = res.lookup(PDFName.of("Font"), PDFDict); } catch { return out; }
  if (!fonts) return out;
  for (const [key, ref] of fonts.entries()) {
    let fd;
    try { fd = ctx.lookup(ref, PDFDict); } catch { continue; }
    if (!fd) continue;
    const subtype = String(fd.get(PDFName.of("Subtype")) ?? "");
    const firstChar = Number(fd.get(PDFName.of("FirstChar"))?.asNumber?.() ?? 0);
    let widths = null;
    try {
      const w = fd.lookupMaybe(PDFName.of("Widths"), PDFArray);
      if (w) widths = w.asArray().map((n) => Number(ctx.lookup(n)?.asNumber?.() ?? n?.asNumber?.() ?? 0));
    } catch { /* no widths */ }
    let missingWidth = 0;
    try {
      const desc = fd.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
      missingWidth = Number(desc?.get(PDFName.of("MissingWidth"))?.asNumber?.() ?? 0);
    } catch { /* default */ }
    out.set(key.asString().replace(/^\//, ""), {
      subtype, firstChar, widths, missingWidth,
      exact: Boolean(widths) && subtype !== "Type0"
    });
  }
  return out;
}

function charAdvance(font, ch, size, charSpace, wordSpace, hScale) {
  const code = ch.charCodeAt(0);
  let w;
  if (font?.widths && code >= font.firstChar && code - font.firstChar < font.widths.length) {
    w = font.widths[code - font.firstChar];
  } else if (font?.missingWidth) w = font.missingWidth;
  else w = 500;
  return ((w / 1000) * size + charSpace + (code === 32 ? wordSpace : 0)) * hScale;
}

function advanceOf(font, text, size, charSpace, wordSpace, hScale) {
  let total = 0;
  for (const ch of text) total += charAdvance(font, ch, size, charSpace, wordSpace, hScale);
  return total;
}

const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]
];

// Walks one page's operators and returns every drawn string with its device
// position. Text is grouped into runs so a label split across several Tj
// operators reads back as one anchor.
export function extractTextItems(page) {
  return walkContent(contentBytesOf(page), page.node.Resources?.(), page.node.context, [1, 0, 0, 1, 0, 0], 0, "page_content").text;
}

/**
 * Every path segment the page draws, in page space, with the operator that drew
 * it and the stream it came from.
 *
 * The same walker produces this as produces the text, which is the point: a
 * rule and the caption beside it have to be measured in one coordinate space or
 * the association between them is meaningless. A second parser reading the raw
 * stream with a regex — no graphics state, no transformation matrix, no
 * XObject recursion — would report a rule at whatever coordinates it happened
 * to be authored in, which is not where it is drawn.
 */
export function extractPathSegments(page) {
  return walkContent(contentBytesOf(page), page.node.Resources?.(), page.node.context, [1, 0, 0, 1, 0, 0], 0, "page_content").paths;
}

/** Both, from one walk. */
export function extractPageGeometry(page) {
  return walkContent(contentBytesOf(page), page.node.Resources?.(), page.node.context, [1, 0, 0, 1, 0, 0], 0, "page_content");
}

/** A point through the current transformation matrix. */
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// Flattening a filled form does not inline the value as page text: pdf-lib
// draws each field's appearance stream as a Form XObject and references it
// with `Do`. Text inside that XObject is genuinely visible on the page, so a
// walker that stops at the page's own content stream reports a filled form as
// empty. Recursing through `Do` is what makes "the value is visibly present"
// a checkable claim rather than an assumption.
const MAX_XOBJECT_DEPTH = 12;

function walkContent(bytes, resources, ctx, baseCtm, depth, streamId) {
  if (!bytes || bytes.length === 0) return { text: [], paths: [] };
  const src = Buffer.from(bytes).toString("latin1");
  const tokens = tokenize(src);

  const fonts = loadFonts(resources, ctx);
  const items = [];
  const paths = [];
  // The path currently being constructed, in page space. Segments are recorded
  // when a painting operator realises them: a path that is built and then
  // discarded (`n`) draws nothing and must not become a rule.
  let current = [];
  let subpathStart = null;
  let cursor = null;
  // Every segment realised by one painting operator shares a path index, so a
  // caller can reassemble the whole painted path. A thin filled rectangle is
  // usually authored as four lines rather than one `re`, and its three or four
  // segments are only a rule when read together.
  let pathIndex = 0;
  const flushPath = (operator) => {
    if (current.length > 0) {
      for (const seg of current) paths.push({ ...seg, paintedBy: operator, stream: streamId, depth, pathIndex });
      pathIndex += 1;
    }
    current = [];
    subpathStart = null;
    cursor = null;
  };
  let ctm = baseCtm.slice();
  let font = null;
  const stack = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0];
  let fontSize = 0, leading = 0, charSpace = 0, wordSpace = 0, hScale = 1;
  const operands = [];

  const show = (text) => {
    if (!text) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[0], m[1]) || 1;
    const size = fontSize * scale;
    // Per-character positions: a fill-in-the-blank form's rule lines are found
    // by locating contiguous underscores, which needs each glyph's own x.
    const chars = [];
    let cursor = 0;
    for (const ch of text) {
      const a = charAdvance(font, ch, fontSize, charSpace, wordSpace, hScale);
      chars.push({ c: ch, x: Number((m[4] + cursor * scale).toFixed(2)), w: Number((a * scale).toFixed(2)) });
      cursor += a;
    }
    items.push({ text, x: m[4], y: m[5], size: Number(size.toFixed(2)),
      width: Number((cursor * scale).toFixed(2)), metricsExact: font?.exact === true, chars });
    tm = mul([1, 0, 0, 1, cursor, 0], tm);
  };

  for (const tk of tokens) {
    if (tk.t !== "op") { operands.push(tk); continue; }
    const n = (k) => { const v = operands[operands.length - k]; return v && v.t === "num" ? v.v : 0; };
    switch (tk.v) {
      case "q": stack.push(ctm.slice()); break;
      case "Q": ctm = stack.pop() ?? ctm; break;
      // ---- path construction, in page space -------------------------------
      case "re": {
        const [x, y, w, h] = [n(4), n(3), n(2), n(1)];
        const corners = [apply(ctm, x, y), apply(ctm, x + w, y), apply(ctm, x + w, y + h), apply(ctm, x, y + h)];
        const xs = corners.map((c) => c[0]);
        const ys = corners.map((c) => c[1]);
        current.push({
          operator: "re",
          x: Math.min(...xs), y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        });
        break;
      }
      case "m": { cursor = apply(ctm, n(2), n(1)); subpathStart = cursor; break; }
      case "l": {
        const to = apply(ctm, n(2), n(1));
        if (cursor) {
          current.push({
            operator: "l",
            x: Math.min(cursor[0], to[0]), y: Math.min(cursor[1], to[1]),
            width: Math.abs(to[0] - cursor[0]), height: Math.abs(to[1] - cursor[1])
          });
        }
        cursor = to;
        break;
      }
      case "h": { if (cursor && subpathStart) cursor = subpathStart; break; }
      case "S": case "s": case "f": case "F": case "f*":
      case "B": case "B*": case "b": case "b*":
        flushPath(tk.v);
        break;
      case "n": current = []; cursor = null; subpathStart = null; break;
      case "cm": ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm); break;
      case "BT": tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); break;
      case "ET": break;
      case "Tf": {
        fontSize = n(1);
        const nameTok = [...operands].reverse().find((o) => o.t === "name");
        font = nameTok ? fonts.get(nameTok.v) ?? null : null;
        break;
      }
      case "TL": leading = n(1); break;
      case "Tc": charSpace = n(1); break;
      case "Tw": wordSpace = n(1); break;
      case "Tz": hScale = n(1) / 100; break;
      case "Td": tlm = mul([1, 0, 0, 1, n(2), n(1)], tlm); tm = tlm.slice(); break;
      case "TD": leading = -n(1); tlm = mul([1, 0, 0, 1, n(2), n(1)], tlm); tm = tlm.slice(); break;
      case "Tm": tlm = [n(6), n(5), n(4), n(3), n(2), n(1)]; tm = tlm.slice(); break;
      case "T*": tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); break;
      case "Tj": show(operands[operands.length - 1]?.v); break;
      case "'": tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); show(operands[operands.length - 1]?.v); break;
      case '"': tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); show(operands[operands.length - 1]?.v); break;
      case "TJ": {
        let open = -1;
        for (let k = operands.length - 1; k >= 0; k--) if (operands[k].t === "op" && operands[k].v === "[") { open = k; break; }
        if (open >= 0) {
          for (let k = open + 1; k < operands.length; k++) {
            const el = operands[k];
            if (el.t === "str") show(el.v);
            else if (el.t === "num") tm = mul([1, 0, 0, 1, -el.v / 1000 * fontSize * hScale, 0], tm);
          }
        }
        break;
      }
      case "Do": {
        if (depth >= MAX_XOBJECT_DEPTH) break;
        const nameTok = [...operands].reverse().find((o) => o.t === "name");
        if (!nameTok || !resources) break;
        try {
          const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
          const xo = xobjects ? ctx.lookup(xobjects.get(PDFName.of(nameTok.v))) : null;
          if (!(xo instanceof PDFRawStream)) break;
          const dict = xo.dict;
          if (String(dict.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "") !== "Form") break;
          // A Form XObject carries its own space: /Matrix maps it into the
          // current one, and its /Resources shadow the parent's when present.
          const matrixArr = dict.lookupMaybe(PDFName.of("Matrix"), PDFArray);
          const matrix = matrixArr
            ? matrixArr.asArray().map((v) => Number(ctx.lookup(v)?.asNumber?.() ?? v?.asNumber?.() ?? 0))
            : [1, 0, 0, 1, 0, 0];
          const inner = dict.lookupMaybe(PDFName.of("Resources"), PDFDict) ?? resources;
          const nested = walkContent(decodePDFRawStream(xo).decode(), inner, ctx, mul(matrix, ctm), depth + 1, `${streamId}>form_xobject:${nameTok.v}`);
          items.push(...nested.text);
          paths.push(...nested.paths);
        } catch { /* an unreadable XObject contributes nothing */ }
        break;
      }
      default: break;
    }
    // `[` and `]` delimit a TJ array, so they must not flush the operands the
    // TJ that follows them is about to read.
    if (tk.v === "[" || tk.v === "]") operands.push(tk);
    else operands.length = 0;
  }
  return { text: items, paths };
}

// Merges items drawn on the same baseline into readable label runs.
export function groupIntoLines(items, yTolerance = 2.2) {
  const lines = [];
  for (const it of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= yTolerance);
    if (line) { line.items.push(it); line.y = (line.y * (line.items.length - 1) + it.y) / line.items.length; }
    else lines.push({ y: it.y, items: [it] });
  }
  return lines.map((l) => {
    const sorted = l.items.sort((a, b) => a.x - b.x);
    return {
      y: Number(l.y.toFixed(1)),
      x: Number(sorted[0].x.toFixed(1)),
      size: sorted[0].size,
      text: sorted.map((i) => i.text).join("").replace(/\s+/g, " ").trim(),
      metricsExact: sorted.every((i) => i.metricsExact),
      runs: sorted.map((i) => ({ text: i.text, x: Number(i.x.toFixed(1)),
        x2: Number((i.x + (i.width ?? 0)).toFixed(1)), size: i.size, metricsExact: i.metricsExact })),
      chars: sorted.flatMap((i) => i.chars ?? [])
    };
  }).filter((l) => l.text.length > 0);
}

// ---------------------------------------------------------------------------
// The widget context channel.
//
// An AcroForm widget has two things the binder never saw: the words the form
// prints beside it, and the section of the page it sits in. Both are already
// measurable here — this file decodes the content stream and reports every
// drawn string at the position it is drawn — and neither reached decideBinding,
// which received only the internal field name.
//
// That single gap produced failures in both directions. VT 600-00228 names its
// fields as bare digits, so a fee-waiver application filled nothing: with only
// the name channel, every descriptor refused. AK TF-800 names a field certDate
// and NE DC 1:15 names one printedname, both sitting under a printed
// "Certificate of Service" heading, so the platform dated and signed a sworn
// certification of service it knows nothing about: with only the name channel,
// nothing said where the widget was.
//
// Nothing below infers a coordinate or invents a label. Every string returned
// is one the document draws, at the position it draws it.
// ---------------------------------------------------------------------------

// How far left of a widget a caption may sit and still be its caption. Wider
// than this and the "label" is something else on the same line.
const CAPTION_GAP_LEFT = 72;
// How far above a widget a caption may sit. One line of ordinary body text.
const CAPTION_GAP_ABOVE = 16;
// A caption is a label, not a paragraph.
const CAPTION_MAX_CHARS = 60;

const overlaps1d = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0;

/** The modal font size of a page's body text, used to recognise a heading. */
function bodySizeOf(lines) {
  const counts = new Map();
  for (const line of lines) {
    const size = Math.round((line.size ?? 0) * 2) / 2;
    if (size > 0) counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  let best = 0, bestCount = -1;
  for (const [size, count] of counts) if (count > bestCount || (count === bestCount && size < best)) { best = size; bestCount = count; }
  return best;
}

/**
 * The page's printed sections, top to bottom.
 *
 * A heading is a printed line that is set larger than the page's body text or
 * is written in full capitals — the two ways a paper form marks a new section.
 * A section runs from its heading down to the next one, which is what stops a
 * heading near the top of the page from claiming everything below it.
 *
 * The regions are descriptive: this function says what the page is divided
 * into, not which divisions matter. Deciding that a region is court-owned
 * belongs to the semantics module, which holds the protect rules.
 */
export function pageRegions(page, precomputedLines = null, { isFirstPage = true } = {}) {
  const lines = precomputedLines ?? groupIntoLines(extractTextItems(page));
  const body = bodySizeOf(lines);
  const headings = lines
    .filter((line) => {
      const text = line.text.trim();
      if (text.length < 3 || text.length > CAPTION_MAX_CHARS * 2) return false;
      const larger = body > 0 && (line.size ?? 0) >= body + 0.5;
      const capitals = /[A-Z]/.test(text) && text === text.toUpperCase();
      return larger || capitals;
    })
    .sort((a, b) => b.y - a.y);

  // The first thing a form prints is what the form is. A title names the whole
  // document rather than an area of it, so the region it opens is marked and
  // never used to protect anything: "APPLICATION TO WAIVE FILING FEES" is a
  // fee-waiver application, not a fee box, and "PETITION TO SEAL POLICE
  // RECORDS" is a petition, not a police-use-only band. Without this a single
  // word in a title silences the whole form.
  // Only the first page has a document title. The topmost heading of page 2 is
  // a section heading like FINDINGS OF FACT, and suppressing it as a title
  // disarms the one region on the page that most needs protecting -- which is
  // exactly how a petitioner's name reached the judge's findings on NC
  // AOC-CR-288 without anything objecting. Callers that know the page number
  // say so; the default keeps the original behaviour for callers that do not.
  const topmostPrinted = isFirstPage ? lines.reduce((max, l) => Math.max(max, l.y), -Infinity) : Infinity;

  return headings.map((heading, i) => ({
    heading: heading.text.trim(),
    size: heading.size ?? null,
    // The region starts at the heading's own baseline and ends where the next
    // heading begins, or at the foot of the page.
    yTop: heading.y,
    yBottom: i + 1 < headings.length ? headings[i + 1].y : -Infinity,
    isDocumentTitle: i === 0 && heading.y >= topmostPrinted - 0.5,
    basis: body > 0 && (heading.size ?? 0) >= body + 0.5 ? "set_larger_than_body_text" : "printed_in_full_capitals"
  }));
}

/**
 * For each widget: the caption the form prints beside it, and the printed
 * section it sits in.
 *
 * `widgets` is [{ name, rect: { x, y, width, height } }]. A widget with no
 * rectangle gets nulls rather than a guess.
 *
 * The caption is looked for to the LEFT on the same line first, because that
 * is how a form labels a box, and only then ABOVE, because that is how a form
 * labels a column. A caption found above must overlap the widget horizontally,
 * or it belongs to a different column.
 */
export function captureWidgetContext(page, widgets, { precomputedLines = null } = {}) {
  const lines = precomputedLines ?? groupIntoLines(extractTextItems(page));
  const regions = pageRegions(page, lines);

  return widgets.map((widget) => {
    const rect = widget.rect ?? null;
    if (!rect) {
      return { name: widget.name, effectiveLabel: null, labelBasis: "widget_has_no_rectangle", regionHeading: null, regionBasis: null };
    }
    const top = rect.y + rect.height;
    const midline = rect.y + rect.height / 2;

    // Same line, to the left. `x2` is where the run actually ends, so the gap
    // is measured from the last printed character rather than from the start
    // of the line.
    let best = null;
    for (const line of lines) {
      if (Math.abs(line.y - rect.y) > rect.height && Math.abs(line.y - midline) > rect.height) continue;
      for (const run of line.runs) {
        if (run.x2 > rect.x + 1) continue;
        const gap = rect.x - run.x2;
        if (gap < 0 || gap > CAPTION_GAP_LEFT) continue;
        if (!best || gap < best.gap) best = { text: line.text.slice(0, CAPTION_MAX_CHARS * 2), gap, basis: "printed_to_the_left_on_the_same_line" };
      }
    }

    // Above, in the same column.
    if (!best) {
      for (const line of lines) {
        const gap = line.y - top;
        if (gap < 0 || gap > CAPTION_GAP_ABOVE) continue;
        const lineX2 = Math.max(...line.runs.map((r) => r.x2));
        if (!overlaps1d(line.x, lineX2, rect.x, rect.x + rect.width)) continue;
        if (!best || gap < best.gap) best = { text: line.text, gap, basis: "printed_directly_above_in_the_same_column" };
      }
    }

    const region = regions.find((r) => midline <= r.yTop && midline > r.yBottom) ?? null;

    return {
      name: widget.name,
      // A caption is punctuation-trimmed but never reworded: "Name:" is the
      // label "Name", and "(Enter the county name)" stays exactly that.
      effectiveLabel: best ? best.text.replace(/[\s:*.]+$/, "").trim().slice(0, CAPTION_MAX_CHARS) || null : null,
      labelBasis: best ? best.basis : "no_printed_caption_within_reach",
      labelGap: best ? Number(best.gap.toFixed(1)) : null,
      regionHeading: region ? region.heading : null,
      regionIsDocumentTitle: region ? region.isDocumentTitle === true : false,
      regionBasis: region
        ? (region.isDocumentTitle ? `${region.basis}; this is the document's title, which names the form rather than an area of it` : region.basis)
        : "widget_sits_above_the_first_printed_heading"
    };
  });
}
