# Executable rollback contract

## Preconditions before release

```bash
set -euo pipefail
export RELEASE_SHA="$(git rev-parse HEAD)"
export ROLLBACK_SHA='<full previously accepted application SHA>'
git cat-file -e "$ROLLBACK_SHA^{commit}"
git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"
git diff --name-status "$ROLLBACK_SHA..$RELEASE_SHA" -- src supabase package.json package-lock.json next.config.ts
```

Record immutable current and rollback Vercel deployment IDs, worker digests, database snapshot/branch ID and time, migration version before/after, feature flags before/after, and owners. Run `npm run build` at both SHAs. Smoke the rollback application against a disposable post-migration database.

**STOP:** rollback deployment is not ready, SHA/digest is mutable, old app fails on new schema, snapshot is absent, or database/Storage restore has not been rehearsed.

## Rollback order

1. **Freeze:** stop release progression; do not open routes; preserve logs/evidence; name incident commander.
2. **Disable first:** restore default-off feature flags and scoped delivery flags. Confirm commercial and mutation surfaces fail closed.
3. **Stop new work:** pause enqueue/schedulers; allow only explicitly safe in-flight work or stop worker. Do not delete jobs.
4. **Application rollback:** move only the Preview alias to the pinned prior deployment. Do not rebuild from a branch name.
5. **Worker rollback:** if worker inputs changed, deploy the pinned prior digest and confirm OCI source revision. Never use a mutable tag.
6. **Database decision:**
   - If prior app is proven compatible with forward schema, leave schema forward and preserve data.
   - If incompatible, restore the rehearsed snapshot into a separate project, validate it, then switch Preview configuration through the authorized process.
   - Do not run ad-hoc reverse SQL for append-only ledgers, claims, payments, audit rows, or Storage ownership.
7. **Stripe:** keep webhook signature verification active. Continue returning retryable failures until the compatible app is live; do not acknowledge unpersisted events. Replay test-mode events after recovery and prove idempotency.
8. **Verify:** auth, health, private Storage, queue leases, email recovery, audit events, and owner/cross-tenant denials.
9. **Resume:** only after alerts recover and incident owner signs evidence. Packet commercial routes remain independently gated.

## Exact post-rollback checks

```bash
curl -fsS "$PREVIEW_URL/api/health" | tee /tmp/cloud08-rollback-health.json
node scripts/security/test-auth-redirect-security.mjs
node scripts/security/test-sign-out-origin.mjs
node scripts/verify-email-delivery.mjs
node scripts/verify-rcap-consumer-delivery-environment.mjs
node scripts/verify-rcap-packet-delivery-db.mjs
node scripts/verify-shared-claim-boundary-db.mjs
```

Query deployment metadata to prove the active deployment ID equals the recorded rollback ID, and query migration history to prove it equals the selected compatible schema state. Compare queue counts by status before/after; no job may disappear. Compare payment/audit ledger counts; rollback must not delete or rewrite history.

**Expected:** all checks green; active immutable IDs match; health recovers; old app/new schema compatibility holds or restored project checks match; cross-owner and anonymous requests remain denied; no duplicate Stripe effect; queue/audit/payment history preserved.

**STOP / escalate:** rollback target unhealthy, database restore mismatch, authentication callback points elsewhere, Storage becomes public, worker reclaims active leases incorrectly, webhook duplicates effects, email recovery fails, alert remains firing, or any evidence requires printing a secret.

## Roll-forward preference

For additive migrations, prefer a bounded application roll-forward over schema reversal. A database restore is a data-loss decision and requires the measured RPO/RTO plus owner approval. This checklist does not authorize Production action.
