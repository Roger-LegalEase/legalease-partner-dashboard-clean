# STATUS F — Hosted Environment and Release Mechanics

- State: **HOSTED LANE READY FOR FINAL CANDIDATE**
- Worktree: `/Users/rogerroman/LegalEase/legalease-sprint-hosted`
- Branch: `sprint/20260825-hosted`
- Sprint base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Acceptance Supabase project: `hyflxnlhpmiqxvvcoiia`
- Production: **untouched and unauthorized**

## Final-candidate release identity

- Application/source SHA: **awaiting Lane A's exact frozen candidate**. No application SHA is hardcoded as a substitute.
- Accepted worker source: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- Accepted immutable worker digest: `sha256:c1a18b3a9f36f5f7ce0b01268c7bb30242b69cca13cb14bde18281d984098402`
- This Lane F release-control branch changes no canonical application or worker inputs relative to the accepted worker source.
- Digest reuse is allowed only while the exact final candidate remains empty across every canonical worker input. A nonempty diff requires a new full-SHA-only image build, secret scans, exact-digest acceptance, and immutable-digest evidence.

## Environment status

- Vercel public identity contract: `roger947s-projects/legalease-partner-dashboard-clean`.
- Vercel authentication and resolved `team_` / `prj_` identities: **not yet exercised for the final candidate**. Nonproduction credentialed-session use is approved; no credentials have been emitted or persisted.
- Rolling Preview: **not created**.
- Exact final Preview: **not created**.
- Preview deployment ID and URL: **absent**.
- Stripe: test mode required; a real Stripe-delivered webhook has **not** been observed in this sprint.
- Email capture, Playwright, Chromium, GHCR pull, and long-lived worker host: **unverified or absent**.
- External evidence layout: prepared under `/private/tmp/legalease-hosted-acceptance/07675789a80e732d2b835c1e8ba2092b39201b79/` with `screenshots`, `traces`, `console`, `network`, `database`, and `artifacts` folders.

## Migration truth

- Repository sequence and on-disk hashes: phases `49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55` statically verified.
- Isolated Phase 55 PostgreSQL proof: **passed**. Exact user/item/product/person/matter/Session/amount/currency authority, duplicate/retry/correction/refund convergence, security-definer refusal cases, and migration reruns were exercised with PGlite.
- Sequence verifier: `7/7` passing. Mutation proof: `8/8` corruptions detected and sources restored.
- Last repository-recorded authenticated acceptance-project proof: phase 54.
- Acceptance-project Phase 55: **UNPROVEN**. The isolated behavioral proof does not substitute for authenticated acceptance-project ledger/catalog/readback, which waits for the final candidate run.
- The hosted migrator now excludes every authorized migration from the best-effort baseline by deriving the exclusion set from `migrationsInApplyOrder`. It initializes phase 55 as `unproven` and may mark it confirmed only after mandatory matter/product/person binding readback passes.
- Disposable-stack migration evidence now derives its complete `49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55` label and count directly from the authorized action instead of under-reporting the sequence as six migrations.
- No migration was applied by this lane.

## Prepared nonproduction mechanics

- Evidence writers support an external directory override instead of requiring tracked evidence output.
- Worker-input planning computes the complete canonical diff and truthfully attributes a reused image to the accepted image source SHA.
- Vercel resolution pins the public team slug and project name, resolves canonical IDs in memory from `VERCEL_TOKEN`, rejects mismatches, uses the public slug for CLI `--scope`, and ignores arbitrary org/project identity inputs.
- Release workflows require only `VERCEL_TOKEN`; the obsolete caller-supplied `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` contracts are removed.
- Lane A's application SHA is a required exact 40-character dispatch input. Worker source, application, and tools commits must all belong to `sprint/20260825-full-product-captain`; the accepted worker source must be an ancestor of the application, the application must be an ancestor of the workflow tools SHA, and the tools input must equal the workflow source SHA. The workflow contains no static application SHA.
- Application equivalence covers `postcss.config.mjs` and `tailwind.config.ts` as well as the prior Next.js inputs. The accepted worker source/digest pair is fixed, and reuse is rejected unless the complete canonical worker-input diff from accepted source to final application is empty and remains empty from application to tools.
- Preview selection remains exact-match-only: READY, nonproduction, exact application SHA metadata, exact acceptance project, route state, and Stripe-test configuration. A supplied mismatch refuses instead of creating a substitute.
- Auth configuration, Checkout, payment, and Gallery consumers all receive the one resolved deployment ID and hostname, then re-read that immutable deployment by `/v13/deployments/{id}`. They no longer perform independent READY-list selection.
- Every transacting contract phase, including `full`, creates or reuses a `staging_scoped` Preview; nontransacting phases retain the disabled default and unknown phases fail closed.
- A fresh scoped run idempotently bootstraps synthetic consumer A in the pinned acceptance Auth project before binding its UUID into immutable deployment environment; later Auth setup creates or reuses the remaining synthetic identities.
- The always-run Gallery uses only the repository-pinned acceptance project when its workflow input is absent and still refuses any explicit project mismatch.
- The deploy path contains no `--prod`, alias operation, or project-level environment write.
- Deploy output redaction covers every exact held credential plus JWT, Stripe secret-key, and webhook-signing-secret shapes before streamed logs, failure logs, or failure evidence are written.
- GitHub-hosted acceptance no longer inserts a synthetic compatibility packet. It proves the packet is absent before payment and later verifies the application-owned packet created by the canonical Stripe webhook.
- The GitHub payment watcher requires the canonical Stripe webhook to have queued exactly one render job. It never repairs a missing webhook enqueue with its own render POST.
- Stored Vercel environment values are not decrypted. Full preflight snapshots only Production-target shape and proves the actual deploy argument contract is Preview-only, per-deployment, alias-free, and guarded by unchanged Production alias/environment assertions. It explicitly records Production value-level disjointness as `unproven_not_read` instead of claiming proof it did not collect.
- Migration-only preflight requires and accesses Supabase only; it neither requires nor calls Vercel.
- Deployment cannot pass on a generic refusal alone: the exact Preview must return HTTP 200 application JSON from `/api/health` before the delivery-route refusal is considered evidence.

## Verification state

- Focused preparation, worker-plan, Vercel identity, deploy bootstrap/health, deploy-redaction, exact-Preview wiring, preflight, and migration tests: `30/30` passing.
- Final independent quality re-review: **no remaining Critical or Important defects**.
- Acceptance migration ordering verifier: passing for phases 49 through 55.
- Isolated Phase 55 behavioral proof: passing.
- Hosted Checkout verifier: `94/94` passing.
- GitHub-hosted acceptance verifier: `194/194` passing.
- Vercel failure-audit verifier: `39/39` passing.
- Full-matrix contract verifier: passing.
- Staging-scoped Preview contract: passing; `23/23` mutations detected.
- F1 evidence-marker self-test: `12/12` passing.
- Worker publication workflow verifier: publication mechanics pass; the captain-owned staging-action fingerprint remains stale.
- Deployment-closure verifier: `5/7`; required runtime paths are absent from this checkout and `public` is absent at the accepted source, so a deployable archive is not proven.
- Full dependency/browser and authenticated external acceptance wait for Lane A's final SHA and the one exact Preview.

## Completed release-control corrections

The approved release-control files now share one candidate-driven application contract and the accepted worker publication pair:

- `.github/workflows/rcap-f1-ephemeral-staging.yml`
- `.github/workflows/rcap-github-hosted-acceptance.yml`
- `.github/workflows/rcap-hosted-acceptance-staging.yml`
- `scripts/rcap-hosted-checkout-gate.mjs`
- `scripts/rcap-hosted-acceptance-auth-config.mjs`
- `scripts/rcap-hosted-acceptance-gallery.mjs`
- `scripts/rcap-hosted-acceptance-payment.mjs`
- `scripts/rcap-hosted-acceptance-preflight.mjs`
- `scripts/f1-ephemeral-staging-stack.mjs`
- `scripts/rcap-github-acceptance-bootstrap.mjs`
- `scripts/rcap-github-acceptance-gate.mjs`
- `scripts/rcap-github-post-payment-acceptance.mjs`
- `scripts/rcap-vercel-failure-audit.mjs`
- their exact release-contract verifiers

The workflows do not declare or pass `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`. Runtime scripts resolve and validate the pinned public Vercel slug/name pair in memory from `VERCEL_TOKEN`.

Candidate-time inputs:

- application/source SHA: exact final SHA supplied by Lane A
- worker source SHA: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- worker digest: `sha256:c1a18b3a9f36f5f7ce0b01268c7bb30242b69cca13cb14bde18281d984098402`

No Preview, migration, payment, worker, or browser action will begin until Lane A supplies the exact final candidate SHA and the canonical worker-input decision is recomputed.
