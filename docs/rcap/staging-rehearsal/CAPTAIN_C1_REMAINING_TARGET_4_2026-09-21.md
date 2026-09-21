# Captain decision — the hosted 402 probe reached the payment boundary and found a retired MS route

**Date:** 2026-09-21
**Decides:** the first real required failure of `hosted_full` run 35558992309,
dispatched on Captain SHA `bc90793d7` (Codex `c01851ac0` integrated)
**Status:** Captain decision and Codex handoff. Creates no approval, opens no
route, authorizes no production action.

## Target #3 is closed, and the owed proof was finally reached

`protected_final_verification_current` **passed hosted** at the corrected
`revision === 1`, exactly as the RPC computes it. The run then reached
`unpaid_render_returns_402` — **the first time any run has got there**.

## The failure

```
FAIL unpaid_render_returns_402 — A render of seeded unpaid item=403;
  reason=MS's legacy generator is retired as a commercial fulfillment path
  (ADR-0004). It renders for historical access and migration comparison only,
  and authorizes no checkout, sponsorship, credit or delivery.
```

This is **not** the payment boundary refusing. The render never reached payment:
the route resolved `legacy_retired` first, and `consumer-render-request.ts:316`
returns `route_not_renderable` before payment authority is consulted.

The same run's mapping case proved MS resolves **`factory_v2`**. Both are true,
and the difference between them is the finding.

## What actually differs

`buildRenderJobSpec` is reached two ways with different inputs:

| caller | `pathway` | `trackId` |
|---|---|---|
| the gate's mapping case | `MS_CHECKOUT.pathwayId` (canonical) | `MS_CHECKOUT.trackId` — **supplied by the harness** |
| the real render path | `verification.snapshot.pathwayId` | `verification.snapshot.selectedTrackId` — **derived from the participant chain** |

The fence at `packet-route-resolver.ts:733` is
`LEGACY_VERIFIED.has(jurisdiction) && !migration && !productization`, and
`factory-v2-registry.ts:734` returns no route when
`route.exactTrackSelectionRequired && !selectedTrackId`. So a track that does
not arrive as `ms-nonconv` puts MS back behind the ADR-0004 fence.

**The harness used to supply it.** The removed SQL seed wrote
`{ selectedTrackId: MS_CHECKOUT.trackId, … }` straight into `artifact_refs_json`
(gate line 795 before `aa6163e1d`), and the in-process preparation still injects
`artifactRefs: { selectedTrackId: MS_CHECKOUT.trackId, … }` at line 715 for the
mapping evidence. Every earlier hosted MS render cleared the fence on a value
the harness wrote. Removing the fabrication — which is what we asked for — is
what exposed this.

## What is established, and what is not

**Established:**

- the composed-route mapping **exists**:
  `["MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  { trackId: "ms-nonconv" }]` in `AUTHORITATIVE_TRACK_BY_PATHWAY`, with no
  `requiresDisposition`, so `selectComposedRoute` should return
  `{ status: "selected", trackId: "ms-nonconv" }`;
- `consumer_briefcase_items` has **no** `selected_track_id` column — the track
  lives only in `artifact_refs_json.selectedTrackId`;
- the render reads it from `verification.snapshot.selectedTrackId`, and the
  snapshot is built from `authority.authoritative.selectedTrackId`;
- hosted, the value reaching `buildRenderJobSpec` was not `ms-nonconv`.

**Not established — and I will not guess at it.** Where in
claim → `artifact_refs_json` → presentation authority → verification snapshot
the track is lost. A missing route mapping does **not** explain it; the mapping
is there.

**Correction, same day.** Earlier in this diagnosis I ran a probe and read
`selectedTrackId: null`, and began treating that as proof that the screening
evaluator emits no track. That probe read `prepareFixture()`'s `reviewed`
object, which is the gate's own preparation — not
`evaluateAuthoritativeScreeningResult`'s return value, whose shape is
`{evaluation, profile, pathwayLabel, packetType, selectedTrackId}` and does not
match the keys observed. The probe does not support that conclusion and it is
withdrawn. Nothing below rests on it.

## The repair, and its bounds — CODEX C1

The cause is not yet measured, so the target is **the measurement**, not a fix.
**Do not broaden the sweep, and do not change any resolver, mapping, fence or
snapshot behaviour to make this pass.**

**Do:** add the two values already in hand to the failing case's observation so
the next run prints which one is wrong. The gate already reads
`verification_snapshot as snapshot` into `protectedVerification`; include
`snapshot.pathwayId` and `snapshot.selectedTrackId` in the
`unpaid_render_returns_402` observation (and, if it is free to do so, in
`protected_final_verification_current`'s). One run then turns this from
inference into measurement.

**Do not:**

- re-introduce a harness-supplied `selectedTrackId` anywhere in the fixture
  path. That is the fabrication we just removed, and it would hide the finding
  again;
- change `composed-route-selector.ts`, `factory-v2-registry.ts`,
  `packet-route-resolver.ts`, the ADR-0004 fence, the verification snapshot, or
  any mapping or crosswalk row;
- relax `unpaid_render_returns_402` to accept a 403, or to accept the ADR-0004
  reason;
- touch the PA refusal contract, the MS fixture identity, the stored-row
  predicate, the 403 verification case, or any acceptance identity.

## For Roger — why this one is different

The three earlier targets were acceptance-harness defects. This one may not be.
Until the measurement lands, two readings are open, and they differ in
consequence:

1. **Plumbing loss.** The track is resolved correctly but dropped between the
   claim and the verification snapshot. An implementation defect on the real
   participant path, fixable without touching route authority.
2. **The real participant chain genuinely does not carry it.** Then MS — the
   route the fulfillment authority marks `commercially_eligible` — does not
   render through the real flow, and every prior hosted MS render passed only
   because the harness wrote the track. That is a Grade-A commercial question,
   not an engineering one, and it is **yours**, not Codex's.

I have not established which, and the difference matters too much to assert.
One thing I did check and cannot yet resolve either way: `checkout/route.ts:71`
handles an `error.routeKind`, so Checkout appears to have a route-kind refusal
path — but this run stopped before Checkout, so whether a participant could be
charged on a route that then refuses to render is **unproven in both
directions**. If reading 2 turns out to be the case, that question becomes
urgent; under reading 1 it does not arise.

Identities stay as they are: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`, Supabase `hyflxnlhpmiqxvvcoiia`.
No rebuild, republish, new Preview, Stripe retarget or production action is
authorized.
