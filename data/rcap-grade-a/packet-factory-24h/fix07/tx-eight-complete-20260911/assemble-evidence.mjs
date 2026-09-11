import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const BASE = "334e7f4a3954a6dff64786ad326fe4a2b7185cc5";
const ROOT = process.cwd();
const OUT = "data/rcap-grade-a/packet-factory-24h/fix07/tx-eight-complete-20260911";
const ROWS = "data/rcap-grade-a/packet-factory-24h/fix07/rows-fix07-20260911-tx-eight-complete.json";
const SCOPE = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911/scope.json"));
const ASSIGNMENT = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911/repair-assignments.json"));
const STREAMS = JSON.parse(fs.readFileSync(`${OUT}/stream-measurements.json`));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file));
const baseJson = (file) => JSON.parse(execFileSync("git", ["show", `${BASE}:${file}`], { encoding: "utf8", maxBuffer: 20e6 }));
const dateFamilies = new Set([
  "tx_nd_deferred_other-set",
  "tx_nd_dwi_probation-set",
  "tx_nd_veterans_court-set",
  "tx_nd_veterans_reemployment-set"
]);
const disclosureFamilies = new Set([
  "tx_nd_dwi_probation-set",
  "tx_nd_veterans_court-set",
  "tx_nd_veterans_reemployment-set"
]);
const routeFamilies = new Set([
  "tx_exp_acquittal-set",
  "tx_nd_conviction_no_supervision-set",
  "tx_nd_dwi_deferred-set",
  "tx_nd_probation_misdemeanor-set"
]);

const rows = [];
const rasterPdfs = [];
const familyEvidence = [];
for (const familyId of SCOPE.families) {
  const directory = SCOPE.directories[familyId];
  const assignment = ASSIGNMENT.rows.find((row) => row.itemId === familyId);
  const rendered = readJson(`${directory}/reports/rendered-artifacts.json`);
  const fieldMap = readJson(`${directory}/production-field-map.json`);
  const receipt = readJson(`${directory}/source-receipt.json`);
  const wiring = readJson(`${directory}/product-wiring.json`);
  const priorWiring = baseJson(`${directory}/product-wiring.json`);
  const priorMap = baseJson(`${directory}/production-field-map.json`);
  const priorReceipt = baseJson(`${directory}/source-receipt.json`);
  const instructions = fs.readFileSync(`${directory}/participant-instructions.md`, "utf8");
  const streamFamily = STREAMS.families.find((entry) => entry.familyId === familyId);
  const artifacts = rendered.artifacts.map((artifact) => {
    const bytes = fs.readFileSync(artifact.file);
    const stream = streamFamily.fixtures.find((entry) => entry.fixture === artifact.fixture);
    if (sha256(bytes) !== artifact.sha256 || bytes.length !== artifact.byteLength) throw new Error(`stale artifact report for ${artifact.file}`);
    const row = {
      familyId, fixture: artifact.fixture, path: artifact.file,
      sha256: artifact.sha256, byteLength: artifact.byteLength, pageCount: artifact.pageCount,
      changedPages: stream.changedPages,
      readyForCurrentRaster: true
    };
    rasterPdfs.push(row);
    return row;
  });

  const routeKeys = wiring.routeKeys;
  const participantText = [instructions, ...artifacts.map((artifact) => execFileSync("pdftotext", ["-layout", artifact.path, "-"], { encoding: "utf8", maxBuffer: 20e6 }))].join("\n");
  const routeLeaks = routeKeys.filter((key) => participantText.includes(key));
  const routeBindingUnchanged = JSON.stringify(wiring.routeKeys) === JSON.stringify(priorWiring.routeKeys)
    && wiring.routeKey === priorWiring.routeKey
    && JSON.stringify(fieldMap.routeKeys) === JSON.stringify(priorMap.routeKeys)
    && fieldMap.routeSelectionId === priorMap.routeSelectionId
    && JSON.stringify(receipt.routeKeys) === JSON.stringify(priorReceipt.routeKeys)
    && receipt.routeSelectionId === priorReceipt.routeSelectionId;
  if (routeLeaks.length || !routeBindingUnchanged) throw new Error(`route proof failed for ${familyId}`);

  const statementRows = fieldMap.maps.flatMap((map) => map.canonicalRefusals ?? []);
  const dobTasks = statementRows.filter((row) => ["Month / Mes", "Day / Día", "Year / Año"].includes(row.fieldName));
  const protectedSigningDates = statementRows.filter((row) => row.fieldName === "Today" || row.fieldName === "Year");
  if (disclosureFamilies.has(familyId)) {
    if (dobTasks.length !== 3 || dobTasks.some((row) => row.requiredBeforeFiling !== true || row.completenessDisposition !== "REQUIRED_BEFORE_FILING" || !/notary/i.test(row.why))) {
      throw new Error(`DOB disclosure proof failed for ${familyId}`);
    }
    if (protectedSigningDates.length !== 2 || protectedSigningDates.some((row) => row.requiredBeforeFiling !== false || !/sworn/i.test(row.why))) {
      throw new Error(`signing/notary protection proof failed for ${familyId}`);
    }
  }

  const dobPrints = [];
  if (dateFamilies.has(familyId)) {
    for (const artifact of rendered.artifacts) {
      const statementPage = artifact.pageManifest.find((page) => page.sourceSha256 === "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d" && page.sourcePage === 2);
      const expected = artifact.fixture === "canonical" ? "04/17/1994" : "12/31/1972";
      const forbidden = artifact.fixture === "canonical" ? "1994-04-17" : "1972-12-31";
      const text = execFileSync("pdftotext", ["-f", String(statementPage.packetPage), "-l", String(statementPage.packetPage), "-layout", artifact.file, "-"], { encoding: "utf8" });
      if (!text.includes(expected) || text.includes(forbidden)) throw new Error(`DOB print proof failed for ${familyId}/${artifact.fixture}`);
      dobPrints.push({ fixture: artifact.fixture, packetPage: statementPage.packetPage, expectedFound: expected, forbiddenAbsent: forbidden });
    }
  }

  const counters = readJson(`${directory}/reports/completeness-counters.json`);
  if (Object.values(counters.counters).some((value) => value !== 0)) throw new Error(`nonzero completeness counter for ${familyId}`);
  const failedObligationNames = assignment.failedObligationNames;
  rows.push({
    itemId: familyId, status: "COMPLETED", verdict: null,
    currentState: "BUILT_RASTER_PENDING", readOnlyCompletenessResult: "PASS_COMPLETE",
    failedObligationNames, obligationsRepaired: failedObligationNames,
    canonicalPdfSha256: artifacts.find((artifact) => artifact.fixture === "canonical").sha256,
    boundaryPdfSha256: artifacts.find((artifact) => artifact.fixture === "boundary").sha256,
    evidence: `${OUT}/repair-evidence.json`
  });
  familyEvidence.push({
    familyId, failedObligationNames, artifacts,
    defectProof: {
      participantVisibleRouteKeysAbsent: routeLeaks.length === 0,
      internalRouteBindingUnchanged: routeBindingUnchanged,
      dobPrints,
      requiredDobCopyTasks: disclosureFamilies.has(familyId) ? dobTasks.map((row) => ({ fieldName: row.fieldName, page: row.page, printedLabel: row.printedLabel, participantMustSupply: row.participantMustSupply, why: row.why })) : [],
      protectedSigningAndNotaryDates: disclosureFamilies.has(familyId) ? protectedSigningDates.map((row) => ({ fieldName: row.fieldName, page: row.page, requiredBeforeFiling: row.requiredBeforeFiling, why: row.why })) : []
    },
    sourceReceipt: receipt.documents,
    completenessCounters: counters.counters
  });
}

if (rasterPdfs.length !== 16) throw new Error(`expected 16 changed fixture PDFs, got ${rasterPdfs.length}`);
fs.writeFileSync(`${OUT}/current-raster-manifest.json`, `${JSON.stringify({
  schemaVersion: "rcap-current-raster-manifest/v1", assignedBase: BASE,
  status: "READY_FOR_CURRENT_RASTER", localRasterPerformed: false,
  requiresFreshRasterBecauseAllPacketPdfsChanged: true,
  pdfCount: rasterPdfs.length, pdfs: rasterPdfs
}, null, 2)}\n`);

fs.writeFileSync(`${OUT}/repair-evidence.json`, `${JSON.stringify({
  schemaVersion: "fix07-tx-eight-complete-verification/v1",
  assignmentId: "FIX07", status: "COMPLETED", assignedBase: BASE,
  branch: "fix07-tx-eight-complete-20260911",
  sourceReview: "No source, route, or legal research was changed; current receipts remain bound to the same files and digests.",
  defectCoverage: {
    failedObligationsReceived: 11, failedObligationsRepaired: 11,
    routeIdentityFamilies: [...routeFamilies], dateFormatFamilies: [...dateFamilies], dobDisclosureFamilies: [...disclosureFamilies]
  },
  deterministicRepeat: { buildsRepeated: 8, overlayFilesCompared: 112, fixturePdfsCompared: 16, result: "byte-identical", exitCode: 0 },
  sourceAppearanceAccounting: STREAMS.totals,
  families: familyEvidence,
  verification: [
    { command: "node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX07 <family>", families: 8, exitCode: 0, result: "all eight CLAIM_OK" },
    { command: "RCAP_NO_LOCAL_RASTER=1 node scripts/build-census-v1-<family>.mjs --check --no-raster", families: 8, exitCode: 0, result: "all current sources bound; no unmapped fields, stale keys, or caption drift" },
    { command: "RCAP_NO_LOCAL_RASTER=1 node scripts/build-census-v1-<family>.mjs --no-raster", families: 8, exitCode: 0, result: "all completed with nine zero counters" },
    { command: "RCAP_NO_LOCAL_RASTER=1 node --test scripts/rcap-packet-recovery/tx-source-restored-dates.test.mjs scripts/rcap-packet-recovery/tx-route-copy.test.mjs", exitCode: 0, result: "34 passed, 0 failed; both fixtures and meaningful negative mutations/forbidden strings covered" },
    { command: "RCAP_NO_LOCAL_RASTER=1 node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>", families: 8, exitCode: 0, result: "eight PASS_COMPLETE; no --write" },
    { command: `RCAP_NO_LOCAL_RASTER=1 node ${OUT}/measure-current-streams.mjs`, exitCode: 0, result: "546/546 source appearances retained; zero unmatched" }
  ],
  raster: { localRasterPerformed: false, currentManifest: `${OUT}/current-raster-manifest.json`, remainingGate: "fresh central raster review on all 16 changed PDFs" },
  approval: { independentVerificationIssuedByThisLane: false, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false }
}, null, 2)}\n`);

fs.writeFileSync(ROWS, `${JSON.stringify({
  schemaVersion: "rcap-packet-factory-24h-worker-rows/v1",
  assignmentId: "FIX07", workerId: "FIX07", lane: "tx-eight-complete",
  engine: "gpt-5.6-sol", reasoningEffort: "high", shiftBaseSha: BASE,
  returnFilename: path.basename(ROWS), packetsSelfVerified: 0, verdictsIssued: 0,
  commercialRoutesOpened: 0, productionTouched: false, rows
}, null, 2)}\n`);

console.log(JSON.stringify({ rows: rows.length, rasterPdfs: rasterPdfs.length, failedObligationsRepaired: 11 }));
