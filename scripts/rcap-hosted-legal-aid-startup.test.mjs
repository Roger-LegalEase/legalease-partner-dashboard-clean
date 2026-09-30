import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';

const require=createRequire(import.meta.url);
const steps=parse(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8')).jobs.preflight.steps;
test('hosted_legal_aid_browser installs frozen dependencies before verification and reuses the accepted Preview',()=>{
 const setup=steps.findIndex(s=>s.uses==='actions/setup-node@v4');
 const install=steps.findIndex(s=>s.run?.trim()==='npm ci');
 const verify=steps.findIndex(s=>s.id==='verify_legal_aid_browser');
 const browser=steps.findIndex(s=>s.id==='legal_aid_browser');
 assert.equal(steps[setup].with['node-version'],22);
 assert.ok(setup<install&&install<verify&&verify<browser);
 assert.equal(steps[install].if,undefined);
 assert.match(steps.find(s=>s.id==='contract').run,/legal_aid_browser\) DEPLOY=false;.*LEGAL_AID=true/);
 assert.match(steps[browser].if,/legal_aid_seed.outcome == 'success'/);
 assert.match(steps[browser].run,/node scripts\/rcap-hosted-legal-aid-browser.mjs/);
});
test('clean module graph with lockfile dependencies starts the real harness and stops before its first service call',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'legal-aid-clean-startup-'));
 try{
  const copied=new Set();
  function copyGraph(file){
   if(copied.has(file))return;copied.add(file);
   const source=fs.readFileSync(file,'utf8'),target=path.join(root,file);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);
   for(const [,relative]of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    const dependency=path.normalize(path.join(path.dirname(file),relative));
    if(dependency.endsWith('.mjs'))copyGraph(dependency);
   }
  }
  const entry='scripts/rcap-hosted-legal-aid-browser.mjs';copyGraph(entry);
  const boundary=path.join(root,'boundary.json'),evidence=path.join(root,'evidence');
  const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
  const code=`import fs from 'node:fs';globalThis.fetch=async(url,options={})=>{fs.writeFileSync(${JSON.stringify(boundary)},JSON.stringify({url:String(url),method:options.method??'GET',hasBody:options.body!==undefined}));throw Error('LOCAL_STOP_BEFORE_SERVICE');};await import(${JSON.stringify(pathToFileURL(path.join(root,entry)).href)});`;
  const env={PATH:process.env.PATH,...(process.env.NODE_OPTIONS?{NODE_OPTIONS:process.env.NODE_OPTIONS}:{}),
   HOSTED_APPLICATION_SHA:candidate.applicationSha,ACCEPTANCE_SUPABASE_PROJECT_REF:candidate.acceptanceProjectRef,
   HOSTED_PREVIEW_DEPLOYMENT_ID:candidate.hostedAcceptance.preview.deploymentId,HOSTED_PREVIEW_HOSTNAME:candidate.hostedAcceptance.preview.hostname,
   HOSTED_ACCEPTANCE_EVIDENCE_DIR:evidence,VERCEL_TOKEN:'local-placeholder',SUPABASE_ACCESS_TOKEN:'local-placeholder',
   VERCEL_AUTOMATION_BYPASS_SECRET:'local-placeholder',HOSTED_CLINIC_DEMO_PASSWORD:'local-placeholder-long-password'};
  function run(){
   const log=path.join(root,'startup.log'),fd=fs.openSync(log,'w');
   let result;try{result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
   assert.ifError(result.error);return {...result,output:fs.readFileSync(log,'utf8')};
  }
  const missing=run();assert.notEqual(missing.status,0);assert.match(missing.output,/ERR_MODULE_NOT_FOUND/);assert.equal(fs.existsSync(boundary),false);
  // Materialize only already-installed, exact lockfile packages; no install/network.
  fs.mkdirSync(path.join(root,'node_modules'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json'));
  for(const name of ['playwright','playwright-core','typescript','yaml']){
   const packagePath=require.resolve(name+'/package.json');
   assert.equal(JSON.parse(fs.readFileSync(packagePath)).version,lock.packages['node_modules/'+name].version,name);
   fs.symlinkSync(path.dirname(packagePath),path.join(root,'node_modules',name),'dir');
  }
  const result=run();assert.equal(result.status,1,result.output);
  assert.equal(fs.existsSync(boundary),true,result.output);
  const observed=JSON.parse(fs.readFileSync(boundary));
  assert.equal(observed.method,'GET');assert.equal(observed.hasBody,false);
  assert.equal(new URL(observed.url).origin,'https://api.vercel.com');
  const record=JSON.parse(fs.readFileSync(path.join(evidence,'legal-aid/browser.json')));
  assert.equal(record.passed,false);assert.equal(record.failure.message,'Vercel identity read failed or timed out');
  for(const flag of ['productionTouched','stripeTouched','workerRun','migrationApplied','checkoutCreated','paymentCompleted'])assert.equal(record[flag],false,flag);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
