import fs from "node:fs";
import http from "node:http";
import Module from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.OBSERVABILITY_VERIFY_PORT ?? 3178);
let baseUrl = `http://127.0.0.1:${port}`;
const moduleCache = new Map();
const failures = [];
const checks = [];

loadLocalEnv();
verifySourceShape();
verifyLogScrub();

let server;
try {
  if (failures.length === 0) {
    server = await startNextServer();
    await verifyHealthEndpoint();
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}

if (failures.length > 0) {
  console.error("Observability safety verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Observability safety verification passed.");
for (const check of checks) {
  console.log(`PASS: ${check}`);
}

function verifySourceShape() {
  const packageSource = readSource("package.json");
  const healthSource = readSource("src/app/api/health/route.ts");
  const loggerSource = readSource("src/lib/observability/logger.ts");
  const requestPilotSource = readSource("src/app/api/request-pilot/route.ts");
  const pilotStatusSource = readSource("src/app/api/internal/pilot-requests/status/route.ts");
  const legacyAdminActionSource = readSource("src/app/api/internal/partners/admin-action/route.ts");
  const legacySendEmailSource = readSource("src/app/api/internal/partners/send-email/route.ts");

  if (packageSource.includes("@sentry/nextjs") || packageSource.includes("\"sentry\"")) {
    failures.push("Sentry appears in package.json; this verifier expected no new vendor integration.");
  }

  if (!healthSource.includes("checks:") || !healthSource.includes("db")) {
    failures.push("/api/health must return the required checks.db shape.");
  }

  for (const forbidden of ["partner_pilot_requests", "rcap_intake", "rcap_document", "process.env.NEXT_PUBLIC_SUPABASE_URL", "commit", "deployment", "route list"]) {
    if (healthSource.includes(forbidden)) {
      failures.push(`/api/health source contains forbidden marker: ${forbidden}`);
    }
  }

  for (const source of [loggerSource, requestPilotSource, pilotStatusSource, legacyAdminActionSource, legacySendEmailSource]) {
    for (const forbidden of ["console.log(request", "console.error(request", "headers.entries", "Object.fromEntries(request.headers", "request.body"]) {
      if (source.includes(forbidden)) {
        failures.push(`Observability source contains risky raw request/header/body logging marker: ${forbidden}`);
      }
    }
  }

  checks.push("Source shape uses structured console logging without Sentry or raw request/body/header logging.");
}

function verifyLogScrub() {
  const captured = [];
  const originalError = console.error;
  console.error = (value) => {
    captured.push(String(value));
  };

  try {
    const { logSecurityError } = loadTsModule(path.join(rootDir, "src/lib/observability/logger.ts"));
    logSecurityError({
      event: "pilot_request insert fail",
      route: "/api/request-pilot",
      outcome: "fail",
      requestId: "safe-test-request",
      error: new Error(
        [
          "contact_name=SENTINEL_CONTACT",
          "email=sentinel@example.test",
          "phone=555-SENTINEL",
          "message=SENTINEL_MESSAGE",
          "organization_name=SENTINEL_ORG",
          "cookie=SENTINEL_COOKIE",
          "authorization=SENTINEL_AUTH",
          "access_token=SENTINEL_ACCESS_TOKEN",
          "refresh_token=SENTINEL_REFRESH_TOKEN",
          "session_id=SENTINEL_SESSION_ID",
          "body=SENTINEL_RAW_BODY"
        ].join(" ")
      ),
      metadata: {
        contact_name: "SENTINEL_CONTACT",
        email: "sentinel@example.test",
        phone: "555-SENTINEL",
        message: "SENTINEL_MESSAGE",
        organization_name: "SENTINEL_ORG",
        cookie: "SENTINEL_COOKIE",
        authorization: "SENTINEL_AUTH",
        access_token: "SENTINEL_ACCESS_TOKEN",
        refresh_token: "SENTINEL_REFRESH_TOKEN",
        session_id: "SENTINEL_SESSION_ID",
        request_body: "SENTINEL_RAW_BODY",
        status: "new"
      }
    });
  } finally {
    console.error = originalError;
  }

  const output = captured.join("\n");
  const sentinels = [
    "SENTINEL_CONTACT",
    "sentinel@example.test",
    "555-SENTINEL",
    "SENTINEL_MESSAGE",
    "SENTINEL_ORG",
    "SENTINEL_COOKIE",
    "SENTINEL_AUTH",
    "SENTINEL_ACCESS_TOKEN",
    "SENTINEL_REFRESH_TOKEN",
    "SENTINEL_SESSION_ID",
    "SENTINEL_RAW_BODY"
  ];

  for (const sentinel of sentinels) {
    if (output.includes(sentinel)) {
      failures.push(`Captured structured log leaked sentinel value: ${sentinel}`);
    }
  }

  const parsed = JSON.parse(output);
  if (parsed.event !== "pilot_request insert fail" || parsed.route !== "/api/request-pilot" || parsed.metadata?.status !== "new") {
    failures.push("Captured structured log did not preserve safe event/route/status fields.");
  }

  checks.push("Captured structured log output redacts PII, raw body markers, cookies, auth headers, and token/session sentinels.");
}

async function verifyHealthEndpoint() {
  const response = await fetch(`${baseUrl}/api/health`);
  const bodyText = await response.text();
  const body = JSON.parse(bodyText);
  const keys = Object.keys(body).sort();
  const checkKeys = Object.keys(body.checks ?? {}).sort();

  if (keys.join(",") !== "checks,ok,timestamp") {
    failures.push(`/api/health returned unexpected top-level keys: ${keys.join(",")}`);
  }
  if (checkKeys.join(",") !== "db") {
    failures.push(`/api/health returned unexpected check keys: ${checkKeys.join(",")}`);
  }
  if (typeof body.ok !== "boolean" || typeof body.timestamp !== "string" || !["ok", "fail"].includes(body.checks?.db)) {
    failures.push("/api/health returned invalid liveness field types.");
  }

  const forbidden = [
    "partner_pilot_requests",
    "rcap_intake",
    "rcap_document",
    "partner_records",
    "count",
    "schema",
    "env",
    "deployment",
    "commit",
    "route",
    "feature",
    "partnerSlug",
    "user",
    "session",
    "supabase",
    "project"
  ];
  const lowerBody = bodyText.toLowerCase();
  for (const marker of forbidden) {
    if (lowerBody.includes(marker.toLowerCase())) {
      failures.push(`/api/health leaked forbidden marker: ${marker}`);
    }
  }

  checks.push("/api/health returns only ok, timestamp, and checks.db without forbidden fields.");
}

async function startNextServer() {
  for (const existingUrl of [baseUrl, "http://127.0.0.1:3000", "http://localhost:3000"]) {
    if (await canReachServer(existingUrl)) {
      baseUrl = existingUrl;
      return { kill() {} };
    }
  }

  const nextBin = path.join(rootDir, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: rootDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await canReachServer(baseUrl)) {
      return child;
    }
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited early.\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  child.kill("SIGTERM");
  throw new Error(`Next dev server did not become ready.\n${output}`);
}

function canReachServer(url = baseUrl) {
  return new Promise((resolve) => {
    const request = http.get(`${url}/api/health`, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
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

function readSource(relativePath) {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    failures.push(`Unable to read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
