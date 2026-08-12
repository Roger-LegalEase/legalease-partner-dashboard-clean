#!/usr/bin/env node
// Lane E — output acceptance for hard-form packets.
//
// Renders every fixture of every hard-form profile and proves the acceptance
// contract on the produced bytes, not on the renderer's own report:
//
//   - no active XFA remains;
//   - no interactive form fields remain (the packet is flattened);
//   - no JavaScript, launch, open, additional-action or submit action remains;
//   - expected page count and page geometry;
//   - required official text anchors survive;
//   - protected fields are never populated (enforced at render, re-asserted here
//     by proving the profile binds none of them);
//   - a stable output fingerprint per fixture, so a later run that changes the
//     bytes has to explain itself.
//
//   node scripts/verify-rcap-hard-form-outputs.mjs [--write-fingerprints]

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";
import { renderHardFormPacket, scanAnnotationActions } from "./rcap-hard-form-xfa-shadow-fill.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARD_FORMS = path.join(rootDir, "data/rcap-all50/hard-forms");
const WRITE = process.argv.includes("--write-fingerprints");

const failures = [];
const results = [];

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

/** Raw-byte active content scan, independent of any PDF object model. */
function rawActiveContent(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  const hits = {};
  for (const token of ["/XFA", "/JavaScript", "/JS", "/Launch", "/SubmitForm", "/ImportData", "/OpenAction", "/RichMedia", "/Movie", "/Sound"]) {
    const n = (raw.match(new RegExp(token.replace("/", "\\/"), "g")) || []).length;
    if (n > 0) hits[token] = n;
  }
  return hits;
}

/**
 * Text of every page, read out of the decompressed content streams.
 *
 * Page content is Flate-compressed, so a raw byte scan finds nothing and an
 * anchor check built on one would pass vacuously. Streams are inflated, then
 * both literal `(...)` and hex `<...>` show-operators are decoded, including
 * the array form used by TJ.
 */
function extractText(pdfDoc) {
  const chunks = [];
  for (const page of pdfDoc.getPages()) {
    const contents = page.node.Contents();
    if (!contents) continue;
    const streams = contents instanceof PDFArray
      ? contents.asArray().map((ref) => page.node.context.lookup(ref))
      : [contents];
    for (const stream of streams) {
      if (!stream || typeof stream.getContents !== "function") continue;
      let raw = Buffer.from(stream.getContents());
      try {
        raw = zlib.inflateSync(raw);
      } catch {
        try { raw = zlib.inflateRawSync(raw); } catch { /* already plain */ }
      }
      const text = raw.toString("latin1");
      const re = /\(((?:[^()\\]|\\.)*)\)|<([0-9A-Fa-f\s]+)>/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[1] !== undefined) {
          chunks.push(m[1].replace(/\\([()\\])/g, "$1"));
        } else if (m[2] !== undefined) {
          const hex = m[2].replace(/\s+/g, "");
          let s = "";
          for (let i = 0; i + 1 < hex.length; i += 2) {
            const code = parseInt(hex.slice(i, i + 2), 16);
            if (code >= 32 && code < 127) s += String.fromCharCode(code);
          }
          chunks.push(s);
        }
      }
    }
  }
  return chunks.join(" ");
}

/**
 * Page text with coordinates, so a bound value can be checked against the
 * label actually printed above or beside its widget.
 *
 * A LiveCycle field name is not evidence of what a column asks for — CR-180's
 * `Offense1` sits under the printed header "Eligible for reduction to
 * infraction under Penal Code, § 17(d)(2) (yes or no)". Only geometry settles
 * it, so text is collected with the x/y from the preceding Td/TD/Tm operator.
 */
function extractPositionedText(pdfDoc, pageIndex) {
  const page = pdfDoc.getPages()[pageIndex];
  if (!page) return [];
  const contents = page.node.Contents();
  if (!contents) return [];
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => page.node.context.lookup(ref))
    : [contents];
  const items = [];
  for (const stream of streams) {
    if (!stream || typeof stream.getContents !== "function") continue;
    let raw = Buffer.from(stream.getContents());
    try { raw = zlib.inflateSync(raw); } catch { /* plain */ }
    const text = raw.toString("latin1");
    const re = /([-\d.]+)\s+([-\d.]+)\s+(?:Td|TD)|([-\d.]+)\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+Tm|\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let m;
    let x = 0;
    let y = 0;
    while ((m = re.exec(text)) !== null) {
      if (m[1] !== undefined) { x = Number(m[1]); y = Number(m[2]); }
      else if (m[4] !== undefined) { x = Number(m[4]); y = Number(m[5]); }
      else if (m[6] !== undefined && m[6].trim()) {
        items.push({ x, y, text: m[6].replace(/\\([()\\])/g, "$1") });
      }
    }
  }
  return items;
}

/** Normalizes for label comparison: lowercase, collapse whitespace, drop punctuation noise. */
const normLabel = (s) => String(s).toLowerCase().replace(/\\247/g, "§").replace(/[^a-z0-9§()]+/g, " ").trim();

const profiles = findProfiles(HARD_FORMS);
if (profiles.length === 0) {
  console.error("verify-rcap-hard-form-outputs: no profiles found under data/rcap-all50/hard-forms/");
  process.exit(1);
}

for (const profilePath of profiles) {
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const familyDir = path.dirname(profilePath);
  const rel = path.relative(rootDir, familyDir);

  if (profile.strategy?.tier === "exact_supported_deferral" || profile.strategy?.tier === "deliberate_scope_exclusion") {
    // Non-packet terminal treatments render nothing; their discipline is checked
    // by verify-rcap-hard-form-dispositions.mjs instead.
    continue;
  }

  const sourcePath = path.join(rootDir, profile.derivedSource.path);
  if (!fs.existsSync(sourcePath)) {
    failures.push(`${rel}: derived source ${profile.derivedSource.path} is not in the tree`);
    continue;
  }
  const sourceBytes = fs.readFileSync(sourcePath);
  const actualSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (actualSha !== profile.derivedSource.sha256) {
    failures.push(`${rel}: derived source drift — profile pins ${profile.derivedSource.sha256.slice(0, 12)}, tree has ${actualSha.slice(0, 12)}`);
    continue;
  }

  // A profile may never bind a protected field.
  const protectedSet = new Set(profile.protectedFields || []);
  for (const binding of profile.bindings || []) {
    if (protectedSet.has(binding.field)) failures.push(`${rel}: profile binds protected field ${binding.field}`);
  }

  // Checkout prohibition has to be a machine-checked fact, not prose in a
  // handoff. A packet family that renders a filing is not sellable until its
  // route is wired and independently approved, so the profile must say so in a
  // field a verifier can read.
  if (profile.checkoutProhibited !== true) {
    failures.push(`${rel}: profile does not carry checkoutProhibited: true`);
  }

  // Participant-facing strings must ship in both languages. Parity is checked
  // key by key, because an es block that silently omits a key is the same
  // defect as having no es block at all.
  const en = profile.participantFacingStrings?.en;
  const es = profile.participantFacingStrings?.es;
  if (!en || !es) {
    failures.push(`${rel}: participantFacingStrings must carry both en and es`);
  } else {
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();
    if (enKeys.join("|") !== esKeys.join("|")) {
      failures.push(`${rel}: en/es key parity broken (en: ${enKeys.join(",")} | es: ${esKeys.join(",")})`);
    }
    for (const k of enKeys) {
      if (typeof es[k] !== "string" || es[k].trim().length === 0) failures.push(`${rel}: es.${k} is empty`);
      if (typeof en[k] === "string" && es[k] === en[k]) failures.push(`${rel}: es.${k} is identical to en.${k} — untranslated`);
    }
  }

  // Field-census cross-check: a binding must name a field the census carries,
  // and its declared page must match. A profile that drifts from the census is
  // binding by name alone, which is how a value lands in the wrong column.
  const censusPath = path.join(familyDir, "field-census.json");
  let census = null;
  if (fs.existsSync(censusPath)) {
    census = JSON.parse(fs.readFileSync(censusPath, "utf8"));
    // The label assertions read the SOURCE page text, so the source document is
    // attached to the census object for the checks below.
    census.__doc = await PDFDocument.load(sourceBytes, { updateMetadata: false });
    const byName = new Map((census.fields || []).map((f) => [f.name, f]));
    for (const binding of profile.bindings || []) {
      const cf = byName.get(binding.field);
      if (!cf) {
        failures.push(`${rel}: binding ${binding.field} is absent from field-census.json`);
        continue;
      }
      if (cf.class === "protected") failures.push(`${rel}: binding ${binding.field} is classified protected in the census`);

      // Column/label assertion. A binding may declare the printed text that
      // must sit above or beside its widget; the assertion is checked against
      // the source page's own content stream, so a value cannot be bound into
      // a column whose header says something else.
      // Geometric column assertion. Text position is only recoverable where a
      // page sets absolute Tm matrices; CR-180 emits relative Td offsets that
      // accumulate from a scaled Tm, so label proximity cannot be computed
      // there without a full text-state machine. Column identity, however, is
      // unambiguous from the widget rect: the profile declares which printed
      // column it believes it fills and at what x the census puts it, and both
      // must agree. This is the check that catches a value bound into the
      // neighbouring column under a misleading LiveCycle field name.
      if (binding.columnCheck) {
        const want = Number(binding.columnCheck.x);
        const got = Number((cf.rect || {}).x);
        if (!Number.isFinite(want) || !Number.isFinite(got) || Math.abs(want - got) > 0.5) {
          failures.push(
            `${rel}: binding ${binding.field} declares column "${binding.columnCheck.header}" at x=${want}, census rect is x=${got}`
          );
        }
      }

      if (binding.printedLabelMustContain) {
        const sourceDoc = census.__doc;
        const items = sourceDoc ? extractPositionedText(sourceDoc, cf.page ?? 0) : [];
        const rect = cf.rect || {};
        // Header text for a table column sits above the widget and overlaps it
        // horizontally; a row label sits to the left on the same line.
        // Label placement is not uniform: a table header prints above its
        // column, while CA identity sublabels ("Last", "First", "Middle",
        // "Street", "City") print directly BENEATH their boxes. Searching only
        // upward would fail those honestly-bound fields, so the window covers
        // both directions and instead tightens horizontally to the widget's own
        // column.
        const near = items.filter((it) => {
          const inColumn = it.x >= rect.x - 12 && it.x <= rect.x + (rect.width || 0) + 12;
          const vertical = Math.abs(it.y - rect.y) <= 45;
          const sameLine = Math.abs(it.y - rect.y) <= 6 && it.x < rect.x;
          return (inColumn && vertical) || sameLine;
        });
        const blob = normLabel(near.map((n) => n.text).join(" "));
        const want = normLabel(binding.printedLabelMustContain);
        if (!blob.includes(want)) {
          failures.push(
            `${rel}: binding ${binding.field} declares printed label "${binding.printedLabelMustContain}" but the text near its rect reads "${blob.slice(0, 120)}"`
          );
        }
      }
      if (binding.printedLabelMustNotContain) {
        const sourceDoc = census.__doc;
        const items = sourceDoc ? extractPositionedText(sourceDoc, cf.page ?? 0) : [];
        const rect = cf.rect || {};
        const near = items.filter((it) => it.x >= rect.x - 12 && it.x <= rect.x + (rect.width || 0) + 12 && Math.abs(it.y - rect.y) <= 45);
        const blob = normLabel(near.map((n) => n.text).join(" "));
        for (const banned of [].concat(binding.printedLabelMustNotContain)) {
          if (blob.includes(normLabel(banned))) {
            failures.push(`${rel}: binding ${binding.field} sits under forbidden printed label "${banned}"`);
          }
        }
      }
    }
  }

  const fixtureDir = path.join(familyDir, "fixtures");
  const fixtures = fs.existsSync(fixtureDir) ? fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).sort() : [];
  if (fixtures.length === 0) failures.push(`${rel}: no fixtures`);

  const fingerprints = {};
  for (const fixtureFile of fixtures) {
    const fixtureId = fixtureFile.replace(/\.json$/, "");
    const facts = JSON.parse(fs.readFileSync(path.join(fixtureDir, fixtureFile), "utf8"));
    let bytes;
    let report;
    try {
      ({ bytes, report } = await renderHardFormPacket({ profile, facts, sourceBytes }));
    } catch (error) {
      failures.push(`${rel}/${fixtureId}: render failed — ${error.message}`);
      continue;
    }

    if (report.failed.length > 0) failures.push(`${rel}/${fixtureId}: ${report.failed.length} binding failures`);
    if (profile.officialSource?.xfa && report.xfaPresentInInput !== true) {
      failures.push(`${rel}/${fixtureId}: profile declares an XFA source but the input carried no XFA package`);
    }
    if (report.xfaPresentInInput && report.xfaRemoved !== true) {
      failures.push(`${rel}/${fixtureId}: XFA package was present and not removed`);
    }

    const out = await PDFDocument.load(bytes, { updateMetadata: false });

    const acro = out.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (acro && acro.get(PDFName.of("XFA")) !== undefined) failures.push(`${rel}/${fixtureId}: output still carries /XFA`);
    const remainingFields = (() => { try { return out.getForm().getFields().length; } catch { return 0; } })();
    if (remainingFields !== 0) failures.push(`${rel}/${fixtureId}: output is not flattened (${remainingFields} interactive fields remain)`);

    if (out.catalog.get(PDFName.of("OpenAction")) !== undefined) failures.push(`${rel}/${fixtureId}: output carries /OpenAction`);
    if (out.catalog.get(PDFName.of("AA")) !== undefined) failures.push(`${rel}/${fixtureId}: output carries document /AA`);
    const residual = scanAnnotationActions(out);
    if (residual.length > 0) failures.push(`${rel}/${fixtureId}: residual annotation actions ${JSON.stringify(residual)}`);

    const raw = rawActiveContent(bytes);
    for (const banned of ["/XFA", "/JavaScript", "/Launch", "/SubmitForm", "/ImportData"]) {
      if (raw[banned]) failures.push(`${rel}/${fixtureId}: raw bytes still contain ${banned} (${raw[banned]}x)`);
    }

    const pages = out.getPages();
    const expected = profile.expectedPageGeometry;
    if (expected) {
      if (pages.length !== expected.pages) failures.push(`${rel}/${fixtureId}: page count ${pages.length}, expected ${expected.pages}`);
      for (const [i, page] of pages.entries()) {
        const geom = `${page.getWidth().toFixed(0)}x${page.getHeight().toFixed(0)}`;
        if (geom !== expected.size) failures.push(`${rel}/${fixtureId}: page ${i + 1} geometry ${geom}, expected ${expected.size}`);
      }
    }

    const text = extractText(out);
    for (const anchor of profile.requiredTextAnchors || []) {
      if (!text.replace(/\s+/g, " ").toUpperCase().includes(anchor.toUpperCase())) {
        failures.push(`${rel}/${fixtureId}: required official text anchor "${anchor}" not found in output`);
      }
    }

    fingerprints[fixtureId] = {
      outputSha256: report.outputSha256,
      bytes: report.outputBytes,
      populatedFields: report.populated.length,
      skippedNoFact: report.skippedNoFact.length,
      pages: pages.length,
    };
    results.push({ family: rel, fixture: fixtureId, ok: true, sha: report.outputSha256.slice(0, 12), populated: report.populated.length });
  }

  const fpPath = path.join(familyDir, "reports", "output-fingerprints.json");
  const doc = {
    schemaVersion: "rcap-hard-form-output-fingerprints/v1",
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    derivedSourceSha256: profile.derivedSource.sha256,
    engine: profile.engine,
    note: "Output bytes are deterministic for a fixed profile, engine and fixture. A changed fingerprint means the packet changed and needs re-review.",
    fixtures: fingerprints,
  };
  const serialized = `${JSON.stringify(doc, null, 2)}\n`;
  if (WRITE) {
    fs.mkdirSync(path.dirname(fpPath), { recursive: true });
    fs.writeFileSync(fpPath, serialized);
  } else if (!fs.existsSync(fpPath)) {
    failures.push(`${rel}: reports/output-fingerprints.json is missing (run with --write-fingerprints)`);
  } else if (fs.readFileSync(fpPath, "utf8") !== serialized) {
    failures.push(`${rel}: output fingerprints drifted from the committed record`);
  }
}

for (const r of results) console.log(`  ok  ${r.family}/${r.fixture} — ${r.populated} populated, sha ${r.sha}`);
if (failures.length > 0) {
  console.error("\nverify-rcap-hard-form-outputs FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nverify-rcap-hard-form-outputs passed: ${results.length} rendered fixtures across ${profiles.length} profile(s).`);
