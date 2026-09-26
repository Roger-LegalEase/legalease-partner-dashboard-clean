import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright';
import path from 'node:path';
import ts from 'typescript';
import {plantParticipantState,serverReset,runShippedDeviceReset,assertDeviceClean,observeSameDeviceHandover,redactSecrets,finishResume,resumeFailureRecord,writeResumeFailureRecord,storageInventory,applyAnalyticsOptOut,classifyStorageDelta,ANALYTICS_OPT_OUT_PROFILE} from './rcap-clinic-resume-browser-reset.mjs';
import {handleResumeRequest} from './rcap-clinic-resume-network-policy.mjs';
import {RESUME,assertBrowserCleanupBeforeClosure} from './rcap-clinic-resume-contract.mjs';
// The REAL analytics client and root tracker, transpiled from src exactly as the
// network-policy suite does. Only React's effect scheduler and Next's pathname
// hook are supplied; the identifiers, storage writes and POSTs are the shipped code.
function trackerBundle(){
 const modules={},entry='@/components/analytics/WebAnalyticsTracker',queue=[entry];
 while(queue.length){const id=queue.pop();if(modules[id])continue;const stem=path.join('src',id.slice(2));const file=fs.existsSync(stem+'.tsx')?stem+'.tsx':stem+'.ts';const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;modules[id]=code;for(const [,dep]of code.matchAll(/require\("(@\/[^\"]+)"\)/g))queue.push(dep);}
 return `const modules=${JSON.stringify(modules)},cache={};function require(id){if(id==='react')return {useEffect:fn=>fn()};if(id==='next/navigation')return {usePathname:()=>location.pathname};if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;new Function('require','module','exports',modules[id])(require,module,module.exports);return module.exports;}window.process={env:{}};require(${JSON.stringify(entry)}).WebAnalyticsTracker();`;
}
// The real Playwright sequence against a local origin that answers like the
// shipped reset route. `clearing:false` models a server that neither expires
// the HttpOnly session cookie nor sends Clear-Site-Data; `delayMs` models the
// navigation commit time of a remote Preview.
const adapterSource=fs.readFileSync(new URL('./rcap-clinic-resume-browser-reset.mjs',import.meta.url),'utf8');
const helperSource=fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8');
const cleanEntryPath='/clinic/mississippi-volunteer-lawyers-demo';
function origin({clearing=true,delayMs=0,tracker=null,hydrationDelayMs=400}={}){
 const server=http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/api/clinic/session/reset'){
   if(clearing){res.setHeader('Set-Cookie',['clinic_session','sb-hyflxnlhpmiqxvvcoiia-auth-token'].map(n=>`${n}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`));res.setHeader('Clear-Site-Data','"cache", "cookies", "storage"');}
   res.setHeader('Cache-Control','no-store, private, max-age=0, must-revalidate');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({success:true,signOutConfirmed:true}));
  }
  if(req.url.startsWith('/briefcase'))res.setHeader('Set-Cookie',['sb-hyflxnlhpmiqxvvcoiia-auth-token=owner; Path=/; HttpOnly','briefcase_hint=x; Path=/']);
  res.setHeader('Content-Type','text/html');
  const body=req.url.startsWith('/briefcase')?`<h1>Matter ${RESUME.item}</h1><a href="/api/rcap/packets/${RESUME.job}/download">Download</a>`:'<h1>Clinic entry</h1>';
  // With a tracker bundle, every page runs it eagerly; the clean entry runs it
  // again after a hydration-like delay, as a client-rendered root layout would.
  const scripts=tracker?`<script>${tracker}</script>`+(req.url.startsWith('/clinic')?`<script>setTimeout(function(){${tracker}},${hydrationDelayMs});</script>`:''):'';
  const send=()=>res.end(`<!doctype html><html><body>${body}${scripts}</body></html>`);
  if(req.url.startsWith('/clinic')&&delayMs)setTimeout(send,delayMs);else send();
 });
 return {server,url:async()=>{server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${server.address().port}`;},close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
async function participantOnDevice(browser,base,{optOut=true,route}={}){
 const owner=await browser.newContext();if(optOut)await applyAnalyticsOptOut(owner);if(route)await owner.route('**/*',route);const page=await owner.newPage();
 await page.goto(`${base}/briefcase`,{waitUntil:'networkidle'});await page.goto(`${base}/briefcase/${RESUME.item}`,{waitUntil:'networkidle'});
 await plantParticipantState(page);const priorState=await storageInventory(page);await serverReset(page);return {owner,page,priorState};
}
const mutantAdapter=async replacement=>{const mutant=adapterSource.replace(replacement.from,replacement.to);assert.notEqual(mutant,adapterSource,'mutation marker missing');return import('data:text/javascript;base64,'+Buffer.from(mutant.replace("from './","from '"+new URL('./',import.meta.url).href)).toString('base64'));};
test('document-navigation race: without the replaced-document wait the storage read is destroyed; the shipped adapter observes the clean document',async()=>{
 const site=origin({delayMs:300});const base=await site.url();let browser;
 try{
  browser=await chromium.launch({headless:true});
  const raced=await mutantAdapter({from:" await page.waitForFunction(()=>window.rcapResumeResetDocument!==true);\n",to:''});
  const {owner:racedOwner,page:racedPage,priorState:racedPrior}=await participantOnDevice(browser,base);
  await assert.rejects(raced.runShippedDeviceReset({page:racedPage,owner:racedOwner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState:racedPrior}),/Execution context was destroyed/);
  await racedOwner.close();
  const {owner,page,priorState}=await participantOnDevice(browser,base);
  assert.ok(Object.keys(priorState.localStorage).includes('rcap-resume-reset'),'the pre-reset inventory carries the planted participant key');
  const cleanup=await runShippedDeviceReset({page,owner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState});
  assertDeviceClean(cleanup);assert.equal(cleanup.helperReport.ok,true);assert.equal(cleanup.cookies,0);assert.deepEqual(cleanup.storage,{localStorage:0,sessionStorage:0,indexedDB:0,caches:0,serviceWorkers:0});assert.deepEqual(cleanup.storageAfterEntryInit,cleanup.storage);assert.deepEqual(cleanup.survived,[]);assert.deepEqual(cleanup.created,[]);assert.equal(cleanup.doNotTrack,'1');assert.equal(cleanup.historySafe,true);assert.equal(cleanup.historyTrail.length,6);
  assert.equal(new URL(page.url()).pathname,cleanEntryPath);await owner.close();
 }finally{await browser?.close();await site.close();}
});
test('a surviving HttpOnly participant cookie is counted, refuses the device, and stops the private-route probe before it runs',async()=>{
 const site=origin({clearing:false});const base=await site.url();let browser;
 try{
  browser=await chromium.launch({headless:true});const {owner,page,priorState}=await participantOnDevice(browser,base);
  const cleanup=await runShippedDeviceReset({page,owner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState});
  assert.ok(cleanup.cookies>=1,'the HttpOnly session cookie must survive a non-clearing reset');assert.equal(cleanup.doNotTrack,'1','the negative control runs under the same opt-out as the resume');
  assert.throws(()=>assertDeviceClean(cleanup),/participant cookies survived/);
  let probes=0;await assert.rejects(observeSameDeviceHandover({cleanup,owner,probe:async()=>{probes++;return {status:200,body:'bytes'};},signIn:async()=>({id:RESUME.stranger}),strangerEmail:'b@example.test',expectedStrangerId:RESUME.stranger,downloadPath:'/d',missingPath:'/m'}),/participant cookies survived/);
  assert.equal(probes,0,'no private-resource probe may run on an uncleared device');
  assert.throws(()=>assertBrowserCleanupBeforeClosure({...cleanup,revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true,violations:[],downloadRequests:0}),/participant cookies survived/);
  await owner.close();
 }finally{await browser?.close();await site.close();}
});
test('a helper without history neutralization leaves Back on the participant matter and refuses the device',async()=>{
 const site=origin();const base=await site.url();let browser;
 try{
  browser=await chromium.launch({headless:true});const {owner,page,priorState}=await participantOnDevice(browser,base);
  const marker='history.pushState(null, "", cleanEntryPath);\n    }';assert.ok(helperSource.includes(marker));
  const cleanup=await runShippedDeviceReset({page,owner,helperSource:helperSource.replace(marker,'}'),cleanEntryPath,itemId:RESUME.item,priorState});
  assert.equal(cleanup.historySafe,false);assert.ok(cleanup.historyTrail.some(step=>step.includes(':leaked')||!step.endsWith(cleanEntryPath)));
  // Reaching the participant page again also re-issues its cookies, so the
  // device is refused on whichever of the two real defects is checked first.
  assert.throws(()=>assertDeviceClean(cleanup),/participant cookies survived the reset|Back\/Forward reached participant state/);
  assert.throws(()=>assertDeviceClean({...cleanup,cookies:0,survived:[],storage:cleanDevice().storage,storageAfterEntryInit:cleanDevice().storage}),/Back\/Forward reached participant state/);
  await owner.close();
 }finally{await browser?.close();await site.close();}
});
const cleanDevice=()=>({signOutConfirmed:true,helperReport:{ok:true},cookies:0,storage:{localStorage:0,sessionStorage:0,indexedDB:0,caches:0,serviceWorkers:0},storageAfterEntryInit:{localStorage:0,sessionStorage:0,indexedDB:0,caches:0,serviceWorkers:0},survived:[],created:[],doNotTrack:'1',historySafe:true});
test('fourth finding: the real analytics client recreates identifiers on the clean entry in a default browser; the documented opt-out keeps storage empty; surviving participant state still fails under the opt-out',async()=>{
 const tracker=trackerBundle();const site=origin({tracker,hydrationDelayMs:400});const base=await site.url();let browser;
 const policy=(counter,violations)=>route=>{if(new URL(route.request().url()).pathname==='/api/analytics/web')counter.posts++;return handleResumeRequest(route,{origin:base,bypass:'synthetic',violations});};
 try{
  browser=await chromium.launch({headless:true});
  // 1. Default browser profile: no opt-out. Prior values are gone, but the clean
  //    entry creates fresh identifiers (and a first-party cookie) after cleanup;
  //    the analytics POSTs are answered locally and never leave the device.
  const defaults={posts:0},defaultViolations=[];
  const d=await participantOnDevice(browser,base,{optOut:false,route:policy(defaults,defaultViolations)});
  assert.ok(['le_vid','le_sid','le_sid_ts'].every(k=>k in d.priorState.localStorage),'the participant page ran the real tracker before the reset');
  const postsBeforeReset=defaults.posts;assert.ok(postsBeforeReset>=1);
  const defaultCleanup=await runShippedDeviceReset({page:d.page,owner:d.owner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState:d.priorState});
  assert.deepEqual(defaultCleanup.survived,[],'no prior participant value survives in the default profile either');
  assert.deepEqual(defaultCleanup.created,['cookie.le_vid','localStorage.le_sid','localStorage.le_sid_ts','localStorage.le_vid']);
  assert.equal(defaultCleanup.storageAfterEntryInit.localStorage,3);assert.equal(defaultCleanup.storage.localStorage,3);assert.equal(defaultCleanup.cookies,0,'the analytics cookie is not a participant cookie');assert.deepEqual(defaultCleanup.allCookies,['le_vid']);
  assert.ok(defaults.posts>postsBeforeReset,'the clean entry attempted analytics POSTs');assert.deepEqual(defaultViolations,[],'the POSTs were answered locally, not sent');
  assert.equal(defaultCleanup.doNotTrack,null);
  assert.throws(()=>assertDeviceClean(defaultCleanup),/localStorage not empty after the clean entry initialized \(survived \[\], created \["cookie\.le_vid","localStorage\.le_sid","localStorage\.le_sid_ts","localStorage\.le_vid"\]\)/);
  assert.throws(()=>assertBrowserCleanupBeforeClosure({...defaultCleanup,revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true,violations:[],downloadRequests:0}),/not empty after Back\/Forward/);
  await d.owner.close();
  // 2. The documented opt-out, installed before application scripts: the same
  //    real tracker writes nothing and sends nothing; storage stays empty after
  //    initialization and after Back/Forward, measured on the same counts.
  const optOut={posts:0},optOutViolations=[];
  const o=await participantOnDevice(browser,base,{optOut:true,route:policy(optOut,optOutViolations)});
  assert.ok(!('le_vid' in o.priorState.localStorage));assert.equal(optOut.posts,0);
  const optOutCleanup=await runShippedDeviceReset({page:o.page,owner:o.owner,helperSource,cleanEntryPath,itemId:RESUME.item,priorState:o.priorState});
  assertDeviceClean(optOutCleanup);assert.deepEqual(optOutCleanup.created,[]);assert.deepEqual(optOutCleanup.survived,[]);assert.equal(optOutCleanup.doNotTrack,'1');assert.equal(optOut.posts,0);assert.deepEqual(optOutViolations,[]);assert.deepEqual(optOutCleanup.allCookies,[]);
  assertBrowserCleanupBeforeClosure({...optOutCleanup,revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true,violations:[],downloadRequests:0});
  assert.equal(ANALYTICS_OPT_OUT_PROFILE.closesOrdinaryBrowserRequirement,false);
  await o.owner.close();
  // 3. Negative control under the opt-out: a helper that no longer clears
  //    localStorage leaves the planted participant value, which is reported as
  //    survived and refused; the opt-out does not mask real survival.
  const survivorMarker='  await step("localStorage", () => clearWebStorage(environment, "localStorage"));\n';assert.ok(helperSource.includes(survivorMarker));
  const s=await participantOnDevice(browser,base,{optOut:true,route:policy({posts:0},[])});
  // Clear-Site-Data already emptied storage at the server reset; re-plant the
  // participant value with its pre-reset content so only the helper stands between it and the next participant.
  await s.page.evaluate(v=>localStorage.setItem('rcap-resume-reset',v),s.priorState.localStorage['rcap-resume-reset']);
  const survivorCleanup=await runShippedDeviceReset({page:s.page,owner:s.owner,helperSource:helperSource.replace(survivorMarker,''),cleanEntryPath,itemId:RESUME.item,priorState:s.priorState});
  assert.deepEqual(survivorCleanup.survived,['localStorage.rcap-resume-reset']);assert.equal(survivorCleanup.doNotTrack,'1');
  assert.throws(()=>assertDeviceClean(survivorCleanup),/prior participant state survived the reset: \["localStorage\.rcap-resume-reset"\]/);
  assert.throws(()=>assertBrowserCleanupBeforeClosure({...survivorCleanup,revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true,violations:[],downloadRequests:0}),/prior participant state survived/);
  await s.owner.close();
  // 4. Classification is value-based: a re-created key with a new value is "created", the same value is "survived".
  assert.deepEqual(classifyStorageDelta({localStorage:{a:'1',b:'2'},sessionStorage:{},indexedDB:['db'],caches:[],cookies:{c:'1',e:'old'}},{localStorage:{a:'1',b:'3',n:'x'},sessionStorage:{},indexedDB:['db'],caches:['new'],cookies:{c:'1',d:'2',e:'new'}}),{survived:['cookie.c','indexedDB.db','localStorage.a'],created:['caches.new','cookie.d','cookie.e','localStorage.b','localStorage.n']});
 }finally{await browser?.close();await site.close();}
});
test('same-device handover: clean device first, then owner denial, Participant B identity and a missing-packet-identical response',async()=>{
 const cleanup=cleanDevice();
 const responses={'/d':[{status:401,body:'signed-out'},{status:404,body:'{"error":"not_found"}'}],'/m':[{status:404,body:'{"error":"not_found"}'}]};
 const order=[];const probe=async(_,route)=>{order.push(route);return responses[route].shift();};
 const handover=await observeSameDeviceHandover({cleanup,owner:{},probe,signIn:async(_,email)=>{order.push(`sign-in:${email}`);return {id:RESUME.stranger};},strangerEmail:'mvl-demo-participant-b@rcap-acceptance.test',expectedStrangerId:RESUME.stranger,downloadPath:'/d',missingPath:'/m'});
 assert.deepEqual(order,['/d','sign-in:mvl-demo-participant-b@rcap-acceptance.test','/d','/m']);
 assert.deepEqual(handover,{revokedStatus:401,strangerId:RESUME.stranger,sameDeviceStranger:404,strangerMatchesMissing:true});
 assertBrowserCleanupBeforeClosure({...cleanup,...handover,violations:[],downloadRequests:0});
 for(const bad of [{strangerId:RESUME.owner},{sameDeviceStranger:200},{strangerMatchesMissing:false},{revokedStatus:200},{violations:['POST /api/other']},{downloadRequests:1}])assert.throws(()=>assertBrowserCleanupBeforeClosure({...cleanup,...handover,violations:[],downloadRequests:0,...bad}),JSON.stringify(bad));
 await assert.rejects(observeSameDeviceHandover({cleanup,owner:{},probe:async()=>({status:200,body:'bytes'}),signIn:async()=>({id:RESUME.stranger}),strangerEmail:'b',expectedStrangerId:RESUME.stranger,downloadPath:'/d',missingPath:'/m'}),/signed-out owner received 200/);
 await assert.rejects(observeSameDeviceHandover({cleanup,owner:{},probe:async()=>({status:401,body:''}),signIn:async()=>({id:RESUME.stranger}),strangerEmail:'b',downloadPath:'/d',missingPath:'/m'}),/pinned Participant B identity required/);
});
test('identity before protected probe: an original-owner, unrelated or missing sign-in identity stops before any post-sign-in packet request',async()=>{
 for(const [label,returned] of [['original owner',{id:RESUME.owner}],['unrelated user',{id:'11111111-1111-4111-8111-111111111111'}],['missing id',{}],['null sign-in',null]]){
  const order=[];let afterSignIn=false,probesAfterSignIn=0;
  const probe=async(_,route)=>{order.push(route);if(afterSignIn)probesAfterSignIn++;return {status:401,body:'signed-out'};};
  await assert.rejects(observeSameDeviceHandover({cleanup:cleanDevice(),owner:{},probe,signIn:async()=>{order.push('sign-in');afterSignIn=true;return returned;},strangerEmail:'b',expectedStrangerId:RESUME.stranger,downloadPath:'/d',missingPath:'/m'}),/exact Participant B before any protected request/,label);
  assert.deepEqual(order,['/d','sign-in'],label);assert.equal(probesAfterSignIn,0,`${label}: no protected probe after a wrong identity`);
 }
});
test('final result write and outer catch: known closure/readback state is preserved, an unknown write outcome stays unknown, and the original failure survives a failed failure-record write',()=>{
 const stages=['browser_checks_passed','closure_requested','closure_committed','readback_verified'];
 const phases=[];const setPhase=next=>phases.push(next);
 // 1. the final result write itself throws after a verified readback
 let phase='contract';const track=next=>{phase=next;setPhase(next);};
 const noViolations=()=>assert.deepEqual([],[]);
 assert.throws(()=>finishResume({receipt:{passed:true},assertNoViolations:noViolations,resultPath:'/evidence/clinic-resume-result.json',write:()=>{throw new Error('ENOSPC: no space left on device, write');},setPhase:track}),/ENOSPC/);
 assert.deepEqual(phases,['post_contract_checks','result_write']);
 const writeFailure=resumeFailureRecord({error:new Error('ENOSPC: no space left on device, write'),stages,phase});
 assert.equal(writeFailure.stage,'result_write_failed');assert.equal(writeFailure.closureCommitted,true);assert.equal(writeFailure.readbackVerified,true);assert.equal(writeFailure.resultWrite,'unknown_partial_or_absent');assert.deepEqual(writeFailure.recordedStages,stages);
 assert.notEqual(writeFailure.stage,'before_browser_reset');assert.notEqual(writeFailure.closureCommitted,false);
 // 2. an outer post-contract check fails after a verified readback
 phase='contract';phases.length=0;
 assert.throws(()=>finishResume({receipt:{},assertNoViolations:()=>assert.deepEqual(['POST /api/other'],[],'resume attempted a forbidden request'),resultPath:'/r',write:()=>{throw new Error('must not write');},setPhase:track}),/forbidden request/);
 const checkFailure=resumeFailureRecord({error:new Error('forbidden request'),stages,phase});
 assert.equal(checkFailure.stage,'post_contract_check_failed');assert.equal(checkFailure.closureCommitted,true);assert.equal(checkFailure.resultWrite,'not_attempted');assert.deepEqual(phases,['post_contract_checks']);
 // 3. a successful path writes once and ends in the completed phase
 const written=[];phase='contract';finishResume({receipt:{passed:true},assertNoViolations:noViolations,resultPath:'/r',write:(p,body)=>written.push([p,JSON.parse(body)]),setPhase:track});assert.deepEqual(written,[['/r',{passed:true}]]);assert.equal(phase,'completed');
 // 4. contract failures keep their own stage; a lost closure response stays unknown; a pre-reset failure stays false
 const lost=Object.assign(new Error('socket hang up'),{resumeStage:'closure_response_lost'});
 assert.equal(resumeFailureRecord({error:lost,stages:['browser_checks_passed','closure_requested','closure_response_lost'],phase:'contract'}).closureCommitted,'unknown_read_only_inventory_required');
 const early=resumeFailureRecord({error:new Error('RCAP_BROWSER_BASE_URL required'),stages:[],phase:'contract'});assert.equal(early.stage,'before_browser_reset');assert.equal(early.closureCommitted,false);assert.equal(early.resultWrite,'not_attempted');
 const untagged=resumeFailureRecord({error:new Error('browser closed'),stages:['browser_checks_passed','closure_requested','closure_committed'],phase:'contract'});assert.equal(untagged.stage,'after_closure_committed');assert.equal(untagged.closureCommitted,true);
 // 5. the failure record cannot be written: fallback emits it, the original failure is untouched
 const original=Object.assign(new Error('database query HTTP 502 secret-token-value'),{resumeStage:'readback_failed'});const redact=text=>String(text).split('secret-token-value').join('[redacted]');
 const failure=resumeFailureRecord({error:original,stages,phase:'contract',redact});const emitted=[];
 const record=writeResumeFailureRecord({failure,failurePath:'/evidence/clinic-resume-failure.json',write:()=>{throw new Error('EROFS: read-only file system');},emit:line=>emitted.push(line),redact});
 assert.equal(record.recordWritten,false);assert.match(record.failureRecordWriteError,/EROFS/);assert.equal(record.stage,'readback_failed');assert.equal(record.closureCommitted,true);
 assert.equal(emitted.length,1);const parsed=JSON.parse(emitted[0]);assert.equal(parsed.error,'database query HTTP 502 [redacted]');assert.equal(parsed.failureRecordWriteError,record.failureRecordWriteError);
 assert.equal(original.message,'database query HTTP 502 secret-token-value');assert.equal(original.resumeStage,'readback_failed');assert.deepEqual(failure.stage,'readback_failed');assert.equal('failureRecordWriteError' in failure,false,'the fallback must not rewrite the original failure record');
 const ok=writeResumeFailureRecord({failure,failurePath:'/f',write:()=>{},emit:()=>{}});assert.equal(ok.recordWritten,true);
});
test('evidence redaction removes supplied secrets and bearer tokens',()=>{
 assert.equal(redactSecrets('Authorization: Bearer abc.def-ghi failed for pw=hunter2 bypass=xyz',['hunter2','xyz','']),'Authorization: Bearer [redacted] failed for pw=[redacted] bypass=[redacted]');
});
