#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const entry = fs.readFileSync(".github/workflows/rcap-f1-ephemeral-staging.yml", "utf8");
const hosted = fs.readFileSync(".github/workflows/rcap-hosted-acceptance-staging.yml", "utf8");
const clinicFollowUp = fs.readFileSync("src/lib/clinic-mode/result-follow-up.ts", "utf8");
const resolver = fs.readFileSync("scripts/rcap-hosted-resolve-preview.mjs", "utf8");
const browser = fs.readFileSync("scripts/verify-rcap-commercial-browser.mjs", "utf8");
const authConfig = fs.readFileSync("scripts/rcap-hosted-acceptance-auth-config.mjs", "utf8");
const clinicSeed = fs.readFileSync("scripts/rcap-hosted-ms-clinic-preview-seed.mjs", "utf8");

const checks = [];
function check(label, condition) {
  assert.equal(Boolean(condition), true, label);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}

check("dispatch exposes one dedicated Clinic Preview mode", entry.includes("hosted_clinic_preview"));
check("dispatch maps Clinic Preview to its dedicated reusable phase", /inputs\.mode == 'hosted_clinic_preview'\s*&&\s*'clinic_preview'/.test(entry));
check("reusable workflow documents the Clinic Preview phase", hosted.includes("clinic_preview"));
check("hosted run executes this Clinic Preview verifier", /id: verify_clinic_preview[\s\S]{0,220}verify-rcap-hosted-ms-clinic-preview\.mjs/.test(hosted));
check("Clinic Preview has its own execution-contract flag", /clinic_preview\)\s+DEPLOY=true;\s+MATRIX=false;\s+GATE=false;\s+RETARGET=false;\s+BROWSER=false;\s+CLINIC=true/.test(hosted));
check("all non-Clinic phases explicitly clear the Clinic flag", /CLINIC=false/.test(hosted));
check("Clinic Preview requires the identity-scoped route", /\[ "\$CLINIC" = "true" \][\s\S]{0,180}require_staging_scoped=true/.test(hosted));
check("Preview resolution runs for Clinic Preview", /outputs\.clinic == 'true'/.test(hosted));
check("Clinic deploy receives Mississippi mode", /HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic == 'true' && 'mississippi_preview' \|\| '' \}\}/.test(hosted));
check("Clinic deploy receives the private demo password", /HOSTED_CLINIC_DEMO_PASSWORD:\s*\$\{\{ secrets\.HOSTED_CLINIC_DEMO_PASSWORD \}\}/.test(hosted));
check("Clinic Auth runs and receives Mississippi mode", /if: steps\.contract\.outputs\.matrix == 'true' \|\| steps\.contract\.outputs\.clinic == 'true'[\s\S]{0,700}HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic == 'true' && 'mississippi_preview' \|\| '' \}\}/.test(hosted));
check("Clinic seed is a dedicated step", /id: clinic_seed[\s\S]{0,500}if: steps\.contract\.outputs\.clinic == 'true'[\s\S]{0,700}HOSTED_CLINIC_DEMO_ACCESS_CODE:\s*\$\{\{ secrets\.HOSTED_CLINIC_DEMO_ACCESS_CODE \}\}/.test(hosted));
check("Clinic journey is a dedicated step", /id: clinic_journey[\s\S]{0,500}if: steps\.contract\.outputs\.clinic == 'true'/.test(hosted));
check("Clinic deploy receives no Stripe secret", /HOSTED_STRIPE_TEST_SECRET:\s*\$\{\{ steps\.contract\.outputs\.clinic != 'true'/.test(hosted) && /HOSTED_STRIPE_TEST_WEBHOOK_SECRET:\s*\$\{\{ steps\.contract\.outputs\.clinic != 'true'/.test(hosted));
check("Clinic journey receives no Stripe secret", !/id: clinic_journey[\s\S]{0,1200}HOSTED_STRIPE/.test(hosted));
check("Clinic phase installs browser dependencies without scheduling the legacy matrix", /steps\.contract\.outputs\.clinic == 'true'/.test(hosted) && /id: gate_deps/.test(hosted));
check("anti-skip records Clinic seed and journey outcomes", /O_CLINIC_SEED:\s*\$\{\{ steps\.clinic_seed\.outcome \}\}/.test(hosted) && /O_CLINIC_JOURNEY:\s*\$\{\{ steps\.clinic_journey\.outcome \}\}/.test(hosted));
check("anti-skip requires every Clinic Preview boundary", /\[ "\$RUNS_CLINIC" = "true" \][\s\S]*require "Clinic synthetic seed"[\s\S]*require "Clinic screening-to-packet journey"/.test(hosted));
check("workflow declares private Clinic credentials", /HOSTED_CLINIC_DEMO_PASSWORD:[\s\S]{0,80}required: true/.test(hosted) && /HOSTED_CLINIC_DEMO_ACCESS_CODE:[\s\S]{0,80}required: true/.test(hosted));
check("dedicated Clinic seed script exists", fs.existsSync("scripts/rcap-hosted-ms-clinic-preview-seed.mjs"));
check("sponsored browser supports Clinic entry", browser.includes("RCAP_BROWSER_CLINIC_EVENT_SLUG"));
check("successful packet claims bind the saved matter to the Clinic case", clinicFollowUp.includes("clinicCaseTreatmentFor") && /packet_ready[\s\S]{0,180}routeDisposition:\s*"packet"/.test(clinicFollowUp));
check("worker equivalence excludes only the measured server-only Clinic binding repair", hosted.includes("':(exclude)src/lib/clinic-mode/result-follow-up.ts'") && !fs.readFileSync("scripts/rcap-render-worker.mjs", "utf8").includes("result-follow-up"));
check("Preview resolver requires exact Clinic mode, scope, and no-Stripe metadata", resolver.includes("EXPECTED_CLINIC_DEMO_MODE") && resolver.includes("EXPECTED_STRIPE_CONFIGURED") && resolver.includes("EXPECTED_CLINIC_SCOPE_SHA256"));
check("Clinic resolver receives its exact mode", /id: resolve_preview[\s\S]{0,1800}HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic/.test(hosted));
check("browser verifies the exact Vercel Preview identity", browser.includes("RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID") && browser.includes("verifyExactHostedPreview"));
check("approved event staff use the event-scoped queue", browser.includes("/clinic/staff/${clinicEventId}/queue") && !browser.includes("/partner/clinic/${clinicEventId}/follow-up"));
check("staff proof asserts the created packet-ready case", browser.includes("participantSuffix") && browser.includes("Packet prepared"));
check("Auth and seed verify the SHA alias resolves to the exact deployment", authConfig.includes("aliasDeploymentId") && clinicSeed.includes("aliasDeploymentId"));
check("reset proof checks all browser storage and navigation boundaries", ["localStorage", "sessionStorage", "indexedDB", "caches.keys", "serviceWorker.getRegistrations", "goBack", "goForward"].every((marker) => browser.includes(marker)) && !/goBack\([^)]*\)[^;]*\.catch\(\(\) => null\)/.test(browser));
check("reset proof performs Participant B handoff in the same browser context", browser.includes("sameDeviceParticipantBDenial"));
check("browser evidence records the screening session and server generation response", browser.includes("screeningSessionId") && browser.includes("generationResponseBody"));
check("post-journey audit binds server-side Clinic, artifact, credit, and reset evidence", fs.existsSync("scripts/rcap-hosted-ms-clinic-preview-audit.mjs") && /id: clinic_audit[\s\S]{0,700}rcap-hosted-ms-clinic-preview-audit\.mjs/.test(hosted));
check("anti-skip requires the post-journey server audit", /O_CLINIC_AUDIT:\s*\$\{\{ steps\.clinic_audit\.outcome \}\}/.test(hosted) && /require "Clinic server-side audit" "\$O_CLINIC_AUDIT"/.test(hosted));

console.log(`Hosted Mississippi Clinic Preview workflow: PASS — ${checks.length}/${checks.length} contract checks.`);
