# Production migration `20260728213131` reconciliation

## Conclusion

**RECOVERED MIGRATION VALIDATED LOCALLY**

The exact 883-statement payload stored in Production migration history has been recovered as the
candidate legacy migration:

`supabase/migrations/20260728213131_remote_schema.sql`

Owner authorization permits this payload to be treated as a candidate recovered legacy migration
for local validation. Original Git provenance remains unavailable. This result validates the
recovered Production-history payload locally; it does not claim that the original Git-authored file,
generating checkout, author, or review provenance was found.

Production was not changed. No migration repair, database push, migration apply, application-data
write, Storage write, tenant provisioning, invitation, deployment, or Auth mutation was run.

## Candidate evidence

| Field | Value |
| --- | --- |
| Migration version | `20260728213131` |
| Migration time | `2026-07-28 21:31:31 UTC` |
| Remote name | `remote_schema` |
| Extraction timestamp | `2026-08-16T22:17:34Z` |
| Statement count | `883` |
| Candidate byte length | `177,074` |
| Candidate SHA-256 | `3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452` |
| Fresh migration-history dump byte length | `202,900` |
| Fresh migration-history dump SHA-256 | `1ac92bf42401da1f912b3e0995dce264320529fcd7eada1b33fa8b56d13e5ce7` |

The payload did not survive the Codespace restart as a filesystem file. The retained Codespace
execution history preserved the prior read-only extraction method and its expected payload hash.
The same method was repeated against project `wwtwtsmywnckfkdaqqeg`:

```bash
npx --yes supabase@latest db dump \
  --linked \
  --data-only \
  --schema supabase_migrations \
  --use-copy \
  --file production-migration-history-data.sql
```

The dump was loaded into an isolated local parser database. The candidate was reconstructed from
the `statements` array using the same expression as the prior investigation:

```sql
select array_to_string(statements, E';\n\n') || ';'
from supabase_migrations.schema_migrations
where version = '20260728213131';
```

The extracted row again returned version `20260728213131`, name `remote_schema`, and cardinality
`883`. The reconstructed payload again produced the prior SHA-256
`3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452`.
The migration-history dump envelope has a generated `\restrict` token and is not expected to keep a
stable whole-file hash; the reconstructed statement stream is the stable byte-for-byte evidence.

## Original provenance result

The historical search covered:

- every local branch, remote branch, tag, and reflog available in the repository;
- every reachable commit with full-history filename, object-name, pickaxe, and content searches;
- unreachable objects reported by `git fsck --full --no-reflogs --unreachable`;
- all retained GitHub pull-request head and merge refs available during the investigation;
- GitHub code, commit, and pull-request search for `20260728213131`,
  `20260728213131*.sql`, and `remote_schema`;
- archived, rescue, integration, and historical feature refs present on the remote;
- the current Codespace, `/tmp`, `/workspaces`, and retained forensic execution output.

No original migration path, blob, commit, reflog entry, pull request, tag, or dangling commit was
found. Searches now find only this reconciliation record. Original Git provenance remains
unavailable.

## Independent candidate replays

Two separate clean containers based on Supabase Postgres `17.6.1.127` were initialized from
`template0`. Each received only the minimal Supabase platform prerequisites referenced by the
payload: `auth.users`, `auth.uid()`, `auth.role()`, the expected schemas and roles, and the
`supabase_realtime` publication. In each container, the timestamp-sorted tracked migration list was
exactly `[20260728213131]`, and the exact candidate file was applied with `ON_ERROR_STOP=1`.

| Replay | Result | Tables | Functions | Views | RLS enabled | RLS forced | Policies |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate replay A | pass | 44 | 35 | 5 | 44 | 1 | 73 |
| Candidate replay B | pass | 44 | 35 | 5 | 44 | 1 | 73 |

There was no candidate replay failure. Both replays produced the same sorted 1,173-row catalog
inventory with SHA-256
`44df2c51900f09ecbcb702865b08eaee4e62d2c56bac43f1da4e408a3875a436`.
The two inventories have zero differing lines.

## Production comparison

A fresh read-only Production dump of `public` was replayed into a separate isolated local database.
The dump was `177,882` bytes with SHA-256
`afd4432b9056d2c9791d5b19b7b005bd78501164ed82431c9b6792e14e07d571`.
No Production schema or data was changed.

The Production replay and both candidate replays have identical names, counts, normalized
definitions, RLS state, and policies:

| Object class | Production | Candidate A | Candidate B | Difference |
| --- | ---: | ---: | ---: | ---: |
| `public` tables | 44 | 44 | 44 | 0 |
| `public` functions | 35 | 35 | 35 | 0 |
| `public` views | 5 | 5 | 5 | 0 |
| RLS-enabled tables | 44 | 44 | 44 | 0 |
| forced-RLS tables | 1 | 1 | 1 | 0 |
| `public` policies | 73 | 73 | 73 | 0 |
| normalized catalog definitions | 1,173 | 1,173 | 1,173 | 0 |

The normalized catalog includes relation state and ACLs, columns and defaults, constraints,
indexes, function bodies/configuration/ACLs, view definitions, and policies. Policy roles are
normalized to role names rather than container-specific role OIDs.

## Current repository replay without the candidate

The repository's existing schema source remains one loose `supabase/partner-journey-os.sql` file
plus 48 loose `supabase/phase-*.sql` files. A fresh clean replay applied all 49 inputs successfully
in the numeric/suffix order implemented by `scripts/local-onboarding-db.sh`. Those loose inputs are
not silently reclassified as post-baseline migrations in this recovery task.

| Object class | Production / candidate | Repository-only replay | Repository-only names |
| --- | ---: | ---: | ---: |
| `public` tables | 44 | 73 | 29 |
| `public` functions | 35 | 113 | 78 |
| `public` views | 5 | 12 | 7 |
| RLS-enabled tables | 44 | 72 | 29 added, 1 common state changed |
| forced-RLS tables | 1 | 0 | 1 common state changed |
| `public` policies | 73 | 124 | 51 |
| normalized catalog definitions | 1,173 | 2,393 | 1,220 added, 90 common changed |

Production has no application-owned `public` table, function, view, policy, or normalized
definition key absent from the repository-only replay. The exact 1,310 definition-level deltas are
recorded in
`docs/rcap/production/MIGRATION_20260728213131_SCHEMA_DIFF.tsv`, whose SHA-256 is
`7fd2cabff4d757d00e8dd767ba96a5936fcbbc66810e9ecb24eba99a48105e7a`.
Each row identifies its status, object kind, exact object key, and the Production and repository MD5
definition fingerprints.

### Exact added object names

The 29 repository-only tables are:

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

The seven repository-only views are:

- `partner_onboarding_agreements_safe`
- `partner_onboarding_artifact_versions_safe`
- `partner_onboarding_assets_safe`
- `partner_onboarding_change_requests_safe`
- `partner_onboarding_prefill_values_safe`
- `partner_onboarding_tasks_safe`
- `partner_onboarding_workspace_safe`

The exact identities of all 78 repository-only functions and all 51 repository-only policies are
the `repository_only` `FN` and `POL` rows in the schema-difference artifact. That artifact also
records 641 added column definitions, 288 constraints, 119 indexes, 36 relation definitions, and
the seven view definitions attached to the added objects.

### Exact changed common definitions

The 90 common-object differences consist of two columns, four constraints, 35 function definitions
or ACLs, and 49 relation definitions or ACLs. Ten function bodies/configurations differ; all 35
common functions have ACL differences. All 49 common relations have ACL differences, and one has a
core RLS-state difference.

The non-ACL changes are:

| Object | Production / candidate | Repository-only replay |
| --- | --- | --- |
| `partner_records.payment_status` default | `not_started` | `unpaid` |
| `partner_records.provisioning_status` default | `request_received` | `blocked_payment_required` |
| `legalease_os_support_items_source_check` | `expungement_ai`, `legalease_umbrella_site` | `expungement_ai` |
| `legalease_os_support_items_type_check` | `support_request`, `waitlist_request` | `support_request` |
| `rcap_intake_sessions_eligibility_signal_check` | five-value set | current nine-value set |
| `rcap_record_events_record_type_check` | `intake_session`, `document_packet` | also partner access-code, entitlement, and onboarding events |
| `rcap_record_events` RLS | enabled and forced | disabled and not forced |

The ten functions with body or configuration changes are:

- `claim_rcap_screening_session(text, text)`
- `consume_rcap_screening_session(uuid)`
- `current_partner_role()`
- `current_partner_slug()`
- `is_internal_admin()`
- `recompute_rcap_partner_entitlements(text, timestamptz)`
- `record_rcap_partner_packet_generation(uuid)`
- `release_expired_rcap_screening_slots(timestamptz)`
- `set_partner_users_updated_at()`
- `set_rcap_document_packets_updated_at()`

The exact common-object keys and both definition fingerprints are the `changed_common` rows in the
schema-difference artifact.

## Storage comparison

The Production schema dump contains these eight platform-managed `storage` tables:

- `buckets`
- `buckets_analytics`
- `buckets_vectors`
- `migrations`
- `objects`
- `s3_multipart_uploads`
- `s3_multipart_uploads_parts`
- `vector_indexes`

The candidate payload contains zero `storage` references, bucket statements, or Storage-policy
statements. A targeted read-only Production data dump, excluding every Storage table except
`storage.buckets`, found two bucket rows:

| Source | Bucket | Public | File limit | MIME types |
| --- | --- | --- | ---: | --- |
| Production | `social-public-assets` | yes | none | unrestricted |
| Production | `content-media` | no | 12,582,912 | JPEG, PNG, WebP, GIF |
| Candidate payload | none | — | — | — |
| Repository replay | `content-media` | no | 12,582,912 | JPEG, PNG, WebP, GIF |
| Repository replay | `rcap-packet-artifacts-private` | no | 52,428,800 | PDF |
| Repository replay | `rcap-partner-onboarding-private` | no | 20,971,520 | PNG, JPEG, WebP, PDF, DOCX |

Production, the candidate payload, and the repository replay each define zero Storage policies.
The two Production bucket rows are exact external-state differences, not statements omitted while
reconstructing the 883-statement array: the remote history payload itself contains no Storage
statement. No bucket was created, changed, or deleted during validation.

## Migration retained and scope boundary

The validated byte-for-byte payload is retained at
`supabase/migrations/20260728213131_remote_schema.sql`. This local result does not authorize a
Production migration repair, database push, bucket change, or application of the 48 loose phase
files. Mapping those loose SQL files into reviewed post-baseline migrations remains a separate
decision.

There is no Production command sequence in this reconciliation. Do not run `supabase migration
repair`, `supabase db push --linked`, `supabase db reset --linked`, or any write-capable substitute
from this result.
