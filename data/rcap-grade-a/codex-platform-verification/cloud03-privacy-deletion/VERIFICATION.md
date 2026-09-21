# CLOUD03 — account deletion, privacy, and retention verification

## Scope and provenance

- Assignment: `CLOUD03_PRIVACY_DELETION_RETENTION`
- Current-head reviewed: `48f74d82016795307e565220e38ce369cf43da5e`
- Minimum ancestor: `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13` (verified ancestor)
- Review date: 2026-09-01 UTC
- Production touched: **no**
- Application files modified: **0**
- Packet-factory paths reviewed or modified: **none**

## Verdict

| Question | Current-head conclusion |
|---|---|
| Self-service deletion exists | **Yes in repository code, deployment availability not proven.** An authenticated Briefcase privacy page contains password reauthentication, a typed confirmation, and an account-deletion API. The page deliberately returns 404 unless its database and secret readiness probes pass. |
| End-to-end deletion proven | **No.** The only shipped executable integration verifier requires local PostgreSQL. It could not start in this environment. The repository's hosted-acceptance record says the migration was not applied and all three acceptance cases were not run. |
| Retention model proven | **No.** Code declares deletion/pseudonymization treatments, but no current runnable acceptance result proves them against a deployed database, Auth, Storage, signed-download, and processor environment. The company retention schedule remains `LEGAL_DECISION_REQUIRED`/`TO_DETERMINE`. |
| Orphaned artifacts | **Not proven absent.** The pipeline attempts recursive upload sweeps, generated-packet deletion, and signed-download invalidation, and its unavailable verifier includes pagination, nested-object, partial-sweep, and sibling-object cases. No current execution result proves those assertions. |
| Unauthorized deletion paths | **Not proven.** Code requires same-origin, session, recent password proof scoped to user and purpose, confirmation phrase, and ownership predicates. The unavailable verifier includes unauthenticated, cross-origin, forged-proof, cross-user, RLS, and partner/staff cases. |
| Post-deletion login and links | **Not proven.** The unavailable verifier contains tombstone, surviving-session, post-deletion export/history, backup-restore, signed-link, and unrelated-user assertions, but none ran here. |
| Completion receipt | **Implemented, not end-to-end proven.** The API returns a receipt code and the UI displays it for four seconds before navigating away; the durable request row intentionally survives Auth deletion. |

## Trace at current head

1. **Account settings.** `/briefcase/settings/privacy` is authenticated and loads the existing Briefcase. It is hidden with `notFound()` unless the workflow table, artifact-authority RPC, and two privacy secrets are reachable.
2. **Identity confirmation.** The browser submits the current password to `/api/expungement-ai/privacy/reauth`; a short-lived proof binds the user and the `account_deletion` purpose. The deletion route additionally requires same origin, an idempotency key, and the exact phrase `DELETE MY ACCOUNT`.
3. **Deletion request.** The API opens an idempotent durable request, then runs an ordered ledger. A frozen account may access only this route to resume a partial deletion.
4. **Local handling.** The ordered code path freezes the account; revokes sessions and reminders; removes partner assistance and support queue entries; cancels queued renders; invalidates downloads; removes uploads and generated artifacts; deletes or de-identifies matters, screenings, and pending results; and pseudonymizes retained render, payment, delivery, analytics, and support records.
5. **Retention and processors.** The contract retains pseudonymized accounting, delivery, security/audit, aggregate analytics, request/receipt, and legal-hold records. Processor adapters cover email delivery, payment, analytics, and the render worker, but real downstream propagation was not run in the repository's hosted acceptance record.
6. **Auth and receipt.** The tombstone precedes Auth deletion; Auth deletion is last except receipt issuance. The response returns the receipt code, after which the UI navigates to the public site.

## Policy and data-request alignment

The public privacy policy promises a verified request process and says eligible information may be deleted while lawful payment, security, fraud, dispute, service-completion, and similar records may be retained. The data-request page describes only an email workflow. Neither public document tells an authenticated Expungement.ai participant that repository code provides immediate self-service export, matter deletion, and account deletion in Briefcase settings. This is a **discoverability and description mismatch**, not proof that the policy's deletion promise is false. Conversely, repository code cannot establish that the email/manual workflow is staffed, tracked, completed, or reconciled with self-service requests.

The participant UI says records of payments and security events are kept “without your name attached.” The code uses deterministic pseudonymous identifiers rather than irreversible aggregation for several retained row classes. The UI's accompanying detailed retention entries use the more accurate term “pseudonymized,” but the short account-deletion paragraph can reasonably be read as stronger anonymization than the implementation supplies. Legal approval of category-specific durations and exceptions remains absent.

## Reproduced current-head failures

### CLOUD03-F01 — executable end-to-end verifier cannot run

- **Exact reproduction:** `node scripts/verify-participant-data-rights.mjs`
- **Expected result:** The verifier starts an ephemeral PostgreSQL cluster, applies the actual migration sequence, exercises route handlers and deletion code, and reports all checks passing or specific behavioral failures.
- **Actual result:** Exit 1: `verify-participant-data-rights requires a local PostgreSQL toolchain.`
- **Affected path/symbol:** `scripts/verify-participant-data-rights.mjs`; `scripts/lib/rcap-ephemeral-pg.mjs::ephemeralPgAvailable`.
- **Security or user impact:** This environment cannot substantiate deletion, isolation, retry, partial-failure, Storage, Auth, processor, or receipt claims. Therefore end-to-end deletion must remain unproven; this is an evidence blocker, not evidence that deletion fails.
- **Smallest bounded patch:** No application patch is justified from this result. Provide PostgreSQL 16 (`initdb`, `pg_ctl`, `psql`, and a `postgres` OS user when running as root) in the verification image, then rerun the existing verifier.
- **Focused regression test:** `node scripts/verify-participant-data-rights.mjs` must exit 0 and print its complete check summary.

### CLOUD03-F02 — package installation of the missing verifier dependency is blocked by the environment

- **Exact reproduction:** `apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16`
- **Expected result:** Apt refreshes signed Ubuntu indexes and installs PostgreSQL 16 so CLOUD03-F01 can be rerun.
- **Actual result:** Exit 100. The configured proxy returned HTTP 403 for Ubuntu `InRelease` files, and apt reported that the repositories were no longer signed.
- **Affected path/symbol:** Verification environment package repositories; no repository path.
- **Security or user impact:** The strongest local behavioral harness remains unavailable, preventing a reliable current-head security conclusion.
- **Smallest bounded patch:** Repair the verification image's signed apt mirror/proxy configuration or preinstall PostgreSQL 16. Do not alter application code to bypass the database-backed verifier.
- **Focused regression test:** `command -v initdb && command -v pg_ctl && command -v psql && node scripts/verify-participant-data-rights.mjs` must exit 0.

## Evidence gaps (not findings)

These are deliberately **not defects**, because this review did not reproduce a current-head behavioral failure:

- idempotent repeat and resume after session-revocation failure;
- cross-user matter deletion and cross-user reads;
- partner/staff self-deletion without participant deletion;
- nested, paginated, partially failed, and retried Storage deletion;
- old signed-link denial after matter/account deletion;
- Auth user deletion, surviving-session denial, and post-deletion login denial;
- pseudonymization of payment, audit, delivery, render, analytics, and support rows;
- legal-hold blocking and scoped matter preservation;
- real processor propagation and retry/permanent-failure handling;
- absence of orphan rows or objects across every current production schema relation.

## Defect disposition

**Confirmed application defects: 0.** Two verification-environment failures are reproduced above. Policy/discoverability mismatches are documented, but an application or legal-content patch would exceed the independent-verifier and exact-output-directory constraints. No recommendation here promotes a packet route or asserts production readiness.
