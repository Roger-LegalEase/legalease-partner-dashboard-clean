export const SHARED_SCOPE_GUARD_ENV_FILES = [
  ".env.example"
];

export const SHARED_PAYMENT_FILES = [
  "src/app/api/expungement-ai/checkout/route.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/lib/stripe/server.ts",
  "src/lib/expungement-ai/briefcase.ts",
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/lib/expungement-ai/payment-adapter.ts"
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
  "supabase/phase-32-expungement-screening-sessions.sql"
];

export const SCREENING_DROP_POINT_NUDGE_FILES = [
  "src/app/api/expungement-ai/screening/nudge/opt-out/route.ts",
  "supabase/phase-34-expungement-screening-drop-point-nudges.sql"
];

export const RCAP_PARTNER_MODE_FILES = [
  "src/app/intake/[partnerSlug]/page.tsx",
  "src/app/expungement-ai/screening/[state]/page.tsx",
  "src/components/expungement-ai/screening/ScreeningFlow.tsx",
  "src/lib/expungement-ai/rcap-partner-intake.ts",
  "supabase/phase-35-rcap-partner-entitlement.sql",
  "supabase/phase-35b-rcap-screening-session-partner-mode.sql",
  "supabase/phase-35c-rcap-claim-screening-session.sql"
];

export const REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES = [
  ...SHARED_SCOPE_GUARD_ENV_FILES,
  ...SHARED_PAYMENT_FILES,
  ...EXPUNGEMENT_DATA_LAYER_FILES,
  ...SCREENING_RESUME_FILES,
  ...SCREENING_DROP_POINT_NUDGE_FILES,
  ...RCAP_PARTNER_MODE_FILES
];
