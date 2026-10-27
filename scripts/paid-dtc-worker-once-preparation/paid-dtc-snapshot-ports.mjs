// Concrete read-only parsers/ports. No default client, credentials, snapshots-to-public-artifact, or execution entry point.
import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
import{bindPaidReadOnlyTemplates,validatePaidTarget}from'./paid-dtc-worker-once.mjs';import{buildActualPaidTarget,assertActualPaidPoststate}from'./paid-dtc-actual-target.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const one=(rows,name)=>{assert(Array.isArray(rows)&&rows.length===1);assert(rows[0]&&typeof rows[0]==='object');return rows[0][name];};
export function unrelatedRenderHistoryQuery(target){validatePaidTarget(target);return`BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SET LOCAL TIME ZONE 'UTC';
SELECT jsonb_build_object(
'creditLedger',(SELECT jsonb_build_object('rows',count(*),'sha256',encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(l.id,l.entitlement_id,l.partner_id,l.person_id,l.matter_id,l.render_job_id,l.event_type,l.consumption_unit_hash,l.created_at) ORDER BY l.id)::text,'[]'),'UTF8')),'hex')) FROM public.packet_credit_ledger l WHERE l.render_job_id IS DISTINCT FROM '${target.jobId}'::uuid),
'consumerPaymentConsumption',(SELECT jsonb_build_object('rows',count(*),'sha256',encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(c.id,c.consumer_briefcase_item_id,c.consumer_auth_user_id,c.provider_event_id,c.person_id,c.matter_id,c.first_render_job_id,c.consumption_unit_hash,c.created_at,c.product_id,c.checkout_session_id,c.amount_cents,c.currency) ORDER BY c.id)::text,'[]'),'UTF8')),'hex')) FROM public.consumer_packet_payment_consumption c WHERE c.first_render_job_id IS DISTINCT FROM '${target.jobId}'::uuid),
'deliveryEvents',(SELECT jsonb_build_object('rows',count(*),'sha256',encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(e.id,e.render_job_id,e.event_type,e.actor_user_id,e.created_at) ORDER BY e.id)::text,'[]'),'UTF8')),'hex')) FROM public.packet_delivery_events e WHERE e.render_job_id IS DISTINCT FROM '${target.jobId}'::uuid)
) AS unrelated_render_control_history; COMMIT;`;}
export function createActualPaidReceiptAssertion({getActualPaidInputs}){
 assert.equal(typeof getActualPaidInputs,'function');return async({target})=>{const{actualArgs,custody}=await getActualPaidInputs();assert.deepEqual(buildActualPaidTarget(actualArgs,custody),target);};
}
export function createPaidDtcSnapshotPort({queryRows,readTargetJobAndProvenance,assertServiceRoleTargetIdentity,checkpoint}){
 for(const f of [queryRows,readTargetJobAndProvenance,assertServiceRoleTargetIdentity,checkpoint])assert.equal(typeof f,'function');let initial=null,finished=false;
 return async({stage,target,window,sql})=>{
  validatePaidTarget(target);assert(['prestate','poststate'].includes(stage));assert.equal(finished,false);assert.equal(initial===null,stage==='prestate');await assertServiceRoleTargetIdentity();
  const expected=bindPaidReadOnlyTemplates(target,window);assert.deepEqual(sql,expected);const completeSql=Object.entries(expected).find(([f])=>f.includes('COMPLETENESS'))[1],joinSql=expected['PAID-DTC-TARGET-JOIN.TEMPLATE.NOT-EXECUTED.sql'];
  const aggregateSql=fs.readFileSync(new URL('./GLOBAL-BUCKET-RPC-AGGREGATE.READONLY.NOT-EXECUTED.sql',import.meta.url),'utf8'),claimSql=fs.readFileSync(new URL('./GLOBAL-CLAIM-STATE.READONLY.NOT-EXECUTED.sql',import.meta.url),'utf8');
  assert.equal(hash(aggregateSql),'ff6f8fe32e6671746e0cbeffa8c676d11b7223aada7c187b78f7344abf1bd6b2');assert.equal(hash(claimSql),'843475c818549d201ee5d16d765b8ba8a8d741d180130cad4bb5f3438456428a');
  const queries=[aggregateSql,completeSql,joinSql,claimSql,unrelatedRenderHistoryQuery(target)];for(const q of queries){assert(/^(?:--[^\n]*\n)*BEGIN READ ONLY;/.test(q));assert(!/\b(?:INSERT|UPDATE|DELETE|CALL)\b/.test(q));}
  const [aggRows,completeRows,targetRows,claimRows,historyRows,details]=await Promise.all([...queries.map(q=>queryRows(q)),readTargetJobAndProvenance({target})]);
  const aggregate=one(aggRows,'private_bucket_and_queue_snapshot'),completeness=one(completeRows,'global_queue_window_completeness'),join=one(targetRows,'actual_paid_dtc_target_binding'),history=one(historyRows,'unrelated_render_control_history');
  assert.equal(aggregate.executionContext.transaction_read_only,'on');assert.equal(completeness.readOnly,'on');assert.equal(join.readOnly,'on');assert(Array.isArray(claimRows));const claimState=new Map();for(const row of claimRows){assert(UUID.test(row.id??'')&&!claimState.has(row.id));claimState.set(row.id,row);}
  assert.equal(aggregate.aggregate.totalRows,claimState.size);assert(details?.job);assert.equal(details.job.id,target.jobId);assert.equal(details.job.packet_id,target.packetId);assert.equal(details.job.consumer_briefcase_item_id,target.itemId);assert.equal(details.job.consumer_auth_user_id,target.ownerId);assert.equal(details.job.input_hash,target.inputHash);
  for(const entry of Object.values(history)){assert(Number.isSafeInteger(entry.rows)&&entry.rows>=0);assert(/^[a-f0-9]{64}$/.test(entry.sha256));}
  const state={projectRef:'hyflxnlhpmiqxvvcoiia',serviceRoleTargetIdentityVerified:true,targetReceiptSha256:target.protectedReceiptSha256,readOnly:true,bucket:aggregate.bucket,currentQueueRpcBodies:aggregate.currentQueueRpcBodies,aggregate:aggregate.aggregate,completeness,claimState,target:join,targetJobStatus:details.job.status};
  if(stage==='prestate'){initial={historySha256:hash(JSON.stringify(history)),ids:new Set(claimState.keys())};}
  else{
   Object.assign(state,assertActualPaidPoststate({target,job:details.job,provenance:details.provenance}));state.finalizedTargetOnly=details.job.status==='artifact_validated'&&details.job.id===target.jobId;state.unrelatedHistoryUnchanged=initial.historySha256===hash(JSON.stringify(history));state.surpriseIngressCount=[...claimState.keys()].filter(id=>!initial.ids.has(id)).length;finished=true;
  }
  // Safe receipt only. Exact rows/provenance/provider/case values stay in the controlled process.
  await checkpoint({schemaVersion:'paid-dtc-snapshot-safe/v1',stage,targetReceiptSha256:target.protectedReceiptSha256,readOnly:true,claimRows:claimState.size,claimStateSha256:hash(JSON.stringify([...claimState])),unrelatedRenderHistorySha256:hash(JSON.stringify(history)),aggregate:state.aggregate,completeness:state.completeness,targetCounts:join,privateBucket:state.bucket.privateExactlyOnce,rpcBodies:state.currentQueueRpcBodies.map(({name,prosrcSha256})=>({name,prosrcSha256}))});
  return state;
 };
}
