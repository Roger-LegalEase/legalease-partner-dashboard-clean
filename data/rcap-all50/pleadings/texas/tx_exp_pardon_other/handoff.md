# Handoff — tx_exp_pardon_other (TX, lane C1, controlled pleading)

Job `T-C-TX-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry `tracks[409]`

## Authority

| Citation | What it supplies |
| --- | --- |
| Tex. Code Crim. Proc. art. 55A.004 | The entitlement: a person tried and convicted, then pardoned for a reason **other than** actual innocence, is entitled to expunction |
| art. 55A.251 | Venue and vehicle: ex parte petition in a district court for the county of arrest or of the alleged offence |
| art. 55A.252 | Fine-only alternative: justice court or municipal court of record in either county |
| art. 55A.253 | Required contents of the petition; verification; (b) no duplicate agencies; (a)(8)(C) private compilers listed separately; (c) the clerk's published agency and e-mail list |
| art. 55A.301 | The order; the TRN must appear on it |

Recorded but **not** authority for this track, and used only where flagged: art. 55A.003 / art. 55A.202 (the actual-innocence pardon route, expressly excluded), art. 55A.051 (threshold conditions "where they apply", unscoped), art. 55A.254 (clerk service and the $25 per-paper-entity charge), art. 55A.351(b-2)/(b-3) (the same charge at the order stage), art. 102.0061 (fees), Tex. R. Civ. P. 145 (fee waiver).

Nine official sources are recorded on the track. **All nine carry `sha256: null`.**

## Mechanism

Conviction-based expunction. A pardon for a reason other than actual innocence creates an entitlement, prosecuted by the ordinary ex parte petition. No waiting period is stated; the only timing constraint is that the hearing is set not earlier than the 30th day after filing. The art. 55A.202 automatic route is **not** available here — it covers art. 55A.003 actual-innocence pardons only.

## Route decision

Custom pleading, drafted, with one conditional official-form dependency. The registry declares `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists four:

1. `…-petition-1` — required, custom pleading. **Drafted.**
2. `…-proposed-order-2` — required, custom pleading. **Drafted.**
3. `…-fee-waiver-statement-3` — conditional, `official_pdf_fill`, the Rule 145 Statement of Inability. **Not drafted — mandatory official-form handoff.**
4. `…-filing-and-local-practice-instructions-4` — required, `process_guidance`. **Written as `participant-instructions.md`.**

Drafting the pleading is supportable because **no statewide expunction form exists at any level of Texas state government** — the Texas Judicial Branch forms index was confirmed on 2026-08-06 to contain none — and art. 55A.253(a) prescribes the contents instead.

## What is deliberately absent

- **Certificate of service.** The clerk serves under art. 55A.254; the participant does not serve in the ordinary case. The registry admits a certificate "only where local practice requires the filer to serve the prosecutor directly" and names no such county. `includeCertificateOfService: false`.
- **Notice of hearing.** The clerk gives the petition and notice to each listed entity; whether the clerk or the filer *prepares* the notice varies by county and no county is named. No hearing date exists before filing.
- **Cover sheet.** County civil cover sheets are recorded as varying by county; none is named. Not composed.
- **Affidavit.** None recorded. The petition is verified; that is the sworn instrument.
- **Unsworn-declaration statute.** Both a notarial block and an unsworn declaration ship because county practice chooses between them, but **no source names the statute authorising the declaration**. `unswornDeclarationAuthority.citation` is `null` plus a counsel flag — the same handling the ND config gives its missing verification statute.
- **Sovereign party, party roles, record custodian list.** Null. Ex parte caption with one party line; custodians come only from the participant's `agencyList` answer.
- **Any fee figure.** None quoted. The county district-court figure is an open release blocker and the profile's `$250–$500` range is expressly disavowed by the registry.
- **The art. 55A.253(a) protected identifiers.** Sex, race, date of birth, driver's licence number, social security number and address at time of arrest are required by statute and are blank in every fixture. That conflict is recorded, not resolved.

## Open counsel flags (21)

**Release blockers (2).** (a) The county-by-county filing fee after the art. 102.006 repeal, plus whether the $25 per-paper-entity charge applies once or twice per agency. (b) Sensitive-data handling in the five largest counties, given that art. 55A.253 requires SSN and date of birth in a filing that is public until the order issues.

**Official-form dependency (1).** The Rule 145 Statement of Inability to Afford Payment of Court Costs — the only genuinely statewide promulgated form in the entire Texas record-clearing workflow.

**Counsel confirmation (4).** The unsworn-declaration statute; which counties require the filer to serve the prosecutor directly; which counties require the filer rather than the clerk to prepare the notice of hearing; the scope of the art. 55A.051 threshold conditions, which the registry lists as an exclusion "where they apply" without saying when they apply.

**Scope restrictions and packet instructions.** No third-party form set may be filled or delivered (TexasLawHelp non-commercial terms; TJCTC training aids; county clerk packets are local only). No statewide form exists and the track must not be reclassified `official_pdf_fill` because unofficial fillable PDFs circulate. Agency list deduplicated; private entities separate; TRN on the order. Actual-innocence pardons split to art. 55A.202.

**Self-help boundaries.** Only a pardon opens this route; state opposition or art. 55A.302 retention; mixed outcomes across one arrest (*State v. T.S.N.*, *Ex parte R.P.G.P.*); a felony from the same transaction; absconding (art. 55A.154, which a participant may not self-identify); an art. 42A.751(b) violation-warrant arrest barred by art. 55A.153; split-county venue; immigration; attacking the underlying case.

**Gates.** `legalStatus: legal_review_pending`; `legalDesignStatus: legal_design_approved_with_limitations`; `implementationQueue: F_source_problem`; output, visual and technical-proof review all outstanding; nine official sources with no hash.

## F-review pointers

- **F / source freshness, highest priority.** Nine official sources, `sha256: null` on all nine. Chapter 55A is a live target: recodified effective 2025-01-01 by H.B. 4504, amended by S.B. 1667 effective 2025-09-01, and its fee article replaced by art. 102.0061 effective 2026-01-01 after an H.B. 16 stopgap. There is no way to detect drift today.
- **F / compiled profile is stale in three specific ways.** It quotes a `$250–$500` fee range the registry disavows; it directs agents to *"use TexasLawHelp's statewide tools to assemble the right forms"*, which the scope restriction forbids inside a paid product; and its exclusions section frames Chapter 55A as non-conviction relief, which is right only because it carves out "other than a later pardon". The profile records neither art. 55A.004 nor the art. 55A.003 split.
- **F / profile corpus is one PDF.** `profile:source.references` is a single Agent Training Reference PDF, 33 207 extracted characters. The whole compiled TX profile is a conversion of that one document. It is genuinely useful for the caption form, the ex parte style, the venue rule and the filing sequence — those are the only things it is used for here — but it cannot carry a 19-track Texas denominator.
- **F / open question with real dollar impact.** Whether the $25 per-non-electronic-entity charge applies twice for the same agency, at art. 55A.254(f) and again at art. 55A.351(b-3). The text supports it; practice is unconfirmed. It multiplies the participant's cost by the agency count.
- **F / unscoped exclusion.** "The art. 55A.051 threshold conditions where they apply" is recorded as an exclusion with no statement of when they apply or what they are. That is an eligibility gate written as a footnote.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/index.ts`, `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/all50-build-metadata.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/TX-texas.json` (sha256 `5d86879a794303a7b38faa37533db4037a356eb017f8a3229e62c51041309dc4`, profileVersion `2026-06-19-source-conversion-1`)
- Pinned registry entry `tracks[409]` (`trackId=tx_exp_pardon_other`)

The committed Texas state pack records build metadata and the Nationwide inventory only — three files under `LegalEase Texas` — and carries no track-level filing text, no caption and no vocabulary. Every filing step in `participant-instructions.md` comes from the track's `rules`, `packetInstructions`, `packetSet.participantActionRequired`, `participantFilingRequirements` and `selfHelpStopConditions`, corroborated by the compiled profile's seven-step filing sequence (`profile:sourceSections[6]`) and the state pack's own `filingSteps` and `filingDestinationGuidance`.
