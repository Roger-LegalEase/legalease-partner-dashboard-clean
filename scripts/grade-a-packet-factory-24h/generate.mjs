#!/usr/bin/env node
/**
 * The 24-hour national packet factory: every remaining family, dispatched.
 *
 *   node scripts/grade-a-packet-factory-24h/generate.mjs [--check]
 *
 * The denominator is recomputed here from repository evidence rather than
 * carried forward. 352, 372 and 329 have all been quoted this sprint and each
 * was right about a different population; a number that is remembered rather
 * than derived stops being true the moment the tree moves under it.
 *
 * The honest shape of this dispatch is stated up front, because the arithmetic
 * is the finding: thirty-two lanes are created and queued as instructed, but the
 * work that exists for them is not evenly distributed across the four kinds. The
 * builders are limited by how many families have an exactly-identified official
 * source, which is far fewer than the roster would hold. That is what the source
 * conveyor is for, and it is reported rather than smoothed.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const OUT_DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPT_DIR = "docs/rcap/grade-a/packet-factory-24h";
const LC = "data/rcap-grade-a/launch-control";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const SCRIPTS = "scripts";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";

/* The minimum ancestor every lane proves it contains. */
const MINIMUM_CAPTAIN_SHA = "7476708c6236b7b2ce1b1112dbeef434d3957c59";

/* Micro-batch: a lane returns work in hours, not at the end of a wave. Five is
 * the ceiling and two to four is the shape; a shared-host lane may exceed it
 * only because its machinery makes splitting the families unsound. */
const PF_MAX_FAMILIES = 5;
const PF_PREFERRED_MAX = 4;
/*
 * Verification, repair and build capacity are elastic. The thresholds are the
 * dispatch's own, and they are measured against the live queue rather than
 * asserted: VERIFY_PENDING here means every family awaiting an independent
 * reading, which is the pending ones plus the ones a verifier already holds --
 * a lane roster sized only on the unclaimed half under-provisions exactly when
 * the queue is deepest.
 */
const VF_LANES_BASE = 8;
const VF_LANES_ELASTIC = 12;
const FIX_LANES_BASE = 4;
const FIX_LANES_ELASTIC = 8;
const PF_LANES_BASE = 16;
const PF_LANES_ELASTIC = 24;
const VERIFY_ELASTIC_THRESHOLD = 20;
const REPAIR_ELASTIC_THRESHOLD = 20;
const BUILD_ELASTIC_THRESHOLD = 80;
const SOURCE_LANES = 16;

const STATES = [
  "SOURCE_BLOCKED", "SOURCE_READY", "ASSIGNED_TO_BUILD", "BUILD_IN_PROGRESS",
  "PASS_COMPLETE", "VERIFY_PENDING", "VERIFYING", "FAIL_REPAIR_REQUIRED",
  "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "PRODUCT_PATH_PENDING",
  "COMPLETE_PACKET_PROVEN", "LEGITIMATE_GUIDANCE_ONLY"
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const readIf = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? read(rel) : null);
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");

/* ---------------------------------------------------------------- *
 * STEP 1 — the live denominator, from evidence
 * ---------------------------------------------------------------- */
const INPUTS = {
  scoreboard: "data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  custody: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json",
  worklist: `${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`,
  categoryB: `${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`,
  categoryBStatus: `${LC}/CATEGORY_B_INTEGRATION_STATUS.json`,
  counsel: `${LC}/COUNSEL_DETERMINATION_DELTA.json`,
  legalQueue: "data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2.json",
  c11: `${LC}/C11_RETURN_REVIEW.json`,
  c11Stops: `${LC}/C11_STOP_CLASSIFICATION.json`,
  completeness: "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
  continuation: `${LC}/S2_CONTINUATION.json`,
  cloudContinuations: `${LC}/CODEX_CLOUD_CONTINUATIONS.json`,
  p2Verification: `${LC}/P2_WASHINGTON_VERIFICATION.json`,
  r8Split: `${LC}/R8_FOUR_WAY_SPLIT.json`,
  verificationLedger: `${LC}/WAVE_2_VERIFICATION_LEDGER.json`,
  wave2: `${LC}/WAVE_2_ASSIGNMENTS.json`,
  repairWave: `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
  s2: `${LC}/S2_SHARED_HOST_ASSIGNMENT.json`,
  wave2Repairs: `${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json`,
  corpusIndex: "data/rcap-all50/local-source-corpus-index.json",
  staleBlock: "data/rcap-grade-a/stale-artifact-block.json"
};
const IN = Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [k, read(p)]));

const EXACT_TIERS = new Set(["exact_form_number", "content_hash", "exact_content_hash"]);

/*
 * SOURCE_READY means a builder can open the bytes, not that the census can name
 * them.
 *
 * ks-21-6614-conviction-set was classified SOURCE_READY while none of its six
 * required binaries binds. It has no custody row at all, so the old test --
 * "no missing_source hold, and no source resolved to an inexact tier" -- found
 * an empty list of inexact sources and read the emptiness as satisfaction. That
 * is the absent-versus-empty failure this whole sprint keeps meeting, arriving
 * this time through the readiness classifier.
 *
 * A source is bound only when all seven hold: an exact identity, an accepted
 * tier, a held path, a held SHA-256, an entry for that path in the governed
 * corpus index, an indexed SHA-256 equal to the held one, and at least one
 * source resolved at all. An exact title with no held byte is SOURCE_BLOCKED,
 * and so is a family that names official forms and resolves none of them.
 */
const CUSTODY_CLASSES_NEVER_READY = new Set([
  "SOURCE_GENUINELY_MISSING", "SOURCE_IDENTITY_UNRESOLVED", "SOURCE_IDENTITY_NOT_EXACT"
]);

/* routes, keyed by packet family */
const routesByFamily = new Map();
for (const r of IN.census.routes) {
  const key = r.packetSetId ?? r.packetFamilyId;
  if (!key) continue;
  if (!routesByFamily.has(key)) routesByFamily.set(key, []);
  routesByFamily.get(key).push(r);
}
const custodyByGroup = new Map(IN.custody.rows.map((r) => [r.worklistGroupId, r]));
const completenessByFamily = new Map(IN.completeness.results.map((r) => [r.familyId, r]));
const verdictByFamily = new Map((IN.verificationLedger.rows ?? []).map((r) => [r.family, r]));
const continuationByFamily = new Map(IN.continuation.rows.map((r) => [r.familyId, r]));
const confirmBRoutes = new Set(IN.categoryB.rows.filter((r) => r.finalDecision === "CONFIRM_B").map((r) => r.originalRouteKey));
const openCounselRoutes = new Set((IN.legalQueue.trueCounselQueue?.questions ?? []).filter((q) => !q.answered).map((q) => q.routeKey));
const c11Stopped = new Set((IN.c11.families ?? []).filter((f) => f.classification !== "BUILT").map((f) => f.familyId));

/* overlay directories that exist */
const overlayDirs = [];
for (const st of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const full = path.join(ROOT, OVERLAYS, st);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const d of fs.readdirSync(full)) overlayDirs.push(`${OVERLAYS}/${st}/${d}`);
}
/** Every corpus-index entry, by path and by form number. */
const indexByPath = new Map((IN.corpusIndex.entries ?? []).map((e) => [e.path, e]));
const indexByForm = new Map();
for (const e of IN.corpusIndex.entries ?? []) {
  indexByForm.set(e.formNumber, [...(indexByForm.get(e.formNumber) ?? []), e]);
}

/**
 * Can a builder actually open every byte this family needs?
 *
 * Two tiers, matching the preflight's own resolution so the two cannot disagree.
 * Tier 1 is the custody row, which already resolved each source to a held path
 * and a pinned digest. Tier 2 is the census route's `official-form:<number>`
 * against the committed corpus index, for a family that names no acquisition
 * task. A family whose route names official forms and resolves none of them is
 * blocked, whatever its custody class says.
 */
function sourceReadiness(familyId, worklistGroupId, custody, routes, holds) {
  const reasons = [];
  const bound = [];
  if ((holds ?? []).some((h) => h.kind === "missing_source")) reasons.push("the census carries a missing_source hold");
  if (custody && CUSTODY_CLASSES_NEVER_READY.has(custody.custodyClass)) reasons.push(`custody class ${custody.custodyClass}`);

  const named = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? [])
    .filter((x) => typeof x === "string" && x.startsWith("official-form:"))))];

  if (custody && (custody.documentSources ?? []).length > 0) {
    for (const d of custody.documentSources) {
      if (!d.resolved) { reasons.push(`${d.sourceId}: unresolved identity`); continue; }
      if (!EXACT_TIERS.has(d.tier)) { reasons.push(`${d.sourceId}: tier ${d.tier} is not exact`); continue; }
      if (!d.heldAs?.path) { reasons.push(`${d.sourceId}: exact identity with no held path`); continue; }
      if (!d.heldAs?.sha256) { reasons.push(`${d.sourceId}: held path with no SHA-256`); continue; }
      const entry = indexByPath.get(d.heldAs.path);
      if (!entry) { reasons.push(`${d.sourceId}: held path is not in the governed corpus index`); continue; }
      if (entry.sha256 !== d.heldAs.sha256) { reasons.push(`${d.sourceId}: indexed SHA-256 does not equal the held SHA-256`); continue; }
      bound.push({ sourceId: d.sourceId, path: d.heldAs.path, sha256: d.heldAs.sha256, tier: d.tier, resolvedBy: "custody_reconciliation" });
    }
  } else {
    for (const id of named) {
      const formNumber = id.slice("official-form:".length);
      const matches = indexByForm.get(formNumber) ?? [];
      if (matches.length !== 1) { reasons.push(`${id}: ${matches.length === 0 ? "no" : `${matches.length}`} corpus index entr${matches.length === 1 ? "y" : "ies"} for this form number`); continue; }
      if (!matches[0].sha256) { reasons.push(`${id}: corpus entry carries no SHA-256`); continue; }
      bound.push({ sourceId: id, path: matches[0].path, sha256: matches[0].sha256, tier: "exact_form_number", resolvedBy: "census_form_number_against_committed_index" });
    }
  }

  if (bound.length === 0) {
    reasons.push(named.length > 0
      ? "no named official form resolves to a held, indexed, hash-matching binary"
      : "the family names no document-shaped source, so nothing binds");
  }
  return {
    ready: reasons.length === 0,
    reasons,
    boundSources: bound,
    namedOfficialForms: named.length,
    boundCount: bound.length,
    custodyClass: custody?.custodyClass ?? "NO_ACQUISITION_TASK_NAMED"
  };
}

const slugOf = (id) => id.replace(/_/g, "-").toLowerCase();
const suffixOf = (s) => (s === "custom_pleading" ? "custom-pleading" : "official-pdf-fill");

/* ---------------------------------------------------------------- *
 * STEP 3 — the import graph (needed before ownership can be decided)
 * ---------------------------------------------------------------- */
const scriptFiles = fs.readdirSync(path.join(ROOT, SCRIPTS)).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
const directImports = new Map(scriptFiles.map((f) => [f,
  [...new Set([...fs.readFileSync(path.join(ROOT, SCRIPTS, f), "utf8")
    .matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]))]]));
const transitiveImportsOf = (f, seen = new Set()) => {
  if (seen.has(f)) return [];
  seen.add(f);
  const out = [];
  for (const d of directImports.get(f) ?? []) { out.push(d, ...transitiveImportsOf(d, seen)); }
  return [...new Set(out)];
};
const importersOf = (target) => scriptFiles.filter((f) => f !== target && transitiveImportsOf(f).includes(target));
const familyOfScript = (f) => f.replace(/^build-census-v1-/, "").replace(/\.mjs$/, "");

/* ---------------------------------------------------------------- *
 * STEP 2 — active ownership
 * ---------------------------------------------------------------- */
/*
 * Every lane currently holding families, from every record that dispatches one.
 * The P2 Washington verification shards are here because a family under
 * independent verification is claimed: seeding it into a factory VF lane as well
 * would be two verifiers on one packet, reported as independent proof twice.
 */
const ACTIVE_LANES = [
  ...IN.cloudContinuations.assignments,
  ...(IN.p2Verification?.assignments ?? []),
  ...(IN.r8Split?.assignments ?? []),
  ...(IN.r8Split?.southDakotaVerification ? [IN.r8Split.southDakotaVerification] : [])
];
const activeFamilies = new Map();
const activePaths = [];
for (const a of ACTIVE_LANES) {
  for (const f of a.items) activeFamilies.set(f, a.assignmentId);
  for (const p of a.ownedPaths) activePaths.push({ lane: a.assignmentId, path: p });
}
/* Any still-open C11 or completeness continuation, and the wave-2 repair rows,
 * hold paths too. They are read from their own records rather than assumed. */
for (const r of IN.wave2Repairs.assignments) if (r.ownedPath) activePaths.push({ lane: `WAVE_2_REPAIR:${r.family}`, path: r.ownedPath });

const rootOf = (p) => p.replace(/\/?\*+$/, "");
const touches = (a, b) => { const ra = rootOf(a); const rb = rootOf(b); return ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`); };
const pathIsActive = (p) => activePaths.some((x) => touches(p, x.path) || new RegExp(`^${x.path.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`).test(p));

/* ---------------------------------------------------------------- *
 * Build one record per family
 * ---------------------------------------------------------------- */
const families = [];
const seen = new Set();
for (const f of IN.scoreboard.familiesDetail) {
  const tail = String(f.worklistGroupId ?? "").split(":").pop();
  const familyId = routesByFamily.has(tail) ? tail : f.worklistGroupId;
  if (seen.has(familyId)) continue;
  seen.add(familyId);

  const routes = routesByFamily.get(familyId) ?? [];
  const custody = custodyByGroup.get(f.worklistGroupId) ?? null;
  const comp = completenessByFamily.get(familyId) ?? null;
  const cont = continuationByFamily.get(familyId) ?? null;
  const verdict = verdictByFamily.get(familyId) ?? null;

  const strategy = f.implementationStrategy;
  const dirGuess = `${OVERLAYS}/${(f.jurisdictions[0] ?? "xx").toLowerCase()}/${slugOf(familyId)}--${suffixOf(strategy)}`;
  const directory = comp?.directory
    ?? overlayDirs.find((d) => path.basename(d).startsWith(`${slugOf(familyId)}--`))
    ?? dirGuess;
  const buildScript = `${SCRIPTS}/build-census-v1-${familyId}.mjs`;
  const buildScriptExists = fs.existsSync(path.join(ROOT, buildScript));
  const artifactPresent = fs.existsSync(path.join(ROOT, `${directory}/reports/rendered-artifacts.json`));

  const forms = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? []).filter((s) => s.startsWith("official-form:")).map((s) => s.slice(14))))].sort();
  const components = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? []).filter((s) => s.startsWith("component:"))))].sort();
  const instrumentKinds = [...new Set(routes.flatMap((r) => String(r.participantFacingInstrument ?? "").split(/;\s*/).map((s) => s.split(":")[0].trim()).filter(Boolean)))].sort();

  const docs = custody?.documentSources ?? [];
  const inexact = docs.filter((d) => !d.resolved || !EXACT_TIERS.has(d.tier));
  const readiness = sourceReadiness(familyId, f.worklistGroupId, custody, routes, f.holds);
  const sourceBound = readiness.ready;
  const sourceStatus = readiness.ready ? "SOURCE_BOUND_BY_HELD_BYTES"
    : !((f.holds ?? []).some((h) => h.kind === "missing_source"))
      ? (inexact.length > 0 ? "SOURCE_IDENTITY_NOT_EXACT" : `SOURCE_NAMED_BUT_NOT_HELD: ${readiness.reasons[0]}`)
      : (custody?.custodyClass ?? "SOURCE_IDENTITY_UNRESOLVED");
  const sourceIds = docs.map((d) => d.sourceId);
  const sourceHashes = docs.filter((d) => d.heldAs?.sha256).map((d) => ({ sourceId: d.sourceId, path: d.heldAs.path, sha256: d.heldAs.sha256, tier: d.tier }));

  const legalBlocked = routes.some((r) => openCounselRoutes.has(r.routeKey)) || verdict?.verdict === "BLOCKED_LEGAL_APPROVAL_INPUT";
  const guidanceOnly = routes.length > 0 && routes.every((r) => confirmBRoutes.has(r.routeKey));
  const notAFamily = routes.length === 0;
  const routeMappingOpen = notAFamily;

  const nineZero = comp ? Object.values(comp.counters).every((v) => v === 0) : null;
  const completenessStatus = comp ? comp.result : artifactPresent ? "NOT_AUDITED" : "NOT_BUILT";

  const activeOwner = activeFamilies.get(familyId) ?? null;
  /* What KIND of lane holds it, read from the lane's own record rather than
   * matched out of its id. A regex over assignment ids called every P2V shard a
   * builder, because it was written when the only verifiers were named VS. */
  const activeOwnerLane = ACTIVE_LANES.find((a) => a.assignmentId === activeOwner)?.lane ?? null;

  /* The one state this family is in, decided in a fixed order so a family
   * cannot be counted twice. */
  let state;
  if (guidanceOnly) state = "LEGITIMATE_GUIDANCE_ONLY";
  else if (activeOwner && activeOwnerLane === "independent-verification") state = "VERIFYING";
  else if (activeOwner) state = "BUILD_IN_PROGRESS";
  else if (verdict?.verdict === "PASS") state = "VERIFIED_PASS";
  else if (comp && nineZero) state = "VERIFY_PENDING";
  else if (comp && !nineZero) state = "FAIL_REPAIR_REQUIRED";
  else if (legalBlocked) state = "SOURCE_BLOCKED";
  else if (!readiness.ready) state = "SOURCE_BLOCKED";
  else if (notAFamily) state = "SOURCE_BLOCKED";
  else state = "SOURCE_READY";

  families.push({
    familyId,
    worklistGroupId: f.worklistGroupId,
    jurisdiction: (f.jurisdictions ?? []).join("/"),
    routeKeys: routes.map((r) => r.routeKey),
    routeCount: routes.length,
    implementationStrategy: strategy,
    packetComponents: components,
    instrumentKinds,
    officialFormFamily: forms.join("+") || "NONE",
    forms,
    sourceIds,
    sourceHashes,
    sourceStatus,
    sourceBound,
    sourceReadiness: readiness,
    legalInputStatus: legalBlocked ? "OPEN_LEGAL_INPUT" : "SETTLED",
    routeMappingStatus: routeMappingOpen ? "UNBOUND_TO_A_PACKET_FAMILY" : "BOUND",
    artifactStatus: artifactPresent ? "RENDERED" : "NOT_RENDERED",
    completenessStatus,
    allNineCountersZero: nineZero,
    counters: comp?.counters ?? null,
    failingCounters: comp ? Object.entries(comp.counters).filter(([, v]) => v > 0).map(([k]) => k) : [],
    continuationResult: cont?.resultAfter ?? null,
    c11Stopped: c11Stopped.has(familyId),
    state,
    activeOwner,
    activeOwnerLane,
    buildScript,
    buildScriptExists,
    sharedBuildHost: buildScriptExists
      ? (transitiveImportsOf(path.basename(buildScript)).find((d) => importersOf(d).length > 1) ?? null)
      : null,
    directory,
    ownedPaths: [`${directory}/**`, buildScript],
    prohibitedPaths: []
  });
}

/* Shared-host ownership: a family-specific script may be owned only when no
 * unassigned family imports it. Computed after every record exists. */
const familyByScript = new Map(families.map((f) => [path.basename(f.buildScript), f]));
const familyIndex = new Map(families.map((f) => [f.familyId, f]));
for (const f of families) {
  const base = path.basename(f.buildScript);
  const importers = importersOf(base).map(familyOfScript);
  f.importedBy = importers;
  f.exclusiveScript = importers.length === 0;
}

/* ---------------------------------------------------------------- *
 * Populations
 * ---------------------------------------------------------------- */
const active = families.filter((f) => f.activeOwner);
const guidance = families.filter((f) => f.state === "LEGITIMATE_GUIDANCE_ONLY");
const remaining = families.filter((f) => !f.activeOwner && f.state !== "LEGITIMATE_GUIDANCE_ONLY");
const sourceReady = remaining.filter((f) => f.state === "SOURCE_READY");
const sourceBlocked = remaining.filter((f) => f.state === "SOURCE_BLOCKED" && f.legalInputStatus !== "OPEN_LEGAL_INPUT");
const legalBlocked = remaining.filter((f) => f.legalInputStatus === "OPEN_LEGAL_INPUT");
const verifyPending = remaining.filter((f) => f.state === "VERIFY_PENDING");
const repairRequired = remaining.filter((f) => f.state === "FAIL_REPAIR_REQUIRED");

/*
 * Elastic capacity, measured rather than asserted.
 *
 * The verification queue is every family awaiting an independent reading, and
 * that is the ones nobody holds PLUS the ones a verifier already has. Sizing
 * the roster on the unclaimed half alone under-provisions exactly when the
 * queue is deepest: twelve pending beside ten in flight is twenty-two families
 * of verification work, not twelve.
 */
const verifyingNow = families.filter((f) => f.state === "VERIFYING" || f.activeOwnerLane === "independent-verification");
const VERIFY_QUEUE = verifyPending.length + verifyingNow.length;
const REPAIR_QUEUE = repairRequired.length + families.filter((f) => f.state === "FAIL_REPAIR_REQUIRED").length - repairRequired.length;
const BUILD_QUEUE = sourceReady.length;
const ELASTICITY = [
  { id: "verification", rule: `VERIFY_PENDING > ${VERIFY_ELASTIC_THRESHOLD}`, measured: VERIFY_QUEUE,
    measuredAs: `${verifyPending.length} awaiting a verifier + ${verifyingNow.length} already held by one`,
    threshold: VERIFY_ELASTIC_THRESHOLD, triggered: VERIFY_QUEUE > VERIFY_ELASTIC_THRESHOLD,
    lanesWithout: VF_LANES_BASE, lanesWith: VF_LANES_ELASTIC, creates: ["VF09", "VF10", "VF11", "VF12"] },
  { id: "repair", rule: `FAIL_REPAIR_REQUIRED > ${REPAIR_ELASTIC_THRESHOLD}`, measured: REPAIR_QUEUE,
    measuredAs: `${repairRequired.length} families returned FAIL_REPAIR_REQUIRED and unclaimed`,
    threshold: REPAIR_ELASTIC_THRESHOLD, triggered: REPAIR_QUEUE > REPAIR_ELASTIC_THRESHOLD,
    lanesWithout: FIX_LANES_BASE, lanesWith: FIX_LANES_ELASTIC, creates: ["FIX05", "FIX06", "FIX07", "FIX08"] },
  { id: "build", rule: `SOURCE_READY > ${BUILD_ELASTIC_THRESHOLD}`, measured: BUILD_QUEUE,
    measuredAs: `${sourceReady.length} families hold every source they need`,
    threshold: BUILD_ELASTIC_THRESHOLD, triggered: BUILD_QUEUE > BUILD_ELASTIC_THRESHOLD,
    lanesWithout: PF_LANES_BASE, lanesWith: PF_LANES_ELASTIC,
    creates: ["PF17", "PF18", "PF19", "PF20", "PF21", "PF22", "PF23", "PF24"] }
];
const laneCount = (id) => { const e = ELASTICITY.find((x) => x.id === id); return e.triggered ? e.lanesWith : e.lanesWithout; };
const VF_LANES = laneCount("verification");
const FIX_LANES = laneCount("repair");
const PF_LANES = laneCount("build");

/* ---------------------------------------------------------------- *
 * Grouping and lane packing
 * ---------------------------------------------------------------- */
const groupKeyOf = (f) => [f.sharedBuildHost ?? "NO_SHARED_HOST", f.officialFormFamily, f.implementationStrategy, f.instrumentKinds.join("+") || "NONE"].join("::");
const groupsOf = (pool) => {
  const m = new Map();
  for (const f of pool) {
    const k = groupKeyOf(f);
    if (!m.has(k)) m.set(k, { groupKey: k, families: [] });
    m.get(k).families.push(f);
  }
  return [...m.values()].sort((a, b) => b.families.length - a.families.length || a.groupKey.localeCompare(b.groupKey));
};
const kinds = (g) => new Set(g.families.flatMap((f) => f.instrumentKinds));
const jaccard = (a, b) => {
  const A = kinds(a); const B = kinds(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
};
/** Pack whole groups into `laneCount` buckets, similarity-first, size-balanced. */
const packGroups = (pool, laneCount) => {
  const buckets = Array.from({ length: laneCount }, () => []);
  const size = (b) => b.reduce((n, g) => n + g.families.length, 0);
  for (const g of groupsOf(pool)) {
    const smallest = Math.min(...buckets.map(size));
    const candidates = buckets.map((b, j) => ({ j, b })).filter((x) => size(x.b) <= smallest);
    const pick = candidates
      .map((x) => ({ ...x, sim: x.b.length === 0 ? 0 : Math.max(...x.b.map((o) => jaccard(o, g))) }))
      .sort((a, b) => b.sim - a.sim || a.j - b.j)[0];
    buckets[pick.j].push(g);
  }
  return buckets;
};

const pfBuckets = packGroups(sourceReady, PF_LANES);
/* Any lane over the ceiling sheds its smallest group to the emptiest lane that
 * can take it, unless the group is a single shared-host group that cannot be
 * split without two writers on one script. */
const bucketSize = (b) => b.reduce((n, g) => n + g.families.length, 0);
for (let guard = 0; guard < 60; guard += 1) {
  const over = pfBuckets.findIndex((b) => bucketSize(b) > PF_MAX_FAMILIES);
  if (over < 0) break;
  const donor = [...pfBuckets[over]].sort((a, b) => a.families.length - b.families.length)[0];
  if (!donor || pfBuckets[over].length === 1) break;
  const target = pfBuckets
    .map((b, j) => ({ j, size: bucketSize(b) }))
    .filter((x) => x.j !== over && x.size + donor.families.length <= PF_MAX_FAMILIES)
    .sort((a, b) => a.size - b.size)[0];
  if (!target) break;
  pfBuckets[over].splice(pfBuckets[over].indexOf(donor), 1);
  pfBuckets[target.j].push(donor);
}

/* Source lanes: bounded by issuing host and identity class, never by state. */
const blockedBySource = [...sourceBlocked, ...legalBlocked];
const sourceRows = [];
for (const f of blockedBySource) {
  const custody = custodyByGroup.get(f.worklistGroupId);
  const docs = custody?.documentSources ?? [];
  let emitted = 0;
  for (const d of docs) {
    if (d.resolved && EXACT_TIERS.has(d.tier)) continue;
    emitted += 1;
    sourceRows.push({
      familyId: f.familyId, jurisdiction: f.jurisdiction, sourceId: d.sourceId,
      absence: d.absence ?? (d.resolved ? "inexact_tier" : "unresolved"),
      tier: d.tier ?? null, legalBlocked: f.legalInputStatus === "OPEN_LEGAL_INPUT"
    });
  }
  if (emitted === 0) {
    /* A family blocked with no unresolved document source is blocked on a source
     * it NAMES and does not hold: the readiness reasons say which. Every one of
     * them becomes an obligation, because a blocked family with no obligation is
     * a family nobody is working on. */
    for (const reason of (f.sourceReadiness?.reasons ?? ["no document-shaped source named"])) {
      const named = reason.match(/^(official-form:[^:]+):/);
      sourceRows.push({
        familyId: f.familyId, jurisdiction: f.jurisdiction,
        sourceId: named ? named[1] : null,
        absence: named ? "named_form_number_not_in_corpus" : "no_document_shaped_source_named",
        tier: null, legalBlocked: f.legalInputStatus === "OPEN_LEGAL_INPUT", fromReadiness: reason
      });
    }
  }
}
/* One obligation, one row: a family that names the same source twice is one
 * obligation, not two, and a duplicate would be dispatched to two lanes. */
const seenObligation = new Set();
const duplicateObligations = [];
for (let i = sourceRows.length - 1; i >= 0; i -= 1) {
  const key = `${sourceRows[i].familyId}::${sourceRows[i].sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`;
  if (seenObligation.has(key)) { duplicateObligations.push(key); sourceRows.splice(i, 1); continue; }
  seenObligation.add(key);
}

/*
 * The source swarm.
 *
 * Four monolithic lanes made every obligation wait behind the slowest one in its
 * class. Sixteen exclusive lanes split the work by CUSTODY OPERATION -- identity,
 * inventory reconciliation, acquisition, promotion -- and then by issuer host
 * inside each, so an obligation moves through four short queues instead of one
 * long one and an exact official URL can be dispatched the moment it is known.
 * SRC01 to SRC04 keep their identifiers and take the reconciliation operation.
 *
 * The operations are ordered but not blocking: DISC hands a URL to ACQ as soon
 * as it has one, SRC can bind a held byte without waiting for any acquisition,
 * and PROMO releases a family the moment its last source is promoted.
 *
 * Six DISC, four SRC, three ACQ, three PROMO. DISC carries six because identity
 * is where the queue actually is -- most blocked families have a label and no
 * document -- and ACQ and PROMO carry three each because their work is bounded
 * by a workflow run and a hash comparison rather than by research.
 */
const SOURCE_OPERATIONS = [
  {
    prefix: "DISC", lanes: 6, operation: "exact-source-identity",
    absence: ["label_does_not_identify_a_document", "no_document_shaped_source_named"],
    mission: "Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.",
    records: ["official publisher", "exact title", "form number", "revision", "official URL"],
    handsOffTo: "ACQ, the moment an exact official URL is known — do not wait for the rest of this lane",
    bounded: "the issuing court or agency that publishes the document"
  },
  {
    prefix: "SRC", lanes: 4, operation: "held-inventory-reconciliation",
    absence: ["named_form_number_not_in_corpus", "named_content_hash_not_in_corpus"],
    mission: "Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.",
    records: ["custody path", "SHA-256", "byte size", "MIME", "pages", "technology"],
    handsOffTo: "PROMO where the byte is held and binds; DISC where the identity itself turns out to be wrong",
    bounded: "the private corpus and the committed inventory, read only — nothing is fetched here"
  },
  {
    prefix: "ACQ", lanes: 3, operation: "official-acquisition-dispatch",
    absence: [],
    mission: "Prepare the committed manifest row for one already-approved exact official URL. GitHub Actions performs acquisition; this no-egress agent does not dispatch or claim a workflow run.",
    records: ["official URL", "dispatch id", "workflow run", "receipt path"],
    handsOffTo: "PROMO, on the acquired artifact receipt",
    bounded: "one issuing host per lane, so a host that rate-limits blocks only its own lane"
  },
  {
    prefix: "PROMO", lanes: 3, operation: "promotion-and-release",
    absence: ["inexact_tier"],
    mission: "Take an acquired or reconciled artifact, register its custody, promote it into the governed index, and release every family whose last source is now bound. A promotion without exact bytes is refused.",
    records: ["custody path", "SHA-256", "indexed entry", "families released"],
    handsOffTo: "Captain, who assigns every released family to the next available PF lane immediately",
    bounded: "the custody register and the governed corpus index"
  }
];

/** Which operation an obligation belongs to, from its own absence class. */
const operationFor = (row) => {
  /* An inexact corpus tier is reconciliation work, not evidence that an
   * artifact and receipt already exist. PROMO is populated only by a later,
   * explicit handoff carrying those exact inputs. */
  if (row.tier && !EXACT_TIERS.has(row.tier)) return "SRC";
  const op = SOURCE_OPERATIONS.find((o) => o.absence.includes(row.absence));
  return op ? op.prefix : "PROMO";
};

const recordSchemaFor = (prefix) => ({
  DISC: ["itemId", "sourceId", "jurisdiction", "issuingAuthority", "officialTitle", "formNumber", "revision", "officialUrl", "urlKind", "intendedPacketRole", "statewideOrLocal", "familyIds", "evidencePaths", "handoffOperation"],
  SRC: ["itemId", "sourceId", "corpusPath", "title/formNumber", "sha256", "byteSize", "mime", "pageCount", "technology", "matchBasis", "familyIds", "handoffOperation"],
  ACQ: ["itemId", "sourceId", "jurisdiction", "issuingAuthority", "officialUrl", "urlKind", "expectedSha256", "title/formNumber", "manifestEntryId", "familyIds", "dispatchStatus", "handoffState"],
  PROMO: ["itemId", "sourceId", "acquisitionRunId or held-corpus evidence", "artifactName", "receiptPath", "acquiredSha256", "expectedSha256", "comparisonResult", "custodyRecordPath", "inventoryEntryPath", "remainingUnresolvedObligations", "familiesActuallyReleasedNow"]
})[prefix];
/* Inside an operation, N lanes by issuer host. Hosts are sorted and dealt
 * round-robin by total obligation weight so no lane inherits every large host. */
const laneWithinOperation = (rows, laneCount) => {
  const byHost = new Map();
  for (const r of rows) byHost.set(r.jurisdiction || "UNKNOWN", [...(byHost.get(r.jurisdiction || "UNKNOWN") ?? []), r]);
  const hosts = [...byHost.entries()].sort((a, b) => b[1].length - a[1].length);
  const buckets = Array.from({ length: laneCount }, () => []);
  for (const [, rs] of hosts) {
    const smallest = buckets.reduce((best, b, i) => (b.length < buckets[best].length ? i : best), 0);
    buckets[smallest].push(...rs);
  }
  return buckets;
};
for (const row of sourceRows) row.operation = operationFor(row);
for (const op of SOURCE_OPERATIONS) {
  const rows = sourceRows.filter((r) => r.operation === op.prefix);
  const buckets = laneWithinOperation(rows, op.lanes);
  buckets.forEach((bucket, i) => {
    for (const r of bucket) r.lane = `${op.prefix}${String(i + 1).padStart(2, "0")}`;
  });
}

/*
 * Who releases a family.
 *
 * A family's obligations do not have to live in one lane: a family may need
 * one identity resolved and one document acquired, and those are different
 * operations. The first cut listed such a family under familiesUnblocked in
 * both lanes, which reads as two promises to release one family and is a
 * duplicate release -- each lane believes it finishes the family, and neither
 * does. Twenty-four families were claimed twice.
 *
 * A family is released by the lane that holds ALL of its remaining
 * obligations, and by no one otherwise. Where the obligations are split, every
 * holding lane advances the family and the release is attributed to the set.
 */
const lanesHoldingFamily = new Map();
for (const r of sourceRows) {
  if (!lanesHoldingFamily.has(r.familyId)) lanesHoldingFamily.set(r.familyId, new Set());
  lanesHoldingFamily.get(r.familyId).add(r.lane);
}
const releaseOwner = new Map();
const splitFamilies = [];
for (const [familyId, lanes] of lanesHoldingFamily) {
  if (lanes.size === 1) releaseOwner.set(familyId, [...lanes][0]);
  else splitFamilies.push({ familyId, lanes: [...lanes].sort() });
}
splitFamilies.sort((a, b) => a.familyId.localeCompare(b.familyId));

/* ---------------------------------------------------------------- *
 * Assignments
 * ---------------------------------------------------------------- */
const FACT = "data/rcap-grade-a/packet-factory-24h";
const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"];
const CLOUD_PROHIBITED = ["git fetch", "git pull", "git push", "gh ", "git worktree", "git remote add", "git clone"];

/*
 * The lane gate and the row gate are different questions, and a prompt that
 * asked one of them for both stopped every lane on its first blocked family.
 *
 * The environment is a LANE question: node, pdf-lib, the corpus, the checkout,
 * private/ ignored. If it fails, nothing in the lane can run and the lane stops.
 * A family's own sources are a ROW question: one family whose bytes do not bind
 * is one BLOCKED_SOURCE row, and the lane continues. The old prompt ran a single
 * named-family preflight under "Before anything else" and demanded 14/14 before
 * any work, so the first blocked family took fifteen good ones with it.
 */
const ROW_STOP_CONTRACT = {
  laneGate: {
    what: "global environment integrity",
    command: `node ${PREFLIGHT} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA} --assignment ${FACT}/ACTIVE_ASSIGNMENTS.json`,
    mustReturn: "PACKET_BUILD_ENVIRONMENT_READY: 14/14",
    onFailure: "If it does not, STOP THE LANE: nothing in it can run and no row is written.",
    note: "family_sources_bind reports 'not applicable' here on purpose: it is a row question, asked once per family below."
  },
  rowGate: {
    what: "this family's own sources",
    command: `node ${PREFLIGHT} --family <FAMILY_ID> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
    onFamilySourcesBindFailure: "write a BLOCKED_SOURCE row for that family naming the exact source identity that did not bind, and CONTINUE TO THE NEXT FAMILY.",
    onOpenLegalInput: "write a BLOCKED_LEGAL_INPUT row naming the open input, and CONTINUE TO THE NEXT FAMILY. Never guess a legal answer and never research one.",
    onAnyOtherCheckFailing: "that is a lane-level environment change, not a family defect. Stop the lane and say which check moved."
  },
  everyFamilyGetsExactlyOneRow: "COMPLETED or STOPPED, one row per assigned family, no family missing and none twice. A lane that returns fewer rows than it was assigned families has lost work silently.",
  aStoppedFamilyWritesNothing: "A family you stop must leave its overlay directory byte-for-byte unchanged. A half-built packet that reads as built is worse than one that was never started.",
  theLaneCompletesNormally: "A lane with blocked families still completes. Blocked rows are the finding, not a failure of the lane."
};

const TASK_ISOLATION = [
  "THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.",
  "DO NOT EXECUTE PF01-PF16 IN ONE TASK.",
  "DO NOT EXECUTE ANOTHER PF PROMPT IN THIS CONTAINER."
];

const BUILDER_OBLIGATIONS = [
  "bind every source by exact SHA-256, and stop the family rather than build on a source that does not bind",
  "render canonical and boundary artifacts",
  "include every required component the route names — a document mapped and not rendered is a missing companion form",
  "fill every known required fact",
  "classify every intentional blank against the closed vocabulary",
  "identify a missing participant fact as REQUIRED_BEFORE_FILING, declared explicitly and disclosed in participant-instructions.md",
  "select every route-determined option — a packet built for one statutory route states which route it is",
  "complete every repeating case and offence row, because a partly-filled row reads as finished and is not",
  "leave every protected field blank — participant signature, signature date, certificate of mailing before mailing, court-only and prosecutor-only",
  "generate participant instructions and filing instructions",
  "render all page rasters",
  "verify the actual visible writes from the final PDF bytes, not from the finalizer's own report",
  "return all nine completeness counters equal to zero, or return the family as STOPPED with the counter that is not"
];

const base = (id, lane, slug, extra) => ({
  assignmentId: id,
  wave: "packet-factory-24h",
  engine: "Codex Cloud",
  lane,
  environment: "LegalEase Packet Factory",
  executionContract: CONTRACT,
  captainBranch: CAPTAIN_BRANCH,
  workerBranch: "work",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  preflight: `node ${PREFLIGHT} --family <FAMILY_ID> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
  preflightMustReturn: "PACKET_BUILD_ENVIRONMENT_READY: 14/14",
  prohibitedCommands: CLOUD_PROHIBITED,
  theDiffIsTheReturn: "Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.",
  returnDirectory: `${FACT}/${slug}`,
  ...extra
});

const assignments = [];

/* ---- PF01..PF16 ---- */
for (let i = 0; i < PF_LANES; i += 1) {
  const id = `PF${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const fams = pfBuckets[i].flatMap((g) => g.families);
  const sharedAxes = ["sharedBuildHost", "officialFormFamily", "implementationStrategy"].filter((ax) => new Set(fams.map((f) => String(f[ax]))).size === 1);
  const scriptsOwned = fams.filter((f) => f.exclusiveScript || f.importedBy.every((imp) => fams.some((x) => x.familyId === imp))).map((f) => f.buildScript);
  const scriptsNotOwned = fams.filter((f) => !scriptsOwned.includes(f.buildScript))
    .map((f) => ({ script: f.buildScript, importedByFamiliesOutsideThisLane: f.importedBy.filter((imp) => !fams.some((x) => x.familyId === imp)) }));
  assignments.push(base(id, "packet-build", slug, {
    mission: fams.length === 0
      ? "This lane is provisioned and empty: no source-ready family remains for it at dispatch time. It starts the moment the source conveyor releases one, and the refill rule below says which."
      : `Build ${fams.length} packet families to the builder contract, one at a time, checkpointing as you go. A family that stops does not stop the lane.`,
    itemKind: "packetFamily",
    itemCount: fams.length,
    items: fams.map((f) => f.familyId),
    provisionedEmpty: fams.length === 0,
    refillRule: "When a source lane releases a family, Captain appends it to the emptiest PF lane and the lane starts it without waiting for the rest of the source lane to finish.",
    sharedAxes,
    groupsCarried: pfBuckets[i].map((g) => ({ groupKey: g.groupKey, families: g.families.map((f) => f.familyId) })),
    familyDetail: fams.map((f) => ({
      familyId: f.familyId, jurisdiction: f.jurisdiction, strategy: f.implementationStrategy,
      forms: f.forms, components: f.packetComponents.length, instrumentKinds: f.instrumentKinds,
      routeCount: f.routeCount, directory: f.directory, buildScript: f.buildScript,
      sharedBuildHost: f.sharedBuildHost, sourceStatus: f.sourceStatus, sourceHashes: f.sourceHashes
    })),
    builderObligations: BUILDER_OBLIGATIONS,
    rowStopContract: ROW_STOP_CONTRACT,
    taskIsolation: TASK_ISOLATION,
    checkpointRule: "Return every five completed families, or every two hours, whichever comes first. Do not hold a whole assignment back for the last family.",
    neverSelfVerify: "You do not verify your own packets. A builder verdict is not a verdict, and a VF lane that did not build them decides.",
    ownedPaths: [`${FACT}/${slug}/**`, ...fams.map((f) => `${f.directory}/**`), ...scriptsOwned],
    scriptsNotOwned,
    prohibitedPaths: [
      "scripts/rcap-packet-completeness/**",
      `${LC}/**`,
      ...scriptsNotOwned.map((s) => s.script),
      ...activePaths.map((p) => p.path)
    ],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced`,
      `${FACT}/${slug}/checkpoints.json — one entry per five-family checkpoint, written as it lands`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>"],
    stopConditions: [
      "ROW STOP — a family whose source does not bind by exact SHA-256 is STOPPED as BLOCKED_SOURCE naming the identity that failed. Continue to the next family.",
      "ROW STOP — a family that needs a legal input you do not have is STOPPED as BLOCKED_LEGAL_INPUT. Never guess a legal answer and never research one.",
      "LANE STOP — you build only the families listed here, in only the paths listed here.",
      "NEVER invent a fact. An unavailable fact is REQUIRED_BEFORE_FILING, declared and disclosed, never guessed.",
      "NEVER commit a private source byte, and never write into private/.",
      "NEVER open a commercial route and never touch Production."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES ASSIGNED:", "ROWS RETURNED (must equal FAMILIES ASSIGNED):",
      "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES TOUCHED BY A STOPPED FAMILY: 0",
      "CHECKPOINTS RETURNED:", "PACKETS SELF-VERIFIED: 0",
      "OTHER PF PROMPTS EXECUTED IN THIS CONTAINER: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14", "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "A built family is a built family. It is not verified, not approved, not sellable."
  }));
}

/* ---- VF01..VF08 ---- */
const verifiablePool = [...verifyPending];
for (let i = 0; i < VF_LANES; i += 1) {
  const id = `VF${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const seedItems = verifiablePool.filter((_, j) => j % VF_LANES === i).map((f) => f.familyId);
  /* A verifier with nothing to inspect must not be launched: its checkout would
   * predate the packet commit it exists to read, and it would verify an artifact
   * that is not there yet. It is PROVISIONED and started by Captain on the first
   * integrated checkpoint that gives it families. */
  const launchable = seedItems.length > 0;
  assignments.push(base(id, "independent-verification", slug, {
    mission: "Verify returned packet families independently, in rolling checkpoints, as builders land them. You claim, you measure, you record a verdict. You never edit what you verify.",
    itemKind: "streamingClaim",
    itemCount: seedItems.length,
    items: seedItems,
    seedItemsAreNotTheWholeJob: "These are the families already complete and awaiting verification at dispatch. The rest arrive as PF checkpoints land; claim from the ledger.",
    /*
     * A verifier reads a packet commit. If that commit is not in its checkout,
     * it does not verify a packet -- it verifies the absence of one, and the
     * absence looks exactly like a defect. So an empty verifier is never
     * launched, and a launched one names the commit its seed packets exist at.
     */
    launchNow: launchable,
    launchRule: launchable
      ? `Launch now. Every seed family below is rendered at ${MINIMUM_CAPTAIN_SHA}, which your checkout must contain.`
      : "DO NOT LAUNCH YET. This lane is provisioned and holds no family. Captain launches it from a new HEAD on the first integrated checkpoint that gives it work. Started now, it would report an absent packet as a failing one.",
    verifiesCommit: launchable ? MINIMUM_CAPTAIN_SHA : null,
    packetDirectories: seedItems.map((f) => familyIndex.get(f)?.directory).filter(Boolean),
    mayNotBeRunBy: [
      "the worker that built or last repaired any family below",
      "any PF or FIX lane in this dispatch"
    ],
    independenceIsThreeWay: "Not the builder, not the repairer, not a shard that has already formed a view of these packets. A second reading by the same eyes is not an independent one.",
    claimLedger: `${FACT}/claim-ledger.json`,
    claimRule: "Claim atomically before reading. A family already claimed is skipped, never queued behind: two verifiers on one family is duplicate work reported as independent proof.",
    checkpointRule: "Take rolling five-to-ten-family checkpoints as soon as they land. Do not wait for a whole builder assignment.",
    proofObligations: [
      "ROUTE IDENTITY: the packet is built for the route the record names",
      "SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes",
      "COMPONENT SET: every component the route names is rendered and present",
      "KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to",
      "REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file",
      "ROUTE OPTIONS: every route-determined election is selected",
      "REPEATING ROWS: no row carries written cells beside required cells left blank",
      "PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink",
      "ARTIFACTS: canonical and boundary bytes hash to what the record names",
      "PAGE ORDER: the rendered page order matches the packet manifest",
      "CLIPPING AND OVERLAP: no ink outside a measured write box",
      "FILING DESTINATION: the instructions name the court or agency the route names",
      "FEE AND WAIVER: the fee and any waiver route are stated",
      "SERVICE: who must be served, and how",
      "SELF-HELP STOP: the packet states where self-help ends"
    ],
    verdicts: VERDICTS,
    verdictRule: `Exactly one of ${VERDICTS.join(", ")} per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read from the builder's report.`,
    independenceRule: "You did not build these families and you may not repair them. A defect you find is a verdict and a repair assignment, never an edit.",
    ownedPaths: [`${FACT}/${slug}/**`],
    prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**", `${LC}/**`, ...activePaths.map((p) => p.path)],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family claimed: itemId, verdict, the fifteen proof obligations as you measured them, and the evidence read`,
      `${FACT}/${slug}/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect and the exact failed proof obligations`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: VERDICTS, rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>"],
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script.",
      "LANE STOP — you claim before you read.",
      "ROW STOP — a family blocked by its source is BLOCKED_SOURCE and one blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES CLAIMED:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES MODIFIED: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14", "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no commercial route."
  }));
}

/* ---- the sixteen-lane source swarm ---- */
for (const op of SOURCE_OPERATIONS) {
  for (let i = 1; i <= op.lanes; i += 1) {
    const id = `${op.prefix}${String(i).padStart(2, "0")}`;
    const slug = id.toLowerCase();
    const rows = sourceRows.filter((r) => r.lane === id);
    const fams = [...new Set(rows.map((r) => r.familyId))].sort();
    const hosts = [...new Set(rows.map((r) => r.jurisdiction))].filter(Boolean).sort();
    assignments.push(base(id, "source-swarm", slug, {
      operation: op.operation,
      mission: rows.length === 0
        ? `${op.mission} No obligation of this class is queued for this host group at dispatch; the lane starts the moment one arrives.`
        : op.mission,
      itemKind: "sourceObligation",
      preflightMustReturn: "SOURCE_CONVEYOR_PREFLIGHT_READY",
      itemCount: rows.length,
      items: rows.map((r) => `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`),
      itemDetails: rows.map((r) => ({
        itemId: `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`,
        sourceId: r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED",
        jurisdiction: r.jurisdiction,
        familyIds: [r.familyId],
        currentOperation: op.operation,
        requiredInput: op.prefix === "DISC" ? "unresolved exact identity or URL"
          : op.prefix === "SRC" ? "named held-corpus identity or pinned SHA-256"
          : op.prefix === "ACQ" ? "approved exact HTTPS officialUrl in SOURCE_ACQUISITION_MANIFEST.json"
          : "exact artifactName and receiptPath from a named acquisition run or held-corpus evidence",
        handoffOperation: op.prefix === "DISC" ? "ACQ" : op.prefix === "SRC" ? "PROMO" : op.prefix === "ACQ" ? "PROMO" : "CAPTAIN"
      })),
      boundedBy: op.bounded,
      issuingHosts: hosts,
      // PROSPECTIVE, not achieved: the families this lane WOULD release if every
      // one of its obligations resolved. Nothing here is promoted yet.
      familiesThisLaneWouldRelease: fams.filter((f) => releaseOwner.get(f) === id),
      familiesThisLaneWouldReleaseCount: fams.filter((f) => releaseOwner.get(f) === id).length,
      countIsProspective: true,
      countMeaning: "families this lane would release if all of its obligations resolve. It is not a count of promoted sources and must not be read as one.",
      familiesUnblocked: fams.filter((f) => releaseOwner.get(f) === id),
      familiesUnblockedCount: fams.filter((f) => releaseOwner.get(f) === id).length,
      familiesUnblockedIsProspectiveAlias: "kept so an existing reader does not silently see zero; it means familiesThisLaneWouldRelease and nothing more",
      familiesAdvancedButNotReleasedHere: fams.filter((f) => releaseOwner.get(f) !== id)
        .map((f) => ({ familyId: f, releasedOnlyWhenAllOf: [...lanesHoldingFamily.get(f)].sort() })),
      splitFamilyRule: "A family whose obligations are split across lanes is released by no single lane. You advance it; the family is released when the last of the named lanes clears its share. Reporting it released alone is a duplicate release and is refused at integration.",
      absenceClasses: op.absence,
      everyResolvedSourceRecords: [
        "official publisher", "exact title", "form number", "revision", "official URL",
        "MIME type", "page count", "technology (acroform, xfa, flat)", "SHA-256", "byte size", "custody path"
      ],
      recordsForThisOperation: op.records,
      requiredRecordSchema: recordSchemaFor(op.prefix),
      handsOffTo: op.handsOffTo,
      dispatchImmediately: op.prefix === "DISC"
        ? "The moment you know an exact official URL, hand it to the ACQ lane for this host. Do not hold it until the rest of your obligations resolve."
        : op.prefix === "PROMO"
          ? "The moment a family's last source is promoted, report it released. Captain assigns it to the next available PF lane without waiting for this lane to finish."
          : "Report each resolution as it lands rather than at the end of the lane.",
      acquisitionWorkflow: op.prefix === "ACQ" ? ".github/workflows/rcap-official-source-acquisition.yml" : null,
      oneDispatchPerUrl: op.prefix === "ACQ" ? "One official URL, one dispatch, one receipt. A second dispatch for a URL already dispatched is a duplicate obligation and is refused." : null,
      promotionRule: op.prefix === "PROMO" ? "A source is promoted only with exact bytes: a custody path that exists and a SHA-256 that matches the indexed entry. A promotion without bytes releases a family into a builder that cannot open its source." : null,
      releaseRule: "Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.",
      continueAfterFailure: "An obligation that cannot be settled is a STOPPED row. The lane continues to the next one.",
      egressReality: "This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.",
      ownedPaths: [`${FACT}/${slug}/**`, `data/rcap-grade-a/source-acquisition/packet-factory-24h/${slug}/**`],
      prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", `${LC}/**`, "private/**", ...activePaths.map((p) => p.path)],
      requiredOutputs: [
        `${FACT}/${slug}/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases`,
        `data/rcap-grade-a/source-acquisition/packet-factory-24h/${slug}/receipts.json — the eleven recorded fields per resolved source; no body is committed`
      ],
      outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
      focusedTests: ["node scripts/grade-a-packet-factory-24h/verify.mjs"],
      stopConditions: [
        "NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.",
        "NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.",
        "NEVER promote a source without exact bytes. A promotion is a release, and a released family goes to a builder that will try to open the file.",
        "LANE STOP — you build no packet and you touch no overlay directory.",
        "ROW STOP — an obligation that cannot be settled here is STOPPED naming the exact host and the next operation that owns it."
      ],
      returnFormat: [
        "ASSIGNMENT:", "OPERATION:", "BASE SHA:", "COMMIT:",
        "OBLIGATIONS RESOLVED:", "OBLIGATIONS STOPPED:",
        "HANDED OFF:", "FAMILIES RELEASED:",
        "IDENTITIES GUESSED: 0", "SOURCE BODIES COMMITTED: 0", "PROMOTIONS WITHOUT EXACT BYTES: 0",
        "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
        "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14", "DIFF LEFT FOR THE CODEX UI: YES"
      ],
      grantsNothing: "A bound source is a bound source. It builds nothing, proves nothing and approves nothing."
    }));
  }
}

/* ---- FIX01..FIX04 ---- */
const fixSeed = repairRequired;
for (let i = 0; i < FIX_LANES; i += 1) {
  const id = `FIX${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const items = fixSeed.filter((_, j) => j % FIX_LANES === i);
  assignments.push(base(id, "rapid-repair", slug, {
    mission: "Repair exactly the proof obligations a verifier failed, on exactly the families it failed them on. Nothing else.",
    itemKind: "packetFamily",
    itemCount: items.length,
    items: items.map((f) => f.familyId),
    seedItemsAreNotTheWholeJob: "These are the families already failing at dispatch. The rest arrive as VF verdicts land.",
    receivesOnly: "the failed families and their exact failed proof obligations",
    doNotRepeatAnalysis: "A repair lane does not repeat broad family analysis. If the failure is not reproducible from the obligations you were given, stop and say so rather than re-deriving the family.",
    reverificationRule: "After repair, the family goes to a verifier that is neither its builder nor its repairer. Captain routes it; you do not choose.",
    detail: items.map((f) => ({ familyId: f.familyId, directory: f.directory, failingCounters: f.failingCounters, counters: f.counters })),
    ownedPaths: [`${FACT}/${slug}/**`, ...items.map((f) => `${f.directory}/**`), ...items.filter((f) => f.exclusiveScript).map((f) => f.buildScript)],
    prohibitedPaths: ["scripts/rcap-packet-completeness/**", `${LC}/**`, ...activePaths.map((p) => p.path)],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family: itemId, status, the obligation repaired, and the nine counters after`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>"],
    stopConditions: [
      "LANE STOP — you do not change the completeness contract.",
      "LANE STOP — only the families and obligations handed to you.",
      "ROW STOP — an obligation you cannot repair without re-deriving the family is STOPPED with what is missing.",
      "NEVER invent a fact and never write a protected field."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES REPAIRED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14", "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "A repaired family is a repaired family. It must be verified again, by someone who neither built nor repaired it."
  }));
}

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;

/* ---------------------------------------------------------------- *
 * Collisions
 * ---------------------------------------------------------------- */
const wavePaths = assignments.flatMap((a) => a.ownedPaths.map((p) => ({ lane: a.assignmentId, path: p })));
const collisions = [];
for (const mine of wavePaths) {
  for (const other of activePaths) if (touches(mine.path, other.path)) collisions.push({ kind: "ACTIVE_OWNERSHIP", lane: mine.lane, path: mine.path, other: other.lane, otherPath: other.path });
}
for (let i = 0; i < wavePaths.length; i += 1) {
  for (let j = i + 1; j < wavePaths.length; j += 1) {
    if (wavePaths[i].lane === wavePaths[j].lane) continue;
    if (touches(wavePaths[i].path, wavePaths[j].path)) collisions.push({ kind: "WITHIN_WAVE", lane: wavePaths[i].lane, path: wavePaths[i].path, other: wavePaths[j].lane, otherPath: wavePaths[j].path });
  }
}
/* A family may be built by one lane and verified by another; a duplicate is a
 * collision only within one kind of work. */
const duplicateFamilies = [];
const byLaneKind = new Map();
for (const a of assignments) {
  if (a.itemKind !== "packetFamily") continue;
  for (const f of a.items) {
    const key = `${a.lane}::${f}`;
    if (byLaneKind.has(key)) duplicateFamilies.push({ familyId: f, lane: a.lane, claimedBy: [byLaneKind.get(key), a.assignmentId] });
    byLaneKind.set(key, a.assignmentId);
  }
}
const activeReDispatched = assignments.filter((a) => a.itemKind === "packetFamily")
  .flatMap((a) => a.items.filter((f) => activeFamilies.has(f)).map((f) => ({ familyId: f, lane: a.assignmentId, activeOwner: activeFamilies.get(f) })));

/* Shared host with two writers. */
const hostWriters = new Map();
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    if (!/^scripts\/build-census-v1-.+\.mjs$/.test(p)) continue;
    if (!hostWriters.has(p)) hostWriters.set(p, []);
    hostWriters.get(p).push(a.assignmentId);
  }
}
const sharedHostCollisions = [...hostWriters.entries()].filter(([, ls]) => ls.length > 1).map(([script, lanes]) => ({ script, lanes }));

const ownedAndProhibited = [];
for (const a of assignments) {
  const owned = a.ownedPaths.map(rootOf);
  for (const p of a.prohibitedPaths ?? []) {
    const r = rootOf(p);
    if (owned.some((o) => o === r || o.startsWith(`${r}/`))) ownedAndProhibited.push({ lane: a.assignmentId, path: p });
  }
}
const unwritableOutputs = [];
for (const a of assignments) {
  for (const o of a.requiredOutputs) {
    const p = o.split("—")[0].trim().split(/[\s,]+/)[0].replace(/\/$/, "");
    if (!p || !/^[A-Za-z0-9_./*<>-]+$/.test(p)) { unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "names no path" }); continue; }
    if (!a.ownedPaths.map(rootOf).some((root) => p === root || p.startsWith(`${root}/`))) unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "outside every owned path" });
  }
}
/*
 * A double-underscore token is a placeholder only when it stands alone. The
 * Master Library names its binaries AL__FORM__C-10-CRIMINAL__..., so an
 * unanchored pattern reads every corpus path as an unfilled template and
 * refuses a dispatch for carrying real source filenames.
 */
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|(?<![A-Za-z0-9])__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__(?![A-Za-z0-9])/;
/* Placeholder detection ignores the fields that legitimately carry a literal
 * <FAMILY_ID> or a shell template: the preflight line, the stop conditions and
 * the focused tests are instructions to a worker, not values left unfilled. */
const scrubbed = (a) => JSON.stringify({
  ...a, requiredOutputs: undefined, stopConditions: undefined, focusedTests: undefined,
  returnFormat: undefined, builderObligations: undefined, proofObligations: undefined,
  preflight: undefined, prohibitedCommands: undefined, prohibitedPaths: undefined,
  scriptsNotOwned: undefined, claimRule: undefined, checkpointRule: undefined,
  everyAcquiredSourceRecords: undefined, seedItemsAreNotTheWholeJob: undefined
});
const placeholders = assignments.filter((a) => PLACEHOLDER.test(scrubbed(a))).map((a) => a.assignmentId);

/* A source-blocked or legally blocked family must never be handed to a builder. */
const blockedInPF = assignments.filter((a) => a.lane === "packet-build")
  .flatMap((a) => a.items.map((f) => families.find((x) => x.familyId === f)))
  .filter((f) => f && (f.state === "SOURCE_BLOCKED" || f.legalInputStatus === "OPEN_LEGAL_INPUT"))
  .map((f) => f.familyId);

const problems = [];
if (collisions.length) problems.push(`${collisions.length} path collision(s)`);
if (duplicateFamilies.length) problems.push(`${duplicateFamilies.length} duplicate famil(ies)`);
if (activeReDispatched.length) problems.push(`${activeReDispatched.length} active famil(ies) re-dispatched`);
if (sharedHostCollisions.length) problems.push(`${sharedHostCollisions.length} shared host(s) with two writers`);
if (ownedAndProhibited.length) problems.push(`${ownedAndProhibited.length} path(s) owned and prohibited at once`);
if (unwritableOutputs.length) problems.push(`${unwritableOutputs.length} unwritable output(s)`);
if (placeholders.length) problems.push(`${placeholders.length} assignment(s) with a placeholder: ${placeholders.slice(0, 3).join(", ")} -> ${(scrubbed(assignments.find((a) => a.assignmentId === placeholders[0])).match(PLACEHOLDER) ?? []).join("|")}`);
if (blockedInPF.length) problems.push(`${blockedInPF.length} blocked famil(ies) assigned to a builder`);
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real minimum Captain SHA");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) problems.push("the minimum Captain SHA is not an ancestor of HEAD");
if (assignments.length !== PF_LANES + VF_LANES + SOURCE_LANES + FIX_LANES) problems.push(`${assignments.length} lanes, expected ${PF_LANES + VF_LANES + SOURCE_LANES + FIX_LANES}`);
for (const e of ELASTICITY) {
  const have = assignments.filter((a) => e.creates.includes(a.assignmentId)).length;
  if (e.triggered && have !== e.creates.length) problems.push(`${e.id} elasticity is triggered at ${e.measured} and only ${have} of ${e.creates.length} extra lane(s) exist`);
  if (!e.triggered && have !== 0) problems.push(`${e.id} elasticity is not triggered and ${have} extra lane(s) exist anyway`);
}
if (problems.length) {
  console.error(`packet factory 24h: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

/* ---------------------------------------------------------------- *
 * Records
 * ---------------------------------------------------------------- */
const countBy = (pool, key) => pool.reduce((acc, f) => ({ ...acc, [f[key]]: (acc[f[key]] ?? 0) + 1 }), {});

const masterQueue = {
  schemaVersion: "rcap-packet-factory-24h-master-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate.mjs",
  question: "What is every packet family's exact state, owner and next action right now?",
  everyCountIsDerived: "The denominator is recomputed from the census scoreboard, the census routes, the custody reconciliation, the completeness matrix, the S2 continuation and the tree itself. No number here is carried forward from a previous record.",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  inputs: Object.fromEntries(Object.entries(INPUTS).map(([, p]) => [p, sha(p)])),
  stateVocabulary: STATES,
  denominator: {
    liveFamilyDenominator: families.length,
    activeFamiliesExcluded: active.length,
    guidanceOnly: guidance.length,
    remaining: remaining.length,
    sourceReady: sourceReady.length,
    sourceBlocked: sourceBlocked.length,
    legalBlocked: legalBlocked.length,
    verifyPending: verifyPending.length,
    repairRequired: repairRequired.length,
    sumsToDenominator: active.length + guidance.length + remaining.length === families.length
  },
  byState: countBy(families, "state"),
  bySourceStatus: countBy(families, "sourceStatus"),
  activeOwnership: {
    lanes: ACTIVE_LANES.map((a) => a.assignmentId),
    families: [...activeFamilies.keys()].sort(),
    paths: activePaths.length,
    rule: "Excluded from every new assignment. A collision with active ownership fails this generator rather than appearing as a note."
  },
  theHonestShape: {
    buildersProvisioned: PF_LANES,
    sourceReadyFamilies: sourceReady.length,
    familiesPerBuilder: PF_LANES > 0 ? Number((sourceReady.length / PF_LANES).toFixed(1)) : 0,
    targetPerBuilder: "15 to 25",
    finding: `Thirty-two lanes are created and queued as instructed. The builders are limited by how many families hold an exactly-identified official source: ${sourceReady.length} do, so a full roster of ${PF_LANES} builders averages ${(sourceReady.length / PF_LANES).toFixed(1)} families each rather than 15 to 25.`,
    whatWouldChangeIt: `The source conveyor. ${sourceRows.length} source obligations across ${sourceBlocked.length + legalBlocked.length} families stand between this dispatch and a full builder roster, and the sixteen-lane source swarm holds every one of them.`,
    whyNotFewerBuilders: "The roster is kept at sixteen because the instruction is a 24-hour rolling factory: a lane that is empty at dispatch is the lane a released family starts in an hour from now, and provisioning it later costs a cycle.",
    noFalsePass: "No source-blocked or legally blocked family is assigned to a builder. Each carries one exact blocker, one owner and one next action instead."
  },
  families,
  totals: {
    lanes: assignments.length,
    builders: PF_LANES, verifiers: VF_LANES, sourceLanes: SOURCE_LANES, repairLanes: FIX_LANES,
    familiesAssignedToBuilders: sourceReady.length,
    sourceObligationsAssigned: sourceRows.length,
    /*
     * Two counts that cannot be mistaken for each other.
     *
     * actualPromotedAndReleased is the achieved figure: families every one of
     * whose sources is held, indexed and hash-matched right now, so a builder
     * can open them today.
     *
     * currentlyPromotionReady is the next step, not the achieved one: families
     * whose remaining obligations all sit in a PROMO lane, meaning the bytes
     * exist and only the custody record is outstanding.
     *
     * Neither is the sum of the source lanes' prospective release counts, and
     * that sum is deliberately not reported as a total here.
     */
    actualPromotedAndReleased: sourceReady.length,
    actualPromotedAndReleasedMeaning: "families whose every source is held, indexed and hash-matched now — buildable today",
    currentlyPromotionReady: [...new Set(sourceRows.filter((r) => r.operation === "PROMO").map((r) => r.familyId))]
      .filter((f) => sourceRows.filter((r) => r.familyId === f).every((r) => r.operation === "PROMO")).length,
    currentlyPromotionReadyMeaning: "families whose only remaining obligations are promotions — the bytes exist and the custody record does not",
    prospectiveReleasesAcrossSourceLanes: [...new Set(sourceRows.map((r) => r.familyId))].length,
    prospectiveReleasesMeaning: "families the conveyor would release if every obligation in it resolved. A forecast, not an achievement.",
    commercialRoutesOpened: 0,
    productionTouched: false
  },
  commercialPosture: "This factory builds, verifies, repairs and acquires. It opens no commercial route, proves no fulfillment authority and approves no output."
};

const activeAssignmentsRecord = {
  schemaVersion: "rcap-packet-factory-24h-active-assignments/v1",
  generatedBy: masterQueue.generatedBy,
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  captainBranch: CAPTAIN_BRANCH,
  executionContract: CONTRACT,
  concurrency: {
    lanesCreated: assignments.length,
    rule: "If available Codex concurrency is lower than 32, every assignment is still created and queued. When a task finishes, the next queued task starts immediately.",
    startOrder: [
      "SRC01-SRC04 and every PF lane holding families start together — the conveyor and the builders are not sequential",
      "VF lanes start on the first PF checkpoint, not on a completed assignment",
      "FIX lanes start on the first FAIL_REPAIR_REQUIRED verdict",
      "an empty PF lane starts the moment a source lane releases a family into it"
    ],
    idleRule: "A lane is idle only when no executable work exists for its kind. An empty PF lane at dispatch is idle because the source queue is empty for it, and the source lanes are the work that ends that."
  },
  assignments
};

const importGraphRecord = {
  schemaVersion: "rcap-packet-factory-24h-import-graph/v1",
  generatedBy: masterQueue.generatedBy,
  question: "Which build scripts are shared, and may a lane own the script its family uses?",
  scriptsScanned: scriptFiles.length,
  rule: "A family worker may own a family-specific script only when no unassigned family imports it. One shared host has one owner.",
  edges: scriptFiles.map((f) => ({ script: f, imports: directImports.get(f) ?? [], transitiveImports: transitiveImportsOf(f), importedBy: importersOf(f) })).filter((e) => e.imports.length || e.importedBy.length),
  sharedHosts: scriptFiles.filter((f) => importersOf(f).length > 1).map((f) => ({ script: f, importers: importersOf(f).map(familyOfScript), owner: hostWriters.get(`${SCRIPTS}/${f}`)?.[0] ?? "UNOWNED_IN_THIS_WAVE" })),
  scriptsWithheldFromLanes: assignments.filter((a) => (a.scriptsNotOwned ?? []).length).map((a) => ({ lane: a.assignmentId, withheld: a.scriptsNotOwned }))
};

const collisionsRecord = {
  schemaVersion: "rcap-packet-factory-24h-collisions/v1",
  generatedBy: masterQueue.generatedBy,
  checkedAgainst: { activeLanes: ACTIVE_LANES.map((a) => a.assignmentId), activePaths: activePaths.length, wavePaths: wavePaths.length, comparisons: wavePaths.length * activePaths.length + (wavePaths.length * (wavePaths.length - 1)) / 2 },
  results: { pathCollisions: collisions, duplicateFamilies, activeFamiliesReDispatched: activeReDispatched, sharedHostCollisions, ownedAndProhibited, requiredOutputsOutsideOwnedPaths: unwritableOutputs, placeholders, blockedFamiliesAssignedToBuilders: blockedInPF },
  counts: { pathCollisions: collisions.length, duplicateFamilies: duplicateFamilies.length, activeFamiliesReDispatched: activeReDispatched.length, sharedHostCollisions: sharedHostCollisions.length, ownedAndProhibited: ownedAndProhibited.length, requiredOutputsOutsideOwnedPaths: unwritableOutputs.length, placeholders: placeholders.length, blockedFamiliesAssignedToBuilders: blockedInPF.length },
  rule: "A nonzero count here fails the generator. This record exists so the zero can be read rather than trusted."
};

const checkpointRecord = {
  schemaVersion: "rcap-packet-factory-24h-checkpoint/v1",
  generatedBy: masterQueue.generatedBy,
  everyCountIsDerived: "No number here is typed.",
  cadence: "every 2 hours",
  checkpointNumber: 0,
  checkpointMeans: "checkpoint 0 is the dispatch: the state the first two-hour checkpoint is measured against.",
  liveFamilyDenominator: families.length,
  completePacketProven: families.filter((f) => f.state === "COMPLETE_PACKET_PROVEN").length,
  states: Object.fromEntries(STATES.map((s) => [s, families.filter((f) => f.state === s).length])),
  sourceReady: sourceReady.length,
  sourceBlocked: sourceBlocked.length,
  assigned: sourceReady.length,
  completedSinceLastCheckpoint: 0,
  newlySourceReady: 0,
  returnedForRepair: 0,
  codex: {
    activeTasks: 0,
    queuedTasks: assignments.length,
    lanesWithWorkAtDispatch: assignments.filter((a) => (a.items ?? []).length > 0).length,
    lanesProvisionedEmpty: assignments.filter((a) => (a.items ?? []).length === 0).length,
    idleCapacityRule: "A provisioned-empty lane is not idle capacity being wasted; it is capacity waiting on the source conveyor, which is itself fully assigned."
  },
  blockers: [...sourceBlocked, ...legalBlocked].map((f) => ({
    family: f.familyId,
    exactBlocker: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "an open legal input on one of its routes"
      : f.routeMappingStatus === "UNBOUND_TO_A_PACKET_FAMILY" ? "no census route binds this id to a packet family"
      : `${f.sourceStatus}: ${(f.sourceIds ?? []).join(", ") || "no document-shaped source named"}`,
    owner: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "counsel" : (sourceRows.find((r) => r.familyId === f.familyId)?.lane ?? "PROMO03"),
    nextAction: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "await the counsel determination; do not research it here"
      : f.routeMappingStatus === "UNBOUND_TO_A_PACKET_FAMILY" ? "Captain route/family binding"
      : "resolve or acquire the exact source identity, then release into the next available PF lane"
  })),
  commercialRoutesOpened: 0,
  productionTouched: false
};

/* ---------------------------------------------------------------- *
 * Prompts
 * ---------------------------------------------------------------- */
const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``);
  p.push(`**Branch in the container:** \`work\` — Codex Cloud names it. Do not rename it and do not create another.`);
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\` (or the newer dispatch base)`);
  p.push(`**Execution contract:** \`${a.executionContract}\` — read it before you start.`);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.", "");
  if (a.taskIsolation) {
    p.push("> ## " + a.taskIsolation[0], ">", ...a.taskIsolation.slice(1).map((l) => `> **${l}**`), "");
  }
  if (a.rowStopContract) {
    const rc = a.rowStopContract;
    p.push("## Two gates, and only one of them stops the lane", "");
    p.push(`### 1. Lane gate — ${rc.laneGate.what}`, "", "```sh",
      "source $HOME/.legalease-corpus-env",
      rc.laneGate.command.replace(" --codex-cloud", " \\\n  --codex-cloud").replace(" --minimum-captain-sha", " \\\n  --minimum-captain-sha").replace(" --assignment", " \\\n  --assignment"),
      "```", "");
    p.push(`Must print **\`${rc.laneGate.mustReturn}\`**. ${rc.laneGate.onFailure}`, "", `_${rc.laneGate.note}_`, "");
    p.push(`### 2. Row gate — ${rc.rowGate.what}, once per family`, "", "```sh", rc.rowGate.command, "```", "");
    p.push(`- **family_sources_bind fails** → ${rc.rowGate.onFamilySourcesBindFailure}`);
    p.push(`- **an open legal input** → ${rc.rowGate.onOpenLegalInput}`);
    p.push(`- **any other check fails** → ${rc.rowGate.onAnyOtherCheckFailing}`, "");
    p.push(`**${rc.everyFamilyGetsExactlyOneRow}**`, "");
    p.push(`**${rc.aStoppedFamilyWritesNothing}**`, "");
    p.push(rc.theLaneCompletesNormally, "");
  } else {
    p.push("## Before anything else", "", "```sh",
      "source $HOME/.legalease-corpus-env",
      `node ${PREFLIGHT} \\`,
      ...(a.itemKind === "sourceObligation" ? [
        `  --assignment-id ${a.assignmentId} \\`,
        ...(a.items?.length ? [`  --source-obligation '${a.items[0].replaceAll("'", "'\\''")}' \\`] : [])
      ] : [`  --family ${a.items?.[0] ?? "<FAMILY_ID>"} \\`]),
      "  --codex-cloud \\",
      `  --minimum-captain-sha ${a.minimumCaptainSha}`,
      "```", "");
    p.push(`It must print **\`${a.preflightMustReturn}\`**.${a.itemKind === "sourceObligation" ? " The lane gate and each owned row gate must both pass." : " A 13/14 in cloud mode is a real failure, not the shallow checkout being tolerated."}`, "");
  }
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Mission", "", a.mission, "");
  if (a.provisionedEmpty) p.push(`**This lane has no families at dispatch.** ${a.refillRule}`, "");

  if (a.itemKind === "packetFamily" && a.familyDetail) {
    p.push(`## The ${a.itemCount} families`, "");
    if (a.sharedAxes?.length) p.push(`Shared across the lane: **${a.sharedAxes.join(", ")}**. Grouped by shared host, official form, composer and component assembly — never by state.`, "");
    p.push("| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |", "| --- | --- | --- | --- | --- | ---: | --- |");
    for (const f of a.familyDetail) p.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${f.strategy} | ${f.forms.join(", ") || "—"} | ${f.instrumentKinds.join(", ") || "—"} | ${f.routeCount} | \`${f.directory}\` |`);
    p.push("");
  } else if (a.itemKind === "packetFamily") {
    p.push(`## The ${a.itemCount} famil${a.itemCount === 1 ? "y" : "ies"}`, "", (a.detail ?? a.items.map((f) => ({ familyId: f }))).map((d) => `- \`${d.familyId}\`${d.failingCounters?.length ? ` — failing: ${d.failingCounters.join(", ")}` : ""}`).join("\n"), "");
  } else if (a.itemKind === "sourceObligation") {
    p.push("## What bounds this lane", "", a.boundedBy, "");
    p.push(`**${a.itemCount} obligations · ${a.familiesThisLaneWouldReleaseCount} families this lane WOULD release if every one of them resolves · hosts: ${a.issuingHosts.join(", ") || "—"}**`, "");
    p.push(`> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.`, "");
    p.push(`> ${a.egressReality}`, "");
    p.push("### Required operation record schema", "", bullet(a.requiredRecordSchema), "");
    p.push("### Exact obligation rows", "", "| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const r of a.itemDetails) p.push(`| \`${r.itemId}\` | \`${r.sourceId}\` | ${r.jurisdiction} | \`${r.currentOperation}\` | ${r.familyIds.map((f) => `\`${f}\``).join(", ")} | ${r.requiredInput} | \`${r.handoffOperation}\` |`);
    if (!a.itemDetails.length) p.push(`| _No current obligations_ | — | — | \`${a.operation}\` | — | Lane remains queued; do not invent an input. | — |`);
    if (a.itemDetails.length) p.push("", "Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:", "", "```sh", `node ${PREFLIGHT} --assignment-id ${a.assignmentId} --source-obligation '${a.itemDetails[0].itemId.replaceAll("'", "'\\''")}' --codex-cloud --minimum-captain-sha ${a.minimumCaptainSha}`, "", "# A failed row is recorded STOPPED; continue with unrelated rows.", "```", "");
    p.push(`**${a.releaseRule}**`, "");
    p.push("### Families this lane would release", "", a.familiesThisLaneWouldRelease.map((f) => `\`${f}\``).join(", "), "");
  } else if (a.itemKind === "streamingClaim") {
    p.push("## How work reaches you", "", a.seedItemsAreNotTheWholeJob, "");
    p.push(`- **Claim ledger:** \`${a.claimLedger}\``, `- **Rule:** ${a.claimRule}`, `- **Cadence:** ${a.checkpointRule}`, "");
    if (a.items.length) p.push("### Families already awaiting verification at dispatch", "", a.items.map((f) => `\`${f}\``).join(", "), "");
    p.push("");
  }

  if (a.builderObligations) {
    p.push("## The builder contract — every family, all thirteen", "", bullet(a.builderObligations), "");
    p.push(`**${a.checkpointRule}**`, "", `**${a.neverSelfVerify}**`, "");
  }
  if (a.proofObligations) p.push("## Proof obligations — measure each, per family", "", bullet(a.proofObligations), "");
  if (a.verdicts) p.push("## Verdicts", "", bullet(a.verdicts.map((v) => `\`${v}\``)), "", a.verdictRule, "", `**${a.independenceRule}**`, "");
  if (a.receivesOnly) p.push("## What you receive", "", `Only ${a.receivesOnly}.`, "", a.doNotRepeatAnalysis, "", `**${a.reverificationRule}**`, "");

  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  if (a.scriptsNotOwned?.length) {
    p.push("### Scripts you may NOT own", "", "A family-specific script is yours only when no family outside this lane imports it. These are imported from outside and belong to nobody here:", "");
    for (const s of a.scriptsNotOwned) p.push(`- \`${s.script}\` — imported by ${s.importedByFamiliesOutsideThisLane.join(", ")}`);
    p.push("");
  }
  p.push("## Never write here", "", bullet([...new Set(a.prohibitedPaths)].slice(0, 24).map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "", "> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.", "");
  p.push("## How you return", "", a.theDiffIsTheReturn, "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

if (CHECK) {
  console.log(`packet factory 24h current: ${families.length} families, ${sourceReady.length} source-ready, ${assignments.length} lanes, ${collisions.length} collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, `${OUT_DIR}/MASTER_QUEUE.json`), `${JSON.stringify(masterQueue, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, `${OUT_DIR}/ACTIVE_ASSIGNMENTS.json`), `${JSON.stringify(activeAssignmentsRecord, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, `${OUT_DIR}/IMPORT_GRAPH.json`), `${JSON.stringify(importGraphRecord, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, `${OUT_DIR}/COLLISIONS.json`), `${JSON.stringify(collisionsRecord, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, `${OUT_DIR}/CHECKPOINT.json`), `${JSON.stringify(checkpointRecord, null, 2)}\n`);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));

console.log(`Wrote ${OUT_DIR}/{MASTER_QUEUE,ACTIVE_ASSIGNMENTS,IMPORT_GRAPH,COLLISIONS,CHECKPOINT}.json`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  live denominator ${families.length} = ${active.length} active + ${guidance.length} guidance-only + ${remaining.length} remaining`);
console.log(`  source-ready ${sourceReady.length} · source-blocked ${sourceBlocked.length} · legal-blocked ${legalBlocked.length} · verify-pending ${verifyPending.length} · repair ${repairRequired.length}`);
console.log(`  lanes: ${PF_LANES} PF · ${VF_LANES} VF · ${SOURCE_LANES} SRC · ${FIX_LANES} FIX = ${assignments.length}`);
console.log(`  collisions ${collisions.length} · duplicates ${duplicateFamilies.length} · shared-host collisions ${sharedHostCollisions.length} · placeholders ${placeholders.length}`);
for (const a of assignments.filter((x) => x.lane === "packet-build")) console.log(`    ${a.assignmentId}: ${String(a.itemCount).padStart(2)} famil(ies)  ${a.sharedAxes?.join(", ") || ""}`);
for (const a of assignments.filter((x) => x.lane === "source-swarm")) console.log(`    ${a.assignmentId}: ${String(a.itemCount).padStart(3)} obligations, ${a.familiesUnblockedCount} families`);
