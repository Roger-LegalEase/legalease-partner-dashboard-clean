// Texas guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Texas is not enabled, the
// assigned track has a governing specification and matches the adopted packet
// set and manifest in component identity, order and requirement, the route
// renders deterministically into one final guidance PDF with no blank page and
// no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the
// node the participant is standing on, no artifact carries petition structure
// or a submission instruction, and every place the design draws a self-help
// boundary is stated rather than papered over.
//
// Five rules here are Texas's own:
//
//   - **No pleading is generated in this lane.** The article's vehicle is an
//     ex parte petition under art. 55A.251, or art. 55A.252 for a fine-only
//     arrest, and it belongs to an attorney. Naming it is required so the
//     participant recognises it; producing it, part-producing it or offering a
//     draft to adapt is prohibited, and a request for one is a typed stop.
//   - **No prosecutor consent is claimed or predicted.** Whether an office
//     would recommend expunction is that office's decision. Any statement that
//     one will, has, or can be induced to is prohibited, and the copy must say
//     nobody can tell you in advance.
//   - **Relief is discretionary and no court or agency is described as having
//     acted.** The word "may" is the whole point of the article, so the
//     discretion is required copy and any claim that a court will or did grant
//     an expunction is prohibited.
//   - **Expunction, nondisclosure and the no-petition routes stay distinct.**
//     The design places this article among Chapter 55A expunction; orders of
//     nondisclosure are a different remedy and at least one Texas route issues
//     without a petition. The distinction is required copy, because a
//     participant who conflates them buys the wrong thing.
//   - **The art. 55A.151 criminal-episode bar is the screen that matters.**
//     It is required copy and a typed stop, and the stop fires on "not sure"
//     as well as on a known companion matter, because the design records the
//     question as one the participant cannot answer alone.
//
// The universal referral is content, not a throw. The adopted decision refers
// every participant on this article to an attorney or legal aid; encoding that
// as a typed stop would mean the assigned deliverable never renders. So the
// referral is asserted as required text and the typed stops are reserved for
// the answers that discriminate.
//
// Money: the design quotes no figure for this article, so no currency figure
// may appear. That a Rule 145 Statement of Inability remains available to a
// participant who proceeds with counsel is carried without a figure.
//
// Why there is no regression variant: the adopted packet set carries a single
// required component and the template interpolates no participant answer, so a
// second fixture would render byte-for-byte the same packet. The branches that
// matter are typed stops, and all seven are exercised below.

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
  TEXAS_GUIDANCE_TRACKS,
  TEXAS_GUIDANCE_TEMPLATES,
  TX_RECORD_JURISDICTIONS,
  TX_ACQUITTAL_POSTURE,
  TX_CRIMINAL_EPISODE,
  TX_FINE_ONLY,
  TexasGuidanceStopError,
  TexasRouteMismatchError,
  TexasBranchError,
  deriveTexasGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/texas/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/texas-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["tx_exp_discretionary"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "TX" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Texas track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("tx-")).length === 0,
  "Texas templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Texas track in the shared registry, no Texas template in the shared guidance pack.");

for (const t of TEXAS_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, TEXAS_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned track, nothing promoted.
ok(
  JSON.stringify(TEXAS_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of TEXAS_GUIDANCE_TRACKS) {
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
for (const track of TEXAS_GUIDANCE_TRACKS) {
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
  // The design says LegalEase files nothing here and generates no document.
  ok(
    /Nothing is filed by LegalEase/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that LegalEase files nothing.`
  );
  ok(
    /^none/i.test((designed?.rules?.participantSignature ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  // And that the node is a referral rather than a build.
  ok(
    /refers the participant to an attorney|attorney referral/i.test(
      JSON.stringify(designed?.destination ?? {}) + JSON.stringify(designed?.legalDesignDecision ?? {})
    ),
    `${track.trackId}: the design no longer records this node as a referral.`
  );
}
ok(componentCount === 1, `expected the design's 1 component, found ${componentCount}.`);
ok(conditionalCount === 0, `the Texas design has no conditional component, found ${conditionalCount}.`);
const used = new Set(TEXAS_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(TEXAS_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} component across ${ASSIGNED.length} track, specified, matching the design and the adopted manifest in identity, order and requirement, not source-bound.`
);

for (const [id, template] of Object.entries(TEXAS_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Harris County participant convicted at trial and later
// acquitted by a court of appeals, with no companion offence from the episode,
// no appellate-posture question and no request for anything to be drafted.
const BASE = {
  recordJurisdiction: "texas_state",
  acquittalPosture: "court_of_appeals",
  prosecutorRecommendationOffered: "no",
  criminalEpisode: "no_other_offence_in_the_episode",
  hasAppellatePostureQuestion: "no",
  wantsHelpObtainingARecommendation: "no",
  wantsAPleadingPrepared: "no",
  fineOnlyArrest: "not_a_fine_only_arrest",
  acquittalDate: "9 March 2026, Fourteenth Court of Appeals",
  countyOfProsecution: "Harris County"
};

const NEG = [
  ["tx_exp_discretionary", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_texas_state_record"],
  ["tx_exp_discretionary", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_texas_state_record"],
  ["tx_exp_discretionary", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_texas_state_record"],
  [
    "tx_exp_discretionary",
    { acquittalPosture: "trial_court" },
    "mismatch",
    "acquittal_was_at_trial_rather_than_on_appeal"
  ],
  [
    "tx_exp_discretionary",
    { acquittalPosture: "not_acquitted", prosecutorRecommendationOffered: "no" },
    "mismatch",
    "neither_route_in_the_article_is_in_play"
  ],
  [
    "tx_exp_discretionary",
    { criminalEpisode: "convicted_of_another_offence_in_the_episode" },
    "stop",
    "companion_offence_from_the_same_criminal_episode"
  ],
  [
    "tx_exp_discretionary",
    { criminalEpisode: "still_subject_to_prosecution_in_the_episode" },
    "stop",
    "companion_offence_from_the_same_criminal_episode"
  ],
  // The design records the episode question as one the participant cannot
  // answer alone, so "not sure" fails closed rather than falling through.
  [
    "tx_exp_discretionary",
    { criminalEpisode: "not_sure" },
    "stop",
    "companion_offence_from_the_same_criminal_episode"
  ],
  [
    "tx_exp_discretionary",
    { hasAppellatePostureQuestion: "yes" },
    "stop",
    "appellate_posture_question_requires_advocacy"
  ],
  [
    "tx_exp_discretionary",
    { wantsHelpObtainingARecommendation: "yes" },
    "stop",
    "obtaining_a_prosecutor_recommendation_is_negotiation"
  ],
  [
    "tx_exp_discretionary",
    { wantsAPleadingPrepared: "yes" },
    "stop",
    "pleading_requested_on_a_route_that_generates_none"
  ],
  // The prosecutor-recommendation route renders where there is no acquittal.
  [
    "tx_exp_discretionary",
    { acquittalPosture: "not_acquitted", prosecutorRecommendationOffered: "yes" },
    "generated"
  ],
  ["tx_exp_discretionary", { acquittalPosture: "court_of_criminal_appeals" }, "generated"],
  ["tx_exp_discretionary", { fineOnlyArrest: "fine_only_arrest" }, "generated"],
  ["tx_exp_discretionary", { fineOnlyArrest: "not_sure" }, "generated"],
  // Closed lists fail closed rather than falling through.
  ["tx_exp_discretionary", { recordJurisdiction: "" }, "branch"],
  ["tx_exp_discretionary", { recordJurisdiction: "texas" }, "branch"],
  ["tx_exp_discretionary", { acquittalPosture: "appeals" }, "branch"],
  ["tx_exp_discretionary", { acquittalPosture: "" }, "branch"],
  ["tx_exp_discretionary", { prosecutorRecommendationOffered: "maybe" }, "branch"],
  ["tx_exp_discretionary", { criminalEpisode: "none" }, "branch"],
  ["tx_exp_discretionary", { hasAppellatePostureQuestion: "possibly" }, "branch"],
  ["tx_exp_discretionary", { wantsHelpObtainingARecommendation: "later" }, "branch"],
  ["tx_exp_discretionary", { wantsAPleadingPrepared: "please" }, "branch"],
  ["tx_exp_discretionary", { fineOnlyArrest: "fine only" }, "branch"]
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
  tx_exp_discretionary: /the discretionary expunction route|the 55A\.101 route|the discretionary article route/i
};

/**
 * The stops whose honesty the design turns on.
 *
 * Each carries a fact a later edit could drop while leaving the stop id and
 * the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  companion_offence_from_the_same_criminal_episode: [
    [/55A\.151/, "the article that bars relief"],
    [/criminal episode/i, "the concept the bar turns on"],
    [/cannot tell/i, "why the uncertain answer stops too"]
  ],
  appellate_posture_question_requires_advocacy: [
    [/discretionary review has expired/i, "the condition the appellate route turns on"],
    [/mandate/i, "the document that shows where the case stands"]
  ],
  obtaining_a_prosecutor_recommendation_is_negotiation: [
    [/negotiation/i, "the reason this is outside a packet"],
    [/before/i, "the timing the article imposes on a recommendation"],
    [/does not negotiate/i, "the boundary stated as a boundary"]
  ],
  pleading_requested_on_a_route_that_generates_none: [
    [/55A\.251/, "the vehicle an attorney would use"],
    [/does not prepare it/i, "the refusal, stated plainly"]
  ],
  acquittal_was_at_trial_rather_than_on_appeal: [
    [/entitled to expunction/i, "why the other route is the better one"]
  ],
  neither_route_in_the_article_is_in_play: [
    [/nondisclosure/i, "the other remedy the intake separates"]
  ],
  record_is_not_a_texas_state_record: [
    [/Texas records in Texas courts/i, "the reach of the chapter"]
  ]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit|draft)/i, "an offer to act for the participant"],
  [/the (prosecutor|State|office) (will|would|has agreed to) recommend/i, "a claim about prosecutor consent"],
  [/the court (will|would) (grant|order|expunge)/i, "a claim about how a court would exercise its discretion"],
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "an invented deadline"],
  [/you (can|may) appeal/i, "an invented appeal"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveTexasGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof TexasGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof TexasRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof TexasBranchError) outcome = "branch";
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
ok(typedStops.size === 7, `expected 7 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} cases exercised; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act, none claiming prosecutor consent and none predicting a court.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(TX_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "texas_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(TX_ACQUITTAL_POSTURE).sort()) ===
    JSON.stringify(["court_of_appeals", "court_of_criminal_appeals", "not_acquitted", "trial_court"]),
  "the acquittal-posture list does not separate the two appellate courts from the trial court."
);
ok(
  Object.keys(TX_CRIMINAL_EPISODE).includes("not_sure"),
  "the criminal-episode list does not allow the honest answer that the participant cannot tell."
);
ok(
  Object.keys(TX_FINE_ONLY).includes("fine_only_arrest"),
  "the fine-only list does not carry the answer art. 55A.101(b) turns on."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design quotes no figure for this article.
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
  // Discretion is the point of the article. No court is predicted.
  [/the court (will|shall) (grant|order|expunge)/i, "a promise about a discretionary decision"],
  [/the (court|judge) (granted|ordered|has expunged)/i, "a claim that a court has acted"],
  [/expunction is (automatic|guaranteed|certain)/i, "a claim that discretionary relief is automatic"],
  // Prosecutor consent is never claimed, predicted or promised.
  [
    /the (prosecutor|prosecutor's office|State|district attorney)('s office)? (will|would|has agreed to|is likely to) recommend/i,
    "a claim or prediction about prosecutor consent"
  ],
  [/(has|have) recommended (the )?expunction/i, "a claim that a recommendation was made"],
  [
    /(we|LegalEase) (will|can) (ask|approach|negotiate with|contact) the (prosecutor|district attorney)/i,
    "an offer to negotiate with a prosecutor"
  ],
  // No pleading in this lane.
  [
    /(this (packet|page)|LegalEase) (prepares|includes|generates|contains|drafts) (a|the|your) (petition|motion|application|order)/i,
    "a claim that this packet produces a pleading"
  ],
  [/(your|the) (attached|enclosed|generated|draft) (petition|motion|application|order)/i, "a generated instrument"],
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|form|application)/i, "a filing instruction"],
  // No agency is accused, no remedy or deadline is invented.
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "a deadline the design does not state"],
  [
    /the (court|clerk|prosecutor|district attorney) (has |had )?(failed|refused|neglected)/i,
    "an accusation that an office failed"
  ],
  [/the remedy (is|would be) to (file|apply|move|appeal)/i, "an invented remedy"],
  [/you (can|may|should) appeal/i, "an invented appeal"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bTX\s+7\d{4}\b/, "a postal code"],
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
  // The article, its two routes and its dates.
  [/55A\.101/, "the governing article"],
  [/1 September 2025/, "the date the article took effect"],
  [/S\.?B\.? 1667|Senate Bill 1667/, "the act that added it"],
  [/Court of Criminal Appeals/, "the first appellate court the article names"],
  [/court of appeals/i, "the second appellate court the article names"],
  [/discretionary review has expired/i, "the condition on the court-of-appeals route"],
  [/before (the person is tried|you are tried|trial)/i, "the timing on the recommendation route"],
  [/\bmay\b/, "the discretion the article confers"],
  [/discretion/i, "the discretion, named as such"],
  // The bar and the forum rule.
  [/55A\.151/, "the criminal-episode bar"],
  [/criminal episode/i, "the concept the bar turns on"],
  [/55A\.101\(b\)/, "the fine-only forum rule"],
  [/fine-only/i, "the arrest type the forum rule turns on"],
  // The vehicle, named but not produced.
  [/55A\.251/, "the ex parte petition provision"],
  [/55A\.252/, "the fine-only petition provision"],
  [/ex parte/i, "the nature of the petition"],
  [/no Texas expunction form|contains none/i, "the absence of any official form"],
  // The referral, which is the deliverable.
  [/negotiation/i, "the reason the recommendation route is outside a packet"],
  [/legal aid/i, "the destination the design requires"],
  [/nondisclosure/i, "the remedy the design keeps distinct from expunction"],
  [/without (any petition|a petition)/i, "the Texas routes that issue without a petition"],
  [/Rule 145/, "the fee-waiver procedure that survives for a participant with counsel"],
  [/nobody can tell you/i, "the refusal to predict a prosecutor's decision"]
];

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveTexasGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "TX",
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
      jurisdiction: "TX",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "TX",
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
    jurisdiction: "TX",
    jurisdictionName: "Texas",
    packetName: resolved.track.assembledPacketName,
    caseReference: "1642-887-A",
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
  return assembled.sha256;
}

for (const track of TEXAS_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");

// The other route through the article renders the identical packet, which is
// what makes one canonical fixture sufficient rather than merely convenient.
{
  const other = await assembleOnly({
    acquittalPosture: "not_acquitted",
    prosecutorRecommendationOffered: "yes"
  });
  ok(
    other === samples[0].sha256,
    "the recommendation route changes the packet, so one fixture no longer covers the track."
  );
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.countyOfProsecution;
  let outcome = "generated";
  try {
    const derived = deriveTexasGuidanceFacts("tx_exp_discretionary", facts);
    resolvePacket({
      jurisdiction: "TX",
      trackId: "tx_exp_discretionary",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing county of prosecution: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifact renders deterministically from ${samples.reduce((n, s) => n + s.components, 0)} component, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no pleading generated, no prosecutor consent claimed, and no court described as having acted.`
);

console.log("");
if (failures.length > 0) {
  console.error("Texas guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Texas guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(22)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

async function assembleOnly(extraFacts) {
  const track = TEXAS_GUIDANCE_TRACKS[0];
  const facts = deriveTexasGuidanceFacts(track.trackId, { ...BASE, ...extraFacts });
  const resolved = resolvePacket({
    jurisdiction: "TX",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "TX",
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
    jurisdiction: "TX",
    jurisdictionName: "Texas",
    packetName: resolved.track.assembledPacketName,
    caseReference: "1642-887-A",
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
