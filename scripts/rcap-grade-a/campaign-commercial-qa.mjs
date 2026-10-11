// Owner-authorized isolated technical QA. No fixture is live business authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import Stripe from 'stripe';
import {actorBrowser,origin,root,db,checked,write,fixture,owner,sha,sourceIdentity} from './campaign-support.mjs';
register('../lib/ts-esm-loader.mjs',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
const check=(name,detail={})=>{checks.push({name,result:'PASS',...detail});console.log('PASS '+name);};
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
assert.notEqual(process.env.VERCEL_ENV,'production');
const mode=process.argv[2];
assert.ok(['agreement','payment','allocation','clinic','queue','receipt'].includes(mode));
let a;
try {
 if(mode==='receipt') {
  const paid=JSON.parse(fs.readFileSync(`${root}/server/participant-paid-fixture.json`));
  a=await actorBrowser('participant',fixture('clinic-participant-development-access.private'));const p=a.page;
  await p.goto(origin+'/briefcase/payments');await p.getByRole('heading',{name:'Payment history',exact:true}).waitFor();
  const matching=p.locator(`a[href*="briefcaseItemId=${paid.matterId}"]`);assert.equal(await matching.count(),1);
  const action=await matching.getAttribute('href');const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/expungement-ai/payment/receipt');
  await matching.click();const r=await response;assert.equal(r.status(),303);assert.match(new URL(r.headers().location).hostname,/(^|\.)stripe\.com$/);await p.waitForLoadState('domcontentloaded');
  assert.match(await p.locator('body').innerText(),/50\.00|\$50/);
  check('Actual Payment history View receipt opens provider-hosted genuine $50 TEST receipt',{matterId:paid.matterId,status:303,providerHost:new URL(p.url()).hostname});
  const other=await actorBrowser('admin',owner);try{assert.equal((await other.context.request.get(origin+action,{maxRedirects:0})).status(),404);}finally{await other.browser.close();}
  check('Other authenticated account cannot resolve the owner-bound receipt');
 } else if(mode==='queue') {
  const clinic=JSON.parse(fs.readFileSync(`${root}/server/commercial-clinic-qa.json`));
  const event=clinic.checks.find(c=>c.event).event;assert.match(event.partner_slug,/^qa-legacy-clinic-/);
  assert.match(event.id,/^[0-9a-f-]{36}$/);
  // Preserve prior failed-harness entries; the transition-only fixture needs
  // another intake place, without resetting its use counts or packet ceiling.
  execFileSync('docker',['exec','-i','legalease-hotfix-local-db-1','psql','-X','-h','127.0.0.1','-p','55432','-U','postgres','-d','rcap','-v','ON_ERROR_STOP=1'],{input:`update public.clinic_events set capacity=5 where id='${event.id}';`,stdio:['pipe','pipe','pipe']});
  const paid=JSON.parse(fs.readFileSync(`${root}/server/participant-paid-fixture.json`));
  const item=checked(await db.from('consumer_briefcase_items').select('id,user_id,payment_status').eq('id',paid.matterId).single());
  assert.equal(item.payment_status,'paid');
  // Explicit isolated staff fixture; invitation/onboarding has separate real
  // browser evidence. The consent below is actually given through the UI.
  const staffFile=`${root}/server/commercial-queue-staff.private.json`;
  const staff=fs.existsSync(staffFile)?JSON.parse(fs.readFileSync(staffFile)):{email:`qa-queue-${Date.now().toString(36)}@example.test`,password:`Isolated!9-${randomUUID()}`};
  if(!fs.existsSync(staffFile)){
   const auth=checked(await db.auth.admin.createUser({...staff,email_confirm:true})).user;
   checked(await db.from('partner_users').insert({auth_user_id:auth.id,partner_slug:event.partner_slug,role:'partner_staff',status:'active',invited_email:staff.email}));
   fs.writeFileSync(staffFile,JSON.stringify(staff),{mode:0o600});
  }
  // The isolated legacy fixture uses the existing explicit demo state, never
  // a fabricated paid invoice, receipt or production activation.
  checked(await db.from('partner_records').update({qualification_status:'qualified',provisioning_status:'active',payment_status:'demo_paid'}).eq('partner_slug',event.partner_slug));
  if(!checked(await db.from('partner_entitlement').select('partner_slug').eq('partner_slug',event.partner_slug)).length)
   checked(await db.from('partner_entitlement').insert({partner_slug:event.partner_slug,screenings_allowed:10,contract_note:'SIMULATED QA screening allowance only; no payment or real commercial authority.'}));
  a=await actorBrowser('admin',owner);const p=a.page;
  await p.goto(`${origin}/internal/clinic/${event.id}`);
  await p.getByLabel('Staff email',{exact:true}).selectOption({label:staff.email});
  const assigning=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/staff'));
  await p.getByRole('button',{name:'Save staff authorization',exact:true}).click();assert.equal((await assigning).status(),200);
  const coding=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/access-codes'));
  await p.getByRole('button',{name:'Generate event access code',exact:true}).click();const code=(await(await coding).json()).accessCode.code;
  if(await p.getByRole('button',{name:'Open clinic',exact:true}).count()){
   const opening=p.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith(`/api/clinic/events/${event.id}`));
   await p.getByRole('button',{name:'Open clinic',exact:true}).click();assert.equal((await opening).status(),200);
  }
  const e=checked(await db.from('clinic_events').select('public_slug,status').eq('id',event.id).single());assert.equal(e.status,'published');
  const participant=await actorBrowser('participant',fixture('clinic-participant-development-access.private')),worker=await actorBrowser('staff',staff);
  try {
   const q=participant.page,w=worker.page;
   await q.goto(`${origin}/clinic/${e.public_slug}`);await q.getByLabel('Event access code',{exact:true}).fill(code);
   await q.getByRole('button',{name:'Continue to participant consent',exact:true}).click();
   await q.getByLabel('Assisting staff member',{exact:true}).selectOption({index:1});
   await q.getByRole('checkbox',{name:/I consent to assistance/}).check();
   await q.getByRole('button',{name:'Start screening with assistance',exact:true}).click();await q.waitForURL(u=>u.pathname.endsWith('/screening/ms'));
   const c=checked(await db.from('clinic_cases').select('id,participant_user_id,matter_id,assisted_session_id').eq('event_id',event.id).order('created_at',{ascending:false}).limit(1).single());
   assert.equal(c.participant_user_id,item.user_id);assert.equal(c.matter_id,null);
   await w.goto(`${origin}/clinic/staff/${event.id}/queue`);
   const queue=(await(await worker.context.request.get(`${origin}/api/clinic/events/${event.id}/queue`)).json()).cases;
   const reference=queue.find(row=>row.id===c.id).reference;
   const selector=()=>w.getByRole('combobox',{name:`Packet status — Case ${reference}`,exact:true}).filter({visible:true});
   let select=selector();assert.equal(await select.locator('option[value=packet_ready]').isDisabled(),true);
   // Only the case→already-owned matter association is a QA fixture. Existing
   // payment, verification, rendered private artifact and browser consent are
   // retained unchanged. This is transition integration proof, not a claim
   // that this event produced a new paid/sponsored packet end to end.
   for(const id of [item.id,c.id,item.user_id])assert.match(id,/^[0-9a-f-]{36}$/);
   execFileSync('docker',['exec','-i','legalease-hotfix-local-db-1','psql','-X','-h','127.0.0.1','-p','55432','-U','postgres','-d','rcap','-v','ON_ERROR_STOP=1'],{input:`update public.clinic_cases set matter_id='${item.id}' where id='${c.id}' and participant_user_id='${item.user_id}' and matter_id is null;`,stdio:['pipe','pipe','pipe']});
   assert.deepEqual(checked(await db.rpc('rcap_clinic_case_materials',{p_case:c.id})),{saved:true,packet:true});
   await w.reload();select=selector();assert.equal(await select.locator('option[value=packet_ready]').isDisabled(),false);
   const updating=w.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith('/queue'));
   await select.selectOption('packet_ready');assert.equal((await updating).status(),200);
   await w.getByText('Queue status updated.',{exact:true}).waitFor();await w.reload();assert.equal(await selector().inputValue(),'packet_ready');
   assert.equal(checked(await db.from('clinic_cases').select('queue_status').eq('id',c.id).single()).queue_status,'packet_ready');
   await w.screenshot({path:`${root}/server/commercial-queue-qa.png`,fullPage:true});
   const resetting=q.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/reset'));
   await q.getByRole('button',{name:'End clinic session / Reset device',exact:true}).click();assert.equal((await resetting).status(),200);
   await w.reload();assert.equal((await(await worker.context.request.get(`${origin}/api/clinic/events/${event.id}/queue`)).json()).cases.some(row=>row.id===c.id),false);
   assert.equal(checked(await db.from('clinic_assisted_sessions').select('status').eq('id',c.assisted_session_id).single()).status,'reset');
   assert.deepEqual(checked(await db.from('consumer_briefcase_items').select('id,user_id,payment_status').eq('id',paid.matterId).single()),item);
   check('Actual Packet prepared control resolves current owned artifact, persists, survives refresh and disappears on real consent reset',{control:'C06-05',eventId:event.id,caseId:c.id,matterId:item.id,fixtureBoundary:'Explicit case-to-existing-owned-matter association only; staff identity fixture; actual browser consent; existing real TEST payment/render retained. Not new end-to-end packet fulfillment.'});
  }finally{await participant.browser.close();await worker.browser.close();}
 } else if(mode==='clinic') {
  const actor='5ddd55e0-634f-4a5e-ab98-c790d6bf1df8',slug=`qa-legacy-clinic-${Date.now().toString(36)}`;
  const partner=checked(await db.from('partner_records').insert({partner_id:slug,partner_slug:slug,partner_name:'SIMULATED QA legacy Clinic allocation',organization_name:'SIMULATED QA legacy Clinic allocation',program_tier:'screening',state:'MS',target_state:'MS',service_area:'Mississippi',payment_status:'unpaid'}).select('id').single());
  const options=async()=>checked(await db.rpc('rcap_service_clinic_program_options',{p_actor:actor}));
  const own=async()=>(await options()).find(p=>p.slug===slug);
  assert.equal((await own()).canSponsor,false);
  const allocation=checked(await db.from('partner_packet_entitlement').insert({partner_id:partner.id,packet_cap:2,contract_note:'OWNER-AUTHORIZED SIMULATED QA ONLY. No actual funds or commercial authority.',effective_at:new Date(Date.now()-60000).toISOString(),expires_at:new Date(Date.now()+3600000).toISOString()}).select('id').single());
  assert.equal((await own()).canSponsor,true);
  checked(await db.from('partner_packet_entitlement').update({expires_at:new Date(Date.now()-30000).toISOString()}).eq('id',allocation.id));
  assert.equal((await own()).canSponsor,false);
  checked(await db.from('partner_packet_entitlement').update({expires_at:new Date(Date.now()+3600000).toISOString()}).eq('id',allocation.id));
  const modern=checked(await db.from('partner_onboarding').select('partner_slug').eq('rcap_policy_version','rcap2.2'));
  const modernSlugs=new Set(modern.map(p=>p.partner_slug));
  assert.ok((await options()).some(p=>modernSlugs.has(p.slug)&&p.canCreate&&!p.canSponsor));
  check('Legacy discovery reflects only its current allocation; absence and expiry deny; modern screening-only program remains unfunded',{slug,allocationId:allocation.id});
  a=await actorBrowser('admin',owner);const p=a.page;
  await p.goto(`${origin}/internal/clinic?partner=${slug}`);
  await p.getByLabel('Event name',{exact:true}).fill('SIMULATED QA allocation-limit regression');
  await p.getByLabel('Timezone',{exact:false}).selectOption('UTC');
  await p.locator('[name=startsAt]').fill(new Date(Date.now()+60000).toISOString().slice(0,16));
  await p.locator('[name=endsAt]').fill(new Date(Date.now()+3600000).toISOString().slice(0,16));
  await p.getByLabel('Location',{exact:true}).fill('Isolated QA application only');
  await p.getByLabel('Capacity',{exact:true}).fill('2');
  await p.getByText('Event sponsorship limit (optional)',{exact:true}).click();
  await p.getByLabel('Sponsored packet allocation',{exact:true}).fill('2');
  await p.getByText('This limit does not add funding or grant packet credits.',{exact:true}).waitFor();
  const creating=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/clinic/events'));
  await p.getByRole('button',{name:'Create clinic event',exact:true}).click();
  const created=await creating,body=await created.json();assert.equal(created.status(),201,JSON.stringify(body));
  await p.waitForURL(u=>u.pathname===`/internal/clinic/${body.eventId}`);await p.reload();
  const event=checked(await db.from('clinic_events').select('id,partner_slug,status,jurisdiction,sponsorship_allocation').eq('id',body.eventId).single());
  assert.equal(event.sponsorship_allocation,2);assert.equal(event.status,'draft');assert.equal(event.jurisdiction,'MS');
  assert.equal(checked(await db.from('partner_packet_entitlement').select('id,packet_cap').eq('partner_id',partner.id)).length,1);
  assert.equal(checked(await db.from('partner_records').select('payment_status').eq('id',partner.id).single()).payment_status,'unpaid');
  await p.screenshot({path:`${root}/server/commercial-clinic-qa.png`,fullPage:true});
  check('Actual optional limit controls create one draft event with the saved ceiling, without creating funding or consuming credits',{controls:['C01-10','C01-11'],event,fixture:'Explicitly simulated isolated legacy program and 2 test-only credits'});
 } else if(mode==='payment') {
  assert.ok(process.env.HOSTED_STRIPE_TEST_SECRET?.startsWith('sk_test_'));
  const stripe=new Stripe(process.env.HOSTED_STRIPE_TEST_SECRET);
  const prior=JSON.parse(fs.readFileSync(`${root}/server/participant-paid-fixture.json`));
  const session=await stripe.checkout.sessions.retrieve(prior.sessionId);
  const event=await stripe.events.retrieve(prior.eventId);
  assert.equal(session.livemode,false);assert.equal(event.livemode,false);
  assert.equal(session.payment_status,'paid');assert.equal(session.amount_total,5000);assert.equal(session.currency,'usd');
  assert.equal(session.metadata.briefcase_item_id,prior.matterId);
  assert.equal(event.type,'checkout.session.completed');assert.equal(event.data.object.id,session.id);
  check('Existing genuine Stripe TEST settlement and exact provider event remain valid',{sessionId:session.id,eventId:event.id,matterId:prior.matterId,amountCents:5000});
  a=await actorBrowser('participant',fixture('clinic-participant-development-access.private'));
  const before=checked(await db.from('consumer_briefcase_items').select('id,user_id,payment_status,amount_cents,checkout_session_id,payment_intent_id,provider_event_id,artifact_refs_json').eq('id',prior.matterId).single());
  const jobsBefore=checked(await db.from('packet_render_jobs').select('id,status,attempt_count,accounting_result,output_sha256').eq('consumer_briefcase_item_id',prior.matterId));
  const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET});
  const send=s=>a.context.request.post(origin+'/api/stripe/webhook',{headers:{'content-type':'application/json','stripe-signature':s},data:payload});
  assert.equal((await send('invalid')).status(),400);
  for(let i=0;i<2;i++){const r=await send(signature);assert.equal(r.status(),200,await r.text());}
  const after=checked(await db.from('consumer_briefcase_items').select('id,user_id,payment_status,amount_cents,checkout_session_id,payment_intent_id,provider_event_id,artifact_refs_json').eq('id',prior.matterId).single());
  assert.deepEqual(after,before);assert.equal(after.payment_status,'paid');assert.equal(after.amount_cents,5000);assert.equal(after.checkout_session_id,session.id);assert.equal(after.payment_intent_id,session.payment_intent);
  assert.deepEqual(checked(await db.from('packet_render_jobs').select('id,status,attempt_count,accounting_result,output_sha256').eq('consumer_briefcase_item_id',prior.matterId)),jobsBefore);
  check('Actual signed webhook accepts unchanged provider replay; invalid signature denied; payment and artifact preserved',{transport:'Unmodified real Stripe TEST event, signed and forwarded to isolated application; not a claim of public Stripe network delivery',newCharges:0,newSessions:0,newRenderJobs:0});
  await a.page.goto(`${origin}/briefcase/${prior.matterId}`);
  await a.page.locator('[data-packet-ready]').getByRole('heading',{name:'Packet ready',exact:true}).waitFor();
  assert.equal(await a.page.getByRole('button',{name:/Pay \$50/}).count(),0);
  await a.page.screenshot({path:`${root}/server/commercial-payment-qa.png`,fullPage:true});
  check('Authenticated paid owner sees ready private packet without another purchase action');
 } else if(mode==='allocation') {
  const prior=JSON.parse(fs.readFileSync(`${root}/server/commercial-agreement-qa.json`));
  const proof=prior.checks.find(c=>c.receiptId),slug=proof.slug;
  assert.match(slug,/^qa-agreement-[a-z0-9]+$/);
  const workspace=checked(await db.from('partner_onboarding').select('id,partner_record_id,status').eq('partner_slug',slug).single());
  assert.notEqual(workspace.status,'live');
  assert.equal(checked(await db.rpc('rcap_agreement_clearance',{p_workspace:workspace.id})),true);
  const financialBefore=checked(await db.from('partner_records').select('payment_status').eq('id',workspace.partner_record_id).single());
  a=await actorBrowser('admin',owner);const p=a.page;
  await p.goto(`${origin}/internal/partners/onboarding/${slug}`);
  await p.getByRole('link',{name:'Administrative diagnostics and documented exceptions',exact:true}).click();
  await p.getByText('Service authority and agreements',{exact:true}).click();
  await p.getByLabel('Decision basis',{exact:true}).fill('OWNER-AUTHORIZED SIMULATED QA ONLY: 2 test packet credits and 10 test screenings. No actual funds, sponsor obligation, invoice payment or live commercial authority.');
  await p.getByLabel('Contract or delegation expiration').fill('2026-11-11T00:00');
  await p.getByLabel('I reviewed the evidence and authorize this administrative action.').check();
  if(await p.getByRole('button',{name:'Confirm partner qualification',exact:true}).count()){
   const qualified=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/admin-action'));
   await p.getByRole('button',{name:'Confirm partner qualification',exact:true}).click();
   const response=await qualified;assert.equal(response.status(),200,await response.text());
   await p.getByRole('button',{name:'Confirm partner qualification',exact:true}).waitFor({state:'hidden'});
   check('Unqualified simulated partner is refused; visible qualification action resolves that actual prerequisite');
  }
  await p.getByLabel('Service arrangement').selectOption('sponsored');
  await p.getByLabel('Reviewed supporting document').selectOption(proof.assetId);
  const existingAllocation=checked(await db.from('partner_packet_entitlement').select('id').eq('partner_id',workspace.partner_record_id));
  if(!existingAllocation.length){
  await p.getByText('Record a documented allocation',{exact:true}).click();
  await p.getByLabel('Documented screening allowance').fill('10');
  await p.getByLabel('Documented packet allowance').fill('2');
  const saved=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/launch-capacity'));
  await p.getByRole('button',{name:'Save documented allocation',exact:true}).click();
  const response=await saved;assert.equal(response.status(),200,await response.text());
  await p.getByText('Documented allocation saved. Record the associated service authority.',{exact:true}).waitFor();
  }
  const allocation=checked(await db.from('partner_packet_entitlement').select('id,packet_cap,contract_note').eq('partner_id',workspace.partner_record_id).single());
  assert.equal(allocation.packet_cap,2);assert.match(allocation.contract_note,/SIMULATED QA/);
  await p.getByLabel('Existing packet allocation').selectOption(allocation.id);
  await p.getByLabel('I reviewed the evidence and authorize this administrative action.').check();
  const granted=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/commercial-authority'));
  await p.getByRole('button',{name:'Record funded service authority',exact:true}).click();
  const grantedResponse=await granted;assert.equal(grantedResponse.status(),200,await grantedResponse.text());
  const authority=checked(await db.from('rcap_commercial_authorizations').select('id,kind,document_id,packet_entitlement_id,authority_reference').eq('workspace_id',workspace.id).single());
  assert.equal(authority.kind,'sponsored');assert.equal(authority.document_id,proof.assetId);assert.equal(authority.packet_entitlement_id,allocation.id);assert.match(authority.authority_reference,/SIMULATED QA/);
  assert.deepEqual(checked(await db.from('partner_records').select('payment_status').eq('id',workspace.partner_record_id).single()),financialBefore);
  assert.notEqual(checked(await db.from('partner_onboarding').select('status').eq('id',workspace.id).single()).status,'live');
  await p.screenshot({path:`${root}/server/commercial-allocation-qa.png`,fullPage:true});
  check('Actual allocation and service-authority controls persist test-only cap, source document and audit without payment or publication',{slug,allocation,authority,paymentStatus:financialBefore.payment_status});
 } else {
  const {provisionPartner}=await import('../../src/lib/partners/partner-provisioning-service.ts');
  a=await actorBrowser('admin',owner);
  const resume=process.env.RCAP_AGREEMENT_RESUME_SLUG;
  const slug=resume??`qa-agreement-${Date.now().toString(36)}`;
  assert.match(slug,/^qa-agreement-[a-z0-9]+$/);
  const admin=checked(await db.from('partner_users').select('auth_user_id').eq('role','internal_admin').eq('auth_user_id','5ddd55e0-634f-4a5e-ab98-c790d6bf1df8').single());
  if(!resume)await provisionPartner({operatorUserId:admin.auth_user_id,values:{operatingModel:'partner_managed',template:'screening-standard-v1',jurisdictions:['CA'],enableSpanish:false,partnerSlug:slug,organizationName:'SIMULATED QA agreement organization',legalOrganizationName:'SIMULATED QA only - no real contract',programName:'Isolated agreement mechanism QA',programPurpose:'Owner-authorized test of agreement ingestion. No live business authority.',administratorName:'Isolated QA',administratorEmail:owner.email,clearanceReason:'Simulated QA fixture only; no real partner, payment or launch.',idempotencyKey:randomUUID()}});
  let workspace=checked(await db.from('partner_onboarding').select('id,partner_record_id,aggregate_version,agreement_status,status').eq('partner_slug',slug).single());
  const endpoint=`${origin}/api/internal/partners/onboarding/phase1/${slug}/signed-agreement`;
  if(!resume){assert.equal(workspace.agreement_status,'not_sent');
   assert.equal(checked(await db.rpc('rcap_agreement_clearance',{p_workspace:workspace.id})),false);
   check('Missing agreement stays missing in newly provisioned isolated partner workspace',{slug,workspaceId:workspace.id});}
  const pdf=await PDFDocument.create();const sheet=pdf.addPage();
  for(const [i,line] of ['SIMULATED QA SIGNING EVENT - NOT A REAL AGREEMENT',`Fixture organization: ${slug}`,'QA signing-provider event: completed / test mode','QA Party A and QA Party B: simulated execution records','No real signature, funding, consent or commercial authority.'].entries())sheet.drawText(line,{x:25,y:760-i*30,size:11});
  let bytes=Buffer.from(await pdf.save());const requestId=randomUUID(),effectiveDate='2026-10-01';
  const reviewReason='Owner-authorized simulated QA signing event. Inspected matching test organization and both simulated completion records; no actual contract or partner authority.';
  await a.page.goto(`${origin}/internal/partners/onboarding/${slug}`);
  await a.page.getByRole('link',{name:'Administrative diagnostics and documented exceptions',exact:true}).click();
  await a.page.getByText('Service authority and agreements',{exact:true}).click();
  if(!resume){await a.page.getByText('Record an executed agreement',{exact:true}).click();
  const form=a.page.locator('form').filter({has:a.page.locator('input[name=file]')});
  await form.getByLabel('Signed PDF or DOCX').setInputFiles({name:'SIMULATED-QA-signing-event.pdf',mimeType:'application/pdf',buffer:bytes});
  await form.getByLabel('Agreement effective date').fill(effectiveDate);
  await form.getByLabel('Agreement review basis').fill(reviewReason);
  await form.getByRole('checkbox').check();
  const response=a.page.waitForResponse(r=>r.request().method()==='POST'&&r.url()===endpoint);
  await form.getByRole('button',{name:'Record executed agreement',exact:true}).click();
  const r=await response;assert.equal(r.status(),200,await r.text());
  await a.page.getByText('Executed agreement and private document recorded.',{exact:true}).waitFor();}
  const receipt=checked(await db.from('rcap_signed_agreement_receipts').select('*').eq('workspace_id',workspace.id).single());
  if(resume){const asset=checked(await db.from('partner_onboarding_assets').select('object_path').eq('id',receipt.asset_id).single());bytes=Buffer.from(await checked(await db.storage.from('rcap-partner-onboarding-private').download(asset.object_path)).arrayBuffer());}
  assert.equal(receipt.asset_sha256,digest(bytes));assert.equal(receipt.actor_auth_user_id,admin.auth_user_id);assert.equal(receipt.reviewed_reason,reviewReason);assert.equal(receipt.effective_date,effectiveDate);
  const asset=checked(await db.from('partner_onboarding_assets').select('object_path,sha256_hex,review_status,lifecycle_status').eq('id',receipt.asset_id).single());
  assert.equal(asset.sha256_hex,digest(bytes));assert.equal(asset.review_status,'approved');
  assert.equal(digest(Buffer.from(await checked(await db.storage.from('rcap-partner-onboarding-private').download(asset.object_path)).arrayBuffer())),digest(bytes));
  workspace=checked(await db.from('partner_onboarding').select('id,partner_record_id,aggregate_version,agreement_status,status').eq('partner_slug',slug).single());
  assert.equal(workspace.agreement_status,'signed');assert.notEqual(workspace.status,'live');
  const agreement=checked(await db.from('partner_onboarding_agreements').select('status,signed_receipt_id,finalized_asset_id').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());
  assert.equal(agreement.status,'executed');assert.equal(agreement.signed_receipt_id,receipt.id);assert.equal(agreement.finalized_asset_id,receipt.asset_id);
  await a.page.reload();await a.page.getByText('Service authority and agreements',{exact:true}).click();await a.page.getByText('order form: executed',{exact:false}).waitFor();
  await a.page.screenshot({path:`${root}/server/commercial-agreement-qa.png`,fullPage:true});
  check('Browser ingestion persists exact QA document, private hash, actor, effective date and immutable receipt without publication',{slug,receiptId:receipt.id,assetId:receipt.asset_id,sha256:asset.sha256_hex,resumedAfterHarnessDisclosureTimeout:Boolean(resume)});
  const submit=overrides=>a.context.request.post(endpoint,{headers:{origin},multipart:{requestId,expectedWorkspaceVersion:String(workspace.aggregate_version),agreementType:'order_form',effectiveDate,reviewReason,confirmed:'true',existingAssetId:receipt.asset_id,...overrides}});
  const replay=await submit({requestId:receipt.id});assert.equal(replay.status(),200,await replay.text());assert.equal((await replay.json()).duplicate,true);
  assert.ok((await submit({requestId:receipt.id,reviewReason:'Different review should not reuse original request identity'})).status()>=400);
  assert.ok((await submit({confirmed:'false'})).status()>=400);
  assert.ok((await submit({effectiveDate:'2026-02-31'})).status()>=400);
  assert.ok((await submit({expectedWorkspaceVersion:'1'})).status()>=400);
  assert.ok((await submit({existingAssetId:randomUUID()})).status()>=400);
  assert.equal(checked(await db.from('rcap_signed_agreement_receipts').select('id').eq('workspace_id',workspace.id)).length,1);
  const outsider=await actorBrowser('participant',fixture('clinic-participant-development-access.private'));
  try{assert.equal((await outsider.context.request.post(endpoint,{headers:{origin},multipart:{requestId:randomUUID()}})).status(),403);}finally{await outsider.browser.close();}
  check('Replay is idempotent; mismatched evidence, unconfirmed review, invalid date, stale version, foreign asset and unauthorized actor are rejected');
 }
 write(`server/commercial-${mode}-qa.json`,{sourceSha:sha,sourceIdentity,environment:origin,database:'loopback:54321',time:new Date().toISOString(),provenance:['payment','receipt'].includes(mode)?'Existing genuine Stripe TEST settlement; no live payment':'Explicitly simulated owner-authorized QA fixture; no real agreement, sponsor or funds',checks,result:'PASS',productionWrites:0});
} catch(error){write(`server/commercial-${mode}-qa-failure.json`,{sourceSha:sha,error:error.message,checks,result:'FAIL'});throw error;}
finally{if(a)await a.browser.close();}
