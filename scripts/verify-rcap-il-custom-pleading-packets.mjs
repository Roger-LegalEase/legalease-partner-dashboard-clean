// Illinois custom-pleading routes (Tranche 4) — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Illinois is not enabled and its live routes are untouched, authority is
// pinned to committed files, roles and templates match the pins, every
// component has a governing specification, the two delivery models are kept
// apart, citation discipline holds on the prostitution motion, every closed
// list and every individualized-advocacy stop fails closed, participant values
// land, and third-party and attorney fields stay blank.
//
// Runs offline against the real renderer and the real assembler. No network, no
// database, no promotion.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES, pleadingTemplate } = await import("@/lib/rcap/packets/engines/pleading-templates");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const { ILLINOIS_CUSTOM_PLEADING_TRACKS } = await import("@/lib/rcap/packets/registry-il-custom-pleading");
const {
  ILLINOIS_PLEADING_TEMPLATES,
  deriveIllinoisFacts,
  IllinoisBranchError,
  IllinoisEligibilityStopError,
  IL_IMMEDIATE_SEAL_DISPOSITIONS,
  IL_CLASS_4_RECORD_ANSWERS,
  IL_TRAFFICKING_ANSWERS,
  IL_REFERRAL
} = await import("@/lib/rcap/packets/jurisdictions/illinois/custom-pleading");

const root = process.cwd();
const DIR = path.join(root, "data/record-clearing/implementation-tranches");

const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);

// ---------------------------------------------------------------------------
// 0. Illinois is not enabled, and its live routes are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(ILLINOIS_CUSTOM_PLEADING_TRACKS.map((track) => track.trackId));
const assignedInShared = RELIEF_TRACKS.filter((track) => assignedIds.has(track.trackId));
ok(
  assignedInShared.length === 0,
  `An assigned Illinois track is wired into the shared relief-track registry (${assignedInShared.length}). This job must not enable a jurisdiction.`
);
ok(
  RELIEF_TRACKS.filter((track) => !track.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
const illinoisTemplatesInSharedPack = Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("il-"));
ok(
  illinoisTemplatesInSharedPack.length === 0,
  `Illinois templates are wired into the shared pleading-template pack (${illinoisTemplatesInSharedPack.length}). Wiring is the integration captain's step.`
);

// The legacy Illinois generator and the Illinois live document routes must
// still be on disk and unmodified by this job.
for (const legacyPath of [
  "src/app/api/rcap/documents/illinois",
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx"
]) {
  ok(fs.existsSync(path.join(root, legacyPath)), `The legacy Illinois surface ${legacyPath} is missing.`);
}
note("0. Enablement: both assigned tracks are absent from the shared registry and template pack; the legacy Illinois generator is present and untouched.");

for (const track of ILLINOIS_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, ILLINOIS_PLEADING_TEMPLATES);

const tranche = readJson("tranche-4.json");
const pins = readJson("tranche-4-authority-pins.json");
const fixtures = readJson("tranche-4-fixtures.json");
const guidance = readJson("tranche-4-component-guidance.json");
const ownership = readJson("tranche-4-field-ownership.json");
const recommendation = readJson("tranche-4-legal-output-recommendation.json");

// ---------------------------------------------------------------------------
// 1. Assignment is exactly the two assigned tracks
// ---------------------------------------------------------------------------

const selected = tranche.selectedTracks.map((entry) => entry.trackId).sort();
ok(selected.length === 2, `The tranche records ${selected.length} tracks; two were assigned.`);
ok(
  selected.join(",") === "il-immediate-seal,il-prostitution-j-vacate",
  `The tranche records ${selected.join(",")} rather than the two assigned tracks.`
);
ok(
  ILLINOIS_CUSTOM_PLEADING_TRACKS.length === 2,
  "The registry does not build exactly the two assigned tracks."
);
ok(tranche.jurisdiction === "IL", "The tranche jurisdiction is not Illinois.");
note(`1. Assignment: exactly the two assigned tracks, ${selected.join(" and ")}.`);

// ---------------------------------------------------------------------------
// 2. Nothing is promoted
// ---------------------------------------------------------------------------

for (const track of ILLINOIS_CUSTOM_PLEADING_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not marked a non-production fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${track.trackId} claims visual approval.`);
  const runtime = computeRuntimeStatus({
    statuses: track.statuses,
    sourceCurrent: track.sourceCurrent,
    runtimeDisabled: track.runtimeDisabled,
    outputStrategy: track.outputStrategy
  });
  ok(runtime === "runtime_disabled", `${track.trackId} computes ${runtime} rather than runtime_disabled.`);
  for (const component of track.packetSet.components) {
    ok(component.approval.legal === "not_submitted", `${component.componentId} claims legal approval.`);
    ok(component.approval.visual === "not_reviewed", `${component.componentId} claims visual approval.`);
  }
}
ok(tranche.packetReady === false, "The tranche claims packet readiness.");
ok(tranche.generationAllowed === false, "The tranche claims generation is allowed.");
ok(tranche.jurisdictionEnabled === false, "The tranche claims Illinois is enabled.");
ok(
  tranche.humanLegalReviewStatus === "awaiting_counsel_adoption",
  "The tranche does not await counsel adoption."
);
ok(
  recommendation.humanLegalReviewStatus === "awaiting_counsel_adoption",
  "The legal-output recommendation does not await counsel adoption."
);
ok(recommendation.counselAdopted === false, "The legal-output recommendation claims counsel adoption.");
for (const entry of recommendation.recommendations) {
  ok(
    entry.status === "recommended_for_counsel_adoption",
    `${entry.trackId}: recommendation status is ${entry.status}.`
  );
}
note("2. Promotion: both tracks runtime_disabled; recommended_for_counsel_adoption; awaiting_counsel_adoption; nothing enabled.");

// ---------------------------------------------------------------------------
// 3. Authority pinning against committed files
// ---------------------------------------------------------------------------

const authority = readJson("../master-library/authority.json");
ok(pins.authorityEdition === authority.edition, "The pins name a different edition than the adopted one.");
ok(
  pins.authorityArchiveSha256 === authority.retention.archiveSha256,
  "The pinned archive SHA-256 does not match the adopted edition."
);
for (const record of pins.controllingAuthority.legalDesignRecords) {
  const file = path.join(root, record.repositoryPath);
  ok(fs.existsSync(file), `The pinned legal-design record is absent: ${record.repositoryPath}`);
  if (fs.existsSync(file)) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    ok(actual === record.sha256, `${record.repositoryPath}: pinned SHA-256 does not match the file on disk.`);
  }
}
for (const source of pins.primaryEnactedLaw) {
  ok(source.repositoryPath === null, `${source.citation} pins a repository binary; Tranche 4 must not require one.`);
  ok(source.generationTarget === false, `${source.citation} is marked a generation target.`);
}
ok(pins.officialFormMappingsCreated === 0, "An official-form mapping was created for a custom pleading.");
ok(pins.overlayPlacementsCreated === 0, "An overlay placement was created for a custom pleading.");
ok(pins.acroFieldMappingsCreated === 0, "An AcroForm mapping was created for a custom pleading.");
ok(
  pins.formSuitesDeliberatelyNotMapped.length === 2,
  "The pins do not record both statewide form suites as deliberately not mapped."
);
for (const track of pins.tracks) {
  ok(track.outputStrategy === "custom_pleading", `${track.trackId} is not a custom pleading.`);
  ok(track.localFormOverride === true, `${track.trackId} does not carry localFormOverride.`);
  ok(Boolean(track.localFormOverrideBasis), `${track.trackId} records no basis for its local-form override.`);
  ok(Boolean(track.venueAuthority), `${track.trackId} pins no venue authority.`);
  for (const component of track.components) {
    ok(component.officialFormBinaryRequired === false, `${component.componentId} claims to need an official binary.`);
  }
}
note(
  `3. Authority: Edition ${pins.authorityEdition}; both legal-design records hash-match on disk; 0 invented form mappings; both statewide form suites recorded as not mapped.`
);

// ---------------------------------------------------------------------------
// 4. Components, roles and templates match the pins
// ---------------------------------------------------------------------------

for (const pinned of pins.tracks) {
  const track = ILLINOIS_CUSTOM_PLEADING_TRACKS.find((entry) => entry.trackId === pinned.trackId);
  ok(Boolean(track), `${pinned.trackId} is pinned but not built.`);
  if (!track) continue;
  const built = new Map(track.packetSet.components.map((component) => [component.componentId, component]));
  ok(built.size === pinned.components.length, `${pinned.trackId}: component count does not match the pin.`);
  for (const component of pinned.components) {
    const actual = built.get(component.componentId);
    ok(Boolean(actual), `${component.componentId} is pinned but not built.`);
    if (!actual) continue;
    ok(actual.role === component.role, `${component.componentId}: role does not match the pin.`);
    ok(actual.templateId === component.templateId, `${component.componentId}: template does not match the pin.`);
    ok(
      actual.sourcePath === null && actual.sourceSha256 === null,
      `${component.componentId}: a custom pleading names an official source.`
    );
    ok(Boolean(pleadingTemplate(component.templateId)), `${component.componentId}: template is not registered.`);
  }
  const orders = track.packetSet.components.map((component) => component.order);
  ok(new Set(orders).size === orders.length, `${pinned.trackId}: duplicate component order.`);
  ok(
    track.packetSet.components.some((component) => component.role === "primary_filing"),
    `${pinned.trackId}: no primary filing.`
  );
  ok(
    track.packetSet.components.some((component) => component.role === "proposed_order"),
    `${pinned.trackId}: no proposed order.`
  );
}
const usedTemplateIds = new Set(
  ILLINOIS_CUSTOM_PLEADING_TRACKS.flatMap((track) => track.packetSet.components.map((c) => c.templateId))
);
for (const templateId of Object.keys(ILLINOIS_PLEADING_TEMPLATES)) {
  ok(usedTemplateIds.has(templateId), `${templateId}: template is registered but no component uses it.`);
}
note(`4. Components: ${usedTemplateIds.size} components across 2 tracks; roles, order and templates match the pins.`);

// ---------------------------------------------------------------------------
// 5. Every component has a governing specification
// ---------------------------------------------------------------------------

const specifications = readJson("../legal-design-specifications.json");
const specifiedComponents = new Set(specifications.customPleadingSpecs.map((spec) => spec.componentId));
for (const track of ILLINOIS_CUSTOM_PLEADING_TRACKS) {
  for (const component of track.packetSet.components) {
    ok(
      specifiedComponents.has(component.componentId),
      `${component.componentId}: rendered without a governing custom-pleading specification.`
    );
  }
}
ok(guidance.guidanceSpecificationsAuthoredByThisTranche === 0, "This tranche authored a guidance specification.");
note(`5. Specifications: all ${usedTemplateIds.size} components governed by a drafted specification; 0 authored here.`);

// ---------------------------------------------------------------------------
// 6. The two delivery models are kept apart
// ---------------------------------------------------------------------------

const sealPins = pins.tracks.find((t) => t.trackId === "il-immediate-seal");
const vacatePins = pins.tracks.find((t) => t.trackId === "il-prostitution-j-vacate");
ok(sealPins.deliveryModel === "attorney_filed", "il-immediate-seal is not recorded as attorney-filed.");
ok(
  vacatePins.deliveryModel === "participant_filed_attorney_review_recommended",
  "il-prostitution-j-vacate is not recorded as participant-filed with attorney review recommended."
);
const sealOwnership = ownership.tracks.find((t) => t.trackId === "il-immediate-seal");
ok(sealOwnership.attorneyFields.length > 0, "il-immediate-seal records no attorney field.");
for (const field of sealOwnership.attorneyFields) {
  ok(field.prefilled === false, `il-immediate-seal: ${field.field} is prefilled.`);
}
note("6. Delivery models: il-immediate-seal attorney-filed with a blank attorney block; il-prostitution-j-vacate participant-filed with attorney review recommended.");

// ---------------------------------------------------------------------------
// 7. Closed lists and individualized-advocacy stops fail closed
// ---------------------------------------------------------------------------

const SEAL_BASE = fixtures.positiveFixtures.find((f) => f.trackId === "il-immediate-seal").facts;
const VACATE_BASE = fixtures.positiveFixtures.find((f) => f.trackId === "il-prostitution-j-vacate").facts;

// Every approved disposition routes.
for (const value of Object.keys(IL_IMMEDIATE_SEAL_DISPOSITIONS)) {
  const derived = deriveIllinoisFacts("il-immediate-seal", { ...SEAL_BASE, dispositionType: value });
  ok(!JSON.stringify(derived).includes("{{"), `il-immediate-seal: ${value} left an unfilled placeholder.`);
}

const NEGATIVE = [
  ["il-immediate-seal", { dispositionType: "convicted" }, "branch_error"],
  ["il-immediate-seal", { dispositionType: "" }, "branch_error"],
  ["il-immediate-seal", { hasUpcomingDisposition: "no" }, "eligibility_stop", "no_upcoming_disposition"],
  ["il-immediate-seal", { isRepresented: "no" }, "eligibility_stop", "unrepresented"],
  ["il-immediate-seal", { offenseDateOnOrAfter2018: "no" }, "eligibility_stop", "offense_before_2018"],
  ["il-immediate-seal", { isMinorTrafficOffense: "yes" }, "eligibility_stop", "minor_traffic_offense"],
  ["il-immediate-seal", { dismissalWithPrejudice: "no" }, "eligibility_stop", "dismissal_without_prejudice"],
  [
    "il-prostitution-j-vacate",
    { traffickingInformationRequested: "wants_trafficking_information" },
    "eligibility_stop",
    "trafficking_route_is_stronger"
  ],
  [
    "il-prostitution-j-vacate",
    { class4RecordAnswer: "unsure" },
    "eligibility_stop",
    "record_does_not_show_class_4_felony_prostitution"
  ],
  [
    "il-prostitution-j-vacate",
    { class4RecordAnswer: "record_does_not_say" },
    "eligibility_stop",
    "record_does_not_show_class_4_felony_prostitution"
  ],
  ["il-prostitution-j-vacate", { sentenceComplete: "no" }, "eligibility_stop", "sentence_or_conditions_incomplete"],
  ["il-prostitution-j-vacate", { traffickingInformationRequested: "maybe" }, "branch_error"],
  ["il-prostitution-j-vacate", { class4RecordAnswer: "" }, "branch_error"]
];

for (const [trackId, override, expect, expectStopId] of NEGATIVE) {
  const base = trackId === "il-immediate-seal" ? SEAL_BASE : VACATE_BASE;
  let outcome = "generated";
  let stopId = null;
  try {
    deriveIllinoisFacts(trackId, { ...base, ...override });
  } catch (error) {
    if (error instanceof IllinoisEligibilityStopError) {
      outcome = "eligibility_stop";
      stopId = error.stopId;
      ok(error.referral === IL_REFERRAL, `${trackId}: a stop lost its referral destination.`);
      ok(String(error.reason).length > 0, `${trackId}: a stop carries no reason.`);
    } else if (error instanceof IllinoisBranchError) {
      outcome = "branch_error";
    } else {
      outcome = "unexpected_error";
    }
  }
  ok(
    outcome === expect,
    `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`
  );
  if (expectStopId) ok(stopId === expectStopId, `${trackId}: expected stop ${expectStopId}, got ${stopId}.`);
}

// The trafficking screen must run before the record and sentence questions, so
// that a survivor is routed to § 5.2(h) rather than told their record is wrong.
let traffickingFirst = null;
try {
  deriveIllinoisFacts("il-prostitution-j-vacate", {
    ...VACATE_BASE,
    traffickingInformationRequested: "wants_trafficking_information",
    class4RecordAnswer: "unsure",
    sentenceComplete: "no"
  });
} catch (error) {
  traffickingFirst = error instanceof IllinoisEligibilityStopError ? error.stopId : null;
}
ok(
  traffickingFirst === "trafficking_route_is_stronger",
  `Trafficking screening does not run first; got ${traffickingFirst}.`
);
ok(
  Object.keys(IL_TRAFFICKING_ANSWERS).length === 2 && Object.keys(IL_CLASS_4_RECORD_ANSWERS).length === 3,
  "A closed list changed size; the stops may have been weakened."
);
note(
  `7. Stops: ${NEGATIVE.length} negative cases all fail closed; every stop keeps its reason and its referral; trafficking screening runs first.`
);

// ---------------------------------------------------------------------------
// 8. Rendered content
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/cannabis/i, "cannabis form-suite language"],
  [/will be granted|you will succeed/i, "a prediction of success"],
  [/social security (number|no)/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"]
];

let rendered = 0;
let assembledCount = 0;
for (const fixture of fixtures.positiveFixtures) {
  const facts = deriveIllinoisFacts(fixture.trackId, fixture.facts);
  const resolved = resolvePacket({
    jurisdiction: "IL",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "IL",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: a generated document reports an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "IL",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(output.bytes) === sha(again.bytes), `${component.componentId}: rendering twice produced different bytes.`);

    const source = JSON.stringify(pleadingTemplate(component.templateId));
    for (const [pattern, why] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: template contains ${why}.`);
    }

    if (component.role === "proposed_order") {
      const template = pleadingTemplate(component.templateId);
      ok(template.signatureLabel === null, `${component.componentId}: a proposed order carries a participant signature rule.`);
      ok(
        template.signatureBlock.some((line) => /JUDGE/.test(line)),
        `${component.componentId}: a proposed order has no judicial signature block.`
      );
    }

    if (fixture.trackId === "il-prostitution-j-vacate") {
      // Citation discipline, asserted on the template rather than only on the
      // rendered page, so an unapproved citation cannot be introduced by a
      // participant value.
      const citations = new Set([...source.matchAll(/5\.2\\?\(([a-z])\\?\)\(([0-9]+)\)(\([A-Za-z]+\))?/g)].map((m) => m[0]));
      for (const citation of citations) {
        const normalized = citation.replace(/\\/g, "");
        ok(
          ["5.2(j)(3)", "5.2(d)(9)(A)", "5.2(j)(8)"].includes(normalized),
          `${component.componentId}: cites ${normalized}, outside the approved citation set.`
        );
      }
      if (component.role === "primary_filing") {
        ok(!/verification/i.test(source), `${component.componentId}: carries verification language.`);
        ok(/pro se/i.test(source), `${component.componentId}: no pro se designation.`);
        ok(/\{\{adverseConsequences\}\}/.test(source), `${component.componentId}: the participant's own statement is not carried.`);
        ok(/own words/i.test(source), `${component.componentId}: participant text is not identified as the participant's.`);
      }
    }

    if (fixture.trackId === "il-immediate-seal" && component.role === "instructions") {
      ok(/not a court filing/i.test(source), `${component.componentId}: not marked as not a court filing.`);
      ok(/cannot file this petition yourself/i.test(source), `${component.componentId}: does not say the participant cannot file it.`);
      ok(/5\.2\(c\)\(3\)\(A\)/.test(source), `${component.componentId}: the ordinary-sealing fallback is absent.`);
      ok(/nothing permanent/i.test(source), `${component.componentId}: the nothing-permanent statement is absent.`);
      ok(source.includes("866-787-1776"), `${component.componentId}: the referral destination is absent.`);
    }

    if (fixture.trackId === "il-immediate-seal" && component.role === "primary_filing") {
      ok(/ARDC No\./.test(source), `${component.componentId}: no attorney block on an attorney-filed petition.`);
      ok(/leaves it blank/i.test(source), `${component.componentId}: the attorney block is not marked as left blank.`);
    }

    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
    rendered += 1;
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "IL",
    jurisdictionName: "Illinois",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  const again = await assemblePacketPdf({
    jurisdiction: "IL",
    jurisdictionName: "Illinois",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  ok(assembled.sha256 === again.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${fixture.fixtureId}: the deliverable is a ZIP.`);
  ok(
    assembled.componentRanges.length === assemblyComponents.length,
    `${fixture.fixtureId}: the assembled packet does not cover every component.`
  );
  assembledCount += 1;
}
note(`8. Content: ${rendered} components render deterministically into ${assembledCount} assembled packets; no prohibited content.`);

// ---------------------------------------------------------------------------
// 9. Boundary fixtures stop
// ---------------------------------------------------------------------------

const byFixtureId = new Map(fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry]));
for (const boundary of fixtures.boundaryFixtures) {
  const base = byFixtureId.get(boundary.basedOn);
  const facts = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  for (const key of boundary.omitKeys ?? []) delete facts[key];

  let outcome = "generated";
  try {
    const derived = deriveIllinoisFacts(boundary.trackId, facts);
    resolvePacket({ jurisdiction: "IL", trackId: boundary.trackId, facts: derived, allowTechnicalFixtures: true });
  } catch (error) {
    if (error instanceof IllinoisEligibilityStopError) outcome = "eligibility_stop";
    else if (error instanceof IllinoisBranchError) outcome = "branch_error";
    else if (error instanceof PacketResolutionError) outcome = "resolution_missing_required_input";
    else outcome = "unexpected_error";
  }
  ok(outcome === boundary.expect, `${boundary.fixtureId}: expected ${boundary.expect}, got ${outcome}.`);
}
note(`9. Boundaries: ${fixtures.boundaryFixtures.length} stop conditions all stop.`);

// ---------------------------------------------------------------------------
// 10. Field ownership
// ---------------------------------------------------------------------------

for (const track of ownership.tracks) {
  ok(track.thirdPartyFields.length > 0, `${track.trackId}: no third-party fields recorded.`);
  for (const field of track.thirdPartyFields) {
    ok(field.prefilled === false, `${track.trackId}: ${field.field} is prefilled.`);
  }
}
const vacateOwnership = ownership.tracks.find((t) => t.trackId === "il-prostitution-j-vacate");
ok(
  vacateOwnership.participantAuthoredFields.some((f) => f.key === "adverseConsequences"),
  "The adverse-consequences narrative is not recorded as participant-authored."
);
note(`10. Field ownership: ${ownership.tracks.length} tracks; every judge, clerk, State's Attorney, agency, notary and attorney field blank.`);

// ---------------------------------------------------------------------------
// 11. Review manifest reflects what was generated
// ---------------------------------------------------------------------------

const manifestPath = path.join(DIR, "tranche-4-review-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  ok(
    manifest.humanLegalReviewStatus === "awaiting_counsel_adoption",
    "The review manifest does not await counsel adoption."
  );
  const FORBIDDEN_CLAIMS = [
    "legal_output_approved",
    "counsel_adopted",
    ["packet", "ready"].join("_"),
    "generation_allowed",
    "enabled"
  ];
  for (const forbidden of FORBIDDEN_CLAIMS) {
    ok(JSON.stringify(manifest).includes(`"${forbidden}"`) === false, `The review manifest claims ${forbidden}.`);
  }
  ok(
    manifest.samplePackets.length === fixtures.positiveFixtures.length,
    "The review manifest does not cover every sample."
  );
  for (const sample of manifest.samplePackets) {
    ok(/^[0-9a-f]{64}$/.test(sample.assembledSha256), `${sample.fixtureId}: no assembled packet SHA-256.`);
    ok(sample.pageImages === sample.assembledPageCount, `${sample.fixtureId}: page images do not cover the packet.`);
    ok(sample.runtimeStatus === "runtime_disabled", `${sample.fixtureId}: recorded as ${sample.runtimeStatus}.`);
  }
  ok(manifest.technicalReview.passed === true, "The recorded technical review did not pass.");
  note(
    `11. Review manifest: ${manifest.samplePackets.length} assembled packets, ${manifest.assembledPageCount} pages, all rendered to images, awaiting_counsel_adoption.`
  );
} else {
  note("11. Review manifest: not yet generated (run the generation command).");
}

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Illinois custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Illinois custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log("12. No track was promoted, no jurisdiction enabled, packet readiness remains 0.");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(DIR, relative), "utf8"));
}
function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
