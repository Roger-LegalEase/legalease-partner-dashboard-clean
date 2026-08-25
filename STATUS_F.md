# STATUS F — Hosted Environment and Release Mechanics

- State: **BLOCKED — NOT HANDOFF READY**
- Worktree: `/Users/rogerroman/LegalEase/legalease-sprint-hosted`
- Branch: `sprint/20260825-hosted`
- Sprint base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Acceptance Supabase project: `hyflxnlhpmiqxvvcoiia`
- Production: **untouched and unauthorized**

## Captain-requested release identity

- Application/source SHA: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- Accepted worker source: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- Accepted immutable worker digest: `sha256:c1a18b3a9f36f5f7ce0b01268c7bb30242b69cca13cb14bde18281d984098402`
- Canonical application-input diff from the accepted source to this Lane F tools branch: empty.
- Canonical worker-input diff from the accepted source to this Lane F tools branch: empty.
- Digest reuse is allowed only while the exact final candidate remains empty across every canonical worker input. A nonempty diff requires a new full-SHA-only image build, secret scans, exact-digest acceptance, and immutable-digest evidence.

## Environment status

- Vercel public identity contract: `roger947s-projects/legalease-partner-dashboard-clean`.
- Vercel authentication and resolved `team_` / `prj_` identities: **unverified**. No stored credentials were accessed.
- Rolling Preview: **not created**.
- Exact final Preview: **not created**.
- Preview deployment ID and URL: **absent**.
- Stripe: test mode required; a real Stripe-delivered webhook has **not** been observed in this sprint.
- Email capture, Playwright, Chromium, GHCR pull, and long-lived worker host: **unverified or absent**.
- External evidence layout: prepared under `/private/tmp/legalease-hosted-acceptance/07675789a80e732d2b835c1e8ba2092b39201b79/` with `screenshots`, `traces`, `console`, `network`, `database`, and `artifacts` folders.

## Migration truth

- Repository sequence and on-disk hashes: phases `49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55` statically verified.
- Last repository-recorded authenticated acceptance-project proof: phase 54.
- Phase 55: **UNPROVEN**. No authenticated acceptance-project ledger, catalog, or behavioral readback was performed in this sprint.
- The hosted migrator now excludes every authorized migration from the best-effort baseline by deriving the exclusion set from `migrationsInApplyOrder`. It initializes phase 55 as `unproven` and may mark it confirmed only after mandatory matter/product/person binding readback passes.
- No migration was applied by this lane.

## Prepared nonproduction mechanics

- Evidence writers support an external directory override instead of requiring tracked evidence output.
- Worker-input planning computes the complete canonical diff and truthfully attributes a reused image to the accepted image source SHA.
- Vercel resolution pins the public team slug and project name, resolves canonical IDs in memory from `VERCEL_TOKEN`, rejects mismatches, uses the public slug for CLI `--scope`, and ignores arbitrary org/project identity inputs.
- Preview selection remains exact-match-only: READY, nonproduction, exact application SHA metadata, exact acceptance project, route state, and Stripe-test configuration. A supplied mismatch refuses instead of creating a substitute.
- The always-run Gallery uses only the repository-pinned acceptance project when its workflow input is absent and still refuses any explicit project mismatch.
- The deploy path contains no `--prod`, alias operation, or project-level environment write.
- Deploy output redaction covers every exact held credential plus JWT, Stripe secret-key, and webhook-signing-secret shapes before streamed logs, failure logs, or failure evidence are written.
- Stored Vercel environment values are not decrypted. The two historical value-disjointness cases remain fail-closed, so full preflight cannot authorize deployment without an approved proof method.

## Verification state

- Focused preparation, worker-plan, Vercel identity, deploy-redaction, Gallery wiring, and phase-55 migrator tests: `23/23` passing.
- Final quality re-review: no remaining Critical or Important findings in the Lane F safe subset.
- Acceptance migration ordering verifier: passing for phases 49 through 55.
- Hosted Checkout verifier: `92/94`; the two failures are its release-control application/worker pin contract.
- GitHub-hosted acceptance verifier: `189/194`; the five failures are its split historical pin contract, the pre-existing compatibility-fixture assertion, and the corresponding frozen-input comparisons.
- Worker publication workflow verifier: publication mechanics pass; the captain-owned staging-action fingerprint remains stale.
- Deployment-closure verifier: `5/7`; required runtime paths are absent from this checkout and `public` is absent at the accepted source, so a deployable archive is not proven.
- Preview reuse/staging-scope verifiers: not runnable because `js-yaml` is absent and dependencies could not be installed within available disk space.
- Full dependency/browser acceptance was not run because dependencies and authenticated external services are unavailable.

## Release-control changes requiring separate approval

The safety reviewer rejected persistent edits to the release-control pins and their verifier guards. They were not retried or bypassed. Before either required verifier can be green, the captain-approved pair above must replace the active application/worker pins consistently in:

- `.github/workflows/rcap-f1-ephemeral-staging.yml`
- `.github/workflows/rcap-github-hosted-acceptance.yml`
- `.github/workflows/rcap-hosted-acceptance-staging.yml`
- `scripts/rcap-hosted-checkout-gate.mjs`
- `scripts/rcap-github-acceptance-bootstrap.mjs`
- `scripts/rcap-github-acceptance-gate.mjs`
- `scripts/rcap-github-post-payment-acceptance.mjs`
- `scripts/rcap-vercel-failure-audit.mjs`
- their exact release-contract verifiers

The three workflow contracts also still declare and pass `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets. Separately approved workflow edits must remove those identity inputs and require only `VERCEL_TOKEN`; the Lane F runtime scripts already resolve and validate the pinned public slug/name pair in memory and ignore arbitrary identity inputs.

Required values:

- application/source SHA: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- worker source SHA: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- worker digest: `sha256:c1a18b3a9f36f5f7ce0b01268c7bb30242b69cca13cb14bde18281d984098402`

No hosted acceptance or release-complete claim is authorized while these blockers remain.
