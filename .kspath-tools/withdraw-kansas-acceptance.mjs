/*
 * Withdraw every Kansas row from the four route-artifact ACCEPTANCE records.
 *
 * WHY WITHDRAWAL AND NOT A REWRITE.
 *
 * All four bind Kansas by exact SHA-256, and every Kansas hash in them is a
 * pre-repair hash: they describe the artifacts as they were before the builder
 * was re-pointed at the current census route keys, and before the printed route
 * line became the human label. Those bytes do not exist any more. An acceptance
 * record naming bytes nobody can produce is worse than no record, because it
 * reads as coverage.
 *
 * They are not rewritten to the current hashes because this lane made the
 * change. A determinism measurement, a completeness measurement and a raster
 * acceptance over artifacts this lane just produced are this lane verifying its
 * own repair, which it may not do. The current hashes are recorded inside each
 * withdrawal so an independent lane can re-measure without hunting for them, and
 * that is all a withdrawal claims.
 *
 * Tennessee is untouched. Every non-Kansas row is copied through unchanged.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const DIR = "data/rcap-grade-a/route-artifact-acceptance";
const FAMILY = "rcap-ks-custom-pleading";
const BUILD = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading";
const built = JSON.parse(fs.readFileSync(`${BUILD}/reports/rendered-artifacts.json`, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const isKS = (v) => JSON.stringify(v ?? "").includes(FAMILY);

const currentBytes = [
  ...built.artifacts.map((a) => ({ unit: "family_assembly", route: null, fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
  ...built.routeArtifacts.map((a) => ({ unit: "route_artifact", route: a.route, routeKey: a.routeKey, routeLabel: a.routeLabel, fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount }))
];
for (const b of currentBytes) {
  const observed = sha(b.file);
  if (observed !== b.sha256) throw new Error(`${b.file}: on disk ${observed}, build record ${b.sha256}`);
}

const WHY = "Every Kansas hash in this record is a pre-repair hash. The builder was re-pointed from the two superseded track-only obligation keys to the current five-segment track-pathway keys, and the packet page then printed the 108- and 105-character machine key, hard-wrapped mid-token across three lines. Roger Roman decided on 2026-09-02 that the Kansas packet page prints a short human label and the machine id stays in the manifests and the wiring. Both changes moved every artifact's bytes. The bytes this record binds no longer exist.";
const WHAT_A_WITHDRAWAL_IS = "A withdrawal removes a claim. It does not make a new one. Nothing here says the current Kansas artifacts are deterministic, complete or rastered to acceptance; it says only that the rows which used to say so were about different bytes, and names the current bytes so an independent lane can measure them.";
const WHO = { lane: "FIX03", branch: "fable/kspath", withdrawnAt: "2026-09-02", selfVerified: false, mayNotVerifyItsOwnRepair: true };

const withdrawal = (extra) => ({ family: FAMILY, ...WHO, why: WHY, whatAWithdrawalIs: WHAT_A_WITHDRAWAL_IS, currentBytes, ...extra });
const save = (name, doc) => fs.writeFileSync(`${DIR}/${name}`, `${JSON.stringify(doc, null, 2)}\n`);
const summary = {};

/* ---- ROUTE_ARTIFACT_ACCEPTANCE.json ---------------------------------------- */
{
  const j = JSON.parse(fs.readFileSync(`${DIR}/ROUTE_ARTIFACT_ACCEPTANCE.json`, "utf8"));
  const gone = j.rows.filter((r) => r.familyId === FAMILY);
  j.rows = j.rows.filter((r) => r.familyId !== FAMILY);
  const goneAssemblies = (j.familyAssembliesUnchanged ?? []).filter(isKS);
  j.familyAssembliesUnchanged = (j.familyAssembliesUnchanged ?? []).filter((a) => !isKS(a));
  j.counts = {
    routeArtifacts: j.rows.length,
    inFirstCohort: j.rows.filter((r) => r.inFirstCohort).length,
    deterministicRebuildReproduces: j.rows.filter((r) => r.deterministicRebuild?.result === "REPRODUCES").length,
    routeCompletenessPass: j.rows.filter((r) => r.routeScopedCompleteness?.result === "ROUTE_PASS_COMPLETE").length,
    routeCompletenessWithdrawn: gone.length,
    rasterPass: j.rows.filter((r) => r.rasterAcceptance?.state === "RASTER_PASS").length,
    rasterStillPending: j.rows.filter((r) => r.rasterAcceptance?.state !== "RASTER_PASS").length,
    independentVerificationPending: j.rows.length,
    kansasRowsWithdrawn: gone.length
  };
  j.withdrawnRows = [withdrawal({
    rowsWithdrawn: gone.map((r) => ({
      route: r.route, fixture: r.fixture, file: r.file,
      boundToSha256: r.sha256, boundToPageCount: r.pageCount,
      routeKeyItNamed: r.routeKey,
      claimsWithdrawn: {
        deterministicRebuild: r.deterministicRebuild?.result ?? null,
        routeScopedCompleteness: r.routeScopedCompleteness?.result ?? null,
        rasterAcceptance: r.rasterAcceptance?.state ?? null,
        centralRunWorkflowRunId: r.rasterAcceptance?.centralRun?.workflowRunId ?? null
      }
    })),
    familyAssemblyRowsWithdrawn: goneAssemblies.map((a) => ({ file: a.file, boundToSha256: a.committedSha256 })),
    alsoWrongInEveryWithdrawnRow: "the routeKey each row named is one of the two superseded track-only keys, which occur zero times in the committed route-obligation census.",
    whatAnIndependentLaneWouldHaveToDoToRestoreThem: [
      "re-measure route-scoped completeness over the current bytes",
      "re-measure determinism by deleting the overlay directory and rebuilding twice",
      "obtain a raster receipt bound to each current SHA-256",
      "if a central-runner receipt is required, dispatch the central raster workflow; this lane cannot and did not"
    ]
  })];
  save("ROUTE_ARTIFACT_ACCEPTANCE.json", j);
  summary.acceptance = { rowsWithdrawn: gone.length, familyAssemblyRowsWithdrawn: goneAssemblies.length, rowsRemaining: j.rows.length };
}

/* ---- ROUTE_ARTIFACT_COMPLETENESS.json -------------------------------------- */
{
  const j = JSON.parse(fs.readFileSync(`${DIR}/ROUTE_ARTIFACT_COMPLETENESS.json`, "utf8"));
  const gone = j.results.filter((r) => r.familyId === FAMILY);
  j.results = j.results.filter((r) => r.familyId !== FAMILY);
  j.routeArtifactsMeasured = j.results.length;
  j.byResult = j.results.reduce((acc, r) => { acc[r.result] = (acc[r.result] ?? 0) + 1; return acc; }, {});
  j.allPass = j.results.every((r) => r.result === "ROUTE_PASS_COMPLETE");
  j.withdrawnResults = [withdrawal({
    resultsWithdrawn: gone.map((r) => ({ route: r.route, fixture: r.fixture, file: r.file, result: r.result, boundToSha256: r.bytes?.sha256Recorded ?? null, routeKeyItNamed: r.routeKey })),
    note: "The builder's own completeness counters over the current bytes are in " + BUILD + "/reports/completeness-counters.json. That is the builder counting itself and is not this measurement."
  })];
  save("ROUTE_ARTIFACT_COMPLETENESS.json", j);
  summary.completeness = { withdrawn: gone.length, remaining: j.results.length, allPass: j.allPass };
}

/* ---- ROUTE_ARTIFACT_DETERMINISM.json --------------------------------------- */
{
  const j = JSON.parse(fs.readFileSync(`${DIR}/ROUTE_ARTIFACT_DETERMINISM.json`, "utf8"));
  const gone = j.artifacts.filter((a) => a.familyId === FAMILY);
  j.artifacts = j.artifacts.filter((a) => a.familyId !== FAMILY);
  j.families = j.families.filter((f) => f.familyId !== FAMILY);
  j.counts = {
    artifacts: j.artifacts.length,
    routeArtifacts: j.artifacts.filter((a) => a.unit === "route_artifact").length,
    familyAssemblies: j.artifacts.filter((a) => a.unit === "family_assembly").length,
    reproduces: j.artifacts.filter((a) => a.classification === "REPRODUCES").length,
    nondeterministic: j.artifacts.filter((a) => a.deterministic === false).length,
    divergesFromCommitted: j.artifacts.filter((a) => a.matchesCommitted === false).length,
    kansasArtifactsWithdrawn: gone.length
  };
  j.everyArtifactReproduces = j.artifacts.every((a) => a.classification === "REPRODUCES");
  j.withdrawnArtifacts = [withdrawal({
    artifactsWithdrawn: gone.map((a) => ({ unit: a.unit, route: a.route, fixture: a.fixture, file: a.file, boundToSha256: a.committedSha256, classification: a.classification })),
    whatThisLaneMeasuredInstead: "FIX03 deleted " + BUILD + " entirely and ran the builder from scratch twice with --no-raster, and all 16 emitted files were byte-identical between the two runs. That is this lane measuring its own change, so it is reported in the repair record and is deliberately NOT written into this acceptance file."
  })];
  save("ROUTE_ARTIFACT_DETERMINISM.json", j);
  summary.determinism = { withdrawn: gone.length, remaining: j.artifacts.length, everyArtifactReproduces: j.everyArtifactReproduces };
}

/* ---- CENTRAL_RASTER_RUN.json ----------------------------------------------- */
{
  const j = JSON.parse(fs.readFileSync(`${DIR}/CENTRAL_RASTER_RUN.json`, "utf8"));
  const gone = j.routes.filter((r) => r.packetFamilyId === FAMILY);
  j.routes = j.routes.filter((r) => r.packetFamilyId !== FAMILY);
  j.routesCovered = j.routes.length;
  j.pagesCovered = j.routes.reduce((n, r) => n + (r.pagesQueued ?? 0), 0);
  j.routesWithdrawn = gone.length;
  j.jobCountsAreHistoricalFactsAboutTheRun = `Run ${j.workflowRunId} really did run ${j.jobsTotal} jobs and ${j.jobsSucceeded} really did succeed, so those numbers are left as they are. What changed is what the run still covers: ${gone.length} of its route jobs rendered Kansas bytes that no longer exist, and those routes are withdrawn below. No central run has rendered the current Kansas bytes.`;
  j.withdrawnRoutes = [withdrawal({
    routesWithdrawn: gone.map((r) => ({ route: r.route, jobId: r.jobId, routeKeyItNamed: r.routeKey, documentsPinned: r.documentsPinned, pagesQueued: r.pagesQueued })),
    thisLaneCannotReplaceThem: "A central receipt comes from the GitHub-hosted workflow. FIX03 does not dispatch workflows and did not touch .github/workflows. The current Kansas artifacts were rendered locally in this container instead, and those local receipts are recorded in " + DIR + "/raster-receipts/. A local receipt is not a central one."
  })];
  save("CENTRAL_RASTER_RUN.json", j);
  summary.centralRun = { withdrawn: gone.length, routesCovered: j.routesCovered, pagesCovered: j.pagesCovered };
}

console.log(JSON.stringify(summary, null, 2));
