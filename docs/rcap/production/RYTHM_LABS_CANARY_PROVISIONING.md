# Rythm Labs canary provisioning

The reviewed sequence for provisioning the first RCAP partner tenant in
Production and handing its first administrator a working invitation.

This runbook contains no credentials and grants no authorization. Production
execution remains queued under
`auth-2026-08-19-rcap-partner-provisioning-and-existing-admin-claim` in
`data/rcap-authorization-queue.json` until Roger authorizes it.

## What this creates, and what it does not

Provisioning is one database transaction. It creates the partner tenant record,
the partner program, the onboarding workspace, the eight initial onboarding
sections, the implementation milestone state, the private participant-page
configuration, one audit event, and one idempotency record.

It creates no Auth user, no membership, no access code, no packet or participant
allocation, and no billing state of any kind. It publishes nothing and activates
nothing. The public route stays 404 and participant intake stays inactive.

Provisioning is not launch. Publication and program activation are separate
decisions, taken later, under their own controls.

## Canary facts

| Field | Value |
| --- | --- |
| Organization | Rythm Labs |
| Partner slug | `rythm-labs-test` |
| Program name | Rythm Labs RCAP Acceptance |
| Administrator | Lee Roman |
| Administrator email | `roger@rythmlabs.com` |

Exactly one confirmed Supabase Auth user already exists for the administrator
email. That is the supported existing-account path: no second account is
created, no password is changed, and no recovery link is used as authorization.

## Sequence

1. **Confirm the deployed source SHA.** Read the SHA the Production deployment
   is serving. Everything below assumes the repository is checked out at exactly
   that commit and `git status --porcelain` is empty.
2. **Confirm the Production project ref.** Read it from the Supabase project.
   The command compares it against the configured `NEXT_PUBLIC_SUPABASE_URL` and
   refuses if the environment does not belong to that ref.
3. **Run the canary in dry-run mode.** Dry run is the default; `--execute` has to
   be asked for.

   ```
   node scripts/provision-rcap-production-canary.mjs \
     --project-ref <production-ref> \
     --organization-name "Rythm Labs" \
     --legal-organization-name "<legal name on the agreement>" \
     --partner-slug rythm-labs-test \
     --program-name "Rythm Labs RCAP Acceptance" \
     --program-purpose "<one sentence describing the program>" \
     --admin-name "Lee Roman" \
     --admin-email roger@rythmlabs.com \
     --idempotency-key <uuid generated once and kept>
   ```

   Generate the idempotency key once and write it down. Every retry of this
   canary — dry run or execution — uses the same key, and that is what makes a
   retry safe.
4. **Review the exact intended records.** The dry run prints the intended
   tenant, the intended program, the administrator path (whether the Auth user
   is absent or already confirmed), the records that would be created, the
   records that would remain absent, and the publication and activation states.
   It prints no secret and no complete identifier. Read the administrator path
   line: it must say the account is already confirmed.
5. **Run once with execute confirmation.** Add `--execute` and both exact
   confirmations. The ref must equal `--project-ref` exactly and the SHA must
   equal `HEAD` exactly.

   ```
   node scripts/provision-rcap-production-canary.mjs \
     --execute \
     --confirm-production-ref <production-ref> \
     --confirm-source-sha <deployed 40-character SHA> \
     ... the same options as the dry run, including the same --idempotency-key
   ```

   Set `RCAP_CANARY_EXPECTED_ANCESTOR` to the merged commit that must be in
   `HEAD`'s ancestry if you want that checked too.
6. **Confirm the created records.** The command reports the workspace status,
   the section count (8), the milestone count (16), and that the page
   configuration is private. In the internal provisioning workspace, open
   `/internal/partners/provisioning/rythm-labs-test` and confirm one tenant, one
   program, one onboarding workspace, and one private page configuration.
7. **Confirm one invitation was sent.** The command reports either that it sent
   one branded invitation or that delivery did not complete. The administrator
   access panel shows the invitation as pending with its delivery status.
8. **Pause for Lee Roman to authenticate and accept.** Nothing further happens
   until a person acts. Lee opens the emailed link, is sent to the ordinary
   LegalEase sign-in, signs in with `roger@rythmlabs.com`, and lands on the
   Implementation Center.
9. **Confirm one active `partner_admin` membership.** Exactly one, for
   `rythm-labs-test`, created only at acceptance.
10. **Confirm replay prevention.** Re-opening the invitation link after
    acceptance creates no second membership and reveals no token; it returns the
    already-accepted state.
11. **Confirm the private, inactive, no-code state.** Publication private, public
    route 404, program activation inactive, participant intake inactive, no
    access code, no allocation, no billing state, `launched_at` null.
12. **Run the authenticated production canary.** The existing authenticated
    production canary, signed in as the new administrator.
13. **Keep Rythm Labs unpublished and intake inactive.** Publication and
    activation are separate authorizations and are not part of this runbook.

## Safe handling

**Partial provisioning failure.** Provisioning is one transaction. If any child
record fails, nothing is created — no tenant, no workspace, no page
configuration. Re-run with the same `--idempotency-key`. Do not invent a new
key: a new key with the same slug fails closed on slug uniqueness, which is
correct but tells you less than the replay would.

**Invitation email failure.** Invitation creation and delivery are separate from
the provisioning transaction and from each other. A failed send leaves the
invitation pending with delivery status `failed`, and the access panel says so.
Resend from the administrator access panel; the delivery key makes a retry
return the first outcome rather than send twice. Nothing about a failed send can
create a second invitation or a second membership.

**Wrong-account acceptance.** If someone signed in as another address opens the
link, no membership is created, the invitation is not consumed, and they see the
wrong-signed-in-email recovery state with one next action and
`partners@legalease.com`. The named administrator can still accept afterwards.
No unrelated account or tenant is disclosed to either party.

**Duplicate Auth-user detection.** If more than one Auth user matches the
administrator email, both the dry run and the execution refuse before writing,
and the invitation link refuses too. Resolve the duplicate accounts in Supabase
Auth first; do not work around it by inviting a different address.

**Expired or revoked invitation.** No membership is created and the recovery
state names one next action and `partners@legalease.com`. Issue a replacement
from the administrator access panel; the replacement supersedes the prior usable
token under the existing invitation contract.

**Duplicate command execution.** Running the command twice with the same
`--idempotency-key` returns the original result and creates nothing a second
time — no second tenant, no second invitation, no second email. Running it twice
with different keys and the same slug fails closed on the second run.

**Removing a provisioned tenant.** There is no ordinary undo. The onboarding
activity trail is append-only — a BEFORE DELETE trigger refuses every row — so a
delete on `partner_records` fails on the workspace's own activity record.
Removal needs a privileged session that clears `partner_onboarding_activity` for
that workspace first. Treat provisioning as a decision to create a private
record that will persist, not as a scratch action. A tenant left in place is
private, inactive, unbilled, and unreachable from the public route, so leaving
one is safe even when it was a mistake.

## If something looks wrong

Stop. Provisioning creates nothing public and nothing active, so a paused
partway state is safe to leave in place while it is reviewed. Do not publish, do
not activate, and do not create an access code to work around a problem.
