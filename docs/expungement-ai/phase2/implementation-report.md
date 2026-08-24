# Expungement.ai — Phase 2 implementation report

Product base `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926`. Head `05bc9d24c501bb8f9681c4d150fe686c0d76b5ef`. Evaluator clock pinned to `2026-07-01`.

## What was implemented

| Issue | Severity | What changed |
| --- | --- | --- |
| UX-GLOBAL-001 | P0 | Open matter and Complete packet information no longer loop. One availability predicate, shared by both pages, and a refusal names which condition refused. |
| UX-GLOBAL-013 | P0 | Waiting-rule selection consults an explicit pathway-to-rule binding first. The pre-correction prose selector stays verbatim as the fallback for a route with no binding, because it is answer-dependent and replacing it wholesale closed six jurisdictions that were open at the base. |
| UX-GLOBAL-019 | P0 | Facts the evaluator consumes before it will open a packet are asked on a rendered screen. No fact is silently defaulted to post-payment. |
| UX-GLOBAL-002 | P1 | The save action reports its own progress and cannot be double-submitted across its two sequential POSTs. |
| UX-GLOBAL-003 | P1 | Claiming a pending result lands on the matter's next action, computed from the same availability predicate. |
| UX-GLOBAL-004 | P1 | One canonical fact store. The packet questionnaire asks only for facts screening did not already collect. |
| UX-GLOBAL-005 | P1 | Contact information is a structured mailing address, phone and email, each validated, each with its own review row. |
| UX-GLOBAL-008 | P1 | One human formatter for every answer value, shared with the questionnaire's own option labels. |
| UX-GLOBAL-009 | P1 | The checkout surface states the code policy and routes a participant told their packet is covered to help. |
| UX-GLOBAL-011 | P1 | Wilma is told which question is on screen, with the participant's answer deliberately excluded. |
| UX-GLOBAL-012 | P1 | Sensitive questions say why they are asked and who sees the answer. |
| UX-GLOBAL-017 | P1 | A browser refresh no longer discards the screening answer set. |
| UX-GLOBAL-014 | P2 | Blocks a supported flow: the slug form of the screening route resolves for all 51. |
| UX-GLOBAL-018 | P2 | Blocks a required acceptance test: the two packet-ready outcomes are distinguishable, and the card declares its own result code. |

Every global P0 and every global P1 in the Phase 1 register is implemented. Two P2s are implemented because each blocks something the scope names: UX-GLOBAL-014 blocked a supported flow, and UX-GLOBAL-018 blocked a required acceptance test — the browser crawl could not tell a cautioned packet-ready result from a clean one.

## What the evaluator does differently

8 output differences measured across the 51-jurisdiction baseline, 0 unexplained.

| Jurisdiction | Field | Before | After |
| --- | --- | --- | --- |
| FL | resultCode | "needs_review" | "packet_ready_with_caution" |
| FL | paymentAllowed | false | true |
| IA | resultCode | "needs_review" | "packet_ready_with_caution" |
| IA | paymentAllowed | false | true |
| PA | resultCode | "needs_review" | "packet_ready_with_caution" |
| PA | paymentAllowed | false | true |
| SD | resultCode | "needs_review" | "packet_ready_with_caution" |
| SD | paymentAllowed | false | true |

No decision graph, packet family or form set changes in any of the 51. Rendered screen counts move in 51 jurisdictions, by 2 to 6 screens, which is the shared facts now being asked.

One further change does not appear in that table, because the baseline sweep supplies a timing bucket and so never reaches it. Maryland's § 10-110 route returned `needs_more_info` with `md.waiting_anchor_missing` and now returns `needs_review` with `md.configuration_missing`. Same pathway, same terminal class, same paymentAllowed false: at the product base, supplying either bucket value produced `needs_review` with `md.waiting_rule_not_executed`, so the question the participant was asked first could not change the outcome. It is recorded in the Maryland control fixture and proved by `scripts/verify-rcap-md-pardon-pathway.mjs`.

The correction allowlist is `data/expungement-ai/phase2/correction-allowlist.json`. A difference outside it is a failure, not a finding.

## The thirteen corrected routes

Replaying the same participant the Phase 1B reconciliation used for E3 and E4, with no `waiting_rule_id` override so each route resolves its own binding:

- 13 routes replayed
- 13 moved from `needs_review` to `packet_ready_with_caution`
- 12 opened payment; 0 closed it
- 0 changed pathway
- 0 errored

South Carolina reaches a packet-ready terminal without payment opening, because its clamp is not this correction's to move.

## What is held

- **KS** — HELD_FOR_LEGAL_DECISION. Terminal needs_review → needs_review; payment false → false.
- **NJ** — HELD_FOR_LEGAL_DECISION. Terminal needs_review → needs_review; payment false → false.
- **RI** — HELD_FOR_LEGAL_DECISION. Terminal needs_review → needs_review; payment false → false.
- **UT** — HELD_FOR_LEGAL_DECISION. Terminal guidance_only → guidance_only; payment false → false.
- **CA** — HELD_FOR_CORRECTION. Terminal packet_ready_with_caution → packet_ready_with_caution; payment true → true.
- **IN** — HELD_FOR_CORRECTION. Terminal needs_review → needs_review; payment false → false.
- **TX** — PAYMENT_CLAMP_PRESERVED. Terminal guidance_only → guidance_only; payment false → false.
- **WA** — PAYMENT_CLAMP_PRESERVED. Terminal needs_review → needs_review; payment false → false.
- **WV** — PAYMENT_CLAMP_PRESERVED. Terminal needs_review → needs_review; payment false → false.

None is backfilled. Two hold continuity bindings transcribed from what the prior selector already chose, which is preservation, not a guess.

## What the packet questionnaire stopped asking

Across all 325 packet-producing pathways, 1401 questions are no longer put to a participant who already answered them. Every pathway asks fewer; none asks anything new; the required-input and pre-payment validation sets are byte-identical.

## The verification sweep

The audit's own deterministic generators were re-run at this head and snapshotted under `data/expungement-ai/phase2/post-implementation/`. The Phase 1 artifacts are untouched: they are the baseline.

Bounded UI reachability — can a participant reach packet-ready answering only the screens the flow renders:

- reaching packet-ready: 32 of 51 → 43
- reaching payment: 29 of 51 → 40
- recovered: AZ, CT, DC, FL, GA, IA, MI, MT, NM, OK, PA, SC, SD
- not found at this head: NH, WV

NH and WV are both in the allowlist with their evidence. New Hampshire's packet-ready answer set still returns packet_ready_with_caution when replayed at this head — the greedy sweep settles in a local optimum now that more screens are rendered. West Virginia's route reports that it cannot execute its waiting rule, now that the anchor date is asked; its payment clamp is preserved and was already closed.

31 of 625 recorded witness fixtures no longer reproduce their flow's terminal. Twelve are the corrected routes opening; eighteen return needs_more_info because the flow now asks for facts the fixture predates; one is the same staleness in Vermont. `data/rcap-ledger/` is not this correction's to regenerate.

## Guards added

- `scripts/expungement-ai/phase2/verify-expungement-fact-model.mjs` — waiting-rule bindings resolve and author no duration; shared facts declared prepay are rendered or answered by a declared substitute; the rendered flow and the evaluator reach the same decision; every machine-shaped option value has a human label; the canonical derivations and contact parts hold. Removing the two shared-fact declarations it guards produces 102 failures.
- `scripts/expungement-ai/phase2/verify-jurisdiction-slug-routes.mjs` — all 51 resolve by slug, name and code.

## What was deliberately not built

- **UX-COUNTY-001** (P1, state_specific) — State-specific: needs a controlled county dataset per state.
- **UX-COURT-001** (P1, state_specific) — State-specific: needs a controlled court dataset per state.
- **UX-GLOBAL-006** (P2, global) — Structured name parts change what is bound into a petition caption and where identity is collected in the flow. Neither is a release blocker and both need the packet-binding review this sprint does not carry.
- **UX-GLOBAL-007** (P2, global) — Resolving the city duplication means deriving the city from the structured address the contact split now collects. That is the natural follow-on, and it changes a value bound into packets, so it waits for the same binding review.
- **UX-GLOBAL-010** (P2, global) — A consumer entry point for sponsorship is a payment-authority change. The checkout surface now states the code policy and routes anyone told their packet is covered to help, which closes the dead end without touching payment authority.
- **UX-STATECFG-001** (P2, state_specific) — Conditional rendering of route-specific questions changes which screens a participant sees per state and needs the per-state work in the shard prompts.
- **UX-STATELAW-001** (P1, state_specific) — State-specific legal work across 19 jurisdictions; the shard prompts carry it.
- **UX-CONTENT-001** (P3, state_specific) — Content-only. No flow is blocked.
- **UX-GLOBAL-015** (P3, global) — Cross-state question leakage in the public payload is a compiler-side change to all 51 profiles.
- **UX-GLOBAL-016** (P2, global) — Making the contextOnly label and the routing behaviour agree is a change to pathway selection, which is a legal-route decision rather than a presentation fix.
- **UX-LEGAL-001** (P1, state_specific) — Requires legal review. Not safe for automatic implementation.

Full record with the Phase 1 detail: `data/expungement-ai/phase2/p2-p3-backlog.json`.

## Phase 3

Six disjoint state shards covering all 51 jurisdictions are regenerated from this head at `docs/expungement-ai/phase2/shard-prompts/`. Each shard owns only its own compiled profiles and state packs; the Phase 2 shared layer is prohibited to all of them.
