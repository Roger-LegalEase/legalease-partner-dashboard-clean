export const SHARED_SCOPE_GUARD_ENV_FILES = [
  ".env.example"
];

export const SHARED_PAYMENT_FILES = [
  "src/app/api/expungement-ai/checkout/route.ts",
  "src/app/api/expungement-ai/checkout/status/route.ts",
  "src/app/api/expungement-ai/payment/confirm/route.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/lib/stripe/server.ts",
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
  "supabase/phase-35d-rcap-slot-lifecycle.sql"
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

export const REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES = [
  ...SHARED_SCOPE_GUARD_ENV_FILES,
  ...SHARED_PAYMENT_FILES,
  ...INTERNAL_RCAP_ALLOWANCE_FILES,
  ...EXPUNGEMENT_DATA_LAYER_FILES,
  ...SCREENING_RESUME_FILES,
  ...SCREENING_DROP_POINT_NUDGE_FILES,
  ...RCAP_PARTNER_MODE_FILES,
  ...ROGER_APPROVED_PARTNER_RESET_URL_FILES,
  ...DTC_PENDING_RESULT_RELEASE_GATE_FILES,
  ...MS_SPONSORED_PACKET_BRIDGE_FILES
];
