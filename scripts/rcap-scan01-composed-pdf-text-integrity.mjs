#!/usr/bin/env node
//
// SCAN01: a corpus-wide measurement of composed-PDF text integrity.
//
// This script measures. It repairs nothing, and it writes nothing outside its
// own report directory.
//
// WHY IT MEASURES TOKENS AND NOT PAGES
//
// renderComposedPdf is copy-pasted into ~91 build scripts and splitToken into
// ~99. One of the faults in those copies is invisible to every check the tree
// has: splitToken chopped an unbreakable token at whichever character first
// reached the margin, so a URL shipped as
//
//   ("https://ccresourcecenter.org/...-pardon-expungeme
//   nt-sealing/")
//
// with both neighbouring pages perfectly healthy. A page-line census sees a
// full page. A completeness counter sees every character present. A raster gate
// sees ink where ink belongs. Only a measurement of the TOKEN catches it.
//
// The instrument is FIX17's, generalised. Every composed line is drawn by the
// composer at x = margin = 72, size 11, in Times-Roman, on a 14.5pt ladder from
// y = 720. The column is therefore exactly 612 - 2*72 = 468pt, uniformly, in
// all 91 copies (verified: every copy carries fontSize 11 / width 612 /
// margin 72 / StandardFonts.TimesRoman). A whitespace-free token measured with
// those metrics can only land in the band just below 468pt if a splitter cut it
// there: the buggy splitToken emits the maximal prefix that fits, so its chunk
// width W satisfies W <= 468 and W + width(next glyph) > 468. The widest
// Times-Roman glyph at 11pt is 'W' at 10.38pt, so a hard-split fragment lands in
// (457.6, 468] BY CONSTRUCTION. A natural word or route key landing there by
// chance is a coincidence the corpus distribution can be checked against.
//
// The width test is corroborated structurally, never used alone:
//   * the fragment is followed by more text (it "resumes"), and
//   * appending the next glyph would have overflowed the column -- the exact
//     signature of the cut, not merely a wide token, and
//   * the fragment does not end on one of the token's own separators
//     ( : _ / . - ), which is where the REPAIRED splitToken breaks.
//
// A token carrying no separator anywhere is hard-split even by the repaired
// splitter. Those are reported separately as unavoidable, not as a defect.

import { createRequire } from "node:module";
import { readdirSync, readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

const ROOT = process.env.SCAN01_ROOT ?? process.cwd();
const CENSUS = join(ROOT, "data/rcap-all50/overlays/census-v1");

// The renderer's own geometry, identical in all 91 copies.
const PAGE_W = 612, PAGE_H = 792, MARGIN = 72, FONT_SIZE = 11, LINE_HEIGHT = 14.5;
const COLUMN = PAGE_W - 2 * MARGIN;            // 468
const LADDER_TOP = PAGE_H - MARGIN;            // 720

// FIX17 measured the thinnest legitimate page in a repaired family at 8 lines,
// against 4- and 5-line fragment pages before repair.
const THIN_PAGE_LINES = 8;
const FRAGMENT_PAGE_LINES = 5;

const SEPARATORS = /[:_/.\-]/;
const ENDS_ON_SEPARATOR = /[:_/.\-]$/;
const TRAILER = /^Route:\s/;
const HEADINGISH = /^([A-Z][A-Z0-9 .,'()\-]{3,}|[A-Z]\.\s|\[|\(|•|\d+\.\s)/;
const LABELLED = /^[A-Z][A-Z0-9 .'\-]{2,}:\s*\S/;

let FONT = null;
async function font() {
  if (FONT) return FONT;
  const d = await PDFDocument.create();
  FONT = await d.embedFont(StandardFonts.TimesRoman);
  return FONT;
}
const widthOf = (s) => FONT.widthOfTextAtSize(s, FONT_SIZE);

// Widest Times-Roman glyph at 11pt, computed rather than assumed.
function widestGlyph() {
  let max = 0;
  for (let c = 32; c < 127; c++) {
    const w = widthOf(String.fromCharCode(c));
    if (w > max) max = w;
  }
  return max;
}

// ---------------------------------------------------------------- enumeration

function familyDirs() {
  const out = [];
  for (const st of readdirSync(CENSUS).sort()) {
    const sd = join(CENSUS, st);
    if (!statSync(sd).isDirectory()) continue;
    for (const f of readdirSync(sd).sort()) {
      const fd = join(sd, f);
      if (!statSync(fd).isDirectory()) continue;
      let familyId = null;
      for (const meta of ["source-receipt.json", "build-status.json", "build-findings.json"]) {
        const p = join(fd, meta);
        if (!existsSync(p)) continue;
        try { const j = JSON.parse(readFileSync(p, "utf8")); if (j.familyId) { familyId = j.familyId; break; } } catch { /* unreadable metadata */ }
      }
      out.push({ state: st, dirName: f, dir: relative(ROOT, fd), familyId: familyId ?? f.replace(/--[^-]*$/, ""), kind: f.replace(/^.*--/, "") });
    }
  }
  return out;
}

function pdfsUnder(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (n.toLowerCase().endsWith(".pdf")) out.push(p);
    }
  };
  walk(join(dir, "fixtures"));
  return out;
}

function builderIndex() {
  const SD = join(ROOT, "scripts");
  const map = new Map();
  for (const n of readdirSync(SD)) {
    if (!n.startsWith("build-census-v1-") || !n.endsWith(".mjs")) continue;
    const src = readFileSync(join(SD, n), "latin1");
    map.set(n, { name: n, src, composed: src.includes("renderComposedPdf"), splitToken: src.includes("splitToken") });
  }
  return map;
}

// Many builders do not carry a composer at all: they import one. Following the
// import is the difference between "ninety independent copies" and a much
// smaller number of shared hosts, which is the whole question a consolidation
// decision turns on. Resolved one level deep, which covers every case in the
// tree.
const MODULE_CACHE = new Map();
function readModule(rel) {
  if (MODULE_CACHE.has(rel)) return MODULE_CACHE.get(rel);
  const p = join(ROOT, "scripts", rel);
  const src = existsSync(p) ? readFileSync(p, "latin1") : null;
  MODULE_CACHE.set(rel, src);
  return src;
}
function resolveComposerSources(info) {
  // The builder's own source, plus any locally imported module that defines a
  // splitToken -- that module is the copy the family's text actually goes through.
  const out = [{ module: info.name, src: info.src }];
  const hosts = [];
  for (const m of info.src.match(/from "\.\/[A-Za-z0-9_./:-]+\.mjs"/g) || []) {
    const rel = m.replace(/^from "/, "").replace(/"$/, "").replace(/^\.\//, "");
    const src = readModule(rel);
    if (src && /splitToken/.test(src)) { out.push({ module: rel, src }); hosts.push(rel); }
  }
  return { sources: out, importedComposerHosts: hosts };
}

function classifyBuilder(infos) {
  // Which pagination algorithm and which splitToken these copies carry, after
  // following imports to the module that actually holds the composer.
  const resolved = infos.map(resolveComposerSources);
  const sources = resolved.flatMap((r) => r.sources);
  const importedHosts = [...new Set(resolved.flatMap((r) => r.importedComposerHosts))];
  const s = sources.map((x) => x.src).join("\n");

  const markers = [];
  if (/Rule 1b|closing execution unit/.test(s)) markers.push("nd-block-rule-1b");
  if (/layout\.lineHeight/.test(s)) markers.push("per-component-line-height");
  if (/soleOccupant/.test(s)) markers.push("fix16-trailer-sole-occupant-pulldown");
  if (/settled layout|simulateLayout|collapse blank|collapseBlank/i.test(s)) markers.push("simulate-and-collapse");
  if (/componentId === "proposed_order"/.test(s)) markers.push("nevada-component-suppression");

  const separatorAware = /\.split\(\/\(\?<=\[[:\\/._\-]+\]\)\//.test(s);
  const charByChar = /for \(const (ch|char) of (tok|token)\)/.test(s);
  const hasSplitToken = /splitToken/.test(s);
  const splitTokenVariant = !hasSplitToken ? "none"
    : separatorAware ? "separator-aware (repaired)"
    : charByChar ? "char-by-char (fault 1 present)"
    : "unclassified";

  const blockAware = /const blocks|gatherBlock|blockOf|block-aware|blocksOf/i.test(s);
  const composerFns = [...new Set((s.match(/async function (render[A-Za-z]*)/g) || []).map((m) => m.replace("async function ", "")))];
  // The module the family's composed text actually goes through.
  const composerModule = importedHosts.length ? importedHosts[0] : (hasSplitToken ? infos[0]?.name ?? null : null);

  return {
    composerModule,
    importedComposerHosts: importedHosts,
    ownsItsComposer: importedHosts.length === 0 && hasSplitToken,
    composerFunctions: composerFns,
    splitTokenVariant,
    paginationMarkers: markers,
    blockAwarePagination: blockAware,
    generation: splitTokenVariant === "separator-aware (repaired)"
      ? (markers.includes("nd-block-rule-1b") ? "G3 repaired incl. Rule 1b" : "G2 splitter repaired, no Rule 1b")
      : splitTokenVariant === "none" ? "GX no composer found"
      : (blockAware ? "G1 block-aware pagination, original splitter" : "G0 original row-by-row, original splitter")
  };
}

// ------------------------------------------------------------------ measuring

function composedLinesOfPage(page) {
  const lines = groupIntoLines(extractTextItems(page));
  const composed = [];
  let other = 0;
  for (const l of lines) {
    const k = (LADDER_TOP - l.y) / LINE_HEIGHT;
    const onLadder = l.y <= LADDER_TOP + 0.5 && Math.abs(k - Math.round(k)) < 0.02;
    if (Math.abs(l.size - FONT_SIZE) < 0.01 && Math.abs(l.x - MARGIN) < 0.01 && onLadder) composed.push(l);
    else other++;
  }
  composed.sort((a, b) => b.y - a.y);
  return { composed, otherLineCount: other };
}

const lastToken = (t) => { const m = /(\S+)$/.exec(t); return m ? m[1] : ""; };
const firstToken = (t) => { const m = /^(\S+)/.exec(t); return m ? m[1] : ""; };

function scanPdf(absPath, relPath, band) {
  return PDFDocument.load(readFileSync(absPath), { updateMetadata: false, ignoreEncryption: true }).then((doc) => {
    const pages = doc.getPages();
    const stream = [];       // every composed line, in reading order
    const pageInfo = [];
    for (let i = 0; i < pages.length; i++) {
      const { composed, otherLineCount } = composedLinesOfPage(pages[i]);
      pageInfo.push({ page: i + 1, composedLines: composed.length, otherLines: otherLineCount, lines: composed.map((l) => l.text) });
      for (let j = 0; j < composed.length; j++) stream.push({ page: i + 1, indexOnPage: j, text: composed[j].text, y: composed[j].y });
    }

    const defects = [];
    let tokensMeasured = 0;
    let widestToken = { width: 0, token: null, page: null };

    // ---- 1. hard-split tokens, reconstructed across line and page boundaries
    for (let i = 0; i < stream.length; i++) {
      const line = stream[i];
      for (const tok of line.text.split(/\s+/)) {
        if (!tok) continue;
        tokensMeasured++;
        const w = widthOf(tok);
        if (w > widestToken.width) widestToken = { width: Number(w.toFixed(2)), token: tok, page: line.page };
      }
      const a = lastToken(line.text);
      if (!a) continue;
      const wA = widthOf(a);
      if (wA <= band.low) continue;                       // not in the cut band
      const next = stream[i + 1];
      if (!next) continue;                                // nothing to resume into
      const b = firstToken(next.text);
      if (!b) continue;
      const wWithNextGlyph = widthOf(a + b[0]);
      if (wWithNextGlyph <= COLUMN) continue;             // wide, but not a cut
      const endsOnSeparator = ENDS_ON_SEPARATOR.test(a);
      // Reconstruct as far as the fragments run.
      let reconstructed = a + b;
      let k = i + 1;
      while (k + 1 < stream.length && /^\S+$/.test(stream[k].text.trim()) === false) break;
      const hasSeparator = SEPARATORS.test(reconstructed);
      const kind = endsOnSeparator
        ? "split-at-own-separator"
        : (hasSeparator ? "HARD_SPLIT_MID_TOKEN" : "HARD_SPLIT_NO_SEPARATOR_AVAILABLE");
      if (kind === "split-at-own-separator") continue;    // the repaired behaviour
      defects.push({
        class: "A_hard_split",
        defect: kind === "HARD_SPLIT_MID_TOKEN" ? "hard_split_token" : "hard_split_token_unavoidable",
        file: relPath,
        page: line.page,
        continuesOnPage: next.page,
        acrossPageBreak: next.page !== line.page,
        printedAs: [a, b],
        reconstructed,
        measuredWidthPt: Number(wA.toFixed(2)),
        columnWidthPt: COLUMN,
        marginToColumnPt: Number((COLUMN - wA).toFixed(2)),
        widthWithNextGlyphPt: Number(wWithNextGlyph.toFixed(2)),
        evidence: `fragment measures ${wA.toFixed(2)}pt against a ${COLUMN}pt column; adding the next glyph would measure ${wWithNextGlyph.toFixed(2)}pt, which overflows -- the signature of a cut at the margin rather than a natural fit`,
        repairable: kind === "HARD_SPLIT_MID_TOKEN"
      });
    }

    // ---- 2. route-key-only and fragment pages
    //
    // The trailer can itself wrap: "Route:" on one drawn line and the key on the
    // next. A page carrying only those is still a page whose entire content is
    // the internal route key.
    const isTrailerish = (t) => { const b = t.replace(/\s*;\s*$/, "").trim(); return TRAILER.test(b) || (/^\S+$/.test(b) && b.includes(":") && !/[.?!]$/.test(b)); };
    for (const p of pageInfo) {
      if (p.composedLines === 0) {
        if (p.otherLines === 0) defects.push({ class: "B_page_content", defect: "empty_page", file: relPath, page: p.page, evidence: "page draws no text at all" });
        continue;
      }
      const nonBlank = p.lines.filter((t) => t.trim());
      if (nonBlank.length > 0 && nonBlank.every(isTrailerish)) {
        defects.push({
          class: "B_page_content", defect: "route_key_only_page", file: relPath, page: p.page,
          printedAs: nonBlank, composedLineCount: p.composedLines,
          evidence: "the page's entire participant-facing content is the internal route key"
        });
        continue;
      }
      if (p.otherLines !== 0) continue;                 // a mixed page carries an official form too
      if (p.composedLines <= FRAGMENT_PAGE_LINES) {
        defects.push({
          class: "B_page_content", defect: "fragment_page", file: relPath, page: p.page,
          composedLineCount: p.composedLines, printedAs: nonBlank,
          evidence: `${p.composedLines} drawn lines against a thinnest-legitimate-page benchmark of ${THIN_PAGE_LINES}`
        });
      } else if (p.composedLines < THIN_PAGE_LINES) {
        // Census only. A short page that is the tail of a long component is not
        // by itself wrong, and calling it a defect would inflate the worklist.
        defects.push({
          class: "D_census", defect: "thin_page", file: relPath, page: p.page,
          composedLineCount: p.composedLines, printedAs: nonBlank,
          evidence: `${p.composedLines} drawn lines, under the ${THIN_PAGE_LINES}-line benchmark but above the fragment threshold; recorded as census, not asserted as a defect`
        });
      }
    }

    // ---- 3. stranded trailers and widowed blocks across page breaks
    for (let pi = 1; pi < pageInfo.length; pi++) {
      const prev = pageInfo[pi - 1].lines.filter((t) => t.trim());
      const cur = pageInfo[pi].lines.filter((t) => t.trim());
      if (!prev.length || !cur.length) continue;
      const prevLast = prev[prev.length - 1];
      const curFirst = cur[0];

      // a labelled value whose wrapped remainder opens the next page
      if (LABELLED.test(prevLast) && !HEADINGISH.test(curFirst) && !TRAILER.test(curFirst)
          && widthOf(prevLast) > COLUMN - 40
          && widthOf(curFirst) < COLUMN * 0.6) {
        defects.push({
          class: "C_block_integrity", defect: "widowed_labelled_value", file: relPath, page: pageInfo[pi].page,
          printedAs: [prevLast, curFirst],
          evidence: `page ${pageInfo[pi - 1].page} ends on the labelled line "${prevLast}" (measuring ${widthOf(prevLast).toFixed(2)}pt of a ${COLUMN}pt column) and page ${pageInfo[pi].page} opens on its remainder`
        });
      }

      // the closing execution unit torn apart: contact details opening a page
      // with no signature line to say what they execute
      const contact = /^(PRINTED NAME|MAILING ADDRESS|TELEPHONE|EMAIL)\b/;
      if (contact.test(curFirst) && !cur.some((t) => /SIGNATURE OF/i.test(t))
          && prev.some((t) => /SIGNATURE OF/i.test(t))) {
        defects.push({
          class: "C_block_integrity", defect: "orphaned_execution_block", file: relPath, page: pageInfo[pi].page,
          printedAs: cur.slice(0, 6),
          evidence: `page opens on "${curFirst}" while the signature line it executes is on page ${pageInfo[pi - 1].page}`
        });
      }
    }

    return {
      file: relPath,
      pageCount: pages.length,
      composedPageCount: pageInfo.filter((p) => p.composedLines > 0).length,
      composedLineCount: stream.length,
      tokensMeasured,
      widestToken,
      defects
    };
  });
}

// ---------------------------------------------------------------------- main

async function main() {
  await font();
  const band = { low: COLUMN - widestGlyph(), high: COLUMN, widestGlyphPt: Number(widestGlyph().toFixed(3)) };
  const builders = builderIndex();
  const only = process.env.SCAN01_ONLY ? process.env.SCAN01_ONLY.split(",") : null;
  const fams = familyDirs().filter((f) => !only || only.some((o) => f.dir.includes(o)));

  const results = [];
  for (const fam of fams) {
    const byName = `build-census-v1-${fam.familyId}.mjs`;
    let hits = builders.has(byName) ? [builders.get(byName)]
      : [...builders.values()].filter((s) => s.src.includes(fam.dir) || s.src.includes(fam.familyId));
    fam.builders = hits.map((h) => h.name);
    fam.builderUsesRenderComposedPdf = hits.some((h) => h.composed);
    fam.builderUsesSplitToken = hits.some((h) => h.splitToken);
    fam.builderProfile = hits.length ? classifyBuilder(hits) : null;

    const pdfs = pdfsUnder(join(ROOT, fam.dir));
    const files = [];
    for (const abs of pdfs) {
      try { files.push(await scanPdf(abs, relative(ROOT, abs), band)); }
      catch (e) { files.push({ file: relative(ROOT, abs), unreadable: true, reason: String(e && e.message || e) }); }
    }
    const readable = files.filter((f) => !f.unreadable);
    const shipsComposed = readable.some((f) => f.composedLineCount > 0);
    results.push({
      ...fam,
      shipsComposedPdf: shipsComposed,
      fixtureCount: files.length,
      unreadable: files.filter((f) => f.unreadable),
      pageCount: readable.reduce((a, f) => a + f.pageCount, 0),
      composedPageCount: readable.reduce((a, f) => a + f.composedPageCount, 0),
      composedLineCount: readable.reduce((a, f) => a + f.composedLineCount, 0),
      tokensMeasured: readable.reduce((a, f) => a + f.tokensMeasured, 0),
      widestToken: readable.reduce((best, f) => (f.widestToken && f.widestToken.width > (best?.width ?? 0) ? { ...f.widestToken, file: f.file } : best), null),
      defects: readable.flatMap((f) => f.defects),
      files: readable.map((f) => ({ file: f.file, pageCount: f.pageCount, composedPageCount: f.composedPageCount, composedLineCount: f.composedLineCount, tokensMeasured: f.tokensMeasured, widestToken: f.widestToken, defectCount: f.defects.length }))
    });
    process.stderr.write(`${results.length}/${fams.length} ${fam.dir} ships=${shipsComposed} defects=${results[results.length - 1].defects.length}\n`);
  }

  return { band, results };
}

const out = await main();
const outArg = process.env.SCAN01_OUT ?? "data/rcap-grade-a/packet-factory-24h/scan01/raw-sweep.json";
const dest = isAbsolute(outArg) ? outArg : join(ROOT, outArg);
mkdirSync(join(dest, ".."), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 1));
process.stderr.write(`wrote ${dest}\n`);
