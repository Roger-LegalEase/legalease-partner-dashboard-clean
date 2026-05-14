# CI Validation

## Required CI Steps
1. Install dependencies with `npm ci`.
2. Generate Prisma client if the CI image does not restore it: `npm run db:generate`.
3. Run `npm run lint`.
4. Run `npm run typecheck`.
5. Run `npm test`.

## Local Release Gate
- Run `npm run validate`.
- Run `npm run smoke:staging` in local soft mode.
- Local soft smoke warnings are acceptable when Postgres, the app server, or optional notification providers are not running.

## Staging Release Gate
- Run `npm run validate`.
- Run `SMOKE_STRICT=true npm run smoke:staging` with a live staging app, staging database, and configured secrets.
- Strict mode must fail on missing env vars, failed database connectivity, missing Redis, missing webhook secrets, unreachable app/admin/dashboard routes, missing auth/admin config, or unsafe rate-limit configuration.
- Strict smoke should run from staging CI or the staging runtime if local developer machines cannot access staging secrets or private networking.
- Capture Task 16A provisioning evidence in `docs/STAGING_INFRASTRUCTURE_HANDOFF.md` before updating `docs/BETA_GO_NO_GO.md` from `blocked` to `pass`.

## Test Safety
- Vitest uses `tests/setup/vitest.setup.ts`.
- The setup file provides fake provider env vars, resets env/mocks/timers, and blocks unexpected external network calls.
- Automated tests must not call real Stripe, Checkr, OpenAI, Redis, email, or external APIs.
- Provider payload fixtures must remain fake and minimal.

## Timeout Diagnostics
- Check disk space: `df -h .`.
- Clear stale artifacts: `npm run clean:validation`.
- Run one file: `npx vitest run tests/<file>.test.ts`.
- Look for unclosed Prisma clients, HTTP servers, fake timers, pending promises, or dynamic imports that transform client components unnecessarily.
- Confirm no staging smoke scripts are included in `npm test`.

## Typecheck Notes
- `npm run typecheck` uses `tsconfig.typecheck.json` and non-incremental TypeScript to avoid stale `tsconfig.tsbuildinfo`.
- `npm run typecheck:full` is available for a broader local diagnostic pass, but the CI release gate uses the source-focused typecheck plus the full Vitest suite.
