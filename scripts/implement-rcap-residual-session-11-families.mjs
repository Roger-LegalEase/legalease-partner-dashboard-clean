#!/usr/bin/env node
// Renders the three residual packet-ready filing families through the shared
// D0/D1 factory.
//
//   node scripts/implement-rcap-residual-session-11-families.mjs
//   node scripts/implement-rcap-residual-session-11-families.mjs --check
//
// These three families are named by the pdf-finish work view as packet_ready
// and are the surviving operational packages for their assets. They are not
// reachable from either of the two index-driven drivers: implement-rcap-
// official-forms-d1.mjs walks verified-binary-index.json, which lists the
// Master Library-named sibling packages rather than these, and render-rcap-
// flat-overlay-families.mjs only reaches a family once its profile carries
// measured anchors. Both indexes are canonical global registers this pass does
// not write, so the families are driven from their own packages instead.
//
// Nothing about how a value is chosen, fitted, protected or flattened lives
// here. Every decision is made by the shared modules -- the same binder, the
// same finalizer, the same contact-sheet proof the rest of the lane uses -- and
// this file only says which family, which bytes and which facts.
//
// It writes only inside the three family packages. No index, register,
// denominator or review record is touched.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError
} from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import {
  buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues
} from "./rcap-official-forms/rcap-contact-sheet.mjs";
import { artifactProvenance, FACTORY_VERSION } from "./rcap-official-forms/rcap-artifact-provenance.mjs";
import { loadAppearanceSemantics, dispositionsForFamily } from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { detectNonFilingNotice } from "./rcap-official-forms/rcap-source-notice.mjs";
import { reconcileWrittenAgainstDeclared } from "./rcap-official-forms/rcap-evidence-contract.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const checkOnly = process.argv.includes("--check");
const RENDERER_VERSION = "implement-rcap-residual-session-11-families/v1";
// Pinned rather than read from the clock, so re-running unchanged inputs
// produces identical bytes and a drift check keeps its meaning.
const GENERATED_AT = "2026-08-19T00:00:00.000Z";

// The lane's boundary facts. CANONICAL is imported from the D1 driver so the
// two cannot drift; BOUNDARY is not exported there, and is restated here with
// the same values rather than by reaching into a module this pass may not edit.
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line"
};

const WRITABLE_CLASSES = new Set(["participant", "deterministic", "participant_writable"]);
const isUnwritableClass = (klass) => !WRITABLE_CLASSES.has(String(klass));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (p, fallback = null) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback);
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!checkOnly) fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
};

// The assignment, restated as data. The source path is the one the family's own
// receipt resolved and re-hashed after installation; the bytes are read from
// there and the digest is checked against the family's pinned expectation
// before anything is rendered.
const FAMILIES = [
  {
    familyId: "AK:requesttosealcriminfo",
    dir: path.join(OUT, "alaska/requesttosealcriminfo"),
    mapKind: "flat_overlay"
  },
  {
    familyId: "AR:7-nolle-prosequi-dismissed-acquittal-petition-2020-f",
    dir: path.join(OUT, "arkansas/7-nolle-prosequi-dismissed-acquittal-petition-2020-f"),
    mapKind: "acroform"
  },
  {
    familyId: "AR:felony-petition-form-f",
    dir: path.join(OUT, "arkansas/felony-petition-form-f"),
    mapKind: "acroform"
  }
];

const APPEARANCE_SEMANTICS = loadAppearanceSemantics();
const summary = [];

for (const fam of FAMILIES) {
  const receipt = readJson(path.join(fam.dir, "source-receipt.json"));
  const record = readJson(path.join(fam.dir, "source-record.json"));
  if (!receipt || !record) throw new Error(`${fam.familyId}: the family package has no source receipt or record`);

  const sourcePath = path.join(rootDir, receipt.resolvedPath);
  if (!fs.existsSync(sourcePath)) throw new Error(`${fam.familyId}: pinned source absent: ${receipt.resolvedPath}`);
  const bytes = fs.readFileSync(sourcePath);
  const sha = sha256(bytes);
  // Two independent pins have to agree with the bytes: the receipt this sprint
  // wrote when it installed them, and the source record the package was built
  // against. A render against bytes that satisfy only one of them is a render
  // against an unidentified document.
  if (sha !== receipt.sha256) throw new Error(`${fam.familyId}: source drift against the receipt: expected ${receipt.sha256}, read ${sha}`);
  if (sha !== record.expectedSha256) throw new Error(`${fam.familyId}: source drift against the record: expected ${record.expectedSha256}, read ${sha}`);
  if (bytes.length !== record.expectedSizeBytes) throw new Error(`${fam.familyId}: byte length ${bytes.length} against pinned ${record.expectedSizeBytes}`);

  const [jurisdiction] = fam.familyId.split(":");
  const documentId = receipt.documentId ?? record.fileName;
  const classification = readJson(path.join(fam.dir, "field-classification.json"), { entries: [] }).entries ?? [];
  const unwritableFields = classification
    .filter((c) => isUnwritableClass(c.class))
    .map((c) => ({ field: c.name ?? c.label, class: c.class }));

  // The document's own printed words, so a form that says of itself that it is
  // not for filing holds here rather than only where a caller remembered to look.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const documentTextLines = [];
  for (const page of doc.getPages()) {
    try { documentTextLines.push(...groupIntoLines(extractTextItems(page))); } catch { /* unreadable page */ }
  }
  const nonFilingHold = detectNonFilingNotice(documentTextLines);

  const census = readJson(path.join(fam.dir, "field-census.json"), { fields: [] }).fields ?? [];
  const profile = readJson(path.join(fam.dir, fam.mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json"));
  if (!profile) throw new Error(`${fam.familyId}: no ${fam.mapKind} map in the package`);
  const declared = fam.mapKind === "acroform"
    ? (profile.bindings ?? []).map((b) => b.field)
    : (profile.anchors ?? []).map((a) => a.label);

  const rendered = {};
  const findings = [];
  try {
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      rendered[label] = fam.mapKind === "acroform"
        ? await finalizeOfficialForm({
            sourceBytes: bytes, expectedSha256: sha, census, facts,
            // The same role refusals the map records, so the artifact and the
            // map cannot disagree about what may be written.
            unwritableFields,
            nonFilingNotice: nonFilingHold?.notice ?? null,
            documentTextLines,
            appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS, fam.familyId),
            title: `${jurisdiction} ${documentId}`
          })
        : await finalizeFlatOverlay({
            sourceBytes: bytes, expectedSha256: sha,
            anchors: profile.anchors, protectedRules: profile.protectedRules ?? [],
            facts,
            nonFilingNotice: nonFilingHold?.notice ?? null,
            documentTextLines,
            title: `${jurisdiction} ${documentId}`
          });
      writeArtifact(path.join(fam.dir, "fixtures", `${label}-filled.pdf`), rendered[label].bytes);
      for (const u of rendered[label].report.unfittable) findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
      for (const r of rendered[label].report.refused) {
        if (r.category === "unfittable") continue;
        findings.push({ fixture: label, check: "binding_refused", ...r });
      }
    }
  } catch (error) {
    if (error instanceof NonFilingHoldError) { findings.push({ check: "non_filing_hold_enforced", notice: error.notice }); }
    else throw error;
  }

  const report = rendered.canonical?.report ?? null;
  let sheet = null;
  if (report) {
    try {
      sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: rendered.canonical.bytes,
        expectedValues: report.expectedValues,
        heading: `${jurisdiction} ${documentId} — blank (left) vs finalized fill (right)`
      });
      writeArtifact(path.join(fam.dir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
      writeJson(path.join(fam.dir, "contact-sheet", "contact-sheet-proof.json"), sheet.proof);
    } catch (error) {
      if (error instanceof ContactSheetProofError) { findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null }); }
      else throw error;
    }
  }

  // Provenance beside the artifact, never inside it: the finalized PDF carries
  // the issuing body's own Info dictionary, so nothing about which factory
  // produced it can be read from the file.
  let provenance = null;
  if (report && sheet) {
    provenance = await artifactProvenance({
      jurisdiction, documentId, sourceSha256: sha,
      sourceRevision: receipt.revision ?? null,
      sourceUrl: `${receipt.sourceArchive === "Nationwide Record Clearing" ? "nationwide" : "master-library"}:${receipt.pathInArchive}#sha256=${sha}`,
      officialTitle: record.officialTitle ?? null,
      officialFormNumber: documentId,
      formFamily: fam.familyId,
      sourcePublisher: `${jurisdiction} — issuing court or agency of record`,
      fieldMap: fam.mapKind === "acroform" ? (profile.bindings ?? []) : (profile.anchors ?? []),
      rendererVersion: RENDERER_VERSION,
      generatedAt: GENERATED_AT,
      artifacts: [
        { rel: "fixtures/canonical-filled.pdf", bytes: rendered.canonical.bytes },
        { rel: "fixtures/boundary-filled.pdf", bytes: rendered.boundary.bytes },
        { rel: "contact-sheet/blank-vs-filled.pdf", bytes: sheet.bytes }
      ]
    });
    writeJson(path.join(fam.dir, "artifact-provenance.json"), provenance);
  }

  // What the map DECLARED, annotated with what the renderer actually DID. A
  // declared binding that silently produces nothing is neither written nor
  // refused, and the record has to be able to say which.
  const writtenBy = new Map((report?.written ?? []).map((w) => [String(w.field ?? w.anchor), w]));
  const refusedBy = new Map((report?.refused ?? []).map((r) => [String(r.field ?? r.anchor), r]));
  writeJson(path.join(fam.dir, "reports/populated-fields.json"), declared.map((name) => ({
    field: name,
    written: report ? writtenBy.has(name) : null,
    notWrittenBecause: report && !writtenBy.has(name)
      ? (refusedBy.get(name)?.reason ?? "the renderer neither wrote nor refused this field")
      : null
  })));
  writeJson(path.join(fam.dir, "reports/protected-fields.json"), {
    documentOwnership: profile.documentOwnership ?? null,
    wholeDocumentUnwritable: false,
    unwritableFields,
    manualFields: classification.filter((c) => String(c.class).startsWith("manual")).map((c) => c.name ?? c.label)
  });
  writeJson(path.join(fam.dir, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v2",
    boundaryFixtureApplied: Boolean(rendered.boundary),
    findings
  });
  // The renderer's own refusals under the canonical facts. Deliberately NOT
  // fixtures/negative.json: that file is this lane's fact-level negative
  // fixture and the D1 verifier asserts it is fact-level, so overwriting it
  // with a refusal dump would turn the family red while destroying the fixture.
  writeJson(path.join(fam.dir, "reports/negative-fill-refusals.json"), {
    schemaVersion: "rcap-negative-fill-refusals/v1",
    assertion: "Every field or anchor the renderer declined under the canonical facts, with the reason it declined. Money, race, government identifiers, arrest and disposition dates without an explicit mapping, agency, court, clerk, prosecutor, attorney and outside-party blocks, signatures, notarization, service blocks and non-text controls are refused by construction rather than by a deny pattern.",
    refused: report?.refused ?? []
  });

  // The finalized fixture is flattened, so a scan that reads field values back
  // sees nothing and passes vacuously. What still means something is what the
  // renderer wrote, checked against what is actually visible on the page.
  let scan = null;
  const canonicalPath = path.join(fam.dir, "fixtures/canonical-filled.pdf");
  if (report && fs.existsSync(canonicalPath)) {
    const finalized = await PDFDocument.load(fs.readFileSync(canonicalPath), { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalized);
    const protectedNames = new Set((report.protectedFields ?? []).map((p) => p.field));
    scan = {
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      sourceSha256: sha,
      writtenCount: report.written.length,
      missingFromPage: missingExpectedValues(visible, report.expectedValues),
      writtenIntoProtectedField: report.written.filter((w) => protectedNames.has(w.field ?? w.anchor)),
      activeContentResidue: report.activeContentScan?.hits ?? [],
      reconciliation: reconcileWrittenAgainstDeclared({
        writtenFields: report.written.map((w) => w.field ?? w.anchor),
        declaredBindings: declared,
        refusedFields: report.refused
      })
    };
    scan.pass = scan.missingFromPage.length === 0
      && scan.writtenIntoProtectedField.length === 0
      && scan.activeContentResidue.length === 0;
    writeJson(path.join(fam.dir, "reports/protected-fields-scan.json"), scan);
  }

  // The family-local implementation proof: the hashes that make every artifact
  // above re-derivable from the pinned bytes and the committed map.
  if (provenance) {
    writeJson(path.join(fam.dir, "reports/rendered-artifacts.json"), {
      schemaVersion: "rcap-rendered-artifacts/v1",
      familyId: fam.familyId,
      sourceSha256: sha,
      sourceByteLength: bytes.length,
      renderer: RENDERER_VERSION,
      factoryVersion: FACTORY_VERSION,
      generatedAt: GENERATED_AT,
      mapKind: fam.mapKind,
      artifacts: Object.fromEntries(provenance.artifacts.map((a) => [a.artifact, {
        sha256: a.outputSha256, byteLength: a.byteLength ?? null
      }]))
    });
  }

  summary.push({
    familyId: fam.familyId, mapKind: fam.mapKind, sourceSha256: sha,
    declared: declared.length,
    written: report?.written.length ?? 0,
    refused: report?.refused.length ?? 0,
    unfittable: report?.unfittable.length ?? 0,
    contactSheet: Boolean(sheet),
    scanPass: scan?.pass ?? null,
    nonFilingHold: nonFilingHold?.notice ?? null
  });
}

function writeArtifact(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!checkOnly) fs.writeFileSync(file, bytes);
}

console.log(`${checkOnly ? "checked" : "rendered"} ${summary.length} residual famil${summary.length === 1 ? "y" : "ies"}`);
for (const s of summary) {
  console.log(`  ${s.familyId}  [${s.mapKind}]  sha ${s.sourceSha256.slice(0, 12)}`);
  console.log(`    declared ${s.declared}  written ${s.written}  refused ${s.refused}  unfittable ${s.unfittable}`);
  console.log(`    contact sheet ${s.contactSheet ? "built" : "NOT BUILT"}   readback scan ${s.scanPass === null ? "n/a" : s.scanPass ? "pass" : "FAIL"}`);
  if (s.nonFilingHold) console.log(`    non-filing hold: ${s.nonFilingHold}`);
}
const bad = summary.filter((s) => !s.contactSheet || s.scanPass === false);
if (bad.length > 0) {
  console.error(`FAIL ${bad.length} famil${bad.length === 1 ? "y" : "ies"} did not finish: ${bad.map((b) => b.familyId).join(", ")}`);
  process.exit(1);
}
