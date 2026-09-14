// Present current release obligations in the existing controlling record.
// This module creates no route, output approval, or deployment authority.
export function applyNationalReleaseControl(doc, worklist, factory) {
  const reconciliation = worklist.releaseReconciliation;
  if (!reconciliation) throw new Error('Current national release reconciliation is required');
  const families = factory.families;
  const ids = new Set(families.map(row => row.familyId));
  if (ids.size !== families.length) throw new Error('Duplicate factory family identity');
  const worklistIds = new Set(worklist.families.map(row => row.familyId));
  if (worklistIds.size !== worklist.families.length || worklist.families.length !== families.length || worklist.families.some(row => !ids.has(row.familyId))) {
    throw new Error('Release worklist does not cover exact current factory identities');
  }
  const terminal = new Set(['COMPLETE_PACKET_PROVEN', 'GUIDANCE_READY', 'HANDOFF_READY', 'OUT_OF_SCOPE']);
  const byDisposition = {};
  for (const family of families) byDisposition[family.state] = (byDisposition[family.state] ?? 0) + 1;
  doc.historicalSections = {
    sections: ['denominator', 'frozenCategoryB', 'categoryBIntegration', 'waveOne', 'legalWork', 'sourceWork'],
    meaning: 'Preserved census and earlier-wave records. They do not describe current release obligations or authorize renewed packet production.'
  };
  doc.releaseReconciliation = reconciliation;
  doc.packetFamilies = {
    record: 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json',
    total: families.length,
    terminal: families.filter(row => terminal.has(row.state)).length,
    byDisposition,
    completePacketProven: byDisposition.COMPLETE_PACKET_PROVEN ?? 0,
    nonterminalFamilyIds: families.filter(row => !terminal.has(row.state)).map(row => row.familyId),
    evidence: 'Exact identities, dispositions and source/artifact/review bindings are preserved in the release worklist.'
  };
  doc.productPath = {
    record: 'data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json',
    commercialRoutesOpened: factory.totals.commercialRoutesOpened,
    fulfillment: worklist.commercial,
    rule: 'Terminal treatment, runtime reachability, output approval, route fulfillment, hosted acceptance and Production authorization are separate obligations. No state or family membership authorizes a sale.'
  };
  const gaps = reconciliation.gaps;
  if (!Array.isArray(gaps)) throw new Error('Release reconciliation must enumerate exact gaps');
  doc.exactBlockers = gaps;
  doc.launchGate = { gateOpen: false, nationalScope: 'All 50 states plus DC', gapsRecord: doc.productPath.record, remainingObligations: gaps.length };
  doc.testStatus = {
    currentness: 'Must pass against these generated inputs before candidate freeze.',
    fullChain: 'No full-chain receipt for this release candidate is bound.',
    hostedAcceptance: 'Candidate-bound independent hosted evidence is required; historical environment receipts do not establish current acceptance.',
    productionPreflight: 'A read-only candidate-bound receipt is required. Production authorization is separate.'
  };
  // Do not carry historical environment failures forward as present facts.
  doc.participantDataRights = {
    historicalReceipt: 'data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json',
    currentAcceptance: 'Unbound: require current candidate evidence for the Product Contract section 12A gates.'
  };
  doc.lineage.productionConnected = null;
  doc.lineage.productionConnectedEvidence = 'Not observed by this generator; read-only preflight supplies evidence separately.';
  doc.goHold = {
    decision: 'HOLD',
    because: `${doc.packetFamilies.terminal}/${families.length} families are terminal. Release obligations and candidate authorization remain separate; final family baseline status: ${reconciliation.baseline.status}.`,
    whatWouldChangeIt: 'Bind the pushed final 346-family closeout, satisfy the exact national release obligations, freeze application SHA and worker digest, pass currentness and the full required chain, independently accept the hosted candidate, prove rollback and read-only Production preflight, then obtain exact Production authorization.'
  };
  return doc;
}

export function renderNationalReleaseControl(doc) {
  const rows = Object.entries(doc.packetFamilies.byDisposition).map(([state, count]) => `| ${state} | ${count} |`);
  return [
    '# Grade-A launch status', '',
    '_Generated from the existing GRADE_A_LAUNCH_CONTROL.json; this page has no independent authority._', '',
    `**GO/HOLD: ${doc.goHold.decision}.** ${doc.goHold.because}`, '',
    `Captain input SHA: \`${doc.lineage.captainSha}\`.`, '',
    `National scope: ${doc.launchGate.nationalScope}.`, '',
    '| Factory disposition | Families |', '| --- | ---: |', ...rows,
    `| Total | ${doc.packetFamilies.total} |`, `| Terminal | ${doc.packetFamilies.terminal} |`, '',
    'Exact family and route obligations, including unchanged evidence bindings:',
    '`data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`.', '',
    `Remaining enumerated obligations: ${doc.launchGate.remainingObligations}.`, '',
    doc.productPath.rule, '',
    ...Object.entries(doc.testStatus).map(([name, status]) => `- **${name}**: ${status}`), '',
    doc.goHold.whatWouldChangeIt, '',
    'Earlier census and wave records remain in the controlling JSON under explicitly historical sections. They are not current dispatch instructions.', ''
  ].join('\n');
}
