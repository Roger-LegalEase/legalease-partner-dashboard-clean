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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const COHORT_ONLY = process.argv.includes("--cohort-only");
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
    if (!rendered || (rendered.routeArtifacts ?? []).length === 0) continue;
    const familyId = rendered.familyId ?? entry.replace(/--[a-z-]+$/, "");

    const byRoute = new Map();
    for (const a of rendered.routeArtifacts) {
      if (!byRoute.has(a.route)) byRoute.set(a.route, []);
      byRoute.get(a.route).push(a);
    }

    for (const [route, artifacts] of byRoute) {
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

      rows.push({
        /* rcap-raster-batch.mjs keys on familyId and slugs it for the output
         * directory. A route row therefore carries a composite id so a verdict
         * can never be mistaken for the family assembly's verdict. */
        familyId: `${familyId}::route::${route}`,
        packetFamilyId: familyId,
        routeKey: artifacts[0].routeKey,
        route,
        unitOfDelivery: "route_artifact",
        inFirstCohort: FIRST_COHORT_ROUTES.includes(route),
        packetCommitSha: git(["rev-parse", "HEAD"]),
        canonicalPdfPath: canonical.path, canonicalPdfSha256: canonical.sha256,
        boundaryPdfPath: boundary.path, boundaryPdfSha256: boundary.sha256,
        expectedPages: canonical.pageCount,
        fixtureSelection: {
          canonical: "the route's own canonical artifact, declared in reports/rendered-artifacts.json under routeArtifacts",
          boundary: "the route's own boundary artifact, declared in reports/rendered-artifacts.json under routeArtifacts"
        },
        documents,
        documentsDigest: crypto.createHash("sha256").update(documents.map((d) => `${d.path}:${d.sha256}`).join("\n")).digest("hex"),
        coverage: {
          documents: documents.map((d) => d.name),
          rastered: documents.map((d) => d.name),
          notRastered: [],
          complete: true,
          basis: "both of the route's artifacts are rendered, so the row covers everything a participant on this route receives"
        },
        requestedScale: REQUESTED_SCALE,
        currentRasterState: "RASTER_PENDING",
        doesNotInheritTheFamilyReceipt: "the family-level RASTER_PASS in data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json binds to the family assembly's SHA-256, which is not this file's SHA-256; it is not carried forward here and must not be read as covering this route"
      });
    }
  }
}

rows.sort((a, b) => (Number(b.inFirstCohort) - Number(a.inFirstCohort)) || a.familyId.localeCompare(b.familyId));
const queued = COHORT_ONLY ? rows.filter((r) => r.inFirstCohort) : rows;

const doc = {
  schemaVersion: "rcap-route-artifact-raster-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-route-artifact-raster-queue.mjs",
  packetCommitSha: git(["rev-parse", "HEAD"]),
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
    notEligible: notEligible.length
  },
  rows: queued,
  notEligible,
  packetPdfsModified: 0, packetContentChanged: false, commercialRoutesOpened: 0, productionTouched: false
};

fs.mkdirSync(path.join(ROOT, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${OUT}: ${doc.counts.rows} row(s), ${doc.counts.documents} document(s), ${doc.counts.pages} page(s), ${doc.counts.notEligible} not eligible`);
for (const n of notEligible) console.log(`  not eligible: ${n.familyId} ${n.route} — ${n.why}`);
