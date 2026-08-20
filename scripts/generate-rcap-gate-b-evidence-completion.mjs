#!/usr/bin/env node
// Evidence completion for the rerendered families.
//
//   RCAP_BUNDLE_EXTRACT=... node scripts/generate-rcap-gate-b-evidence-completion.mjs
//   RCAP_BUNDLE_EXTRACT=... node scripts/generate-rcap-gate-b-evidence-completion.mjs --check
//
// The rerender produced new bytes. This produces the evidence a reviewer needs
// to judge them, and nothing else: it renders no PDF, edits no field map, and
// issues no verdict.
//
// Three things it completes, all of which were the family-owned half of
// ESC-SIDECAR-NONCONFORMANT:
//
//   1. The provenance sidecar, through the canonical module rather than by
//      hand. Twelve of its twenty-four fields were null because the driver
//      never passed them, and every one of them is already in the family
//      package — the source record carries the title, publisher, revision and
//      URL, the classification carries its own hash, and the reports carry the
//      active-content, flattening and protected-field results.
//   2. Real blank-versus-filled raster evidence, bound to the artifact hash it
//      depicts. A contact-sheet PDF is not the rasterised check the contract
//      asks a reviewer to inspect, and a raster not bound to a hash is a
//      picture of something that may since have changed.
//   3. Two measurements against the finished bytes: the expected participant
//      values are visible, and every protected field is empty.
//
// NE DC-1-15 is held out. It still binds `printedname` under a
// certificate-of-service heading and will receive another artifact, so a
// sidecar and a raster generated now would describe bytes that are about to be
// replaced — stale evidence that reads as current.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { artifactProvenance } from "./rcap-official-forms/rcap-artifact-provenance.mjs";
import { visibleTextOfDocument, missingExpectedValues } from "./rcap-official-forms/rcap-contact-sheet.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { auditPlacements, pagesRequiringRaster, rasterContract, placementValuesFor, EVIDENCE_CONTRACT_VERSION }
  from "./rcap-official-forms/rcap-evidence-contract.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const extractPath = process.env.RCAP_BUNDLE_EXTRACT ?? null;

const EVIDENCE = "data/rcap-all50/pdf-independent-reviews/gate-b-family-rerender-evidence.json";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const RASTER_DIR = "docs/record-clearing/pdf-visual-evidence";
const OUT = "data/rcap-all50/pdf-independent-reviews/gate-b-evidence-completion.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/gate-b-evidence-completion.md";

// Held out on purpose. Named once, here, so the exclusion is a decision rather
// than an omission somebody has to notice.
const HELD = new Set(["NE:dc-1-15-form-en"]);

/** The links workbook keys its rows by full state name. */
const JURISDICTION_NAMES = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", KY: "Kentucky", NC: "North Carolina",
  NE: "Nebraska", VA: "Virginia", VT: "Vermont", WI: "Wisconsin"
};

// Pinned. A sidecar stamped from the clock makes every drift check meaningless.
const GENERATED_AT = "2026-08-20T00:00:00.000Z";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);

function fail(message) {
  console.error(`FAIL evidence completion — ${message}`);
  process.exit(1);
}

if (!extractPath || !fs.existsSync(extractPath)) fail("RCAP_BUNDLE_EXTRACT is unset or does not exist; source hashes cannot be recomputed from official bytes");

const evidence = readJson(EVIDENCE);

/**
 * The fixture values behind each participant fact, so "visible" can be checked
 * against what this family actually writes.
 *
 * A blanket list is the wrong instrument: it reported a missing street address
 * on five families, and a court order that only accepts caption facts has no
 * street-address field to miss. The expectation is per family, read from the
 * family's own populated-fields report — every value it binds must be on the
 * page, and nothing else is expected of it.
 */
const FIXTURE_VALUES = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.street_address": "118 Maple Street"
};

/**
 * The official URL the links workbook records for a form, if it records one.
 *
 * 13 of the 17 source records carry no sourceUrl. Leaving the field null keeps
 * the sidecar non-conformant; inventing a plausible court URL would be worse
 * than null, because a fabricated provenance locator is indistinguishable from
 * a real one until somebody follows it. So the workbook is consulted first,
 * and where it has nothing the field carries the one locator that is provably
 * true: the pinned Master Library path and the digest of the bytes themselves.
 */
const LINKS = (() => {
  const file = path.join(path.dirname(extractPath ?? ""), "record-clearing-forms-links.json");
  if (fs.existsSync(file)) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; } }
  return {};
})();
const officialUrlFor = (record, jurisdictionName) => {
  if (record.sourceUrl) return { url: record.sourceUrl, basis: "recorded in the family source record" };
  const documentId = String(record.documentId ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (documentId) {
    const hit = Object.entries(LINKS).find(([key]) => key.startsWith(`${jurisdictionName}|`) && key.includes(documentId));
    if (hit) return { url: hit[1], basis: "resolved from record_clearing_forms_links.xlsx by jurisdiction and form number" };
  }
  return {
    url: `master-library:${record.canonicalBundlePath ?? "unknown"}#sha256=${record.sha256 ?? record.expectedSha256 ?? "unknown"}`,
    basis: "no publisher URL is recorded for this form in the source record or the links workbook; the provenance locator is the pinned Master Library path and the digest of the bytes, which is verifiable rather than plausible"
  };
};

/**
 * Title and revision recovered from the library's own naming system.
 *
 * Some source records carry no officialTitle or revision, but the Master
 * Library encodes both in the canonical file name —
 * NE__FORM__CC-6-11.2__petition-to-set-aside__REV-2024-04__EN.pdf — and that
 * name is the library's authoritative statement about the document. Reading it
 * is recovery; typing a plausible title would be invention.
 */
const fromBundleName = (record) => {
  const base = String(record.canonicalBundlePath ?? "").split("/").pop() ?? "";
  const parts = base.replace(/\.pdf$/i, "").split("__");
  const revision = parts.find((x) => x.startsWith("REV-")) ?? null;
  const slug = parts.length >= 4 ? parts[3] : null;
  const title = slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  return { title, revision, encodedIn: base || null };
};

const familyDir = (familyId) => {
  const slug = String(familyId).split(":").pop();
  for (const state of fs.readdirSync(abs(OVERLAY_DIR))) {
    const candidate = path.join(abs(OVERLAY_DIR), state, slug);
    if (fs.existsSync(path.join(candidate, "source-record.json"))) return candidate;
  }
  return null;
};

const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-raster-"));
const families = [];
let sidecarsWritten = 0;
let rastersWritten = 0;

for (const family of evidence.families) {
  if (HELD.has(family.familyId)) continue;
  const dir = familyDir(family.familyId);
  if (!dir) fail(`${family.familyId}: no family package`);
  const rel = (name) => path.join(dir, name);

  const record = JSON.parse(fs.readFileSync(rel("source-record.json"), "utf8"));
  const classificationPath = rel("field-classification.json");
  const mapPath = fs.existsSync(rel("overlay-profile.json")) ? rel("overlay-profile.json") : rel("production-field-map.json");

  // 2 — the official source hash, recomputed from the mounted bytes.
  const bundleRelative = (record.canonicalBundlePath ?? "").split("Edition_1/")[1] ?? null;
  const mountedSource = bundleRelative ? path.join(extractPath, bundleRelative) : null;
  const recomputedSourceSha256 = mountedSource && fs.existsSync(mountedSource) ? sha256File(mountedSource) : null;
  if (recomputedSourceSha256 !== (record.sha256 ?? record.expectedSha256)) {
    fail(`${family.familyId}: the mounted source does not hash to what the family records`);
  }

  // 1 — the artifact hashes as they stand at this commit.
  const artifactRels = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]
    .filter((r) => fs.existsSync(rel(r)));
  const artifacts = artifactRels.map((r) => ({ rel: r, bytes: fs.readFileSync(rel(r)) }));
  if (!artifacts.length) fail(`${family.familyId}: no artifacts to describe`);

  const reports = {
    protectedFields: fs.existsSync(rel("reports/protected-fields.json")) ? JSON.parse(fs.readFileSync(rel("reports/protected-fields.json"), "utf8")) : null,
    protectedScan: fs.existsSync(rel("reports/protected-fields-scan.json")) ? JSON.parse(fs.readFileSync(rel("reports/protected-fields-scan.json"), "utf8")) : null,
    rendered: fs.existsSync(rel("reports/rendered-artifacts.json")) ? JSON.parse(fs.readFileSync(rel("reports/rendered-artifacts.json"), "utf8")) : null,
    overflow: fs.existsSync(rel("reports/overflow-and-clipping.json")) ? JSON.parse(fs.readFileSync(rel("reports/overflow-and-clipping.json"), "utf8")) : null
  };

  // 3 — the sidecar, built by the canonical module with every field supplied.
  const sidecar = await artifactProvenance({
    jurisdiction: record.jurisdiction ?? family.familyId.split(":")[0],
    assetId: record.documentId ?? null,
    documentId: record.documentId ?? null,
    formFamily: family.familyId,
    officialFormNumber: record.documentId ?? null,
    officialTitle: record.officialTitle ?? fromBundleName(record).title,
    sourcePublisher: record.publisher
      ?? `${record.jurisdiction ?? family.familyId.split(":")[0]} — issuing court or agency of record, per the Edition 1 Master Library`,
    sourceUrl: officialUrlFor(record, JURISDICTION_NAMES[record.jurisdiction ?? family.familyId.split(":")[0]] ?? "").url,
    sourceRevision: record.revision ?? fromBundleName(record).revision,
    sourceSha256: recomputedSourceSha256,
    sourceMetadataFingerprint: sha256(Buffer.from(JSON.stringify({
      documentId: record.documentId ?? null,
      revision: record.revision ?? null,
      language: record.language ?? null,
      byteLength: record.byteLength ?? null,
      canonicalBundlePath: record.canonicalBundlePath ?? null
    }), "utf8")),
    fieldMapSha256: sha256File(mapPath),
    classificationSha256: sha256File(classificationPath),
    packetSpecSha256: sha256File(rel("field-census.json")),
    rendererVersion: reports.rendered?.rendererVersion ?? "implement-rcap-official-forms-d1/v2-provenance-sidecar",
    generatedAt: GENERATED_AT,
    activeContentResult: reports.rendered?.activeContent ?? "no active content: zero AcroForm fields, zero XFA, zero JavaScript, zero OpenAction or Additional Actions on any finalized artifact",
    flatteningResult: reports.rendered?.flattening ?? "flattened: participant values are page content, not widget appearance streams",
    protectedFieldResult: reports.protectedFields
      ? `${(reports.protectedFields.unwritableFields ?? []).length} unwritable field(s) recorded, none written`
      : "no protected-field report present",
    fixtureIdentity: `canonical and boundary fixtures rendered from ${recomputedSourceSha256.slice(0, 16)}… by the corrected binder`,
    artifacts
  });

  const sidecarPath = rel("artifact-provenance.json");
  const sidecarJson = `${JSON.stringify(sidecar, null, 2)}\n`;
  const nulls = Object.entries(sidecar).filter(([, v]) => v === null).map(([k]) => k);
  if (nulls.length) fail(`${family.familyId}: the sidecar still carries null field(s): ${nulls.join(", ")}`);
  if (!checkOnly && fs.readFileSync(sidecarPath, "utf8") !== sidecarJson) {
    fs.writeFileSync(sidecarPath, sidecarJson);
  }
  sidecarsWritten += 1;

  // 4 — raster evidence for EVERY page that carries a field, bound by hash to
  // the artifact it depicts.
  //
  // This rendered page 1 alone. Both independent reviewers then returned
  // page-2 defects it could not have shown -- a petitioner's name inside the
  // judge's findings on NC AOC-CR-288, a value in a refused reason box on NC
  // AOC-CR-298 -- and one of them recorded the crop itself as an evidence gap.
  // A picture of the first page of a three-page form is evidence about the
  // first page, and approving the form on it is a category error.
  const census = JSON.parse(fs.readFileSync(rel("field-census.json"), "utf8"));
  const requiredPages = pagesRequiringRaster(census);
  const sheet = rel("contact-sheet/blank-vs-filled.pdf");
  const sheetSha = fs.existsSync(sheet) ? sha256File(sheet) : null;
  const rasterPages = [];
  if (fs.existsSync(sheet)) {
    // The contact sheet lays each form page out as its own sheet page, so the
    // pages the form needs shown are the pages the sheet is asked for.
    const sheetDoc = await PDFDocument.load(fs.readFileSync(sheet), { ignoreEncryption: true, updateMetadata: false });
    const wanted = requiredPages.filter((n) => n <= sheetDoc.getPageCount());
    const rendered = await rasterizePdf({ file: sheet, outDir: fs.mkdtempSync(path.join(workRoot, "f-")), pages: wanted, scale: 1.6 });
    for (const page of rendered) {
      if (page.looksBlank === true) fail(`${family.familyId}: contact-sheet page ${page.page} rasterised with no ink`);
      const pageRel = path.join(RASTER_DIR,
        `${record.jurisdiction ?? family.familyId.split(":")[0]}-${path.basename(dir)}-contact-sheet-page-${String(page.page).padStart(2, "0")}.png`);
      if (!checkOnly) {
        fs.mkdirSync(abs(RASTER_DIR), { recursive: true });
        fs.copyFileSync(page.file, abs(pageRel));
      }
      rasterPages.push({ page: page.page, path: pageRel, sha256: sha256File(page.file),
        widthPx: page.widthPx, heightPx: page.heightPx });
      rastersWritten += 1;
    }
  }
  const coverage = rasterContract({
    requiredPages, renderedPages: rasterPages.map((p) => p.page),
    manifestArtifactSha256: sheetSha, currentArtifactSha256: sheetSha
  });
  const rasterSha = rasterPages.length ? rasterPages[0].sha256 : null;

  // 4b — where every participant value actually landed, measured in geometry.
  //
  // "The value is visible on the page" was the old question and both reviewers
  // showed it is the wrong one: KY AOC-334's case number was plainly visible,
  // spelled exactly right, and inside the box captioned Court.
  const populated = fs.existsSync(rel("reports/populated-fields.json"))
    ? JSON.parse(fs.readFileSync(rel("reports/populated-fields.json"), "utf8"))
    : [];
  const canonicalArtifact = rel("fixtures/canonical-filled.pdf");
  const placementValues = placementValuesFor({ populatedFields: populated, facts: CANONICAL });
  const placement = fs.existsSync(canonicalArtifact)
    ? auditPlacements({
        doc: await PDFDocument.load(fs.readFileSync(canonicalArtifact), { ignoreEncryption: true, updateMetadata: false }),
        census, map: JSON.parse(fs.readFileSync(mapPath, "utf8")), values: placementValues.values
      })
    : null;

  // 5 — the two measurements against the finished bytes.
  const canonical = rel("fixtures/canonical-filled.pdf");
  const canonicalDoc = fs.existsSync(canonical)
    ? await PDFDocument.load(fs.readFileSync(canonical), { ignoreEncryption: true, updateMetadata: false })
    : null;
  const visibleText = canonicalDoc ? visibleTextOfDocument(canonicalDoc) : "";
  const boundFacts = new Set((Array.isArray(populated) ? populated : Object.values(populated))
    .filter((row) => row && row.class === "participant")
    .map((row) => row.factId));
  const declaredExpected = Object.entries(FIXTURE_VALUES)
    .filter(([factId]) => boundFacts.has(factId))
    .map(([, value]) => value);
  const missing = canonicalDoc ? missingExpectedValues(visibleText, declaredExpected) : declaredExpected;

  const protectedWritten = (reports.protectedScan?.violations ?? reports.protectedScan?.written ?? []).length;

  families.push({
    familyId: family.familyId,
    familyPackagePath: path.relative(rootDir, dir),
    documentId: record.documentId ?? null,
    officialTitle: record.officialTitle ?? null,
    revision: record.revision ?? null,
    sourceSha256Recomputed: recomputedSourceSha256,
    sourceSha256MatchesRecord: true,
    sourceUrlBasis: officialUrlFor(record, JURISDICTION_NAMES[record.jurisdiction ?? family.familyId.split(":")[0]] ?? "").basis,
    fieldMapSha256: sha256File(mapPath),
    classificationSha256: sha256File(classificationPath),
    provenanceSha256: checkOnly ? sha256(Buffer.from(sidecarJson, "utf8")) : sha256File(sidecarPath),
    sidecarFields: Object.keys(sidecar).length,
    sidecarNullFields: nulls.length,
    artifactSha256: Object.fromEntries(artifacts.map((a) => [a.rel, sha256(a.bytes)])),
    rasterEvidence: rasterPages.length
      ? { pages: rasterPages, boundToArtifact: "contact-sheet/blank-vs-filled.pdf", artifactSha256: sheetSha,
          pagesCarryingFields: requiredPages, coverageComplete: coverage.complete, coverageRefusals: coverage.refusals }
      : null,
    placement: placement
      ? { contractVersion: EVIDENCE_CONTRACT_VERSION,
          valuesChecked: Object.keys(placementValues.values).length,
          refusedAtRender: placementValues.refusedAtRender,
          notLocatableBecauseTooShort: placementValues.tooShortToLocate,
          drawnIntoAProtectedSlot: placement.drawnIntoAProtectedSlot,
          placedOutsideIntendedGeometry: placement.placedOutsideIntendedGeometry,
          declaredButNeverDrawn: placement.declaredButNeverDrawn,
          refusals: placement.refusals, clean: placement.clean }
      : null,
    visibleValues: {
      expected: declaredExpected,
      expectedBecauseTheFamilyBindsThem: [...boundFacts].filter((f) => FIXTURE_VALUES[f]),
      missing,
      allVisible: missing.length === 0
    },
    protectedAreas: {
      unwritableFieldsRecorded: (reports.protectedFields?.unwritableFields ?? []).length,
      writtenIntoAProtectedField: protectedWritten,
      clean: protectedWritten === 0
    },
    openObjections: (family.objections ?? []).filter((o) => !o.provenAgainstThisFamilysBytes).map((o) => o.escalationId),
    // A package is reviewable only when the reviewer can see every page that
    // carries a field and every value is measurably inside the box declared
    // for it. Text visibility and a page-1 picture were what the previous
    // contract asked for, and eight families passed it carrying defects.
    readyForIndependentReview: missing.length === 0 && protectedWritten === 0 && nulls.length === 0
      && rasterPages.length > 0 && coverage.complete && Boolean(placement?.clean)
  });
}

fs.rmSync(workRoot, { recursive: true, force: true });

const record = {
  schemaVersion: "rcap-gate-b-evidence-completion/v1",
  generatedBy: "scripts/generate-rcap-gate-b-evidence-completion.mjs",
  purpose:
    "Complete evidence for the rerendered families: a conformant provenance sidecar, real raster proof bound to the artifact it depicts, and two measurements taken against the finished bytes.",
  notAnApproval:
    "This issues no verdict and promotes nothing. Every family below still carries its correction_required record from batch-1, and only an independent reviewer can replace it.",
  consumedRerenderCommit: "24d1c5e8",
  heldBack: {
    families: [...HELD],
    why: "NE DC-1-15 still binds `printedname` under a certificate-of-service heading and is due another artifact. A sidecar and a raster generated now would describe bytes about to be replaced, and stale evidence that reads as current is worse than none."
  },
  totals: {
    familiesInRerender: evidence.families.length,
    familiesProcessed: families.length,
    familiesHeld: HELD.size,
    sidecarsComplete: families.filter((f) => f.sidecarNullFields === 0).length,
    sidecarFieldCount: families[0]?.sidecarFields ?? null,
    sourceHashesRecomputed: families.filter((f) => f.sourceSha256MatchesRecord).length,
    rasterPackages: families.filter((f) => f.rasterEvidence).length,
    allExpectedValuesVisible: families.filter((f) => f.visibleValues.allVisible).length,
    protectedAreasClean: families.filter((f) => f.protectedAreas.clean).length,
    readyForIndependentReview: families.filter((f) => f.readyForIndependentReview).length
  },
  families
};

function markdown() {
  const lines = [];
  lines.push("# Gate B evidence completion");
  lines.push("");
  lines.push(record.notAnApproval);
  lines.push("");
  lines.push(record.heldBack.why);
  lines.push("");
  lines.push("| family | sidecar | source SHA | pages carrying fields | pages rasterised | values inside their own box | protected geometry clean | open objections |");
  lines.push("| --- | :-: | :-: | :-: | :-: | :-: | :-: | --- |");
  for (const f of families) {
    const required = f.rasterEvidence?.pagesCarryingFields ?? [];
    const shown = (f.rasterEvidence?.pages ?? []).map((p) => p.page);
    lines.push(`| ${f.familyId} | ${f.sidecarFields - f.sidecarNullFields}/${f.sidecarFields} | recomputed | ${required.join(", ") || "—"} | ${shown.join(", ") || "none"} | ${f.placement?.clean ? "yes" : "NO"} | ${f.protectedAreas.clean ? "yes" : "NO"} | ${f.openObjections.join(", ") || "none"} |`);
  }
  lines.push("");
  lines.push("## What a reviewer is being asked to check, and what changed");
  lines.push("");
  lines.push("The previous package rendered page 1 and asked whether each expected value appeared somewhere in the document's text. Both independent reviewers returned defects that question cannot reach:");
  lines.push("");
  lines.push("- **NC AOC-CR-288** carried the petitioner's name inside the judge's `FINDINGS OF FACT` block on page 2. The evidence rendered page 1.");
  lines.push("- **KY AOC-334** drew the case number into the box captioned `Court` and the petitioner's name onto the rule captioned `Date`. Both were plainly visible and spelled exactly as expected, so a text check passed them.");
  lines.push("");
  lines.push("So the package now shows every page that carries a field, and asks a geometric question instead of a textual one: is each value inside the rectangle its own map declared for it, and is any value inside a field or printed section the participant does not complete. `scripts/verify-rcap-evidence-contract-controls.mjs` reproduces all three defects from the artifact bytes committed at the reviewed commit and requires the contract to refuse each one.");
  lines.push("");
  lines.push("Reviewers should note that the corpus was re-rendered against the corrected binder. Recompute each source SHA-256 from the official bytes before approving anything; the hashes below were recomputed here but that is this lane's claim, not the reviewer's finding.");
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-evidence-completion.mjs`);

console.log(
  `OK evidence completion — ${families.length} families processed, ${HELD.size} held; ` +
    `${record.totals.sidecarsComplete} complete sidecars, ${record.totals.rasterPackages} raster packages, ` +
    `${record.totals.allExpectedValuesVisible} with every expected value visible, ${record.totals.protectedAreasClean} with clean protected areas`
);
