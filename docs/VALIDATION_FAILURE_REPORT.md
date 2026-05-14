# Validation Failure Report

## Baseline
- Node: `v24.15.0`
- npm: `11.12.1`
- Package manager: npm with `package-lock.json`
- Test runner: Vitest `run`, Node environment, forks pool, serial file execution
- ESLint: pinned to `9.26.0` because newer `9.39.x` was incompatible with the current `eslint-config-next` patch path in this workspace.
- TypeScript: `tsc -p tsconfig.typecheck.json --noEmit --incremental false`
- Lint: ESLint flat config with Next core web vitals and TypeScript rules

## Current Scripts
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:full`
- `npm test`
- `npm run smoke:staging`
- `npm run validate`
- `npm run validate:local`
- `npm run validate:staging`

## Observed Failures Before Stabilization
- `npm test` produced Vitest worker fetch/read timeouts before collecting or while transforming tests.
- `npm run lint` scanned generated duplicate files and could hang without diagnostics.
- `npm run typecheck` used stale incremental artifacts and scanned duplicate generated files.
- Duplicate copy files existed: `vitest.config 2.ts`, `scripts/staging-smoke-check 2.mjs`, `tests/expungement-readiness.test 2.ts`, `prisma/schema 2.prisma`, and `tsconfig 2.tsbuildinfo`.
- `tests/wilma-email-gate.test.ts` dynamically imported a client widget only to assert server env safety, which could hang the transform pipeline.
- Local filesystem materialization and disk pressure caused `ETIMEDOUT: read` and missing `.bin` dependency symptoms.

## Root Causes
- Stale build/test artifacts and duplicate copied source files were included in broad validation globs.
- Vitest worker concurrency amplified local filesystem read timeouts.
- The client-widget env-safety test used a dynamic import when a source-level assertion was sufficient.
- TypeScript incremental cache was unreliable in this workspace.
- Local disk space dropped below safe levels, causing dependency repair and file reads to fail intermittently.

## Fixes Applied
- Removed duplicate copied source/config files.
- Added `scripts/clean-validation-artifacts.mjs`.
- Made `npm run typecheck` use a clean, non-incremental source-focused config.
- Added `tsconfig.typecheck.json` for release typechecking of app/source/config files.
- Narrowed `npm run lint` to source, tests, scripts, and config files.
- Updated ESLint and TypeScript excludes for generated/cache artifacts and duplicate copied files.
- Configured Vitest with setup file, forks pool, serial file execution, and explicit timeouts.
- Added `tests/setup/vitest.setup.ts` to reset env/mocks/timers and block accidental external network calls.
- Replaced the flaky client-widget dynamic import test with a direct source assertion.

## Determinism
- `npm test` now completes reliably in this workspace: 26 files, 143 tests.
- `npm run validate` now completes successfully.
- `npm run smoke:staging` passes in local soft mode with expected warnings when no local database or app server is running.
- `SMOKE_STRICT=true npm run smoke:staging` is expected to fail locally unless real staging Redis, database, and app reachability are configured. Task 16 local run failed first on missing `RATE_LIMIT_REDIS_REST_URL` / `RATE_LIMIT_REDIS_REST_TOKEN`.

## Task 16A Staging Handoff Status
- Real staging provisioning is blocked from the local workspace because deployment platform credentials, staging database credentials, Redis REST credentials, Stripe dashboard access, Checkr sandbox/dashboard access, OpenAI staging secret access, and staging auth/admin access are not available here.
- The required staging evidence checklist lives in `docs/STAGING_INFRASTRUCTURE_HANDOFF.md`.
- Do not mark strict smoke, Stripe, Checkr, OpenAI, admin, beta-access, rollback, legal, or founder gates as passed until evidence is captured from the real staging environment.
- Strict smoke should be run from staging CI/runtime with staging secrets: `SMOKE_STRICT=true npm run smoke:staging`.
- Local soft smoke remains useful for script validation, but it is not evidence that staging infrastructure exists.

## Task 16A Local Command Results
- `npm run smoke:staging`: passed in local soft mode. Expected local warnings were reported for missing local Postgres, unreachable local app/admin/dashboard routes, and optional email/notification env vars.
- `SMOKE_STRICT=true npm run smoke:staging`: failed as expected before real staging provisioning because `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` are not configured locally.
- `npm run lint`: failed locally before source linting completed with an ESLint loader error: `SyntaxError: Invalid or unexpected token`. A direct `eslint.config.mjs` syntax check passed, so this should be retried in CI or a clean staging build image.
- `npm run typecheck`: stalled in the local workspace after `clean:validation`; Node was stopped manually. This local result should not be used as staging evidence.

## Commands Used
- `node -v`
- `npm -v`
- `find . -path ./node_modules -prune -o -name '* 2.*' -print`
- `brctl download <workspace>`
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run validate`
- `npm run smoke:staging`

## Debugging Future Timeouts
- Confirm disk space with `df -h .`.
- Clear validation artifacts with `npm run clean:validation`.
- Reinstall dependencies if `node_modules/.bin` is missing.
- Run a single test file with `npx vitest run tests/<file>.test.ts`.
- Check for dynamic imports of client components in server-only tests.
- Confirm tests are not calling real provider endpoints; the setup file should fail on unexpected external `fetch` calls.
