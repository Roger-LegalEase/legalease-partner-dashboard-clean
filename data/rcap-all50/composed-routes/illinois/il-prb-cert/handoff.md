# Handoff — il-prb-cert (IL, lane C1, composed route)

Job `T-C-IL-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry entry `tracks[142]`

## Authority

| Citation | What it supplies |
| --- | --- |
| 20 ILCS 2630/5.2(e-5) | Certificate of eligibility for **sealing** — the stage-1 sealing branch |
| 20 ILCS 2630/5.2(e-6) | Certificate of eligibility for **expungement** — the military branch, and the blocked non-military branch |
| 20 ILCS 2630/5.2(d)(2) | Attachment of the issued certificate to the stage-2 Request; the Request's verification and perjury warning |
| 730 ILCS 5/3-3-2(a)(10) | The Prisoner Review Board power under which the certificate function sits |
| 730 ILCS 5/5-5.5 | The certificates article of the Unified Code of Corrections |
| Ill. S. Ct. R. 298 | Not relief authority. Fee waiver; § 5.2(d)(1) requires no fee where a Rule 298 order is obtained |
| 20 ILCS 2630/5.2(d)(4) | Not relief authority. The clerk serves at stage 2; the participant serves no one |
| PRB *Guidelines for Certificate of Sealing*, rev. 09/18/2024 | Not a statute. The acknowledgement-first rule, the narratives, the notarised declaration, the documentation list, the 75-day deadline, the proof-of-delivery requirement, the four-year bar |

Official sources on the track: 20 ILCS 2630/5.2, Public Act 104-0459 (Clean Slate Act), the Approved Statewide Forms page, the EXP-AD Request PDF, the ISP fee schedule. **All five carry `sha256: null`.** The Board Guidelines and the four Board AcroForms are cited throughout the entry but **do not appear in `officialSources` at all** — no URL, no hash.

## Mechanism

Two stages before two different bodies. Stage 1 is a discretionary agency application to the Prisoner Review Board for a certificate of eligibility — for sealing under § 5.2(e-5) or expungement under § 5.2(e-6). Stage 2 is a circuit-court petition on the mandatory statewide adult suite with the certificate attached under § 5.2(d)(2), filed with the Chief Judge of the circuit of conviction, a judge that Chief Judge designates, or in counties under 3,000,000 the presiding trial judge.

## Route decision

**Composed, `compositionMode: mixed`. Five units. Zero pleading documents drafted.**

That last point is the headline. Every available unit on this route carries `outputStrategy: official_pdf_fill`. There is nothing for lane C to draft as a pleading, and drafting one at stage 2 would be affirmatively wrong — the Supreme Court Commission on Access to Justice approved the adult suite and all Illinois courts must accept it.

| # | Unit | Output | Components | Status |
| --- | --- | --- | --- | --- |
| 1 | `il-prb-cert-certificate-application` (parent) | `participant_instruction` | `il-prb-cert-stage1-orientation-0` *(constructed)* | Built |
| 2 | `il-prb-cert-sealing-branch` | `official_form_dependency` | `il-prb-cert-primary-filing-1`, `il-prb-cert-attachment-2` | Dependency recorded |
| 3 | `il-prb-cert-military-branch` | `official_form_dependency` | `il-prb-cert-primary-filing-3`, `il-prb-cert-attachment-4` | Dependency recorded |
| 4 | `il-prb-cert-nonmilitary-expungement-branch` | `official_form_dependency` | `il-prb-cert-nonmilitary-expungement-6` *(constructed)* | **Blocked** |
| 5 | `il-prb-cert-court-petition` | `official_form_dependency` | `il-prb-cert-primary-filing-5` | Dependency recorded |

Units 2, 3 and 4 are mutually exclusive branches under parent unit 1. Unit 5 is sequential after whichever branch produced a certificate. Two componentIds are constructed and both are marked as such: the registry gives unit 1 no component (it is parent framing) and unit 4 none (it generates no packet).

## Mandatory official-form handoffs (5 forms, all lane D)

1. **PRB Certificate of Sealing Application** — rev. 09/18/2024, fillable AcroForm
2. **PRB Certificate of Sealing Eligibility Acknowledgement** — undated
3. **PRB Certificate of Expungement for Military Application** — v9.18.24
4. **PRB Certificate of Expungement for Military Eligibility Acknowledgement** — undated
5. **EXP-AD Request** (Request to Expunge and/or Seal Criminal Records) — the mandatory statewide adult form

None of the four Board forms carries a public URL or a hash in the registry entry; all four have Nationwide corpus paths. The EXP-AD Request has a public URL and no hash. The stage-2 suite travels as a set (Case List, Additional Cases ×2, Notice of Filing, Order, Order Denying, Certificate of Service by Circuit Clerk, Rule 298 Fee Waiver) and the registry names only the Request — scoping which of those this track needs is a lane-D question.

## The blocked unit

`il-prb-cert-nonmilitary-expungement-branch` — a participant seeking a **non-military** certificate of eligibility for **expungement** under § 5.2(e-6).

Exact missing source: `registry@3b6f4c1:tracks[142].releaseBlockers[2]` / `unresolvedQuestions[2]`, affectedElement `correct_form`, classificationBasis `explicit_state_addendum`, sourceFile `LegalEase-Illinois-Legal-Review-2026-07-30.md`, sourceHeading `TRACK K` — *"no general non-military expungement-certificate application was located on the Board's site. That branch alone is held."*

Owning lane: **D**, contingent on **F** first. The track's `implementationQueue` is `F_source_problem`. Lane D cannot acquire a form until lane F establishes whether one exists; if none does, it is a lane-E legal-design question. Lane C drafts nothing either way — the Board publishes its own forms for both sibling branches, so a bespoke application would invent a vehicle.

**The dangerous failure mode is the fall-through.** The military Certificate of Expungement is the only expungement-certificate form that exists, so the obvious wrong move is to route a non-military participant onto it. That is expressly forbidden and is hard-blocked in `dependency.json` for both military components, called out in the route's `hardRoutingConstraint`, and exercised as the primary defect in `fixtures/negative.json`.

## What is deliberately absent

- **Any drafted pleading, application or replica.** All five forms are official.
- **Any field map.** Lane D territory; unit 4 explicitly asserts none.
- **Agency request letters.** No unit is classified `agency_request_letter`. The record-gathering steps are all described as things the participant obtains in person or by request, with no written request document recorded for any of them.
- **Cover sheet.** None recorded by any source. The one transmittal requirement — proof of delivery to the sentencing/chief judge and the State's Attorney — is a manual completion item whose form the Board sets.
- **Proposed order, certificate of service.** Stage 1 has no order. Stage 2's are official forms.
- **Every fee figure.** Printed nowhere.
- **Court and clerk addresses.** The Board's Springfield address is the single address anywhere in this route, quoted verbatim from the registry's filing rule.

## Open counsel flags (17)

**Release blockers (3):** cf-01 the missing non-military § 5.2(e-6) application; cf-05 county filing fees with no statewide schedule; cf-06 per-county e-filing availability and self-represented exemptions.

**Scope restrictions (7):** cf-02 the military form must never be offered to a non-military participant; cf-07 stage 1 is a stop condition always, referral to OSAD 866-787-1776; cf-08 the three narratives are participant-authored and sworn on penalty of a Class 3 felony — LegalEase never composes the rehabilitation showing; cf-09 notarisation required, third-party witness/attorney signature left blank; cf-12 the per-case expunge-versus-seal election is barred from auto-completion; cf-13 hearing date, objection windows and outcomes never asserted; cf-14 every supporting record is participant-obtained and LegalEase never holds it.

**Unstated fields (2):** cf-10 the 75-day deadline against a hearing schedule the participant must look up, and the accepted form of proof of delivery; cf-11 how the four-year bar after a denial is computed and what counts as compelling.

**Route constraint (1):** cf-03 zero pleadings; no lane may substitute a drafted document for any of the five official forms.

**Research note (1):** cf-04 both acknowledgements are published undated, and whether the military acknowledgement carries the same rejection consequence is unstated.

**Gates (2):** cf-15 source freshness — five recorded sources at `sha256: null` plus five uncaptured primary sources; cf-17 `legalStatus: legal_review_pending`, output/visual/technical-proof review outstanding, `implementationQueue: F_source_problem`.

**Source gap (1):** cf-16 the compiled IL profile records nothing about this track.

## F-review pointers

- **F / source gap — the § 5.2(e-6) vehicle.** The single highest-value item on the track. Search the Board's published materials and its rules under 730 ILCS 5/3-3-2(a)(10) and 5/5-5.5 for a non-military expungement-certificate application. If none exists, this becomes a legal-design question: what does the Board actually accept, and does a vehicle exist at all?
- **F / source gap — profile coverage.** The compiled IL profile has zero hits for `5.2(e-5)`, `5.2(e-6)`, `5.2(d)(2)`, `certificate of eligibility` and `Certificate of Sealing`. Its four Prisoner Review Board mentions are all cannabis-pardon context belonging to a different track. Anything reading the profile alone will conclude a § 5.2(a)(3)-excluded record has no route at all.
- **F / source freshness — uncaptured primaries.** Five sources at `sha256: null`, and the *Guidelines for Certificate of Sealing* rev. 09/18/2024 plus all four Board AcroForms are cited but absent from `officialSources` entirely. Add them with URLs and hashes.
- **F / source freshness — effective dates.** `effectiveFrom` is 2026-06-01. The profile records most Clean Slate provisions taking effect June 1 / June 30, 2026, the sealing wait shortening from 3 to 2 years on June 30, 2026, and automatic sealing not starting until January 1, 2029, phasing through 2034. Confirm the § 5.2(e-5) and § 5.2(e-6) text against the post-amendment statute.
- **F / fee data.** No statewide schedule. The registry gives roughly $60–$235 with McLean at $136; the profile decomposes that as $60 filing + $60 ISP + $16 for four certified copies and adds a Cook County single-fee-per-day rule. Whether the **Board** charges anything at stage 1 is not addressed anywhere.
- **F / suite scoping.** The registry names only the Request for stage 2 while the mandatory suite travels as a set. Which forms this track needs is unresolved.
- **F / military-branch guidelines.** All the procedural rules (acknowledgement-first, 75 days, four-year bar, documentation list, proof of delivery) are recorded once, against the Certificate of Sealing Guidelines. Whether the military branch's guidelines differ is unknown.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/illinois/` — `index.ts`, `all50-build-metadata.ts`, `court-routing.ts`, `filing-instructions.ts`, `eligibility-rules.ts`, `fee-notes.ts`, `safety-language.ts`, `disqualifying-offenses.ts`, `clean-slate-transition.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/IL-illinois.json` (sha256 `ee28d428d52f2c8ae7583b889f8f74aa0a83c5730cf13636b50bc7072e12c169`, profileVersion `2026-06-19-source-conversion-1`)
- Pinned registry entry `tracks[142]` (trackId `il-prb-cert`)

Unit enumeration comes entirely from the pinned registry entry — see `route.json` → `omissionProof`. The state pack supplies the fee-variability posture, the sealing-versus-expungement vocabulary rule, the Clean Slate warning, the RAP-sheet step, the safety disclaimer and the no-invented-addresses rule. The profile supplies the stage-2 suite enumeration, the ISP Access-and-Review record-gathering step, the fee narrative, the terminology and the copy guardrails.

Build-first internal review material. Not approved for live use.
