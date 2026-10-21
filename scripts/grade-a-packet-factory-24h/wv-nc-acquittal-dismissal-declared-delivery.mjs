import assert from "node:assert/strict";

export const WV_FAMILY = "wv_nc_acquittal_dismissal-set";
export const WV_ROUTE =
  "obligation:track-pathway:WV:wv_nc_acquittal_dismissal:" +
  "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication";

export const WV_COMPONENTS = [
  "wv_nc_acquittal_dismissal-primary-filing-1",
  "wv_nc_acquittal_dismissal-certificate-of-service-2",
  "wv_nc_acquittal_dismissal-filing-instructions-3",
  "wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
];

const BRANCH_ROUTES = Object.freeze({
  DISMISSED_STRAIGHT: "wv_nc_acquittal_dismissal-primary-filing-1",
  ACQUITTED_OR_FOUND_NOT_GUILTY: "wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
});

/*
 * The queue's packetComponents list predates the owner-adopted acquittal
 * branch and names only the source dismissal motion and its certificate.
 * This family-specific binder is the existing product-wiring generation hook:
 * it derives the branch component from the already-written field map and page
 * manifest, then records the text-only instructions separately. It does not
 * create or alter packet bytes, source custody, raster evidence, or authority.
 */
export function bindDeclaredWvDelivery(record, family, { report, fieldMap }) {
  if (family.familyId !== WV_FAMILY) return record;

  assert.equal(record.family ?? record.familyId, WV_FAMILY);
  assert.equal(family.directory,
    "data/rcap-all50/overlays/census-v1/wv/"
      + "wv-nc-acquittal-dismissal-set--official-pdf-fill");
  assert.deepEqual(family.routeKeys, [WV_ROUTE], "WV route scope changed");
  assert.deepEqual(record.routeKeys, [WV_ROUTE], "generated WV route scope changed");
  assert.equal(record.binding.family, WV_FAMILY);
  assert.equal(record.binding.jurisdiction, "WV");
  assert.ok((family.instrumentKinds ?? []).includes("filing_instructions"),
    "queue must retain the text-only filing-instructions instrument kind");

  assert.equal(report.familyId, WV_FAMILY);
  assert.equal(report.renderedFresh, true);
  assert.equal(report.derivedFromBytes, true);
  assert.deepEqual(report.componentSet, WV_COMPONENTS, "WV rendered component set drifted");
  assert.equal(fieldMap.familyId, WV_FAMILY);
  assert.deepEqual(fieldMap.componentSet, WV_COMPONENTS, "WV field-map component set drifted");
  assert.deepEqual(fieldMap.branchSet, [
    "DISMISSED_STRAIGHT",
    "ACQUITTED_OR_FOUND_NOT_GUILTY",
  ], "WV branch set drifted");
  assert.deepEqual(fieldMap.routeSelectionsMade.map((row) => [row.branchId, row.component]), [
    ["DISMISSED_STRAIGHT", BRANCH_ROUTES.DISMISSED_STRAIGHT],
    ["ACQUITTED_OR_FOUND_NOT_GUILTY", BRANCH_ROUTES.ACQUITTED_OR_FOUND_NOT_GUILTY],
  ], "WV branch selection mapping drifted");

  const artifacts = report.artifacts ?? [];
  assert.equal(artifacts.length, 4, "WV must retain both canonical/boundary branch outputs");
  const expectedBranchFixtures = new Set([
    "DISMISSED_STRAIGHT/canonical",
    "DISMISSED_STRAIGHT/boundary",
    "ACQUITTED_OR_FOUND_NOT_GUILTY/canonical",
    "ACQUITTED_OR_FOUND_NOT_GUILTY/boundary",
  ]);
  const observedBranchFixtures = new Set();
  const pageBacked = new Set();
  for (const artifact of artifacts) {
    observedBranchFixtures.add(`${artifact.branchId}/${artifact.fixture}`);
    assert.match(String(artifact.sha256), /^[0-9a-f]{64}$/, "WV artifact digest missing");
    assert.equal(typeof artifact.byteLength, "number");
    assert.equal(typeof artifact.pageCount, "number");
    for (const page of artifact.pageManifest ?? []) {
      assert.ok(WV_COMPONENTS.includes(page.component), "WV page names unknown component");
      pageBacked.add(page.component);
    }
  }
  assert.deepEqual(observedBranchFixtures, expectedBranchFixtures,
    "WV branch fixture coverage drifted");
  assert.deepEqual([...pageBacked].sort(), [
    "wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
    "wv_nc_acquittal_dismissal-certificate-of-service-2",
    "wv_nc_acquittal_dismissal-primary-filing-1",
  ].sort(), "WV page-backed component inventory drifted");

  if (record.branchRoutes) {
    assert.deepEqual(record.branchRoutes, BRANCH_ROUTES, "WV branch routes drifted");
  }

  const result = structuredClone(record);
  result.branchRoutes = structuredClone(BRANCH_ROUTES);
  result.binding.packetComponents = [
    "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
    "component:wv_nc_acquittal_dismissal-primary-filing-1",
    "component:wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
  ];
  result.binding.componentConditions = structuredClone(fieldMap.componentConditions);
  result.binding.packetComponentsScope = {
    meaning: "page-backed participant-delivery components",
    declaredComponentSet: WV_COMPONENTS.map((id) => `component:${id}`),
    pageBackedComponents: [...pageBacked].sort().map((id) => `component:${id}`),
    textOnlyComponent: "component:wv_nc_acquittal_dismissal-filing-instructions-3",
    textOnlyRepresentation:
      "Represented by binding.instructions and instrumentKinds.filing_instructions; it has no page-backed PDF entry.",
    branchCoverage: {
      DISMISSED_STRAIGHT: [
        "component:wv_nc_acquittal_dismissal-primary-filing-1",
        "component:wv_nc_acquittal_dismissal-certificate-of-service-2",
      ],
      ACQUITTED_OR_FOUND_NOT_GUILTY: [
        "component:wv_nc_acquittal_dismissal-acquittal-civil-petition-4",
      ],
    },
  };
  return result;
}
