import path from "node:path";
import fs from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

process.env.PARTNER_ACCESS_CODE_PEPPER = "verify-partner-access-code-pepper";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { evaluateReadiness, STANDARD_TASKS, statusLabel } = await import("../src/lib/partners/partner-onboarding.ts");
const { buildPartnerLaunchMaterials } = await import("../src/lib/partners/partner-launch-materials.ts");

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function insertPartner(db, slug, { provisioning = "ready_for_onboarding", payment = "unpaid" } = {}) {
  await db.query(
    `insert into public.partner_records (partner_id, partner_slug, partner_name, program_tier, payment_status, qualification_status, provisioning_status)
     values ($1, $2, $3, 'implementation', $4, 'qualified', $5)`,
    [slug, slug, `${slug} Org`, payment, provisioning]
  );
}

function makeView(overrides = {}) {
  const requiredKeys = STANDARD_TASKS.filter((t) => t.required && t.owner === "legalease").map((t) => t.taskKey);
  const tasks = requiredKeys.map((k) => ({
    taskKey: k,
    title: k,
    description: null,
    status: "complete",
    owner: "legalease",
    required: true,
    completedAt: null,
    completedBy: null,
    notes: null,
    updatedAt: "2026-07-09T00:00:00.000Z"
  }));
  return {
    partnerSlug: "x",
    organizationName: "X",
    status: "setup_in_progress",
    tasks,
    packetCap: 10,
    packetsUsed: 0,
    remainingPackets: 10,
    accessMode: "open",
    activeCodeCount: 0,
    adminUserCount: 1,
    sections: {
      profileReady: true,
      billingReady: true,
      accessControlsReady: true,
      landingPageReady: true,
      adminUsersReady: true,
      launchMaterialsReady: true,
      trainingReviewReady: true
    },
    ...overrides
  };
}

try {
  verifySourceWiring();
  verifyReadinessLogic();
  await verifyLaunchMaterials();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec("create schema if not exists auth;");
  await db.exec("create table if not exists auth.users (id uuid primary key);");
  await db.exec("create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-28-rcap-record-audit-trail.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  // phase-41 provides the claim_rcap_screening_session override used below.
  await db.exec(read("supabase/phase-41-rcap-partner-access-codes.sql"));

  // Existing partners present BEFORE the onboarding migration.
  await insertPartner(db, "legacy-live", { provisioning: "provisioned", payment: "paid" });
  await insertPartner(db, "legacy-new");

  await db.exec(read("supabase/phase-42-partner-onboarding.sql"));

  await verifyBackfill(db);
  await verifyDuplicateSlug(db);
  await verifyConstraints(db);
  await verifyAuditAppendOnly(db);
  await verifyRls(db);
  await verifyGoLiveAndPauseMechanism(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP partner onboarding verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner onboarding verification passed.");
console.log("1. Onboarding tables apply cleanly; existing partners backfill into a safe state (live/draft).");
console.log("2. Duplicate partner page addresses are rejected.");
console.log("3. Status, agreement, task-status, and owner constraints are enforced.");
console.log("4. Onboarding audit events are append-only.");
console.log("5. RLS is partner-scoped with an internal-admin policy for onboarding + tasks.");
console.log("6. Marking live activates the partner (page active); pausing deactivates it (no sponsored promise, no credit).");
console.log("7. Launch readiness gates on required tasks, packet cap, landing review, admin, and required-code active codes.");
console.log("8. Launch materials generate a partner link and QR code.");
console.log("9. Internal-only vs partner-facing permissions are enforced at the route + projection layer.");

function verifyReadinessLogic() {
  // 11: incomplete required task blocks launch.
  const incomplete = makeView();
  incomplete.tasks[0].status = "not_started";
  assert(evaluateReadiness(incomplete).ready === false, "Incomplete required task must block launch.");

  // internal_approval alone may be incomplete (it completes at go-live).
  const onlyApproval = makeView();
  const approval = onlyApproval.tasks.find((t) => t.taskKey === "internal_approval");
  approval.status = "not_started";
  assert(evaluateReadiness(onlyApproval).ready === true, "internal_approval incomplete must not block (it completes at go-live).");

  // 10: landing not ready blocks.
  const noLanding = makeView({ sections: { ...makeView().sections, landingPageReady: false } });
  assert(evaluateReadiness(noLanding).ready === false, "Landing page not reviewed must block launch.");

  // 9: required_code with no active code blocks.
  const reqCode = makeView({ accessMode: "required_code", activeCodeCount: 0 });
  const blockers = evaluateReadiness(reqCode).blockers.join(" ");
  assert(evaluateReadiness(reqCode).ready === false && /access code/i.test(blockers), "required_code without an active code must block launch.");

  const reqCodeOk = makeView({ accessMode: "required_code", activeCodeCount: 1 });
  assert(evaluateReadiness(reqCodeOk).ready === true, "required_code with an active code must be launchable.");

  // packet cap 0 blocks.
  const noCap = makeView({ packetCap: 0 });
  assert(evaluateReadiness(noCap).ready === false, "A packet cap of 0 must block launch.");

  // Fully configured open partner is ready.
  assert(evaluateReadiness(makeView()).ready === true, "A fully configured partner must be ready to launch.");

  // The standardized checklist includes the required review items.
  const keys = STANDARD_TASKS.map((t) => t.taskKey);
  for (const key of ["profile_complete", "agreement_billing", "packet_cap", "overage_pause", "access_mode", "codes_created", "landing_reviewed", "admin_invited", "launch_materials", "disclaimers_visible", "internal_approval"]) {
    assert(keys.includes(key), `Standard checklist must include ${key}.`);
  }
  assert(STANDARD_TASKS.some((t) => t.owner === "partner"), "Checklist must include partner-owned tasks.");
  assert(statusLabel("ready_to_launch") === "Ready to launch", "Status labels must be plain English.");
}

async function verifyLaunchMaterials() {
  // Uses the seed-fallback partner repository (no Supabase configured).
  const materials = await buildPartnerLaunchMaterials("we-must-vote");
  assert(materials.landingUrl.includes("/p/we-must-vote"), "Launch materials must include the partner page link.");
  assert(materials.qrCodeSvg.startsWith("<svg"), "Launch materials must include a QR code.");
  assert(materials.qrCodeDataUrl.startsWith("data:image/"), "Launch materials must include a QR data URL.");
  assert(/not legal advice/i.test(materials.disclaimers.join(" ")), "Launch materials must preserve disclaimers.");
  assert(/packet credits are only used/i.test(materials.packetCreditsExplanation), "Launch materials must explain packet credits.");
}

async function verifyBackfill(db) {
  const live = (await db.query("select status, launched_at from public.partner_onboarding where partner_slug = 'legacy-live'")).rows[0];
  assert(live && live.status === "live", "Provisioned partner must backfill to live onboarding status.");
  assert(live.launched_at, "Backfilled live partner must have a launched_at.");
  const draft = (await db.query("select status from public.partner_onboarding where partner_slug = 'legacy-new'")).rows[0];
  assert(draft && draft.status === "draft", "Non-provisioned partner must backfill to draft.");
}

async function verifyDuplicateSlug(db) {
  await db.query(
    `insert into public.partner_onboarding (partner_slug, status) values ('legacy-live', 'draft') on conflict do nothing`
  );
  let rejected = false;
  try {
    await db.query(
      `insert into public.partner_records (partner_id, partner_slug, partner_name, program_tier, provisioning_status, qualification_status, payment_status)
       values ('legacy-live-2', 'legacy-live', 'dup', 'implementation', 'ready_for_onboarding', 'qualified', 'unpaid')`
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "Duplicate partner slug must be rejected by the unique constraint.");
}

async function verifyConstraints(db) {
  await insertPartner(db, "cons-partner");
  await db.query("insert into public.partner_onboarding (partner_slug, status) values ('cons-partner', 'setup_in_progress')");

  let badStatus = false;
  try { await db.query("update public.partner_onboarding set status = 'launched' where partner_slug = 'cons-partner'"); } catch { badStatus = true; }
  assert(badStatus, "Invalid onboarding status must be rejected.");

  let badTask = false;
  try {
    await db.query("insert into public.partner_onboarding_tasks (partner_slug, task_key, title, status) values ('cons-partner', 't1', 'T', 'done')");
  } catch { badTask = true; }
  assert(badTask, "Invalid task status must be rejected.");

  let badOwner = false;
  try {
    await db.query("insert into public.partner_onboarding_tasks (partner_slug, task_key, title, owner) values ('cons-partner', 't2', 'T', 'vendor')");
  } catch { badOwner = true; }
  assert(badOwner, "Invalid task owner must be rejected.");
}

async function verifyAuditAppendOnly(db) {
  await db.query(
    `insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, actor, metadata)
     values ('partner_onboarding', 'cons-partner', 'cons-partner', 'partner_marked_live', 'internal_admin', '{}'::jsonb)`
  );
  const row = (await db.query("select id from public.rcap_record_events where event_type = 'partner_marked_live' limit 1")).rows[0];
  assert(row, "Onboarding audit event must be insertable (record_type accepted).");
  let blocked = false;
  try { await db.query("delete from public.rcap_record_events where id = $1", [row.id]); } catch { blocked = true; }
  assert(blocked, "Onboarding audit events must be append-only (delete blocked).");
}

async function verifyRls(db) {
  for (const table of ["partner_onboarding", "partner_onboarding_tasks"]) {
    const policies = (await db.query("select policyname from pg_policies where tablename = $1", [table])).rows.map((r) => r.policyname);
    assert(policies.some((p) => p.includes("own_partner")), `${table} must have a partner-scoped SELECT policy.`);
    assert(policies.some((p) => p.includes("internal_admin")), `${table} must have an internal-admin SELECT policy.`);
    const rls = (await db.query("select relrowsecurity from pg_class where relname = $1", [table])).rows[0];
    assert(rls.relrowsecurity === true, `RLS must be enabled on ${table}.`);
  }
}

async function verifyGoLiveAndPauseMechanism(db) {
  // Marking live reuses activatePartner -> provisioning_status = 'provisioned',
  // which makes the co-branded page active (claim succeeds).
  await insertPartner(db, "live-partner", { provisioning: "provisioned", payment: "paid" });
  await db.query("insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used) values ('live-partner', 5, 0)");
  const active = (await db.query("select * from public.claim_rcap_screening_session($1, $2)", ["live-partner", "GA"])).rows[0];
  assert(active.ok === true, "A provisioned (live) partner must have an active page (claim succeeds).");

  // Pausing reuses pausePartner -> provisioning_status = 'paused'. isActiveRcapPartner
  // then returns false: no partner benefit, no packet credit consumed.
  await db.query("update public.partner_records set provisioning_status = 'paused' where partner_slug = 'live-partner'");
  const paused = (await db.query("select * from public.claim_rcap_screening_session($1, $2)", ["live-partner", "GA"])).rows[0];
  assert(paused.ok === false && paused.reason === "partner_inactive", "A paused partner must not grant partner benefit or consume credits.");

  const used = (await db.query("select screenings_used from public.partner_entitlement where partner_slug = 'live-partner'")).rows[0];
  assert(Number(used.screenings_used) === 0, "Pausing must not consume any packet credit.");
}

function verifySourceWiring() {
  // Migration safety + reuse.
  const migration = read("supabase/phase-42-partner-onboarding.sql");
  assert(migration.includes("do not run against production"), "Migration must carry the DB-process safety header.");
  assert(migration.includes("create table if not exists public.partner_onboarding"), "Migration must create partner_onboarding.");
  assert(migration.includes("create table if not exists public.partner_onboarding_tasks"), "Migration must create the checklist table.");
  assert(!/create table[^;]*packet_cap/i.test(migration), "Onboarding must not duplicate the packet cap column (partner_entitlement is authoritative).");

  // Lib reuse: go-live/pause reuse existing activation; billing writes partner_entitlement; access mode reuses phase-41.
  const lib = read("src/lib/partners/partner-onboarding.ts");
  assert(lib.includes("activatePartner(slug)"), "markLive must reuse activatePartner.");
  assert(lib.includes("pausePartner(slug)"), "pauseOnboarding must reuse pausePartner.");
  assert(lib.includes('.from("partner_entitlement")'), "Billing must write the authoritative partner_entitlement ledger.");
  assert(lib.includes("updatePartnerAccessMode"), "Access mode must reuse the existing access-code system.");
  assert(lib.includes("notes intentionally omitted"), "Partner-facing projection must omit task notes.");
  // Scope the internal-notes check to the partner-facing function + return type.
  const facingStart = lib.indexOf("export async function getOnboardingForPartner");
  const facingBody = lib.slice(facingStart, lib.indexOf("export ", facingStart + 1));
  assert(facingBody.length > 0 && !/internalNotes|internal_notes|internalBillingNotes/.test(facingBody), "Partner-facing projection must not expose internal notes.");
  const facingType = lib.slice(lib.indexOf("export type PartnerFacingOnboarding"), lib.indexOf("export async function getOnboardingForPartner"));
  assert(!/internalNotes|internal_notes|internalBillingNotes/.test(facingType), "Partner-facing type must not include internal notes.");

  // Internal routes require internal admin.
  const internalRoute = read("src/app/api/internal/partners/onboarding/route.ts");
  assert(internalRoute.includes("requireInternalAdminRouteAccess"), "Internal onboarding route must require internal admin.");
  const detailRoute = read("src/app/api/internal/partners/onboarding/[partnerSlug]/route.ts");
  assert(detailRoute.includes("denyUnlessInternalAdmin"), "Internal onboarding detail route must require internal admin.");
  assert(detailRoute.includes("inviteAndMapPartnerUser"), "Admin invites must reuse the existing invite flow.");
  assert(detailRoute.includes("buildPartnerLaunchMaterials"), "Launch materials must be generated server-side.");

  // Partner-facing route is scoped to the session slug and cannot change cap/mode.
  const partnerRoute = read("src/app/api/partners/onboarding/checklist/route.ts");
  assert(partnerRoute.includes("requirePartnerSession"), "Partner onboarding route must require a partner session.");
  assert(partnerRoute.includes("session.partnerSlug"), "Partner onboarding route must use the session slug, not request input.");
  assert(partnerRoute.includes("updatePartnerOwnedTask"), "Partners may only update their own tasks.");
  assert(!/configureBilling|packetCap|configureAccessMode/.test(partnerRoute), "Partner route must not allow changing packet cap or access mode.");

  // The existing partner profile-save route is untouched.
  const existingRoute = read("src/app/api/partners/onboarding/route.ts");
  assert(existingRoute.includes("savePartnerOnboardingProfile"), "The existing partner onboarding profile route must remain intact.");
}
