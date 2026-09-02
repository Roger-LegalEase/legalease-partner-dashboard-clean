#!/usr/bin/env node
/**
 * One acceptance row per route artifact, and what is still owed on it.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-route-artifact-acceptance.mjs \
 *     --receipts <dir of *.verdict.json from rcap-raster-batch.mjs>
 *
 * The owner's requirement is that each route-scoped artifact carries its own
 * evidence rather than borrowing the family's. This assembles what this lane
 * measured, per artifact, and states plainly what it did NOT establish.
 *
 * The thing it deliberately does not do is close the independent-verification
 * record. This lane built the route artifacts and then measured them; a builder
 * reading its own evidence and calling it verified is the failure the whole
 * two-lane structure exists to prevent. So every row carries
 * independentVerificationPending: true, and the row names the exact files a
 * verifier must read and the exact fifteen obligations to measure route-scoped.
 * That is the difference between evidence prepared and evidence accepted.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const flag = (n) => { const i = ARGS.indexOf(n); return i < 0 ? null : ARGS[i + 1]; };
const RECEIPTS = flag("--receipts");
const DIR = "data/rcap-grade-a/route-artifact-acceptance";
const OUT = `${DIR}/ROUTE_ARTIFACT_ACCEPTANCE.json`;

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } };
const read = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const determinism = read(`${DIR}/ROUTE_ARTIFACT_DETERMINISM.json`);
const completeness = read(`${DIR}/ROUTE_ARTIFACT_COMPLETENESS.json`);
const queue = read(`${DIR}/ROUTE_ARTIFACT_RASTER_QUEUE.json`);
if (!determinism || !completeness || !queue) {
  console.error("REFUSED: the determinism, completeness and raster-queue records must all exist; an acceptance row assembled from a missing measurement would report absence as silence");
  process.exit(1);
}

/* Receipts, copied into the repository so a reader is never sent to a
 * directory outside it. The PNG pages themselves are NOT copied: they are the
 * bulk of a raster run and this container has no room for them, which is a fact
 * the row states rather than hides. */
const receipts = new Map();
if (RECEIPTS && fs.existsSync(RECEIPTS)) {
  fs.mkdirSync(path.join(ROOT, DIR, "raster-receipts"), { recursive: true });
  for (const f of fs.readdirSync(RECEIPTS).filter((x) => x.endsWith(".verdict.json"))) {
    const v = JSON.parse(fs.readFileSync(path.join(RECEIPTS, f), "utf8"));
    const rel = `${DIR}/raster-receipts/${f}`;
    fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(v, null, 2)}\n`);
    receipts.set(v.familyId, { verdict: v, file: rel });
  }
}

const FIFTEEN = [
  "ROUTE IDENTITY: the artifact is built for the route the record names — routeKey on the routeArtifacts row, against the family's own componentRoutes",
  "SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes — source-receipt.json",
  "COMPONENT SET: every component the ROUTE names is present in THIS artifact, and no component of another route is",
  "KNOWN PREFILLS: every known required fact is written and readable from this artifact's own bytes, on the page it belongs to",
  "REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file",
  "ROUTE OPTIONS: every route-determined election is selected",
  "REPEATING ROWS: no row carries written cells beside required cells left blank",
  "PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink",
  "ARTIFACTS: the route artifact's canonical and boundary bytes hash to what reports/rendered-artifacts.json names",
  "PAGE ORDER: the rendered page order matches the route artifact's own pageManifest",
  "CLIPPING AND OVERLAP: no ink outside a measured write box",
  "FILING DESTINATION: the instructions name the court or agency the route names",
  "FEE AND WAIVER: the fee and any waiver route are stated",
  "SERVICE: who must be served, and how",
  "SELF-HELP STOP: the packet states where self-help ends"
];

const rows = [];
for (const c of completeness.results) {
  const det = determinism.artifacts.find((a) => a.file === c.file) ?? null;
  const qrow = queue.rows.find((r) => r.route === c.route && r.packetFamilyId === c.familyId) ?? null;
  const receipt = qrow ? receipts.get(qrow.familyId) ?? null : null;
  const measured = receipt?.verdict?.measurements?.filter((m) => m.document === `${c.route}--${c.fixture}.pdf`) ?? [];
  const abs = path.join(ROOT, c.file);
  const onDisk = fs.existsSync(abs) ? sha256(abs) : null;

  rows.push({
    familyId: c.familyId,
    routeKey: c.routeKey, route: c.route, fixture: c.fixture,
    file: c.file,
    sha256: onDisk,
    byteLength: c.bytes.byteLengthObserved,
    pageCount: c.bytes.pageCountParsed,
    unitOfDelivery: "route_artifact",
    inFirstCohort: qrow?.inFirstCohort ?? false,

    deterministicRebuild: det
      ? {
        result: det.classification,
        committedSha256: det.committedSha256,
        rebuild1Sha256: det.rebuild1Sha256,
        rebuild2Sha256: det.rebuild2Sha256,
        byteIdenticalAcrossTwoFromScratchRebuilds: det.deterministic,
        matchesWhatIsCommitted: det.matchesCommitted,
        evidence: `${DIR}/ROUTE_ARTIFACT_DETERMINISM.json`
      }
      : { result: "NOT_MEASURED", evidence: null },

    routeScopedCompleteness: {
      result: c.result,
      counters: c.counters,
      allNineZero: Object.values(c.counters).every((n) => n === 0),
      componentsDeclaredForThisRoute: c.componentSet.declaredByTheFamilyForThisRoute,
      componentsCarriedByThisArtifact: c.componentSet.carriedByTheArtifact,
      foreignComponentsCarried: c.componentSet.foreignToThisRoute,
      valuesReadBackFromTheseBytes: `${c.readBackFromTheseBytes.valuesReadBack}/${c.readBackFromTheseBytes.valuesBoundToThisRoute}`,
      evidence: `${DIR}/ROUTE_ARTIFACT_COMPLETENESS.json`,
      measuredAgainst: "the route's own components, taken from the family's componentRoutes — not the family's component set"
    },

    rasterAcceptance: receipt
      ? {
        state: receipt.verdict.verdict,
        boundToSha256: qrow.documents.find((d) => d.role === c.fixture)?.sha256 ?? null,
        boundToTheseBytes: (qrow.documents.find((d) => d.role === c.fixture)?.sha256 ?? null) === onDisk,
        pagesMeasured: measured.length,
        everyPageNonblank: measured.length > 0 && measured.every((m) => m.nonblank),
        everyPageCroppedToThePage: measured.length > 0 && measured.every((m) => m.croppedToThePage),
        worstCalibrationResidualPx: measured.length > 0 ? Math.max(...measured.map((m) => m.calibrationResidualPx)) : null,
        problems: receipt.verdict.problems ?? [],
        requestedScale: receipt.verdict.requestedScale,
        browserExecutable: receipt.verdict.browserExecutable,
        receipt: receipt.file,
        doesNotInheritTheFamilyReceipt: "the RASTER_PASS on rcap-ks-custom-pleading and rcap-tn-custom-pleading in data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json binds to the family assembly's SHA-256, which is not this file's; it is not read as covering this artifact",
        renderedWhere: "in the build container, by scripts/rcap-raster-batch.mjs against this lane's own manifest, after scripts/rcap-raster-canary.mjs returned CANARY_PASSED and RCAP_RASTER_NEGATIVE_CONTROLS_HELD in the same container",
        pngPagesRetained: false,
        whyPngPagesAreNotCommitted: "the rendered pages are tens of megabytes per family and this container is at capacity; the per-page measurements are in the receipt, and a verifier who wants the images re-renders from the pinned SHA-256, which is the point of pinning it"
      }
      : { state: "RASTER_PENDING", why: "this artifact was not enrolled in a completed raster run by this lane", receipt: null },

    independentVerification: {
      pending: true,
      whyThisLaneMayNotClose: "this lane produced these artifacts and then measured them. A builder reading its own evidence is not independent verification of it, whatever the evidence says.",
      verdictVocabulary: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"],
      measureTheseFifteenRouteScoped: FIFTEEN,
      readThese: [
        c.file,
        `${c.directory}/reports/rendered-artifacts.json — the routeArtifacts row for ${c.routeKey} / ${c.fixture}`,
        `${c.directory}/production-field-map.json — componentRoutes, and the maps entries for this route's components only`,
        `${c.directory}/reports/actual-writes.json — the ${c.fixture} fixture's actualWrites, filtered to this route's documents`,
        `${c.directory}/participant-instructions.md — the required-before-filing disclosures and this route's which-pages-are-yours table`,
        `${c.directory}/source-receipt.json`,
        `${DIR}/ROUTE_ARTIFACT_DETERMINISM.json`,
        `${DIR}/ROUTE_ARTIFACT_COMPLETENESS.json`,
        `${DIR}/ROUTE_ARTIFACT_RASTER_QUEUE.json`,
        receipt?.file ?? `${DIR}/raster-receipts/ — no receipt exists for this artifact`
      ],
      recomputeRatherThanRead: [
        "SHA-256 of the artifact on disk, against the routeArtifacts row and against the raster receipt's pin — three numbers that must be one number",
        "the page count, from a parser rather than a byte scan",
        "the nine counters, over this route's field-map rows, computed rather than read from ROUTE_ARTIFACT_COMPLETENESS.json",
        "the two from-scratch rebuilds, rather than reading ROUTE_ARTIFACT_DETERMINISM.json's classification"
      ]
    },

    grantsNothing: "Acceptance evidence only. This opens no commercial route, promotes no build status, and creates no fulfillment authority."
  });
}

const cohort = rows.filter((r) => r.inFirstCohort);
const doc = {
  schemaVersion: "rcap-route-artifact-acceptance/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-route-artifact-acceptance.mjs",
  atCommit: git(["rev-parse", "HEAD"]),
  whatThisIs: "Per-artifact acceptance evidence for the route-scoped packets: deterministic rebuild, current hash, route-scoped component completeness, and raster acceptance bound to the artifact's own bytes.",
  whatRemainsOpen: "Independent verification, on every row. This lane built these artifacts and may not verify them.",
  whyTheBuilderFlagsWereNotFlipped: "Each routeArtifacts row in reports/rendered-artifacts.json still reads rasterPending: true and independentVerificationPending: true. Those are written unconditionally by the builder, so editing them by hand would make the artifacts stop reproducing — and reproducing is the property this very record establishes. The raster state and the verification state live here instead, keyed to the artifact's SHA-256, and this record is what supersedes the builder's flag. A reader who needs the current state reads this file, not the build report.",
  familyAssembliesUnchanged: (determinism.artifacts ?? []).filter((a) => a.unit === "family_assembly")
    .map((a) => ({ file: a.file, committedSha256: a.committedSha256, rebuildSha256: a.rebuild1Sha256, unchanged: a.matchesCommitted && a.deterministic })),
  counts: {
    routeArtifacts: rows.length,
    inFirstCohort: cohort.length,
    deterministicRebuildReproduces: rows.filter((r) => r.deterministicRebuild.result === "REPRODUCES").length,
    routeCompletenessPass: rows.filter((r) => r.routeScopedCompleteness.result === "ROUTE_PASS_COMPLETE").length,
    rasterPass: rows.filter((r) => r.rasterAcceptance.state === "RASTER_PASS").length,
    rasterStillPending: rows.filter((r) => r.rasterAcceptance.state !== "RASTER_PASS").length,
    independentVerificationPending: rows.filter((r) => r.independentVerification.pending).length
  },
  packetContentChanged: false, packetPdfsModified: 0,
  commercialRoutesOpened: 0, productionTouched: false,
  captainQueuesWritten: [],
  whatTheCaptainWouldHaveToIngest: {
    file: "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json",
    change: "thirteen route rows carrying their own pinned hashes, or a note that route artifacts are rastered through the lane-local manifest at data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json",
    notWrittenByThisLane: "MASTER_QUEUE.json and RASTER_QUEUE.json are the Captain's; the evidence is prepared here and the queues are left alone"
  },
  rows
};

fs.mkdirSync(path.join(ROOT, DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${OUT}: ${doc.counts.routeArtifacts} artifact(s) — ${doc.counts.deterministicRebuildReproduces} reproduce, ${doc.counts.routeCompletenessPass} route-complete, ${doc.counts.rasterPass} RASTER_PASS, ${doc.counts.rasterStillPending} raster still pending, ${doc.counts.independentVerificationPending} awaiting independent verification`);
