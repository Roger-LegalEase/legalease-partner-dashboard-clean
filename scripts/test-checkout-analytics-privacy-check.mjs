import fs from 'node:fs';
import assert from 'node:assert/strict';
import { checkoutAnalyticsPrivacyProblems as check } from './lib/checkout-analytics-privacy-check.mjs';
const route = fs.readFileSync('src/app/api/expungement-ai/payment/confirm/route.ts','utf8');
const helper = fs.readFileSync('src/lib/expungement-ai/checkout-analytics.ts','utf8');
assert.deepEqual(await check(route, helper), []);
let n = 1;
const cases = [
 ['helper absent', route, ''],
 ['route absent', '', helper],
 ['helper import wrong', route.replace('@/lib/expungement-ai/checkout-analytics','@/lib/fake'), helper],
 ['helper call removed', route.replace('    scheduleConsumerCheckoutCompleted({', '    unrelatedFunction({'), helper],
 ['paid guard removed', route.replace('if (status.paid)', 'if (true)'), helper],
 ['response waits analytics', route.replace('    scheduleConsumerCheckoutCompleted({', '    await scheduleConsumerCheckoutCompleted({'), helper],
 ['server-only removed', route, helper.replace('import "server-only";', '')],
 ['emitter import wrong', route, helper.replace('@/lib/analytics/server-events','@/lib/fake')],
 ['event removed', route, helper.replace('"checkout_completed"', '"page_view"')],
 ['raw email metadata', route, helper.replace('meta: { result:', 'meta: { email: options.email, result:')],
 ['raw session metadata', route, helper.replace('meta: { result:', 'meta: { checkout_session_id: options.checkoutSessionId, result:')],
 ['full participant spread', route, helper.replace('meta: { result:', 'meta: { ...options, result:')],
 ['helper logging', route, helper.replace('  await recordServerFunnelEvent', '  console.log(options);\n  await recordServerFunnelEvent')],
 ['scheduler disconnected', route, helper.replace('after(() => recordConsumerCheckoutCompleted(options));', 'after(() => undefined);')],
 ['fallback disconnected', route, helper.replace('void recordConsumerCheckoutCompleted(options);', 'void options;')],
];
for (const [name,r,h] of cases) { assert.notEqual((await check(r,h)).length, 0, name); n++; }
console.log(`${n} checkout analytics privacy controls PASS (isolated source mutations; no application writes)`);
