#!/usr/bin/env node

// District of Columbia custom pleadings — Tranche 5 regression verifier.
//
// This verifier registers the D.C. pack only inside this process, renders the
// two implemented routes through the real resolver/renderer/assembler, and
// proves the four remaining assigned routes are explicit typed stops. It does
// not write packet artifacts, register a live route, infer source pinning, or
// change any promotion state.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const {
  PLEADING_TEMPLATES,
  pleadingTemplate
} = await import("@/lib/rcap/packets/engines/pleading-templates");
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  DC_BLOCKED_TRACK_IDS,
  DC_BLOCKED_TRACKS,
  DC_PLEADING_TEMPLATES,
  DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS,
  DistrictOfColumbiaBranchError,
  DistrictOfColumbiaTrackUnavailableError,
  assertDistrictOfColumbiaTrackImplemented,
  deriveDistrictOfColumbiaFacts
} = await import(
  "@/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading"
);

const root = process.cwd();
const trancheDirectory = path.join(
  root,
  "data/record-clearing/implementation-tranches"
);
const implementationPath =
  "src/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading.ts";
const implementationAbsolutePath = path.join(root, implementationPath);
const tranche = readJson("tranche-5.json");
const fixtures = readJson("tranche-5-fixtures.json");
const manifest = readJson("tranche-5-review-manifest.json");
const recommendation = readJson(
  "tranche-5-legal-output-recommendation.json"
);

const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (message) => checks.push(message);

// ---------------------------------------------------------------------------
// 1. The integration record is bound to the exact implementation.
// ---------------------------------------------------------------------------

ok(
  tranche.implementationCommit ===
    "a25306af0e095faac1ce4d36c60b0f04c9221b31",
  "The tranche does not name the accepted D.C. worker commit."
);
ok(
  tranche.implementationSource?.path === implementationPath,
  "The tranche does not name the D.C. implementation source."
);
const implementationSha256 = sha(fs.readFileSync(implementationAbsolutePath));
ok(
  tranche.implementationSource?.sha256 === implementationSha256,
  "The D.C. implementation source has drifted from the tranche hash."
);
ok(
  manifest.implementationSourceSha256 === implementationSha256,
  "The review manifest is not bound to the D.C. implementation source."
);
ok(
  tranche.sourceAuthorityStatus?.sourcePinned === false,
  "Implementation metadata incorrectly infers source pinning."
);
ok(
  manifest.sourcePinnedCount === 0,
  "The review manifest incorrectly records a pinned D.C. source."
);
ok(
  recommendation.sourcePinnedCount === 0,
  "The legal-output recommendation incorrectly records a pinned D.C. source."
);
ok(
  !fs.existsSync(path.join(trancheDirectory, "tranche-5-authority-pins.json")),
  "A D.C. authority-pin record exists even though no immutable source SHA-256 is available."
);
note(
  `1. Provenance: worker ${tranche.implementationCommit.slice(0, 7)}, implementation SHA-256 ${implementationSha256}; source pinning remains separate and false.`
);

// ---------------------------------------------------------------------------
// 2. Exactly two routes are implemented and four remain typed stops.
// ---------------------------------------------------------------------------

const expectedImplemented = [
  "dc_correct_misattributed_arrest",
  "dc_innocence_expungement"
];
const expectedBlocked = [
  "dc_seal_conviction",
  "dc_seal_fugitive",
  "dc_seal_nonconviction",
  "dc_yra_set_aside"
];
const trancheImplemented = tranche.selectedTracks
  .filter((entry) => entry.implemented === true)
  .map((entry) => entry.trackId)
  .sort();
const moduleImplemented = DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS.map(
  (entry) => entry.trackId
).sort();
const trancheBlocked = tranche.excludedTracks
  .filter((entry) => entry.implemented === false)
  .map((entry) => entry.trackId)
  .sort();
const moduleBlocked = [...DC_BLOCKED_TRACK_IDS].sort();

ok(
  sameArray(trancheImplemented, expectedImplemented),
  `Tranche implemented routes are ${trancheImplemented.join(", ")}.`
);
ok(
  sameArray(moduleImplemented, expectedImplemented),
  `D.C. module implemented routes are ${moduleImplemented.join(", ")}.`
);
ok(
  sameArray(trancheBlocked, expectedBlocked),
  `Tranche typed-stop routes are ${trancheBlocked.join(", ")}.`
);
ok(
  sameArray(moduleBlocked, expectedBlocked),
  `D.C. module typed-stop routes are ${moduleBlocked.join(", ")}.`
);
ok(
  manifest.implementedTrackCount === 2 &&
    manifest.blockedTrackCount === 4,
  "The review manifest does not preserve the 2 implemented / 4 typed-stop partition."
);
ok(
  sameArray(
    manifest.samplePackets.map((entry) => entry.trackId).sort(),
    expectedImplemented
  ),
  "The review manifest packet set is not the exact implemented subset."
);
ok(
  sameArray(
    manifest.blockedTracks.map((entry) => entry.trackId).sort(),
    expectedBlocked
  ),
  "The review manifest typed-stop set is not exact."
);
const recommendedTrackIds = recommendation.recommendations
  .filter((entry) => entry.status === "recommended_for_counsel_adoption")
  .map((entry) => entry.trackId)
  .sort();
const recommendationExcluded = recommendation.excludedRoutes
  .map((entry) => entry.trackId)
  .sort();
ok(
  sameArray(recommendedTrackIds, expectedImplemented),
  `The legal-output recommendation covers ${recommendedTrackIds.join(", ")}.`
);
ok(
  sameArray(recommendationExcluded, expectedBlocked),
  `The legal-output recommendation excludes ${recommendationExcluded.join(", ")}.`
);
note(
  "2. Partition: exactly two implemented/recommended routes and four explicit typed stops; no blocked route is counted as a packet or recommendation."
);

// ---------------------------------------------------------------------------
// 3. No D.C. route or template is live; registration is in-process only.
// ---------------------------------------------------------------------------

const sharedTrackIdsBeforeRegistration = new Set(
  RELIEF_TRACKS.map((entry) => entry.trackId)
);
for (const trackId of [...expectedImplemented, ...expectedBlocked]) {
  ok(
    !sharedTrackIdsBeforeRegistration.has(trackId),
    `${trackId} is present in the shared runtime registry.`
  );
}
for (const templateId of Object.keys(DC_PLEADING_TEMPLATES)) {
  ok(
    !Object.hasOwn(PLEADING_TEMPLATES, templateId),
    `${templateId} is present in the shared runtime template pack.`
  );
}
for (const track of DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS) {
  RELIEF_TRACKS.push(track);
}
Object.assign(PLEADING_TEMPLATES, DC_PLEADING_TEMPLATES);

for (const track of DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(
    track.technicalFixture === true,
    `${track.trackId} is not restricted to technical-fixture use.`
  );
  ok(
    track.statuses.legal !== "legal_approved",
    `${track.trackId} claims legal-output approval.`
  );
  ok(
    track.statuses.visual !== "visual_review_passed",
    `${track.trackId} claims visual approval.`
  );
  ok(
    computeRuntimeStatus({
      statuses: track.statuses,
      sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled,
      outputStrategy: track.outputStrategy
    }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`
  );
  for (const component of track.packetSet.components) {
    ok(
      component.approval.legal === "not_submitted",
      `${component.componentId} claims legal-output approval.`
    );
    ok(
      component.approval.visual === "not_reviewed",
      `${component.componentId} claims visual approval.`
    );
  }
}
ok(tranche.packetReady === false, "The tranche claims packet readiness.");
ok(
  tranche.generationAllowed === false,
  "The tranche claims participant generation is allowed."
);
ok(
  tranche.jurisdictionEnabled === false,
  "The tranche claims the District is enabled."
);
ok(
  tranche.productionEnabled === false,
  "The tranche claims production enablement."
);
ok(
  tranche.humanLegalReviewStatus === "awaiting_counsel_adoption" &&
    tranche.counselAdopted === false,
  "The tranche does not record the bounded awaiting-counsel state."
);
ok(
  tranche.visualProofStatus === "not_reviewed" &&
    tranche.implementationProof === false,
  "The tranche implies visual or readiness-level implementation proof."
);
note(
  "3. Runtime: D.C. is absent from the shared registry; both proof routes are fixture-only and runtime_disabled."
);

// ---------------------------------------------------------------------------
// 4. Each blocked route fails through the typed boundary.
// ---------------------------------------------------------------------------

for (const trackId of expectedBlocked) {
  const recorded = tranche.excludedTracks.find(
    (entry) => entry.trackId === trackId
  );
  const manifestStop = manifest.blockedTracks.find(
    (entry) => entry.trackId === trackId
  );
  const sourceStop = DC_BLOCKED_TRACKS[trackId];
  ok(Boolean(sourceStop), `${trackId} has no source typed-stop record.`);
  ok(
    recorded?.unblockedBy === sourceStop?.unblockedBy,
    `${trackId} tranche unblock condition has drifted.`
  );
  ok(
    manifestStop?.unblockedBy === sourceStop?.unblockedBy,
    `${trackId} review-manifest unblock condition has drifted.`
  );
  ok(
    sourceStop?.openQuestions.length > 0,
    `${trackId} records no open questions.`
  );

  for (const invoke of [
    () => assertDistrictOfColumbiaTrackImplemented(trackId),
    () =>
      deriveDistrictOfColumbiaFacts(trackId, {
        captionSovereign: "united_states"
      })
  ]) {
    let error = null;
    try {
      invoke();
    } catch (caught) {
      error = caught;
    }
    ok(
      error instanceof DistrictOfColumbiaTrackUnavailableError,
      `${trackId} did not raise DistrictOfColumbiaTrackUnavailableError.`
    );
    ok(error?.trackId === trackId, `${trackId} typed stop names another track.`);
    ok(
      error?.message === sourceStop?.reason,
      `${trackId} typed-stop reason has drifted.`
    );
    ok(
      sameArray(error?.openQuestions ?? [], sourceStop?.openQuestions ?? []),
      `${trackId} typed-stop questions have drifted.`
    );
  }
}
note(
  "4. Typed stops: conviction sealing, fugitive sealing, non-conviction sealing and YRA set-aside each fail closed with their exact open questions."
);

// ---------------------------------------------------------------------------
// 5. Every closed-list boundary fixture fails closed.
// ---------------------------------------------------------------------------

const positiveById = new Map(
  fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry])
);
for (const boundary of fixtures.boundaryFixtures.filter(
  (entry) => entry.expect === "branch_error"
)) {
  const base = positiveById.get(boundary.basedOn);
  ok(Boolean(base), `${boundary.fixtureId} names an unknown positive fixture.`);
  let error = null;
  try {
    deriveDistrictOfColumbiaFacts(boundary.trackId, {
      ...base?.facts,
      ...(boundary.overrideFacts ?? {})
    });
  } catch (caught) {
    error = caught;
  }
  ok(
    error instanceof DistrictOfColumbiaBranchError,
    `${boundary.fixtureId} did not fail with DistrictOfColumbiaBranchError.`
  );
  ok(
    error?.key === boundary.expectDetail,
    `${boundary.fixtureId} failed on ${error?.key ?? "no key"} rather than ${boundary.expectDetail}.`
  );
}
ok(
  fixtures.boundaryFixtures.filter(
    (entry) => entry.expect === "track_unavailable"
  ).length === 4,
  "The fixture record does not contain one typed-stop fixture per blocked route."
);
note(
  `5. Branches: ${fixtures.boundaryFixtures.length} boundary fixtures preserve closed-list and typed-stop behavior.`
);

// ---------------------------------------------------------------------------
// 6. Render and assemble the exact two packet fixtures.
// ---------------------------------------------------------------------------

const manifestSamples = new Map(
  manifest.samplePackets.map((entry) => [entry.fixtureId, entry])
);
let renderedComponentCount = 0;
let assembledPacketCount = 0;
let assembledPageCount = 0;

for (const fixture of fixtures.positiveFixtures) {
  const expected = manifestSamples.get(fixture.fixtureId);
  ok(Boolean(expected), `${fixture.fixtureId} is absent from the review manifest.`);

  const facts = deriveDistrictOfColumbiaFacts(
    fixture.trackId,
    fixture.facts
  );
  const resolved = resolvePacket({
    jurisdiction: "DC",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId} resolved to ${resolved.runtimeStatus}.`
  );
  ok(
    resolved.components.length === 1,
    `${fixture.fixtureId} did not resolve exactly one component.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const expectedComponent = expected?.components.find(
      (entry) => entry.componentId === component.componentId
    );
    const output = await renderPacketComponent({
      component,
      jurisdiction: "DC",
      geography: null,
      facts,
      rootDir: root
    });
    const repeated = await renderPacketComponent({
      component,
      jurisdiction: "DC",
      geography: null,
      facts,
      rootDir: root
    });
    const outputSha256 = sha(output.bytes);

    ok(
      output.mimeType === "application/pdf",
      `${component.componentId} did not render a PDF.`
    );
    ok(
      outputSha256 === sha(repeated.bytes),
      `${component.componentId} is not deterministic.`
    );
    ok(
      outputSha256 === expectedComponent?.sha256,
      `${component.componentId} does not match its reviewed hash.`
    );
    ok(
      output.pageCount === expectedComponent?.pageCount,
      `${component.componentId} does not match its reviewed page count.`
    );
    ok(
      output.bytes.length === expectedComponent?.byteSize,
      `${component.componentId} does not match its reviewed byte count.`
    );
    ok(
      component.sourcePath === null &&
        component.sourceSha256 === null &&
        output.sourceSha256 === null,
      `${component.componentId} invents an official-form source identity.`
    );
    ok(
      component.role === "primary_filing" &&
        component.order === 1 &&
        component.requirement === "required",
      `${component.componentId} changed its packet role, order or requirement.`
    );

    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
    renderedComponentCount += 1;
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "DC",
    jurisdictionName: "District of Columbia",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  const repeatedAssembly = await assemblePacketPdf({
    jurisdiction: "DC",
    jurisdictionName: "District of Columbia",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });

  ok(
    assembled.sha256 === repeatedAssembly.sha256,
    `${fixture.fixtureId} assembled packet is not deterministic.`
  );
  ok(
    assembled.sha256 === expected?.assembledSha256,
    `${fixture.fixtureId} does not match its reviewed assembled hash.`
  );
  ok(
    assembled.pageCount === expected?.assembledPageCount,
    `${fixture.fixtureId} does not match its reviewed assembled page count.`
  );
  ok(
    assembled.byteSize === expected?.assembledBytes,
    `${fixture.fixtureId} does not match its reviewed assembled byte count.`
  );
  ok(
    assembled.fileName === expected?.assembledFileName,
    `${fixture.fixtureId} does not match its reviewed file name.`
  );
  ok(
    canonicalJson(assembled.componentRanges) ===
      canonicalJson(expected?.componentRanges),
    `${fixture.fixtureId} component ranges have drifted.`
  );
  ok(
    !assembled.fileName.toLowerCase().endsWith(".zip"),
    `${fixture.fixtureId} produces a ZIP instead of one participant PDF.`
  );

  assembledPacketCount += 1;
  assembledPageCount += assembled.pageCount;
}
ok(
  renderedComponentCount === manifest.componentCount,
  `Rendered ${renderedComponentCount} components; manifest records ${manifest.componentCount}.`
);
ok(
  assembledPacketCount === manifest.assembledPacketCount,
  `Assembled ${assembledPacketCount} packets; manifest records ${manifest.assembledPacketCount}.`
);
ok(
  assembledPageCount === manifest.assembledPageCount,
  `Assembled ${assembledPageCount} pages; manifest records ${manifest.assembledPageCount}.`
);
note(
  `6. Packets: ${renderedComponentCount} deterministic components assembled into ${assembledPacketCount} participant PDFs / ${assembledPageCount} pages with reviewed hashes.`
);

// ---------------------------------------------------------------------------
// 7. Material legal boundaries remain visible in the exact templates.
// ---------------------------------------------------------------------------

const innocenceTemplate = JSON.stringify(
  pleadingTemplate("dc-innocence-expungement-motion")
);
const correctionTemplate = JSON.stringify(
  pleadingTemplate("dc-correct-misattributed-arrest-motion")
);
for (const [templateId, source] of [
  ["dc-innocence-expungement-motion", innocenceTemplate],
  ["dc-correct-misattributed-arrest-motion", correctionTemplate]
]) {
  ok(
    source.includes("DRAFT PENDING LEGAL REVIEW"),
    `${templateId} lost its draft/legal-review banner.`
  );
  ok(
    !/will be granted|guaranteed|you will succeed/i.test(source),
    `${templateId} predicts an outcome.`
  );
  ok(
    source.includes("confirm with the Criminal Division"),
    `${templateId} no longer requires filing-channel confirmation.`
  );
}
ok(
  innocenceTemplate.includes(
    "An acquittal or a dismissal does not by itself establish a presumption of innocence"
  ),
  "The actual-innocence motion lost the § 16-803(e) warning."
);
ok(
  innocenceTemplate.includes("LegalEase has not seen them") &&
    innocenceTemplate.includes("makes no judgment about whether the showing is sufficient"),
  "The actual-innocence motion no longer attributes or limits review of supporting material."
);
ok(
  correctionTemplate.includes(
    "It does not ask the Court to seal them"
  ),
  "The correction motion no longer distinguishes correction from sealing."
);
ok(
  correctionTemplate.includes("attests under oath") &&
    correctionTemplate.includes(
      "Whether the Criminal Division also requires it to be notarised is not settled"
    ),
  "The correction motion lost the oath or unresolved-notarization boundary."
);
note(
  "7. Content boundaries: remedy vocabulary, evidentiary limits, sworn attestation, unresolved notarization and clerk-confirmation instructions remain explicit."
);

// ---------------------------------------------------------------------------
// 8. The tracked proof remains technical-only and fail-closed.
// ---------------------------------------------------------------------------

ok(
  manifest.technicalReview?.passed === true,
  "The D.C. technical review is not recorded as passed."
);
ok(
  manifest.visualResult === "not_reviewed",
  "The D.C. manifest claims visual proof."
);
ok(
  manifest.legalRecommendationComplete === true,
  "The D.C. manifest does not record the completed bounded recommendation."
);
ok(
  manifest.humanLegalReviewStatus === "awaiting_counsel_adoption" &&
    manifest.counselAdopted === false,
  "The D.C. manifest does not preserve awaiting counsel adoption."
);
ok(
  manifest.implementationProof === false,
  "The D.C. manifest implies readiness-level implementation proof before visual review."
);
ok(
  recommendation.humanLegalReviewStatus ===
    "awaiting_counsel_adoption" &&
    recommendation.counselAdopted === false,
  "The legal-output recommendation does not preserve awaiting counsel adoption."
);
ok(
  recommendation.visualProofStatus === "not_reviewed" &&
    recommendation.implementationProof === false,
  "The legal-output recommendation implies visual or implementation proof."
);
ok(
  recommendation.runtimeStatus === "runtime_disabled" &&
    recommendation.packetReady === false &&
    recommendation.jurisdictionEnabled === false &&
    recommendation.productionEnabled === false,
  "The legal-output recommendation claims release, readiness or enablement."
);
ok(
  recommendation.implementationCommit === tranche.implementationCommit &&
    recommendation.implementationSourceSha256 ===
      tranche.implementationSource.sha256,
  "The legal-output recommendation is not bound to the exact implementation."
);
for (const entry of recommendation.recommendations) {
  ok(
    entry.components.length === 1 &&
      entry.knownLimitations.length > 0 &&
      entry.requiredBeforeFiling.length > 0,
    `${entry.trackId} recommendation is not bounded to its component, limitations and pre-filing instructions.`
  );
}
ok(
  recommendation.questionsForCounsel.length > 0,
  "The legal-output recommendation carries no questions for counsel."
);
ok(
  manifest.runtimeStatus === "runtime_disabled" &&
    manifest.packetReady === false &&
    manifest.jurisdictionEnabled === false &&
    manifest.productionEnabled === false,
  "The D.C. manifest claims release, readiness or enablement."
);
note(
  "8. Release state: bounded recommendation complete for two routes; visual review, counsel adoption, staging and production remain open, so implementationProof stays false."
);

console.log("");
if (failures.length > 0) {
  console.error("District of Columbia custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("District of Columbia custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log(
  "9. No route was promoted, no jurisdiction enabled, source pinning remains false and packet readiness remains 0."
);

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(trancheDirectory, fileName), "utf8")
  );
}

function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sameArray(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function canonicalJson(value) {
  return JSON.stringify(value);
}
