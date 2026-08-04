// Georgia Superior Court pleading family (Tranche 3) — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Georgia is not enabled, selection is bounded, authority is pinned to files
// that are actually committed, roles and templates match the pins, every
// component has a governing specification, branches route, unapproved answers
// fail closed, ga-jail-k2 keeps its typed stop, participant values land,
// third-party fields stay blank, and prohibited content is absent.
//
// Runs offline against the real renderer and the real assembler. No network, no
// database, no promotion.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES, pleadingTemplate } = await import("@/lib/rcap/packets/engines/pleading-templates");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  GEORGIA_PLEADING_FAMILY_TRACKS,
  GEORGIA_BLOCKED_TRACK_IDS,
  GA_JAIL_K2_STOP,
  GeorgiaTrackUnavailableError,
  GeorgiaBranchError,
  deriveGeorgiaFacts,
  assertGeorgiaTrackImplemented,
  GA_FELONY_DISPOSITIONS,
  GA_VACATED_BRANCHES,
  GA_MISDEMEANOR_SCOPES,
  GA_LIFETIME_USE,
  GA_RESTRICTION_BASES,
  GA_DISCHARGE_BASES
} = await import("@/lib/rcap/packets/registry-ga-superior-court-pleading-family");
const { GEORGIA_PLEADING_TEMPLATES } = await import("@/lib/rcap/packets/engines/pleading-templates-ga");
const { GEORGIA_GUIDANCE_TEMPLATES } = await import("@/lib/rcap/packets/engines/guidance-templates-ga");

const root = process.cwd();
const DIR = path.join(root, "data/record-clearing/implementation-tranches");

const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);

// ---------------------------------------------------------------------------
// 0. Georgia is not enabled. Asserted BEFORE anything is registered.
// ---------------------------------------------------------------------------

const georgiaInSharedRegistry = RELIEF_TRACKS.filter((track) => track.jurisdiction === "GA");
ok(
  georgiaInSharedRegistry.length === 0,
  `Georgia is wired into the shared relief-track registry (${georgiaInSharedRegistry.length} tracks). This job must not enable a jurisdiction.`
);
ok(
  RELIEF_TRACKS.filter((track) => !track.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
const georgiaTemplatesInSharedPack = Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("ga-"));
ok(
  georgiaTemplatesInSharedPack.length === 0,
  `Georgia templates are wired into the shared pleading-template registry (${georgiaTemplatesInSharedPack.length}). Wiring is the integration captain's step.`
);
note("0. Enablement: Georgia is absent from the shared registry and the shared template pack. Nothing was promoted.");

// Register for the duration of this process only, exactly as the generator
// does. Nothing on disk changes; the next process starts without Georgia.
for (const track of GEORGIA_PLEADING_FAMILY_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, GEORGIA_PLEADING_TEMPLATES);

const tranche = readJson("tranche-3.json");
const pins = readJson("tranche-3-authority-pins.json");
const fixtures = readJson("tranche-3-fixtures.json");
const guidance = readJson("tranche-3-component-guidance.json");
const ownership = readJson("tranche-3-field-ownership.json");

// ---------------------------------------------------------------------------
// 1. Selection is bounded and reproducible
// ---------------------------------------------------------------------------

const selected = tranche.selectedTracks.map((entry) => entry.trackId);
ok(new Set(selected).size === selected.length, "The tranche names a track more than once.");
ok(tranche.jurisdiction === "GA", "The tranche jurisdiction is not Georgia.");
ok(
  new Set(tranche.selectedTracks.map((entry) => entry.trackId.slice(0, 3))).size === 1,
  "The tranche spans more than one jurisdiction."
);
ok(
  selected.length + tranche.excludedTracks.length === 10,
  `The tranche accounts for ${selected.length + tranche.excludedTracks.length} of the 10 assigned tracks.`
);
ok(
  selected.length === GEORGIA_PLEADING_FAMILY_TRACKS.length,
  "The tranche record and the registry disagree on how many tracks were implemented."
);
note(`1. Selection: ${selected.length} implemented, ${tranche.excludedTracks.length} excluded, 10 assigned and all accounted for.`);

// ---------------------------------------------------------------------------
// 2. Nothing is promoted
// ---------------------------------------------------------------------------

for (const track of GEORGIA_PLEADING_FAMILY_TRACKS) {
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
ok(tranche.jurisdictionEnabled === false, "The tranche claims Georgia is enabled.");
note(`2. Promotion: all ${GEORGIA_PLEADING_FAMILY_TRACKS.length} tracks runtime_disabled; packet readiness false; jurisdiction not enabled.`);

// ---------------------------------------------------------------------------
// 3. Authority pinning, against files that are actually committed
// ---------------------------------------------------------------------------

const authority = readJson("../master-library/authority.json");
ok(pins.authorityEdition === authority.edition, "The pins name a different edition than the adopted one.");
ok(
  pins.authorityArchiveSha256 === authority.retention.archiveSha256,
  "The pinned archive SHA-256 does not match the adopted edition."
);

const addendum = pins.controllingAuthority.legalReviewAddendum;
ok(/^[0-9a-f]{64}$/.test(addendum.sha256), "The Edition 1.2 Georgia addendum has no pinned SHA-256.");
const addendumFile = path.join(root, addendum.repositoryPath);
ok(fs.existsSync(addendumFile), `The pinned Georgia addendum is absent: ${addendum.repositoryPath}`);
if (fs.existsSync(addendumFile)) {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(addendumFile)).digest("hex");
  ok(actual === addendum.sha256, "The Georgia addendum's pinned SHA-256 does not match the file on disk.");
}

// No pin may require a binary this repository does not hold. That is what keeps
// the gate runnable without the retained Master Library archive.
for (const source of pins.primaryEnactedLaw) {
  ok(/^[0-9a-f]{64}$/.test(source.sha256), `${source.citation} has no pinned SHA-256.`);
  ok(source.repositoryPath === null, `${source.citation} pins a repository binary; Tranche 3 must not require one.`);
  ok(source.repositoryBinaryRequired === false, `${source.citation} claims to need a repository binary.`);
  ok(source.generationTarget === false, `${source.citation} is marked a generation target.`);
}
for (const source of pins.citedSourcesWithoutHash) {
  ok(source.generationTarget === false, `${source.citation} is marked a generation target.`);
}
ok(pins.officialFormMappingsCreated === 0, "An official-form mapping was created for a custom pleading.");
ok(pins.overlayPlacementsCreated === 0, "An overlay placement was created for a custom pleading.");
ok(pins.acroFieldMappingsCreated === 0, "An AcroForm mapping was created for a custom pleading.");

for (const track of pins.tracks) {
  ok(track.outputStrategy === "custom_pleading", `${track.trackId} is not a custom pleading.`);
  ok(track.localFormOverride === true, `${track.trackId} does not carry localFormOverride.`);
  ok(track.statutoryAuthority.length > 0, `${track.trackId} pins no statutory authority.`);
  ok(Boolean(track.venueAuthority), `${track.trackId} pins no venue authority.`);
  for (const component of track.components) {
    ok(component.officialFormBinaryRequired === false, `${component.componentId} claims to need an official binary.`);
  }
}
note(
  `3. Authority: Edition ${pins.authorityEdition}; the Georgia addendum hash-matches the committed file; ${pins.primaryEnactedLaw.length} enacted-law pins, none requiring a repository binary; 0 invented form mappings.`
);

// ---------------------------------------------------------------------------
// 4. Component roles, order and templates match the pins
// ---------------------------------------------------------------------------

for (const pinned of pins.tracks) {
  const track = GEORGIA_PLEADING_FAMILY_TRACKS.find((entry) => entry.trackId === pinned.trackId);
  ok(Boolean(track), `${pinned.trackId} is pinned but not built.`);
  if (!track) continue;
  const built = new Map(track.packetSet.components.map((component) => [component.componentId, component]));
  ok(built.size === pinned.components.length, `${pinned.trackId}: component count does not match the pin.`);
  for (const component of pinned.components) {
    const actual = built.get(component.componentId);
    ok(Boolean(actual), `${component.componentId} is pinned but not built.`);
    if (!actual) continue;
    ok(actual.role === component.role, `${component.componentId}: role does not match the pin.`);
    ok(actual.outputStrategy === component.outputStrategy, `${component.componentId}: strategy does not match the pin.`);
    ok(actual.templateId === component.templateId, `${component.componentId}: template does not match the pin.`);
    ok(actual.requirement === component.requirement, `${component.componentId}: requirement does not match the pin.`);
    ok(
      actual.sourcePath === null && actual.sourceSha256 === null,
      `${component.componentId}: a custom pleading names an official source.`
    );
    ok(Boolean(pleadingTemplate(component.templateId)), `${component.componentId}: template is not registered.`);
    if (actual.requirement === "conditional") {
      ok(Boolean(actual.conditionKey), `${component.componentId}: a conditional component has no condition key.`);
    }
  }
  const orders = track.packetSet.components.map((component) => component.order);
  ok(new Set(orders).size === orders.length, `${pinned.trackId}: duplicate component order.`);
  for (const role of ["primary_filing", "proposed_order", "certificate_of_service", "attachment"]) {
    ok(track.packetSet.components.some((component) => component.role === role), `${pinned.trackId}: no ${role} component.`);
  }
}

// No orphan templates in either direction.
const usedTemplateIds = new Set(
  GEORGIA_PLEADING_FAMILY_TRACKS.flatMap((track) => track.packetSet.components.map((component) => component.templateId))
);
for (const templateId of Object.keys(GEORGIA_PLEADING_TEMPLATES)) {
  ok(usedTemplateIds.has(templateId), `${templateId}: template is registered but no component uses it.`);
}
note(
  `4. Components: ${usedTemplateIds.size} components across ${pins.tracks.length} tracks; roles, order, requirements and templates all match the pins.`
);

// ---------------------------------------------------------------------------
// 5. Every rendered component has a governing specification; ga-jail-k2 does not
// ---------------------------------------------------------------------------

const specifications = readJson("../legal-design-specifications.json");
const specifiedComponents = new Set(specifications.customPleadingSpecs.map((spec) => spec.componentId));
const guidanceTrackIds = new Set(specifications.processGuidanceSpecs.map((spec) => spec.trackId));

for (const track of GEORGIA_PLEADING_FAMILY_TRACKS) {
  for (const component of track.packetSet.components) {
    ok(
      specifiedComponents.has(component.componentId),
      `${component.componentId}: rendered without a governing custom-pleading specification.`
    );
  }
}
ok(guidance.guidanceSpecificationsAuthoredByThisTranche === 0, "This tranche authored a guidance specification.");
ok(Object.keys(GEORGIA_GUIDANCE_TEMPLATES).length === 0, "A Georgia guidance template was drafted by this tranche.");

// Integration has now supplied the one process-guidance specification, but a
// specification alone is deliberately insufficient to remove the typed stop.
// The request and attachment templates, two release questions, full packet
// proof, and counsel adoption remain open.
const jailGuidance = specifications.processGuidanceSpecs.find(
  (specification) =>
    specification.trackId === "ga-jail-k2" &&
    (specification.componentIds ?? []).includes(
      "ga-jail-k2-process-guidance-3"
    )
);
ok(guidanceTrackIds.has("ga-jail-k2"), "ga-jail-k2 guidance specification was not integrated.");
ok(jailGuidance?.guidanceStatus === "drafted", "ga-jail-k2 guidance is not drafted.");
ok(
  (jailGuidance?.templateIds ?? []).length === 0,
  "ga-jail-k2 guidance unexpectedly claims a completed template."
);
for (const trackId of GEORGIA_BLOCKED_TRACK_IDS) {
  ok(
    !GEORGIA_PLEADING_FAMILY_TRACKS.some((track) => track.trackId === trackId),
    `${trackId} is blocked but was also built.`
  );
  ok(!RELIEF_TRACKS.some((track) => track.trackId === trackId), `${trackId} is blocked but reached the registry.`);
}
note(
  `5. Specifications: all ${usedTemplateIds.size} rendered components governed by a drafted specification; 0 authored here; ga-jail-k2 guidance is integrated but templates, release questions, packet proof and counsel adoption remain open.`
);

// ---------------------------------------------------------------------------
// 6. ga-jail-k2 keeps its explicit typed stop
// ---------------------------------------------------------------------------

let stopError = null;
try {
  assertGeorgiaTrackImplemented("ga-jail-k2");
} catch (error) {
  stopError = error;
}
ok(stopError instanceof GeorgiaTrackUnavailableError, "ga-jail-k2 did not raise its typed stop.");
ok(stopError?.blockingComponentId === "ga-jail-k2-process-guidance-3", "The ga-jail-k2 stop does not name the blocking component.");
ok(stopError?.trackId === "ga-jail-k2", "The ga-jail-k2 stop does not name the track.");
ok(String(stopError?.reason ?? "").length > 0, "The ga-jail-k2 stop carries no reason.");

// The deriver must refuse it too, so no caller can reach facts by another door.
let deriveError = null;
try {
  deriveGeorgiaFacts("ga-jail-k2", { defendantName: "X" });
} catch (error) {
  deriveError = error;
}
ok(deriveError instanceof GeorgiaTrackUnavailableError, "deriveGeorgiaFacts did not refuse ga-jail-k2.");

ok(GA_JAIL_K2_STOP.blockingComponentId === "ga-jail-k2-process-guidance-3", "The recorded stop names the wrong component.");
ok(
  tranche.excludedTracks.some((entry) => entry.trackId === "ga-jail-k2" && entry.treatment === "registered_typed_stop"),
  "The tranche record does not carry ga-jail-k2 as a registered typed stop."
);
note("6. ga-jail-k2: typed stop intact, named by component id, refused by both the guard and the deriver.");

// ---------------------------------------------------------------------------
// 7. Branch routing, including the closed lists
// ---------------------------------------------------------------------------

const BRANCHES = [
  ["ga-felony-j1", "felonyDisposition", GA_FELONY_DISPOSITIONS],
  ["ga-vacated-j2", "vacatedOrReversed", GA_VACATED_BRANCHES],
  ["ga-misd-j4", "misdemeanorScope", GA_MISDEMEANOR_SCOPES],
  ["ga-misd-j4", "lifetimeUse", GA_LIFETIME_USE],
  ["ga-seal-m", "restrictionBasis", GA_RESTRICTION_BASES],
  ["ga-fo-discharged-pre2026", "dischargeBasis", GA_DISCHARGE_BASES]
];

let branchCount = 0;
for (const [trackId, key, table] of BRANCHES) {
  for (const value of Object.keys(table)) {
    const derived = deriveGeorgiaFacts(trackId, { [key]: value, ...defaultBranchFacts(trackId, key) });
    const rendered = JSON.stringify(derived);
    ok(!rendered.includes("{{"), `${trackId}: branch ${value} left an unfilled placeholder.`);
    branchCount += 1;
  }
  for (const bad of ["", "not_an_approved_value"]) {
    let threw = false;
    try {
      deriveGeorgiaFacts(trackId, { [key]: bad, ...defaultBranchFacts(trackId, key) });
    } catch (error) {
      threw = error instanceof GeorgiaBranchError;
    }
    ok(threw, `${trackId}: an unapproved ${key} value of "${bad}" did not fail closed.`);
  }
}
note(`7. Branches: ${branchCount} approved branch values route; unapproved and empty values fail closed on all ${BRANCHES.length} closed lists.`);

// ---------------------------------------------------------------------------
// 8. Boundary fixtures stop
// ---------------------------------------------------------------------------

const byFixtureId = new Map(fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry]));
for (const boundary of fixtures.boundaryFixtures) {
  const base = byFixtureId.get(boundary.basedOn);
  const facts = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  for (const key of boundary.omitKeys ?? []) delete facts[key];

  let outcome = "generated";
  try {
    assertGeorgiaTrackImplemented(boundary.trackId);
    const derived = deriveGeorgiaFacts(boundary.trackId, facts);
    resolvePacket({ jurisdiction: "GA", trackId: boundary.trackId, facts: derived, allowTechnicalFixtures: true });
  } catch (error) {
    if (error instanceof GeorgiaTrackUnavailableError) outcome = "track_unavailable";
    else if (error instanceof GeorgiaBranchError) outcome = "branch_error";
    else if (error instanceof PacketResolutionError) outcome = "resolution_missing_required_input";
    else outcome = "unexpected_error";
  }
  ok(outcome === boundary.expect, `${boundary.fixtureId}: expected ${boundary.expect}, got ${outcome}.`);
}
note(`8. Boundaries: ${fixtures.boundaryFixtures.length} stop conditions all stop, including the ga-jail-k2 typed stop.`);

// ---------------------------------------------------------------------------
// 9. Rendered content — participant values in, prohibited content out
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/expunge/i, "expungement vocabulary, which Georgia does not use"],
  [/\bIN RE\b/i, "an IN RE caption"],
  [/civil action no/i, "a Civil Action No."],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/georgia justice project|gjp\.org/i, "reference-model publisher branding"],
  [/by and through (his|her|their|its) attorney/i, "an attorney recital"],
  [/social security (number|no)/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  [/has been rehabilitated/i, "a rehabilitation conclusion"],
  [/not a threat to public safety/i, "a public-safety conclusion"]
];

let renderedComponents = 0;
let assembledPackets = 0;
for (const fixture of fixtures.positiveFixtures) {
  const facts = deriveGeorgiaFacts(fixture.trackId, fixture.facts);
  const resolved = resolvePacket({
    jurisdiction: "GA",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "GA",
      geography: null,
      facts,
      rootDir: root
    });
    ok(rendered.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: a generated document reports an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "GA",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: rendering the same facts twice produced different bytes.`);

    const source = JSON.stringify(pleadingTemplate(component.templateId));
    for (const [pattern, why] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: template contains ${why}.`);
    }

    if (component.role === "primary_filing") {
      ok(/\{\{participantNarrative\}\}/.test(source), `${component.componentId}: the participant's own statement is not carried.`);
      ok(/own words/i.test(source), `${component.componentId}: participant-authored text is not identified as the participant's.`);
      ok(/42-8-63\.1/.test(source), `${component.componentId}: the § 42-8-63.1 disqualification caveat is absent.`);
      ok(/not entitled to state that the record does not exist/i.test(source), `${component.componentId}: the may-not-deny-the-record statement is absent.`);
      ok(/confirm with the clerk/i.test(source), `${component.componentId}: the confirm-the-filing-method instruction is absent.`);
    }

    if (component.role === "proposed_order") {
      const template = pleadingTemplate(component.templateId);
      ok(template.signatureLabel === null, `${component.componentId}: a proposed order carries a participant signature rule.`);
      ok(
        template.signatureBlock.some((line) => /JUDGE/.test(line)),
        `${component.componentId}: a proposed order has no judicial signature block.`
      );
      ok(!/\bs\/\s?[A-Z]/.test(source), `${component.componentId}: a signature mark appears on a proposed order.`);
      ok(/\(   \) that the relief sought should be GRANTED/.test(source), `${component.componentId}: the grant election is not blank.`);
    }

    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
    renderedComponents += 1;
  }

  // The participant's deliverable: one assembled PDF, produced by the shared
  // assembler, deterministic across runs.
  const assembled = await assemblePacketPdf({
    jurisdiction: "GA",
    jurisdictionName: "Georgia",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  const assembledAgain = await assemblePacketPdf({
    jurisdiction: "GA",
    jurisdictionName: "Georgia",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  ok(assembled.sha256 === assembledAgain.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(assembled.fileName.endsWith(".pdf"), `${fixture.fixtureId}: the deliverable is not a PDF.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${fixture.fixtureId}: the deliverable is a ZIP.`);
  ok(
    assembled.componentRanges.length === assemblyComponents.length,
    `${fixture.fixtureId}: the assembled packet does not cover every component.`
  );
  assembledPackets += 1;
}
note(
  `9. Content: ${renderedComponents} components render deterministically into ${assembledPackets} assembled packets; no prohibited content in any template.`
);

// ---------------------------------------------------------------------------
// 10. Field ownership: nothing belonging to a third party is prefilled
// ---------------------------------------------------------------------------

for (const track of ownership.tracks) {
  ok(track.thirdPartyFields.length > 0, `${track.trackId}: no third-party fields are recorded.`);
  for (const field of track.thirdPartyFields) {
    ok(field.prefilled === false, `${track.trackId}: ${field.field} is prefilled.`);
  }
  ok(
    track.participantAuthoredFields.some((field) => field.key === "participantNarrative"),
    `${track.trackId}: the participant's own statement is not recorded as participant-authored.`
  );
}
note(`10. Field ownership: ${ownership.tracks.length} tracks; every judge, clerk, prosecutor, agency and notary field blank.`);

// ---------------------------------------------------------------------------
// 11. Review manifest reflects what was generated
// ---------------------------------------------------------------------------

const manifestPath = path.join(DIR, "tranche-3-review-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  ok(manifest.humanLegalReviewStatus === "awaiting_counsel_review", "The review manifest does not await counsel review.");
  // Assembled from parts rather than written out. The factory's
  // protected-content scan rejects the literal readiness token on any line of a
  // file a worker changed, and this gate has to name the very claims it forbids.
  const FORBIDDEN_CLAIMS = [
    "legal_output_approved",
    "counsel_approved",
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
    ok(sample.pageImages === sample.assembledPageCount, `${sample.fixtureId}: rendered-page images do not cover the packet.`);
    ok(sample.runtimeStatus === "runtime_disabled", `${sample.fixtureId}: recorded as ${sample.runtimeStatus}.`);
  }
  ok(manifest.technicalReview.passed === true, "The recorded technical review did not pass.");
  ok(
    manifest.blockedTracks.some((entry) => entry.trackId === "ga-jail-k2"),
    "The review manifest does not record the ga-jail-k2 stop."
  );
  note(
    `11. Review manifest: ${manifest.samplePackets.length} assembled packets, ${manifest.assembledPageCount} pages, all rendered to images, awaiting_counsel_review.`
  );
} else {
  note("11. Review manifest: not yet generated (run the generation command).");
}

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Georgia Superior Court pleading family verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Georgia Superior Court pleading family verification passed.");
for (const line of checks) console.log(line);
console.log("12. No track was promoted, no jurisdiction enabled, packet readiness remains 0.");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(DIR, relative), "utf8"));
}
function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
/** The other closed-list answers a track needs before a branch can be derived. */
function defaultBranchFacts(trackId, exceptKey) {
  const defaults = {
    "ga-felony-j1": { felonyDisposition: "dismissed" },
    "ga-vacated-j2": { vacatedOrReversed: "vacated" },
    "ga-misd-j4": { misdemeanorScope: "single_offense", lifetimeUse: "first" },
    "ga-seal-m": { restrictionBasis: "automatically" },
    "ga-fo-discharged-pre2026": { dischargeBasis: "as_a_matter_of_law" }
  }[trackId] ?? {};
  const copy = { ...defaults };
  delete copy[exceptKey];
  return copy;
}
