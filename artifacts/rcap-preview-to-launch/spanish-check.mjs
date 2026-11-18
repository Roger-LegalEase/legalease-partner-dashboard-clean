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
    await page.goto(`${origin}/sign-in?next=${encodeURIComponent(path)}`);
    await page.locator('input[type=email]').fill(access.owner.email); await page.locator('input[type=password]').fill(access.owner.password);
    await page.getByRole('button', { name: /^sign in$/i }).click(); await page.waitForURL(url => url.pathname === path);
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
await check('Material navigation is visible above configuration and targets stay clear of the fixed header', async () => {
  const state=await ops(); await page.goto(`${origin}${path}`); await currentPreviews(state);
  const nav=page.getByRole('navigation',{name:'Program material navigation',exact:true});
  assert.ok((await nav.boundingBox()).y<500);
  await page.screenshot({path:`${out}/workspace-entry.png`});
  for(const [title,id] of [['Program Summary','program-summary-preview'],['Participant Page','participant-page-preview']]) {
    await page.getByRole('link',{name:`View ${title}`,exact:true}).focus(); await page.keyboard.press('Enter');
    await page.waitForURL(url=>url.hash===`#${id}`);
    assert.equal(await page.evaluate(()=>document.activeElement.id),id);
    const top=await page.locator(`#${id}`).evaluate(el=>el.getBoundingClientRect().top);assert.ok(top>=100&&top<200);
  }
  await page.reload();await currentPreviews(state);assert.equal(mutations.length,0);
});
assert.deepEqual(errors, []);
} finally { fs.writeFileSync(`${out}/navigation-results.json`, JSON.stringify({results,errors,mutations},null,2)); await browser.close(); }
