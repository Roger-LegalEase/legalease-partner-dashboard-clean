#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/IN";
const ACROFORM_PATH = "src/lib/rcap/packets/jurisdictions/indiana/acroform.ts";
const REQUIRE_READY = process.argv.includes("--require-ready");
const unexpected = process.argv
  .slice(2)
  .filter((argument) => argument !== "--require-ready");

if (unexpected.length > 0) {
  console.error(`Unsupported arguments: ${unexpected.join(", ")}`);
  process.exit(1);
}

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const sources = readJson(`${FAMILY_DIR}/source-requirements.json`);
const renderer = readJson(`${FAMILY_DIR}/renderer-scaffold.json`);
const maps = readJson(`${FAMILY_DIR}/field-maps.json`);
const sourceById = new Map(
  sources.requirements.map((requirement) => [
    requirement.componentDocumentId,
    requirement,
  ]),
);
const mapById = new Map(
  maps.fieldMaps.map((fieldMap) => [fieldMap.componentDocumentId, fieldMap]),
);
const expected = [
  {
    documentId: "CCA-XP-0220-7008",
    sha256: "2c4aaf4a68b06f192e5f0c4b9bbfe0dd4c04b4b1f5e0fbab879bb450223e78f0",
    bytes: 3981416,
    fields: 85,
  },
  {
    documentId: "CCA-XP-0220-7009",
    sha256: "499ed8a49c785fa949bcce19c3783f84318b73bc162cb5db8576094a321990b1",
    bytes: 2620327,
    fields: 67,
  },
  {
    documentId: "CCA-XP-0220-7010",
    sha256: "b613c145701a5185fd11d4df61efad5d3b352fc13987581531267868724fbf4b",
    bytes: 784143,
    fields: 68,
  },
];

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(
  fs.existsSync(path.join(ROOT, ACROFORM_PATH)),
  `${ACROFORM_PATH} is missing.`,
);
const moduleText = fs.existsSync(path.join(ROOT, ACROFORM_PATH))
  ? fs.readFileSync(path.join(ROOT, ACROFORM_PATH), "utf8")
  : "";

check(
  sources.assignmentAnchor === null &&
    sources.portableProjection === null &&
    sources.workerReadAuthorized === false &&
    sources.workerMaterializationAuthorized === false &&
    sources.workerReady === false,
  "Indiana AcroForm family gained source access or readiness.",
);
check(
  renderer.laneCounts.acroformOrHybrid === 3 &&
    renderer.activeRendererCount === 0 &&
    renderer.enabled === false,
  "AcroForm candidate count or runtime posture drifted.",
);

for (const pin of expected) {
  const requirement = sourceById.get(pin.documentId);
  const fieldMap = mapById.get(pin.documentId);
  const rendererDocument = renderer.documents.find(
    (document) => document.componentDocumentId === pin.documentId,
  );
  check(
    requirement?.identityBindingStatus === "exact_pinned_identity" &&
      requirement.expectedSha256 === pin.sha256 &&
      requirement.expectedBytes === pin.bytes &&
      requirement.technicalExpectation?.technicalClass === "clean_acroform" &&
      requirement.technicalExpectation.pageCount === 3 &&
      requirement.technicalExpectation.fieldCount === pin.fields &&
      requirement.sourceMaterializationState ===
        "binary_materialization_required" &&
      requirement.workerReadAuthorized === false &&
      requirement.workerMaterializationAuthorized === false,
    `${pin.documentId}: exact source preflight drifted.`,
  );
  check(
    rendererDocument?.candidateRendererLane === "acroform_or_hybrid_fill" &&
      rendererDocument.activeRenderer === null &&
      fieldMap?.strategyCandidate === "acroform_or_hybrid_fill" &&
      fieldMap.activeRendererStrategy === null &&
      fieldMap.sourceFieldInventory.length === 0 &&
      fieldMap.sourceFieldBindings.length === 0 &&
      fieldMap.generationAllowed === false,
    `${pin.documentId}: AcroForm lane or zero-write map drifted.`,
  );
  check(
    moduleText.includes(`"${pin.documentId}"`) &&
      moduleText.includes(pin.sha256) &&
      moduleText.includes(`expectedBytes: ${pin.bytes}`),
    `${pin.documentId}: typed AcroForm boundary omits its immutable pin.`,
  );
}

check(
  moduleText.includes("workerReadAuthorized: false") &&
    moduleText.includes("workerMaterializationAuthorized: false") &&
    moduleText.includes("rendererEnabled: false") &&
    moduleText.includes("generationAllowed: false") &&
    !moduleText.includes("pdf-lib") &&
    !moduleText.includes("PDF" + "Document") &&
    !moduleText.includes("fetch" + "("),
  "Typed AcroForm output lost its fail-closed no-byte boundary.",
);

const factoryCheck = spawnSync(
  process.execPath,
  [
    "scripts/rcap-factory-plan.mjs",
    "--check-job",
    "rcap-in-acroform-fill",
    "--compact",
  ],
  { cwd: ROOT, encoding: "utf8" },
);
check(
  factoryCheck.status === 0,
  `Factory output contract failed: ${factoryCheck.stderr.trim()}`,
);
if (factoryCheck.status === 0) {
  const factoryResult = JSON.parse(factoryCheck.stdout);
  check(
    factoryResult.jobId === "rcap-in-acroform-fill" &&
      factoryResult.result === "passed" &&
      factoryResult.checkedOutputs.includes(ACROFORM_PATH),
    "Factory output contract did not check the Indiana AcroForm path.",
  );
}

if (REQUIRE_READY) {
  failures.push(
    "acroform_not_ready: 3 binary materializations, fresh field inspection, source mappings, and source-backed reviews are required",
  );
}

if (failures.length > 0) {
  console.error(
    `Indiana AcroForm verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`,
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Indiana AcroForm verification passed: 3 exact candidates, 0 source reads, 0 mappings, and 0 active renderers.",
  );
}
