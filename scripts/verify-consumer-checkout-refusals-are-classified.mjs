#!/usr/bin/env node
// Every refusal on the consumer checkout path must be classified.
//
// The defect this exists to stop: POST /api/expungement-ai/checkout answered
// HTTP 500 with an EMPTY BODY on a verified matter. The cause was a provider
// call outside the route's classified region whose catch rethrew anything that
// was not a Stripe *configuration* error, so a Stripe API refusal escaped
// unmapped. From the outside that is indistinguishable from the button doing
// nothing, and it carries no name an operator can act on.
//
// It was invisible in acceptance because acceptance journeys are always fresh:
// the block only runs for an item that already carries a `cs_` Checkout
// Session id, which only a resumed order has.
//
// These are source-contract checks, not behaviour tests. They pin the shape
// that made the defect impossible to reach, so restoring the old shape fails
// here rather than in production on a participant's order.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.env.RCAP_CHECKOUT_VERIFY_ROOT ?? process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const ADAPTER = "src/lib/expungement-ai/payment-adapter.ts";
const ROUTE = "src/app/api/expungement-ai/checkout/route.ts";

const adapter = read(ADAPTER);
const route = read(ROUTE);

let passed = 0;
const check = (condition, label) => {
  assert.ok(condition, `FAILED: ${label}`);
  console.log(`ok   ${label}`);
  passed += 1;
};

// --- the route always answers ---------------------------------------------------
check(
  !/\n\s*throw error;\s*\n\s*\}\s*\n\}/.test(route),
  "the checkout route never rethrows: every path out of its catch is a response"
);
check(
  route.includes('resultCode: "checkout_failed"') && route.includes("failureClass:"),
  "an unclassified failure still answers with a sentence and the error's class"
);
check(
  route.includes('resultCode: "checkout_provider_unavailable"') && route.includes("providerFailure: error.providerFailure"),
  "a classified provider refusal answers with the provider's own classification"
);
check(
  /failureClass: error instanceof Error \? error\.name : typeof error/.test(route),
  "the class is the constructor name only -- never the message, parameters or stack"
);

// --- the classification carries no free text -------------------------------------
const failureType = adapter.slice(
  adapter.indexOf("export type ConsumerCheckoutProviderFailure"),
  adapter.indexOf("function providerFailureOf")
);
check(failureType.length > 0, "the provider failure has a declared shape");
check(
  !/\bmessage\b/.test(failureType) && !/\bstack\b/.test(failureType) && !/\braw\b/.test(failureType),
  "the provider failure carries no message, stack or raw payload"
);
check(
  ["phase", "type", "code", "param", "statusCode"].every((field) => failureType.includes(`${field}:`)),
  "the provider failure names the step, the type, the code, the param and the status"
);

// --- every provider call on this path is classified -------------------------------
// The creation function plus the helpers it calls while a Session is being
// minted, and nothing after them. The status reader further down answers a
// different route with its own contract and is not this path.
const creationStart = adapter.indexOf("export async function createConsumerPacketCheckout");
const creationEnd = adapter.indexOf("export async function getConsumerCheckoutStatus") >= 0
  ? adapter.indexOf("export async function getConsumerCheckoutStatus")
  : adapter.length;
const creation = adapter.slice(creationStart, creationEnd);
check(creation.length > 0, "the checkout creation path is locatable");

// Every Stripe Checkout call in the creation path goes through providerCall.
const bareCalls = [...creation.matchAll(/(?<!\(\)\s=>\s)\bstripe\s*\.\s*checkout\s*\.\s*sessions\s*\.\s*(retrieve|create|expire)\b/g)];
const wrappedCalls = [...creation.matchAll(/providerCall\(\s*"([a-z_]+)"/g)].map((match) => match[1]);
check(
  bareCalls.length === 0,
  `no Checkout Session call is made outside providerCall (found ${bareCalls.length})`
);
check(
  wrappedCalls.length >= 4,
  `every Checkout Session call names its step (${wrappedCalls.length} found: ${wrappedCalls.join(", ")})`
);
check(
  wrappedCalls.includes("recover_completed_session"),
  "the early completed-session recovery -- the call that escaped -- is classified"
);

// --- the provider failure names the request ---------------------------------------
check(
  failureType.includes("requestId:") && adapter.includes('typeof candidate.requestId === "string" ? candidate.requestId : null'),
  "the provider failure carries the provider's request identifier, so the refusal can be tied to its log entry"
);

// --- the early recovery cannot swallow a real order --------------------------------
const storedSessionPredicate = adapter.slice(
  adapter.indexOf("function storedSessionIsAbsentFromTheVerifiedAccount("),
  adapter.indexOf("/**\n * The Stripe account this deployment is expected to sell through.")
);
check(storedSessionPredicate.length > 0, "the stored-session predicate is locatable");
check(
  storedSessionPredicate.includes('error.providerFailure?.code === "resource_missing"'),
  "only resource_missing can ever let a stored session id be treated as absent"
);
check(
  storedSessionPredicate.includes("if (!identity) return false;")
    && storedSessionPredicate.includes("identity.accountId !== expectedStripeAccountId()")
    && storedSessionPredicate.includes("identity.livemode !== (resolveDeploymentEnvironment() === \"production\")"),
  "absence is only concluded against a POSITIVELY VERIFIED account and mode -- a failed lookup alone is never enough"
);
check(
  storedSessionPredicate.includes("if (!(error instanceof ConsumerCheckoutTemporarilyUnavailableError)) return false;")
    && !/\breturn true\b/.test(storedSessionPredicate),
  "the stored-session predicate answers false for anything it did not classify, and never returns a bare true"
);
check(
  adapter.includes("async function stripeAccountIdentity(")
    && /catch \{[\s\S]{0,200}?return null;/.test(
      adapter.slice(adapter.indexOf("async function stripeAccountIdentity("), adapter.indexOf("function storedSessionIsAbsentFromTheVerifiedAccount("))
    ),
  "an identity that cannot be read is null, so an unanswerable question never reads as an answer"
);
check(
  adapter.includes("const PRODUCTION_STRIPE_ACCOUNT_ID = \"acct_1L62OmDLtltioGNK\";")
    && adapter.includes("function expectedStripeAccountId()"),
  "the expected merchant account is pinned rather than inferred from whichever key is loaded"
);
const earlyRecovery = adapter.slice(
  adapter.indexOf('if (item.checkoutSessionId?.startsWith("cs_"))'),
  adapter.indexOf("let verification;")
);
check(
  earlyRecovery.includes("storedSessionIsAbsentFromTheVerifiedAccount(error, await stripeAccountIdentity(stripe))")
    && earlyRecovery.includes("throw error;"),
  "an unreadable id that is not verified-absent still refuses, rather than minting a replacement"
);
check(
  earlyRecovery.includes("isStripeConfigurationError(error)"),
  "a missing Stripe configuration still falls through to the dry-run path it always did"
);

// --- a recovery that continues is still preserved -------------------------------------
check(
  adapter.includes("let storedSessionRecovery: ConsumerCheckoutProviderFailure | null = null;")
    && adapter.includes("storedSessionRecovery = error instanceof ConsumerCheckoutTemporarilyUnavailableError"),
  "continuing past an unresolvable stored session records the provider's classification instead of discarding it"
);
check(
  (adapter.match(/\n\s+storedSessionRecovery\n\s+\};/g) ?? []).length >= 2,
  "every successful checkout result carries the recovery record, so a continue is observable from the outside"
);
check(
  route.includes("storedSessionRecovery: checkout.storedSessionRecovery ?? null"),
  "the route returns the recovery record on SUCCESS, not only on failure"
);

// --- a replacement is a compare-and-swap, never a blind overwrite ----------------------
const MIGRATION = "supabase/migrations/20260917200000_consumer_checkout_session_replacement.sql";
const replacementSql = read(MIGRATION);
check(
  replacementSql.includes("create or replace function public.replace_consumer_checkout_session("),
  "the replacement writer exists as its own function"
);
check(
  replacementSql.includes("v_item.checkout_session_id is distinct from p_expected_checkout_session_id")
    && replacementSql.includes("and i.checkout_session_id = p_expected_checkout_session_id"),
  "the swap compares the stored id against the expected OLD id, and the UPDATE re-compares it"
);
check(
  replacementSql.includes("if v_item.payment_status = 'paid'")
    && replacementSql.includes("and i.payment_status <> 'paid'"),
  "a paid order is never re-bound to a different Session"
);
check(
  replacementSql.includes("p_expected_checkout_session_id = p_checkout_session_id")
    && replacementSql.includes("checkout_replacement_invalid"),
  "a replacement naming no predecessor, or itself, is refused rather than treated as an initial binding"
);
check(
  replacementSql.includes("v_hash is distinct from p_expected_verification_hash")
    && replacementSql.includes("public.expungement_packet_product_id()")
    && replacementSql.includes("public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id)")
    && replacementSql.includes("i.checkout_session_id = p_checkout_session_id and i.id <> p_briefcase_item_id"),
  "the replacement re-checks verification, product, matter, person and that NEW is unbound elsewhere"
);
check(
  replacementSql.includes("for update")
    && replacementSql.includes("revoke all on function public.replace_consumer_checkout_session")
    && replacementSql.includes("grant execute on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) to service_role"),
  "the swap runs under a row lock and is executable only by the service role"
);
check(
  !replacementSql.includes("create or replace function public.bind_consumer_checkout_verification"),
  "the initial-binding RPC is not redefined or weakened by this migration"
);
check(
  adapter.includes("if (replacedCheckoutSessionId) {")
    && adapter.includes("expectedCheckoutSessionId: replacedCheckoutSessionId")
    && /} else {\n\s+const bindingResult = await persistCheckoutBinding\(binding, session\.id, "stripe"\);/.test(adapter),
  "the compare-and-swap writer is used ONLY for a replacement; an initial binding still uses the initial writer"
);
check(
  adapter.includes('replacement.outcome === "conflicted"')
    && adapter.includes('expireUnboundSession(stripe as Stripe, "expire_lost_replacement_session"')
    && adapter.includes('providerCall("retrieve_winning_session"'),
  "losing the race expires the Session this request created and reconciles the winner instead of overwriting it"
);
// --- the loser never destroys the winner -------------------------------------------
// Creation is idempotent, so two concurrent requests deriving the same key are
// handed the SAME Session id. The one that loses the swap is told the winning
// id -- which is the id it is itself holding. Expiring it would destroy the
// order the winner just recorded and leave the matter storing a dead Session.
{
  const conflictBlock = adapter.slice(
    adapter.indexOf('if (replacement.outcome === "conflicted") {'),
    adapter.indexOf('if (replacement.outcome !== "replaced") {')
  );
  check(conflictBlock.length > 0, "the replacement-conflict branch is locatable");
  check(
    conflictBlock.indexOf("replacement.winningCheckoutSessionId")
      < conflictBlock.indexOf("expireUnboundSession("),
    "the winner is read BEFORE anything is expired"
  );
  check(
    conflictBlock.includes("const thisRequestLostADifferentSession = winner !== session.id;")
      && /const cleanupFailure = thisRequestLostADifferentSession && session\.status === "open"/.test(conflictBlock),
    "the losing Session is expired only when it is genuinely a different Session from the winner"
  );
  check(
    (conflictBlock.match(/expireUnboundSession\(/g) ?? []).length === 1
      && !/sessions\.expire\(/.test(conflictBlock),
    "the conflict branch has exactly one expiry, and it is the guarded one"
  );
}

// --- a cleanup failure never becomes the reported cause -----------------------------
// The live $0 order refused with a Stripe fault named at the
// `expire_unbound_new_session` phase. That call is the tidy-up that runs AFTER a
// binding refuses; the binding refusal was the cause, and it never reached the
// response. The expiry now returns its classification instead of throwing it.
const cleanupHelper = adapter.slice(
  adapter.indexOf("async function expireUnboundSession("),
  adapter.indexOf("export type StripeAccountIdentity")
);
check(cleanupHelper.length > 0, "the unbound-session cleanup is a single named helper");
check(
  /catch \(error\) \{[\s\S]*?return (error\.providerFailure|providerFailureOf)/.test(cleanupHelper)
    && !/\bthrow\b/.test(cleanupHelper),
  "the cleanup expiry returns its provider classification and never throws it, so it cannot replace the primary failure"
);
check(
  adapter.includes("export type ConsumerCheckoutBindingFailure")
    && adapter.includes('operation: "initial_bind" | "replacement"')
    && adapter.includes('outcome: "refused" | "unavailable" | "conflicted"'),
  "a binding refusal has a declared shape naming which writer refused and how"
);
check(
  adapter.includes("readonly bindingFailure: ConsumerCheckoutBindingFailure | null;")
    && adapter.includes("readonly cleanupFailure: ConsumerCheckoutProviderFailure | null;"),
  "the refusal error carries the primary binding failure and the secondary cleanup failure separately"
);
check(
  route.includes("bindingFailure: error.bindingFailure") && route.includes("cleanupFailure: error.cleanupFailure"),
  "the route reports both, so a masked cause can never again look like a provider fault"
);
// The reason token is a bounded vocabulary, so a Postgres or PostgREST message
// -- which is where SQL fragments and free text would come from -- can never
// travel outward on it.
check(
  adapter.includes("const CONSUMER_CHECKOUT_BINDING_REASONS: ReadonlySet<string> = new Set([")
    && /function bindingFailureReason\(reason: string \| undefined, fallback: string\): string \{\n\s*return reason && CONSUMER_CHECKOUT_BINDING_REASONS\.has\(reason\) \? reason : fallback;/.test(adapter),
  "a binding reason is reported only from a fixed vocabulary, never passed through from the database"
);
check(
  !/reason: (replacement|bindingResult|dryRunBinding)\.reason\b/.test(adapter),
  "no raw writer reason reaches the response without passing through that vocabulary"
);

// --- an idempotent create is never trusted about the present ------------------------
// Stripe replays the response body stored at the key's FIRST use, so a create
// that answers `open` may describe a Session that has since expired. Binding it
// hands the participant a dead Checkout page.
check(
  adapter.includes('providerCall("retrieve_created_session"')
    && /let session = await providerCall\("retrieve_created_session"/.test(adapter),
  "the created Session's status is read back from the provider, not taken from the create response"
);
check(
  adapter.includes('providerCall("create_successor_session"')
    && adapter.includes("`${createKey}:successor:${session.id}`")
    && adapter.includes('providerCall("retrieve_successor_session"'),
  "an expired idempotent replay earns exactly one successor, keyed deterministically off the expired Session's own id, and that successor is freshly read too"
);
{
  const creationBody = adapter.slice(creationStart, creationEnd);
  const successorBlock = creationBody.slice(
    creationBody.indexOf('providerCall("retrieve_created_session"'),
    creationBody.indexOf('if (session.status !== "open" || !session.url) {')
  );
  check(
    successorBlock.length > 0
      && (creationBody.match(/create_successor_session/g) ?? []).length === 1
      && !/while \(|for \(|\.retry|Math\.random/.test(successorBlock),
    "there is one bounded successor attempt: no loop, no retry counter and no random key"
  );
}

// --- the double-charge guard is untouched -------------------------------------------
check(
  adapter.indexOf('item.paymentStatus === "paid"') < adapter.indexOf('if (item.checkoutSessionId?.startsWith("cs_"))'),
  "the server-recorded already-paid guard still runs before any provider call"
);

console.log(`verify-consumer-checkout-refusals-are-classified passed: ${passed}/${passed}`);
