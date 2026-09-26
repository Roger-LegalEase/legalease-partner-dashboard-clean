import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { register } from 'node:module';
import {execFileSync} from 'node:child_process';
import { clinicWorkerContext, clinicWorkerDockerArgs } from './rcap-clinic-worker-context.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { currentSponsoredChannelAllowed } = await import('../src/lib/rcap/fulfillment/sponsored-channel-authority.ts');
const { resolveDeploymentEnvironment } = await import('../src/lib/server-runtime-environment.ts');
const read = p => JSON.parse(fs.readFileSync(p));
const authority = { candidate: read('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'),
  binding: read('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'),
  grant: read('data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json') };
const {grant,binding,candidate}=authority;
const preview={previewVerified:true,stripeConfigured:false,productionAliasCount:0,
  applicationSha:candidate.applicationSha,workerSourceSha:candidate.workerSourceSha,workerDigest:candidate.workerDigest,
  deploymentId:binding.deploymentScope.existingDeploymentId,hostname:binding.deploymentScope.existingHostname,
  acceptanceProjectRef:grant.acceptanceProjectRef,clinicDemoMode:grant.channel,routeState:grant.routeState,
  stagingScopeSha256:grant.participantScopeSha256};
const input={preview,participantUserId:grant.participantUserIds[0],partnerSlug:grant.partnerSlug,eventId:grant.eventId,eventName:grant.eventName};
const canonical=read('data/rcap-grade-a/fulfillment-authority-registry.json').records.find(r=>r.routeId===grant.routeId&&!r.supersededBy);
const context={participantUserId:input.participantUserId,partnerSlug:grant.partnerSlug,eventId:grant.eventId,eventName:grant.eventName,registeredSpecificationSha256:grant.packetSpecificationSha256};
const allowed=ctx=>currentSponsoredChannelAllowed(canonical,grant.trackId,'packet credit consumption',ctx??context);
const runtime=clinicWorkerContext(input,authority);

test('actual worker authority reproduces missing context refusal and accepts transported Preview context',()=>{
  const saved={...process.env};
  try {
    for(const k of Object.keys(runtime))delete process.env[k];
    process.env.NODE_ENV='production';process.env.NEXT_PUBLIC_SUPABASE_URL=`https://${grant.acceptanceProjectRef}.supabase.co`;
    assert.equal(resolveDeploymentEnvironment(),'production');assert.equal(allowed(),false);
    Object.assign(process.env,runtime);
    assert.equal(resolveDeploymentEnvironment(),'preview');assert.equal(allowed(),true);
    for(const k of Object.keys(runtime)) {
      process.env[k]='wrong';assert.equal(allowed(),false,k);process.env[k]=runtime[k];
      delete process.env[k];
      // Either Vercel classifier alone is supported; both absent reproduce the image default.
      if(!k.startsWith('VERCEL_'))assert.equal(allowed(),false,k+' absent');
      else {const other=k==='VERCEL_ENV'?'VERCEL_TARGET_ENV':'VERCEL_ENV';delete process.env[other];assert.equal(allowed(),false);process.env[other]=runtime[other];}
      process.env[k]=runtime[k];
    }
    process.env.VERCEL_ENV='production';assert.equal(allowed(),false);process.env.VERCEL_ENV='preview';
    for(const scope of ['',grant.participantUserIds[0],grant.participantUserIds.slice().reverse().join(','),runtime.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE+',extra']) {
      process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE=scope;assert.equal(allowed(),false);
    }
    Object.assign(process.env,runtime);
    for(const k of Object.keys(context))assert.equal(allowed({...context,[k]:'wrong'}),false,k);
  } finally {for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});

test('authority-derived context refuses identity, scope, channel, route and Production drift',()=>{
  for(const k of Object.keys(preview))assert.throws(()=>clinicWorkerContext({...input,preview:{...preview,[k]:'wrong'}},authority),k);
  for(const k of ['participantUserId','partnerSlug','eventId','eventName'])assert.throws(()=>clinicWorkerContext({...input,[k]:'wrong'},authority),k);
  for(const mutate of [a=>a.grant.approved=false,a=>a.grant.productionAuthorized=true,a=>a.grant.participantUserIds.reverse(),
    a=>a.binding.deploymentScope.stagingScope+=',extra',a=>a.binding.deploymentScope.creationAuthorized=true,
    a=>a.binding.deploymentScope.reuseOnly=false,a=>a.binding.deploymentScope.productionPromotion=true]) {
    const a=structuredClone(authority);mutate(a);assert.throws(()=>clinicWorkerContext(input,a));
  }
});

test('actual Clinic spawn adapter transports every field before immutable image and redacts service argv',()=>{
  const source=fs.readFileSync('scripts/verify-rcap-commercial-browser.mjs','utf8');
  const ast=ts.createSourceFile('browser.mjs',source,ts.ScriptTarget.Latest,true);let method;
  function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='spawnSync')method=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);
  assert.ok(method);const image='ghcr.io/worker@sha256:'+ 'a'.repeat(64);let captured;
  const adapter=new Function('assert','image','workerRuntime','clinicWorkerDockerArgs','spawnSync','service','process',`return ({${method}}).spawnSync`)(assert,image,runtime,clinicWorkerDockerArgs,(...args)=>{captured=args;return {status:0};},'secret',{env:{VERCEL_ENV:'production'}});
  adapter('docker',['run','--rm','-e','SUPABASE_SERVICE_ROLE_KEY=secret',image,'node','scripts/rcap-render-worker.mjs','--once'],{});
  const args=captured[1];for(const [k,v]of Object.entries(runtime)){assert.ok(args.includes(`${k}=${v}`));assert.ok(args.indexOf(`${k}=${v}`)<args.indexOf(image));}
  assert.ok(args.includes('SUPABASE_SERVICE_ROLE_KEY'));assert.ok(!args.some(x=>x.includes('secret')));
  assert.equal(captured[2].env.SUPABASE_SERVICE_ROLE_KEY,'secret');
  for(const k of Object.keys(runtime)){const missing={...runtime};delete missing[k];assert.throws(()=>clinicWorkerDockerArgs(['run',image],image,missing));assert.throws(()=>clinicWorkerDockerArgs(['run','-e',`${k}=bad`,image],image,runtime));}
  assert.match(source,/const workerRuntime = currentClinicWorkerContext\(\{ preview: environmentClassification,/);
  assert.ok(source.indexOf('const workerRuntime =')<source.indexOf('const managementToken =',source.indexOf('async function clinicDeliveryPorts')));
  const baseline=execFileSync('git',['show','579febaaddc5a004d824b74f486e567115db4db2:scripts/verify-rcap-commercial-browser.mjs'],{encoding:'utf8'});
  const originalAst=ts.createSourceFile('baseline.mjs',baseline,ts.ScriptTarget.Latest,true);let originalMethod;
  function baselineVisit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(originalAst)==='spawnSync')originalMethod=n.getText(originalAst);ts.forEachChild(n,baselineVisit);}baselineVisit(originalAst);
  const originalAdapter=new Function('assert','image','spawnSync','service','process',`return ({${originalMethod}}).spawnSync`)(assert,image,(...args)=>{captured=args;},'secret',{env:{}});
  originalAdapter('docker',['run','--rm','-e','SUPABASE_SERVICE_ROLE_KEY=secret',image,'node','scripts/rcap-render-worker.mjs','--once'],{});
  for(const k of Object.keys(runtime))assert.ok(!captured[1].some(v=>v===k||v.startsWith(`${k}=`)),`untouched Captain lacks ${k}`);
});
