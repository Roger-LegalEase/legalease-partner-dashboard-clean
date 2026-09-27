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

export function expectedCheckoutTotal({ promotionCode, value = '' }) {
  const supplied = String(value).trim();
  if (!supplied && !promotionCode) return 5000;
  if (!/^(0|[1-9][0-9]{0,3})$/.test(supplied)) {
    throw new Error('Discounted Checkout requires an explicit expected_total_cents (0–4999).');
  }
  const amount = Number(supplied);
  if (promotionCode ? amount >= 5000 : amount !== 5000) {
    throw new Error('Ordinary Checkout expects 5000 cents; a promotion expects 0–4999 cents.');
  }
  return amount;
}

export function checkoutAmountMatches(session, expectedTotalCents) {
  return session.amount_subtotal === 5000 && session.amount_total === expectedTotalCents
    && session.currency === 'usd';
}

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
export async function applyPromotionCode(page, code, notes) {
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
  const complaint = page.locator('text=/invalid|expired|cannot be applied|not valid/i').first();
  const rejected = await complaint.isVisible().catch(() => false);
  // A rejection that only says "rejected" makes the next attempt a guess.
  // Stripe's own sentence distinguishes a code that does not exist from one
  // that is spent, expired, or restricted to other line items, so it is
  // carried back verbatim. The caller redacts the code before anything is
  // logged or persisted.
  const reason = rejected
    ? (await complaint.innerText().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 200)
    : "";
  notes.push(`promotion code ${code}: ${rejected ? `rejected by Stripe — ${reason}` : "accepted by the page"}`);
  return { entered: true, accepted: !rejected, reason };
}

/** Known synthetic billing values; unknown required controls need review. */
function valueForField({ name, autocomplete, placeholder, type }) {
  const hay = `${name} ${autocomplete} ${placeholder}`.toLowerCase();
  if (/email/.test(hay) || type === "email") return "acceptance-consumer-a@rcap-acceptance.test";
  if (/postal|zip/.test(hay)) return STRIPE_TEST_CARD.postal;
  if (/address.*2|line2/.test(hay)) return "";
  if (/address|line1|street/.test(hay)) return "1 Acceptance Street";
  if (/city|locality/.test(hay)) return "Jackson";
  if (/state|province|region/.test(hay)) return "MS";
  if (/phone|tel/.test(hay) || type === "tel") return "6015550142";
  if (/name/.test(hay)) return "Acceptance Test Participant";
  return null;
}

/**
 * Fills every visible, empty, required field Stripe still wants, and returns
 * the ones it could not. Which fields exist depends on the account's Checkout
 * configuration, so they are read off the page instead of hard-coded — three
 * unnamed "Required" markers is what made run 35161962654 unactionable.
 */
export async function fillRemainingRequired(page, notes) {
  await requireNoProviderChallenge(page);
  const unfilled = [];
  for (const scope of frameScopes(page)) {
    const controls = await scope.locator("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select")
      .all().catch(() => []);
    for (const control of controls) {
      if (!(await control.isVisible().catch(() => false))) continue;
      if (await control.isDisabled().catch(() => false)) continue;
      const current = await control.inputValue().catch(() => "x");
      if (current && current.trim()) continue;

      const describe = await control.evaluate((el) => ({
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute("name") ?? "",
        autocomplete: el.getAttribute("autocomplete") ?? "",
        placeholder: el.getAttribute("placeholder") ?? "",
        type: el.getAttribute("type") ?? "",
        required: el.hasAttribute("required") || el.getAttribute("aria-required") === "true"
      })).catch(() => null);
      if (!describe) continue;
      if (!describe.required) continue;
      const label = describe.name || describe.autocomplete || describe.placeholder || describe.tag;

      try {
        if (describe.tag === "select") {
          // Only the known country control has an authorized fixture answer.
          if (!/country/i.test(`${describe.name} ${describe.autocomplete}`)) {
            unfilled.push(label);
            continue;
          }
          const options = await control.locator("option").allTextContents();
          const us = options.findIndex((text) => /united states/i.test(text));
          if (us < 0) { unfilled.push(label); continue; }
          await control.selectOption({ index: us });
          notes.push(`${label}: selected United States`);
        } else {
          const value = valueForField(describe);
          if (value === null) { unfilled.push(label); continue; }
          if (!value) continue;
          await control.fill(value);
          notes.push(`${label}: filled`);
        }
      } catch {
        unfilled.push(label);
      }
    }
  }
  return unfilled;
}

/**
 * Provider verification belongs to the human operator. Observe across frames,
 * stop without answering, and let the caller retain the existing Session.
 */
export async function requireNoProviderChallenge(page) {
  for (const scope of frameScopes(page)) {
    for (const selector of [
      'input[autocomplete="one-time-code"]',
      'input[name="one-time-code"]',
      'input[id*="one-time-code" i]',
      'iframe[title*="challenge" i]',
      'iframe[title*="captcha" i]',
      '[role="dialog"]:has-text("Verify your identity")'
    ]) {
      if (await scope.locator(selector).first().isVisible()) {
        const error = new Error('Provider verification requires human interaction; retain this Checkout Session and inspect its state before any further write.');
        error.code = 'CHECKOUT_HUMAN_INTERACTION_REQUIRED';
        throw error;
      }
    }
  }
}

export function isExpectedCheckoutReturn(actual, expected) {
  try {
    const url = new URL(actual);
    const target = new URL(expected);
    return target.protocol === 'https:' && url.origin === target.origin
      && url.pathname === target.pathname
      && [...target.searchParams].every(([key, value]) => url.searchParams.get(key) === value);
  } catch { return false; }
}

/**
 * Drives one Checkout Session to completion.
 *
 * Whether a card is needed is decided by the page after any promotion code has
 * been applied, not by the caller: Stripe collects no payment details when
 * nothing is due, and a code that waives the whole price is only discoverable
 * once Stripe has applied it. A card is always supplied and simply goes unused
 * when Stripe stops asking for one.
 *
 * Returns what happened; the caller decides the verdict by reading the Session
 * back from Stripe, never from this page.
 */
export async function completeHostedCheckout({
  checkoutUrl,
  expectedReturnUrl,
  promotionCode = null,
  card = STRIPE_TEST_CARD,
  // Synthetic contact for this authorized fixture. A provider challenge stops
  // the run; changing the contact is not a challenge-recovery mechanism.
  email = "acceptance-consumer-a@rcap-acceptance.test",
  screenshotDir = null,
  label = "checkout",
  // The participant's own session, so the page Stripe returns to is the page
  // the participant would actually see. Without it the return lands
  // anonymous, and an anonymous return screen is not evidence about what a
  // paying participant reads.
  sessionCookies = [],
  // Called once with the live page after Stripe hands the browser back, for
  // capturing the post-payment screens. It observes; it must not act.
  onReturn = null
}) {
  if (!isExpectedCheckoutReturn(expectedReturnUrl, expectedReturnUrl)) {
    throw new Error('Exact HTTPS Checkout success URL is required before opening the provider page.');
  }
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
    if (sessionCookies.length > 0) await context.addCookies(sessionCookies);
    await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);
    await shoot("opened");
    await requireNoProviderChallenge(page);

    let promotion = null;
    if (promotionCode) {
      promotion = await applyPromotionCode(page, promotionCode, notes);
      await shoot("promotion-applied");
      if (!promotion.entered || !promotion.accepted) {
        notes.push('Promotion was not accepted; stopped before submitting Checkout. Review this Session before another attempt.');
        return { completed: false, humanInteractionRequired: true, promotion, notes, screenshots };
      }
    }

    // What Stripe is asking for now decides the rest. A zero total shows an
    // order-confirmation button and no card fields at all.
    const amountText = await page.locator("body").innerText().catch(() => "");
    const looksFree = /\$0\.00/.test(amountText);
    notes.push(`page total reads as ${looksFree ? "zero, so Stripe is collecting no payment details" : "an amount due"}${promotionCode ? " after the promotion code was applied" : ""}`);

    // Stripe Checkout collects an email on most configurations and will not
    // submit without one. Filled for a zero-total order too, where the page
    // still asks for it even though no card is needed.
    await fillAcrossFrames(page, [
      'input[name="email"]', 'input[type="email"]', 'input[autocomplete="email"]'
    ], email, "email", notes);
    await requireNoProviderChallenge(page);

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
      await shoot("card-entered");
    }

    // Whatever else this account's Checkout asks for. Which fields are required
    // is a Stripe dashboard setting — cardholder name, country, a full billing
    // address — so they are discovered from the page rather than guessed one
    // per run. Anything left empty is named in the notes, which is what turns a
    // silent "Required" into something actionable.
    const remaining = await fillRemainingRequired(page, notes);
    if (remaining.length) {
      notes.push(`required fields need operator review: ${remaining.join(", ")}`);
      await shoot("required-fields-unfilled");
      return { completed: false, humanInteractionRequired: true, promotion, notes, screenshots };
    }
    await requireNoProviderChallenge(page);
    await shoot("form-complete");

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
    const submitDisabled = await submit.isDisabled().catch(() => false);
    notes.push(`submit control ${submitDisabled ? "is disabled" : "is enabled"}`);
    await submit.click({ timeout: FIELD_TIMEOUT }).catch((error) => {
      notes.push(`submit click failed: ${String(error?.message ?? error).slice(0, 120)}`);
    });

    // Only the application's exact success return counts. A challenge redirect,
    // cancellation, or unrelated page is not a completed browser journey.
    let leftStripe = false;
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(1500);
      const current = page.url();
      if (isExpectedCheckoutReturn(current, expectedReturnUrl)) { leftStripe = true; break; }
      if (new URL(current).hostname !== 'checkout.stripe.com') {
        const error = new Error('Unexpected Checkout destination; human review of the existing Session is required.');
        error.code = 'CHECKOUT_HUMAN_INTERACTION_REQUIRED';
        throw error;
      }
      await requireNoProviderChallenge(page);
    }
    if (leftStripe) {
      notes.push(`returned to ${new URL(page.url()).host}`);
      if (onReturn) {
        try {
          await onReturn(page);
        } catch (error) {
          notes.push(`post-payment capture failed: ${String(error?.message ?? error).slice(0, 200)}`);
        }
      }
    } else {
      // Say what the page is complaining about. "Still on Stripe's page" on its
      // own sent this harness round another cycle guessing at the cause; the
      // page states it — a required field, a declined card, an extra step.
      const complaints = await page.locator(
        '[role="alert"], .Error, [class*="error" i], [data-testid*="error" i], p:has-text("required")'
      ).allInnerTexts().catch(() => []);
      const visible = complaints.map((text) => text.trim()).filter(Boolean).slice(0, 6);
      // "Required" three times says nothing about which fields. Name the empty
      // ones so the next attempt is informed rather than another guess.
      const stillEmpty = [];
      for (const scope of frameScopes(page)) {
        const controls = await scope.locator("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select").all().catch(() => []);
        for (const control of controls) {
          if (!(await control.isVisible().catch(() => false))) continue;
          const value = await control.inputValue().catch(() => "x");
          if (value && value.trim()) continue;
          const label = await control.evaluate((el) =>
            el.getAttribute("name") || el.getAttribute("autocomplete") || el.getAttribute("placeholder") || el.getAttribute("aria-label") || el.tagName.toLowerCase()
          ).catch(() => "(unnamed)");
          stillEmpty.push(label);
        }
      }
      notes.push(
        `still on Stripe's page after 90s; page says: ${visible.length ? visible.join(" | ") : "(no error text found)"}; `
        + `still empty: ${stillEmpty.length ? stillEmpty.join(", ") : "(nothing)"}`
      );
    }
    await shoot(leftStripe ? "returned" : "stuck");

    return { completed: leftStripe, returnUrl: page.url(), promotion, notes, screenshots };
  } catch (error) {
    notes.push(`browser error: ${String(error?.message ?? error).slice(0, 300)}`);
    await shoot("error");
    return { completed: false, humanInteractionRequired: error?.code === 'CHECKOUT_HUMAN_INTERACTION_REQUIRED', notes, screenshots };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
