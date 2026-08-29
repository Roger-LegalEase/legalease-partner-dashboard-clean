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
