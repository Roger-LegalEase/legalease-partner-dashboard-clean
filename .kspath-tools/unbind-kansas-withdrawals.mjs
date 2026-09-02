/*
 * A withdrawal that still binds bytes has not withdrawn anything.
 *
 * FIX03 removed the four Kansas acceptance rows and wrote a withdrawal in place
 * of each. Every withdrawal then carried the removed row's hash back under the
 * key `boundToSha256`, and CENTRAL_RASTER_RUN carried its `documentsPinned`
 * array through untouched with a plain `sha256` on each entry. Read by eye or
 * by grep, those are live bindings: a reader lands on a Kansas entry in an
 * acceptance record that names a SHA-256, and nothing in the key tells them the
 * bytes are gone. Six such hashes stood across the four files.
 *
 * This rewrites them as history. `boundToSha256` becomes `priorSha256`,
 * `boundToPageCount` becomes `priorPageCount`, and CENTRAL_RASTER_RUN's pinned
 * documents become `documentsThisRunRendered` with `priorSha256` on each. Every
 * withdrawal states in its own body that these are historical values recording
 * what the withdrawn row said, not a binding to bytes anyone can produce.
 *
 * The values themselves are kept. Deleting them would leave a reader unable to
 * tell which claim was withdrawn, and a withdrawal nobody can audit is its own
 * kind of missing record. Nothing here re-establishes any withdrawn claim.
 *
 * Tennessee is not read or written. Only the Kansas withdrawal blocks change.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const DIR = "data/rcap-grade-a/route-artifact-acceptance";
const BUILD = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading";
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const HISTORY_NOTE =
  "Every SHA-256 and page count under a `prior...` key in this withdrawal is a historical value, recording what the " +
  "withdrawn row asserted. It is not a binding. Those bytes are not on disk and no build in this repository produces " +
  "them. Nothing may be re-derived from them, and a reader who finds one here has found the record of a retracted " +
  "claim, not a claim. The keys were renamed from `boundToSha256` and `boundToPageCount` because a key that reads as a " +
  "binding is a binding to everyone who greps for one.";

const WITHDRAWAL_IS =
  "A withdrawal removes a claim. It does not make a new one, and it leaves no binding of its own standing. Nothing here " +
  "says the current Kansas artifacts are deterministic, complete, or rastered to acceptance; it says only that the rows " +
  "which used to say so were about bytes that no longer exist. The current bytes are named below so an independent lane " +
  "can measure them without hunting, and naming them asserts nothing about them.";

const CURRENT_BYTES_NOTE =
  "The six artifacts on disk, hashed at withdrawal. This is a pointer for whoever measures them next. It is not an " +
  "acceptance, a completeness result, a determinism result, or a raster verdict, and no count in this file counts it.";

/* Recomputed from disk rather than copied, so a stale build record cannot smuggle a wrong hash into a withdrawal. */
const built = JSON.parse(fs.readFileSync(`${BUILD}/reports/rendered-artifacts.json`, "utf8"));
const currentBytes = [
  ...built.artifacts.map((a) => ({ unit: "family_assembly", route: null, fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
  ...built.routeArtifacts.map((a) => ({ unit: "route_artifact", route: a.route, routeKey: a.routeKey, routeLabel: a.routeLabel, fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount }))
];
for (const b of currentBytes) {
  const observed = sha(b.file);
  if (observed !== b.sha256) throw new Error(`${b.file}: on disk ${observed}, build record ${b.sha256}`);
}

const RECEIPTS = {
  familyAssembly: `${DIR}/raster-receipts/rcap-ks-custom-pleading.verdict.json`,
  "ks-12-4516-municipal": `${DIR}/raster-receipts/rcap-ks-custom-pleading__route__ks-12-4516-municipal.verdict.json`,
  "ks-12-4516a-municipal-arrest": `${DIR}/raster-receipts/rcap-ks-custom-pleading__route__ks-12-4516a-municipal-arrest.verdict.json`
};
const receiptSummary = Object.fromEntries(Object.entries(RECEIPTS).map(([k, f]) => {
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  return [k, { file: f, verdict: r.verdict, pagesMeasured: r.pagesMeasured, boundTo: Object.fromEntries(Object.entries(r.hashesBound).map(([role, v]) => [role, v.pinned])) }];
}));

/* Rename in place, preserving key order, so a reviewer diffs values and not a reshuffle. */
const RENAME = { boundToSha256: "priorSha256", boundToPageCount: "priorPageCount", sha256: "priorSha256", pageCount: "priorPageCount" };
const rekey = (obj, keys) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [keys.includes(k) ? RENAME[k] : k, v]));

const amend = (w, extra = {}) => {
  w.laneContinuedBy = "KSPATH2, the same repair grant on rcap-ks-custom-pleading, still unreleased in claim-ledger.json. FIX03 wrote the withdrawal; this amendment removes the bindings the withdrawal itself left standing.";
  w.whatAWithdrawalIs = WITHDRAWAL_IS;
  w.theseAreHistoryNotBindings = HISTORY_NOTE;
  w.currentBytesOnDisk = currentBytes;
  w.currentBytesAssertNothing = CURRENT_BYTES_NOTE;
  delete w.currentBytes;
  Object.assign(w, extra);
  return w;
};

const save = (name, doc) => fs.writeFileSync(`${DIR}/${name}`, `${JSON.stringify(doc, null, 2)}\n`);
const summary = {};

/* ---- ROUTE_ARTIFACT_ACCEPTANCE.json ---------------------------------------- */
{
  const n = "ROUTE_ARTIFACT_ACCEPTANCE.json";
  const j = JSON.parse(fs.readFileSync(`${DIR}/${n}`, "utf8"));
  j.withdrawnRows = j.withdrawnRows.map((w) => {
    w.rowsWithdrawn = w.rowsWithdrawn.map((r) => rekey(r, ["boundToSha256", "boundToPageCount"]));
    w.familyAssemblyRowsWithdrawn = w.familyAssemblyRowsWithdrawn.map((r) => rekey(r, ["boundToSha256"]));
    return amend(w, {
      whatAnIndependentLaneWouldHaveToDoToRestoreThem: [
        "re-measure route-scoped completeness over the current bytes",
        "re-measure determinism by deleting the overlay directory and rebuilding twice",
        "read the raster receipts named in rasterReceiptsForTheCurrentBytes, or render again and confirm they reproduce",
        "if a central-runner receipt is required, dispatch the central raster workflow; this lane cannot and did not"
      ],
      rasterReceiptsForTheCurrentBytes: receiptSummary,
      whatTheReceiptsDoNotDo: "They were produced by the lane that made the change, in this container, off the central runner. They are a measurement an independent lane can reproduce or dispute. They are not this lane accepting its own repair, and no row in this file has been reinstated on their strength."
    });
  });
  save(n, j);
  summary[n] = { withdrawals: j.withdrawnRows.length, rowsStillWithdrawn: j.withdrawnRows[0].rowsWithdrawn.length, kansasRowsInRows: j.rows.filter((r) => r.familyId === "rcap-ks-custom-pleading").length };
}

/* ---- ROUTE_ARTIFACT_COMPLETENESS.json -------------------------------------- */
{
  const n = "ROUTE_ARTIFACT_COMPLETENESS.json";
  const j = JSON.parse(fs.readFileSync(`${DIR}/${n}`, "utf8"));
  j.withdrawnResults = j.withdrawnResults.map((w) => {
    w.resultsWithdrawn = w.resultsWithdrawn.map((r) => rekey(r, ["boundToSha256"]));
    return amend(w, {
      note: `The builder's own completeness counters over the current bytes are in ${BUILD}/reports/completeness-counters.json. That is the builder counting itself. It is not this measurement and is not a substitute for it.`
    });
  });
  save(n, j);
  summary[n] = { withdrawals: j.withdrawnResults.length, resultsStillWithdrawn: j.withdrawnResults[0].resultsWithdrawn.length, kansasInResults: j.results.filter((r) => r.familyId === "rcap-ks-custom-pleading").length };
}

/* ---- ROUTE_ARTIFACT_DETERMINISM.json --------------------------------------- */
{
  const n = "ROUTE_ARTIFACT_DETERMINISM.json";
  const j = JSON.parse(fs.readFileSync(`${DIR}/${n}`, "utf8"));
  j.withdrawnArtifacts = j.withdrawnArtifacts.map((w) => {
    w.artifactsWithdrawn = w.artifactsWithdrawn.map((a) => rekey(a, ["boundToSha256"]));
    return amend(w, {
      whatThisLaneMeasuredInstead:
        `The overlay directory ${BUILD} was deleted outright and the builder run from scratch twice with --no-raster, ` +
        "the flag the committed build used (build-status.json records rasterPages 0). All 16 emitted files were byte-identical " +
        "between the two runs, and both runs reproduced the 16 committed files exactly. product-wiring.json is the seventeenth " +
        "committed file and is not emitted by the builder; it was restored from git and is unchanged. " +
        "This is the lane measuring its own change, so it is reported and deliberately NOT written into this file as a result."
    });
  });
  save(n, j);
  summary[n] = { withdrawals: j.withdrawnArtifacts.length, artifactsStillWithdrawn: j.withdrawnArtifacts[0].artifactsWithdrawn.length, kansasInArtifacts: j.artifacts.filter((a) => a.familyId === "rcap-ks-custom-pleading").length };
}

/* ---- CENTRAL_RASTER_RUN.json ----------------------------------------------- */
{
  const n = "CENTRAL_RASTER_RUN.json";
  const j = JSON.parse(fs.readFileSync(`${DIR}/${n}`, "utf8"));
  j.withdrawnRoutes = j.withdrawnRoutes.map((w) => {
    w.routesWithdrawn = w.routesWithdrawn.map((r) => {
      const { documentsPinned, ...rest } = r;
      return { ...rest, documentsThisRunRendered: documentsPinned.map((d) => rekey(d, ["sha256", "pageCount"])) };
    });
    return amend(w, {
      thisLaneCannotReplaceThem:
        "A central receipt comes from the GitHub-hosted workflow. This lane does not dispatch workflows and did not touch " +
        ".github/workflows, so run 33640297318's Kansas coverage is withdrawn and nothing replaces it. No central run has " +
        "rendered the current Kansas bytes. What does exist is a local receipt for each of the six current artifacts, " +
        "rendered in this container against those exact hashes and listed in rasterReceiptsForTheCurrentBytes. A local " +
        "receipt is not a central one and does not restore a withdrawn central route.",
      rasterReceiptsForTheCurrentBytes: receiptSummary
    });
  });
  save(n, j);
  summary[n] = { withdrawals: j.withdrawnRoutes.length, routesStillWithdrawn: j.withdrawnRoutes[0].routesWithdrawn.length, kansasInRoutes: j.routes.filter((r) => r.packetFamilyId === "rcap-ks-custom-pleading").length };
}

console.log(JSON.stringify(summary, null, 2));
