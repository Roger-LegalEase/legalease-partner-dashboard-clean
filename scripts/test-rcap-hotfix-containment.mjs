import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
register('./lib/internal-auth-test-loader.mjs', import.meta.url);
const { setInternalAuthTestState } = await import('./lib/internal-auth-test-doubles.mjs');
const routes = await Promise.all(['weekly','final'].map(kind => import(`../src/app/api/partner-reports/${kind}/route.ts`)));
let passed = 0;
function identity(role, slug = 'synthetic-alpha') {
  setInternalAuthTestState({ user: { id: 'synthetic-user', email: 'operator@example.test' }, rows: role ? [{ auth_user_id:'synthetic-user', partner_slug: role === 'internal_admin' ? null : slug, role, status:'active' }] : [] });
}
function request(partnerId='synthetic-alpha') { return new Request('https://example.test/api/partner-reports', {method:'POST', body:JSON.stringify({ partnerId, partnerName:'FORGED NAME' })}); }
for (const route of routes) {
  setInternalAuthTestState({}); assert.equal((await route.POST(request())).status,401); passed++;
  identity(null); assert.equal((await route.POST(request())).status,403); passed++;
  identity('partner_staff'); assert.equal((await route.POST(request())).status,403); passed++;
  identity('partner_admin'); assert.equal((await route.POST(request('synthetic-beta'))).status,403); passed++;
  const response=await route.POST(request()); assert.equal(response.status,503); assert.match(response.headers.get('content-type'),/json/); assert.equal((await response.json()).sourceStatus,'unavailable'); passed++;
  identity('internal_admin'); assert.equal((await route.POST(request())).status,503); assert.equal((await route.POST(request('All Partners'))).status,400); passed++;
}
const { buildPartnerWeeklyReportData } = await import('../src/lib/reports/partner-weekly-report-data.ts');
assert.throws(()=>buildPartnerWeeklyReportData({partnerId:'synthetic-alpha',partnerName:'Synthetic'}),/unavailable/); passed++;
const { runPartnerAdminAction } = await import('../src/lib/partners/admin-action-runner.ts');
for (const action of ['mark_payment_complete','activate_partner']) {
  const result=await runPartnerAdminAction({action,partnerSlug:'synthetic-alpha',currentProvisioningStatus:'blocked_payment_required'});
  assert.equal(result.success,false); assert.equal(result.persisted,false); passed++;
}
const api=await import('../src/app/api/internal/partners/admin-action/route.ts');
for (const action of ['mark_payment_complete','activate_partner']) {
  identity('internal_admin');
  const response=await api.POST(new Request('https://example.test/api/internal/partners/admin-action',{method:'POST',body:JSON.stringify({action,partnerSlug:'synthetic-alpha'})}));
  assert.equal(response.status,403); passed++;
}
assert.doesNotMatch(fs.readFileSync('src/app/dashboard/partners/page.tsx','utf8'),/PartnerDashboardClient/); passed++;
console.log(`${passed} containment cases PASS; no external database or renderer used.`);
