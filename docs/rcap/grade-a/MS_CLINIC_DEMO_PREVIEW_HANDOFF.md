# Mississippi Clinic Mode Preview handoff

This route is built for review but is not authorized for sponsored delivery. No
Preview deployment, hosted migration, tenant seed, Stripe action, or production
change was performed by this branch.

## Exact environment classification required

- A Vercel deployment whose server-observed `VERCEL_ENV` is `preview`.
- An approved nonproduction Supabase project. Its project reference and URL must
  be recorded in the acceptance evidence before any migration or seed action.
- `RCAP_CONSUMER_DELIVERY_ROUTE_STATE=staging_scoped` in Preview only.
- `RCAP_CONSUMER_DELIVERY_STAGING_SCOPE` containing only the UUIDs of synthetic
  participant A and synthetic participant B.
- Production must retain `RCAP_CONSUMER_DELIVERY_ROUTE_STATE=disabled`.
- No live Stripe keys, live invoice, live payment method, or production sponsor
  allocation may be present in the acceptance environment.

## Required migration evidence

Before the browser journey, record the applied migration identities for the
existing Clinic Mode core, security, accounting/reporting, pending-result atomic
claim, consumer launch rails, private delivery, and tightened artifact
authorization families. Apply the new tracked migration
`supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql` only to
the classified nonproduction project and only if its identity is not already
present. Never run it against production from this handoff.

## Required synthetic identities and records

Record the UUID, controlled test login, and role for each of these identities:

1. Partner administrator for partner slug `mvl-demo`.
2. Approved clinic staff member scoped to the demo event.
3. Verified synthetic participant A, included in the staging scope.
4. Verified synthetic participant B, included in the staging scope.

Create one active event named `Mississippi Volunteer Lawyers Clinic Mode Demo`
for partner `Mississippi Volunteer Lawyers Demo`, locked to jurisdiction `MS`.
Use a bounded nonproduction sponsor allocation. All screening and packet facts
must be synthetic.

## Acceptance evidence to retain

The run must bind the Preview deployment commit, Vercel URL, Supabase project
reference, four identity UUIDs, event UUID, screening session, exact Briefcase
matter, render job, sponsor-credit idempotency record, private artifact hash,
repeat-download result, participant-B denial, event-scoped staff status, and
shared-device reset result. It must also record that production, live Stripe,
and live partner allocation were untouched.

Named Mississippi counsel must separately approve the exact canonical and
boundary artifact hashes recorded in
`data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json` before the
sponsored posture may open.
