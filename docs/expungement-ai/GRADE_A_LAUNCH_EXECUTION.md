# Grade A launch execution

Controlling plan: `ExpungementAI_Captain_Handoff_v2/01_Grade_A_Launch_Build_Plan.md`.
Everything else — old prompts, blocker ledgers, audits, verifier reports,
source-recovery reports, finish queues — supplies facts, not missions.

**Rule: every active task names a Build Plan section. If it cannot, it goes to
POST_LAUNCH_BACKLOG, unless it proves a defect that stops the intended launch
product working correctly.**

Release candidate: `captain-release` @ `ab85fe519` (local; 13 commits unpushed,
push held by owner instruction).

## Scope gate — answer before any item becomes active

- **A.** Which Build Plan item does this close?
- **B.** What customer or release defect does it fix?
- **C.** Is it necessary for the intended launch product? If no → backlog.
- **D.** What is the smallest change that closes it?

A failing test alone is not sufficient.

## Phases and states

States: `ACTIVE` · `READY` · `EXTERNAL BLOCKER` · `DONE`.
WIP limit: **3 implementation lanes**. Captain owns integration and shared files.
One writer per shared file. No verifier-governance lane, no ledger-reconciliation
lane, no agent swarm.

| # | Phase | Plan §  |
|---|---|---|
| 1 | Shared document foundation | 4 |
| 2 | Packet-information UX | 6 |
| 3 | Nationwide document remediation | 5 |
| 4 | Supplemental renderer | 7 |
| 5 | Integrated acceptance | 9 |
| 6 | Build / deploy / launch | 10 |

## Active

| Item | Phase | State | Note |
|---|---|---|---|
| GA-5-TOKENS unresolved caption tokens on filed documents | 3 | `READY` | 11 of 28 rendered documents print `{courtLevel}`, `{county}`, `{caseNumber}` etc. in captions. **Contained**: all 11 are CT/KY/VT/WV, which hold zero Grade-A records; every row is UNFINISHED or MAINTENANCE_HOLD, not sellable, not admitted. Per-config repair in Phase 3 |
| ND visual review — `STALE / RE-REVIEW REQUIRED` | 3 | `READY` | Bound to 1.x bytes; both ND packets are 8 pages at renderer 2.0.0. Ordinary ND acceptance work, not a separate workstream. ND is already noncommercial, so it blocks nothing else; it must complete before the corrected ND packet can be Grade-A deliverable again |
| ND output legal review — `STALE / RE-REVIEW REQUIRED` | 3 | `READY` | Same binding, same phase, same condition |
| `dc-correct-misattributed-arrest` has a specification but no packet plan | 3 | `READY` | The one specification of nineteen whose pathway the planner cannot plan, so collection has nothing to ask. DC is noncommercial on this route; repair with the DC rows in Phase 3 |
| GA-5-MS reapply the reverted `routeKeys` binding fix | 3 | `ACTIVE` | 132C. Reverted earlier to hold `rebuildRequired:false`; that is no longer the accepted end state |
| GA-5-OR Oregon `caseMode` unresolved | 3 | `READY` | Moved here from 4.2 by owner instruction. The authority does not say whether the set-aside opens a new case or files into the existing one; the value stays `unresolved` and the component stays non-releaseable. Not a shared-contract question, and `existing_case`/`new_case` is not to be invented for it |
| GA-6.2 real browser packet-information journey | 2 | `ACTIVE` | Anonymous half done (see Done). The authenticated half — builder, save/resume, Review/Edit, activated conditional cases, no surprise post-payment intake — needs a hosted origin and an account; see External blockers |
| GA-6.2-ES filing-readiness copy has no Spanish | 2 | `READY` | `route-product-metadata.json` carries 354 filing-readiness and external-document strings as plain strings with no `translations.es`; only the ones whose exact English happens to sit in `EXPUNGEMENT_COPY` resolve. Some are enum tokens the copy audit miscounts (`guidance_only`), but participant-visible instructions such as "File the TF-810 request at your local Alaska trial court" are genuinely English-only. §6.2 exit condition names this ("no English-only fallback"); sizing it is a translation task across jurisdictions, not a browser-acceptance fix, and the strings name forms, courts and procedures, so they are not to be machine-translated |

## External blockers

| Item | Phase | Exact action needed | From |
|---|---|---|---|
| GA-5-CA 1203.4a output legal approval | 3 | Grant or refuse the output legal approval; `approval-request.json` is `REQUESTED`, `grantedBy: null` | Roger / counsel |
| GA-5-KYWV successor answers (1/122) | 3 | Re-review owner answers against successor compiled-profile bytes | Counsel / owner |
| GA-5-41 six pathway adjudications | 3 | Individual commercial classification for MA, NE, NJ, NV, OR, SD | Roger |
| GA-8-127 nine patch successors + CA carrier | 3 | Adopt successor bytes; authorize re-freezing the correction assignment | Roger |
| GA-8-22E1 corpus mount | 3 | Master Library (28 sources) + complete 583-file Nationwide package at their declared paths | Source custodian |
| GA-10 push target and hosted-acceptance token role | 6 | Resolve branch target; grant Auth Config read-write on `hyflxnlhpmiqxvvcoiia` | Roger |
| GA-6.2 authenticated journey credentials | 2 | A hosted origin plus `DTC_BROWSER_BASE_URL` / `DTC_BROWSER_EMAIL` / `DTC_BROWSER_PASSWORD` so `verify-expungement-commercial-browser.mjs` can run. Everything past the claim needs a Supabase account; the anonymous half runs locally with no credentials | Roger |

## Done

| Item | Phase | Evidence |
|---|---|---|
| GA-4.1 one authoritative route definition | 1 | Already correct. `packetPlanForPathway` derives required inputs from the packet specification (`packetSpecificationRequiredFactIdsFor`); mutation-proven on a registered and an unregistered spec. No duplication to remove, and no control added — a parity check between them cannot fail |
| GA-4.3 cross-jurisdiction presentation fallback removed | 1 | 13 configs now refuse; PA byte-identical 3/3; 190 checks |
| GA-4.4 product branding removed from court-facing documents | 1 | renderer 1.0.0 -> 2.0.0; QA rule inverted; ND footer now audience-driven |
| GA-4.2 shared document contract | 1 | 12 attributes on all 76 documents across 19 specifications, populated from `legal-design-packet-set-manifests.json`; consumed by the renderer and refused at the fulfillment boundary; 203 checks, four invariants each mutation-tested. Oregon `caseMode` moved to Phase 3 as a route question |
| GA-6.2 anonymous journey in a real browser, four ways | 2 | `verify-expungement-anonymous-journey-browser.mjs`, run against a local dev server. The original Mississippi non-conviction route completes identically desktop/English, on a 390px phone (0px horizontal overflow), keyboard-only, and in Spanish. The free check asks **7** option-only questions, **0** free-text or date controls, **0** exact packet facts, and never requests checkout; the priced result states $50 and that the facts are verified before payment. Two English-only fallbacks found and fixed: no language control on any inner surface, and six result lines — including the price and the payment sequence — that stayed English in Spanish. Both mutation-proven to fail the check |
| GA-6.1 no required participant-owned render fact after Checkout | 2 | **0 nationwide.** 538 checks in `verify-rcap-prepurchase-render-facts.mjs`: 13 reachable routes with a registered specification, 172 participant-owned specification facts, all in the pre-Checkout gate or excused with a recorded disposition (MS non-conviction excuses 5, all `derived`). Two route-level mutations proven to fail the check. No product change was warranted — see below |
| Memo lineage restoration (32) | — | `e1834aac7`; sweep step 154 |
| Resolution-lane sidecar (33) | — | `d01cc0e30`; steps 155, 158 |
| Per-question out-of-scope reasons (36B) | — | steps 164, 165 |
| Authority-derived hardening expectation | — | step 254 |
| Verifier register re-observed | — | `11fe14d0f`; 513-script audit |

## GA-6.1 — correction to an earlier report

An earlier report of this lane said Georgia's required `arrest_date` "can remain
post-pay". That was read off the question-lifecycle label, and the label does not
mean what it appears to mean. **`postpay_*` names the section of the guided
journey a question belongs to. It does not decide when money may move.**

The Checkout boundary is a different, stricter gate:

```
POST /api/expungement-ai/checkout
  -> requireCurrentPacketVerification            payment-adapter.ts
  -> verified only when verify === true AND missingInputIds is empty
                                                 packet-information.ts
  -> missingInputIds = collectionGateInputIds() = prepayGateFactIds()
  -> prepayGateFactIds = EVERY fact the participant still owes,
     render-required and filing-readiness included
                                                 packet-collection.ts
```

A fact leaves that gate only by ceasing to be the participant's to answer — the
server owns it, it follows deterministically from another answer, another actor
fills it later, or its own condition says it does not apply — and each of those
keeps a recorded disposition. So Georgia's `arrest_date` is resolved before
Checkout; it is classified `prepay_confirmation` on the pardoned-felony route and
is in the gate on both Georgia routes.

Measured, route by route, against each route's **own** registered specification
(never jurisdiction-wide — one jurisdiction's specifications describe different
packet families, and joining them wholesale produced a false 144-fact gap):

- participant-owned specification facts absent from the route's packet plan: **0**
- in the plan but escaping the pre-Checkout gate: **0**
- `DC:dc_correct_misattributed_arrest` has no compiled runtime pathway, so no
  participant can select it; it is the Phase 3 row above, not a gate escape.

No product edit was made, because none moved the measured result. What was added
is the check that makes the invariant executable, and a comment at
`requiredMissingPublicQuestionIds` naming where the real gate is — that function
deliberately ignores required post-pay questions, and nothing said why that was
safe, which is what made the label misleading in the first place.

## Post-launch backlog

One sentence each. No investigation beyond bucket assignment.

- Tracked Python bytecode cache `scripts/rcap-packet-recovery/__pycache__/*.pyc` dirties the tree on every Python test run.
- Price-surface mutation is honestly `undetected`; re-aim it when next in that file.
- `verify-rcap-session-13-terminalization.mjs` rewrites tracked files when run (now `quarantine`).
- The `postpay_*` question-lifecycle names and `postPaymentPacketCompletion` read as a payment boundary but are a journey-section boundary; renaming them would touch a public contract union and is not launch-affecting.
- `missingProductFactIds` in the evaluator is a Wisconsin-only hardcoded precondition list where a route-contract lookup would do.
- `scripts/test-expungement-checkout-guards.mjs` cannot resolve `@/lib/server-runtime-environment` through its own mock map and fails on a clean tree; it is in the `npm test` chain.
- `data/expungement-ai/reports/plain-language-copy-audit.json` was generated on 2026-07-01 against a different tree (branch `unknown`); regenerating it moves ~8.6k lines, so its counts should not be quoted until it is refreshed deliberately.
- The route's own legal label ("Non-conviction expungement for dismissal, no disposition, or acquittal") stays English on the Spanish result; translating the name of a statutory path is a legal-copy decision, not an interface one.
- `court_requirements_completed` renders its optional badge with no separator, so its accessible name reads "...in this case?OPTIONAL" / "...este caso?OPCIONAL".

## Owner-only decisions

1. Reduce intended launch coverage.
2. Production promotion or production-risk actions not already authorized.
3. Change the Build Plan's definition of done.

Routine implementation choices are the Captain's.

## Commit convention

`GA-<section> <what changed>` — e.g. `GA-4.3 remove cross-jurisdiction presentation fallback`.
