// Rhode Island guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Rhode Island is not enabled,
// both assigned tracks have a governing specification and match the adopted
// packet set and manifest in component identity, order and requirement, both
// routes render deterministically with no blank page and no detached heading,
// every typed stop and closed list fails closed with a reason, a destination
// and a next step, no stop routes back to its own node, no artifact claims
// relief occurred, and no route carries the other's law.
//
// Two rules here are Rhode Island's own:
//
//   - **Trauma-informed handling governs the § 11-34.1-5 route.** The design
//     says to ask the single screening question and route to review, not to ask
//     for details of trafficking, exploitation or coercion, and not to generate
//     a factual showing. So the packet's refusal to take the details is
//     required to be on the page, and any invitation to describe what happened
//     is prohibited.
//   - **There is no motion under § 12-10-12.** The expungement is automatic,
//     and for a domestic violence filed complaint it operates expressly without
//     a separate chapter 12-1.3 motion. The packet must say so, and must never
//     tell anybody to file one.
//
// Why there is no regression variant here: both adopted packet sets make all
// five components required, and no Rhode Island template interpolates a
// participant answer, so a second fixture on the same track would render
// byte-for-byte the same packet. The branches that matter are typed stops, and
// all eleven are exercised below as negative cases.

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
  RHODE_ISLAND_GUIDANCE_TRACKS,
  RHODE_ISLAND_GUIDANCE_TEMPLATES,
  RI_RECORD_JURISDICTIONS,
  RI_LATER_DV_CHARGE,
  RhodeIslandGuidanceStopError,
  RhodeIslandRouteMismatchError,
  RhodeIslandBranchError,
  deriveRhodeIslandGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/rhode-island/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/rhode-island-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["ri_commercial_sexual_activity", "ri_filed_complaints"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "RI" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Rhode Island track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ri-")).length === 0,
  "Rhode Island templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Rhode Island track in the shared registry, no Rhode Island template in the shared guidance pack.");

for (const t of RHODE_ISLAND_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, RHODE_ISLAND_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(RHODE_ISLAND_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of RHODE_ISLAND_GUIDANCE_TRACKS) {
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
for (const track of RHODE_ISLAND_GUIDANCE_TRACKS) {
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
ok(componentCount === 5, `expected the design's 5 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Rhode Island design has no conditional component, found ${conditionalCount}.`);
const used = new Set(RHODE_ISLAND_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(RHODE_ISLAND_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(RHODE_ISLAND_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder.`);
}

// 4. Closed lists and typed stops.
const BASE = {
  recordJurisdiction: "rhode_island",
  // ri_commercial_sexual_activity
  offenceUnderChapter1134: "yes",
  traffickingOrCoercionConnection: "yes",
  wantsToProvideDetails: "no",
  immigrationQuestion: "no",
  sentenceCompletionDate: "11 March 2024",
  courtAndCaseNumber: "Providence County District Court, 61-2022-04417",
  // ri_filed_complaints
  complaintWasPlacedOnFile: "yes",
  filingDate: "8 February 2021",
  filingPeriodUnclearOnTheDocket: "no",
  actionTakenDuringFilingPeriod: "no",
  domesticViolenceComplaint: "yes",
  laterDomesticViolenceCharge: "none",
  stillShowingOnBci: "no"
};

const NEG = [
  ...ASSIGNED.map((trackId) => [
    trackId,
    { recordJurisdiction: "federal" },
    "mismatch",
    "record_is_not_a_rhode_island_record"
  ]),
  [
    "ri_commercial_sexual_activity",
    { offenceUnderChapter1134: "no" },
    "mismatch",
    "the_charge_was_not_under_section_11_34_1_2_or_11_34_1_4"
  ],
  [
    "ri_commercial_sexual_activity",
    { wantsToProvideDetails: "yes" },
    "stop",
    "details_of_trafficking_exploitation_or_coercion_offered_or_requested"
  ],
  ["ri_commercial_sexual_activity", { immigrationQuestion: "yes" }, "stop", "immigration_consequences_in_play"],
  [
    "ri_filed_complaints",
    { complaintWasPlacedOnFile: "no" },
    "mismatch",
    "the_complaint_was_not_placed_on_file"
  ],
  [
    "ri_filed_complaints",
    { filingPeriodUnclearOnTheDocket: "yes" },
    "stop",
    "the_docket_does_not_make_the_filing_period_clear"
  ],
  [
    "ri_filed_complaints",
    { actionTakenDuringFilingPeriod: "yes" },
    "stop",
    "action_was_taken_on_the_complaint_during_the_filing_period"
  ],
  [
    "ri_filed_complaints",
    { laterDomesticViolenceCharge: "charged_and_not_resolved_that_way" },
    "stop",
    "a_further_domestic_violence_charge_inside_the_three_years"
  ],
  [
    "ri_filed_complaints",
    { laterDomesticViolenceCharge: "not_sure" },
    "stop",
    "whether_a_later_charge_falls_inside_the_three_years_is_not_known"
  ],
  [
    "ri_filed_complaints",
    { stillShowingOnBci: "yes" },
    "stop",
    "the_complaint_still_shows_although_it_should_have_cleared"
  ],
  // Closed lists fail closed rather than falling through.
  ["ri_commercial_sexual_activity", { recordJurisdiction: "" }, "branch"],
  ["ri_commercial_sexual_activity", { offenceUnderChapter1134: "maybe" }, "branch"],
  ["ri_commercial_sexual_activity", { wantsToProvideDetails: "some" }, "branch"],
  ["ri_commercial_sexual_activity", { immigrationQuestion: "unsure" }, "branch"],
  ["ri_filed_complaints", { complaintWasPlacedOnFile: "probably" }, "branch"],
  ["ri_filed_complaints", { laterDomesticViolenceCharge: "acquitted" }, "branch"],
  ["ri_filed_complaints", { stillShowingOnBci: "" }, "branch"]
];

const SELF_MARKERS = {
  ri_commercial_sexual_activity: /§ 11-34\.1-5 route|commercial sexual activity route/i,
  ri_filed_complaints: /filed complaint route|§ 12-10-12 route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveRhodeIslandGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof RhodeIslandGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof RhodeIslandRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof RhodeIslandBranchError) outcome = "branch";
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
ok(typedStops.size === 11, `expected 11 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

ok(
  JSON.stringify(Object.keys(RI_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "rhode_island", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(RI_LATER_DV_CHARGE).sort()) ===
    JSON.stringify(["charged_and_not_resolved_that_way", "dismissed_or_acquitted", "none", "not_sure"]),
  "the later-charge list does not keep a dismissal or acquittal apart from other outcomes."
);

// The section expunges where a later domestic violence charge was dismissed or
// ended in acquittal, so that answer must pass through rather than stop.
{
  let threw = null;
  try {
    deriveRhodeIslandGuidanceFacts("ri_filed_complaints", {
      ...BASE,
      laterDomesticViolenceCharge: "dismissed_or_acquitted"
    });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, `a later charge dismissed or acquitted throws ${threw}, contrary to the section.`);
}

// The later-charge question is only reached on the domestic violence route.
{
  let threw = null;
  try {
    deriveRhodeIslandGuidanceFacts("ri_filed_complaints", {
      ...BASE,
      domesticViolenceComplaint: "no",
      laterDomesticViolenceCharge: "not_sure"
    });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, "the domestic violence question fired on a complaint that was not a domestic violence matter.");
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount neither section identifies"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/\brace\b\s*:/i, "a race field"],
  [
    /your (record|conviction|charge|complaint|case) (has been|was) (expunged|sealed|removed|cleared)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|sealed|cleared|removed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // Trauma-informed handling. Nothing here may invite an account.
  [
    /(describe|tell us|explain|set out) what happened to you/i,
    "an invitation to describe what happened, which the design forbids"
  ],
  [/in your own words/i, "a prompt for a narrative account"],
  [/\bwhat were the circumstances\b/i, "a request for the circumstances of the offence"],
  // There is no motion under § 12-10-12 and none may be suggested.
  [/you (should|must|need to) file a motion/i, "an instruction to file a motion that does not exist"],
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
  [/\bRI\s+0\d{4}\b/, "a postal code"],
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
    /LegalEase cannot tell you that a record has been expunged/i,
    "the refusal to report an outcome"
  ],
  [/Rhode Island/, "the jurisdiction"]
];

const PER_TRACK = {
  ri_commercial_sexual_activity: [
    [/11-34\.1-5/, "the governing section"],
    [/11-34\.1-2/, "one of the two offences it reaches"],
    [/11-34\.1-4/, "the other"],
    [/one year after completion of sentence|one year, rather than/i, "the period"],
    [/regardless of first-offender status/i, "the waiver that most often changes the answer"],
    [/does not want the details/i, "the refusal to take an account of what happened"],
    [/survivor legal service/i, "the destination"],
    [/does not ask for that and does not want it/i, "the refusal restated where the questions are listed"],
    [/unresolved here/i, "the preserved note about further survivor relief"]
  ],
  ri_filed_complaints: [
    [/12-10-12/, "the governing section"],
    [/placed on file/i, "the disposition the section is about"],
    [/filing period/i, "what the ordinary rule turns on"],
    [/three-year period|three years/i, "the domestic violence period"],
    [/without a separate chapter 12-1\.3 motion/i, "the point the design says people are not told"],
    [/dismissed or (results in|ended in|ends in) acquittal/i, "the exception that keeps the rule running"],
    [/Bureau of Criminal Identification/, "where the criminal history record comes from"],
    [/no motion to file under this section/i, "the statement that no motion exists"],
    [/escalation rather than a filing/i, "what to do where it has not cleared"],
    [/not read subsection by subsection/i, "the preserved note on the operative text"]
  ]
};

/** Copy that belongs to one route and must not leak onto the other. */
const FORBIDDEN_PER_TRACK = {
  ri_commercial_sexual_activity: [
    [/without a separate chapter 12-1\.3 motion/i, "the filed-complaint route's own rule"],
    [/Bureau of Criminal Identification/, "the filed-complaint route's verification office"]
  ],
  ri_filed_complaints: [
    [/regardless of first-offender status/i, "the survivor route's own waiver"],
    [/survivor legal service/i, "the survivor route's destination"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveRhodeIslandGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "RI",
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
      jurisdiction: "RI",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "RI",
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
    jurisdiction: "RI",
    jurisdictionName: "Rhode Island",
    packetName: resolved.track.assembledPacketName,
    caseReference: "61-2022-04417",
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

for (const track of RHODE_ISLAND_GUIDANCE_TRACKS) {
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
  delete facts.filingDate;
  let outcome = "generated";
  try {
    const derived = deriveRhodeIslandGuidanceFacts("ri_filed_complaints", facts);
    resolvePacket({ jurisdiction: "RI", trackId: "ri_filed_complaints", facts: derived, allowTechnicalFixtures: true });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing filing date: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no invitation to describe what happened, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Rhode Island guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Rhode Island guidance verification passed.");
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
