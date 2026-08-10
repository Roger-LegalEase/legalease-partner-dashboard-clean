# F0 Execution Command List — prepared, not run

Session F staging-rehearsal lane. MODE: PREP_ONLY. Every command below is
inert until the execution gate is complete (all fields supplied by Terminal A,
staging authorization granted by Roger naming both migration files and the
staging environment, per `data/rcap-authorization-queue.json` A1-staging).

Placeholders in angle brackets come from the gate block or the platform secret
store. No secret value is ever echoed, committed, or logged.

## 0. Preflight (immediately before any execution)

```bash
git fetch origin
git checkout <FINAL_INTEGRATION_SHA>            # from Terminal A; do NOT assume e078a87f
sha256sum supabase/phase-49-rcap-packet-render-jobs.sql   # must equal PHASE_49_SHA256 AND the queue's authorizedSha256
sha256sum supabase/phase-50-rcap-packet-delivery-hardening.sql  # must equal PHASE_50_SHA256 AND the queue's authorizedSha256
# Confirm target is staging, not production:
psql "$STAGING_DATABASE_URL" -Atc "select current_database(), inet_server_addr()"
```

Stop on any mismatch.

## 1. Before-state capture (Stage 1)

```bash
psql "$STAGING_DATABASE_URL" -Atc "select version()"
psql "$STAGING_DATABASE_URL" -Atc "select tablename from pg_tables where schemaname='public' order by 1"
psql "$STAGING_DATABASE_URL" -Atc "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1"
psql "$STAGING_DATABASE_URL" -Atc "select polname, tablename from pg_policies where schemaname='public' order by 2,1"
psql "$STAGING_DATABASE_URL" -Atc "select rolname from pg_roles order by 1"
# Supabase migration ledger (baseline note: pre-49 phases prove by object presence):
psql "$STAGING_DATABASE_URL" -Atc "select * from supabase_migrations.schema_migrations" 2>/dev/null || true
# Storage buckets via service API (no secrets printed):
curl -sf "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '[.[].name]'
```

## 2. Migration application (Stage 2) — exact authorized sequence only

```bash
sha256sum supabase/phase-49-rcap-packet-render-jobs.sql          # recompute at apply time
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/phase-49-rcap-packet-render-jobs.sql
# Post-49 object verification (tables, trigger, functions, grants, RLS):
psql "$STAGING_DATABASE_URL" -f docs/rcap/staging-rehearsal/sql/verify-phase-49-objects.sql   # to be generated from the migration at execution time

sha256sum supabase/phase-50-rcap-packet-delivery-hardening.sql   # recompute at apply time
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/phase-50-rcap-packet-delivery-hardening.sql
psql "$STAGING_DATABASE_URL" -f docs/rcap/staging-rehearsal/sql/verify-phase-50-objects.sql
```

Object verification asserts presence (never IF-NOT-EXISTS masking): expected
tables, columns, constraints, indexes, triggers, functions, function ownership,
pinned `search_path`, EXECUTE grants, revoked direct DML, RLS state, bucket and
policy state, and the migration-ledger row.

## 3. Application deployment, flags disabled (Stage 3)

Target: `<APPLICATION_DEPLOYMENT_TARGET>` (Vercel per docs/PHASE_17; exact
project supplied by gate).

```bash
vercel deploy --prod=false --token "$VERCEL_TOKEN" ...   # pin to <FINAL_INTEGRATION_SHA>; exact form set by the target
# Verify deployed SHA and health:
curl -sf https://<staging-domain>/api/health || curl -sfI https://<staging-domain>/
# Verify env: staging Supabase URL only; no production vars; delivery flag disabled.
```

## 4. Worker build and deploy, claims disabled (Stage 4)

Note: no Docker daemon exists in this container. The image must be built by CI
or the platform builder; only the digest is consumed here.

```bash
docker build -f deploy/rcap-render-worker/Dockerfile -t rcap-render-worker:<FINAL_INTEGRATION_SHA> .   # on a builder host
docker inspect --format '{{index .RepoDigests 0}}' rcap-render-worker:<FINAL_INTEGRATION_SHA>          # must equal WORKER_IMAGE_DIGEST
# Deploy to <WORKER_DEPLOYMENT_TARGET> with claims disabled, RCAP_WORKER_CONTAINER_DIGEST set to the digest,
# secrets from the platform secret store only, restart=always, SIGTERM grace < claim lease (600s default).
```

Health: process liveness + `packet_render_jobs` aged-claimable query from
`docs/RCAP_RENDER_WORKER_DEPLOYMENT.md`.

## 5. Feature enablement (Stage 7)

Mechanism `<STAGING_FEATURE_FLAG>` — **no in-code named flag exists in the
delivery path today** (discovery fact); enablement is worker claim scope +
route deployment unless A names a different mechanism. Enable only the
controlled staging partner scope.

## 6. Render request and download (Stages 8, 9, 12)

```bash
# Authenticated render request (session cookie from real Supabase Auth sign-in):
curl -sf -X POST https://<staging-domain>/api/rcap/documents/<packetId>/generate -H 'cookie: <session>' ...
# Watch the job:
psql "$STAGING_DATABASE_URL" -Atc "select id,status,delivery_eligibility,accounting_result from packet_render_jobs where id='<jobId>'"
# Authenticated download (route under test):
#   GET /api/rcap/packets/<jobId>/download
# Browser-driven (pinned chromium, mobile viewport):
RCAP_E2E_CHROMIUM=/opt/pw-browsers/chromium node <lane playwright driver> --url https://<staging-domain>/...
```

## 7. Accounting and delivery-event inspection (Stages 10, 15)

```bash
psql "$STAGING_DATABASE_URL" -Atc "select partner_id,entitlement_id,person_id,matter_id,entry_type from packet_credit_ledger order by created_at"
psql "$STAGING_DATABASE_URL" -Atc "select job_id,event_type,created_at from packet_delivery_events order by created_at"
psql "$STAGING_DATABASE_URL" -Atc "select count(*) from packet_render_jobs where status='failed' and failure_disposition='terminal'"
```

## 8. Rollback and disablement (Stage 14)

```bash
# 1. disable worker claims (scale to zero or platform disable)
# 2. disable <STAGING_FEATURE_FLAG>
# 3. prove no new lane entries:
psql "$STAGING_DATABASE_URL" -Atc "select count(*) from packet_render_jobs where created_at > '<disable-timestamp>'"
# 4. preserve jobs/artifacts/ledger/events (assert counts unchanged)
# 5. app health check
# 6. restore flag + controlled worker; 7. one smoke packet (SF-RBK-04)
```

No data-bearing migration is reversed; migration defects use forward repair.

## Local ephemeral rehearsal (already authorized, already run green)

```bash
export PATH="/usr/lib/postgresql/16/bin:$PATH"
npm run rcap:verify-render-job-contract
npm run rcap:verify-packet-render-jobs
npm run rcap:verify-packet-delivery      # db + worker crash-injection + mobile e2e
node scripts/verify-rcap-mutation-authority.mjs
```
