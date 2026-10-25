import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {assertNormalClinicSurfaces} from './rcap-clinic-normal-readiness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {CLINIC_SETUP,clinicSetupSafePathname} from './rcap-clinic-setup-only-boundary.mjs';
import {CLINIC_CODE_ADMIN,clinicAdminCodeRequestAllowed,issueClinicSetupCode,requireClinicAdminControls,captureClinicAdminFailure} from './rcap-clinic-setup-admin-code.mjs';
function fixture() {
  const now=Date.now(),calls=[],receipts=[];
  const old={id:CLINIC_CODE_ADMIN.oldCodeId,eventId:CLINIC_SETUP.event,maxUses:2,usesCount:2,isActive:true};
  const event={id:CLINIC_SETUP.event,partnerSlug:'mvl-demo',publicSlug:CLINIC_SETUP.slug,jurisdiction:'MS',status:'published',
    startsAt:new Date(now-3600000).toISOString(),endsAt:new Date(now+3600000).toISOString(),experience:'standard'};
  const workspace={status:200,json:{success:true,workspace:{event,accessCodes:[old]}}};
  const codeId='11111111-1111-4111-8111-111111111111',code='CLINIC-MOCKCODEONLY';
  const io={beforeCode:async()=>{},normalLogin:async()=>({id:CLINIC_CODE_ADMIN.id,partnerAdminVisible:true}),now:()=>now,
    readWorkspace:async()=>workspace,
    createCode:async body=>{calls.push(structuredClone(body));workspace.json.workspace.accessCodes.push({id:codeId,eventId:CLINIC_SETUP.event,
      maxUses:1,usesCount:0,isActive:true,startsAt:body.startsAt,expiresAt:body.expiresAt});return {status:201,json:{success:true,accessCode:{id:codeId,code}}};},
    saveAttempt:async value=>receipts.push(structuredClone(value)),saveResult:async value=>receipts.push(structuredClone(value)),saveVerified:async value=>receipts.push(structuredClone(value))};
  return {io,now,calls,receipts,workspace,event,old,codeId,code};
}
test('normal scoped test admin issues exactly one bounded max1 code and passes it only in memory',async()=>{
  const f=fixture();const code=await issueClinicSetupCode(f.io);assert.equal(code,f.code);assert.equal(f.calls.length,1);
  const body=f.calls[0];assert.equal(body.requestId,CLINIC_CODE_ADMIN.requestId);assert.equal(body.maxUses,1);
  assert.equal(Date.parse(body.startsAt),f.now);assert.equal(Date.parse(body.expiresAt),f.now+15*60000);
  assert.deepEqual(f.receipts[0].request,body);
  assert.equal(f.receipts.at(-1).status,'verified_unredeemed');assert.ok(!JSON.stringify(f.receipts).includes(f.code));
  assert.deepEqual(Object.keys(f.receipts.at(-1)).sort(),['httpStatus','actorId','eventId','codeId','maxUses','status'].sort());
  assert.equal(f.old.usesCount,2);
});
for(const [label,change] of [
  ['wrong normal identity',f=>{f.io.normalLogin=async()=>({id:CLINIC_SETUP.owner,partnerAdminVisible:true});}],
  ['unknown admin role',f=>{f.io.normalLogin=async()=>({id:CLINIC_CODE_ADMIN.id});}],
  ['event API denied',f=>{f.workspace.status=403;}],
  ['event API server error',f=>{f.workspace.status=500;}],
  ['unverified admin role',f=>{f.io.normalLogin=async()=>({id:CLINIC_CODE_ADMIN.id,partnerAdminVisible:false});}],
  ['wrong tenant',f=>{f.event.partnerSlug='other';}],
  ['wrong event',f=>{f.event.id=CLINIC_CODE_ADMIN.oldCodeId;}],
  ['event outside actual window',f=>{f.event.endsAt=new Date(f.now-1).toISOString();}],
  ['event not published',f=>{f.event.status='paused';}],
  ['already renewed or unknown inventory',f=>{f.workspace.json.workspace.accessCodes.push({...f.old,id:'22222222-2222-4222-8222-222222222222',usesCount:0});}],
  ['reconciled consumed run401528 code',f=>{f.workspace.json.workspace.accessCodes.push({...f.old,id:'5fe1f896-c735-4ef4-838e-d86a4b293d86',usesCount:1,maxUses:1});}],
  ['old code no longer exhausted',f=>{f.old.usesCount=1;}],
  ['normal read-only surfaces blocked',f=>{f.io.beforeCode=async()=>{throw Error('blocked normal surfaces');};}],
  ['prior attempt marker',f=>{f.io.saveAttempt=async()=>{throw Error('prior attempt');};}]
]) test(`refuses ${label} before code POST`,async()=>{
  const f=fixture();change(f);await assert.rejects(issueClinicSetupCode(f.io));assert.equal(f.calls.length,0);
});
test('HTTP refusal is a single attempt without fallback or retry',async()=>{
  const f=fixture();f.io.createCode=async body=>{f.calls.push(body);return {status:403,json:{error:'private error not persisted'}};};
  await assert.rejects(issueClinicSetupCode(f.io),/refused/);assert.equal(f.calls.length,1);
  assert.equal(f.receipts.at(-1).status,'refused');assert.ok(!JSON.stringify(f.receipts).includes('private error'));
});
test('ambiguous transport and failed persisted-code readback stop without a second POST',async()=>{
  for(const failure of ['transport','readback']) {
    const f=fixture();
    if(failure==='transport')f.io.createCode=async body=>{f.calls.push(body);throw Error('transport');};
    else {const read=f.io.readWorkspace;f.io.readWorkspace=async()=>{const value=await read();if(f.calls.length)value.json.workspace.accessCodes[1].maxUses=2;return value;};}
    await assert.rejects(issueClinicSetupCode(f.io));assert.equal(f.calls.length,1);
    assert.ok(!f.receipts.some(row=>row.status==='verified_unredeemed'));
  }
});
test('admin context permits only normal Auth, reads and the exact event-code POST',()=>{
  const api=CLINIC_SETUP.origin+`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`;
  assert.equal(clinicAdminCodeRequestAllowed('POST',api),true);
  for(const path of ['/api/clinic/entry','/api/clinic/session/reset','/api/clinic/events','/api/expungement-ai/packet/render'])
    assert.equal(clinicAdminCodeRequestAllowed('POST',CLINIC_SETUP.origin+path),false,path);
  assert.equal(clinicAdminCodeRequestAllowed('PATCH',CLINIC_SETUP.origin+'/api/clinic/events/'+CLINIC_SETUP.event),false);
  assert.equal(clinicAdminCodeRequestAllowed('POST',`https://${CLINIC_SETUP.project}.supabase.co/auth/v1/admin/users`),false);
});
test('actual runner uses guarded exact-event controls and captures denied/server-error/unknown pages before closing',async()=>{
  const source=fs.readFileSync(new URL('./verify-rcap-commercial-browser.mjs',import.meta.url),'utf8');
  const ast=ts.createSourceFile('browser.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const journey=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='runJourney');
  const preamble=journey.body.statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='issueClinicCode');assert.ok(preamble);
  for(const mode of ['success','denied','server-error','unknown-role']) {
    const f=fixture();let closed=0,controlsChecked=false;const files=[],listeners={};
    const adminPath='/partner/clinic/'+CLINIC_SETUP.event;
    const page={on:(name,handler)=>{listeners[name]=handler;},url:()=>{assert.equal(closed,0,'diagnostics captured before context close');return CLINIC_SETUP.origin+adminPath;},
      goto:async address=>{assert.equal(new URL(address).searchParams.get('next'),adminPath);},
      waitForURL:async predicate=>assert.equal(predicate(new URL(CLINIC_SETUP.origin+adminPath)),true),
      locator:selector=>{assert.equal(selector,'#clinic-codes');return {waitFor:async()=>{
        if(mode==='success'){controlsChecked=true;return;}
        if(mode==='unknown-role')throw Error('Unknown control page');
        return new Promise(()=>{});
      }};},
      getByRole:()=>({first:()=>({waitFor:async()=>mode==='success'?new Promise(()=>{}):undefined,
        innerText:async()=>{if(mode==='unknown-role')throw Error('No recognized error heading');return mode==='server-error'?'Application error: PRIVATE-NOT-RECORDED':'Clinic access denied PRIVATE-NOT-RECORDED';}})}),
      evaluate:async(_fn,{body})=>{assert.equal(controlsChecked,true);return body?f.io.createCode(body):f.io.readWorkspace();}};
    const context={route:async()=>{},newPage:async()=>page,close:async()=>{closed++;}};
    const env={RCAP_BROWSER_PASSWORD:'mock-private-password'},result={stage:'test',guardEvents:[]};
    const scope={issueClinicCode:true,browser:{newContext:async()=>context},attachBypass:async()=>{},
      clinicAdminCodeRequestAllowed,issueClinicSetupCode,requireClinicAdminControls,captureClinicAdminFailure,clinicSetupSafePathname,
      CLINIC_CODE_ADMIN,CLINIC_SETUP,assert,result,createClinicRequestGuard,clinicGate:{captchaPolicy:{serverCaptchaRequired:false,frontend:{clientCaptchaRequired:false,widgetSiteKeyConfigured:true}}},
      readNormalClinicSurfaces:async()=>['general_clinic_list','clinic_follow_up_page','clinic_queue','clinic_follow_up','clinic_reporting'].map(id=>({id,ok:true,httpStatus:200})),assertNormalClinicSurfaces,baseUrl:CLINIC_SETUP.origin,password:env.RCAP_BROWSER_PASSWORD,
      signIn:async()=>{listeners.response({request:()=>({method:()=> 'GET',isNavigationRequest:()=>true}),url:()=>CLINIC_SETUP.origin+adminPath,status:()=>mode==='server-error'?500:200});return {user:{id:CLINIC_CODE_ADMIN.id}};},
      fs:{writeFileSync:(_path,value)=>files.push(JSON.parse(value))},path:{join:(_dir,name)=>name},evidenceDir:'mock',process:{env},clinicAccessCode:''};
    const run=()=>new Function(...Object.keys(scope),`return (async()=>{${preamble.getText(ast)};return clinicAccessCode;})()`)(...Object.values(scope));
    if(mode==='success') {
      assert.equal(await run(),f.code);assert.equal(env.RCAP_BROWSER_CLINIC_ACCESS_CODE,f.code);assert.equal(f.calls.length,1);
      assert.equal(files.at(-1).status,'verified_unredeemed');
      assert.equal(result.adminDiagnostics.roleEvidence,'scoped_partner_admin_controls_and_authenticated_exact_event_api');
    } else {
      await assert.rejects(run());assert.equal(f.calls.length,0);assert.equal(files.length,0);
      assert.equal(result.adminDiagnostics.roleEvidence,'unknown');
      assert.equal(result.adminDiagnostics.currentPathname,adminPath);
      assert.equal(result.adminDiagnostics.httpStatus,mode==='server-error'?500:200);
      assert.ok(result.adminDiagnostics.inlineError);assert.ok(!JSON.stringify(result).includes('PRIVATE-NOT-RECORDED'));
    }
    assert.equal(closed,1);assert.ok(!JSON.stringify(files).includes(f.code));assert.ok(!JSON.stringify(files).includes(env.RCAP_BROWSER_PASSWORD));
  }
});
