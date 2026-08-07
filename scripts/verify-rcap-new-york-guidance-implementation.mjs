// New York guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: New York is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set and manifest in component identity, order and requirement, all four
// routes render deterministically into one final guidance PDF each with no
// blank page and no detached heading, every typed stop and every closed list
// fails closed with a reason, a destination and a next step, no stop routes
// back to the node the participant is standing on, no artifact carries petition
// structure or a participant submission instruction, no route carries another
// route's content, and the design's open questions are stated as open rather
// than answered.
//
// Three rules here are New York's own and are asserted rather than assumed:
//
//   - **Never tell a participant their record is already sealed.** It is the
//     design's first packet instruction on all four tracks. The prohibition
//     targets the affirmative claim about the reader's own record; the
//     disclaimer that LegalEase *cannot* say it is separately required.
//   - **The DWAI route makes no eligibility statement at all**, because the
//     design forbids one until two release blockers close. The refusal is
//     required to be on the page, and affirmative eligibility phrasing is
//     prohibited on that packet.
//   - **Assembly Bill A10951 is not law.** Treating it as enacted would narrow
//     eligibility for people screened as eligible today, so any phrasing that
//     applies it is prohibited and the statement that it is not law is
//     required wherever it is mentioned.
//
// Why there is no regression variant here: the four adopted packet sets make
// all eighteen components required, and no New York template interpolates a
// participant answer, so a second fixture on the same track would render
// byte-for-byte the same packet. The branches that do matter are typed stops,
// and all thirty-four of them are exercised below as negative cases.

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
  NEW_YORK_GUIDANCE_TRACKS,
  NEW_YORK_GUIDANCE_TEMPLATES,
  NY_RECORD_JURISDICTIONS,
  NY_FAVOURABLE_TERMINATIONS,
  NY_STILL_APPEARING,
  NY_OFFENCE_CLASSES,
  NY_DWAI_SUBDIVISIONS,
  NY_ELIGIBILITY_CONFIRMED,
  NewYorkGuidanceStopError,
  NewYorkRouteMismatchError,
  NewYorkBranchError,
  deriveNewYorkGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/new-york/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/new-york-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "ny_160_50_nonconviction",
  "ny_clean_slate_convictions",
  "ny_clean_slate_dwai",
  "ny_clean_slate_manual_review"
];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* New York track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NY" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real New York track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ny-")).length === 0,
  "New York templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
// The MRTA marijuana route is a composed track owned by another job. This job
// must not have picked it up, and must not carry any part of its official form.
ok(
  !NEW_YORK_GUIDANCE_TRACKS.some((t) => t.trackId === "ny_mrta_marijuana"),
  "The MRTA marijuana composed route has been pulled into the guidance job."
);
note(
  "1. Enablement: no real New York track in the shared registry, no New York template in the shared guidance pack, MRTA composed route untouched."
);

for (const t of NEW_YORK_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEW_YORK_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(NEW_YORK_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NEW_YORK_GUIDANCE_TRACKS) {
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
for (const track of NEW_YORK_GUIDANCE_TRACKS) {
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
  // track may carry a participant-facing filing. This is the check that the
  // MRTA correction was made for, so it is stated loudly.
  for (const c of designedComponents) {
    ok(
      !c.officialFormId,
      `${track.trackId}: the design attaches official form ${c.officialFormId} to a guidance route.`
    );
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
}
ok(componentCount === 18, `expected the design's 18 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the New York design has no conditional component, found ${conditionalCount}.`);
const used = new Set(NEW_YORK_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(NEW_YORK_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound, none official-form-bound.`
);

// No template may interpolate a participant answer. That is what makes one
// canonical fixture per track sufficient, and it is asserted rather than
// assumed, so a later copy edit that adds a placeholder fails here.
for (const [id, template] of Object.entries(NEW_YORK_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Kings County participant who wants a sheet rather than
// an opinion, holds no immigration or firearms expectation, and whose record
// clears every condition its route sets. Each track overrides what its own
// route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "new_york",
  immigrationQuestion: "no",
  firearmsLicensingGoal: "no",
  // ny_160_50_nonconviction
  caseDetails: "Kings County, Criminal Court, docket 2019KN012345, arrested 4 March 2019, PL 155.25, dismissed 2 October 2019",
  dispositionType: "dismissed",
  stillAppearing: "no",
  // ny_clean_slate_convictions
  convictionDetails: "Kings County, Supreme Court, indictment 1042/2015, PL 155.30 class E felony, sentenced 11 May 2016, no incarceration",
  offenceClass: "felony_below_class_a",
  sexOffenceScreen: "no",
  lifeSentence: "no",
  currentSupervision: "no",
  pendingChargeInNewYork: "no",
  subsequentConviction: "no",
  multicategoryDocket: "no",
  shouldHaveSealedButHasNot: "no",
  otherJurisdictionConvictions: "no",
  // ny_clean_slate_dwai
  dwaiCaseDetails: "Erie County, Town Court, docket 22TR004411, VTL 1192(1), decided 8 June 2022",
  vtlSubdivision: "subdivision_one",
  dwaiConvictionDate: "8 June 2022, fine and surcharge imposed",
  dwaiOtherMatters: "no other New York convictions and no pending charge",
  // ny_clean_slate_manual_review
  eligibilityConditionsChecked: "yes",
  dcjsRecordReviewRun: "yes",
  dcjsRecordReviewShowed: "the conviction is still shown and is not marked sealed",
  timeElapsedSincePeriodRan: "about fourteen months",
  toldAPetitionCanBeMadeNow: "no"
};

const G = [
  ["wantsEligibilityAdvice", "yes", "stop", "individualized_eligibility_advice_requested"],
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_a_new_york_record"],
  ["immigrationQuestion", "yes", "stop", "immigration_consequences_in_play"],
  ["firearmsLicensingGoal", "yes", "stop", "firearms_licensing_goal"]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) =>
    G.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])
  ),
  // ny_160_50_nonconviction.
  [
    "ny_160_50_nonconviction",
    { dispositionType: "acd_pending" },
    "stop",
    "adjournment_in_contemplation_of_dismissal_has_not_been_dismissed"
  ],
  ["ny_160_50_nonconviction", { dispositionType: "convicted" }, "mismatch", "the_case_ended_in_a_conviction"],
  [
    "ny_160_50_nonconviction",
    { stillAppearing: "yes_official_record" },
    "stop",
    "record_still_appears_on_an_official_record_after_a_favourable_termination"
  ],
  [
    "ny_160_50_nonconviction",
    { stillAppearing: "yes_private_vendor" },
    "stop",
    "sealed_case_still_appearing_with_a_private_background_check_vendor"
  ],
  // ny_clean_slate_convictions.
  [
    "ny_clean_slate_convictions",
    { sexOffenceScreen: "yes" },
    "stop",
    "the_offence_may_be_a_sex_offence_under_correction_law_168_a"
  ],
  [
    "ny_clean_slate_convictions",
    { offenceClass: "not_known_from_the_record" },
    "stop",
    "the_penal_law_article_and_class_are_not_known_from_the_record"
  ],
  [
    "ny_clean_slate_convictions",
    { offenceClass: "class_a_felony" },
    "stop",
    "a_class_a_felony_pending_the_article_220_determination"
  ],
  [
    "ny_clean_slate_convictions",
    { offenceClass: "class_a_felony_article_220" },
    "stop",
    "a_class_a_felony_pending_the_article_220_determination"
  ],
  ["ny_clean_slate_convictions", { lifeSentence: "yes" }, "stop", "a_life_sentence_was_imposed"],
  [
    "ny_clean_slate_convictions",
    { currentSupervision: "yes" },
    "stop",
    "currently_under_probation_or_parole_supervision_for_the_conviction"
  ],
  [
    "ny_clean_slate_convictions",
    { pendingChargeInNewYork: "yes" },
    "stop",
    "a_criminal_charge_is_pending_in_new_york"
  ],
  ["ny_clean_slate_convictions", { multicategoryDocket: "yes" }, "stop", "a_multicategory_docket_question"],
  [
    "ny_clean_slate_convictions",
    { shouldHaveSealedButHasNot: "yes" },
    "mismatch",
    "the_conviction_should_have_sealed_and_has_not"
  ],
  // ny_clean_slate_dwai.
  [
    "ny_clean_slate_dwai",
    { vtlSubdivision: "another_subdivision" },
    "mismatch",
    "the_conviction_was_under_another_subdivision_of_vtl_1192"
  ],
  [
    "ny_clean_slate_dwai",
    { vtlSubdivision: "not_sure" },
    "stop",
    "which_subdivision_the_conviction_was_under_is_not_known"
  ],
  // ny_clean_slate_manual_review.
  [
    "ny_clean_slate_manual_review",
    { toldAPetitionCanBeMadeNow: "yes" },
    "stop",
    "told_that_a_manual_review_petition_can_be_made_now"
  ],
  [
    "ny_clean_slate_manual_review",
    { eligibilityConditionsChecked: "no" },
    "mismatch",
    "a_clean_slate_condition_is_not_met"
  ],
  [
    "ny_clean_slate_manual_review",
    { eligibilityConditionsChecked: "not_checked" },
    "stop",
    "the_clean_slate_conditions_have_not_been_checked_yet"
  ],
  ["ny_clean_slate_manual_review", { dcjsRecordReviewRun: "no" }, "stop", "no_record_review_has_been_run"],
  // Closed lists fail closed rather than falling through.
  ["ny_160_50_nonconviction", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["ny_160_50_nonconviction", { recordJurisdiction: "" }, "branch"],
  ["ny_160_50_nonconviction", { immigrationQuestion: "unsure" }, "branch"],
  ["ny_160_50_nonconviction", { firearmsLicensingGoal: "perhaps" }, "branch"],
  ["ny_160_50_nonconviction", { dispositionType: "sealed" }, "branch"],
  ["ny_160_50_nonconviction", { stillAppearing: "maybe" }, "branch"],
  ["ny_clean_slate_convictions", { offenceClass: "violation" }, "branch"],
  ["ny_clean_slate_convictions", { sexOffenceScreen: "unclear" }, "branch"],
  ["ny_clean_slate_convictions", { currentSupervision: "" }, "branch"],
  ["ny_clean_slate_dwai", { vtlSubdivision: "subdivision_two" }, "branch"],
  ["ny_clean_slate_manual_review", { eligibilityConditionsChecked: "partly" }, "branch"],
  ["ny_clean_slate_manual_review", { toldAPetitionCanBeMadeNow: "unknown" }, "branch"]
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
  ny_160_50_nonconviction: /favourable termination route|CPL § 160\.50 route/i,
  ny_clean_slate_convictions: /Clean Slate route for convictions|Clean Slate eligibility route/i,
  ny_clean_slate_dwai: /DWAI route|§ 160\.57\(1\)\(a\) route/i,
  ny_clean_slate_manual_review: /overdue Clean Slate review route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNewYorkGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NewYorkGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NewYorkRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NewYorkBranchError) outcome = "branch";
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
ok(typedStops.size === 34, `expected 34 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(NY_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "new_york", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NY_FAVOURABLE_TERMINATIONS).sort()) ===
    JSON.stringify([
      "acd_dismissed",
      "acd_pending",
      "acquitted",
      "convicted",
      "conviction_vacated",
      "declined_to_prosecute",
      "dismissed"
    ]),
  "the favourable-termination list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NY_STILL_APPEARING).sort()) ===
    JSON.stringify(["no", "yes_official_record", "yes_private_vendor"]),
  "the still-appearing list does not separate an official record from a commercial report."
);
ok(
  JSON.stringify(Object.keys(NY_OFFENCE_CLASSES).sort()) ===
    JSON.stringify([
      "class_a_felony",
      "class_a_felony_article_220",
      "felony_below_class_a",
      "misdemeanor",
      "not_known_from_the_record"
    ]),
  "the offence-class list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NY_DWAI_SUBDIVISIONS).sort()) ===
    JSON.stringify(["another_subdivision", "not_sure", "subdivision_one"]),
  "the DWAI subdivision list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NY_ELIGIBILITY_CONFIRMED).sort()) ===
    JSON.stringify(["no", "not_checked", "yes"]),
  "the eligibility-checked list is not three-valued."
);

// Both class A values must stop. The design's stop condition is "any class A
// felony, pending the Penal Law article 220 determination" — so the article 220
// carve-back is described as what the section says and is never applied here as
// an eligibility answer.
{
  for (const value of ["class_a_felony", "class_a_felony_article_220"]) {
    let stopped = false;
    try {
      deriveNewYorkGuidanceFacts("ny_clean_slate_convictions", { ...BASE, offenceClass: value });
    } catch (e) {
      stopped = e instanceof NewYorkGuidanceStopError && e.stopId.includes("class_a");
    }
    ok(stopped, `ny_clean_slate_convictions: ${value} did not stop pending the article 220 determination.`);
  }
}

// A vacated conviction must pass through carrying the unresolved flag, not be
// decided either way by a stop.
{
  const derived = deriveNewYorkGuidanceFacts("ny_160_50_nonconviction", {
    ...BASE,
    dispositionType: "conviction_vacated"
  });
  ok(
    derived.vacaturSealingIsUnresolved === true,
    "a vacated conviction is not carried through as an unresolved reading."
  );
  const plain = deriveNewYorkGuidanceFacts("ny_160_50_nonconviction", BASE);
  ok(plain.vacaturSealingIsUnresolved === false, "an ordinary dismissal is flagged as the unresolved reading.");
}

// A later conviction re-anchors the clock; it is content on the timing sheet
// and must not throw, or the sheet that explains it never renders.
{
  let threw = null;
  try {
    deriveNewYorkGuidanceFacts("ny_clean_slate_convictions", { ...BASE, subsequentConviction: "yes" });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, `a later conviction throws ${threw}, so the sheet explaining re-anchoring never renders.`);
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // The design's first packet instruction: never tell a participant their
  // record is already sealed.
  [/your (record|case|conviction|charge) (has been|was|is) (already )?sealed/i, "a claim that the reader's record is sealed"],
  [/is now (sealed|expunged|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // New York seals; it does not expunge. The marijuana destruction remedy is a
  // composed route owned by another job and is not described here.
  [/New York expunges/i, "a claim that New York expunges records"],
  [/\brecord (is|will be) (gone|erased|destroyed|deleted)\b/i, "a claim that the record ceases to exist"],
  [/MRTA|destruction request/i, "content belonging to the marijuana composed route owned by another job"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No participant submission on any of these four routes.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  [/\byou (can|may) (now )?(petition|apply) for (a |the )?(manual |court )?review\b/i, "a claim that the unpublished review can be sought now"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bNY\s+1\d{4}\b/, "a postal code"],
  // The open questions stay open, and the pending bill stays pending.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy for an unresolved failure mode"],
  [/A10951 (is|was|has been) (enacted|passed|law)/i, "a claim that the pending bill is law"],
  [/under A10951,/i, "the pending bill applied as though it were law"],
  [/a vacated conviction seals automatically/i, "an answer to the preserved vacatur question"],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds)\b/i, "internal legal-design jargon"],
  [/\b(in|by|for) (this|the) design\b/i, "internal legal-design jargon"],
  // A forward reference to a list that only follows on some sheets reads as a
  // missing section on the others. The shared constant must stand alone.
  [/the list below/i, "a forward reference to a list that does not follow on every sheet"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, prosecutor or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [
    /LegalEase cannot tell you that a record has been sealed/i,
    "the refusal to report an outcome"
  ],
  [
    /Sealing is something you confirm, not something you assume/i,
    "the design's never-assume-it-is-sealed instruction"
  ],
  [/Division of Criminal Justice Services/, "the body that holds the state criminal history record"],
  [/New York seals records; it does not erase them/, "the sealing-is-not-erasure disclosure"],
  [/no petition, motion or application/i, "the never-a-filing instruction"]
];

const PER_TRACK = {
  ny_160_50_nonconviction: [
    [/160\.50/, "the governing section"],
    [/terminates in the defendant's favour/i, "the statutory trigger"],
    [/at disposition/i, "when the sealing is directed"],
    [/adjournment in contemplation of dismissal/i, "the ACD branch"],
    [/was not read at source/i, "the preserved statement that the section was not read in full"],
    [/interests of justice/i, "the prosecutor's motion the design flags as unread"],
    [/unresolved|open question/i, "the preserved questions stated as open"],
    [/commercial background-check report|commercial vendor/i, "the separation of a vendor problem from a sealing problem"],
    [/predicate for sentence enhancement/i, "what a sealed conviction still counts for"],
    [/New York State Education Department/, "the enumerated access exceptions"]
  ],
  ny_clean_slate_convictions: [
    [/160\.57/, "the governing section"],
    [/three years/i, "the misdemeanour period"],
    [/eight years/i, "the felony period"],
    [/re-anchoring rule, not a pause/i, "the re-anchoring rule stated as a restart"],
    [/supervision of any probation or parole department/i, "the supervision condition"],
    [/168-a/, "the sex offence definition"],
    [/article 220/i, "the class A carve-back"],
    [/opposite of the CPL § 160\.59 list|opposite of/i, "the warning that § 160.59 works the other way"],
    [/16 November 2027/, "the implementation deadline"],
    [/the court system's deadline rather than yours/i, "the deadline framed as the system's"],
    [/A10951/, "the standing monitor"],
    [/not law/i, "the statement that the pending bill is not law"],
    [/Assembly Codes Committee/, "where the pending bill actually sits"],
    [/is not settled|unresolved|open question/i, "the preserved questions stated as open"],
    [/predicate for sentence enhancement/i, "what a sealed conviction still counts for"]
  ],
  ny_clean_slate_dwai: [
    [/160\.57\(1\)\(a\)/, "the governing paragraph"],
    [/1192/, "the traffic provision"],
    [/subdivision one/i, "the eligibility test"],
    [/traffic infraction/i, "what the offence is"],
    [/makes no statement about whether your record qualifies/i, "the express refusal to state eligibility"],
    [/not on its face carry the conditions/i, "the first open question"],
    [/without naming the event it runs from/i, "the second open question"],
    [/160\.55/, "the interaction with the traffic-infraction sealing route"],
    [/driving record and your criminal record are different/i, "the separation of the two records"]
  ],
  ny_clean_slate_manual_review: [
    [/16 November 2027/, "the date the form is due"],
    [/no published form and no published procedure/i, "the honest account of what does not exist"],
    [/overdue/i, "what the route is about"],
    [/not published/i, "the statement that no interim procedure is published"],
    [/re-anchor/i, "the commonest reason a calculated date is wrong"],
    [/A10951/, "the standing monitor"],
    [/not law/i, "the statement that the pending bill is not law"],
    [/is not established/i, "the honest note on whether legal aid is handling these now"]
  ]
};

/**
 * Copy that belongs to one route and must not leak onto another.
 *
 * The four families share a helper, so a mis-wired component would render a
 * plausible packet whose periods, conditions or procedure belong to a different
 * section. These are the sentences that would give that away.
 */
const FORBIDDEN_PER_TRACK = {
  ny_160_50_nonconviction: [
    [/eight years/i, "a Clean Slate waiting period on a section that has none"],
    [/supervision of any probation or parole department/i, "a Clean Slate condition on a non-conviction route"]
  ],
  ny_clean_slate_convictions: [
    [/subdivision one of Vehicle and Traffic Law/i, "the DWAI paragraph's own test"],
    [/no published form and no published procedure/i, "the overdue-review route's status disclosure"]
  ],
  ny_clean_slate_dwai: [
    [
      /must not currently be under the supervision/i,
      "a paragraph (b) condition stated as applying to the DWAI paragraph, which is unresolved"
    ],
    [/\b(you|your record|this conviction) (is|are) eligible\b/i, "an eligibility statement the design forbids on this route"],
    [/will seal on\b/i, "a sealing date on a route where what starts the clock is unknown"]
  ],
  ny_clean_slate_manual_review: [
    [/subdivision one of Vehicle and Traffic Law/i, "the DWAI paragraph's own test"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNewYorkGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "NY",
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
      jurisdiction: "NY",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NY",
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
    jurisdiction: "NY",
    jurisdictionName: "New York",
    packetName: resolved.track.assembledPacketName,
    caseReference: "2019KN-012345",
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

for (const track of NEW_YORK_GUIDANCE_TRACKS) {
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
  delete facts.caseDetails;
  let outcome = "generated";
  try {
    const derived = deriveNewYorkGuidanceFacts("ny_160_50_nonconviction", facts);
    resolvePacket({
      jurisdiction: "NY",
      trackId: "ny_160_50_nonconviction",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case details: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no claim that a record is sealed, no route carrying another route's content.`
);

console.log("");
if (failures.length > 0) {
  console.error("New York guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("New York guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(30)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
