// Nevada guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Nevada is not enabled, the
// assigned track has a governing specification and matches the adopted packet
// set and manifest in component identity, order and requirement, the route
// renders deterministically into one final guidance PDF with no blank page and
// no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the
// node the participant is standing on, no artifact carries petition structure
// or a submission instruction, and every boundary the corrected design draws
// is stated rather than papered over.
//
// This is a reissued assignment, so the first thing the verifier pins is the
// scope itself: exactly `nv_seal_deferred`, and nothing from the old
// three-track assignment. `nv_seal_probation_family` and
// `nv_repository_removal` left this lane for custom pleading, so their
// presence in this module — or in the shared registry under this module's
// hand — is a failure rather than a bonus.
//
// Six rules here are Nevada's own:
//
//   - **There is no participant filing and the section provides none.**
//     NRS 176.211(6) puts the sealing on the district court's own motion. No
//     petition, application, request or proposed order may be generated, and
//     the ordinary NRS 179.245 petition is expressly unavailable for a case
//     under this section — which makes offering one worse than doing nothing.
//     The design's own `rules.filing` is asserted, not just the copy.
//   - **Record sealing, never expungement.** The State says sealing is not
//     expungement because it does not authorise destruction. The correction is
//     required copy; every affirmative use of the other word is prohibited.
//     The rule is written as a list of affirmative uses precisely so the
//     sentence making the correction does not trip it.
//   - **Nothing is claimed about the Division or the prosecutor.** Their right
//     to petition for good cause not to seal is required copy, because it is
//     the section's only adversarial step. Any statement that either will,
//     has, or will not object is prohibited.
//   - **No court is described as having acted, and no date is given.** The
//     statutory "shall order sealed" is required; a promise that a court will
//     seal a particular record, or will do it by some time, is prohibited.
//     There is no waiting period on this route and the sheet says so, which is
//     not the same as a timetable.
//   - **The § 176.211(7) exclusion withholds the sealing only.** The discharge
//     and dismissal stand. A sheet that implied the whole route fails would be
//     wrong in the participant's favour and still wrong, so both halves are
//     required.
//   - **Sealed is not gone, and Nevada does not reach past its own line.**
//     NRS 179.285 with 179.295 and 179.301 are required together; firearm
//     rights and the federal/out-of-state limit are required; and no
//     immigration effect may be asserted.
//
// Per-sheet assertions carry more weight here than a whole-packet sweep. Four
// components render into one packet, so a whole-packet check cannot tell which
// sheet a sentence landed on, and a constant that reads correctly on the
// explanation sheet can read as invented law on the routing sheet. Each
// component is therefore rendered and read on its own. Every pattern in
// `FORBIDDEN_PER_COMPONENT` is body copy: none of them occurs in `NV_SOURCES`
// or `NV_CANNOT_PERFORM`, which render on all four sheets.
//
// Money: the design supplies no figure, so no currency figure may appear. The
// NRS 179.245(9) waiver is a real entitlement on the petition route and the
// design requires it be surfaced wherever a fee is mentioned — so it is
// required copy, and the sentence placing it on the other route is required
// too, because a waiver mentioned without its boundary reads as one available
// here.
//
// Why there is no regression variant: the adopted packet set makes all four
// components required and no template interpolates a participant answer, so a
// second fixture would render byte-for-byte the same packet. The branches that
// matter are typed stops, and all thirteen are exercised below.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const pg = await import("@/lib/rcap/packets/engines/process-guidance");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  NEVADA_GUIDANCE_TRACKS,
  NEVADA_GUIDANCE_TEMPLATES,
  NV_RECORD_JURISDICTIONS,
  NV_COURT_LEVELS,
  NV_DISMISSAL_TYPES,
  NV_RECORD_STATUS,
  NV_PARTICIPANT_GOAL,
  NevadaGuidanceStopError,
  NevadaRouteMismatchError,
  NevadaBranchError,
  deriveNevadaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/nevada/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/nevada-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["nv_seal_deferred"];

/** The two tracks the reissue moved into the custom-pleading lane. */
const NOT_THIS_LANE = ["nv_seal_probation_family", "nv_repository_removal"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NV" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Nevada track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nv-")).length === 0,
  "Nevada templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Nevada track in the shared registry, no Nevada template in the shared guidance pack.");

for (const t of NEVADA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEVADA_GUIDANCE_TEMPLATES);

// 2. Exactly the reissued track, and nothing from the retired assignment.
ok(
  JSON.stringify(NEVADA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the reissued assignment."
);
for (const trackId of NOT_THIS_LANE) {
  ok(
    !NEVADA_GUIDANCE_TRACKS.some((t) => t.trackId === trackId),
    `${trackId} left this lane for custom pleading and must not be implemented here.`
  );
  ok(
    !JSON.stringify(NEVADA_GUIDANCE_TEMPLATES).includes(trackId),
    `${trackId} is named inside a guidance template; the old three-track assignment is retired.`
  );
}
for (const track of NEVADA_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.outputStrategy === "process_guidance", `${track.trackId} is not process guidance.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${track.trackId} claims visual approval.`);
  ok(
    computeRuntimeStatus({
      statuses: track.statuses,
      sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled,
      outputStrategy: track.outputStrategy
    }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`
  );
}
note(
  `2. Scope: exactly ${ASSIGNED.length} assigned track, runtime_disabled and awaiting counsel; neither retired track implemented.`
);

// 3. Every component specified and matching the adopted packet set.
const spec = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8")
);
const design = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8")
);
const manifests = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-packet-set-manifests.json"), "utf8")
);
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
let componentCount = 0;
let conditionalCount = 0;
for (const track of NEVADA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  ok(
    (designed?.legalDesignBlockers ?? []).length === 0,
    `${track.trackId}: a legal-design blocker is back on this track — the corrected design retired them.`
  );
  const manifest = manifests.packetSets.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no adopted packet-set manifest.`);
  ok(
    manifest?.packetSetId === track.packetSet.packetSetId,
    `${track.trackId}: packet set id differs from the adopted manifest.`
  );

  const designedComponents = designed?.packetSet?.components ?? [];
  ok(
    designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
  );
  ok(
    JSON.stringify((manifest?.components ?? []).map((c) => c.componentId)) ===
      JSON.stringify(track.packetSet.components.map((c) => c.componentId)),
    `${track.trackId}: component identity or order differs from the adopted manifest.`
  );
  for (const [index, c] of track.packetSet.components.entries()) {
    const match = designedComponents[index];
    ok(
      match?.componentId === c.componentId,
      `${c.componentId}: out of the design's component identity or order.`
    );
    ok(
      match?.requirement === c.requirement,
      `${c.componentId}: requirement differs from the design (${match?.requirement} vs ${c.requirement}).`
    );
    if (c.requirement === "conditional") {
      conditionalCount += 1;
      ok(Boolean(c.conditionKey), `${c.componentId}: conditional component carries no condition key.`);
    }
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(
      c.sourcePath === null && c.sourceSha256 === null,
      `${c.componentId}: guidance names an official source.`
    );
    componentCount += 1;
  }
  for (const c of designedComponents) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
  // The corrected design's own findings, asserted rather than trusted.
  ok(
    /Nothing is filed by the participant and nothing can be/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that nothing is filed and nothing can be.`
  );
  ok(
    /176\.211\(6\)/.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer places the sealing on the court's own motion under § 176.211(6).`
  );
  ok(
    /^not applicable/i.test((designed?.rules?.participantSignature ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  ok(
    /^none/i.test((designed?.rules?.fees ?? "").trim()),
    `${track.trackId}: the design now records a fee on a route with no filing.`
  );
  ok(
    /176\.211\(8\)/.test(designed?.rules?.notice ?? ""),
    `${track.trackId}: the design no longer records the agency compliance-reporting duty.`
  );
  ok(
    designed?.destination?.kind === "court",
    `${track.trackId}: the design no longer records the court as the acting body.`
  );
}
ok(componentCount === 4, `expected the design's 4 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Nevada design has no conditional component, found ${conditionalCount}.`);
const used = new Set(NEVADA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(NEVADA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} track, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound, no design blocker outstanding.`
);

for (const [id, template] of Object.entries(NEVADA_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Clark County participant whose district-court case was
// dismissed after a completed deferred judgment, with no objection filed, no
// category question, and no record check yet.
const BASE = {
  recordJurisdiction: "nevada_state",
  courtLevel: "district_court",
  dismissalType: "dismissed_after_completing_a_deferred_judgment",
  elderOrVulnerablePersonCharge: "no",
  divisionOrProsecutorObjected: "no",
  hasOffenceCategoryQuestion: "no",
  participantGoal: "background_checks_and_employment",
  immigrationExposure: "no",
  recordsInMoreThanOneCourtOrCounty: "no",
  recordStatus: "not_yet_checked",
  completionAndDismissalDates: "programme completed 4 March 2025; dismissed 21 March 2025",
  countyOfCase: "Clark County"
};

const NEG = [
  ["nv_seal_deferred", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_nevada_state_record"],
  ["nv_seal_deferred", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_nevada_state_record"],
  ["nv_seal_deferred", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_nevada_state_record"],
  ["nv_seal_deferred", { recordJurisdiction: "military" }, "mismatch", "record_is_not_a_nevada_state_record"],
  ["nv_seal_deferred", { courtLevel: "justice_court" }, "mismatch", "case_was_not_in_a_nevada_district_court"],
  ["nv_seal_deferred", { courtLevel: "municipal_court" }, "mismatch", "case_was_not_in_a_nevada_district_court"],
  [
    "nv_seal_deferred",
    { courtLevel: "cannot_tell" },
    "stop",
    "which_court_handled_the_case_cannot_be_established"
  ],
  [
    "nv_seal_deferred",
    { dismissalType: "dismissed_outright" },
    "mismatch",
    "dismissal_was_ordinary_rather_than_after_a_deferred_judgment"
  ],
  [
    "nv_seal_deferred",
    { dismissalType: "deferral_terminated_and_convicted" },
    "mismatch",
    "deferral_was_terminated_and_a_judgment_of_conviction_was_entered"
  ],
  [
    "nv_seal_deferred",
    { dismissalType: "cannot_tell" },
    "stop",
    "whether_the_dismissal_followed_a_deferred_judgment_cannot_be_established"
  ],
  [
    "nv_seal_deferred",
    { elderOrVulnerablePersonCharge: "yes" },
    "stop",
    "charge_was_an_older_or_vulnerable_person_offence"
  ],
  [
    "nv_seal_deferred",
    { divisionOrProsecutorObjected: "yes" },
    "stop",
    "division_or_prosecutor_has_petitioned_the_court_not_to_seal"
  ],
  [
    "nv_seal_deferred",
    { hasOffenceCategoryQuestion: "yes" },
    "stop",
    "offence_category_question_requires_legal_classification"
  ],
  [
    "nv_seal_deferred",
    { participantGoal: "firearm_rights" },
    "stop",
    "firearm_rights_are_the_goal_and_sealing_does_not_restore_them"
  ],
  ["nv_seal_deferred", { immigrationExposure: "yes" }, "stop", "immigration_exposure_in_play"],
  [
    "nv_seal_deferred",
    { recordsInMoreThanOneCourtOrCounty: "yes" },
    "stop",
    "records_are_in_more_than_one_court_or_county"
  ],
  [
    "nv_seal_deferred",
    { recordStatus: "still_shows" },
    "stop",
    "record_still_appears_after_the_discharge_and_dismissal"
  ],
  // Honest non-stopping answers still render.
  ["nv_seal_deferred", { participantGoal: "housing_or_licensing" }, "generated"],
  ["nv_seal_deferred", { recordStatus: "no_longer_shows" }, "generated"],
  // Closed lists fail closed rather than falling through.
  ["nv_seal_deferred", { recordJurisdiction: "" }, "branch"],
  ["nv_seal_deferred", { recordJurisdiction: "nevada" }, "branch"],
  ["nv_seal_deferred", { courtLevel: "district" }, "branch"],
  ["nv_seal_deferred", { courtLevel: "" }, "branch"],
  ["nv_seal_deferred", { dismissalType: "dismissed" }, "branch"],
  ["nv_seal_deferred", { elderOrVulnerablePersonCharge: "unsure" }, "branch"],
  ["nv_seal_deferred", { divisionOrProsecutorObjected: "maybe" }, "branch"],
  ["nv_seal_deferred", { hasOffenceCategoryQuestion: "possibly" }, "branch"],
  ["nv_seal_deferred", { participantGoal: "guns" }, "branch"],
  ["nv_seal_deferred", { immigrationExposure: "later" }, "branch"],
  ["nv_seal_deferred", { recordsInMoreThanOneCourtOrCounty: "one" }, "branch"],
  ["nv_seal_deferred", { recordStatus: "cleared" }, "branch"]
];

/**
 * How this route names itself when a stop points elsewhere.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * another node would use to name this route rather than a generic
 * self-referential word.
 */
const SELF_MARKERS = {
  nv_seal_deferred:
    /the deferred[- ]judgment sealing route|the 176\.211 route|the deferred[- ]judgment route/i
};

/**
 * The stops whose honesty the design turns on.
 *
 * Each carries a fact a later edit could drop while leaving the stop id and
 * the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  charge_was_an_older_or_vulnerable_person_offence: [
    [/176\.211\(7\)/, "the subsection that withholds the sealing"],
    [/200\.5099/, "the offence it names"],
    [/still stand/i, "that the discharge and dismissal survive the exclusion"],
    [/only the sealing/i, "that the exclusion reaches the sealing alone"]
  ],
  division_or_prosecutor_has_petitioned_the_court_not_to_seal: [
    [/good cause shown/i, "the statutory standard"],
    [/without a hearing/i, "the default the objection displaces"],
    [/contested proceeding/i, "what the route becomes"]
  ],
  deferral_was_terminated_and_a_judgment_of_conviction_was_entered: [
    [/176\.211\(4\)/, "the subsection that enters the conviction"]
  ],
  case_was_not_in_a_nevada_district_court: [
    [/176\.211\(9\)\(a\)/, "the subsection that defines the court"]
  ],
  which_court_handled_the_case_cannot_be_established: [
    [/176\.211\(9\)\(a\)/, "the subsection the unknown answer runs into"]
  ],
  whether_the_dismissal_followed_a_deferred_judgment_cannot_be_established: [
    [/decides whether a court seals the record on its own/i, "why the answer cannot be guessed"]
  ],
  record_still_appears_after_the_discharge_and_dismissal: [
    [/176\.211\(8\)/, "the compliance-reporting duty"],
    [/179\.275/, "the distribution rule"],
    [/nothing you can file/i, "the refusal to invent a filing"]
  ],
  firearm_rights_are_the_goal_and_sealing_does_not_restore_them: [
    [/does not restore/i, "the limit itself"],
    [/pardon/i, "the process that can"]
  ],
  offence_category_question_requires_legal_classification: [
    [/crime of violence/i, "the classification that drives the other routes"]
  ],
  dismissal_was_ordinary_rather_than_after_a_deferred_judgment: [
    [/pays for something the statute already gives them/i, "the cost of the wrong instrument"]
  ],
  records_are_in_more_than_one_court_or_county: [
    [/own section/i, "why each case is answered separately"]
  ],
  immigration_exposure_in_play: [
    [/not something this page can tell you/i, "the refusal to assert an immigration effect"]
  ],
  record_is_not_a_nevada_state_record: [
    [/does not bind/i, "the reach limit"]
  ]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit|draft)/i, "an offer to act for the participant"],
  [
    /the (Division|prosecutor) (will|would|has agreed|is unlikely) (not )?to (object|seal|petition)/i,
    "a claim or prediction about what the Division or the prosecutor will do"
  ],
  [/the court will seal/i, "a promise about a court that has not acted"],
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "an invented deadline"],
  [/you (can|may) appeal/i, "an invented appeal"],
  [/\bexpungement\b/i, "the word Nevada does not use for this remedy"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNevadaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NevadaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NevadaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NevadaBranchError) outcome = "branch";
    else outcome = `unexpected:${e.name}`;

    if (outcome === "stop" || outcome === "mismatch") {
      ok(Boolean(e.message), `${trackId}/${e.stopId}: lost its reason.`);
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: lost its next step.`);
      ok(
        !e.routeTo.includes(trackId) && !SELF_MARKERS[trackId].test(e.routeTo),
        `${trackId}/${e.stopId}: routes back to the node the participant is on.`
      );
      for (const [pattern, why] of STOP_REASON_REQUIRED[e.stopId] ?? []) {
        ok(pattern.test(e.message), `${trackId}/${e.stopId}: the reason no longer states ${why}.`);
      }
      for (const [pattern, why] of STOP_REASON_PROHIBITED) {
        ok(!pattern.test(e.message), `${trackId}/${e.stopId}: the reason carries ${why}.`);
      }
      typedStops.set(`${trackId}/${e.stopId}`, e.routeTo);
    }
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}
ok(typedStops.size === 13, `expected 13 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} cases exercised; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act, none predicting the Division or the prosecutor and none promising a court.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(NV_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "nevada_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NV_COURT_LEVELS).sort()) ===
    JSON.stringify(["cannot_tell", "district_court", "justice_court", "municipal_court"]),
  "the court-level list does not carry the § 176.211(9)(a) distinction and an honest unknown."
);
ok(
  JSON.stringify(Object.keys(NV_DISMISSAL_TYPES).sort()) ===
    JSON.stringify([
      "cannot_tell",
      "deferral_terminated_and_convicted",
      "dismissed_after_completing_a_deferred_judgment",
      "dismissed_outright"
    ]),
  "the dismissal-type list does not separate the three dispositions the section distinguishes."
);
ok(
  Object.keys(NV_RECORD_STATUS).includes("not_yet_checked"),
  "the record-status list does not allow the honest answer that the participant has not checked."
);
ok(
  Object.keys(NV_PARTICIPANT_GOAL).includes("firearm_rights"),
  "the goal list does not surface the one objective this route cannot reach."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design supplies no figure on this route.
  [/[$£€]\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // No outcome is reported and no eligibility is decided.
  [
    /your (record|case|charge|conviction) (has been|was) (sealed|cleared|removed|destroyed)/i,
    "a claim that relief occurred"
  ],
  [/is now (sealed|cleared|removed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/\byou qualify\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // No court is described as having acted, and no court is promised.
  [/the court will seal/i, "a promise about a court that has not acted"],
  [/the court (has|had) (sealed|ordered the sealing)/i, "a claim that a court has acted"],
  [/(your|the) records? will be sealed (on|by|within)/i, "a date the design does not state"],
  [/(sealing|the order) (usually|typically|normally) takes/i, "a duration the design does not supply"],
  // Nothing is claimed about the Division or the prosecutor.
  [
    /the (Division|prosecutor|district attorney)[^.]{0,50}(will not object|rarely object|has agreed|will consent|is unlikely to)/i,
    "a claim or prediction about the Division or the prosecutor"
  ],
  [/(has|have) consented to the sealing/i, "a claim of prosecutor consent"],
  // Nevada's word. Every affirmative use of the other one is prohibited; the
  // sentence that makes the correction says the word is wrong, so it is safe.
  [/(is|are|will be|has been|was|been) expunged/i, "the word Nevada does not use for this remedy"],
  [/Nevada expungement|expungement in Nevada|expungement under NRS/i, "the word Nevada does not use"],
  [/(apply|petition|file) for (an )?expungement/i, "a remedy Nevada does not provide"],
  // No participant filing, ever, on this route.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|form|request|application)/i, "a filing instruction"],
  [/(your|the) (attached|enclosed|generated|draft) (petition|request|application|order)/i, "a generated instrument"],
  [
    /(this (packet|page)|LegalEase) (prepares|includes|generates|contains|drafts) (a|the|your) (petition|application|request|order)/i,
    "a claim that this packet produces a filing"
  ],
  // No agency is accused, no remedy or deadline is invented.
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "a deadline the design does not state"],
  [
    /the (court|clerk|Division|prosecutor|Repository) (has |had )?(failed|refused|neglected)/i,
    "an accusation that an office failed"
  ],
  [/the remedy (is|would be) to (file|apply|move|appeal)/i, "an invented remedy"],
  [/you (can|may|should) appeal/i, "an invented appeal"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bNV\s+8\d{4}\b/, "a postal code"],
  [/\b(1-)?\d{3}[-.]\d{3}[-.]\d{4}\b/, "a telephone number"],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds)\b/i, "internal legal-design jargon"],
  [/\b(in|by|for) (this|the) design\b/i, "internal legal-design jargon"],
  [/the list below/i, "a forward reference to a list that does not follow on every sheet"]
];

const REQUIRED = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, prosecutor or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [/LegalEase cannot tell you that a record has been sealed/i, "the refusal to report an outcome"],
  // The mechanism.
  [/176\.211/, "the governing section"],
  [/shall order (the records |those records |sealed)/i, "the court's own duty"],
  [/without a hearing/i, "the default the section sets"],
  [/good cause shown/i, "the standard for an objection"],
  [/Division of Parole and Probation/, "the body that may object"],
  [/district court/i, "the court the section confines itself to"],
  // The routing point that gives the node its value.
  [/179\.245/, "the ordinary petition the section displaces"],
  [/expressly (excepts|unavailable)/i, "that the ordinary petition does not reach this section"],
  // Vocabulary.
  [/never expungement/i, "Nevada's own terminology correction"],
  [/does not authorise the records to be destroyed|not authorise destruction/i, "the reason it is the wrong word"],
  // What sealing is, held together.
  [/179\.285/, "what a sealed record is"],
  [/179\.295/, "that a sealed record may be reopened"],
  [/179\.301/, "that certain persons and agencies may inspect one"],
  // The limits.
  [/does not restore firearm rights/i, "the firearm limit"],
  [/pardon/i, "the process that can restore them"],
  [/does not bind an out-of-state or federal agency/i, "the reach limit"],
  // The fee position and the waiver, placed accurately.
  [/179\.245\(9\)/, "the sex-trafficking fee waiver the design requires be surfaced"],
  [/different route|separate route in the Nevada intake/i, "the waiver's actual home"],
  // Nothing filed.
  [/Nothing is filed by you on this route and nothing can be/i, "the statement that nothing is filed"]
];

/**
 * Per-sheet assertions.
 *
 * Keyed by componentId and run against that component's own rendered text, so
 * a sentence that belongs on one sheet cannot satisfy the check by appearing
 * on another. Every forbidden pattern here is body copy: none of them occurs
 * in `NV_SOURCES` or `NV_CANNOT_PERFORM`, which render on all four sheets.
 */
const PER_COMPONENT = {
  "nv_seal_deferred-detection-and-routing-1": {
    required: [
      [/dismissed outright/i, "the alternative the participant has to distinguish"],
      [/docket and the minutes/i, "the record that settles which route this is"],
      [/expressly excepts/i, "why a petition is the wrong instrument"],
      [/costs real money/i, "the consequence of getting the identification wrong"],
      [/never expungement/i, "the terminology correction, on the sheet that first names the remedy"]
    ],
    forbidden: [
      [/each must notify the court in writing/i, "the explanation sheet's compliance duty"],
      [/200\.5099/, "the exclusion sheet's own offence"],
      [/three questions to put to the clerk|ask three things/i, "the referral sheet's own script"]
    ]
  },
  "nv_seal_deferred-explanation-2": {
    required: [
      [/176\.211\(5\)/, "the discharge and dismissal step"],
      [/176\.211\(6\)/, "the sealing step"],
      [/176\.211\(8\)/, "the compliance-reporting step"],
      [/179\.275/, "the distribution of the order"],
      [/Central Repository for Nevada Records of Criminal History/, "where a copy of the order goes"],
      [/no waiting period/i, "the absence of a waiting period"],
      [/179\.285/, "what a sealed record is"],
      [/179\.295/, "that it may be reopened"],
      [/179\.301/, "that it may be inspected"]
    ],
    forbidden: [
      [/200\.5099/, "the exclusion sheet's own offence"],
      [/three questions to put to the clerk|ask three things/i, "the referral sheet's own script"]
    ]
  },
  "nv_seal_deferred-exclusion-screen-3": {
    required: [
      [/176\.211\(7\)/, "the exclusion this sheet exists for"],
      [/200\.5099/, "the offence it names"],
      [/still stand/i, "that the discharge and dismissal survive it"],
      [/176\.211\(4\)/, "the terminated-deferral rule"],
      [/176\.211\(9\)\(a\)/, "the district-court limit"],
      [/176\.211\(3\)\(b\)/, "the offences for which a deferral was never available"],
      [/202\.876/, "the violent or sexual offense definition"],
      [/179D\.0357/, "the crime-against-a-child definition"]
    ],
    forbidden: [
      [/docket and the minutes/i, "the routing sheet's own identification method"],
      [/three questions to put to the clerk|ask three things/i, "the referral sheet's own script"]
    ]
  },
  "nv_seal_deferred-referral-instructions-4": {
    required: [
      [/ask three things/i, "the script this sheet exists for"],
      [/Nevada Legal Services/, "the destination the design names"],
      [/176\.211\(8\)/, "why compliance is the court's business"],
      [/keep it dated/i, "the verification discipline"],
      [/Do not file anything/i, "the refusal, stated where a participant is most tempted"]
    ],
    forbidden: [
      [/200\.5099/, "the exclusion sheet's own offence"],
      [/176\.211\(5\)/, "the explanation sheet's own discharge step"],
      [/docket and the minutes/i, "the routing sheet's own identification method"]
    ]
  }
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNevadaGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "NV",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${label}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${label}: guidance resolved as a filing packet.`);
  if (expectedComponents !== undefined) {
    ok(
      resolved.components.length === expectedComponents,
      `${label}: resolved ${resolved.components.length} components, expected ${expectedComponents}.`
    );
  }

  const dir = path.join(OUT, label.replace(/[^a-z0-9_]+/gi, "-"));
  fs.mkdirSync(dir, { recursive: true });

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "NV",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NV",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    ok(
      (rendered.warnings ?? []).length === 0,
      `${component.componentId}: rendered with warnings ${JSON.stringify(rendered.warnings)}.`
    );

    // Read each sheet on its own, so a shared constant cannot satisfy a
    // per-sheet requirement from another sheet's page.
    const sheetFile = path.join(dir, `${component.componentId}.pdf`);
    fs.writeFileSync(sheetFile, rendered.bytes);
    const sheetText = pdfText(sheetFile);
    const rules = PER_COMPONENT[component.componentId];
    ok(Boolean(rules), `${component.componentId}: no per-sheet assertions are declared for this component.`);
    for (const [pattern, why] of rules?.required ?? []) {
      ok(pattern.test(sheetText), `${component.componentId}: missing ${why}.`);
    }
    for (const [pattern, why] of rules?.forbidden ?? []) {
      ok(!pattern.test(sheetText), `${component.componentId}: carries ${why}.`);
    }

    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembleInput = {
    jurisdiction: "NV",
    jurisdictionName: "Nevada",
    packetName: resolved.track.assembledPacketName,
    caseReference: "C-24-338417",
    title: resolved.track.assembledPacketTitle,
    components
  };
  const assembled = await assemblePacketPdf(assembleInput);
  const againAssembled = await assemblePacketPdf(assembleInput);
  ok(assembled.sha256 === againAssembled.sha256, `${label}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${label}: the deliverable is a ZIP.`);

  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${label}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED) ok(pattern.test(text), `${label}: missing ${why}.`);

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${label}: page ${i + 1} is blank.`);
    const lastLine = page.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
    ok(!isSectionHeading(lastLine), `${label}: page ${i + 1} ends on the detached heading "${lastLine}".`);
  }
  ok(pages.length === assembled.pageCount, `${label}: page count disagrees with the assembler.`);

  samples.push({
    label,
    trackId: track.trackId,
    sampleRole,
    variantOfTrackId: sampleRole === "variant" ? track.trackId : null,
    variantPurpose: null,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: components.length
  });
  return assembled.sha256;
}

for (const track of NEVADA_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// A different non-stopping answer renders the identical packet, which is what
// makes one canonical fixture sufficient rather than merely convenient.
{
  const other = await assembleOnly({ participantGoal: "housing_or_licensing" });
  ok(
    other === samples[0].sha256,
    "a different goal answer changes the packet, so one fixture no longer covers the track."
  );
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.countyOfCase;
  let outcome = "generated";
  try {
    const derived = deriveNevadaGuidanceFacts("nv_seal_deferred", facts);
    resolvePacket({
      jurisdiction: "NV",
      trackId: "nv_seal_deferred",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing county of case: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifact renders deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no claim about the Division or the prosecutor, no court described as having acted, and no sheet carrying another sheet's law.`
);

console.log("");
if (failures.length > 0) {
  console.error("Nevada guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Nevada guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(20)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

async function assembleOnly(extraFacts) {
  const track = NEVADA_GUIDANCE_TRACKS[0];
  const facts = deriveNevadaGuidanceFacts(track.trackId, { ...BASE, ...extraFacts });
  const resolved = resolvePacket({
    jurisdiction: "NV",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "NV",
      geography: null,
      facts,
      rootDir: root
    });
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }
  const assembled = await assemblePacketPdf({
    jurisdiction: "NV",
    jurisdictionName: "Nevada",
    packetName: resolved.track.assembledPacketName,
    caseReference: "C-24-338417",
    title: resolved.track.assembledPacketTitle,
    components
  });
  return assembled.sha256;
}

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
function isSectionHeading(line) {
  return /^[A-Z][A-Z ,'()-]{3,60}$/.test(line) && line === line.toUpperCase();
}
function pdfText(f) {
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`pdftotext failed: ${r.stderr}`);
  return r.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
function pdfPageTexts(f) {
  const n = Number((spawnSync("pdfinfo", [f], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0);
  const out = [];
  for (let p = 1; p <= n; p += 1) {
    out.push(
      spawnSync("pdftotext", ["-layout", "-f", String(p), "-l", String(p), f, "-"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }).stdout
    );
  }
  return out;
}
