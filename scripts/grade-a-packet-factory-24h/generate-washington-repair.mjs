#!/usr/bin/env node
/**
 * The Washington repair, sized by the evidence rather than by the family count.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-washington-repair.mjs [--check]
 *
 * P2V01 to P2V03 returned FAIL_REPAIR_REQUIRED on all nine Washington vacatur
 * families, and the evidence is the same sentence nine times: the participant
 * instructions state neither the fee nor a waiver route, and identify neither
 * the service recipient nor the method. The import graph says the same thing
 * from the other side -- all nine import one host,
 * build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs, and that host writes
 * the instructions.
 *
 * So this is not nine defects. It is one shared host that writes a placeholder
 * where two facts belong, and the two facts are not in this repository: the
 * census carries the destination court for each route and no fee schedule, no
 * waiver route and no service list. A repair lane that "fixed" the instructions
 * would be inventing law.
 *
 * Four lanes, therefore, and each has a different kind of work:
 *   WAR01 corrects the shared host -- one owner, runs first.
 *   WAR02 is a source obligation, because the fee and service facts must be
 *         acquired from the Washington courts before anyone can write them.
 *   WAR03 and WAR04 re-render, once WAR01 and WAR02 have landed.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";
import { preflightDenominator } from "./preflight-denominator.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

/*
 * Two places here stated "14/14" by hand. The number belongs to the command a
 * worker actually runs -- family-scoped, in cloud mode -- and that command
 * prints 15/15, because cloud mode replaces three checks rather than waiving
 * them. A hand-written denominator cannot follow the roster, and a worker told
 * to expect a number the preflight does not print cannot tell an improvement
 * from a regression.
 */
const PREFLIGHT_MUST_RETURN = preflightDenominator(["--family", "__denominator_probe__", "--codex-cloud"]).mustReturn;

const OUT = "data/rcap-grade-a/packet-factory-24h/WASHINGTON_REPAIR.json";
const PROMPT_DIR = "docs/rcap/grade-a/packet-factory-24h/washington-repair";
const RETURN_ROOT = "data/rcap-grade-a/codex-cloud";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const SHARED_HOST = "scripts/build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs";

const MINIMUM_CAPTAIN_SHA = "72f99073c42bd28e3469efe316378b37601717c7";
const VERIFIER_COMMIT = "cdab63779";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

/* The evidence, read from the verifiers' own returns. */
const evidence = [];
for (const shard of ["01", "02", "03"]) {
  const rel = `${RETURN_ROOT}/p2v${shard}-washington-independent-verification/repair-assignments.json`;
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  for (const r of read(rel).repairAssignments ?? []) {
    evidence.push({
      familyId: r.itemId,
      verdict: r.verdict,
      shard: `P2V${shard}`,
      decisiveDefect: r.decisiveDefect,
      failedProofObligations: r.failedProofObligations,
      repairScope: r.repairScope,
      evidencePath: rel,
      reproduction: `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${r.itemId}`,
      directory: `${OVERLAYS}/wa/${r.itemId.replace(/_/g, "-")}--official-pdf-fill`,
      instructionsPath: `${OVERLAYS}/wa/${r.itemId.replace(/_/g, "-")}--official-pdf-fill/participant-instructions.md`
    });
  }
}
const FAMILIES = evidence.map((e) => e.familyId);

const obligationsPerFamily = [...new Set(evidence.map((e) => e.failedProofObligations.map((o) => o.obligation).sort().join("+")))];

const CLOUD_PROHIBITED = ["git fetch", "git pull", "git push", "gh ", "git worktree", "git clone", "git remote add"];
const RETURN_TAIL = [
  "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
  `PREFLIGHT: ${PREFLIGHT_MUST_RETURN.replace(": ", " ")}`, "DIFF LEFT FOR THE CODEX UI: YES"
];
const base = (id, slug, lane, sequence, extra) => ({
  assignmentId: id,
  wave: "washington-repair",
  engine: "Codex Cloud",
  environment: "LegalEase Packet Factory",
  executionContract: CONTRACT,
  captainBranch: CAPTAIN_BRANCH,
  workerBranch: "work",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  lane,
  sequence,
  prohibitedCommands: CLOUD_PROHIBITED,
  taskIsolation: [
    "THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.",
    "DO NOT EXECUTE THE OTHER WASHINGTON REPAIR PROMPTS IN THIS CONTAINER."
  ],
  returnDirectory: `${RETURN_ROOT}/${slug}`,
  ...extra
});

const assignments = [];

assignments.push(base("WAR01_WA_SHARED_INSTRUCTION_HOST", "war01-wa-shared-instruction-host", "shared-host-repair", 1, {
  mission: "Correct the one host that writes the participant instructions for all nine Washington vacatur families, so it states the fee, the waiver route, the service recipient and the service method from route data — or names them as required-before-filing items the participant must obtain, with who to ask. It must never say 'confirm local requirements' and stop there.",
  whyOneLane: `All nine families import ${path.basename(SHARED_HOST)} and all nine fail the same two obligations. One shared host has one owner; nine lanes editing one file is nine writers on one script.`,
  itemKind: "sharedModule",
  itemCount: 1,
  items: [SHARED_HOST],
  familiesItReaches: FAMILIES,
  theDefect: {
    failedObligations: ["feeAndWaiver", "service"],
    observed: "Instructions say only to confirm local fee and service requirements.",
    expected: "The fee and any waiver route stated, and the service recipient and method identified — or each named as a required-before-filing item with the office to ask.",
    everyFamily: true,
    evidence: evidence.map((e) => ({ familyId: e.familyId, shard: e.shard, evidencePath: e.evidencePath }))
  },
  theHardPart: "The census carries the destination court for each route and carries no fee schedule, no waiver route and no service list. You may not invent them. Where WAR02 has supplied a sourced fact, write it; where it has not, emit an explicit required-before-filing item naming the exact office the participant must ask. A vague instruction and an invented one are both failures; only the named question is honest.",
  dependsOn: [],
  ownedPaths: [SHARED_HOST, `${RETURN_ROOT}/war01-wa-shared-instruction-host/**`],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/rcap-packet-completeness/**", "data/rcap-grade-a/launch-control/**"],
  rendersNoPackets: true,
  requiredOutputs: [
    `${SHARED_HOST} — the corrected instruction assembler`,
    `${RETURN_ROOT}/war01-wa-shared-instruction-host/rows.json — one row per obligation corrected, and the nine families it reaches`
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: [`node ${PREFLIGHT} --family ${FAMILIES[0]} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`],
  stopConditions: [
    "LANE STOP — you render no packet and you write into no overlay directory. Re-rendering is WAR03 and WAR04.",
    "NEVER invent a fee, a waiver route, a service recipient or a service method. A fact the repository does not hold is a required-before-filing item naming who to ask.",
    "ROW STOP — an obligation you cannot emit honestly from route data is STOPPED naming exactly what is missing."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "OBLIGATIONS CORRECTED:", "FACTS INVENTED: 0", "PACKETS RENDERED: 0", ...RETURN_TAIL],
  grantsNothing: "A corrected host is corrected logic. It renders no packet and proves none."
}));

assignments.push(base("WAR02_WA_FEE_AND_SERVICE_SOURCE", "war02-wa-fee-and-service-source", "source-swarm", 1, {
  mission: "Establish, from the official Washington publisher, the filing fee and waiver route and the service requirement for each of the nine vacatur routes. These are the two facts the packets are missing and the repository does not hold.",
  whyThisIsASourceLaneAndNotARepair: "The verifier was right to refuse to infer them and a repair lane would be equally wrong to. A fee schedule and a service rule are published facts with an issuer and a URL, which makes them a source obligation.",
  itemKind: "sourceObligation",
  itemCount: FAMILIES.length * 2,
  items: FAMILIES.flatMap((f) => [`${f}::filing-fee-and-waiver-route`, `${f}::service-recipient-and-method`]),
  familiesUnblocked: FAMILIES,
  familiesUnblockedCount: FAMILIES.length,
  issuingHosts: ["Washington Courts (courts.wa.gov)", "the sentencing district or municipal court named by each route"],
  everyResolvedFactRecords: ["official publisher", "exact title", "citation or form number", "revision", "official URL", "SHA-256 of the captured page or document", "custody path"],
  dependsOn: [],
  egressReality: "This environment refuses outbound egress. Anything needing a fetch is dispatched through .github/workflows/rcap-official-source-acquisition.yml with an exact URL, never attempted locally and never faked.",
  ownedPaths: [`${RETURN_ROOT}/war02-wa-fee-and-service-source/**`, "data/rcap-grade-a/source-acquisition/packet-factory-24h/war02-wa-fee-and-service-source/**"],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "data/rcap-grade-a/launch-control/**", "private/**"],
  requiredOutputs: [
    `${RETURN_ROOT}/war02-wa-fee-and-service-source/rows.json — one row per fact: itemId, status, the sourced value or the exact acquisition instruction`,
    "data/rcap-grade-a/source-acquisition/packet-factory-24h/war02-wa-fee-and-service-source/receipts.json — the seven recorded fields per resolved fact; no body is committed"
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: ["node scripts/grade-a-packet-factory-24h/verify.mjs"],
  stopConditions: [
    "NEVER state a fee or a service rule you have not sourced. An unsourced number in a filing instruction is worse than an absent one, because the participant will act on it.",
    "NEVER accept an unofficial mirror or a summary site. The court's own publication or nothing.",
    "LANE STOP — you write no packet and no build script.",
    "ROW STOP — a fact that cannot be sourced is STOPPED naming the exact office and URL that would publish it."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "FACTS SOURCED:", "FACTS STOPPED:", "UNSOURCED VALUES WRITTEN: 0", ...RETURN_TAIL],
  grantsNothing: "A sourced fee is a sourced fee. It writes no packet and proves none."
}));

/* Two re-render lanes, five and four, both waiting on the host and the facts. */
const halves = [FAMILIES.slice(0, 5), FAMILIES.slice(5)];
halves.forEach((fams, i) => {
  const n = String(i + 3).padStart(2, "0");
  const slug = `war${n}-wa-rerender-${i + 1}`;
  assignments.push(base(`WAR${n}_WA_RERENDER_${i + 1}`, slug, "packet-repair", 2, {
    mission: `Re-render ${fams.length} Washington vacatur families on the corrected host and the sourced facts, and confirm each returns all nine completeness counters at zero.`,
    itemKind: "packetFamily",
    itemCount: fams.length,
    items: fams,
    dependsOn: ["WAR01_WA_SHARED_INSTRUCTION_HOST", "WAR02_WA_FEE_AND_SERVICE_SOURCE"],
    doNotStartEarly: "Do not start until Captain has integrated WAR01 and WAR02 and published a base that carries both. Re-rendering on the old host reproduces the same two failures.",
    familyDetail: fams.map((f) => evidence.find((e) => e.familyId === f)),
    ownedPaths: [...fams.map((f) => `${OVERLAYS}/wa/${f.replace(/_/g, "-")}--official-pdf-fill/**`), `${RETURN_ROOT}/${slug}/**`],
    prohibitedPaths: [SHARED_HOST, "scripts/rcap-packet-completeness/**", "data/rcap-grade-a/launch-control/**"],
    whyYouDoNotOwnTheHost: `${SHARED_HOST} is WAR01's. Two re-render lanes editing it would be two writers on one script.`,
    requiredOutputs: [
      ...fams.map((f) => `${OVERLAYS}/wa/${f.replace(/_/g, "-")}--official-pdf-fill/ — re-rendered`),
      `${RETURN_ROOT}/${slug}/rows.json — one row per family: itemId, status, the nine counters after`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: fams.map((f) => `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${f}`),
    stopConditions: [
      `LANE STOP — you do not edit ${SHARED_HOST}.`,
      "ROW STOP — a family whose instructions still lack a sourced fee or service rule is STOPPED naming which, and the lane continues to the next family.",
      "NEVER invent a fact and never write a protected field."
    ],
    returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "FAMILIES ASSIGNED:", "ROWS RETURNED (must equal FAMILIES ASSIGNED):", "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:", ...RETURN_TAIL],
    grantsNothing: "A repaired family must be verified again, by a lane that neither built nor repaired it."
  }));
});

/* Reverification, provisioned and explicitly not launchable yet. */
halves.forEach((fams, i) => {
  const n = String(i + 1).padStart(2, "0");
  const slug = `warv${n}-wa-reverification`;
  assignments.push(base(`WARV${n}_WA_REVERIFICATION`, slug, "independent-verification", 3, {
    mission: `Verify independently that ${fams.length} repaired Washington families are complete, including the two obligations that failed the first time.`,
    itemKind: "packetFamily",
    itemCount: fams.length,
    items: fams,
    launchNow: false,
    launchRule: "DO NOT LAUNCH YET. Captain creates this assignment from a new HEAD once the matching WAR re-render checkpoint is integrated. A verifier started before the repaired packet exists in its checkout verifies the artifact it was supposed to replace.",
    mayNotBeRunBy: [
      "P2_WASHINGTON — the builder that rendered these packets",
      i === 0 ? "WAR03_WA_RERENDER_1" : "WAR04_WA_RERENDER_2",
      `P2V0${i + 1} — the shard that failed them the first time`,
      "any PF or FIX lane in this dispatch"
    ],
    threeWayIndependence: "Neither the builder nor the repairer nor the shard that failed it the first time. A verifier who already formed a view of these packets is not a fresh reading of them.",
    dependsOn: [i === 0 ? "WAR03_WA_RERENDER_1" : "WAR04_WA_RERENDER_2"],
    proofObligations: [
      "FEE AND WAIVER: the instructions state the fee and any waiver route, or name it as a required-before-filing item with the office to ask — not 'confirm locally'",
      "SERVICE: the instructions identify who must be served and how, on the same terms",
      "every other obligation in the standard fifteen"
    ],
    verdicts: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"],
    ownedPaths: [`${RETURN_ROOT}/${slug}/**`],
    prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**", "data/rcap-grade-a/launch-control/**"],
    requiredOutputs: [`${RETURN_ROOT}/${slug}/rows.json — one row per family: itemId, verdict, the obligations as you measured them`],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"], rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: fams.map((f) => `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${f}`),
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script.",
      "ROW STOP — an instruction that still says only 'confirm local requirements' is FAIL_REPAIR_REQUIRED, however many counters are zero."
    ],
    returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:", "OVERLAY DIRECTORIES MODIFIED: 0", ...RETURN_TAIL],
    grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no route."
  }));
});

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;

/* ---- retirement, measured rather than declared -----------------------------
 *
 * This dispatch was cut for Codex Cloud at 72f99073c and no lane in it ever
 * ran: not one of the six return directories exists. In the meantime the same
 * nine families were repaired in-session on the FIX lanes, re-read by two
 * independent verification lanes, and failed again on the participant-facing
 * obligations — so the factory's own claim ledger, not this record, is where
 * their ownership now lives. Conveyor check C7 caught it exactly there: seven
 * families owned by a live FIX grant AND by WAR03/WAR04 at the same time.
 *
 * An assignment nobody executed is not work in progress, and a record that
 * keeps naming an owner for a family somebody else holds makes the queue lie
 * about who is doing what. So the whole dispatch retires when two things are
 * measured true on this run: no lane returned, and no family it names still
 * needs it — each is either held live by another lane or already settled at
 * VERIFIED_PASS or COMPLETE_PACKET_PROVEN. A current legal or product-path
 * hold also cannot be assigned to this old packet-repair dispatch; those holds
 * remain explicit and are not counted as settled. Recompute every run, and
 * validate the current import graph before a dispatch can resume.
 *
 * Retirement is not deletion. The root-cause analysis, the import graph, the
 * evidence and all six prompts stay exactly as written — they are the best
 * account of this defect anyone has produced, and whichever lane finally
 * fixes the shared host will read them. What retirement withdraws is the one
 * thing that was no longer true: the claim of current ownership.
 */
const ledgerClaims = (() => {
  try { return read("data/rcap-grade-a/packet-factory-24h/claim-ledger.json").claims ?? []; }
  catch { return []; }
})();
const masterFamilies = (() => {
  try { return read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json").families ?? []; }
  catch { return []; }
})();
const SETTLED = new Set(["COMPLETE_PACKET_PROVEN", "VERIFIED_PASS"]);
const HELD_OUTSIDE_REPAIR = new Set(["LEGAL_BLOCKED", "PRODUCT_PATH_PENDING"]);
const heldByAnotherLane = new Set(ledgerClaims
  .filter((c) => c.released !== true && !/^WAR/.test(String(c.lane)))
  .map((c) => c.subjectId));
const settled = new Set(masterFamilies.filter((f) => SETTLED.has(f.state)).map((f) => f.familyId));
const heldOutsideRepair = masterFamilies.filter((f) => FAMILIES.includes(f.familyId) && HELD_OUTSIDE_REPAIR.has(f.state))
  .map((f) => ({ familyId: f.familyId, state: f.state, executionOwner: f.executionOwner ?? null }));
const heldOutsideRepairIds = new Set(heldOutsideRepair.map((f) => f.familyId));
const stillNeedsThisDispatch = FAMILIES.filter((f) => !heldByAnotherLane.has(f) && !settled.has(f) && !heldOutsideRepairIds.has(f));
const laneThatReturned = assignments.filter((a) => fs.existsSync(path.join(ROOT, a.returnDirectory)))
  .map((a) => a.assignmentId);
const retired = laneThatReturned.length === 0 && stillNeedsThisDispatch.length === 0;
const dispatchStatus = retired ? "RETIRED_NEVER_EXECUTED" : "CURRENT";
const retirement = {
  status: dispatchStatus,
  measuredOn: {
    lanesThatReturned: laneThatReturned,
    familiesStillNeedingThisDispatch: stillNeedsThisDispatch,
    familiesHeldByAnotherLiveLane: FAMILIES.filter((f) => heldByAnotherLane.has(f)),
    familiesAlreadySettled: FAMILIES.filter((f) => settled.has(f)),
    familiesHeldOutsidePacketRepair: heldOutsideRepair
  },
  whatRetirementWithdraws: "current ownership, and nothing else. The analysis, the evidence and every prompt remain.",
  whatRetirementDoesNotMean: "It does not mean a defect is fixed or a held family is approved. Current legal and product-path holds remain outside this historical packet-repair dispatch, with their state and execution owner recorded separately from settled families.",
  howItComesBack: "Conditions are recomputed on every run. A return directory appearing, or an unsettled family with no other owner or current legal/product-path hold, requires the current import graph to pass before this dispatch can resume."
};

/* Retired analysis describes the exact dispatch bytes. Later family-exclusive
 * repairs may replace wrappers without rewriting that history. A dispatch
 * that would resume must still satisfy the original guard on current bytes. */
const importGraphAt = retired ? MINIMUM_CAPTAIN_SHA : "working-tree";
const importsOf = (familyId) => {
  const rel = `scripts/build-census-v1-${familyId}.mjs`;
  const text = retired ? git(["show", `${MINIMUM_CAPTAIN_SHA}:${rel}`]) : fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (text === null) throw new Error(`Washington repair: cannot read dispatch import evidence ${MINIMUM_CAPTAIN_SHA}:${rel}`);
  return [...text.matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]);
};
const graph = FAMILIES.map((f) => ({ familyId: f, imports: importsOf(f) }));
const allImportTheHost = graph.every((g) => g.imports.includes(path.basename(SHARED_HOST)));

/* ---- refusals ------------------------------------------------------------- */
const problems = [];
if (FAMILIES.length !== 9) problems.push(`${FAMILIES.length} families in the evidence, expected 9`);
if (!allImportTheHost) problems.push("not every Washington family imports the shared host; the one-owner premise does not hold");
if (obligationsPerFamily.length !== 1) problems.push(`${obligationsPerFamily.length} distinct failure shapes; the single-root-cause premise does not hold`);
const repairLanes = assignments.filter((a) => a.lane !== "independent-verification");
if (repairLanes.length < 3 || repairLanes.length > 6) problems.push(`${repairLanes.length} repair lanes, outside 3 to 6`);
const hostWriters = assignments.filter((a) => a.ownedPaths.includes(SHARED_HOST)).map((a) => a.assignmentId);
if (hostWriters.length !== 1) problems.push(`${hostWriters.length} writers on the shared host`);
const rerendered = assignments.filter((a) => a.lane === "packet-repair").flatMap((a) => a.items);
if (new Set(rerendered).size !== FAMILIES.length) problems.push("the re-render lanes do not cover every family exactly once");
if (assignments.some((a) => a.lane === "independent-verification" && a.launchNow !== false)) problems.push("a reverification lane is launchable before its repair exists");
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real dispatch base");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) problems.push("the dispatch base is not an ancestor of HEAD");
if (problems.length) {
  console.error(`Washington repair: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-washington-repair/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-washington-repair.mjs",
  question: "Nine families failed. Is that nine defects, or one?",
  answer: "One. All nine import one host, all nine fail the same two obligations, and that host writes the instructions those obligations are about.",
  verifierCommit: VERIFIER_COMMIT,
  dispatchBase: MINIMUM_CAPTAIN_SHA,
  rootCauseAnalysis: {
    familiesFailed: FAMILIES.length,
    distinctFailureShapes: obligationsPerFamily,
    sharedHost: SHARED_HOST,
    importGraphAt,
    everyFamilyImportsTheHost: allImportTheHost,
    importGraph: graph,
    theFactsAreNotInTheRepository: "The census carries the destination court for each route and carries no fee schedule, no waiver route and no service list. A repair lane that wrote them would be inventing law, which is why WAR02 is a source lane and not a repair lane.",
    whyNotNineLanes: "Nine lanes would put nine writers on one script and would ask each to solve the same problem.",
    whyNotOneLane: "One lane would mix a shared-logic correction, an unresolved source obligation and nine re-renders into a single return that could only be integrated whole."
  },
  evidence,
  retirement,
  lanes: {
    repair: repairLanes.map((a) => a.assignmentId),
    reverification: assignments.filter((a) => a.lane === "independent-verification").map((a) => a.assignmentId),
    sequence: retired
      ? "Retired without executing. The sequence WAR01 and WAR02, then WAR03 and WAR04, then WARV01 and WARV02 was never entered: no lane returned, and every family it named is now held by another live lane, already settled, or subject to a current legal or product-path hold outside packet repair."
      : "WAR01 and WAR02 run now and in parallel. WAR03 and WAR04 wait for both. WARV01 and WARV02 are provisioned and are launched by Captain from a new HEAD once their re-render is integrated."
  },
  commercialRoutesOpened: 0,
  productionTouched: false,
  /* Only a current dispatch names owners. A retired one carries its lanes
   * under retiredAssignments, where every downstream reader — C7's owner
   * sweep among them — sees exactly what is true: this record owns nothing. */
  assignments: retired ? [] : assignments,
  ...(retired ? { retiredAssignments: assignments } : {})
};

const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}  ·  **Sequence:** ${a.sequence}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``);
  p.push("**Branch in the container:** `work` — Codex Cloud names it.");
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\``);
  p.push(`**Execution contract:** \`${a.executionContract}\``, "");
  if (retired) p.push(
    "> ## RETIRED — DO NOT RUN",
    ">",
    `> **This lane was never executed and no longer owns anything.** ${retirement.whatRetirementDoesNotMean}`,
    ">",
    "> The prompt is kept because its reading of the defect is still the best one on record. Read it; do not run it as written.",
    "");
  p.push(`> ## ${a.taskIsolation[0]}`, ">", `> **${a.taskIsolation[1]}**`, "");
  if (a.launchNow === false) p.push(`> ## ${a.launchRule}`, "");
  if (a.doNotStartEarly) p.push(`> **${a.doNotStartEarly}**`, "");
  p.push("## Before anything else", "", "```sh",
    "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} --family ${(a.items[0] ?? "").startsWith("wa_") ? a.items[0] : FAMILIES[0]} --codex-cloud --minimum-captain-sha ${a.minimumCaptainSha}`,
    "```", "");
  p.push(`It must print **\`${PREFLIGHT_MUST_RETURN}\`**.`, "");
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Mission", "", a.mission, "");
  if (a.whyOneLane) p.push(`**Why one lane:** ${a.whyOneLane}`, "");
  if (a.whyThisIsASourceLaneAndNotARepair) p.push(`**Why a source lane:** ${a.whyThisIsASourceLaneAndNotARepair}`, "");
  if (a.theDefect) {
    p.push("## The defect, in the verifiers' words", "");
    p.push(`Failed obligations: ${a.theDefect.failedObligations.map((o) => `\`${o}\``).join(", ")} — on **all nine families**.`, "");
    p.push(`- **Observed:** ${a.theDefect.observed}`);
    p.push(`- **Expected:** ${a.theDefect.expected}`, "");
    p.push("| Family | Shard | Evidence |", "| --- | --- | --- |");
    for (const e of a.theDefect.evidence) p.push(`| \`${e.familyId}\` | ${e.shard} | \`${e.evidencePath}\` |`);
    p.push("");
  }
  if (a.theHardPart) p.push("## The hard part", "", `**${a.theHardPart}**`, "");
  if (a.familyDetail) {
    p.push(`## The ${a.itemCount} families`, "", "| Family | Failed | Reproduce |", "| --- | --- | --- |");
    for (const f of a.familyDetail) p.push(`| \`${f.familyId}\` | ${f.failedProofObligations.map((o) => o.obligation).join(", ")} | \`${f.reproduction}\` |`);
    p.push("");
  }
  if (a.items && a.itemKind === "sourceObligation") p.push(`## The ${a.itemCount} facts to source`, "", bullet(a.items.map((x) => `\`${x}\``)), "", `> ${a.egressReality}`, "");
  if (a.proofObligations) p.push("## Proof obligations", "", bullet(a.proofObligations), "");
  if (a.threeWayIndependence) p.push("## Independence", "", `**${a.threeWayIndependence}** May not be run by: ${a.mayNotBeRunBy.join(", ")}.`, "");
  if (a.dependsOn?.length) p.push(`**Runs after:** ${a.dependsOn.join(", ")}.`, "");
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  if (a.whyYouDoNotOwnTheHost) p.push(`_${a.whyYouDoNotOwnTheHost}_`, "");
  p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "");
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How you return", "", "Commit locally. Leave the final diff for the Codex Cloud interface.", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "Washington repair" });
EMIT.emit(OUT, `${JSON.stringify(doc, null, 2)}\n`);
for (const a of assignments) EMIT.emit(a.promptFile, promptFor(a));
EMIT.sweep(PROMPT_DIR, (n) => n.endsWith(".md"));
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  ${FAMILIES.length} families · ${obligationsPerFamily.length} distinct failure shape (${obligationsPerFamily[0]}) · all import ${path.basename(SHARED_HOST)}: ${allImportTheHost}`);
for (const a of assignments) console.log(`    ${a.assignmentId.padEnd(34)} ${a.lane.padEnd(24)} ${a.itemCount} item(s)${a.launchNow === false ? "  [provisioned, not launchable]" : ""}`);
