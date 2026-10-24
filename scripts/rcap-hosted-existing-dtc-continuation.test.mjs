import test from 'node:test';
import assert from 'node:assert/strict';
import { DTC, hash, payAndQueue, verifyDelivery, matterQuery, runtime, preflightPaymentReceipts } from './rcap-hosted-existing-dtc-continuation.mjs';
const clone = x => structuredClone(x);
const jobId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const baseline = { item: DTC.item, owner: DTC.owner, revision: 8, verificationHash: 'a'.repeat(64),
    route: { jurisdiction: 'MS', pathwayId: 'fixture-ms-nonconviction', selectedTrackId: 'fixture-dismissal', profileVersion: 'fixture-v1' } };
  const stage = { ...Object.fromEntries(['app','tools','worker','digest','project','origin'].map(k => [k,DTC[k]])),
    mode: 'configured_sandbox_preview', commercialMode: 'staging_scoped', deploymentId: 'dpl_MOCKONLY',
    item: DTC.item, owner: DTC.owner, testPurchaseReleased: true, webhookEndpointId: 'we_1U4AKGRWROAHlAKyNFChAnWr' };
  const metadata = { briefcase_item_id: DTC.item, user_id: DTC.owner, verification_hash: baseline.verificationHash,
    pathway_id: baseline.route.pathwayId, jurisdiction: 'MS', person_id: jobId, matter_id: jobId, product_id: 'expungement_packet' };
  const session = { id: 'cs_test_MOCKONLY', livemode: false, currency: 'usd', amount_total: 5000, mode: 'payment', metadata,
    success_url: `${DTC.origin}/briefcase/${DTC.item}?payment=return&session_id={CHECKOUT_SESSION_ID}`,
    url: 'https://checkout.stripe.com/c/pay/MOCKONLY', status: 'open', payment_intent: 'pi_MOCKONLY' };
  const state = { id: DTC.item, user_id: DTC.owner, status: 'verified', revision: 8, verification_hash: baseline.verificationHash,
    route: baseline.route, sponsored_count: 0, checkout_session_id: null, job_count: 0, payment_status: 'unpaid' };
  const paid = { ...state, payment_status: 'paid', payment_authority: 'server_webhook', payment_valid: true,
    checkout_session_id: session.id, provider_event_id: 'evt_MOCKONLY', payment_person_id: jobId, payment_matter_id: jobId, payment_product_id: 'expungement_packet' };
  const bytes = Buffer.from('%PDF-1.7\nmock bytes only; not document acceptance');
  const job = { id: jobId, consumer_briefcase_item_id: DTC.item, consumer_auth_user_id: DTC.owner, partner_id: null,
    person_id: jobId, matter_id: jobId, consumer_verification_hash: baseline.verificationHash,
    status: 'artifact_validated', delivery_eligibility: 'eligible', accounting_result: 'consumed',
    output_sha256: hash(bytes), output_byte_count: bytes.length, page_count: 1,
    output_storage_path: `packet-artifacts/consumer/${jobId}/${jobId}/${hash(bytes)}.pdf` };
  const calls = []; let completed = false;
  const io = {
    preflightPayment: async () => calls.push('preflight'), verifyTarget: async () => calls.push('target'), readMatter: async () => state,
    app: async (url, actor, body) => {
      calls.push([url,actor,body]);
      if (url.endsWith('/checkout')) return { status:200, json: { briefcaseItemId:DTC.item, amountCents:5000, currency:'usd', mode:'stripe', alreadyPaid:false, paymentPending:false, checkoutSessionId:session.id, checkoutUrl:session.url } };
      if (url.endsWith('/render')) return { status:202, json:{ briefcaseItemId:DTC.item, jobId } };
      return { status:actor === 'owner'||actor==='freshOwner'?200:404, contentType:actor === 'owner'||actor==='freshOwner'?'application/pdf':'application/json', fromProtectionLayer:false,
        bytes: actor === 'owner'||actor==='freshOwner'?bytes:Buffer.from('{}') };
    },
    save: async (label, value) => calls.push(['save',label,clone(value)]),
    session: async () => ({ ...session, ...(completed?{ status:'complete', payment_status:'paid' }:{}) }),
    lineItems: async () => ({ has_more:false, data:[{ price:{product:DTC.product}, quantity:1, amount_total:5000 }] }),
    completeCheckout: async () => { calls.push('browser'); completed=true; return { completed:true, notes:['card number: filled','card expiry: filled','card cvc: filled'] }; },
    paymentIntent: async () => ({ id:'pi_MOCKONLY', livemode:false, status:'succeeded', amount_received:5000, currency:'usd' }),
    waitPaid: async () => paid,
    event: async () => ({ id:'evt_MOCKONLY', livemode:false, type:'checkout.session.completed', data:{object:{id:session.id,payment_intent:'pi_MOCKONLY'}} }),
    readJob: async () => job,
    readProvenance: async () => ({ render_job_id:jobId,consumer_auth_user_id:DTC.owner,matter_id:jobId,verification_hash:baseline.verificationHash,entitlement_source:'consumer_payment' }),
    savePdf: async () => calls.push('savePdf'), publicObject: async () => ({ status:404,bytes:Buffer.from('{}'),contentType:'application/json' })
  };
  const worker = { jobId,project:DTC.project,worker:DTC.worker,digest:DTC.digest,nativeExitCode:0,exclusiveWindowConfirmed:true,otherClaimableOrRecoverableJobs:0 };
  return { stage, baseline, session, state, paid, job, bytes, io, calls, worker, setCompleted:()=>{completed=true;} };
}
test('mock-only: same verified case, actual response job, worker not launched', async () => {
  const f=fixture(); const result=await payAndQueue(f,f.io);
  assert.equal(result.jobId,jobId); assert.equal(result.status,'awaiting-separately-authorized-worker');
  assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0].endsWith('/checkout')).length,1);
  assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0].endsWith('/render')).length,1);
  assert.ok(f.calls.findIndex(x=>x[0]==='save'&&x[1]==='checkout-created')<f.calls.indexOf('browser'));
  assert.ok(!JSON.stringify(f.calls).includes('/screening/'));
});
for (const [label,change] of [
  ['closed preview',f=>{f.stage.deploymentId=DTC.closedDeployment;}],
  ['wrong app',f=>{f.stage.app='0'.repeat(40);}],
  ['unreleased purchase',f=>{f.stage.testPurchaseReleased=false;}],
  ['different owner',f=>{f.state.user_id=DTC.stranger;}],
  ['stale verification',f=>{f.state.revision=7;}],
  ['changed route',f=>{f.state.route={...f.state.route,selectedTrackId:'changed'};}],
  ['prior checkout',f=>{f.state.checkout_session_id='cs_test_OLD';}],
  ['prior payment',f=>{f.state.payment_status='paid';}],
  ['prior job',f=>{f.state.job_count=1;}],
  ['sponsored funding',f=>{f.state.sponsored_count=1;}]
]) test(`refuses ${label} before checkout`,async()=>{
  const f=fixture();change(f);await assert.rejects(payAndQueue(f,f.io));
  assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0].endsWith('/checkout')));
});
for (const [label,change] of [
  ['wrong catalog',f=>{f.io.lineItems=async()=>({has_more:false,data:[{price:{product:'prod_OTHER'},quantity:1,amount_total:5000}]});}],
  ['live session',f=>{f.session.livemode=true;}],
  ['wrong amount',f=>{f.session.amount_total=1;}],
  ['wrong return origin',f=>{f.session.success_url='https://other.example/briefcase/x';}]
]) test(`refuses ${label} before card entry`,async()=>{
  const f=fixture();change(f);await assert.rejects(payAndQueue(f,f.io));assert.ok(!f.calls.includes('browser'));
});
test('provider/browser failure cannot enqueue',async()=>{
  const f=fixture();f.io.completeCheckout=async()=>({completed:false,humanInteractionRequired:true});
  await assert.rejects(payAndQueue(f,f.io));assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0].endsWith('/render')));
});
test('forged or unrelated provider reconciliation cannot enqueue',async()=>{
  const f=fixture();f.io.event=async()=>({livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_test_OTHER'}}});
  await assert.rejects(payAndQueue(f,f.io));assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0].endsWith('/render')));
});
async function deliveryFixture() {
  const f=fixture();f.payment=await payAndQueue(f,f.io);f.calls.length=0;f.io.readMatter=async()=>f.paid;return f;
}
test('mock-only protected bytes, repeat/fresh login, ownership and public denials',async()=>{
  const f=await deliveryFixture();const result=await verifyDelivery(f,f.io);
  assert.equal(result.status,'protected-delivery-observed');assert.equal(result.checks.length,6);
  assert.equal(result.hostedJourneyAcceptance,'review pending');assert.equal(f.calls.filter(x=>x==='savePdf').length,1);
  assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0].startsWith('/')&&x[2]));
});
for (const [label,change] of [
  ['another worker job',f=>{f.worker.jobId=DTC.item;}],
  ['worker without exclusive window',f=>{f.worker.exclusiveWindowConfirmed=false;}],
  ['other recoverable work',f=>{f.worker.otherClaimableOrRecoverableJobs=1;}],
  ['failed worker',f=>{f.worker.nativeExitCode=1;}],
  ['changed worker digest',f=>{f.worker.digest='sha256:'+'0'.repeat(64);}],
  ['different final artifact',f=>{f.job.output_sha256='0'.repeat(64);}],
  ['missing provenance',f=>{f.io.readProvenance=async()=>null;}],
  ['protection denial',f=>{const app=f.io.app;f.io.app=async(...a)=>({...await app(...a),fromProtectionLayer:true});}],
  ['server error denial',f=>{const app=f.io.app;f.io.app=async(...a)=>{const r=await app(...a);return a[1]==='stranger'?{...r,status:500}:r;};}],
  ['PDF leaked to stranger',f=>{const app=f.io.app;f.io.app=async(...a)=>{const r=await app(...a);return a[1]==='stranger'?{...r,bytes:f.bytes}:r;};}],
  ['public PDF leak',f=>{f.io.publicObject=async()=>({status:404,contentType:'application/pdf',bytes:f.bytes});}]
]) test(`delivery refuses ${label}`,async()=>{
  const f=await deliveryFixture();change(f);await assert.rejects(verifyDelivery(f,f.io));
  assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0]==='save'&&x[1]==='delivery'));
});
test('fixed case readback is read only and omits packet answers',()=>{
  const query=matterQuery();assert.ok(query.startsWith('begin transaction read only;'));
  assert.ok(query.includes(DTC.item));assert.ok(!/\b(insert|update|delete)\b/i.test(query));
  assert.ok(!query.includes('draft_snapshot'));assert.ok(!query.includes('ssn'));
});

// Exercise the actual runtime adapter with a mocked existing browser helper; no remote request.
test('runtime refuses missing bypass credential before any Checkout and passes existing credential to helper', async()=>{
  const fs = await import('node:fs/promises'); const os = await import('node:os'); const path = await import('node:path');
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(),'d132-adapter-test-'));
  const stateFile=path.join(scratch,'state.json');
  await fs.writeFile(stateFile,JSON.stringify({cookies:[{name:'_vercel_jwt',value:'mock-platform-cookie'}]}));
  const env={STRIPE_SECRET_KEY:'sk_test_MOCKONLY',SUPABASE_ACCESS_TOKEN:'mock',SUPABASE_ANON_KEY:'mock',VERCEL_TOKEN:'mock',
    DTC_OWNER_EMAIL:'mock-owner@rcap-acceptance.test',DTC_OWNER_PASSWORD:'mock',DTC_STRANGER_EMAIL:'mock-stranger@rcap-acceptance.test',DTC_STRANGER_PASSWORD:'mock'};
  // Existing persistent directory only; runtime construction writes no evidence files here.
  const config={outputDir:os.homedir(),protectionStateFile:stateFile};
  let observed=null; const checkoutBrowser=async options=>{observed=options;return {completed:true};};
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async url=>{
      assert.equal(url,`https://${DTC.project}.supabase.co/auth/v1/token?grant_type=password`);
      return new Response(JSON.stringify({user:{id:DTC.owner},access_token:'mock-session'}),{status:200});
    };
    await assert.rejects(runtime(config,env,{checkoutBrowser}),/VERCEL_AUTOMATION_BYPASS_SECRET/);
    await assert.rejects(runtime(config,{...env,VERCEL_AUTOMATION_BYPASS_SECRET:'   '},{checkoutBrowser}),/VERCEL_AUTOMATION_BYPASS_SECRET/);
    const io=await runtime(config,{...env,VERCEL_AUTOMATION_BYPASS_SECRET:'mock-existing-bypass'},{checkoutBrowser});
    await io.completeCheckout({checkoutUrl:'https://checkout.stripe.com/mock',expectedReturnUrl:DTC.origin});
    assert.equal(observed.previewProtectionBypassSecret,'mock-existing-bypass');
    assert.equal(observed.sessionCookies[0].name,'_vercel_jwt');assert.equal(observed.screenshotDir,null);
  } finally {globalThis.fetch=originalFetch;await fs.rm(scratch,{recursive:true});}
});
for(const label of ['checkout-created','provider-paid','queued','payment-attempt']) test(`actual prior ${label} receipt stops before target or Checkout`,async()=>{
  const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'d132-receipt-test-'));
  try {
    await fs.writeFile(path.join(dir,`${label}.private.json`),'{}');
    const f=fixture();f.io.preflightPayment=()=>preflightPaymentReceipts(dir,(name,value)=>
      fs.writeFile(path.join(dir,`${name}.private.json`),JSON.stringify(value),{flag:'wx'}));
    await assert.rejects(payAndQueue(f,f.io));assert.equal(f.calls.length,0);
    assert.equal(await fs.readFile(path.join(dir,`${label}.private.json`),'utf8'),'{}');
  } finally {await fs.rm(dir,{recursive:true});}
});
