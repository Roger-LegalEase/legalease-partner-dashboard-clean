// Runtime metadata from the two existing owner-approved grants; never participant, funding or execution authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const admitted=new WeakSet();
const approved=new Set(['b33784d8509264f03466a379ac52028dc943477489ca4b9a4f1de94f3d7578f5','316a211790dbdaca3bd260beac0a854076ebed618390b339b1d68b6a40381ebb']);
export function createSponsoredWorkerRuntimeContext(decisionBytes){
 const grant=JSON.parse(decisionBytes);assert(approved.has(createHash('sha256').update(JSON.stringify(grant)).digest('hex')),'Only an existing source-approved sponsored grant may provide runtime metadata');
 const context=Object.freeze({VERCEL_ENV:'preview',RCAP_SPONSORED_PREVIEW_CHANNEL:grant.channel,RCAP_CONSUMER_DELIVERY_ROUTE_STATE:grant.routeState,RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:grant.participantUserIds.join(',')});admitted.add(context);return context;
}
export function assertSponsoredWorkerRuntimeContext(context){assert(admitted.has(context),'Arbitrary runtime context is not accepted');return context;}
