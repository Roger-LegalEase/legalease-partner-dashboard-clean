#!/usr/bin/env node
/*
 * HOW MANY FAMILIES PUBLISH A FLATTENED-APPEARANCE COUNT THAT INCLUDES THE
 * SOURCE'S OWN SCANNED PAGE IMAGES.
 *
 * scripts/rcap-official-forms/pdf-flattened-widgets.mjs finds a flattened widget
 * by matching `q <cm>... /<name> Do` in a page content stream. Its own comment
 * explains why the multiple `cm` matters and is right about that. What the
 * pattern does not do is check the NAME: `\/(\S+)\s+Do` matches ANY XObject
 * invocation drawn that way, and a scanned page image is drawn exactly that way.
 *
 * VF31 measured the cost on ar-cs-possession-seal-set. Its petitions publish
 * flattenedWidgetAppearancesReadFromOutputBytes: 125. The bytes carry 41. The
 * difference is the ACIC petition's own 84 SCANNED PAGE IMAGES, counted as
 * appearances this build added. 41 was confirmed three ways: the newer reading
 * module, direct XObject definition and Do-invocation counts, and the source's
 * own acroFieldCount of 41.
 *
 * The module has 72 callers, so changing it moves what 72 families publish. That
 * is not a change to make on one family's evidence. This measures the blast
 * radius instead: for every delivered fixture, how many placements the current
 * pattern matches, and how many of those are named as the finalizer names its own
 * output -- /FlatWidget-N or /ExactFactOverlay-N.
 *
 * A family where the two numbers agree publishes a true count today. A family
 * where they differ publishes an inflated one, and the size of the difference is
 * the number of the source's own images being reported as ink this build added.
 *
 * Read-only over delivered fixtures. Writes one artifact, no packet byte, and
 * changes no module.
 */
import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFArray } from "pdf-lib";

const OUT = "data/rcap-grade-a/packet-factory-24h/FLATTENED_WIDGET_OVERCOUNT.json";
const FINALIZER_NAMES = /^(FlatWidget|ExactFactOverlay)-\d+$/;
const inflate = (b) => { try { return zlib.inflateSync(b); } catch { return b; } };

const placementsIn = async (file) => {
  const doc = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  let matched = 0, finalizerNamed = 0;
  const otherNames = new Map();
  doc.getPages().forEach((page) => {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) return;
    const dict = ctx.lookup(xObjects);
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let stream = "";
    for (const ref of refs) { try { stream += inflate(Buffer.from(ctx.lookup(ref).contents)).toString("latin1"); } catch { /* skip */ } }
    const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
    let m;
    while ((m = placement.exec(stream))) {
      if (!dict.has(PDFName.of(m[2]))) continue;
      matched += 1;
      if (FINALIZER_NAMES.test(m[2])) finalizerNamed += 1;
      else otherNames.set(m[2].replace(/\d+$/, "N"), (otherNames.get(m[2].replace(/\d+$/, "N")) ?? 0) + 1);
    }
  });
  return { matched, finalizerNamed, otherNames: [...otherNames].sort((a, b) => b[1] - a[1]).slice(0, 5) };
};

const rows = [];
for (const dir of globSync("data/rcap-all50/overlays/census-v1/*/*")) {
  const fixtures = globSync(path.join(dir, "fixtures", "*.pdf"));
  if (!fixtures.length) continue;
  let matched = 0, finalizerNamed = 0, unreadable = 0;
  const other = new Map();
  for (const file of fixtures) {
    try {
      const r = await placementsIn(file);
      matched += r.matched; finalizerNamed += r.finalizerNamed;
      for (const [k, v] of r.otherNames) other.set(k, (other.get(k) ?? 0) + v);
    } catch { unreadable += 1; }
  }
  if (matched === 0 && unreadable === 0) continue;
  const overcount = matched - finalizerNamed;
  rows.push({
    family: path.basename(dir), directory: dir, fixtures: fixtures.length,
    placementsTheCurrentPatternMatches: matched,
    placementsNamedAsTheFinalizerNamesItsOwn: finalizerNamed,
    overcount,
    whatTheExtrasAre: overcount > 0 ? Object.fromEntries(other) : null,
    unreadableFixtures: unreadable,
  });
}

const inflated = rows.filter((r) => r.overcount > 0);
writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-flattened-widget-overcount/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/scan-flattened-widget-overcount.mjs",
  generatedAt: new Date().toISOString(),
  question: "For each family's delivered fixtures, how many XObject placements does pdf-flattened-widgets.mjs count as flattened widget appearances, and how many of those are actually named as the finalizer names its own output?",
  whyItMatters: "The pattern matches any XObject drawn as `q <cm> /<name> Do`, and a scanned page image is drawn exactly that way. On ar-cs-possession-seal-set that reported 125 appearances where the bytes carry 41, the extra 84 being the source's own scanned pages counted as ink this build added.",
  whatAnOvercountIsAndIsNot: "An overcount means the published number is not what it says it is. It is NOT by itself a page defect: the extra placements are the source's own images, correctly drawn. What is wrong is a counter that reports them as appearances the build flattened.",
  theModuleHas72Callers: "Changing the pattern moves what 72 families publish, which is not a change to make on one family's evidence. This bounds it rather than making it.",
  totals: {
    familiesWithDeliveredFixtures: rows.length,
    familiesPublishingAnInflatedCount: inflated.length,
    totalOvercountAcrossThoseFamilies: inflated.reduce((n, r) => n + r.overcount, 0),
    familiesWhereTheCountIsAlreadyTrue: rows.length - inflated.length,
  },
  familiesPublishingAnInflatedCount: inflated.sort((a, b) => b.overcount - a.overcount),
  everyFamilyMeasured: rows,
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`families with delivered fixtures:     ${rows.length}`);
console.log(`  publishing an inflated count:       ${inflated.length}`);
console.log(`  total overcount across them:        ${inflated.reduce((n, r) => n + r.overcount, 0)}`);
for (const r of inflated.slice(0, 12)) console.log(`    +${String(r.overcount).padStart(4)}  ${r.family}`);
