# Consumer payment gate — independent adversarial audit

Lane: consumer-payment-gate adversarial audit (audit-owned; owns no gate code)
Audited commit: `f79fb0d9` on `origin/claude/rcap-final-sprint-integration`
Sequence: 26 → 27 → 28 → 49 → 50 → 51 → 52 → 53
Fixture: `scripts/verify-rcap-phase51-consumer-payment-security.mjs`
Result data: `data/rcap-render/phase51-consumer-payment-security.json`

Verdict: **the consumer payment gate is both unforgeable and reachable.**
21/21 security cases, 5/5 reachability cases, 3/3 mutations — with no privileged
fixture write anywhere in either proving section.

## The audit's own history, closed out

| Reported | Where | Now |
|---|---|---|
| G1/G1b — participant self-declares payment | Phase 51 | permission denied on UPDATE and INSERT (G1, G2) |
| G11 — one payment, unlimited matters | Phase 51 | `consumer_payment_matter_conflict` (G8) |
| G12 — B's payment authorizes A's job | Phase 51 | refused at enqueue, before a job exists (G6) |
| R1–R3 — the gate was unreachable for a legitimate payer | Phase 52 | binding written inside the enqueue insert (R1, R3) |

Phase 53 took the option this lane recommended first — extend the enqueue and
bind in the same statement — rather than adding a post-insert binding RPC. That
choice is load-bearing and is now verified rather than assumed: `service_role`
still holds **no** UPDATE on `packet_render_jobs` (R2), so the fix closed the
functional gap without reopening the phase-50 mutation boundary, and there is no
window in which a job exists unbound.

## No privileged fixture writes

The previous revision of this fixture wrote the consumer binding with a direct
`update packet_render_jobs set consumer_auth_user_id = …` as the table owner,
because no sanctioned path could supply it. That shortcut is removed. Every
statement in the GATE and REACH sections now runs as a role a real deployment
actually has:

- `authenticated` — creates and edits its own Briefcase item, naming no payment column
- `service_role` — records payment, enqueues, drives claim → render → validate → finalize
- `anon` — attacks

Verified by static audit of the fixture itself: of every `db.sql` / `db.scalar` /
`db.json` call touching a gate surface (`consumer_briefcase_items`,
`packet_render_jobs`, `packet_credit_ledger`, `consumer_packet_payment_*`, or any
of the four gate functions), exactly two run without a role — both at lines 516
and 534, inside the M2 mutation block, where breaking the schema *is* the
experiment. GATE (lines 225–435) and REACH (436–491) contain none. The only other
owner-level statements seed upstream tables the gate does not govern
(`auth.users`, `partner_records`, `rcap_persons`).

This matters beyond tidiness: the previous run passed 19/19 gate cases *because*
of the privileged write, while the real path was broken. Removing it is what
makes the green meaningful.

## The 21 security cases

| Case | Result |
|---|---|
| G1 participant payment UPDATE | permission denied |
| G2 participant INSERT already paid | permission denied |
| G3 safe nonpayment INSERT + UPDATE | still work (`TX/waiting` written by the participant) |
| G4 payment recording | `authenticated` denied EXECUTE; `service_role` → `recorded_paid` |
| G5 Phase-51-shaped paid row | refused by `paid_requires_server_evidence` **even for `service_role`** |
| G6 cross-user payment | refused at enqueue: "item is not owned by the expected user" |
| G7 first legitimate consumption | `zero_charge` / eligible |
| G8 same payment, another matter | `consumer_payment_matter_conflict` / blocked |
| G9 same item, person, matter | idempotently eligible, exactly one consumption row |
| G10 missing or wrong currency | `invalid_payment_evidence` for `eur` and null; finalize blocked |
| G11 missing provider evidence | `invalid_payment_evidence` (no receipt), `invalid_authority` (self-asserted) |
| G12 pre-finalization refund | `consumer_payment_required` / blocked |
| G13 sponsored accounting | `consumed` / eligible against a real entitlement, unchanged |
| G14 paid consumer credit | one `zero_charge` row, null entitlement, null partner |
| G15 repeat download | ledger rows 1 → 1 across three delivery events |
| G16 uniqueness conflict | typed; job left `artifact_validated`, never stranded |
| G17 blocked job delivery event | `job is not delivery-eligible` |
| G18 unbound consumer job | refused for a missing item, user, or matter |
| G19 sponsored job with consumer fields | refused: "must not carry consumer binding fields" |
| G20 browser roles at the enqueue | permission denied for `anon` and `authenticated` |
| G21 no consumer payment storage | refused at enqueue: storage absent |

G5 is worth calling out. The constraint refuses a hand-written paid row even for
`service_role`, which retains `grant all` on the table by Supabase default. So
the RPC is not merely the *recommended* payment path — a direct write that skips
it cannot produce a valid paid row.

## The 5 reachability cases

- **R1** — the sanctioned enqueue now carries `p_consumer_briefcase_item_id` and `p_expected_consumer_auth_user_id`.
- **R2** — `has_table_privilege('service_role','public.packet_render_jobs','UPDATE')` is still **false**. The phase-50 boundary is intact.
- **R3** — full journey, sanctioned roles only: participant creates the item, payment returns `recorded_paid`, enqueue stores `consumer_auth_user_id`, finalization returns **`zero_charge` / eligible**.
- **R4** — the old 13-argument signature no longer resolves (`function … does not exist`), so an unbound consumer job is impossible by signature rather than refused at runtime.
- **R5** — the stored binding is the item's *canonical* `user_id`, not the caller's claim. Phase 53 compares the two and stores the database's own value, so a caller supplying the correct id gains nothing it did not already have.

## Mutations

This lane's three still bite: without 51/52/53 an unpaid packet is deliverable
(M1); stripping the amount and currency clause opens an underpaid row (M2);
forcing the probe true opens an unpaid one (M3).

The captain's suites were run unmodified and are green: Phase 52 32/32 with 12/12
mutations caught, Phase 53 24/24 with 8/8 mutations caught.

## Remaining product-policy question, unchanged

Phase 52 records a refund but preserves the consumption row, so an artifact
already delivered keeps working while the refunded payment authorizes nothing
new. Whether a post-delivery refund should revoke access to an already-delivered
packet is Roger's decision; this audit does not assert either way. The
pre-finalization refunded case is tested and blocks correctly (G12).

No blockers remain from this lane.
