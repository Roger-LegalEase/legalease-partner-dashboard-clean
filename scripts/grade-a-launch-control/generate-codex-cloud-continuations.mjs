#!/usr/bin/env node
/**
 * Codex Cloud continuations for the six packet tasks still to run.
 *
 *   node scripts/grade-a-launch-control/generate-codex-cloud-continuations.mjs [--check]
 *
 * These are not new assignments. P2, R8 and the three verification shards keep
 * the families, the owned paths and the packet scope they were dispatched with;
 * what changes is the environment contract around them, because Codex Cloud is
 * not a Codespace and a prompt that tells a cloud worker to push is a prompt
 * that ends in a failed command.
 *
 * The one genuinely new task is the South Dakota repair, and it exists because
 * the S2 continuation left exactly one family short of complete: nine STATEMENT
 * OF MAILING fields declared required-before-filing and named in no
 * participant-instructions.md. Its scope is those nine rows and nothing else.
 *
 * Every family list, owned path and base commit is read from the record that
 * dispatched it. Nothing here re-scopes a lane.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const LC = "data/rcap-grade-a/launch-control";
const OUT = `${LC}/CODEX_CLOUD_CONTINUATIONS.json`;
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/codex-cloud-prompts";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const SETUP = "scripts/codex-cloud/setup-packet-factory.sh";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const MP = "data/rcap-grade-a/codex-cloud";

/*
 * The minimum Captain SHA every cloud task branches from and proves it contains.
 * This is the commit that carries S1, S2, the corrected completeness contract,
 * P1/P3/P4 and the re-rendered evidence -- the tree the S2 continuation named.
 * A worker on anything earlier is building against a contract nobody holds.
 */
const MINIMUM_CAPTAIN_SHA = "98a7a57e2a354eeb8b33b3873e62f7a9785fedaf";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

const repairWave = read(`${LC}/COMPLETENESS_REPAIR_WAVE.json`);
const wave2 = read(`${LC}/WAVE_2_ASSIGNMENTS.json`);
const continuation = read(`${LC}/S2_CONTINUATION.json`);
const matrix = read("data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json");

const OVERLAYS = "data/rcap-all50/overlays/census-v1";

/** The environment contract every cloud prompt carries, stated once. */
const CLOUD_CONTRACT = {
  environment: "LegalEase Packet Factory",
  setupScript: SETUP,
  setupPrints: "LEGALEASE_CODEX_CLOUD_READY",
  neverRunGitNetworkCommands: [
    "git fetch", "git pull", "git push", "git remote add", "git clone", "git fetch --unshallow"
  ],
  whyNoGitNetwork: "Codex Cloud checks the selected Captain branch out as a local branch named `work`, shallow, and removes origin before the agent starts. Every one of those commands fails on a checkout that is working exactly as designed, and the failure looks like a broken environment rather than a wrong instruction.",
  sourceTheCorpusEnvironment: "source $HOME/.legalease-corpus-env",
  preflight: `node ${PREFLIGHT} --family <FAMILY_ID> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
  preflightMustReturn: "PACKET_BUILD_ENVIRONMENT_READY: 14/14",
  thirteenOfFourteenIsARefusal: "14/14 or stop. Three Codespaces checks are replaced by cloud-native ones, not waived, so a 13/14 in cloud mode is a real failure and not the shallow checkout being tolerated.",
  theDiffIsTheReturn: "Commit your work locally. Leave the final diff for the Codex UI.",
  neverRequirePushed: "PUSHED: YES is not part of a cloud return. There is nothing to push to and asking for it turns a complete task into a failed one."
};

const RETURN_TAIL = [
  "COMMERCIAL ROUTES OPENED: 0",
  "PRODUCTION TOUCHED: NO",
  "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14",
  "DIFF LEFT FOR THE CODEX UI: YES"
];

/*
 * Lanes that have returned and been integrated. A finished lane still holding
 * its families is how one packet ends up claimed by two owners: P2 returned and
 * the Washington verification shards now hold those nine, so P2 must stop
 * holding them or the ownership record says two things.
 */
const RETURNED = {
  P2_WA_VACATUR_COMPLETENESS__CODEX_CLOUD: {
    status: "RETURNED_AND_INTEGRATED",
    workerCommit: "ba1d0501d8fab684f7b5498f9242fdd121596536",
    integratedAs: "c055f20fc63b12c5cd998fa2171cda0519c6a6f1",
    result: "9 of 9 families PASS_COMPLETE, every counter zero, re-audited under the corrected contract",
    familiesNowHeldBy: "P2V01, P2V02 and P2V03 independent verification",
    note: "The assignment quoted commit 3b901f3358cf219b85b9bf1cf781b503a797781a, which is not an object in this repository and which the remote refuses as 'not our ref'. The integrated commit is the tip of the P2 worker branch; data/rcap-grade-a/launch-control/P2_WASHINGTON_VERIFICATION.json records both and the evidence that they are the same work.",
    aSecondWashingtonReturnExists: "origin/codex/execute-committed-codex-cloud-assignment at 4e9bea921, 'Repair Washington vacatur packet completeness', built on 40ccc028a and touching the same nine families in 30 files. It is NOT integrated: the nine families already return PASS_COMPLETE on every counter from the return that was integrated, and applying a second independent repair of the same packets on top would overwrite proven artifacts with unproven ones. It is recorded here so the choice is visible rather than lost."
  },
  VS01_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD: {
    status: "RETURNED_AND_INTEGRATED",
    workerCommit: "b8886d64b",
    workerBranchFound: "codex/execute-codex-cloud-assignment",
    result: "4 of 4 PASS_COMPLETE_INDEPENDENT; 1 file changed, all inside the shard's own return directory; 0 overlay files",
    note: "The reported commit 6daf7b7 is not an object in this repository. The branch above carries the shard's return directory and nothing else."
  },
  VS02_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD: {
    status: "RETURNED_AND_INTEGRATED",
    workerCommit: "430e5183b",
    workerBranchFound: "codex/execute-codex-cloud-assignment-ekoba8",
    result: "4 of 4 PASS_COMPLETE_INDEPENDENT; 1 file changed, result-only",
    note: "Integrated although the instruction said not to wait for it: it had already returned, and holding a finished verification back would have cut the first review batch from ten families to six for no reason."
  },
  VS03_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD: {
    status: "RETURNED_AND_INTEGRATED",
    workerCommit: "bfb75eb68",
    workerBranchFound: "codex/execute-codex-cloud-assignment-o5n5kl",
    result: "2 of 2 PASS_COMPLETE_INDEPENDENT; 1 file changed, result-only",
    note: "The reported commit 21450763f is not an object in this repository."
  },
  SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR__CODEX_CLOUD: {
    status: "RETURNED_AND_INTEGRATED",
    workerCommit: "0b36dd9a0",
    workerBranchFound: "codex/execute-codex-cloud-assignment-for-south-dakota",
    result: "all nine statement-of-mailing fields RECLASSIFIED, none disclosed; sd_arrest_expungement-set now PASS_COMPLETE with every counter zero",
    familiesNowHeldBy: "SDV01_SOUTH_DAKOTA_INDEPENDENT_VERIFICATION",
    note: "The reported commit 4c12fb7 is not an object in this repository. Reclassifying all nine rather than disclosing any is defensible for a statement of mailing, and it is exactly what SDV01 is asked to test."
  },
  R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD: {
    status: "SPLIT_INTO_FOUR",
    result: "returned 13/14 with zero files changed; the failure was one gate defect, not four family defects",
    familiesNowHeldBy: "R8A_NJ_DISORDERLY_PERSONS, R8B_CA_17B_REDUCTION, R8C_CA_1203_43, R8D_AZ_MARIJUANA_SUPERIOR_COURT",
    note: "See data/rcap-grade-a/launch-control/R8_FOUR_WAY_SPLIT.json for the per-family preflight before and after the gate correction."
  }
};

const assignments = [];

/* ---- P2 and R8: same scope, cloud environment ------------------------------ */
const carryOver = [
  { from: repairWave, id: "P2_WA_VACATUR_COMPLETENESS", slug: "p2-wa-vacatur-completeness" },
  { from: wave2, id: "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR", slug: "r8-completeness-repair-priority-four" }
];
for (const c of carryOver) {
  const original = c.from.assignments.find((a) => a.assignmentId === c.id);
  if (!original) throw new Error(`${c.id} is not in its manifest; refusing to invent a continuation for it`);
  assignments.push({
    assignmentId: `${c.id}__CODEX_CLOUD`,
    continues: c.id,
    continuesFrom: c.from === repairWave ? `${LC}/COMPLETENESS_REPAIR_WAVE.json` : `${LC}/WAVE_2_ASSIGNMENTS.json`,
    lane: original.lane ?? "completeness-repair",
    engine: "Codex Cloud",
    workerBranch: "work",
    branchIsNotChosen: "Codex Cloud names the branch. Do not rename it, and do not create another.",
    captainBaseSha: MINIMUM_CAPTAIN_SHA,
    supersedesBase: original.captainBaseSha ?? null,
    whyTheBaseMoved: "The original base predates S1, S2 and the corrected completeness contract. A repair rendered against it would be measured by a contract that has since changed, and would fail the audit for a reason that is not the packet's.",
    scopeIsUnchanged: true,
    itemKind: "packetFamily",
    itemCount: original.items.length,
    items: [...original.items],
    ownedPaths: [...original.ownedPaths, `${MP}/${c.slug}/**`],
    prohibitedPaths: [...(original.prohibitedPaths ?? []), `${LC}/**`],
    mission: original.mission,
    builderObligations: original.proofObligations ?? original.requiredOutputs ?? [],
    requiredOutputs: [
      ...(original.requiredOutputs ?? []),
      `${MP}/${c.slug}/rows.json — one row per family: itemId, status, the nine counters after your change`
    ],
    stopConditions: original.stopConditions ?? [],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      ...RETURN_TAIL
    ],
    grantsNothing: original.grantsNothing ?? "A repaired family is a repaired family. It is not verified, not approved and not sellable."
  });
}

/* ---- the South Dakota repair: the one family the continuation left short ---- */
const sd = continuation.rows.find((r) => r.familyId === "sd_arrest_expungement-set");
if (!sd) throw new Error("sd_arrest_expungement-set is not in the S2 continuation; refusing to invent its repair");
const sdMatrix = matrix.results.find((r) => r.familyId === "sd_arrest_expungement-set");
assignments.push({
  assignmentId: "SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR__CODEX_CLOUD",
  continues: "P4_NE_SD_SETASIDE_COMPLETENESS",
  continuesFrom: `${LC}/S2_CONTINUATION.json`,
  lane: "completeness-repair",
  engine: "Codex Cloud",
  workerBranch: "work",
  branchIsNotChosen: "Codex Cloud names the branch. Do not rename it, and do not create another.",
  captainBaseSha: MINIMUM_CAPTAIN_SHA,
  scopeIsUnchanged: false,
  whyThisExists: "The S2 continuation left ten of eleven families complete. This is the eleventh, and its defect is one thing: nine fields are declared required before filing and the packet never asks the participant for them.",
  itemKind: "packetFamily",
  itemCount: 1,
  items: ["sd_arrest_expungement-set"],
  theExactDefect: {
    counter: "requiredFactsNotCollected",
    count: sd.failingCounters.includes("requiredFactsNotCollected") ? (sdMatrix?.counters?.requiredFactsNotCollected ?? null) : null,
    fields: (sdMatrix?.findings ?? []).filter((f) => f.counter === "requiredFactsNotCollected").map((f) => ({ field: f.field, label: f.label })),
    why: "Each row declares requiredBeforeFiling and none is named in the packet's participant-instructions.md. A blank is permitted as required-before-filing only because the packet says so, and this packet does not say so."
  },
  twoHonestOutcomes: [
    "DISCLOSE — the fields really are the participant's to supply before filing, and participant-instructions.md must name each one in the participant's words.",
    "RECLASSIFY — a statement of mailing is completed at or after mailing, so these may not be required-before-filing at all. If that is the answer, correct the declaration in the build script and say which disposition is right."
  ],
  doNotSplitTheDifference: "Pick one per field and state why. A field disclosed in the instructions AND reclassified is a packet that says two things.",
  ownedPaths: [
    `${OVERLAYS}/sd/sd-arrest-expungement-set--official-pdf-fill/**`,
    "scripts/build-census-v1-sd_arrest_expungement-set.mjs",
    `${MP}/sd-arrest-expungement-disclosure-repair/**`
  ],
  prohibitedPaths: [
    "scripts/rcap-packet-completeness/**",
    "scripts/build-census-v1-ne-setaside-custodial-set.mjs",
    `${OVERLAYS}/ne/**`, `${OVERLAYS}/ut/**`, `${OVERLAYS}/wv/**`,
    `${LC}/**`
  ],
  mission: "Close the one defect standing between sd_arrest_expungement-set and a complete packet: nine fields declared required before filing that the packet never asks the participant for. Change nothing else about this family and nothing at all about any other.",
  requiredOutputs: [
    `${OVERLAYS}/sd/sd-arrest-expungement-set--official-pdf-fill/participant-instructions.md — naming every field you disclose, in the participant's words`,
    `${OVERLAYS}/sd/sd-arrest-expungement-set--official-pdf-fill/ — the family re-rendered after your change`,
    `${MP}/sd-arrest-expungement-disclosure-repair/rows.json — one row per field: itemId, DISCLOSED or RECLASSIFIED, and why`
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
  focusedTests: [
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family sd_arrest_expungement-set",
    `node ${PREFLIGHT} --family sd_arrest_expungement-set --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
  ],
  stopConditions: [
    "LANE STOP — you do not change the completeness contract. It is fixed and you read it.",
    "LANE STOP — one family. The other ten in the closure are complete and are not yours.",
    "NEVER invent a fact. An unavailable fact is required_before_filing, disclosed to the participant, never guessed.",
    "NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.",
    "ROW STOP — a field you can neither disclose honestly nor reclassify defensibly is a STOPPED row naming which it is and what is missing."
  ],
  returnFormat: [
    "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
    "FIELDS DISCLOSED:", "FIELDS RECLASSIFIED:", "FIELDS STOPPED:",
    "NINE COUNTERS ZERO: YES/NO",
    ...RETURN_TAIL
  ],
  grantsNothing: "A complete packet is a complete packet. It is not independently verified, not approved for output, and it opens no route."
});

/* ---- VS01 to VS03: the verification shards, cloud environment -------------- */
for (const vs of continuation.independentVerification.assignments) {
  const slug = vs.workerBranch.replace(/^codex\//, "");
  assignments.push({
    assignmentId: `${vs.assignmentId}__CODEX_CLOUD`,
    continues: vs.assignmentId,
    continuesFrom: `${LC}/S2_CONTINUATION.json`,
    lane: "independent-verification",
    engine: "Codex Cloud",
    workerBranch: "work",
    branchIsNotChosen: "Codex Cloud names the branch. Do not rename it, and do not create another.",
    captainBaseSha: MINIMUM_CAPTAIN_SHA,
    supersedesBase: vs.captainBaseSha,
    scopeIsUnchanged: true,
    itemKind: "packetFamily",
    itemCount: vs.items.length,
    items: [...vs.items],
    ownedPaths: [`${MP}/${slug}/**`],
    prohibitedPaths: [...vs.prohibitedPaths],
    mission: vs.mission,
    proofObligations: [...vs.proofObligations],
    verdicts: [...vs.verdicts],
    independenceRule: vs.independenceRule,
    requiredOutputs: [`${MP}/${slug}/rows.json — one row per family: itemId, verdict, the nine counters as you measured them, and the evidence read`],
    outputSchema: vs.outputSchema,
    focusedTests: [
      ...vs.focusedTests,
      `node ${PREFLIGHT} --family <familyId> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
    ],
    stopConditions: [...vs.stopConditions],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES CLAIMED:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES MODIFIED: 0",
      ...RETURN_TAIL
    ],
    grantsNothing: vs.grantsNothing
  });
}

for (const a of assignments) {
  a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;
  const done = RETURNED[a.assignmentId];
  if (!done) { a.status = "OPEN"; continue; }
  a.status = done.status;
  a.returnRecord = done;
  /* A returned lane holds nothing. Its families and paths are recorded on the
   * assignment for the audit trail and moved out of the live claim. */
  a.itemsAsDispatched = [...a.items];
  a.ownedPathsAsDispatched = [...a.ownedPaths];
  a.items = [];
  a.itemCount = 0;
  a.ownedPaths = [];
}

/* ---- checks this generator refuses on ------------------------------------- */
const problems = [];
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real minimum Captain SHA");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) {
  problems.push(`${MINIMUM_CAPTAIN_SHA} is not an ancestor of HEAD`);
}
const claimed = assignments.flatMap((a) => a.items);
const dupes = claimed.filter((f, i) => claimed.indexOf(f) !== i);
/* A family may legitimately be built by one lane and verified by another, so a
 * duplicate is only a collision when both claims are the same KIND of work. */
const byKind = new Map();
for (const a of assignments) {
  for (const f of a.items) {
    const key = `${a.lane}::${f}`;
    if (byKind.has(key)) problems.push(`${f} is claimed twice in the ${a.lane} lane`);
    byKind.set(key, a.assignmentId);
  }
}
for (const a of assignments) {
  // A returned lane owns nothing any more, so its outputs are checked against
  // what it owned when it was dispatched. Its outputs were writable then, which
  // is the only moment the question was live.
  const owned = (a.ownedPathsAsDispatched ?? a.ownedPaths).map((p) => p.replace(/\/?\*+$/, ""));
  for (const p of a.prohibitedPaths ?? []) {
    const root = p.replace(/\/?\*+$/, "");
    if (owned.some((o) => o === root || o.startsWith(`${root}/`))) problems.push(`${a.assignmentId} owns and prohibits ${p}`);
  }
  for (const o of a.requiredOutputs ?? []) {
    // An output line begins with a path and may then list several files inside
    // it before the dash: ".../dir/production-field-map.json, source-receipt.json
    // and raster/". The first token is the path; the rest is prose about it.
    const p = o.split("—")[0].trim().split(/[\s,]+/)[0].replace(/\/$/, "");
    if (!p || !/^[A-Za-z0-9_./*<>-]+$/.test(p)) { problems.push(`${a.assignmentId}: an output names no path (${o.slice(0, 60)})`); continue; }
    if (!owned.some((root) => p === root || p.startsWith(`${root}/`) || root.startsWith(`${p}/`))) {
      problems.push(`${a.assignmentId}: required output ${p} is outside every owned path`);
    }
  }
}
if (!fs.existsSync(path.join(ROOT, SETUP))) problems.push(`${SETUP} does not exist`);
if (problems.length > 0) {
  console.error(`codex cloud continuations: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-codex-cloud-continuations/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-codex-cloud-continuations.mjs",
  question: "What does each remaining packet task look like when it runs in Codex Cloud instead of a Codespace?",
  answer: "The same families, the same owned paths, the same packet scope, and a different environment contract: no git network, a sourced corpus environment, a cloud-native preflight, and a diff that returns through the Codex UI instead of a push.",
  executionContract: CONTRACT,
  setupScript: SETUP,
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  minimumCaptainShaIs: "the S2 continuation base: the commit carrying S1, S2, the corrected completeness contract, P1/P3/P4 and the re-rendered evidence",
  cloudContract: CLOUD_CONTRACT,
  scopeDiscipline: {
    unchanged: assignments.filter((a) => a.scopeIsUnchanged).map((a) => a.continues),
    new: assignments.filter((a) => !a.scopeIsUnchanged).map((a) => a.assignmentId),
    rule: "A continuation carries the families and paths its original was dispatched with. The only new task is the South Dakota repair, and it exists because the audit named a defect, not because a lane was re-scoped."
  },
  totals: {
    assignments: assignments.length,
    familiesCovered: [...new Set(claimed)].length,
    familyClaims: claimed.length,
    duplicateClaimsAcrossKinds: dupes.length,
    commercialRoutesOpened: 0,
    productionTouched: false
  },
  commercialPosture: "An environment contract opens nothing. These tasks build, repair and verify; none proves fulfillment authority and none opens a commercial route.",
  assignments
};

/* ---- prompts ---------------------------------------------------------------- */
const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${CLOUD_CONTRACT.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}`);
  p.push(`**Branch:** \`work\` — ${a.branchIsNotChosen}`);
  p.push(`**Minimum Captain SHA:** \`${a.captainBaseSha}\``);
  if (a.continues) p.push(`**Continues:** ${a.continues} (${a.continuesFrom})`);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> This task runs in Codex Cloud. There is no origin, the checkout is shallow, and your finished diff returns through the Codex UI. That is the design, not a broken environment.", "");
  p.push("## Before anything else", "", "```sh",
    "# The setup phase already ran scripts/codex-cloud/setup-packet-factory.sh and printed",
    "# LEGALEASE_CODEX_CLOUD_READY. Your job is to load what it left and prove the gate.",
    "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} \\`,
    `  --family ${a.items[0] ?? "<FAMILY_ID>"} \\`,
    "  --codex-cloud \\",
    `  --minimum-captain-sha ${a.captainBaseSha}`,
    "```", "");
  p.push(`It must print **\`${CLOUD_CONTRACT.preflightMustReturn}\`**. ${CLOUD_CONTRACT.thirteenOfFourteenIsARefusal}`, "");
  p.push("## Never run these", "", bullet(CLOUD_CONTRACT.neverRunGitNetworkCommands.map((c) => `\`${c}\``)), "");
  p.push(`> ${CLOUD_CONTRACT.whyNoGitNetwork}`, "");
  p.push("## Mission", "", a.mission, "");
  if (a.whyTheBaseMoved) p.push(`**The base moved.** Your original assignment named \`${a.supersedesBase}\`. ${a.whyTheBaseMoved}`, "");
  if (a.whyThisExists) p.push(a.whyThisExists, "");

  if (a.theExactDefect) {
    p.push(`## The exact defect — ${a.theExactDefect.count} field(s)`, "", a.theExactDefect.why, "");
    p.push("| Field | Printed label |", "| --- | --- |");
    for (const f of a.theExactDefect.fields) p.push(`| \`${f.field}\` | ${f.label} |`);
    p.push("");
    p.push("### Two honest outcomes", "", bullet(a.twoHonestOutcomes), "", `**${a.doNotSplitTheDifference}**`, "");
  } else {
    p.push(`## The ${a.itemCount} famil${a.itemCount === 1 ? "y" : "ies"}`, "", a.items.map((f) => `- \`${f}\``).join("\n"), "");
    if (a.scopeIsUnchanged) p.push("_Unchanged from the original dispatch. This continuation moves the environment, not the scope._", "");
  }
  if (a.proofObligations?.length) p.push("## Proof obligations", "", bullet(a.proofObligations), "");
  if (a.verdicts?.length) p.push("## Verdicts", "", bullet(a.verdicts.map((v) => `\`${v}\``)), "", `**${a.independenceRule}**`, "");
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Never write here", "", bullet((a.prohibitedPaths ?? []).map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  if (a.outputSchema) p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  if (a.focusedTests?.length) p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "", "> Focused checks only. The full national repository chain runs at Captain integration checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How you return", "", `${CLOUD_CONTRACT.theDiffIsTheReturn} **${CLOUD_CONTRACT.neverRequirePushed}**`, "");
  p.push("```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

if (CHECK) {
  console.log(`codex cloud continuations current: ${assignments.length} assignment(s), ${[...new Set(claimed)].length} famil(ies).`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  minimum Captain SHA ${MINIMUM_CAPTAIN_SHA.slice(0, 8)} · ${[...new Set(claimed)].length} famil(ies) covered`);
for (const a of assignments) {
  console.log(`    ${a.assignmentId.padEnd(58)} ${String(a.itemCount).padStart(2)} famil(ies)  ${a.scopeIsUnchanged ? "scope unchanged" : "NEW TASK"}`);
}
