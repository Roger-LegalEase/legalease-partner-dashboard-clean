# 5A / 5B — authority reconstruction

`verify-c-dependency-deferrals` reports eleven errors: ten patch targets whose
bytes "match no recorded state", and one CA evidence carrier whose committed
bytes do not match its frozen SHA-256.

This reconstructs the authority behind the current bytes. It updates no digest.
Nothing here is eligible for a mechanical rollover except where the successor is
traceably authorized, and even there the rollover is a second act on a second
artifact.

## The intent check, and why it is not symbol-spotting

`captainApplication` in the patch spec nominates its own runtime verifier:
`scripts/verify-rcap-component-deferral-runtime.mjs`. That is the designated
test of whether the approved behaviour still holds, over the exact ten routes
and thirty-one components the patches targeted. Measured now:

```
OK verify-rcap-component-deferral-runtime — 2777 checks, 10 routes, 31 components, EN+ES
OK component-deferral runtime mutations  — 10/10 deliberate breakages detected
```

So the control the patches bought is enforced and mutation-resistant. That is
the evidence the classifications below rest on; file diffs say what moved, and
the verifier says whether the approved behaviour survived it.

## 5A — the ten patch targets

| # | File | Current bytes first produced by | Pre-baseline | Outcome |
|---|---|---|---|---|
| 0 | `guidance-packet-registry.ts` | `a71031b50` 2026-09-15 bound runtime evidence reads | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| 1 | `rcap-engine/contracts.ts` | `4db45d6d1` 2026-08-26 enforce protected packet commerce authority | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| 3 | `rcap-engine/evaluator.ts` | `8cd6b6385` 2026-08-28 one ratification authority | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| 5 | `expungement-ai/types.ts` | `6d8e66f55` 2026-08-28 remove stored-status authority | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| 7 | `expungement-ai/briefcase.ts` | `6d8e66f55` 2026-08-28 | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| 9 | `packet-route-resolver.ts` | `a71031b50` 2026-09-15 | yes | `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` |
| **10** | **`payment-adapter.ts`** | **`75cc29bbe` 2026-09-18 prove the packet is renderable before the participant is charged** | **no** | **`STRONGER_CONTROL_UNRECORDED`** |
| **11** | **`checkout/route.ts`** | **`0ab13faca` 2026-09-17 prove the resumed-session path** | **no** | **`AUTHORITY_CONFLICT`** |
| **12** | **`render/job-contract.ts`** | **`f28ffd026` 2026-09-02 refuse a render job for a route counsel did not ratify** | yes | **`STRONGER_CONTROL_UNRECORDED`** |
| **13** | **`consumer-render-request.ts`** | **`1898a99eb` 2026-09-18 re-run the render preflight at render time** | **no** | **`STRONGER_CONTROL_UNRECORDED`** |

Seven are pre-baseline and three are not. Chronology is not approval either way.

### The six non-money targets

All named symbols survive. The files moved substantially for unrelated later
reasons — the evaluator alone is +643/−299 across fifteen commits spanning
route dispositions, Georgia and Missouri corrections and the shared-resolver
hardening — and none of those commits was about the deferral control. The
deferral behaviour is proven intact by the nominated verifier above.

No governance record adopts the successor bytes. They stay unrecorded.

### 10 — `payment-adapter.ts`: stronger

Required: deny a `component_deferral` item in both the payment placeholder and
`assertCheckoutAllowed`, before already-paid handling and before Stripe or
dry-run session creation.

Present, on both paths — line 112 for the placeholder, `assertNotComponentDeferral`
at line 800 called from `assertCheckoutAllowed` — and each checks the
server-owned classification *and* whether the exact `trackId` resolves to one.
The gate chain around it has since grown: exact deferral, component deferral,
terminal treatment, packet-route delivery and proven fulfillment now all run
before payment. Strictly more denial than the patch required, and none of it
recorded as a successor.

### 11 — `checkout/route.ts`: conflict

Required, verbatim: *"After item ownership resolution and before
sponsored/payment handling, resolve the item's exact track metadata. Return 403
with no checkout URL/session/amount for component_deferral. **Keep the
payment-adapter denial as a second independent guard.**"*

Two independent guards were approved. There is now one.

Commit `4db45d6d1` (2026-08-26, "fix: enforce protected packet commerce
authority") removed 46 lines from this route — the route-level refusals for
`exact_supported_deferral`, `terminal_treatment_candidate` and
`component_deferral` — consolidating them into the protected authority. The
route now resolves ownership, rejects partner-sponsored items, calls
`createConsumerPacketCheckout`, and maps `ConsumerCheckoutNotAllowedError` to a
403 carrying no URL, session or amount.

The **outcome** clause is satisfied. The **mechanism** clause is contradicted:
the route performs no independent track resolution, so the "second independent
guard" has nothing to be second to.

This is not a live hole — a deferral request still ends in 403 with no checkout
artifacts, and the runtime verifier proves it. It is a defense-in-depth
reduction that an approved control specified and no successor approval records.
That is why it is `AUTHORITY_CONFLICT` and not `SEMANTICALLY_EQUIVALENT`:
equivalent in what a caller observes, contradicted in what was approved.

### 12 — `render/job-contract.ts`: stronger

Required: return `spec=null` for `component_deferral` before a render job can be
queued. Line 350 refuses `component_deferral`, **and also**
`exact_supported_deferral`, **and also** any route failing `packetRouteCanRender`
— broader than approved, in the closing direction.

### 13 — `consumer-render-request.ts`: stronger

One approved symbol is gone: `resolveConsumerPacketId`, last present in
`50e5dd6ff` (2026-08-26). The required behaviour is not.

The exact `trackId` now comes from the server-owned protected verification
snapshot (`verification.snapshot.selectedTrackId`) and is passed to
`buildRenderJobSpec` **twice** — provisional and versioned — with
`route_not_renderable` returned on either failure before any packet row is
created. The packet id is now `deterministicUuid(item.id : verification.hash :
payloadVersionHash)`, so it is bound to the verification rather than resolved
independently, and the path additionally requires a current final verification
and a passed accuracy review first. The symbol was replaced by something that
cannot drift from the facts it names.

## 5B — the CA evidence carrier

`data/rcap-all50/composed-routes/california/ca-diversion-seal/components/ca-diversion-seal-primary-filing-2/dependency.json`

```
frozen in the assignment  10f6c8af4d10c9f4…   last held by f20971ddc (2026-08-12)
on disk now               1070bd295e3b0d63…
```

Exactly one commit ever changed it: `77f24687c` (2026-09-02), *"Execute four
owner determinations: Arizona Rule 41, CRM-307, CA proof of service, Utah
acquittal"*. The carrier now embeds the determination itself:

- `ownerDetermination.determinationId: DET-DT-CA-CRM307-001`
- decided that CRM-307 is a **San Diego Superior Court local form** for Penal
  Code § 851.90 and must not bind to a statewide California route
- `countyScope: SAN_DIEGO_ONLY`, with a sibling branch
  `ca-diversion-seal-primary-filing-4` for every other county
- prohibitions: do not use CRM-307 outside San Diego; do not silently convert a
  § 851.90 matter into a § 851.91 matter (separate route, own forms CR-409 /
  CR-410, own family `ca-851-91-set`, no reading answers across)
- counsel flag cf-03 narrowed: that CRM-307 is a San Diego § 851.90 form is
  settled; whether the held revision is current stays open, with no SHA-256
  recorded so staleness cannot be detected

Nothing was collected, approved or opened: *"No county's local set is collected
and approved yet, in either branch."* The change is strictly narrowing and
carries a named determination id.

**Outcome: `APPROVED_SUCCESSOR_PROVEN`** for the carrier bytes.

It is the only one of the eleven that is. And it still does not authorize the
rollover by itself: the stale digest lives in a *different* frozen artifact,
`data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json`,
whose own SHA-256 is pinned in the verifier. DET-DT-CA-CRM307-001 decided the
California scope question; it said nothing about re-freezing the assignment.
Re-freezing is a second act on a second artifact and needs its own authority.

## What must not be done

- Do not roll `appliedSha256` forward on any of the ten. Nine are unrecorded
  and one is contradicted; none is a proven successor.
- Do not "fix" patch 11 by re-adding a route-level check to make the digest
  match. Whether commerce authority belongs in one place or two is the decision
  that is missing, and writing code to satisfy a stale digest is the inverse of
  taking it.
- Do not re-freeze the correction assignment on the strength of 5B. The
  determination authorized the carrier, not the freeze.

## Gate

Diagnosis and recording only. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.

## Appendix — the 61 follow-up flag

The question was whether `approval-request.json` reporting
`independentVisualReviewEstablished: false` contradicts the family's
`lastIndependentVerification: PASS_COMPLETE_INDEPENDENT`, or whether the two are
different concepts.

They are different, and the file is not stale. `approval-request.json` is
written by the family builder with `status: "REQUESTED"`, `grantedBy: null`,
`outputLegalApprovalEstablished: false` and `independentVisualReviewEstablished:
false` as **literals** — the same constants appear in
`build-census-v1-ca-1203-4-set.mjs` and
`build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`. The file
is the request, emitted at build time; it is structurally incapable of ever
reading `true`, because nothing writes a grant back into it.

`lastIndependentVerification` is the technical completeness lane (vf04).
`independentVisualReviewEstablished` is the human output-level visual review
being asked for. So 61's classification is unchanged and its basis is the
stronger one: `status: REQUESTED`, `grantedBy: null`, and no CA record in the
fulfillment registry.
