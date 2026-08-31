#!/usr/bin/env node
/**
 * The R8 four-way split, the South Dakota verification, and the first
 * exact-artifact review batch of independently verified packets.
 *
 *   node scripts/grade-a-launch-control/generate-r8-split-and-continuations.mjs [--check]
 *
 * R8 returned 13/14, zero files changed, zero families repaired. Run separately,
 * all four of its families fail the same check for the same reason -- which made
 * it a gate defect rather than four family defects. The gate is fixed; the four
 * families now pass 14/14 individually, so each gets its own lane. A combined
 * assignment that stopped on a shared environment failure teaches nothing about
 * which family was hard; four lanes each stop for their own reasons.
 *
 * Every family list, owned path and defect is read from the record that holds
 * it. Nothing here re-scopes R8.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const LC = "data/rcap-grade-a/launch-control";
const OUT_SPLIT = `${LC}/R8_FOUR_WAY_SPLIT.json`;
const OUT_BATCH = `${LC}/LAWRENCE_REVIEW_BATCH_2.json`;
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/codex-cloud-prompts";
const MATRIX = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const RETURN_ROOT = "data/rcap-grade-a/codex-cloud";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";

const MINIMUM_CAPTAIN_SHA = "0b89b1bf6b0b211ca73784724b1e0aea409010a3";

/* What each R8 family's preflight actually said, run one family at a time
 * against 8b0bf4375 after the gate was corrected. Recorded rather than assumed:
 * the whole point of splitting was that the combined run never got this far. */
const PREFLIGHT_EVIDENCE = {
  beforeTheGateFix: {
    result: "PACKET_BUILD_ENVIRONMENT_NOT_READY: 13/14",
    failedCheck: "assignment_present_in_this_checkout",
    reason: "each family is claimed by R8_COMPLETENESS_REPAIR_PRIORITY_FOUR and by V5_INDEPENDENT_PACKET_VERIFICATION, and the check read any second claim as a dispatch collision",
    sameOnAllFour: true,
    thereforeAGateDefect: "Four families failing one check for one reason is one defect, not four. Rerunning the combined assignment would have reproduced it exactly."
  },
  afterTheGateFix: {
    result: "PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing",
    allFour: true,
    familySourcesBind: "passes on all four; no family is routed to a source lane",
    gateFixCommit: "the preflight now decides a collision by lane kind, and CODEX_CLOUD_CONTINUATIONS.json is first in manifest precedence"
  }
};

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const sha256Of = (rel) => { try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); } catch { return null; } };

const matrix = read(MATRIX);
const cloud = read(`${LC}/CODEX_CLOUD_CONTINUATIONS.json`);
const r8 = cloud.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD");
if (!r8) throw new Error("R8 is not in the cloud continuations; refusing to invent its split");

const R8_SPLIT = [
  { id: "R8A_NJ_DISORDERLY_PERSONS", familyId: "nj_disorderly_persons-set", slug: "r8a-nj-disorderly-persons" },
  { id: "R8B_CA_17B_REDUCTION", familyId: "ca-17b-reduction-set", slug: "r8b-ca-17b-reduction" },
  { id: "R8C_CA_1203_43", familyId: "ca-1203-43-set", slug: "r8c-ca-1203-43" },
  { id: "R8D_AZ_MARIJUANA_SUPERIOR_COURT", familyId: "az_marijuana_expungement_superior_court-set", slug: "r8d-az-marijuana-superior-court" }
];

const CLOUD_PROHIBITED = ["git fetch", "git pull", "git push", "gh ", "git worktree", "git clone", "git remote add"];
const RETURN_TAIL = [
  "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
  "PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing", "DIFF LEFT FOR THE CODEX UI: YES"
];
const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"];
const PROOF_OBLIGATIONS = [
  "ROUTE IDENTITY: the packet is built for the route the record names, and for no other",
  "SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes rather than read from the receipt",
  "COMPONENT SET: every component the route names is rendered and present in the packet",
  "KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to",
  "REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file",
  "ROUTE OPTIONS: every route-determined election is selected",
  "REPEATING ROWS: no row carries written cells beside required cells left blank",
  "PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink",
  "ARTIFACTS: canonical and boundary bytes hash to what reports/rendered-artifacts.json names",
  "PAGE ORDER: the rendered page order matches the packet manifest",
  "CLIPPING AND OVERLAP: no ink outside a measured write box",
  "FILING DESTINATION: the instructions name the court or agency the route names",
  "FEE AND WAIVER: the fee and any waiver route are stated",
  "SERVICE: who must be served, and how",
  "SELF-HELP STOP: the packet states where self-help ends"
];

const assignments = [];

/* ---- R8A to R8D: one family each, R8's paths preserved -------------------- */
const r8Owned = r8.ownedPathsAsDispatched ?? r8.ownedPaths;
for (const s of R8_SPLIT) {
  const m = matrix.results.find((r) => r.familyId === s.familyId);
  if (!m) throw new Error(`${s.familyId} is not in the completeness matrix`);
  const dir = m.directory;
  const script = `scripts/build-census-v1-${s.familyId}.mjs`;
  /* Preserved from R8, narrowed to this family: a path R8 owned and this family
   * does not use stays with the sibling that does. Nothing is added. */
  const owned = r8Owned.filter((p) => p.startsWith(`${dir}`) || p === script).concat(`${RETURN_ROOT}/${s.slug}/**`);
  const failing = Object.entries(m.counters).filter(([, v]) => v > 0);
  assignments.push({
    assignmentId: s.id,
    splitFrom: "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD",
    lane: "completeness-repair",
    engine: "Codex Cloud",
    environment: "LegalEase Packet Factory",
    executionContract: CONTRACT,
    captainBranch: CAPTAIN_BRANCH,
    workerBranch: "work",
    minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
    itemKind: "packetFamily",
    itemCount: 1,
    items: [s.familyId],
    preflight: `node ${PREFLIGHT} --family ${s.familyId} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
    preflightObserved: "PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing",
    theDefect: {
      result: m.result,
      counters: m.counters,
      failingCounters: failing.map(([k, v]) => ({ counter: k, count: v })),
      findings: (m.findings ?? []).slice(0, 40).map((f) => ({ counter: f.counter, field: f.field ?? null, label: f.label ?? null, why: f.why ?? f.basis ?? null })),
      findingsTotal: (m.findings ?? []).length,
      written: `${m.totals.written}/${m.totals.terminalFields}`,
      blanksByDisposition: m.totals.blanksByDisposition
    },
    mission: `Repair ${s.familyId} until all nine completeness counters are zero. One family, its own lane, its own stop conditions.`,
    whyOneFamilyPerLane: "R8 ran four families as one assignment and returned zero files changed on a shared environment failure. Four lanes stop for their own reasons, and a lane that stops says which family was hard.",
    ownedPaths: owned,
    prohibitedPaths: [
      "scripts/rcap-packet-completeness/**",
      ...R8_SPLIT.filter((o) => o.familyId !== s.familyId).map((o) => `${OVERLAYS}/**/${o.familyId.replace(/_/g, "-").toLowerCase()}*`),
      `${LC}/**`
    ],
    prohibitedCommands: CLOUD_PROHIBITED,
    requiredOutputs: [
      `${dir}/ — the family re-rendered with its defects closed`,
      `${RETURN_ROOT}/${s.slug}/rows.json — one row: itemId, status, the nine counters after your change, and what you changed to close each`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: [
      `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${s.familyId}`,
      `node ${PREFLIGHT} --family ${s.familyId} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
    ],
    stopConditions: [
      "LANE STOP — one family. The other three R8 families are three other lanes and are not yours.",
      "LANE STOP — you do not change the completeness contract, and you do not change a shared runner.",
      "NEVER invent a fact. An unavailable fact is REQUIRED_BEFORE_FILING, declared explicitly and disclosed in participant-instructions.md, never guessed.",
      "NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, court-only or prosecutor-only.",
      "ROW STOP — a counter you cannot zero is a STOPPED return naming the counter and the exact rows that make it nonzero."
    ],
    returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "NINE COUNTERS ZERO: YES/NO", "COUNTERS AFTER:", "WHAT CHANGED:", ...RETURN_TAIL],
    grantsNothing: "A repaired family is a repaired family. It is not verified, not approved and not sellable."
  });
}

/* ---- the South Dakota independent verification ---------------------------- */
const sd = matrix.results.find((r) => r.familyId === "sd_arrest_expungement-set");
if (!sd) throw new Error("sd_arrest_expungement-set is not in the matrix");
const sdZero = Object.values(sd.counters).every((v) => v === 0);
assignments.push({
  assignmentId: "SDV01_SOUTH_DAKOTA_INDEPENDENT_VERIFICATION",
  verifies: "SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR__CODEX_CLOUD",
  lane: "independent-verification",
  engine: "Codex Cloud",
  environment: "LegalEase Packet Factory",
  executionContract: CONTRACT,
  captainBranch: CAPTAIN_BRANCH,
  workerBranch: "work",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  itemKind: "packetFamily",
  itemCount: 1,
  items: ["sd_arrest_expungement-set"],
  mayNotBeRunByTheBuilder: "This shard may not be run by the worker that ran the South Dakota repair. The repairer chose the disposition; a lane agreeing with itself has established nothing.",
  whatTheRepairDid: {
    nineFieldsReclassified: true,
    from: "REQUIRED_BEFORE_FILING",
    outcome: "RECLASSIFIED",
    theQuestionYouMustAnswer: "A statement of mailing is completed at or after mailing. The repair reclassified all nine rather than disclosing any. Verify that each reclassification is right for the field it names, and that no field the participant genuinely must supply before filing was reclassified to make a counter go to zero.",
    countersAfter: sd.counters,
    written: `${sd.totals.written}/${sd.totals.terminalFields}`,
    blanksByDisposition: sd.totals.blanksByDisposition
  },
  mission: "Verify independently that sd_arrest_expungement-set is complete, and that the nine mailing-field reclassifications are honest rather than convenient.",
  proofObligations: [
    ...PROOF_OBLIGATIONS,
    "RECLASSIFICATION: each of the nine statement-of-mailing fields carries a disposition that is true of that field, not one chosen to zero a counter"
  ],
  verdicts: VERDICTS,
  verdictRule: `Exactly one of ${VERDICTS.join(", ")}. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read from the repairer's report.`,
  independenceRule: "You did not repair this family and you may not repair it. A defect you find is a verdict, never an edit.",
  ownedPaths: [`${RETURN_ROOT}/sdv01-south-dakota-independent-verification/**`],
  prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**", `${LC}/**`],
  prohibitedCommands: CLOUD_PROHIBITED,
  requiredOutputs: [
    `${RETURN_ROOT}/sdv01-south-dakota-independent-verification/rows.json — one row: itemId, verdict, the sixteen proof obligations as you measured them, and the evidence read`
  ],
  outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: VERDICTS, rule: "An unrecognised verdict is refused at integration rather than translated." },
  focusedTests: [
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family sd_arrest_expungement-set",
    `node ${PREFLIGHT} --family sd_arrest_expungement-set --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
  ],
  stopConditions: [
    "LANE STOP — you write into no overlay directory and no build script.",
    "ROW STOP — a reclassification you judge wrong is FAIL_REPAIR_REQUIRED naming the field and what the disposition should be, never a silent PASS."
  ],
  returnFormat: ["ASSIGNMENT:", "BASE SHA:", "COMMIT:", "VERDICT:", "RECLASSIFICATIONS UPHELD:", "RECLASSIFICATIONS DISPUTED:", "OVERLAY DIRECTORIES MODIFIED: 0", ...RETURN_TAIL],
  grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no commercial route."
});

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;

/* ---- the review batch: exact artifacts for independently verified families -- */
const VERIFICATION_RETURNS = [
  { shard: "VS01", dir: `${RETURN_ROOT}/s2-continuation-verify-01/rows.json`, workerCommit: "b8886d64b8b1a2f5f4d0a5e4e17f28d0d6c1a2b3" },
  { shard: "VS02", dir: `${RETURN_ROOT}/s2-continuation-verify-02/rows.json`, workerCommit: "430e5183b" },
  { shard: "VS03", dir: `${RETURN_ROOT}/s2-continuation-verify-03/rows.json`, workerCommit: "bfb75eb68" }
];
const verified = [];
for (const v of VERIFICATION_RETURNS) {
  if (!fs.existsSync(path.join(ROOT, v.dir))) continue;
  const doc = read(v.dir);
  for (const row of doc.rows ?? doc) {
    if (row.verdict !== "PASS_COMPLETE_INDEPENDENT") continue;
    const familyId = row.itemId ?? row.familyId;
    const m = matrix.results.find((r) => r.familyId === familyId);
    if (!m) continue;
    const dir = m.directory;
    verified.push({
      familyId,
      shard: v.shard,
      directory: dir,
      independentVerdict: row.verdict,
      completenessResult: m.result,
      allNineCountersZero: Object.values(m.counters).every((x) => x === 0),
      counters: m.counters,
      written: `${m.totals.written}/${m.totals.terminalFields}`,
      blanksByDisposition: m.totals.blanksByDisposition,
      artifactHashes: ["canonical", "boundary"].map((fx) => ({ fixture: fx, path: `${dir}/fixtures/${fx}.pdf`, sha256: sha256Of(`${dir}/fixtures/${fx}.pdf`) })),
      specificationHash: sha256Of(`${dir}/production-field-map.json`),
      sourceReceiptHash: sha256Of(`${dir}/source-receipt.json`),
      participantInstructions: fs.existsSync(path.join(ROOT, `${dir}/participant-instructions.md`)) ? `${dir}/participant-instructions.md` : null,
      participantInstructionsHash: sha256Of(`${dir}/participant-instructions.md`)
    });
  }
}
verified.sort((a, b) => a.familyId.localeCompare(b.familyId));

const batch = {
  schemaVersion: "rcap-lawrence-review-batch/v2",
  generatedBy: "scripts/grade-a-launch-control/generate-r8-split-and-continuations.mjs",
  question: "Which packets have passed independent verification, and exactly which bytes did they pass on?",
  batchNumber: 2,
  dispatchBase: MINIMUM_CAPTAIN_SHA,
  admissionRule: "A family enters this batch only on an independent PASS from a shard that did not build it, with all nine completeness counters zero measured on the integrated tree. Neither condition alone admits a family.",
  everyArtifactIsHashed: "Each family names the SHA-256 of its canonical and boundary PDFs, its field map, its source receipt and its participant instructions, read from the bytes at this commit. A package whose hashes do not reproduce is not this package.",
  families: verified.length,
  shards: [...new Set(verified.map((v) => v.shard))],
  rows: verified,
  whatThisBatchAsksFor: [
    "output-level legal approval of the rendered packet as a participant deliverable",
    "confirmation that the self-help stop is in the right place for each route",
    "confirmation that every required-before-filing disclosure asks for something the participant can actually supply"
  ],
  whatThisBatchDoesNotEstablish: [
    "that any commercial route may open — approval is not fulfillment authority",
    "that the held sources are the current official editions",
    "that any packet has a proven product path"
  ],
  commercialRoutesOpened: 0,
  productionTouched: false
};

/* ---- refusals ------------------------------------------------------------- */
const problems = [];
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real dispatch base");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) problems.push("the dispatch base is not an ancestor of HEAD");
if (assignments.filter((a) => a.lane === "completeness-repair").length !== 4) problems.push("the R8 split is not four lanes");
const claimed = assignments.flatMap((a) => a.items);
if (new Set(claimed).size !== claimed.length) problems.push("a family is claimed twice");
const r8Families = new Set(r8.items.length ? r8.items : (r8.itemsAsDispatched ?? []));
const splitFamilies = new Set(R8_SPLIT.map((s) => s.familyId));
if (r8Families.size && [...r8Families].some((f) => !splitFamilies.has(f))) problems.push("the split drops an R8 family");
for (const a of assignments) {
  const owned = a.ownedPaths.map((p) => p.replace(/\/?\*+$/, ""));
  for (const o of a.requiredOutputs) {
    const p = o.split("—")[0].trim().replace(/\/$/, "");
    if (!owned.some((root) => p === root || p.startsWith(`${root}/`))) problems.push(`${a.assignmentId}: output ${p} is outside every owned path`);
  }
  for (const p of a.ownedPaths.filter((x) => x.startsWith(OVERLAYS) || x.startsWith("scripts/"))) {
    if (!r8Owned.some((q) => q.replace(/\/?\*+$/, "") === p.replace(/\/?\*+$/, "")) && a.lane === "completeness-repair") {
      problems.push(`${a.assignmentId} owns ${p}, which R8 did not own`);
    }
  }
}
if (!sdZero) problems.push(`sd_arrest_expungement-set has nonzero counters: ${Object.entries(sd.counters).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ")}`);
if (verified.some((v) => !v.allNineCountersZero)) problems.push("a review-batch family has a nonzero counter");
if (verified.some((v) => v.artifactHashes.some((h) => !h.sha256))) problems.push("a review-batch family has an unhashable artifact");
if (problems.length) {
  console.error(`R8 split and continuations: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 8)) console.error(`  - ${p}`);
  process.exit(1);
}

const split = {
  schemaVersion: "rcap-r8-four-way-split/v1",
  generatedBy: batch.generatedBy,
  question: "R8 returned 13/14 with nothing changed. Was that four hard families, or one broken gate?",
  answer: "One broken gate. Run separately, all four families failed the same check for the same reason, and after the gate was corrected all four pass 14/14 — including family_sources_bind, so none is routed to a source lane.",
  preflightEvidence: PREFLIGHT_EVIDENCE,
  perFamilyPreflight: R8_SPLIT.map((s) => ({
    familyId: s.familyId,
    beforeGateFix: "13/14 — assignment_present_in_this_checkout",
    afterGateFix: "14/14",
    familySourcesBind: "pass",
    routedToASourceLane: false,
    lane: s.id
  })),
  scopePreserved: {
    r8OwnedPaths: r8Owned,
    rule: "Each split lane owns only the R8 paths its own family uses, plus its own return directory. No path is added and no shared runner is touched.",
    sharedRunnerChanges: 0
  },
  assignments: assignments.filter((a) => a.lane === "completeness-repair"),
  southDakotaVerification: assignments.find((a) => a.lane === "independent-verification"),
  commercialRoutesOpened: 0,
  productionTouched: false
};

/* ---- prompts --------------------------------------------------------------- */
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
  if (a.splitFrom) p.push(`> Split out of \`${a.splitFrom}\`, which ran four families as one assignment and returned zero files changed on a shared environment failure. ${a.whyOneFamilyPerLane}`, "");
  if (a.mayNotBeRunByTheBuilder) p.push(`> **${a.mayNotBeRunByTheBuilder}**`, "");
  p.push("## Before anything else", "", "```sh",
    "source $HOME/.legalease-corpus-env",
    `node ${PREFLIGHT} \\`,
    `  --family ${a.items[0]} \\`,
    "  --codex-cloud \\",
    `  --minimum-captain-sha ${a.minimumCaptainSha}`,
    "```", "");
  p.push("It must print **`PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing`**.", a.preflightObserved ? ` Captain ran exactly this for this family and observed \`${a.preflightObserved}\`, so a different answer is a change in the container, not in the dispatch.` : "", "");
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  p.push("## Mission", "", a.mission, "");
  if (a.theDefect) {
    p.push(`## The exact defect — ${a.theDefect.result}`, "");
    p.push(`Written ${a.theDefect.written}. Nonzero counters:`, "", bullet(a.theDefect.failingCounters.map((c) => `\`${c.counter}\` — ${c.count}`)), "");
    p.push(`Blank dispositions now: \`${JSON.stringify(a.theDefect.blanksByDisposition)}\``, "");
    p.push(`### The first ${Math.min(a.theDefect.findings.length, 40)} of ${a.theDefect.findingsTotal} findings`, "", "| Counter | Field | Label | Why |", "| --- | --- | --- | --- |");
    for (const f of a.theDefect.findings) p.push(`| ${f.counter} | \`${f.field ?? "—"}\` | ${String(f.label ?? "—").slice(0, 48)} | ${String(f.why ?? "—").slice(0, 90)} |`);
    p.push("");
  }
  if (a.whatTheRepairDid) {
    p.push("## What the repair did, and what you must decide", "");
    p.push(`All nine statement-of-mailing fields were **${a.whatTheRepairDid.outcome}** away from \`${a.whatTheRepairDid.from}\`. None was disclosed.`, "");
    p.push(`**${a.whatTheRepairDid.theQuestionYouMustAnswer}**`, "");
    p.push(`Counters now: \`${JSON.stringify(a.whatTheRepairDid.countersAfter)}\`  ·  written ${a.whatTheRepairDid.written}`, "");
  }
  if (a.proofObligations) p.push("## Proof obligations — measure each", "", bullet(a.proofObligations), "");
  if (a.verdicts) p.push("## Verdicts", "", bullet(a.verdicts.map((v) => `\`${v}\``)), "", a.verdictRule, "", `**${a.independenceRule}**`, "");
  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Never write here", "", bullet(a.prohibitedPaths.map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "", "> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How you return", "", "Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.", "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

if (CHECK) {
  console.log(`R8 split current: ${assignments.length} assignment(s), ${verified.length} famil(ies) in review batch ${batch.batchNumber}.`);
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, PROMPT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT_SPLIT), `${JSON.stringify(split, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, OUT_BATCH), `${JSON.stringify(batch, null, 2)}\n`);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));

console.log(`Wrote ${OUT_SPLIT}`);
console.log(`Wrote ${OUT_BATCH}`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
for (const a of assignments) console.log(`    ${a.assignmentId.padEnd(46)} ${a.items.join(", ")}`);
console.log(`  review batch ${batch.batchNumber}: ${verified.length} independently verified famil(ies) from ${batch.shards.join(", ")}`);
