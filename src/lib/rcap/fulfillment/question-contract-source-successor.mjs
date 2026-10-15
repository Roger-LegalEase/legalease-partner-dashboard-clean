import crypto from 'node:crypto';

// A technical source transition, not a replacement owner/legal approval.
// Build callers also check current output inputs with the separate function
// below. Runtime callers provide statically traced evidence bytes and retain
// their existing historical approval, provider and final-verification gates.
export const QUESTION_CONTRACT_SUCCESSOR_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-successor-20261011.json';
export const QUESTION_CONTRACT_SUCCESSOR_SHA256 = '507dc8d70767149628150262b6757205e28a38dca0e2d2bafc23799b168222ac';
export const QUESTION_CONTRACT_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261011.json';
export const MS_QUESTION_CONTRACT_PREDECESSOR_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-predecessors/MS-nonconviction-expungement-99-19-71-4.c63e420.json';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const insist = (ok, message) => { if (!ok) throw new Error(`Question-contract source successor refused: ${message}`); };
const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
  return value;
}
const equal = (a, b) => canonical(a) === canonical(b);

export function readQuestionContractSuccessor(readBytes) {
  const bytes = readBytes(QUESTION_CONTRACT_SUCCESSOR_PATH);
  insist(sha(bytes) === QUESTION_CONTRACT_SUCCESSOR_SHA256, 'receipt bytes changed');
  const receipt = JSON.parse(bytes.toString('utf8'));
  assertReceiptScope(receipt);
  return receipt;
}

function assertReceiptScope(receipt) {
  insist(receipt.schemaVersion === 'rcap-question-contract-source-successor/v1'
    && receipt.recordId === 'QUESTION-CONTRACT-SOURCE-SUCCESSOR-20261011'
    && receipt.kind === 'technical_source_and_output_continuity', 'receipt identity');
  for (const key of ['createsOwnerApproval', 'changesApprovedOutputBytes', 'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'productionAuthorized']) {
    insist(receipt[key] === false, `receipt overclaims ${key}`);
  }
  insist(Array.isArray(receipt.routes) && receipt.routes.length === 6
    && new Set(receipt.routes.map(row => row.routeId)).size === 6, 'exact route inventory');
}

/** Return a named transition only; an unlisted route cannot borrow a sibling. */
export function questionContractTransitionFor({ routeId, familyId, trackId, specificationPath, readBytes }) {
  const receipt = readQuestionContractSuccessor(readBytes);
  const rows = receipt.routes.filter(row => row.routeId === routeId);
  if (rows.length === 0) return null;
  insist(rows.length === 1, 'duplicate route');
  const row = rows[0];
  insist(row.familyId === familyId && row.trackId === trackId && row.specification.path === specificationPath, 'route/family/track/path mismatch');
  return { receipt, row };
}

function checkedProof(receipt, readBytes) {
  insist(receipt.outputProof?.path === QUESTION_CONTRACT_OUTPUT_PATH, 'output proof path');
  const bytes = readBytes(QUESTION_CONTRACT_OUTPUT_PATH);
  insist(sha(bytes) === receipt.outputProof.sha256, 'output proof bytes changed');
  const proof = JSON.parse(bytes.toString('utf8'));
  insist(proof.schemaVersion === 'isolated-current-six-commercial-output/v2'
    && proof.approvalGranted === false && proof.commercialAuthorityGranted === false
    && proof.productionAuthorized === false && proof.protectedJourneyProven === false, 'output proof scope');
  insist(equal(proof.denominator, { routes: 6, families: 5, variants: 18 })
    && equal(proof.counts, { routes: 6, outputs: 18, byteIdentical: 18, pass: 130, fail: 0 })
    && Array.isArray(proof.sourceDrift) && proof.sourceDrift.length === 0
    && proof.checks.length === 130 && proof.checks.every(check => check.status === 'PASS'), 'output acceptance incomplete');
  insist(proof.routes.length === 6 && new Set(proof.routes.map(row => row.routeId)).size === 6, 'output route inventory');
  return proof;
}

// The original immutable source transition and its owner/review ancestry remain
// unchanged. Only build-time freshness uses this separately pinned reproduction.
export const QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261013.json';
export const QUESTION_CONTRACT_EARLIER_CONTINUITY_SHA256 = 'c3560d21797c76e2628fc96f90637fbde5300d10236930cf037cf4daf24d24de';
export const QUESTION_CONTRACT_EARLIER_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261013.json';
export const QUESTION_CONTRACT_EARLIER_OUTPUT_SHA256 = '75db25c00825df662e83539969a3c48c92f51bf74aefb3ceb11b55c8de7afc9e';
export const QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261014.json';
export const QUESTION_CONTRACT_PREVIOUS_CONTINUITY_SHA256 = '714bb67d13ddb220fddbff3155ba215c85d889243f6530ff4195f8a53812d1e2';
export const QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261014.json';
export const QUESTION_CONTRACT_PREVIOUS_OUTPUT_SHA256 = '714e826b146249f654d2e465e5de0c90ca913a0e9cc01d2d7288d938cf4b819d';
export const QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015.json';
export const QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_SHA256 = 'f7acf9aeebd05942ce4abe2e0f9721a3861de4c946c5938537d09db10e0ecee6';
export const QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015.json';
export const QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_SHA256 = '99b469cf9fb5888e438069a5f36e5d8ab302e9e465979e5f69b0837ee3501ea1';
export const QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v2.json';
export const QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_SHA256 = '3b153797067097658d289447c78bdfd66434c6f747de837802b38a387420b327';
export const QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v2.json';
export const QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_SHA256 = '4b135568159ebd0d2e1861dbbf3dc96a9ea995547d02ab474a45542636d22903';
export const QUESTION_CONTRACT_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v3.json';
export const QUESTION_CONTRACT_CONTINUITY_SHA256 = '6daba3d4f6c3aa496d67e9d0b5c046de890dfb01ae136bce212ccce9eb7aa656';
export const QUESTION_CONTRACT_CURRENT_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v3.json';

/** Exposed below the immutable byte pins for non-vacuous semantic controls. */
export function assertQuestionContractOutputContinuity({ continuity, proof, readBytes }) {
  const receipt = readQuestionContractSuccessor(readBytes);
  const historical = checkedProof(receipt, readBytes);
  insist(continuity.schemaVersion === 'rcap-question-contract-output-continuity/v1'
    && continuity.recordId === 'QUESTION-CONTRACT-OUTPUT-CONTINUITY-20261015-V3'
    && continuity.kind === 'technical_source_and_output_continuity', 'continuity identity');
  for (const key of ['createsOwnerApproval', 'changesApprovedOutputBytes', 'establishesProtectedVerification',
    'establishesProviderOrPublicationProof', 'commercialAuthorityGranted', 'productionAuthorized']) {
    insist(continuity[key] === false, `continuity overclaims ${key}`);
  }
  insist(equal(continuity.historicalSuccessor, { path: QUESTION_CONTRACT_SUCCESSOR_PATH, sha256: QUESTION_CONTRACT_SUCCESSOR_SHA256 })
    && equal(continuity.historicalOutput, receipt.outputProof && { path: receipt.outputProof.path, sha256: receipt.outputProof.sha256 }), 'continuity ancestry');
  const previousContinuity = { path: QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_PREVIOUS_CONTINUITY_SHA256 };
  const previousOutput = { path: QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH, sha256: QUESTION_CONTRACT_PREVIOUS_OUTPUT_SHA256 };
  insist(equal(continuity.previousContinuity, previousContinuity)
    && equal(continuity.previousOutput, previousOutput), 'previous continuity ancestry');
  const previousContinuityBytes = readBytes(previousContinuity.path);
  const previousOutputBytes = readBytes(previousOutput.path);
  insist(sha(previousContinuityBytes) === previousContinuity.sha256, 'previous continuity bytes changed');
  insist(sha(previousOutputBytes) === previousOutput.sha256, 'previous output bytes changed');
  const previous = JSON.parse(previousOutputBytes.toString('utf8'));
  const priorContinuity = JSON.parse(previousContinuityBytes.toString('utf8'));
  insist(equal(priorContinuity.currentOutput, previousOutput), 'previous continuity ancestry');
  const earlierContinuity = { path: QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_EARLIER_CONTINUITY_SHA256 };
  const earlierOutput = { path: QUESTION_CONTRACT_EARLIER_OUTPUT_PATH, sha256: QUESTION_CONTRACT_EARLIER_OUTPUT_SHA256 };
  insist(equal(continuity.earlierContinuity, earlierContinuity) && equal(continuity.earlierOutput, earlierOutput)
    && equal(priorContinuity.previousContinuity, earlierContinuity)
    && equal(priorContinuity.previousOutput, earlierOutput), 'earlier continuity ancestry');
  const earlierContinuityBytes = readBytes(earlierContinuity.path);
  const earlierOutputBytes = readBytes(earlierOutput.path);
  insist(sha(earlierContinuityBytes) === earlierContinuity.sha256, 'earlier continuity bytes changed');
  insist(sha(earlierOutputBytes) === earlierOutput.sha256, 'earlier output bytes changed');
  insist(equal(JSON.parse(earlierContinuityBytes.toString('utf8')).currentOutput, earlierOutput), 'earlier continuity ancestry');
  const earlier = JSON.parse(earlierOutputBytes.toString('utf8'));
  const sameDatePredecessorContinuity = { path: QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_SHA256 };
  const sameDatePredecessorOutput = { path: QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH, sha256: QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_SHA256 };
  insist(equal(continuity.sameDatePredecessorContinuity, sameDatePredecessorContinuity)
    && equal(continuity.sameDatePredecessorOutput, sameDatePredecessorOutput), 'same-date predecessor ancestry');
  const sameDateContinuityBytes = readBytes(sameDatePredecessorContinuity.path);
  const sameDateOutputBytes = readBytes(sameDatePredecessorOutput.path);
  insist(sha(sameDateContinuityBytes) === sameDatePredecessorContinuity.sha256, 'same-date predecessor continuity bytes changed');
  insist(sha(sameDateOutputBytes) === sameDatePredecessorOutput.sha256, 'same-date predecessor output bytes changed');
  const sameDateContinuity = JSON.parse(sameDateContinuityBytes.toString('utf8'));
  insist(equal(sameDateContinuity.currentOutput, sameDatePredecessorOutput)
    && equal(sameDateContinuity.previousContinuity, previousContinuity) && equal(sameDateContinuity.previousOutput, previousOutput)
    && equal(sameDateContinuity.earlierContinuity, earlierContinuity) && equal(sameDateContinuity.earlierOutput, earlierOutput)
    && equal(sameDateContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(sameDateContinuity.historicalOutput, continuity.historicalOutput), 'same-date predecessor ancestry');
  const sameDate = JSON.parse(sameDateOutputBytes.toString('utf8'));
  const latestPredecessorContinuity = { path: QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_SHA256 };
  const latestPredecessorOutput = { path: QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_PATH, sha256: QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_SHA256 };
  insist(equal(continuity.latestPredecessorContinuity, latestPredecessorContinuity)
    && equal(continuity.latestPredecessorOutput, latestPredecessorOutput), 'latest predecessor ancestry');
  const latestContinuityBytes = readBytes(latestPredecessorContinuity.path);
  const latestOutputBytes = readBytes(latestPredecessorOutput.path);
  insist(sha(latestContinuityBytes) === latestPredecessorContinuity.sha256, 'latest predecessor continuity bytes changed');
  insist(sha(latestOutputBytes) === latestPredecessorOutput.sha256, 'latest predecessor output bytes changed');
  const latestContinuity = JSON.parse(latestContinuityBytes.toString('utf8'));
  insist(equal(latestContinuity.currentOutput, latestPredecessorOutput)
    && equal(latestContinuity.sameDatePredecessorContinuity, sameDatePredecessorContinuity)
    && equal(latestContinuity.sameDatePredecessorOutput, sameDatePredecessorOutput)
    && equal(latestContinuity.previousContinuity, previousContinuity) && equal(latestContinuity.previousOutput, previousOutput)
    && equal(latestContinuity.earlierContinuity, earlierContinuity) && equal(latestContinuity.earlierOutput, earlierOutput)
    && equal(latestContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(latestContinuity.historicalOutput, continuity.historicalOutput), 'latest predecessor ancestry');
  const latest = JSON.parse(latestOutputBytes.toString('utf8'));

  insist(continuity.currentOutput?.path === QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, 'continuity current output path');
  insist(proof.schemaVersion === historical.schemaVersion
    && ['approvalGranted', 'commercialAuthorityGranted', 'productionAuthorized', 'protectedJourneyProven'].every(key => proof[key] === false), 'current output proof scope');
  insist(proof.headBefore === continuity.reproducedCodeSha && proof.headAfter === proof.headBefore
    && /^[a-f0-9]{40}$/.test(proof.headBefore) && proof.statusBefore === proof.statusAfter, 'reproduction candidate drift');
  insist(equal(proof.denominator, historical.denominator) && equal(proof.counts, historical.counts)
    && equal(proof.sourceDrift, []) && Array.isArray(proof.checks) && proof.checks.length === 130
    && proof.checks.every(check => check.status === 'PASS')
    && new Set(proof.checks.map(check => check.id)).size === 130
    && equal(proof.checks.map(check => check.id).sort(), historical.checks.map(check => check.id).sort()), 'current output acceptance incomplete');
  insist(Array.isArray(proof.routes) && proof.routes.length === 6
    && new Set(proof.routes.map(row => row.routeId)).size === 6, 'current output route inventory');
  const withoutPrivateOutputLocators = row => ({ ...row, artifacts: row.artifacts.map(artifact => {
    const identity = { ...artifact };
    delete identity.path;
    return identity;
  }) });
  for (const previous of historical.routes) {
    const current = proof.routes.find(row => row.routeId === previous.routeId);
    insist(current && Array.isArray(current.artifacts) && current.artifacts.length === 3
      && equal(withoutPrivateOutputLocators(current), withoutPrivateOutputLocators(previous)), `changed output semantics: ${previous.routeId}`);
    insist(sha(readBytes(current.specificationPath)) === current.specificationSha256, 'current output specification moved');
    for (const artifact of current.artifacts) insist(sha(readBytes(artifact.historical.path)) === artifact.sha256, 'approved output bytes moved');
  }
  for (const prior of [...earlier.routes, ...previous.routes, ...sameDate.routes, ...latest.routes]) {
    const current = proof.routes.find(row => row.routeId === prior.routeId);
    insist(current && equal(withoutPrivateOutputLocators(current), withoutPrivateOutputLocators(prior)), `changed previous output semantics: ${prior.routeId}`);
  }
  for (const evidence of receipt.preservedEvidence) insist(sha(readBytes(evidence.path)) === evidence.sha256, `historical evidence changed: ${evidence.path}`);
  insist(Array.isArray(proof.sources) && proof.sources.length === 121 && continuity.currentSourceCount === 121
    && historical.sources.length === 88 && continuity.preservedSourceCount === 88
    && previous.sources.length === 118 && continuity.previousSourceCount === 118
    && latest.sources.length === 121 && continuity.latestPredecessorSourceCount === 121
    && sameDate.sources.length === 119 && continuity.sameDatePredecessorSourceCount === 119
    && earlier.sources.length === 113 && continuity.earlierSourceCount === 113
    && new Set(proof.sources.map(input => input.file)).size === 121, 'current output source inventory');
  const before = new Map(historical.sources.map(input => [input.file, input.sha256]));
  const after = new Map(proof.sources.map(input => [input.file, input.sha256]));
  insist([...before.keys()].every(file => after.has(file)), 'historical source omitted');
  insist(earlier.sources.every(input => after.has(input.file)), 'earlier source omitted');
  const additions = [...after.keys()].filter(file => !before.has(file)).sort();
  const transitions = [...before.keys()].sort().filter(file => before.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: before.get(file), afterSha256: after.get(file) }));
  insist(equal(additions, continuity.addedSourcePaths) && equal(transitions, continuity.sourceTransitions), 'undeclared source transition');
  const priorInputs = new Map(previous.sources.map(input => [input.file, input.sha256]));
  insist([...priorInputs.keys()].every(file => after.has(file)), 'previous source omitted');
  const previousAdditions = [...after.keys()].filter(file => !priorInputs.has(file)).sort();
  const previousTransitions = [...priorInputs.keys()].sort().filter(file => priorInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: priorInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(previousAdditions, continuity.previousAddedSourcePaths)
    && equal(previousTransitions, continuity.previousSourceTransitions), 'undeclared previous source transition');
  const sameDateInputs = new Map(sameDate.sources.map(input => [input.file, input.sha256]));
  insist([...sameDateInputs.keys()].every(file => after.has(file)), 'same-date predecessor source omitted');
  const sameDateAdditions = [...after.keys()].filter(file => !sameDateInputs.has(file)).sort();
  const sameDateTransitions = [...sameDateInputs.keys()].sort().filter(file => sameDateInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: sameDateInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(sameDateAdditions, continuity.sameDatePredecessorAddedSourcePaths)
    && equal(sameDateTransitions, continuity.sameDatePredecessorSourceTransitions), 'undeclared same-date predecessor source transition');
  const latestInputs = new Map(latest.sources.map(input => [input.file, input.sha256]));
  insist([...latestInputs.keys()].every(file => after.has(file)), 'latest predecessor source omitted');
  const latestAdditions = [...after.keys()].filter(file => !latestInputs.has(file)).sort();
  const latestTransitions = [...latestInputs.keys()].sort().filter(file => latestInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: latestInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(latestAdditions, continuity.latestPredecessorAddedSourcePaths)
    && equal(latestTransitions, continuity.latestPredecessorSourceTransitions), 'undeclared latest predecessor source transition');
  for (const input of proof.sources) insist(sha(readBytes(input.file)) === input.sha256, `stale output input: ${input.file}`);
  return { path: QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, sha256: continuity.currentOutput.sha256,
    inputCount: proof.sources.length, continuity: { path: QUESTION_CONTRACT_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_CONTINUITY_SHA256 },
    previousContinuity, previousOutput, earlierContinuity, earlierOutput, sameDatePredecessorContinuity, sameDatePredecessorOutput,
    latestPredecessorContinuity, latestPredecessorOutput,
    historicalOutput: continuity.historicalOutput };
}

/** Build-time only: no fallback to an expired historical freshness claim. */
export function assertQuestionContractOutputInputs(readBytes) {
  const bytes = readBytes(QUESTION_CONTRACT_CONTINUITY_PATH);
  insist(sha(bytes) === QUESTION_CONTRACT_CONTINUITY_SHA256, 'continuity receipt bytes changed');
  const continuity = JSON.parse(bytes.toString('utf8'));
  insist(continuity.currentOutput?.path === QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, 'continuity current output path');
  const proofBytes = readBytes(QUESTION_CONTRACT_CURRENT_OUTPUT_PATH);
  insist(sha(proofBytes) === continuity.currentOutput.sha256, 'current output proof bytes changed');
  return assertQuestionContractOutputContinuity({ continuity, proof: JSON.parse(proofBytes.toString('utf8')), readBytes });
}

function exactOperations(before, operations) {
  const expected = structuredClone(before);
  insist(Array.isArray(operations), 'operations absent');
  for (const operation of operations) {
    const allowedPath = /^\/(?:requiredFacts(?:\/\d+\/(?:factId|helperText|use))?|fieldOwnership\/(?:participantOwnedFacts(?:\/\d+)?|participantCompletesBeforeFilingFields|participantAtServiceFields))$/;
    insist(typeof operation.path === 'string' && allowedPath.test(operation.path), 'operation outside reviewed question fields');
    const keys = operation.path.slice(1).split('/');
    let parent = expected;
    for (const key of keys.slice(0, -1)) {
      insist(parent && typeof parent === 'object' && Object.hasOwn(parent, key), 'missing operation parent');
      parent = parent[key];
    }
    const key = keys.at(-1);
    insist(parent && typeof parent === 'object', 'invalid operation parent');
    if (operation.operation === 'add_exact_property') {
      insist(!Object.hasOwn(parent, key) && operation.before === null, 'added property already existed');
      parent[key] = structuredClone(operation.after);
    } else if (operation.operation === 'prepend_exact_items') {
      insist(Array.isArray(parent[key]) && equal(operation.before, [])
        && Array.isArray(operation.after) && operation.after.length > 0, 'invalid prepend');
      parent[key] = [...structuredClone(operation.after), ...parent[key]];
    } else if (operation.operation === 'replace_exact_value') {
      insist(Object.hasOwn(parent, key) && equal(parent[key], operation.before), 'replacement predecessor mismatch');
      parent[key] = structuredClone(operation.after);
    } else insist(false, 'unsupported operation');
  }
  return expected;
}

function assertSpecificationIdentity(specification, row) {
  const routes = [specification.routeKey, ...(specification.routeKeys ?? [])].filter(Boolean);
  insist(routes.includes(row.routeId) && specification.packetFamily === row.familyId
    && specification.trackId === row.trackId && specification.specificationId === row.specification.id
    && specification.specificationVersion === row.specification.version, 'specification identity mismatch');
  const factIds = specification.requiredFacts?.map(fact => fact.factId);
  insist(Array.isArray(factIds) && factIds.every(id => typeof id === 'string' && id.length > 0)
    && new Set(factIds).size === factIds.length, 'missing/duplicate required fact IDs');
}

/** The caller must prove its historical chain against priorSpecificationBytes first. */
export function questionContractSourceSuccessorFor(input) {
  const found = questionContractTransitionFor(input);
  if (!found) return null;
  return assertQuestionContractSourceSuccessor({ ...input, ...found });
}

/** Exposed for meaningful negative controls below the immutable receipt pin. */
export function assertQuestionContractSourceSuccessor({ receipt, row, routeId, familyId, trackId, specificationPath,
  expectedPriorSha256, priorSpecificationBytes, currentSpecificationBytes, readBytes }) {
  assertReceiptScope(receipt);
  insist(receipt.routes.filter(entry => entry.routeId === routeId).length === 1
    && equal(receipt.routes.find(entry => entry.routeId === routeId), row), 'row not uniquely in receipt');
  insist(row.routeId === routeId && row.familyId === familyId && row.trackId === trackId
    && row.specification.path === specificationPath, 'transition identity mismatch');
  insist(expectedPriorSha256 === row.specification.predecessorSha256
    && sha(priorSpecificationBytes) === expectedPriorSha256
    && sha(currentSpecificationBytes) === row.specification.currentSha256, 'exact predecessor/current bytes mismatch');
  const before = JSON.parse(priorSpecificationBytes.toString('utf8'));
  const current = JSON.parse(currentSpecificationBytes.toString('utf8'));
  assertSpecificationIdentity(before, row);
  assertSpecificationIdentity(current, row);
  insist(equal(exactOperations(before, row.reviewedExactOperations), current), 'unlisted specification change');
  for (const key of ['documents', 'sourceIdentities', 'finalVerificationRequirements', 'routeKeys']) {
    insist(equal(before[key] ?? null, current[key] ?? null)
      && sha(canonical(current[key] ?? null)) === row.unchangedContractHashes[key], `changed ${key}`);
  }
  insist(row.questionContractChanged === (row.specification.predecessorSha256 !== row.specification.currentSha256), 'question change claim mismatch');
  const proof = checkedProof(receipt, readBytes);
  const output = proof.routes.filter(entry => entry.routeId === routeId);
  insist(output.length === 1 && output[0].specificationSha256 === sha(currentSpecificationBytes)
    && output[0].familyId === familyId && output[0].trackId === trackId, 'output proof belongs to another source');
  insist(output[0].artifacts.length === 3
    && equal(output[0].artifacts.map(artifact => artifact.id).sort(), ['court-only', 'full-en', 'full-es']), 'output variants missing/duplicated');
  for (const artifact of output[0].artifacts) {
    insist(artifact.byteIdenticalToHistoricalApproval === true
      && artifact.sha256 === artifact.historical.sha256 && artifact.sha256 === artifact.historical.actualSha256
      && sha(readBytes(artifact.historical.path)) === artifact.sha256, 'approved output bytes moved');
  }
  insist(Array.isArray(receipt.preservedEvidence) && receipt.preservedEvidence.length === 9
    && new Set(receipt.preservedEvidence.map(evidence => evidence.path)).size === 9, 'historical evidence inventory');
  for (const evidence of receipt.preservedEvidence) insist(sha(readBytes(evidence.path)) === evidence.sha256, `historical evidence changed: ${evidence.path}`);
  return {
    contract: receipt.schemaVersion, recordId: receipt.recordId,
    path: QUESTION_CONTRACT_SUCCESSOR_PATH, sha256: QUESTION_CONTRACT_SUCCESSOR_SHA256,
    routeId, familyId, trackId, specificationPath,
    priorSpecificationSha256: expectedPriorSha256, specificationSha256: sha(currentSpecificationBytes),
    exactOperationsSha256: sha(canonical(row.reviewedExactOperations)),
    outputProof: receipt.outputProof, questionContractChanged: row.questionContractChanged,
    createsOwnerApproval: false, changesApprovedOutputBytes: false,
    establishesProtectedVerification: false, establishesProviderOrPublicationProof: false,
    productionAuthorized: false
  };
}
