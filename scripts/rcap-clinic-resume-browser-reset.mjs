// Browser-side device reset for the bounded Clinic resume, factored out of the
// hosted harness so the real Playwright sequence can be exercised against a
// local origin. Nothing here touches the database: the canonical session
// closure is a separate port that the contract invokes only after every
// result below has been asserted.
import assert from 'node:assert/strict';
export const PARTICIPANT_COOKIE=/^(sb-|clinic_|screening_|briefcase_)/;
export const STORAGE_AREAS=Object.freeze(['localStorage','sessionStorage','indexedDB','caches','serviceWorkers']);
export const HISTORY_WALK=Object.freeze(['goBack','goBack','goBack','goForward','goForward','goForward']);
export async function plantParticipantState(page){
 await page.evaluate(async()=>{localStorage.setItem('rcap-resume-reset','participant-a');sessionStorage.setItem('rcap-resume-reset','participant-a');await new Promise((resolve,reject)=>{const request=indexedDB.open('rcap-resume-reset',1);request.onsuccess=()=>{request.result.close();resolve(null);};request.onerror=()=>reject(request.error);});await caches.open('rcap-resume-reset');});
}
export async function serverReset(page){
 const reset=await page.evaluate(async()=>{const r=await fetch('/api/clinic/session/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason:'staff_reset'})});return {status:r.status,...await r.json()};});
 assert.equal(reset.status,200,'server reset must answer 200');assert.equal(reset.signOutConfirmed,true,'server reset must confirm sign-out');return reset;
}
// Runs the unchanged shipped helper inside the participant's document and
// observes only the document that replaces it. The helper rewrites history to
// the clean path before location.replace runs, so a URL wait on its own is
// satisfied by the participant's document; the marker below is destroyed with
// that document and its absence is the only proof that navigation completed.
export async function runShippedDeviceReset({page,owner,helperSource,cleanEntryPath,itemId,priorState}){
 assert.ok(priorState&&typeof priorState.localStorage==='object','storage inventory taken before the server reset required');
 const helper=helperSource.replace('export async function resetClinicDeviceState','async function resetClinicDeviceState');
 assert.notEqual(helper,helperSource,'shipped helper export required');
 await page.addScriptTag({content:helper+'\nwindow.rcapResumeReset=resetClinicDeviceState;'});
 await page.evaluate(()=>{window.rcapResumeResetDocument=true;});
 const helperReport=await page.evaluate(clean=>window.rcapResumeReset(window,clean),cleanEntryPath);
 await page.waitForFunction(()=>window.rcapResumeResetDocument!==true);
 await page.waitForURL(u=>u.pathname===cleanEntryPath);
 // Observe the clean entry only after it has initialized: its own client code
 // (the analytics tracker among it) runs after hydration and may write storage
 // that an early snapshot would miss. Then walk history and observe again, so
 // the final observation includes what a restored page recreates.
 await page.waitForLoadState('load');await page.waitForLoadState('networkidle');
 const afterEntryInit=await storageInventory(page);
 let historySafe=true;const historyTrail=[];
 for(const op of HISTORY_WALK){await page[op]({waitUntil:'domcontentloaded'});const pathname=new URL(page.url()).pathname;const leaked=(await page.locator('body').innerText()).includes(itemId);historyTrail.push(`${op}:${pathname}${leaked?':leaked':''}`);historySafe&&=pathname===cleanEntryPath&&!leaked;}
 await page.waitForLoadState('networkidle');
 const final=await storageInventory(page);
 const cookies=(await owner.cookies()).filter(c=>PARTICIPANT_COOKIE.test(c.name)).length;
 const allCookies=(await owner.cookies()).map(c=>c.name).sort();
 const delta=classifyStorageDelta(priorState,final),initDelta=classifyStorageDelta(priorState,afterEntryInit);
 return {signOutConfirmed:true,helperReport,cookies,allCookies,storage:storageCounts(final),storageAfterEntryInit:storageCounts(afterEntryInit),survived:[...new Set([...initDelta.survived,...delta.survived])].sort(),created:[...new Set([...initDelta.created,...delta.created])].sort(),doNotTrack:final.doNotTrack,historySafe,historyTrail};
}
// Full key inventory of the document's storage, so a later observation can say
// whether a value survived from before the reset or was created after it.
export async function storageInventory(page){
 return page.evaluate(async()=>({localStorage:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])),sessionStorage:Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)])),indexedDB:(await indexedDB.databases()).map(d=>d.name).filter(Boolean).sort(),caches:(await caches.keys()).sort(),serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length,cookies:Object.fromEntries(document.cookie.split(';').map(c=>c.trim()).filter(Boolean).map(c=>[c.slice(0,c.indexOf('=')<0?c.length:c.indexOf('=')),c.slice(c.indexOf('=')+1)])),doNotTrack:navigator.doNotTrack??null}));
}
export const storageCounts=inv=>({localStorage:Object.keys(inv.localStorage).length,sessionStorage:Object.keys(inv.sessionStorage).length,indexedDB:inv.indexedDB.length,caches:inv.caches.length,serviceWorkers:inv.serviceWorkers});
// A key is "survived" when it holds the exact value it held before the reset,
// "created" when it is new or holds a new value. Neither is excluded from the
// counts: the zero-storage requirement is asserted on the counts unchanged.
export function classifyStorageDelta(before,after){
 const survived=[],created=[];
 for(const area of ['localStorage','sessionStorage','cookies'])for(const [k,v] of Object.entries(after[area]??{}))((before?.[area]??{})[k]===v?survived:created).push(`${area==='cookies'?'cookie':area}.${k}`);
 for(const area of ['indexedDB','caches'])for(const name of after[area]??[])((before?.[area]??[]).includes(name)?survived:created).push(`${area}.${name}`);
 return {survived:survived.sort(),created:created.sort()};
}
// The bounded resume is a no-analytics run: the documented Do Not Track opt-out
// (docs/WEB_ANALYTICS.md, analyticsEnabled in src/lib/analytics/client.ts) is
// asserted to the application through the browser signal it reads, installed
// before any application script in every context. It is recorded in the
// evidence and scoped to this run; it does not stand in for the ordinary
// browser, whose default behaviour is proven and reported separately.
export const ANALYTICS_OPT_OUT_PROFILE=Object.freeze({fixture:'navigator.doNotTrack=1 installed by context init script before application scripts',scope:'bounded no-analytics Clinic resume only',closesOrdinaryBrowserRequirement:false,reference:'docs/WEB_ANALYTICS.md Privacy posture: Do Not Track honored'});
export async function applyAnalyticsOptOut(context){
 await context.addInitScript(()=>{Object.defineProperty(navigator,'doNotTrack',{get:()=>'1',configurable:true});});
 return ANALYTICS_OPT_OUT_PROFILE;
}
export function assertDeviceClean(r){
 assert.equal(r?.signOutConfirmed,true,'server reset must confirm sign-out');
 assert.equal(r.helperReport?.ok,true,`shipped reset helper reported failures: ${JSON.stringify(r.helperReport?.failures??null)}`);
 assert.equal(r.cookies,0,'participant cookies survived the reset');
 assert.deepEqual(r.survived??null,[],`prior participant state survived the reset: ${JSON.stringify(r.survived??null)}`);
 for(const area of STORAGE_AREAS)assert.equal(r.storageAfterEntryInit?.[area],0,`${area} not empty after the clean entry initialized (survived ${JSON.stringify(r.survived??null)}, created ${JSON.stringify(r.created??null)})`);
 for(const area of STORAGE_AREAS)assert.equal(r.storage?.[area],0,`${area} not empty after Back/Forward (survived ${JSON.stringify(r.survived??null)}, created ${JSON.stringify(r.created??null)})`);
 assert.equal(r.historySafe,true,`Back/Forward reached participant state: ${JSON.stringify(r.historyTrail??null)}`);
}
// The same-device handover proof probes the private download route. It runs
// only once the device is proven clean: with an uncleared owner session the
// first probe would not be a denial but another delivery.
export async function observeSameDeviceHandover({cleanup,owner,probe,signIn,strangerEmail,expectedStrangerId,downloadPath,missingPath}){
 assert.match(String(expectedStrangerId??''),/^[0-9a-f-]{36}$/,'pinned Participant B identity required');
 assertDeviceClean(cleanup);
 const revoked=await probe(owner,downloadPath);assert.ok([401,404].includes(revoked.status),`signed-out owner received ${revoked.status}`);
 const signed=await signIn(owner,strangerEmail,'/briefcase');
 // The identity the sign-in actually returned is checked against the pinned
 // Participant B BEFORE any protected packet request: a session that came back
 // as the original owner, or as anyone else, must never reach the download route.
 assert.equal(signed?.id??null,expectedStrangerId,'same-device sign-in must be the exact Participant B before any protected request');
 const stranger=await probe(owner,downloadPath);const missing=await probe(owner,missingPath);
 return {revokedStatus:revoked.status,strangerId:signed.id,sameDeviceStranger:stranger.status,strangerMatchesMissing:stranger.status===missing.status&&stranger.body===missing.body};
}
// The harness's own final steps, factored so the exact code path that writes
// the result and classifies a failure is testable without a hosted target.
export function finishResume({receipt,assertNoViolations,resultPath,write,setPhase}){
 setPhase('post_contract_checks');
 assertNoViolations();
 setPhase('result_write');
 write(resultPath,JSON.stringify(receipt,null,2)+'\n');
 setPhase('completed');
}
// Classify a failure from what is KNOWN: the recorded stages say whether the
// canonical closure was requested, committed and read back; the phase says
// whether the failure came from the contract, a post-contract check or the
// result write. A failure after a verified readback is never reported as a
// pre-reset failure, and a result write that threw is reported as unknown.
export function resumeFailureRecord({error,stages=[],phase='contract',redact=text=>String(text)}){
 const known=new Set(stages);
 const stage=error?.resumeStage??({post_contract_checks:'post_contract_check_failed',result_write:'result_write_failed',completed:'after_result_write'}[phase]??(known.size?`after_${stages[stages.length-1]}`:'before_browser_reset'));
 const closureCommitted=(known.has('closure_committed')||known.has('readback_verified')||['closure_committed','readback_failed','readback_verified'].includes(stage))?true:(stages[stages.length-1]==='closure_response_lost'||stage==='closure_response_lost')?'unknown_read_only_inventory_required':false;
 const readbackVerified=known.has('readback_verified');
 const resultWrite=phase==='completed'?'written':phase==='result_write'?'unknown_partial_or_absent':'not_attempted';
 return {schemaVersion:'rcap-clinic-resume-failure/v1',stage,phase,closureCommitted,readbackVerified,resultWrite,recordedStages:[...stages],error:redact(String(error?.message??error).split('\n')[0]),...(error?.recordError?{recordError:redact(error.recordError)}:{}),...(error?.evidenceWriteFailed?{evidenceWriteFailed:true}:{})};
}
// Best effort: a failure record that cannot be written falls back to the log
// and never replaces the original failure, which the caller still throws.
export function writeResumeFailureRecord({failure,failurePath,write,emit,redact=text=>String(text)}){
 const record={...failure};
 try{write(failurePath,JSON.stringify(record,null,2)+'\n');record.recordWritten=true;}
 catch(writeError){record.recordWritten=false;record.failureRecordWriteError=redact(String(writeError?.message??writeError).split('\n')[0]);}
 emit(JSON.stringify(record));
 return record;
}
export function redactSecrets(text,secrets=[]){
 let out=String(text);for(const secret of secrets.filter(s=>typeof s==='string'&&s.length>0))out=out.split(secret).join('[redacted]');
 return out.replace(/Bearer [A-Za-z0-9._~+/=-]+/g,'Bearer [redacted]');
}
