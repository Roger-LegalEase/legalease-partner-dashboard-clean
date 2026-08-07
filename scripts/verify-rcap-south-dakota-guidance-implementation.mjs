// South Dakota guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: South Dakota is not enabled,
// every assigned track has a governing specification and matches the adopted
// packet set, all four routes render deterministically into one final guidance
// PDF each with no blank page and no detached heading, the design's one
// conditional component gates on a fact and renders when it is on, every typed
// stop and closed list fails closed with a reason, a destination and a next
// step, no stop routes back to the node the participant is standing on, no
// artifact claims relief occurred or that a record is gone, no artifact carries
// petition language, and the three things the adopted design leaves open are
// stated as open rather than answered.

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
  SOUTH_DAKOTA_GUIDANCE_TRACKS,
  SOUTH_DAKOTA_GUIDANCE_TEMPLATES,
  SD_RECORD_JURISDICTIONS,
  SD_HIGHEST_CHARGED_OFFENCES,
  SD_SIS_LEVELS,
  SouthDakotaGuidanceStopError,
  SouthDakotaRouteMismatchError,
  SouthDakotaBranchError,
  deriveSouthDakotaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/south-dakota/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/south-dakota-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["sd_23a_3_34_auto", "sd_diversion", "sd_pardon_24_14_11", "sd_sis_sealing"];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* South Dakota track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter(
    (t) => t.jurisdiction === "SD" && !t.trackId.startsWith("technical-fixture-")
  ).length === 0,
  "A real South Dakota track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("sd-")).length === 0,
  "South Dakota templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real South Dakota track in the shared registry, no South Dakota template in the shared guidance pack.");

for (const t of SOUTH_DAKOTA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, SOUTH_DAKOTA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(SOUTH_DAKOTA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of SOUTH_DAKOTA_GUIDANCE_TRACKS) {
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
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
let componentCount = 0;
let conditionalCount = 0;
for (const track of SOUTH_DAKOTA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  const designedComponents = designed?.packetSet?.components ?? [];
  ok(
    designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
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
ok(conditionalCount === 1, `expected the design's one conditional component, found ${conditionalCount}.`);
const used = new Set(
  SOUTH_DAKOTA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(SOUTH_DAKOTA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design in identity, order and requirement, none source-bound.`
);

// 4. Closed lists and typed stops.
//
// The base fixture is a Minnehaha County participant with no immigration
// question who wants a sheet rather than an opinion, on a case that clears
// every condition its route sets. Each track overrides what its own route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "south_dakota",
  immigrationQuestion: "no",
  // sd_diversion
  diversionCompletionDate: "14 March 2023",
  diversionTermsCompleted: "yes",
  entireArrestRecordCovered: "yes",
  newChargesSinceCompletion: "no",
  oneYearThirtyDaysHasRun: "yes",
  diversionCounty: "Minnehaha County",
  diversionCaseNumber: "49CRI23-000812",
  stateAttorneyFiled: "yes",
  // sd_23a_3_34_auto
  highestChargedOffense: "class_2_misdemeanor",
  caseDispositionDate: "9 June 2019",
  conditionsSatisfied: "yes",
  furtherConvictions: "no",
  fiveYearsHaveRun: "yes",
  stillShowingOnRecord: "no",
  caseCounty: "Minnehaha County",
  // sd_sis_sealing
  sisGranted: "yes",
  sisOffenceLevel: "misdemeanor",
  priorFelonyConviction: "no",
  priorSuspendedImposition: "no",
  conditionsCompleted: "yes",
  dischargeAndDismissalIssued: "yes",
  recordsStillPublic: "no",
  teachingLicence: "no",
  sexOffenceStatutes: "no",
  // sd_pardon_24_14_11
  wantsPardonApplicationPrepared: "no",
  pardonGranted: "no",
  convictionDetails: "Grand theft, Minnehaha County, 49CRI11-004410, 2011",
  pardonUnderChapter2414: "no",
  pardonDate: "not applicable",
  // Set only by the derive step; declared here so the shape is visible.
  sisTeacherLicensingWarningApplies: false
};

/**
 * The design's one conditional component, exercised as its own fixture.
 *
 * A conditional sheet that is never rendered is a sheet that was never
 * checked, so the teacher-licensing warning gets a second deterministic
 * fixture rather than being asserted about in the abstract.
 */
const CONDITIONAL_FIXTURES = [
  {
    trackId: "sd_sis_sealing",
    label: "sd_sis_sealing (teaching-licence variant)",
    facts: { teachingLicence: "yes", sexOffenceStatutes: "yes" },
    expectedComponents: 4
  }
];

const NEG = [
  // The gates that run on every assigned route.
  ["sd_diversion", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["sd_23a_3_34_auto", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["sd_sis_sealing", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["sd_pardon_24_14_11", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["sd_diversion", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_south_dakota_record"],
  ["sd_23a_3_34_auto", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_south_dakota_record"],
  ["sd_sis_sealing", { recordJurisdiction: "military" }, "mismatch", "record_is_not_a_south_dakota_record"],
  ["sd_pardon_24_14_11", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_south_dakota_record"],
  ["sd_diversion", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  ["sd_pardon_24_14_11", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  // sd_diversion.
  ["sd_diversion", { diversionTermsCompleted: "no" }, "stop", "diversion_terms_not_all_satisfied"],
  ["sd_diversion", { entireArrestRecordCovered: "no" }, "stop", "diversion_does_not_cover_the_entire_arrest_record"],
  ["sd_diversion", { newChargesSinceCompletion: "yes" }, "stop", "new_charge_within_one_year_and_thirty_days"],
  ["sd_diversion", { oneYearThirtyDaysHasRun: "no" }, "stop", "one_year_and_thirty_day_window_has_not_run"],
  ["sd_diversion", { stateAttorneyFiled: "no" }, "stop", "state_attorney_has_not_filed_after_the_window_has_run"],
  // sd_23a_3_34_auto.
  ["sd_23a_3_34_auto", { highestChargedOffense: "more_serious" }, "mismatch", "highest_charged_offence_exceeded_a_class_2_misdemeanor"],
  ["sd_23a_3_34_auto", { conditionsSatisfied: "no" }, "stop", "court_ordered_conditions_remain_unsatisfied"],
  ["sd_23a_3_34_auto", { furtherConvictions: "yes" }, "stop", "further_conviction_within_the_five_years"],
  ["sd_23a_3_34_auto", { fiveYearsHaveRun: "no" }, "stop", "five_year_period_has_not_run"],
  ["sd_23a_3_34_auto", { stillShowingOnRecord: "yes" }, "stop", "case_still_public_after_the_five_years"],
  // sd_sis_sealing.
  ["sd_sis_sealing", { sisGranted: "no" }, "mismatch", "no_suspended_imposition_of_sentence_was_granted"],
  ["sd_sis_sealing", { sisOffenceLevel: "felony" }, "stop", "felony_suspended_imposition_of_sentence"],
  ["sd_sis_sealing", { priorFelonyConviction: "yes" }, "stop", "prior_felony_conviction_before_the_suspended_imposition"],
  ["sd_sis_sealing", { priorSuspendedImposition: "yes" }, "stop", "an_earlier_suspended_imposition_of_sentence_exists"],
  ["sd_sis_sealing", { conditionsCompleted: "no" }, "stop", "court_conditions_not_completed"],
  ["sd_sis_sealing", { dischargeAndDismissalIssued: "no" }, "stop", "discharge_and_dismissal_has_not_issued_or_is_unclear"],
  ["sd_sis_sealing", { recordsStillPublic: "yes" }, "stop", "records_not_sealed_although_the_discharge_and_dismissal_issued"],
  // sd_pardon_24_14_11.
  ["sd_pardon_24_14_11", { wantsPardonApplicationPrepared: "yes" }, "stop", "pardon_application_is_outside_the_adopted_scope"],
  ["sd_pardon_24_14_11", { pardonGranted: "yes", pardonUnderChapter2414: "no" }, "stop", "pardon_was_granted_outside_the_chapter_24_14_process"],
  [
    "sd_pardon_24_14_11",
    { pardonGranted: "yes", pardonUnderChapter2414: "yes", recordsStillPublic: "yes" },
    "stop",
    "records_still_public_after_a_chapter_24_14_pardon"
  ],
  // Closed lists fail closed rather than falling through.
  ["sd_diversion", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["sd_diversion", { recordJurisdiction: "" }, "branch"],
  ["sd_diversion", { immigrationQuestion: "unsure" }, "branch"],
  ["sd_diversion", { diversionTermsCompleted: "mostly" }, "branch"],
  ["sd_23a_3_34_auto", { highestChargedOffense: "class_1_misdemeanor" }, "branch"],
  ["sd_23a_3_34_auto", { fiveYearsHaveRun: "probably" }, "branch"],
  ["sd_sis_sealing", { sisOffenceLevel: "petty_offense" }, "branch"],
  ["sd_sis_sealing", { teachingLicence: "applying" }, "branch"],
  ["sd_pardon_24_14_11", { pardonGranted: "yes", pardonUnderChapter2414: "unknown" }, "branch"]
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
  sd_diversion: /diversion programme under|23A-3-3[567] route/i,
  sd_23a_3_34_auto: /automatic public-record removal route under § 23A-3-34/i,
  sd_sis_sealing: /suspended-imposition-of-sentence route/i,
  sd_pardon_24_14_11: /chapter 24-14 pardon route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveSouthDakotaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof SouthDakotaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof SouthDakotaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof SouthDakotaBranchError) outcome = "branch";
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
ok(typedStops.size >= 25, `only ${typedStops.size} distinct typed stops carried a destination.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(SD_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "south_dakota", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(SD_HIGHEST_CHARGED_OFFENCES).sort()) ===
    JSON.stringify(["class_2_misdemeanor", "more_serious", "municipal_ordinance_violation", "petty_offense"]),
  "the highest-charged-offence list is not the design's list."
);
ok(Object.keys(SD_SIS_LEVELS).length === 2, "the suspended-imposition level list is not two-valued.");

// The conditional component's gate turns on only for the design's combination.
{
  const off = deriveSouthDakotaGuidanceFacts("sd_sis_sealing", BASE);
  ok(off.sisTeacherLicensingWarningApplies === false, "the teaching-licence gate is on for the base fixture.");
  const onlyLicence = deriveSouthDakotaGuidanceFacts("sd_sis_sealing", { ...BASE, teachingLicence: "yes" });
  ok(
    onlyLicence.sisTeacherLicensingWarningApplies === false,
    "the teaching-licence gate is on without the § 22-22-1 or § 22-22-7 answer."
  );
  const onlyOffence = deriveSouthDakotaGuidanceFacts("sd_sis_sealing", { ...BASE, sexOffenceStatutes: "yes" });
  ok(
    onlyOffence.sisTeacherLicensingWarningApplies === false,
    "the teaching-licence gate is on without the licence answer."
  );
  const both = deriveSouthDakotaGuidanceFacts("sd_sis_sealing", {
    ...BASE,
    teachingLicence: "yes",
    sexOffenceStatutes: "yes"
  });
  ok(both.sisTeacherLicensingWarningApplies === true, "the teaching-licence gate is off for the design's combination.");
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
  [/your (record|conviction|charge|case) (has been|was) (sealed|expunged|removed|destroyed)/i, "a claim that relief occurred"],
  [/is now (sealed|expunged|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The thing every South Dakota sheet must never say.
  [/(the )?record (is|will be) gone/i, "a claim that the record ceases to exist"],
  [/(sealing|removal|a pardon) (means|makes) the record (gone|disappear)/i, "a claim that sealing erases the record"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No fabricated office.
  [/\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/, "a street address"],
  [/\bSD\s+5\d{4}\b/, "a postal code"],
  // The three things the adopted design leaves open stay open.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy for an unresolved failure mode"],
  [/(the State's Attorney|the court) (must|will) be ordered to/i, "an invented compulsion route"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [/has not contacted any court, clerk, prosecutor, board or agency/i, "the disclaimer of having contacted anyone"],
  [/Division of Criminal Investigation/, "the nonpublic-record disclosure"],
  [/They do not mean the state has stopped holding it/i, "the explicit statement that sealing is not erasure"]
];

const PER_TRACK = {
  sd_diversion: [
    [/23A-3-35/, "the eligibility section"],
    [/23A-3-36/, "the State's Attorney's filing section"],
    [/23A-3-37/, "the court's grant section"],
    [/one year and thirty days/i, "the window"],
    [/petty offence or a minor traffic citation/i, "the excluded new-charge categories"],
    [/entire criminal record related to that arrest/i, "the entire-record requirement"],
    [/is unresolved/i, "the preserved open question about a State's Attorney who has not filed"],
    [/identifies no statutory remedy/i, "the statement that no remedy is identified"],
    [/no motion, application or petition on this route/i, "the never-a-motion instruction"]
  ],
  sd_23a_3_34_auto: [
    [/23A-3-34/, "the governing section"],
    [/five years/i, "the waiting period"],
    [/highest charged offence|highest offence charged|highest charge in the case/i, "the highest-charge test"],
    [/Class 2 misdemeanor/, "the top of the eligible range"],
    [/enhancement in the prosecution of a later offence|used as an enhancement/i, "the enhancement carve-out"],
    [/court personnel/i, "the continued availability to the courts"],
    [/executive pardon was the only mechanism/i, "the historical context the design carries"],
    [/some commercial write-ups state ten/i, "the five-versus-ten-year note"]
  ],
  sd_sis_sealing: [
    [/23A-27-17/, "the sealing section"],
    [/23A-27-14/, "the discharge and dismissal section"],
    [/shall order/i, "the statement that sealing is the court's obligation"],
    [/not guilty of perjury/i, "the perjury protection"],
    [/restores you to the status/i, "the restoration of status"],
    [/not confirmed at source/i, "the preserved build blocker on §§ 23A-27-13 and 23A-27-14"],
    [/is not settled|leaves open|holds it open/i, "the preserved open question about a court that has not sealed"],
    [/22-22-1/, "the teaching-licence carve-out statutes"]
  ],
  sd_pardon_24_14_11: [
    [/24-14-11/, "the governing section"],
    [/chapter 24-14/i, "the process the sealing depends on"],
    [/Board of Pardons and Paroles/, "the body that takes the application"],
    [/may not be sealed/i, "the consequence of a pardon outside the chapter"],
    [/five years/i, "the public certifying document period"],
    [/secretary of state/i, "where the certifying document is filed"],
    [/prior conviction/i, "what still counts after a pardon"],
    [/does not prepare a pardon application|does not prepare, submit or argue/i, "the scope boundary"]
  ]
};

const samples = [];

async function renderTrack(
  track,
  extraFacts,
  label,
  expectedComponents,
  sampleRole = "canonical"
) {
  const facts = deriveSouthDakotaGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "SD",
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
      jurisdiction: "SD",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "SD",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembleInput = {
    jurisdiction: "SD",
    jurisdictionName: "South Dakota",
    packetName: resolved.track.assembledPacketName,
    caseReference: "49CRI19-000730",
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
    // The teaching-licence rendering is a regression variant of the canonical
    // sd_sis_sealing packet, not a fifth assigned track. Saying so in the row
    // keeps the packet proof's canonical coverage derived from this verifier
    // rather than parsed out of a display label downstream.
    trackId: track.trackId,
    sampleRole,
    variantOfTrackId: sampleRole === "variant" ? track.trackId : null,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: components.length
  });
  return text;
}

for (const track of SOUTH_DAKOTA_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  const text = await renderTrack(track, undefined, track.trackId, expected);
  // The conditional sheet must not leak into the ordinary packet.
  if (track.trackId === "sd_sis_sealing") {
    ok(
      !/Teaching licensure and a sealed South Dakota record/i.test(text),
      "sd_sis_sealing: the conditional teaching-licence sheet rendered without its condition."
    );
  }
}

for (const fixture of CONDITIONAL_FIXTURES) {
  const track = SOUTH_DAKOTA_GUIDANCE_TRACKS.find((t) => t.trackId === fixture.trackId);
  const text = await renderTrack(
    track,
    fixture.facts,
    fixture.label,
    fixture.expectedComponents,
    "variant"
  );
  ok(
    /Teaching licensure and a sealed South Dakota record/i.test(text),
    `${fixture.label}: the conditional teaching-licence sheet did not render.`
  );
  ok(
    /has not been read at source subsection by subsection/i.test(text),
    `${fixture.label}: does not mark the carve-out's reach as unconfirmed.`
  );
  ok(
    /outside self-help/i.test(text),
    `${fixture.label}: does not state the self-help boundary the design records.`
  );
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.caseCounty;
  let outcome = "generated";
  try {
    const derived = deriveSouthDakotaGuidanceFacts("sd_23a_3_34_auto", facts);
    resolvePacket({
      jurisdiction: "SD",
      trackId: "sd_23a_3_34_auto",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case county: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("South Dakota guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("South Dakota guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(20)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
