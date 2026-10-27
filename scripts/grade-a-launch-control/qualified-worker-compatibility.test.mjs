import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertQualifiedWorkerCompatibility} from './verify-qualified-worker-forward-binding.mjs';
const root=path.resolve(import.meta.dirname,'../..');
test('accepted 4c application retains actual qualified 84a image without claiming canonical equality',()=>{
 const {identity,plan,compatibilityBinding}=assertQualifiedWorkerCompatibility(root);
 assert.equal(identity.source,'84a75b6e65dc69e6c371afac44f1284e0debf722');
 assert.equal(plan.candidateSha,'ed8d0902a99c5326f75987a942eb507b6cfb16cf');
 const proof=JSON.parse(fs.readFileSync(path.join(root,compatibilityBinding.path)));
 assert.equal(proof.applicationSha,'4c189b682d0a9225a21b9fdf8a2ebc50500029d6');assert.equal(proof.canonicalSourceEquivalent,false);assert.equal(proof.canonicalRebuildRequired,true);
});
test('missing qualification or modified accepted source proof refuses',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-compat-test-'));
 try{
  assert.throws(()=>assertQualifiedWorkerCompatibility(dir));
  fs.mkdirSync(path.join(dir,'scripts'),{recursive:true});
  for(const name of ['publication','publication-run','qualification','qualification-acceptance'])fs.copyFileSync(path.join(root,'scripts/dtc-qualified-worker-'+name+'.json'),path.join(dir,'scripts/dtc-qualified-worker-'+name+'.json'));
  const proof=path.join(dir,'data/rcap-grade-a/launch-control/QUALIFIED_WORKER_SOURCE_EQUIVALENCE.json');fs.mkdirSync(path.dirname(proof),{recursive:true});fs.writeFileSync(proof,'{}');
  assert.throws(()=>assertQualifiedWorkerCompatibility(dir),{code:'ERR_ASSERTION'});
 }finally{fs.rmSync(dir,{recursive:true});}
});
