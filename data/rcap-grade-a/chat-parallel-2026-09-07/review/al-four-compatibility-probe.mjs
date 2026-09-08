#!/usr/bin/env node
// Execute the byte-pinned current reader against byte-pinned published evidence.
// No shared code, packet, execution flag or verdict is changed to gain admission.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const [consumerPath,reviewPath,outPath]=process.argv.slice(2);
assert(consumerPath&&reviewPath&&outPath,'Usage: node probe.mjs consumer.mjs published-review.json output.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const cb=fs.readFileSync(consumerPath),rb=fs.readFileSync(reviewPath);
assert.equal(blob(cb),'f508910af747743bff1b9cd807ee7ff9d382cefe');
assert.equal(blob(rb),'b332313a6a4ef396be988d582bc722adcb558a13');
const {chatReviewInputs,chatRowProblem,normalizeBoundedChatFailure}=await import(pathToFileURL(consumerPath));
const d=JSON.parse(rb);const keys=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'chatb-al-review-readonly-'));const dir=path.join(root,'data/rcap-grade-a/chat-parallel-2026-09-07/review');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'al-four-current-independent-review.json'),rb);
fs.writeFileSync(path.join(dir,'measurements-only.json'),JSON.stringify({schemaVersion:'chatb-al-four-current-execution/v1',rows:[],familyVerdict:null}));
const found=chatReviewInputs(root);assert.equal(found.length,1);assert.equal(found[0].inputSha256,sha(rb));
const rows=[];for(const r of d.rows){assert.deepEqual(Object.keys(r.proofObligations),keys);assert.equal(r.verdict,'PASS');assert.notEqual(r.verdict,'PASS_COMPLETE_INDEPENDENT');assert.equal(chatRowProblem(d,r,keys),null);assert.deepEqual(normalizeBoundedChatFailure(root,d,r),r);assert(r.unmeasuredObligations.length>0);assert.equal(r.nineCounters.allZero,false);rows.push({familyId:r.familyId,consumerProblem:null,verdict:r.verdict,verdictUnchanged:true,all15ObligationsPresent:true,unmeasuredRetained:r.unmeasuredObligations,productPendingRetained:r.productPendingObligations,normalizerPreservesExactRow:true});}
const controls=[];for(const [name,change]of[
 ['missing-reviewer',x=>delete x.reviewer],['missing-session',x=>delete x.sessionIdentity],['wrong-lane',x=>x.laneKind='build'],
 ['packet-authorship-disclosure',x=>x.packetFilesEdited=true],['builder-execution-disclosure',x=>x.buildersExecutedOrEdited=true],
 ['changed-family-identity',x=>x.rows[0].itemId='different-family'],['invalid-base',x=>x.rows[0].verifiedAtBase='not-a-commit']]){
 const x=structuredClone(d);change(x);assert.equal(x.rows[0].verdict,d.rows[0].verdict);const problem=chatRowProblem(x,x.rows[0],keys);assert(problem);controls.push({case:name,rejected:true,problem,verdictUnchanged:true});}
assert.equal(sha(cb),sha(fs.readFileSync(consumerPath)));assert.equal(sha(rb),sha(fs.readFileSync(reviewPath)));
const result={schemaVersion:'chatb-al-current-review-compatibility/v1',consumer:{path:'scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs',readAt:'70413199d405d3a5e629f852a6298f416f90707c',gitBlob:blob(cb),sha256:sha(cb)},review:{commit:'330536e012d1ae3494a2e51161e181a36d20c4ab',gitBlob:blob(rb),sha256:sha(rb)},discovery:{verdictDocuments:found.length,measurementDocumentExcluded:true},rows,controls,inputFilesUnchanged:2,verdictsModified:0,sharedFilesModified:0,scope:'Exact current reader discovery/row validation/normalization, not a full admission extraction, state transition or terminal/production grant. Negative tests alter copies only and never alter verdicts. Previous session06 flags remain unchanged.'};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,negativeControls:controls.length,verdictsModified:0}));
