// Virginia guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Virginia is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set, all five routes render deterministically into one final guidance PDF
// each with no blank page and no detached heading, every typed stop and closed
// list fails closed with a reason, a destination and a next step, no stop
// routes back to the node the participant is standing on, no artifact claims
// relief occurred, no artifact carries petition language, and the two things
// the adopted design refuses to resolve are stated as unresolved rather than
// decided.

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
  VIRGINIA_GUIDANCE_TRACKS,
  VIRGINIA_GUIDANCE_TEMPLATES,
  VA_AUTOMATIC_OFFENCE_LIST,
  VA_DISPOSITION_CATEGORIES,
  VA_CHARGE_LEVELS,
  VA_STATUTORY_SEAL_CATEGORIES,
  VA_WRIT_SECTIONS,
  VirginiaGuidanceStopError,
  VirginiaRouteMismatchError,
  VirginiaBranchError,
  deriveVirginiaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/virginia/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/virginia-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "va_auto_seal_clean_record",
  "va_auto_seal_convictions",
  "va_auto_seal_nonconvictions",
  "va_auto_seal_without_order",
  "va_exp_actual_innocence"
];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* Virginia track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter(
    (t) => t.jurisdiction === "VA" && !t.trackId.startsWith("technical-fixture-")
  ).length === 0,
  "A real Virginia track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(
    !RELIEF_TRACKS.some((t) => t.trackId === trackId),
    `${trackId} is already present in the shared registry.`
  );
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("va-")).length === 0,
  "Virginia templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Virginia track in the shared registry, no Virginia template in the shared guidance pack.");

for (const t of VIRGINIA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, VIRGINIA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(VIRGINIA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of VIRGINIA_GUIDANCE_TRACKS) {
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
for (const track of VIRGINIA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  const ids = (designed?.packetSet?.components ?? []).map((c) => c.componentId);
  ok(
    ids.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
  );
  for (const [index, c] of track.packetSet.components.entries()) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(ids[index] === c.componentId, `${c.componentId}: out of the design's component order.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(
      c.sourcePath === null && c.sourceSha256 === null,
      `${c.componentId}: guidance names an official source.`
    );
    componentCount += 1;
  }
  // No assigned track may depend on an official source binary, and no assigned
  // track may carry a participant-facing filing.
  for (const c of designed?.packetSet?.components ?? []) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
}
const used = new Set(
  VIRGINIA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(VIRGINIA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design in identity and order, none source-bound.`
);

// 4. Closed lists and typed stops.
//
// The base fixture is a Roanoke petit-larceny case dismissed in 2015, for a
// participant with no immigration or firearm question who wants a sheet rather
// than an opinion. Two tracks need a conviction instead, so they get one.
const BASE = {
  wantsEligibilityAdvice: "no",
  immigrationQuestion: "no",
  firearmEligibilityQuestion: "no",
  wantsRemovalNotRestriction: "no",
  dismissedAfterFactsSufficientForGuilt: "no",
  needsReliefOnATimetable: "no",
  dispositionIsPaperEraOrAmbiguous: "no",
  petitionerName: "Marcus A. Whitfield, arrested as Marcus Anthony Whitfield",
  dateOfBirth: "3 September 1988",
  dispositionLocality: "City of Roanoke",
  courtLevel: "general district court",
  chargeIdentity: "Petit larceny, Va. Code § 18.2-96",
  arrestDate: "12 April 2015, Roanoke Police Department",
  dispositionDetail: "Dismissed on 7 October 2015",
  offenseDate: "9 April 2015",
  recordCategory: "dismissed",
  recordStillVisible: "yes",
  automaticOffenceList: "enumerated_automatic",
  offenceDateBefore1986: "no",
  sameDateIneligibleConviction: "no",
  reportableConvictionSince: "no",
  sevenYearsHaveRun: "yes",
  chargeLevel: "misdemeanor",
  otherwiseCleanRecord: "yes",
  statutorySealCategory: "former_marijuana_possession",
  ancillaryMatterAttached: "no",
  writGranted: "yes",
  writGrantedDate: "18 February 2026",
  writSection: "section_19_2_327_5",
  convictingCourt: "Circuit Court of the City of Roanoke, case CR15-000412",
  representedByCounsel: "yes",
  orderEntered: "yes"
};

/** Per-track overrides so each route's own qualifying answer is given. */
const TRACK_FIXTURES = {
  va_auto_seal_convictions: {
    recordCategory: "convicted",
    dispositionDetail: "Convicted on 7 October 2015"
  },
  va_exp_actual_innocence: {
    recordCategory: "convicted",
    dispositionDetail: "Convicted on 7 October 2015; vacated 18 February 2026"
  }
};

const NEG = [
  // The gates that run on every assigned route.
  ["va_auto_seal_convictions", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["va_exp_actual_innocence", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["va_auto_seal_without_order", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["va_auto_seal_nonconvictions", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  ["va_exp_actual_innocence", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  ["va_auto_seal_clean_record", { firearmEligibilityQuestion: "yes" }, "stop", "firearm_eligibility_is_the_question"],
  ["va_auto_seal_without_order", { firearmEligibilityQuestion: "yes" }, "stop", "firearm_eligibility_is_the_question"],
  // The gates shared by the four automatic routes.
  ["va_auto_seal_nonconvictions", { wantsRemovalNotRestriction: "yes" }, "mismatch", "participant_wants_removal_rather_than_restriction"],
  ["va_auto_seal_clean_record", { wantsRemovalNotRestriction: "yes" }, "mismatch", "participant_wants_removal_rather_than_restriction"],
  [
    "va_auto_seal_nonconvictions",
    { wantsRemovalNotRestriction: "yes", dismissedAfterFactsSufficientForGuilt: "yes" },
    "stop",
    "removal_sought_where_the_dismissal_followed_facts_sufficient_for_guilt"
  ],
  ["va_auto_seal_convictions", { needsReliefOnATimetable: "yes" }, "mismatch", "relief_is_needed_on_a_timetable_the_automatic_route_cannot_hold"],
  ["va_auto_seal_without_order", { needsReliefOnATimetable: "yes" }, "mismatch", "relief_is_needed_on_a_timetable_the_automatic_route_cannot_hold"],
  ["va_auto_seal_nonconvictions", { dispositionIsPaperEraOrAmbiguous: "yes" }, "stop", "disposition_is_paper_era_or_ambiguous"],
  ["va_auto_seal_clean_record", { dispositionIsPaperEraOrAmbiguous: "yes" }, "stop", "disposition_is_paper_era_or_ambiguous"],
  // va_auto_seal_convictions.
  ["va_auto_seal_convictions", { recordCategory: "dismissed" }, "mismatch", "disposition_is_not_a_conviction"],
  ["va_auto_seal_convictions", { automaticOffenceList: "section_4_1_305" }, "mismatch", "offence_is_on_the_petition_list_but_not_the_automatic_list"],
  ["va_auto_seal_convictions", { automaticOffenceList: "section_18_2_265_3_a" }, "mismatch", "offence_is_on_the_petition_list_but_not_the_automatic_list"],
  ["va_auto_seal_convictions", { automaticOffenceList: "other" }, "mismatch", "offence_is_on_neither_the_automatic_nor_the_petition_list"],
  ["va_auto_seal_convictions", { offenceDateBefore1986: "yes" }, "mismatch", "offence_date_precedes_the_1_january_1986_floor"],
  ["va_auto_seal_convictions", { sameDateIneligibleConviction: "yes" }, "mismatch", "ineligible_conviction_entered_on_the_same_date"],
  ["va_auto_seal_convictions", { reportableConvictionSince: "yes" }, "stop", "reportable_conviction_during_the_seven_years"],
  ["va_auto_seal_convictions", { sevenYearsHaveRun: "no" }, "stop", "seven_year_period_has_not_run"],
  // va_auto_seal_nonconvictions.
  ["va_auto_seal_nonconvictions", { recordCategory: "convicted" }, "mismatch", "disposition_is_a_conviction"],
  // va_auto_seal_clean_record.
  ["va_auto_seal_clean_record", { recordCategory: "convicted" }, "mismatch", "disposition_is_a_conviction"],
  ["va_auto_seal_clean_record", { chargeLevel: "felony" }, "mismatch", "non_conviction_charge_was_a_felony"],
  ["va_auto_seal_clean_record", { otherwiseCleanRecord: "no" }, "mismatch", "record_carries_another_conviction_or_a_deferred_dismissal"],
  // va_auto_seal_without_order.
  ["va_auto_seal_without_order", { statutorySealCategory: "neither" }, "mismatch", "record_is_neither_a_former_marijuana_possession_offence_nor_a_traffic_infraction"],
  ["va_auto_seal_without_order", { ancillaryMatterAttached: "yes" }, "mismatch", "ancillary_matter_attached_to_the_sealed_offence"],
  // va_exp_actual_innocence.
  ["va_exp_actual_innocence", { recordCategory: "dismissed" }, "mismatch", "charge_did_not_end_in_a_conviction"],
  ["va_exp_actual_innocence", { writSection: "not_a_writ_of_actual_innocence" }, "mismatch", "conviction_was_not_vacated_by_a_writ_of_actual_innocence"],
  ["va_exp_actual_innocence", { writGranted: "no" }, "stop", "writ_of_actual_innocence_has_not_been_granted"],
  ["va_exp_actual_innocence", { orderEntered: "no" }, "stop", "order_not_entered_although_the_court_holds_the_writ"],
  [
    "va_exp_actual_innocence",
    { orderEntered: "no", representedByCounsel: "no" },
    "stop",
    "order_not_entered_although_the_court_holds_the_writ"
  ],
  // Closed lists fail closed rather than falling through.
  ["va_auto_seal_convictions", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["va_auto_seal_convictions", { immigrationQuestion: "" }, "branch"],
  ["va_auto_seal_convictions", { firearmEligibilityQuestion: "unsure" }, "branch"],
  ["va_auto_seal_convictions", { recordCategory: "deferred" }, "branch"],
  ["va_auto_seal_convictions", { automaticOffenceList: "section_18_2_57" }, "branch"],
  ["va_auto_seal_clean_record", { chargeLevel: "infraction" }, "branch"],
  ["va_auto_seal_without_order", { statutorySealCategory: "cannabis" }, "branch"],
  ["va_exp_actual_innocence", { writSection: "19.2-327.5" }, "branch"],
  [
    "va_auto_seal_nonconvictions",
    { wantsRemovalNotRestriction: "yes", dismissedAfterFactsSufficientForGuilt: "probably" },
    "branch"
  ]
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
  va_auto_seal_convictions: /19\.2-392\.6 and (§ )?19\.2-392\.7|enumerated conviction/i,
  va_auto_seal_nonconvictions: /19\.2-392\.8 and 19\.2-392\.10/i,
  va_auto_seal_clean_record: /19\.2-392\.11\b/,
  va_auto_seal_without_order: /19\.2-392\.6:1 and 19\.2-392\.17/,
  va_exp_actual_innocence: /19\.2-392\.2\(J\)/
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveVirginiaGuidanceFacts(trackId, {
      ...BASE,
      ...(TRACK_FIXTURES[trackId] ?? {}),
      ...override
    });
  } catch (e) {
    if (e instanceof VirginiaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof VirginiaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof VirginiaBranchError) outcome = "branch";
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
ok(typedStops.size >= 30, `only ${typedStops.size} distinct typed stops carried a destination.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(VA_AUTOMATIC_OFFENCE_LIST).sort()) ===
    JSON.stringify(["enumerated_automatic", "other", "section_18_2_265_3_a", "section_4_1_305"]),
  "the automatic-offence list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(VA_DISPOSITION_CATEGORIES).sort()) ===
    JSON.stringify(["acquitted", "convicted", "dismissed", "nolle_prosequi"]),
  "the disposition list is not the design's list."
);
ok(Object.keys(VA_CHARGE_LEVELS).length === 2, "the charge-level list is not two-valued.");
ok(Object.keys(VA_STATUTORY_SEAL_CATEGORIES).length === 3, "the statutory-sealing list is not three-valued.");
ok(Object.keys(VA_WRIT_SECTIONS).length === 3, "the writ-section list is not three-valued.");

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
  [/is now (sealed|expunged|confidential)/i, "a claim that the record is already sealed"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  [/(your|the) record (will|should) be sealed/i, "a promise about automatic timing"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No fabricated office.
  [/\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/, "a street address"],
  [/\bVA\s+2\d{4}\b/, "a postal code"],
  // The two tensions the adopted design refuses to resolve stay unresolved.
  [/the (later|earlier|new|old) version (governs|applies|controls|is the one)/i, "a decision on the unresolved statutory-version question"],
  [/(automatic sealing|the record) (usually|typically|normally) (takes|happens|occurs)/i, "an invented timing expectation"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [/has not contacted any court, clerk, agency or officer/i, "the disclaimer of having contacted anyone"],
  [/Central Criminal Records Exchange/, "the record source the participant checks"],
  [/has not been settled here/i, "the preserved unresolved statutory-version question"],
  [/1 December 2026/, "the § 19.2-392.2 version date"]
];

const PER_TRACK = {
  va_auto_seal_convictions: [
    [/19\.2-392\.6\b/, "the governing section"],
    [/19\.2-392\.7\b/, "the section that carries out the sealing"],
    [/1 January 1986/, "the offence-date floor"],
    [/seven years/i, "the waiting period"],
    [/19\.2-392\.6\(C\)/, "the same-date ineligible-conviction bar"],
    [/19\.2-390\(A\)/, "the reportable-conviction reference"],
    [/Title 46\.2/, "the traffic-infraction exclusion"],
    [/4\.1-305/, "the first petition-list-only offence"],
    [/18\.2-265\.3/, "the second petition-list-only offence"],
    [/19\.2-392\.6\(D\)/, "the express preservation of the petition routes"],
    [/19\.2-392\.12:1/, "the first fallback petition route"],
    [/Automatic describes what the law does/, "the automatic-is-not-a-report warning"],
    [/1 October 2026/, "the verification-portal date"],
    [/1 July 2027/, "the § 19.2-392.6 version date"]
  ],
  va_auto_seal_nonconvictions: [
    [/19\.2-392\.8/, "the first governing section"],
    [/19\.2-392\.10/, "the second governing section"],
    [/Dotson/, "the stipulation screen the design names"],
    [/19\.2-392\.2\b/, "the expungement comparison"],
    [/Sealing restricts access/, "the sealing-is-not-expungement disclosure"],
    [/19\.2-392\.13/, "the permitted-uses section"],
    [/National Instant Criminal Background Check System/, "the NICS carve-out"],
    [/19\.2-392\.6\(D\)/, "the express preservation of the petition routes"],
    [/1 July 2027/, "the § 19.2-392.6 version date"]
  ],
  va_auto_seal_clean_record: [
    [/19\.2-392\.11/, "the governing section"],
    [/17\.1-502\(B1\)/, "the case-management interface requirement"],
    [/at-least-annual/i, "the distribution cadence"],
    [/deferred and dismissed/, "the clean-record condition"],
    [/seal at different times in different courts/i, "the uneven-timing disclosure"],
    [/19\.2-392\.6\(D\)/, "the express preservation of the petition routes"],
    [/1 July 2027/, "the § 19.2-392.6 version date"]
  ],
  va_auto_seal_without_order: [
    [/19\.2-392\.6:1/, "the marijuana-possession section"],
    [/19\.2-392\.17/, "the traffic-infraction section"],
    [/19\.2-392\.12:1\(B\)/, "the ancillary-matter route"],
    [/whatever the offence date/i, "the absence of the 1986 floor on the ancillary route"],
    [/No fee attaches to a record that seals by force of statute/i, "the never-charge instruction"],
    [/phasing in/i, "the phasing disclosure"],
    [/19\.2-392\.6\(D\)/, "the express preservation of the petition routes"],
    [/1 July 2027/, "the § 19.2-392.6 version date"]
  ],
  va_exp_actual_innocence: [
    [/19\.2-392\.2\(J\)/, "the governing subsection"],
    [/19\.2-327\.5/, "the biological-evidence writ"],
    [/19\.2-327\.13/, "the non-biological-evidence writ"],
    [/appellate post-conviction/i, "the scope statement"],
    [/does not prepare or litigate a writ/i, "the declined-work statement"],
    [/not a finding that the writ cannot be sought/i, "the guard against implying the route is unavailable"],
    [/Sealing restricts access/, "the sealing-is-not-expungement disclosure"]
  ]
};

const samples = [];
for (const track of VIRGINIA_GUIDANCE_TRACKS) {
  const facts = deriveVirginiaGuidanceFacts(track.trackId, {
    ...BASE,
    ...(TRACK_FIXTURES[track.trackId] ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "VA",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  ok(
    resolved.components.length === track.packetSet.components.length,
    `${track.trackId}: resolution dropped a component.`
  );

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "VA",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "VA",
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

  const assembled = await assemblePacketPdf({
    jurisdiction: "VA",
    jurisdictionName: "Virginia",
    packetName: resolved.track.assembledPacketName,
    caseReference: "CR15-000412",
    title: resolved.track.assembledPacketTitle,
    components
  });
  const againAssembled = await assemblePacketPdf({
    jurisdiction: "VA",
    jurisdictionName: "Virginia",
    packetName: resolved.track.assembledPacketName,
    caseReference: "CR15-000412",
    title: resolved.track.assembledPacketTitle,
    components
  });
  ok(assembled.sha256 === againAssembled.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${track.trackId}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, track.trackId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${track.trackId}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED_EVERYWHERE) ok(pattern.test(text), `${track.trackId}: missing ${why}.`);
  for (const [pattern, why] of PER_TRACK[track.trackId]) {
    ok(pattern.test(text), `${track.trackId}: missing ${why}.`);
  }

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
    // A section heading is the last thing on a page only when its body has been
    // pushed onto the next one. The renderer has no widow control and this job
    // does not own it, so the guard lives here and the fix is copy length.
    const lastLine = page.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
    ok(
      !isSectionHeading(lastLine),
      `${track.trackId}: page ${i + 1} ends on the detached heading "${lastLine}".`
    );
  }
  ok(pages.length === assembled.pageCount, `${track.trackId}: page count disagrees with the assembler.`);

  samples.push({
    trackId: track.trackId,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: components.length
  });
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE, ...TRACK_FIXTURES.va_auto_seal_convictions };
  delete facts.dispositionLocality;
  let outcome = "generated";
  try {
    const derived = deriveVirginiaGuidanceFacts("va_auto_seal_convictions", facts);
    resolvePacket({
      jurisdiction: "VA",
      trackId: "va_auto_seal_convictions",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing disposition locality: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Virginia guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Virginia guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(30)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
