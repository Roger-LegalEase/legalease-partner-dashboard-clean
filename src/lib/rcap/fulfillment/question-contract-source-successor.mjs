import crypto from 'node:crypto';

// A technical source transition, not a replacement owner/legal approval.
// Build callers also check current output inputs with the separate function
// below. Runtime callers provide statically traced evidence bytes and retain
// their existing historical approval, provider and final-verification gates.
export const QUESTION_CONTRACT_SUCCESSOR_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-successor-20261011.json';
export const QUESTION_CONTRACT_SUCCESSOR_SHA256 = 'b3ee94754d29084cf1f208b83ed8e4d4b48b36949fe50112c1bf59ce8acb0212';
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

/** Build-time source freshness. It is separate from statically bundled runtime evidence. */
export function assertQuestionContractOutputInputs(readBytes) {
  const receipt = readQuestionContractSuccessor(readBytes);
  const proof = checkedProof(receipt, readBytes);
  insist(Array.isArray(proof.sources) && proof.sources.length > 0
    && new Set(proof.sources.map(input => input.file)).size === proof.sources.length, 'output source inventory');
  for (const input of proof.sources) insist(sha(readBytes(input.file)) === input.sha256, `stale output input: ${input.file}`);
  return { path: QUESTION_CONTRACT_OUTPUT_PATH, sha256: receipt.outputProof.sha256, inputCount: proof.sources.length };
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
