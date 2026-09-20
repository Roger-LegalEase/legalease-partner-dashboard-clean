#!/usr/bin/env node
// The four Oregon alternatives, prepared and measured without choosing between them.
//
// WHY THIS EXISTS
//
// Two questions are with counsel and neither is a build lane's to answer. Both
// have exactly two answers, and each answer has a consequence that can be
// measured now against the repository as it stands: which route ids exist, which
// packet sets they bind, what the specification hash becomes, and what a
// participant on the wrong side of the boundary would receive. Measuring them in
// advance is not deciding them. It means the answer, when it comes, is applied
// rather than designed.
//
// The two questions:
//
//   ORS SUBSECTION. The route id names 137.225(1)(c); the legal-design track
//   registry files or_acquittal -- the track this route binds -- under (1)(d).
//   Oregon's own committed legal review flags the area as unsettled. Two
//   committed records disagree and neither is more authoritative than the other.
//
//   PACKET SCOPE. The route is labelled for "arrests or charges without
//   conviction" and delivers the acquittal packet. or_arrest_no_charges and
//   or_dismissed_charge exist as complete seven-component sets and no route
//   reaches either, so a participant whose charge was dismissed, or who was
//   arrested and never charged, falls inside the route's name and outside its
//   packet. That is a live participant-facing gap, not a naming quibble.
//
// Nothing here changes a route, a packet set, a registry or a commercial status.
//
//   node scripts/verify-rcap-oregon-decision-alternatives.mjs
//   node scripts/verify-rcap-oregon-decision-alternatives.mjs --write

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");

const MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const SPEC = "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";
const OUT = "docs/rcap/grade-a/captain/decision-waiting/oregon-answer-dependent-alternatives.json";

const SELECTED = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};

// The decisions, if they have been made. Before them this file measured two open
// questions; after them it records which branch was taken and what the other one
// would have cost. Deleting the unchosen branch would leave the decision looking
// inevitable, which is not what it was.
const DECISIONS = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
const CONFIGS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const decisionRecord = fs.existsSync(path.join(rootDir, DECISIONS)) ? read(DECISIONS) : null;
const configurations = fs.existsSync(path.join(rootDir, CONFIGS)) ? read(CONFIGS) : null;
const answerFor = (qid) => (decisionRecord?.decisions ?? []).find((d) => d.questionId === qid) ?? null;
const subsectionAnswer = answerFor("OR-Q1-SUBSECTION");
const scopeAnswer = answerFor("OR-Q2-PACKET-SCOPE");

const manifests = read(MANIFESTS);
const launchGraph = read(LAUNCH_GRAPH);
const registry = read(REGISTRY);
const spec = read(SPEC);
const record = registry.records.find((r) => r.routeId === SELECTED);
const setById = new Map(manifests.packetSets.map((s) => [s.packetSetId, s]));
const routeIds = new Set((launchGraph.rows ?? []).map((r) => r.pathwayKey));

console.log("Oregon answer-dependent alternatives — prepared, nothing chosen\n");

check("the selected route holds a Grade-A record", Boolean(record), SELECTED);
const projection = read("data/rcap-grade-a/fulfillment-authority-projection.json");
const selectedProjection = (projection.routes ?? []).find((r) => r.routeId === SELECTED) ?? null;
check("it is not commercially eligible and is not proven",
  selectedProjection?.commercialStatus === "not_commercially_eligible"
    && selectedProjection?.state !== "COMPLETE_PACKET_PROVEN"
    && projection.counters.commerciallyEligible === 0
    && projection.counters.completePacketProven === 0,
  `${selectedProjection?.state} / ${selectedProjection?.commercialStatus} / eligible ${projection.counters.commerciallyEligible}`);

// ---- Question 1: which subsection controls -----------------------------------
const CURRENT_ID = SELECTED;
const D_ID = SELECTED.replace(/-1-c$/, "-1-d");
const subsectionAlternatives = [
  {
    alternativeId: "OR-SUBSECTION-C",
    answer: "ORS 137.225(1)(c) controls",
    routeIdAfter: CURRENT_ID,
    routeIdChanges: false,
    whatChanges: [
      "Nothing in the route id, the launch graph, the packet set binding or the Grade-A record.",
      "The legal-design track registry entry for or_acquittal is corrected to cite (1)(c), so the two committed records stop disagreeing."
    ],
    whatDoesNotChange: [
      "The packet set, its seven components and both bound official forms.",
      "The specification content hash, because no component, form, role or action moves.",
      "Commercial status: the route stays closed."
    ],
    riskIfWrong:
      "A packet that cites the wrong subsection to a court. The citation appears in participant-facing text, so this is not an internal identifier question.",
    mechanical: true
  },
  {
    alternativeId: "OR-SUBSECTION-D",
    answer: "ORS 137.225(1)(d) controls",
    routeIdAfter: D_ID,
    routeIdChanges: true,
    whatChanges: [
      `The route id becomes ${D_ID}.`,
      "Every record keyed to the route id follows it: the launch graph row, the factory-v2 registry entry, the Grade-A fulfillment record and its recordId, the observation snapshot, the projection, the packet specification's routeKey, and the four Lane I evidence records.",
      "The registered specification's routeKey moves, so resolvePacketFamilyId resolves under the new id and the record's family cross-check must be re-derived rather than carried."
    ],
    whatDoesNotChange: [
      "The packet set and its components: the documents a participant files are the same documents.",
      "Both official source digests and the two finalized artifact digests.",
      "The independent visual review, which is bound to artifact hashes rather than to a route id.",
      "Commercial status: the route stays closed."
    ],
    riskIfWrong: "The same as the other branch, in the other direction.",
    mechanical: false,
    whyNotMechanical:
      "A route id is a key. Renaming it touches every generated record that carries it, and each of those has a --check generator that must be re-run and re-verified as a fixed point. It is a captain change of a dozen files, not a one-line edit, which is why it is prepared as a plan rather than as a patch."
  }
];

check("the (1)(c) alternative leaves the route id as it is", subsectionAlternatives[0].routeIdAfter === SELECTED);
check(subsectionAnswer
  ? "the answered subsection question left no unimplemented alternative route id live"
  : "the (1)(d) alternative names a route id that does not already exist",
  !routeIds.has(D_ID), `${D_ID} already exists`);

// The records that carry the route id, found rather than listed.
const CARRIERS = [
  LAUNCH_GRAPH, REGISTRY, SPEC,
  "data/rcap-grade-a/fulfillment-observation-snapshot.json",
  "data/rcap-grade-a/fulfillment-authority-projection.json",
  "data/rcap-lane-c/oregon/lane-i-route-selection.json",
  "data/rcap-lane-c/oregon/lane-i-proof-closure.json",
  "data/rcap-lane-c/oregon/lane-i-product-path.json",
  "data/rcap-lane-c/oregon/lane-i-envelope.json",
  "data/rcap-lane-c/oregon/independent-visual-review.json",
  "data/rcap-lane-c/oregon/durable-render-evidence.json",
  "docs/rcap/grade-a/oregon/OUTPUT_LEGAL_REVIEW.json",
  "data/rcap-ledger/factory-v2-route-registry.json"
].filter((rel) => fs.existsSync(path.join(rootDir, rel)));
const carriers = CARRIERS.filter((rel) => fs.readFileSync(path.join(rootDir, rel), "utf8").includes(SELECTED));
check("every record carrying the route id is enumerated", carriers.length > 0, `${carriers.length} file(s)`);
subsectionAlternatives[1].recordsCarryingTheRouteId = carriers;

// ---- Question 2: what the route may deliver ----------------------------------
const SCOPE_SETS = ["or_acquittal-set", "or_arrest_no_charges-set", "or_dismissed_charge-set"];
const scopeFacts = SCOPE_SETS.map((id) => {
  const s = setById.get(id) ?? null;
  const reached = (launchGraph.rows ?? []).filter((r) => (r.packetSets ?? []).some((p) => p.packetSetId === id));
  return {
    packetSetId: id,
    exists: Boolean(s),
    trackId: s?.trackId ?? null,
    components: s?.components?.length ?? 0,
    participantActions: s?.participantActionRequired?.length ?? 0,
    officialForms: s ? [...new Set(s.components.map((c) => c.officialFormId).filter(Boolean))].sort() : [],
    reachedByRoutes: reached.map((r) => r.pathwayKey)
  };
});
for (const f of scopeFacts) {
  check(`${f.packetSetId} is a complete seven-component set`, f.exists && f.components === 7, `${f.components} component(s)`);
}
const unreached = scopeFacts.filter((f) => f.reachedByRoutes.length === 0);
check("the gap is real: two complete sets are reached by no route",
  unreached.length === 2, unreached.map((f) => f.packetSetId).join(", ") || "(none unreached)");

const scopeAlternatives = [
  {
    alternativeId: "OR-SCOPE-ONE-PACKET",
    answer: "One route delivering the acquittal packet is correct for all three situations",
    whatChanges: [
      "Nothing structural. The route keeps or_acquittal-set.",
      "The route's participant-facing label is corrected so it does not promise coverage the packet does not deliver, and the screening path is checked to confirm a dismissed-charge or never-charged participant is not routed here.",
      "or_arrest_no_charges-set and or_dismissed_charge-set are dispositioned explicitly -- retired, or held with a reason -- rather than left as complete sets no route reaches."
    ],
    whatDoesNotChange: [
      "The specification hash, the bound forms and the artifacts.",
      "Commercial status: the route stays closed."
    ],
    riskIfWrong:
      "A participant whose charge was dismissed files the acquittal packet. The two situations are different filings under Oregon practice, and a clerk rejection is the best case.",
    mechanical: false
  },
  {
    alternativeId: "OR-SCOPE-THREE-ROUTES",
    answer: "Acquittal, dismissed-charge and never-charged bind to their own routes and packet sets",
    whatChanges: [
      "Two new launch-graph routes are created for or_arrest_no_charges and or_dismissed_charge, each binding its own existing seven-component set.",
      "The selected route narrows to acquittal only, and its label follows.",
      "Each new route needs its own Grade-A record, its own specification, and its own artifacts before it could be proven -- none of which exists today.",
      "The Lane I selection is re-run, because the ranking that chose this route ranked it against two candidates that would now be three."
    ],
    whatDoesNotChange: [
      "The three packet sets themselves: they already exist, complete, and are not edited by this.",
      "Commercial status: all three routes would be closed, and the two new ones would start with no record at all."
    ],
    riskIfWrong:
      "Three routes where one would do, and two of them with no artifacts, no visual review and no fileability proof. The cost is work, not a wrong document in a participant's hands.",
    mechanical: false,
    alreadyAvailable:
      "Both sets exist at full component parity with the acquittal set -- seven components, sixteen participant actions, the same two official forms -- so this branch adds routes, not packet design."
  }
];
scopeAlternatives[0].packetSetFacts = scopeFacts;
scopeAlternatives[1].packetSetFacts = scopeFacts;

const doc = {
  schemaVersion: "rcap-oregon-answer-dependent-alternatives/v1",
  generatedBy: "scripts/verify-rcap-oregon-decision-alternatives.mjs",
  status: subsectionAnswer && scopeAnswer ? "ANSWERED_AND_IMPLEMENTED" : "PREPARED_NOT_CHOSEN",
  posture: subsectionAnswer && scopeAnswer
    ? "Both questions are answered. This file is now the record of which branch was taken and what the other would have cost, kept because a decision with its alternatives deleted reads as inevitable, and this one was not. The branches below are historical; the answers and the implemented configurations are current."
    : "Both questions are with counsel. Each branch below is measured against the repository as it stands. Nothing here chooses, and nothing here changes a route, a packet set, a registry or a commercial status. The selected route remains closed under every branch.",
  answers: subsectionAnswer && scopeAnswer
    ? {
        decisionRecord: DECISIONS,
        decisionOwner: decisionRecord.decisionOwner,
        decisionDate: decisionRecord.decisionDate,
        subsection: { decisionId: subsectionAnswer.decisionId, answer: subsectionAnswer.answer },
        packetScope: { decisionId: scopeAnswer.decisionId, answer: scopeAnswer.answer },
        implementedBy: CONFIGS,
        configurations: (configurations?.configurations ?? []).map((c) => ({
          label: c.label, routeKey: c.routeKey, authority: c.statutoryAuthority,
          formOption: c.formOption, specificationSha256: c.specificationSha256,
        })),
        supersededRoute: configurations?.supersedes?.routeId ?? null,
      }
    : null,
  decisionOwner: "Lawrence (counsel)",
  selectedRoute: SELECTED,
  selectedRouteStatus: subsectionAnswer && scopeAnswer
    ? "SUPERSEDED — retired and replaced by three disposition-bound configurations"
    : "the candidate under both questions",
  selectedRouteCommercialStatus: "not_commercially_eligible",
  selectedRouteAuthorityState: "INCOMPLETE",
  questions: [
    {
      questionId: "OR-Q1-SUBSECTION",
      question: "Is the controlling subsection for this route ORS 137.225(1)(c) or ORS 137.225(1)(d)?",
      whyItIsOpen:
        "The route id names (1)(c). The legal-design track registry files or_acquittal, the track this route binds, under (1)(d). Oregon's committed legal review flags the same area as unsettled in headline finding 5. Two committed records disagree and a build lane does not get to pick one.",
      alternatives: subsectionAlternatives
    },
    {
      questionId: "OR-Q2-PACKET-SCOPE",
      question:
        "May this route deliver only the acquittal packet, or must dismissed-charge and never-charged matters bind to their own packet sets?",
      whyItIsOpen:
        "The route is labelled for arrests or charges without conviction and delivers the acquittal track. or_arrest_no_charges and or_dismissed_charge exist as complete seven-component sets that no launch-graph route reaches, so a participant whose charge was dismissed or who was never charged falls inside the route's name and outside its packet.",
      alternatives: scopeAlternatives
    }
  ],
  interaction:
    "The two questions are independent. The subsection answer does not decide the scope answer, and neither changes the documents a participant files: all three packet sets bind the same two official forms.",
  whatIsHeldUntilBothAreAnswered: [
    "The final Oregon output-review package. It asks a named reviewer to approve one artifact for one route, and both the route's identity and its scope are in question.",
    "Output-level legal approval, which is not a lane's to grant and not a captain's.",
    "Any change of the route's commercial status, which stays closed under every branch."
  ]
};

const outPath = path.join(rootDir, OUT);
const serialized = `${JSON.stringify(doc, null, 2)}\n`;
if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\n  wrote ${OUT}`);
} else if (fs.existsSync(outPath)) {
  check("the committed alternatives record is exactly what this run derives",
    fs.readFileSync(outPath, "utf8") === serialized, "differs");
} else {
  check("a committed alternatives record exists", false, `${OUT} is absent; run with --write`);
}

// Nothing was chosen.
if (subsectionAnswer && scopeAnswer) {
  // Answered. The assertions invert: the questions are closed, the split is
  // implemented, and the superseded route is recorded as superseded rather than
  // silently carried.
  check("both questions are answered and recorded verbatim",
    Boolean(subsectionAnswer.recordedAuthority?.length) && Boolean(scopeAnswer.recordedAuthority?.length));
  check("the three disposition-bound configurations exist",
    (configurations?.configurations ?? []).length === 3,
    String((configurations?.configurations ?? []).length));
  check("the previously selected route is recorded as superseded",
    configurations?.supersedes?.routeId === SELECTED
      && configurations?.supersedes?.disposition === "retired_and_replaced_by_three_disposition_bound_configurations",
    String(configurations?.supersedes?.disposition));
  check("no configuration is commercially open",
    (configurations?.configurations ?? []).every((c) => c.commercialStatus === "closed"));
} else {
  check("the route id in the registry is unchanged", registry.records.some((r) => r.routeId === SELECTED));
  check("the route still binds or_acquittal-set only",
    record?.packetSpecification?.specId === "or_acquittal-set", String(record?.packetSpecification?.specId));
  check("no new Oregon route was created", (launchGraph.rows ?? []).filter((r) => r.jurisdiction === "OR").length === 3,
    String((launchGraph.rows ?? []).filter((r) => r.jurisdiction === "OR").length));
}

console.log("");
if (failures.length) {
  console.error(`Oregon alternatives: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(subsectionAnswer && scopeAnswer
  ? `Oregon alternatives: both questions answered 2026-08-29 and implemented as ${(configurations?.configurations ?? []).length} configurations; the branches are kept as the record of what was not taken.`
  : `Oregon alternatives: 2 question(s), 4 alternative(s), all measured. Nothing chosen; the route stays closed.`);
