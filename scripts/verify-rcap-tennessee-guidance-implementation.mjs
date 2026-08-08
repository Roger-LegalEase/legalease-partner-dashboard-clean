// Tennessee guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Tennessee is not enabled, both
// assigned tracks have a governing specification and match the adopted packet
// set and manifest in component identity, order and requirement, both routes
// render deterministically into one final guidance PDF each with no blank page
// and no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the node
// the participant is standing on, no artifact carries petition structure or a
// submission instruction, no route carries the other's law, and what the design
// leaves unestablished is stated as unestablished.
//
// Five rules here are Tennessee's own, and each of them is an instrument
// boundary rather than a style preference:
//
//   - **The expunction order is the court's document.** TBI form BI-0333 is
//     captioned "Order for the Expungement of Criminal Offender Record" and is
//     signed by the judge on an approved-for-entry block. Any phrasing that has
//     LegalEase preparing, completing or predicting it is prohibited, and the
//     sheet that describes it must say in terms that it is a court order.
//   - **Where a Tennessee petition exists, the district attorney general
//     prepares it.** The § 40-32-108(e) petition and proposed order are
//     prosecutor instruments and the § 40-32-109(c) record search and
//     certification is a clerk instrument. Neither assigned track reaches them
//     and none of the three may be offered.
//   - **Nothing clears itself.** The design records that as the state's most
//     common misunderstanding, so the sentence is required on both packets and
//     any claim that a record clears automatically is prohibited.
//   - **No expunction is reported as having happened**, and the routing to the
//     non-conviction petition where the court never put the question is the
//     design's reading of § 40-32-106(a)(1) rather than confirmed practice. The
//     sheet must say so, and the assertion below is what keeps it saying so.
//   - **The prior-expunction asymmetry across the § 40-32-107 subsections is
//     undecided and stays undecided.** Neither assigned track runs on that
//     section, so the safe implementation is silence; the prohibited patterns
//     below stop a later edit from importing a decision by implication.
//
// Money: the adopted design supplies no fee figure on either track. The
// acquittal route is free by statute and the trafficking route's costs are not
// established, and the TBI FAQ figure the memo records is expressly one the
// enacted text does not support. So no currency figure may appear at all.
//
// Why there is no regression variant here: both adopted packet sets carry a
// single required component and no Tennessee template interpolates a
// participant answer, so a second fixture on the same track would render
// byte-for-byte the same packet. The branches that matter are typed stops, and
// all twelve are exercised below as negative cases.

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
  TENNESSEE_GUIDANCE_TRACKS,
  TENNESSEE_GUIDANCE_TEMPLATES,
  TN_RECORD_JURISDICTIONS,
  TN_ACQUITTAL_SCOPE,
  TN_VERDICT_QUESTION,
  TN_VERDICT_ANSWER,
  TennesseeGuidanceStopError,
  TennesseeRouteMismatchError,
  TennesseeBranchError,
  deriveTennesseeGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/tennessee/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/tennessee-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["tn_acquittal_immediate", "tn_trafficking_40_32_105"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "TN" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Tennessee track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("tn-")).length === 0,
  "Tennessee templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Tennessee track in the shared registry, no Tennessee template in the shared guidance pack.");

for (const t of TENNESSEE_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, TENNESSEE_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(TENNESSEE_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of TENNESSEE_GUIDANCE_TRACKS) {
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
for (const track of TENNESSEE_GUIDANCE_TRACKS) {
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
  // The design says on both tracks that the participant signs nothing.
  const signAction = (designed?.packetSet?.participantActionRequired ?? []).find((a) => a.kind === "sign");
  ok(
    /^none/i.test((signAction?.description ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  const fileAction = (designed?.packetSet?.participantActionRequired ?? []).find((a) => a.kind === "file");
  ok(
    /nothing is filed|not established, and nothing is filed/i.test(fileAction?.description ?? ""),
    `${track.trackId}: the design no longer records that nothing is filed by the participant.`
  );
}
ok(componentCount === 2, `expected the design's 2 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Tennessee design has no conditional component, found ${conditionalCount}.`);
const used = new Set(TENNESSEE_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(TENNESSEE_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(TENNESSEE_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
  // Fees, waiver and notice are per route rather than per family here.
  ok(typeof template.fees === "string" && template.fees.length > 0, `${id}: no fee position.`);
  ok(typeof template.feeWaiver === "string" && template.feeWaiver.length > 0, `${id}: no fee-waiver position.`);
  ok((template.noticeOrService ?? []).length > 0, `${id}: no notice position.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Davidson County participant acquitted on every count
// who was asked at the verdict, said yes, has ordered their criminal history,
// and holds no federal exposure.
const BASE = {
  recordJurisdiction: "tennessee_state",
  citizenshipOrClearanceQuestion: "no",
  // tn_acquittal_immediate
  obtainedTbiCriminalHistory: "yes",
  acquittedOnEveryCount: "every_count",
  courtPutTheQuestion: "yes",
  answerGivenAtTheVerdict: "asked_for_removal",
  prosecutionIndicatesOpposition: "no",
  originatingCourt: "Criminal Court for Davidson County, Tennessee",
  docketNumber: "2019-A-4471",
  offenceAndDisposition: "Theft of property, tried to verdict and found not guilty on both counts",
  dispositionDate: "11 March 2024",
  stateControlNumber: "TN-118-4471",
  otherConvictions: "None anywhere, state, federal or out-of-state",
  recordStillShows: "yes",
  // tn_trafficking_40_32_105
  recordAroseFromTrafficking: "yes",
  referralWanted: "yes"
};

const SHARED_NEG = [
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_a_tennessee_state_record"],
  ["recordJurisdiction", "tribal", "mismatch", "record_is_not_a_tennessee_state_record"],
  [
    "citizenshipOrClearanceQuestion",
    "yes",
    "stop",
    "immigration_or_security_clearance_consequences_in_play"
  ]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) =>
    SHARED_NEG.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])
  ),
  [
    "tn_acquittal_immediate",
    { obtainedTbiCriminalHistory: "no" },
    "stop",
    "tbi_criminal_history_not_yet_obtained"
  ],
  [
    "tn_acquittal_immediate",
    { acquittedOnEveryCount: "some_counts" },
    "mismatch",
    "acquittal_was_not_on_every_count"
  ],
  [
    "tn_acquittal_immediate",
    { courtPutTheQuestion: "do_not_remember" },
    "stop",
    "whether_the_court_put_the_question_is_not_remembered"
  ],
  [
    "tn_acquittal_immediate",
    { courtPutTheQuestion: "no" },
    "mismatch",
    "court_did_not_put_the_question_at_the_verdict"
  ],
  [
    "tn_acquittal_immediate",
    { answerGivenAtTheVerdict: "declined" },
    "mismatch",
    "records_removal_was_declined_at_the_verdict"
  ],
  [
    "tn_acquittal_immediate",
    { answerGivenAtTheVerdict: "do_not_remember" },
    "stop",
    "answer_given_at_the_verdict_is_not_remembered"
  ],
  [
    "tn_acquittal_immediate",
    { prosecutionIndicatesOpposition: "yes" },
    "stop",
    "prosecution_has_indicated_it_will_oppose"
  ],
  [
    "tn_trafficking_40_32_105",
    { recordAroseFromTrafficking: "no" },
    "mismatch",
    "no_trafficking_connection_on_this_record"
  ],
  // Closed lists fail closed rather than falling through.
  ["tn_acquittal_immediate", { recordJurisdiction: "" }, "branch"],
  ["tn_acquittal_immediate", { recordJurisdiction: "tennessee" }, "branch"],
  ["tn_acquittal_immediate", { citizenshipOrClearanceQuestion: "unsure" }, "branch"],
  ["tn_acquittal_immediate", { obtainedTbiCriminalHistory: "ordered" }, "branch"],
  ["tn_acquittal_immediate", { acquittedOnEveryCount: "all" }, "branch"],
  ["tn_acquittal_immediate", { courtPutTheQuestion: "maybe" }, "branch"],
  ["tn_acquittal_immediate", { answerGivenAtTheVerdict: "yes" }, "branch"],
  ["tn_acquittal_immediate", { prosecutionIndicatesOpposition: "possibly" }, "branch"],
  ["tn_trafficking_40_32_105", { recordAroseFromTrafficking: "" }, "branch"],
  ["tn_trafficking_40_32_105", { recordJurisdiction: "state" }, "branch"]
];

/**
 * How each route names itself when the other points at it.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * the destination actually uses rather than the internal track id.
 */
const SELF_MARKERS = {
  tn_acquittal_immediate: /immediate order route|acquittal route|the order the court makes/i,
  tn_trafficking_40_32_105: /trafficking route|section 40-32-105 route/i
};

/**
 * The three stops whose honesty the design turns on.
 *
 * Each carries a fact that a later edit could quietly drop while leaving the
 * stop id and the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  court_did_not_put_the_question_at_the_verdict: [
    [/not been confirmed against any official statement of Tennessee practice/i, "the unconfirmed-practice caveat"],
    [/verdict of not guilty is one of the grounds/i, "the statutory ground that keeps the petition route open"]
  ],
  records_removal_was_declined_at_the_verdict: [
    [/no order was made/i, "the reason there is nothing to verify"],
    [/petition/i, "the route that remains open"]
  ],
  tbi_criminal_history_not_yet_obtained: [[/state control number/i, "why the record is needed first"]]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit)/i, "an offer to act for the participant"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "an invented deadline"],
  [/(prior|previous) expunction (bars|does not bar|disqualifies|does not disqualify)/i, "a decision on the undecided prior-expunction asymmetry"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveTennesseeGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof TennesseeGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof TennesseeRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof TennesseeBranchError) outcome = "branch";
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
ok(typedStops.size === 12, `expected 12 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act and none deciding what the design leaves open.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(TN_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "tennessee_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(TN_ACQUITTAL_SCOPE).sort()) === JSON.stringify(["every_count", "some_counts"]),
  "the acquittal-scope list does not separate a partial acquittal."
);
ok(
  Object.keys(TN_VERDICT_QUESTION).includes("do_not_remember") &&
    Object.keys(TN_VERDICT_ANSWER).includes("do_not_remember"),
  "the verdict questions do not allow the honest answer that the participant does not remember."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design supplies no fee figure on either track.
  [/[$£€]\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // No outcome is reported and no eligibility is decided.
  [
    /your (record|conviction|charge|case) (has been|was) (expunged|removed|destroyed|cleared|sealed)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|removed|destroyed|cleared|sealed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/\byou qualify\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // Nothing clears itself in Tennessee.
  [
    /(record|charge|case|conviction)s? (will be|are) (automatically |)(expunged|removed|cleared) automatically/i,
    "a claim that a record clears automatically"
  ],
  [/expunction is automatic|expungement is automatic/i, "a claim that expunction is automatic"],
  // The instrument boundaries. None of these three is ours.
  [
    /LegalEase (will|can|does) (prepare|generate|complete|produce|fill)[^.]{0,40}(order|petition|certificate|certification)/i,
    "an offer to produce an instrument that belongs to the court, the prosecutor or the clerk"
  ],
  [/(complete|fill (in|out)|sign) (the |your |TBI )?(form )?BI-0333/i, "an instruction to complete a court order"],
  [/(your|the) (attached|enclosed|generated) (petition|order|certificate)/i, "a generated instrument"],
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|order)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|order|form)/i, "a filing instruction"],
  // No agency is accused and no deadline is invented for the participant.
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  [/the (court|clerk|Bureau|district attorney) has (failed|refused|neglected)/i, "an accusation that an office failed"],
  // The prior-expunction asymmetry is undecided and stays undecided.
  [
    /(a |any )?(prior|previous) expunction (bars|does not bar|disqualifies|does not disqualify|prevents|does not prevent)/i,
    "a decision on the undecided prior-expunction asymmetry"
  ],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bTN\s+3\d{4}\b/, "a postal code"],
  [/\b(1-)?\d{3}[-.]\d{3}[-.]\d{4}\b/, "a telephone number"],
  // What is unestablished stays unestablished.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy"],
  [
    /section 40-32-105 (requires|allows|provides that|applies (where|when|to))/i,
    "a statement of a mechanism whose current text was not retrievable"
  ],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds)\b/i, "internal legal-design jargon"],
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
    /LegalEase cannot tell you that a record has been expunged/i,
    "the refusal to report an outcome"
  ],
  [
    /does not prepare a petition or a proposed order that Tennessee law puts in the hands of the district attorney general/i,
    "the prosecutor-instrument boundary"
  ],
  [
    /record search and certification that Tennessee law puts in the hands of the clerk/i,
    "the clerk-instrument boundary"
  ],
  [/expunction is not automatic/i, "the statement that nothing clears itself"],
  [/Tennessee Bureau of Investigation/, "the body that holds the criminal history"],
  [/Public Chapter 268/, "the reorganisation act"],
  [/24 April 2025/, "the date the reorganisation took effect"],
  [/Public Chapter 608/, "the Code Bill that codified it"],
  [/25 March 2026/, "the date the Code Bill took effect"],
  [/40-32-101/, "the superseded section number an office may still be using"],
  [
    /Confirm the section number with the clerk of the court or the district attorney general/i,
    "the instruction to confirm the citation before relying on it"
  ]
];

const PER_TRACK = {
  tn_acquittal_immediate: [
    [/40-32-106/, "the governing section"],
    [/40-32-106\(a\)\(1\)/, "the no-cost provision"],
    [/without cost to the person/i, "the statutory bar on a fee"],
    [/40-32-110/, "the restoration effect"],
    [/not guilty on every count/i, "the all-counts condition"],
    [/must ask the acquitted person/i, "the duty the route runs on"],
    [/thirty days/i, "the transmission period the participant has to allow for"],
    [/BI-0333/, "the court order the participant should be able to recognise"],
    [/Order for the Expungement of Criminal Offender Record/, "what that form actually is"],
    [/state control number/i, "the identifier the order cannot be completed without"],
    [/not been confirmed against any official statement of Tennessee practice/i, "the unconfirmed-practice caveat"]
  ],
  tn_trafficking_40_32_105: [
    [/40-32-105/, "the provision this node names"],
    [/40-32-102\(c\)\(2\)/, "the first cross-reference that proves it operative"],
    [/40-32-106\(c\)\(1\)/, "the second cross-reference that proves it operative"],
    [/could not be retrieved from any official Tennessee source/i, "the honest limit on what is known"],
    [/does not prepare/i, "the statement that this route is referred out"],
    [/survivor services/i, "the destination beyond a lawyer"],
    [/contested evidentiary/i, "the reason it is referred out"],
    [/You do not have to explain/i, "the assurance the participant is not asked to describe the victimisation"],
    [/not established/i, "the unestablished cost and notice position"]
  ]
};

/** Copy that belongs to one route and must not leak onto the other. */
const FORBIDDEN_PER_TRACK = {
  tn_acquittal_immediate: [
    [/traffick/i, "the other route's subject matter"],
    [/survivor services/i, "the other route's destination"]
  ],
  tn_trafficking_40_32_105: [
    [/without cost to the person/i, "the acquittal route's statutory fee bar"],
    [/state control number/i, "the acquittal route's own identifier requirement"],
    [/BI-0333/, "the acquittal route's court-order form"],
    [/thirty days/i, "the acquittal route's transmission period"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveTennesseeGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "TN",
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
      jurisdiction: "TN",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "TN",
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
    jurisdiction: "TN",
    jurisdictionName: "Tennessee",
    packetName: resolved.track.assembledPacketName,
    caseReference: "2019-A-4471",
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

for (const track of TENNESSEE_GUIDANCE_TRACKS) {
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
  delete facts.stateControlNumber;
  let outcome = "generated";
  try {
    const derived = deriveTennesseeGuidanceFacts("tn_acquittal_immediate", facts);
    resolvePacket({
      jurisdiction: "TN",
      trackId: "tn_acquittal_immediate",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing state control number: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no participant-generated instrument, and nothing asserted about a section whose text was not retrievable.`
);

console.log("");
if (failures.length > 0) {
  console.error("Tennessee guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Tennessee guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(26)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
