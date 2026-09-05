# Executable Preview acceptance checklist

All commands run against an explicitly named **non-Production** Preview/staging environment. Never paste secret values into logs or evidence. Replace shell placeholders locally; evidence records hashes/IDs, not credentials.

## 0. Candidate and scope lock

```bash
set -euo pipefail
export BASE_SHA=4fb89c96e2886e6d9d80f9bb757278c20ecb6b13
export CANDIDATE_SHA="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$BASE_SHA" "$CANDIDATE_SHA"
git status --short
git diff --name-only "$BASE_SHA..$CANDIDATE_SHA" | sort > /tmp/cloud08-candidate-paths.txt
```

**Expected evidence:** full SHA; ancestor exit 0; clean tree except this CLOUD08 output before commit; sorted path file.
**STOP:** ancestry fails, candidate is not the selected branch head, unowned work exists, or consumer/RCAP changes overlap Fable packet paths/shared modules without written ownership.

## 1. Resolve immutable Preview identity

```bash
node scripts/verify-rcap-staging-authorization-readiness.mjs | tee /tmp/cloud08-staging-readiness.txt
rg -n 'ready to request staging authorization: YES' /tmp/cloud08-staging-readiness.txt
```

Record: candidate SHA, Vercel deployment ID/URL, Preview Supabase project ref, worker source SHA and image digest, Stripe **test-mode** endpoint ID, Auth site URL/redirect allowlist, Storage bucket name, email sink/provider, feature-flag values, evidence run ID, and each owner.

**Expected:** both commands exit 0 and immutable targets match the candidate.
**STOP:** readiness says NO; any target is mutable/blank; any identifier is Production; worker digest/source mismatch.

## 2. Static candidate gates

```bash
npm ci
npm run typecheck
npm run lint
npm run build
node scripts/security/test-auth-redirect-security.mjs
node scripts/verify-email-delivery.mjs
node scripts/security/test-clinic-telemetry-redaction.mjs
node scripts/verify-rcap-github-hosted-acceptance.mjs
node scripts/verify-rcap-hosted-acceptance-verdicts.mjs
```

**Expected:** every command exits 0. Email remains dry-run/default-off unless this Preview explicitly uses its sink.
**STOP:** any failure; especially frozen input equivalence failure or a secret-like string in output.

## 3. Migration dry run and order proof

On a disposable PostgreSQL 16/Supabase clone only:

```bash
node scripts/verify-rcap-runtime-credential-boundary.mjs
node scripts/verify-rcap-packet-delivery-db.mjs
node scripts/verify-shared-claim-boundary-db.mjs
node scripts/test-internal-admin-rls-hardening.mjs
```

Apply the repository sequence only through the existing authorized workflow. Phase 49 and phase 50 are one indivisible window, in that order. Capture `supabase_migrations.schema_migrations`, object ACLs, RLS policies, private bucket rows, and test counts after apply.

**Expected:** all exit 0; browser roles cannot execute protected mutation functions; bucket is private; sequence is complete and ordered.
**STOP:** PostgreSQL unavailable, phase 49 can stand alone, any browser-role call succeeds, migration drift exists, or destructive SQL lacks a restore rehearsal.

## 4. Auth callback and recovery

In Supabase Preview Auth settings, verify Site URL equals the immutable Preview origin and allowed redirects contain only exact required HTTPS Preview callback origins. Then execute:

```bash
node scripts/security/test-auth-redirect-security.mjs
node scripts/security/test-sign-out-origin.mjs
```

Browser evidence: create a Preview-only user; confirm signup link, OAuth/magic-link callback if enabled, forgot-password email, set-password, sign-in, sign-out, expired/reused recovery-link denial, and rejection of an external `next` URL.

**Expected:** callbacks remain on Preview; one-time recovery succeeds once; reused/expired tokens fail generically.
**STOP:** Production URL receives Preview token, wildcard redirect is needed, open redirect occurs, or email/token appears in logs.

## 5. Stripe test webhook contract

Configure two **test-mode** endpoints exactly as implemented:

- `/api/stripe/webhook` → `STRIPE_WEBHOOK_SECRET`
- `/api/method/expungement.api.payment.stripe_webhook` → `STRIPE_LEGACY_WEBHOOK_SECRET`

Use Stripe CLI/test fixtures from the Preview operator environment:

```bash
stripe listen --forward-to "$PREVIEW_URL/api/stripe/webhook"
stripe trigger checkout.session.completed
curl -sS -o /tmp/unsigned.json -w '%{http_code}\n' -X POST "$PREVIEW_URL/api/stripe/webhook" -d '{}'
```

**Expected:** signed supported event returns 2xx and exactly-once reconciliation evidence; unsigned request returns 400; retry is idempotent; no payload/signature/customer data in logs.
**STOP:** live-mode key/endpoint, 2xx before durable reconciliation, duplicate entitlement/payment effect, raw error detail in logs, or F01 remains open.

## 6. Private Storage and queues

Run the existing hosted matrix with the pinned Preview project/worker identity, then:

```bash
node scripts/verify-rcap-render-job-contract.mjs
node scripts/verify-rcap-render-worker-runtime.mjs
node scripts/verify-rcap-packet-delivery-e2e.mjs
node scripts/verify-rcap-consumer-delivery-environment.mjs
```

**Expected:** anonymous/cross-owner reads denied; private object integrity re-read succeeds; queue claim/lease/retry/dead-letter behavior is evidenced; worker digest matches; delivery remains disabled or exactly scoped.
**STOP:** public bucket, service-role key in browser/runtime response, stale jobs without alert, unbounded retry, worker identity mismatch, or any commercial route opens from platform success alone.

## 7. Email delivery

```bash
node scripts/verify-email-delivery.mjs
```

Send only to the Preview sink/test recipients. Prove invitation, recovery, resume, failure/retry, suppression/bounce visibility, sender-domain configuration, reply-to, and provider message correlation without addresses in logs.

**Expected:** provider/sink receipt, persisted delivery state, generic participant failure, support path.
**STOP:** Production recipients, unverified sender, silent provider failure, missing recovery delivery, or PII in logs.

## 8. Health, monitoring, alerts, and audit

```bash
curl -fsS "$PREVIEW_URL/api/health" | tee /tmp/cloud08-health.json
node -e 'const x=require("/tmp/cloud08-health.json"); if(!x.ok||x.checks?.db!=="ok") process.exit(1)'
```

Induce one controlled failure at a time in Preview: DB denial, stopped worker/stale queue, invalid Stripe signature then reconciliation 500, email provider rejection, missing Storage object. Capture monitor detection timestamp, alert delivery timestamp, incident owner acknowledgement, correlation ID, recovery timestamp, and redacted logs.

**Expected:** health 200/`db: ok`; each operational failure reaches a named owner within its declared threshold; recovery resolves it; audit event is durable and queryable.
**STOP:** health covers only DB without supplemental monitors; exporter is disabled; alert has no destination/owner; alert contains sensitive data; no recovery signal.

## 9. Backup/restore and final acceptance

Create a Preview database backup/branch snapshot using the existing Supabase plan, record its opaque ID/time, seed canary rows and a private object, apply migrations, then restore into a separate disposable project. Compare schema migration rows, canary row hashes/counts, Auth identity counts (not addresses), Storage object hashes, and RLS/ACL denial tests.

**Expected:** measured RPO/RTO, complete restore, private Storage preserved, denials still hold.
**STOP:** backup capability is assumed rather than executed, restore targets the source project, object bytes/ACL differ, or owner cannot state acceptable RPO/RTO.

Final release evidence must bind all results to the same candidate SHA, deployment ID, project ref, worker digest, test webhook endpoint, migration receipt, and alert test run. Platform acceptance grants **no** packet commercial authority.
