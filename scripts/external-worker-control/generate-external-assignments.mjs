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
const sourceReadyUnowned = master.families
  .filter((f) => f.state === "SOURCE_READY" && !liveBuild.has(f.familyId))
  .map((f) => f.familyId);
const failNoRepairer = master.families
  .filter((f) => f.state === "FAIL_REPAIR_REQUIRED" && !liveRepair.has(f.familyId))
  .map((f) => f.familyId);
/* Second-read candidates: the first read is finished AND the family has since
 * earned a raster receipt the first read did not have. */
const secondReadCandidates = rasterPass
  .filter((f) => releasedVerify.has(f) && !liveVerify.has(f));
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
    return { kind: "MINT", holdingLane: null,
      captainAction: null,
      workerCommand: `node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${targetLane} ${subjectId}` };
  }
  if (held.released !== true) {
    return { kind: "BLOCKED_LIVE", holdingLane: held.lane, captainAction: null, workerCommand: null };
  }
  return {
    kind: "TRANSFER", holdingLane: held.lane,
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

const assignment = (workerId, spec) => ({
  ...COMMON,
  workerId,
  assignmentVersion: priorVersion(workerId) + 1,
  ...spec,
  returnPath: `${CTL}/returns/${workerId}`,
});

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
      ownedPaths: [`${CTL}/returns/${id}/**`],
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
      ownedPaths: [`${CTL}/returns/${id}/**`],
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
    lane: a.lane, laneKind: a.laneKind, subjectIds: a.subjectIds,
    subjectCount: a.subjectIds.length,
    requiresCaptainTransferFirst: (a.claimPlan ?? []).some((p) => p.kind === "TRANSFER")
      || Boolean(a.claimPrerequisite && /--transfer/.test(a.claimPrerequisite)),
    captainTransferCommands: (a.claimPlan ?? []).filter((p) => p.kind === "TRANSFER").map((p) => p.captainAction),
  })),
  claudeOwnershipUntouched: {
    liveClaudeClaimsAtGeneration: ledger.claims.filter((c) => c.released !== true).length,
    externalSubjectsOverlappingALiveClaim: assignments
      .flatMap((a) => a.subjectIds)
      .filter((s) => liveBuild.has(s) || liveRepair.has(s) || liveVerify.has(s) || livePromo.has(s)),
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
