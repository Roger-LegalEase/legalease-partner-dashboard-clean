#!/usr/bin/env node
// Assembles the recurring route-maintenance review packet from records that
// already exist. It is a reader: it changes no state, edits no registry,
// places no hold, and decides nothing — it puts what the repository and the
// monitor already know in front of the person running the review.
//
// Run by .github/workflows/rcap-maintenance-review.yml (cron weekly +
// workflow_dispatch). Scopes:
//   weekly     — open source-change reviews, active holds, defect counts
//   monthly    — weekly + the unfinished-route ledger from the launch graph
//   quarterly  — monthly + a per-jurisdiction rollup
//   auto       — resolved by date: first seven days of Jan/Apr/Jul/Oct ->
//                quarterly; first seven days of any other month -> monthly;
//                otherwise weekly. This is how one weekly cron serves all
//                three cadences.
//
//   node scripts/rcap-maintenance-review.mjs --scope weekly [--out <dir>]
//
// Sources, each read tolerantly (absence is reported, never fatal):
//   - open GitHub issues labeled source-change-review (needs GITHUB_TOKEN;
//     without one, the latest monitor report in the --monitor-dir directory
//     is used, and if neither exists that is said in the packet);
//   - data/rcap-ledger/launch-graph.json           (unfinished routes)
//   - data/rcap-grade-a/maintenance/route-holds.json (active/released holds)
//   - data/rcap-grade-a/stale-artifact-block.json    (defects)
//   - data/rcap-all50/problematic-pdf-register.json  (defects)
//   - data/rcap-verifier-dispositions.json           (defects)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const OUT_DIR = path.resolve(rootDir, arg("--out", "maintenance-review"));
const MONITOR_DIR = path.resolve(rootDir, arg("--monitor-dir", "source-monitor"));
const TODAY = new Date().toISOString().slice(0, 10);
const ISSUE_LABEL = "source-change-review";

function resolveScope(requested) {
  if (["weekly", "monthly", "quarterly"].includes(requested)) return requested;
  const now = new Date();
  if (now.getUTCDate() <= 7) return [0, 3, 6, 9].includes(now.getUTCMonth()) ? "quarterly" : "monthly";
  return "weekly";
}
const SCOPE = resolveScope(arg("--scope", process.env.RCAP_REVIEW_SCOPE ?? "auto"));

const notes = [];
function readJsonOr(rel, why) {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); }
  catch { notes.push(`${rel} not readable — ${why} not included this run`); return null; }
}

// ---- 1. open source-change reviews ------------------------------------------
async function openSourceChangeReviews() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (token && repo) {
    const api = process.env.GITHUB_API_URL || "https://api.github.com";
    const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "rcap-maintenance-review" };
    const issues = [];
    for (let page = 1; page <= 10; page += 1) {
      const res = await fetch(`${api}/repos/${repo}/issues?labels=${ISSUE_LABEL}&state=open&per_page=100&page=${page}`, { headers });
      if (!res.ok) { notes.push(`issue listing answered HTTP ${res.status}; falling back to the last monitor report`); break; }
      const rows = await res.json();
      for (const i of rows) issues.push({ number: i.number, title: i.title, url: i.html_url, openedAt: i.created_at });
      if (rows.length < 100) return { basis: "open GitHub issues", issues };
    }
    if (issues.length) return { basis: "open GitHub issues (possibly truncated)", issues };
  } else {
    notes.push("no GITHUB_TOKEN/GITHUB_REPOSITORY; using the last monitor report instead of the issue list");
  }
  // Fallback: latest committed-or-downloaded monitor report, if one is around.
  try {
    const reports = fs.readdirSync(MONITOR_DIR).filter((f) => /^source-monitor-report-.*\.json$/.test(f)).sort();
    if (reports.length) {
      const report = JSON.parse(fs.readFileSync(path.join(MONITOR_DIR, reports.at(-1)), "utf8"));
      const flagged = (report.results ?? []).filter((r) => ["changed_hash", "changed_landing_page", "vanished_or_unreachable"].includes(r.outcome));
      return { basis: `last monitor report ${reports.at(-1)}`, issues: flagged.map((r) => ({ sourceId: r.sourceId, outcome: r.outcome, url: r.url, routesUsing: r.routesUsing })) };
    }
  } catch { /* fall through */ }
  return { basis: "unavailable — no token and no monitor report in reach; run the nightly monitor or pass a token", issues: [] };
}

// ---- 2. unfinished routes from the launch graph ------------------------------
function unfinishedRoutes() {
  const graph = readJsonOr("data/rcap-ledger/launch-graph.json", "route progress");
  if (!graph) return null;
  const rows = graph.rows ?? [];
  const unfinished = rows.filter((r) => !r.operationallySellable);
  const gateCounts = {};
  for (const r of unfinished) for (const g of r.unmetOperationalGates ?? []) gateCounts[g] = (gateCounts[g] ?? 0) + 1;
  // "High priority" = closest to done: fewest unmet gates first.
  const closest = [...unfinished]
    .sort((a, b) => (a.unmetOperationalGates?.length ?? 99) - (b.unmetOperationalGates?.length ?? 99))
    .slice(0, 25)
    .map((r) => ({ routeId: r.pathwayKey, unmetOperationalGates: r.unmetOperationalGates ?? [], pdfHold: Boolean(r.pdfStatus?.hold) }));
  const perJurisdiction = {};
  for (const r of rows) {
    const j = r.jurisdiction ?? "??";
    perJurisdiction[j] ??= { routes: 0, sellable: 0 };
    perJurisdiction[j].routes += 1;
    if (r.operationallySellable) perJurisdiction[j].sellable += 1;
  }
  return {
    totalRoutes: rows.length,
    operationallySellable: rows.length - unfinished.length,
    unfinished: unfinished.length,
    unmetGateCounts: gateCounts,
    closestToDone: closest,
    perJurisdiction
  };
}

// ---- 3. holds and defects ----------------------------------------------------
function holds() {
  const doc = readJsonOr("data/rcap-grade-a/maintenance/route-holds.json", "route holds");
  if (!doc) return null;
  const rows = doc.holds ?? [];
  return {
    total: rows.length,
    active: rows.filter((h) => h.releasedAt == null).map((h) => ({ routeId: h.routeId, holdType: h.holdType, placedAt: h.placedAt, reason: h.reason })),
    releasedLast90Days: rows.filter((h) => h.releasedAt && Date.parse(h.releasedAt) > Date.now() - 90 * 86400e3).length
  };
}

function defects() {
  const out = {};
  const stale = readJsonOr("data/rcap-grade-a/stale-artifact-block.json", "stale-artifact block");
  if (stale) out.staleArtifactBlock = { reason: stale.reason ?? null, blockedArtifacts: stale.blockedArtifacts ?? null, uniqueFamilies: stale.uniqueFamilies ?? null };
  const pdfReg = readJsonOr("data/rcap-all50/problematic-pdf-register.json", "problematic-PDF register");
  if (pdfReg) out.problematicPdfRegister = { totals: pdfReg.totals ?? null, rootCauses: (pdfReg.rootCauseIndex ?? []).map((r) => r.rootCauseId) };
  const dispositions = readJsonOr("data/rcap-verifier-dispositions.json", "verifier dispositions");
  if (dispositions) out.verifierDispositions = dispositions.counts ?? null;
  return out;
}

// ---- assemble ----------------------------------------------------------------
const sourceReviews = await openSourceChangeReviews();
const routeProgress = unfinishedRoutes();
const holdState = holds();
const defectState = defects();

const packet = {
  schemaVersion: "rcap-maintenance-review-packet/v1",
  generatedBy: "scripts/rcap-maintenance-review.mjs",
  date: TODAY,
  scope: SCOPE,
  whatThisIs: "The assembled review packet for the recurring route-maintenance review. It reads existing records and changes nothing.",
  whatThisDoesNot: ["change any state", "close or open holds", "approve or invalidate sources", "commit anything"],
  notes,
  openSourceChangeReviews: sourceReviews,
  activeRouteHolds: holdState,
  defects: defectState,
  ...(SCOPE !== "weekly" ? {
    routeProgress: routeProgress && {
      totalRoutes: routeProgress.totalRoutes,
      operationallySellable: routeProgress.operationallySellable,
      unfinished: routeProgress.unfinished,
      unmetGateCounts: routeProgress.unmetGateCounts,
      closestToDone: routeProgress.closestToDone
    }
  } : {
    routeProgress: routeProgress && {
      totalRoutes: routeProgress.totalRoutes,
      operationallySellable: routeProgress.operationallySellable,
      unfinished: routeProgress.unfinished
    }
  }),
  ...(SCOPE === "quarterly" && routeProgress ? { perJurisdiction: routeProgress.perJurisdiction } : {}),
  standingQuestionsForTheReview: [
    "Which open source-change reviews are material, and which exact routeIds do they affect?",
    "Should any affected route receive a MAINTENANCE_HOLD in data/rcap-grade-a/maintenance/route-holds.json?",
    "Which released holds still lack their reacceptance follow-through?",
    "Which closest-to-done routes are worth finishing this cycle?"
  ],
  responseProcedure: "docs/rcap/EVERGREEN_ROUTE_MAINTENANCE.md"
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `${SCOPE}-review-${TODAY}.json`);
fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`);

const md = [
  `## RCAP ${SCOPE} maintenance review — ${TODAY}`,
  "",
  `- Open source-change reviews: **${sourceReviews.issues.length}** (${sourceReviews.basis})`,
  holdState ? `- Active route holds: **${holdState.active.length}** (${holdState.total} total rows)` : "- Route-holds record unreadable",
  routeProgress ? `- Routes: ${routeProgress.operationallySellable}/${routeProgress.totalRoutes} operationally sellable, ${routeProgress.unfinished} unfinished` : "- Launch graph unreadable",
  Object.keys(defectState).length ? `- Defect records read: ${Object.keys(defectState).join(", ")}` : "- No defect records readable",
  notes.length ? `- Notes: ${notes.join("; ")}` : "",
  "",
  `Packet: run artifact (\`${path.basename(outPath)}\`). This packet reads records and changes nothing.`,
  ""
].filter(Boolean).join("\n");
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
console.log(md);
console.log(`packet written to ${outPath}`);
