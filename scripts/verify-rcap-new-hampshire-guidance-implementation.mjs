// New Hampshire guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: New Hampshire is not enabled,
// every assigned track has a governing specification and matches the adopted
// packet set in component identity, order and requirement, all three routes
// render deterministically into one final guidance PDF each with no blank page
// and no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the node
// the participant is standing on, no artifact claims relief occurred or that a
// record has been erased, no artifact carries petition structure or a
// participant submission instruction, no artifact carries internal legal-design
// jargon, and the five things the adopted design leaves open are stated as open
// rather than answered.
//
// Why there is no regression variant here: the three adopted packet sets make
// all eleven components required, and no New Hampshire template interpolates a
// participant answer, so a second fixture on the same track would render
// byte-for-byte the same packet. The branches that do matter are typed stops,
// and all twenty-eight of them are exercised below as negative cases.

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
  NEW_HAMPSHIRE_GUIDANCE_TRACKS,
  NEW_HAMPSHIRE_GUIDANCE_TEMPLATES,
  NH_RECORD_JURISDICTIONS,
  NH_NONCONVICTION_DISPOSITIONS,
  NH_CHARGE_COVERAGE,
  NH_POST_CONVICTION_ORDER_TYPES,
  NH_VACATUR_CUTOVER,
  NH_PUBLISHED_OPINION,
  NewHampshireGuidanceStopError,
  NewHampshireRouteMismatchError,
  NewHampshireBranchError,
  deriveNewHampshireGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/new-hampshire/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/new-hampshire-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["nh_auto_nonconviction", "nh_auto_vacated", "nh_supreme_court_record"];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* New Hampshire track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter(
    (t) => t.jurisdiction === "NH" && !t.trackId.startsWith("technical-fixture-")
  ).length === 0,
  "A real New Hampshire track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nh-")).length === 0,
  "New Hampshire templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note(
  "1. Enablement: no real New Hampshire track in the shared registry, no New Hampshire template in the shared guidance pack."
);

for (const t of NEW_HAMPSHIRE_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEW_HAMPSHIRE_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(NEW_HAMPSHIRE_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NEW_HAMPSHIRE_GUIDANCE_TRACKS) {
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
for (const track of NEW_HAMPSHIRE_GUIDANCE_TRACKS) {
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
    ok(
      c.sourcePath === null && c.sourceSha256 === null,
      `${c.componentId}: guidance names an official source.`
    );
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
ok(conditionalCount === 0, `the New Hampshire design has no conditional component, found ${conditionalCount}.`);
const used = new Set(
  NEW_HAMPSHIRE_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(NEW_HAMPSHIRE_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

// No template may interpolate a participant answer. That is what makes one
// canonical fixture per track sufficient, and it is asserted rather than
// assumed, so a later copy edit that adds a placeholder fails here.
for (const [id, template] of Object.entries(NEW_HAMPSHIRE_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Rockingham County participant who wants a sheet rather
// than an opinion, holds no federal, database or firearm expectation, and whose
// case clears every condition its route sets. Each track overrides what its own
// route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "new_hampshire",
  needsFederalOrImmigrationRecognition: "no",
  expectsPrivateDatabaseRemoval: "no",
  expectsFirearmRightsRestored: "no",
  // nh_auto_nonconviction
  dispositionDate: "12 April 2024",
  dispositionType: "dismissed",
  disposedOnOrAfterJanuary2019: "yes",
  allChargesFromTheArrest: "all_charges",
  stateAppealTaken: "no",
  thirtyDaysHaveRun: "yes",
  recordStillAppears: "no",
  disposingCourt: "Circuit Court, 10th Circuit District Division, Brentwood",
  caseNumber: "473-2024-CR-00318",
  // nh_auto_vacated
  seekingTheVacatur: "no",
  postConvictionOrderType: "vacated",
  vacaturDate: "3 February 2025",
  originalDispositionDate: "18 September 2021",
  januaryTwentyNineteenCutover: "both",
  convictingAndVacatingCourt: "Rockingham County Superior Court entered it and vacated it",
  // nh_supreme_court_record
  caseWentToTheSupremeCourt: "yes",
  wantsSupremeCourtPetitionPrepared: "no",
  supremeCourtOpinionPublished: "do_not_know",
  supremeCourtCaseIdentifiers: "State v. R.M., docket 2022-0184",
  trialCourtIdentifiers: "Rockingham County Superior Court, 218-2021-CR-00994"
};

const NEG = [
  // The five gates that run on every assigned route.
  ["nh_auto_nonconviction", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["nh_auto_vacated", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["nh_supreme_court_record", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["nh_auto_nonconviction", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_new_hampshire_record"],
  ["nh_auto_vacated", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_new_hampshire_record"],
  ["nh_supreme_court_record", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_new_hampshire_record"],
  [
    "nh_auto_nonconviction",
    { needsFederalOrImmigrationRecognition: "yes" },
    "stop",
    "federal_or_immigration_recognition_needed"
  ],
  ["nh_auto_vacated", { needsFederalOrImmigrationRecognition: "yes" }, "stop", "federal_or_immigration_recognition_needed"],
  [
    "nh_supreme_court_record",
    { needsFederalOrImmigrationRecognition: "yes" },
    "stop",
    "federal_or_immigration_recognition_needed"
  ],
  ["nh_auto_nonconviction", { expectsPrivateDatabaseRemoval: "yes" }, "stop", "private_database_removal_expected"],
  ["nh_auto_vacated", { expectsPrivateDatabaseRemoval: "yes" }, "stop", "private_database_removal_expected"],
  ["nh_supreme_court_record", { expectsPrivateDatabaseRemoval: "yes" }, "stop", "private_database_removal_expected"],
  ["nh_auto_nonconviction", { expectsFirearmRightsRestored: "yes" }, "stop", "firearm_rights_restoration_expected"],
  ["nh_auto_vacated", { expectsFirearmRightsRestored: "yes" }, "stop", "firearm_rights_restoration_expected"],
  ["nh_supreme_court_record", { expectsFirearmRightsRestored: "yes" }, "stop", "firearm_rights_restoration_expected"],
  // nh_auto_nonconviction.
  ["nh_auto_nonconviction", { dispositionType: "convicted" }, "mismatch", "case_did_not_end_in_a_non_conviction"],
  ["nh_auto_nonconviction", { dispositionType: "still_pending" }, "mismatch", "case_did_not_end_in_a_non_conviction"],
  [
    "nh_auto_nonconviction",
    { disposedOnOrAfterJanuary2019: "no" },
    "mismatch",
    "case_disposed_of_before_january_1_2019"
  ],
  [
    "nh_auto_nonconviction",
    { allChargesFromTheArrest: "some_charges" },
    "stop",
    "only_some_charges_from_the_arrest_ended_that_way"
  ],
  ["nh_auto_nonconviction", { stateAppealTaken: "yes" }, "stop", "state_appeal_taken_under_rsa_606_10"],
  ["nh_auto_nonconviction", { thirtyDaysHaveRun: "no" }, "stop", "thirty_day_period_has_not_run"],
  [
    "nh_auto_nonconviction",
    { recordStillAppears: "yes" },
    "stop",
    "record_still_appears_after_the_thirty_days"
  ],
  // nh_auto_vacated.
  [
    "nh_auto_vacated",
    { seekingTheVacatur: "yes" },
    "stop",
    "obtaining_the_vacatur_is_post_conviction_litigation"
  ],
  ["nh_auto_vacated", { postConvictionOrderType: "reversed" }, "stop", "order_is_not_a_vacatur"],
  ["nh_auto_vacated", { postConvictionOrderType: "set_aside" }, "stop", "order_is_not_a_vacatur"],
  ["nh_auto_vacated", { postConvictionOrderType: "new_trial" }, "stop", "order_is_not_a_vacatur"],
  ["nh_auto_vacated", { postConvictionOrderType: "sentence_modified" }, "stop", "order_is_not_a_vacatur"],
  [
    "nh_auto_vacated",
    { januaryTwentyNineteenCutover: "neither" },
    "mismatch",
    "neither_date_falls_on_or_after_january_1_2019"
  ],
  ["nh_auto_vacated", { recordStillAppears: "yes" }, "stop", "record_still_appears_after_the_vacatur"],
  // nh_supreme_court_record.
  [
    "nh_supreme_court_record",
    { caseWentToTheSupremeCourt: "no" },
    "mismatch",
    "case_did_not_go_to_the_supreme_court"
  ],
  [
    "nh_supreme_court_record",
    { wantsSupremeCourtPetitionPrepared: "yes" },
    "stop",
    "supreme_court_petition_is_outside_the_packet_product"
  ],
  [
    "nh_supreme_court_record",
    { supremeCourtOpinionPublished: "published" },
    "stop",
    "published_opinion_cannot_be_annulled"
  ],
  // Closed lists fail closed rather than falling through.
  ["nh_auto_nonconviction", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["nh_auto_nonconviction", { recordJurisdiction: "" }, "branch"],
  ["nh_auto_nonconviction", { needsFederalOrImmigrationRecognition: "unsure" }, "branch"],
  ["nh_auto_nonconviction", { expectsPrivateDatabaseRemoval: "hopefully" }, "branch"],
  ["nh_auto_nonconviction", { expectsFirearmRightsRestored: "perhaps" }, "branch"],
  ["nh_auto_nonconviction", { dispositionType: "nolle_prosequi" }, "branch"],
  ["nh_auto_nonconviction", { allChargesFromTheArrest: "most_charges" }, "branch"],
  ["nh_auto_nonconviction", { thirtyDaysHaveRun: "probably" }, "branch"],
  ["nh_auto_vacated", { postConvictionOrderType: "annulled" }, "branch"],
  ["nh_auto_vacated", { januaryTwentyNineteenCutover: "unknown" }, "branch"],
  ["nh_supreme_court_record", { supremeCourtOpinionPublished: "maybe" }, "branch"],
  ["nh_supreme_court_record", { caseWentToTheSupremeCourt: "" }, "branch"]
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
  nh_auto_nonconviction: /automatic annulment route|II-a\(a\) route/i,
  nh_auto_vacated: /vacated-conviction annulment route|II-a\(b\) route/i,
  nh_supreme_court_record: /supreme court record route|RSA 651:5, XV route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNewHampshireGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NewHampshireGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NewHampshireRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NewHampshireBranchError) outcome = "branch";
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
ok(typedStops.size === 28, `expected 28 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(NH_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "new_hampshire", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NH_NONCONVICTION_DISPOSITIONS).sort()) ===
    JSON.stringify(["convicted", "dismissed", "not_guilty", "not_prosecuted", "still_pending"]),
  "the non-conviction disposition list is not the design's list."
);
ok(Object.keys(NH_CHARGE_COVERAGE).length === 2, "the charge-coverage list is not two-valued.");
ok(
  JSON.stringify(Object.keys(NH_POST_CONVICTION_ORDER_TYPES).sort()) ===
    JSON.stringify(["new_trial", "reversed", "sentence_modified", "set_aside", "vacated"]),
  "the post-conviction order list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NH_VACATUR_CUTOVER).sort()) ===
    JSON.stringify(["both", "neither", "original_only", "vacatur_only"]),
  "the 1 January 2019 cutover list is not four-valued."
);
ok(
  JSON.stringify(Object.keys(NH_PUBLISHED_OPINION).sort()) ===
    JSON.stringify(["do_not_know", "not_published", "published"]),
  "the published-opinion list is not the design's list."
);

// The preserved II-a(b) cutover question is preserved, not decided. Only the
// combination that is outside the subparagraph on *either* reading may stop the
// route; the two mixed answers must pass through carrying the open question.
{
  for (const value of ["both", "original_only", "vacatur_only"]) {
    const derived = deriveNewHampshireGuidanceFacts("nh_auto_vacated", {
      ...BASE,
      januaryTwentyNineteenCutover: value
    });
    ok(
      derived.vacaturCutoverBranch === value,
      `nh_auto_vacated: the ${value} cutover answer did not survive the derive step.`
    );
    ok(
      derived.vacaturCutoverIsUnresolved === (value !== "both"),
      `nh_auto_vacated: the ${value} cutover answer is marked wrongly against the open question.`
    );
  }
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
  // Nothing here may report an outcome in the participant's own case.
  [
    /your (record|conviction|charge|case) (has been|was) (annulled|sealed|expunged|removed|destroyed)/i,
    "a claim that relief occurred"
  ],
  [/is now (annulled|sealed|expunged|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The thing every New Hampshire sheet must never say. The design's list of
  // statements LegalEase must not generate begins with the suggestion that New
  // Hampshire expunges, deletes or destroys records.
  [/New Hampshire (expunges|deletes|destroys)/i, "a claim that New Hampshire erases records"],
  [/\brecord (is|will be) (gone|erased|destroyed|deleted)\b/i, "a claim that the record ceases to exist"],
  [/annulment (means|makes) the record (gone|disappear)/i, "a claim that annulment erases the record"],
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
  [/\bNH\s+0\d{4}\b/, "a postal code"],
  // The five things the adopted design leaves open stay open.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy for an unresolved failure mode"],
  [/(the court|the clerk|the criminal records unit) (must|will) be ordered to/i, "an invented compulsion route"],
  [/a nolle prosequi (is|counts as|does not count)/i, "an answer to the preserved nolle prosequi question"],
  [/paragraph VI (does not|cannot|will not) (block|apply|gate)/i, "an answer to the preserved paragraph VI question"],
  [/the annulment is immediate on (the )?vacatur\b(?! is)/i, "an answer to the preserved immediacy question"],
  // Internal legal-design vocabulary must not reach participant copy.
  [/\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i, "internal legal-design jargon"],
  [/\bthe design (records|says|treats|classifies)\b/i, "internal legal-design jargon"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, prosecutor, agency or police unit/i,
    "the disclaimer of having contacted anyone"
  ],
  [/New Hampshire calls this annulment, not expungement/i, "the annulment-is-not-expungement disclosure"],
  [/continue to exist/i, "the explicit statement that annulment is not erasure"],
  [/651:5, XVI and XVII/, "the paragraph XVI and XVII disclosure about commercial databases"],
  [/no federal effect and no immigration effect/i, "the federal and immigration limit"],
  [/restore firearm rights/i, "the firearm-rights limit"],
  [/LegalEase cannot tell you that a record has been annulled/i, "the refusal to report an outcome"]
];

const PER_TRACK = {
  nh_auto_nonconviction: [
    [/651:5, II-a\(a\)/, "the governing subparagraph"],
    [/thirty days/i, "the statutory period"],
    [/606:10/, "the appeal provision that suspends the period"],
    [/1 January 2019/, "the cutover date"],
    [/all the charges that resulted from the arrest/i, "the all-charges requirement"],
    [/nolle prosequi/i, "the preserved question about a decision not to prosecute"],
    [/no settled answer/i, "the statement that a preserved question has no settled answer"],
    [/[Pp]aragraph VI/, "the preserved question about paragraph VI"],
    [/no express enforcement route/i, "the preserved question about a record that still appears"],
    [/651:5, X\(f\)/, "the only permitted form of inquiry"],
    [/has not been annulled by a court/, "the wording of the permitted inquiry"],
    [/651:5, X\(c\)/, "the limited access list"],
    [/651:5, XI\(b\)/, "what law enforcement keeps"],
    [/259:39/, "the habitual offender provision"],
    [/[Pp]aragraph XII, which once made disclosure/, "the repeal of the disclosure offence"],
    [/no petition, motion or application/i, "the never-a-filing instruction"],
    [/NHJB-2956/, "the criminal record release authorization the participant uses to verify"],
    [/IX and X\(d\) exempt the person/, "the non-conviction fee exemption"]
  ],
  nh_auto_vacated: [
    [/651:5, II-a\(b\)/, "the governing subparagraph"],
    [/subsequently vacated/i, "the statutory trigger"],
    [/post-conviction litigation/i, "the boundary on obtaining the vacatur"],
    [/no thirty-day clock|states no period/i, "the absence of any stated period"],
    [/whether the annulment is immediate on the vacatur is/i, "the preserved immediacy question"],
    [/1 January 2019/, "the cutover date"],
    [/no settled answer|Neither question has a settled answer/i, "the preserved cutover question"],
    [/651:5, X\(f\)/, "the only permitted form of inquiry"],
    [/651:5, XI\(b\)/, "what law enforcement keeps"],
    [/259:39/, "the habitual offender provision"],
    [/no petition, motion or application/i, "the never-a-filing instruction"],
    [/NHJB-2956/, "the criminal record release authorization the participant uses to verify"],
    [/would reach a vacated conviction/, "the open question about whether the fee exemptions reach a vacated conviction"]
  ],
  nh_supreme_court_record: [
    [/651:5, XV/, "the governing paragraph"],
    [/New Hampshire Reports/, "the published-opinion exception"],
    [/permanent and searchable artifact/i, "what a published opinion means in practice"],
    [/appellate work/i, "the reason this route ends in a referral"],
    [/No form is published for it|no published form for it was found/i, "the absence of a published form"],
    [/Not determined/, "the honest account of what is not known about cost"],
    [/trial-court record/i, "the separation of the appellate record from the trial-court record"],
    [/prepares no petition|prepares nothing|does not prepare it/i, "the statement that nothing is prepared"],
    [/Paragraph XV states nothing about notice/, "the honest account of what paragraph XV says about notice"]
  ]
};

/**
 * Copy that belongs to one route and must not leak onto another.
 *
 * Both entries here are real defects that were caught by reading the rendered
 * pages rather than by an assertion: the RSA 651:5, IX and X(d) fee exemption
 * is a non-conviction rule and the order-of-annulment notification is the II-a
 * mechanism, so neither may sit in a helper shared by all three families.
 */
const FORBIDDEN_PER_TRACK = {
  nh_auto_nonconviction: [
    [/would reach a vacated conviction/, "the vacated-conviction fee question, which belongs to another route"]
  ],
  nh_auto_vacated: [
    [
      /exempt the person from the Department of Corrections/,
      "the non-conviction fee exemption, which the design leaves open for a vacated conviction"
    ]
  ],
  nh_supreme_court_record: [
    [
      /exempt the person from the Department of Corrections/,
      "the non-conviction fee exemption, which paragraph XV says nothing about"
    ],
    [
      /On entry of an order of annulment the court notifies/,
      "the II-a notice provision, which paragraph XV does not carry"
    ]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNewHampshireGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "NH",
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
      jurisdiction: "NH",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NH",
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
    jurisdiction: "NH",
    jurisdictionName: "New Hampshire",
    packetName: resolved.track.assembledPacketName,
    caseReference: "473-2024-CR-00318",
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

for (const track of NEW_HAMPSHIRE_GUIDANCE_TRACKS) {
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
  delete facts.disposingCourt;
  let outcome = "generated";
  try {
    const derived = deriveNewHampshireGuidanceFacts("nh_auto_nonconviction", facts);
    resolvePacket({
      jurisdiction: "NH",
      trackId: "nh_auto_nonconviction",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing disposing court: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("New Hampshire guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("New Hampshire guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(24)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
