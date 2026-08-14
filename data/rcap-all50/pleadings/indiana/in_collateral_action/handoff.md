# Handoff - in_collateral_action (IN, lane C1, controlled pleading)

Job `T-C-IN-production-packet` - treatment `production_packet` - registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| I.C. 35-38-9-9.5 | The request vehicle: after an original expungement order issues, expungement of an action or proceeding, including an administrative proceeding, factually or legally related to the arrest, charge, allegation, conviction or adjudication - expressly including a seizure, a civil forfeiture and a petition for specialized driving privileges |
| I.C. 35-38-9-0.5 | Listed on the track as authority. **No source states what it supplies.** Cited because the track cites it; not glossed |

Official sources recorded on the track: I.C. 35-38-9, I.C. 34-28-5-15, the Coalition for Court Access expungement forms index, the Office of Judicial Administration expungement page. All four carry `sha256: null`.

## Mechanism

The court notifies the prosecuting attorney of that county and sets a hearing, or may grant without one where the record conclusively establishes entitlement. No waiting period: the track records "None. May be filed any time after" the original order issues. No fee.

## Route decision

Custom pleading, drafted. `outputStrategy: custom_pleading`, `compositionMode: null`, `units[]` empty. `packetSet.components` lists three required components, all `custom_pleading` with `officialFormId: null`:

1. `in_collateral_action-primary-filing-1` - the request. **Drafted.**
2. `in_collateral_action-proposed-order-2` - proposed order. **Drafted**, relief only, no custodian list.
3. `in_collateral_action-attachment-3` - the attachment. **Not drafted**: the only attachment the track records is the certified copy of the original expungement order, which the participant obtains from the clerk.

The scope restriction governs the label: "Resolved to custom_pleading with a local-form override for the current build. Do not carry an official-form label forward unless the actual current statewide form for this mechanism is acquired and verified."

## What is deliberately absent

- **Certificate of service.** The court notifies the prosecuting attorney, and whether the participant must also serve is expressly unconfirmed. Drafting one would assert both an obligation and a completed act. `serviceNote` carries the unresolved text verbatim.
- **Notice.** Notice is the court's act here, not the participant's.
- **Affidavit.** None recorded; `notarization: none`.
- **Verification statute citation.** `null`, handled the way the ND config handles its missing verification statute. The profile's penalties-of-perjury affirmation formula is CCA conviction-expungement form text and is not carried across.
- **Record custodian list in the proposed order.** The profile enumerates custodians in detail - Department of Correction, Bureau of Motor Vehicles, State Police Central Repository, incarcerating and treating agencies - but only for section 35-38-9-6 and -7 conviction-expungement orders. No source enumerates them for a section 9.5 order.
- **Sovereign party role, county/court/cause number, judge, prosecutor, prosecutor position, dates, fee amount.** None asserted.
- **Cover sheet.** None recorded. See the ACR note below.

## Open counsel flags (18)

Release blockers: whether the CCA publishes a statewide section 9.5 request form; the accepted caption and format; and the service question.

Scope restrictions carried as flags: the relationship statement is participant-authored (LegalEase formats, never composes the argument); relatedness is the court's finding, never asserted; never say records are destroyed; disclose the case file is public until the order is granted; the fourteen self-help stop conditions.

Source conflicts: the attachment component is marked `outputStrategy: custom_pleading` although nothing is drafted for it; `I.C. 35-38-9-0.5` is cited with no description anywhere; the registry's service rule and the profile's Trial Rules service convention point in opposite directions.

Gates: `legalStatus: legal_review_pending`; output, visual and technical-proof review all outstanding; every official source lacks a sha256; the compiled profile is silent on section 9.5 procedure.

Product routing: the track instructs that this be offered as a free follow-on to every granted conviction expungement.

## F-review pointers

- **F / source freshness:** four official sources with `sha256: null`. Capture hashes before release.
- **F / profile coverage gap:** `IN-indiana.json` has **zero** occurrences of `9-9.5`. Its only relevant text is the phrase "records of collateral actions that relate to the expunged convictions or that relate to the cause number of the expunged convictions", which appears inside the section 35-38-9-6 and -7 order forms. That is the concept, not the procedure - and it is worth counsel's attention that the standard conviction-expungement order already purports to reach collateral-action records, which raises the question of when a separate section 9.5 request is needed at all.
- **F / normalizer defect in the IN profile:** `pathways[].exclusionRules[]` contains raw OCR-style form text - the whole AFFIRMATION and CERTIFICATE OF SERVICE block of CCA-XP-0220-7007, the Form ACR caption, the Notice of Exclusion of Confidential Information from Public Access and the Confidential Information Form XP - dumped into a field meant for exclusion rules. Any rule engine reading those strings will behave unpredictably. Fix upstream.
- **F / possible missing component:** the profile records Indiana Access to Court Records forms (Notice of Exclusion of Confidential Information from Public Access, Confidential Information Form XP, CCA-XP-0120-7002) as part of the arrest/charge/juvenile-allegation expungement packet, used where a full Social Security number is filed. No source says they attach to a section 9.5 request, so none is drafted or required here. Counsel should confirm whether Indiana's ACR rules pull them in whenever confidential information is filed - if so, this track gains a component.
- **F / terminology:** the profile's `terminology.primaryConsumerTerm` is `expungement` with `avoidUniversalExpungementLabel: true`, and `allowedStateTerms` are `expungement` and `sealing`. Consistent with this track. The live risk is not the label but the connotation: the track's packet instruction forbids "destroyed", and `qaProhibitedTerms` in the config enforces that.
- **F / release:** confirm the free-follow-on routing instruction is implemented in pricing, not just recorded here.

## Evidence

- `src/lib/rcap/state-packs/indiana/all50-build-metadata.ts`, `src/lib/rcap/state-packs/indiana/index.ts`
- `src/lib/rcap-engine/compiled/profiles/IN-indiana.json` (sha256 `0202d536113b16be9e02f1ea2bbd925c60d0b8a94d57cb972bf50831a0e22982`)
- Pinned registry entry `tracks[trackId=in_collateral_action]`

The committed Indiana state pack carries build metadata and the Nationwide inventory only and records no track-level filing text. Participant filing steps in `participant-instructions.md` were taken from the track's `rules.filing`, `rules.fees`, `rules.service`, `rules.notice`, `packetInstructions` and `packetSet.participantActionRequired`, plus the state pack's `filingDestinationGuidance` and `feesCopiesServiceNotes` for the "check current local requirements" line.
