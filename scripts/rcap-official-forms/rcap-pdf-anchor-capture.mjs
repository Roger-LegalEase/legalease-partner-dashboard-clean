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

// A Type0/Identity-H font addresses glyphs by two-byte index, so its strings
// are unreadable until the font's own ToUnicode CMap is applied. Parsing that
// CMap turns a subset-encoded form -- North Carolina's Vietnamese and Spanish
// petitions, Arkansas's pardoned-offender petition -- back into text.
function parseToUnicode(bytes) {
  const src = Buffer.from(bytes).toString("latin1");
  const map = new Map();
  const hexToStr = (h) => {
    let out = "";
    for (let i = 0; i < h.length; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4).padEnd(4, "0"), 16));
    return out;
  };
  for (const block of src.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      map.set(parseInt(m[1], 16), hexToStr(m[2]));
    }
  }
  for (const block of src.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(m[1], 16);
      [...m[3].matchAll(/<([0-9a-fA-F]+)>/g)].forEach((d, i) => map.set(lo + i, hexToStr(d[1])));
    }
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), dst = m[3];
      if (hi < lo || hi - lo > 65535) continue;
      const base = parseInt(dst.slice(-4), 16);
      const prefix = hexToStr(dst.slice(0, -4));
      for (let c = lo; c <= hi; c++) map.set(c, prefix + String.fromCharCode(base + (c - lo)));
    }
  }
  return map;
}

// Type0 advances live in the descendant font's /W array, defaulting to /DW.
function parseCidWidths(wArray, ctx) {
  const widths = new Map();
  if (!wArray) return widths;
  const items = wArray.asArray().map((v) => ctx.lookup(v) ?? v);
  for (let i = 0; i < items.length;) {
    const first = Number(items[i]?.asNumber?.() ?? NaN);
    const next = items[i + 1];
    if (next instanceof PDFArray) {
      next.asArray().map((v) => Number((ctx.lookup(v) ?? v)?.asNumber?.() ?? 0))
        .forEach((w, k) => widths.set(first + k, w));
      i += 2;
    } else {
      const last = Number(next?.asNumber?.() ?? NaN);
      const w = Number(items[i + 2]?.asNumber?.() ?? 0);
      if (Number.isFinite(first) && Number.isFinite(last) && last >= first && last - first <= 65535) {
        for (let c = first; c <= last; c++) widths.set(c, w);
      }
      i += 3;
    }
  }
  return widths;
}

// Every simple font in this corpus carries an explicit /Widths array, so
// advances are computed from the document's own metrics rather than estimated.
function loadPageFonts(page) {
  const out = new Map();
  const res = page.node.Resources?.();
  if (!res) return out;
  let fonts;
  try { fonts = res.lookup(PDFName.of("Font"), PDFDict); } catch { return out; }
  if (!fonts) return out;
  for (const [key, ref] of fonts.entries()) {
    let fd;
    try { fd = page.node.context.lookup(ref, PDFDict); } catch { continue; }
    if (!fd) continue;
    // The dictionary value serializes as "/Type0"; compare on the bare name.
    const subtype = String(fd.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "");
    const firstChar = Number(fd.get(PDFName.of("FirstChar"))?.asNumber?.() ?? 0);
    let widths = null;
    try {
      const w = fd.lookupMaybe(PDFName.of("Widths"), PDFArray);
      if (w) widths = w.asArray().map((n) => Number(page.node.context.lookup(n)?.asNumber?.() ?? n?.asNumber?.() ?? 0));
    } catch { /* no widths */ }
    let missingWidth = 0;
    try {
      const desc = fd.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
      missingWidth = Number(desc?.get(PDFName.of("MissingWidth"))?.asNumber?.() ?? 0);
    } catch { /* default */ }
    let toUnicode = null;
    try {
      const tu = fd.lookup(PDFName.of("ToUnicode"));
      if (tu instanceof PDFRawStream) toUnicode = parseToUnicode(decodePDFRawStream(tu).decode());
    } catch { /* unreadable CMap */ }

    // Type0: two-byte codes, widths from the descendant font.
    let cidWidths = null, defaultWidth = 1000;
    if (subtype === "Type0") {
      try {
        const df = fd.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
        const d0 = df ? page.node.context.lookup(df.get(0), PDFDict) : null;
        if (d0) {
          cidWidths = parseCidWidths(d0.lookupMaybe(PDFName.of("W"), PDFArray), page.node.context);
          defaultWidth = Number(d0.get(PDFName.of("DW"))?.asNumber?.() ?? 1000);
        }
      } catch { /* fall back to DW */ }
    }

    out.set(key.asString().replace(/^\//, ""), {
      subtype, firstChar, widths, missingWidth, toUnicode, cidWidths, defaultWidth,
      twoByte: subtype === "Type0",
      // A Type0 font is only exact once both its CMap and its widths resolve.
      exact: subtype === "Type0" ? Boolean(toUnicode && cidWidths) : Boolean(widths)
    });
  }
  return out;
}

// Splits a shown string into the glyphs the font actually addresses, decoding
// each to text and pairing it with its own advance. A Type0 string is read two
// bytes at a time; a simple font one byte at a time.
function decodeGlyphs(font, raw, size, charSpace, wordSpace, hScale) {
  const out = [];
  if (font?.twoByte) {
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
      const text = font.toUnicode?.get(code) ?? "\uFFFD";
      const w = font.cidWidths?.get(code) ?? font.defaultWidth ?? 1000;
      out.push({ text, advance: ((w / 1000) * size + charSpace) * hScale });
    }
    return out;
  }
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    let w;
    if (font?.widths && code >= font.firstChar && code - font.firstChar < font.widths.length) {
      w = font.widths[code - font.firstChar];
    } else if (font?.missingWidth) w = font.missingWidth;
    else w = 500;
    // A simple font's ToUnicode map still governs what the byte means.
    const text = font?.toUnicode?.get(code) ?? ch;
    out.push({ text, advance: ((w / 1000) * size + charSpace + (code === 32 ? wordSpace : 0)) * hScale });
  }
  return out;
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
  const bytes = contentBytesOf(page);
  if (bytes.length === 0) return [];
  const src = Buffer.from(bytes).toString("latin1");
  const tokens = tokenize(src);

  const fonts = loadPageFonts(page);
  const items = [];
  let ctm = [1, 0, 0, 1, 0, 0];
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
    const glyphs = decodeGlyphs(font, text, fontSize, charSpace, wordSpace, hScale);
    const chars = [];
    let cursor = 0, decoded = "";
    for (const g of glyphs) {
      const gx = m[4] + cursor * scale, gw = g.advance * scale;
      // A glyph may decode to more than one character (a ligature); they share
      // the glyph's box rather than inventing sub-positions.
      for (const c of g.text) chars.push({ c, x: Number(gx.toFixed(2)), w: Number((gw / g.text.length).toFixed(2)) });
      decoded += g.text;
      cursor += g.advance;
    }
    items.push({ text: decoded, x: m[4], y: m[5], size: Number(size.toFixed(2)),
      width: Number((cursor * scale).toFixed(2)), metricsExact: font?.exact === true, chars });
    tm = mul([1, 0, 0, 1, cursor, 0], tm);
  };

  for (const tk of tokens) {
    if (tk.t !== "op") { operands.push(tk); continue; }
    const n = (k) => { const v = operands[operands.length - k]; return v && v.t === "num" ? v.v : 0; };
    switch (tk.v) {
      case "q": stack.push(ctm.slice()); break;
      case "Q": ctm = stack.pop() ?? ctm; break;
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
      default: break;
    }
    // `[` and `]` delimit a TJ array, so they must not flush the operands the
    // TJ that follows them is about to read.
    if (tk.v === "[" || tk.v === "]") operands.push(tk);
    else operands.length = 0;
  }
  return items;
}

// Returns every rectangle the page paints, in device space. A boxed caption
// form draws its cells as real rectangles, so the box that holds a value can
// be measured rather than assumed from the label's position.
export function extractRects(page) {
  const bytes = contentBytesOf(page);
  if (bytes.length === 0) return [];
  const tokens = tokenize(Buffer.from(bytes).toString("latin1"));
  const rects = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const operands = [];
  let pending = null;
  for (const tk of tokens) {
    if (tk.t !== "op") { operands.push(tk); continue; }
    const n = (k) => { const v = operands[operands.length - k]; return v && v.t === "num" ? v.v : 0; };
    if (tk.v === "q") stack.push(ctm.slice());
    else if (tk.v === "Q") ctm = stack.pop() ?? ctm;
    else if (tk.v === "cm") ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm);
    else if (tk.v === "re") {
      const [x, y, w, h] = [n(4), n(3), n(2), n(1)];
      const p1 = mul([1, 0, 0, 1, x, y], ctm), p2 = mul([1, 0, 0, 1, x + w, y + h], ctm);
      pending = { x: Math.min(p1[4], p2[4]), y: Math.min(p1[5], p2[5]),
        width: Math.abs(p2[4] - p1[4]), height: Math.abs(p2[5] - p1[5]) };
    } else if (pending && /^(f|F|f\*|B|B\*|b|b\*|S|s|n)$/.test(tk.v)) {
      // A rectangle used purely as a clip (W n) is not a drawn cell.
      if (tk.v !== "n") rects.push({ ...pending, op: tk.v });
      pending = null;
    }
    if (tk.v === "[" || tk.v === "]") operands.push(tk); else operands.length = 0;
  }
  return rects;
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
