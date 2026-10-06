import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Mutate only disposable fixtures. Each mutant must execute assertions, not
// fail through a parse/import error; the unchanged positive control runs first.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'checkout-return-mutations-'));
const helper = 'rcap-stripe-checkout-browser.mjs';
const original = fs.readFileSync(new URL(helper, import.meta.url), 'utf8');
const payment = 'rcap-hosted-acceptance-payment.mjs';
const originalPayment = fs.readFileSync(new URL(payment, import.meta.url), 'utf8');
const mutations = [
  ['omit navigation observer', "page.on('framenavigated', observeReturn);", "// observer omitted"],
  ['erase exact-return latch', 'exactReturnObserved || unexpectedDestination', 'unexpectedDestination'],
  ['post-return failure erases completion', 'return { completed: true, returnUrl:', 'return { completed: false, returnUrl:'],
  ['generic pre-return error accepted', 'if (exactReturnObserved && !unexpectedDestination)', 'if (!unexpectedDestination)'],
  ['capture exception leaks secrets', "catch { captureFailure('onReturn'); }", "catch (error) { notes.push(error.message); captureFailure('onReturn'); }"],
  ['settlement alone accepts', 'settled && outcome.completed === true,', 'settled,', payment],
  ['omit bootstrap', 'const bootstrap = await bootstrapPreviewCheckoutReturn(context, expectedReturnUrl, previewProtectionBypassSecret);', "const bootstrap = { origin: '', pathname: '', cookieName: '', cookieDomain: '' };"],
  ['wrong bootstrap host', "target.origin + '/api/health'", "'https://checkout.stripe.com/api/health'"],
  ['redirect forwarding', 'maxRedirects: 0', 'maxRedirects: 20'],
  ['omit secret header', "'x-vercel-protection-bypass': previewProtectionBypassSecret", "'x-vercel-protection-bypass': ''"],
  ['global headers', 'browser.newContext()', "browser.newContext({ extraHTTPHeaders: { 'x-vercel-protection-bypass': previewProtectionBypassSecret } })"],
  ['invent cookie proof', 'const cookies = await context.cookies(target.origin);', "const cookies = [{ name: '_vercel_jwt', domain: target.hostname, path: '/', secure: true }];"],
  ['accept wrong cookie host', "item.domain.replace(/^\\./, '') === target.hostname", 'true'],
  ['skip application proof', "body?.ok !== true || body?.checks?.db !== 'ok' || typeof body.timestamp !== 'string'", 'false'],
  ['persist secret', 'cookieName: cookie.name, cookieDomain: cookie.domain', 'cookieName: previewProtectionBypassSecret, cookieDomain: cookie.domain'],
  ['persist cookie value', 'cookieName: cookie.name, cookieDomain: cookie.domain', 'cookieName: cookie.value, cookieDomain: cookie.domain'],
  ['persist query', 'url.origin + url.pathname', 'url.href'],
  ['accept arbitrary destination', "url.origin === target.origin", 'true'],
  ['ignore matter path', 'url.pathname === target.pathname', 'true'],
  ['ignore required query', '[...target.searchParams].every(([key, value]) => url.searchParams.get(key) === value)', 'true'],
  ['ignore provider challenge', 'if (await scope.locator(selector).first().isVisible())', 'if (false)'],
];
try {
  for (const file of [helper, 'rcap-stripe-checkout-browser.test.mjs', 'rcap-hosted-acceptance-payment.mjs']) {
    fs.copyFileSync(new URL(file, import.meta.url), path.join(root, file));
  }
  fs.symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
  const run = () => spawnSync(process.execPath, ['rcap-stripe-checkout-browser.test.mjs'], {
    cwd: root, encoding: 'utf8', timeout: 30_000, env: { PATH: process.env.PATH }, maxBuffer: 4 * 1024 * 1024
  });
  const baseline = run();
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  let caught = 0;
  for (const [name, from, to, file = helper] of mutations) {
    const source = file === helper ? original : originalPayment;
    fs.writeFileSync(path.join(root, helper), original);
    fs.writeFileSync(path.join(root, payment), originalPayment);
    assert.ok(source.includes(from), `mutation target exists: ${name}`);
    fs.writeFileSync(path.join(root, file), source.replace(from, to));
    const result = run();
    assert.equal(result.status, 1, `${name}: must fail assertions, not crash or time out`);
    assert.match(result.stdout + result.stderr, /ERR_ASSERTION/, name);
    assert.doesNotMatch(result.stdout + result.stderr, /SyntaxError|ERR_MODULE_NOT_FOUND/, name);
    console.log(`DETECTED ${name}`); caught++;
  }
  console.log(`Checkout return mutations: ${caught}/${mutations.length} detected; positive control passed`);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
