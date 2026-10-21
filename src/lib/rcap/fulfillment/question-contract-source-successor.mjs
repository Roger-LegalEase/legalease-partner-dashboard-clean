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
export const QUESTION_CONTRACT_INTEGRATED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v17.json';
export const QUESTION_CONTRACT_INTEGRATED_REVISION_CONTINUITY_SHA256 = 'ee62ec8a57def52876d1a19a54a5fddee9585870b74d255b976515eac341e3c0';
export const QUESTION_CONTRACT_INTEGRATED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v17.json';

export const QUESTION_CONTRACT_INTEGRATED_REVISION_OUTPUT_SHA256 = 'd3abf1d26b391881aab87c6b103b46e5a32df481acf08532bfe22cd830e9f5b4';
export const QUESTION_CONTRACT_REVALIDATED_REVISION_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v18.json';
export const QUESTION_CONTRACT_REVALIDATED_REVISION_CONTINUITY_SHA256 = 'db888eb876b5a94f8dd7de4014dd158a56696bd9f33c06f6060acdbafb015367';
export const QUESTION_CONTRACT_REVALIDATED_REVISION_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v18.json';

export const QUESTION_CONTRACT_REVALIDATED_REVISION_OUTPUT_SHA256 = 'ab9a16400358b40f7d1e531e659e6e9fedd40f83cf5b3da262887dbc373544d2';
export const QUESTION_CONTRACT_SOURCE_PREDECESSOR_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v20.json';
export const QUESTION_CONTRACT_SOURCE_PREDECESSOR_CONTINUITY_SHA256 = '82b0f06cd126abbbc88d5a92fef4480c47b3e45f5208dd1ba286f9baf736ba92';
export const QUESTION_CONTRACT_SOURCE_PREDECESSOR_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v20.json';
export const QUESTION_CONTRACT_SOURCE_PREDECESSOR_OUTPUT_SHA256 = '406d5144b02a994eac974be64c7ed4c5291ad4289a5abe931303d2fc47bdea0a';
export const QUESTION_CONTRACT_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v21.json';
export const QUESTION_CONTRACT_CONTINUITY_SHA256 = '9f5962bf1dfc1cf8522e25d16e04852eb50cdacbf97bc8a56f132eec1f63f65e';
export const QUESTION_CONTRACT_CURRENT_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v21.json';
const QUESTION_CONTRACT_CURRENT_OUTPUT_SHA256 = '3dbbb0d844f4de0195472162af7a3f4da44ab69eeaf6fffd064dabdf741478d7';
export const QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_CONTINUITY_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v19.json';
export const QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_CONTINUITY_SHA256 = '62914fad5fca94e1cb4f8d122fdbbed495ebbd0d71e3f4139fb8be92d90a9140';
export const QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v19.json';
export const QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_OUTPUT_SHA256 = 'e5dfd06708c302427c28819ee7e265fe9987bf42e3d71c586d0ba10199bf2884';


// Exact named source-only successor. Historical execution/proof/artifact bytes
// remain immutable; this validates current source identity, not another render.
export const MS_GA_VA_MN_SOURCE_SUCCESSION_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ms-ga-va-mn-20261017-v1.json';
export const MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256 = '879323739fe5c68e352b52bef66db00183fd055788a3829ac8ed00e21c4eb8a0';
export function assertMsGaVaMnSourceSuccession(readBytes) {
  const bytes = readBytes(MS_GA_VA_MN_SOURCE_SUCCESSION_PATH);
  insist(sha(bytes) === MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256, 'MS/GA/VA/MN source succession record bytes changed');
  const record = JSON.parse(bytes.toString('utf8'));
  insist(record.schemaVersion === 'rcap-question-contract-named-source-succession/v1'
    && record.recordId === 'MS-GA-VA-MN-SOURCE-SUCCESSION-20261017'
    && record.kind === 'technical_source_only'
    && record.engineeringCommit === '2207c357aa4e1a920ae98611fe8c69307aac5123'
    && equal(record.historicalContinuity, { path: 'data/rcap-grade-a/participant-data-rights/question-contract-output-continuity-20261016-v21.json', sha256: '9f5962bf1dfc1cf8522e25d16e04852eb50cdacbf97bc8a56f132eec1f63f65e' })
    && equal(record.historicalOutput, { path: 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v21.json', sha256: '3dbbb0d844f4de0195472162af7a3f4da44ab69eeaf6fffd064dabdf741478d7' })
    && record.sourceCount === 198 && record.transitionCount === 11 && record.unchangedSourceCount === 187
    && equal(record.historicalArtifactScope, { routeCount: 6, artifactCount: 18, reexecuted: false, changed: false })
    && ['createsOwnerApproval', 'changesHistoricalOutputEvidence', 'establishesCurrentOutputReproduction',
      'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'commercialAuthorityGranted',
      'productionAuthorized'].every(key => record[key] === false), 'MS/GA/VA/MN source succession scope');
  insist(Array.isArray(record.transitions) && record.transitions.length === 11
    && new Set(record.transitions.map(row => row.file)).size === 11, 'MS/GA/VA/MN source succession inventory');
  // This record retains its historical eleven-source scope. The separately
  // pinned CA successor validates the complete current twelve-source chain.
  assertCaTwoResultCopySourceSuccession(readBytes);
  return record;
}
// Exact CA display-only source hop; no historical record or byte is projected.
export const CA_TWO_RESULT_COPY_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-two-result-copies-20261017-v1.json';
export const CA_TWO_RESULT_COPY_SOURCE_SHA256 = 'c210172511d6897232962cc9e4944f353744f67736376a9b4199f97c4ead1853';
export function assertCaTwoResultCopySourceSuccession(readBytes) {
  const bytes = readBytes(CA_TWO_RESULT_COPY_SOURCE_PATH);
  insist(sha(bytes) === CA_TWO_RESULT_COPY_SOURCE_SHA256, 'CA two-result copy source succession record bytes changed');
  const record = JSON.parse(bytes.toString('utf8'));
  const previousBytes = readBytes(MS_GA_VA_MN_SOURCE_SUCCESSION_PATH);
  insist(sha(previousBytes) === MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256, 'MS/GA/VA/MN source succession record bytes changed');
  const previous = JSON.parse(previousBytes.toString('utf8'));
  insist(record.schemaVersion === 'rcap-question-contract-ca-copy-source-succession/v1'
    && record.recordId === 'CA-TWO-RESULT-COPIES-SOURCE-SUCCESSION-20261017'
    && record.kind === 'technical_source_only' && record.engineeringCommit === '7a634bf310b4d3e4b5fe351afbc74dca127dc22a'
    && equal(record.previousNamedSource, { path: MS_GA_VA_MN_SOURCE_SUCCESSION_PATH, sha256: MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256,
      transitionCount: 11, unchangedSourceCountAtPriorScope: 187 })
    && equal(record.historicalContinuity, previous.historicalContinuity)
    && equal(record.historicalOutput, previous.historicalOutput)
    && record.sourceCount === 198 && record.currentChangedSourceCount === 12 && record.currentUnchangedSourceCount === 186
    && equal(record.historicalArtifactScope, { routeCount: 6, artifactCount: 18, reexecuted: false, changed: false })
    && ['createsOwnerApproval', 'changesHistoricalOutputEvidence', 'establishesCurrentOutputReproduction',
      'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'commercialAuthorityGranted',
      'productionAuthorized'].every(key => record[key] === false), 'CA two-result copy source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row => row.file), [
    'src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', 'src/lib/rcap-engine/california-prop64-facts.ts']), 'CA two-result copy source succession inventory');
  const current = new Map(previous.transitions.map(row => [row.file, row.afterSha256]));
  insist(current.size === 11 && previous.transitions.length === 11, 'CA source succession prior inventory');
  for (const row of record.transitions) {
    const predecessor = current.get(row.file) ?? (row.file === 'src/lib/rcap-engine/california-prop64-facts.ts' ? '8bcaf7809c7e636758fb1509ab4d7a681426b01608fcb6d22c1d97dfe80815d9' : null);
    insist(row.beforeSha256 === predecessor, 'CA source succession disconnected source hop');
    current.set(row.file, row.afterSha256);
  }
  const priorCatalog = previous.transitions.find(row => row.file === 'src/lib/expungement-ai/frontend/reviewed-result-display-copy.json');
  insist(priorCatalog && equal(record.catalogChain, { historicalProofSha256: priorCatalog.beforeSha256,
    previousNamedSha256: priorCatalog.afterSha256, currentSha256: current.get('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json') })
    && current.size === 12, 'CA source succession exact catalog chain');
  // Retain the immutable CA12/186 scope; the separately pinned NY hop checks
  // the complete current13-source chain without rewriting prior records.
  assertNy16055TerminologySourceSuccession(readBytes);
  return record;
}

// Exact NY draft terminology source hop, separate from historical output proof.
export const NY16055_TERMINOLOGY_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ny16055-three-terminology-20261017-v1.json';
export const NY16055_TERMINOLOGY_SOURCE_SHA256 = '030a7c4637e9c1544e4f1302b977dfb572053f1f4617ac180bf7625487621e77';
export function assertNy16055TerminologySourceSuccession(readBytes) {
  const { record } = ny16055TerminologyChain(readBytes);
  // Retain the immutable NY13/185 scope; the separately pinned GA hop checks
  // the complete current fourteen-source chain without rewriting prior records.
  assertGaPardonSpecPinSourceSuccession(readBytes);
  return record;
}
function ny16055TerminologyChain(readBytes) {
  const bytes=readBytes(NY16055_TERMINOLOGY_SOURCE_PATH);
  insist(sha(bytes)===NY16055_TERMINOLOGY_SOURCE_SHA256,'NY16055 terminology source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const caBytes=readBytes(CA_TWO_RESULT_COPY_SOURCE_PATH);
  insist(sha(caBytes)===CA_TWO_RESULT_COPY_SOURCE_SHA256,'CA two-result copy source succession record bytes changed');
  const ca=JSON.parse(caBytes.toString('utf8'));
  const oldBytes=readBytes(MS_GA_VA_MN_SOURCE_SUCCESSION_PATH);
  insist(sha(oldBytes)===MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256,'MS/GA/VA/MN source succession record bytes changed');
  const previous=JSON.parse(oldBytes.toString('utf8'));
  insist(record.schemaVersion==='rcap-question-contract-ny16055-terminology-source-succession/v1'
    && record.recordId==='NY16055-THREE-TERMINOLOGY-SOURCE-SUCCESSION-20261017'
    && record.kind==='technical_source_only' && record.engineeringCommit==='ceab068e49598c35e99b7c2abb7b9fd9a274d3ea'
    && equal(record.previousNamedSource,{path:CA_TWO_RESULT_COPY_SOURCE_PATH,sha256:CA_TWO_RESULT_COPY_SOURCE_SHA256,currentChangedSourceCount:12,currentUnchangedSourceCount:186})
    && equal(record.historicalContinuity,ca.historicalContinuity) && equal(record.historicalOutput,ca.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===13 && record.currentUnchangedSourceCount===185
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'NY16055 terminology source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),[
    'src/lib/expungement-ai/frontend/reviewed-result-display-copy.json','src/lib/rcap-engine/ny-16055-guidance.ts']),'NY16055 terminology source succession inventory');
  insist(previous.transitions.length===11 && new Set(previous.transitions.map(row=>row.file)).size===11
    && ca.transitions.length===2 && ca.previousNamedSource.sha256===MS_GA_VA_MN_SOURCE_SUCCESSION_SHA256,'NY16055 prior source chain inventory');
  const current=new Map(previous.transitions.map(row=>[row.file,row.afterSha256]));
  for(const row of ca.transitions){
    const predecessor=current.get(row.file)??(row.file==='src/lib/rcap-engine/california-prop64-facts.ts'?'8bcaf7809c7e636758fb1509ab4d7a681426b01608fcb6d22c1d97dfe80815d9':null);
    insist(row.beforeSha256===predecessor,'NY16055 disconnected prior CA hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===12,'NY16055 prior twelve-source inventory');
  for(const row of record.transitions){
    const predecessor=current.get(row.file)??(row.file==='src/lib/rcap-engine/ny-16055-guidance.ts'?'0809ecf6d75a10557d0dac416c663896a09883c6492bbf05c7adfce344735cff':null);
    insist(row.beforeSha256===predecessor,'NY16055 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===13 && equal(record.catalogChain,{historicalProofSha256:ca.catalogChain.historicalProofSha256,
    firstNamedSha256:ca.catalogChain.previousNamedSha256,previousNamedSha256:ca.catalogChain.currentSha256,
    currentSha256:current.get('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json')}),'NY16055 exact catalog chain');
  return { record, current };
}

// Exact GA-12-M00730 reviewed specification-pin hop; no category consumer.
export const GA_PARDON_SPEC_PIN_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-spec-pin-20261017-v1.json';
export const GA_PARDON_SPEC_PIN_SOURCE_SHA256 = '33d7dd7dbd21456003a3aacb5417c01a5c28e84edfeeb0e1f6f0904970aab723';
export function assertGaPardonSpecPinSourceSuccession(readBytes) {
  const { record } = gaPardonSpecPinChain(readBytes);
  // Retain the immutable GA14/184 scope; the separately pinned contact hop
  // checks the complete current fifteen-source chain without rewriting it.
  assertGaPardonContactSuccessorSourceSuccession(readBytes);
  return record;
}
function gaPardonSpecPinChain(readBytes) {
  const bytes=readBytes(GA_PARDON_SPEC_PIN_SOURCE_PATH);
  insist(sha(bytes)===GA_PARDON_SPEC_PIN_SOURCE_SHA256,'GA pardon spec-pin source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: ny, current }=ny16055TerminologyChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga-pardon-spec-pin-source-succession/v1'
    && record.recordId==='GA12-M00730-PARDON-SPEC-PIN-SOURCE-SUCCESSION-20261017'
    && record.kind==='technical_source_only' && record.engineeringCommit==='6e7426c667ce86f344cf06f377008602a789e625'
    && equal(record.previousNamedSource,{path:NY16055_TERMINOLOGY_SOURCE_PATH,sha256:NY16055_TERMINOLOGY_SOURCE_SHA256,currentChangedSourceCount:13,currentUnchangedSourceCount:185})
    && equal(record.historicalContinuity,ny.historicalContinuity) && equal(record.historicalOutput,ny.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===14 && record.currentUnchangedSourceCount===184
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA pardon spec-pin source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),[
    'src/lib/expungement-ai/ga-pardon-category-context.ts']),'GA pardon spec-pin source succession inventory');
  insist(current.size===13,'GA pardon spec-pin prior thirteen-source inventory');
  for(const row of record.transitions){
    const predecessor=current.get(row.file)??(row.file==='src/lib/expungement-ai/ga-pardon-category-context.ts'?'248f51c31b3110647196b80f700bfb8cb5c2ec3a8f8635e9c57135db11a90508':null);
    insist(row.beforeSha256===predecessor,'GA pardon spec-pin disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===14,'GA pardon spec-pin current fourteen-source inventory');
  return { record, current };
}

// Exact GA pardon contact-contract successor hop; original identity retained.
export const GA_PARDON_CONTACT_SUCCESSOR_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-contact-successor-20261017-v1.json';
export const GA_PARDON_CONTACT_SUCCESSOR_SOURCE_SHA256 = '99b5e6333caa0bc2110da3230e3027efdcb3ed02c936ef80bbfcce279ca6d56b';
export function assertGaPardonContactSuccessorSourceSuccession(readBytes) {
  const { record } = gaPardonContactSuccessorChain(readBytes);
  // Retain the immutable GA15/183 scope; the separately pinned GA/VA gate hop
  // checks the complete current seventeen-source chain without rewriting it.
  assertGaVaSpecSuccessorGatesSourceSuccession(readBytes);
  return record;
}
function gaPardonContactSuccessorChain(readBytes) {
  const bytes=readBytes(GA_PARDON_CONTACT_SUCCESSOR_SOURCE_PATH);
  insist(sha(bytes)===GA_PARDON_CONTACT_SUCCESSOR_SOURCE_SHA256,'GA pardon contact successor source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: ga, current }=gaPardonSpecPinChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga-pardon-contact-successor-source-succession/v1'
    && record.recordId==='GA-PARDON-CONTACT-SUCCESSOR-SOURCE-SUCCESSION-20261017'
    && record.kind==='technical_source_only' && record.engineeringCommit==='ed6da73c85ee7539544bcb3735eeeacfc38d9d72'
    && equal(record.previousNamedSource,{path:GA_PARDON_SPEC_PIN_SOURCE_PATH,sha256:GA_PARDON_SPEC_PIN_SOURCE_SHA256,currentChangedSourceCount:14,currentUnchangedSourceCount:184})
    && equal(record.historicalContinuity,ga.historicalContinuity) && equal(record.historicalOutput,ga.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===15 && record.currentUnchangedSourceCount===183
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA pardon contact successor source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),[
    'src/lib/expungement-ai/reviewed-contact-contracts.json']),'GA pardon contact successor source succession inventory');
  insist(current.size===14,'GA pardon contact successor prior fourteen-source inventory');
  for(const row of record.transitions){
    const predecessor=current.get(row.file)??(row.file==='src/lib/expungement-ai/reviewed-contact-contracts.json'?'86fe2640ff8654ddc481cb52afd10fb03f14315d1f17b48f84a816b5d5d7d4f1':null);
    insist(row.beforeSha256===predecessor,'GA pardon contact successor disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===15,'GA pardon contact successor current fifteen-source inventory');
  return { record, current };
}

// Exact GA court-completion and VA victim-status gate successors of adopted specs.
export const GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-va-spec-successor-gates-20261017-v1.json';
export const GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_SHA256 = 'e86025b305aa6d4f0b0e34ec4d9fcb6d41538ca9af49c097cd5143743198fdc8';
export function assertGaVaSpecSuccessorGatesSourceSuccession(readBytes) {
  const { record } = gaVaSpecSuccessorGatesChain(readBytes);
  // Retain the immutable GA/VA17/181 scope; the separately pinned CA no-phone hop
  // checks the complete current eighteen-source chain without rewriting it.
  assertCaNoPhoneContactSourceSuccession(readBytes);
  return record;
}
function gaVaSpecSuccessorGatesChain(readBytes) {
  const bytes=readBytes(GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_PATH);
  insist(sha(bytes)===GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_SHA256,'GA/VA spec successor gates source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: contact, current }=gaPardonContactSuccessorChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga-va-spec-successor-gates-source-succession/v1'
    && record.recordId==='GA-VA-SPEC-SUCCESSOR-GATES-SOURCE-SUCCESSION-20261017'
    && record.kind==='technical_source_only' && record.engineeringCommit==='fb9142cb1b020240416632f563aae022ab676d29'
    && equal(record.previousNamedSource,{path:GA_PARDON_CONTACT_SUCCESSOR_SOURCE_PATH,sha256:GA_PARDON_CONTACT_SUCCESSOR_SOURCE_SHA256,currentChangedSourceCount:15,currentUnchangedSourceCount:183})
    && equal(record.historicalContinuity,contact.historicalContinuity) && equal(record.historicalOutput,contact.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===17 && record.currentUnchangedSourceCount===181
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA/VA spec successor gates source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),['src/lib/expungement-ai/reviewed-court-completion-contracts.json', 'src/lib/rcap-engine/virginia-victim-question.ts']),'GA/VA spec successor gates source succession inventory');
  insist(current.size===15,'GA/VA spec successor gates prior fifteen-source inventory');
  const v21={
      'src/lib/expungement-ai/reviewed-court-completion-contracts.json':'3a11d073bfec48657920cd62695a3bf20f0221d454cba101894d9eec43481185',
      'src/lib/rcap-engine/virginia-victim-question.ts':'e01dd6aa7ca6cccf03cda23a609cb94d9eb874ababd1eef2b7a3da69e20ba737',
  };
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'GA/VA spec successor gates disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===17,'GA/VA spec successor gates current seventeen-source inventory');
  return { record, current };
}

// Exact CA explicit-absent phone contact successor hop (adopted v4 truthful none).
export const CA_NO_PHONE_CONTACT_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-no-phone-contact-20261017-v1.json';
export const CA_NO_PHONE_CONTACT_SOURCE_SHA256 = 'd7e1ccbaa3e602513dacc3a9f5bafd42b7e8714fa0b37b3b95dd21b7772a20e2';
export function assertCaNoPhoneContactSourceSuccession(readBytes) {
  const { record } = caNoPhoneContactChain(readBytes);
  // Retain the immutable CA no-phone 18/180 scope; the separately pinned GA SB288 /
  // CT petition hop checks the complete current twenty-source chain without rewriting it.
  assertGaSb288CtPetitionSourceSuccession(readBytes);
  return record;
}
function caNoPhoneContactChain(readBytes) {
  const bytes=readBytes(CA_NO_PHONE_CONTACT_SOURCE_PATH);
  insist(sha(bytes)===CA_NO_PHONE_CONTACT_SOURCE_SHA256,'CA no-phone contact source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: gates, current }=gaVaSpecSuccessorGatesChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ca-no-phone-contact-source-succession/v1'
    && record.recordId==='CA-NO-PHONE-CONTACT-SOURCE-SUCCESSION-20261017'
    && record.kind==='technical_source_only' && record.engineeringCommit==='ccbdd8b95254156cfee07a6eb841b147469967e7'
    && equal(record.previousNamedSource,{path:GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_PATH,sha256:GA_VA_SPEC_SUCCESSOR_GATES_SOURCE_SHA256,currentChangedSourceCount:17,currentUnchangedSourceCount:181})
    && equal(record.historicalContinuity,gates.historicalContinuity) && equal(record.historicalOutput,gates.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===18 && record.currentUnchangedSourceCount===180
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'CA no-phone contact source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),['src/lib/expungement-ai/ca-prop64-contact-answer.ts']),'CA no-phone contact source succession inventory');
  insist(current.size===17,'CA no-phone contact prior seventeen-source inventory');
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??(row.file==='src/lib/expungement-ai/ca-prop64-contact-answer.ts'?'a58c7412563351190a6f7774ab2fa8948569ea7b1e6c6f41e15881e4bca85072':null)),'CA no-phone contact disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===18,'CA no-phone contact current eighteen-source inventory');
  return { record, current };
}

// Exact GA SB288 / CT clean-slate petition / NV question hop (GA-12 registered members).
export const GA_SB288_CT_PETITION_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-sb288-ct-petition-20261018-v1.json';
export const GA_SB288_CT_PETITION_SOURCE_SHA256 = 'e18478ad392f8577b87cc6f8209f027404062b7dbf593a8f1eda4c297b671b1f';
export function assertGaSb288CtPetitionSourceSuccession(readBytes) {
  const { record } = gaSb288CtPetitionChain(readBytes);
  // Retain the immutable GA SB288/CT 20/178 scope; the separately pinned GA guide
  // Spanish hop checks the complete current twenty-one-source chain without rewriting it.
  assertGaGuideSpanishSourceSuccession(readBytes);
  return record;
}
function gaSb288CtPetitionChain(readBytes) {
  const bytes=readBytes(GA_SB288_CT_PETITION_SOURCE_PATH);
  insist(sha(bytes)===GA_SB288_CT_PETITION_SOURCE_SHA256,'GA SB288/CT petition source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: caNoPhone, current }=caNoPhoneContactChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga-sb288-ct-petition-source-succession/v1'
    && record.recordId==='GA-SB288-CT-PETITION-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='c0ffa217f767bfdd7fae727017c182157d657867'
    && equal(record.previousNamedSource,{path:CA_NO_PHONE_CONTACT_SOURCE_PATH,sha256:CA_NO_PHONE_CONTACT_SOURCE_SHA256,currentChangedSourceCount:18,currentUnchangedSourceCount:180})
    && equal(record.historicalContinuity,caNoPhone.historicalContinuity) && equal(record.historicalOutput,caNoPhone.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===20 && record.currentUnchangedSourceCount===178
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA SB288/CT petition source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/reviewed-result-copy.ts", "src/lib/rcap-engine/public-profile-projection.ts", "src/lib/rcap-engine/screening-question-selection.ts"]),'GA SB288/CT petition source succession inventory');
  insist(current.size===18,'GA SB288/CT petition prior eighteen-source inventory');
  const v21={
      'src/lib/rcap-engine/public-profile-projection.ts':'6d8c35cbfc08cb52e6e48660ac64ca3bcca23dcbd9e0eec1a412089b0e043483',
      'src/lib/rcap-engine/screening-question-selection.ts':'a1b5089b63d68ae921223164567b9206f514b7592222666e7b57f19c23531879',
  };
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'GA SB288/CT petition disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===20,'GA SB288/CT petition current twenty-source inventory');
  return { record, current };
}

// Exact GA guide Spanish-text hop (owner-designated lead Spanish review).
export const GA_GUIDE_SPANISH_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-guide-spanish-20261018-v1.json';
export const GA_GUIDE_SPANISH_SOURCE_SHA256 = '2faf1c2c271731f89fe4d8d61308458149d5005f617743ebf60857e726e82a86';
export function assertGaGuideSpanishSourceSuccession(readBytes) {
  const { record } = gaGuideSpanishChain(readBytes);
  // Retain the immutable GA guide Spanish 21/177 scope; the separately pinned CT prepay
  // record-facts hop checks the complete current twenty-one-source chain without rewriting it.
  assertCtPrepayRecordFactsSourceSuccession(readBytes);
  return record;
}
function gaGuideSpanishChain(readBytes) {
  const bytes=readBytes(GA_GUIDE_SPANISH_SOURCE_PATH);
  insist(sha(bytes)===GA_GUIDE_SPANISH_SOURCE_SHA256,'GA guide Spanish source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: gaCt, current }=gaSb288CtPetitionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga-guide-spanish-source-succession/v1'
    && record.recordId==='GA-GUIDE-SPANISH-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='2499d09fe9b9775ad0175945e4385f0ae85acd7c'
    && equal(record.previousNamedSource,{path:GA_SB288_CT_PETITION_SOURCE_PATH,sha256:GA_SB288_CT_PETITION_SOURCE_SHA256,currentChangedSourceCount:20,currentUnchangedSourceCount:178})
    && equal(record.historicalContinuity,gaCt.historicalContinuity) && equal(record.historicalOutput,gaCt.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===21 && record.currentUnchangedSourceCount===177
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA guide Spanish source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json", "data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json"]),'GA guide Spanish source succession inventory');
  insist(current.size===20,'GA guide Spanish prior twenty-source inventory');
  const v21={'data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json':'48662d73341a68d429cbab7071d411ac5cbd509dcafa059d8d210413e1f363ff'};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'GA guide Spanish disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===21,'GA guide Spanish current twenty-one-source inventory');
  return { record, current };
}

// Exact CT petition prepay record-facts hop (protected-intake move for the prepay gate).
export const CT_PREPAY_RECORD_FACTS_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ct-prepay-record-facts-20261018-v1.json';
export const CT_PREPAY_RECORD_FACTS_SOURCE_SHA256 = '5e4184ad7ac4a887fd4543acddbdac657e7af26890a9ffd80f843ba007da3e11';
export function assertCtPrepayRecordFactsSourceSuccession(readBytes) {
  const { record } = ctPrepayRecordFactsChain(readBytes);
  // Retain the immutable CT prepay 21/177 scope; the separately pinned IL/SD/WY
  // record-facts hop checks the complete current twenty-one-source chain without rewriting it.
  assertIlSdWyRecordFactsSourceSuccession(readBytes);
  return record;
}
function ctPrepayRecordFactsChain(readBytes) {
  const bytes=readBytes(CT_PREPAY_RECORD_FACTS_SOURCE_PATH);
  insist(sha(bytes)===CT_PREPAY_RECORD_FACTS_SOURCE_SHA256,'CT prepay record-facts source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: gaGuide, current }=gaGuideSpanishChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ct-prepay-record-facts-source-succession/v1'
    && record.recordId==='CT-PREPAY-RECORD-FACTS-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='8d72ff3406f99ccc92692aa9853e0d1a4d83000b'
    && equal(record.previousNamedSource,{path:GA_GUIDE_SPANISH_SOURCE_PATH,sha256:GA_GUIDE_SPANISH_SOURCE_SHA256,currentChangedSourceCount:21,currentUnchangedSourceCount:177})
    && equal(record.historicalContinuity,gaGuide.historicalContinuity) && equal(record.historicalOutput,gaGuide.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===21 && record.currentUnchangedSourceCount===177
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'CT prepay record-facts source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/rcap-engine/public-profile-projection.ts", "src/lib/rcap-engine/screening-question-selection.ts"]),'CT prepay record-facts source succession inventory');
  insist(current.size===21,'CT prepay record-facts prior twenty-one-source inventory');
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??null),'CT prepay record-facts disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===21,'CT prepay record-facts current twenty-one-source inventory');
  return { record, current };
}

// Exact IL/SD/WY record-facts hop (protected-intake move, trafficking/ten-year boundaries, EN/ES copy).
export const IL_SD_WY_RECORD_FACTS_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-il-sd-wy-record-facts-20261018-v1.json';
export const IL_SD_WY_RECORD_FACTS_SOURCE_SHA256 = '752cd4c1972e1e853a8c07fc23cd492342264d066e1cc764260aa2bd3881af5a';
export function assertIlSdWyRecordFactsSourceSuccession(readBytes) {
  const { record } = ilSdWyRecordFactsChain(readBytes);
  // Retain the immutable IL/SD/WY 21/177 scope; the separately pinned OH juvenile copy
  // hop checks the complete current twenty-one-source chain without rewriting it.
  assertOhJuvenileCopySourceSuccession(readBytes);
  return record;
}
function ilSdWyRecordFactsChain(readBytes) {
  const bytes=readBytes(IL_SD_WY_RECORD_FACTS_SOURCE_PATH);
  insist(sha(bytes)===IL_SD_WY_RECORD_FACTS_SOURCE_SHA256,'IL/SD/WY record-facts source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: ctPrepay, current }=ctPrepayRecordFactsChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-il-sd-wy-record-facts-source-succession/v1'
    && record.recordId==='IL-SD-WY-RECORD-FACTS-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='a97f5c1c98c179132eb07593f8b53c64f9b0b80e'
    && equal(record.previousNamedSource,{path:CT_PREPAY_RECORD_FACTS_SOURCE_PATH,sha256:CT_PREPAY_RECORD_FACTS_SOURCE_SHA256,currentChangedSourceCount:21,currentUnchangedSourceCount:177})
    && equal(record.historicalContinuity,ctPrepay.historicalContinuity) && equal(record.historicalOutput,ctPrepay.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===21 && record.currentUnchangedSourceCount===177
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'IL/SD/WY record-facts source succession identity');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/reviewed-result-copy.ts", "src/lib/rcap-engine/public-profile-projection.ts", "src/lib/rcap-engine/screening-question-selection.ts"]),'IL/SD/WY record-facts source succession inventory');
  insist(current.size===21,'IL/SD/WY record-facts prior twenty-one-source inventory');
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??null),'IL/SD/WY record-facts disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===21,'IL/SD/WY record-facts current twenty-one-source inventory');
  return { record, current };
}

// Exact OH juvenile adopted result-copy hop (shared reviewed-result lookup).
export const OH_JUVENILE_COPY_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-oh-juvenile-copy-20261018-v1.json';
export const OH_JUVENILE_COPY_SOURCE_SHA256 = 'd4839a2454672062ed970a3ba367436bacddcbd56aec726841baae0fd8dc6c6b';
export function assertOhJuvenileCopySourceSuccession(readBytes) {
  const { record } = ohJuvenileCopyChain(readBytes);
  // Retain the immutable OH juvenile copy 21/177 scope; the separately pinned CA Safe at Home
  // hop checks the complete current twenty-one-source chain without rewriting it.
  assertCaSafeAtHomeSourceSuccession(readBytes);
  return record;
}
function ohJuvenileCopyChain(readBytes) {
  const bytes=readBytes(OH_JUVENILE_COPY_SOURCE_PATH);
  insist(sha(bytes)===OH_JUVENILE_COPY_SOURCE_SHA256,'OH juvenile copy source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: ilSdWy, current }=ilSdWyRecordFactsChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-oh-juvenile-copy-source-succession/v1'
    && record.recordId==='OH-JUVENILE-COPY-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='4a390f3011ee2820b47fdce55725e96296679027'
    && equal(record.previousNamedSource,{path:IL_SD_WY_RECORD_FACTS_SOURCE_PATH,sha256:IL_SD_WY_RECORD_FACTS_SOURCE_SHA256,currentChangedSourceCount:21,currentUnchangedSourceCount:177})
    && equal(record.historicalContinuity,ilSdWy.historicalContinuity) && equal(record.historicalOutput,ilSdWy.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===21 && record.currentUnchangedSourceCount===177
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'OH juvenile copy source succession identity');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/reviewed-result-copy.ts"]),'OH juvenile copy source succession inventory');
  insist(current.size===21,'OH juvenile copy prior twenty-one-source inventory');
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??null),'OH juvenile copy disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===21,'OH juvenile copy current twenty-one-source inventory');
  return { record, current };
}

// Exact CA Prop 64 Safe at Home contact hop (self-represented designated address).
export const CA_SAFE_AT_HOME_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-safe-at-home-20261018-v1.json';
export const CA_SAFE_AT_HOME_SOURCE_SHA256 = 'c9cd18d975b0cc9d64c14741c0276467fdf320f2fc3b547812795610775d93ac';
export function assertCaSafeAtHomeSourceSuccession(readBytes) {
  const { record } = caSafeAtHomeChain(readBytes);
  // Retain the immutable CA Safe at Home 21/177 scope; the separately pinned lead Spanish
  // hop checks the complete current twenty-three-source chain without rewriting it.
  assertLeadSpanishSourceSuccession(readBytes);
  return record;
}
function caSafeAtHomeChain(readBytes) {
  const bytes=readBytes(CA_SAFE_AT_HOME_SOURCE_PATH);
  insist(sha(bytes)===CA_SAFE_AT_HOME_SOURCE_SHA256,'CA Safe at Home source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: ohCopy, current }=ohJuvenileCopyChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ca-safe-at-home-source-succession/v1'
    && record.recordId==='CA-SAFE-AT-HOME-SOURCE-SUCCESSION-20261018'
    && record.kind==='technical_source_only' && record.engineeringCommit==='64550439151f381c8c333b55bedf4003c84245c2'
    && equal(record.previousNamedSource,{path:OH_JUVENILE_COPY_SOURCE_PATH,sha256:OH_JUVENILE_COPY_SOURCE_SHA256,currentChangedSourceCount:21,currentUnchangedSourceCount:177})
    && equal(record.historicalContinuity,ohCopy.historicalContinuity) && equal(record.historicalOutput,ohCopy.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===21 && record.currentUnchangedSourceCount===177
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'CA Safe at Home source succession identity');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/ca-prop64-contact-answer.ts"]),'CA Safe at Home source succession inventory');
  insist(current.size===21,'CA Safe at Home prior twenty-one-source inventory');
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??null),'CA Safe at Home disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===21,'CA Safe at Home current twenty-one-source inventory');
  return { record, current };
}

// Lead Spanish review successors (MS timing final, CA-08, MS justice labels, NY08, discharge glossary).
export const LEAD_SPANISH_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-20261019-v1.json';
export const LEAD_SPANISH_SOURCE_SHA256 = '78cf8e83954695bbcc85d740dab75577353d40ab3553301881913b97b86808e3';
export function assertLeadSpanishSourceSuccession(readBytes) {
  const { record } = leadSpanishChain(readBytes);
  // Retain the immutable lead Spanish 23/175 scope; the separately pinned lead Spanish layer-2
  // hop checks the complete current chain without rewriting it.
  assertLeadSpanishLayer2SourceSuccession(readBytes);
  return record;
}
function leadSpanishChain(readBytes) {
  const bytes=readBytes(LEAD_SPANISH_SOURCE_PATH);
  insist(sha(bytes)===LEAD_SPANISH_SOURCE_SHA256,'lead Spanish source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: caSafe, current }=caSafeAtHomeChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-lead-spanish-source-succession/v1'
    && record.recordId==='LEAD-SPANISH-SOURCE-SUCCESSION-20261019'
    && record.kind==='technical_source_only' && record.engineeringCommit==='a9678e3a0fd53f66a506e2252e8e1b244201e9a1'
    && equal(record.previousNamedSource,{path:CA_SAFE_AT_HOME_SOURCE_PATH,sha256:CA_SAFE_AT_HOME_SOURCE_SHA256,currentChangedSourceCount:21,currentUnchangedSourceCount:177})
    && equal(record.historicalContinuity,caSafe.historicalContinuity) && equal(record.historicalOutput,caSafe.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===23 && record.currentUnchangedSourceCount===175
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'lead Spanish source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-question-spanish.json", "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/ny-16055-guidance.ts", "src/lib/rcap-engine/ny-16057-guidance.ts", "src/lib/rcap-engine/ny-mrta-stage-facts.ts"]),'lead Spanish source succession inventory');
  insist(current.size===21,'lead Spanish prior twenty-one-source inventory');
  const v21={"src/lib/rcap-engine/ny-16057-guidance.ts": "279ec693551a142352644a3120d8bf036b3508daa8b8409a6df6ac008b07e4d5", "src/lib/rcap-engine/ny-mrta-stage-facts.ts": "88eb4f2176cc37925144d592ce7cb710c5378c41992fa32a21106e65d14e7614"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'lead Spanish disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===23,'lead Spanish current twenty-three-source inventory');
  return { record, current };
}

// Lead Spanish review layer 2 (2026-10-19, owner-designated AI language review, not certified): Delaware, KS district and 
export const LEAD_SPANISH_L2_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-layer2-20261019-v1.json';
export const LEAD_SPANISH_L2_SOURCE_SHA256 = '15e81cc6a3f0ea2496d5de56eefe10b920e3df3d5e758f5f0b8c0172fb488db6';
export function assertLeadSpanishLayer2SourceSuccession(readBytes) {
  const { record } = leadSpanishLayer2SourceSuccessionChain(readBytes);
  // Retain the immutable lead Spanish layer-2 25/173 scope; the separately pinned MN guard memo
  // hop checks the complete current chain without rewriting it.
  assertMnGuardMemoSourceSuccession(readBytes);
  return record;
}
function leadSpanishLayer2SourceSuccessionChain(readBytes) {
  const bytes=readBytes(LEAD_SPANISH_L2_SOURCE_PATH);
  insist(sha(bytes)===LEAD_SPANISH_L2_SOURCE_SHA256,'lead Spanish layer-2 source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=leadSpanishChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-lead-spanish-layer2-source-succession/v1'
    && record.recordId==='LEAD-SPANISH-LAYER2-SOURCE-SUCCESSION-20261019'
    && record.kind==='technical_source_only' && record.engineeringCommit==='ed7d50ab1258548f7c4d86ad8676140ec1eea431'
    && equal(record.previousNamedSource,{path:LEAD_SPANISH_SOURCE_PATH,sha256:LEAD_SPANISH_SOURCE_SHA256,currentChangedSourceCount:23,currentUnchangedSourceCount:175})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===25 && record.currentUnchangedSourceCount===173
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'lead Spanish layer-2 source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/delaware-conviction-questions.ts", "src/lib/rcap-engine/new-york-16059-questions.ts"]),'lead Spanish layer-2 source succession inventory');
  insist(current.size===23,'lead Spanish layer-2 prior twenty-three-source inventory');
  const v21={"src/lib/rcap-engine/delaware-conviction-questions.ts": "f43635b1f57d35ce297dff1681e7193310d5601015f70c89f0867f030dba2e6b", "src/lib/rcap-engine/new-york-16059-questions.ts": "2ab3096513e4f075d2897618ff8692507f4cecda07c2445df0af5c5189639a93"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'lead Spanish layer-2 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===25,'lead Spanish layer-2 current twenty-five-source inventory');
  return { record, current };
}

// CI agent performance change (de570be32): the MN two-county guard hashes its imported constants once per process; every o
export const MN_GUARD_MEMO_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-mn-guard-memo-20261019-v1.json';
export const MN_GUARD_MEMO_SOURCE_SHA256 = '847b6efa41ebe9da518e0da52f264f55947ba043f57a8d446b4dd1672e8af307';
export function assertMnGuardMemoSourceSuccession(readBytes) {
  const { record } = mnGuardMemoSourceSuccessionChain(readBytes);
  // Retain the immutable MN guard memo 25/173 scope; the separately pinned VA guard memo
  // hop checks the complete current chain without rewriting it.
  assertVaGuardMemoSourceSuccession(readBytes);
  return record;
}
function mnGuardMemoSourceSuccessionChain(readBytes) {
  const bytes=readBytes(MN_GUARD_MEMO_SOURCE_PATH);
  insist(sha(bytes)===MN_GUARD_MEMO_SOURCE_SHA256,'MN guard memo source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=leadSpanishLayer2SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-mn-guard-memo-source-succession/v1'
    && record.recordId==='MN-GUARD-MEMO-SOURCE-SUCCESSION-20261019'
    && record.kind==='technical_source_only' && record.engineeringCommit==='de570be32ecfeae274fac9dfb1f533b73a843fba'
    && equal(record.previousNamedSource,{path:LEAD_SPANISH_L2_SOURCE_PATH,sha256:LEAD_SPANISH_L2_SOURCE_SHA256,currentChangedSourceCount:25,currentUnchangedSourceCount:173})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===25 && record.currentUnchangedSourceCount===173
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'MN guard memo source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/mn-two-county-source-facts.ts"]),'MN guard memo source succession inventory');
  insist(current.size===25,'MN guard memo prior twenty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'MN guard memo disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===25,'MN guard memo current twenty-five-source inventory');
  return { record, current };
}

// CI agent performance change (009ec5bef): the VA victim guard hashes its imported constants once per process; every overr
export const VA_GUARD_MEMO_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-va-guard-memo-20261019-v1.json';
export const VA_GUARD_MEMO_SOURCE_SHA256 = 'facfd6b0e585b37d6ffb14a4890c35342ea18f80b3515254e8a7094247a7cdb1';
export function assertVaGuardMemoSourceSuccession(readBytes) {
  const { record } = vaGuardMemoSourceSuccessionChain(readBytes);
  // Retain the immutable VA guard memo 25/173 scope; the separately pinned MD police-record reconciliation
  // hop checks the complete current chain without rewriting it.
  assertMdPoliceReconciliationSourceSuccession(readBytes);
  return record;
}
function vaGuardMemoSourceSuccessionChain(readBytes) {
  const bytes=readBytes(VA_GUARD_MEMO_SOURCE_PATH);
  insist(sha(bytes)===VA_GUARD_MEMO_SOURCE_SHA256,'VA guard memo source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=mnGuardMemoSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-va-guard-memo-source-succession/v1'
    && record.recordId==='VA-GUARD-MEMO-SOURCE-SUCCESSION-20261019'
    && record.kind==='technical_source_only' && record.engineeringCommit==='009ec5bef1f3d67f806016eb0770e1509ae5c41c'
    && equal(record.previousNamedSource,{path:MN_GUARD_MEMO_SOURCE_PATH,sha256:MN_GUARD_MEMO_SOURCE_SHA256,currentChangedSourceCount:25,currentUnchangedSourceCount:173})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===25 && record.currentUnchangedSourceCount===173
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'VA guard memo source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/rcap-engine/virginia-victim-question.ts"]),'VA guard memo source succession inventory');
  insist(current.size===25,'VA guard memo prior twenty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'VA guard memo disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===25,'VA guard memo current twenty-five-source inventory');
  return { record, current };
}

// Owner item 11 (2026-10-19): the MD police-record source-stage reconciliation (generator/compiled profile/screening parit
export const MD_POLICE_RECONCILIATION_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-md-police-reconciliation-20261019-v1.json';
export const MD_POLICE_RECONCILIATION_SOURCE_SHA256 = 'fa08f48e8da4f96a3323fb591189e7413a4706327db0a84a2ec28e9c62a2d9c7';
export function assertMdPoliceReconciliationSourceSuccession(readBytes) {
  const { record } = mdPoliceReconciliationSourceSuccessionChain(readBytes);
  // Retain the immutable MD police-record reconciliation 28/170 scope; the separately pinned VA record origin
  // hop checks the complete current chain without rewriting it.
  assertVaRecordOriginSourceSuccession(readBytes);
  return record;
}
function mdPoliceReconciliationSourceSuccessionChain(readBytes) {
  const bytes=readBytes(MD_POLICE_RECONCILIATION_SOURCE_PATH);
  insist(sha(bytes)===MD_POLICE_RECONCILIATION_SOURCE_SHA256,'MD police-record reconciliation source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=vaGuardMemoSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-md-police-reconciliation-source-succession/v1'
    && record.recordId==='MD-POLICE-RECONCILIATION-SOURCE-SUCCESSION-20261019'
    && record.kind==='technical_source_only' && record.engineeringCommit==='5f17a7ff48ee09f390b12942f4e06b8a99de7125'
    && equal(record.previousNamedSource,{path:VA_GUARD_MEMO_SOURCE_PATH,sha256:VA_GUARD_MEMO_SOURCE_SHA256,currentChangedSourceCount:25,currentUnchangedSourceCount:173})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===28 && record.currentUnchangedSourceCount===170
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'MD police-record reconciliation source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/rcap-engine/maryland-police-record-facts.ts", "src/lib/rcap-engine/oklahoma-clean-slate-financial.ts", "src/lib/rcap-engine/south-carolina-guidance-financial.ts"]),'MD police-record reconciliation source succession inventory');
  insist(current.size===25,'MD police-record reconciliation prior twenty-five-source inventory');
  const v21={"src/lib/rcap-engine/maryland-police-record-facts.ts": "9f06f36d12bfe56b970a0d89e913ca43718532e10697ea880e62cb1860e131b8", "src/lib/rcap-engine/oklahoma-clean-slate-financial.ts": "5365198c0b724af0cc9bb549315ed7a525681f3f8abe3632a70d64554709e0d4", "src/lib/rcap-engine/south-carolina-guidance-financial.ts": "cd391849f44c3c7f1538074f810df873f8560d921420ab4c2769d2473a252ff8"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'MD police-record reconciliation disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===28,'MD police-record reconciliation current twenty-eight-source inventory');
  return { record, current };
}

// Owner item 12(c) (2026-10-19): the explicit Virginia record-origin question on the AR pattern (VA / other state / federa
export const VA_RECORD_ORIGIN_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-va-record-origin-20261020-v1.json';
export const VA_RECORD_ORIGIN_SOURCE_SHA256 = '2b5243d7190b2cbcee6f453f08865be96bbd0e3e89dd3881247a3a5d9d16cbf3';
export function assertVaRecordOriginSourceSuccession(readBytes) {
  const { record } = vaRecordOriginSourceSuccessionChain(readBytes);
  // Retain the immutable VA record origin 28/170 scope; the separately pinned GA-21 reviewed Spanish labels
  // hop checks the complete current chain without rewriting it.
  assertGa21SpanishLabelsSourceSuccession(readBytes);
  return record;
}
function vaRecordOriginSourceSuccessionChain(readBytes) {
  const bytes=readBytes(VA_RECORD_ORIGIN_SOURCE_PATH);
  insist(sha(bytes)===VA_RECORD_ORIGIN_SOURCE_SHA256,'VA record origin source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=mdPoliceReconciliationSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-va-record-origin-source-succession/v1'
    && record.recordId==='VA-RECORD-ORIGIN-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='81934d66c3a09c76e151f7b117a97e60bee2dcbc'
    && equal(record.previousNamedSource,{path:MD_POLICE_RECONCILIATION_SOURCE_PATH,sha256:MD_POLICE_RECONCILIATION_SOURCE_SHA256,currentChangedSourceCount:28,currentUnchangedSourceCount:170})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===28 && record.currentUnchangedSourceCount===170
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'VA record origin source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/localization.ts", "src/lib/rcap-engine/public-profile-projection.ts", "src/lib/rcap-engine/screening-question-selection.ts"]),'VA record origin source succession inventory');
  insist(current.size===28,'VA record origin prior twenty-eight-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'VA record origin disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===28,'VA record origin current twenty-eight-source inventory');
  return { record, current };
}

// GA-21 (owner Grade A directive 2026-10-19, section 2): the 89 lead-reviewed Spanish labels for the optional pathway menu
export const GA21_SPANISH_LABELS_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga21-spanish-labels-20261020-v1.json';
export const GA21_SPANISH_LABELS_SOURCE_SHA256 = '0a01c7f2ebc0aebff6bafb355bc370abe8e2107b31f858055299de8cb1ed6e3e';
export function assertGa21SpanishLabelsSourceSuccession(readBytes) {
  const { record } = ga21SpanishLabelsSourceSuccessionChain(readBytes);
  // Retain the immutable GA-21 reviewed Spanish labels 29/169 scope; the separately pinned ND custom-pleading receipt pin
  // hop checks the complete current chain without rewriting it.
  assertNdCustomReceiptSourceSuccession(readBytes);
  return record;
}
function ga21SpanishLabelsSourceSuccessionChain(readBytes) {
  const bytes=readBytes(GA21_SPANISH_LABELS_SOURCE_PATH);
  insist(sha(bytes)===GA21_SPANISH_LABELS_SOURCE_SHA256,'GA-21 reviewed Spanish labels source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=vaRecordOriginSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ga21-spanish-labels-source-succession/v1'
    && record.recordId==='GA21-SPANISH-LABELS-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='3bcd0d66e95c8076872f2cb2f7d9925242365312'
    && equal(record.previousNamedSource,{path:VA_RECORD_ORIGIN_SOURCE_PATH,sha256:VA_RECORD_ORIGIN_SOURCE_SHA256,currentChangedSourceCount:28,currentUnchangedSourceCount:170})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===29 && record.currentUnchangedSourceCount===169
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'GA-21 reviewed Spanish labels source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/profiles/all51.json"]),'GA-21 reviewed Spanish labels source succession inventory');
  insist(current.size===28,'GA-21 reviewed Spanish labels prior twenty-eight-source inventory');
  const v21={"src/lib/expungement-ai/frontend/profiles/all51.json": "baf0daeff56a7588021b5d49181b4b6828e38a7ecd545c11348188abefaf2bb5"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'GA-21 reviewed Spanish labels disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===29,'GA-21 reviewed Spanish labels current twenty-nine-source inventory');
  return { record, current };
}

// ND custom pleading (lead ruling: re-admit without rebuild via a SOURCE_IDENTITY row + census re-pin; VF06 PASS at bf02d8
export const ND_CUSTOM_RECEIPT_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-nd-custom-receipt-20261020-v1.json';
export const ND_CUSTOM_RECEIPT_SOURCE_SHA256 = '32fea917f8c6b70480ff72745a05371e9e642ee0cf7bfbb19c14bd82940ef5fd';
export function assertNdCustomReceiptSourceSuccession(readBytes) {
  const { record } = ndCustomReceiptSourceSuccessionChain(readBytes);
  // Retain the immutable ND custom-pleading receipt pin 30/168 scope; the separately pinned MS shared Spanish guide pages
  // hop checks the complete current chain without rewriting it.
  assertMsGuideEsSourceSuccession(readBytes);
  return record;
}
function ndCustomReceiptSourceSuccessionChain(readBytes) {
  const bytes=readBytes(ND_CUSTOM_RECEIPT_SOURCE_PATH);
  insist(sha(bytes)===ND_CUSTOM_RECEIPT_SOURCE_SHA256,'ND custom-pleading receipt pin source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=ga21SpanishLabelsSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-nd-custom-receipt-source-succession/v1'
    && record.recordId==='ND-CUSTOM-RECEIPT-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='697a34d913e5eff4d0d8f9635d348dd6cc58b8f4'
    && equal(record.previousNamedSource,{path:GA21_SPANISH_LABELS_SOURCE_PATH,sha256:GA21_SPANISH_LABELS_SOURCE_SHA256,currentChangedSourceCount:29,currentUnchangedSourceCount:169})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===30 && record.currentUnchangedSourceCount===168
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'ND custom-pleading receipt pin source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/nd-first-offense-family-inputs.ts"]),'ND custom-pleading receipt pin source succession inventory');
  insist(current.size===29,'ND custom-pleading receipt pin prior twenty-nine-source inventory');
  const v21={"src/lib/expungement-ai/nd-first-offense-family-inputs.ts": "53eae24322ce4d94d10c1f2ba7a692959165185f29cd742c55d086c81347663b"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'ND custom-pleading receipt pin disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===30,'ND custom-pleading receipt pin current thirty-source inventory');
  return { record, current };
}

// MS full-es succession (owner approval 2026-10-19 of full-es f80520fb; v4 decision approvedAtCommit b911e98f6): the lead 
export const MS_GUIDE_ES_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ms-guide-es-20261020-v1.json';
export const MS_GUIDE_ES_SOURCE_SHA256 = '1ba897282c56171cb5957fa20e6b2a7b534336d058fa5eb80a259c56d8d2e6fa';
export function assertMsGuideEsSourceSuccession(readBytes) {
  const { record } = msGuideEsSourceSuccessionChain(readBytes);
  // Retain the immutable MS shared Spanish guide pages 31/167 scope; the separately pinned CA Proposition 64 stack
  // hop checks the complete current chain without rewriting it.
  assertCaProp64StackSourceSuccession(readBytes);
  return record;
}
function msGuideEsSourceSuccessionChain(readBytes) {
  const bytes=readBytes(MS_GUIDE_ES_SOURCE_PATH);
  insist(sha(bytes)===MS_GUIDE_ES_SOURCE_SHA256,'MS shared Spanish guide pages source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=ndCustomReceiptSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ms-guide-es-source-succession/v1'
    && record.recordId==='MS-GUIDE-ES-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='b911e98f6234d6092754b1522dd163e498f3a4c5'
    && equal(record.previousNamedSource,{path:ND_CUSTOM_RECEIPT_SOURCE_PATH,sha256:ND_CUSTOM_RECEIPT_SOURCE_SHA256,currentChangedSourceCount:30,currentUnchangedSourceCount:168})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===31 && record.currentUnchangedSourceCount===167
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'MS shared Spanish guide pages source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/rcap/supplemental/guide-renderer.ts"]),'MS shared Spanish guide pages source succession inventory');
  insist(current.size===30,'MS shared Spanish guide pages prior thirty-source inventory');
  const v21={"src/lib/rcap/supplemental/guide-renderer.ts": "ad50f8fcc2061153af51556b625eaa83f571cf6b54b49af5fc369cf2ba06e7b6"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'MS shared Spanish guide pages disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===31,'MS shared Spanish guide pages current thirty-one-source inventory');
  return { record, current };
}

// CA Proposition 64 stack (Codex CA-L02 e657645fe, CA-L05 26ed47cb5, CA-L01 32e4e7198, CA-L06 24be72079; Acceptance ACCEPT
export const CA_PROP64_STACK_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-prop64-stack-20261020-v1.json';
export const CA_PROP64_STACK_SOURCE_SHA256 = 'de3af76bc9b0bb3a6dfb2fb21b3d9d01e3b507e1f7b7fbc6638926caa32a55db';
export function assertCaProp64StackSourceSuccession(readBytes) {
  const { record } = caProp64StackSourceSuccessionChain(readBytes);
  // Retain the immutable CA Proposition 64 stack 33/165 scope; the separately pinned ND census-prose receipt re-pin
  // hop checks the complete current chain without rewriting it.
  assertNdCensusProseSourceSuccession(readBytes);
  return record;
}
function caProp64StackSourceSuccessionChain(readBytes) {
  const bytes=readBytes(CA_PROP64_STACK_SOURCE_PATH);
  insist(sha(bytes)===CA_PROP64_STACK_SOURCE_SHA256,'CA Proposition 64 stack source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=msGuideEsSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-ca-prop64-stack-source-succession/v1'
    && record.recordId==='CA-PROP64-STACK-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='f022e80a8f6bf1429ee3a3d8ae183e780e1836ff'
    && equal(record.previousNamedSource,{path:MS_GUIDE_ES_SOURCE_PATH,sha256:MS_GUIDE_ES_SOURCE_SHA256,currentChangedSourceCount:31,currentUnchangedSourceCount:167})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===33 && record.currentUnchangedSourceCount===165
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'CA Proposition 64 stack source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/ca-prop64-quantity.ts", "src/lib/expungement-ai/frontend/ca-prop64-reviewed-choices.json", "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/california-prop64-facts.ts"]),'CA Proposition 64 stack source succession inventory');
  insist(current.size===31,'CA Proposition 64 stack prior thirty-one-source inventory');
  const v21={"src/lib/expungement-ai/ca-prop64-quantity.ts": "04d1dcf705665e4f9d9cefa6b54c56c60d0a01cb63f01d7b8b4546b72bc4dfa9", "src/lib/expungement-ai/frontend/ca-prop64-reviewed-choices.json": "7734e4428802e89a407bb84f2cf68336070e7e71bfeca2ca31f86f5ece8864a7"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'CA Proposition 64 stack disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===33,'CA Proposition 64 stack current thirty-three-source inventory');
  return { record, current };
}

// ND first-offense census re-pin prose (Acceptance F1 on e3d98e495): CI makes the planner's census identityRefresh why/wha
export const ND_CENSUS_PROSE_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-nd-census-prose-20261020-v1.json';
export const ND_CENSUS_PROSE_SOURCE_SHA256 = '1cda53d201f8ff1acca47279da31a4bc72ccdbe4e3bfe41078d501272116db94';
export function assertNdCensusProseSourceSuccession(readBytes) {
  const { record } = ndCensusProseSourceSuccessionChain(readBytes);
  // Retain the immutable ND census-prose receipt re-pin 33/165 scope; the separately pinned batch28 GA16 NV location history and GA20 helpers
  // hop checks the complete current chain without rewriting it.
  assertB28NvGa20SourceSuccession(readBytes);
  return record;
}
function ndCensusProseSourceSuccessionChain(readBytes) {
  const bytes=readBytes(ND_CENSUS_PROSE_SOURCE_PATH);
  insist(sha(bytes)===ND_CENSUS_PROSE_SOURCE_SHA256,'ND census-prose receipt re-pin source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=caProp64StackSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-nd-census-prose-source-succession/v1'
    && record.recordId==='ND-CENSUS-PROSE-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='ac954ed2c6961f9c8c986fa8dc62bdc5bc9acb49'
    && equal(record.previousNamedSource,{path:CA_PROP64_STACK_SOURCE_PATH,sha256:CA_PROP64_STACK_SOURCE_SHA256,currentChangedSourceCount:33,currentUnchangedSourceCount:165})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===33 && record.currentUnchangedSourceCount===165
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'ND census-prose receipt re-pin source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/nd-first-offense-family-inputs.ts"]),'ND census-prose receipt re-pin source succession inventory');
  insist(current.size===33,'ND census-prose receipt re-pin prior thirty-three-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'ND census-prose receipt re-pin disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===33,'ND census-prose receipt re-pin current thirty-three-source inventory');
  return { record, current };
}

// batch28 lead-written items from Codex's prepared patches (Acceptance pre-review review-evidence/acceptance/batch28-prere
export const B28_NV_GA20_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b28-nv-ga20-20261020-v1.json';
export const B28_NV_GA20_SOURCE_SHA256 = 'b3e8997a682c10c4ee140a7cc6d974dc390064ba769360bf404266b06c06b570';
export function assertB28NvGa20SourceSuccession(readBytes) {
  const { record } = b28NvGa20SourceSuccessionChain(readBytes);
  // Retain the immutable batch28 GA16 NV location history and GA20 helpers 35/163 scope; the separately pinned batch30 CO JDF417 routing and section 8b
  // hop checks the complete current chain without rewriting it.
  assertB30CoSourceSuccession(readBytes);
  return record;
}
function b28NvGa20SourceSuccessionChain(readBytes) {
  const bytes=readBytes(B28_NV_GA20_SOURCE_PATH);
  insist(sha(bytes)===B28_NV_GA20_SOURCE_SHA256,'batch28 GA16 NV location history and GA20 helpers source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=ndCensusProseSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b28-nv-ga20-source-succession/v1'
    && record.recordId==='B28-NV-GA20-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='51b783520d3566c8c385d5a45745a7995f2ae380'
    && equal(record.previousNamedSource,{path:ND_CENSUS_PROSE_SOURCE_PATH,sha256:ND_CENSUS_PROSE_SOURCE_SHA256,currentChangedSourceCount:33,currentUnchangedSourceCount:165})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch28 GA16 NV location history and GA20 helpers source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-source-question-copy.json", "src/lib/expungement-ai/reviewed-question-copy.ts", "src/lib/rcap-engine/california-prop64-facts.ts"]),'batch28 GA16 NV location history and GA20 helpers source succession inventory');
  insist(current.size===33,'batch28 GA16 NV location history and GA20 helpers prior thirty-three-source inventory');
  const v21={"src/lib/expungement-ai/frontend/reviewed-source-question-copy.json": "e4399e300e5ab14df3b4ba8e219c4b510820793544e34f7e51341e90c33ec8bf", "src/lib/expungement-ai/reviewed-question-copy.ts": "787f0c88b19475ad67371c4c0f7f2b3cb20bfecd470e6ec5bef880a253ac5363"};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch28 GA16 NV location history and GA20 helpers disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch28 GA16 NV location history and GA20 helpers current thirty-five-source inventory');
  return { record, current };
}

// batch30 CO items: JDF417 routing keeps adult Colorado convictions out of the nonconviction route (Codex 9b0688e6a; Accep
export const B30_CO_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b30-co-20261020-v1.json';
export const B30_CO_SOURCE_SHA256 = '01f80c4edba43a14ea03edb1deeb232a7e1dcec77f911ad6d025ab7b6fa041cc';
export function assertB30CoSourceSuccession(readBytes) {
  const { record } = b30CoSourceSuccessionChain(readBytes);
  // Retain the immutable batch30 CO JDF417 routing and section 8b 35/163 scope; the separately pinned batch31 CA pardon not-sure
  // hop checks the complete current chain without rewriting it.
  assertB31CaPardonSourceSuccession(readBytes);
  return record;
}
function b30CoSourceSuccessionChain(readBytes) {
  const bytes=readBytes(B30_CO_SOURCE_PATH);
  insist(sha(bytes)===B30_CO_SOURCE_SHA256,'batch30 CO JDF417 routing and section 8b source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b28NvGa20SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b30-co-source-succession/v1'
    && record.recordId==='B30-CO-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='5c2ede0e3d7d08e3ccf68796673c9f1121bb4aca'
    && equal(record.previousNamedSource,{path:B28_NV_GA20_SOURCE_PATH,sha256:B28_NV_GA20_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch30 CO JDF417 routing and section 8b source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/conviction-relief-request.ts"]),'batch30 CO JDF417 routing and section 8b source succession inventory');
  insist(current.size===35,'batch30 CO JDF417 routing and section 8b prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch30 CO JDF417 routing and section 8b disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch30 CO JDF417 routing and section 8b current thirty-five-source inventory');
  return { record, current };
}

// batch31 A21: an explicitly uncertain CA pardon answer returns needs_review/ca.source_fact_unknown with no payment ahead 
export const B31_CA_PARDON_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31-ca-pardon-20261020-v1.json';
export const B31_CA_PARDON_SOURCE_SHA256 = 'a0e4bcde39a49dd6739d4ee97fd3e6ceba290d2627c1cd9ba1fb51f9cdf66496';
export function assertB31CaPardonSourceSuccession(readBytes) {
  const { record } = b31CaPardonSourceSuccessionChain(readBytes);
  // Retain the immutable batch31 CA pardon not-sure 35/163 scope; the separately pinned batch31 CA pardon copy-entry position
  // hop checks the complete current chain without rewriting it.
  assertB31CaOrderSourceSuccession(readBytes);
  return record;
}
function b31CaPardonSourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31_CA_PARDON_SOURCE_PATH);
  insist(sha(bytes)===B31_CA_PARDON_SOURCE_SHA256,'batch31 CA pardon not-sure source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b30CoSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31-ca-pardon-source-succession/v1'
    && record.recordId==='B31-CA-PARDON-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='78994e86f928b71d2afdbb51553c1ef9ea0e0f7c'
    && equal(record.previousNamedSource,{path:B30_CO_SOURCE_PATH,sha256:B30_CO_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31 CA pardon not-sure source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json"]),'batch31 CA pardon not-sure source succession inventory');
  insist(current.size===35,'batch31 CA pardon not-sure prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31 CA pardon not-sure disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31 CA pardon not-sure current thirty-five-source inventory');
  return { record, current };
}

// batch31a A21 fix-forward: CA-A21-PARDON-UNCERTAINTY moves from entries[0] to the end of reviewed-result-display-copy.jso
export const B31_CA_ORDER_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31-ca-order-20261020-v1.json';
export const B31_CA_ORDER_SOURCE_SHA256 = '7477340e8b68cec2132af5293007f865c3997bb1583441640c2e6b856ae05123';
export function assertB31CaOrderSourceSuccession(readBytes) {
  const { record } = b31CaOrderSourceSuccessionChain(readBytes);
  // Retain the immutable batch31 CA pardon copy-entry position 35/163 scope; the separately pinned batch31b GA-16 location contexts
  // hop checks the complete current chain without rewriting it.
  assertB31bGa16LocationSourceSuccession(readBytes);
  return record;
}
function b31CaOrderSourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31_CA_ORDER_SOURCE_PATH);
  insist(sha(bytes)===B31_CA_ORDER_SOURCE_SHA256,'batch31 CA pardon copy-entry position source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31CaPardonSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31-ca-order-source-succession/v1'
    && record.recordId==='B31-CA-ORDER-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='62cba92f69f84d821f0f33ad703710c6f682a2dd'
    && equal(record.previousNamedSource,{path:B31_CA_PARDON_SOURCE_PATH,sha256:B31_CA_PARDON_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31 CA pardon copy-entry position source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json"]),'batch31 CA pardon copy-entry position source succession inventory');
  insist(current.size===35,'batch31 CA pardon copy-entry position prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31 CA pardon copy-entry position disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31 CA pardon copy-entry position current thirty-five-source inventory');
  return { record, current };
}

// batch31b GA-16 location stack (Codex c1f7657df..802d27c28 + 455e696c7, SD 189d0beb9, IL 463ca4332, MS first/additional, 
export const B31B_GA16_LOCATION_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31b-ga16-location-20261020-v1.json';
export const B31B_GA16_LOCATION_SOURCE_SHA256 = 'd2c2eac205b4f463d76a31e81ab142bfcd7a603674b03a80d4d80df0f461aad3';
export function assertB31bGa16LocationSourceSuccession(readBytes) {
  const { record } = b31bGa16LocationSourceSuccessionChain(readBytes);
  // Retain the immutable batch31b GA-16 location contexts 35/163 scope; the separately pinned batch31c N1 and CA-L01 and CA-L02
  // hop checks the complete current chain without rewriting it.
  assertB31cCaL01L02SourceSuccession(readBytes);
  return record;
}
function b31bGa16LocationSourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31B_GA16_LOCATION_SOURCE_PATH);
  insist(sha(bytes)===B31B_GA16_LOCATION_SOURCE_SHA256,'batch31b GA-16 location contexts source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31CaOrderSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31b-ga16-location-source-succession/v1'
    && record.recordId==='B31B-GA16-LOCATION-SOURCE-SUCCESSION-20261020'
    && record.kind==='technical_source_only' && record.engineeringCommit==='478ed7ddab1e42ee7501e0ba0fcfb8322854f30a'
    && equal(record.previousNamedSource,{path:B31_CA_ORDER_SOURCE_PATH,sha256:B31_CA_ORDER_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31b GA-16 location contexts source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/reviewed-question-copy.ts"]),'batch31b GA-16 location contexts source succession inventory');
  insist(current.size===35,'batch31b GA-16 location contexts prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31b GA-16 location contexts disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31b GA-16 location contexts current thirty-five-source inventory');
  return { record, current };
}

// batch31c N1 adopted display labels b2b9f3354 (Codex; Reviewer3 ACCEPT) and CA-L01 a6647e93a + CA-L02 9656d4f00 (Codex; R
export const B31C_CA_L01_L02_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31c-ca-l01-l02-20261021-v1.json';
export const B31C_CA_L01_L02_SOURCE_SHA256 = 'f969a19c7606bc4a1a28d7cf066822de2438887883c73d6481db7f875162e4d8';
export function assertB31cCaL01L02SourceSuccession(readBytes) {
  const { record } = b31cCaL01L02SourceSuccessionChain(readBytes);
  // Retain the immutable batch31c N1 and CA-L01 and CA-L02 35/163 scope; the separately pinned batch31c GA21 and CA-L03
  // hop checks the complete current chain without rewriting it.
  assertB31cGa21CaL03SourceSuccession(readBytes);
  return record;
}
function b31cCaL01L02SourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31C_CA_L01_L02_SOURCE_PATH);
  insist(sha(bytes)===B31C_CA_L01_L02_SOURCE_SHA256,'batch31c N1 and CA-L01 and CA-L02 source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31bGa16LocationSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31c-ca-l01-l02-source-succession/v1'
    && record.recordId==='B31C-CA-L01-L02-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='fb15036404ff59aafb48b4acb1e75d49829c00da'
    && equal(record.previousNamedSource,{path:B31B_GA16_LOCATION_SOURCE_PATH,sha256:B31B_GA16_LOCATION_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31c N1 and CA-L01 and CA-L02 source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/california-prop64-facts.ts"]),'batch31c N1 and CA-L01 and CA-L02 source succession inventory');
  insist(current.size===35,'batch31c N1 and CA-L01 and CA-L02 prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31c N1 and CA-L01 and CA-L02 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31c N1 and CA-L01 and CA-L02 current thirty-five-source inventory');
  return { record, current };
}

// batch31c GA21 F1+DEF 424168790 + T1 af656e30d (Codex; Reviewer2 ACCEPT) and CA-L03 prior relief da734e429 + 4153fcf1c (R
export const B31C_GA21_CA_L03_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31c-ga21-ca-l03-20261021-v1.json';
export const B31C_GA21_CA_L03_SOURCE_SHA256 = '13c61fe50f2aa5edf829b595a42f3ce88295d65919da81f15f2ab14385d4b196';
export function assertB31cGa21CaL03SourceSuccession(readBytes) {
  const { record } = b31cGa21CaL03SourceSuccessionChain(readBytes);
  // Retain the immutable batch31c GA21 and CA-L03 35/163 scope; the separately pinned batch31d CA-L06
  // hop checks the complete current chain without rewriting it.
  assertB31dCaL06SourceSuccession(readBytes);
  return record;
}
function b31cGa21CaL03SourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31C_GA21_CA_L03_SOURCE_PATH);
  insist(sha(bytes)===B31C_GA21_CA_L03_SOURCE_SHA256,'batch31c GA21 and CA-L03 source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31cCaL01L02SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31c-ga21-ca-l03-source-succession/v1'
    && record.recordId==='B31C-GA21-CA-L03-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='2ce539434004dc1ffc5e1a965327157a4485bc2a'
    && equal(record.previousNamedSource,{path:B31C_CA_L01_L02_SOURCE_PATH,sha256:B31C_CA_L01_L02_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31c GA21 and CA-L03 source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/california-prop64-facts.ts", "src/lib/rcap-engine/conviction-relief-request.ts"]),'batch31c GA21 and CA-L03 source succession inventory');
  insist(current.size===35,'batch31c GA21 and CA-L03 prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31c GA21 and CA-L03 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31c GA21 and CA-L03 current thirty-five-source inventory');
  return { record, current };
}

// batch31d CA-L06 gap 1 + CA-L03 Obs 1 72713a83d + lead Spanish fixes 74f847a1b + F1 fix-forward 4d5455d8e (Reviewer3; Rev
export const B31D_CA_L06_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ca-l06-20261021-v1.json';
export const B31D_CA_L06_SOURCE_SHA256 = '8c0554b392b5d4c2a62d4cad7736a572560c32513f0ac2f9645ac55a31faffbf';
export function assertB31dCaL06SourceSuccession(readBytes) {
  const { record } = b31dCaL06SourceSuccessionChain(readBytes);
  // Retain the immutable batch31d CA-L06 35/163 scope; the separately pinned batch31d GA-20 CO and AL
  // hop checks the complete current chain without rewriting it.
  assertB31dGa20CoAlSourceSuccession(readBytes);
  return record;
}
function b31dCaL06SourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31D_CA_L06_SOURCE_PATH);
  insist(sha(bytes)===B31D_CA_L06_SOURCE_SHA256,'batch31d CA-L06 source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31cGa21CaL03SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31d-ca-l06-source-succession/v1'
    && record.recordId==='B31D-CA-L06-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='f45576734ca7aac411740ef9854f7bd24e750980'
    && equal(record.previousNamedSource,{path:B31C_GA21_CA_L03_SOURCE_PATH,sha256:B31C_GA21_CA_L03_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31d CA-L06 source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/rcap-engine/california-prop64-facts.ts"]),'batch31d CA-L06 source succession inventory');
  insist(current.size===35,'batch31d CA-L06 prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31d CA-L06 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31d CA-L06 current thirty-five-source inventory');
  return { record, current };
}

// batch31d GA-20 R3 CO (5f83fa3a1+e3a13b611; Reviewer2 ACCEPT 06:45:00Z, Acceptance O17 MET) and AL (4a6febfbd+9136a7ced; 
export const B31D_GA20_CO_AL_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ga20-co-al-20261021-v1.json';
export const B31D_GA20_CO_AL_SOURCE_SHA256 = '68e1aece433f9b910310f8ee37df3498d62c6f29550c31ca231b2ef483ce504f';
export function assertB31dGa20CoAlSourceSuccession(readBytes) {
  const { record } = b31dGa20CoAlSourceSuccessionChain(readBytes);
  // Retain the immutable batch31d GA-20 CO and AL 35/163 scope; the separately pinned batch31d GA-20 R3 AK, GA, NY and MD
  // hop checks the complete current chain without rewriting it.
  assertB31dGa20R3SourceSuccession(readBytes);
  return record;
}
function b31dGa20CoAlSourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31D_GA20_CO_AL_SOURCE_PATH);
  insist(sha(bytes)===B31D_GA20_CO_AL_SOURCE_SHA256,'batch31d GA-20 CO and AL source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31dCaL06SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31d-ga20-co-al-source-succession/v1'
    && record.recordId==='B31D-GA20-CO-AL-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='877012ced7f0a0c9f94856b8ffaf13767f85aa30'
    && equal(record.previousNamedSource,{path:B31D_CA_L06_SOURCE_PATH,sha256:B31D_CA_L06_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31d GA-20 CO and AL source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-source-question-copy.json"]),'batch31d GA-20 CO and AL source succession inventory');
  insist(current.size===35,'batch31d GA-20 CO and AL prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31d GA-20 CO and AL disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31d GA-20 CO and AL current thirty-five-source inventory');
  return { record, current };
}

// batch31d GA-20 R3 AK (bb5752299; Reviewer2 ACCEPT 07:23:05Z), GA (cf433df0e + sourceAuthority successor 9478e8af1; Revie
export const B31D_GA20_R3_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ga20-r3-20261021-v1.json';
export const B31D_GA20_R3_SOURCE_SHA256 = '17c529ff22a9054f22a1a7fb731018b0cb71e0a2ec5ff3d563830652602b8d74';
export function assertB31dGa20R3SourceSuccession(readBytes) {
  const { record } = b31dGa20R3SourceSuccessionChain(readBytes);
  // Retain the immutable batch31d GA-20 R3 AK, GA, NY and MD 35/163 scope; the separately pinned batch31d GA-20 R3 MD O17 F1
  // hop checks the complete current chain without rewriting it.
  assertB31dMdF1SourceSuccession(readBytes);
  return record;
}
function b31dGa20R3SourceSuccessionChain(readBytes) {
  const bytes=readBytes(B31D_GA20_R3_SOURCE_PATH);
  insist(sha(bytes)===B31D_GA20_R3_SOURCE_SHA256,'batch31d GA-20 R3 AK, GA, NY and MD source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31dGa20CoAlSourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31d-ga20-r3-source-succession/v1'
    && record.recordId==='B31D-GA20-R3-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='d209295aaf1851103e3def821032f2031b9c9d73'
    && equal(record.previousNamedSource,{path:B31D_GA20_CO_AL_SOURCE_PATH,sha256:B31D_GA20_CO_AL_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31d GA-20 R3 AK, GA, NY and MD source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-source-question-copy.json"]),'batch31d GA-20 R3 AK, GA, NY and MD source succession inventory');
  insist(current.size===35,'batch31d GA-20 R3 AK, GA, NY and MD prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31d GA-20 R3 AK, GA, NY and MD disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31d GA-20 R3 AK, GA, NY and MD current thirty-five-source inventory');
  return { record, current };
}

// batch31d GA-20 R3 MD O17 F1 fix-forward (Codex 471f616c9 on 21df4e98d; Reviewer2 ACCEPT 09:38:32Z, Acceptance O17 MET 09
export const B31D_MD_F1_SOURCE_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-md-f1-20261021-v1.json';
export const B31D_MD_F1_SOURCE_SHA256 = '5dd84c717e5522b3122e7ff4dee5a0aca18e06a963a6274a3f0dd1329211e1ed';
export function assertB31dMdF1SourceSuccession(readBytes) {
  const bytes=readBytes(B31D_MD_F1_SOURCE_PATH);
  insist(sha(bytes)===B31D_MD_F1_SOURCE_SHA256,'batch31d GA-20 R3 MD O17 F1 source succession record bytes changed');
  const record=JSON.parse(bytes.toString('utf8'));
  const { record: prior, current }=b31dGa20R3SourceSuccessionChain(readBytes);
  insist(record.schemaVersion==='rcap-question-contract-b31d-md-f1-source-succession/v1'
    && record.recordId==='B31D-MD-F1-SOURCE-SUCCESSION-20261021'
    && record.kind==='technical_source_only' && record.engineeringCommit==='bf70300c00f277bf7389ac3426d642189839f0d6'
    && equal(record.previousNamedSource,{path:B31D_GA20_R3_SOURCE_PATH,sha256:B31D_GA20_R3_SOURCE_SHA256,currentChangedSourceCount:35,currentUnchangedSourceCount:163})
    && equal(record.historicalContinuity,prior.historicalContinuity) && equal(record.historicalOutput,prior.historicalOutput)
    && record.sourceCount===198 && record.currentChangedSourceCount===35 && record.currentUnchangedSourceCount===163
    && equal(record.historicalArtifactScope,{routeCount:6,artifactCount:18,reexecuted:false,changed:false})
    && ['createsOwnerApproval','changesHistoricalOutputEvidence','establishesCurrentOutputReproduction','establishesProtectedVerification','establishesProviderOrPublicationProof','commercialAuthorityGranted','productionAuthorized'].every(key=>record[key]===false),'batch31d GA-20 R3 MD O17 F1 source succession scope');
  insist(Array.isArray(record.transitions) && equal(record.transitions.map(row=>row.file),["src/lib/expungement-ai/frontend/reviewed-source-question-copy.json"]),'batch31d GA-20 R3 MD O17 F1 source succession inventory');
  insist(current.size===35,'batch31d GA-20 R3 MD O17 F1 prior thirty-five-source inventory');
  const v21={};
  for(const row of record.transitions){
    insist(row.beforeSha256===(current.get(row.file)??v21[row.file]??null),'batch31d GA-20 R3 MD O17 F1 disconnected source hop');current.set(row.file,row.afterSha256);
  }
  insist(current.size===35,'batch31d GA-20 R3 MD O17 F1 current thirty-five-source inventory');
  // Always fresh, including after success or a previous failed read. No accessor
  // recursion: prior records are read as exact pinned raw bytes.
  for(const [file,digest]of current)insist(sha(readBytes(file))===digest,`stale output input: ${file}; exact batch31d GA-20 R3 MD O17 F1 source succession`);
  return record;
}

// Every succession record, asserted in chain order. Each caller's loop builds it
// once (onceSuccessions); nothing is reused across calls.
function currentSourceSuccessions(readBytes) {
  return { record: assertMsGaVaMnSourceSuccession(readBytes), ca: assertCaTwoResultCopySourceSuccession(readBytes),
    ny: assertNy16055TerminologySourceSuccession(readBytes), ga: assertGaPardonSpecPinSourceSuccession(readBytes),
    gaContact: assertGaPardonContactSuccessorSourceSuccession(readBytes), gates: assertGaVaSpecSuccessorGatesSourceSuccession(readBytes),
    caNoPhone: assertCaNoPhoneContactSourceSuccession(readBytes), gaCt: assertGaSb288CtPetitionSourceSuccession(readBytes),
    gaGuide: assertGaGuideSpanishSourceSuccession(readBytes), ctPrepay: assertCtPrepayRecordFactsSourceSuccession(readBytes),
    ilSdWy: assertIlSdWyRecordFactsSourceSuccession(readBytes), ohCopy: assertOhJuvenileCopySourceSuccession(readBytes),
    caSafe: assertCaSafeAtHomeSourceSuccession(readBytes), leadEs: assertLeadSpanishSourceSuccession(readBytes), leadEs2: assertLeadSpanishLayer2SourceSuccession(readBytes), mnMemo: assertMnGuardMemoSourceSuccession(readBytes), vaMemo: assertVaGuardMemoSourceSuccession(readBytes), mdPolice: assertMdPoliceReconciliationSourceSuccession(readBytes), vaOrigin: assertVaRecordOriginSourceSuccession(readBytes), ga21Labels: assertGa21SpanishLabelsSourceSuccession(readBytes), ndReceipt: assertNdCustomReceiptSourceSuccession(readBytes), msGuideEs: assertMsGuideEsSourceSuccession(readBytes), caProp64: assertCaProp64StackSourceSuccession(readBytes), ndProse: assertNdCensusProseSourceSuccession(readBytes), b28NvGa20: assertB28NvGa20SourceSuccession(readBytes), b30Co: assertB30CoSourceSuccession(readBytes), b31CaPardon: assertB31CaPardonSourceSuccession(readBytes), b31CaOrder: assertB31CaOrderSourceSuccession(readBytes), b31bGa16: assertB31bGa16LocationSourceSuccession(readBytes), b31cCa: assertB31cCaL01L02SourceSuccession(readBytes), b31cGa21: assertB31cGa21CaL03SourceSuccession(readBytes), b31dCa: assertB31dCaL06SourceSuccession(readBytes), b31dGa20: assertB31dGa20CoAlSourceSuccession(readBytes), b31dR3: assertB31dGa20R3SourceSuccession(readBytes), b31dMdF1: assertB31dMdF1SourceSuccession(readBytes) };
}
const onceSuccessions = readBytes => { let value; return () => value ??= currentSourceSuccessions(readBytes); };

function assertCurrentOutputSourceInput(file, expectedSha256, readBytes, label, successions) {
  const actual = sha(readBytes(file));
  if (actual === expectedSha256) return;
  const s = successions();
  const atFile = record => record.transitions.find(input => input.file === file);
  const record = s.record;
  const row = atFile(record);
  const ca = atFile(s.ca);
  const previousDigest = row ? row.afterSha256 : expectedSha256;
  const ny = atFile(s.ny);
  const ga = atFile(s.ga);
  const gaContact = atFile(s.gaContact);
  const gates = atFile(s.gates);
  const caNoPhone = atFile(s.caNoPhone);
  const gaCt = atFile(s.gaCt);
  const gaGuide = atFile(s.gaGuide);
  const ctPrepay = atFile(s.ctPrepay);
  const ilSdWy = atFile(s.ilSdWy);
  const ohCopy = atFile(s.ohCopy);
  const caSafe = atFile(s.caSafe);
  const leadEs = atFile(s.leadEs);
  const leadEs2 = atFile(s.leadEs2);
  const mnMemo = atFile(s.mnMemo);
  const vaMemo = atFile(s.vaMemo);
  const mdPolice = atFile(s.mdPolice);
  const vaOrigin = atFile(s.vaOrigin);
  const ga21Labels = atFile(s.ga21Labels);
  const ndReceipt = atFile(s.ndReceipt);
  const msGuideEs = atFile(s.msGuideEs);
  const caProp64 = atFile(s.caProp64);
  const ndProse = atFile(s.ndProse);
  const b28NvGa20 = atFile(s.b28NvGa20);
  const b30Co = atFile(s.b30Co);
  const b31CaPardon = atFile(s.b31CaPardon);
  const b31CaOrder = atFile(s.b31CaOrder);
  const b31bGa16 = atFile(s.b31bGa16);
  const b31cCa = atFile(s.b31cCa);
  const b31cGa21 = atFile(s.b31cGa21);
  const b31dCa = atFile(s.b31dCa);
  const b31dGa20 = atFile(s.b31dGa20);
  const b31dR3 = atFile(s.b31dR3);
  const b31dMdF1 = atFile(s.b31dMdF1);
  const caDigest = ca ? ca.afterSha256 : previousDigest;
  const nyDigest = ny ? ny.afterSha256 : caDigest;
  const gaDigest = ga ? ga.afterSha256 : nyDigest;
  const contactDigest = gaContact ? gaContact.afterSha256 : gaDigest;
  const gatesDigest = gates ? gates.afterSha256 : contactDigest;
  const caNoPhoneDigest = caNoPhone ? caNoPhone.afterSha256 : gatesDigest;
  const gaCtDigest = gaCt ? gaCt.afterSha256 : caNoPhoneDigest;
  const gaGuideDigest = gaGuide ? gaGuide.afterSha256 : gaCtDigest;
  const ctPrepayDigest = ctPrepay ? ctPrepay.afterSha256 : gaGuideDigest;
  const ilSdWyDigest = ilSdWy ? ilSdWy.afterSha256 : ctPrepayDigest;
  const ohCopyDigest = ohCopy ? ohCopy.afterSha256 : ilSdWyDigest;
  const caSafeDigest = caSafe ? caSafe.afterSha256 : ohCopyDigest;
  const leadEsDigest = leadEs ? leadEs.afterSha256 : caSafeDigest;
  const leadEs2Digest = leadEs2 ? leadEs2.afterSha256 : leadEsDigest;
  const mnMemoDigest = mnMemo ? mnMemo.afterSha256 : leadEs2Digest;
  const vaMemoDigest = vaMemo ? vaMemo.afterSha256 : mnMemoDigest;
  const mdPoliceDigest = mdPolice ? mdPolice.afterSha256 : vaMemoDigest;
  const vaOriginDigest = vaOrigin ? vaOrigin.afterSha256 : mdPoliceDigest;
  const ga21LabelsDigest = ga21Labels ? ga21Labels.afterSha256 : vaOriginDigest;
  const ndReceiptDigest = ndReceipt ? ndReceipt.afterSha256 : ga21LabelsDigest;
  const msGuideEsDigest = msGuideEs ? msGuideEs.afterSha256 : ndReceiptDigest;
  const caProp64Digest = caProp64 ? caProp64.afterSha256 : msGuideEsDigest;
  const ndProseDigest = ndProse ? ndProse.afterSha256 : caProp64Digest;
  const b28NvGa20Digest = b28NvGa20 ? b28NvGa20.afterSha256 : ndProseDigest;
  const b30CoDigest = b30Co ? b30Co.afterSha256 : b28NvGa20Digest;
  const b31CaPardonDigest = b31CaPardon ? b31CaPardon.afterSha256 : b30CoDigest;
  const b31CaOrderDigest = b31CaOrder ? b31CaOrder.afterSha256 : b31CaPardonDigest;
  const b31bGa16Digest = b31bGa16 ? b31bGa16.afterSha256 : b31CaOrderDigest;
  const b31cCaDigest = b31cCa ? b31cCa.afterSha256 : b31bGa16Digest;
  const b31cGa21Digest = b31cGa21 ? b31cGa21.afterSha256 : b31cCaDigest;
  const b31dCaDigest = b31dCa ? b31dCa.afterSha256 : b31cGa21Digest;
  const b31dGa20Digest = b31dGa20 ? b31dGa20.afterSha256 : b31dCaDigest;
  const b31dR3Digest = b31dR3 ? b31dR3.afterSha256 : b31dGa20Digest;
  const currentDigest = b31dMdF1 ? b31dMdF1.afterSha256 : b31dR3 ? b31dR3.afterSha256 : b31dGa20 ? b31dGa20.afterSha256 : b31dCa ? b31dCa.afterSha256 : b31cGa21 ? b31cGa21.afterSha256 : b31cCa ? b31cCa.afterSha256 : b31bGa16 ? b31bGa16.afterSha256 : b31CaOrder ? b31CaOrder.afterSha256 : b31CaPardon ? b31CaPardon.afterSha256 : b30Co ? b30Co.afterSha256 : b28NvGa20 ? b28NvGa20.afterSha256 : ndProse ? ndProse.afterSha256 : caProp64 ? caProp64.afterSha256 : msGuideEs ? msGuideEs.afterSha256 : ndReceipt ? ndReceipt.afterSha256 : ga21Labels ? ga21Labels.afterSha256 : vaOrigin ? vaOrigin.afterSha256 : mdPolice ? mdPolice.afterSha256 : vaMemo ? vaMemo.afterSha256 : mnMemo ? mnMemo.afterSha256 : leadEs2 ? leadEs2.afterSha256 : leadEs ? leadEs.afterSha256 : caSafe ? caSafe.afterSha256 : ohCopy ? ohCopy.afterSha256 : ilSdWy ? ilSdWy.afterSha256 : ctPrepay ? ctPrepay.afterSha256 : gaGuide ? gaGuide.afterSha256 : gaCt ? gaCt.afterSha256 : caNoPhone ? caNoPhone.afterSha256 : gates ? gates.afterSha256 : gaContact ? gaContact.afterSha256 : ga ? ga.afterSha256 : ny ? ny.afterSha256 : ca?.afterSha256 ?? row?.afterSha256;
  insist((row ? row.beforeSha256 === expectedSha256 : ca != null || ny != null || ga != null || gaContact != null || gates != null || caNoPhone != null || gaCt != null || gaGuide != null || ctPrepay != null || ilSdWy != null || ohCopy != null || caSafe != null || leadEs != null || leadEs2 != null || mnMemo != null || vaMemo != null || mdPolice != null || vaOrigin != null || ga21Labels != null || ndReceipt != null || msGuideEs != null || caProp64 != null || ndProse != null || b28NvGa20 != null || b30Co != null || b31CaPardon != null || b31CaOrder != null || b31bGa16 != null || b31cCa != null || b31cGa21 != null || b31dCa != null || b31dGa20 != null || b31dR3 != null || b31dMdF1 != null)
    && (!ca || ca.beforeSha256 === previousDigest) && (!ny || ny.beforeSha256 === caDigest)
    && (!ga || ga.beforeSha256 === nyDigest) && (!gaContact || gaContact.beforeSha256 === gaDigest)
    && (!gates || gates.beforeSha256 === contactDigest) && (!caNoPhone || caNoPhone.beforeSha256 === gatesDigest)
    && (!gaCt || gaCt.beforeSha256 === caNoPhoneDigest) && (!gaGuide || gaGuide.beforeSha256 === gaCtDigest) && (!ctPrepay || ctPrepay.beforeSha256 === gaGuideDigest) && (!ilSdWy || ilSdWy.beforeSha256 === ctPrepayDigest) && (!ohCopy || ohCopy.beforeSha256 === ilSdWyDigest) && (!caSafe || caSafe.beforeSha256 === ohCopyDigest) && (!leadEs || leadEs.beforeSha256 === caSafeDigest) && (!leadEs2 || leadEs2.beforeSha256 === leadEsDigest) && (!mnMemo || mnMemo.beforeSha256 === leadEs2Digest) && (!vaMemo || vaMemo.beforeSha256 === mnMemoDigest) && (!mdPolice || mdPolice.beforeSha256 === vaMemoDigest) && (!vaOrigin || vaOrigin.beforeSha256 === mdPoliceDigest) && (!ga21Labels || ga21Labels.beforeSha256 === vaOriginDigest) && (!ndReceipt || ndReceipt.beforeSha256 === ga21LabelsDigest) && (!msGuideEs || msGuideEs.beforeSha256 === ndReceiptDigest) && (!caProp64 || caProp64.beforeSha256 === msGuideEsDigest) && (!ndProse || ndProse.beforeSha256 === caProp64Digest) && (!b28NvGa20 || b28NvGa20.beforeSha256 === ndProseDigest) && (!b30Co || b30Co.beforeSha256 === b28NvGa20Digest) && (!b31CaPardon || b31CaPardon.beforeSha256 === b30CoDigest) && (!b31CaOrder || b31CaOrder.beforeSha256 === b31CaPardonDigest) && (!b31bGa16 || b31bGa16.beforeSha256 === b31CaOrderDigest) && (!b31cCa || b31cCa.beforeSha256 === b31bGa16Digest) && (!b31cGa21 || b31cGa21.beforeSha256 === b31cCaDigest) && (!b31dCa || b31dCa.beforeSha256 === b31cGa21Digest) && (!b31dGa20 || b31dGa20.beforeSha256 === b31dCaDigest) && (!b31dR3 || b31dR3.beforeSha256 === b31dGa20Digest) && (!b31dMdF1 || b31dMdF1.beforeSha256 === b31dR3Digest)
    && currentDigest === actual, `${label}: ${file}`);
}

/** Exposed below the immutable byte pins for non-vacuous semantic controls. */
export function assertQuestionContractOutputContinuity({ continuity, proof, readBytes }) {
  const receipt = readQuestionContractSuccessor(readBytes);
  const historical = checkedProof(receipt, readBytes);
  // Provisional comparison context only. Exact adoption/raw-byte validation
  // completes below before any result is returned; no write or authority occurs.
  let artifactSuccessor = continuity.artifactSuccessor == null ? null : { routeId: DC_INNOCENCE_ROUTE };
  insist(continuity.schemaVersion === 'rcap-question-contract-output-continuity/v1'
    && continuity.recordId === 'QUESTION-CONTRACT-OUTPUT-CONTINUITY-20261016-V21'
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
  const integratedRevisionContinuity = { path: QUESTION_CONTRACT_INTEGRATED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_INTEGRATED_REVISION_CONTINUITY_SHA256 };
  const integratedRevisionOutput = { path: QUESTION_CONTRACT_INTEGRATED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_INTEGRATED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.integratedRevisionContinuity, integratedRevisionContinuity)
    && equal(continuity.integratedRevisionOutput, integratedRevisionOutput), 'integrated revision predecessor ancestry');
  const integratedContinuityBytes = readBytes(integratedRevisionContinuity.path);
  const integratedOutputBytes = readBytes(integratedRevisionOutput.path);
  insist(sha(integratedContinuityBytes) === integratedRevisionContinuity.sha256, 'integrated revision predecessor continuity bytes changed');
  insist(sha(integratedOutputBytes) === integratedRevisionOutput.sha256, 'integrated revision predecessor output bytes changed');
  const integratedContinuity = JSON.parse(integratedContinuityBytes.toString('utf8'));
  insist(equal(integratedContinuity.currentOutput, integratedRevisionOutput)
    && equal(integratedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(integratedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput', 'capturedRevisionContinuity', 'capturedRevisionOutput', 'retainedRevisionContinuity', 'retainedRevisionOutput', 'continuedRevisionContinuity', 'continuedRevisionOutput', 'reviewedRevisionContinuity', 'reviewedRevisionOutput']
      .every(key => equal(integratedContinuity[key], continuity[key])), 'integrated revision predecessor ancestry');
  const integrated = JSON.parse(integratedOutputBytes.toString('utf8'));
  const revalidatedRevisionContinuity = { path: QUESTION_CONTRACT_REVALIDATED_REVISION_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_REVALIDATED_REVISION_CONTINUITY_SHA256 };
  const revalidatedRevisionOutput = { path: QUESTION_CONTRACT_REVALIDATED_REVISION_OUTPUT_PATH, sha256: QUESTION_CONTRACT_REVALIDATED_REVISION_OUTPUT_SHA256 };
  insist(equal(continuity.revalidatedRevisionContinuity, revalidatedRevisionContinuity)
    && equal(continuity.revalidatedRevisionOutput, revalidatedRevisionOutput), 'revalidated revision predecessor ancestry');
  const revalidatedContinuityBytes = readBytes(revalidatedRevisionContinuity.path);
  const revalidatedOutputBytes = readBytes(revalidatedRevisionOutput.path);
  insist(sha(revalidatedContinuityBytes) === revalidatedRevisionContinuity.sha256, 'revalidated revision predecessor continuity bytes changed');
  insist(sha(revalidatedOutputBytes) === revalidatedRevisionOutput.sha256, 'revalidated revision predecessor output bytes changed');
  const revalidatedContinuity = JSON.parse(revalidatedContinuityBytes.toString('utf8'));
  insist(equal(revalidatedContinuity.currentOutput, revalidatedRevisionOutput)
    && equal(revalidatedContinuity.historicalSuccessor, continuity.historicalSuccessor)
    && equal(revalidatedContinuity.historicalOutput, continuity.historicalOutput)
    && ['previousContinuity', 'previousOutput', 'earlierContinuity', 'earlierOutput',
      'sameDatePredecessorContinuity', 'sameDatePredecessorOutput', 'latestPredecessorContinuity', 'latestPredecessorOutput',
      'immediatePredecessorContinuity', 'immediatePredecessorOutput', 'priorRevisionContinuity', 'priorRevisionOutput',
      'acceptedRevisionContinuity', 'acceptedRevisionOutput', 'executedRevisionContinuity', 'executedRevisionOutput', 'renderedRevisionContinuity', 'renderedRevisionOutput', 'observedRevisionContinuity', 'observedRevisionOutput', 'measuredRevisionContinuity', 'measuredRevisionOutput', 'boundRevisionContinuity', 'boundRevisionOutput', 'validatedRevisionContinuity', 'validatedRevisionOutput', 'recordedRevisionContinuity', 'recordedRevisionOutput', 'capturedRevisionContinuity', 'capturedRevisionOutput', 'retainedRevisionContinuity', 'retainedRevisionOutput', 'continuedRevisionContinuity', 'continuedRevisionOutput', 'reviewedRevisionContinuity', 'reviewedRevisionOutput', 'integratedRevisionContinuity', 'integratedRevisionOutput']
      .every(key => equal(revalidatedContinuity[key], continuity[key])), 'revalidated revision predecessor ancestry');
  const revalidated = JSON.parse(revalidatedOutputBytes.toString('utf8'));

  const artifactPredecessorContinuity = { path: QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_CONTINUITY_SHA256 };
  const artifactPredecessorOutput = { path: QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_OUTPUT_PATH, sha256: QUESTION_CONTRACT_ARTIFACT_PREDECESSOR_OUTPUT_SHA256 };
  insist(equal(continuity.artifactPredecessorContinuity, artifactPredecessorContinuity)
    && equal(continuity.artifactPredecessorOutput, artifactPredecessorOutput), 'artifact predecessor ancestry');
  const artifactContinuityBytes = readBytes(artifactPredecessorContinuity.path);
  const artifactOutputBytes = readBytes(artifactPredecessorOutput.path);
  insist(sha(artifactContinuityBytes) === artifactPredecessorContinuity.sha256, 'artifact predecessor continuity bytes changed');
  insist(sha(artifactOutputBytes) === artifactPredecessorOutput.sha256, 'artifact predecessor output bytes changed');
  const artifactPrior = JSON.parse(artifactOutputBytes.toString('utf8'));
  const artifactPriorContinuity = JSON.parse(artifactContinuityBytes.toString('utf8'));
  insist(equal(artifactPriorContinuity.currentOutput, artifactPredecessorOutput)
    && Object.keys(artifactPriorContinuity).filter(key => /(?:Continuity|Output)$/.test(key) && key !== 'currentOutput')
      .every(key => equal(artifactPriorContinuity[key], continuity[key])), 'artifact predecessor retained ancestry');

  insist(continuity.currentOutput?.path === QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, 'continuity current output path');
  insist(proof.schemaVersion === historical.schemaVersion
    && ['approvalGranted', 'commercialAuthorityGranted', 'productionAuthorized', 'protectedJourneyProven'].every(key => proof[key] === false), 'current output proof scope');
  insist(proof.headBefore === continuity.reproducedCodeSha && proof.headAfter === proof.headBefore
    && /^[a-f0-9]{40}$/.test(proof.headBefore) && proof.statusBefore === proof.statusAfter, 'reproduction candidate drift');
  insist(equal(proof.denominator, historical.denominator)
    && (artifactSuccessor != null || equal(proof.counts, historical.counts))
    && equal(proof.sourceDrift, []) && Array.isArray(proof.checks) && proof.checks.length === 130
    && proof.checks.every(check => check.status === 'PASS'
      || (artifactSuccessor != null && check.status === 'FAIL' && check.id.startsWith('dc-actual-innocence:') && check.id.endsWith(':historical-approved-bytes')))
    && new Set(proof.checks.map(check => check.id)).size === 130
    && equal(proof.checks.map(check => check.id).sort(), historical.checks.map(check => check.id).sort()), 'current output acceptance incomplete');
  insist(Array.isArray(proof.routes) && proof.routes.length === 6
    && new Set(proof.routes.map(row => row.routeId)).size === 6, 'current output route inventory');
  for (const previous of historical.routes) {
    const current = proof.routes.find(row => row.routeId === previous.routeId);
    insist(current && Array.isArray(current.artifacts) && current.artifacts.length === 3
      && sameArtifactSuccessorSemantics(current, previous, artifactSuccessor), `changed output semantics: ${previous.routeId}`);
    insist(sha(readBytes(current.specificationPath)) === current.specificationSha256, 'current output specification moved');
    for (const artifact of current.artifacts) insist(sha(readBytes(artifact.historical.path))
      === (artifactSuccessor && current.routeId === artifactSuccessor.routeId ? artifact.historical.sha256 : artifact.sha256), 'approved output bytes moved');
  }
  for (const prior of [...artifactPrior.routes, ...earlier.routes, ...previous.routes, ...sameDate.routes, ...latest.routes, ...immediate.routes, ...revision.routes, ...accepted.routes, ...executed.routes, ...rendered.routes, ...observed.routes, ...measured.routes, ...bound.routes, ...validated.routes, ...recorded.routes, ...captured.routes, ...retained.routes, ...continued.routes, ...reviewed.routes, ...integrated.routes, ...revalidated.routes]) {
    const current = proof.routes.find(row => row.routeId === prior.routeId);
    insist(current && sameArtifactSuccessorSemantics(current, prior, artifactSuccessor), `changed previous output semantics: ${prior.routeId}`);
  }
  for (const evidence of receipt.preservedEvidence) insist(sha(readBytes(evidence.path)) === evidence.sha256, `historical evidence changed: ${evidence.path}`);
  insist(Array.isArray(proof.sources) && proof.sources.length === (artifactSuccessor ? 198 : 134) && continuity.currentSourceCount === proof.sources.length
    && artifactPrior.sources.length === 134 && continuity.artifactPredecessorSourceCount === 134
    && revalidated.sources.length === 134 && continuity.revalidatedRevisionSourceCount === 134
    && integrated.sources.length === 134 && continuity.integratedRevisionSourceCount === 134
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
    && new Set(proof.sources.map(input => input.file)).size === proof.sources.length, 'current output source inventory');
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
  const integratedInputs = new Map(integrated.sources.map(input => [input.file, input.sha256]));
  insist([...integratedInputs.keys()].every(file => after.has(file)), 'integrated predecessor source omitted');
  const integratedAdditions = [...after.keys()].filter(file => !integratedInputs.has(file)).sort();
  const integratedTransitions = [...integratedInputs.keys()].sort().filter(file => integratedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: integratedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(integratedAdditions, continuity.integratedRevisionAddedSourcePaths)
    && equal(integratedTransitions, continuity.integratedRevisionSourceTransitions), 'undeclared integrated predecessor source transition');
  const revalidatedInputs = new Map(revalidated.sources.map(input => [input.file, input.sha256]));
  insist([...revalidatedInputs.keys()].every(file => after.has(file)), 'revalidated predecessor source omitted');
  const revalidatedAdditions = [...after.keys()].filter(file => !revalidatedInputs.has(file)).sort();
  const revalidatedTransitions = [...revalidatedInputs.keys()].sort().filter(file => revalidatedInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: revalidatedInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(revalidatedAdditions, continuity.revalidatedRevisionAddedSourcePaths)
    && equal(revalidatedTransitions, continuity.revalidatedRevisionSourceTransitions), 'undeclared revalidated predecessor source transition');
  const artifactInputs = new Map(artifactPrior.sources.map(input => [input.file, input.sha256]));
  insist([...artifactInputs.keys()].every(file => after.has(file)), 'artifact predecessor source omitted');
  const artifactAdditions = [...after.keys()].filter(file => !artifactInputs.has(file)).sort();
  const artifactTransitions = [...artifactInputs.keys()].sort().filter(file => artifactInputs.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: artifactInputs.get(file), afterSha256: after.get(file) }));
  insist(equal(artifactAdditions, continuity.artifactPredecessorAddedSourcePaths)
    && equal(artifactTransitions, continuity.artifactPredecessorSourceTransitions), 'undeclared artifact predecessor source transition');
  const proofSuccessions = onceSuccessions(readBytes);
  for (const input of proof.sources) assertCurrentOutputSourceInput(input.file, input.sha256, readBytes, 'stale output input', proofSuccessions);
  const currentSource = dcInnocenceCurrentSourceSuccession(readBytes);
  insist(equal(currentSource.continuity, continuity) && equal(currentSource.proof, proof), 'current source succession supplied proof/continuity changed');
  if (artifactSuccessor) artifactSuccessor = assertDcInnocenceArtifactSuccessor({
    binding: continuity.artifactSuccessor, proof: currentSource.adoptedProof, readBytes });
  // Preserve the frozen historical continuity API shape. The separately named
  // source-only record/accessor carries the current-source qualification.
  assertMsGaVaMnSourceSuccession(readBytes);
  return { path: QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, sha256: continuity.currentOutput.sha256,
    inputCount: proof.sources.length, continuity: { path: QUESTION_CONTRACT_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_CONTINUITY_SHA256 },
    previousContinuity, previousOutput, earlierContinuity, earlierOutput, sameDatePredecessorContinuity, sameDatePredecessorOutput,
    latestPredecessorContinuity, latestPredecessorOutput, immediatePredecessorContinuity, immediatePredecessorOutput, priorRevisionContinuity, priorRevisionOutput, acceptedRevisionContinuity, acceptedRevisionOutput, executedRevisionContinuity, executedRevisionOutput, renderedRevisionContinuity, renderedRevisionOutput, observedRevisionContinuity, observedRevisionOutput, measuredRevisionContinuity, measuredRevisionOutput, boundRevisionContinuity, boundRevisionOutput, validatedRevisionContinuity, validatedRevisionOutput, recordedRevisionContinuity, recordedRevisionOutput, capturedRevisionContinuity, capturedRevisionOutput, retainedRevisionContinuity, retainedRevisionOutput, continuedRevisionContinuity, continuedRevisionOutput, reviewedRevisionContinuity, reviewedRevisionOutput, integratedRevisionContinuity, integratedRevisionOutput, revalidatedRevisionContinuity, revalidatedRevisionOutput,
    artifactPredecessorContinuity, artifactPredecessorOutput, artifactSuccessor,
    sourcePredecessorContinuity: continuity.sourcePredecessorContinuity, sourcePredecessorOutput: continuity.sourcePredecessorOutput,
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

// Exact artifact-digest successor only. The original output and every approval
// remain immutable. A move explanation is never an adoption. Admission binds the
// exact separately recorded owner-approved decision below; callers cannot
// replace this trusted source pin or infer approval for another digest.
export const DC_INNOCENCE_ARTIFACT_DECISION_PATH = 'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_DC_ACTUAL_INNOCENCE_2026-10-16.json';
export const DC_INNOCENCE_ARTIFACT_DECISION_SHA256 = 'e37dcb06f202f35837f9df37e89febfbc9b61f0febf8d1c74bbf602009cb2858';
export const DC_INNOCENCE_ARTIFACT_MOVE_PATH = 'data/rcap-grade-a/legal-decisions/DC_ACTUAL_INNOCENCE_ARTIFACT_MOVE_2026-10-16.json';
const DC_INNOCENCE_ROUTE = 'DC:dc_actual_innocence_expungement_16_803';
const DC_INNOCENCE_RAW_OUTPUT_PATH = 'data/rcap-grade-a/participant-data-rights/question-contract-output-reproduction-20261016-v20.json';
const DC_INNOCENCE_RAW_OUTPUT_SHA256 = '406d5144b02a994eac974be64c7ed4c5291ad4289a5abe931303d2fc47bdea0a';
const DC_INNOCENCE_PRIOR_APPROVAL_PATH = 'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json';
const DC_INNOCENCE_PRIOR_APPROVAL_SHA256 = 'f6dfbd5e9336627df5a1beac174a85bf11d95849cf0cef6795ce86a8fd9c30d5';
const DC_INNOCENCE_SUCCESSOR_ARTIFACTS = [
  {
    "id": "full-en",
    "variant": "full",
    "locale": "en",
    "sha256": "bd64b84d93e50c960c5a7e9dcb3814e70d360eefef82d33247cbb5a7ba694c89",
    "pageCount": 11,
    "byteLength": 52551,
    "textSha256": "5a98bec5131f02f3c8d31f4bffd0c1d2d00cf00b15016bce2fce221e706f09d9",
    "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-en.pdf",
    "historical": {
      "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-full-en.pdf",
      "sha256": "baaf7e489216c8fd7de7cc197afd163351f2909dacddd175b011caa89a1f6b9c",
      "actualSha256": "baaf7e489216c8fd7de7cc197afd163351f2909dacddd175b011caa89a1f6b9c",
      "pageCount": 11
    }
  },
  {
    "id": "full-es",
    "variant": "full",
    "locale": "es",
    "sha256": "93d45d59fb10daa19c8656098d9ddf1fa21f289d5ec31e6f81bbbbc2077e19fd",
    "pageCount": 11,
    "byteLength": 53156,
    "textSha256": "1991d3a052d3989a3e49fb7023a87b12288283e87798bd0f8372aecdfa055959",
    "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-es.pdf",
    "historical": {
      "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-full-es.pdf",
      "sha256": "d5533512366af8334b242986e65e8d3e9aa1dc23c882028212cb131dce52a509",
      "actualSha256": "d5533512366af8334b242986e65e8d3e9aa1dc23c882028212cb131dce52a509",
      "pageCount": 11
    }
  },
  {
    "id": "court-only",
    "variant": "court_only",
    "locale": "en",
    "sha256": "17170a81ab2aa8a22eaaef25be79372bec9cf6f0095477c268a9e2e96a65de72",
    "pageCount": 5,
    "byteLength": 10494,
    "textSha256": "5ff7d2460d4cfa3d20e786ff2f91fcb514f0f0af5d992261f41ef783d1ea7a73",
    "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/court-only.pdf",
    "historical": {
      "path": "data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-court-only.pdf",
      "sha256": "761dd42907ca6bb68985fbc6a74f4d19747170ae51ab704b391bf74881565e78",
      "actualSha256": "761dd42907ca6bb68985fbc6a74f4d19747170ae51ab704b391bf74881565e78",
      "pageCount": 5
    }
  }
];

/** Exact production admission; semantic controls may transform source only in an isolated test VM. */
export function assertDcInnocenceArtifactSuccessor({ binding, proof, readBytes }) {
  // Admission trusts only the reviewed source pin. Caller-supplied properties
  // cannot replace it, including in below-pin semantic controls.
  const expectedDecisionSha256 = DC_INNOCENCE_ARTIFACT_DECISION_SHA256;
  insist(typeof expectedDecisionSha256 === 'string' && /^[a-f0-9]{64}$/.test(expectedDecisionSha256), 'DC artifact adoption pending');
  insist(equal(binding, { path: DC_INNOCENCE_ARTIFACT_DECISION_PATH, sha256: expectedDecisionSha256 }), 'DC artifact adoption binding');
  const decisionBytes = readBytes(binding.path);
  insist(sha(decisionBytes) === expectedDecisionSha256, 'DC artifact adoption bytes changed');
  const decision = JSON.parse(decisionBytes.toString('utf8'));
  const move = dcInnocenceArtifactMove(readBytes);
  insist(move && equal(decision.explainedMove, { path: DC_INNOCENCE_ARTIFACT_MOVE_PATH,
    sha256: sha(readBytes(DC_INNOCENCE_ARTIFACT_MOVE_PATH)) }), 'DC exact explained move binding');
  insist(decision.schemaVersion === 'rcap-owner-current-commercial-artifact-approval/v1'
    && decision.decisionId === 'OWNER-CURRENT-COMMERCIAL-ARTIFACT-APPROVAL-DC-ACTUAL-INNOCENCE-20261016'
    && decision.status === 'APPROVED_EXACT_CURRENT_COMMERCIAL_ARTIFACTS'
    && decision.owner === 'Roger Roman' && decision.decidedAt === '2026-10-16'
    && decision.authenticationKind === 'owner_instruction_in_current_conversation'
    && decision.approvesComposedBytes === true && decision.exactArtifactSuccessorOnly === true
    && decision.routeId === DC_INNOCENCE_ROUTE, 'DC artifact adoption identity/scope');
  for (const key of ['productionAuthorized', 'liveChargesAuthorized', 'commercialAuthorityGranted',
    'runtimeAuthorized', 'publicationAuthorized', 'workerDeliveryAuthorized', 'eligibilityChanged']) {
    insist(decision[key] === false, `DC artifact adoption overclaims ${key}`);
  }
  insist(equal(decision.supersedesArtifactDigestConditionOnly, {
    path: DC_INNOCENCE_PRIOR_APPROVAL_PATH, sha256: DC_INNOCENCE_PRIOR_APPROVAL_SHA256,
    routeId: DC_INNOCENCE_ROUTE, priorDecisionMutated: false }), 'DC prior artifact adoption identity');
  const priorBytes = readBytes(DC_INNOCENCE_PRIOR_APPROVAL_PATH);
  insist(sha(priorBytes) === DC_INNOCENCE_PRIOR_APPROVAL_SHA256, 'DC prior artifact adoption changed');
  const priorDecision = JSON.parse(priorBytes.toString('utf8'));
  insist(priorDecision.approvedArtifacts.length === 18, 'DC prior artifact inventory');
  for (const artifact of priorDecision.approvedArtifacts) {
    insist(sha(readBytes(artifact.path)) === artifact.sha256, `historical approved artifact changed: ${artifact.path}`);
  }
  insist(equal(decision.boundTo?.batch, { path: DC_INNOCENCE_RAW_OUTPUT_PATH, sha256: DC_INNOCENCE_RAW_OUTPUT_SHA256 }), 'DC exact measured output binding');
  const raw = readBytes(DC_INNOCENCE_RAW_OUTPUT_PATH);
  insist(sha(raw) === DC_INNOCENCE_RAW_OUTPUT_SHA256 && equal(JSON.parse(raw.toString('utf8')), proof), 'DC raw output measurement changed');
  insist(/^[a-f0-9]{40}$/.test(proof.headBefore) && proof.headAfter === proof.headBefore
    && proof.statusBefore === proof.statusAfter && decision.boundTo.commit === proof.headBefore
    && proof.schemaVersion === 'isolated-current-six-commercial-output/v2'
    && ['approvalGranted', 'commercialAuthorityGranted', 'productionAuthorized', 'protectedJourneyProven']
      .every(key => proof[key] === false), 'DC source candidate/scope drift');
  const visual = decision.boundTo?.visualReview;
  insist(visual?.path === 'data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_DC_ACTUAL_INNOCENCE_2026-10-16.json'
    && /^[a-f0-9]{64}$/.test(visual.sha256) && sha(readBytes(visual.path)) === visual.sha256, 'DC exact visual review binding');
  const expectedArtifacts = DC_INNOCENCE_SUCCESSOR_ARTIFACTS.map(a => ({ routeId: DC_INNOCENCE_ROUTE,
    artifactId: a.id, variant: a.variant, locale: a.locale, path: a.path, sha256: a.sha256,
    pageCount: a.pageCount, visualReviewStatus: 'inspected_no_blocking_defect' }));
  insist(equal(decision.approvedArtifacts, expectedArtifacts), 'DC exact successor artifact inventory');
  for (const artifact of expectedArtifacts) insist(sha(readBytes(artifact.path)) === artifact.sha256, 'DC successor artifact bytes changed');
  insist(equal(proof.counts, { routes: 6, outputs: 18, byteIdentical: 15, pass: 127, fail: 3 })
    && equal(proof.denominator, { routes: 6, families: 5, variants: 18 })
    && equal(proof.sourceDrift, []) && proof.checks.length === 130
    && new Set(proof.checks.map(c => c.id)).size === 130, 'DC raw output disposition');
  const failedIds = ['court-only', 'full-en', 'full-es'].map(id => `dc-actual-innocence:${id}:historical-approved-bytes`).sort();
  insist(equal(proof.checks.filter(c => c.status === 'FAIL').map(c => c.id).sort(), failedIds)
    && proof.checks.every(c => c.status === 'PASS' || failedIds.includes(c.id)), 'DC unadopted output failure');
  const moved = proof.routes.flatMap(row => row.artifacts.filter(a => a.byteIdenticalToHistoricalApproval !== true)
    .map(a => ({ routeId: row.routeId, id: a.id, sha256: a.sha256, historical: a.historical })));
  insist(equal(moved, DC_INNOCENCE_SUCCESSOR_ARTIFACTS.map(a => ({ routeId: DC_INNOCENCE_ROUTE,
    id: a.id, sha256: a.sha256, historical: a.historical }))), 'DC extra/missing moved artifact');
  const inputs = new Map(proof.sources.map(input => [input.file, input.sha256]));
  insist(proof.sources.length === 195 && inputs.size === 195, 'DC exact observed source inventory');
  // The approval remains bound to its immutable v20 batch. Current freshness
  // is established separately by the exact measured source-only successor.
  const currentSource = dcInnocenceCurrentSourceSuccession(readBytes);
  insist(equal(currentSource.adoptedProof, proof), 'DC adopted source batch changed');
  return { routeId: DC_INNOCENCE_ROUTE, decision: binding, rawOutput: decision.boundTo.batch,
    rawCounts: proof.counts, artifactDigests: expectedArtifacts, createsOwnerApproval: false,
    commercialAuthorityGranted: false, productionAuthorized: false };
}

// Private, acyclic freshness validation: never a caller-controlled approval
// override. The adopted v20 batch and its approval are not rewritten for v21.
function dcInnocenceCurrentSourceSuccession(readBytes) {
  const continuityBytes = readBytes(QUESTION_CONTRACT_CONTINUITY_PATH);
  insist(sha(continuityBytes) === QUESTION_CONTRACT_CONTINUITY_SHA256, 'current source succession continuity bytes changed');
  const continuity = JSON.parse(continuityBytes.toString('utf8'));
  const proofBytes = readBytes(QUESTION_CONTRACT_CURRENT_OUTPUT_PATH);
  insist(sha(proofBytes) === QUESTION_CONTRACT_CURRENT_OUTPUT_SHA256, 'current source succession proof bytes changed');
  const proof = JSON.parse(proofBytes.toString('utf8'));
  const predecessor = { path: QUESTION_CONTRACT_SOURCE_PREDECESSOR_OUTPUT_PATH, sha256: QUESTION_CONTRACT_SOURCE_PREDECESSOR_OUTPUT_SHA256 };
  const predecessorContinuity = { path: QUESTION_CONTRACT_SOURCE_PREDECESSOR_CONTINUITY_PATH, sha256: QUESTION_CONTRACT_SOURCE_PREDECESSOR_CONTINUITY_SHA256 };
  insist(equal(continuity.currentOutput, { path: QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, sha256: QUESTION_CONTRACT_CURRENT_OUTPUT_SHA256 })
    && equal(continuity.sourcePredecessorOutput, predecessor)
    && equal(continuity.sourcePredecessorContinuity, predecessorContinuity), 'current source succession ancestry');
  const adoptedBytes = readBytes(predecessor.path), priorContinuityBytes = readBytes(predecessorContinuity.path);
  insist(sha(adoptedBytes) === predecessor.sha256 && sha(priorContinuityBytes) === predecessorContinuity.sha256, 'current source succession predecessor bytes changed');
  const adoptedProof = JSON.parse(adoptedBytes.toString('utf8')), priorContinuity = JSON.parse(priorContinuityBytes.toString('utf8'));
  insist(equal(priorContinuity.currentOutput, predecessor)
    && Object.keys(priorContinuity).filter(key => /(?:Continuity|Output)$/.test(key) && key !== 'currentOutput')
      .every(key => equal(priorContinuity[key], continuity[key]))
    && equal(priorContinuity.artifactSuccessor, continuity.artifactSuccessor), 'current source succession retained ancestry');
  insist(proof.schemaVersion === adoptedProof.schemaVersion
    && proof.headBefore === '38b6c519957e1b6e82a800490613e7aa0f111db1'
    && proof.headAfter === proof.headBefore && continuity.reproducedCodeSha === proof.headBefore
    && proof.statusBefore === proof.statusAfter
    && ['approvalGranted', 'commercialAuthorityGranted', 'productionAuthorized', 'protectedJourneyProven'].every(key => proof[key] === false)
    && equal(proof.denominator, adoptedProof.denominator) && equal(proof.counts, adoptedProof.counts)
    && equal(proof.checks, adoptedProof.checks) && equal(proof.sourceDrift, [])
    && equal(proof.reproductionScripts, adoptedProof.reproductionScripts), 'current source succession candidate/scope');
  // Only run-relative artifact custody paths differ. Every text/byte/page and
  // all route, fixture, specification and control semantics remain exact.
  insist(equal(proof.routes.map(withoutArtifactPaths), adoptedProof.routes.map(withoutArtifactPaths)), 'current source succession changed output semantics');
  const before = new Map(adoptedProof.sources.map(input => [input.file, input.sha256]));
  const after = new Map(proof.sources.map(input => [input.file, input.sha256]));
  insist(adoptedProof.sources.length === 195 && before.size === 195
    && proof.sources.length === 198 && after.size === 198 && continuity.currentSourceCount === 198
    && continuity.sourcePredecessorSourceCount === 195
    && [...before.keys()].every(file => after.has(file)), 'current source succession inventory');
  const additions = [...after.keys()].filter(file => !before.has(file)).sort();
  const transitions = [...before.keys()].sort().filter(file => before.get(file) !== after.get(file))
    .map(file => ({ file, beforeSha256: before.get(file), afterSha256: after.get(file) }));
  insist(equal(additions, ['src/lib/expungement-ai/md-juvenile-county-source-purpose.ts',
    'src/lib/rcap/state-packs/maryland/filing-instructions.ts', 'src/lib/rcap/state-packs/maryland/required-fields.ts'])
    && equal(transitions, [{ file: 'src/lib/expungement-ai/record-fact-clarification.ts',
      beforeSha256: '4f7a5acd19c5b48bbd873fe612c1a282ccdb3619453346ec90cf5f72ccc5f576',
      afterSha256: '7910a4866db9a154c9eaf32e3a218d27584b0c65de4807851cf37ad85b3f27a8' }])
    && equal(additions, continuity.sourcePredecessorAddedSourcePaths)
    && equal(transitions, continuity.sourcePredecessorSourceTransitions), 'current source succession undeclared transition');
  const afterSuccessions = onceSuccessions(readBytes);
  for (const [file, digest] of after) assertCurrentOutputSourceInput(file, digest, readBytes, 'current source succession stale input', afterSuccessions);
  return { continuity, proof, adoptedProof };
}

// A comparison projection only: raw proof counts/status/hashes are never changed.
function sameArtifactSuccessorSemantics(current, previous, successor) {
  if (!successor || current.routeId !== successor.routeId) return equal(withoutArtifactPaths(current), withoutArtifactPaths(previous));
  const projected = { ...current, artifacts: current.artifacts.map(artifact => {
    const old = previous.artifacts.find(a => a.id === artifact.id);
    const pinned = DC_INNOCENCE_SUCCESSOR_ARTIFACTS.find(a => a.id === artifact.id);
    insist(old && pinned && artifact.sha256 === pinned.sha256 && equal(artifact.historical, pinned.historical)
      && artifact.byteLength === pinned.byteLength && artifact.pageCount === pinned.pageCount
      && artifact.textSha256 === pinned.textSha256 && artifact.byteIdenticalToHistoricalApproval === false
      && artifact.visualDisposition === 'Changed bytes require new page review; this runner grants none.', 'changed output semantics: DC exact artifact comparison delta');
    // Only fields independently validated above differ; every other historical
    // artifact/route value remains part of the full comparison.
    return { ...artifact, sha256: old.sha256, byteLength: old.byteLength,
      textSha256: old.textSha256, byteIdenticalToHistoricalApproval: old.byteIdenticalToHistoricalApproval,
      visualDisposition: old.visualDisposition };
  }) };
  return equal(withoutArtifactPaths(projected), withoutArtifactPaths(previous));
}
function withoutArtifactPaths(row) {
  return { ...row, artifacts: row.artifacts.map(({ path: _path, ...artifact }) => artifact) };
}

/** Explained custody transition only; never an owner approval or an open route. */
export function dcInnocenceArtifactMove(readBytes) {
  try {
    const record = JSON.parse(readBytes(DC_INNOCENCE_ARTIFACT_MOVE_PATH).toString('utf8'));
    insist(record.schemaVersion === 'rcap-approved-artifact-move/v1'
      && record.recordId === 'DC-ACTUAL-INNOCENCE-ARTIFACT-MOVE-20261016'
      && record.routeId === DC_INNOCENCE_ROUTE && record.createsApproval === false
      && record.approvesMovedBytes === false && record.opensAnyRoute === false
      && record.productionAuthorized === false && record.awaitingOwnerDecision === false
      && record.ownerDecisionRecordedSeparately === true
      && record.createdAfterOwnerDecision === true, 'DC explained move scope');
    insist(equal(record.supersedes, { path: DC_INNOCENCE_PRIOR_APPROVAL_PATH,
      sha256: DC_INNOCENCE_PRIOR_APPROVAL_SHA256, priorDecisionMutated: false }), 'DC explained move predecessor');
    insist(sha(readBytes(record.supersedes.path)) === record.supersedes.sha256, 'DC explained move historical approval changed');
    const expected = DC_INNOCENCE_SUCCESSOR_ARTIFACTS.map(a => ({ id: a.id,
      priorPath: a.historical.path, path: a.path, from: a.historical.sha256, to: a.sha256, moved: true }));
    insist(equal(record.artifacts, expected), 'DC explained move exact inventory');
    for (const a of expected) insist(sha(readBytes(a.priorPath)) === a.from
      && sha(readBytes(a.path)) === a.to, 'DC explained move custody changed');
    insist(equal(record.measuredOutput, { path: DC_INNOCENCE_RAW_OUTPUT_PATH,
      sha256: DC_INNOCENCE_RAW_OUTPUT_SHA256 })
      && sha(readBytes(record.measuredOutput.path)) === record.measuredOutput.sha256, 'DC explained move actual measurement changed');
    return record;
  } catch { return null; }
}
