# RCAP operating-authority acceptance — 2026-10-10

The actual authenticated application completed Configure → Save → Preview → Start Program in the existing isolated application infrastructure. No Production account, participant, contract, payment, or program launch was used. This is execution evidence, not a new product specification; the Product Contract remains controlling.

## Integrated acceptance

`node scripts/test-rcap-operating-browser.mjs` completed all 12 checks with no browser errors on existing fixture `practice-create-chromium-mv17z3pa`. The runner refuses hosted targets and reads credentials only from the existing authorized local practice source. It signs in through the real form and GoTrue session, uses actual browser controls, and reads actual PostgreSQL state through PostgREST. There are no mocked service responses or synthetic publication receipts.

- Platform Admin selects LegalEase-managed, MD/DC/VA, Spanish, screening-only and no applicable external agreement; one save and browser reload return the exact values.
- Stale configuration requests return HTTP 409 promptly. An older workspace refresh cannot replace a newer editor snapshot or discard in-progress edits.
- Current program summary and participant page are generated from saved configuration. Approved standard Spanish renders; turning Spanish off preserves English, translations and readiness. Re-enabling restores the public bilingual experience.
- One authenticated confirmation approves the exact two materials and calls the existing real launch service. Server receipts proceed through prepared, publication_staged, public_verified and complete. No partner approval, agreement, commercial authorization or funding is fabricated.
- Each published MD/DC/VA browser entry creates its own correctly attributed state screening. A tampered NY server-action request creates no benefited session.
- Clinic controls offer all three states. A funded allocation request is refused for screening-only; an unfunded Clinic opens. Actual staff authorization, event-code generation, code redemption, participant consent and assisted Maryland screening succeed.
- An existing partner administrator signs in and reaches their existing onboarding/dashboard. Workspace data remain unchanged; the Platform Admin API refuses this partner role.
- The normal operating workspace contains no legacy section approvals, prefill editor, duplicate authority form, partner-review requirement or hidden launch panel.

The credential-free [structured evidence](OPERATING_AUTHORITY_ACCEPTANCE_20261010.json) records server status, material versions, jurisdiction set and receipt sequence. Raw browser screenshots, credentials, event codes and diagnostic payloads are not committed.

## Backend and compatibility checks

- `scripts/sql/rcap-operating-authority-regression.sql`: actual transactions against the browser-published isolated program, followed by ROLLBACK. Both ordinary and access-code claims accept MD/DC/VA, reject NY/unsupported/revoked scope before insertion or code use, retain atomic limited-use capacity, and refuse unfunded packets. Valid Clinic redemption permits only its event state; forged context, missing consent and unapproved staff are refused. Existing external rights prevent operator reassignment. Financial source rows are unchanged.
- `scripts/test-rcap-operating-migration.mjs`: exact migration applied transactionally in a disposable PostgreSQL cluster from the current Production definitions. All 18 replaced function ACLs, security-definer settings and search paths are preserved. New helpers and the Clinic-bound claim overload deny anon/authenticated execution. Existing programs default to partner-managed without policy conversion. SQL jurisdictions match all 51 compiled screening profiles.
- All 37 repository onboarding verifiers passed, including actual isolated authenticated server rendering, legacy and RCAP2 compatibility, optional-loader recovery, missing preflight, identity/tenant refusal, and unchanged existing approvals.
- Focused claim-boundary, real PostgreSQL Briefcase presentation/financial authority, Clinic participant ownership (including nine weakened-guard mutation tests), anonymous/tenant refusal and shared-device reset checks passed. Clinic keyboard, consent-entry accessibility and reflow checks also passed on four mobile viewports with axe WCAG 2.2 AA. Launch readiness and typecheck passed. The PR's clean-checkout CI supplies the final lint and production-build gate.

During acceptance, delayed refreshes exposed a stale editor response race. A stale save also demonstrated PostgREST repeatedly retrying the application's custom SQLSTATE 40001 and holding workspace locks. The editor now accepts only newer snapshots, and reviewed migration conflict paths use PT409 with unchanged optimistic concurrency and authorization checks. This follows the documented [Supabase RPC retry behavior](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

## Verification limits and release boundary

Authentication was genuinely tested in the existing nonproduction development application. An optimized local server cannot satisfy Production CAPTCHA configuration; that limitation was not bypassed or called a successful authenticated test. Optimized build verification is separate. No staged authenticated session will be invented; authenticated Production owner acceptance remains pending after deployment.

Three older standalone static checks reproduce failures on unchanged captain-release 98a82e43f222b4b8137c6eac17d90fe743a5e584: the August exact-path/payment verifier, the intake verifier's obsolete program-full copy expectation, and the Clinic telemetry verifier's fallback-variable regex. Their failures remain visible; current financial/ownership transactions and integrated acceptance are separately recorded. A whole-workspace lint invocation also included unrelated untracked marketing capture scripts; these files are not part of the PR, and clean-checkout CI is the release gate.

Only the reviewed operating-authority migration is in this correction. Existing partner-managed contracts, approvals, membership and financial truth remain authoritative; no opening-time upgrade occurs. Release may assign only legaleasepartner.com and www.legaleasepartner.com. Keep dpl_Yv8bSuhLBbuV1cVtbGcSsj9x73GH as the READY rollback target, preserve all other brand domains, and restore only the two RCAP mappings if a critical release check fails.
