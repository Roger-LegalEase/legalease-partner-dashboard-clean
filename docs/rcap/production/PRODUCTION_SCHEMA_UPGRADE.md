# RCAP Production schema upgrade

## Conclusion

**FORWARD-ONLY UPGRADE BUILT AND PROVEN LOCALLY**

Nine forward migrations take the recovered Production baseline to the accepted
repository schema. Two independent local replays from the baseline produce byte-identical
catalogs, and that catalog is identical to the accepted repository schema across 5,164
normalized definitions.

Production was not connected to, read, or changed. There is no `supabase login`, `link`,
remote `migration list`, `db push`, `db pull`, `migration repair` or `db reset` anywhere in
this work. The recovered baseline file is byte-for-byte unchanged.

## Starting point

| Field | Value |
| --- | --- |
| Baseline migration | `supabase/migrations/20260728213131_remote_schema.sql` |
| Byte length | `177,074` |
| SHA-256 | `3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452` |
| Replayed objects | 44 tables, 35 functions, 5 views, 44 RLS-enabled tables, 1 forced-RLS table, 73 policies |

Those counts reproduce the candidate and Production replays recorded in
`MIGRATION_20260728213131_RECONCILIATION.md` exactly, which is what makes this a valid
starting point rather than an assumption.

## Ordered SQL-input map

The repository's schema source is one `supabase/partner-journey-os.sql` plus 48
`supabase/phase-*.sql` files, ordered by phase number and then letter suffix. "Forward-safe
as written" describes the file applied **on top of the baseline**, which is a different
question from whether it applies to an empty database — all 49 do that.

| # | path | phase | applies after | already in the baseline | changes | forward-safe as written |
| ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `supabase/partner-journey-os.sql` | base | — | partly, 4 of 5 | tables | yes |
| 2 | `supabase/phase-13-paid-provisioning.sql` | 13 | `partner-journey-os.sql` | adds no table | tables | yes |
| 3 | `supabase/phase-14-onboarding-persistence.sql` | 14 | `phase-13-paid-provisioning.sql` | adds no table | tables | yes |
| 4 | `supabase/phase-16-email-delivery.sql` | 16 | `phase-14-onboarding-persistence.sql` | no, 1 new | tables | yes |
| 5 | `supabase/phase-18-rcap-wilma-intake.sql` | 18 | `phase-16-email-delivery.sql` | yes, all 2 | tables | yes |
| 6 | `supabase/phase-19-mississippi-document-generator.sql` | 19 | `phase-18-rcap-wilma-intake.sql` | yes, all 4 | tables, functions | yes |
| 7 | `supabase/phase-19i-illinois-document-generator.sql` | 19i | `phase-19-mississippi-document-generator.sql` | adds no table | tables | yes |
| 8 | `supabase/phase-20-dc-document-generator.sql` | 20 | `phase-19i-illinois-document-generator.sql` | adds no table | none | yes |
| 9 | `supabase/phase-21-partner-auth-rls-foundation.sql` | 21 | `phase-20-dc-document-generator.sql` | yes, all 1 | tables, functions, RLS, policies, grants | yes |
| 10 | `supabase/phase-22-enable-rls-rcap-user-profiles.sql` | 22 | `phase-21-partner-auth-rls-foundation.sql` | adds no table | RLS | yes |
| 11 | `supabase/phase-23-partner-pilot-requests.sql` | 23 | `phase-22-enable-rls-rcap-user-profiles.sql` | yes, all 1 | tables, RLS | yes |
| 12 | `supabase/phase-24-request-rate-limit-buckets.sql` | 24 | `phase-23-partner-pilot-requests.sql` | yes, all 1 | tables, functions, RLS, grants, data | yes |
| 13 | `supabase/phase-25-partner-billing-invoices.sql` | 25 | `phase-24-request-rate-limit-buckets.sql` | yes, all 2 | tables, RLS | yes |
| 14 | `supabase/phase-26-consumer-briefcase-items.sql` | 26 | `phase-25-partner-billing-invoices.sql` | yes, all 1 | tables, RLS, policies | needs guard — re-creates 4 existing policy/ies |
| 15 | `supabase/phase-27-consumer-checkout-metadata.sql` | 27 | `phase-26-consumer-briefcase-items.sql` | adds no table | tables | yes |
| 16 | `supabase/phase-27-rcap-source-document-persistence.sql` | 27 | `phase-27-consumer-checkout-metadata.sql` | adds no table | none | yes |
| 17 | `supabase/phase-28-consumer-packet-generation-status.sql` | 28 | `phase-27-rcap-source-document-persistence.sql` | adds no table | none | yes |
| 18 | `supabase/phase-28-rcap-record-audit-trail.sql` | 28 | `phase-28-consumer-packet-generation-status.sql` | yes, all 1 | tables, functions, grants | yes |
| 19 | `supabase/phase-29-consumer-wilma-telemetry.sql` | 29 | `phase-28-rcap-record-audit-trail.sql` | yes, all 1 | tables, RLS, policies | needs guard — re-creates 1 existing policy/ies |
| 20 | `supabase/phase-29-rcap-relief-outcome.sql` | 29 | `phase-29-consumer-wilma-telemetry.sql` | adds no table | tables, functions, data | yes |
| 21 | `supabase/phase-30-rcap-person-identity.sql` | 30 | `phase-29-rcap-relief-outcome.sql` | yes, all 1 | tables, functions | yes |
| 22 | `supabase/phase-31-legalease-os-support-queue.sql` | 31 | `phase-30-rcap-person-identity.sql` | yes, all 1 | tables, RLS, policies | **no** — narrows two CHECKs Production has wider; excluded |
| 23 | `supabase/phase-32-expungement-screening-sessions.sql` | 32 | `phase-31-legalease-os-support-queue.sql` | yes, all 1 | tables, RLS | yes |
| 24 | `supabase/phase-33-expungement-screening-resume-links.sql` | 33 | `phase-32-expungement-screening-sessions.sql` | adds no table | tables | yes |
| 25 | `supabase/phase-34-expungement-screening-drop-point-nudges.sql` | 34 | `phase-33-expungement-screening-resume-links.sql` | adds no table | tables | yes |
| 26 | `supabase/phase-35-rcap-partner-entitlement.sql` | 35 | `phase-34-expungement-screening-drop-point-nudges.sql` | yes, all 1 | tables, functions | yes |
| 27 | `supabase/phase-35b-rcap-screening-session-partner-mode.sql` | 35b | `phase-35-rcap-partner-entitlement.sql` | adds no table | tables | yes |
| 28 | `supabase/phase-35c-rcap-claim-screening-session.sql` | 35c | `phase-35b-rcap-screening-session-partner-mode.sql` | adds no table | functions, grants, data | yes |
| 29 | `supabase/phase-35d-rcap-slot-lifecycle.sql` | 35d | `phase-35c-rcap-claim-screening-session.sql` | adds no table | functions, grants | yes |
| 30 | `supabase/phase-37-rcap-document-packets-all-state-source-constraints.sql` | 37 | `phase-35d-rcap-slot-lifecycle.sql` | adds no table | none | yes |
| 31 | `supabase/phase-38-expungement-pending-screening-results.sql` | 38 | `phase-37-rcap-document-packets-all-state-source-constraints.sql` | yes, all 1 | tables, RLS, policies | needs guard — re-creates 1 existing policy/ies |
| 32 | `supabase/phase-39-rcap-partner-packet-cap.sql` | 39 | `phase-38-expungement-pending-screening-results.sql` | adds no table | functions, grants, data | yes |
| 33 | `supabase/phase-40-web-analytics-events.sql` | 40 | `phase-39-rcap-partner-packet-cap.sql` | yes, all 2 | tables, RLS, policies | needs guard — re-creates 2 existing policy/ies |
| 34 | `supabase/phase-41-rcap-partner-access-codes.sql` | 41 | `phase-40-web-analytics-events.sql` | no, 1 new | tables, functions, RLS, policies, grants, data | yes |
| 35 | `supabase/phase-41b-rcap-screening-analytics.sql` | 41b | `phase-41-rcap-partner-access-codes.sql` | no, 1 new | tables, functions, RLS, policies, grants, data | yes |
| 36 | `supabase/phase-42-partner-onboarding.sql` | 42 | `phase-41b-rcap-screening-analytics.sql` | no, 2 new | tables, functions, RLS, policies, data | yes |
| 37 | `supabase/phase-43-content-platform.sql` | 43 | `phase-42-partner-onboarding.sql` | yes, all 19 | tables, functions, views, RLS, policies, grants, Storage, data | yes |
| 38 | `supabase/phase-43-rcap-partner-onboarding-phase1.sql` | 43 | `phase-43-content-platform.sql` | no, 12 new | tables, functions, views, RLS, policies, grants, Storage, data | yes |
| 39 | `supabase/phase-44-rcap-onboarding-prefill.sql` | 44 | `phase-43-rcap-partner-onboarding-phase1.sql` | no, 2 new | tables, functions, views, RLS, policies, grants, data | yes |
| 40 | `supabase/phase-45-rcap-onboarding-artifacts.sql` | 45 | `phase-44-rcap-onboarding-prefill.sql` | no, 3 new | tables, functions, views, RLS, policies, grants, data | yes |
| 41 | `supabase/phase-46-rcap-onboarding-media-contact-role.sql` | 46 | `phase-45-rcap-onboarding-artifacts.sql` | adds no table | none | yes |
| 42 | `supabase/phase-47-rcap-onboarding-launch-readiness.sql` | 47 | `phase-46-rcap-onboarding-media-contact-role.sql` | no, 2 new | tables, functions, views, RLS, policies, grants, data | yes |
| 43 | `supabase/phase-49-rcap-packet-render-jobs.sql` | 49 | `phase-47-rcap-onboarding-launch-readiness.sql` | no, 3 new | tables, functions, RLS, policies, Storage, data | yes |
| 44 | `supabase/phase-50-rcap-packet-delivery-hardening.sql` | 50 | `phase-49-rcap-packet-render-jobs.sql` | no, 3 new | tables, functions, RLS, policies, grants, Storage, data | yes |
| 45 | `supabase/phase-51-rcap-consumer-payment-gate.sql` | 51 | `phase-50-rcap-packet-delivery-hardening.sql` | adds no table | functions, grants, Storage, data | yes |
| 46 | `supabase/phase-52-rcap-consumer-payment-authority.sql` | 52 | `phase-51-rcap-consumer-payment-gate.sql` | no, 1 new | tables, functions, RLS, grants, data | yes |
| 47 | `supabase/phase-53-rcap-consumer-job-binding.sql` | 53 | `phase-52-rcap-consumer-payment-authority.sql` | adds no table | functions, data | yes |
| 48 | `supabase/phase-54-rcap-person-namespace-hardening.sql` | 54 | `phase-53-rcap-consumer-job-binding.sql` | adds no table | functions, RLS, policies, grants | yes |
| 49 | `supabase/phase-55-expungement-matter-payment-binding.sql` | 55 | `phase-54-rcap-person-namespace-hardening.sql` | adds no table | tables, functions, grants, data | yes |
| 50 | `supabase/phase-56-public-view-and-default-privilege-hardening.sql` | 56 | `phase-55-expungement-matter-payment-binding.sql` | adds no table | views, RLS, policies, grants | yes |

## Migrations created

| Step | File | Statements |
| ---: | --- | ---: |
| 0 | `supabase/migrations/20260818200000_rcap_upgrade_00_roles.sql` | 1 guarded block |
| 1 | `supabase/migrations/20260818201000_rcap_upgrade_01_tables_and_columns.sql` | 78 |
| 2 | `supabase/migrations/20260818202000_rcap_upgrade_02_functions.sql` | 89 |
| 3 | `supabase/migrations/20260818203000_rcap_upgrade_03_constraints_and_indexes.sql` | 656 |
| 4 | `supabase/migrations/20260818204000_rcap_upgrade_04_views.sql` | 14 |
| 5 | `supabase/migrations/20260818205000_rcap_upgrade_05_triggers.sql` | 42 |
| 6 | `supabase/migrations/20260818206000_rcap_upgrade_06_rls_and_policies.sql` | 80 |
| 7 | `supabase/migrations/20260818207000_rcap_upgrade_07_grants.sql` | 1,039 |
| 8 | `supabase/migrations/20260818208000_rcap_upgrade_08_storage_buckets.sql` | 3 guarded blocks |
| 9 | `supabase/migrations/20260818209000_rcap_upgrade_09_security_hardening.sql` | 38 |

The chain is the difference between two locally built databases, not a copy of the 49
inputs, so a statement the baseline already satisfies does not appear. Bootstrap-only work
is absent by construction: the eight policies the inputs re-create with bare
`create policy` are not re-created here, and no table, column, index or function the
baseline already has is created again.

### Reviewed dispositions

1. **Two CHECK constraints are dropped and re-added** —
   `rcap_intake_sessions_eligibility_signal_check` (5 → 9 accepted values) and
   `rcap_record_events_record_type_check` (2 → 5). Both **broaden**, so no existing row can
   be rejected and the window between drop and add rejects nothing that was previously
   accepted.
2. **Two CHECK narrowings are deliberately excluded.**
   `supabase/phase-31-legalease-os-support-queue.sql` restricts
   `legalease_os_support_items.source` to `expungement_ai` and `.type` to `support_request`.
   Production accepts two values for each, and `src/lib/legalease/correspondence.ts` writes
   `legalease_umbrella_site` and `waitlist_request` today. Applying the narrowing would fail
   on existing rows or silently break the umbrella-site contact and waitlist paths.
   Production's wider definition is kept; the stale input is a separate repository fix.
3. **Forced RLS is preserved.** The repository inputs, applied to an empty database, create
   `rcap_record_events` without `FORCE ROW LEVEL SECURITY` — Production has it forced. The
   chain never unforces it.
4. **One new browser grant on a pre-existing table.**
   `supabase/phase-28-rcap-record-audit-trail.sql` grants `authenticated` SELECT and INSERT
   on `rcap_record_events`. That table has RLS enabled **and forced with no permissive
   policy**, so the grant exposes no row, and triggers block UPDATE and DELETE. Pinned in
   the verifier as a reviewed grant.
5. **Thirty-two revokes.** `consumer_briefcase_items` loses INSERT and UPDATE for anon and
   authenticated; `partner_entitlement` and `rcap_persons` lose everything for both. All
   three are written server-side through the service-role client. Each revoke comes from the
   repository's own hardening phases (52, 43, 54).

There is no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DROP POLICY`, `DROP FUNCTION`,
`DROP VIEW`, `DROP INDEX`, `DROP TRIGGER`, column type change or data rewrite anywhere in
the chain.

## Local replay commands

```bash
# One local PostgreSQL 17.6 cluster — the same major.minor Production runs, and the version
# the baseline's own reconciliation replayed on. Never connects to Supabase.
bash scripts/rcap-schema-upgrade-lab.sh up

# A: the recovered Production baseline alone
bash scripts/rcap-schema-upgrade-lab.sh build baseline lab_a

# B: the accepted repository schema — baseline plus every repository SQL input, in order
bash scripts/rcap-schema-upgrade-lab.sh build stacked lab_b

# B-minus: the same, without the hardening phase. Exists only so the public row sets can be
# compared with and without the remediation.
bash scripts/rcap-schema-upgrade-lab.sh build stacked-pre lab_pre
bash scripts/rcap-schema-upgrade-lab.sh seed lab_pre
bash scripts/rcap-schema-upgrade-lab.sh seed lab_b

# C and D: two independent replays of baseline + the forward chain
bash scripts/rcap-schema-upgrade-lab.sh build upgrade lab_c
bash scripts/rcap-schema-upgrade-lab.sh build upgrade lab_d

# Compare
bash scripts/rcap-schema-upgrade-lab.sh catalog lab_b /tmp/target.tsv
bash scripts/rcap-schema-upgrade-lab.sh catalog lab_c /tmp/upgrade-1.tsv
bash scripts/rcap-schema-upgrade-lab.sh catalog lab_d /tmp/upgrade-2.tsv
diff /tmp/target.tsv /tmp/upgrade-1.tsv && diff /tmp/upgrade-1.tsv /tmp/upgrade-2.tsv

# All of the above, plus the security assertions, in one command
node scripts/verify-rcap-production-schema-upgrade.mjs
```

`PGBIN` may point at any PostgreSQL 17 `bin` directory; with it unset the lab downloads the
`@embedded-postgres/linux-x64` build once, because this container has neither Docker nor a
PGDG apt source. PostgreSQL 16 cannot replay the baseline at all — it grants the `MAINTAIN`
privilege, which is 17+ syntax.

## Target-schema comparison

Replay 1 and replay 2 catalogs are byte-identical:
`sha256 6d5c79e3fae4484e21a8181ff192eed0d2aff6ed5c075762e78aa6fa1fb9471e`, the same hash as
the accepted repository schema's catalog. Zero differing lines.

| Class | Baseline | After the chain |
| --- | ---: | ---: |
| tables | 44 | 73 |
| columns | 654 | 1,295 |
| constraints | 208 | 496 |
| indexes | 149 | 268 |
| triggers | 18 | 60 |
| functions | 35 | 113 |
| views | 5 | 12 |
| RLS records | 44 | 73 |
| policies | 73 | 130 |
| relation grants | 1,374 | 1,985 |
| column grants | 52 | 324 |
| function grants | 130 | 400 |
| default privileges | 48 | 24 |
| Storage buckets | 0 | 3 |
| Storage RLS records | 2 | 2 |
| **total definitions** | **2,836** | **5,258** |

The compared surface is defined by `scripts/rcap-schema-catalog.sql`: tables, columns with
types, nullability and defaults, constraints, indexes, triggers, function bodies with
security and volatility, views with their reloptions, sequences, enums, RLS enabled and
forced state, policies with roles and expressions, relation, column and function grants, and
Storage buckets and RLS, and the schema's default privileges — what a future object
inherits, which no object-by-object diff can see. Object comments are not compared; they
carry no behavioural or security effect.

## Security result

| Property | Result |
| --- | --- |
| RLS still enabled everywhere the baseline had it | pass — 44/44, plus 29 new tables |
| Forced RLS preserved | pass — `rcap_record_events` stays forced |
| No baseline policy dropped or weakened | pass — all 73 present and identical, 51 added |
| No unreviewed browser grant on a pre-existing table | pass — one reviewed grant, on a forced-RLS table with no policy |
| Every browser-reachable table has RLS | pass |
| Private Storage stays private | pass — all 3 buckets `public = false`, re-asserted on conflict |
| Storage policies | unchanged — Production has none, the chain adds none |
| Production-only bucket `social-public-assets` | untouched |
| Service-role behaviour | unchanged — no new SECURITY DEFINER surface beyond the accepted inputs |
| Tenant isolation | pass — `verify-onboarding-tenant-isolation.mjs` 8/8 against the upgraded database |
| RLS on the four named tables | pass — 2 directly, 2 through the guard, exercised by creating them |
| The five public views run as the caller | pass — `security_invoker=true, security_barrier=true` |
| Public row sets after the remediation | pass — byte-identical for anon, against a fixture built from the excluded cases |
| anon reach into base tables | pass — column-level SELECT only; every other column denied |
| authenticated access | pass — 738 grants before, 738 after, none added or removed |
| Future objects | pass — a new table inherits postgres and service_role only |

One thing a reviewer should know rather than infer: the baseline carries
`ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon, authenticated`, so **any** new
table in `public` arrives reachable by both browser roles whether or not a migration says
so. Step 07 therefore revokes from PUBLIC, anon, authenticated and service_role on every
object it touches and then grants back exactly what the accepted schema grants — the end
state is stated, not inherited.

## Security Advisor remediation

The remediation validated in the legalease-rcap-acceptance project is now part of this
reviewed Production upgrade rather than a change that lives only in that project or in a
dashboard. It exists twice, and a verifier check fails if the two ever drift apart:

- canonical schema source: `supabase/phase-56-public-view-and-default-privilege-hardening.sql`
- forward chain: `supabase/migrations/20260818209000_rcap_upgrade_09_security_hardening.sql`

`scripts/rcap-hosted-acceptance-migrate.mjs` applies the same phase last, in the position it
occupies in the canonical order, and now enables row level security on the two acceptance
tables at the moment it creates them.

### RLS on four tables

| Table | Before | After |
| --- | --- | --- |
| `public.partner_entitlement` | enabled | enabled, now stated rather than incidental |
| `public.rcap_record_events` | enabled and forced | unchanged, still forced |
| `public.rcap_acceptance_environment_marker` | privileges revoked, **no RLS** | RLS enabled where the table exists |
| `public.rcap_acceptance_migration_ledger` | privileges revoked, **no RLS** | RLS enabled where the table exists |

The two acceptance tables are created at run time by the acceptance pipeline and exist only
in that environment, so the step hardens them where it finds them instead of creating
acceptance bookkeeping inside Production. The verifier proves the guard by creating both
tables, running the step, and reading `relrowsecurity` back.

### The five public views become security_invoker

`content_public_authors`, `content_public_media`, `content_public_posts`,
`content_public_state_editorial` and `content_public_testimonials` now carry
`security_invoker = true, security_barrier = true`.

Phase 43 made them owner-executed on purpose: the base tables had no anon grant at all, so
the view's WHERE clause was the only row filter. Inverting that means anon must be able to
reach the base tables, so the row filter moves into RLS and the column filter into
column-level grants:

| View | Row set, unchanged | anon columns on the base table |
| --- | --- | ---: |
| `content_public_authors` | active authors only | 8 |
| `content_public_posts` | published or updated, `published_at` set and not in the future | 24 |
| `content_public_media` | not archived, and referenced by an eligible public record | 8 |
| `content_public_state_editorial` | published only | 15 |
| `content_public_testimonials` | approved only | 7 |
| `content_media_usages` (read by the media view) | usages of public posts | 2 |

Each new policy is `for select to anon` and restates its view's predicate exactly, so the
effective rows — policy AND view predicate — are what they were. **Zero table-level SELECT
is granted to anon on any of the six base tables**; the 64 grants above are column-level, so
a column added tomorrow stays invisible until someone adds it here on purpose.

Proof rather than assertion: `scripts/rcap-public-view-fixture.sql` seeds an inactive
author, a draft post, a post published ten years out, an archived asset, an asset referenced
only by a draft, an unapproved testimonial and a draft editorial row, into two databases —
one built without the hardening phase, one with it. Reading all five views as `anon` returns
byte-identical rows in both: 1 author, 2 posts, 3 media, 1 editorial record, 1 testimonial.

The honest residual: a `security_invoker` view checks column privileges for every column it
references, including the ones it filters on, so `is_active`, `status`, `published_at`,
`archived`, `approved` and `content_posts.updated_at` had to be granted. anon can read those
directly for rows that are **already public** — never for a draft, an inactive author, an
archived asset or an unapproved testimonial, because RLS admits none of those. The columns
that matter stay unreachable: `content_posts.doc`, `content_posts.search_text`,
`content_media.storage_path`, `content_media.permission_status`,
`content_authors.auth_user_id`, `content_testimonials.consent_status` and
`content_state_editorial.legal_approved_at` all return "permission denied", and the verifier
fails if any of them ever stops doing so.

`authenticated` is untouched: 738 grants before the remediation, 738 after, none added and
none removed. The internal CMS reads and writes these tables as `authenticated` behind the
`content_can_edit_any()` policies, and taking those grants away would break editing rather
than harden anything.

### Default privileges

The baseline carries twelve `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public`
statements granting ALL on tables, sequences and functions to `postgres`, `anon`,
`authenticated` and `service_role`. The `anon` and `authenticated` halves are why withholding
a policy was never enough — every table anyone adds is browser-reachable the moment it
exists. Those six are withdrawn; `postgres` and `service_role` keep theirs, because the
schema owner and the server-side boundary both depend on them for new objects.

Default-privilege rows in the compared catalog fall from 48 to 24, and the verifier creates
a table in the upgraded database and asserts its ACL names neither browser role. Objects
that already exist are unaffected: every privilege the accepted schema needs is stated
explicitly in step 07, which is why the step runs before this one.

## Applying to Production later

Not part of this change. When it is authorized:

```bash
# 1. Confirm the starting point is what this chain assumes.
npx --yes supabase@latest migration list --linked      # 20260728213131 present on both sides

# 2. Back up first — this chain is forward-only and has no down migrations.
npx --yes supabase@latest db dump --linked --file pre-upgrade-schema.sql
npx --yes supabase@latest db dump --linked --data-only --use-copy --file pre-upgrade-data.sql

# 3. Dry run. Read every pending filename; expect exactly the nine forward steps.
npx --yes supabase@latest db push --linked --dry-run

# 4. Apply.
npx --yes supabase@latest db push --linked
```

Never with `--include-all`, `--include-seed`, `migration repair`, `db reset` or dashboard
SQL.

### Post-application verification

```bash
npx --yes supabase@latest migration list --linked       # nine new versions recorded
node scripts/verify-rcap-production-schema-upgrade.mjs  # local proof still green
```

Then, read-only against Production: confirm 73 tables, 124 policies, `rcap_record_events`
still `relforcerowsecurity`, all buckets `public = false`, and that
`social-public-assets` still exists.

### Rollback limitations

Forward-only, with no down migrations, deliberately:

- Nothing in the chain drops a table, column or policy, so **an interrupted run leaves
  Production strictly between the two known-good states** — but there is no scripted way
  back to the baseline. Recovery is a restore from the step-2 dumps.
- The two broadened CHECK constraints cannot be narrowed again once a row uses one of the
  new values.
- The three Storage buckets can be emptied but not un-created without deleting objects.
- The 32 revokes are reversible by re-granting; the reviewed grant on `rcap_record_events`
  is reversible by revoking.
- Supabase applies each migration in its own transaction, so a failing step rolls itself
  back, but earlier steps stay applied. Re-running after a fix resumes from the failed step.
