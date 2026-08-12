// Lane D1C: regenerates the official-form packages for Nebraska, Vermont and
// Wisconsin against the D0-remediated factory.
//
// This driver exists instead of `scripts/implement-rcap-official-forms-d1.mjs`
// because that script reads and rewrites two corpus-wide index files, and seven
// lanes regenerate concurrently. Sharing those files would mean each lane's
// last write silently discarded the other six. Nothing here touches a shared
// path: every write lands under one of this lane's three state directories, and
// the per-state `state-index.json` each run emits is what the captain merges.
//
// The D0 factory modules are imported and driven, never modified and never
// reimplemented. What this file adds is the part that has to be decided per
// corpus rather than per factory:
//
//   * measurement. Three of these forms name their widgets positionally and
//     four carry no widgets at all, so the meaning of a field has to be read
//     off the page rather than off a field name. Text and rule geometry are
//     measured out of the content streams;
//   * narrowing. The overlay caption gate below is strictly narrower than D0's
//     binder. It decides which measured captions are even offered as anchors;
//     D0 then re-judges every one of them and has the last word. A caption this
//     file admits can still be refused downstream. One it rejects is never
//     written. Protections only ever compose in the safe direction;
//   * cross-field geometry. D0 judges each field alone, so two widgets that
//     both bind the same fact and physically overlap are individually valid and
//     jointly wrong. Those groups are refused whole.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream,
  PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, StandardFonts
} = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = process.env.RCAP_D1C_SOURCE ?? "/tmp/rcap-source-packs/D1C/extract";
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");

const LANE = "D1C";
const FACTORY_VERSION = "d0-remediated-v1";
const SOURCE_PACK = {
  asset: "RCAP_D_D1_SOURCE_PACK.zip",
  releaseTag: "rcap-d-source-packs-2026-08-12",
  sha256: "01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa"
};
const STATES = [
  { code: "NE", slug: "nebraska", name: "Nebraska" },
  { code: "VT", slug: "vermont", name: "Vermont" },
  { code: "WI", slug: "wisconsin", name: "Wisconsin" }
];

// =============================================================================
// manifest
// =============================================================================

// RFC4180 with quoted fields; the Edition-1 manifests carry embedded commas and
// doubled quotes inside `notes`.
function parseCsv(text) {
  const rows = [];
  let field = "", row = [], quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false; }
      else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function readManifest(stateCode) {
  const rows = parseCsv(fs.readFileSync(path.join(SRC, "STATES", stateCode, "STATE_MANIFEST.csv"), "utf8"));
  const header = rows[0];
  return rows.slice(1)
    .filter((r) => r.length > 1 && r.some((v) => v.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

// The family slug the corpus already uses: the document id lowercased with dots
// flattened, suffixed by the asset class the manifest declares.
const CLASS_SUFFIX = {
  packet_form: "form-en",
  instructions: "instructions-en",
  supporting_process: "support-en",
  source_gated: "gated-en"
};
function familySlugOf(record) {
  const id = record.document_id.toLowerCase().replace(/[.\s_]+/g, "-").replace(/-+/g, "-");
  const suffix = CLASS_SUFFIX[record.asset_class];
  return suffix ? `${id}-${suffix}` : id;
}

// =============================================================================
// page capture: text with real Unicode, and painted rectangles
// =============================================================================
//
// The shared anchor capture reads one byte per glyph, which is right for the
// WinAnsi fonts that carry most of this corpus's prose. It is not right for the
// Identity-H subsets these three states use for exactly the captions that
// matter -- Nebraska's "(Date of conviction)" and Wisconsin's "Defendant's
// Name" among them -- where a glyph is a two-byte CID and the text reads back
// as mojibake. Those captions are the only thing naming a positional widget or
// an uncaptioned rule, so they have to decode correctly or the field cannot be
// identified at all.
//
// This capture therefore resolves each font's /ToUnicode CMap and its real
// width source (/W for CID fonts, /Widths for simple ones) before decoding, and
// records per-glyph whether the mapping existed. A caption containing an
// unmapped glyph is reported as partially decoded and is never treated as if it
// read cleanly.
//
// The same walk collects painted rectangles. A flat form draws its answer
// blanks as thin filled rules rather than underscores, and a rule's measured
// extent is the only honest source for where a value may be written.

function contentStringOf(page) {
  const contents = page.node.Contents();
  if (!contents) return "";
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => page.node.context.lookup(ref))
    : [contents];
  let out = "";
  for (const stream of streams) {
    if (!(stream instanceof PDFRawStream)) continue;
    try { out += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1") + "\n"; } catch { /* undecodable */ }
  }
  return out;
}

function utf16beToString(hex) {
  let out = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return out;
}

function parseToUnicode(text) {
  const map = new Map();
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(parseInt(m[1], 16), utf16beToString(m[2]));
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), start = parseInt(m[3], 16);
      for (let c = lo; c <= hi && c - lo < 65536; c += 1) map.set(c, String.fromCodePoint(start + (c - lo)));
    }
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(m[1], 16);
      [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].forEach((it, k) => map.set(lo + k, utf16beToString(it[1])));
    }
  }
  return map;
}

function loadFonts(resources, ctx) {
  const out = new Map();
  if (!resources) return out;
  let fonts;
  try { fonts = resources.lookupMaybe(PDFName.of("Font"), PDFDict); } catch { return out; }
  if (!fonts) return out;
  for (const [key, ref] of fonts.entries()) {
    let fd;
    try { fd = ctx.lookup(ref, PDFDict); } catch { continue; }
    if (!fd) continue;
    const subtype = String(fd.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "");
    const info = {
      subtype, twoByte: subtype === "Type0", toUnicode: null,
      widths: null, firstChar: 0, missingWidth: 0, cidWidths: null, defaultWidth: 1000
    };
    try {
      const tu = fd.get(PDFName.of("ToUnicode"));
      const stream = tu ? ctx.lookup(tu) : null;
      if (stream instanceof PDFRawStream) {
        info.toUnicode = parseToUnicode(Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"));
      }
    } catch { /* no usable CMap */ }
    if (info.twoByte) {
      try {
        const descendants = fd.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
        const cid = descendants ? ctx.lookup(descendants.get(0), PDFDict) : null;
        if (cid) {
          info.defaultWidth = Number(cid.get(PDFName.of("DW"))?.asNumber?.() ?? 1000);
          const w = cid.lookupMaybe(PDFName.of("W"), PDFArray);
          if (w) {
            const widths = new Map();
            const arr = w.asArray().map((v) => ctx.lookup(v));
            let i = 0;
            while (i < arr.length) {
              const next = arr[i + 1];
              if (next instanceof PDFArray) {
                const start = Number(arr[i]?.asNumber?.() ?? 0);
                next.asArray().forEach((v, k) => widths.set(start + k, Number(ctx.lookup(v)?.asNumber?.() ?? 0)));
                i += 2;
              } else {
                const lo = Number(arr[i]?.asNumber?.() ?? 0), hi = Number(next?.asNumber?.() ?? 0);
                const val = Number(arr[i + 2]?.asNumber?.() ?? 0);
                for (let c = lo; c <= hi && c - lo < 65536; c += 1) widths.set(c, val);
                i += 3;
              }
            }
            info.cidWidths = widths;
          }
        }
      } catch { /* fall back to /DW */ }
    } else {
      try {
        info.firstChar = Number(fd.get(PDFName.of("FirstChar"))?.asNumber?.() ?? 0);
        const w = fd.lookupMaybe(PDFName.of("Widths"), PDFArray);
        if (w) info.widths = w.asArray().map((n) => Number(ctx.lookup(n)?.asNumber?.() ?? 0));
        const descriptor = fd.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
        info.missingWidth = Number(descriptor?.get(PDFName.of("MissingWidth"))?.asNumber?.() ?? 0);
      } catch { /* defaults */ }
    }
    out.set(key.asString().replace(/^\//, ""), info);
  }
  return out;
}

const UNMAPPED = "�";

function decodeShownString(font, raw) {
  const glyphs = [];
  if (font?.twoByte) {
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
      const ch = font.toUnicode?.get(code);
      glyphs.push({
        code, char: ch ?? UNMAPPED, decoded: ch !== undefined,
        width: font.cidWidths?.get(code) ?? font.defaultWidth
      });
    }
    return glyphs;
  }
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    const ch = font?.toUnicode?.get(code) ?? String.fromCharCode(code);
    let width;
    if (font?.widths && code >= font.firstChar && code - font.firstChar < font.widths.length) {
      width = font.widths[code - font.firstChar];
    } else width = font?.missingWidth || 500;
    glyphs.push({ code, char: ch, decoded: true, width });
  }
  return glyphs;
}

const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]
];

function readLiteralString(src, i) {
  let depth = 1, out = "";
  i += 1;
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
    if (ch === "(") { depth += 1; out += ch; i += 1; continue; }
    if (ch === ")") { depth -= 1; if (depth > 0) out += ch; i += 1; continue; }
    out += ch; i += 1;
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
    if (ch === "%") { while (i < src.length && src[i] !== "\n") i += 1; continue; }
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === "(") { const [s, ni] = readLiteralString(src, i); tokens.push({ t: "str", v: s }); i = ni; continue; }
    if (ch === "<" && src[i + 1] !== "<") { const [s, ni] = readHexString(src, i); tokens.push({ t: "str", v: s }); i = ni; continue; }
    if (ch === "<" && src[i + 1] === "<") { tokens.push({ t: "op", v: "<<" }); i += 2; continue; }
    if (ch === ">" && src[i + 1] === ">") { tokens.push({ t: "op", v: ">>" }); i += 2; continue; }
    if (ch === "[" || ch === "]") { tokens.push({ t: "op", v: ch }); i += 1; continue; }
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
    i += 1;
  }
  return tokens;
}

const MAX_XOBJECT_DEPTH = 12;

function walkContent(src, resources, ctx, baseCtm, depth, sink) {
  const tokens = tokenize(src);
  const fonts = loadFonts(resources, ctx);
  let ctm = baseCtm.slice();
  const gstack = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0];
  let font = null, fontSize = 0, leading = 0, charSpace = 0, wordSpace = 0, hScale = 1;
  const operands = [];
  let pendingRects = [];

  const show = (raw) => {
    if (!raw) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[0], m[1]) || 1;
    const glyphs = decodeShownString(font, raw);
    const chars = [];
    let cursor = 0;
    for (const g of glyphs) {
      const advance = ((g.width / 1000) * fontSize + charSpace
        + (g.code === 32 && !font?.twoByte ? wordSpace : 0)) * hScale;
      chars.push({
        c: g.char, decoded: g.decoded,
        x: Number((m[4] + cursor * scale).toFixed(2)), w: Number((advance * scale).toFixed(2))
      });
      cursor += advance;
    }
    sink.text.push({
      text: glyphs.map((g) => g.char).join(""),
      x: m[4], y: m[5],
      size: Number((fontSize * scale).toFixed(2)),
      width: Number((cursor * scale).toFixed(2)),
      fullyDecoded: glyphs.every((g) => g.decoded),
      chars
    });
    tm = mul([1, 0, 0, 1, cursor, 0], tm);
  };

  for (const tk of tokens) {
    if (tk.t !== "op") { operands.push(tk); continue; }
    const n = (k) => { const v = operands[operands.length - k]; return v && v.t === "num" ? v.v : 0; };
    switch (tk.v) {
      case "q": gstack.push(ctm.slice()); break;
      case "Q": ctm = gstack.pop() ?? ctm; break;
      case "cm": ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm); break;
      case "BT": tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); break;
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
      case "'": case '"':
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice();
        show(operands[operands.length - 1]?.v);
        break;
      case "TJ": {
        let open = -1;
        for (let k = operands.length - 1; k >= 0; k -= 1) {
          if (operands[k].t === "op" && operands[k].v === "[") { open = k; break; }
        }
        if (open >= 0) {
          for (let k = open + 1; k < operands.length; k += 1) {
            const el = operands[k];
            if (el.t === "str") show(el.v);
            else if (el.t === "num") tm = mul([1, 0, 0, 1, -el.v / 1000 * fontSize * hScale, 0], tm);
          }
        }
        break;
      }
      case "re": {
        const x = n(4), y = n(3), w = n(2), h = n(1);
        const p1 = [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
        const p2 = [ctm[0] * (x + w) + ctm[2] * (y + h) + ctm[4], ctm[1] * (x + w) + ctm[3] * (y + h) + ctm[5]];
        pendingRects.push({
          x: Math.min(p1[0], p2[0]), y: Math.min(p1[1], p2[1]),
          width: Math.abs(p2[0] - p1[0]), height: Math.abs(p2[1] - p1[1])
        });
        break;
      }
      // A path is only a rule once it is painted. Clipping paths (`W n`) use the
      // same `re` operator and describe no ink at all, so an unpainted path is
      // discarded rather than measured.
      case "f": case "F": case "f*": case "B": case "B*": case "S": case "s":
        for (const r of pendingRects) sink.rects.push({ ...r, paint: tk.v });
        pendingRects = [];
        break;
      case "n": pendingRects = []; break;
      case "Do": {
        if (depth >= MAX_XOBJECT_DEPTH) break;
        const nameTok = [...operands].reverse().find((o) => o.t === "name");
        if (!nameTok || !resources) break;
        try {
          const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
          const xo = xobjects ? ctx.lookup(xobjects.get(PDFName.of(nameTok.v))) : null;
          if (!(xo instanceof PDFRawStream)) break;
          if (String(xo.dict.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "") !== "Form") break;
          const matrixArr = xo.dict.lookupMaybe(PDFName.of("Matrix"), PDFArray);
          const matrix = matrixArr
            ? matrixArr.asArray().map((v) => Number(ctx.lookup(v)?.asNumber?.() ?? v?.asNumber?.() ?? 0))
            : [1, 0, 0, 1, 0, 0];
          const inner = xo.dict.lookupMaybe(PDFName.of("Resources"), PDFDict) ?? resources;
          walkContent(
            Buffer.from(decodePDFRawStream(xo).decode()).toString("latin1"),
            inner, ctx, mul(matrix, ctm), depth + 1, sink
          );
        } catch { /* an unreadable XObject contributes nothing */ }
        break;
      }
      default: break;
    }
    // `[`, `]` and the clip operators must not flush the operand stack the
    // operator after them is about to read.
    if (["[", "]", "W", "W*"].includes(tk.v)) operands.push(tk);
    else operands.length = 0;
  }
}

function capturePage(page) {
  const sink = { text: [], rects: [] };
  walkContent(contentStringOf(page), page.node.Resources?.(), page.node.context, [1, 0, 0, 1, 0, 0], 0, sink);
  return sink;
}

function groupIntoLines(items, yTolerance = 2.2) {
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
      fullyDecoded: sorted.every((i) => i.fullyDecoded),
      chars: sorted.flatMap((i) => i.chars ?? [])
    };
  }).filter((l) => l.text.trim().length > 0);
}

// A caption is a run of glyphs on one baseline with no wide gap in it.
//
// The gap has to be measured between *inked* glyphs. These forms lay a caption
// out by emitting space glyphs across the whole column rather than by moving
// the text cursor, so a header reading "Signature of Requester ... Date" is one
// unbroken glyph stream whose individual gaps are all a space wide -- two
// captions that look separated by an inch and measure as adjacent. Skipping
// spaces when measuring separates them and leaves ordinary word spacing alone.
function captionsOnLine(line) {
  const out = [];
  const splitThreshold = Math.max(6, (line.size || 9) * 1.2);
  let current = null;
  let lastInked = null;
  for (const ch of line.chars) {
    const inked = ch.c.trim().length > 0;
    if (inked && lastInked) {
      const gap = ch.x - (lastInked.x + lastInked.w);
      if (gap > splitThreshold) { out.push(current); current = null; }
    }
    if (!current) current = { x: ch.x, x2: ch.x + ch.w, text: "", decoded: true };
    current.text += ch.c;
    if (inked) {
      current.x2 = ch.x + ch.w;
      current.decoded = current.decoded && ch.decoded;
      lastInked = ch;
    }
  }
  if (current) out.push(current);
  // A caption's extent has to be measured from its ink. Trailing space glyphs
  // carry a real advance, so leaving them in pushed "Case No." 31pt to the
  // right of where it stops being visible and put its own rule out of reach.
  return out
    .map((c) => trimCaption(c, line))
    .filter(Boolean);
}

function trimCaption(caption, line) {
  const glyphs = line.chars.filter((ch) => ch.x >= caption.x - 0.01 && ch.x <= caption.x2 + 0.01);
  const inked = glyphs.filter((ch) => ch.c.trim().length > 0);
  if (inked.length === 0) return null;
  const first = inked[0], last = inked[inked.length - 1];
  const text = caption.text.replace(/\s+/g, " ").trim();
  if (text.length === 0) return null;
  return {
    text, y: line.y, size: line.size,
    x: Number(first.x.toFixed(2)),
    x2: Number((last.x + last.w).toFixed(2)),
    decoded: inked.every((ch) => ch.decoded)
  };
}

// =============================================================================
// overlay caption gate
// =============================================================================
//
// Strictly narrower than D0's binder, and deliberately so. An overlay writes at
// a coordinate rather than into a named box, so a caption that could name more
// than one thing is not a near miss -- it is a value landing somewhere nobody
// checked. Every entry here is anchored at both ends against the caption a
// document actually prints.
//
// Everything this list does not match is recorded as an unanchored rule and
// left blank. That is the intended outcome for most rules on most forms.

// Refused before any allow rule is consulted. These describe a person who is
// not the participant, a fact the participant does not supply, or an
// identifier that must never be machine-written.
const CAPTION_DENY = [
  ["second_party", /\bsubject'?s?\b|\bsubject\b|if\s*different|\balias\b|\bmaiden\b|\bother\s*names?\b|\baka\b|\bspouse\b|\bdependent\b/i],
  ["government_identifier", /\bssn\b|social\s*security|driver'?s?\s*licen[cs]e|\bdl\s*(no|num)|\bsid\b|\bwiupin\b|\bupin\b|state\s*id|\bfbi\b|\boln\b|\bfingerprint/i],
  ["conditional_caption", /\(\s*if\s|\bif\s*available\b|\bif\s*any\b|\bif\s*applicable\b|\bif\s*known\b|\bwhere\s*applicable\b/i],
  ["court_or_agency", /\bcourt\s*use\b|\bfor\s*office\b|\bagency\b|\bclerk\b|\bjudge\b|\bhearing\b|\bordered\b|\bgranted\b|\bdenied\b|\bdistrib/i],
  ["election_or_narrative", /\bexplanation\b|\bother\s*:?\s*$|\breason\b|\bdescribe\b|\bcheck\s*(one|all|box)\b|\bcharge\s*&\s*disposition\b/i],
  ["not_a_participant_fact", /\bgender\b|\bsex\b|\bheight\b|\bweight\b|\beyes?\b|\bhair\b|\bwitness\b|\bemployer\b/i]
];

// Allowed captions, most specific first. Each is a whole-caption match after
// trailing punctuation and parenthetical format hints are stripped, so a
// caption has to *be* the label rather than merely contain it.
const CAPTION_ALLOW = [
  [/^(defendant|petitioner|applicant|movant|requester)(’|')?s?(\s*(full\s*)?name)?$/i, "participant.full_legal_name"],
  [/^name\s*printed\s*or\s*typed$/i, "participant.full_legal_name"],
  [/^(printed\s*name|full\s*(legal\s*)?name|your\s*name|name\s*of\s*(petitioner|defendant|applicant))$/i, "participant.full_legal_name"],
  [/^(requester|petitioner|defendant|applicant)?\s*(’|')?s?\s*name$/i, "participant.full_legal_name"],
  [/^(date\s*of\s*birth|dob|birth\s*date)$/i, "participant.date_of_birth"],
  [/^(case|docket|file)\s*(no|number|#)$/i, "matter.case_number"],
  [/^county$/i, "matter.county"],
  [/^(requester|petitioner|defendant|applicant)?\s*(’|')?s?\s*(street\s+|mailing\s+)?address$/i, "participant.street_address"],
  [/^(requester|petitioner|defendant|applicant)?\s*(’|')?s?\s*city\s*,?\s*state\s*,?\s*zip(\s*code)?$/i, "participant.city_state_zip"],
  [/^city$/i, "participant.city"],
  [/^zip(\s*code)?$/i, "participant.zip"],
  [/^(requester|petitioner|defendant|applicant)?\s*(’|')?s?\s*(tele)?phone(\s*(no|number))?$/i, "participant.phone"],
  [/^(requester|petitioner|defendant|applicant)?\s*(’|')?s?\s*e-?mail(\s*address)?$/i, "participant.email"],
  [/^date$/i, "deterministic.filing_date"]
];

// Format hints and list-of-parts hints are presentation, not meaning: "Date of
// Birth (mm/dd/yy)" and "Requester Name (Last, First, Middle, Suffix)" name the
// same facts their unadorned forms do.
function normalizeCaption(raw) {
  return String(raw)
    .replace(/\((?:[^()]*(?:mm|dd|yy|last|first|middle|suffix|print|type)[^()]*)\)/gi, " ")
    // A printed rule drawn as underscores belongs to the blank, not to its name.
    .replace(/_{3,}/g, " ")
    .replace(/^[\s:.*•]+/, "")
    .replace(/[:.•*\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Whether a measured run of text is a caption at all.
//
// Measurement finds the nearest text, which on a dense form is often a clause
// out of the surrounding prose rather than a label: Nebraska's DC-1-15 puts
// "_______ County, Courtroom No. ____ on the ____ floor of the" next to three
// widgets, and its CC-6-11 puts "receive emails. The reason I cannot receive
// email is" next to a narrative box. Both contain a word an allowlisted
// descriptor matches, and binding either one writes a participant fact into the
// middle of a sentence. A caption is short, self-contained and not a fragment
// of something longer.
const MAX_CAPTION_WORDS = 7;
const MAX_CAPTION_CHARS = 44;

function looksLikeCaption(raw) {
  // A blank with words after it is a sentence with a gap in it, not a label.
  // "Name: ______" is a caption; "______ County Courthouse or Justice Center,
  // ______" is the middle of a hearing-location sentence.
  if (/_{3,}\s*\S/.test(String(raw))) return false;
  const caption = normalizeCaption(raw);
  if (caption.length === 0 || caption.length > MAX_CAPTION_CHARS) return false;
  if (caption.split(/\s+/).length > MAX_CAPTION_WORDS) return false;
  // Mid-string sentence punctuation means this is running prose that happened
  // to be cut here, not a label.
  if (/[.;?!]\s+\S/.test(caption)) return false;
  if (/^(and|or|the|of|to|in|on|for|that|is|are|was|were|if|because)\b/i.test(caption)) return false;
  return true;
}

// Places where the shared descriptor list resolves a label to the wrong fact.
//
// FACT_DESCRIPTORS is ordered most-specific-first and `matches[0]` wins, which
// is how "City, State, Zip" correctly resolves to the compound descriptor
// rather than to city. But `participant.street_address` carries /\baddress\b/
// and is listed above `participant.email`, so every field captioned "Email
// Address" -- and there are eight across Vermont and Nebraska -- resolves to
// the street address and would have the participant's home address written
// into the email box.
//
// The list is shared and this lane does not edit it, so the mis-resolution is
// refused rather than redirected: writing nothing is correct, writing the wrong
// participant fact is not. Each refusal is recorded so the descriptor ordering
// can be fixed once, upstream, for every lane at the same time.
const DESCRIPTOR_MISRESOLUTION = [
  [/\be-?mail\b/i, "participant.email"],
  [/\b(tele)?phone\b/i, "participant.phone"]
];

function misresolvedFact(label, factId) {
  for (const [token, expected] of DESCRIPTOR_MISRESOLUTION) {
    if (token.test(label) && factId !== expected) return expected;
  }
  return null;
}

// Captions in this corpus are drawn glyph by glyph with kerning offsets, and a
// wide enough offset reads back as a space inside a word -- Wisconsin's CR-267
// prints "Date of B irth". Matching a de-spaced variant as well as the literal
// one absorbs that without loosening what the patterns accept, because every
// pattern is anchored at both ends and the words themselves are unchanged.
function captionFact(rawCaption) {
  const caption = normalizeCaption(rawCaption);
  if (caption.length < 3) return { factId: null, reason: "caption_too_short", caption };

  // D0's protect rules come first: they decide the category, and a caption they
  // claim is refused whatever this lane's own lists would have said.
  const protectedAs = protectCategoryOf(caption);
  if (protectedAs) return { factId: null, reason: "protected_category", category: protectedAs, caption };

  for (const [category, re] of CAPTION_DENY) {
    if (re.test(caption)) return { factId: null, reason: "caption_denied", category, caption };
  }

  const variants = [caption, caption.replace(/(?<=\w) (?=\w)/g, "")];
  for (const [re, factId] of CAPTION_ALLOW) {
    if (variants.some((v) => re.test(v))) return { factId, reason: "caption_allowed", caption };
  }
  return { factId: null, reason: "caption_not_allowlisted", caption };
}

// A blank in a printed sentence is sometimes named by the words that follow it
// rather than the words before: "CIRCUIT COURT, ______ COUNTY". Only captions
// whose trailing form is unambiguous on its own are listed.
const TRAILING_CAPTION_ALLOW = [
  [/^county[,.]?$/i, "matter.county"]
];

function trailingCaptionFact(rawCaption) {
  const caption = normalizeCaption(rawCaption);
  if (protectCategoryOf(caption)) return null;
  for (const [category, re] of CAPTION_DENY) if (re.test(caption)) return null;
  for (const [re, factId] of TRAILING_CAPTION_ALLOW) if (re.test(caption)) return factId;
  return null;
}

// =============================================================================
// anchors measured from painted rules
// =============================================================================
//
// Three conventions appear across these four Wisconsin forms, and which one a
// rule follows decides which side of it the value goes on. Guessing wrong does
// not produce a slightly-off overlay; it puts the value in a different box. So
// the convention is determined from geometry, never from the form's identity:
//
//   cell     the rule is the top edge of a boxed cell -- vertical rules stand
//            at both its ends and hang downward. The caption sits just inside
//            the top edge and the participant writes BELOW it, within the box.
//   beneath  a free-standing rule with its caption printed under it. The
//            participant writes ON the rule, so the value goes ABOVE it.
//   inline   the caption shares the rule's baseline, and the rule is the blank
//            in a printed sentence. The value goes above the rule.
//
// The cell and beneath cases are otherwise indistinguishable -- both are a rule
// with a caption a few points below it -- and the difference between them is
// exactly the difference between writing inside the box and writing in the row
// above it. Vertical enclosure is what separates them, and it is measured.
//
// A rule matching no convention is recorded unanchored. Nothing is written.

const RULE_MAX_HEIGHT = 3;
const RULE_MIN_WIDTH = 24;
const BENEATH_MIN_DROP = 3.5;
const BENEATH_MAX_DROP = 11;
const INLINE_MAX_RISE = 4.5;
const INLINE_MAX_GAP = 26;
const VERTICAL_MAX_WIDTH = 3.5;
const VERTICAL_MIN_HEIGHT = 8;
const CORNER_TOLERANCE = 4;
const CELL_MIN_WRITE_HEIGHT = 7;

function measureAnchors(pages) {
  const anchors = [];
  const unanchored = [];
  const pageSummaries = [];

  for (let pi = 0; pi < pages.length; pi += 1) {
    const { text, rects } = capturePage(pages[pi]);
    const lines = groupIntoLines(text);
    const rules = rects
      .filter((r) => r.height <= RULE_MAX_HEIGHT && r.width >= RULE_MIN_WIDTH)
      // A full-bleed horizontal line is a table border or a page rule, never an
      // answer blank.
      .filter((r) => r.width < pages[pi].getWidth() * 0.9)
      .map((r) => ({
        x: Number(r.x.toFixed(1)), y: Number(r.y.toFixed(1)),
        x2: Number((r.x + r.width).toFixed(1)),
        width: Number(r.width.toFixed(1)), height: Number(r.height.toFixed(2))
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    // Two rules drawn at the same place (a doubled hairline) are one rule.
    const deduped = [];
    for (const rule of rules) {
      const twin = deduped.find((d) => Math.abs(d.y - rule.y) <= 1.2
        && Math.abs(d.x - rule.x) <= 1.2 && Math.abs(d.x2 - rule.x2) <= 1.2);
      if (!twin) deduped.push(rule);
    }

    const verticals = rects
      .filter((r) => r.width <= VERTICAL_MAX_WIDTH && r.height >= VERTICAL_MIN_HEIGHT)
      .map((r) => ({
        cx: Number((r.x + r.width / 2).toFixed(1)),
        bottom: Number(r.y.toFixed(1)),
        top: Number((r.y + r.height).toFixed(1))
      }));

    pageSummaries.push({
      page: pi + 1, textLines: lines.length,
      fullyDecodedLines: lines.filter((l) => l.fullyDecoded).length,
      paintedRects: rects.length, candidateRules: deduped.length,
      verticalRules: verticals.length
    });

    // A table draws the boundary between two rows as two hairlines a couple of
    // points apart, and both of them resolve to the same cell below. Keyed on
    // the resolved geometry, that is one column, not two.
    const seenColumns = new Set();

    for (const rule of deduped) {
      const columns = columnsForRule(rule, lines, verticals);
      if (columns.length === 0) {
        unanchored.push({ page: pi + 1, rule, reason: "no_caption_adjacent_to_rule" });
        continue;
      }
      for (const column of columns) {
        const geometryKey = [
          column.kind, Math.round(column.x), Math.round(column.x2),
          Math.round(column.cellBottom ?? column.captionY)
        ].join(":");
        if (seenColumns.has(geometryKey)) continue;
        seenColumns.add(geometryKey);
        const decision = column.factId
          ? { factId: column.factId, reason: "trailing_caption_allowed", caption: column.caption }
          : captionFact(column.caption);
        const fontSize = Math.max(7, Math.min(10, column.captionSize || 9));
        // Where the value goes is a property of the convention, not a constant.
        // On a free rule it sits on top of the line; inside a cell it sits in
        // the empty space the caption leaves below itself.
        const writeBox = column.kind === "boxed_cell_caption_at_top"
          ? {
              x: Number((column.x + 2).toFixed(1)),
              y: Number((column.cellBottom + 3).toFixed(1)),
              width: Number((column.x2 - column.x - 4).toFixed(1)),
              height: Number(Math.min(fontSize * 1.25, column.captionY - 2 - (column.cellBottom + 3)).toFixed(1))
            }
          : {
              x: Number((column.x + 2).toFixed(1)),
              y: Number((rule.y + 2).toFixed(1)),
              width: Number((column.x2 - column.x - 4).toFixed(1)),
              height: Number((fontSize * 1.25).toFixed(1))
            };
        const shared = {
          page: pi + 1, kind: column.kind, rule,
          caption: column.caption, captionFullyDecoded: column.decoded,
          captionOrigin: { x: column.captionX, y: column.captionY, size: column.captionSize },
          cellBottom: column.cellBottom ?? null,
          writeBox,
          measurement: {
            ruleMeasuredFromPaintedRect: true,
            columnBoundsMeasuredFrom: column.columnBoundsBasis,
            verticalEnclosureMeasured: column.kind === "boxed_cell_caption_at_top",
            noCoordinateInferred: true
          }
        };
        if (writeBox.height < CELL_MIN_WRITE_HEIGHT) {
          unanchored.push({ ...shared, reason: "write_area_shorter_than_minimum_readable_line" });
          continue;
        }
        if (!decision.factId || writeBox.width < RULE_MIN_WIDTH) {
          unanchored.push({
            ...shared,
            reason: writeBox.width < RULE_MIN_WIDTH ? "column_narrower_than_minimum" : decision.reason,
            category: decision.category ?? null
          });
          continue;
        }
        // A caption carrying a glyph the font never mapped cannot be read with
        // certainty, so it names nothing and is left blank.
        if (!column.decoded) {
          unanchored.push({ ...shared, reason: "caption_contains_unmapped_glyphs" });
          continue;
        }
        anchors.push({ ...shared, label: decision.caption, factId: decision.factId, fontSize });
      }
    }
  }

  // One anchor per fact per page: a repeated caption is the same blank twice,
  // and writing both would duplicate the value.
  const seen = new Set();
  const deduplicated = [];
  for (const anchor of anchors) {
    const key = `${anchor.page}:${anchor.factId}`;
    if (seen.has(key)) {
      unanchored.push({ ...anchor, reason: "duplicate_fact_on_page_first_occurrence_wins" });
      continue;
    }
    seen.add(key);
    deduplicated.push(anchor);
  }
  return { anchors: deduplicated, unanchored, pageSummaries };
}

// A rule is the top edge of a boxed cell when vertical rules stand at both of
// its ends and descend from it. Their lower ends give the cell floor, and any
// vertical between them divides the cell into columns whose bounds are drawn
// rather than inferred from where a caption happens to start.
function cellUnder(rule, verticals) {
  const atTop = verticals.filter((v) => Math.abs(v.top - rule.y) <= CORNER_TOLERANCE && v.bottom < rule.y - 2);
  const left = atTop.filter((v) => Math.abs(v.cx - rule.x) <= CORNER_TOLERANCE)
    .sort((a, b) => a.bottom - b.bottom)[0];
  const right = atTop.filter((v) => Math.abs(v.cx - rule.x2) <= CORNER_TOLERANCE)
    .sort((a, b) => a.bottom - b.bottom)[0];
  if (!left || !right) return null;
  const interior = atTop
    .filter((v) => v.cx > rule.x + CORNER_TOLERANCE && v.cx < rule.x2 - CORNER_TOLERANCE)
    .map((v) => v.cx)
    .sort((a, b) => a - b);
  return { bottom: Math.max(left.bottom, right.bottom), dividers: interior };
}

// The mirror of cellUnder: verticals that rise from a rule mean the rule closes
// a box from below. A cell floor is a border, never a line anyone writes on,
// and treating one as an answer rule would put the value inside the box above
// it -- on top of that box's own caption.
function closesCellAbove(rule, verticals) {
  const atBottom = verticals.filter((v) => Math.abs(v.bottom - rule.y) <= CORNER_TOLERANCE && v.top > rule.y + 2);
  const left = atBottom.some((v) => Math.abs(v.cx - rule.x) <= CORNER_TOLERANCE);
  const right = atBottom.some((v) => Math.abs(v.cx - rule.x2) <= CORNER_TOLERANCE);
  return left && right;
}

function columnsForRule(rule, lines, verticals) {
  const cell = cellUnder(rule, verticals);
  if (!cell && closesCellAbove(rule, verticals)) return [];

  // Cell: the caption sits inside the top edge and the value goes under it.
  if (cell) {
    const captionLine = lines
      .filter((l) => l.y > cell.bottom && l.y < rule.y && rule.y - l.y <= BENEATH_MAX_DROP)
      .sort((a, b) => (rule.y - a.y) - (rule.y - b.y))[0];
    if (!captionLine) return [];
    const bounds = [rule.x, ...cell.dividers, rule.x2];
    const captions = captionsOnLine(captionLine);
    const columns = [];
    for (let i = 0; i + 1 < bounds.length; i += 1) {
      const from = bounds[i], to = bounds[i + 1];
      const inColumn = captions
        .filter((c) => c.x >= from - 2 && c.x < to)
        .sort((a, b) => a.x - b.x);
      if (inColumn.length === 0) continue;
      // Several captions inside one drawn column subdivide it themselves; with
      // no divider drawn, the next caption's start is the only measured bound.
      for (let k = 0; k < inColumn.length; k += 1) {
        const caption = inColumn[k];
        columns.push({
          kind: "boxed_cell_caption_at_top",
          caption: caption.text, decoded: caption.decoded,
          captionX: caption.x, captionY: caption.y, captionSize: caption.size,
          cellBottom: cell.bottom,
          x: Math.max(from, caption.x),
          x2: k + 1 < inColumn.length ? Math.min(to, inColumn[k + 1].x - 2) : to,
          columnBoundsBasis: cell.dividers.length > 0
            ? "vertical_rules_and_caption_extents" : "caption_extents_within_cell"
        });
      }
    }
    return columns;
  }

  // Beneath: a free rule with its caption printed under it.
  const beneath = lines
    .filter((l) => rule.y - l.y >= BENEATH_MIN_DROP && rule.y - l.y <= BENEATH_MAX_DROP)
    .sort((a, b) => (rule.y - a.y) - (rule.y - b.y))[0];
  if (beneath) {
    const captions = captionsOnLine(beneath)
      .filter((c) => c.x >= rule.x - 4 && c.x <= rule.x2)
      .sort((a, b) => a.x - b.x);
    if (captions.length > 0) {
      return captions.map((caption, i) => ({
        kind: "rule_with_caption_beneath",
        caption: caption.text, decoded: caption.decoded,
        captionX: caption.x, captionY: caption.y, captionSize: caption.size,
        x: Math.max(rule.x, caption.x),
        x2: i + 1 < captions.length ? Math.min(rule.x2, captions[i + 1].x - 2) : rule.x2,
        columnBoundsBasis: "caption_extents"
      }));
    }
  }

  // Inline: the caption shares the rule's baseline, before it or after it.
  const inline = lines
    .filter((l) => l.y - rule.y >= 0 && l.y - rule.y <= INLINE_MAX_RISE)
    .sort((a, b) => (a.y - rule.y) - (b.y - rule.y))[0];
  if (inline) {
    const onLine = captionsOnLine(inline);
    const before = onLine
      .filter((c) => c.x2 <= rule.x + 2 && rule.x - c.x2 <= INLINE_MAX_GAP)
      .sort((a, b) => b.x2 - a.x2)[0];
    const after = onLine
      .filter((c) => c.x >= rule.x2 - 2 && c.x - rule.x2 <= INLINE_MAX_GAP)
      .sort((a, b) => a.x - b.x)[0];
    const trailingFact = after ? trailingCaptionFact(after.text) : null;

    // Words before the blank name it when they can. "CIRCUIT COURT, ______
    // COUNTY" is the case where they cannot and the word after it does.
    if (before && captionFact(before.text).factId) {
      return [{
        kind: "inline_rule_blank",
        caption: before.text, decoded: before.decoded,
        captionX: before.x, captionY: before.y, captionSize: before.size,
        x: rule.x, x2: rule.x2, columnBoundsBasis: "rule_extents"
      }];
    }
    if (after && trailingFact) {
      return [{
        kind: "inline_rule_blank_named_by_trailing_word",
        caption: after.text, decoded: after.decoded, factId: trailingFact,
        captionX: after.x, captionY: after.y, captionSize: after.size,
        x: rule.x, x2: rule.x2, columnBoundsBasis: "rule_extents"
      }];
    }
    if (before) {
      return [{
        kind: "inline_rule_blank",
        caption: before.text, decoded: before.decoded,
        captionX: before.x, captionY: before.y, captionSize: before.size,
        x: rule.x, x2: rule.x2, columnBoundsBasis: "rule_extents"
      }];
    }
  }
  return [];
}

// =============================================================================
// AcroForm label measurement
// =============================================================================
//
// Nebraska's CC-6-11, CC-6-12 and CC-6-15.1 and Vermont's petitions name their
// widgets positionally -- "Text5", "1", "23" -- so the field name carries no
// meaning and the printed label beside the widget carries all of it. The label
// is measured rather than guessed, and it is only consulted where the name is
// genuinely uninformative: a field called `citystatezip` already says what it
// is, and replacing that with whatever text happens to sit nearest would be a
// downgrade.
//
// D0 re-applies its protect rules to whatever label this produces, so a
// measured label can only ever narrow what may be written.

const OPAQUE_FIELD_NAME = /^\s*(?:text|field|untitled|blank|fill|check\s*box|checkbox|button|group|radio)?\s*\d+[a-z]?\s*$/i;

function measureWidgetLabel(rect, pageCapture) {
  if (!rect) return null;
  const lines = groupIntoLines(pageCapture.text);
  const midY = rect.y + rect.height / 2;
  const candidates = [];

  for (const line of lines) {
    for (const caption of captionsOnLine(line)) {
      if (caption.text.length < 3) continue;
      // Left, on the widget's own band.
      if (line.y >= rect.y - 3 && line.y <= rect.y + rect.height + 1
        && caption.x2 <= rect.x + 2 && rect.x - caption.x2 <= 40) {
        candidates.push({ ...caption, position: "left", distance: rect.x - caption.x2 });
      }
      // Beneath, the parenthetical-caption convention Nebraska uses.
      if (line.y < rect.y && rect.y - line.y <= 16
        && caption.x2 > rect.x - 30 && caption.x < rect.x + rect.width + 30) {
        candidates.push({ ...caption, position: "beneath", distance: (rect.y - line.y) + 2 });
      }
      // Above, last resort.
      if (line.y > rect.y + rect.height && line.y - (rect.y + rect.height) <= 12
        && caption.x2 > rect.x - 30 && caption.x < rect.x + rect.width + 30) {
        candidates.push({ ...caption, position: "above", distance: (line.y - rect.y - rect.height) + 6 });
      }
    }
  }
  if (candidates.length === 0) return null;
  const best = candidates.sort((a, b) => a.distance - b.distance)[0];
  if (!best.decoded) {
    return { text: null, rejected: "label_contains_unmapped_glyphs", raw: best.text, position: best.position };
  }
  const stripped = best.text.replace(/^[(\s]+|[)\s]+$/g, "");
  const text = normalizeCaption(stripped);
  if (text.length < 3) return null;
  const usable = looksLikeCaption(stripped);
  return {
    text: usable ? text : null,
    rejected: usable ? undefined : "measured_text_is_prose_not_a_caption",
    raw: text,
    position: best.position, distance: Number(best.distance.toFixed(1)),
    captionX: best.x, captionY: best.y, midY: Number(midY.toFixed(1))
  };
}

// =============================================================================
// document ownership
// =============================================================================

const OWNERSHIP = {
  INSTRUCTIONAL: "instructional_no_participant_fill",
  OUTSIDE_PARTY: "outside_party_completed",
  COURT_ORDER: "court_issued_caption_only",
  PARTICIPANT: "participant_completed"
};

// The manifest's `document_role` decides this, not the filename.
//
// Reading the filename gets it wrong in exactly the cases that matter most.
// Wisconsin's CR-267 is "Order on Petition to Expunge", Nebraska's DC-6-7.2 is
// "Order to Proceed In Forma Pauperis", and Vermont's 200-00631 is "Request for
// Sealing Order": every one of them is a court-issued order whose filename
// contains a participant-filing word, and a filename-first reading hands the
// participant binder a document only a judge completes. The manifest is the
// identity authority for this corpus, so the declared role governs and the
// filename is consulted only when no role is declared.
const ROLE_OWNERSHIP = {
  INSTRUCTIONS: OWNERSHIP.INSTRUCTIONAL,
  RESPONSE: OWNERSHIP.OUTSIDE_PARTY,
  ORDER: OWNERSHIP.COURT_ORDER,
  NOTICE: OWNERSHIP.COURT_ORDER,
  JUDGMENT: OWNERSHIP.COURT_ORDER,
  PETITION: OWNERSHIP.PARTICIPANT,
  MOTION: OWNERSHIP.PARTICIPANT,
  APPLICATION: OWNERSHIP.PARTICIPANT,
  AFFIDAVIT: OWNERSHIP.PARTICIPANT,
  PACKET: OWNERSHIP.PARTICIPANT,
  RECORD_REQUEST: OWNERSHIP.PARTICIPANT,
  FEE_WAIVER: OWNERSHIP.PARTICIPANT
};

function determineOwnership(record, fileSlug) {
  if (record.asset_class === "instructions") {
    return { ownership: OWNERSHIP.INSTRUCTIONAL, basis: "manifest_asset_class_instructions" };
  }
  const declared = ROLE_OWNERSHIP[String(record.document_role ?? "").trim().toUpperCase()];
  if (declared) return { ownership: declared, basis: `manifest_document_role_${record.document_role}` };

  const signal = `${record.asset_class} ${fileSlug} ${record.official_title}`.toLowerCase();
  if (/instructions?|completing\s*the|how\s*to\s*(file|complete)/.test(signal)) {
    return { ownership: OWNERSHIP.INSTRUCTIONAL, basis: "filename_fallback_no_declared_role" };
  }
  if (/response\s*to\s*petition|objection\s*to\s*petition/.test(signal)) {
    return { ownership: OWNERSHIP.OUTSIDE_PARTY, basis: "filename_fallback_no_declared_role" };
  }
  if (/\border\b|judgment|decree|notice\s*of\s*hearing/.test(signal)) {
    return { ownership: OWNERSHIP.COURT_ORDER, basis: "filename_fallback_no_declared_role" };
  }
  return { ownership: OWNERSHIP.PARTICIPANT, basis: "filename_fallback_no_declared_role" };
}

// =============================================================================
// explicit mappings
// =============================================================================
//
// D0 refuses arrest, offense, conviction and disposition dates and the charge
// text on a name match alone: they describe the criminal event, and a wrong
// value misstates the record to a court. The caller may name a specific field
// for a specific fact, which is the sanctioned way through, and this table is
// where every such decision is written down with its reason.
//
// An explicit mapping cannot defeat a protect rule -- D0 checks those first --
// so nothing here can reach a court, clerk, agency or signature field. Entries
// are keyed by state, document id and the exact field name read from the
// binary.
const EXPLICIT_MAPPINGS = {
  // Deliberately empty. The discovery pass over all 24 binaries recorded every
  // field D0 refused with `requires_explicit_mapping`; each one turned out to
  // sit behind a protect rule as well, or to be an undated narrative field, so
  // no mapping would have changed an outcome. `reports/explicit-mapping-
  // candidates.json` in each family carries that evidence.
};

function explicitMappingsFor(stateCode, documentId) {
  return EXPLICIT_MAPPINGS[`${stateCode}:${documentId}`] ?? {};
}

// =============================================================================
// fixtures
// =============================================================================
//
// The same fact sets the rest of the corpus renders, so a reviewer comparing
// two states is comparing the forms and not the test data. Values are visibly
// synthetic; none is a real person, court, county or case.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.last_name": "Reyes",
  "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "XX",
  "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142",
  "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County",
  "matter.court": "District Court",
  "matter.case_number": "24-CR-001234",
  "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance",
  "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08",
  "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    {
      case_number: "24-CR-001234", citation_number: "C-889201",
      charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08",
      conviction_date: "2019-11-02", disposition_date: "2020-01-15"
    }
  ]
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999",
  "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    {
      case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08",
      conviction_date: "2019-11-02", disposition_date: "2020-01-15"
    },
    {
      case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202",
      charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20",
      conviction_date: "2021-02-09", disposition_date: "2021-03-01"
    },
    {
      case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203",
      charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02",
      conviction_date: "2022-01-18", disposition_date: "2022-02-14"
    }
  ]
};

// =============================================================================
// census
// =============================================================================

function fieldTypeOf(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionlist";
  return "other";
}

function buildCensus(doc, pageCaptures) {
  const pages = doc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  let fields = [];
  try { fields = doc.getForm().getFields(); } catch { fields = []; }

  return fields.map((field) => {
    const type = fieldTypeOf(field);
    const widgets = (field.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pageRef = w.P?.()?.toString?.();
      const page = pageRef ? (pageIndexOf.get(pageRef) ?? null) : null;
      return {
        page,
        rect: r ? {
          x: Number(r.x.toFixed(1)), y: Number(r.y.toFixed(1)),
          width: Number(r.width.toFixed(1)), height: Number(r.height.toFixed(1))
        } : null
      };
    });
    const entry = { name: field.getName(), type, widgets };
    if (type === "text") {
      try { entry.maxLength = field.getMaxLength() ?? null; } catch { entry.maxLength = null; }
      try { entry.multiline = field.isMultiline?.() ?? false; } catch { entry.multiline = false; }
    }
    if (["dropdown", "optionlist", "radio"].includes(type)) {
      try { entry.options = field.getOptions(); } catch { entry.options = []; }
    }

    // What the field already holds in the source.
    //
    // Nebraska's caption line is not page content: "IN THE ___ COURT OF ___
    // COUNTY, NEBRASKA" is stored as the default value of four fields, which
    // the form's own script rewrites as the participant chooses a court and a
    // county. Writing a county into one of those fields does not fill a blank,
    // it deletes the printed caption and leaves the document reading "District
    // Court Example County COUNTY, NEBRASKA". Every NE form in this pack does
    // this, and DC-1-15 stores 28 such values.
    let sourceDefault = null;
    try {
      if (type === "text") sourceDefault = field.getText?.() ?? null;
      else if (type === "dropdown" || type === "optionlist") {
        const selected = field.getSelected?.();
        sourceDefault = Array.isArray(selected)
          ? (selected.length > 0 ? selected.join(" | ") : null)
          : (selected ?? null);
      }
    } catch { sourceDefault = null; }
    entry.sourceDefaultValue = sourceDefault && String(sourceDefault).trim() !== ""
      ? String(sourceDefault) : null;

    // The printed label, measured, for every field -- recorded always, used as
    // the binding subject only where the field name says nothing.
    const first = widgets.find((w) => w.rect && w.page);
    if (first) {
      const capture = pageCaptures[first.page - 1];
      const label = capture ? measureWidgetLabel(first.rect, capture) : null;
      if (label) entry.measuredLabel = label;
    }
    entry.nameIsOpaque = OPAQUE_FIELD_NAME.test(entry.name);
    if (entry.nameIsOpaque && entry.measuredLabel?.text) {
      entry.effectiveLabel = entry.measuredLabel.text;
      entry.effectiveLabelBasis = "measured_printed_label_positional_widget_name";
    }
    return entry;
  });
}

// =============================================================================
// cross-field geometry
// =============================================================================
//
// D0 judges one field at a time, which is the right unit for protection and the
// wrong unit for placement. Several of Nebraska's forms carry mirror fields:
// a dropdown, a hidden result box and a caption box that a script used to keep
// in step, all bound to the same fact and all drawn on top of one another.
// Stripping the script leaves each of them individually valid, and writing them
// all would stamp the same value three times in overlapping ink.
//
// Which of an overlapping group the court expects is not recoverable from the
// document once the script is gone, so the group is refused whole. Fail-closed
// on ambiguity is the same choice D0 makes everywhere else.
function findOverlapGroups(entries) {
  const groups = [];
  const overlaps = (a, b) => {
    if (a.page !== b.page) return false;
    const ax2 = a.rect.x + a.rect.width, ay2 = a.rect.y + a.rect.height;
    const bx2 = b.rect.x + b.rect.width, by2 = b.rect.y + b.rect.height;
    const ix = Math.min(ax2, bx2) - Math.max(a.rect.x, b.rect.x);
    const iy = Math.min(ay2, by2) - Math.max(a.rect.y, b.rect.y);
    if (ix <= 1 || iy <= 1) return false;
    const smaller = Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
    return smaller > 0 && (ix * iy) / smaller > 0.15;
  };
  const placed = new Map();
  for (const entry of entries) {
    let target = null;
    for (const group of groups) {
      if (group.some((g) => overlaps(g, entry))) { target = group; break; }
    }
    if (target) target.push(entry);
    else { const g = [entry]; groups.push(g); placed.set(entry, g); }
  }
  return groups.filter((g) => g.length > 1);
}

// =============================================================================
// per-family regeneration
// =============================================================================

const jsonFile = (dir, rel, value) => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const NON_FILING_PATTERN = /do\s*not\s*complete\s*this\s*form\s*for\s*filing/i;

// Everything this lane writes for one family. Cleared before each run so a
// package always describes the run that produced it: a family that stops being
// renderable -- because a guard now refuses what it used to bind -- must not
// keep serving the fixtures and contact sheet from when it did.
const GENERATED_ARTIFACTS = [
  "source-record.json", "field-census.json", "field-classification.json",
  "production-field-map.json", "overlay-profile.json",
  "fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "fixtures/negative.json",
  "contact-sheet/blank-vs-filled.pdf", "contact-sheet/contact-sheet-proof.json",
  "reports/populated-fields.json", "reports/protected-fields.json",
  "reports/protected-fields-scan.json", "reports/overflow-and-clipping.json",
  "reports/rendered-artifacts.json", "reports/explicit-mapping-candidates.json",
  "reports/mutation-tests.json", "reports/determinism.json"
];

function clearGeneratedArtifacts(familyDir) {
  for (const rel of GENERATED_ARTIFACTS) {
    const p = path.join(familyDir, rel);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}

async function regenerateFamily({ state, record, familySlug, absolutePath }) {
  const familyDir = path.join(OUT, state.slug, familySlug);
  clearGeneratedArtifacts(familyDir);
  const bytes = fs.readFileSync(absolutePath);
  const observedSha = sha256(bytes);
  const declaredSha = record.sha256;
  const findings = [];
  const result = {
    jurisdiction: state.code, documentId: record.document_id, familySlug,
    revision: record.revision, assetClass: record.asset_class, documentRole: record.document_role
  };

  if (declaredSha && declaredSha !== observedSha) {
    result.status = "source_identity_mismatch_family_blocked";
    result.sourceHashMatches = false;
    jsonFile(familyDir, "source-record.json", {
      schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
      laneSchemaVersion: "d1c/v3",
      lane: LANE, jurisdiction: state.code, documentId: record.document_id,
      declaredSha256: declaredSha, observedSha256: observedSha,
      sha256VerifiedAgainstBundleManifest: false,
      participantFillable: false,
      productionHolds: [
        "edition_1_runtime_disabled", "f_independent_visual_review_required",
        "not_participant_fillable_no_fixture_fill", "source_identity_mismatch"
      ],
      blocked: "source_identity_mismatch", implementationStatus: result.status
    });
    return result;
  }
  result.sourceHashMatches = true;

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageCaptures = pages.map((p) => capturePage(p));
  const pageGeometry = pages.map((p, i) => ({
    page: i + 1, width: Math.round(p.getWidth()), height: Math.round(p.getHeight()),
    orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
  }));

  const census = buildCensus(doc, pageCaptures);
  const structuralClassObserved = census.length > 0 ? "acroform" : "flat";
  const fileSlug = path.basename(absolutePath);
  const { ownership, basis: ownershipBasis } = determineOwnership(record, fileSlug);
  const captionOnly = ownership === OWNERSHIP.COURT_ORDER;
  const noFill = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.OUTSIDE_PARTY;

  // A form that says on its own face that it is not to be completed for filing
  // is held before anything else is decided.
  const visibleSourceText = pageCaptures
    .map((c) => groupIntoLines(c.text).map((l) => l.text).join("\n")).join("\n");
  const nonFilingMatch = NON_FILING_PATTERN.exec(visibleSourceText);
  const nonFilingNotice = nonFilingMatch ? nonFilingMatch[0] : null;

  // Holds carried forward from the manifest and the state README. None of them
  // is discharged by this lane; a form that renders is still held.
  //
  // The first three names are the corpus-wide vocabulary the shared verifier
  // asserts on every verified-binary package; the rest record what this
  // particular manifest row said. They describe the same holds, and this lane
  // discharges none of them.
  const holds = ["edition_1_runtime_disabled", "f_independent_visual_review_required"];
  if (noFill) holds.push("not_participant_fillable_no_fixture_fill");
  if (record.generation_allowed !== "yes") holds.push("state_manifest_generation_allowed_no");
  if (record.runtime_status && record.runtime_status !== "runtime_enabled") {
    holds.push(`manifest_runtime_status_${record.runtime_status}`);
  }
  if (record.freshness_status && record.freshness_status !== "current") {
    holds.push(`manifest_freshness_${record.freshness_status}`);
  }
  if (record.legal_review_mapping_status && record.legal_review_mapping_status !== "mapped") {
    holds.push(`legal_review_${record.legal_review_mapping_status}`);
  }
  if (nonFilingNotice) holds.push("source_states_not_for_filing");
  holds.push("counsel_review_required");

  const explicitMappings = explicitMappingsFor(state.code, record.document_id);

  // ---- binding decisions, D0's binder, recorded field by field --------------
  //
  // The subject handed to the binder is the field's own name, except where the
  // name is positional and says nothing -- Vermont numbers its widgets "38",
  // "41", "34a" -- in which case it is the printed label measured beside the
  // widget. The label is never used to override a name that already matched:
  // measurement finds the nearest text, and nearest is not the same as correct.
  const bindOptions = {
    explicitMappings, captionOnly,
    availableChargeRows: CANONICAL["matter.charges"].length,
    documentAcceptsFill: !noFill
  };
  const decisions = census.map((entry) => {
    const label = entry.effectiveLabel;
    const decision = decideBinding(
      { name: entry.name, pdfType: entry.type, effectiveLabel: label }, bindOptions
    );
    return {
      entry, decision,
      subject: label ?? entry.name,
      subjectBasis: label ? entry.effectiveLabelBasis : "acroform_field_name",
      fromMeasuredLabel: Boolean(label)
    };
  });

  // ---- suppression: measured labels that cannot be trusted individually -----
  //
  // A label-derived binding rests on a measurement, so two of them disagreeing
  // is evidence the measurement is wrong rather than a fact worth writing
  // twice. Vermont's 200-00331 measures "Phone" beside two different widgets;
  // its stipulations measure "Printed Name" beside both the petitioner's
  // signature block and the State's Attorney's. Writing either pair puts a
  // participant fact somewhere no one checked, so both members go.
  const labelConflicts = new Map();
  const labelDerived = decisions.filter((d) => d.fromMeasuredLabel && d.decision.writable);

  const byLabel = new Map();
  const byFact = new Map();
  for (const d of labelDerived) {
    const labelKey = d.subject.toLowerCase();
    byLabel.set(labelKey, [...(byLabel.get(labelKey) ?? []), d]);
    byFact.set(d.decision.factId, [...(byFact.get(d.decision.factId) ?? []), d]);
  }
  const flagConflict = (d, reason, peers) => labelConflicts.set(d.entry.name, {
    field: d.entry.name, label: d.subject, factId: d.decision.factId, reason,
    peers: peers.filter((p) => p !== d).map((p) => p.entry.name)
  });
  for (const group of byLabel.values()) {
    if (group.length > 1) for (const d of group) flagConflict(d, "same_measured_label_beside_more_than_one_widget", group);
  }
  for (const group of byFact.values()) {
    if (group.length > 1) for (const d of group) flagConflict(d, "two_measured_labels_claim_the_same_fact", group);
  }
  // A court-issued document names each party once. Several fields claiming the
  // same fact means the form is a multi-case-type template -- Nebraska's
  // DC-1-15 carries separate caption fields for divorce, probate, adoption,
  // emancipation and name change -- and which variant applies is not a fact in
  // the fact set. Writing all of them would caption one notice five ways. On a
  // participant filing the repetition is ordinary and stays allowed: a petition
  // prints the petitioner's name in its caption and again over the signature.
  if (captionOnly) {
    const captionFactGroups = new Map();
    for (const d of decisions.filter((x) => x.decision.writable)) {
      captionFactGroups.set(d.decision.factId, [...(captionFactGroups.get(d.decision.factId) ?? []), d]);
    }
    for (const group of captionFactGroups.values()) {
      if (group.length < 2) continue;
      for (const d of group) {
        labelConflicts.set(d.entry.name, {
          field: d.entry.name, label: d.subject, factId: d.decision.factId,
          reason: "court_issued_document_has_more_than_one_field_for_this_caption_fact",
          peers: group.filter((p) => p !== d).map((p) => p.entry.name)
        });
      }
    }
  }

  for (const d of labelDerived) {
    const expected = misresolvedFact(d.subject, d.decision.factId);
    if (expected) {
      labelConflicts.set(d.entry.name, {
        field: d.entry.name, label: d.subject, factId: d.decision.factId,
        reason: "shared_descriptor_list_resolved_this_label_to_a_less_specific_fact",
        expectedFactId: expected, peers: []
      });
    }
  }

  // Every field D0 refused because a sensitive descriptor was not named for it.
  // Kept as evidence whether or not a mapping was authored.
  const explicitMappingCandidates = decisions
    .filter((d) => d.decision.reason === "requires_explicit_mapping")
    .map((d) => ({
      field: d.entry.name,
      measuredLabel: d.entry.measuredLabel?.text ?? null,
      subjectUsed: d.subject,
      descriptorRefused: d.decision.factId,
      alsoProtectedAs: protectCategoryOf(d.subject),
      authoredMapping: explicitMappings[d.entry.name] ?? null
    }));

  // ---- suppression: fields that already carry text --------------------------
  //
  // A field the source ships with a value in it is not an empty blank. It is
  // either form text the script assembles or a prompt addressed to the reader,
  // and once the script is stripped nothing in the document distinguishes the
  // two. Writing into one destroys whatever it held, so none of them is written
  // and each is recorded for review to authorize individually if it should be.
  const prefilled = new Map();
  for (const { entry, decision } of decisions) {
    if (!decision.writable || !entry.sourceDefaultValue) continue;
    prefilled.set(entry.name, {
      field: entry.name,
      reason: "field_carries_source_default_value",
      sourceDefaultValue: entry.sourceDefaultValue.slice(0, 120),
      wouldHaveWritten: decision.factId
    });
  }

  // ---- overlap suppression --------------------------------------------------
  const writableWithGeometry = decisions
    .filter((d) => d.decision.writable && !prefilled.has(d.entry.name) && !labelConflicts.has(d.entry.name))
    .map((d) => {
      const w = d.entry.widgets.find((x) => x.rect && x.page);
      return w ? { name: d.entry.name, factId: d.decision.factId, page: w.page, rect: w.rect } : null;
    })
    .filter(Boolean);
  const overlapGroups = findOverlapGroups(writableWithGeometry);
  const suppressed = new Map();
  for (const group of overlapGroups) {
    for (const member of group) {
      suppressed.set(member.name, {
        field: member.name,
        reason: "overlapping_writable_widgets_cannot_be_disambiguated",
        group: group.map((g) => ({ field: g.name, factId: g.factId, page: g.page, rect: g.rect }))
      });
    }
  }

  // Only ever subtractive: the census handed to D0 omits the suppressed fields
  // and adds nothing, so D0 still judges everything it is given.
  const excluded = (name) => suppressed.has(name) || prefilled.has(name) || labelConflicts.has(name);
  const censusForFactory = census.filter((entry) => !excluded(entry.name));

  const bindings = decisions
    .filter((d) => d.decision.writable && !excluded(d.entry.name))
    .map((d) => ({
      field: d.entry.name, factId: d.decision.factId, valueType: d.decision.valueType,
      subject: d.subject,
      subjectBasis: d.subjectBasis
    }));
  const bindingRefusals = [
    ...decisions.filter((d) => !d.decision.writable).map((d) => ({
      field: d.entry.name, reason: d.decision.reason, category: d.decision.category ?? null,
      subject: d.subject, fallbackLabelTried: d.fallbackTried ?? null
    })),
    ...[...suppressed.values()].map((s) => ({ field: s.field, reason: s.reason, category: "overlap_guard" })),
    ...[...prefilled.values()].map((p) => ({
      field: p.field, reason: p.reason, category: "source_default_value",
      sourceDefaultValue: p.sourceDefaultValue, wouldHaveWritten: p.wouldHaveWritten
    })),
    ...[...labelConflicts.values()].map((c) => ({
      field: c.field, reason: c.reason, category: "measured_label_conflict",
      measuredLabel: c.label, wouldHaveWritten: c.factId,
      expectedFactId: c.expectedFactId ?? null, conflictsWith: c.peers
    }))
  ];

  // ---- anchors for flat forms ----------------------------------------------
  let anchorReport = null;
  let anchors = [];
  if (structuralClassObserved === "flat" && !noFill) {
    anchorReport = measureAnchors(pages);
    // finalizeFlatOverlay reads the caption-only restriction off each anchor,
    // so a court-issued order has to carry it there or the overlay path would
    // apply a weaker rule than the AcroForm path does on the same document.
    anchors = anchorReport.anchors.map((a) => ({ ...a, captionOnly }));
  }

  const mapKind = structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";
  const renderable = !noFill && (mapKind === "acroform" ? bindings.length > 0 : anchors.length > 0);

  // ---- render ---------------------------------------------------------------
  const rendered = {};
  let contactSheetBuilt = false;
  let deterministic = null;
  const title = `${state.code} ${record.document_id}`;

  const renderOnce = async (facts) => (mapKind === "acroform"
    ? finalizeOfficialForm({
        sourceBytes: bytes, expectedSha256: observedSha, census: censusForFactory, facts,
        explicitMappings, captionOnly, documentAcceptsFill: !noFill, nonFilingNotice, title
      })
    : finalizeFlatOverlay({
        sourceBytes: bytes, expectedSha256: observedSha, anchors, facts, nonFilingNotice, title
      }));

  if (renderable) {
    try {
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const out = await renderOnce(facts);
        fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
        fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), out.bytes);
        rendered[label] = out;
        for (const u of out.report.unfittable) {
          findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
        }
      }

      // Same source, same facts, twice: identical bytes or the artifact is not
      // reproducible and a later drift check would be meaningless.
      const again = await renderOnce(CANONICAL);
      deterministic = {
        basis: "canonical fixture rendered twice in one process from the same source bytes",
        firstSha256: rendered.canonical.report.outputSha256,
        secondSha256: again.report.outputSha256,
        identical: rendered.canonical.report.outputSha256 === again.report.outputSha256
      };
      if (!deterministic.identical) {
        findings.push({ check: "nondeterministic_render", ...deterministic });
      }

      const sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: rendered.canonical.bytes,
        expectedValues: rendered.canonical.report.expectedValues,
        heading: `${state.code} ${record.document_id} — blank (left) vs finalized fill (right)`
      });
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
      jsonFile(familyDir, "contact-sheet/contact-sheet-proof.json", sheet.proof);
      contactSheetBuilt = true;
    } catch (error) {
      if (error instanceof NonFilingHoldError) {
        findings.push({ check: "non_filing_hold_enforced", notice: error.notice, fillProduced: false });
      } else if (error instanceof ContactSheetProofError) {
        findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null });
      } else {
        findings.push({ check: "finalize_refused", message: String(error.message).slice(0, 400) });
      }
    }
  }

  // ---- mutation tests -------------------------------------------------------
  //
  // Each removes one guarantee and confirms the pipeline goes red. A guard that
  // cannot be made to fail is not known to be load-bearing.
  const mutations = [];
  if (renderable && rendered.canonical) {
    const perturbed = Buffer.from(bytes);
    // A byte inside the trailer region: enough to change the digest without
    // making the file unparseable, so the refusal is provably the hash check.
    perturbed[Math.floor(perturbed.length / 2)] ^= 0xff;
    mutations.push(await expectFailure("source_drift_detected", () => (mapKind === "acroform"
      ? finalizeOfficialForm({
          sourceBytes: perturbed, expectedSha256: observedSha, census: censusForFactory,
          facts: CANONICAL, explicitMappings, captionOnly, nonFilingNotice, title })
      : finalizeFlatOverlay({
          sourceBytes: perturbed, expectedSha256: observedSha, anchors, facts: CANONICAL,
          nonFilingNotice, title }))));

    mutations.push(await expectFailure("non_filing_notice_refuses_fill", () => (mapKind === "acroform"
      ? finalizeOfficialForm({
          sourceBytes: bytes, expectedSha256: observedSha, census: censusForFactory,
          facts: CANONICAL, explicitMappings, captionOnly,
          nonFilingNotice: "DO NOT COMPLETE THIS FORM FOR FILING", title })
      : finalizeFlatOverlay({
          sourceBytes: bytes, expectedSha256: observedSha, anchors, facts: CANONICAL,
          nonFilingNotice: "DO NOT COMPLETE THIS FORM FOR FILING", title }))));

    // The contact sheet's whole purpose is refusing to show a panel that has no
    // values in it. Handing it the blank document as the finalized artifact is
    // exactly the defect it exists to catch.
    if (rendered.canonical.report.expectedValues.length > 0) {
      mutations.push(await expectFailure("contact_sheet_rejects_unflattened_panel", () => buildContactSheet({
        blankBytes: bytes, finalizedBytes: bytes,
        expectedValues: rendered.canonical.report.expectedValues
      })));
    }
  }

  // ---- visibility, placeholder and protection scan --------------------------
  let scan = null;
  if (rendered.canonical) {
    const finalized = await PDFDocument.load(rendered.canonical.bytes, { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalized);
    const missing = missingExpectedValues(visible, rendered.canonical.report.expectedValues);
    const placeholder = /\b(tbd|todo|lorem|xxx+|placeholder|sample text|fixme|\{\{|\$\{)/i.exec(visible);
    const protectedNames = new Set((rendered.canonical.report.protectedFields ?? []).map((p) => p.field));
    const writtenProtected = rendered.canonical.report.written.filter((w) => protectedNames.has(w.field));
    const residue = rendered.canonical.report.activeContentScan?.hits ?? [];

    // Nothing may be written twice, and nothing written may sit on top of
    // anything else written.
    const writtenGeometry = rendered.canonical.report.written
      .map((w) => {
        const entry = census.find((c) => c.name === w.field);
        const widget = entry?.widgets.find((x) => x.rect && x.page);
        return widget ? { name: w.field, page: widget.page, rect: widget.rect } : null;
      })
      .filter(Boolean);
    const writtenOverlaps = findOverlapGroups(writtenGeometry)
      .map((g) => g.map((m) => ({ field: m.name, page: m.page, rect: m.rect })));
    const duplicateValues = Object.entries(
      rendered.canonical.report.expectedValues.reduce((acc, v) => (acc[v] = (acc[v] ?? 0) + 1, acc), {})
    ).filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));

    scan = {
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      writtenFields: rendered.canonical.report.written.length,
      refusedFields: rendered.canonical.report.refused.length,
      protectedFieldsRefused: (rendered.canonical.report.protectedFields ?? []).length,
      violations: writtenProtected,
      valuesWrittenButNotVisible: missing,
      placeholderValues: placeholder ? [placeholder[0]] : [],
      activeContentResidue: residue,
      overlappingWrittenFields: writtenOverlaps,
      // A repeated value is only a defect when it was not asked for. Several
      // forms legitimately print the participant's name in both a caption and a
      // signature block, so this is reported rather than failed.
      repeatedWrittenValues: duplicateValues,
      pass: writtenProtected.length === 0 && missing.length === 0 && !placeholder
        && residue.length === 0 && writtenOverlaps.length === 0
    };
    if (!scan.pass) findings.push({ check: "protected_or_visibility_violation", scan });
  }

  // ---- artifacts ------------------------------------------------------------
  jsonFile(familyDir, "field-census.json", {
    schemaVersion: "rcap-field-census/v4-lane-d1c",
    censusBasis: "first_hand_inspection_of_hash_verified_binary",
    lane: LANE, sha256: observedSha, structuralClass: structuralClassObserved,
    fieldCount: census.length,
    declaredFieldCount: record.field_count ? Number(record.field_count) : null,
    declaredFieldCountNote: "The manifest counts every widget; pdf-lib counts terminal fields, so a radio group of six buttons is six there and one here. A difference is a counting convention, not a source mismatch.",
    pageGeometry, fields: census
  });

  jsonFile(familyDir, "field-classification.json", {
    schemaVersion: "rcap-field-classification/v5-typed-fail-closed",
    documentOwnership: ownership,
    bindingBasis: "scripts/rcap-official-forms/rcap-field-semantics.mjs decideBinding, unmodified",
    captionOnly, documentAcceptsFill: !noFill,
    counts: {
      total: census.length, writable: bindings.length,
      refused: bindingRefusals.length,
      suppressedByOverlapGuard: suppressed.size,
      suppressedBySourceDefaultGuard: prefilled.size,
      suppressedByMeasuredLabelConflictGuard: labelConflicts.size
    },
    entries: decisions.map((d) => ({
      field: d.entry.name, type: d.entry.type,
      subject: d.subject, subjectBasis: d.subjectBasis,
      measuredLabel: d.entry.measuredLabel ?? null,
      sourceDefaultValue: d.entry.sourceDefaultValue ?? null,
      writable: d.decision.writable && !excluded(d.entry.name),
      factId: d.decision.writable ? d.decision.factId : null,
      refusalReason: labelConflicts.has(d.entry.name)
        ? labelConflicts.get(d.entry.name).reason
        : prefilled.has(d.entry.name)
        ? "field_carries_source_default_value"
        : suppressed.has(d.entry.name)
        ? "overlapping_writable_widgets_cannot_be_disambiguated"
        : (d.decision.writable ? null : d.decision.reason),
      refusalCategory: d.decision.category ?? null
    }))
  });

  const mapName = mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json";
  jsonFile(familyDir, mapName, {
    schemaVersion: `rcap-${mapKind}-map/v6-lane-d1c`,
    lane: LANE, family: familySlug, jurisdiction: state.code, documentId: record.document_id,
    revision: record.revision, sha256: observedSha,
    factoryVersion: FACTORY_VERSION,
    documentOwnership: ownership, documentOwnershipBasis: ownershipBasis,
    captionOnly, pageGeometry,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs decideBinding), unmodified, with lane-level guards that only ever narrow it",
    bindings, bindingRefusals,
    overlapGuard: {
      rule: "Two writable widgets whose rectangles overlap are refused as a group: once the form's own scripting is stripped there is nothing left in the document that says which one the court reads.",
      groups: overlapGroups.map((g) => g.map((m) => ({ field: m.name, factId: m.factId, page: m.page, rect: m.rect })))
    },
    measuredLabelConflictGuard: {
      rule: "A binding that rests on a measured label is discarded when another measured label contradicts it -- the same label found beside two widgets, two labels claiming one fact, or a label the shared descriptor list resolves to a less specific fact than the label itself names.",
      suppressed: [...labelConflicts.values()]
    },
    sourceDefaultGuard: {
      rule: "A field the source ships with a value already in it is never written. On these Nebraska forms the caption line is stored as field default values rather than as page content, so writing a fact into one deletes printed form text instead of filling a blank.",
      suppressed: [...prefilled.values()]
    },
    anchorCapture: anchorReport ? {
      basis: "rule geometry from painted rectangles and caption geometry from decoded text, both read out of this exact sha256",
      pages: anchorReport.pageSummaries,
      anchorCount: anchorReport.anchors.length,
      anchors: anchorReport.anchors,
      unanchoredRuleCount: anchorReport.unanchored.length,
      unanchoredRules: anchorReport.unanchored,
      captionGate: "Narrower than the shared binder by construction: a caption must match an allowlisted whole-caption pattern, survive the deny list, decode without an unmapped glyph, and then still satisfy decideBinding inside the factory."
    } : null,
    overflowPolicy: { longText: "shrink_to_fit_then_refuse_below_6pt", multiline: "wrap_within_widget_rect" }
  });

  jsonFile(familyDir, "reports/populated-fields.json", {
    schemaVersion: "rcap-populated-fields/v2-lane-d1c",
    canonicalWritten: rendered.canonical?.report.written ?? [],
    boundaryWritten: rendered.boundary?.report.written ?? [],
    expectedValues: rendered.canonical?.report.expectedValues ?? []
  });

  jsonFile(familyDir, "reports/protected-fields.json", {
    documentOwnership: ownership,
    wholeDocumentUnwritable: noFill,
    refusals: bindingRefusals,
    refusalCountsByReason: bindingRefusals.reduce((a, r) => (a[r.reason] = (a[r.reason] ?? 0) + 1, a), {})
  });

  if (scan) jsonFile(familyDir, "reports/protected-fields-scan.json", scan);

  jsonFile(familyDir, "reports/overflow-and-clipping.json", {
    schemaVersion: "rcap-overflow-report/v3-lane-d1c",
    boundaryFixtureApplied: Boolean(rendered.boundary),
    minimumReadableFontSize: MIN_READABLE_FONT_SIZE,
    policy: "A value that cannot be drawn at 6pt or larger inside its own widget is refused and the field is left blank. Nothing is clipped and nothing is shrunk below legibility.",
    unfittableCanonical: rendered.canonical?.report.unfittable ?? [],
    unfittableBoundary: rendered.boundary?.report.unfittable ?? [],
    findings
  });

  jsonFile(familyDir, "reports/explicit-mapping-candidates.json", {
    schemaVersion: "rcap-explicit-mapping-candidates/v1",
    rule: "D0 refuses arrest, offense, conviction and disposition dates and charge text unless the caller names the field. Each candidate below was considered; `authoredMapping` records the decision and `alsoProtectedAs` records whether a protect rule would have refused it regardless.",
    candidates: explicitMappingCandidates,
    authored: explicitMappings
  });

  if (mutations.length > 0) {
    jsonFile(familyDir, "reports/mutation-tests.json", {
      schemaVersion: "rcap-mutation-tests/v1-lane-d1c",
      basis: "Each mutation removes one guarantee and asserts the pipeline refuses. A guard that cannot be made to fail is not known to be load-bearing.",
      allRed: mutations.every((m) => m.refusedAsExpected),
      mutations
    });
  }

  if (deterministic) jsonFile(familyDir, "reports/determinism.json", deterministic);

  if (rendered.canonical) {
    jsonFile(familyDir, "fixtures/negative.json", {
      schemaVersion: "rcap-negative-fixture/v5-lane-d1c",
      assertion: "With no participant facts supplied nothing is written. Every field starts protected; money, race, event dates without an authored mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction.",
      refusedFields: rendered.canonical.report.refused,
      refusedCount: rendered.canonical.report.refused.length
    });
  }

  const artifacts = {};
  for (const rel of [
    "fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"
  ]) {
    const p = path.join(familyDir, rel);
    if (!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    artifacts[rel] = { sha256: sha256(buf), bytes: buf.length };
  }
  jsonFile(familyDir, "reports/rendered-artifacts.json", {
    schemaVersion: "rcap-rendered-artifacts/v2-lane-d1c",
    sourceSha256: observedSha,
    renderer: "scripts/rcap-official-forms/lanes/d1c-regenerate.mjs",
    reproducible: "Creation and modification dates are pinned by the factory, so re-rendering from the same source binary reproduces these digests byte for byte.",
    artifacts
  });

  const status = noFill
    ? (ownership === OWNERSHIP.INSTRUCTIONAL ? "no_fill_instructional_document" : "no_fill_outside_party_document")
    : nonFilingNotice ? "held_source_states_not_for_filing"
    : mapKind === "flat_overlay"
      ? (anchors.length > 0 ? "overlay_implemented_pending_independent_review"
        : "overlay_no_unambiguous_anchor_nothing_written")
      : bindings.length > 0 ? "implemented_pending_independent_review"
      : "acroform_all_fields_protected_or_unmapped";

  jsonFile(familyDir, "source-record.json", {
    // The shared verifier routes on this marker and then applies the
    // verified-binary invariants, which is the right set for these packages.
    // The lane's own revision is recorded separately so the contract version
    // and the generator version can move independently.
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    laneSchemaVersion: "d1c/v3",
    lane: LANE, jurisdiction: state.code, state: state.name,
    documentId: record.document_id, officialTitle: record.official_title,
    documentRole: record.document_role, assetClass: record.asset_class,
    revision: record.revision, language: record.language,
    workflowKey: record.workflow_key,
    canonicalRelativePath: record.canonical_relative_path,
    sourcePack: SOURCE_PACK,
    sha256: observedSha,
    declaredSha256: declaredSha,
    sha256VerifiedAgainstStateManifest: true,
    sha256VerifiedAgainstBundleManifest: true,
    byteLength: bytes.length,
    declaredBytes: record.bytes ? Number(record.bytes) : null,
    byteLengthMatches: record.bytes ? Number(record.bytes) === bytes.length : null,
    sourceUrl: record.source_url || null,
    sourceStatus: record.source_status || null,
    freshnessStatus: record.freshness_status || null,
    generationAllowed: record.generation_allowed === "yes",
    runtimeStatus: record.runtime_status || null,
    libraryFolder: record.canonical_relative_path.split("/")[2] ?? null,
    structuralClassObserved,
    structuralClassDeclared: record.structural_class || null,
    structuralClassAgrees: record.structural_class
      ? record.structural_class.startsWith(structuralClassObserved) : null,
    declaredPages: record.pages ? Number(record.pages) : null,
    observedPages: pages.length,
    pageCountAgrees: record.pages ? Number(record.pages) === pages.length : null,
    pageGeometry,
    documentOwnership: ownership,
    documentOwnershipBasis: ownershipBasis,
    participantFillable: !noFill,
    captionFactsOnly: captionOnly,
    nonFilingNotice,
    productionHolds: holds,
    holdsNote: "Every hold above is carried forward from the source manifest or the state README. This lane discharges none of them. A form that renders cleanly is still held; rendering is not adoption.",
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    censusBasis: "first_hand_inspection_of_hash_verified_binary",
    implementationStatus: status
  });

  Object.assign(result, {
    status, ownership, mapKind, structuralClassObserved,
    fields: census.length,
    bound: bindings.length,
    refused: bindingRefusals.length,
    overlapSuppressed: suppressed.size,
    anchors: anchors.length,
    unanchoredRules: anchorReport?.unanchored.length ?? 0,
    written: rendered.canonical?.report.written.length ?? 0,
    unfittable: (rendered.canonical?.report.unfittable.length ?? 0)
      + (rendered.boundary?.report.unfittable.length ?? 0),
    contactSheet: contactSheetBuilt,
    canonicalFixture: Boolean(rendered.canonical),
    boundaryFixture: Boolean(rendered.boundary),
    negativeFixture: Boolean(rendered.canonical),
    deterministic: deterministic?.identical ?? null,
    mutationsAllRed: mutations.length > 0 ? mutations.every((m) => m.refusedAsExpected) : null,
    activeContentHits: rendered.canonical?.report.activeContentScan?.hits.length ?? null,
    scanPass: scan?.pass ?? null,
    nonFilingNotice: Boolean(nonFilingNotice),
    holds: holds.length,
    findings: findings.length
  });
  return result;
}

async function expectFailure(name, fn) {
  try {
    await fn();
    return { mutation: name, refusedAsExpected: false, note: "pipeline accepted input it should have refused" };
  } catch (error) {
    return { mutation: name, refusedAsExpected: true, error: `${error.name}: ${String(error.message).slice(0, 200)}` };
  }
}

// =============================================================================
// lane-level guard checks
// =============================================================================
//
// Three properties of the shared factory this lane depends on, asserted once
// per run rather than assumed. If any of them stops holding, every package in
// this lane is built on a claim that is no longer true.
async function laneGuardChecks() {
  const checks = [];
  const probe = await PDFDocument.create();
  const font = await probe.embedFont(StandardFonts.Helvetica);

  const protectedLabels = [
    ["Signature of Requester", "signature"],
    ["State Bar No.", "attorney"],
    ["Subject's Race", "race"],
    ["Filing fee amount", "money"],
    ["Judge", "court"],
    ["Clerk of Court", "clerk"],
    ["Date of conviction", "disposition_or_hearing"]
  ];
  for (const [label, expected] of protectedLabels) {
    const decision = decideBinding({ name: "positional_1", pdfType: "text", effectiveLabel: label }, {});
    checks.push({
      check: "protected_label_refused", label, expectedCategory: expected,
      pass: decision.writable === false && decision.category === expected,
      observed: { writable: decision.writable, category: decision.category ?? null }
    });
  }

  const tiny = fitTextToWidget({
    font, text: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
    rect: { x: 0, y: 0, width: 40, height: 10 }, multiline: false
  });
  checks.push({
    check: "unreadable_value_refused_not_shrunk_below_floor",
    minimumReadableFontSize: MIN_READABLE_FONT_SIZE,
    pass: tiny.outcome === "refused", observed: tiny.outcome
  });

  const checkboxDecision = decideBinding({ name: "petitioner name", pdfType: "checkbox" }, {});
  checks.push({
    check: "non_text_control_never_bound",
    pass: checkboxDecision.writable === false && checkboxDecision.category === "type_guard",
    observed: checkboxDecision.reason
  });

  const unindexed = decideBinding({ name: "caseNumber3", pdfType: "text" }, { availableChargeRows: 1 });
  checks.push({
    check: "charge_row_without_indexed_fact_refused",
    pass: unindexed.writable === false && unindexed.category === "charge_row",
    observed: unindexed.reason
  });

  return checks;
}

// =============================================================================
// main
// =============================================================================

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`source pack not found at ${SRC}; set RCAP_D1C_SOURCE`);
    process.exit(2);
  }

  const guards = await laneGuardChecks();
  const guardsPass = guards.every((g) => g.pass);
  if (!guardsPass) {
    console.error(JSON.stringify({ laneGuardChecks: guards }, null, 2));
    console.error("lane guard checks failed; refusing to regenerate");
    process.exit(1);
  }

  const summary = { lane: LANE, sourcePack: SOURCE_PACK, laneGuardChecks: guards, states: [] };

  for (const state of STATES) {
    const manifest = readManifest(state.code);
    const binaries = manifest.filter((r) => r.canonical_relative_path.toLowerCase().endsWith(".pdf"));
    const families = [];

    for (const record of binaries) {
      const absolutePath = path.join(SRC, record.canonical_relative_path);
      if (!fs.existsSync(absolutePath)) {
        families.push({
          jurisdiction: state.code, documentId: record.document_id,
          familySlug: familySlugOf(record), status: "source_binary_absent_from_pack",
          canonicalRelativePath: record.canonical_relative_path
        });
        continue;
      }
      families.push(await regenerateFamily({
        state, record, familySlug: familySlugOf(record), absolutePath
      }));
    }

    // The shared implementation index is read, never written: seven lanes run
    // at once and whichever wrote last would erase the other six. Reading it is
    // still worth doing, because the difference between what it says today and
    // what this regeneration found is exactly the change the captain has to
    // apply -- and until they do, the shared verifier judges these packages
    // against the previous build's claims about them.
    let previousStatuses = new Map();
    try {
      const shared = JSON.parse(fs.readFileSync(path.join(OUT, "implementation-index.json"), "utf8"));
      previousStatuses = new Map((shared.families ?? [])
        .filter((f) => f.jurisdiction === state.code)
        .map((f) => [f.family, f.status]));
    } catch { previousStatuses = new Map(); }
    const statusChanges = families
      .map((f) => ({ familySlug: f.familySlug, from: previousStatuses.get(f.familySlug) ?? null, to: f.status }))
      .filter((c) => c.from !== null && c.from !== c.to);

    const stateIndexPath = path.join(OUT, state.slug, "state-index.json");
    fs.mkdirSync(path.dirname(stateIndexPath), { recursive: true });
    fs.writeFileSync(stateIndexPath, `${JSON.stringify({
      schemaVersion: "rcap-lane-state-index/v1",
      lane: LANE,
      note: "Lane-scoped. Seven lanes regenerate concurrently, so this lane writes no corpus-wide index: verified-binary-index.json and implementation-index.json stay untouched and the captain merges these per-state files at import.",
      jurisdiction: state.code, state: state.name, slug: state.slug,
      sourcePack: SOURCE_PACK,
      factoryVersion: FACTORY_VERSION,
      generatedFrom: "scripts/rcap-official-forms/lanes/d1c-regenerate.mjs",
      familyCount: families.length,
      authoritativeFamilyDirectories: families.map((f) => f.familySlug),
      statusChangesForCaptainToMerge: statusChanges,
      sharedIndexStalenessNote: statusChanges.length === 0 ? null
        : "Until these statuses are merged into implementation-index.json, scripts/verify-rcap-official-forms-d1.mjs judges the affected packages against the previous build's status and will report missing fixtures for any family that no longer renders one.",
      supersededLegacyDirectoriesNote: "Earlier build generations left sibling directories under this state that this lane did not write and did not delete. Only the directories listed above are D1C output.",
      families
    }, null, 2)}\n`);

    summary.states.push({
      jurisdiction: state.code, slug: state.slug,
      families: families.length,
      sourceHashMatches: families.filter((f) => f.sourceHashMatches).length,
      sourceMismatches: families.filter((f) => f.sourceHashMatches === false).length,
      acroform: families.filter((f) => f.mapKind === "acroform").length,
      overlay: families.filter((f) => f.mapKind === "flat_overlay").length,
      fields: families.reduce((a, f) => a + (f.fields ?? 0), 0),
      bound: families.reduce((a, f) => a + (f.bound ?? 0), 0),
      refused: families.reduce((a, f) => a + (f.refused ?? 0), 0),
      anchors: families.reduce((a, f) => a + (f.anchors ?? 0), 0),
      unfittable: families.reduce((a, f) => a + (f.unfittable ?? 0), 0),
      canonicalFixtures: families.filter((f) => f.canonicalFixture).length,
      boundaryFixtures: families.filter((f) => f.boundaryFixture).length,
      negativeFixtures: families.filter((f) => f.negativeFixture).length,
      contactSheets: families.filter((f) => f.contactSheet).length,
      deterministic: families.filter((f) => f.deterministic === true).length,
      nondeterministic: families.filter((f) => f.deterministic === false).length,
      mutationsAllRed: families.filter((f) => f.mutationsAllRed === true).length,
      mutationsNotAllRed: families.filter((f) => f.mutationsAllRed === false).length,
      scanFailures: families.filter((f) => f.scanPass === false).length,
      activeContentHits: families.reduce((a, f) => a + (f.activeContentHits ?? 0), 0),
      nonFilingHolds: families.filter((f) => f.nonFilingNotice).length,
      findings: families.reduce((a, f) => a + (f.findings ?? 0), 0),
      statuses: families.reduce((a, f) => (a[f.status] = (a[f.status] ?? 0) + 1, a), {})
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
else console.error("d1c-regenerate: imported rather than run; no packages were regenerated.");
