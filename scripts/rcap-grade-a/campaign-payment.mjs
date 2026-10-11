import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import path from 'node:path';import Stripe from 'stripe';
import {actorBrowser,record,origin,root,fixture,db,checked,write} from './campaign-support.mjs';
assert.ok(process.env.HOSTED_STRIPE_TEST_SECRET?.startsWith('sk_test_'));assert.ok(process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET?.startsWith('whsec_'));
const stripe=new Stripe(process.env.HOSTED_STRIPE_TEST_SECRET);const {completeHostedCheckout}=await import(pathToFileURL(path.resolve(`${root}/server/local-stripe-checkout-browser.mjs`)).href);
const {matterId}=JSON.parse(fs.readFileSync(`${root}/server/participant-packet-fixture.json`));const account=fixture('clinic-participant-development-access.private'),a=await actorBrowser('participant',account),p=a.page;
let sessionId;
try{
 if(process.env.RCAP_EXISTING_CHECKOUT_BLOCKER){
  // A known provider challenge must not trigger another automated payment or
  // a replacement Checkout Session. Recheck its real state without writing.
  const evidence=JSON.parse(fs.readFileSync(process.env.RCAP_EXISTING_CHECKOUT_BLOCKER));
  assert.equal(evidence.humanInteractionRequired,true);
  const challenged=await stripe.checkout.sessions.retrieve(evidence.sessionId);
  assert.equal(challenged.livemode,false);assert.equal(challenged.payment_status,'unpaid');
  await p.goto(`${origin}/briefcase/${matterId}/review`);
  await p.getByRole('button',{name:'Pay $50 and generate my packet',exact:true}).waitFor();
  await record(a,['U-T18','U-T19'],['Open the current candidate’s verified packet review','Read back the existing challenged Stripe TEST session without another payment attempt'],
   'New Checkout settlement remains blocked by Stripe human verification. No replacement session, challenge bypass, or payment result is manufactured.',
   {fixture:matterId,issue:'STRIPE_HUMAN_VERIFICATION_REQUIRED',sessionId:challenged.id,providerStatus:challenged.status,providerPaymentStatus:challenged.payment_status,priorEvidence:evidence.receipt},'BLOCKED');
  // Independent delivery/recovery can still use a genuinely paid test matter.
  const prior=JSON.parse(fs.readFileSync(evidence.paidFixture));
  const paid=await stripe.checkout.sessions.retrieve(prior.sessionId);
  assert.equal(paid.livemode,false);assert.equal(paid.payment_status,'paid');assert.equal(paid.amount_total,5000);
  assert.equal(paid.metadata.briefcase_item_id,prior.matterId);
  const stored=checked(await db.from('consumer_briefcase_items').select('payment_status,checkout_session_id,payment_intent_id').eq('id',prior.matterId).single());
  assert.equal(stored.payment_status,'paid');assert.equal(stored.checkout_session_id,paid.id);assert.equal(stored.payment_intent_id,paid.payment_intent);
  write('server/participant-paid-fixture.json',{...prior,provenance:'Existing genuine Stripe TEST settlement, reverified read-only for independent recovery/delivery; not a new-checkout PASS',providerPaymentStatus:paid.payment_status});
  await a.browser.close();process.exit(0);
 }
 if(process.env.RCAP_RECOVER_PAID_CHECKOUT==='true'){
  const prior=JSON.parse(fs.readFileSync(`${root}/server/stripe-checkout-session.json`));assert.equal(prior.matterId,matterId);sessionId=prior.sessionId;
 }else{
 await p.goto(`${origin}/briefcase/${matterId}/review`);await p.getByRole('button',{name:'Pay $50 and generate my packet',exact:true}).waitFor();
 let capturedBody;await p.route('**/api/expungement-ai/checkout',async route=>{const response=await route.fetch();capturedBody=await response.json();await route.fulfill({response});});const response=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/expungement-ai/checkout'));const cookies=await a.context.cookies();await p.getByRole('button',{name:'Pay $50 and generate my packet',exact:true}).click();const r=await response,body=capturedBody;assert.equal(r.status(),200,JSON.stringify(body));sessionId=body.checkoutSessionId;assert.ok(sessionId?.startsWith('cs_test_'));const session=await stripe.checkout.sessions.retrieve(sessionId);assert.equal(session.livemode,false);assert.equal(session.amount_total,5000);assert.equal(session.metadata.briefcase_item_id,matterId);
 write('server/stripe-checkout-session.json',{matterId,sessionId,amount:session.amount_total,status:session.status,productionWrites:0});
 const payment=await completeHostedCheckout({checkoutUrl:body.checkoutUrl,expectedReturnUrl:session.success_url.replace('{CHECKOUT_SESSION_ID}',sessionId),email:account.email,sessionCookies:cookies,screenshotDir:`${root}/journeys/participant/stripe`,label:'grade-a-checkout'});write('server/stripe-browser-result.json',payment);assert.equal(payment.completed,true,JSON.stringify(payment));
 }
 const paid=await stripe.checkout.sessions.retrieve(sessionId);assert.equal(paid.payment_status,'paid');assert.ok(paid.payment_intent);assert.equal(paid.amount_total,5000);
 // Transport the unmodified actual provider event to the isolated signed
 // webhook. This proves the real handler/reconciliation, not Stripe delivery
 // over a public tunnel. No payment or provider status is synthesized.
 let event;for(let i=0;i<10&&!event;i++){event=(await stripe.events.list({type:'checkout.session.completed',limit:30})).data.find(e=>e.data.object.id===sessionId);if(!event)await new Promise(r=>setTimeout(r,1000));}assert.ok(event);const payload=JSON.stringify(event);const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET});
 const unsigned=await a.context.request.post(origin+'/api/stripe/webhook',{headers:{'content-type':'application/json','stripe-signature':'invalid'},data:payload});assert.equal(unsigned.status(),400);
 const deliver=()=>a.context.request.post(origin+'/api/stripe/webhook',{headers:{'content-type':'application/json','stripe-signature':signature},data:payload});const webhook=await deliver();assert.equal(webhook.status(),200,await webhook.text());const replay=await deliver();assert.equal(replay.status(),200);
 const stored=checked(await db.from('consumer_briefcase_items').select('id,payment_status,amount_cents,checkout_session_id,payment_intent_id,provider_event_id').eq('id',matterId).single());assert.equal(stored.payment_status,'paid');assert.equal(stored.amount_cents,5000);assert.equal(stored.checkout_session_id,sessionId);assert.equal(stored.payment_intent_id,paid.payment_intent);
 await p.goto(`${origin}/briefcase/${matterId}`);await p.getByText(/Payment confirmed|Packet ready/i).first().waitFor();
 await record(a,['U-T18','U-T19'],['Verify owned packet facts','Click Pay $50 and generate my packet','Complete actual Stripe test Checkout','Read actual provider settlement','Deliver actual event through signed isolated webhook','Replay the same provider event','Return to owned matter'],'Stripe confirms one $50 test purchase; the protected webhook records it once and rejects an invalid signature.',{fixture:matterId,sessionId,eventId:event.id,amountCents:paid.amount_total,providerPaymentStatus:paid.payment_status,stored,webhookTransport:'Unmodified Stripe event signed and forwarded to isolated local application; no claim of Stripe network delivery'});
 write('server/participant-paid-fixture.json',{matterId,sessionId,eventId:event.id});
}catch(error){write('server/payment-campaign-failure.json',{matterId,sessionId,error:error.message,route:new URL(p.url()).pathname,text:(await p.locator('body').innerText()).slice(-3500)});throw error;}finally{await a.browser.close();}
