// Exact saved-case Stripe observations only. No mutation transport or execution admission.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {DTC} from './rcap-hosted-existing-dtc-continuation.mjs';

const ENDPOINT='we_1U4AKGRWROAHlAKyNFChAnWr';
export const EVENTS=Object.freeze(['checkout.session.async_payment_succeeded','checkout.session.completed','invoice.finalized','invoice.paid','invoice.payment_failed','invoice.voided']);
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const MAX_PAGES=10,MAX_RESPONSE_BYTES=4194304;
const VERIFICATION_HASH_SHA256='9cd5917e75506d774e462f4df3ae8d5d6d8290ab5359ca9c025238cc5ca272dd';
const id=(s,prefix)=>typeof s==='string'&&new RegExp('^'+prefix+'[A-Za-z0-9]+$').test(s);
export function allowedGet(url){
 const u=new URL(url);if(u.origin!=='https://api.stripe.com'||u.username||u.password||u.hash)return false;
 const keys=[...u.searchParams.keys()];if(new Set(keys).size!==keys.length)return false;
 const only=allowed=>keys.every(k=>allowed.includes(k));
 const times=()=>{const a=Number(u.searchParams.get('created[gte]')),b=Number(u.searchParams.get('created[lte]'));return Number.isInteger(a)&&Number.isInteger(b)&&a>0&&b>=a&&b-a<=30*86400&&b<=Math.floor(Date.now()/1000)+60;};
 if(u.pathname===`/v1/webhook_endpoints/${ENDPOINT}`||u.pathname===`/v1/products/${DTC.product}`)return keys.length===0;
 if(/^\/v1\/payment_intents\/pi_[A-Za-z0-9]+$/.test(u.pathname))return keys.length===0;
 if(/^\/v1\/checkout\/sessions\/cs_test_[A-Za-z0-9]+\/line_items$/.test(u.pathname))return only(['limit'])&&u.searchParams.get('limit')==='100';
 if(u.pathname==='/v1/prices')return only(['product','active','currency','type','limit','starting_after'])&&u.searchParams.get('product')===DTC.product&&u.searchParams.get('active')==='true'&&u.searchParams.get('currency')==='usd'&&u.searchParams.get('type')==='one_time'&&u.searchParams.get('limit')==='100'&&(!u.searchParams.has('starting_after')||id(u.searchParams.get('starting_after'),'price_'));
 if(u.pathname==='/v1/checkout/sessions')return times()&&only(['limit','created[gte]','created[lte]','starting_after'])&&u.searchParams.get('limit')==='100'&&['created[gte]','created[lte]'].every(k=>/^\d{10}$/.test(u.searchParams.get(k)??''))&&(!u.searchParams.has('starting_after')||id(u.searchParams.get('starting_after'),'cs_test_'));
 if(u.pathname==='/v1/events')return times()&&only(['limit','created[gte]','created[lte]','starting_after','delivery_success',...EVENTS.map((_,i)=>`types[${i}]`)])&&u.searchParams.get('limit')==='100'&&['created[gte]','created[lte]'].every(k=>/^\d{10}$/.test(u.searchParams.get(k)??''))&&EVENTS.every((v,i)=>u.searchParams.get(`types[${i}]`)===v)&&(!u.searchParams.has('delivery_success')||u.searchParams.get('delivery_success')==='false')&&(!u.searchParams.has('starting_after')||id(u.searchParams.get('starting_after'),'evt_'));
 return false;
}
export function createReadTransport(secret,fetcher=fetch){
 assert.match(secret??'',/^sk_test_[A-Za-z0-9]+$/);let calls=0;
 return async url=>{assert(allowedGet(url));assert(++calls<=40);const r=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${secret}`}});if(r.status!==200){const e=new Error('STRIPE_READ_FAILED');e.safeHttpStatus=r.status;throw e;}assert(r.body);const reader=r.body.getReader(),chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;assert(total<=MAX_RESPONSE_BYTES);chunks.push(Buffer.from(value));}}finally{await reader.cancel();}return JSON.parse(Buffer.concat(chunks).toString('utf8'));};
}
const caseMatch=o=>o?.metadata?.briefcase_item_id===DTC.item&&o?.metadata?.user_id===DTC.owner;
const caseConflict=o=>o?.metadata?.briefcase_item_id===DTC.item&&o?.metadata?.user_id!==DTC.owner;
const metadata=m=>Object.fromEntries(['briefcase_item_id','user_id','verification_hash','product_id','jurisdiction','pathway_id'].filter(k=>typeof m?.[k]==='string').map(k=>[k,m[k]]));
function projectRow(resource,r){
 if(resource==='checkout/sessions')return {...Object.fromEntries(['id','livemode','mode','currency','amount_total','amount_subtotal','status','payment_status','payment_intent'].map(k=>[k,r[k]])),total_details:{amount_discount:r.total_details?.amount_discount},metadata:metadata(r.metadata)};
 if(resource==='events')return{id:r.id,livemode:r.livemode,type:r.type,pending_webhooks:r.pending_webhooks,data:{object:{id:r.data?.object?.id,metadata:metadata(r.data?.object?.metadata)}}};
 return Object.fromEntries(['id','livemode','product','active','currency','type','unit_amount','recurring'].map(k=>[k,r[k]]));
}
export async function observe({get,now=Date.now()}){
 const until=Math.floor(now/1000),since=until-30*86400;
 const receipt={schemaVersion:'saved-dtc-stripe-readonly/v1',status:'HOLD',observedAt:new Date(now).toISOString(),customerWrites:0,providerWrites:0,retargetAllowed:false,workerAllowed:false,endpointSpecificRetryState:'UNAVAILABLE_FROM_SUPPORTED_EVENTS_GET',historyBeforeWindow:'UNVERIFIED',observationWindow:{since,until},capabilities:{eventRetentionDays:30,maxPagesPerList:MAX_PAGES,maxRowsPerPage:100,pendingWebhooksEndpointSpecific:false,failedDeliveryFilterEndpointSpecific:false,absenceProvesNoFutureIngress:false,invoiceHandlerMayMutateOtherCustomerState:true}};
 const list=async(resource,params,prefix)=>{const rows=[],seen=new Set();let more=true,pages=0,last;while(more&&pages<MAX_PAGES){const q=new URLSearchParams({...params,limit:'100',...(last?{starting_after:last}:{})});const page=await get(`https://api.stripe.com/v1/${resource}?${q}`);assert.equal(page.object,'list');assert(Array.isArray(page.data)&&page.data.length<=100);assert.equal(typeof page.has_more,'boolean');for(const r of page.data){assert(id(r.id,prefix));assert.equal(r.livemode,false);assert(!seen.has(r.id));seen.add(r.id);rows.push(projectRow(resource,r));}pages++;more=page.has_more;if(more){assert(page.data.length>0);last=page.data.at(-1).id;}}return{rows,pages,complete:!more};};
 let stage='endpoint';
 try{
  const endpoint=await get(`https://api.stripe.com/v1/webhook_endpoints/${ENDPOINT}`);assert.equal(endpoint.id,ENDPOINT);assert.equal(endpoint.livemode,false);assert.equal(endpoint.status,'enabled');assert.deepEqual([...endpoint.enabled_events].sort(),[...EVENTS].sort());
  const url=new URL(endpoint.url);assert.equal(url.protocol,'https:');assert(!url.username&&!url.password&&!url.hash);assert.equal(url.pathname,'/api/stripe/webhook');assert([...url.searchParams.keys()].length<=1);assert([...url.searchParams.keys()].every(k=>k==='x-vercel-protection-bypass'));
  receipt.endpoint={enabled:true,livemode:false,eventCount:6,urlSha256:hash(endpoint.url),urlClass:url.origin===DTC.origin?'ORIGINAL_SAVED_TARGET':url.hostname==='legalease-rcap-c0052e13d980-roger947s-projects.vercel.app'?'RECOVERED_CURRENT_TARGET':'OTHER_CANONICAL_HOST',bypassParameterPresent:url.searchParams.has('x-vercel-protection-bypass')};
  stage='catalog';const product=await get(`https://api.stripe.com/v1/products/${DTC.product}`);assert.equal(product.id,DTC.product);assert.equal(product.active,true);assert.equal(product.livemode,false);
  const prices=await list('prices',{product:DTC.product,active:'true',currency:'usd',type:'one_time'},'price_');const regular=prices.rows.filter(p=>p.product===DTC.product&&p.active===true&&p.currency==='usd'&&p.type==='one_time'&&p.unit_amount===5000&&!p.recurring);receipt.catalog={active:true,livemode:false,sourceCheckoutAmountCents:5000,currency:'usd',matchingStoredPriceCount:regular.length,storedPriceListExcludesInlinePrices:true,complete:prices.complete};
  stage='sessions';const sessions=await list('checkout/sessions',{'created[gte]':String(since),'created[lte]':String(until)},'cs_test_');const matched=sessions.rows.filter(caseMatch);assert(matched.length<=3,'existing objects require bounded recovery');assert.equal(sessions.rows.filter(caseConflict).length,0);const sessionIds=new Set(matched.map(s=>s.id));
  receipt.savedCase={matchingSessions:matched.length,sessionSetSha256:hash([...sessionIds].sort().join('\n')),paidSessions:0,openSessions:0,completeSessions:0,paymentIntents:0,paidAmountVerified:0,metadataConflicts:0};
  for(const s of matched){assert.equal(s.mode,'payment');assert.equal(s.currency,'usd');assert.equal(s.amount_total,5000);assert.equal(s.amount_subtotal,5000);assert.equal(s.total_details?.amount_discount,0);assert.equal(s.metadata.product_id,'expungement_packet');assert.equal(s.metadata.jurisdiction,'MS');assert.equal(s.metadata.pathway_id,'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal');assert.match(s.metadata.verification_hash??'',/^[a-f0-9]{64}$/);assert.equal(hash(s.metadata.verification_hash),VERIFICATION_HASH_SHA256);if(s.status==='open')receipt.savedCase.openSessions++;if(s.status==='complete')receipt.savedCase.completeSessions++;if(s.payment_status==='paid')receipt.savedCase.paidSessions++;
   const lines=await get(`https://api.stripe.com/v1/checkout/sessions/${s.id}/line_items?limit=100`);assert.equal(lines.object,'list');assert.equal(lines.has_more,false);assert.equal(lines.data.length,1);const line=lines.data[0];assert.equal(line.quantity,1);assert.equal(line.price?.product,DTC.product);assert.equal(line.amount_total,5000);
   if(s.payment_intent){assert(id(s.payment_intent,'pi_'));const pi=await get(`https://api.stripe.com/v1/payment_intents/${s.payment_intent}`);assert.equal(pi.id,s.payment_intent);assert.equal(pi.livemode,false);assert.equal(pi.currency,'usd');assert.equal(pi.amount,5000);receipt.savedCase.paymentIntents++;if(s.payment_status==='paid'){assert.equal(pi.status,'succeeded');assert.equal(pi.amount_received,5000);receipt.savedCase.paidAmountVerified++;}}
  }
  stage='events';const params={'created[gte]':String(since),'created[lte]':String(until),...Object.fromEntries(EVENTS.map((v,i)=>[`types[${i}]`,v]))};const events=await list('events',params,'evt_'),failed=await list('events',{...params,delivery_success:'false'},'evt_');
  const project=rows=>{let matching=0,pendingMatching=0,pendingOther=0,invoiceEvents=0,pendingInvoice=0,conflicts=0;const ids=[];for(const e of rows){assert(EVENTS.includes(e.type));assert(Number.isSafeInteger(e.pending_webhooks)&&e.pending_webhooks>=0);const o=e.data?.object;assert(o&&typeof o==='object');const match=caseMatch(o)||sessionIds.has(o.id);if(caseConflict(o)||(caseMatch(o)&&hash(o.metadata.verification_hash??'')!==VERIFICATION_HASH_SHA256))conflicts++;if(e.type.startsWith('invoice.')){invoiceEvents++;if(e.pending_webhooks>0)pendingInvoice++;}if(match){matching++;ids.push(e.id);if(e.pending_webhooks>0)pendingMatching++;}else if(e.pending_webhooks>0)pendingOther++;}return{matching,pendingMatching,pendingOther,invoiceEvents,pendingInvoice,metadataConflicts:conflicts,eventSetSha256:hash(ids.sort().join('\n'))};};
  receipt.events={allSixKinds:project(events.rows),failedAtLeastOneEndpoint:project(failed.rows),complete:events.complete&&failed.complete,deliveryScope:'ACCOUNT_EVENTS_NOT_ENDPOINT_DELIVERY_LOG'};
  receipt.pagination={sessions:{pages:sessions.pages,complete:sessions.complete},events:{pages:events.pages,complete:events.complete},failedEvents:{pages:failed.pages,complete:failed.complete},prices:{pages:prices.pages,complete:prices.complete}};
  receipt.status=receipt.events.allSixKinds.metadataConflicts||receipt.events.failedAtLeastOneEndpoint.metadataConflicts?'HOLD_METADATA_CONFLICT':prices.complete&&sessions.complete&&events.complete&&failed.complete?'READONLY_OBSERVATION_COMPLETE_WINDOW_NOT_ADMITTED':'HOLD_INCOMPLETE_OBSERVATION';
 }catch(e){receipt.failureStage=stage;receipt.errorClass='READONLY_CHECK_REFUSED';receipt.httpStatus=Number.isInteger(e.safeHttpStatus)?e.safeHttpStatus:null;}
 return receipt;
}
export async function main(env=process.env){
 const file=env.STRIPE_INGRESS_EVIDENCE_FILE;assert(path.isAbsolute(file));const parent=path.dirname(file);fs.mkdirSync(parent,{recursive:true,mode:0o700});fs.chmodSync(parent,0o700);
 const result=await observe({get:createReadTransport(env.HOSTED_STRIPE_TEST_SECRET)});fs.writeFileSync(file,JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});fs.chmodSync(file,0o600);if(!result.status.startsWith('READONLY_OBSERVATION_COMPLETE'))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Exact saved-case Stripe read-only observation held.');process.exitCode=1;});
