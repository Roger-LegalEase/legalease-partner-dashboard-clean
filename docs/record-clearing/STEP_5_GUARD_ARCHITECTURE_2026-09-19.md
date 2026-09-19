# Step 5 — the guard-architecture question, and what it is not

The question to resolve was:

> Does the current consolidated fulfillment/protected-authority architecture
> supersede the previously approved requirement that `packet_credit_admission`
> independently refuse before the downstream fulfillment-binding guard?

**That question contains a false premise.** There is no such previously approved
requirement. The real Step 5 decision is a different one, on a different code
path, and it is genuinely an owner's to make.

## The only approved two-guard requirement in the repository

Searched across `data/`, `docs/` and `src/`. Exactly one approved requirement
uses the "second independent guard" construction, in
`docs/record-clearing/terminalize-c/c-dependency-runtime-patch-spec.json`:

```
id             c-deferral-checkout-route-defense
file           src/app/api/expungement-ai/checkout/route.ts
requiredBehavior
  "After item ownership resolution and before sponsored/payment handling,
   resolve the item's exact track metadata. Return 403 with no checkout
   URL/session/amount for component_deferral. Keep the payment-adapter denial
   as a second independent guard."
baseSha256     9e0766966ca6…
appliedSha256  b084d2b2b3dd…
```

It is about the **consumer checkout route**, for `component_deferral`, and the
second guard it names is the **payment-adapter denial**. No patch in the spec
addresses `packet_credit_admission`; the three credit-adjacent patches (0, 9,
12) cover the guidance registry, the route resolver and the job contract.

## The real Step 5 decision — open, and an owner's

Commit `4db45d6d1` (2026-08-26) removed 46 lines from the checkout route — the
route-level refusals for `exact_supported_deferral`,
`terminal_treatment_candidate` and `component_deferral` — consolidating them
into the protected authority. The route now resolves ownership, rejects
partner-sponsored items, calls `createConsumerPacketCheckout`, and maps
`ConsumerCheckoutNotAllowedError` to a 403 carrying no URL, session or amount.

- **Outcome clause: satisfied.** A deferral request still ends in 403 with no
  checkout artifacts, and `verify-rcap-component-deferral-runtime` proves it —
  2 777 checks over the exact ten routes and thirty-one components, with 10/10
  deliberate breakages detected.
- **Mechanism clause: contradicted.** The route performs no independent track
  resolution, so the approved "second independent guard" has nothing to be
  second to.

That is `AUTHORITY_CONFLICT`: equivalent in what a caller observes, contradicted
in what was approved. It is a defense-in-depth reduction that an approved control
specified and no successor approval records. **Not a live hole**, and not
something a verifier edit can settle.

The decision, stated so it can be answered in one line:

> Does the consolidated protected-authority architecture supersede
> `c-deferral-checkout-route-defense`'s requirement that the checkout route keep
> an independent track-resolution guard ahead of the payment-adapter denial?

Either answer is implementable. **Yes** → record the supersession and roll
`appliedSha256` forward as a second, recorded act. **No** → restore the
route-level guard so the approved mechanism holds again. What must not happen is
writing code to satisfy a stale digest, which is the inverse of taking the
decision.

## Why 22E-2 finding 2 is not waiting on this

Finding 2 is that `verify-rcap-census-v1-money-credit-gate` requires the credit
refusal to come from a named gate:

```js
String(credit.error ?? "").startsWith("packet_credit_admission refused (")
```

while `admitCommercial("packet_credit_admission", …)` now **admits** the five
Grade-A-proven routes, and the refusal arrives downstream from the
fulfillment-binding check — `ok: false`, `countedAs: "not_counted"`,
`recorded: false`, *"cannot prove it delivers the packet it promises (missing
exact fulfillment binding)"*.

**No approval requires that gate to refuse independently.** What the records
actually require of `packet_credit_admission` is that it **exist**:
`active-lane-envelopes.json` lists it among ten `requiredAdmissionPoints`,
*"exactly the set exported as `COMMERCIAL_ADMISSION_POINTS`"* — a requirement
about the admission surface, not about any route's answer.

The same envelope explains where the verifier's expectation came from:

> *"admitCommercial denies every route today **because commercially eligible is
> zero**. Do not add an override, a bypass or a second rule."*

Written when nothing was proven. Six routes are proven now, so an admission
returning `admitted: true` for one of them is the designed behaviour, not a
bypass — and the downstream fulfillment-binding refusal is the Grade-A model
itself: a route sells only what a record proves it delivers.

So finding 2 is **not** a step 5 dependency. It is the same stale-premise class
as the rest of 22E-2: a verifier assertion written against a world where the
commercial surface was empty.

**Not changed here.** Removing that dependency is a finding, not a licence to
edit the assertion — that call belongs to whoever owns 22E-2's closure, and it
should be made knowing the prefix match protects nothing an approval asked for.

## What must not be done

- Do not re-add a route-level check to make patch 11's digest match. Whether
  commerce authority belongs in one place or two is the missing decision.
- Do not treat the checkout-route decision and the credit-admission expectation
  as one question. They are different paths, and only the first has an approval
  behind it.
- Do not read "outcome satisfied" as "decision taken". The runtime verifier
  proves the 403; it does not record an approval for the consolidation.

## Gate

Diagnosis and recording only; no byte moved.
`comparedInputs: 30`, `changedPaths: []`, `rebuildRequired: false`.
