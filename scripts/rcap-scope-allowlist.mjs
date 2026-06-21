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

export const SCREENING_DROP_POINT_NUDGE_FILES = [
  "src/app/api/expungement-ai/screening/nudge/opt-out/route.ts",
  "supabase/phase-34-expungement-screening-drop-point-nudges.sql"
];

export const REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES = [
  ...SHARED_SCOPE_GUARD_ENV_FILES,
  ...SHARED_PAYMENT_FILES,
  ...SCREENING_RESUME_FILES,
  ...SCREENING_DROP_POINT_NUDGE_FILES
];
