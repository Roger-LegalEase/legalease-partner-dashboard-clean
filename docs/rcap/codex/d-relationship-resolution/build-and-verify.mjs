#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "../../../..");
const baseCommit = "fe354ffcb05f25a3a503874008ceef07c9ce6c6b";
const registryCommit = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const ledgerCommit = "d324b897a8342d81f1a73d62cd529c87b8408feb";
const currentManifestCommit = "ec2956baee2281467c3e8167c01545818dfcd9c6";
const laneCommits = {
  D1A: "5f1606935f334ec9bdc1ccefe2fc7f9f7ab13b66",
  D2A: "eedd19fc4ca4b99ff92229a725cd7fe46781e334",
  D3A: "875640b7106d3ed2f51a67a2e053016fbc19ef7c",
};

const mapPath = "data/rcap-codex/d-track-terminalization/track-family-map.json";
const queuePath = "data/rcap-all50/review-artifacts/d-track-queue.json";
const handoffPath = "docs/record-clearing/d-wave/v3/family-handoff.json";
const adoptionPath = "data/rcap-codex/d-adoption-continuity/track-adoption.json";
const priorTerminalTreatmentPath = "data/rcap-codex/d-track-terminalization/terminal-treatment-candidates.json";
const relationshipPath = "data/record-clearing/legal-design-track-source-relationships.json";
const outputDataDirectory = join(repositoryRoot, "data/rcap-codex/d-relationship-resolution");
const outputDocsDirectory = join(repositoryRoot, "docs/rcap/codex/d-relationship-resolution");
const dispatchDirectory = join(outputDocsDirectory, "dispatch");

const inputDigests = {
  [mapPath]: "a93b742e5d348be55d68861f11e292cc0744b70266ca70ee8129852e21fe1f52",
  [queuePath]: "a953681200c644a2b747e7b10cdf4579017cac2a7fbad08d5e147e8439182ad3",
  [handoffPath]: "c62451684cd910114e1709352d3017a7e7084ad7c96062239d1d2205891f94b3",
  [adoptionPath]: "2765071a048f571054337c291ba0ba5ea4a66ad91bc723f084dea5fbeae3ed36",
  [priorTerminalTreatmentPath]: "ea234669941351ba90b5e2341a07697fb2729775666f62210aaf650d0b1ebaaf",
};
const treatmentCorpusDirectories = [
  "data/rcap-all50/guidance-packets",
  "data/rcap-codex/remaining-tracks/candidate-treatments",
];
const treatmentCorpusDigest = "2f58fbece35c35ad80bd3cd8fb613af3923f859c7ea34eae386dc3bff4c438c4";

const allowedOutcomes = new Set([
  "exact_required_component",
  "exact_optional_component",
  "exact_instruction_component",
  "exact_proposed_order_component",
  "exact_supporting_component",
  "metadata_relationship_missing",
  "source_binary_missing",
  "currentness_unverified",
  "stale/superseded",
  "identity_ambiguous",
  "unsupported",
  "source_not_required",
]);
const exactOutcomes = new Set([
  "exact_required_component",
  "exact_optional_component",
  "exact_instruction_component",
  "exact_proposed_order_component",
  "exact_supporting_component",
]);

const readJson = (path) => JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"));
const readGitJson = (commit, path) => JSON.parse(execFileSync(
  "git",
  ["show", commit + ":" + path],
  { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
));
const stableJson = (value) => JSON.stringify(value, null, 2) + "\n";
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableJson(value));
};
const sha256Buffer = (value) => createHash("sha256").update(value).digest("hex");
const sha256File = (path) => sha256Buffer(readFileSync(path));
const unique = (values) => [...new Set(values)];
const sortedUnique = (values) => unique(values).sort((left, right) => left.localeCompare(right));
const countBy = (values, field) => Object.fromEntries(
  [...values.reduce((result, value) => {
    const key = value[field];
    result.set(key, (result.get(key) ?? 0) + 1);
    return result;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
);
const gitRef = (commit, path, pointer) => commit + ":" + path + (pointer ? "#" + pointer : "");
const mapRef = (trackId, componentId) => gitRef(
  baseCommit,
  mapPath,
  "/tracks[trackId=" + trackId + "]/unresolvedFormRelationships[componentId=" + componentId + "]",
);
const relationshipRef = (trackId, componentId) => gitRef(
  registryCommit,
  relationshipPath,
  "/relationships[trackId=" + trackId + "][componentId=" + componentId + "]",
);
const memoRef = (jurisdiction, trackId) => gitRef(
  registryCommit,
  "data/record-clearing/legal-design-intake/" + jurisdiction + ".memo.json",
  "/tracks[trackId=" + trackId + "]",
);
const authorityRef = (trackId) => gitRef(
  ledgerCommit,
  "data/rcap-ledger/authority-ledger.json",
  "/tracks[trackId=" + trackId + "]",
);

for (const [path, digest] of Object.entries(inputDigests)) {
  assert.equal(sha256File(join(repositoryRoot, path)), digest, "input drift: " + path);
}
assert.equal(
  execFileSync("git", ["rev-parse", baseCommit], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
  baseCommit,
);

const map = readJson(mapPath);
const queue = readJson(queuePath);
const handoff = readJson(handoffPath);
const adoption = readJson(adoptionPath);
const priorTerminalTreatments = readJson(priorTerminalTreatmentPath);
const sourceRelationships = readGitJson(registryCommit, relationshipPath);
const zeroFamilyTracks = map.tracks.filter((track) => track.requiredFamilyIds.length === 0);
const zeroTrackIds = new Set(zeroFamilyTracks.map((track) => track.trackId));
const queueByTrackId = new Map(queue.tracks.map((track) => [track.trackId, track]));
const technicalByFamilyId = new Map(
  handoff.families.map((family) => [family.familyId, family.finalDisposition]),
);
const adoptionByTrackId = new Map(adoption.tracks.map((track) => [track.trackId, track]));
const relationshipRows = zeroFamilyTracks.flatMap((track) => track.unresolvedFormRelationships.map(
  (row) => ({ ...row, jurisdiction: track.jurisdiction, trackId: track.trackId }),
));
const relationshipByComponentId = new Map(
  sourceRelationships.relationships
    .filter((row) => zeroTrackIds.has(row.trackId))
    .map((row) => [row.componentId, row]),
);
const rowByComponentId = new Map(relationshipRows.map((row) => [row.componentId, row]));

assert.equal(map.scope.tracksDerived, 67);
assert.equal(zeroFamilyTracks.length, 25);
assert.equal(adoption.tracks.length, 67);
assert.equal(new Set(zeroFamilyTracks.map((track) => track.trackId)).size, 25);
assert.equal(relationshipRows.length, 62);
assert.equal(new Set(relationshipRows.map((row) => row.componentId)).size, 62);
assert.equal(relationshipByComponentId.size, 59);
for (const componentId of relationshipByComponentId.keys()) {
  assert(rowByComponentId.has(componentId), "pinned component absent from map: " + componentId);
}
const supplementalRows = relationshipRows.filter((row) => !relationshipByComponentId.has(row.componentId));
assert.deepEqual(
  supplementalRows.map((row) => row.componentId).sort(),
  [
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0500",
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0600",
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0700",
  ],
);

const treatmentCorpusPaths = treatmentCorpusDirectories.flatMap((directory) =>
  readdirSync(join(repositoryRoot, directory))
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(directory, name))
).sort();
const treatmentCorpusManifest = treatmentCorpusPaths.map((path) => ({
  path,
  sha256: sha256File(join(repositoryRoot, path)),
}));
assert.equal(treatmentCorpusPaths.length, 36);
assert.equal(sha256Buffer(JSON.stringify(treatmentCorpusManifest)), treatmentCorpusDigest);
const treatmentCorpusTrackIdValues = [];
const collectTrackIds = (value) => {
  if (Array.isArray(value)) {
    value.forEach(collectTrackIds);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.trackId === "string") treatmentCorpusTrackIdValues.push(value.trackId);
  Object.values(value).forEach(collectTrackIds);
};
treatmentCorpusPaths.forEach((path) => collectTrackIds(readJson(path)));
const treatmentCorpusDistinctTrackIds = sortedUnique(treatmentCorpusTrackIdValues);
const treatmentCorpusIntersection = treatmentCorpusDistinctTrackIds.filter((trackId) => zeroTrackIds.has(trackId));
assert.equal(treatmentCorpusDistinctTrackIds.length, 76);
assert.deepEqual(treatmentCorpusIntersection, []);
const priorTreatmentByTrackId = new Map(
  priorTerminalTreatments.candidates.map((candidate) => [candidate.trackId, candidate]),
);
assert(zeroFamilyTracks.every((track) => {
  const candidate = priorTreatmentByTrackId.get(track.trackId);
  return candidate && candidate.terminal === false &&
    candidate.proposedTerminalProductTreatment === "held_on_source_or_design";
}));

const familyDefinitions = {
  "AR:ar-acic-petition-to-seal-under-community-punishment-act-531-and-ac-source-gated-": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-petition-to-seal-under-community-punishment-act-531-and-ac-source-gated-/source-record.json",
  },
  "AR:ar-acic-order-to-seal-under-community-punishment-act-531-and-act-1-source-gated-": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-order-to-seal-under-community-punishment-act-531-and-act-1-source-gated-/source-record.json",
  },
  "AR:ar-acic-petition-to-seal-controlled-or-counterfeit-substance-posse-source-gated-": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-petition-to-seal-controlled-or-counterfeit-substance-posse-source-gated-/source-record.json",
  },
  "AR:ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-/source-record.json",
  },
  "AR:ar-acic-order-to-seal-misdemeanors-under-act-1460-source-gated-en": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-order-to-seal-misdemeanors-under-act-1460-source-gated-en/source-record.json",
  },
  "AR:ar-acic-petition-to-seal-nolle-prosequi-dismissal-acquittal-or-no-source-gated-e": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-petition-to-seal-nolle-prosequi-dismissal-acquittal-or-no-source-gated-e/source-record.json",
  },
  "AR:ar-acic-order-to-seal-nolle-prosequi-dismissal-acquittal-or-no-cha-source-gated-": {
    commit: laneCommits.D1A,
    path: "data/rcap-all50/overlays/production/arkansas/ar-acic-order-to-seal-nolle-prosequi-dismissal-acquittal-or-no-cha-source-gated-/source-record.json",
  },
  "AZ:aoccrem2f-071221-source-gated-en": {
    commit: laneCommits.D2A,
    path: "data/rcap-all50/overlays/production/arizona/aoccrem2f-071221-source-gated-en/source-record.json",
  },
  "AZ:aoccrem3f-071221-source-gated-en": {
    commit: laneCommits.D2A,
    path: "data/rcap-all50/overlays/production/arizona/aoccrem3f-071221-source-gated-en/source-record.json",
  },
  "KS:ks-notice-of-hearing-on-petition-for-expungem-source-gated-en": {
    commit: laneCommits.D2A,
    path: "data/rcap-all50/overlays/production/kansas/ks-notice-of-hearing-on-petition-for-expungem-source-gated-en/source-record.json",
  },
  "KS:ks-order-of-expungement-of-conviction-or-dive-source-gated-en": {
    commit: laneCommits.D2A,
    path: "data/rcap-all50/overlays/production/kansas/ks-order-of-expungement-of-conviction-or-dive-source-gated-en/source-record.json",
  },
  "KS:ksjc-source-gated-en": {
    commit: laneCommits.D2A,
    path: "data/rcap-all50/overlays/production/kansas/ksjc-source-gated-en/source-record.json",
  },
  "TX:tx-gc-411-0736-form-petition-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0736-form-petition-en/source-record.json",
  },
  "TX:tx-gc-411-0726-form-petition-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0726-form-petition-en/source-record.json",
  },
  "TX:tx-gc-411-0726-dwi-order-form-order-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0726-dwi-order-form-order-en/source-record.json",
  },
  "TX:tx-gc-411-073-411-0732-form-petition-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-073-411-0732-form-petition-en/source-record.json",
  },
  "TX:tx-gc-411-0725-411-073-411-0735-form-order-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0725-411-073-411-0735-form-order-en/source-record.json",
  },
  "TX:tx-gc-411-0727-form-petition-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0727-form-petition-en/source-record.json",
  },
  "TX:tx-gc-411-0727-form-order-en": {
    commit: laneCommits.D3A,
    path: "data/rcap-all50/overlays/production/texas/tx-gc-411-0727-form-order-en/source-record.json",
  },
};

const familyEvidence = new Map();
for (const [familyId, definition] of Object.entries(familyDefinitions)) {
  const record = readGitJson(definition.commit, definition.path);
  assert.equal(record.sha256VerifiedAgainstBundleManifest, true, familyId);
  assert.equal(record.binaryPresent, true, familyId);
  assert(technicalByFamilyId.has(familyId), "family absent from final handoff: " + familyId);
  familyEvidence.set(familyId, {
    familyId,
    documentId: record.documentId,
    officialTitle: record.officialTitle,
    documentRole: record.documentRole,
    revision: record.revision,
    sourceSha256: record.sha256,
    byteLength: record.byteLength,
    sourceStatus: record.sourceStatus,
    freshnessStatus: record.freshnessStatus,
    technicalDisposition: technicalByFamilyId.get(familyId),
    generationAllowed: record.generationAllowed,
    sourcePack: record.sourcePack,
    evidence: [
      gitRef(definition.commit, definition.path),
      gitRef(
        definition.commit,
        "data/rcap-all50/overlays/production/" +
          definition.path.split("/production/")[1].split("/")[0] +
          "/state-index.json",
      ),
      gitRef(baseCommit, handoffPath, "/families[familyId=" + familyId + "]"),
      gitRef(currentManifestCommit, "docs/record-clearing/d-wave/corrected-review-manifest.json", "/families[familyId=" + familyId + "]"),
    ],
  });
}

const specifications = new Map();
const addExact = (
  componentId,
  relationshipOutcome,
  familyId,
  identityBasis,
  extraEvidence = [],
  exactConfiguration = {},
) => {
  assert(rowByComponentId.has(componentId), componentId);
  assert(exactOutcomes.has(relationshipOutcome), relationshipOutcome);
  assert(familyEvidence.has(familyId), familyId);
  specifications.set(componentId, {
    relationshipOutcome,
    familyId,
    identityBasis,
    evidence: extraEvidence,
    ...exactConfiguration,
  });
};
const addUnresolved = (componentIds, configuration) => {
  for (const componentId of componentIds) {
    assert(rowByComponentId.has(componentId), componentId);
    assert(!specifications.has(componentId), "duplicate spec: " + componentId);
    assert(allowedOutcomes.has(configuration.relationshipOutcome));
    assert(!exactOutcomes.has(configuration.relationshipOutcome));
    specifications.set(componentId, { ...configuration });
  }
};

const arIdentityEvidence = gitRef(
  registryCommit,
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-in-repo-identity-reconciliation-acic.json",
);
const arDownloadEvidence = gitRef(
  registryCommit,
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-public-official-download-acic-gaps.json",
);
addExact(
  "ar-act531-primary-filing-1",
  "exact_required_component",
  "AR:ar-acic-petition-to-seal-under-community-punishment-act-531-and-ac-source-gated-",
  "The ACIC issuer, petition role, Act 531/Act 1460 remedy, exact official title, revision and release-verified source digest jointly identify the pinned alias; this is not a state/name-only match.",
  [arIdentityEvidence],
);
addExact(
  "ar-act531-proposed-order-2",
  "exact_proposed_order_component",
  "AR:ar-acic-order-to-seal-under-community-punishment-act-531-and-act-1-source-gated-",
  "The ACIC issuer, companion-order role, Act 531/Act 1460 remedy, exact official title, revision and release-verified digest jointly identify the pinned alias.",
  [arIdentityEvidence],
);
addExact(
  "ar-cs-possession-seal-primary-filing-1",
  "exact_required_component",
  "AR:ar-acic-petition-to-seal-controlled-or-counterfeit-substance-posse-source-gated-",
  "The pinned component note and source record name the same ACIC petition for a controlled- or counterfeit-substance possession conviction, with a unique petition role and verified revision/digest.",
  [arIdentityEvidence],
);
addExact(
  "ar-cs-possession-seal-proposed-order-2",
  "exact_proposed_order_component",
  "AR:ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-",
  "The pinned component and source record name the same ACIC companion order for the controlled-substance-possession route, with a unique order role and verified revision/digest.",
  [arIdentityEvidence],
);
addExact(
  "ar-misdemeanor-seal-proposed-order-2",
  "exact_proposed_order_component",
  "AR:ar-acic-order-to-seal-misdemeanors-under-act-1460-source-gated-en",
  "The repository identity-reconciliation record expressly maps ACIC-UNIFORM-ORDER-TO-SEAL on ar-misdemeanor-seal to the retained misdemeanor half, revision 2019-08-01 and digest 4d6bc578..., and the D family uses those exact bytes.",
  [arIdentityEvidence],
);
addExact(
  "ar-nonconviction-seal-primary-filing-1",
  "exact_required_component",
  "AR:ar-acic-petition-to-seal-nolle-prosequi-dismissal-acquittal-or-no-source-gated-e",
  "The legal-design note expands NONCONVICTION to nolle prosequi, dismissal, acquittal or no charge; the ACIC petition source record carries that exact disposition set, petition role, revision and verified digest.",
  [arIdentityEvidence],
);
addExact(
  "ar-nonconviction-seal-proposed-order-2",
  "exact_proposed_order_component",
  "AR:ar-acic-order-to-seal-nolle-prosequi-dismissal-acquittal-or-no-cha-source-gated-",
  "The legal-design note and ACIC source record carry the same nonconviction disposition set and companion-order role; revision 2023-10-25 and the release digest corroborate identity.",
  [arIdentityEvidence],
);

addExact(
  "az_marijuana_expungement_limited_jurisdiction-primary-filing-1",
  "exact_required_component",
  "AZ:aoccrem2f-071221-source-gated-en",
  "AOC-CREM2F-071221 and AOCCREM2F-071221 differ only by separator normalization. The unique AOC form number, limited-jurisdiction court role, official title, three-page source, and digest identify the same petition.",
  [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-az-public-official-download.json"),
  ],
);
addExact(
  "az_marijuana_expungement_superior_court-primary-filing-1",
  "exact_required_component",
  "AZ:aoccrem3f-071221-source-gated-en",
  "AOC-CREM3F-071221 and AOCCREM3F-071221 differ only by separator normalization. The unique AOC form number, superior-court role, official title, three-page source, and digest identify the same petition.",
  [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-az-public-official-download.json"),
  ],
);

addExact(
  "ks-21-6614-diversion-notice-3",
  "exact_supporting_component",
  "KS:ks-notice-of-hearing-on-petition-for-expungem-source-gated-en",
  "The retained binary is the Kansas Judicial Council Notice of Hearing on Petition for Expungement, revision 12-2016. Its exact filename, title, revision and digest identify the notice independently of the canonical relationship table's cross-applied petition SHA.",
  [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/source/allFolderFiles[fileName=Notice of Hearing on Petition for Expungement of Conviction or Diversion 122016.pdf][sha256=a960c857ec505a3013e725526718580ad2047aa9b3dd85191a70b8375cc83ffd]")],
  {
    canonicalRelationshipShaDefect: "cross_applied_petition_sha",
    edgeImportPrerequisites: ["Correct this component pin from petition sha256 1113f7b6... to notice sha256 a960c857... in the captain-owned relationship table before importing the family edge."],
  },
);
addExact(
  "ks-21-6614-diversion-cover-sheet-4",
  "exact_supporting_component",
  "KS:ks-order-of-expungement-of-conviction-or-dive-source-gated-en",
  "The compiled profile identifies Order of Expungement of Conviction or Diversion Cover Sheet 122016.pdf at digest d4171396...; that digest joins the exact filename to the D family whose source-record title is truncated to the parent order. This evidence is independent of the canonical table's cross-applied petition SHA.",
  [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/source/allFolderFiles[fileName=Order of Expungement of Conviction or Diversion Cover Sheet 122016.pdf][sha256=d4171396d12f55a50d6c4e0d5a3b694ad982325e7377d74deaa5839d3bfad537]")],
  {
    canonicalRelationshipShaDefect: "cross_applied_petition_sha",
    edgeImportPrerequisites: ["Correct this component pin from petition sha256 1113f7b6... to cover-sheet sha256 d4171396... in the captain-owned relationship table before importing the family edge."],
  },
);
addExact(
  "ks-21-6614-diversion-proposed-order-5",
  "exact_proposed_order_component",
  "KS:ksjc-source-gated-en",
  "The source record gives the exact title Order for Expungement of Conviction or Diversion, revision 2022-08, court-order role and verified digest; KSJC is the family metadata shorthand. The family identity is independent of the canonical table's cross-applied petition SHA.",
  [
    gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/source/references[fileName=Petition for Expungement of Conviction or Diversion 82022.pdf][sha256=1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c]"),
  ],
  {
    canonicalRelationshipShaDefect: "cross_applied_petition_sha",
    edgeImportPrerequisites: ["Correct this component pin from petition sha256 1113f7b6... to proposed-order sha256 104c4018... in the captain-owned relationship table before importing the family edge."],
  },
);

const txExactEvidence = [memoRef("TX", "tx_nd_dwi_deferred")];
addExact(
  "tx_nd_dwi_conviction-petition-1",
  "exact_required_component",
  "TX:tx-gc-411-0736-form-petition-en",
  "The OCA URL, Gov't Code section 411.0736, petition role, revision 2022-02 and source digest match exactly.",
  txExactEvidence,
);
addExact(
  "tx_nd_dwi_deferred-petition-1",
  "exact_required_component",
  "TX:tx-gc-411-0726-form-petition-en",
  "The OCA URL, Gov't Code section 411.0726, petition role, revision 2022-02 and source digest match exactly.",
  txExactEvidence,
);
addExact(
  "tx_nd_dwi_deferred-proposed-order-2",
  "exact_proposed_order_component",
  "TX:tx-gc-411-0726-dwi-order-form-order-en",
  "The relationship's pinned OCA URL selects the DWI, not BWI, order under section 411.0726. The sibling 411.0726 petition source record records that same DWI URL, while the family DWI documentId/title, order role, revision and digest distinguish the exact branch; the order source record itself has no sourceUrl.",
  [
    ...txExactEvidence,
    gitRef(laneCommits.D3A, "data/rcap-all50/overlays/production/texas/tx-gc-411-0726-form-petition-en/source-record.json", "/sourceUrl"),
  ],
);
addExact(
  "tx_nd_probation_misdemeanor-petition-1",
  "exact_required_component",
  "TX:tx-gc-411-073-411-0732-form-petition-en",
  "The OCA publishes one petition covering sections 411.073 through 411.0732; the exact pinned URL, section coverage, role, revision and digest support the 411.073 edge.",
  [memoRef("TX", "tx_nd_probation_misdemeanor")],
);
addExact(
  "tx_nd_probation_misdemeanor-proposed-order-2",
  "exact_proposed_order_component",
  "TX:tx-gc-411-0725-411-073-411-0735-form-order-en",
  "The pinned OCA URL names the shared order for sections 411.0725, 411.073 or 411.0735; the family carries that exact section set, order role, revision and digest.",
  [memoRef("TX", "tx_nd_probation_misdemeanor")],
);
addExact(
  "tx_nd_veterans_court-petition-1",
  "exact_required_component",
  "TX:tx-gc-411-0727-form-petition-en",
  "The OCA URL, section 411.0727, veterans-court remedy, petition role, revision and digest match exactly.",
  [memoRef("TX", "tx_nd_veterans_court")],
);
addExact(
  "tx_nd_veterans_court-proposed-order-2",
  "exact_proposed_order_component",
  "TX:tx-gc-411-0727-form-order-en",
  "The OCA URL, section 411.0727, veterans-court remedy, proposed-order role, revision and digest match exactly.",
  [memoRef("TX", "tx_nd_veterans_court")],
);

addUnresolved(["al-pardon-primary-filing-1"], {
  relationshipOutcome: "identity_ambiguous",
  exactMissingEvidence: "Issuer-currentness evidence selecting exactly one of three live official ABPP-3 variants; a printed revision for the unmarked four-page candidate; and resolution of the charges-versus-convictions and ABPP-3/ABPP-5 overlap.",
  ownerJobId: "DREL-AL-ABPP3-IDENTITY",
  nextExecutableAction: "Use one rendered Bureau forms-index session or a written Bureau response to select the current ABPP-3; record its printed revision and digest, resolve the ABPP-5 overlap, then retain/build/link only that edition.",
  evidence: [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-al-public-official-download.json"),
  ],
});

addUnresolved(["ar-misdemeanor-seal-primary-filing-1"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/source record and canonical edge for the already identified live ACIC misdemeanor petition, printed revision 2023-10-25, sha256 63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23.",
  ownerJobId: "DREL-AR-EDGE-MATERIALIZATION",
  nextExecutableAction: "Materialize the byte-identical official ACIC petition as a D1A family, render/review it, and bind ACIC-UNIFORM-PETITION-TO-SEAL to that family using the committed identity receipt.",
  evidence: [arIdentityEvidence, arDownloadEvidence],
});

addUnresolved(
  [
    "az_certificate_second_chance-primary-filing-1",
    "az_certificate_second_chance-proposed-order-2",
  ],
  {
    relationshipOutcome: "identity_ambiguous",
    exactMissingEvidence: "A committed successor/equivalence chain from pinned AOCCRSA3F/AOCCRSA4F revision 010122 to retained revision 103023, including whether the post-2024-rule legal effect and participant-visible text are unchanged.",
    ownerJobId: "DREL-AZ-FORM-IDENTITY",
    nextExecutableAction: "Verify the current issuer revisions and successor chain on the Arizona AOC forms index; then either re-pin the track to proven-current 103023 families or ingest the exact 010122 editions. Do not alias on title alone.",
    evidence: [
      gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/arizona/state-index.json"),
      memoRef("AZ", "az_certificate_second_chance"),
    ],
  },
);
addUnresolved(["az_marijuana_expungement_limited_jurisdiction-continuation-2"], {
  relationshipOutcome: "source_not_required",
  exactMissingEvidence: "No source binary is missing. The missing repository action is a committed component remap retiring the invented -CONT identity and representing the issuer-required separate petition per offence as repetition of the parent CREM2F form.",
  ownerJobId: "DREL-AZ-FORM-IDENTITY",
  nextExecutableAction: "Remove the phantom continuation relationship in the owning legal-design metadata and model one CREM2F instance per offence/case number; never substitute CREM3F, CREM4F, or a custom continuation.",
  evidence: [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-az-not-required-design-reconciliation.json", "/resolvedIdentities[assignedDocumentId=AOC-CREM2F-071221-CONT]"),
  ],
});

addUnresolved(["fl-expunction-primary-filing-1"], {
  relationshipOutcome: "stale/superseded",
  exactMissingEvidence: "A materialized D source/family for current FDLE 40-021 revision June 2021, Ref-14423, sha256 7a3647f5ae134c3e9ad62a8dd177805314738ed23985309728b57bbcd79b8ee8. The current D family is the superseded October 2019 revision.",
  ownerJobId: "DREL-FL-SOURCE-AND-RULE-TEXT",
  nextExecutableAction: "Materialize the measured Ref-14423 bytes in the next source edition, replace the stale 2019 D source, rerender/review, and bind the expunction track to the new family while preserving the commercial-use gate.",
  evidence: [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-fl-public-official-download-fdle-fac-supersession.json"),
    gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/florida/fdle40-021-expunction-en/source-record.json"),
  ],
});
addUnresolved(
  [
    "fl-expunction-primary-filing-2",
    "fl-expunction-affidavit-3",
    "fl-expunction-proposed-order-4",
  ],
  {
    relationshipOutcome: "source_not_required",
    exactMissingEvidence: "No standalone official PDF exists. Missing evidence is a committed legal-design/component remap to exact promulgated Rule 3.989 subdivisions and a reviewed participant output preserving the rule text; the ORDER identity must be split to expunction subdivision (b), not sealing subdivision (c).",
    ownerJobId: "DREL-FL-SOURCE-AND-RULE-TEXT",
    nextExecutableAction: "Reclassify the petition, sworn statement, and expunction order from phantom official-PDF acquisitions to Rule 3.989(d), (a), and (b) authority-text components; implement exact participant-visible text and send only that substantive output for counsel review.",
    evidence: [
      gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-fl-public-official-download.json"),
      gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-fl-rule-3-989-sworn-statement-identity-currentness.json"),
    ],
  },
);

addUnresolved(
  ["ia-dci77-primary-filing-1", "ia-dci77-attachment-2"],
  {
    relationshipOutcome: "metadata_relationship_missing",
    exactMissingEvidence: "A D family/receipt and page-scoped edges for the retained three-page combined DCI-76/DCI-77 packet, revision 9/22/21, sha256 321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516; DCI-76 is page 1 and DCI-77 occupies the remaining pages.",
    ownerJobId: "DREL-IA-COMBINED-PACKET",
    nextExecutableAction: "Apply the committed component-remap decision, create one combined-packet source receipt/family, pin the same digest with distinct page scopes to both components, render/review once, and add both edges.",
    evidence: [
      gitRef(registryCommit, "data/record-clearing/production-factory/legal-design-decisions/rcap-ia-rule-2-86-and-dci-76-component-remap.json"),
    ],
  },
);

addUnresolved(
  [
    "ks-21-6614-diversion-cover-sheet-1",
    "ks-22-2410-arrest-cover-sheet-1",
  ],
  {
    relationshipOutcome: "identity_ambiguous",
    exactMissingEvidence: "A reconciled form identity/revision. The pinned ID asserts 10/14/2025, the retained file is named Criminal Cover Sheet 102025.pdf with sha256 6384f934..., and three issuer pages identify the published form as 12-2014; no committed evidence joins those claims.",
    ownerJobId: "DREL-KS-FORM-SET",
    nextExecutableAction: "Resolve the 2025-versus-2014 revision conflict through an attended issuer retrieval or written Council confirmation, record the authorized-use position, and then build one exact cover-sheet family reusable on both tracks only if the digest/revision matches.",
    evidence: [
      gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-ks-source-identity-resolution-criminal-cover-sheet.json"),
      gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/packetGenerator/formInventory"),
    ],
  },
);
addUnresolved(["ks-21-6614-diversion-primary-filing-2"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/source receipt and edge for the retained Kansas Judicial Council Petition for Expungement of Conviction or Diversion 82022.pdf, sha256 1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c. The binary is present; it is not a source-acquisition gap.",
  ownerJobId: "DREL-KS-FORM-SET",
  nextExecutableAction: "Materialize the retained 08-2022 petition from its compiled-profile digest, create/review the D family, and bind this primary-filing component; separately preserve the Council authorized-use gate.",
  evidence: [
    gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/source/references[fileName=Petition for Expungement of Conviction or Diversion 82022.pdf][sha256=1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c]"),
  ],
});
addUnresolved(["ks-21-6614-diversion-proposed-order-6"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/source record and edge for retained Order Denying Expungement of Conviction or Diversion 122016.pdf, sha256 b29254fb58433d496041c185fc69ec864ba1beff1e5e9722738c3b1ebedfe2ba.",
  ownerJobId: "DREL-KS-FORM-SET",
  nextExecutableAction: "Materialize the retained exact order-denying source into the D family corpus, preserve court-only findings/signature ownership, render/review, and add the proposed-order edge.",
  evidence: [
    gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/KS-kansas.json", "/packetGenerator/formInventory"),
    gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/kansas/state-index.json", "/statePackFidelity"),
  ],
});
addUnresolved(["ks-22-2410-arrest-primary-filing-2"], {
  relationshipOutcome: "currentness_unverified",
  exactMissingEvidence: "Issuer confirmation that the February 2013 arrest-record petition remains current after the 2025 K.S.A. 22-2410 amendments, or a newer issuer revision with digest and legal-effect comparison.",
  ownerJobId: "DREL-KS-FORM-SET",
  nextExecutableAction: "Use an authorized attended Council retrieval or written issuer response to identify the current arrest petition; compare the mandatory-expungement and fee language changed in 2025, then retain/build/link only the current revision.",
  evidence: [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-ks-form-currentness-verification.json"),
  ],
});
addUnresolved(["ks-22-2410-arrest-cover-sheet-3"], {
  relationshipOutcome: "source_binary_missing",
  missingAssetKey: "KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
  exactMissingEvidence: "The exact Kansas Judicial Council Order of Expungement of Arrest Record Cover Sheet, revision 12-2016, has no retained binary/digest or D family.",
  ownerJobId: "DREL-KS-FORM-SET",
  nextExecutableAction: "Perform an authorized attended retrieval, capture revision/digest and permitted-use evidence, materialize the exact cover sheet, then build/review/link it.",
  evidence: [
    gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/kansas/state-index.json", "/statePackFidelity"),
  ],
});

addUnresolved(["ky_expungement_certification-primary-filing-1"], {
  relationshipOutcome: "identity_ambiguous",
  exactMissingEvidence: "A face/digest comparison proving whether participant request form AOC-RU-009 is related to D family AOC-009. The latter is recorded as an ORDER titled RECORDS UNIT with unknown revision, which is insufficient to equate the identities.",
  ownerJobId: "DREL-KY-IDENTITY-SCOPE",
  nextExecutableAction: "Retrieve current RU-009 from Kentucky Courts, inspect role/form number/revision, hash it, and either build a new participant-request family or publish an exact identity receipt before adding an edge.",
  evidence: [
    gitRef("994e976d", "data/rcap-all50/overlays/production/kentucky/aoc-009-form-en/source-record.json"),
  ],
});
addUnresolved(["ky_protective_order_record_expungement-primary-filing-1"], {
  relationshipOutcome: "source_binary_missing",
  missingAssetKey: "KY-AOC-275.18",
  exactMissingEvidence: "A Roger product-scope decision plus, if retained, the current official AOC-275.18 binary with revision/digest and a D family. No current retained source exists.",
  ownerJobId: "DREL-KY-IDENTITY-SCOPE",
  decisionDependency: {
    decisionOwner: "Roger",
    decision: "Retain this protective-order record mechanism in RCAP product scope or record a deliberate owner-approved exclusion.",
    executionOwnerIfRetained: "Kentucky source-acquisition owner and D1B implementation owner",
  },
  nextExecutableAction: "Roger first decides whether civil protective-order records remain in RCAP scope. If retained, source acquisition retrieves/hashes AOC-275.18 and D1B builds/reviews/links it; if excluded, the owner records an explicit deliberate-scope decision rather than inferring one here.",
  evidence: [
    memoRef("KY", "ky_protective_order_record_expungement"),
    authorityRef("ky_protective_order_record_expungement"),
  ],
});

addUnresolved(["la-987-set-aside-and-dismiss-primary-filing-1"], {
  relationshipOutcome: "identity_ambiguous",
  exactMissingEvidence: "A canonical participant filing vehicle and component set under Articles 986/987. The retained material is generic browser-print statute HTML, while the mandatory Article 986 forms are absent; statute text is not proven to be the filing form.",
  ownerJobId: "DREL-LA-FILING-VEHICLE",
  nextExecutableAction: "The Louisiana legal-design/source-identity owner identifies the issuer-prescribed Art. 986/987 motion, rule-to-show-cause and order vehicle, records exact roles/form identities, and then source acquisition retains/builds those forms. Do not map the HTML capture as a packet form.",
  evidence: [
    authorityRef("la-987-set-aside-and-dismiss"),
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-la-arts-993-995-998-html-source-output-strategy-adjudication.json"),
  ],
});

addUnresolved(["ma-seal-decrim-primary-filing-1"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D3B family/source record and track edge for the retained official fillable OCP Petition to Seal, sha256 416f9a1d8e4775a24fe3c11ba5e3893b1c8b65dde81e80e9f2d4ed5b81bb376e, scoped to Part A box 4. No face revision may be invented.",
  ownerJobId: "DREL-MA-OCP-MATERIALIZATION",
  nextExecutableAction: "Materialize the pinned official digest as an unversioned/currentness-tracked family, build the Part A box 4 field map, render/review, and add the exact track edge without fabricating a revision.",
  evidence: [
    gitRef(registryCommit, "data/record-clearing/production-factory/source-acquisition/rcap-ma-public-official-download-ocp-petition-to-seal.json"),
    gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json", "/packetGenerator/formInventory"),
  ],
});

addUnresolved(
  [
    "nd-nonconviction-close-petition-primary-filing-1",
    "nd-nonconviction-close-petition-proposed-order-2",
    "nd-nonconviction-close-petition-instructions-3",
  ],
  {
    relationshipOutcome: "stale/superseded",
    exactMissingEvidence: "The complete official Rev Apr 2026 Close Nonconviction Records bundle with digest and page scopes. The only D family retains the superseded REV-2025-08-01 six-page packet.",
    ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
    nextExecutableAction: "Acquire/hash/materialize the full April 2026 bundle, document petition/order/instruction page scopes, replace the stale D source, rerender/review, and bind all three components to the current packet family.",
    evidence: [
      authorityRef("nd-nonconviction-close-petition"),
      gitRef(laneCommits.D3A, "data/rcap-all50/overlays/production/north-dakota/expertise-form-instructions-en/source-record.json"),
    ],
  },
);
addUnresolved(["nd-prohibit-remote-public-access-primary-filing-1"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/edge for retained Motion to Prohibit Public Access, sha256 0326913ada876838b1f9a294cb0d1fe1d2446f46f7d4f878bd2e110f56b9b2b8.",
  ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
  nextExecutableAction: "Materialize the exact retained motion as a D3A family, render/review, bind it to the primary filing, and preserve the official non-guaranteed-acceptance disclosure.",
  evidence: [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json", "/packetGenerator/formInventory")],
});
addUnresolved(["nd-prohibit-remote-public-access-supporting-brief-and-declaration-2"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "D families/page ordering for retained Brief in Support sha256 44bf8283ac6b042689843335e37d64cf632c647f4f606036eeb412bded7387b4 and Declaration in Support sha256 af76c52d1f9aa8b2e986fbd719655c8e3a1f1b8158f5f606d4a6da25d3465e5b.",
  ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
  nextExecutableAction: "Materialize both exact supporting documents, preserve participant-owned grounds and no automated legal argument, render/review, and bind the composite supporting component to both ordered families.",
  evidence: [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json", "/packetGenerator/formInventory")],
});
addUnresolved(["nd-prohibit-remote-public-access-proposed-findings-3"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/edge for retained Findings, Conclusions and Order, sha256 47dafce1f10f1972d505e6d988ee05c74421c93be02cddcbb26f15312bfb8d2d.",
  ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
  nextExecutableAction: "Materialize the exact proposed-findings source, enforce court-only findings/signature ownership, render/review, and add the proposed-order edge.",
  evidence: [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json", "/packetGenerator/formInventory")],
});
addUnresolved(["nd-prohibit-remote-public-access-proof-of-service-4"], {
  relationshipOutcome: "metadata_relationship_missing",
  exactMissingEvidence: "A D family/edge for retained Affidavit/Declaration of Service by Mail, sha256 9070a339facab5a2c2a15a453ab468dfdf915a531f798c5d02b14c2a2864fe23.",
  ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
  nextExecutableAction: "Materialize the exact service document, reconcile the affidavit-versus-declaration display label without changing its legal role, render/review, and add the proof-of-service edge.",
  evidence: [gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json", "/packetGenerator/formInventory")],
});
addUnresolved(["nd-regular-pardon-primary-filing-1"], {
  relationshipOutcome: "source_binary_missing",
  missingAssetKey: "ND-SFN-14859",
  exactMissingEvidence: "The current official SFN 14859 pardon application binary, revision and digest. D3A's similarly titled source is SFN 61663 for marijuana pardons and cannot be substituted.",
  ownerJobId: "DREL-ND-SOURCE-MATERIALIZATION",
  nextExecutableAction: "Acquire current SFN 14859 from the Pardon Advisory Board, verify the printed form number/revision, hash/materialize it, then build/review/link a distinct regular-pardon family.",
  evidence: [
    authorityRef("nd-regular-pardon"),
    gitRef(laneCommits.D3A, "data/rcap-all50/overlays/production/north-dakota/nd-north-dakota-pardon-advisory-board-applica-support-instructions-en/source-record.json"),
  ],
});

addUnresolved(["tx_nd_dwi_conviction-proposed-order-2"], {
  relationshipOutcome: "source_binary_missing",
  missingAssetKey: "TX-OCA-411.0736-ORDER",
  exactMissingEvidence: "The exact OCA Model Order of Nondisclosure under section 411.0736 from the pinned official URL, with retained digest/source record and D family.",
  ownerJobId: "DREL-TX-COMPONENT-COMPLETION",
  nextExecutableAction: "Acquire/hash the exact 411.0736 order, build it as a court-order family with protected findings/signature fields, render/review, and add the edge.",
  evidence: [memoRef("TX", "tx_nd_dwi_conviction")],
});
addUnresolved(
  [
    "tx_nd_dwi_conviction-fee-waiver-statement-4",
    "tx_nd_dwi_deferred-fee-waiver-statement-4",
    "tx_nd_probation_misdemeanor-fee-waiver-statement-4",
    "tx_nd_veterans_court-fee-waiver-statement-4",
  ],
  {
    relationshipOutcome: "source_binary_missing",
    missingAssetKey: "TX-STATEWIDE-BILINGUAL-FEE-WAIVER",
    exactMissingEvidence: "One retained source/family for the Supreme Court of Texas bilingual Statement of Inability to Afford Payment of Court Costs or an Appeal Bond at the shared pinned URL. The four-track reuse is supported by each track's legal-design component.",
    ownerJobId: "DREL-TX-COMPONENT-COMPLETION",
    nextExecutableAction: "Acquire and hash the shared bilingual statewide statement once, build/review one conditional supporting family, and add four explicit track edges; never substitute CR-63.",
    evidence: [
      memoRef("TX", "tx_nd_dwi_conviction"),
      memoRef("TX", "tx_nd_dwi_deferred"),
      memoRef("TX", "tx_nd_probation_misdemeanor"),
      memoRef("TX", "tx_nd_veterans_court"),
    ],
  },
);

addUnresolved(
  ["ut_pet_remove_link-motion-1", "ut_pet_remove_link-motion-commissioner-track-2"],
  {
    relationshipOutcome: "identity_ambiguous",
    exactMissingEvidence: "A deterministic route predicate identifying when a Utah district/case category uses judge form 1501CR versus commissioner form 1501CR-C, followed by current digest evidence for both selected variants.",
    ownerJobId: "DREL-UT-ROUTE-FORM-SET",
    nextExecutableAction: "The Utah route/legal-design owner records the commissioner-selection rule; source acquisition then retrieves/hashes the current 1501CR variants and D3B builds only the exact conditional edges.",
    evidence: [authorityRef("ut_pet_remove_link"), memoRef("UT", "ut_pet_remove_link")],
  },
);
addUnresolved(["ut_pet_remove_link-proposed-order-3"], {
  relationshipOutcome: "source_binary_missing",
  missingAssetKey: "UT-1502CR",
  exactMissingEvidence: "The current official 1502CR Order on Motion to Remove Link binary, revision and digest; no D3B family or retained compiled-profile source exists.",
  ownerJobId: "DREL-UT-ROUTE-FORM-SET",
  nextExecutableAction: "Retrieve/hash current 1502CR from Utah Courts, materialize it, build a court-owned order family, render/review, and add the proposed-order edge.",
  evidence: [authorityRef("ut_pet_remove_link")],
});
addUnresolved(["ut_pet_remove_link-notice-to-submit-or-notice-of-hearing-4"], {
  relationshipOutcome: "identity_ambiguous",
  exactMissingEvidence: "A condition selecting one exact document identity, 1110GE Notice to Submit or 1111GE Notice of Hearing. The compound '1110GE or 1111GE' value is not a form identity.",
  ownerJobId: "DREL-UT-ROUTE-FORM-SET",
  nextExecutableAction: "Record the post-motion event predicate and exact form ID for each branch, then retrieve/hash/build the required branch documents and add conditional edges.",
  evidence: [authorityRef("ut_pet_remove_link"), memoRef("UT", "ut_pet_remove_link")],
});

addUnresolved(
  [
    "wa_vac_treaty_fishing-primary-filing-1",
    "wa_vac_treaty_fishing-proposed-order-2",
  ],
  {
    relationshipOutcome: "unsupported",
    exactMissingEvidence: "No evidence that generic CrRLJ 09.0100/09.0200 serves the treaty-fishing remedy. The compiled profile and D2A index instead identify CR-09.0500/0600/0700; the authorities conflict.",
    ownerJobId: "DREL-WA-TREATY-FORM-SET",
    nextExecutableAction: "Remove the generic pair from this track in the owning relationship metadata and replace it only after the treaty-specific set is currentness-verified and materialized. Do not accept the generic families.",
    rejectedFamilyIds: ["WA:crrlj-09-0100-form-en", "WA:crrlj-09-0200-form-en"],
    evidence: [
      gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/washington/state-index.json", "/nonPdfSources"),
      gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/WA-washington.json", "/packetGenerator/formInventory"),
    ],
  },
);
addUnresolved(
  [
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0500",
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0600",
    "wa_vac_treaty_fishing-track-specific-source-CR-09.0700",
  ],
  {
    relationshipOutcome: "metadata_relationship_missing",
    exactMissingEvidence: "Currentness-verified D families and canonical edges for the three retained legacy DOC sources CR-09.0500, CR-09.0600 and CR-09.0700. Their exact digests are already pinned, but D2A recorded them only as nonPdfSources.",
    ownerJobId: "DREL-WA-TREATY-FORM-SET",
    nextExecutableAction: "Verify the current Washington Courts editions and local-use warnings, deterministically convert/render each pinned DOC without changing text, create reviewed D families, and bind motion, notice and proposed order explicitly.",
    evidence: [
      gitRef(laneCommits.D2A, "data/rcap-all50/overlays/production/washington/state-index.json", "/nonPdfSources"),
      gitRef(baseCommit, "src/lib/rcap-engine/compiled/profiles/WA-washington.json", "/packetGenerator/formInventory"),
    ],
  },
);

assert.equal(specifications.size, 62);
for (const componentId of rowByComponentId.keys()) {
  assert(specifications.has(componentId), "unclassified component: " + componentId);
}

const componentRole = (row) => {
  const id = row.componentId;
  if (id.includes("proposed-order") || id.endsWith("CR-09.0700")) return "proposed_order";
  if (id.includes("instructions")) return "instructions";
  if (id.includes("continuation")) return "optional_continuation";
  if (
    id.includes("cover-sheet") ||
    id.includes("notice") ||
    id.includes("affidavit") ||
    id.includes("attachment") ||
    id.includes("supporting") ||
    id.includes("proof-of-service") ||
    id.includes("fee-waiver") ||
    id.endsWith("CR-09.0600")
  ) return "supporting";
  return "required_filing";
};

const executionOwnerByJobId = {
  "DREL-AL-ABPP3-IDENTITY": "Alabama source-identity/currentness owner",
  "DREL-AR-EDGE-MATERIALIZATION": "D1A source-materialization and captain relationship-metadata owner",
  "DREL-AZ-FORM-IDENTITY": "Arizona source-identity/currentness and legal-design metadata owners",
  "DREL-FL-SOURCE-AND-RULE-TEXT": "Florida source-edition and authority-text implementation owners",
  "DREL-IA-COMBINED-PACKET": "Iowa legal-design metadata and D3B source-materialization owners",
  "DREL-KS-FORM-SET": "Kansas source identity/currentness/materialization owner, with captain edge import",
  "DREL-KY-IDENTITY-SCOPE": "Kentucky source-identity/acquisition owner and D1B implementation owner",
  "DREL-LA-FILING-VEHICLE": "Louisiana legal-design/source-identity owner",
  "DREL-MA-OCP-MATERIALIZATION": "D3B source-materialization and track-metadata owner",
  "DREL-ND-SOURCE-MATERIALIZATION": "North Dakota source-currentness/materialization and D3A track-metadata owners",
  "DREL-TX-COMPONENT-COMPLETION": "D3A relationship-metadata and Texas source-materialization owners",
  "DREL-UT-ROUTE-FORM-SET": "Utah legal-design route owner and D3B source-materialization owner",
  "DREL-WA-TREATY-FORM-SET": "Washington legal-design relationship steward and D2A non-PDF source-materialization owner",
};
const questionTypeByOutcome = {
  metadata_relationship_missing: "repository_relationship_or_family_materialization",
  source_binary_missing: "source_binary_acquisition",
  currentness_unverified: "source_currentness_verification",
  "stale/superseded": "source_supersession",
  identity_ambiguous: "form_or_route_identity",
  unsupported: "relationship_evidence_conflict",
  source_not_required: "component_model_remap_no_standalone_binary",
};

const componentResolutions = relationshipRows.map((row) => {
  const specification = specifications.get(row.componentId);
  const baseEvidence = [
    mapRef(row.trackId, row.componentId),
    ...(relationshipByComponentId.has(row.componentId)
      ? [relationshipRef(row.trackId, row.componentId), memoRef(row.jurisdiction, row.trackId)]
      : []),
  ];
  if (exactOutcomes.has(specification.relationshipOutcome)) {
    const family = familyEvidence.get(specification.familyId);
    return {
      jurisdiction: row.jurisdiction,
      trackId: row.trackId,
      componentId: row.componentId,
      componentRole: componentRole(row),
      officialFormId: row.officialFormId,
      officialSourceUrl: row.officialSourceUrl,
      relationshipSourceSha256: row.relationshipSourceSha256,
      relationshipOutcome: specification.relationshipOutcome,
      resolutionStatus: "proposed_exact_family_edge",
      familyId: specification.familyId,
      familyEvidence: family,
      identityBasis: specification.identityBasis,
      revisionEvidenceStatus: family.revision === "REV-UNKNOWN"
        ? "unknown_not_claimed_as_verified"
        : "recorded_in_release_verified_source_record",
      canonicalRelationshipShaStatus: row.relationshipSourceSha256 === null
        ? "not_pinned"
        : row.relationshipSourceSha256 === family.sourceSha256
          ? "matches_family_source"
          : "known_cross_applied_sha_defect",
      canonicalRelationshipShaDefect: specification.canonicalRelationshipShaDefect ?? null,
      edgeImportPrerequisites: specification.edgeImportPrerequisites ?? [],
      captainImportReady: (specification.edgeImportPrerequisites ?? []).length === 0,
      canonicalMapModified: false,
      captainAssignmentId: "CAPTAIN-DREL-EXACT-EDGE-IMPORT",
      technicalApprovalIsNotTerminality: true,
      remainingSourceCurrentnessCondition: family.freshnessStatus,
      evidence: sortedUnique([...baseEvidence, ...family.evidence, ...specification.evidence]),
    };
  }
  return {
    jurisdiction: row.jurisdiction,
    trackId: row.trackId,
    componentId: row.componentId,
    componentRole: componentRole(row),
    officialFormId: row.officialFormId,
    officialSourceUrl: row.officialSourceUrl,
    relationshipSourceSha256: row.relationshipSourceSha256,
    relationshipOutcome: specification.relationshipOutcome,
    resolutionStatus: "unresolved_with_executable_owner_job",
    familyId: null,
    exactMissingEvidence: specification.exactMissingEvidence,
    ownerJobId: specification.ownerJobId,
    executionOwner: executionOwnerByJobId[specification.ownerJobId],
    questionType: questionTypeByOutcome[specification.relationshipOutcome],
    sourceNotRequiredMeaning: specification.relationshipOutcome === "source_not_required"
      ? "No standalone source binary exists or is needed for this component identity; a committed component remap and reviewed participant output are still required, and no terminal treatment is authorized."
      : null,
    counselJobCreated: false,
    decisionDependency: specification.decisionDependency ?? null,
    nextExecutableAction: specification.nextExecutableAction,
    missingAssetKey: specification.missingAssetKey ?? null,
    rejectedFamilyIds: specification.rejectedFamilyIds ?? [],
    terminalAlternativeAvailable: false,
    terminal: false,
    terminalAlternativeAssessment: "No committed complete bilingual guidance, exact supported deferral, or deliberate scope exclusion satisfies this track; remain fail-closed while this owner job executes.",
    evidence: sortedUnique([...baseEvidence, authorityRef(row.trackId), ...specification.evidence]),
  };
});

const resolutionsByTrackId = new Map();
for (const resolution of componentResolutions) {
  const values = resolutionsByTrackId.get(resolution.trackId) ?? [];
  values.push(resolution);
  resolutionsByTrackId.set(resolution.trackId, values);
}

const trackResolutions = zeroFamilyTracks.map((track) => {
  const components = resolutionsByTrackId.get(track.trackId);
  const exact = components.filter((row) => exactOutcomes.has(row.relationshipOutcome));
  const unresolved = components.filter((row) => !exactOutcomes.has(row.relationshipOutcome));
  const queueTrack = queueByTrackId.get(track.trackId);
  const adoptionTrack = adoptionByTrackId.get(track.trackId);
  assert(queueTrack);
  assert(adoptionTrack);
  const priorTreatment = priorTreatmentByTrackId.get(track.trackId);
  assert(priorTreatment);
  assert.deepEqual(queueTrack.paymentAndCreditBehavior, {
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    note: "No D track is sellable in this pass. Nothing here makes a route sellable.",
  });
  return {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    legalName: track.legalName,
    canonicalImplementationJobId: track.canonicalImplementationJobId,
    implementationLane: track.implementationLane,
    canonicalRequiredTreatment: track.canonicalRequiredTreatment,
    currentMapRequiredFamilyIds: [],
    proposedExactFamilyIds: sortedUnique(exact.map((row) => row.familyId)),
    relationshipPosture: unresolved.length === 0
      ? "all_component_relationships_exact_but_nonrelationship_gates_remain"
      : exact.length > 0
        ? "partial_exact_relationships_remaining_component_actions"
        : "no_exact_family_relationship_yet",
    exactComponentRelationships: exact.length,
    unresolvedComponentRelationships: unresolved.length,
    componentResolutions: components,
    relationshipRootBlockers: sortedUnique(unresolved.map((row) => row.relationshipOutcome)),
    ownerJobIds: sortedUnique(unresolved.map((row) => row.ownerJobId)),
    canonicalMapModified: false,
    technicalApprovalPromotesTrack: false,
    legalAdoptionContinuity: {
      classification: adoptionTrack.classification,
      finalLegalApprovalIssuedByCodex: adoptionTrack.finalLegalApprovalIssuedByCodex,
      counselJobId: adoptionTrack.counselJobId,
      note: "Adoption continuity neither creates nor repairs a component-to-family relationship.",
      evidence: gitRef(baseCommit, adoptionPath, "/tracks[trackId=" + track.trackId + "]"),
    },
    existingRootBlockerPreserved: track.currentRootBlocker,
    candidateTerminalTreatmentAssessment: {
      completeGuidance: "not_supported",
      exactSupportedDeferral: "not_supported",
      deliberateScopeExclusion: "not_supported",
      result: "none_supported_remain_held_on_source_or_design",
      reason: "No exact track-linked committed treatment supplies substantive English and Spanish plus exact destination, next step, gather list, do-not-file/assume warning, Briefcase handoff, payment prohibition, checkout suppression, and zero packet/partner credit.",
      evidence: [
        gitRef(baseCommit, "data/rcap-codex/d-track-terminalization/terminal-treatment-candidates.json", "/heldFormAssessment"),
        gitRef(baseCommit, priorTerminalTreatmentPath, "/candidates[trackId=" + track.trackId + "]"),
        gitRef(baseCommit, queuePath, "/tracks[trackId=" + track.trackId + "]/paymentAndCreditBehavior"),
        gitRef(ledgerCommit, "data/rcap-ledger/track-terminalization.json", "/jobs[jobId=" + track.canonicalImplementationJobId + "]"),
        ...(track.trackId === "ky_protective_order_record_expungement"
          ? [memoRef("KY", track.trackId), authorityRef(track.trackId)]
          : []),
      ],
      priorCanonicalTreatment: priorTreatment.proposedTerminalProductTreatment,
      priorCanonicalTreatmentTerminal: priorTreatment.terminal,
    },
    paymentAndCreditBehavior: queueTrack.paymentAndCreditBehavior,
    terminal: false,
  };
});

const ownerJobDefinitions = [
  {
    jobId: "DREL-AL-ABPP3-IDENTITY",
    jurisdiction: "AL",
    owner: "Alabama source-identity/currentness owner",
    tracks: ["al-pardon"],
    objective: "Select exactly one current ABPP-3 edition and establish its legal/issuer identity before any family build.",
    humanDecision: "Issuer contact or rendered official-index read; not counsel and not a blanket Roger escalation.",
  },
  {
    jobId: "DREL-AR-EDGE-MATERIALIZATION",
    jurisdiction: "AR",
    owner: "D1A source-materialization and captain relationship-metadata owner",
    tracks: ["ar-act531", "ar-cs-possession-seal", "ar-misdemeanor-seal", "ar-nonconviction-seal"],
    objective: "Import seven exact proposed edges and materialize the one remaining exact live misdemeanor petition.",
    humanDecision: null,
  },
  {
    jobId: "DREL-AZ-FORM-IDENTITY",
    jurisdiction: "AZ",
    owner: "Arizona source-identity/currentness and legal-design metadata owners",
    tracks: [
      "az_certificate_second_chance",
      "az_marijuana_expungement_limited_jurisdiction",
      "az_marijuana_expungement_superior_court",
    ],
    objective: "Resolve the RSA revision chain, import two exact CREM edges, and retire the phantom CREM2F continuation identity.",
    humanDecision: null,
  },
  {
    jobId: "DREL-FL-SOURCE-AND-RULE-TEXT",
    jurisdiction: "FL",
    owner: "Florida source-edition and authority-text implementation owners",
    tracks: ["fl-expunction"],
    objective: "Replace stale FDLE 40-021 and remodel Rule 3.989 forms as exact authority-text components.",
    humanDecision: "Counsel sees only the later substantive participant output, not this metadata/source gap.",
  },
  {
    jobId: "DREL-IA-COMBINED-PACKET",
    jurisdiction: "IA",
    owner: "Iowa legal-design metadata and D3B source-materialization owners",
    tracks: ["ia-dci77"],
    objective: "Apply the committed DCI-76/DCI-77 page-scoped combined-packet remap.",
    humanDecision: null,
  },
  {
    jobId: "DREL-KS-FORM-SET",
    jurisdiction: "KS",
    owner: "Kansas source identity/currentness/materialization owner, with captain edge import",
    tracks: ["ks-21-6614-diversion", "ks-22-2410-arrest"],
    objective: "Correct three cross-applied relationship SHA pins and import their exact diversion edges; resolve cover-sheet identity, materialize the retained diversion petition and denial order, acquire the absent arrest-order cover sheet, and verify arrest-petition currentness.",
    humanDecision: "Authorized-use permission is an issuer/counsel gate; no relationship is inferred from it.",
  },
  {
    jobId: "DREL-KY-IDENTITY-SCOPE",
    jurisdiction: "KY",
    owner: "Kentucky source-identity/acquisition owner and D1B implementation owner",
    tracks: ["ky_expungement_certification", "ky_protective_order_record_expungement"],
    objective: "Resolve RU-009 identity through ordinary source work; separately obtain Roger's protective-order scope decision before acquiring AOC-275.18.",
    humanDecision: "Roger decides only the protective-order scope question; ordinary source work remains with the source owner.",
    decisionOwner: "Roger",
    decisionComponentIds: ["ky_protective_order_record_expungement-primary-filing-1"],
  },
  {
    jobId: "DREL-LA-FILING-VEHICLE",
    jurisdiction: "LA",
    owner: "Louisiana legal-design/source-identity owner",
    tracks: ["la-987-set-aside-and-dismiss"],
    objective: "Identify the canonical Art. 986/987 participant filing vehicle before any binary acquisition.",
    humanDecision: null,
  },
  {
    jobId: "DREL-MA-OCP-MATERIALIZATION",
    jurisdiction: "MA",
    owner: "D3B source-materialization and track-metadata owner",
    tracks: ["ma-seal-decrim"],
    objective: "Build and bind the already retained exact OCP Petition to Seal without inventing a revision.",
    humanDecision: null,
  },
  {
    jobId: "DREL-ND-SOURCE-MATERIALIZATION",
    jurisdiction: "ND",
    owner: "North Dakota source-currentness/materialization and D3A track-metadata owners",
    tracks: ["nd-nonconviction-close-petition", "nd-prohibit-remote-public-access", "nd-regular-pardon"],
    objective: "Replace the stale close-records bundle, materialize four retained remote-access component groups, and acquire SFN 14859.",
    humanDecision: null,
  },
  {
    jobId: "DREL-TX-COMPONENT-COMPLETION",
    jurisdiction: "TX",
    owner: "D3A relationship-metadata and Texas source-materialization owners",
    tracks: [
      "tx_nd_dwi_conviction",
      "tx_nd_dwi_deferred",
      "tx_nd_probation_misdemeanor",
      "tx_nd_veterans_court",
    ],
    objective: "Import seven exact OCA edges and acquire only two unique missing assets: the 411.0736 order and shared bilingual fee-waiver statement.",
    humanDecision: null,
  },
  {
    jobId: "DREL-UT-ROUTE-FORM-SET",
    jurisdiction: "UT",
    owner: "Utah legal-design route owner and D3B source-materialization owner",
    tracks: ["ut_pet_remove_link"],
    objective: "Set the judge/commissioner and notice predicates, then acquire/build the resulting exact form branches.",
    humanDecision: null,
  },
  {
    jobId: "DREL-WA-TREATY-FORM-SET",
    jurisdiction: "WA",
    owner: "Washington legal-design relationship steward and D2A non-PDF source-materialization owner",
    tracks: ["wa_vac_treaty_fishing"],
    objective: "Reject the unsupported generic pair and materialize the three exact treaty-specific legacy DOC sources after currentness verification.",
    humanDecision: null,
  },
];

const unresolvedResolutions = componentResolutions.filter(
  (row) => !exactOutcomes.has(row.relationshipOutcome),
);
const exactResolutions = componentResolutions.filter(
  (row) => exactOutcomes.has(row.relationshipOutcome),
);
const ownerJobs = ownerJobDefinitions.map((definition) => {
  const components = unresolvedResolutions.filter((row) => row.ownerJobId === definition.jobId);
  assert(components.length > 0, "owner job has no components: " + definition.jobId);
  assert(components.every((row) => definition.tracks.includes(row.trackId)));
  return {
    ...definition,
    executionOwner: executionOwnerByJobId[definition.jobId],
    trackCount: definition.tracks.length,
    unresolvedComponentCount: components.length,
    classifications: countBy(components, "relationshipOutcome"),
    componentIds: components.map((row) => row.componentId).sort(),
    nextExecutableActions: sortedUnique(components.map((row) => row.nextExecutableAction)),
    exitEvidence: [
      "Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.",
      "No state/name-only relationship is imported.",
      "Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.",
    ],
    counselRoutingRule: "Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.",
    authorizesCanonicalMutation: false,
    authorizesRuntimeOrPayment: false,
  };
});
assert.equal(ownerJobs.length, 13);
assert.deepEqual(
  sortedUnique(ownerJobs.flatMap((job) => job.componentIds)),
  unresolvedResolutions.map((row) => row.componentId).sort(),
);

const classificationCounts = countBy(componentResolutions, "relationshipOutcome");
const fullyExactTracks = trackResolutions.filter((track) => track.unresolvedComponentRelationships === 0);
const partialExactTracks = trackResolutions.filter(
  (track) => track.exactComponentRelationships > 0 && track.unresolvedComponentRelationships > 0,
);
const stillNoExactTracks = trackResolutions.filter((track) => track.exactComponentRelationships === 0);
const missingAssets = sortedUnique(
  unresolvedResolutions.filter((row) => row.missingAssetKey).map((row) => row.missingAssetKey),
);

assert.equal(exactResolutions.length, 19);
assert.equal(unresolvedResolutions.length, 43);
assert.equal(fullyExactTracks.length, 4);
assert.equal(partialExactTracks.length, 7);
assert.equal(stillNoExactTracks.length, 14);
assert.equal(classificationCounts.metadata_relationship_missing, 13);
assert.equal(classificationCounts.source_binary_missing, 9);
assert.equal(classificationCounts.currentness_unverified, 1);
assert.equal(classificationCounts["stale/superseded"], 4);
assert.equal(classificationCounts.identity_ambiguous, 10);
assert.equal(classificationCounts.unsupported, 2);
assert.equal(classificationCounts.source_not_required, 4);
assert.equal(missingAssets.length, 6);

const relationshipResolution = {
  schemaVersion: "rcap-codex-d-relationship-resolution/v1",
  status: "proposed_relationship_resolution_not_canonical_not_approved",
  base: {
    canonicalIntegrationCommit: baseCommit,
    registryCommit,
    authorityLedgerCommit: ledgerCommit,
    currentManifestCommit,
    inputDigests,
  },
  scope: {
    canonicalDTracks: 67,
    currentNoExactFamilyTracks: 25,
    canonicalPinnedRelationships: 59,
    supplementalTrackSpecificSourceRows: 3,
    relationshipRows: 62,
  },
  method: {
    identityRule: "A state or similar name never creates an edge. Exact edges require a unique combination of issuer/remedy, component role, exact form identity/title, revision or URL, and source SHA/release evidence where available.",
    multipleTrackReuseRule: "A family may serve multiple tracks only where exact repository components bind it on every track. The only unresolved shared-source plan here is the Texas bilingual fee-waiver form, explicitly bound by all four TX legal-design records.",
    currentnessRule: "An exact identity edge does not clear a currentness gate. Stale/superseded and unverified revisions remain separate dispositions.",
    technicalRule: "Technical approval is recorded but never treated as relationship terminality, product terminality, adoption, runtime authorization, or payment authorization.",
    canonicalMutationPerformed: false,
    sourceBinaryCommitted: false,
  },
  summary: {
    proposedExactComponentRelationships: exactResolutions.length,
    proposedExactFamilyEdges: exactResolutions.length,
    captainReadyExactEdges: exactResolutions.filter((row) => row.captainImportReady).length,
    exactEdgesBlockedOnPinCorrection: exactResolutions.filter((row) => !row.captainImportReady).length,
    tracksReceivingAtLeastOneExactFamily: fullyExactTracks.length + partialExactTracks.length,
    tracksWithAllRelationshipRowsExact: fullyExactTracks.length,
    tracksWithPartialExactRelationships: partialExactTracks.length,
    tracksStillWithNoExactFamily: stillNoExactTracks.length,
    unresolvedRelationshipRows: unresolvedResolutions.length,
    classificationCounts,
    uniqueMissingSourceAssets: missingAssets.length,
    ownerJobs: ownerJobs.length,
    completeGuidanceCandidates: 0,
    exactDeferralCandidates: 0,
    deliberateScopeExclusionCandidates: 0,
  },
  captainAssignment: {
    assignmentId: "CAPTAIN-DREL-EXACT-EDGE-IMPORT",
    owner: "D captain / canonical track-map owner",
    proposedEdges: exactResolutions.length,
    action: "Import the 16 captain-ready exact component-to-family edges after verifying this commit. Correct the three cross-applied Kansas relationship SHA pins, then import those three exact edges. Do not import unresolved candidates or clear any independent gate.",
    prerequisites: [
      "Confirm the family source-record commit/path and source SHA still match.",
      "For the three Kansas diversion edges, replace the cross-applied petition SHA with the component family's exact digest before edge import.",
      "Preserve every family currentness/source hold and final technical disposition.",
      "Regenerate the canonical map only in the captain-owned integration lane.",
    ],
    authorizesPromotion: false,
  },
  tracks: trackResolutions,
};

const terminalTreatments = {
  schemaVersion: "rcap-codex-d-relationship-terminal-treatment-candidates/v1",
  status: "no_supported_candidate_all_tracks_remain_fail_closed",
  baseCommit,
  requirementsApplied: {
    specificSupportedReason: true,
    substantiveEnglish: true,
    substantiveSpanish: true,
    exactDestination: true,
    exactNextStep: true,
    whatToGather: true,
    whatNotToFileOrAssume: true,
    briefcaseHandoff: true,
    paymentProhibited: true,
    checkoutSuppressed: true,
    zeroPacketCredit: true,
    zeroPartnerCredit: true,
  },
  summary: {
    assessedTracks: trackResolutions.length,
    completeGuidanceCandidates: 0,
    exactSupportedDeferralCandidates: 0,
    deliberateScopeExclusionCandidates: 0,
    remainHeldOnSourceOrDesign: trackResolutions.length,
    committedTreatmentCorpusJsonFiles: treatmentCorpusPaths.length,
    committedTreatmentCorpusDistinctTrackIdValues: treatmentCorpusDistinctTrackIds.length,
    noFamilyTrackIntersectionWithCommittedTreatmentCorpus: treatmentCorpusIntersection.length,
  },
  corpusAudit: {
    directories: treatmentCorpusDirectories,
    manifestSha256: treatmentCorpusDigest,
    jsonFiles: treatmentCorpusPaths.length,
    distinctTrackIdValues: treatmentCorpusDistinctTrackIds.length,
    assessedNoFamilyTrackIds: trackResolutions.map((track) => track.trackId),
    intersection: treatmentCorpusIntersection,
    priorCanonicalAssessment: "All 25 exact prior candidate records are terminal:false and held_on_source_or_design.",
  },
  completeGuidanceCandidates: [],
  exactSupportedDeferralCandidates: [],
  deliberateScopeExclusionCandidates: [],
  heldTracks: trackResolutions.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    result: "none_supported_remain_held_on_source_or_design",
    terminal: false,
    relationshipPosture: track.relationshipPosture,
    unresolvedComponentRelationships: track.unresolvedComponentRelationships,
    reason: track.candidateTerminalTreatmentAssessment.reason,
    paymentAndCreditBehavior: track.paymentAndCreditBehavior,
    briefcaseBehaviorChanged: false,
    participantTreatmentAuthored: false,
    candidateAuthorizesLaunch: false,
    evidence: track.candidateTerminalTreatmentAssessment.evidence,
  })),
  safety: {
    sourceBinaryCommitted: false,
    runtimeChanged: false,
    paymentChanged: false,
    checkoutChanged: false,
    packetOrPartnerCreditChanged: false,
    briefcaseChanged: false,
    candidateAuthorizesLaunch: false,
  },
};

const ownerJobDocument = {
  schemaVersion: "rcap-codex-d-relationship-owner-jobs/v1",
  status: "captain_dispatch_plan_not_executed",
  baseCommit,
  summary: {
    ownerJobs: ownerJobs.length,
    tracks: trackResolutions.length,
    unresolvedRelationshipRows: unresolvedResolutions.length,
    sourceBinaryRelationshipRows: classificationCounts.source_binary_missing,
    uniqueMissingSourceAssets: missingAssets.length,
    rogerDecisions: 1,
    counselJobsCreatedFromMetadataOrSourceGaps: 0,
  },
  captainAssignment: relationshipResolution.captainAssignment,
  jobs: ownerJobs,
};

const checkOnly = process.argv.includes("--check");
const generatedOutputContents = new Map();
const queueGeneratedJson = (relativePath, value) => generatedOutputContents.set(relativePath, stableJson(value));
queueGeneratedJson("data/rcap-codex/d-relationship-resolution/track-relationship-resolution.json", relationshipResolution);
queueGeneratedJson("data/rcap-codex/d-relationship-resolution/terminal-treatment-candidates.json", terminalTreatments);
queueGeneratedJson("data/rcap-codex/d-relationship-resolution/owner-jobs.json", ownerJobDocument);

const q = String.fromCharCode(96);
const readmeLines = [
  "# D relationship resolution",
  "",
  "This Codex-owned proposal resolves the canonical 25-track no-family set at " + q + baseCommit + q + ". It does not modify the canonical map, source corpus, runtime, ledger, or review dispositions.",
  "",
  "## Result",
  "",
  "| Measure | Count |",
  "| --- | ---: |",
  "| Canonical D tracks | 67 |",
  "| Current no-exact-family tracks | 25 |",
  "| Relationship rows audited | 62 |",
  "| Proposed exact component/family edges | 19 |",
  "| Captain-ready exact edges | 16 |",
  "| Exact Kansas edges awaiting pin correction | 3 |",
  "| Remaining executable relationship rows | 43 |",
  "| Owner jobs | 13 |",
  "| Guidance candidates | 0 |",
  "| Exact deferral candidates | 0 |",
  "| Scope exclusions | 0 |",
  "",
  "The 62 rows are 59 canonical pinned components plus three treaty-specific Washington source rows already present in the imported map. The exact edges reach 11 tracks; four tracks have all relationship rows resolved exactly and seven are partial. Fourteen tracks still have no exact family.",
  "",
  "## Classification",
  "",
  "| Outcome | Rows |",
  "| --- | ---: |",
  ...Object.entries(classificationCounts).map(([outcome, count]) => "| " + q + outcome + q + " | " + count + " |"),
  "",
  "An exact edge is an identity conclusion only. The output preserves source/currentness, legal-design, legal-adoption, participant-treatment, runtime, payment, checkout, credit, staging, and technical gates independently. The allowed `source_not_required` outcome means only that no standalone binary is needed for that component remap; it does not authorize a terminal treatment.",
  "",
  "## Track queue",
  "",
  "| Jurisdiction | Track | Exact | Remaining | Posture | Owner jobs |",
  "| --- | --- | ---: | ---: | --- | --- |",
  ...trackResolutions.map((track) =>
    "| " + track.jurisdiction +
    " | " + q + track.trackId + q +
    " | " + track.exactComponentRelationships +
    " | " + track.unresolvedComponentRelationships +
    " | " + q + track.relationshipPosture + q +
    " | " + (track.ownerJobIds.length ? track.ownerJobIds.map((id) => q + id + q).join(", ") : "captain exact-edge import") +
    " |"
  ),
  "",
  "## Terminal-treatment boundary",
  "",
  "No track has a repository-supported complete bilingual guidance, exact deferral, or deliberate scope-exclusion candidate. A pinned scan of 36 committed treatment-corpus JSON files found 76 distinct trackId values and zero intersection with these 25; the prior canonical candidate record also marks every one terminal:false and held_on_source_or_design. All 25 remain held, with payment prohibited, checkout suppressed, unchanged Briefcase behavior, no authored participant treatment, and zero packet and partner credit. The absence of a source binary is not itself a referral treatment.",
  "",
  "## Dispatch",
  "",
  "The " + q + "dispatch/" + q + " directory contains one state-sized executable job per owner group. Metadata jobs do not go to counsel. Roger receives only the Kentucky protective-order scope decision. A later substantive Rule 3.989 output, route change, legal predicate, protected-field change, or licensing conflict may create a separate human/counsel gate.",
  "",
  "## Reproduce",
  "",
  "Run:",
  "",
  "    node docs/rcap/codex/d-relationship-resolution/build-and-verify.mjs",
  "",
  "The build pins input SHA-256 values, validates the 25/59/3/62 denominators, classifies every row once, rejects unsupported family acceptance, validates commercial fail-closed behavior, and writes deterministic JSON and Markdown. Run the same command with `--check` for byte-for-byte and exact-path-set verification without writing.",
  "",
];
generatedOutputContents.set("docs/rcap/codex/d-relationship-resolution/README.md", readmeLines.join("\n"));

for (const job of ownerJobs) {
  const stateTracks = trackResolutions.filter((track) => job.tracks.includes(track.trackId));
  const lines = [
    "# " + job.jobId,
    "",
    "Owner: " + job.owner,
    "",
    "Objective: " + job.objective,
    "",
    "This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.",
    "",
    "## Tracks",
    "",
    ...stateTracks.map((track) => "- " + q + track.trackId + q + " — " + track.relationshipPosture),
    "",
    "## Component actions",
    "",
  ];
  for (const track of stateTracks) {
    lines.push("### " + track.trackId, "");
    for (const component of track.componentResolutions) {
      lines.push("- " + q + component.componentId + q + ": " + q + component.relationshipOutcome + q + ".");
      if (exactOutcomes.has(component.relationshipOutcome)) {
        lines.push("  Proposed family: " + q + component.familyId + q + ". Captain imports the edge without clearing " + q + component.remainingSourceCurrentnessCondition + q + " or any other gate.");
        if (!component.captainImportReady) lines.push("  Import prerequisite: " + component.edgeImportPrerequisites.join(" "));
      } else {
        lines.push("  Missing evidence: " + component.exactMissingEvidence);
        lines.push("  Next action: " + component.nextExecutableAction);
        lines.push("  Terminal alternative: none supported; remain fail-closed.");
      }
    }
    lines.push("");
  }
  lines.push(
    "## Exit evidence",
    "",
    ...job.exitEvidence.map((item) => "- " + item),
    "",
    "Counsel routing: " + job.counselRoutingRule,
    "",
  );
  if (job.humanDecision) lines.push("Human boundary: " + job.humanDecision, "");
  generatedOutputContents.set(
    "docs/rcap/codex/d-relationship-resolution/dispatch/" + job.jurisdiction.toLowerCase() + ".md",
    lines.join("\n"),
  );
}

const walkFiles = (directory) => existsSync(directory)
  ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(path) : [path];
    })
  : [];
const scriptRelativePath = relative(repositoryRoot, scriptPath);
const verificationRelativePath = "data/rcap-codex/d-relationship-resolution/verification-result.json";
const expectedNonverificationPaths = [...generatedOutputContents.keys(), scriptRelativePath].sort();
const expectedFinalPaths = [...expectedNonverificationPaths, verificationRelativePath].sort();
assert.equal(generatedOutputContents.size, 17);
assert.equal(expectedFinalPaths.length, 19);
const existingAuthoredPaths = [
  ...walkFiles(outputDataDirectory),
  ...walkFiles(outputDocsDirectory),
].map((path) => relative(repositoryRoot, path)).sort();
const unexpectedAuthoredPaths = existingAuthoredPaths.filter((path) => !expectedFinalPaths.includes(path));
assert.deepEqual(unexpectedAuthoredPaths, [], "unexpected stale file in authored output tree");

if (!checkOnly) {
  for (const [relativePath, content] of generatedOutputContents) {
    const absolutePath = join(repositoryRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
}
const generatedBytesMatch = [...generatedOutputContents].every(([relativePath, content]) =>
  existsSync(join(repositoryRoot, relativePath)) &&
  readFileSync(join(repositoryRoot, relativePath), "utf8") === content
);
const actualNonverificationPaths = [
  ...walkFiles(outputDataDirectory),
  ...walkFiles(outputDocsDirectory),
].map((path) => relative(repositoryRoot, path))
  .filter((path) => path !== verificationRelativePath)
  .sort();
const deterministicNonverificationPass = generatedBytesMatch &&
  JSON.stringify(actualNonverificationPaths) === JSON.stringify(expectedNonverificationPaths);
if (checkOnly) assert(deterministicNonverificationPass, "generated output differs from pinned-input reconstruction");

const prohibitedBinaryExtensions = new Set([".pdf", ".doc", ".docx", ".zip", ".png", ".jpg", ".jpeg"]);
const sourceBinaryFiles = expectedFinalPaths.filter((path) => {
  const lower = path.toLowerCase();
  return [...prohibitedBinaryExtensions].some((extension) => lower.endsWith(extension));
});
assert.deepEqual(sourceBinaryFiles, []);

for (const track of trackResolutions) {
  assert.equal(track.currentMapRequiredFamilyIds.length, 0);
  assert(track.componentResolutions.length > 0);
}
assert.equal(new Set(trackResolutions.map((track) => track.trackId)).size, 25);
for (const component of componentResolutions) {
  assert(allowedOutcomes.has(component.relationshipOutcome));
  assert(component.evidence.length >= 3);
  if (exactOutcomes.has(component.relationshipOutcome)) {
    assert(component.familyId);
    assert(component.familyEvidence.sourceSha256);
    assert(component.familyEvidence.documentId);
    assert(component.familyEvidence.officialTitle);
    assert(component.familyEvidence.documentRole);
    assert(["recorded_in_release_verified_source_record", "unknown_not_claimed_as_verified"].includes(component.revisionEvidenceStatus));
    if (component.relationshipSourceSha256) {
      if (component.relationshipSourceSha256 === component.familyEvidence.sourceSha256) {
        assert.equal(component.canonicalRelationshipShaStatus, "matches_family_source");
      } else {
        assert.equal(component.relationshipSourceSha256, "1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c");
        assert.equal(component.canonicalRelationshipShaStatus, "known_cross_applied_sha_defect");
        assert.equal(component.canonicalRelationshipShaDefect, "cross_applied_petition_sha");
        assert(component.edgeImportPrerequisites.length > 0);
        assert.equal(component.captainImportReady, false);
      }
    } else {
      assert.equal(component.canonicalRelationshipShaStatus, "not_pinned");
    }
    assert.equal(component.canonicalMapModified, false);
  } else {
    assert.equal(component.familyId, null);
    assert(component.exactMissingEvidence);
    assert(component.ownerJobId);
    assert(component.executionOwner);
    assert(component.questionType);
    assert.equal(component.counselJobCreated, false);
    assert(component.nextExecutableAction);
    assert.equal(component.terminalAlternativeAvailable, false);
    assert.equal(component.terminal, false);
  }
}
const metadataRows = unresolvedResolutions.filter((row) => row.relationshipOutcome === "metadata_relationship_missing");
const missingSourceRows = unresolvedResolutions.filter((row) => row.relationshipOutcome === "source_binary_missing");
const unsupportedRows = componentResolutions.filter((row) => row.relationshipOutcome === "unsupported");
const metadataClassificationPass = metadataRows.every((row) =>
  row.questionType === "repository_relationship_or_family_materialization" &&
  row.missingAssetKey === null &&
  row.counselJobCreated === false &&
  !row.executionOwner.toLowerCase().includes("counsel") &&
  !row.executionOwner.toLowerCase().includes("roger")
);
const missingSourceOwnershipPass = missingSourceRows.every((row) =>
  row.missingAssetKey && row.questionType === "source_binary_acquisition" &&
  row.executionOwner && !row.executionOwner.toLowerCase().includes("roger") &&
  !row.executionOwner.toLowerCase().includes("counsel") && row.counselJobCreated === false
);
const rogerDecisionRows = unresolvedResolutions.filter((row) => row.decisionDependency?.decisionOwner === "Roger");
assert(metadataClassificationPass);
assert(missingSourceOwnershipPass);
assert.equal(rogerDecisionRows.length, 1);
assert.equal(rogerDecisionRows[0].componentId, "ky_protective_order_record_expungement-primary-filing-1");
assert(unsupportedRows.every((row) => row.rejectedFamilyIds.length > 0 && row.familyId === null));
assert.equal(terminalTreatments.heldTracks.length, 25);
const terminalSafetyPass = terminalTreatments.heldTracks.every((track) =>
  track.terminal === false &&
  track.paymentAndCreditBehavior.paymentAllowed === false &&
  track.paymentAndCreditBehavior.checkoutSuppressed === true &&
  track.paymentAndCreditBehavior.packetCreditConsumption === "none" &&
  track.paymentAndCreditBehavior.partnerCreditConsumed === false &&
  track.briefcaseBehaviorChanged === false &&
  track.participantTreatmentAuthored === false &&
  track.candidateAuthorizesLaunch === false
);
assert(terminalSafetyPass);
const zeroCandidateEvidencePass = treatmentCorpusIntersection.length === 0 &&
  terminalTreatments.completeGuidanceCandidates.length === 0 &&
  terminalTreatments.exactSupportedDeferralCandidates.length === 0 &&
  terminalTreatments.deliberateScopeExclusionCandidates.length === 0 &&
  zeroFamilyTracks.every((track) => {
    const prior = priorTreatmentByTrackId.get(track.trackId);
    return prior?.terminal === false && prior.proposedTerminalProductTreatment === "held_on_source_or_design";
  });
assert(zeroCandidateEvidencePass);
const changedPaths = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).split("\n").filter(Boolean).map((line) => line.slice(3));
const onlyCodexOwnedPathsChanged = changedPaths.every((path) =>
  path.startsWith("data/rcap-codex/d-relationship-resolution/") ||
  path.startsWith("docs/rcap/codex/d-relationship-resolution/")
);

const verification = {
  schemaVersion: "rcap-codex-d-relationship-resolution-verification/v1",
  baseCommit,
  result: "PASS",
  counts: relationshipResolution.summary,
  gates: [
    { gate: "exactly 25 current no-exact-family tracks represented once", pass: trackResolutions.length === 25 && new Set(trackResolutions.map((track) => track.trackId)).size === 25 },
    { gate: "59 canonical pinned plus 3 supplemental rows classified exactly once", pass: componentResolutions.length === 62 && new Set(componentResolutions.map((row) => row.componentId)).size === 62 },
    { gate: "every proposed exact relationship has exact form identity and source SHA evidence; unknown revisions are not claimed verified", pass: exactResolutions.every((row) => row.familyEvidence.documentId && row.familyEvidence.officialTitle && row.familyEvidence.documentRole && row.familyEvidence.sourceSha256 && row.evidence.length >= 4) },
    { gate: "every non-null relationship SHA either matches the family SHA or carries the evidence-backed Kansas cross-applied-petition defect and correction prerequisite", pass: exactResolutions.every((row) => !row.relationshipSourceSha256 || row.relationshipSourceSha256 === row.familyEvidence.sourceSha256 || (row.canonicalRelationshipShaDefect === "cross_applied_petition_sha" && row.edgeImportPrerequisites.length > 0 && !row.captainImportReady)) },
    { gate: "no source binary committed", pass: sourceBinaryFiles.length === 0 },
    { gate: "metadata gaps are repository relationship/materialization work, not source-binary or legal questions", pass: metadataClassificationPass },
    { gate: "no metadata gap sent to counsel", pass: metadataRows.every((row) => row.counselJobCreated === false && !row.executionOwner.toLowerCase().includes("counsel")) },
    { gate: "every missing-source row names an exact asset and non-Roger, non-counsel execution owner", pass: missingSourceOwnershipPass },
    { gate: "Roger receives only the Kentucky protective-order scope decision, never RU-009 execution", pass: rogerDecisionRows.length === 1 && rogerDecisionRows[0].componentId === "ky_protective_order_record_expungement-primary-filing-1" },
    { gate: "unsupported generic Washington relationships not accepted", pass: unsupportedRows.length === 2 && unsupportedRows.every((row) => row.familyId === null) },
    { gate: "every unresolved row has exact missing evidence, structured owner and executable action", pass: unresolvedResolutions.every((row) => row.exactMissingEvidence && row.ownerJobId && row.executionOwner && row.nextExecutableAction) },
    { gate: "pinned 36-file treatment corpus has zero intersection and prior exact records hold all 25", pass: zeroCandidateEvidencePass },
    { gate: "no incomplete bilingual terminal-treatment candidate authored", pass: zeroCandidateEvidencePass },
    { gate: "terminal, Briefcase, participant-treatment, launch, payment, checkout and credit behavior remain fail-closed on all 25 tracks", pass: terminalSafetyPass && terminalTreatments.safety.candidateAuthorizesLaunch === false },
    { gate: "technical approval not treated as terminality", pass: trackResolutions.every((track) => track.technicalApprovalPromotesTrack === false && track.terminal === false) },
    { gate: "only Codex-owned relationship-resolution paths changed", pass: onlyCodexOwnedPathsChanged },
    { gate: "outputs deterministic from pinned inputs with an exact authored path set", pass: deterministicNonverificationPass },
  ],
  sourceBinaryFiles: [],
  treatmentCorpusEvidence: {
    manifestSha256: treatmentCorpusDigest,
    jsonFiles: treatmentCorpusPaths.length,
    distinctTrackIdValues: treatmentCorpusDistinctTrackIds.length,
    noFamilyTrackIntersection: treatmentCorpusIntersection,
  },
  outputHashes: Object.fromEntries([
    [scriptRelativePath, sha256File(scriptPath)],
    ...[...generatedOutputContents].map(([path, content]) => [path, sha256Buffer(content)]),
  ].sort(([left], [right]) => left.localeCompare(right))),
};
assert(verification.gates.every((gate) => gate.pass));
generatedOutputContents.set(verificationRelativePath, stableJson(verification));
if (!checkOnly) {
  writeFileSync(join(repositoryRoot, verificationRelativePath), generatedOutputContents.get(verificationRelativePath));
}
const finalAuthoredPaths = [
  ...walkFiles(outputDataDirectory),
  ...walkFiles(outputDocsDirectory),
].map((path) => relative(repositoryRoot, path)).sort();
assert.deepEqual(finalAuthoredPaths, expectedFinalPaths, "authored output path set differs");
assert([...generatedOutputContents].every(([path, content]) =>
  readFileSync(join(repositoryRoot, path), "utf8") === content
), "authored output bytes differ from pinned-input reconstruction");

console.log(stableJson({
  result: verification.result,
  tracks: trackResolutions.length,
  relationships: componentResolutions.length,
  exactRelationships: exactResolutions.length,
  unresolvedRelationships: unresolvedResolutions.length,
  ownerJobs: ownerJobs.length,
  terminalCandidates: 0,
}));
