# F0 Staging Preflight Report — Session F (Phase 49→53 revision)

- Lane: session-f-staging-preflight (execution and evidence lane; no implementation)
- MODE: PREP_ONLY (nothing applied, deployed, published, enabled, or altered)
- Date: 2026-08-11
- Branch: `claude/rcap-staging-preflight-phase53`
- Base: `origin/claude/rcap-final-sprint-integration` @ `7e1b2c4dc1e433c07f9d0819c8125e228da4b236` (fetched and pinned this session; canonical branch per the in-repo branch ruling; the action file's `finalAcceptedSha` is null by construction and is NOT this SHA)
- Worktree: separate clean worktree (0 dirty paths at creation); all lane changes under `docs/rcap/staging-rehearsal/`

## 1. The five-migration sequence (every value verified against disk bytes and the queue this session)

| Pos | Phase | Path | SHA-256 (disk = queue) | Authorization ID | Staging disposition |
|---|---|---|---|---|---|
| 1 | 49 | `supabase/phase-49-rcap-packet-render-jobs.sql` | `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` | auth-2026-08-10-phase-49-packet-render-jobs | **authorized** |
| 2 | 50 | `supabase/phase-50-rcap-packet-delivery-hardening.sql` | `15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62` | auth-2026-08-10-phase-50-packet-delivery-hardening | queued |
| 3 | 51 | `supabase/phase-51-rcap-consumer-payment-gate.sql` | `3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba` | auth-2026-08-10-phase-51-consumer-payment-gate | queued |
| 4 | 52 | `supabase/phase-52-rcap-consumer-payment-authority.sql` | `c906068f7800df7dd9a34baff5830269f50bab3ddc7224b72f2e7369ff256bd3` | auth-2026-08-11-phase-52-consumer-payment-authority | queued (names all four) |
| 5 | 53 | `supabase/phase-53-rcap-consumer-job-binding.sql` | `469ece83b54ef840f8571d90f0fbeed3ee16f246e906f0e44cc82ecac899b22f` | auth-2026-08-11-phase-53-consumer-job-binding | queued (names all five) |

Canonical action: `data/rcap-staging-action.json` — `staging-action-five-migrations`,
status `prepared_queued_not_authorized`, order 49→50→51→52→53, security
checkpoint SHA `13e356c4`, phases 52/53 indivisible. Superseded action IDs, with
recorded reasons: `staging-action-two-migrations` (unpaid consumers deliverable),
`staging-action-three-migrations` (payer-bypassable, RCAP-SEC-001),
`staging-action-four-migrations` (gate correct but unreachable). The legacy
three-file A1-staging text on the phase-50 entry is historical; the five-file
action is the current record. Phase 48 remains declined/superseded.

## 2. Application-first precondition (audited in src/ at 7e1b2c4d this session) — NOW SATISFIED IN-REPO

| Requirement | Finding |
|---|---|
| Server payment writer present | VERIFIED — single writer `consumer-payment-authority.ts` calling `rpc("record_consumer_packet_payment")`; authority constrained to server_webhook/server_admin; "the only remaining way the application can record that money changed hands" |
| Signed webhook | VERIFIED — `src/lib/stripe/webhook-handler.ts` requires the stripe-signature header and `stripe.webhooks.constructEvent` (400 on missing/invalid), then `reconcileExpungementAiCheckoutEvent` → the payment authority; nothing is driven by a request body |
| Consumer enqueue route | VERIFIED — `src/app/api/expungement-ai/packet/render/route.ts` → `requestConsumerPacketRender` |
| Phase 53 callsite | VERIFIED — the request passes `consumerBriefcaseItemId` and `expectedConsumerAuthUserId` derived from the verified server session (consumer-identity.ts); the single enqueue RPC uses the 15-arg signature; no old-signature caller exists |
| Server-side route control | VERIFIED — `consumer-delivery-control.ts`: `RCAP_CONSUMER_DELIVERY_ROUTE_STATE` ∈ disabled/staging_scoped/live, server-only (never NEXT_PUBLIC), unrecognized value ⇒ disabled, `staging_scoped` refused outright in a production runtime, plus `RCAP_CONSUMER_DELIVERY_STAGING_SCOPE` for the named staging test users; route authorized by exact path and bytes (5833b148) |
| Feature disabled during apply | VERIFIED — default state is `disabled`; the control exists precisely for the migration window |

## 3. Verifier evidence at this tip (all run in this session, ephemeral clusters + pinned chromium)

| Verifier | Result |
|---|---|
| Phase-51 payment security audit (Terminal B's, accepted as blocking npm-test step) | **Gate 21/21, Reach 5/5, Mutations 3/3** |
| `verify-rcap-phase52-consumer-payment-authority` | PASS 32/32 — G1, G1b, G11, G12 closed |
| `test-rcap-phase52-mutations` | PASS 12/12 mutations red |
| `verify-rcap-phase53-consumer-job-binding` | PASS 24/24 |
| `test-rcap-phase53-mutations` | PASS 8/8 mutations red |
| `verify-rcap-migration-apply-evidence` | PASS 32/32 |
| `verify-rcap-packet-delivery-db` | PASS |
| `verify-rcap-render-worker-delivery` | PASS this run at 7e1b2c4d — SF-DEFECT-001 remains LATENT (no fix landed to the implicated files; nondeterministic by mechanism) |
| `verify-expungement-consumer-payment-http` (new) | PASS 18/18 |
| `test-rcap-consumer-payment-http-mutations` (new) | PASS 7/7 mutations red |
| `verify-rcap-consumer-person-namespace` (new) | PASS 8/8 — note: rcap_persons still carries no table-level RLS, Roger's to authorize |
| `verify-rcap-render-worker-runtime` | PASS |
| `verify-rcap-packet-delivery-e2e` (mobile Chromium) | PASS |
| `verify-rcap-mutation-authority` | PASS |

RCAP-SEC-001 remains **open** per the readiness record: the 52/53 fix is merged
and independently proven, but no environment has been fixed because none is
named. `readyToRequestAuthorization: false`.

## 4. Infrastructure discovery (facts, this container)

| Item | Finding |
|---|---|
| Staging Supabase project | NOT DISCOVERABLE — no ref in tree; zero credential env vars |
| Staging app project/domain | UNKNOWN — Vercel per docs/PHASE_17; unnamed |
| Worker registry | `ghcr.io/roger-legalease/rcap-render-worker` (private; full-SHA tags) via `.github/workflows/publish-rcap-render-worker.yml` — prepared, NOT run |
| Worker deployment target | unchosen — Fly.io/Railway/ECS/supervised container per spec; host needs its own read:packages pull secret (not the workflow GITHUB_TOKEN) |
| Database access | psql 16 client + PG16 server binaries present; staging connection string absent |
| Auth/Storage readiness | unverifiable without project; bucket `rcap-packet-artifacts-private`; email-verification capture unconfirmed (stop condition) |
| Current staging app SHA / worker digest | unknown — nothing deployed, nothing published |
| Feature flags | NAMED — `RCAP_CONSUMER_DELIVERY_ROUTE_STATE` (disabled/staging_scoped/live, fail-closed, server-only) + `RCAP_CONSUMER_DELIVERY_STAGING_SCOPE` |
| Secret source | platform secret manager; none here (verified zero matching env vars) |
| Logs/metrics | worker stdout JSON → unnamed drain; job table is source of truth |
| Mobile-browser environment | pinned chromium `/opt/pw-browsers/chromium` — exercised by e2e this session |
| Rollback owner | BLANK — named nowhere; gate field prepared |

## 4b. Provider path (facts from this session)

The consumer payment provider path IS now wired (verified at 7e1b2c4d):
both webhook routes delegate to `src/lib/stripe/webhook-handler.ts`, which
verifies the provider signature (`constructEvent`, 400 on failure, never logs
the secret/body) before reconciliation reaches the single payment writer. The writer's SQL contract
carries the fields the provider cases exercise: `p_amount_cents`, `p_currency`,
`p_payment_provider`, `p_provider_event_id` (uniqueness key),
`p_checkout_session_id`, `p_payment_intent_id`, `p_authority`
('server_webhook'/'server_admin' only), `p_recorded_by`. Matrix cases
SF-PROV-01…04 (valid-signed-once, invalid-signature, replay-idempotence,
mismatched amount/currency/user/item) define the acceptance bar the future
wiring must clear; signature verification is a REQUIRED property of that
wiring, not an optional hardening.

## 5. Prepared artifacts (this branch)

| Artifact | Purpose |
|---|---|
| `F0-EVIDENCE-MATRIX.json` | **89 cases**: 16 consumer-payment cases (forged INSERT/UPDATE, server-recorded $50, provider-reference uniqueness, wrong user, wrong item, second matter, retry idempotence, pre-finalization refund, sponsored unaffected, free repeat, old signature gone, unbound legacy job, direct-delivery bypass) + real-Auth identities, storage upload/re-read, mobile download, cross-person/partner denials, hard-cap race, crash/retry, transmission abort, rollback |
| `F0-EXECUTION-COMMANDS.md` | Five-file apply + per-phase object verification, 51/52/53 apply-evidence SQL, GHCR publication facts, deploy/health/flag/render/download/accounting/rollback |
| `F0-EXECUTION-GATE-BLOCK.md` | Complete execution block mirroring the captain's 13-field readiness record; VERIFIED fields filled, the rest visibly BLANK/BLOCKED |
| `F0-TEST-IDENTITIES.json` | Partners P1/P2, participants A1/A2/B1, consumers C1/C2, payment-state briefcase items, session states |
| `F0-PHONE-ACCEPTANCE.md` | Both journeys (sponsored + paid consumer), ten steps each, combined pass/fail form |
| `F0-DEFECT-REPORT-001.md` | Substitution-assert flake — now with the 5f0ec4df reproduction record |
| `F0-PREP-REPORT.md` | This report |

## 5b. CI observation (this session)

GitHub Actions on the canonical branch: both required workflows — "RCAP All50
Handoff Verification" and "Expungement.ai Consumer Adapter Verification" —
completed **success at 7e1b2c4d** (88e55e2f: both failed; 5833b148: one fixed;
7e1b2c4d: both green). First fully green SHA of the wired system, observed via
the GitHub API this session. The SF-DEFECT-001 flake remains latent, so green
is real but not yet proven determinate.

## 5c. Phase 54 anticipation

If/when Terminal A lands a Phase 54, this lane extends `migrationsInApplyOrder`,
the apply/verification commands, the gate block, and the matrix accordingly —
against the queue record and bytes on disk at that tip, never from a status
report.

## 6. Exact blockers to EXECUTE_STAGING

1. `readyToRequestAuthorization: false` in the captain's own readiness record — authorization is not even being requested yet.
2. Roger's staging grant for phases 50–53 (all five files + environment) — all queued.
3. SF-DEFECT-001 — latent (passed this run; no fix landed): CI green at 7e1b2c4d is observed but not proven determinate.
4. Application-first precondition — SATISFIED in-repo at 7e1b2c4d; "deployed" still requires a staging environment to exist.
5. `finalAcceptedSha` null by construction — must be populated at the accepted tip after CI green + Terminal B re-audit.
6. GHCR publication workflow not run — no worker digest exists.
7. Every environment/credential field blank: Supabase project, DB URL, Auth/Storage keys, Vercel project/token, worker host + pull secret, flag mechanism, rollback owner, log drain, test-mail confirmation.
