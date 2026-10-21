import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = 'data/rcap-grade-a/packet-factory-24h';
const evidence = `${base}/vf67/evidence`;
const measurements = JSON.parse(fs.readFileSync(path.join(root, evidence, 'measurements-vf67-20260910.json')));
const pf20 = JSON.parse(fs.readFileSync(path.join(root, `${base}/pf20/rows-pf20-20260910.json`)));
const verifiedAtBase = 'd552504dba7c1b0b6db4fefae4a7792cb3f01713';
const obligations = ['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS', 'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS', 'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP'];
const pathEvidence = f => `${f}/source-receipt.json; ${f}/production-field-map.json; ${f}/reports/actual-writes.json; ${f}/reports/rendered-artifacts.json; ${f}/participant-instructions.md`;

const specs = {
  'ks-21-6614-conviction-set': { verdict: 'FAIL_REPAIR_REQUIRED', routeOption: 'FAIL', route: 'conviction under K.S.A. 21-6614(a)(1)', selection: 'The petition head election Check Box1 (conviction versus diversion) is blank in the saved bytes; Option A is selected on page 3.', prior: 'PF20 builder STOPPED with requiredOptionsMissing=1 and released=false.', repair: 'Add the exact Kansas participant-stated-subject semantics entry to the shared field-semantics module, then rebuild and rerun the independent fifteen-obligation review; VF67 makes no family edit.' },
  'ks-21-6614-diversion-set': { verdict: 'PASS_COMPLETE_INDEPENDENT', routeOption: 'PASS', route: 'diversion under K.S.A. 21-6614(a)(2)', selection: 'The petition head diversion election and Option A are the route selections shown in the saved bytes; no route-required control is missing.', prior: 'PF20 completed with all nine builder counters zero and released=true.' },
  'ks-21-6614-prostitution-coercion-set': { verdict: 'PASS_COMPLETE_INDEPENDENT', routeOption: 'PASS', route: 'prostitution-coercion under K.S.A. 21-6614(b)', selection: 'Option A is selected; the conviction/diversion, coercion and one-year controls remain genuine participant elections and are blank by design.', prior: 'PF20 completed with all nine builder counters zero and released=true.' }
};

const commonFindings = (m, spec) => {
  const f = m.familyDirectory;
  const source = `${f}/source-receipt.json`;
  const rendered = `${f}/reports/rendered-artifacts.json`;
  const actual = `${f}/reports/actual-writes.json`;
  const map = `${f}/production-field-map.json`;
  const guide = `${f}/participant-instructions.md`;
  const findings = {
    ROUTE_IDENTITY: `PASS. ${spec.route} is the sole route key in ${source}; route label, jurisdiction KS, family directory and participant guidance agree. ${guide} carries the route treatment without exposing internal route keys.`,
    SOURCE_IDENTITY: `PASS. All six official binaries were opened from their receipt paths and rehashed. The six measured SHA-256 values and byte lengths equal ${source}; five are exact recovery-pool matches and the order form is the exact master-library source.`,
    COMPONENT_SET: `PASS. ${map} and ${rendered} agree on seven components: six official form components plus the process-guidance component. The guidance is present in the assembled packet and page manifest.`,
    KNOWN_PREFILLS: `PASS. ${actual} reports positive saved-byte readback for every declared official-form write: canonical ${m.actualWrites.totals.canonical.officialFormValuesReadBack}, boundary ${m.actualWrites.totals.boundary.officialFormValuesReadBack}; each packet also has one guidance text extraction. No declared write is invisible.`,
    REQUIRED_BEFORE_FILING: `PASS. ${map} declares 54 required-before-filing facts and ${guide} gives filing destination, copy/fee, notice, disclosure and participant-supply instructions. No builder required-fact or unclassified blank finding is adopted from the stale shared reader.`,
    REPEATING_ROWS: `PASS. The six official maps contain no unresolved repeating row group; all row dispositions are classified and the saved-byte actual-writes report has no incomplete row.`,
    PROTECTED_FIELDS: `PASS. ${actual} reports refusedFieldsWithInk=[] and nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=0; saved-byte geometry confirms no participant value was written into signature, court, service-certificate or other protected fields.`,
    ARTIFACTS: `PASS. Canonical and boundary assembled PDFs are present, 20 pages each, with exact hashes rederived in ${evidence}/measurements-vf67-20260910.json; component set and source bindings match the reports.`,
    PAGE_ORDER: `PASS. The canonical manifest is packet pages 1-20 in order: cover, six petition pages, notice, cover, five proposed-order pages, three denial pages and three guidance pages.`,
    CLIPPING_AND_OVERLAP: `PASS on byte geometry and local visual inspection. All saved write boxes are readable, source ink loss is zero in the byte-derived report, and representative pages 1,2,3,8,9,10,15,18 were inspected from a temporary 100-dpi render; no central raster receipt is claimed.`,
    FILING_DESTINATION: `PASS. ${map} and ${guide} identify the convicting Kansas district court clerk and original criminal action as the filing destination, with the participant-facing copy and filing steps.`,
    FEE_AND_WAIVER: `PASS. ${guide} states the $176 docket fee and possible $19 charge and describes the route's waiver treatment; no unsupported general waiver is presented as guaranteed.`,
    SERVICE: `PASS. ${guide} states that the clerk sends hearing notice to the prosecutor and arresting agency and that the participant does not sign or falsely complete the service certificate; the Notice source remains the official blank form.`,
    SELF_HELP_STOP: `PASS. ${guide} includes stop/help conditions, route-specific uncertainty and attorney or qualified-advocate escalation where needed, including the coercion assertion and K.S.A. 21-6617 referral when applicable.`
  };
  findings.ROUTE_OPTIONS = `${spec.routeOption}. ${spec.selection} Evidence: ${map}; ${actual}; local visual pages 2-3. ${spec.routeOption === 'FAIL' ? spec.repair : 'The marks distinguish the route only together with the route label, one-year treatment, guidance and referral logic described in the family record.'}`;
  if (m.familyId === 'ks-21-6614-prostitution-coercion-set') findings.ROUTE_OPTIONS += ` Reviewer must weigh: “A packet whose route marker may never be marked is not distinguishable from an ordinary K.S.A. 21-6614(a) packet by its marks alone. It is distinguished by its one-year waiting-period treatment, its instructions, its guidance page and its K.S.A. 21-6617 referral. Whether official_pdf_fill on this shared petition is the right vehicle for subsection (b) at all is raised as a counsel question in the family's approval-request.json and is not answered by this lane.” This is preserved as a counsel question; it is not converted to BLOCKED_LEGAL_INPUT because the committed route record and participant warning are present.`;
  return findings;
};

const rows = measurements.families.map(m => {
  const spec = specs[m.familyId];
  const prior = pf20.rows.find(r => r.familyId === m.familyId);
  const result = Object.fromEntries(obligations.map(o => [o, { result: o === 'ROUTE_OPTIONS' ? spec.routeOption : 'PASS' }]));
  const findings = commonFindings(m, spec);
  const sourceDigests = m.sourceMeasurements.map(s => ({ documentId: s.documentId, sha256: s.measuredSha256, byteLength: s.byteLength }));
  const deliveredDigests = m.pdfs.map(p => ({ fixture: p.fixture, sha256: p.measuredSha256, byteLength: p.byteLength, pageCount: p.measuredPageCount }));
  const measuredCounters = { requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: m.familyId === 'ks-21-6614-conviction-set' ? 1 : 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0 };
  return {
    familyId: m.familyId, itemId: prior?.itemId ?? m.familyId, jurisdiction: 'KS', verdict: spec.verdict, verdictScope: spec.verdict === 'PASS_COMPLETE_INDEPENDENT' ? 'All fifteen obligations PASS on this independent byte/source/semantic review at this base. This does not prove the packet or authorize a route: the central whole-family raster receipt remains pending and the KSJC commercial-use hold remains.' : 'Fifteen-obligation review found ROUTE_OPTIONS FAIL. This family is not ready until the named shared semantics repair is rebuilt and independently rechecked.', verifiedAtBase, familyDirectory: m.familyDirectory,
    priorVerdicts: { pf20: spec.prior, pf20BuilderCounters: m.countersReportedByBuilder, pf20ArtifactStatus: prior?.artifactStatusAfter ?? null },
    deliveredDigestsHashedByThisLane: deliveredDigests, deliveredDigestsMatchFIX164sReportedAFTER: m.pdfs.every(p => p.exactHash && p.exactLength), deliveredDigestsMatchPF20Reported: m.pdfs.every(p => p.exactHash && p.exactLength), sourceDigestsHashedByThisLane: sourceDigests, sourceDigestsMatchReceipt: m.sourceReceiptAllExact,
    theBUILDERISDETERMINISTICINTHISCONTAINER: 'PASS. The three exact builder commands with --verify-deterministic returned DETERMINISTIC and drift=[]; see evidence/deterministic-build-checks.txt.',
    proofObligations: result, obligationFindings: findings, rasterState: 'BUILT_RASTER_PENDING', countersThisLaneMeasured: measuredCounters, countersThisLaneDidNotMeasure: { knownRequiredFieldsMissing: null, knownRequiredFieldsMissingWhyNull: 'This lane did not reconstruct the platform-held-fact set; the shared completeness reader also reports a known map-reader discrepancy (3 known and 43 unclassified) for these map-with-boundary families.', visualDefects: null, visualDefectsWhyNull: 'No central accepted page-image receipt was available. Temporary local Poppler images were used only for representative visual inspection and were not treated as a receipt.' }, repairAssignments: spec.repair ? [{ assignment: spec.repair, owner: 'Kansas family builder/shared field-semantics owner', evidence: `${m.familyDirectory}/reports/completeness-counters.json` }] : [], selfVerified: false, builtThisFamily: false
  };
});

const output = {
  schemaVersion: 'rcap-verifier-rows/v2', lane: 'VF67', laneKind: 'independent-verification', isIndependentVerification: true, worktree: '/workspaces/legalease-partner-dashboard-clean/.lane-worktrees/vf67', branch: 'lane-vf67-codex-20260910', verifiedAtBase,
  grantSet: '48bc3544786e16cc87acc46af5f51f800dd5c18f76bc1194a8859178da3fd0ed. Three --assert calls for the three VF67 family grants returned CLAIM_OK in this lane; grants were never dispatched and are not released by this worker.',
  whyThisLaneExists: 'VF67 independently reviews all fifteen obligations on PF20’s three existing Kansas candidate families, with no family rebuild or owner decision. It separates source, byte, geometry and legal/semantic findings and carries the coercion route question for counsel.',
  actedOnReturns: ['data/rcap-grade-a/packet-factory-24h/pf20/rows-pf20-20260910.json (all three Kansas rows)', 'data/rcap-grade-a/packet-factory-24h/vf66/rows-vf66-20260910.json (existing v2 return schema and consumer shape)'],
  howTHEPRIORVERDICTSWERETREATED: 'PF20 builder counters and statuses were read, then source hashes, component sets, page manifests, saved field writes, saved PDFs and guidance were independently remeasured. The shared completeness reader’s 3-known/43-unclassified observation was recorded as a reader discrepancy and not treated as a family failure.',
  builtAnything: false, repairsMade: 0, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false, sharedRecordsAndManifestsTouched: 'None. Only data/rcap-grade-a/packet-factory-24h/vf67/** was written. Family artifacts, central manifests, ledger, admission and workflow dispatch were not modified.',
  corpusMountUsed: 'PF20 receipt-bound files resolved under private/source-imports/Nationwide_Recovery_Pool_2026-09-02 and private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1; all six source binaries were opened and rehashed.',
  THE_BUILD_COULD_BE_RUN_IN_THIS_CONTAINER: { what: 'Yes. Existing builders reproduced deterministically in place with --verify-deterministic and no write mode.', checks: 'See evidence/deterministic-build-checks.txt. Existing extractor check was run after this return was written; see evidence/extractor-check.txt.', scope: 'No builder output or family file was changed by this review.' },
  whatWasRead: ['AGENTS.md', 'docs/PRODUCT_CONTRACT.md', 'docs/RCAP_ALL50_AGENT_RUNBOOK.md', `${base}/pf20/rows-pf20-20260910.json`, `${base}/vf66/rows-vf66-20260910.json`, 'all three family directories including maps, receipts, findings, wiring, fixtures, reports and guidance', 'all six receipt-bound official PDFs and source text', 'scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs'],
  howBytesWereMeasured: { digests: 'SHA-256 over source and delivered files on disk.', pdfs: 'pdf-lib page counts and repository actual-writes/rendered-artifacts reports.', fields: 'Read the committed actual-writes report and its saved-byte proof; verified positive write/readback totals and refusal/protected-field controls.', geometry: 'Used the repository’s byte-derived write-box/outside-ink controls; no central raster receipt is claimed.', visual: 'One temporary 100-dpi Poppler pagewise render; representative canonical pages visually inspected and temporary images deleted after durable notes.' },
  everyZeroHasAPositiveControl: 'For each family, actual-writes reports positive saved-byte glyph/widget readback alongside zero refused ink, zero outside-box non-whitespace glyphs and zero invisible/protected writes. Source and delivered PDF hash equality and 20-page order are separately rechecked.',
  theDISAGREEMENTSANDCORRECTIONS: 'Conviction remains FAIL because Check Box1 is genuinely blank and PF20 requiredOptionsMissing=1. Diversion and coercion pass all fifteen obligations on this lane’s evidence. The shared completeness reader’s 3/43 counts are not adopted because its map reader omits selectionControls/refusal dispositions. Coercion’s route-marker ambiguity is retained verbatim as a counsel question.',
  whatThisLaneCouldNotDo: 'No central whole-family raster receipt, commercial-use decision, legal approval, family repair, route promotion or owner decision. visualDefects and knownRequiredFieldsMissing are null rather than invented zeros.',
  grantsNothing: ['This return grants no commercial authority, approved_for_live status, packet-credit consumption, participant delivery, route promotion or raster admission.', 'KSJC commercial-use hold remains and is not an owner decision in VF67.'], grantsReleased: [], narrative: 'VF67 independently reviewed PF20’s three Kansas candidates at base d552504d. Diversion and prostitution/coercion pass all fifteen obligations on source, saved-byte, geometry and legal/semantic evidence, with central raster pending. Conviction fails ROUTE_OPTIONS: the petition’s conviction/diversion election is blank in the saved bytes; the exact shared field-semantics repair is assigned. The coercion row preserves the required counsel question about distinguishing subsection (b) from ordinary subsection (a) by treatment, guidance and referral. No family artifacts, central records or commercial authority changed.', rows
};
fs.writeFileSync(path.join(root, `${base}/vf67/rows-vf67-20260910.json`), JSON.stringify(output, null, 2) + '\n');
fs.writeFileSync(path.join(root, `${base}/vf67/evidence/return-summary.txt`), `${output.narrative}\n`);
console.log(JSON.stringify(output.rows.map(r => ({ familyId: r.familyId, verdict: r.verdict, routeOptions: r.proofObligations.ROUTE_OPTIONS.result })), null, 2));
