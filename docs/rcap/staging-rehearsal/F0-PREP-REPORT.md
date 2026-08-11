# F0 Staging Preflight Report — Session F (Phase 49→53 revision)

- Lane: session-f-staging-preflight (execution and evidence lane; no implementation)
- MODE: PREP_ONLY (nothing applied, deployed, published, enabled, or altered)
- Date: 2026-08-11
- Branch: `claude/rcap-staging-preflight-phase53`
- Base: `origin/claude/rcap-final-sprint-integration` @ `a29c22c573935845cdd7b2bfbb2580903f1cb0fd` (fetched and pinned this session; canonical branch per the in-repo branch ruling; the action file's `finalAcceptedSha` is null by construction and is NOT this SHA)
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

## 2. Application-first precondition (audited in src/ this session)

| Requirement | Finding |
|---|---|
| Consumer enqueue uses the Phase 53 signature | VERIFIED — the single `rpc("enqueue_packet_render_job")` callsite (`src/lib/rcap/render/job-queue.ts`) passes 15 args including `p_consumer_briefcase_item_id` and `p_expected_consumer_auth_user_id` |
| No deployed code calls the old unbound signature | VERIFIED in-repo — zero other callsites; Phase 53 SQL drops the 13-arg function |
| Server payment writer deployed | **BLOCKED** — `record_consumer_packet_payment` exists only in Phase 52 SQL; **zero app callsites** anywhere in src/ |
| Identities passed by the server | **BLOCKED** — the identity contract exists (`RenderJobIdentity` with `expectedConsumerAuthUserId`) but `enqueueRenderJob` has **zero route callers**; no server path constructs it yet |
| Feature disabled during apply | structurally true — no live route reaches the durable queue; a named flag mechanism still does not exist |

Consequence: "application-first" cannot be satisfied by deploying the current
tip alone — the consumer enqueue route and server payment-writer wiring are
not yet written, and no staging app exists to deploy to. Whether that wiring
is a prerequisite Terminal A intends to land before staging, or Stage-6+ test
harness code stands in for it, is the captain's call to state in the gate.

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
| `verify-rcap-render-worker-delivery` | **FAIL — SF-DEFECT-001 reproduced twice at this tip** (same substitution assert; captain's readiness note of 3 clean runs is now contradicted) |
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
| Feature flags | no in-code mechanism (env reads unchanged); must be named in the gate |
| Secret source | platform secret manager; none here (verified zero matching env vars) |
| Logs/metrics | worker stdout JSON → unnamed drain; job table is source of truth |
| Mobile-browser environment | pinned chromium `/opt/pw-browsers/chromium` — exercised by e2e this session |
| Rollback owner | BLANK — named nowhere; gate field prepared |

## 4b. Provider path (facts from this session)

The consumer payment provider path — webhook → `record_consumer_packet_payment`
with `p_authority='server_webhook'` — is NOT wired anywhere in src/ (zero
callsites; verified again at this tip). Neither existing Stripe webhook route
(`src/app/api/stripe/webhook/route.ts`,
`src/app/api/method/expungement.api.payment.stripe_webhook/route.ts`) contains
provider signature verification (grep this session). The writer's SQL contract
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

## 6. Exact blockers to EXECUTE_STAGING

1. `readyToRequestAuthorization: false` in the captain's own readiness record — authorization is not even being requested yet.
2. Roger's staging grant for phases 50–53 (all five files + environment) — all queued.
3. SF-DEFECT-001 — reproduced twice at this tip in this session; chain nondeterministically red, so no trustworthy CI-green attestation.
4. Application-first precondition — server payment writer and consumer enqueue route have zero app callsites; nothing to deploy that exercises the Phase 53 path.
5. `finalAcceptedSha` null by construction — must be populated at the accepted tip after CI green + Terminal B re-audit.
6. GHCR publication workflow not run — no worker digest exists.
7. Every environment/credential field blank: Supabase project, DB URL, Auth/Storage keys, Vercel project/token, worker host + pull secret, flag mechanism, rollback owner, log drain, test-mail confirmation.
