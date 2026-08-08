// New Jersey guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: New Jersey is not enabled, the
// assigned track has a governing specification and matches the adopted packet
// set and manifest in component identity, order and requirement, the route
// renders deterministically into one final guidance PDF with no blank page and
// no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the
// node the participant is standing on, no artifact carries petition structure
// or a submission instruction, and every place the design says the law runs
// out is stated rather than papered over.
//
// Five rules here are New Jersey's own:
//
//   - **The automated process does not exist, and the packet may not imply it
//     does.** That is the whole point of the track. The claim that it exists,
//     that automatic clearing has started, or that a particular record will be
//     cleared automatically is prohibited; the statement that it does not
//     exist is required.
//   - **No second automatic remedy is invented.** One statutory scheme is
//     described and it has not been implemented. No alternative automatic
//     route may be offered, and the open question about partial cannabis
//     automation stays open rather than being answered either way.
//   - **The petition route is live and closes when the automation arrives.**
//     N.J.S.A. 2C:52-5.3 is required copy, because it is the reason waiting is
//     not a free option. Equally, the packet may not say the petition route
//     has already closed.
//   - **Title 39 is outside the chapter and expungement isolates rather than
//     destroys.** Both are design scope restrictions: § 2C:52-28 and the
//     § 2C:52-1 definition are required, and any claim that a Title 39 matter
//     or a driving-while-intoxicated matter can be expunged, or that
//     expungement destroys records, is prohibited.
//   - **The § 2C:52-5.4 restoration requirement is a required disclosure.**
//     The design records that it appears in no internal reference, so a later
//     edit that quietly drops it must fail.
//
// Two further boundaries, because New Jersey's other routes are live jobs. No
// New Jersey court form number may appear on this pure-guidance sheet — the
// official petition forms and their currentness belong to other jobs and
// naming one here would put a form identity inside the guidance lane. And the
// design forbids stating that a record is already automatically sealed absent
// verification, so that claim is prohibited outright.
//
// Money: the design records no fee on this track, so no currency figure may
// appear. That the Judiciary's own self-help material states there is no
// filing fee for an expungement application is carried without a figure.
//
// Per-sheet assertions matter more here than on a single-component track. All
// three components render into one packet, so a whole-packet check cannot tell
// which sheet a sentence landed on, and a shared constant that reads correctly
// on the sheet with the most context is exactly how one sheet's law ends up on
// another's page. Each component is therefore rendered and read on its own,
// and the patterns chosen for `FORBIDDEN_PER_COMPONENT` appear only in body
// copy — never in the shared source list or the shared cannot-do list, which
// render on every sheet.
//
// Why there is no regression variant: the adopted packet set makes all three
// components required and no template interpolates a participant answer, so a
// second fixture would render byte-for-byte the same packet. The branches that
// matter are typed stops, and all six are exercised below.

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
  NEW_JERSEY_GUIDANCE_TRACKS,
  NEW_JERSEY_GUIDANCE_TEMPLATES,
  NJ_RECORD_JURISDICTIONS,
  NJ_MATTER_TYPES,
  NJ_WAITING_INTENT,
  NJ_PORTAL_CHECK,
  NewJerseyGuidanceStopError,
  NewJerseyRouteMismatchError,
  NewJerseyBranchError,
  deriveNewJerseyGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/new-jersey/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/new-jersey-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["nj_automated_clean_slate"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NJ" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real New Jersey track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nj-")).length === 0,
  "New Jersey templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note(
  "1. Enablement: no real New Jersey track in the shared registry, no New Jersey template in the shared guidance pack."
);

for (const t of NEW_JERSEY_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEW_JERSEY_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned track, nothing promoted.
ok(
  JSON.stringify(NEW_JERSEY_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NEW_JERSEY_GUIDANCE_TRACKS) {
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
for (const track of NEW_JERSEY_GUIDANCE_TRACKS) {
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
  // The design says nothing is filed on this track and nothing can be.
  ok(
    /nothing is filed/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that nothing is filed.`
  );
  ok(
    /nothing can be/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that nothing can be filed.`
  );
  ok(
    /^not applicable/i.test((designed?.rules?.participantSignature ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  // And that the automation is the thing that does not exist.
  ok(
    /does not exist/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that the automated process does not exist.`
  );
}
ok(componentCount === 3, `expected the design's 3 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the New Jersey design has no conditional component, found ${conditionalCount}.`);
const used = new Set(
  NEW_JERSEY_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(NEW_JERSEY_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} track, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(NEW_JERSEY_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is an Essex County participant with a New Jersey indictable
// conviction, no immigration exposure, who has not decided whether to wait and
// has not looked at the status portal.
const BASE = {
  recordJurisdiction: "new_jersey_state",
  matterType: "indictable_crime",
  immigrationExposure: "no",
  waitingIntent: "not_decided_yet",
  convictedSinceAPreviousClearance: "no",
  wantsEligibilityAdvice: "no",
  portalCheck: "not_checked_it",
  heardAboutAutomaticClearing: "yes — a relative said it happens after ten years",
  caseDetails: "Essex County, Superior Court Law Division, third degree, convicted 2013"
};

const NEG = [
  ["nj_automated_clean_slate", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_new_jersey_state_record"],
  ["nj_automated_clean_slate", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_new_jersey_state_record"],
  ["nj_automated_clean_slate", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_new_jersey_state_record"],
  [
    "nj_automated_clean_slate",
    { matterType: "title_39_motor_vehicle_or_dwi" },
    "mismatch",
    "title_39_motor_vehicle_matter_is_outside_the_expungement_chapter"
  ],
  ["nj_automated_clean_slate", { immigrationExposure: "yes" }, "stop", "immigration_exposure_in_play"],
  [
    "nj_automated_clean_slate",
    { waitingIntent: "waiting_for_automatic_clearing" },
    "stop",
    "relying_on_automatic_clearing_that_does_not_exist"
  ],
  [
    "nj_automated_clean_slate",
    { convictedSinceAPreviousClearance: "yes" },
    "stop",
    "restoration_of_a_previously_cleared_record_is_in_play"
  ],
  [
    "nj_automated_clean_slate",
    { wantsEligibilityAdvice: "yes" },
    "stop",
    "individualized_eligibility_advice_requested"
  ],
  // The other in-chapter matter types render rather than stopping.
  ["nj_automated_clean_slate", { matterType: "disorderly_persons_offence" }, "generated"],
  ["nj_automated_clean_slate", { matterType: "municipal_ordinance_violation" }, "generated"],
  ["nj_automated_clean_slate", { waitingIntent: "asking_about_the_petition_routes" }, "generated"],
  ["nj_automated_clean_slate", { portalCheck: "checked_it" }, "generated"],
  // Closed lists fail closed rather than falling through.
  ["nj_automated_clean_slate", { recordJurisdiction: "" }, "branch"],
  ["nj_automated_clean_slate", { recordJurisdiction: "new_jersey" }, "branch"],
  ["nj_automated_clean_slate", { matterType: "indictable" }, "branch"],
  ["nj_automated_clean_slate", { matterType: "" }, "branch"],
  ["nj_automated_clean_slate", { immigrationExposure: "maybe" }, "branch"],
  ["nj_automated_clean_slate", { waitingIntent: "waiting" }, "branch"],
  ["nj_automated_clean_slate", { convictedSinceAPreviousClearance: "unsure" }, "branch"],
  ["nj_automated_clean_slate", { wantsEligibilityAdvice: "please" }, "branch"],
  ["nj_automated_clean_slate", { portalCheck: "no" }, "branch"]
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
  nj_automated_clean_slate:
    /the automated (Clean Slate )?process route|the 2C:52-5\.4 route|the automatic clearing route/i
};

/**
 * The stops whose honesty the design turns on.
 *
 * Each carries a fact a later edit could drop while leaving the stop id and
 * the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  relying_on_automatic_clearing_that_does_not_exist: [
    [/does not exist/i, "the status the whole track exists to state"],
    [/A5095/, "the bill that establishes the status"],
    [/2C:52-5\.3/, "the closure rule that makes waiting costly"],
    [/No date for it is published/i, "the refusal to invent a start date"]
  ],
  title_39_motor_vehicle_matter_is_outside_the_expungement_chapter: [
    [/2C:52-28/, "the section that puts Title 39 outside the chapter"],
    [/driving while intoxicated/i, "the matter participants most often ask about"]
  ],
  immigration_exposure_in_play: [
    [/no federal immigration effect/i, "the reason the assumption is false"]
  ],
  restoration_of_a_previously_cleared_record_is_in_play: [
    [/2C:52-5\.4/, "the section that carries the restoration requirement"],
    [/restored in certain circumstances/i, "the rule itself"]
  ],
  individualized_eligibility_advice_requested: [
    [/2C:52-2\(b\)/, "the exclusion the automated scheme turns on"],
    [/out-of-state and federal convictions count/i, "why a whole history decides it"]
  ],
  record_is_not_a_new_jersey_state_record: [
    [/still counts/i, "that an unreachable record still bears on New Jersey eligibility"]
  ]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit)/i, "an offer to act for the participant"],
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "an invented deadline"],
  [/you (can|may) appeal/i, "an invented appeal"],
  [/CN-\d{4,5}/, "an official form identity that belongs to another job"],
  [/the automated process exists/i, "a claim that the automation exists"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNewJerseyGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NewJerseyGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NewJerseyRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NewJerseyBranchError) outcome = "branch";
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
ok(typedStops.size === 6, `expected 6 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} cases exercised; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act and none claiming the automation exists.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(NJ_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "new_jersey_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  Object.keys(NJ_MATTER_TYPES).includes("title_39_motor_vehicle_or_dwi"),
  "the matter-type list does not carry the Title 39 exclusion the design requires on every screen."
);
ok(
  NJ_MATTER_TYPES.title_39_motor_vehicle_or_dwi === "outside",
  "the Title 39 answer does not take the participant outside the chapter."
);
ok(
  Object.keys(NJ_WAITING_INTENT).includes("not_decided_yet"),
  "the intent list does not allow the honest answer that the participant has not decided."
);
ok(
  Object.keys(NJ_PORTAL_CHECK).includes("not_checked_it"),
  "the portal list does not allow the honest answer that the participant has not looked."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design records no fee on this track at all.
  [/[$£€]\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // No outcome is reported and no eligibility is decided.
  [
    /your (record|conviction|charge|case) (has been|was) (expunged|cleared|removed|sealed)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|cleared|removed|sealed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/\byou qualify\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  [
    /(is|are) already automatically sealed/i,
    "the claim the design forbids, that a record is already automatically sealed absent verification"
  ],
  // The automation does not exist, and no page here may suggest otherwise.
  [/the automated process exists/i, "a claim that the automation exists"],
  [/\byour record will be cleared automatically\b/i, "a promise that automatic clearing will reach this record"],
  [
    /\bautomatic clearing (is|has) (now )?(started|begun|launched|arrived|running)\b/i,
    "a claim that automatic clearing has started"
  ],
  [/\bapply (for|to) (the )?automatic clearing\b/i, "an instruction to use a process that does not exist"],
  [/\benrol(l)? (in|for) (the )?(automatic|Clean Slate)/i, "an instruction to join a process that does not exist"],
  // No second automatic remedy, and no premature closure of the live route.
  [/(a second|another|an alternative) automatic (route|process|remedy)/i, "a second automatic remedy the statute does not create"],
  [/the Clean Slate petition route (is|has) (now )?closed/i, "a claim the petition route has already closed"],
  // The design's own scope restrictions.
  [/Title 39[^.]{0,60}(can|may) be expunged/i, "the prohibited claim that a Title 39 matter can be expunged"],
  [/\bDWI[^.]{0,40}(can|may) be expunged/i, "the prohibited claim that a driving-while-intoxicated matter can be expunged"],
  [/(expungement|expunction) (destroys|erases|wipes)/i, "the claim that expungement destroys records"],
  [/records? (is|are) destroyed/i, "the claim that expungement destroys records"],
  // No participant filing, ever, on this route.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request|letter)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|form|request|application)/i, "a filing instruction"],
  [/(your|the) (attached|enclosed|generated) (petition|request|letter|application)/i, "a generated instrument"],
  [
    /this (packet|page) (prepares|includes|generates|contains) (a|the|your) (letter|request|petition|application)/i,
    "a claim that this packet produces a filing"
  ],
  // Official New Jersey court form identities belong to other jobs.
  [/\bCN-\d{4,5}\b/, "an official form identity that belongs to another job"],
  // No agency is accused, no remedy or deadline is invented.
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "a deadline the design does not state"],
  [
    /the (State|Legislature|court|State Police) (has |had )?(failed|refused|neglected)/i,
    "an accusation that an office failed"
  ],
  [/the remedy (is|would be) to (file|apply|move|appeal)/i, "an invented remedy"],
  [/you (can|may|should) appeal/i, "an invented appeal"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bNJ\s+0\d{4}\b/, "a postal code"],
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
    /LegalEase cannot tell you that a record has been expunged or sealed/i,
    "the refusal to report an outcome"
  ],
  // The mechanism and its true status.
  [/2C:52-5\.4/, "the section that directs the automated process"],
  [/does not exist/i, "the status the whole track exists to state"],
  [/A5095/, "the bill that establishes the status"],
  [/14 May 2026/, "the date the bill was introduced"],
  [/ten years/i, "the period the scheme would run on"],
  [/2C:52-2\(b\)/, "the exclusion the scheme turns on"],
  // The live alternative and the closure rule.
  [/2C:52-5\.3/, "the rule that closes the petition route when the automation arrives"],
  [/no filing fee/i, "the cost of the live alternative"],
  [/separate routes in the New Jersey intake/i, "the live petition alternative, named as another route"],
  // What expungement is, and what it is not.
  [/extraction and isolation/i, "the statutory definition that replaces the destruction assumption"],
  [/2C:52-1\b/, "the section that defines expungement"],
  [/2C:52-27/, "the uses that survive an expungement"],
  [/Title 39/, "the motor vehicle exclusion the design requires on every screen"],
  [/2C:52-28/, "the section that puts Title 39 outside the chapter"],
  [/no federal immigration effect/i, "the immigration limit"],
  // The restoration disclosure the design adds.
  [/restored in certain circumstances/i, "the restoration requirement the design adds to disclosures"],
  // Monitoring and verification.
  [/expungement status portal/i, "the place an individual record's status is published"],
  [/New Jersey State Police/, "the body that publishes it"],
  // The residuals.
  [/not established|left open/i, "the honest statement of what is still open"],
  [/2C:52-5\.2/, "the first section behind the open cannabis-automation question"],
  [/2C:52-6\.1/, "the second section behind the open cannabis-automation question"]
];

/**
 * Per-sheet assertions.
 *
 * Keyed by componentId and run against that component's own rendered text, so
 * a sentence that belongs on one sheet cannot satisfy the check by appearing
 * on another. Every forbidden pattern here is body copy: none of them occurs
 * in `NJ_SOURCES` or `NJ_CANNOT_PERFORM`, which render on all three sheets.
 */
const PER_COMPONENT = {
  "nj_automated_clean_slate-status-disclosure-1": {
    required: [
      [/still does not exist/i, "the Legislature's own statement of the status"],
      [/task force/i, "how far the work actually got"],
      [/1 January 2030/, "the backlog date the bill would impose"],
      [/rendered inaccessible to the public/i, "what the section would actually do"],
      [/closes by operation of/i, "the closure rule, on the sheet that first states the choice"],
      [/extraction and isolation/i, "what New Jersey expungement is"],
      [/Title 39/, "the exclusion, on the sheet that sets the boundaries"]
    ],
    forbidden: [
      [/restored in certain circumstances/i, "the restoration sheet's own rule"],
      [/paid intermediaries/i, "the monitoring sheet's own warning"]
    ]
  },
  "nj_automated_clean_slate-monitoring-instructions-2": {
    required: [
      [/bill pages/i, "where the law is watched"],
      [/expungement status portal/i, "where an individual record is watched"],
      [/two dated observations/i, "why one look is not enough"],
      [/review date/i, "the plan that replaces an open wait"],
      [/paid intermediaries/i, "the warning about imitations of a free government process"],
      [/2C:52-5\.3/, "the closure rule, restated where the decision is made"]
    ],
    forbidden: [
      [/restored in certain circumstances/i, "the restoration sheet's own rule"],
      [/task force/i, "the status sheet's own history"],
      [/1 January 2030/, "the status sheet's own backlog date"]
    ]
  },
  "nj_automated_clean_slate-restoration-risk-disclosure-3": {
    required: [
      [/restored in certain circumstances/i, "the rule this sheet exists for"],
      [/2C:52-5\.4/, "the section that carries it"],
      [/extraction and isolation/i, "what a cleared record actually is"],
      [/2C:52-27/, "the uses that survive"],
      [/keep whatever document you were given/i, "the one action this sheet asks for"]
    ],
    forbidden: [
      [/paid intermediaries/i, "the monitoring sheet's own warning"],
      [/task force/i, "the status sheet's own history"],
      [/1 January 2030/, "the status sheet's own backlog date"]
    ]
  }
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNewJerseyGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "NJ",
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
      jurisdiction: "NJ",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NJ",
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
    jurisdiction: "NJ",
    jurisdictionName: "New Jersey",
    packetName: resolved.track.assembledPacketName,
    caseReference: "ESX-13-001842",
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

for (const track of NEW_JERSEY_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// A different answer on the one non-stopping question renders the identical
// packet, which is what makes a single canonical fixture sufficient rather
// than merely convenient.
{
  const other = await assembleOnly({ portalCheck: "checked_it" });
  ok(
    other === samples[0].sha256,
    "a different portal answer changes the packet, so one fixture no longer covers the track."
  );
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.caseDetails;
  let outcome = "generated";
  try {
    const derived = deriveNewJerseyGuidanceFacts("nj_automated_clean_slate", facts);
    resolvePacket({
      jurisdiction: "NJ",
      trackId: "nj_automated_clean_slate",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case details: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifact renders deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no claim that the automation exists, and no sheet carrying another sheet's law.`
);

console.log("");
if (failures.length > 0) {
  console.error("New Jersey guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("New Jersey guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(26)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

async function assembleOnly(extraFacts) {
  const track = NEW_JERSEY_GUIDANCE_TRACKS[0];
  const facts = deriveNewJerseyGuidanceFacts(track.trackId, { ...BASE, ...extraFacts });
  const resolved = resolvePacket({
    jurisdiction: "NJ",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "NJ",
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
    jurisdiction: "NJ",
    jurisdictionName: "New Jersey",
    packetName: resolved.track.assembledPacketName,
    caseReference: "ESX-13-001842",
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
