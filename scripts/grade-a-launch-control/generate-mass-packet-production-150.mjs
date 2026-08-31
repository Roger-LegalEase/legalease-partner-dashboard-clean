#!/usr/bin/env node
/**
 * MASS_PACKET_PRODUCTION_150 — the serial wave becomes a pipeline.
 *
 *   node scripts/grade-a-launch-control/generate-mass-packet-production-150.mjs [--check]
 *
 * The target is 150 packet families a day. The constraint is that a family
 * cannot be built until its official source is bound by an exact identity, and
 * most of the national worklist is not. So this generator does not decide how
 * many families to dispatch: it derives the source-ready set, dispatches all of
 * it, and puts the rest of the day's capacity onto the exact source obligations
 * that let the next families enter tomorrow's queue.
 *
 * Nothing here is typed. Every count is derived from a committed record, and the
 * exclusion ladder gives each excluded family exactly one reason -- the first one
 * that applies -- so the arithmetic is auditable rather than asserted.
 *
 * Active ownership is preserved without exception. S1, S2, R8, P1 to P4, V1 to
 * V7 and R5 keep every family and every path they hold; a collision with any of
 * them fails this generator rather than appearing as a warning in its output.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const LC = "data/rcap-grade-a/launch-control";
const OUT = `${LC}/MASS_PACKET_PRODUCTION_150.json`;
const OUT_COLLISIONS = `${LC}/MASS_PACKET_PRODUCTION_150_COLLISIONS.json`;
const OUT_CHECKPOINT = `${LC}/MASS_PACKET_PRODUCTION_150_CHECKPOINT.json`;
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/mass-production-prompts";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const MP = "data/rcap-grade-a/mass-production";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

/* Pinned control baseline. Never HEAD at generation time: a manifest whose base
 * is the commit that carries it tells a worker to branch from a tree that already
 * contains the assignment, and the worker then cannot tell new work from old. */
const CAPTAIN_BASE_SHA = "27386bbf8471344143081de065311d761cfcf118";

const DAILY_TARGET = 150;
const BUILD_LANE_MIN = 10;
const BUILD_LANE_MAX = 15;
const VERIFY_LANE_MIN = 20;
const VERIFY_LANE_MAX = 30;
const BUILD_LANES_PROVISIONED = 12;
const VERIFY_LANES = 6;
const REVIEW_BATCH_SIZE = 25;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");

const INPUTS = {
  worklist: `${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`,
  completeness: "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
  wave2: `${LC}/WAVE_2_ASSIGNMENTS.json`,
  repairWave: `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
  s2: `${LC}/S2_SHARED_HOST_ASSIGNMENT.json`,
  wave2Repairs: `${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json`,
  residual: `${LC}/RESIDUAL_WORK.json`,
  custody: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json",
  scoreboard: "data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json",
  candidate: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  categoryB: `${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`,
  legalQueue: "data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2.json",
  staleBlock: "data/rcap-grade-a/stale-artifact-block.json",
  corpusIndex: "data/rcap-all50/local-source-corpus-index.json"
};
const IN = Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [k, read(p)]));

/* ------------------------------------------------------------------ *
 * 1. Active ownership. Nothing below may touch any of it.
 * ------------------------------------------------------------------ */
const PRESERVED_LANES = [
  "S1_SHARED_FACT_ALLOWLIST", "S2_SHARED_NE_SETASIDE_HOST_COMPLETENESS",
  "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR",
  "P1_UT_PETITION_EXPUNGE_COMPLETENESS", "P2_WA_VACATUR_COMPLETENESS",
  "P3_WV_CONVICTION_COMPLETENESS", "P4_NE_SD_SETASIDE_COMPLETENESS",
  "V1_INDEPENDENT_PACKET_VERIFICATION", "V2_INDEPENDENT_PACKET_VERIFICATION",
  "V3_INDEPENDENT_PACKET_VERIFICATION", "V4_INDEPENDENT_PACKET_VERIFICATION",
  "V5_INDEPENDENT_PACKET_VERIFICATION", "V6_INDEPENDENT_PACKET_VERIFICATION",
  "V7_INDEPENDENT_PACKET_VERIFICATION", "R5_NONPRODUCTION_ACCEPTANCE"
];

const activeAssignments = [...IN.wave2.assignments, ...IN.repairWave.assignments, ...IN.s2.assignments];
const activeFamilies = new Map();
const activePaths = [];
for (const a of activeAssignments) {
  for (const item of a.items ?? []) if (!activeFamilies.has(item)) activeFamilies.set(item, a.assignmentId);
  for (const p of a.ownedPaths ?? []) activePaths.push({ lane: a.assignmentId, path: p.split("(")[0].trim() });
}
for (const r of IN.wave2Repairs.assignments) {
  if (!activeFamilies.has(r.family)) activeFamilies.set(r.family, `WAVE_2_REPAIR:${r.shard}`);
  if (r.ownedPath) activePaths.push({ lane: `WAVE_2_REPAIR:${r.family}`, path: r.ownedPath });
}
for (const l of IN.residual.lanes ?? []) for (const p of l.ownedPaths ?? []) activePaths.push({ lane: l.residualLaneId, path: p.split("(")[0].trim() });
const currentBatch = new Set(IN.completeness.results.map((r) => r.familyId));
for (const f of currentBatch) if (!activeFamilies.has(f)) activeFamilies.set(f, "CURRENT_43_FAMILY_COMPLETENESS_BATCH");

/* A path matcher that reads ** and a trailing * the way the workers do. */
const pathMatches = (owned, candidate) => {
  const rx = new RegExp(`^${owned
    .split("**")
    .map((seg) => seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*")}(/.*)?$`);
  const root = owned.replace(/\/?\*+$/, "");
  return rx.test(candidate) || candidate === root || candidate.startsWith(`${root}/`);
};

/* ------------------------------------------------------------------ *
 * 2. Route facts, per packet family.
 * ------------------------------------------------------------------ */
const routesByFamily = new Map();
for (const r of IN.candidate.routes) {
  const key = r.packetSetId ?? r.packetFamilyId;
  if (!key) continue;
  if (!routesByFamily.has(key)) routesByFamily.set(key, []);
  routesByFamily.get(key).push(r);
}
const custodyByGroup = new Map(IN.custody.rows.map((r) => [r.worklistGroupId, r]));
const EXACT_TIERS = new Set(["exact_form_number", "content_hash", "exact_content_hash"]);

const overlayDirs = [];
for (const st of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const full = path.join(ROOT, OVERLAYS, st);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const d of fs.readdirSync(full)) overlayDirs.push(`${OVERLAYS}/${st}/${d}`);
}
const slugOf = (id) => id.replace(/_/g, "-").toLowerCase();
const strategySuffix = (s) => (s === "custom_pleading" ? "custom-pleading" : "official-pdf-fill");
const overlayDirFor = (f) => {
  const s = slugOf(f.familyId);
  const existing = overlayDirs.find((d) => path.basename(d).startsWith(`${s}--`));
  return existing ?? `${OVERLAYS}/${(f.jurisdictions[0] ?? "xx").toLowerCase()}/${s}--${strategySuffix(f.implementationStrategy)}`;
};
const buildScriptFor = (f) => `scripts/build-census-v1-${f.familyId}.mjs`;

const instrumentKinds = (routes) => [...new Set(routes.flatMap((r) => String(r.participantFacingInstrument ?? "")
  .split(/;\s*/).map((s) => s.split(":")[0].trim()).filter(Boolean)))].sort();
const formsOf = (routes) => [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? [])
  .filter((s) => s.startsWith("official-form:")).map((s) => s.slice("official-form:".length))))].sort();
const componentsOf = (routes) => [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? [])
  .filter((s) => s.startsWith("component:"))))].sort();

/* ------------------------------------------------------------------ *
 * 3. The exclusion ladder. One reason per family, first match wins.
 * ------------------------------------------------------------------ */
const confirmBRouteKeys = new Set(IN.categoryB.rows.filter((r) => r.finalDecision === "CONFIRM_B").map((r) => r.originalRouteKey));
const unresolvedCounselRouteKeys = new Set((IN.legalQueue.trueCounselQueue?.questions ?? []).filter((q) => !q.answered).map((q) => q.routeKey));
const staleBlockedFamilies = new Set(IN.staleBlock.blockedFamilies ?? IN.staleBlock.families ?? []);

const LADDER = [
  "ACTIVE_CURRENT_43_FAMILY_BATCH",
  "ACTIVE_ASSIGNMENT_ITEM",
  "ACTIVE_OWNED_PATH",
  "DUPLICATE_WORKLIST_GROUP",
  "NOT_A_PACKET_FAMILY",
  "CATEGORY_B_GUIDANCE_ONLY",
  "UNRESOLVED_LEGAL_DECISION_ROUTE",
  "STALE_ARTIFACT_BLOCKED",
  "SOURCE_NOT_BOUND",
  "SOURCE_IDENTITY_NOT_EXACT"
];

const seenFamilyId = new Set();
const excluded = [];
const production = [];
for (const f of IN.worklist.families) {
  const routes = routesByFamily.get(f.familyId) ?? [];
  const custody = custodyByGroup.get(f.worklistGroupId) ?? null;
  const dir = overlayDirFor(f);
  const inexact = (custody?.documentSources ?? []).filter((d) => !d.resolved || !EXACT_TIERS.has(d.tier));
  const drop = (reason, detail) => excluded.push({ familyId: f.familyId, worklistGroupId: f.worklistGroupId, reason, detail });

  if (currentBatch.has(f.familyId)) { drop("ACTIVE_CURRENT_43_FAMILY_BATCH", activeFamilies.get(f.familyId)); continue; }
  if (activeFamilies.has(f.familyId)) { drop("ACTIVE_ASSIGNMENT_ITEM", activeFamilies.get(f.familyId)); continue; }
  const pathOwner = activePaths.find((p) => pathMatches(p.path, dir));
  if (pathOwner) { drop("ACTIVE_OWNED_PATH", `${pathOwner.lane} owns ${pathOwner.path}`); continue; }
  if (seenFamilyId.has(f.familyId)) { drop("DUPLICATE_WORKLIST_GROUP", "a second worklist group names the same packet family; the family is counted once"); continue; }
  seenFamilyId.add(f.familyId);
  if (routes.length === 0) { drop("NOT_A_PACKET_FAMILY", "no census route binds this id to a packet family; it is a Captain route/family binding question"); continue; }
  if (routes.every((r) => confirmBRouteKeys.has(r.routeKey))) { drop("CATEGORY_B_GUIDANCE_ONLY", "every route was revalidated as CONFIRM_B: a stage, not a participant filing"); continue; }
  const counselRoute = routes.find((r) => unresolvedCounselRouteKeys.has(r.routeKey));
  if (counselRoute) { drop("UNRESOLVED_LEGAL_DECISION_ROUTE", counselRoute.routeKey); continue; }
  if (staleBlockedFamilies.has(f.familyId)) { drop("STALE_ARTIFACT_BLOCKED", "the stale-artifact block names this family"); continue; }
  if (!f.chain.source_bound) { drop("SOURCE_NOT_BOUND", custody?.custodyClass ?? "no custody row"); continue; }
  if (inexact.length > 0) { drop("SOURCE_IDENTITY_NOT_EXACT", inexact.map((d) => `${d.sourceId} (${d.tier ?? d.absence})`).join("; ")); continue; }

  const forms = formsOf(routes);
  const comps = componentsOf(routes);
  const kinds = instrumentKinds(routes);
  const scriptPath = buildScriptFor(f);
  const scriptExists = fs.existsSync(path.join(ROOT, scriptPath));
  production.push({
    familyId: f.familyId,
    worklistGroupId: f.worklistGroupId,
    jurisdiction: f.jurisdictions.join("/"),
    implementationStrategy: f.implementationStrategy,
    alreadyBuilt: f.chain.artifact_built,
    overlayDirectory: dir,
    overlayDirectoryExists: overlayDirs.includes(dir),
    buildScript: scriptPath,
    buildScriptExists: scriptExists,
    axes: {
      officialForm: forms.join("+") || "NONE",
      overlayComposer: f.implementationStrategy,
      componentAssembly: kinds.join("+") || "NONE",
      fieldMapSchema: overlayDirs.includes(dir) ? "EXISTING_OVERLAY_FIELD_MAP" : "NEW_FIELD_MAP",
      routeOptionLogic: `${routes.length}route/${routes.some((r) => /no filing/i.test(String(r.participantFacingInstrument))) ? "with-guidance-subroute" : "single-instrument"}/${[...new Set(routes.map((r) => r.processActor))].sort().join(",")}`,
      sharedBuildRunner: scriptExists ? scriptPath : "NEW_RUNNER"
    },
    forms,
    componentIds: comps,
    instrumentKinds: kinds,
    routeCount: routes.length,
    routeKeys: routes.map((r) => r.routeKey),
    sourceCustody: custody?.custodyClass ?? "NO_ACQUISITION_TASK_NAMED",
    firstMissingLink: f.firstMissingLink
  });
}

const exclusionCounts = Object.fromEntries(LADDER.map((r) => [r, excluded.filter((e) => e.reason === r).length]));

/* ------------------------------------------------------------------ *
 * 4. Grouping. Six axes; families that share a form set, a composer and a
 *    component assembly are one group, and lanes are packed from whole groups.
 * ------------------------------------------------------------------ */
const groups = new Map();
for (const f of production) {
  const key = `${f.axes.officialForm}::${f.axes.overlayComposer}::${f.axes.componentAssembly}`;
  if (!groups.has(key)) {
    groups.set(key, {
      groupKey: key,
      axes: { officialForm: f.axes.officialForm, overlayComposer: f.axes.overlayComposer, componentAssembly: f.axes.componentAssembly },
      families: []
    });
  }
  groups.get(key).families.push(f);
}
const groupList = [...groups.values()].sort((a, b) => b.families.length - a.families.length || a.groupKey.localeCompare(b.groupKey));

/* Similarity is measured on component assembly and instrument kinds, never on
 * the state. Two states whose petitions assemble the same way belong together;
 * two families in one state whose assemblies differ do not. */
const kindSet = (g) => new Set(g.families.flatMap((f) => f.instrumentKinds));
const jaccard = (a, b) => {
  const A = kindSet(a);
  const B = kindSet(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
};
/* Lane count is derived from the material, not chosen: with N families and a
 * contract lane size, only a narrow band of lane counts is valid at all. Take
 * the largest valid count, because more lanes is more parallelism at the same
 * total.
 *
 * Packing is similarity-first with a running size target, not balance-first. A
 * balance-first packer fills every lane evenly and produces five grab-bags --
 * which is worse than grouping by state, not better. Each lane is seeded with
 * the largest unplaced group and then accretes the most similar group that
 * still fits, until it reaches the share of the remaining families it owes. */
const totalProduction = production.length;
const maxLanes = Math.floor(totalProduction / BUILD_LANE_MIN);
const minLanes = Math.ceil(totalProduction / BUILD_LANE_MAX);
const laneCount = Math.max(1, Math.min(BUILD_LANES_PROVISIONED, Math.max(minLanes, Math.min(maxLanes, BUILD_LANES_PROVISIONED))));
const unplaced = [...groupList];
const laneBuckets = [];
const sizeOf = (b) => b.reduce((n, g) => n + g.families.length, 0);
for (let lane = 0; lane < laneCount && unplaced.length > 0; lane += 1) {
  const lanesLeft = laneCount - lane;
  const remaining = unplaced.reduce((n, g) => n + g.families.length, 0);
  const target = lanesLeft === 1 ? remaining : Math.min(BUILD_LANE_MAX, Math.ceil(remaining / lanesLeft));
  const bucket = [unplaced.shift()];
  while (sizeOf(bucket) < target && unplaced.length > 0) {
    const ceiling = lanesLeft === 1 ? BUILD_LANE_MAX : target;
    let bestIdx = -1;
    let best = -1;
    for (let i = 0; i < unplaced.length; i += 1) {
      if (sizeOf(bucket) + unplaced[i].families.length > ceiling) continue;
      const sim = Math.max(...bucket.map((b) => jaccard(b, unplaced[i])));
      if (sim > best) { best = sim; bestIdx = i; }
    }
    if (bestIdx < 0) break;
    bucket.push(unplaced.splice(bestIdx, 1)[0]);
  }
  laneBuckets.push(bucket);
}
/* Anything the target-driven pass could not place goes to the lane it is most
 * like among those that can still take it. */
while (unplaced.length > 0) {
  const g = unplaced.shift();
  const feasible = laneBuckets
    .map((b, j) => ({ j, b }))
    .filter((x) => sizeOf(x.b) + g.families.length <= BUILD_LANE_MAX)
    .map((x) => ({ ...x, sim: Math.max(...x.b.map((other) => jaccard(other, g))) }))
    .sort((a, b) => b.sim - a.sim || sizeOf(a.b) - sizeOf(b.b))[0];
  if (!feasible) { laneBuckets.push([g]); continue; }
  laneBuckets[feasible.j].push(g);
}
/* A lane under the floor is a worker slot spent proving the queue is empty.
 * Take the smallest group a lane can spare, preferring the most similar donor. */
for (let guard = 0; guard < 100; guard += 1) {
  const short = laneBuckets.findIndex((b) => sizeOf(b) < BUILD_LANE_MIN);
  if (short < 0) break;
  const need = BUILD_LANE_MIN - sizeOf(laneBuckets[short]);
  const donor = laneBuckets
    .map((b, j) => ({ j, b }))
    .filter((x) => x.j !== short)
    .flatMap((x) => x.b.map((g) => ({ j: x.j, b: x.b, g })))
    .filter((x) => sizeOf(x.b) - x.g.families.length >= BUILD_LANE_MIN
      && sizeOf(laneBuckets[short]) + x.g.families.length <= BUILD_LANE_MAX
      && x.g.families.length >= need)
    .map((x) => ({ ...x, sim: Math.max(...laneBuckets[short].map((other) => jaccard(other, x.g))) }))
    .sort((a, b) => b.sim - a.sim || a.g.families.length - b.g.families.length)[0];
  if (!donor) break;
  laneBuckets[donor.j].splice(laneBuckets[donor.j].indexOf(donor.g), 1);
  laneBuckets[short].push(donor.g);
}

/* ------------------------------------------------------------------ *
 * 5. Source lanes, bounded by inventory source class and issuing host.
 * ------------------------------------------------------------------ */
const blockedBySource = excluded.filter((e) => e.reason === "SOURCE_NOT_BOUND" || e.reason === "SOURCE_IDENTITY_NOT_EXACT");
const absenceRows = [];
for (const e of blockedBySource) {
  const c = custodyByGroup.get(e.worklistGroupId);
  const wl = IN.worklist.families.find((f) => f.worklistGroupId === e.worklistGroupId);
  const jurisdiction = (wl?.jurisdictions ?? []).join("/");
  const docs = c?.documentSources ?? [];
  let emitted = 0;
  for (const d of docs) {
    if (d.resolved && EXACT_TIERS.has(d.tier)) continue;
    emitted += 1;
    absenceRows.push({
      familyId: e.familyId,
      jurisdiction,
      sourceId: d.sourceId,
      absence: d.absence ?? (d.resolved ? `inexact_tier:${d.tier}` : "unresolved"),
      tier: d.tier ?? null
    });
  }
  if (emitted === 0) {
    absenceRows.push({ familyId: e.familyId, jurisdiction, sourceId: null, absence: "no_document_shaped_source_named", tier: null });
  }
}
const SOURCE_CLASSES = [
  {
    id: "SOURCE_1_NAMED_FORM_NUMBER_ACQUISITION",
    absence: ["named_form_number_not_in_corpus"],
    bound: "the issuing court or agency that publishes each named form number",
    mission: "Acquire the exact published edition of every form number the census names and the corpus does not carry, one issuing host at a time."
  },
  {
    id: "SOURCE_2_LABEL_IDENTITY_RESOLUTION",
    absence: ["label_does_not_identify_a_document"],
    bound: "the committed Nationwide inventory and the state packs, read only — nothing is fetched",
    mission: "Turn a descriptive label into a document identity: an exact form number or an exact content hash, resolved against committed inventories."
  },
  {
    id: "SOURCE_3_CONTENT_HASH_CURRENTNESS",
    absence: ["named_content_hash_not_in_corpus"],
    bound: "the issuing host for each pinned content hash that no longer resolves",
    mission: "Reconcile every pinned content hash the corpus cannot produce. Either the revision moved or the pin was wrong, and those two have different remedies."
  },
  {
    id: "SOURCE_4_INEXACT_MATCH_PROMOTION",
    absence: ["no_document_shaped_source_named"],
    bound: "the families whose match is a token subset, and those naming no document-shaped source at all",
    mission: "Promote a near-match to an exact identity or refuse it. A token-subset match inside the right jurisdiction is not an identity, and a family naming no document-shaped source needs one named before anything can be acquired."
  }
];
const classifyAbsence = (row) => {
  if (row.tier && !EXACT_TIERS.has(row.tier)) return "SOURCE_4_INEXACT_MATCH_PROMOTION";
  const hit = SOURCE_CLASSES.find((c) => c.absence.includes(row.absence));
  return hit ? hit.id : "SOURCE_4_INEXACT_MATCH_PROMOTION";
};
for (const row of absenceRows) row.laneId = classifyAbsence(row);

/* ------------------------------------------------------------------ *
 * 6. Assignments.
 * ------------------------------------------------------------------ */
const base = (id, slug, lane, sequence, extra) => ({
  assignmentId: id,
  wave: "mass-packet-production-150",
  engine: "Codex",
  lane,
  sequence,
  workerBranch: `codex/${slug}`,
  isolatedWorkspace: true,
  sharedWorktree: false,
  captainBaseSha: CAPTAIN_BASE_SHA,
  readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: OUT, verify: `captainBaseSha must equal ${CAPTAIN_BASE_SHA}` },
  ...extra
});

const BUILDER_CONTRACT = {
  everyFamilyProduces: [
    "canonical artifact — the filing-ready document set, rendered",
    "boundary artifact — the same set at the route's boundary condition, so a reader can see what changes and what does not",
    "all required companion documents — every component the route's assembly names, rendered; none mapped into the packet and skipped",
    "complete filing instructions — where it goes, what it costs, what must be served, and in what order",
    "visible-write proof — every write located on the page it renders on, so an invisible write cannot pass as a written field",
    "blank-disposition ledger — every blank carrying an approved disposition from the closed vocabulary",
    "completeness report — the nine counters, per document and for the family",
    "all nine completeness counters equal zero"
  ],
  passRule: "A family is COMPLETED only when all nine counters are zero. A counter this lane cannot zero is a STOPPED row with the exact reason, never a lowered bar.",
  approvalBoundary: "A builder may not approve its own packet. Verification is a separate lane, and a builder that reports its own family as proven has exceeded its authority.",
  checksAreFocused: "Run the focused checks named in the assignment. Do not run the full national repository chain: it runs at Captain integration checkpoints, and a worker that runs it spends its slot proving something nobody asked it to prove.",
  neverInventAFact: "A fact the platform does not hold is classified required_before_filing and surfaced to the participant. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.",
  protectedFields: ["participant signature", "signature date", "certificate of mailing before actual mailing", "any court-only or prosecutor-only field"]
};

const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"];

const assignments = [];

/* --- the two shared-infrastructure lanes ------------------------------- */
assignments.push(base("SHARED_A_PRODUCTION_HARNESS", "shared-a-production-harness", "shared-infrastructure", 1, {
  mission: "Build the shared production harness every packet builder calls, so twelve lanes do not each invent a completeness report. You render no packet family and you change no completeness contract: you give the builders one way to prove what they built.",
  itemKind: "sharedModule",
  itemCount: 5,
  items: [
    "scripts/rcap-packet-production/completeness-report.mjs",
    "scripts/rcap-packet-production/visible-write-proof.mjs",
    "scripts/rcap-packet-production/blank-disposition-ledger.mjs",
    "scripts/rcap-packet-production/filing-instruction-assembler.mjs",
    "scripts/rcap-packet-production/companion-document-check.mjs"
  ],
  ownedPaths: ["scripts/rcap-packet-production/**", `${MP}/shared-a/**`],
  prohibitedPaths: ["scripts/rcap-packet-completeness/**", `${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", `${LC}/**`],
  readOnlyDependencies: [
    "scripts/rcap-packet-completeness/completeness-contract.mjs",
    "scripts/rcap-packet-completeness/verify-packet-completeness.mjs"
  ],
  requiredOutputs: [
    "scripts/rcap-packet-production/completeness-report.mjs — emits the nine counters per document and per family, reading its vocabulary from the existing completeness contract rather than restating it",
    "scripts/rcap-packet-production/visible-write-proof.mjs — locates every write on the page it renders on, so an invisible write cannot pass as a written field",
    "scripts/rcap-packet-production/blank-disposition-ledger.mjs — one row per blank, carrying an approved disposition from the closed vocabulary",
    "scripts/rcap-packet-production/filing-instruction-assembler.mjs — assembles destination, fee, service and ordering from the route record, refusing to emit an instruction the route does not support",
    "scripts/rcap-packet-production/companion-document-check.mjs — every component the route names is rendered, so a document mapped into the packet cannot be silently skipped",
    `${MP}/shared-a/rows.json — one row per module: itemId, status, what it proves, and the mutation that shows it is not vacuous`,
    `${MP}/shared-a/mutations.json — every module carries mutation tests; a module with no failing mutation proves nothing`
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "Detail goes in separate fields. An unrecognised status is refused at integration rather than translated." },
  focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --mutations", "npm run typecheck"],
  stopConditions: [
    "LANE STOP — you do not change scripts/rcap-packet-completeness/**. The completeness contract is fixed; you read it.",
    "LANE STOP — you render no packet and you write into no overlay directory.",
    "ROW STOP — a module you cannot make non-vacuous is a STOPPED row carrying the mutation that should have failed and did not."
  ],
  returnFormat: [
    "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
    "MODULES COMPLETED:", "MODULES STOPPED:", "MUTATIONS WRITTEN:", "MUTATIONS CAUGHT:",
    "COMPLETENESS CONTRACT CHANGED: NO", "PACKETS RENDERED: 0",
    "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
  ],
  grantsNothing: "A harness proves nothing about any packet. It gives builders one way to state what they built."
}));

assignments.push(base("SHARED_B_STREAMING_PIPELINE", "shared-b-streaming-pipeline", "shared-infrastructure", 1, {
  mission: "Build the pipeline that makes verification streaming rather than batched: a claim ledger so six verifiers never verify the same family, a four-verdict recorder, an automatic repair-assignment emitter, and the exact-hash packager that cuts review batches of twenty-five as families pass.",
  itemKind: "sharedModule",
  itemCount: 5,
  items: [
    "scripts/rcap-mass-production-pipeline/claim-ledger.mjs",
    "scripts/rcap-mass-production-pipeline/record-verdict.mjs",
    "scripts/rcap-mass-production-pipeline/emit-repair-assignment.mjs",
    "scripts/rcap-mass-production-pipeline/cut-review-batch.mjs",
    "scripts/rcap-mass-production-pipeline/production-checkpoint.mjs"
  ],
  ownedPaths: ["scripts/rcap-mass-production-pipeline/**", `${MP}/shared-b/**`],
  prohibitedPaths: ["scripts/rcap-packet-completeness/**", "scripts/rcap-packet-production/**", `${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", `${LC}/**`],
  requiredOutputs: [
    "scripts/rcap-mass-production-pipeline/claim-ledger.mjs — a verifier claims a returned family atomically; a second claim on a claimed family is refused, not queued",
    `scripts/rcap-mass-production-pipeline/record-verdict.mjs — records exactly one of ${VERDICTS.join(", ")}; an unrecognised verdict is refused rather than translated`,
    "scripts/rcap-mass-production-pipeline/emit-repair-assignment.mjs — every FAIL_REPAIR_REQUIRED emits a targeted repair assignment naming the decisive defect, the owning build lane and the shard that re-verifies it",
    `scripts/rcap-mass-production-pipeline/cut-review-batch.mjs — cuts a ${REVIEW_BATCH_SIZE}-family review package from passing families only, with exact hashes for every artifact and every source`,
    "scripts/rcap-mass-production-pipeline/production-checkpoint.mjs — the four-hour checkpoint, every count read from a file rather than typed",
    `${MP}/shared-b/rows.json — one row per module with the mutation that proves it is not vacuous`
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "Detail goes in separate fields. An unrecognised status is refused at integration rather than translated." },
  focusedTests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
  stopConditions: [
    "LANE STOP — you render no packet, verify no packet and approve no packet. You build the mechanism the verifiers use.",
    "LANE STOP — you write no launch-control manifest. Captain publishes those.",
    "NEVER let a claim be advisory. A claim two verifiers can both hold is not a claim, and duplicate verification is how a fleet reports more proof than it has."
  ],
  returnFormat: [
    "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
    "MODULES COMPLETED:", "MODULES STOPPED:", "MUTATIONS WRITTEN:", "MUTATIONS CAUGHT:",
    "DOUBLE-CLAIM REFUSED IN TEST: YES/NO", "PACKETS VERIFIED BY THIS LANE: 0",
    "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
  ],
  grantsNothing: "A pipeline moves verdicts. It does not produce one, and it opens no route."
}));

/* --- the build lanes ---------------------------------------------------- */
const AXES = ["sharedBuildRunner", "officialForm", "overlayComposer", "componentAssembly", "fieldMapSchema", "routeOptionLogic"];
const buildLanes = laneBuckets.map((bucket, i) => {
  const n = String(i + 1).padStart(2, "0");
  const families = bucket.flatMap((g) => g.families);
  const slug = `build-${n}-mass-production`;
  const composer = new Set(families.map((f) => f.implementationStrategy)).size === 1
    ? families[0].implementationStrategy.toUpperCase() : "MIXED_COMPOSER";
  /* Name the lane after what its families actually share. Some census rows carry
   * a prose instrument label rather than a typed kind, and a prose label makes a
   * poor lane name and a worse grouping axis -- those lanes say so instead. */
  const typedFreq = new Map();
  for (const f of families) for (const k of f.instrumentKinds) {
    if (!/^[a-z][a-z0-9_]*$/.test(k)) continue;
    typedFreq.set(k, (typedFreq.get(k) ?? 0) + 1);
  }
  const topKinds = [...typedFreq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map((x) => x[0]);
  const suffixFull = topKinds.length > 0 ? topKinds.join("_").toUpperCase() : "DISTINCT_ASSEMBLIES";
  const suffix = suffixFull.length <= 36 ? suffixFull : (topKinds[0] ?? "DISTINCT").toUpperCase().slice(0, 36).replace(/_$/, "");
  const id = `BUILD_${n}_${composer}_${suffix}`;
  const sharedAxes = AXES.filter((ax) => new Set(families.map((f) => f.axes[ax])).size === 1);
  return base(id, slug, "packet-build", 2, {
    mission: `Build ${families.length} packet families to the standard builder contract. They are one lane because they share ${sharedAxes.length > 0 ? sharedAxes.join(", ") : "a component assembly"} — not because they share a state.`,
    itemKind: "packetFamily",
    itemCount: families.length,
    items: families.map((f) => f.familyId),
    groupsCarried: bucket.map((g) => ({ groupKey: g.groupKey, axes: g.axes, families: g.families.map((f) => f.familyId) })),
    sharedAxes,
    varyingAxes: AXES.filter((ax) => !sharedAxes.includes(ax)),
    groupingBasis: "shared build runner, official form, overlay/composer, component assembly, field-map schema and route-option logic. Jurisdiction is recorded on every family and used as a grouping reason on none.",
    familyDetail: families.map((f) => ({
      familyId: f.familyId,
      jurisdiction: f.jurisdiction,
      strategy: f.implementationStrategy,
      forms: f.forms,
      instrumentKinds: f.instrumentKinds,
      routeCount: f.routeCount,
      overlayDirectory: f.overlayDirectory,
      overlayDirectoryExists: f.overlayDirectoryExists,
      buildScript: f.buildScript,
      buildScriptExists: f.buildScriptExists,
      alreadyBuilt: f.alreadyBuilt,
      sourceCustody: f.sourceCustody
    })),
    dependsOn: ["SHARED_A_PRODUCTION_HARNESS"],
    ownedPaths: [
      `${MP}/${slug}/**`,
      ...families.map((f) => `${f.overlayDirectory}/**`),
      ...families.map((f) => f.buildScript)
    ],
    prohibitedPaths: ["scripts/rcap-packet-completeness/**", "scripts/rcap-mass-production-pipeline/**", `${LC}/**`],
    builderContract: BUILDER_CONTRACT,
    requiredOutputs: [
      `${MP}/${slug}/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced`,
      `${MP}/${slug}/completeness.json — the per-family completeness report, nine counters each`,
      `${MP}/${slug}/blank-dispositions.json — the blank-disposition ledger for every family in this lane`,
      `${MP}/${slug}/visible-writes.json — the visible-write proof for every family in this lane`,
      `${MP}/${slug}/filing-instructions.json — the complete filing instructions for every family in this lane`,
      ...families.map((f) => `${f.overlayDirectory}/reports/rendered-artifacts.json — the canonical and boundary artifacts for ${f.familyId}, with companion documents`)
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "Detail goes in separate fields. An unrecognised status is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "npm run typecheck"],
    stopConditions: [
      "WEC-6: every stop states its scope. A ROW stop records that family and continues; a LANE stop says why the rest are unsafe without it.",
      "LANE STOP — you do not approve your own packets. Verification is a separate lane and a builder verdict is not a verdict.",
      "LANE STOP — you build only the families listed here, in only the paths listed here.",
      "NEVER invent a fact. An unavailable fact is required_before_filing, surfaced to the participant, never guessed.",
      "NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.",
      "ROW STOP — a family whose official source turns out not to be exact after all stops as BLOCKED_SOURCE naming the exact identity that failed, and is reported to the source lane rather than built on a guess."
    ],
    returnFormat: [
      "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
      "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      "FACTS CLASSIFIED REQUIRED_BEFORE_FILING:", "PROTECTED FIELDS WRITTEN: 0",
      "PACKETS SELF-APPROVED: 0", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
    ],
    grantsNothing: "A built family is a built family. It is not verified, not approved and not sellable, and this lane may not say otherwise."
  });
});
assignments.push(...buildLanes);

/* --- the verification lanes -------------------------------------------- */
for (let i = 1; i <= VERIFY_LANES; i += 1) {
  const n = String(i).padStart(2, "0");
  const slug = `verify-${n}-mass-production`;
  assignments.push(base(`VERIFY_${n}_STREAMING_INDEPENDENT`, slug, "independent-verification", 3, {
    mission: `Verify returned packet families independently, as they return. You do not wait for a wave: you claim the next unclaimed returned family and verify it. Declared capacity ${VERIFY_LANE_MIN} to ${VERIFY_LANE_MAX} families a day.`,
    itemKind: "streamingClaim",
    itemCount: 0,
    items: [],
    whyNoStaticList: "A static list is a batch. Verification here is streaming: families arrive as builders return them, and a fixed list would idle five verifiers while the sixth waits for its named family.",
    dailyCapacity: { min: VERIFY_LANE_MIN, max: VERIFY_LANE_MAX },
    claimProtocol: {
      ledger: `${MP}/claim-ledger.json`,
      rule: "Claim atomically before reading. A family already claimed is skipped, never queued behind: two verifiers on one family is duplicate work reported as independent proof.",
      mechanism: "scripts/rcap-mass-production-pipeline/claim-ledger.mjs, delivered by SHARED_B_STREAMING_PIPELINE"
    },
    verdicts: VERDICTS,
    verdictRule: `Exactly one of ${VERDICTS.join(", ")} per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read out of the builder's report.`,
    independenceRule: "You did not build these families and you may not repair them. A defect you can see is a verdict and a repair assignment, never an edit.",
    dependsOn: ["SHARED_B_STREAMING_PIPELINE"],
    ownedPaths: [`${MP}/${slug}/**`],
    prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**", "scripts/rcap-packet-production/**", `${LC}/**`],
    requiredOutputs: [
      `${MP}/${slug}/rows.json — one row per family claimed: itemId, verdict, the decisive obligation and the evidence read`,
      `${MP}/${slug}/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect, the owning build lane and the shard that re-verifies it`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: VERDICTS, rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs"],
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script. Verification that edits what it verifies is not verification.",
      "LANE STOP — you claim before you read. An unclaimed read is how the same family gets counted twice.",
      "ROW STOP — a family blocked by its source is BLOCKED_SOURCE and a family blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS."
    ],
    returnFormat: [
      "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "COMMIT:",
      "FAMILIES CLAIMED:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:", "REPAIR ASSIGNMENTS EMITTED:",
      "OVERLAY DIRECTORIES MODIFIED: 0", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
    ],
    grantsNothing: "An independent PASS proves a packet is complete. It does not approve output and it opens no commercial route."
  }));
}

/* --- the source lanes --------------------------------------------------- */
for (let i = 0; i < SOURCE_CLASSES.length; i += 1) {
  const cls = SOURCE_CLASSES[i];
  const rows = absenceRows.filter((r) => r.laneId === cls.id);
  const fams = [...new Set(rows.map((r) => r.familyId))].sort();
  const hosts = [...new Set(rows.map((r) => r.jurisdiction))].filter(Boolean).sort();
  const slug = `source-${String(i + 1).padStart(2, "0")}-${cls.id.split("_").slice(2).join("-").toLowerCase()}`;
  assignments.push(base(cls.id, slug, "source-identity-acquisition-promotion", 2, {
    mission: cls.mission,
    itemKind: "sourceObligation",
    itemCount: rows.length,
    items: rows.map((r) => `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`),
    boundedBy: cls.bound,
    familiesUnblocked: fams,
    familiesUnblockedCount: fams.length,
    issuingHosts: hosts,
    absenceClasses: cls.absence,
    whyThisLaneExists: `These are the obligations standing between the ${fams.length} families in this class and tomorrow's build queue. Clearing one releases the families that name it; clearing none holds the build lanes at today's ceiling.`,
    ownedPaths: [`${MP}/${slug}/**`, `data/rcap-grade-a/source-acquisition/mass-production/${slug}/**`],
    prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", `${LC}/**`, "private/**"],
    egressReality: "This environment refuses outbound egress to court and agency hosts. Resolution against committed inventories runs here; anything needing a fetch is recorded as an exact acquisition instruction naming its host, not attempted and not faked.",
    requiredOutputs: [
      `${MP}/${slug}/rows.json — one row per obligation: itemId, status, the identity resolved or the exact acquisition instruction, and the families it releases`,
      `data/rcap-grade-a/source-acquisition/mass-production/${slug}/receipts.json — for anything resolved, the exact form number or SHA-256 and where it was found; no body is committed`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stopConditions: [
      "NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.",
      "NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.",
      "LANE STOP — you build no packet and you touch no overlay directory.",
      "ROW STOP — an identity that cannot be settled from committed inventories is a STOPPED row naming the exact host to fetch from, never a near-match promoted to an identity."
    ],
    returnFormat: [
      "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "COMMIT:",
      "OBLIGATIONS RESOLVED:", "OBLIGATIONS STOPPED:", "FAMILIES RELEASED INTO THE BUILD QUEUE:",
      "IDENTITIES GUESSED: 0", "SOURCE BODIES COMMITTED: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
    ],
    grantsNothing: "A bound source is a bound source. It builds nothing, proves nothing and approves nothing."
  }));
}

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;

/* ------------------------------------------------------------------ *
 * 7. Collisions, duplicates, contradictions, unwritable outputs.
 * ------------------------------------------------------------------ */
const wavePaths = assignments.flatMap((a) => (a.ownedPaths ?? []).map((p) => ({ lane: a.assignmentId, path: p })));
const overlaps = (a, b) => pathMatches(a, b.replace(/\/?\*+$/, "")) || pathMatches(b, a.replace(/\/?\*+$/, ""));
const collisions = [];
for (const mine of wavePaths) {
  for (const theirs of activePaths) {
    if (overlaps(mine.path, theirs.path)) {
      collisions.push({ kind: "ACTIVE_OWNERSHIP", wave: mine.lane, wavePath: mine.path, other: theirs.lane, otherPath: theirs.path });
    }
  }
}
for (let i = 0; i < wavePaths.length; i += 1) {
  for (let j = i + 1; j < wavePaths.length; j += 1) {
    if (wavePaths[i].lane === wavePaths[j].lane) continue;
    if (overlaps(wavePaths[i].path, wavePaths[j].path)) {
      collisions.push({ kind: "WITHIN_WAVE", wave: wavePaths[i].lane, wavePath: wavePaths[i].path, other: wavePaths[j].lane, otherPath: wavePaths[j].path });
    }
  }
}
const familyClaims = new Map();
const duplicateFamilies = [];
for (const a of assignments) {
  if (a.itemKind !== "packetFamily") continue;
  for (const f of a.items) {
    if (familyClaims.has(f)) duplicateFamilies.push({ familyId: f, claimedBy: [familyClaims.get(f), a.assignmentId] });
    familyClaims.set(f, a.assignmentId);
  }
}
const activeOverlap = [...familyClaims.keys()]
  .filter((f) => activeFamilies.has(f))
  .map((f) => ({ familyId: f, activeLane: activeFamilies.get(f), waveLane: familyClaims.get(f) }));

const ownedAndProhibited = [];
for (const a of assignments) {
  const owned = (a.ownedPaths ?? []).map((p) => p.replace(/\/?\*+$/, ""));
  for (const p of a.prohibitedPaths ?? []) {
    const root = p.replace(/\/?\*+$/, "");
    if (owned.some((o) => o === root || o.startsWith(`${root}/`))) ownedAndProhibited.push({ lane: a.assignmentId, path: p });
  }
}

/* Every required output must name a path the lane owns, or the lane cannot
 * write it. This exact vacuity has fired on R4, R8 and S1 already. */
const unwritableOutputs = [];
for (const a of assignments) {
  for (const o of a.requiredOutputs ?? []) {
    const p = o.split("—")[0].trim().replace(/\/$/, "");
    if (!/^[A-Za-z0-9_./*-]+$/.test(p)) { unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "names no path" }); continue; }
    if (!(a.ownedPaths ?? []).some((owned) => pathMatches(owned, p))) {
      unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "outside every owned path" });
    }
  }
}

const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__/;
const placeholderHits = assignments.filter((a) => PLACEHOLDER.test(JSON.stringify({
  ...a, requiredOutputs: undefined, stopConditions: undefined, focusedTests: undefined,
  returnFormat: undefined, builderContract: undefined, verdictRule: undefined, outputSchema: undefined
})));

const problems = [];
if (collisions.length > 0) problems.push(`${collisions.length} path collision(s): ${collisions.slice(0, 3).map((c) => `${c.wave}~${c.other}`).join(", ")}`);
if (duplicateFamilies.length > 0) problems.push(`${duplicateFamilies.length} family claimed twice`);
if (activeOverlap.length > 0) problems.push(`${activeOverlap.length} active family re-dispatched`);
if (ownedAndProhibited.length > 0) problems.push(`${ownedAndProhibited.length} path owned and prohibited at once`);
if (unwritableOutputs.length > 0) problems.push(`${unwritableOutputs.length} required output outside every owned path: ${unwritableOutputs.slice(0, 2).map((u) => u.lane).join(", ")}`);
if (placeholderHits.length > 0) problems.push(`${placeholderHits.length} assignment(s) with a placeholder`);
if (!/^[0-9a-f]{40}$/.test(CAPTAIN_BASE_SHA)) problems.push("no real control-baseline SHA");
if (excluded.length + production.length !== IN.worklist.counts.families) problems.push("the exclusion ladder does not sum to the denominator");
for (const l of buildLanes) {
  if (l.itemCount < BUILD_LANE_MIN || l.itemCount > BUILD_LANE_MAX) problems.push(`${l.assignmentId} carries ${l.itemCount} families, outside ${BUILD_LANE_MIN}-${BUILD_LANE_MAX}`);
}
if (problems.length > 0) {
  console.error(`mass production dispatch: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 15)) console.error(`  - ${p}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 8. The records.
 * ------------------------------------------------------------------ */
const sourceReady = production.length;
const sourceBlocked = blockedBySource.length;
const buildLanesDispatched = buildLanes.length;
const buildLanesHeld = BUILD_LANES_PROVISIONED - buildLanesDispatched;

const manifest = {
  schemaVersion: "rcap-mass-packet-production-150/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-mass-packet-production-150.mjs",
  question: "What does a 150-family-per-day pipeline dispatch on a day when the source-ready queue holds fewer than 150?",
  answer: "Everything that is source-ready, at contract lane size, and the rest of the day's capacity on the exact source obligations that fill tomorrow's queue. The shortfall is reported, not absorbed into smaller lanes.",
  captainBaseSha: CAPTAIN_BASE_SHA,
  thisIsAnAddendum: {
    parentManifests: [INPUTS.wave2, INPUTS.repairWave, INPUTS.s2],
    why: "Wave 2, the completeness repair wave and the S2 shared-host addendum are published against bases their workers already hold. This record names them instead of regenerating them, and every collision check runs across all of them."
  },
  targetRate: {
    familiesPerDay: DAILY_TARGET,
    buildLanesProvisioned: BUILD_LANES_PROVISIONED,
    buildLaneSize: { min: BUILD_LANE_MIN, max: BUILD_LANE_MAX },
    steadyStateBuildCapacity: `${BUILD_LANES_PROVISIONED * BUILD_LANE_MIN} to ${BUILD_LANES_PROVISIONED * BUILD_LANE_MAX} families a day`,
    verificationLanes: VERIFY_LANES,
    verifyLaneSize: { min: VERIFY_LANE_MIN, max: VERIFY_LANE_MAX },
    steadyStateVerificationCapacity: `${VERIFY_LANES * VERIFY_LANE_MIN} to ${VERIFY_LANES * VERIFY_LANE_MAX} families a day`,
    whyVerificationExceedsBuild: "A pipeline whose verification capacity equals its build capacity backs up the first time a builder returns early. Verification is provisioned above build on purpose."
  },
  theShortfall: {
    sourceReadyFamilies: sourceReady,
    dailyTarget: DAILY_TARGET,
    buildLanesDispatched,
    buildLanesHeldForSource: buildLanesHeld,
    rule: `A build lane is dispatched only when it can be filled to contract size (${BUILD_LANE_MIN}-${BUILD_LANE_MAX}). A lane of five is a worker slot spent proving the queue is empty.`,
    whatFillsTheHeldLanes: "The four source lanes. Each names the exact obligations that release families into tomorrow's queue, and each held build lane is filled from that release rather than by lowering the lane size.",
    honestly: `The instruction asks for ${DAILY_TARGET} families. ${sourceReady} are source-ready today. The remaining capacity goes to source clearance rather than to smaller build lanes, and this record says so rather than reporting ${DAILY_TARGET} names spread across twelve half-empty lanes.`
  },
  activeOwnershipPreserved: {
    lanes: PRESERVED_LANES,
    familiesHeldByActiveLanes: activeFamilies.size,
    pathsHeldByActiveLanes: activePaths.length,
    collisionsWithActiveOwnership: collisions.filter((c) => c.kind === "ACTIVE_OWNERSHIP").length,
    rule: "Active ownership is not negotiated here. A collision with it fails this generator rather than appearing as a note in its output."
  },
  derivation: {
    inputs: Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [p, sha(p)])),
    denominator: IN.worklist.counts.families,
    ladder: LADDER,
    ladderRule: "Ordered. Each family takes the first reason that applies, so the counts sum to the denominator and no family is excluded twice for different reasons.",
    exclusionCounts,
    excludedTotal: excluded.length,
    productionSetSize: production.length,
    sumsToDenominator: excluded.length + production.length === IN.worklist.counts.families,
    excluded
  },
  sourceReadiness: {
    sourceReadyFamilies: sourceReady,
    sourceBlockedFamilies: sourceBlocked,
    exactnessRule: "An identity is exact only at an exact form number or an exact content hash. A token-subset match inside the right jurisdiction is not an identity: it sends a builder to a document nobody has confirmed.",
    inexactMatchesFound: excluded.filter((e) => e.reason === "SOURCE_IDENTITY_NOT_EXACT").length,
    inexactMatchDetail: excluded.filter((e) => e.reason === "SOURCE_IDENTITY_NOT_EXACT"),
    sourceObligationsDispatched: absenceRows.length
  },
  grouping: {
    axes: AXES,
    notByState: "Jurisdiction is recorded on every family and used as a grouping reason on none. Where a lane is single-state it is because one judiciary publishes one form set, and the lane names that form set as its basis.",
    groupCount: groupList.length,
    groups: groupList.map((g) => ({ groupKey: g.groupKey, axes: g.axes, size: g.families.length, families: g.families.map((f) => f.familyId) })),
    packing: `Lane count is derived, not chosen: ${totalProduction} families at ${BUILD_LANE_MIN}-${BUILD_LANE_MAX} per lane admits ${minLanes} to ${maxLanes} lanes, and the largest valid count is taken because more lanes is more parallelism at the same total. Packing is similarity-first with a running size target: a balance-first packer fills every lane evenly and produces grab-bags, which is worse than grouping by state rather than better.`,
    aLimitInTheCensus: {
      finding: "Some census rows state the participant-facing instrument as a prose label rather than as a typed kind, so for those families the component-assembly axis is a sentence and no two of them can share it.",
      familiesWithProseInstrumentLabels: production.filter((f) => f.instrumentKinds.some((k) => !/^[a-z][a-z0-9_]*$/.test(k))).map((f) => f.familyId),
      consequence: "Those families group as distinct assemblies with no peer, which is why one lane carries mostly singletons. That is the census's shape showing through, not a packing failure, and typing those labels is a census correction rather than work for this wave.",
      doNotFixHere: "No lane in this wave rewrites a census instrument label."
    }
  },
  sharedHosts: {
    rule: "Where one shared host serves several assigned families, one exclusive lane owns it and the dependent lanes wait for the integration.",
    existingRunnersInThisWave: production.filter((f) => f.buildScriptExists).map((f) => ({ familyId: f.familyId, script: f.buildScript })),
    finding: production.filter((f) => f.buildScriptExists).length === 0
      ? "No production family imports an existing shared build runner: every runner in this wave is new and belongs to the single lane that creates it."
      : "The families listed above already carry a build script; each is owned by exactly one build lane in this wave and by no other lane anywhere.",
    theSharedSurfaceThatDoesExist: "The production harness (SHARED_A) and the streaming pipeline (SHARED_B). Both are dispatched at sequence 1, and every build and verify lane declares a dependency on the one it uses."
  },
  builderContract: BUILDER_CONTRACT,
  streamingVerification: {
    startsWhen: "the first builder returns, not when the wave completes",
    verdicts: VERDICTS,
    claimLedger: `${MP}/claim-ledger.json`,
    everyFailureBecomesWork: "A FAIL_REPAIR_REQUIRED emits a targeted repair assignment naming the decisive defect, the owning build lane and the shard that re-verifies it. A failure with no assignment is a failure that will be rediscovered.",
    builderMayNotVerify: "No verification lane shares a worker branch with a build lane, and no build lane owns a verification return path."
  },
  rollingLegalReview: {
    batchSize: REVIEW_BATCH_SIZE,
    cutWhen: `${REVIEW_BATCH_SIZE} families hold PASS_COMPLETE_INDEPENDENT, not when the wave completes`,
    everyPackageCarries: [
      "final artifact", "source hashes", "specification hash", "packet components",
      "visible-write report", "blank-disposition report", "independent verdict",
      "filing instructions", "self-help stop"
    ],
    exactHash: "Every artifact and every source is named by SHA-256. A package whose hashes do not reproduce is not a package.",
    onlyPassingFamilies: "A family that has not passed independently is not in a batch, and a revoked PASS is not in a batch."
  },
  captainCadence: {
    integrateEvery: "4 hours",
    fullChainRunsAt: "Captain integration checkpoints only",
    whyNotInsideWorkers: "The full national repository chain costs a worker its whole slot and proves nothing the focused checks did not. It runs once per checkpoint, on the integrated tree.",
    checkpointRecord: OUT_CHECKPOINT,
    checkpointFormat: {
      source: `the repository's own integration-checkpoint instrument, ${LC}/WAVE_2_INTEGRATION_CHECKPOINT.json`,
      honestly: "The master build plan carries no short checkpoint format to copy. Rather than cite one that is not there, this wave reuses the format this repository already runs on: every count derived from a file the checkpoint read, none typed.",
      rule: "No number in a checkpoint is typed. Each is read from a file the integration wrote or verified."
    }
  },
  totals: {
    sharedLanes: assignments.filter((a) => a.lane === "shared-infrastructure").length,
    buildLanes: buildLanesDispatched,
    buildLanesProvisioned: BUILD_LANES_PROVISIONED,
    buildLanesHeldForSource: buildLanesHeld,
    verificationLanes: assignments.filter((a) => a.lane === "independent-verification").length,
    sourceLanes: assignments.filter((a) => a.lane === "source-identity-acquisition-promotion").length,
    totalLanes: assignments.length,
    familiesAssigned: familyClaims.size,
    duplicateFamilies: duplicateFamilies.length,
    pathCollisions: collisions.length,
    placeholders: placeholderHits.length,
    sourceObligationsAssigned: absenceRows.length,
    commercialRoutesOpened: 0,
    productionTouched: false
  },
  commercialPosture: "This wave builds, verifies and packages. It opens no commercial route, proves no fulfillment authority and approves no output. Commercial authority still comes only from a Grade-A fulfillment record keyed to an exact route and packet family.",
  assignments
};

const collisionRecord = {
  schemaVersion: "rcap-mass-packet-production-150-collisions/v1",
  generatedBy: manifest.generatedBy,
  question: "Does anything in this wave touch what an active lane already holds, or what another lane in this wave holds?",
  checkedAgainst: {
    activeLanes: PRESERVED_LANES,
    activeManifests: [INPUTS.wave2, INPUTS.repairWave, INPUTS.s2, INPUTS.wave2Repairs, INPUTS.residual],
    activePathsChecked: activePaths.length,
    wavePathsChecked: wavePaths.length,
    activeFamiliesChecked: activeFamilies.size,
    comparisons: wavePaths.length * activePaths.length + (wavePaths.length * (wavePaths.length - 1)) / 2
  },
  results: {
    pathCollisions: collisions,
    duplicateFamilies,
    activeFamiliesReDispatched: activeOverlap,
    ownedAndProhibited,
    requiredOutputsOutsideOwnedPaths: unwritableOutputs,
    placeholders: placeholderHits.map((a) => a.assignmentId)
  },
  counts: {
    pathCollisions: collisions.length,
    duplicateFamilies: duplicateFamilies.length,
    activeFamiliesReDispatched: activeOverlap.length,
    ownedAndProhibited: ownedAndProhibited.length,
    requiredOutputsOutsideOwnedPaths: unwritableOutputs.length,
    placeholders: placeholderHits.length
  },
  rule: "A nonzero count here fails the generator. This record exists so the zero can be read rather than trusted."
};

const checkpoint = {
  schemaVersion: "rcap-mass-packet-production-150-checkpoint/v1",
  generatedBy: manifest.generatedBy,
  everyCountIsDerived: "No number here is typed. Each is read from a record this dispatch wrote or verified.",
  cadence: "every 4 hours",
  checkpointNumber: 0,
  checkpointMeans: "checkpoint 0 is the dispatch itself: the state the first four-hour integration is measured against.",
  captainBaseSha: CAPTAIN_BASE_SHA,
  pipeline: {
    sharedLanes: manifest.totals.sharedLanes,
    buildLanesDispatched: manifest.totals.buildLanes,
    buildLanesHeldForSource: manifest.totals.buildLanesHeldForSource,
    verificationLanes: manifest.totals.verificationLanes,
    sourceLanes: manifest.totals.sourceLanes
  },
  families: {
    nationalDenominator: IN.worklist.counts.families,
    heldByActiveLanes: activeFamilies.size,
    sourceReady,
    sourceBlocked,
    dispatchedToBuild: manifest.totals.familiesAssigned,
    returned: 0,
    verified: 0,
    passedIndependently: 0,
    failedRepairRequired: 0,
    blockedSource: 0,
    blockedLegalInput: 0
  },
  sourceObligations: {
    dispatched: absenceRows.length,
    resolved: 0,
    byLane: Object.fromEntries(SOURCE_CLASSES.map((c) => [c.id, absenceRows.filter((r) => r.laneId === c.id).length]))
  },
  legalReview: { batchSize: REVIEW_BATCH_SIZE, batchesCut: 0, familiesPackaged: 0 },
  commercial: { commercialRoutesOpened: 0, completePacketProven: 0, productionTouched: false },
  nextCheckpoint: {
    dueIn: "4 hours",
    captainRuns: [
      "integrate every return present, by cherry-pick, verifying owned paths before applying",
      "rerun the full national repository chain on the integrated tree",
      "regenerate this checkpoint so every count is read rather than remembered",
      `cut a review batch if ${REVIEW_BATCH_SIZE} families hold PASS_COMPLETE_INDEPENDENT`,
      "dispatch a targeted repair for every FAIL_REPAIR_REQUIRED that has none",
      "fill a held build lane for every family a source lane released"
    ]
  }
};

/* ------------------------------------------------------------------ *
 * 9. Prompts.
 * ------------------------------------------------------------------ */
const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Engine:** ${a.engine}  ·  **Lane:** ${a.lane}  ·  **Sequence:** ${a.sequence}`);
  p.push(`**Worker branch:** \`${a.workerBranch}\``);
  p.push(`**Branch from:** \`${a.captainBaseSha}\``);
  p.push(`**Read this assignment from:** \`origin/${CAPTAIN_BRANCH}\` → \`${OUT}\``);
  p.push("**Workspace:** one isolated workspace, one branch. No shared worktree.");
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.", "");
  p.push("## Mission", "", a.mission, "");
  if (a.dependsOn) p.push(`**Runs after:** ${a.dependsOn.join(", ")}. Do not start until that lane's work is integrated onto your base.`, "");

  if (a.itemKind === "packetFamily") {
    p.push(`## The ${a.itemCount} families`, "");
    p.push(`Shared across the whole lane: **${a.sharedAxes.length ? a.sharedAxes.join(", ") : "component assembly"}**. Varying: ${a.varyingAxes.join(", ") || "nothing"}.`, "");
    p.push(a.groupingBasis, "");
    p.push("| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |");
    p.push("| --- | --- | --- | --- | --- | ---: | --- |");
    for (const f of a.familyDetail) {
      p.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${f.strategy} | ${f.forms.join(", ") || "—"} | ${f.instrumentKinds.join(", ") || "—"} | ${f.routeCount} | \`${f.overlayDirectory}\`${f.overlayDirectoryExists ? "" : " *(new)*"} |`);
    }
    p.push("");
    p.push("## The standard builder contract", "", "Every family produces all eight, or it is a STOPPED row:", "", bullet(a.builderContract.everyFamilyProduces), "");
    p.push(a.builderContract.passRule, "");
    p.push(`**${a.builderContract.approvalBoundary}**`, "");
    p.push(a.builderContract.checksAreFocused, "");
    p.push(a.builderContract.neverInventAFact, "");
    p.push(`Never prefill: ${a.builderContract.protectedFields.join("; ")}.`, "");
  }
  if (a.itemKind === "streamingClaim") {
    p.push("## How work reaches you", "", a.whyNoStaticList, "");
    p.push(`- **Claim ledger:** \`${a.claimProtocol.ledger}\``);
    p.push(`- **Rule:** ${a.claimProtocol.rule}`);
    p.push(`- **Mechanism:** ${a.claimProtocol.mechanism}`);
    p.push(`- **Daily capacity:** ${a.dailyCapacity.min}–${a.dailyCapacity.max} families`, "");
    p.push("## Verdicts", "", bullet(a.verdicts), "", a.verdictRule, "", `**${a.independenceRule}**`, "");
  }
  if (a.itemKind === "sourceObligation") {
    p.push("## What bounds this lane", "", a.boundedBy, "");
    p.push(a.whyThisLaneExists, "");
    p.push(`**${a.itemCount} obligations · ${a.familiesUnblockedCount} families released if all clear · hosts: ${a.issuingHosts.join(", ") || "—"}**`, "");
    p.push(`Absence classes: ${a.absenceClasses.join(", ")}.`, "");
    p.push(`> ${a.egressReality}`, "");
    p.push("### Families this lane releases", "", a.familiesUnblocked.map((f) => `\`${f}\``).join(", "), "");
  }
  if (a.itemKind === "sharedModule") {
    p.push("## What you build", "", bullet(a.items.map((x) => `\`${x}\``)), "");
    if (a.readOnlyDependencies) p.push("**Read-only dependencies — you call these and do not change them:**", "", bullet(a.readOnlyDependencies.map((x) => `\`${x}\``)), "");
  }

  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  if (a.prohibitedPaths) p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  if (a.outputSchema) {
    p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  }
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "");
  p.push("> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  if (a.returnFormat) p.push("## Return format", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  p.push("## Setup", "", "```sh", "git fetch origin --prune",
    `git checkout -b ${a.workerBranch} ${a.captainBaseSha}`,
    `git show origin/${CAPTAIN_BRANCH}:${OUT} > /tmp/${a.workerBranch.replace(/\//g, "-")}.json`,
    `# STOP unless that file's captainBaseSha === ${a.captainBaseSha}`,
    "npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free",
    ...(a.itemKind === "packetFamily" || a.itemKind === "sourceObligation"
      ? ["bash scripts/rcap-corpus/bootstrap-private-corpus.sh", "source private/source-corpus-environment.txt", 'export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"']
      : []),
    "```", "");
  p.push(`Commit your work and \`git push -u origin ${a.workerBranch}\`.`, "");
  return p.join("\n");
};

if (CHECK) {
  console.log(`mass production dispatch current: ${production.length} source-ready, ${assignments.length} lanes, ${collisions.length} collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, OUT_COLLISIONS), `${JSON.stringify(collisionRecord, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, OUT_CHECKPOINT), `${JSON.stringify(checkpoint, null, 2)}\n`);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${OUT_COLLISIONS}`);
console.log(`Wrote ${OUT_CHECKPOINT}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  denominator ${IN.worklist.counts.families} = ${production.length} production + ${excluded.length} excluded (sums: ${manifest.derivation.sumsToDenominator})`);
console.log(`  source-ready ${sourceReady} · source-blocked ${sourceBlocked} · daily target ${DAILY_TARGET}`);
console.log(`  lanes: ${manifest.totals.sharedLanes} shared · ${manifest.totals.buildLanes} build (of ${BUILD_LANES_PROVISIONED} provisioned, ${buildLanesHeld} held for source) · ${manifest.totals.verificationLanes} verify · ${manifest.totals.sourceLanes} source`);
console.log(`  families assigned ${manifest.totals.familiesAssigned} · duplicates ${manifest.totals.duplicateFamilies} · collisions ${manifest.totals.pathCollisions} · placeholders ${manifest.totals.placeholders}`);
for (const l of buildLanes) console.log(`    ${l.assignmentId}: ${l.itemCount} families — shared ${l.sharedAxes.join(", ") || "(component assembly)"}`);
for (const c of SOURCE_CLASSES) {
  const a = assignments.find((x) => x.assignmentId === c.id);
  console.log(`    ${c.id}: ${a.itemCount} obligations, ${a.familiesUnblockedCount} families`);
}
