# Participant data rights — export, matter deletion, account deletion

Shared product lane. Nothing here rebuilds authentication, matter ownership,
Briefcase, payment, RCAP or Clinic; it adds three participant-facing controls on
top of the systems that already exist.

**Nothing in this lane has been applied to a live database.**
`supabase/migrations/20260830120000_participant_data_rights.sql` is a local migration awaiting the
production DB process, exactly like every phase before it.

## The three controls

Briefcase → Settings → **Privacy and data** (`/briefcase/settings/privacy`).

| Control | Route | Recent-auth proof |
| --- | --- | --- |
| Download a copy of my data | `POST /api/expungement-ai/privacy/export` | no |
| Delete one matter | `POST /api/expungement-ai/privacy/matter` | yes, purpose `matter_deletion` |
| Delete my account and personal data | `POST /api/expungement-ai/privacy/account` | yes, purpose `account_deletion`, plus a typed phrase |

`POST /api/expungement-ai/privacy/reauth` mints the proof.
`GET /api/expungement-ai/privacy/requests` returns the participant's own request
history and receipts.

## Recent authentication

A destructive request carries a proof minted in the last ten minutes by
re-entering the account password. The password is verified against the identity
provider on a throwaway client that persists nothing and is signed out with scope
`local`, so the check never mints a session anyone keeps and never disturbs the
session the participant is using.

Session *age* is deliberately not the test. A Supabase access token refreshes
silently in the background, so its age measures the last refresh, not the last
time a human proved they hold the credential — someone at an unlocked browser
passes an age check and fails this one.

The proof is bound to the account, to one purpose, to a ten-minute deadline, and
to a nonce. It is stored nowhere; single use is enforced by the unique index on
`participant_privacy_requests.recent_auth_proof_hash`, so a replay lands on the
request it already authorized (idempotent) and cannot open a second one.

## The durable workflow

`participant_privacy_requests` carries owner, type, idempotency key, status,
requested timestamp, recent-auth proof, legal-hold check, retention treatment,
completion timestamp and completion receipt.
`participant_privacy_request_steps` is the ordered step ledger that makes a
partial failure resumable. `participant_legal_holds`,
`participant_account_tombstones` and `participant_processor_propagations` carry
the hold, the freeze/erasure record and the downstream propagation outcomes.

Neither the request nor the tombstone has a foreign key to `auth.users`: an
account-deletion receipt has to outlive the account it is a receipt for, and a
cascade would delete it at the exact moment it starts to matter.

## Account deletion order

    freeze account → revoke sessions → stop email/reminders →
    revoke Clinic/partner assistance → remove follow-up queue entries →
    cancel unstarted renders → invalidate downloads → delete uploads →
    delete generated packet objects → delete/de-identify matters and screening
    data → pseudonymize retained payment/sponsorship/audit records →
    propagate to approved processors → write backup-restoration tombstone →
    delete Auth user last → issue receipt

Freezing first is what makes the rest safe: the tombstone row exists from step
one, so no new participant record can appear behind a sweep that has already
passed. Every step is idempotent and consulted from the ledger before it runs, so
re-submitting the same idempotency key resumes from the first step that is not
complete and does not repeat one that is.

**Resuming a frozen account.** Because the freeze is step one, a frozen account's
own session is refused everywhere — and would be refused by the deletion route
itself if nothing said otherwise. Two places admit it, narrowly: the
reauthentication route mints a proof for purpose `account_deletion` only, and the
account-deletion route accepts a frozen session. Everything else (proof,
confirmation phrase, origin, rate limit) still applies, and the only thing that
can happen is that the deletion finishes. Without this, a run that stopped
half-way would leave an account frozen, unusable and permanently undeleted.

## What is retained, and why

`packet_credit_ledger` is untouched. It carries no direct participant
identifier — `person_id` resolves to `rcap_persons.match_key`, already a one-way
hash of the account id, and `matter_id` is a derived hash — so it is pseudonymous
by construction, and leaving it byte-identical is what keeps partner entitlement
accounting correct across an erasure.

Records that do carry an account id — `packet_render_jobs.consumer_auth_user_id`,
`consumer_packet_payment_consumption.consumer_auth_user_id`,
`packet_delivery_events.actor_user_id` — have it replaced with a keyed pseudonym.
Keyed, not a plain digest: a bare SHA-256 of a UUID is reversible by anyone who
already holds the UUID, which is precisely the position an attacker with a stale
backup is in. `web_analytics_events.user_id` is nulled outright.

Amounts, currencies, product ids, receipt references, event types and row counts
never move. The participant-facing wording of all of this lives in one place,
`RETENTION_EXPLANATION` in `src/lib/expungement-ai/privacy/contract.ts`, and is
rendered both in the export package and in the deletion receipt — a participant
who reads two different answers to "what did you keep?" has been told nothing.

## Four guards relaxed, narrowly

The data-rights migration re-creates four existing guard functions, each with one named exception
gated on a session-local authority:

* `packet_render_jobs_consumer_binding_immutable` — the erasure authority may
  replace `consumer_auth_user_id` with a pseudonym; the item, person and matter
  bindings stay immutable even then.
* `guard_packet_delivery_events` — the erasure authority may rewrite
  `actor_user_id`; no event may be inserted outside its canonical function and
  none may be deleted, so the evidence still counts.
* `consumer_payment_consumption_binding_guard` — the same substitution; amount,
  currency, product and receipt reference stay immutable even under the erasure
  authority.
* `guard_packet_render_job_transition` — a `queued` job may be failed under
  `cancel_participant_render_jobs`, because a queued job holds no fencing token
  and the canonical failure function therefore cannot reach it.

`verify-participant-data-rights.mjs` checks G1–G10 assert that every original
refusal still fires without the authority, and that the accounting fields refuse
to move even with it.

## Single-matter deletion is scoped to that matter

Both the render-job cancellation and the pseudonymization sweep take an optional
Briefcase item id, and matter deletion passes it. Without that narrowing,
deleting one matter would cancel queued renders and unlink payment records for
every other matter on the account — matters the participant explicitly chose to
keep. Checks M10–M13 hold a second matter for the same participant alongside the
one being deleted and assert it survives untouched, queued render and readable
payment history included.

## Proof

    node scripts/verify-participant-data-rights.mjs

96 checks against an ephemeral PostgreSQL cluster with the real migrations
applied, driving the real route handlers and the real deletion pipeline. GoTrue
is replaced by a local HTTP server, so the password check and the session
revocation are genuine requests whose method and path are asserted; a mid-run
failure is produced by making that server return 500, not by stubbing the
pipeline.

Covered: single-matter deletion leaves the participant's other matters intact;
User A cannot delete User B; partner staff cannot delete a participant;
participant deletion does not touch partner data; same-origin/CSRF; rate
limiting; idempotency; safe resume after partial failure; private URLs stop
working; uploads and packets are gone; reminders stop; assisted access ends;
financial accounting stays correct; retained records are pseudonymized; sessions
are revoked; the deleted account cannot sign in; a restored backup does not
recreate it; and the export leaks no other participant's data, no security
material and nothing partner-confidential.

The script is wired into `npm test`.

## Environment

    PARTICIPANT_PRIVACY_PROOF_SECRET       signs recent-auth proofs
    PARTICIPANT_PRIVACY_PSEUDONYM_SECRET   keys the retained-record pseudonyms

Both are required in production and are at least 24 characters. Rotating the
proof secret invalidates outstanding proofs, which is harmless. Rotating the
pseudonym secret does not re-identify anything, but records erased before and
after a rotation carry different pseudonyms for the same person, so treat it as
long-lived.

## Known gaps

* There is no participant upload surface in the product today, so the uploads
  sweep reads the reserved prefix `participant-uploads/<userId>` and finds
  nothing. The code path is real and tested against a seeded object so that the
  day an upload surface ships, export and deletion already cover it.
* Processor propagation records the outcome per approved processor; it does not
  yet call an external suppression API. `APPROVED_PROCESSORS` is where that
  lands.
* `requireConsumerBriefcaseSession` now checks the tombstone on every
  authenticated participant page. It fails open only when Supabase is
  unconfigured — a local shell with no database has no tombstones.
