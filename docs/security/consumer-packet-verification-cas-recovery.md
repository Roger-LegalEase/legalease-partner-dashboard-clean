# Consumer packet verification CAS recovery

`20260827120000_consumer_packet_verification_cas.sql` is forward-only and has not been applied to Production by this change.

The migration adds protected columns and service-only functions; it does not delete or rewrite legacy Briefcase JSON. If an apply is interrupted, rerun the same migration. Every column, constraint, trigger, function, privilege, and comment statement converges on the intended definition, and the isolated PostgreSQL harness applies it twice.

Do not roll back by copying `artifact_refs_json`, `summary_json`, `next_steps_json`, `pathway_label`, or `packet_status` into protected columns. Those values are participant-visible display/progress data, not verification or artifact evidence.

If a forward repair is required:

1. Stop application traffic that can begin checkout, record payment, enqueue rendering, or finalize sponsored generation.
2. Preserve the protected columns and the pre-existing Phase 52/55 payment and accounting rows for audit.
3. Correct the new function or trigger in a later timestamped migration.
4. Re-run the static contract and isolated PGlite behavior harness.
5. Resume traffic only after stale hash/revision refusal, participant denial, payment binding, render immutability, and sponsored exactly-once behavior are green.

Rows with no protected draft remain unavailable and require a fresh, exact pending-source claim. Never bulk-backfill them from writable JSON. A relevant matter fact changed outside the CAS is intentionally invalidated; re-evaluate from the protected source and complete verification again instead of restoring the old hash.

Checkout invalidation deliberately retains `checkout_session_id` while clearing its protected verification binding. The packet-information save path retries expiration of an open retained Stripe Session after each successful CAS. Do not clear the retained id to hide a provider failure: keep the payment webhook fail-closed on the old hash, retry provider expiration, and reconcile an already-complete Session from provider evidence without creating a replacement.
