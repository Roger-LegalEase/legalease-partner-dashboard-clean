# RCAP Onboarding — Hosted Staging Acceptance

The exact commands and the numbered checklist for the acceptance lane that cannot run in
CI or in a local container, because it needs Supabase Auth (GoTrue), Storage, and real
email delivery.

**Never run any of this against production.** Every step assumes an isolated staging
project and synthetic organizations and people.

## Why this lane exists

The local gates prove a great deal — see `VERIFICATION_GATES.md` — and the database group
now proves RLS isolation against a real PostgreSQL. What none of them can reach:

| Needs | Why local cannot cover it |
| --- | --- |
| Sign-in, session establishment, redirects | `supabase.auth.signInWithPassword` and `getUser` call GoTrue, a hosted service. A local PostgreSQL provides the database but not the auth API |
| Invitation email delivery | Requires a real mail transport and a capture mailbox |
| Storage privacy and signed-URL expiry | Requires the Storage service, not just the `storage.*` tables |
| Browser journeys of signed-in screens | Every authenticated screen resolves a session first |

## Prerequisites

- An isolated Supabase staging project (never production)
- A preview deployment of this branch, or `npm start` pointed at staging
- A capture mailbox or Supabase Inbucket for invitation mail
- Synthetic partner organizations only

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://<staging-ref>.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<staging anon key>"
export SUPABASE_SERVICE_ROLE_KEY="<staging service role key>"
export RCAP_PARTNER_SUPPORT_EMAIL="rcap-staging@example.test"   # not the real mailbox
export NEXT_PUBLIC_PARTNER_APP_URL="https://<staging-host>"
```

## 1. Apply migrations to staging

Order matters: phase number first, then letter suffix, so phase-19 precedes phase-19i and
phase-35 precedes 35b/c/d. A plain `sort` gets this wrong and dependent migrations fail.

```bash
ls supabase/phase-*.sql \
  | sed -E 's|.*/phase-([0-9]+)([a-z]*)-.*|\1 \2 &|' \
  | sort -k1,1n -k2,2 | awk '{print $NF}'
```

Apply `supabase/partner-journey-os.sql` first, then that list. All 42 apply cleanly in this
order — verified locally by `scripts/local-onboarding-db.sh up`.

## 2. Run the database group against staging

```bash
RCAP_TEST_DATABASE_URL="postgres://postgres:<pw>@db.<staging-ref>.supabase.co:5432/postgres" \
  node scripts/verify-onboarding-tenant-isolation.mjs

npm run partners:verify-onboarding-database
```

Both must pass before any browser step. The isolation verifier refuses to run against a URL
containing `prod` or `production`.

## 3. Build and serve against staging

```bash
npm run build && npm start -- -p 3001
```

## 4. Acceptance checklist

Record pass/fail, evidence, and a screenshot filename for every numbered step. Nothing here
may be marked passed from a local run.

### Authentication and provisioning
1. Signed-out request to `/partner/onboarding` redirects to `/sign-in?next=...`.
2. Signed-out request to `/internal/partners/data` is refused (401 or redirect), not rendered.
3. LegalEase operator creates a synthetic partner workspace in a commercially blocked state.
4. The partner sees the block, its owner, and what is still allowed — no raw enum, no dead end.
5. Commercial clearance is reflected from authoritative data, not editable by the partner.
6. Operator creates the first-admin invitation; the review step precedes any durable send.
7. The invitation email arrives in the capture mailbox. No mail reaches a real address.
8. A brand-new recipient accepts, sets a password, and lands on the correct partner dashboard.
9. `select count(*) from partner_users where auth_user_id = ...` is exactly 1.
10. Accepting a second time creates no second membership.
11. An existing-account recipient can accept and reaches the correct tenant.
12. Expired, revoked, already-used, malformed, and wrong-email links each fail with a
    designed state naming the next step — never a stack trace or a blank page.

### Tenant and role boundaries
13. Partner A cannot read or mutate Partner B's onboarding, assets, documents, or downloads
    by changing the URL.
14. A partner staff user sees view-oriented actions only; no disabled admin CTA is offered.
15. A staff user cannot invite the first administrator, approve commercial state, or approve
    launch.

### Setup, save, and recovery
16. All eight sections complete, with autosave and explicit save both visibly resolving.
17. Sign out mid-section, sign back in, and no entered work is lost.
18. A stale write from a second tab is refused with a conflict state, not a silent overwrite.
19. A save interrupted by network loss shows an actionable error and retains entered values.
20. Prefilled values can be confirmed, changed, and rejected, and a pending value never
    counts as partner-confirmed.

### Assets
21. Upload succeeds; the object is private.
22. A signed URL works, then expires.
23. Partner A cannot fetch Partner B's asset by id.
24. An oversized and an unsupported file each fail with a specific, recoverable message.

### Review and the change-request loop
25. Submission persists across reload and shows what happens next.
26. Submission does not publish a page, release codes, or activate a program.
27. LegalEase requests a change; the partner sees the affected field with a direct link.
28. The partner responds and resubmits; history is preserved.

### Documents, page, launch
29. Documents generate, preview, and can be approved by the correct role.
30. Editing authoritative data invalidates the affected approval and says why.
31. Co-branded preview renders at desktop and mobile; a missing logo yields an actionable
    state, not a broken layout.
32. Launch readiness shows real checks with owner and next action.
33. With one blocking check failing, no screen claims ready and no publish, code-release, or
    activate control appears.
34. Approved resources and the launch kit download, tenant-scoped, with correct MIME types.

### Support
35. The support link on a blocker opens a mail client addressed to the configured mailbox
    with the organization in the subject.
36. **Confirm `partners@legalease.com` forwards to a monitored inbox before launch.** The
    address ships as the default; monitoring has not been confirmed.

## 5. Evidence

Write results and screenshots to a non-committed directory, e.g.
`/tmp/rcap-hosted-acceptance/`, with an index mapping each numbered step to its screenshot
and outcome. Do not commit screenshots, tokens, signed URLs, or real partner data.

## 6. Do not

Deploy to production, apply migrations to production, enable production flags, email a real
partner or participant, publish a co-branded page, release access codes, or activate a
program.
