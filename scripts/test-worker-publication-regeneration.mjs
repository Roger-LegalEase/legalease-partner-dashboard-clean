// Runs the real generator with temporary synthetic publication/acceptance
// receipts, restoring every original byte in finally. Run without concurrent
// generation, builds or verifiers that read these files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorkerInputPlan} from './rcap-hosted-acceptance-worker-input-plan.mjs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD');
const plan=createWorkerInputPlan({rootDir:process.cwd(),candidateSha:sha,acceptedSourceSha:sha,acceptedDigest:'sha256:'+'a'.repeat(64)});
const fingerprint=()=>{
 const entries=execFileSync('git',['ls-tree','-r','-z','--full-tree',sha,'--',...plan.canonicalInputs],{encoding:'utf8'}).split('\0').filter(Boolean).map(line=>{const [meta,file]=line.split('\t');const [mode,type]=meta.split(' ');return {file,mode,type,oid:git('hash-object','--',file)};}).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 const hash=createHash('sha256').update('rcap-canonical-worker-inputs/v1\0');for(const e of entries)for(const value of [e.file,e.mode,e.type,e.oid])hash.update(value+'\0');return 'sha256:'+hash.digest('hex');
};
const publication='data/rcap-render/worker-publication-evidence.json';
const outputs=['data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-grade-a/fulfillment-authority-projection.json','data/rcap-grade-a/worker-static-authority.json'];
const backups=new Map([publication,...outputs].map(f=>[f,fs.readFileSync(f)]));
const before=fingerprint();const evidence={schemaVersion:'rcap-publication-circularity-regression/v1',sourceSha:sha,before,syntheticReceiptsOnly:true};
try {
 const native=JSON.parse(backups.get(publication));
 for(const kind of ['publication','acceptance']) {
  const receipt={...native,sourceSha:sha,immutableRegistryDigest:'sha256:'+'b'.repeat(64),workflowConclusion:'success',syntheticTestOnly:true};
  if(kind==='acceptance')receipt.imageAcceptance={syntheticTestOnly:true,workflowConclusion:'success'};
  fs.writeFileSync(publication,JSON.stringify(receipt,null,2)+'\n');
  execFileSync(process.execPath,['scripts/generate-rcap-grade-a-fulfillment-authority.mjs'],{stdio:'pipe'});
  evidence[kind]=fingerprint();assert.equal(evidence[kind],before,`${kind} regeneration changed real worker inputs`);
 }
} finally {for(const [f,b] of backups)fs.writeFileSync(f,b);}
assert.equal(fingerprint(),before);evidence.restored=true;evidence.result='PASS';
if(process.env.REGRESSION_EVIDENCE_PATH)fs.writeFileSync(process.env.REGRESSION_EVIDENCE_PATH,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
