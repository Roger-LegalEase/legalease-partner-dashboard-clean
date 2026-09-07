#!/usr/bin/env node
/** Read-only compatibility check against the exact current consumer module.
 * No persisted verdict, packet or shared admission code is changed.
 */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [modulePath,reviewPath,evidencePath,outPath]=process.argv.slice(2);assert(modulePath&&reviewPath&&evidencePath&&outPath);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const originalModule=fs.readFileSync(modulePath),raw=fs.readFileSync(reviewPath),ev=fs.readFileSync(evidencePath);
assert.equal(blob(originalModule),'f508910af747743bff1b9cd807ee7ff9d382cefe');
const {chatReviewInputs,chatRowProblem,normalizeBoundedChatFailure}=await import(pathToFileURL(modulePath));
const doc=JSON.parse(raw);const obligations=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chatb-review-shape-'));const base='data/rcap-grade-a/chat-parallel-2026-09-07/review';
const dir=path.join(temp,base);fs.mkdirSync(dir,{recursive:true});
try{
 fs.writeFileSync(path.join(dir,path.basename(reviewPath)),raw);fs.writeFileSync(path.join(dir,path.basename(evidencePath)),ev);
 const discovered=chatReviewInputs(temp);assert.equal(discovered.length,1);assert.equal(discovered[0].inputSha256,hash(raw));
 const rows=[];
 for(const row of doc.rows){
  assert.deepEqual(Object.keys(row.proofObligations).sort(),[...obligations].sort());
  assert.equal(row.verdict,'FAIL_REPAIR_REQUIRED');const error=chatRowProblem(doc,row,obligations);assert.equal(error,null);
  const normalized=normalizeBoundedChatFailure(temp,doc,row);assert.strictEqual(normalized,row);
  rows.push({familyId:row.familyId,verdict:row.verdict,obligations:15,consumerProblem:error,normalizerPreservedExactRow:true});
 }
 const controls=[];
 for(const [name,change] of [
  ['missing-reviewer',d=>d.reviewer=''],['wrong-lane',d=>d.laneKind='builder'],
  ['author-packet-mutation',d=>d.packetFilesEdited=true],['declared-builder-execution',d=>d.buildersExecutedOrEdited=true],
  ['mismatched-family',d=>d.rows[0].itemId='different-family'],['invalid-base',d=>d.rows[0].verifiedAtBase='latest']]){
  const test=structuredClone(doc);change(test);const error=chatRowProblem(test,test.rows[0],obligations);assert(error);assert.equal(test.rows[0].verdict,doc.rows[0].verdict);controls.push({case:name,rejected:true,error,verdictUnchanged:true});
 }
 assert.equal(hash(fs.readFileSync(modulePath)),hash(originalModule));assert.equal(hash(fs.readFileSync(reviewPath)),hash(raw));assert.equal(hash(fs.readFileSync(evidencePath)),hash(ev));
 const result={schemaVersion:'chatb-readonly-review-compatibility/v1',consumer:{repositoryPath:'scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs',readAt:'21a269f31a7dff8084d6c74ecdb553be5979ba03',gitBlob:blob(originalModule),sha256:hash(originalModule)},reviewSha256:hash(raw),evidenceSha256:hash(ev),discovery:{verdictDocuments:discovered.length,measurementSidecarExcluded:true},rows,controls,inputsUnchanged:3,verdictsChanged:0,sharedCodeChanged:false,scope:'Discovery, fifteen-key row shape and negative-row normalization only. No admission extraction, shared ledger, positive grant or production execution.'};
 fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,controls:controls.length,verdictsChanged:0,sharedCodeChanged:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
