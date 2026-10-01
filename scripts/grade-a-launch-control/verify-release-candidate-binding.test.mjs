import {PUBLIC_VERIFICATION_CLOSURE_BASE,PUBLIC_VERIFICATION_CLOSED_STATUS,PUBLIC_VERIFICATION_CLOSED_SCOPE,BOUND_PUBLIC_VERIFICATION} from './production-preflight-authorization.mjs';
import {verifyProductionPublicVerificationEvidence} from './verify-production-preflight-evidence.mjs';
import {PUBLIC_VERIFICATION_BASE,PUBLIC_VERIFICATION_STATUS,PUBLIC_VERIFICATION_SCOPE,assertPublicVerificationAuthorization} from './production-preflight-authorization.mjs';
import {ACTIVATION_CLOSURE_BASE,ACTIVATION_CLOSED_STATUS,ACTIVATION_CLOSED_SCOPE,BOUND_ACTIVATION} from './production-preflight-authorization.mjs';
import {verifyProductionActivationEvidence} from './verify-production-preflight-evidence.mjs';
import {ACTIVATION_BASE,ACTIVATION_STATUS,ACTIVATION_SCOPE,assertActivationAuthorization} from './production-preflight-authorization.mjs';
import {BOUND_RESTAGE,BOUND_SMOKE,STAGED_DEPLOYMENT,PREACTIVATION_NOTE} from './production-preflight-authorization.mjs';
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
 const binding=JSON.parse(execFileSync('git',['show','0eb8fbd6032f3f2d906f32e50c79e9fb6a2c76f8:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','38051f337879cfecbcafb89c2f3816c2c4a6c456:'+candidatePath],{encoding:'utf8'}));
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

test('restage transport successor preserves six paths, authority, earlier hashes and sole parent',async()=>{
 const vm=await import('node:vm'),base='0eb8fbd6032f3f2d906f32e50c79e9fb6a2c76f8',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show','8d77414e30b7fe26084e7ab525ad8d81d82ae692:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','38051f337879cfecbcafb89c2f3816c2c4a6c456:'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(restageTransportCorrection){'),source.indexOf('  }else if(restageCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const RESTAGE_TRANSPORT_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,6);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,restageTransportCorrection:b.successorTools.preactivationRestageTransportBaseSha,RESTAGE_TRANSPORT_BASE:base,RESTAGE_TRANSPORT_FILES:files,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();for(const delta of [files.slice(1),[...files,'src/extra.ts']])assert.throws(()=>run({delta}),/exact restage transport paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationRestageTransportBaseSha='0'.repeat(40)}),/exact restage transport base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='dpl_Invented'}),/release authority unchanged/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/release authority unchanged/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-legal-aid-migrate.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha}),/only bounded restage transport correction/);
});

test('restage routing successor preserves declared paths, authority, earlier hashes and sole parent',async()=>{
 const vm=await import('node:vm'),base='8d77414e30b7fe26084e7ab525ad8d81d82ae692',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show','38051f337879cfecbcafb89c2f3816c2c4a6c456:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','38051f337879cfecbcafb89c2f3816c2c4a6c456:'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(restageRoutingCorrection){'),source.indexOf('  }else if(restageTransportCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const RESTAGE_ROUTING_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,7);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,restageRoutingCorrection:b.successorTools.preactivationRestageRoutingBaseSha,RESTAGE_ROUTING_BASE:base,RESTAGE_ROUTING_FILES:files,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();for(const delta of [files.slice(1),[...files,'src/extra.ts']])assert.throws(()=>run({delta}),/exact restage routing paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationRestageRoutingBaseSha='0'.repeat(40)}),/exact restage routing base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='dpl_Invented'}),/release authority unchanged/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/release authority unchanged/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-legal-aid-migrate.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha}),/only bounded restage routing correction/);
});

test('successful restage binding preserves exact paths, frozen authority, earlier hashes and sole parent',async()=>{
 const vm=await import('node:vm'),base='38051f337879cfecbcafb89c2f3816c2c4a6c456',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show','d087977b9de5ad7f6a49c0dd3abab59225e2b1f4:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','d087977b9de5ad7f6a49c0dd3abab59225e2b1f4:'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(restageBinding){'),source.indexOf('  }else if(restageRoutingCorrection){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const RESTAGE_BINDING_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,11);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,restageBinding:b.successorTools.preactivationRestageBindingBaseSha,RESTAGE_BINDING_BASE:base,RESTAGE_BINDING_FILES:files,commitBase:base,BOUND_RESTAGE,STAGED_DEPLOYMENT,PREACTIVATION_NOTE,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const key of Object.keys(BOUND_RESTAGE))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.restage.successfulReceipt[key]='wrong'}),/only proven replacement and successful receipt bound/);
 assert.throws(()=>run({mutate:(_b,c)=>delete c.productionAuthorization.restage.successfulReceipt}),/only proven replacement and successful receipt bound/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.stagedDeploymentId=c.productionAuthorization.restage.oldStagedDeploymentId}),/only proven replacement and successful receipt bound/);
 for(const delta of [files.slice(1),[...files,'src/extra.ts']])assert.throws(()=>run({delta}),/exact successful restage binding paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationRestageBindingBaseSha='0'.repeat(40)}),/exact successful restage binding base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='dpl_Invented'}),/only proven replacement and successful receipt bound/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/only proven replacement and successful receipt bound/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-legal-aid-migrate.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationProductionLegalAidProofCorrectionBaseSha}),/only bounded successful restage binding/);
});

test('complete release verifier accepts exact smoke evidence with unchanged authority and restage binding and refuses every receipt substitution',()=>{
 const root=process.cwd(),candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const valid=verifyReleaseCandidateBinding(root,candidate);assert.equal(valid.current,true,JSON.stringify(valid));assert.equal(valid.status,'CURRENT');
 const mutations=[
  ['smoke run ID',c=>c.productionAuthorization.smokeRunId++],
  ['smoke inner SHA',c=>c.productionAuthorization.smokeArtifactSha256='0'.repeat(64)],
  ['missing smoke receipt',c=>delete c.productionAuthorization.smokeReceipt],
  ['activation phase',c=>c.productionAuthorization.phases.push('activate')],
  ['old staged ID',c=>c.productionAuthorization.stagedDeploymentId=c.productionAuthorization.restage.oldStagedDeploymentId],
  ['arbitrary staged ID',c=>c.productionAuthorization.stagedDeploymentId='dpl_arbitrary'],
  ['missing receipt',c=>delete c.productionAuthorization.restage.successfulReceipt],
  ...Object.keys(BOUND_RESTAGE).map(k=>[k,c=>c.productionAuthorization.restage.successfulReceipt[k]=k==='conclusion'?'failure':'wrong']),
 ];
 for(const [name,mutate]of mutations){const c=structuredClone(candidate);mutate(c);const result=verifyReleaseCandidateBinding(root,c);assert.equal(result.current,false,name);assert.ok(result.reasons.some(r=>r.includes('packet canary Flyctl pin preserves all authorization and closure bytes')),`${name}: ${JSON.stringify(result)}`);}
});


test('smoke reset successor binds exactly eight paths and preserves authority, history and sole parent',async()=>{
 const vm=await import('node:vm'),base='d087977b9de5ad7f6a49c0dd3abab59225e2b1f4',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show','eb5099862b664d82449ee20e90798fe9fc275a26:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','eb5099862b664d82449ee20e90798fe9fc275a26:'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(smokeReset){'),source.indexOf('  }else if(restageBinding){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const SMOKE_RESET_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,8);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,smokeReset:b.successorTools.preactivationSmokeResetBaseSha,SMOKE_RESET_BASE:base,SMOKE_RESET_FILES:files,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,candidatePath]])assert.throws(()=>run({delta}),/exact smoke reset paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationSmokeResetBaseSha='0'.repeat(40)}),/exact smoke reset base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='dpl_Invented'}),/preserves release authority/);
 assert.throws(()=>run({mutate:(_b,c)=>delete c.productionAuthorization.restage.successfulReceipt}),/preserves release authority/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/preserves release authority/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-canary.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationRestageBindingBaseSha}),/only bounded smoke reset correction/);
});


test('smoke evidence successor binds eleven paths, immutable receipt, preserved authority and sole parent',async()=>{
 const vm=await import('node:vm'),base='eb5099862b664d82449ee20e90798fe9fc275a26',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',ACTIVATION_BASE+':'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show',ACTIVATION_BASE+':'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(smokeEvidence){'),source.indexOf('  }else if(smokeReset){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const SMOKE_EVIDENCE_BINDING_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,11);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,smokeEvidence:b.successorTools.preactivationSmokeEvidenceBaseSha,SMOKE_EVIDENCE_BASE:base,SMOKE_EVIDENCE_BINDING_FILES:files,commitBase:base,BOUND_SMOKE,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'scripts/rcap-production-activate.mjs']])assert.throws(()=>run({delta}),/exact smoke evidence binding paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.preactivationSmokeEvidenceBaseSha='0'.repeat(40)}),/exact smoke evidence base/);
 for(const key of ['stagedDeploymentId','rollbackDeploymentId','smokeRunId','smokeArtifactSha256'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='wrong'}),/only exact successful smoke evidence added/);
 for(const key of Object.keys(BOUND_SMOKE))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.smokeReceipt[key]='wrong'}),/only exact successful smoke evidence added/);
 assert.throws(()=>run({mutate:(_b,c)=>delete c.productionAuthorization.restage.successfulReceipt}),/only exact successful smoke evidence added/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.phases.push('activate')}),/no activation authority/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activationReceipt={passed:true}}),/no activation authority/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-canary-smoke.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationSmokeResetBaseSha}),/only bounded smoke evidence binding/);
});

test('activation successor binds seven paths, one parent, exact decision and preserved evidence/hashes',async()=>{
 const vm=await import('node:vm'),base=ACTIVATION_BASE,toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show','ff85fd0d8ea131a9885885ebde308611bda9c152:'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show','ff85fd0d8ea131a9885885ebde308611bda9c152:'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(activationAuthorization){'),source.indexOf('  }else if(smokeEvidence){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const ACTIVATION_AUTHORIZATION_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,7);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,correction:undefined,activationAuthorization:b.successorTools.activationAuthorizationBaseSha,ACTIVATION_BASE:base,ACTIVATION_AUTHORIZATION_FILES:files,ACTIVATION_STATUS,ACTIVATION_SCOPE,assertActivationAuthorization,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?(args[1]==='-s'?String(Date.parse('2026-09-30T21:47:50Z')/1000):JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior)):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'scripts/rcap-production-activate.mjs']])assert.throws(()=>run({delta}),/exact activation authorization paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.activationAuthorizationBaseSha='0'.repeat(40)}),/exact activation authorization base/);
 for(const key of Object.keys(candidate.productionAuthorization.activation))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activation[key]='wrong'}));
 for(const key of ['smokeReceipt','restage','phases'])assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization[key]='wrong'}),/prior evidence and authority preserved/);
 assert.throws(()=>run({mutate:b=>b.deploymentAuthorized=true}),/only bounded activation authorization tools/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/rcap-production-canary-smoke.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.preactivationSmokeEvidenceBaseSha}),/only bounded activation authorization tools/);
});

test('artifact isolation successor preserves authority, prior hashes, exact scope and sole parent',async()=>{
 const vm=await import('node:vm'),base='ff85fd0d8ea131a9885885ebde308611bda9c152',toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',ACTIVATION_CLOSURE_BASE+':'+toolsPath],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show',ACTIVATION_CLOSURE_BASE+':'+candidatePath],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(artifactIsolation){'),source.indexOf('  }else if(activationAuthorization){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const ACTIVATION_ARTIFACT_ISOLATION_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,8);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,artifactIsolation:b.successorTools.activationArtifactIsolationBaseSha,ACTIVATION_ARTIFACT_ISOLATION_BASE:base,ACTIVATION_ARTIFACT_ISOLATION_FILES:files,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'prior-production-smoke-evidence/production-canary-smoke.json']])assert.throws(()=>run({delta}),/exact activation artifact isolation paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.activationArtifactIsolationBaseSha='0'.repeat(40)}),/exact activation artifact isolation base/);
 for(const key of Object.keys(candidate.productionAuthorization.activation))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activation[key]='wrong'}),/preserves exact authorization and evidence/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activationReceipt={passed:true}}),/preserves exact authorization and evidence/);
 assert.throws(()=>run({mutate:b=>b.successorTools.activationAuthorizationBaseSha=base}),/only bounded activation artifact isolation tools/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/grade-a-launch-control/production-preflight-authorization.mjs']='0'.repeat(64)}),/preserved tools/);
});


test('activation closure binds exactly twelve paths, preserves the decision/history, and admits only one successor parent',async()=>{
 const vm=await import('node:vm'),base=ACTIVATION_CLOSURE_BASE,toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`${PUBLIC_VERIFICATION_BASE}:${toolsPath}`],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show',`${PUBLIC_VERIFICATION_BASE}:${candidatePath}`],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(activationClosure){'),source.indexOf('  }else if(artifactIsolation){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const ACTIVATION_CLOSURE_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,12);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,activationClosure:b.successorTools.activationClosureBaseSha,ACTIVATION_CLOSURE_BASE:base,ACTIVATION_CLOSURE_FILES:files,ACTIVATION_CLOSED_STATUS,ACTIVATION_CLOSED_SCOPE,BOUND_ACTIVATION,assertActivationAuthorization,verifyProductionActivationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'scripts/rcap-production-activate.mjs'],[...files,'scripts/rcap-production-public-verify.mjs'],[...files,'.github/workflows/rcap-production-canary.yml']])assert.throws(()=>run({delta}),/exact activation closure paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.activationClosureBaseSha='0'.repeat(40)}),/exact activation closure base/);
 for(const key of Object.keys(priorCandidate.productionAuthorization.activation))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activation[key]='wrong'}),/exact activation closure preserves original decision/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/verify-rcap-production-activation.mjs']='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.activationAuthorizationBaseSha}),/only bounded activation closure tools/);
});

test('complete release verifier accepts consumed activation and rejects receipt substitution or new authority',()=>{
 const root=process.cwd(),candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const valid=verifyReleaseCandidateBinding(root,candidate);assert.equal(valid.current,true,JSON.stringify(valid));assert.equal(valid.status,'CURRENT');
 assert.equal(valid.releaseStatus,PUBLIC_VERIFICATION_CLOSED_STATUS);assert.ok(!valid.productionPhases.includes('public_verify'));assert.ok(!valid.productionPhases.includes('activate'));
 const mutations=[
  ...Object.keys(BOUND_ACTIVATION).map(k=>[`activation receipt ${k}`,c=>c.productionAuthorization.activation.activationReceipt[k]='wrong']),
  ['missing activation receipt',c=>delete c.productionAuthorization.activation.activationReceipt],
  ['unconsumed decision',c=>c.productionAuthorization.activation.state='authorized_not_executed'],
  ['second activation',c=>c.productionAuthorization.activation.maxAttempts=2],
  ...['activate','public_verify','save_transition_reproduce','save_transition_verify','live_zero_dollar_order'].flatMap(p=>[
   [`phase ${p}`,c=>c.productionAuthorization.phases.push(p)],
   [`permission ${p}`,c=>c.productionAuthorization.activation.permittedActions.push(p)],
  ]),
 ];
 for(const [name,mutate]of mutations){const c=structuredClone(candidate);mutate(c);const result=verifyReleaseCandidateBinding(root,c);assert.equal(result.current,false,name);assert.ok(result.reasons.some(r=>r.includes('packet canary Flyctl pin preserves all authorization and closure bytes')),`${name}: ${JSON.stringify(result)}`);}
});

test('public verification successor binds exactly eight paths, preserves history/hashes and requires one parent',async()=>{
 const vm=await import('node:vm'),base=PUBLIC_VERIFICATION_BASE,toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`${PUBLIC_VERIFICATION_CLOSURE_BASE}:${toolsPath}`],{encoding:'utf8'})),candidate=JSON.parse(execFileSync('git',['show',`${PUBLIC_VERIFICATION_CLOSURE_BASE}:${candidatePath}`],{encoding:'utf8'}));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(publicVerification){'),source.indexOf('  }else if(activationClosure){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PUBLIC_VERIFICATION_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,8);const head='a'.repeat(40);
 const predecessorTime=execFileSync('git',['show','-s','--format=%ct',base],{encoding:'utf8'}).trim();
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,publicVerification:b.successorTools.publicVerificationAuthorizationAndWorkflowBaseSha,PUBLIC_VERIFICATION_BASE:base,PUBLIC_VERIFICATION_FILES:files,PUBLIC_VERIFICATION_STATUS,PUBLIC_VERIFICATION_SCOPE,assertPublicVerificationAuthorization,verifyProductionActivationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?(args.includes('--format=%ct')?predecessorTime:JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior)):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'scripts/rcap-production-public-verify.mjs'],[...files,'package-lock.json']])assert.throws(()=>run({delta}),/exact public verification authorization and workflow paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.publicVerificationAuthorizationAndWorkflowBaseSha='0'.repeat(40)}),/exact public verification successor base/);
 for(const key of Object.keys(candidate.productionAuthorization.publicVerification))assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.publicVerification[key]='wrong'}));
 for(const key of ['activationAuthorizationBaseSha','activationArtifactIsolationBaseSha','activationClosureBaseSha'])assert.throws(()=>run({mutate:b=>delete b.successorTools[key]}),/only bounded public verification/);
 assert.throws(()=>run({mutate:(_b,c)=>c.productionAuthorization.activation.recordedAt=c.productionAuthorization.publicVerification.recordedAt}),/preserves exact activation closure/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/verify-rcap-production-activation.mjs']='0'.repeat(64)}),/preserved tools/);
});

test('public verification closure binds eleven paths, immutable native evidence, original decision and sole parent',async()=>{
 const vm=await import('node:vm'),base=PUBLIC_VERIFICATION_CLOSURE_BASE,toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`acdc8e76671445f7d86e9842c103ac57961522eb:${toolsPath}`],{encoding:'utf8'})),candidate=JSON.parse(fs.readFileSync(candidatePath));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(publicVerificationClosure){'),source.indexOf('  }else if(publicVerification){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PUBLIC_VERIFICATION_CLOSURE_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,11);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,publicVerificationClosure:b.successorTools.publicVerificationClosureBaseSha,PUBLIC_VERIFICATION_CLOSURE_BASE:base,PUBLIC_VERIFICATION_CLOSURE_FILES:files,PUBLIC_VERIFICATION_CLOSED_STATUS,PUBLIC_VERIFICATION_CLOSED_SCOPE,BOUND_PUBLIC_VERIFICATION,assertPublicVerificationAuthorization,verifyProductionActivationEvidence,verifyProductionPublicVerificationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,'scripts/rcap-production-public-verify.mjs'],[...files,'.github/workflows/rcap-f1-ephemeral-staging.yml']])assert.throws(()=>run({delta}),/exact public verification closure paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.publicVerificationClosureBaseSha='0'.repeat(40)}),/exact public verification closure base/);
 const mutations=[
  ...Object.keys(BOUND_PUBLIC_VERIFICATION).map(k=>[k,c=>c.productionAuthorization.publicVerification.publicVerificationReceipt[k]='wrong']),
  ...Object.keys(priorCandidate.productionAuthorization.publicVerification).filter(k=>k!=='state').map(k=>[`original decision ${k}`,c=>c.productionAuthorization.publicVerification[k]='wrong']),
  ['missing receipt',c=>delete c.productionAuthorization.publicVerification.publicVerificationReceipt],
  ['reopened public decision',c=>c.productionAuthorization.publicVerification=priorCandidate.productionAuthorization.publicVerification],
  ['activation altered',c=>c.productionAuthorization.activation.executedAttempts=0],
  ['missing attempts',c=>delete c.productionAuthorization.publicVerification.executedAttempts],
  ['second execution',c=>c.productionAuthorization.publicVerification.executedAttempts=2],
  ...['packet_canary','packet_generation','worker_launch','save_transition_reproduce','save_transition_verify','live_zero_dollar_order','payment','checkout'].map(p=>[`new ${p} authority`,c=>c.productionAuthorization.phases.push(p)]),
  ['invented final packet closure',c=>c.finalGradeAPacketClosure=true],
 ];
 for(const [name,mutate]of mutations)assert.throws(()=>run({mutate:(_b,c)=>mutate(c)}),/exact public verification closure preserves original decision, activation and authority/,name);
 for(const key of ['activationAuthorizationBaseSha','activationArtifactIsolationBaseSha','activationClosureBaseSha','publicVerificationAuthorizationAndWorkflowBaseSha'])assert.throws(()=>run({mutate:b=>delete b.successorTools[key]}),/only bounded public verification closure tools/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/verify-rcap-production-activation.mjs']='0'.repeat(64)}),/preserved tools/);
});

test('packet canary implementation is an exact tools-only successor with no authority or candidate changes',async()=>{
 const vm=await import('node:vm'),base='acdc8e76671445f7d86e9842c103ac57961522eb';
 const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`cec5142a73246132b2f77ba7e1891f4776f8f234:${toolsPath}`],{encoding:'utf8'})),candidate=JSON.parse(fs.readFileSync(candidatePath));
 assert.deepEqual(fs.readFileSync(candidatePath),execFileSync('git',['show',`${base}:${candidatePath}`]));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(packetCanaryImplementation){'),source.indexOf('  }else if(publicVerificationClosure){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PACKET_CANARY_IMPLEMENTATION_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,10);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,packetCanaryImplementation:b.successorTools.packetCanaryImplementationBaseSha,PACKET_CANARY_IMPLEMENTATION_BASE:base,PACKET_CANARY_IMPLEMENTATION_FILES:files,assertPublicVerificationAuthorization,verifyProductionActivationEvidence,verifyProductionPublicVerificationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,candidatePath],[...files,'supabase/new.sql']])assert.throws(()=>run({delta}),/exact packet canary implementation paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.packetCanaryImplementationBaseSha='0'.repeat(40)}),/exact packet canary implementation base/);
 for(const key of Object.keys(prior.successorTools).filter(k=>k.endsWith('BaseSha')))assert.throws(()=>run({mutate:b=>delete b.successorTools[key]}),/only bounded packet canary implementation tools/);
 for(const mutate of [c=>c.productionAuthorization.packetCanary={authorized:true},c=>c.packetCanaryReceipt={},c=>c.productionAuthorization.phases.push('packet_canary'),c=>c.productionAuthorization.publicVerification.state='authorized_not_executed',c=>c.productionAuthorization.activation.state='authorized_not_executed',c=>c.workerDigest='wrong',c=>c.scope='packet path proven'])assert.throws(()=>run({mutate:(_b,c)=>mutate(c)}),/preserves all authorization and closure bytes/);
 assert.throws(()=>run({mutate:b=>b.successorTools.files['scripts/verify-rcap-production-activation.mjs']='0'.repeat(64)}),/preserved tools/);
});

test('packet canary test boundary correction preserves exact scope, lineage, bytes and refusal',async()=>{
 const vm=await import('node:vm'),base='cec5142a73246132b2f77ba7e1891f4776f8f234';
 const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(execFileSync('git',['show',`c2f217f243f18b50c04ce1d61f8f150bf77c3023:${toolsPath}`],{encoding:'utf8'})),candidate=JSON.parse(fs.readFileSync(candidatePath));
 assert.deepEqual(fs.readFileSync(candidatePath),execFileSync('git',['show',`${base}:${candidatePath}`]));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(packetCanaryTestBoundaryCorrection||binding.toolsSha===PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE){'),source.indexOf('  }else if(packetCanaryImplementation){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,4);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,packetCanaryTestBoundaryCorrection:b.successorTools.packetCanaryTestBoundaryCorrectionBaseSha,PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE:base,PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES:files,assertPublicVerificationAuthorization,verifyProductionActivationEvidence,verifyProductionPublicVerificationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,candidatePath],[...files,'supabase/new.sql'],[...files,'.github/workflows/rcap-f1-ephemeral-staging.yml'],[...files,'scripts/rcap-production-packet-canary-contract.mjs'],[...files,'scripts/rcap-production-save-transition-probe.mjs']])assert.throws(()=>run({delta}),/exact packet canary test boundary correction paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.packetCanaryTestBoundaryCorrectionBaseSha='0'.repeat(40)}),/exact packet canary test boundary correction base/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.packetCanaryTestBoundaryCorrectionBaseSha}),/exact packet canary test boundary correction base/);
 for(const key of Object.keys(prior.successorTools).filter(k=>k.endsWith('BaseSha')))for(const mutate of [b=>delete b.successorTools[key],b=>b.successorTools[key]='0'.repeat(40)])assert.throws(()=>run({mutate}),/only bounded packet canary test boundary correction tools/);
 for(const mutate of [c=>c.productionAuthorization.packetCanary={authorized:true},c=>c.packetCanaryReceipt={},c=>c.productionAuthorization.phases.push('packet_canary'),c=>c.productionAuthorization.publicVerification.state='authorized_not_executed',c=>c.productionAuthorization.activation.state='authorized_not_executed',c=>c.workerDigest='wrong',c=>c.scope='packet path proven'])assert.throws(()=>run({mutate:(_b,c)=>mutate(c)}),/preserves all authorization and closure bytes/);
 for(const rel of Object.keys(prior.successorTools.files).filter(rel=>!files.includes(rel)))assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>b.deploymentAuthorized=true}),/only bounded packet canary test boundary correction tools/);
});

test('packet canary Flyctl pin preserves exact scope, lineage, bytes and refusal',async()=>{
 const vm=await import('node:vm'),base='c2f217f243f18b50c04ce1d61f8f150bf77c3023';
 const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
 const prior=JSON.parse(execFileSync('git',['show',`${base}:${toolsPath}`],{encoding:'utf8'}));
 const priorCandidate=JSON.parse(execFileSync('git',['show',`${base}:${candidatePath}`],{encoding:'utf8'}));
 const binding=JSON.parse(fs.readFileSync(toolsPath)),candidate=JSON.parse(fs.readFileSync(candidatePath));
 assert.deepEqual(fs.readFileSync(candidatePath),execFileSync('git',['show',`${base}:${candidatePath}`]));
 const source=fs.readFileSync('scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','utf8');
 const scope=source.slice(source.indexOf('if(packetCanaryFlyctlPin||binding.toolsSha===PACKET_CANARY_FLYCTL_PIN_BASE){'),source.indexOf('  }else if(packetCanaryTestBoundaryCorrection||binding.toolsSha===PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE){'))+'\n}';
 const ancestry=source.slice(source.indexOf("  const head=git(['rev-parse','HEAD']);",source.indexOf('function verifyGenerationBinding')),source.indexOf('  expect(Object.keys(t.files).sort()',source.indexOf('function verifyGenerationBinding')));
 const files=JSON.parse(source.match(/const PACKET_CANARY_FLYCTL_PIN_FILES=(\[[\s\S]*?\]);/)[1]);assert.equal(files.length,5);const head='a'.repeat(40);
 function run({mutate=()=>{},delta=files,parents=[head,base]}={}){const b=structuredClone(binding),c=structuredClone(candidate);mutate(b,c);
 vm.runInNewContext(scope+'\n'+ancestry,{root:process.cwd(),binding:b,candidate:c,t:b.successorTools,toolsPath,preactivation:true,packetCanaryFlyctlPin:b.successorTools.packetCanaryFlyctlPinBaseSha,PACKET_CANARY_FLYCTL_PIN_BASE:base,PACKET_CANARY_FLYCTL_PIN_FILES:files,assertPublicVerificationAuthorization,verifyProductionActivationEvidence,verifyProductionPublicVerificationEvidence,commitBase:base,
 expect:(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m),git:args=>args[0]==='show'?JSON.stringify(args[1].endsWith(candidatePath)?priorCandidate:prior):({diff:delta.join('\n'),'ls-files':'','rev-parse':head,'rev-list':parents.join(' ')})[args[0]]});}
 run();
 for(const delta of [files.slice(1),[...files,'src/extra.ts'],[...files,candidatePath],[...files,'supabase/new.sql'],[...files,'scripts/rcap-production-packet-canary-contract.mjs'],[...files,'scripts/rcap-production-save-transition-probe.mjs']])assert.throws(()=>run({delta}),/exact packet canary Flyctl pin paths/);
 for(const parents of [[head,base,'b'.repeat(40)],[head,'b'.repeat(40)]])assert.throws(()=>run({parents}),/one non-merge tools successor/);
 assert.throws(()=>run({mutate:b=>b.successorTools.packetCanaryFlyctlPinBaseSha='0'.repeat(40)}),/exact packet canary Flyctl pin base/);
 assert.throws(()=>run({mutate:b=>delete b.successorTools.packetCanaryFlyctlPinBaseSha}),/exact packet canary Flyctl pin base/);
 for(const key of Object.keys(prior.successorTools).filter(k=>k.endsWith('BaseSha')))for(const mutate of [b=>delete b.successorTools[key],b=>b.successorTools[key]='0'.repeat(40)])assert.throws(()=>run({mutate}),/only bounded packet canary Flyctl pin tools/);
 for(const mutate of [c=>c.productionAuthorization.packetCanary={authorized:true},c=>c.packetCanaryReceipt={},c=>c.productionAuthorization.phases.push('packet_canary'),c=>c.productionAuthorization.publicVerification.state='authorized_not_executed',c=>c.productionAuthorization.activation.state='authorized_not_executed',c=>c.workerDigest='wrong',c=>c.scope='packet path proven'])assert.throws(()=>run({mutate:(_b,c)=>mutate(c)}),/preserves all authorization and closure bytes/);
 for(const rel of Object.keys(prior.successorTools.files).filter(rel=>!files.includes(rel)))assert.throws(()=>run({mutate:b=>b.successorTools.files[rel]='0'.repeat(64)}),/preserved tools/);
 assert.throws(()=>run({mutate:b=>b.deploymentAuthorized=true}),/only bounded packet canary Flyctl pin tools/);
});
