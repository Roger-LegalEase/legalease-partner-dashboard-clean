# Expungement.ai flow audit — Phase 1 baseline

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529`
**Evaluation clock:** `2026-07-01` (pinned; waiting-period maths must not move with wall time)
**Product behaviour changed:** none. This phase reads.

## What the unit of a flow is

`state × remedy × terminal outcome × materially distinct audience/payment mode`.

dtc_paid and partner_sponsored_no_charge are separate rows only on a payment-eligible terminal, where money and packet delivery genuinely differ. On every other terminal the two audiences differ by CTA label alone (one shared branch in ScreeningResult.tsx) and the partner lane is carried on the single row as partnerLaneCta.

## Where the flow actually comes from

The repository holds more than one thing that looks like a flow definition. The runtime authority is not the file whose name suggests it is.

| Concern | Runtime authority |
| --- | --- |
| Consumer questions and their order | `src/lib/rcap-engine/compiled/all51.json` (the designer public profiles), composed by `src/lib/rcap-engine/public-profile-projection.ts`, served by `GET /api/expungement-ai/profiles/[state]` |
| Eligibility, remedy routing, waiting periods, exclusions | `src/lib/rcap-engine/compiled/profiles/*.json` evaluated by `src/lib/rcap-engine/evaluator.ts` |
| Packet family and form binding | `packetGenerator` inside each compiled profile, read through `src/lib/rcap-engine/packet-planner.ts` |
| Packet-information questions | `src/lib/expungement-ai/packet-information.ts` — synthesized from the packet plan's `requiredInputIds`, not from any profile |
| Review-page labels | hard-coded rows in `src/app/briefcase/[packetId]/review/page.tsx` |
| Payment | `src/app/api/expungement-ai/checkout/route.ts` and `src/lib/expungement-ai/payment-adapter.ts` |
| Sponsorship | `isPartnerSponsoredPacketItem` plus the `?session=` query verified by `isRcapPartnerScreeningSession` |
| Discount or promotion | none exists |
| Wilma help | `src/lib/expungement-ai/wilma-context.ts` — page-level context only |
| County and court data | none exists as a selectable dataset |
| Analytics | `src/lib/analytics/client.ts` with the shared denylist in `src/lib/analytics/sanitize.ts` |
| Launch flags | `src/lib/rcap/state-promotion-manifest.ts` per state; `RCAP_CONSUMER_DELIVERY_ROUTE_STATE` for the nationwide render path |

**The competing authority, named.** `src/lib/expungement-ai/frontend/profiles/all51.json` is 915 KB of jurisdiction profiles and is the file a reader would reach for first. It is **not** the runtime flow source. `profile-loader.ts` sets `USE_LIVE_PROFILE_ENDPOINT = true`, so the flow fetches `/api/expungement-ai/profiles/{state}`; the bundled file supplies the static jurisdiction index for the state picker and the Spanish display translations the projection merges in. The two disagree in size: Mississippi carries 5 questions in the bundled file and 39 in the profile the browser actually receives, of which 7 render as screens. Both are recorded in the manifest under `authorities`.

## The numbers

| Measure | Count |
| --- | --- |
| Jurisdictions | 51 |
| Compiled pathways (the remedy universe) | 325 |
| Flow rows | 622 |
| — remedy flows | 356 |
| — non-remedy terminal flows | 266 |
| Supported terminals | 90 |
| Unsupported terminals | 182 |
| Referral terminals | 350 |
| Question nodes (jurisdiction × question) | 2634 |
| — distinct question ids | 63 |
| — rendered as a consumer screen | 553 |
| — rendered by the packet-information builder | 257 |
| Branch edges | 2565 |
| Branch edges with a synthetic fixture | 2565 |
| Issues | 24 |
| — P0 / P1 / P2 / P3 | 3 / 12 / 7 / 2 |
| — global | 18 |
| — state-specific | 6 |
| — needing legal review | 2 |

### Terminal outcomes across all flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 182 |
| `needs_review` | 160 |
| `hard_stop` | 102 |
| `needs_more_info` | 55 |
| `packet_not_deliverable` | 54 |
| `packet_ready_with_caution` | 35 |
| `likely_not_eligible` | 25 |
| `not_yet` | 8 |
| `unsupported_jurisdiction` | 1 |

### Question purpose

Every question node carries exactly one purpose, decided in a fixed precedence order (escalation, then eligibility, then packet selection, then form binding, then redundant confirmation, then legal review, then not found).

| Purpose | Nodes |
| --- | --- |
| `supported_by_escalation` | 1145 |
| `supported_by_eligibility_rule` | 1111 |
| `purpose_not_found` | 219 |
| `supported_by_form_binding` | 108 |
| `human_legal_review_required` | 51 |

`redundant_confirmation` currently holds no node. That is not an omission: the precedence puts a rule consumer above a duplicate, and every duplicated fact in this product is also consumed by a rule. The duplicate pairs are still recorded on each node under `purposeEvidence.duplicateOfFactId` and are reported as `UX-GLOBAL-007` and its siblings.

## The Mississippi reference canaries

All twelve were treated as hypotheses about the whole product, not as Mississippi facts. All twelve reproduce, and all twelve are **global** rather than Mississippi-specific.

| # | Canary | Verdict | Scope | Issue |
| --- | --- | --- | --- | --- |
| 1 | A pre-rebuild matter loops between Open matter and Complete packet information. | reproduced statically | `GLOBAL_NAVIGATION` | `UX-GLOBAL-001` |
| 2 | Save This Matter and Continue provides no immediate pending feedback. | reproduced statically | `GLOBAL_SHARED_COMPONENT` | `UX-GLOBAL-002` |
| 3 | Save and continue lands in Briefcase rather than continuing. | reproduced statically | `GLOBAL_NAVIGATION` | `UX-GLOBAL-003` |
| 4 | A prescreen answer is asked again as though it were blank. | reproduced statically | `GLOBAL_FACT_MODEL` | `UX-GLOBAL-004` |
| 5 | Contact information is collected in one ambiguous unstructured field. | reproduced statically | `GLOBAL_FACT_MODEL` | `UX-GLOBAL-005` |
| 6 | County is free text instead of a state-aware selector. | reproduced statically | `COUNTY_DATA` | `UX-COUNTY-001` |
| 7 | Court is free text instead of a state/county-aware selector with manual fallback. | reproduced statically | `COURT_DATA` | `UX-COURT-001` |
| 8 | Full legal name is collected late and as one field. | reproduced statically | `GLOBAL_FACT_MODEL` | `UX-GLOBAL-006` |
| 9 | Current city duplicates the address. | reproduced statically | `GLOBAL_FACT_MODEL` | `UX-GLOBAL-007` |
| 10 | Raw internal values may appear on the review page. | reproduced statically | `GLOBAL_REVIEW_FORMATTING` | `UX-GLOBAL-008` |
| 11 | No visible discount-code entry exists before checkout. | reproduced statically | `GLOBAL_PAYMENT` | `UX-GLOBAL-009` |
| 12 | Wilma help is not consistently question-aware. | reproduced statically | `GLOBAL_HELP` | `UX-GLOBAL-011` |

Mississippi is not a special case in the code except in one place, and that place is itself the evidence: `packet-information.ts` carries a hand-written block for `MS` + `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` that copies four screening answers forward, derives two more, and rewrites three prompts. Every other state and pathway goes without it. The Mississippi review found these defects first because Mississippi is the state that has been looked at, not because Mississippi is broken differently.

## What the audit found that the canaries did not predict

### 19 jurisdictions reach no packet-ready outcome from the screens the flow renders

A deterministic best-first search over every rendered consumer screen, in every pathway-context option, across 28781 evaluations, reaches a packet-ready outcome in **32 of 51** jurisdictions and a payment-allowed outcome in **29**.

Not reaching packet-ready: `AZ`, `CA`, `CT`, `DC`, `FL`, `GA`, `IA`, `IN`, `KS`, `MI`, `MT`, `NJ`, `NM`, `OK`, `PA`, `RI`, `SC`, `SD`, `UT`.

The mechanism is a lifecycle classification, not a legal rule. `lifecyclePhaseForQuestion` in the public-profile projection decides prepay versus postpay by matching the question's text against regular expressions, and `phaseForWilmaFact` defaults every shared Wilma fact to postpay unless its state is on a hand-written allowlist. Facts the evaluator consumes before it will open a packet — `financial_obligations`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed`, `new_convictions_during_waiting_period` — land postpay in many states and are therefore never asked. The repository's own witness ledger does not see this because its fixtures seed those facts directly.

This is recorded as bounded evidence, not proof of impossibility: a search that did not find an answer set is not the same as no answer set existing. It is enough to require a per-state answer before any of those jurisdictions is called live for the paid path.

### The paid path and the launch gate are two different gates, and both are closed

14 flow rows would pass the deployed runtime's checkout guard. 4 of them are simultaneously marked `operationallySellable: false` by `data/rcap-ledger/launch-graph.json`, whose own counter reads `operationallySellable: 0` for all 284 intended-paid pathways. The unmet gates are governance, not code: owner legal-design approval, current technical approval, and proof of a deterministic artifact. Each flow row carries both facts under `paymentMode` and `launchGovernance` so nobody has to reconcile them by hand.

### Every state's public profile publishes other states' questions

`withWilmaFactQuestions` appends one shared list to all 51 jurisdictions. Mississippi's public profile therefore describes New York's CPL 160.59 conviction-counting questions and California's Proposition 64 questions. They are classified postpay outside their own state so they never render, but they are served.

### The slug form of the screening route is a dead end

`/expungement-ai/screening/mississippi` normalizes to `MISSISSIPPI`, matches no jurisdiction code, and renders the missing-profile screen. Only District of Columbia survives, because the normalizer special-cases it. No product surface links to a slug route today, but `data/rcap-ledger/public-witness-fixtures.json` records every fixture's `publicRoute` in exactly that unreachable form.

## Issues

### P0

- **UX-GLOBAL-001** — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
  - category `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`, 89 flow(s) across 21 jurisdiction(s)
- **UX-STATELAW-001** — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
  - category `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`, 228 flow(s) across 19 jurisdiction(s), **legal review required**
- **UX-GLOBAL-018** — The evaluator consumes facts before it will open a packet that the flow never asks for, so a browser cannot reproduce the repository's own recorded witnesses
  - category `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`, 2 flow(s) across 2 jurisdiction(s)

### P1

- **UX-GLOBAL-002** — Save this matter and continue performs two sequential network calls with no pending state on the button
  - category `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`, 581 flow(s)
- **UX-GLOBAL-003** — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
  - category `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`, 581 flow(s)
- **UX-GLOBAL-004** — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
  - category `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`, 89 flow(s)
- **UX-GLOBAL-005** — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
  - category `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`, 354 flow(s)
- **UX-COUNTY-001** — County is collected as free text with no state-aware selector and no controlled dataset behind it
  - category `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`, 102 flow(s)
- **UX-COURT-001** — Court is collected as free text with no state-aware selector and no controlled dataset behind it
  - category `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`, 356 flow(s)
- **UX-GLOBAL-008** — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
  - category `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`, 89 flow(s)
- **UX-GLOBAL-009** — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
  - category `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`, 41 flow(s)
- **UX-GLOBAL-011** — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
  - category `GLOBAL_HELP`, owner `PHASE_2_SHARED`, 622 flow(s)
- **UX-GLOBAL-012** — 3 sensitive question id(s) are asked with no helper text and no stated reason
  - category `GLOBAL_HELP`, owner `PHASE_2_SHARED`, 622 flow(s)
- **UX-LEGAL-001** — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
  - category `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`, 20 flow(s)
- **UX-GLOBAL-016** — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
  - category `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`, 581 flow(s)

### P2

- **UX-GLOBAL-006** — Full legal name is collected once, as a single text field, and only after the result and the save (`GLOBAL_FACT_MODEL`)
- **UX-GLOBAL-007** — Current city duplicates the address already requested inside contact information (`GLOBAL_FACT_MODEL`)
- **UX-GLOBAL-010** — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product (`GLOBAL_PAYMENT`)
- **UX-STATECFG-001** — Route-specific facts are asked of every participant in the state before the route is known (`STATE_CONFIGURATION`)
- **UX-GLOBAL-013** — The slug form of the screening route resolves to the missing-profile screen for 50 of 51 jurisdictions (`GLOBAL_NAVIGATION`)
- **UX-GLOBAL-015** — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one (`GLOBAL_SHARED_COMPONENT`)
- **UX-GLOBAL-017** — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title (`GLOBAL_REVIEW_FORMATTING`)

### P3

- **UX-CONTENT-001** — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer (`CONTENT_ONLY`)
- **UX-GLOBAL-014** — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected) (`GLOBAL_SHARED_COMPONENT`)

## Browser evidence

A local production build of this exact SHA was served on 127.0.0.1 and crawled with the repository's existing browser framework (Playwright chromium in a `.mjs` script writing an evidence directory — the same shape as `scripts/verify-expungement-commercial-browser.mjs`). No new vendor was added; `playwright@1.60.0` is already a direct dependency.

| Measure | Count |
| --- | --- |
| Flows crawled | 113 |
| Desktop captures (1440×1000) | 303 |
| Mobile captures (390×844) | 29 |
| Duplicate captures suppressed | 33 |
| Product browser errors | 0 |
| Environment browser errors (no analytics backend) | 0 |
| Redirect cycles detected | 0 |
| Terminals matching the manifest | 117 |
| Terminals diverging from the manifest | 4 |
| Flows where Back preserved a committed answer | 121 |
| Flows losing every answer on refresh | 121 |
| Analytics requests observed | 605 |
| Analytics requests carrying an answer value | 0 |
| Participant screens rendering a raw snake_case token | 0 |

The crawl drives each flow with that flow's own recorded fixture answers and compares the rendered terminal against the manifest. 117 of 121 agree. The 4 that do not are classified in `data/expungement-ai/flow-audit/crawl-divergence.json` by replaying the browser's own answers through the real evaluator: {"crawl_answer_differs":2,"evaluator_disagrees":2}.

What the crawl confirmed that source alone could not: Back preserves a committed answer, no raw internal value reaches the result card, no answer value leaves the browser through analytics, and a browser refresh discards every answer and restarts the flow at question one.

## Environment blockers

### ENV-001 — No staging environment exists for this session

No STAGING_BASE_URL, no Vercel preview, and no deployment SHA were supplied, and none is discoverable from the repository. The crawl therefore runs against a local production build (`next build && next start`) of the audit branch, served on 127.0.0.1. That is a substitute for the public, unauthenticated surface only.

- **Not exercised:** nothing beyond the substitute noted above
- **Consequence:** Every finding drawn from the crawl describes a locally built copy of this exact SHA rather than a deployed environment. Nothing in the audit asserts deployed behaviour.
- **Unblocked by:** A staging base URL and its deployment SHA.

### ENV-002 — No Supabase project, so no authenticated participant exists

The local build was given a syntactically valid but non-functional NEXT_PUBLIC_SUPABASE_URL and anon key so the client bundle could construct its auth client; there is no database behind them. Sign-in, session creation, matter persistence and every Briefcase read therefore cannot run.

- **Not exercised:** `/expungement-ai/sign-in`, `/briefcase`, `/briefcase/{matterId}`, `/briefcase/{matterId}/packet-information`, `/briefcase/{matterId}/review`, `POST /api/expungement-ai/screening/pending`, `POST /api/expungement-ai/screening/pending/claim`, `POST /api/expungement-ai/briefcase/{itemId}/packet-information`
- **Consequence:** Canary 1 (the Open matter / Complete packet information loop), canary 4 (a known fact re-asked), canary 5, 6, 7, 8, 9 (the packet-information fact model) and canary 10 (raw values on the accuracy review page) are established from source and from the derived manifests, not from a browser. Each is recorded with the exact file and line it was read from so it can be confirmed in one staging pass.
- **Unblocked by:** A staging Supabase project plus the four synthetic users the master plan names.

### ENV-003 — No Stripe test-mode configuration, so no checkout session can be created

STRIPE_SECRET_KEY is unset. POST /api/expungement-ai/checkout cannot reach Stripe, and the review page that hosts the checkout control needs an authenticated matter it cannot have (ENV-002).

- **Not exercised:** `POST /api/expungement-ai/checkout`, `Stripe Checkout redirect`, `POST /api/expungement-ai/payment/confirm`
- **Consequence:** Paid paths were tested statically: the checkout request contract, its five refusal branches, and the absence of any discount entry were read from source. No Stripe session was created, which is also what the Phase 1 prompt requires.
- **Unblocked by:** Stripe test-mode keys scoped to staging.

### ENV-004 — No sponsored partner or access code, so the sponsored lane cannot be entered

Partner mode is entered only through a ?session= query naming a server-verified RCAP partner screening session. Creating one needs a partner row, a slot, and a Supabase session.

- **Not exercised:** `/expungement-ai/screening/{state}?session={partnerSessionId}`, `/intake/{partnerSlug}`, `the sponsored packet generation lane`
- **Consequence:** The 41 sponsored flow rows in the manifest are derived from the evaluator plus the sponsorship branch in ScreeningResult.tsx and the checkout route's sponsored refusal. No sponsored packet was generated.
- **Unblocked by:** SPONSORED_TEST_PARTNER_SLUG and a staging access code.

### ENV-005 — No pre-rebuild legacy matter fixture can be created

The legacy-matter canary needs a persisted consumer_briefcase_items row whose artifactRefs carry no commercialFlow and whose paymentAllowed is false. That is a database row, and there is no database.

- **Not exercised:** `the legacy-matter loop reproduction`
- **Consequence:** The loop is established statically instead, from the guard mismatch between the matter page and the packet-information page and from commercialFlowForItem's null return. The exact fixture shape needed to reproduce it in a browser is written down in docs/expungement-ai/flow-audit/human-review-required.md so one staging pass can confirm or disprove it.
- **Unblocked by:** A staging database plus permission to insert one synthetic legacy matter.

### ENV-006 — Staging provisioning credentials are not available to this session

The single blocker behind ENV-001 through ENV-005. Staging is not a standing environment in this repository; it is provisioned by .github/workflows/rcap-hosted-acceptance-staging.yml, which reads GitHub Actions repository secrets this session cannot see.

- **Not exercised:** `every authenticated surface listed in ENV-002, ENV-003, ENV-004 and ENV-005`
- **Consequence:** The static audit is complete and the browser harness is complete and proven against a local build of the public surface. The authenticated half of the crawl waits on exactly this one grant.
- **Unblocked by:** The five secrets above, or a maintainer running that workflow on claude/expai-flow-audit-p1 and handing back the Preview hostname and its deployment SHA.
- **Missing credentials:** `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`
- **Platform:** GitHub Actions repository secrets on Roger-LegalEase/legalease-partner-dashboard-clean
- **Exact staging-only action it would authorize:** Run the rcap-hosted-acceptance-staging workflow against the audit branch to deploy one Vercel Preview of this exact SHA, apply migrations to the staging Supabase project, and seed the four synthetic users, the one synthetic partner, the four access-code states and 100 packet credits — after which the browser crawl can enter the authenticated Briefcase, packet-information, accuracy-review, checkout and sponsored surfaces.

## What the audit discovered about the environment

| Input | Discovered | Finding |
| --- | --- | --- |
| staging or preview URL | no | No standing staging environment exists. .github/workflows/rcap-hosted-acceptance-staging.yml provisions a Vercel Preview on demand and no hostname is recorded anywhere in the tree, so there is nothing to point a crawl at without running that workflow. |
| staging deployment SHA | no | Follows from the above: with no deployment there is no deployment SHA. The crawl instead records the SHA of the local build, which is the audit's own base SHA. |
| browser-automation command | yes | node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs |
| browser-testing framework | yes | playwright@1.60.0 chromium driven from .mjs scripts writing an evidence directory. Already a direct dependency; no new vendor was added. |
| authoritative county dataset | no | None exists. The only county material in the repository is prose guidance for three legacy states in src/lib/rcap/state-packs/{illinois,mississippi,pennsylvania}/county-court-instructions.ts, which itself says the system must not invent county-specific data. |
| authoritative court dataset | no | None exists. src/lib/rcap/state-packs/{illinois,mississippi}/court-routing.ts hold one general filing rule each; packetGenerator.filingDestinationRules is empty in the compiled profiles sampled. |
| synthetic-user creation or seeding tool | yes | scripts/rcap-hosted-acceptance-matrix.mjs creates GoTrue identities through POST /auth/v1/admin/users with a service key; scripts/f1-ephemeral-staging-stack.mjs does the same against a disposable local Supabase stack. Both need a Supabase project and a service-role key. |
| synthetic partner provisioning tool | yes | scripts/export-partner-seed-sql.mjs with supabase/partner-seed-demo.sql, verified by scripts/verify-rcap-partner-provisioning.mjs. Needs a database. |
| Stripe test-mode setup | yes | EXPUNGEMENT_AI_CHECKOUT_DRY_RUN=true opens a dry-run checkout in any non-production runtime (src/lib/expungement-ai/payment-adapter.ts). It is not the binding constraint: the dry run still needs an authenticated Briefcase matter. |
| sponsored-access fixture mechanism | yes | src/lib/partners/partner-access-codes.ts createPartnerAccessCode / setPartnerAccessCodeActive against supabase/phase-41-rcap-partner-access-codes.sql. Needs a database. |

Local protected configuration lives at `~/.config/legalease/expai-flow-audit.config` and `~/.config/legalease/expai-flow-audit.env`, outside the repository and uncommitted. The three generated synthetic secrets exist and authorize nothing, because no environment accepts them. No value from either file appears in any committed artifact.

## Phase 3 shards

Six disjoint shards, balanced by measured workload rather than state count. Spread between the lightest and heaviest shard: **9.16%** against a 20% target.

| Shard | Jurisdictions | Flows | Question nodes | Branch edges | Weight | States |
| --- | --- | --- | --- | --- | --- | --- |
| SHARD-1 | 9 | 95 | 468 | 497 | 1846.5 | AZ CA MT NC NE NY OR TN WI |
| SHARD-2 | 9 | 106 | 462 | 424 | 1830.5 | AL FL HI IA MI ND NV RI TX |
| SHARD-3 | 8 | 114 | 414 | 406 | 1694 | IN MA MN MO MS OK SC VA |
| SHARD-4 | 8 | 92 | 423 | 441 | 1692.5 | AK DC MD ME NM SD WA WY |
| SHARD-5 | 8 | 95 | 412 | 360 | 1691.5 | AR CO GA KS OH PA UT WV |
| SHARD-6 | 9 | 119 | 455 | 437 | 1839 | CT DE ID IL KY LA NH NJ VT |

## How to regenerate every artifact in this report

```bash
node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs
node scripts/expungement-ai/flow-audit/build-question-inventory.mjs
node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs
node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs
node scripts/expungement-ai/flow-audit/detect-static-defects.mjs
node scripts/expungement-ai/flow-audit/build-issue-register.mjs
node scripts/expungement-ai/flow-audit/build-shard-assignment.mjs
node scripts/expungement-ai/flow-audit/build-reports.mjs
node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
```

Every generator accepts `--check`, which fails if the committed artifact is stale or non-deterministic.
