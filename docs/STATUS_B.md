# STATUS_B — approved legal authority, implemented

Sprint lane B. Implements the 50 approved decisions in the Record Clearing
Implementation Authority Reconciled workbook (2026-08-24), with the Mississippi
Definitive Route Decisions controlling every Mississippi route.

Nothing here was researched. Every legal statement traces to a row in the
approved workbook, and the registry names the row it came from.

## What landed

| Commit | What |
| --- | --- |
| `f64d737e` | The route-contract registry: `src/lib/legal-authority/**` |
| `353dba2d` | Contracts bound into the compiled engine profiles |
| `8840721b` | Route rules gate only on facts the flow guarantees |
| `d0cb6030` | Routing proof through the real evaluator; Maryland blocked |

Run it: `npm run rcap:legal-authority`. Re-apply after a contract edit:
`npm run rcap:legal-authority-apply`. Both are in `npm test`.

## Coverage

- 50 of 50 approved decisions in the registry.
- 113 of 113 approved route keys claimed by a contract.
- 127 contracts, because Mississippi's thirteen categories expand into the ten
  stage splits its override register requires.
- 126 bound into compiled profiles. One is blocked; see Maryland below.

Mississippi's ten new routes: nonadjudication admission, pretrial-intervention
admission, conditional-discharge admission, intervention-court dismissal-only
packet, intervention-court enforcement referral, trafficking vacatur,
trafficking expungement, justice-court relief, municipal-court relief, and the
uncharged-misdemeanor dismissal branch. They are appended to `profile.pathways`
rather than inserted, because `selectPathway` takes the first label match and
inserting would silently re-route flows that resolve correctly today.

## The three defects the directive names

**A processing deadline stored as an eligibility clock.** `timing.kind` forces
every duration to declare what it is — an elapsed clock, a lookback, a filing
deadline — and post-filing periods can only live in `processingDeadlines`,
which requires a note saying why the period is not a participant wait. Nine
routes the decisions flagged are asserted to hold them: Delaware's 120-day
Attorney General window, Maryland's 60-day agency period, New Mexico's 30/45-day
processing, Rhode Island's four procedure periods, Texas's 30-day order
deadline, Oklahoma's Clean Slate implementation schedule, Nevada's prosecutor
response period, Hawaii's Attorney General processing, and Mississippi's 10-day
district attorney notice. Minnesota's ten-year § 299C.11 condition is typed as
a `lookback`, not a wait from arrest, as the decision requires.

**One grouped route standing in for several mechanisms.** A contract carries
exactly one statute, so a mechanism that splits gets another contract rather
than a conditional. The measured effect: before this change, a participant who
picked additional justice-court misdemeanor relief was routed to the
non-conviction dismissal packet and sold one — at any timing, including a
conviction under a year old. A trafficking-survivor selection landed on the
first-offender nontraffic misdemeanor route. Both now resolve to their own
route.

**Checkout open on relief the participant does not file for.** Payment
authority is derived from outcome mode and stage rather than stored, so an
automatic, no-filing, referral or active-case-admission route cannot declare
itself sellable. In the profiles this becomes `filingRequired: false` plus the
verification-and-guidance packet plan, which is the signal
`routeIsAutomaticOrNoFiling` in the evaluator already reads to refuse both a
packet and payment. Rules whose candidate pathways are all closed were
downgraded off `packet_ready_with_caution` in the same pass, so no prose rule
keeps advertising a packet on a closed route.

**The shared waiting rule.** Mississippi's eligible-felony route published all
eighteen Mississippi waiting statements at once — the 12-month uncharged
misdemeanor rule, the 2-year justice-court rule, the 1-year MIP rule, and both
the live and the stale felony figures — so whichever one the prose selector
reached could be shown against a felony petition. Each route now publishes its
own statement and nothing else, and `verify-legal-authority-routing.mjs` fails
if a route ever publishes a duration figure belonging to another route.

## Measured behaviour change

Swept every jurisdiction, pathway context, case outcome and timing bucket —
3,096 scenarios — against the pre-change tree. **Only Mississippi changed.** No
other state's result moved at all.

| Route | Before | After |
| --- | --- | --- |
| eligible felony, 1.5 years | needs_review | **not_yet** |
| eligible felony, 3.5 and 6 years | needs_review | **packet-ready, payment open** |
| first-offense DUI, 4 years | needs_review | **not_yet** |
| first-offense DUI, 8 years | needs_review | **packet-ready, payment open** |
| minor in possession, 2–3 years | needs_review | **packet-ready, payment open** |
| DUI nonadjudication | needs_review | **guidance, no checkout** |
| intervention-court completion | needs_review | **guidance, no checkout** |
| the six split routes | mis-routed to other packets | their own routes |

Payment opens on three Mississippi routes because their approved clock now
executes and they were already ratified. It opens nowhere else.

The cause of the old needs_review was worth naming: those route rules listed
`sentence_completion_date`, a question the profile publishes but does not
require. Blank in an ordinary flow, it dropped the route rule out of matching,
and the evaluator fell back to whichever prose rule matched — so the approved
clock was never reachable. Route rules now gate only on facts the flow
guarantees.

## Needs Roger's confirmation — revenue affecting

Seven routes that are currently in `RATIFIED_DEPLOYABLE_ROUTES` lose checkout,
each because its approved decision says so:

| Route | Why |
| --- | --- |
| `MS:dui-nonadjudication` | LD-MS-01: active-case referral, "must not open a consumer expungement checkout" |
| `MS:intervention-court-completion-expungement` | Override register 6: "close checkout on automatic branch" |
| `MS:human-trafficking-survivor-vacatur-and-expungement` | Override register 5: separate vacatur and expungement routes, both attorney-reviewed; the old combined route becomes a selector |
| `MS:additional-justice-or-municipal-court-misdemeanor-relief` | Override register 10: separate justice-court and municipal-court variants; the old combined route becomes a selector |
| `NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1` | LD-NJ-01: special automatic and summary mechanisms; guidance before any petition |
| `RI:path-f-marijuana-possession-expungement` | LD-RI-06: automatic and expedited statutory process, no participant wait |
| `MT:deferred-sentence-dismissal-or-confidentiality-route` | LD-MT-01: status and correction guidance; the statute's dismissal is the relief |

Montana is the one judgment call in that list. Its decision's output mode is
"STATUS/CORRECTION GUIDANCE OR LIMITED COURT/AGENCY PACKET", so a packet is
contemplated where a court or agency order is actually required. It is modelled
closed because guidance is named first and because closing is the fail-closed
direction. Reopening it needs a fact that establishes the order is required.

## Handoffs — shared files this lane does not own

**1. Maryland is not applied.** `MD-maryland.json` is pinned by the settled
screening-parity delta `md-pardon-signed-date-2026-08-11`. Its settled branch
requires the file to be byte-identical to the `main` baseline, so any edit —
including this one, which left all 36 questions and all 8 pathway ids
byte-identical and touched only the unrelated § 10-103 pathway — drops it into
a projection whose before-count no longer exists. Re-pinning Roger's approval
onto bytes he did not approve is not a change this lane should make.

*Fix:* retire the delta now that its content is in `main`, then remove `MD`
from `BLOCKED_JURISDICTIONS` in `scripts/apply-legal-authority-to-profiles.mjs`
and from `GOVERNANCE_BLOCKED` in `scripts/verify-legal-authority-routing.mjs`,
and rerun the apply script. `scripts/verify-rcap-md-pardon-pathway.mjs` passes
over the Maryland-bound tree, so the approved behaviour is intact either way.

**2. Effective-date gating is real in the data, not in the evaluator.** Seven
rules carry a real `effectiveFrom` and `routeRuleInForceOn` fails closed on
both sides of it, asserted by `verify-legal-authority-contracts.mjs`. The
evaluator has no effective-date branch, so a Mississippi felony filing dated
before 2026-07-01 would be told three years when the rule in force for it was
five. Today's date is after the boundary, so no live participant is affected —
but the boundary is unenforced.

*Fix (evaluator.ts):* read `pathway.legalAuthority.effectiveFrom` and
`supersedes` in the timing path and apply the superseded duration when the
filing date precedes it.

**3. The clock anchor is recorded but not honoured.** Each route rule now
carries `when.timingAnchorFactId` (and `timingAnchorAlternateFactIds`), taken
from the approved decision. `chooseTimingAnchor` still picks an anchor by
keyword-matching the rule's prose, so for some routes the anchor it picks is
not the one the decision names — Mississippi's MIP route, where the branch
anchor is the dismissal date on one branch and the later of completion and fine
payment on the other, is the clearest case.

*Fix (evaluator.ts):* have `chooseTimingAnchor` prefer
`rule.when.timingAnchorFactId`, then `timingAnchorAlternateFactIds`, before
falling back to the keyword scan.

**4. Several approved intake facts have no published question.** Each contract
carries the approved facts verbatim in `requiredFacts`, and
`screeningFactIds` names the subset that maps to a published question. The
unmapped ones are visible rather than silently dropped, but they do not gate.
Publishing a new prepay question means editing `compiled/all51.json` (the
designer profile the public projection actually reads) and, for a state-specific
prepay fact, `STATE_SPECIFIC_PREPAY_WILMA_FACT_IDS` in
`src/lib/rcap-engine/public-profile-projection.ts`. Both are shared. Note also
that the parity mechanism in handoff 1 will need an approval for each addition.

**5. Attorney review is recorded but not enforced.** The two Mississippi
trafficking remedies derive `paymentAuthority: "attorney_review_required"`.
They are closed today because they are not in `RATIFIED_DEPLOYABLE_ROUTES`, so
nothing sells — but that is ratification doing the work, not the review
requirement. If either is ever ratified, the payment gate needs to consult
`legalAuthority.paymentAuthority`.

**6. 72 approved packet routes cannot be sold yet.** They are correct,
fail-closed and guidance-only because `RATIFIED_DEPLOYABLE_ROUTES` is a
hardcoded set in `evaluator.ts` and they are not in it. Four of Mississippi's
new split routes are among them — the intervention-court dismissal-only packet,
justice-court relief, municipal-court relief, and the uncharged-misdemeanor
dismissal branch — and the two trafficking remedies sit behind attorney review
as well. Adding a route to that set is a ratification decision, not an
implementation one.

**7. Missouri's new automatic-closure provision has no route.** LD-MO-02 says
it takes effect 2026-08-28 and must not be treated as active on 2026-08-24.
There is no compiled pathway for it, so it is recorded as a note on
`MO:closed-record-outcome-under-rsmo-610-105` and asserted by the contract
verifier. When the pathway is created it needs `effectiveFrom: "2026-08-28"`.

## Verifier state

Green, and new: `verify-legal-authority-contracts.mjs`,
`verify-legal-authority-routing.mjs`, `apply-legal-authority-to-profiles.mjs --check`.

Green, and were green before: `verify-expungement-profile-screening-flow`,
`verify-rcap-evaluator-public-ambiguity`, `verify-rcap-ratified-route-payment`,
`verify-public-profile-projection`, `verify-expungement-plain-language-values`,
`test-expungement-parity-delta-mutations`, `verify-rcap-md-pardon-pathway`,
`verify-expungement-mississippi-result-path`,
`verify-rcap-evaluator-clock-boundary`, `verify-expungement-track1-dedup-questions`,
`verify-rcap-packet-contract`, `verify-expungement-approximate-timing-screening`.

Went red to green: `verify-all51-source-engine`. Its counts manifest was
already one pathway stale before this work.

Still red, unchanged, not this lane: `verify-rcap-no-checkout-on-automatic-routes`
(8 of 567 — unregistered guidance tracks for MI, CA, IL and AK; coverage grew
from 411 checks to 567 as the newly closed routes came under test),
`verify-rcap-authoritative-profile-version`, `verify-rcap-sellable-pathway-closure`,
`verify-rcap-track-pathway-crosswalk`, `verify-mississippi-document-generator`.
Each produces byte-identical output before and after this work.

## Reverting

The registry is split along the same seams as the commits —
`routes/p0.json`, `routes/mississippi.json`, `routes/route-splits.json`,
`routes/single-routes.json`. Reverting one batch means reverting its file and
rerunning `npm run rcap:legal-authority-apply`; the profiles follow from the
registry, so nothing has to be unpicked by hand.
