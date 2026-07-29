# First Administrator Provisioning Implementation Record

## Current path

- Partner records are created through the existing partner onboarding/provisioning services and stored in `partner_records`.
- Phase 1 onboarding workspaces are created idempotently for existing partners in `partner_onboarding`; target launch date and commercial clearance remain owned by the existing onboarding controls.
- Authenticated partner access is represented by one `partner_users` row per Supabase Auth user. Partner roles are `partner_admin` and `partner_staff`; internal operators use `internal_admin`.
- Existing staff invitations call Supabase Auth and map `partner_users` immediately. That flow remains the later-team-member path and is not used for first-administrator provisioning.
- The shared `/auth/set-password` screen exchanges Supabase invite/recovery codes, validates the password locally, updates the authenticated Auth user, and uses a relative-path redirect allowlist.
- Partner dashboard and onboarding authorization resolve tenant and role from the authenticated `partner_users` row. The browser does not choose either value.
- Partner email delivery is default-off and uses the reviewed Resend-backed delivery abstraction only when all delivery configuration is present.
- Internal partner routes use the existing `internal_admin` session boundary, request IDs, safe structured logging, and partner event/activity records.

## Launch-critical gaps

- The provisioning detail did not show whether a first administrator existed.
- The prior internal user flow sent email immediately and created membership before invitation acceptance.
- There was no operator review step, copy-link flow, invitation lifecycle UI, revocation/replacement control, or accepted-first-admin redirect decision.
- The prior flow did not provide an application-owned, partner-bound, role-bound token hash or first-admin acceptance audit trail.

## Implementation scope

Expected changes are limited to:

- a focused first-admin domain/service module using Supabase Auth, `partner_events`, and `partner_users`;
- internal first-admin action APIs and the existing provisioning detail page;
- an anonymous token-claim route and an authenticated acceptance API;
- a focused first-admin email adapter built on the existing provider configuration;
- the shared password screen only to finalize a server-verified first-admin invitation;
- focused behavioral verification and this implementation record.

## Schema decision

No migration is required. A deterministic, partner-scoped `partner_events` record provides the current invitation state machine and stores only a SHA-256 token hash. Append-only partner events retain bounded lifecycle history. Supabase Auth remains the credential and one-time session authority, and `partner_users` remains the sole membership store.

## Out of scope

- Phase 2A artifacts, generated onboarding documents, launch kits, co-branded previews, publication, activation, or launch-readiness work
- public partner self-signup, temporary/shared passwords, impersonation, or a second auth/membership system
- payment, package, allocation, credit, overage, access-code, RLS, or commercial-gate changes
- production/staging database access, migrations, deployment, real email delivery, and Command Center changes
