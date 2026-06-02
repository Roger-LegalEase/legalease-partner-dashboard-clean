import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const { seedPartners } = loadTsModule(path.join(rootDir, "src/lib/partners/seed-partners.ts"));

const outputFile = path.join(rootDir, "supabase/partner-seed-demo.sql");
const lines = [
  "-- Demo seed data for the LegalEase Partner Journey OS.",
  "-- Generated from src/lib/partners/seed-partners.ts.",
  ""
];

for (const partner of seedPartners) {
  lines.push(
    `insert into partner_records (${[
      "partner_id",
      "partner_slug",
      "partner_name",
      "contact_name",
      "contact_email",
      "organization_name",
      "legal_name",
      "primary_contact_name",
      "primary_contact_title",
      "primary_contact_email",
      "primary_contact_phone",
      "website",
      "organization_type",
      "program_name",
      "program_description",
      "target_state",
      "target_county",
      "target_city",
      "service_area",
      "expected_monthly_participants",
      "expected_launch_date",
      "referral_sources",
      "audience_description",
      "branding_notes",
      "logo_url",
      "onboarding_status",
      "onboarding_started_at",
      "onboarding_completed_at",
      "region",
      "state",
      "estimated_users_90_days",
      "record_clearing_needs",
      "program_goal",
      "program_tier",
      "selected_package_id",
      "selected_package_name",
      "payment_status",
      "qualification_status",
      "provisioning_status",
      "stripe_checkout_session_id",
      "stripe_customer_id",
      "stripe_payment_intent_id",
      "paid_at",
      "payment_amount",
      "payment_currency",
      "assigned_owner",
      "launch_date_target",
      "compliance_notes",
      "created_at",
      "updated_at"
    ].join(", ")}) values (${[
      sqlLiteral(partner.partnerId),
      sqlLiteral(partner.partnerSlug),
      sqlLiteral(partner.partnerName),
      sqlLiteral(partner.contactName),
      sqlLiteral(partner.contactEmail),
      sqlLiteral(partner.organizationName ?? null),
      sqlLiteral(partner.legalName ?? null),
      sqlLiteral(partner.primaryContactName ?? null),
      sqlLiteral(partner.primaryContactTitle ?? null),
      sqlLiteral(partner.primaryContactEmail ?? null),
      sqlLiteral(partner.primaryContactPhone ?? null),
      sqlLiteral(partner.website),
      sqlLiteral(partner.organizationType),
      sqlLiteral(partner.programName ?? null),
      sqlLiteral(partner.programDescription ?? null),
      sqlLiteral(partner.targetState ?? null),
      sqlLiteral(partner.targetCounty ?? null),
      sqlLiteral(partner.targetCity ?? null),
      sqlLiteral(partner.serviceArea ?? null),
      partner.expectedMonthlyParticipants ?? "null",
      sqlLiteral(partner.expectedLaunchDate ?? null),
      sqlLiteral(partner.referralSources ?? null),
      sqlLiteral(partner.audienceDescription ?? null),
      sqlLiteral(partner.brandingNotes ?? null),
      sqlLiteral(partner.logoUrl ?? null),
      sqlLiteral(partner.onboardingStatus ?? null),
      sqlLiteral(partner.onboardingStartedAt ?? null),
      sqlLiteral(partner.onboardingCompletedAt ?? null),
      sqlLiteral(partner.region),
      sqlLiteral(partner.state),
      partner.estimatedUsers90Days,
      sqlArray(partner.recordClearingNeeds),
      sqlLiteral(partner.programGoal),
      sqlLiteral(partner.programTier),
      sqlLiteral(partner.selectedPackageId ?? null),
      sqlLiteral(partner.selectedPackageName ?? null),
      sqlLiteral(partner.paymentStatus),
      sqlLiteral(partner.qualificationStatus),
      sqlLiteral(partner.provisioningStatus),
      sqlLiteral(partner.stripeCheckoutSessionId ?? null),
      sqlLiteral(partner.stripeCustomerId ?? null),
      sqlLiteral(partner.stripePaymentIntentId ?? null),
      sqlLiteral(partner.paidAt ?? null),
      partner.paymentAmount ?? "null",
      sqlLiteral(partner.paymentCurrency ?? null),
      sqlLiteral(partner.assignedOwner),
      sqlLiteral(partner.launchDateTarget),
      sqlLiteral(partner.complianceNotes),
      sqlLiteral(partner.createdAt),
      sqlLiteral(partner.updatedAt)
    ].join(", ")});`
  );

  for (const asset of Object.values(partner.assets)) {
    lines.push(
      `insert into partner_assets (partner_slug, asset_key, label, description, status, route, owner, next_action) values (${[
        sqlLiteral(partner.partnerSlug),
        sqlLiteral(asset.key),
        sqlLiteral(asset.label),
        sqlLiteral(asset.description),
        sqlLiteral(asset.status),
        sqlLiteral(asset.route ?? null),
        sqlLiteral(asset.owner),
        sqlLiteral(asset.nextAction)
      ].join(", ")});`
    );
  }

  lines.push(
    `insert into partner_metrics (partner_slug, referrals, screenings, likely_eligible, product_starts, packets_ready, filings, outcomes_available) values (${[
      sqlLiteral(partner.partnerSlug),
      partner.metrics.referrals,
      partner.metrics.screenings,
      partner.metrics.likelyEligible,
      partner.metrics.productStarts,
      partner.metrics.packetsReady,
      partner.metrics.filings,
      partner.metrics.outcomesAvailable
    ].join(", ")});`,
    ""
  );
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${lines.join("\n")}\n`);
console.log(`Wrote ${path.relative(rootDir, outputFile)} for ${seedPartners.length} partners.`);

function sqlLiteral(value) {
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(values) {
  if (!values?.length) {
    return "'{}'";
  }

  return `array[${values.map(sqlLiteral).join(", ")}]`;
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
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return path.join(rootDir, "src", `${request.slice(2)}.ts`);
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
