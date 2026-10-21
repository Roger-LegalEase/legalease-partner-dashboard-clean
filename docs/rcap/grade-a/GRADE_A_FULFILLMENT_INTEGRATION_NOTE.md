# Grade-A Fulfillment Authority — integration note

**Sprint:** `2026-08-29-national-grade-a` · **Lane:** B (Grade-A fulfillment authority core)
**Status of this note:** inventory and contract. It changes no runtime behaviour.

Lane B owns one thing: the single server-authoritative answer to *is this route
commercially eligible*. This note lists every place in the repository that
currently decides that question on its own, and states exactly what each one must
call instead. It is written so Lane F can wire the authority in without inventing
a second rule anywhere.

The authority itself lives in three files and has no other public surface:

| File | What it is |
| --- | --- |
| `src/lib/rcap/fulfillment/grade-a-authority.ts` | The contract: record shape, the six authority states, the eligibility and staleness rules, the request sanitiser. Pure; reads no request, header, cookie or environment. |
| `src/lib/rcap/fulfillment/grade-a-registry.ts` | The one canonical controlling registry loader. Fail-closed, deeply frozen, hash-chained history. |
| `src/lib/rcap/fulfillment/grade-a-admission.ts` | What callers use: `admitCommercial()`, `admitCommercialFromUntrustedBody()`, `fulfillmentAuthorityFor()`. |

Data:

| File | What it is |
| --- | --- |
| `data/rcap-grade-a/fulfillment-authority-registry.json` | **Controlling.** The records. |
| `data/rcap-grade-a/fulfillment-observation-snapshot.json` | What the server currently observes, per route. |
| `data/rcap-grade-a/fulfillment-authority-projection.json` | **Derived.** Editing it changes nothing. |

---

## The rule, in one paragraph

`admitCommercial(admissionPoint, { routeId, jurisdiction, packetFamilyId })`
returns `{ admitted, authority, denialCode, reason }`. `admitted` is true only
when the route's current record reaches `COMPLETE_PACKET_PROVEN` — every proof
present, every proof still matching what the server observes now, and the service
disposition is `paid_packet_intended`. Every other state denies:
`INCOMPLETE`, `STALE`, `REVOKED`, `SUPERSEDED`, and `UNSUPPORTED_ROUTE` (which is
what a route with no record gets). There is no second entry point and no argument
through which a caller can assert a conclusion.

---

## The nine admission points

Each row names the call site that today decides commercial eligibility for
itself, and the single call that must gate it. **Consumer and sponsored paths use
the same call** — that is the point of the table, not an accident of it.

### 1. Consumer checkout — `consumer_checkout`

| | |
| --- | --- |
| Entry | `src/app/api/expungement-ai/checkout/route.ts:16` (`POST`) |
| Today | Four inline treatment checks (lines 33–62), then `createConsumerPacketCheckout` → `assertCheckoutAllowed` → `assertPacketRouteCanDeliver` (`src/lib/expungement-ai/payment-adapter.ts:505`), which reads `packetRouteCanRender(resolvePacketRoute(...))`. |
| Must add | `admitCommercial("consumer_checkout", identity)` **before** any Stripe session is created, alongside — not instead of — the existing suppressions. A denial maps to HTTP 403 with `resultCode: decision.denialCode`. |
| Why it is not enough today | `resolvePacketRoute` answers "can the factory build something". It does not know whether the pages were visually reviewed, whether counsel approved the completed output, or whether the provider image that produced the proof is still the one deployed. |

### 2. Sponsored entitlement — `sponsored_entitlement`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/rcap-slot-lifecycle.ts:104` (`resolvePartnerPacketCapDecision`), reached from `src/app/api/expungement-ai/packet/generate/route.ts:37` |
| Today | Decides on the partner's remaining cap alone. The route's own provenness is never consulted, so a sponsored participant can be admitted to a route a paying participant would be refused. |
| Must add | `admitCommercial("sponsored_entitlement", identity)` before the cap decision is honoured. |

### 3. Packet-credit admission — `packet_credit_admission`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/rcap-slot-lifecycle.ts:67` (`recordPartnerPacketGeneration`), reached from `src/app/api/expungement-ai/packet/generate/route.ts:62` |
| Today | Decrements the partner's packet cap after generation with no route gate. |
| Must add | `admitCommercial("packet_credit_admission", identity)` **before** the decrement. A credit spent on an unproven route is a credit the partner cannot get back. |

### 4. Generation admission — `generation_admission`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/packet-generation.ts:61` (`generatePaidConsumerPacket`), gated at line 81 by `assertPacketGenerationAllowed` |
| Today | Checks payment/sponsorship and item status. It does not check that the route is proven. |
| Must add | `admitCommercial("generation_admission", identity)` inside `assertPacketGenerationAllowed` (`src/lib/expungement-ai/packet-generation.ts:243`), so all four of its call sites (lines 81, 119, 136, 323) inherit the gate from one place. |

### 5. Provider dispatch — `provider_dispatch`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/consumer-render-request.ts:255` (`requestConsumerPacketRender`) and `:269` (`…ForWebhook`), reached from `src/app/api/expungement-ai/packet/render/route.ts:32` and `src/lib/expungement-ai/checkout-reconciliation.ts:166` |
| Today | `src/lib/rcap/render/job-contract.ts:316` resolves the packet route to choose a renderer kind. Choosing a renderer is not proving one. |
| Must add | `admitCommercial("provider_dispatch", identity)` before a job is enqueued. Both the interactive and webhook paths, or the webhook becomes the unguarded door. |

### 6. Artifact attachment as commercially deliverable — `artifact_commercial_attachment`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/packet-generation.ts:149` (`attachPacketToBriefcaseItem`) |
| Today | Attaches whatever the renderer produced. Artifact existence is treated as packet proof. |
| Must add | `admitCommercial("artifact_commercial_attachment", identity)` before the attachment is marked deliverable. An unproven route may still produce an internal-preview artifact; it may not produce a commercially deliverable one. |

### 7. Briefcase Ready — `briefcase_ready`

| | |
| --- | --- |
| Entry | `src/lib/expungement-ai/briefcase.ts:925` (`packet_ready` derivation), surfaced at `:742`, `:855`, `:888` |
| Today | `packet_ready` follows from the screening result code alone. |
| Must add | `admitCommercial("briefcase_ready", identity)` in the single derivation at line 925, so a route that is not proven presents as saved-and-pending rather than as a packet the participant is waiting to download. |

### 8. Private download — `private_download`

| | |
| --- | --- |
| Entry | `src/app/api/expungement-ai/packet/download/route.ts:23` → `getConsumerPacketDownload` (`src/lib/expungement-ai/packet-generation.ts:128`); and `src/app/api/rcap/packets/[jobId]/download/route.ts:16` → `authorizePacketDownload` |
| Today | Ownership, payment and integrity are all checked. Route provenness is not. |
| Must add | `admitCommercial("private_download", identity)` in both. This is the last door: a packet that reaches a participant's hands is the one failure that cannot be walked back. |

### 9. Launch-graph commercial status — `launch_graph_commercial_status`

| | |
| --- | --- |
| Entry | `scripts/generate-rcap-launch-graph.mjs:235` and its `operationallySellable` computation |
| Today | Nine operational gates computed inside the generator. They cover legal design, technical currency, renderer selection, deterministic artifact and PDF holds — **not** page-by-page visual review, output-level legal approval, provider identity, fixture binding or final verification. |
| Must change | The launch graph is captain-owned; Lane B does not edit it. The request is in **Shared-file patch requests** below: `operationallySellable` should become a read of `fulfillmentAuthorityFor(pathwayKey).authorized` rather than a tenth independent computation. |

---

## What each admission point passes

```ts
import { admitCommercial } from "@/lib/rcap/fulfillment/grade-a-admission";
import { routeIdFor } from "@/lib/rcap/fulfillment/grade-a-authority";

const decision = admitCommercial("consumer_checkout", {
  routeId: routeIdFor(item.state, pathwayId),   // "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a"
  jurisdiction: normalizedJurisdictionCode,      // "OR"
  packetFamilyId: serverResolvedFamilyId ?? null // never from a request body
});

if (!decision.admitted) {
  return NextResponse.json(
    { error: participantFacingCopyFor(decision.denialCode), resultCode: decision.denialCode },
    { status: 403 }
  );
}
```

`routeId`, `jurisdiction` and `packetFamilyId` must all be **server-resolved** —
from the screening evaluation or server-owned Briefcase metadata, exactly as
`trackId` already is at `src/lib/rcap/documents/packet-route-resolver.ts:74`. If a
route identity can only be had from a request body, use
`admitCommercialFromUntrustedBody()`, which refuses any body carrying an
authority-bearing key rather than sanitising it and proceeding.

## Denial codes a route must handle

| `denialCode` | Meaning | Suggested HTTP |
| --- | --- | --- |
| `fulfillment_unsupported_route` | No record binds this route. | 403 |
| `fulfillment_incomplete` | A record exists; proof is missing. `authority.missingProof` names each. | 403 |
| `fulfillment_stale` | Every proof was obtained; at least one no longer matches. `authority.stalenessReasons` names each. | 409 |
| `fulfillment_revoked` | Withdrawn by a named authority. | 403 |
| `fulfillment_superseded` | A later version decides; this one does not. | 409 |
| `route_binding_mismatch` | The record proves a different route, jurisdiction or family. | 403 |
| `client_supplied_authority` | The request body asserted authority. | 400 |
| `unknown_admission_point` | The caller named an admission point that does not exist. | 500 |

## What this authority does not decide

Payment execution, sponsorship execution, render-worker behaviour, artifact
storage, claim lifecycle, and the captain-owned global fulfillment ledger. It
decides eligibility; those lanes keep owning the acting. In particular it does
**not** replace the existing suppressions in
`src/lib/rcap/documents/packet-route-resolver.ts` — component deferrals, exact
supported deferrals, terminal treatments and complete-guidance tracks are
decisions about a route that must continue to win on their own terms. The
authority is an additional closed door, never an override that opens one.

## Shared-file patch requests

Lane B did not edit these. Each is a captain-owned file whose change belongs to
whoever owns it.

1. **`scripts/generate-rcap-launch-graph.mjs`** — replace the `operationallySellable`
   computation with `fulfillmentAuthorityFor(row.pathwayKey).authorized`, so the
   commercial denominator and the runtime cannot disagree. The nine existing
   operational gates stay as diagnostics; they stop being the decision.
2. **`package.json`** — Lane B added its two commands to the `test` chain
   (`generate-rcap-grade-a-fulfillment-authority.mjs --check`,
   `verify-rcap-grade-a-fulfillment-authority.mjs` and its `--mutations` pass).
   If the captain owns the chain's ordering, move them to wherever the ordering
   requires; they have no dependency on position.
3. **`supabase/migrations/`** — Lane B wrote no migration into the shared apply
   order. The proposal is at
   `docs/rcap/grade-a/migration-patch-proposal/grade-a-fulfillment-authority.sql`,
   unnumbered on purpose.

## Acceptance evidence

`node scripts/verify-rcap-grade-a-fulfillment-authority.mjs` — 64 checks.
`node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations` — 20
deliberate in-memory breakages, all caught, nothing written to disk.
`node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check` — the
registry, observation snapshot and projection all match their evidence.
