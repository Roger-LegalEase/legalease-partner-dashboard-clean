import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredStripeEnvVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_APP_URL"];
const bannedStripeEnvPatterns = ["STARTER", "COMMUNITY", "COUNTY"].map(
  (name) => new RegExp(`STRIPE_${"PRICE"}_[A-Z0-9_]*${name}[A-Z0-9_]*`)
);
const bannedWrongPricePatterns = ["500", "2,500", "7,500"].map(
  (amount) => new RegExp(`\\$${amount} one-time`)
);
const bannedProductModules = ["StartApart", "ClaimCoach"];

loadLocalEnv();

const failures = [];
const missingStripeEnv = requiredStripeEnvVars.filter((envVar) => !process.env[envVar]);
const envLocalTracked = isGitTracked(".env.local");
const trackedSecretsFound = stripeSecretsAppearInTrackedFiles();

if (missingStripeEnv.length > 0) {
  failures.push(`Missing Stripe env vars: ${missingStripeEnv.join(", ")}.`);
}

if (!isGitIgnored(".env.local")) {
  failures.push(".env.local is not ignored by git.");
}

if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

if (trackedSecretsFound) {
  failures.push("Stripe secret values appear in tracked files.");
}

failures.push(...verifyDashboardProductBoundary());
failures.push(...verifyInvoiceBillingModel());

if (failures.length > 0) {
  console.error("Stripe readiness verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Stripe readiness verification passed.");
console.log("Stripe invoice env: configured");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");
console.log("Partner billing model: invoices only");

function verifyInvoiceBillingModel() {
  const invoiceFailures = [];
  const sourceChecks = [
    "docs/STRIPE_PARTNER_BILLING.md",
    "src/lib/partners/billing.ts",
    "src/app/internal/billing/page.tsx",
    "src/app/internal/billing/new/page.tsx",
    "src/app/internal/billing/create/route.ts",
    "src/app/api/stripe/webhook/route.ts",
    "src/app/api/partners/checkout/route.ts",
    "src/lib/partners/billing-reconciliation.ts",
    "scripts/test-billing-reconciliation.mjs",
    "supabase/phase-25-partner-billing-invoices.sql"
  ];

  for (const relativePath of sourceChecks) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      invoiceFailures.push(`Missing invoice billing file: ${relativePath}.`);
    }
  }

  const allSource = readTrackedText();
  for (const envPattern of bannedStripeEnvPatterns) {
    const match = allSource.match(envPattern);
    if (match) {
      invoiceFailures.push(`Fixed Stripe price env var remains in tracked source: ${match[0]}.`);
    }
  }

  for (const wrongPricePattern of bannedWrongPricePatterns) {
    const match = allSource.match(wrongPricePattern);
    if (match) {
      invoiceFailures.push(`Wrong fixed partner checkout price remains in source: ${match[0]}.`);
    }
  }

  const checkoutRoute = readSource("src/app/api/partners/checkout/route.ts");
  const bannedCheckoutCreateCall = `checkout.sessions.${"create"}`;
  if (!checkoutRoute.includes("Public partner checkout is not supported") || checkoutRoute.includes(bannedCheckoutCreateCall)) {
    invoiceFailures.push("Public partner checkout route is not legacy-disabled.");
  }

  const bannedHostedLinkApiCamel = `payment${"Links"}`;
  const bannedHostedLinkApiSnake = `payment_${"links"}`;
  const bannedInvoiceSendCall = `send${"Invoice"}(`;

  if (allSource.includes(bannedHostedLinkApiCamel) || allSource.includes(bannedHostedLinkApiSnake)) {
    invoiceFailures.push("Stripe Payment Links appear in source.");
  }

  if (allSource.includes(bannedInvoiceSendCall)) {
    invoiceFailures.push("Stripe invoice sending is wired directly; this phase should create hosted invoice pages only.");
  }

  const billingRoute = readSource("src/app/internal/billing/create/route.ts");
  if (!billingRoute.includes("requireInternalAdminSession") || !billingRoute.includes("validatePartnerBillingInput")) {
    invoiceFailures.push("Internal billing create route does not require internal_admin validation.");
  }

  const billingSource = readSource("src/lib/partners/billing.ts");
  if (!billingSource.includes("stripe.invoices.create") || !billingSource.includes("stripe.invoiceItems.create")) {
    invoiceFailures.push("Billing helper does not create Stripe invoice items and invoices.");
  }

  const reconciliationSource = readSource("src/lib/partners/billing-reconciliation.ts");
  const reconciliationTestSource = readSource("scripts/test-billing-reconciliation.mjs");
  if (!billingSource.includes("reconcilePartnerBillingInvoiceEvent") || !reconciliationSource.includes("findBillingRequestByStripeInvoiceId")) {
    invoiceFailures.push("Billing reconciliation does not use the hardened invoice-event helper with invoice-ID fallback.");
  }

  if (!reconciliationSource.includes("stale_processed_event_repair") || !reconciliationSource.includes("recordProcessedStripeEvent(event.id, event.type, stripeInvoiceId)")) {
    invoiceFailures.push("Supported invoice events can be marked processed before verified billing reconciliation.");
  }

  for (const requiredCoverage of [
    "testInvoicePaidUpdatesStatusAndPaidAt",
    "testProcessedPaidEventRepairsUnpaidBillingRow",
    "testMissingMetadataFallbackByStripeInvoiceId",
    "testNoMatchingBillingRowFailsWithoutProcessedRecord",
    "testDuplicatePaidAfterSuccessfulProcessingIsIdempotent",
    "testSupportedEventCannotBeRecordedAsIgnored",
    "testUnsupportedEventCanBeIgnored"
  ]) {
    if (!reconciliationTestSource.includes(requiredCoverage)) {
      invoiceFailures.push(`Billing reconciliation regression coverage is missing ${requiredCoverage}.`);
    }
  }

  if (!billingSource.includes("partnerBillingMinAmountCents") || !billingSource.includes("partnerBillingMaxAmountCents")) {
    invoiceFailures.push("Billing helper does not enforce server-side amount bounds.");
  }

  if (!billingSource.includes("normalizeAmountCents") || !billingRoute.includes('formData.get("amountDollars")')) {
    invoiceFailures.push("Billing amount is not validated on the server-side internal route.");
  }

  const bannedPriceDataKey = `price_${"data"}`;
  if (billingSource.includes("price:") || billingSource.includes(bannedPriceDataKey) || billingRoute.includes("priceId")) {
    invoiceFailures.push("Billing helper appears to use Checkout price identifiers.");
  }

  const webhookSource = readSource("src/app/api/stripe/webhook/route.ts");
  if (!webhookSource.includes("request.text()") || !webhookSource.includes("constructEvent(rawBody, signature, webhookSecret)")) {
    invoiceFailures.push("Webhook route does not verify Stripe signatures against the raw body.");
  }

  if (!webhookSource.includes("Missing Stripe signature") || !webhookSource.includes("Invalid Stripe webhook signature")) {
    invoiceFailures.push("Webhook route does not reject missing or invalid Stripe signatures safely.");
  }

  for (const eventType of ["invoice.finalized", "invoice.paid", "invoice.payment_failed", "invoice.voided"]) {
    if (!reconciliationSource.includes(eventType)) {
      invoiceFailures.push(`Billing reconciliation does not handle ${eventType}.`);
    }
  }

  if (!billingSource.includes("processed_stripe_events") || !reconciliationSource.includes("hasProcessedStripeEvent") || !reconciliationSource.includes('return "duplicate"')) {
    invoiceFailures.push("Stripe webhook idempotency tracking is missing.");
  }

  if (!reconciliationSource.includes('return "ignored"') || !reconciliationSource.includes("!isSupportedInvoiceEvent")) {
    invoiceFailures.push("Unsupported Stripe events are not safely ignored.");
  }

  if (!webhookSource.includes('status: 500') || !reconciliationSource.includes("Unable to reconcile Stripe invoice event")) {
    invoiceFailures.push("Webhook failed-write retry behavior is not represented.");
  }

  if (clientFilesExposeServerOnlyPaymentHelpers()) {
    invoiceFailures.push("Client code imports server-only payment or admin helpers.");
  }

  if (newBillingLogsExposeUnsafeFields()) {
    invoiceFailures.push("New billing logs include unsafe PII or secret-bearing fields.");
  }

  if (clientFilesExposeStripeSecrets()) {
    invoiceFailures.push("Client code references server-only Stripe secrets.");
  }

  return invoiceFailures;
}

function stripeSecretsAppearInTrackedFiles() {
  const secretValues = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET
  ].filter((value) => typeof value === "string" && value.length > 0);

  if (secretValues.length === 0) {
    return false;
  }

  for (const file of getTrackedFiles()) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(absolutePath);
    for (const secret of secretValues) {
      if (content.includes(Buffer.from(secret))) {
        return true;
      }
    }
  }

  return false;
}

function verifyDashboardProductBoundary() {
  const boundaryFailures = [];
  const dashboardDataPath = path.join(rootDir, "src/lib/partner-dashboard-data.ts");
  const source = fs.readFileSync(dashboardDataPath, "utf8");
  for (const banned of bannedProductModules) {
    if (source.includes(banned)) {
      boundaryFailures.push(`${banned} appears in the partner dashboard product modules.`);
    }
  }

  return boundaryFailures;
}

function clientFilesExposeStripeSecrets() {
  const bannedClientSecrets = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

  for (const file of getTrackedFiles()) {
    if (!file.startsWith("src/") || (!file.endsWith(".ts") && !file.endsWith(".tsx"))) {
      continue;
    }

    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const source = fs.readFileSync(absolutePath, "utf8");
    if (!source.includes('"use client"') && !source.includes("'use client'")) {
      continue;
    }

    if (bannedClientSecrets.some((secret) => source.includes(secret))) {
      return true;
    }
  }

  return false;
}

function clientFilesExposeServerOnlyPaymentHelpers() {
  const bannedImports = ["@/lib/stripe/server", "@/lib/supabase/server", "@/lib/partners/billing", "@/lib/partners/internal-admin-gate"];

  for (const file of getTrackedFiles()) {
    if (!file.startsWith("src/") || (!file.endsWith(".ts") && !file.endsWith(".tsx"))) {
      continue;
    }

    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const source = fs.readFileSync(absolutePath, "utf8");
    if (!source.includes('"use client"') && !source.includes("'use client'")) {
      continue;
    }

    if (bannedImports.some((bannedImport) => source.includes(bannedImport))) {
      return true;
    }
  }

  return false;
}

function newBillingLogsExposeUnsafeFields() {
  const newBillingSources = [
    "src/lib/partners/billing.ts",
    "src/app/internal/billing/create/route.ts",
    "src/app/api/stripe/webhook/route.ts"
  ].map(readSource).join("\n");
  const unsafeLogTerms = [
    "contactEmail",
    "contact_email",
    "contactName",
    "contact_name",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "cookie",
    "jwt",
    "invite_link",
    "INTERNAL_ADMIN_ACCESS_TOKEN"
  ];

  const logLines = newBillingSources.split(/\r?\n/).filter((line) => line.includes("logSecurity") || line.includes("console."));
  return logLines.some((line) => unsafeLogTerms.some((term) => line.includes(term)));
}

function readTrackedText() {
  return getTrackedFiles()
    .filter((file) => !file.startsWith("node_modules/") && !file.startsWith(".next/"))
    .map((file) => {
      const absolutePath = path.join(rootDir, file);
      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        return "";
      }

      return fs.readFileSync(absolutePath, "utf8");
    })
    .join("\n");
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function isGitTracked(relativePath) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", relativePath], {
    cwd: rootDir,
    stdio: "ignore"
  });
  return result.status === 0;
}

function isGitIgnored(relativePath) {
  const result = spawnSync("git", ["check-ignore", relativePath], {
    cwd: rootDir,
    stdio: "ignore"
  });
  return result.status === 0;
}

function getTrackedFiles() {
  const tracked = spawnSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (tracked.status !== 0) {
    return [];
  }

  const files = new Set([
    ...tracked.stdout.split("\n").filter(Boolean),
    ...(untracked.status === 0 ? untracked.stdout.split("\n").filter(Boolean) : [])
  ]);

  return [...files];
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envSource = fs.readFileSync(envPath, "utf8");
  for (const line of envSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
