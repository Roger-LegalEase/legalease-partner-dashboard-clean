// Wisconsin guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Wisconsin is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set, all four routes render deterministically into one final guidance PDF
// each with no blank page and no detached heading, every typed stop and closed
// list fails closed with a reason, a destination and a next step, no stop
// routes back to the node the participant is standing on, no artifact claims
// relief occurred, no artifact carries petition language, the trafficking route
// asks one screening question and generates nothing, and the three things the
// adopted design leaves open are stated as open rather than answered.

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
  WISCONSIN_GUIDANCE_TRACKS,
  WISCONSIN_GUIDANCE_TEMPLATES,
  WI_RECORD_JURISDICTIONS,
  WI_SENTENCE_TYPES,
  WisconsinGuidanceStopError,
  WisconsinRouteMismatchError,
  WisconsinBranchError,
  deriveWisconsinGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/wisconsin/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/wisconsin-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "wi_def_961_47",
  "wi_exp_942_08_mandatory",
  "wi_exp_certificate_of_discharge",
  "wi_exp_trafficking_2m"
];

// 1. Not enabled.
//
// The shared registry ships `technical-fixture-*` tracks under real
// jurisdiction codes, so the assertion is that no *real* Wisconsin track is
// wired in — not that the code is absent altogether.
ok(
  RELIEF_TRACKS.filter(
    (t) => t.jurisdiction === "WI" && !t.trackId.startsWith("technical-fixture-")
  ).length === 0,
  "A real Wisconsin track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("wi-")).length === 0,
  "Wisconsin templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Wisconsin track in the shared registry, no Wisconsin template in the shared guidance pack.");

for (const t of WISCONSIN_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, WISCONSIN_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(WISCONSIN_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of WISCONSIN_GUIDANCE_TRACKS) {
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
for (const track of WISCONSIN_GUIDANCE_TRACKS) {
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
    ok(match?.requirement === c.requirement, `${c.componentId}: requirement differs from the design.`);
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
const used = new Set(
  WISCONSIN_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(WISCONSIN_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design in identity, order and requirement, none source-bound.`
);

// 4. Closed lists and typed stops.
//
// The base fixture is a Dane County participant with no immigration question
// and no trafficking connection, on a case whose judgment records the
// at-sentencing expungement order. Each track overrides what its own route needs.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "wisconsin",
  immigrationQuestion: "no",
  traffickingConnection: "no",
  // wi_exp_certificate_of_discharge and wi_exp_942_08_mandatory
  sentencingHasHappened: "yes",
  expungementOrderedAtSentencing: "yes",
  convictionIsOwi: "no",
  offenceClassKnown: "yes",
  ageAtOffense: "21",
  caseNumberAndCounty: "2019CM001744, Dane County",
  sentenceType: "probation",
  sentenceCompletionDate: "2 October 2022",
  probationRevoked: "no",
  subsequentConviction: "no",
  stillVisibleOnCcap: "yes",
  supervisingAuthority: "Wisconsin Department of Corrections, Dane County probation office",
  offenceIs94208: "yes",
  ageUnder18AtOffence: "yes",
  // wi_exp_trafficking_2m
  offenceIs94430: "yes",
  // wi_def_961_47
  caseStillBeingDecided: "no",
  deferredJudgmentGranted: "yes",
  chargeWasPossession: "yes",
  priorControlledSubstanceOffence: "no",
  conditionsFulfilled: "yes",
  dischargeAndDismissalEntered: "yes",
  priorConditionalDischarge: "no"
};

/** Per-track overrides so each route's own qualifying answer is given. */
const TRACK_FIXTURES = {
  wi_exp_trafficking_2m: { traffickingConnection: "yes" }
};

const NEG = [
  // The gates that run on every assigned route.
  ["wi_exp_certificate_of_discharge", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["wi_exp_942_08_mandatory", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["wi_def_961_47", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["wi_exp_trafficking_2m", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["wi_exp_certificate_of_discharge", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_wisconsin_record"],
  ["wi_def_961_47", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_wisconsin_record"],
  ["wi_exp_trafficking_2m", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_wisconsin_record"],
  ["wi_exp_certificate_of_discharge", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  ["wi_def_961_47", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  // The trafficking screen, in both directions.
  ["wi_exp_certificate_of_discharge", { traffickingConnection: "yes" }, "mismatch", "trafficking_or_exploitation_fact_pattern"],
  ["wi_exp_942_08_mandatory", { traffickingConnection: "yes" }, "mismatch", "trafficking_or_exploitation_fact_pattern"],
  ["wi_def_961_47", { traffickingConnection: "yes" }, "mismatch", "trafficking_or_exploitation_fact_pattern"],
  ["wi_exp_trafficking_2m", { traffickingConnection: "no" }, "mismatch", "no_trafficking_connection_to_route"],
  // wi_exp_certificate_of_discharge.
  ["wi_exp_certificate_of_discharge", { sentencingHasHappened: "no" }, "stop", "sentencing_has_not_yet_happened"],
  ["wi_exp_certificate_of_discharge", { expungementOrderedAtSentencing: "no" }, "stop", "expungement_was_not_ordered_at_sentencing"],
  ["wi_exp_certificate_of_discharge", { convictionIsOwi: "yes" }, "stop", "conviction_is_an_intoxicated_driving_offence"],
  ["wi_exp_certificate_of_discharge", { offenceClassKnown: "no" }, "stop", "offence_class_or_violent_offence_question"],
  ["wi_exp_certificate_of_discharge", { sentenceType: "fine_or_costs_only" }, "mismatch", "sentence_carried_neither_supervision_nor_confinement"],
  ["wi_exp_certificate_of_discharge", { probationRevoked: "yes" }, "stop", "probation_was_revoked"],
  ["wi_exp_certificate_of_discharge", { subsequentConviction: "yes" }, "stop", "subsequent_conviction_before_completion"],
  // wi_exp_942_08_mandatory.
  ["wi_exp_942_08_mandatory", { sentencingHasHappened: "no" }, "stop", "sentencing_has_not_yet_happened"],
  ["wi_exp_942_08_mandatory", { offenceIs94208: "no" }, "mismatch", "offence_is_not_a_section_942_08_violation"],
  ["wi_exp_942_08_mandatory", { ageUnder18AtOffence: "no" }, "mismatch", "person_was_18_or_older_at_the_offence"],
  ["wi_exp_942_08_mandatory", { expungementOrderedAtSentencing: "no" }, "stop", "mandatory_order_was_not_entered_at_sentencing"],
  ["wi_exp_942_08_mandatory", { subsequentConviction: "yes" }, "stop", "completion_is_in_dispute_after_a_revocation_or_a_later_conviction"],
  ["wi_exp_942_08_mandatory", { probationRevoked: "yes" }, "stop", "completion_is_in_dispute_after_a_revocation_or_a_later_conviction"],
  // wi_exp_trafficking_2m.
  ["wi_exp_trafficking_2m", { traffickingConnection: "yes", offenceIs94430: "no" }, "mismatch", "offence_is_not_a_section_944_30_violation"],
  // wi_def_961_47.
  ["wi_def_961_47", { caseStillBeingDecided: "yes" }, "stop", "plea_or_sentencing_has_not_yet_happened"],
  ["wi_def_961_47", { deferredJudgmentGranted: "no" }, "mismatch", "the_court_convicted_rather_than_deferring"],
  ["wi_def_961_47", { chargeWasPossession: "no" }, "mismatch", "charge_was_not_possession_or_attempted_possession"],
  ["wi_def_961_47", { priorControlledSubstanceOffence: "yes" }, "stop", "prior_controlled_substance_conviction"],
  ["wi_def_961_47", { priorConditionalDischarge: "yes" }, "stop", "an_earlier_discharge_and_dismissal_under_the_section_exists"],
  ["wi_def_961_47", { conditionsFulfilled: "no" }, "stop", "terms_and_conditions_not_fulfilled"],
  ["wi_def_961_47", { dischargeAndDismissalEntered: "no" }, "stop", "discharge_and_dismissal_has_not_been_entered"],
  // Closed lists fail closed rather than falling through.
  ["wi_exp_certificate_of_discharge", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["wi_exp_certificate_of_discharge", { recordJurisdiction: "" }, "branch"],
  ["wi_exp_certificate_of_discharge", { immigrationQuestion: "unsure" }, "branch"],
  ["wi_exp_certificate_of_discharge", { traffickingConnection: "rather not say" }, "branch"],
  ["wi_exp_certificate_of_discharge", { sentenceType: "deferred" }, "branch"],
  ["wi_exp_certificate_of_discharge", { convictionIsOwi: "probably" }, "branch"],
  ["wi_exp_942_08_mandatory", { ageUnder18AtOffence: "" }, "branch"],
  ["wi_def_961_47", { deferredJudgmentGranted: "sort of" }, "branch"],
  ["wi_exp_trafficking_2m", { traffickingConnection: "yes", offenceIs94430: "unknown" }, "branch"]
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
  wi_exp_certificate_of_discharge: /certificate-of-discharge route/i,
  wi_exp_942_08_mandatory: /mandatory expungement route|973\.015\(1m\)\(a\)2 route/i,
  wi_exp_trafficking_2m: /trafficking-survivor route under § 973\.015\(2m\)/i,
  wi_def_961_47: /conditional-discharge route under § 961\.47/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveWisconsinGuidanceFacts(trackId, {
      ...BASE,
      ...(TRACK_FIXTURES[trackId] ?? {}),
      ...override
    });
  } catch (e) {
    if (e instanceof WisconsinGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof WisconsinRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof WisconsinBranchError) outcome = "branch";
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
ok(typedStops.size >= 28, `only ${typedStops.size} distinct typed stops carried a destination.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed lists are the ones implemented, with nothing added.
ok(
  JSON.stringify(Object.keys(WI_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "tribal", "wisconsin"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(WI_SENTENCE_TYPES).sort()) ===
    JSON.stringify(["fine_or_costs_only", "jail", "prison", "probation"]),
  "the sentence-type list is not the design's list."
);

// The trafficking route asks one screening question and asks for nothing else.
{
  const track = WISCONSIN_GUIDANCE_TRACKS.find((t) => t.trackId === "wi_exp_trafficking_2m");
  const keys = track.requiredInputs.map((i) => i.key);
  ok(keys.includes("traffickingConnection"), "the trafficking route does not carry the screening question.");
  ok(
    !keys.some((k) => /detail|describe|circumstance|what happened|narrative|statement/i.test(k)),
    "the trafficking route asks for detail the design forbids."
  );
  for (const input of track.requiredInputs) {
    ok(
      !/describe|tell us what|in your own words|details of/i.test(input.label),
      `the trafficking route asks for detail: "${input.label}".`
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
  [/your (record|conviction|charge|case) (has been|was) (expunged|sealed|removed|dismissed)/i, "a claim that relief occurred"],
  [/is now (expunged|sealed|removed)/i, "a claim that the record is already dealt with"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No fabricated office.
  [/\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/, "a street address"],
  [/\bWI\s+5\d{4}\b/, "a postal code"],
  // The three open questions stay open.
  [/(an expunged record|expungement) is not a conviction for (employment|licensing)/i, "an answer to the reserved employment and licensing question"],
  [/you (may|can) (lawfully )?(answer|say) (no|that you have no conviction)/i, "advice on answering a conviction question"],
  [/(OWI|intoxicated[- ]driving) convictions? (can|cannot|may not) be expunged/i, "a decision on the reserved OWI question"],
  // The trafficking route must not produce or solicit a factual showing.
  [/statement of facts (is|are) (prepared|generated|drafted) (here|by LegalEase)/i, "a generated trafficking showing"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [/has not contacted any court, clerk, agency or authority/i, "the disclaimer of having contacted anyone"],
  [/This page describes what the law does/, "the not-a-report-on-your-case warning"]
];

const PER_TRACK = {
  wi_exp_certificate_of_discharge: [
    [/973\.015\(1m\)\(b\)/, "the governing provision"],
    [/certificate of discharge/i, "the instrument that carries the relief"],
    [/Matasek/, "the case confining the decision to sentencing"],
    [/Arberry/, "the case foreclosing later modification"],
    [/Braunschweig/, "the case on what expungement does not do"],
    [/Leitner/, "the case on records that survive"],
    [/CR-266/, "the state's own warning form"],
    [/343\.23\(2\)\(a\)/, "the Department of Transportation carve-out"],
    [/has genuinely not been settled|has been left open rather than guessed at/i, "the reserved employment and licensing question"],
    [/successful completion/i, "the statutory completion test"],
    [/Wisconsin Circuit Court Access/, "the public record the participant checks"]
  ],
  wi_exp_942_08_mandatory: [
    [/973\.015\(1m\)\(a\)2/, "the governing provision"],
    [/942\.08/, "the offence the provision reaches"],
    [/under 18/i, "the age threshold"],
    [/no discretion/i, "the mandatory character of the order"],
    [/grievance/i, "the distinction from a discretionary refusal"],
    [/does not assert that the mandatory order should have been entered/i, "the refusal to assert a legal conclusion"]
  ],
  wi_exp_trafficking_2m: [
    [/973\.015\(2m\)/, "the governing subsection"],
    [/944\.30/, "the offence the subsection reaches"],
    [/971\.30/, "the compliance requirement for the motion"],
    [/only adult route in Wisconsin that operates after sentencing/i, "the reason the route is retained"],
    [/no detail about it is wanted|You will not be asked for any detail/i, "the trauma rule"],
    [/does not prepare the § 973\.015\(2m\) motion/i, "the refusal to draft the motion"],
    [/no official Wisconsin form was identified/i, "the preserved form build blocker"]
  ],
  wi_def_961_47: [
    [/961\.47/, "the governing section"],
    [/961\.41\(3g\)\(b\)/, "the charge the section reaches"],
    [/961\.48/, "the enhanced-penalty provision the disposition avoids"],
    [/without adjudication of guilt/i, "what the disposition is"],
    [/no expungement provision/i, "the answered build blocker, stated rather than assumed"],
    [/only one discharge and dismissal/i, "the once-per-lifetime limit"],
    [/20 days/, "the clerk-to-Department notification duty"],
    [/CR-214/, "the court-generated form"],
    [/fingerprint removal/i, "the route the non-conviction status unlocks"]
  ]
};

const samples = [];
for (const track of WISCONSIN_GUIDANCE_TRACKS) {
  const facts = deriveWisconsinGuidanceFacts(track.trackId, {
    ...BASE,
    ...(TRACK_FIXTURES[track.trackId] ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "WI",
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
      jurisdiction: "WI",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "WI",
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
    jurisdiction: "WI",
    jurisdictionName: "Wisconsin",
    packetName: resolved.track.assembledPacketName,
    caseReference: "2019CM-001744",
    title: resolved.track.assembledPacketTitle,
    components
  };
  const assembled = await assemblePacketPdf(assembleInput);
  const againAssembled = await assemblePacketPdf(assembleInput);
  ok(assembled.sha256 === againAssembled.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${track.trackId}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, track.trackId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${track.trackId}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED_EVERYWHERE) ok(pattern.test(text), `${track.trackId}: missing ${why}.`);
  for (const [pattern, why] of PER_TRACK[track.trackId]) ok(pattern.test(text), `${track.trackId}: missing ${why}.`);

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
  const facts = { ...BASE };
  delete facts.caseNumberAndCounty;
  let outcome = "generated";
  try {
    const derived = deriveWisconsinGuidanceFacts("wi_def_961_47", facts);
    resolvePacket({
      jurisdiction: "WI",
      trackId: "wi_def_961_47",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case number: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Wisconsin guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Wisconsin guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(34)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
