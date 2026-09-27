# B COM-02 integration delta

B owns the shared workflow YAML, non-Clinic payment/sponsored acceptance tooling,
release verifiers and their direct tests. This includes the already-reviewed
`scripts/local-onboarding-db.sh` and `scripts/local-onboarding-db.test.mjs`.
A owns product source, migrations and Legal Aid runtime/schema/browser scripts.
Claude independently reviews this delta; this document does not authorize execution.

The prerequisite contract is A commit
`0aece295a01a5e4c076feefa1514c730e09aae02`, tree
`7950576137d4bb8496a8ccc790d825bcf6be9e94`, from the verified portable COM02
receipt and Claude task #86 PASS. This is an integration input, not a published
or accepted combined release. B's parent remains
`ae4a9d425262e7a34a02bc266aca622303e1eeb1`.

## Applicable phases

`hosted_legal_aid_browser` reuses one exact source-bound Preview. Its existing
schema/seed/browser checks remain mandatory. B collects A's read-only SQL and
historical PDF directly from private storage, invokes A's prerequisite before
seed, and invokes preservation and relationship verification after the phase.
Raw protected snapshots/PDF remain in the runner's private temp directory;
only native verdicts and their source/target context enter the artifact.
No Clinic seed/journey/audit, rendering, sponsorship allocation, Checkout or
Stripe step belongs to this phase. Email without provider evidence remains
INCOMPLETE / NOT PROVEN even when the other applicable checks pass.

`hosted_sponsor_cap` accepts `sponsor_case` (`sponsored`, `exhausted`, or
`final_slot`) and `sponsor_items` (JSON array of one or two existing authorized
synthetic Briefcase item UUIDs). It creates no identities, screening, fixture,
quota or access code. Historical Applicant A is explicitly rejected. Its input
IDs locate the original authenticated requests; they do not grant authority.
The runtime response and owner-bound protected funding row must agree:

- `slot_reserved`: sponsored evidence; no Stripe scheduling or secret prerequisite.
- `event_cap_exhausted` / `partner_cap_exhausted`: exact exhaustion response,
  immutable DTC choice, same current verification/item/owner/source. Reuse the
  ordinary $50 payment journey and its real-provider checks.
- Any refusal or ambiguous result stops; generic 409 and pausedAtCap never admit DTC.

The final-slot case reads the actual shared one-slot capacity, starts both
requests concurrently once, and preserves their responses/post-state. It does
not replace A's retained real-race proof. A generated/consumed count is required
separately from reservation; a reservation alone cannot pass accounting.

## Future bounded execution prerequisites

No commands below imply approval. One operator and one stateful batch across
both Codespaces; no queued dispatches. Each batch requires Claude review,
exact remote readback, Roger's recorded target/operations approval, actual final
combined source, source-bound Preview and accepted worker publication. Preserve
all existing source/project/worker/fulfillment gates. Resolve REL-02 prerequisite
before REL-01 regeneration/rebinding to the actual accepted publication.
Never bind an intermediate digest or turn an expected admission hold into PASS.

Before any authorized funding-choice migration, collect the read-only SQL from
`node scripts/rcap-sponsor-funding-migration-prerequisite.mjs --sql` and verify its
single `evidence` object with the same script:
`node scripts/rcap-sponsor-funding-migration-prerequisite.mjs TARGET.json REVIEWED_PREREQUISITE_BODIES.json`.
The second input must be the independently reviewed, exact-source rehearsal
receipt (`sourceSha`, `functionHashes` keyed by full function signature). It is
not fabricated by this delta; absence refuses. Full bodies must hash identically. It requires versions
`20260917090000`, `20260924120347`, `20260924172645`, in that order, and all five
recognized function-body guards used by A's unchanged migration. Then rehearse
`20260927152649_clinic_packet_funding_choice.sql` on a disposable copy of the
actual target, proving historical Applicant A/delivery/sponsor preservation.
Unrecognized body, missing prerequisite, or already-transitioned body stops.
Zero allocation is valid; it is not a migration blocker. No hosted migration
command is added to this delta.

For sponsored case A, authorize only the exact fresh synthetic item generation
and read-only accounting. For exhausted B and concurrent C, additionally
pre-authorize the normal DTC controls on the exact loser only. Before that batch,
reuse the already-authorized sandbox catalog and retarget the sandbox webhook
through its existing separately authorized DTC phase to the same Preview.
Preserve that target through dependent checks. Human/provider security controls
must be resolved before the batch, never bypassed or retried into success.

Shared names: `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`,
`VERCEL_AUTOMATION_BYPASS_SECRET`, `HOSTED_CLINIC_DEMO_PASSWORD`.
DTC-only runner names: `HOSTED_STRIPE_TEST_SECRET`,
`HOSTED_STRIPE_TEST_WEBHOOK_SECRET`; deployed DTC configuration remains
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_CONSUMER_PACKET_PRODUCT_ID`. Catalog readback supplies the existing
product ID. Optional Legal Aid email names remain the existing
`HOSTED_LEGAL_AID_RESEND_API_KEY`, `HOSTED_LEGAL_AID_TEST_MAILBOX`,
`HOSTED_LEGAL_AID_EMAIL_FROM`.

Evidence: Legal Aid prerequisite/preservation/relationships plus existing
seed/browser; sponsor-cap native-observations/outcome/accounting; applicable
sponsor-cap/payment plus original payment.json. Missing or failed evidence
refuses. After failure inspect complete jobs/logs/artifacts and actual post-state;
never replay allocation, seed, payment, render, migration or publication to
recover an artifact. No automatic Preview switch, quota increase or retarget.

After A integrates the reviewed B delta, rerun affected checks and compare the
actual accepted worker source to the exact final combined source. B-only input
equivalence never proves equivalence for A's product successor. Local doubles,
local SQL and static contracts are not hosted acceptance; real provider delivery,
real-database reporting, RLS credential availability and authorized hosted cases
remain separate evidence requirements. Refund classification remains resolved.
