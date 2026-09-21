# CLOUD05 sponsorship, cap, attribution, and Clinic Mode verification

## Scope and checkout

- Assignment: `CLOUD05_SPONSORSHIP_CAP_CLINIC`
- Verified checkout: `48f74d82016795307e565220e38ce369cf43da5e`
- Required ancestor: `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13` (`git merge-base --is-ancestor` exited 0)
- Production and external services: not contacted
- Packet authority: synthetic fixtures only; packet correctness was not evaluated
- Application files modified: 0

## Verdict

**FAIL — the current head does not independently prove the complete CLOUD05 mission.**

Eleven runnable checks passed. They prove the existing PGlite partner-mode lifecycle, explicit Clinic consent, consent expiry/revocation denials, participant/matter ownership enforcement, tenant and event isolation, shared-device reset, telemetry redaction, and refusal to target Production. No passing execution observed a consumer-payment writer call, cap double-count, consent bypass, or cross-participant access.

The complete verdict cannot be green because attribution beyond the redirect chain is expressly absent, the checked-in attribution verifier cannot run under its documented command, and the authoritative phase-49 packet-credit database suite could not execute in this environment. Consequently, correction/re-download semantics, the second-matter/overage/exhaustion matrix, and authoritative packet-credit concurrency remain unproved at this checkout in this run.

## Executed case ledger

| # | Command | Result | Evidence |
|---:|---|---|---|
| 1 | `node scripts/security/test-clinic-anonymous-and-tenant-denials.mjs` | PASS | Runtime PGlite denials across 10 tables and 5 helpers; cross-tenant, cross-event, wrong-role/user/matter, expired/revoked consent, and private-object denial. |
| 2 | `node scripts/security/test-clinic-participant-ownership-denials.mjs` | PASS | Real service module denied anonymous, wrong-user/matter, cross-event/tenant, wrong-role, expired and revoked consent; 9 weakening mutations detected. |
| 3 | `node scripts/security/test-clinic-shared-device-reset.mjs` | PASS | 11 participant traces cleared; 6 hostile-browser cases reported as partial; back/forward denied; participant-B handoff clean. |
| 4 | `node scripts/security/test-clinic-telemetry-redaction.mjs` | PASS | Participant facts withheld and audit metadata allowlist enforced. |
| 5 | `node scripts/security/test-clinic-hosted-acceptance-runner.mjs` | PASS | Production hosts, live keys, real participants, and incomplete invocations refused without hosted requests. |
| 6 | `node scripts/verify-rcap-partner-attribution.mjs` | FAIL | Node 20 rejected the direct `.ts` import with `ERR_UNKNOWN_FILE_EXTENSION`; no attribution assertion ran. |
| 7 | `node scripts/verify-shared-claim-boundary-db.mjs` | BLOCKED | Local PostgreSQL toolchain unavailable. |
| 8 | `node scripts/verify-shared-claim-boundary-app.mjs` | PASS | Token, authority, exact-matter continuation, verified-account, and post-claim ownership boundaries passed. |
| 9 | `node scripts/test-shared-claim-boundary-mutations.mjs` | BLOCKED | Refused because the database verifier was not green without PostgreSQL. |
| 10 | `node scripts/verify-rcap-partner-entitlement.mjs` | PASS | PGlite atomic claim, hard-cap, rollback and one-slot concurrency passed. |
| 11 | `node scripts/verify-rcap-partner-intake-slot-claim.mjs` | PASS | Account/page load consumed no slot; explicit start, hard-cap, rollback, and concurrency passed. |
| 12 | `node scripts/verify-rcap-slot-lifecycle.mjs` | PASS | Release and completion consumed zero packet cap; release and recompute were idempotent. |
| 13 | `node scripts/verify-rcap-partner-mode.mjs` | PASS | PGlite proved screening start/completion consume zero cap and one packet-generation session consumes once; sponsored flow source guard found no payment-adapter/payment-confirm invocation. |
| 14 | `node scripts/verify-expungement-paid-event-once.mjs` | PASS | Distinct consumer payments count once each; this is a consumer analytics check, not sponsored packet authority. |
| 15 | `./node_modules/.bin/tsx scripts/verify-rcap-partner-attribution.mjs` | BLOCKED | No checked-in `tsx` executable exists. |
| 16 | `node scripts/verify-rcap-packet-render-jobs.mjs` | BLOCKED | `psql`, `initdb`, and `pg_ctl` were all missing. |
| 17 | `node scripts/security/test-clinic-mobile-accessibility.mjs` | BLOCKED | The app started and served the synthetic Clinic page, but the Playwright Chromium executable was absent. |

Totals: **17 cases run; 11 pass; 6 fail/blocked.** Environment-blocked cases are not counted as mission proof.

## Proven mission claims

- Account resolution/page load and screening start/completion consume zero packet cap in the current PGlite lifecycle tests.
- A successful legacy partner packet-generation recording consumes one unit and recomputation remains idempotent.
- Sponsored screening source guards contain no direct payment-adapter or payment-confirm call; no consumer-payment writer was observed during execution.
- Clinic assistance requires a truthy consent input and a live, scoped assisted session.
- Expired, ended, and reset sessions cease authorizing assistance.
- Participant, matter, event, and tenant mismatches are denied both at the runtime database boundary and in the admin-client service boundary.
- Shared-device reset removes participant identity, matter, Briefcase, upload, packet, payment, sponsorship, and session traces; partial browser cleanup is never represented as successful.
- Partner reporting remains event-scoped and participant ownership is not transferred by sponsorship or assistance in the exercised cases.

## Defects and unproved controls

### CLOUD05-01 — attribution does not survive into durable matter authority

- **Exact reproduction:** run `node scripts/verify-rcap-partner-attribution.mjs`. It exits 1 before assertions with `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"` for `src/lib/expungement-ai/partner-attribution.ts`. Independently inspect the verifier's final emitted contract: it states that `screening_sessions` has no county/UTM columns and that persistence beyond the user-facing flow requires a migration.
- **Expected:** partner, event, campaign, and geography attribution is resolved from server authority, survives authentication, and is durably copied to the exact claimed matter.
- **Actual:** the intended check only covers county/UTM/source values in query strings and hidden form fields, cannot run with its checked-in Node command, and expressly documents no persistence beyond that redirect chain. Event/program persistence is not asserted by this verifier.
- **Affected path/symbol:** `scripts/verify-rcap-partner-attribution.mjs`; `src/lib/expungement-ai/partner-attribution.ts`; the screening-session-to-claim attribution persistence boundary.
- **Security/user impact:** reporting can lose campaign/geography attribution after authentication, and a query-string value is not durable server authority. Sponsorship decisions must not rely on those participant-carried values.
- **Smallest bounded patch:** in a non-packet platform change, add server-owned attribution columns or a normalized immutable attribution record keyed to the screening session; populate it only from validated partner/event/program context; atomically copy it in the pending-result claim transaction. Make the verifier runnable with the repository's existing TypeScript loader rather than adding a new runtime dependency.
- **Focused regression test:** execute an anonymous partner/event/campaign/geography screening through sign-in and atomic claim, then query the exact participant-owned matter and assert all server-derived attribution fields match; mutate browser fields and assert they cannot change sponsorship authority; assert an unrelated matter receives none of the attribution.

### CLOUD05-02 — authoritative packet-cap matrix was not reproducible in this environment

- **Exact reproduction:** run `node scripts/verify-rcap-packet-render-jobs.mjs`. It exits 1: `PostgreSQL is required ... psql: missing; initdb: missing; pg_ctl: missing`.
- **Expected:** a runnable local database proves successful validated packet generation consumes exactly one unit; retry, failure, correction, refresh, and re-download consume no additional unit; a second matter consumes once; soft cap, grace/overage, exhaustion, revocation, and concurrent requests are authoritative.
- **Actual:** older PGlite lifecycle checks proved zero-use screening and one session-level generation/recompute path. The phase-49 suite containing distinct-matter, included/overage, finite-reserve, failed-job, stored-artifact, and retry assertions did not execute. No current-head execution in this run proved correction, refresh, re-download, revocation, or concurrent packet-credit consumption.
- **Affected path/symbol:** `scripts/verify-rcap-packet-render-jobs.mjs`; `supabase/tests/phase-49-packet-render-jobs.test.sql`; `consume_rcap_packet_credit` database authority.
- **Security/user impact:** this run cannot exclude double charging, incorrect exhaustion behavior, or race-driven cap oversubscription on the authoritative packet-credit path.
- **Smallest bounded patch:** no application change is justified from an environment-only failure. Provision the documented ephemeral PostgreSQL toolchain in CI/verification and make this verifier a required CLOUD05 gate.
- **Focused regression test:** run the existing phase-49 SQL suite and add explicit same-matter correction, refresh, re-download, two concurrent finalizations, entitlement revocation-before-finalization, and second-distinct-matter cases; assert exactly one consuming ledger row per matter and no consumer-payment write.

### CLOUD05-03 — browser acceptance evidence is unavailable

- **Exact reproduction:** run `node scripts/security/test-clinic-mobile-accessibility.mjs`. The synthetic Next.js Clinic page returns HTTP 200, then Playwright exits because Chromium Headless Shell is absent at the expected cache path.
- **Expected:** the runnable browser path verifies the participant Clinic surface, including consent interaction and shared-device behavior, against a real browser.
- **Actual:** service and database tests passed, but this browser case did not reach its assertions.
- **Affected path/symbol:** `scripts/security/test-clinic-mobile-accessibility.mjs`; Clinic participant entry UI.
- **Security/user impact:** no browser-level evidence was produced in this run for keyboard/mobile consent presentation; this is an evidence gap, not a reproduced consent bypass.
- **Smallest bounded patch:** install the pinned Playwright Chromium artifact in the verification image/cache; do not change application authorization.
- **Focused regression test:** rerun the existing script and retain its synthetic browser result; add an assertion that assistance cannot start until the scoped consent control is affirmatively activated.

## Required return

```text
ASSIGNMENT: CLOUD05_SPONSORSHIP_CAP_CLINIC
BASE SHA: 48f74d82016795307e565220e38ce369cf43da5e
COMMIT: recorded in Git commit containing this report
CASES RUN: 17
PASS: 11
FAIL: 6
CONSUMER PAYMENT WRITER CALLED: NO (not observed in executed sponsored-flow checks)
CAP DOUBLE-COUNT: NO (not observed; authoritative phase-49 matrix blocked)
ATTRIBUTION LOSS: YES (county/UTM persistence beyond redirect chain is expressly absent)
CONSENT BYPASS: NO (not observed)
CROSS-PARTICIPANT ACCESS: NO (runtime and service denial suites passed)
DEFECTS: CLOUD05-01, CLOUD05-02, CLOUD05-03
APPLICATION FILES MODIFIED: 0
PRODUCTION TOUCHED: NO
```
