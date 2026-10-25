import {CLINIC_FRESH_ATTEMPT} from './rcap-clinic-fresh-attempt.mjs';
import {projectOriginalResponse} from './rcap-clinic-original-response.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import YAML from 'yaml';
import { CLINIC_SETUP,assertClinicSetupInput,assertClinicSetupDispatch,clinicSetupRequestAllowed,clinicSetupSafeError,captureClinicEntryResponse,assertClinicEntryAccepted,clinicSetupSafePathname } from './rcap-clinic-setup-only-boundary.mjs';
const browserSource=fs.readFileSync(new URL('./verify-rcap-commercial-browser.mjs',import.meta.url),'utf8');
const ast=ts.createSourceFile('browser.mjs',browserSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const journey=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='runJourney');
const stop=journey.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='clinicSetupOnly'
  &&node.getText(ast).includes('stopReason'));
test('actual browser setup branch returns before packet builder and downstream effects',async()=>{
  assert.ok(stop);assert.ok(stop.end<browserSource.indexOf('const builderLink'));
  let downstream=0,saved=null,guardCalls=0;
  const sandbox={clinicSetupOnly:true,assert,CLINIC_SETUP,CLINIC_FRESH_ATTEMPT,claimed:{matterId:'11111111-1111-4111-8111-111111111111'},
    participantGuard:{assertNoCritical:()=>{guardCalls++;}},
    page:{url:()=>CLINIC_SETUP.origin+'/briefcase/matters/11111111-1111-4111-8111-111111111111'},
    packetItemId:'11111111-1111-4111-8111-111111111111',participantUserId:CLINIC_SETUP.owner,
    screeningSessionId:'22222222-2222-4222-8222-222222222222',generationRequests:[],stripeRequests:[],packetDownloadRequests:[],failures:[],browserErrors:[],
    result:{},evidenceDir:'mock',path:{join:()=> 'mock-result'},fs:{writeFileSync:(_p,body)=>{saved=JSON.parse(body);}},
    downstream:()=>{downstream++;throw Error('packet builder/render/worker reached');}};
  const run=()=>new Function(...Object.keys(sandbox),`return (async()=>{${stop.getText(ast)};downstream();})()`)(...Object.values(sandbox));
  await run();
  assert.equal(guardCalls,1,'setup-only completion must invoke the participant guard');
  assert.equal(downstream,0);assert.equal(saved.scope,'clinic_setup_only');assert.equal(saved.fullHostedJourneyCompleted,false);
  saved=null;sandbox.result={};
  for(const previous of CLINIC_FRESH_ATTEMPT.previousAttempts) {
   sandbox.screeningSessionId=previous.screeningSessionId;
   await assert.rejects(run(),/previous Clinic screening/);assert.equal(saved,null);assert.equal(downstream,0);
  }
  sandbox.screeningSessionId=null;
  await assert.rejects(run(),/identify the new Clinic screening/);assert.equal(saved,null);assert.equal(downstream,0);
  sandbox.screeningSessionId='22222222-2222-4222-8222-222222222222';
  guardCalls=1;sandbox.result={};
  sandbox.participantGuard.assertNoCritical=()=>{guardCalls++;throw Error('participant guard refused');};
  await assert.rejects(run(),/participant guard refused/);
  assert.equal(guardCalls,2);assert.equal(saved,null);assert.equal(downstream,0);assert.equal(sandbox.result.savedMatterObservation.databasePersistenceVerified,false);assert.equal(sandbox.result.passed,undefined);
  sandbox.participantGuard=undefined;
  await assert.rejects(run(),/assertNoCritical/);
  assert.equal(saved,null);assert.equal(downstream,0);
  sandbox.clinicSetupOnly=false;
  await assert.rejects(run(),/reached/);
  assert.equal(downstream,1,'full path continues when setup-only is not requested');
});
test('browser request boundary blocks packet, funding, payment, reset, admin and external effects',()=>{
  for(const pathname of ['/api/expungement-ai/packet/render','/api/expungement-ai/packet/generate',
    '/api/expungement-ai/checkout','/api/stripe/webhook','/api/clinic/packet/funding',
    '/api/clinic/session/reset','/api/partners/admin','/api/expungement-ai/briefcase/item/packet-information'])
    assert.equal(clinicSetupRequestAllowed('POST',CLINIC_SETUP.origin+pathname),false,pathname);
  assert.equal(clinicSetupRequestAllowed('GET',CLINIC_SETUP.origin+'/briefcase/item/packet-information'),false);
  assert.equal(clinicSetupRequestAllowed('GET','https://checkout.stripe.com/c/pay/mock'),false);
  assert.equal(clinicSetupRequestAllowed('POST',`https://${CLINIC_SETUP.project}.supabase.co/auth/v1/admin/users`),false);
  for(const pathname of ['/api/clinic/entry','/api/clinic/assistance/start','/api/expungement-ai/screening/pending/claim'])
    assert.equal(clinicSetupRequestAllowed('POST',CLINIC_SETUP.origin+pathname),true,pathname);
  assert.equal(clinicSetupRequestAllowed('POST',`https://${CLINIC_SETUP.project}.supabase.co/auth/v1/token?grant_type=password`),true);
});
test('registered workflow isolates existing secrets and exact current target with no broader phase',()=>{
  const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
  assert.ok(workflow.on.workflow_dispatch.inputs.mode.options.includes('clinic_setup_only'));
  assert.equal('clinic_setup_only'.startsWith('hosted_'),false);
  const job=workflow.jobs.clinic_setup_only;assert.equal(job.if,"inputs.mode == 'clinic_setup_only' || inputs.mode == 'clinic_prerequisites_only'");
  const step=job.steps.find(s=>s.name==='Enter existing Clinic and claim one new screening result');
  assert.equal(step.if,"inputs.mode == 'clinic_setup_only'");
  const env={...step.env};for(const key of ['RCAP_BROWSER_PASSWORD','RCAP_BROWSER_VERCEL_TOKEN','RCAP_BROWSER_VERCEL_BYPASS_SECRET'])env[key]='mock-existing-custody';
  assert.equal(env.RCAP_BROWSER_ISSUE_CLINIC_CODE,'1');assert.equal(env.RCAP_BROWSER_CLINIC_ACCESS_CODE,undefined);
  assertClinicSetupInput(env);assert.equal(step.run,'node scripts/verify-rcap-commercial-browser.mjs');
  const live=job.steps.find(s=>s.name==='Aggregate live read-only Clinic database, Preview and CAPTCHA prerequisites');
  assert.ok(live.env.SUPABASE_ACCESS_TOKEN);assert.ok(job.steps.indexOf(live)<job.steps.indexOf(step));
  assert.equal(step.env.SUPABASE_ACCESS_TOKEN,undefined);
  const serialized=JSON.stringify(step);
  assert.ok(!/SUPABASE_ACCESS_TOKEN|SERVICE_ROLE|STRIPE_SECRET|FLY_API_TOKEN|docker |npm run build|clinic-preview-seed/.test(serialized));
  const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)));
  assert.equal(vercel.git.deploymentEnabled['codex/d-clinic-setup-only-20261024'],false);
  assert.throws(()=>assertClinicSetupInput({...env,RCAP_BROWSER_EMAIL:'different@rcap-acceptance.test'}));
  assert.throws(()=>assertClinicSetupInput({...env,RCAP_BROWSER_VERCEL_BYPASS_SECRET:'  '}));
});

test('setup failure evidence removes the existing private credential values',()=>{
  const env={RCAP_BROWSER_PASSWORD:'mock-password',RCAP_BROWSER_CLINIC_ACCESS_CODE:'MOCKCODEONLY',RCAP_BROWSER_VERCEL_TOKEN:'mock-token',RCAP_BROWSER_VERCEL_BYPASS_SECRET:'mock-bypass'};
  const safe=clinicSetupSafeError(new Error(Object.values(env).join(' ')),env);
  for(const value of Object.values(env))assert.ok(!safe.includes(value));
});

test('entry refusal retains sanitized outcome and cannot advance',()=>{
 const observation=projectOriginalResponse('entry',503,{success:false,error:'private-response-value'}, {origin:CLINIC_SETUP.origin,clinicSlug:CLINIC_SETUP.slug});
 assert.equal(observation.outcome,'application_refusal');let consent=0;
 assert.throws(()=>{assertClinicEntryAccepted(observation);consent++;},/HTTP 503/);assert.equal(consent,0);
 assert(!JSON.stringify(observation).includes('private-response-value'));
});
test('entry contract requires exact continuation without queries credentials fragments or another origin',()=>{
 const config={origin:CLINIC_SETUP.origin,clinicSlug:CLINIC_SETUP.slug},next=`/clinic/${CLINIC_SETUP.slug}/assist`;
 assertClinicEntryAccepted(projectOriginalResponse('entry',200,{success:true,next},config));
 for(const bad of [next+'?private=value',next+'#fragment','https://different.example'+next,'https://user:pass@'+new URL(CLINIC_SETUP.origin).host+next])
  assert.throws(()=>assertClinicEntryAccepted(projectOriginalResponse('entry',200,{success:true,next:bad},config)));
});
test('transport failure has an explicit no-response diagnostic and cannot advance',async()=>{
  const observation=await captureClinicEntryResponse(null);assert.equal(observation.httpStatus,null);
  assert.throws(()=>assertClinicEntryAccepted(observation),/no response/);
});

test('actual entry diagnostics branch retains original response outcome and navigation-timeout evidence',async()=>{
  let entryCheck,failureCapture;
  const visit=node=>{
    if(ts.isIfStatement(node)&&node.expression.getText(ast)==='clinicSetupOnly') {
      if(node.getText(ast).includes('const observation=await captureClinicEntryResponse'))entryCheck=node;
      if(node.getText(ast).includes('currentPathname=activePage'))failureCapture=node;
    }
    ts.forEachChild(node,visit);
  };visit(ast);assert.ok(entryCheck&&failureCapture);
  const execute=(node,scope)=>new Function(...Object.keys(scope),`return (async()=>{${node.getText(ast)}})()`)(...Object.values(scope));
  for(const status of [503,200]) {
    const result={};let readyForNavigation=0,inlineResolved=false;
    const response={status:()=>status,json:async()=>({success:status===200,next:`/clinic/${CLINIC_SETUP.slug}/assist`})};
    const scope={clinicSetupOnly:true,result,entryResponse:Promise.resolve(response),captureClinicEntryResponse:async()=>projectOriginalResponse('entry',status,{success:status===200,next:`/clinic/${CLINIC_SETUP.slug}/assist`},{origin:CLINIC_SETUP.origin,clinicSlug:CLINIC_SETUP.slug}),assertClinicEntryAccepted};
    if(status===503)await assert.rejects(execute(entryCheck,scope),/HTTP 503/);
    else {await execute(entryCheck,scope);readyForNavigation++;}
    assert.equal(readyForNavigation,status===200?1:0);
    const activePage={url:()=>CLINIC_SETUP.origin+'/clinic/'+CLINIC_SETUP.slug+'?private=not-recorded',locator:selector=>{
      assert.equal(selector,'#eventCodeError');return {filter:()=>({innerText:async()=>{
        await Promise.resolve();inlineResolved=true;return 'Ask staff MOCKCODEONLY';}})};}};
    await execute(failureCapture,{clinicSetupOnly:true,result,activePage,clinicSetupSafeError,
      clinicSetupSafePathname,process:{env:{RCAP_BROWSER_CLINIC_ACCESS_CODE:'MOCKCODEONLY'}},requestFailures:[{method:'POST',pathname:'/api/clinic/entry',error:'net::ERR_FAILED'}]});
    assert.equal(inlineResolved,true);assert.equal(result.entryDiagnostics.httpStatus,status);
    assert.deepEqual(Object.keys(result.entryDiagnostics).sort(),['httpStatus','responseOutcome','bodyState','inlineError','currentPathname','requestFailures'].sort());
    assert.ok(!JSON.stringify(result).includes('MOCKCODEONLY'));assert.ok(!JSON.stringify(result).includes('private='));
    assert.equal(result.entryDiagnostics.inlineError,'Ask staff [redacted]');
  }
});

test('actual pathname capture redacts raw and URI-encoded known secrets in both diagnostic fields',async()=>{
  let failureCapture,requestFailed;
  const visit=node=>{
    if(ts.isIfStatement(node)&&node.expression.getText(ast)==='clinicSetupOnly'&&node.getText(ast).includes('currentPathname=activePage'))failureCapture=node;
    if(ts.isCallExpression(node)&&node.expression.getText(ast)==='page.on'&&node.arguments[0]?.text==='requestfailed')requestFailed=node.arguments[1];
    ts.forEachChild(node,visit);
  };visit(ast);assert.ok(failureCapture&&requestFailed);
  const env={RCAP_BROWSER_CLINIC_ACCESS_CODE:'MOCK/CODE',RCAP_BROWSER_PASSWORD:'mock.+[value](1)'};
  for(const path of [`/${env.RCAP_BROWSER_CLINIC_ACCESS_CODE}/${env.RCAP_BROWSER_PASSWORD}`,`/${encodeURIComponent(env.RCAP_BROWSER_CLINIC_ACCESS_CODE).replace('%2F','%2f')}/${encodeURIComponent(env.RCAP_BROWSER_PASSWORD)}`]) {
    const address=CLINIC_SETUP.origin+path+'?private=not-captured';
    const requestFailures=[];const browserErrors=[];
    const scope={clinicSetupOnly:true,requestFailures,browserErrors,clinicSetupSafeError,clinicSetupSafePathname,
      process:{env},safeRequestPath:()=> '[memory only]'};
    const callback=new Function(...Object.keys(scope),`return ${requestFailed.getText(ast)}`)(...Object.values(scope));
    callback({method:()=> 'POST',url:()=>address,failure:()=>({errorText:'net::ERR_FAILED'})});
    const result={};
    const activePage={url:()=>address,locator:()=>({filter:()=>({innerText:async()=> 'Entry refused'})})};
    const captureScope={...scope,result,activePage};
    await new Function(...Object.keys(captureScope),`return (async()=>{${failureCapture.getText(ast)}})()`)(...Object.values(captureScope));
    const evidence=result.entryDiagnostics;assert.equal(evidence.httpStatus,null);
    assert.ok(evidence.currentPathname.includes('[redacted]'));assert.ok(evidence.requestFailures[0].pathname.includes('[redacted]'));
    const serialized=JSON.stringify(evidence);
    for(const value of [...Object.values(env),...Object.values(env).map(encodeURIComponent)])assert.ok(!serialized.toLowerCase().includes(value.toLowerCase()));
    assert.ok(!serialized.includes('private='));assert.equal(Object.keys(evidence).length,4);
  }
});

test('dispatch source labels must match the pinned Clinic tuple and tools never select the runner checkout',()=>{
 const input={mode:'clinic_setup_only',clinic_attempt_id:CLINIC_FRESH_ATTEMPT.id,application_sha:CLINIC_SETUP.app,worker_source_sha:'16908485a94f475448657cea90583a4d352da9a3',worker_digest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',tools_sha:'98f89f0db0bcb60088341c35595a072edd9031a4'};
 assert.doesNotThrow(()=>assertClinicSetupDispatch(input));assertClinicSetupDispatch({...input,mode:'clinic_prerequisites_only'});
 for(const previous of CLINIC_FRESH_ATTEMPT.previousAttempts)assert.throws(()=>assertClinicSetupDispatch({...input,clinic_attempt_id:previous.id}));
 for(const key of ['application_sha','worker_source_sha','worker_digest','tools_sha'])assert.throws(()=>assertClinicSetupDispatch({...input,mode:'clinic_prerequisites_only',[key]:'wrong'}));
 for(const value of [...CLINIC_FRESH_ATTEMPT.previousAttempts.map(previous=>previous.id),'new-unapproved-attempt',''])assert.throws(()=>assertClinicSetupDispatch({...input,clinic_attempt_id:value}));
 for(const key of ['preview_hostname','preview_deployment_id','supabase_project_ref'])assert.throws(()=>assertClinicSetupDispatch({...input,mode:'clinic_prerequisites_only',[key]:'wrong'}));
 const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
 assert.equal(workflow.jobs.clinic_setup_only.steps[0].with.ref,'${{ github.sha }}');
 assert.match(workflow.jobs.clinic_setup_only.steps.find(s=>s.name?.startsWith('Require the published')).run,/assertClinicSetupDispatch\(JSON.parse/);
});
test('screening completion failure stops before pending creation and cannot claim persistence from HTTP200',async()=>{
 const branch=journey.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='clinicSetupOnly'&&node.getText(ast).includes('screeningCompletion.read()'));
 assert(branch);assert(branch.end<browserSource.indexOf('await saveScreeningAndClaim',branch.pos));
 const run=(scope,body=branch.getText(ast))=>new Function(...Object.keys(scope),`"use strict";return (async()=>{${body}})()`)(...Object.values(scope));
 for(const response of [null,{httpStatus:500,accepted:true},{httpStatus:200,accepted:false}]) {
  let guardCalls=0;await assert.rejects(run({clinicSetupOnly:true,result:{},screeningCompletion:{read:async()=>response},assert,participantGuard:{assertNoCritical:()=>guardCalls++}}));assert.equal(guardCalls,0);
 }
 const original=Object.freeze({operation:'completion',httpStatus:200,bodyState:'parsed',outcome:'accepted',accepted:true});
 const result={};let guardCalls=0;
 const scope={clinicSetupOnly:true,result,screeningCompletion:{read:async()=>original},assert,participantGuard:{assertNoCritical:()=>{guardCalls++;}}};
 await run(scope);assert.equal(guardCalls,1);
 assert.notEqual(result.screeningCompletion,original,'Report metadata must own a copy of the immutable receipt');
 assert.equal(result.screeningCompletion.persistenceVerified,false);
 assert.equal(Object.isFrozen(original),true);assert.equal(Object.hasOwn(original,'persistenceVerified'),false);
 assert.deepEqual(original,{operation:'completion',httpStatus:200,bodyState:'parsed',outcome:'accepted',accepted:true});
 const reverted=branch.getText(ast).replace('result.screeningCompletion={...(await screeningCompletion.read())};','result.screeningCompletion=await screeningCompletion.read();');
 assert.notEqual(reverted,branch.getText(ast));
 await assert.rejects(run({...scope,result:{}},reverted),/Cannot add property persistenceVerified.*not extensible/,'The actual old strict-mode production block must reproduce402069');
});

test('read-only credential-context mode cannot enter Clinic browser or another provider job',()=>{
 const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
 const mode='clinic_prerequisites_only';assert(workflow.on.workflow_dispatch.inputs.mode.options.includes(mode));
 const job=workflow.jobs.clinic_setup_only;
 const browser=job.steps.find(s=>s.run==='node scripts/verify-rcap-commercial-browser.mjs');assert.equal(browser.if,"inputs.mode == 'clinic_setup_only'");
 const collector=job.steps.find(s=>s.run==='node scripts/rcap-clinic-live-prerequisites.mjs');assert.equal(collector.if,undefined);
 assert.deepEqual(Object.keys(collector.env).sort(),['SUPABASE_ACCESS_TOKEN','VERCEL_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET','RCAP_BROWSER_EVIDENCE_DIR'].sort());
 for(const [id,other] of Object.entries(workflow.jobs))if(id!=='clinic_setup_only') {
  assert(other.if,'every other provider job must select a mode');assert(!other.if.includes(mode));
  assert(!other.if.includes("inputs.mode != 'clinic_setup_only'"));
 }
});
