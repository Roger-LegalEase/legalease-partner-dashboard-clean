# Production migration `20260728213131` reconciliation

## Classification

**D. UNKNOWN OR UNSAFE**

Production was not changed during this investigation. No migration history was repaired, no
database push was run, and no application data was written.

The remote row is recoverable and its present-day schema effect can be reproduced, but its
source provenance and the intended tracked baseline cannot be proven. The precise file is absent
from every reachable Git ref and pull-request ref, while the approved repository has no Supabase
migration directory. Restoring or synthesizing a migration would therefore assert history that the
repository does not prove.

This classification stops the canary-enablement work before any schema or product implementation.

## Historical search result

The search covered:

- every local branch, remote branch, tag, and reflog available in the repository;
- every reachable commit with `git log --all --full-history`, `git rev-list --all`, filename
  searches, and content searches;
- unreachable objects reported by `git fsck --full --no-reflogs --unreachable`;
- all 101 retained GitHub pull-request head and merge refs;
- GitHub code, commit, and pull-request search for `20260728213131`,
  `20260728213131*.sql`, and `remote_schema`;
- archived, rescue, integration, and historical feature refs present on the remote.

No commit, blob, path, reflog entry, pull request, or tag contains the timestamped migration or an
exact source file. There were no dangling commits available for recovery.

The repository at base commit `664b8ddd374642bf2bd1820f7e05224f3dd081bc` contains neither
`supabase/migrations/` nor `supabase/config.toml`. Its schema source is one loose
`supabase/partner-journey-os.sql` file plus 48 loose `supabase/phase-*.sql` files, ordered by the
custom numeric/suffix ordering in `scripts/local-onboarding-db.sh`. Those files do not constitute a
Supabase CLI migration history.

## Production migration-history result

Read-only inspection of project `wwtwtsmywnckfkdaqqeg` returned one remote-only history row:

| Local version | Remote version | Remote name |
| --- | --- | --- |
| absent | `20260728213131` | `remote_schema` |

The remote history row contains 883 schema statements. The extracted statement stream has SHA-256
`3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452`.
The read-only migration-history dump has SHA-256
`77e0168fa35d1b14765d2209088e21d6f5df9f67ef548ff702b547985695b162`.
These hashes identify the evidence captured during this investigation; they are not a claim that an
original Git migration was recovered.

Replaying the 883 statements into an isolated local Supabase-compatible database produced 44
`public` tables. Replaying a fresh read-only dump of Production's `public` schema into another
isolated local database produced a canonical `pg_dump` that differed only in the random
`\restrict`/`\unrestrict` token. This proves that the remote history payload describes the current
Production `public` schema. It does not prove where the payload was generated, who generated it,
which reviewed source set it represented, or why its file was never committed.

## Clean local replay result

A fresh local Supabase Postgres database replayed the repository's base schema and all 48 loose
phase files in the repository-defined order. All 49 SQL inputs applied successfully.

The clean replay is not semantically equivalent to Production:

| Object class | Production `public` | Clean local `public` | Local-only names | Production-only names |
| --- | ---: | ---: | ---: | ---: |
| tables | 44 | 73 | 29 | 0 |
| functions | 35 | 112 | 77 | 0 |
| views | 5 | 12 | 7 | 0 |

Definition-level catalog comparison also found 90 Production definitions that are absent or changed
in the final local replay: two column definitions, four check constraints, 35 function definitions
or ACLs, and 49 table/view RLS, reloption, or ACL definitions. Ten of the 35 function differences
remain after ACLs are excluded. This prevents a claim that the remote snapshot and current replay
are equivalent.

## Exact schema differences

Production has no application-owned `public` table, function, or view name that is absent from the
clean local replay. The clean replay adds these 29 tables:

- `consumer_packet_payment_consumption`
- `packet_credit_ledger`
- `packet_delivery_events`
- `packet_render_jobs`
- `partner_access_codes`
- `partner_email_deliveries`
- `partner_onboarding`
- `partner_onboarding_activity`
- `partner_onboarding_agreements`
- `partner_onboarding_artifact_reviews`
- `partner_onboarding_artifact_versions`
- `partner_onboarding_artifacts`
- `partner_onboarding_assets`
- `partner_onboarding_authorizations`
- `partner_onboarding_change_request_internal_notes`
- `partner_onboarding_change_requests`
- `partner_onboarding_contacts`
- `partner_onboarding_idempotency`
- `partner_onboarding_integration_events`
- `partner_onboarding_launch_approvals`
- `partner_onboarding_launch_checks`
- `partner_onboarding_planned_users`
- `partner_onboarding_prefill_batches`
- `partner_onboarding_prefill_values`
- `partner_onboarding_report_recipients`
- `partner_onboarding_sections`
- `partner_onboarding_tasks`
- `partner_packet_entitlement`
- `rcap_screening_analytics_events`

The clean replay adds seven partner-onboarding safe views:

- `partner_onboarding_agreements_safe`
- `partner_onboarding_artifact_versions_safe`
- `partner_onboarding_assets_safe`
- `partner_onboarding_change_requests_safe`
- `partner_onboarding_prefill_values_safe`
- `partner_onboarding_tasks_safe`
- `partner_onboarding_workspace_safe`

The 77 local-only functions are the access-code, onboarding, artifact, launch-readiness, packet
rendering/delivery, payment-authority, analytics, and participant-namespace functions introduced by
the corresponding loose phase files. In particular, the canonical relations previously returning
`PGRST205` -- `partner_onboarding` and `partner_access_codes` -- are current repository relations
that are absent from Production; they are not obsolete query names.

The six non-function definition differences that are not ACL/RLS metadata are:

| Object | Production | Clean local replay |
| --- | --- | --- |
| `partner_records.payment_status` default | `not_started` | `unpaid` |
| `partner_records.provisioning_status` default | `request_received` | `blocked_payment_required` |
| `legalease_os_support_items_source_check` | permits `expungement_ai`, `legalease_umbrella_site` | permits `expungement_ai` |
| `legalease_os_support_items_type_check` | permits `support_request`, `waitlist_request` | permits `support_request` |
| `rcap_intake_sessions_eligibility_signal_check` | older five-value set | current nine-value set |
| `rcap_record_events_record_type_check` | `intake_session`, `document_packet` | also partner access-code, entitlement, and onboarding events |

Managed `storage` objects differ between the hosted platform and the local shim. Those managed
Storage differences were excluded from the application-schema classification.

## Why A, B, and C are not proven

- **A is not available:** the precise migration file does not exist in Git history. The remote
  history payload is evidence of applied schema, not a Git-authored source file.
- **B is not available:** Production is not equivalent to the current clean local replay; 29 tables,
  77 functions, seven views, and definition-level changes separate them.
- **C is not proven:** no Production-only application object name exists, while the original source
  and intent of the changed common-object definitions are unavailable. Generating a reconciliation
  migration now would guess whether those differences are intentional remote drift or simply the
  older state captured by an uncommitted baseline.

## Migration restored or generated

None. An empty placeholder would conceal the mismatch. A generated snapshot would invent source
provenance. Copying the remote payload into `supabase/migrations/` would also leave 49 loose SQL
inputs outside the CLI history and would not define a safe ordering for future Production pushes.

## Evidence required to unblock

At least one of the following must be recovered and reviewed before another implementation branch
may proceed:

1. the original `20260728213131_remote_schema.sql` plus its generating checkout/commit and review
   provenance; or
2. an authoritative migration-baseline decision that explicitly adopts the remote 883-statement
   payload, maps every loose repository SQL file to tracked post-baseline migrations, and documents
   how existing Production objects and data are preserved.

That decision must also identify which loose schema changes are approved for Production. Some later
files contain data backfills and destructive statements, so treating every loose phase file as one
pending batch would violate the release safety rules.

## Post-merge production commands

There is no safe post-merge Production command sequence for this classification, and this blocked
forensic branch must not be merged as a migration fix. Until the evidence above is resolved, the
only permitted commands are read-only confirmation:

```bash
npx --yes supabase@latest migration list --linked
npx --yes supabase@latest db dump --linked --schema public --file /tmp/production-public-schema.sql
```

Do **not** run `supabase migration repair`, any form of `supabase db push --linked`, `supabase db
reset --linked`, or apply the loose phase files to Production.

## Rollback and verification

No rollback is required because Production was untouched. Verification consists of confirming that
the remote migration list still contains only the observed remote-only row, the Production schema
hashes remain unchanged, and no write-capable command appears in the operator audit trail.

Local forensic databases and the isolated linked checkout are disposable and contain schema only.
They are not migration sources and must not be committed.
