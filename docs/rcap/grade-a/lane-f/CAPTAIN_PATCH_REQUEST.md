# Lane F — captain patch requests

**Lane:** F (payment, sponsorship, packet credits, durable rendering, private delivery)
**Branch:** `claude/grade-a-v5-lane-f` · **Base:** `61ee6cc359bc19d32c6c071194e62a553446ca08`

Lane F did not edit any of the files below. Each is captain-owned, and each
change belongs to whoever owns it.

---

## 1. `scripts/generate-rcap-launch-graph.mjs` — make the tenth point real

`launch_graph_commercial_status` is the one admission point whose call site is a
captain-owned generator. Lane F has wired the governed reader it should call:

```js
// src/lib/rcap/render/commercial-admission.ts
import { isOperationallySellable } from "@/lib/rcap/render/commercial-admission";
```

**Requested change.** In the `operationallySellable` computation (around
`scripts/generate-rcap-launch-graph.mjs:235`), replace the independent
nine-gate calculation with a read of the authority:

```js
const operationallySellable = isOperationallySellable(row.pathwayKey);
```

The nine existing operational gates stay exactly as they are and keep being
reported — they become diagnostics rather than the decision. The point is that
the commercial denominator and the runtime stop being able to disagree: today
they are two computations of the same fact, and the second one is the one that
gets it wrong later.

**Expected effect on the current output:** none. `counters.operationallySellable`
is already `0`, and the authority also admits nothing, because
`commerciallyEligible` is `0`. This change is a no-op on the numbers and a real
change to where the number comes from.

**Verification after the change:**
`node scripts/verify-rcap-lane-f-commercial-admission.mjs` will then find the
generator as the `launch_graph_commercial_status` call site instead of the
wiring module. It asserts *exactly one* call site per point, so the reader
export in `commercial-admission.ts` must lose its own direct `admitCommercial`
call in the same patch — it should delegate to `isOperationallySellable`'s new
caller, or the generator should call `admitCommercial` directly. Either shape
passes; two call sites does not.

---

## 2. `package.json` — add the Lane F acceptance verifier to the test chain

Lane F added `scripts/verify-rcap-lane-f-commercial-admission.mjs` and did not
touch `package.json`, which is captain-only.

**Requested change.** Add to the `test` chain:

```
node scripts/verify-rcap-lane-f-commercial-admission.mjs
```

It has no ordering dependency; anywhere after the existing Grade-A fulfillment
verifiers is natural. It needs no database and no network, and runs in under a
second.

Without it in the chain, a future admission point added to
`COMMERCIAL_ADMISSION_POINTS` will ship ungated and nothing will say so. That is
precisely the failure that let `repeat_download` sit unwired.

---

## 3. `supabase/migrations/` — no migration, and one unnumbered proposal

Lane F wrote nothing into the shared apply order. The proposal is at
`docs/rcap/grade-a/lane-f/migration-proposal/consumer-artifact-digest.sql`,
unnumbered on purpose.

It is genuinely optional. The artifact digest and page count are carried in the
existing `artifact_refs_json` envelope, so nothing is blocked without it; the
proposal only adds the generated columns and index that would let an operator
query for artifacts whose recorded digest no longer matches a re-render, without
reading every JSON blob.

---

## 4. A deployment decision with an owner

Wiring these ten call sites **closes every commercial door in the product
today**, because `data/rcap-grade-a/fulfillment-authority-registry.json` proves
no route: `commerciallyEligible` is `0`, and all eight records evaluate
`INCOMPLETE`.

That is the correct fail-closed position and Lane F implemented it as specified.
It is stated here rather than buried because it is a product-visible change, and
it includes the five preserved legacy generators: sponsored Mississippi
finalization now requires a Grade-A admission like every other commercial act,
so it refuses until a record proves that route. ADR-0004 already retired the
legacy generators as *commercial fulfillment paths*, so this is consistent with
the standing decision rather than new policy — but it is the captain's call
whether it ships in this state or behind a staged registry.

Nothing about this is reversible by a code change in Lane F: the way a route
opens is a record that proves it, which is what Lanes C, D and G produce.

---

## 5. A residual delivery surface Lane F could not gate without breaking a required test

There are two download surfaces, and only one of them is gated:

| Surface | Path | Gated |
| --- | --- | --- |
| Consumer Grade-A packet | `/api/expungement-ai/packet/download` → `getConsumerPacketDownload` | yes — `private_download` / `repeat_download` |
| RCAP render job artifact | `/api/rcap/packets/[jobId]/download` → `authorizePacketDownload` | **no Grade-A admission** |

`authorizePacketDownload` is a strong gate on its own terms: it refuses
anonymous, wrong-user, unclaimed-job and accounting-blocked requests, and it
re-derives artifact integrity from the bytes — path identity, SHA-256 and the
PDF header — so a substituted or corrupted object fails closed. What it does
not do is ask the Grade-A authority.

**Why Lane F did not add the call.** The admission for a delivery point requires
a final-verification context, and `RenderJobRow` cannot supply one. The
verification hash is passed *into* `enqueueVerifiedConsumerRender`
(`src/lib/rcap/render/job-queue.ts:191`, `p_expected_verification_hash`) and is
never read back onto the row — the migration that would surface it is the
captain-owned handoff noted at `job-queue.ts:134`. Gating the surface without
that context would deny every download with `participant_context_denied`,
which breaks `node scripts/verify-rcap-packet-delivery-e2e.mjs`, a required
test. Supplying an admitting stub through `DeliveryPorts` instead would let a
test bypass the gate, which is worse than the gap.

Adding a second `private_download` call site would also violate the envelope's
"exactly one governed call-site treatment" invariant, which the Lane F
acceptance verifier enforces.

**Requested change**, in this order:

1. Surface the job's verification binding on `RenderJobRow` — the RPC already
   stores `p_expected_verification_hash` and `p_expected_consumer_auth_user_id`;
   the select and `rowFromRecord` need the two columns. This is the captain-owned
   migration handoff, not a Lane F change.
2. Once the row carries them, Lane F (or whoever holds this file next) routes
   both surfaces through the single governed treatment in
   `src/lib/rcap/render/commercial-admission.ts`, so the count stays at one
   treatment per point and both doors consult it.

Until then this surface is reachable only for a job that already passed
`provider_dispatch` — which *is* Grade-A gated — and that is the mitigation, not
a substitute for the gate.
