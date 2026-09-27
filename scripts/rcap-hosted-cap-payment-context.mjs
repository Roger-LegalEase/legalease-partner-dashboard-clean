import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAP_REASONS, fundingOutcome, assertContinuity } from './rcap-sponsored-funding-contract.mjs';
import { runContext } from './rcap-hosted-sponsor-cap.mjs';
export function loadCapPaymentInput(env=process.env) {
  if(!env.HOSTED_CAP_PAYMENT_INPUT)return null;
  const input=JSON.parse(fs.readFileSync(env.HOSTED_CAP_PAYMENT_INPUT,'utf8'));
  for(const [k,v] of Object.entries(runContext(env))) assert.equal(input[k],v,`cap payment context ${k}`);
  const o=input.observation;
  assert.ok(CAP_REASONS.includes(fundingOutcome(o.response,o.before,o.after)));
  assert.equal(env.HOSTED_STRIPE_PROMOTION_CODE ?? '','');
  assert.equal(env.HOSTED_STRIPE_EXPECTED_TOTAL_CENTS,'5000');
  assert.ok(input.email?.endsWith('@rcap-acceptance.test'));
  return input;
}
export async function currentCapPaymentMatter(input, {userId, readSnapshot, getItem, verify, canonicalMatterId}) {
  const before=input.observation.after;
  assert.equal(userId,before.item.user_id,'authenticated owner differs');
  const after=await readSnapshot(before.item.id);assertContinuity(before,after);
  assert.equal(after.funding[0]?.funding_mode,'dtc');
  assert.ok(CAP_REASONS.includes(after.funding[0]?.reason));
  assert.equal(after.sponsoredConsumed,0);assert.equal(after.sponsoredEntitlements,0);
  const item=await getItem(userId,before.item.id);assert.equal(item?.id,before.item.id);
  const verification=await verify(userId,item);
  assert.equal(verification.hash,before.verification.verification_hash);
  assert.equal(canonicalMatterId(item.id),before.verification.matter_id);
  assert.equal(verification.snapshot.pathwayId,before.verification.snapshot.pathwayId);
  assert.equal(verification.snapshot.jurisdiction,before.verification.snapshot.jurisdiction);
  return {item,verification};
}
