#!/usr/bin/env node
/*
 * External worker control plane: two persistent Codespaces and eight Codex
 * Cloud slots, assigned from live measurement rather than from a snapshot.
 *
 * The one rule this generator exists to enforce is that external capacity
 * NEVER takes work from a Claude worker. An item is eligible only when no live
 * claim holds it. A released claim is finished work and its family may be
 * re-dispatched; a live claim is a worker mid-flight and is invisible here.
 *
 * It also refuses to invent grantable work. Every RASTER_PASS family already
 * holds an independent-verification claim, so a second read cannot be minted --
 * it needs claim.mjs --transfer, which is Captain's act at launch. The cloud
 * assignments therefore carry a transfer PREREQUISITE rather than an assert the
 * worker would run and be refused on, which is exactly how XVF-A and XVF-B were
 * wasted.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FACT = "data/rcap-grade-a/packet-factory-24h";
const CTL = "data/rcap-grade-a/external-worker-control";
const MIN_ANCESTOR = "f240e47687eddd47d432996823ce932affcd54cc";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const write = (rel, obj) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`);
};
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const head = git("rev-parse", "HEAD");

/* The dispatch must not be built on a tree that predates the control decisions
 * it depends on. */
try { execFileSync("git", ["merge-base", "--is-ancestor", MIN_ANCESTOR, "HEAD"], { cwd: ROOT }); }
catch { console.error(`REFUSED: HEAD does not contain the minimum ancestor ${MIN_ANCESTOR}`); process.exit(1); }

const ledger = read(`${FACT}/claim-ledger.json`);
const master = read(`${FACT}/MASTER_QUEUE.json`);
const queue = read(`${FACT}/RASTER_QUEUE.json`);

/* ---- who is busy right now ------------------------------------------------ */
const live = (kinds) => new Set(ledger.claims
  .filter((c) => kinds.includes(c.laneKind) && c.released !== true)
  .map((c) => c.subjectId));
const anyClaim = (kinds) => new Set(ledger.claims
  .filter((c) => kinds.includes(c.laneKind)).map((c) => c.subjectId));

const liveBuild = live(["packet-build"]);
const liveRepair = live(["repair", "shared-host-repair"]);
const liveVerify = live(["independent-verification"]);
const livePromo = live(["source-promotion"]);
const anyVerify = anyClaim(["independent-verification"]);
const releasedVerify = new Map(ledger.claims
  .filter((c) => c.laneKind === "independent-verification" && c.released === true)
  .map((c) => [c.subjectId, c.lane]));

const stateOf = new Map(master.families.map((f) => [f.familyId, f.state]));
const dirOf = new Map(master.families.map((f) => [f.familyId, f.directory ?? null]));
const rasterPass = queue.rows
  .filter((r) => r.currentRasterState === "RASTER_PASS" && r.coverage?.complete === true)
  .map((r) => r.familyId);

/* Duplicate pinned bytes: one read over twelve families is not twelve verdicts. */
const byBytes = new Map();
for (const r of queue.rows) {
  const k = `${r.canonicalPdfSha256}|${r.boundaryPdfSha256}`;
  if (!byBytes.has(k)) byBytes.set(k, []);
  byBytes.get(k).push(r.familyId);
}
const duplicateGroups = [...byBytes.values()].filter((g) => g.length > 1);
const duplicateFamilies = new Set(duplicateGroups.flat());

/* ---- eligibility ---------------------------------------------------------- */
/*
 * A family whose live claim is on the EXTERNAL lane this dispatch targets is
 * still that worker's work, not somebody else's.
 *
 * Eligibility is "no live claim", which was right until the transfers ran and
 * then removed six of Codespace A's own families from its next assignment --
 * regenerating would have un-assigned the work it had just activated, and the
 * worker would have found its batch gone. A live grant held by the destination
 * lane is the activated state, not a collision.
 */
const heldByLane = (lane) => new Set(ledger.claims
  .filter((c) => c.lane === lane && c.released !== true).map((c) => c.subjectId));
const pf17Held = heldByLane("PF17");
const fix09Held = heldByLane("FIX09");
const fix10Held = heldByLane("FIX10");
const fix11Held = heldByLane("FIX11");

const sourceReadyUnowned = master.families
  .filter((f) => f.state === "SOURCE_READY" && (!liveBuild.has(f.familyId) || pf17Held.has(f.familyId)))
  .map((f) => f.familyId);
const failNoRepairer = master.families
  .filter((f) => f.state === "FAIL_REPAIR_REQUIRED"
    && (!liveRepair.has(f.familyId) || fix09Held.has(f.familyId) || fix10Held.has(f.familyId) || fix11Held.has(f.familyId)))
  .map((f) => f.familyId);
/* Second-read candidates: the first read is finished AND the family has since
 * earned a raster receipt the first read did not have. */
const vfExternalHeld = new Set(ledger.claims
  .filter((c) => /^VF(1[89]|2[0-5])$/.test(c.lane) && c.released !== true).map((c) => c.subjectId));
const secondReadCandidates = rasterPass
  .filter((f) => (releasedVerify.has(f) && !liveVerify.has(f)) || vfExternalHeld.has(f));
const neverRead = rasterPass.filter((f) => !anyVerify.has(f));

/*
 * How a worker actually comes to hold a grant on this subject.
 *
 * Not always an assert. A family may hold only one claim per operation, so a
 * family whose previous lane RELEASED its claim cannot be granted a second one
 * -- claim.mjs refuses it as a duplicate subject+operation. Every subject in
 * this dispatch turned out to be in exactly that state: six SOURCE_READY
 * families still carry a released packet-build claim from PF01-PF08, six
 * repair targets carry released FIX01-FIX08 claims, and every RASTER_PASS
 * family carries a released VF claim.
 *
 * I wrote the first version of this generator emitting a bare --assert for the
 * two Codespaces, which is the XVF-A failure exactly: a lane dispatched, sent to
 * work, and refused at the ledger. E5 caught it. So the prerequisite is derived
 * per subject from what the ledger actually holds.
 */
const claimPathFor = (subjectId, laneKind, targetLane) => {
  const held = ledger.claims.find((c) => c.subjectId === subjectId && c.laneKind === laneKind);
  if (!held) {
    /* The operation a mint will actually write. repair's operation is
     * "rapid-repair" everywhere in the ledger; recording the laneKind here made
     * F24 read nine fresh grants as undispatched — the same repair/rapid-repair
     * mismatch as before, from the opposite side. */
    return { kind: "MINT", holdingLane: null, operation: laneKind === "repair" ? "rapid-repair" : laneKind,
      captainAction: null,
      workerCommand: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${targetLane} ${subjectId}` };
  }
  if (held.released !== true) {
    /* A live grant already ON the target lane is the activated state: the
     * transfer ran, the worker simply has not asserted yet. Only a live grant
     * held ELSEWHERE blocks. Conflating the two made the generator refuse to
     * re-publish the six families it had activated moments earlier. */
    if (held.lane === targetLane) {
      return { kind: "ALREADY_ACTIVE", holdingLane: held.lane, operation: held.operation,
        captainAction: null,
        workerCommand: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${targetLane} ${subjectId}` };
    }
    return { kind: "BLOCKED_LIVE", holdingLane: held.lane, operation: held.operation, captainAction: null, workerCommand: null };
  }
  return {
    /* The operation is read off the claim, never inferred from the kind. A
     * repair claim's operation is "rapid-repair" while its laneKind is
     * "repair", and a checker that derives one from the other reports six
     * perfectly good grants as undispatched. */
    kind: "TRANSFER", holdingLane: held.lane, operation: held.operation,
    captainAction: `node scripts/grade-a-packet-factory-24h/claim.mjs --transfer ${held.lane} ${targetLane} ${subjectId} --reason "<why this lane takes it>"`,
    workerCommand: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${targetLane} ${subjectId}   # only after Captain's transfer`,
  };
};

const claimPlanFor = (subjectIds, laneKind, targetLane) => {
  const plan = subjectIds.map((s) => ({ subjectId: s, ...claimPathFor(s, laneKind, targetLane) }));
  const blocked = plan.filter((p) => p.kind === "BLOCKED_LIVE");
  if (blocked.length) {
    console.error(`REFUSED: ${blocked.length} subject(s) are held by a LIVE claim and must not be dispatched externally`);
    for (const b of blocked) console.error(`  ${b.subjectId} held live by ${b.holdingLane}`);
    process.exit(1);
  }
  return plan;
};

/*
 * Batch identity. An assignment without a stable id cannot be referenced by a
 * branch, a return, an integration record or a conversation, and both
 * Codespaces correctly refused to start without one.
 *
 * The version is pinned to the batch rather than incremented per run. A version
 * that bumps on every regeneration is noise: it made these files v4 through
 * four regenerations that changed nothing a worker would act on, and a worker
 * cannot tell a real re-dispatch from a re-render. The id embeds the version so
 * the two cannot drift, and a check below refuses them if they do.
 */
const BATCH = { version: 4, tag: "BATCH-001" };
const WORKER_PREFIX = { "CODEX-CS-A": "CSA", "CODEX-CS-B": "CSB", "FABLE-R3": "FR3", "FABLE-R4": "FR4", "FABLE-V2": "FV2" };
const assignmentIdFor = (workerId, lane) =>
  `${WORKER_PREFIX[workerId] ?? workerId}-${lane}-V${BATCH.version}-${BATCH.tag}`;

const CAP = { "CODEX-CS-A": 6, "CODEX-CS-B": 6, cloudVerify: 5, cloudResearch: 20 };

/* ---- assignment construction ---------------------------------------------- */
const priorVersion = (workerId) => {
  const p = path.join(ROOT, CTL, "assignments", `${workerId}.json`);
  if (!fs.existsSync(p)) return 0;
  try { return JSON.parse(fs.readFileSync(p, "utf8")).assignmentVersion ?? 0; } catch { return 0; }
};

const COMMON = {
  schemaVersion: "rcap-external-assignment/v1",
  captainSha: head,
  createdAt: now,
  minimumAncestor: MIN_ANCESTOR,
  commercialRoutesOpened: 0,
  productionTouched: false,
  captainIsSoleAuthorityFor: [
    "the claim ledger", "the master and raster queues", "central raster dispatch",
    "integration", "commercial authority", "anything touching Production",
  ],
  neverDo: [
    "claim a family a live grant already holds",
    "modify data/rcap-grade-a/packet-factory-24h/claim-ledger.json",
    "modify RASTER_QUEUE.json, MASTER_QUEUE.json or ACTIVE_ASSIGNMENTS.json",
    "open a commercial route, alter checkout, entitlement or packet-credit behaviour",
    "touch Production, Supabase RLS, Stripe live mode, or any secret",
    "verify a packet you built or repaired",
  ],
};

const assignment = (workerId, spec) => {
  const assignmentId = assignmentIdFor(workerId, spec.lane);
  /* The id must name the version it belongs to, or a worker holding a stale
   * file cannot tell which batch it is executing. */
  if (!assignmentId.includes(`V${BATCH.version}-${BATCH.tag}`)) {
    console.error(`REFUSED: ${workerId} assignmentId ${assignmentId} does not embed V${BATCH.version}-${BATCH.tag}`);
    process.exit(1);
  }
  const prior = priorVersion(workerId);
  if (prior > BATCH.version) {
    console.error(`REFUSED: ${workerId} is already at v${prior}; this batch pins v${BATCH.version} and would move it backwards`);
    process.exit(1);
  }
  return {
    ...COMMON,
    workerId,
    assignmentId,
    assignmentVersion: BATCH.version,
    batchTag: BATCH.tag,
    ...spec,
    /* The return path and the branch both carry the id, so a return can be
     * matched to the exact assignment that produced it rather than to whatever
     * version happens to be current when it lands. */
    returnPath: `${CTL}/returns/${workerId}/${assignmentId}`,
    branch: spec.branchPrefix ? `${spec.branchPrefix}${assignmentId.toLowerCase()}` : null,
    branchFrom: {
      remote: "origin/claude/legalease-sprint-captain-utucnw",
      mustContain: head,
      why: "the activated ledger and this assignment live at that commit; branching from an earlier one gives you a ledger where your grant does not exist",
    },
  };
};

const familyDetail = (f) => ({
  familyId: f,
  directory: dirOf.get(f) ?? null,
  masterQueueState: stateOf.get(f) ?? null,
  sharesBytesWithAnotherFamily: duplicateFamilies.has(f),
});

const assignments = [];

/* ---- Codespace A: canonical packet build ---------------------------------- */
const aFamilies = sourceReadyUnowned.slice(0, CAP["CODEX-CS-A"]);
assignments.push(assignment("CODEX-CS-A", {
  mode: aFamilies.length ? "PACKET_BUILD" : "IDLE_NO_ELIGIBLE_WORK",
  role: "Primary Packet Build Factory (persistent Codespace)",
  lane: "PF17",
  laneKind: "packet-build",
  subjectIds: aFamilies,
  subjects: aFamilies.map(familyDetail),
  claimPlan: claimPlanFor(aFamilies, "packet-build", "PF17"),
  claimAssertions: claimPlanFor(aFamilies, "packet-build", "PF17").map((p) => p.workerCommand),
  claimPrerequisite: aFamilies.length
    ? "Every one of these families already holds a RELEASED packet-build claim from an earlier PF lane, so a bare --assert is a duplicate subject+operation and the ledger refuses it. Captain transfers each grant to PF17 first; claimPlan carries the exact command per subject. Do not assert until CONTROL_STATE.json shows the transfer completed, and if an assert is refused STOP and return the refusal rather than working without a grant."
    : null,
  ownedPaths: aFamilies.map((f) => dirOf.get(f)).filter(Boolean).map((d) => `${d}/**`),
  prohibitedPaths: [
    `${FACT}/claim-ledger.json`, `${FACT}/RASTER_QUEUE.json`,
    `${FACT}/MASTER_QUEUE.json`, `${FACT}/ACTIVE_ASSIGNMENTS.json`,
    "data/rcap-all50/overlays/census-v1/**  (except the directories listed in ownedPaths)",
  ],
  controllingEvidencePaths: [
    "docs/PRODUCT_CONTRACT.md",
    "data/rcap-grade-a/launch-control/GRADE_A_READINESS.json",
    `${FACT}/MASTER_QUEUE.json`,
  ],
  focusedTestCommands: [
    "node scripts/verify-packet-build-environment.mjs --family <FAMILY_ID> --codex-cloud",
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
    "node scripts/grade-a-packet-factory-24h/verify-claim-ledger.mjs",
  ],
  rasterDisposition: "BUILT_RASTER_PENDING. Do not raster locally and do not report a local raster as a gate result. Captain dispatches the central workflow.",
  independentVerifierSeparation: "You build. You never verify what you build; a different worker reads it.",
  reproducibilityRule: "Every PDF you create must carry the fixed date from scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs. A packet whose bytes move between identical builds destroys its own raster receipt.",
  stopConditions: [
    "a claim assert is refused for any reason",
    "a source does not bind by exact SHA-256",
    "an official form is encrypted or otherwise unreadable",
    "the family needs a legal input nobody has settled",
    "the preflight does not return PACKET_BUILD_ENVIRONMENT_READY",
  ],
  branchPrefix: "codex/cs-a/",
  expiresAt: null,
}));

/* ---- Codespace B: repair and promotion ------------------------------------ */
const bFamilies = failNoRepairer.slice(0, CAP["CODEX-CS-B"]);
assignments.push(assignment("CODEX-CS-B", {
  mode: bFamilies.length ? "PACKET_REPAIR" : "IDLE_NO_ELIGIBLE_WORK",
  role: "Repair and Promotion Factory (persistent Codespace)",
  lane: "FIX09",
  laneKind: "repair",
  subjectIds: bFamilies,
  subjects: bFamilies.map((f) => ({
    ...familyDetail(f),
    firstReadBy: releasedVerify.get(f) ?? null,
  })),
  claimPlan: claimPlanFor(bFamilies, "repair", "FIX09"),
  claimAssertions: claimPlanFor(bFamilies, "repair", "FIX09").map((p) => p.workerCommand),
  claimPrerequisite: bFamilies.length
    ? "Every one of these families already holds a RELEASED repair claim from FIX01-FIX08, so a bare --assert is refused as a duplicate. Captain transfers each grant to FIX09 first; claimPlan carries the exact command per subject."
    : null,
  ownedPaths: bFamilies.map((f) => dirOf.get(f)).filter(Boolean).map((d) => `${d}/**`),
  prohibitedPaths: [
    `${FACT}/claim-ledger.json`, `${FACT}/RASTER_QUEUE.json`,
    `${FACT}/MASTER_QUEUE.json`, `${FACT}/ACTIVE_ASSIGNMENTS.json`,
  ],
  controllingEvidencePaths: [
    "data/rcap-grade-a/launch-control/next-waves/REPAIR_BY_DEFECT_CLASS.json",
    "data/rcap-grade-a/launch-control/next-waves/PARTICIPANT_INSTRUCTIONS_GAP.json",
  ],
  focusedTestCommands: [
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
    "node scripts/grade-a-packet-factory-24h/verify-lane-contracts.mjs",
  ],
  rasterDisposition: "A repair that moves packet bytes INVALIDATES that family's raster receipt. That is expected, not a regression: say so in the return and Captain re-rasters centrally.",
  repairerSeparation: "You repair. You never verify your own repair — a different worker reads it, and Captain moves the grant with claim.mjs --transfer.",
  repairOnlyTheNamedObligations: "REPAIR_BY_DEFECT_CLASS.json names the failing obligation per family. Repair those. Widening the change costs the receipt for no gain.",
  theTrapInThisQueue: duplicateFamilies.size
    ? `${duplicateFamilies.size} families across ${duplicateGroups.length} groups pin byte-identical documents, which is what a missing route election looks like from outside. PF-B holds that classification. Do not repair ROUTE_OPTIONS on a family flagged sharesBytesWithAnotherFamily until PF-B returns.`
    : null,
  stopConditions: [
    "a claim assert is refused",
    "the repair would require writing an unsourced court, fee, waiver route or service rule",
    "the defect turns out to be in the evidence record rather than the packet (say which)",
    "a live verification grant is open on the family",
  ],
  branchPrefix: "codex/cs-b/",
  expiresAt: null,
}));

/* ---- Fable repair lanes: the director's own subagents ---------------------- */
/*
 * Codex is off the critical packet path; the repairs beyond Codespace B's cap
 * go to the director's long-lived subagents. Same contract, same locks, same
 * checks -- only the runner differs. FIX10 carries the nine Washington vacate
 * families, which share one host and one instructions generator, so a single
 * writer repairs all nine without a shared-host collision. FIX11 carries the
 * Pennsylvania pair, whose failures are packet-content and will move bytes.
 */
const remainingRepairs = failNoRepairer.filter((f) => !bFamilies.includes(f));
const waRepairs = remainingRepairs.filter((f) => /^wa_vac_/.test(f)).slice(0, 10);
const otherRepairs = remainingRepairs.filter((f) => !waRepairs.includes(f)).slice(0, 6);

for (const [workerId, lane, fams, note] of [
  ["FABLE-R3", "FIX10", waRepairs,
    "All nine share the Washington vacate host. Repair the instructions obligations (FEE_AND_WAIVER, FILING_DESTINATION, SERVICE, SELF_HELP_STOP) from sourced material without touching packet bytes, so the raster receipts survive. ROUTE_OPTIONS on the four families that fail it is the duplicate-byte route-election question: classify it from the official form's face (does the form carry a ground or election the participant must mark? South Dakota's host carries routeSelectionId and passes) — if the form does, the packet is missing a route election and that IS a byte repair, do it per the SD pattern and say the receipts die; if it is genuinely a legal question, return BLOCKED_LEGAL_INPUT naming it."],
  ["FABLE-R4", "FIX11", otherRepairs,
    "Packet-content failures (REPEATING_ROWS, KNOWN_PREFILLS, SELF_HELP_STOP). Byte changes are expected: rebuild deterministically, twice byte-identical, and state that the raster receipt is invalidated so the captain re-rasters."],
]) {
  if (!fams.length) continue;
  assignments.push(assignment(workerId, {
    mode: "PACKET_REPAIR",
    role: "Fable director subagent (isolated worktree)",
    lane, laneKind: "repair",
    subjectIds: fams,
    subjects: fams.map((f) => ({ ...familyDetail(f), firstReadBy: releasedVerify.get(f) ?? null })),
    claimPlan: claimPlanFor(fams, "repair", lane),
    claimAssertions: claimPlanFor(fams, "repair", lane).map((p) => p.workerCommand),
    claimPrerequisite: "claimPlan is per subject: MINT rows are minted by the director before the agent starts; TRANSFER rows are moved with claim.mjs --transfer. Assert before touching anything; a refusal is a full stop.",
    laneNote: note,
    ownedPaths: fams.map((f) => dirOf.get(f)).filter(Boolean).map((d) => `${d}/**`),
    prohibitedPaths: [
      `${FACT}/claim-ledger.json`, `${FACT}/RASTER_QUEUE.json`,
      `${FACT}/MASTER_QUEUE.json`, `${FACT}/ACTIVE_ASSIGNMENTS.json`,
    ],
    controllingEvidencePaths: [
      "data/rcap-grade-a/launch-control/next-waves/REPAIR_BY_DEFECT_CLASS.json",
      "data/rcap-grade-a/launch-control/next-waves/PARTICIPANT_INSTRUCTIONS_GAP.json",
      "data/rcap-grade-a/fable-packet-factory/FACTORY_MEMORY.md",
    ],
    focusedTestCommands: [
      "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
      "node scripts/grade-a-packet-factory-24h/verify-lane-contracts.mjs",
    ],
    rasterDisposition: "Instructions-only repairs leave packet bytes untouched and the receipt survives — say so explicitly per family. Byte changes invalidate the receipt — say that too.",
    repairerSeparation: "You repair. A different worker verifies.",
    stopConditions: [
      "a claim assert is refused",
      "the repair would require an unsourced court, fee, waiver route or service rule",
      "a live verification grant is open on the family",
    ],
    branchPrefix: "fable/",
    expiresAt: null,
  }));
}

/* ---- Fable verifier: the four Virginia families ---------------------------- */
/*
 * The highest-probability genuine passes in the tree. All four measured clean
 * on every corpus-free obligation; two were blocked solely on SOURCE_IDENTITY
 * (the corpus is now reachable) and two on the CC-1203 form question, settled
 * from the forms' own faces in DETERMINATION_CC1203_SUBSTITUTION.json.
 */
const VA_FOUR = ["va_seal_petition_felony-set", "va_seal_petition_misdemeanor-set",
  "va_seal_enumerated_seven_year-set", "va_seal_ancillary_matter_only-set"]
  .filter((f) => rasterPass.includes(f));
if (VA_FOUR.length) {
  assignments.push(assignment("FABLE-V2", {
    mode: "SECOND_INDEPENDENT_READ",
    role: "Fable director subagent (isolated worktree, read-only on packet bodies)",
    lane: "VF26", laneKind: "independent-verification",
    subjectIds: VA_FOUR,
    subjects: VA_FOUR.map((f) => ({ ...familyDetail(f), firstReadBy: releasedVerify.get(f) ?? null })),
    claimPlan: claimPlanFor(VA_FOUR, "independent-verification", "VF26"),
    claimAssertions: claimPlanFor(VA_FOUR, "independent-verification", "VF26").map((p) => p.workerCommand),
    claimPrerequisite: "claimPlan per subject; TRANSFER rows are moved by the director before the agent starts.",
    controllingEvidencePaths: [
      "data/rcap-grade-a/fable-packet-factory/DETERMINATION_CC1203_SUBSTITUTION.json",
      "data/rcap-grade-a/fable-packet-factory/FACTORY_MEMORY.md",
    ],
    ownedPaths: ["data/rcap-grade-a/packet-factory-24h/vf26/**", "data/rcap-grade-a/fable-packet-factory/returns/v2/**"],
    prohibitedPaths: ["data/rcap-all50/**"],
    focusedTestCommands: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs"],
    rasterDisposition: "Each family holds a complete-coverage hash-bound RASTER_PASS; bind it, never re-render.",
    independentVerifierSeparation: "This agent has built and repaired nothing.",
    stopConditions: ["an assert is refused", "an obligation is not measurable here (NOT_MEASURABLE is the answer, never a pass)"],
    branchPrefix: "fable/",
    expiresAt: null,
  }));
}

/* ---- Codex Cloud: eight slots --------------------------------------------- */
/* All eight, not five. The mission allots VF18-VF25 and the fill order puts
 * verification first; provisioning five left 35 transfer-eligible families
 * against 5 lanes and three slots doing research while packet verification was
 * the binding constraint. Research is the fallback for when verification work
 * runs out, which it has not. */
const VF_LANES = ["VF18", "VF19", "VF20", "VF21", "VF22", "VF23", "VF24", "VF25"];
const cloudVerify = secondReadCandidates
  .filter((f) => !duplicateFamilies.has(f))
  .slice(0, VF_LANES.length);

const cloudSlots = [];
for (let i = 0; i < 8; i += 1) {
  const id = `CLOUD0${i + 1}`;
  const family = cloudVerify[i] ?? null;
  if (family) {
    const lane = VF_LANES[i];
    cloudSlots.push(assignment(id, {
      mode: "SECOND_INDEPENDENT_READ",
      role: "Codex Cloud verification slot (isolated, read-only on packet bodies)",
      lane, laneKind: "independent-verification",
      subjectIds: [family],
      subjects: [{ ...familyDetail(family), firstReadBy: releasedVerify.get(family) }],
      /*
       * NOT an --assert. Every RASTER_PASS family already holds an
       * independent-verification claim, so a second grant is a duplicate
       * subject+operation and claim.mjs refuses it. Telling a worker to assert
       * here is precisely how XVF-A and XVF-B burned a lane each.
       */
      claimPrerequisite: `Captain must first run: node scripts/grade-a-packet-factory-24h/claim.mjs --transfer ${releasedVerify.get(family)} ${lane} ${family} --reason "second independent read; the family earned a RASTER_PASS the first read did not have". Do not assert until CONTROL_STATE.json shows this transfer completed — a fresh assert on this family is a duplicate and will be refused.`,
      claimAssertions: [`node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${lane} ${family}   # only after Captain's transfer`],
      whyASecondRead: "The first read predates this family's hash-bound raster receipt over its complete document set. That receipt is evidence the first reader did not have.",
      ownedPaths: [`${CTL}/returns/${id}/${assignmentIdFor(id, family ? VF_LANES[i] : `DISC${String(7 + i).padStart(2, "0")}`)}/**`],
      prohibitedPaths: [
        "data/rcap-all50/**", `${FACT}/**`,
        "any packet PDF, overlay, field map, build script or source receipt",
      ],
      readOnly: "You write evidence only, under your own return path. You modify no packet and no source body.",
      controllingEvidencePaths: [
        dirOf.get(family) ? `${dirOf.get(family)}/**` : null,
        "data/rcap-grade-a/launch-control/GRADE_A_READINESS.json",
      ].filter(Boolean),
      focusedTestCommands: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs"],
      theFifteenObligations: [
        "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
        "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
        "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
        "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP",
      ],
      scoreAllFifteen: "A PASS_COMPLETE_INDEPENDENT verdict requires every one of the fifteen. Lane contract L9 refuses the verdict from a return that scored a subset — one lane already had five verdicts withdrawn for exactly this.",
      rasterDisposition: "This family holds a hash-bound RASTER_PASS over its whole document set. That is one gate. Your read is the other.",
      stopConditions: [
        "CONTROL_STATE.json does not show the transfer completed",
        "the assert is refused",
        "you cannot measure an obligation in this environment (return NOT_MEASURABLE_HERE, never a pass)",
      ],
      expiresAt: null,
    }));
  } else {
    cloudSlots.push(assignment(id, {
      mode: "RESEARCH_EVIDENCE_ONLY",
      role: "Codex Cloud research slot (isolated, evidence-only)",
      lane: `DISC${String(7 + i).padStart(2, "0")}`,
      laneKind: "source-discovery",
      subjectIds: [],
      subjects: [],
      claimAssertions: [],
      claimPrerequisite: "None. This slot writes evidence and holds no canonical claim; it cannot release a source or promote bytes.",
      whyNoVerificationWork: `Every RASTER_PASS family already holds an independent-verification claim (${anyVerify.size} families claimed, ${liveVerify.size} live), so only ${secondReadCandidates.length} are transfer-eligible and ${VF_LANES.length} verification lanes are provisioned. This slot researches instead of idling.`,
      task: "Source identity and currentness research on families the master queue holds at SOURCE_BLOCKED, and route crosswalk research from controlling repository decisions.",
      ownedPaths: [`${CTL}/returns/${id}/${assignmentIdFor(id, family ? VF_LANES[i] : `DISC${String(7 + i).padStart(2, "0")}`)}/**`],
      prohibitedPaths: ["data/rcap-all50/**", `${FACT}/**`, "private/**"],
      readOnly: "Evidence only. Never record a source identity you did not corroborate, never fabricate a URL, and never impersonate a live source claim.",
      controllingEvidencePaths: [
        `${FACT}/SOURCE_IDENTITY_FINDINGS.json`,
        `${FACT}/SOURCE_RELATIONSHIP_REGISTRY.json`,
      ],
      focusedTestCommands: ["node scripts/grade-a-packet-factory-24h/verify-source-relationship-model.mjs"],
      rasterDisposition: "Not applicable; this slot renders nothing.",
      stopConditions: ["a source cannot be corroborated from committed evidence — record it STOPPED with the reason, never a guess"],
      expiresAt: null,
    }));
  }
}
assignments.push(...cloudSlots);

for (const a of assignments) write(`${CTL}/assignments/${a.workerId}.json`, a);

/* ---- the index the generator and F24 read --------------------------------- */
const index = {
  schemaVersion: "rcap-external-assignments/v1",
  generatedAt: now,
  captainSha: head,
  minimumAncestor: MIN_ANCESTOR,
  purpose: "The canonical record of externally dispatched lanes. The packet-factory generator reads this so regeneration cannot delete an external grant, and F24 reads it so an external grant is not an undispatched one.",
  externalLanes: [...new Set(assignments.map((a) => a.lane))].sort(),
  workers: assignments.map((a) => ({
    workerId: a.workerId, assignmentVersion: a.assignmentVersion, mode: a.mode,
    assignmentId: a.assignmentId,
    lane: a.lane, laneKind: a.laneKind, subjectIds: a.subjectIds,
    /* What a claim on these subjects is actually keyed by. */
    operation: (a.claimPlan ?? [])[0]?.operation
      ?? (ledger.claims.find((c) => a.subjectIds?.includes(c.subjectId) && c.laneKind === a.laneKind)?.operation)
      ?? a.laneKind,
    subjectCount: a.subjectIds.length,
    requiresCaptainTransferFirst: (a.claimPlan ?? []).some((p) => p.kind === "TRANSFER")
      || Boolean(a.claimPrerequisite && /--transfer/.test(a.claimPrerequisite)),
    captainTransferCommands: (a.claimPlan ?? []).filter((p) => p.kind === "TRANSFER").map((p) => p.captainAction),
  })),
  claudeOwnershipUntouched: {
    liveClaudeClaimsAtGeneration: ledger.claims.filter((c) => c.released !== true).length,
    /* Overlap means a live claim on a lane OTHER than the one this assignment
     * targets. A worker's own activated grant is not a theft of its own work. */
    externalSubjectsOverlappingALiveClaim: assignments.flatMap((a) =>
      (a.subjectIds ?? []).filter((s) => ledger.claims.some((c) =>
        c.subjectId === s && c.released !== true && c.lane !== a.lane))
        .map((s) => `${a.workerId}/${a.lane}:${s}`)),
  },
  commercialRoutesOpened: 0,
  productionTouched: false,
};
if (index.claudeOwnershipUntouched.externalSubjectsOverlappingALiveClaim.length) {
  console.error("REFUSED: an external assignment names a subject a live Claude claim holds:");
  for (const s of index.claudeOwnershipUntouched.externalSubjectsOverlappingALiveClaim) console.error(`  ${s}`);
  process.exit(1);
}
write(`${CTL}/EXTERNAL_ASSIGNMENTS.json`, index);

write(`${CTL}/CAPACITY.json`, {
  schemaVersion: "rcap-external-capacity/v1",
  measuredAt: now, captainSha: head,
  perBatchCaps: CAP,
  eligibleNow: {
    sourceReadyWithoutBuilder: sourceReadyUnowned.length,
    failRepairRequiredWithoutRepairer: failNoRepairer.length,
    rasterPassWithoutAnyVerificationClaim: neverRead.length,
    rasterPassTransferEligibleForASecondRead: secondReadCandidates.length,
    rasterPassWithALiveVerifier: rasterPass.filter((f) => liveVerify.has(f)).length,
  },
  theConstraintThatShapesThis:
    "Zero RASTER_PASS families lack an independent-verification claim, so no second read is mintable and every one needs claim.mjs --transfer. Provisioning eight cloud verification lanes would have produced three assignments that cannot be claimed.",
  duplicateBytes: {
    groups: duplicateGroups.length,
    families: duplicateFamilies.size,
    heldOutOfVerification: "families sharing bytes are excluded from second-read assignment until PF-B classifies whether identical bytes across distinct statutory routes is a defect; one read over twelve families is not twelve verdicts",
  },
});

console.log(`EXTERNAL_ASSIGNMENTS written at ${head.slice(0, 9)}`);
for (const a of assignments) {
  console.log(`  ${a.workerId.padEnd(11)} v${String(a.assignmentVersion).padEnd(3)} ${a.mode.padEnd(26)} ${a.lane.padEnd(7)} ${a.subjectIds.length} subject(s)`);
}
console.log(`  overlap with a live Claude claim: 0`);
