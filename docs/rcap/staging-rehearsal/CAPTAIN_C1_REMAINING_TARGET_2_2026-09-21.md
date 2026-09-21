# Captain decision — the remaining C1 target is `stored_row_matches_authoritative_resolver`

**Date:** 2026-09-21
**Decides:** the first real required failure of `hosted_full` run 35554327147,
dispatched on Captain SHA `0345f10fa` (Codex `aa6163e1d` integrated)
**Status:** Captain decision and Codex handoff. Creates no approval, opens no
route, authorizes no production action.

## What moved

`aa6163e1d` replaced the gate's hand-written SQL Briefcase seed with the real
participant sequence. The run got **further and failed earlier**: it now stops at
`stored_row_matches_authoritative_resolver`, which sits *before*
`unpaid_render_returns_402`. So the 402 repair is **not yet proven hosted** —
the run never reached it. Nothing here says it is wrong; it says it is untested.

```
FAIL stored_row_matches_authoritative_resolver — rows=1; stored={…
  "amount_cents":5000, "packet_information_stage":"not_started",
  "packet_information_reviewed":false …}
```

Every identity operand passed: jurisdiction `MS`, the exact pathway label,
`packet_ready_with_caution`, `custom_pleading`, `packet_ready`, `unpaid`,
`payment_allowed: true`, `checkout_session_id: null`. Two operands failed:

```js
&& stored.packet_information_stage === "ready_to_generate"   // actual: not_started
&& stored.packet_information_reviewed === true               // actual: false
```

`amount_cents` moved from `null` to `5000`, but **this case does not assert it**,
so it is not the failure. It is the product's ordinary claim behaviour —
`amount_cents: input.paymentAllowed ? 5000 : null` in `buildSaveInput` — and it
agrees with the gate's later `amountCents === 5000` Checkout assertion. Recorded
so it is not mistaken for drift; no action.

## Root cause — the case asserts a mirror the product deliberately does not update

The gate reads both operands from **`artifact_refs_json`**
(`rcap-hosted-checkout-gate.mjs:811-812`):

```sql
artifact_refs_json #>> '{commercialFlow,packetInformation,stage}'
(artifact_refs_json #>> '{commercialFlow,packetInformation,reviewedAt}') is not null
```

Three facts decide this, all read from the product:

1. **The claim seeds that column.** `claim-service.ts:135-159` builds
   `saveInput.artifactRefs` including `commercialFlow: initialCommercialFlow(...)`,
   which is why `stage` reads `not_started` and `reviewedAt` is absent.
2. **Final review writes a different column.** The CAS RPC
   `persist_consumer_packet_verification`
   (`20260901120000_dtc_consumer_launch_rails.sql:227-236`) does
   `jsonb_set(summary_json, '{commercialFlow}', … 'packetInformation',
   p_packet_information_metadata …)`. It updates **`summary_json`**, and never
   `artifact_refs_json`.
3. **Neither is authoritative, and the product says so.**
   `packet-information.ts:529` — *"The participant JSON commercialFlow is a
   compatibility mirror and is never required after the protected snapshot
   exists."* Authority is the protected record in
   `consumer_packet_verifications`.

So the case asserts that a claim-time compatibility mirror reflects review state.
It cannot, by design.

**Under the old seed this passed only because the gate wrote that column
itself.** The removed SQL insert hand-built `artifact_refs_json` with
`stage: ready_to_generate` and a `reviewedAt`, and the re-read then read it back.
The case was reading the gate's own fabrication and reporting it as the
application's state. Its name — *matches the authoritative resolver* — was
already untrue for these two operands before anything changed.

## Candidate-caused

Plainly yes, and not a reason to revert. `aa6163e1d` moved fixture creation to
the application and updated the adjacent
`briefcase_insert_returning_proves_row`, but left `storedExact` encoding the
removed seed's shape. Removing the fabrication is what exposed that these two
operands never measured the product. The patch was right and incomplete.

**Contained to one place.** `artifact_refs_json` and `summary_json` appear in the
gate at exactly lines 811-812, and `packet_information_*` is asserted only at
830-831. No other gate assertion depends on a column the removed seed used to
write.

## The repair, and its bounds — CODEX C1

The target is this one case. **Do not broaden the sweep.**

**Do:**

- keep every identity operand exactly as it is — they passed and they are real;
- stop asserting review state from `artifact_refs_json`. Review state belongs to
  `protected_final_verification_current`, which already reads the protected
  record and validates it with the product's own
  `requireCurrentPacketVerificationRecord`;
- if a display-mirror assertion is still wanted, read
  `summary_json #>> '{commercialFlow,packetInformation,…}'`, where the product's
  own RPC writes it, and give that its own case name. That adds proof that the
  display mirror updates after review; it must not be folded into a case named
  for the authoritative resolver.

**Do not:**

- make the application write review state into `artifact_refs_json` to satisfy
  the control. That is dragging the product backward, and it would turn a mirror
  the product calls *never required* into one that must be kept in sync;
- relax the case to `true`, delete it wholesale, or drop the identity operands
  with the two bad ones;
- change `amount_cents` handling, the claim, the CAS RPC, or any migration;
- touch the PA refusal contract, the MS fixture identity, the final-verification
  lifecycle, or any acceptance identity.

While repairing, confirm no other assertion in the gate still reads state the
removed seed used to write — the audit above says none does; verify it rather
than trust it.

If the case cannot be made truthful without changing product code, that is a
`CAPTAIN HANDOFF`, not a workaround.

Identities stay as they are: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`, Supabase `hyflxnlhpmiqxvvcoiia`.
No rebuild, republish, new Preview, Stripe retarget or production action is
authorized for this repair.
