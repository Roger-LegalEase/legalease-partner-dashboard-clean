#!/usr/bin/env node
// The twelve active Codex assignments, and one filled prompt per assignment.
//
//   node scripts/grade-a-launch-control/generate-active-codex-assignments.mjs [--check]
//
// WHAT CHANGED, AND WHY THIS FILE REPLACED THE FIRST-WAVE DISPATCH
//
// The first wave carried four Category B evidence-shard lanes: research work to
// assemble the exclusion evidence for the 55 medium-confidence routes so counsel
// could confirm or overturn each one. That research came back. All 55 rows are
// classified -- 49 splits, 3 confirmations, 3 conversions, 0 still needing a
// legal decision -- so those four lanes have nothing left to research. Sending
// them anyway would pay four workers to re-derive an answer the tree already
// holds, and would invite a second, contradictory classification.
//
// So the wave is reorganised by IMPLEMENTATION ARCHETYPE. C1 through C7 carry
// the 55 classified routes, grouped by what the participant actually files;
// C8 through C12 carry the engineering, mapping, source, packet and platform
// work that was already in flight.
//
// TWO-COMMIT METHOD
//
// Workers branch from an exact control-baseline commit and read their assignment
// from a later dispatch commit. If the manifest recorded its own commit it could
// not exist before it was committed, so the base is pinned here as a constant
// and the dispatch is committed separately.
//
// THE C1-C7 LANES DO NOT BUILD PACKETS
//
// Their deliverable is IDENTITY: the participant branch, its selectors, its
// output strategy, its product outcome, its commercial treatment, and its
// crosswalk to an existing Category A route where one exists. The packet family
// each branch will eventually belong to is NAMED by these lanes and CREATED by
// nobody in this wave. That matters, because a jurisdiction's packet family is
// shared across archetypes -- Michigan's official-PDF family is implicated by
// C2, C3 and C5 -- and three lanes each creating it would produce three
// conflicting families for one jurisdiction.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json";
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/prompts";
const CHECK = process.argv.includes("--check");

// The control-baseline commit. Workers branch from exactly this.
const CAPTAIN_BASE_SHA = "227f095d5d1493feca56779cf60c6f177caebd61";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const LC = "data/rcap-grade-a/launch-control";
const reuse = read(`${LC}/EXISTING_WORK_REUSE_INDEX.json`);
const delta = read(`${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`);
const crosswalk = read(`${LC}/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`);
const retriage = read(`${V1}/legal-review-queue-v2-retriage.json`);
const sourceQueue = read(`${V1}/source-queue-reconciliation.json`);
const custody = read(`${V1}/source-custody-reconciliation.json`);

const deltaByKey = new Map(delta.rows.map((r) => [r.originalRouteKey, r]));

// ---- what each lane gets ---------------------------------------------------------
const heldSources = new Set(custody.rows.filter((r) => r.custodyClass === "SOURCE_ALREADY_HELD").map((r) => r.worklistGroupId));
const freeFamilies = reuse.families.filter((f) => f.freeToDispatch);
const pdfBuildable = [...new Set(freeFamilies
  .filter((f) => f.implementationStrategy === "official_pdf_fill" && heldSources.has(f.worklistGroupId))
  .map((f) => f.worklistGroupId))].sort();
// A family can appear in the worklist under more than one implementation
// strategy. ne-trafficking-setaside-and-seal-set is both official_pdf_fill and
// custom_pleading, so a naive split put it in two packet lanes at once. The
// official-PDF reading wins, because that is where its held source bytes bind.
const composedBuildable = [...new Set(freeFamilies
  .filter((f) => f.implementationStrategy !== "official_pdf_fill" && heldSources.has(f.worklistGroupId))
  .map((f) => f.worklistGroupId))].filter((id) => !pdfBuildable.includes(id)).sort();

const retriageRows = retriage.rows ?? [];
const alreadyAnswered = retriageRows.filter((r) => r.bucket === "ALREADY_ANSWERED").map((r) => r.routeKey).sort();
const mappingRows = retriageRows.filter((r) => r.bucket === "CAPTAIN_MAPPING_CORRECTION").map((r) => r.routeKey).sort();

const obligationKey = (r) => `${r.worklistGroupId}::${r.obligation}`;
const byDisposition = (name) => sourceQueue.rows.filter((r) => r.disposition === name);
const identityObligations = [...new Set([...byDisposition("UNRESOLVED_IDENTITY"), ...byDisposition("RESOLVE_OFFICIAL_URL")].map(obligationKey))].sort();
const acquisitionObligations = [...new Set(byDisposition("ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE").map(obligationKey))].sort();
const promotionObligations = [...new Set(byDisposition("PROMOTE_FROM_NATIONWIDE_INVENTORY").map(obligationKey))].sort();

const archetypeKeys = (id) => (delta.archetypeRouteKeys[id] ?? []).slice().sort();

// The per-route reuse decision is computed once, in the integration delta, and
// read here. Recomputing it in the dispatch would create a second answer that
// could disagree with the record every worker is told to read.
const rowReuse = (row) => row.reuseDecision;

const COMMON_PROHIBITED = [
  "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json",
  "docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md",
  "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  `${V1}/FREEZE.json`,
  `${LC}/**`,
  "data/rcap-ledger/**",
  "supabase/migrations/**",
  "package.json",
  "package-lock.json",
  ".github/workflows/**"
];

const COMMON_INPUTS = [
  `${LC}/GRADE_A_LAUNCH_CONTROL.json`,
  `${LC}/GRADE_A_LAUNCH_STATUS.md`,
  `${LC}/EXISTING_WORK_REUSE_INDEX.json`,
  `${LC}/ACTIVE_CODEX_ASSIGNMENTS.json`,
  `${V1}/FREEZE.json`
];
const CATEGORY_B_INPUTS = [
  ...COMMON_INPUTS,
  `${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`,
  `${LC}/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`,
  `${LC}/category-b-revalidation/report.md`
];

const CATEGORY_B_OUTPUTS = (slug) => [
  `data/rcap-grade-a/category-b-integration/${slug}/branch-identities.json — one record per assigned route: the retained B stage, the participant A branch, and for each the selector, output strategy, product outcome and commercial treatment, stated as four different things`,
  `data/rcap-grade-a/category-b-integration/${slug}/crosswalks.json — for every route whose reuse decision is REUSE_AS_IS, the existing Category A route it binds to and the evidence for the binding`,
  `data/rcap-grade-a/category-b-integration/${slug}/README.md — what each branch files, where it goes, what triggers it and what the deadline is`
];

const CATEGORY_B_TESTS = [
  "node scripts/grade-a-launch-control/generate-category-b-integration-delta.mjs --check",
  "node scripts/grade-a-launch-control/verify-launch-control.mjs",
  "npm run typecheck"
];

const CATEGORY_B_STOPS = [
  "A route whose participant instrument names no document you can identify from a committed record stops and is reported unresolved. Naming a form you have not seen sends a participant to file the wrong thing.",
  "A route whose reuse decision is REUSE_AS_IS and whose crosswalk you cannot confirm stops. Reporting a crosswalk that does not hold silently drops a participant branch nothing else covers.",
  "A B stage and its A branch that would end up sharing a selector, an output strategy, a product outcome or a commercial treatment stops. They are two different things; if they collapse into one, the automatic stage becomes purchasable."
];

const RETURN_FORMAT = (extra = []) => [
  "ASSIGNMENT:",
  "WORKER BRANCH:",
  "BASE SHA:",
  "COMMIT:",
  ...extra,
  "STOPPED AND REPORTED:",
  "COMMERCIAL ROUTES OPENED: 0",
  "PRODUCTION TOUCHED: NO"
];

const CATEGORY_B_LANES = [
  {
    id: "C1_SPLIT_AUTOMATIC_CORRECTION_STATUS", slug: "c1-split-automatic-correction-status",
    archetype: "Automatic process plus participant correction/status branch",
    mission: "The relief runs on its own, and the participant's branch is an administrative correction or status request to the repository that holds the record. Build the branch identity, not the packet."
  },
  {
    id: "C2_SPLIT_AUTOMATIC_COURT_PETITION", slug: "c2-split-automatic-court-petition",
    archetype: "Automatic process plus participant court-petition backstop",
    mission: "The relief runs on its own, and the participant's branch is a court petition or motion filed when it does not. Build the branch identity and name the exact filing; the packet is a later wave."
  },
  {
    id: "C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION", slug: "c3-split-agency-prosecutor-application",
    archetype: "Agency or prosecutor-controlled stage plus participant application or request",
    mission: "An agency or prosecutor controls the stage, and the participant's branch is an application or request into it. Build the branch identity and the destination that actually receives it."
  },
  {
    id: "C4_SPLIT_OBJECTION_HEARING_APPEAL", slug: "c4-split-objection-hearing-appeal",
    archetype: "Participant objection, hearing request, response, appeal or judicial review",
    mission: "The participant's branch is adversarial: an objection, a hearing request, a response, an appeal or judicial review of a decision already made. Build the branch identity, its deadline and what triggers it."
  },
  {
    id: "C5_SPLIT_POST_ORDER_ENFORCEMENT", slug: "c5-split-post-order-enforcement",
    archetype: "Post-order correction, omitted record, custodian enforcement and failed implementation",
    mission: "An order or disposition was already entered and the record did not follow. The participant's branch enforces or corrects it against a named custodian. Build the branch identity and name the custodian."
  },
  {
    id: "C6_CONVERT_ALL_TO_A", slug: "c6-convert-all-to-a",
    archetype: "The three routes the revalidation converted entirely to participant-facing",
    mission: "These three routes are participant-facing in full: no B stage is retained. Retire the exclusion, build the Category A identity, and make sure nothing still selects them as track-only."
  },
  {
    id: "C7_CONFIRM_B_GUIDANCE", slug: "c7-confirm-b-guidance",
    archetype: "Guidance, verification, correction escalation and handoff for the confirmed exclusions",
    mission: "These three exclusions were confirmed: there is no participant filing to build. Write what the participant can actually do — how to verify the record cleared, how to escalate a correction, and where the handoff goes when it did not."
  }
];

const ASSIGNMENTS = [
  ...CATEGORY_B_LANES.map((lane) => {
    const keys = archetypeKeys(lane.id);
    const rows = keys.map((k) => deltaByKey.get(k));
    return {
      id: lane.id,
      archetype: lane.archetype,
      lane: "category-b-implementation",
      workerBranch: `codex/${lane.slug}`,
      mission: lane.mission,
      rowKind: "routeKey",
      routeKeys: keys,
      familyIdsImplicated: [...new Set(rows.map((r) => r.requiredParticipantPacketFamily ?? r.existingPacketFamilyId).filter(Boolean))].sort(),
      reuseByRow: Object.fromEntries(rows.map((r) => [r.originalRouteKey, rowReuse(r)])),
      ownedPaths: [`data/rcap-grade-a/category-b-integration/${lane.slug}/**`],
      requiredInputs: CATEGORY_B_INPUTS,
      requiredOutputs: CATEGORY_B_OUTPUTS(lane.slug),
      focusedTests: CATEGORY_B_TESTS,
      stopConditions: CATEGORY_B_STOPS,
      returnFormat: RETURN_FORMAT(["ROUTES COMPLETED:", "CROSSWALKS CONFIRMED:", "NEW BRANCH IDENTITIES CREATED:", "PACKET FAMILIES NAMED (not created):"])
    };
  }),
  {
    id: "C8_ALREADY_ANSWERED_ENGINEERING",
    archetype: "Already-answered engineering effects the 55-row results did not supersede or absorb",
    lane: "legal-implementation",
    workerBranch: "codex/c8-already-answered-engineering",
    mission: `Implement the ${alreadyAnswered.length} legal-review rows a controlling decision already answers, citing the decision record by id for each. These are not questions to ask again, and none of them is one of the 55: the integration delta checked, and the overlap is zero.`,
    rowKind: "routeKey",
    routeKeys: alreadyAnswered,
    familyIdsImplicated: [],
    reuseByRow: Object.fromEntries(alreadyAnswered.map((k) => [k, {
      decision: "SALVAGE_SPECIFIC_ASSETS",
      basis: `${retriageRows.find((r) => r.routeKey === k)?.ruleId ?? "a controlling decision record"} already answers this row; the record is the asset and the work is to implement what it says`
    }])),
    ownedPaths: ["data/rcap-grade-a/already-answered-implementation/**"],
    requiredInputs: [...COMMON_INPUTS, `${V1}/legal-review-queue-v2-retriage.json`, `${V1}/legal-review-queue-v2.json`],
    requiredOutputs: [
      "data/rcap-grade-a/already-answered-implementation/implemented.json — one record per row: the decision record id, the file and field it lives in, and the exact engineering effect that decision has on this route"
    ],
    focusedTests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs", "npm run typecheck"],
    stopConditions: [
      "A row whose cited decision record cannot be found in this tree stops and is reported. An asserted answer no record backs is the most dangerous outcome in this lane.",
      "A row whose decision record says something different from what the retriage claims stops and is reported; the record wins and the retriage is the defect."
    ],
    returnFormat: RETURN_FORMAT(["ROWS IMPLEMENTED:", "DECISION RECORDS CITED:", "ROWS WHOSE RECORD COULD NOT BE FOUND:"])
  },
  {
    id: "C9_ROUTE_MAPPING_RECONCILIATION",
    archetype: "Captain route-mapping reconciliation, including its overlap with the 49 split routes",
    lane: "engineering",
    workerBranch: "codex/c9-route-mapping-reconciliation",
    mission: `Reconcile the ${mappingRows.length} rows whose route mapping is wrong rather than unanswered: a runtime pathway bound to the wrong stage, a track with no pathway, or two identities for one filing. The integration delta measured the overlap with the 49 split routes and it is ${delta.counts.overlapCaptainMapping}; the ${crosswalk.pairs.length} stage/branch pairs are still yours to bind once C1-C7 land their identities.`,
    rowKind: "routeKey",
    routeKeys: mappingRows,
    familyIdsImplicated: [],
    reuseByRow: Object.fromEntries(mappingRows.map((k) => [k, {
      decision: "REBUILD_REQUIRED_WITH_REASON",
      basis: `${retriageRows.find((r) => r.routeKey === k)?.ruleId ?? "the retriage"} places this row in Captain mapping: a mapping exists and is wrong, so it is corrected rather than reused`
    }])),
    ownedPaths: ["data/rcap-grade-a/captain-route-mapping/**"],
    requiredInputs: [...COMMON_INPUTS, `${V1}/legal-review-queue-v2-retriage.json`, `${LC}/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`],
    requiredOutputs: [
      "data/rcap-grade-a/captain-route-mapping/reconciled.json — one record per row: the current mapping, what is wrong with it, the corrected mapping and the evidence",
      "data/rcap-grade-a/captain-route-mapping/stage-binding.json — for each stage/branch pair in the crosswalk, the runtime pathway that serves the stage and the one that will serve the branch, or an explicit statement that the branch has none yet"
    ],
    focusedTests: [
      "node scripts/grade-a-route-obligation-census/verify-national-route-obligation-census.mjs",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs",
      "npm run typecheck"
    ],
    stopConditions: [
      "A correction that would move the census denominator stops and is reported. The denominator moves only through the national census generator and only with an explanation.",
      "A runtime pathway with no census stage, or two stages claiming one pathway, stops and is reported rather than being resolved by picking one."
    ],
    returnFormat: RETURN_FORMAT(["ROWS RECONCILED:", "STAGE/BRANCH PAIRS BOUND:", "DENOMINATOR MOVEMENT: 0", "ROWS STOPPED:"])
  },
  {
    id: "C10_SOURCE_IDENTITY_ACQUISITION",
    archetype: "Remaining exact source identity and governed acquisition",
    lane: "source",
    workerBranch: "codex/c10-source-identity-acquisition",
    mission: `Resolve ${identityObligations.length} document obligations whose identity or official URL is still unknown, then acquire the ${acquisitionObligations.length} whose exact official source is already identified and promote the ${promotionObligations.length} held in the nationwide inventory but absent from the verified corpus. Identity first: acquisition of a wrongly named document is worse than an open row.`,
    rowKind: "obligation",
    routeKeys: [],
    rowGroups: [
      { name: "IDENTITY — runs now", obligations: identityObligations, reuseDecision: "NO_EXISTING_WORK", note: "Name the document from committed records. Do not guess a form number." },
      { name: "ACQUISITION — blocked on egress", obligations: acquisitionObligations, reuseDecision: "NO_EXISTING_WORK", note: "Runs only in an environment whose egress policy permits the issuing authorities' own domains." },
      { name: "PROMOTION — runs now", obligations: promotionObligations, reuseDecision: "SALVAGE_SPECIFIC_ASSETS", note: "The bytes are already in private/Nationwide Record Clearing/; promote them into the verified corpus with an exact SHA-256." }
    ],
    familyIdsImplicated: [...new Set([...byDisposition("UNRESOLVED_IDENTITY"), ...byDisposition("RESOLVE_OFFICIAL_URL"), ...byDisposition("ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE"), ...byDisposition("PROMOTE_FROM_NATIONWIDE_INVENTORY")].map((r) => r.worklistGroupId))].sort(),
    reuseByRow: {},
    ownedPaths: [
      `${V1}/identity-resolution/wave-2/**`,
      "data/rcap-grade-a/source-acquisition/wave-1/**"
    ],
    requiredInputs: [...COMMON_INPUTS, `${V1}/source-queue-reconciliation.json`, `${V1}/source-custody-reconciliation.json`, "docs/rcap/grade-a/route-obligation-census/ACQUISITION_EGRESS_PROBE.md"],
    requiredOutputs: [
      `${V1}/identity-resolution/wave-2/resolved.json — one record per obligation: the document's exact name, issuing authority, form number where one exists, and the official URL, or an explicit unresolved with what would settle it`,
      "data/rcap-grade-a/source-acquisition/wave-1/acquired.json — one record per acquired document: issuing authority, official URL, retrieval time, byte length and SHA-256"
    ],
    focusedTests: [
      "node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stopConditions: [
      "An identity that cannot be settled from committed records is recorded unresolved with what would settle it. A wrong resolution sends someone to acquire the wrong document, which is worse than an open row.",
      "ACQUISITION IS BLOCKED ON EGRESS. Every Captain-reachable environment refuses court and agency hosts. Acquire from the issuing authority or not at all — no mirror, cache, aggregator or lookalike form. If the environment refuses the issuing authority, the acquisition group stops and the identity and promotion groups still run.",
      "Never commit the acquired PDFs, the archive, or any extracted source file. Commit the receipt."
    ],
    returnFormat: RETURN_FORMAT(["IDENTITIES RESOLVED:", "IDENTITIES STILL OPEN:", "DOCUMENTS ACQUIRED:", "DOCUMENTS PROMOTED:", "ACQUISITION BLOCKED:"])
  },
  {
    id: "C11_PACKET_FACTORY_ACCELERATOR",
    archetype: "Highest-value buildable official-form, composed-pleading and agency-application packet families",
    lane: "packet",
    workerBranch: "codex/c11-packet-factory-accelerator",
    mission: `Build the ${pdfBuildable.length + composedBuildable.length} packet families whose source bytes are already held and whose reuse decision is NO_EXISTING_WORK. Nothing here has evidence anywhere: the six families already built in the tree and the six finished on branches are excluded by the reuse index, not by anyone remembering.`,
    rowKind: "worklistGroupId",
    routeKeys: [],
    rowGroups: [
      { name: "OFFICIAL PDF FILL", families: pdfBuildable, reuseDecision: "NO_EXISTING_WORK", note: "Each family's source binds by exact SHA-256 before a field is written." },
      { name: "COMPOSED PLEADING AND AGENCY APPLICATION", families: composedBuildable, reuseDecision: "NO_EXISTING_WORK", note: "The output vehicle is a legal-design decision. A family whose vehicle is unresolved in its memo stops." }
    ],
    familyIdsImplicated: [...pdfBuildable, ...composedBuildable],
    reuseByRow: Object.fromEntries([...pdfBuildable, ...composedBuildable].map((f) => [f, {
      decision: "NO_EXISTING_WORK",
      basis: "the reuse index classifies this family free to dispatch: no evidence in the Captain tree and none on any branch"
    }])),
    ownedPaths: [
      "data/rcap-all50/overlays/census-v1/**  (only the families listed in this assignment)",
      "data/rcap-all50/pleadings/**  (only the families listed in this assignment)",
      "scripts/build-census-v1-<family>.mjs"
    ],
    requiredInputs: [...COMMON_INPUTS, "docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md", `${V1}/source-custody-reconciliation.json`, "data/rcap-grade-a/stale-artifact-block.json"],
    requiredOutputs: [
      "per official-PDF family: one field census, field map, canonical and boundary fixtures, an actual-write report and page rasters",
      "per composed family: one pleading configuration, fixtures, rendered output and participant instructions"
    ],
    focusedTests: [
      "node scripts/verify-packet-build-environment.mjs --family <family>",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stopConditions: [
      "The packet-build environment preflight must print PACKET_BUILD_ENVIRONMENT_READY 14/14 before anything is written. A family whose source does not bind by exact SHA-256 stops.",
      "Never prefill a participant signature, a signature date, a certificate of mailing before actual mailing, or any court-only or prosecutor-only field.",
      "A family whose output vehicle is unresolved in its legal-design memo stops and is reported; the vehicle is a legal-design decision, not a build choice."
    ],
    returnFormat: RETURN_FORMAT(["FAMILIES BUILT:", "FAMILIES STOPPED:", "PREFLIGHT:", "SOURCES BOUND BY SHA-256:"])
  },
  {
    id: "C12_NONPRODUCTION_ACCEPTANCE_PREP",
    archetype: "Nonproduction participant-data-rights and hosted-acceptance preparation",
    lane: "platform",
    workerBranch: "codex/c12-nonproduction-acceptance-prep",
    mission: "Stand up the dedicated synthetic nonproduction acceptance project, apply the participant-data-rights migration there under the standing one-time authorization, and run hosted export, matter-deletion and account-deletion acceptance against it.",
    rowKind: "environment",
    routeKeys: [],
    familyIdsImplicated: [],
    reuseByRow: {
      "supabase/migrations/20260830120000_participant_data_rights.sql": {
        decision: "RESUME_FROM_COMMIT",
        basis: "the migration and the code are integrated on the Captain branch and the focused suite passes 117/117; what is missing is an environment to apply them in, not an implementation"
      }
    },
    ownedPaths: ["data/rcap-grade-a/participant-data-rights/**"],
    requiredInputs: [...COMMON_INPUTS, "supabase/migrations/20260830120000_participant_data_rights.sql", "data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json"],
    requiredOutputs: [
      "data/rcap-grade-a/participant-data-rights/hosted-acceptance.json — the project ref, the proof it is synthetic, the migration's SHA-256 as applied, and the result of each acceptance case"
    ],
    focusedTests: [
      "node scripts/verify-participant-data-rights.mjs",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stopConditions: [
      "SYNTHETIC NONPRODUCTION ONLY. No Production migration, deployment, environment-variable change or real participant data. The authorization covers one dedicated synthetic acceptance project and nothing else.",
      "If the project ref cannot be recorded and proven synthetic, this lane stops rather than proceeding.",
      "Do not contact real downstream processors with deletion requests. The processor adapters run against the synthetic project's own fixtures."
    ],
    returnFormat: RETURN_FORMAT(["PROJECT REF:", "PROVEN SYNTHETIC:", "MIGRATION APPLIED:", "ACCEPTANCE CASES PASSED:", "REAL PARTICIPANT DATA TOUCHED: NO"])
  }
];

// ---- assemble ---------------------------------------------------------------------
const assignments = ASSIGNMENTS.map((a) => ({
  assignmentId: a.id,
  archetype: a.archetype,
  lane: a.lane,
  workerBranch: a.workerBranch,
  captainBaseSha: CAPTAIN_BASE_SHA,
  mission: a.mission,
  rowKind: a.rowKind,
  routeKeyCount: a.routeKeys.length,
  routeKeys: a.routeKeys,
  ...(a.rowGroups ? { rowGroups: a.rowGroups } : {}),
  familyIdsImplicated: a.familyIdsImplicated,
  familiesAreNamedNotCreated: a.lane === "category-b-implementation"
    ? "These families are NAMED by this lane and created by nobody in this wave. A jurisdiction's family is shared across archetypes, so three lanes each creating it would produce three conflicting families for one jurisdiction."
    : undefined,
  reuseDecisionSummary: (() => {
    const decisions = [...new Set(Object.values(a.reuseByRow).map((r) => r.decision), ...(a.rowGroups ?? []).map((g) => g.reuseDecision))];
    const grouped = [...new Set([...Object.values(a.reuseByRow).map((r) => r.decision), ...(a.rowGroups ?? []).map((g) => g.reuseDecision)])];
    return grouped.length === 1 ? grouped[0] : `MIXED: ${grouped.sort().join(" + ")}`;
  })(),
  reuseByRow: a.reuseByRow,
  ownedPaths: a.ownedPaths,
  prohibitedPaths: COMMON_PROHIBITED,
  requiredInputs: a.requiredInputs,
  requiredOutputs: a.requiredOutputs,
  focusedTests: a.focusedTests,
  stopConditions: a.stopConditions,
  returnFormat: a.returnFormat,
  promptFile: `${PROMPT_DIR}/${a.id}.md`,
  reuseChecked: true,
  grantsNothing: "Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and packet family, and from nothing else."
}));

// ---- refusals ---------------------------------------------------------------------
const problems = [];

const allocated = new Map();
const allocate = (value, id, kind) => {
  const key = `${kind}:${value}`;
  if (allocated.has(key)) problems.push(`${kind} ${value} is assigned to both ${allocated.get(key)} and ${id}`);
  else allocated.set(key, id);
};
for (const a of assignments) {
  for (const key of a.routeKeys) allocate(key, a.assignmentId, "route");
  for (const group of a.rowGroups ?? []) {
    for (const o of group.obligations ?? []) allocate(o, a.assignmentId, "obligation");
    for (const f of group.families ?? []) allocate(f, a.assignmentId, "family");
  }
}

const seenPaths = new Map();
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    const root = p.split("(")[0].trim();
    if (seenPaths.has(root) && seenPaths.get(root) !== a.assignmentId) {
      problems.push(`owned path ${root} is claimed by both ${seenPaths.get(root)} and ${a.assignmentId}`);
    }
    seenPaths.set(root, a.assignmentId);
  }
  // A C1-C7 lane that owned a packet-family path would create a family three
  // other lanes also name. Identity lanes own identity records and nothing else.
  if (a.lane === "category-b-implementation") {
    for (const p of a.ownedPaths) {
      if (/data\/rcap-all50\/(overlays|pleadings)/.test(p)) {
        problems.push(`${a.assignmentId} is a branch-identity lane and must not own a packet-family path (${p})`);
      }
    }
  }
}

const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>/i;
for (const a of assignments) {
  // <family> in an owned path and a test command is a per-family substitution
  // the worker fills from its own row list, not an unfilled assignment value.
  const text = JSON.stringify({ ...a, ownedPaths: undefined, focusedTests: undefined });
  if (PLACEHOLDER.test(text)) problems.push(`${a.assignmentId} contains a placeholder value`);
  if (a.rowKind === "routeKey" && a.routeKeys.length === 0) problems.push(`${a.assignmentId} is a route lane with no route keys`);
  if (a.rowKind === "obligation" && !(a.rowGroups ?? []).some((g) => (g.obligations ?? []).length > 0)) {
    problems.push(`${a.assignmentId} is an obligation lane with no obligations`);
  }
  if (a.rowKind === "worklistGroupId" && !(a.rowGroups ?? []).some((g) => (g.families ?? []).length > 0)) {
    problems.push(`${a.assignmentId} is a family lane with no families`);
  }
  if (a.captainBaseSha !== CAPTAIN_BASE_SHA) problems.push(`${a.assignmentId} records a different base than the manifest`);
  if (!/^[0-9a-f]{40}$/.test(CAPTAIN_BASE_SHA)) problems.push("the control-baseline SHA is not a full commit id");
}

// Every one of the 55 classified routes lands in exactly one archetype lane.
const categoryBAssigned = assignments.filter((a) => a.lane === "category-b-implementation").flatMap((a) => a.routeKeys);
if (new Set(categoryBAssigned).size !== delta.counts.rows) {
  problems.push(`the archetype lanes carry ${new Set(categoryBAssigned).size} of the ${delta.counts.rows} classified routes`);
}
for (const row of delta.rows) {
  if (!categoryBAssigned.includes(row.originalRouteKey)) problems.push(`${row.originalRouteKey} was classified and then assigned to nobody`);
}
for (const a of assignments.filter((x) => x.lane === "category-b-implementation")) {
  for (const key of a.routeKeys) {
    const row = deltaByKey.get(key);
    if (!row) { problems.push(`${a.assignmentId} carries ${key}, which is not in the integration delta`); continue; }
    if (row.assignedLaneKey !== a.assignmentId) {
      problems.push(`${key} is routed to ${row.assignedLaneKey} but assigned to ${a.assignmentId}`);
    }
  }
}

// The four Category B research lanes are answered and must not be dispatched.
const OBSOLETE = ["C1_CATEGORY_B_EVIDENCE_SHARD_1", "C2_CATEGORY_B_EVIDENCE_SHARD_2", "C3_CATEGORY_B_EVIDENCE_SHARD_3", "C4_CATEGORY_B_EVIDENCE_SHARD_4"];
for (const id of OBSOLETE) {
  if (assignments.some((a) => a.assignmentId === id)) problems.push(`${id} is an answered research lane and must not be dispatched`);
}

// A packet lane may only receive a family that is free to dispatch.
const free = new Set(freeFamilies.map((f) => f.worklistGroupId));
for (const a of assignments.filter((x) => x.lane === "packet")) {
  for (const group of a.rowGroups ?? []) {
    for (const family of group.families ?? []) if (!free.has(family)) problems.push(`${a.assignmentId} was given ${family}, which is not free to dispatch`);
  }
}

if (problems.length > 0) {
  console.error(`active codex assignments: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const routeKeysAllocated = [...allocated.keys()].filter((k) => k.startsWith("route:")).length;
const obligationsAllocated = [...allocated.keys()].filter((k) => k.startsWith("obligation:")).length;
const familiesAllocated = [...allocated.keys()].filter((k) => k.startsWith("family:")).length;

const sharedFamilies = (() => {
  const owners = new Map();
  for (const a of assignments.filter((x) => x.lane === "category-b-implementation")) {
    for (const f of a.familyIdsImplicated) {
      if (!owners.has(f)) owners.set(f, []);
      owners.get(f).push(a.assignmentId);
    }
  }
  return Object.fromEntries([...owners.entries()].filter(([, ids]) => ids.length > 1).sort());
})();

const doc = {
  schemaVersion: "rcap-grade-a-active-codex-assignments/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-active-codex-assignments.mjs",
  thisIsTheControllingAssignmentManifest:
    "One manifest says what is dispatched, and this is it. It replaces first-wave-assignments.json, which was renamed to this path rather than copied, so no second manifest can claim a lane.",
  captainBaseSha: CAPTAIN_BASE_SHA,
  controllingLaunchRecord: `${LC}/GRADE_A_LAUNCH_CONTROL.json`,
  launchStatusMirror: `${LC}/GRADE_A_LAUNCH_STATUS.md`,
  reuseIndex: `${LC}/EXISTING_WORK_REUSE_INDEX.json`,
  categoryBIntegrationDelta: `${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`,
  stageBranchCrosswalk: `${LC}/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`,
  promptDirectory: PROMPT_DIR,
  twoCommitMethod:
    "Workers branch from captainBaseSha and read this manifest from the dispatch commit that follows it. The base is a constant rather than a lookup, because a manifest that recorded its own commit could not exist before it was committed.",
  waveRevision: {
    supersedes: "data/rcap-grade-a/launch-control/first-wave-assignments.json, renamed to this path",
    why: "The four Category B evidence-shard lanes existed to get the 55 medium-confidence routes classified. They came back classified — 49 splits, 3 confirmations, 3 conversions, 0 still needing a legal decision — so the lanes have nothing left to research and are replaced by implementation archetypes.",
    obsoleteLanesNotDispatched: OBSOLETE.map((id) => ({
      assignmentId: id,
      why: "the research it was to perform is complete and recorded in CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json; dispatching it would buy a second, contradictory classification"
    }))
  },
  familiesNamedByMoreThanOneLane: {
    families: sharedFamilies,
    rule: "A jurisdiction's packet family is shared across archetypes. The branch-identity lanes NAME the family a branch will belong to and none of them creates it; family creation follows the identities, as Captain work."
  },
  notDispatched: {
    familiesAlreadyBuiltInTree: reuse.families.filter((f) => f.reuseDecision === "REUSE_AS_IS").map((f) => f.worklistGroupId),
    familiesFinishedOnBranchesAwaitingIntegration: reuse.families.filter((f) => f.reuseDecision === "RESUME_FROM_COMMIT")
      .map((f) => ({ family: f.worklistGroupId, branch: f.evidenceOnBranch })),
    why: "These twelve families are complete or complete-on-a-branch. Integrating them is Captain work; handing them to a packet lane would rebuild finished work on top of itself."
  },
  commercialPosture:
    "Every assignment here creates implementation obligations and nothing else. None authorizes checkout, sponsorship, packet-credit consumption, provider dispatch, artifact attachment, delivery, repeat download, commercially eligible status or COMPLETE_PACKET_PROVEN. Every fail-closed commercial gate stands unchanged.",
  totals: {
    assignments: assignments.length,
    routeKeysAllocated,
    obligationsAllocated,
    familiesAllocated,
    classifiedRoutesCovered: new Set(categoryBAssigned).size,
    collisions: 0,
    placeholders: 0
  },
  assignments
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

function promptFor(a) {
  const list = (items, empty) => (items.length === 0 ? empty : items.map((i) => `- \`${i}\``).join("\n"));
  const parts = [];
  parts.push(`# ${a.assignmentId}`);
  parts.push("");
  parts.push(`**Archetype:** ${a.archetype}`);
  parts.push(`**Lane:** ${a.lane}`);
  parts.push(`**Worker branch:** \`${a.workerBranch}\``);
  parts.push(`**Branch from:** \`${a.captainBaseSha}\` (the control baseline — branch from exactly this commit)`);
  parts.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean");
  parts.push("");
  parts.push("## Mission");
  parts.push("");
  parts.push(a.mission);
  parts.push("");

  if (a.routeKeys.length > 0) {
    parts.push(`## Your exact scope — ${a.routeKeyCount} route${a.routeKeyCount === 1 ? "" : "s"}`);
    parts.push("");
    parts.push("| Route key | Reuse decision | Why |");
    parts.push("| --- | --- | --- |");
    for (const key of a.routeKeys) {
      const r = a.reuseByRow[key];
      parts.push(`| \`${key}\` | ${r.decision} | ${r.basis} |`);
    }
    parts.push("");
  }
  for (const group of a.rowGroups ?? []) {
    const items = group.obligations ?? group.families ?? [];
    parts.push(`## ${group.name} — ${items.length} item${items.length === 1 ? "" : "s"}`);
    parts.push("");
    parts.push(`**Reuse decision:** ${group.reuseDecision}. ${group.note}`);
    parts.push("");
    parts.push(list(items, "_none_"));
    parts.push("");
  }
  if (a.familyIdsImplicated.length > 0) {
    parts.push("## Packet families implicated");
    parts.push("");
    if (a.familiesAreNamedNotCreated) { parts.push(a.familiesAreNamedNotCreated); parts.push(""); }
    parts.push(list(a.familyIdsImplicated, "_none_"));
    parts.push("");
  }
  parts.push("Nothing outside this scope belongs to you. Every row here is allocated to you and to no other lane; the dispatch refuses to generate if two lanes claim one row.");
  parts.push("");
  parts.push("## Required inputs");
  parts.push("");
  parts.push(list(a.requiredInputs, "_none_"));
  parts.push("");
  parts.push("## Owned paths — write only here");
  parts.push("");
  parts.push(list(a.ownedPaths, "_none_"));
  parts.push("");
  parts.push("## Prohibited paths — never write here");
  parts.push("");
  parts.push(list(a.prohibitedPaths, "_none_"));
  parts.push("");
  parts.push("## Required outputs");
  parts.push("");
  parts.push(a.requiredOutputs.map((o) => `- ${o}`).join("\n"));
  parts.push("");
  parts.push("## Focused tests");
  parts.push("");
  parts.push(list(a.focusedTests, "_none_"));
  parts.push("");
  parts.push("Do not run a broad tracked-file mutation suite: other workers are active, and a mutation harness that leaves a tracked file altered fails their runs, not only yours.");
  parts.push("");
  parts.push("## Stop conditions");
  parts.push("");
  parts.push(a.stopConditions.map((s) => `- ${s}`).join("\n"));
  parts.push("");
  parts.push("Stopping with an honest account of what is missing is a complete return. A result reported as done on evidence nobody opened is not.");
  parts.push("");
  parts.push("## Return format");
  parts.push("");
  parts.push("```text");
  parts.push(a.returnFormat.join("\n"));
  parts.push("```");
  parts.push("");
  parts.push("## What finishing does not do");
  parts.push("");
  parts.push(a.grantsNothing);
  parts.push("");
  parts.push("## Setup");
  parts.push("");
  parts.push("```sh");
  parts.push("git fetch origin --prune");
  parts.push(`git checkout -b ${a.workerBranch} ${a.captainBaseSha}`);
  parts.push("npm ci --cache /tmp/legalease-npm-cache");
  parts.push("```");
  parts.push("");
  parts.push(`Commit your work and \`git push -u origin ${a.workerBranch}\`.`);
  parts.push("");
  return parts.join("\n");
}

const outPath = path.join(ROOT, OUT);
const promptDir = path.join(ROOT, PROMPT_DIR);
const expectedPrompts = new Set(assignments.map((a) => `${a.assignmentId}.md`));

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale. Run the generator.`); process.exit(1); }
  for (const a of assignments) {
    const file = path.join(ROOT, a.promptFile);
    if (!fs.existsSync(file)) { console.error(`missing prompt ${a.promptFile}`); process.exit(1); }
    if (fs.readFileSync(file, "utf8") !== promptFor(a)) { console.error(`${a.promptFile} is stale.`); process.exit(1); }
  }
  // A prompt file nobody is assigned is a dispatchable assignment with no
  // manifest entry, no reuse record and no collision check. The obsolete
  // Category B research prompts are exactly that shape.
  const stray = fs.existsSync(promptDir) ? fs.readdirSync(promptDir).filter((f) => f.endsWith(".md") && !expectedPrompts.has(f)) : [];
  if (stray.length > 0) {
    console.error(`${PROMPT_DIR} carries ${stray.length} prompt(s) no assignment claims: ${stray.join(", ")}`);
    process.exit(1);
  }
  console.log(`active codex assignments current: ${assignments.length} assignment(s), ${routeKeysAllocated} route(s), ${obligationsAllocated} obligation(s), ${familiesAllocated} famil(ies), 0 collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(promptDir, { recursive: true });
fs.writeFileSync(outPath, serialized);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));
for (const file of fs.readdirSync(promptDir)) {
  if (file.endsWith(".md") && !expectedPrompts.has(file)) fs.rmSync(path.join(promptDir, file));
}
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompt(s) under ${PROMPT_DIR}\n`);
for (const a of assignments) {
  const scope = a.routeKeys.length > 0
    ? `${a.routeKeyCount} route(s)`
    : (a.rowGroups ?? []).map((g) => `${(g.obligations ?? g.families ?? []).length} ${g.obligations ? "obligation(s)" : "famil(ies)"}`).join(" + ") || "environment";
  console.log(`  ${a.assignmentId.padEnd(46)} ${scope}`);
}
console.log(`\n  routes ${routeKeysAllocated} · obligations ${obligationsAllocated} · families ${familiesAllocated} · collisions 0 · placeholders 0`);
