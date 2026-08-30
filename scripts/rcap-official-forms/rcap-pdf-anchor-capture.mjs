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
// --- ToUnicode ---------------------------------------------------------
//
// A caption harvested without the font's ToUnicode map is not text, it is glyph
// indices. Identity-H and any subset font with a custom encoding come back as
// mojibake, and every rule that reads captions then matches nothing — silently,
// and in the direction that fails open. NC AOC-CV-226 classified two
// participant fields as `money` off an unreadable label, NC AOC-CR-287 carries
// the same mojibake, and NE DC-1-15's headings decode to nothing at all, which
// is why its Certificate of Service still took a printed name.
//
// The map is a CMap stream of `beginbfchar`/`beginbfrange` sections. Codes are
// hex; destinations are hex UTF-16BE, either one per code or a bracketed list
// across a range.
function parseToUnicode(bytes) {
  const src = Buffer.from(bytes).toString("latin1");
  const map = new Map();
  const utf16 = (hex) => {
    let out = "";
    for (let i = 0; i + 3 < hex.length + 1; i += 4) {
      const unit = parseInt(hex.slice(i, i + 4), 16);
      if (Number.isFinite(unit)) out += String.fromCharCode(unit);
    }
    return out;
  };
  for (const section of src.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of section[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      map.set(parseInt(pair[1], 16), utf16(pair[2]));
    }
  }
  for (const section of src.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = section[1];
    for (const row of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      const lo = parseInt(row[1], 16), hi = parseInt(row[2], 16);
      const base = parseInt(row[3], 16);
      const width = row[3].length;
      for (let c = lo; c <= hi && c - lo < 65536; c += 1) {
        map.set(c, utf16((base + (c - lo)).toString(16).padStart(width, "0")));
      }
    }
    for (const row of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(row[1], 16);
      const dests = [...row[3].matchAll(/<([0-9a-fA-F]*)>/g)].map((m) => utf16(m[1]));
      dests.forEach((d, i) => map.set(lo + i, d));
    }
  }
  return map;
}

/** A Type0 font's per-code widths, from /W, plus /DW as the default. */
function type0Widths(fd, ctx) {
  const widths = new Map();
  let defaultWidth = 1000;
  try {
    const descendants = fd.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
    const df = descendants ? ctx.lookup(descendants.get(0), PDFDict) : null;
    if (!df) return { widths, defaultWidth };
    defaultWidth = Number(df.get(PDFName.of("DW"))?.asNumber?.() ?? 1000);
    const w = df.lookupMaybe(PDFName.of("W"), PDFArray);
    if (!w) return { widths, defaultWidth };
    const raw = w.asArray().map((e) => ctx.lookup(e) ?? e);
    for (let i = 0; i < raw.length;) {
      const first = Number(raw[i]?.asNumber?.() ?? NaN);
      const second = raw[i + 1];
      if (second instanceof PDFArray) {
        second.asArray().forEach((v, k) => widths.set(first + k, Number(ctx.lookup(v)?.asNumber?.() ?? v?.asNumber?.() ?? 0)));
        i += 2;
      } else {
        const last = Number(second?.asNumber?.() ?? NaN);
        const value = Number(raw[i + 2]?.asNumber?.() ?? 0);
        if (Number.isFinite(first) && Number.isFinite(last)) {
          for (let c = first; c <= last && c - first < 65536; c += 1) widths.set(c, value);
        }
        i += 3;
      }
    }
  } catch { /* a font without usable /W keeps the default */ }
  return { widths, defaultWidth };
}

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
    let toUnicode = null;
    try {
      const tu = fd.get(PDFName.of("ToUnicode"));
      const stream = tu ? ctx.lookup(tu) : null;
      if (stream instanceof PDFRawStream) toUnicode = parseToUnicode(decodePDFRawStream(stream).decode());
    } catch { /* a font without a usable ToUnicode decodes as raw codes */ }
    const twoByte = subtype === "Type0";
    const t0 = twoByte ? type0Widths(fd, ctx) : null;
    out.set(key.asString().replace(/^\//, ""), {
      subtype, firstChar, widths, missingWidth, toUnicode, twoByte,
      cidWidths: t0?.widths ?? null, defaultWidth: t0?.defaultWidth ?? null,
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

/**
 * Splits a shown string into glyphs and gives each its Unicode text.
 *
 * A Type0 string is a sequence of two-byte codes, so the raw string has two JS
 * characters per glyph; splitting it per character both mis-measures the
 * advance and makes the text unreadable. Advance is always computed from the
 * code, never from the decoded text, so decoding cannot move a caption.
 */
function glyphsOf(font, raw) {
  const out = [];
  const step = font?.twoByte ? 2 : 1;
  for (let i = 0; i < raw.length; i += step) {
    const code = step === 2
      ? ((raw.charCodeAt(i) << 8) | (raw.charCodeAt(i + 1) ?? 0))
      : raw.charCodeAt(i);
    const mapped = font?.toUnicode?.get(code);
    const text = mapped !== undefined && mapped !== ""
      ? mapped
      : (step === 2 ? String.fromCharCode(code) : raw[i]);
    out.push({ code, text });
  }
  return out;
}

/**
 * Collapses a run that came back as UTF-16BE big-endian bytes.
 *
 * Some forms draw two-byte codes through a font this walker resolves as a
 * single-byte one -- NE DC-1-15 is 113 runs of it on page 1 alone -- so the run
 * arrives as "\0N\0e\0b...". The ToUnicode lookup succeeds per byte and
 * faithfully returns the high byte too, which is why decoding alone does not
 * fix it. Glyph boxes are merged in pairs rather than recomputed, so the run's
 * total advance and its start position are exactly what they were: this makes
 * the caption readable without moving it.
 */
const NUL = String.fromCharCode(0);
function collapseUtf16BE(chars) {
  if (chars.length < 2 || chars.length % 2 !== 0) return null;
  for (let i = 0; i < chars.length; i += 1) {
    if ((i % 2 === 0) !== (chars[i].c === NUL)) return null;
  }
  const out = [];
  for (let i = 0; i < chars.length; i += 2) {
    out.push({ c: chars[i + 1].c, x: chars[i].x, w: Number((chars[i].w + chars[i + 1].w).toFixed(2)) });
  }
  return out;
}

/** The advance of one glyph code, in unscaled text-space units. */
function codeAdvance(font, code, size, charSpace, wordSpace, hScale) {
  let w;
  if (font?.twoByte) {
    w = font.cidWidths?.get(code) ?? font.defaultWidth ?? 1000;
  } else if (font?.widths && code >= font.firstChar && code - font.firstChar < font.widths.length) {
    w = font.widths[code - font.firstChar];
  } else if (font?.missingWidth) {
    w = font.missingWidth;
  } else {
    w = 500;
  }
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

function walkContent(bytes, resources, ctx, baseCtm, depth, streamId, inheritedFonts = null) {
  if (!bytes || bytes.length === 0) return { text: [], paths: [] };
  const src = Buffer.from(bytes).toString("latin1");
  const tokens = tokenize(src);

  // A Form XObject's /Resources may be partial: the spec lets it declare, say,
  // only /XObject and inherit /Font from the page. Shadowing the parent
  // wholesale left every run inside such a stream with no font, so no
  // ToUnicode, so Identity-H captions came back as raw UTF-16BE bytes. NE
  // DC-1-15 is the case -- its fonts are Identity-H with a ToUnicode map, on
  // the page, and the headings still decoded to nothing.
  const fonts = new Map(inheritedFonts ?? []);
  for (const [name, font] of loadFonts(resources, ctx)) fonts.set(name, font);
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
    let decoded = "";
    for (const glyph of glyphsOf(font, text)) {
      const a = codeAdvance(font, glyph.code, fontSize, charSpace, wordSpace, hScale);
      chars.push({ c: glyph.text, x: Number((m[4] + cursor * scale).toFixed(2)), w: Number((a * scale).toFixed(2)) });
      decoded += glyph.text;
      cursor += a;
    }
    const collapsed = decoded.includes(NUL) ? collapseUtf16BE(chars) : null;
    items.push({
      text: collapsed ? collapsed.map((c) => c.c).join("") : decoded,
      x: m[4], y: m[5], size: Number(size.toFixed(2)),
      width: Number((cursor * scale).toFixed(2)),
      metricsExact: font?.exact === true || Boolean(font?.twoByte && font.cidWidths?.size),
      decodedThroughToUnicode: Boolean(font?.toUnicode?.size),
      collapsedFromUtf16BE: Boolean(collapsed),
      chars: collapsed ?? chars
    });
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
          const nested = walkContent(decodePDFRawStream(xo).decode(), inner, ctx, mul(matrix, ctm), depth + 1, `${streamId}>form_xobject:${nameTok.v}`, fonts);
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
// A heading covering at least this fraction of the page width is a full-width
// section heading and governs every column beneath it.
const FULL_WIDTH_HEADING_FRACTION = 0.6;
// Runs further apart than this on one line belong to different cells of a
// printed table, not to one caption.
const CELL_GAP = 18;

/**
 * Strips a UTF-16BE big-endian residue from harvested text.
 *
 * The per-run collapse handles the common case, but a run can arrive already
 * mapped to a two-character sequence, or be split so that a pair straddles two
 * runs; either way the joined line still reads "\0F\0u\0l\0l". This is a
 * pure string normalisation applied to captions and headings only -- it never
 * touches a coordinate -- so a caption that a rule must read is readable
 * however the run boundaries fell.
 */
export function normalizeHarvestedText(text) {
  const raw = String(text ?? "");
  if (!raw.includes(NUL)) return raw;
  if (raw.length % 2 === 0) {
    let alternating = true;
    for (let i = 0; i < raw.length; i += 1) {
      if ((i % 2 === 0) !== (raw[i] === NUL)) { alternating = false; break; }
    }
    if (alternating) {
      let out = "";
      for (let i = 1; i < raw.length; i += 2) out += raw[i];
      return out;
    }
  }
  // Mixed content: drop the NULs rather than leaving a caption no rule can read.
  return raw.split(NUL).join("");
}

/**
 * The caption cell immediately left of a widget, rather than the whole row.
 *
 * A printed row on these forms is several columns: "Employment - Applicant $
 * Number Of Dependents" is three cells, and handing all of it to every widget
 * on the row is how NC AOC-CV-226's permanent-address lines acquired a "$" and
 * were classified as money. Runs are walked leftward from the one nearest the
 * widget and stop at the first gap wide enough to be a column break.
 */
function cellTextLeftOf(line, nearestRun) {
  const runs = [...line.runs].sort((a, b) => a.x - b.x);
  const end = runs.indexOf(nearestRun);
  if (end < 0) return line.text.slice(0, CAPTION_MAX_CHARS * 2);
  const parts = [runs[end]];
  for (let i = end - 1; i >= 0; i -= 1) {
    if (parts[0].x - runs[i].x2 > CELL_GAP) break;
    parts.unshift(runs[i]);
  }
  return parts.map((r) => r.text).join("").slice(0, CAPTION_MAX_CHARS * 2);
}

const overlaps1d = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0;
const overlapWidth = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1);

/**
 * One printed line split into the cells it is actually made of.
 *
 * The same column break `cellTextLeftOf` uses, applied to the whole line rather
 * than walked leftward from one run: consecutive runs closer than CELL_GAP are
 * one cell, and a wider gap starts the next.
 */
function cellsOf(line) {
  const cells = [];
  for (const run of [...line.runs].sort((a, b) => a.x - b.x)) {
    const last = cells[cells.length - 1];
    if (last && run.x - last.x2 <= CELL_GAP) {
      last.x2 = Math.max(last.x2, run.x2);
      last.runs.push(run);
    } else {
      cells.push({ x: run.x, x2: run.x2, runs: [run] });
    }
  }
  return cells.map((c) => ({ x: c.x, x2: c.x2, text: c.runs.map((r) => r.text).join("") }));
}

/**
 * The caption cell printed directly above a widget, rather than the whole row.
 *
 * The mirror of `cellTextLeftOf`, and it was missing. The "above" branch tested
 * the whole LINE's extent against the widget and then handed back the whole
 * line's TEXT, so on a form whose caption row is a multi-cell table header every
 * widget under that row harvested the same concatenated string. CT JD-CR-202
 * prints "Name of defendant | E-mail address | Phone number | Date of birth" as
 * one such row: all four widgets beneath it harvested
 * "Name of defendantE-mail addressPhone numberDate of birth", and
 * most-specific-first ordering resolved that to participant.date_of_birth for
 * every one of them -- the participant's date of birth into the name box, the
 * e-mail box and the phone box. The same row also gave JD/GA number the docket
 * caption and gave the court's address line the participant's own address.
 *
 * The cell chosen is the one that overlaps the widget most, so a caption that
 * merely clips the edge of a neighbouring column cannot take a box from the
 * cell actually printed over it. A line no cell of which overlaps the widget is
 * not this widget's caption at all and is skipped, where before the line's full
 * width could reach across a table into another column.
 *
 * This is strictly narrowing: it can only return a subset of the text the whole
 * line held, or nothing. It never reaches a line the old test rejected.
 */
function cellTextAbove(line, rect) {
  let best = null;
  for (const cell of cellsOf(line)) {
    const width = overlapWidth(cell.x, cell.x2, rect.x, rect.x + rect.width);
    if (width <= 0) continue;
    if (!best || width > best.width || (width === best.width && cell.x < best.cell.x)) best = { cell, width };
  }
  // Whitespace is collapsed exactly as groupIntoLines collapses it for
  // `line.text`, so a line that is ONE cell returns byte-for-byte what the
  // whole-line branch returned. A caption that moves here therefore means the
  // line really was a printed row of several cells, and nothing else.
  return best ? best.cell.text.replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX_CHARS * 2) : null;
}

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
    heading: normalizeHarvestedText(heading.text).trim(),
    size: heading.size ?? null,
    // A heading governs the column it is printed over, not the whole width of
    // the page. NC AOC-CR-296 prints "DISTRICT ATTORNEY PETITION" in the
    // right-hand title block; the defendant's own address lines sit at x=38 in
    // the left column and were refused as prosecutor-owned because the band
    // was matched on y alone. That is over-protection, and it withheld an
    // address the petition needs.
    xLeft: heading.x,
    xRight: Math.max(...heading.runs.map((r) => r.x2)),
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
export function captureWidgetContext(page, widgets, { precomputedLines = null, isFirstPage = true } = {}) {
  const lines = precomputedLines ?? groupIntoLines(extractTextItems(page));
  const regions = pageRegions(page, lines, { isFirstPage });
  const pageWidth = page.getSize?.().width ?? 612;

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
        if (!best || gap < best.gap) {
          best = { text: cellTextLeftOf(line, run), gap, basis: "printed_to_the_left_in_the_same_cell" };
        }
      }
    }

    // Above, in the same column -- and now in the same CELL of it.
    if (!best) {
      for (const line of lines) {
        const gap = line.y - top;
        if (gap < 0 || gap > CAPTION_GAP_ABOVE) continue;
        const text = cellTextAbove(line, rect);
        if (text === null) continue;
        if (!best || gap < best.gap) best = { text, gap, basis: "printed_directly_above_in_the_same_cell" };
      }
    }

    // Vertical band first, then the column. A heading whose printed extent does
    // not overlap the widget horizontally is describing a different column of
    // the same band, so it does not govern this widget. A heading that spans
    // most of the page width is a genuine full-width section heading and
    // governs everything beneath it.
    const inBand = regions.filter((r) => midline <= r.yTop && midline > r.yBottom);
    const region = inBand.find((r) => {
      const spansPage = (r.xRight - r.xLeft) >= pageWidth * FULL_WIDTH_HEADING_FRACTION;
      return spansPage || overlaps1d(r.xLeft, r.xRight, rect.x, rect.x + rect.width);
    }) ?? null;
    const bandOnly = inBand.length > 0 && region === null ? inBand[0] : null;

    return {
      name: widget.name,
      // A caption is punctuation-trimmed but never reworded: "Name:" is the
      // label "Name", and "(Enter the county name)" stays exactly that.
      effectiveLabel: best ? normalizeHarvestedText(best.text).replace(/[\s:*.]+$/, "").trim().slice(0, CAPTION_MAX_CHARS) || null : null,
      labelBasis: best ? best.basis : "no_printed_caption_within_reach",
      labelGap: best ? Number(best.gap.toFixed(1)) : null,
      regionHeading: region ? normalizeHarvestedText(region.heading) : null,
      regionHeadingInBandButAnotherColumn: bandOnly ? normalizeHarvestedText(bandOnly.heading) : null,
      regionIsDocumentTitle: region ? region.isDocumentTitle === true : false,
      regionBasis: region
        ? (region.isDocumentTitle ? `${region.basis}; this is the document's title, which names the form rather than an area of it` : region.basis)
        : "widget_sits_above_the_first_printed_heading"
    };
  });
}
