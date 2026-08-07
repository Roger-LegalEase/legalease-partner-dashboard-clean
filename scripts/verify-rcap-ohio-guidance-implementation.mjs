// Ohio guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Ohio is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set and manifest in component identity, order and requirement, all three
// routes render deterministically into one final guidance PDF each with no
// blank page and no detached heading, every typed stop and every closed list
// fails closed with a reason, a destination and a next step, no stop routes
// back to the node the participant is standing on, no artifact claims relief
// occurred, no artifact says a record is completely gone from everywhere or
// uses the pre-2023 "eligible offender" terminology SB 288 removed, no artifact
// carries petition structure or a participant submission instruction, no route
// carries another route's content, and the three things the adopted design
// leaves open are stated as open rather than answered.
//
// Why there is no regression variant here: the three adopted packet sets make
// all eleven components required, and no Ohio template interpolates a
// participant answer, so a second fixture on the same track would render
// byte-for-byte the same packet. The branches that do matter are typed stops,
// and all thirty-one of them are exercised below as negative cases.

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
  OHIO_GUIDANCE_TRACKS,
  OHIO_GUIDANCE_TEMPLATES,
  OH_RECORD_JURISDICTIONS,
  OH_DISPOSITIONS,
  OH_LOW_LEVEL_CONTROLLED_SUBSTANCE,
  OhioGuidanceStopError,
  OhioRouteMismatchError,
  OhioBranchError,
  deriveOhioGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/ohio/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/ohio-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "oh_2953_36_trafficking",
  "oh_2953_39_prosecutor",
  "oh_2953_521_trafficking_nonconviction"
];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* Ohio track is wired
// in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "OH" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Ohio track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("oh-")).length === 0,
  "Ohio templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Ohio track in the shared registry, no Ohio template in the shared guidance pack.");

for (const t of OHIO_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, OHIO_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(OHIO_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of OHIO_GUIDANCE_TRACKS) {
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
note(`2. Scope: exactly ${ASSIGNED.length} assigned tracks, all runtime_disabled and awaiting counsel.`);

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
for (const track of OHIO_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
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
    ok(match?.componentId === c.componentId, `${c.componentId}: out of the design's component identity or order.`);
    ok(
      match?.requirement === c.requirement,
      `${c.componentId}: requirement differs from the design (${match?.requirement} vs ${c.requirement}).`
    );
    if (c.requirement === "conditional") {
      conditionalCount += 1;
      ok(Boolean(c.conditionKey), `${c.componentId}: conditional component carries no condition key.`);
    }
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
    componentCount += 1;
  }
  // No assigned track may depend on an official source binary, and no assigned
  // track may carry a participant-facing filing.
  for (const c of designedComponents) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
}
ok(componentCount === 11, `expected the design's 11 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Ohio design has no conditional component, found ${conditionalCount}.`);
const used = new Set(OHIO_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(OHIO_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

// No template may interpolate a participant answer. That is what makes one
// canonical fixture per track sufficient, and it is asserted rather than
// assumed, so a later copy edit that adds a placeholder fails here.
for (const [id, template] of Object.entries(OHIO_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Franklin County participant who wants a sheet rather
// than an opinion, has nothing open and no objection raised, and whose case
// clears every condition its route sets. Each track overrides what its own
// route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "ohio",
  immigrationQuestion: "no",
  chargesFromTheSameIncidentEndedDifferently: "no",
  pendingProceedingsOrWarrants: "no",
  wantsSealingVersusExpungementAdvice: "no",
  prosecutorOrVictimObjection: "no",
  // the two survivor routes
  wantsApplicationPrepared: "no",
  caseDisposition: "convicted",
  checkOrdinaryRouteFirst: "yes",
  wantsSurvivorOrganisationDetails: "yes",
  caseCounty: "Franklin County",
  caseNumber: "21CR-004182",
  excludedOffence: "no",
  offenceSectionAndDegree: "ORC 2907.25, misdemeanour of the third degree",
  finalDischargeDate: "9 May 2022",
  dismissalWithPrejudice: "not applicable",
  dispositionEntryDate: "9 May 2022",
  // oh_2953_39_prosecutor
  wantsToApplyUnderThisSection: "no",
  lowLevelControlledSubstanceOffence: "chapter_2925_minor_misdemeanor",
  correspondingWaitingPeriodHasRun: "yes",
  wantsOwnApplicationChecked: "yes"
};

/** Per-track overrides that make the base fixture honest for that route. */
const TRACK_FIXTURE = {
  oh_2953_36_trafficking: {},
  oh_2953_39_prosecutor: {},
  oh_2953_521_trafficking_nonconviction: { caseDisposition: "dismissed" }
};

const G = [
  // The seven gates that run on every assigned route.
  ["wantsEligibilityAdvice", "yes", "stop", "individualized_eligibility_advice_requested"],
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_an_ohio_record"],
  ["immigrationQuestion", "yes", "stop", "immigration_consequences_in_play"],
  [
    "chargesFromTheSameIncidentEndedDifferently",
    "yes",
    "stop",
    "charges_from_the_same_act_ended_differently"
  ],
  ["pendingProceedingsOrWarrants", "yes", "stop", "pending_proceedings_or_open_warrant"],
  [
    "wantsSealingVersusExpungementAdvice",
    "yes",
    "stop",
    "choice_between_sealing_and_expungement_requested"
  ],
  ["prosecutorOrVictimObjection", "yes", "stop", "prosecutor_or_victim_objection_raised"]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) => G.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])),
  // oh_2953_36_trafficking.
  [
    "oh_2953_36_trafficking",
    { wantsApplicationPrepared: "yes" },
    "stop",
    "trafficking_application_is_outside_what_this_service_prepares"
  ],
  ["oh_2953_36_trafficking", { caseDisposition: "dismissed" }, "mismatch", "case_did_not_end_in_a_conviction"],
  ["oh_2953_36_trafficking", { caseDisposition: "not_guilty" }, "mismatch", "case_did_not_end_in_a_conviction"],
  ["oh_2953_36_trafficking", { caseDisposition: "still_pending" }, "mismatch", "case_has_not_ended_yet"],
  ["oh_2953_36_trafficking", { excludedOffence: "yes" }, "stop", "offence_is_excluded_from_the_section"],
  // oh_2953_521_trafficking_nonconviction.
  [
    "oh_2953_521_trafficking_nonconviction",
    { wantsApplicationPrepared: "yes" },
    "stop",
    "trafficking_application_is_outside_what_this_service_prepares"
  ],
  [
    "oh_2953_521_trafficking_nonconviction",
    { caseDisposition: "convicted" },
    "mismatch",
    "case_ended_in_a_conviction"
  ],
  [
    "oh_2953_521_trafficking_nonconviction",
    { caseDisposition: "still_pending" },
    "mismatch",
    "case_has_not_ended_yet"
  ],
  // oh_2953_39_prosecutor.
  [
    "oh_2953_39_prosecutor",
    { wantsToApplyUnderThisSection: "yes" },
    "stop",
    "only_the_prosecutor_may_apply_under_this_section"
  ],
  [
    "oh_2953_39_prosecutor",
    { lowLevelControlledSubstanceOffence: "something_else" },
    "mismatch",
    "offence_is_not_a_low_level_controlled_substance_offence"
  ],
  [
    "oh_2953_39_prosecutor",
    { correspondingWaitingPeriodHasRun: "no" },
    "stop",
    "corresponding_waiting_period_has_not_run"
  ],
  // Closed lists fail closed rather than falling through.
  ["oh_2953_36_trafficking", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["oh_2953_36_trafficking", { recordJurisdiction: "" }, "branch"],
  ["oh_2953_36_trafficking", { immigrationQuestion: "unsure" }, "branch"],
  ["oh_2953_36_trafficking", { chargesFromTheSameIncidentEndedDifferently: "some" }, "branch"],
  ["oh_2953_36_trafficking", { pendingProceedingsOrWarrants: "probably" }, "branch"],
  ["oh_2953_36_trafficking", { wantsSealingVersusExpungementAdvice: "later" }, "branch"],
  ["oh_2953_36_trafficking", { prosecutorOrVictimObjection: "unknown" }, "branch"],
  ["oh_2953_36_trafficking", { caseDisposition: "diverted" }, "branch"],
  ["oh_2953_36_trafficking", { excludedOffence: "not_sure" }, "branch"],
  ["oh_2953_521_trafficking_nonconviction", { caseDisposition: "nolled" }, "branch"],
  ["oh_2953_39_prosecutor", { lowLevelControlledSubstanceOffence: "felony_five" }, "branch"],
  ["oh_2953_39_prosecutor", { correspondingWaitingPeriodHasRun: "almost" }, "branch"],
  ["oh_2953_39_prosecutor", { wantsToApplyUnderThisSection: "" }, "branch"]
];

/**
 * How each route names itself when another route points at it.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * the destination actually uses rather than the internal track id, which never
 * appears in participant-facing copy.
 */
const SELF_MARKERS = {
  oh_2953_36_trafficking: /conviction survivor route under ORC 2953\.36/i,
  oh_2953_521_trafficking_nonconviction: /non-conviction survivor route under ORC 2953\.521/i,
  oh_2953_39_prosecutor: /ORC 2953\.39 route|prosecutor-initiated route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveOhioGuidanceFacts(trackId, { ...BASE, ...TRACK_FIXTURE[trackId], ...override });
  } catch (e) {
    if (e instanceof OhioGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof OhioRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof OhioBranchError) outcome = "branch";
    else outcome = `unexpected:${e.name}`;

    if (outcome === "stop" || outcome === "mismatch") {
      ok(Boolean(e.message), `${trackId}/${e.stopId}: lost its reason.`);
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: lost its next step.`);
      ok(
        !e.routeTo.includes(trackId) && !SELF_MARKERS[trackId].test(e.routeTo),
        `${trackId}/${e.stopId}: routes back to the node the participant is on.`
      );
      typedStops.set(`${trackId}/${e.stopId}`, e.routeTo);
    }
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}
ok(typedStops.size === 31, `expected 31 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(OH_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "ohio", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(OH_DISPOSITIONS).sort()) ===
    JSON.stringify(["convicted", "dismissed", "not_guilty", "still_pending"]),
  "the disposition list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(OH_LOW_LEVEL_CONTROLLED_SUBSTANCE).sort()) ===
    JSON.stringify([
      "chapter_2925_fourth_degree_misdemeanor",
      "chapter_2925_minor_misdemeanor",
      "equivalent_municipal_ordinance",
      "something_else"
    ]),
  "the low-level controlled substance list is not the design's list."
);

// The two questions the design records that are answered by a *sheet* must not
// have been turned into stops. A participant who says yes to either has to be
// able to read the component the design commissioned to answer them.
{
  for (const [trackId, key] of [
    ["oh_2953_36_trafficking", "checkOrdinaryRouteFirst"],
    ["oh_2953_521_trafficking_nonconviction", "checkOrdinaryRouteFirst"],
    ["oh_2953_36_trafficking", "wantsSurvivorOrganisationDetails"],
    ["oh_2953_39_prosecutor", "wantsOwnApplicationChecked"]
  ]) {
    for (const value of ["yes", "no"]) {
      let threw = null;
      try {
        deriveOhioGuidanceFacts(trackId, { ...BASE, ...TRACK_FIXTURE[trackId], [key]: value });
      } catch (e) {
        threw = e.name;
      }
      ok(threw === null, `${trackId}: ${key}=${value} throws ${threw}, so the sheet that answers it never renders.`);
    }
  }
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount as a figure"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // Nothing here may report an outcome in the participant's own case.
  [
    /your (record|conviction|charge|case) (has been|was) (sealed|expunged|removed|destroyed)/i,
    "a claim that relief occurred"
  ],
  [/is now (sealed|expunged|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The design's two named terminology prohibitions.
  [/completely gone from everywhere/i, "the phrase the design forbids"],
  [/eligible offender/i, "the pre-2023 terminology SB 288 removed from ORC 2953.31"],
  [/\brecord (is|will be) (gone|erased|wiped)\b/i, "a claim that the record ceases to exist"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No participant submission on any of these three routes.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  [/\battach (it|the \w+) to (your|the) (petition|motion|application)\b/i, "an attachment instruction"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bOH\s+4\d{4}\b/, "a postal code"],
  // The three things the adopted design leaves open stay open.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy for an unresolved failure mode"],
  [/a person (can|cannot|may|may not) prompt a prosecutor/i, "an answer to the preserved prompting question"],
  [/the prosecutor (must|will) (consider|apply|file)/i, "an invented obligation on a prosecutor"],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies)\b/i, "internal legal-design jargon"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, prosecutor or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [/Ohio has two different remedies and they are not the same thing/i, "the sealing-is-not-expungement disclosure"],
  [
    /Bureau of Criminal Identification and Investigation/,
    "the body that holds the state criminal record"
  ],
  [/2953\.61/, "the multiple-charge trap"],
  [/court costs/i, "the correction that unpaid court costs do not delay eligibility"],
  [/Senate Bill 288/, "the correction that pre-2023 Ohio guidance is out of date"],
  [
    /LegalEase cannot tell you that a record has been sealed or expunged/i,
    "the refusal to report an outcome"
  ],
  [/no application, motion or petition/i, "the never-a-filing instruction"]
];

const PER_TRACK = {
  oh_2953_36_trafficking: [
    [/2953\.36/, "the governing section"],
    [/2907\.24/, "the prostitution-related sections in the first group"],
    [/preponderance of the evidence/i, "the standard for the first group"],
    [/clear and convincing evidence/i, "the standard for the second group"],
    [/2903\.01/, "the excluded offences"],
    [/2953\.33/, "the ordinary route the design says to screen for first"],
    [/may be made at any time/i, "the absence of a waiting period"],
    [/no record exists/i, "what a grant allows the applicant and the court to say"],
    [/fifty dollars/i, "the court fee, stated in words rather than as a figure"],
    [/indigen/i, "the indigency exception to the fee"],
    [/rather than from a reading of the section's own text/i, "the preserved statement that the section was not read at source"],
    [/destroy, delete and erase/i, "the statutory language behind the stronger remedy"]
  ],
  oh_2953_39_prosecutor: [
    [/2953\.39/, "the governing section"],
    [/Chapter 2925/, "the chapter the offence must come from"],
    [/misdemeanours of the fourth degree or minor misdemeanours/i, "the degrees the section reaches"],
    [/municipal ordinance/i, "the substantially equivalent ordinance category"],
    [/2953\.32/, "the section the waiting period comes from"],
    [/prosecuting attorney/, "who holds the application"],
    [/subject person/, "the participant's standing to object"],
    [/is not settled here/i, "the preserved question about prompting a prosecutor"],
    [/do not depend on a prosecutor deciding to act/i, "why the ordinary routes are the better answer"]
  ],
  oh_2953_521_trafficking_nonconviction: [
    [/2953\.521/, "the governing section"],
    [/preponderance of the evidence/i, "the standard on the trafficking connection"],
    [/with or without prejudice/i, "the prejudice check"],
    [/limitations period/i, "the limitations check"],
    [/governmental interest/i, "what else the court weighs"],
    [/2953\.33/, "the ordinary route the design says to screen for first"],
    [/at any time after/i, "the absence of a waiting period"],
    [/rather than from a reading of the section's own text/i, "the preserved statement that the section was not read at source"],
    [/destroy, delete and erase/i, "the statutory language behind the stronger remedy"]
  ]
};

/**
 * Copy that belongs to one route and must not leak onto another.
 *
 * The three families share a helper, so a mis-wired component would render a
 * plausible-looking packet whose fee, standard or applicant is another route's.
 * These are the sentences that would give that away.
 */
const FORBIDDEN_PER_TRACK = {
  oh_2953_36_trafficking: [
    [/Only the prosecuting attorney may apply/i, "prosecutor-route content"],
    [/ORC 2953\.521 reaches a person found not guilty/i, "the non-conviction route's own naming sheet"]
  ],
  oh_2953_39_prosecutor: [
    [/fifty dollars/i, "the survivor-route court fee, which has nothing to do with a prosecutor's application"],
    [/human trafficking/i, "survivor-route content on a route that does not turn on it"],
    [/clear and convincing/i, "a survivor-route standard"]
  ],
  oh_2953_521_trafficking_nonconviction: [
    [/Only the prosecuting attorney may apply/i, "prosecutor-route content"],
    [/ORC 2953\.36 reaches two groups/i, "the conviction route's own naming sheet"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveOhioGuidanceFacts(track.trackId, {
    ...BASE,
    ...TRACK_FIXTURE[track.trackId],
    ...(extraFacts ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "OH",
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

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "OH",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "OH",
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
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembleInput = {
    jurisdiction: "OH",
    jurisdictionName: "Ohio",
    packetName: resolved.track.assembledPacketName,
    caseReference: "21CR-004182",
    title: resolved.track.assembledPacketTitle,
    components
  };
  const assembled = await assemblePacketPdf(assembleInput);
  const againAssembled = await assemblePacketPdf(assembleInput);
  ok(assembled.sha256 === againAssembled.sha256, `${label}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${label}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, label.replace(/[^a-z0-9_]+/gi, "-"));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${label}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED_EVERYWHERE) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of PER_TRACK[track.trackId]) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of FORBIDDEN_PER_TRACK[track.trackId]) {
    ok(!pattern.test(text), `${label}: carries ${why}.`);
  }

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${label}: page ${i + 1} is blank.`);
    // A section heading is the last thing on a page only when its body has been
    // pushed onto the next one. The renderer has no widow control and this job
    // does not own it, so the guard lives here and the fix is copy length.
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
  return text;
}

for (const track of OHIO_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

// Exactly one canonical sample per assigned track, and no variant: the adopted
// packet sets carry no conditional component and no template interpolates a
// fact, so a second fixture would be a duplicate rather than a regression case.
ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.caseCounty;
  let outcome = "generated";
  try {
    const derived = deriveOhioGuidanceFacts("oh_2953_36_trafficking", facts);
    resolvePacket({
      jurisdiction: "OH",
      trackId: "oh_2953_36_trafficking",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case county: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no outcome claim, no route carrying another route's content.`
);

console.log("");
if (failures.length > 0) {
  console.error("Ohio guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Ohio guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(38)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
/** The renderer's section headings are upper case and short. */
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
