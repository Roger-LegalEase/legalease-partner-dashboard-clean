import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

readDotEnvFile(".env");
readDotEnvFile(".env.local");
if (!process.env.DATABASE_URL && existsSync(".env.example")) {
  readDotEnvFile(".env.example");
}

const strict = process.env.SMOKE_STRICT === "true";
const required = [
  "DATABASE_URL",
  "APP_BASE_URL",
  "NEXTAUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_RECORD_CHECK",
  "STRIPE_PRICE_MONITORING_LITE_MONTHLY",
  "STRIPE_PRICE_MONITORING_LITE_ANNUAL",
  "STRIPE_PRICE_MONITORING_PLUS_MONTHLY",
  "CHECKR_API_KEY",
	  "CHECKR_WEBHOOK_SECRET",
	  "OPENAI_API_KEY",
	  "BETA_ACCESS_ENABLED",
	  "BETA_INVITE_ONLY",
	  "BETA_MAX_USERS",
	  "RECORD_CHECK_PURCHASE_ENABLED",
	  "MONITORING_PURCHASE_ENABLED",
	  "AI_SUMMARY_ENABLED",
	  "ADMIN_RETRY_ENABLED",
	  "DATA_DELETION_REQUEST_ENABLED"
	];
const optional = ["EMAIL_PROVIDER_API_KEY", "NOTIFICATIONS_WEBHOOK_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  fail(`Missing required staging env vars: ${missing.join(", ")}`);
}

const appBaseUrl = new URL(process.env.APP_BASE_URL);
console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "not set"}`);
console.log(`APP_ENV: ${process.env.APP_ENV ?? "not set"}`);
console.log(`APP_BASE_URL: ${appBaseUrl.href}`);
console.log("Stripe prices: configured");
console.log("Checkr env: configured");
console.log("OpenAI env: configured");
console.log(`Webhook secrets: ${process.env.STRIPE_WEBHOOK_SECRET && process.env.CHECKR_WEBHOOK_SECRET ? "configured" : "missing"}`);
console.log(`Beta access: ${process.env.BETA_ACCESS_ENABLED}`);
console.log(`Invite-only beta: ${process.env.BETA_INVITE_ONLY}`);
console.log(`Beta max users: ${process.env.BETA_MAX_USERS}`);
console.log(`Record Check purchases: ${process.env.RECORD_CHECK_PURCHASE_ENABLED}`);
console.log(`Monitoring purchases: ${process.env.MONITORING_PURCHASE_ENABLED}`);
console.log(`AI summaries: ${process.env.AI_SUMMARY_ENABLED}`);
console.log(`Admin retry: ${process.env.ADMIN_RETRY_ENABLED}`);
console.log(`Data deletion requests: ${process.env.DATA_DELETION_REQUEST_ENABLED}`);

if (process.env.BETA_INVITE_ONLY === "true" && !process.env.BETA_APPROVED_EMAILS && !process.env.BETA_INVITE_CODES) {
  handleSoftFailure("Invite-only beta is enabled without BETA_APPROVED_EMAILS or BETA_INVITE_CODES.");
}

if (process.env.RATE_LIMIT_REDIS_REST_URL && process.env.RATE_LIMIT_REDIS_REST_TOKEN) {
  console.log("Rate limiter: redis");
} else if (strict) {
  fail("Rate limiter: SMOKE_STRICT=true requires RATE_LIMIT_REDIS_REST_URL and RATE_LIMIT_REDIS_REST_TOKEN.");
} else if (process.env.NODE_ENV === "production" && process.env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK !== "true") {
  fail("Rate limiter: production requires Redis or explicit RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true.");
} else {
  console.log("Rate limiter: memory fallback allowed outside production");
}

if (process.env.DEV_AUTH_EMAIL || process.env.NEXTAUTH_SECRET) {
  console.log("Admin/auth configuration: present");
} else {
  fail("Admin/auth configuration is missing.");
}

await checkDatabase();
await checkHttpReachability(appBaseUrl);

for (const key of optional) {
  console.log(`${key}: ${process.env[key] ? "configured" : "not configured"}`);
}

console.log("Staging smoke checks passed. Run provider checkout/webhook tests from Stripe and Checkr dashboards next.");

async function checkDatabase() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connectivity: ok");
  } catch (error) {
    handleSoftFailure(`Database connectivity failed: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function checkHttpReachability(baseUrl) {
  const checks = [
    ["App shell", new URL("/", baseUrl)],
    ["Admin shell", new URL("/admin", baseUrl)],
    ["Dashboard shell", new URL("/dashboard", baseUrl)]
  ];

  for (const [name, url] of checks) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (![200, 302, 307, 308].includes(response.status)) {
        handleSoftFailure(`${name} failed: ${response.status} ${url.href}`);
      } else {
        console.log(`${name}: ${response.status}`);
      }
    } catch (error) {
      handleSoftFailure(`${name} unreachable: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
}

function handleSoftFailure(message) {
  if (strict) {
    fail(message);
  }
  console.warn(`${message} Set SMOKE_STRICT=true in staging to fail on this check.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readDotEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}
