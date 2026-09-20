#!/usr/bin/env node
// HOW MANY FAMILIES SHARE THE DEFECT VERMONT MEASURED, AND WHERE ARE THEY?
//
//   node scripts/rcap-official-forms/scan-synthesized-off-appearances.mjs
//   node scripts/rcap-official-forms/scan-synthesized-off-appearances.mjs --out <dir>
//
// READ-ONLY. This opens family receipts and official binaries and writes two
// report files under data/rcap-grade-a/packet-factory-24h/fix50/. It repairs
// nothing, rebuilds nothing, and touches no family's builder or directory.
//
// THE CONDITION IT COUNTS. sanitizeAndFlatten calls form.updateFieldAppearances()
// before flatten(). pdf-lib regenerates an appearance for any check box or radio
// widget whose CURRENT /AS state has no entry in /AP /N, and its default provider
// paints a stroked square the size of the widget rectangle, which flatten then
// stamps onto the page. ISO 32000-1 12.5.5 says a viewer draws the stream named
// by /AS, so where there is none a conforming viewer paints nothing: the square
// is added ink. FIX50 gave the shared sanitizer an opt-in option that installs an
// empty appearance for the missing state instead, and opted Vermont's
// non-conviction sealing set in. Every other family is still on the old default,
// which is what this scan is for.
//
// A widget that ships its OWN /Off appearance is a different case and is NOT
// counted as exposed: that stream is the court's own, RI-OFF-APPEARANCE settles
// that it stays, and the option leaves it untouched. Both numbers are reported
// side by side so the distinction can be checked rather than trusted.
//
// SOURCES ARE RESOLVED BY CONTENT HASH, NEVER BY DECLARED PATH.
//
// A receipt's pathInArchive says where the bytes were when the family was built.
// Opening that path would measure whatever is there now under a name the receipt
// happens to carry, which is how a scan reports on the wrong binary and calls it
// evidence. So every mounted custody is indexed by SHA-256 first and each
// document is looked up by the digest its receipt pins. A digest no mounted
// custody holds is NOT_MEASURABLE_HERE -- an honest absence, and never a zero.
//
// A zero and an absence are different answers. The cohort carries both, and the
// totals never merge them.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFCheckBox, PDFRadioGroup } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CENSUS = path.join(rootDir, "data/rcap-all50/overlays/census-v1");
const MASTER_QUEUE = path.join(rootDir, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const DEFAULT_OUT = path.join(rootDir, "data/rcap-grade-a/packet-factory-24h/fix50");
const OPT_IN_OPTION = "suppressSynthesizedAppearances";

/**
 * The custodies this container has mounted.
 *
 * Both are read-only inputs. The Master Library is the authoritative archive of
 * official binaries; human-source-returns carries what a person fetched by hand
 * for a family the archive did not cover. A family bound to a source in neither
 * is measurable somewhere else, not here.
 */
function custodyRoots() {
  const candidates = [];
  const named = process.env.MASTER_LIBRARY_SOURCE_DIR ?? process.env.RCAP_BUNDLE_EXTRACT;
  if (named) candidates.push(named);
  candidates.push(path.join(rootDir, "private/source-imports"), path.join(rootDir, "private/human-source-returns"));

  // private/ is reached through symlinks in this container and an environment
  // variable can name the same tree a second way, so roots are deduplicated and
  // nested by their REAL paths. Indexing one custody twice would double the
  // file count in the report and make every digest look like two copies.
  const real = [];
  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    let resolved;
    try { resolved = fs.realpathSync(candidate); } catch { continue; }
    if (!real.includes(resolved)) real.push(resolved);
  }
  // Only the OUTERMOST of any nested pair survives, whichever order they were
  // named in: MASTER_LIBRARY_SOURCE_DIR points inside private/source-imports in
  // this container, and keeping both would walk the archive twice.
  const inside = (a, b) => a.startsWith(`${b}${path.sep}`);
  return real.filter((r) => !real.some((other) => other !== r && inside(r, other))).sort();
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    // withFileTypes reports a symlink as a symlink, and the mounted custodies
    // are reached through them, so the type is resolved by stat rather than
    // taken from the dirent.
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile()) out.push(full);
  }
  return out;
}

/** Every mounted file, keyed by the digest of its bytes. */
function indexCustodiesByHash(roots) {
  const byHash = new Map();
  let files = 0;
  for (const root of roots) {
    for (const file of walk(root)) {
      files += 1;
      let digest;
      try { digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); } catch { continue; }
      if (!byHash.has(digest)) byHash.set(digest, []);
      byHash.get(digest).push(file);
    }
  }
  return { byHash, files };
}

/**
 * The widgets in one binary, split by whether the source draws their current
 * state.
 *
 * Reads structure only: field class, /AS, and the keys of /AP /N. No field name,
 * caption, form number or jurisdiction is consulted, here or anywhere below.
 */
async function measure(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const out = { selectionWidgets: 0, widgetsWithNoAppearanceForCurrentState: 0, widgetsShippingTheirOwnState: 0,
    widgetsWithNoAppearanceState: 0, widgetsWithNonDictionaryAppearance: 0, fields: [] };
  let form;
  try { form = doc.getForm(); } catch { return { ...out, unreadableForm: true }; }
  for (const field of form.getFields()) {
    if (!(field instanceof PDFCheckBox || field instanceof PDFRadioGroup)) continue;
    for (const widget of field.acroField.getWidgets()) {
      out.selectionWidgets += 1;
      const state = widget.dict.lookup(PDFName.of("AS"));
      if (!(state instanceof PDFName)) { out.widgetsWithNoAppearanceState += 1; continue; }
      const ap = widget.dict.lookup(PDFName.of("AP"));
      if (ap !== undefined && !(ap instanceof PDFDict)) { out.widgetsWithNonDictionaryAppearance += 1; continue; }
      const normal = ap instanceof PDFDict ? doc.context.lookup(ap.get(PDFName.of("N"))) : undefined;
      if (normal !== undefined && !(normal instanceof PDFDict)) { out.widgetsWithNonDictionaryAppearance += 1; continue; }
      if (normal instanceof PDFDict && normal.get(state) !== undefined) { out.widgetsShippingTheirOwnState += 1; continue; }
      out.widgetsWithNoAppearanceForCurrentState += 1;
      out.fields.push({ field: field.getName(), state: String(state.toString()),
        statesInAppearanceDictionary: normal instanceof PDFDict ? [...normal.keys()].map(String) : [] });
    }
  }
  return out;
}

/** Whether this family's own builder passes the opt-in option, as committed. */
function builderOptsIn(buildScript) {
  if (!buildScript) return { buildScript: null, optsIn: false, why: "MASTER_QUEUE records no build script for this family" };
  const full = path.join(rootDir, buildScript);
  if (!fs.existsSync(full)) return { buildScript, optsIn: false, why: "the build script MASTER_QUEUE names is not in this tree" };
  const text = fs.readFileSync(full, "utf8");
  // The option read as the caller passes it, so a mention in a comment is not
  // mistaken for a call site.
  const optsIn = new RegExp(`${OPT_IN_OPTION}\\s*:\\s*true`).test(text);
  return { buildScript, optsIn, why: optsIn ? `passes ${OPT_IN_OPTION}: true` : `does not pass ${OPT_IN_OPTION}` };
}

async function main() {
  const argv = process.argv.slice(2);
  const outIndex = argv.indexOf("--out");
  const outDir = outIndex >= 0 ? path.resolve(argv[outIndex + 1]) : DEFAULT_OUT;

  const roots = custodyRoots();
  if (roots.length === 0) {
    console.error("no custody is mounted: nothing can be resolved by hash, and a scan that resolves nothing is not a zero.");
    process.exit(2);
  }
  const { byHash, files } = indexCustodiesByHash(roots);

  const queue = JSON.parse(fs.readFileSync(MASTER_QUEUE, "utf8"));
  const queueByFamily = new Map((queue.families ?? []).map((f) => [f.familyId, f]));

  const families = [];
  for (const state of fs.readdirSync(CENSUS).sort()) {
    const stateDir = path.join(CENSUS, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const dirName of fs.readdirSync(stateDir).sort()) {
      const dir = path.join(stateDir, dirName);
      const receiptPath = path.join(dir, "source-receipt.json");
      if (!fs.existsSync(receiptPath)) continue;
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      const familyId = receipt.familyId ?? dirName;
      const queueRow = queueByFamily.get(familyId) ?? null;

      const documents = [];
      for (const doc of receipt.documents ?? []) {
        const declaredSha = typeof doc.sha256 === "string" ? doc.sha256.toLowerCase() : null;
        const row = {
          formNumber: doc.formNumber ?? null,
          sourceIds: doc.sourceIds ?? [],
          declaredSha256: declaredSha,
          // Kept for the record and never opened: resolution is by hash alone.
          declaredPathNotUsedForResolution: doc.pathInArchive ?? null
        };
        const hits = declaredSha ? byHash.get(declaredSha) : undefined;
        if (!hits || hits.length === 0) {
          row.resolution = "NOT_MEASURABLE_HERE";
          row.why = declaredSha
            ? "no file in any mounted custody hashes to the digest this receipt pins"
            : "the receipt pins no SHA-256 for this document, so it cannot be resolved by content";
          documents.push(row);
          continue;
        }
        row.resolution = "RESOLVED_BY_CONTENT_HASH";
        row.resolvedFrom = path.relative(rootDir, hits[0]);
        row.copiesInCustody = hits.length;
        try {
          Object.assign(row, await measure(fs.readFileSync(hits[0])));
        } catch (error) {
          row.resolution = "NOT_MEASURABLE_HERE";
          row.why = `resolved by hash but could not be read as a PDF form: ${error.message}`;
        }
        documents.push(row);
      }

      const measured = documents.filter((d) => d.resolution === "RESOLVED_BY_CONTENT_HASH");
      const notMeasurable = documents.filter((d) => d.resolution === "NOT_MEASURABLE_HERE");
      const exposedWidgets = measured.reduce((n, d) => n + (d.widgetsWithNoAppearanceForCurrentState ?? 0), 0);
      families.push({
        familyId,
        jurisdiction: receipt.jurisdiction ?? state.toUpperCase(),
        familyDirectory: path.relative(rootDir, dir),
        implementationStrategy: receipt.implementationStrategy ?? null,
        masterQueueState: queueRow?.state ?? "NOT_IN_MASTER_QUEUE",
        builder: builderOptsIn(queueRow?.buildScript ?? null),
        documentsDeclared: documents.length,
        documentsMeasured: measured.length,
        documentsNotMeasurableHere: notMeasurable.length,
        widgetsWithNoAppearanceForCurrentState: exposedWidgets,
        widgetsShippingTheirOwnState: measured.reduce((n, d) => n + (d.widgetsShippingTheirOwnState ?? 0), 0),
        selectionWidgets: measured.reduce((n, d) => n + (d.selectionWidgets ?? 0), 0),
        inCohort: exposedWidgets > 0,
        documents
      });
    }
  }

  const cohort = families.filter((f) => f.inCohort);
  const stillOnTheOldDefault = cohort.filter((f) => !f.builder.optsIn);
  const partiallyMeasurable = families.filter((f) => f.documentsNotMeasurableHere > 0);
  const byJurisdiction = {};
  for (const f of cohort) {
    byJurisdiction[f.jurisdiction] ??= { families: 0, widgets: 0, familyIds: [] };
    byJurisdiction[f.jurisdiction].families += 1;
    byJurisdiction[f.jurisdiction].widgets += f.widgetsWithNoAppearanceForCurrentState;
    byJurisdiction[f.jurisdiction].familyIds.push(f.familyId);
  }

  const report = {
    schemaVersion: "rcap-synthesized-off-appearance-cohort/v1",
    generatedBy: "scripts/rcap-official-forms/scan-synthesized-off-appearances.mjs",
    lane: "FIX50",
    readOnly: true,
    question: "Which families bind an official form carrying a check box or radio widget whose current /AS state has "
      + "no stream in /AP /N, so the shared flattening step synthesizes a bordered square the form does not print?",
    resolution: {
      method: "SHA-256 of the bytes, looked up in an index of every mounted custody. The receipt's declared path is "
        + "recorded and never opened.",
      custodyRootsIndexed: roots,
      filesIndexed: files
    },
    whatIsNotCounted: "A widget that ships its own appearance for its current state. That stream is the court's own; "
      + "RI-OFF-APPEARANCE settles that it stays, and the opt-in option does not touch it.",
    optInOption: OPT_IN_OPTION,
    totals: {
      familyDirectoriesWithASourceReceipt: families.length,
      familiesInCohort: cohort.length,
      familiesInCohortStillOnTheOldDefault: stillOnTheOldDefault.length,
      familiesInCohortAlreadyOptedIn: cohort.length - stillOnTheOldDefault.length,
      widgetsInCohort: cohort.reduce((n, f) => n + f.widgetsWithNoAppearanceForCurrentState, 0),
      familiesWithAtLeastOneSourceNotMeasurableHere: partiallyMeasurable.length,
      documentsNotMeasurableHere: families.reduce((n, f) => n + f.documentsNotMeasurableHere, 0)
    },
    byJurisdiction,
    cohort,
    familiesWithSourcesNotMeasurableHere: partiallyMeasurable.map((f) => ({
      familyId: f.familyId,
      jurisdiction: f.jurisdiction,
      notMeasurable: f.documents.filter((d) => d.resolution === "NOT_MEASURABLE_HERE")
        .map((d) => ({ formNumber: d.formNumber, declaredSha256: d.declaredSha256, why: d.why }))
    })),
    everyFamilyScanned: families.map((f) => ({
      familyId: f.familyId, jurisdiction: f.jurisdiction, masterQueueState: f.masterQueueState,
      inCohort: f.inCohort, widgetsWithNoAppearanceForCurrentState: f.widgetsWithNoAppearanceForCurrentState,
      documentsNotMeasurableHere: f.documentsNotMeasurableHere, builderOptsIn: f.builder.optsIn
    })),
    grantsNothing: "A cohort is a measurement. It authorizes no rebuild, no route change and no promotion, and no "
      + "family listed here is repaired by being listed."
  };

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "SYNTHESIZED_OFF_APPEARANCE_COHORT.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const md = [];
  md.push("# Synthesized off-state appearances: the cohort", "");
  md.push("Generated by `scripts/rcap-official-forms/scan-synthesized-off-appearances.mjs`. Read-only.", "");
  md.push(report.question, "");
  md.push("Sources are resolved by SHA-256 against every mounted custody and never by the path a receipt declares.",
    `Indexed ${report.resolution.filesIndexed} files under ${report.resolution.custodyRootsIndexed.join(", ")}.`, "");
  md.push("## Totals", "");
  for (const [k, v] of Object.entries(report.totals)) md.push(`- ${k}: ${v}`);
  md.push("", "## By jurisdiction", "", "| Jurisdiction | Families | Widgets |", "| --- | ---: | ---: |");
  for (const [j, v] of Object.entries(byJurisdiction).sort()) md.push(`| ${j} | ${v.families} | ${v.widgets} |`);
  md.push("", "## The cohort", "",
    "| Family | Jurisdiction | Widgets | MASTER_QUEUE state | Builder opts in |", "| --- | --- | ---: | --- | --- |");
  for (const f of cohort) {
    md.push(`| ${f.familyId} | ${f.jurisdiction} | ${f.widgetsWithNoAppearanceForCurrentState} `
      + `| ${f.masterQueueState} | ${f.builder.optsIn ? "yes" : "no"} |`);
  }
  md.push("", "## Sources not measurable in this container", "");
  if (report.familiesWithSourcesNotMeasurableHere.length === 0) md.push("None: every declared source resolved by hash.");
  else {
    md.push("| Family | Form | Declared SHA-256 | Why |", "| --- | --- | --- | --- |");
    for (const f of report.familiesWithSourcesNotMeasurableHere) {
      for (const d of f.notMeasurable) {
        md.push(`| ${f.familyId} | ${d.formNumber ?? "(unnamed)"} | ${(d.declaredSha256 ?? "none").slice(0, 16)} | ${d.why} |`);
      }
    }
  }
  md.push("", "## What this is not", "", report.whatIsNotCounted, "", report.grantsNothing, "");
  const mdPath = path.join(outDir, "SYNTHESIZED_OFF_APPEARANCE_COHORT.md");
  fs.writeFileSync(mdPath, `${md.join("\n")}\n`);

  console.log(`scanned ${families.length} family directories carrying a source receipt`);
  console.log(`cohort: ${cohort.length} families, ${report.totals.widgetsInCohort} widgets, `
    + `${stillOnTheOldDefault.length} still on the old default`);
  console.log(`not measurable here: ${report.totals.documentsNotMeasurableHere} documents `
    + `across ${partiallyMeasurable.length} families`);
  console.log(path.relative(rootDir, jsonPath));
  console.log(path.relative(rootDir, mdPath));
}

await main();
