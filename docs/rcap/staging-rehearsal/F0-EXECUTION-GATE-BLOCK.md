# Execution Authorization Block — prepared, NOT granted

Every field below must be supplied/confirmed before EXECUTE_STAGING. Fields
this lane could verify from the repository in this session are filled and
marked VERIFIED; everything else is visibly BLANK or BLOCKED. A chat-level
"authorized" does not fill any field: the migration grants must match the
captain-owned queue record (`data/rcap-authorization-queue.json`).

```
EXECUTE_STAGING_AUTHORIZED:      BLANK — not granted
AUTHORIZED_BY:                   BLANK — must be Roger Roman
AUTHORIZATION_TIMESTAMP:         BLANK
STAGING_ENVIRONMENT_NAME:        BLANK — no staging environment identified anywhere in repo or container
STAGING_SUPABASE_PROJECT:        BLANK — must come with credentials via the session secret store
FINAL_INTEGRATION_BRANCH:        claude/rcap-final-sprint-integration (VERIFIED present)
FINAL_INTEGRATION_SHA:           BLANK — Terminal A names it; preflight base this session: abbc48a19f79a817a4e14d4350297a9a753dbc05
REQUIRED_GITHUB_CHECKS_GREEN:    BLOCKED — SF-DEFECT-001 makes verify-rcap-render-worker-delivery nondeterministically red (pass/FAIL/FAIL observed on identical trees); no attestation is trustworthy until Terminal A lands a fix
PHASE_49_MIGRATION_PATH:         supabase/phase-49-rcap-packet-render-jobs.sql (VERIFIED on disk)
PHASE_49_SHA256:                 2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6 (VERIFIED — matches queue authorizedSha256)
PHASE_49_AUTHORIZATION_ID:       auth-2026-08-10-phase-49-packet-render-jobs (VERIFIED — applyStaging: authorized)
PHASE_49_STAGING_AUTHORIZED:     yes (VERIFIED in queue)
PHASE_50_MIGRATION_PATH:         supabase/phase-50-rcap-packet-delivery-hardening.sql (VERIFIED on disk)
PHASE_50_SHA256:                 15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62 (VERIFIED — matches queue authorizedSha256)
PHASE_50_AUTHORIZATION_ID:       auth-2026-08-10-phase-50-packet-delivery-hardening (VERIFIED)
PHASE_50_STAGING_AUTHORIZED:     BLOCKED — queue says staging: queued; Roger must name all three files and the environment in the queue record
PHASE_51_MIGRATION_PATH:         supabase/phase-51-rcap-consumer-payment-gate.sql (VERIFIED on disk)
PHASE_51_SHA256:                 3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba (VERIFIED — matches queue authorizedSha256)
PHASE_51_AUTHORIZATION_ID:       auth-2026-08-10-phase-51-consumer-payment-gate (VERIFIED)
PHASE_51_STAGING_AUTHORIZED:     BLOCKED — queue says staging: queued
THREE_FILE_ACTION:               A1-staging names 49 && 50 && 51 in order; the two-file form is explicitly superseded and "must not be run" (VERIFIED in queue sequenceNote)
APPLY_EVIDENCE_CHECK:            finalize_packet_render_job must contain consumer_packet_payment_valid (VERIFIED discriminating on an ephemeral cluster this session: f after 49+50, t after 51)
APPLICATION_DEPLOYMENT_TARGET:   BLANK — Vercel per docs/PHASE_17; exact project unnamed
WORKER_IMAGE_SOURCE:             BLANK — CI/platform builder (no Docker daemon in this container)
WORKER_IMAGE_DIGEST:             BLANK — supplied by Terminal A from the builder; must equal RCAP_WORKER_CONTAINER_DIGEST at deploy
WORKER_DEPLOYMENT_TARGET:        BLANK — Fly.io / Railway / ECS / supervised container per deployment spec
STAGING_EVIDENCE_OWNED_PATHS:    PROPOSED — docs/rcap/staging-rehearsal/{evidence/<testId>/, sql/}; awaiting A's confirmation
STAGING_FEATURE_FLAG:            BLANK — no in-code flag exists in the delivery path; A must name the real mechanism
ROLLBACK_OWNER:                  BLANK
OBSERVABILITY_DESTINATION:       BLANK — worker stdout JSON to platform drain; drain unnamed
STAGING_TEST_EMAIL:              BLOCKED — test-mail capture unconfirmed; a rehearsal that could email a real participant is a stop condition
```

Recompute rule: every SHA above is re-derived from the exact bytes on disk at
the named FINAL_INTEGRATION_SHA immediately before application. A value from
this document, an earlier status report, or chat is never used directly.
