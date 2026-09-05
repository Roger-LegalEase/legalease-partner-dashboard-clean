#!/usr/bin/env node
// WHICH DELIVERING FAMILIES CARRY A WIDGET THAT WILL ACQUIRE A BORDER THE FORM
// DOES NOT PRINT?
//
//   node scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs
//   node scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs --out <dir>
//
// READ-ONLY. This opens family receipts, delivered write proofs and official
// binaries, and writes one report under
// data/rcap-grade-a/packet-factory-24h/fix80/. It repairs nothing, rebuilds
// nothing, and touches no family's builder or directory. It is written in the
// pattern of scripts/rcap-official-forms/scan-synthesized-off-appearances.mjs,
// which counts FIX50's condition; this one counts FIX80's.
//
// THE CONDITION IT COUNTS. `/MK /BC` is a widget's border colour and `/MK /BG`
// its background colour. ISO 32000-1 12.5.6.19 makes both appearance
// CHARACTERISTICS, consulted only when a viewer must construct an appearance
// for itself; a widget drawn from its own `/AP /N` never has its `/MK` read.
// pdf-lib's default providers read `/MK` unconditionally whenever they
// regenerate, and sanitizeAndFlatten calls form.updateFieldAppearances() before
// flatten(). So a widget reaching that call with `/MK /BC` and no usable
// appearance is stamped as a stroked rectangle on the filing.
//
// TWO WAYS A WIDGET REACHES THAT CALL WITHOUT AN APPEARANCE, and they are
// reported separately because they are different facts about the source:
//
//   NO_SOURCE_APPEARANCE       the form ships no usable `/AP /N` for it at all.
//   APPEARANCE_CLEARED_BY_DROP the form ships one, and the unwritten-input drop
//                              clears it -- then cannot detach the field,
//                              because the field hangs below an AcroForm root
//                              rather than sitting in `/Fields`, so
//                              updateFieldAppearances regenerates it and
//                              flatten() finds the page through the widget's
//                              own `/P`. This is Colorado JDF 641's shape, the
//                              one VF02 measured at 8,344 dark pixels.
//
// A field the family WROTE is never counted: FIX80's option is defined over
// unwritten fields only, and a written value must keep whatever the pipeline
// draws for it. Writes are read from each family's own delivered write proof,
// reports/actual-writes.json, which is read back from the artifact bytes rather
// than from the finalizer's report.
//
// Pushbuttons are not counted. A pushbutton is chrome, its caption comes from
// `/MK /CA` rather than from `/BC`, and detachNestedControlFields is the option
// that governs it. Widgets the source marks Hidden or NoView are not counted
// either: they are dropped before any disposition is read.
//
// SOURCES ARE RESOLVED BY CONTENT HASH, NEVER BY DECLARED PATH. A receipt's
// pathInArchive says where the bytes were when the family was built; opening it
// would measure whatever is there now under a name the receipt happens to
// carry. Every mounted custody is indexed by SHA-256 first. A digest no mounted
// custody holds is NOT_MEASURABLE_HERE -- an honest absence, and never a zero.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFRawStream, PDFRef } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CENSUS = path.join(rootDir, "data/rcap-all50/overlays/census-v1");
const MASTER_QUEUE = path.join(rootDir, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const DEFAULT_OUT = path.join(rootDir, "data/rcap-grade-a/packet-factory-24h/fix80");
const OPT_IN_OPTION = "suppressSynthesizedWidgetBorders";

const ANNOT_FLAG_HIDDEN = 1 << 1;
const ANNOT_FLAG_NOVIEW = 1 << 5;

/** The custodies this container has mounted. Read-only inputs, both of them. */
function custodyRoots() {
  const candidates = [];
  const named = process.env.MASTER_LIBRARY_SOURCE_DIR ?? process.env.RCAP_BUNDLE_EXTRACT;
  if (named) candidates.push(named);
  candidates.push(path.join(rootDir, "private/source-imports"), path.join(rootDir, "private/human-source-returns"));
  const real = [];
  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    let resolved;
    try { resolved = fs.realpathSync(candidate); } catch { continue; }
    if (!real.includes(resolved)) real.push(resolved);
  }
  const inside = (a, b) => a.startsWith(`${b}${path.sep}`);
  return real.filter((r) => !real.some((other) => other !== r && inside(r, other))).sort();
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
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

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };

/** True when the source itself says no viewer displays this widget. */
function isNonDisplayed(widget) {
  const flags = widget.dict.lookup(PDFName.of("F"));
  if (!(flags instanceof PDFNumber)) return false;
  const value = flags.asNumber();
  return (value & ANNOT_FLAG_HIDDEN) !== 0 || (value & ANNOT_FLAG_NOVIEW) !== 0;
}

/** True when this field sits directly in the AcroForm's own /Fields array. */
function isRootField(doc, acroField) {
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  const fields = acroForm?.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!fields) return false;
  for (let i = 0; i < fields.size(); i += 1) {
    const entry = fields.get(i);
    if (entry === acroField.ref || doc.context.lookup(entry) === acroField.dict) return true;
  }
  return false;
}

/**
 * One official binary, measured against the writes its family delivered.
 *
 * Reads structure only: field type, /MK, /AP, the display flag and where the
 * field hangs in the tree. No caption, form number or jurisdiction is consulted
 * here or anywhere below, and no family is named in any condition.
 */
async function measure(bytes, writtenFieldNames) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const out = { widgets: 0, unwrittenWidgetsWithBorderCharacteristics: 0,
    noSourceAppearance: 0, appearanceClearedByDrop: 0, exposed: [] };
  let form;
  try { form = doc.getForm(); } catch { return { ...out, unreadableForm: true }; }
  for (const field of form.getFields()) {
    const name = field.getName();
    const dict = field.acroField.dict;
    const fieldType = String(dict.lookup(PDFName.of("FT"))?.toString?.() ?? "");
    const flags = dict.lookup(PDFName.of("Ff"));
    const pushButton = fieldType === "/Btn" && flags instanceof PDFNumber && (flags.asNumber() & (1 << 16)) !== 0;
    if (pushButton) continue;
    const written = writtenFieldNames === null ? null : writtenFieldNames.has(name);
    for (const widget of field.acroField.getWidgets()) {
      out.widgets += 1;
      if (isNonDisplayed(widget)) continue;
      const mk = widget.dict.lookup(PDFName.of("MK"));
      const hasBorderColour = mk instanceof PDFDict && mk.get(PDFName.of("BC")) !== undefined;
      if (!hasBorderColour) continue;
      if (written !== false) continue;
      out.unwrittenWidgetsWithBorderCharacteristics += 1;

      const ap = widget.dict.lookup(PDFName.of("AP"));
      const normal = ap instanceof PDFDict ? doc.context.lookup(ap.get(PDFName.of("N"))) : undefined;
      // What "usable" means depends on how the appearance is spelled, and the
      // two spellings are not interchangeable. A bare stream is placed as it
      // stands. A STATE DICTIONARY -- how every check box and radio widget
      // ships -- is usable only when it carries an entry for the state the
      // widget is currently in: pdf-lib regenerates on exactly that condition
      // (PDFCheckBox.needsAppearancesUpdate), and a dictionary that carries the
      // /AS state is drawn from, not regenerated. Reading a state dictionary as
      // "no appearance" would count every unticked box in the corpus.
      const state = widget.dict.lookup(PDFName.of("AS"));
      const usableAppearance = normal instanceof PDFDict
        ? state instanceof PDFName && normal.get(state) !== undefined
        : normal !== undefined && normal?.dict !== undefined;
      // A choice field with no value written is dropped by the shared step; the
      // drop clears the appearance and can only detach a field that sits in the
      // AcroForm's own /Fields array. A nested one is regenerated instead.
      const droppedWhenUnwritten = fieldType === "/Ch";
      const nested = !isRootField(doc, field.acroField);

      let why = null;
      if (!usableAppearance) why = "NO_SOURCE_APPEARANCE";
      else if (droppedWhenUnwritten && nested) why = "APPEARANCE_CLEARED_BY_DROP";
      if (!why) continue;
      if (why === "NO_SOURCE_APPEARANCE") out.noSourceAppearance += 1;
      else out.appearanceClearedByDrop += 1;
      const rect = widget.getRectangle();
      out.exposed.push({ field: name, fieldType, why,
        borderColourEntries: [...mk.keys()].map(String).filter((k) => k === "/BC" || k === "/BG"),
        fieldSitsInAcroFormFieldsArray: !nested,
        rect: { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2),
          width: +Math.abs(rect.width).toFixed(2), height: +Math.abs(rect.height).toFixed(2) } });
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
  // Read as the caller passes it, so a mention in a comment is not mistaken for
  // a call site.
  const optsIn = new RegExp(`${OPT_IN_OPTION}\\s*:\\s*true`).test(text);
  return { buildScript, optsIn, why: optsIn ? `passes ${OPT_IN_OPTION}: true` : `does not pass ${OPT_IN_OPTION}` };
}

/**
 * The field names a family actually wrote, per source binary, from its own
 * delivered byte proof.
 *
 * Returns null when the family delivers no such proof. null is not an empty
 * set: it means the writes are unknown here, and a family whose writes are
 * unknown is reported as NOT_MEASURABLE_HERE rather than as a family that wrote
 * nothing.
 */
function writtenFieldsBySourceDigest(dir) {
  const proof = readJson(path.join(dir, "reports/actual-writes.json"));
  if (!proof || !Array.isArray(proof.documents)) return null;
  const byDigest = new Map();
  for (const doc of proof.documents) {
    const digest = typeof doc.sourceSha256 === "string" ? doc.sourceSha256.toLowerCase() : null;
    if (!digest) continue;
    const names = byDigest.get(digest) ?? new Set();
    for (const write of doc.actualWrites ?? []) if (write.field) names.add(write.field);
    byDigest.set(digest, names);
  }
  return byDigest;
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
  const queue = readJson(MASTER_QUEUE) ?? {};
  const queueByFamily = new Map((queue.families ?? []).map((f) => [f.familyId, f]));

  const families = [];
  for (const state of fs.readdirSync(CENSUS).sort()) {
    const stateDir = path.join(CENSUS, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const dirName of fs.readdirSync(stateDir).sort()) {
      const dir = path.join(stateDir, dirName);
      const receipt = readJson(path.join(dir, "source-receipt.json"));
      if (!receipt) continue;
      // DELIVERING means the directory carries delivered packet bytes. A family
      // that delivers nothing cannot deliver a border.
      const fixtures = fs.existsSync(path.join(dir, "fixtures"))
        ? fs.readdirSync(path.join(dir, "fixtures")).filter((f) => f.endsWith(".pdf")) : [];
      if (fixtures.length === 0) continue;

      const familyId = receipt.familyId ?? dirName;
      const writesByDigest = writtenFieldsBySourceDigest(dir);
      const documents = [];
      for (const doc of receipt.documents ?? []) {
        const declaredSha = typeof doc.sha256 === "string" ? doc.sha256.toLowerCase() : null;
        const row = { formNumber: doc.formNumber ?? null, declaredSha256: declaredSha,
          declaredPathNotUsedForResolution: doc.pathInArchive ?? null };
        const hits = declaredSha ? byHash.get(declaredSha) : undefined;
        if (!hits || hits.length === 0) {
          row.resolution = "NOT_MEASURABLE_HERE";
          row.why = declaredSha ? "no file in any mounted custody hashes to the digest this receipt pins"
            : "the receipt pins no SHA-256 for this document, so it cannot be resolved by content";
          documents.push(row);
          continue;
        }
        if (writesByDigest === null || !writesByDigest.has(declaredSha)) {
          row.resolution = "NOT_MEASURABLE_HERE";
          row.why = writesByDigest === null
            ? "the family delivers no reports/actual-writes.json, so which fields it wrote is unknown here"
            : "the family's write proof carries no entry for this source digest";
          documents.push(row);
          continue;
        }
        row.resolution = "RESOLVED_BY_CONTENT_HASH";
        row.resolvedFrom = path.relative(rootDir, hits[0]);
        row.writtenFields = writesByDigest.get(declaredSha).size;
        try {
          Object.assign(row, await measure(fs.readFileSync(hits[0]), writesByDigest.get(declaredSha)));
        } catch (error) {
          row.resolution = "NOT_MEASURABLE_HERE";
          row.why = `resolved by hash but could not be read as a PDF form: ${error.message}`;
        }
        documents.push(row);
      }

      const measured = documents.filter((d) => d.resolution === "RESOLVED_BY_CONTENT_HASH");
      const notMeasurable = documents.filter((d) => d.resolution === "NOT_MEASURABLE_HERE");
      const exposed = measured.flatMap((d) => (d.exposed ?? []).map((w) => ({ ...w, formNumber: d.formNumber })));
      families.push({
        familyId,
        jurisdiction: receipt.jurisdiction ?? state.toUpperCase(),
        familyDirectory: path.relative(rootDir, dir),
        implementationStrategy: receipt.implementationStrategy ?? null,
        masterQueueState: queueByFamily.get(familyId)?.state ?? "NOT_IN_MASTER_QUEUE",
        builder: builderOptsIn(queueByFamily.get(familyId)?.buildScript ?? null),
        documentsDeclared: documents.length,
        documentsMeasured: measured.length,
        documentsNotMeasurableHere: notMeasurable.length,
        unwrittenWidgetsWithBorderCharacteristics:
          measured.reduce((n, d) => n + (d.unwrittenWidgetsWithBorderCharacteristics ?? 0), 0),
        widgetsExposedNoSourceAppearance: measured.reduce((n, d) => n + (d.noSourceAppearance ?? 0), 0),
        widgetsExposedAppearanceClearedByDrop: measured.reduce((n, d) => n + (d.appearanceClearedByDrop ?? 0), 0),
        widgetsExposed: exposed.length,
        inCohort: exposed.length > 0,
        exposedWidgets: exposed,
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
    byJurisdiction[f.jurisdiction].widgets += f.widgetsExposed;
    byJurisdiction[f.jurisdiction].familyIds.push(f.familyId);
  }

  const report = {
    schemaVersion: "rcap-synthesized-widget-border-cohort/v1",
    generatedBy: "scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs",
    lane: "FIX80",
    readOnly: true,
    question: "Which DELIVERING families bind an official form carrying a widget the family does not write, with "
      + "/MK /BC and no usable appearance at the moment pdf-lib regenerates, so the shared flattening step "
      + "synthesizes a bordered rectangle the form does not print?",
    resolution: {
      method: "SHA-256 of the bytes, looked up in an index of every mounted custody. The receipt's declared path is "
        + "recorded and never opened. Which fields a family wrote is read from its own delivered "
        + "reports/actual-writes.json, which is read back from the artifact bytes.",
      custodyRootsIndexed: roots,
      filesIndexed: files
    },
    whatIsNotCounted: "A field the family WROTE, a pushbutton (its caption comes from /MK /CA and "
      + "detachNestedControlFields governs it), a widget the source marks Hidden or NoView, and a widget with no "
      + "/MK /BC at all. A widget that keeps a usable source appearance through the flatten is not exposed either: "
      + "its /MK is never read.",
    twoWaysAWidgetIsExposed: {
      NO_SOURCE_APPEARANCE: "the form ships no usable /AP /N for the widget, so pdf-lib generates one from /MK.",
      APPEARANCE_CLEARED_BY_DROP: "the form ships one, the unwritten-input drop clears it, and the field hangs below "
        + "an AcroForm root so the drop cannot detach it -- pdf-lib regenerates from /MK and flatten() finds the "
        + "page through the widget's own /P. Colorado JDF 641's shape."
    },
    optInOption: OPT_IN_OPTION,
    howThisScanWasProvedToMeasureTheRightThing:
      "It is run against a family whose exposure was measured in ink first. VF02 measured Colorado's "
      + "co_multiple_conviction_seal-set at exactly three exposed widgets -- JDF-641 9B.0, 9B.2 and 9C.0, 8,344 dark "
      + "pixels at 300 dpi -- and this scan returns exactly those three for that family and no fourth. An earlier "
      + "spelling of the usability test read a check box's /AP /N STATE DICTIONARY as 'no appearance' and returned "
      + "28 for the same family, 21 families and 468 widgets for the corpus; that spelling was wrong and is not what "
      + "is reported here.",
    totals: {
      deliveringFamilyDirectoriesScanned: families.length,
      familiesInCohort: cohort.length,
      familiesInCohortStillOnTheOldDefault: stillOnTheOldDefault.length,
      familiesInCohortAlreadyOptedIn: cohort.length - stillOnTheOldDefault.length,
      widgetsInCohort: cohort.reduce((n, f) => n + f.widgetsExposed, 0),
      widgetsInCohortNoSourceAppearance: cohort.reduce((n, f) => n + f.widgetsExposedNoSourceAppearance, 0),
      widgetsInCohortAppearanceClearedByDrop: cohort.reduce((n, f) => n + f.widgetsExposedAppearanceClearedByDrop, 0),
      familiesWithAtLeastOneSourceNotMeasurableHere: partiallyMeasurable.length,
      documentsNotMeasurableHere: families.reduce((n, f) => n + f.documentsNotMeasurableHere, 0)
    },
    byJurisdiction,
    cohort,
    familiesWithSourcesNotMeasurableHere: partiallyMeasurable.map((f) => ({
      familyId: f.familyId, jurisdiction: f.jurisdiction,
      notMeasurable: f.documents.filter((d) => d.resolution === "NOT_MEASURABLE_HERE")
        .map((d) => ({ formNumber: d.formNumber, declaredSha256: d.declaredSha256, why: d.why }))
    })),
    everyFamilyScanned: families.map((f) => ({
      familyId: f.familyId, jurisdiction: f.jurisdiction, masterQueueState: f.masterQueueState,
      inCohort: f.inCohort, widgetsExposed: f.widgetsExposed,
      documentsNotMeasurableHere: f.documentsNotMeasurableHere, builderOptsIn: f.builder.optsIn
    })),
    grantsNothing: "A cohort is a measurement. It authorizes no rebuild, no route change and no promotion, and no "
      + "family listed here is repaired by being listed. FIX80 repaired one family and left the rest measured."
  };

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "MK_BORDER_COHORT.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`scanned ${families.length} delivering family directories`);
  console.log(`cohort: ${cohort.length} families, ${report.totals.widgetsInCohort} widgets `
    + `(${report.totals.widgetsInCohortNoSourceAppearance} with no source appearance, `
    + `${report.totals.widgetsInCohortAppearanceClearedByDrop} cleared by the drop), `
    + `${stillOnTheOldDefault.length} still on the old default`);
  console.log(`not measurable here: ${report.totals.documentsNotMeasurableHere} documents `
    + `across ${partiallyMeasurable.length} families`);
  console.log(path.relative(rootDir, jsonPath));
}

await main();
