# Production readiness capture — 2026-09-29

These are sanitized, read-only Supabase catalog/aggregate responses from project
`wwtwtsmywnckfkdaqqeg`, captured through the existing Supabase integration in
explicit read-only transactions. Each JSON records its actual UTC capture time,
exact query and response. No customer rows or credentials are retained. These
fixtures prove observations; frozen source files remain the expected authority.
They are not migration receipts or Production authorization.

`rcap-production-readiness-replay.test.mjs` runs the actual Clinic entrypoint
against the captured queries and the actual forward inventory, packet
certification, Legal Aid inventory and smoke schema predicates.

- Clinic: complete 10 tables/RLS, 22 functions; corrected source certification
  returns `clinic_jurisdiction`, no write.
- Forward inventory: baseline present; all seven prerequisites and eleven
  positions 17–27 signatures present; ordered prefix, no unsafe gaps. Signatures
  do not certify semantics. Canonical matter RPC body is stale and the packet
  dependency catalog has 19 semantic differences. Current readback and apply
  controls correctly refuse. A separately reviewed exact forward correction is
  necessary; no historical replay or ledger adoption is permitted.
- Legal Aid: exact prerequisites, empty schema, no private bucket. A write is
  needed, but the independent hosted-browser prerequisite is missing. Historical
  native migration run `35114154196`, artifact `10453896397`, ZIP SHA256
  `fad3384b88249d8cd2411089867b2971c97f66b258269e5958f7a12c29be45db`
  proves the exact same migration source/hash, not browser acceptance. All 92
  successful F1 runs since September 16 were checked for successful Legal Aid
  browser steps; none supplied that proof. Existing authorization stays pending.
- Worker queue: zero queued, claimed, stale queued and terminal failed jobs.
  Machine identity and secret names still require GitHub's secret context.
- Smoke Clinic and save/claim schema predicates pass. This is not a smoke receipt:
  deployment metadata, current alias resolution, runtime origin, health,
  transactional rollback fixture and HTTP negative/reset controls remain separate
  checks. No synthetic transaction or HTTP POST was executed against Production.

## Single remaining secret-context inventory run (prepared, not dispatched)

After independent review/publication, the existing
`rcap-f1-ephemeral-staging.yml` mode `production_legal_aid_keys_read` can collect
all remaining Fly/Vercel names and identity information in one read-only run.
It runs the existing key read, sets up flyctl, then runs:

```sh
node scripts/rcap-production-readiness-inventory.mjs
```

The existing job obtains `VERCEL_TOKEN` and `FLY_API_TOKEN` directly from GitHub
repository secrets. Neither is copied to this session. The collector performs
only Vercel/Fly GET requests and `flyctl secrets list --app
legalease-rcap-render-worker --json`, projects only secret names, and writes
`production-canary-evidence/production-readiness-inventory.json` to the existing
artifact. Expected output shape: Production key names/types/targets; exact
staged/rollback IDs, READY state and release metadata; per-domain current
deployment IDs; Machine count/state/image digest/OCI revision/digest environment
identity/restart/memory/inbound-service count; secret names. No value or raw
Machine environment/configuration is persisted. Output is observation requiring
review, never an automatic deployment authorization or assumed PASS.

Key creation and worker deployment remain
`READY_PENDING_SECRET_CONTEXT_READBACK`; do not claim SKIP or writes required
before those actual observations arrive. Smoke also depends on the separate
schema correction and missing Legal Aid browser prerequisite. No next mutating
sequence is ready for dispatch on the present evidence.
