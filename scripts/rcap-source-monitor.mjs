#!/usr/bin/env node
// Nightly official-source monitor: notices when a pinned official source
// changes or vanishes, and turns that observation into a review task.
//
// Run by .github/workflows/rcap-nightly-source-monitor.yml. Like the
// acquisition script it is deliberately incapable of changing the repository:
// it writes only into an output directory the workflow uploads as an artifact.
// A changed hash CREATES A REVIEW TASK; it never auto-approves,
// auto-invalidates, or touches any route state, registry, or hold record.
// The human procedure a review task starts is
// docs/rcap/EVERGREEN_ROUTE_MAINTENANCE.md.
//
// WHAT IT MONITORS
//   - every entry of data/rcap-grade-a/packet-factory-24h/
//     SOURCE_ACQUISITION_MANIFEST.json (each carries an exact official URL;
//     most carry an expected sha256);
//   - every data/rcap-grade-a/official-source-registry.json row whose
//     expectedFrom source-record resolves to an exact https URL plus an
//     expected sha256.
//
// HOST POLICY: URLs are filtered through scripts/lib/official-host-policy.mjs
// — the same single module the acquisition path uses. A URL whose host is not
// allowlisted is recorded as skipped and NEVER fetched; a redirect that leaves
// the allowlist is not followed and is reported as a change.
//
// ROUTE ATTRIBUTION: the registries owned by generators are not hand-edited to
// carry routesUsing. Instead this script DERIVES routesUsing at runtime by
// joining data/rcap-ledger/launch-graph.json (route -> packetSetIds, route ->
// named official form ids) with data/record-clearing/
// legal-design-packet-set-manifests.json (packetSetId -> component officialFormId
// / officialSourceUrl), plus the manifest entries' own obligationKeys
// (packetSetId::component). The joins live here so the source registries stay
// generator-owned.
//
// MODES
//   node scripts/rcap-source-monitor.mjs --dry-run      # no network: validate
//       config, build and print the full fetch plan, write it to the out dir.
//   node scripts/rcap-source-monitor.mjs                # fetch + report +
//       review tasks for changed/vanished sources.
//   node scripts/rcap-source-monitor.mjs --open-issues  # additionally open
//       one GitHub issue per changed source (label source-change-review,
//       deduped by title) when GITHUB_TOKEN + GITHUB_REPOSITORY are present.
//
//   --out <dir>   output directory (default source-monitor/, untracked).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { hostAllowed, exactHostPolicy } from "./lib/official-host-policy.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const OPEN_ISSUES = argv.includes("--open-issues");
const OUT_DIR = path.resolve(rootDir, argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "source-monitor");
const TODAY = new Date().toISOString().slice(0, 10);
const ISSUE_LABEL = "source-change-review";
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 45_000;

const MANIFEST_PATH = "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json";
const REGISTRY_PATH = "data/rcap-grade-a/official-source-registry.json";
const LAUNCH_GRAPH_PATH = "data/rcap-ledger/launch-graph.json";
const PACKET_SETS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const problems = [];

// ---- route attribution (derived, never stored back into a registry) ---------
function buildRouteJoin() {
  const graph = readJson(LAUNCH_GRAPH_PATH);
  const packetSetToRoutes = new Map(); // packetSetId -> Set(pathwayKey)
  const formToRoutes = new Map();      // "JX|formId" -> Set(pathwayKey)
  for (const row of graph.rows ?? []) {
    for (const ps of row.packetSets ?? []) {
      if (!packetSetToRoutes.has(ps.packetSetId)) packetSetToRoutes.set(ps.packetSetId, new Set());
      packetSetToRoutes.get(ps.packetSetId).add(row.pathwayKey);
    }
    for (const formId of row.sourceAssets?.officialFormIdsNamed ?? []) {
      const key = `${row.jurisdiction}|${String(formId).toLowerCase()}`;
      if (!formToRoutes.has(key)) formToRoutes.set(key, new Set());
      formToRoutes.get(key).add(row.pathwayKey);
    }
  }
  const urlToPacketSets = new Map();   // exact URL -> Set(packetSetId)
  const formToPacketSets = new Map();  // "JX|formId" -> Set(packetSetId)
  const setsDoc = readJson(PACKET_SETS_PATH);
  for (const set of setsDoc.packetSets ?? []) {
    for (const c of set.components ?? []) {
      if (c.officialSourceUrl) {
        if (!urlToPacketSets.has(c.officialSourceUrl)) urlToPacketSets.set(c.officialSourceUrl, new Set());
        urlToPacketSets.get(c.officialSourceUrl).add(set.packetSetId);
      }
      if (c.officialFormId) {
        const key = `${set.jurisdiction}|${String(c.officialFormId).toLowerCase()}`;
        if (!formToPacketSets.has(key)) formToPacketSets.set(key, new Set());
        formToPacketSets.get(key).add(set.packetSetId);
      }
    }
  }
  return { packetSetToRoutes, formToRoutes, urlToPacketSets, formToPacketSets };
}

function routesUsing(target, join) {
  const packetSetIds = new Set();
  for (const key of target.obligationKeys ?? []) {
    const setId = String(key).split("::")[0];
    if (setId) packetSetIds.add(setId);
  }
  for (const setId of join.urlToPacketSets.get(target.url) ?? []) packetSetIds.add(setId);
  const formKey = `${target.jurisdiction}|${String(target.formNumber ?? "").toLowerCase()}`;
  for (const setId of join.formToPacketSets.get(formKey) ?? []) packetSetIds.add(setId);

  const routes = new Set();
  for (const setId of packetSetIds) for (const r of join.packetSetToRoutes.get(setId) ?? []) routes.add(r);
  for (const r of join.formToRoutes.get(formKey) ?? []) routes.add(r);
  return {
    packetSetIds: [...packetSetIds].sort(),
    routes: [...routes].sort(),
    derivation: `joined at runtime from ${LAUNCH_GRAPH_PATH} + ${PACKET_SETS_PATH} + manifest obligationKeys; registries are generator-owned and were not edited to carry this`
  };
}

// ---- target assembly ---------------------------------------------------------
function collectTargets() {
  const targets = [];

  const manifest = readJson(MANIFEST_PATH);
  for (const e of manifest.entries ?? []) {
    if (!e.officialUrl) { problems.push(`manifest entry ${e.sourceId} has no officialUrl`); continue; }
    targets.push({
      sourceId: e.sourceId,
      jurisdiction: e.jurisdiction ?? null,
      formNumber: e.formNumber ?? null,
      officialTitle: e.officialTitle ?? null,
      url: e.officialUrl,
      urlKind: e.urlKind ?? "DIRECT_OFFICIAL_BINARY",
      expectedSha256: /^[0-9a-f]{64}$/.test(String(e.expectedSha256 ?? "").toLowerCase()) ? e.expectedSha256.toLowerCase() : null,
      obligationKeys: e.obligationKeys ?? [],
      pinnedIn: MANIFEST_PATH
    });
  }

  const registry = readJson(REGISTRY_PATH);
  for (const row of Object.values(registry.sources ?? {})) {
    if (!/^[0-9a-f]{64}$/.test(String(row.expectedSha256 ?? ""))) continue;
    if (!row.expectedFrom) continue;
    let record;
    try { record = readJson(row.expectedFrom); }
    catch { problems.push(`registry row ${row.sourceId}: expectedFrom ${row.expectedFrom} unreadable`); continue; }
    // Some source-records carry several URLs in one string, " | "-separated
    // (binary, landing page, program page). The FIRST is the pinned binary; the
    // rest are context, not fetch targets.
    const rawUrl = [record.sourceUrl, record.officialUrl, record.officialSourceUrl].find((u) => typeof u === "string" && u.startsWith("https:"));
    const url = rawUrl ? rawUrl.split(/[|\s]+/)[0] : null;
    if (!url || !url.startsWith("https:")) continue; // no exact URL pinned for this row — nothing to monitor
    targets.push({
      sourceId: row.sourceId,
      jurisdiction: record.jurisdiction ?? null,
      formNumber: record.documentId ?? row.sourceId,
      officialTitle: record.officialTitle ?? null,
      url,
      urlKind: "DIRECT_OFFICIAL_BINARY",
      expectedSha256: row.expectedSha256.toLowerCase(),
      obligationKeys: [],
      pinnedIn: `${REGISTRY_PATH} -> ${row.expectedFrom}`
    });
  }

  // Host policy gates the plan itself: a non-allowlisted URL is never fetched.
  for (const t of targets) {
    try {
      const u = new URL(t.url);
      t.host = u.hostname.toLowerCase();
      t.plannedAction = u.protocol !== "https:" ? "skip_not_https"
        : hostAllowed(t.host) ? "fetch"
          : "skip_host_not_allowlisted";
    } catch {
      t.host = null;
      t.plannedAction = "skip_invalid_url";
    }
  }
  return targets;
}

// ---- fetching ----------------------------------------------------------------
async function fetchOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "LegalEase RCAP nightly source monitor" }
    });
  } finally { clearTimeout(timer); }
}

/** Follows redirects by hand so the chain is recorded and policed hop by hop. */
async function observeUrl(url, exactHost) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response;
    try { response = await fetchOnce(current); }
    catch (error) {
      return { ok: false, failure: `request to ${current} did not complete: ${error?.message ?? error}`, redirectChain: chain };
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      try { await response.arrayBuffer(); } catch { /* drain best-effort */ }
      if (!location) return { ok: false, failure: `HTTP ${response.status} with no Location`, redirectChain: chain };
      let next;
      try { next = new URL(location, current).href; }
      catch { return { ok: false, failure: `unparseable redirect Location ${location}`, redirectChain: chain }; }
      const nextHost = new URL(next).hostname.toLowerCase();
      chain.push({ from: current, status: response.status, to: next });
      if (exactHost && nextHost !== new URL(url).hostname.toLowerCase()) {
        return { ok: false, failure: `exact-host source redirected off its own hostname to ${nextHost}; not followed`, redirectChain: chain };
      }
      if (!hostAllowed(nextHost)) {
        return { ok: false, failure: `redirected to ${nextHost}, which is not an allowlisted official host; not followed`, redirectChain: chain };
      }
      current = next;
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok && bytes.length > 0,
      failure: response.ok ? (bytes.length === 0 ? "empty response body" : null) : `HTTP ${response.status}`,
      finalUrl: current,
      httpStatus: response.status,
      contentType: response.headers.get("content-type") ?? null,
      byteLength: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      looksLikePdf: bytes.subarray(0, 5).toString("latin1") === "%PDF-",
      redirectChain: chain
    };
  }
  return { ok: false, failure: `more than ${MAX_REDIRECTS} redirects`, redirectChain: chain };
}

function classify(target, obs) {
  if (target.plannedAction !== "fetch") return target.plannedAction.startsWith("skip") ? "skipped_by_host_policy" : target.plannedAction;
  if (!obs.ok) return "vanished_or_unreachable";
  if (!target.expectedSha256) return "observed_unpinned";
  if (obs.sha256 === target.expectedSha256) return "unchanged";
  return target.urlKind === "OFFICIAL_LANDING_PAGE" ? "changed_landing_page" : "changed_hash";
}

const NEEDS_REVIEW = new Set(["changed_hash", "changed_landing_page", "vanished_or_unreachable"]);

function reviewTask(target, obs, outcome, attribution) {
  return {
    schemaVersion: "rcap-source-change-review-task/v1",
    createdBy: "scripts/rcap-source-monitor.mjs via .github/workflows/rcap-nightly-source-monitor.yml",
    date: TODAY,
    sourceId: target.sourceId,
    jurisdiction: target.jurisdiction,
    formNumber: target.formNumber,
    officialTitle: target.officialTitle,
    outcome,
    pinned: { url: target.url, urlKind: target.urlKind, expectedSha256: target.expectedSha256, pinnedIn: target.pinnedIn },
    observed: obs.ok ? {
      finalUrl: obs.finalUrl, httpStatus: obs.httpStatus, contentType: obs.contentType,
      byteLength: obs.byteLength, sha256: obs.sha256, looksLikePdf: obs.looksLikePdf, redirectChain: obs.redirectChain
    } : { failure: obs.failure, redirectChain: obs.redirectChain },
    routesUsing: attribution,
    intendedCommitPath: `data/rcap-grade-a/maintenance/review-tasks/${TODAY}-${target.sourceId}.json`,
    howThisFileGetsCommitted: "By a person, in a reviewed commit, if they decide the change is material. The workflow only uploads it as a run artifact; workflows never commit here.",
    whatThisTaskDoesNot: [
      "approve or adopt the newly observed bytes",
      "invalidate the pinned source or any acceptance record",
      "place a hold, change any route state, or edit any registry"
    ],
    responseProcedure: "docs/rcap/EVERGREEN_ROUTE_MAINTENANCE.md",
    determinationsLeftToAHuman: {
      materiality: "unmade — compare the observed document against the pinned one",
      supersession: "unmade — requires the publisher's own revision history",
      affectedRouteHolds: "unmade — hold only the exact routeIds listed in routesUsing.routes that a person confirms are affected"
    }
  };
}

// ---- issue opening (workflow runner only; deduped by title) ------------------
async function openIssues(tasks) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) { console.log("issue phase skipped — GITHUB_TOKEN / GITHUB_REPOSITORY not present"); return { opened: 0, deduped: 0, skipped: tasks.length }; }
  const api = process.env.GITHUB_API_URL || "https://api.github.com";
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "rcap-source-monitor" };

  const existingTitles = new Set();
  for (let page = 1; page <= 10; page += 1) {
    const res = await fetch(`${api}/repos/${repo}/issues?labels=${ISSUE_LABEL}&state=open&per_page=100&page=${page}`, { headers });
    if (!res.ok) { console.error(`could not list open ${ISSUE_LABEL} issues: HTTP ${res.status}; opening no issues this run rather than duplicating`); return { opened: 0, deduped: 0, skipped: tasks.length }; }
    const rows = await res.json();
    for (const issue of rows) existingTitles.add(issue.title);
    if (rows.length < 100) break;
  }

  let opened = 0, deduped = 0, failed = 0;
  for (const task of tasks) {
    const title = `Source change review: ${task.sourceId} (${task.jurisdiction ?? "?"} ${task.formNumber ?? ""})`.trim();
    if (existingTitles.has(title)) { deduped += 1; continue; }
    const body = [
      `Nightly source monitor observed \`${task.outcome}\` for a pinned official source.`,
      "",
      "```json",
      JSON.stringify({ pinned: task.pinned, observed: task.observed, routesUsing: task.routesUsing.routes }, null, 2),
      "```",
      "",
      `Review task JSON: run artifact of this workflow run (intended commit path \`${task.intendedCommitPath}\`).`,
      `Response procedure: \`${task.responseProcedure}\`. This issue records an observation; it approves nothing and holds nothing.`
    ].join("\n");
    const res = await fetch(`${api}/repos/${repo}/issues`, {
      method: "POST", headers,
      body: JSON.stringify({ title, body, labels: [ISSUE_LABEL] })
    });
    if (res.ok) { opened += 1; existingTitles.add(title); }
    else { failed += 1; console.error(`could not open issue for ${task.sourceId}: HTTP ${res.status}`); }
  }
  return { opened, deduped, failed };
}

// ---- main --------------------------------------------------------------------
const join = buildRouteJoin();
const targets = collectTargets();
if (targets.length === 0) { console.error("FAIL source monitor — no monitorable targets assembled"); process.exit(1); }

const byUrlPlan = { fetch: 0, skipped: 0 };
for (const t of targets) (t.plannedAction === "fetch" ? byUrlPlan.fetch += 1 : byUrlPlan.skipped += 1);

fs.mkdirSync(OUT_DIR, { recursive: true });

if (DRY_RUN) {
  const plan = {
    schemaVersion: "rcap-source-monitor-plan/v1",
    date: TODAY,
    dryRun: true,
    hostPolicyModule: "scripts/lib/official-host-policy.mjs",
    counts: { targets: targets.length, planFetch: byUrlPlan.fetch, planSkipped: byUrlPlan.skipped, configProblems: problems.length },
    configProblems: problems,
    targets: targets.map((t) => ({
      sourceId: t.sourceId, jurisdiction: t.jurisdiction, url: t.url, host: t.host,
      urlKind: t.urlKind, expectedSha256: t.expectedSha256, pinnedIn: t.pinnedIn,
      plannedAction: t.plannedAction, routesUsing: routesUsing(t, join)
    }))
  };
  const planPath = path.join(OUT_DIR, `source-monitor-plan-${TODAY}.json`);
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`DRY RUN — ${targets.length} target(s): ${byUrlPlan.fetch} would be fetched, ${byUrlPlan.skipped} skipped by policy.`);
  for (const t of plan.targets) {
    console.log(`  ${t.plannedAction === "fetch" ? "fetch" : "SKIP "} ${t.sourceId} ${t.url}${t.expectedSha256 ? "" : "  (no pinned hash — observe only)"}  routes=${t.routesUsing.routes.length}`);
  }
  if (problems.length) { console.error(`\n${problems.length} config problem(s):`); for (const p of problems) console.error(`  - ${p}`); }
  console.log(`plan written to ${planPath}`);
  process.exit(problems.length ? 1 : 0);
}

// Fetch each distinct URL once; evaluate every target that pins it.
const observations = new Map();
const distinctUrls = [...new Set(targets.filter((t) => t.plannedAction === "fetch").map((t) => t.url))];
for (const url of distinctUrls) {
  const exact = exactHostPolicy(new URL(url).hostname.toLowerCase());
  observations.set(url, await observeUrl(url, Boolean(exact)));
}

const results = [];
const tasks = [];
for (const t of targets) {
  const obs = observations.get(t.url) ?? { ok: false, failure: "not fetched (host policy)", redirectChain: [] };
  const outcome = classify(t, obs);
  const attribution = routesUsing(t, join);
  results.push({
    sourceId: t.sourceId, jurisdiction: t.jurisdiction, formNumber: t.formNumber, url: t.url,
    urlKind: t.urlKind, pinnedIn: t.pinnedIn, expectedSha256: t.expectedSha256,
    outcome,
    observed: obs.ok ? { finalUrl: obs.finalUrl, httpStatus: obs.httpStatus, contentType: obs.contentType, byteLength: obs.byteLength, sha256: obs.sha256, looksLikePdf: obs.looksLikePdf, redirectChain: obs.redirectChain } : { failure: obs.failure ?? null, redirectChain: obs.redirectChain ?? [] },
    routesUsing: attribution.routes
  });
  if (NEEDS_REVIEW.has(outcome)) tasks.push(reviewTask(t, obs, outcome, attribution));
}

const counts = {};
for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;

const report = {
  schemaVersion: "rcap-source-monitor-report/v1",
  generatedBy: "scripts/rcap-source-monitor.mjs",
  date: TODAY,
  generatedAt: new Date().toISOString(),
  whatThisIs: "A nightly observation of every pinned official source URL. It records; it decides nothing.",
  whatThisDoesNot: ["auto-approve or adopt observed bytes", "invalidate pins", "touch route state, holds, or registries", "commit anything"],
  counts: { targets: targets.length, ...counts, reviewTasks: tasks.length, configProblems: problems.length },
  configProblems: problems,
  results
};
const reportPath = path.join(OUT_DIR, `source-monitor-report-${TODAY}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const taskDir = path.join(OUT_DIR, "review-tasks");
if (tasks.length) fs.mkdirSync(taskDir, { recursive: true });
for (const task of tasks) {
  fs.writeFileSync(path.join(taskDir, `${TODAY}-${task.sourceId}.json`), `${JSON.stringify(task, null, 2)}\n`);
}

let issueOutcome = null;
if (OPEN_ISSUES && tasks.length) issueOutcome = await openIssues(tasks);

const summaryLines = [
  "## RCAP nightly source monitor",
  "",
  `${targets.length} pinned target(s): ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}.`,
  tasks.length ? `**${tasks.length} review task(s) written** — see the run artifact; response procedure docs/rcap/EVERGREEN_ROUTE_MAINTENANCE.md.` : "No changes or losses observed; no review tasks.",
  issueOutcome ? `Issues: ${issueOutcome.opened ?? 0} opened, ${issueOutcome.deduped ?? 0} already open (deduped by title).` : "",
  ""
].filter(Boolean);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryLines.join("\n")}\n`);
console.log(summaryLines.join("\n"));
for (const t of tasks) console.log(`  REVIEW ${t.outcome} ${t.sourceId} — routes affected: ${t.routesUsing.routes.length}`);
console.log(`report written to ${reportPath}`);

// Observed change is a successful run: the monitor's job is to notice, and it
// did. Only a broken configuration fails the run.
process.exit(problems.length ? 1 : 0);
