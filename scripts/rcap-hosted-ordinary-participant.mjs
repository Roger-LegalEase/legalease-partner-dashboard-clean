import assert from 'node:assert/strict';
import { answerBuilderStep } from './rcap-packet-builder-filler.mjs';
import { MS_NONCONVICTION_ROUTE, MS_NONCONVICTION_SCREENING_ANSWERS } from './lib/rcap-ms-nonconviction-fixture.mjs';

export const ORDINARY_PARTNER = 'legalease-ordinary-qa-20261024';
export const ORDINARY_PARTICIPANT = 'b6dc86a3-12bb-490d-b130-48d95d426a1e';
const priorMatters = ['d13233f6-d9c7-41e1-9bb5-8a454d747503', '6765fcb9-586d-4abe-bc60-9f77f6a11e16'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
export function assertNewOrdinaryMatter(itemId) {
  assert.ok(uuid(itemId));
  assert.ok(!priorMatters.includes(itemId), 'Ordinary flow must use its own new matter');
}

// Native reader executes this exact query in the admitted acceptance project.
// The transaction is read-only; no answers from the protected packet are exported.
export function ordinaryReadbackSql(itemId, sessionId) {
  assertNewOrdinaryMatter(itemId); assert.ok(uuid(sessionId));
  return `BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS database_user,
 current_setting('transaction_read_only') AS transaction_read_only,
 (SELECT jsonb_build_object('id',i.id,'user_id',i.user_id,'source_session_id',i.source_session_id,'jurisdiction',i.jurisdiction,'payment_allowed',i.payment_allowed,'payment_status',i.payment_status,'packet_status',i.packet_status) FROM public.consumer_briefcase_items i WHERE i.id='${itemId}') AS item,
 (SELECT jsonb_build_object('consumer_auth_user_id',s.consumer_auth_user_id,'briefcase_item_id',s.briefcase_item_id,'claimed_user_id',s.claimed_user_id,'claimed_at',s.claimed_at,'product',s.product,'partner_slug',s.partner_slug,'partner_benefit_active',s.partner_benefit_active,'jurisdiction',s.jurisdiction,'profile_version',s.profile_version,'screening_answers',s.screening_answers) FROM public.get_consumer_briefcase_presentation_source('${ORDINARY_PARTICIPANT}','${itemId}') s) AS source,
 (SELECT to_jsonb(a) FROM public.sponsored_packet_render_authority('${MS_NONCONVICTION_ROUTE.routeId}','${sessionId}','${itemId}','${ORDINARY_PARTICIPANT}') a) AS authority,
 (SELECT jsonb_build_object('consumer_auth_user_id',v.consumer_auth_user_id,'briefcase_item_id',v.briefcase_item_id,'revision',v.revision,'status',v.status,'verification_hash',v.verification_hash,'jurisdiction',coalesce(v.verification_snapshot,v.draft_snapshot)->>'jurisdiction','pathwayId',coalesce(v.verification_snapshot,v.draft_snapshot)->>'pathwayId') FROM public.consumer_packet_verifications v WHERE v.briefcase_item_id='${itemId}') AS verification,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',j.id,'route_id',j.route_id,'renderer_kind',j.renderer_kind,'status',j.status,'attempt_count',j.attempt_count,'briefcase_item_id',j.briefcase_item_id,'sponsored_consumer_briefcase_item_id',j.sponsored_consumer_briefcase_item_id,'sponsored_consumer_auth_user_id',j.sponsored_consumer_auth_user_id,'sponsored_session_id',j.sponsored_session_id,'sponsored_clinic_event_id',j.sponsored_clinic_event_id,'sponsored_route_key',j.sponsored_route_key,'sponsored_verification_hash',j.sponsored_verification_hash,'output_storage_path',j.output_storage_path,'output_sha256',j.output_sha256) ORDER BY j.created_at,j.id),'[]'::jsonb) FROM public.packet_render_jobs j WHERE j.briefcase_item_id='${itemId}' OR j.sponsored_consumer_briefcase_item_id='${itemId}') AS jobs;
COMMIT;`;
}

export function assertOrdinarySavedState(row, itemId, sessionId, enqueued = false) {
  assertNewOrdinaryMatter(itemId); assert.ok(uuid(sessionId));
  assert.equal(row.transaction_read_only, 'on');
  assert.equal(row.database_name, 'postgres'); assert.equal(row.database_user, 'postgres');
  assert.equal(row.item?.id, itemId); assert.equal(row.item.user_id, ORDINARY_PARTICIPANT);
  assert.equal(row.item.source_session_id, sessionId); assert.equal(row.item.jurisdiction, 'MS');
  assert.equal(row.item.payment_allowed, false); assert.equal(row.item.payment_status, 'not_applicable');
  const s = row.source;
  assert.equal(s?.consumer_auth_user_id, ORDINARY_PARTICIPANT);
  assert.equal(s.claimed_user_id, ORDINARY_PARTICIPANT); assert.equal(s.briefcase_item_id, itemId);
  assert.ok(s.claimed_at); assert.equal(s.product, 'rcap_partner');
  assert.equal(s.partner_slug, ORDINARY_PARTNER); assert.equal(s.partner_benefit_active, true);
  assert.equal(s.jurisdiction, 'MS'); assert.equal(s.profile_version, MS_NONCONVICTION_ROUTE.profileVersion);
  assert.deepEqual(s.screening_answers, MS_NONCONVICTION_SCREENING_ANSWERS);
  assert.equal(row.authority?.valid, true); assert.equal(row.authority.partner_slug, ORDINARY_PARTNER);
  assert.equal(row.authority.clinic_event_id, null); assert.equal(row.authority.clinic_case_id, null);
  assert.ok(uuid(row.authority.partner_id));
  if (!enqueued) { assert.equal(row.jobs.length, 0); return; }
  const v = row.verification;
  assert.equal(v?.consumer_auth_user_id, ORDINARY_PARTICIPANT); assert.equal(v.briefcase_item_id, itemId);
  assert.equal(v.status, 'verified'); assert.ok(Number.isInteger(v.revision) && v.revision > 0);
  assert.ok(hash(v.verification_hash)); assert.equal(v.jurisdiction, 'MS');
  assert.equal(v.pathwayId, MS_NONCONVICTION_ROUTE.pathwayId);
  assert.equal(row.jobs.length, 1);
  const j = row.jobs[0]; assert.ok(uuid(j.id));
  assert.equal(j.briefcase_item_id, itemId); assert.equal(j.sponsored_consumer_briefcase_item_id, itemId);
  assert.equal(j.sponsored_consumer_auth_user_id, ORDINARY_PARTICIPANT);
  assert.equal(j.sponsored_session_id, sessionId); assert.equal(j.sponsored_clinic_event_id, null);
  assert.equal(j.route_id, MS_NONCONVICTION_ROUTE.routeId); assert.equal(j.sponsored_route_key, j.route_id);
  assert.equal(j.sponsored_verification_hash, v.verification_hash);
  assert.equal(j.renderer_kind, 'packet_document_v1'); assert.equal(j.status, 'queued');
  assert.equal(j.attempt_count, 0); assert.equal(j.output_storage_path, null); assert.equal(j.output_sha256, null);
}

export function ordinaryRequestAllowed({url,method,body}, {origin,targetItemId,generationAllowed,generationCount}) {
  const u=new URL(url);
  if (/(^|\.)stripe\.com$/i.test(u.hostname) || /\/(checkout|stripe)(\/|$)/i.test(u.pathname) || /\/api\/rcap\/packets\/[^/]+\/download$/.test(u.pathname) || /^\/api\/expungement-ai\/packet\/(download(?:-link)?|render)(?:\/|$)/.test(u.pathname)) return false;
  if (method==='POST' && u.pathname==='/api/expungement-ai/packet/generate') return u.origin===origin && generationAllowed===true && generationCount===1 && uuid(targetItemId) && body?.briefcaseItemId===targetItemId && Object.keys(body).length===1;
  return true;
}

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const heading = (page, prompt) => page.getByRole('heading', {name:new RegExp(`^${escape(prompt)}(?:\\s*Optional)?$`, 'i')});
async function answerChoice(page, prompt, option) {
  await heading(page, prompt).waitFor({state:'visible'});
  await page.getByRole('radio', {name:new RegExp(`^${escape(option)}(?:\\s|$)`, 'i')}).check();
  await page.getByRole('button', {name:/Continue/i}).click();
}
const matches = (r, path) => r.request().method() === 'POST' && new URL(r.url()).pathname === path;
const itemFromPath = path => /^\/briefcase\/([0-9a-f-]{36})$/i.exec(path)?.[1];

// Controller supplies target admission, normal test credentials, native read-only
// reader and the F-owned exclusive window. No worker, SQL writes or deployment.
export async function runOrdinaryParticipant({ page, anonymousPage, strangerPage, origin, email, password, admit, assertExclusiveWindow, readNative, checkpoint }) {
  for (const fn of [admit, assertExclusiveWindow, readNative, checkpoint]) assert.equal(typeof fn, 'function');
  assert.equal(new URL(origin).origin, origin); assert.ok(email && password);
  await admit();
  let generationAllowed = false, generationCount = 0, unexpectedRequest = false;
  let sessionId = null, targetItemId = null;
  const guard = async route => {
    const request = route.request(), u = new URL(request.url());
    const generate = request.method() === 'POST' && u.pathname === '/api/expungement-ai/packet/generate';
    if (generate) generationCount += 1;
    let body=null;
    if(generate) { try { body=request.postDataJSON(); } catch {} }
    if (!ordinaryRequestAllowed({url:request.url(),method:request.method(),body},{origin,targetItemId,generationAllowed,generationCount})) {
      unexpectedRequest = true; await route.abort(); return;
    }
    if (request.method() === 'POST' && u.pathname === '/api/expungement-ai/screening/pending') {
      const body = request.postDataJSON(); sessionId = body?.anonymousSessionId ?? null;
    }
    await route.continue();
  };
  await page.route('**/*', guard);
  try {
    await checkpoint({stage:'ordinary_screening_pending',partnerSlug:ORDINARY_PARTNER});
    // Continue from the normal admin handoff, or enter its exact participant URL.
    if (new URL(page.url()).pathname !== `/intake/${ORDINARY_PARTNER}`) {
      const landing = await page.goto(`${origin}/p/${ORDINARY_PARTNER}`); assert.equal(landing.status(), 200);
      await page.locator(`a[href="/intake/${ORDINARY_PARTNER}"]`).click();
    }
    await page.waitForURL(u => u.origin === origin && u.pathname === `/intake/${ORDINARY_PARTNER}`);
    await page.getByRole('link', {name:'Sign in to continue',exact:true}).click();
    await page.waitForURL(u => u.origin === origin && u.pathname === '/expungement-ai/sign-in');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    const auth = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/auth/v1/token') && new URL(r.url()).searchParams.get('grant_type') === 'password');
    await page.getByRole('button', {name:'Sign in',exact:true}).click();
    const authResponse = await auth; assert.equal(authResponse.status(), 200);
    const authBody = await authResponse.json();
    assert.ok(authBody.user?.id === ORDINARY_PARTICIPANT, 'Normal sign-in must resolve to the approved ordinary participant');
    await page.waitForURL(u => u.origin === origin && u.pathname === `/intake/${ORDINARY_PARTNER}`);
    await answerChoice(page, 'Are you asking about your own record?', 'Yes');
    await answerChoice(page, 'Did this case happen in Mississippi (not a federal case)?', 'State or local');
    await answerChoice(page, 'How did the case end?', 'The case was dropped or thrown out');
    await answerChoice(page, 'What kind of charge was it?', 'Misdemeanor');
    await answerChoice(page, 'Do any of these sound like your situation?', MS_NONCONVICTION_SCREENING_ANSWERS.possible_pathway_context);
    const result = page.getByRole('heading', {name:/path may be available|You may be able to prepare an expungement packet/i});
    const remaining = new Map([['About how long ago did this case end or get resolved?', 'More than 10 years ago'], ['Have you completed everything the court ordered in this case?', 'Yes']]);
    const deadline = Date.now()+45000;
    while (!(await result.isVisible()) && Date.now()<deadline) {
      let answered = false;
      for (const [prompt, option] of remaining) if (await heading(page,prompt).isVisible()) {remaining.delete(prompt);await answerChoice(page,prompt,option);answered=true;break;}
      if (!answered) await page.waitForTimeout(250);
    }
    await result.waitFor({state:'visible',timeout:1000});
    await page.locator('[data-partner-context="saved"]').waitFor();
    const pending = page.waitForResponse(r=>matches(r,'/api/expungement-ai/screening/pending'));
    const claim = page.waitForResponse(r=>matches(r,'/api/expungement-ai/screening/pending/claim'));
    await checkpoint({stage:'ordinary_claim_pending'});
    await page.getByRole('button',{name:'Save to my Briefcase and continue',exact:true}).click();
    assert.equal((await pending).status(),200);
    const claimResponse=await claim;assert.equal(claimResponse.status(),200);
    const claimed=await claimResponse.json();
    await page.waitForURL(u=>u.origin===origin && Boolean(itemFromPath(u.pathname)));
    const itemId=itemFromPath(new URL(page.url()).pathname);assertNewOrdinaryMatter(itemId);assert.ok(uuid(sessionId));
    assert.equal(claimed.matterId,itemId);
    assert.equal(claimed.redirectTo,`/briefcase/${itemId}`);
    targetItemId=itemId;
    await checkpoint({stage:'ordinary_matter_claimed',itemId,sessionId,participantUserId:ORDINARY_PARTICIPANT});
    const native = async enqueued => {
      const row=await readNative(ordinaryReadbackSql(itemId,sessionId));
      assertOrdinarySavedState(row,itemId,sessionId,enqueued); return row;
    };
    await native(false);
    const endpoint=`/api/expungement-ai/briefcase/${itemId}/packet-information`;
    const readOwner = async () => page.evaluate(async path=>{const r=await fetch(path,{cache:'no-store'});return {status:r.status,body:await r.json()};},endpoint);
    const apiStatus = async other => other.evaluate(async path=>(await fetch(path,{cache:'no-store'})).status,`${origin}${endpoint}`);
    await anonymousPage.goto(`${origin}/briefcase`);
    await strangerPage.goto(`${origin}/briefcase`);
    assert.equal(await apiStatus(anonymousPage),401);assert.equal(await apiStatus(strangerPage),404);
    const builderLink=page.getByRole('link',{name:'Complete packet information',exact:true});
    await builderLink.click();
    await page.waitForURL(u=>u.origin===origin && u.pathname===`/briefcase/${itemId}/packet-information`);
    let saves=0;
    for(;saves<80 && new URL(page.url()).pathname.endsWith('/packet-information');saves++) {
      await answerBuilderStep(page,{routeKey:MS_NONCONVICTION_ROUTE.routeId});
      const request=page.waitForRequest(r=>r.method()==='POST' && new URL(r.url()).pathname===endpoint);
      const response=page.waitForResponse(r=>matches(r,endpoint));
      const review=page.getByRole('button',{name:'Review packet facts',exact:true});
      await checkpoint({stage:'ordinary_packet_save_pending',itemId,saveIndex:saves});
      await (await review.isVisible() ? review : page.getByRole('button',{name:'Save and continue',exact:true})).click();
      const submitted=(await request).postDataJSON();
      assert.ok(Number.isInteger(submitted.expectedRevision));assert.ok(!submitted.verify);
      const saved=await response;assert.equal(saved.status(),200);
      const body=await saved.json();assert.equal(body.ok,true);assert.ok(body.revision>=submitted.expectedRevision);
      await checkpoint({stage:'ordinary_packet_saved',itemId,expectedRevision:submitted.expectedRevision,revision:body.revision,saveIndex:saves});
      // Server owner read + reload proves persistence and ordinary save/resume.
      const before=await readOwner();assert.equal(before.status,200);assert.equal(before.body.revision,body.revision);
      await page.reload();
      const after=await readOwner();assert.equal(after.status,200);assert.deepEqual(after.body.answers,before.body.answers);assert.equal(after.body.revision,before.body.revision);
    }
    await page.waitForURL(u=>u.origin===origin && u.pathname===`/briefcase/${itemId}/review`);
    assert.equal(await page.locator('[data-packet-verification-state]').getAttribute('data-packet-verification-state'),'unverified');
    assert.equal(generationCount,0);assert.equal(unexpectedRequest,false);
    await native(false);
    // Sponsored Verify auto-enqueues. Hold the entire producer/consumer window first.
    await admit();await assertExclusiveWindow();
    await checkpoint({stage:'ordinary_verification_and_enqueue_pending',itemId,sessionId});
    generationAllowed=true;
    const verification=page.waitForResponse(r=>matches(r,endpoint));
    const generation=page.waitForResponse(r=>matches(r,'/api/expungement-ai/packet/generate'));
    await page.getByRole('button',{name:'Verify and prepare clinic packet',exact:true}).click();
    const verified=await verification;assert.equal(verified.status(),200);
    const vb=await verified.json();assert.equal(vb.ok,true);assert.equal(vb.readyToGenerate,true);assert.equal(vb.commercialActions?.generationAllowed,true);assert.equal(vb.commercialActions?.checkoutAllowed,false);
    const generated=await generation;assert.equal(generated.status(),200);
    const gb=await generated.json();assert.equal(gb.briefcaseItemId,itemId);assert.equal(gb.packetStatus,'generating');assert.equal(gb.canDownload,false);
    generationAllowed=false;assert.equal(generationCount,1);assert.equal(unexpectedRequest,false);
    const queued=await native(true);await assertExclusiveWindow();
    const receipt={stage:'ordinary_enqueued_worker_handoff_required',itemId,sessionId,participantUserId:ORDINARY_PARTICIPANT,partnerSlug:ORDINARY_PARTNER,eventId:null,jobId:queued.jobs[0].id,verificationHash:queued.verification.verification_hash,revision:queued.verification.revision,generationRequests:1,saves,journeyComplete:false};
    await checkpoint(receipt);return receipt;
  } finally {
    // Keep the request guard installed on success/failure until the caller closes
    // this context; a delayed UI retry must not enqueue a second job or download.
    generationAllowed=false;
  }
}
