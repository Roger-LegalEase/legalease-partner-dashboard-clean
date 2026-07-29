export const SHARED_SCOPE_GUARD_ENV_FILES = [
  ".env.example"
];

export const SHARED_PAYMENT_FILES = [
  // Consumer payment entry page. Reviewed for the launch payment-guard PR: it renders the
  // already-paid "continue to your packet" state (P0 double-charge guard) and is not a source-
  // engine, auth, billing, or Stripe-secret surface.
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/api/expungement-ai/checkout/route.ts",
  "src/app/api/expungement-ai/checkout/status/route.ts",
  "src/app/api/expungement-ai/payment/confirm/route.ts",
  "src/app/api/method/expungement.api.payment.stripe_webhook/route.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/lib/stripe/server.ts",
  // Shared handler both Stripe webhook routes delegate to (route-specific secret verification,
  // verified-event dispatch, and — as of the launch payment-guard PR — removal of the temporary
  // legacy secret-prefix/length diagnostics). Reviewed as in-scope payment infrastructure.
  "src/lib/stripe/webhook-handler.ts",
  "src/lib/expungement-ai/briefcase.ts",
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/lib/expungement-ai/payment-adapter.ts"
];

export const INTERNAL_RCAP_ALLOWANCE_FILES = [
  "src/app/api/internal/partners/rcap-allowance/route.ts",
  "src/app/internal/partners/admin/[partnerSlug]/RcapAllowanceControl.tsx",
  "src/app/internal/partners/admin/[partnerSlug]/page.tsx",
  "src/lib/expungement-ai/rcap-entitlement-admin.ts",
  "src/lib/partners/routes.ts"
];

export const SCREENING_RESUME_FILES = [
  "src/app/api/expungement-ai/screening/save-resume/route.ts",
  "src/app/api/expungement-ai/screening/resume/confirm/route.ts",
  "src/app/api/expungement-ai/screening/resume/resend/route.ts",
  "src/app/expungement-ai/screening/resume/page.tsx",
  "src/components/expungement-ai/screening/ResumeScreeningClient.tsx",
  "src/components/expungement-ai/screening/ScreeningFlow.tsx",
  "supabase/phase-33-expungement-screening-resume-links.sql"
];

export const EXPUNGEMENT_DATA_LAYER_FILES = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-29-consumer-wilma-telemetry.sql",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "supabase/phase-32-expungement-screening-sessions.sql",
  // Phase 37 (reviewed): additive constraint/index expansion on rcap_document_packets for the
  // all-51 source-driven packet set. Its header states it does not alter RLS, auth, Stripe, or
  // generated packet behavior; it only widens the allowed state/pathway/document-type values.
  "supabase/phase-37-rcap-document-packets-all-state-source-constraints.sql"
];

export const SCREENING_DROP_POINT_NUDGE_FILES = [
  "src/app/api/expungement-ai/screening/nudge/opt-out/route.ts",
  "supabase/phase-34-expungement-screening-drop-point-nudges.sql"
];

export const RCAP_PARTNER_MODE_FILES = [
  "src/app/api/expungement-ai/screening/complete/route.ts",
  "src/app/expungement-ai/packet-ready/page.tsx",
  "src/app/intake/[partnerSlug]/page.tsx",
  "src/app/expungement-ai/screening/[state]/page.tsx",
  "src/components/expungement-ai/screening/ScreeningFlow.tsx",
  "src/lib/expungement-ai/rcap-partner-intake.ts",
  "src/lib/expungement-ai/rcap-slot-lifecycle.ts",
  "src/lib/expungement-ai/nudge-os-events.ts",
  "supabase/phase-35-rcap-partner-entitlement.sql",
  "supabase/phase-35b-rcap-screening-session-partner-mode.sql",
  "supabase/phase-35c-rcap-claim-screening-session.sql",
  "supabase/phase-35d-rcap-slot-lifecycle.sql",
  // Phase 39 (reviewed): partner-only packet-cap semantics. Partner accounts,
  // screening starts, and screening completion do not consume cap; packet cap
  // is recorded only by the partner packet-generation RPC.
  "supabase/phase-39-rcap-partner-packet-cap.sql"
];

// Roger approved this single auth-route change: passwordResetRedirectTo() may prefer
// NEXT_PUBLIC_PARTNER_APP_URL and fall back to NEXT_PUBLIC_APP_URL so partner password-reset links
// use https://legaleasepartner.com. The approval is scoped to that one-line redirect-base change
// only — no token, session, or Supabase auth logic — and to this one file. Do not broaden it.
export const ROGER_APPROVED_PARTNER_RESET_URL_FILES = [
  "src/app/auth/forgot-password/page.tsx"
];

// Reviewed for Expungement.ai DTC release gate: auth confirmation may claim a pending DTC
// screening result and continue to payment; Phase 38 is a migration file only and must not be
// applied to production except through Roger-approved DB process.
export const DTC_PENDING_RESULT_RELEASE_GATE_FILES = [
  "src/app/auth/set-password/page.tsx",
  "supabase/phase-38-expungement-pending-screening-results.sql"
];

// Reviewed for PR #68: the We Must Vote Mississippi sponsored packet bridge connects
// Expungement.ai Briefcase artifacts to the existing Mississippi packet information flow.
// Keep this scoped to the exact files touched by that bridge; do not allow directories.
export const MS_SPONSORED_PACKET_BRIDGE_FILES = [
  "src/app/api/expungement-ai/screening/save-result/route.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/components/expungement-ai/BriefcaseViews.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/app/documents/[partnerSlug]/form/page.tsx",
  "src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx",
  "src/app/api/rcap/documents/[packetId]/generate/route.ts",
  "src/app/api/expungement-ai/packet/generate/route.ts",
  "src/app/api/expungement-ai/packet/status/route.ts",
  "src/app/expungement-ai/packet-ready/page.tsx"
];

// Reviewed for the RCAP partner access-codes feature: partner-controlled access
// codes, code-level attribution, and packet-cap overage billing. Migration
// (phase-41) is additive and file-only; new routes/pages are partner-scoped and
// server-authorized. Kept file-level (no directories) per the scope-guard rule.
export const PARTNER_ACCESS_CODES_FILES = [
  "supabase/phase-41-rcap-partner-access-codes.sql",
  // Phase 41B (reviewed): append-only, privacy-conscious screening analytics
  // events for code/campaign reporting. Stores coarse outcome categories only —
  // no answers, no record detail. DTC/un-attributed sessions never appear.
  "supabase/phase-41b-rcap-screening-analytics.sql",
  "src/app/partner/dashboard/page.tsx",
  "src/app/partner/access-codes/page.tsx",
  "src/app/partner/access-codes/PartnerAccessCodesManager.tsx",
  "src/app/api/partners/access-codes/route.ts",
  "src/app/api/partners/access-codes/toggle/route.ts",
  "src/app/api/partners/access-mode/route.ts",
  "src/app/api/rcap/access-code/validate/route.ts"
];

// Reviewed for the standardized RCAP partner onboarding workflow. Additive:
// phase-42 adds partner_onboarding + partner_onboarding_tasks and reuses the
// existing partner_entitlement (cap/overage), partner_records.access_mode, and
// partner_users systems. Internal pages/routes are internal-admin gated; the
// partner-facing route is scoped to the caller's own partner.
export const PARTNER_ONBOARDING_FILES = [
  "supabase/phase-42-partner-onboarding.sql",
  // Phase 43 (reviewed): additive RCAP Partner Onboarding Phase 1 workspace,
  // section, asset, review, and tenant-isolation schema. Migration file only;
  // it remains unapplied until the separately approved database process.
  "supabase/phase-43-rcap-partner-onboarding-phase1.sql",
  // Phase 44 (reviewed): additive prefill batches/values, tenant RLS, bounded
  // service-only RPCs, partner-safe review metadata, and no remote application.
  "supabase/phase-44-rcap-onboarding-prefill.sql",
  // Phase 45 (reviewed): additive Phase 2A artifact, version, and review tables
  // with tenant RLS, column-bounded partner grants, and service-role-only
  // mutation RPCs. Migration file only; it adds no launch-check or
  // launch-approval table and grants no publication, invitation, access-code,
  // payment, or activation capability. Applied to a local loopback stack only.
  "supabase/phase-45-rcap-onboarding-artifacts.sql",
  // Phase 46 (reviewed): widens one CHECK constraint so the contacts table
  // accepts the media contact role the Operations and Escalation Plan has to
  // name. No table, no column, no grant, no capability; applied to a local
  // loopback stack only.
  "supabase/phase-46-rcap-onboarding-media-contact-role.sql",
  "src/app/api/internal/partners/onboarding/route.ts",
  "src/app/api/internal/partners/onboarding/[partnerSlug]/route.ts",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/route.ts",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/prefill/route.ts",
  "src/app/api/partners/onboarding/route.ts",
  "src/app/api/partners/onboarding/assets/route.ts",
  "src/app/api/partners/onboarding/assets/[assetId]/route.ts",
  "src/app/api/partners/onboarding/checklist/route.ts",
  "src/app/api/partners/onboarding/sections/[sectionKey]/route.ts",
  "src/app/api/partners/onboarding/submit/route.ts",
  "src/app/api/partners/onboarding/workspace/route.ts",
  "src/app/internal/partners/onboarding/page.tsx",
  "src/app/internal/partners/onboarding/new/page.tsx",
  "src/app/internal/partners/onboarding/new/NewPartnerForm.tsx",
  "src/app/internal/partners/onboarding/[partnerSlug]/page.tsx",
  "src/app/internal/partners/onboarding/[partnerSlug]/OnboardingWizard.tsx",
  "src/app/internal/partners/onboarding/[partnerSlug]/Phase1PrefillPanel.tsx",
  "src/app/partner/onboarding/page.tsx",
  "src/app/partner/onboarding/PartnerOnboardingChecklist.tsx",
  "src/app/partner/onboarding/OnboardingDashboardCard.tsx",
  "src/app/partner/onboarding/Phase1OnboardingHome.tsx",
  "src/app/partner/onboarding/[sectionKey]/page.tsx",
  "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx",
  "src/app/partner/onboarding/review/page.tsx",
  "src/app/partner/onboarding/review/OnboardingReviewClient.tsx",
  // Legacy slug routes remain available but redirect an authenticated member to
  // the canonical Phase 1 portal when the default-off feature flag is enabled.
  "src/app/partners/onboarding/[partnerSlug]/page.tsx",
  "src/app/partners/onboarding/[partnerSlug]/email-sequence/page.tsx",
  "src/app/partners/onboarding/[partnerSlug]/launch-kit/page.tsx",
  "src/lib/partners/onboarding/prefill-domain.ts",
  "src/lib/partners/onboarding/prefill-service.ts",
  // Phase 2A artifacts (reviewed). New modules, routes, and panels only; the
  // partner and internal surfaces reuse the existing Phase 1 shells. Downloads
  // are bounded private server responses with no public URL.
  "src/lib/partners/onboarding/artifact-domain.ts",
  "src/lib/partners/onboarding/artifact-generator.ts",
  "src/lib/partners/onboarding/artifact-service.ts",
  "src/lib/partners/onboarding/artifact-pdf.ts",
  "src/components/partners/onboarding/ArtifactDocumentView.tsx",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/download/route.ts",
  "src/app/api/partners/onboarding/artifacts/route.ts",
  "src/app/api/partners/onboarding/artifacts/download/route.ts",
  "src/app/internal/partners/onboarding/[partnerSlug]/Phase2AArtifactsPanel.tsx",
  "src/app/partner/onboarding/artifacts/page.tsx",
  "src/app/partner/onboarding/artifacts/PartnerArtifactsClient.tsx",
  // Phase 2A part 2 (reviewed). The remaining document generators and the
  // co-branded page configuration, on top of the same artifact tables: no new
  // table, no migration, and no publication, activation, invitation, or
  // access-code capability. The co-branded page area prepares and approves
  // only; the LegalEase page-language panel writes six named, length-bounded
  // phase-42 columns and nothing else. The internal asset route is read-only
  // and exists so the preview can show the partner's real logo.
  "src/components/partners/onboarding/CoBrandedPageView.tsx",
  "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx",
  "src/app/internal/partners/onboarding/[partnerSlug]/LegalEasePublicPageLanguagePanel.tsx",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/assets/[assetId]/route.ts"
];

// First-administrator provisioning (reviewed). Gives an internal operator a
// reviewed, revocable way to hand a partner organization its first authenticated
// administrator. New modules and routes only; the sole edits to existing screens
// are the provisioning detail that hosts the panel and the shared password screen
// that finalizes a server-verified invitation.
//
// Scope discipline: no migration (invitation state is a partner-scoped
// partner_events record holding only a SHA-256 token hash), no RLS/auth/session
// change, no Stripe or billing surface, no source-engine or packet surface, and
// no public self-signup. Membership remains one partner_users row written only
// after acceptance. Verified by scripts/verify-first-admin-provisioning.mjs and,
// against a loopback Supabase stack, by
// scripts/test-first-admin-supabase-lifecycle.mjs.
export const FIRST_ADMIN_PROVISIONING_FILES = [
  "src/lib/partners/first-admin-domain.ts",
  "src/lib/partners/first-admin-service.ts",
  "src/lib/partners/first-admin-request-security.ts",
  "src/app/api/internal/partners/first-admin/[partnerSlug]/route.ts",
  "src/app/api/partners/first-admin/accept/route.ts",
  // Anonymous token-claim route. It exchanges a setup token for a one-time
  // Supabase session and redirects to the shared password screen; it stores no
  // credential of its own.
  "src/app/partner/setup/route.ts",
  "src/app/internal/partners/provisioning/[partnerSlug]/FirstAdminAccessPanel.tsx",
  "src/app/internal/partners/provisioning/[partnerSlug]/page.tsx",
  "src/app/internal/partners/provisioning/page.tsx",
  // Password and sign-in screens: first-admin acceptance finalization on the
  // former, and real label association on the password fields of both.
  "src/app/auth/set-password/page.tsx",
  "src/app/sign-in/page.tsx",
  // Focused first-admin adapter over the existing default-off provider
  // configuration. Delivery stays off unless every provider value is present.
  "src/lib/email/email-service.ts"
];

// Reviewed for the Command Center product-event wire-up. Additive analytics egress only: the
// ingestion route gains a fire-and-forget mirror of rows it already stores, gated on a genuinely new
// insert. No source-engine, auth, billing, or Stripe-secret surface is touched, and no user-facing
// response changes. Kept file-level (no directories) per the scope-guard rule.
export const COMMAND_CENTER_PRODUCT_EVENT_FILES = [
  // Phase 40 (reviewed): privacy-limited web analytics event storage.
  "supabase/phase-40-web-analytics-events.sql",
  "src/app/api/analytics/web/route.ts",
  // Health reports whether the existing OS exporter is configured. This reviewed
  // change only follows the split LegalEase OS endpoint variable; it sends no event.
  "src/app/api/health/route.ts"
];

// Phase 43: the shared content publishing platform (Expungement.ai blog/resources + LegalEase
// Partner insights/stories, the internal CMS, and the Command Center promotion boundary).
//
// Scope discipline, stated explicitly because this group is large:
//   - It adds NEW routes. It does not modify any live screening, eligibility, packet, Stripe,
//     Briefcase, partner-intake, or partner-dashboard surface.
//   - The three MODIFIED files are additive: globals.css appends article styles, sitemap.ts adds
//     the new content URLs while keeping every existing state entry, and robots.ts is new.
//   - supabase/phase-43-content-platform.sql is a MIGRATION FILE ONLY and has not been applied to
//     any database. It creates only content_* tables and touches no existing table, RLS policy,
//     or auth logic.
// Files are enumerated individually (no directories), matching the convention of the other groups.
export const CONTENT_PLATFORM_FILES = [
  // Public surfaces (Expungement.ai). These MUST be listed here.
  //
  // The guards disagree about src/app/expungement-ai/, so it cannot be assumed exempt:
  //   - test-inspect-local-record-clearing-pdfs.mjs FILTERS the prefix out (it is checking that the
  //     PDF-inspection work did not touch live routes, and the consumer app is not its concern).
  //   - verify-all50-internal-preview.mjs / verify-all51-launch-enabled.mjs pass it as an
  //     extraForbiddenPrefix, because the all-50 source-engine work must never quietly edit the
  //     live consumer surface.
  // The second is the stricter and correct reading for this branch: these are net-new marketing/
  // editorial routes on the consumer app, so they are declared explicitly rather than exempted.
  // They add no screening, eligibility, payment, or packet behavior — see
  // scripts/verify-content-state-resources.mjs, which fails the build if any of them imports the
  // rcap-engine, a state pack, or a checkout surface.
  "src/app/expungement-ai/blog/page.tsx",
  "src/app/expungement-ai/blog/[slug]/page.tsx",
  "src/app/expungement-ai/blog/feed.xml/route.ts",
  "src/app/expungement-ai/authors/[slug]/page.tsx",
  "src/app/expungement-ai/resources/page.tsx",
  "src/app/expungement-ai/resources/[jurisdiction]/page.tsx",
  // Public surfaces (LegalEase Partner).
  "src/app/partners/layout.tsx",
  "src/app/partners/insights/page.tsx",
  "src/app/partners/insights/[slug]/page.tsx",
  "src/app/partners/insights/feed.xml/route.ts",
  "src/app/partners/partner-stories/page.tsx",
  "src/app/partners/partner-stories/[slug]/page.tsx",
  "src/app/partners/authors/[slug]/page.tsx",
  "src/app/partners/resources/page.tsx",
  // SEO surfaces.
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/app/globals.css",
  // Internal CMS.
  "src/app/internal/content/layout.tsx",
  "src/app/internal/content/page.tsx",
  "src/app/internal/content/articles/page.tsx",
  "src/app/internal/content/articles/new/page.tsx",
  "src/app/internal/content/articles/[id]/page.tsx",
  "src/app/internal/content/state-resources/page.tsx",
  "src/app/internal/content/state-resources/[jurisdiction]/page.tsx",
  "src/app/internal/content/partner-stories/page.tsx",
  "src/app/internal/content/testimonials/page.tsx",
  "src/app/internal/content/authors/page.tsx",
  "src/app/internal/content/media/page.tsx",
  "src/app/internal/content/social/page.tsx",
  "src/app/internal/content/reviews/page.tsx",
  "src/app/internal/content/scheduled/page.tsx",
  "src/app/internal/content/settings/page.tsx",
  // Authenticated content APIs.
  "src/app/api/internal/content/posts/route.ts",
  "src/app/api/internal/content/posts/[id]/route.ts",
  "src/app/api/internal/content/posts/[id]/transition/route.ts",
  "src/app/api/internal/content/posts/[id]/versions/route.ts",
  "src/app/api/internal/content/posts/[id]/versions/restore/route.ts",
  "src/app/api/internal/content/media/route.ts",
  "src/app/api/internal/content/media/[id]/route.ts",
  "src/app/api/internal/content/social/[postId]/route.ts",
  "src/app/api/internal/content/promotion/[postId]/export/route.ts",
  "src/app/api/internal/content/promotion/[postId]/send/route.ts",
  "src/app/api/internal/content/state-editorial/[code]/route.ts",
  "src/app/api/internal/content/authors/route.ts",
  // System routes: scheduler (secret-gated), Command Center status callback (HMAC-gated),
  // social-card preview (content-session-gated), public OG image (published posts only), and the
  // media route — the only way bytes leave the PRIVATE content-media bucket. It checks
  // content_media_is_public() before minting a short-lived signed URL, so an asset attached only to
  // an unpublished draft 404s.
  "src/app/api/content/media/[mediaId]/route.ts",
  "src/app/api/content/scheduler/run/route.ts",
  "src/app/api/content/command-center/status/route.ts",
  "src/app/api/content/social-card/route.ts",
  "src/app/api/content/og/[postId]/route.ts",
  // Migration file only — not applied to any database.
  "supabase/phase-43-content-platform.sql"
];

export const REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES = [
  ...SHARED_SCOPE_GUARD_ENV_FILES,
  ...COMMAND_CENTER_PRODUCT_EVENT_FILES,
  ...SHARED_PAYMENT_FILES,
  ...INTERNAL_RCAP_ALLOWANCE_FILES,
  ...EXPUNGEMENT_DATA_LAYER_FILES,
  ...SCREENING_RESUME_FILES,
  ...SCREENING_DROP_POINT_NUDGE_FILES,
  ...RCAP_PARTNER_MODE_FILES,
  ...PARTNER_ACCESS_CODES_FILES,
  ...PARTNER_ONBOARDING_FILES,
  ...FIRST_ADMIN_PROVISIONING_FILES,
  ...ROGER_APPROVED_PARTNER_RESET_URL_FILES,
  ...DTC_PENDING_RESULT_RELEASE_GATE_FILES,
  ...MS_SPONSORED_PACKET_BRIDGE_FILES,
  ...CONTENT_PLATFORM_FILES
];
