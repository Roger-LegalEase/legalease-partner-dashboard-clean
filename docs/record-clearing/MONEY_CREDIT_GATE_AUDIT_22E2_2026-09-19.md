# 22E-2 — the census gate asks a question that stopped being the same question

`verify-rcap-census-v1-money-credit-gate` reports six problems. They are not six
defects, and none of them is the runtime letting money through.

**Diagnosis complete; repair not yet applied.** This record fixes what each
finding is before any check is touched, because four of the six would be "fixed"
by loosening an assertion, and at least one of those loosenings would silently
adjudicate step 5.

## The premise that expired

The verifier's header states its own contract:

> For every route the compiled corpus can name, `resolvePacketRoute` currently
> answers `sellable: false` and `creditConsumable: false`. This file asks whether
> that is true of the RUNTIME.

That was a complete statement of commercial authority when **no route held a
Grade-A fulfillment record**. Six now do. Measured on
`DC:dc_actual_innocence_expungement_16_803` with a maximally permissive context:

```
resolvePacketRoute:  sellable=false  creditConsumable=false  routeKind=factory_v2
admitCommercial(consumer_checkout)              admitted=true
   reason: "consumer_checkout is admitted by COMPLETE_PACKET_PROVEN on DC:…"
admitCommercial(packet_credit_admission)        admitted=true   (same basis)
admitCommercial(artifact_commercial_attachment) admitted=true   (same basis)
admitCommercial(briefcase_ready)                admitted=true   (same basis)
admitCommercial(private_download)               admitted=true   (same basis)
admitCommercial(generation_admission)           admitted=false
   reason: "denied on a proven route: 1 participant condition(s) not …"
finalizeSponsoredPacketGeneration: ok=false countedAs="not_counted" recorded=false
```

`sellable: false` and "not commercially authorized" were the same sentence and
are not any more. `sellable` is a **resolver/render-capability** fact;
commercial authority is the **Grade-A record**, exactly as 132 and ADR-0004
establish. The verifier reads the first and reports on the second.

The five layers the repaired verifier must keep distinct:

| | Layer | Where it is decided |
|---|---|---|
| 1 | technical resolver / render capability | `resolvePacketRoute.sellable`, `rendererKind` |
| 2 | Grade-A fulfillment authority | the fulfillment authority registry |
| 3 | exact commercial surface | the admission point named in the call |
| 4 | payment / credit eligibility | the checkout guard, the entitlement context |
| 5 | actual side effect | what is written, attached or delivered |

## The six findings, individually

### 1 — sponsored entitlement, 5 routes. **Not yet dispositioned.**

`resolvePartnerPacketCapDecision` returns `admissionDenialCode: undefined`, and
the verifier reads `!cap.admissionDenialCode` as "sponsored entitlement was
reserved". `undefined` is not a decision. **A control route with no Grade-A
record has not yet been measured through this call**, so it is not established
that the check can distinguish an allowed route from a route it simply asked
nothing about. Until that control runs, this finding is unresolved, and it must
not be assumed to follow from layer 2.

Consumer and sponsored authority stay separate. Nothing here licenses the
sponsored channel from a consumer result or the reverse.

### 2 — packet credit, 5 routes. **Real change of guard. Do not loosen.**

The customer is protected: `ok=false`, `countedAs="not_counted"`,
`recorded=false`, and the error is
`"packet credit consumption refused: … cannot prove it delivers the packet it
promises (missing exact fulfillment binding)."`

But the check requires the refusal to come from a **named** gate:

```js
String(credit.error ?? "").startsWith("packet_credit_admission refused (")
```

and `admitCommercial("packet_credit_admission", …)` now **admits** these routes.
The refusal moved downstream to the fulfillment-binding check. The verifier's own
comment says why that distinction was built:

> Refused BY THE ADMISSION, not by a missing Supabase client or a stale hash
> further down … so the check names the gate rather than accepting any failure as
> proof the gate worked.

**This is the step 5 boundary.** Whether `packet_credit_admission` must
independently refuse, or whether a downstream refusal suffices, is the
consolidated-guard-architecture question step 5 holds for owner adjudication. A
step 22 verifier repair must not decide it by relaxing the prefix match.

Note also that `recorded: false` and an absent ledger id are **not** proof that
no write occurred. The repaired check needs an intercepted or counted
side-effect, plus the execution-order proof, to assert layer 5.

### 3 and 4 — attachment (5) and delivery (10). **Not yet dispositioned.**

`artifact_commercial_attachment`, `briefcase_ready` and `private_download` are
admitted on the Grade-A basis. That is layer 3 answering correctly for a proven
route. It does **not** follow that nothing is attached or delivered: admission is
not the effect. What these operations actually do downstream has not been traced,
and a technically buildable artifact is not an artifact delivered to a customer.
Unauthorized customer attachment, retrieval or delivery is not excused by no
credit having been consumed.

### 5 and 6 — render specs. **One event, and the boundary narrowed.**

Remeasured today by stable route key, not from the historical 108/212:

| routeKind | routes | renderable | builds a spec |
|---|---|---|---|
| `factory_v2` | 172 | 172 | **108** |
| `legacy_retired` | 40 | 40 | **0** |
| `guidance_only` | 110 | 0 | 0 |
| `handoff` | 13 | 0 | 0 |
| `exact_supported_deferral` | 7 | 0 | 0 |
| `packet_correction_required` | 1 | 0 | 0 |
| `typed_stop` | 1 | 0 | 0 |
| **total** | **344** | **212** | **108** |

Both checks pin an exact historical set — `jobSpecBuilt.length === renderable.length`
and `kinds === "factory_v2,legacy_retired"` — and both fail because
**`legacy_retired` routes no longer build a render job spec at all**. Under
ADR-0004 those generators are retired, so the job contract refusing them is the
product moving forward and the boundary moving in the **safe** direction. The
check is pinned to catch a widening and fires on a narrowing.

**But there is a real gap underneath.** All 104 refusals — 64 `factory_v2` and
40 `legacy_retired` — return `{spec: null, route}` with **no reason, refusal or
denial field**. A refusal that states nothing cannot be told apart from an
unexpected failure. So the 64 `factory_v2` routes that produce no spec are
**unaccounted**, not "deliberately refused", and per the accounting rule they
stay red until each is either an authorized production or a refusal that matches
independently established authority on an exact surface.

Neither count may be re-pinned to 108, nor the kind list to `factory_v2`. Taking
the current output as its own expectation is what made these checks stale.

## Surfaced for decision, not fixed here

For the six proven routes, `admitCommercial("consumer_checkout")` returns
**admitted: true**. The census records `checkout 0` because
`pay.assertCheckoutAllowed` throws first — so consumer checkout on those routes
is held by the payment-adapter guard alone, with admission already saying yes.
That may be intended defence in depth, but it is a single remaining guard and it
should be a stated decision rather than a measurement someone finds later.
Production activation is not authorized, and nothing here changes that.

## What must not be done

- Do not relax the `packet_credit_admission` prefix match. That adjudicates step 5.
- Do not treat `admissionDenialCode: undefined` as an answer before a
  no-Grade-A control proves the call discriminates.
- Do not accept "no credit consumed" as disposing of attachment or delivery.
- Do not re-pin 108 or `[factory_v2]` from today's output.
- Do not infer sponsored-channel permission from a consumer-channel result.
- Do not weaken assertions around the five or ten routes to reach green. Five of
  the six findings describe the authority model working; the checks describe an
  earlier one.

## Gate

Measurement only; no byte moved, all probe files removed.
`comparedInputs: 30`, `changedPaths: []`, `rebuildRequired: false` — an observed
result here, not a condition the eventual repair must preserve.

---

# Repair pass 1 — findings 5 and 6 closed

## No worker-input change was needed

The 64 unaccounted `factory_v2` refusals were fully explained by a decision the
implementation already makes. `buildRenderJobSpec` consults counsel's
`route-ratification-registry.json` and refuses any **listed** route whose status
is not `ratified_deployable`. Accounting the 104 refusals against the contract's
own three branches, in the contract's own order:

| Branch | Routes |
|---|---|
| `legacy_retired` (ADR-0004) | 40 |
| ratification `hard_gate_pending` | 32 |
| ratification `held_guidance` | 15 |
| ratification `intentional_unsupported` | 15 |
| ratification `corrected_awaiting_reconfirmation` | 2 |
| **unexplained** | **0** |
| **threw** | **0** |

32 + 15 + 15 + 2 = 64, exactly. **`job-contract.ts` was not modified**, so no
worker-image input moved and the gate is unchanged as a *result*, not as a
preserved objective.

## What changed, in the verifier only

**The exception swallow is gone.** `catch { built = null; }` collapsed a
deliberate refusal and an unexpected fault into one outcome — a
`RenderContractError` such as `profile_version_unknown`, which is a
configuration failure, was counted as the boundary holding. The error is now
captured and reported with its code and message.

**The two pinned counts are replaced by an accounting.** `jobSpecBuilt.length === renderable.length`
and `kinds === "factory_v2,legacy_retired"` both pinned the historical set and
fired when the boundary moved in the **safe** direction. Now every renderable
route must land in exactly one place — a spec, or a refusal one of the
contract's own branches explains, read from the same authority records the
contract reads — and three things are asserted: nothing threw, nothing is
unexplained, and **no route its own authority refuses produced a spec**. Counts
are printed, never asserted.

```
renderable 212 = 108 spec + 104 refused + 0 threw + 0 unexplained
```

## Mutation evidence

| | Mutation | Result |
|---|---|---|
| M1 | remove the `legacy_retired` refusal | **caught** — 23 retired routes named as building a spec against ADR-0004 |
| M2 | remove the ratification refusal | **caught** — all 64 named with their exact registry status |
| M3 | inject a `RenderContractError` on one ratified route | **caught as a fault**, not counted as a refusal — the defect the old `catch` hid |
| M4 | a `ratified_deployable` route returns null with no branch | **caught** — named with routeKind and status |
| positive control | unmutated | 108 legitimate specs still build; rejecting everything cannot pass |

`job-contract.ts` was restored from git after each mutation and the tree
verified clean.

## Pre-existing, not caused here

`--mutations` case *"a forged packet-fulfillment ledger row reopened a
commercial surface"* **FAILS**, and fails **identically with this change removed**
— measured by stashing the edit and re-running. It is a separate defect in the
same script, and it is not part of findings 1–6. The other four mutation cases
pass.

## Still open

Findings 1, 3 and 4 — sponsored entitlement, attachment, delivery — remain
undispositioned and unrepaired. They need the no-record / held-record /
authorized positive controls and the intercepted side-effect traces described
above. Finding 2 stays red by intent, pending step 5.

---

# Repair pass 2 — mutation-result attribution

## The defect, confirmed

The parent decided every case from the child's **exit status**. The census is
legitimately red on unresolved findings, so `status !== 0` was already true
before any mutation ran. Both directions were wrong:

- `if (held.status === 0) … else "reopened a commercial surface"` — the
  forged-ledger control could announce a reopened surface when the forged rows
  changed **nothing**;
- `if (run.status !== 0) … "caught"` — any nonzero exit earned a detection,
  including a no-op edit, an unrelated crash, or the same four baseline
  failures.

## The repair

The child now emits `CENSUS_SIGNALS`, a JSON block naming each invariant, its
satisfied/violated state, and the exact routes that made it so — printed before
any exit, so a red census still reports which invariants are red. The parent
runs an unmutated **control** first, and each case declares the invariants it
must break. A case passes only when those invariants are **satisfied in the
control and violated under the mutation**.

Three outcomes are now distinct, and each case states which one it expects:

| Outcome | When |
|---|---|
| `caught` | every declared invariant transitions satisfied → violated |
| `undetected` | the mutation applied and the invariant held |
| `harness_failure` | no parseable result, or an invariant **already violated in the control** — which cannot claim detection from its unchanged red |

## What the corrected harness reports

```
ok   a forged packet-fulfillment ledger row does not reopen a price or checkout on the two targeted routes
FAIL undetected — the price surface stops asking the Grade-A authority (expected caught)
ok   caught — the resolver calls a retired legacy generator sellable again
FAIL harness_failure — the authority honours an unproven route (expected caught)
ok   caught — the render contract stops fencing unrenderable routes
ok   caught — a retired legacy route may open a new render job
ok   caught — a route counsel has not ratified may open a render job
ok   caught — a render-contract fault is counted as a refusal
ok   caught — a route is refused with no branch that explains it
ok   undetected as required — SELF-TEST a no-op mutation must not be credited as a detection
ok   harness_failure as required — SELF-TEST an unrelated crash must be an execution failure, not a detection
```

**The forged-ledger failure was a false alarm.** Judged on the targeted
invariants and the two targeted routes rather than on exit status, the gate
**holds**. The earlier "a forged packet-fulfillment ledger row reopened a
commercial surface" — which I reported as a pre-existing defect — was the
attribution bug, not a reopened surface. Withdrawn.

Two honest failures remain, and neither is a claim that money moved:

- **`the price surface stops asking the Grade-A authority` — undetected.** The
  edit applies (`editSource` throws if its fragment has moved), yet
  `no_consumer_price` stays satisfied. The mutation no longer models a defect.
  Stale case, to be re-aimed at whatever now decides the price surface.
- **`the authority honours an unproven route` — harness_failure.**
  `no_sponsored_entitlement` is already violated in the control, because that
  **is** finding 1. The case cannot claim detection from an unchanged red and
  now says so instead of passing.

## M1–M4 are automated

The four render-accounting regressions proved by hand in pass 1 are cases in the
suite. A proof that lives only in a commit message is not a control.

## The self-tests are the point

Under the old rule **both** self-tests would have been reported as detections.
They are what makes the six `caught` verdicts mean something.

## Gate

Test-side only; `job-contract.ts` unchanged (mutations restored after each run).
`comparedInputs: 30`, `changedPaths: []`, `rebuildRequired: false`.

---

# Pass 3a — the sponsored probe asked the wrong question in the wrong channel

## The fixture was driving the wrong channel

`EntitlementKind` is `"consumer_payment" | "sponsored_credit"`. The census drove
the **sponsored** probe with the **consumer** kind.

This is not itself a product defect: the Grade-A authority does not require a
particular kind for `sponsored_entitlement` — it checks verification,
idempotency and consumption state — and the real sponsored path verifies the
partner session separately. But a census that asks about the sponsored channel
must supply the sponsored context the production path supplies, or its answer is
about the wrong channel. Fixed; `permissive()` now takes `entitlementKind` and
the sponsored probe passes `sponsored_credit`.

## The question was semantically wrong — `STALE_VERIFIER_SEMANTICS`

`resolvePartnerPacketCapDecision` is **read-only**. It reserves nothing and
consumes nothing. Source order:

1. `governCommercialAdmission("sponsored_entitlement", …)` — on refusal returns
   `{ partnerBenefit: true, pausedAtCap: true, admissionDenialCode }`
   **before Supabase is consulted at all**;
2. `getSupabaseAdminClient()` — **if absent, returns `{ partnerBenefit: false, pausedAtCap: false }`**;
3. otherwise reads `screening_sessions` and the entitlement tables.

The atomic credit consumption and the artifact-ready mutation happen later, in
`finalizeSponsoredPacketGeneration` — probe 4/6, the finding-2 boundary.

So `if (!cap.admissionDenialCode) sponsored.push(route)` never meant "sponsored
entitlement was reserved". With no Supabase client configured — this environment
— every route that clears Grade-A admission falls into step 2 and returns **no
denial code**, and the old check counted it. It was reporting a reservation for
routes the function had just told `partnerBenefit: false`.

The renamed invariant now carries that evidence in its own message:

```
routes that pass sponsored-cap admission and so may be promised sponsored
generation (this call reserves and consumes nothing): 5 —
  DC:dc_actual_innocence_expungement_16_803 (partnerBenefit=false, pausedAtCap=false)
  MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal (partnerBenefit=false, pausedAtCap=false)
  MS:additional-justice-court-misdemeanor-relief-9-11-15-3 (partnerBenefit=false, pausedAtCap=false)
  MS:additional-municipal-court-misdemeanor-relief-21-23-7-6 (partnerBenefit=false, pausedAtCap=false)
  WY:felony-conviction-expungement-w-s-7-13-1502 (partnerBenefit=false, pausedAtCap=false)
```

`no_sponsored_entitlement` → **`no_sponsored_cap_admission`**, and the probe now
requires `pausedAtCap !== true` as well as an absent denial code.

## Still owed before finding 1 closes

The three controls: **no Grade-A record** and **held/incomplete record** must
show a Grade-A denial with `pausedAtCap: true` and **zero Supabase calls**; an
**authorized route with a mocked active partner session** must show
`partnerBenefit: true`, `pausedAtCap: false`, and **zero writes and zero RPC
consumption** from this function. Credit-consumption proof stays with
`finalizeSponsoredPacketGeneration` and does not move into finding 1.

Findings 3 and 4 are unchanged and still owe their side-effect traces —
attachment through `attachConsumerPacketArtifactIfVerified`, and delivery
through `gradeAPacketDownload`, with `briefcase_ready` (readiness presentation)
separated from `private_download` / `repeat_download` (actual delivery
authority). `briefcase_ready` must stop being added to a list called
`delivered`.
