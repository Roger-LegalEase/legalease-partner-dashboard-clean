# CLOUD06 — RLS, tenant isolation, Storage, and internal authorization

## Execution facts

- Assignment: `CLOUD06_RLS_TENANT_STORAGE_SECURITY`
- Base/current checkout tested: `48f74d82016795307e565220e38ce369cf43da5e`
- Required ancestor `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13`: present (`git merge-base --is-ancestor` exited 0)
- Observed branch: `work`; Git network operations were prohibited.
- Production/external services touched: **NO**
- Application, migration, packet, and commercial-authority files modified: **0**

## Conclusion

No bypass was reproduced at current HEAD. This is a bounded non-production result, not live approval. Runnable isolated database and application harnesses passed. The hosted direct REST/RPC/Storage matrix and real-browser Origin matrix are explicitly **NOT RUN**, because this checkout has no synthetic Supabase credentials, PostgreSQL executables, or Playwright Chromium binary. Source-contract tests supplement runtime evidence but are not treated as substitutes for missing hosted evidence.

## Synthetic authorization matrix

**72 cases: 69 PASS, 0 FAIL, 3 NOT RUN.** Each row below represents the numbered case range; repeated assertions inside a repository harness remain one matrix case.

| Cases | Actor | Boundaries | Result / evidence |
|---|---|---|---|
| 1–5 | unauthenticated visitor | internal page/API, 10 Clinic tables, 5 Clinic helpers, unpublished partner slug | PASS — isolated runtime harnesses |
| 6–9 | participant | internal denial, wrong user/matter, expired/revoked consent | PASS — isolated runtime harnesses |
| 10–12 | partner viewer | internal denial, onboarding mutation, internal artifact fields | PASS — executable suites |
| 13–15 | partner staff | internal denial, team invite, publication/activation | PASS — executable suites |
| 16–31 | partner administrator | own team; forged partner/role; onboarding mutation; MIME, extension, archive, macro, executable, SVG, size, UTF-8, identifier and path forgery; guessed/non-approved artifact; generic patch | PASS — executable suites (47 onboarding and 26 artifact assertions) |
| 32–36 | unrelated partner administrator | cross-tenant onboarding read/write, cross-event Clinic, private object, guessed artifact | PASS — isolated database and executable suites |
| 37–38 | external personal-email user | internal page/API and forged metadata | PASS — isolated authorization harness |
| 39–40 | corporate-domain user without role | internal page/API and domain-only authority | PASS — isolated authorization harness |
| 41–48 | internal LegalEase operator | active, revoked, expired membership; provisioning before load/parse; invitation/publication/activation; sign-out; browser cache contract | PASS — 31-check isolated authorization harness |
| 49–52 | service workflow | prefill/artifact RPC execute boundary, concurrent invalidation, stale/failed approval | PASS — executable suites |
| 53–56 | all browser actors | public object URL, signed artifact ownership, internal comments, service credential boundary | PASS — executable suites |
| 57–58 | authenticated attacker/user | 20 hostile redirects denied; 5 local links retained | PASS — executable redirect suite |
| 59–64 | browser actor | cross-origin JSON/multipart, `Origin: null`, missing/malformed Origin, forwarded-host confusion, private/no-store response | PASS — executable request suites |
| 65–69 | browser actor | legacy allowlists/tokens, partner claim as internal role, forged metadata, five publication states, sitemap exposure | PASS — executable suites |
| 70 | all hosted identities | direct REST/RPC with real, legacy, and revoked JWTs | **NOT RUN** — credentials absent |
| 71 | all hosted identities | real Storage signed-URL issuance, replay, expiry | **NOT RUN** — credentials absent |
| 72 | browser actors | real browser cross-origin, `Origin: null`, cookie/referrer behavior | **NOT RUN** — Chromium absent |

UI-only denial is not counted as database proof. The cross-tenant Clinic result came from an isolated PostgreSQL migration harness; hosted cases 70–71 remain open rather than being promoted from static checks.

## Reproduced defects

**None.** There is no FAIL case and therefore no patch recommendation. The following are environment limitations, not application defects.

### Hosted Supabase matrix unavailable

- **Exact reproduction:** `node scripts/verify-partner-auth-rls-foundation.mjs`
- **Expected:** synthetic authenticated actors exercise direct RLS boundaries.
- **Actual:** exit 1; missing Supabase URL, anon/service credentials, and synthetic actor credentials.
- **Affected path:** `scripts/verify-partner-auth-rls-foundation.mjs`.
- **Impact:** hosted direct REST/RPC, legacy/revoked-token, and signed-URL behavior remains unverified; this is not evidence of a bypass.
- **Smallest bounded action:** run the existing verifier against isolated non-production Supabase with synthetic accounts.
- **Focused regression:** rerun the same command with its documented non-production variables.

### Full local migration harness unavailable

- **Exact reproduction:** `scripts/local-onboarding-db.sh up`
- **Expected:** initialize PostgreSQL and apply all migrations.
- **Actual:** `psql`, PostgreSQL `initdb`, and Docker are absent.
- **Affected path:** `scripts/local-onboarding-db.sh`.
- **Impact:** the full direct SQL/RPC matrix cannot run here; narrower temporary-database suites did run and pass.
- **Smallest bounded action:** execute the existing harness in a PostgreSQL 16 environment.
- **Focused regression:** `RCAP_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/rcap node scripts/verify-onboarding-tenant-isolation.mjs`.

### Real browser matrix unavailable

- **Exact reproduction:** `node scripts/security/test-sign-out-origin.mjs`
- **Expected:** Chromium exercises browser-origin behavior.
- **Actual:** Playwright reports Chromium headless shell build 1223 absent.
- **Affected path/symbol:** `scripts/security/test-sign-out-origin.mjs` / `runChromiumTests`.
- **Impact:** real-browser Origin, cookie, and referrer behavior is not independently confirmed; request-validator tests passed.
- **Smallest bounded action:** install the matching Playwright browser in the verification environment only.
- **Focused regression:** rerun the same command.

## Required return

```text
ASSIGNMENT: CLOUD06_RLS_TENANT_STORAGE_SECURITY
BASE SHA: 48f74d82016795307e565220e38ce369cf43da5e
COMMIT: populated by the Git commit containing this report
MATRIX CASES: 72 (69 PASS, 0 FAIL, 3 NOT RUN)
PASS: 69
FAIL: 0
CROSS-TENANT READS: 0 reproduced; hosted direct-JWT matrix NOT RUN
CROSS-TENANT WRITES: 0 reproduced; hosted direct-JWT matrix NOT RUN
STORAGE BYPASSES: 0 reproduced; hosted signed-URL matrix NOT RUN
INTERNAL-AUTH BYPASSES: 0 reproduced
CSRF/ORIGIN DEFECTS: 0 reproduced; real-browser matrix NOT RUN
DEFECTS: 0
APPLICATION FILES MODIFIED: 0
PRODUCTION TOUCHED: NO
```
