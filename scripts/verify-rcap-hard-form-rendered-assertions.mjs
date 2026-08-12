#!/usr/bin/env node
// Lane E — rendered-output assertions and contact sheets.
//
// The output verifier proves structural properties (no XFA, flattened, no
// active content, geometry). It cannot prove that a value landed on the RIGHT
// LINE, which is exactly the class of defect F2 found: a date on the item-7
// deferred-entry line, an offense description in the § 17(d)(2) yes/no column,
// an order with an empty caption, a caption duplicated over pre-printed text,
// and a clerk block filled while the petitioner block stayed blank.
//
// So each family declares assertions over the text of its own flattened
// participant artifact, per fixture:
//
//   mustContain      — text that has to appear (the corrected binding worked)
//   mustNotContain   — text that must never appear (the defect is gone)
//   lineMustNotMatch — a regex over the joined text, for "no date on this line"
//
// Every assertion runs against the bytes the participant would receive, and
// the extracted text of those bytes is written out as a contact sheet so a
// reviewer can read what the packet actually says without a PDF viewer.
//
//   node scripts/verify-rcap-hard-form-rendered-assertions.mjs [--write-contact-sheets]

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFArray, PDFName, PDFDict } from "pdf-lib";
import { renderHardFormPacket } from "./rcap-hard-form-xfa-shadow-fill.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARD_FORMS = path.join(rootDir, "data/rcap-all50/hard-forms");
const WRITE = process.argv.includes("--write-contact-sheets");

const failures = [];
let assertionsRun = 0;
let sheetsWritten = 0;

function findProfiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findProfiles(p));
    else if (entry.name === "profile.json") out.push(p);
  }
  return out;
}

/** Pulls show-operator text out of one decoded stream. */
function textFromStream(stream) {
  if (!stream || typeof stream.getContents !== "function") return [];
  let raw = Buffer.from(stream.getContents());
  try { raw = zlib.inflateSync(raw); } catch { /* plain */ }
  const text = raw.toString("latin1");
  const chunks = [];
  // Three show-operator forms matter here. Flattened field values are written
  // as HEX strings (`<52697665726100> Tj`) — a literal-string-only scan reads
  // the blank official layout and silently reports every filled value missing,
  // which is how this check first passed for the wrong reason.
  const hexToText = (hex) => {
    const clean = hex.replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i + 1 < clean.length; i += 2) {
      const code = parseInt(clean.slice(i, i + 2), 16);
      if (code >= 32 && code < 127) out += String.fromCharCode(code);
    }
    return out;
  };
  const re = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ)|<([0-9A-Fa-f\s]*)>\s*Tj|\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) {
      const t = m[1].replace(/\\([()\\])/g, "$1").replace(/\\247/g, "§");
      if (t.trim()) chunks.push(t);
    } else if (m[2] !== undefined) {
      const t = hexToText(m[2]);
      if (t.trim()) chunks.push(t);
    } else if (m[3] !== undefined) {
      const inner = [...m[3].matchAll(/\(((?:[^()\\]|\\.)*)\)|<([0-9A-Fa-f\s]+)>/g)]
        .map((x) => (x[1] !== undefined ? x[1].replace(/\\([()\\])/g, "$1").replace(/\\247/g, "§") : hexToText(x[2])))
        .join("");
      if (inner.trim()) chunks.push(inner);
    }
  }
  return chunks;
}

/**
 * Per-page text of a rendered document, including flattened field values.
 *
 * Flattening does not inline a widget's text into the page content stream: it
 * draws the field's appearance stream as a Form XObject invoked with `Do`. A
 * page-only scan therefore reads the blank official layout and every
 * assertion about a filled value passes or fails for the wrong reason, so the
 * page's XObject resources are walked too (one level of nesting is enough for
 * these appearances).
 */
function pageTexts(pdfDoc) {
  const pages = [];
  for (const page of pdfDoc.getPages()) {
    const chunks = [];
    const contents = page.node.Contents();
    if (contents) {
      const streams = contents instanceof PDFArray
        ? contents.asArray().map((ref) => page.node.context.lookup(ref))
        : [contents];
      for (const stream of streams) chunks.push(...textFromStream(stream));
    }
    try {
      const resources = page.node.Resources();
      const xobjects = resources?.lookupMaybe?.(PDFName.of("XObject"), PDFDict);
      if (xobjects) {
        for (const key of xobjects.keys()) {
          const xo = xobjects.lookup(key);
          chunks.push(...textFromStream(xo));
          const nested = xo?.dict?.lookupMaybe?.(PDFName.of("Resources"), PDFDict)?.lookupMaybe?.(PDFName.of("XObject"), PDFDict);
          if (nested) for (const k2 of nested.keys()) chunks.push(...textFromStream(nested.lookup(k2)));
        }
      }
    } catch { /* a page without XObject resources is fine */ }
    pages.push(chunks.join(" "));
  }
  return pages;
}

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

for (const profilePath of findProfiles(HARD_FORMS)) {
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const familyDir = path.dirname(profilePath);
  const rel = path.relative(rootDir, familyDir);
  if (!profile.derivedSource || !profile.renderedAssertions) continue;

  const sourceBytes = fs.readFileSync(path.join(rootDir, profile.derivedSource.path));
  const fixtureDir = path.join(familyDir, "fixtures");
  const fixtures = fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).sort();

  const sheetLines = [
    `# Contact sheet — ${profile.form.formId} ${profile.form.officialName}`,
    "",
    `Generated from the actual flattened participant artifact, one section per fixture.`,
    `Profile \`${profile.profileId}\` v${profile.profileVersion}; derived source sha256 \`${profile.derivedSource.sha256.slice(0, 16)}…\`.`,
    "",
    `No rasteriser is available in this environment (no qpdf, mutool, ghostscript or poppler; Playwright ships without browsers), so these sheets are the text of the rendered bytes rather than page images. Visual/typographic review still needs F's own rendering.`,
    "",
  ];

  for (const fixtureFile of fixtures) {
    const fixtureId = fixtureFile.replace(/\.json$/, "");
    const facts = JSON.parse(fs.readFileSync(path.join(fixtureDir, fixtureFile), "utf8"));
    let bytes;
    try {
      ({ bytes } = await renderHardFormPacket({ profile, facts, sourceBytes }));
    } catch (error) {
      failures.push(`${rel}/${fixtureId}: render failed — ${error.message}`);
      continue;
    }
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const texts = pageTexts(doc);
    const joined = norm(texts.join(" "));

    sheetLines.push(`## Fixture: ${fixtureId}`, "");
    if (facts.note) sheetLines.push(`_${facts.note}_`, "");
    for (const [i, t] of texts.entries()) {
      sheetLines.push(`### Page ${i + 1}`, "", "```", norm(t), "```", "");
    }

    const spec = profile.renderedAssertions[fixtureId] || profile.renderedAssertions.all || {};
    const merged = {
      mustContain: [...(profile.renderedAssertions.all?.mustContain || []), ...(spec.mustContain || [])],
      mustNotContain: [...(profile.renderedAssertions.all?.mustNotContain || []), ...(spec.mustNotContain || [])],
      lineMustNotMatch: [...(profile.renderedAssertions.all?.lineMustNotMatch || []), ...(spec.lineMustNotMatch || [])],
    };
    for (const needle of merged.mustContain) {
      assertionsRun += 1;
      if (!joined.includes(norm(needle))) failures.push(`${rel}/${fixtureId}: rendered text is missing "${needle}"`);
    }
    for (const needle of merged.mustNotContain) {
      assertionsRun += 1;
      if (joined.includes(norm(needle))) failures.push(`${rel}/${fixtureId}: rendered text still contains forbidden "${needle}"`);
    }
    for (const pattern of merged.lineMustNotMatch) {
      assertionsRun += 1;
      if (new RegExp(pattern).test(joined)) failures.push(`${rel}/${fixtureId}: rendered text matches forbidden pattern /${pattern}/`);
    }
  }

  const sheetPath = path.join(familyDir, "reports", "contact-sheet.md");
  const serialized = `${sheetLines.join("\n")}\n`;
  if (WRITE) {
    fs.mkdirSync(path.dirname(sheetPath), { recursive: true });
    fs.writeFileSync(sheetPath, serialized);
    sheetsWritten += 1;
  } else if (!fs.existsSync(sheetPath)) {
    failures.push(`${rel}: reports/contact-sheet.md missing (run with --write-contact-sheets)`);
  } else if (fs.readFileSync(sheetPath, "utf8") !== serialized) {
    failures.push(`${rel}: contact sheet drifted from the rendered artifact`);
  }
  console.log(`  ok  ${rel} — ${fixtures.length} fixtures asserted`);
}

if (failures.length > 0) {
  console.error("\nverify-rcap-hard-form-rendered-assertions FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nverify-rcap-hard-form-rendered-assertions passed: ${assertionsRun} assertions over rendered artifacts${WRITE ? `, ${sheetsWritten} contact sheets written` : ""}.`);
