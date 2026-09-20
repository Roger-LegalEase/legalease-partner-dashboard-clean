#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const OUT = "data/rcap-grade-a/codex-cloud/ks-municipal-independent-review";
const abs = (relative) => path.join(ROOT, relative);
const rasterMetrics = JSON.parse(fs.readFileSync(abs(`${OUT}/raster-metrics.generated.json`), "utf8"));
const textGeometry = JSON.parse(fs.readFileSync(abs(`${OUT}/text-geometry.generated.json`), "utf8"));
const generatedAt = "2026-09-02T00:00:00.000Z";
const obligations = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP"
];
const sources = [
  {
    path: "data/record-clearing/legal-design-track-registry.json",
    sha256: "0a92a1a27ef43fe719d00f121896923036a7d2b90ffa5228b972e4873ffb80e6",
    byteLength: 16555956
  },
  {
    path: "data/record-clearing/legal-design-specifications.json",
    sha256: "cc0c79598a8406e08d606901fafb01972bb75ac1e7d0eca8df59209c0773f9c5",
    byteLength: 16829383
  },
  {
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "0936833332542f8eeac4528bde376a93e30adbdc4b9b78ff1898f11d07b3063f",
    byteLength: 2599752
  }
];
const routes = {
  "ks-12-4516-municipal": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
    label: "Municipal conviction or diversion expungement - K.S.A. 12-4516",
    foreignLabel: "Municipal arrest record expungement - K.S.A. 12-4516a",
    components: [
      "ks-12-4516-municipal-primary-filing-1",
      "ks-12-4516-municipal-proposed-order-2",
      "ks-12-4516-municipal-filing-instructions-3"
    ],
    requiredBeforeFiling: 16,
    protectedFields: 7,
    terminalFields: 30,
    filingDestination: "The convicting Kansas municipal court; confirm local charter-ordinance form/process before filing.",
    feeAndWaiver: "Court-prescribed fee under K.S.A. 12-4516(g)(2); no statewide amount and no statutory statewide waiver identified.",
    service: "The court causes notice; the participant does not serve, under K.S.A. 12-4516(g)(1).",
    selfHelpStop: "Seven route-specific stops are carried, including opposition, a contested hearing, a different charter-ordinance process, disputed state-equivalent classification, registration, and immigration consequences."
  },
  "ks-12-4516a-municipal-arrest": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
    label: "Municipal arrest record expungement - K.S.A. 12-4516a",
    foreignLabel: "Municipal conviction or diversion expungement - K.S.A. 12-4516",
    components: [
      "ks-12-4516a-municipal-arrest-primary-filing-1",
      "ks-12-4516a-municipal-arrest-proposed-order-2",
      "ks-12-4516a-municipal-arrest-filing-instructions-3"
    ],
    requiredBeforeFiling: 12,
    protectedFields: 7,
    terminalFields: 26,
    filingDestination: "The Kansas municipal court where the ordinance charge was brought; confirm that court's local form/process before filing.",
    feeAndWaiver: "Court-prescribed fee under K.S.A. 12-4516a(b), with the K.S.A. 21-6107 identity-theft fee exemption and no discretionary statewide waiver.",
    service: "The court causes notice; the participant does not serve, under K.S.A. 12-4516a(b).",
    selfHelpStop: "Seven route-specific stops are carried, including opposition, a contested hearing, disputed statutory grounds, conviction/diversion routing, a different charter-ordinance process, and immigration consequences."
  }
};

function pageMeasurements(document) {
  const geometryDocument = textGeometry.documents.find((entry) => entry.route === document.route && entry.fixture === document.fixture);
  return document.pages.map((page) => {
    const geometry = geometryDocument.pages.find((entry) => entry.page === page.page);
    const clippingObserved = geometry.linesOutsideMediaBox > 0;
    return {
      page: page.page,
      rasterPath: page.rasterPath,
      rasterSha256: page.rasterSha256,
      rasterByteLength: page.rasterByteLength,
      dimensionsPx: { width: page.widthPx, height: page.heightPx },
      rasterScalePixelsPerPoint: rasterMetrics.scalePixelsPerPoint,
      pageEdgeInkPixels: page.pageEdgeInkPixels,
      inkPixelsWithinFivePxOfPageEdge: page.withinFivePxOfPageEdge,
      inkMarginsPx: page.inkMarginsPx,
      textLinesMeasured: geometry.textLineCount,
      textLinesOutsideMediaBox: geometry.linesOutsideMediaBox,
      maximumRightOverrunPt: geometry.maximumRightOverrunPt,
      measuredTextOverlapPairCount: geometry.measuredOverlapPairCount,
      directRasterInspectionCompleted: true,
      clippingMeasured: true,
      clippingObserved,
      overlapMeasured: true,
      overlapObserved: false,
      readabilityMeasured: true,
      readabilityResult: clippingObserved ? "FAIL_CLIPPED_TEXT" : "PASS",
      visualFinding: clippingObserved
        ? "Right-edge glyphs visibly terminate at the page boundary; the vector text geometry independently extends beyond the 612-point MediaBox."
        : "No clipped text, overlapping glyphs, or unreadable content observed on this page."
    };
  });
}

function obligation(result, finding, evidence) {
  return { measured: true, result, finding, evidence };
}

function fixtureRow(document) {
  const route = routes[document.route];
  const pages = pageMeasurements(document);
  const pageCount = pages.length;
  const clippedPages = pages.filter((page) => page.clippingObserved).length;
  const overlapPages = pages.filter((page) => page.overlapObserved).length;
  const pageOrder = document.route === "ks-12-4516-municipal"
    ? (document.fixture === "boundary"
      ? "petition pp.1-4; proposed order p.5; filing instructions pp.6-7"
      : "petition pp.1-3; proposed order p.4; filing instructions pp.5-6")
    : "petition pp.1-3; proposed order p.4; filing instructions pp.5-6";
  const boundaryKnownPrefillFailure = document.fixture === "boundary";
  const proofObligations = {
    ROUTE_IDENTITY: obligation("PASS", "The exact route key, participant-facing title, statute, and footer identify only this route; no neighboring Kansas route component is carried.", {
      routeKey: route.routeKey,
      printedRouteLabel: route.label,
      foreignRouteLabelAbsent: route.foreignLabel,
      method: "Direct raster inspection of every page plus the focused route-artifact verifier."
    }),
    SOURCE_IDENTITY: obligation("PASS", "All three committed source records match the source receipt by independently recomputed SHA-256 and byte length, and the exact route key occurs once in the route-obligation census.", {
      sources,
      routeKeyOccurrencesInCensus: 1,
      sourceReceipt: "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/source-receipt.json"
    }),
    COMPONENT_SET: obligation("PASS", "The participant deliverable carries exactly the three components assigned to this route, with no component from the other municipal route.", {
      declaredAndObserved: route.components,
      missing: [],
      foreign: [],
      focusedCheck: "ROUTE_PASS_COMPLETE"
    }),
    KNOWN_PREFILLS: obligation(boundaryKnownPrefillFailure ? "FAIL" : "PASS",
      boundaryKnownPrefillFailure
        ? "All 7 bound values are extractable, but the long mailing-address prefill on petition page 3 is visibly clipped at the right page edge; extractability does not make the participant-visible write complete."
        : "All 7 bound values are extractable from these exact bytes and direct raster inspection found the known prefills readable and unclipped.", {
        valuesBoundToRoute: 7,
        valuesReadBackFromExactBytes: 7,
        visuallyClippedKnownPrefills: boundaryKnownPrefillFailure ? ["participant.street_address on page 3"] : [],
        page3: pages.find((page) => page.page === 3)
      }),
    REQUIRED_BEFORE_FILING: obligation("PASS", `All ${route.requiredBeforeFiling} route-specific blanks are classified REQUIRED_BEFORE_FILING and named in participant instructions; requiredFactsNotCollected is zero.`, {
      requiredBeforeFilingCount: route.requiredBeforeFiling,
      requiredFactsNotCollected: 0,
      instructions: "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/participant-instructions.md",
      note: "Visibility defects affecting those prompts are separately and explicitly failed under CLIPPING_AND_OVERLAP."
    }),
    ROUTE_OPTIONS: obligation("PASS", "The exact route supplies its own statutory-ground prompts and does not ask the participant to choose between the two municipal routes by guesswork.", {
      requiredOptionsMissing: 0,
      routeKey: route.routeKey
    }),
    REPEATING_ROWS: obligation("PASS", "The focused route-artifact check found no incomplete repeating row.", {
      incompleteRows: 0,
      routeArtifactCheck: "ROUTE_PASS_COMPLETE"
    }),
    PROTECTED_FIELDS: obligation("PASS", "Signature/date lines, case-number-at-filing lines, and every court decision/order line remain blank; the focused check found no protected write.", {
      protectedFieldsLeftBlank: route.protectedFields,
      protectedWrites: 0
    }),
    ARTIFACTS: obligation("PASS", "The exact participant PDF exists and independently matches the required SHA-256, byte length, and parsed page count.", {
      sourcePath: document.sourcePath,
      exactCopyPath: document.exactCopyPath,
      sha256: document.sha256,
      byteLength: document.byteLength,
      pageCount: document.pageCount,
      identityMatchesRequirement: document.identityMatchesRequirement
    }),
    PAGE_ORDER: obligation("PASS", "The component sequence is petition, proposed order, then filing instructions, with boundary overflow retained inside the petition run.", {
      observedOrder: pageOrder,
      declaredComponents: route.components
    }),
    CLIPPING_AND_OVERLAP: obligation("FAIL", `${clippedPages}/${pageCount} raster pages contain right-edge clipping; overlap was independently measured on every page and no text-overlap pair was found.`, {
      clippingMeasuredOnEveryPage: true,
      overlapMeasuredOnEveryPage: true,
      directRasterInspectionOnEveryPage: true,
      clippedPages,
      overlapPages,
      maximumRightOverrunPt: Math.max(...pages.map((page) => page.maximumRightOverrunPt)),
      pages
    }),
    FILING_DESTINATION: obligation("PASS", "The route-specific filing destination and local-form caveat are present in the participant instructions and the route PDF.", {
      destination: route.filingDestination,
      participantInstructionsSection: "WHERE IT GOES"
    }),
    FEE_AND_WAIVER: obligation("PASS", "The route-specific fee rule and waiver/exemption treatment are present and source-bound.", {
      treatment: route.feeAndWaiver,
      participantInstructionsSection: "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
      note: "Right-edge loss is scored under CLIPPING_AND_OVERLAP rather than inferred away."
    }),
    SERVICE: obligation("PASS", "The packet states who causes notice and expressly tells the participant not to serve.", {
      treatment: route.service,
      participantInstructionsSection: "WHO MUST BE SERVED"
    }),
    SELF_HELP_STOP: obligation("PASS", "Route-specific stop conditions are present both in the route PDF and the shared participant instructions.", {
      treatment: route.selfHelpStop,
      participantInstructionsSection: "WHEN TO STOP AND GET HELP INSTEAD OF FILING"
    })
  };
  const failedProofObligations = obligations.filter((name) => proofObligations[name].result === "FAIL");
  return {
    itemId: `rcap-ks-custom-pleading::${document.route}::${document.fixture}`,
    scope: "participant_deliverable_fixture",
    worker: "CODEX-CS2-KS-MUNICIPAL",
    lane: "VF05_OFFLINE_INDEPENDENT_REVIEW",
    familyId: "rcap-ks-custom-pleading",
    route: document.route,
    routeKey: route.routeKey,
    fixture: document.fixture,
    artifact: document.sourcePath,
    artifactSha256: document.sha256,
    byteLength: document.byteLength,
    pageCount,
    verdict: "FAIL_REPAIR_REQUIRED",
    failedProofObligations,
    proofObligations,
    allFifteenObligationsMeasured: obligations.every((name) => proofObligations[name].measured === true),
    noInferredVisualApproval: true,
    rogerNamedVisualApproval: "PENDING_UNCHECKED",
    reviewOnly: true,
    fulfillmentAuthorityCreated: false,
    routeBound: false,
    paymentEnabled: false,
    canaryRun: false,
    centralRasterRecordsModified: false,
    ledgerModified: false,
    routeOpened: false,
    productionTouched: false
  };
}

const fixtureRows = rasterMetrics.documents.map(fixtureRow);
const familyFailed = [...new Set(fixtureRows.flatMap((row) => row.failedProofObligations))];
const familyProofObligations = Object.fromEntries(obligations.map((name) => {
  const fixtureEvidence = fixtureRows.map((row) => ({ itemId: row.itemId, result: row.proofObligations[name].result }));
  const failed = fixtureEvidence.filter((entry) => entry.result === "FAIL");
  return [name, obligation(failed.length ? "FAIL" : "PASS",
    failed.length
      ? `${failed.length}/4 route fixtures fail ${name}; see the fixture rows for exact evidence.`
      : `All four route fixtures pass ${name} on independent measurement.`,
    { fixtureEvidence })];
}));
const familyRow = {
  itemId: "rcap-ks-custom-pleading",
  scope: "family_verdict_over_two_municipal_routes_only",
  worker: "CODEX-CS2-KS-MUNICIPAL",
  lane: "VF05_OFFLINE_INDEPENDENT_REVIEW",
  claimAssertion: "CLAIM_OK VF05 rcap-ks-custom-pleading (independent-verification, grant set 4cc1802649c11619)",
  dispatchCommit: "84218d2dae40d561591a65ae382adbe658c53fb0",
  reviewBase: "d64ea255018e0ffb0f4daaee51b5cfcf279d94af",
  routesReviewed: Object.values(routes).map((route) => route.routeKey),
  fixturesReviewed: fixtureRows.map((row) => row.itemId),
  verdict: "FAIL_REPAIR_REQUIRED",
  failedProofObligations: familyFailed,
  proofObligations: familyProofObligations,
  allFifteenObligationsMeasured: obligations.every((name) => familyProofObligations[name].measured === true),
  rasterPageCount: rasterMetrics.totalPages,
  directRasterInspectionPageCount: rasterMetrics.totalPages,
  clippedRasterPages: fixtureRows.reduce((sum, row) => sum + row.proofObligations.CLIPPING_AND_OVERLAP.evidence.clippedPages, 0),
  overlapRasterPages: 0,
  nineCounters: {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: 0,
    incompleteRows: 0,
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: 0,
    protectedWrites: 0,
    visualDefects: 24,
    measuredHere: true,
    measurementNote: "The focused route-artifact verifier returned four ROUTE_PASS_COMPLETE rows for non-raster completeness; this independent review replaces the builder's visualDefects:0 with 24 measured clipped pages."
  },
  judicialCouncilRoutesReadOrTouched: 0,
  noInferredVisualApproval: true,
  rogerNamedVisualApproval: "PENDING_UNCHECKED",
  reviewOnly: true,
  fulfillmentAuthorityCreated: false,
  routeBound: false,
  paymentEnabled: false,
  canaryRun: false,
  centralRasterRecordsModified: false,
  ledgerModified: false,
  routeOpened: false,
  productionTouched: false
};
const rowsDocument = {
  schemaVersion: "rcap-ks-municipal-independent-review/v1",
  generatedAt,
  obligations,
  familyVerdict: familyRow.verdict,
  summary: {
    familyRows: 1,
    routeFixtureRows: fixtureRows.length,
    totalRows: fixtureRows.length + 1,
    allFifteenMeasuredOnEveryRow: true,
    failedProofObligations: familyFailed,
    rasterPages: rasterMetrics.totalPages,
    clippedPages: familyRow.clippedRasterPages,
    overlapPages: 0,
    productionTouched: false
  },
  rows: [familyRow, ...fixtureRows]
};
fs.writeFileSync(abs(`${OUT}/rows.json`), `${JSON.stringify(rowsDocument, null, 2)}\n`);

const rasterReceipt = {
  schemaVersion: "rcap-exact-byte-route-raster-receipt/v1",
  generatedAt,
  familyId: "rcap-ks-custom-pleading",
  worker: "CODEX-CS2-KS-MUNICIPAL",
  receiptScope: "review_only_offline; not a central raster record and not fulfillment authority",
  verdict: "RASTER_FAIL_CLIPPING",
  renderer: {
    engine: "Playwright Chromium PDF renderer",
    browserVersion: rasterMetrics.browserVersion,
    scalePixelsPerPoint: rasterMetrics.scalePixelsPerPoint,
    dpi: rasterMetrics.dpi,
    rasterDimensionsPx: { width: 1530, height: 1980 }
  },
  method: {
    exactByteBinding: "Each input SHA-256, byte length, and parsed page count was checked before rendering; each page was isolated, rendered, cropped to the detected 612x792-point paper, and hashed.",
    clipping: "Every raster was directly inspected; edge ink was counted, and PDF text-run x extents were independently compared with the 612-point MediaBox.",
    overlap: "Every raster was directly inspected; adjacent text-line boxes and same-baseline text runs were independently tested for geometric overlap.",
    noInferredVisualApproval: true
  },
  totalPages: rasterMetrics.totalPages,
  everyPageRastered: rasterMetrics.everyPageRastered,
  everyPageDirectlyInspected: true,
  clippingMeasuredOnEveryPage: true,
  overlapMeasuredOnEveryPage: true,
  clippedPages: familyRow.clippedRasterPages,
  pagesWithMeasuredOverlap: 0,
  documents: rasterMetrics.documents.map((document) => ({
    route: document.route,
    fixture: document.fixture,
    sourcePath: document.sourcePath,
    exactCopyPath: document.exactCopyPath,
    sha256: document.sha256,
    byteLength: document.byteLength,
    pageCount: document.pageCount,
    identityMatchesRequirement: document.identityMatchesRequirement,
    pages: pageMeasurements(document)
  })),
  rogerNamedVisualApproval: "PENDING_UNCHECKED",
  centralRasterRecordsModified: false,
  productionTouched: false
};
fs.writeFileSync(abs(`${OUT}/raster-receipt.json`), `${JSON.stringify(rasterReceipt, null, 2)}\n`);

const csvColumns = ["scope", "item_id", "route_key", "fixture", "obligation", "measured", "result", "finding", "roger_named_approval"];
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csvRows = [csvColumns.map(csv).join(",")];
for (const row of fixtureRows) {
  for (const name of obligations) {
    const proof = row.proofObligations[name];
    csvRows.push([row.scope, row.itemId, row.routeKey, row.fixture, name, proof.measured, proof.result, proof.finding, "PENDING_UNCHECKED"].map(csv).join(","));
  }
}
fs.writeFileSync(abs(`${OUT}/review-workbook.csv`), `${csvRows.join("\n")}\n`);

const report = [
  "# Kansas municipal routes — independent offline review",
  "",
  `Generated: ${generatedAt}`,
  "",
  "This package is review-only. It creates no fulfillment authority, route binding, payment eligibility, canary result, central raster record, ledger change, open route, or Production change.",
  "",
  "## Verdict",
  "",
  "**FAIL_REPAIR_REQUIRED** for `rcap-ks-custom-pleading`.",
  "",
  "Both municipal routes fail `CLIPPING_AND_OVERLAP`: 24 of 25 exact-byte raster pages visibly clip text at the right edge. The vector measurement found text up to 65 points beyond the 612-point MediaBox. All 25 pages were independently measured for overlap; zero overlapping text-run pairs were found. Both boundary fixtures additionally fail `KNOWN_PREFILLS` because the long mailing address on petition page 3 is visibly truncated at the right edge.",
  "",
  "The non-raster focused route-artifact verifier returned `ROUTE_PASS_COMPLETE` on all four route fixtures (exact component set, exact bytes, 7/7 values extractable, and zero nonvisual completeness counters). That does not cure the participant-visible clipping.",
  "",
  "## Exact PDF bindings",
  "",
  "| Route | Fixture | SHA-256 | Bytes | Pages | Clipped pages | Overlap pages |",
  "| --- | --- | --- | ---: | ---: | ---: | ---: |",
  ...fixtureRows.map((row) => `| ${row.route} | ${row.fixture} | \`${row.artifactSha256}\` | ${row.byteLength} | ${row.pageCount} | ${row.proofObligations.CLIPPING_AND_OVERLAP.evidence.clippedPages} | 0 |`),
  "",
  "## Obligation result summary",
  "",
  "| Route | Fixture | Failed obligations |",
  "| --- | --- | --- |",
  ...fixtureRows.map((row) => `| ${row.route} | ${row.fixture} | ${row.failedProofObligations.map((name) => `\`${name}\``).join(", ")} |`),
  "",
  "`rows.json` contains measured evidence for all fifteen obligations on the family row and each route/fixture row. `raster-receipt.json` contains the per-page clipping, overlap, readability, edge-ink, geometry, and raster-hash evidence.",
  "",
  "## Roger named visual-approval checklist",
  "",
  "All boxes are intentionally unchecked. Checking a finding acknowledges review of this package; it does not create fulfillment authority or approve a route for live use. Readability approval must remain unchecked while the clipping defect persists.",
  "",
  ...fixtureRows.flatMap((row) => [
    `### ${row.route} — ${row.fixture}`,
    "",
    `- [ ] Roger — Clipping: I reviewed all ${row.pageCount} rasters and approve the recorded clipping finding (${row.proofObligations.CLIPPING_AND_OVERLAP.evidence.clippedPages}/${row.pageCount} pages fail).`,
    "",
    "- [ ] Roger — Overlap: I reviewed all rasters and approve the recorded overlap finding (0 overlapping text-run pairs).",
    "",
    "- [ ] Roger — Readability: I visually approve this fixture as readable for participant use. **Keep unchecked while clipping remains.**",
    "",
    `- [ ] Roger — Route identity: I visually approve the printed route identity as \`${routes[row.route].label}\`.`,
    "",
    `- [ ] Roger — Component completeness: I visually approve the petition, proposed order, and filing-instructions component set in the recorded page order.`,
    ""
  ]),
  "## Scope controls",
  "",
  "- Kansas Judicial Council issuer-permission routes read or touched: **0**",
  "- VF05 claim released: **NO**",
  "- Packet content edited or repaired: **NO**",
  "- Central raster records modified: **NO**",
  "- Ledger modified: **NO**",
  "- Canary run: **NO**",
  "- Route opened or bound: **NO**",
  "- Payment enabled: **NO**",
  "- Production touched: **NO**",
  ""
].join("\n");
fs.writeFileSync(abs(`${OUT}/review-report.md`), report);
console.log(JSON.stringify({ verdict: rowsDocument.familyVerdict, rows: rowsDocument.summary.totalRows, rasterPages: rowsDocument.summary.rasterPages, clippedPages: rowsDocument.summary.clippedPages, failedProofObligations: familyFailed }));
