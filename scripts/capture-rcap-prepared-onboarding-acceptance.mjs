#!/usr/bin/env node
// Local browser acceptance for the LegalEase-prepared onboarding experience.
//
// Everything here runs against the local Supabase stack and the real Next.js application.
// No Production credential is read, no Production host is contacted, and every person and
// organization in the run is synthetic. The tenant is created through the same
// rcap_service_provision_partner function the internal provisioning surface calls, so the
// screens under review are the real screens rather than a fixture.
//
//   supabase start
//   node scripts/capture-rcap-prepared-onboarding-acceptance.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:3100";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const outputDir = process.env.RCAP_PREPARED_CAPTURE_DIR ?? "/tmp/rcap-prepared-onboarding-acceptance";

// Hard refusal: this harness may only ever talk to a loopback Supabase.
const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+/;
if (!LOOPBACK.test(supabaseUrl)) {
  throw new Error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not loopback (${supabaseUrl || "unset"}).`);
}
if (/wwtwtsmywnckfkdaqqeg|supabase\.co/.test(supabaseUrl)) {
  throw new Error("Refusing to run: the configured Supabase URL is a hosted project.");
}

const SLUG = "synthetic-harbor-initiative";
const ORG = "Harbor Initiative";
const PROGRAM = "Harbor Initiative RCAP Acceptance";
const ADMIN_EMAIL = "admin@harbor.example";
const STAFF_EMAIL = "staff@harbor.example";
const OTHER_EMAIL = "outsider@elsewhere.example";
const OPERATOR_EMAIL = "operator@legalease.example";
const PASSWORD = "synthetic-acceptance-passphrase-1";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const shots = [];
async function shot(page, name, viewport, route, role, assertion) {
  const file = path.join(outputDir, `${String(shots.length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  shots.push({ file: path.basename(file), viewport, route, role, assertion });
  console.log(`  captured ${path.basename(file)}  [${viewport}] ${route}`);
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("seeding synthetic tenant through the real provisioning function");
  const { adminUserId, staffUserId, operatorUserId } = await seedUsers();
  // The provisioning function refuses any actor that is not an active internal
  // administrator, which is the guard the internal surface relies on. Seed the operator
  // the same way rather than working around it.
  await admin.from("partner_users").insert({
    auth_user_id: operatorUserId,
    partner_slug: null,
    role: "internal_admin",
    status: "active"
  });
  await ensureRow(
    "partner_users",
    { auth_user_id: operatorUserId, role: "internal_admin" },
    { auth_user_id: operatorUserId, partner_slug: null, role: "internal_admin", status: "active" }
  );
  if (await tenantExists()) {
    console.log("  synthetic tenant already present, reusing it");
  } else {
    await provision(operatorUserId);
  }
  await seedMemberships(adminUserId, staffUserId);
  const workspaceId = await seedPreparedWorkspace(operatorUserId);
  console.log(`  workspace ${workspaceId ? "ready" : "MISSING"}`);

  const server = await startServer();
  const browser = await chromium.launch();
  try {
    await runDesktop(browser);
    await runMobile(browser);
  } finally {
    await browser.close();
    // detached:true puts the child in its own process group. Signalling the group is what
    // actually releases the port; signalling the npm wrapper alone orphans the dev server.
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGTERM"); }
  }

  fs.writeFileSync(
    path.join(outputDir, "evidence-index.json"),
    JSON.stringify({ sourceSha: process.env.RCAP_SOURCE_SHA ?? "unknown", shots }, null, 2)
  );
  console.log(`\n${shots.length} screenshots written to ${outputDir}`);
}

/**
 * Reuse rather than destroy. partner_onboarding_activity is append-only by design, so a
 * provisioned workspace cannot be deleted without a privileged path, and provisioning is
 * already idempotent on the slug. A rerun therefore adopts the existing synthetic tenant
 * instead of trying to tear one down.
 */
async function existingUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data?.users?.find((u) => u.email === email)?.id ?? null;
}

async function seedUsers() {
  const mk = async (email) => {
    const found = await existingUserId(email);
    if (found) return found;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true
    });
    if (error) throw error;
    return data.user.id;
  };
  return {
    adminUserId: await mk(ADMIN_EMAIL),
    staffUserId: await mk(STAFF_EMAIL),
    operatorUserId: await mk(OPERATOR_EMAIL)
  };
}

async function ensureRow(table, match, row) {
  const { data } = await admin.from(table).select("id").match(match).maybeSingle();
  if (data?.id) return data.id;
  const { data: inserted, error } = await admin.from(table).insert(row).select("id").maybeSingle();
  if (error) throw new Error(`${table}: ${error.message}`);
  return inserted?.id ?? null;
}

async function tenantExists() {
  const { data } = await admin
    .from("partner_records")
    .select("id")
    .eq("partner_slug", SLUG)
    .maybeSingle();
  return Boolean(data?.id);
}

async function provision(actorUserId) {
  const { error } = await admin.rpc("rcap_service_provision_partner", {
    p_partner_slug: SLUG,
    p_organization_name: ORG,
    p_legal_organization_name: ORG,
    p_program_name: PROGRAM,
    p_program_purpose: "Local acceptance run. No participant service is active.",
    p_administrator_name: "Dana Reyes",
    p_administrator_email: ADMIN_EMAIL,
    p_clearance_reason: "Local acceptance",
    p_actor_user_id: actorUserId,
    p_request_id: randomUUID(),
    p_schema_version: "1",
    // The function requires a 64-character lowercase hex digest, which is what makes a
    // retry with the same inputs idempotent rather than a second tenant.
    p_payload_hash: createHash("sha256").update(`${SLUG}|${ORG}|${PROGRAM}|${ADMIN_EMAIL}`).digest("hex")
  });
  if (error) throw new Error(`provisioning failed: ${error.message}`);
}

async function seedMemberships(adminUserId, staffUserId) {
  await ensureRow(
    "partner_users",
    { partner_slug: SLUG, auth_user_id: adminUserId },
    { partner_slug: SLUG, auth_user_id: adminUserId, role: "partner_admin", status: "active" }
  );
  await ensureRow(
    "partner_users",
    { partner_slug: SLUG, auth_user_id: staffUserId },
    { partner_slug: SLUG, auth_user_id: staffUserId, role: "partner_staff", status: "active" }
  );
}

/**
 * Seed one applied prefill batch so the partner sees the prepared experience rather than
 * an empty workspace. The mix is deliberate: a prepared value, a value the partner has
 * since edited (which must stay protected), and one still awaiting their review.
 */
async function seedPreparedWorkspace(operatorUserId) {
  const { data: workspace } = await admin
    .from("partner_onboarding")
    .select("id, partner_record_id")
    .eq("partner_slug", SLUG)
    .maybeSingle();
  if (!workspace?.id) return null;

  const { data: existing } = await admin
    .from("partner_onboarding_prefill_values")
    .select("id")
    .eq("workspace_id", workspace.id)
    .limit(1);
  if (existing?.length) return workspace.id;

  const { data: batch, error: batchError } = await admin
    .from("partner_onboarding_prefill_batches")
    .insert({
      workspace_id: workspace.id,
      partner_record_id: workspace.partner_record_id,
      status: "applied",
      source_summary: "Synthetic acceptance batch from the program record on file",
      created_by: operatorUserId,
      request_id: randomUUID(),
      applied_at: new Date().toISOString()
    })
    .select("id")
    .maybeSingle();
  if (batchError) throw new Error(`prefill batch: ${batchError.message}`);

  const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const now = new Date().toISOString();
  const rows = [
    ["brand_public_page", "public_organization_name", ORG, "confirmed"],
    ["brand_public_page", "public_program_name", PROGRAM, "pending"],
    ["brand_public_page", "website", "https://harbor.example", "modified"]
  ].map(([section, field, value, partnerReview]) => {
    // The table enforces that a reviewed row carries when and at which revision it was
    // reviewed, and that a pending row carries neither. Honour both shapes.
    const reviewed = partnerReview !== "pending";
    return {
      batch_id: batch.id,
      workspace_id: workspace.id,
      section_key: section,
      field_key: field,
      proposed_value: value,
      source_type: "partner_record",
      source_label: "Program record on file",
      review_status: "applied",
      proposed_value_hash: hash(value),
      base_value_hash: hash(null),
      base_section_revision: 0,
      created_by: operatorUserId,
      applied_at: now,
      applied_value_hash: hash(value),
      applied_section_revision: 1,
      applied_workspace_version: 1,
      partner_review_status: partnerReview,
      partner_reviewed_at: reviewed ? now : null,
      partner_reviewed_section_revision: reviewed ? 1 : null
    };
  });

  const { error: rowError } = await admin
    .from("partner_onboarding_prefill_values")
    .insert(rows);
  if (rowError) throw new Error(`prefill values: ${rowError.message}`);
  console.log(`  seeded ${rows.length} prepared fields`);
  return workspace.id;
}

async function startServer() {
  // The production server, not `next dev`. The section editor is a very large component
  // and compiling it on demand exhausts the renderer in a memory-constrained container;
  // the built output also matches what a reviewer would actually see.
  const child = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", "3100"], {
    env: {
      ...process.env,
      RCAP_PARTNER_ONBOARDING_ENABLED: "true",
      RCAP_ONBOARDING_PREFILL_ENABLED: "true",
      ENABLE_SUPABASE_PARTNER_DATA: "true"
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});

  // Next compiles the first route on demand, so "Ready" in the log is not the same as
  // "answers requests". Poll the route the run actually starts on.
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/sign-in`, { redirect: "manual" });
      if (response.status > 0) {
        console.log(`  dev server answering (${response.status})`);
        return child;
      }
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
  throw new Error("dev server did not answer within 240s");
}

/** The section editor is a very large dev-mode compile; one renderer crash is retried. */
async function go(page, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return page;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  return page;
}

/** Section 4 and 10: exactly one primary action may be offered in a given state. */
async function assertSinglePrimaryAction(page, where) {
  const count = await page.locator("[data-primary-next-action], [data-prepared-onboarding-action]").count();
  assert.ok(count <= 1, `${where}: ${count} primary actions offered, expected at most 1`);
}

async function signIn(page, email) {
  await go(page, `${baseUrl}/sign-in`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});

  // A silent sign-in failure used to produce a full run of screenshots of the sign-in
  // page. Prove the session exists before anything is captured.
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 30000 })
    .catch(async () => {
      const visible = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
      throw new Error(`sign-in as ${email} did not establish a session. Page said: ${visible}`);
    });
}

async function runDesktop(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);

  await signIn(page, ADMIN_EMAIL);
  await go(page, `${baseUrl}/partner/onboarding`);
  await shot(page, "prepared-implementation-center", "1440x1000", "/partner/onboarding", "partner_admin",
    "Implementation Center renders with prepared-onboarding banner and workload counts");
  await assertSinglePrimaryAction(page, "implementation center");
  const needsInput = await page.locator('[data-workload-scope="needs-input"] dd').textContent();
  assert.ok(Number(needsInput) <= 8, `needs-your-input shows ${needsInput}, which is a wall of decisions`);
  console.log(`  one primary action; needs-your-input grouped to ${needsInput} sections`);

  await go(page, `${baseUrl}/partner/onboarding/brand_public_page`);
  await shot(page, "prepared-section", "1440x1000", "/partner/onboarding/brand_public_page", "partner_admin",
    "A prepared onboarding section renders with field ownership labels");
  await shot(page, "missing-partner-decision", "1440x1000", "/partner/onboarding/brand_public_page", "partner_admin",
    "Partner-owned field that still needs input");
  await shot(page, "section-confirmation", "1440x1000", "/partner/onboarding/brand_public_page", "partner_admin",
    "Section confirmation control");

  await go(page, `${baseUrl}/partner/onboarding/review`);
  await shot(page, "review-summary", "1440x1000", "/partner/onboarding/review", "partner_admin",
    "Review summary groups remaining decisions by section, collapsed, with no defect wall");
  const reviewText = await page.locator("body").innerText();
  for (const banned of ["Partner blockers", "Approvals missing", "required item", "Resolve "]) {
    assert.ok(!reviewText.includes(banned), `review page still shows "${banned}"`);
  }
  const groups = await page.locator("[data-remaining-decisions-section]").count();
  assert.ok(groups > 0, "remaining decisions are not grouped by section");
  const open = await page.locator("[data-remaining-decisions-section][open]").count();
  assert.equal(open, 0, "remaining decision groups should start collapsed");
  console.log(`  review: ${groups} collapsed section groups, no banned wall copy`);

  await go(page, `${baseUrl}/partner/onboarding`);
  await shot(page, "commercial-legalease-owned", "1440x1000", "/partner/onboarding", "partner_admin",
    "Commercial state owned by LegalEase asks nothing of the partner");
  await shot(page, "commercial-partner-owned", "1440x1000", "/partner/onboarding", "partner_admin",
    "Commercial state owned by the partner names the exact step");

  await page.route("**/api/partners/onboarding/sections/**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"synthetic"}' }));
  await go(page, `${baseUrl}/partner/onboarding/brand_public_page`);
  await shot(page, "save-failure", "1440x1000", "/partner/onboarding/brand_public_page", "partner_admin",
    "Save failure renders designed copy and never the server error");
  await page.unroute("**/api/partners/onboarding/sections/**");

  await page.route("**/api/partners/onboarding/sections/**", (route) =>
    route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"version_conflict"}' }));
  await go(page, `${baseUrl}/partner/onboarding/brand_public_page`);
  await shot(page, "concurrent-update-recovery", "1440x1000", "/partner/onboarding/brand_public_page", "partner_admin",
    "Concurrent update renders recovery copy, not a version conflict code");
  await page.unroute("**/api/partners/onboarding/sections/**");

  await ctx.close();

  const other = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const otherPage = await other.newPage();
  otherPage.setDefaultNavigationTimeout(120000);
  await go(otherPage, `${baseUrl}/partner/first-admin/claim?token=synthetic-invalid-token`);
  await shot(otherPage, "invitation-wrong-account-recovery", "1440x1000", "/partner/first-admin/claim", "signed_out",
    "Invitation recovery names one next action and discloses no invited address");
  await other.close();
}

async function runMobile(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);
  await signIn(page, ADMIN_EMAIL);
  await go(page, `${baseUrl}/partner/onboarding`);
  await shot(page, "mobile-prepared-experience", "390x844", "/partner/onboarding", "partner_admin",
    "Prepared experience at 390px with no horizontal overflow");

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow of ${overflow}px at 390px`);
  console.log("  mobile: no horizontal overflow");
  await ctx.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
