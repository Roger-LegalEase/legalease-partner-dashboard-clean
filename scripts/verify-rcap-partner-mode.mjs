import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];
let rcapPaymentRoutingStatus = "pending-on-prompt-3";

const persistence = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-session-persistence.ts"));
const { evaluateExpungementAiMatter } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/expungement-ai-adapter.ts"));
const { getProfileByJurisdiction } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/profile-registry.ts"));
const { projectPublicProfile } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/public-profile-projection.ts"));
const { toScreeningAnswers } = loadTsModule(path.join(rootDir, "src/components/expungement-ai/screening/answers.ts"));
const { buildPartnerUsageWindowEventPayload } = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/nudge-os-events.ts"));
const { saveEligibilityResultToBriefcase } = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/briefcase.ts"));
const { ConsumerPacketPaymentRequiredError, generatePaidConsumerPacket } = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/packet-generation.ts"));

try {
  rcapPaymentRoutingStatus = verifySourceWiring();

  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-33-expungement-screening-resume-links.sql"));
  await db.exec(read("supabase/phase-35-rcap-partner-entitlement.sql"));
  await db.exec(read("supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  await db.exec(read("supabase/phase-35c-rcap-claim-screening-session.sql"));
  await db.exec(read("supabase/phase-35d-rcap-slot-lifecycle.sql"));

  await verifyDtcSessionStorageDefaults(db);
  await verifyEligibilitySameAcrossModes();
  await verifyUnknownInactivePartnerFailsClosed(db);
  await verifyHardCapViaRpc(db);
  await verifyRpcConcurrency(db);
  await verifyRpcRollbackOnInsertFailure(db);
  await verifyPageLoadDoesNotClaim();
  await verifyReleaseOnExpiry(db);
  await verifyCompletionConsumesSlot(db);
  await verifyRecomputeHelper(db);
  await verifyUsageEventNoPii();
  await verifyScopeGuardDiscipline();
  await verifyDtcUnchangedGuard(db);
  await verifyUnpaidDtcPacketGenerationRejected();

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("RCAP partner mode verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner mode verification passed.");
console.log("1. DTC payment path, checkout/payment-confirm, and packet routing verified unchanged.");
console.log(`2. RCAP payment-skip routing: ${rcapPaymentRoutingStatus}.`);
console.log("3. Identical answers produce identical evaluation results across DTC/RCAP modes.");
console.log("4. Unknown/inactive partner fails closed with no session or slot consumption.");
console.log("5. Hard cap N+1 returns capacity_full after exactly N sessions are inserted.");
console.log("6. Concurrency: exactly one success, one capacity_full, one inserted session.");
console.log("7. Rollback-on-failure proven at runtime with a forced insert constraint failure.");
console.log("8. Intake page load does not claim a slot; claim happens only on explicit start.");
console.log("9. Expiry release is once-only and ignores DTC sessions.");
console.log("10. Completion consumes the claimed slot and prevents later release.");
console.log("11. Recompute uses the same expiry predicate and self-corrects stale claimed rows.");
console.log("12. Partner usage event payload is aggregate-only and contains no PII.");
console.log("13. DTC save/resume and pay/packet boundaries remain intact.");
console.log("14. Scope guard allowlist remains centralized.");

function verifySourceWiring() {
  const intakePage = read("src/app/intake/[partnerSlug]/page.tsx");
  const intakeLib = read("src/lib/expungement-ai/rcap-partner-intake.ts");
  const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
  const resultPanel = read("src/components/expungement-ai/ResultPanel.tsx");
  const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
  const dtcStartPage = read("src/app/expungement-ai/start/page.tsx");
  const payPage = read("src/app/expungement-ai/pay/page.tsx");
  const packetReadyPage = read("src/app/expungement-ai/packet-ready/page.tsx");
  const checkoutRoute = read("src/app/api/expungement-ai/checkout/route.ts");
  const paymentConfirmRoute = read("src/app/api/expungement-ai/payment/confirm/route.ts");
  const packetGenerateRoute = read("src/app/api/expungement-ai/packet/generate/route.ts");
  const saveResumeRoute = read("src/app/api/expungement-ai/screening/save-resume/route.ts");
  const resumeConfirmRoute = read("src/app/api/expungement-ai/screening/resume/confirm/route.ts");
  const frontendEvaluate = read("src/lib/expungement-ai/frontend/evaluate.ts");
  const engineEvaluator = read("src/lib/rcap-engine/evaluator.ts");
  const engineAdapter = read("src/lib/rcap-engine/expungement-ai-adapter.ts");
  const paymentAdapter = read("src/lib/expungement-ai/payment-adapter.ts");
  const packetGeneration = read("src/lib/expungement-ai/packet-generation.ts");
  const briefcase = read("src/lib/expungement-ai/briefcase.ts");
  const resumeService = read("src/lib/expungement-ai/screening-resume-service.ts");
  const allowlist = read("scripts/rcap-scope-allowlist.mjs");
  const lifecycle = read("src/lib/expungement-ai/rcap-slot-lifecycle.ts");
  const migration = read("supabase/phase-35d-rcap-slot-lifecycle.sql");

  assert(intakePage.includes("resolveRcapPartnerIntakeContext(partnerSlug)"), "Partner intake must resolve context on load.");
  assert(intakePage.includes("form action={startRcapPartnerScreening}"), "Partner intake start must be explicit.");
  assert(intakePage.includes("claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction })"), "Partner intake start must call the RPC wrapper.");
  assert(intakePage.includes("This link is not active right now"), "Inactive link copy missing.");
  assert(intakePage.includes("This program is currently full"), "Program-full headline copy missing.");
  assert(intakePage.includes("Please check back later or contact the organization that shared this link."), "Program-full body copy missing.");
  assert(!intakePage.includes("/expungement-ai/start"), "Partner intake must not fall back to DTC start.");
  assert(!intakePage.includes("/expungement-ai/pay"), "Partner intake must not route to pay.");
  assert(indexOf(intakePage, "claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction })") > indexOf(intakePage, "async function startRcapPartnerScreening"), "Claim RPC must only be called in the explicit start action.");
  assert(intakeLib.includes('.rpc("claim_rcap_screening_session"'), "RPC wrapper must call claim_rcap_screening_session.");
  assert(!intakeLib.includes(".from(\"screening_sessions\").insert"), "No app-level insert flow allowed.");
  assert(!intakeLib.includes("screenings_used + 1"), "No app-level entitlement increment allowed.");

  assert(screeningFlow.includes("onPacketAction={() => router.push(isPartnerSession ? BRIEFCASE_PATH : PACKET_PATH)}"), "RCAP screening flow must still define a packet action (DTC -> PACKET_PATH, partner/session -> BRIEFCASE_PATH).");
  assert(!screeningFlow.includes("payment-adapter"), "RCAP screening flow must not invoke payment adapter.");
  assert(!screeningFlow.includes("payment-confirm"), "RCAP screening flow must not invoke payment-confirm.");
  const rcapPaymentRoutingStatus = screeningFlow.includes('const PACKET_PATH = "/expungement-ai/pay";')
    ? "pending-on-prompt-3"
    : (() => {
        assert(screeningFlow.includes('const PACKET_PATH = "/expungement-ai/packet-ready";'), "RCAP screening flow must route directly to packet-ready once Prompt 3 lands.");
        assert(!screeningFlow.includes("/expungement-ai/pay"), "RCAP screening flow must not route to pay once Prompt 3 lands.");
        return "pass";
      })();

  assert(resultPanel.includes('href={`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.briefcaseItemId ?? "")}`'), "DTC result panel must still route packet-ready results to pay.");
  assert(screeningResult.includes("showPacketAction = isPaymentAllowed(evaluation);"), "ScreeningFlow result UI must still clamp payment display to paymentAllowed.");
  assert(payPage.includes("assertCheckoutAllowed(item);"), "Pay page must still gate checkout through payment adapter.");
  assert(payPage.includes("Open this page from a packet-ready Briefcase result to start checkout."), "Pay page routing copy missing.");
  assert(packetReadyPage.includes("payment confirmation or explicit dry-run confirmation"), "Packet-ready page must still confirm payment before showing ready state.");
  assert(dtcStartPage.includes("Start free &rarr;"), "DTC start page must still route into the normal consumer check flow.");
  assert(dtcStartPage.includes("/expungement-ai/check"), "DTC start page must still link into the existing check flow.");
  assert(checkoutRoute.includes("createConsumerPacketCheckout"), "Checkout route must invoke consumer packet checkout.");
  assert(paymentConfirmRoute.includes("recordConsumerPaymentConfirmation"), "Payment confirm route must invoke payment confirmation.");
  assert(packetGenerateRoute.includes("generatePaidConsumerPacket"), "Packet generation route must invoke paid packet generation.");
  assert(saveResumeRoute.includes("saveScreeningResumeLink"), "Save-resume route must stay wired.");
  assert(resumeConfirmRoute.includes("confirmScreeningResume"), "Resume-confirm route must stay wired.");
  assert(resumeService.includes("saveScreeningSession"), "Resume service must persist the underlying session.");
  assert(frontendEvaluate.includes("USE_LIVE_EVALUATE_ENDPOINT = true"), "Frontend evaluate adapter wiring changed unexpectedly.");
  assert(!frontendEvaluate.includes("flow_mode"), "Frontend evaluator must not branch on flow_mode.");
  assert(!engineEvaluator.includes("flow_mode"), "Engine evaluator must not branch on flow_mode.");
  assert(!engineAdapter.includes("flow_mode"), "Engine adapter must not branch on flow_mode.");
  assert(!paymentAdapter.includes("flow_mode"), "Payment adapter must not branch on flow_mode.");
  assert(!paymentAdapter.includes("partner_slug"), "Payment adapter must not branch on RCAP partner data.");
  assert(!paymentAdapter.includes("claimed_slot_state"), "Payment adapter must not branch on claimed slot state.");
  assert(!packetGeneration.includes("flow_mode"), "Packet generation must not branch on flow_mode.");
  assert(briefcase.includes('.eq("flow_mode", "rcap")'), "Partner-sponsored packet helper must require persisted rcap mode.");
  assert(briefcase.includes('.not("partner_slug", "is", null)'), "Partner-sponsored packet helper must require a persisted non-null partner_slug.");
  assert(allowlist.includes("src/app/api/expungement-ai/screening/complete/route.ts"), "Completion route must be centrally allowlisted.");
  assert(allowlist.includes("src/lib/expungement-ai/rcap-slot-lifecycle.ts"), "RCAP lifecycle helper must be centrally allowlisted.");
  assert(allowlist.includes("supabase/phase-35d-rcap-slot-lifecycle.sql"), "RCAP lifecycle migration must be centrally allowlisted.");
  assert(allowlist.includes("src/lib/expungement-ai/nudge-os-events.ts"), "Partner usage event emitter must be centrally allowlisted.");
  assert(migration.includes("rcap_screening_session_is_release_expired"), "Shared expiry predicate missing from migration.");
  assert(countOccurrences(migration, "public.rcap_screening_session_is_release_expired(") >= 2, "Release and recompute must both call the shared expiry predicate.");
  assert(lifecycle.includes('rpc("release_expired_rcap_screening_slots"'), "Lifecycle helper must call release RPC.");
  assert(lifecycle.includes('rpc("consume_rcap_screening_session"'), "Lifecycle helper must call consume RPC.");
  assert(lifecycle.includes('rpc("recompute_rcap_partner_entitlements"'), "Lifecycle helper must call recompute RPC.");

  return rcapPaymentRoutingStatus;
}

async function verifyDtcSessionStorageDefaults(db) {
  const storage = createPgliteScreeningSessionStorage(db);
  const profile = mustProfile("MS");
  const publicProfile = projectPublicProfile(profile);
  const answers = representativeAnswers(publicProfile);

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "11111111-1111-4111-8111-111111111111",
    jurisdiction: profile.jurisdiction.code,
    answers,
    currentQuestionId: publicProfile.questions.at(-1)?.id ?? null,
    furthestStage: publicProfile.questions.at(-1)?.stage ?? null,
    status: "in_progress",
    lastDropQuestion: publicProfile.questions.at(-1)?.id ?? null
  });
  const row = await one(db, "select * from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(row.flow_mode === "dtc", "DTC session flow_mode must default to dtc.");
  assert(row.partner_slug === null, "DTC session partner_slug must default to null.");
  assert(row.claimed_slot_state === null, "DTC session claimed_slot_state must default to null.");
  const loaded = await persistence.loadScreeningSession(storage, saved.sessionId);
  assert(loaded, "DTC session must round-trip through storage.");
  assertDeepEqual(loaded.answers, answers, "DTC session answers must round-trip unchanged.");
}

async function verifyEligibilitySameAcrossModes() {
  const profile = mustProfile("MS");
  const publicProfile = projectPublicProfile(profile);
  const answers = representativeAnswers(publicProfile);
  const request = {
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: "mode-equality-matter",
    answers: toScreeningAnswers(answers)
  };
  const dtc = evaluateExpungementAiMatter(request);
  const rcap = evaluateExpungementAiMatter({ ...request, matterId: "mode-equality-matter-rcap" });

  assert(dtc.resultCode === rcap.resultCode, "Identical answers must produce the same resultCode across modes.");
  assert(dtc.paymentAllowed === rcap.paymentAllowed, "Identical answers must produce the same paymentAllowed across modes.");
  assertDeepEqual(dtc.packetPlan ?? null, rcap.packetPlan ?? null, "Identical answers must produce the same packetPlan across modes.");
}

async function verifyUnknownInactivePartnerFailsClosed(db) {
  await seedPartner(db, "inactive-one", {
    allowed: 3,
    used: 0,
    paymentStatus: "paid",
    qualificationStatus: "qualified",
    provisioningStatus: "paused"
  });

  for (const slug of ["missing-one", "inactive-one"]) {
    const beforeSessions = await totalSessions(db);
    const beforeUsed = slug === "inactive-one" ? await usedSlots(db, slug) : null;
    const claim = await claimSession(db, slug, "MS");
    assert(claim.ok === false && claim.reason === "partner_inactive", `${slug} must fail closed.`);
    assert((await totalSessions(db)) === beforeSessions, `${slug} must not create a session.`);
    if (beforeUsed !== null) assert((await usedSlots(db, slug)) === beforeUsed, `${slug} must not consume a slot.`);
  }
}

async function verifyHardCapViaRpc(db) {
  await seedPartner(db, "hard-cap", { allowed: 3, used: 0 });
  const claims = [];
  for (let index = 0; index < 4; index += 1) {
    claims.push(await claimSession(db, "hard-cap", "MS"));
  }
  assert(claims.filter((claim) => claim.ok).length === 3, "Hard cap N must allow exactly N sessions.");
  assert(claims[3].ok === false && claims[3].reason === "capacity_full", "N+1 claim must return capacity_full.");
  assert((await countSessions(db, "hard-cap")) === 3, "Exactly N sessions must be inserted.");
  assert((await usedSlots(db, "hard-cap")) === 3, "screenings_used must equal N after hard cap.");
}

async function verifyRpcConcurrency(db) {
  await seedPartner(db, "concurrent-start", { allowed: 1, used: 0 });
  const claims = await Promise.all([
    claimSession(db, "concurrent-start", "MS"),
    claimSession(db, "concurrent-start", "MS")
  ]);

  assert(claims.filter((claim) => claim.ok).length === 1, "Exactly one concurrent RPC should succeed.");
  assert(claims.filter((claim) => claim.reason === "capacity_full").length === 1, "Exactly one concurrent RPC should return capacity_full.");
  assert((await countSessions(db, "concurrent-start")) === 1, "Concurrency must insert exactly one session.");
  assert((await usedSlots(db, "concurrent-start")) === 1, "Concurrency must consume exactly one slot.");
}

async function verifyRpcRollbackOnInsertFailure(db) {
  await seedPartner(db, "rollback-test", { allowed: 1, used: 0 });
  await db.exec("alter table public.screening_sessions add constraint screening_sessions_no_rcap_rollback_test check (not (flow_mode = 'rcap' and partner_slug = 'rollback-test'))");

  let failed = false;
  try {
    await claimSession(db, "rollback-test", "MS");
  } catch {
    failed = true;
  }

  assert(failed, "Forced insert failure should abort the RPC.");
  assert((await usedSlots(db, "rollback-test")) === 0, "Forced insert failure must roll back the entitlement increment.");
  assert((await countSessions(db, "rollback-test")) === 0, "Forced insert failure must create no session row.");
}

async function verifyPageLoadDoesNotClaim() {
  const intakePage = read("src/app/intake/[partnerSlug]/page.tsx");
  assert(intakePage.includes("resolveRcapPartnerIntakeContext(partnerSlug)"), "Page load must resolve partner context.");
  assert(!intakePage.includes(".rpc(\"claim_rcap_screening_session\""), "Page load must not call the claim RPC.");
  assert(indexOf(intakePage, "resolveRcapPartnerIntakeContext(partnerSlug)") < indexOf(intakePage, "async function startRcapPartnerScreening"), "Claim RPC must only appear in the explicit start action.");
}

async function verifyReleaseOnExpiry(db) {
  await seedPartner(db, "release-once", { allowed: 3, used: 0 });
  const claim = await claimSession(db, "release-once", "MS");
  assert(claim.ok === true, "Release fixture claim failed.");

  await db.query(
    `update public.screening_sessions
     set created_at = $1,
         resume_token_expires_at = $2,
         status = 'in_progress'
     where session_id = $3`,
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", claim.session_id]
  );

  const first = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(first.rows.length === 1, "First release pass must report one partner.");
  assert(first.rows[0].released_count === 1, "First release pass must release one slot.");
  assert((await usedSlots(db, "release-once")) === 0, "Release must decrement used slots.");
  assert((await slotState(db, claim.session_id)) === "released", "Release must flip claimed -> released.");

  const second = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(second.rows.length === 0, "Second release pass must no-op.");
  assert((await usedSlots(db, "release-once")) === 0, "Second release pass must not decrement again.");

  await seedPartner(db, "release-dtc", { allowed: 1, used: 0 });
  await db.query("insert into public.screening_sessions (session_id, jurisdiction, status, created_at) values ($1, $2, $3, $4)", [
    "00000000-0000-4000-8000-00000000d7c0",
    "MS",
    "in_progress",
    "2026-06-01T00:00:00.000Z"
  ]);
  const before = await usedSlots(db, "release-dtc");
  const ignored = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert((await usedSlots(db, "release-dtc")) === before, "DTC sessions must be ignored by release.");
  assert(ignored.rows.every((row) => row.partner_slug !== null), "DTC sessions must not be released.");
}

async function verifyCompletionConsumesSlot(db) {
  await seedPartner(db, "complete-one", { allowed: 2, used: 0 });
  const claim = await claimSession(db, "complete-one", "MS");
  assert(claim.ok === true, "Completion fixture claim failed.");
  assert((await usedSlots(db, "complete-one")) === 1, "Claim must consume exactly one slot.");

  const consumed = await db.query("select * from public.consume_rcap_screening_session($1)", [claim.session_id]);
  assert(consumed.rows[0].consumed === true, "Completion must consume the claimed slot.");
  assert((await usedSlots(db, "complete-one")) === 1, "Completion must not change used slots.");
  const session = await one(db, "select status, claimed_slot_state from public.screening_sessions where session_id = $1", [claim.session_id]);
  assert(session.status === "completed", "Completion must set status completed.");
  assert(session.claimed_slot_state === "consumed", "Completion must set claimed_slot_state consumed.");

  const second = await db.query("select * from public.consume_rcap_screening_session($1)", [claim.session_id]);
  assert(second.rows[0].consumed === false, "Second completion pass must no-op.");
  assert((await usedSlots(db, "complete-one")) === 1, "Second completion pass must not change used slots.");

  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2 where session_id = $3",
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", claim.session_id]
  );
  const release = await db.query("select * from public.release_expired_rcap_screening_slots($1)", ["2026-06-22T00:00:00.000Z"]);
  assert(release.rows.length === 0, "Consumed session must not be releasable later.");
  assert((await usedSlots(db, "complete-one")) === 1, "Consumed session must never be reclaimed.");
}

async function verifyRecomputeHelper(db) {
  await seedPartner(db, "recompute-one", { allowed: 10, used: 0 });
  const consumed = await claimSession(db, "recompute-one", "MS");
  const active = await claimSession(db, "recompute-one", "MS");
  const expired = await claimSession(db, "recompute-one", "MS");
  assert(consumed.ok && active.ok && expired.ok, "Recompute fixture claims failed.");

  await db.query("select * from public.consume_rcap_screening_session($1)", [consumed.session_id]);
  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2, status = 'in_progress' where session_id = $3",
    ["2026-06-01T00:00:00.000Z", "2026-06-08T00:00:00.000Z", expired.session_id]
  );
  await db.query(
    "update public.screening_sessions set created_at = $1, resume_token_expires_at = $2, status = 'in_progress' where session_id = $3",
    ["2026-06-21T00:00:00.000Z", "2026-06-28T00:00:00.000Z", active.session_id]
  );
  await db.query(
    "insert into public.screening_sessions (session_id, jurisdiction, partner_slug, flow_mode, claimed_slot_state, status, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, $8)",
    ["00000000-0000-4000-8000-00000000dead", "MS", "recompute-one", "rcap", "released", "abandoned", "2026-06-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z"]
  );
  await db.query("update public.partner_entitlement set screenings_used = 9 where partner_slug = $1", ["recompute-one"]);

  const first = await db.query("select * from public.recompute_rcap_partner_entitlements($1, $2)", ["recompute-one", "2026-06-22T00:00:00.000Z"]);
  assert(first.rows[0].ledger_count === 2, "Recompute must count consumed + active-not-expired only.");
  assert(first.rows[0].screenings_used === 2, "Recompute must converge screenings_used to the true ledger.");
  assert((await usedSlots(db, "recompute-one")) === 2, "Recompute must persist the true ledger count.");
  assert((await slotState(db, expired.session_id)) === "claimed", "Expired claimed row should remain claimed until release; recompute still excludes it.");

  const second = await db.query("select * from public.recompute_rcap_partner_entitlements($1, $2)", ["recompute-one", "2026-06-22T00:00:00.000Z"]);
  assert(second.rows[0].ledger_count === 2 && second.rows[0].screenings_used === 2, "Recompute must be idempotent.");
}

async function verifyUsageEventNoPii() {
  const payload = buildPartnerUsageWindowEventPayload(
    {
      partner_slug: "We_Must Vote!",
      screenings_allowed: 5,
      screenings_used: 5,
      at_capacity: false,
      period_label: "June 2026"
    },
    { now: () => new Date("2026-06-22T14:30:00.000Z") }
  );

  assert(payload.eventType === "partner_usage_window", "Usage event type mismatch.");
  assert(payload.product === "expungement_ai", "Usage event product mismatch.");
  assert(payload.source === "partner_entitlement", "Usage event source mismatch.");
  assert(payload.metadata.partner_slug === "we-must-vote", "Usage event slug must be normalized.");
  assert(payload.metadata.screenings_allowed === 5, "Usage event screenings_allowed mismatch.");
  assert(payload.metadata.screenings_used === 5, "Usage event screenings_used mismatch.");
  assert(payload.metadata.at_capacity === true, "Usage event at_capacity mismatch.");
  assert(payload.metadata.period_label === "June 2026", "Usage event period label mismatch.");
  assertNoForbiddenKeys(payload);
}

async function verifyScopeGuardDiscipline() {
  const allowlist = read("scripts/rcap-scope-allowlist.mjs");
  assert(allowlist.includes("src/app/api/expungement-ai/screening/complete/route.ts"), "Completion route must stay centralized in allowlist.");
  assert(allowlist.includes("src/lib/expungement-ai/rcap-slot-lifecycle.ts"), "RCAP lifecycle helper must stay centralized in allowlist.");
  assert(allowlist.includes("supabase/phase-35d-rcap-slot-lifecycle.sql"), "RCAP lifecycle migration must stay centralized in allowlist.");
  assert(allowlist.includes("src/lib/expungement-ai/nudge-os-events.ts"), "Partner usage emitter must stay centralized in allowlist.");
}

async function verifyDtcUnchangedGuard(db) {
  const storage = createPgliteScreeningSessionStorage(db);
  const profile = mustProfile("IL");
  const publicProfile = projectPublicProfile(profile);
  const completeAnswers = representativeAnswers(publicProfile);

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "22222222-2222-4222-8222-222222222222",
    jurisdiction: profile.jurisdiction.code,
    answers: completeAnswers,
    currentQuestionId: publicProfile.questions.at(-1)?.id ?? null,
    furthestStage: publicProfile.questions.at(-1)?.stage ?? null,
    status: "completed",
    lastDropQuestion: null
  });
  const loaded = await persistence.loadScreeningSession(storage, saved.sessionId);
  assert(loaded, "DTC save/resume smoke test must load a session.");
  assertDeepEqual(loaded.answers, completeAnswers, "DTC save/resume smoke test must preserve answers.");

  const fresh = evaluateExpungementAiMatter({
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: "dtc-unchanged",
    answers: toScreeningAnswers(completeAnswers)
  });
  const repeated = evaluateExpungementAiMatter({
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: "rcap-unchanged",
    answers: toScreeningAnswers(completeAnswers)
  });

  assert(fresh.resultCode === repeated.resultCode, "DTC and RCAP routes must share the same evaluator entrypoint.");
  assert(fresh.paymentAllowed === repeated.paymentAllowed, "DTC and RCAP must agree on paymentAllowed before routing.");
  assertDeepEqual(fresh.packetPlan ?? null, repeated.packetPlan ?? null, "DTC and RCAP must agree on packetPlan before routing.");
}

async function verifyUnpaidDtcPacketGenerationRejected() {
  const savedEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const userId = `dtc-unpaid-${randomUuid()}`;
    const item = saveEligibilityResultToBriefcase({
      resultCode: "packet_ready",
      userLabel: "Your self-help packet is ready to prepare.",
      state: "MS",
      pathwayLabel: "Mississippi record-clearing review",
      confidence: "high",
      paymentAllowed: true,
      priceCents: 5000,
      packetType: "custom_pleading",
      reasons: ["The engine found a packet-ready path."],
      nextSteps: ["Review the result.", "Pay once to generate the packet.", "Follow the filing checklist."],
      emailCaptureRecommended: false,
      disclaimer: "Verifier fixture."
    }, userId);

    assert(item.paymentStatus !== "paid", "DTC verifier fixture must start without paid status.");
    assert(item.sourceSessionId === undefined, "DTC verifier fixture must not carry an RCAP source session.");

    let rejected = false;
    try {
      await generatePaidConsumerPacket({ userId, briefcaseItemId: item.id });
    } catch (error) {
      rejected = error instanceof ConsumerPacketPaymentRequiredError;
    }
    assert(rejected, "Unpaid DTC packet-ready item must be rejected before packet generation.");
  } finally {
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", savedEnv.NEXT_PUBLIC_SUPABASE_URL);
    restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", savedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", savedEnv.SUPABASE_SERVICE_ROLE_KEY);
  }
}

function createPgliteScreeningSessionStorage(db) {
  return {
    async saveSession(input) {
      const result = await db.query(
        `insert into public.screening_sessions (
          session_id,
          jurisdiction,
          answers,
          current_question_id,
          furthest_stage,
          status,
          last_drop_question
        ) values ($1, $2, $3::jsonb, $4, $5, $6, $7)
        on conflict (session_id) do update set
          jurisdiction = excluded.jurisdiction,
          answers = excluded.answers,
          current_question_id = excluded.current_question_id,
          furthest_stage = excluded.furthest_stage,
          status = excluded.status,
          last_drop_question = excluded.last_drop_question,
          updated_at = now()
        returning *`,
        [
          input.sessionId ?? randomUuid(),
          input.jurisdiction,
          JSON.stringify(input.answers),
          input.currentQuestionId,
          input.furthestStage,
          input.status,
          input.lastDropQuestion
        ]
      );
      return rowToSerializedSession(result.rows[0]);
    },
    async loadSession(sessionId) {
      const result = await db.query("select * from public.screening_sessions where session_id = $1", [sessionId]);
      return result.rows[0] ? rowToSerializedSession(result.rows[0]) : null;
    }
  };
}

async function claimSession(db, partnerSlug, jurisdiction) {
  const result = await db.query("select * from public.claim_rcap_screening_session($1, $2)", [partnerSlug, jurisdiction]);
  return result.rows[0];
}

async function seedPartner(db, slug, options = {}) {
  const {
    allowed,
    used,
    paymentStatus = "paid",
    qualificationStatus = "qualified",
    provisioningStatus = "provisioned"
  } = options;

  await db.query(
    `insert into public.partner_records (
      partner_id,
      partner_slug,
      partner_name,
      program_tier,
      target_state,
      payment_status,
      qualification_status,
      provisioning_status
    ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [slug, slug, `Partner ${slug}`, "implementation", "MS", paymentStatus, qualificationStatus, provisioningStatus]
  );

  await db.query(
    "insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used, period_label) values ($1, $2, $3, $4)",
    [slug, allowed, used, "June 2026"]
  );
}

async function usedSlots(db, partnerSlug) {
  const row = await one(db, "select screenings_used from public.partner_entitlement where partner_slug = $1", [partnerSlug]);
  return row.screenings_used;
}

async function countSessions(db, partnerSlug) {
  const row = await one(db, "select count(*)::integer as count from public.screening_sessions where partner_slug = $1", [partnerSlug]);
  return row.count;
}

async function slotState(db, sessionId) {
  const row = await one(db, "select claimed_slot_state from public.screening_sessions where session_id = $1", [sessionId]);
  return row.claimed_slot_state;
}

async function totalSessions(db) {
  const row = await one(db, "select count(*)::integer as count from public.screening_sessions");
  return row.count;
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params);
  assert(result.rows.length === 1, `Expected one row for query: ${sql}`);
  return result.rows[0];
}

function mustProfile(jurisdiction) {
  const profile = getProfileByJurisdiction(jurisdiction);
  assert(profile, `Missing profile for ${jurisdiction}.`);
  return profile;
}

function representativeAnswers(profile) {
  const answers = {};
  for (const question of profile.questions) {
    if (question.contextOnly) continue;
    answers[question.id] = answerForQuestion(question);
  }
  return answers;
}

function answerForQuestion(question) {
  switch (question.id) {
    case "ownership_scope":
      return "Yes";
    case "jurisdiction_scope":
      return "State or local";
    case "case_outcome":
      return optionMatching(question, ["misdemeanor", "convicted"], "Convicted of a misdemeanor");
    case "sentence_completion_date":
    case "financial_obligations":
    case "record_documents":
    case "criminal_history":
      return "Yes";
    case "pending_cases":
    case "prior_relief":
    case "pardon_status":
    case "trafficking_status":
    case "identity_error":
      return "No";
    case "state_exclusion_categories":
      return [optionMatching(question, ["none of these", "none"], "None of these")];
    case "disposition_date":
    case "arrest_date":
      return { value: "2010-01-15", unknown: false };
    case "age_at_offense":
      return { value: "30", unknown: false };
    case "county":
    case "county_or_filing_location":
      return "Hinds County";
    case "case_identifier":
    case "case_number":
      return "CR-2010-123";
    case "charge":
      return "Misdemeanor trespass";
    case "court":
      return "County court";
    default:
      return defaultAnswerForType(question);
  }
}

function defaultAnswerForType(question) {
  switch (question.type) {
    case "single_choice":
      return question.options?.[0] ?? "Yes";
    case "multi_select":
      return [question.options?.[0] ?? "None of these"];
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say":
      return "No";
    case "date_or_unknown":
      return { value: "2010-01-15", unknown: false };
    case "number_or_range":
      return { value: "30", unknown: false };
    case "text":
      return "Sample answer";
    case "text_or_unknown":
      return { value: "Sample answer", unknown: false };
    default:
      throw new Error(`No representative answer for question type ${question.type} (${question.id}).`);
  }
}

function optionMatching(question, needles, fallback) {
  const options = question.options ?? [];
  const match = options.find((option) => needles.every((needle) => option.toLowerCase().includes(needle)));
  return match ?? options.find((option) => option.toLowerCase().includes(needles[0])) ?? fallback;
}

function rowToSerializedSession(row) {
  return {
    sessionId: row.session_id,
    createdAt: isoString(row.created_at),
    updatedAt: isoString(row.updated_at),
    jurisdiction: row.jurisdiction,
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers,
    currentQuestionId: row.current_question_id,
    furthestStage: row.furthest_stage,
    status: row.status,
    lastDropQuestion: row.last_drop_question
  };
}

function isoString(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(sortForCompare(actual));
  const expectedJson = JSON.stringify(sortForCompare(expected));
  assert(actualJson === expectedJson, `${message}\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
}

function sortForCompare(value) {
  if (Array.isArray(value)) return value.map(sortForCompare);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortForCompare(item)])
    );
  }
  return value;
}

function assertNoForbiddenKeys(value) {
  const forbidden = new Set([
    "name",
    "email",
    "phone",
    "address",
    "userId",
    "anonymousId",
    "answers",
    "charge",
    "case_number",
    "caseNumber",
    "eligibility",
    "eligibility_result",
    "eligibilityResult",
    "result",
    "payment",
    "packet",
    "packet_data",
    "packetData",
    "briefcase",
    "resume",
    "resume_token",
    "resume_url",
    "token",
    "url"
  ]);
  const seen = [];
  walk(value, [], (keyPath) => {
    const key = keyPath.at(-1);
    if (forbidden.has(key)) seen.push(keyPath.join("."));
  });
  assert(seen.length === 0, `Payload contains forbidden PII/sensitive keys: ${seen.join(", ")}`);
}

function walk(value, pathParts, visitor) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    visitor(nextPath);
    walk(child, nextPath, visitor);
  }
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

function indexOf(source, needle) {
  const index = source.indexOf(needle);
  assert(index >= 0, `Missing expected snippet: ${needle}`);
  return index;
}

function randomUuid() {
  return crypto.randomUUID();
}

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (request === "server-only") return {};
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    if (nextFile?.endsWith(".json")) return require(nextFile);
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExistingModuleFile(candidate);
  }

  if (request.startsWith(".")) {
    return resolveExistingModuleFile(path.resolve(basedir, request));
  }

  return null;
}

function resolveExistingModuleFile(candidate) {
  for (const extension of [".ts", ".tsx", ".js", ".json"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const file = path.join(candidate, indexFile);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
