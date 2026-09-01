#!/usr/bin/env node
/**
 * C13: the independent review of C12.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-c13-independent-review.mjs [--check]
 *
 * C12 is merged. It installed the READY_TO_RUN gate, made the source conveyor
 * executable and closed the ACQ->PROMO provenance chain. Two people wrote it:
 * a Codex worker opened it, and Captain amended it — the ancestry fix, the
 * artifact-name derivation, the receipt provenance, the batch verdict and the
 * eight handoff mutations are all Captain's.
 *
 * So Captain cannot review it. The rule that a builder may not verify its own
 * packets is not narrower for infrastructure than for filings, and a gate is
 * exactly the kind of thing whose author is least able to see through: every
 * check I wrote, I wrote believing it worked.
 *
 * C13 is therefore scoped as a REVIEW, not a rewrite. It reads, it reproduces,
 * it tries to break, and it reports. It changes no gate — a reviewer who edits
 * the thing under review has stopped reviewing it.
 *
 * The questions below are the ones I would most like to be wrong about.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const OUT = "data/rcap-grade-a/packet-factory-24h/C13_INDEPENDENT_REVIEW.json";
const PROMPT_DIR = "docs/rcap/grade-a/packet-factory-24h/c13";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const MINIMUM_CAPTAIN_SHA = git(["rev-parse", "HEAD"]);
const C12_MERGE = git(["rev-list", "--max-count=1", "--grep=Integrate C12", "HEAD"]);

/* What C12 actually installed, listed from the tree rather than from memory. */
const UNDER_REVIEW = [
  ".github/workflows/rcap-source-conveyor-ready.yml",
  ".github/workflows/rcap-official-source-acquisition-batch.yml",
  "scripts/rcap-plan-source-acquisition-batch.mjs",
  "scripts/rcap-acquire-official-source.mjs",
  "scripts/rcap-summarize-source-acquisition-batch.mjs",
  "scripts/rcap-materialize-acquisition-handoff.mjs",
  "scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs",
  "scripts/grade-a-packet-factory-24h/claim.mjs",
  "scripts/grade-a-packet-factory-24h/preflight-denominator.mjs",
  "scripts/raster/pdf-page-raster.mjs",
  "scripts/verify-packet-build-environment.mjs"
];
const missing = UNDER_REVIEW.filter((f) => !fs.existsSync(path.join(ROOT, f)));

const QUESTIONS = [
  {
    id: "Q1", area: "the gate's own honesty",
    ask: "READY_TO_RUN runs generators in --check mode, two verifiers with mutations, and a clean-worktree proof. Find a change to the dispatch that READY_TO_RUN would pass and that a careful human would reject.",
    whyItMatters: "A gate is only worth its narrowest hole. I wrote it expecting it to hold; that is exactly the belief a reviewer should attack.",
    reportAs: "a concrete diff that passes the gate and should not"
  },
  {
    id: "Q2", area: "vacuous checks",
    ask: "Across verify.mjs (26 checks), verify-source-conveyor.mjs (20) and verify-acq-promo-handoff.mjs (3), find any check that would still pass if the thing it protects were deleted. Prove each one by deleting the subject and running the check.",
    whyItMatters: "Two checks in this repository have already been found vacuous — F26 passed when every legal finding was removed, and the preflight counted not-applicable checks as passes. Both were caught by a mutation, not by reading. Assume more remain.",
    reportAs: "check id, what you deleted, and the output showing it still passed"
  },
  {
    id: "Q3", area: "the ACQ to PROMO chain",
    ask: "The planner derives one artifact name, the workflow passes it and the run id, the acquisition script records both, upload-artifact uses the name, the materializer compares both. Find any path where a receipt reaches PROMO whose bytes are not the bytes that receipt describes.",
    whyItMatters: "The materializer refused everything for weeks because nothing wrote the fields it compared, and nobody noticed, because a gate that refuses everything looks exactly like one that works.",
    reportAs: "the exact sequence of steps that produces the mismatch"
  },
  {
    id: "Q4", area: "the claim ledger",
    ask: "Atomicity is claimed to come from a single writer rather than run-time contention. Test that claim: find a sequence of integrations after which two lanes hold one family for the same kind of work, or a lane asserts a grant that Captain has since revoked.",
    whyItMatters: "The honest version of this mechanism says workers assert grants and never acquire them. If that is wrong, the word 'atomic' in the ledger is doing work it has not earned.",
    reportAs: "the integration sequence and the resulting ledger state"
  },
  {
    id: "Q5", area: "the raster path",
    ask: "resolveChromium tries an override, then the PLAYWRIGHT_BROWSERS_PATH layout, then Playwright's resolver. Find an environment where it resolves a browser that cannot actually render, or where the preflight passes and a build still fails on rastering.",
    whyItMatters: "Four lanes returned STOPPED on this and the preflight said 14/14 the whole time. The fix may have moved the failure rather than removed it.",
    reportAs: "the environment and the observed failure"
  },
  {
    id: "Q6", area: "what the gate does not ask",
    ask: "Name the checks that SHOULD be in READY_TO_RUN and are not. Be specific about what each would catch.",
    whyItMatters: "The most expensive defects this sprint were all things nothing was looking for: an unwritten claim ledger, a hardcoded browser path, thirteen legally blocked families in build lanes, a receipt field nothing populated.",
    reportAs: "proposed check, what it catches, and why the existing set misses it"
  }
];

const assignment = {
  assignmentId: "C13_INDEPENDENT_REVIEW_OF_C12",
  wave: "c13", engine: "Codex Cloud", environment: "LegalEase Packet Factory",
  executionContract: CONTRACT, captainBranch: CAPTAIN_BRANCH, workerBranch: "work",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  lane: "independent-review", sequence: 1,
  c12MergeCommit: C12_MERGE,
  independence: {
    rule: "C13 may not be run by anyone who wrote C12.",
    whoWroteC12: [
      "a Codex Cloud worker — the original READY_TO_RUN workflow, the materializer, the conveyor executability",
      "Captain — the fetch-depth fix, the artifact-name derivation, the receipt provenance, the batch verdict, the eight handoff mutations, the claim ledger, the raster resolver and the preflight arithmetic"
    ],
    whyCaptainCannotReviewIt: "The rule that a builder may not verify its own packets is not narrower for infrastructure than for filings. Every check here was written by someone who believed it worked.",
    mayNotBeRunBy: ["Captain", "the author of PR #159", "any lane that consumed the gate as a dependency"]
  },
  scope: {
    isA: "review — read, reproduce, attempt to break, report",
    isNotA: "rewrite. Change no gate, no verifier and no generator. A reviewer who edits the thing under review has stopped reviewing it.",
    filesUnderReview: UNDER_REVIEW
  },
  prohibitedCommands: ["git fetch", "git pull", "git push", "gh ", "git worktree", "git clone", "git remote add"],
  taskIsolation: ["THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.", "DO NOT EXECUTE ANY OTHER PROMPT IN THIS CONTAINER."],
  questions: QUESTIONS,
  method: [
    "Reproduce first: run every check and mutation suite and record the output before forming any view.",
    "Then attack: for each question, construct the case rather than looking for one. A negative test whose subject cannot exist proves nothing.",
    "Record what you could NOT break as carefully as what you could. A check you attacked and failed to break is evidence the check is sound."
  ],
  returnDirectory: "data/rcap-grade-a/codex-cloud/c13-independent-review",
  ownedPaths: ["data/rcap-grade-a/codex-cloud/c13-independent-review/**"],
  prohibitedPaths: [
    ".github/workflows/**", "scripts/**", "data/rcap-grade-a/packet-factory-24h/**",
    "data/rcap-all50/**", "docs/**"
  ],
  requiredOutputs: [
    "data/rcap-grade-a/codex-cloud/c13-independent-review/findings.json — one row per finding: question id, severity, file:line, the claim, the reproduction, and the suggested fix",
    "data/rcap-grade-a/codex-cloud/c13-independent-review/reproduction.json — the output of every check and mutation suite as you observed it, before any attack",
    "data/rcap-grade-a/codex-cloud/c13-independent-review/couldNotBreak.json — every attack you attempted that failed, and why"
  ],
  outputSchema: {
    arrayKey: "findings", itemKeyField: "id",
    completionVocabulary: ["CONFIRMED", "PLAUSIBLE", "COULD_NOT_BREAK"],
    rule: "An unrecognised verdict is refused at integration rather than translated."
  },
  focusedTests: [
    "node scripts/grade-a-packet-factory-24h/verify.mjs --mutations",
    "node scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs --mutations",
    "node scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs --mutations",
    "node scripts/grade-a-packet-factory-24h/generate.mjs --check"
  ],
  stopConditions: [
    "LANE STOP — you change no gate, no verifier, no generator and no queue record. Your diff touches only your own return directory.",
    "NEVER report a finding you did not reproduce. A suspicion is not a finding, and saying so is a complete return.",
    "NEVER open a commercial route, touch Production, or commit a source body."
  ],
  returnFormat: [
    "ASSIGNMENT: C13_INDEPENDENT_REVIEW_OF_C12", "BASE SHA:", "COMMIT:",
    "CHECKS REPRODUCED:", "FINDINGS CONFIRMED:", "ATTACKS THAT FAILED:",
    "GATES MODIFIED: 0", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
    "DIFF LEFT FOR THE CODEX UI: YES"
  ],
  grantsNothing: "A clean review is a clean review. It approves no packet, promotes no route and does not make the gate correct — it makes one more person's failure to break it part of the record."
};
assignment.promptFile = `${PROMPT_DIR}/${assignment.assignmentId}.md`;

const problems = [];
if (missing.length) problems.push(`${missing.length} file(s) named for review do not exist: ${missing.join(", ")}`);
if (!C12_MERGE) problems.push("the C12 merge commit cannot be found, so the review has no subject");
if (!/^[0-9a-f]{40}$/.test(String(MINIMUM_CAPTAIN_SHA))) problems.push("no dispatch base");
if (assignment.prohibitedPaths.some((p) => assignment.ownedPaths.includes(p))) problems.push("a path is both owned and prohibited");
if (problems.length) {
  console.error(`C13: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const bullet = (xs) => (xs ?? []).map((x) => `- ${x}`).join("\n");
const prompt = () => {
  const a = assignment;
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``, "**Branch in the container:** `work`");
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\``);
  p.push(`**C12 merged at:** \`${a.c12MergeCommit}\``, "");
  p.push(`> ## ${a.taskIsolation[0]}`, ">", `> **${a.taskIsolation[1]}**`, "");
  p.push("## Why you and not Captain", "", a.independence.whyCaptainCannotReviewIt, "");
  p.push("C12 was written by:", "", bullet(a.independence.whoWroteC12), "");
  p.push(`**May not be run by:** ${a.independence.mayNotBeRunBy.join(", ")}.`, "");
  p.push("## Scope", "", `This is a **${a.scope.isA}**.`, "", `It is **not** a ${a.scope.isNotA}`, "");
  p.push("### Files under review", "", bullet(a.scope.filesUnderReview.map((f) => `\`${f}\``)), "");
  p.push("## Before anything else", "", "```sh", "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} --codex-cloud --minimum-captain-sha ${a.minimumCaptainSha}`, "```", "",
    "It must report every applicable check passing and **0 failed**.", "");
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Method", "", bullet(a.method), "");
  p.push("## The questions", "");
  for (const q of a.questions) {
    p.push(`### ${q.id} — ${q.area}`, "", q.ask, "", `**Why it matters:** ${q.whyItMatters}`, "", `_Report as: ${q.reportAs}._`, "");
  }
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, verdicts: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "");
  p.push("## Reproduce these first", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "");
  p.push("## How you return", "", "Commit locally. Leave the final diff for the Codex Cloud interface.", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

const doc = {
  schemaVersion: "rcap-c13-independent-review/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-c13-independent-review.mjs",
  question: "C12 is merged. Who checks it?",
  answer: "Not Captain, who wrote most of it. A gate's author is the person least able to see through it, and the rule that a builder may not verify its own work is not narrower for infrastructure than for filings.",
  dispatchBase: MINIMUM_CAPTAIN_SHA,
  c12MergeCommit: C12_MERGE,
  commercialRoutesOpened: 0,
  productionTouched: false,
  assignments: [assignment]
};

if (CHECK) {
  console.log(`C13 current: ${QUESTIONS.length} question(s) over ${UNDER_REVIEW.length} file(s), reviewing ${C12_MERGE?.slice(0, 9)}.`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, assignment.promptFile), prompt());
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignment.promptFile}`);
console.log("");
console.log(`  reviewing C12 at ${C12_MERGE?.slice(0, 9)} · ${QUESTIONS.length} questions · ${UNDER_REVIEW.length} files under review`);
console.log(`  ${QUESTIONS.map((q) => q.id).join(", ")}`);
