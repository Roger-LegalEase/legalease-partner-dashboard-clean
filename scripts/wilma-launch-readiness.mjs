import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredEnv = [
  "DATABASE_URL",
  "APP_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "BOT_PROTECTION_SECRET",
  "ERROR_MONITORING_DSN",
  "PRODUCTION_ALERT_WEBHOOK_URL"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    failures.push(`Missing required production env var: ${key}`);
  }
}

if (process.env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK === "true") {
  failures.push("RATE_LIMIT_ALLOW_MEMORY_FALLBACK must not be true for production launch.");
}

if (!process.env.RATE_LIMIT_REDIS_REST_URL || !process.env.RATE_LIMIT_REDIS_REST_TOKEN) {
  warnings.push("Redis-backed rate limiting env vars are not both configured.");
}

if (process.env.WILMA_STORE_RAW_TRANSCRIPTS === "true") {
  warnings.push("WILMA_STORE_RAW_TRANSCRIPTS is true; confirm this is approved for launch.");
}

const envSource = read("src/lib/env.ts");
const publicEnvSource = read("src/lib/public-env.ts");
const widgetSource = read("src/components/wilma/WilmaChatWidget.tsx");
const paymentSuccessRoute = read("src/app/api/wilma/payment-success/route.ts");
const checkoutSource = read("src/wilma/chat/checkout.ts");
const adminList = read("src/app/admin/wilma/page.tsx");
const adminDetail = read("src/app/admin/wilma/[sessionId]/page.tsx");
const abuseTypes = read("src/wilma/abuse/types.ts");
const analyticsTypes = read("src/wilma/analytics/types.ts");
const supportRefundsDoc = read("docs/WILMA_SUPPORT_AND_REFUNDS.md");

assertIncludes(envSource, 'import "server-only"', "src/lib/env.ts must import server-only.");
assertDoesNotInclude(publicEnvSource, "STRIPE_SECRET", "public env must not expose Stripe secrets.");
assertDoesNotInclude(publicEnvSource, "OPENAI_API_KEY", "public env must not expose OpenAI API key.");
assertDoesNotInclude(widgetSource, "@/lib/env", "Wilma client widget must not import server env.");
assertDoesNotInclude(widgetSource, "OPENAI_API_KEY", "Wilma client widget must not reference OpenAI key.");
assertIncludes(paymentSuccessRoute, "stripe-signature", "payment success route must require Stripe signature.");
assertIncludes(paymentSuccessRoute, "constructEvent", "payment success route must verify provider webhook event.");
assertIncludes(checkoutSource, "priceCents: 5000", "Wilma checkout price must be 5000 cents.");
assertIncludes(checkoutSource, 'product: "wilma_document_prep"', "Wilma checkout product metadata must be wilma_document_prep.");
assertIncludes(adminList, "requireAdmin", "/admin/wilma must require admin access.");
assertIncludes(adminDetail, "requireAdmin", "/admin/wilma/[sessionId] must require admin access.");
assertIncludes(abuseTypes, "maxUserMessagesPerSession: 40", "Wilma message cap must be configured.");
assertIncludes(abuseTypes, "sessionInactivityMs", "Wilma session expiration must be configured.");
assertIncludes(supportRefundsDoc, "Refund Review", "Support/refund route must be documented.");
assertIncludes(supportRefundsDoc, "Support Escalation", "Support escalation path must be documented.");

const supportedStates = ["IL", "PA", "MD", "DC", "MS", "TX"];
for (const state of supportedStates) {
  assertIncludes(widgetSource, `"${state}"`, `Wilma widget must expose supported state ${state}.`);
}

const requiredAnalyticsEvents = [
  "wilma_chat_started",
  "wilma_state_selected",
  "wilma_facts_extracted",
  "wilma_decision_created",
  "wilma_email_gate_shown",
  "wilma_email_captured",
  "wilma_paid_cta_shown",
  "wilma_checkout_clicked",
  "wilma_checkout_created",
  "wilma_payment_succeeded",
  "wilma_order_created",
  "wilma_document_generation_started",
  "wilma_document_generation_succeeded",
  "wilma_document_generation_failed",
  "wilma_tracker_created",
  "wilma_session_flagged"
];

for (const eventName of requiredAnalyticsEvents) {
  assertIncludes(analyticsTypes, eventName, `Wilma analytics event must be configured: ${eventName}.`);
}

if (failures.length) {
  console.error("Wilma launch readiness failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (warnings.length) {
    console.error("\nWarnings:");
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log("Wilma launch readiness checks passed.");
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    failures.push(message);
  }
}

function assertDoesNotInclude(source, needle, message) {
  if (source.includes(needle)) {
    failures.push(message);
  }
}
