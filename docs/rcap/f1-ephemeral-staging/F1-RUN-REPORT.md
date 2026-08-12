# F1 Ephemeral Staging — run report (Terminal F)

- Lane: session-f, F1 ephemeral staging execution
- Date (UTC): 2026-08-12
- Branch: `claude/rcap-f1-ephemeral-staging`
- Application / evidence base: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0` (verified on the canonical branch)
- Worker source SHA: `5987870ca0d70ea4437d0711c430b9eda299a0ef` (verified present)
- Worker digest: `sha256:337083a25988b10a677813c3c8034461bfe18ffe1d2dd6a942a4d97235c3b64d` (matches `data/rcap-staging-action.json`)
- Feature control: `RCAP_CONSUMER_DELIVERY_ROUTE_STATE=staging_scoped` (runner only; nothing hosted was configured)
- No production system was contacted. No hosted staging project exists or was created.

## 1. Environment strategy outcome

**Preferred path (this session + Docker): PARTIALLY BLOCKED — recorded, not worked around.**

| Probe | Result |
|---|---|
| `docker info` after starting `dockerd --storage-driver=vfs` | Server 29.3.1 running, daemon initialized |
| Supabase CLI | installed, `2.113.0` |
| Registry **manifest** read (curl, Docker Hub token) | HTTP 200 |
| Registry **blob/config** download (`docker pull`) | `error pulling image configuration: download failed after attempts=6: Forbidden` |
| Same failure for `public.ecr.aws/supabase/postgres` and `ghcr.io/...@sha256:3370...` | yes (with and without daemon-level proxy config) |

The agent proxy relays registry manifests but refuses blob downloads, so **no container image can be
pulled in this session** — neither the Supabase local stack nor the worker by digest. Per the proxy
README this is reported rather than circumvented; TLS verification was never disabled and
`HTTPS_PROXY` was never unset.

**Fallback path (agent-managed GitHub Actions): USED.** A captain-owned manual-only workflow was
already registered on `main` (`.github/workflows/rcap-f1-ephemeral-staging.yml`, PR #95, copied
byte-for-byte from integration `611c2458`). It pins exactly the frozen inputs. **No duplicate
workflow was authored and no competing PR was opened** — creating a second one would have collided
with a captain-owned path. This lane dispatched the existing workflow instead.

Dispatch inputs (all satisfy the workflow's own refusal gates):

```
application_sha   = df3d8607e8a0c723e23c346f1cd725c17a2c22b0
worker_source_sha = 5987870ca0d70ea4437d0711c430b9eda299a0ef
worker_digest     = sha256:337083a25988b10a677813c3c8034461bfe18ffe1d2dd6a942a4d97235c3b64d
tools_sha         = 611c245886dfaee56fa18442683af5faa4fd4435
```

`tools_sha` was chosen by verifying the workflow's two equivalence gates locally:
`git diff --quiet df3d8607 611c2458 -- src package.json package-lock.json tsconfig.json next.config.ts public`
and the worker-image-input diff against `5987870c` both return clean, and `611c2458` carries
`scripts/f1-ephemeral-staging-stack.mjs`.

## 2. Six-migration apply — EXECUTED on a disposable cluster

Authorized scope: `local_ephemeral_test` ("throwaway clusters created and destroyed inside verifier
runs") from `data/rcap-authorization-queue.json`. No hosted environment was touched; the cluster was
created and destroyed inside the harness (`f1-migration-apply-harness.sh`).

The cluster was built production-shaped: `anon`, `authenticated` and `service_role` roles with
Supabase-style default privileges granting table access to the browser roles **before** the
migrations run, so the Phase 54 revokes are proven to remove real access rather than absent access.

Each hash was recomputed from disk immediately before its apply and compared to the frozen value;
a mismatch aborts. All six matched and applied with zero SQL errors:

| Phase | SHA-256 | Applied |
|---|---|---|
| 49 | `2ad3726d…7bc2d6` | yes |
| 50 | `15063ea9…79eb62` | yes |
| 51 | `3c3e971c…08e1ba` | yes |
| 52 | `c906068f…256bd3` | yes |
| 53 | `469ece83…9b22f` | yes |
| 54 | `3114c1d2…2becac` | yes |

### Post-apply object verification (22/22, `object-verification.txt`)

Tables, functions, triggers, grants, RLS, policies and constraints all as expected. Selected proofs:

- `finalize_packet_render_job` **is the Phase 52 definition** — body carries
  `consumer_packet_payment_authority`, `consumer_packet_payment_consumption` and
  `consumer_payment_matter_conflict`. (An earlier probe of mine looked for the Phase 51 marker
  `consumer_packet_payment_valid` and returned false — correctly, because Phase 52 supersedes that
  probe. The stale marker was the defect, not the migration.)
- exactly **one** `enqueue_packet_render_job` signature, and it is the Phase 53 bound form carrying
  `p_expected_consumer_auth_user_id`.
- `record_consumer_packet_payment` present with a pinned `search_path`.
- `rcap_persons` **RLS enabled**; `anon` and `authenticated` hold **no** SELECT on it (Phase 54).
- `anon` has no INSERT on `packet_render_jobs`; `authenticated` has no INSERT on
  `packet_credit_ledger`.
- 4 guard triggers on `packet_render_jobs`, 1 on `packet_credit_ledger`;
  `packet_render_jobs_eligible_requires_accounting_check` present; the accounting-result constraint
  admits `consumer_payment_required`.

The repository's own canonical checker agrees: `verify-rcap-migration-apply-evidence` **33/33**.

## 3. Matrix coverage executed locally at the frozen SHA

| Suite | Result |
|---|---|
| `verify-rcap-phase51-consumer-payment-security` (Terminal B's audit) | **Gate 21/21 · Reach 5/5 · Mutations 3/3** |
| `verify-rcap-phase52-consumer-payment-authority` | pass — G1, G1b, G11, G12 closed |
| `verify-rcap-phase53-consumer-job-binding` | pass 24/24 |
| `verify-rcap-consumer-person-namespace` (Phase 54) | pass **14/14** properties |
| `verify-expungement-consumer-payment-http` | pass 18/18 |
| `verify-rcap-packet-delivery-db` | pass — lifecycle, fencing, accounting, delivery, grants |
| `verify-rcap-render-worker-delivery` | pass — crash and corruption injection |
| `verify-rcap-render-worker-runtime` | pass — graceful drain, lease config, temp hygiene |
| `verify-rcap-packet-delivery-e2e` | pass — mobile-viewport Chromium received the artifact over HTTP |
| `verify-rcap-mutation-authority` | pass |
| `verify-rcap-runtime-credential-boundary` | pass, 50 assertions |
| `verify-rcap-migration-apply-evidence` | pass 33/33 |

These cover, on a real database and a real browser: payment forgery and authority, provider replay
and amount/currency, Phase 53 binding, Phase 54 isolation, worker claim/fencing/retry/crash, storage
re-read with corruption and substitution denial, delivery authorization and abort semantics.

## 4. SF-DEFECT-001 — CLOSED

Directive: do not keep it open unless it reproduces on this base. **It does not.**
`verify-rcap-render-worker-delivery` ran **11 times at `df3d8607`** in this session (6 in suite
context, then 5 consecutively) with **zero failures**. Upstream commit `2793e700`
("close SF-DEFECT-001 by making packet artifacts distinguishable") removes the mechanism the
original report identified — content-identical fixtures whose same-second renders produced
byte-identical PDFs. The finding is closed on evidence, not on assertion.

## 5. What this session could NOT prove, and why

Each of these needs a container image, which this environment cannot pull:

- GHCR pull of the immutable digest, manifest inspection, and no-baked-secret check on the real image
- worker container health, readiness, restart policy and SIGTERM graceful shutdown **as a container**
  (the worker's *logic* is proven by `verify-rcap-render-worker-runtime`)
- real Supabase Auth (GoTrue) identity creation and email verification via Mailpit
- real Storage API private-bucket upload and re-read (the storage *contract* is proven by the
  filesystem-backed adapter in `verify-rcap-render-worker-delivery`)
- the temporary phone URL and Roger's physical-phone acceptance

These are exactly the steps the dispatched Actions run performs on a runner that can pull images.

## 6. Rollback posture

Nothing persistent was created, so rollback is trivial and was verified by construction: the
ephemeral cluster is destroyed by the harness `trap` on every exit path, and the local Docker daemon
holds no images or containers (every pull was refused). The route control default is `disabled`
(`consumer-delivery-control.ts`), and `staging_scoped` is refused outright in a production runtime.

## 7. Sanitization

This bundle contains no tokens, keys, service-role secrets, email passwords, participant data or
production URLs. The only credentials referenced anywhere are synthetic `*.invalid` addresses that
exist solely inside the disposable runner.

---

# Runner result — run 31562422867 (dispatched by this lane)

Conclusion: **failure at step 9**, same step that ended runs #1 and #2. The disposable stack was
destroyed cleanly (step 13 success); nothing persisted.

## Gates the runner PROVED (not provable in this session)

| Gate | Result |
|---|---|
| Refuse-unauthorized-input guard | pass |
| Ancestry + image-input equivalence of all pinned SHAs | pass (`tools_sha` 611c2458 accepted) |
| **GHCR authenticate + pull worker by immutable digest** | **pass** — digest only, never a mutable tag |
| Disposable Supabase stack start (Postgres, Auth, Kong, Storage, Mailpit) | pass |
| Next.js application build at the frozen SHA | pass |
| **`migration_hashes_match`** — all 6 recomputed hashes equal the prepared action | **pass**, independently on a clean runner |
| **`auth_healthy_real_users`** — 3 GoTrue users created and signed in through Kong | **pass** — real Supabase Auth |
| **`email_captured_mailpit`** — recovery mail captured via the Mailpit API | **pass** — real email path |
| Evidence upload + stack destruction | pass |

## F1-HARNESS-001 — no pre-49 baseline on a virgin stack (BLOCKING)

```
FAIL migrations_apply_in_order — supabase/phase-49-rcap-packet-render-jobs.sql:152:
ERROR:  relation "public.rcap_document_packets" does not exist
```

- Branch/commit: `claude/rcap-final-sprint-integration` @ `611c2458` (tools SHA), workflow registered on `main` via PR #95
- File: `.github/workflows/rcap-f1-ephemeral-staging.yml`, step "Start the disposable Supabase stack"
- Defect: the step runs `supabase init --force` then `supabase start`, producing a stack containing
  only Supabase's own schemas. The repository has **no `supabase/migrations/` directory**, so no
  pre-49 baseline is applied by anything. Phase 49's own recorded preconditions require
  `public.partner_records` and `public.rcap_document_packets` to be present; both are absent, so
  phase 49 aborts at line 152 and every later phase inherits a broken schema.
- Why this lane's local apply succeeded where the runner failed: the local harness explicitly creates
  `partner_records`, `rcap_persons`, `rcap_document_packets` and the browser-role default privileges
  before applying, reproducing a real project's pre-49 state.
- Likely owner: Terminal A (F1 orchestration)
- Acceptance condition: before applying phase 49, the stack must materialise the pre-49 baseline the
  authorization record assumes — at minimum `partner_records`, `rcap_persons`,
  `rcap_document_packets` and `consumer_briefcase_items` (phase 26) — after which
  `migrations_apply_in_order` reports 6/6 with zero SQL errors.

## F1-HARNESS-002 — synthetic Briefcase fixture uses non-existent columns (BLOCKING)

```
Error: psql failed: ERROR:  column "state" of relation "consumer_briefcase_items" does not exist
SQL: insert into public.consumer_briefcase_items (id, user_id, state, pathway_label, payment_status)
```

- File: `scripts/f1-ephemeral-staging-stack.mjs` @ `611c2458`, lines 187 and 191
- Defect: the canonical table (`supabase/phase-26-consumer-briefcase-items.sql`) has **no `state`
  column** — the jurisdiction column is named `jurisdiction` — and it declares `item_type` NOT NULL
  with a CHECK over `('eligibility_check','result','packet','wilma_conversation')`. The fixture both
  names a column that does not exist and omits a NOT NULL column, so it cannot succeed against the
  canonical schema even once F1-HARNESS-001 is fixed.
- Likely owner: Terminal A (F1 orchestration)
- Acceptance condition: the insert names `(id, user_id, item_type, jurisdiction, pathway_label,
  payment_status)` with `item_type='packet'` and `jurisdiction='MD'`, and both consumer fixtures
  insert without error; the paid-consumer journey then reaches delivery eligibility.

Neither file was patched by this lane: both are captain-owned F1 orchestration, and this lane is an
execution and evidence lane.
