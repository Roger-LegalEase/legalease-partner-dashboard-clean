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
export const QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v3.json';
export const QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_SHA256 = '6daba3d4f6c3aa496d67e9d0b5c046de890dfb01ae136bce212ccce9eb7aa656';
export const QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v3.json';
export const QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_SHA256 = '848b5f66da3df1f3c0e2e27b009383a85b4e9a36254548e01a70779c9d503995';
export const QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v4.json';
export const QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_SHA256 = '8ff141e18d0190d1162b2d97dce708224337d41df04fa53fc42c02e5ea61ae32';
export const QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v4.json';
export const QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_SHA256 = '702b8fb3f214c8b0ab4abef96892195b2e8a59ab82f0e67962462cd37dda3faa';
export const QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v5.json';
export const QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_SHA256 = 'c6d102e6eec4751c2ab962918845f1a2185416cb1a1688dc96e8d43c978f8b37';
export const QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v5.json';

export const QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_SHA256 = '5e7dfe3b7495c5b2433d0cd8926a28ce2b1554774efc43da6034fd8116837fe1';
export const QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261015-v6.json';
export const QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_SHA256 = '172693c9025720d236b30287ded8dded1881ae104bffa464f978d70b98746ae2';
export const QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261015-v6.json';
export const QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_SHA256 = 'bdeef1b4aa251811276d54d790b4218bb3772e52d7d7742cfbb1584ee81f48ec';
export const QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v7.json';
export const QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_SHA256 = '334ec88ebfb0952b93b01d13c3b187880ddfa610997737f66a1b45d2d9c2a040';
export const QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v7.json';
export const QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_SHA256 = 'eec31535cf92ae69ae53702970e7f9996e2505b9595c7304b95d5d8db0f73fa4';
export const QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v8.json';
export const QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_SHA256 = '0ebcd0a7fc1c91bbf31d32921c1f9d30bc3445bd12d0708e128b8754095545c8';
export const QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v8.json';
export const QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_SHA256 = '79c660be132cb9d4e8bbb0094e50cde042e2396851dd6cfa81b8456fa2a97e47';
export const QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v9.json';
export const QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_SHA256 = 'fa06010cec8cc6d3b9aa2e9ff18c2ca7235663409826920d41a892b13f8ff74a';
export const QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v9.json';
export const QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_SHA256 = '050e320e1cd53f698b6b071eef75e58f9ce1423408ea3741d75f530b40dea99e';
export const QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v10.json';
export const QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_SHA256 = '5befcb1c128da45f6d9e03b9185bfec86c72c3ad1fae7d8cde47aa4780dd04b7';
export const QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v10.json';
export const QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_SHA256 = '01c9c66d9991c18a25a55adb89f47a8501aab0f3dc0423e2faa090df64330f47';
export const QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v11.json';
export const QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_SHA256 = 'e1233e06a23bea57cbc998655cba8daefa736608702021584b555ae28755f710';
export const QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v11.json';
export const QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_SHA256 = 'e6e928e4ab51a16e39ac8dd859a7b5b882ef73847addbe31797fd9234acd53c1';
export const QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v12.json';
export const QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_SHA256 = '20b8bd8f8185108f128d6a22ad2f2c34bf2fc9b60d76959951dfd4139a25686d';
export const QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v12.json';
export const QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_SHA256 = '5b684eeec4064364adc5420711162b9a8acd672ff7702950019cd89aa43dafd2';
export const QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v13.json';
export const QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_SHA256 = 'f78549ed770cef114caa4dd61f9cbfe639a6101a9b0812377de262bb2ebdee07';
export const QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v13.json';
export const QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_SHA256 = '4ed443b2b6727881536548eae9f1ca9cfe0e8f408b183c971c31fa3c7e50306c';
export const QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v14.json';
export const QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_SHA256 = '789c9a393b917069b71e20aa44721cef3e659b3ad2297e0feb858fc7e3980199';
export const QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v14.json';
export const QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_SHA256 = '472b6cf2fd3e10ae2a84d40efd0c4701c752e804f2857f6dcde7d44f3ae961a1';
export const QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v15.json';
export const QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_SHA256 = 'c2280e50a6cbde2b5bbef81667fb264eec6d2361e9105c96f52e30f736d902ed';
export const QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v15.json';
export const QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_SHA256 = 'c3ec80751df95ab3d80acc7590c4237332ba5686626260aff0db8f6a83290faa';
export const QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v16.json';
export const QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_SHA256 = '64587ac2feb90a2b7dcb4a28a2e6c13a1c9f970f8008c8becc9d52c97ead73cc';
export const QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v16.json';
export const QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_SHA256 = '31483aa3539d3609ff3e67729d0fce06302a1560f8f978be98ec240324435ec3';
export const QUESTION_CONTRACT_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v17.json';
export const QUESTION_CONTRACT_CONTINUITY_SHA256 = 'ee62ec8a57def52876d1a19a54a5fddee9585870b74d255b976515eac341e3c0';
export const QUESTION_CONTRACT_CURRENT_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v17.json';

/** Exposed below the immutable byte pins for non-vacuous semantic controls. */
export function assertQuestionContractOutputContinuity({ continuity, proof, readBytes }) {
  const receipt = readQuestionContractSuccessor(readBytes);
  const historical = checkedProof(receipt, readBytes);
  insist(continuity.schemaVersion === 'rcap-question-contract-output-continuity/v1'
    && continuity.recordId === 'QUESTION-CONTRACT-OUTPUT-CONTINUITY-20261016-V17'
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
  const immediatePredecessorContinuity = { path: QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_SHA256 };
  const immediatePredecessorOutput = { path: QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_PATH, sha256: QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_SHA256 };
  insist(equal(continuity.immediatePredecessorContinuity, immediatePredecessorContinuity)
    && equal(continuity.immediatePredecessorOutput, immediatePredecessorOutput), 'immediate predecessor ancestry');
  const immediateContinuityBytes = readBytes(immediatePredecessorContinuity.path);
  const immediateOutputBytes = readBytes(immediatePredecessorOutput.path);
  insist(sha(immediateContinuityBytes) === immediatePredecessorContinuity.sha256, 'immediate predecessor continuity bytes changed');
  insist(sha(immediateOutputBytes) === immediatePredecessorOutput.sha256, 'immediate predecessor output bytes changed');
  const immediateContinuity = JSON.parse(immediateContinuityBytes.toString('utf8'));
  insist(equal(immediateContinuity.currentOutput, immediatePredecessorOutput)
    && equal(immediateContinuity.latestPredecessorContinuity, latestPredecessorContinuity)
    && equal(immediateContinuity.latestPredecessorOutput, latestPredecessorOutput)
    && equal(immediateContinuity.sameDatePredecessorContinuity, sameDatePredecessorContinuity)
    && equal(immediateContinuity.sameDatePredecessorOutput, sameDatePredecessorOutput)
    && equal(immediateContinuity.previousContinuity, previousContinuity) && equal(immediateContinuity.previousOutput, previousOutput)
    && equal(immediateContinuity.earlierContinuity, earlierContinuity) && equal(immediateContinuity.earlierOutput, earlierOutput)
    && equal(immediateContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(immediateContinuity.historicalOutput, continuity.historicalOutput), 'immediate predecessor ancestry');
  const immediate = JSON.parse(immediateOutputBytes.toString('utf8'));
  const priorRevisionContinuity = { path: QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_SHA256 };
  const priorRevisionOutput = { path: QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.priorRevisionContinuity, priorRevisionContinuity)
    && equal(continuity.priorRevisionOutput, priorRevisionOutput), 'revision predecessor ancestry');
  const revisionContinuityBytes = readBytes(priorRevisionContinuity.path);
  const revisionOutputBytes = readBytes(priorRevisionOutput.path);
  insist(sha(revisionContinuityBytes) === priorRevisionContinuity.sha256, 'revision predecessor continuity bytes changed');
  insist(sha(revisionOutputBytes) === priorRevisionOutput.sha256, 'revision predecessor output bytes changed');
  const revisionContinuity = JSON.parse(revisionContinuityBytes.toString('utf8'));
  insist(equal(revisionContinuity.currentOutput, priorRevisionOutput)
    && equal(revisionContinuity.immediatePredecessorContinuity, immediatePredecessorContinuity)
    && equal(revisionContinuity.immediatePredecessorOutput, immediatePredecessorOutput)
    && equal(revisionContinuity.latestPredecessorContinuity, latestPredecessorContinuity)
    && equal(revisionContinuity.latestPredecessorOutput, latestPredecessorOutput)
    && equal(revisionContinuity.sameDatePredecessorContinuity, sameDatePredecessorContinuity)
    && equal(revisionContinuity.sameDatePredecessorOutput, sameDatePredecessorOutput)
    && equal(revisionContinuity.previousContinuity, previousContinuity) && equal(revisionContinuity.previousOutput, previousOutput)
    && equal(revisionContinuity.earlierContinuity, earlierContinuity) && equal(revisionContinuity.earlierOutput, earlierOutput)
    && equal(revisionContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(revisionContinuity.historicalOutput, continuity.historicalOutput), 'revision predecessor ancestry');
  const revision = JSON.parse(revisionOutputBytes.toString('utf8'));
  const acceptedRevisionContinuity = { path: QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_SHA256 };
  const acceptedRevisionOutput = { path: QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.acceptedRevisionContinuity, acceptedRevisionContinuity)
    && equal(continuity.acceptedRevisionOutput, acceptedRevisionOutput), 'accepted revision predecessor ancestry');
  const acceptedContinuityBytes = readBytes(acceptedRevisionContinuity.path);
  const acceptedOutputBytes = readBytes(acceptedRevisionOutput.path);
  insist(sha(acceptedContinuityBytes) === acceptedRevisionContinuity.sha256, 'accepted revision predecessor continuity bytes changed');
  insist(sha(acceptedOutputBytes) === acceptedRevisionOutput.sha256, 'accepted revision predecessor output bytes changed');
  const acceptedContinuity = JSON.parse(acceptedContinuityBytes.toString('utf8'));
  insist(equal(acceptedContinuity.currentOutput, acceptedRevisionOutput)
    && equal(acceptedContinuity.priorRevisionContinuity, priorRevisionContinuity)
    && equal(acceptedContinuity.priorRevisionOutput, priorRevisionOutput)
    && equal(acceptedContinuity.immediatePredecessorContinuity, immediatePredecessorContinuity)
    && equal(acceptedContinuity.immediatePredecessorOutput, immediatePredecessorOutput)
    && equal(acceptedContinuity.latestPredecessorContinuity, latestPredecessorContinuity)
    && equal(acceptedContinuity.latestPredecessorOutput, latestPredecessorOutput)
    && equal(acceptedContinuity.sameDatePredecessorContinuity, sameDatePredecessorContinuity)
    && equal(acceptedContinuity.sameDatePredecessorOutput, sameDatePredecessorOutput)
    && equal(acceptedContinuity.previousContinuity, previousContinuity) && equal(acceptedContinuity.previousOutput, previousOutput)
    && equal(acceptedContinuity.earlierContinuity, earlierContinuity) && equal(acceptedContinuity.earlierOutput, earlierOutput)
    && equal(acceptedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(acceptedContinuity.historicalOutput, continuity.historicalOutput), 'accepted revision predecessor ancestry');
  const accepted = JSON.parse(acceptedOutputBytes.toString('utf8'));
  const executedRevisionContinuity = { path: QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_SHA256 };
  const executedRevisionOutput = { path: QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.executedRevisionContinuity, executedRevisionContinuity)
    && equal(continuity.executedRevisionOutput, executedRevisionOutput), 'executed revision predecessor ancestry');
  const executedContinuityBytes = readBytes(executedRevisionContinuity.path);
  const executedOutputBytes = readBytes(executedRevisionOutput.path);
  insist(sha(executedContinuityBytes) === executedRevisionContinuity.sha256, 'executed revision predecessor continuity bytes changed');
  insist(sha(executedOutputBytes) === executedRevisionOutput.sha256, 'executed revision predecessor output bytes changed');
  const executedContinuity = JSON.parse(executedContinuityBytes.toString('utf8'));
  insist(equal(executedContinuity.currentOutput, executedRevisionOutput)
    && equal(executedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(executedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput'].every(key => equal(executedContinuity[key], continuity[key])),
    'executed revision predecessor ancestry');
  const executed = JSON.parse(executedOutputBytes.toString('utf8'));

  const renderedRevisionContinuity = { path: QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_SHA256 };
  const renderedRevisionOutput = { path: QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.renderedRevisionContinuity, renderedRevisionContinuity)
    && equal(continuity.renderedRevisionOutput, renderedRevisionOutput), 'rendered revision predecessor ancestry');
  const renderedContinuityBytes = readBytes(renderedRevisionContinuity.path);
  const renderedOutputBytes = readBytes(renderedRevisionOutput.path);
  insist(sha(renderedContinuityBytes) === renderedRevisionContinuity.sha256, 'rendered revision predecessor continuity bytes changed');
  insist(sha(renderedOutputBytes) === renderedRevisionOutput.sha256, 'rendered revision predecessor output bytes changed');
  const renderedContinuity = JSON.parse(renderedContinuityBytes.toString('utf8'));
  insist(equal(renderedContinuity.currentOutput, renderedRevisionOutput)
    && equal(renderedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(renderedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput']
      .every(key => equal(renderedContinuity[key], continuity[key])), 'rendered revision predecessor ancestry');
  const rendered = JSON.parse(renderedOutputBytes.toString('utf8'));

  const observedRevisionContinuity = { path: QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_SHA256 };
  const observedRevisionOutput = { path: QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.observedRevisionContinuity, observedRevisionContinuity)
    && equal(continuity.observedRevisionOutput, observedRevisionOutput), 'observed revision predecessor ancestry');
  const observedContinuityBytes = readBytes(observedRevisionContinuity.path);
  const observedOutputBytes = readBytes(observedRevisionOutput.path);
  insist(sha(observedContinuityBytes) === observedRevisionContinuity.sha256, 'observed revision predecessor continuity bytes changed');
  insist(sha(observedOutputBytes) === observedRevisionOutput.sha256, 'observed revision predecessor output bytes changed');
  const observedContinuity = JSON.parse(observedContinuityBytes.toString('utf8'));
  insist(equal(observedContinuity.currentOutput, observedRevisionOutput)
    && equal(observedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(observedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput']
      .every(key => equal(observedContinuity[key], continuity[key])), 'observed revision predecessor ancestry');
  const observed = JSON.parse(observedOutputBytes.toString('utf8'));

  const measuredRevisionContinuity = { path: QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_SHA256 };
  const measuredRevisionOutput = { path: QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.measuredRevisionContinuity, measuredRevisionContinuity)
    && equal(continuity.measuredRevisionOutput, measuredRevisionOutput), 'measured revision predecessor ancestry');
  const measuredContinuityBytes = readBytes(measuredRevisionContinuity.path);
  const measuredOutputBytes = readBytes(measuredRevisionOutput.path);
  insist(sha(measuredContinuityBytes) === measuredRevisionContinuity.sha256, 'measured revision predecessor continuity bytes changed');
  insist(sha(measuredOutputBytes) === measuredRevisionOutput.sha256, 'measured revision predecessor output bytes changed');
  const measuredContinuity = JSON.parse(measuredContinuityBytes.toString('utf8'));
  insist(equal(measuredContinuity.currentOutput, measuredRevisionOutput)
    && equal(measuredContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(measuredContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput']
      .every(key => equal(measuredContinuity[key], continuity[key])), 'measured revision predecessor ancestry');
  const measured = JSON.parse(measuredOutputBytes.toString('utf8'));

  const boundRevisionContinuity = { path: QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_SHA256 };
  const boundRevisionOutput = { path: QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.boundRevisionContinuity, boundRevisionContinuity)
    && equal(continuity.boundRevisionOutput, boundRevisionOutput), 'bound revision predecessor ancestry');
  const boundContinuityBytes = readBytes(boundRevisionContinuity.path);
  const boundOutputBytes = readBytes(boundRevisionOutput.path);
  insist(sha(boundContinuityBytes) === boundRevisionContinuity.sha256, 'bound revision predecessor continuity bytes changed');
  insist(sha(boundOutputBytes) === boundRevisionOutput.sha256, 'bound revision predecessor output bytes changed');
  const boundContinuity = JSON.parse(boundContinuityBytes.toString('utf8'));
  insist(equal(boundContinuity.currentOutput, boundRevisionOutput)
    && equal(boundContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(boundContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput']
      .every(key => equal(boundContinuity[key], continuity[key])), 'bound revision predecessor ancestry');
  const bound = JSON.parse(boundOutputBytes.toString('utf8'));

  const validatedRevisionContinuity = { path: QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_SHA256 };
  const validatedRevisionOutput = { path: QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.validatedRevisionContinuity, validatedRevisionContinuity)
    && equal(continuity.validatedRevisionOutput, validatedRevisionOutput), 'validated revision predecessor ancestry');
  const validatedContinuityBytes = readBytes(validatedRevisionContinuity.path);
  const validatedOutputBytes = readBytes(validatedRevisionOutput.path);
  insist(sha(validatedContinuityBytes) === validatedRevisionContinuity.sha256, 'validated revision predecessor continuity bytes changed');
  insist(sha(validatedOutputBytes) === validatedRevisionOutput.sha256, 'validated revision predecessor output bytes changed');
  const validatedContinuity = JSON.parse(validatedContinuityBytes.toString('utf8'));
  insist(equal(validatedContinuity.currentOutput, validatedRevisionOutput)
    && equal(validatedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(validatedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput']
      .every(key => equal(validatedContinuity[key], continuity[key])), 'validated revision predecessor ancestry');
  const validated = JSON.parse(validatedOutputBytes.toString('utf8'));

  const recordedRevisionContinuity = { path: QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_SHA256 };
  const recordedRevisionOutput = { path: QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.recordedRevisionContinuity, recordedRevisionContinuity)
    && equal(continuity.recordedRevisionOutput, recordedRevisionOutput), 'recorded revision predecessor ancestry');
  const recordedContinuityBytes = readBytes(recordedRevisionContinuity.path);
  const recordedOutputBytes = readBytes(recordedRevisionOutput.path);
  insist(sha(recordedContinuityBytes) === recordedRevisionContinuity.sha256, 'recorded revision predecessor continuity bytes changed');
  insist(sha(recordedOutputBytes) === recordedRevisionOutput.sha256, 'recorded revision predecessor output bytes changed');
  const recordedContinuity = JSON.parse(recordedContinuityBytes.toString('utf8'));
  insist(equal(recordedContinuity.currentOutput, recordedRevisionOutput)
    && equal(recordedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(recordedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput']
      .every(key => equal(recordedContinuity[key], continuity[key])), 'recorded revision predecessor ancestry');
  const recorded = JSON.parse(recordedOutputBytes.toString('utf8'));

  const capturedRevisionContinuity = { path: QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_SHA256 };
  const capturedRevisionOutput = { path: QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.capturedRevisionContinuity, capturedRevisionContinuity)
    && equal(continuity.capturedRevisionOutput, capturedRevisionOutput), 'captured revision predecessor ancestry');
  const capturedContinuityBytes = readBytes(capturedRevisionContinuity.path);
  const capturedOutputBytes = readBytes(capturedRevisionOutput.path);
  insist(sha(capturedContinuityBytes) === capturedRevisionContinuity.sha256, 'captured revision predecessor continuity bytes changed');
  insist(sha(capturedOutputBytes) === capturedRevisionOutput.sha256, 'captured revision predecessor output bytes changed');
  const capturedContinuity = JSON.parse(capturedContinuityBytes.toString('utf8'));
  insist(equal(capturedContinuity.currentOutput, capturedRevisionOutput)
    && equal(capturedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(capturedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput']
      .every(key => equal(capturedContinuity[key], continuity[key])), 'captured revision predecessor ancestry');
  const captured = JSON.parse(capturedOutputBytes.toString('utf8'));
  const retainedRevisionContinuity = { path: QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_SHA256 };
  const retainedRevisionOutput = { path: QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.retainedRevisionContinuity, retainedRevisionContinuity)
    && equal(continuity.retainedRevisionOutput, retainedRevisionOutput), 'retained revision predecessor ancestry');
  const retainedContinuityBytes = readBytes(retainedRevisionContinuity.path);
  const retainedOutputBytes = readBytes(retainedRevisionOutput.path);
  insist(sha(retainedContinuityBytes) === retainedRevisionContinuity.sha256, 'retained revision predecessor continuity bytes changed');
  insist(sha(retainedOutputBytes) === retainedRevisionOutput.sha256, 'retained revision predecessor output bytes changed');
  const retainedContinuity = JSON.parse(retainedContinuityBytes.toString('utf8'));
  insist(equal(retainedContinuity.currentOutput, retainedRevisionOutput)
    && equal(retainedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(retainedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput', 'capturedRevisionContinuity', 'capturedRevisionOutput']
      .every(key => equal(retainedContinuity[key], continuity[key])), 'retained revision predecessor ancestry');
  const retained = JSON.parse(retainedOutputBytes.toString('utf8'));
  const continuedRevisionContinuity = { path: QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_SHA256 };
  const continuedRevisionOutput = { path: QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.continuedRevisionContinuity, continuedRevisionContinuity)
    && equal(continuity.continuedRevisionOutput, continuedRevisionOutput), 'continued revision predecessor ancestry');
  const continuedContinuityBytes = readBytes(continuedRevisionContinuity.path);
  const continuedOutputBytes = readBytes(continuedRevisionOutput.path);
  insist(sha(continuedContinuityBytes) === continuedRevisionContinuity.sha256, 'continued revision predecessor continuity bytes changed');
  insist(sha(continuedOutputBytes) === continuedRevisionOutput.sha256, 'continued revision predecessor output bytes changed');
  const continuedContinuity = JSON.parse(continuedContinuityBytes.toString('utf8'));
  insist(equal(continuedContinuity.currentOutput, continuedRevisionOutput)
    && equal(continuedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(continuedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput', 'capturedRevisionContinuity', 'capturedRevisionOutput', 'retainedRevisionContinuity', 'retainedRevisionOutput']
      .every(key => equal(continuedContinuity[key], continuity[key])), 'continued revision predecessor ancestry');
  const continued = JSON.parse(continuedOutputBytes.toString('utf8'));
  const reviewedRevisionContinuity = { path: QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_SHA256 };
  const reviewedRevisionOutput = { path: QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.reviewedRevisionContinuity, reviewedRevisionContinuity)
    && equal(continuity.reviewedRevisionOutput, reviewedRevisionOutput), 'reviewed revision predecessor ancestry');
  const reviewedContinuityBytes = readBytes(reviewedRevisionContinuity.path);
  const reviewedOutputBytes = readBytes(reviewedRevisionOutput.path);
  insist(sha(reviewedContinuityBytes) === reviewedRevisionContinuity.sha256, 'reviewed revision predecessor continuity bytes changed');
  insist(sha(reviewedOutputBytes) === reviewedRevisionOutput.sha256, 'reviewed revision predecessor output bytes changed');
  const reviewedContinuity = JSON.parse(reviewedContinuityBytes.toString('utf8'));
  insist(equal(reviewedContinuity.currentOutput, reviewedRevisionOutput)
    && equal(reviewedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(reviewedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput', 'capturedRevisionContinuity', 'capturedRevisionOutput', 'retainedRevisionContinuity', 'retainedRevisionOutput', 'continuedRevisionContinuity', 'continuedRevisionOutput']
      .every(key => equal(reviewedContinuity[key], continuity[key])), 'reviewed revision predecessor ancestry');
  const reviewed = JSON.parse(reviewedOutputBytes.toString('utf8'));

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
  for (const prior of [...earlier.routes, ...previous.routes, ...sameDate.routes, ...latest.routes, ...immediate.routes, ...revision.routes, ...accepted.routes, ...executed.routes, ...rendered.routes, ...observed.routes, ...measured.routes, ...bound.routes, ...validated.routes, ...recorded.routes, ...captured.routes, ...retained.routes, ...continued.routes, ...reviewed.routes]) {
    const current = proof.routes.find(row => row.routeId === prior.routeId);
    insist(current && equal(withoutPrivateOutputLocators(current), withoutPrivateOutputLocators(prior)), `changed previous output semantics: ${prior.routeId}`);
  }
  for (const evidence of receipt.preservedEvidence) insist(sha(readBytes(evidence.path)) === evidence.sha256, `historical evidence changed: ${evidence.path}`);
  insist(Array.isArray(proof.sources) && proof.sources.length === 134 && continuity.currentSourceCount === 134
    && reviewed.sources.length === 134 && continuity.reviewedRevisionSourceCount === 134
    && continued.sources.length === 134 && continuity.continuedRevisionSourceCount === 134
    && retained.sources.length === 129 && continuity.retainedRevisionSourceCount === 129
    && captured.sources.length === 129 && continuity.capturedRevisionSourceCount === 129
    && recorded.sources.length === 129 && continuity.recordedRevisionSourceCount === 129
    && validated.sources.length === 129 && continuity.validatedRevisionSourceCount === 129
    && bound.sources.length === 129 && continuity.boundRevisionSourceCount === 129
    && measured.sources.length === 129 && continuity.measuredRevisionSourceCount === 129
    && observed.sources.length === 124 && continuity.observedRevisionSourceCount === 124
    && rendered.sources.length === 124 && continuity.renderedRevisionSourceCount === 124
    && executed.sources.length === 122 && continuity.executedRevisionSourceCount === 122
    && historical.sources.length === 88 && continuity.preservedSourceCount === 88
    && previous.sources.length === 118 && continuity.previousSourceCount === 118
    && accepted.sources.length === 121 && continuity.acceptedRevisionSourceCount === 121
    && revision.sources.length === 121 && continuity.priorRevisionSourceCount === 121
    && immediate.sources.length === 121 && continuity.immediatePredecessorSourceCount === 121
    && latest.sources.length === 121 && continuity.latestPredecessorSourceCount === 121
    && sameDate.sources.length === 119 && continuity.sameDatePredecessorSourceCount === 119
    && earlier.sources.length === 113 && continuity.earlierSourceCount === 113
    && new Set(proof.sources.map(input => input.file)).size === 134, 'current output source inventory');
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
  const immediateInputs = new Map(immediate.sources.map(input => [input.file, input.sha256]));
  insist([...immediateInputs.keys()].every(file => after.has(file)), 'immediate predecessor source omitted');
  const immediateAdditions = [...after.keys()].filter(file => !immediateInputs.has(file)).sort();
  const immediateTransitions = [...immediateInputs.keys()].sort().filter(file => immediateInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: immediateInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(immediateAdditions, continuity.immediatePredecessorAddedSourcePaths)
    && equal(immediateTransitions, continuity.immediatePredecessorSourceTransitions), 'undeclared immediate predecessor source transition');
  const revisionInputs = new Map(revision.sources.map(input => [input.file, input.sha256]));
  insist([...revisionInputs.keys()].every(file => after.has(file)), 'revision predecessor source omitted');
  const revisionAdditions = [...after.keys()].filter(file => !revisionInputs.has(file)).sort();
  const revisionTransitions = [...revisionInputs.keys()].sort().filter(file => revisionInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: revisionInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(revisionAdditions, continuity.priorRevisionAddedSourcePaths)
    && equal(revisionTransitions, continuity.priorRevisionSourceTransitions), 'undeclared revision predecessor source transition');
  const acceptedInputs = new Map(accepted.sources.map(input => [input.file, input.sha256]));
  insist([...acceptedInputs.keys()].every(file => after.has(file)), 'accepted predecessor source omitted');
  const acceptedAdditions = [...after.keys()].filter(file => !acceptedInputs.has(file)).sort();
  const acceptedTransitions = [...acceptedInputs.keys()].sort().filter(file => acceptedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: acceptedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(acceptedAdditions, continuity.acceptedRevisionAddedSourcePaths)
    && equal(acceptedTransitions, continuity.acceptedRevisionSourceTransitions), 'undeclared accepted predecessor source transition');
  const executedInputs = new Map(executed.sources.map(input => [input.file, input.sha256]));
  insist([...executedInputs.keys()].every(file => after.has(file)), 'executed predecessor source omitted');
  const executedAdditions = [...after.keys()].filter(file => !executedInputs.has(file)).sort();
  const executedTransitions = [...executedInputs.keys()].sort().filter(file => executedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: executedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(executedAdditions, continuity.executedRevisionAddedSourcePaths)
    && equal(executedTransitions, continuity.executedRevisionSourceTransitions), 'undeclared executed predecessor source transition');
  const renderedInputs = new Map(rendered.sources.map(input => [input.file, input.sha256]));
  insist([...renderedInputs.keys()].every(file => after.has(file)), 'rendered predecessor source omitted');
  const renderedAdditions = [...after.keys()].filter(file => !renderedInputs.has(file)).sort();
  const renderedTransitions = [...renderedInputs.keys()].sort().filter(file => renderedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: renderedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(renderedAdditions, continuity.renderedRevisionAddedSourcePaths)
    && equal(renderedTransitions, continuity.renderedRevisionSourceTransitions), 'undeclared rendered predecessor source transition');
  const observedInputs = new Map(observed.sources.map(input => [input.file, input.sha256]));
  insist([...observedInputs.keys()].every(file => after.has(file)), 'observed predecessor source omitted');
  const observedAdditions = [...after.keys()].filter(file => !observedInputs.has(file)).sort();
  const observedTransitions = [...observedInputs.keys()].sort().filter(file => observedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: observedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(observedAdditions, continuity.observedRevisionAddedSourcePaths)
    && equal(observedTransitions, continuity.observedRevisionSourceTransitions), 'undeclared observed predecessor source transition');
  const measuredInputs = new Map(measured.sources.map(input => [input.file, input.sha256]));
  insist([...measuredInputs.keys()].every(file => after.has(file)), 'measured predecessor source omitted');
  const measuredAdditions = [...after.keys()].filter(file => !measuredInputs.has(file)).sort();
  const measuredTransitions = [...measuredInputs.keys()].sort().filter(file => measuredInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: measuredInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(measuredAdditions, continuity.measuredRevisionAddedSourcePaths)
    && equal(measuredTransitions, continuity.measuredRevisionSourceTransitions), 'undeclared measured predecessor source transition');
  const boundInputs = new Map(bound.sources.map(input => [input.file, input.sha256]));
  insist([...boundInputs.keys()].every(file => after.has(file)), 'bound predecessor source omitted');
  const boundAdditions = [...after.keys()].filter(file => !boundInputs.has(file)).sort();
  const boundTransitions = [...boundInputs.keys()].sort().filter(file => boundInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: boundInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(boundAdditions, continuity.boundRevisionAddedSourcePaths)
    && equal(boundTransitions, continuity.boundRevisionSourceTransitions), 'undeclared bound predecessor source transition');
  const validatedInputs = new Map(validated.sources.map(input => [input.file, input.sha256]));
  insist([...validatedInputs.keys()].every(file => after.has(file)), 'validated predecessor source omitted');
  const validatedAdditions = [...after.keys()].filter(file => !validatedInputs.has(file)).sort();
  const validatedTransitions = [...validatedInputs.keys()].sort().filter(file => validatedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: validatedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(validatedAdditions, continuity.validatedRevisionAddedSourcePaths)
    && equal(validatedTransitions, continuity.validatedRevisionSourceTransitions), 'undeclared validated predecessor source transition');
  const recordedInputs = new Map(recorded.sources.map(input => [input.file, input.sha256]));
  insist([...recordedInputs.keys()].every(file => after.has(file)), 'recorded predecessor source omitted');
  const recordedAdditions = [...after.keys()].filter(file => !recordedInputs.has(file)).sort();
  const recordedTransitions = [...recordedInputs.keys()].sort().filter(file => recordedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: recordedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(recordedAdditions, continuity.recordedRevisionAddedSourcePaths)
    && equal(recordedTransitions, continuity.recordedRevisionSourceTransitions), 'undeclared recorded predecessor source transition');
  const capturedInputs = new Map(captured.sources.map(input => [input.file, input.sha256]));
  insist([...capturedInputs.keys()].every(file => after.has(file)), 'captured predecessor source omitted');
  const capturedAdditions = [...after.keys()].filter(file => !capturedInputs.has(file)).sort();
  const capturedTransitions = [...capturedInputs.keys()].sort().filter(file => capturedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: capturedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(capturedAdditions, continuity.capturedRevisionAddedSourcePaths)
    && equal(capturedTransitions, continuity.capturedRevisionSourceTransitions), 'undeclared captured predecessor source transition');
  const retainedInputs = new Map(retained.sources.map(input => [input.file, input.sha256]));
  insist([...retainedInputs.keys()].every(file => after.has(file)), 'retained predecessor source omitted');
  const retainedAdditions = [...after.keys()].filter(file => !retainedInputs.has(file)).sort();
  const retainedTransitions = [...retainedInputs.keys()].sort().filter(file => retainedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: retainedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(retainedAdditions, continuity.retainedRevisionAddedSourcePaths)
    && equal(retainedTransitions, continuity.retainedRevisionSourceTransitions), 'undeclared retained predecessor source transition');
  const continuedInputs = new Map(continued.sources.map(input => [input.file, input.sha256]));
  insist([...continuedInputs.keys()].every(file => after.has(file)), 'continued predecessor source omitted');
  const continuedAdditions = [...after.keys()].filter(file => !continuedInputs.has(file)).sort();
  const continuedTransitions = [...continuedInputs.keys()].sort().filter(file => continuedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: continuedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(continuedAdditions, continuity.continuedRevisionAddedSourcePaths)
    && equal(continuedTransitions, continuity.continuedRevisionSourceTransitions), 'undeclared continued predecessor source transition');
  const reviewedInputs = new Map(reviewed.sources.map(input => [input.file, input.sha256]));
  insist([...reviewedInputs.keys()].every(file => after.has(file)), 'reviewed predecessor source omitted');
  const reviewedAdditions = [...after.keys()].filter(file => !reviewedInputs.has(file)).sort();
  const reviewedTransitions = [...reviewedInputs.keys()].sort().filter(file => reviewedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: reviewedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(reviewedAdditions, continuity.reviewedRevisionAddedSourcePaths)
    && equal(reviewedTransitions, continuity.reviewedRevisionSourceTransitions), 'undeclared reviewed predecessor source transition');
  for (const input of proof.sources) insist(sha(readBytes(input.file)) === input.sha256, `stale output input: ${input.file}`);
  return { path: QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, sha256: continuity.currentOutput.sha256,
    inputCount: proof.sources.length, continuity: { path: QUESTION_CONTRACT_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_CONTINUITY_SHA256 },
    previousContinuity, previousOutput, earlierContinuity, earlierOutput, sameDatePredecessorContinuity, sameDatePredecessorOutput,
    latestPredecessorContinuity, latestPredecessorOutput, immediatePredecessorContinuity, immediatePredecessorOutput, priorRevisionContinuity, priorRevisionOutput, acceptedRevisionContinuity, acceptedRevisionOutput, executedRevisionContinuity, executedRevisionOutput, renderedRevisionContinuity, renderedRevisionOutput, observedRevisionContinuity, observedRevisionOutput, measuredRevisionContinuity, measuredRevisionOutput, boundRevisionContinuity, boundRevisionOutput, validatedRevisionContinuity, validatedRevisionOutput, recordedRevisionContinuity, recordedRevisionOutput, capturedRevisionContinuity, capturedRevisionOutput, retainedRevisionContinuity, retainedRevisionOutput, continuedRevisionContinuity, continuedRevisionOutput, reviewedRevisionContinuity, reviewedRevisionOutput,
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
