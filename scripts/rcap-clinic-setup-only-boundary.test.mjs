import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import YAML from 'yaml';
import { CLINIC_SETUP,assertClinicSetupInput,clinicSetupRequestAllowed,clinicSetupSafeError } from './rcap-clinic-setup-only-boundary.mjs';
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
