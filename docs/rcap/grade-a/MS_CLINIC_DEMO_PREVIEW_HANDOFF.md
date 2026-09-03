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

## Continuation audit: 2026-09-03

Commit `991fed86e9fd055b351b1422b36bcd2b9549bdd6` passed the four Clinic-local
acceptance checks:

- schema and RLS isolation, including the mutation suite;
- participant ownership denials, including nine weakened-guard mutations;
- desktop and mobile critical-route checks, including shared-device reset; and
- accessibility checks at 320, 375, 390, and 412 CSS pixels against the WCAG
  2.0, 2.1, and 2.2 A/AA axe-core rules used by the harness.

The hosted safety-contract tests also passed: preflight 3/3, Vercel identity
12/12, preparation 9/9, migration 5/5, full-matrix contract, staging-scoped
Preview contract, and hosted-runner refusal probes.

The signed-in Vercel audit found one classified READY Preview at deployment
`dpl_9ygomDGFAXSLHENBfc6Undtyknjf`. Vercel reports these nonsecret metadata
fields:

- environment `Preview` and application SHA
  `441ee3188ee52047a012232d8d11f890a09b4ac5`;
- acceptance project `hyflxnlhpmiqxvvcoiia` and route state
  `staging_scoped`;
- `rcapStripeConfigured=true`; and
- deterministic return origin
  `https://legalease-rcap-441ee3188ee5-roger947s-projects.vercel.app`.

Vercel marks that deployment stale. Both of its Preview hostnames returned HTTP
302 to an unauthenticated `/api/health` probe because deployment protection
intercepted the request. The deployment does not contain this branch's MS
Clinic changes and cannot serve as acceptance evidence for this commit.

The signed-in Supabase dashboard redirected the exact acceptance-project URL to
the account's organization page. That organization listed zero project links
and no link for `hyflxnlhpmiqxvvcoiia`. The audit did not open SQL Editor or
issue a database request.

Hosted acceptance has four unresolved prerequisites:

- `node scripts/generate-rcap-staging-action.mjs --check` refuses this commit
  because its worker image inputs differ from the source behind the accepted
  immutable worker digest. The team must publish and pin a digest for the
  current full SHA before a hosted run can use these bytes.
- No READY Preview carries this branch's application SHA and required
  metadata. The stale `441ee318` deployment must not be reused for current
  acceptance.
- The worktree has no Supabase acceptance credential, and the signed-in browser
  account cannot access project `hyflxnlhpmiqxvvcoiia`. The team must restore
  authorized access before the preflight can prove the project's data boundary.
- The GitHub `hosted_vercel_audit` lane requires the application SHA to belong
  to the canonical captain branch. This feature commit has not entered that
  branch, and this audit did not bypass the ancestry gate.

The packet-factory verifier passed 30/30 checks. Its canonical generator reports
uncommitted generation drift in `MASTER_QUEUE.json` and `CHECKPOINT.json`; this
branch did not rewrite those shared files.

This continuation made no Preview deployment, hosted database request, tenant
seed, Stripe request, or production request. Counsel approval and the
participant-delivery prerequisites above remain open.
