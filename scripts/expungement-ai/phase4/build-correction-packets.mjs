#!/usr/bin/env node
/**
 * Phase 4 correction packets. Ten consolidated packets, one per category the
 * assignment names. Each is a specification of work for its owner; none is
 * implemented here, and nothing in this file edits an implementation path.
 */
import { readJson, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const MATRIX = readJson("data/expungement-ai/flow-audit/phase4/verdict-matrix.json");
const INTEGRITY = readJson("data/expungement-ai/flow-audit/phase4/binding-integrity.json");
const TIMING = readJson("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");
const COUNTY = readJson("data/expungement-ai/flow-audit/phase4/county-court-verification.json");
const AMBIGUITY = readJson("data/expungement-ai/flow-audit/phase4/route-irrelevant-ambiguity.json");
const CROSS = readJson("data/expungement-ai/flow-audit/phase4/cross-state-ambiguity.json");
const ISSUES = readJson("data/expungement-ai/flow-audit/phase4/global-issue-reconciliation.json");
const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

const DISPOSITIONS = {};
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) DISPOSITIONS[route] = { shard: `SHARD-${index}`, ...value };
}
const byDisposition = (name) => Object.entries(DISPOSITIONS).filter(([, value]) => value.disposition === name).map(([route]) => route).sort();
const rowsFor = (packetId) => MATRIX.rows.filter((row) => row.correctionPacketIds.includes(packetId));
const prematureRoutes = Object.entries(TIMING.routes ?? {})
  .filter(([, value]) => value.paymentAtShortestBucket || value.paymentWhileCaseStillOpen)
  .map(([route, value]) => ({ route, resolution: value.waitingRuleResolution, timingInert: value.timingAnswerInert, paymentAtShortestBucket: value.paymentAtShortestBucket, paymentWhileCaseStillOpen: value.paymentWhileCaseStillOpen }));
const defectiveBindings = Object.entries(INTEGRITY.bindings ?? {})
  .filter(([, value]) => value.materialFindingCount > 0)
  .map(([route, value]) => ({ route, resolution: value.resolution, findings: value.findings.filter((f) => f.severity !== "informational") }));

const packets = [
  {
    id: "CP-01", title: "P0 legal and premature-payment risks",
    owner: "Expungement.ai legal-logic owner with counsel sign-off",
    blocksRollout: true,
    statement: "Every route this pass measured as taking money before its waiting period can be satisfied, or as ignoring the timing answer entirely, plus the seven required P0 release holds.",
    measured: {
      routesSwept: TIMING.totals.routesSwept,
      timingAnswerInert: TIMING.totals.timingInert,
      paymentOpenAtShortestBucket: TIMING.totals.paymentAtShortestBucket,
      paymentOpenWhileTheCaseIsStillOpen: TIMING.totals.paymentWhileCaseStillOpen
    },
    routes: prematureRoutes,
    requiredP0Holds: [
      { hold: "HI:dui-under-21-conviction", reproduced: "PARTIAL", detail: "Timing answer is inert on this route across all nine published buckets (every bucket returns needs_review). Payment does not open on this route; it opens on HI:nonconviction-arrest-expungement, which is inert at lt_1_year AND while the case is still open." },
      { hold: "HI:first-time-drug-conviction", reproduced: "PARTIAL", detail: "Identical to the DUI route: inert across all buckets, needs_review, payment closed on this route and open on the jurisdiction's non-conviction route." },
      { hold: "NV:general-conviction-record-sealing", reproduced: "NOT_AS_STATED", detail: "The route returns needs_review with paymentAllowed=false at every published bucket including lt_1_year, so payment is not open. The underlying defect is real but different: the eight-year rule never executes, and no NV route reaches a purchasable terminal at all. Hold retained; the wording must be corrected before it is actioned." },
      { hold: "LA five-year clean-period route", reproduced: "YES", detail: "Three LA routes allow payment at lt_1_year: non-conviction-arrest-expungement, misdemeanor-article-894-b-set-aside-followed-by-expungement and felony-article-893-e-set-aside-followed-by-expungement. The two article-893/894 routes are the five-year clean-period family the hold names." },
      { hold: "MO:marijuana-expungement", reproduced: "YES_EXACTLY", detail: "MO:marijuana-expungement-under-missouri-constitution-article-xiv is a COMMITTED binding (resolution=rules, ruleRefs=[wait-01], disambiguation=single_bound_rule) whose own provenance quote is 'First intoxication-related traffic/boating offense 610.130 First misdemeanor/ordinance DWI/BWI-type offense after 10 years'. An unrelated DWI ten-year rule is bound live to Missouri's Article XIV marijuana remedy. The route currently returns guidance_only so no money moves today, but the binding is wrong and is not a proposal." },
      { hold: "PA routes capable of selecting wait-05", reproduced: "YES_IN_DATA", detail: "PA wait-05 carries duration {value:70,unit:'years'} extracted from 'the person is 70 years of age or older'; the operative wait in that same sentence is the 10 years also stated there (and correctly carried by wait-06 and wait-16). No PA route currently selects wait-05 to a payment decision — the single committed PA binding deliberately omits wait-05, wait-06, wait-11 and wait-13, and path-e-age-70-expungement returns guidance_only — so the defect is present in data and not currently reachable to a wrong payment. It becomes reachable the moment a binding for path-e is authored from the profile's rule list." },
      { hold: "CA affected routes", reproduced: "YES", detail: "ambiguityReason() in the shared evaluator flags an explicit 'unknown' on ANY rendered prepayment question without reference to the selected route. All four ca_prop64_* questions are published to every California participant, and each one flips CA:tool-1-dismissal-set-aside from packet_ready_with_caution/paymentAllowed=true to needs_review/false. CA:tool-1 and CA:tool-4 are additionally inert across every timing bucket and allow payment while the case is still open." }
    ],
    additionalP0ClassFindingsNotInTheRegister: [
      "WI:adult-conviction-expungement-under-wis-stat-973-015 is the only route on a COMMITTED binding that allows payment at lt_1_year and while the case is still open. It is not in the seven-entry P0 register and should be added.",
      "IL, MS, ND, NE and VA each carry a route that allows payment at lt_1_year and is not named in the register.",
      "176 of 325 routes are timing-inert: the participant's timing answer changes no outcome on them at all."
    ],
    affectedManifestRows: rowsFor("CP-01").length,
    doNotImplementHere: true
  },
  {
    id: "CP-02", title: "Explicit waiting-rule bindings ready for application",
    owner: "Expungement.ai legal-logic owner",
    blocksRollout: true,
    statement: "The 75 routes for which a shard proposed a direct binding. A proposal is not a binding: all 75 still resolve through the provisional prose fallback at the candidate head, and none may be recommended active on the strength of the proposal.",
    routes: byDisposition("EXPLICIT_BINDING_PROPOSED"),
    count: byDisposition("EXPLICIT_BINDING_PROPOSED").length,
    applicationRule: "Before any proposal is applied, re-run the Phase 4 binding-integrity check against the proposed ruleRefs. 21 of the 43 bindings already committed carry a material duration-provenance defect, so the same extraction that produced them must not be trusted unaudited.",
    affectedManifestRows: rowsFor("CP-02").length,
    doNotImplementHere: true
  },
  {
    id: "CP-03", title: "Conditional bindings requiring a new fact or condition",
    owner: "Expungement.ai legal-logic owner with product review of the new question",
    blocksRollout: true,
    statement: "The 12 routes whose proposed binding depends on a participant fact the flow does not yet collect, or on a condition the binding schema must express through appliesWhen.",
    routes: byDisposition("EXPLICIT_CONDITIONAL_BINDING_PROPOSED"),
    count: byDisposition("EXPLICIT_CONDITIONAL_BINDING_PROPOSED").length,
    parityConstraint: "Any new screening question is a question-set change and must go through the screening-parity approved-delta mechanism with a named authorization, exactly as the Maryland pardon_signed_date delta did. It cannot be added by editing a state profile.",
    affectedManifestRows: rowsFor("CP-03").length,
    doNotImplementHere: true
  },
  {
    id: "CP-04", title: "Duration-extraction defects in committed bindings",
    owner: "Expungement.ai source-compilation owner",
    blocksRollout: true,
    statement: "21 of the 43 committed waiting-rule bindings bind a number that is not the operative wait. No bound rule id is missing from its jurisdiction and no binding's provenance duration disagrees with the profile — the defect is upstream, in what the number means.",
    totals: {
      bindingsChecked: INTEGRITY.totals.bindings,
      clean: INTEGRITY.totals.clean,
      withMaterialFindings: INTEGRITY.totals.withFindings,
      byResolution: INTEGRITY.totals.byResolution
    },
    defectClasses: {
      age_threshold_in_scope: "The number is an age, not a wait. PA wait-05 = 70 years from 'age 70 or older'; PA wait-16 and MO first-minor-in-possession are anchored on an age rather than on case resolution.",
      sentence_or_probation_term_in_scope: "The number is a sentence length or maximum penalty. PA wait-08/09/10/12 and MI wait-03/05 take a punishable-by term as a waiting period.",
      lookback_window_in_scope: "The number is a disqualifying lookback. MA wait-08 takes 'no adjudication during the preceding 3 years' as a 3-year wait.",
      disqualifying_window_in_scope: "The number bounds an objection or exclusion window, not eligibility timing. IA wait-01 (180 days to object), SC wait-01 (30 days to object), WY wait-16.",
      quote_states_no_duration: "The structured duration has no counterpart in the quote the binding carries, so nothing in the repository substantiates it. 24 occurrences.",
      multi_class_binding_collapsed_to_one_branch: "12 bindings name rules from several offence classes and collapse them with longest_bound_duration. That can never open a packet early, but it holds a class-2 misdemeanant behind a felony wait."
    },
    bindings: defectiveBindings,
    affectedManifestRows: rowsFor("CP-04").length,
    doNotImplementHere: true
  },
  {
    id: "CP-05", title: "Legal-owner decisions",
    owner: "Counsel",
    blocksRollout: true,
    statement: "The 170 routes the six shards classified LEGAL_OWNER_DECISION_REQUIRED. The candidate repository contains no deterministic authority resolving any of them, so Phase 4 does not reclassify one.",
    routes: byDisposition("LEGAL_OWNER_DECISION_REQUIRED"),
    count: byDisposition("LEGAL_OWNER_DECISION_REQUIRED").length,
    registerItems: Object.values(ISSUES.issues).filter((issue) => issue.verdict === "LEGAL_OWNER_DECISION_REQUIRED").map((issue) => ({ findingId: issue.findingId, title: issue.title })),
    affectedManifestRows: rowsFor("CP-05").length,
    doNotImplementHere: true
  },
  {
    id: "CP-06", title: "State-source reconstruction, including Indiana",
    owner: "Expungement.ai source-compilation owner",
    blocksRollout: true,
    statement: "Routes where the prose fallback finds no candidate rule at all, so no waiting period is executed and the failure is a configuration gap rather than a participant fact.",
    routes: BINDINGS.unresolvedAtBase?.keys ?? [],
    indiana: {
      routes: (BINDINGS.unresolvedAtBase?.keys ?? []).filter((key) => key.startsWith("IN:")),
      detail: "IN:conviction-expungement-with-records-marked-expunged and IN:juvenile-allegation-expungement report waiting_rule_not_executed with no candidate rule. Indiana also carries in_prosecutor_consent_confirmed as a route-scoped question published to every Indiana participant.",
      note: "Indiana's compiled profile needs its waiting-period rules reconstructed from source before any binding can be authored; there is nothing to bind to today."
    },
    idaho: { routes: (BINDINGS.unresolvedAtBase?.keys ?? []).filter((key) => key.startsWith("ID:")) },
    affectedManifestRows: rowsFor("CP-06").length,
    doNotImplementHere: true
  },
  {
    id: "CP-07", title: "County and court shared pipeline",
    owner: "Phase 2 shared-product owner (renderer, projection and parity gate) with the dataset owner",
    blocksRollout: true,
    statement: "The consolidated county/court correction. All six shards reported SHARED_PHASE2_BLOCKER and this pass confirmed every element of it.",
    verifiedClaims: COUNTY.claims,
    datasetCensus: COUNTY.totals,
    requiredWork: [
      "Shared public-profile projection: publish the controlled dataset to the served profile. Today nothing outside the state packs reads controlledDataBindings or controlled-filing-dataset, so a state profile edit cannot reach a participant.",
      "State-aware searchable county selector, sourced from the jurisdiction's own dataset rather than a global list.",
      "County-filtered court selector, so the court list narrows to the chosen county.",
      "Controlled ids on every option, so a stored answer is a reference and not a display string.",
      "Visible court type and location on each option, so a participant can tell two similarly named courts apart.",
      "An explicit 'I'm not sure' path that does not silently become a manual value.",
      "Manual raw values stored separately from the controlled id, in their own field.",
      "Manual values never treated as verified anywhere downstream — not in packet generation, not on the review page, not in filing instructions.",
      "The screening-parity approved-delta authorization for every question type or option change the selector needs. Retyping a compiled question without one is refused by scripts/verify-expungement-plain-language-values.mjs, which passes at this head.",
      "Maryland's hash-pinned profile: the MD approved delta carries four sha256 pins, so any MD question change must re-pin them under a named authorization.",
      "The jurisdictions with missing county/court facts, listed below, need source work before a selector can offer them anything."
    ],
    jurisdictionsWithNoDatasetAtAll: Object.entries(COUNTY.perJurisdiction).filter(([, value]) => !value.datasetPresent).map(([code]) => code).sort(),
    jurisdictionsWithAnEmptyDataset: Object.entries(COUNTY.perJurisdiction).filter(([, value]) => value.datasetPresent && value.courtDestinations === 0 && value.filingLocations === 0).map(([code]) => code).sort(),
    rendererGap: "src/components/expungement-ai/screening/QuestionField.tsx has eight arms — single_choice, yes_no_unsure, yes_no_prefer_not_to_say, multi_select, text, text_or_unknown, number_or_range, date_or_unknown. None combines a controlled option list with a separately stored manual value, which is exactly what the packet requires.",
    doNotImplementHere: true
  },
  {
    id: "CP-08", title: "Shared evaluator defects, including route-irrelevant ambiguity",
    owner: "Phase 2 shared-product owner",
    blocksRollout: true,
    statement: "Defects in src/lib/rcap-engine/evaluator.ts that are not any one state's to fix.",
    defects: [
      {
        id: "EV-01", severity: "P0",
        title: "ambiguityReason() is route-blind",
        detail: "It scans every rendered prepayment question for an explicit 'unknown' and never asks whether the question belongs to the selected pathway. 16 route-scoped questions were tested across five jurisdictions; all 16 change the terminal and 5 close a payable route that has nothing to do with them.",
        measured: AMBIGUITY.totals,
        boundedBy: `Cross-state escalation does NOT reproduce: all 51 jurisdictions publish 16 of other states' prefixed question ids, but answering one 'unknown' changed no outcome in any of the 51 (${CROSS.totals.jurisdictionsWhereAForeignAnswerChangesTheOutcome} jurisdictions affected). The defect is confined to a jurisdiction's own route-scoped questions.`
      },
      {
        id: "EV-02", severity: "P0",
        title: "The timing gate is bypassable",
        detail: `176 of 325 routes return an identical outcome for every published timing bucket, including 'still_open'. timingFromResolvedBucket is only reached from timingFromAnchor, which is only reached when a route resolves a waiting rule carrying a structured duration. A route whose rule never resolves never enters the gate, so the participant's timing answer is discarded and payment can open while the case is unresolved (${TIMING.totals.paymentWhileCaseStillOpen} routes).`
      },
      {
        id: "EV-03", severity: "P1",
        title: "A participant-supplied answer can override the binding table",
        detail: "The first branch of the waiting-rule resolver reads answers.waiting_rule_id and, if it names a rule the profile publishes, returns that rule and never consults the authored binding. waiting_rule_id is a published public question in at least California. An answer should not be able to select its own waiting period."
      },
      {
        id: "EV-04", severity: "P2",
        title: "TIMING_BUCKET_WINDOWS omits two published options",
        detail: "The window table covers seven buckets. The profiles publish nine, adding 'not_sure' and 'still_open', which are handled by earlier special cases in timingFromResolvedBucket but are absent from the table itself. A participant answering 'not_sure' did not settle within 24 convergence rounds in several jurisdictions during this sweep."
      },
      {
        id: "EV-05", severity: "P2",
        title: "selectPathway reads a contextOnly question",
        detail: "The frontend contract states a contextOnly question never selects the pathway; selectPathway's first branch reads possible_pathway_context, which is projected contextOnly. Registered as EXPAI-FA-023 and still reproducible."
      }
    ],
    affectedManifestRows: rowsFor("CP-08").length,
    doNotImplementHere: true
  },
  {
    id: "CP-09", title: "Stale worker and reachability evidence",
    owner: "RCAP worker-publication owner and the flow-audit artifact owner",
    blocksRollout: false,
    blocksHostedAcceptance: true,
    statement: "Evidence that no longer describes the tree it was taken from. None of it changes a legal outcome; all of it blocks hosted acceptance or leaves a verifier red.",
    items: [
      {
        check: "scripts/verify-rcap-image-input-fingerprint.mjs",
        exactFailure: "src/ at HEAD is 1efde49aa966…, fingerprint records bded33ec9863…; HEAD differs from the fingerprint base 5ac0d8d6 on 129 image-input paths.",
        candidateCaused: "PARTIALLY — the fingerprint base predates both Phase 2 and Phase 3, so it was already stale. The candidate adds 103 paths to the drift (86 state packs, 17 compiled profiles).",
        correctionOwner: "worker-publication owner",
        blocksHostedAcceptance: true, blocksRollout: false
      },
      {
        check: "scripts/verify-rcap-worker-image-revision.mjs",
        exactFailure: "WORKER_TAG must be a full 40-character commit SHA — the variable is unset in this environment.",
        candidateCaused: "NO — a missing environment input, not a tree defect.",
        correctionOwner: "hosted environment owner", blocksHostedAcceptance: true, blocksRollout: false
      },
      {
        check: "scripts/generate-rcap-authority-ledger.mjs --check",
        exactFailure: "none — 'Ledger current at version 1. No drift.'",
        candidateCaused: "NO",
        note: "Independently measured GREEN at the candidate head. The 'stale RCAP witness ledger' characterisation does not hold for the authority ledger at this head; if a different ledger is meant, it is not reachable by any verifier name in this tree.",
        correctionOwner: "n/a", blocksHostedAcceptance: false, blocksRollout: false
      },
      {
        check: "FA-16 — every issue's affected flow IDs exist in the manifest",
        exactFailure: "7 unknown flow id(s) referenced.",
        candidateCaused: "NO — all seven are retired synthetic probe hashes (FL, IA x2, PA x2, SD x2), every one an _probe_inside_waiting_period or _probe_state_exclusion_selected row. No real remedy is referenced. The check is red in the committed candidate tree only because the candidate committed the correctly regenerated manifest; it is red identically at PHASE2_PRODUCT_HEAD once the same generators run there.",
        correctionOwner: "flow-audit artifact owner — re-point the issue register at current probe ids",
        blocksHostedAcceptance: false, blocksRollout: false
      },
      {
        check: "FA-23 — every flow's recorded fixture reproduces its recorded terminal",
        exactFailure: "593 reproduce; 31 do not (AZ, CT, DC, FL, GA, IA, MI, MT, NM, OK, PA x10, SC, SD, UT x8, VT).",
        candidateCaused: "NO — the same 31 are recorded in data/expungement-ai/phase2/post-implementation-comparison.json#staleWitnessFixtures at the Phase 2 head. Red at the candidate for the same regeneration reason as FA-16.",
        correctionOwner: "flow-audit artifact owner — regenerate the witness fixtures",
        blocksHostedAcceptance: false, blocksRollout: false
      },
      {
        check: "FA-17 — no product behaviour file changed",
        exactFailure: "338 changed path(s); 179 outside the audit's owned paths (75 at the untouched Phase 2 base).",
        candidateCaused: "PARTIALLY — the delta is 104 paths: 86 state-pack files, 17 compiled profiles and 1 Phase 3 script. Every compiled-profile change was verified additive-only: each adds exactly the top-level controlledDataBindings key and changes no question, pathway, waiting rule, exclusion rule, ordered decision rule or profile version. Every state-pack index change is a single added export line, zero deletions. Nothing outside the state packs reads either.",
        correctionOwner: "flow-audit artifact owner — widen the FA-17 allowlist to cover authorised state-scoped shard work, or record the exemption",
        blocksHostedAcceptance: false, blocksRollout: false
      },
      {
        check: "FA-21 — every generated artifact is byte-reproducible",
        exactFailure: "branch-coverage.json, ui-reachability.json, static-findings.json and shard-assignment.json are stale.",
        candidateCaused: "NO — five artifacts are stale at the untouched Phase 2 base; the candidate regenerated two of them, leaving four.",
        correctionOwner: "flow-audit artifact owner",
        blocksHostedAcceptance: false, blocksRollout: false
      }
    ],
    doNotImplementHere: true
  },
  {
    id: "CP-10", title: "Hosted environment, browser, payment and sponsorship acceptance",
    owner: "Roger, as the only party who can authorize a staging environment",
    blocksRollout: true,
    statement: "The formal Phase 4 exit gate requires paid, sponsored and discount paths, duplicate payment and entitlement, privacy and cross-user behaviour to be verified. None of it is verifiable here. These are ENVIRONMENT_BLOCKED, not approved.",
    exactMissingEnvironmentInputs: [
      "A non-production Vercel Preview deployment. hosted-acceptance-record.json records deploymentUrl=null and states no Preview was created and none was found to reuse. This pass found none either.",
      "A staging Supabase project carrying migrations 49 through 54. data/rcap-staging-action.json records status='prepared_queued_not_authorized' and blocker ENV-007: applying the migration sequence is queued and not authorized.",
      "Synthetic authenticated users. environment-blockers.json#fixtureCreation records attempted=false, authorized=false: four synthetic consumers, one synthetic partner, four access-code states and 100 packet credits are all rows in a Supabase project this session cannot write.",
      "A Playwright browser matching the pinned driver. The installed CLI is Playwright 1.60.0 and resolves chromium build v1223; /opt/pw-browsers carries chromium-1194 and chromium_headless_shell-1194 only. Confirmed once and not retried.",
      "Stripe test-mode credentials and a webhook endpoint. No STRIPE_* value is present in this environment."
    ],
    consequentlyUnverified: [
      "paid checkout", "sponsored checkout", "discount-code application", "duplicate payment and entitlement",
      "save and resume", "privacy and cross-user isolation", "mobile rendering", "the legacy Briefcase loop",
      "raw review-value rendering on the accuracy review page"
    ],
    evidenceRule: "No static fixture, self-signed payload or replayed JSON in this repository may be represented as a Stripe-delivered test-webhook result. This pass made no payment call of any kind.",
    notRetried: [
      "the local next-dev \"Loading your state's questions…\" condition",
      "the Playwright 1223 versus 1194 browser mismatch",
      "the missing authenticated staging environment"
    ],
    affectedManifestRows: rowsFor("CP-10").length + MATRIX.rows.filter((row) => row.verdict === "ENVIRONMENT_BLOCKED").length,
    doNotImplementHere: true
  }
];

const out = {
  schemaVersion: "expai-phase4-correction-packets/v1",
  candidateSha: gitSha("HEAD"),
  contract: "Specifications only. Phase 4 implements none of these and repaired no finding.",
  totals: { packets: packets.length, blockingRollout: packets.filter((packet) => packet.blocksRollout).length },
  packets
};
writeArtifact("data/expungement-ai/flow-audit/phase4/correction-packets.json", out);
console.log(JSON.stringify(out.totals, null, 1));
for (const packet of packets) console.log(`${packet.id} ${packet.blocksRollout ? "BLOCKS" : "non-blocking"} — ${packet.title}`);
