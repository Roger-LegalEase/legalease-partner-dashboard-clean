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

// --- the early recovery cannot swallow a real order --------------------------------
check(
  adapter.includes("function storedSessionNamesNothing(")
    && adapter.includes('error.providerFailure?.code === "resource_missing"'),
  "only resource_missing lets a stored session id be treated as absent"
);
const storedSessionPredicate = adapter.slice(
  adapter.indexOf("function storedSessionNamesNothing("),
  adapter.indexOf("async function providerCall")
);
check(
  storedSessionPredicate.includes("if (!(error instanceof ConsumerCheckoutTemporarilyUnavailableError)) return false;")
    && !/\breturn true\b/.test(storedSessionPredicate),
  "the stored-session predicate answers false for anything it did not classify, and never returns a bare true"
);
const earlyRecovery = adapter.slice(
  adapter.indexOf('if (item.checkoutSessionId?.startsWith("cs_"))'),
  adapter.indexOf("let verification;")
);
check(
  earlyRecovery.includes("storedSessionNamesNothing(error)") && earlyRecovery.includes("throw error;"),
  "an unreadable id that is not resource_missing still refuses, rather than minting a replacement"
);
check(
  earlyRecovery.includes("isStripeConfigurationError(error)"),
  "a missing Stripe configuration still falls through to the dry-run path it always did"
);

// --- the double-charge guard is untouched -------------------------------------------
check(
  adapter.indexOf('item.paymentStatus === "paid"') < adapter.indexOf('if (item.checkoutSessionId?.startsWith("cs_"))'),
  "the server-recorded already-paid guard still runs before any provider call"
);

console.log(`verify-consumer-checkout-refusals-are-classified passed: ${passed}/${passed}`);
