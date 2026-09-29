import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { requireNoProviderChallenge, fillRemainingRequired, isExpectedCheckoutReturn,
  expectedCheckoutTotal, checkoutAmountMatches, completeHostedCheckout } from './rcap-stripe-checkout-browser.mjs';

test('ordinary, partially discounted and zero-total attempts have distinct exact amounts', () => {
  assert.equal(expectedCheckoutTotal({ promotionCode: null }), 5000);
  assert.equal(expectedCheckoutTotal({ promotionCode: 'PARTIAL', value: '2500' }), 2500);
  assert.equal(expectedCheckoutTotal({ promotionCode: 'FREE', value: '0' }), 0);
  for (const value of ['', '-1', '1.5', '0500', 'NaN', '5000', '10000']) {
    assert.throws(() => expectedCheckoutTotal({ promotionCode: 'CODE', value }), undefined, value);
  }
  assert.throws(() => expectedCheckoutTotal({ promotionCode: null, value: '0' }));
  const session = { amount_subtotal: 5000, amount_total: 2500, currency: 'usd' };
  assert.equal(checkoutAmountMatches(session, 2500), true);
  for (const patch of [{ amount_total: 0 }, { amount_total: 5000 }, { amount_subtotal: 6000 }, { currency: 'eur' }]) {
    assert.equal(checkoutAmountMatches({ ...session, ...patch }, 2500), false);
  }
  assert.equal(checkoutAmountMatches({ ...session, amount_total: 0 }, 0), true);
});

// Local control tests only: these doubles prove the harness stops, never that
// a provider completed Checkout. No network, credentials, or payment is used.
function pageWith({ challenge = '', framed = false, controls = [] } = {}) {
  const scope = visible => ({ locator: selector => ({
    first: () => ({ isVisible: async () => selector === visible }),
    all: async () => controls,
  }) });
  const page = scope(framed ? '' : challenge);
  page.mainFrame = () => page;
  page.frames = () => framed ? [page, scope(challenge)] : [page];
  return page;
}

for (const framed of [false, true]) {
  for (const challenge of [
    'input[autocomplete="one-time-code"]',
    'iframe[title*="challenge" i]',
    'iframe[title*="captcha" i]',
  ]) {
    test(`provider challenge stops before any field mutation (${framed ? 'frame' : 'page'}, ${challenge})`, async () => {
      const page = pageWith({ challenge, framed });
      await assert.rejects(requireNoProviderChallenge(page), { code: 'CHECKOUT_HUMAN_INTERACTION_REQUIRED' });
      await assert.rejects(fillRemainingRequired(page, []), { code: 'CHECKOUT_HUMAN_INTERACTION_REQUIRED' });
    });
  }
}

test('no visible challenge allows ordinary Checkout field inspection', async () => {
  await requireNoProviderChallenge(pageWith());
});

function control(name, { required = true, tag = 'input' } = {}) {
  const writes = [];
  return {
    writes,
    isVisible: async () => true, isDisabled: async () => false,
    inputValue: async () => '',
    evaluate: async () => ({ name, required, tag, type: 'text', autocomplete: '', placeholder: '' }),
    fill: async value => writes.push(value),
    selectOption: async value => writes.push(value),
    locator: () => ({ allTextContents: async () => ['Choose', 'Canada'] }),
  };
}

test('unknown required inputs and selects are reported without invented answers', async () => {
  const controls = [control('verificationCode'), control('securityQuestion', { tag: 'select' })];
  assert.deepEqual(await fillRemainingRequired(pageWith({ controls }), []), ['verificationCode', 'securityQuestion']);
  assert.ok(controls.every(item => item.writes.length === 0));
});

test('optional controls stay untouched and required known billing inputs use fixture data', async () => {
  const optional = control('phone', { required: false });
  const postal = control('postal');
  assert.deepEqual(await fillRemainingRequired(pageWith({ controls: [optional, postal] }), []), []);
  assert.deepEqual(optional.writes, []);
  assert.deepEqual(postal.writes, ['42424']);
});

test('a required country with no authorized option is not guessed', async () => {
  const country = control('billingCountry', { tag: 'select' });
  assert.deepEqual(await fillRemainingRequired(pageWith({ controls: [country] }), []), ['billingCountry']);
  assert.deepEqual(country.writes, []);
});

test('only the same application, matter, success state and Session count as a return', () => {
  const expected = 'https://preview.vercel.app/briefcase/matter-a?checkout=success&session_id=cs_test_a';
  assert.equal(isExpectedCheckoutReturn(expected, expected), true);
  assert.equal(isExpectedCheckoutReturn(expected + '&extra=provider', expected), true);
  for (const actual of [
    expected.replace('preview.vercel.app', 'challenge.stripe.com'),
    expected.replace('matter-a', 'matter-b'),
    expected.replace('success', 'cancelled'),
    expected.replace('cs_test_a', 'cs_test_b'),
    'https://preview.vercel.app/sign-in', 'about:blank',
  ]) assert.equal(isExpectedCheckoutReturn(actual, expected), false, actual);
  assert.equal(isExpectedCheckoutReturn(expected, undefined), false);
});

for (const scenario of ['challenge', 'cookies-fail', 'wrong-return', 'success', 'bootstrap-redirect', 'no-secret', 'no-cookie', 'wrong-cookie-host', 'parent-cookie-host', 'wrong-cookie-name', 'insecure-cookie', 'bootstrap-fail', 'bootstrap-foreign-redirect', 'bootstrap-wrong-url', 'proof-fail', 'proof-html', 'non-vercel-return', 'navigation-race', 'delayed-commit-race', 'event-race', 'deadline-return', 'capture-error', 'dom-ready-error', 'screenshot-error', 'generic-before-return', 'submit-error', 'wrong-path', 'wrong-query', 'iframe-only']) {
  test(`Checkout orchestration ${scenario} with local browser double`, async t => {
    const expected = scenario === 'non-vercel-return' ? 'https://untrusted.example/briefcase/matter-a?checkout=success' : 'https://preview.vercel.app/briefcase/matter-a?checkout=success';
    const secret = 'SYNTHETIC-bypass-SECRET';
    const cookieValue = 'SYNTHETIC-cookie-VALUE';
    const events = [];
    const requests = [];
    const succeeds = ['success', 'bootstrap-redirect', 'navigation-race', 'delayed-commit-race', 'event-race', 'deadline-return', 'capture-error', 'dom-ready-error', 'screenshot-error'].includes(scenario);
    const opensStripe = succeeds || ['challenge', 'wrong-return', 'generic-before-return', 'submit-error', 'wrong-path', 'wrong-query', 'iframe-only'].includes(scenario);
    let current = 'https://checkout.stripe.com/c/pay/cs_test_local';
    const mutations = [];
    let closed = 0;
    let captures = 0;
    const challengeSelectors = /one-time-code|challenge|captcha|Verify your identity/;
    let listener = null;
    let submitted = false;
    let clock = 0;
    if (scenario === 'deadline-return') t.mock.method(Date, 'now', () => submitted ? (clock += 100_000) : 0);
    let waitsAfterSubmit = 0;
    let returnEventSeen = false;
    const sensitiveError = `execution context was destroyed ${secret} ${cookieValue} ?session=private-token`;
    const page = {
      on: (name, fn) => { assert.equal(name, 'framenavigated'); listener = fn; },
      off: (name, fn) => { assert.equal(listener, fn); listener = null; },
      waitForLoadState: async () => { if (scenario === 'dom-ready-error') throw Error(sensitiveError); },
      waitForURL: async (predicate, options) => {
        assert.equal(options.waitUntil, 'commit');
        assert.equal(scenario, 'delayed-commit-race');
        assert.equal(predicate(new URL(expected)), true);
        current = expected; listener?.(page);
      },
      screenshot: async () => { if (submitted && scenario === 'screenshot-error') throw Error(sensitiveError); },
      goto: async (url, options) => { events.push('stripe'); assert.equal(url, current); assert.equal(requests.length, 2); assert.equal(options.headers, undefined); }, waitForTimeout: async () => {
        if (submitted && ++waitsAfterSubmit > 3) throw Error('synthetic return deadline');
        if (submitted && scenario === 'generic-before-return') throw Error(`generic ${secret} ${cookieValue}`);
        if (submitted && scenario === 'iframe-only') throw Error('no main-frame return');
      }, url: () => current,
      mainFrame: () => page, frames: () => [page],
      locator: selector => ({
        all: async () => [], innerText: async () => '$0.00',
        allInnerTexts: async () => {
          if (scenario === 'deadline-return') { current = expected; listener?.(page); }
          return [];
        },
        first: () => ({
          isVisible: async () => {
            if (submitted && ['navigation-race', 'delayed-commit-race'].includes(scenario)) {
              if (scenario === 'navigation-race') { current = expected; listener?.(page); }
              throw Error(sensitiveError);
            }
            return challengeSelectors.test(selector)
              ? scenario === 'challenge' && selector.includes('one-time-code') : true;
          },
          isDisabled: async () => false,
          fill: async () => mutations.push('fill'),
          click: async () => {
            mutations.push(selector);
            if (selector.includes('hosted-payment-submit-button')) {
              submitted = true;
              if (scenario === 'submit-error') throw Error(`generic submit failure ${secret} ${cookieValue}`);
              if (['navigation-race', 'delayed-commit-race', 'generic-before-return', 'deadline-return'].includes(scenario)) return;
              if (scenario === 'iframe-only') { listener?.({ url: () => expected }); return; }
              current = scenario === 'wrong-return' ? 'https://challenge.stripe.com/verify?token=private-token&email=private-person#private-fragment'
                : scenario === 'wrong-path' ? expected.replace('matter-a', 'matter-b')
                : scenario === 'wrong-query' ? expected.replace('success', 'cancelled') : expected;
              returnEventSeen = isExpectedCheckoutReturn(current, expected);
              listener?.(page);
              if (scenario === 'event-race') current = expected.split('?')[0];
            }
          },
        }),
      }),
    };
    const context = {
      newPage: async () => page,
      request: { get: async (url, options) => {
        events.push('bootstrap'); requests.push({ url, options });
        assert.equal(url, 'https://preview.vercel.app/api/health');
        assert.equal(options.maxRedirects, 0, 'headers must never follow redirects');
        const first = requests.length === 1;
        assert.deepEqual(options.headers, first ? { 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' } : undefined);
        if (scenario === 'bootstrap-fail') throw Error(`request headers ${secret}; Set-Cookie ${cookieValue}`);
        return {
          url: () => scenario === 'bootstrap-wrong-url' ? 'https://untrusted.example/api/health' : url,
          status: () => first && ['bootstrap-redirect', 'bootstrap-foreign-redirect'].includes(scenario) ? 307 : !first && scenario === 'proof-fail' ? 401 : 200,
          headers: () => ({ location: scenario === 'bootstrap-foreign-redirect' ? 'https://checkout.stripe.com/leak' : '/api/health' }),
          json: async () => scenario === 'proof-html' ? '<html>Vercel Authentication</html>' : { ok: true, checks: { db: 'ok' }, timestamp: '2026-09-29T00:00:00Z' },
          dispose: async () => {},
        };
      } },
      cookies: async origin => {
        assert.equal(origin, 'https://preview.vercel.app');
        return scenario === 'no-cookie' ? [] : [{ name: scenario === 'wrong-cookie-name' ? 'session' : '_vercel_jwt',
          domain: scenario === 'wrong-cookie-host' ? 'other.vercel.app' : scenario === 'parent-cookie-host' ? '.vercel.app' : 'preview.vercel.app',
          path: '/', secure: scenario !== 'insecure-cookie', value: cookieValue }];
      },
      addCookies: async () => { if (scenario === 'cookies-fail') throw new Error('invalid session cookies'); },
      close: async () => { closed++; },
    };
    t.mock.method(chromium, 'launch', async () => ({ newContext: async options => { assert.equal(options?.extraHTTPHeaders, undefined); return context; }, close: async () => { closed++; } }));
    const outcome = await completeHostedCheckout({ checkoutUrl: current, expectedReturnUrl: expected,
      previewProtectionBypassSecret: scenario === 'no-secret' ? '' : secret,
      sessionCookies: [{ name: 'synthetic', value: 'local-only' }],
      screenshotDir: scenario === 'screenshot-error' ? '/tmp/checkout-followup-synthetic-screenshots' : null,
      onReturn: async () => {
        assert.equal(scenario === 'event-race' ? returnEventSeen : isExpectedCheckoutReturn(current, expected), true, 'capture requires exact return');
        captures++;
        if (scenario === 'capture-error') throw Error(sensitiveError);
      } });
    assert.equal(outcome.completed, succeeds);
    assert.equal(captures, succeeds ? 1 : 0);
    assert.equal(closed, 2);
    if (['capture-error', 'dom-ready-error', 'screenshot-error', 'navigation-race', 'delayed-commit-race'].includes(scenario)) {
      assert.ok(outcome.postReturnCaptureFailures.length > 0, 'capture failure is separate from completion');
    }
    assert.equal(events.includes('stripe'), opensStripe, 'bootstrap failure must stop before Stripe');
    if (opensStripe) assert.deepEqual(events, ['bootstrap', 'bootstrap', 'stripe']);
    const evidence = JSON.stringify(outcome);
    for (const sensitive of [secret, cookieValue, 'private-token', 'private-person', 'private-fragment']) assert.ok(!evidence.includes(sensitive), sensitive);
    if (scenario === 'wrong-return') assert.match(evidence, /Unexpected Checkout destination: https:\/\/challenge.stripe.com\/verify;/);
    if (succeeds) assert.ok(evidence.includes('cookie _vercel_jwt domain preview.vercel.app'));
    if (!opensStripe) assert.deepEqual(mutations, []);
    if (scenario === 'challenge' || scenario === 'cookies-fail') assert.deepEqual(mutations, []);
    if (scenario === 'challenge' || scenario === 'wrong-return') assert.equal(outcome.humanInteractionRequired, true);
    assert.ok(mutations.filter(value => value.includes('hosted-payment-submit-button')).length <= 1);
  });
}


test('hosted payment supplies the bypass only through the narrow helper parameter', () => {
  const source = fs.readFileSync(new URL('./rcap-stripe-checkout-browser.mjs', import.meta.url), 'utf8');
  const harness = fs.readFileSync(new URL('./rcap-hosted-acceptance-payment.mjs', import.meta.url), 'utf8');
  assert.match(harness, /completeHostedCheckout\(\{[\s\S]*?previewProtectionBypassSecret: BYPASS,/);
  assert.doesNotMatch(source, /extraHTTPHeaders|setExtraHTTPHeaders|storageState/);
  assert.match(source, /maxRedirects: 0/);
});


test('payment acceptance requires settlement AND a positively observed browser return', () => {
  const harness = fs.readFileSync(new URL('./rcap-hosted-acceptance-payment.mjs', import.meta.url), 'utf8');
  const expression = harness.match(/record\(\s*"customer_completed_the_hosted_checkout_page",\s*([^,]+),/)[1];
  const accepts = new Function('settled', 'outcome', `return (${expression});`);
  for (const settled of [false, true]) for (const completed of [false, true, undefined, 'true']) {
    assert.equal(accepts(settled, { completed }), settled && completed === true);
  }
  assert.match(harness, /if \(!settled \|\| outcome.completed !== true \|\| outcome.humanInteractionRequired\) finish\(\);/);
});
