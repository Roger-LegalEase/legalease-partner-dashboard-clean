#!/usr/bin/env node
// Which committed artifacts carry a flattened appearance that is not where PDF
// 12.5.5 puts it.
//
//   node scripts/rcap-official-forms/rcap-acroform-appearance-defect.mjs \
//     [--baseline <rev>] [--out <path>] [--print]
//
// pdf-lib's PDFForm.flatten() draws a widget's normal appearance with
//
//     q  1 0 0 1 Rect.x Rect.y cm  /FlatWidget Do  Q
//
// 12.5.5 does not say that. It says: transform the appearance /BBox by the
// stream's /Matrix, take the bounding box of the result, and compute the matrix
// that maps that box onto the NORMALIZED annotation /Rect. The two agree only
// when the transformed BBox already starts at the origin and the /Rect is
// written lower-corner-first. Two legal spellings break the agreement, and both
// occur in official forms this repository builds on:
//
//   absolute BBox    the appearance is written in page coordinates, so
//                    flatten() translates it a SECOND time and the mark lands
//                    at twice its true x and y (WV SCA-C906: up to 699pt).
//   reversed /Rect   the rectangle is written upper-corner-first, so pdf-lib
//                    reports a negative height, generates an appearance whose
//                    BBox runs downward from the origin, and translates by the
//                    TOP edge -- the mark lands one full box below its box
//                    (VA CC-1201: 10.93pt, exactly the box's own height).
//
// Either way an opaque checkbox interior is stamped over printed source text.
//
// The test here is on bytes, not on intent, and it is a COMPARISON against the
// official source rather than a property of the artifact alone.
//
// flatten() identifies itself. The translate it emits is the widget /Rect's
// first corner exactly as written, so an appearance in the artifact can be
// matched back to the widget it came from by that corner alone -- no name
// survives flattening, and none is needed. Once matched, 12.5.5 states the
// answer: the appearance must occupy that widget's NORMALIZED rectangle. So the
// artifact is asked where the appearance actually lands -- the translate, plus
// the appearance's own /Matrix-transformed /BBox -- and that box is compared to
// the rectangle the source says it belongs in.
//
// The comparison is what keeps the finding honest in both directions. A
// negative-height /BBox is not by itself a defect: pdf-lib generates one for a
// reversed /Rect and then translates by the top edge, and the two cancel to
// the right rectangle. Neither is an appearance drawn on a page whose form is
// not in the receipt: nothing is known about where it belongs, so it is counted
// as unmatched rather than called misplaced. And a family that flattens a form
// carrying absolute-BBox widgets is not affected if those widgets were dropped
// unselected before flatten() ran. Only the landing box settles any of it.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { normalizeWidgetAppearancePlacement } from "./rcap-widget-appearance-placement.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..", "..");
process.chdir(ROOT);

const OVERLAY_ROOTS = ["data/rcap-all50/overlays/census-v1", "data/rcap-all50/overlays/production"];
const DEFAULT_OUT = "data/rcap-grade-a/ACROFORM_APPEARANCE_DEFECT.json";
// The commit this lane branched from: the state of the artifacts as the defect
// was found. Recording the rev is what makes the finding re-checkable after the
// repair has replaced the bytes.
const DEFAULT_BASELINE = "0ae5ae6c0";
// Below a hundredth of a point is not a placement difference at any raster
// resolution; the same floor the correction module refuses to rewrite under.
const MIN_DISPLACEMENT_POINTS = 0.01;

const git = (...args) => execFileSync("git", args, { maxBuffer: 1 << 28 });
const gitText = (...args) => git(...args).toString("utf8");
const inflate = (b) => { try { return zlib.inflateSync(b); } catch { return b; } };
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const applyMatrix = ([a, b, c, d, e, f], x, y) => [a * x + c * y + e, b * x + d * y + f];

function blobAt(rev, file) {
  try { return git("show", `${rev}:${file}`); } catch { return null; }
}

function numbersOf(ctx, dict, key, length) {
  const arr = ctx.lookup(dict.get(PDFName.of(key)));
  if (!(arr instanceof PDFArray) || arr.size() !== length) return null;
  const out = [];
  for (let i = 0; i < length; i += 1) {
    const entry = ctx.lookup(arr.get(i));
    if (!entry || typeof entry.asNumber !== "function") return null;
    out.push(entry.asNumber());
  }
  return out;
}

/**
 * Every widget of an official source, with BOTH spellings of its rectangle:
 * the first corner exactly as written, which is what flatten() translates by
 * and therefore what identifies the widget in a flattened artifact, and the
 * normalized rectangle, which is where 12.5.5 says its appearance belongs.
 */
export async function sourceWidgetRects(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pageRefs = doc.getPages().map((page) => page.ref);
  const rects = [];
  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const raw = widget.getRectangle();
      if (!(Math.abs(raw.width) > 0) || !(Math.abs(raw.height) > 0)) continue;
      const pageRef = widget.P();
      const page = pageRefs.findIndex((ref) => pageRef && ref.tag === pageRef.tag);
      rects.push({
        field: field.getName(),
        type: field.constructor.name,
        page: page >= 0 ? page + 1 : null,
        translatedTo: { x: Number(raw.x.toFixed(2)), y: Number(raw.y.toFixed(2)) },
        rectAsWritten: [raw.x, raw.y, raw.x + raw.width, raw.y + raw.height].map((v) => Number(v.toFixed(2))),
        belongsIn: {
          x: Number(Math.min(raw.x, raw.x + raw.width).toFixed(2)),
          y: Number(Math.min(raw.y, raw.y + raw.height).toFixed(2)),
          width: Number(Math.abs(raw.width).toFixed(2)),
          height: Number(Math.abs(raw.height).toFixed(2))
        }
      });
    }
  }
  return rects;
}

/**
 * Every flattened appearance in `bytes` that does not occupy the rectangle its
 * own source widget declares.
 *
 * Returns { misplaced, matched, unmatched }. `unmatched` counts appearances
 * whose translate matches no widget of any source in the family's receipt --
 * a page from a document the receipt does not carry. Those are reported, never
 * judged: an appearance whose widget is unknown cannot be shown to be wrong.
 */
export async function misplacedFlattenedAppearances(bytes, sourceRects, tolerance = 0.05) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const misplaced = [];
  let matched = 0;
  let unmatched = 0;
  doc.getPages().forEach((page, index) => {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjectsRef = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjectsRef) return;
    const xObjects = ctx.lookup(xObjectsRef);
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let stream = "";
    for (const ref of refs) {
      const obj = ctx.lookup(ref);
      if (obj && obj.contents) stream += inflate(Buffer.from(obj.contents)).toString("latin1");
    }
    // The finalizer emits several `cm` before the Do; only the composed
    // translation is the placement, so every one of them is summed.
    const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
    let match;
    while ((match = placement.exec(stream))) {
      let tx = 0, ty = 0;
      for (const cm of match[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) {
        tx += Number(cm[5]); ty += Number(cm[6]);
      }
      const key = PDFName.of(match[2]);
      if (!xObjects.has(key)) continue;
      const obj = ctx.lookup(xObjects.get(key));
      if (!obj || !obj.dict) continue;
      const bbox = numbersOf(ctx, obj.dict, "BBox", 4);
      if (!bbox) continue;
      const matrix = numbersOf(ctx, obj.dict, "Matrix", 6) ?? [1, 0, 0, 1, 0, 0];
      const corners = [[bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[2], bbox[3]], [bbox[0], bbox[3]]]
        .map(([x, y]) => applyMatrix(matrix, x, y));
      const minX = Math.min(...corners.map((p) => p[0]));
      const minY = Math.min(...corners.map((p) => p[1]));
      const landsOn = {
        x: Number((tx + minX).toFixed(2)),
        y: Number((ty + minY).toFixed(2)),
        width: Number((Math.max(...corners.map((p) => p[0])) - minX).toFixed(2)),
        height: Number((Math.max(...corners.map((p) => p[1])) - minY).toFixed(2))
      };
      const candidates = sourceRects.filter((r) => Math.abs(r.translatedTo.x - tx) <= tolerance
        && Math.abs(r.translatedTo.y - ty) <= tolerance);
      if (candidates.length === 0) { unmatched += 1; continue; }
      const correct = candidates.find((r) => Math.abs(r.belongsIn.x - landsOn.x) <= 0.5
        && Math.abs(r.belongsIn.y - landsOn.y) <= 0.5);
      if (correct) { matched += 1; continue; }
      const widget = candidates[0];
      const displacement = Math.hypot(widget.belongsIn.x - landsOn.x, widget.belongsIn.y - landsOn.y);
      if (displacement < MIN_DISPLACEMENT_POINTS) { matched += 1; continue; }
      misplaced.push({
        page: index + 1,
        appearance: match[2],
        sourceWidget: { field: widget.field, type: widget.type, sourcePage: widget.page, rectAsWritten: widget.rectAsWritten },
        placedAt: { x: Number(tx.toFixed(2)), y: Number(ty.toFixed(2)) },
        belongsIn: widget.belongsIn,
        landsOn,
        displacementPoints: Number(displacement.toFixed(2))
      });
    }
  });
  return { misplaced, matched, unmatched };
}

/** What the OFFICIAL source spells in a way flatten() cannot place. */
async function scanSource(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const fieldTypes = new Map();
  let reversedRectWidgets = 0;
  for (const field of form.getFields()) {
    fieldTypes.set(field.getName(), field.constructor.name);
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      if (rect.width < 0 || rect.height < 0) reversedRectWidgets += 1;
    }
  }
  const report = normalizeWidgetAppearancePlacement(doc);
  const byFieldType = {};
  for (const entry of report.corrected) {
    const type = fieldTypes.get(entry.field) ?? "unknown";
    byFieldType[type] = (byFieldType[type] ?? 0) + 1;
  }
  return {
    widgetsInspected: report.widgetsInspected,
    appearanceStreamsInspected: report.appearanceStreamsInspected,
    absoluteBBoxAppearances: report.corrected.length,
    absoluteBBoxByFieldType: byFieldType,
    reversedRectWidgets,
    maxSourceDisplacementPoints: report.corrected.length
      ? Math.max(...report.corrected.map((c) => c.maxCornerDisplacementPoints)) : 0
  };
}

/** Families, read from the git tree so a sparse working copy still enumerates all of them. */
function familiesAt(rev) {
  const names = gitText("ls-tree", "-r", "--name-only", rev).split("\n").filter(Boolean);
  const dirs = new Map();
  for (const file of names) {
    if (!OVERLAY_ROOTS.some((root) => file.startsWith(`${root}/`))) continue;
    const receipt = /^(.*)\/source-receipt\.json$/.exec(file);
    if (receipt) {
      const entry = dirs.get(receipt[1]) ?? { dir: receipt[1], artifacts: [] };
      entry.receipt = file;
      dirs.set(receipt[1], entry);
      continue;
    }
    const fixture = /^(.*)\/fixtures\/.*\.pdf$/.exec(file);
    if (fixture) {
      const entry = dirs.get(fixture[1]) ?? { dir: fixture[1], artifacts: [] };
      entry.artifacts.push(file);
      dirs.set(fixture[1], entry);
    }
  }
  return [...dirs.values()].filter((e) => e.receipt).sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * The build script that owns a family directory, the module it delegates to,
 * and the shared host through which that module reaches PDFForm.flatten().
 *
 * The owner is resolved by exact filename first -- a family named X is built by
 * `scripts/build-census-v1-X.mjs` when that file exists -- and only then by
 * search, so a script that merely mentions a sibling family in a shared table
 * cannot be reported as its builder. The delegate is read from the owner's own
 * imports, which is how a four-line wrapper such as the WV single-misdemeanor
 * builder is attributed to the host that actually renders it.
 */
function readScript(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return (blobAt("HEAD", file) ?? Buffer.alloc(0)).toString("utf8"); }
}

function ownerOf(familyId, dir) {
  const exact = `scripts/build-census-v1-${familyId}.mjs`;
  if (fs.existsSync(exact)) return exact;
  const leaf = path.basename(dir);
  let out = "";
  try {
    out = execFileSync("git", ["grep", "-l", "-F", dir, "--", "scripts/"], { maxBuffer: 1 << 26 }).toString();
  } catch { out = ""; }
  const candidates = out.split("\n").filter(Boolean)
    .filter((file) => /^scripts\/(build-census-v1-|render-rcap-|implement-rcap-)/.test(file));
  const named = candidates.find((file) => path.basename(file, ".mjs").endsWith(leaf.replace(/--.*$/, "")));
  if (named ?? candidates[0]) return named ?? candidates[0];
  // A family directory the builders never name literally, because the script
  // composes the path from an overlay root. Attribute it to the script that
  // declares that root, read from the script rather than assumed here.
  const root = OVERLAY_ROOTS.find((candidate) => dir.startsWith(`${candidate}/`));
  if (!root) return null;
  let byRoot = "";
  try {
    byRoot = execFileSync("git", ["grep", "-l", "-F", root, "--", "scripts/"], { maxBuffer: 1 << 26 }).toString();
  } catch { byRoot = ""; }
  const writers = byRoot.split("\n").filter(Boolean)
    .filter((file) => /^scripts\/(implement-rcap-|render-rcap-)/.test(file))
    .filter((file) => new RegExp(`(OUT|ROOT|DIR)\\s*=\\s*[^\\n]*"${root}"`).test(readScript(file))
      || new RegExp(`path\\.join\\([^\\n]*"${root}"`).test(readScript(file)));
  return writers.sort()[0] ?? null;
}

/** The build-time modules an owner delegates rendering to, transitively. */
function delegatesOf(owner, seen = new Set()) {
  if (!owner || seen.has(owner)) return [];
  seen.add(owner);
  const text = readScript(owner);
  const found = [];
  for (const match of text.matchAll(/from\s+"(\.[^"]+\.mjs)"/g)) {
    const resolved = path.normalize(path.join(path.dirname(owner), match[1]));
    if (!resolved.startsWith("scripts/")) continue;
    found.push(resolved, ...delegatesOf(resolved, seen));
  }
  return [...new Set(found)];
}

const FLATTEN_HOSTS = Object.freeze({
  "scripts/rcap-official-forms/rcap-active-content.mjs": "sanitizeAndFlatten -> PDFForm.flatten()",
  "scripts/rcap-official-forms/rcap-official-form-finalize.mjs": "finalizeOfficialForm -> sanitizeAndFlatten",
  "scripts/rcap-official-forms/rcap-contact-sheet.mjs": "contact sheet -> sanitizeAndFlatten"
});

function reachesFlatten(files) {
  const hosts = new Set();
  for (const file of files) {
    const text = readScript(file);
    if (/sanitizeAndFlatten|form\.flatten\(\)/.test(text)) hosts.add("scripts/rcap-official-forms/rcap-active-content.mjs");
    if (/rcap-official-form-finalize/.test(text)) hosts.add("scripts/rcap-official-forms/rcap-official-form-finalize.mjs");
    if (/rcap-contact-sheet/.test(text)) hosts.add("scripts/rcap-official-forms/rcap-contact-sheet.mjs");
  }
  return [...hosts].sort().map((file) => ({ file, path: FLATTEN_HOSTS[file] }));
}

async function main() {
  const argv = process.argv.slice(2);
  const at = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
  };
  const baseline = at("--baseline", DEFAULT_BASELINE);
  const outFile = at("--out", DEFAULT_OUT);
  const baselineSha = gitText("rev-parse", baseline).trim();

  const corpusRoot = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";

  const sourceCache = new Map();
  const families = [];
  let artifactsScanned = 0;
  const unreadable = [];

  for (const entry of familiesAt(baselineSha)) {
    const receiptBytes = blobAt(baselineSha, entry.receipt);
    if (!receiptBytes) continue;
    let receipt;
    try { receipt = JSON.parse(receiptBytes.toString("utf8")); } catch { continue; }
    const familyId = receipt.familyId ?? path.basename(entry.dir);

    const documents = receipt.documents
      ?? (receipt.pathInArchive ? [{ formNumber: receipt.documentId, pathInArchive: receipt.pathInArchive, sha256: receipt.sha256 }] : []);
    const officialForms = [];
    const familyRects = [];
    for (const document of documents) {
      if (!document.pathInArchive || !/\.pdf$/i.test(document.pathInArchive)) continue;
      const file = path.join(corpusRoot, document.pathInArchive);
      const record = {
        formNumber: document.formNumber ?? null,
        pathInArchive: document.pathInArchive,
        sha256: document.sha256 ?? null
      };
      if (!fs.existsSync(file)) {
        record.sourceOnDisk = false;
        record.note = "not present in the mounted corpus; the source spelling could not be read first-hand";
      } else {
        record.sourceOnDisk = true;
        if (!sourceCache.has(file)) {
          try {
            sourceCache.set(file, { scan: await scanSource(file), rects: await sourceWidgetRects(fs.readFileSync(file)) });
          } catch (error) {
            sourceCache.set(file, { scan: { unreadable: String(error.message ?? error) }, rects: [] });
          }
        }
        Object.assign(record, sourceCache.get(file).scan);
        familyRects.push(...sourceCache.get(file).rects);
      }
      officialForms.push(record);
    }

    const artifacts = [];
    for (const file of entry.artifacts.sort()) {
      const baselineBytes = blobAt(baselineSha, file);
      if (!baselineBytes) continue;
      artifactsScanned += 1;
      const record = { path: file, baselineSha256: sha256(baselineBytes) };
      if (familyRects.length === 0) {
        record.notJudged = "no official source widget rectangles were readable for this family, so no landing box could be compared";
        artifacts.push(record);
        continue;
      }
      try {
        const scan = await misplacedFlattenedAppearances(baselineBytes, familyRects);
        record.flattenedAppearancesOnSourceWidgets = scan.matched;
        record.flattenedAppearancesNotTraceableToAReceiptSource = scan.unmatched;
        record.misplacedFlattenedAppearances = scan.misplaced.length;
        record.maxDisplacementPoints = scan.misplaced.length
          ? Math.max(...scan.misplaced.map((m) => m.displacementPoints)) : 0;
        if (scan.misplaced.length) record.misplaced = scan.misplaced;
      } catch (error) {
        record.unreadable = String(error.message ?? error);
        unreadable.push({ path: file, reason: record.unreadable });
      }
      const currentBytes = fs.existsSync(file) ? fs.readFileSync(file) : blobAt("HEAD", file);
      if (currentBytes) {
        record.currentSha256 = sha256(currentBytes);
        record.bytesChangedSinceBaseline = record.currentSha256 !== record.baselineSha256;
        if (record.bytesChangedSinceBaseline) {
          try {
            const after = await misplacedFlattenedAppearances(currentBytes, familyRects);
            record.misplacedAfterRepair = after.misplaced.length;
          } catch { record.misplacedAfterRepair = null; }
        }
      }
      artifacts.push(record);
    }

    const affectedArtifacts = artifacts.filter((a) => (a.misplacedFlattenedAppearances ?? 0) > 0);
    const owner = affectedArtifacts.length ? ownerOf(familyId, entry.dir) : null;
    const delegates = owner ? delegatesOf(owner) : [];
    families.push({
      familyId,
      jurisdiction: receipt.jurisdiction ?? null,
      directory: entry.dir,
      implementationStrategy: receipt.implementationStrategy
        ?? (/--custom-pleading$/.test(entry.dir) ? "custom_pleading" : null),
      officialForms,
      artifacts,
      affected: affectedArtifacts.length > 0,
      affectedArtifacts: affectedArtifacts.length,
      artifactsScanned: artifacts.length,
      maxDisplacementPoints: affectedArtifacts.length
        ? Math.max(...affectedArtifacts.map((a) => a.maxDisplacementPoints)) : 0,
      buildScript: owner,
      buildScriptDelegatesTo: delegates.filter((f) => /^scripts\/build-census-v1-|^scripts\/render-rcap-|^scripts\/implement-rcap-/.test(f)),
      flattenHosts: reachesFlatten(owner ? [owner, ...delegates] : []),
      currentArtifactStaleAtBaseline: affectedArtifacts.length > 0,
      repairedInWorkingTree: affectedArtifacts.length > 0
        && affectedArtifacts.every((a) => a.bytesChangedSinceBaseline && a.misplacedAfterRepair === 0)
    });
  }

  const affected = families.filter((f) => f.affected);
  const ruledOutWithAbsoluteBBoxSource = families.filter((f) => !f.affected
    && f.officialForms.some((d) => (d.absoluteBBoxAppearances ?? 0) > 0 || (d.reversedRectWidgets ?? 0) > 0));

  const record = {
    schemaVersion: "rcap-acroform-appearance-defect/v1",
    generatedBy: "scripts/rcap-official-forms/rcap-acroform-appearance-defect.mjs",
    baselineRev: baselineSha,
    corpusRoot,
    defect: {
      title: "pdf-lib PDFForm.flatten() does not implement PDF 32000-1 12.5.5 appearance placement",
      emits: "q 1 0 0 1 Rect.x Rect.y cm /FlatWidget Do Q",
      requires: "map the /Matrix-transformed /BBox bounding box onto the NORMALIZED /Rect",
      spellingsThatBreak: [
        "appearance /BBox written in absolute page coordinates: the mark is translated a second time and lands at twice its true x and y",
        "annotation /Rect written upper-corner-first: pdf-lib reports a negative height, generates a downward BBox and translates by the top edge, so the mark lands one full box low"
      ],
      harm: "the opaque interior of a checkbox or radio appearance is stamped over printed source text at the wrong place, and the control it belongs to is left blank",
      correctedIn: "scripts/rcap-official-forms/rcap-widget-appearance-placement.mjs (normalizeWidgetAppearancePlacement), applied before PDFForm.flatten() inside sanitizeAndFlatten"
    },
    test: {
      onSource: "normalizeWidgetAppearancePlacement reports a correction that MOVES an appearance by >= 0.01pt, plus a count of reversed-corner /Rect widgets",
      onArtifact: "a flattened appearance XObject whose /Matrix-transformed /BBox lower-left corner is not the origin; that offset is the distance the mark misses by",
      whyArtifactGoverns: "a family may reach flatten() on a form with an absolute-BBox widget and still be unaffected, because the widget was dropped unselected or its appearance was regenerated before flattening. Only the committed bytes settle it."
    },
    totals: {
      familiesScanned: families.length,
      artifactsScanned,
      affectedFamilies: affected.length,
      affectedArtifacts: affected.reduce((sum, f) => sum + f.affectedArtifacts, 0),
      ruledOut: families.length - affected.length,
      ruledOutDespiteASourceThatSpellsItBadly: ruledOutWithAbsoluteBBoxSource.length,
      artifactsUnreadableByPdfLib: unreadable.length
    },
    affectedFamilies: affected.map((f) => f.familyId),
    // What the affected bytes may no longer be used for. Nothing here deletes a
    // PDF: a stale artifact deleted to make a verifier green destroys the
    // evidence of what was wrong.
    staleArtifactEvidence: {
      blockingIsAtFamilyLevel: "every fixture of an affected family is blocked, including one that happens to carry fewer misplaced marks than another",
      bytesAreKept: true,
      refusedCapabilities: [
        "artifact_approval",
        "grade_a_fulfillment",
        "packet_family_completion",
        "launch_authority",
        "commercial_admission",
        "participant_delivery",
        "census_packet_evidence"
      ],
      blocked: affected.flatMap((f) => f.artifacts
        .filter((a) => (a.misplacedFlattenedAppearances ?? 0) > 0)
        .map((a) => ({
          familyId: f.familyId,
          path: a.path,
          staleSha256: a.baselineSha256,
          misplacedFlattenedAppearances: a.misplacedFlattenedAppearances,
          maxDisplacementPoints: a.maxDisplacementPoints,
          rebuiltSha256: a.bytesChangedSinceBaseline ? a.currentSha256 : null
        })))
    },
    // A rebuild is not a verification. Every family whose bytes changed here
    // owes an independent read by someone who did not perform the repair, and
    // any earlier verdict that rested on the stale bytes is withdrawn rather
    // than carried forward.
    reVerificationOwed: affected.map((f) => ({
      familyId: f.familyId,
      rebuilt: f.repairedInWorkingTree,
      owes: "an independent visual and placement re-verification of the rebuilt artifacts",
      priorVerdictsWithdrawn: "any obligation verdict recorded against the stale hashes above rested on incorrectly placed checkbox appearances",
      regressionControl: "scripts/rcap-official-forms/test-widget-appearance-placement.mjs"
    })),
    ruledOutDespiteASourceThatSpellsItBadly: ruledOutWithAbsoluteBBoxSource.map((f) => ({
      familyId: f.familyId,
      why: "its own committed artifacts carry no misplaced flattened appearance",
      artifactsScanned: f.artifactsScanned
    })),
    artifactsUnreadableByPdfLib: unreadable,
    families
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${outFile}: ${families.length} families, ${artifactsScanned} artifacts, ${affected.length} affected`);
  for (const family of affected) {
    console.log(`  AFFECTED ${family.familyId} (${family.affectedArtifacts}/${family.artifactsScanned} artifacts, max ${family.maxDisplacementPoints}pt)`);
  }
  if (argv.includes("--print")) console.log(JSON.stringify(record.totals, null, 2));
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) await main();
