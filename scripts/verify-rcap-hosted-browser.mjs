#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const script = fs.readFileSync(path.join(root, "scripts/rcap-hosted-colorado-clinic-browser.mjs"), "utf8");
const entry = fs.readFileSync(path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
const hosted = fs.readFileSync(path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");

let checks = 0;
const failures = [];
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
const includesEvery = (source, needles, label) => check(
  needles.every((needle) => source.includes(needle)),
  `${label} is missing: ${needles.filter((needle) => !source.includes(needle)).join(", ")}`
);

includesEvery(entry, ["hosted_browser", "inputs.mode == 'hosted_browser' && 'browser'"], "dispatch entry");
includesEvery(hosted, [
  "browser)         DEPLOY=false; MATRIX=false; GATE=false; RETARGET=false; BROWSER=true",
  "browser requires one exact Vercel deployment id",
  "steps.contract.outputs.browser == 'true'",
  "node scripts/verify-rcap-hosted-browser.mjs",
  "node scripts/rcap-hosted-colorado-clinic-browser.mjs",
  "HOSTED_PREVIEW_DEPLOYMENT_ID: ${{ steps.resolve_preview.outputs.deployment_id }}",
  "HOSTED_PREVIEW_HOSTNAME: ${{ steps.resolve_preview.outputs.hostname }}",
  "Colorado and Clinic browser matrix"
], "isolated browser workflow");
check(!/inputs\.phase == 'browser'[\s\S]{0,500}rcap-hosted-acceptance-migrate/.test(hosted), "browser phase can reach a migration step");
check((entry.match(/inputs\.mode == 'hosted_browser' && 'browser'/g) ?? []).length === 1, "hosted_browser does not map exactly once to its isolated browser phase");

includesEvery(script, [
  "expectedHostedReturnOrigin",
  "rcapApplicationSha",
  "rcapAcceptanceProjectRef",
  "rcapRouteState",
  "rcapReturnOrigin",
  "aliasDeploymentId === DEPLOYMENT_ID",
  "productionAliases.length === 0"
], "exact Preview identity proof");
check(!script.includes("vercel@latest") && !script.includes("vercel deploy") && !script.includes('"--prod"'), "browser harness can deploy or target Production");

includesEvery(script, [
  'context.route(`${PREVIEW}/**`',
  '"x-vercel-protection-bypass": BYPASS',
  "in-memory header scoped to exact Preview origin"
], "in-memory exact-origin bypass transport");
check(!script.includes('searchParams.set("x-vercel-protection-bypass"') && !/x-vercel-protection-bypass=/.test(script), "browser harness places the bypass in a URL");
check(!/addCookies\([\s\S]{0,300}x-vercel-protection-bypass/.test(script), "browser harness places the bypass in a cookie");

includesEvery(script, [
  "rcap_acceptance_migration_ledger",
  "phase between 49 and 55",
  "clinic_events",
  "clinic_event_staff",
  "clinic_assisted_sessions",
  "clinic_cases",
  "clinic_follow_ups",
  "clinic_event_audit",
  "clinic_end_assisted_session",
  "clinic_upsert_event_follow_up",
  "clinic_get_follow_ups",
  "required Clinic tables/functions=${schemaFlags.filter(Boolean).length}/9"
], "fail-closed Clinic schema readback");
check(!/spawnSync\([^\n]*migrat|exec[^\n]*migrat|supabase\s+db\s+(?:push|reset)/i.test(script), "browser harness contains a migration command");

includesEvery(script, [
  'eventName: "Expunge Colorado Clinic"',
  "deterministic_synthetic_clinic_fixture_ready",
  "on conflict (id) do update",
  "hosted-browser-participant-a@rcap-acceptance.test",
  "hosted-browser-clinic-staff@rcap-acceptance.test",
  "hosted-browser-negative-control@rcap-acceptance.test"
], "deterministic synthetic fixture contract");
check(!/delete\s+from\s+public\./i.test(script), "browser fixture deletes persistent rows");

includesEvery(script, [
  "verify-rcap-colorado-juvenile-packet-boundary.mjs",
  "Colorado juvenile packet boundary (53/53)",
  "adjacent JDF 417 and JDF 612 controls unchanged",
  'result_code === "guidance_only"',
  "payment_allowed === false",
  "checkout_session_id === null",
  "Number(noPayment.jobs) === 0",
  "Number(noPayment.credits) === 0",
  "Number(noPayment.artifact_refs) === 0"
], "Colorado juvenile no-payment boundary proof");
check(!script.includes("/api/expungement-ai/checkout"), "browser harness can create Checkout");

includesEvery(script, [
  "desktop-clinic-entry",
  "desktop-colorado-juvenile-guidance",
  "desktop-clinic-participant-session",
  "desktop-clinic-follow-up",
  "mobile-clinic-entry",
  "mobile-colorado-juvenile-guidance",
  "mobile-clinic-participant-session",
  "mobile-clinic-follow-up",
  "mobile-after-reset"
], "desktop/mobile inspectable screenshots");
includesEvery(script, [
  "clinic_follow_up_update_is_idempotent",
  "updateOne.status() === 200",
  "updateTwo.status() === 200",
  "Number(followReadback.count) === 1",
  "negative_control_cannot_read_participant_matter_or_follow_up",
  "End clinic session / Reset device",
  "end_session_reset_device_and_back_navigation_leave_no_participant_state",
  "remainingCookies.length === 0",
  'resetRow.status === "reset"'
], "Clinic follow-up, isolation, and reset proof");

includesEvery(script, [
  'chromium.launch({ channel: "chrome", headless: true })',
  'viewport: { width: 1440, height: 1000 }',
  'viewport: { width: 390, height: 844 }',
  "sanitize(error",
  "hosted-browser.json",
  "fixtureRetainedForReview = true"
], "redacted browser evidence contract");

if (failures.length > 0) {
  console.error(`FAIL verify-rcap-hosted-browser — ${failures.length}/${checks} failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OK verify-rcap-hosted-browser — ${checks}/${checks}; isolated exact-Preview desktop/mobile Colorado + Clinic contract`);
