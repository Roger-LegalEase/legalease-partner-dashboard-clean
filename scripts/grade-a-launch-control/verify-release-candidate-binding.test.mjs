import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyReleaseCandidateBinding} from './verify-release-candidate-binding.mjs';

test('exact clean candidate accepts; tracked and untracked packaged changes refuse', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-release-binding-'));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
  const files={'package.json':'{}','package-lock.json':'{}','tsconfig.json':'{}','src/main.mjs':'export default 1;','scripts/rcap-render-worker.mjs':'export default 1;','scripts/lib/runtime.mjs':'export default 1;','data/runtime/input.json':'{}','deploy/rcap-render-worker/Dockerfile':'FROM node:22\nCOPY scripts/lib/ scripts/lib/\nCOPY src/ src/\nCOPY data/runtime/ data/runtime/\n',
    // The build-context allowlist decides what those COPY lines can actually
    // see, so it is a fixed worker input like the Dockerfile beside it. The
    // fixture has to carry one: when it became a canonical input and this
    // synthetic repository did not gain it, the clean candidate stopped being
    // accepted here for a reason that says nothing about the real repository.
    'deploy/rcap-render-worker/Dockerfile.dockerignore':'*\n!scripts/lib/**\n!src/**\n!data/runtime/**\n',
    // The §7 supplemental guides and the brand asset are canonical worker
    // inputs too, and a tree missing a canonical input is reported as
    // rebuild-required rather than clean. A fixture that omits them cannot
    // demonstrate the clean-candidate case it exists to demonstrate.
    'data/record-clearing/supplemental-guides/synthetic.json':'{}',
    'data/record-clearing/brand/legalease-logo.png':'synthetic-brand-bytes'};
  git('init','--quiet');git('config','user.name','Synthetic Test');git('config','user.email','synthetic@example.test');
  for(const [p,s]of Object.entries(files))write(p,s);
  git('add','--',...Object.keys(files));git('commit','--quiet','-m','synthetic worker source');const source=git('rev-parse','HEAD');
  const digest='sha256:'+'a'.repeat(64);const publication='data/rcap-render/worker-publication-evidence.json';
  const publicationRecord={sourceSha:source,immutableRegistryDigest:digest,workflowConclusion:'success',runtimeAccepted:true,
    imageAcceptance:{conclusion:'success',digest,tag:source,runId:123,readOnly:true}};
  write(publication,JSON.stringify(publicationRecord));
  git('add','--',publication);git('commit','--quiet','-m','synthetic candidate');
  const candidate={applicationSha:git('rev-parse','HEAD'),workerSourceSha:source,workerDigest:digest,readOnlyImageAcceptance:{runId:123}};
  assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
  write(publication,JSON.stringify({...publicationRecord,imageAcceptance:null}));
  assert.equal(verifyReleaseCandidateBinding(root,candidate).current,false,'publication without accepted image must refuse');
  write(publication,JSON.stringify(publicationRecord));
  for(const p of ['scripts/lib/untracked.mjs','data/runtime/untracked.json','public/untracked.js']){
    write(p,'new input');const r=verifyReleaseCandidateBinding(root,candidate);assert.equal(r.current,false);assert(r.reasons.some(s=>s.includes(p)));fs.unlinkSync(path.join(root,p));
  }
  write('src/main.mjs','export default 2;');assert.equal(verifyReleaseCandidateBinding(root,candidate).current,false);
  write('src/main.mjs',files['src/main.mjs']);assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
  assert.equal(verifyReleaseCandidateBinding(root,{...candidate,workerDigest:'sha256:'+'b'.repeat(64)}).current,false);
  assert.equal(verifyReleaseCandidateBinding(root,null).status,'NOT_FROZEN');
  assert.equal(verifyReleaseCandidateBinding(root,{applicationSha:'invalid'}).status,'INVALID_APPLICATION_INPUTS');
});

test('Production Legal Aid proof successor has exactly fourteen paths, preserves earlier authority and refuses other parents or merges',async()=>{
 const vm=await import('node:vm');const base='80e014d35c6af4dcfd57957013781483bb4ffb52';
 const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`36f1e3f716aca14ba874cfdb3082edf1c8279ffa:${toolsPath}`],{encoding:'utf8'}));const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(productionLegalAidProofCorrection){'),source.indexOf('  }else if(relationshipsCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PRODUCTION_LEGAL_AID_PROOF_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,14);
 const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){
  const b=structuredClone(binding);mutate(b);
  vm.runInNewContext(scope+'\n'+ancestry,{binding:b,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,productionLegalAidProofCorrection:b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha,PRODUCTION_LEGAL_AID_PROOF_BASE:base,PRODUCTION_LEGAL_AID_PROOF_FILES:files,commitBase:base,
   expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>({show:JSON.stringify(prior),diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});
 }
 run();
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha='0'.repeat(40)}),/exact Production Legal Aid proof correction base/);
 for(const delta of [files.slice(1),[...files,'src/unrelated.ts']])assert.throws(()=>run({delta}),/exact Production Legal Aid proof correction paths/);
 for(const rel of ['scripts/rcap-hosted-legal-aid-browser.mjs','scripts/rcap-production-worker-readiness.mjs'])assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 for(const key of ['preactivationLegalAidRelationshipsCorrectionBaseSha','preactivationLegalAidHarnessSuccessorBaseSha'])assert.throws(()=>run({mutate:b=>delete b.successorTools[key]}),/only bounded Production Legal Aid proof correction/);
 for(const key of ['applicationSha','workerInputFingerprint','workerRebuildRequired'])assert.throws(()=>run({mutate:b=>b[key]='wrong'}),/only bounded Production Legal Aid proof correction/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
});

test('restage successor preserves exact twelve-path delta, all earlier hashes, old staged ID and one parent',async()=>{
 const vm=await import('node:vm'),base='36f1e3f716aca14ba874cfdb3082edf1c8279ffa',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(fs.readFileSync(toolsPath)),candidate=JSON.parse(fs.readFileSync(candidatePath));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(restageCorrection){'),source.indexOf('  }else if(productionLegalAidProofCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PRODUCTION_RESTAGE_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,12);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,restageCorrection:b.successorTools.preactivationProductionRestageBaseSha,PRODUCTION_RESTAGE_BASE:base,PRODUCTION_RESTAGE_FILES:files,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();for(const delta of [files.slice(1),[...files,'src/extra.ts']])assert.throws(()=>run({delta}),/exact Production restage paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationProductionRestageBaseSha='0'.repeat(40)}),/exact Production restage base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='dpl_Invented'}),/only owner restage authorization added/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/only owner restage authorization added/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-legal-aid-migrate.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha}),/only bounded Production restage correction/);
});
