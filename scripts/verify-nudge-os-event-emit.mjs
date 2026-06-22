import { createHmac } from "node:crypto";
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

const nudgeEvents = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/nudge-os-events.ts"));

const fixedNow = new Date("2026-06-22T14:30:00.000Z");
const metrics = {
  window_start: "2026-06-21T14:30:00.000Z",
  window_end: "2026-06-22T14:30:00.000Z",
  dark_session_count: 42,
  touch_1_sent: 11,
  touch_2_sent: 5,
  return_rate: 0.2380952381,
  touch_2_return_rate: 0.4,
  record_readiness_dark_driver_rate: 0.5714285714
};

try {
  verifyPayloadShape();
  await verifySignatureAndIdempotencyHeader();
  await verifyDisabledNoSend();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("Nudge OS event emitter verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Nudge OS event emitter verification passed.");
console.log("Payload shape, no-PII contract, HMAC signature, stable idempotency, and disabled no-send behavior verified without network access.");

function verifyPayloadShape() {
  const payload = nudgeEvents.buildNudgeWindowEventPayload(metrics, { now: () => fixedNow });
  assert(payload.eventType === "screening_nudge_window", "Payload eventType mismatch.");
  assert(payload.product === "expungement_ai", "Payload product mismatch.");
  assert(payload.state === "ALL", "Payload state mismatch.");
  assert(payload.source === "drop_point_nudge", "Payload source mismatch.");
  assert(payload.timestamp === fixedNow.toISOString(), "Payload timestamp mismatch.");
  assert(deepEqual(payload.metadata, metrics), "Payload metadata does not carry the expected aggregate metrics.");
  assertNoForbiddenKeys(payload);
}

async function verifySignatureAndIdempotencyHeader() {
  let callCount = 0;
  let capturedRequest = null;
  const result = await nudgeEvents.emitNudgeWindowEvent(metrics, {
    now: () => fixedNow,
    configEnv: {
      LEGALEASE_OS_EVENTS_ENABLED: "true",
      LEGALEASE_OS_EVENTS_ENDPOINT: "https://os.example.test/api/events/product",
      LEGALEASE_OS_EVENTS_SECRET: "test-secret"
    },
    fetcher: async (url, init) => {
      callCount += 1;
      capturedRequest = { url, init };
      return new Response("ok", { status: 202 });
    }
  });

  assert(result.enabled === true && result.sent === true && result.status === 202, "Enabled emit did not return a successful result.");
  assert(callCount === 1, "Enabled emit should call fetch exactly once.");
  assert(capturedRequest?.url === "https://os.example.test/api/events/product", "Emitter posted to the wrong endpoint.");
  const headers = capturedRequest.init.headers;
  const body = String(capturedRequest.init.body);
  const payload = JSON.parse(body);
  const timestamp = headers["x-legalease-os-timestamp"];
  const signature = headers["x-legalease-os-signature"];
  const expectedSignature = createHmac("sha256", "test-secret").update(`${timestamp}.${body}`).digest("hex");

  assert(timestamp === fixedNow.toISOString(), "Signature timestamp header mismatch.");
  assert(signature?.startsWith("sha256="), "Signature header missing sha256 prefix.");
  assert(signature.slice("sha256=".length) === expectedSignature, "Signature header does not match recomputed HMAC.");
  assert(headers["x-idempotency-key"] === payload.idempotency_key, "Idempotency header does not match payload idempotency_key.");
  assert(payload.idempotency_key === result.idempotency_key, "Result idempotency_key does not match payload.");
  assertNoForbiddenKeys(payload);

  const rebuilt = nudgeEvents.buildNudgeWindowEventPayload(metrics, { now: () => new Date("2026-06-22T14:31:00.000Z") });
  assert(rebuilt.idempotency_key === payload.idempotency_key, "Idempotency key is not stable for the same window_end.");
}

async function verifyDisabledNoSend() {
  let callCount = 0;
  const result = await nudgeEvents.emitNudgeWindowEvent(metrics, {
    configEnv: {
      LEGALEASE_OS_EVENTS_ENDPOINT: "https://os.example.test/api/events/product",
      LEGALEASE_OS_EVENTS_SECRET: "test-secret"
    },
    fetcher: async () => {
      callCount += 1;
      return new Response("unexpected", { status: 500 });
    }
  });

  assert(result.enabled === false, "Disabled emit should report enabled=false.");
  assert(result.sent === false, "Disabled emit should report sent=false.");
  assert(result.skipped_reason === "disabled", "Disabled emit should report skipped_reason=disabled.");
  assert(callCount === 0, "Disabled emit must not call fetch.");
}

function assertNoForbiddenKeys(value) {
  const forbidden = new Set([
    "userId",
    "anonymousId",
    "email",
    "contact",
    "answers",
    "charge",
    "case_number",
    "eligibility",
    "eligibility_result",
    "eligibilityResult",
    "result",
    "payment",
    "packet",
    "packet_content",
    "packetContent"
  ]);
  const seen = [];
  walk(value, [], (keyPath) => {
    const key = keyPath.at(-1);
    if (forbidden.has(key)) seen.push(keyPath.join("."));
  });
  assert(seen.length === 0, `Payload contains forbidden PII/sensitive keys: ${seen.join(", ")}`);
}

function walk(value, pathParts, visitor) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    visitor(nextPath);
    walk(child, nextPath, visitor);
  }
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

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
    if (request === "server-only") return {};
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    if (nextFile?.endsWith(".json")) return require(nextFile);
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExistingModuleFile(candidate);
  }

  if (request.startsWith(".")) {
    return resolveExistingModuleFile(path.resolve(basedir, request));
  }

  return null;
}

function resolveExistingModuleFile(candidate) {
  for (const extension of [".ts", ".tsx", ".js", ".json"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const file = path.join(candidate, indexFile);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
