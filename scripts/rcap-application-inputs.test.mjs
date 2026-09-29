import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {applicationInputManifest,applicationInputEquivalence} from './rcap-application-inputs.mjs';
import {verifyApplicationCandidate} from './verify-rcap-application-candidate.mjs';

function repository(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'application-input-test-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
 write('src/app/runtime.ts',`import record from '../../data/imported.json'; import fs from 'node:fs'; import path from 'node:path';
 const AUTHORITY='data/generated/authority.json';fs.readFileSync(AUTHORITY);
 const directory=path.join(process.cwd(),'data','profiles'); fs.readFileSync(path.join(directory,name));
 const template=path.join(process.cwd(),'templates',\`\${name}.html\`);fs.readFileSync(template);`);
 write('data/imported.json',JSON.stringify({artifact:{path:'private/evidence.txt'}}));
 write('data/generated/authority.json','{"authorized":true}');write('data/profiles/a.json','{}');write('templates/a.html','template');write('private/evidence.txt','proof');
 write('data/bookkeeping.json','{}');
 const commit=()=>{git('add','src','data','templates','private');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
 return {root,git,write,commit,base:commit()};
}
test('imports, filesystem constants, dynamic directory reads and transitive artifacts are application inputs',()=>{
 const r=repository();try{
 const paths=applicationInputManifest(r.root,r.base).files.map(f=>f.path);
 for(const p of ['src/app/runtime.ts','data/imported.json','data/generated/authority.json','data/profiles/a.json','templates/a.html','private/evidence.txt'])assert(paths.includes(p),p);
 assert(!paths.includes('data/bookkeeping.json'));
 r.write('data/generated/authority.json','{"authorized":false}');const head=r.commit();
 assert.deepEqual(applicationInputEquivalence(r.root,r.base,head).changedPaths,['data/generated/authority.json']);
 }finally{fs.rmSync(r.root,{recursive:true,force:true});}
});
test('new files in a runtime directory and newly imported authority cannot bypass equivalence',()=>{
 const r=repository();try{
 r.write('data/profiles/new.json','{}');r.write('src/app/new.ts',"import next from '../../data/new.json';");r.write('data/new.json','{}');
 const result=applicationInputEquivalence(r.root,r.base,r.commit());
 assert.equal(result.equivalent,false);for(const f of ['src/app/new.ts','data/new.json','data/profiles/new.json'])assert(result.changedPaths.includes(f));
 }finally{fs.rmSync(r.root,{recursive:true,force:true});}
});
test('current candidate authority runs only from its own Git archive; stale application refuses',()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const result=verifyApplicationCandidate(process.cwd(),candidate);
 assert.equal(result.state,'COMPLETE_PACKET_PROVEN');assert.equal(result.commercialStatus,'commercially_eligible');
 assert.throws(()=>verifyApplicationCandidate(process.cwd(),{...candidate,applicationSha:candidate.workerSourceSha}),/candidate publication/);
});
test('runtime data in the accepted application cannot be omitted from the manifest',()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const files=applicationInputManifest(process.cwd(),candidate.applicationSha).files.map(f=>f.path);
 for(const file of ['data/rcap-render/worker-publication-evidence.json','data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-ledger/packet-fulfillment-records.json'])assert(files.includes(file),file);
 const old=applicationInputEquivalence(process.cwd(),candidate.workerSourceSha,candidate.applicationSha);
 assert.equal(old.equivalent,false);assert(old.changedPaths.includes('data/rcap-render/worker-publication-evidence.json'));
});

test('hosted guards install their parser before comparing application data and probe the candidate before deployment',async()=>{
 const {parse}=await import('yaml');
 for(const file of ['.github/workflows/rcap-hosted-acceptance-staging.yml','.github/workflows/rcap-f1-ephemeral-staging.yml']){
  const workflow=parse(fs.readFileSync(file,'utf8'));
  const jobs=Object.values(workflow.jobs).filter(job=>job.steps?.some(step=>step.run?.includes('node scripts/rcap-application-inputs.mjs')));
  assert(jobs.length>0,file);
  for(const job of jobs){
   const guard=job.steps.findIndex(s=>s.run?.includes('node scripts/rcap-application-inputs.mjs'));
   assert(job.steps.slice(0,guard).some(s=>s.run==='npm ci'),file+' dependencies before parser');
   const code=job.steps[guard].run;
   assert(code.includes('--base "${{ inputs.application_sha }}" --head "${{ inputs.tools_sha }}"'));
   assert(code.includes('node scripts/verify-rcap-application-candidate.mjs --application "${{ inputs.application_sha }}"'));
  }
 }
});
