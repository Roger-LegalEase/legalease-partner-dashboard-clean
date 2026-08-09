#!/usr/bin/env node
// Custom-pleading shared-renderer impact sweep.
//
// Integration-owned. A change to the shared custom-pleading engine can move
// bytes in any family that renders through it, and "only the two families we
// were thinking about moved" is an assumption rather than a result. This walks
// every registered custom-pleading template pack — the live shared registry and
// every jurisdiction pack on disk, whether or not it is wired into the registry
// — renders each template through the real renderer, and records what a
// before/after comparison needs:
//
//   assembled SHA-256, page count, component count, extracted text per page,
//   and the page-break locations expressed as the first and last text on each
//   page.
//
// It renders with one inert fact set and no participant record of any kind.
// Absent placeholders render as the engine's blank fill-in rule, which is what
// an unfilled pleading is, so the sweep measures layout rather than content.
//
// Usage:
//   node scripts/rcap-captain-custom-pleading-impact-sweep.mjs <out.json>
//
// Compare two runs with --compare:
//   node scripts/rcap-captain-custom-pleading-impact-sweep.mjs --compare <before.json> <after.json>
//
// Comparison classifies each family exactly three ways:
//   unchanged           bytes and page count identical
//   changed_layout_only text identical, hash or page count moved
//   changed_content     extracted text differs — the engine fix must not do this
//
// Offline. No network, no database, nothing promoted, nothing enabled.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2).filter((arg) => arg !== "--");

if (argv[0] === "--compare") {
  compare(argv[1], argv[2]);
} else {
  await sweep(argv[0]);
}

async function sweep(outPath) {
  if (!outPath) {
    console.error(
      "Usage: node scripts/rcap-captain-custom-pleading-impact-sweep.mjs <out.json>"
    );
    process.exit(1);
  }

  process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
  process.env.RCAP_PACKET_STORE_DRIVER = "local";
  register("./lib/ts-esm-loader.mjs", import.meta.url);

  const { PDFDocument, decodePDFRawStream } = await import("pdf-lib");
  const { PLEADING_TEMPLATES } = await import(
    "@/lib/rcap/packets/engines/pleading-templates"
  );
  const { CustomPleadingRenderer } = await import(
    "@/lib/rcap/packets/engines/custom-pleading"
  );

  const packs = [];

  // The live shared registry. Whatever a jurisdiction pack has been wired into
  // it is measured here under the name the registry uses.
  packs.push({ family: "shared-registry", templates: { ...PLEADING_TEMPLATES } });

  // Georgia's pack lives beside the engine rather than under jurisdictions/.
  const { GEORGIA_PLEADING_TEMPLATES } = await import(
    "@/lib/rcap/packets/engines/pleading-templates-ga"
  );
  packs.push({ family: "georgia", templates: GEORGIA_PLEADING_TEMPLATES });

  const jurisdictionsDir = path.join(
    root,
    "src/lib/rcap/packets/jurisdictions"
  );
  for (const family of fs.readdirSync(jurisdictionsDir).sort()) {
    const modulePath = path.join(jurisdictionsDir, family, "custom-pleading.ts");
    if (!fs.existsSync(modulePath)) continue;
    const loaded = await import(
      `@/lib/rcap/packets/jurisdictions/${family}/custom-pleading`
    );
    const templates = {};
    for (const [name, value] of Object.entries(loaded)) {
      if (!/PLEADING_TEMPLATES$/u.test(name)) continue;
      Object.assign(templates, value);
    }
    if (Object.keys(templates).length === 0) continue;
    packs.push({ family, templates });
  }

  // Inert. Nothing here is a participant record, and no value is a legal fact.
  const FACTS = {
    petitionerName: "Fixture Petitioner",
    respondentName: "Fixture Respondent",
    caseNumber: "FIXTURE-0000",
    county: "Fixture",
    countyName: "Fixture",
    courtName: "Fixture Court",
    court: "Fixture Court",
    judicialDistrict: "Fixture District",
    recordDate: "2026-01-01",
    offenseDate: "2026-01-01",
    arrestDate: "2026-01-01",
    dispositionDate: "2026-01-01",
    convictionDate: "2026-01-01",
    filingDate: "2026-01-01",
    offense: "Fixture offense",
    charge: "Fixture charge",
    agency: "Fixture Agency",
    prosecutorName: "Fixture Prosecutor",
    prosecutorAddress: "0 Fixture Road, Fixture City",
    petitionerAddress: "0 Fixture Road",
    petitionerCity: "Fixture City",
    petitionerState: "FX",
    petitionerZip: "00000",
    petitionerPhone: "000-000-0000",
    petitionerEmail: "fixture@example.invalid",
    dateOfBirth: "2000-01-01"
  };

  const families = [];
  for (const pack of packs) {
    const templates = [];
    for (const templateId of Object.keys(pack.templates).sort()) {
      const template = pack.templates[templateId];
      if (!template || typeof template !== "object" || !template.templateId) {
        continue;
      }
      // Render through the registry the engine actually reads, restoring it
      // afterwards so one family cannot leak a template into another.
      const had = Object.prototype.hasOwnProperty.call(
        PLEADING_TEMPLATES,
        templateId
      );
      const previous = PLEADING_TEMPLATES[templateId];
      PLEADING_TEMPLATES[templateId] = template;
      let result;
      try {
        result = await CustomPleadingRenderer.render({
          component: {
            componentId: `${templateId}-impact-sweep`,
            templateId,
            strategy: "custom_pleading",
            role: "petition"
          },
          jurisdiction: pack.family,
          geography: null,
          facts: FACTS,
          rootDir: root
        });
      } finally {
        if (had) PLEADING_TEMPLATES[templateId] = previous;
        else delete PLEADING_TEMPLATES[templateId];
      }
      const bytes = Buffer.from(result.bytes);
      const pages = await pageTexts(bytes, PDFDocument, decodePDFRawStream);
      templates.push({
        templateId,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        byteLength: bytes.byteLength,
        pageCount: result.pageCount,
        hasVerification: Boolean(template.verification),
        hasCertificateOfService: Array.isArray(template.certificateOfService)
          ? template.certificateOfService.length > 0
          : false,
        text: pages.map((page) => page.text).join("\n\f\n"),
        // Page-break locations. Where a break moves, the first and last text on
        // the pages either side of it move with it.
        pageBreaks: pages.map((page, index) => ({
          page: index + 1,
          firstText: page.text.slice(0, 60),
          lastText: page.text.slice(-60)
        }))
      });
    }
    families.push({
      family: pack.family,
      componentCount: templates.length,
      templates
    });
  }

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(
    path.resolve(outPath),
    `${JSON.stringify({ schemaVersion: "rcap-custom-pleading-impact-sweep/v1", families }, null, 2)}\n`
  );
  const rendered = families.reduce((total, f) => total + f.componentCount, 0);
  console.log(
    `Impact sweep wrote ${families.length} families and ${rendered} rendered components to ${outPath}.`
  );
}

async function pageTexts(bytes, PDFDocument, decodePDFRawStream) {
  const doc = await PDFDocument.load(bytes);
  const pages = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = [];
    if (contents && typeof contents.size === "function") {
      for (let i = 0; i < contents.size(); i += 1) streams.push(contents.lookup(i));
    } else if (contents) {
      streams.push(contents);
    }
    let raw = "";
    for (const stream of streams) {
      try {
        raw += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      } catch {
        continue;
      }
    }
    pages.push({ text: scanTextOperators(raw).replace(/\s+/gu, " ").trim() });
  }
  return pages;
}

function scanTextOperators(text) {
  let collected = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "<" && text[i + 1] !== "<") {
      const close = text.indexOf(">", i);
      if (close < 0) break;
      const hex = text.slice(i + 1, close).replace(/[^0-9a-fA-F]/gu, "");
      if (hex.length >= 2) {
        collected += ` ${Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex").toString("latin1")}`;
      }
      i = close + 1;
      continue;
    }
    if (text[i] !== "(") {
      i += 1;
      continue;
    }
    let depth = 1;
    let literal = "";
    i += 1;
    while (i < text.length && depth > 0) {
      const char = text[i];
      if (char === "\\") {
        literal += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      if (depth > 0) literal += char;
      i += 1;
    }
    collected += ` ${literal}`;
  }
  return collected;
}

function compare(beforePath, afterPath) {
  if (!beforePath || !afterPath) {
    console.error(
      "Usage: node scripts/rcap-captain-custom-pleading-impact-sweep.mjs --compare <before.json> <after.json>"
    );
    process.exit(1);
  }
  const before = JSON.parse(fs.readFileSync(path.resolve(beforePath), "utf8"));
  const after = JSON.parse(fs.readFileSync(path.resolve(afterPath), "utf8"));
  const index = (report) =>
    new Map(report.families.map((family) => [family.family, family]));
  const beforeFamilies = index(before);
  const afterFamilies = index(after);
  const names = [
    ...new Set([...beforeFamilies.keys(), ...afterFamilies.keys()])
  ].sort();

  const rows = [];
  let contentChanges = 0;
  for (const name of names) {
    const b = beforeFamilies.get(name);
    const a = afterFamilies.get(name);
    if (!b || !a) {
      rows.push({ family: name, classification: "family_set_changed" });
      contentChanges += 1;
      continue;
    }
    const bT = new Map(b.templates.map((t) => [t.templateId, t]));
    const aT = new Map(a.templates.map((t) => [t.templateId, t]));
    const ids = [...new Set([...bT.keys(), ...aT.keys()])].sort();
    let textChanged = 0;
    let hashChanged = 0;
    let pageCountChanged = 0;
    let breaksChanged = 0;
    let paginationChanged = 0;
    const moved = [];
    // Substantive text is the document's text, not the text of a given page. A
    // paragraph that moved across a page boundary is exactly what a pagination
    // correction does; treating that as a content change would classify the fix
    // working as the fix failing. Content is compared without page separators,
    // and where the text moves the page-break record says where.
    const contentOf = (entry) =>
      entry.text.split("\f").join(" ").replace(/\s+/gu, " ").trim();
    for (const id of ids) {
      const bt = bT.get(id);
      const at = aT.get(id);
      if (!bt || !at) {
        textChanged += 1;
        moved.push({ templateId: id, reason: "component_set_changed" });
        continue;
      }
      if (contentOf(bt) !== contentOf(at)) {
        textChanged += 1;
        moved.push({ templateId: id, reason: "text_changed" });
        continue;
      }
      const sameBreaks =
        JSON.stringify(bt.pageBreaks) === JSON.stringify(at.pageBreaks);
      const samePageText = bt.text === at.text;
      if (bt.sha256 !== at.sha256) hashChanged += 1;
      if (bt.pageCount !== at.pageCount) pageCountChanged += 1;
      if (!sameBreaks) breaksChanged += 1;
      if (!samePageText) paginationChanged += 1;
      if (
        bt.sha256 !== at.sha256 ||
        bt.pageCount !== at.pageCount ||
        !sameBreaks ||
        !samePageText
      ) {
        moved.push({
          templateId: id,
          reason: "layout_only",
          pageCountBefore: bt.pageCount,
          pageCountAfter: at.pageCount,
          sha256Before: bt.sha256,
          sha256After: at.sha256
        });
      }
    }
    const classification =
      textChanged > 0
        ? "changed_content"
        : hashChanged + pageCountChanged + breaksChanged + paginationChanged > 0
          ? "changed_layout_only"
          : "unchanged";
    if (classification === "changed_content") contentChanges += 1;
    rows.push({
      family: name,
      classification,
      componentCount: a.componentCount,
      textChanged,
      hashChanged,
      pageCountChanged,
      pageBreaksChanged: breaksChanged,
      paginationChanged,
      moved
    });
  }

  console.log(
    `${JSON.stringify({ schemaVersion: "rcap-custom-pleading-impact-comparison/v1", families: rows }, null, 2)}`
  );
  if (contentChanges > 0) {
    console.error(
      `Impact sweep comparison found ${contentChanges} families whose extracted text changed. ` +
        "A layout correction must not change substantive text."
    );
    process.exit(1);
  }
}
