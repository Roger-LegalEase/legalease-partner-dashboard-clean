# Execution Authorization Block — five-migration system, prepared, NOT granted

Mirrors the captain's data-driven readiness record
(`data/rcap-staging-authorization-readiness.json`, readyToRequestAuthorization:
**false**) and the machine-derived action (`data/rcap-staging-action.json`,
`staging-action-five-migrations`, status `prepared_queued_not_authorized`).
Fields verified from the repository in this session are marked VERIFIED;
everything else is visibly BLANK or BLOCKED. A chat-level grant fills nothing:
migration grants must land in the captain-owned queue record.

```
EXECUTE_STAGING_AUTHORIZED:      BLANK — not granted; readiness record says authorization is NOT being requested yet
AUTHORIZED_BY:                   BLANK — must be Roger Roman
AUTHORIZATION_TIMESTAMP:         BLANK
STAGING_ENVIRONMENT_NAME:        BLANK — no environment named anywhere in repo or container
STAGING_SUPABASE_PROJECT:        BLANK — with credentials via session secret store only
FINAL_INTEGRATION_BRANCH:        claude/rcap-final-sprint-integration (VERIFIED — canonical per the branch ruling)
FINAL_INTEGRATION_SHA:           BLANK by construction — action file's finalAcceptedSha is null (a record cannot name the commit containing it); populate at the accepted tip after CI + Terminal B re-audit. Preflight base this session: 7e1b2c4dc1e433c07f9d0819c8125e228da4b236
SECURITY_CHECKPOINT_SHA:         13e356c49bd484e6f946ba604076718d904bca86 (VERIFIED from the action file)
REQUIRED_GITHUB_CHECKS_GREEN:    OBSERVED GREEN at 7e1b2c4d (both required workflows success, GitHub API this session) — caveat: SF-DEFECT-001 latent, green not yet proven determinate
PHASE_49_MIGRATION_PATH:         supabase/phase-49-rcap-packet-render-jobs.sql (VERIFIED)
PHASE_49_SHA256:                 2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6 (VERIFIED = queue)
PHASE_49_AUTHORIZATION_ID:       auth-2026-08-10-phase-49-packet-render-jobs (VERIFIED — applyStaging: authorized)
PHASE_50_MIGRATION_PATH:         supabase/phase-50-rcap-packet-delivery-hardening.sql (VERIFIED)
PHASE_50_SHA256:                 15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62 (VERIFIED = queue)
PHASE_50_AUTHORIZATION_ID:       auth-2026-08-10-phase-50-packet-delivery-hardening (VERIFIED — staging queued)
PHASE_51_MIGRATION_PATH:         supabase/phase-51-rcap-consumer-payment-gate.sql (VERIFIED)
PHASE_51_SHA256:                 3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba (VERIFIED = queue)
PHASE_51_AUTHORIZATION_ID:       auth-2026-08-10-phase-51-consumer-payment-gate (VERIFIED — staging queued)
PHASE_52_MIGRATION_PATH:         supabase/phase-52-rcap-consumer-payment-authority.sql (VERIFIED)
PHASE_52_SHA256:                 c906068f7800df7dd9a34baff5830269f50bab3ddc7224b72f2e7369ff256bd3 (VERIFIED = queue)
PHASE_52_AUTHORIZATION_ID:       auth-2026-08-11-phase-52-consumer-payment-authority (VERIFIED — staging queued)
PHASE_53_MIGRATION_PATH:         supabase/phase-53-rcap-consumer-job-binding.sql (VERIFIED)
PHASE_53_SHA256:                 469ece83b54ef840f8571d90f0fbeed3ee16f246e906f0e44cc82ecac899b22f (VERIFIED = queue)
PHASE_53_AUTHORIZATION_ID:       auth-2026-08-11-phase-53-consumer-job-binding (VERIFIED — staging queued; "all five files")
FIVE_FILE_ACTION:                staging-action-five-migrations, order 49→50→51→52→53, indivisible 52/53 (VERIFIED)
SUPERSEDED_ACTIONS:              staging-action-two-migrations; staging-action-three-migrations; staging-action-four-migrations (VERIFIED with reasons in the action file)
APPLY_EVIDENCE_CHECKS:           finalize→consumer_packet_payment_valid (proven discriminating in a prior session run); record_consumer_packet_payment present; exactly one enqueue signature with the two binding params (commands §11)
APPLICATION_FIRST_PRECONDITION:  VERIFIED IN-REPO at 7e1b2c4d — signed webhook → single payment writer (server_webhook authority), consumer render route → Phase 53 binding from the verified server session, no old-signature caller; "deployed" still awaits a staging environment
FEATURE_DISABLED_DURING_APPLY:   VERIFIED — RCAP_CONSUMER_DELIVERY_ROUTE_STATE defaults to disabled (fail-closed, server-only); staging_scoped refused in production runtimes
APPLICATION_DEPLOYMENT_TARGET:   BLANK — Vercel per docs/PHASE_17; project unnamed
WORKER_IMAGE_SOURCE:             .github/workflows/publish-rcap-render-worker.yml → ghcr.io/roger-legalease/rcap-render-worker, full-SHA tags, private package (VERIFIED prepared, NOT run)
WORKER_IMAGE_DIGEST:             BLANK — produced by that workflow at the final accepted SHA; host pulls with its own read:packages secret
WORKER_DEPLOYMENT_TARGET:        BLANK — Fly.io / Railway / ECS / supervised container per spec
STAGING_EVIDENCE_OWNED_PATHS:    PROPOSED — docs/rcap/staging-rehearsal/{evidence/<testId>/, sql/}
STAGING_FEATURE_FLAG:            RCAP_CONSUMER_DELIVERY_ROUTE_STATE (+ RCAP_CONSUMER_DELIVERY_STAGING_SCOPE) — VERIFIED in code; staging VALUES still unset
ROLLBACK_OWNER:                  BLANK
OBSERVABILITY_DESTINATION:       BLANK — worker stdout JSON to platform drain; drain unnamed
STAGING_TEST_EMAIL:              BLOCKED — test-mail capture unconfirmed (real-email stop condition)
RCAP-SEC-001:                    OPEN — fix merged (52+53) and independently proven on ephemeral clusters; resolved only when applied to the environment it describes
```

Recompute rule: every SHA is re-derived from bytes on disk at the accepted
FINAL_INTEGRATION_SHA immediately before application; no value above is used
directly.
