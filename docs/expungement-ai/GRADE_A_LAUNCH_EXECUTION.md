# Grade A launch execution

Controlling plan: `ExpungementAI_Captain_Handoff_v2/01_Grade_A_Launch_Build_Plan.md`.
Everything else — old prompts, blocker ledgers, audits, verifier reports,
source-recovery reports, finish queues — supplies facts, not missions.

**Rule: every active task names a Build Plan section. If it cannot, it goes to
POST_LAUNCH_BACKLOG, unless it proves a defect that stops the intended launch
product working correctly.**

Release candidate: `captain-release` @ `f1e0e6450` (local; 20 commits unpushed,
push held by owner instruction). The hold is a schedule dependency now, not
bureaucracy: it does not stop §5 or §7 local work, and it does stop the
authenticated §6.2 journey, the worker rebuild and hosted acceptance. A named
publication target is needed before local work reaches that boundary.

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
| GA-5-CTKYVTWV route remediation behind the token refusal | 3 | `READY` | The shared token-safety defect is closed, but a refusal is containment, not coverage. The 11 documents on 6 routes (CT×2, KY×3, VT×1, WV×5) now refuse instead of leaking `{county}`/`{court}`/`{courtLevel}`; each still needs its correct sourced values and full §5 route/document remediation before it counts as delivered. A disabled route is not a repaired route |
| ND visual review — `STALE / RE-REVIEW REQUIRED` | 3 | `READY` | Bound to 1.x bytes; both ND packets are 8 pages at renderer 2.0.0. Ordinary ND acceptance work, not a separate workstream. ND is already noncommercial, so it blocks nothing else; it must complete before the corrected ND packet can be Grade-A deliverable again |
| ND output legal review — `STALE / RE-REVIEW REQUIRED` | 3 | `READY` | Same binding, same phase, same condition |
| `dc-correct-misattributed-arrest` has a specification but no packet plan | 3 | `READY` | The one specification of nineteen whose pathway the planner cannot plan, so collection has nothing to ask. DC is noncommercial on this route; repair with the DC rows in Phase 3 |
| GA-5-CASEMODE remaining unresolved routes | 3 | `READY` | 7 documents on 4 routes. **KS 12-4516a** — "the municipal court where the ordinance charge was brought" names the courthouse, not the docket; its sibling 12-4516 says "convicting" and this one deliberately does not. **VA** — "Send the transmittal and request … to the clerk" states neither a new civil docket nor an addition to the criminal file; needs whether § 19.2-392.2(I) relief is a civil petition or an administrative request. **IL** — captioned to the chief judge of the circuit with no docket in `requiredFacts`, and the manifest records no filing action at all. **OR** — splits instead (see `GA-5-OR-SPLIT`). Recorded with sources in `2026-09-19-case-mode-resolutions-nv-ct-ks.json` |
| GA-5-NV carry the owner-adopted section bodies into the specification | 3 | `ACTIVE` | The last Nevada blocker, and it turned out **not** to be drafting. The four bodiless section kinds — `route_detection`, `route_branch_screen`, `discharge_type_screen`, `declaration` — already have complete, branch-aware, source-grounded approved text in `scripts/build-census-v1-nv_seal_probation_family-set.mjs`, rendered to the canonical and boundary fixtures and **owner-adopted 2026-09-02**. The specification, generated later, dropped every section body and kept the headings. So this is a derivation defect and the remedy is faithful transcription of adopted text under the adopted hashes — never drafting, which the composer's first rule forbids and which would have put unreviewed prose beside approved prose. Two parts: carry the eight components' bodies across, and express Nevada's caption values through the caption block (`pleading_caption` reads fixed fact ids and ignores the section's declared fields, and Nevada's caption values are blanks, so this interacts with the GA-5-TOKENS caption refusal contract). Until then the route composes nothing, which is the honest state and is visible. Recorded in `2026-09-19-nv-176a-component-classification-and-field-reconciliation.json` |
| GA-5-MS reapply the reverted `routeKeys` binding fix | 3 | `ACTIVE` | 132C. Reverted earlier to hold `rebuildRequired:false`; that is no longer the accepted end state |
| GA-5-OR-SPLIT Oregon route stands in for two statutory subsections | 3 | `ACTIVE` | Investigated. **Neither value is correct**, because the route covers both: ORS 137.225(1)(c) is "where no accusatory instrument is filed" → no case exists → `new_case`, while the manifest's own `or_acquittal` track presupposes a filed instrument tried to acquittal → `existing_case`. All three memo branches share one venue sentence naming the *county*, not the case, which is why the generator correctly recorded `unresolved`. The route's identifiers each name one half: `routeKey` says 1(c), `trackId` says acquittal, the label says "arrests **or** charges". Recorded with sources in `data/record-clearing/legal-decisions/2026-09-19-or-137-225-case-mode-spans-two-situations.json`. **Route-shape decision made: split, do not use a conditional.** Compared from the OR memo, the branches differ on legal basis (1(c) vs 1(d)), named vehicle (three distinct motions), service recipient (the office that *had authority to prosecute* vs the one that *prosecuted*), and timing (60 days from declination vs none). Only the filing destination is shared. A conditional `caseMode` would hide a wrong route model; a screening question would push a route-model defect upstream into the frozen flow for the product's convenience. Once split, `caseMode` resolves per branch with no conditional and no new fact: `new_case` for 1(c), `existing_case` for both 1(d) branches. First §5 question: which branch the existing `or_acquittal-set` packet and `OR-OJD-ADULT-SET-ASIDE-PACKET` were drafted against. Both components stay non-releaseable; the spec records `legalSectionsBound: false`, so it composes and sells nothing today |
| GA-6.2 authenticated browser journey | 2 | `EXTERNAL BLOCKER` | Everything past the claim needs a real Supabase. The local stack (`scripts/legal-aid/local-stack/`) runs PGlite over five Clinic Mode migrations on hand-written stubs; the consumer briefcase would need `remote_schema.sql` and ~15 more, and a hand-stubbed consumer schema would prove the UI moves, not that the claim, RLS and verification boundary hold — substitute evidence, not evidence. Needs the credentials row below |
| GA-8-GUARDS `test-expungement-checkout-guards.mjs` red | 5 | `EXTERNAL BLOCKER` | **Classified: required release control.** The `Expungement.ai commercial flow` workflow runs it on every pull request to `main`, and its own path is one of that workflow's triggers. Two stale premises repaired (below); the third is the successor Grade-A acceptance this whole candidate waits on, and a hash is not to be rolled to clear it |

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
| GA-5-NV route shape and `caseMode` | 3 | Six-attribute test applied, and the answer is the opposite of Oregon's: **Nevada does not split, because it is already split where it matters.** On the NRS 176A.245 subsection 1 branch the participant files nothing — the court orders the sealing itself, without a hearing, unless the Division objects — and the specification already marks the petition, proposed order, declaration and filing instructions `conditional` on `subsection_2_petition_branch`, shipping only screens and referral guidance on the other. Its checklist is branch-aware throughout. So no fictitious filing is generated for the branch that has none, which is the Build Plan's Nevada defect. `caseMode` on the three conditional components resolves to `existing_case` from subsection 2's own words — "the defendant files a petition in the court that handled the case" — with no conditional and no new fact. **CT** (one docket number per form) and **KS 12-4516** (the convicting municipal court) resolve the same way. Applied by generalising the generator's existing "which case" rule to the authority's own words, not by per-route exceptions; a phrase naming only a county still falls through, which is what keeps OR, KS 12-4516a, VA and IL honest. 6 documents resolved, releasable 66 → 70 |
| GA-5-NV subsection 2 branch trigger established and wired | 3 | The route-shape row below said Nevada was "already split where it matters". True, but only because **nothing** was generated for **either** branch: `subsection_2_petition_branch` was a string in the specification that nothing evaluated. Screening sent both branches to `needs_review` / `waiting_rule_not_executed` — a failure to compute wearing a review requirement — so the participant whose relief is automatic and free was told their case needed review, and the participant with a real petition was told nothing about it or about the seven-year clock. Now: the trigger is the conjunction the sections state — a charge under NRS 200.485 / 484C.110 / 484C.120 **and** a conditional dismissal or set-aside — resolved by **one** module that the evaluator, the route-safety fact list, the packet specification and the Grade-A composer all read, so the packet cannot disagree with the result the participant was shown. No existing fact established either half (`case_outcome` cannot distinguish a conditional dismissal and offers no set-aside; `offense_level` does not name the statutes; `charge` is free text), so **two** option-only required facts were added — the memo's own `prbChargeType` and `prbOutcome` — and `disposition_date` was reused as the seven-year anchor. Nothing asks whether the participant holds a document. **Subsection 1** → `guidance_only`, payment closed structurally before the timing gate, told the court seals it and they file nothing; no petition, order, declaration or instructions planned. **Subsection 2** → one route identity, the four components planned, the seven-year rule executed (inside it: `not_yet`, not `needs_review`), commercial eligibility unchanged and still closed for want of a Grade-A record. **Unresolved** → `needs_more_info` naming both questions, never `guidance_only`, and composition refuses naming every component it would have dropped. `verify-nevada-176a-branch.mjs`: 76 checks over all 24 answer combinations; four mutations each red it (unresolved→automatic 16 failures; condition always true 6; facts out of the Checkout gate 1; guidance gate removed 8, where subsection 1 then reports `packet_ready_with_caution`). NV moved 5/5 → 7/7 facts in the §6.1 pre-Checkout gate. Recorded in `2026-09-19-nv-176a-branch-trigger-established.json`. The IL family builder carried the same silent-drop filter and now refuses through the shared planner |
| GA-5-NV EN/ES, the subsection 3 bar, and required-fact completeness | 3 | The three legal/contract items around the branch. **EN/ES**: the three Nevada questions are route- and payment-deciding participant surfaces, so nothing was deferred to a final QA pass — prompts, helper text and **every one of the 11 options** carry Spanish through the existing `translations` / `optionDisplay` architecture, both friendly missing-field prompts are localized, and all four engine reason texts resolve in Spanish through `resolveRuntimeText`'s exact-English index. **Subsection 3**: NRS 200.508 / 200.5099 bars sealing on *both* branches, and the approved petition asserts in terms that the petitioner was not so charged — so until it was asked, the packet would have had a participant swear to something the product never established. That is launch work, not a note. No existing fact established it (checked against all 50 projected Nevada questions; zero candidates), so one minimum source-backed route-safety fact was added, resolving before Checkout: `Yes` → `likely_not_eligible` on both branches, unanswered → `needs_review`, never permission. **Required-fact completeness**: reconciled exactly against the owner-adopted field map — 5 platform-generated identity facts, **11 participant-completable filing blanks**, 4 signature fields, 2 court-owned fields, 3 route-eligibility facts. `requiredFacts: 5` was right all along; the 11 are printed as labelled lines the participant writes at filing, so a new `participantCompletesBeforeFilingFields` bucket now says so, the composer stops demanding them as facts, and the renderer draws a line instead of a label with nothing after it. **Zero unnecessary questions created**: three added in total, each deciding whether the participant files or pays anything; eleven values a naive reading would have promoted to questions stayed blanks. Control now 102 checks; four new mutations each red it (bar stops barring 3; unanswered bar treated as permission 2; one option left English-only 1; one blank dropped from the ownership map 1) |
| GA-5-TOKENS caption tokens bound to matter facts | 3 | 11 documents printed `{county}` `{court}` `{courtLevel}` `{caseNumber}` `{judicialDistrictOrGaLocation}` `{caseNumberLine}` `{docketLine}` into captions and jurisdiction sentences (CT×2, KY×3, VT×1, WV×5). The configs were right — each states its caption as a pattern on purpose and says in its own note that only the participant's answer may fill it — and the renderer substituted `{county}` into three presentation fields and nothing into `courtCaption`. Now: 5 value tokens each bound to one named matter field, 2 line tokens printed only when their number is known, an unlisted token refuses, an unanswered value token refuses, and `[COUNTY TO BE CONFIRMED]` is gone from captions. **28 rendered, 0 printing a token**, 7 ex parte captions preserved; 36 per-token missing-fact refusals proven. Returning a placeholder instead reds 108 of 327 checks |
| GA-6.2 packet-information workload measured nationwide | 2 | `verify-packet-collection.mjs` (18 checks) and the collection audit over 343 routes: screens max 57→9, median 15→7; 1,908 duplicate asks eliminated; **0** unresolved facts on any route; every required fact accounted for exactly once; filing readiness stays inside the pre-Checkout gate; saved answers stay editable; preflight refuses and names the missing fact. This is the "not merely screen count" measurement §6.2 asks for, and it is headless, so it needed no credentials |
| GA-6.2 anonymous journey in a real browser, four ways | 2 | `verify-expungement-anonymous-journey-browser.mjs`, run against a local dev server. The original Mississippi non-conviction route completes identically desktop/English, on a 390px phone (0px horizontal overflow), keyboard-only, and in Spanish. The free check asks **7** option-only questions, **0** free-text or date controls, **0** exact packet facts, and never requests checkout; the priced result states $50 and that the facts are verified before payment. Two English-only fallbacks found and fixed: no language control on any inner surface, and six result lines — including the price and the payment sequence — that stayed English in Spanish. Both mutation-proven to fail the check |
| GA-6.1 gate classes normalized | 2 | The 18 `filing_readiness` facts the renderer refuses to compose without were misclassified by two signals that are not class statements: the phrase "before filing" in a `use` sentence (an instruction about when the participant checks a value — "charge wording copied from the court record before filing"), and a name-shape guess that outranked the specification (`service_details`, `other_recordkeeping_agencies`). 13 reclassified — 10 `render_required`, 3 `prepay_confirmation` — with no change to what the participant does: 343 routes, 5,747 facts accounted for, 0 dropped, screens and entered-fact counts identical. 5 remain, all Mississippi, and are a live question rather than a leftover — see below |
| GA-6.1 nothing but a real prerequisite blocks Checkout | 2 | The other half of the rule, measured. What stands between a participant and Checkout, nationwide: 3,945 `prepay_confirmation`, 1,085 `render_required`, **18** `filing_readiness`, **6** live `conditional`, 0 `unresolved`. Every one of those 24 outside the two admitted classes was dropped and put to the real renderer: **19 refused by name** as missing, **0 composed without** — so no later filing task, external document, post-filing step or other actor's work is standing in front of a payment. 5 not probed because their route (DC, GA×2, WY) does not compose at all — an `approved_shipping_component` section the composer does not implement, which refuses harder than the gate and is §5 work. Mutation-proven: a notarisation-appointment fact injected into the gate reds the check |
| GA-6.1 no required participant-owned render fact after Checkout | 2 | **0 nationwide.** 538 checks in `verify-rcap-prepurchase-render-facts.mjs`: 13 reachable routes with a registered specification, 172 participant-owned specification facts, all in the pre-Checkout gate or excused with a recorded disposition (MS non-conviction excuses 5, all `derived`). Two route-level mutations proven to fail the check. No product change was warranted — see below |
| Memo lineage restoration (32) | — | `e1834aac7`; sweep step 154 |
| Resolution-lane sidecar (33) | — | `d01cc0e30`; steps 155, 158 |
| Per-question out-of-scope reasons (36B) | — | steps 164, 165 |
| Authority-derived hardening expectation | — | step 254 |
| Verifier register re-observed | — | `11fe14d0f`; 513-script audit |

## Controlling rule — externally acquired documents are filing readiness

**A document Expungement.ai cannot produce is never a condition of
eligibility, packet completion, Checkout, payment, generation, sponsored
generation, Briefcase readiness, RCAP completion or Clinic Mode completion.**
The participant obtains it before they FILE. Nationwide, all surfaces.

The participant is never asked to scan, photograph, OCR, upload or store such
a record so the product can hand it back in a PDF, and no such feature is
built in this release. Where an outside record carries a fact one of OUR
documents needs, the product asks for the fact — "What disposition date
appears on your court record?" — and never for the record. Evidence custody
is not a questionnaire requirement.

A pleading may therefore say "A certified copy of the disposition is attached
as Exhibit A" while the product holds no exhibit: that sentence describes the
filing package the participant is instructed to assemble, and the instructions
must make the assembly unmistakable — obtain it, attach it behind the
petition, do not file without it. Proper pleading language is not weakened
because LegalEase does not generate the attachment.

**Where the line falls, precisely.** *Ask for a participant fact only when it
changes something LegalEase generates.* An exact disposition date the petition
prints, a case number the caption carries, the identifier method that decides
which MCIC addendum exists — those are ours to ask. Whether the participant
has been to the courthouse yet is not, in either direction: we already know a
certified disposition must be fetched, so making them confirm they have *not*
fetched it, before we will build their petition, is intake friction that buys
the product nothing.

So a possession or readiness question is **not asked at all**.

And the status does not go into the filing either. Deriving it instead of
asking solved the friction; it did not make workflow language appropriate in a
court document. A certificate that reads "Service-address status: To be
confirmed before filing or service" is telling a court about the participant's
errands, and an assembly-status list under a filing's caption is a checklist
wearing court clothes. **Court papers stay court papers.** The filing carries
the proper unexecuted structure with the blanks the participant completes when
they perform the act; the instruction — *obtain a certified copy of the
disposition, attach it as Exhibit A, do not file without it* — lives in the
Filing Checklist and the supplemental guide, which is where the participant
reads it.

Four categories stay distinct and are not collapsed: **generated by
Expungement.ai** · **participant must obtain before filing** · **completed
later by another actor** (court, clerk, prosecutor, agency, attorney, notary) ·
**genuinely optional**.

## GA-6.1 — the five Mississippi facts: decided by the controlling rule

After normalization, five facts still carry `filing_readiness` and still block
Checkout, all on `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`:
`certified_disposition_exhibit_status`, `docket_sheet_exhibit_status`,
`service_address_confirmation_status`, `mcic_identifier_delivery_method`,
`mcic_identifier_method_confirmation_source`.

They keep the label because the specification itself gives it to them —
"Exhibit A assembly and **filing-readiness gate**". The two authorities then
point opposite ways, and neither is obviously wrong:

- **Toward removing the dependency.** None of the five is interpolated into any
  document (0 template references each). The composer's own block is named
  "route-specific **filing** gate" and is skipped entirely for
  `generationPurpose: "internal_review"`, so the packet demonstrably composes
  without them. The specification's participant instruction says "Choose
  Attached as Exhibit A only after the certified court record is physically or
  digitally inserted… **Stop before filing** if Exhibit A is missing" — before
  *filing*, not before *generating*. And the Build Plan names "a later
  signature, notarization, certified-copy task" as exactly what must not become
  a questionnaire hurdle. `certified_disposition_exhibit_status` is a
  certified-copy task.
- **Toward keeping it.** The petition's own text asserts "A certified copy of
  the disposition **is attached as Exhibit A**. A copy of the docket sheet is
  attached as Exhibit B." That is a fixed sentence in a **verified, notarised**
  filing. Composing before the exhibits exist produces a document whose sworn
  assertion is not yet true. Likewise the certificate of service represents the
  prosecutor's address as confirmed, and the MCIC facts decide which protected
  channel carries sensitive identifiers.

So the tie-breaker is not mechanical. It is whether the product may generate a
verified petition asserting an attachment the participant has not yet made, on
a commercially eligible route with an accepted Grade-A record. A third option
exists — make the petition's exhibit sentence conditional on the status — but
that edits legal document text on a Grade-A route.

**Decided by the controlling rule above.** The certified disposition and the
docket sheet are records a clerk issues, so neither their possession nor a
particular assembly answer may gate generation or payment; the service-address
confirmation likewise, and the specification already offers "To be confirmed
before filing or service" for exactly that state. The composer's demand for
the ready answers is removed. The two MCIC facts stay generation facts: they
are not documents, they decide what the confidential MCIC processing addendum
IS and which channel carries a full Social Security number, and "Stop if the
court has not approved the identifier method" is a privacy precondition for
producing that document rather than a record to fetch.

Proven: the Mississippi packet composes with all three **unanswered** — the
participant is never asked them, and the documents print the specification's
own not-yet wording. Nationwide there are now **0** filing-readiness facts in
packet completion and **0** possession questions asked before generation, with
the two MCIC facts still collected because they decide what gets generated.
Mississippi's participant workload is unchanged at 9 screens (from 57).

Then the document-purity half. The certificate of service no longer prints
`Service-address status:`; the `ATTACHMENT ASSEMBLY STATUS` section is gone
from the court filing; and the three facts, used by nothing once that language
left, are out of `requiredFacts` and `fieldOwnership` entirely. Nothing was
lost from the participant's side: the specification's own `attachments` already
name each record with where to get it and why it is needed, and its
`participantChecklist` already says to insert the certified disposition as
Exhibit A and the docket sheet as Exhibit B, to confirm the prosecuting
office's current service address with the court of origin, and to leave
signature and service-time fields blank until those acts are performed.

Mississippi's plan drops from 59 required facts to 56 and the journey stays at
9 screens. Held by control: 55 court-facing documents checked nationwide for
workflow language; putting the sentence back reds it.

### The nationwide sweep this rule required

Every participant-owned specification fact whose wording names an externally
acquired record: **30**, and 28 of them ask for a **fact copied from** one —
"conviction date, checked against the certified copy", "case number copied
from the court record", "start of the two-year good-conduct period, confirmed
from criminal history". That is the treatment the rule asks for: collect the
fact, never the record.

Facts that ask about **possession** rather than content: **2**, both
Mississippi, both handled above. No other specification in the corpus has one.

Participant-facing upload requirement anywhere in the packet journey: **none**.
The only `upload` references under `src/lib/expungement-ai` are the privacy
deletion sweep, which deletes uploads rather than asking for them.

Held by control: `verify-rcap-prepurchase-render-facts.mjs`, 558 checks —
every possession question must offer a truthful not-yet answer and be
classified filing readiness, and each route carrying one must compose with
every external record unfetched. Removing a not-yet answer reds 2; restoring
the composer's demand for a ready answer reds 1.

## Two one-time classifications

**The 354 filing-readiness strings with no Spanish — not launch localization
work, and the count itself is an audit artifact.**

`data/expungement-ai/route-product-metadata.json` is read by scripts only. No
file under `src/` imports it, statically or by path, so none of its strings is
rendered to a participant from that file. Of the 354:

- **339** are `routeData.filingReadiness`, one per route, and every one is a
  status token, not prose. Four distinct values: `ready_to_file`,
  `guidance_only`, `needs_external_document`,
  `needs_court_or_agency_followup`. Where those values do reach a participant
  they resolve through `filing.*` in `EXPUNGEMENT_COPY`, and **all four already
  carry Spanish**. The copy audit keys its Spanish lookup on English *prose*,
  so a token can never match — that is where the "missing Spanish" count comes
  from.
- **15** are `externalDocuments` prose, on **2 routes** (AK, DE). Both are
  `paymentProductEligible`; neither holds a Grade-A record, so neither can
  sell. Script-read only.
- **0** on any of the six commercially eligible routes.

So: not reachable by a supported participant, and nothing here is
machine-translated. The audit's keying defect is the backlog item.

**`test-expungement-checkout-guards.mjs` — required release control, still
red, and that is launch work.**

It runs in `.github/workflows/expungement-ai-commercial-flow.yml` on pull
requests to `main`. Three premises, two now repaired:

1. *Repaired.* It died on `Cannot find module '@/lib/server-runtime-environment'`
   before a single assertion ran — `payment-adapter.ts` began importing it on
   2026-09-17 and the hand-rolled loader resolved `@/` only through its mock
   map. The loader now resolves the alias to the real file, so a genuine new
   import upstream no longer silently reds the control.
2. *Repaired.* Its positive cases ran on `PA:pa-path-a-non-conviction-expungement`.
   Roger retired the Pennsylvania legacy generator as a commercial fulfillment
   path on 2026-08-28, so that route has no Grade-A record and
   `assertCheckoutAllowed` refuses it by design — the guards under test were
   unreachable. Positive cases moved to a route that holds a record; the
   refusal is now proven as its own negative case, and passes.
3. *Open, and not ours to clear.* The MS record's
   `packetSpecificationSha256` is `3a1bed79…`; the file now hashes
   `f094c572…`, because GA-4.2 populated the document contract into every
   specification. That is the accepted successor invalidation, not a defect to
   patch. The control goes green when the successor Grade-A records are
   accepted — not by rolling a hash.

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
- **Not backlog:** the 15 AK/DE participant-facing prose strings are attached to their routes, not to this list. `AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` and `DE:discretionary-court-expungement-under-11-del-c-4374` carry English-only external-document prose ("File the TF-810 request at your local Alaska trial court", "SBI criminal-history / SBI eligibility letter"). If either route becomes launchable, Grade-A Spanish is required before activation; while each stays blocked for its own legal or document reason, the translation stays pending with it. Not machine-translated: the strings name forms and offices.
- `court_requirements_completed` renders its optional badge with no separator, so its accessible name reads "...in this case?OPTIONAL" / "...este caso?OPCIONAL".

## Owner-only decisions

1. Reduce intended launch coverage.
2. Production promotion or production-risk actions not already authorized.
3. Change the Build Plan's definition of done.

Routine implementation choices are the Captain's.

## Commit convention

`GA-<section> <what changed>` — e.g. `GA-4.3 remove cross-jurisdiction presentation fallback`.
