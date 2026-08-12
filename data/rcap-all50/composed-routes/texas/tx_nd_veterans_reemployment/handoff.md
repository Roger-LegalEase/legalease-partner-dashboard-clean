# Handoff — tx_nd_veterans_reemployment (TX, lane C1, composed route)

Job `T-C-TX-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry `tracks[422]`

## Authority

| Citation | What it supplies |
| --- | --- |
| Tex. Gov't Code 411.0729 | The section. Misdemeanour + community supervision (incl. deferred adjudication) + successful completion of all conditions + successful completion of a court-approved veterans reemployment programme after the offence + veteran status |
| 411.0729(a) | The court **shall** enter the order after notice to the state and a hearing on best interest of justice. **The statute names no filing party and imposes no petition requirement** |
| 411.0729(b) | The section applies **regardless of** whether the defendant meets the subchapter's other eligibility criteria — so the 411.074 basic conditions do not gate it |
| 411.0745 | The petition procedure where a petition is used: (b) civil filing fee; (c)/(d) OCA prescribes and publishes a form and every clerk site links to it; (e) notice to the state, hearing required unless the state does not request one before the 45th day and the court makes the findings |
| Tex. Code Crim. Proc. ch. 42A, subch. H-1 | The court-approved veterans reemployment programme. Completion after the offence is the trigger |

Not authority for the relief, carried as context: 411.0765 (the agency list to which a sealed record remains available), 411.0735 (violent-or-sexual determination), 411.074 (expressly disapplied), 411.075(b) (the profile's competing citation for the agency list), Tex. R. Civ. P. 145.

Six official sources are recorded on the track. **All six carry `sha256: null`**, and three of them are the forms this route depends on entirely.

## Mechanism

No waiting period. No petition requirement in the section. The court holds a hearing and, unless it finds issuance is not in the best interest of justice, must enter the order. The section was last amended in 2019 and was not touched in 2025 or 2026.

## Route decision

**Composed, alternative.** `outputStrategyDeclared: composed`, `outputStrategy: null` at track level, `compositionMode: alternative`. The registry's two units are genuine alternatives, never both taken:

- **Route A — no filing.** The order the court owes without any petition. `process_guidance`, `packetIdentity: unresolved`. Nothing is filed; no fee arises. The registry's controlling instruction is to **lead with this route**.
- **Route B — the OCA petition.** Where the court requires a petition or did not hold the hearing. `official_pdf_fill`, `packetIdentity: identified`.

`units[]` in `route.json` carries **five** entries against the registry's five `packetSet.components`, one per component; three of the five have no registry `units[]` parent and each says so explicitly with a `registryUnitNote`. See `omissionProof` for the full enumeration.

**This route drafts no pleading document at all.** Every document it produces is an official form and every one is handed off. Lane C's entire output here is two participant-instruction documents, three dependency records, `participant-instructions.md` and `route.json`.

| Unit | Required output | Component | Status |
| --- | --- | --- | --- |
| 1 · no-filing route | `participant_instruction` | `…-no-filing-route-guidance-1` | **Written** + 3 fixtures |
| 2 · OCA model petition | `official_form_dependency` | `…-petition-2` | **Blocked — lane D/E** |
| 3 · OCA model order | `official_form_dependency` | `…-proposed-order-3` | **Blocked — lane D/E** |
| 4 · Rule 145 statement | `official_form_dependency` | `…-fee-waiver-statement-4` | **Blocked — lane D/E** |
| 5 · after-order instructions | `participant_instruction` | `…-after-order-instructions-5` | **Written**, invariant, no fixtures |

## The two findings that matter most

**1. The 411.074 bars must not be imported.** Section 411.0729(b) says the section applies regardless of whether the defendant meets the subchapter's other eligibility criteria. A person barred from **every other** nondisclosure section may still qualify here. Every sibling nondisclosure track points the opposite way, so this is the screening instruction most likely to be lost in a shared flow. It is also the reason `fixtures/boundary.json` on unit 1 deliberately carries a prior conviction and a prior deferred adjudication.

**2. Lead with the no-filing route.** The statute requires no petition. A packet that opens with the OCA petition sells a participant a filing and a county filing fee the statute does not require. The registry states this as a packet instruction and the participant copy is structured around it — Route A first, Route B only on `courtRequiresPetition = yes`.

## What is deliberately absent

- **Any drafted petition or order.** Both are OCA statewide model forms, classified `official_pdf_fill` with `packetIdentity: identified`. Drafting an order would invent the operative terms of a nondisclosure order, including which agencies DPS must notify.
- **Any certificate of service or proof-of-receipt document.** The **court** notifies the state. The OCA instructions separately direct the petitioner to show proof the district attorney received a copy — the registry records both facts and reconciles neither, and names no county in which the filer must deliver. Participant copy tells them to ask the clerk.
- **Any assertion of the hearing, the best-interest finding, the state's 45-day decision, the prosecutor's position, entry of the order, or DPS's sealing and notification acts.** All blank in every fixture.
- **Any fee figure.** No fee arises on Route A. On Route B the fee is county-specific and unquantified in both sources.
- **Any statement that the participant may deny the matter.** They may not, in the 411.0765 contexts.
- **Any cover sheet or agency request letter.** Neither source records one; creating either would exceed the source.
- **Fixtures on unit 5.** The after-order document carries no variable field at all — no name, no cause number, no court, no date. Nothing to fixture, stated as such in `route.json`.

## Open counsel flags (17)

**Release blocker (1).** The OCA model petition and order carry a **February 2022** revision and the Overview February 2024, confirmed from the document footers on 2026-08-06. Neither has been revised for the 2023 recodification of expunction into Chapter 55A or the 2025 amendment to Gov't Code 411.0728. Both must be pulled at current revision before release, and no statutory cross-reference may be reproduced from a 2022 form without checking it. The **order** is the most exposed document, because its recitals are where a stale cross-reference would be carried verbatim into a signed court order.

**Official-form dependency (1, covering three forms).** OCA model petition, OCA model order, Rule 145 Statement of Inability. All three `sha256: null`.

**Source gates (2).** Six unhashed official sources; the compiled TX profile does not record this section at all.

**Scope restriction (1).** 411.074 does not apply.

**Packet instructions (5).** Lead with the no-filing route; OCA forms are models not mandates; one order per offence, told before payment; sealed not destroyed and not deniable in the 411.0765 contexts; no fee figure ever printed.

**Counsel confirmations (4).** 411.0765 vs 411.075(b); notice/hearing/45-day window as court and state acts; the proof-of-receipt-by-the-DA conflict; the three participant-obtained documents LegalEase never handles.

**Participant question (1).** Venue is the sentencing court, not the county of arrest.

**Self-help boundaries (1 flag, 8 conditions).** Including the unresolved tension noted below.

**Gate (1).** `legalStatus: legal_review_pending`; `legalDesignStatus: legal_design_approved_with_limitations`; `implementationQueue: F_source_problem`.

## F-review pointers

- **F / the compiled profile does not know this section exists.** `profile:sourceSections[1]` enumerates the Gov't Code ch. 411 subtypes and names four — 411.072, 411.0725, 411.0735 and the first-offence DWI provisions. Full-value scans return zero hits for `411.0729`, `veterans reemployment` and Subchapter `H-1`. Its nine pathways include no veterans-reemployment route. This track rests entirely on the pinned registry entry.
- **F / a live internal contradiction the sources do not resolve.** The track records a self-help stop condition for *"any prior conviction or deferred adjudication other than a fine-only traffic offence, where the target section carries a first-time-offender condition"*, while 411.0729(b) expressly disapplies the subchapter's other eligibility criteria. Whether that stop is a legal bar here or a prudential one changes who gets a packet. Same question for the family-violence stop. This is the highest-value counsel question on the track.
- **F / two citations for one agency list.** Registry says Gov't Code **411.0765**; the profile says **411.075(b)**, twice, including in its sample nondisclosure prayer. Nothing here reproduces either as an operative recital — no order text is drafted — but the OCA model order will have one, and it should be checked against whichever section is right.
- **F / form staleness is the release gate.** Three forms, three unhashed URLs, two carrying 2022 footers, on a route that produces nothing else. Acquiring and hashing them is the only work that moves this track.
- **F / two service rules that do not agree.** `rules.service` says the court notifies the state and the filer serves only where local practice requires; `rules.notice` says the OCA instructions direct the petitioner to show proof the DA received a copy. Both are recorded, neither is reconciled, and the OCA instruction sheet is itself one of the stale documents.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/index.ts`, `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/all50-build-metadata.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/TX-texas.json` (sha256 `2820312fd974151afe465d6f04d0454b4a5c3cc991982142bd0e3ab9c3a297df`, profileVersion `2026-06-19-source-conversion-1`)
- Pinned registry entry `tracks[422]` (`trackId=tx_nd_veterans_reemployment`)

The committed Texas state pack records build metadata and the Nationwide inventory only, and its `officialFormInventory` contains neither OCA nondisclosure form. Every filing step in `participant-instructions.md` and in both component documents comes from the track's `mechanism`, `rules`, `packetInstructions`, `packetSet.participantActionRequired`, `participantFilingRequirements`, `manualCompletionItems` and `selfHelpStopConditions`, corroborated where noted by the compiled profile's nondisclosure framing (`profile:sourceSections[1]`, `[4]`, `[8]`, `[11]`).

## Dependency-deferral correction candidate evidence

- Candidate status: `candidate_ready_for_independent_review` **if and only if all three assigned component treatments and their canonical fixtures pass together**.
- Candidate evidence added for:
  - `tx_nd_veterans_reemployment-petition-2` — exact Section 411.0729 OCA model-petition absence, OCA and sentencing-court destinations, conditional petition-route directions, current-copy/hash/field-placement gaps, and the model-not-mandatory-or-promulgated distinction.
  - `tx_nd_veterans_reemployment-proposed-order-3` — exact Section 411.0729 OCA model-order absence, current-copy/hash/field-placement gaps, model-not-mandatory-or-promulgated distinction, unreconciled agency-list citation, and judicial terms left wholly to the court.
  - `tx_nd_veterans_reemployment-fee-waiver-statement-4` — exact bilingual Rule 145 statement absence, Supreme Court of Texas destination, current-copy/hash/revision/field-placement gaps, and the distinct status of this form as statewide and promulgated.
- Each component evidence file pins its committed `dependency.json` SHA-256 and the frozen assignment SHA-256; each canonical fixture expects no charge, unavailable checkout, no credit consumption, and a required Briefcase handoff.
- Evidence gaps intentionally retained: current official copies and captured SHA-256 values for all three forms; current revision dates and verified field placements; current petition instructions; the sentencing clerk's petition-versus-no-filing direction and local service practice; and reconciliation of the model order's agency-list citation.
