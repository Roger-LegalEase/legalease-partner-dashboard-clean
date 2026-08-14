# Handoff — Marijuana conviction expungement or resentencing while serving a sentence (mt_mmrta_serving)

## Authority

- Mont. Code Ann. § 16-12-113 — decriminalized acts; petition for expungement, resentencing or redesignation. Subsection (1) is the currently-serving pathway; subsection (2) supplies the presumption, the county-attorney reasonable-basis rebuttal and the public-safety override; subsections (3)-(4) constrain any resentencing.
- Mont. Code Ann. §§ 16-12-114, 16-12-115, 16-12-116 — expungement or resentencing of marijuana conviction court; appointment of a decriminalized marijuana conviction expungement judge.
- Mont. Sup. Ct. AF 22-0129 — order adopting Temporary Rules for MMRTA expungement, resentencing or redesignation (order retrieved; rules text not retrieved).
- I.M. No. 190 (2020); Ch. 576, L. 2021 — the MMRTA as enacted and amended.
- Mont. Code Ann. § 46-18-1110(2)(b) — the person, not the court or clerk, sends the order onward to the arresting agency, prosecutor, clerk and Department of Justice with fingerprints and the DOJ form. This is why the route has a second stage.
- Mont. Code Ann. § 46-18-1103(1) and § 46-18-1110(2)(a) — terminology control: expungement is DOJ-side destruction; what happens at courts, law enforcement and prosecutors is sealing.

## Mechanism

A person currently serving a sentence for an act that is permitted under Title 16, chapter 12, or that is punishable by a lesser sentence under that chapter than the person was awarded, petitions the sentencing court. The court presumes the criteria are satisfied unless the county attorney provides a reasonable basis otherwise, and grants the petition unless it determines that granting it would pose an unreasonable risk of danger to public safety. That public-safety override is unique to this track and does not appear in the subsection (6) completed-sentence pathway — it is the principal reason the two are separate mechanisms rather than branches of one.

Venue recorded: the court that sentenced the participant, on three caption options — Montana district court, justice court, or municipal or city court. Sections 16-12-114 and 16-12-115 additionally permit a designated decriminalized marijuana conviction expungement judge; whether any has been appointed, and what that does to the practical filing destination, is unresolved.

Destination recorded: the sentencing court, then conditionally the Department of Justice (Division of Criminal Investigation, CRISS Expungement, 2225 11th Ave., P.O. Box 201403, Helena, MT 59620; (406) 444-3625; dojcriss@mt.gov).

## Route decision

Composed route, sequential. Two registry stages, expressed as **7 units** and 7 components:

| unit | requiredOutput | component |
| --- | --- | --- |
| MMRTA Form A petition | official_form_dependency | mt_mmrta_serving-primary-filing-1 |
| Certificate of Service | official_form_dependency | mt_mmrta_serving-certificate-of-service-2 |
| Proposed Order | official_form_dependency | mt_mmrta_serving-proposed-order-3 |
| Required attachment set | participant_instruction | mt_mmrta_serving-attachment-4 |
| Filing fee or statement of inability to pay | official_form_dependency | mt_mmrta_serving-fee-waiver-0 (synthesized id) |
| Conditional DOJ CRISS request | official_form_dependency | mt_mmrta_serving-primary-filing-5 |
| Filing and sequencing instructions | participant_instruction | mt_mmrta_serving-instructions-6 |

**No pleading_document unit is drafted.** The adopted packet instruction on this track is explicit: "YES — STAGED OFFICIAL-FORM PACKET. OCA MMRTA Form A is expressly designed for the currently-serving posture. That posture is a scope restriction and a substantive-choice warning, not a reason to downgrade the mechanism to guidance." The Montana state pack records the same conclusion — Montana provides official self-represented packets plus a DOJ removal request, "so these map to official forms rather than a custom pleading."

**No cover sheet is drafted.** Neither source records one. Whether any Montana court imposes a local cover sheet is an unresolved release blocker, carried as a counsel flag rather than a guessed component.

**No agency request letter is drafted.** The DOJ stage runs on the official CRISS form, not a letter.

The fee-waiver unit is the only unit whose componentId is synthesized; the registry records that legal unit as a participant filing requirement and a conditional participant action rather than as a packetSet component.

## Open counsel flags

- **mt-mmrta-serving-af22-0129-temporary-rules-missing** — The AF 22-0129 Temporary Rules text was not retrieved; only the order was. The rules govern procedure for this track and may contain filing, service or hearing requirements not reflected on the OCA forms. Whether the 21-day county attorney response window comes from the rules or is OCA guidance only is unresolved.
  - Must confirm: obtain the rules text and reconcile every filing, service and hearing statement in this route against it.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[0]
- **mt-mmrta-serving-criss-form-version** — The 2023 PDF and the 29 April 2024 DOCX of the CRISS form disagree on the required attachment set; which CRISS enforces in practice is unresolved.
  - Must confirm: the enforced version and attachment set. Fail-closed interim posture: photo ID included by default, certified copy of the judgment requested.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[1]
- **mt-mmrta-serving-local-court-variation** — Whether any Montana district, justice, municipal or city court imposes a local form, cover sheet or addendum is unresolved and material.
  - Must confirm: local practice at the participant's sentencing court. The local-rules lookup is built as a required participant step.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[2]
- **mt-mmrta-serving-no-denial-statement** — No Montana perjury shield or restoration-to-prior-status provision was located. Nothing in this route says anything about denying a cleared record.
  - Must confirm: whether such a provision exists before any denial statement is written.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[3]
- **mt-mmrta-serving-criss-asset-class** — Master Library Edition 1.1 classifies the CRISS form as SUPPORTING_PROCESS / SUPPORTING_FORM, which cannot back an official_pdf_fill component; the DOJ-stage component is recorded as an authority role mismatch.
  - Must confirm: reclassification in a successor edition. Edition 1.1 is not modified.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[4]
- **mt-mmrta-serving-oca-document-id-collision** — The OCA Proposed Order and the OCA Certificate of Service share document ID MT-OCA-MMRTA with two different SHA-256 values; the authority gate records an authority hash conflict.
  - Must confirm: distinct document IDs in a successor edition before either component is resolver-selectable.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[5]
- **mt-mmrta-serving-hearing-default-unresolved** — Whether the § 16-12-113(7) no-hearing default reaches a subsection (1) petition is unresolved; by its terms subsection (7) addresses subsection (5) applications. Form A includes the same hearing election.
  - Must confirm: the scope of subsection (7). The route presents the election as the form does and asserts no hearing outcome.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[6]
- **mt-mmrta-serving-expungement-judge-venue** — Whether any § 16-12-115 judge has been appointed, and what that does to the filing destination, is unresolved.
  - Must confirm: appointment status and its effect on venue. The route names no court.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[7]
- **mt-mmrta-serving-incarcerated-participant** — Custody status alone is an attorney-handoff trigger, and LegalEase does not represent an incarcerated participant in court. How a person in custody obtains records, files and serves was not resolved.
  - Must confirm: the delivery path for an incarcerated participant. Note this track's gating condition is that the participant is still serving, so the trigger fires often.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].releaseBlockers[8]; selfHelpBoundaries
- **mt-mmrta-serving-public-safety-override** — § 16-12-113(2) lets the court refuse relief on public-safety grounds; the override is unique to this track. Nothing in this route authors a public-safety argument.
  - Must confirm: that screening detects when the override is plausibly in play and routes to an attorney.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].legalDesignLimitations[scope_restriction]; manualCompletionItems[2]
- **mt-mmrta-serving-outcome-election** — LegalEase does not choose between expungement and resentencing, and computes no resentencing result.
  - Must confirm: that the election is never pre-selected and no resentencing arithmetic is generated.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].participantQuestions; manualCompletionItems[0..1]
- **mt-mmrta-serving-offence-mapping-boundary** — Mapping historical charging language against the current chapter is the central legal question of the track; the free-text specify-offence path is an attorney handoff.
  - Must confirm: that the free-text path routes to an attorney and never produces a packet.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].legalDesignLimitations[self_help_boundary]
- **mt-mmrta-serving-mlsa-noncommercial** — The MLSA / Access to Justice Commission forms carry a non-commercial-use restriction; Expungement.ai is a paid product, so reproduction is a commercial use.
  - Must confirm: that the fee-waiver unit stays a link-out unless a licence is obtained.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].scopeRestrictions
- **mt-mmrta-serving-filing-fee-unstated** — No filing-fee amount is asserted anywhere. The registry says only that the fee depends on the court level; the state pack records the same source gap.
  - Must confirm: the current fee at each Montana court level. No fee is charged for the CRISS request.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].rules.fees; statePack:fee-notes.ts mtFeeNotes[0], [2]
- **mt-mmrta-serving-court-and-party-identity-blank** — Court name, county, case/docket number, judge, county attorney and county attorney position are blank throughout.
  - Must confirm: that every court and party identity comes from the participant's own answers and paperwork.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].venue / .destination / .generationRequirements
- **mt-mmrta-serving-terminology-control** — Expungement, sealing, removal, and resentencing/redesignation are four different things in Montana and participant copy must keep them apart.
  - Must confirm: every participant-facing string checked against the four-term distinction before release.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].legalDesignLimitations[packet_instruction]; statePack:safety-language.ts
- **mt-mmrta-serving-one-set-per-conviction** — One complete form set per conviction, never a consolidated petition. This is the opposite of the Montana misdemeanour track and the rules engine must not generalise across the two.
  - Must confirm: that the generator emits one unit set per conviction.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].legalDesignLimitations[packet_instruction]; profile marijuana pathway ruleClauses
- **mt-mmrta-serving-legal-status** — legalStatus 'legal_review_pending'; legalDesignStatus 'legal_design_approved_with_limitations'; runtime disabled; implementationQueue F_source_problem; one or more official sources have no recorded SHA-256.
  - Must confirm: output review, visual review and technical proof, plus SHA-256 capture for the sources lacking one.
  - Source: registry@3b6f4c1:tracks[mt_mmrta_serving].legalStatus / .legalDesignStatus / .runtimeDisabledReason / .implementationQueue / .blockers[kind=source_gate]

## Blocked dependencies (mandatory official-form handoffs)

1. **MMRTA Form A — Petition for Expungement, Resentencing, or Redesignation (currently serving)**, Montana Office of the Court Administrator, https://courts.mt.gov/Forms/mmrta. Binary retained (form-a.docx, sha256 968f68c7…003d); no field map and no overlay. Exact missing source: a field-by-field map of the current Form A binary, plus the AF 22-0129 Temporary Rules text.
2. **Certificate of Service — MMRTA Petition**, same publisher and index (sha256 d9096c17…aec9). Exact missing source: a distinct Master Library document ID separating it from the Proposed Order, plus a field map.
3. **Proposed Order Granting Expungement, Resentencing, or Redesignation Under MMRTA**, same publisher and index (sha256 2e38c3c680bc1c10932e017472a39e676ae4a7ad89621790b20a9803b548db7e). Exact missing source: a distinct Master Library document ID separating it from the Certificate of Service, plus a field map.
4. **Expungement/Removal Request Form (CRISS, updated 29 April 2024)**, Montana DOJ, https://dojmt.gov/wp-content/uploads/20240429-Updated-ExpungementRemovalRequestForm.docx (sha256 46068155…09a7). Exact missing source: reclassification from SUPPORTING_PROCESS / SUPPORTING_FORM to a packet form in a successor Master Library edition, plus DOJ confirmation of which form version and attachment set is enforced in practice.
5. **Statement of Inability to Pay Court Costs and Fees**, Montana Legal Services Association, montanalawhelp.org. Exact missing source: a licence permitting commercial reproduction, or an unrestricted equivalent official form. Absent either, link-out only.

Owning lane for all five: lane-D/E official-source acquisition, identity and field-map work. Registry implementationQueue for this track: F_source_problem.

## F-review pointers

- Registry implementationQueue: F_source_problem
- Registry legalStatus: legal_review_pending; legalDesignStatus: legal_design_approved_with_limitations
- Runtime disabled reason: "Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding."
- Registry blockers:
  - [output_review_gate] Output review pending: counsel approved the design, not the produced document.
  - [visual_review_gate] Visual review not started.
  - [technical_proof_gate] Technical proof not started.
  - [release_blocker × 9] filing_process (AF 22-0129 rules text), packet_components (CRISS version), filing_process (local variation), legal_effect_or_warning (denial), correct_form (CRISS asset class), correct_form (MT-OCA-MMRTA ID collision), filing_process (§ 16-12-113(7) scope), venue (§ 16-12-115 judge), participant_instructions (incarcerated participant).
  - [source_gate] One or more official sources have no recorded SHA-256, so staleness cannot be detected.
- Registry buildBlockers: none. legalDesignBlockers: none. awaitingCounselClassification: none. counselConfirmationRequired: false.
- State-pack fidelity note: the Montana state pack's official-forms.ts records Form A and Form B as `blankPdfInSource: true` with "no PDF field map exists yet and no renderer is wired" — consistent with the registry, and the reason every court document in this route is a dependency rather than a product.

## Provenance

- Registry pin: 3b6f4c103d2f97249b45acc0ea3fb889ff8787e5 (data/record-clearing/legal-design-track-registry.json :: tracks[trackId=mt_mmrta_serving])
- Compiled profile: src/lib/rcap-engine/compiled/profiles/MT-montana.json (sha256 2b9380c023275fce405992af514d59041ac077a164f4e48ff92bb0876f19fe96)
- State pack: src/lib/rcap/state-packs/montana/ — index.ts, filing-instructions.ts, official-forms.ts, pathways.ts, required-fields.ts, fee-notes.ts, document-types.ts, safety-language.ts
- Registry reviewedAsOf: 2026-08-03; effectiveFrom: 2021-01-01; effectiveTo: null

## Dependency-deferral correction candidate evidence

- Candidate status: `candidate_ready_for_independent_review` **if and only if all five assigned component treatments and their canonical fixtures pass together**.
- Candidate evidence added for:
  - `mt_mmrta_serving-primary-filing-1` — exact Form A absence, official Montana Judicial Branch destination, missing answer placement and AF 22-0129 rules text, participant gather/do-not-file directions, and Briefcase/payment/checkout/credit treatment.
  - `mt_mmrta_serving-certificate-of-service-2` — exact service-certificate absence, separate official file identity, county-attorney service facts left to the participant, and complete return treatment.
  - `mt_mmrta_serving-proposed-order-3` — exact proposed-order absence, separate official file identity, all judicial findings and signature left to the court, and complete return treatment.
  - `mt_mmrta_serving-fee-waiver-0` — exact fee-waiver absence, Montana Legal Services Association destination, noncommercial-use restriction, link-out-only direction, and protection of participant financial information.
  - `mt_mmrta_serving-primary-filing-5` — exact CRISS request absence, Montana DOJ destination, conditional post-expungement use, and express preservation of the 2023/2024 version and attachment conflict.
- Each component evidence file pins its committed `dependency.json` SHA-256 and the frozen assignment SHA-256; each canonical fixture expects no charge, unavailable checkout, no credit consumption, and a required Briefcase handoff.
- Evidence gaps intentionally retained: a Form A field placement and AF 22-0129 Temporary Rules text; distinct official identities and field placements for the certificate and proposed order; commercial-reproduction permission or an unrestricted fee-waiver equivalent; CRISS packet-form treatment for the retained DOCX; and CRISS confirmation of its enforced form version and attachment set.
