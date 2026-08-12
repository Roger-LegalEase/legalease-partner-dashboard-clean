# Handoff — tx_exp_unlawful_carry (TX, lane C1, controlled pleading)

Job `T-C-TX-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` · registry `tracks[410]`

## Authority

| Citation | What it supplies |
| --- | --- |
| Tex. Code Crim. Proc. art. 55A.005 | The entitlement: a person tried and convicted of an offence committed **before 2021-09-01** under Penal Code 46.02(a) as it then existed is entitled to expunction |
| art. 55A.251 | Venue and vehicle: ex parte petition in a district court for the county of arrest or of the alleged offence |
| art. 55A.252 | Fine-only alternative: justice court or municipal court of record in either county |
| art. 55A.253 | Required contents; verification; (b) no duplicate agencies; (a)(8)(C) private compilers separate; (c) the clerk's published list |
| Tex. Penal Code 46.02(a), pre-2021-09-01 | The offence reached. No other subsection of 46.02 qualifies |
| art. 55A.301 | The order carries the TRN — recorded on this track in the participant-filing-requirement text rather than in `authority[]` |

Nine official sources are recorded on the track. **All nine carry `sha256: null`.**

## Mechanism

Mandatory expunction of a **conviction**, arising from the 2021 permitless-carry change. Ordinary ex parte petition route. No waiting period. The pre-2021-09-01 offence date is an eligibility cut-off, not an elapsed-time requirement.

## Route decision

Custom pleading, drafted, with one conditional official-form dependency. `outputStrategy: custom_pleading`, `compositionMode: null`, `units: []`. `packetSet.components` lists four:

1. `…-petition-1` — required, custom pleading. **Drafted.**
2. `…-proposed-order-2` — required, custom pleading. **Drafted.**
3. `…-fee-waiver-statement-3` — conditional, `official_pdf_fill`, the Rule 145 Statement of Inability. **Not drafted — mandatory official-form handoff.**
4. `…-filing-and-local-practice-instructions-4` — required, `process_guidance`. **Written as `participant-instructions.md`.**

No statewide expunction form exists at any level of Texas state government, and this track is additionally absent from the TexasLawHelp toolkit and from the internal reference, so there is no circulating form even to be tempted by.

## The single most important finding on this track

**The compiled TX profile is wrong here, not merely thin.** `profile:sourceSections[3]` lists as the *first* bar to expunction: *"Final conviction for the offence (other than a later pardon) — convictions are generally not expungeable"*, and `profile:sourceSections[4]` routes *"Final conviction (most)"* to *"No relief except pardon"*. Article 55A.005 is a mandatory expunction of a conviction with no pardon in sight. Any screening logic built from the profile alone would refuse a participant who is statutorily entitled. This is recorded as counsel flag `tx-carry-conviction-expunction-contradicts-the-compiled-profile` and is the highest-value F-review item in the Texas denominator.

The registry adds a discovery problem on top of it: this route *"is missing from the internal reference and from the TexasLawHelp toolkit entirely, which is why a participant is unlikely to know it exists."* Nobody arrives asking for art. 55A.005 by name; screening has to reach it from the offence and the date.

## What is deliberately absent

- **Certificate of service.** The clerk serves under art. 55A.254. The registry admits a certificate only where local practice requires the filer to serve the prosecutor directly and names no such county. `includeCertificateOfService: false`.
- **Notice of hearing.** Clerk-or-filer preparation varies by county; no county named; no hearing date exists before filing.
- **Cover sheet.** County civil cover sheets vary by county; none named. Not composed.
- **Affidavit.** None recorded. The petition is verified.
- **Unsworn-declaration statute.** Both blocks ship because county practice chooses between them, but no source names the statute authorising the declaration. `unswornDeclarationAuthority.citation` is `null` plus a counsel flag — the ND missing-verification-statute handling.
- **Sovereign party and party roles.** Null. Ex parte caption, one party line.
- **Any fee figure.** None quoted; the county figure is an open release blocker and the profile's `$250–$500` range is disavowed.
- **The art. 55A.253(a) protected identifiers.** Required by statute, blank in every fixture, conflict recorded not resolved.
- **The offence date and the subsection as anything other than the participant's averment from a certified judgment.** LegalEase never obtains, receives or inspects the judgment.

## Open counsel flags (20)

**Release blockers (2).** County-by-county filing fee after the art. 102.006 repeal (and whether the $25 per-paper-entity charge applies twice); sensitive-data handling in the five largest counties.

**Source gates (3).** The nine unhashed official sources; the profile's live contradiction on conviction expunction; the profile corpus being a single Agent Training Reference PDF.

**Official-form dependency (1).** The Rule 145 Statement of Inability.

**Counsel confirmation (4).** The unsworn-declaration statute; direct-service counties; notice-of-hearing preparer counties; how screening surfaces a route no participant knows the name of.

**Self-help boundaries.** Offence date and subsection confirmable only from court records; state opposition or art. 55A.302 retention; mixed outcomes across one arrest (*State v. T.S.N.*, *Ex parte R.P.G.P.*); a felony from the same transaction; absconding under art. 55A.154, which a participant may not self-identify; an art. 42A.751(b) violation-warrant arrest barred by art. 55A.153; split-county venue; immigration; attacking the underlying case.

**Gates.** `legalStatus: legal_review_pending`; `legalDesignStatus: legal_design_approved_with_limitations`; `implementationQueue: F_source_problem`; output, visual and technical-proof review all outstanding.

## F-review pointers

- **F / profile contradiction — fix before screening ships.** See above. `profile:sourceSections[3]` and `[4]` would refuse an entitled participant. Regenerating the TX profile against a corpus that includes Chapter 55A as recodified would repair this and the art. 55A.004 gap at once.
- **F / source freshness.** Nine sources, no hashes, on a chapter that moved three times in eighteen months (H.B. 4504 eff. 2025-01-01; S.B. 1667 eff. 2025-09-01; art. 102.0061 eff. 2026-01-01 after an H.B. 16 stopgap).
- **F / discovery gap.** The track is absent from the internal reference and from every third-party toolkit. That is a screening-coverage question, not a drafting question, and it belongs upstream.
- **F / dollar-impact open question.** Whether the $25 per-non-electronic-entity charge applies twice for the same agency — art. 55A.254(f) at the petition stage and art. 55A.351(b-3) at the order stage. Text supports it; practice unconfirmed; it multiplies cost by the agency count.
- **F / boundary date is legislative.** The 2021-08-31 / 2021-09-01 edge in `fixtures/boundary.json` is the operative cut-off. If any later session moves it, every fixture on this track moves with it.

## Evidence

- `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/index.ts`, `/home/user/wt-c1-pleadings/src/lib/rcap/state-packs/texas/all50-build-metadata.ts`
- `/home/user/wt-c1-pleadings/src/lib/rcap-engine/compiled/profiles/TX-texas.json` (sha256 `2820312fd974151afe465d6f04d0454b4a5c3cc991982142bd0e3ab9c3a297df`)
- Pinned registry entry `tracks[410]` (`trackId=tx_exp_unlawful_carry`)

The committed Texas state pack records build metadata and the Nationwide inventory only and carries no track-level filing text. Every filing step in `participant-instructions.md` comes from the track's `rules`, `packetInstructions`, `packetSet.participantActionRequired`, `participantFilingRequirements` and `selfHelpStopConditions`, corroborated by the compiled profile's seven-step filing sequence (`profile:sourceSections[6]`).
