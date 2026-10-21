#!/usr/bin/env node
/**
 * The Vermont repair, sized by root cause.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-vermont-repair.mjs [--check]
 *
 * VF01, VF02 and VF03 returned FAIL_REPAIR_REQUIRED on three of the five
 * Vermont sealing families. Eight of their ten proof obligations passed with
 * independently recomputed hashes; the failures are the filing handoff:
 * filingDestination, feeAndWaiver, service. VF11 and VF12 have not returned.
 *
 * That is not three defects, and it is not five. One shared host writes the
 * participant instructions for all five families, so the omission is one
 * omission reaching five packets -- the same shape as Washington.
 *
 * But the three failures are not one KIND of work, and lumping them would
 * force a lane to invent what it cannot know:
 *
 *   filingDestination is REPAIRABLE. Both forms print "SUPERIOR COURT CRIMINAL
 *   DIVISION" on their own face and both carry a Unit selector, so the
 *   destination is on the document and the instructions simply never said it.
 *
 *   feeAndWaiver and service are a SOURCE OBLIGATION. Vermont's filing fee, its
 *   waiver route and its service rule are published facts this repository does
 *   not hold. A repair lane that wrote them would be inventing law -- which is
 *   what VF03 said in its own repairScope, and it was right.
 *
 * And one family is neither.
 *
 * THE PARDON ROUTE IS NOT A REPAIR
 *
 * data/rcap-all50/terminalization-treatments/vt.json records vt_seal_pardon as
 * `exact_supported_deferral`, because "the statute does not resolve whether a
 * pardoned misdemeanour runs on the three-year clock at § 7602(c) or the
 * seven-year clock at § 7602(d), and that timing question decides when you may
 * file at all."
 *
 * The master queue nonetheless carries that family as legalInputStatus SETTLED,
 * and this builder rendered it as a filing-ready packet identical to the other
 * four but for three lines of route name. A packet that tells a participant how
 * to file when the law does not resolve whether they may file yet is worse than
 * no packet. It goes to counsel, not to a repair lane, and it leaves the build
 * queue until counsel answers.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const OUT = "data/rcap-grade-a/packet-factory-24h/VERMONT_REPAIR.json";
const PROMPT_DIR = "docs/rcap/grade-a/packet-factory-24h/vermont-repair";
const OVERLAYS = "data/rcap-all50/overlays/census-v1/vt";
const HOST = "scripts/build-census-v1-vt_seal_misdemeanor-set.mjs";
const TREATMENTS = "data/rcap-all50/terminalization-treatments/vt.json";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CLAIM = "scripts/grade-a-packet-factory-24h/claim.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const MINIMUM_CAPTAIN_SHA = git(["rev-parse", "HEAD"]);

/* The verifier evidence, read from the returns rather than restated. */
const RETURNED = [
  { pr: 157, lane: "VF01", familyId: "vt_seal_felony-set" },
  { pr: 158, lane: "VF02", familyId: "vt_seal_misdemeanor-set" },
  { pr: 156, lane: "VF03", familyId: "vt_seal_pardon-set" }
];
const AWAITED = [
  { lane: "VF11", familyId: "vt_seal_18_to_21-set" },
  { lane: "VF12", familyId: "vt_seal_dui-set" }
];

const evidence = [];
for (const r of RETURNED) {
  const raw = git(["show", `pr/${r.pr}:data/rcap-grade-a/packet-factory-24h/${r.lane.toLowerCase()}/rows.json`]);
  if (!raw) continue;
  for (const row of JSON.parse(raw).rows ?? []) {
    const obligations = row.proofObligations ?? {};
    evidence.push({
      familyId: row.itemId, verifier: r.lane, pullRequest: r.pr, verdict: row.verdict,
      failed: Object.entries(obligations).filter(([, v]) => v.result !== "PASS").map(([k, v]) => ({ obligation: k, finding: v.finding })),
      passed: Object.entries(obligations).filter(([, v]) => v.result === "PASS").map(([k]) => k)
    });
  }
}

/* The pardon route's own committed treatment. */
const treatments = read(TREATMENTS);
const pardonTreatment = treatments.treatments.find((t) => t.trackId === "vt_seal_pardon") ?? null;
const PARDON = "vt_seal_pardon-set";
const PATHWAY = ["vt_seal_felony-set", "vt_seal_misdemeanor-set", "vt_seal_dui-set", "vt_seal_18_to_21-set"];

const failureShapes = [...new Set(evidence.map((e) => e.failed.map((f) => f.obligation).sort().join("+")))];
const importersOfHost = fs.readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => /^build-census-v1-vt_seal_.*\.mjs$/.test(f))
  .filter((f) => fs.readFileSync(path.join(ROOT, "scripts", f), "utf8").includes(path.basename(HOST)) || f === path.basename(HOST));

const CLOUD_PROHIBITED = ["git fetch", "git pull", "git push", "gh ", "git worktree", "git clone", "git remote add"];
const RETURN_TAIL = ["COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO", "DIFF LEFT FOR THE CODEX UI: YES"];

const base = (id, slug, lane, sequence, extra) => ({
  assignmentId: id, wave: "vermont-repair", engine: "Codex Cloud",
  environment: "LegalEase Packet Factory", executionContract: CONTRACT,
  captainBranch: CAPTAIN_BRANCH, workerBranch: "work", minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  lane, sequence, prohibitedCommands: CLOUD_PROHIBITED,
  claimMechanism: CLAIM,
  claimRule: `Assert every family through \`node ${CLAIM} --assert ${id} <familyId>\` before reading or writing anything. A non-zero exit is a full stop: report BLOCKED_BEFORE_CLAIM and read nothing.`,
  taskIsolation: ["THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.", "DO NOT EXECUTE THE OTHER VERMONT REPAIR PROMPTS IN THIS CONTAINER."],
  returnDirectory: `data/rcap-grade-a/codex-cloud/${slug}`,
  ...extra
});

const assignments = [];

assignments.push(base("VTR01_VT_FILING_DESTINATION_HOST", "vtr01-vt-filing-destination-host", "shared-host-repair", 1, {
  mission: "Correct the one host that writes participant instructions for the Vermont sealing families so the instructions state where the petition is filed. The destination is on the documents' own face and the instructions never said it.",
  whyOneLane: `All five Vermont families are rendered by ${path.basename(HOST)}; four sibling entry points import it. One shared host has one writer.`,
  itemKind: "sharedModule", itemCount: 1, items: [HOST],
  familiesItReaches: PATHWAY,
  theDefect: {
    obligation: "filingDestination",
    observed: "The instructions carry the Superior Court unit only as a blank the participant must fill — 'the Superior Court unit (county) where the case was decided' — and never state, as a direction, where the completed packet goes.",
    expected: "A sentence that tells the participant where to file: the Superior Court Criminal Division, in the unit where the case was decided. Both 200-00130 and 200-00132 print that court on their own caption, so the direction is available; the packet asks for the unit without ever saying what to do with it.",
    whyThisIsRepairAndNotSource: "The fact is on the document. Nothing has to be acquired to say it.",
    /*
     * The three verifiers do not agree about this obligation, and the
     * disagreement is not about the packets.
     *
     * All three tested the same fifteen obligations. The instructions bodies
     * are BYTE-IDENTICAL across all five families -- only the title, one
     * description line and the trailing route footer differ. On the same
     * sentence, VF01 and VF02 scored filingDestination FAIL and VF03 scored it
     * PASS.
     *
     * So the obligation has no shared standard, and that is a defect in the
     * verification contract rather than in any packet. The repair below
     * satisfies both readings -- a packet that states the destination as a
     * direction passes the strict reading and cannot fail the lenient one --
     * but the standard still has to be written down, or the next two verifiers
     * will disagree about the repaired text too.
     */
    verifiersDisagree: {
      sameObligationSet: true,
      obligationsTested: 15,
      instructionsBodyIdenticalAcrossFamilies: true,
      scoredFail: ["VF01 (vt_seal_felony-set)", "VF02 (vt_seal_misdemeanor-set)"],
      scoredPass: ["VF03 (vt_seal_pardon-set)"],
      onTheSameText: "the Superior Court unit (county) where the case was decided",
      whatThisMeans: "A PASS and a FAIL on identical bytes is a missing standard, not a packet difference. Reconciled from the three returns rather than assumed.",
      captainAction: "The standard is stated in this prompt's expected clause and must be adopted by the reverification lane."
    }
  },
  mayNotDo: [
    "state a filing fee, a waiver route, a service recipient or a service method — those are VTR02's and are not in this repository",
    "render any packet — re-rendering is VTR03",
    `touch ${OVERLAYS}/${PARDON.replace(/_/g, "-")}--official-pdf-fill or anything else about the pardon route`
  ],
  dependsOn: [],
  ownedPaths: [HOST, `data/rcap-grade-a/codex-cloud/vtr01-vt-filing-destination-host/**`],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/rcap-packet-completeness/**", "data/rcap-grade-a/launch-control/**"],
  requiredOutputs: [`${HOST} — instructions that state the filing destination`, "data/rcap-grade-a/codex-cloud/vtr01-vt-filing-destination-host/rows.json"],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: [`node ${PREFLIGHT} --family ${PATHWAY[0]} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`],
  stopConditions: [
    "LANE STOP — you render no packet and write into no overlay directory.",
    "NEVER invent a fee, a waiver route, a service recipient or a service method.",
    "ROW STOP — anything you cannot state from the document itself is STOPPED, naming what is missing."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "OBLIGATIONS CORRECTED:", "FACTS INVENTED: 0", "PACKETS RENDERED: 0", ...RETURN_TAIL],
  grantsNothing: "A corrected host is corrected logic. It renders no packet and proves none."
}));

assignments.push(base("VTR02_VT_FEE_AND_SERVICE_SOURCE", "vtr02-vt-fee-and-service-source", "source-swarm", 1, {
  mission: "Establish, from the Vermont Judiciary's own publication, the filing fee and any waiver route for a sealing petition under 13 V.S.A. § 7602, and the service requirement — who must be served and how — for the petition and the stipulation.",
  whyThisIsASourceLaneAndNotARepair: "VF03 said it in its own repairScope: do not infer these from a verifier's finding. A fee schedule and a service rule are published facts with an issuer and a URL. Writing an unsourced fee into a filing instruction is worse than leaving it out, because the participant will act on it.",
  itemKind: "sourceObligation", itemCount: 8,
  items: PATHWAY.flatMap((f) => [`${f}::filing-fee-and-waiver-route`, `${f}::service-recipient-and-method`]),
  familiesUnblocked: PATHWAY, familiesUnblockedCount: PATHWAY.length,
  countIsProspective: true,
  countMeaning: "families this lane would release if both of its obligations resolve. It is not a count of promoted sources and must not be read as one.",
  issuingHosts: ["Vermont Judiciary (vermontjudiciary.org)", "the Superior Court Criminal Division unit named by each route"],
  everyResolvedFactRecords: ["official publisher", "exact title", "citation or form number", "revision", "official URL", "SHA-256 of the captured document", "custody path"],
  egressReality: "This environment refuses outbound egress. Anything needing a fetch is dispatched through .github/workflows/rcap-official-source-acquisition-batch.yml with an exact URL, never attempted locally and never faked.",
  dependsOn: [],
  ownedPaths: ["data/rcap-grade-a/codex-cloud/vtr02-vt-fee-and-service-source/**", "data/rcap-grade-a/source-acquisition/packet-factory-24h/vtr02-vt-fee-and-service-source/**"],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "data/rcap-grade-a/launch-control/**", "private/**"],
  requiredOutputs: ["data/rcap-grade-a/codex-cloud/vtr02-vt-fee-and-service-source/rows.json — one row per fact", "data/rcap-grade-a/source-acquisition/packet-factory-24h/vtr02-vt-fee-and-service-source/receipts.json — the seven recorded fields per resolved fact; no body committed"],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: ["node scripts/grade-a-packet-factory-24h/verify.mjs"],
  stopConditions: [
    "NEVER state a fee or a service rule you have not sourced.",
    "NEVER accept an unofficial mirror or a summary site. The judiciary's own publication or nothing.",
    "LANE STOP — you write no packet and no build script.",
    "ROW STOP — a fact that cannot be sourced is STOPPED naming the exact office and URL that would publish it."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "FACTS SOURCED:", "FACTS STOPPED:", "UNSOURCED VALUES WRITTEN: 0", ...RETURN_TAIL],
  grantsNothing: "A sourced fee is a sourced fee. It writes no packet and proves none."
}));

assignments.push(base("VTR03_VT_RERENDER", "vtr03-vt-rerender", "packet-repair", 2, {
  mission: `Re-render the four Vermont pathway families on the corrected host and the sourced facts, and confirm each returns all nine completeness counters at zero.`,
  itemKind: "packetFamily", itemCount: PATHWAY.length, items: PATHWAY,
  dependsOn: ["VTR01_VT_FILING_DESTINATION_HOST", "VTR02_VT_FEE_AND_SERVICE_SOURCE"],
  doNotStartEarly: "Do not start until Captain has integrated VTR01 and VTR02 and published a base carrying both. Re-rendering on the old host reproduces the same three failures.",
  excludesPardon: `${PARDON} is deliberately absent. It is a counsel question, not a re-render.`,
  ownedPaths: [...PATHWAY.map((f) => `${OVERLAYS}/${f.replace(/_/g, "-")}--official-pdf-fill/**`), "data/rcap-grade-a/codex-cloud/vtr03-vt-rerender/**"],
  prohibitedPaths: [HOST, `${OVERLAYS}/${PARDON.replace(/_/g, "-")}--official-pdf-fill/**`, "scripts/rcap-packet-completeness/**"],
  whyYouDoNotOwnTheHost: `${HOST} is VTR01's. Two lanes editing it would be two writers on one script.`,
  rasterRule: `Page rasters go through scripts/raster/pdf-page-raster.mjs, which discovers its browser. NEVER \`pdftoppm\`, NEVER \`apt-get\`, NEVER \`playwright install\`. The preflight now gates on this, so a lane that cannot raster learns before it builds.`,
  requiredOutputs: [...PATHWAY.map((f) => `${OVERLAYS}/${f.replace(/_/g, "-")}--official-pdf-fill/ — re-rendered`), "data/rcap-grade-a/codex-cloud/vtr03-vt-rerender/rows.json — one row per family with the nine counters after"],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: PATHWAY.map((f) => `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${f}`),
  stopConditions: [
    `LANE STOP — you do not edit ${HOST}.`,
    "ROW STOP — a family whose instructions still lack a sourced fee or service rule is STOPPED naming which, and the lane continues to the next family.",
    "NEVER invent a fact and never write a protected field."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "FAMILIES ASSIGNED:", "ROWS RETURNED (must equal FAMILIES ASSIGNED):", "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:", ...RETURN_TAIL],
  grantsNothing: "A repaired family must be verified again, by a lane that neither built nor repaired it."
}));

assignments.push(base("VTL01_VT_PARDON_CLOCK", "vtl01-vt-pardon-clock", "counsel-question", 1, {
  mission: "Put one question to counsel: which limitation clock governs a petition to seal a PARDONED MISDEMEANOUR in Vermont — the three-year clock at 13 V.S.A. § 7602(c) or the seven-year clock at § 7602(d)?",
  itemKind: "counselQuestion", itemCount: 1, items: [PARDON],
  whyThisIsNotARepair: "The committed treatment records this route as exact_supported_deferral and says the timing question 'decides when you may file at all'. A packet that tells a participant how to file when the law does not resolve whether they may file yet is worse than no packet. No amount of instruction editing answers it.",
  committedEvidence: { path: TREATMENTS, trackId: "vt_seal_pardon", treatment: pardonTreatment?.treatment ?? null, basis: pardonTreatment?.treatmentBasis ?? null },
  captainDefect: "The master queue carries this family as legalInputStatus SETTLED while its own treatment record says deferral, and this builder rendered it as a filing-ready packet identical to the other four but for three lines of route name. Both are Captain-side and are corrected with this dispatch.",
  whatHappensToThePacket: `${PARDON} leaves the build and verification queues until counsel answers. Its rendered artifacts are preserved as review evidence and are not participant-deliverable.`,
  dependsOn: [],
  ownedPaths: ["data/rcap-grade-a/codex-cloud/vtl01-vt-pardon-clock/**"],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs"],
  requiredOutputs: ["data/rcap-grade-a/codex-cloud/vtl01-vt-pardon-clock/question.json — the question, the statutory text on both sides, and what turns on the answer"],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: [],
  stopConditions: ["NEVER answer the question yourself. You state it, with the text on both sides, and stop."],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "QUESTION STATED: 1", "ANSWERS INVENTED: 0", ...RETURN_TAIL],
  grantsNothing: "A stated question is a stated question. It settles nothing and authorizes no packet."
}));

/* Reverification, provisioned and explicitly not launchable. */
assignments.push(base("VTRV01_VT_REVERIFICATION", "vtrv01-vt-reverification", "independent-verification", 3, {
  mission: "Verify independently that the four repaired Vermont pathway families are complete, including the three obligations that failed the first time.",
  itemKind: "packetFamily", itemCount: PATHWAY.length, items: PATHWAY,
  launchNow: false,
  launchRule: "DO NOT LAUNCH YET. Captain creates this assignment from a new HEAD once VTR03 is integrated. A verifier started before the repaired packet exists in its checkout verifies the artifact it was supposed to replace.",
  mayNotBeRunBy: ["the builder of these packets", "VTR01_VT_FILING_DESTINATION_HOST", "VTR03_VT_RERENDER", "VF01", "VF02", "VF11", "VF12"],
  threeWayIndependence: "Neither the builder, nor the repairer, nor a shard that already formed a view of these packets.",
  dependsOn: ["VTR03_VT_RERENDER"],
  proofObligations: [
    "FILING DESTINATION: the instructions name the court the petition goes to",
    "FEE AND WAIVER: the fee and any waiver route are stated, or named as a required-before-filing item with the office to ask — not 'confirm locally'",
    "SERVICE: who must be served and how, on the same terms",
    "every other obligation in the standard set"
  ],
  verdicts: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"],
  ownedPaths: ["data/rcap-grade-a/codex-cloud/vtrv01-vt-reverification/**"],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**"],
  requiredOutputs: ["data/rcap-grade-a/codex-cloud/vtrv01-vt-reverification/rows.json"],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"], rule: "An unrecognised verdict is refused at integration rather than translated." },
  focusedTests: PATHWAY.map((f) => `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${f}`),
  stopConditions: [
    "LANE STOP — you write into no overlay directory and no build script.",
    "ROW STOP — an instruction that still says only 'confirm local requirements' is FAIL_REPAIR_REQUIRED, however many counters are zero."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:", "OVERLAY DIRECTORIES MODIFIED: 0", ...RETURN_TAIL],
  grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no route."
}));

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;

/* ---- refusals ---- */
const problems = [];
const repairLanes = assignments.filter((a) => a.lane !== "independent-verification");
if (repairLanes.length < 3 || repairLanes.length > 6) problems.push(`${repairLanes.length} repair lanes, outside 3 to 6`);
const hostWriters = assignments.filter((a) => (a.ownedPaths ?? []).includes(HOST)).map((a) => a.assignmentId);
if (hostWriters.length !== 1) problems.push(`${hostWriters.length} writers on the shared host`);
const rerendered = assignments.filter((a) => a.lane === "packet-repair").flatMap((a) => a.items);
if (new Set(rerendered).size !== PATHWAY.length) problems.push("the re-render lane does not cover every pathway family exactly once");
if (rerendered.includes(PARDON)) problems.push("the pardon family is queued for re-render and it is a counsel question");
if (assignments.some((a) => a.lane === "independent-verification" && a.launchNow !== false)) problems.push("a reverification lane is launchable before its repair exists");
if (!pardonTreatment) problems.push("the committed Vermont treatment record does not carry the pardon track, so its deferral cannot be evidenced");
if (evidence.length === 0) problems.push("no verifier evidence was read; fetch refs/pull/156,157,158/head first");
if (!/^[0-9a-f]{40}$/.test(String(MINIMUM_CAPTAIN_SHA))) problems.push("no dispatch base");
if (importersOfHost.length !== 5) problems.push(`${importersOfHost.length} Vermont build scripts resolve to the shared host, expected 5`);
if (problems.length) {
  console.error(`Vermont repair: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-vermont-repair/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-vermont-repair.mjs",
  question: "Three Vermont families failed independent verification on three obligations. How many defects is that?",
  answer: "One omission and one legal question. All five families are written by one host, so the missing filing handoff is one omission reaching five packets. But the pardon route is not a packet defect at all — its own treatment record says the statute does not resolve when the participant may file.",
  dispatchBase: MINIMUM_CAPTAIN_SHA,
  sharedHost: HOST,
  buildScriptsResolvingToTheHost: importersOfHost,
  distinctFailureShapes: failureShapes,
  verifierEvidence: evidence,
  crossFamilyReconciliation: {
    method: "The three returns were read against each other and against the five rendered packets.",
    verifierObligationSetsIdentical: true,
    obligationsTested: 15,
    instructionsBodyIdenticalAcrossAllFive: "Only the title, one description line and the trailing route footer differ between the five families.",
    hashCrossCheck: "Every independently recomputed source and artifact hash matches the committed source-receipt.json and reports/rendered-artifacts.json in all three families.",
    noVerifierWroteIntoWhatItVerified: "All three PRs touch only their own vf0N/ directory; none touches an overlay or a build script.",
    theRealFinding: "filingDestination was scored FAIL by two verifiers and PASS by a third ON THE SAME BYTES. The obligation has no shared standard. That is a verification-contract defect and it is Captain's to fix, not a packet difference to repair away.",
    unverifiedFamilies: {
      families: AWAITED.map((a) => a.familyId),
      expectation: "Their instructions bodies are byte-identical to the three that returned, so feeAndWaiver and service would be expected to reproduce. No verdict is asserted for them here; VF11 and VF12 have not returned.",
      filingDestination: "Not predictable from packet content, because the divergence is in the reading rather than the text."
    }
  },
  awaitingVerification: AWAITED,
  pardonRoute: {
    familyId: PARDON,
    treatment: pardonTreatment?.treatment ?? null,
    basis: pardonTreatment?.treatmentBasis ?? null,
    queueSaid: "legalInputStatus: SETTLED",
    theContradiction: "The treatment record says deferral and the queue says settled. The builder followed the queue and produced a filing-ready packet for a route whose filing time is unresolved.",
    disposition: "counsel question VTL01; leaves the build and verification queues until answered"
  },
  lanes: {
    repair: repairLanes.map((a) => a.assignmentId),
    reverification: assignments.filter((a) => a.lane === "independent-verification").map((a) => a.assignmentId),
    sequence: "VTR01, VTR02 and VTL01 run now and in parallel. VTR03 waits for VTR01 and VTR02. VTRV01 is provisioned and launched by Captain from a new HEAD once VTR03 is integrated."
  },
  commercialRoutesOpened: 0,
  productionTouched: false,
  assignments
};

const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}  ·  **Sequence:** ${a.sequence}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``, "**Branch in the container:** `work`");
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\``);
  p.push(`**Execution contract:** \`${a.executionContract}\``, "");
  p.push(`> ## ${a.taskIsolation[0]}`, ">", `> **${a.taskIsolation[1]}**`, "");
  if (a.launchNow === false) p.push(`> ## ${a.launchRule}`, "");
  if (a.doNotStartEarly) p.push(`> **${a.doNotStartEarly}**`, "");
  p.push("## Claim before you read", "", "```sh", `node ${a.claimMechanism} --assert ${a.assignmentId} <familyId>`, "```", "", a.claimRule, "");
  p.push("## Before anything else", "", "```sh", "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} --family ${(a.items[0] ?? "").startsWith("vt_") ? a.items[0] : PATHWAY[0]} --codex-cloud --minimum-captain-sha ${a.minimumCaptainSha}`, "```", "");
  p.push("It must report every applicable check passing and **0 failed**.", "");
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Mission", "", a.mission, "");
  if (a.whyOneLane) p.push(`**Why one lane:** ${a.whyOneLane}`, "");
  if (a.whyThisIsASourceLaneAndNotARepair) p.push(`**Why a source lane:** ${a.whyThisIsASourceLaneAndNotARepair}`, "");
  if (a.whyThisIsNotARepair) p.push(`**Why this is not a repair:** ${a.whyThisIsNotARepair}`, "");
  if (a.committedEvidence) {
    p.push("## The committed evidence", "", `\`${a.committedEvidence.path}\` records \`${a.committedEvidence.trackId}\` as **${a.committedEvidence.treatment}**:`, "", `> ${a.committedEvidence.basis}`, "");
  }
  if (a.captainDefect) p.push("## What Captain got wrong", "", a.captainDefect, "");
  if (a.whatHappensToThePacket) p.push(`**What happens to the packet:** ${a.whatHappensToThePacket}`, "");
  if (a.theDefect) {
    p.push("## The defect", "", `Obligation: \`${a.theDefect.obligation}\``, "",
      `- **Observed:** ${a.theDefect.observed}`, `- **Expected:** ${a.theDefect.expected}`, "", `_${a.theDefect.whyThisIsRepairAndNotSource}_`, "");
    const d = a.theDefect.verifiersDisagree;
    if (d) {
      p.push("### The verifiers do not agree about this obligation", "");
      p.push(`All three tested the same ${d.obligationsTested} obligations, and the instructions bodies are byte-identical across all five families. On the same sentence — _"${d.onTheSameText}"_ — ${d.scoredFail.join(" and ")} scored **FAIL** and ${d.scoredPass.join(" and ")} scored **PASS**.`, "");
      p.push(`**${d.whatThisMeans}**`, "");
      p.push(`Write the destination as a DIRECTION, not as a blank to fill. A packet that states where the completed set goes passes the strict reading and cannot fail the lenient one. ${d.captainAction}`, "");
    }
  }
  if (a.mayNotDo) p.push("## You may not", "", bullet(a.mayNotDo), "");
  if (a.excludesPardon) p.push(`> **${a.excludesPardon}**`, "");
  if (a.rasterRule) p.push("## Rastering", "", a.rasterRule, "");
  if (a.items && a.itemKind === "sourceObligation") p.push(`## The ${a.itemCount} facts to source`, "", bullet(a.items.map((x) => `\`${x}\``)), "", `> ${a.egressReality}`, "");
  else if (a.items?.length && a.itemKind !== "sharedModule") p.push(`## The ${a.itemCount} item(s)`, "", bullet(a.items.map((x) => `\`${x}\``)), "");
  if (a.proofObligations) p.push("## Proof obligations", "", bullet(a.proofObligations), "");
  if (a.threeWayIndependence) p.push("## Independence", "", `**${a.threeWayIndependence}** May not be run by: ${a.mayNotBeRunBy.join(", ")}.`, "");
  if (a.dependsOn?.length) p.push(`**Runs after:** ${a.dependsOn.join(", ")}.`, "");
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  if (a.whyYouDoNotOwnTheHost) p.push(`_${a.whyYouDoNotOwnTheHost}_`, "");
  p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "");
  if (a.focusedTests?.length) p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How you return", "", "Commit locally. Leave the final diff for the Codex Cloud interface.", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "Vermont repair" });
EMIT.emit(OUT, `${JSON.stringify(doc, null, 2)}\n`);
for (const a of assignments) EMIT.emit(a.promptFile, promptFor(a));
EMIT.sweep(PROMPT_DIR, (n) => n.endsWith(".md"));
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  ${evidence.length} verifier return(s) · ${failureShapes.length} distinct failure shape(s): ${failureShapes.join(" ; ")}`);
console.log(`  shared host reaches ${importersOfHost.length} build scripts`);
for (const a of assignments) console.log(`    ${a.assignmentId.padEnd(34)} ${a.lane.padEnd(26)} ${a.itemCount} item(s)${a.launchNow === false ? "  [provisioned, not launchable]" : ""}`);
