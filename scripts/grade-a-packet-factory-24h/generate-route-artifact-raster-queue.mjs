#!/usr/bin/env node
/**
 * A raster queue whose unit is a ROUTE ARTIFACT, not a family.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-route-artifact-raster-queue.mjs [--cohort-only]
 *
 * WHY THE FAMILY RECEIPT DOES NOT COVER THESE
 *
 * RASTER_QUEUE.json carries a RASTER_PASS for rcap-ks-custom-pleading and one
 * for rcap-tn-custom-pleading. Both are hash-bound, and both bind to the family
 * ASSEMBLY's bytes -- 6a4ce684.../682a6a4b... for Kansas, 4bfc8238.../be3ec3ee...
 * for Tennessee. A route artifact is a different file with a different SHA-256,
 * assembled separately, and rcap-raster-batch.mjs refuses on exactly that
 * mismatch by design: "a receipt describing a different packet is not this
 * family's evidence, however clean the rasters look."
 *
 * So the family receipt must not be inherited. It says nothing about
 * fixtures/routes/<route>/canonical.pdf, because those bytes were not in the
 * run that produced it. The pages are content-identical to the assembly's pages
 * -- that was proved separately, by hashing content streams and MediaBoxes --
 * and content-identity is still not a rendered measurement of these bytes. A
 * page can be identical and the file it sits in unrenderable.
 *
 * This queue therefore enrols each route as its own row, carrying that route's
 * canonical and boundary artifacts as its documents, so rcap-raster-batch.mjs
 * pins and renders the route artifact's own bytes and the verdict names the
 * route it covers.
 *
 * IT IS NOT MASTER_QUEUE.json AND IT IS NOT RASTER_QUEUE.json. Those two are
 * the Captain's, and this lane writes neither. This is a lane-local manifest in
 * the lane's own directory, in the shape rcap-raster-batch.mjs already reads
 * through its --manifest flag, produced so the evidence exists for the Captain
 * to ingest rather than proposed as a change to a file this lane does not own.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { singleRouteFamilyArtifacts } from "../lib/route-artifact-scope.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const COHORT_ONLY = ARGS.includes("--cohort-only");
const multi = (flag) => ARGS.reduce((acc, arg, i) => (arg === flag && ARGS[i + 1] ? [...acc, ARGS[i + 1]] : acc), []);
const ONLY_FAMILIES = multi("--family");
const ONLY_ROUTES = multi("--route");
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const OUT = "data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json";
const REQUESTED_SCALE = 2.5;

/* The five routes the first cohort turns on. Ordered first so a run that has to
 * stop early has finished the ones that matter, rather than half-finishing all
 * thirteen. */
const FIRST_COHORT_ROUTES = [
  "ks-12-4516-municipal", "ks-12-4516a-municipal-arrest",
  "tn_eligible_conviction", "tn_judicial_diversion", "tn_two_offense"
];

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } };
const readIf = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const master = readIf("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const customerRegistry = readIf("data/record-clearing/factory-v2-route-registry.json");
const centralRasterQueue = readIf("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json");
const centralRasterByFamily = new Map((centralRasterQueue?.rows ?? []).map((row) => [row.familyId, row]));
const routeReceiptDir = path.join(ROOT, "data/rcap-grade-a/route-artifact-acceptance/raster-receipts");
const routeReceipts = new Map();
if (fs.existsSync(routeReceiptDir)) {
  for (const file of fs.readdirSync(routeReceiptDir).filter((name) => name.endsWith(".verdict.json"))) {
    const verdict = JSON.parse(fs.readFileSync(path.join(routeReceiptDir, file), "utf8"));
    routeReceipts.set(verdict.familyId, { verdict, file });
  }
}

/* Page count from the parser, never from a byte scan and never from the build
 * record: the queue pins what the renderer will be asked to render, and
 * rcap-raster-batch.mjs compares its own parse against this number. */
const pageCountOrNull = async (p) => {
  const { warn, log, error } = console;
  Object.assign(console, { warn: () => {}, log: () => {}, error: () => {} });
  try {
    return (await PDFDocument.load(fs.readFileSync(p), { ignoreEncryption: true, updateMetadata: false })).getPageCount();
  } catch { return null; } finally { Object.assign(console, { warn, log, error }); }
};

const rows = [];
const notEligible = [];

for (const state of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const stateDir = path.join(ROOT, OVERLAYS, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const entry of fs.readdirSync(stateDir)) {
    const dir = `${OVERLAYS}/${state}/${entry}`;
    const rendered = readIf(`${dir}/reports/rendered-artifacts.json`);
    if (!rendered) continue;
    const familyId = rendered.familyId ?? entry.replace(/--[a-z-]+$/, "");
    if (ONLY_FAMILIES.length > 0 && !ONLY_FAMILIES.includes(familyId)) continue;
    const fieldMap = readIf(`${dir}/production-field-map.json`);
    const routeArtifacts = (rendered.routeArtifacts ?? []).length > 0
      ? rendered.routeArtifacts
      : singleRouteFamilyArtifacts({ familyId, rendered, fieldMap, master, routeRegistry: customerRegistry });
    if (routeArtifacts.length === 0) continue;

    const byRoute = new Map();
    for (const a of routeArtifacts) {
      if (!byRoute.has(a.route)) byRoute.set(a.route, []);
      byRoute.get(a.route).push(a);
    }

    for (const [route, artifacts] of byRoute) {
      if (ONLY_ROUTES.length > 0 && !ONLY_ROUTES.includes(route)) continue;
      const documents = [];
      let refused = null;
      for (const a of artifacts) {
        const abs = path.join(ROOT, a.file);
        if (!fs.existsSync(abs)) { refused = `${a.file} is absent at this commit`; break; }
        const observed = sha256(abs);
        if (observed !== a.sha256) { refused = `${a.file} hashes ${observed} and its build record states ${a.sha256}`; break; }
        const pages = await pageCountOrNull(abs);
        if (pages === null) { refused = `${a.file} cannot be parsed for a page count, and a receipt over an unknown number of pages proves nothing`; break; }
        if (pages !== a.pageCount) { refused = `${a.file} parses to ${pages} page(s) and its build record states ${a.pageCount}`; break; }
        documents.push({ role: a.fixture, name: `${route}--${a.fixture}.pdf`, path: a.file, sha256: observed, pageCount: pages });
      }
      if (refused) { notEligible.push({ familyId, route, why: refused }); continue; }
      documents.sort((x, y) => x.name.localeCompare(y.name));

      const canonical = documents.find((d) => d.role === "canonical") ?? null;
      const boundary = documents.find((d) => d.role === "boundary") ?? null;
      if (!canonical || !boundary) {
        notEligible.push({ familyId, route, why: `the route ships ${documents.map((d) => d.role).join(" and ") || "nothing"}; a row is queued only when both fixtures exist` });
        continue;
      }

      const familyAssemblyIsRouteArtifact = artifacts.every((artifact) => artifact.familyAssemblyIsRouteArtifact === true);
      const existingRaster = familyAssemblyIsRouteArtifact ? centralRasterByFamily.get(familyId) ?? null : null;
      const receipt = existingRaster?.rasterReceipt ?? null;
      const exactExistingRasterPass = existingRaster?.currentRasterState === "RASTER_PASS"
        && receipt?.verdict === "RASTER_PASS"
        && receipt?.coversTheWholeFamily === true
        && existingRaster.canonicalPdfPath === canonical.path
        && existingRaster.canonicalPdfSha256 === canonical.sha256
        && existingRaster.boundaryPdfPath === boundary.path
        && existingRaster.boundaryPdfSha256 === boundary.sha256
        && receipt.boundToCanonicalSha256 === canonical.sha256
        && receipt.boundToBoundarySha256 === boundary.sha256;
      const routeFamilyId = `${familyId}::route::${route}`;
      const routeReceipt = routeReceipts.get(routeFamilyId) ?? null;
      const documentsDigest = crypto.createHash("sha256").update(documents.map((d) => `${d.path}:${d.sha256}`).join("\n")).digest("hex");
      const exactRouteRasterPass = routeReceipt?.verdict?.verdict === "RASTER_PASS"
        && routeReceipt.verdict.coversTheWholeFamily === true
        && (routeReceipt.verdict.problems ?? []).length === 0
        && routeReceipt.verdict.documentsDigest === documentsDigest
        && routeReceipt.verdict.hashesBound?.canonical?.path === canonical.path
        && routeReceipt.verdict.hashesBound.canonical.pinned === canonical.sha256
        && routeReceipt.verdict.hashesBound?.boundary?.path === boundary.path
        && routeReceipt.verdict.hashesBound.boundary.pinned === boundary.sha256
        && (routeReceipt.verdict.measurements ?? []).length === routeReceipt.verdict.pagesMeasured
        && routeReceipt.verdict.measurements.every((measurement) => measurement.nonblank === true && measurement.croppedToThePage === true);

      rows.push({
        /* rcap-raster-batch.mjs keys on familyId and slugs it for the output
         * directory. A route row therefore carries a composite id so a verdict
         * can never be mistaken for the family assembly's verdict. */
        familyId: routeFamilyId,
        packetFamilyId: familyId,
        routeKey: artifacts[0].routeKey,
        route,
        customerRouteId: artifacts[0].customerRouteId ?? null,
        unitOfDelivery: "route_artifact",
        familyAssemblyIsRouteArtifact,
        equivalenceBasis: artifacts[0].equivalenceBasis ?? null,
        inFirstCohort: FIRST_COHORT_ROUTES.includes(route),
        packetCommitSha: exactRouteRasterPass
          ? routeReceipt.verdict.packetCommitSha
          : familyAssemblyIsRouteArtifact
          ? existingRaster?.packetCommitSha ?? git(["rev-parse", "HEAD"])
          : git(["rev-parse", "HEAD"]),
        canonicalPdfPath: canonical.path, canonicalPdfSha256: canonical.sha256,
        boundaryPdfPath: boundary.path, boundaryPdfSha256: boundary.sha256,
        expectedPages: canonical.pageCount,
        fixtureSelection: familyAssemblyIsRouteArtifact
          ? {
              canonical: "the canonical family assembly; the committed one-route/component equivalence makes it this route's artifact without copying the bytes",
              boundary: "the boundary family assembly; the committed one-route/component equivalence makes it this route's artifact without copying the bytes"
            }
          : {
              canonical: "the route's own canonical artifact, declared in reports/rendered-artifacts.json under routeArtifacts",
              boundary: "the route's own boundary artifact, declared in reports/rendered-artifacts.json under routeArtifacts"
            },
        documents,
        documentsDigest,
        coverage: {
          documents: documents.map((d) => d.name),
          rastered: documents.map((d) => d.name),
          notRastered: [],
          complete: true,
          basis: "both of the route's artifacts are rendered, so the row covers everything a participant on this route receives"
        },
        requestedScale: REQUESTED_SCALE,
        currentRasterState: exactRouteRasterPass || exactExistingRasterPass ? "RASTER_PASS" : "RASTER_PENDING",
        preexistingRasterAcceptance: exactRouteRasterPass
          ? {
              verdict: routeReceipt.verdict.verdict,
              workflowRunId: routeReceipt.verdict.workflowRunId,
              boundToCanonicalSha256: routeReceipt.verdict.hashesBound.canonical.pinned,
              boundToBoundarySha256: routeReceipt.verdict.hashesBound.boundary.pinned,
              pagesMeasured: routeReceipt.verdict.pagesMeasured,
              problemsFound: (routeReceipt.verdict.problems ?? []).length,
              receiptArtifact: routeReceipt.verdict.documentsDigest,
              source: `data/rcap-grade-a/route-artifact-acceptance/raster-receipts/${routeReceipt.file}`,
              whyItApplies: "the route receipt binds this exact route id, document set, paths and SHA-256 values"
            }
          : exactExistingRasterPass
          ? {
              verdict: receipt.verdict,
              workflowRunId: receipt.workflowRunId,
              jobId: receipt.jobId,
              boundToCanonicalSha256: receipt.boundToCanonicalSha256,
              boundToBoundarySha256: receipt.boundToBoundarySha256,
              pagesMeasured: receipt.pagesMeasured,
              problemsFound: receipt.problemsFound,
              receiptArtifact: receipt.receiptArtifact,
              source: "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json",
              whyItApplies: "the one-route family assembly is the route artifact itself, so the receipt binds these exact paths and hashes rather than neighbouring bytes"
            }
          : null,
        doesNotInheritTheFamilyReceipt: exactRouteRasterPass || exactExistingRasterPass
          ? null
          : "the family-level RASTER_PASS binds different or insufficiently scoped bytes; it is not carried forward and must not be read as covering this route"
      });
    }
  }
}

rows.sort((a, b) => (Number(b.inFirstCohort) - Number(a.inFirstCohort)) || a.familyId.localeCompare(b.familyId));
const selectedRows = COHORT_ONLY ? rows.filter((r) => r.inFirstCohort) : rows;
if ((ONLY_FAMILIES.length > 0 || ONLY_ROUTES.length > 0) && selectedRows.length === 0 && notEligible.length === 0) {
  console.error("REFUSED: no route artifacts matched the explicit filter");
  process.exit(1);
}
const existing = readIf(OUT);
const selectedByFilters = (row) =>
  (ONLY_FAMILIES.length === 0 || ONLY_FAMILIES.includes(row.packetFamilyId))
  && (ONLY_ROUTES.length === 0 || ONLY_ROUTES.includes(row.route));
const focused = ONLY_FAMILIES.length > 0 || ONLY_ROUTES.length > 0;
const queued = focused && existing?.rows
  ? [...existing.rows.filter((row) => !selectedByFilters(row)), ...selectedRows]
  : selectedRows;
const outputNotEligible = focused && existing?.notEligible
  ? [...existing.notEligible.filter((row) => !selectedByFilters({ packetFamilyId: row.familyId, route: row.route })), ...notEligible]
  : notEligible;

const doc = {
  ...(focused && existing ? existing : {}),
  schemaVersion: "rcap-route-artifact-raster-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-route-artifact-raster-queue.mjs",
  packetCommitSha: focused && existing?.packetCommitSha ? existing.packetCommitSha : git(["rev-parse", "HEAD"]),
  whyThisExists: "Route-scoped artifacts carry rasterPending: true and the family raster receipt binds to different bytes. This enrols each route artifact in central raster acceptance on its own hashes.",
  thisIsNotTheCaptainsQueue: "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json and MASTER_QUEUE.json are the Captain's and are not written by this lane. This manifest is lane-local and is read by rcap-raster-batch.mjs through --manifest.",
  consumedBy: "node scripts/rcap-raster-batch.mjs --manifest <this file> --family <familyId> --out <dir>",
  requestedScale: REQUESTED_SCALE,
  firstCohortRoutes: FIRST_COHORT_ROUTES,
  cohortOnly: COHORT_ONLY,
  counts: {
    rows: queued.length,
    inFirstCohort: queued.filter((r) => r.inFirstCohort).length,
    documents: queued.reduce((n, r) => n + r.documents.length, 0),
    pages: queued.reduce((n, r) => n + r.documents.reduce((m, d) => m + d.pageCount, 0), 0),
    notEligible: outputNotEligible.length
  },
  rows: queued,
  notEligible: outputNotEligible,
  focusedRegeneration: focused
    ? { families: ONLY_FAMILIES, routes: ONLY_ROUTES, rowsReplaced: selectedRows.length, untouchedRowsPreserved: queued.length - selectedRows.length }
    : null,
  packetPdfsModified: 0, packetContentChanged: false, commercialRoutesOpened: 0, productionTouched: false
};

fs.mkdirSync(path.join(ROOT, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${OUT}: ${doc.counts.rows} row(s), ${doc.counts.documents} document(s), ${doc.counts.pages} page(s), ${doc.counts.notEligible} not eligible`);
for (const n of notEligible) console.log(`  not eligible: ${n.familyId} ${n.route} — ${n.why}`);
