# CLOUD07 browser, mobile, and accessibility verification

- Assignment: `CLOUD07_BROWSER_MOBILE_ACCESSIBILITY`
- Base SHA: `48f74d82016795307e565220e38ce369cf43da5e`
- Required ancestor: `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13` (verified ancestor)
- Checkout branch observed: `work`
- Date: 2026-09-01 UTC
- Production touched: **No**
- Application files modified: **0**
- Screenshots committed: **0**

## Conclusion

The requested browser matrix could not be executed in this environment. The installed Playwright package has no matching Chromium executable, no system Chrome/Chromium executable is present, and Playwright's browser download endpoint returned HTTP 403 on all five retries. The real Next.js application did start and served the synthetic Clinic route with HTTP 200 against the repository's synthetic local Supabase double, but the test stopped before a browser could launch.

This is an environment blocker, not a reproduced application defect. In accordance with the assignment rule that a recommendation without a reproduced current-head finding is not a finding, this report records **zero pass results and zero application failures**. It does not infer accessibility, mobile, auth-recovery, or tenant-isolation results from static source inspection.

## Exact reproduction

From the repository root:

```sh
node scripts/security/test-clinic-mobile-accessibility.mjs
```

Expected: Playwright launches Chromium and drives the real Clinic application at the suite's 320, 375, 390, and 412 CSS-pixel viewports, including axe WCAG checks, keyboard operation, visible focus, accessible names, target sizes, reflow, error association, and status announcements.

Actual: Next.js started on `http://localhost:3217`; `GET /clinic/synthetic-a11y-clinic` returned 200; then `chromium.launch()` failed because `/root/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell` does not exist.

Recovery attempt:

```sh
npx playwright install chromium
```

Expected: install the Chromium revision required by Playwright 1.60.0.

Actual: `https://cdn.playwright.dev/builds/cft/148.0.7778.96/linux64/chrome-linux64.zip` returned HTTP 403 on five attempts; installation exited nonzero. Checks for `chromium`, `chromium-browser`, and `google-chrome`, plus a bounded filesystem search under `/usr` and `/opt`, found no executable fallback.

Affected harness symbol: `chromium.launch()` in `scripts/security/test-clinic-mobile-accessibility.mjs`.

Impact: all browser-dependent consumer and partner journeys, all requested viewport/zoom checks, keyboard/focus checks, automated contrast/accessibility checks, and interrupted-auth recovery checks remain unverified at current HEAD.

Smallest bounded environment remediation: provide the Playwright Chromium v1223 browser cache for the current user, or expose a compatible system Chromium executable and run the existing harness with that executable. No application patch is justified by this environment-only failure.

Focused regression command after remediation:

```sh
node scripts/security/test-clinic-mobile-accessibility.mjs
```

## Journey matrix

| Surface / journey | Status | Evidence |
|---|---:|---|
| Consumer anonymous screening | NOT RUN | Browser unavailable |
| Consumer result save | NOT RUN | Browser unavailable |
| Consumer auth continuation | NOT RUN | Browser unavailable |
| Consumer exact Briefcase matter | NOT RUN | Browser unavailable |
| Consumer packet-information shell | NOT RUN | Browser unavailable |
| Consumer checkout shell | NOT RUN | Browser unavailable |
| Consumer payment progress | NOT RUN | Browser unavailable |
| Consumer packet-ready/download shell | NOT RUN | Browser unavailable |
| Consumer error and recovery states | NOT RUN | Browser unavailable |
| Partner setup link | NOT RUN | Browser unavailable |
| Partner onboarding overview / dense section | NOT RUN | Browser unavailable |
| Partner prefill review | NOT RUN | Browser unavailable |
| Partner private upload | NOT RUN | Browser unavailable |
| Partner review/change cycle | NOT RUN | Browser unavailable |
| Partner team | NOT RUN | Browser unavailable |
| Partner access codes | NOT RUN | Browser unavailable |
| Partner Clinic | BLOCKED | App route returned 200; browser launch failed before assertions |
| Partner unpublished/live public page | NOT RUN | Browser unavailable |
| Partner cross-tenant denial | NOT RUN | Browser unavailable |
| 390px / 768px / 1440px / 200% zoom | NOT RUN | Browser unavailable |

## Findings

- Mobile defects: **0 reproduced; matrix blocked**.
- Accessibility defects: **0 reproduced; matrix blocked**.
- Auth-recovery defects: **0 reproduced; matrix blocked**.
- Security or user-impact findings: **none asserted without browser reproduction**.

## Changed-path report

Only this text report was added under the exact assigned output directory. No application, migration, packet, queue, Production, claim, route, source, legal-design, or commercial-authority path was modified.
