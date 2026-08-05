// Implementation Tranche 2 (Maryland) — packet verification.
//
// Tranche 1 proved the custom-pleading lane. This is the official-form lane, so
// the properties that matter are different ones. A generated pleading contains
// only what a template put there; a filled official form is the court's own
// document with values written into named blanks, and the ways it goes wrong are
// ways a rendered sample looks fine while being wrong:
//
//   - a value written into a blank the court did not give LegalEase — an
//     attorney appearance, a signature, a signature date, a court order date;
//   - a value written into a blank that no longer exists under that name, which
//     silently does nothing;
//   - a dropdown set to a string the form does not offer, which leaves the court
//     unnamed on a filed petition;
//   - a value wider than the blank, clipped at the widget edge by the viewer;
//   - two runs of the same facts producing different bytes, which makes the
//     recorded SHA-256 in the review manifest worthless.
//
// Every check below is re-derived from the source PDFs and the registry. The
// field-ownership map is treated as a claim to be tested, never as evidence:
// its own summary says so.
//
// Runs offline against the real renderer. No network, no database, no promotion.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";

import { buildFactoryPlan } from "./lib/rcap-factory/planner.mjs";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS, acroMappingsFor } = await import("@/lib/rcap/packets/registry");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const { GUIDANCE_TEMPLATES, NOT_A_COURT_FILING_SENTENCE } = await import(
  "@/lib/rcap/packets/engines/process-guidance"
);
const {
  deriveMarylandFacts,
  MarylandBranchError,
  MARYLAND_SHIELDING_TRACK_ID,
  MARYLAND_COURT_LEVELS,
  MARYLAND_SHIELDABLE_OFFENCES,
  MARYLAND_CIRCUIT_COURT_LOCATIONS,
  MARYLAND_DISTRICT_COURT_LOCATIONS,
  courtLocationsFor,
  offenceCheckboxKey,
  offenceCaseKey
} = await import("@/lib/rcap/packets/tranche-2-maryland-facts");

const root = process.cwd();
const DIR = path.join(root, "data/record-clearing/implementation-tranches");
const tranche = readJson("tranche-2.json");
const pins = readJson("tranche-2-authority-pins.json");
const fixtures = readJson("tranche-2-fixtures.json");
const guidance = readJson("tranche-2-component-guidance.json");
const ownership = readJson("tranche-2-field-ownership.json");
const recordedProductionPlan = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "planning/record-clearing-100-percent/production-plan.json"
    ),
    "utf8"
  )
);
const currentFactoryPlan = buildFactoryPlan({
  rootDir: root,
  baseCommit:
    recordedProductionPlan.factoryQueueReconciliation
      ?.generatedAgainstCommit
});
const marylandSourceInputs =
  currentFactoryPlan.jobs.find(
    (job) => job.jobId === "rcap-md-official-pdf-supporting-components"
  )?.sourceMaterializationInputs ?? [];
const verifiedMaterializationByDocument = new Map(
  marylandSourceInputs
    .filter(
      (input) =>
        input.materializationState ===
          "binary_materialized_hash_verified" &&
        input.workerReadiness === "worker_ready" &&
        input.provenance?.freshLocalVerification === true
    )
    .map((input) => [input.documentId, input])
);

const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);

/** Owners whose blanks the renderer is permitted to write into. */
const WRITABLE_OWNERS = new Set(["participant", "system_derived"]);

// ---------------------------------------------------------------------------
// 1. Selection is deterministic, bounded and single-jurisdiction
// ---------------------------------------------------------------------------

const selected = tranche.selectedTracks.map((entry) => entry.trackId);
ok(new Set(selected).size === selected.length, "The tranche names a track more than once.");
ok(selected.length >= 1, "The tranche selects no track.");
ok(tranche.jurisdiction === "MD", "The tranche jurisdiction is not Maryland.");
ok(
  selected.every((trackId) => trackId.startsWith("md_")),
  "The tranche selects a track outside Maryland."
);
ok(
  tranche.finalParticipantDeliverable === "one_assembled_pdf",
  "The tranche does not deliver one assembled PDF."
);

// Every excluded candidate must carry a reason, so a route is never dropped
// silently. A tranche that shrinks without saying why is indistinguishable from
// one that quietly gave up on a viable route.
for (const candidate of tranche.candidatesConsidered) {
  ok(
    ["selected", "excluded"].includes(candidate.outcome),
    `${candidate.trackId}: unknown selection outcome.`
  );
  if (candidate.outcome === "excluded") {
    ok(
      typeof candidate.reason === "string" && candidate.reason.length > 40,
      `${candidate.trackId}: excluded without a stated reason.`
    );
  }
}
const consideredSelected = tranche.candidatesConsidered
  .filter((entry) => entry.outcome === "selected")
  .map((entry) => entry.trackId);
ok(
  consideredSelected.slice().sort().join(",") === selected.slice().sort().join(","),
  "The selected set does not match the candidates recorded as selected."
);
note(
  `1. Selection: ${selected.length} track of ${tranche.candidatesConsidered.length} official-form candidates, Maryland only, every exclusion reasoned.`
);

// ---------------------------------------------------------------------------
// 2. Nothing is promoted
// ---------------------------------------------------------------------------

for (const trackId of selected) {
  const track = RELIEF_TRACKS.find((entry) => entry.trackId === trackId);
  ok(Boolean(track), `${trackId} is not registered.`);
  if (!track) continue;
  ok(track.runtimeDisabled === true, `${trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${trackId} is not marked a non-production fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${trackId} claims visual approval.`);
  const runtime = computeRuntimeStatus({
    statuses: track.statuses,
    sourceCurrent: track.sourceCurrent,
    runtimeDisabled: track.runtimeDisabled,
    outputStrategy: track.outputStrategy
  });
  ok(runtime === "runtime_disabled", `${trackId} computes ${runtime} rather than runtime_disabled.`);
  for (const component of track.packetSet.components) {
    ok(component.approval.legal === "not_submitted", `${component.componentId} claims legal approval.`);
    ok(component.approval.visual === "not_reviewed", `${component.componentId} claims visual approval.`);
  }
}
ok(RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0, "A relief track is not runtime-disabled.");
ok(tranche.packetReady === false, "The tranche claims packet_ready.");
ok(tranche.generationAllowed === false, "The tranche claims generation is allowed.");
ok(tranche.jurisdictionEnabled === false, "The tranche claims the jurisdiction is enabled.");
note(`2. Promotion: every registered track runtime_disabled; packet_ready, generation and enablement all false.`);

// ---------------------------------------------------------------------------
// 3. Authority pinning, and the pinned binaries are the binaries on disk
// ---------------------------------------------------------------------------

const authority = readJson("../master-library/authority.json");
ok(pins.authorityEdition === authority.edition, "The pins name a different edition than the adopted one.");
ok(
  pins.authorityArchiveSha256 === authority.retention.archiveSha256,
  "The pinned archive SHA-256 does not match the adopted edition."
);
ok(
  tranche.authorityArchiveSha256 === authority.retention.archiveSha256,
  "The tranche record names a different edition archive than the adopted one."
);

const relationships = readJson("../legal-design-track-source-relationships.json");
const relationshipByComponent = new Map(
  relationships.relationships
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => [entry.componentId, entry])
);

const pinWritten = new Map((pins.sourceRelationshipPinsWritten ?? []).map((p) => [p.componentId, p]));

/** Source form identity, keyed by component, re-derived from the file on disk. */
const officialSources = new Map();
const missingOfficialSources = [];

for (const pinnedTrack of pins.tracks ?? []) {
  for (const component of pinnedTrack.components ?? []) {
    if (component.officialFormBinaryRequired !== true) continue;

    const asset = component.asset ?? {};
    const repositoryPath = component.repositorySourcePath;
    const sha256 = component.repositorySourceSha256;

    // The selection rule the tranche claims to have applied. A source-gated,
    // reference-only, retired, excluded or superseded asset is never
    // resolver-selectable, so a packet built on one is built on nothing.
    ok(asset.assetClass === "packet_form", `${component.componentId}: asset class is ${asset.assetClass}.`);
    ok(asset.packetCandidate === true, `${component.componentId}: the asset is not a packet candidate.`);
    ok(asset.libraryEdition === authority.edition, `${component.componentId}: the asset is from a different edition.`);
    // Boolean checks only; the rest are the author's prose reasoning.
    for (const [check, value] of Object.entries(component.candidateChecks ?? {})) {
      if (typeof value !== "boolean") continue;
      const expected = check === "approvedPacketCandidate";
      ok(value === expected, `${component.componentId}: candidate check ${check} is ${value}.`);
    }
    // Nothing may be generated under this edition, and the pin must say so.
    ok(asset.generationAllowed === false, `${component.componentId}: the asset claims generation is allowed.`);

    ok(/^[0-9a-f]{64}$/.test(sha256 ?? ""), `${component.componentId}: no pinned SHA-256.`);
    ok(
      asset.sha256 === sha256,
      `${component.componentId}: the edition asset hash and the repository hash disagree.`
    );

    const repositoryFile = path.join(root, repositoryPath ?? "");
    const materialization =
      verifiedMaterializationByDocument.get(component.officialFormId);
    const materializationRoot =
      process.env.RCAP_SOURCE_MATERIALIZATION_ROOT;
    const materializedFile =
      materialization && materializationRoot
        ? path.join(
            path.resolve(materializationRoot),
            materialization.materializationDestination
          )
        : null;
    const file =
      materializedFile && fs.existsSync(materializedFile)
        ? materializedFile
        : repositoryFile;
    ok(fs.existsSync(file), `${component.componentId}: the pinned source binary is absent at ${repositoryPath}.`);
    if (!fs.existsSync(file)) {
      missingOfficialSources.push({
        componentId: component.componentId,
        documentId: component.officialFormId,
        repositoryPath,
        materializationState:
          materialization?.provenance?.localVerificationState ??
          "materialized_source_absent"
      });
      continue;
    }

    const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    ok(actual === sha256, `${component.componentId}: the pinned SHA-256 does not match the file on disk.`);

    // The pin the intake writes back, and the generated source relationship,
    // must both describe this same document — otherwise the packet is built
    // from one file while the authority record describes another.
    const written = pinWritten.get(component.componentId);
    ok(Boolean(written), `${component.componentId}: no source-relationship pin was recorded.`);
    if (written) {
      ok(written.sha256 === sha256, `${component.componentId}: the recorded pin has a different SHA-256.`);
      ok(written.officialSourceUrl === repositoryPath, `${component.componentId}: the recorded pin names a different file.`);
      ok(written.officialFormId === component.officialFormId, `${component.componentId}: the recorded pin names a different form.`);
    }

    const relationship = relationshipByComponent.get(component.componentId);
    ok(Boolean(relationship), `${component.componentId}: no source relationship.`);
    if (relationship) {
      ok(relationship.sha256 === sha256, `${component.componentId}: the source relationship pins a different SHA-256.`);
      ok(
        relationship.officialSourceUrl === repositoryPath,
        `${component.componentId}: the source relationship names a different file.`
      );
      ok(
        relationship.officialFormId === component.officialFormId,
        `${component.componentId}: the source relationship names a different form.`
      );
    }

    officialSources.set(component.componentId, {
      componentId: component.componentId,
      documentId: component.officialFormId,
      workflowKey: asset.workflowKey,
      repositoryPath,
      sha256,
      absolutePath: file,
      materializedExternalSource:
        file === materializedFile
    });
  }
}
ok(officialSources.size > 0, "The tranche pins no official source.");

// Source-gated assets must be recorded as deliberately unpinned, never used.
for (const gated of pins.sourceGatedAssetsDeliberatelyNotPinned ?? []) {
  ok(gated.assetClass === "source_gated", `${gated.workflowKey}: recorded as gated but classed ${gated.assetClass}.`);
  ok(
    ![...officialSources.values()].some((source) => source.workflowKey === gated.workflowKey),
    `${gated.workflowKey}: a source-gated asset was used to build a packet.`
  );
}
note(
  `3. Authority: Edition ${pins.authorityEdition} pinned by SHA-256; ${officialSources.size} packet-form sources hash-matched on disk; ${(pins.sourceGatedAssetsDeliberatelyNotPinned ?? []).length} source-gated assets refused.`
);
if (missingOfficialSources.length > 0) {
  console.error("");
  console.error("Tranche 2 packet verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  for (const source of missingOfficialSources) {
    console.error(
      `- ${source.documentId}: companion source remains unavailable ` +
      `(${source.materializationState}); no substitute was used.`
    );
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4. Component roles, order, strategy and source identity match the pins
// ---------------------------------------------------------------------------

for (const pinned of pins.tracks ?? []) {
  const track = RELIEF_TRACKS.find((entry) => entry.trackId === pinned.trackId);
  ok(Boolean(track), `${pinned.trackId} is pinned but not registered.`);
  if (!track) continue;
  ok(
    track.outputStrategy === "official_pdf_fill",
    `${pinned.trackId} is not an official_pdf_fill track.`
  );

  const built = new Map(track.packetSet.components.map((c) => [c.componentId, c]));
  for (const component of pinned.components ?? []) {
    const actual = built.get(component.componentId);
    ok(Boolean(actual), `${component.componentId} is pinned but not built.`);
    if (!actual) continue;
    ok(
      actual.role === component.role,
      `${component.componentId}: role ${actual.role} does not match the pinned ${component.role}.`
    );
    ok(
      actual.outputStrategy === component.outputStrategy,
      `${component.componentId}: strategy does not match the pin.`
    );

    if (actual.outputStrategy === "official_pdf_fill") {
      const source = officialSources.get(component.componentId);
      ok(Boolean(source), `${component.componentId}: an official-form component with no pinned source.`);
      ok(
        actual.sourceSha256 === source?.sha256,
        `${component.componentId}: the built component names a different source hash than the pin.`
      );
      ok(
        actual.sourcePath === source?.repositoryPath,
        `${component.componentId}: the built component names a different source path than the pin.`
      );
    } else {
      // A generated document must never claim to be an official court form.
      ok(
        actual.sourcePath === null && actual.sourceSha256 === null,
        `${component.componentId}: a generated component names an official source.`
      );
      ok(
        Boolean(GUIDANCE_TEMPLATES[actual.templateId]),
        `${component.componentId}: template ${actual.templateId} is not registered.`
      );
    }
  }

  const orders = track.packetSet.components.map((c) => c.order);
  ok(new Set(orders).size === orders.length, `${pinned.trackId}: duplicate component order.`);
  ok(
    track.packetSet.components.some((c) => c.role === "primary_filing"),
    `${pinned.trackId}: no primary_filing component.`
  );
  ok(
    track.packetSet.components.some((c) => c.role === "instructions"),
    `${pinned.trackId}: no instructions component.`
  );
}
note(`4. Components: roles, order, strategy and official source identity match the pinned packet definition.`);

// ---------------------------------------------------------------------------
// 5. The guidance component inside an official-form track has a specification
// ---------------------------------------------------------------------------

const specifications = readJson("../legal-design-specifications.json");
const guidanceTrackIds = new Set(specifications.processGuidanceSpecs.map((spec) => spec.trackId));
for (const spec of guidance.specifications) {
  ok(guidanceTrackIds.has(spec.trackId), `${spec.trackId}: authored guidance did not reach the specification set.`);
  for (const templateId of spec.templateIds) {
    ok(Boolean(GUIDANCE_TEMPLATES[templateId]), `${templateId}: guidance template is not registered.`);
  }
}
// The gate must still hold for the Maryland routes nobody drafted.
for (const undrafted of ["md_10105_favorable", "md_10110_conviction", "md_cannabis_petition"]) {
  ok(!guidanceTrackIds.has(undrafted), `${undrafted} acquired a guidance specification it was never drafted for.`);
}
note(`5. Guidance: ${guidance.specifications.length} authored component specification; excluded Maryland routes still blocked.`);

// ---------------------------------------------------------------------------
// 6. The field-ownership map is complete, exclusive and honest
//
//    Re-derived from the source PDFs. Three separate failures are possible and
//    all three are silent in a rendered sample: a field the map never
//    classified, a mapping onto a field that does not exist, and a mapping onto
//    a field somebody else owns.
// ---------------------------------------------------------------------------

/** pdfFieldName → field object, per component. */
const sourceFields = new Map();

for (const form of ownership.forms) {
  const source = [...officialSources.values()].find((entry) => entry.documentId === form.documentId);
  ok(Boolean(source), `${form.documentId}: the ownership map describes a form the tranche does not pin.`);
  if (!source) continue;

  ok(
    form.sha256 === source.sha256,
    `${form.documentId}: the ownership map was written against a different revision than the pinned source.`
  );

  const doc = await PDFDocument.load(fs.readFileSync(source.absolutePath), { ignoreEncryption: true });
  ok(doc.getPageCount() === form.pages, `${form.documentId}: page count is not ${form.pages}.`);

  const actualFields = new Map(doc.getForm().getFields().map((field) => [field.getName(), field]));
  sourceFields.set(source.componentId, actualFields);

  ok(
    actualFields.size === form.fieldCount,
    `${form.documentId}: the source has ${actualFields.size} fields, the map declares ${form.fieldCount}.`
  );

  const mapped = new Map(form.fields.map((entry) => [entry.pdfFieldName, entry]));
  ok(mapped.size === form.fields.length, `${form.documentId}: the ownership map lists a field twice.`);

  for (const name of actualFields.keys()) {
    ok(mapped.has(name), `${form.documentId}: field "${name}" exists on the form but is unclassified.`);
  }
  for (const name of mapped.keys()) {
    ok(actualFields.has(name), `${form.documentId}: the ownership map classifies "${name}", which the form does not have.`);
  }

  // Only the participant's own blanks and approved system-derived blanks may
  // carry a mapping.
  for (const entry of form.fields) {
    if (entry.mapped) {
      ok(
        WRITABLE_OWNERS.has(entry.owner),
        `${form.documentId}: "${entry.pdfFieldName}" is mapped but owned by ${entry.owner}.`
      );
    }
  }

  // And the registry must agree: every registered mapping points at a field
  // that exists and that the map records as writable.
  const registered = acroMappingsFor(source.componentId);
  ok(registered.length > 0, `${source.componentId}: no AcroForm mappings are registered.`);
  for (const mapping of registered) {
    ok(
      actualFields.has(mapping.pdfFieldName),
      `${source.componentId}: mapping targets "${mapping.pdfFieldName}", which does not exist on ${form.documentId}.`
    );
    const entry = mapped.get(mapping.pdfFieldName);
    ok(
      entry ? WRITABLE_OWNERS.has(entry.owner) : false,
      `${source.componentId}: mapping targets "${mapping.pdfFieldName}", owned by ${entry?.owner ?? "an unclassified actor"}.`
    );
    ok(
      entry ? entry.mapped === true : false,
      `${source.componentId}: "${mapping.pdfFieldName}" is written by the registry but the map records it unmapped.`
    );
  }
  const registeredNames = new Set(registered.map((m) => m.pdfFieldName));
  for (const entry of form.fields) {
    if (entry.mapped) {
      ok(
        registeredNames.has(entry.pdfFieldName),
        `${form.documentId}: the map records "${entry.pdfFieldName}" as mapped but no registry mapping writes it.`
      );
    }
  }
}
const totalClassified = ownership.forms.reduce((sum, form) => sum + form.fields.length, 0);
note(
  `6. Field ownership: ${totalClassified} fields across ${ownership.forms.length} forms, each classified exactly once, every registry mapping resolvable and participant- or system-owned.`
);

// ---------------------------------------------------------------------------
// 7. Branch routing, including the closed lists
// ---------------------------------------------------------------------------

const baseFacts = fixtures.positiveFixtures.find(
  (entry) => entry.fixtureId === "md-shielding-positive-district"
).facts;

for (const level of MARYLAND_COURT_LEVELS) {
  const locations = courtLocationsFor(level);
  ok(locations.length > 0, `${level}: no court locations are registered.`);
  const derived = deriveMarylandFacts(MARYLAND_SHIELDING_TRACK_ID, {
    ...baseFacts,
    courtLevel: level,
    courtCityCounty: locations[0]
  });
  // The elected level is checked on both forms, and the other level is not.
  for (const form of ["md148", "mdj008"]) {
    ok(
      derived[`${form}${level === "district" ? "District" : "Circuit"}Court`] === true,
      `${level}: the court-level branch did not check the box on ${form}.`
    );
    ok(
      derived[`${form}${level === "district" ? "Circuit" : "District"}Court`] === false,
      `${level}: the court-level branch also checked the other court on ${form}.`
    );
  }
}
ok(
  MARYLAND_DISTRICT_COURT_LOCATIONS.every((entry) => !MARYLAND_CIRCUIT_COURT_LOCATIONS.includes(entry)),
  "A court location is offered for both court levels."
);

// Every one of the twelve statutory offences must route independently.
ok(
  MARYLAND_SHIELDABLE_OFFENCES.length === 12,
  `The Second Chance Act offence list has ${MARYLAND_SHIELDABLE_OFFENCES.length} entries, not twelve.`
);
for (const offence of MARYLAND_SHIELDABLE_OFFENCES) {
  const derived = deriveMarylandFacts(MARYLAND_SHIELDING_TRACK_ID, {
    ...baseFacts,
    convictions: [{ offenceKey: offence.key, caseNumbers: ["1B02SYN0001"] }]
  });
  ok(derived[offenceCheckboxKey(offence.key)] === true, `${offence.key}: its checkbox did not route.`);
  ok(
    String(derived[offenceCaseKey(offence.key)] ?? "").includes("1B02SYN0001"),
    `${offence.key}: its case number did not reach its own block.`
  );
  // The checkbox and case-number field names must be the form's own, verbatim.
  const petitionFields = sourceFields.get("md_second_chance_shielding-primary-filing-1");
  if (petitionFields) {
    ok(petitionFields.has(offence.checkboxField), `${offence.key}: checkbox field is not on CC-DC-CR-148.`);
    ok(petitionFields.has(offence.caseField), `${offence.key}: case-number field is not on CC-DC-CR-148.`);
    if (offence.continuationField) {
      ok(
        petitionFields.has(offence.continuationField),
        `${offence.key}: continuation field is not on CC-DC-CR-148.`
      );
    }
  }
  // No other offence may be checked by selecting this one.
  for (const other of MARYLAND_SHIELDABLE_OFFENCES) {
    if (other.key === offence.key) continue;
    ok(
      derived[offenceCheckboxKey(other.key)] !== true,
      `${offence.key}: selecting it also checked ${other.key}.`
    );
    ok(
      String(derived[offenceCaseKey(other.key)] ?? "") === "",
      `${offence.key}: selecting it put a case number in ${other.key}'s block.`
    );
  }
}

// Unapproved values must fail closed rather than produce a defaulted petition.
for (const [key, value, why] of [
  ["courtLevel", "orphans_court", "an unapproved court level"],
  ["courtLevel", "", "an empty court level"],
  ["courtCityCounty", "Montgomery County (CC)", "a circuit location under a district election"],
  ["courtCityCounty", "", "an empty court location"],
  ["priorShieldingPetition", "yes", "a participant who has already used their one petition"],
  ["priorShieldingPetition", "", "an unanswered once-per-lifetime question"],
  ["pendingCriminalCharges", "yes", "a participant with pending charges"],
  ["domesticallyRelated", "yes", "a domestically related conviction"],
  ["domesticallyRelated", "maybe", "an equivocal domestic-relation answer"],
  ["sameIncidentIneligibleOffence", "yes", "an ineligible offence in the same incident"],
  ["convictionsInOtherCourtsOrCounties", "yes", "a multi-court record"]
]) {
  let threw = false;
  try {
    deriveMarylandFacts(MARYLAND_SHIELDING_TRACK_ID, { ...baseFacts, [key]: value });
  } catch (error) {
    threw = error instanceof MarylandBranchError;
  }
  ok(threw, `${key}: ${why} did not fail closed.`);
}

// An offence outside the statutory list cannot be smuggled in.
let unknownOffenceThrew = false;
try {
  deriveMarylandFacts(MARYLAND_SHIELDING_TRACK_ID, {
    ...baseFacts,
    convictions: [{ offenceKey: "armed_robbery", caseNumbers: ["1B02SYN0001"] }]
  });
} catch (error) {
  unknownOffenceThrew = error instanceof MarylandBranchError;
}
ok(unknownOffenceThrew, "An offence outside the Second Chance Act list did not fail closed.");
note(
  `7. Branches: ${MARYLAND_COURT_LEVELS.length} court levels and ${MARYLAND_SHIELDABLE_OFFENCES.length} independent offences route; unapproved values fail closed.`
);

// ---------------------------------------------------------------------------
// 8. Boundary fixtures stop
// ---------------------------------------------------------------------------

const byFixtureId = new Map(fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry]));
for (const boundary of fixtures.boundaryFixtures) {
  const base = byFixtureId.get(boundary.basedOn);
  ok(Boolean(base), `${boundary.fixtureId}: is based on an unknown fixture.`);
  if (!base) continue;
  const facts = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  if (boundary.overrideConvictions) facts.convictions = boundary.overrideConvictions;
  for (const key of boundary.omitKeys ?? []) delete facts[key];

  let outcome = "generated";
  try {
    const derived = deriveMarylandFacts(boundary.trackId, facts);
    const resolved = resolvePacket({
      jurisdiction: "MD",
      trackId: boundary.trackId,
      facts: derived,
      allowTechnicalFixtures: true
    });
    for (const component of resolved.components) {
      await renderPacketComponent({
        component: verificationSourceComponent(component),
        jurisdiction: "MD",
        geography: null,
        facts: derived,
        rootDir: root
      });
    }
  } catch (error) {
    if (error instanceof MarylandBranchError) outcome = "branch_error";
    else if (error instanceof PacketResolutionError) outcome = "resolution_missing_required_input";
    else if (error?.name === "PacketRenderError") outcome = "render_error";
    else outcome = "unexpected_error";
  }
  ok(outcome === boundary.expect, `${boundary.fixtureId}: expected ${boundary.expect}, got ${outcome}.`);
}
note(`8. Boundaries: ${fixtures.boundaryFixtures.length} stop conditions all stop.`);

// ---------------------------------------------------------------------------
// 9. Rendered output — participant values land, third-party blanks stay blank
//
//    This is the tranche's central safety property, and it is checked against
//    the produced bytes rather than against the code that produced them.
// ---------------------------------------------------------------------------

// Shielding is not expungement, and the guidance must name the difference
// rather than avoid the word. What is prohibited is the claim, not the term:
// a participant told their record is erased, or that they may now deny the
// conviction, has been told the one thing this route does not do.
const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/\b(record|conviction)s?\b[^.]{0,40}\b(will be|is|are|gets?)\b[^.]{0,20}\b(expunged|erased|destroyed|deleted)\b/i,
    "a claim that the record is expunged, erased or destroyed"],
  [/\byou (may|can|will be able to)\b[^.]{0,40}\bdeny\b/i, "a claim the participant may deny the conviction"],
  [/as if (it|the (conviction|arrest)) never happened/i, "a claim the conviction never happened"],
  [/social security/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  [/rehabilitat/i, "a rehabilitation narrative"],
  [/by and through (his|her|their) attorney/i, "an attorney recital"],
  [/we (will )?(file|submit) (it|this) for you/i, "a promise to file for the participant"]
];

/** Reads back every field value from rendered bytes. */
async function fieldValues(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const values = new Map();
  for (const field of doc.getForm().getFields()) {
    let value = "";
    if (field instanceof PDFTextField) value = field.getText() ?? "";
    else if (field instanceof PDFCheckBox) value = field.isChecked() ? "on" : "";
    else if (field instanceof PDFDropdown) value = (field.getSelected() ?? []).join(",");
    else if (field instanceof PDFRadioGroup) value = field.getSelected() ?? "";
    values.set(field.getName(), String(value).trim());
  }
  return values;
}

const ownershipByComponent = new Map();
for (const form of ownership.forms) {
  const source = [...officialSources.values()].find((entry) => entry.documentId === form.documentId);
  if (source) ownershipByComponent.set(source.componentId, new Map(form.fields.map((f) => [f.pdfFieldName, f])));
}

/** Renders one fixture's whole packet and returns the component bytes by id. */
async function renderFixture(fixture) {
  const facts = deriveMarylandFacts(fixture.trackId, fixture.facts);
  const resolved = resolvePacket({
    jurisdiction: "MD",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);

  const rendered = new Map();
  for (const component of resolved.components) {
    const verificationComponent =
      verificationSourceComponent(component);
    const result = await renderPacketComponent({
      component: verificationComponent,
      jurisdiction: "MD",
      geography: null,
      facts,
      rootDir: root
    });
    rendered.set(component.componentId, {
      component: verificationComponent,
      result
    });
  }
  return { facts, rendered };
}

let thirdPartyFieldsWritten = 0;
let participantValuesLanded = 0;

for (const fixture of fixtures.positiveFixtures) {
  const { facts, rendered } = await renderFixture(fixture);

  for (const [componentId, { component, result }] of rendered) {
    ok(result.mimeType === "application/pdf", `${componentId}: not a PDF.`);
    ok((result.pageCount ?? 0) > 0, `${componentId}: no pages.`);
    ok(result.warnings.length === 0, `${componentId}: rendered with warnings — ${result.warnings.join("; ")}`);
    ok(
      result.validation.issues.length === 0,
      `${componentId}: technical validation reported ${result.validation.issues.join("; ")}`
    );

    // Deterministic: identical facts, identical bytes. Without this the SHA-256
    // recorded in the review manifest proves nothing.
    const again = await renderPacketComponent({
      component,
      jurisdiction: "MD",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(result.bytes) === sha(again.bytes),
      `${componentId}: rendering the same facts twice produced different bytes.`
    );

    if (component.outputStrategy === "official_pdf_fill") {
      const source = officialSources.get(componentId);
      ok(result.sourceSha256 === source?.sha256, `${componentId}: rendered from an unexpected source revision.`);

      const owners = ownershipByComponent.get(componentId);
      const values = await fieldValues(result.bytes);
      const pristine = sourceFields.get(componentId);

      ok(
        values.size === pristine.size,
        `${componentId}: rendering changed the field count from ${pristine.size} to ${values.size}.`
      );

      for (const [name, value] of values) {
        const entry = owners?.get(name);
        ok(Boolean(entry), `${componentId}: rendered field "${name}" is not in the ownership map.`);
        if (!entry) continue;

        if (!WRITABLE_OWNERS.has(entry.owner)) {
          // The whole point of the tranche. A judge, clerk, prosecutor, notary,
          // agency, court or attorney blank — and every signature and signature
          // date — must come out of the renderer empty.
          if (value !== "") {
            thirdPartyFieldsWritten += 1;
            failures.push(
              `${componentId}: "${name}" is owned by ${entry.owner} but the renderer wrote ${JSON.stringify(value)}.`
            );
          }
        } else if (value !== "") {
          participantValuesLanded += 1;
        }
      }

      // A dropdown may only carry an option the court's own form offers.
      const doc = await PDFDocument.load(result.bytes, { ignoreEncryption: true });
      for (const field of doc.getForm().getFields()) {
        if (!(field instanceof PDFDropdown)) continue;
        const chosen = field.getSelected() ?? [];
        for (const option of chosen) {
          ok(
            field.getOptions().includes(option),
            `${componentId}: dropdown "${field.getName()}" is set to ${JSON.stringify(option)}, which the form does not offer.`
          );
        }
      }
    } else {
      ok(result.sourceSha256 === null, `${componentId}: a generated document reports an official source hash.`);
      const template = GUIDANCE_TEMPLATES[component.templateId];
      const source = JSON.stringify(template);
      for (const [pattern, why] of PROHIBITED) {
        ok(!pattern.test(source), `${componentId}: guidance contains ${why}.`);
      }
      ok(
        (template.notFilingNotice ?? "").startsWith(NOT_A_COURT_FILING_SENTENCE),
        `${componentId}: guidance does not open with the not-a-court-filing sentence.`
      );
      ok(template.whyNotAFiling.length > 0, `${componentId}: guidance does not say why it is not a filing.`);
      // The packet's own required-before-filing checklist and handoff rules.
      ok(template.prerequisites.length > 0, `${componentId}: no required-before-filing checklist.`);
      ok(template.escalationTriggers.length > 0, `${componentId}: no attorney-handoff conditions.`);
      ok(Boolean(template.fees), `${componentId}: no filing-fee instruction.`);
      ok(Boolean(template.officialDestination), `${componentId}: no filing destination.`);
      // And it must positively distinguish shielding from expungement, which is
      // the accepted design's named failure mode for this route.
      ok(
        /not expungement|is not (an )?expungement/i.test(source),
        `${componentId}: guidance does not tell the participant that shielding is not expungement.`
      );
    }
  }
}
ok(thirdPartyFieldsWritten === 0, `${thirdPartyFieldsWritten} third-party fields were written.`);
ok(participantValuesLanded > 0, "No participant value reached any official form.");
note(
  `9. Output: ${fixtures.positiveFixtures.length} fixtures render deterministically with no warnings; ${participantValuesLanded} participant values landed; 0 third-party fields written; every dropdown value offered by the form.`
);

// ---------------------------------------------------------------------------
// 10. Third-party ownership fixture — knowing an answer is not permission
// ---------------------------------------------------------------------------

// The injection goes into the DERIVED facts, past the fact builder. Dropping an
// unknown key in the builder proves the builder; it does not prove the renderer
// would refuse the key if something else supplied it. This is the version of the
// test that exercises the rule protecting a filed document: a field with no
// registered mapping cannot be written, whatever the caller knows.
const tpo = fixtures.thirdPartyOwnershipFixture;
const tpoBase = byFixtureId.get(tpo.basedOn);
ok(Boolean(tpoBase), "The third-party ownership fixture is based on an unknown fixture.");
if (tpoBase) {
  const injectedFacts = tpo.injectedThirdPartyFacts ?? {};
  const injectedKeys = Object.keys(injectedFacts);
  ok(injectedKeys.length > 0, "The third-party ownership fixture injects nothing.");

  const cleanFacts = deriveMarylandFacts(tpo.trackId, tpoBase.facts);
  const dirtyFacts = { ...cleanFacts, ...injectedFacts };

  // Nothing injected may collide with a key the derivation legitimately owns,
  // or the test would be asserting that a participant value was dropped.
  for (const key of injectedKeys) {
    ok(!(key in cleanFacts), `The third-party fixture injects ${key}, which the derivation already owns.`);
  }

  const resolved = resolvePacket({
    jurisdiction: "MD",
    trackId: tpo.trackId,
    facts: dirtyFacts,
    allowTechnicalFixtures: true
  });

  // The fixture's own curated markers. Raw injected values cannot be used
  // directly: one of them is the participant's own name, injected as a forged
  // signature, and that name legitimately appears in the name fields. These 13
  // strings are the ones that discriminate.
  const mustNotAppear = tpo.mustNotAppearInOutput ?? [];
  ok(mustNotAppear.length > 0, "The third-party fixture declares no forbidden output markers.");
  const componentIdForForm = new Map(
    [...officialSources.values()].map((source) => [source.documentId, source.componentId])
  );

  for (const component of resolved.components) {
    const clean = await renderPacketComponent({
      component,
      jurisdiction: "MD",
      geography: null,
      facts: cleanFacts,
      rootDir: root
    });
    const dirty = await renderPacketComponent({
      component,
      jurisdiction: "MD",
      geography: null,
      facts: dirtyFacts,
      rootDir: root
    });

    ok(
      sha(clean.bytes) === sha(dirty.bytes),
      `${component.componentId}: injecting ${injectedKeys.length} third-party values changed the rendered bytes.`
    );

    // And, independently of the byte comparison, no forged third-party marker
    // may appear anywhere on the produced document.
    if (component.outputStrategy === "official_pdf_fill") {
      const values = await fieldValues(dirty.bytes);
      const joined = [...values.values()].join(" ");
      for (const marker of mustNotAppear) {
        ok(
          !joined.includes(marker),
          `${component.componentId}: forged third-party marker ${JSON.stringify(marker)} reached the packet.`
        );
      }

      // The blocks the fixture names must be empty on the form they name.
      for (const target of tpo.fieldsThatMustRemainEmpty ?? []) {
        if (componentIdForForm.get(target.form) !== component.componentId) continue;
        ok(
          values.get(target.pdfFieldName) === "",
          `${target.form}: "${target.pdfFieldName}" must remain empty but carries ${JSON.stringify(values.get(target.pdfFieldName))}.`
        );
      }
      for (const target of tpo.checkboxesThatMustRemainUnchecked ?? []) {
        if (componentIdForForm.get(target.form) !== component.componentId) continue;
        ok(
          values.get(target.pdfFieldName) === "",
          `${target.form}: checkbox "${target.pdfFieldName}" must remain unchecked.`
        );
      }
    }
  }
  note(
    `10. Third-party ownership: ${injectedKeys.length} values injected past the fact builder produced byte-identical documents and reached no field.`
  );
}

// ---------------------------------------------------------------------------
// 11. The review manifest describes what the generator actually produces
// ---------------------------------------------------------------------------

const manifestPath = path.join(DIR, "tranche-2-review-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  ok(
    manifest.humanLegalReviewStatus === "awaiting_counsel_adoption",
    "The review manifest does not await counsel adoption."
  );
  ok(manifest.packetReady === 0, "The review manifest does not record packet_ready 0.");
  ok(manifest.enabledJurisdictions === 0, "The review manifest does not record 0 enabled jurisdictions.");
  ok(manifest.launchGate === "red", "The review manifest does not record a red launch gate.");
  for (const forbidden of ["legal_output_approved", "counsel_approved", "generation_allowed", "enabled"]) {
    ok(
      JSON.stringify(manifest).includes(`"${forbidden}"`) === false,
      `The review manifest claims ${forbidden}.`
    );
  }

  ok(
    manifest.samplePackets.length === fixtures.positiveFixtures.length,
    "The review manifest does not cover every positive fixture."
  );
  for (const sample of manifest.samplePackets) {
    ok(/^[0-9a-f]{64}$/.test(sample.assembledSha256), `${sample.fixtureId}: no assembled SHA-256 recorded.`);
    ok(sample.assembledPageCount > 0, `${sample.fixtureId}: no page count recorded.`);
    ok(sample.pageImages === sample.assembledPageCount, `${sample.fixtureId}: not every page was rendered for review.`);
    ok(
      /^[A-Za-z0-9._-]+\.pdf$/.test(sample.assembledFileName),
      `${sample.fixtureId}: unsafe assembled file name ${sample.assembledFileName}.`
    );
    ok(
      sample.componentRanges.length === sample.componentCount,
      `${sample.fixtureId}: component ranges do not cover every component.`
    );
    // Ranges must tile the assembled document exactly once, in order.
    let expectedStart = 1;
    for (const range of [...sample.componentRanges].sort((a, b) => a.order - b.order)) {
      ok(range.startPage === expectedStart, `${sample.fixtureId}: ${range.componentId} does not start where the previous component ended.`);
      expectedStart = range.endPage + 1;
    }
    ok(
      expectedStart - 1 === sample.assembledPageCount,
      `${sample.fixtureId}: component ranges do not account for all ${sample.assembledPageCount} pages.`
    );
  }
  ok(
    manifest.boundaryFixtures.length === fixtures.boundaryFixtures.length,
    "The review manifest does not cover every boundary fixture."
  );
  ok(manifest.technicalDetail.thirdPartyFieldsWritten === 0, "The review manifest records a third-party field written.");
  ok(manifest.technicalDetail.deterministic === true, "The review manifest does not record deterministic output.");
  note(
    `11. Review manifest: ${manifest.samplePackets.length} samples with hashes and page counts, ${manifest.boundaryFixtures.length} boundaries, awaiting_counsel_adoption.`
  );
} else {
  note("11. Review manifest: not present.");
}

// ---------------------------------------------------------------------------
// 12. The visual review exists, covers every page, and resolves what it found
// ---------------------------------------------------------------------------

const visualPath = path.join(DIR, "tranche-2-visual-review.json");
ok(fs.existsSync(visualPath), "No visual review was recorded for the tranche.");
if (fs.existsSync(visualPath)) {
  const visual = JSON.parse(fs.readFileSync(visualPath, "utf8"));
  ok(visual.trancheId === tranche.trancheId, "The visual review names a different tranche.");
  ok(visual.result === "passed_no_unresolved_defects", `The visual review result is ${visual.result}.`);
  ok((visual.unresolvedDefects ?? []).length === 0, "The visual review records an unresolved defect.");
  for (const defect of visual.defectsFound ?? []) {
    ok(defect.status === "repaired", `Visual defect ${defect.id} is ${defect.status}.`);
  }

  // Every rendered page must have been accounted for, against the manifest.
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const pages = manifest.samplePackets.reduce((sum, s) => sum + s.assembledPageCount, 0);
    const images = manifest.samplePackets.reduce((sum, s) => sum + s.pageImages, 0);
    ok(visual.pagesRendered === pages, `The visual review claims ${visual.pagesRendered} pages rendered; the manifest records ${pages}.`);
    ok(visual.pagesInspected === pages, `The visual review inspected ${visual.pagesInspected} of ${pages} pages.`);
    ok(images === pages, "Not every assembled page was rasterized for review.");
    ok(
      manifest.visualReviewRecord === path.relative(root, visualPath),
      "The review manifest points at a different visual-review record."
    );
  }
  ok((visual.checks ?? []).length > 0, "The visual review records no checks.");
  for (const check of visual.checks ?? []) {
    ok(/^pass/i.test(check.result), `Visual check "${check.check}" is ${check.result}.`);
  }
  note(
    `12. Visual review: ${visual.pagesInspected}/${visual.pagesRendered} pages, ${(visual.checks ?? []).length} checks, 0 unresolved defects.`
  );
}

// ---------------------------------------------------------------------------
// 13. The legal-output recommendation exists and claims nothing it may not
// ---------------------------------------------------------------------------

const recommendationPath = path.join(DIR, "tranche-2-legal-output-recommendation.json");
ok(fs.existsSync(recommendationPath), "No legal-output recommendation was written for the tranche.");
if (fs.existsSync(recommendationPath)) {
  const recommendation = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));
  ok(
    recommendation.humanLegalReviewStatus === "awaiting_counsel_adoption",
    "The legal-output recommendation does not await counsel adoption."
  );
  const recommended = recommendation.recommendations ?? [];
  ok(recommended.length === selected.length, "The recommendation does not cover every selected track.");
  for (const entry of recommended) {
    ok(
      entry.status === "recommended_for_counsel_adoption",
      `${entry.trackId}: recommendation status is ${entry.status}.`
    );
    ok(
      selected.includes(entry.trackId),
      `${entry.trackId}: a recommendation was written for a track the tranche did not implement.`
    );
    ok(
      Array.isArray(entry.questionsForCounsel) && entry.questionsForCounsel.length > 0,
      `${entry.trackId}: the recommendation asks counsel nothing.`
    );
  }
  // A recommendation is not an approval, and must never read like one.
  for (const forbidden of ["legal_approved", "counsel_approved", "approved_for_release", "packet_ready"]) {
    ok(
      JSON.stringify(recommendation).includes(`"${forbidden}"`) === false,
      `The legal-output recommendation claims ${forbidden}.`
    );
  }
  note(`13. Legal output: ${recommended.length} track recommended_for_counsel_adoption, awaiting_counsel_adoption.`);
}

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Tranche 2 packet verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Tranche 2 packet verification passed.");
for (const line of checks) console.log(line);
console.log("14. No track was promoted, no jurisdiction enabled, packet_ready remains 0.");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(DIR, relative), "utf8"));
}
function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function verificationSourceComponent(component) {
  const source = officialSources.get(component.componentId);
  if (!source?.materializedExternalSource) return component;
  return {
    ...component,
    sourcePath: path.relative(root, source.absolutePath)
  };
}
