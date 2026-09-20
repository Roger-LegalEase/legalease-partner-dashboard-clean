import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {reuseHeldFactCanonicalEvidence as reuse} from './reuse-held-fact-canonical-evidence.mjs';
const root=process.cwd();const policy=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/warp-20260912/known-fact-fit/canonical-reuse.json'));
assert.ok(policy.rows.length>=3,'verified original custody fixtures missing');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'held-fact-reuse-test-'));
let passed=0,pages=0;
try{
 for(const p of policy.rows){
  const args={root,out,familyId:p.familyId,familyPath:p.familyId,target:{kind:'canonical',name:p.document.name,rel:p.document.path,expected:p.document.sha256,expectedPages:p.document.pageCount},descriptor:p.descriptor,scale:2.5,currentPageCount:p.document.pageCount};
  const result=await reuse(args);assert.equal(result.measurements.length,p.document.pageCount);assert.equal(result.document.renderedInThisRun,false);passed++;pages+=result.measurements.length;
  const bad=[{familyId:'pa_6308_underage-set'},{target:{...args.target,kind:'boundary'}},{target:{...args.target,expected:'0'.repeat(64)}},{descriptor:{...args.descriptor,originalRunId:'1'}},{currentPageCount:p.document.pageCount+1},{scale:1}];
  for(const mutation of bad){await assert.rejects(()=>reuse({...args,...mutation}));passed++;}
 }
 console.log(JSON.stringify({status:'PASS',checks:passed,originalPagesReused:pages,packetBytesWritten:0}));
}finally{fs.rmSync(out,{recursive:true,force:true});}
