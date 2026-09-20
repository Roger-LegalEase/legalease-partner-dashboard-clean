// Independent PDF ink reader: walks page content streams AND nested Form XObjects,
// decodes text-showing operators, and reports ink even when the font cannot be mapped
// to Unicode (the case pdftotext silently drops).
import fs from "node:fs";
import zlib from "node:zlib";
import { Font as StdFont, FontNames as StdFontNames, Encodings as StdEncodings } from "/home/user/legalease-partner-dashboard-clean/node_modules/@pdf-lib/standard-fonts/lib/index.js";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFNumber, PDFString, PDFHexString, PDFRef } from "/home/user/legalease-partner-dashboard-clean/node_modules/pdf-lib/cjs/index.js";

// Standard-14 metrics, so a font with no /Widths array is still measured rather than guessed.
const STD_CACHE = new Map();
const stdFontFor = (baseFont) => {
  const b = String(baseFont || "Helvetica").replace(/^\//, "").replace(/^[A-Z]{6}\+/, "");
  const l = b.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(l), ital = /italic|oblique/.test(l);
  let key;
  if (/courier|mono/.test(l)) key = bold && ital ? "CourierBoldOblique" : bold ? "CourierBold" : ital ? "CourierOblique" : "Courier";
  else if (/zapf|dingbat/.test(l)) key = "ZapfDingbats";
  else if (/^symbol/.test(l)) key = "Symbol";
  else if (/times|serif|roman|georgia|garamond|book|minion/.test(l)) key = bold && ital ? "TimesRomanBoldItalic" : bold ? "TimesRomanBold" : ital ? "TimesRomanItalic" : "TimesRoman";
  else key = bold && ital ? "HelveticaBoldOblique" : bold ? "HelveticaBold" : ital ? "HelveticaOblique" : "Helvetica";
  if (!STD_CACHE.has(key)) { try { STD_CACHE.set(key, StdFont.load(StdFontNames[key])); } catch { STD_CACHE.set(key, null); } }
  return STD_CACHE.get(key);
};
const stdWidth = (font, code) => {
  if (!font) return null;
  try { const w = font.getWidthOfGlyph(glyphNameFor(code)); return typeof w === "number" && !isNaN(w) ? w : null; } catch { return null; }
};
// WinAnsi code -> AFM glyph name, sufficient for the ASCII/Latin-1 range these packets draw in.
const GN = (() => {
  const m = new Map();
  const ascii = {32:"space",33:"exclam",34:"quotedbl",35:"numbersign",36:"dollar",37:"percent",38:"ampersand",39:"quotesingle",40:"parenleft",41:"parenright",42:"asterisk",43:"plus",44:"comma",45:"hyphen",46:"period",47:"slash",58:"colon",59:"semicolon",60:"less",61:"equal",62:"greater",63:"question",64:"at",91:"bracketleft",92:"backslash",93:"bracketright",94:"asciicircum",95:"underscore",96:"grave",123:"braceleft",124:"bar",125:"braceright",126:"asciitilde"};
  for (let c = 48; c <= 57; c++) m.set(c, ["zero","one","two","three","four","five","six","seven","eight","nine"][c - 48]);
  for (let c = 65; c <= 90; c++) m.set(c, String.fromCharCode(c));
  for (let c = 97; c <= 122; c++) m.set(c, String.fromCharCode(c));
  for (const [k, v] of Object.entries(ascii)) m.set(+k, v);
  const win = {145:"quoteleft",146:"quoteright",147:"quotedblleft",148:"quotedblright",149:"bullet",150:"endash",151:"emdash",160:"space",167:"section",169:"copyright",174:"registered",176:"degree",233:"eacute",241:"ntilde",243:"oacute",250:"uacute",237:"iacute",225:"aacute",232:"egrave",231:"ccedilla",191:"questiondown",161:"exclamdown"};
  for (const [k, v] of Object.entries(win)) m.set(+k, v);
  return m;
})();
const glyphNameFor = (code) => GN.get(code) || "space";

const decodeStream = (ctx, stream) => {
  try {
    let bytes = stream.getContents();
    const f = stream.dict.get(PDFName.of("Filter"));
    const names = !f ? [] : (f instanceof PDFArray ? f.asArray().map(x => x.asString ? x.asString() : String(x)) : [f.asString ? f.asString() : String(f)]);
    for (const n of names) {
      if (n === "/FlateDecode") bytes = zlib.inflateSync(Buffer.from(bytes));
      else if (n === "/LZWDecode" || n === "/DCTDecode" || n === "/JPXDecode" || n === "/CCITTFaxDecode") return null;
    }
    return Buffer.from(bytes);
  } catch { try { return Buffer.from(stream.getContents()); } catch { return null; } }
};

// Build a code->unicode map for a font, from ToUnicode CMap when present.
const fontMap = (ctx, fontDict) => {
  const out = { toUni: null, twoByte: false, name: null, baseFont: null, widths: null, firstChar: 0, missingWidth: 500, defaultWidth: 1000 };
  try {
    const sub = fontDict.get(PDFName.of("Subtype")); out.name = sub ? sub.asString() : null;
    const bf = fontDict.get(PDFName.of("BaseFont")); out.baseFont = bf ? bf.asString() : null;
    if (out.name === "/Type0") out.twoByte = true;
    const tuRef = fontDict.get(PDFName.of("ToUnicode"));
    if (tuRef) {
      const tu = tuRef instanceof PDFRef ? ctx.lookup(tuRef) : tuRef;
      const buf = tu && tu.getContents ? decodeStream(ctx, tu) : null;
      if (buf) {
        const s = buf.toString("latin1"); const m = new Map();
        const hex = (h) => { let r = ""; for (let i = 0; i + 3 < h.length + 1; i += 4) r += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return r; };
        for (const blk of s.match(/beginbfchar([\s\S]*?)endbfchar/g) || [])
          for (const mm of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) m.set(parseInt(mm[1], 16), hex(mm[2]));
        for (const blk of s.match(/beginbfrange([\s\S]*?)endbfrange/g) || [])
          for (const mm of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
            const a = parseInt(mm[1], 16), b = parseInt(mm[2], 16), c = parseInt(mm[3], 16);
            for (let i = a; i <= b && i - a < 65536; i++) m.set(i, String.fromCharCode(c + (i - a)));
          }
        if (m.size) out.toUni = m;
      }
    }
    // widths for advance/clipping measurement
    const num = (x) => { const v = x instanceof PDFRef ? ctx.lookup(x) : x; return v && v.asNumber ? v.asNumber() : (typeof v === "number" ? v : null); };
    const fc = num(fontDict.get(PDFName.of("FirstChar"))); if (fc !== null) out.firstChar = fc;
    let wRaw = fontDict.get(PDFName.of("Widths"));
    if (wRaw instanceof PDFRef) wRaw = ctx.lookup(wRaw);
    if (wRaw instanceof PDFArray) out.widths = wRaw.asArray().map(num);
    let dRaw = fontDict.get(PDFName.of("FontDescriptor"));
    if (dRaw instanceof PDFRef) dRaw = ctx.lookup(dRaw);
    if (dRaw instanceof PDFDict) { const mw = num(dRaw.get(PDFName.of("MissingWidth"))); if (mw !== null) out.missingWidth = mw; }
    if (out.name === "/Type0") {
      let df = fontDict.get(PDFName.of("DescendantFonts")); if (df instanceof PDFRef) df = ctx.lookup(df);
      if (df instanceof PDFArray) {
        let d0 = df.asArray()[0]; if (d0 instanceof PDFRef) d0 = ctx.lookup(d0);
        if (d0 instanceof PDFDict) {
          const dw = num(d0.get(PDFName.of("DW"))); out.defaultWidth = dw === null ? 1000 : dw;
          let W = d0.get(PDFName.of("W")); if (W instanceof PDFRef) W = ctx.lookup(W);
          if (W instanceof PDFArray) {
            const arr = W.asArray(); const m2 = new Map(); let i = 0;
            while (i < arr.length) {
              const a = num(arr[i]);
              let nxt = arr[i + 1]; if (nxt instanceof PDFRef) nxt = ctx.lookup(nxt);
              if (nxt instanceof PDFArray) { const list = nxt.asArray().map(num); list.forEach((w, k) => m2.set(a + k, w)); i += 2; }
              else { const b = num(arr[i + 1]); const w = num(arr[i + 2]); for (let c = a; c <= b && c - a < 65536; c++) m2.set(c, w); i += 3; }
            }
            out.cidWidths = m2;
          }
        }
      }
    }
  } catch {}
  return out;
};

// Minimal content-stream tokenizer for the operators we care about.
function* tokens(buf) {
  const s = buf; let i = 0; const n = s.length;
  const isWS = (c) => c === 32 || c === 10 || c === 13 || c === 9 || c === 0 || c === 12;
  const isDelim = (c) => [40, 41, 60, 62, 91, 93, 123, 125, 47, 37].includes(c);
  while (i < n) {
    const c = s[i];
    if (isWS(c)) { i++; continue; }
    if (c === 37) { while (i < n && s[i] !== 10 && s[i] !== 13) i++; continue; }
    if (c === 40) { // literal string
      let d = 1, j = i + 1; const out = [];
      while (j < n && d > 0) {
        const ch = s[j];
        if (ch === 92) { // escape
          const e = s[j + 1];
          const map = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 40: 40, 41: 41, 92: 92 };
          if (e >= 48 && e <= 55) { let o = "", k = j + 1; while (k < n && o.length < 3 && s[k] >= 48 && s[k] <= 55) { o += String.fromCharCode(s[k]); k++; } out.push(parseInt(o, 8) & 255); j = k; continue; }
          if (e === 10) { j += 2; continue; }
          out.push(map[e] !== undefined ? map[e] : e); j += 2; continue;
        }
        if (ch === 40) d++; else if (ch === 41) { d--; if (d === 0) { j++; break; } }
        out.push(ch); j++;
      }
      yield { t: "str", v: Buffer.from(out) }; i = j; continue;
    }
    if (c === 60 && s[i + 1] !== 60) { let j = i + 1, h = ""; while (j < n && s[j] !== 62) { const ch = String.fromCharCode(s[j]); if (/[0-9A-Fa-f]/.test(ch)) h += ch; j++; }
      if (h.length % 2) h += "0"; yield { t: "str", v: Buffer.from(h, "hex") }; i = j + 1; continue; }
    if (c === 60 && s[i + 1] === 60) { yield { t: "op", v: "<<" }; i += 2; continue; }
    if (c === 62 && s[i + 1] === 62) { yield { t: "op", v: ">>" }; i += 2; continue; }
    if (c === 91) { yield { t: "op", v: "[" }; i++; continue; }
    if (c === 93) { yield { t: "op", v: "]" }; i++; continue; }
    if (c === 47) { let j = i + 1; let name = ""; while (j < n && !isWS(s[j]) && !isDelim(s[j])) { name += String.fromCharCode(s[j]); j++; } yield { t: "name", v: name }; i = j; continue; }
    let j = i; let tok = ""; while (j < n && !isWS(s[j]) && !isDelim(s[j])) { tok += String.fromCharCode(s[j]); j++; }
    if (tok === "") { i++; continue; }
    if (/^[-+.0-9]/.test(tok) && !isNaN(parseFloat(tok))) yield { t: "num", v: parseFloat(tok) };
    else yield { t: "op", v: tok };
    i = j;
  }
}

export function readInk(pdfPath) {
  return (async () => {
    const bytes = fs.readFileSync(pdfPath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    const ctx = doc.context;
    const pages = doc.getPages();
    const result = [];
    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      const items = [];
      const walk = (dictNode, contentBuf, depth, ctm) => {
        if (!contentBuf || depth > 6) return;
        const res = dictNode ? dictNode.get(PDFName.of("Resources")) : null;
        const resDict = res instanceof PDFRef ? ctx.lookup(res) : res;
        const fontsRaw = resDict ? resDict.get(PDFName.of("Font")) : null;
        const fonts = fontsRaw instanceof PDFRef ? ctx.lookup(fontsRaw) : fontsRaw;
        const xoRaw = resDict ? resDict.get(PDFName.of("XObject")) : null;
        const xobjs = xoRaw instanceof PDFRef ? ctx.lookup(xoRaw) : xoRaw;
        let stack = []; let curFont = null; let curFontKey = null; let fsz = 0; let charSp = 0; let wordSp = 0; let hScale = 1;
        let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0]; let leading = 0;
        let gs = ctm.slice(); const gsStack = [];
        const mul = (a, b) => [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3], a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]];
        const emit = (buf) => {
          const m = mul(tm, gs);
          let txt = ""; let mapped = true;
          if (curFont && curFont.toUni) {
            if (curFont.twoByte) { for (let k = 0; k + 1 < buf.length; k += 2) { const cd = (buf[k] << 8) | buf[k + 1]; const u = curFont.toUni.get(cd); if (u === undefined) { mapped = false; txt += "�"; } else txt += u; } }
            else { for (const b of buf) { const u = curFont.toUni.get(b); if (u === undefined) { mapped = false; txt += "�"; } else txt += u; } }
          } else { mapped = false; txt = curFont && curFont.twoByte ? "�".repeat(Math.ceil(buf.length / 2)) : buf.toString("latin1"); }
          const nonSpace = buf.filter(b => b !== 32 && b !== 0).length;
          if (buf.length === 0) return;
          // advance width in glyph space /1000, then text space
          let adv1000 = 0;
          if (curFont && curFont.twoByte) {
            for (let k = 0; k + 1 < buf.length; k += 2) { const cd = (buf[k] << 8) | buf[k + 1]; const w = curFont.cidWidths ? curFont.cidWidths.get(cd) : undefined; adv1000 += (w === undefined ? curFont.defaultWidth : w); }
          } else if (curFont && curFont.widths && curFont.widths.length) {
            for (const b of buf) { const idx = b - curFont.firstChar; const w = (idx >= 0 && idx < curFont.widths.length) ? curFont.widths[idx] : null; adv1000 += (w === null || w === undefined ? curFont.missingWidth : w); }
          } else {
            const sfont = stdFontFor(curFont && curFont.baseFont);
            for (const b of buf) { const w = stdWidth(sfont, b); adv1000 += (w === null ? 556 : w); }
          }
          // text-space advance including character and word spacing and horizontal scaling
          const glyphs = curFont && curFont.twoByte ? Math.ceil(buf.length / 2) : buf.length;
          const spaces = curFont && curFont.twoByte ? 0 : buf.filter(b => b === 32).length;
          const advText = ((adv1000 / 1000) * (fsz || 0) + charSp * glyphs + wordSp * spaces) * hScale;
          const scaleX = Math.hypot(m[0], m[1]) || 1;
          const advance = advText * (Math.hypot(gs[0], gs[1]) || 1);
          const widthsKnown = !!(curFont && ((curFont.widths && curFont.widths.length) || curFont.cidWidths)) || !!stdFontFor(curFont && curFont.baseFont);
          items.push({ page: pi + 1, depth, xobject: depth > 0, font: curFontKey, baseFont: curFont && curFont.baseFont, mapped, text: txt, rawHex: buf.toString("hex"), bytes: buf.length, nonSpaceBytes: nonSpace, x: +m[4].toFixed(2), y: +m[5].toFixed(2), size: fsz, advance: +advance.toFixed(2), widthsKnown });
          tm = mul([1, 0, 0, 1, advText, 0], tm);
        };
        for (const tk of tokens(contentBuf)) {
          if (tk.t === "op") {
            const op = tk.v;
            if (op === "BT") { tm = [1,0,0,1,0,0]; tlm = tm.slice(); }
            else if (op === "Tf") { const sz = stack[stack.length - 1]; const nm = stack[stack.length - 2];
              fsz = typeof sz === "number" ? sz : 0; curFontKey = typeof nm === "string" ? nm : null;
              curFont = null;
              if (fonts && curFontKey) { const fr = fonts.get(PDFName.of(curFontKey)); const fd = fr instanceof PDFRef ? ctx.lookup(fr) : fr; if (fd instanceof PDFDict) curFont = fontMap(ctx, fd); }
            }
            else if (op === "Td" || op === "TD") { const ty = stack[stack.length-1], tx = stack[stack.length-2]; if (op === "TD" && typeof ty === "number") leading = -ty; tlm = mul([1,0,0,1,tx||0,ty||0], tlm); tm = tlm.slice(); }
            else if (op === "Tm") { const a = stack.slice(-6); if (a.length===6) { tlm = a.slice(); tm = a.slice(); } }
            else if (op === "T*") { tlm = mul([1,0,0,1,0,-(leading||fsz||12)], tlm); tm = tlm.slice(); }
            else if (op === "Tj" || op === "'" || op === '"') {
              if (op !== "Tj") { tlm = mul([1, 0, 0, 1, 0, -(leading || fsz || 12)], tlm); tm = tlm.slice(); }
              const b = stack.slice().reverse().find(x => Buffer.isBuffer(x)); if (b) emit(b); }
            else if (op === "TJ") { for (const el of stack) { if (Buffer.isBuffer(el)) emit(el); else if (typeof el === "number") tm = mul([1, 0, 0, 1, -(el / 1000) * (fsz || 0) * hScale, 0], tm); } }
            else if (op === "Tc") { const v = stack[stack.length - 1]; if (typeof v === "number") charSp = v; }
            else if (op === "Tw") { const v = stack[stack.length - 1]; if (typeof v === "number") wordSp = v; }
            else if (op === "Tz") { const v = stack[stack.length - 1]; if (typeof v === "number") hScale = v / 100; }
            else if (op === "TL") { const v = stack[stack.length - 1]; if (typeof v === "number") leading = v; }
            else if (op === "cm") { const a = stack.slice(-6); if (a.length===6) gs = mul(a, gs); }
            else if (op === "q") { gsStack.push(gs.slice()); }
            else if (op === "Q") { gs = gsStack.pop() || gs; }
            else if (op === "Do") {
              const nm = stack[stack.length - 1];
              if (xobjs && typeof nm === "string") {
                const xr = xobjs.get(PDFName.of(nm)); const xd = xr instanceof PDFRef ? ctx.lookup(xr) : xr;
                if (xd && xd.dict) {
                  const st = xd.dict.get(PDFName.of("Subtype"));
                  if (st && st.asString() === "/Form") {
                    const inner = decodeStream(ctx, xd);
                    const mtxRaw = xd.dict.get(PDFName.of("Matrix"));
                    let m2 = gs;
                    if (mtxRaw instanceof PDFArray) { const a = mtxRaw.asArray().map(v => v.asNumber ? v.asNumber() : 0); if (a.length===6) m2 = mul(a, gs); }
                    walk(xd.dict, inner, depth + 1, m2);
                  }
                }
              }
            }
            stack = [];
            continue;
          }
          stack.push(tk.t === "name" ? tk.v : tk.v);
          if (stack.length > 64) stack.shift();
        }
      };
      // page content
      let buf = null;
      try {
        const c = page.node.Contents();
        if (c instanceof PDFArray) { const parts = []; for (const r of c.asArray()) { const s = ctx.lookup(r); const d2 = decodeStream(ctx, s); if (d2) parts.push(d2); } buf = Buffer.concat(parts.length ? parts.map(p=>Buffer.concat([p,Buffer.from("\n")])) : [Buffer.alloc(0)]); }
        else if (c) buf = decodeStream(ctx, c);
      } catch {}
      walk(page.node, buf, 0, [1,0,0,1,0,0]);
      const mb = page.getSize();
      result.push({ page: pi + 1, width: mb.width, height: mb.height, items });
    }
    return result;
  })();
}

if (process.argv[1] && process.argv[1].endsWith("pdfink.mjs")) {
  const p = process.argv[2];
  const mode = process.argv[3] || "text";
  const pages = await readInk(p);
  if (mode === "json") { console.log(JSON.stringify(pages)); }
  else if (mode === "unmapped") {
    for (const pg of pages) for (const it of pg.items) if (!it.mapped && it.nonSpaceBytes > 0) console.log(`p${pg.page} d${it.depth} font=${it.font}(${it.baseFont}) x=${it.x} y=${it.y} raw=${it.rawHex.slice(0,60)} txt=${JSON.stringify(it.text.slice(0,60))}`);
  } else {
    for (const pg of pages) { console.log(`--- page ${pg.page} (${pg.items.length} runs) ---`); for (const it of pg.items) if (it.nonSpaceBytes>0) console.log(`  d${it.depth}${it.xobject?"X":" "} ${String(it.x).padStart(8)},${String(it.y).padStart(8)} ${it.mapped?" ":"?"} ${JSON.stringify(it.text)}`); }
  }
}
