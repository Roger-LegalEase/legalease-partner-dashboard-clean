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

// --- text decoding ----------------------------------------------------------
//
// A content stream carries character *codes*, not characters. Reading those
// bytes as if they were already text is right only for a font that happens to
// be encoded that way, and wrong for every subset font in this corpus:
// Washington's BLAKE-006 draws 199 lines with Type0/Identity-H fonts whose
// codes are two bytes wide and bear no relation to Unicode, so a byte-wise read
// returned garbage and the family was dispositioned as having no extractable
// text layer.
//
// Codes and characters are therefore kept apart throughout. Widths are indexed
// by code, because that is what the font's own metrics are indexed by; only the
// text handed back to a caller is decoded. Conflating the two would move every
// value on the page, which is worse than not reading it.

/** Parses a /ToUnicode CMap into a code -> string map. */
function parseToUnicode(stream) {
  const map = new Map();
  let text;
  try { text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { return map; }
  const hexToStr = (hex) => {
    const clean = hex.replace(/[^0-9a-fA-F]/g, "");
    let s = "";
    for (let i = 0; i + 3 < clean.length + 1; i += 4) {
      const cp = parseInt(clean.slice(i, i + 4), 16);
      if (Number.isFinite(cp)) s += String.fromCharCode(cp);
    }
    return s;
  };
  for (const block of text.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      map.set(parseInt(m[1], 16), hexToStr(m[2]));
    }
  }
  for (const block of text.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    // <lo> <hi> <dst> -- a contiguous run starting at dst.
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
      const base = hexToStr(m[3]);
      if (!base || hi < lo || hi - lo > 0xffff) continue;
      const head = base.slice(0, -1), tail = base.charCodeAt(base.length - 1);
      for (let c = lo; c <= hi; c += 1) map.set(c, head + String.fromCharCode(tail + (c - lo)));
    }
    // <lo> <hi> [ <d0> <d1> ... ] -- one destination per code.
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(m[1], 16);
      const dsts = [...m[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((d) => hexToStr(d[1]));
      dsts.forEach((s, i) => map.set(lo + i, s));
    }
  }
  return map;
}

// Enough of the Adobe glyph list to name what official forms actually draw.
// Anything outside it falls through to the uniXXXX form or to a refusal, rather
// than to a guess.
const GLYPH_NAMES = {
  space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$", percent: "%",
  ampersand: "&", quotesingle: "'", parenleft: "(", parenright: ")", asterisk: "*",
  plus: "+", comma: ",", hyphen: "-", period: ".", slash: "/", zero: "0", one: "1",
  two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8",
  nine: "9", colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">",
  question: "?", at: "@", bracketleft: "[", backslash: "\\", bracketright: "]",
  asciicircum: "^", underscore: "_", grave: "`", braceleft: "{", bar: "|",
  braceright: "}", asciitilde: "~", quoteright: "’", quoteleft: "‘",
  quotedblleft: "“", quotedblright: "”", endash: "–", emdash: "—",
  bullet: "•", section: "§", paragraph: "¶", degree: "°"
};

function glyphNameToChar(name) {
  if (!name) return null;
  if (Object.hasOwn(GLYPH_NAMES, name)) return GLYPH_NAMES[name];
  if (/^[A-Za-z]$/.test(name)) return name;
  const uni = /^uni([0-9A-Fa-f]{4})$/.exec(name);
  if (uni) return String.fromCharCode(parseInt(uni[1], 16));
  const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (u) return String.fromCodePoint(parseInt(u[1], 16));
  return null;
}

/** Parses /Encoding /Differences into a code -> character map. */
function parseDifferences(encodingDict, ctx) {
  const map = new Map();
  let arr;
  try { arr = encodingDict.lookupMaybe(PDFName.of("Differences"), PDFArray); } catch { return map; }
  if (!arr) return map;
  let code = 0;
  for (const entry of arr.asArray()) {
    const resolved = ctx.lookup(entry) ?? entry;
    const asNum = resolved?.asNumber?.();
    if (typeof asNum === "number") { code = asNum; continue; }
    const name = String(resolved ?? "").replace(/^\//, "");
    const ch = glyphNameToChar(name);
    if (ch !== null) map.set(code, ch);
    code += 1;
  }
  return map;
}

/** Parses a CIDFont's /W array and /DW into per-CID widths. */
function parseCidWidths(descendant, ctx) {
  const widths = new Map();
  let dw = 1000;
  if (!descendant) return { widths, dw };
  try {
    const d = descendant.get(PDFName.of("DW"))?.asNumber?.();
    if (typeof d === "number") dw = d;
  } catch { /* default */ }
  let w;
  try { w = descendant.lookupMaybe(PDFName.of("W"), PDFArray); } catch { return { widths, dw }; }
  if (!w) return { widths, dw };
  const items = w.asArray().map((x) => ctx.lookup(x) ?? x);
  for (let i = 0; i < items.length;) {
    const first = items[i]?.asNumber?.();
    const second = items[i + 1];
    if (typeof first !== "number") { i += 1; continue; }
    if (second instanceof PDFArray) {
      // c [w1 w2 ...] -- consecutive CIDs starting at c.
      second.asArray().forEach((x, k) => {
        const v = (ctx.lookup(x) ?? x)?.asNumber?.();
        if (typeof v === "number") widths.set(first + k, v);
      });
      i += 2;
    } else {
      // cFirst cLast w -- one width across a range.
      const last = second?.asNumber?.();
      const val = items[i + 2]?.asNumber?.();
      if (typeof last === "number" && typeof val === "number" && last >= first && last - first <= 65535) {
        for (let c = first; c <= last; c += 1) widths.set(c, val);
      }
      i += 3;
    }
  }
  return { widths, dw };
}

// Every font in this corpus carries metrics the document itself declares, so
// advances come from those rather than an estimate. What differs is how a code
// maps to a character, which is why the decoder is loaded alongside the widths.
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

    let toUnicode = new Map();
    try {
      const tu = ctx.lookup(fd.get(PDFName.of("ToUnicode")));
      if (tu instanceof PDFRawStream) toUnicode = parseToUnicode(tu);
    } catch { /* no CMap */ }

    // Identity-H and Identity-V address glyphs with two-byte codes. Reading
    // them one byte at a time both mis-decodes the text and mis-advances the
    // pen, so the code width has to be known before anything is read.
    const encodingRaw = fd.get(PDFName.of("Encoding"));
    const encodingName = String(encodingRaw ?? "").replace(/^\//, "");
    const twoByte = subtype === "Type0" && /^Identity-[HV]$/.test(encodingName);

    let differences = new Map();
    try {
      const encDict = fd.lookupMaybe(PDFName.of("Encoding"), PDFDict);
      if (encDict) differences = parseDifferences(encDict, ctx);
    } catch { /* no differences */ }

    let cidWidths = null;
    let descendantDw = 1000;
    if (subtype === "Type0") {
      try {
        const kids = fd.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
        const descendant = kids ? ctx.lookup(kids.get(0), PDFDict) : null;
        const parsed = parseCidWidths(descendant, ctx);
        cidWidths = parsed.widths; descendantDw = parsed.dw;
      } catch { /* fall back to the default width */ }
    }

    out.set(key.asString().replace(/^\//, ""), {
      subtype, firstChar, widths, missingWidth, toUnicode, differences,
      twoByte, cidWidths, descendantDw, encodingName,
      // Metrics are exact when the document declares them for this code space.
      exact: subtype === "Type0" ? Boolean(cidWidths && cidWidths.size > 0) : Boolean(widths),
      // A font can be read when something maps its codes to characters. A
      // simple font with neither a CMap nor Differences is still readable if
      // its codes are a standard encoding, which is checked per code.
      decodable: toUnicode.size > 0 || differences.size > 0 || subtype !== "Type0"
    });
  }
  return out;
}

/**
 * Splits a raw string into character codes and decodes them.
 *
 * Returns codes and text separately and reports whether every code could be
 * decoded. A caller that needs meaning must consult `undecodedCodes`: a run
 * this could not read is not an empty run, and treating it as one is how four
 * Washington forms came to be dispositioned as having no text layer.
 */
function decodeCodes(font, raw) {
  const codes = [];
  if (font?.twoByte) {
    for (let i = 0; i + 1 < raw.length; i += 2) codes.push((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
    if (raw.length % 2 === 1) codes.push(raw.charCodeAt(raw.length - 1));
  } else {
    for (let i = 0; i < raw.length; i += 1) codes.push(raw.charCodeAt(i));
  }

  let text = "";
  let undecoded = 0;
  for (const code of codes) {
    const viaCMap = font?.toUnicode?.get(code);
    if (viaCMap !== undefined && viaCMap !== "") { text += viaCMap; continue; }
    const viaDiff = font?.differences?.get(code);
    if (viaDiff !== undefined) { text += viaDiff; continue; }
    // A single-byte code in the printable Latin-1 range is its own character
    // under every standard encoding this corpus uses.
    if (!font?.twoByte && ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff))) {
      text += String.fromCharCode(code); continue;
    }
    if (!font?.twoByte && (code === 0x09 || code === 0x0a || code === 0x0d)) { text += " "; continue; }
    undecoded += 1;
    text += "�";
  }
  return { codes, text, undecodedCodes: undecoded, fullyDecoded: undecoded === 0 };
}

/** Advance for one character code, in unscaled text-space units. */
function codeAdvance(font, code, size, charSpace, wordSpace, hScale) {
  let w;
  if (font?.cidWidths) {
    w = font.cidWidths.get(code);
    if (w === undefined) w = font.descendantDw ?? 1000;
  } else if (font?.widths && code >= font.firstChar && code - font.firstChar < font.widths.length) {
    w = font.widths[code - font.firstChar];
  } else if (font?.missingWidth) w = font.missingWidth;
  else w = 500;
  // Word spacing applies to single-byte code 32 only; it does not apply in a
  // two-byte code space, and applying it there would shift every run right.
  const isWordSpace = code === 32 && !font?.twoByte;
  return ((w / 1000) * size + charSpace + (isWordSpace ? wordSpace : 0)) * hScale;
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
  return walkContent(contentBytesOf(page), page.node.Resources?.(), page.node.context, [1, 0, 0, 1, 0, 0], 0, null);
}

// Flattening a filled form does not inline the value as page text: pdf-lib
// draws each field's appearance stream as a Form XObject and references it
// with `Do`. Text inside that XObject is genuinely visible on the page, so a
// walker that stops at the page's own content stream reports a filled form as
// empty. Recursing through `Do` is what makes "the value is visibly present"
// a checkable claim rather than an assumption.
const MAX_XOBJECT_DEPTH = 12;

// Transforms a Form XObject's /BBox into device space, so a run can say which
// appearance stream drew it and not merely where it landed.
//
// Provenance matters because geometry alone cannot separate a filled value from
// the form text printed around it: on a flattened form the label, the rule line
// and the value all share a baseline, and a value that overflows its box
// overlaps its neighbours by construction. Asking "which appearance drew this?"
// answers exactly what a read-back needs to know; asking "what is near this
// rectangle?" answers something else and is right only by luck.
function placedBBox(dict, ctx, matrixToDevice) {
  const arr = dict.lookupMaybe(PDFName.of("BBox"), PDFArray);
  if (!arr) return null;
  const v = arr.asArray().map((e) => Number(ctx.lookup(e)?.asNumber?.() ?? e?.asNumber?.() ?? 0));
  if (v.length < 4 || v.some((n) => !Number.isFinite(n))) return null;
  const corners = [[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]]]
    .map(([x, y]) => [
      matrixToDevice[0] * x + matrixToDevice[2] * y + matrixToDevice[4],
      matrixToDevice[1] * x + matrixToDevice[3] * y + matrixToDevice[5]
    ]);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return {
    x: Number(Math.min(...xs).toFixed(2)), y: Number(Math.min(...ys).toFixed(2)),
    width: Number((Math.max(...xs) - Math.min(...xs)).toFixed(2)),
    height: Number((Math.max(...ys) - Math.min(...ys)).toFixed(2))
  };
}

function walkContent(bytes, resources, ctx, baseCtm, depth, container) {
  if (!bytes || bytes.length === 0) return [];
  const src = Buffer.from(bytes).toString("latin1");
  const tokens = tokenize(src);

  const fonts = loadFonts(resources, ctx);
  const items = [];
  let ctm = baseCtm.slice();
  let font = null;
  const stack = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0];
  let fontSize = 0, leading = 0, charSpace = 0, wordSpace = 0, hScale = 1;
  const operands = [];

  const show = (raw) => {
    if (!raw) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[0], m[1]) || 1;
    const size = fontSize * scale;

    // Codes drive the geometry, characters carry the meaning. Advancing by the
    // decoded character instead of the code would look up the wrong width and
    // walk every subsequent glyph off its true position, which is how a value
    // ends up in the next column.
    const { codes, text, undecodedCodes, fullyDecoded } = decodeCodes(font, raw);
    const decodedChars = [...text];

    // Per-character positions: a fill-in-the-blank form's rule lines are found
    // by locating contiguous underscores, which needs each glyph's own x.
    const chars = [];
    let cursor = 0;
    for (let i = 0; i < codes.length; i += 1) {
      const a = codeAdvance(font, codes[i], fontSize, charSpace, wordSpace, hScale);
      chars.push({
        c: decodedChars[i] ?? "�", code: codes[i],
        x: Number((m[4] + cursor * scale).toFixed(2)), w: Number((a * scale).toFixed(2))
      });
      cursor += a;
    }
    items.push({
      text, x: m[4], y: m[5], size: Number(size.toFixed(2)),
      width: Number((cursor * scale).toFixed(2)),
      metricsExact: font?.exact === true,
      // Carried so a caller can refuse a run it cannot read rather than
      // silently treating an undecodable run as absent.
      fullyDecoded, undecodedCodes, codeCount: codes.length,
      fontSubtype: font?.subtype ?? null, chars,
      // Which appearance stream drew this run, if it was not the page itself.
      container
    });
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
          const toDevice = mul(matrix, ctm);
          const bbox = placedBBox(dict, ctx, toDevice);
          // The innermost enclosing appearance wins: a widget's stream may draw
          // through a nested one, and it is the widget the caller asked about.
          const nested = bbox ? { depth: depth + 1, name: nameTok.v, bbox } : container;
          items.push(...walkContent(decodePDFRawStream(xo).decode(), inner, ctx, toDevice, depth + 1, nested));
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
  return items;
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
      // A line is only readable when every code on it decoded. Reporting a
      // half-read line as if it were the whole line is what turns a partial
      // decode into a confident wrong answer.
      fullyDecoded: sorted.every((i) => i.fullyDecoded !== false),
      undecodedCodes: sorted.reduce((n, i) => n + (i.undecodedCodes ?? 0), 0),
      runs: sorted.map((i) => ({ text: i.text, x: Number(i.x.toFixed(1)),
        x2: Number((i.x + (i.width ?? 0)).toFixed(1)), size: i.size,
        metricsExact: i.metricsExact, fullyDecoded: i.fullyDecoded !== false })),
      chars: sorted.flatMap((i) => i.chars ?? [])
    };
  }).filter((l) => l.text.length > 0);
}

/**
 * Splits one line into the label-sized tokens a matcher can actually use.
 *
 * A line is not a label. Two Washington order forms draw every glyph as its own
 * text-showing operator -- 100% of their runs are one character long -- so a
 * matcher that looks at runs sees "D", "i", "s" and concludes that no label is
 * present. That conclusion is about the matcher, not the form: the same page
 * carries "District/Municipal Court of Washington, County/City of" in plain
 * sight. But merging everything on a baseline into one string is the opposite
 * error, because a caption line holds "Plaintiff" on the left and "No." on the
 * right, and an anchor measured from their concatenation points at neither.
 *
 * So adjacency decides. Glyphs separated by no more than an ordinary word space
 * belong to the same token; a gap wide enough to be a column boundary ends it.
 * The threshold scales with the type size, because a 6pt footnote and a 14pt
 * heading do not share a definition of "far apart".
 *
 * Returns tokens in reading order, each with its own extent, so a caller can
 * both read a label and place something beside it.
 */
export function assembleLabelTokens(line, { gapFactor = 1.1, minGap = 2.5 } = {}) {
  const chars = (line?.chars ?? []).filter((c) => c && Number.isFinite(c.x)).sort((a, b) => a.x - b.x);
  if (chars.length === 0) return [];
  const size = Number(line.size) > 0 ? Number(line.size) : 10;
  const threshold = Math.max(minGap, gapFactor * size);

  const tokens = [];
  let current = null;
  let cursor = null;
  for (const ch of chars) {
    const gap = cursor === null ? 0 : ch.x - cursor;
    if (current === null || gap > threshold) {
      if (current) tokens.push(current);
      current = { text: "", x: ch.x, x2: ch.x + (ch.w ?? 0), chars: [] };
    }
    current.text += ch.c;
    current.x2 = Math.max(current.x2, ch.x + (ch.w ?? 0));
    current.chars.push(ch);
    cursor = ch.x + (ch.w ?? 0);
  }
  if (current) tokens.push(current);

  return tokens
    .map((t) => ({
      text: t.text.replace(/\s+/g, " ").trim(),
      x: Number(t.x.toFixed(1)), x2: Number(t.x2.toFixed(1)),
      y: line.y, size: line.size,
      charCount: t.chars.length,
      // Carried through so a token inherits the line's readability rather than
      // appearing trustworthy on its own.
      fullyDecoded: line.fullyDecoded !== false,
      metricsExact: line.metricsExact !== false
    }))
    .filter((t) => t.text.length > 0);
}

/**
 * Every usable label token on a page's decodable lines, in reading order.
 *
 * Refused lines never contribute: a token assembled from codes nobody could
 * decode is a guess wearing the costume of a measurement.
 */
export function assembleLabelTokensFromLines(lines, options = {}) {
  return lines
    .filter((l) => l.fullyDecoded !== false && l.metricsExact !== false)
    .flatMap((l) => assembleLabelTokens(l, options));
}

/**
 * Raised when a page's text layer cannot be read well enough to anchor on.
 *
 * An anchor placed against a label the decoder could not read is a guess about
 * where a participant's data belongs on a court form. Refusing is the only safe
 * outcome, and the refusal names what could not be read so it can be fixed
 * rather than worked around.
 */
export class UndecodableTextLayerError extends Error {
  constructor(detail) {
    super(`refusing to anchor against a text layer that could not be decoded: `
      + `${detail.undecodedLines} of ${detail.totalLines} line(s) carry undecoded codes`);
    this.name = "UndecodableTextLayerError";
    this.reason = "text_layer_not_decodable";
    this.detail = detail;
    this.remediation = "the font's /ToUnicode CMap, /Encoding /Differences or code width is not being read; fix the decoder rather than lowering the threshold";
  }
}

/**
 * The gate every anchor set passes through.
 *
 * Two outcomes only. A page whose lines all decoded may be anchored against; a
 * page with any undecoded line is refused, whatever proportion decoded. There
 * is deliberately no "mostly readable" verdict: the geometry of an anchor is
 * only as trustworthy as the label it was measured from, and a caller cannot
 * tell which lines were the unreadable ones after the fact.
 */
/**
 * Splits a page's lines into the ones that may be anchored against and the ones
 * that may not.
 *
 * The unit that matters is the anchor, not the document. A form can draw a
 * checkbox glyph from a symbol font that carries no /ToUnicode entry -- two
 * Washington forms do, in about 1% of their runs -- and rejecting the whole
 * text layer over a glyph that was never a label would discard 190 perfectly
 * readable ones. Rejecting nothing would let a value be placed against a label
 * nobody could read, which is worse.
 *
 * So each line is judged on its own: a line whose every code decoded is usable,
 * and a line carrying any undecoded code is refused with a typed reason and
 * never offered to the caller as an anchor.
 */
export function partitionDecodableAnchors(lines) {
  const usable = [];
  const refused = [];
  for (const line of lines) {
    if (line.fullyDecoded === false) {
      refused.push({
        reason: "line_carries_undecoded_character_codes",
        undecodedCodes: line.undecodedCodes ?? null,
        y: line.y, x: line.x, partialText: String(line.text ?? "").slice(0, 60)
      });
      continue;
    }
    if (line.metricsExact === false) {
      // The text reads, but the advances behind its geometry are estimated, so
      // an anchor measured from it could sit a column away from where it looks.
      refused.push({
        reason: "line_geometry_rests_on_estimated_metrics",
        y: line.y, x: line.x, partialText: String(line.text ?? "").slice(0, 60)
      });
      continue;
    }
    usable.push(line);
  }
  return {
    usable, refused,
    totalLines: lines.length,
    usableLines: usable.length,
    refusedLines: refused.length,
    refusedByReason: refused.reduce((a, r) => { a[r.reason] = (a[r.reason] ?? 0) + 1; return a; }, {})
  };
}

export function assertAnchorsDecodable(lines, { allowPartial = false } = {}) {
  const total = lines.length;
  const undecoded = lines.filter((l) => l.fullyDecoded === false);
  const inexact = lines.filter((l) => l.metricsExact === false);
  const detail = {
    totalLines: total,
    undecodedLines: undecoded.length,
    undecodedCodes: undecoded.reduce((n, l) => n + (l.undecodedCodes ?? 0), 0),
    linesWithInexactMetrics: inexact.length,
    sample: undecoded.slice(0, 5).map((l) => ({ y: l.y, x: l.x, text: l.text.slice(0, 60) }))
  };
  if (undecoded.length > 0 && !allowPartial) throw new UndecodableTextLayerError(detail);
  return detail;
}
