# Handoff — tx_exp_mistaken_identity (TX, lane C1, controlled pleading)

Job `T-C-TX-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry `tracks[411]`

## Authority

| Citation | What it supplies |
| --- | --- |
| Tex. Code Crim. Proc. art. 55A.006 | The ground: clerical error, or another arrested person falsely giving the applicant's identifying information without consent, where that is the **only** reason the applicant's information is in the records. Operates **notwithstanding** the art. 55A.001 arrest requirement |
| art. 55A.256 | The vehicle: a verified application, with authenticated fingerprint records, filed with the attorney representing the state in the prosecution of felonies in the county of residence or of the alleged offence. **Not a petition, and not filed with a court** |
| art. 55A.256(b) | Contents of the application; authenticated fingerprints mandatory |
| art. 55A.256(c) | The prosecutor verifies, supplements missing arrest information, forwards to the district court with the agency list, and requests the order |
| art. 55A.256(c-1) | S.B. 1667 anti-duplication rules applied to the application |
| art. 55A.256(d) | The court enters a final order **without a hearing** |
| art. 55A.354 | The effect: agencies **obliterate** the applicant's identifying information and **substitute** the arrested person's. No return, no destruction, index references not deleted |
| art. 55A.001 | The general arrest requirement art. 55A.006 operates notwithstanding |

Supplemental, from the rules text rather than `authority[]`: art. 55A.253 (contents model, and the petition component's verification), art. 55A.301 (TRN on the order), art. 55A.254 (clerk service at the forwarded stage), art. 102.0061 (fees), Tex. R. Civ. P. 145 (fee waiver).

Nine official sources are recorded on the track. **All nine carry `sha256: null`.**

## Mechanism

Prosecutor-first, court-second, no hearing. This is the only Texas track in this job whose first filing is not a court filing, and the only one whose relief is not destruction.

## Route decision

Custom pleading, three drafted documents, one conditional official-form dependency, **and one open build blocker**. `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists five:

1. `…-petition-1` — required, custom pleading. **Drafted** as the forwarded-stage container (see build blocker).
2. `…-proposed-order-2` — required, custom pleading. **Drafted**, with art. 55A.354 obliterate-and-substitute language.
3. `…-verified-application-to-prosecutor-3` — required, custom pleading. **Drafted. This is the primary participant filing** and carries `documentTitleFull`.
4. `…-fee-waiver-statement-4` — conditional, `official_pdf_fill`, the Rule 145 Statement of Inability. **Not drafted — mandatory official-form handoff.**
5. `…-filing-and-local-practice-instructions-5` — required, `process_guidance`. **Written as `participant-instructions.md`.**

## Two build blockers, both left open rather than resolved

**1. The packet set contradicts the mechanism.** The mechanism says in terms *"This is not a petition"*, and art. 55A.256(d) has the court enter a final order without a hearing on the prosecutor's request. Yet `packetSet.components` carries a **required** `petition` and a **required** `proposed_order` alongside the required application. Either those are the documents the prosecutor forwards under art. 55A.256(c), or the packet set was inherited from the sibling art. 55A.251 tracks. This config treats the application as primary, drafts the petition and order as forwarded-stage containers, and flags the conflict.

**2. `venue` and `destination` contradict the mechanism.** Both fields on this track carry the generic art. 55A.251 text — *"an ex parte petition is filed in a district court for the county in which the petitioner was arrested"* — verbatim identical to the three sibling expunction tracks. The mechanism says the application goes to the felony prosecutor in the county where the applicant **resides**, and the track's own `generationRequirements` add `residenceCounty` for exactly that purpose. The mechanism is followed; the fields are flagged as needing correction.

## What is deliberately absent

- **Hearing, notice of hearing, 30-day window.** None exist on this track. Article 55A.256(d) is explicit. All three are correct on the sibling art. 55A.251 tracks and would be wrong here.
- **Certificate of service.** The clerk serves at the forwarded stage; the applicant does not serve.
- **Destruction language anywhere.** `qaProhibitedTerms` adds `destroy`, `destroyed`, `destruction`, `erase`, `erased`, `erasure` to the standard eight. The remedy is obliteration and substitution.
- **The prosecutor's name, office name and address.** The addressee is named by **role** only. No source records any of the three.
- **Any assertion that the prosecutor verified, supplemented, forwarded or requested.** Recorded as a post-generation handoff LegalEase cannot perform.
- **Authenticated fingerprint records.** Mandatory, participant-obtained, never received or inspected.
- **Unsworn-declaration statute.** Null plus counsel flag, with the extra uncertainty that this filing goes to a prosecutor's office rather than a clerk and no source says what that office accepts.
- **Cover sheet, affidavit.** Neither recorded.
- **Any fee figure.** None quoted — and on this track doubly so: no source states that any fee attaches to an application filed with a prosecutor's office.
- **The art. 55A.253(a) protected identifiers.** Blank; conflict recorded.

## Open counsel flags (23)

**Build blockers (2).** The packet-set/mechanism conflict; the venue/destination conflict.

**Release blockers (2).** County-by-county filing fee after the art. 102.006 repeal (and the double-$25 question); sensitive-data handling in the five largest counties.

**Source gates (3).** Nine unhashed official sources; the compiled profile does not record art. 55A.006, art. 55A.256 or art. 55A.354 at all — its case-outcome table has one line, *"Mistaken identity | Expunction | Petition | Clerical error / ID theft"*, which gets the ground right and the **vehicle wrong**; the profile corpus is a single PDF.

**Official-form dependency (1).** The Rule 145 Statement of Inability.

**Packet instructions.** Obliteration is not destruction; agency list deduplicated under art. 55A.256(c-1); private entities separate; TRN on the order; no hearing and no waiting period; no statewide form exists.

**Self-help boundaries.** Any identity dispute; the prosecutor declining to verify or forward; inability to obtain authenticated fingerprints; consent given; information in the record for any other reason; state opposition or art. 55A.302 retention; attacking the underlying case; immigration.

**Gates.** `legalStatus: legal_review_pending`; `legalDesignStatus: legal_design_approved_with_limitations`; `implementationQueue: F_source_problem`.

## F-review pointers

- **F / the profile gets the vehicle wrong.** `profile:sourceSections[4]` routes mistaken identity to "Expunction | **Petition**". It is an application to a prosecutor. A packet built from the profile's routing table would send the participant to a district clerk with the wrong document.
- **F / two internal contradictions inside one registry entry.** The mechanism and `packetSet.components` disagree about whether a petition exists; the mechanism and `venue`/`destination` disagree about where the filing goes. Both look like inheritance from the sibling art. 55A.251 tracks, which share `venue`, `destination`, `rules` and most of `generationRequirements` verbatim with this one. Worth checking whether the shared blocks were applied to this track without adjustment.
- **F / source freshness.** Nine sources, no hashes, on a chapter that moved three times in eighteen months.
- **F / the remedy's own limits are unstated.** Article 55A.354 says index references are not deleted. No source read for this track says what an index reference contains or what a background-check company would still see. That is the participant's actual question and neither source answers it.
- **F / fee applicability.** No source states whether any fee attaches to an art. 55A.256 application delivered to a prosecutor's office, yet the packet set carries a conditional Rule 145 court-cost waiver.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/index.ts`, `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/all50-build-metadata.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/TX-texas.json` (sha256 `5d86879a794303a7b38faa37533db4037a356eb017f8a3229e62c51041309dc4`)
- Pinned registry entry `tracks[411]` (`trackId=tx_exp_mistaken_identity`)

The committed Texas state pack records build metadata and the Nationwide inventory only. Every filing step in `participant-instructions.md` comes from the track's `mechanism`, `rules`, `packetInstructions`, `packetSet.participantActionRequired`, `participantFilingRequirements`, `postGenerationHandoffs` and `selfHelpStopConditions`.
