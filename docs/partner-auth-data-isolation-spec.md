# Partner Authentication & Data Isolation Spec

Status: Governing build contract

Purpose: This spec governs the partner dashboard authentication, partner identity, RLS, and isolation-test build. When code and this spec disagree, the spec wins.

## Hard Requirement

Each partner must see only their own data.

Zeroing mock numbers is not data isolation. Hiding UI controls is not data isolation. A partner-facing dashboard is safe only when:

- The partner must authenticate.
- The app resolves partner identity server-side from the authenticated session or another secure server-verified source.
- Dashboard data queries are keyed from that server-verified partner identity.
- The viewer cannot override partner identity through URL slug, query param, dropdown, editable client state, local storage, or request body.

A slug, query param, dropdown, or UI-selected partner is not isolation unless it is checked server-side against the authenticated partner identity.

## Supabase Auth + RLS Foundation

Partner dashboard authentication must use Supabase Auth as the authentication foundation unless a later written spec replaces it.

Supabase Row Level Security must be the database isolation boundary for partner-facing data. Application checks are required, but app-level checks alone are not enough.

The service role key must never be used for partner-facing dashboard reads in a way that bypasses partner RLS. Service role access may be used only for internal LegalEase administrative workflows, controlled server jobs, and provisioning flows that are not exposed to partner users.

Partner-facing reads must use the authenticated user context. If a server component or route handler performs partner-facing reads, it must derive the user from the Supabase session and apply the same server-verified partner identity before querying.

## Manual Provisioning Model

Day-one partner users are manually provisioned by LegalEase.

There is no public self-serve partner signup in this build. A partner user account is created or invited only after LegalEase confirms:

- the partner organization;
- the person’s email address;
- the person’s role;
- the partner slug or partner record they are allowed to access;
- whether the person is partner staff or LegalEase internal staff.

We Must Vote must not be invited to dashboard access until this spec is implemented and verified.

## `partner_users` Identity Model

The build must introduce a persisted user-to-partner identity model.

Required table shape:

```sql
create table partner_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  partner_slug text references partner_records(partner_slug) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auth_user_id, partner_slug)
);
```

Required role values:

- `partner_admin`
- `partner_staff`
- `internal_admin`

Partner users with `partner_admin` or `partner_staff` must have exactly one non-null `partner_slug` for partner-facing dashboard access.

Partner-facing code must not accept a partner slug from client input as the source of truth. It must resolve the partner slug from the authenticated user’s `partner_users` row.

## `internal_admin` Null Partner Handling

`internal_admin` users are LegalEase staff and may have `partner_slug = null`.

`internal_admin` users may access an internal all-partners operations dashboard only through an internal route and internal role check.

`internal_admin` null partner handling must not weaken partner-facing isolation. Partner-facing routes must not treat `null` as “all partners.” Partner-facing routes must reject or redirect internal users unless explicitly designed to show a safe internal view.

## Server-Side `resolveSessionPartner()`

The app must include a server-only helper equivalent to:

```ts
type SessionPartner =
  | {
      kind: "partner";
      authUserId: string;
      partnerSlug: string;
      role: "partner_admin" | "partner_staff";
    }
  | {
      kind: "internal_admin";
      authUserId: string;
      role: "internal_admin";
    };
```

`resolveSessionPartner()` must:

- run only on the server;
- read the authenticated Supabase user from the server-readable session;
- reject unauthenticated requests;
- load the matching `partner_users` row;
- require `status = 'active'`;
- require exactly one active partner identity for partner-facing users;
- return `partnerSlug` only from the database identity row, never from route params, query params, dropdown state, local storage, request JSON, or client-provided values;
- distinguish partner users from `internal_admin` users.

Every partner-facing dashboard route and data loader must call this resolver or a narrower wrapper around it.

## RLS Policy Shape

RLS must be enabled on partner-facing data tables before the dashboard is considered deliverable.

At minimum, RLS must cover:

- `partner_records`
- `partner_metrics`
- `partner_assets`
- `partner_events`, if exposed to partners
- `rcap_intake_sessions`, if dashboard reads intake activity
- `rcap_intake_responses`, if exposed in aggregate or detail
- `rcap_document_packets`, if dashboard reads packet activity
- `rcap_briefcase_items`, if dashboard reads briefcase activity

Partner-facing policies must follow this shape:

```sql
partner_slug in (
  select pu.partner_slug
  from partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role in ('partner_admin', 'partner_staff')
)
```

Internal admin policies must be separate and explicit:

```sql
exists (
  select 1
  from partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role = 'internal_admin'
)
```

Internal admin policies must be used only for internal LegalEase routes.

No partner-facing RLS policy may depend on URL params, query params, dashboard dropdowns, request bodies, local storage, or client-supplied partner slugs.

## Adversarial Isolation Test

The build is not complete until an adversarial isolation test proves partner isolation.

The test must create or use at least two partner identities:

- `we-must-vote`
- another partner, such as `demo-partner` or `fulton-county`

The test must prove that a We Must Vote partner user cannot access another partner’s data by:

- requesting `/dashboard/partners/demo-partner`;
- requesting `/dashboard/partners/fulton-county`;
- changing query params such as `?partnerSlug=demo-partner`;
- posting request bodies with another partner slug;
- changing dropdown values;
- changing local storage or client state;
- calling dashboard API routes directly with another partner slug;
- attempting to load reports for another partner;
- attempting to load intake, packet, metric, or briefcase summaries for another partner.

Expected result: denied, redirected, or still scoped to the authenticated partner.

The test must also prove that an unauthenticated request to the partner-facing dashboard is blocked or redirected.

## Route Strategy

Internal all-partners operations and partner-facing dashboards must be separate surfaces.

Preferred route strategy:

- Keep `/dashboard/partners` as an internal all-partners LegalEase operations dashboard.
- Move partner-facing isolated dashboard to a new authenticated route, such as `/partner/dashboard` or `/dashboard/partner`.

The partner-facing route must not include the partner slug as the source of authority. It may display the partner slug or partner name after resolving it from the authenticated session.

If `/dashboard/partners` is later converted into a partner-facing dashboard, the internal all-partners view must move elsewhere and the converted route must be protected by partner auth and server-side partner resolution.

## Day-One Data Model

Day one must support a narrow, safe dashboard before richer reporting.

Minimum partner-facing dashboard data:

- partner name and slug from the resolved partner identity;
- public landing link;
- intake link;
- total intake sessions scoped to the authenticated partner;
- completed intake sessions scoped to the authenticated partner;
- document packet activity scoped to the authenticated partner, if enabled;
- zero-state messaging when no partner activity exists.

Day one must not show:

- all partners;
- partner dropdowns;
- global mock metrics;
- legacy labels that imply unrelated products or other partner programs;
- user-level private details unless separately authorized and covered by RLS;
- any partner data keyed from route params or client-provided partner slug.

## Five-Commit Build Sequence

The dashboard auth build must be split into five commits.

### Commit 1: Supabase Auth Foundation

- Add Supabase server/client auth helpers.
- Add real `/sign-in` and `/sign-out` flows.
- Establish server-readable session handling.
- Keep dashboard behavior unchanged unless needed for auth plumbing.

### Commit 2: Partner User Identity + RLS

- Add `partner_users` migration.
- Add roles and active/inactive status.
- Add RLS policies for partner-facing tables.
- Add seed or manual provisioning instructions for test users.
- Add server-side `resolveSessionPartner()`.

### Commit 3: Partner Dashboard Route Split

- Create the authenticated partner-facing dashboard route.
- Keep internal all-partners dashboard separate.
- Remove partner selection from the partner-facing surface.
- Block unauthenticated partner-facing dashboard access.

### Commit 4: Partner-Scoped Data Loaders

- Add dashboard data loaders that accept the server-verified partner identity.
- Load metrics, intake activity, packet activity, and briefcase activity only for the resolved partner.
- Remove static/global dashboard data from the partner-facing surface.
- Preserve safe zero states.

### Commit 5: Isolation Verification + Production Gate

- Add adversarial isolation tests.
- Add verifier scripts that fail if dashboard data can be keyed by URL slug, query param, dropdown, or request body.
- Verify unauthenticated access is blocked.
- Verify We Must Vote cannot read another partner’s data.
- Verify internal admin access is separate and role-gated.

## Deploy Reality

Local green does not equal production-deployable.

Before partner handoff:

- the commit must be pushed to `origin/main`;
- the correct Vercel project must deploy that commit;
- deployed Vercel must be verified, not localhost only;
- dashboard auth must be tested on the deployed URL;
- RLS must be verified against Supabase production configuration;
- We Must Vote must not be invited until deployed isolation tests pass.

Do not connect `legaleasepartner.com` for dashboard handoff until the deployed partner-facing dashboard passes the isolation gate.

## One-Sentence Contract

The partner-facing dashboard must derive partner identity only from authenticated server-side session state and must use that server-verified identity for every dashboard data query, with Supabase RLS and adversarial tests proving that no partner can view another partner’s data.
