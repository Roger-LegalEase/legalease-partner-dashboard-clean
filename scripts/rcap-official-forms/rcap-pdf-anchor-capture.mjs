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

// ---------------------------------------------------------------------------
// Decoding a page's text.
//
// A PDF string operand is a sequence of CHARACTER CODES, not characters. What
// a code means is the font's business: a simple font maps one byte through an
// encoding, and a Type0/Identity-H font maps two bytes to a glyph id in a
// subset nobody outside the file has ever seen. Reading those bytes as Latin-1
// -- which is what this module used to do -- turns "Neb. Rev. Stat." into
// "\x001\x00H\x00E\x00\x11", and every downstream reader that matches words
// against that string is matching against noise.
//
// The document already carries the answer. Every font in this corpus ships a
// /ToUnicode CMap, which is the producer's own statement of what each code
// means, so the mapping applied here is the file's rather than a guess. A font
// with no CMap is decoded as before and reported as undecoded, so an
// unmappable string stays visibly unmappable instead of arriving as plausible
// text.
//
// This is the input to caption capture, region detection and, through them,
// to protection: NC AOC-CV-226's "Full Permanent Mailing Address" reached the
// classifier as a byte string containing "$", the money rule fired on it, and
// the applicant's mailing address was refused as a fee. The defect was never
// in the money rule.
// ---------------------------------------------------------------------------

/** UTF-16BE hex, as /ToUnicode destinations are always written. */
function utf16beHexToString(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i + 3 < clean.length; i += 4) out += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
  if (clean.length % 4 === 2) out += String.fromCharCode(parseInt(clean.slice(-2), 16));
  return out;
}

/**
 * One font's /ToUnicode CMap: code -> the text that code stands for.
 *
 * Only the two constructs a ToUnicode CMap may contain are read -- bfchar
 * pairs and bfrange triples -- plus the codespace ranges, which are what say
 * how many bytes one code occupies. Nothing is inferred: a code the CMap does
 * not name is reported as unmapped rather than approximated.
 */
export function parseToUnicodeCMap(text) {
  const map = new Map();
  const codeByteLengths = new Set();

  for (const block of text.match(/begincodespacerange([\s\S]*?)endcodespacerange/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      codeByteLengths.add(Math.ceil(m[1].length / 2));
    }
  }

  for (const block of text.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      codeByteLengths.add(Math.ceil(m[1].length / 2));
      map.set(parseInt(m[1], 16), utf16beHexToString(m[2]));
    }
  }

  for (const block of text.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    // <lo> <hi> [<d1> <d2> ...]
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(m[1], 16);
      codeByteLengths.add(Math.ceil(m[1].length / 2));
      const items = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => utf16beHexToString(x[1]));
      items.forEach((value, i) => map.set(lo + i, value));
    }
    // <lo> <hi> <dstStart>
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      codeByteLengths.add(Math.ceil(m[1].length / 2));
      const base = utf16beHexToString(m[3]);
      if (base.length === 0 || hi < lo || hi - lo > 65535) continue;
      const head = base.slice(0, -1);
      const tail = base.charCodeAt(base.length - 1);
      for (let c = lo; c <= hi; c++) map.set(c, head + String.fromCharCode(tail + (c - lo)));
    }
  }

  return { map, codeByteLengths };
}

/** A Type0 descendant font's /W array, as CID -> width in 1/1000 em. */
function parseCidWidths(wArray, ctx) {
  const widths = new Map();
  if (!wArray) return widths;
  const items = wArray.asArray().map((v) => ctx.lookup(v) ?? v);
  let i = 0;
  while (i < items.length) {
    const first = Number(items[i]?.asNumber?.() ?? NaN);
    const next = items[i + 1];
    if (!Number.isFinite(first) || next === undefined) break;
    if (next instanceof PDFArray) {
      const list = next.asArray().map((v) => Number(ctx.lookup(v)?.asNumber?.() ?? v?.asNumber?.() ?? 0));
      list.forEach((w, k) => widths.set(first + k, w));
      i += 2;
      continue;
    }
    const last = Number(next?.asNumber?.() ?? NaN);
    const w = Number(items[i + 2]?.asNumber?.() ?? NaN);
    if (!Number.isFinite(last) || !Number.isFinite(w)) break;
    if (last >= first && last - first <= 65535) for (let c = first; c <= last; c++) widths.set(c, w);
    i += 3;
  }
  return widths;
}

// Every simple font in this corpus carries an explicit /Widths array and every
// Type0 font a /W array, so advances are computed from the document's own
// metrics rather than estimated. A font that carries neither is reported as
// inexact and its runs are excluded from anchor placement.
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
    const subtype = String(fd.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "");
    const encoding = String(fd.get(PDFName.of("Encoding")) ?? "").replace(/^\//, "");
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

    // The composite half: descendant widths, and the CMap that says what the
    // two-byte codes mean.
    let cidWidths = null;
    let defaultWidth = 1000;
    if (subtype === "Type0") {
      try {
        const descendants = fd.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
        const df = descendants ? ctx.lookup(descendants.get(0), PDFDict) : null;
        if (df) {
          cidWidths = parseCidWidths(df.lookupMaybe(PDFName.of("W"), PDFArray), ctx);
          defaultWidth = Number(df.get(PDFName.of("DW"))?.asNumber?.() ?? 1000);
        }
      } catch { /* no descendant metrics */ }
    }

    let toUnicode = null;
    let cmapCodeLengths = new Set();
    try {
      const tu = fd.get(PDFName.of("ToUnicode"));
      const stream = tu ? ctx.lookup(tu) : null;
      if (stream instanceof PDFRawStream) {
        const parsed = parseToUnicodeCMap(Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"));
        toUnicode = parsed.map;
        cmapCodeLengths = parsed.codeByteLengths;
      }
    } catch { /* an unreadable CMap leaves the font undecoded */ }

    // Identity-H and Identity-V are two-byte by definition. Otherwise the
    // CMap's own codespace decides, and a simple font is one byte.
    const bytesPerCode = /^Identity-[HV]$/.test(encoding) || subtype === "Type0"
      ? 2
      : (cmapCodeLengths.size === 1 ? [...cmapCodeLengths][0] : 1);

    out.set(key.asString().replace(/^\//, ""), {
      subtype, encoding, firstChar, widths, missingWidth,
      cidWidths, defaultWidth, toUnicode, bytesPerCode,
      exact: subtype === "Type0" ? Boolean(cidWidths && cidWidths.size > 0) : Boolean(widths)
    });
  }
  return out;
}

/** Splits a string operand into the character codes the font actually reads. */
function codesOf(font, raw) {
  const width = font?.bytesPerCode ?? 1;
  if (width <= 1) {
    const out = [];
    for (let i = 0; i < raw.length; i++) out.push(raw.charCodeAt(i) & 0xff);
    return out;
  }
  const out = [];
  for (let i = 0; i + width <= raw.length; i += width) {
    let code = 0;
    for (let k = 0; k < width; k++) code = (code << 8) | (raw.charCodeAt(i + k) & 0xff);
    out.push(code);
  }
  // An odd trailing byte is a malformed operand; it is kept rather than
  // dropped, so nothing silently disappears from the page.
  if (raw.length % width !== 0) out.push(raw.charCodeAt(raw.length - 1) & 0xff);
  return out;
}

/**
 * What one code stands for, and whether the document said so.
 *
 * `mapped: false` means the font offered no /ToUnicode entry for this code. A
 * single-byte code then falls back to its own byte, which is what a simple
 * font means anyway; a two-byte code has no honest fallback, so the raw code
 * units are kept and the run is reported undecoded.
 */
function textOfCode(font, code) {
  const mapped = font?.toUnicode?.get(code);
  if (mapped !== undefined) return { text: mapped, mapped: true };
  if ((font?.bytesPerCode ?? 1) <= 1) return { text: String.fromCharCode(code), mapped: false };
  return { text: String.fromCharCode(code >> 8, code & 0xff), mapped: false };
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

  // The width of one character code, in text space, from the document's own
  // metrics. A composite font's widths are keyed by CID, a simple font's by
  // byte, and the two are never the same table.
  const codeWidth = (f, code) => {
    if (f?.cidWidths) return f.cidWidths.has(code) ? f.cidWidths.get(code) : (f.defaultWidth ?? 1000);
    if (f?.widths && code >= f.firstChar && code - f.firstChar < f.widths.length) return f.widths[code - f.firstChar];
    if (f?.missingWidth) return f.missingWidth;
    return 500;
  };

  const show = (raw) => {
    if (!raw) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[0], m[1]) || 1;
    const size = fontSize * scale;
    // Per-character positions: a fill-in-the-blank form's rule lines are found
    // by locating contiguous underscores, which needs each glyph's own x. The
    // position belongs to the CODE and the character belongs to the CMap, so
    // both are tracked together: a two-byte code that decodes to one letter
    // advances once, not twice.
    const chars = [];
    let cursor = 0;
    let text = "";
    let unmapped = 0;
    let total = 0;
    for (const code of codesOf(font, raw)) {
      total += 1;
      const decoded = textOfCode(font, code);
      if (!decoded.mapped) unmapped += 1;
      const w = codeWidth(font, code);
      const a = ((w / 1000) * fontSize + charSpace + (code === 32 && (font?.bytesPerCode ?? 1) === 1 ? wordSpace : 0)) * hScale;
      const x = Number((m[4] + cursor * scale).toFixed(2));
      const width = Number((a * scale).toFixed(2));
      // A code that stands for several characters (a decomposed ligature) is
      // reported as those characters sharing the one advance the code has.
      const glyphText = decoded.text;
      const exact = font?.exact === true;
      if (glyphText.length === 0) chars.push({ c: "", x, w: width, code, size: Number(size.toFixed(2)), metricsExact: exact });
      else for (const ch of glyphText) chars.push({ c: ch, x, w: width / glyphText.length, code, size: Number(size.toFixed(2)), metricsExact: exact });
      text += glyphText;
      cursor += a;
    }
    items.push({ text, x: m[4], y: m[5], size: Number(size.toFixed(2)),
      width: Number((cursor * scale).toFixed(2)), metricsExact: font?.exact === true,
      // Whether the page said what these codes mean. A run the document could
      // not decode is not silently indistinguishable from one it could.
      textDecoded: total > 0 && unmapped === 0,
      textDecodingBasis: font?.toUnicode
        ? (unmapped === 0 ? "font_tounicode_cmap" : "font_tounicode_cmap_incomplete")
        : ((font?.bytesPerCode ?? 1) <= 1 ? "single_byte_codes_read_directly" : "no_tounicode_cmap_for_multi_byte_codes"),
      chars });
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
// A line is not a label.
//
// `groupIntoLines` merges everything drawn on one baseline, which is right for
// reading a page and wrong for labelling a box. NC AOC-CR-296 prints "Drivers
// License No.", "State", "Race" and "Sex" as four cells of one table row, 30
// to 85 points apart, and the merged line reads
// "Drivers License No.StateRaceSex(NOT GUILTY OR NOT RESPONSIBLE)" -- which is
// what five different widgets each received as their own caption. One of them
// was then refused as `race`, another as `money`, neither for a reason that
// was about it.
//
// A CELL is the unit that labels a box: a group of runs on one baseline whose
// neighbours are within a word space of each other. Inside a printed phrase
// the runs of this corpus abut or overlap -- kerning gives gaps at or below
// zero -- while the gap between two cells of a table row is tens of points, so
// the two are not close to each other and the split is not a judgement call.
// ---------------------------------------------------------------------------

/** The gap that separates two printed cells rather than two words of one. */
const cellGapOf = (size) => Math.max(3, (size || 9) * 0.9);

// A leader is the row of dots or underscores a form draws where a value goes.
// It is ink, not words. Virginia's circuit-court forms draw every rule as a
// run of periods, so the cell abutting CC-1201's court box is
// "......................................" and reading it as that box's
// caption buries the caption the form actually prints under the rule.
const LEADER_CHAR = /[._\-–—·•…]/;
const LEADER_RUN = 3;
const isLeaderOnly = (text) => text.trim().length > 0 && [...text.trim()].every((c) => LEADER_CHAR.test(c));

/**
 * One line's printed cells, left to right.
 *
 * Built from the line's own characters, because the split that matters is not
 * always between two drawn runs: "CC-1201(A). ........ addendums are attached"
 * is one run carrying a caption, a rule and a sentence.
 *
 * Each cell carries the x-range it actually occupies, which is what makes it
 * attributable to a column rather than to a page.
 */
export function segmentsOf(line, gap = null) {
  // Drawing order, not x order. Runs on one baseline routinely overlap by a
  // fraction of a point -- a trailing space ends past where the next run
  // begins -- and re-sorting the characters by position interleaves them:
  // "(Enter the type of court)" comes back as "( Entert het ypeo f court)".
  // The items were already ordered left to right when the line was built, and
  // within an item the characters are in the order the page draws them.
  const chars = (line.chars ?? []).filter((c) => c.c !== "");
  if (chars.length === 0) {
    // No character metrics: fall back to whole runs, which is still better
    // than the whole line.
    return [...(line.runs ?? [])]
      .map((r) => ({ x: r.x, x2: r.x2, y: line.y, size: r.size ?? line.size,
        text: String(r.text).replace(/\s+/g, " ").trim(), metricsExact: r.metricsExact !== false }))
      .filter((cell) => cell.text.length > 0 && !isLeaderOnly(cell.text));
  }

  const cells = [];
  let current = null;
  let leaderRun = 0;
  let pending = [];
  let pendingWidth = 0;
  const hasWords = (chars) => chars.some((c) => !LEADER_CHAR.test(c.c) && c.c.trim() !== "");
  const close = () => { if (current && hasWords(current.chars)) cells.push(current); current = null; };
  const open = (ch) => { current = { x: ch.x, x2: ch.x + ch.w, size: ch.size ?? line.size, chars: [ch] }; };
  const append = (ch) => { current.chars.push(ch); current.x2 = Math.max(current.x2, ch.x + ch.w); };

  for (const ch of chars) {
    const threshold = gap ?? cellGapOf(ch.size ?? line.size);

    // Whitespace is buffered rather than appended, because a form pads with
    // spaces where it means a gap: Nebraska's caption band is one field
    // appearance drawing "IN THE" then twenty-eight spaces then "COURT OF",
    // and read as one cell the whole statutory caption became a single
    // widget's label. Whitespace wider than a cell gap separates cells,
    // exactly as an empty stretch of page does.
    if (ch.c.trim() === "") { pending.push(ch); pendingWidth += ch.w; continue; }

    const positional = current === null ? 0 : ch.x - current.x2 - pendingWidth;
    const separated = current !== null && (positional + pendingWidth) > threshold;

    if (LEADER_CHAR.test(ch.c)) {
      leaderRun += 1;
      // A run of leader characters ends the cell before it and starts a new
      // one after it; a single period is punctuation and stays put.
      if (leaderRun >= LEADER_RUN) { close(); leaderRun = 0; pending = []; pendingWidth = 0; continue; }
    } else {
      leaderRun = 0;
    }

    if (current === null || separated) { close(); open(ch); pending = []; pendingWidth = 0; continue; }
    for (const space of pending) append(space);
    pending = [];
    pendingWidth = 0;
    append(ch);
  }
  close();

  // Leader characters and blanks at a cell's edges are trimmed off, and its
  // x-range is recomputed from what is left. A rule that runs two points under
  // the box it leads into must not make the caption before it look as though
  // it reaches inside the box.
  return cells.map((cell) => {
    const kept = [...cell.chars];
    while (kept.length > 0 && (LEADER_CHAR.test(kept[0].c) || kept[0].c.trim() === "")) kept.shift();
    while (kept.length > 0 && (LEADER_CHAR.test(kept[kept.length - 1].c) || kept[kept.length - 1].c.trim() === "")) kept.pop();
    if (kept.length === 0) return null;
    return {
      x: Number(kept[0].x.toFixed(1)),
      x2: Number(Math.max(...kept.map((c) => c.x + c.w)).toFixed(1)),
      y: line.y,
      size: cell.size,
      text: kept.map((c) => c.c).join("").replace(/\s+/g, " ").trim(),
      metricsExact: kept.every((c) => c.metricsExact !== false)
    };
  }).filter((cell) => cell !== null && cell.text.length > 0 && !isLeaderOnly(cell.text));
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
// How far below. Virginia's circuit-court forms print every caption under the
// rule its value sits on -- CC-1201's court line is captioned "CITY OR COUNTY"
// nine points beneath it -- and with only an above-channel every caption on
// that block was read off the rule above the one it belongs to. The band is
// the same size as the one above it: a caption is adjacent to its box on
// whichever side the form puts it, and the nearer of the two wins.
const CAPTION_GAP_BELOW = 16;
// How far a caption's baseline may sit inside the box it labels.
const CAPTION_BASELINE_TOLERANCE = 3;
// A caption is a label, not a paragraph.
const CAPTION_MAX_CHARS = 60;
// How much of a page's printed width a heading has to span before it is read
// as heading the whole page rather than its own column.
const FULL_WIDTH_HEADING_SHARE = 0.6;
// Two heading lines this close together are one title block.
const TITLE_BLOCK_LINE_GAP = 26;

const overlaps1d = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0;
const overlapWidth = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

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
 * The page's printed sections, top to bottom AND left to right.
 *
 * A heading is a printed CELL -- not a whole line -- that is set larger than
 * the page's body text or written in full capitals. Reading a line as a
 * heading is what made NC AOC-CR-296 attribute "DISTRICT ATTORNEY PETITION",
 * printed at x 371 in the form's title block, to a street-address box at x 37
 * in the party block beside it: the two share a baseline band and nothing else,
 * and the heading's own words then refused the box as a prosecutor's.
 *
 * So a region carries the x-range of the cell that opens it, and it ends at
 * the next heading in ITS OWN column rather than at the next heading anywhere
 * on the page. A heading that spans most of the printed width heads the page,
 * which is what a real section heading does.
 *
 * The regions are descriptive: this function says what the page is divided
 * into, not which divisions matter. Deciding that a region is court-owned
 * belongs to the semantics module, which holds the protect rules.
 */
export function pageRegions(page, precomputedLines = null, { isFirstPage = true } = {}) {
  const lines = precomputedLines ?? groupIntoLines(extractTextItems(page));
  const body = bodySizeOf(lines);
  let pageWidth = 612;
  try { pageWidth = page.getSize().width; } catch { /* geometry unavailable: the default is only used as a denominator */ }
  const printedLeft = lines.length > 0 ? Math.min(...lines.map((l) => l.x)) : 0;
  const printedRight = lines.length > 0
    ? Math.max(...lines.flatMap((l) => l.runs.map((r) => r.x2)))
    : pageWidth;
  const printedWidth = Math.max(1, printedRight - printedLeft);

  const headings = [];
  for (const line of lines) {
    for (const cell of segmentsOf(line)) {
      const text = cell.text.trim();
      if (text.length < 3 || text.length > CAPTION_MAX_CHARS * 2) continue;
      const larger = body > 0 && (cell.size ?? 0) >= body + 0.5;
      const capitals = /[A-Z]/.test(text) && text === text.toUpperCase();
      if (!larger && !capitals) continue;
      headings.push({
        text, size: cell.size ?? null, y: line.y, x: cell.x, x2: cell.x2,
        basis: larger ? "set_larger_than_body_text" : "printed_in_full_capitals",
        spansPage: (cell.x2 - cell.x) / printedWidth >= FULL_WIDTH_HEADING_SHARE
      });
    }
  }
  headings.sort((a, b) => b.y - a.y || a.x - b.x);

  // The first thing a form prints is what the form is. A title names the whole
  // document rather than an area of it, so the region it opens is marked and
  // never used to protect anything: "APPLICATION TO WAIVE FILING FEES" is a
  // fee-waiver application, not a fee box, and "PETITION TO SEAL POLICE
  // RECORDS" is a petition, not a police-use-only band.
  //
  // A title is usually several lines, and only the first of them was being
  // marked. NC AOC-CR-296's title block reads "DISTRICT ATTORNEY PETITION /
  // AND ORDER OF EXPUNCTION / UNDER G.S. 15A-146(a2)" down the right column,
  // and the second and third lines -- unmarked -- were still free to
  // reclassify boxes elsewhere on the page. The whole block is marked: title
  // lines run consecutively from the top of the page with nothing but other
  // title lines between them.
  //
  // Only the first page has a document title. The topmost heading of page 2 is
  // a section heading like FINDINGS OF FACT, and suppressing it as a title
  // disarms the one region on the page that most needs protecting -- which is
  // exactly how a petitioner's name reached the judge's findings on NC
  // AOC-CR-288 without anything objecting.
  const titles = new Set();
  if (isFirstPage && headings.length > 0) {
    const topmostPrinted = lines.reduce((max, l) => Math.max(max, l.y), -Infinity);
    let previousY = null;
    for (const heading of headings) {
      const opensTheBlock = previousY === null && heading.y >= topmostPrinted - 0.5;
      const continuesTheBlock = previousY !== null && previousY - heading.y <= TITLE_BLOCK_LINE_GAP;
      if (!opensTheBlock && !continuesTheBlock) {
        if (previousY !== null) break;
        continue;
      }
      titles.add(heading);
      previousY = heading.y;
    }
  }

  return headings.map((heading, i) => {
    // The region ends where the next heading in its own column begins. A
    // right-column title does not close a left-column section, and a
    // page-wide heading closes everything.
    let yBottom = -Infinity;
    for (let k = i + 1; k < headings.length; k++) {
      const next = headings[k];
      if (next.y >= heading.y) continue;
      const sameColumn = next.spansPage || heading.spansPage
        || overlaps1d(next.x, next.x2, heading.x, heading.x2);
      if (sameColumn) { yBottom = next.y; break; }
    }
    return {
      heading: heading.text,
      size: heading.size,
      yTop: heading.y,
      yBottom,
      xLeft: heading.x,
      xRight: heading.x2,
      spansPage: heading.spansPage,
      isDocumentTitle: titles.has(heading),
      basis: heading.basis
    };
  });
}

/**
 * The caption cells a page prints, indexed for lookup by position.
 *
 * Built once per page because every widget on it asks the same question.
 */
function captionCellsOf(lines) {
  const cells = [];
  for (const line of lines) for (const cell of segmentsOf(line)) cells.push(cell);
  return cells;
}

/** A caption is punctuation-trimmed but never reworded. */
const asLabel = (text) => String(text)
  .replace(/^[\s._\-–—·•…]+/, "")
  .replace(/[\s:*._\-–—·•…]+$/, "")
  .trim().slice(0, CAPTION_MAX_CHARS) || null;

/**
 * For each widget: the caption the form prints beside it, and the printed
 * section it sits in.
 *
 * `widgets` is [{ name, rect: { x, y, width, height } }]. A widget with no
 * rectangle gets nulls rather than a guess.
 *
 * The caption is looked for to the LEFT on the same line first, because that
 * is how a form labels a box, and then in the widget's own column ABOVE or
 * BELOW, nearer wins, because a form labels a column from whichever side it
 * chooses. Every candidate is a printed CELL, so what comes back is one
 * widget's label rather than the row it sits in.
 */
export function captureWidgetContext(page, widgets, { precomputedLines = null, isFirstPage = true } = {}) {
  const lines = precomputedLines ?? groupIntoLines(extractTextItems(page));
  const regions = pageRegions(page, lines, { isFirstPage });
  const cells = captionCellsOf(lines);
  const placed = widgets.filter((w) => w.rect);

  // ---- the column channel, resolved competitively --------------------------
  //
  // A caption row printed between two rows of boxes labels one of them, and
  // which one is not a convention this module gets to choose: NC's AOC forms
  // print the header above its row, Virginia's circuit-court forms print it
  // under the rule its value sits on. Both are answerable from the paper --
  // the caption belongs to the row it is NEAREST to -- so each cell is offered
  // to the widget row closest to it, and only that row may read it.
  //
  // Rows, not widgets: "City, State And Zip Code" is one printed phrase over
  // three boxes, and all three are the same distance from it, so all three
  // keep it.
  const ROW_TOLERANCE = 2;
  const ABOVE = "printed_directly_above_in_the_same_column";
  const BELOW = "printed_directly_below_in_the_same_column";

  const claimsByCell = new Map();
  for (const cell of cells) {
    const claims = [];
    for (const widget of placed) {
      const rect = widget.rect;
      const right = rect.x + rect.width;
      if (!overlaps1d(cell.x, cell.x2, rect.x, right)) continue;
      // Text sharing the value's own baseline and BEGINNING inside the value's
      // own span is on the widget's LINE, not above or below it: Virginia
      // prints "Circuit Court" in the middle of the rule CC-1201's court box
      // sits on, and reading that as the box's caption buries "CITY OR
      // COUNTY", which is the caption the form prints for it. A caption set
      // flush with the box's left edge is a different thing -- that is how NC's
      // AOC forms print "County" under the county blank -- so the test is where
      // the text starts, not that it shares a baseline.
      if (Math.abs(cell.y - rect.y) <= CAPTION_BASELINE_TOLERANCE && cell.x > rect.x + 2) continue;
      // A checkbox printed INSIDE a caption is part of the caption, not a box
      // the caption labels: Virginia captions its contact rules "ADDRESS OF
      // [ ] PETITIONER [ ] ATTORNEY FOR PETITIONER" with the two elections
      // drawn between the words. Counted as boxes captioned at zero distance,
      // they drown out the offset the form actually uses.
      if (rect.x >= cell.x - 1 && right <= cell.x2 + 1
        && cell.y >= rect.y - 2 && cell.y <= rect.y + rect.height + 2) continue;
      // A caption's baseline may sit a shade inside the box it labels: form
      // authors size a box to the text that will go in it, not to the caption
      // above it, and NC AOC-CR-296's header row sits three tenths of a point
      // under the top edge of the boxes it names. Measured strictly, those
      // four boxes had no caption at all and the row was claimed by the boxes
      // ABOVE it, which is how the zip box came to be labelled "Sex".
      const above = cell.y - (rect.y + rect.height);
      const below = rect.y - cell.y;
      let distance = null;
      let basis = null;
      if (above >= -CAPTION_BASELINE_TOLERANCE && above <= CAPTION_GAP_ABOVE) {
        distance = Math.max(0, above); basis = ABOVE;
      }
      if (below >= -CAPTION_BASELINE_TOLERANCE && below <= CAPTION_GAP_BELOW
        && (distance === null || Math.max(0, below) < distance)) {
        distance = Math.max(0, below); basis = BELOW;
      }
      if (distance === null) continue;
      // A caption is a label, not a paragraph. NC AOC-CR-296 prints a note
      // under its county blank -- "NOTE: This petition, which is filed by the
      // district attorney, does not require the payment of a filing fee" --
      // and read as that blank's caption it refused the county as a
      // prosecutor's. Prose above or below a box is prose; the words that run
      // INTO a box on its own line are still allowed to be long, because that
      // is the sentence the blank is part of.
      if (cell.text.length > CAPTION_MAX_CHARS) continue;
      claims.push({ name: widget.name, distance, basis, overlap: overlapWidth(cell.x, cell.x2, rect.x, right) });
    }
    if (claims.length > 0) claimsByCell.set(cell, claims);
  }

  // Where this form puts its captions, measured rather than assumed.
  //
  // A caption row printed between two rows of boxes labels one of them, and
  // which one is not a convention this module gets to choose: NC's AOC forms
  // head each row of boxes, Virginia's circuit-court forms caption each rule
  // underneath it, and on Virginia's forms the two readings are eight points
  // apart in one direction and two in the other, so picking the nearer picks
  // wrong.
  //
  // The page answers it. Some caption cells are claimable from one side only
  // -- the first caption of a block has no box above it, the last has none
  // below -- and those are unambiguous. They vote, and the majority decides
  // every ambiguous cell on the page.
  //
  // Only cells in the form's CAPTION STYLE vote: set smaller than the page's
  // body text, or short and in full capitals. Body prose sits above boxes too,
  // and on CC-1201 a paragraph of it outvoted the captions.
  const body = bodySizeOf(lines);
  const isCaptionStyle = (cell) =>
    (body > 0 && (cell.size ?? body) <= body - 0.5)
    || (cell.text.length <= 40 && /[A-Z]/.test(cell.text) && cell.text === cell.text.toUpperCase());

  // Which sides each box has a candidate on.
  const sidesOfWidget = new Map();
  for (const claims of claimsByCell.values()) {
    for (const claim of claims) {
      if (!sidesOfWidget.has(claim.name)) sidesOfWidget.set(claim.name, new Set());
      sidesOfWidget.get(claim.name).add(claim.basis);
    }
  }

  // A form captions its boxes at ONE offset and repeats it. Where a caption
  // cell is claimable from both sides, one of the two distances is that
  // offset and the other is whatever the layout happened to leave: on VA
  // CC-1473 every caption is 7.9 to 8.6 points under its own rule, while the
  // rule below is 1.9 to 7.1 points away, scattered. The consistent side is
  // the form's convention, and consistency is measurable without knowing which
  // convention it is.
  // Median absolute deviation, not standard deviation: one caption whose other
  // side happens to be sixteen points away must not decide the page.
  const medianOf = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };
  const spreadOf = (values) => {
    if (values.length < 2) return Infinity;
    const median = medianOf(values);
    return medianOf(values.map((v) => Math.abs(v - median)));
  };
  const aboveGaps = [];
  const belowGaps = [];
  for (const [cell, claims] of claimsByCell) {
    if (!isCaptionStyle(cell)) continue;
    const a = claims.filter((c) => c.basis === ABOVE).map((c) => c.distance);
    const b = claims.filter((c) => c.basis === BELOW).map((c) => c.distance);
    if (a.length === 0 || b.length === 0) continue;
    aboveGaps.push(Math.min(...a));
    belowGaps.push(Math.min(...b));
  }
  let convention = null;
  if (aboveGaps.length >= 2) {
    const aboveSpread = spreadOf(aboveGaps);
    const belowSpread = spreadOf(belowGaps);
    if (belowSpread < aboveSpread - 0.05) convention = BELOW;
    else if (aboveSpread < belowSpread - 0.05) convention = ABOVE;
  }
  if (convention === null) {
    // Too few contested cells to measure. Fall back to the cells nothing is in
    // doubt about: claimable from one side only, and claimed by a box that has
    // no candidate on its other side.
    let above = 0, below = 0;
    for (const [cell, claims] of claimsByCell) {
      if (!isCaptionStyle(cell)) continue;
      const sides = new Set(claims.map((c) => c.basis));
      if (sides.size !== 1) continue;
      if (claims.some((c) => (sidesOfWidget.get(c.name)?.size ?? 1) > 1)) continue;
      if (sides.has(ABOVE)) above += 1; else below += 1;
    }
    convention = below > above ? BELOW : ABOVE;
  }

  const cellClaims = new Map();
  for (const [, claims] of claimsByCell) {
    const sides = new Set(claims.map((c) => c.basis));
    const pool = sides.size > 1 ? claims.filter((c) => c.basis === convention) : claims;
    if (pool.length === 0) continue;
    const nearest = Math.min(...pool.map((c) => c.distance));
    // Rows, not widgets: "City, State And Zip Code" is one printed phrase over
    // three boxes, and all three are the same distance from it, so all three
    // keep it.
    cellClaims.set(claims, pool.filter((c) => c.distance <= nearest + ROW_TOLERANCE));
  }
  const cellTextOf = new Map();
  for (const [cell, claims] of claimsByCell) cellTextOf.set(claims, cell);

  const columnCaptionOf = (widget) => {
    let best = null;
    for (const [key, claims] of cellClaims) {
      const claim = claims.find((c) => c.name === widget.name);
      if (!claim) continue;
      const cell = cellTextOf.get(key);
      // The side this form captions from wins outright. CC-1473's print-name
      // rule has "SIGNATURE OF ..." eight points above it and "PRINT NAME"
      // eight and a half below, and the form captions from below.
      const onConvention = claim.basis === convention;
      const better = !best
        || (onConvention !== best.onConvention ? onConvention
          : (claim.distance < best.gap - 0.5
            || (Math.abs(claim.distance - best.gap) <= 0.5 && claim.overlap > best.overlap)));
      if (better) {
        best = { text: cell.text, gap: claim.distance, basis: claim.basis, overlap: claim.overlap, onConvention };
      }
    }
    return best;
  };

  return widgets.map((widget) => {
    const rect = widget.rect ?? null;
    if (!rect) {
      return { name: widget.name, effectiveLabel: null, labelBasis: "widget_has_no_rectangle",
        regionHeading: null, regionBasis: null, regionIsDocumentTitle: false, labelGap: null };
    }
    const midline = rect.y + rect.height / 2;
    const right = rect.x + rect.width;

    // Same line, to the left: an inline blank, labelled by the words that run
    // into it. The band is the widget's own text band rather than its whole
    // height plus a line: a header row printed a quarter-point above a row of
    // boxes is not to the left of any of them, and reading it that way handed
    // NC AOC-CR-296's zip box the caption "Race" and its race box "State".
    let best = null;
    for (const cell of cells) {
      if (cell.y < rect.y - 2 || cell.y > rect.y + rect.height * 0.6) continue;
      if (cell.x2 > rect.x + 1) continue;
      const gap = rect.x - cell.x2;
      if (gap < 0 || gap > CAPTION_GAP_LEFT) continue;
      // Nothing may stand between a box and the words that label it. Nebraska's
      // caption band puts the court hint "(Enter the type of court)" 47 points
      // left of the COUNTY box with the court box in between, and read as the
      // county box's caption it made the field name and the paper contradict
      // each other over a value that was never in doubt.
      const blocked = placed.some((other) => other.name !== widget.name
        && other.rect.x + other.rect.width > cell.x2 + 1 && other.rect.x < rect.x - 1
        && overlaps1d(other.rect.y, other.rect.y + other.rect.height, rect.y, rect.y + rect.height));
      if (blocked) continue;
      if (!best || gap < best.gap) best = { text: cell.text, gap, basis: "printed_to_the_left_on_the_same_line", overlap: 0 };
    }

    if (!best) best = columnCaptionOf(widget);

    // The words the form prints immediately AFTER a blank, on the blank's own
    // baseline. A form that writes "____ addendums are attached to this
    // petition" has said what the blank counts, and VA CC-1201 filled that
    // box with a case number. This channel says nothing on its own; it is
    // offered to the binder alongside the caption so a descriptor can refuse a
    // slot whose trailing words describe something it is not.
    let trailing = null;
    for (const cell of cells) {
      if (Math.abs(cell.y - rect.y) > CAPTION_BASELINE_TOLERANCE) continue;
      if (cell.x < right - 1) continue;
      const gap = cell.x - right;
      if (gap < -1 || gap > CAPTION_GAP_LEFT) continue;
      if (!trailing || gap < trailing.gap) trailing = { text: cell.text, gap };
    }

    // A heading governs a widget only where the two actually meet: the
    // widget's midline inside the heading's band, and the widget's column
    // inside the heading's own span. A heading that spans the printed width
    // heads the page and meets everything on it.
    const region = regions.find((r) =>
      midline <= r.yTop && midline > r.yBottom
      && (r.spansPage || overlaps1d(r.xLeft, r.xRight, rect.x, right))) ?? null;

    return {
      name: widget.name,
      effectiveLabel: best ? asLabel(best.text) : null,
      labelBasis: best ? best.basis : "no_printed_caption_within_reach",
      labelGap: best ? Number(best.gap.toFixed(1)) : null,
      trailingLabel: trailing ? asLabel(trailing.text) : null,
      regionHeading: region ? region.heading : null,
      regionIsDocumentTitle: region ? region.isDocumentTitle === true : false,
      regionBasis: region
        ? (region.isDocumentTitle ? `${region.basis}; this is the document's title, which names the form rather than an area of it` : region.basis)
        : "no_printed_heading_overlaps_this_widget",
      // Which side of a box this page captions from, measured off the page.
      captionConvention: convention
    };
  });
}
