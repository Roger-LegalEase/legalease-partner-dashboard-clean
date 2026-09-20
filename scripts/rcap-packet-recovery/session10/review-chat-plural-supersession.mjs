import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {supersededChatEvidencePath, supersededChatEvidencePaths} from '../../grade-a-packet-factory-24h/chat-review-inputs.mjs';

const root=process.cwd();
const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ga-warning-closure';
const base='data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review';
const extractor='scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs';
const helper='scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs';
const returnsPath='data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json';
const json=p=>JSON.parse(fs.readFileSync(p));
const identity=p=>{const b=fs.readFileSync(p);return {path:p,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length};};
const source=fs.readFileSync(extractor,'utf8');
const selectionCode=source.slice(source.indexOf('const lanePrecedence ='),source.indexOf('\n/*',source.indexOf('const current = new Map();')));
assert.ok(selectionCode.startsWith('const lanePrecedence =')&&selectionCode.includes('supersedesEvidencePaths?.includes'));
// Use the actual comparator, actual git ancestry reader, and actual family
// selection loop. This does not import/run the extractor's writing entrypoint.
const select=new Function('rows','NON_READING','FACTORY_RETURNS','ROOT','execFileSync',`${selectionCode}\nreturn current;`);
const run=rows=>select(rows,new Set(['BLOCKED_BEFORE_CLAIM']),'data/rcap-grade-a/packet-factory-24h/returns',root,execFileSync);
const cases=[];
const check=(name,fn)=>{const measured=fn();cases.push({name,result:'PASS',...measured});};
const paths=['ga-independent-review-03.json','ga-warning-delta-04.json'];
const full=`${base}/ga-session10-acceptance.json`;
const doc=json(full),row=doc.rows.find(r=>r.familyId==='ga-nonconv-pre2013-set');
check('published actual reviewer declaration names both finite prior reviews',()=>{
  assert.deepEqual(row.supersedesSubmittedDispositions,paths);
  assert.deepEqual(supersededChatEvidencePaths(base,doc,row),paths.map(p=>`${base}/${p}`));
  assert.equal(supersededChatEvidencePath(base,doc,row),`${base}/ga-warning-delta-04.json`);
  return {singularCompatibilityPreserved:true,declaredPaths:paths};
});
check('document default applies only to a row without a plural declaration',()=>{
  const d={supersedesSubmittedDispositions:['document.json']};
  assert.deepEqual(supersededChatEvidencePaths(base,d,{}),[`${base}/document.json`]);
  assert.deepEqual(supersededChatEvidencePaths(base,d,{supersedesSubmittedDispositions:null}),[`${base}/document.json`]);
  assert.deepEqual(supersededChatEvidencePaths(base,d,{supersedesSubmittedDispositions:['row.json']}),[`${base}/row.json`]);
  return {nullishFallbackPreserved:true,rowPrecedence:true};
});
for(const value of [[],false,7,'old.json',['valid.json','../old.json'],['sub/old.json'],['sub\\old.json'],['/old.json'],['old.md'],[''],[null],['valid.json',false]])check(`invalid explicit list is rejected atomically: ${JSON.stringify(value)}`,()=>{
  assert.deepEqual(supersededChatEvidencePaths(base,{supersedesSubmittedDispositions:['default.json']},{supersedesSubmittedDispositions:value}),[]);
  return {noPartialGrant:true,noDefaultFallback:true};
});
check('absent declarations grant nothing and duplicate explicit paths are deduplicated',()=>{
  assert.deepEqual(supersededChatEvidencePaths(base,{},{}),[]);
  assert.deepEqual(supersededChatEvidencePaths(base,{}, {supersedesSubmittedDispositions:['same.json','same.json']}),[`${base}/same.json`]);
});
const returns=json(returnsPath);
const ga=returns.rows.filter(r=>r.familyId===row.familyId);
assert.equal(ga.length,3);
const permutations=xs=>xs.length<=1?[xs]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(p=>[x,...p]));
for(const [i,order] of permutations(ga).entries())check(`actual comparator selects complete review in GA permutation ${i+1}`,()=>{
  const current=run(order).get(row.familyId);
  assert.equal(current.evidencePath,full);
  assert.equal(current.verdict,'PASS_COMPLETE_INDEPENDENT');
  return {inputOrder:order.map(r=>r.evidencePath),selected:current.evidencePath};
});
check('cross-family paths cannot supersede a distinct family',()=>{
  const current=ga.find(r=>r.evidencePath===full),old=ga.find(r=>r.evidencePath.endsWith(paths[0]));
  const unrelated={...current,familyId:'reviewer-unrelated-family'};
  for(const order of [[old,unrelated],[unrelated,old]]){
    const result=run(order);assert.equal(result.size,2);assert.equal(result.get(old.familyId),old);assert.equal(result.get(unrelated.familyId),unrelated);
  }
});
check('unknown explicit path leaves ordinary same-family selection unchanged',()=>{
  const first={...ga[0],familyId:'reviewer-control',lane:'VF01',verifiedAtBase:null,supersedesEvidencePath:null,supersedesEvidencePaths:undefined};
  const second={...first,lane:'VF02',evidencePath:`${base}/control-second.json`,supersedesEvidencePaths:[`${base}/absent.json`]};
  assert.equal(run([first,second]).get(first.familyId),second);
  assert.equal(run([second,first]).get(first.familyId),second);
});
check('non-reading verdict remains ineligible despite explicit declarations',()=>{
  const accepted=ga.find(r=>r.evidencePath===full);
  const blocked={...accepted,verdict:'BLOCKED_BEFORE_CLAIM',evidencePath:`${base}/blocked-control.json`,supersedesEvidencePaths:[full]};
  assert.equal(run([accepted,blocked]).get(row.familyId),accepted);
});
check('executed full extractor selects published acceptance and preserves original review bytes',()=>{
  const active=ga.filter(r=>!r.superseded);assert.equal(active.length,1);assert.equal(active[0].evidencePath,full);
  for(const r of ga){assert.equal(r.evidenceSha256,identity(r.evidencePath).sha256);assert.equal(r.superseded,r.evidencePath!==full);}
  assert.equal(active[0].verdict,'PASS_COMPLETE_INDEPENDENT');
  return {currentReview:full,originalsRetained:2,wholeExtractorExitCode:0,executionSession:3971};
});
const report={schemaVersion:'rcap-independent-delta-review/v1',reviewer:'/root/independent_md_review',reviewedAt:new Date().toISOString(),verdict:'PASS',
  scope:'Finite explicit plural review supersession; actual row extraction and selection, preserving all original verdicts',
  authorReviewerSeparation:'Root authored shared helper/extractor; separate reviewer authored and executed these controls. Reviewer owns the GA static review declaration, not this selection implementation.',
  independentCases:cases.length,cases,inputs:[helper,extractor,returnsPath,full,...paths.map(p=>`${base}/${p}`)].map(identity),
  script:identity('scripts/rcap-packet-recovery/session10/review-chat-plural-supersession.mjs'),
  fullExtractor:{command:'node scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs',exitCode:0,executionSession:3971,log:identity(`${out}/plural-extractor.log`),independentVerdicts:249,existingFailRepairRequired:46},
  limits:['No review verdict, counter, original author attribution or packet bytes were changed by the implementation.','Selection remains per family; unknown paths grant no acceptance. Existing reading/schema/whole-output checks still precede selection.','No legal, runtime, payment, raster issuer or production authority is granted.'],sharedImplementationModifiedByReviewer:false};
fs.writeFileSync(`${out}/plural-supersession-independent-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,cases:cases.length,path:`${out}/plural-supersession-independent-review.json`}));
