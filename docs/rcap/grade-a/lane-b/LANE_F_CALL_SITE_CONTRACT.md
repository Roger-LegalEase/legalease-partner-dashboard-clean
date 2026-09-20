# Lane F call-site contract — Grade-A commercial admission

**Lane:** B (Grade-A fulfillment hardening) · **Branch:** `claude/grade-a-68h-lane-b`
**Base:** `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`

Lane F wires the admission points. This is the whole interface it needs. There is
no second entry point, no fast path, and no argument through which a caller can
assert a conclusion — a consumer of this module can ask a question about a route
and a participant, and nothing else.

## The call

```ts
import { admitCommercial } from "@/lib/rcap/fulfillment/grade-a-admission";
import { routeIdFor } from "@/lib/rcap/fulfillment/grade-a-authority";
import type { FulfillmentRequestContext } from "@/lib/rcap/fulfillment/grade-a-request-context";

const decision = admitCommercial(
  "consumer_checkout",
  {
    routeId: routeIdFor(jurisdiction, pathwayId), // "ND:first-offense-possession-sealing"
    jurisdiction,                                  // "ND"
    packetFamilyId                                 // "rcap-nd-custom-pleading" | null
  },
  context // FulfillmentRequestContext, server-resolved
);

if (!decision.admitted) {
  return NextResponse.json(
    { error: participantCopyFor(decision.denialCode), resultCode: decision.denialCode },
    { status: HTTP_FOR[decision.denialCode] }
  );
}
```

Every field of both arguments is **server-resolved**. Route identity comes from
the screening evaluation or server-owned Briefcase metadata, exactly as `trackId`
already does in `packet-route-resolver.ts`. Context comes from the matter record,
the stage-8 verification snapshot, the payment or sponsorship record, and the
artifact store. None of it may originate in a request body.

If a route genuinely only has a body to work from, use
`admitCommercialFromUntrustedBody(point, body, context)`, which refuses any body
carrying an authority-bearing key rather than sanitising it and proceeding.

## The ten admission points and what each requires

| Admission point | Ownership | Final verification | Entitlement | Storage |
|---|---|---|---|---|
| `consumer_checkout` | ✓ | ✓ | — | — |
| `sponsored_entitlement` | ✓ | ✓ | ✓ | — |
| `packet_credit_admission` | ✓ | ✓ | ✓ | — |
| `generation_admission` | ✓ | ✓ | ✓ | — |
| `provider_dispatch` | ✓ | ✓ | ✓ | — |
| `artifact_commercial_attachment` | ✓ | ✓ | — | ✓ |
| `briefcase_ready` | ✓ | ✓ | — | ✓ |
| `private_download` | ✓ | ✓ | — | ✓ |
| `repeat_download` | ✓ | ✓ | — | ✓ |
| `launch_graph_commercial_status` | — | — | — | — |

`consumer_checkout` requires no entitlement because checkout is what *creates*
one. `launch_graph_commercial_status` requires no context at all: it asks whether
a route could be sold, with nobody in front of it, and making it depend on a
participant would make the launch graph depend on who is logged in.

## Side-effect ordering

The admission call goes **before the first irreversible act**, not before the
response. Concretely, per point:

| Point | Call `admitCommercial` strictly before | Never after |
|---|---|---|
| `consumer_checkout` | creating the Stripe Checkout Session | a session URL exists — the participant has seen a price |
| `sponsored_entitlement` | writing the sponsorship reservation | a sponsor's allocation is committed |
| `packet_credit_admission` | decrementing the partner's packet cap | a credit is spent that the partner cannot get back |
| `generation_admission` | enqueuing the render job | work is queued against a matter |
| `provider_dispatch` | handing the job to the worker | the worker holds participant data |
| `artifact_commercial_attachment` | marking the artifact deliverable | the Briefcase says a packet exists |
| `briefcase_ready` | transitioning the item to `packet_ready` | the participant has been told to expect a download |
| `private_download` | issuing the signed URL | bytes have left the building |
| `repeat_download` | issuing the second signed URL | as above |
| `launch_graph_commercial_status` | writing `operationallySellable` | a report claims a route is sellable |

Two orderings matter beyond "call it early":

1. **The route is judged before the participant.** A route that was never proven
   refuses identically for everyone, so no request-shaped probe can tell "your
   matter is wrong" from "this route was never proven" and learn something about
   another participant's state from the difference. Do not reorder your own
   checks so that a participant-specific error surfaces on an unproven route.
2. **`provider_dispatch` tolerates a spent entitlement; nothing else does.** The
   product contract requires a failed render to retry with the same idempotency
   key and without consuming another credit. So a re-dispatch on an
   already-consumed entitlement is admitted, and a second
   `packet_credit_admission` or `generation_admission` on the same one is not.
   Retry by re-dispatching, never by re-admitting generation.

## Denial codes

| `denialCode` | Meaning | Suggested HTTP | Participant sees |
|---|---|---|---|
| `fulfillment_no_record` | Nobody has written a record for this route. | 403 | "This isn't available yet." |
| `fulfillment_unsupported_route` | A record exists that this authority cannot evaluate. | 403 | As above. |
| `fulfillment_incomplete` | Proof is missing. `authority.missingProof` names each. | 403 | As above. |
| `fulfillment_stale` | Proof was obtained and no longer matches. `authority.stalenessReasons` names each. | 409 | "We're re-checking this route." |
| `fulfillment_revoked` | Withdrawn by a named authority. | 403 | "This isn't available yet." |
| `fulfillment_superseded` | A later record version decides. | 409 | Retry. |
| `fulfillment_schema_below_admission_minimum` | The record predates the fileability proof. | 403 | "This isn't available yet." |
| `route_binding_mismatch` | The record proves a different route, jurisdiction or family. | 403 | Generic refusal — never echo the other route. |
| `participant_context_denied` | The route is proven; this participant may not proceed. `contextDenials` names why. | 403, or 409 for a stale verification | Depends: see below. |
| `unknown_admission_point` | The caller named a point that does not exist. | 500 | Generic error; this is a bug. |
| `client_supplied_authority` | The body asserted authority. | 400 | Generic error. |
| `route_identity_required` | No `routeId`/`jurisdiction` to ask about. | 400 | Generic error. |

`participant_context_denied` is one code covering several situations, and
`decision.contextDenials` is what distinguishes them. **Do not put
`contextDenials` in a response body**: it names matter ids, owner ids and
verification state. Map its prefix to copy on the server:

| `contextDenials` prefix | Participant-facing meaning |
|---|---|
| `ownership:` | Sign in again, or this isn't your case. |
| `final_verification:` (invalidated) | "Your answers changed — we need to re-check before continuing." Preserve the payment. |
| `final_verification:` (other) | "Finish reviewing your information." |
| `entitlement:` | "We couldn't confirm your payment." Never "you already paid" without checking. |
| `storage:` | "Your packet isn't ready to download yet." |

## What a denial must not do

- must not fall back to a legacy generator;
- must not offer a price, a session, or an estimated ready time;
- must not consume a credit, reservation or idempotency key;
- must not mark a Briefcase item `packet_ready`;
- must not reclassify the route as guidance to make the refusal look intentional.

A route that cannot produce a Grade-A packet keeps its intended-paid
classification with an open blocker recorded against it. What is refused is the
charge and the delivery, not the pathway.

## Reading a route's status

For status pages, admin views and launch reporting, use the disposition rather
than the raw state:

```ts
import { routeDisposition } from "@/lib/rcap/fulfillment/grade-a-admission";
routeDisposition("ND:first-offense-possession-sealing"); // one of nine
```

The nine are `COMPLETE_PACKET_PROVEN`, `ARTIFACT_GENERATION_REQUIRED`,
`ARTIFACT_REVIEW_REQUIRED`, `SOURCE_OR_CONFIGURATION_GATE`,
`GUIDANCE_OR_AUTOMATIC`, `NOT_YET`, `FUTURE_EFFECTIVE`,
`ATTORNEY_OR_PARTNER_HANDOFF`, `UNKNOWN_FAIL_CLOSED`. The mapping is total and
deterministic, and a refused admission never reports `COMPLETE_PACKET_PROVEN`.

## What Lane F must not build

A second authority. If a rule you need is not expressible through
`admitCommercial`, that is a change to this module, not a check in a route
handler. Two places that decide commercial eligibility is the condition this
contract exists to remove, and the second one is always the one that gets it
wrong later.

## Current state, so nothing is a surprise

Every record in `data/rcap-grade-a/fulfillment-authority-registry.json` declares
schema `…/v1` and therefore **admits nothing at any point**, whatever its
evaluated state. Wiring these call sites today closes every commercial door in
the product. That is the correct fail-closed position and it is also a deployment
decision with an owner: see
`docs/rcap/grade-a/lane-b/CAPTAIN_PATCH_REQUEST.md`.
