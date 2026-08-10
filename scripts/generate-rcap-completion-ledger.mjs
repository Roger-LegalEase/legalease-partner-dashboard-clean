// Canonical writer for the RCAP completion ledger (build plan section 6.1 / v7 S3).
//
// One writer emits all three artifacts so they cannot drift:
//   1. versioned JSON
//   2. internal HTML command board
//   3. version-to-version diff
//
// AUTHORITY
// The denominator and every per-track fact come from the production factory's
// own status computation, `scripts/rcap-factory-status.mjs --json`, which lives
// on the integration branch and not on main. This writer does not re-derive
// completion from raw inputs: an independent derivation competing with the
// factory is how two different completion numbers end up in circulation. The
// factory computes, this writer records.
//
// The factory script is executed inside a git worktree at a pinned ref, so no
// authoritative artifact is copied into this branch and the exact commit is
// recorded on every run.
//
// This writer promotes nothing, enables nothing, and asserts no legal
// conclusion. Fields it cannot prove from the factory record are emitted false
// or null, never as an optimistic default.
//
// Usage:
//   node scripts/generate-rcap-completion-ledger.mjs
//   node scripts/generate-rcap-completion-ledger.mjs --ref <git-ref>
//   node scripts/generate-rcap-completion-ledger.mjs --status-json <path>
//   node scripts/generate-rcap-completion-ledger.mjs --check

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "data/rcap-ledger");

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const checkOnly = argv.includes("--check");
const AUTHORITY_REF = flag("--ref") || "origin/feat/record-clearing-production-integration";
const STATUS_JSON = flag("--status-json");
const FACTORY_STATUS_SCRIPT = "scripts/rcap-factory-status.mjs";
const TRACK_DENOMINATOR = 497;

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    ...opts
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${(res.stderr || "").trim().slice(0, 800)}`);
  }
  return res.stdout;
}

// --- obtain the authoritative factory status -------------------------------

let statusRaw;
let authorityCommit = null;
let worktreeDir = null;

if (STATUS_JSON) {
  statusRaw = fs.readFileSync(STATUS_JSON, "utf8");
} else {
  authorityCommit = run("git", ["rev-parse", AUTHORITY_REF], { cwd: rootDir }).trim();
  worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-ledger-authority-"));
  try {
    run("git", ["worktree", "add", "--detach", worktreeDir, authorityCommit], { cwd: rootDir });
    statusRaw = run("node", [FACTORY_STATUS_SCRIPT, "--json"], { cwd: worktreeDir });
  } finally {
    // Always release the worktree, including on failure, so a crashed run does
    // not leave a stale checkout wired into .git/worktrees.
    try {
      run("git", ["worktree", "remove", "--force", worktreeDir], { cwd: rootDir });
    } catch {
      fs.rmSync(worktreeDir, { recursive: true, force: true });
      spawnSync("git", ["worktree", "prune"], { cwd: rootDir });
    }
  }
}

const status = JSON.parse(statusRaw);
const statusSha256 = crypto.createHash("sha256").update(statusRaw).digest("hex");

if (!Array.isArray(status.tracks)) throw new Error("factory status has no tracks array");
if (status.tracks.length !== TRACK_DENOMINATOR) {
  throw new Error(
    `factory status reports ${status.tracks.length} tracks; nationwide denominator is ${TRACK_DENOMINATOR}`
  );
}

// --- root-blocker stage ------------------------------------------------------

// The certification chain in dependency order. The first unmet stage is the
// root blocker; every later unmet stage is its symptom, never a second blocker.
const STAGE_CHAIN = [
  { key: "normalized", stage: "legal_design_normalization", owner: "legal_design" },
  { key: "authorityCleared", stage: "authority_clearance", owner: "source_acquisition" },
  { key: "sourcePinned", stage: "source_pinning", owner: "source_materialization" },
  { key: "implementationComplete", stage: "implementation", owner: "implementation_lane" },
  { key: "technicalProofPassed", stage: "technical_proof", owner: "implementation_lane" },
  { key: "visualProofPassed", stage: "visual_proof", owner: "independent_review" },
  { key: "legalRecommendationComplete", stage: "legal_recommendation", owner: "legal_design" },
  { key: "counselAdopted", stage: "counsel_adoption", owner: "counsel" },
  { key: "stagingPassed", stage: "staging_acceptance", owner: "captain" },
  { key: "productionEnabled", stage: "runtime_enablement", owner: "captain" }
];

const NEXT_JOB_BY_STAGE = {
  legal_design_normalization: "normalize-legal-design-track",
  authority_clearance: "acquire-and-clear-official-authority",
  source_pinning: "pin-source-to-immutable-revision",
  implementation: "implement-track-components",
  technical_proof: "generate-and-pass-technical-proof",
  visual_proof: "run-independent-visual-review",
  legal_recommendation: "complete-legal-recommendation",
  counsel_adoption: "record-adoption-disposition",
  staging_acceptance: "run-production-shaped-staging",
  runtime_enablement: "queue-route-enablement-authorization"
};

function rootStageFor(track) {
  for (const step of STAGE_CHAIN) {
    if (track[step.key] !== true) return step;
  }
  return null;
}

// --- build rows --------------------------------------------------------------

const rows = status.tracks.map((track) => {
  const root = rootStageFor(track);
  // Experience level per v7: 1 is a certified packet route publicly servable,
  // 2 is a fully built terminal treatment, 3 is everything else.
  const experienceLevel = track.productionEnabled ? 1 : track.finalDisposition ? 2 : 3;

  return {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    strategyFamily: track.strategyFamily ?? null,
    implementationQueue: track.implementationQueue ?? null,
    terminalTrackDisposition: track.finalDisposition === true ? "final_disposition" : null,
    experienceLevel,
    legalDesignStatus: track.legalDesignStatus ?? null,
    legalDesignTerminal: track.normalized === true,
    sourceLifecycleTerminal: track.sourcePinned === true && track.authorityPinned === true,
    authorityCleared: track.authorityCleared === true,
    implementationTerminal: track.implementationComplete === true,
    technicalReviewTerminal: track.technicalProofPassed === true,
    packetProofCurrent: track.visualProofPassed === true,
    releaseTreatmentTerminal: track.legalRecommendationComplete === true,
    legalAdoptionTerminal: track.counselAdopted === true,
    stagingAcceptanceTerminal: track.stagingPassed === true,
    runtimeDecision: track.productionEnabled === true ? "live" : "runtime_disabled",
    rootBlockerStage: root ? root.stage : null,
    rootBlockerOwner: root ? root.owner : null,
    rootBlocker: root ? track.exactBlocker ?? `${root.stage} not met` : null,
    rootBlockerDueAt: null,
    nextExecutableJob: root ? NEXT_JOB_BY_STAGE[root.stage] : null,
    transitionReasonCode: root ? root.stage : "final_disposition"
  };
});

// --- aggregates ---------------------------------------------------------------

const count = (pred) => rows.filter(pred).length;
const stageCounts = {};
for (const row of rows) {
  if (!row.rootBlockerStage) continue;
  stageCounts[row.rootBlockerStage] = (stageCounts[row.rootBlockerStage] || 0) + 1;
}
const topFiveRootBlockers = Object.entries(stageCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([stage, tracks]) => ({
    stage,
    tracks,
    owner: STAGE_CHAIN.find((s) => s.stage === stage)?.owner ?? null
  }));

const byJurisdiction = {};
for (const row of rows) {
  const j = (byJurisdiction[row.jurisdiction] ||= {
    tracks: 0,
    finalDisposition: 0,
    level3: 0,
    implementationComplete: 0
  });
  j.tracks += 1;
  if (row.terminalTrackDisposition) j.finalDisposition += 1;
  if (row.experienceLevel === 3) j.level3 += 1;
  if (row.implementationTerminal) j.implementationComplete += 1;
}

const t = status.totals || {};
const aggregates = {
  // Mirrored straight from the factory so the two can never disagree.
  tracksTerminal: t.finalDisposition ?? count((r) => r.terminalTrackDisposition),
  trackDenominator: TRACK_DENOMINATOR,
  normalized: t.normalized ?? null,
  authorityCleared: t.authorityCleared ?? null,
  authorityBlocked: t.authorityBlocked ?? null,
  sourcePinned: t.sourcePinned ?? null,
  implementationCompleteFamilies: t.implementationComplete ?? null,
  technicalApprovedFamilies: t.technicalProofPassed ?? null,
  visualProofPassed: t.visualProofPassed ?? null,
  adoptionDispositionsRecorded: t.counselAdopted ?? null,
  legalRecommendationComplete: t.legalRecommendationComplete ?? null,
  stagingAcceptedRoutes: t.stagingPassed ?? 0,
  packetReadyRoutes: t.packetReady ?? 0,
  publiclyLiveRoutes: t.productionEnabled ?? 0,
  level3TracksRemaining: count((r) => r.experienceLevel === 3),
  unknownTrackDispositions: count((r) => r.terminalTrackDisposition === null),
  unownedBlockers: count((r) => r.rootBlockerStage && !r.rootBlockerOwner),
  jobsRemainingToFullBuild: count((r) => r.nextExecutableJob),
  launchGate: t.launchGate ?? "red",
  completionPercent: t.completionPercent ?? 0,
  topFiveRootBlockers
};

// --- emit ----------------------------------------------------------------------

const previousPath = path.join(outDir, "completion-ledger.json");
const previous = fs.existsSync(previousPath)
  ? JSON.parse(fs.readFileSync(previousPath, "utf8"))
  : null;

const body = {
  schemaVersion: "rcap-completion-ledger/v2",
  generatedBy: "scripts/generate-rcap-completion-ledger.mjs",
  authority: {
    ref: AUTHORITY_REF,
    commit: authorityCommit,
    computedBy: `${FACTORY_STATUS_SCRIPT} --json`,
    statusSha256,
    authorityEdition: status.authorityEdition ?? null,
    authorityVersion: status.authorityVersion ?? null,
    definitionOfComplete: status.definitionOfComplete ?? null,
    note:
      "Completion is computed by the production factory on the integration branch and recorded here. This writer does not re-derive it."
  },
  posture: {
    runtimeStatus: "runtime_disabled",
    launchGate: aggregates.launchGate,
    productionEnabled: false,
    note: "Status record only. Promotes nothing, enables nothing."
  },
  aggregates,
  byJurisdiction,
  tracks: rows
};

const contentHash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
const ledgerVersion =
  previous && previous.contentHash === contentHash
    ? previous.ledgerVersion
    : (previous?.ledgerVersion || 0) + 1;
const ledger = { ledgerVersion, contentHash, ...body };

if (checkOnly) {
  if (!previous) {
    console.error("No committed ledger to check against.");
    process.exit(1);
  }
  if (previous.contentHash !== contentHash) {
    console.error("Ledger drift: regenerate with npm run rcap:ledger.");
    process.exit(1);
  }
  console.log(`Ledger current at version ${ledgerVersion}. No drift.`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(previousPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const jurisdictionRows = Object.entries(byJurisdiction)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([code, j]) =>
      `<tr><td>${esc(code)}</td><td class="n">${j.finalDisposition} / ${j.tracks}</td><td class="n">${j.implementationComplete}</td><td class="n">${j.level3}</td></tr>`
  )
  .join("\n");

const blockerRows = topFiveRootBlockers
  .map((b) => `<tr><td>${esc(b.stage)}</td><td class="n">${b.tracks}</td><td>${esc(b.owner)}</td></tr>`)
  .join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RCAP Completion Ledger v${ledgerVersion}</title>
<style>
  :root { color-scheme: light dark; --fg:#111; --bg:#fff; --mut:#666; --line:#ddd; --bad:#b00020; }
  @media (prefers-color-scheme: dark) { :root { --fg:#eee; --bg:#111; --mut:#aaa; --line:#333; --bad:#ff6b6b; } }
  body { margin:0; padding:2rem; font:14px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--fg); background:var(--bg); }
  h1 { font-size:1.4rem; margin:0 0 .25rem; } h2 { font-size:1rem; margin:2rem 0 .5rem; }
  .sub { color:var(--mut); margin-bottom:1.5rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.75rem; }
  .card { border:1px solid var(--line); border-radius:8px; padding:.75rem 1rem; }
  .card .k { color:var(--mut); font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; }
  .card .v { font-size:1.5rem; font-variant-numeric:tabular-nums; }
  .red { color:var(--bad); }
  table { border-collapse:collapse; width:100%; }
  th,td { text-align:left; padding:.4rem .6rem; border-bottom:1px solid var(--line); }
  th { font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); }
  td.n { text-align:right; font-variant-numeric:tabular-nums; }
  .wrap { overflow-x:auto; }
  code { background:color-mix(in srgb, var(--fg) 8%, transparent); padding:.1em .35em; border-radius:3px; }
</style></head><body>
<h1>RCAP Completion Ledger</h1>
<div class="sub">Version ${ledgerVersion} &middot; authority <code>${esc(AUTHORITY_REF)}</code> @ <code>${esc((authorityCommit || "").slice(0, 10))}</code> &middot; edition ${esc(status.authorityEdition)} &middot; launch gate <strong class="red">${esc(aggregates.launchGate)}</strong></div>

<div class="grid">
  <div class="card"><div class="k">Tracks terminal</div><div class="v red">${aggregates.tracksTerminal} / ${TRACK_DENOMINATOR}</div></div>
  <div class="card"><div class="k">Level 3 remaining</div><div class="v red">${aggregates.level3TracksRemaining}</div></div>
  <div class="card"><div class="k">Implementation complete</div><div class="v">${aggregates.implementationCompleteFamilies}</div></div>
  <div class="card"><div class="k">Technical proof passed</div><div class="v">${aggregates.technicalApprovedFamilies}</div></div>
  <div class="card"><div class="k">Visual proof passed</div><div class="v">${aggregates.visualProofPassed}</div></div>
  <div class="card"><div class="k">Counsel adopted</div><div class="v">${aggregates.adoptionDispositionsRecorded}</div></div>
  <div class="card"><div class="k">Source pinned</div><div class="v">${aggregates.sourcePinned}</div></div>
  <div class="card"><div class="k">Packet ready</div><div class="v">${aggregates.packetReadyRoutes}</div></div>
</div>

<h2>Top root blockers</h2>
<div class="wrap"><table>
<thead><tr><th>Stage</th><th class="n">Tracks</th><th>Owner</th></tr></thead>
<tbody>${blockerRows}</tbody></table></div>

<h2>By jurisdiction</h2>
<div class="wrap"><table>
<thead><tr><th>Code</th><th class="n">Terminal / tracks</th><th class="n">Impl complete</th><th class="n">Level 3</th></tr></thead>
<tbody>${jurisdictionRows}</tbody></table></div>

<p class="sub">Computed by <code>${esc(FACTORY_STATUS_SCRIPT)}</code> on the integration branch; recorded by <code>scripts/generate-rcap-completion-ledger.mjs</code>. Status only.</p>
</body></html>
`;
fs.writeFileSync(path.join(outDir, "completion-ledger.html"), html, "utf8");

const diff = [];
diff.push(`# Completion Ledger Diff — v${previous?.ledgerVersion ?? "none"} to v${ledgerVersion}`);
diff.push("");
if (!previous) {
  diff.push("First generation on the factory-authoritative schema.");
} else if (previous.contentHash === contentHash) {
  diff.push("No change.");
} else {
  const keys = [
    "tracksTerminal",
    "level3TracksRemaining",
    "implementationCompleteFamilies",
    "technicalApprovedFamilies",
    "visualProofPassed",
    "adoptionDispositionsRecorded",
    "sourcePinned",
    "packetReadyRoutes"
  ];
  const lines = keys
    .map((k) => {
      const before = previous.aggregates?.[k];
      const after = aggregates[k];
      return before === after ? null : `- ${k}: ${before} → ${after}`;
    })
    .filter(Boolean);
  diff.push(lines.length ? lines.join("\n") : "Aggregates unchanged; per-track detail moved.");
}
diff.push("");
fs.writeFileSync(path.join(outDir, "completion-ledger-diff.md"), `${diff.join("\n")}\n`, "utf8");

console.log(`ledgerVersion                  ${ledgerVersion}`);
console.log(`authorityRef                   ${AUTHORITY_REF} @ ${(authorityCommit || "supplied").slice(0, 10)}`);
console.log(`authorityEdition               ${status.authorityEdition}`);
console.log(`tracksTerminal                 ${aggregates.tracksTerminal} / ${TRACK_DENOMINATOR}`);
console.log(`level3TracksRemaining          ${aggregates.level3TracksRemaining}`);
console.log(`implementationCompleteFamilies ${aggregates.implementationCompleteFamilies}`);
console.log(`technicalApprovedFamilies      ${aggregates.technicalApprovedFamilies}`);
console.log(`visualProofPassed              ${aggregates.visualProofPassed}`);
console.log(`adoptionDispositionsRecorded   ${aggregates.adoptionDispositionsRecorded}`);
console.log(`sourcePinned                   ${aggregates.sourcePinned}`);
console.log(`packetReadyRoutes              ${aggregates.packetReadyRoutes}`);
console.log(`launchGate                     ${aggregates.launchGate}`);
console.log("topFiveRootBlockers");
for (const b of topFiveRootBlockers) {
  console.log(`  ${String(b.tracks).padStart(4)}  ${b.stage}  (${b.owner})`);
}
console.log("written: data/rcap-ledger/{completion-ledger.json,completion-ledger.html,completion-ledger-diff.md}");
