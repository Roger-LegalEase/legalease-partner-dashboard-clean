// Oklahoma guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Oklahoma is not enabled, both
// assigned tracks have a governing specification and match the adopted packet
// set and manifest in component identity, order and requirement, both routes
// render deterministically into one final guidance PDF each with no blank page
// and no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the node
// the participant is standing on, no artifact carries petition structure or a
// submission instruction, no route carries another route's content, and what
// the design leaves unknown is stated as unknown.
//
// Three rules here are Oklahoma's own:
//
//   - **Neither route is usable today, and the packets must say so.** The
//     design records for both that nothing is filed and *nothing can be*. Any
//     phrasing that suggests a request can be submitted or that automatic
//     sealing is running is prohibited.
//   - **The removal risk must survive.** Senate Bill 2030 removed certain
//     records from automatic eligibility and which ones has not been
//     identified. A packet that describes Clean Slate as coming for everybody
//     would be worse than no packet, so the removal statement is required and
//     any claim that a record will be sealed automatically is prohibited.
//   - **Money.** The design supplies one figure, the $150 processing fee the
//     Bureau charges on an arrest-record expungement. The rule is therefore not
//     that no figure may appear, but that only that one may, and that it
//     appears with the body that charges it.
//
// Why there is no regression variant here: both adopted packet sets make all
// six components required, and no Oklahoma template interpolates a participant
// answer, so a second fixture on the same track would render byte-for-byte the
// same packet. The branches that do matter are typed stops, and all twelve of
// them are exercised below as negative cases.

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
  OKLAHOMA_GUIDANCE_TRACKS,
  OKLAHOMA_GUIDANCE_TEMPLATES,
  OK_RECORD_JURISDICTIONS,
  OklahomaGuidanceStopError,
  OklahomaRouteMismatchError,
  OklahomaBranchError,
  deriveOklahomaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/oklahoma/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/oklahoma-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["ok_clean_slate", "ok_osbi_portal"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "OK" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Oklahoma track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ok-")).length === 0,
  "Oklahoma templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Oklahoma track in the shared registry, no Oklahoma template in the shared guidance pack.");

for (const t of OKLAHOMA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, OKLAHOMA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(OKLAHOMA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of OKLAHOMA_GUIDANCE_TRACKS) {
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
for (const track of OKLAHOMA_GUIDANCE_TRACKS) {
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
  // The design says on both tracks that nothing is filed and nothing can be.
  ok(
    /nothing can be/i.test(designed?.rules?.filing ?? ""),
    `${track.trackId}: the design no longer records that nothing can be filed on this route.`
  );
}
ok(componentCount === 6, `expected the design's 6 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Oklahoma design has no conditional component, found ${conditionalCount}.`);
const used = new Set(OKLAHOMA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(OKLAHOMA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(OKLAHOMA_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is an Oklahoma County participant who has obtained their own
// criminal history record, holds no immigration question, and is not planning
// to wait for a route that is not running.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordJurisdiction: "oklahoma_state",
  immigrationQuestion: "no",
  obtainedOsbiCriminalHistory: "yes",
  // ok_clean_slate
  heardRecordsClearAutomatically: "yes",
  relyingOnAutomaticSealing: "no",
  caseDetails: "Oklahoma County, District Court, CF-2018-4471, dismissed 14 September 2019",
  ownDeadline: "a background check for a licence renewal in March",
  // ok_osbi_portal
  arrestRecordIsTheGoal: "yes",
  wantsToUseThePortalNow: "no",
  canWaitForAFreeRoute: "yes"
};

const G = [
  ["wantsEligibilityAdvice", "yes", "stop", "individualized_eligibility_advice_requested"],
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_an_oklahoma_state_record"],
  ["recordJurisdiction", "tribal", "stop", "tribal_court_record_is_a_live_oklahoma_question"],
  ["immigrationQuestion", "yes", "stop", "immigration_consequences_in_play"],
  ["obtainedOsbiCriminalHistory", "no", "stop", "criminal_history_record_not_yet_obtained"]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) =>
    G.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])
  ),
  [
    "ok_clean_slate",
    { relyingOnAutomaticSealing: "yes" },
    "stop",
    "relying_on_automatic_sealing_that_is_not_operating"
  ],
  [
    "ok_osbi_portal",
    { wantsToUseThePortalNow: "yes" },
    "stop",
    "no_expedited_request_portal_is_published_to_use"
  ],
  // Closed lists fail closed rather than falling through.
  ["ok_clean_slate", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["ok_clean_slate", { recordJurisdiction: "" }, "branch"],
  ["ok_clean_slate", { recordJurisdiction: "oklahoma" }, "branch"],
  ["ok_clean_slate", { immigrationQuestion: "unsure" }, "branch"],
  ["ok_clean_slate", { obtainedOsbiCriminalHistory: "partly" }, "branch"],
  ["ok_clean_slate", { relyingOnAutomaticSealing: "undecided" }, "branch"],
  ["ok_osbi_portal", { wantsToUseThePortalNow: "later" }, "branch"],
  ["ok_osbi_portal", { recordJurisdiction: "state" }, "branch"]
];

/**
 * How each route names itself when the other points at it.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * the destination actually uses rather than the internal track id.
 */
const SELF_MARKERS = {
  ok_clean_slate: /automatic sealing route|Clean Slate route/i,
  ok_osbi_portal: /expedited request portal route|portal route/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveOklahomaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof OklahomaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof OklahomaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof OklahomaBranchError) outcome = "branch";
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
ok(typedStops.size === 12, `expected 12 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

// The design's own closed list, with tribal separated out as its own answer.
ok(
  JSON.stringify(Object.keys(OK_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "oklahoma_state", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  OK_RECORD_JURISDICTIONS.tribal !== OK_RECORD_JURISDICTIONS.another_state,
  "tribal is not separated from the ordinary out-of-state answer, so it cannot route differently."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // Only the one figure the design supplies may appear.
  [/\$(?!150\b)\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  [
    /your (record|conviction|charge|case) (has been|was) (sealed|expunged|removed|destroyed)/i,
    "a claim that relief occurred"
  ],
  [/is now (sealed|expunged|removed|confidential)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // Neither route is usable today, and neither packet may suggest otherwise.
  [/\byour record will be sealed automatically\b/i, "a promise that automatic sealing will reach this record"],
  [/\bsubmit (a |your )?(expedited )?request (through|via|on) the portal\b/i, "an instruction to use a portal that does not exist"],
  [/\bthe portal is (now )?(open|live|available)\b/i, "a claim that the portal has launched"],
  [/automatic sealing is (now )?(operating|running|live)/i, "a claim that automatic sealing is operating"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No participant submission on either route.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bOK\s+7\d{4}\b/, "a postal code"],
  // What is unknown stays unknown.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy"],
  [/SB 2030 removed (the following|these) records/i, "an identification of the removed categories the design does not have"],
  [/the effective date of Senate Bill 2030 is/i, "an effective date the design did not obtain"],
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
    /has not contacted the Bureau, any court, clerk or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [
    /LegalEase cannot tell you that a record has been sealed/i,
    "the refusal to report an outcome"
  ],
  [/Oklahoma State Bureau of Investigation/, "the body that holds the record"],
  [/nothing can be/i, "the statement that nothing can be filed on this route"],
  [/1 November 2027/, "the statutory deadline"],
  [/November 2029/, "the back-catalogue deadline"],
  [/expressly preserves the right to petition|right to petition is expressly preserved/i, "the preserved petition route"],
  [/not obtained/i, "the honest statement of what the design could not obtain"]
];

const PER_TRACK = {
  ok_clean_slate: [
    [/Senate Bill 2030/, "the governing bill"],
    [/22 O\.S\./, "the amended sections"],
    [/removes eligibility for automatic expungement of certain records|removed certain records from automatic eligibility|removes eligibility/i, "the removal risk"],
    [/has not been identified|not yet identified/i, "the statement that the removed categories are unknown"],
    [/expungement, but in most adult contexts what it means is sealing/i, "the terminology correction"],
    [/fully sealed record is unavailable to the public and to law enforcement/i, "the full-sealing outcome"],
    [/partially sealed record is hidden from the public but remains available to law enforcement/i, "the partial-sealing outcome"],
    [/does not authorise physical destruction/i, "the statement that sealing is not destruction"],
    [/section 19\(N\)/, "the ten-year long-stop"],
    [/\$150/, "the petition-side processing fee the design supplies"],
    [/research and statistical purposes/i, "what the Bureau retains after full sealing"]
  ],
  ok_osbi_portal: [
    [/Senate Bill 2030/, "the governing bill"],
    [/request portal/i, "the thing the route is about"],
    [/no such portal is published|no published portal/i, "the honest status"],
    [/evidence rather than confirmation/i, "the distinction between evidence and confirmation"],
    [/\$150/, "the arrest-record processing fee"],
    [/court-record expungement is free/i, "the contrast that makes the decision"],
    [/paid intermediaries|asks you to pay to submit/i, "the warning about imitations of a free government route"],
    [/expungement, but in most adult contexts what it means is sealing/i, "the terminology correction"],
    [/fully sealed record is unavailable to the public and to law enforcement/i, "the full-sealing outcome"],
    [/section 19\(N\)/, "the ten-year long-stop"]
  ]
};

/** Copy that belongs to one route and must not leak onto the other. */
const FORBIDDEN_PER_TRACK = {
  ok_clean_slate: [
    [/paid intermediaries/i, "the portal route's warning about imitations"],
    [/no such portal is published/i, "the portal route's own status disclosure"]
  ],
  ok_osbi_portal: [
    [
      /the risk in waiting is not simply that it is slow/i,
      "the Clean Slate route's own removal-risk framing"
    ]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveOklahomaGuidanceFacts(track.trackId, { ...BASE, ...(extraFacts ?? {}) });
  const resolved = resolvePacket({
    jurisdiction: "OK",
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
      jurisdiction: "OK",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "OK",
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
    jurisdiction: "OK",
    jurisdictionName: "Oklahoma",
    packetName: resolved.track.assembledPacketName,
    caseReference: "CF-2018-4471",
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

for (const track of OKLAHOMA_GUIDANCE_TRACKS) {
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
  delete facts.caseDetails;
  let outcome = "generated";
  try {
    const derived = deriveOklahomaGuidanceFacts("ok_clean_slate", facts);
    resolvePacket({
      jurisdiction: "OK",
      trackId: "ok_clean_slate",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case details: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no claim that either route is usable today.`
);

console.log("");
if (failures.length > 0) {
  console.error("Oklahoma guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Oklahoma guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(18)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
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
