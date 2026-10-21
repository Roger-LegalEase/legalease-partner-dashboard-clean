#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runEastFamily } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill");
const FIELD_MAP = path.join(OVERLAY, "production-field-map.json");
const ACTUAL_WRITES = path.join(OVERLAY, "reports/actual-writes.json");
const RENDERED_ARTIFACTS = path.join(OVERLAY, "reports/rendered-artifacts.json");
const PROTECTED_CONTROLS_REPORT = path.join(OVERLAY, "reports/protected-controls.json");
const COURT_USE_ONLY_CAPTION = "***FOR COURT USE ONLY - DO NOT WRITE BELOW THIS LINE***";
const PROTECTED_CLASS = "court_prosecutor_clerk_or_agency_owned";
const PROTECTED_REASON = `This control is printed below "${COURT_USE_ONLY_CAPTION}" and is completed by the court, prosecutor, clerk, or agency, not by the participant. It remains protected and blank in participant artifacts.`;
const CAPTION_BASIS = `read from the form's printed face: below "${COURT_USE_ONLY_CAPTION}" on page 1`;
const COURT_CONTROLS = new Map([
  ["Proper_ID", { y: 118.412, label: "1. Proper identification and notarization provided by applicant." }],
  ["Application_Complete", { y: 104.817, label: "2. All required information is completed, and the court clerk has checked and verified the information is correct." }],
  ["Charge_Sealed", { y: 78.793, label: "3. Eligible charge(s) is/are sealed in court case management system: ADBM, CRMS, CRIM, DCRIMS, SAMS, etc. pursuant to CPL 160.50(3)(k)." }],
  ["Comment_Entered", { y: 53.933, label: "4. \"Application for Destruction Submitted\" comment entered in court case management system in appearance closest to date of signed application." }],
  ["File_Copy", { y: 40.338, label: "5. Application is scanned/uploaded to case management system and/or placed in case file, as applicable." }],
  ["Copies_Sent", { y: 27.132, label: "6. Copies of application sent to prosecutor, law enforcement agencies and DCJS as applicable for further processing." }],
]);
const DELIVERED_PDFS = new Map([
  ["canonical", {
    file: "fixtures/mrta-destruction-request-canonical.pdf",
    sha256: "37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff",
    byteLength: 247978,
    pageCount: 1,
  }],
  ["boundary", {
    file: "fixtures/mrta-destruction-request-boundary.pdf",
    sha256: "5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457",
    byteLength: 247265,
    pageCount: 1,
  }],
]);

function fail(message) {
  throw new Error(`NY MRTA protected-control assertion failed: ${message}`);
}

function collectCourtControls(fieldMap) {
  const found = new Map();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value) && COURT_CONTROLS.has(value.field)) {
      if (found.has(value.field)) fail(`duplicate field-map entry ${value.field}`);
      found.set(value.field, value);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(fieldMap);
  const missing = [...COURT_CONTROLS.keys()].filter((field) => !found.has(field));
  if (missing.length || found.size !== COURT_CONTROLS.size) {
    fail(`expected 6 court-use-only controls; missing=${JSON.stringify(missing)} found=${found.size}`);
  }
  return found;
}

function protectCourtUseOnlyControls() {
  const fieldMap = JSON.parse(fs.readFileSync(FIELD_MAP, "utf8"));
  const found = collectCourtControls(fieldMap);
  for (const [field, control] of found) {
    const expected = COURT_CONTROLS.get(field);
    control.decision = "refuse";
    control.factId = null;
    control.refusalClass = PROTECTED_CLASS;
    control.blankTreatment = null;
    control.effectiveLabel = expected.label;
    control.reason = PROTECTED_REASON;
    control.captionBasis = CAPTION_BASIS;
  }
  fs.writeFileSync(FIELD_MAP, `${JSON.stringify(fieldMap, null, 2)}\n`);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function assertProtectedAndBlank() {
  const fieldMap = JSON.parse(fs.readFileSync(FIELD_MAP, "utf8"));
  const found = collectCourtControls(fieldMap);
  const controls = [];
  for (const [field, expected] of COURT_CONTROLS) {
    const control = found.get(field);
    if (control.decision !== "refuse" || control.factId !== null
        || control.refusalClass !== PROTECTED_CLASS || control.blankTreatment !== null) {
      fail(`${field} is not protected from runtime collection`);
    }
    if (control.effectiveLabel !== expected.label || control.reason !== PROTECTED_REASON
        || control.captionBasis !== CAPTION_BASIS) {
      fail(`${field} lacks the court-use-only reason/caption basis`);
    }
    const widgets = Array.isArray(control.widgets) ? control.widgets : [];
    if (widgets.length !== 2 || widgets.some(({ page, rect }) => page !== 1
        || rect?.y !== expected.y) || widgets[0]?.rect?.x !== 44.657) {
      fail(`${field} is outside the expected page-1 court-use-only block geometry`);
    }
    controls.push({
      field,
      classification: control.refusalClass,
      decision: control.decision,
      factId: control.factId,
      protected: true,
      expectedBlank: true,
      page: 1,
      x: widgets[0].rect.x,
      y: widgets[0].rect.y,
      reason: control.reason,
      captionBasis: control.captionBasis,
    });
  }

  const writesReport = JSON.parse(fs.readFileSync(ACTUAL_WRITES, "utf8"));
  const renderedReport = JSON.parse(fs.readFileSync(RENDERED_ARTIFACTS, "utf8"));
  const artifactProof = [];
  for (const [fixture, expected] of DELIVERED_PDFS) {
    const file = path.join(OVERLAY, expected.file);
    const actualHash = sha256(file);
    const actualBytes = fs.statSync(file).size;
    if (actualHash !== expected.sha256 || actualBytes !== expected.byteLength) {
      fail(`${fixture} PDF bytes changed (${actualHash}, ${actualBytes})`);
    }
    const artifact = writesReport.artifacts?.find((entry) => entry.fixture === fixture);
    const rendered = renderedReport.pdfs?.find((entry) => entry.fixture === fixture);
    if (!artifact || !rendered || artifact.sha256 !== actualHash
        || artifact.byteLength !== actualBytes || artifact.proof?.artifactSha256 !== actualHash
        || artifact.proof?.artifactByteLength !== actualBytes || rendered.sha256 !== actualHash
        || rendered.byteLength !== actualBytes || rendered.pageCount !== expected.pageCount) {
      fail(`${fixture} reports do not describe the pinned one-page PDF`);
    }
    const written = new Set((artifact.written ?? []).map(({ field }) => field));
    const refusedByRole = new Set((artifact.refused ?? [])
      .filter(({ category }) => category === "role").map(({ field }) => field));
    const neutralized = new Set((artifact.choiceNeutralization?.fields ?? [])
      .map(({ field }) => field));
    const leaked = [...COURT_CONTROLS.keys()].filter((field) => written.has(field));
    const notRefused = [...COURT_CONTROLS.keys()].filter((field) => !refusedByRole.has(field));
    const notNeutralized = [...COURT_CONTROLS.keys()].filter((field) => !neutralized.has(field));
    const protectedProofKeys = [
      "protectedInk",
      "protectedVectorInk",
      "protectedSourceOwnedAppearances",
    ];
    const protectedInk = protectedProofKeys.flatMap((key) => artifact.proof?.[key] ?? []);
    if (leaked.length || notRefused.length || notNeutralized.length || protectedInk.length) {
      fail(`${fixture} is not six-of-six protected and blank: ${JSON.stringify({ leaked, notRefused, notNeutralized, protectedInk })}`);
    }
    artifactProof.push({
      fixture,
      file: path.relative(ROOT, file),
      sha256: actualHash,
      byteLength: actualBytes,
      pageCount: rendered.pageCount,
      protectedControls: COURT_CONTROLS.size,
      protectedControlsBlank: COURT_CONTROLS.size,
      evidence: {
        absentFromWritten: true,
        refusedByRole: true,
        choiceNeutralizedBeforeFlatten: artifact.choiceNeutralization?.performedBeforeFlatten === true,
        protectedInkEmpty: true,
      },
    });
  }
  if (artifactProof.some(({ evidence }) => !evidence.choiceNeutralizedBeforeFlatten)) {
    fail("choice neutralization was not performed before flattening");
  }
  return { controls, artifactProof };
}

function writeProtectedControlsReport(proof) {
  const report = {
    schemaVersion: "rcap-protected-controls/v1",
    familyId: "ny_mrta_marijuana-set",
    routeKey: "obligation:unit:NY:ny_mrta_marijuana:ny-mrta-destruction-request",
    printedBoundary: COURT_USE_ONLY_CAPTION,
    expectedClassification: PROTECTED_CLASS,
    protectedControls: `${proof.controls.length}/${COURT_CONTROLS.size}`,
    allProtected: proof.controls.length === COURT_CONTROLS.size,
    allBlank: proof.artifactProof.every(({ protectedControlsBlank }) =>
      protectedControlsBlank === COURT_CONTROLS.size),
    controls: proof.controls,
    artifacts: proof.artifactProof,
  };
  fs.writeFileSync(PROTECTED_CONTROLS_REPORT, `${JSON.stringify(report, null, 2)}\n`);
}

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check-protected-controls");
const repairOnly = argv.includes("--repair-field-map-only");
if (!checkOnly && !repairOnly) await runEastFamily("ny_mrta_marijuana-set", argv);
if (!checkOnly) protectCourtUseOnlyControls();
const proof = assertProtectedAndBlank();
if (!checkOnly) writeProtectedControlsReport(proof);
console.log(`NY_MRTA_PROTECTED_CONTROLS_OK ${proof.controls.length}/${COURT_CONTROLS.size} protected and blank in ${proof.artifactProof.length}/${DELIVERED_PDFS.size} artifacts`);
