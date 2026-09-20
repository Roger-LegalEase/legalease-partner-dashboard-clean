#!/usr/bin/env node
await import("./verify-rcap-il-delivery-binding.mjs");
// The delivery control's environment classifier, proven by behaviour.
//
// This exists because the previous classifier was wrong in a way that no
// catalog assertion could catch. It keyed on NODE_ENV, which Next.js compiles
// to a literal at build time, so every production BUILD — Vercel Preview
// included — reported itself as a production RUNTIME and refused the scoped
// staging state unconditionally. The control's own stated purpose, letting
// staging exercise the path with a named test user while production stays dark,
// was unreachable on any real hosted environment.
//
// So these cases do not check that a check exists. Each one sets the process
// variables a real deployment would carry, calls the real exported function,
// and asserts the verdict — including which identity is admitted and which is
// refused, since "refuses everyone" and "refuses the right people" look
// identical from a coverage report.
//
// Every case is blocking. There is no skip path.

import assert from "node:assert/strict";
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const {
  resolveConsumerDeliveryAccess,
  resolveConsumerDeliveryRouteState,
  resolveDeploymentEnvironment,
  consumerDeliveryControlContract
} = await import("@/lib/rcap/render/consumer-delivery-control");
const { resolvePacketRoute } = await import("@/lib/rcap/documents/packet-route-resolver");
const { resolveSavePaymentAllowed } = await import("@/lib/expungement-ai/save-result-policy");
const { allTerminalTreatments, allCompleteGuidanceTracks } = await import("@/lib/rcap/documents/guidance-packet-registry");

// Real registered tracks rather than invented ids, so this cannot pass by
// asking about routes the runtime has never heard of. A handful of each kind is
// enough — the exhaustive sweep is the terminalization verifier's job.
const NON_SELLABLE_TRACK_SAMPLE = [
  ...allTerminalTreatments().slice(0, 6).map((treatment) => treatment.trackId),
  ...allCompleteGuidanceTracks().slice(0, 4).map((track) => track.trackId)
].filter(Boolean);
assert.ok(NON_SELLABLE_TRACK_SAMPLE.length >= 6, "the non-sellable sample must come from real registered tracks");

const TEST_IDENTITY = "acceptance-identity-9f3b2c";
const OUTSIDER_IDENTITY = "outsider-1d8e4a";

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name} — ${error.message}`);
  }
}

/**
 * Runs `fn` with exactly the given delivery/environment variables set and every
 * other one of them removed, then restores the process environment. Removing
 * rather than overwriting matters: a leaked VERCEL_ENV from the runner would
 * otherwise decide a case that is supposed to be testing its absence.
 */
const MANAGED = [
  "RCAP_CONSUMER_DELIVERY_ROUTE_STATE",
  "RCAP_CONSUMER_DELIVERY_STAGING_SCOPE",
  "VERCEL_TARGET_ENV",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_TARGET_ENV",
  "NEXT_PUBLIC_RCAP_CONSUMER_DELIVERY_ROUTE_STATE",
  "NODE_ENV"
];
function withEnv(vars, fn) {
  const saved = Object.fromEntries(MANAGED.map((key) => [key, process.env[key]]));
  for (const key of MANAGED) delete process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const key of MANAGED) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const scoped = (extra) => ({
  RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped",
  RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: `${TEST_IDENTITY},acceptance-identity-2`,
  ...extra
});
const access = (subjectId) => resolveConsumerDeliveryAccess({ subjectId });

// --- 1. Preview admits exactly its named identity ---------------------------
check("preview plus the correct test identity is admitted", () => {
  withEnv(scoped({ VERCEL_ENV: "preview" }), () => {
    const result = access(TEST_IDENTITY);
    assert.equal(result.environment, "preview");
    assert.equal(result.allowed, true, `expected admission, got: ${result.reason}`);
  });
  // VERCEL_TARGET_ENV is the preferred source and must work on its own.
  withEnv(scoped({ VERCEL_TARGET_ENV: "preview" }), () => {
    assert.equal(access(TEST_IDENTITY).allowed, true);
  });
  // Both present and agreeing is the ordinary Vercel Preview shape.
  withEnv(scoped({ VERCEL_TARGET_ENV: "preview", VERCEL_ENV: "preview" }), () => {
    assert.equal(access(TEST_IDENTITY).allowed, true);
  });
});

check("preview plus an outsider is denied", () => {
  withEnv(scoped({ VERCEL_ENV: "preview" }), () => {
    const outsider = access(OUTSIDER_IDENTITY);
    assert.equal(outsider.allowed, false);
    assert.match(outsider.reason, /outside the configured staging test scope/);
    // Anonymous is refused on the same terms as a named outsider.
    assert.equal(access(null).allowed, false);
  });
});

// --- 2. Production admits nobody, including the test identity ---------------
check("production plus the test identity is denied", () => {
  for (const vars of [
    { VERCEL_ENV: "production" },
    { VERCEL_TARGET_ENV: "production" },
    { VERCEL_TARGET_ENV: "production", VERCEL_ENV: "production" }
  ]) {
    withEnv(scoped(vars), () => {
      const result = access(TEST_IDENTITY);
      assert.equal(result.environment, "production");
      assert.equal(result.allowed, false, "the named test identity must not enter production");
      assert.match(result.reason, /production runtime/);
    });
  }
});

check("production plus an outsider is denied", () => {
  withEnv(scoped({ VERCEL_ENV: "production" }), () => {
    assert.equal(access(OUTSIDER_IDENTITY).allowed, false);
    assert.equal(access(null).allowed, false);
  });
});

// --- 3. Unidentifiable environments fail closed -----------------------------
check("missing environment is denied", () => {
  // Nothing declared and a production build: the pre-Vercel classification
  // still holds, so a locally-built production server is refused.
  withEnv(scoped({ NODE_ENV: "production" }), () => {
    const result = access(TEST_IDENTITY);
    assert.equal(result.environment, "production");
    assert.equal(result.allowed, false);
  });
  // An empty string is not a declaration.
  withEnv(scoped({ VERCEL_ENV: "", NODE_ENV: "production" }), () => {
    assert.equal(access(TEST_IDENTITY).allowed, false);
  });
});

check("malformed environment is denied", () => {
  const malformed = [
    "prod",                 // near-miss for production
    "Preview ",             // trailing space survives an untrimmed read
    "staging",              // a Vercel custom environment name: unsupported here
    "production;preview",
    "true",
    "1"
  ];
  for (const value of malformed) {
    withEnv(scoped({ VERCEL_ENV: value }), () => {
      const result = access(TEST_IDENTITY);
      assert.equal(result.environment, "unknown", `"${value}" must not classify`);
      assert.equal(result.allowed, false, `"${value}" must not admit anyone`);
    });
  }
  // Contradictory sources are refused rather than resolved by preference.
  withEnv(scoped({ VERCEL_TARGET_ENV: "preview", VERCEL_ENV: "production" }), () => {
    const result = access(TEST_IDENTITY);
    assert.equal(result.environment, "unknown");
    assert.equal(result.allowed, false, "a contradiction must never resolve in favour of preview");
  });
  withEnv(scoped({ VERCEL_TARGET_ENV: "production", VERCEL_ENV: "preview" }), () => {
    assert.equal(access(TEST_IDENTITY).allowed, false);
  });
});

// --- 4. Nothing the browser controls can change the classification ----------
check("browser-controlled input cannot change the classification", () => {
  // A NEXT_PUBLIC_ variable is the only kind a browser bundle can carry, and
  // setting every plausible one must not move a production verdict.
  withEnv(scoped({
    VERCEL_ENV: "production",
    NEXT_PUBLIC_VERCEL_ENV: "preview",
    NEXT_PUBLIC_VERCEL_TARGET_ENV: "preview",
    NEXT_PUBLIC_RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "live"
  }), () => {
    const result = access(TEST_IDENTITY);
    assert.equal(result.environment, "production");
    assert.equal(result.allowed, false);
  });
  // And they cannot manufacture a classification out of nothing either.
  withEnv({
    ...scoped({}),
    NODE_ENV: "production",
    NEXT_PUBLIC_VERCEL_ENV: "preview"
  }, () => {
    assert.equal(resolveDeploymentEnvironment(), "production");
  });

  // The source itself must never READ a NEXT_PUBLIC_ name, so this cannot
  // regress by someone adding a "convenient" fallback later. Comments may
  // mention the prefix — the assertion is about reads, not about prose.
  const source = fs.readFileSync(path.join(rootDir, "src/lib/rcap/render/consumer-delivery-control.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(
    !/NEXT_PUBLIC_/.test(code),
    "the delivery control must never read a browser-exposed variable"
  );
  assert.equal(consumerDeliveryControlContract.browserSuppliedEnvironmentAccepted, false);
  assert.equal(consumerDeliveryControlContract.unidentifiedEnvironmentFailsClosed, true);
  assert.deepEqual(
    [...consumerDeliveryControlContract.environmentClassifierEnvVars],
    ["VERCEL_TARGET_ENV", "VERCEL_ENV"],
    "the classifier must be the Vercel deployment environment, not NODE_ENV"
  );
});

// --- 5. The flag itself still defaults disabled ------------------------------
check("the feature flag still defaults disabled", () => {
  withEnv({ VERCEL_ENV: "preview" }, () => {
    assert.equal(resolveConsumerDeliveryRouteState(), "disabled");
    const result = access(TEST_IDENTITY);
    assert.equal(result.state, "disabled");
    assert.equal(result.allowed, false, "an unset flag must not open the route on Preview");
  });
  for (const raw of ["Staging_Scoped", "STAGING_SCOPED", "Live", "enabled", "yes", " ", "staging-scoped"]) {
    withEnv({ RCAP_CONSUMER_DELIVERY_ROUTE_STATE: raw, VERCEL_ENV: "preview" }, () => {
      assert.equal(resolveConsumerDeliveryRouteState(), "disabled", `"${raw}" must not enable the route`);
    });
  }
  // Scoped with an empty scope list authorizes nobody, on Preview included.
  withEnv({
    RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped",
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: "",
    VERCEL_ENV: "preview"
  }, () => {
    assert.equal(access(TEST_IDENTITY).allowed, false);
  });
});

// --- 6. Local ephemeral testing keeps working --------------------------------
check("local ephemeral testing keeps its explicitly controlled behaviour", () => {
  // A development-compiled local runtime with no Vercel variables is the
  // runtime the repository's own harnesses drive, and it must still admit the
  // named identity so the scope logic itself stays provable.
  withEnv(scoped({ NODE_ENV: "development" }), () => {
    assert.equal(resolveDeploymentEnvironment(), "development");
    assert.equal(access(TEST_IDENTITY).allowed, true);
    assert.equal(access(OUTSIDER_IDENTITY).allowed, false);
  });
});

// --- 7. Nothing downstream of the gate is opened by any of this --------------
check("payment, checkout, credits and rendering stay suppressed outside the admitted scope", () => {
  // The delivery gate is the FIRST of several. Whatever it decides, a route
  // that is not sellable must remain not sellable, and a treatment must remain
  // non-payable — so the resolver is asked under the most permissive
  // environment this control can produce.
  withEnv(scoped({ VERCEL_ENV: "preview" }), () => {
    assert.equal(access(TEST_IDENTITY).allowed, true, "precondition: the scope admits the identity");
  });

  for (const trackId of NON_SELLABLE_TRACK_SAMPLE) {
    const route = resolvePacketRoute({ state: trackId.split(":")[0], pathway: "", trackId });
    assert.equal(route.sellable, false, `${trackId} must not become sellable`);
    assert.equal(route.creditConsumable, false, `${trackId} must not consume a credit`);
    assert.equal(route.rendererKind, "none", `${trackId} must not render`);
  }

  for (const classification of ["component_deferral", "exact_supported_deferral", "terminal_treatment_candidate"]) {
    assert.equal(
      resolveSavePaymentAllowed(false, true, classification),
      false,
      `${classification} must close payment even for a direct-to-consumer session that asked for it`
    );
    assert.equal(resolveSavePaymentAllowed(true, true, classification), false);
  }
  // A partner-sponsored session never opens payment either.
  assert.equal(resolveSavePaymentAllowed(true, true, null), false);
});

console.log("");
if (failures.length > 0) {
  console.error(`DELIVERY ENVIRONMENT CLASSIFIER FAILED — ${failures.length} case(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Delivery environment classifier: ${passed}/${passed} cases green.`);
