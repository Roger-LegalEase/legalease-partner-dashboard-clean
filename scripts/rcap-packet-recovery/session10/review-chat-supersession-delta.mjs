import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {chatReviewInputs, chatRowProblem, normalizeBoundedChatFailure, supersededChatEvidencePath} from '../../grade-a-packet-factory-24h/chat-review-inputs.mjs';

const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/md-independent-review';
const base='data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review';
const acceptance=`${base}/md-session08-acceptance.json`, guard=`${base}/md-guard-delta-03.json`;
const original=`${base}/md-independent-review.json`;
const helper='scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs';
const extractor='scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs';
const returnsPath='data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json';
const beforePath='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/admission-defects-before.json';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=p=>({path:p,sha256:sha(read(p)),bytes:read(p).length});
const observedInputHashes=[helper,extractor,acceptance,guard,original,returnsPath].map(identity);
const doc=json(acceptance),row=doc.rows.find(r=>r.familyId==='md_10105_favorable-set');
const obligations=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const cases=[];
const check=(name,fn)=>{const measured=fn();cases.push({name,result:'PASS',...measured});};

check('actual acceptance has row-level declaration that the previous document-only reader missed',()=>{
  assert.equal(doc.supersedesSubmittedDisposition,undefined);
  assert.equal(row.supersedesSubmittedDisposition,'md-guard-delta-03.json');
  assert.equal(supersededChatEvidencePath(base,doc,row),guard);
  const before=json(beforePath).families.find(f=>f.familyId===row.familyId);
  assert.equal(before.selectedIndependentVerdict.evidencePath,guard);
  assert.equal(before.selectedIndependentVerdict.verdict,'PASS');
  return {previousSelectedVerdict:before.selectedIndependentVerdict,rawDeclaration:row.supersedesSubmittedDisposition};
});
check('actual discovery, review-contract and whole-output gates still apply before the declaration is consumed',()=>{
  const entry=chatReviewInputs(process.cwd()).find(r=>r.file===acceptance);
  assert.ok(entry);
  assert.equal(entry.inputSha256,sha(read(acceptance)));
  assert.equal(chatRowProblem(doc,row,obligations),null);
  assert.equal(normalizeBoundedChatFailure(process.cwd(),doc,row),row);
  return {discovered:true,originalReviewContractPassed:true,currentCanonicalAndBoundaryAnchorsMatched:true,reviewAuthorshipUnchanged:true};
});
check('source extractor actually invokes helper on the row it is returning',()=>{
  const source=read(extractor).toString();
  assert.match(source,/import\s*\{[^}]*supersededChatEvidencePath[^}]*\}\s*from\s*["']\.\/chat-review-inputs\.mjs["']/);
  assert.match(source,/supersedesEvidencePath:\s*supersededChatEvidencePath\(base,\s*doc,\s*r\)/);
  return {actualCaller:extractor};
});
check('document default remains valid when the row provides no declaration',()=>{
  assert.equal(supersededChatEvidencePath(base,{supersedesSubmittedDisposition:'default.json'},{}),`${base}/default.json`);
  assert.equal(supersededChatEvidencePath(base,{supersedesSubmittedDisposition:'default.json'},{supersedesSubmittedDisposition:null}),`${base}/default.json`);
  return {defaultApplied:true};
});
check('row declaration overrides document default without leaking into another row',()=>{
  const d={supersedesSubmittedDisposition:'default.json'};
  assert.equal(supersededChatEvidencePath(base,d,{supersedesSubmittedDisposition:'row.json'}),`${base}/row.json`);
  assert.equal(supersededChatEvidencePath(base,d,{}),`${base}/default.json`);
  return {perRowPrecedence:true};
});
for(const value of ['../old.json','sub/old.json','sub\\old.json','/old.json','old.md',false,7,''])check(`invalid explicit row declaration refuses instead of falling back: ${JSON.stringify(value)}`,()=>{
  assert.equal(supersededChatEvidencePath(base,{supersedesSubmittedDisposition:'default.json'},{supersedesSubmittedDisposition:value}),null);
  return {refused:true};
});
check('absent declaration grants no supersession',()=>{
  assert.equal(supersededChatEvidencePath(base,{},{}),null);
  return {refused:true};
});

const source=read(extractor).toString();
const comparison=source.slice(source.indexOf('const supersedes ='),source.indexOf('const current = new Map();'));
assert.ok(comparison.startsWith('const supersedes ='));
// Explicit declarations must resolve before proxy recency. Throw if a proxy is consulted.
const unexpected=()=>{throw new Error('explicit declaration unexpectedly fell through to ancestry/lane precedence');};
const supersedes=new Function('isAncestorOf','isCommit','lanePrecedence',`${comparison}; return supersedes;`)(unexpected,unexpected,unexpected);
const a={familyId:row.familyId,evidencePath:acceptance,supersedesEvidencePath:guard,verifiedAtBase:row.verifiedAtBase,isIndependentVerification:true,verdict:row.verdict};
const g={familyId:row.familyId,evidencePath:guard,supersedesEvidencePath:null,isIndependentVerification:true,verdict:'PASS'};
check('actual selection comparator honors explicit supersession in both input orders',()=>{
  assert.equal(supersedes(a,g),true);
  assert.equal(supersedes(g,a),false);
  return {ancestryOrLaneProxyInvocations:0};
});
const selection=source.slice(source.indexOf('const current = new Map();'),source.indexOf('\n/*',source.indexOf('const current = new Map();')));
const select=new Function('rows','NON_READING','supersedes',`${selection};return current;`);
check('actual family partition does not let a cross-family declaration replace another family',()=>{
  const unrelated={...a,familyId:'reviewer-unrelated-family'};
  const selected=select([g,unrelated],new Set(['BLOCKED_BEFORE_CLAIM']),supersedes);
  assert.equal(selected.get(g.familyId),g);
  assert.equal(selected.get(unrelated.familyId),unrelated);
  return {selectedFamilies:selected.size};
});
check('actual current extractor output selects acceptance and retains both older reviews as history',()=>{
  const returns=json(returnsPath),related=returns.rows.filter(r=>r.familyId===row.familyId);
  const selected=related.filter(r=>!r.superseded);
  assert.equal(selected.length,1);
  assert.equal(selected[0].evidencePath,acceptance);
  assert.equal(selected[0].supersedesEvidencePath,guard);
  assert.equal(selected[0].verdict,'PASS_COMPLETE_INDEPENDENT');
  for(const p of [acceptance,guard,original]){
    const stored=related.find(r=>r.evidencePath===p);assert.ok(stored);
    assert.equal(stored.evidenceSha256,sha(read(p)));
    assert.equal(stored.superseded,p!==acceptance);
  }
  return {currentAcceptance:selected[0].evidencePath,retainedOriginals:2,rawReviewHashesMatched:true};
});
for(const i of observedInputHashes)assert.equal(sha(read(i.path)),i.sha256,`review input changed during check: ${i.path}`);
const report={schemaVersion:'rcap-independent-delta-review/v1',reviewer:'/root/independent_md_review',reviewedAt:new Date().toISOString(),
  verdict:'PASS',scope:'Existing row-level chat-review supersession extraction; no new packet or legal approval',
  authorReviewerSeparation:'Root authored helper and extractor change; this separate reviewer inspected the actual caller and authored/executed these controls.',
  independentCases:cases.length,cases,inputs:observedInputHashes,
  reviewerScript:identity('scripts/rcap-packet-recovery/session10/review-chat-supersession-delta.mjs'),
  originalAcceptanceAttribution:{path:acceptance,reviewer:doc.reviewer,sessionIdentity:doc.sessionIdentity,verifiedAtBase:row.verifiedAtBase},
  fullExtractorCheckObservedSeparately:{command:'node scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs --check',
    executedBy:'/root/independent_md_review',toolExecSession:88368,exitCode:0,
    result:'verifier returns converge: 245 independent verdict(s), 46 FAIL_REPAIR_REQUIRED.',
    existingRefusedRows:17,existingRefusalsRemainVisible:true,sharedFilesWritten:false},
  authorSuite:{...identity('data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/review-supersession-tests.json'),rerunHere:false,claimedAsIndependent:false},
  reviewLimits:['The existing acceptance, its original reviewer and its bounded ordinary Maryland 072A scope are preserved.','Supersession does not upgrade a guard-only PASS or create unmeasured obligations/counters. It selects a separate already-complete acceptance row.','No changed PDF, new counsel acceptance, route/runtime/payment grant or production deployment is claimed.'],
  rawReviewsChanged:false,sharedFilesModified:false,productionChanged:false};
fs.writeFileSync(`${out}/chat-supersession-delta-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,independentCases:cases.length,reviewPath:`${out}/chat-supersession-delta-review.json`,selectedReview:acceptance},null,2));
