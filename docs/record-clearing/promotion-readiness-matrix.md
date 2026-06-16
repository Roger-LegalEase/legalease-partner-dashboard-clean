# Record-Clearing Official PDF Promotion-Readiness Matrix

Generated: 2026-06-16

This is a docs-only planning matrix. It does not promote any jurisdiction or form, does not mark anything `replacement_candidate` or `verified_replacement`, does not mark anything renderer-ready, does not alter lifecycle fields, and does not wire any renderer or live route.

## Executive Summary

The current shadow baseline covers 26 jurisdictions: PA, DC, ND, OK, WY, MD, GA, FL, MN, MO, NV, NM, LA, ME, MA, MT, NH, OH, RI, SC, SD, UT, VT, WA, WV, and WI.

Every baseline jurisdiction has a state pack in `src/lib/rcap/state-packs/**`, but state-pack presence is not promotion readiness. Under the plan of record, the remaining gates are source fidelity/freshness, official-source confirmation where flagged, filled-data visual review, counsel confirmation, implementation review, and the live-route selector firewall.

The safest official-PDF vertical-slice candidate is Wisconsin CR-266/CR-267 because the state pack exists, the official PDFs are local, manual overlay drafts exist, and Roger Roman approved the overlay accuracy. Roger also visually approved the California, Colorado, and North Carolina overlay review packets staged in the current review inboxes; Colorado and North Carolina remain outside this 26-state shadow baseline matrix. Every approved map still remains `visual_review_required`, `lifecycle: "none"`, and `rendererReady: false`; Wisconsin still needs official-source/currentness confirmation and an explicit later implementation task before any renderer use.

## Current Coverage Count

| Metric | Count |
| --- | ---: |
| Shadow baseline jurisdictions reviewed | 26 |
| Baseline jurisdictions with state packs | 26 |
| Baseline jurisdictions with likely official blank PDFs locally | 22 |
| Baseline jurisdictions with no likely blank official PDFs locally | 4 |
| Baseline jurisdictions with at least one draft field-map review JSON | 16 |
| Baseline draft field-map review JSONs | 71 |
| Baseline visually approved draft maps | 2 |
| Baseline draft maps still `visual_review_required` | 71 |
| Baseline jurisdictions needing official-source confirmation before strategy/form use | 6 |
| Current review-inbox overlay packets visually approved by Roger | 26 |
| Current review-inbox overlay packets renderer-ready | 0 |

Status counts:

| Promotion-planning status | Count |
| --- | ---: |
| `shadow_only_ready_for_more_review` | 1 |
| `needs_visual_review` | 10 |
| `needs_manual_overlay` | 6 |
| `needs_official_source_confirmation` | 6 |
| `blocked_for_now` | 0 |
| `not_a_renderer_candidate_yet` | 3 |

## Top 5 Safest Future Vertical-Slice Candidates

These are candidates for more review only. None is renderer-ready.

| Rank | Jurisdiction/forms | Why safest relative to the rest | Required next gate |
| ---: | --- | --- | --- |
| 1 | Wisconsin CR-266 / CR-267 | State pack exists; local official PDFs exist; two manual overlay draft maps exist; Roger approved overlay accuracy. Small two-form surface. | Approved overlay; confirm Wisconsin official source/currentness, packet completeness, source hashes, counsel review, and implementation gate; keep renderer blocked. |
| 2 | North Dakota AR41 5f1 form family | State pack exists; local official PDFs exist; eight draft maps exist; queue identifies a clean AcroForm candidate for a controlled review target. | Run filled-data visual review on one clean candidate and resolve unknown field names. |
| 3 | Maryland CC-DC-CR-072A / CC-DC-CR-072B | State pack exists; local official PDFs exist; two draft maps have useful semantic signal and a narrow form family. | Resolve CC-DC-CR-148 and CC-DC-CR-072G2 scope/source questions before implementation planning. |
| 4 | Rhode Island motion/affidavit family | State pack exists; four similar draft maps exist, so one confirmed pattern may reduce review cost. | Visually review one representative form, then decide if the family can be batched. |
| 5 | Missouri EXPUNGEMENT FORM / filing sheet | State pack exists; local official PDFs exist; four draft maps exist and the queue shows useful confidence signal. | Resolve CR300 and CR375 source/scope gaps first. |

## Top 5 States/Forms Needing More Visual Review

| Rank | Jurisdiction/forms | Why it needs review |
| ---: | --- | --- |
| 1 | Pennsylvania official PDF drafts | Twelve draft maps exist, but no overlay approvals are recorded and Pennsylvania work is separately owned by the pleading/state-pack lane. |
| 2 | North Dakota AR41 5f1 drafts | Eight draft maps exist, including clean AcroForm candidates, but all remain `visual_review_required` and contain unresolved unknowns. |
| 3 | Rhode Island motion/affidavit drafts | Four similar drafts are promising but unapproved; one pattern review should precede any batching. |
| 4 | Vermont 200/400 series drafts | Six draft maps exist, but the queue shows mostly unknown-confidence inventory; use as review inventory only. |
| 5 | West Virginia SCA drafts | Four draft maps exist, but widget coverage is unknown-heavy and should stay behind source and visual review gates. |

## Blocked Items And Why

| Item | Block reason | Planning status |
| --- | --- | --- |
| Oklahoma | No official blank PDFs exist locally. Local statute/reference files support a statutory/custom pleading strategy, but do not prove from an official source that no statewide blank form exists. | `needs_official_source_confirmation` |
| Wyoming | Local handout/reference material supports petition/proposed-order drafting, but the handout is not a blank official form candidate and does not prove no statewide blank form exists. | `needs_official_source_confirmation` |
| Georgia | State pack exists, but the audit shows modeled/source material only and no likely blank official PDFs. | `not_a_renderer_candidate_yet` |
| Louisiana | State pack exists, but the audit shows modeled/source material only and no likely blank official PDFs. | `not_a_renderer_candidate_yet` |
| Massachusetts | Two draft maps exist, but the audit still flags a time-based expungement form confirmation gap and the queue notes two XFA-unsuitable PDFs. | `needs_official_source_confirmation` |
| Florida | Local PDFs are present, but generic `se (1)`-style filenames must be mapped to official titles/roles and the FDLE certificate application role remains unresolved. | `needs_official_source_confirmation` |

## States That Should Remain Shadow-Only

All 26 baseline jurisdictions should remain shadow-only for now. The following are especially not ready for official-PDF renderer implementation planning:

- Oklahoma and Wyoming: custom pleading/statutory strategy needs official-source confirmation; no blank official statewide PDF candidate is locally proven.
- Georgia and Louisiana: no likely blank official PDFs are locally present, so they are not official-PDF renderer candidates yet.
- DC: state pack and local PDFs exist, but no draft official-PDF map inventory exists in the current review set.
- Florida, Maryland, Massachusetts, and Missouri: official-source/form-scope gaps must be resolved before visual review can be treated as complete enough for implementation planning.
- Minnesota, Nevada, New Mexico, Montana, Utah, and Washington: official PDFs are local, but no field-map drafts exist in the current inventory.
- Pennsylvania, North Dakota, Maine, New Hampshire, Ohio, Rhode Island, South Carolina, South Dakota, Vermont, and West Virginia: draft maps exist, but no user overlay approvals are recorded and every draft remains review-blocked.
- Wisconsin: best next candidate, but still shadow-only because source/currentness/counsel and implementation gates remain open.

## Matrix

| Jurisdiction | Pack | Official forms | Draft maps | Approved | Visual required | Source/counsel flags | Complexity | Live risk | Status | Recommended next action |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| Pennsylvania | yes | yes, 14 PDFs | 12 | 0 | 12 | PA lane coordination; source freshness; counsel confirmation | high | high | `needs_visual_review` | Keep shadow-only and coordinate with the Pennsylvania pleading owner before any PDF review planning. |
| District of Columbia | yes | yes, 2 PDFs | 0 | 0 | 0 | source freshness; counsel confirmation | medium | high | `not_a_renderer_candidate_yet` | Do not select until an official-PDF target is explicitly chosen and mapped. |
| North Dakota | yes | yes, 9 PDFs | 8 | 0 | 8 | source freshness; counsel confirmation | medium | medium | `needs_visual_review` | Use one clean AR41 5f1 candidate for filled-data visual review. |
| Oklahoma | yes | no likely blank PDFs | 0 | 0 | 0 | official-source confirmation for statutory/custom pleading strategy | high | high | `needs_official_source_confirmation` | Confirm Oklahoma official source/currentness before treating custom pleading as final. |
| Wyoming | yes | no likely blank PDFs | 0 | 0 | 0 | official-source confirmation for custom pleading/local-template posture | high | high | `needs_official_source_confirmation` | Confirm Wyoming official source/currentness and local-template posture. |
| Maryland | yes | yes, 6 PDFs | 2 | 0 | 2 | official-source confirmation for CC-DC-CR-148 and CC-DC-CR-072G2 | medium | medium | `needs_official_source_confirmation` | Resolve form scope, then visually review CC-DC-CR-072A/B. |
| Georgia | yes | no likely blank PDFs | 0 | 0 | 0 | source strategy/process-guidance posture | high | high | `not_a_renderer_candidate_yet` | Keep as shadow-only/process-guidance planning. |
| Florida | yes | yes, 5 PDFs | 0 | 0 | 0 | official-source title/role confirmation; FDLE role unresolved | high | high | `needs_official_source_confirmation` | Normalize official metadata before any field-map task. |
| Minnesota | yes | yes, 10 PDFs | 0 | 0 | 0 | source freshness | high | medium | `needs_manual_overlay` | Generate review packets for EXP forms after source/currentness confirmation. |
| Missouri | yes | yes, 7 PDFs | 4 | 0 | 4 | official-source confirmation for CR300/CR375 | medium | medium | `needs_official_source_confirmation` | Resolve CR300/CR375 scope, then visually review EXPUNGEMENT FORM and filing sheet. |
| Nevada | yes | yes, 5 PDFs | 0 | 0 | 0 | source freshness; local/county guardrails | high | high | `needs_manual_overlay` | Define a narrow official-form route before generating maps. |
| New Mexico | yes | yes, 8 PDFs | 0 | 0 | 0 | source freshness | medium | medium | `needs_manual_overlay` | Generate first review packets after selecting a small form family. |
| Louisiana | yes | no likely blank PDFs | 0 | 0 | 0 | source strategy confirmation | high | high | `not_a_renderer_candidate_yet` | Do not treat as PDF renderer candidate until official blank forms are identified. |
| Maine | yes | yes, 3 PDFs | 1 | 0 | 1 | source freshness; counsel confirmation | medium | medium | `needs_visual_review` | Run filled-data visual review for CR-289 draft. |
| Massachusetts | yes | yes, 5 PDFs | 2 | 0 | 2 | time-based form confirmation; XFA-unsuitable PDFs | high | high | `needs_official_source_confirmation` | Resolve source/form role questions before deeper review. |
| Montana | yes | yes, 2 PDFs | 0 | 0 | 0 | source freshness | medium | medium | `needs_manual_overlay` | Confirm hybrid track and generate candidate packets only for selected route. |
| New Hampshire | yes | yes, 6 PDFs | 5 | 0 | 5 | source freshness; counsel confirmation | medium | medium | `needs_visual_review` | Pick one NHJB form for filled-data visual review. |
| Ohio | yes | yes, 5 PDFs | 1 | 0 | 1 | source freshness; local/court guardrails | high | high | `needs_visual_review` | Keep shadow-only; use cover-sheet draft only after route scope is confirmed. |
| Rhode Island | yes | yes, 4 PDFs | 4 | 0 | 4 | source freshness; counsel confirmation | medium | medium | `needs_visual_review` | Visually review one motion/affidavit pattern before batching. |
| South Carolina | yes | yes, 6 PDFs | 1 | 0 | 1 | source freshness; process-guidance split | high | high | `needs_visual_review` | Confirm process-guidance versus court-form route before deeper mapping. |
| South Dakota | yes | yes, 6 PDFs | 1 | 0 | 1 | source freshness; counsel confirmation | medium | medium | `needs_visual_review` | Review the case filing statement draft only with companion packet selection. |
| Utah | yes | yes, 12 PDFs | 0 | 0 | 0 | source freshness; separate state-pack lane | high | medium | `needs_manual_overlay` | Let state-pack work settle, then generate packets for smallest official subset. |
| Vermont | yes | yes, 7 PDFs | 6 | 0 | 6 | source freshness; high unknown inventory | high | medium | `needs_visual_review` | Use extraction as inventory; review one petition/order path after route selection. |
| Washington | yes | yes, 10 PDFs | 0 | 0 | 0 | source freshness; local-court guardrails | high | high | `needs_manual_overlay` | Coordinate with the state-pack lane before PDF mapping. |
| West Virginia | yes | yes, 5 PDFs | 4 | 0 | 4 | source freshness; unknown-heavy widgets | high | medium | `needs_visual_review` | Coordinate with state-pack lane, then review one SCA form. |
| Wisconsin | yes | yes, 6 PDFs | 2 | 2 | 2 | official-source/currentness confirmation; counsel confirmation | low | medium | `shadow_only_ready_for_more_review` | Approved overlay; record official source metadata and draft a shadow-only implementation plan in a later task. |

## Recommended Next 3 Codex Tasks

1. Wisconsin source-freshness packet: record official source metadata, hashes, revision dates, and packet-scope notes for CR-266/CR-267 without changing lifecycle or renderer wiring.
2. North Dakota visual packet refinement: generate or update one filled-data review packet for the clean AR41 5f1 candidate and document unresolved field-name decisions.
3. Rhode Island pattern review: choose one motion/affidavit draft, create a focused visual-review checklist, and identify reusable mapping patterns for the remaining RI forms.

## Recommended Next 3 Claude Tasks

1. Finish source-fidelity review for the recently added UT, VT, WA, WV, and WI state packs against the Nationwide materials, reporting gaps without renderer wiring.
2. Keep Pennsylvania pleading/state-pack fidelity work separate from this PDF matrix and confirm any PA official-PDF work would not conflict with the CustomPleadingRenderer lane.
3. For Washington and South Carolina, clarify process-guidance versus court-form output boundaries before any official-PDF renderer work is queued.

## Non-Promotion Statement

This matrix is planning only. It does not mark any jurisdiction or form as renderer-ready, `replacement_candidate`, or `verified_replacement`. It does not alter lifecycle fields, renderer configs, state packs, live routes, migrations, package files, private source files, or production behavior. Every draft map remains blocked unless and until a separate explicit task changes scope after source, visual, implementation, counsel, and live-route gates are satisfied.
