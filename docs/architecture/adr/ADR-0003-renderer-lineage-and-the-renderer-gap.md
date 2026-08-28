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

**The engines stay on the branch.** What remains is not renderer construction at
all — see Decision 2.

## Decision 2 — no pathway needs a renderer written.

The blocker is called `renderer_unavailable`. Its own statement says something
else:

> No packet artifact is produced for this route today (resolver refused:
> routeKind=guidance_only).

A resolver refusing to render a packet for a guidance route is working. Reading
that as a missing renderer produced a headline of 68 and would have produced
sixty-eight pieces of renderer work, almost none of which existed.

Decomposed against the memo's own `outputStrategy`, the launch graph's recorded
treatments, and the `factory_v2` registry's per-route build inputs:

| Classification | Pathways | What it really is |
|---|---:|---|
| `NO_TRACK_TO_RENDER_FROM` | 38 | No registry track, so no packet specification for any renderer to consume. The same bridge work counted elsewhere. |
| `GUIDANCE_ROUTE_MISCATEGORISED_AS_PAID` | 21 | The memo records `process_guidance`. The resolver is right and the `paid_packet_intended` categorisation is wrong. |
| `LEGACY_GENERATOR_OWNS_THIS_JURISDICTION` | 5 | `unmetBuildInputs` is empty and `factory_v2` declines only because a preserved legacy generator owns the jurisdiction. |
| `FACTORY_V2_ADMITTED_BUT_DELIBERATELY_SUPPRESSED` | 4 | `factory_v2` admits the route and a recorded treatment holds it closed on purpose. |
| **A renderer that has to be written** | **0** | |

The last class is the one that kept moving. It was published at 9, then at 5
once the launch graph's recorded suppressions were subtracted, and it is 0 once
the `factory_v2` registry is read rather than inferred from. All five remaining
candidates — two Mississippi routes and three Texas Chapter 55A expunctions —
carry `unmetBuildInputs: []` and `factoryV2Resolves: false` for one reason:
`legacyGeneratorOwnsThisJurisdiction: true`. Mississippi and Texas-Harris are
both on the AGENTS.md preserved list. `factory_v2` standing aside for them is
the division of work this repository decided on, not a gap in it.

The decomposition generator now fails if a pathway is counted as renderer work
while a preserved legacy generator owns its jurisdiction with every build input
met, or while a recorded treatment suppresses it. The zero is checked, not
asserted.

## Consequences

The largest engineering number in the Track B reconciliation goes to zero, and
21 pathways move out of the paid denominator entirely into non-packet service
outcomes — which is a coverage *correction*, not a coverage loss: those
routes were never going to sell a packet and should never have been counted as
though they might.

This is the third headline blocker in this workstream to be mislabelled
(`legal_review_pending` at 221, `renderer_unavailable` at 68, and the 40
no-track rows read as engineering gaps). The pattern is consistent enough to
state as a rule: **a blocker name is a hypothesis, and the generator that
emitted it is not the authority on what it means.** Check the emitter's own
statement and the upstream record before sizing work from a blocker count.

The rule applies to this ADR's own first answer. Decision 2 originally said
nine pathways needed a renderer, then five. Both were produced by subtracting
the causes I had thought to look for and calling the remainder renderer work.
A remainder is not a finding. The count only became trustworthy when every
class was reached by a positive test against a record that already held the
answer — and by then there was no remainder left.
