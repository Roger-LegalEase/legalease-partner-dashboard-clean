import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collectReadinessInventory,KEY_NAMES} from './rcap-production-readiness-inventory.mjs';
const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
function transport(){
 const calls=[];const project={id:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',name:'legalease-partner-dashboard-clean',accountId:'team_4qLmZK9WI6xIy5vjYC0IF3ae'};
 return {calls,fetchImpl:async(url,options={})=>{
  calls.push(url);assert.equal(options.method??'GET','GET');assert.equal(options.redirect,'error');
  const u=new URL(url);let body;
  if(u.origin==='https://api.machines.dev'){
   assert.equal(u.pathname,'/v1/apps/legalease-rcap-render-worker/machines');
   body=[{id:'machine',state:'started',config:{env:{SECRET:'DO_NOT_RETAIN',RCAP_WORKER_CONTAINER_DIGEST:candidate.workerDigest,ENABLE_SUPABASE_PARTNER_DATA:'true'},restart:{policy:'always'},guest:{memory_mb:1024},services:[]},image_ref:{digest:candidate.workerDigest,labels:{'org.opencontainers.image.revision':candidate.workerSourceSha,private:'DO_NOT_RETAIN'}}}];
  }else{
   assert.equal(u.origin,'https://api.vercel.com');assert.equal(u.searchParams.get('teamId'),project.accountId);
   if(u.pathname.endsWith('/env')){assert.equal(u.searchParams.get('decrypt'),'false');body={envs:KEY_NAMES.map(key=>({key,id:key,type:key.endsWith('_VERSION')?'plain':'sensitive',target:['production'],value:'DO_NOT_RETAIN'}))};}
   else if(u.pathname.endsWith('/domains'))body={domains:[{name:'example.test'}]};
   else if(u.pathname.startsWith('/v13/deployments/'))body={id:u.pathname.endsWith('example.test')?candidate.productionAuthorization.rollbackDeploymentId:u.pathname.split('/').at(-1),projectId:project.id,target:'production',readyState:'READY',url:'example.test',meta:{rcapApplicationSha:candidate.applicationSha,private:'DO_NOT_RETAIN'}};
   else body=project;
  }
  return{ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)};
 }};
}
test('inventory makes GET-only calls and retains only names and identity fields',async()=>{
 const t=transport();const result=await collectReadinessInventory({candidate,vercelToken:'test-vercel',flyToken:'test-fly',...t,readSecretNames:async()=>['SUPABASE_URL']});
 assert.ok(t.calls.length>=6);assert.equal(result.readOnly,true);assert.equal(result.secretValuesIncluded,false);
 const bytes=JSON.stringify(result);for(const marker of ['DO_NOT_RETAIN','test-vercel','test-fly'])assert.ok(!bytes.includes(marker));
 assert.deepEqual(result.worker.secretNames,['SUPABASE_URL']);assert.equal(result.worker.machines[0].acceptedDigest,candidate.workerDigest);
 assert.equal(result.publicDomains[0].deploymentId,candidate.productionAuthorization.rollbackDeploymentId);
});
test('wrong or widened release authority refuses before service access',async()=>{
 for(const alter of [c=>c.productionAuthorized=false,c=>c.productionAuthorization.phases.push('activate'),c=>c.workerDigest='wrong']){
  const c=structuredClone(candidate);alter(c);const t=transport();
  await assert.rejects(collectReadinessInventory({candidate:c,vercelToken:'test',flyToken:'test',...t,readSecretNames:async()=>[]}));assert.equal(t.calls.length,0);
 }
});
test('missing GitHub-held token refuses before service access',async()=>{
 const t=transport();await assert.rejects(collectReadinessInventory({candidate,...t,readSecretNames:async()=>[]}));assert.equal(t.calls.length,0);
});
test('single existing read-only key job collects inventories; create job cannot invoke inventory',()=>{
 const s=fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8');
 assert.match(s,/Read the remaining Fly and Vercel readiness identities\n\s+if: inputs.mode == 'production_legal_aid_keys_read'/);
 assert.match(s,/run: node scripts\/rcap-production-readiness-inventory.mjs/);
 const control=fs.readFileSync('scripts/rcap-production-readiness-inventory.mjs','utf8');
 assert.match(control,/'flyctl',\['secrets','list','--app',APP,'--json'\]/);
 assert.ok(!/method:'(?:POST|PUT|PATCH|DELETE)'/.test(control));
});
