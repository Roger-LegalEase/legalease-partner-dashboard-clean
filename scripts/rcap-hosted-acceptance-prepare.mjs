#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

export const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

export const HOSTED_ACCEPTANCE_IDENTITY_ROLES = Object.freeze([
  "paid consumer",
  "sponsored consumer",
  "legacy consumer",
  "clinic participant",
  "clinic staff",
  "partner admin",
  "internal admin",
  "cross-user control",
  "cross-tenant control"
]);

export const HOSTED_ACCEPTANCE_SPONSORSHIP_STATES = Object.freeze([
  "valid",
  "expired",
  "exhausted",
  "invalid"
]);

export const HOSTED_ACCEPTANCE_PROMOTION_STATES = Object.freeze([
  "valid",
  "invalid",
  "expired",
  "exhausted",
  "wrong-product"
]);

const CAPABILITY_NAMES = Object.freeze([
  "github",
  "vercel",
  "supabase",
  "ghcr",
  "stripe-test",
  "email-capture",
  "playwright",
  "chromium"
]);

function hasValue(environment, name) {
  return typeof environment[name] === "string" && environment[name].length > 0;
}

export function detectHostedAcceptanceCapabilities(environment = process.env) {
  const capabilityPresent = {
    github: hasValue(environment, "GH_TOKEN") || hasValue(environment, "GITHUB_TOKEN"),
    vercel: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"].every((name) => hasValue(environment, name)),
    supabase: hasValue(environment, "SUPABASE_ACCESS_TOKEN")
      && environment.ACCEPTANCE_SUPABASE_PROJECT_REF === ACCEPTANCE_PROJECT_REF,
    ghcr: ["GHCR_TOKEN", "CR_PAT", "GH_TOKEN", "GITHUB_TOKEN"].some((name) => hasValue(environment, name)),
    "stripe-test": hasValue(environment, "HOSTED_STRIPE_TEST_SECRET")
      && environment.HOSTED_STRIPE_TEST_SECRET.startsWith("sk_test_"),
    "email-capture": ["HOSTED_EMAIL_CAPTURE_URL", "EMAIL_CAPTURE_URL", "MAILPIT_URL"]
      .some((name) => hasValue(environment, name)),
    playwright: environment.HOSTED_PLAYWRIGHT_AVAILABLE === "1" || hasValue(environment, "PLAYWRIGHT_BROWSERS_PATH"),
    chromium: ["HOSTED_CHROMIUM_PATH", "CHROMIUM_PATH", "CHROME_PATH"].some((name) => hasValue(environment, name))
  };

  return {
    present: CAPABILITY_NAMES.filter((name) => capabilityPresent[name]),
    absent: CAPABILITY_NAMES.filter((name) => !capabilityPresent[name])
  };
}

export function buildEnvironmentPreparation({ applicationSha, evidenceFolders, environment = process.env }) {
  if (!/^[0-9a-f]{40}$/.test(applicationSha ?? "")) {
    throw new Error("HOSTED_APPLICATION_SHA must be an exact 40-character lowercase Git SHA");
  }
  const requestedProjectRef = environment.ACCEPTANCE_SUPABASE_PROJECT_REF;
  if (requestedProjectRef && requestedProjectRef !== ACCEPTANCE_PROJECT_REF) {
    throw new Error("ACCEPTANCE_SUPABASE_PROJECT_REF must name the pinned acceptance project");
  }

  return {
    schemaVersion: "rcap-hosted-environment-preparation/v1",
    acceptanceProjectRef: ACCEPTANCE_PROJECT_REF,
    applicationSha,
    identityRoles: [...HOSTED_ACCEPTANCE_IDENTITY_ROLES],
    sponsorshipStates: [...HOSTED_ACCEPTANCE_SPONSORSHIP_STATES],
    promotionStates: [...HOSTED_ACCEPTANCE_PROMOTION_STATES],
    evidenceFolders: { ...evidenceFolders },
    capabilities: detectHostedAcceptanceCapabilities(environment)
  };
}

export function writeEnvironmentPreparation({ rootDir, environment = process.env } = {}) {
  const evidenceFolders = prepareHostedAcceptanceEvidenceLayout({ rootDir, environment });
  const preparation = buildEnvironmentPreparation({
    applicationSha: environment.HOSTED_APPLICATION_SHA,
    evidenceFolders,
    environment
  });
  const evidencePath = path.join(evidenceFolders.root, "environment-preparation.json");
  fs.writeFileSync(evidencePath, `${JSON.stringify(preparation, null, 2)}\n`, { mode: 0o600 });
  return { evidencePath, preparation };
}

function isMainModule() {
  return process.argv[1]
    ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
    : false;
}

if (isMainModule()) {
  try {
    const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const { evidencePath } = writeEnvironmentPreparation({ rootDir });
    console.log(`HOSTED ENVIRONMENT PREPARATION WRITTEN — ${evidencePath}`);
  } catch (error) {
    console.error(`HOSTED ENVIRONMENT PREPARATION FAILED — ${error.message}`);
    process.exitCode = 1;
  }
}
