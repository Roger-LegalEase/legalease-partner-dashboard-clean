# Missing authoritative mapping — IL:felony-prostitution-relief

**Status: unreconciled. This is a missing mapping, not a product decision to
exclude the route.** Nothing here authorizes enabling it; it records what is
absent so the absence can be reconciled deliberately rather than inferred.

## What is established

`docs/RCAP_ROUTE_REACHABILITY.md` classifies this route **reachable and
sellable** and prints a witnessing public answer set. Reproduced against the
server-owned evaluator, `evaluateAuthoritativeScreeningResult` returns
`packet_ready` with `paymentAllowed: true` for that witness. The earlier sweep
that reported the route unsellable had followed a single preferred-answer path
whose answers say misdemeanor; the witness requires `offense_level: "Felony"`
and `possible_pathway_context: "Felony-prostitution relief"`.

The Grade-A fulfillment authority allows it when the bound track is supplied:

    packetFulfillmentAuthority("IL", "felony-prostitution-relief",
      "checkout creation", { trackId: "il-prostitution-j-vacate" })
    -> { allowed: true, record: { ... } }

The registry record `grade-a-il-felony-prostitution-relief-v1` binds route
`IL:felony-prostitution-relief` to track `il-prostitution-j-vacate`, family
`il-prostitution-j-vacate-set`, specification `il-felony-prostitution-relief@1.0.0`,
under `OWN-ADOPT-2026-09-02-BATCH-53`, with `artifactApprovalStatus:
counsel_reviewed_and_visually_verified` and `consumerPosture: open`.

## What is missing

`AUTHORITATIVE_TRACK_BY_PATHWAY` in
`src/lib/rcap-engine/composed-route-selector.ts` carries one row, the
Mississippi non-conviction route. With no row for Illinois,
`selectComposedRoute` answers `no_composed_route`, the authoritative result
carries `selectedTrackId: null`, and the authority is asked with no track:

    IL:felony-prostitution-relief (track none): Grade-A authority refuses
    checkout creation — exact track, family, provider or specification binding mismatch.

That module is the single authority on track identity and is documented as
reviewed, never inferred — a participant must not be able to name a track. So
the gap is closed by a recorded review that the compiled pathway and the
composed track are the same legal route, not by copying the pairing out of the
Grade-A record.

## Why it is not resolved here

This release freezes application `8d9382b93ada32adf9e50dd7f52680f4f9fb7018`.
Adding the row changes application bytes and would break the frozen candidate,
and the reconciliation is a legal-equivalence review rather than an
implementation choice. Illinois is therefore out of scope for this candidate
and open afterwards.

## What this does not license

Checkout and promotion-code handling carry no per-state branching, so the
sandbox discount coverage exercises shared code. **That is not transaction
proof for any jurisdiction whose own route has not transacted.** Coverage of
shared code and proof of a route are different claims.
