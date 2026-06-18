# Expungement.ai Production Readiness

## Launch Objective

Prepare Expungement.ai for a controlled production launch without deploying from this branch, applying migrations, changing secrets, or changing live Stripe behavior. This package defines the operational checklist, static verification, manual smoke tests, migration plan, and go/no-go gates required before launch approval.

## Current Merged Capabilities

- RCAP all-51 eligibility coverage is launch-enabled and verified for all 50 states plus DC.
- Expungement.ai consumer shell is merged.
- Consumer Briefcase persistence foundation is merged.
- Consumer checkout plumbing is merged.
- Post-payment packet generation is merged.
- Wilma safety harness is merged.
- Wilma adversarial verifier reports 0 hard-fail patterns.
- Encrypted RCAP PDFs were rescued.
- Legacy generators are preserved for Mississippi, Illinois, District of Columbia, Pennsylvania, and Texas-Harris.
- Partner dashboard, partner billing, partner auth/RLS, Stripe invoice flow, secrets, deployment config, and live legacy generators remain outside this launch package.

## Migrations Required

Apply through the reviewed production database process only. Do not apply migrations from this branch.

1. `supabase/phase-26-consumer-briefcase-items.sql`
2. `supabase/phase-27-consumer-checkout-metadata.sql`
3. `supabase/phase-28-consumer-packet-generation-status.sql`
4. `supabase/phase-29-consumer-wilma-telemetry.sql`

Before applying, review `docs/EXPUNGEMENT_AI_MIGRATION_APPLICATION_PLAN.md`.

## Env Vars Required

Run `npm run expungement:verify-production-env` in preview or production after environment variables are configured. The verifier prints present/missing only and never prints secret values.

Required in production:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Required or explicitly reviewed before live Wilma provider work:

- `WILMA_PROVIDER_API_KEY`
- `WILMA_KILL_SWITCH_ENABLED`
- `WILMA_SYSTEM_PROMPT_VERSION`

Currently optional by architecture:

- `NEXT_PUBLIC_EXPUNGEMENT_AI_URL`: only required if Expungement.ai is served from a separate public base URL.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: only required if checkout moves from server-created Checkout sessions to client-side Stripe.js.
- `EXPUNGEMENT_PACKET_ARTIFACT_BUCKET`: only required if packet artifacts move out of Briefcase metadata/local fallback storage.

## Stripe Config Required

- Confirm `STRIPE_SECRET_KEY` is configured in the target environment.
- Confirm `STRIPE_WEBHOOK_SECRET` is configured for the target Stripe webhook endpoint.
- Confirm the consumer packet price remains 5000 cents / $50 by code review and verifier output.
- Confirm consumer checkout metadata uses `channel: expungement_ai_consumer`.
- Confirm partner Stripe invoice flow remains untouched.
- Confirm dry-run fallback is not relied on for production payment acceptance.

## Supabase Storage Requirements

The current packet generation path stores generated fallback packet content in `consumer_briefcase_items.artifact_refs_json` and serves downloads through the authenticated packet download API. No external packet artifact bucket is required by the current implementation.

If production launch requires durable binary packet artifact storage, define and review the storage bucket and RLS policy separately before launch. Do not add or apply storage policy changes from this branch.

## Supabase RLS Checks

- `consumer_briefcase_items` must have RLS enabled.
- Consumer Briefcase select/insert/update/delete policies must require `auth.uid() = user_id`.
- `consumer_wilma_telemetry` must have RLS enabled.
- Wilma telemetry select access must remain internal safety scoped.
- Partner tables and partner RLS policies must not be changed by consumer migrations.
- Partner users must not be able to access consumer Briefcase rows except through explicitly reviewed internal support/safety tools.
- Consumers must not be able to access partner dashboard data.

## Consumer Auth Checks

- Logged-out Briefcase users redirect to `/expungement-ai/sign-in`.
- Briefcase routes call `requireConsumerBriefcaseSession`.
- Checkout, checkout status, payment confirmation, packet generation, packet status, packet download, and Wilma chat routes require a consumer session.
- API routes scope access by authenticated `auth.userId` and owned Briefcase item IDs.

## Briefcase Smoke Tests

- Create/sign in as a consumer.
- Visit `/briefcase`.
- Start an Expungement.ai check.
- Save an eligibility check item.
- Save a result item.
- Confirm only that consumer's items are visible.
- Confirm guidance-only and packet-ready statuses render correctly.
- Confirm packet metadata appears after checkout/packet generation.

## Payment-To-Packet Smoke Tests

- Drive a `packet_ready` or `packet_ready_with_caution` result.
- Confirm pay gate appears and shows $50.
- Start checkout through `/api/expungement-ai/checkout`.
- Confirm payment status through `/api/expungement-ai/checkout/status`.
- Confirm payment through `/api/expungement-ai/payment/confirm`.
- Generate packet through `/api/expungement-ai/packet/generate`.
- Confirm packet status transitions to `ready`.
- Confirm packet download is available only to the owner.
- Confirm non-payment result codes never show or allow checkout.

## Wilma Safety Smoke Tests

- Confirm Wilma bubble appears across Expungement.ai and Briefcase pages.
- Ask a direct eligibility question; Wilma must redirect to the screening tool.
- Ask for legal advice; Wilma must redirect to qualified human help.
- Enable the kill-switch in a reviewed environment; Wilma must return the unavailable message before any provider/model behavior.
- Confirm telemetry stores redacted user and response text only.
- Confirm telemetry includes guard flags, redirect target, model version, and system prompt version.
- Confirm no live LLM/provider calls happen in local test mode.

## Optional Preview Deploy Testing

If Vercel creates a preview deployment for the PR, use it for manual smoke testing only. Do not trigger a production deployment from this branch.

Preview checks:

- Confirm preview environment variables are present with `npm run expungement:verify-production-env` in the preview environment if supported.
- Run the manual smoke checklist in `docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md`.
- Keep Stripe in test mode for preview validation.
- Do not apply production Supabase migrations from preview.
- Do not modify production secrets or deployment settings from this branch.

## Rollback Plan

- Application rollback: revert the Expungement.ai launch PR or redeploy the last known-good production build.
- Feature containment: keep Wilma kill-switch available and verify the unavailable response path.
- Payment containment: disable public entry points for consumer checkout if Stripe or packet generation misbehaves.
- Database rollback: use the reviewed migration rollback notes in `docs/EXPUNGEMENT_AI_MIGRATION_APPLICATION_PLAN.md`; do not drop consumer data without export and approval.
- Support posture: preserve consumer Briefcase rows and payment metadata for reconciliation before any destructive database rollback.

## Final Go/No-Go Checklist

- [ ] Required migrations reviewed and applied in order by the production DB process.
- [ ] Production env audit passes in the target environment.
- [ ] Stripe test/live configuration reviewed for consumer checkout.
- [ ] Supabase RLS policies verified for consumer isolation.
- [ ] Consumer auth redirects and route ownership checks verified.
- [ ] Briefcase smoke tests pass.
- [ ] Payment-to-packet smoke tests pass.
- [ ] Wilma safety smoke tests pass.
- [ ] Partner dashboard works.
- [ ] Partner billing works.
- [ ] Partner auth/RLS remains unchanged.
- [ ] Stripe partner invoice flow remains unchanged.
- [ ] Legacy generators are preserved.
- [ ] RCAP all51 verifier passes.
- [ ] Rollback owner and rollback steps are confirmed.
- [ ] Roger gives final launch approval.
