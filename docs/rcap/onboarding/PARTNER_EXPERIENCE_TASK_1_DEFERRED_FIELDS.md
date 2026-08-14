# RCAP Partner Experience Task 1 deferred fields

Task 1 renders only values already available through the partner-safe onboarding
projection. The following changes require shared authentication, lifecycle, or
schema work owned by Session A and were intentionally not made here.

## LegalEase implementation owner

- Exact field: `public.partner_records.assigned_owner`
- Current defect: the field exists, but authenticated partner users are not
  granted access to it and the onboarding service cannot safely name an owner.
- User impact: the Implementation Center must show `Not assigned` even when an
  internal record contains an owner.
- Minimal future patch: add a validated, partner-safe owner name and contact
  projection without granting access to unrestricted `partner_records` data.
- Acceptance test: a partner sees the assigned LegalEase contact for its own
  tenant, sees `Not assigned` when no assignment exists, and cannot query another
  tenant's assignment.

## Implementation schedule

- Missing source fields: kickoff, administrator orientation, team training,
  leadership review, rehearsal, and action-level due dates.
- Current defect: only `target_launch_date` and per-user
  `training_completed_at` exist. Neither is a substitute for the missing
  scheduled dates.
- User impact: the page truthfully says `Not scheduled` and names the action
  required to schedule each event.
- Minimal future data contract: for each schedule milestone, store a date or
  timestamp, owner identity, due date, completion timestamp, last editor, and
  change timestamp in a partner-safe projection with tenant-scoped RLS.
- Acceptance test: each supplied date appears in the correct row, absent values
  stay `Not scheduled`, changes are auditable, and cross-tenant reads fail.

## Publication and participant activation

- Exact shared paths and fields:
  - `src/app/p/[partnerSlug]/page.tsx`, `PartnerLandingPage`
  - `src/lib/partners/partner-onboarding.ts`, `getPartnerRecordBySlug`
  - `public.partner_records.provisioning_status`
- Current defect: no canonical partner-facing publication field exists. The
  co-branded launch artifact explicitly records `published: false`, while the
  legacy `/p/[partnerSlug]` route renders an existing partner record without a
  publication gate. Participant-intake activation depends on a provisioning
  field that is not partner-readable.
- User impact: Task 1 can accurately describe the authorized onboarding preview
  as `Private`, but it cannot certify or change the legacy public route, and it
  cannot expose an independent activation schedule.
- Minimal future patch: create one authoritative publication lifecycle and a
  partner-safe activation projection, then fail the legacy public route closed
  unless publication and activation gates pass. Keep preview authorization
  separate from public publication.
- Acceptance test: private and approved-preview partners return no public page;
  publication is independently testable from activation; paused and closed
  programs cannot accept participants; direct slug requests disclose no tenant
  details when the gate fails.

## Browser access-denial recovery

- Exact file: `src/proxy.ts`
- Exact symbols: `proxy`, `unauthorized`
- Current defect: a partner document navigation to an internal route is stopped
  by the shared proxy before React routing and receives the machine-facing
  plaintext response `Internal admin access token required.`
- User impact: the partner sees technical authentication language with no safe
  route back, account switch, support link, or confirmation that no information
  changed.
- Minimal future patch: preserve every current allow and deny decision. Pass the
  request to `unauthorized`. For a `GET` or `HEAD` browser document navigation
  (`Accept: text/html` or `Sec-Fetch-Mode: navigate`), rewrite or redirect to a
  generic portal recovery page. Do not include the attempted path, slug, tenant,
  or tenant-existence signal in the URL or page. Keep the existing 401 plaintext
  response for APIs, bearer clients, and scripts.
- Recovery page requirements: LegalEase RCAP identity; focused accessible
  heading `You do not have access to this workspace`; plain-language
  explanation; `No information was changed`; link to `/partner/dashboard`;
  POST sign-out control labeled `Sign in with another account`; canonical
  `partners@legalease.com` support action.
- Acceptance test: a partner navigation receives the designed generic page,
  target tenant data never loads or renders, the heading receives focus, all
  recovery actions work, and signed-out or invalid bearer requests remain
  fail-closed with the current non-document 401 behavior.
- Existing verifiers to update when Session A authorizes the shared patch:
  `scripts/verify-internal-admin-browser-access.mjs`,
  `scripts/capture-internal-admin-access-acceptance.mjs`, and
  `scripts/verify-content-cms-access.mjs`. Add a browser test for recovery,
  focus, and tenant non-disclosure while retaining the machine-client 401 test.

`FINAL_MAIN_SYNC_PENDING_SESSION_A: yes`
