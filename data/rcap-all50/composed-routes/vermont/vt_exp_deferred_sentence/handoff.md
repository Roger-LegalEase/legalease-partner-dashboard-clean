# Handoff — Records cleared after completing a deferred sentence (vt_exp_deferred_sentence)

## Authority

- 13 V.S.A. § 7041(a) — deferred sentence
- 13 V.S.A. § 7041(e) — the expungement duty on discharge, and the restitution proviso
- 13 V.S.A. § 7041(h) — the confidential VCIC special index for registrable sex offences
- 28 V.S.A. § 204 and § 204a — presentence investigation, the purpose for which the § 7041(h) index stays accessible
- Contrast only: 13 V.S.A. chapter 230, the expungement-and-sealing chapter Act 60 amended. Section 7041 sits in chapter 221 and was not amended by Act 60.

## Mechanism

On fulfilment of the terms of probation and of the deferred sentence agreement the court shall strike the
adjudication of guilt and discharge the person. Except as provided in subsection (h), the record of the
criminal proceedings shall be expunged on discharge from probation, absent a finding of good cause by the
court, and the court shall issue an order to expunge all records and files related to the arrest, citation,
investigation, charge, adjudication of guilt, criminal proceedings and probation. Copies go to each agency,
department or official named in it. Notwithstanding the subsection, the record is not expunged until
restitution has been paid in full.

Venue recorded: the Criminal Division of the Vermont Superior Court that entered the deferred sentence and
discharged the person from probation.
Destination recorded: on the ordinary path the court acts on its own on discharge and the participant
submits nothing; where the order did not issue, the written request goes back to the same court, under the
existing docket rather than as a new case.

## Route decision

Composed route, compositionMode **alternative**. Two registry units, three registry packetSet components,
expressed as **4 units / 4 components**:

| unit | requiredOutput | component |
| --- | --- | --- |
| vt-deferred-automatic-and-verification | participant_instruction | vt_exp_deferred_sentence-verification-and-eligibility-guidance-1 |
| vt-deferred-record-check | official_form_dependency | vt_exp_deferred_sentence-record-check-0 (synthesized id) |
| vt-deferred-written-request | pleading_document | vt_exp_deferred_sentence-written-request-to-court-2 |
| vt-deferred-handoff-instructions | participant_instruction | vt_exp_deferred_sentence-handoff-instructions-3 |

One custom pleading is drafted. The registry unit vt-deferred-written-request declares outputStrategy
`custom_pleading`, outputStrategyStatus `resolved`, packetIdentity `identified`, and states in terms:
"There is no Judiciary form for this request; the statute supplies the destination, the court, the
operative facts and the relief, which is what makes a controlled pleading supportable rather than a guess."
None of the ten Vermont forms catalogued in the committed state pack has that role.

The ordinary path stays guidance. Scope restriction on this track: "Deferred sentence expungement is
court-driven on discharge and requires no petition. Anyone who completed a deferred sentence should not be
sold a petition packet."

One official-form dependency: Form 200-00331, Request for Criminal Record Search — the check that answers
whether the order issued. Not drafted, not acquired.

No proposed order is drafted. Section 7041(e) makes the order the court's own act and provides that copies
go to each agency, department or official named in it; drafting one would invent whom it names.

No agency request letter is drafted. The two agency contacts recorded — the clerk for the discharge order,
the Restitution Unit for a balance statement — are both recorded as made by asking, with no letter or form
named.

The document is styled a **Request**, never a petition, and the words `petition`, `petitioner`, `seal`,
`sealing`, `sealed`, `destroy`, `destroyed`, `destruction`, `erase` and `annul` are prohibited terms for
the pleading component. Rationale is recorded in the component's qaProhibitedTermsNote.

## Source posture

The compiled VT profile (`src/lib/rcap-engine/compiled/profiles/VT-vermont.json`, sha256 `1a4267ce65b9ddc15a65e086cfba2860d088b06b4cd5ad801bda22514fecf9af`) contains **no occurrence of "7041" or
"deferred"**. It compiles the Wilma Agent Training Reference, which covers 13 V.S.A. chapter 230 sealing
and expungement and 33 V.S.A. § 5119 only. Every legal proposition in this route comes from the pinned
registry entry. The profile and the committed Vermont state pack are used only for the Vermont court
identity, the Judiciary form catalogue, and the Act 60 terminology guardrails they do record.

The state pack's `filing-instructions.ts` describes the **chapter 230 petition** workflow — stipulation,
prosecutor response, victim notice, the $90 DUI sealing fee, forms 200-00129 / 200-00130 / 200-00132. None
of it was imported into this chapter 221 route; the registry `rules` govern, and they state no fee, no
service, no notice by the participant, and no petition.

## Open counsel flags

- **vt-deferred-order-timing-unknown** (release_blocker) — How long after discharge a Vermont court in practice enters the § 7041(e) expungement order is not established, and therefore the point at which a participant should be told the order is genuinely missing rather than merely pending is unknown. No interval, deadline or 'wait N weeks' statement appears anywhere in this route's participant copy.
  - Must confirm: The practice interval after discharge before a § 7041(e) order should be treated as missing.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].releaseBlockers[0]; .unresolvedQuestions[0]
- **vt-deferred-instrument-label** (counsel_confirmation) — Terminology tension inside the pinned entry. The scope restriction states that this relief is court-driven, requires no petition, and that "anyone who completed a deferred sentence should not be sold a petition packet"; the unit description calls the instrument a "controlled written request". The same entry's manualCompletionItems nevertheless refers to "the petitioner's signature and date on the written request". This route styles the instrument a Request and the signer the Requester, and prohibits the words petition and petitioner in the document text, so the product can never read as a petition packet.
  - Must confirm: The label a Vermont Criminal Division expects on a § 7041(e) request, and whether 'Requester' is acceptable.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].scopeRestrictions[0]; .units[1].description; .packetSet.manualCompletionItems[0]
- **vt-deferred-caption-format-unconfirmed** (counsel_confirmation) — No source read for this track states an accepted caption for a § 7041(e) request. The venue recorded is functional — "the Criminal Division of the Vermont Superior Court that entered the deferred sentence and discharged the person from probation" — and the filing rule is that the request goes in under the existing docket rather than as a new case. The caption is a token pattern filled only from the participant's own countyOfCase and docketNumber answers; the '{county} Unit' form is taken from the committed Vermont state pack's own sample ("Vermont Superior Court, Criminal Division (Chittenden Unit)") and from the state pack filing instruction to file in the Criminal Division for the county that handled the case.
  - Must confirm: The caption a Vermont Criminal Division accepts on a § 7041(e) request filed under an existing docket.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].venue; .rules.filing; statePack:sample-data.ts filingCourt; statePack:filing-instructions.ts[4]
- **vt-deferred-party-structure-unstated** (counsel_confirmation) — No source read for this track supplies a party structure for a § 7041(e) request. presentation.sovereignPartyName, sovereignPartyProper, sovereignRole and movantFirstInCaption are all null. Nothing in the sources makes the State a respondent to this request, and § 7608 victim notice is recorded as not attaching because it is triggered by a chapter 230 petition.
  - Must confirm: Whether the request is captioned in the existing State v. Defendant criminal case and, if so, how the parties are styled.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].rules.notice; .rules.filing
- **vt-deferred-verification-unaddressed** (counsel_confirmation) — No source read for this track states whether a § 7041(e) request must be verified or sworn. The registry states only that notarization is "Not required." and that the participant signs the written request. verificationStatute.citation is left null and no verification block is rendered, rather than a verification form being invented. This is the handling the ND config applies to its own missing verification statute.
  - Must confirm: Whether the request must be verified or sworn, and in what form, before shipping.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].rules.notarization; .rules.participantSignature
- **vt-deferred-no-proposed-order** (counsel_confirmation) — No proposed order is drafted. Section 7041(e) makes the expungement order the court's own act — "the court shall issue an order to expunge all records and files" — and provides that copies go to each agency, department or official named in it. No Judiciary form for that order is recorded on this track and no source states an order is tendered with the request. Drafting one would invent which agencies, departments and officials the order names and what each must do.
  - Must confirm: Whether a Vermont Criminal Division expects a tendered order with a § 7041(e) request, and if so what it says and whom it names.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].authority[1]; .packetSet.components; .rules.notice
- **vt-deferred-restitution-is-a-statutory-bar** (self_help_boundary) — Restitution paid in full is a statutory bar on the relief, not merely a document the participant gathers: "the record is not expunged until restitution has been paid in full." Nothing in this route may be produced, and no request may be sent, on an unpaid balance. Whether restitution is paid is the participant's own answer, checked against a Restitution Unit statement.
  - Must confirm: That no pipeline stage produces the request while restitution is outstanding.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].legalDesignLimitations[classification=required_before_filing]; .exclusions[1]; .waitingPeriods[1]
- **vt-deferred-7041h-special-index** (self_help_boundary) — Subsection (h) requires VCIC to retain a confidential special index of deferred sentences for sex offences requiring registration, listing name, date of birth, offence and docket number, accessible only by the VCIC director and one designated staff person for presentence-investigation purposes. The index survives the expungement, and a registrable sex offence is a self-help stop condition on this track. The participant must be told the index survives.
  - Must confirm: That screening routes a registrable sex offence out of automated assistance before any document is produced.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].authority[2]; .legalDesignLimitations[classification=packet_instruction][0]; .selfHelpStopConditions[1]
- **vt-deferred-good-cause-finding** (self_help_boundary) — Section 7041(e) makes the expungement mandatory only "absent a finding of good cause by the court." A court that has made, or signals it will make, a good-cause finding against expungement is a self-help stop condition. Nothing in this route asserts that no good-cause finding exists or will be made, and nothing predicts how the court will rule.
  - Must confirm: That a good-cause signal ends automated assistance rather than producing a request.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].selfHelpStopConditions[0]; .exclusions[4]
- **vt-deferred-act60-terminology** (scope_restriction) — After 2025-07-01 Vermont is a sealing state, not an expungement state, and participant-facing copy must not use expungement as the umbrella term. Expungement is nevertheless the correct and only term for THIS relief: § 7041 sits in chapter 221, was not amended by Act 60, and its operative words are "the record of the criminal proceedings shall be expunged." The words sealing and sealed are prohibited in this route's document text precisely so the chapter 221 relief is never blurred with the chapter 230 sealing route.
  - Must confirm: That routing copy elsewhere in the product does not present this track as the general Vermont expungement route.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].legalDesignLimitations[classification=packet_instruction][1]; .mechanism; statePack:safety-language.ts vtPlainLanguage.sealingFirstExpungementNarrow
- **vt-deferred-no-petition-packet** (scope_restriction) — Scope restriction on this track: "Deferred sentence expungement is court-driven on discharge and requires no petition. Anyone who completed a deferred sentence should not be sold a petition packet." Unit 1 exists to catch this first: on the ordinary path the participant files nothing and the pleading component is not produced at all.
  - Must confirm: That orderIssued gates production of the written-request component, and that no chapter 230 petition is offered to a deferred-sentence participant.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].scopeRestrictions[0]; .legalDesignLimitations[classification=scope_restriction]
- **vt-deferred-federal-records** (packet_instruction) — Expunged and sealed Vermont records may still appear in a federal criminal background check. Vermont relief does not reach federal records even though VCIC notifies the FBI's National Crime Information Center. No participant copy in this route promises a clean background check.
  - Must confirm: That the federal-records disclosure is carried in participant copy wherever a result is described.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].packetInstructions[2]; statePack:filing-instructions.ts[7]
- **vt-deferred-form-200-00331-not-acquired** (release_blocker) — Form 200-00331, Request for Criminal Record Search, is the official Judiciary form the registry names for the record check that tells the participant whether the order issued. It is not drafted here. The committed Vermont state pack records it with blankPdfInSource false — it is documented in the source inventory but no blank official PDF is present locally.
  - Must confirm: Acquire the current official Form 200-00331 before any record-check step is produced for a participant.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].packetSet.participantFilingRequirements[2]; .officialSources[2]; statePack:official-forms.ts[formId=200-00331]
- **vt-deferred-profile-silent-on-7041** (counsel_confirmation) — The compiled VT profile does not mention 13 V.S.A. § 7041, deferred sentences, or any deferred-sentence pathway anywhere. It compiles the Wilma Agent Training Reference, which covers chapter 230 sealing/expungement and 33 V.S.A. § 5119 only. Every legal proposition in this route comes from the pinned registry entry; the profile and state pack supply only Vermont court, form and terminology facts they actually record.
  - Must confirm: That the Vermont routing table is updated so a deferred-sentence participant reaches this track and not the chapter 230 petition routes the profile does describe.
  - Source: profile:src/lib/rcap-engine/compiled/profiles/VT-vermont.json (no occurrence of '7041' or 'deferred'); registry@3b6f4c1:tracks[vt_exp_deferred_sentence].legalDesignLimitations[classification=scope_restriction]
- **vt-deferred-source-sha-missing** (source_gate) — Every official source recorded for this track has a null sha256, so staleness cannot be detected. The statute was read at source on 2026-08-06 and the entry was reviewed as of 2026-08-01.
  - Must confirm: Record source hashes before this route leaves internal review.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].officialSources[].sha256; .blockers[kind=source_gate]
- **vt-deferred-legal-status** (release_blocker) — Track legalStatus is 'legal_review_pending' and legalDesignStatus is 'legal_design_approved_with_limitations'. Runtime is disabled: "Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding."
  - Must confirm: Output review, visual review and technical proof before this route leaves internal review.
  - Source: registry@3b6f4c1:tracks[vt_exp_deferred_sentence].legalStatus / .legalDesignStatus / .runtimeDisabledReason / .blockers

## Blocked dependencies (mandatory official-form handoffs)

- **Form 200-00331, Request for Criminal Record Search (rev. 05/2026)** — Vermont Judiciary. Not acquired;
  the committed state pack records it with `blankPdfInSource: false`. Exact missing source: current
  official PDF at
  https://www.vtcourts.gov/sites/default/files/documents/200-00331%20%E2%80%93%20Request%20for%20Criminal%20Record%20Search.pdf
  Owning lane: lane-D/E official-source acquisition.

No other official form is required by this route. The § 7041(e) order itself is the court's own instrument,
not a participant form.

## F-review pointers

- Registry implementationQueue: `D_composed_or_process_guidance`
- Registry legalStatus: `legal_review_pending`; legalDesignStatus: `legal_design_approved_with_limitations`
- counselConfirmationRequired: false; counselQuestions: empty; openLegalQuestions: empty; buildBlockers: empty
- Runtime disabled reason: "Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding."
- Registry blockers:
  - [output_review_gate] Output review pending: counsel approved the design, not the produced document.
  - [visual_review_gate] Visual review not started.
  - [technical_proof_gate] Technical proof not started.
  - [release_blocker] Open question blocks release (participant_instructions): how long after discharge Vermont courts in practice enter the § 7041(e) order, and therefore when a participant should be told the order is genuinely missing rather than merely pending.
  - [source_gate] One or more official sources have no recorded SHA-256, so staleness cannot be detected.
- Legal-design limitation provenance file: `VT__LEGAL-REVIEW__STATEWIDE__vermont-record-clearing-legal-review__ASOF-2026-08-01__EN.md`, headings "VT-EXP-02: Deferred sentence expungement", "HEADLINE FINDING", "LIMITATION CLASSIFICATION", "4.3 VT-EXP-02, deferred sentence".

## Provenance

- Registry pin: `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` (data/record-clearing/legal-design-track-registry.json :: tracks[trackId=vt_exp_deferred_sentence])
- Compiled profile: `src/lib/rcap-engine/compiled/profiles/VT-vermont.json` (sha256 `1a4267ce65b9ddc15a65e086cfba2860d088b06b4cd5ad801bda22514fecf9af`)
- State pack: `src/lib/rcap/state-packs/vermont/index.ts`, `src/lib/rcap/state-packs/vermont/all50-build-metadata.ts`, `src/lib/rcap/state-packs/vermont/filing-instructions.ts`, `src/lib/rcap/state-packs/vermont/official-forms.ts`, `src/lib/rcap/state-packs/vermont/fee-notes.ts`, `src/lib/rcap/state-packs/vermont/eligibility-rules.ts`, `src/lib/rcap/state-packs/vermont/safety-language.ts`, `src/lib/rcap/state-packs/vermont/sample-data.ts`
- Registry reviewedAsOf: 2026-08-01; effectiveFrom: 2019-06-19; statute read at source 2026-08-06

## Dependency-deferral correction candidate evidence

- Candidate status: `candidate_ready_for_independent_review` **if and only if the assigned record-check treatment and its canonical fixture pass together**.
- Candidate evidence added for `vt_exp_deferred_sentence-record-check-0`: exact Vermont Judiciary Form 200-00331 identity and 05/2026 revision, official Judiciary and county Criminal Division destinations, record-search purpose, participant gather/do-not-file directions, packet absence, and Briefcase/payment/checkout/credit treatment.
- The component evidence file pins the committed `dependency.json` SHA-256 and frozen assignment SHA-256; its canonical fixture expects no charge, unavailable checkout, no credit consumption, and a required Briefcase handoff.
- Evidence gaps intentionally retained: the blank official Form 200-00331 is not present locally, its SHA-256 is not recorded, current submission and court-cost details require confirmation from the county Criminal Division, and the search result that determines whether the order issued must come from the court.
