import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

class MockRateLimitStore {
  counts = new Map();

  async rpc(functionName, args) {
    if (functionName !== "increment_request_rate_limit_bucket") {
      return { data: null, error: { message: "Unexpected RPC." } };
    }

    const key = [args.p_scope, args.p_bucket_key, args.p_window_start].join("|");
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);

    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 4)));

    return {
      data: [{
        allowed: count <= args.p_limit,
        count,
        remaining: Math.max(args.p_limit - count, 0),
        reset_at: new Date(Date.parse(args.p_window_start) + args.p_window_seconds * 1000).toISOString()
      }],
      error: null
    };
  }
}

const migrationSource = readSource("supabase/phase-24-request-rate-limit-buckets.sql");
const sharedLimiterSource = readSource("src/lib/request-pilot/shared-rate-limit.ts");
const routeSource = readSource("src/app/api/request-pilot/route.ts");

const {
  checkSharedPilotRequestRateLimit,
  derivePilotRequestRateLimitBucket,
  pilotRequestRateLimitScope
} = loadTsModule(path.join(rootDir, "src/lib/request-pilot/shared-rate-limit.ts"));
const {
  checkPilotRequestRateLimit,
  pilotRequestRateLimit,
  resetPilotRequestRateLimitForTests
} = loadTsModule(path.join(rootDir, "src/lib/request-pilot/rate-limit.ts"));

try {
  verifyMigrationShape();
  verifyBucketHashing();
  await verifySharedAuthorityAcrossLocalResets();
  await verifyConcurrentLimit();
  verifyConfigFailure();
  verifyRouteFlow();
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (failures.length > 0) {
  console.error("Request pilot shared rate-limit verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Request pilot shared rate-limit verification passed.");
console.log("Bucket key hashing: configured");
console.log("Shared limiter authority across local resets: configured");
console.log("Concurrent limit cap: configured");
console.log("Production missing-secret fail-closed: configured");
console.log("Migration RLS and atomic RPC: configured");

function verifyMigrationShape() {
  for (const required of [
    "create table if not exists public.request_rate_limit_buckets",
    "primary key (scope, bucket_key, window_start)",
    "request_rate_limit_buckets_expires_at_idx",
    "alter table public.request_rate_limit_buckets enable row level security",
    "create or replace function public.increment_request_rate_limit_bucket",
    "on conflict (scope, bucket_key, window_start)",
    "count = public.request_rate_limit_buckets.count + 1",
    "revoke all on function public.increment_request_rate_limit_bucket"
  ]) {
    if (!migrationSource.includes(required)) {
      failures.push(`Rate-limit migration is missing marker: ${required}`);
    }
  }

  for (const forbidden of ["create policy", "alter policy", "drop policy"]) {
    if (migrationSource.toLowerCase().includes(forbidden)) {
      failures.push(`Rate-limit migration includes forbidden policy marker: ${forbidden}`);
    }
  }
}

function verifyBucketHashing() {
  withEnv({ RATE_LIMIT_HASH_SECRET: "test-rate-limit-hash-secret-value" }, () => {
    const request = makeRequest();
    const bucket = derivePilotRequestRateLimitBucket(request, 1_700_000_000_000);
    assert(bucket.scope === pilotRequestRateLimitScope, "Bucket scope mismatch.");
    assert(/^[a-f0-9]{64}$/.test(bucket.bucketKey), "Bucket key should be a SHA-256 HMAC hex digest.");
    assert(!bucket.bucketKey.includes("203.0.113.42"), "Bucket key leaked raw IP.");
    assert(!bucket.bucketKey.includes("SentinelBrowser"), "Bucket key leaked raw user-agent.");
    assert(!bucket.bucketKey.includes("sentinel@example.test"), "Bucket key leaked email.");
  });

  for (const forbidden of [
    "contact_name",
    "organization_name",
    "email",
    "phone",
    "request.text()",
    "request.json()",
    "cookie",
    "authorization"
  ]) {
    if (sharedLimiterSource.includes(forbidden)) {
      failures.push(`Shared limiter source includes forbidden key material marker: ${forbidden}`);
    }
  }
}

async function verifySharedAuthorityAcrossLocalResets() {
  await withEnvAsync({ RATE_LIMIT_HASH_SECRET: "test-rate-limit-hash-secret-value" }, async () => {
    const store = new MockRateLimitStore();
    const request = makeRequest();
    let blocked = false;

    for (let index = 0; index < pilotRequestRateLimit.maxAttempts + 1; index += 1) {
      resetPilotRequestRateLimitForTests();
      const bucket = derivePilotRequestRateLimitBucket(request, 1_700_000_000_000);
      const local = checkPilotRequestRateLimit(bucket.bucketKey, 1_700_000_000_000);
      assert(local.ok, "Local reset simulation should allow the cheap local first pass.");
      const shared = await checkSharedPilotRequestRateLimit(store, request, 1_700_000_000_000);
      if (!shared.ok && shared.reason === "blocked") {
        blocked = true;
      }
    }

    assert(blocked, "Shared limiter did not block after repeated attempts with local memory reset.");
  });
}

async function verifyConcurrentLimit() {
  await withEnvAsync({ RATE_LIMIT_HASH_SECRET: "test-rate-limit-hash-secret-value" }, async () => {
    const store = new MockRateLimitStore();
    const request = makeRequest();
    const attempts = pilotRequestRateLimit.maxAttempts + 7;
    const results = await Promise.all(
      Array.from({ length: attempts }, () => checkSharedPilotRequestRateLimit(store, request, 1_700_000_000_000))
    );
    const allowed = results.filter((result) => result.ok).length;
    const blocked = results.filter((result) => !result.ok && result.reason === "blocked").length;

    assert(allowed === pilotRequestRateLimit.maxAttempts, `Concurrent shared limiter allowed ${allowed}, expected ${pilotRequestRateLimit.maxAttempts}.`);
    assert(blocked === attempts - pilotRequestRateLimit.maxAttempts, "Concurrent shared limiter did not block the excess attempts.");
  });
}

function verifyConfigFailure() {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.RATE_LIMIT_HASH_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.RATE_LIMIT_HASH_SECRET;

  try {
    let failedClosed = false;
    try {
      derivePilotRequestRateLimitBucket(makeRequest(), 1_700_000_000_000);
    } catch {
      failedClosed = true;
    }
    assert(failedClosed, "Production without RATE_LIMIT_HASH_SECRET should fail closed.");
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalSecret === undefined) {
      delete process.env.RATE_LIMIT_HASH_SECRET;
    } else {
      process.env.RATE_LIMIT_HASH_SECRET = originalSecret;
    }
  }
}

function verifyRouteFlow() {
  for (const marker of [
    "derivePilotRequestRateLimitBucket",
    "checkPilotRequestRateLimit(bucket.value.bucketKey)",
    "checkSharedPilotRequestRateLimit(supabase, request)",
    "rate_limit_shared_allowed",
    "rate_limit_shared_blocked",
    "rate_limit_shared_error",
    "rate_limit_config_error",
    'from("partner_pilot_requests").insert'
  ]) {
    if (!routeSource.includes(marker)) {
      failures.push(`/api/request-pilot is missing shared limiter marker: ${marker}`);
    }
  }

  const sharedIndex = routeSource.indexOf("checkSharedPilotRequestRateLimit(supabase, request)");
  const insertIndex = routeSource.indexOf('from("partner_pilot_requests").insert');
  if (sharedIndex === -1 || insertIndex === -1 || sharedIndex > insertIndex) {
    failures.push("Shared rate limiter must run before partner_pilot_requests insert.");
  }
}

function makeRequest() {
  return new Request("https://example.test/api/request-pilot", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.42",
      "user-agent": "SentinelBrowser/1.0",
      "cookie": "SENTINEL_COOKIE",
      "authorization": "Bearer SENTINEL_AUTH"
    },
    body: JSON.stringify({
      contact_name: "SENTINEL_CONTACT",
      organization_name: "SENTINEL_ORG",
      email: "sentinel@example.test",
      phone: "555-SENTINEL",
      message: "SENTINEL_MESSAGE"
    })
  });
}

function withEnv(values, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withEnvAsync(values, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (request === "server-only") {
      return {};
    }
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    for (const extension of [".ts", ".tsx"]) {
      const candidate = path.join(rootDir, "src", `${request.slice(2)}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) {
        return `${candidate}${extension}`;
      }
    }
  }

  return null;
}
