// West Virginia guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: West Virginia is not enabled,
// every assigned track has a governing specification and matches the adopted
// packet set and manifest in component identity, order and requirement, all
// three routes render deterministically into one final guidance PDF each with
// no blank page and no detached heading, every typed stop and every closed list
// fails closed with a reason, a destination and a next step, no stop routes
// back to the node the participant is standing on, no artifact claims relief
// occurred, no artifact describes § 61-11-25 relief as automatic or lends it
// the § 61-11-26 carve-outs, no artifact carries petition structure or a
// participant submission instruction, no route carries another route's content,
// and the five things the adopted design leaves open are stated as open rather
// than answered.
//
// One jurisdiction-specific rule about money. The design supplies two fee
// figures read at source — the § 59-1-11(a)(1) circuit clerk civil filing fee
// and the § 61-11-26(n) State Police processing fee — and records as an open
// question whether the first is charged in full in every circuit. So the check
// here is not that no figure appears, but that only those two appear, that each
// appears with its statutory basis, and that the unresolved practice is stated.
//
// Why there is no regression variant here: the three adopted packet sets make
// all four components required, and no West Virginia template interpolates a
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
  WEST_VIRGINIA_GUIDANCE_TRACKS,
  WEST_VIRGINIA_GUIDANCE_TEMPLATES,
  WV_RECORD_JURISDICTIONS,
  WV_DISMISSAL_FOR_PLEA,
  WV_NON_CONVICTION_DISPOSITIONS,
  WV_AGE_AT_OFFENSE,
  WV_ALCOHOL_CONCENTRATION,
  WV_PROGRAMME_OUTCOME,
  WestVirginiaGuidanceStopError,
  WestVirginiaRouteMismatchError,
  WestVirginiaBranchError,
  deriveWestVirginiaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/west-virginia/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/west-virginia-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["wv_common_conv_procedure", "wv_common_nc_procedure", "wv_dui_test_and_lock_dismissal"];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* West Virginia track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "WV" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real West Virginia track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("wv-")).length === 0,
  "West Virginia templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note(
  "1. Enablement: no real West Virginia track in the shared registry, no West Virginia template in the shared guidance pack."
);

for (const t of WEST_VIRGINIA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, WEST_VIRGINIA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(WEST_VIRGINIA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of WEST_VIRGINIA_GUIDANCE_TRACKS) {
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
for (const track of WEST_VIRGINIA_GUIDANCE_TRACKS) {
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
ok(componentCount === 4, `expected the design's 4 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the West Virginia design has no conditional component, found ${conditionalCount}.`);
const used = new Set(
  WEST_VIRGINIA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(WEST_VIRGINIA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

// No template may interpolate a participant answer. That is what makes one
// canonical fixture per track sufficient, and it is asserted rather than
// assumed, so a later copy edit that adds a placeholder fails here.
for (const [id, template] of Object.entries(WEST_VIRGINIA_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Kanawha County participant who wants a sheet rather
// than an opinion, has no prior felony, nothing open and nothing excluded, and
// whose case clears every condition its route sets. Each track overrides what
// its own route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "west_virginia",
  firearmsImmigrationOrLicensingQuestion: "no",
  // wv_common_conv_procedure
  priorExpungementGranted: "no",
  convictionInventory: "Petit larceny, Kanawha County, 14 March 2019; shoplifting, Cabell County, 2 August 2017",
  anyFelonyConviction: "no",
  supervisionCompletionDate: "20 June 2021",
  exclusionScreen: "no",
  sameTransactionUnclear: "no",
  commercialDriving: "no",
  pendingCharges: "no",
  protectiveOrders: "no",
  identifiedVictimMayOppose: "no",
  treatmentOrJobReadiness: "no",
  convictionCounties: "Kanawha County and Cabell County",
  // wv_common_nc_procedure
  priorFelonyConviction: "no",
  dispositionType: "dismissed",
  dispositionDate: "9 January 2026",
  dismissalForPlea: "no",
  chargeCourtCounty: "Kanawha County, magistrate court",
  familyOrHouseholdVictim: "no",
  drivingCase: "no",
  // wv_dui_test_and_lock_dismissal
  chargeStillLive: "no",
  ageAtOffense: "under_21",
  alcoholConcentration: "between_002_and_008",
  firstOffenseUnderSubsection: "yes",
  programmeOutcome: "completed",
  programmeCompletionDate: "4 May 2026",
  chargeCourt: "Kanawha County magistrate court",
  dismissalConfirmed: "yes",
  recordStillAppears: "no"
};

const G = [
  ["wantsEligibilityAdvice", "yes", "stop", "individualized_eligibility_advice_requested"],
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_a_west_virginia_record"],
  ["firearmsImmigrationOrLicensingQuestion", "yes", "stop", "collateral_consequence_question_in_play"]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) =>
    G.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])
  ),
  // wv_common_conv_procedure.
  [
    "wv_common_conv_procedure",
    { priorExpungementGranted: "yes" },
    "stop",
    "a_prior_expungement_has_probably_spent_the_once_per_lifetime_relief"
  ],
  [
    "wv_common_conv_procedure",
    { exclusionScreen: "yes" },
    "stop",
    "conviction_falls_within_the_statutory_exclusion_list"
  ],
  ["wv_common_conv_procedure", { commercialDriving: "yes" }, "stop", "commercial_driver_or_commercial_vehicle"],
  ["wv_common_conv_procedure", { anyFelonyConviction: "yes" }, "stop", "a_felony_conviction_is_on_the_inventory"],
  [
    "wv_common_conv_procedure",
    { sameTransactionUnclear: "yes" },
    "stop",
    "same_transaction_or_series_question_is_unclear"
  ],
  ["wv_common_conv_procedure", { pendingCharges: "yes" }, "stop", "criminal_charges_are_pending"],
  [
    "wv_common_conv_procedure",
    { protectiveOrders: "yes" },
    "stop",
    "a_restitution_protection_or_no_contact_order_exists"
  ],
  [
    "wv_common_conv_procedure",
    { identifiedVictimMayOppose: "yes" },
    "stop",
    "an_identified_victim_may_oppose"
  ],
  // wv_common_nc_procedure.
  [
    "wv_common_nc_procedure",
    { priorFelonyConviction: "yes" },
    "stop",
    "a_prior_felony_conviction_closes_the_whole_section"
  ],
  [
    "wv_common_nc_procedure",
    { dismissalForPlea: "yes" },
    "stop",
    "dismissal_was_given_in_exchange_for_a_guilty_plea"
  ],
  [
    "wv_common_nc_procedure",
    { dismissalForPlea: "cannot_tell" },
    "stop",
    "whether_the_dismissal_was_for_a_plea_cannot_be_told_from_the_papers"
  ],
  ["wv_common_nc_procedure", { dispositionType: "still_pending" }, "mismatch", "the_case_has_not_ended_yet"],
  [
    "wv_common_nc_procedure",
    { dispositionType: "cannot_tell" },
    "stop",
    "pretrial_diversion_and_deferred_adjudication_cannot_be_told_apart"
  ],
  [
    "wv_common_nc_procedure",
    { dispositionType: "deferred_adjudication_completed", familyOrHouseholdVictim: "yes" },
    "stop",
    "family_or_household_member_carve_out_may_apply"
  ],
  [
    "wv_common_nc_procedure",
    { pendingCharges: "yes" },
    "stop",
    "charges_or_proceedings_relating_to_the_matter_are_pending"
  ],
  // wv_dui_test_and_lock_dismissal.
  [
    "wv_dui_test_and_lock_dismissal",
    { chargeStillLive: "yes" },
    "stop",
    "the_charge_is_still_live_and_that_stage_is_outside_scope"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { ageAtOffense: "twenty_one_or_over" },
    "mismatch",
    "the_person_was_twenty_one_or_over_at_the_offence"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { alcoholConcentration: "008_or_more" },
    "mismatch",
    "the_recorded_concentration_is_at_or_above_the_subsection_limit"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { firstOffenseUnderSubsection: "no" },
    "stop",
    "a_second_or_subsequent_offence_under_the_subsection"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { commercialDriving: "yes" },
    "stop",
    "commercial_driver_or_commercial_vehicle"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { programmeOutcome: "not_completed" },
    "stop",
    "the_programme_was_not_completed_or_the_person_was_removed"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { programmeOutcome: "removed" },
    "stop",
    "the_programme_was_not_completed_or_the_person_was_removed"
  ],
  [
    "wv_dui_test_and_lock_dismissal",
    { recordStillAppears: "yes" },
    "stop",
    "record_still_appears_although_the_programme_was_completed"
  ],
  // Closed lists fail closed rather than falling through.
  ["wv_common_conv_procedure", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["wv_common_conv_procedure", { recordJurisdiction: "" }, "branch"],
  ["wv_common_conv_procedure", { firearmsImmigrationOrLicensingQuestion: "unsure" }, "branch"],
  ["wv_common_conv_procedure", { exclusionScreen: "some" }, "branch"],
  ["wv_common_conv_procedure", { anyFelonyConviction: "probably" }, "branch"],
  ["wv_common_nc_procedure", { dismissalForPlea: "unknown" }, "branch"],
  ["wv_common_nc_procedure", { dispositionType: "convicted" }, "branch"],
  ["wv_common_nc_procedure", { priorFelonyConviction: "" }, "branch"],
  ["wv_dui_test_and_lock_dismissal", { ageAtOffense: "nineteen" }, "branch"],
  ["wv_dui_test_and_lock_dismissal", { alcoholConcentration: "0.05" }, "branch"],
  ["wv_dui_test_and_lock_dismissal", { programmeOutcome: "in_progress" }, "branch"],
  ["wv_dui_test_and_lock_dismissal", { chargeStillLive: "maybe" }, "branch"]
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
  wv_common_conv_procedure: /conviction expungement screen|§ 61-11-26 screen/i,
  wv_common_nc_procedure: /non-conviction expungement screen|§ 61-11-25 screen/i,
  wv_dui_test_and_lock_dismissal: /test and lock route|§ 17C-5-2\(j\)\(1\) route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveWestVirginiaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof WestVirginiaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof WestVirginiaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof WestVirginiaBranchError) outcome = "branch";
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
  JSON.stringify(Object.keys(WV_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "tribal", "west_virginia"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(WV_DISMISSAL_FOR_PLEA).sort()) === JSON.stringify(["cannot_tell", "no", "yes"]),
  "the dismissal-for-plea list does not carry the unresolvable answer the design requires."
);
ok(
  JSON.stringify(Object.keys(WV_NON_CONVICTION_DISPOSITIONS).sort()) ===
    JSON.stringify([
      "acquitted",
      "cannot_tell",
      "deferred_adjudication_completed",
      "dismissed",
      "pretrial_diversion_completed",
      "still_pending"
    ]),
  "the non-conviction disposition list is not the design's list."
);
ok(Object.keys(WV_AGE_AT_OFFENSE).length === 2, "the age list is not two-valued.");
ok(
  JSON.stringify(Object.keys(WV_ALCOHOL_CONCENTRATION).sort()) ===
    JSON.stringify(["008_or_more", "between_002_and_008", "not_known"]),
  "the concentration list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(WV_PROGRAMME_OUTCOME).sort()) ===
    JSON.stringify(["completed", "not_completed", "removed"]),
  "the programme-outcome list is not the design's list."
);

// A participant who does not know the recorded concentration is not thrown out:
// the design's own question allows "if you know it", and the checklist sheet is
// how they find out. The route must therefore pass through on that answer.
{
  let threw = null;
  try {
    deriveWestVirginiaGuidanceFacts("wv_dui_test_and_lock_dismissal", {
      ...BASE,
      alcoholConcentration: "not_known"
    });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, `not knowing the recorded concentration throws ${threw}, so the checklist never renders.`);
}

// The family-or-household-member carve-out attaches to the deferred route only.
{
  let threw = null;
  try {
    deriveWestVirginiaGuidanceFacts("wv_common_nc_procedure", {
      ...BASE,
      dispositionType: "dismissed",
      familyOrHouseholdVictim: "yes"
    });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, "the deferred-adjudication carve-out fired on a straight dismissal.");
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // Money: only the two figures the design supplies, read at source, may appear.
  [/\$(?!200\b|100\b)\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // Nothing here may report an outcome in the participant's own case.
  [
    /your (record|conviction|charge|case) (has been|was) (expunged|sealed|removed|destroyed|dismissed)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|sealed|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  [/\brecord (is|will be) (gone|erased|wiped)\b/i, "a claim that the record ceases to exist"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // The § 61-11-25 grant is discretionary in form and must never read as automatic.
  [/(automatically|automatic) (expunged|expungement|granted)/i, "a claim that a petition route is automatic"],
  [/the court (must|shall) grant the petition/i, "a claim that the § 61-11-25 grant is mandatory"],
  // No participant submission on any of these three nodes.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  [/\bfile (the|this|your) (petition|motion|application) (with|in|at)\b/i, "a filing instruction"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bWV\s+2\d{4}\b/, "a postal code"],
  // The five things the adopted design leaves open stay open.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy for an unresolved failure mode"],
  [/(you )?may file in (your|the) county of residence/i, "the unresolved residence-county venue option, stated as settled"],
  [
    /§ 60A-4-407 (does not|do not) count against/i,
    "an answer to the preserved once-per-lifetime interaction question"
  ],
  [
    /the expungement (reaches|includes) (the )?State Police/i,
    "an answer to the preserved reach question on the test and lock route"
  ],
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
    /has not contacted any court, clerk, prosecuting attorney or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [
    /LegalEase cannot tell you that a record has been expunged/i,
    "the refusal to report an outcome"
  ],
  [/Division of Motor Vehicles/, "the driving-record disclosure"],
  [/driving record cannot/i, "the statement that the driving record is not cleared"],
  [/no petition, motion or application is generated/i, "the never-a-filing instruction"]
];

const PER_TRACK = {
  wv_common_conv_procedure: [
    [/61-11-26\(o\)/, "the once-per-lifetime subsection"],
    [/One petition, one lifetime/, "the design's own framing of the limit"],
    [/61-11-26\(c\)/, "the exclusion list"],
    [/61-11-26b/, "the commercial-driving bar"],
    [/one year for a single misdemeanour/i, "the misdemeanour waiting period"],
    [/five years for a nonviolent felony/i, "the felony waiting period"],
    [/61-11-26a/, "the accelerated route"],
    [/at least five years old when the petition is filed/i, "the DUI-does-not-automatically-block point"],
    [/prevention, detection, investigation, prosecution or incarceration of law violators/i, "the § 61-11-26(l) disclosure duty"],
    [/\$200/, "the circuit clerk civil filing fee the design supplies"],
    [/59-1-11\(a\)\(1\)/, "the statutory basis for that fee"],
    [/\$100/, "the State Police processing fee the design supplies"],
    [/61-11-26\(n\)/, "the statutory basis for that fee"],
    [/not established here/i, "the preserved question about what the fee is charged in practice"],
    [/Neither names a county of residence/, "the preserved venue question"],
    [/30 days to file a notice of opposition/i, "the opposition window"],
    [/60 days to act/i, "the court-action deadline"],
    [/clear and convincing evidence on six elements/i, "the burden"]
  ],
  wv_common_nc_procedure: [
    [/61-11-25/, "the governing section"],
    [/prior felony conviction/i, "the threshold bar asked first"],
    [/60 days/, "the bar on filing sooner"],
    [/in exchange for a guilty plea/i, "the excluded dismissal"],
    [/61-11-22/, "the pretrial diversion section"],
    [/61-11-22a/, "the deferred adjudication section"],
    [/not guilty by reason of mental illness, intellectual disability or addiction/i, "the narrow carve-out the design corrects"],
    [/not a general sexual-offence exclusion/i, "the correction itself"],
    [/May, not shall/, "the statement that the grant is discretionary in form"],
    [/no filing fees are charged and no costs assessed|no filing fees charged and no costs assessed/i, "the free-to-file rule"],
    [/61-11-25\(b\)/, "the court's duty to advise"],
    [/need not disclose the record on an application for employment, credit/i, "the § 61-11-25(e) effect"],
    [/circuit court in which the charges were filed/i, "the venue point that catches people out"],
    [/local requirements/i, "the local-check instruction"]
  ],
  wv_dui_test_and_lock_dismissal: [
    [/17C-5-2\(j\)\(1\)/, "the governing subsection"],
    [/Motor Vehicle Test and Lock Program/, "the programme"],
    [/17C-5A-3a/, "the programme's own section"],
    [/under the age of 21|under 21/i, "the population"],
    [/two hundredths of one percent/i, "the lower concentration bound"],
    [/eight hundredths/i, "the upper concentration bound"],
    [/shall dismiss the charge/i, "the mandatory duty on the court"],
    [/Shall, not may/, "the statement that the duty is mandatory"],
    [/charge-stage criminal defence/i, "the scope boundary on the continuance motion"],
    [/is not established/i, "the preserved question about how far the expungement reaches"],
    [/no application, no motion to enforce and no remedy/i, "the preserved question about a court that has not acted"],
    [/may not be construed as an admission/i, "the protection on the continuance motion"]
  ]
};

/**
 * Copy that belongs to one route and must not leak onto another.
 *
 * The design is explicit that the § 61-11-26 carve-outs must not be applied to
 * § 61-11-25 relief, and the two effect statements are the sentences that would
 * give a mis-wired component away.
 */
const FORBIDDEN_PER_TRACK = {
  wv_common_conv_procedure: [
    [
      /need not disclose the record on an application for employment, credit/i,
      "the wider § 61-11-25 effect, which does not describe conviction expungement"
    ]
  ],
  wv_common_nc_procedure: [
    [
      /prevention, detection, investigation, prosecution or incarceration of law violators/i,
      "the § 61-11-26 disclosure duty, which the design forbids applying to § 61-11-25 relief"
    ],
    [/once in a lifetime|One petition, one lifetime/i, "the conviction-route once-per-lifetime limit"],
    [/\$200|\$100/, "a conviction-route fee on a section that charges none"]
  ],
  wv_dui_test_and_lock_dismissal: [
    [/One petition, one lifetime/i, "the conviction-route once-per-lifetime limit"],
    [/61-11-26\(o\)/, "the conviction-route limit subsection"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveWestVirginiaGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "WV",
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
      jurisdiction: "WV",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "WV",
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
    jurisdiction: "WV",
    jurisdictionName: "West Virginia",
    packetName: resolved.track.assembledPacketName,
    caseReference: "20-M20-00417",
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

for (const track of WEST_VIRGINIA_GUIDANCE_TRACKS) {
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
  delete facts.convictionCounties;
  let outcome = "generated";
  try {
    const derived = deriveWestVirginiaGuidanceFacts("wv_common_conv_procedure", facts);
    resolvePacket({
      jurisdiction: "WV",
      trackId: "wv_common_conv_procedure",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing conviction counties: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no outcome claim, no route carrying another route's content.`
);

console.log("");
if (failures.length > 0) {
  console.error("West Virginia guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("West Virginia guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(32)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
