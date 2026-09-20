import assert from "node:assert/strict";

export const ND_FAMILY = "composed-treatment:nd-nonconviction-auto-close-verify";
export const ND_DIRECTORY = "data/rcap-all50/overlays/census-v1/nd/composed-treatment:nd-nonconviction-auto-close-verify--custom-pleading";
export const ND_ROUTES = [
  "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:original_case_enforcement_motion",
  "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:written_clerk_correction_request",
];
export const ND_COMPONENTS = [
  "clerk_correction_request",
  "enforcement_motion",
  "proposed_order",
  "filing_instructions",
];

const COMPONENT_BINDING = [
  { componentId: "clerk_correction_request", order: 1, condition: null },
  {
    componentId: "enforcement_motion",
    order: 2,
    condition: "Used only AFTER the written request: the recorded sequence is a written request to the office of the original court first, and the motion to enforce in the original criminal case only if that office states that judicial action is required or does not correct the record.",
  },
  {
    componentId: "proposed_order",
    order: 3,
    condition: "Travels with the enforcement motion only; nothing on it is decided, signed or dated by the participant.",
  },
  { componentId: "filing_instructions", order: 4, condition: null },
];

const STALE_VF09 = {
  verdict: "PASS_COMPLETE_INDEPENDENT",
  lane: "vf09",
  verifiedAtBase: "7fcfb7d40aafe7bd7350fc735ea09d16524cb757",
};
const SUPERSEDED_RASTER = {
  verdict: "RASTER_PASS",
  workflowRunId: "33579500812",
  jobId: "100091041747",
  artifactId: "9828004789",
  boundToCanonicalSha256: "61bedadea4d79733ae2903993d4525835e08df8f28d191bdb2b3b66fe2e78c96",
  coversTheWholeFamily: true,
  supersededBecause: "The entry-date, whole-case and appeal-gate repair changed both fixture PDFs; exact-byte review must be earned again.",
};
const supersededReason = SUPERSEDED_RASTER.supersededBecause;
const routeSet = value => [...value].sort();

function assertArtifact(artifact, fixture, hashFile) {
  assert.equal(artifact.fixture, fixture);
  assert.equal(artifact.file, `${ND_DIRECTORY}/fixtures/${fixture}.pdf`);
  assert.equal(artifact.pageCount, 7);
  assert.deepEqual(artifact.documents, ND_COMPONENTS);
  assert.deepEqual(artifact.components, ND_COMPONENTS);
  const pages = [
    [1, "clerk_correction_request", 1], [2, "clerk_correction_request", 2],
    [3, "enforcement_motion", 1], [4, "enforcement_motion", 2],
    [5, "proposed_order", 1], [6, "filing_instructions", 1], [7, "filing_instructions", 2],
  ];
  assert.deepEqual(artifact.pageManifest.map(row =>
    [row.packetPage, row.component, row.documentId, row.sourcePage]),
  pages.map(([packetPage, component, sourcePage]) => [packetPage, component, component, sourcePage]));
  assert.equal(hashFile(artifact.file), artifact.sha256, `${fixture} PDF digest changed`);
}

function assertCurrentRaster(raster, report) {
  assert.ok(raster, "Current ND whole-family raster receipt is required");
  assert.equal(raster.familyId, ND_FAMILY);
  const receipt = raster.rasterReceipt;
  assert.equal(receipt.verdict, "RASTER_PASS");
  assert.equal(receipt.workflowRunId, "34628970364");
  assert.equal(receipt.coversTheWholeFamily, true);
  assert.equal(receipt.documentsMeasured, 2);
  assert.equal(receipt.pagesMeasured, 14);
  assert.deepEqual(receipt.documentsNotCovered, []);
  assert.deepEqual([...receipt.documentsCovered].sort(), ["boundary.pdf", "canonical.pdf"]);
  for (const fixture of ["canonical", "boundary"]) {
    const artifact = report.artifacts.find(row => row.fixture === fixture);
    const document = raster.documents.find(row => row.role === fixture);
    assert.ok(document, `Raster is missing ${fixture}`);
    assert.equal(document.path, artifact.file);
    assert.equal(document.sha256, artifact.sha256);
    assert.equal(document.pageCount, artifact.pageCount);
  }
  assert.equal(receipt.boundToCanonicalSha256,
    report.artifacts.find(row => row.fixture === "canonical").sha256);
  assert.equal(receipt.boundToBoundarySha256,
    report.artifacts.find(row => row.fixture === "boundary").sha256);
}

// This is an exact-family repair for a composed packet whose queue row does not
// carry its document inventory. It describes existing bytes and creates no
// delivery, payment, eligibility, raster, or independent-review authority.
export function bindDeclaredNdDelivery(record, family, {
  report, sourceReceipt, fieldMap, hashFile, raster, selectedIndependentVerdict,
}) {
  if (family.familyId !== ND_FAMILY) return record;
  assert.equal(record.family, ND_FAMILY);
  assert.equal(family.directory, ND_DIRECTORY);
  assert.equal(record.binding.family, ND_FAMILY);
  assert.equal(record.binding.jurisdiction, "ND");
  for (const routes of [family.routeKeys, record.routeKeys, record.binding.routeKeys,
    sourceReceipt.routeKeys, fieldMap.routeKeys]) {
    assert.deepEqual(routeSet(routes), routeSet(ND_ROUTES), "ND failure-branch route scope changed");
  }
  assert.equal(report.familyId, ND_FAMILY);
  assert.equal(sourceReceipt.familyId, ND_FAMILY);
  assert.equal(fieldMap.familyId, ND_FAMILY);
  assert.deepEqual(report.componentSet, ND_COMPONENTS);
  assert.deepEqual(sourceReceipt.composedComponentsAuthoredByThisBuild, ND_COMPONENTS);
  assert.deepEqual(fieldMap.componentSet, ND_COMPONENTS);
  assert.deepEqual(fieldMap.maps.map(row => row.formNumber), ND_COMPONENTS);
  assert.equal(report.artifacts.length, 2);
  assert.equal(report.pdfs.length, 2);
  for (const fixture of ["canonical", "boundary"]) {
    const artifacts = report.artifacts.filter(row => row.fixture === fixture);
    const pdfs = report.pdfs.filter(row => row.fixture === fixture);
    assert.equal(artifacts.length, 1, `Missing or duplicate ${fixture} artifact`);
    assert.equal(pdfs.length, 1, `Missing or duplicate ${fixture} PDF`);
    assertArtifact(artifacts[0], fixture, hashFile);
    for (const key of ["file", "sha256", "byteLength", "pageCount"])
      assert.equal(pdfs[0][key], artifacts[0][key], `${fixture} ${key} inventory mismatch`);
  }
  assert.equal(record.status, "DECLARED_NOT_INSTALLED");
  assert.equal(record.authorityCreated, "none");
  assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  assertCurrentRaster(raster, report);

  const result = structuredClone(record);
  result.binding.deliveryType = "custom_pleading";
  result.binding.instrumentKinds = [...ND_COMPONENTS];
  result.binding.packetComponents = structuredClone(COMPONENT_BINDING);

  // This receipt was independently rehashed by the shared reader and binds the
  // current canonical. Preserve it; the old VF09 verdict covers earlier bytes.
  assert.deepEqual(result.binding.acceptanceReceipt, {
    verdict: raster.rasterReceipt.verdict,
    workflowRunId: raster.rasterReceipt.workflowRunId,
    jobId: raster.rasterReceipt.jobId,
    artifactId: raster.rasterReceipt.receiptArtifact.id,
    boundToCanonicalSha256: raster.rasterReceipt.boundToCanonicalSha256,
    coversTheWholeFamily: true,
  }, "Generated binding did not carry the exact accepted current raster identity");
  result.binding.supersededAcceptanceReceipt = structuredClone(SUPERSEDED_RASTER);
  if (selectedIndependentVerdict !== null) {
    assert.deepEqual(Object.keys(selectedIndependentVerdict).sort(),
      ["lane", "verdict", "verifiedAtBase"], "Selected independent verdict must use the normalized identity tuple");
  }
  const currentVerdict = result.binding.lastIndependentVerification;
  const isExactStaleVf09 = currentVerdict
    && Object.keys(currentVerdict).length === Object.keys(STALE_VF09).length
    && Object.keys(STALE_VF09).every(key => currentVerdict[key] === STALE_VF09[key]);
  if (isExactStaleVf09) {
    assert.deepEqual(selectedIndependentVerdict, STALE_VF09,
      "Stale VF09 cannot displace a newer selected independent verdict");
    result.binding.supersededIndependentVerification = {
      ...structuredClone(STALE_VF09), supersededBecause: supersededReason,
    };
    result.binding.lastIndependentVerification = null;
  } else {
    assert.deepEqual(currentVerdict, selectedIndependentVerdict,
      "Generated current verdict does not match the queue's explicit selected independent verdict");
  }
  result.binding.supersededIndependentVerification = {
    ...structuredClone(STALE_VF09), supersededBecause: supersededReason,
  };
  result.proposedRepresentation.note = "A specification for a later lane, derived from the corrected four-component packet. Current raster evidence is bound; current-byte independent acceptance is still required before any later installation decision.";
  result.proposedRepresentation.outputStrategy = "custom_pleading";
  const canonical = report.artifacts.find(row => row.fixture === "canonical");
  result.proposedRepresentation.components = [{
    componentId: `${ND_FAMILY}-component-1`, role: "assembled_four_component_packet", order: 1,
    documentId: "canonical", file: canonical.file, sha256: canonical.sha256, requirement: "required",
  }];
  return result;
}
