#!/usr/bin/env node
// Generates the all-page visual-evidence package for a family.
//
//   node scripts/generate-rcap-all-page-visual-evidence.mjs [familyId ...]
//
// Replaces the page-1-only evidence package. Two reviewers independently
// reported the same blind spot from opposite ends of the corpus: a contact sheet
// is rendered for every page, one PNG is committed, and that PNG carries page 1.
// Everything on the order side of a two-sided form — findings of fact, the
// judge's signature, the certificate of service — is below the crop, and a value
// written there is invisible to review while being perfectly visible to a clerk.
//
// What this writes, per family:
//   - one PNG per relevant contact-sheet page, blank panel beside filled panel;
//   - a manifest binding every PNG by hash to the artifact it depicts;
//   - one visualEvidenceSha256 over the whole ordered package, so a partial or
//     reordered package is a different package;
//   - the writable- and protected-geometry results from rcap-evidence-geometry.
//
// It renders and records. It does not approve, and it does not decide whether a
// family passes — scripts/verify-rcap-all-page-visual-evidence.mjs does that.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import {
  geometryOfFamily, participantInk, writableGeometryResult,
  protectedGeometryResult, pageRelevance, allFixtureValues, CANONICAL_FACTS
} from "./rcap-official-forms/rcap-evidence-geometry.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY = path.join(rootDir, "data/rcap-all50/overlays/production");
const EVIDENCE_DIR = path.join(rootDir, "data/rcap-all50/visual-evidence");
const RASTER_DIR = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence/all-page");
export const EVIDENCE_SCHEMA = "rcap-all-page-visual-evidence/v2";
const SCALE = Number(process.env.RCAP_EVIDENCE_SCALE ?? 2.0);

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));

/** The first batch: the families both reviewers named as immediate re-review candidates. */
export const FIRST_BATCH = [
  "AK:tf-800-form-en", "AK:tf-805-form-en",
  "NC:aoc-cr-287-form-en", "NC:aoc-cr-298-form-en"
];

const STATE_DIR = { AK: "alaska", KY: "kentucky", NC: "north-carolina", NE: "nebraska", VA: "virginia", VT: "vermont", WI: "wisconsin" };

export function familyDirOf(familyId) {
  const [state, slug] = familyId.split(":");
  return path.join(OVERLAY, STATE_DIR[state] ?? state.toLowerCase(), slug);
}

/**
 * The 20 fields the canonical contract requires of a provenance sidecar, taken
 * from the list scripts/verify-rcap-shared-pdf-contract.mjs asserts. Measured
 * per family rather than inherited from an older escalation record.
 */
export const SIDECAR_REQUIRED_FIELDS = [
  "jurisdiction", "assetId", "documentId", "formFamily", "officialFormNumber",
  "officialTitle", "sourcePublisher", "sourceUrl", "sourceRevision", "sourceSha256",
  "sourceMetadataFingerprint", "fieldMapSha256", "classificationSha256",
  "packetSpecSha256", "factoryVersion", "rendererVersion", "generatedAt",
  "activeContentResult", "flatteningResult", "protectedFieldResult"
];

/** Runs the canonical sidecar contract against one family's committed sidecar. */
export async function sidecarStatus(familyDir) {
  const file = path.join(familyDir, "artifact-provenance.json");
  if (!fs.existsSync(file)) {
    return { present: false, conformant: false, missingFields: SIDECAR_REQUIRED_FIELDS, artifactsBound: [], escalationResolved: false };
  }
  const { PROVENANCE_SCHEMA, provenanceCoversArtifact } =
    await import("./rcap-official-forms/rcap-artifact-provenance.mjs");
  const sidecar = JSON.parse(fs.readFileSync(file, "utf8"));
  const missingFields = SIDECAR_REQUIRED_FIELDS.filter((f) => sidecar[f] === undefined || sidecar[f] === null);
  const schemaOk = sidecar.schemaVersion === PROVENANCE_SCHEMA;
  const artifactsBound = (sidecar.artifacts ?? []).map((a) => {
    const target = path.join(familyDir, a.artifact);
    if (!fs.existsSync(target)) return { artifact: a.artifact, bound: false, reason: "artifact_not_on_disk" };
    const cov = provenanceCoversArtifact(sidecar, a.artifact, fs.readFileSync(target), { sourceSha256: sidecar.sourceSha256 });
    return { artifact: a.artifact, bound: cov.covered === true, reason: cov.reason ?? null };
  });
  const conformant = schemaOk && missingFields.length === 0
    && artifactsBound.length > 0 && artifactsBound.every((a) => a.bound);
  return {
    present: true, schemaVersion: sidecar.schemaVersion, schemaOk,
    requiredFields: SIDECAR_REQUIRED_FIELDS.length,
    fieldsPresent: SIDECAR_REQUIRED_FIELDS.length - missingFields.length,
    missingFields, artifactsBound, conformant,
    sidecarSha256: sha256File(file),
    escalationResolved: conformant,
    escalation: "ESC-SIDECAR-NONCONFORMANT",
    escalationBasis: conformant
      ? "measured against this family's committed sidecar at this head: schema correct, every required field present and non-null, and every named artifact bound by hash"
      : "a current measured failure remains; see missingFields and artifactsBound"
  };
}

/** Reconciles the contact-sheet hash recorded everywhere against the bytes on disk. */
export function contactSheetStaleness(familyId, familyDir) {
  const file = path.join(familyDir, "contact-sheet/blank-vs-filled.pdf");
  const onDisk = fs.existsSync(file) ? sha256File(file) : null;
  const records = [];
  const proofPath = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
  if (fs.existsSync(proofPath)) {
    const row = (JSON.parse(fs.readFileSync(proofPath, "utf8")).families ?? [])
      .find((f) => f.familyId === familyId);
    if (row) records.push({ record: "data/rcap-all50/contact-sheet-visual-proof.json", sha256: row.contactSheetSha256 });
  }
  const sidecarPath = path.join(familyDir, "artifact-provenance.json");
  if (fs.existsSync(sidecarPath)) {
    const row = (JSON.parse(fs.readFileSync(sidecarPath, "utf8")).artifacts ?? [])
      .find((a) => a.artifact === "contact-sheet/blank-vs-filled.pdf");
    if (row) records.push({ record: "artifact-provenance.json", sha256: row.outputSha256 });
  }
  const stale = records.filter((r) => r.sha256 !== onDisk);
  return { onDisk, records, stale, anyStale: stale.length > 0 };
}

/** Builds the whole evidence package for one family. */
export async function buildFamilyEvidence(familyId) {
  const familyDir = familyDirOf(familyId);
  const rel = path.relative(rootDir, familyDir);
  const map = JSON.parse(fs.readFileSync(path.join(familyDir, "production-field-map.json"), "utf8"));
  const census = JSON.parse(fs.readFileSync(path.join(familyDir, "field-census.json"), "utf8"));
  const sourceRecord = JSON.parse(fs.readFileSync(path.join(familyDir, "source-record.json"), "utf8"));

  const canonical = path.join(familyDir, "fixtures/canonical-filled.pdf");
  const boundary = path.join(familyDir, "fixtures/boundary-filled.pdf");
  const sheet = path.join(familyDir, "contact-sheet/blank-vs-filled.pdf");
  const artifactSha256 = {
    "fixtures/canonical-filled.pdf": sha256File(canonical),
    "fixtures/boundary-filled.pdf": sha256File(boundary),
    "contact-sheet/blank-vs-filled.pdf": sha256File(sheet)
  };

  const geometry = geometryOfFamily({ map, census });
  const { pageCount, ink } = await participantInk(fs.readFileSync(canonical), allFixtureValues());
  const writable = writableGeometryResult({ geometry, ink, facts: CANONICAL_FACTS, mapBindings: map.bindings });
  const prot = protectedGeometryResult({ geometry, ink, claimedRuns: writable.claimedRuns });
  const relevance = pageRelevance({ census, geometry, ink, pageCount });
  const pagesExpected = relevance.filter((r) => r.relevant).map((r) => r.page);

  const outDir = path.join(RASTER_DIR, familyId.replace(":", "-"));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const rendered = await rasterizePdf({ file: sheet, outDir, scale: SCALE, prefix: "contact-sheet-page" });

  const rasters = rendered.map((r) => ({
    page: r.page,
    file: path.relative(rootDir, r.file),
    sha256: sha256File(r.file),
    widthPx: r.widthPx, heightPx: r.heightPx,
    looksBlank: r.looksBlank,
    depicts: "blank panel (left) beside finalized fill (right)",
    boundToArtifactSha256: artifactSha256["contact-sheet/blank-vs-filled.pdf"]
  }));

  // One hash over the ordered package, so dropping a page or reordering the set
  // produces a different package rather than a package that merely looks smaller.
  const visualEvidenceSha256 = sha256(JSON.stringify({
    familyId,
    artifact: artifactSha256["contact-sheet/blank-vs-filled.pdf"],
    canonical: artifactSha256["fixtures/canonical-filled.pdf"],
    pages: rasters.map((r) => ({ page: r.page, sha256: r.sha256 }))
  }));

  return {
    familyId,
    jurisdiction: familyId.split(":")[0],
    documentId: sourceRecord.documentId ?? null,
    recordedRevision: sourceRecord.revision ?? null,
    familyPath: rel,
    artifactSha256,
    sourceSha256: sourceRecord.sha256 ?? sourceRecord.sourceSha256 ?? null,
    sourceBytesResolvable: false,
    sourceBytesNote: "no official source binary resolves at this head; the source digest is carried from the committed record and is not recomputed here",
    pageCount,
    pagesExpected,
    pagesRasterised: rasters.map((r) => r.page),
    pageRelevance: relevance,
    rasters,
    visualEvidenceSha256,
    contactSheetStaleness: contactSheetStaleness(familyId, familyDir),
    sidecar: await sidecarStatus(familyDir),
    writableGeometry: {
      values: writable.values, slots: writable.slots, runsClaimed: writable.runsClaimed,
      participantInkRuns: ink.length,
      findings: writable.findings,
      pass: writable.findings.filter((f) => f.severity === "fail").length === 0
    },
    protectedGeometry: {
      protectedSlots: prot.protectedSlots,
      overlapsWithWritable: prot.overlaps,
      findings: prot.findings,
      pass: prot.findings.filter((f) => f.severity === "fail").length === 0
    }
  };
}

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const families = requested.length ? requested : FIRST_BATCH;
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const built = [];
  for (const familyId of families) {
    const evidence = await buildFamilyEvidence(familyId);
    const out = path.join(EVIDENCE_DIR, `${familyId.replace(":", "-")}.evidence.json`);
    fs.writeFileSync(out, `${JSON.stringify({ schemaVersion: EVIDENCE_SCHEMA, generatedBy: "scripts/generate-rcap-all-page-visual-evidence.mjs", ...evidence }, null, 2)}\n`);
    built.push({ familyId, record: path.relative(rootDir, out), ...evidence });
    const w = evidence.writableGeometry, p = evidence.protectedGeometry;
    console.log(`  ${familyId.padEnd(24)} pages ${evidence.pagesRasterised.length}/${evidence.pagesExpected.length} rastered  writable=${w.pass ? "pass" : "FAIL"} protected=${p.pass ? "pass" : "FAIL"} sidecar=${evidence.sidecar.conformant ? "conformant" : "FAILING"}`);
  }

  const manifest = {
    schemaVersion: "rcap-all-page-visual-evidence-batch/v1",
    generatedBy: "scripts/generate-rcap-all-page-visual-evidence.mjs",
    purpose: "The all-page visual-evidence package. Every relevant page of every artifact is rasterised, each raster is bound by hash to the artifact it depicts, and each family carries one hash over its whole ordered package.",
    scale: SCALE,
    families: built.map((b) => ({
      familyId: b.familyId, record: b.record,
      pageCount: b.pageCount, pagesExpected: b.pagesExpected, pagesRasterised: b.pagesRasterised,
      visualEvidenceSha256: b.visualEvidenceSha256,
      contactSheetSha256: b.artifactSha256["contact-sheet/blank-vs-filled.pdf"],
      canonicalArtifactSha256: b.artifactSha256["fixtures/canonical-filled.pdf"],
      writableGeometryPass: b.writableGeometry.pass,
      protectedGeometryPass: b.protectedGeometry.pass,
      sidecarConformant: b.sidecar.conformant,
      contactSheetStale: b.contactSheetStaleness.anyStale
    })),
    totals: {
      families: built.length,
      pagesExpected: built.reduce((n, b) => n + b.pagesExpected.length, 0),
      pagesRasterised: built.reduce((n, b) => n + b.pagesRasterised.length, 0),
      writableGeometryPass: built.filter((b) => b.writableGeometry.pass).length,
      protectedGeometryPass: built.filter((b) => b.protectedGeometry.pass).length,
      sidecarsConformant: built.filter((b) => b.sidecar.conformant).length
    }
  };
  const manifestPath = path.join(EVIDENCE_DIR, "all-page-evidence-manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`OK all-page visual evidence — ${manifest.totals.families} families, ${manifest.totals.pagesRasterised} pages rasterised of ${manifest.totals.pagesExpected} expected`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
