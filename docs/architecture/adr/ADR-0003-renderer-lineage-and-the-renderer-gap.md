# ADR-0003 — Renderer lineage, and what `renderer_unavailable` actually names

**Status:** Accepted.
**Date:** 2026-08-28
**Authority:** `docs/PRODUCT_CONTRACT.md`; `data/rcap-ledger/renderer-gap-decomposition.json`

## Decision 1 — `factory_v2` is the successor. The branch engines are not ported.

`feat/record-clearing-production-integration` carries a twelve-file packet-engine
layer under `src/lib/rcap/packets/engines/` that mainline does not have. That
looked, at first, like the newer work stranded on an unmerged branch — the
failure this repository has produced five times before.

It is the opposite, and the dates settle it:

| | |
|---|---|
| Branch engines last touched | **2026-08-09** |
| `factory-v2-registry.ts` and `packet-document-renderer.ts` land in mainline | **2026-08-10** |
| `factory_v2` wired into the authoritative resolver | **2026-08-19** |
| Mainline `src/lib/rcap/documents` last touched | **2026-08-26** |

The branch carries no `factory_v2` at all, so it forked before the successor
existed. The engines were never in mainline history, so nothing was removed from
mainline to make room. Porting them would move the renderer backwards by
seventeen days and reintroduce a per-jurisdiction engine layer that one shared
factory replaced.

**The engines stay on the branch.** The remaining renderer work is wiring routes
to the shared `factory_v2` renderer.

## Decision 2 — 68 pathways do not need a renderer. Nine do.

The blocker is called `renderer_unavailable`. Its own statement says something
else:

> No packet artifact is produced for this route today (resolver refused:
> routeKind=guidance_only).

A resolver refusing to render a packet for a guidance route is working. Reading
that as a missing renderer produced a headline of 68 and would have produced
sixty-eight pieces of renderer work, most of which would have been wrong.

Decomposed against the memo's own `outputStrategy`:

| Classification | Pathways | What it really is |
|---|---:|---|
| `NO_TRACK_TO_RENDER_FROM` | 38 | No registry track, so no packet specification for any renderer to consume. The same bridge work counted elsewhere. |
| `GUIDANCE_ROUTE_MISCATEGORISED_AS_PAID` | 21 | The memo records `process_guidance`. The resolver is right and the `paid_packet_intended` categorisation is wrong. |
| `PACKET_INTENDED_BUT_ROUTE_RESOLVES_TO_GUIDANCE` | **9** | The memo records a packet strategy and the runtime says guidance. Memo and runtime disagree. **This is the renderer work.** |

## Consequences

The largest engineering number in the Track B reconciliation shrinks from 68 to
9, and 21 pathways move out of the paid denominator entirely into non-packet
service outcomes — which is a coverage *correction*, not a coverage loss: those
routes were never going to sell a packet and should never have been counted as
though they might.

This is the third headline blocker in this workstream to be mislabelled
(`legal_review_pending` at 221, `renderer_unavailable` at 68, and the 40
no-track rows read as engineering gaps). The pattern is consistent enough to
state as a rule: **a blocker name is a hypothesis, and the generator that
emitted it is not the authority on what it means.** Check the emitter's own
statement and the upstream record before sizing work from a blocker count.
