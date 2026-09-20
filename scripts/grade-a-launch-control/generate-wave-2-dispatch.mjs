#!/usr/bin/env node
// Wave 2: seven residual lanes, seven independent verification shards, and the
// review machinery that turns a verified packet into an approvable one.
//
//   node scripts/grade-a-launch-control/generate-wave-2-dispatch.mjs [--check]
//
// THE WAVE 1 DEFECT THIS FIXES
//
// Wave 1 told every worker to branch from the control baseline and listed the
// assignment manifest among its required inputs. The manifest lives in the
// dispatch commit that FOLLOWS the baseline, so it was not in any worker's
// checkout; two lanes reported this independently and one returned both its
// focused tests BLOCKED because of it. Wave 2 states two commits: branch from
// the baseline, read the assignment from the Captain branch tip, and verify that
// the manifest's captainBaseSha is the commit you branched from. That closes the
// loop without a manifest that names its own commit.
//
// THE VERIFIER IS NOT THE BUILDER
//
// C11 built 43 families and reported them built. Its own report is evidence, not
// proof. The seven verification shards are dispatched to workers who did not
// build them, every family appears in exactly one shard, and a shard that cannot
// prove a property returns BLOCKED rather than PASS.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json";
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/wave-2-prompts";
const LC = "data/rcap-grade-a/launch-control";
const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

// The Wave 2 control-baseline commit. Workers branch from exactly this.
const CAPTAIN_BASE_SHA = "c8d912d9a1dea54043f6dbc2cda464d00946c74c";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const residual = read(`${LC}/RESIDUAL_WORK.json`);
const contract = read(`${LC}/WORKER_EXECUTION_CONTRACT.json`);
const c11Review = read(`${LC}/C11_RETURN_REVIEW.json`);
const c11Stops = read(`${LC}/C11_STOP_CLASSIFICATION.json`);
const counsel = read(`${LC}/COUNSEL_DETERMINATION_DELTA.json`);
const completeness = read("data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json");
const repairPlan = read("data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json");
const revokedFamilies = repairPlan.plans.map((p) => p.familyId);

// THE FOUR REPAIRS TOUCH TWO FILES THEY DO NOT OWN.
//
// Each of the four build scripts imports a shared runner that lives inside
// ANOTHER family's build script, and both runners carry the allowlist that
// produced the defect: runWestFamilyCli serves nine families and holds the "No
// allowlisted, source-supported fact is offered" refusal; runEastFamily serves
// fifteen and holds not_supported_by_exact_participant_fact_map. Twenty-four
// families depend on them.
//
// So the shared fix cannot be four repairs. If R8 owned those runners it would
// change twenty other families' output while repairing four; if it forked them
// per family the fleet would carry four divergent copies of the same allowlist.
// It is one change, sequenced ahead of R8, in its own lane.
const R8_OVERLAY_PATHS = [
  "data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**",
  "data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/**",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**",
  "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/**"
];
const R8_BUILD_SCRIPTS = [
  "scripts/build-census-v1-nj_disorderly_persons-set.mjs",
  "scripts/build-census-v1-ca-17b-reduction-set.mjs",
  "scripts/build-census-v1-ca-1203-43-set.mjs",
  "scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs"
];
const SHARED_RUNNERS = [
  { file: "scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs", exportName: "runWestFamilyCli", dependentFamilies: 9, carries: "the \"No allowlisted, source-supported fact is offered to this terminal field\" refusal" },
  { file: "scripts/build-census-v1-nj_arrest_no_conviction-set.mjs", exportName: "runEastFamily", dependentFamilies: 15, carries: "the not_supported_by_exact_participant_fact_map refusal class" }
];

const laneOf = (id) => residual.lanes.find((l) => l.residualLaneId === id);
const builtFamilies = c11Review.families.filter((f) => f.classification === "BUILT").map((f) => f.familyId).sort();

const COMMON_PROHIBITED = [
  `${LC}/**`,
  "docs/rcap/grade-a/launch-control/**",
  "data/record-clearing/legal-decisions/**",
  `${V1}/FREEZE.json`,
  "data/rcap-grade-a/route-obligation-census-candidate/**",
  "data/rcap-ledger/**",
  "supabase/migrations/**",
  "package.json",
  "package-lock.json",
  ".github/workflows/**",
  "private/**"
];

const COMMON_INPUTS = [
  `${LC}/WAVE_2_ASSIGNMENTS.json  (read from the Captain branch tip, not from the baseline)`,
  `${LC}/GRADE_A_LAUNCH_CONTROL.json`,
  `${LC}/RESIDUAL_WORK.json`,
  `${LC}/WORKER_EXECUTION_CONTRACT.json`,
  `${LC}/EXISTING_WORK_REUSE_INDEX.json`,
  `${V1}/FREEZE.json`
];

const SETUP = (branch) => [
  "git fetch origin --prune",
  `git checkout -b ${branch} ${CAPTAIN_BASE_SHA}`,
  `git show origin/${CAPTAIN_BRANCH}:${LC}/WAVE_2_ASSIGNMENTS.json > /tmp/wave-2-assignments.json`,
  `# STOP unless /tmp/wave-2-assignments.json captainBaseSha === ${CAPTAIN_BASE_SHA}`,
  `# your assignment is the entry whose assignmentId matches this prompt's title`,
  "npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free; see WEC-2"
];

const RETURN_FORMAT = (extra) => [
  "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
  ...extra,
  "STOPPED AND REPORTED:", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
];

const OUTPUT_SCHEMA_CLAUSE = {
  requirement: "WEC-5: the output schema is fixed, not left to the lane.",
  arrayKey: "rows",
  itemKeyField: "itemId",
  completionVocabulary: ["COMPLETED", "STOPPED"],
  rule: "Put the lane's detail in separate fields. Do not encode it in the status string, and do not invent a third completion word: an unrecognised status is refused at integration rather than translated."
};

const STOP_SCOPE_CLAUSE = "WEC-6: every stop condition below states its scope. A ROW stop records that row and continues to the next; a LANE stop is named as such and says why the remaining rows are unsafe or meaningless without it.";

// ---- the seven residual lanes ------------------------------------------------------
const LANES = [
  {
    id: "R1_BRANCH_IDENTITY_REMAINDER", engine: "Codex", slug: "r1-branch-identity-remainder",
    mission: "Finish the 14 participant branch identities the first wave stopped on. Each one has a named blocker recorded by the lane that stopped it; none is starting from nothing.",
    itemKind: "routeKey",
    outputs: [
      "data/rcap-grade-a/wave-2/r1-branch-identity-remainder/rows.json — one row per route: itemId, status, the participant A branch route key or keys, selector, output strategy, product outcome, commercial treatment, and for a stop the exact blocker"
    ],
    tests: ["node scripts/grade-a-launch-control/generate-category-b-integration-status.mjs --check", "node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
    stops: [
      "ROW STOP — a route whose participant instrument names no document identifiable from a committed record. Naming a form you have not seen sends a participant to file the wrong thing.",
      "ROW STOP — a crosswalk you cannot confirm. Reporting one that does not hold silently drops a branch nothing else covers.",
      "LANE STOP — a change that would move the census denominator. The denominator moves only through the national census generator, with an explanation."
    ],
    extraReturn: ["ROUTES COMPLETED:", "ROUTES STOPPED:", "BRANCH IDENTITIES CREATED:"]
  },
  {
    id: "R2_ALREADY_ANSWERED_ENGINEERING", engine: "Claude Remote", slug: "r2-already-answered-engineering",
    mission: "Implement the 37 legal-review rows a controlling decision already answers. C8 audited every citation and implemented none; an audit is not an implementation, and this lane is measured in engineering effects, not in citations.",
    itemKind: "routeKey",
    outputs: [
      "data/rcap-grade-a/wave-2/r2-already-answered-engineering/rows.json — one row per route: itemId, status, the decision record id, the file and field the effect lands in, and the exact engineering change made"
    ],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
    stops: [
      "ROW STOP — a row whose cited decision record cannot be found. An asserted answer no record backs is the most dangerous outcome in this lane.",
      "ROW STOP — a row whose decision record says something different from the retriage. The record wins and the retriage is the defect; record both and continue.",
      "READ FIRST — the Oregon acquittal row already has a recorded conflict between the retriage's aggregate citation and a newer counsel record. Its resolution is a Captain input carried in the lane detail, not a question for this worker."
    ],
    extraReturn: ["ROWS IMPLEMENTED:", "ROWS STOPPED:", "DECISION RECORDS CITED:"]
  },
  {
    id: "R3_ROUTE_MAPPING_REMAINDER", engine: "Codex", slug: "r3-route-mapping-remainder",
    mission: "Correct the 29 mapping rows C9 stopped on, settle the 13 stage/branch pair bindings it could not, and resolve the Nebraska non-custodial vehicle conflict: the worklist says custom_pleading where the controlling legal design resolves the route to the official CC-6-11 packet.",
    itemKind: "routeKey",
    outputs: [
      "data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json — one row per mapping row and pair binding: itemId, status, current mapping, what is wrong, corrected mapping, evidence"
    ],
    tests: ["node scripts/grade-a-route-obligation-census/verify-national-route-obligation-census.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
    stops: [
      "ROW STOP — a runtime pathway with no census stage, or two stages claiming one pathway. Report it; do not resolve it by picking one.",
      "LANE STOP — any correction that would move the census denominator.",
      "NEVER — no custom pleading may be invented from the Nebraska vehicle conflict. Correct the assignment vehicle or record an approved exact hybrid design."
    ],
    extraReturn: ["MAPPING ROWS RECONCILED:", "PAIR BINDINGS SETTLED:", "DENOMINATOR MOVEMENT: 0"]
  },
  {
    id: "R4_SOURCE_IDENTITY_AND_ACQUISITION", engine: "Codex", slug: "r4-source-identity-and-acquisition",
    // The identity ledger continues the Wave 1 path rather than starting a new
    // one, so the lane has to own it. The writability refusal caught this: the
    // residual record gave R4 a generic wave-2 directory and the assignment
    // still owed a file under identity-resolution/wave-2.
    ownedPathsOverride: [
      "data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/**",
      `${V1}/identity-resolution/wave-2/**`
    ],
    mission: "Resolve 19 unresolved identities and 30 unknown official URLs, acquire the 49 identified obligations from the hosts that answered, promote the 33 inventory candidates, settle the two C11 source-identity stops, and find the real Utah 402 form number.",
    itemKind: "obligationKey",
    outputs: [
      `${V1}/identity-resolution/wave-2/rows.json — one row per obligation: itemId, status, exact document name, issuing authority, form number where one exists, official URL, or an explicit unresolved with what would settle it`,
      "data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/acquired.json — per acquired document: issuing authority, official URL, retrieval time, byte length, SHA-256"
    ],
    tests: ["node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stops: [
      "ROW STOP — an identity that cannot be settled from committed records is recorded unresolved with what would settle it. A wrong resolution sends someone to acquire the wrong document, which is worse than an open row.",
      "PER HOST, NOT PER WAVE (WEC-3) — the last probe result for every acquisition target is in this assignment. Attempt the hosts recorded reachable. Do NOT re-probe a host recorded refused: escalate it. Reaching a host is not acquiring a document; acquisition needs the body and its SHA-256.",
      "NEVER — do not commit an acquired PDF, the archive, or any extracted source file. Commit the receipt. 59 files were excluded from the C11 integration for exactly this reason."
    ],
    extraReturn: ["IDENTITIES RESOLVED:", "IDENTITIES OPEN:", "DOCUMENTS ACQUIRED:", "DOCUMENTS PROMOTED:", "HOSTS ESCALATED:"]
  },
  {
    id: "R5_NONPRODUCTION_ACCEPTANCE", engine: "Claude Remote", slug: "r5-nonproduction-acceptance",
    mission: "HELD. Hosted participant-data-rights acceptance does not run until project hyflxnlhpmiqxvvcoiia is reachable and currently proven synthetic from the executing session. Roger's one-time authorization is unspent and is not re-requested.",
    itemKind: "environment",
    outputs: ["data/rcap-grade-a/wave-2/r5-nonproduction-acceptance/hosted-acceptance.json — only once the preconditions hold"],
    tests: ["node scripts/verify-participant-data-rights.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stops: [
      "LANE STOP — the pinned project cannot be currently proven synthetic from this session, or no credential authorized for its organization exists here. Both were true in Wave 1 and nothing has changed them.",
      "LANE STOP — the host has less than 4096 MiB free. C12 had 32 MiB and could not install the toolchain.",
      "NEVER — no Production migration, deployment, environment-variable change or real participant data. No real downstream processor is contacted. authorizationConsumed stays false."
    ],
    extraReturn: ["PROJECT REACHABLE:", "PROVEN SYNTHETIC:", "MIGRATION APPLIED:", "AUTHORIZATION CONSUMED: false"]
  },
  {
    id: "R6_COUNSEL_DETERMINATION_IMPLEMENTATION", engine: "Codex", slug: "r6-counsel-determination-implementation",
    mission: "Implement Lawrence's four determinations exactly as written. Three are Category A, and two of those carry a condition that changes what may be built. Do not re-research these decisions and do not send them back to counsel.",
    itemKind: "routeKey",
    outputs: [
      "data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/rows.json — one row per route: itemId, status, the branch identity created, and for New York the two date-specific subroutes, and for Utah the nine branches with their consent gate"
    ],
    tests: ["node scripts/grade-a-launch-control/generate-counsel-determination-delta.mjs --check", "node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
    stops: [
      "NEVER — New York may not be built as one generic pre-November 1991 motion. The screening asks the exact conviction date, and the date selects the motion theory: § 160.55(3) before September 1 1980, and a motion to enter and enforce the omitted legacy order under former § 160.55 from September 1980 through October 1991.",
      "NEVER — Utah's two-degree, violent-felony, shortened three-year and substantial-assistance branches refuse without signed prosecutorial consent. A participant's assertion that the prosecutor agrees is not consent.",
      "NEVER — Nebraska generates no merits pleading. Build guidance, the one-year deadline warning, a records checklist and referrals, and stop before selecting, framing, drafting, verifying or filing any postconviction ground.",
      "ROW STOP — Alabama's circuit petition requires proof that the AJIC administrative process was exhausted. Without exhaustion the circuit court has no subject-matter jurisdiction, so the packet must verify it before generating."
    ],
    extraReturn: ["ROUTES IMPLEMENTED:", "NY SUBROUTES CREATED:", "UT BRANCHES GATED:", "NE MERITS PLEADING GENERATED: NO"]
  },
  {
    id: "S1_SHARED_FACT_ALLOWLIST", engine: "Codex", slug: "s1-shared-fact-allowlist",
    sequence: 1,
    mission: `Correct the shared fact allowlist that produced the completeness defect, once, in the two runner modules that carry it. runWestFamilyCli serves ${SHARED_RUNNERS[0].dependentFamilies} families and runEastFamily serves ${SHARED_RUNNERS[1].dependentFamilies}; between them they decide what every official-PDF family is allowed to write. This lane changes the allowlist and nothing else — it renders no packet and repairs no family.`,
    itemKind: "sharedModule",
    explicitItems: SHARED_RUNNERS.map((r) => r.file),
    ownedPathsOverride: ["data/rcap-grade-a/wave-2/s1-shared-fact-allowlist/**", ...SHARED_RUNNERS.map((r) => r.file)],
    outputs: [
      "data/rcap-grade-a/wave-2/s1-shared-fact-allowlist/rows.json — one row per runner: itemId, status, every refusal reason removed or replaced, and the field classes each now writes",
      ...SHARED_RUNNERS.map((r) => `${r.file} — the corrected allowlist, so a known participant or case fact is written rather than refused with a statement of build policy`)
    ],
    tests: [
      "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stops: [
      "LANE STOP — this lane renders no packet and writes into no overlay directory. It changes the allowlist; the re-render is R8's and the later repairs'.",
      "MEASURE THE BLAST RADIUS BEFORE AND AFTER. Twenty-four families import these two runners. Run the fleet audit before and after the change and report every family whose counters move, not only the four in R8.",
      "NEVER fork a runner per family. Four divergent copies of one allowlist is worse than the defect: the next correction would have to be made four times and would be made three.",
      "NEVER invent a fact to satisfy the allowlist. A fact the platform does not hold is classified required_before_filing and surfaced to the participant, not guessed."
    ],
    extraReturn: ["RUNNERS CORRECTED:", "FAMILIES WHOSE COUNTERS MOVED:", "FAMILIES RENDERED: 0", "FLEET AUDIT BEFORE:", "FLEET AUDIT AFTER:"]
  },
  {
    id: "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR", engine: "Codex", slug: "r8-completeness-repair-priority-four",
    sequence: 2,
    dependsOn: ["S1_SHARED_FACT_ALLOWLIST"],
    ownedPathsOverride: ["data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**", ...R8_OVERLAY_PATHS, ...R8_BUILD_SCRIPTS],
    mission: `Repair the four families whose PASS was revoked, in priority order A to D, AFTER S1 has corrected the shared allowlist. Each has a complete per-field ledger in the repair plan: exactly which known facts must be written, which elections the route decides, which blanks need an approved disposition, and which components must render. Re-render each against its pinned source and prove it with the completeness verifier. You own each family's overlay directory and its own build script, so you can write every output this assignment requires.`,
    itemKind: "familyId",
    explicitItems: revokedFamilies,
    outputs: [
      "data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/rows.json — one row per family: itemId, status, counters before and after, and every field newly written or newly classified",
      ...R8_OVERLAY_PATHS.map((dir) => `${dir.replace(/\*\*$/, "")}production-field-map.json, source-receipt.json, fixtures/ and raster/ — the corrected field map, the updated receipt, and the re-rendered canonical and boundary artifacts`)
    ],
    tests: [
      "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>",
      "node scripts/verify-packet-build-environment.mjs --family <family>",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stops: [
      "ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. There is no partial credit: a filing with a blank offence code is not 97 percent filable.",
      "ROW STOP — a required fact the platform genuinely does not hold is classified REQUIRED_BEFORE_FILING and surfaced to the participant in the packet's own instructions. A disposition without that surfacing is not an approved blank.",
      "NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one, because the blank is visible and the guess is not.",
      "NEVER write a protected field: participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.",
      "NEVER re-commit a private-corpus binary. Bind sources from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256.",
      "LANE STOP — do not start until S1 has landed. The two shared runners are S1's, not yours: runWestFamilyCli serves nine families and runEastFamily fifteen, and changing either from here would alter twenty families you were not asked to touch.",
      "ROW STOP — a repair that cannot be completed without changing a shared runner stops and is reported to S1 rather than forking the runner."
    ],
    extraReturn: ["FAMILIES REPAIRED:", "PASS_COMPLETE:", "COUNTERS REMAINING:", "FACTS CLASSIFIED REQUIRED_BEFORE_FILING:", "SHARED RUNNERS MODIFIED: 0"]
  },
  {
    id: "R7_PACKET_REPAIR", engine: "Codex", slug: "r7-packet-repair",
    mission: `Repair the C11 return without rebuilding it: write the missing product-wiring record for the built families that lack one, and complete the Pennsylvania § 6308 packet component specification. The four families in R8 are excluded — they own their own repair, wiring record included. None of the 43 built families is rerun.`,
    itemKind: "familyId",
    outputs: [
      "data/rcap-grade-a/wave-2/r7-packet-repair/rows.json — one row per family: itemId, status, what was missing, what was written",
      "data/rcap-grade-a/wave-2/r7-packet-repair/product-wiring/<family>.json — the missing product-wiring record for each family, stating familyId, routeKeys, implementationStrategy, fieldMap, generationAllowed false, runtimeSelectable false and commercialRoutesOpened 0. Captain moves each into the family's overlay directory at integration, because that directory is not this lane's to write."
    ],
    tests: ["node scripts/grade-a-launch-control/verify-c11-return.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stops: [
      "NEVER rebuild a built family. Its artifacts are byte-checked and its source receipt is exact; only the record is missing.",
      "NEVER re-commit an excluded corpus binary. 59 were removed at integration; bind sources from MASTER_LIBRARY_SOURCE_DIR and compare against the family's own source-receipt.json.",
      "ROW STOP — a family whose route keys or implementation strategy cannot be read from a committed record. Do not infer them from the directory name."
    ],
    extraReturn: ["WIRING RECORDS WRITTEN:", "COMPONENT SPECIFICATIONS COMPLETED:", "FAMILIES REBUILT: 0"]
  }
];

// ---- the seven independent verification shards -------------------------------------
const SHARD_COUNT = 7;
// The original nineteen obligations all asked whether the writes that were made
// were correct. Every one could be satisfied by a packet that wrote six fields
// out of a hundred and eighty-seven, which is what CR-180 did. The nine
// completeness obligations ask what was OWED, and a shard cannot return PASS
// without them.
const PROOF_OBLIGATIONS = [
  "exact route identity", "exact packet-family identity", "source identities and SHA-256 values",
  "complete component set", "correct official form or approved composer",
  "canonical and boundary artifact hashes", "actual-write verification",
  "zero protected-field writes", "signatures and service blocks preserved",
  "page count and page order", "no clipping or overlap", "fee and waiver treatment",
  "filing destination", "service and notice", "later-completion fields",
  "no stale artifact", "no wrong-route reuse", "no source substitution",
  "commercial status remains closed",
  "COMPLETENESS: every known required participant and case fact is visibly written",
  "COMPLETENESS: every required but unknown fact blocks render or is classified required_before_filing and surfaced to the participant",
  "COMPLETENESS: every blank carries one approved disposition from the closed vocabulary",
  "COMPLETENESS: every route-determined option is selected rather than left to the participant",
  "COMPLETENESS: every offence or case row is internally complete",
  "COMPLETENESS: every required packet component is present in a rendered artifact",
  "COMPLETENESS: every field value has a visible final appearance in the output bytes",
  "COMPLETENESS: protected and later-completion fields remain blank",
  "COMPLETENESS: all nine completeness counters are zero"
];
const SHARD_VERDICTS = ["PASS", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_APPROVAL_INPUT"];

const shards = Array.from({ length: SHARD_COUNT }, () => []);
builtFamilies.forEach((family, index) => shards[index % SHARD_COUNT].push(family));

const VERIFICATION = shards.map((families, index) => {
  const n = index + 1;
  return {
    id: `V${n}_INDEPENDENT_PACKET_VERIFICATION`, engine: "Codex", slug: `v${n}-independent-packet-verification`,
    mission: `Independently verify ${families.length} of the 43 packet families C11 built. You did not build them and you may not repair them: this lane proves or refuses, and a repair is someone else's assignment. Read the completeness contract before you start -- the previous PASS definition proved only that the writes that were made were correct, and every family in the fleet fails the contract today.`,
    itemKind: "familyId",
    items: families,
    outputs: [
      `data/rcap-grade-a/wave-2/verification/v${n}/rows.json — one row per family: itemId, verdict, and one entry per proof obligation with the exact value observed and where it was read`
    ],
    tests: [
      "node scripts/verify-packet-build-environment.mjs --family <family>",
      "node scripts/grade-a-launch-control/verify-c11-return.mjs",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stops: [
      "ROW STOP — BLOCKED_SOURCE when the family's pinned source cannot be bound from MASTER_LIBRARY_SOURCE_DIR at its recorded SHA-256. The 59 excluded corpus binaries are not in git by design; bind them through the corpus bootstrap.",
      "ROW STOP — BLOCKED_LEGAL_APPROVAL_INPUT when a proof obligation depends on a legal determination that is not in a controlling record.",
      "ROW STOP — FAIL_REPAIR_REQUIRED when a proof obligation is observably wrong. Record what is wrong and stop; do not fix it.",
      "RUN THE COMPLETENESS VERIFIER FIRST. `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>` must return PASS_COMPLETE before any other obligation is worth evaluating. It returns FAIL for all 43 families today, so expect FAIL_REPAIR_REQUIRED and record the counters rather than treating the shared defect as your family's alone.",
      "NEVER return PASS on a proof obligation you did not evaluate. A shard that cannot evaluate an obligation returns BLOCKED for that family, not PASS with a note."
    ],
    proofObligations: PROOF_OBLIGATIONS,
    verdicts: SHARD_VERDICTS,
    verifierIsNotBuilder: {
      builderBranch: "codex/c11-packet-factory-accelerator",
      rule: "This shard's worker must not be the C11 builder. The builder's report is evidence; independent verification is proof."
    },
    extraReturn: ["FAMILIES PASSED:", "FAILED_REPAIR_REQUIRED:", "BLOCKED_SOURCE:", "BLOCKED_LEGAL_APPROVAL_INPUT:"]
  };
});

// ---- assemble ----------------------------------------------------------------------
const assignments = [
  ...LANES.map((lane) => {
    const residualLane = laneOf(lane.id);
    // The four completeness repairs own their families outright, wiring record
    // included. Leaving them in R7 as well would send two workers to the same
    // overlay directory, and the one writing a wiring record would be writing it
    // for a packet the other one is re-rendering.
    const items = (lane.explicitItems ?? residualLane?.items ?? [])
      .filter((i) => lane.id === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR" || !revokedFamilies.includes(i));
    return {
      assignmentId: lane.id,
      wave: 2,
      engine: lane.engine,
      lane: "residual",
      workerBranch: `codex/${lane.slug}`.replace(/^codex\//, lane.engine === "Claude Remote" ? "claude/" : "codex/"),
      captainBaseSha: CAPTAIN_BASE_SHA,
      readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: `${LC}/WAVE_2_ASSIGNMENTS.json`, verify: `captainBaseSha must equal ${CAPTAIN_BASE_SHA}` },
      mission: lane.mission,
      itemKind: lane.itemKind,
      itemCount: items.length,
      items,
      residualDetail: residualLane?.detail ?? (lane.explicitItems ? { repairPlan: "data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json", perFamily: repairPlan.plans } : null),
      reuseDecision: lane.explicitItems ? "REPAIR_IN_PLACE_DO_NOT_REBUILD" : "RESUME_FROM_RESIDUAL_RECORD",
      reuseBasis: lane.explicitItems
        ? "These four families are built and their artifacts are byte-checked. What is missing is content, not construction: the repair writes the facts the build owed and re-renders."
        : `Every item here is open in ${LC}/RESIDUAL_WORK.json, which refuses to carry anything the integration status reports completed.`,
      ownedPaths: lane.ownedPathsOverride
        ?? residualLane?.ownedPaths
        ?? [`data/rcap-grade-a/wave-2/${lane.slug}/**`],
      ...(lane.sequence ? { sequence: lane.sequence } : {}),
      ...(lane.dependsOn ? { dependsOn: lane.dependsOn } : {}),
      prohibitedPaths: COMMON_PROHIBITED,
      requiredInputs: COMMON_INPUTS,
      requiredOutputs: lane.outputs,
      outputSchema: OUTPUT_SCHEMA_CLAUSE,
      focusedTests: lane.tests,
      stopConditions: [STOP_SCOPE_CLAUSE, ...lane.stops],
      returnFormat: RETURN_FORMAT(lane.extraReturn),
      promptFile: `${PROMPT_DIR}/${lane.id}.md`,
      grantsNothing: "Completing this assignment opens no commercial route, proves no packet and approves no output."
    };
  }),
  ...VERIFICATION.map((shard) => ({
    assignmentId: shard.id,
    wave: 2,
    engine: shard.engine,
    lane: "independent-verification",
    workerBranch: `codex/${shard.slug}`,
    captainBaseSha: CAPTAIN_BASE_SHA,
    readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: `${LC}/WAVE_2_ASSIGNMENTS.json`, verify: `captainBaseSha must equal ${CAPTAIN_BASE_SHA}` },
    mission: shard.mission,
    itemKind: shard.itemKind,
    itemCount: shard.items.length,
    items: shard.items,
    proofObligations: shard.proofObligations,
    verdicts: shard.verdicts,
    verifierIsNotBuilder: shard.verifierIsNotBuilder,
    reuseDecision: "REUSE_AS_IS",
    reuseBasis: "These families are built and integrated. This lane verifies them; it does not rebuild or repair them.",
    ownedPaths: [`data/rcap-grade-a/wave-2/verification/v${shard.id.match(/^V(\d+)/)[1]}/**`],
    prohibitedPaths: [...COMMON_PROHIBITED, "data/rcap-all50/overlays/census-v1/**", "scripts/build-census-v1-*.mjs"],
    requiredInputs: [...COMMON_INPUTS, `${LC}/C11_RETURN_REVIEW.json`, "docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md", "scripts/rcap-packet-completeness/completeness-contract.mjs", "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json"],
    requiredOutputs: shard.outputs,
    outputSchema: { ...OUTPUT_SCHEMA_CLAUSE, completionVocabulary: SHARD_VERDICTS },
    focusedTests: shard.tests,
    stopConditions: [STOP_SCOPE_CLAUSE, ...shard.stops],
    returnFormat: RETURN_FORMAT(shard.extraReturn),
    promptFile: `${PROMPT_DIR}/${shard.id}.md`,
    grantsNothing: "A PASS is independent technical proof. It is not an output-level legal approval, it opens no commercial route and it proves no packet on its own."
  }))
];

// ---- refusals ----------------------------------------------------------------------
const problems = [];
const seen = new Map();
for (const a of assignments) {
  for (const item of a.items) {
    const key = `${a.lane === "independent-verification" ? "verify" : "work"}:${item}`;
    if (seen.has(key)) problems.push(`${item} is claimed by both ${seen.get(key)} and ${a.assignmentId}`);
    else seen.set(key, a.assignmentId);
  }
}
const paths = new Map();
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    const root = p.split("(")[0].trim().replace(/\/?\*\*$/, "");
    if (paths.has(root) && paths.get(root) !== a.assignmentId) problems.push(`owned path ${root} is claimed by both ${paths.get(root)} and ${a.assignmentId}`);
    paths.set(root, a.assignmentId);
  }
}
// A run of underscores is a printed form's leader line, not a placeholder value.
// The first version of this pattern matched ___________________ inside a CR-180
// field label and refused the dispatch for carrying a placeholder it did not
// carry. A real sentinel has letters between its underscores.
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__/;
for (const a of assignments) {
  const text = JSON.stringify({ ...a, focusedTests: undefined, requiredOutputs: undefined });
  if (PLACEHOLDER.test(text)) problems.push(`${a.assignmentId} contains a placeholder value`);
  if (!/^[0-9a-f]{40}$/.test(a.captainBaseSha)) problems.push(`${a.assignmentId} has no real control-baseline SHA`);
  if (!a.workerBranch || !/^(codex|claude)\//.test(a.workerBranch)) problems.push(`${a.assignmentId} has no real worker branch`);
  if (a.itemKind !== "environment" && a.items.length === 0) problems.push(`${a.assignmentId} is a work lane with no items`);
  if (a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR" && a.items.length !== 4) {
    problems.push(`R8 carries ${a.items.length} families; exactly four PASS classifications were revoked`);
  }
}
// EVERY REQUIRED OUTPUT MUST BE LEGALLY WRITABLE.
//
// This is the refusal that would have caught the R8 contradiction before it was
// committed: the assignment owned one wave-2 directory and required outputs
// inside four overlay directories it did not own. An assignment that cannot
// write what it owes is not an assignment, it is a trap -- the worker either
// stops, or breaks its own scope and nobody notices until integration.
{
  const pathLike = /(?:^|[\s`"'(])((?:data|scripts|docs|src|supabase)\/[A-Za-z0-9_./<>-]+)/g;
  for (const a of assignments) {
    const owned = a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, ""));
    const declared = new Set();
    for (const line of a.requiredOutputs) {
      const found = [...String(line).matchAll(pathLike)].map((m) => m[1].replace(/[.,;]$/, ""));
      // An output line that names no path cannot be checked for writability, and
      // "inside each family's existing overlay directory" is exactly how the R8
      // contradiction hid: prose naming files without saying where. A required
      // output must name where it lands.
      if (found.length === 0) problems.push(`${a.assignmentId} has a required output that names no path: "${String(line).slice(0, 72)}..."`);
      for (const f of found) declared.add(f);
    }
    for (const target of declared) {
      const writable = owned.some((o) => target === o || target.startsWith(`${o}/`) || o.startsWith(`${target}/`));
      if (!writable) problems.push(`${a.assignmentId} requires an output at ${target}, which is outside every path it owns`);
    }
  }
}

// A verifier that owns a repair path can repair what it is meant to judge.
for (const a of assignments.filter((x) => x.lane === "independent-verification")) {
  for (const p of a.ownedPaths) {
    const root = p.replace(/\/?\*\*$/, "");
    if (/^data\/rcap-all50\//.test(root) || /^scripts\/build-census-v1-/.test(root)) {
      problems.push(`${a.assignmentId} owns ${p}, which is a repair path; a verifier may not own what it judges`);
    }
  }
}

// R7 and R8 may not both hold a family.
{
  const r7 = assignments.find((a) => a.assignmentId === "R7_PACKET_REPAIR");
  const r8 = assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR");
  const both = (r7?.items ?? []).filter((f) => (r8?.items ?? []).includes(f));
  if (both.length > 0) problems.push(`R7 and R8 both hold ${both.join(", ")}`);
}

// A sequenced lane must name a dependency that exists and runs before it.
for (const a of assignments.filter((x) => x.dependsOn)) {
  for (const dep of a.dependsOn) {
    const upstream = assignments.find((x) => x.assignmentId === dep);
    if (!upstream) problems.push(`${a.assignmentId} depends on ${dep}, which is not dispatched`);
    else if ((upstream.sequence ?? 99) >= (a.sequence ?? 99)) problems.push(`${a.assignmentId} depends on ${dep}, which does not run before it`);
  }
}

// Every built family verified exactly once.
{
  const verified = assignments.filter((a) => a.lane === "independent-verification").flatMap((a) => a.items);
  const dupes = verified.filter((f, i) => verified.indexOf(f) !== i);
  const omitted = builtFamilies.filter((f) => !verified.includes(f));
  if (dupes.length > 0) problems.push(`${dupes.length} family(ies) appear in two shards: ${dupes.slice(0, 3).join(", ")}`);
  if (omitted.length > 0) problems.push(`${omitted.length} built family(ies) appear in no shard: ${omitted.slice(0, 3).join(", ")}`);
  if (verified.length !== builtFamilies.length) problems.push(`${verified.length} families sharded, ${builtFamilies.length} built`);
  for (const a of assignments.filter((x) => x.lane === "independent-verification")) {
    if (a.items.length < 6 || a.items.length > 8) problems.push(`${a.assignmentId} carries ${a.items.length} families; shards hold 6 to 8`);
    if (a.workerBranch === a.verifierIsNotBuilder.builderBranch) problems.push(`${a.assignmentId} would be verified by the builder`);
  }
}
// Every residual lane dispatched.
for (const lane of residual.lanes) {
  if (!assignments.some((a) => a.assignmentId === lane.residualLaneId)) problems.push(`${lane.residualLaneId} is residual and is not dispatched`);
}

if (problems.length > 0) {
  console.error(`wave 2 dispatch: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-grade-a-wave-2-assignments/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-wave-2-dispatch.mjs",
  thisIsTheControllingAssignmentManifest:
    "One manifest says what Wave 2 dispatches, and this is it. Wave 1's manifest is history: its lanes returned and its remainder is carried in RESIDUAL_WORK.json.",
  wave: 2,
  captainBaseSha: CAPTAIN_BASE_SHA,
  captainBranch: CAPTAIN_BRANCH,
  promptDirectory: PROMPT_DIR,
  twoCommitMethod: {
    rule: "Branch from captainBaseSha. Read this manifest from the Captain branch tip. Verify that the manifest's captainBaseSha is the commit you branched from, and stop if it is not.",
    wave1Defect: contract.clauses.find((c) => c.id === "WEC-1")?.because ?? null,
    fix: "Every prompt states both commits and carries the exact command to read the assignment. No prompt lists this manifest as an input resolvable at the baseline, because it is not there."
  },
  executionContract: { record: `${LC}/WORKER_EXECUTION_CONTRACT.json`, clauses: contract.clauses.map((c) => c.id) },
  engineAllocation: {
    Codex: assignments.filter((a) => a.engine === "Codex").map((a) => a.assignmentId),
    "Claude Remote": assignments.filter((a) => a.engine === "Claude Remote").map((a) => a.assignmentId)
  },
  independentVerification: {
    shards: VERIFICATION.length,
    familiesCovered: builtFamilies.length,
    familiesPerShard: VERIFICATION.map((s) => s.items.length),
    duplicateAssignments: 0,
    omittedAssignments: 0,
    verifierMayNotBeBuilder: true,
    proofObligations: PROOF_OBLIGATIONS.length,
    verdicts: SHARD_VERDICTS
  },
  sharedRepairSurface: {
    why: "Each of the four repair targets imports a shared runner that lives inside another family's build script, and both runners carry the allowlist that produced the defect. Twenty-four families depend on them, so the fix is one sequenced change rather than four.",
    runners: SHARED_RUNNERS,
    ownedBy: "S1_SHARED_FACT_ALLOWLIST",
    r8OwnsInstead: { overlayDirectories: R8_OVERLAY_PATHS.length, buildScripts: R8_BUILD_SCRIPTS.length, exclusive: "none of the four build scripts is imported by any other family" },
    sequencing: "S1 runs first. R8 stops rather than forking a runner."
  },
  laterRepairPolicy: {
    remainingFamilies: 39,
    doNotDispatchYet: "The other 39 repairs wait until R8 integrates and the 43-family fleet audit is rerun. S1 changes an allowlist that 24 families import, so the audit after it lands will not be the audit before it: dispatching the 39 against today's numbers would send workers to defects the shared fix already closed.",
    sequence: [
      "S1 corrects the shared allowlist and reports every family whose counters move",
      "R8 repairs the four and proves each PASS_COMPLETE",
      "Captain reruns the 43-family fleet audit",
      "the remaining repairs are grouped and dispatched from the NEW matrix"
    ],
    groupingRule: "Group by shared root cause and form family, not by state. A state is an accident of where a form is filed; the defect travels with the runner that wrote it and the form it wrote onto. Grouping by state would put one CR-180 family in a lane with an unrelated measured-overlay family and split the CR-180 families across four lanes.",
    knownRootCauseClusters: [
      { cause: "runWestFamilyCli allowlist", families: SHARED_RUNNERS[0].dependentFamilies, formFamilies: "official-PDF AcroForm and measured overlay" },
      { cause: "runEastFamily allowlist", families: SHARED_RUNNERS[1].dependentFamilies, formFamilies: "official-PDF AcroForm kits" },
      { cause: "route-determined elections left to the participant", occurrences: completeness.counterTotals.requiredOptionsMissing },
      { cause: "blanks with no approved disposition", occurrences: completeness.counterTotals.unclassifiedBlanks }
    ]
  },
  packetCompleteness: {
    contract: "scripts/rcap-packet-completeness/completeness-contract.mjs",
    matrix: "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
    repairPlan: "data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json",
    familiesAudited: completeness.familiesAudited,
    passComplete: completeness.byResult.PASS_COMPLETE ?? 0,
    byResult: completeness.byResult,
    counterTotals: completeness.counterTotals,
    passRevoked: revokedFamilies,
    passRevokedClassification: "PASS_REVOKED_PENDING_COMPLETENESS_RECHECK",
    whatChanged: "The shard PASS definition proved that every write was correct and never asked what was owed. Nine completeness obligations are added, and no shard may return PASS while any of the nine counters is above zero."
  },
  outputLegalReview: {
    batchesPrepared: 0,
    why: "A review package is prepared only after an independent PASS, and PASS now requires completeness. No family in the fleet passes the completeness contract, and the four previously classified PASS are revoked, so no package may be built for any family.",
    blockedFamilies: revokedFamilies,
    batchSize: "6 to 8 passing families",
    bindsToExact: [
      "route key", "packet-family id", "source SHA-256", "specification SHA-256", "artifact SHA-256",
      "page count", "packet components", "participant writes", "protected fields", "destination",
      "fee and waiver", "service", "self-help stop", "independent review result"
    ],
    approvalStates: ["APPROVED", "REJECTED"],
    noFamilyLevelApproval: "There is no general family-level approval. Every approval binds to exact artifact hashes, so an artifact that changes loses its approval."
  },
  productPathVerification: {
    lanesDispatched: 0,
    gate: "A packet reaches product-path proof only after independent technical and visual PASS and an output-level legal APPROVED. Neither exists yet.",
    sequenceWhenItDoes: [
      "anonymous screening", "result", "authentication", "atomic claim", "participant-owned matter",
      "Review and Edit", "current verification", "test payment or valid sponsorship", "durable render",
      "artifact validation", "private Briefcase", "download", "repeat download"
    ]
  },
  commercialPosture:
    "Every assignment here creates implementation or verification obligations and nothing else. None authorizes checkout, sponsorship, packet-credit consumption, provider dispatch, artifact attachment, delivery, repeat download, commercially eligible status or COMPLETE_PACKET_PROVEN.",
  totals: {
    assignments: assignments.length,
    residualLanes: LANES.length,
    completenessRepairFamilies: revokedFamilies.length,
    sharedRunnersSequencedAhead: SHARED_RUNNERS.length,
    familiesDependingOnSharedRunners: SHARED_RUNNERS.reduce((n, r) => n + r.dependentFamilies, 0),
    verificationShards: VERIFICATION.length,
    itemsAllocated: seen.size,
    collisions: 0,
    placeholders: 0
  },
  assignments
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

function promptFor(a) {
  const list = (items) => (items.length === 0 ? "_none_" : items.map((i) => `- \`${i}\``).join("\n"));
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Wave:** 2  ·  **Engine:** ${a.engine}  ·  **Lane:** ${a.lane}`);
  p.push(`**Worker branch:** \`${a.workerBranch}\``);
  p.push(`**Branch from:** \`${a.captainBaseSha}\``);
  p.push(`**Read this assignment from:** \`origin/${a.readAssignmentFrom.branch}\` → \`${a.readAssignmentFrom.file}\``);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> The assignment manifest is NOT in the commit you branch from. It lives in the dispatch commit that follows it. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.", "");
  p.push("## Mission", "", a.mission, "");
  p.push(`## Your exact scope — ${a.itemCount} ${a.itemKind}${a.itemCount === 1 ? "" : "s"}`, "");
  p.push(list(a.items), "");
  if (a.proofObligations) {
    p.push("## What you must prove for every family", "");
    p.push(a.proofObligations.map((o) => `- ${o}`).join("\n"), "");
    p.push(`Return one of: ${a.verdicts.map((v) => `\`${v}\``).join(", ")}. **Never return PASS on an obligation you did not evaluate.**`, "");
    p.push(`You are not the builder. ${a.verifierIsNotBuilder.rule}`, "");
  }
  p.push("## Reuse decision", "", `**${a.reuseDecision}** — ${a.reuseBasis}`, "");
  p.push("## Required inputs", "", list(a.requiredInputs), "");
  p.push("## Owned paths — write only here", "", list(a.ownedPaths), "");
  p.push("## Prohibited paths — never write here", "", list(a.prohibitedPaths), "");
  p.push("## Required outputs", "", a.requiredOutputs.map((o) => `- ${o}`).join("\n"), "");
  p.push("### Output schema", "");
  p.push(`${a.outputSchema.requirement} Use the array key \`${a.outputSchema.arrayKey}\`, the item key \`${a.outputSchema.itemKeyField}\`, and only these completion words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`);
  p.push("", a.outputSchema.rule, "");
  p.push("## Focused tests", "", list(a.focusedTests), "");
  p.push("Do not run a broad tracked-file mutation suite: other workers are active.", "");
  p.push("## Stop conditions", "", a.stopConditions.map((s) => `- ${s}`).join("\n"), "");
  p.push("Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## Return format", "", "```text", a.returnFormat.join("\n"), "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  p.push("## Setup", "", "```sh", ...SETUP(a.workerBranch), "```", "");
  p.push(`Commit your work and \`git push -u origin ${a.workerBranch}\`.`, "");
  return p.join("\n");
}

const outPath = path.join(ROOT, OUT);
const promptDir = path.join(ROOT, PROMPT_DIR);
const expected = new Set(assignments.map((a) => `${a.assignmentId}.md`));

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  for (const a of assignments) {
    const file = path.join(ROOT, a.promptFile);
    if (!fs.existsSync(file)) { console.error(`missing prompt ${a.promptFile}`); process.exit(1); }
    if (fs.readFileSync(file, "utf8") !== promptFor(a)) { console.error(`${a.promptFile} is stale.`); process.exit(1); }
  }
  const stray = fs.existsSync(promptDir) ? fs.readdirSync(promptDir).filter((f) => f.endsWith(".md") && !expected.has(f)) : [];
  if (stray.length > 0) { console.error(`${PROMPT_DIR} carries ${stray.length} unclaimed prompt(s): ${stray.join(", ")}`); process.exit(1); }
  console.log(`wave 2 dispatch current: ${assignments.length} assignment(s), ${seen.size} item(s), 0 collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(promptDir, { recursive: true });
fs.writeFileSync(outPath, serialized);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));
for (const file of fs.readdirSync(promptDir)) if (file.endsWith(".md") && !expected.has(file)) fs.rmSync(path.join(promptDir, file));
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompt(s) under ${PROMPT_DIR}\n`);
for (const a of assignments) console.log(`  ${a.assignmentId.padEnd(38)} ${a.engine.padEnd(14)} ${String(a.itemCount).padStart(3)} ${a.itemKind}(s)`);
console.log(`\n  items ${seen.size} · collisions 0 · placeholders 0 · shards ${VERIFICATION.length} covering ${builtFamilies.length} famil(ies)`);
