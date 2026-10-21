#!/usr/bin/env node
// Behavioural truth table for the stored-session absence decision.
//
// The end-to-end acceptance journey exercises the paths a real order takes. It
// cannot reach the refusal branches, because they need a provider identity that
// is wrong or unreadable, and an acceptance deployment has neither on purpose.
// So those branches are exercised here, against the real compiled predicate
// rather than a description of it.
//
// The rule under test: a stored Checkout Session id may be treated as absent —
// and the order allowed to mint a replacement — ONLY when the provider said
// `resource_missing` AND the account and mode that answered were positively
// identified as the ones this deployment sells through. Every other
// combination must refuse, because a lookup that failed is not evidence that
// the earlier order does not exist.

import assert from "node:assert/strict";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

// `server-only` throws by design outside a server component graph. The module
// under test is server code; this stands in for the marker so it can be loaded.
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, next) {
      if (specifier === "server-only") {
        return { url: "data:text/javascript,export default {};", shortCircuit: true };
      }
      return next(specifier, context);
    }
  `)}`,
  import.meta.url
);

const PRODUCTION_ACCOUNT = "acct_1L62OmDLtltioGNK";
const OTHER_ACCOUNT = "acct_0000000000000000";

// Loaded after the loaders are registered, and after the environment is set,
// because the module reads deployment identity at call time.
process.env.VERCEL_ENV = "production";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_live_placeholder_not_used_by_this_test";
delete process.env.STRIPE_ACCOUNT_ID;

const adapterUrl = pathToFileURL(path.resolve("src/lib/expungement-ai/payment-adapter.ts")).href;
const { storedSessionIsAbsentFromTheVerifiedAccount, ConsumerCheckoutTemporarilyUnavailableError } =
  await import(adapterUrl);

const refusal = (code, phase = "recover_completed_session") =>
  new ConsumerCheckoutTemporarilyUnavailableError({
    phase,
    type: "invalid_request_error",
    code,
    param: null,
    statusCode: 404,
    requestId: "req_test_placeholder"
  });

const verified = { accountId: PRODUCTION_ACCOUNT, livemode: true };

let passed = 0;
const check = (condition, label) => {
  assert.ok(condition, `FAILED: ${label}`);
  console.log(`ok   ${label}`);
  passed += 1;
};

// --- the one case that may continue ------------------------------------------------
check(
  storedSessionIsAbsentFromTheVerifiedAccount(refusal("resource_missing"), verified) === true,
  "resource_missing against the verified account and mode is absence, and the order may continue"
);

// --- a failed lookup alone is never permission --------------------------------------
check(
  storedSessionIsAbsentFromTheVerifiedAccount(refusal("resource_missing"), null) === false,
  "resource_missing with NO verified identity refuses: the lookup failed, which is not the same as the order not existing"
);
check(
  storedSessionIsAbsentFromTheVerifiedAccount(
    refusal("resource_missing"),
    { accountId: OTHER_ACCOUNT, livemode: true }
  ) === false,
  "resource_missing against a DIFFERENT account refuses: the earlier order may be in the account we are no longer asking"
);
check(
  storedSessionIsAbsentFromTheVerifiedAccount(
    refusal("resource_missing"),
    { accountId: PRODUCTION_ACCOUNT, livemode: false }
  ) === false,
  "resource_missing against the right account in the WRONG mode refuses: test and live are separate object spaces"
);

// --- every other lookup error stays a safe refusal ------------------------------------
for (const code of ["rate_limit", "api_key_expired", "account_invalid", "parameter_unknown", "processing_error"]) {
  check(
    storedSessionIsAbsentFromTheVerifiedAccount(refusal(code), verified) === false,
    `a ${code} lookup failure refuses rather than discarding the stored session`
  );
}
check(
  storedSessionIsAbsentFromTheVerifiedAccount(refusal(null), verified) === false,
  "a refusal carrying no code refuses"
);
check(
  storedSessionIsAbsentFromTheVerifiedAccount(new Error("some unrelated failure"), verified) === false,
  "an error this module never classified refuses"
);
check(
  storedSessionIsAbsentFromTheVerifiedAccount(null, verified) === false,
  "a null error refuses"
);

// --- the expectation itself must be configured ----------------------------------------
{
  process.env.VERCEL_ENV = "preview";
  check(
    storedSessionIsAbsentFromTheVerifiedAccount(refusal("resource_missing"), verified) === false,
    "with no expected account configured for this environment, nothing can be verified and the refusal stands"
  );
  process.env.STRIPE_ACCOUNT_ID = PRODUCTION_ACCOUNT;
  check(
    storedSessionIsAbsentFromTheVerifiedAccount(refusal("resource_missing"), verified) === false,
    "a configured expectation still refuses when the mode does not match the environment"
  );
  process.env.STRIPE_ACCOUNT_ID = OTHER_ACCOUNT;
  check(
    storedSessionIsAbsentFromTheVerifiedAccount(
      refusal("resource_missing"),
      { accountId: OTHER_ACCOUNT, livemode: false }
    ) === true,
    "a deployment that configures its own account and matches mode can conclude absence"
  );
  delete process.env.STRIPE_ACCOUNT_ID;
  process.env.VERCEL_ENV = "production";
}

console.log(`test-consumer-checkout-stored-session passed: ${passed}/${passed}`);
