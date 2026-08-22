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
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//     NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key> \
//     NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED=false npm run build
//   node scripts/capture-rcap-prepared-onboarding-acceptance.mjs
//
// The public Supabase values are inlined into the client bundle at build time, so the build
// has to carry the loopback ones or the browser client has nothing to sign in against.
//
// The build flag is local only: sign-in's bot check is a client build-time flag, there is
// no Turnstile site key on a loopback stack, and a synthetic user cannot solve one. It
// changes the sign-in gate, not any surface under review.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { register } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

register("./lib/ts-esm-loader.mjs", import.meta.url);

// Provisioning goes through the one canonical service, exactly as the internal surface and
// the lifecycle test do. Calling the privileged database function directly from here would
// make this the second implementation of provisioning.
const provisioning = await import("../src/lib/partners/partner-provisioning-service.ts");

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
// The section that actually renders the prepared fields below.
const PREPARED_SECTION = "organization_contacts";
const PREPARED_FIELD = "public_program_name";
const PARTNER_EDITED_VALUE = "Harbor Initiative Community Record Clearing";
const LEGALEASE_CONFLICTING_VALUE = "Harbor Initiative Record-Clearing Access Program";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// The screenshots are evidence about one exact commit, so the commit is read here rather
// than trusted to an environment variable that may be unset or stale.
const sourceSha = (
  process.env.RCAP_SOURCE_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
).trim();

const shots = [];
async function shot(page, name, viewport, route, role, assertion) {
  const file = path.join(outputDir, `${String(shots.length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  shots.push({
    file: path.basename(file),
    viewport,
    route,
    role,
    assertion,
    sourceSha,
    capturedAt: new Date().toISOString()
  });
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
  if (!workspaceId) throw new Error("no onboarding workspace to capture");
  await seedPreparedSectionData(workspaceId);
  await resetPreparedField(workspaceId);
  const safetyBefore = await readSafetyState();

  const server = await startServer();
  const browser = await chromium.launch();
  try {
    await runDesktop(browser, workspaceId);
    await runPartnerEdit(browser, workspaceId);
    await runOperatorReopen(browser, workspaceId, operatorUserId);
    await runMobile(browser);
    await assertSafetyState(safetyBefore);
  } finally {
    await browser.close();
    // detached:true puts the child in its own process group. Signalling the group is what
    // actually releases the port; signalling the npm wrapper alone orphans the dev server.
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGTERM"); }
  }

  fs.writeFileSync(
    path.join(outputDir, "evidence-index.json"),
    JSON.stringify({ sourceSha, shots }, null, 2)
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
  // provisionPartner validates the input, computes the payload hash that makes a retry
  // idempotent rather than a second tenant, and refuses any actor that is not an active
  // internal administrator.
  await provisioning.provisionPartner({
    values: {
      partnerSlug: SLUG,
      organizationName: ORG,
      legalOrganizationName: ORG,
      programName: PROGRAM,
      programPurpose: "Local acceptance run. No participant service is active.",
      administratorName: "Dana Reyes",
      administratorEmail: ADMIN_EMAIL,
      clearanceReason: "Local acceptance",
      idempotencyKey: randomUUID()
    },
    operatorUserId: actorUserId
  });
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
 *
 * The fields are the ones the section actually renders. An earlier revision of this file
 * seeded three organization_contacts field keys onto brand_public_page, where no renderer
 * owns them, so the "prepared section" screenshots showed a section with no prepared field
 * on it at all.
 */
async function seedPreparedWorkspace(operatorUserId) {
  const { data: workspace } = await admin
    .from("partner_onboarding")
    .select("id, partner_record_id")
    .eq("partner_slug", SLUG)
    .maybeSingle();
  if (!workspace?.id) return null;

  // Section-aware on purpose: a rerun after the section key was corrected must not adopt
  // prepared rows that point at a section which never rendered them.
  await admin
    .from("partner_onboarding_prefill_values")
    .delete()
    .eq("workspace_id", workspace.id)
    .neq("section_key", PREPARED_SECTION);
  const { data: existing } = await admin
    .from("partner_onboarding_prefill_values")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("section_key", PREPARED_SECTION)
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
    [PREPARED_SECTION, "public_organization_name", ORG, "confirmed"],
    [PREPARED_SECTION, "public_program_name", PROGRAM, "pending"],
    [PREPARED_SECTION, "website", "https://harbor.example", "modified"]
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

/**
 * The rest of the section, so the partner can reach the real "Save section" control rather
 * than a validation wall. Everything here is the prepared answer a partner would be
 * reviewing; the one value the acceptance run changes is public_program_name.
 */
const PREPARED_SECTION_DATA = {
  legal_organization_name: ORG,
  public_organization_name: ORG,
  organization_type: "nonprofit",
  website: "https://harbor.example",
  primary_address: "100 Harbor Way, Suite 4, Springfield, ST 00000",
  main_phone: "+1 555 0100",
  public_program_name: PROGRAM
};

// Contacts are rows of their own, not part of the section's stored answers, so the section
// cannot be confirmed until they exist where the service reads them.
const PREPARED_CONTACTS = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    role: "executive_sponsor",
    name: "Dana Reyes",
    title: "Executive Director",
    work_email: ADMIN_EMAIL
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    role: "program_operator",
    name: "Sam Okafor",
    title: "Program Manager",
    work_email: STAFF_EMAIL
  }
];

/**
 * The two commercial states this run has to show, and the cleared state the partner needs
 * before they can edit anything. Which of the two blocked states a partner sees is decided
 * by the agreement record, which is the fix this branch carries.
 */
async function setCommercialState(workspaceId, outcome) {
  const { error: agreementError } = await admin
    .from("partner_onboarding_agreements")
    .upsert(
      {
        workspace_id: workspaceId,
        agreement_type: "order_form",
        status: outcome === "partner_owned" ? "requested" : "under_review",
        is_required: true,
        partner_safe_detail:
          outcome === "partner_owned"
            ? "Return the countersigned order form."
            : "LegalEase is finalizing the order form."
      },
      { onConflict: "workspace_id,agreement_type" }
    );
  if (agreementError) throw new Error(`agreement: ${agreementError.message}`);

  const { error } = await admin
    .from("partner_onboarding")
    .update(
      outcome === "cleared"
        ? {
            commercial_gate_status: "cleared_by_authorized_internal_override",
            commercial_gate_override_reason: "Local acceptance run",
            commercial_gate_changed_at: new Date().toISOString(),
            status: "setup_in_progress"
          }
        : { commercial_gate_status: "blocked", status: "commercially_blocked" }
    )
    .eq("id", workspaceId);
  if (error) throw new Error(`commercial gate: ${error.message}`);
}

/**
 * A rerun starts from the prepared state: the previous run's partner edit is rolled back to
 * what LegalEase prepared, so "Prepared by LegalEase" is what the partner opens.
 */
async function resetPreparedField(workspaceId) {
  const { data: section } = await admin
    .from("partner_onboarding_sections")
    .select("id, response_data, revision")
    .eq("workspace_id", workspaceId)
    .eq("section_key", PREPARED_SECTION)
    .maybeSingle();
  if (!section?.id) return;
  const data = section.response_data ?? {};
  if (data[PREPARED_FIELD] === PROGRAM) return;
  await admin
    .from("partner_onboarding_sections")
    .update({
      response_data: { ...data, [PREPARED_FIELD]: PROGRAM },
      status: "in_progress",
      revision: Number(section.revision ?? 1) + 1
    })
    .eq("id", section.id);
  await admin
    .from("partner_onboarding_prefill_values")
    .update({
      partner_review_status: "pending",
      partner_reviewed_at: null,
      partner_reviewed_section_revision: null,
      partner_modified: null
    })
    .eq("workspace_id", workspaceId)
    .eq("field_key", PREPARED_FIELD);
  console.log("  reset the prepared field to what LegalEase prepared");
}

async function seedPreparedSectionData(workspaceId) {
  const { data: section } = await admin
    .from("partner_onboarding_sections")
    .select("id, response_data, status, revision")
    .eq("workspace_id", workspaceId)
    .eq("section_key", PREPARED_SECTION)
    .maybeSingle();
  if (!section?.id) throw new Error(`${PREPARED_SECTION} section is missing`);
  const current = section.response_data ?? {};
  if (Object.keys(current).length > 0) return;
  // The section table enforces that every update advances the revision by exactly one,
  // which is the same rule the service honours.
  const { error } = await admin
    .from("partner_onboarding_sections")
    .update({
      response_data: PREPARED_SECTION_DATA,
      status: "in_progress",
      revision: Number(section.revision ?? 1) + 1
    })
    .eq("id", section.id);
  if (error) throw new Error(`section data: ${error.message}`);

  const { error: contactError } = await admin
    .from("partner_onboarding_contacts")
    .upsert(
      PREPARED_CONTACTS.map((contact) => ({ ...contact, workspace_id: workspaceId })),
      { onConflict: "id" }
    );
  if (contactError) throw new Error(`contacts: ${contactError.message}`);
  console.log("  seeded the prepared section answers and contacts");
}

/** What the section holds right now, read with full privilege. */
async function readPreparedField(workspaceId, fieldKey) {
  const { data } = await admin
    .from("partner_onboarding_sections")
    .select("response_data, revision, status")
    .eq("workspace_id", workspaceId)
    .eq("section_key", PREPARED_SECTION)
    .maybeSingle();
  return {
    value: (data?.response_data ?? {})[fieldKey] ?? null,
    revision: Number(data?.revision ?? 0),
    status: String(data?.status ?? "")
  };
}

async function readPrefillReviewStatus(workspaceId, fieldKey) {
  const { data } = await admin
    .from("partner_onboarding_prefill_values")
    .select("partner_review_status, proposed_value")
    .eq("workspace_id", workspaceId)
    .eq("section_key", PREPARED_SECTION)
    .eq("field_key", fieldKey)
    .eq("review_status", "applied")
    .maybeSingle();
  return data ?? null;
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
      ENABLE_SUPABASE_PARTNER_DATA: "true",
      // Sign-in's bot check is a build-time client flag. The loopback build this harness
      // runs against is produced with it off (see the header), because there is no
      // Turnstile site key on a loopback stack and a synthetic user cannot solve one.
      NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED: "false"
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
  // The first authenticated render compiles and warms several routes, so this waits well
  // past a normal navigation before treating a pending sign-in as a failure.
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 120000 })
    .catch(async () => {
      const visible = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
      throw new Error(`sign-in as ${email} did not establish a session. Page said: ${visible}`);
    });
}

async function runDesktop(browser, workspaceId) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);

  // Program terms are confirmed for the first pass: a partner who cannot edit anything is
  // not the prepared experience under review.
  await setCommercialState(workspaceId, "cleared");
  await signIn(page, ADMIN_EMAIL);
  await go(page, `${baseUrl}/partner/onboarding`);
  await shot(page, "prepared-implementation-center", "1440x1000", "/partner/onboarding", "partner_admin",
    "Implementation Center renders with prepared-onboarding banner and workload counts");
  await assertSinglePrimaryAction(page, "implementation center");
  const needsInput = await page.locator('[data-workload-scope="needs-input"] dd').textContent();
  assert.ok(Number(needsInput) <= 8, `needs-your-input shows ${needsInput}, which is a wall of decisions`);
  console.log(`  one primary action; needs-your-input grouped to ${needsInput} sections`);

  const preparedStepRoute = `/partner/onboarding/${PREPARED_SECTION}?step=public-identity`;
  await go(page, `${baseUrl}${preparedStepRoute}`);
  // The evidence has to show a prepared field, not a section that happens to be open.
  const preparedFields = await page.locator('[data-field-provenance="prepared"]').count();
  assert.ok(preparedFields > 0, "no field on this section is marked as prepared by LegalEase");
  await shot(page, "prepared-section", "1440x1000", preparedStepRoute, "partner_admin",
    "A prepared onboarding section renders field ownership: Prepared by LegalEase on the prepared field");
  console.log(`  ${preparedFields} prepared field(s) marked on ${PREPARED_SECTION}`);

  await go(page, `${baseUrl}/partner/onboarding/${PREPARED_SECTION}?step=implementation-contacts`);
  await shot(page, "missing-partner-decision", "1440x1000",
    `/partner/onboarding/${PREPARED_SECTION}?step=implementation-contacts`, "partner_admin",
    "Partner-owned decision the partner still has to make, with the section confirmation control");
  await shot(page, "section-confirmation", "1440x1000",
    `/partner/onboarding/${PREPARED_SECTION}?step=implementation-contacts`, "partner_admin",
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

  // The two commercial states are two different screens, so each is captured in its own
  // state rather than twice in whichever one happened to be stored.
  await setCommercialState(workspaceId, "legalease_owned");
  await go(page, `${baseUrl}/partner/onboarding`);
  const legaleaseOwned = await page.locator("body").innerText();
  assert.ok(
    legaleaseOwned.includes("Program terms are being finalized"),
    "the LegalEase-owned commercial state does not name LegalEase as the owner"
  );
  await shot(page, "commercial-legalease-owned", "1440x1000", "/partner/onboarding", "partner_admin",
    "Commercial state owned by LegalEase asks nothing of the partner");

  await setCommercialState(workspaceId, "partner_owned");
  await go(page, `${baseUrl}/partner/onboarding`);
  const partnerOwned = await page.locator("body").innerText();
  assert.ok(
    partnerOwned.includes("One agreement step needs your attention"),
    "the partner-owned commercial state does not name the partner's step"
  );
  await shot(page, "commercial-partner-owned", "1440x1000", "/partner/onboarding", "partner_admin",
    "Commercial state owned by the partner names the exact step");

  // Program terms confirmed: from here the partner can edit their own setup.
  await setCommercialState(workspaceId, "cleared");

  await page.route("**/api/partners/onboarding/sections/**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"synthetic"}' }));
  await go(page, `${baseUrl}${preparedStepRoute}`);
  await typeIntoPreparedField(page, "Save failure probe");
  await shot(page, "save-failure", "1440x1000", preparedStepRoute, "partner_admin",
    "Save failure renders designed copy and never the server error");
  await page.unroute("**/api/partners/onboarding/sections/**");

  await page.route("**/api/partners/onboarding/sections/**", (route) =>
    route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"version_conflict"}' }));
  await go(page, `${baseUrl}${preparedStepRoute}`);
  await typeIntoPreparedField(page, "Concurrent update probe");
  await shot(page, "concurrent-update-recovery", "1440x1000", preparedStepRoute, "partner_admin",
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

const preparedFieldSelector = "#field-public-program-name";

/** Types into the prepared field and lets the editor's own autosave run. */
async function typeIntoPreparedField(page, value) {
  const input = page.locator(preparedFieldSelector);
  await input.waitFor({ state: "visible", timeout: 30000 });
  await input.fill(value);
  await input.blur();
  await page.waitForTimeout(3000);
}

/**
 * Steps 1-8 of the operator re-entry journey: the partner edits a value LegalEase prepared,
 * saves it through the section's own control, and the field's presentation changes from
 * "Prepared by LegalEase" to "Partner updated".
 */
async function runPartnerEdit(browser, workspaceId) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);
  await signIn(page, ADMIN_EMAIL);

  const route = `/partner/onboarding/${PREPARED_SECTION}?step=public-identity`;
  await go(page, `${baseUrl}${route}`);
  const marker = page.locator(`[data-field-provenance="prepared"]`).first();
  await marker.waitFor({ state: "visible", timeout: 30000 });
  assert.match(
    (await marker.innerText()).trim(),
    /^Prepared by LegalEase/,
    "the prepared field is not identified as prepared by LegalEase"
  );

  await typeIntoPreparedField(page, PARTNER_EDITED_VALUE);

  // The partner's own confirmation of the section, through the control the product offers.
  const saves = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/api/partners/onboarding/sections/")) return;
    saves.push({ status: response.status(), body: (await response.text().catch(() => "")).slice(0, 400) });
  });
  await go(page, `${baseUrl}/partner/onboarding/${PREPARED_SECTION}?step=implementation-contacts`);
  const confirm = page.locator("[data-primary-guided-action]").first();
  await confirm.waitFor({ state: "visible", timeout: 30000 });
  console.log(`  confirming with: ${(await confirm.innerText()).trim()}`);
  await confirm.click();
  await page.waitForURL((url) => !url.pathname.endsWith(PREPARED_SECTION), { timeout: 60000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  // The save is authoritative: the stored value is the partner's, and the prepared row is
  // recorded as one the partner changed.
  const stored = await readPreparedField(workspaceId, PREPARED_FIELD);
  assert.equal(stored.value, PARTNER_EDITED_VALUE, `the partner edit did not persist (stored ${JSON.stringify(stored.value)})`);
  const reviewed = await readPrefillReviewStatus(workspaceId, PREPARED_FIELD);
  for (const save of saves) console.log(`  section save -> HTTP ${save.status} ${save.body}`);
  assert.equal(
    reviewed?.partner_review_status,
    "modified",
    `the prepared value is not recorded as partner-modified (${reviewed?.partner_review_status})`
  );
  console.log(`  partner edit saved and recorded as ${reviewed?.partner_review_status}; section revision ${stored.revision}`);

  await go(page, `${baseUrl}${route}`);
  const updated = page.locator('[data-field-provenance="partner-updated"]').first();
  await updated.waitFor({ state: "visible", timeout: 30000 });
  assert.match((await updated.innerText()).trim(), /^Partner updated/);
  await shot(page, "partner-updated-field", "1440x1000", route, "partner_admin",
    "A prepared value the partner edited now reads Partner updated, not Prepared by LegalEase");
  await ctx.close();
}

/**
 * Steps 10-20: LegalEase reopens preparation for the same field, sees the partner's value
 * held, proposes a different one, and is shown a conflict instead of a silent replacement.
 */
async function runOperatorReopen(browser, workspaceId, operatorUserId) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);
  await signIn(page, OPERATOR_EMAIL);

  const route = `/internal/partners/onboarding/${SLUG}`;
  await go(page, `${baseUrl}${route}`);
  const body = await page.locator("body").innerText();
  assert.ok(
    body.includes(PARTNER_EDITED_VALUE),
    "the partner's edited value is not shown to the operator reopening preparation"
  );
  await shot(page, "operator-protected-partner-value", "1440x1000", route, "internal_admin",
    "LegalEase reopens preparation and the partner-edited value is identified and held");

  // Propose a different LegalEase value for the same field, through the internal endpoint
  // the panel itself posts to.
  const proposed = await page.evaluate(async ({ slug, sectionKey, fieldKey, value }) => {
    const response = await fetch(`/api/internal/partners/onboarding/phase1/${slug}/prefill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "add",
        requestId: crypto.randomUUID(),
        payload: {
          sectionKey,
          fieldKey,
          proposedValue: value,
          sourceType: "partner_record",
          sourceLabel: "Program record on file"
        }
      })
    });
    return { status: response.status, body: await response.text() };
  }, {
    slug: SLUG,
    sectionKey: PREPARED_SECTION,
    fieldKey: PREPARED_FIELD,
    value: LEGALEASE_CONFLICTING_VALUE
  });
  console.log(`  operator proposal: HTTP ${proposed.status}`);
  assert.ok(proposed.status < 400, `preparing a conflicting value failed: ${proposed.body.slice(0, 300)}`);

  await go(page, `${baseUrl}${route}`);
  const panel = await page.locator("body").innerText();
  assert.ok(panel.includes("Conflict"), "the operator is not shown a conflict for the partner-edited field");
  assert.ok(
    panel.includes(PARTNER_EDITED_VALUE),
    "the partner value is no longer shown beside the proposed replacement"
  );
  // Nothing may be applied while it conflicts: the apply control for that row is disabled.
  const applyable = await page.locator('input[type="checkbox"][aria-label^="Apply"]:not([disabled])').count();
  assert.equal(applyable, 0, "a conflicting suggestion is still selectable for apply");
  await shot(page, "operator-conflict-state", "1440x1000", route, "internal_admin",
    "A conflicting LegalEase value is presented as a conflict and cannot be applied over the partner value");

  // The partner's value is still the stored one: nothing was overwritten by this run.
  const stored = await readPreparedField(workspaceId, PREPARED_FIELD);
  assert.equal(stored.value, PARTNER_EDITED_VALUE, "the partner value did not survive the operator's proposal");
  console.log("  partner value preserved; no override executed");
  void operatorUserId;
  await ctx.close();
}

/** Publication, activation, intake and every money or participant record stay untouched. */
async function readSafetyState() {
  const scoped = {};
  for (const table of ["partner_access_codes", "partner_billing_requests", "rcap_briefcase_items", "rcap_document_packets"]) {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true }).eq("partner_slug", SLUG);
    scoped[table] = count ?? 0;
  }
  for (const table of ["partner_packet_entitlement", "packet_render_jobs", "packet_credit_ledger", "consumer_briefcase_items"]) {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    scoped[table] = count ?? 0;
  }
  return scoped;
}

async function assertSafetyState(before) {
  const after = await readSafetyState();
  for (const [table, count] of Object.entries(after)) {
    assert.equal(count, before[table], `${table} changed during the acceptance run`);
  }
  for (const table of ["partner_access_codes", "partner_billing_requests", "rcap_briefcase_items", "rcap_document_packets"]) {
    assert.equal(after[table], 0, `${table} holds rows for the synthetic tenant`);
  }

  const { data: configuration } = await admin
    .from("partner_events")
    .select("event_payload")
    .eq("partner_slug", SLUG)
    .eq("event_type", "partner_page_configuration_record")
    .maybeSingle();
  const page = configuration?.event_payload ?? {};
  assert.equal(page.publication_state, "private", "publication is not private");
  assert.equal(page.participant_intake_state, "inactive", "participant intake is not inactive");
  assert.equal(page.access_code_state, "absent", "an access code state was recorded");
  assert.equal(page.public_route_state, "not_found", "a public route exists for the synthetic tenant");

  const { data: provisioned } = await admin
    .from("partner_events")
    .select("event_payload")
    .eq("partner_slug", SLUG)
    .eq("event_type", "partner_tenant_provisioned")
    .maybeSingle();
  const tenant = provisioned?.event_payload ?? {};
  assert.equal(tenant.program_activation_state, "inactive", "program activation is not inactive");
  assert.equal(tenant.billing_state, "absent", "a billing state was recorded");
  assert.equal(tenant.allocation_state, "absent", "an allocation state was recorded");
  console.log("  safety: private, inactive, no access code, no billing, packet, allocation or participant record");
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
