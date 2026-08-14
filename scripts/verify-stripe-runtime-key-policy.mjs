import { register } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Blocking proof for the Stripe key policy and the runtime classification it
// depends on.
//
// The defect this exists to prevent: `isProductionRuntime()` was
// `VERCEL_ENV === "production" || NODE_ENV === "production"`, and on Vercel
// EVERY optimized Next.js build sets NODE_ENV=production — Preview included. So
// a Preview deployment was classified production, the sandbox key was refused
// with "must not use a test key in production", and the participant saw a
// generic 503. The hosted acceptance environment could not transact at all.
//
// The rule is now three-way rather than two-way, and the symmetric half matters
// more than the half that was broken: a LIVE key must never be reachable from a
// non-production deployment. An acceptance environment that could charge a real
// card is a worse failure than one that cannot charge at all.

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getStripeServerClient, isStripeConfigurationError, isProductionRuntime } =
  await import("../src/lib/stripe/server.ts");
const { resolveDeploymentEnvironment, serverRuntimeEnvironmentContract } =
  await import("../src/lib/server-runtime-environment.ts");

const CLASSIFIER_VARS = ["VERCEL_TARGET_ENV", "VERCEL_ENV", "NODE_ENV"];
const TEST_KEY = "sk_test_verifier_placeholder_value";
const LIVE_KEY = "sk_live_verifier_placeholder_value";

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`  FAIL ${name} — ${error.message}`);
  }
}

/** Every classifier variable is replaced wholesale, so no ambient value leaks in. */
function withEnv(env, fn) {
  const saved = new Map();
  for (const name of [...CLASSIFIER_VARS, "STRIPE_SECRET_KEY"]) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }
  try {
    for (const [name, value] of Object.entries(env)) {
      if (value !== undefined) process.env[name] = value;
    }
    return fn();
  } finally {
    for (const [name, value] of saved.entries()) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

/** Returns null on success, or the sanitized error message on refusal. */
function attempt(env) {
  return withEnv(env, () => {
    try {
      getStripeServerClient();
      return null;
    } catch (error) {
      assert.ok(isStripeConfigurationError(error), `expected a StripeConfigurationError, got ${error?.name}`);
      return String(error.message);
    }
  });
}

// --- 1-5. The environment/key matrix -----------------------------------------

check("Vercel Preview plus a test key succeeds", () => {
  assert.equal(attempt({ VERCEL_ENV: "preview", NODE_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY }), null);
});

check("Vercel Preview plus a LIVE key fails", () => {
  const message = attempt({ VERCEL_ENV: "preview", NODE_ENV: "production", STRIPE_SECRET_KEY: LIVE_KEY });
  assert.ok(message, "a live key must never be usable from a Preview deployment");
  assert.match(message, /must not use a live key outside production/);
});

check("Vercel Production plus a live key succeeds", () => {
  assert.equal(attempt({ VERCEL_ENV: "production", NODE_ENV: "production", STRIPE_SECRET_KEY: LIVE_KEY }), null);
});

check("Vercel Production plus a test key fails", () => {
  const message = attempt({ VERCEL_ENV: "production", NODE_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY });
  assert.ok(message);
  assert.match(message, /must not use a test key in production/);
});

check("Vercel Development plus a test key succeeds", () => {
  assert.equal(attempt({ VERCEL_ENV: "development", NODE_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY }), null);
});

// --- 6. Contradiction fails closed, and is NOT resolved by precedence --------

check("contradictory VERCEL_TARGET_ENV and VERCEL_ENV fail closed", () => {
  for (const pair of [
    { VERCEL_TARGET_ENV: "production", VERCEL_ENV: "preview" },
    { VERCEL_TARGET_ENV: "preview", VERCEL_ENV: "production" }
  ]) {
    // Neither key form may rescue a runtime that cannot be identified.
    for (const key of [TEST_KEY, LIVE_KEY]) {
      const message = attempt({ ...pair, NODE_ENV: "production", STRIPE_SECRET_KEY: key });
      assert.ok(message, `contradiction ${JSON.stringify(pair)} must refuse`);
      assert.match(message, /could not be identified/);
    }
    assert.equal(withEnv({ ...pair }, () => resolveDeploymentEnvironment()), "unknown");
  }
  assert.equal(serverRuntimeEnvironmentContract.contradictionResolvedByPrecedence, false);
});

// --- 7-8. The non-Vercel fallback -------------------------------------------

check("no Vercel values with NODE_ENV=production requires a live key", () => {
  assert.equal(attempt({ NODE_ENV: "production", STRIPE_SECRET_KEY: LIVE_KEY }), null);
  const message = attempt({ NODE_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY });
  assert.ok(message);
  assert.match(message, /must not use a test key in production/);
});

check("no Vercel values with NODE_ENV=test permits only a test key", () => {
  assert.equal(attempt({ NODE_ENV: "test", STRIPE_SECRET_KEY: TEST_KEY }), null);
  const message = attempt({ NODE_ENV: "test", STRIPE_SECRET_KEY: LIVE_KEY });
  assert.ok(message, "a live key must never be reachable from a test runtime");
  assert.match(message, /must not use a live key outside production/);
});

// --- 9-11. Everything unidentifiable fails closed ----------------------------

check("missing every classification fails closed", () => {
  const message = attempt({ STRIPE_SECRET_KEY: TEST_KEY });
  assert.ok(message);
  assert.match(message, /could not be identified/);
  assert.equal(withEnv({}, () => resolveDeploymentEnvironment()), "unknown");
});

check("wrongly-cased values fail closed", () => {
  for (const value of ["Production", "PREVIEW", "Development"]) {
    const message = attempt({ VERCEL_ENV: value, NODE_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY });
    assert.ok(message, `${value} must not be accepted`);
    assert.match(message, /could not be identified/);
  }
});

check("unsupported and blank-after-trim values fail closed", () => {
  for (const value of ["staging", "prod", "custom-env", "   ", ""]) {
    const message = attempt({ VERCEL_ENV: value, STRIPE_SECRET_KEY: TEST_KEY });
    assert.ok(message, `${JSON.stringify(value)} must not be accepted`);
    assert.match(message, /could not be identified/);
  }
});

// --- 12. Nothing a browser controls participates ------------------------------

check("browser-controlled input cannot change the classification", () => {
  const forged = {
    VERCEL_ENV: "preview",
    NODE_ENV: "production",
    STRIPE_SECRET_KEY: TEST_KEY,
    // Names a request could plausibly try to influence. None is read.
    NEXT_PUBLIC_VERCEL_ENV: "production",
    NEXT_PUBLIC_ENV: "production",
    "x-vercel-env": "production"
  };
  assert.equal(attempt(forged), null, "a NEXT_PUBLIC_ or header-shaped value must not flip the classification");
  assert.equal(serverRuntimeEnvironmentContract.browserSuppliedEnvironmentAccepted, false);

  // The classifier's own source must never READ a browser-exposed name, so this
  // cannot regress later by someone adding a "convenient" fallback.
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/server-runtime-environment.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/NEXT_PUBLIC_/.test(code), "the classifier must never read a browser-exposed variable");
});

// --- 13. No key value is ever disclosed --------------------------------------

check("no key value is printed or included in any refusal", () => {
  const secrets = [TEST_KEY, LIVE_KEY];
  const messages = [
    attempt({ VERCEL_ENV: "production", STRIPE_SECRET_KEY: TEST_KEY }),
    attempt({ VERCEL_ENV: "preview", STRIPE_SECRET_KEY: LIVE_KEY }),
    attempt({ STRIPE_SECRET_KEY: TEST_KEY }),
    attempt({ VERCEL_ENV: "Production", STRIPE_SECRET_KEY: LIVE_KEY })
  ].filter(Boolean);
  assert.ok(messages.length === 4, "all four of these must refuse");
  for (const message of messages) {
    for (const secret of secrets) {
      assert.ok(!message.includes(secret), "a refusal must never quote the key");
    }
    // Not even a fragment beyond the prefix that identifies the mode.
    assert.ok(!/_verifier_placeholder/.test(message), "a refusal must never quote any part of the key body");
  }
});

// --- the production-runtime helper still fails closed ------------------------

check("isProductionRuntime treats an unidentified runtime as production", () => {
  assert.equal(withEnv({ VERCEL_ENV: "production" }, () => isProductionRuntime()), true);
  assert.equal(withEnv({ VERCEL_ENV: "preview" }, () => isProductionRuntime()), false);
  assert.equal(withEnv({ VERCEL_TARGET_ENV: "production", VERCEL_ENV: "preview" }, () => isProductionRuntime()), true);
  assert.equal(withEnv({}, () => isProductionRuntime()), true);
  // The regression itself: a Preview deployment must no longer read as production.
  assert.equal(withEnv({ VERCEL_ENV: "preview", NODE_ENV: "production" }, () => isProductionRuntime()), false);
});

console.log("");
if (failures.length > 0) {
  console.error(`Stripe runtime key policy: ${failures.length} failing case(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Stripe runtime key policy: ${passed}/${passed} cases green.`);
