// Kentucky guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Kentucky is not enabled, both
// assigned tracks have a governing specification and match the adopted packet
// set and manifest in component identity, order and requirement, both routes
// render deterministically with no blank page and no detached heading, every
// typed stop and closed list fails closed with a reason, a destination and a
// next step, no stop routes back to its own node, no artifact claims relief
// occurred, and neither route carries the other's law.
//
// Three rules here are Kentucky's own, and each has an assertion of its own:
//
//   - **Never tell a participant their case has cleared.** The order under
//     KRS 431.076(1)(a) is entered without anybody being told to do anything,
//     which is exactly what makes it invisible. The packet routes to the
//     circuit court clerk for confirmation, and nothing in it may assert the
//     record is dealt with.
//   - **The sixty-day window is flagged where the order is confirmed.** The
//     court distributes the order to a standard list of agencies; distribution
//     beyond that list has to be asked for within sixty days of the
//     expungement. The packet says so, and does not generate the request.
//   - **Dismissed-diverted is not expungement.** A completed diversion gives
//     the disposition a status under KRS 533.258; the record still exists and
//     still shows until it is expunged, and until the prejudice question is
//     classified no diverted participant may be told their case has already
//     cleared automatically. A dismissal order silent on prejudice — which the
//     controlling review records as the norm — ends automated assistance.
//
// Why there is no regression variant: each adopted packet set has exactly one
// required component, and no Kentucky template interpolates a participant
// answer, so a second fixture on the same track would render byte-for-byte the
// same packet. The branches that matter are typed stops, and all nineteen are
// exercised below as negative cases.

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
  KENTUCKY_GUIDANCE_TRACKS,
  KENTUCKY_GUIDANCE_TEMPLATES,
  KY_RECORD_JURISDICTIONS,
  KY_DISPOSITION_TYPES,
  KY_ORDER_STATUS,
  KY_DISTRIBUTION_REQUEST,
  KY_PREJUDICE_ON_ORDER,
  KentuckyGuidanceStopError,
  KentuckyRouteMismatchError,
  KentuckyBranchError,
  deriveKentuckyGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/kentucky/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/kentucky-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const AUTO = "ky_automatic_nonconviction_expungement_verification";
const DIVERSION = "ky_diversion_disposition_routing";
const ASSIGNED = [AUTO, DIVERSION].slice().sort();

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "KY" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Kentucky track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ky-")).length === 0,
  "Kentucky templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Kentucky track in the shared registry, no Kentucky template in the shared guidance pack.");

for (const t of KENTUCKY_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, KENTUCKY_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(KENTUCKY_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of KENTUCKY_GUIDANCE_TRACKS) {
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
for (const track of KENTUCKY_GUIDANCE_TRACKS) {
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
}
ok(componentCount === 2, `expected the design's 2 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Kentucky design has no conditional component, found ${conditionalCount}.`);
const used = new Set(KENTUCKY_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(KENTUCKY_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(KENTUCKY_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder.`);
}

// 4. Closed lists and typed stops.
const BASE = {
  recordJurisdiction: "kentucky",
  // ky_automatic_nonconviction_expungement_verification
  autoCounty: "Jefferson",
  autoCaseNumber: "22-CR-001845",
  autoDispositionDate: "3 October 2023",
  autoDispositionType: "dismissed_with_prejudice",
  autoDispositionBefore15July2020: "no",
  autoAllChargesResolvedThatWay: "yes",
  autoDismissedInExchangeForAPlea: "no",
  autoTrafficInfraction: "no",
  autoOrderStatusFromClerk: "not_checked_yet",
  autoStillOnBackgroundCheck: "no",
  autoDistributionBeyondStandardList: "not_wanted",
  // ky_diversion_disposition_routing
  divCounty: "Fayette",
  divCaseNumber: "19-CR-000732",
  divCompletionDate: "12 May 2024",
  divCompletedSuccessfully: "yes",
  divDismissalEntered: "yes",
  divPrejudiceOnTheOrder: "with_prejudice",
  divExpungementWaiver: "no",
  divChargeClass: "misdemeanor"
};

const CONFIRMED = { autoOrderStatusFromClerk: "entered" };

const NEG = [
  ...ASSIGNED.map((trackId) => [
    trackId,
    { recordJurisdiction: "federal" },
    "mismatch",
    "record_is_not_a_kentucky_record"
  ]),
  // The automatic route.
  [
    AUTO,
    { autoDispositionType: "dismissed_without_prejudice" },
    "mismatch",
    "the_dismissal_was_not_with_prejudice"
  ],
  [
    AUTO,
    { autoDispositionType: "convicted_or_other_disposition" },
    "mismatch",
    "the_case_did_not_end_in_acquittal_or_dismissal"
  ],
  [
    AUTO,
    { autoDispositionType: "not_sure" },
    "stop",
    "how_the_case_ended_is_not_known_without_reading_the_order"
  ],
  [AUTO, { autoDispositionBefore15July2020: "yes" }, "mismatch", "the_case_ended_before_15_july_2020"],
  [
    AUTO,
    { autoDispositionBefore15July2020: "not_sure" },
    "stop",
    "whether_the_case_ended_before_15_july_2020_is_not_known"
  ],
  [
    AUTO,
    { autoAllChargesResolvedThatWay: "no" },
    "mismatch",
    "only_some_of_the_charges_in_the_case_were_resolved_that_way"
  ],
  [
    AUTO,
    { autoDismissedInExchangeForAPlea: "yes" },
    "mismatch",
    "charges_were_dismissed_in_exchange_for_a_guilty_plea_to_another_charge"
  ],
  [
    AUTO,
    { autoTrafficInfraction: "yes" },
    "mismatch",
    "the_charge_was_a_traffic_infraction_rather_than_a_misdemeanor"
  ],
  [
    AUTO,
    { autoOrderStatusFromClerk: "not_entered_after_thirty_days" },
    "stop",
    "no_expungement_order_was_entered_after_the_thirty_days"
  ],
  [
    AUTO,
    { ...CONFIRMED, autoStillOnBackgroundCheck: "yes" },
    "stop",
    "the_record_still_appears_on_a_background_check_after_the_order_was_entered"
  ],
  [
    AUTO,
    { ...CONFIRMED, autoDistributionBeyondStandardList: "wanted_more_than_sixty_days_after_entry" },
    "stop",
    "distribution_beyond_the_standard_list_is_wanted_more_than_sixty_days_after_entry"
  ],
  // The diversion routing node.
  [
    DIVERSION,
    { divCompletedSuccessfully: "no" },
    "mismatch",
    "the_diversion_was_voided_rather_than_completed"
  ],
  [DIVERSION, { divDismissalEntered: "no" }, "stop", "the_dismissal_order_has_not_been_entered"],
  [
    DIVERSION,
    { divPrejudiceOnTheOrder: "order_not_in_hand" },
    "stop",
    "the_dismissal_order_has_not_been_read"
  ],
  [
    DIVERSION,
    { divPrejudiceOnTheOrder: "order_does_not_say" },
    "stop",
    "the_dismissal_order_does_not_say_whether_it_is_with_or_without_prejudice"
  ],
  [
    DIVERSION,
    { divPrejudiceOnTheOrder: "without_prejudice" },
    "mismatch",
    "the_dismissal_order_says_the_dismissal_is_without_prejudice"
  ],
  [
    DIVERSION,
    { divExpungementWaiver: "yes" },
    "stop",
    "the_diversion_agreement_contains_an_expungement_waiver"
  ],
  // Closed lists fail closed rather than falling through.
  [AUTO, { recordJurisdiction: "" }, "branch"],
  [AUTO, { autoDispositionType: "thrown out" }, "branch"],
  [AUTO, { autoDispositionBefore15July2020: "maybe" }, "branch"],
  [AUTO, { autoAllChargesResolvedThatWay: "most" }, "branch"],
  [AUTO, { autoTrafficInfraction: "" }, "branch"],
  [AUTO, { autoOrderStatusFromClerk: "asked_but_no_answer" }, "branch"],
  [AUTO, { ...CONFIRMED, autoStillOnBackgroundCheck: "sometimes" }, "branch"],
  [AUTO, { ...CONFIRMED, autoDistributionBeyondStandardList: "yes" }, "branch"],
  [DIVERSION, { divCompletedSuccessfully: "partly" }, "branch"],
  [DIVERSION, { divPrejudiceOnTheOrder: "unclear" }, "branch"],
  [DIVERSION, { divExpungementWaiver: "" }, "branch"],
  [DIVERSION, { divChargeClass: "violation" }, "branch"]
];

const SELF_MARKERS = {
  [AUTO]: /automatic expungement (route|subsection)|the automatic route/i,
  [DIVERSION]: /diversion (routing|disposition) (node|route)|dismissed-diverted route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveKentuckyGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof KentuckyGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof KentuckyRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof KentuckyBranchError) outcome = "branch";
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
ok(typedStops.size === 19, `expected 19 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

ok(
  JSON.stringify(Object.keys(KY_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "kentucky", "military", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(KY_DISPOSITION_TYPES).sort()) ===
    JSON.stringify([
      "acquitted",
      "convicted_or_other_disposition",
      "dismissed_with_prejudice",
      "dismissed_without_prejudice",
      "not_sure"
    ]),
  "the disposition list does not keep a dismissal with prejudice apart from one without."
);
ok(
  JSON.stringify(Object.keys(KY_PREJUDICE_ON_ORDER).sort()) ===
    JSON.stringify(["order_does_not_say", "order_not_in_hand", "with_prejudice", "without_prejudice"]),
  "the prejudice list does not give a silent order a value of its own."
);
ok(
  JSON.stringify(Object.keys(KY_ORDER_STATUS).sort()) ===
    JSON.stringify(["entered", "not_checked_yet", "not_entered_after_thirty_days"]),
  "the order-status list does not distinguish an unasked question from a negative answer."
);
ok(
  JSON.stringify(Object.keys(KY_DISTRIBUTION_REQUEST).sort()) ===
    JSON.stringify([
      "not_wanted",
      "wanted_more_than_sixty_days_after_entry",
      "wanted_within_sixty_days_of_entry"
    ]),
  "the distribution list does not put the sixty-day window on the branch."
);

// An acquittal is within the subsection just as a dismissal with prejudice is.
for (const disposition of ["acquitted", "dismissed_with_prejudice"]) {
  let threw = null;
  try {
    deriveKentuckyGuidanceFacts(AUTO, { ...BASE, autoDispositionType: disposition });
  } catch (e) {
    threw = `${e.name}:${e.stopId ?? ""}`;
  }
  ok(threw === null, `${disposition} throws ${threw}, contrary to KRS 431.076(1)(a).`);
}

// Not having asked the clerk yet is the ordinary starting state, not a stop:
// the packet exists to send the participant to ask.
{
  let threw = null;
  try {
    deriveKentuckyGuidanceFacts(AUTO, { ...BASE, autoOrderStatusFromClerk: "not_checked_yet" });
  } catch (e) {
    threw = `${e.name}:${e.stopId ?? ""}`;
  }
  ok(threw === null, `an unasked clerk throws ${threw}, which would stop the packet before its own instruction.`);
}

// The background-check and distribution questions are only reached once an
// order has been confirmed; an unconfirmed order must not fire either.
{
  let threw = null;
  try {
    deriveKentuckyGuidanceFacts(AUTO, {
      ...BASE,
      autoOrderStatusFromClerk: "not_checked_yet",
      autoStillOnBackgroundCheck: "yes",
      autoDistributionBeyondStandardList: "wanted_more_than_sixty_days_after_entry"
    });
  } catch (e) {
    threw = `${e.name}:${e.stopId ?? ""}`;
  }
  ok(threw === null, `a post-order question fired before any order was confirmed (${threw}).`);
}

// A felony diversion routes exactly as a misdemeanour one does at this node.
{
  let threw = null;
  try {
    deriveKentuckyGuidanceFacts(DIVERSION, { ...BASE, divChargeClass: "felony" });
  } catch (e) {
    threw = `${e.name}:${e.stopId ?? ""}`;
  }
  ok(threw === null, `a felony diversion throws ${threw} at a node that only reads the order.`);
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount neither section identifies"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/\brace\b\s*:/i, "a race field"],
  // Nothing may report an outcome. This is the design's first rule for Kentucky.
  [
    /your (record|conviction|charge|complaint|case) (has been|was) (expunged|sealed|removed|cleared)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|sealed|cleared|removed)/i, "a claim that the record is already dealt with"],
  [/\byour case has (already )?cleared\b/i, "a claim that the case cleared itself"],
  [/\b(has|have) already cleared automatically\b/i, "a claim that the automatic route has operated"],
  [/\bassume (that )?the order (was|has been) entered\b/i, "an invitation to assume the order exists"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // Nothing is filed on either route and nothing may be prepared for signature.
  [/you (should|must|need to) file a (petition|motion|application)/i, "an instruction to file"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  [
    /\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i,
    "a submission instruction"
  ],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bKY\s+4\d{4}\b/, "a postal code"],
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy"],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds|leaves)\b/i, "internal legal-design jargon"],
  [/\b(in|by|for) (this|the) design\b/i, "internal legal-design jargon"],
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
    /LegalEase cannot tell you whether an order was entered in your case/i,
    "the refusal to report whether the order exists"
  ],
  [/Kentucky/, "the jurisdiction"],
  [/circuit court clerk/i, "the office that holds the answer"]
];

const PER_TRACK = {
  [AUTO]: [
    [/431\.076/, "the governing section"],
    [/thirty days after the judgment becomes final/i, "when the order is entered"],
    [
      /shall not require any action by the person/i,
      "the statutory words that make this a guidance route at all"
    ],
    [/deemed never to have occurred/i, "what the order does"],
    [/Cabinet for Health and Family Services/, "the limit in subsection (4)"],
    [/15 July 2020/, "the cut-off the automatic subsection is subject to"],
    [/retroactive except/i, "why the cut-off exists"],
    [/standard list/i, "how the order is distributed"],
    [/within sixty days of the expungement/i, "the one deadline on this route"],
    [/Ask the clerk what the standard list covers/i, "the sixty-day point flagged where the order is confirmed"],
    [/Nobody is required to write and tell you/i, "why the packet sends the participant to ask"]
  ],
  [DIVERSION]: [
    [/533\.258/, "the governing section"],
    [/dismissed-diverted/i, "what the disposition is listed as"],
    [/do not constitute a criminal conviction/i, "what the designation does"],
    [/need not disclose/i, "the disclosure rule"],
    [/unless federal law requires/i, "the limit on the disclosure rule"],
    [/may not be introduced as evidence without your consent/i, "the evidence rule"],
    [
      /designation is not expungement/i,
      "the point the design says the participant must not be left wrong about"
    ],
    [/still exists and it still shows until it is expunged/i, "why the designation is not the end of it"],
    [/with prejudice or without prejudice/i, "the line in the order that decides the route"],
    [/the ordinary case in a diverted matter/i, "that a silent order is the norm rather than an oddity"],
    [/do not treat the case as already cleared/i, "the instruction the scope restriction requires"]
  ]
};

/** Copy that belongs to one route and must not leak onto the other. */
const FORBIDDEN_PER_TRACK = {
  [AUTO]: [
    [/dismissed-diverted/i, "the diversion node's designation"],
    [/533\.258/, "the diversion node's governing section"]
  ],
  [DIVERSION]: [
    [/Cabinet for Health and Family Services/, "the automatic route's own limit"],
    [/sixty days/i, "the automatic route's distribution deadline"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveKentuckyGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "KY",
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
      jurisdiction: "KY",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "KY",
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
    jurisdiction: "KY",
    jurisdictionName: "Kentucky",
    packetName: resolved.track.assembledPacketName,
    caseReference: track.trackId === AUTO ? String(BASE.autoCaseNumber) : String(BASE.divCaseNumber),
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

for (const track of KENTUCKY_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.autoCaseNumber;
  let outcome = "generated";
  try {
    const derived = deriveKentuckyGuidanceFacts(AUTO, facts);
    resolvePacket({ jurisdiction: "KY", trackId: AUTO, facts: derived, allowTechnicalFixtures: true });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case number: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no claim that a case cleared, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Kentucky guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Kentucky guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(52)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

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
