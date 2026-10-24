import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import YAML from 'yaml';
import { CLINIC_SETUP,assertClinicSetupInput,clinicSetupRequestAllowed,clinicSetupSafeError,captureClinicEntryResponse,assertClinicEntryAccepted,clinicSetupSafePathname } from './rcap-clinic-setup-only-boundary.mjs';
const browserSource=fs.readFileSync(new URL('./verify-rcap-commercial-browser.mjs',import.meta.url),'utf8');
const ast=ts.createSourceFile('browser.mjs',browserSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const journey=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='runJourney');
const stop=journey.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='clinicSetupOnly'
  &&node.getText(ast).includes('stopReason'));
test('actual browser setup branch returns before packet builder and downstream effects',async()=>{
  assert.ok(stop);assert.ok(stop.end<browserSource.indexOf('const builderLink'));
  let downstream=0,saved=null;
  const sandbox={clinicSetupOnly:true,assert,CLINIC_SETUP,claimed:{matterId:'11111111-1111-4111-8111-111111111111'},
    packetItemId:'11111111-1111-4111-8111-111111111111',participantUserId:CLINIC_SETUP.owner,
    screeningSessionId:'22222222-2222-4222-8222-222222222222',generationRequests:[],stripeRequests:[],packetDownloadRequests:[],failures:[],browserErrors:[],
    result:{},evidenceDir:'mock',path:{join:()=> 'mock-result'},fs:{writeFileSync:(_p,body)=>{saved=JSON.parse(body);}},
    downstream:()=>{downstream++;throw Error('packet builder/render/worker reached');}};
  const run=()=>new Function(...Object.keys(sandbox),`return (async()=>{${stop.getText(ast)};downstream();})()`)(...Object.values(sandbox));
  await run();
  assert.equal(downstream,0);assert.equal(saved.scope,'clinic_setup_only');assert.equal(saved.fullHostedJourneyCompleted,false);
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
  const job=workflow.jobs.clinic_setup_only;assert.equal(job.if,"inputs.mode == 'clinic_setup_only'");
  const step=job.steps.find(s=>s.name==='Enter existing Clinic and claim one new screening result');
  const env={...step.env};for(const key of ['RCAP_BROWSER_PASSWORD','RCAP_BROWSER_CLINIC_ACCESS_CODE','RCAP_BROWSER_VERCEL_TOKEN','RCAP_BROWSER_VERCEL_BYPASS_SECRET'])env[key]='mock-existing-custody';
  assertClinicSetupInput(env);assert.equal(step.run,'node scripts/verify-rcap-commercial-browser.mjs');
  const serialized=JSON.stringify(job);
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

test('entry refusal records HTTP status only and fails before navigation or consent',async()=>{
  const response={status:()=>503,json:async()=>({success:false,error:'private-response-value',next:'private-next-value',code:'private-code'}),headerValue:async()=> 'private-header'};
  const observation=await captureClinicEntryResponse(response);
  assert.deepEqual(observation,{httpStatus:503,accepted:false});
  const evidence={httpStatus:observation.httpStatus};assert.deepEqual(Object.keys(evidence),['httpStatus']);
  let navigationOrConsent=0;
  assert.throws(()=>{assertClinicEntryAccepted(observation);navigationOrConsent++;},/Clinic entry refused HTTP 503/);
  assert.equal(navigationOrConsent,0);assert.ok(!JSON.stringify(observation).includes('private-'));
});
test('entry response checks continuation in memory without exposing success, next, body or headers',async()=>{
  const response={status:()=>200,json:async()=>({success:true,next:`/clinic/${CLINIC_SETUP.slug}/assist?private=not-captured`})};
  const observation=await captureClinicEntryResponse(response);assertClinicEntryAccepted(observation);
  assert.deepEqual(observation,{httpStatus:200,accepted:true});
  response.json=async()=>({success:true,next:'https://different.example/assist?secret=not-captured'});
  assert.throws(()=>assertClinicEntryAccepted({httpStatus:200,accepted:false}));
  const external=await captureClinicEntryResponse(response);assert.equal(external.accepted,false);
  assert.throws(()=>assertClinicEntryAccepted(external));
});
test('transport failure has an explicit no-response diagnostic and cannot advance',async()=>{
  const observation=await captureClinicEntryResponse(null);assert.equal(observation.httpStatus,null);
  assert.throws(()=>assertClinicEntryAccepted(observation),/no response/);
});

test('actual entry diagnostics branch retains refusal and 200 navigation-timeout evidence with only four fields',async()=>{
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
    const scope={clinicSetupOnly:true,result,entryResponse:Promise.resolve(response),captureClinicEntryResponse,assertClinicEntryAccepted};
    if(status===503)await assert.rejects(execute(entryCheck,scope),/HTTP 503/);
    else {await execute(entryCheck,scope);readyForNavigation++;}
    assert.equal(readyForNavigation,status===200?1:0);
    const activePage={url:()=>CLINIC_SETUP.origin+'/clinic/'+CLINIC_SETUP.slug+'?private=not-recorded',locator:selector=>{
      assert.equal(selector,'#eventCodeError');return {filter:()=>({innerText:async()=>{
        await Promise.resolve();inlineResolved=true;return 'Ask staff MOCKCODEONLY';}})};}};
    await execute(failureCapture,{clinicSetupOnly:true,result,activePage,clinicSetupSafeError,
      clinicSetupSafePathname,process:{env:{RCAP_BROWSER_CLINIC_ACCESS_CODE:'MOCKCODEONLY'}},requestFailures:[{method:'POST',pathname:'/api/clinic/entry',error:'net::ERR_FAILED'}]});
    assert.equal(inlineResolved,true);assert.equal(result.entryDiagnostics.httpStatus,status);
    assert.deepEqual(Object.keys(result.entryDiagnostics).sort(),['httpStatus','inlineError','currentPathname','requestFailures'].sort());
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
