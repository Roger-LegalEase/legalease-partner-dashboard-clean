# Handoff — tx_exp_specialty_court (TX, lane C1, controlled pleading)

Job `T-C-TX-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry `tracks[412]`

## Authority

| Citation | What it supplies |
| --- | --- |
| Tex. Code Crim. Proc. art. 55A.203 | The streamlined route: a **district court** may, **with the consent of the attorney representing the state**, enter an expunction order not later than the 30th day after the dismissal or after it receives the dismissal information |
| art. 55A.203(c) | The court may not charge **any** fee or assess **any** cost for such an order |
| art. 55A.203(d) | Added by S.B. 1667. The person must provide the court with the information required in an art. 55A.253 petition |
| art. 55A.053(a)(2)(A) and (B) | Where the entitlement actually lives |
| art. 55A.053(b), (c) | One expunction per ground; affidavit attesting to the fact |
| art. 55A.253 | The information specification carried through (d); verification |
| art. 102.0061(d) | A second, independent no-cost provision: waiver of the district-court fee on an art. 55A.053(a)(2)(A)/(B) entitlement |

Named in the mechanism but not authority for the relief: Gov't Code ch. 124 (veterans treatment courts) and ch. 125 (mental health courts) as the two qualifying programme types; art. 55A.201 as the contrast that is *not* limited to district courts. Supplemental from the rules text: art. 55A.301 (TRN on the order).

Nine official sources are recorded on the track. **All nine carry `sha256: null`.**

## Mechanism

Streamlined order, not a noticed petition. Free by statute, twice over. Gated on an outside party's discretionary consent, inside a 30-day window that runs the opposite way from every waiting period in the Texas denominator.

## Route decision

Custom pleading, **four** drafted documents, one conditional official-form dependency, one open build blocker. `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists six:

1. `…-petition-1` — required, custom pleading. **Drafted.**
2. `…-proposed-order-2` — required, custom pleading. **Drafted.**
3. `…-information-package-3` — required, custom pleading. **Drafted.** Statutory: art. 55A.203(d).
4. `…-one-time-use-affidavit-4` — required, custom pleading. **Drafted.** Statutory: art. 55A.053(c).
5. `…-fee-waiver-statement-5` — conditional, `official_pdf_fill`, the Rule 145 Statement of Inability. **Not drafted — mandatory official-form handoff, and itself contested.**
6. `…-filing-and-local-practice-instructions-6` — required, `process_guidance`. **Written as `participant-instructions.md`.**

This is the richest of the four Texas controlled-pleading tracks, and the reason is statutory: art. 55A.203(d) and art. 55A.053(c) each specify a document's contents, so each is draftable without invention.

## Build blocker: a fee-waiver component on a fee-free route

Two provisions forbid or waive any charge — art. 55A.203(c) (*"may not charge any fee or assess any cost"*) and art. 102.0061(d) (waiver of the district-court fee on this entitlement). Yet `packetSet.components[4]` is a conditional `fee_waiver_statement` pointing at the Rule 145 Statement of Inability. Either it is inherited from the sibling art. 55A.251 tracks, or it is belt-and-braces for a clerk who asks anyway. The dependency file is written because the component exists; the conflict is flagged, not resolved. `participant-instructions.md` handles it the only defensible way: if a clerk demands a fee, do not pay and stop.

## What is deliberately absent

- **Any consent instrument, agreed order, agreed motion or consent recital.** The registry: *"LegalEase does not seek, negotiate or obtain that consent and never asserts it has been given."* `prosecutorConsentSought` collects only whether the participant has **asked**, never the answer.
- **Certificate of service.** The clerk serves under art. 55A.254; the participant does not.
- **Notice of hearing, hearing date, 30-day-after-filing hearing window.** This is a streamlined order route. The art. 55A.251 rule that a hearing is set *not earlier than* the 30th day after filing belongs to the sibling tracks and is the mirror image of this track's deadline. Inheriting it would be a material error.
- **Any fine-only justice-court or municipal-court branch.** Article 55A.203 is district-court only.
- **Any fee figure.** None — and here the route is free by statute.
- **Successful completion of the programme, the dismissal itself, and the state's consent** as asserted facts. All three are outside-party or court acts. The participant's account of completion and dismissal is carried as their own averment.
- **Unsworn-declaration statute.** Null plus counsel flag. Note the affidavit is a separate statutory sworn instrument, not an alternative to the verification.
- **Cover sheet.** Not recorded; not composed.
- **The art. 55A.253(a) protected identifiers.** Blank; conflict recorded.

## Open counsel flags (23)

**Build blocker (1).** The fee-waiver component on a route two statutes make free.

**Release blockers (2).** The county-by-county filing fee question (inherited from the shared TX block; largely moot on this track, which is fee-free, but the double-$25 per-paper-entity question at art. 55A.254(f) and art. 55A.351(b-3) is **not** moot — those are clerk transmission charges, not the court fee art. 55A.203(c) forbids, and whether art. 55A.203(c) reaches them is unaddressed by any source read); sensitive-data handling in the five largest counties.

**Source gates (3).** Nine unhashed official sources; the compiled profile's specialty-court coverage is one loose phrase — *"Specialty-court dismissal (e.g., veterans treatment court) — a streamlined ~30-day expunction order with the State's consent"* — with no article, no chapter citations, and no mention of mental health courts at all; the profile corpus is a single PDF.

**Official-form dependency (1).** The Rule 145 Statement of Inability, itself contested here.

**Scope restrictions.** District courts only; exactly two programme types; no third-party form sets.

**Packet instructions.** The 30 days are a deadline, not a wait; the entitlement lives in art. 55A.053 so a closed route is not a dead end; agency list deduplicated; private entities separate; TRN on the order.

**Self-help boundaries.** Consent never asserted; consent withheld; window closed; a prior expunction on the same ground; plus the shared Chapter 55A set (state opposition or art. 55A.302 retention; mixed outcomes across one arrest; a felony from the same transaction; absconding under art. 55A.154; art. 42A.751(b) violation-warrant arrests barred by art. 55A.153; split-county venue; immigration; attacking the underlying case).

**Gates.** `legalStatus: legal_review_pending`; `legalDesignStatus: legal_design_approved_with_limitations`; `implementationQueue: F_source_problem`.

## F-review pointers

- **F / the profile has one sentence on this track and it omits half of it.** `profile:sourceSections[1]` and `[4]` mention specialty-court dismissal with veterans treatment court as the example. Mental health courts under Gov't Code ch. 125 appear nowhere in the compiled profile. A screening flow built from the profile would miss an entire qualifying population.
- **F / does art. 55A.203(c) reach the clerk's transmission charges?** The article says the court may not charge any fee or assess any cost *for the expunction*. Articles 55A.254(f) and 55A.351(b-3) require the clerk to charge $25 per entity that cannot receive electronic transmission, at two separate stages. No source read addresses whether the art. 55A.203(c) prohibition reaches those charges. On a route sold to the participant as free, this is the difference between $0 and $25 × agencies × 2.
- **F / the packet set on a fee-free route carries a fee waiver.** See the build blocker. Worth checking whether the six-component packet set was assembled from the shared art. 55A.251 template.
- **F / source freshness.** Nine sources, no hashes, on a chapter amended by S.B. 1667 effective 2025-09-01 — the same bill that added art. 55A.203(d), which is the basis for one of the four drafted documents.
- **F / consent has no recorded mechanics.** No source read says how consent is communicated, whether it must be written, whether it is filed, or who initiates. The packet says only that LegalEase does not obtain it. That is honest but it leaves the participant without a next step other than "ask".

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/index.ts`, `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/all50-build-metadata.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/TX-texas.json` (sha256 `2820312fd974151afe465d6f04d0454b4a5c3cc991982142bd0e3ab9c3a297df`)
- Pinned registry entry `tracks[412]` (`trackId=tx_exp_specialty_court`)

The committed Texas state pack records build metadata and the Nationwide inventory only. Every filing step in `participant-instructions.md` comes from the track's `mechanism`, `rules`, `packetInstructions`, `packetSet.participantActionRequired`, `participantFilingRequirements`, `postGenerationHandoffs` and `selfHelpStopConditions`.
