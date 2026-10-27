import {inspectOptionalCheckoutDialog} from './rcap-checkout-optional-dialog.mjs';
import {readCheckoutSubmitObstruction} from './rcap-checkout-submit-obstruction.mjs';
import{trialCheckoutSubmitActionability,prepareGuardedCheckoutSubmit,checkoutSubmitSelectors,readCheckoutSubmitGeometry,prepareCheckoutSubmitNormally}from'./rcap-checkout-submit-actionability.mjs';
import {safeCheckoutBrowserDiagnostic,checkoutNavigationClass} from './rcap-checkout-browser-diagnostic.mjs';
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

async function firstVisible(scope, selectors, timeout = FIELD_TIMEOUT, onSelected = () => {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const candidate = scope.locator(selector).first();
      if (await candidate.isVisible().catch(() => false)) { onSelected(selectors.indexOf(selector)); return candidate; }
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
      if(await control.evaluate(el=>el.matches('input[autocomplete="one-time-code"],input[name="one-time-code"],input[id*="one-time-code" i]'))){const error=Error('Provider verification requires human interaction');error.code='CHECKOUT_HUMAN_INTERACTION_REQUIRED';throw error;}
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

/** Only origin/path are evidence: queries, fragments and userinfo stay private. */
export function sanitizedCheckoutDestination(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin + url.pathname : '(non-HTTP destination)';
  } catch { return '(invalid destination)'; }
}

/** Establish protection continuity in the browser's own cookie jar, never in
 * global headers. Redirects are disabled: Playwright forwards per-request
 * headers across redirects, which could otherwise disclose the bypass secret.
 * A second, cookie-only request proves that the application is reachable. */
export async function bootstrapPreviewCheckoutReturn(context, expectedReturnUrl, previewProtectionBypassSecret) {
  try {
    const target = new URL(expectedReturnUrl);
    if (target.protocol !== 'https:' || target.username || target.password || target.port
      || !target.hostname.endsWith('.vercel.app')
      || target.searchParams.has('x-vercel-protection-bypass')
      || target.searchParams.has('x-vercel-set-bypass-cookie')
      || !previewProtectionBypassSecret?.trim()) throw new Error();
    const healthUrl = target.origin + '/api/health';
    const response = await context.request.get(healthUrl, {
      headers: { 'x-vercel-protection-bypass': previewProtectionBypassSecret,
        'x-vercel-set-bypass-cookie': 'true' },
      maxRedirects: 0, timeout: 30_000
    });
    try {
      if (response.url() !== healthUrl) throw new Error();
      if ([301, 302, 303, 307, 308].includes(response.status())) {
        // Vercel sets the cookie through a redirect. Never follow a supplied
        // destination: permit only a redirect back to this exact health URL.
        const location = response.headers().location;
        if (!location || new URL(location, healthUrl).href !== healthUrl) throw new Error();
      } else if (response.status() !== 200) throw new Error();
    } finally { await response.dispose(); }
    const cookies = await context.cookies(target.origin);
    const cookie = cookies.find(item => item.name === '_vercel_jwt'
      && item.domain.replace(/^\./, '') === target.hostname
      && item.path === '/' && item.secure === true);
    if (!cookie) throw new Error();
    const proof = await context.request.get(healthUrl, { maxRedirects: 0, timeout: 30_000 });
    try {
      if (proof.url() !== healthUrl || proof.status() !== 200) throw new Error();
      const body = await proof.json();
      if (body?.ok !== true || body?.checks?.db !== 'ok' || typeof body.timestamp !== 'string') throw new Error();
    } finally { await proof.dispose(); }
    return { origin: target.origin, pathname: '/api/health', cookieName: cookie.name, cookieDomain: cookie.domain };
  } catch {
    // Request errors can contain headers and Set-Cookie values. Never propagate
    // their message, cause, response body or cookie objects into evidence.
    const error = new Error('Preview protection bootstrap failed; stopped before opening Stripe.');
    error.code = 'CHECKOUT_PREVIEW_BOOTSTRAP_FAILED';
    throw error;
  }
}

/** Read only safe control metadata; unknown names and all values stay in the browser. */
export async function readCheckoutSubmitState(page, submit, pageTotalClassifiedFree) {
  const controls = [];
  let inspectionComplete = true;
  const submitDisabled = submit ? await submit.isDisabled().catch(() => { inspectionComplete = false; return null; })
    : (inspectionComplete = false, null);
  for (const scope of frameScopes(page)) {
    const fields = await scope.locator("input:not([type=hidden]), select").all()
      .catch(() => { inspectionComplete = false; return []; });
    for (const control of fields) {
      if (controls.length >= 60) { inspectionComplete = false; break; }
      const visible = await control.isVisible().catch(() => { inspectionComplete = false; return false; });
      if (!visible) continue;
      const state = await control.evaluate(el => {
        const knownNames = ['email','cardNumber','cardExpiry','cardCvc','cardCountry','cardPostalCode',
          'billingName','billingAddressLine1','billingAddressLine2','billingLocality','billingAdministrativeArea',
          'billingPostalCode','billingCountry','phoneNumber','name','country','addressLine1','addressLine2',
          'postalCode','city','state','termsOfServiceConsentCheckbox'];
        const knownAutocomplete = ['email','cc-name','cc-number','cc-exp','cc-csc','country','country-name',
          'street-address','address-line1','address-line2','address-level1','address-level2','postal-code','tel','name'];
        const rawName = el.getAttribute('name') ?? '';
        const autocomplete = el.getAttribute('autocomplete') ?? '';
        const known = knownNames.includes(rawName);
        const name = known ? rawName : knownAutocomplete.includes(autocomplete) ? autocomplete : 'unrecognized_control';
        const type = el.tagName.toLowerCase() === 'select' ? 'select'
          : ['checkbox','radio'].includes(el.type) ? el.type : 'input';
        const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
        const checked = ['checkbox','radio'].includes(type) ? el.checked === true : null;
        const otp=el.matches('input[autocomplete="one-time-code"],input[name="one-time-code"],input[id*="one-time-code" i]');
        const missing = otp?true:el.validity?.valueMissing === true || required && (checked === null ? !String(el.value ?? '').trim() : !checked);
        return { name, type, required, missing, invalid: el.validity?.valid === false || el.getAttribute('aria-invalid') === 'true',
          checked, unknownRequiredCheckbox: type === 'checkbox' && required && !known };
      }).catch(() => { inspectionComplete = false; return null; });
      if (state) controls.push(state);
    }
  }
  return { submitDisabled, controls, inspectionComplete, pageTotalClassifiedFree: typeof pageTotalClassifiedFree === "boolean" ? pageTotalClassifiedFree : null };
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
 * Returns browser-return evidence; the caller requires both that evidence and
 * authoritative Session settlement read back from Stripe.
 */
export async function completeHostedCheckout({
  checkoutUrl,
  expectedReturnUrl,
  previewProtectionBypassSecret,
  promotionCode = null,
  card = STRIPE_TEST_CARD,
  // Synthetic contact for this authorized fixture. A provider challenge stops
  // the run; changing the contact is not a challenge-recovery mechanism.
  email = "acceptance-consumer-a@rcap-acceptance.test",
  screenshotDir = null,
  executablePath = undefined,
  label = "checkout",
  // The participant's own session, so the page Stripe returns to is the page
  // the participant would actually see. Without it the return lands
  // anonymous, and an anonymous return screen is not evidence about what a
  // paying participant reads.
  sessionCookies = [],
  // Called once with the live page after Stripe hands the browser back, for
  // capturing the post-payment screens. It observes; it must not act.
  onReturn = null,
  beforeFinalPay,
  onSubmitCheckpoint = async () => {},
  submitActionabilityOnly = false,
  prepareSubmitActionability = false,
  submitObstructionOnly = false,
  providerExpectedAmountCents = null,
  beforeDialogInteraction = null,
  allowKnownLinkCloseExperiment = false,
  continueObservedLinkCard = false
}) {
  if(typeof continueObservedLinkCard!=='boolean'||continueObservedLinkCard&&(submitObstructionOnly||submitActionabilityOnly||!prepareSubmitActionability||typeof beforeDialogInteraction!=='function'))throw Error('Observed Link continuation requires guarded full checkout.');
  if(typeof allowKnownLinkCloseExperiment!=='boolean'||allowKnownLinkCloseExperiment&&!submitObstructionOnly)throw Error('Link Close experiment is NoPay only.');
  if(typeof submitObstructionOnly!=='boolean'||submitObstructionOnly&&submitActionabilityOnly||typeof prepareSubmitActionability!=='boolean'||typeof submitActionabilityOnly!=='boolean')throw new Error('Explicit actionability-only mode required.');
  if (!isExpectedCheckoutReturn(expectedReturnUrl, expectedReturnUrl)) {
    throw new Error('Exact HTTPS Checkout success URL is required before opening the provider page.');
  }
  const notes = [];
  const screenshots = [];
  const postReturnCaptureFailures = [];
  let promotion = null;
  let submitAttempted = false;
  let submitInspection = null;
  let submitControl = null;
  let optionalDialog = null;
  let optionalDialogInspected = false;
  let finalPayCheckStarted = false;
  let finalPayCheckPassed = false;
  let exactReturnObserved = false;
  let unexpectedDestination = null;
  let observingReturn = false;
  let failurePhase = 'browser_setup';
  const browser = await chromium.launch({ ...(executablePath ? {executablePath} : {}), args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const shoot = async (name) => {
    if (!screenshotDir) return;
    fs.mkdirSync(screenshotDir, { recursive: true });
    const file = path.join(screenshotDir, `${label}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    screenshots.push(file);
  };

  const readDiagnostic = async errorClass => {
    let navigation='unknown';try{navigation=checkoutNavigationClass(page.url(),isExpectedCheckoutReturn(page.url(),expectedReturnUrl));}catch{}
    return safeCheckoutBrowserDiagnostic({phase:failurePhase,errorClass,buttonGeometry:await readCheckoutSubmitGeometry(submitControl),navigation});
  };

  const manualCardVisible = async () => {
    for(const scope of frameScopes(page))for(const selector of ['input[name="cardNumber"]','input[autocomplete="cc-number"]'])if(await scope.locator(selector).isVisible())return true;
    return false;
  };
  const continueAfterObservedLinkClose = async () => {
    if(!continueObservedLinkCard)return;
    const current=await readCheckoutSubmitObstruction(page,null);
    if(current.status==='inspected'&&Object.values(current.signals).every(v=>v===false))return;
    if(optionalDialogInspected)throw Object.assign(Error('Repeated provider dialog; preserve existing session.'),{code:'CHECKOUT_HUMAN_INTERACTION_REQUIRED'});
    optionalDialogInspected=true;
    optionalDialog=await inspectOptionalCheckoutDialog({page,continueObservedLinkCard:true,checkpoint:onSubmitCheckpoint,beforeInteraction:()=>beforeDialogInteraction('before_link_dialog_close')});
    if(optionalDialog.actionBasis!=='observed_link_card_continuation'||!optionalDialog.dismissed||!optionalDialog.overlayGone||!await manualCardVisible())throw Object.assign(Error('Known Link card continuation not established; preserve existing session.'),{code:'CHECKOUT_HUMAN_INTERACTION_REQUIRED'});
    optionalDialog.cardFormVisible=true;
    await beforeDialogInteraction('after_link_dialog_close');
    await onSubmitCheckpoint({phase:'provider_checkout_observed_link_card_continuation',diagnosticOnly:true,trial:false,realSubmitAttempted:false,optionalDialog});
  };

  const inspectDialogAndTrial = async submit => {
    if(optionalDialogInspected)return {optionalDialog,actionabilityTrial:null};
    optionalDialogInspected=true;
    optionalDialog=await inspectOptionalCheckoutDialog({page,allowKnownLinkCloseExperiment,checkpoint:onSubmitCheckpoint,beforeInteraction:async()=>{if(typeof beforeDialogInteraction!=='function')throw Error('Fresh same-session state required');await beforeDialogInteraction();}});
    if(!optionalDialog.dismissed||!optionalDialog.overlayGone)return {optionalDialog,actionabilityTrial:null};
    if(optionalDialog.actionBasis==='known_link_close_experiment'){
      const cardVisible=await manualCardVisible();
      optionalDialog.cardFormVisible=cardVisible;
      if(!cardVisible)return {optionalDialog:{...optionalDialog,status:'hold',humanRequirement:'Manual card form not visible after Close; no trial.'},actionabilityTrial:null};
    }
    submit=null;for(const selector of checkoutSubmitSelectors){const candidate=page.locator(selector);const count=await candidate.count();if(count>1)return {optionalDialog:{...optionalDialog,status:'hold',humanRequirement:'Ambiguous Pay control; no trial.'},actionabilityTrial:null};if(count===1&&await candidate.isVisible()){submit=candidate;break;}}
    if(!submit)return {optionalDialog,actionabilityTrial:null};
    await prepareCheckoutSubmitNormally({page,submit});
    const obstruction=await readCheckoutSubmitObstruction(page,submit);
    if(obstruction.status!=='inspected'||Object.values(obstruction.signals).some(v=>v!==false)||!['self','child'].includes(obstruction.buttonGeometry?.centerHitRelation))return {optionalDialog:{...optionalDialog,overlayGone:false,status:'hold',humanRequirement:'Obstruction remains; no trial permitted.'},actionabilityTrial:null};
    await requireNoProviderChallenge(page);
    await beforeFinalPay(await readCheckoutSubmitState(page,submit,false));
    await onSubmitCheckpoint({phase:'provider_checkout_optional_dialog_dismissed',diagnosticOnly:true,trial:false,realSubmitAttempted:false,optionalDialog});
    const actionabilityTrial=await trialCheckoutSubmitActionability({submit,checkpoint:onSubmitCheckpoint});
    return {optionalDialog,actionabilityTrial};
  };

  const checkpointSubmit = async phase => {
    try { await onSubmitCheckpoint({ phase, submitAttempted }); }
    catch { const error = new Error('Checkout submission checkpoint failed.'); error.code = 'CHECKOUT_SUBMISSION_CHECKPOINT_FAILED'; throw error; }
  };

  // Observe committed main-frame navigation before submitting. DOM probes can
  // throw as Stripe navigates; their execution context is not return evidence.
  const observeReturn = (frame) => {
    if (!observingReturn || frame !== page.mainFrame() || exactReturnObserved || unexpectedDestination) return;
    const current = frame.url();
    if (isExpectedCheckoutReturn(current, expectedReturnUrl)) exactReturnObserved = true;
    else if (new URL(current).hostname !== 'checkout.stripe.com') unexpectedDestination = sanitizedCheckoutDestination(current);
  };
  const requireExpectedDestination = () => {
    if (!unexpectedDestination) return;
    const error = new Error('Unexpected Checkout destination');
    error.sanitizedDestination = unexpectedDestination;
    error.code = 'CHECKOUT_HUMAN_INTERACTION_REQUIRED';
    throw error;
  };
  const captureFailure = (stage) => {
    postReturnCaptureFailures.push(stage);
    notes.push(`post-return capture failed: ${stage}`);
  };
  const finishObservedReturn = async (diagnostic = null) => {
    notes.push(`returned to ${sanitizedCheckoutDestination(expectedReturnUrl)}`);
    try { await page.waitForLoadState('domcontentloaded', { timeout: FIELD_TIMEOUT }); }
    catch { captureFailure('dom_ready'); }
    if (onReturn) {
      try { await onReturn(page); }
      catch { captureFailure('onReturn'); }
    }
    try { await shoot('returned'); }
    catch { captureFailure('screenshot'); }
    return { completed: true, humanInteractionRequired: false, failureReason: "completed", submitAttempted, submitInspection, returnUrl: sanitizedCheckoutDestination(expectedReturnUrl), promotion,
      postReturnCaptureFailures, ...(diagnostic?{diagnostic}:{}), notes, screenshots };
  };

  try {
    if (sessionCookies.length > 0) await context.addCookies(sessionCookies);
    failurePhase = 'preview_bootstrap';
    const bootstrap = await bootstrapPreviewCheckoutReturn(context, expectedReturnUrl, previewProtectionBypassSecret);
    notes.push(`Preview protection ready: ${bootstrap.origin}${bootstrap.pathname}; cookie ${bootstrap.cookieName} domain ${bootstrap.cookieDomain}`);
    failurePhase = 'checkout_open';
    await page.goto(checkoutUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);
    await shoot("opened");
    failurePhase = 'checkout_fill';
    await continueAfterObservedLinkClose();
    await requireNoProviderChallenge(page);

    if (promotionCode) {
      promotion = await applyPromotionCode(page, promotionCode, notes);
      await shoot("promotion-applied");
      if (!promotion.entered || !promotion.accepted) {
        notes.push('Promotion was not accepted; stopped before submitting Checkout. Review this Session before another attempt.');
        return { completed: false, humanInteractionRequired: true, failureReason: "promotion_rejected", submitAttempted, promotion, notes, screenshots };
      }
    }

    // What Stripe is asking for now decides the rest. A zero total shows an
    // order-confirmation button and no card fields at all.
    if(submitObstructionOnly&&!Number.isSafeInteger(providerExpectedAmountCents))throw Error('Provider amount required for NoPay inspection');
    const amountText = submitObstructionOnly?'':await page.locator("body").innerText().catch(() => "");
    const looksFree = submitObstructionOnly?providerExpectedAmountCents===0:/\$0\.00/.test(amountText);
    notes.push(`page total reads as ${looksFree ? "zero, so Stripe is collecting no payment details" : "an amount due"}${promotionCode ? " after the promotion code was applied" : ""}`);

    // Stripe Checkout collects an email on most configurations and will not
    // submit without one. Filled for a zero-total order too, where the page
    // still asks for it even though no card is needed.
    await fillAcrossFrames(page, [
      'input[name="email"]', 'input[type="email"]', 'input[autocomplete="email"]'
    ], email, "email", notes);
    await continueAfterObservedLinkClose();
    await requireNoProviderChallenge(page);

    if (!looksFree) {
      if (!card) {
        notes.push("an amount is due but no card was supplied");
        await shoot("amount-due-without-card");
        return { completed: false, humanInteractionRequired: false, failureReason: "card_not_supplied", submitAttempted, promotion, notes, screenshots };
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
      submitInspection = await readCheckoutSubmitState(page,
        page.locator('button[data-testid="hosted-payment-submit-button"], button[type="submit"]').first(), looksFree);
      return { completed: false, humanInteractionRequired: true, failureReason: "required_fields_missing", submitAttempted, submitInspection, promotion, notes, screenshots };
    }
    await requireNoProviderChallenge(page);
    await shoot("form-complete");

    let selectedSubmitIndex = null;
    const submit = await firstVisible(page, checkoutSubmitSelectors, 15_000,
      index => { selectedSubmitIndex = index; });
    if (!submit) {
      notes.push("no submit control found on the Checkout page");
      await shoot("no-submit");
      submitInspection = await readCheckoutSubmitState(page, null, looksFree);
      return { completed: false, humanInteractionRequired: false, failureReason: "submit_control_missing", submitAttempted, submitInspection, promotion, notes, screenshots };
    }
    submitControl = submit;
    const submitDisabled = await submit.isDisabled().catch(() => false);
    notes.push(`submit control ${submitDisabled ? "is disabled" : "is enabled"}`);
    observingReturn = true;
    page.on('framenavigated', observeReturn);
    if (typeof beforeFinalPay !== 'function') throw new Error('Actual final payment window check required.');
    if(submitObstructionOnly){
      failurePhase='submit_obstruction_inspection';
      submitInspection=await readCheckoutSubmitState(page,submit,looksFree);
      await beforeFinalPay(submitInspection);
      const before=await readCheckoutSubmitObstruction(page,submit);
      await onSubmitCheckpoint({phase:'provider_checkout_submit_obstruction_before_prepare',diagnosticOnly:true,trial:false,realSubmitAttempted:false,submitObstruction:before});
      const {billingBlurred}=await prepareCheckoutSubmitNormally({page,submit});
      const after=await readCheckoutSubmitObstruction(page,submit);
      await onSubmitCheckpoint({phase:'provider_checkout_submit_obstruction_after_prepare',diagnosticOnly:true,trial:false,realSubmitAttempted:false,submitObstruction:after});
      const interaction=await inspectDialogAndTrial(submit);
      return{completed:false,humanInteractionRequired:!(interaction.optionalDialog?.dismissed&&interaction.optionalDialog?.overlayGone),failureReason:'diagnostic_stop_before_pay',submitAttempted:false,submitInspection,submitObstruction:{before,after,billingBlurred},...interaction,notes,screenshots};
    }
    const authorizeFinalPay = async () => {
      await requireNoProviderChallenge(page);
      if(continueObservedLinkCard){const current=await readCheckoutSubmitObstruction(page,submit);if(current.status!=='inspected'||Object.values(current.signals).some(v=>v!==false)||!['self','child'].includes(current.buttonGeometry?.centerHitRelation)||!await manualCardVisible())throw Error('Card continuation changed before final Pay guard.');}
      finalPayCheckStarted = true;
      submitInspection = await readCheckoutSubmitState(page, submit, looksFree);
      failurePhase = 'before_final_pay';
      await beforeFinalPay(submitInspection);
      finalPayCheckPassed = true;
    };
    if (prepareSubmitActionability && !submitActionabilityOnly) {
      failurePhase = 'submit_click';
      const preparation = await prepareGuardedCheckoutSubmit({page, submit,
        selectedIndex:selectedSubmitIndex, checkpoint:async value=>{
          if(continueObservedLinkCard&&value.phase==='provider_checkout_submit_actionability_before_trial'){const current=await readCheckoutSubmitObstruction(page,submit);if(current.status!=='inspected'||Object.values(current.signals).some(v=>v!==false)||!['self','child'].includes(current.buttonGeometry?.centerHitRelation)||!await manualCardVisible())throw Error('Card continuation obstructed before trial.');}
          await onSubmitCheckpoint(value);
        },
        authorize:authorizeFinalPay});
      if (preparation.status !== 'passed') return {completed:false,
        humanInteractionRequired:false,failureReason:'submit_actionability_failed',
        submitAttempted:false,submitInspection,diagnostic:await readDiagnostic(preparation.trial?.diagnostic?.errorClass??'None'),notes,screenshots};
    } else {
      await authorizeFinalPay();
      if(submitActionabilityOnly){
        const actionabilityTrial=await trialCheckoutSubmitActionability({submit,checkpoint:onSubmitCheckpoint});
        return{completed:false,humanInteractionRequired:false,failureReason:'diagnostic_stop_before_pay',submitAttempted:false,submitInspection,actionabilityTrial,notes,screenshots};
      }
    }
    failurePhase = 'before_submit_checkpoint';
    await checkpointSubmit("provider_checkout_submit_before_forward");
    submitAttempted = true;
    failurePhase = 'submit_click';
    try { await submit.click({ timeout: FIELD_TIMEOUT }); }
    finally {
      const interruptedPhase = failurePhase;
      failurePhase = 'after_submit_checkpoint';
      await checkpointSubmit("provider_checkout_submit_after_attempt");
      failurePhase = interruptedPhase;
    }

    // Only the application's exact success return counts. A challenge redirect,
    // cancellation, or unrelated page is not a completed browser journey.
    failurePhase = 'return_observation';
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      failurePhase = 'return_observation';
      observeReturn(page.mainFrame());
      requireExpectedDestination();
      if (exactReturnObserved) return await finishObservedReturn();
      failurePhase = 'return_wait';
      await page.waitForTimeout(1500);
      failurePhase = 'return_observation';
      observeReturn(page.mainFrame());
      requireExpectedDestination();
      if (exactReturnObserved) return await finishObservedReturn();
      failurePhase = 'return_challenge_probe';
      await requireNoProviderChallenge(page);
    }
    failurePhase = 'return_diagnostics';
    submitInspection = await readCheckoutSubmitState(page, submit, looksFree);
    notes.push('Provider return not observed; reconcile the existing Session before any retry.');
    await shoot("stuck");
    // A commit can arrive while timeout diagnostics are being collected.
    observeReturn(page.mainFrame());
    requireExpectedDestination();
    if (exactReturnObserved) return await finishObservedReturn();

    return { completed: false, humanInteractionRequired: false, failureReason: "return_not_observed", diagnostic:await readDiagnostic('None'), submitAttempted, submitInspection, returnUrl: sanitizedCheckoutDestination(page.url()), promotion, notes, screenshots };
  } catch (error) {
    if(submitObstructionOnly&&error?.code==='CHECKOUT_HUMAN_INTERACTION_REQUIRED'&&!error?.sanitizedDestination){
      const after=await readCheckoutSubmitObstruction(page,submitControl);
      await onSubmitCheckpoint({phase:'provider_checkout_submit_obstruction_challenge',diagnosticOnly:true,trial:false,realSubmitAttempted:false,submitObstruction:after});
      const interaction=await inspectDialogAndTrial(submitControl);
      return{completed:false,humanInteractionRequired:!(interaction.optionalDialog?.dismissed&&interaction.optionalDialog?.overlayGone),failureReason:interaction.actionabilityTrial?'diagnostic_stop_before_pay':'provider_challenge',submitAttempted:false,submitInspection,submitObstruction:{before:null,after,billingBlurred:false},...interaction,notes,screenshots};
    }
    const diagnostic = await readDiagnostic(error?.name);
    // Re-read after an interrupted DOM operation. Only navigation-specific
    // errors may await a commit; an unrelated error before return still fails.
    if (observingReturn && error?.code !== 'CHECKOUT_HUMAN_INTERACTION_REQUIRED' && error?.code !== 'CHECKOUT_SUBMISSION_CHECKPOINT_FAILED') {
      observeReturn(page.mainFrame());
      if (!exactReturnObserved && !unexpectedDestination
        && /execution context was destroyed|frame was detached|navigation interrupted/i.test(String(error?.message))) {
        await page.waitForURL(url => isExpectedCheckoutReturn(url.href, expectedReturnUrl),
          { waitUntil: 'commit', timeout: FIELD_TIMEOUT }).catch(() => {});
        observeReturn(page.mainFrame());
      }
      if (exactReturnObserved && !unexpectedDestination) {
        captureFailure('interrupted_browser_operation');
        return await finishObservedReturn(diagnostic);
      }
    }
    if (unexpectedDestination) {
      error = { code: 'CHECKOUT_HUMAN_INTERACTION_REQUIRED', sanitizedDestination: unexpectedDestination };
    }
    const message = error?.code === 'CHECKOUT_PREVIEW_BOOTSTRAP_FAILED'
      ? 'Preview protection bootstrap failed; stopped before opening Stripe.'
      : error?.sanitizedDestination
        ? `Unexpected Checkout destination: ${error.sanitizedDestination}; human review of the existing Session is required.`
        : error?.code === 'CHECKOUT_HUMAN_INTERACTION_REQUIRED'
          ? 'Provider verification requires human interaction; retain this Checkout Session.'
          : 'Checkout browser operation failed; review the existing Session before retrying.';
    notes.push(`browser error: ${message}`);
    if (error?.code === 'CHECKOUT_HUMAN_INTERACTION_REQUIRED' && !error?.sanitizedDestination) await shoot("error").catch(() => {});
    const failureReason = error?.code === 'CHECKOUT_DIAGNOSTIC_STOP' ? 'diagnostic_stop_before_pay'
      : error?.code === 'CHECKOUT_PREVIEW_BOOTSTRAP_FAILED' ? 'preview_bootstrap_failed'
      : error?.sanitizedDestination ? 'unexpected_destination'
        : error?.code === 'CHECKOUT_HUMAN_INTERACTION_REQUIRED' ? 'provider_challenge'
          : error?.code === 'CHECKOUT_SUBMISSION_CHECKPOINT_FAILED' ? 'submission_checkpoint_failed'
            : finalPayCheckStarted && !finalPayCheckPassed ? 'final_payment_window_check_failed' : 'browser_operation_failed';
    return { completed: false, humanInteractionRequired: error?.code === 'CHECKOUT_HUMAN_INTERACTION_REQUIRED', failureReason, diagnostic, submitAttempted, submitInspection, notes, screenshots };
  } finally {
    if (observingReturn) page.off('framenavigated', observeReturn);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
