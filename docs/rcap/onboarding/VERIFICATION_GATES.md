# RCAP Onboarding — Verification Gates

Which gate owns which verifier, and what each one can and cannot prove.

The registry itself lives in `scripts/verify-onboarding-all.mjs`. That file is the
authority; this document explains it. The registry refuses to run when a matching verifier
exists that no group claims, so the two cannot drift apart silently.

## Entry points

| Command | Runs |
| --- | --- |
| `npm run partners:verify-onboarding-all` | the `local` group (default) |
| `npm run partners:verify-onboarding-database` | the `database` group |
| `npm run partners:verify-onboarding-inventory` | prints the registry, runs nothing |
| `npm test` | invokes the aggregate once, as one step in the chain |

## Groups

### `local` — 23 verifiers

Deterministic, credential-free, no network. These run in `npm test` and in the
**RCAP Partner Onboarding** workflow on every pull request.

They prove domain rules, service behavior, security decisions, committed SQL shape,
partner-facing language, the support contract, and server-rendered UI states. Several
render real components rather than asserting on source text.

Three carry `database` in their filename but belong here — `*-phase1-database`,
`*-artifact-database`, `*-launch-database` assert the committed migration SQL, not a live
connection.

### `database` — 2 verifiers

Need a reachable Supabase with the onboarding schema applied, via
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

- `verify-onboarding-persistence.mjs`
- `test-first-admin-supabase-lifecycle.mjs`

Run with `npm run partners:verify-onboarding-database` against an isolated project. **Not**
run in the pull-request workflow: it has no credentials, and a gate that skips silently is
worse than one that does not exist. This is a release gate.

### `staging` — 3 capture harnesses

Hosted acceptance evidence. Release gates only, run against an isolated staging project:

- `capture-first-admin-acceptance.mjs`
- `capture-onboarding-launch-readiness-acceptance.mjs`
- `capture-onboarding-page-documents-acceptance.mjs`

## What the local gate cannot prove

Passing the `local` group is not evidence of any of the following, and they must not be
reported as covered:

- hosted Auth redirects and real session establishment
- RLS enforcement against a live database
- Storage privacy, signed-URL expiry, cross-tenant object denial
- real invitation delivery, acceptance, and single-use token behavior
- that exactly one membership is created under concurrent acceptance
- stale-write behavior under genuine concurrent edits
- browser rendering, keyboard operation, and screen-reader output

These need the `database` and `staging` groups, which need credentials and a hosted
environment.

## Adding a verifier

Add it to `REGISTRY` in `scripts/verify-onboarding-all.mjs` with its group. If you do not,
the aggregate fails with the file named — that is deliberate. Prefer a behavioral test that
calls the code or renders the component over one that asserts on source text; use source
assertions only where the property being protected is a property of the source, such as a
duplicate definition reappearing.

## Repeatable isolated Clinic acceptance (GA-22)

Run `npm run clinic:acceptance` in the existing authorized isolated application
workspace. This reuses the onboarding registry, Supabase Auth, `partner_users`,
Clinic provisioning/consent APIs and real authenticated browser/PostgreSQL RLS.
It generates temporary passwords in memory; no old staff account is needed.

Provide the existing local environment's `JOURNEY_BASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` through its secure environment mechanism. Both URLs
must be loopback origins. Supply `CLINIC_QA_DB_CONTAINER`, `CLINIC_QA_DB_PORT`,
`CLINIC_QA_DB_NAME`, `CLINIC_QA_PROGRAM`, `CLINIC_QA_OTHER_PROGRAM` and
`CLINIC_QA_JURISDICTION=MS`. The program must already be a configured synthetic
program; the runner does not initialize databases or create programs.
Set `CLINIC_QA_ISOLATED=owner-authorized-synthetic-only` and the separately
owner-authorized `CLINIC_QA_SIMULATED_ALLOCATION=owner-authorized-run-scoped`.
`CLINIC_QA_OUTPUT` must be private/ignored storage. Never place secrets in a
command argument, report or committed file.

The existing isolated schema must include the reviewed selected-staff consent
migration. The runner does not apply migrations. Run exclusively: any change to
pre-existing database rows refuses cleanup instead of overwriting another task.
Successful cleanup restores public/Auth rows and private object metadata;
all measured operations use ordinary user sessions. Setup credentials only
provision synthetic actors/event/allocation, condition negative cases and clean
up run-created data. Preserve the private receipt if cleanup fails.

The existing Partner Onboarding CI local group runs fixture refusal tests.
Its hosted runner has no authenticated isolated database binding, so it cannot
claim the browser group passed. The same command runs the actual acceptance
on the existing isolated runner; binding that runner into GitHub Actions remains
an explicit integration prerequisite, not an implicit skip or Production fallback.
Exit 2 means partial acceptance (remaining requirements are in the receipt);
exit 1 is an actual test/cleanup failure. Independent acceptance is recorded
separately and never manufactured by the runner.
