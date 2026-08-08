// North Carolina guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: North Carolina is not enabled,
// the assigned track has a governing specification and matches the adopted
// packet set and manifest in component identity, order and requirement, the
// route renders deterministically into one final guidance PDF with no blank
// page and no detached heading, every typed stop and every closed list fails
// closed with a reason, a destination and a next step, no stop routes back to
// the node the participant is standing on, no artifact carries petition
// structure or a submission instruction, and every place the design says the
// law runs out is stated rather than papered over.
//
// Five rules here are North Carolina's own:
//
//   - **Nothing is filed and no petition is ever generated on this route.**
//     Relief runs by operation of law. The design goes further and says never
//     generate a petition anywhere before checking whether the case already
//     cleared, which is why a request for one on an unchecked case is a typed
//     stop rather than a note.
//   - **The court clearing its record is not every agency clearing theirs.**
//     Under subsection (a4) the clerk is not required to transmit an
//     expunction order to other entities. The sentence is required, and any
//     claim that agency records cleared with the court record is prohibited.
//   - **The record-destruction claim is withdrawn.** The design replaces it
//     with G.S. 15A-151(a1) and 15A-151.5, so the citations are required and
//     any statement that an expunction destroys or erases records is
//     prohibited.
//   - **The eligibility gate is incomplete and must say so.** The full list of
//     conditions in subsection (a4) was not read at the official source, so
//     the sheet must carry that limit and must not tell a participant that a
//     case qualifies.
//   - **Where the automatic expunction never ran, no remedy is established.**
//     None may be invented: no appeal, no deadline, no "the remedy is to".
//     What the sheet gives instead is the clerk, the Bureau and legal help.
//
// Two further boundaries, because North Carolina's other routes are live jobs.
// No AOC form number may appear on this pure-guidance sheet — the official
// petition forms and their currentness belong to other jobs and naming one
// here would put a form identity inside the guidance lane. And the written
// request to an agency that still holds a charge after the court expunged it
// is a separate supporting-action route: it may be pointed at and may not be
// described as something this packet prepares.
//
// Money: the design records no fee on this route at all, so no currency figure
// may appear. That the petition alternative "carries a fee" is stated without
// a figure, because the design supplies none.
//
// Why there is no regression variant: the adopted packet set carries a single
// required component and the template interpolates no participant answer, so a
// second fixture would render byte-for-byte the same packet. The branches that
// matter are typed stops, and all nine are exercised below.

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
  NORTH_CAROLINA_GUIDANCE_TRACKS,
  NORTH_CAROLINA_GUIDANCE_TEMPLATES,
  NC_RECORD_JURISDICTIONS,
  NC_DISPOSITION_ERA,
  NC_DISPOSITION_TYPES,
  NC_RECORD_STATUS_AFTER_WINDOW,
  NorthCarolinaGuidanceStopError,
  NorthCarolinaRouteMismatchError,
  NorthCarolinaBranchError,
  deriveNorthCarolinaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/north-carolina/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/north-carolina-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["nc_auto_146_a4"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NC" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real North Carolina track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nc-")).length === 0,
  "North Carolina templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real North Carolina track in the shared registry, no North Carolina template in the shared guidance pack.");

for (const t of NORTH_CAROLINA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NORTH_CAROLINA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned track, nothing promoted.
ok(
  JSON.stringify(NORTH_CAROLINA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NORTH_CAROLINA_GUIDANCE_TRACKS) {
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
note(`2. Scope: exactly ${ASSIGNED.length} assigned track, runtime_disabled and awaiting counsel.`);

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
for (const track of NORTH_CAROLINA_GUIDANCE_TRACKS) {
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
  for (const c of designedComponents) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
  // The design says nothing is filed and relief runs by operation of law.
  ok(
    /nothing is filed/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that nothing is filed.`
  );
  ok(
    /operation of law/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that relief runs by operation of law.`
  );
  ok(
    /^none/i.test((designed?.rules?.participantSignature ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  // And that the clerk need not push the order out to other record holders.
  ok(
    /not required to transmit/i.test(designed?.destination?.detail ?? ""),
    `${track.trackId}: the design no longer records the agency-transmission gap.`
  );
}
ok(componentCount === 1, `expected the design's 1 component, found ${componentCount}.`);
ok(conditionalCount === 0, `the North Carolina design has no conditional component, found ${conditionalCount}.`);
const used = new Set(NORTH_CAROLINA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(NORTH_CAROLINA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} component across ${ASSIGNED.length} track, specified, matching the design and the adopted manifest in identity, order and requirement, not source-bound.`
);

for (const [id, template] of Object.entries(NORTH_CAROLINA_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Wake County participant whose whole case was dismissed
// by the State in 2024, who has no immigration matter and has not yet checked
// their own record.
const BASE = {
  recordJurisdiction: "north_carolina_state",
  immigrationMatter: "no",
  finalDispositionEra: "on_or_after_1_december_2021",
  finalDispositionDate: "14 May 2024",
  everyChargeDisposedFavourably: "yes",
  dispositionType: "dismissed_by_the_state",
  deferredProsecutionOrConditionalDischarge: "no",
  felonyDismissedUnderAPleaAgreement: "no",
  dismissedAsIncapableToProceed: "no",
  recordStatusAfterWindow: "not_yet_checked",
  wantsAPetitionPreparedNow: "no",
  countyOfCharge: "Wake County"
};

const NEG = [
  ["nc_auto_146_a4", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_north_carolina_state_record"],
  ["nc_auto_146_a4", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_north_carolina_state_record"],
  ["nc_auto_146_a4", { immigrationMatter: "yes" }, "stop", "immigration_matter_in_play"],
  [
    "nc_auto_146_a4",
    { finalDispositionEra: "before_1_december_2021" },
    "mismatch",
    "final_disposition_predates_the_automatic_route"
  ],
  [
    "nc_auto_146_a4",
    { everyChargeDisposedFavourably: "no" },
    "mismatch",
    "not_every_charge_in_the_case_was_disposed_favourably"
  ],
  [
    "nc_auto_146_a4",
    { deferredProsecutionOrConditionalDischarge: "yes" },
    "mismatch",
    "dismissal_came_through_a_deferred_prosecution_or_conditional_discharge"
  ],
  [
    "nc_auto_146_a4",
    { felonyDismissedUnderAPleaAgreement: "yes" },
    "mismatch",
    "felony_charge_was_dismissed_under_a_plea_agreement"
  ],
  [
    "nc_auto_146_a4",
    { dispositionType: "dismissed_by_the_court", dismissedAsIncapableToProceed: "yes" },
    "stop",
    "dismissal_was_on_the_ground_of_incapacity_to_proceed"
  ],
  [
    "nc_auto_146_a4",
    { recordStatusAfterWindow: "still_shows" },
    "stop",
    "record_still_shows_after_the_statutory_window"
  ],
  [
    "nc_auto_146_a4",
    { wantsAPetitionPreparedNow: "yes" },
    "stop",
    "petition_requested_before_the_automatic_route_was_checked"
  ],
  // A court dismissal that was not on the incapacity ground still renders.
  ["nc_auto_146_a4", { dispositionType: "dismissed_by_the_court" }, "generated"],
  ["nc_auto_146_a4", { dispositionType: "found_not_responsible" }, "generated"],
  // Where the case has already been checked and cleared, a petition request is
  // not stopped by the never-checked rule; it is simply not this route's answer.
  [
    "nc_auto_146_a4",
    { recordStatusAfterWindow: "no_longer_shows", wantsAPetitionPreparedNow: "yes" },
    "generated"
  ],
  // Closed lists fail closed rather than falling through.
  ["nc_auto_146_a4", { recordJurisdiction: "" }, "branch"],
  ["nc_auto_146_a4", { recordJurisdiction: "north_carolina" }, "branch"],
  ["nc_auto_146_a4", { immigrationMatter: "maybe" }, "branch"],
  ["nc_auto_146_a4", { finalDispositionEra: "2021" }, "branch"],
  ["nc_auto_146_a4", { everyChargeDisposedFavourably: "most" }, "branch"],
  ["nc_auto_146_a4", { deferredProsecutionOrConditionalDischarge: "unsure" }, "branch"],
  ["nc_auto_146_a4", { felonyDismissedUnderAPleaAgreement: "possibly" }, "branch"],
  ["nc_auto_146_a4", { dispositionType: "dismissed" }, "branch"],
  [
    "nc_auto_146_a4",
    { dispositionType: "dismissed_by_the_court", dismissedAsIncapableToProceed: "unknown" },
    "branch"
  ],
  ["nc_auto_146_a4", { recordStatusAfterWindow: "cleared" }, "branch"],
  ["nc_auto_146_a4", { wantsAPetitionPreparedNow: "later" }, "branch"]
];

/**
 * How this route names itself when a stop points elsewhere.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * the destination actually uses rather than the internal track id.
 */
const SELF_MARKERS = {
  nc_auto_146_a4: /the automatic (expunction )?route|the 15A-146\(a4\) route|the automatic expunction/i
};

/**
 * The stops whose honesty the design turns on.
 *
 * Each carries a fact a later edit could drop while leaving the stop id and
 * the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  record_still_shows_after_the_statutory_window: [
    [/not required to transmit/i, "the reason an agency copy can survive"],
    [/not established/i, "the honest statement that the never-ran case has no established remedy"],
    [/no appeal or deadline/i, "the refusal to invent a remedy"]
  ],
  immigration_matter_in_play: [
    [/charging document/i, "the records that become hard to obtain"],
    [/without you asking for it/i, "why the timing matters on an automatic route"]
  ],
  dismissal_was_on_the_ground_of_incapacity_to_proceed: [
    [/1 December 2025/, "the date the exclusion starts"],
    [/genuinely open/i, "the unresolved position for earlier dismissals"]
  ],
  petition_requested_before_the_automatic_route_was_checked: [
    [/already happened by operation of law/i, "the reason checking comes first"]
  ]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit)/i, "an offer to act for the participant"],
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "an invented deadline"],
  [/you (can|may) appeal/i, "an invented appeal"],
  [/AOC-CR-\d+/, "an official form identity that belongs to another job"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNorthCarolinaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NorthCarolinaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NorthCarolinaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NorthCarolinaBranchError) outcome = "branch";
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
ok(typedStops.size === 9, `expected 9 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} cases exercised; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act and none inventing a remedy the statute does not give.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(NC_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "north_carolina_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NC_DISPOSITION_ERA).sort()) ===
    JSON.stringify(["before_1_december_2021", "on_or_after_1_december_2021"]),
  "the disposition boundary is not the design's 1 December 2021 boundary."
);
ok(
  JSON.stringify(Object.keys(NC_DISPOSITION_TYPES).sort()) ===
    JSON.stringify([
      "dismissed_by_the_court",
      "dismissed_by_the_state",
      "found_not_guilty",
      "found_not_responsible"
    ]),
  "the disposition-type list is not the design's list."
);
ok(
  Object.keys(NC_RECORD_STATUS_AFTER_WINDOW).includes("not_yet_checked"),
  "the record-status list does not allow the honest answer that the participant has not checked."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design records no fee on this route at all.
  [/[$£€]\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // No outcome is reported and no eligibility is decided.
  [
    /your (record|case|charge|conviction) (has been|was) (expunged|cleared|removed|destroyed|sealed)/i,
    "a claim that relief occurred"
  ],
  [/(has|have) already cleared\b(?! itself)/i, "a claim that the case cleared"],
  [/is now (expunged|cleared|removed|sealed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/\byou qualify\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The agency gap must not be closed by a promise.
  [
    /(all|every|other) agenc(y|ies)[^.]{0,60}(cleared|removed|expunged|updated)/i,
    "a promise that agency records cleared with the court record"
  ],
  [/the order is (sent|transmitted) to (all|other|every)/i, "a claim the order goes out to other holders"],
  // Expunction is not destruction.
  [/(expunction|expungement) (destroys|erases|wipes)/i, "the withdrawn record-destruction claim"],
  [/records? (is|are) destroyed/i, "the withdrawn record-destruction claim"],
  // No participant filing, ever, on this route.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|form|request)/i, "a filing instruction"],
  [/(your|the) (attached|enclosed|generated) (petition|request|letter)/i, "a generated instrument"],
  [
    /this (packet|page) (prepares|includes|generates|contains) (a|the|your) (letter|request|petition)/i,
    "a claim that this packet produces the separate agency request"
  ],
  // Official AOC form identities belong to other jobs.
  [/AOC-CR-\d+|AOC-CV-\d+/, "an official form identity that belongs to another job"],
  // No agency is accused, no remedy or deadline is invented.
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "a deadline the design does not state"],
  [/the (clerk|court|Bureau|Administrative Office) (has |had )?(failed|refused|neglected)/i, "an accusation that an office failed"],
  [/the remedy (is|would be) to (file|apply|move|appeal)/i, "an invented remedy"],
  [/you (can|may|should) appeal/i, "an invented appeal"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bNC\s+2\d{4}\b/, "a postal code"],
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
  [
    /LegalEase cannot tell you that a record has been expunged/i,
    "the refusal to report an outcome"
  ],
  // The mechanism, its dates and its window.
  [/15A-146\(a4\)/, "the governing subsection"],
  [/operation of law/i, "how relief happens on this route"],
  [/1 December 2021/, "the disposition boundary"],
  [/1 July 2024/, "the corrected start of the automatic process"],
  [/180 days/, "the near edge of the statutory window"],
  [/210 days/, "the far edge of the statutory window"],
  [/no petition, no form and no fee|There is no petition, no form and no fee/i, "the absence of any filing"],
  // The exclusions the design requires.
  [/deferred prosecution/i, "the deferred-prosecution carve-out"],
  [/conditional discharge/i, "the conditional-discharge carve-out"],
  [/plea agreement/i, "the plea-agreement felony exclusion"],
  [/1 December 2025/, "the incapable-to-proceed exclusion date"],
  [/incapable to proceed/i, "the incapable-to-proceed exclusion"],
  [/every charge in (the|that) case/i, "the all-charges gate"],
  // The limits.
  [/was not read at the official source/i, "the statement that the eligibility gate is incomplete"],
  [/not established/i, "the statement that the never-ran case has no established remedy"],
  [/no appeal or deadline/i, "the refusal to invent a remedy"],
  // The agency gap and what survives.
  [/not required to transmit/i, "the agency-transmission gap"],
  [/15A-151\(a1\)/, "the confidential-agency-files provision that replaces the destruction claim"],
  [/15A-151\.5/, "the second provision that replaces the destruction claim"],
  // Verification and retention.
  [/State Bureau of Investigation/, "the body whose record is the instrument of proof"],
  [/right-to-review/i, "the copy the participant is entitled to request"],
  [/clerk of superior court/i, "the office that holds the case file"],
  [
    /charging documents, the dismissal orders and the judgments/i,
    "the records to keep before the expunction takes effect"
  ],
  [/immigration/i, "the warning that expunction can cost record access"],
  // Roles, kept straight.
  [/district attorney/i, "the role distinction on North Carolina's other routes"]
];

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNorthCarolinaGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "NC",
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
      jurisdiction: "NC",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NC",
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
    jurisdiction: "NC",
    jurisdictionName: "North Carolina",
    packetName: resolved.track.assembledPacketName,
    caseReference: "24CR001842",
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
  return text;
}

for (const track of NORTH_CAROLINA_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// A different disposition answer renders the identical packet, which is what
// makes one canonical fixture sufficient rather than merely convenient.
{
  const other = await renderPacketComponentText("found_not_responsible");
  ok(other === samples[0].sha256, "a different disposition answer changes the packet, so one fixture no longer covers the track.");
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.countyOfCharge;
  let outcome = "generated";
  try {
    const derived = deriveNorthCarolinaGuidanceFacts("nc_auto_146_a4", facts);
    resolvePacket({
      jurisdiction: "NC",
      trackId: "nc_auto_146_a4",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing county of charge: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifact renders deterministically from ${samples.reduce((n, s) => n + s.components, 0)} component, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no official form identity, no promise about agency records, and no invented remedy.`
);

console.log("");
if (failures.length > 0) {
  console.error("North Carolina guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("North Carolina guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(18)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

async function renderPacketComponentText(dispositionType) {
  const track = NORTH_CAROLINA_GUIDANCE_TRACKS[0];
  const facts = deriveNorthCarolinaGuidanceFacts(track.trackId, { ...BASE, dispositionType });
  const resolved = resolvePacket({
    jurisdiction: "NC",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "NC",
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
    jurisdiction: "NC",
    jurisdictionName: "North Carolina",
    packetName: resolved.track.assembledPacketName,
    caseReference: "24CR001842",
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
