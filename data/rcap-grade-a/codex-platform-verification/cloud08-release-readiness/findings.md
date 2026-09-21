# CLOUD08 reproduced findings

## CLOUD08-F01 — Stripe reconciliation errors can disclose sensitive text to platform logs

**Reproduction (current head):**

```bash
nl -ba src/lib/stripe/webhook-handler.ts | sed -n '59,90p'
```

Then inspect the catch path: it passes `error.message` directly to `console.error`. This is a reachable runtime path after a webhook has passed Stripe signature verification and a reconciliation dependency throws. A database/provider error can contain participant-controlled metadata, email, IDs, SQL detail, or other sensitive context.

**Expected:** Operational logs contain route, Stripe event ID/type, a bounded internal error code, and request correlation only; arbitrary exception text is redacted by the shared structured logger.

**Actual:** `message: error instanceof Error ? error.message : ...` is emitted without `logSecurityError` sanitization.

**Affected path/symbol:** `src/lib/stripe/webhook-handler.ts`, `handleVerifiedStripeWebhookEvent` catch block.

**Security/user impact:** Sensitive payment or participant context may enter Vercel/runtime logs and downstream log retention, broadening disclosure and retention scope. The response itself remains generic, so this is a logging defect rather than a response leak.

**Smallest bounded patch:** Replace the raw `console.error` call with `logSecurityError`; include allowlisted metadata for event type/outcome and a stable internal error code. Do not log Stripe payloads, signatures, metadata, customer IDs, or raw exception messages. If event ID correlation is required, hash it or explicitly approve it as a non-participant secret-free identifier.

**Focused regression test:** Inject an `Error` containing an email, bearer token, and newline into the verified reconciliation path; capture stderr and assert none of those values appears, the stable error code and route do appear, and the HTTP response remains 500 with only the generic body.

## CLOUD08-F02 — Preview deployment targets are unresolved

**Reproduction (current head):**

```bash
node scripts/verify-rcap-staging-authorization-readiness.mjs
```

**Expected:** A release candidate requested for Preview names an application deployment target and worker deployment target, with all readiness fields populated.

**Actual:** The verifier exits zero because it validates the record shape, but prints `ready to request staging authorization: NO`; `applicationDeploymentTarget` and `workerDeploymentTarget` are blank and owned by Roger.

**Affected path/symbol:** `data/rcap-staging-authorization-readiness.json`, fields `applicationDeploymentTarget` and `workerDeploymentTarget`.

**Security/user impact:** A release operator cannot prove that browser, worker, database, Storage, and Stripe test evidence belongs to the same immutable candidate. Mixing identities can validate one build and release another.

**Smallest bounded patch:** Owner populates the existing readiness record with immutable non-Production targets and reruns its generator/verifier. Do not invent a new deployment mechanism.

**Focused regression test:** Extend/retain the readiness verifier assertion that a release-request mode exits nonzero unless both targets are nonblank, immutable, and tied to the candidate SHA/digest.

## CLOUD08-F03 — Current branch no longer matches frozen hosted-acceptance inputs

**Reproduction (current head):**

```bash
node scripts/verify-rcap-github-hosted-acceptance.mjs
```

**Expected:** The selected release candidate is byte-equivalent to the frozen accepted application and worker inputs, or a new immutable acceptance run is pinned.

**Actual:** `2/195` checks fail: `fallback branch changes frozen application inputs` and `fallback branch changes frozen worker inputs`.

**Affected path/symbol:** `.github/workflows/rcap-github-hosted-acceptance.yml` frozen identity/path-equivalence contract and current ancestor-to-head changes.

**Security/user impact:** Prior hosted evidence cannot be attributed to current head. Reusing it could release untested application/worker bytes.

**Smallest bounded patch:** Run the existing hosted acceptance workflow against a newly pinned current-head candidate and immutable worker digest, then update only the existing acceptance identity/evidence references through the authorized release process.

**Focused regression test:** The same verifier must pass at the candidate SHA, and a one-byte mutation in each frozen application and worker input set must make it fail.

## CLOUD08-F04 — Applied migration order and rollback compatibility are not demonstrated

**Reproduction (current environment):**

```bash
node scripts/verify-rcap-runtime-credential-boundary.mjs
```

**Expected:** A runnable PostgreSQL 16 test applies phase 49 then phase 50 in one controlled window and proves `anon`/`authenticated` cannot execute the protected functions. Preview evidence also proves the old application can run safely against the post-migration schema or identifies a database restore requirement.

**Actual:** The command exits 1: `PostgreSQL 16 is not available in this environment.` The repository staging readiness check separately reports no deployment targets, so no current-head hosted apply receipt closes the gap.

**Affected path/symbol:** `supabase/phase-49-rcap-packet-render-jobs.sql`, `supabase/phase-50-rcap-packet-delivery-hardening.sql`, and the release migration sequence.

**Security/user impact:** Phase 49 alone exposes security-definer functions to browser roles; an unproven rollback can strand the old application on an incompatible schema or require an unrehearsed restore.

**Smallest bounded patch:** No SQL change is requested. Run the existing verifier in its PostgreSQL 16-capable disposable workflow, apply 49→50 without a pause, capture function ACL queries, and execute old/new application compatibility checks plus a disposable backup restore.

**Focused regression test:** Existing credential-boundary test plus a release test that deliberately pauses after phase 49 and must fail; old-build smoke against post-migration schema must either pass or force the checklist to select database restore.
