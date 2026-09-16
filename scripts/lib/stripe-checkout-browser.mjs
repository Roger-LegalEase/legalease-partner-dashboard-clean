// Complete a Stripe Checkout Session the way a customer does: in a browser, on
// Stripe's own hosted page.
//
// Why this exists rather than an event marked "paid".
//
// The acceptance harness used to take the real Session and override
// payment_status before signing the completion event. That worked only while
// the server trusted the event body. It no longer does: it reconciles the order
// against Stripe and requires a PaymentIntent whenever an amount was due. Stripe
// does not create a PaymentIntent until a customer actually submits payment, so
// an overridden session has none and the payment writer refuses it —
// "evidence_rejected (a payment intent is required when an amount was due)".
//
// That refusal is correct, so the simulation is what has to change. Driving the
// hosted page produces a genuine PaymentIntent, a genuine payment_status, and a
// genuine promotion-code redemption, which is also the only way a discount is
// actually exercised rather than asserted.
//
// Nothing here is a real charge: Stripe test cards in a sandbox account move no
// money. A zero-total order needs no card at all — Stripe collects no payment
// details when a promotion code brings the total to zero, which is exactly the
// no_payment_required path the application has to handle.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

/** Stripe's documented always-succeeds test card. Sandbox only. */
export const STRIPE_TEST_CARD = Object.freeze({
  number: "4242424242424242",
  expiry: "12/34",
  cvc: "123",
  postal: "42424"
});

const FIELD_TIMEOUT = 20_000;

async function firstVisible(scope, selectors, timeout = FIELD_TIMEOUT) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const candidate = scope.locator(selector).first();
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    await scope.waitForTimeout?.(250).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

/**
 * Stripe renders the card fields either inline on the page or inside iframes,
 * and which one depends on the account's Checkout version. Both are searched
 * rather than assuming, because a missing field has to be reported as such and
 * not as a payment that silently did not happen.
 */
function frameScopes(page) {
  return [page, ...page.frames().filter((frame) => frame !== page.mainFrame())];
}

async function fillAcrossFrames(page, selectors, value, label, notes) {
  for (const scope of frameScopes(page)) {
    const field = await firstVisible(scope, selectors, 4000);
    if (!field) continue;
    await field.click({ timeout: FIELD_TIMEOUT }).catch(() => {});
    await field.fill(value, { timeout: FIELD_TIMEOUT });
    notes.push(`${label}: filled`);
    return true;
  }
  notes.push(`${label}: no field found`);
  return false;
}

/**
 * Applies a promotion code through Stripe's own "Add promotion code" control,
 * so the discount is one Stripe decided to honour. A code Stripe rejects leaves
 * the total unchanged and is reported, which is what the invalid and expired
 * cases need to observe.
 */
async function applyPromotionCode(page, code, notes) {
  const opener = await firstVisible(page, [
    'button:has-text("Add promotion code")',
    'button:has-text("Add promo code")',
    '[data-testid="promotion-code-entry-button"]'
  ], 10_000);
  if (opener) await opener.click().catch(() => {});

  const input = await firstVisible(page, [
    'input[placeholder*="promotion" i]',
    'input[placeholder*="promo" i]',
    'input[name="promotionCode"]',
    '[data-testid="promotion-code-input"]'
  ], 10_000);
  if (!input) {
    notes.push("promotion code: no entry field appeared");
    return { entered: false, accepted: false };
  }
  await input.fill(code, { timeout: FIELD_TIMEOUT });

  const apply = await firstVisible(page, [
    'button:has-text("Apply")',
    '[data-testid="promotion-code-apply-button"]'
  ], 10_000);
  if (apply) await apply.click().catch(() => {});
  await page.waitForTimeout(2500);

  // Stripe shows the code as a line when it took, and an inline error when it
  // did not. Neither is trusted as the verdict — the caller re-reads the
  // Session from Stripe — but it is recorded so a rejection is legible here.
  const rejected = await page.locator('text=/invalid|expired|cannot be applied|not valid/i').first()
    .isVisible().catch(() => false);
  notes.push(`promotion code ${code}: ${rejected ? "rejected by Stripe" : "accepted by the page"}`);
  return { entered: true, accepted: !rejected };
}

/**
 * Drives one Checkout Session to completion.
 *
 * `card` is omitted for a zero-total order: Stripe collects no payment details
 * when nothing is due, and asking for a card field that is not there would fail
 * a case that is actually correct.
 *
 * Returns what happened; the caller decides the verdict by reading the Session
 * back from Stripe, never from this page.
 */
export async function completeHostedCheckout({
  checkoutUrl,
  promotionCode = null,
  card = STRIPE_TEST_CARD,
  expectNoPayment = false,
  screenshotDir = null,
  label = "checkout"
}) {
  const notes = [];
  const screenshots = [];
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const shoot = async (name) => {
    if (!screenshotDir) return;
    fs.mkdirSync(screenshotDir, { recursive: true });
    const file = path.join(screenshotDir, `${label}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    screenshots.push(file);
  };

  try {
    await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);
    await shoot("opened");

    let promotion = null;
    if (promotionCode) {
      promotion = await applyPromotionCode(page, promotionCode, notes);
      await shoot("promotion-applied");
    }

    // What Stripe is asking for now decides the rest. A zero total shows an
    // order-confirmation button and no card fields at all.
    const amountText = await page.locator("body").innerText().catch(() => "");
    const looksFree = expectNoPayment || /\$0\.00/.test(amountText);
    notes.push(`page total reads as ${looksFree ? "zero" : "an amount due"}`);

    if (!looksFree) {
      if (!card) {
        notes.push("an amount is due but no card was supplied");
        await shoot("amount-due-without-card");
        return { completed: false, promotion, notes, screenshots };
      }
      await fillAcrossFrames(page, [
        'input[name="cardNumber"]', 'input[placeholder*="card number" i]', 'input[autocomplete="cc-number"]'
      ], card.number, "card number", notes);
      await fillAcrossFrames(page, [
        'input[name="cardExpiry"]', 'input[placeholder*="MM" i]', 'input[autocomplete="cc-exp"]'
      ], card.expiry, "card expiry", notes);
      await fillAcrossFrames(page, [
        'input[name="cardCvc"]', 'input[placeholder*="CVC" i]', 'input[autocomplete="cc-csc"]'
      ], card.cvc, "card cvc", notes);
      // Optional: Stripe asks for a postal code only for some accounts.
      await fillAcrossFrames(page, [
        'input[name="billingPostalCode"]', 'input[autocomplete="postal-code"]'
      ], card.postal, "postal code", notes);
      const name = await firstVisible(page, ['input[name="billingName"]', 'input[autocomplete="cc-name"]'], 3000);
      if (name) await name.fill("Acceptance Test Participant").catch(() => {});
      await shoot("card-entered");
    }

    const submit = await firstVisible(page, [
      'button[data-testid="hosted-payment-submit-button"]',
      'button:has-text("Pay")',
      'button:has-text("Complete order")',
      'button:has-text("Place order")',
      'button[type="submit"]'
    ], 15_000);
    if (!submit) {
      notes.push("no submit control found on the Checkout page");
      await shoot("no-submit");
      return { completed: false, promotion, notes, screenshots };
    }
    await submit.click({ timeout: FIELD_TIMEOUT }).catch(() => {});

    // Stripe leaves its own domain when the order completes. Waiting on the URL
    // rather than a success banner keeps this from passing on a page that
    // merely stopped showing an error.
    let leftStripe = false;
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(1500);
      const current = page.url();
      if (!/checkout\.stripe\.com/.test(current)) { leftStripe = true; break; }
    }
    notes.push(leftStripe ? `returned to ${new URL(page.url()).host}` : "still on Stripe's page after 90s");
    await shoot(leftStripe ? "returned" : "stuck");

    return { completed: leftStripe, returnUrl: page.url(), promotion, notes, screenshots };
  } catch (error) {
    notes.push(`browser error: ${String(error?.message ?? error).slice(0, 300)}`);
    await shoot("error");
    return { completed: false, notes, screenshots };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
