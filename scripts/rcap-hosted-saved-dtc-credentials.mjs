// Literal-only custody reader; never import or execute the historical payment harness.
import assert from 'node:assert/strict';import {createHash}from'node:crypto';
export const CREDENTIAL_SOURCE=Object.freeze({commit:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',path:'scripts/rcap-hosted-acceptance-payment.mjs',sha256:'2f1cb63c403c33b1cf8e7ac737c4ee1bdc79b8703ee338faa2db8d36a841fa12'});
export function readSavedDtcCredentials(blob){
 assert(Buffer.isBuffer(blob));assert.equal(createHash('sha256').update(blob).digest('hex'),CREDENTIAL_SOURCE.sha256);const lines=blob.toString().split('\n');const owner=lines.find(line=>line.startsWith('const A = await signIn(CAP_INPUT?.email ?? '));const stranger=lines.filter(line=>line.startsWith('  : await signIn('));assert(owner&&stranger.length===1);
 const a=owner.match(/^const A = await signIn\(CAP_INPUT\?\.email \?\? "([^"\r\n]+)", CAP_INPUT \? process\.env\.HOSTED_CLINIC_DEMO_PASSWORD : "([^"\r\n]+)"\);$/);const b=stranger[0].match(/^  : await signIn\("([^"\r\n]+)", "([^"\r\n]+)"\);$/);assert(a&&b);for(const match of [a,b])assert(match[1].endsWith('@rcap-acceptance.test')&&match[2]);assert.notEqual(a[1],b[1]);const accounts={owner:{email:a[1],password:a[2]},stranger:{email:b[1],password:b[2]}};return async actor=>{assert(['owner','stranger'].includes(actor));return {...accounts[actor]};};
}
