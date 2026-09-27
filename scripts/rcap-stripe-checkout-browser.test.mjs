import assert from 'node:assert/strict';
import test from 'node:test';
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

for (const scenario of ['challenge', 'cookies-fail', 'wrong-return', 'success']) {
  test(`Checkout orchestration ${scenario} with local browser double`, async t => {
    const expected = 'https://preview.vercel.app/briefcase/matter-a?checkout=success';
    let current = 'https://checkout.stripe.com/c/pay/cs_test_local';
    const mutations = [];
    let closed = 0;
    let captures = 0;
    const challengeSelectors = /one-time-code|challenge|captcha|Verify your identity/;
    const page = {
      goto: async () => {}, waitForTimeout: async () => {}, url: () => current,
      mainFrame: () => page, frames: () => [page],
      locator: selector => ({
        all: async () => [], innerText: async () => '$0.00',
        first: () => ({
          isVisible: async () => challengeSelectors.test(selector)
            ? scenario === 'challenge' && selector.includes('one-time-code') : true,
          isDisabled: async () => false,
          fill: async () => mutations.push('fill'),
          click: async () => {
            mutations.push(selector);
            if (selector.includes('hosted-payment-submit-button')) {
              current = scenario === 'wrong-return' ? 'https://challenge.stripe.com/verify' : expected;
            }
          },
        }),
      }),
    };
    const context = {
      newPage: async () => page,
      addCookies: async () => { if (scenario === 'cookies-fail') throw new Error('invalid session cookies'); },
      close: async () => { closed++; },
    };
    t.mock.method(chromium, 'launch', async () => ({ newContext: async () => context, close: async () => { closed++; } }));
    const outcome = await completeHostedCheckout({ checkoutUrl: current, expectedReturnUrl: expected,
      sessionCookies: [{ name: 'synthetic', value: 'local-only' }], onReturn: async () => { captures++; } });
    assert.equal(outcome.completed, scenario === 'success');
    assert.equal(captures, scenario === 'success' ? 1 : 0);
    assert.equal(closed, 2);
    if (scenario === 'challenge' || scenario === 'cookies-fail') assert.deepEqual(mutations, []);
    if (scenario === 'challenge' || scenario === 'wrong-return') assert.equal(outcome.humanInteractionRequired, true);
    assert.ok(mutations.filter(value => value.includes('hosted-payment-submit-button')).length <= 1);
  });
}
