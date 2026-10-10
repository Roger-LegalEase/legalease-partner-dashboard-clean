// Real authenticated acceptance against the existing isolated application.
// Requires an existing LegalEase-managed, unpublished program with current
// materials. It never creates a workspace, identity, agreement or approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
const origin = process.env.RCAP_ACCEPTANCE_BASE_URL ?? 'http://127.0.0.1:3100';
for (const url of [origin, process.env.NEXT_PUBLIC_SUPABASE_URL]) assert.equal(new URL(url).hostname, '127.0.0.1');
assert.notEqual(process.env.VERCEL_ENV, 'production');
const slug = process.env.RCAP_TEST_PARTNER_SLUG;
const blockedSlug = process.env.RCAP_TEST_BLOCKED_PARTNER_SLUG;
assert.ok(slug && blockedSlug, 'Supply two existing isolated programs: current managed materials and a genuinely blocked program');
const access = JSON.parse(fs.readFileSync(process.env.RCAP_TEST_ACCESS_FILE ?? '/workspaces/training-modules-09-10/output/rcap-practice-access.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const out = 'artifacts/rcap-preview-to-launch'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(60000);
const results = [], errors = [], mutations = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (request.method() === 'POST' && /\/(program|configuration)$/.test(new URL(request.url()).pathname)) mutations.push({ path: new URL(request.url()).pathname, action: request.postDataJSON()?.action });
});
const path = `/internal/partners/onboarding/${slug}`;
async function check(name, run) { await run(); results.push({ name, status: 'PASS' }); console.log('PASS', name); }
async function ops(target = slug) { const response = await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${target}/program`); assert.equal(response.status(), 200); return (await response.json()).operations; }
async function mutation(name, suffix) {
  const pending = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(suffix));
  await page.getByRole('button', { name, exact: true }).click();
  const response = await pending, body = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(body)); return body;
}
async function currentPreviews(state) {
  for (const [type, id] of [['implementation_brief', 'program-summary-preview'], ['co_branded_page_configuration', 'participant-page-preview']]) {
    const material = state.view.materials.find(item => item.type === type); assert.ok(material);
    await page.locator(`#${id}[data-material-id="${material.id}"]`).waitFor();
    assert.equal(await page.locator(`#${id}`).getAttribute('data-material-hash'), material.hash);
    assert.equal(await page.locator(`#${id}`).getAttribute('data-material-version'), String(material.version));
  }
}
async function protectedState(workspaceId) {
  const reads = await Promise.all(['partner_onboarding_agreements', 'rcap_commercial_authorizations'].map(table => db.from(table).select('*').eq('workspace_id', workspaceId).order('id')));
  const record = await db.from('partner_records').select('id,payment_status,stripe_payment_intent_id,paid_at,payment_amount').eq('partner_slug', slug).single();
  assert.equal(record.error, null);
  reads.push(await db.from('partner_packet_entitlement').select('*').eq('partner_id', record.data.id).order('id'));
  for (const read of reads) assert.equal(read.error, null);
  return { records: reads.map(read => read.data), payment: record.data };
}
let initial, prepared, launched;
try {
  await check('Fresh real Platform Admin sign-in displays both current materials without a generation request', async () => {
    await page.goto(`${origin}/sign-in?next=${encodeURIComponent(path)}`);
    await page.locator('input[type=email]').fill(access.owner.email); await page.locator('input[type=password]').fill(access.owner.password);
    await page.getByRole('button', { name: /^sign in$/i }).click(); await page.waitForURL(url => url.pathname === path);
    initial = await ops();
    assert.equal(initial.view.decision.operatingModel, 'legalease_managed'); assert.equal(initial.view.decision.live, false); assert.equal(initial.canStart, true);
    await currentPreviews(initial); assert.equal(mutations.length, 0);
    assert.ok((await page.getByRole('navigation', { name: 'Program material navigation', exact: true }).boundingBox()).y < 500);
    assert.equal(await page.getByRole('button', { name: /^(Generate|Update) Materials$/ }).count(), 0);
    await page.getByRole('heading', { name: 'Final Review & Start Program', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Start Program', exact: true }).count(), 1);
  });
  await check('Existing Spanish materials remain visible and switch language without regeneration', async () => {
    const spanishSlug = process.env.RCAP_TEST_SPANISH_PARTNER_SLUG;
    assert.ok(spanishSlug, 'Supply an existing isolated Spanish-enabled program with current materials');
    const spanish = await ops(spanishSlug);
    assert.equal(spanish.view.data.geography_audience_language_accessibility.enable_spanish, true);
    const participant = spanish.view.materials.find(material => material.type === 'co_branded_page_configuration'); assert.ok(participant);
    const beforeRequests = mutations.length;
    await page.goto(`${origin}/internal/partners/onboarding/${spanishSlug}`); await currentPreviews(spanish);
    await page.getByRole('link', { name: 'View Participant Page', exact: true }).click();
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await page.getByRole('heading', { name: participant.document.pagePreview.spanish.headline, exact: true }).waitFor();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('heading', { name: participant.document.pagePreview.headline.value, exact: true }).waitFor();
    await page.reload(); await currentPreviews(spanish); assert.equal(mutations.length, beforeRequests);
    await page.goto(`${origin}${path}`);
  });
  const immutableBefore = await protectedState(initial.identity.workspaceId);
  const summaryBefore = initial.view.materials.find(material => material.type === 'implementation_brief');
  const pageBefore = initial.view.materials.find(material => material.type === 'co_branded_page_configuration');
  const summaryApprovalBefore = await db.from('partner_onboarding_artifact_versions').select('approval_status,partner_review_status,source_drift_invalidated_at,superseded_at').eq('id', summaryBefore.id).single(); assert.equal(summaryApprovalBefore.error, null);
  await check('Both View actions navigate and move keyboard focus to the exact current document', async () => {
    for (const [title, id] of [['Program Summary', 'program-summary-preview'], ['Participant Page', 'participant-page-preview']]) {
      await page.getByRole('link', { name: `View ${title}`, exact: true }).focus(); await page.keyboard.press('Enter');
      await page.waitForURL(url => url.hash === `#${id}`);
      assert.equal(await page.evaluate(() => document.activeElement.id), id);
      const top = await page.locator(`#${id}`).evaluate(element => element.getBoundingClientRect().top); assert.ok(top >= 100 && top < 200);
    }
    await page.reload(); await currentPreviews(initial); assert.equal(mutations.length, 0);
    assert.equal(await page.getByLabel('Confirm operating scope and current materials', { exact: true }).isChecked(), false);
  });
  await check('Save reads back the edit, exposes Review Program Materials, and invalidates only the affected page', async () => {
    await page.getByLabel('Confirm operating scope and current materials', { exact: true }).check();
    const headline = page.locator('#program-field-program_headline input');
    const original = await headline.inputValue(); await headline.fill(`${original} · preview acceptance`);
    assert.equal(await page.getByRole('button', { name: 'Start Program', exact: true }).count(), 0);
    const saved = await mutation('Save program', '/configuration');
    assert.equal(saved.configuration.data.brand_public_page.program_headline, `${original} · preview acceptance`);
    await page.getByRole('link', { name: 'Review Program Materials', exact: true }).click();
    await page.waitForURL(url => url.hash === '#program-materials'); assert.equal(await page.evaluate(() => document.activeElement.id), 'program-materials');
    await page.getByRole('button', { name: 'Update Materials', exact: true }).waitFor();
    const stale = await ops(); assert.deepEqual(stale.view.materials.map(material => material.id), [summaryBefore.id]); assert.equal(stale.canStart, false);
    assert.equal(await page.locator('#participant-page-preview').count(), 0); assert.equal(await page.locator('#program-summary-preview').getAttribute('data-material-id'), summaryBefore.id);
    assert.equal(await page.getByText('Ready for your review and confirmation.', { exact: true }).count(), 0);
    assert.equal(mutations.filter(item => item.action === 'prepare').length, 0);
  });
  await check('One Update Materials request regenerates only the stale page and preserves the summary and approvals', async () => {
    prepared = (await mutation('Update Materials', '/program')).operations;
    assert.equal(prepared.canStart, true); assert.equal(prepared.view.materials.length, 2);
    const summary = prepared.view.materials.find(material => material.type === 'implementation_brief');
    const participant = prepared.view.materials.find(material => material.type === 'co_branded_page_configuration');
    assert.equal(summary.id, summaryBefore.id); assert.equal(summary.hash, summaryBefore.hash); assert.equal(summary.version, summaryBefore.version);
    assert.notEqual(participant.id, pageBefore.id); assert.equal(participant.version, pageBefore.version + 1);
    const approval = await db.from('partner_onboarding_artifact_versions').select('approval_status,partner_review_status,source_drift_invalidated_at,superseded_at').eq('id', summary.id).single(); assert.equal(approval.error, null); assert.deepEqual(approval.data, summaryApprovalBefore.data);
    await currentPreviews(prepared); assert.equal(mutations.filter(item => item.action === 'prepare').length, 1);
    await page.reload(); await currentPreviews(prepared);
    assert.equal(await page.getByRole('button', { name: /^(Generate|Update) Materials$/ }).count(), 0);
    assert.equal(await page.getByLabel('Confirm operating scope and current materials', { exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('button', { name: 'Start Program', exact: true }).isEnabled(), false);
    const final = page.getByRole('region', { name: 'Final Review & Start Program', exact: true });
    assert.equal(await final.evaluate(element => element.previousElementSibling.getAttribute('aria-label')), 'Current program preview');
    for (const jurisdiction of prepared.view.data.geography_audience_language_accessibility.jurisdictions) assert.ok((await final.innerText()).includes(jurisdiction));
    await final.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/final-review.png` });
  });
  await check('A genuine blocked program shows one direct resolution and its actual Start endpoint still refuses publication', async () => {
    await page.goto(`${origin}/internal/partners/onboarding/${blockedSlug}`);
    const held = await ops(blockedSlug); assert.equal(held.canStart, false);
    assert.equal(await page.getByRole('button', { name: 'Start Program', exact: true }).count(), 0);
    const next = page.getByLabel('Next launch step', { exact: true }); assert.equal(await next.count(), 1);
    assert.equal(await next.getByRole('button', { name: 'Generate Materials', exact: true }).count(), 1);
    const denied = await context.request.post(`${origin}/api/internal/partners/onboarding/phase1/${blockedSlug}/program`, { headers: { origin }, data: { action: 'start', version: held.view.version, scopeHash: held.view.decision.scopeHash, reviewToken: held.view.reviewToken, confirmed: true, requestId: crypto.randomUUID(), reason: 'Verify missing-materials denial' } });
    assert.ok(denied.status() >= 400); assert.equal((await ops(blockedSlug)).view.decision.live, false);
    await page.goto(`${origin}${path}`); await currentPreviews(prepared);
  });
  await check('One authenticated final confirmation completes the real protected publication transaction', async () => {
    await page.getByLabel('Confirm operating scope and current materials', { exact: true }).check();
    assert.equal(await page.getByRole('button', { name: 'Start Program', exact: true }).isEnabled(), true);
    const pending = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/program') && request.postDataJSON()?.action === 'start');
    launched = (await mutation('Start Program', '/program')).operations;
    const startRequest = (await pending).postDataJSON(); assert.equal(launched.view.decision.live, true);
    const record = await db.from('partner_onboarding').select('status,rcap_launch_operation_id').eq('id', initial.identity.workspaceId).single(); assert.equal(record.error, null); assert.equal(record.data.status, 'live');
    const receipts = await db.from('rcap_launch_operation_events').select('step,evidence').eq('operation_id', record.data.rcap_launch_operation_id).order('created_at'); assert.equal(receipts.error, null);
    assert.deepEqual(receipts.data.map(receipt => receipt.step), ['prepared', 'publication_staged', 'public_verified', 'complete']);
    assert.deepEqual(receipts.data.at(-1).evidence.intakeJurisdictions, prepared.view.data.geography_audience_language_accessibility.jurisdictions);
    const replay = await context.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/program`, { headers: { origin }, data: startRequest }); assert.equal(replay.status(), 200);
    const replayRecord = await db.from('partner_onboarding').select('rcap_launch_operation_id').eq('id', initial.identity.workspaceId).single(); assert.equal(replayRecord.data.rcap_launch_operation_id, record.data.rcap_launch_operation_id);
    const approvals = await db.from('partner_onboarding_launch_approvals').select('approval_type,policy_details').eq('workspace_id', initial.identity.workspaceId); assert.equal(approvals.error, null); assert.equal(approvals.data.some(item => item.approval_type === 'partner_launch_approval'), false);
    assert.deepEqual(await protectedState(initial.identity.workspaceId), immutableBefore);
    fs.writeFileSync(`${out}/launch-evidence.json`, JSON.stringify({ slug, operation: record.data, receipts: receipts.data, approvals: approvals.data }, null, 2));
    await page.getByRole('heading', { name: 'Program dashboard', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Program activity', exact: true }).click(); await page.locator('#program-activity').waitFor();
    await page.screenshot({ path: `${out}/live-dashboard.png` });
  });
  await check('Published page, language settings, multistate intake and Clinic navigation retain the saved scope', async () => {
    await page.getByRole('link', { name: 'Open participant page', exact: true }).click(); await page.waitForURL(url => url.pathname === `/p/${slug}`);
    const participant = prepared.view.materials.find(material => material.type === 'co_branded_page_configuration').document.pagePreview;
    await page.getByRole('heading', { name: participant.headline.value, exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Español', exact: true }).count(), participant.spanishEnabled ? 1 : 0);
    if (participant.spanishEnabled) { await page.getByRole('button', { name: 'Español', exact: true }).click(); await page.getByRole('heading', { name: participant.spanish.headline, exact: true }).waitFor(); await page.getByRole('button', { name: 'English', exact: true }).click(); }
    await page.goto(`${origin}/intake/${slug}`);
    const jurisdictions = prepared.view.data.geography_audience_language_accessibility.jurisdictions;
    assert.deepEqual(await page.getByLabel('Screening jurisdiction', { exact: true }).locator('option').evaluateAll(options => options.map(option => option.value).filter(Boolean)), jurisdictions);
    await page.goto(`${origin}/intake/${slug}?jurisdiction=NY`); assert.equal(await page.getByRole('button', { name: /Start your record-clearing screening/i }).count(), 0);
    await page.goto(`${origin}${path}`); await page.getByRole('link', { name: 'Manage program clinics', exact: true }).first().click(); await page.getByRole('heading', { name: 'Nationwide Clinic Mode', exact: true }).waitFor();
    assert.deepEqual(await page.locator('select[name=jurisdiction] option').evaluateAll(options => options.map(option => option.value).filter(Boolean)), jurisdictions);
  });
  await check('An existing partner administrator retains their own workspace and cannot enter the internal launch API', async () => {
    const users = await db.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.equal(users.error, null);
    let selected;
    for (const user of users.data.users.filter(user => user.email?.startsWith('rcap-correction-'))) {
      const membership = await db.from('partner_users').select('partner_slug').eq('auth_user_id', user.id).eq('role', 'partner_admin').eq('status', 'active').maybeSingle();
      if (membership.data) { selected = { user, slug: membership.data.partner_slug }; break; }
    }
    assert.ok(selected, 'Existing authorized local partner identity');
    const before = await db.from('partner_onboarding').select('*').eq('partner_slug', selected.slug).single(); assert.equal(before.error, null);
    const partnerContext = await browser.newContext(), partnerPage = await partnerContext.newPage(); partnerPage.setDefaultTimeout(60000);
    await partnerPage.goto(`${origin}/sign-in?next=%2Fpartner%2Fonboarding`); await partnerPage.locator('input[type=email]').fill(selected.user.email); await partnerPage.locator('input[type=password]').fill(access.owner.password); await partnerPage.getByRole('button', { name: /^sign in$/i }).click();
    await partnerPage.waitForURL(url => ['/partner/dashboard', '/partner/onboarding'].includes(url.pathname)); assert.match(await partnerPage.locator('main').innerText(), /Your program|Program setup|program information/i);
    const denied = await partnerContext.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/program`); assert.equal(denied.status(), 403);
    const after = await db.from('partner_onboarding').select('*').eq('id', before.data.id).single(); assert.deepEqual(after.data, before.data);
    await partnerContext.close();
  });
  assert.deepEqual(errors, []);
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  fs.writeFileSync(`${out}/failure-text.txt`, await page.locator('body').innerText().catch(() => '')); throw error;
} finally {
  const summarize = state => state ? { canStart: state.canStart, live: state.view.decision.live, materials: state.view.materials.map(({ type, id, version, hash }) => ({ type, id, version, hash })) } : null;
  fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify({ results, errors, mutations, initial: summarize(initial), prepared: summarize(prepared), launched: summarize(launched) }, null, 2));
  await browser.close();
}
