#!/usr/bin/env node
// Static guard for the one-shot, read-only Vercel failure audit.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const audit = read("scripts/rcap-vercel-failure-audit.mjs");
const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const hosted = read(".github/workflows/rcap-hosted-acceptance-staging.yml");

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check("authorized application SHA is pinned", audit.includes('const EXPECTED_APPLICATION_SHA = "264d2a240e5c857f55ee645f2683830e94f67c19"'));
check("acceptance project ref is pinned", audit.includes('const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"'));
check("Stripe-built metadata is exact", audit.includes('const EXPECTED_STRIPE_CONFIGURED = "true"'));
check("staging route metadata is exact", audit.includes('const EXPECTED_ROUTE_STATE = "staging_scoped"'));
check("READY state is required", audit.includes('deploymentState(deployment) === "READY"'));
check("only Preview-shaped targets are admitted", audit.includes('target === null || target === undefined || target === "preview"'));
check("application metadata is compared", audit.includes("deployment?.meta?.rcapApplicationSha === APPLICATION_SHA"));
check("acceptance-ref metadata is compared", audit.includes("deployment?.meta?.rcapAcceptanceProjectRef === PROJECT_REF"));
check("Stripe metadata is compared", audit.includes("deployment?.meta?.rcapStripeConfigured === EXPECTED_STRIPE_CONFIGURED"));
check("route-state metadata is compared", audit.includes("deployment?.meta?.rcapRouteState === EXPECTED_ROUTE_STATE"));

check("project identity is resolved read-only", audit.includes("/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}"));
check("production environment shape is read", audit.includes("/v9/projects/${encodeURIComponent(canonicalProjectId)}/env"));
check("READY deployments are listed", audit.includes("/v6/deployments?${params}"));
check("each exact candidate is read by immutable id", audit.includes("/v13/deployments/${encodeURIComponent(id)}"));
check("candidate project id is revalidated", audit.includes("detailProjectId === canonicalProjectId"));
check("all list pages are consumed", audit.includes("response.json?.pagination?.next") && audit.includes("listComplete: true"));
check("all exact matches are retained", audit.includes("matchingReadyPreviews.push") && audit.includes("matchingReadyPreviews,"));
check("absence is an explicit successful outcome", audit.includes('"no_matching_ready_preview"'));

const fetchCalls = audit.match(/\bfetch\s*\(/g) ?? [];
const explicitGetMethods = audit.match(/method:\s*"GET"/g) ?? [];
check("the audit has one centralized fetch call", fetchCalls.length === 1);
check("the only fetch call explicitly uses GET", explicitGetMethods.length === fetchCalls.length);
check("no write HTTP method is present", !/method:\s*["'`](?:POST|PUT|PATCH|DELETE)["'`]/i.test(audit));
check("no process launcher is imported", !/node:child_process|\bspawn(?:Sync)?\s*\(|\bexec(?:File|Sync)?\s*\(/.test(audit));
check("no deploy CLI invocation is present", !/vercel@|--prod|\bvercel\s+deploy\b/.test(audit));
check("no Supabase management token is read", !audit.includes("SUPABASE_ACCESS_TOKEN"));
check("no Stripe credential is read", !/HOSTED_STRIPE_TEST_SECRET|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/.test(audit));
check("evidence declares GET-only operation", audit.includes('remoteMethodsUsed: ["GET"]'));

check("environment values are excluded from evidence", audit.includes("environmentValuesIncluded: false") && audit.includes("valuesIncluded: false"));
check("environment shape selects safe fields only", audit.includes("key: String(entry?.key") && audit.includes("targets: normalizedTargets") && audit.includes("type: String(entry?.type") && audit.includes("updatedAt: entry?.updatedAt"));
check("production aliases are filtered explicitly", audit.includes('String(entry.target ?? "").toUpperCase() === "PRODUCTION"'));
check("environment shape is fingerprinted", audit.includes('crypto.createHash("sha256").update(envShapeJson).digest("hex")'));

check("dispatcher exposes only an explicit audit mode", dispatcher.includes("hosted_vercel_audit"));
check("dispatcher maps audit mode to audit phase", dispatcher.includes("inputs.mode == 'hosted_vercel_audit' && 'vercel_audit'"));
check("hosted workflow verifies the audit", hosted.includes("node scripts/verify-rcap-vercel-failure-audit.mjs"));
check("hosted workflow runs the audit only in audit phase", hosted.includes("if: inputs.phase == 'vercel_audit'\n        env:") && hosted.includes("node scripts/rcap-vercel-failure-audit.mjs"));
check("Supabase preflight is skipped for the Vercel-only audit", hosted.includes("if: inputs.phase != 'vercel_audit'"));
check("audit phase is absent from migration condition", !hosted.includes("inputs.phase == 'vercel_audit' || inputs.phase == 'migrate'"));
check("audit phase is absent from deploy condition", !hosted.includes("inputs.phase == 'vercel_audit' || inputs.phase == 'deploy'"));
check("audit phase is absent from Auth condition", !hosted.includes("inputs.phase == 'vercel_audit' || inputs.phase == 'accept'"));
check("evidence uploads even when no Preview matches", hosted.includes("- name: Upload the hosted acceptance evidence") && hosted.includes("if: always()"));

console.log(`RCAP Vercel failure audit verifier passed: ${checks.length}/${checks.length}`);
