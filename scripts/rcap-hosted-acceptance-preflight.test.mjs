#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(rootDir, "scripts/rcap-hosted-acceptance-preflight.mjs"), "utf8");
const hostedWorkflow = fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
const dispatcherWorkflow = fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");

test("full preflight proves Preview isolation without reading Production values", () => {
  assert.match(source, /"production_environment_shape_snapshotted_without_values"/);
  assert.match(source, /"preview_binding_is_per_deployment_only"/);
  assert.doesNotMatch(source, /acceptance_ref_disjoint_from_vercel_production/);
  assert.doesNotMatch(source, /acceptance_ref_absent_from_every_production_value/);
  assert.match(source, /requestedDecryption: false/);
  assert.match(source, /storedValuesRead: false/);
  assert.match(source, /productionValueDisjointness: "unproven_not_read"/);
  assert.doesNotMatch(source, /credentialled, reachable and demonstrably not production/);
});

test("Preview isolation proof inspects the actual deploy argument contract", () => {
  assert.match(source, /rcap-hosted-acceptance-deploy\.mjs/);
  assert.match(source, /const deployArgsLine = deploySource\.match/);
  assert.match(source, /args\.push\("--env"/);
  assert.match(source, /neverWroteProjectLevelEnv: true/);
  assert.match(source, /!deployArgsLine\.includes\('"--prod"'\)/);
  assert.match(source, /!deployArgsLine\.includes\('"alias"'\)/);
});

test("Supabase-only preflight neither requires nor accesses Vercel", () => {
  assert.match(source, /if \(SCOPE === "full"\) requiredCredentials\.push\(\["VERCEL_TOKEN", VERCEL_TOKEN\]\)/);
  assert.match(source, /if \(SCOPE === "full"\) \{\s*try \{\s*VERCEL_IDENTITY = await resolveHostedVercelIdentity/);
  assert.match(source, /if \(SCOPE === "full"\) \{\s*const listing = await vercelApi/);
  assert.match(source, /if \(SCOPE === "full"\) \{[\s\S]{0,500}const env = await vercelApi/);
  assert.match(hostedWorkflow, /VERCEL_TOKEN:\s*\n\s*required: false/);
  assert.match(dispatcherWorkflow, /VERCEL_TOKEN: \$\{\{ inputs\.mode == 'hosted_migrate' && 'not-used-in-supabase-only' \|\| secrets\.VERCEL_TOKEN \}\}/);
  const supabaseStep = hostedWorkflow.match(/- name: Prove acceptance Supabase credentials and project[\s\S]*?run: node scripts\/rcap-hosted-acceptance-preflight\.mjs/)?.[0] ?? "";
  const fullStep = hostedWorkflow.match(/- name: Prove credentials and Preview-only deployment boundary[\s\S]*?run: node scripts\/rcap-hosted-acceptance-preflight\.mjs/)?.[0] ?? "";
  assert.doesNotMatch(supabaseStep, /VERCEL_TOKEN/);
  assert.match(supabaseStep, /PREFLIGHT_SCOPE: supabase_only/);
  assert.match(fullStep, /VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
  assert.match(fullStep, /PREFLIGHT_SCOPE: full/);
});
