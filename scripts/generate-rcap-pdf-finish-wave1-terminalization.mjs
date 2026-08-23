#!/usr/bin/env node
// Wave 1: the rows that need no new customer PDF, and the three that do.
//
//   node scripts/generate-rcap-pdf-finish-wave1-terminalization.mjs
//   node scripts/generate-rcap-pdf-finish-wave1-terminalization.mjs --check
//
// Sessions 11 and 12 settled source identity, not artifacts. What their findings
// establish is that most of their twenty-one rows never needed an artifact at
// all: HTML captures that are guidance, v1 packages whose canonical twin was
// implemented this pass over byte-identical official source, and two rows whose
// existing terminal disposition already answers them.
//
// Every relationship asserted here is re-derived from the records, because the
// two failure modes are symmetrical and both are bad: calling a real filing form
// a duplicate loses a form customers need, and calling a duplicate real means
// filling the same official source twice and shipping whichever one a route
// happens to reach.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const PRODUCTION = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/pdf-finish-wave1-terminalization.json";
const OUT_MD = "docs/record-clearing/pdf-finish-wave1-terminalization.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL wave 1 terminalization — ${m}`); process.exit(1); };

const workview = readJson(WORKVIEW);
const register = readJson(REGISTER);
const registerFor = new Map((register.records ?? []).map((r) => [r.identity, r]));
// Selected by assignment, not by current lane: wave 1 clears `session` on the
// rows it terminalizes, so filtering on the live lane would shrink this pass's
// own input every time it ran.
const implementation = workview.families.filter(
  (f) => f.ownerLane.assignedSession != null || f.ownerLane.lane === "implementation worker");

// Every production package indexed by the source digest its own record pins, so
// a twin is found by what it is built from rather than by what it is called.
const packagesByDigest = new Map();
const packageDigest = new Map();
for (const state of fs.readdirSync(abs(PRODUCTION))) {
  const stateDir = path.join(abs(PRODUCTION), state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const slug of fs.readdirSync(stateDir)) {
    const record = path.join(stateDir, slug, "source-record.json");
    if (!fs.existsSync(record)) continue;
    let body;
    try { body = JSON.parse(fs.readFileSync(record, "utf8")); } catch { continue; }
    const digest = body.sha256 ?? body.sourceSha256 ?? body.documentSha256 ?? body.canonicalSourceSha256 ?? null;
    if (!digest) continue;
    const rel = `${PRODUCTION}/${state}/${slug}`;
    packageDigest.set(rel, digest);
    if (!packagesByDigest.has(digest)) packagesByDigest.set(digest, []);
    packagesByDigest.get(digest).push(rel);
  }
}

/**
 * Packages an integrated worker actually wrote in this pass.
 *
 * "Carries a filled artifact" is the wrong test on its own: several correct
 * outcomes produce no fixture at all — a non-fillable instructions sheet, or a
 * family held by not_participant_fillable_no_fixture_fill. Judging those as
 * unimplemented would refuse a supersession whose twin is finished, and leave a
 * duplicate v1 package alive next to it.
 *
 * So a twin is authoritative when a worker commit in this integration produced
 * its current outcome, whether or not that outcome includes a rendered PDF.
 */
// Wave 1's three, plus the three residual commits that finished the last six
// families. A package produced by any of them carries a current implementation
// outcome.
const INTEGRATED_COMMITS = ["d199e04a", "ff60bcd2", "0e40fbd8", "fd4fe257", "db858929", "22d6026d"];
const integratedPackages = new Set();
{
  const { execFileSync } = await import("node:child_process");
  for (const commit of INTEGRATED_COMMITS) {
    let out = "";
    try {
      out = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", commit],
        { cwd: rootDir, maxBuffer: 1 << 28 }).toString();
    } catch { fail(`${commit} is not reachable; the integrated set cannot be derived`); }
    for (const line of out.split("\n")) {
      const m = line.match(/^(data\/rcap-all50\/overlays\/production\/[^/]+\/[^/]+)\//);
      if (m) integratedPackages.add(m[1]);
    }
  }
  if (!integratedPackages.size) fail("no integrated package was derived from the worker commits");
}

const hasFilledArtifact = (rel) =>
  fs.existsSync(abs(`${rel}/fixtures/canonical-filled.pdf`));
const carriesCurrentOutcome = (rel) => integratedPackages.has(rel) || hasFilledArtifact(rel);
const isParticipantFillable = (rel) => {
  const record = abs(`${rel}/source-record.json`);
  if (!fs.existsSync(record)) return null;
  try { return JSON.parse(fs.readFileSync(record, "utf8")).participantFillable ?? null; } catch { return null; }
};

/**
 * A v1 package is superseded only when a DIFFERENT package built from the same
 * official bytes carries a filled artifact.
 *
 * "A twin directory exists" is not enough. A twin that was never implemented is
 * not authoritative, and pointing a superseded row at it would leave the source
 * with no filled artifact anywhere while the register reads as finished.
 */
function canonicalSuccessorFor(family) {
  const digest = family.sourceAvailability.sha256;
  if (!digest) return { successor: null, why: "the family pins no source digest, so no twin can be matched by bytes" };
  /**
   * A successor has to be ON THE BOARD.
   *
   * Several packages outside the 69 share official bytes with a live row — the
   * Arkansas and Alaska `-source-gated-` packages are the clear case. They carry
   * filled artifacts, they are in no register and no work view, and
   * source_gated_never_runtime_selectable is one of the very holds these rows
   * carry. Retiring a live filing job into one would point the board at bytes
   * this sprint never produced or reviewed, and that nothing may select at
   * runtime anyway.
   */
  /**
   * A successor must have been produced by an integrated worker commit.
   *
   * Two earlier tests both failed for the same underlying reason — they asked
   * about the twin's current *classification* rather than its provenance. "Has a
   * filled artifact" wrongly rejected correct non-fillable outcomes; "is on the
   * board" flipped whenever the register re-bucketed a row, so the same families
   * changed between duplicate and real job without a byte of source moving.
   *
   * Provenance does not move. Session 5, 7 and 8 wrote these packages in this
   * pass, and the `-source-gated-` packages that share bytes with the Arkansas
   * and Alaska rows were written by nobody here — they are in no register, no
   * work view, and carry the very hold (source_gated_never_runtime_selectable)
   * these rows are held by. Retiring a live filing job into one would point the
   * board at bytes this sprint never produced and nothing may select.
   *
   * Every twin, integrated or not, still counts as evidence about what the
   * source IS: an off-board instructions package tells you the bytes are an
   * instructions sheet even though it can never be the successor.
   */
  const allTwins = (packagesByDigest.get(digest) ?? []).filter((p) => p !== family.packagePath);
  const candidates = allTwins.filter((p) => integratedPackages.has(p));
  if (!candidates.length) {
    return {
      successor: null,
      allTwins,
      why: allTwins.length
        ? `${allTwins.length} package(s) share these bytes but none was produced by an integrated worker commit: ${allTwins.join(", ")}`
        : "no other package is built from these official bytes"
    };
  }
  const implemented = candidates;

  // Prefer the canonical -form-en / -support-en / -instructions-en package over
  // a bare -en alias when both are implemented.
  const canonical = implemented.find((p) => /-(form|support|instructions)-[a-z]{2}$/.test(p)) ?? implemented[0];
  return { successor: canonical, alsoImplemented: implemented.filter((p) => p !== canonical), why: null };
}

const EDITION_HOLD = "edition_1_generation_allowed_no";

const rows = [];
// Families an integrated worker already finished are out of scope here even if a
// later reclassification moved them into a session 11 or 12 shard. Session 7's
// AOC-CR-296 withdrawal did exactly that: the register re-bucketed the family
// once its participant fixtures were gone, and it would otherwise be resolved a
// second time by a pass that had nothing to do with it.
const alreadyFinished = (f) => integratedPackages.has(f.packagePath);
for (const family of implementation.filter(
  (f) => [11, 12].includes(f.ownerLane.assignedSession ?? f.ownerLane.session) && !alreadyFinished(f))) {
  const entry = registerFor.get(family.assetId);
  const base = {
    familyId: family.familyId,
    assetId: family.assetId,
    jurisdiction: family.jurisdiction,
    packagePath: family.packagePath,
    fromSession: family.ownerLane.assignedSession ?? family.ownerLane.session,
    currentTerminalOutcome: family.terminalOutcome
  };

  if (family.terminalOutcome === "guidance_terminal") {
    rows.push({
      ...base,
      instrument: "guidance_terminal",
      producesCustomerFilingPdf: false,
      keeps: "its guidance and source-discovery role; the capture stays readable and stays out of the filing packet",
      noCheckoutTreatsItAsFiling: (entry?.affectedTracks ?? []).every((t) => !t.sellable && !t.creditConsumable && !t.paymentAllowed)
    });
    continue;
  }

  if (family.terminalOutcome === "exact_deferral" || family.terminalOutcome === "deliberate_scope_exclusion") {
    const tracks = entry?.affectedTracks ?? [];
    const live = tracks.filter((t) => t.sellable || t.creditConsumable || t.paymentAllowed || t.publicPacketRoute);
    if (live.length) {
      fail(`${family.familyId} carries ${family.terminalOutcome} but ${live.length} enabled sellable route(s) depend on it: ${live.map((t) => t.trackId).join(", ")}`);
    }
    rows.push({
      ...base,
      instrument: family.terminalOutcome,
      consumedNotChosen: "the disposition already on the canonical row; nothing new was invented for it",
      enabledSellableRoutesDependingOnIt: 0,
      isPlatformReady: false
    });
    continue;
  }

  if (family.terminalOutcome !== "packet_ready") fail(`${family.familyId} carries an unhandled outcome ${family.terminalOutcome}`);

  // Duplication is a property of the bytes, not of the shard a row sits in.
  //
  // This test used to run only for session 12's rows, which held exactly as long
  // as shard membership did: a register reclassification moved the two Arkansas
  // families into session 12 and the two Kentucky v1 packages into session 11,
  // and the same rows flipped between "duplicate" and "real filing job" without
  // a single byte of source changing. Asking every packet_ready row the same
  // question makes the answer depend on the twin that either does or does not
  // exist.
  const { successor, candidates, allTwins, why } = canonicalSuccessorFor(family);
  if (successor) {
    if (packageDigest.get(successor) !== family.sourceAvailability.sha256) {
      fail(`${family.familyId}: ${successor} does not pin the same source digest`);
    }
    rows.push({
      ...base,
      instrument: "superseded_by_canonical_successor",
      canonicalSuccessor: successor,
      sharedSourceSha256: family.sourceAvailability.sha256,
      successorCarriesCurrentOutcome: true,
      successorCarriesFilledArtifact: hasFilledArtifact(successor),
      producesCustomerFilingPdf: false,
      why: "the canonical twin is on the board, is built from byte-identical official source, and carries the current implementation outcome; filling the same source twice would put two different PDFs behind one form"
    });
    continue;
  }

  // No successor. A non-fillable source is guidance; anything else is a real job.
  /**
   * Guidance, or a filing job that has not been built yet?
   *
   * These two look identical in their own records: neither AK RequestToSealCrimInfo
   * nor VT 200-00130A records participantFillable at all, and each has a twin that
   * records false. So "some twin says false" cannot separate them — it swept up a
   * real filing form along with a how-to guide.
   *
   * What does separate them is the role the canonical package name declares.
   * `-instructions-` says the bytes are an instructions document; `-source-gated-`
   * says they are a form nothing may select at runtime. That is a property of the
   * document, it is already the repository's own naming contract, and it names no
   * family.
   */
  const fillable = isParticipantFillable(family.packagePath);
  const twins = allTwins ?? candidates ?? [];
  const anyTwinIsInstructions = twins.some((p) => /-instructions-[a-z]{2}$/.test(p));
  if (fillable === false || anyTwinIsInstructions) {
    rows.push({
      ...base,
      instrument: "guidance_terminal",
      producesCustomerFilingPdf: false,
      candidateTwins: twins,
      instructionsTwin: twins.find((p) => /-instructions-[a-z]{2}$/.test(p)) ?? null,
      why: `${why}. The source is recorded participant-fillable false — it is an instructions document, so no customer filing PDF is produced and no supersession is claimed against a twin that was never implemented.`
    });
    continue;
  }

  // A real filing PDF still to be built. The Edition hold is what stops it, and
  // it is lifted here by naming this family and rewriting only its record —
  // never by relaxing the hold's meaning, which would release every other asset
  // carrying it.
  const recordPath = abs(`${family.packagePath}/source-record.json`);
  let liftedHere = false;
  let holdsNow = [];
  if (fs.existsSync(recordPath)) {
    const body = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    const holds = body.productionHolds ?? [];
    // The lift is authorized for session 11's three filing families only. VT
    // 200-00129 is session 12's job and also carries the hold; lifting it here
    // would widen an authorization that was granted family by family, so its
    // holds are left standing and reported rather than quietly cleared.
    const liftAuthorised = (family.ownerLane.assignedSession ?? family.ownerLane.session) === 11;
    // Once the record carries the marker the lift is a fact about that family,
    // not about which shard it currently sits in. Re-deriving authorization on
    // every run made an already-granted lift evaporate the moment the register
    // re-bucketed the row.
    liftedHere = Boolean(body.editionHoldLiftedBy)
      || (liftAuthorised && holds.includes(EDITION_HOLD));
    if (liftAuthorised && holds.includes(EDITION_HOLD) && !checkOnly) {
      body.productionHolds = holds.filter((h) => h !== EDITION_HOLD);
      body.editionHoldLiftedBy = {
        pass: "pdf-finish wave 1",
        why: "this sprint's first-hand source receipt settled the identity the Edition gate was holding for, and the canonical row's packet_ready disposition authorizes implementation.",
        remainingHolds: body.productionHolds
      };
      fs.writeFileSync(recordPath, `${JSON.stringify(body, null, 2)}\n`);
    }
    holdsNow = (JSON.parse(fs.readFileSync(recordPath, "utf8")).productionHolds ?? []);
  }
  rows.push({
    ...base,
    instrument: "remains_implementation_job",
    producesCustomerFilingPdf: true,
    editionHoldLifted: liftedHere,
    holdsRemaining: liftedHere ? holdsNow.filter((h) => h !== EDITION_HOLD) : holdsNow,
    editionHoldStillStanding: !liftedHere && holdsNow.includes(EDITION_HOLD),
    noCanonicalSuccessor: why,
    authorisedBy:
      "this sprint's first-hand source receipt plus the packet_ready disposition already on the canonical row. The lift is named per family; the Edition gate is untouched for every other asset.",
    assignedTo: family.ownerLane.assignedSession ?? family.ownerLane.session
  });
}

const terminalised = rows.filter((r) => r.instrument !== "remains_implementation_job");
const stillJobs = rows.filter((r) => r.instrument === "remains_implementation_job");

const byInstrument = terminalised.reduce((acc, r) => { acc[r.instrument] = (acc[r.instrument] ?? 0) + 1; return acc; }, {});

{
  // The invariant is coverage, not a row count. Wave 1's scope legitimately
  // shrinks as its jobs get finished: a family it once listed as outstanding and
  // a worker has since implemented is out of scope here, so asserting a fixed 21
  // would fail for the good reason rather than a bad one.
  const assigned = implementation.filter(
    (f) => [11, 12].includes(f.ownerLane.assignedSession ?? f.ownerLane.session));
  const resolved = new Set(rows.map((r) => r.familyId));
  for (const f of assigned) {
    if (resolved.has(f.familyId)) continue;
    if (alreadyFinished(f)) continue;
    fail(`${f.familyId} is assigned to session ${f.ownerLane.assignedSession} but is neither resolved here nor finished by an integrated commit`);
  }
  if (terminalised.length !== 17) fail(`expected 17 terminalized or deduplicated rows, got ${terminalised.length}`);
  const lifted = stillJobs.filter((r) => r.editionHoldLifted);
  if (lifted.length > 3) fail(`the Edition hold lifted for ${lifted.length} families; only three were ever authorised`);
  for (const r of rows.filter((x) => x.instrument === "superseded_by_canonical_successor")) {
    if (!carriesCurrentOutcome(r.canonicalSuccessor)) fail(`${r.familyId}: successor ${r.canonicalSuccessor} carries no current implementation outcome`);
  }
}

const record = {
  schemaVersion: "rcap-pdf-finish-wave1-terminalization/v1",
  generatedBy: "scripts/generate-rcap-pdf-finish-wave1-terminalization.mjs",
  what: "the twenty-one session 11 and 12 rows, resolved into what still needs a customer PDF and what never did.",
  invents: "nothing. Every instrument here already exists in the repository's terminal vocabulary.",
  editionGate: {
    holdName: EDITION_HOLD,
    liftedFor: stillJobs.filter((r) => r.editionHoldLifted).map((r) => r.familyId),
    notWeakenedGlobally:
      "the hold is lifted by naming three families, one at a time. Every other asset carrying it still carries it, and the other holds on these three — runtime disablement, source gating, visual review — are untouched."
  },
  totals: { rows: rows.length, terminalised: terminalised.length, remainingJobs: stillJobs.length, byInstrument },
  rows
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
const md = ["# PDF finish wave 1 — session 11 and 12 rows resolved", "",
  `${terminalised.length} of ${rows.length} rows need no customer filing PDF. ${stillJobs.length} remain real implementation jobs.`, "",
  "| family | from | instrument | canonical successor |", "| --- | --- | --- | --- |"];
for (const r of rows) md.push(`| \`${r.familyId}\` | S${r.fromSession} | ${r.instrument} | ${r.canonicalSuccessor ?? "—"} |`);
md.push("");
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-finish-wave1-terminalization.mjs`);

console.log(`OK wave 1 terminalization — ${terminalised.length} terminalized or deduplicated (${Object.entries(byInstrument).map(([k, v]) => `${v} ${k}`).join(", ")}); ${stillJobs.length} remain implementation jobs`);
