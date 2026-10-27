import assert from 'node:assert/strict';
import {DTC as ORIGINAL,assertMatter,hash} from './rcap-hosted-existing-dtc-continuation.mjs';
export {assertMatter,hash};
export const DTC=Object.freeze({...ORIGINAL,app:'c0052e13d9801d24080275aab02c70c6ea213fa3',tools:'987d0c9df170641a9abe40f0d5ec450e740abaa1',worker:'32499751569359315248c2048fa111064a47c67f',digest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',origin:'https://legalease-rcap-c0052e13d980-roger947s-projects.vercel.app',deploymentId:'dpl_4dcAZzgpzB71AFT3pPokeZzg7UA4'});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const requireEqual=(actual,expected,label)=>assert.deepEqual(actual,expected,label);
export function assertFulfillmentStage(stage){for(const key of ['app','tools','worker','digest','project','origin','deploymentId','item','owner'])assert.equal(stage[key],DTC[key]);assert.equal(stage.mode,'configured_sandbox_preview');assert.equal(stage.commercialMode,'staging_scoped');assert.equal(stage.webhookEndpointId,'we_1U4AKGRWROAHlAKyNFChAnWr');assert.equal(stage.testPurchaseReleased,true,'existing coordinator technical gate, not new business approval');}
export function currentBaseline(state){const baseline={item:DTC.item,owner:DTC.owner,revision:8,verificationHash:state.verification_hash,route:{pathwayId:state.route?.pathwayId,jurisdiction:state.route?.jurisdiction,profileVersion:state.route?.profileVersion,selectedTrackId:state.route?.selectedTrackId}};assert.equal(hash(JSON.stringify(baseline)),'8d77d260e07c810584cc23976aaaaf598452ca6002e399f24fa8bcfc80fb5e73');assertMatter(state,baseline);return baseline;}
export function assertSession(session, baseline, id, paid = false) {
  requireEqual(session.id, id); requireEqual(session.livemode, false);
  requireEqual(session.currency, 'usd'); requireEqual(session.amount_total, DTC.amount);
  requireEqual(session.mode, 'payment');
  requireEqual(session.metadata?.briefcase_item_id, DTC.item);
  requireEqual(session.metadata?.user_id, DTC.owner);
  requireEqual(session.metadata?.verification_hash, baseline.verificationHash);
  requireEqual(session.metadata?.pathway_id, baseline.route.pathwayId);
  requireEqual(session.metadata?.jurisdiction, 'MS');
  requireEqual(session.metadata?.product_id, 'expungement_packet');
  for (const key of ['person_id', 'matter_id']) assert.match(session.metadata?.[key] ?? '', uuid);
  const success = new URL(session.success_url);
  requireEqual(success.origin, DTC.origin); requireEqual(success.pathname, `/briefcase/${DTC.item}`);
  requireEqual(success.searchParams.get('payment'), 'return');
  requireEqual(success.searchParams.get('session_id'), '{CHECKOUT_SESSION_ID}');
  if (paid) { requireEqual(session.payment_status, 'paid'); requireEqual(session.status, 'complete'); }
}

export function assertJob(job, session, id) {
  requireEqual(job.id, id); requireEqual(job.consumer_briefcase_item_id, DTC.item);
  requireEqual(job.consumer_auth_user_id, DTC.owner); requireEqual(job.partner_id, null);
  requireEqual(job.person_id, session.metadata.person_id); requireEqual(job.matter_id, session.metadata.matter_id);
  requireEqual(job.consumer_verification_hash, session.metadata.verification_hash);
}
