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
| GA-7 supplemental participant guide | 4 | `ACTIVE` | **Opened as a real lane, with route data rather than a status line.** `src/lib/rcap/supplemental/guide-contract.ts` defines the four sections the plan names — Overview · Next Steps · Filing Checklist · Fees & Costs — and nothing else: stop conditions stay in the specification's `hearingAndObjectionStops`, because a second list can disagree with the first. **Corrected: the invariant is no *unsourced legal or procedural instruction*, not no authored sentence.** "Previously adopted text only" cannot be the global rule — most routes have no legacy approved guidance page, so a rule requiring every sentence to have appeared in an old PDF would leave them with no guide at all. So every entry declares what supports it from a fixed set — `adopted_artifact` · `authoritative_source` · `route_decision` · `route_data` · `product_copy` — and everything but product copy cites its source. `product_copy` needs no citation because it asserts nothing about the law, and for exactly that reason **may not carry an instruction**: the control tests the text rather than trusting the label, because the label is the thing most likely to be wrong. A properly cited newly-authored participant instruction passes; an uncited one does not. First route landed: **WY, 19 entries across the four sections, 13 lines carried elsewhere, 32 of 32 adopted lines accounted for**. `verify-supplemental-guide.mjs` is green at 20 checks and refuses a silent drop. **Its scope, stated accurately: this is a provenance-*metadata* control.** It establishes that the metadata is well-formed and that an instruction is not masquerading as product copy; it does **not** read the cited authority or establish that the passage supports the sentence. That was earned — an earlier positive example asserted "File the petition with the clerk within 30 days" against §7-13-1502(c) and passed every check while being false: (c) is the *prosecutor's* duty to notify identifiable victims within thirty days after service **on the prosecutor**, and the statute prescribes no participant filing deadline at all. **The number was never the defect.** Wyoming carries three real clocks — §7-13-1502(c)'s thirty-day prosecutor notice, §7-13-1502(e)–(f)'s ninety-day objection window running from the same service, and §7-13-1501(e)–(f)'s separate thirty-day misdemeanour window — and a guide may state any of them. A first attempt at the guard banned "within 30 days" across every loaded guide, which is far broader than the defect and would have become a false gate; it is now a **named regression scoped to the route and the false proposition**, not a deadline validator. Proven three ways: the false participant deadline reds it, and both the true thirty-day prosecutor notice and the true ninety-day objection window stay green. The fixtures now carry **one sentence under two provenances**, differing in nothing else — the earlier pair used two different sentences while claiming otherwise, which is not a controlled comparison. Actor/action/recipient/trigger/deadline/applicability against the cited passage belongs to the §7 content review, which is human work and is not automated here. **Status separation**: GA-5-WY *document* remediation is `DONE` (its targeted controls remain green); this lane stays `ACTIVE` until the guide renderer replaces the legacy guidance page. **The shared renderer has landed**: `src/lib/rcap/supplemental/guide-renderer.ts`, one renderer for every route, reusing the document renderer's own measured-wrap and page geometry rather than forking them. **EN/ES** is carried per entry as `textEs`, and a Spanish render **refuses** an untranslated entry rather than falling back — a half-translated guide reads as finished while telling a Spanish-speaking participant nothing actionable. **Pagination** is measured, not assumed: a 40-paragraph guide spills to four pages with the last paragraph intact. **Full vs court-only**: `court_only` refuses the guide outright rather than returning an empty PDF that looks like a bug, since the guide is addressed to the participant and not the clerk. **`KEEP FOR YOUR RECORDS — DO NOT FILE`** is drawn on **every** guide page including continuations, and the control asserts the *document* renderer does not know the string at all — stamping it on a pleading would tell someone not to file the thing they must file. **Stops are derived** from the specification's `hearingAndObjectionStops` at draw time, never stored in guide data. WY renders at **5,273 bytes over 2 pages**, all four sections and 3 stop conditions drawn, no line past the content width. `verify-supplemental-guide-renderer.mjs`: 17 checks, all by rendering real PDFs and reading the text back out with `pdftotext` rather than asserting the call returned. **Remaining before this lane closes**: Spanish text for WY's 19 entries, and wiring the guide into packet assembly so the legacy `filing_instructions` component actually retires |
| GA-5-CAPTIONS classify the remaining unresolved court-facing components | 3 | `ACTIVE` | 16 of 51 court-facing components are resolved on authority; the rest refuse, which is the intended fail-closed state. **36 documents across 8 families** carry an `approved_shipping_component` section — a *description* of an approved component (a heading plus field ids), never its text — so no generic handler is possible without inventing the words it describes. The content exists upstream: **all 8 families have a census-v1 build host that composed the adopted artifact**. So each is Nevada's derivation defect again, fixed per family by transcription in its §5 batch, reusing the shared capabilities Nevada needed (declaration kind, labelled blanks after numbered assertions, explicit caption contract). **8 transcriptions, not 8 bespoke renderers.** Six other components compose today and now refuse — DC `dc_correct_misattributed_arrest`, KS ×2, ND ×2, VA regime-1 — each noncommercial and already on the board. Classify every one from its own approved artifact page by page: **a packet-level caption test cannot classify a component** (Nevada is the counterexample inside its own packet). Carry forward: VA regime-1's approved artifact carries no caption anywhere | **Transcription provenance is now classified per family and guarded**: of the 8, **5 match the adopted bytes** (DC innocence, GA pardon-J7, GA SB-288, SD SIS, WY 1502) so their build host is a proven source; **3 have characterised drift** (IL mistaken-identity, MS 9-11-15-3, MS 99-19-71-1) so transcribe the *adopted* substance using the recorded characterisation; **0 are uncharacterised**. **The binding is per component, not per family**: `drift_characterised` does not license the current host for a whole packet, because a change elsewhere certifies nothing about the page being copied. Each carried component records `transcriptionProvenance` {adoptedDigest, sourceUsed, componentEquivalence, evidence} — `exact_adopted_bytes` (matches_adopted families only) · `untouched_by_drift` · `drift_outside_substance` · `recovered_from_adopted` — and `verify-transcription-provenance.mjs` fails if a binding is missing, if a component claims an equivalence its family's state cannot support, if the named adopted digest is not the one the adoption pins, or if a claim short of exact bytes does not argue for itself. Applied retroactively to Nevada: five components `untouched_by_drift`, and `proposed_order` `drift_outside_substance` because FIX07 reaches it but only at the machine route footer. **Source-to-artifact bridge enforced**: `matches_adopted` proves the *fixture* equals the adopted artifact, not that today's host produced it, so `exact_adopted_bytes` from a current host needs a regeneration proving the digest, or the adopted source version instead. Run once per exact-match family: **WY 1502 and SD SIS reproduce the adopted bytes exactly** (tree restored, verified clean); **DC actual-innocence and both GA families cannot regenerate here** — their hosts assert the Master Library corpus, which is the existing `GA-8-22E1` blocker — so they take the adopted artifact or wait for the mount. Preserve adopted component membership and requirement state independently of the recovered text, and draft no missing substance | **8 of 8 families repaired; the transcription program is closed.** Reconciled against current bytes 2026-09-21, not re-run: `verify-transcription-provenance.mjs` PASSES with `awaiting=0` for every one of the 13 classified families and 50 carried components audited. Per family: WY 1502 `MATCHES_ADOPTED` (5), SD SIS `MATCHES_ADOPTED` (4), DC actual-innocence `MATCHES_ADOPTED` (3), GA pardon-J7 `MATCHES_ADOPTED` (9), GA SB-288 `MATCHES_ADOPTED` (11), IL mistaken-identity `DRIFT_CHARACTERISED` (2), MS 9-11-15-3 `MATCHES_OWNER_REREVIEW` (5), MS 99-19-71-1 `DRIFT_CHARACTERISED` (5). The source-to-artifact bridge now reads **PROVEN for all 5 exact-match families**, including DC and both GA — `db6dba8f5` established that `GA-8-22E1` was a default path, not a missing Master Library corpus, so the "cannot regenerate here / wait for the mount" caveat above is superseded. Repairs: `380ce3e28` (WY, 1 of 8) · `658bd4371`/`f7f06198f` (SD) · `db6dba8f5`/`5b06173a0` (bridge) · `52ac64634`/`2666f6db6` (GA×2, 5 of 8) · `f1f2324a8` (MS×2, 8 of 8), all ancestors of the current head. No family in this cohort has a remaining open defect, so none is to be touched again absent a new concrete defect against current bytes. The caption-classification half of this row remains open and is what keeps it `ACTIVE`. Court-facing caption treatments now 31 unresolved · 9 full_independent_caption · 3 supporting_page · 3 official_form_controls · 5 not_applicable |
| Nevada commercial availability | 3 | `EXTERNAL BLOCKER` | Nevada's document and routing remediation is closed (see Done). What remains is **not** a document defect: NV has no Grade-A fulfillment record, so it sells nothing, and it is one of the six pathway adjudications awaiting commercial classification (`GA-5-41`). Kept as its own row so a caption question in another state cannot be mistaken for a Nevada document blocker, and so Nevada's commercial status stays truthful || GA-5-MS reapply the reverted `routeKeys` binding fix | 3 | `ACTIVE` | 132C. Reverted earlier to hold `rebuildRequired:false`; that is no longer the accepted end state |
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
| GA-8-22E1 corpus mount | 3 | Master Library (28 sources) + complete 583-file Nationwide package at their declared paths. **Narrowed — this is a regeneration dependency, not a 583-file launch dependency.** The complete package is required only by condition 7 (what a regenerated overlay manifest names), which is genuinely a question about the whole tree. Launch dependency is now measured separately by `NATIONWIDE_ACTIVE_DEPENDENCY_STATUS.json`: of the 70 residual paths, **55 are settled historical objects** and 15 are live, of which 6 are already held. What a custodian is actually owed for launch is the **9** named there (see `GA-8-RESIDUAL-9`), not 70. Four separate questions stay separate: what the kit contains · which historical paths remain active dependencies · which required bytes are actually available · whether a given generator needs a complete installation | Source custodian |
| GA-8-RESIDUAL-9 the nine unheld active dependencies | 3 | **Two authority/instruction sources and seven packet components — the whole remainder, not just the interesting one.** **FL ×1** `2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf`, the parent all three Rule 3.989 obligations resolve to (`RESOLVED_NOT_A_SEPARATE_DOCUMENT`), so **one acquisition, not three**, feeding `fl-expunction-set` · `fl-10yr-bridge-set` · `fl-sealing-set`. **GA ×1** GBI time-expired-restrictions source, named directly in the `requiredSourceIds` of `obligation:track-only:GA:ga-time-expired`. **IA ×2** Rule 2.86 Form 1 and Form 3 applications. **KS ×4** the two petitions and two order cover sheets under `source-gated/`. **ME ×1** CR-308 order on motion to seal. Each already carries its identifier and consumer obligation in `NATIONWIDE_ACTIVE_DEPENDENCY_STATUS.json` → `remainingByJurisdiction`; none needs a new investigation, they need the bytes. **Nine is the unresolved residual count, not a claim that the working corpus is installed** — the operational tree is unmounted here and 512 never-in-dispute paths remain unmeasurable in this checkout | Source custodian |
| GA-10 push target and hosted-acceptance token role | 6 | Resolve branch target; grant Auth Config read-write on `hyflxnlhpmiqxvvcoiia` | Roger |
| GA-6.2 authenticated journey credentials | 2 | A hosted origin plus `DTC_BROWSER_BASE_URL` / `DTC_BROWSER_EMAIL` / `DTC_BROWSER_PASSWORD` so `verify-expungement-commercial-browser.mjs` can run. Everything past the claim needs a Supabase account; the anonymous half runs locally with no credentials | Roger |

## Done

| Item | Phase | Evidence |
|---|---|---|
| GA-CORPUS corpus governance reconciled to the classification already made | 3 | **"513 of 583, 70 missing" was being read as a launch-blocker count, and it is not one.** It measures what one recovery kit could rebuild on 2026-09-19. The question that decides launch was already answered on 2026-09-02 — `NATIONWIDE_RESIDUAL_EXECUTION.json` classifies every residual path — and **nothing in the repository consumed it**, so every historical object stayed an active dependency and the instruction to reacquire seventy files kept regenerating. Now a second contract answers dependency beside the one that answers kit coverage: **70 residual → 55 settled historical · 15 live**, and of the 15, **6 are already held in this repository** at exact bytes under different filenames, bound by `SOURCE_RECOVERY_WAVE1_2026-09-11` (IL×4, IA DCI-77, MO CR370) — the recovery report calls them missing only because it reads the Nationwide tree path. **Real remaining: 9 — two authority/instruction sources (FL Rule 3.989, GA GBI time-expired) and seven packet components (IA×2, KS×4, ME×1)**, each listed with its consumer obligation under `remainingByJurisdiction`. Nine is the unresolved *residual* count, not a claim that the working corpus is installed: the operational tree is unmounted here, and the 512 never-in-dispute paths this checkout cannot measure are reported separately and never added to it. **Fail-closed by construction**: a path is an active dependency unless the disposition names it *by SHA-256* and classifies it settled, so unclassified is active and an unknown class excuses nothing. **Custody is bytes, never filenames.** **Settled is not recovered** — all 55 still report their bytes absent, and the record states in terms that it relabels nothing. The completeness precondition is **untouched**: condition 7 still requires all 583 at their recorded hashes and a partial custody still cannot assert completeness (its own 10/10 control re-run green). `verify-active-dependency-contract.mjs`: 20 checks, four mutations each red it — an unrecognised class (stays active), a deleted disposition row (becomes unclassified-active), a custody record naming absent bytes (stale, and the path returns to the findings), and a real file with the wrong bytes at the named path (identity is the hash). **The control also caught my own over-narrow check**: I required every superseded source to bind one successor hash, but Maryland's DC-CR-071 was replaced by the CC-DC-CR-072 *series*, which the record says plainly along with its weaker `identityConfidence` — so the check now requires a named successor edition of record and makes the 10-bound-by-hash / 1-inferred split visible rather than demanding a hash the world does not have. The stale report is annotated at the point a reader meets `missingFiles: 70`. **Not done here**: no byte was acquired, no classification revisited, no route opened |
| GA-4.1 one authoritative route definition | 1 | Already correct. `packetPlanForPathway` derives required inputs from the packet specification (`packetSpecificationRequiredFactIdsFor`); mutation-proven on a registered and an unregistered spec. No duplication to remove, and no control added — a parity check between them cannot fail |
| GA-4.3 cross-jurisdiction presentation fallback removed | 1 | 13 configs now refuse; PA byte-identical 3/3; 190 checks |
| GA-4.4 product branding removed from court-facing documents | 1 | renderer 1.0.0 -> 2.0.0; QA rule inverted; ND footer now audience-driven |
| GA-4.2 shared document contract | 1 | 12 attributes on all 76 documents across 19 specifications, populated from `legal-design-packet-set-manifests.json`; consumed by the renderer and refused at the fulfillment boundary; 203 checks, four invariants each mutation-tested. Oregon `caseMode` moved to Phase 3 as a route question |
| GA-5-NV route shape and `caseMode` | 3 | Six-attribute test applied, and the answer is the opposite of Oregon's: **Nevada does not split, because it is already split where it matters.** On the NRS 176A.245 subsection 1 branch the participant files nothing — the court orders the sealing itself, without a hearing, unless the Division objects — and the specification already marks the petition, proposed order, declaration and filing instructions `conditional` on `subsection_2_petition_branch`, shipping only screens and referral guidance on the other. Its checklist is branch-aware throughout. So no fictitious filing is generated for the branch that has none, which is the Build Plan's Nevada defect. `caseMode` on the three conditional components resolves to `existing_case` from subsection 2's own words — "the defendant files a petition in the court that handled the case" — with no conditional and no new fact. **CT** (one docket number per form) and **KS 12-4516** (the convicting municipal court) resolve the same way. Applied by generalising the generator's existing "which case" rule to the authority's own words, not by per-route exceptions; a phrase naming only a county still falls through, which is what keeps OR, KS 12-4516a, VA and IL honest. 6 documents resolved, releasable 66 → 70 |
| GA-5-NV subsection 2 branch trigger established and wired | 3 | The route-shape row below said Nevada was "already split where it matters". True, but only because **nothing** was generated for **either** branch: `subsection_2_petition_branch` was a string in the specification that nothing evaluated. Screening sent both branches to `needs_review` / `waiting_rule_not_executed` — a failure to compute wearing a review requirement — so the participant whose relief is automatic and free was told their case needed review, and the participant with a real petition was told nothing about it or about the seven-year clock. Now: the trigger is the conjunction the sections state — a charge under NRS 200.485 / 484C.110 / 484C.120 **and** a conditional dismissal or set-aside — resolved by **one** module that the evaluator, the route-safety fact list, the packet specification and the Grade-A composer all read, so the packet cannot disagree with the result the participant was shown. No existing fact established either half (`case_outcome` cannot distinguish a conditional dismissal and offers no set-aside; `offense_level` does not name the statutes; `charge` is free text), so **two** option-only required facts were added — the memo's own `prbChargeType` and `prbOutcome` — and `disposition_date` was reused as the seven-year anchor. Nothing asks whether the participant holds a document. **Subsection 1** → `guidance_only`, payment closed structurally before the timing gate, told the court seals it and they file nothing; no petition, order, declaration or instructions planned. **Subsection 2** → one route identity, the four components planned, the seven-year rule executed (inside it: `not_yet`, not `needs_review`), commercial eligibility unchanged and still closed for want of a Grade-A record. **Unresolved** → `needs_more_info` naming both questions, never `guidance_only`, and composition refuses naming every component it would have dropped. `verify-nevada-176a-branch.mjs`: 76 checks over all 24 answer combinations; four mutations each red it (unresolved→automatic 16 failures; condition always true 6; facts out of the Checkout gate 1; guidance gate removed 8, where subsection 1 then reports `packet_ready_with_caution`). NV moved 5/5 → 7/7 facts in the §6.1 pre-Checkout gate. Recorded in `2026-09-19-nv-176a-branch-trigger-established.json`. The IL family builder carried the same silent-drop filter and now refuses through the shared planner |
| GA-5-NV document and route remediation | 3 | **Closed.** Every Nevada-specific requirement now passes its own targeted checks: the subsection 2 branch trigger resolved before Checkout from two source-backed facts; the subsection 3 bar as a route-safety gate barring both branches; required-fact completeness reconciled against the owner-adopted field map (5 generated · 11 participant-completable blanks · 4 signature · 2 court-owned · 3 route-eligibility, zero unnecessary questions); EN/ES parity across all three questions, every option, missing-field copy and all four engine reason texts; the adopted text recovered into the specification so the **specification is what composes**; the declaration's requirement state settled as `conditional` from the family's own record under the adoption's Q7 rule; and caption treatments bound to the adopted artifact — petition and order `full_independent_caption`, declaration `supporting_page`. **Nevada composes and renders on both branches** (34,112 bytes) and refuses when the branch is unestablished. 131 checks, seven mutations. Nevada's *commercial* availability is tracked separately above and remains unresolved; an unrelated caption question in another jurisdiction does not reopen this row |
| GA-5-WY derivation repair (1 of 8) | 3 | **First repaired family.** Wyoming 7-13-1502's five components carried `approved_shipping_component` — a description of an approved component and none of its text — so the route composed nothing. Repaired by transcription from the host **proven** to reproduce the adopted bytes (route A), with every substantive line additionally checked back against the adopted PDF: **74 of 74 verbatim** on the four pleadings, **32 of 32** on the guidance page. Ownership bound to the approved field map, not invented: 9 platform-generated writes, **28 participant-completable blanks**, 5 signature fields, 4 court/notary fields. Caption treatments read page by page from the adopted artifact, and **the new invariant caught my own error**: I had set all four pleadings to `full_independent_caption`, but adopted pages 5 and 6 show the verification and certificate of service carry only a docket line, so both are `supporting_page` — the Nevada declaration pattern again. The adopted caption needed a real generalisation: WY's is two court lines plus a docket line, which the single-slot contract could not hold without moving the county out of the caption, so `captionContract.courtLines` now carries the adopted caption lines explicitly. **Renders at 22,535 bytes, 23 printed blanks, zero leaked tokens.** MS and Nevada render byte-unchanged |
| GA-5-CAPTIONS caption treatment is a component contract, not a presentation | 3 | **A shared renderer defect, fixed once before the state batches multiplied it.** The Grade-A renderer held that every `presentation: pleading` component must carry its own caption. That is true of some filings and false as a universal: of 51 court-facing components, **42 declare no caption section**, and they are not one kind of thing — some take their caption from an official form, some are supporting pages filed with a captioned instrument, some lost a caption in derivation. A rule keyed on presentation can only be satisfied where it does not fit by manufacturing a caption or relabelling a filing as guidance, and both are forbidden. So §4.2 gained `captionTreatment` (`full_independent_caption` · `supporting_page` · `official_form_controls` · `not_applicable` · `unresolved`), derived only where a source field states it and **never inferred from presentation**. The invariant is now *court-facing + unresolved treatment refuses*, checked over every document before anything is drawn rather than inside the pleading path, so a court-facing component presented as guidance cannot escape it. **Nevada, from the adopted output itself**: `pdftotext` over the census-v1 canonical fixture shows the adopted packet is nine pages carrying all eight components, with page 4 (petition) and page 6 (order) each fully captioned and **page 7 (the declaration) carrying none** — it opens "This declaration accompanies the subsection 2 petition". FIX07 independently records page 7 as `declaration_and_verification`. The adoption therefore establishes the behaviour, and `supporting_page` is encoded for it. No caption invented, nothing relabelled. **Bounded classification**, two evidence rules only: a component whose own composition emits a caption today is proven to carry one; a source field that states the answer supplies it. A packet-level caption test was run and **discarded as a classifier** — it says 12 of 13 families' artifacts contain a caption somewhere, which is true and useless, because Nevada is the counterexample inside its own packet. Result: `full_independent_caption`=7, `official_form_controls`=3, `not_applicable`=5, `supporting_page`=1, `unresolved`=35. The invariant caught **the live MS non-conviction route and the IL felony-prostitution family** before it landed; both are recorded from their own observed output and render byte-unchanged. `verify-caption-treatment-contract.mjs`: two positives (an independently captioned filing renders; an approved supporting page with no caption renders, in the same packet, still court-facing rather than reclassified) and two negatives (unresolved court-facing refuses; a declared-but-missing caption refuses as a derivation defect) — because an invariant that only refuses is satisfied by refusing everything. Recorded in `2026-09-20-caption-treatment-contract.json` |
| GA-5-NV adopted text recovered, declaration requirement state settled | 3 | **The declaration's requirement state was the gate, and it is settled from the adoption record itself rather than inferred.** `nv_seal_probation_family-set` sits under the 2026-09-02 general qualification and is named in **none** of the eight withholding answers (the only NV family named anywhere is the trafficking route, under Q2). **Q7 is on point**: the owner ruled that a component's requirement state comes from the family's own record and that changing it takes a new legal-design decision. This family's record declares the declaration `conditional`, "Accompanies the subsection 2 petition" — and the adopted build script and the specification carry the identical rule. So the exact rule was encoded, and it is now locked: mutation-proven that promoting it to `required` reds the control, as does any drift between a component's declared and encoded requirement state. **Correction to my earlier framing**: "permitted rather than compelled, flagged as a counsel question" conflated authority with requirement state. That the sections prescribe no verification is faithfully expressed already by `custom_document_permitted` and `executionType: signature` rather than `sworn_notarised`; the requirement state was never unresolved. **Transcription**: the four bodiless kinds, plus the petition's six numbered paragraphs, its use restriction, and the order's operative text — all lost in derivation — carried across verbatim in substance. Nothing redrafted, no new allegation, component set unchanged (`referral_instructions` deliberately untouched: it already composed from a top-level block). Runtime authority moved out of the build script: **the specification is what composes**, 8 documents on the petition branch and 4 on the automatic branch. **Captions**: an explicit `captionContract` — in-the-matter-of, with the court and case number drawn as ruled lines carrying their instructions, never an empty value, never a placeholder, and no new question invented to fill them. Control 102 → **131 checks**; three further mutations red it (declaration promoted to required 2; caption pointed at a fact instead of the blank 1; adopted branch-screen text replaced by a heading 2) |
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
