// One currently unique pending provider subject -> one exact hyfl SELECT. No mutation/evaluator/participant snapshot.
import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';
import{classify,transport}from'./rcap-dtc-stripe-pending-readonly.mjs';
const TYPES=['checkout.session.async_payment_succeeded','checkout.session.completed','invoice.finalized','invoice.paid','invoice.payment_failed','invoice.voided'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MANAGEMENT='https://api.supabase.com/v1/projects/hyflxnlhpmiqxvvcoiia/database/query';
export function exactPrewriteQuery(metadata){
 assert(UUID.test(metadata?.briefcase_item_id??'')&&UUID.test(metadata?.user_id??''));assert(/^[a-f0-9]{64}$/.test(metadata.verification_hash??''));
 return `BEGIN READ ONLY; SET LOCAL statement_timeout='15s';
WITH expected AS(SELECT '${metadata.briefcase_item_id}'::uuid item_id,'${metadata.user_id}'::uuid owner_id,'${metadata.verification_hash}'::text verification_hash),
item AS(SELECT b.id,b.payment_status FROM public.consumer_briefcase_items b JOIN expected e ON b.id=e.item_id AND b.user_id=e.owner_id),
verification AS(SELECT v.status,v.verification_hash FROM public.consumer_packet_verifications v JOIN expected e ON v.briefcase_item_id=e.item_id AND v.consumer_auth_user_id=e.owner_id JOIN item b ON b.id=e.item_id)
SELECT jsonb_build_object('readOnly',current_setting('transaction_read_only'),
'exactOwnedItemExists',EXISTS(SELECT 1 FROM item),
'verificationReaderSourceMatches',coalesce((SELECT p.provolatile='s' AND p.prosecdef AND l.lanname='sql' AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='683f34584700057c66546dfae8ae99dc081c6bbf8b694f88162619d78e66ea5d' FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure('public.get_consumer_packet_verification_authority(uuid,uuid)')),false),
'itemPaymentPaid',(SELECT payment_status='paid' FROM item),
'protectedVerificationExists',EXISTS(SELECT 1 FROM verification),
'protectedVerificationMarkedVerified',(SELECT status='verified' FROM verification),
'eventVerificationHashMatches',(SELECT v.verification_hash=e.verification_hash FROM verification v CROSS JOIN expected e)) AS prewrite;
COMMIT;`;
}
export function disposition(facts){
 assert.deepEqual(Object.keys(facts).sort(),['readOnly','exactOwnedItemExists','verificationReaderSourceMatches','itemPaymentPaid','protectedVerificationExists','protectedVerificationMarkedVerified','eventVerificationHashMatches'].sort());assert.equal(facts.readOnly,'on');for(const k of ['exactOwnedItemExists','verificationReaderSourceMatches','protectedVerificationExists'])assert.equal(typeof facts[k],'boolean');for(const k of ['itemPaymentPaid','protectedVerificationMarkedVerified','eventVerificationHashMatches'])assert(facts[k]===null||typeof facts[k]==='boolean');
 if(!facts.exactOwnedItemExists)return'PREWRITE_STOP_EXACT_METADATA_OWNER_ITEM_ABSENT';
 if(!facts.verificationReaderSourceMatches)return'UNKNOWN_NO_DECISIVE_PREWRITE_REFUSAL';
 if(!facts.protectedVerificationExists||facts.protectedVerificationMarkedVerified!==true)return'PREWRITE_STOP_VERIFICATION_CANNOT_PASS_OR_EARLIER_NO_WRITE_DUPLICATE';
 if(facts.eventVerificationHashMatches!==true)return'PREWRITE_STOP_PROVIDER_VERIFICATION_MISMATCH_OR_EARLIER_NO_WRITE_DUPLICATE';
 return'UNKNOWN_NO_DECISIVE_PREWRITE_REFUSAL';
}
export function managementRead(token,fetcher=fetch){assert(typeof token==='string'&&token.trim());let calls=0;return async metadata=>{assert.equal(++calls,1,'one exact read only');const query=exactPrewriteQuery(metadata);const r=await fetcher(MANAGEMENT,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query})});if(r.status!==200&&r.status!==201){const e=new Error('EXACT_READ_REFUSED');e.safeHttpStatus=r.status;throw e;}const rows=await r.json();assert(Array.isArray(rows)&&rows.length===1);const facts=rows[0]?.prewrite;disposition(facts);return facts;};}
export async function diagnose({get,readExact}){
 const result={schemaVersion:'saved-dtc-current-pending-prewrite-readonly/v1',status:'HOLD',priorObservationRun:40452676864,priorObservationSha256:'51beec4cbb7efa6c1a3de3c30a072a64e1ad932e62f949751ae0e198374bb832',priorClassificationRun:40453444817,priorClassificationSha256:'e84b53beb2c11404213c76c20c8d031a17d33de93d1acbec524d9de789d31246',originalSubjectIdentityPreserved:false,identityContinuity:'SAME_FROZEN_INTERVAL_UNIQUE_CURRENT_PENDING_CANDIDATE_NOT_EXACT_PRIOR_ID',customerWrites:0,providerWrites:0,retargetAllowed:false,workerAllowed:false,protectedArtifactEvaluated:false,verificationModelEvaluated:false};let phase='unique_current_pending';
 try{let cursor,pages=0,more=true;const candidates=[],seen=new Set();while(more&&pages<10){const q=new URLSearchParams({limit:'100','created[gte]':'1790485169','created[lte]':'1793077169',delivery_success:'false',...Object.fromEntries(TYPES.map((v,i)=>[`types[${i}]`,v])),...(cursor?{starting_after:cursor}:{})});const page=await get('https://api.stripe.com/v1/events?'+q);assert.equal(page.object,'list');assert(Array.isArray(page.data)&&page.data.length<=100);assert.equal(typeof page.has_more,'boolean');for(const e of page.data){assert(/^evt_[A-Za-z0-9]+$/.test(e.id??'')&&!seen.has(e.id));seen.add(e.id);assert.equal(e.livemode,false);assert(TYPES.includes(e.type));assert(Number.isSafeInteger(e.pending_webhooks)&&e.pending_webhooks>=0);if(e.pending_webhooks>0)candidates.push(e);}pages++;more=page.has_more;if(more){assert(page.data.length);cursor=page.data.at(-1).id;}}
 assert.equal(more,false);assert.equal(candidates.length,1);const event=candidates[0],subject=classify(event);assert.equal(subject.sourceEffect,'POTENTIAL_OTHER_CASE_PAYMENT_WRITE_AND_ENQUEUE_HOLD');assert.equal(subject.ownerMatchesScopedActor,false);for(const k of ['itemAndOwnerUuid','referenceMatchesItem','productMatches','verificationHashShape','modePayment','currencyUsd'])assert.equal(subject[k],true);assert.equal(subject.paymentState,'paid');result.subject=subject;result.pages=pages;
 phase='one_exact_hyfl_prewrite_select';const facts=await readExact(event.data.object.metadata);result.prewrite=facts;result.disposition=disposition(facts);result.status=result.disposition==='UNKNOWN_NO_DECISIVE_PREWRITE_REFUSAL'?'HOLD_UNKNOWN_PREWRITE_PATH':'READONLY_DECISIVE_PREWRITE_STOP_WINDOW_NOT_ADMITTED';
 }catch(e){result.failureStage=phase;result.errorClass='READONLY_CHECK_REFUSED';result.httpStatus=Number.isInteger(e.safeHttpStatus)?e.safeHttpStatus:null;}
 return result;
}
export async function main(env=process.env){const file=env.STRIPE_PENDING_EVIDENCE_FILE;assert(path.isAbsolute(file));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(file),0o700);const result=await diagnose({get:transport(env.HOSTED_STRIPE_TEST_SECRET),readExact:managementRead(env.SUPABASE_ACCESS_TOKEN)});const fd=fs.openSync(file,'wx',0o600);try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,JSON.stringify(result)+'\n');}finally{fs.closeSync(fd);}if(result.failureStage)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Exact current pending-event readonly precondition held.');process.exitCode=1;});
