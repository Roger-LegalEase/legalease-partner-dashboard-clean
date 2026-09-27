// Successor proof: current product endpoint, exact handoff, canonical PG and
// production D1/D2 browser machinery. No historical Preview/checkpoint repin.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {startConnectedFixture} from './rcap-clinic-resume-connected-fixture.mjs';
import {createResumeBrowserLifecycle} from './rcap-clinic-resume-browser-lifecycle.mjs';
import {createResumeBrowserPorts} from './rcap-clinic-resume-browser-ports.mjs';
import {handleResumeRequest,createNetworkEvidence,ACCEPTANCE_ORIGIN} from './rcap-clinic-resume-network-policy.mjs';
import {RESUME} from './rcap-clinic-resume-contract.mjs';
import {installSignInSafety,signInWithRealForm} from './rcap-clinic-resume-sign-in.mjs';
import {plantParticipantState} from './rcap-clinic-resume-browser-reset.mjs';
const fixture=process.env.RCAP_CONNECTED_FIXTURE;assert.ok(fixture);
for(const fault of [null,'owner-delivery','late-network','pending-handler','shutdown','wrong-participant','lookup','closure','lookup-recovery','closure-recovery','lost-response-recovery'])test('successor connected prepare/close/complete: '+(fault??'clean'),async()=>{
 const recovering=Boolean(fault?.endsWith('-recovery'));
 const service=await startConnectedFixture(fixture,{product:true}),browser=await chromium.launch({headless:true}),violations=[],network=createNetworkEvidence();let activity,release,handlerReached;const reached=new Promise(r=>handlerReached=r);
 const config={project:RESUME.project,serverCaptchaRequired:false,frontend:{clientCaptchaRequired:false,widgetSiteKeyConfigured:true},syntheticProfile:'bounded no-analytics Clinic resume'};
 const handleRequest=async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/pending-handler'){handlerReached();await new Promise(r=>release=r);throw Error('pending handler fault');}
  if(u.origin===ACCEPTANCE_ORIGIN){let result;return handleResumeRequest({request:()=>route.request(),fetch:async()=>{result=await service.auth(route);return {status:()=>result.status,json:async()=>result.body}},fulfill:()=>route.fulfill({status:result.status,json:result.body}),abort:()=>route.abort()},{origin:service.origin,bypass:'synthetic',violations,captchaPolicy:config,network});}
  return handleResumeRequest(route,{origin:service.origin,bypass:'synthetic',violations,captchaPolicy:config,network});
 };
 activity=createResumeBrowserLifecycle({browser,handleRequest,violations});let stage='browser',failure=null,closed=false;
 try{
  const ports=createResumeBrowserPorts({activity,origin:service.origin,bypass:'synthetic',password:service.password,query:service.query,project:RESUME.project,observed:()=>{}});
  await ports.signInOwner();await ports.observeBeforeMatter();await ports.openReadyMatter();await ports.proveDenials();await ports.proveStaffQueuePrivacy();
  const owner=browser.contexts()[0],page=owner.pages().at(-1);
  assert.equal((await owner.request.get(service.origin+'/__fixture/handoff')).status(),204);
  await plantParticipantState(page);
  const request=action=>page.evaluate(async action=>{const r=await fetch('/api/clinic/session/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})});return {status:r.status,...await r.json()};},action);
  stage='prepare';if(fault==='lookup'||fault==='lookup-recovery')service.faults.lookup=true;
  let prepared=await request('prepare');
  if(fault==='lookup-recovery'){assert.equal(prepared.status,409);assert.ok((await owner.cookies()).some(c=>c.name.startsWith('sb-')&&!c.httpOnly));assert.equal(service.count.closures,0);service.faults.lookup=false;prepared=await request('prepare');}assert.equal(prepared.status,200);assert.equal(prepared.prepared,true);
  const helper=fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8').replace('export async function resetClinicDeviceState','async function resetClinicDeviceState');await page.addScriptTag({content:helper+'\nwindow.localReset=resetClinicDeviceState;'});
  assert.equal((await page.evaluate(()=>window.localReset(window,'/expungement-ai/sign-in',{navigate:false}))).ok,true);
  const cookies=await owner.cookies();assert.ok(cookies.some(c=>c.name==='clinic_reset_recovery'&&c.httpOnly));assert.ok(!cookies.some(c=>c.name.startsWith('sb-')));
  if(fault==='owner-delivery')await page.evaluate(url=>fetch(url).catch(()=>null),`/api/rcap/packets/${RESUME.job}/download`);
  if(fault==='late-network')await page.evaluate(()=>fetch('https://unknown.invalid/no').catch(()=>null));
  if(fault==='pending-handler'){void page.evaluate(()=>fetch('/pending-handler').catch(()=>null)).catch(()=>{});await reached;}
  if(fault==='shutdown'){const close=browser.close.bind(browser);browser.close=async()=>{browser.close=close;await close();throw Error('shutdown failure')}}
  stage='browser_completion';const finish=activity.finish();release?.();await finish;activity.assertFinished();assert.deepEqual(violations,[]);assert.equal(service.count.closures,0);
  // All credential-bearing browser contexts and handlers have actually ended.
  // The exact HttpOnly close-only proof is now the sole closure credential.
  const jar=new Map(cookies.filter(c=>c.name.startsWith('clinic_reset_')).map(c=>[c.name,c.value]));
  if(fault==='wrong-participant')jar.set('clinic_session','unrelated-handoff');
  if(fault==='closure'||fault==='closure-recovery')service.faults.closure=true;
  if(fault==='lost-response-recovery')service.faults.lostClose=true;
  const endpoint=async action=>{const r=await fetch(service.origin+'/api/clinic/session/reset',{method:'POST',headers:{origin:service.origin,'content-type':'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify({action})});for(const c of r.headers.getSetCookie()){const [kv]=c.split(';'),at=kv.indexOf('=');if(/max-age=0/i.test(c))jar.delete(kv.slice(0,at));else jar.set(kv.slice(0,at),kv.slice(at+1));}return {status:r.status,...await r.json()};};
  stage='close';
  if(fault==='closure-recovery'){const failed=await endpoint('close');assert.equal(failed.status,409);assert.equal(failed.revocationConfirmed,false);assert.equal(service.count.closures,0);service.faults.closure=false;}
  if(fault==='lost-response-recovery'){await assert.rejects(endpoint('close'));console.log(JSON.stringify({fault,stage:'closure_response_lost',closureCommitted:'unknown_read_only_inventory_required'}));assert.equal((await service.snapshot()).sessionAudit.length,1);}
  const result=await endpoint('close');assert.equal(result.status,200);assert.equal(result.revocationConfirmed,true);closed=true;
  assert.equal((await endpoint('close')).success,true);assert.equal((await endpoint('complete')).success,true);assert.equal(jar.has('clinic_reset_pending'),false);
  stage='handover';const nextBrowser=await chromium.launch({headless:true});try{
   const nextActivity=createResumeBrowserLifecycle({browser:nextBrowser,handleRequest,violations});const c=await nextActivity.context({acceptDownloads:false});await installSignInSafety(c);const signed=await signInWithRealForm({context:c,origin:service.origin,email:'mvl-demo-participant-b@rcap-acceptance.test',password:service.password,next:'/briefcase'});assert.equal(signed.id,RESUME.stranger);const denied=await c.request.get(service.origin+`/api/rcap/packets/${RESUME.job}/download`);assert.equal(denied.status(),404);await nextActivity.finish();nextActivity.assertFinished();
  }finally{await nextBrowser.close();}
  assert.ok(!fault||recovering,'negative control must refuse');
 }catch(e){failure={stage,closureCommitted:closed,detail:String(e.message)};assert.ok(fault&&!recovering,JSON.stringify(failure));}
 finally{release?.();try{await activity.finish()}catch{}await browser.close();}
 const after=await service.snapshot();assert.equal(service.count.ownerDeliveryRequests,0);assert.equal(service.count.storageReads,0);assert.equal(service.count.deliveryWrites,0);assert.equal(after.delivery.length,6);
 assert.equal(after.sessionAudit.length,fault&&!recovering?0:1);assert.equal(service.count.closures,fault&&!recovering?0:1);assert.equal(after.assisted.status,fault&&!recovering?'active':'reset');
 console.log(JSON.stringify({source:'current product prepare/close/complete; no hosted binding',fault,passed:!failure,failure,counts:service.count,browser:activity.observations(),audits:after.sessionAudit.length}));await service.close();
});
