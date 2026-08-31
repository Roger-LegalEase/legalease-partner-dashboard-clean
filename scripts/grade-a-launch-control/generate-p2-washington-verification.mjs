#!/usr/bin/env node
/**
 * Independent verification for the nine Washington vacatur families P2 returned.
 *
 *   node scripts/grade-a-launch-control/generate-p2-washington-verification.mjs [--check]
 *
 * P2 built these and P2 does not verify them. That is not a formality: the
 * builder measured its own nine counters with the same code that decided what to
 * write, and a lane that agrees with itself has established nothing. Three
 * shards, three families each, on branches no P2 worker holds.
 *
 * The generator refuses to dispatch a family the completeness audit does not
 * report complete. A verifier handed an incomplete packet spends its slot
 * rediscovering what the audit already published, and a PASS it returned would
 * be a PASS for something nobody claimed.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preflightDenominator } from "../grade-a-packet-factory-24h/preflight-denominator.mjs";

/*
 * The denominator comes from the preflight, not from this file.
 *
 * "14/14" was written out by hand here. A worker runs the family-scoped gate in
 * cloud mode, where three checks are REPLACED rather than waived, so nothing is
 * not-applicable and the preflight prints the full roster -- 15/15. Every
 * prompt this generator writes has been telling workers to expect a number
 * their own command does not print, and a worker who cannot tell an improvement
 * from a regression either stops a healthy lane or waves a real failure past.
 */
const PREFLIGHT_MUST_RETURN = preflightDenominator(["--family", "__denominator_probe__", "--codex-cloud"]).mustReturn;
const PREFLIGHT_RATIO = /(\d+\/\d+)/.exec(PREFLIGHT_MUST_RETURN)[1];
const PREFLIGHT_SHORT = `${Number(PREFLIGHT_RATIO.split("/")[0]) - 1}/${PREFLIGHT_RATIO.split("/")[1]}`;


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const LC = "data/rcap-grade-a/launch-control";
const OUT = `${LC}/P2_WASHINGTON_VERIFICATION.json`;
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/codex-cloud-prompts";
const MATRIX = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const RETURN_ROOT = "data/rcap-grade-a/codex-cloud";

/* The commit this verification is measured against: the Captain commit that
 * carries the integrated P2 return. Pinned, never HEAD at generation time. */
const MINIMUM_CAPTAIN_SHA = "49dfa403a4185542c494d7ef53ae015931402e43";

/* The P2 return as it actually reached this repository. The assignment quoted a
 * different SHA; see integrationProvenance below. */
const P2_WORKER_COMMIT = "ba1d0501d8fab684f7b5498f9242fdd121596536";
const P2_QUOTED_COMMIT = "3b901f3358cf219b85b9bf1cf781b503a797781a";
const P2_WORKER_BRANCH = "codex/p2-wa-vacatur-completeness";

const FAMILIES = [
  "wa_vac_cannabis-set",
  "wa_vac_domestic_violence-set",
  "wa_vac_felony-set",
  "wa_vac_homicide_victim_prostitution-set",
  "wa_vac_misdemeanor_ordinary-set",
  "wa_vac_substance_use_disorder-set",
  "wa_vac_survivor_felony-set",
  "wa_vac_survivor_misdemeanor-set",
  "wa_vac_treaty_fishing-set"
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

const matrix = read(MATRIX);
const cloud = read(`${LC}/CODEX_CLOUD_CONTINUATIONS.json`);
const p2 = cloud.assignments.find((a) => a.assignmentId === "P2_WA_VACATUR_COMPLETENESS__CODEX_CLOUD");

const rows = FAMILIES.map((familyId) => {
  const m = matrix.results.find((r) => r.familyId === familyId) ?? null;
  const counters = m?.counters ?? null;
  const nonzero = counters ? Object.entries(counters).filter(([, v]) => v > 0).map(([k]) => k) : null;
  return {
    familyId,
    directory: m?.directory ?? null,
    result: m?.result ?? null,
    allNineCountersZero: counters ? nonzero.length === 0 : false,
    nonzeroCounters: nonzero,
    counters,
    written: m ? `${m.totals.written}/${m.totals.terminalFields}` : null,
    blanksByDisposition: m?.totals?.blanksByDisposition ?? null,
    buildScript: `scripts/build-census-v1-${familyId}.mjs`
  };
});

const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"];
const PROOF_OBLIGATIONS = [
  "ROUTE IDENTITY: the packet is built for the route the record names, and for no other",
  "SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes rather than read from the receipt",
  "COMPONENT SET: every component the route names is rendered and present in the packet",
  "KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to",
  "REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file",
  "ROUTE OPTIONS: every route-determined election is selected — a packet built for one vacatur route states which",
  "REPEATING ROWS: no row carries written cells beside required cells left blank",
  "PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink",
  "ARTIFACTS: canonical and boundary bytes hash to what reports/rendered-artifacts.json names",
  "PAGE ORDER: the rendered page order matches the packet manifest",
  "CLIPPING AND OVERLAP: no ink outside a measured write box",
  "FILING DESTINATION: the instructions name the court the route names",
  "FEE AND WAIVER: the fee and any waiver route are stated",
  "SERVICE: who must be served, and how",
  "SELF-HELP STOP: the packet states where self-help ends"
];

const SHARD_SIZE = 3;
const assignments = [];
for (let i = 0; i < rows.length; i += SHARD_SIZE) {
  const n = String(assignments.length + 1).padStart(2, "0");
  const items = rows.slice(i, i + SHARD_SIZE);
  const slug = `p2v${n}-washington-independent-verification`;
  assignments.push({
    assignmentId: `P2V${n}_WASHINGTON_INDEPENDENT_VERIFICATION`,
    wave: "p2-washington-verification",
    engine: "Codex Cloud",
    lane: "independent-verification",
    environment: "LegalEase Packet Factory",
    executionContract: CONTRACT,
    captainBranch: CAPTAIN_BRANCH,
    workerBranch: "work",
    minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
    verifies: "P2_WA_VACATUR_COMPLETENESS__CODEX_CLOUD",
    builderCommit: P2_WORKER_COMMIT,
    builderBranch: P2_WORKER_BRANCH,
    mayNotBeRunByTheBuilder: `This shard may not be run by a worker that ran ${P2_WORKER_BRANCH}. The builder measured its own nine counters with the code that decided what to write; a lane agreeing with itself has established nothing.`,
    itemKind: "packetFamily",
    itemCount: items.length,
    items: items.map((r) => r.familyId),
    familyDetail: items,
    mission: `Verify independently that each of these ${items.length} Washington vacatur packets is complete. The completeness audit reports all nine counters at zero; you are asked whether that is true of the artifact, not whether the report says so.`,
    proofObligations: PROOF_OBLIGATIONS,
    verdicts: VERDICTS,
    verdictRule: `Exactly one of ${VERDICTS.join(", ")} per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here from the field map and the rendered bytes rather than read from the builder's report.`,
    independenceRule: "You did not build these families and you may not repair them. A defect you find is a verdict and a repair assignment, never an edit.",
    ownedPaths: [`${RETURN_ROOT}/${slug}/**`],
    prohibitedPaths: [
      "data/rcap-all50/overlays/census-v1/**",
      "scripts/build-census-v1-*.mjs",
      "scripts/rcap-packet-completeness/**",
      `${LC}/**`
    ],
    requiredOutputs: [
      `${RETURN_ROOT}/${slug}/rows.json — one row per family: itemId, verdict, the fifteen proof obligations as you measured them, and the evidence read`,
      `${RETURN_ROOT}/${slug}/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect and the exact failed proof obligations`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: VERDICTS, rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: [
      "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>",
      `node ${PREFLIGHT} --family <familyId> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
    ],
    prohibitedCommands: ["git fetch", "git pull", "git push", "gh ", "git worktree", "git clone", "git remote add"],
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script. Verification that edits what it verifies is not verification.",
      "ROW STOP — a counter you cannot reproduce is FAIL_REPAIR_REQUIRED naming the counter and the rows that make it nonzero, never a silent agreement with the audit.",
      "ROW STOP — a family blocked by its source is BLOCKED_SOURCE and one blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS.",
      "NEVER open a commercial route and never touch Production."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES VERIFIED:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES MODIFIED: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      `PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY ${PREFLIGHT_RATIO}`, "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "An independent PASS proves a packet is complete. It approves no output, proves no fulfillment authority and opens no commercial route.",
    promptFile: `${PROMPT_DIR}/P2V${n}_WASHINGTON_INDEPENDENT_VERIFICATION.md`
  });
}

/* ---- refusals ------------------------------------------------------------- */
const problems = [];
const incomplete = rows.filter((r) => !r.allNineCountersZero || r.result !== "PASS_COMPLETE");
if (incomplete.length) problems.push(`${incomplete.length} famil(ies) are not PASS_COMPLETE: ${incomplete.map((r) => `${r.familyId} (${r.nonzeroCounters?.join(", ") ?? r.result})`).join("; ")}`);
if (rows.length !== 9) problems.push(`${rows.length} families, expected 9`);
if (assignments.length !== 3) problems.push(`${assignments.length} shards, expected 3`);
const assigned = assignments.flatMap((a) => a.items);
if (new Set(assigned).size !== assigned.length) problems.push("a family is verified twice");
if (assigned.length !== FAMILIES.length) problems.push("a family is verified by nobody");
const builderBranches = new Set([P2_WORKER_BRANCH, p2?.workerBranch].filter(Boolean));
for (const a of assignments) {
  if (builderBranches.has(a.workerBranch) && a.workerBranch !== "work") problems.push(`${a.assignmentId} shares the builder's branch`);
  for (const p of a.ownedPaths) {
    for (const q of p2?.ownedPaths ?? []) {
      const ra = p.replace(/\/?\*+$/, ""); const rb = q.replace(/\/?\*+$/, "");
      if (ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`)) problems.push(`${a.assignmentId} owns a P2 path: ${p}`);
    }
  }
}
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real integration base");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) problems.push("the integration base is not an ancestor of HEAD");
if (problems.length) {
  console.error(`P2 Washington verification: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 6)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-p2-washington-verification/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-p2-washington-verification.mjs",
  question: "P2 says its nine Washington packets are complete. Who checks, and against what?",
  integrationProvenance: {
    quotedCommit: P2_QUOTED_COMMIT,
    quotedCommitPresentInThisRepository: false,
    whatTheRemoteSaid: "upload-pack: not our ref 3b901f3358cf219b85b9bf1cf781b503a797781a",
    integratedCommit: P2_WORKER_COMMIT,
    integratedFrom: P2_WORKER_BRANCH,
    integratedCommitSubject: "fix(rcap): complete Washington vacatur packets",
    whyTheSubstitutionIsRecordedAndNotSilent: "The commit the assignment quoted does not exist in this repository and cannot be fetched. The commit integrated is a different object with a different SHA, and calling it the quoted one would put a number in the record that nothing can resolve.",
    whatMakesItTheSameWork: [
      "it is the tip of the P2 worker branch, codex/p2-wa-vacatur-completeness",
      "it changes 213 files and every one of them is inside P2's own owned paths — zero outside",
      "it touches exactly the nine Washington overlay directories, P2's return directory and the shared Washington host P2 was granted",
      "re-audited on the current tree, under the corrected completeness contract rather than the base it was built on, all nine families return PASS_COMPLETE with every counter at zero"
    ],
    theLikelyExplanation: "P2 was re-dispatched as a Codex Cloud task, and the cloud execution contract has the worker commit locally and return a diff through the Codex interface rather than push. A commit made inside that container never enters this repository, so a SHA read from the container resolves nowhere here.",
    whatWouldChangeThis: "If the quoted commit is later pushed and differs from what was integrated, this record names both and the difference is auditable."
  },
  integrationBase: MINIMUM_CAPTAIN_SHA,
  fleetAfterIntegration: {
    familiesAudited: matrix.familiesAudited,
    passComplete: matrix.byResult.PASS_COMPLETE,
    counterTotals: matrix.counterTotals
  },
  families: {
    count: rows.length,
    allPassComplete: rows.every((r) => r.allNineCountersZero),
    rows
  },
  independence: {
    rule: "A P2 builder may not verify its own packets.",
    builderCommit: P2_WORKER_COMMIT,
    builderBranch: P2_WORKER_BRANCH,
    shards: assignments.length,
    familiesPerShard: SHARD_SIZE,
    verifiersOwnNoOverlayPath: assignments.every((a) => a.ownedPaths.every((p) => !/overlays|build-census-v1/.test(p))),
    verifiersShareNoPathWithTheBuilder: true
  },
  commercialPosture: "Nine complete packets are nine complete packets. Completeness is not independent verification, independent verification is not output approval, and none of the three opens a commercial route.",
  totals: { shards: assignments.length, families: rows.length, commercialRoutesOpened: 0, productionTouched: false },
  assignments
};

const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``);
  p.push("**Branch in the container:** `work` — Codex Cloud names it. Do not rename it and do not create another.");
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\``);
  p.push(`**Execution contract:** \`${a.executionContract}\` — read it before you start.`);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push(`> **${a.mayNotBeRunByTheBuilder}**`, "");
  p.push("## Before anything else", "", "```sh",
    "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} \\`,
    `  --family ${a.items[0]} \\`,
    "  --codex-cloud \\",
    `  --minimum-captain-sha ${a.minimumCaptainSha}`,
    "```", "");
  p.push(`It must print **\`${PREFLIGHT_MUST_RETURN}\`**. A ${PREFLIGHT_SHORT} in cloud mode is a real failure, not the shallow checkout being tolerated.`, "");
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Mission", "", a.mission, "");
  p.push(`## The ${a.itemCount} families`, "");
  p.push("| Family | Audit result | Written | Overlay directory |", "| --- | --- | --- | --- |");
  for (const f of a.familyDetail) p.push(`| \`${f.familyId}\` | ${f.result} | ${f.written} | \`${f.directory}\` |`);
  p.push("");
  p.push("_The audit reports all nine counters at zero on each. Your job is to find out whether that is true of the artifact._", "");
  p.push("## Proof obligations — measure each, per family", "", bullet(a.proofObligations), "");
  p.push("## Verdicts", "", bullet(a.verdicts.map((v) => `\`${v}\``)), "", a.verdictRule, "", `**${a.independenceRule}**`, "");
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, verdicts: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "", "> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How you return", "", "Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

if (CHECK) {
  console.log(`P2 Washington verification current: ${rows.length} families, ${assignments.length} shards, ${rows.filter((r) => r.allNineCountersZero).length} complete.`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  integration base ${MINIMUM_CAPTAIN_SHA.slice(0, 8)} · P2 commit ${P2_WORKER_COMMIT.slice(0, 8)} (the quoted ${P2_QUOTED_COMMIT.slice(0, 8)} is not in this repository)`);
console.log(`  fleet ${matrix.byResult.PASS_COMPLETE} PASS_COMPLETE of ${matrix.familiesAudited}`);
for (const a of assignments) console.log(`    ${a.assignmentId}: ${a.items.join(", ")}`);
