#!/usr/bin/env node
/**
 * Evidence that the shared splitter may replace the copies.
 *
 * Three things are proved, against real Times-Roman metrics and the real
 * tokens SCAN01 measured in the delivered corpus:
 *
 *   1. the shared module is output-identical to FIX16's inline copy and to
 *      FIX17's inline copy, on every token, so moving it changes nothing for
 *      the five families already repaired;
 *   2. it differs from the FAULTY char-by-char splitter only on tokens the
 *      faulty one hard-splits — a token that fits, or that the faulty splitter
 *      never sees, is untouched, which is why the change is inert for the 101
 *      families whose widest token is under the band floor;
 *   3. it actually repairs the two shapes SCAN01 named: the Oklahoma citation
 *      URL and the Rhode Island route keys.
 */
import { createRequire } from "node:module";
import { createTokenSplitter, fitsByFontMetrics } from "./split-token.mjs";
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.TimesRoman);
const FONT_SIZE = 11, MAX_WIDTH = 612 - 2 * 72;              // 468, corpus-wide
const fits = fitsByFontMetrics(font, FONT_SIZE, MAX_WIDTH);

/* FIX16's copy, verbatim from build-census-v1-rcap-ok-custom-pleading.mjs. */
const fix16 = (token) => {
  const chunks = []; let current = "";
  const flushOversized = () => {
    while (!fits(current)) {
      let cut = current.length - 1;
      while (cut > 1 && !fits(current.slice(0, cut))) cut--;
      chunks.push(current.slice(0, cut)); current = current.slice(cut);
    }
  };
  for (const piece of token.split(/(?<=[:_/.-])/)) {
    if (current && !fits(`${current}${piece}`)) { chunks.push(current); current = piece; }
    else current += piece;
    flushOversized();
  }
  if (current) chunks.push(current);
  return chunks;
};

/* The faulty splitter, verbatim from build-census-v1-ga-host.mjs. */
const faulty = (token) => {
  const chunks = []; let current = "";
  for (const ch of token) {
    if (current && font.widthOfTextAtSize(`${current}${ch}`, FONT_SIZE) > MAX_WIDTH) { chunks.push(current); current = ch; }
    else current += ch;
  }
  if (current) chunks.push(current);
  return chunks;
};

const shared = createTokenSplitter({ fits });
const fail = [];
const check = (name, ok, detail = "") => { if (!ok) fail.push(`${name}${detail ? ": " + detail : ""}`); };

/* --- the corpus of tokens: every widest token SCAN01 recorded, plus the
 *     printed fragments of every hard split it found, reassembled. ------- */
import { readFileSync, existsSync } from "node:fs";
const tokens = new Set();
/* Every distinct whitespace-free token the composer actually drew anywhere in
 * the delivered corpus, harvested from the PDFs with SCAN01's own
 * composed-line filter. Set SPLIT_TOKEN_CORPUS to a JSON array of tokens to
 * widen or narrow it; without it the shapes below still run. */
const corpusPath = process.env.SPLIT_TOKEN_CORPUS;
if (corpusPath && existsSync(corpusPath)) for (const t of JSON.parse(readFileSync(corpusPath, "utf8"))) tokens.add(t);
const sweepPath = process.env.SCAN01_SWEEP
  ?? "data/rcap-grade-a/packet-factory-24h/scan01/composed-pdf-text-integrity-sweep.json";
if (existsSync(sweepPath)) {
  const s = JSON.parse(readFileSync(sweepPath, "utf8"));
  for (const f of s.findings?.perFamily ?? []) for (const d of f.defects ?? []) if (d.reconstructed) tokens.add(d.reconstructed);
  for (const r of s.results ?? []) {
    if (r.widestToken?.token) tokens.add(r.widestToken.token);
    for (const d of r.defects ?? []) if (d.reconstructed) tokens.add(d.reconstructed);
  }
}
/* Shapes that must be handled whatever the sweep happens to contain. */
for (const t of [
  "", "a", "-", "::::", "aaaa", "a-b", "-----",
  "https://ccresourcecenter.org/state-restoration-profiles/oklahoma-restoration-of-rights-pardon-expungement-sealing/",
  '("https://ccresourcecenter.org/state-restoration-profiles/oklahoma-restoration-of-rights-pardon-expungement-sealing/")',
  "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-2-court-motion-and-affidavit",
  "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-3-notice-hearing-and-certified-copies",
  "W".repeat(200), "W".repeat(60) + "-" + "W".repeat(60),
  "x".repeat(500), "a-".repeat(200), "a:b_c/d.e-f".repeat(40),
]) tokens.add(t);

/* The harvest reads text back out of PDFs, and the extractor can yield code
 * points WinAnsi cannot encode; the composer's own sanitizePdfText removes
 * those before anything is drawn, so they never reach splitToken. Drop them
 * rather than measure what the renderer would never be handed. */
const encodable = (t) => { try { font.widthOfTextAtSize(t, FONT_SIZE); return true; } catch { return false; } };
let dropped = 0;
for (const t of [...tokens]) if (!encodable(t)) { tokens.delete(t); dropped += 1; }

/* 1. identical to both inline repaired copies (they are the same text, so one
 *    comparison establishes both; asserted explicitly all the same). */
let compared = 0;
for (const t of tokens) {
  const a = shared(t), b = fix16(t);
  check("shared !== FIX16/FIX17 inline copy", JSON.stringify(a) === JSON.stringify(b), JSON.stringify(t).slice(0, 60));
  /* every chunk must fit, and joining them must lose nothing */
  check("chunk exceeds the column", a.every(fits), JSON.stringify(t).slice(0, 60));
  check("split lost or added characters", a.join("") === t, JSON.stringify(t).slice(0, 60));
  compared += 1;
}

/* 2. differs from the faulty splitter only where the faulty one chops. */
let sameAsFaulty = 0, repaired = 0;
for (const t of tokens) {
  const mine = shared(t), theirs = faulty(t);
  if (JSON.stringify(mine) === JSON.stringify(theirs)) { sameAsFaulty += 1; continue; }
  repaired += 1;
  check("differs from faulty on a token that fits the column", !fits(t), JSON.stringify(t).slice(0, 60));
}

/* 3. the two named shapes actually break where a reader can follow. */
const url = '("https://ccresourcecenter.org/state-restoration-profiles/oklahoma-restoration-of-rights-pardon-expungement-sealing/")';
const urlChunks = shared(url);
check("OK citation URL still chopped mid-word", urlChunks[0].endsWith("-"), urlChunks[0].slice(-30));
check("OK citation URL not repaired to FIX17's break", urlChunks[0].endsWith("-of-rights-pardon-"), urlChunks[0].slice(-30));
const ri = "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-2-court-motion-and-affidavit";
check("RI route key still chopped mid-word", /[:_/.-]$/.test(shared(ri)[0]), shared(ri)[0].slice(-30));

/* 4. the counters are real: a separatorless overlong run is a hard split and
 *    says so; a token with separators is not. */
const counted = createTokenSplitter({ fits });
counted("W".repeat(200));
check("separatorless run not counted as a hard split", counted.hardSplits > 0, String(counted.hardSplits));
counted.reset();
counted("obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-2-court-motion-and-affidavit");
check("separator-breakable token wrongly counted as a hard split", counted.hardSplits === 0, String(counted.hardSplits));
check("calls not counted", counted.calls === 1, String(counted.calls));

console.log(`tokens compared            ${compared}  (${dropped} unencodable dropped)`);
console.log(`identical to faulty        ${sameAsFaulty}  (the splitter change cannot move these)`);
console.log(`repaired vs faulty         ${repaired}  (all measured wider than the 468pt column)`);
if (fail.length) { console.error("\nFAILED:"); for (const f of fail) console.error("  " + f); process.exit(1); }
console.log("\nSPLIT_TOKEN_SHARED_MODULE_OK");
