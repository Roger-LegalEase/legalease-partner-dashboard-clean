# Handoff - in_supplemental_order (IN, lane C1, controlled pleading)

Job `T-C-IN-production-packet` - treatment `production_packet` - registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| I.C. 35-38-9-9(l) | The whole mechanism: where the chapter is amended after a grant in a way that provides greater relief, the person may petition the granting court, succinctly setting forth the relief sought; the court shall grant it consistent with the amendment on the two findings |
| I.C. 35-38-9-0.6(c) | Listed on the track as authority. **No source states what it supplies.** Cited because the track cites it; not glossed |

Official sources recorded on the track: I.C. 35-38-9, I.C. 34-28-5-15, the Coalition for Court Access forms index, the Office of Judicial Administration expungement page. All four carry `sha256: null`.

## Mechanism

Two findings gate the relief: that the petitioner was granted relief before the amendment, and that they are otherwise entitled to the relief the amendment provides. Both are the court's. No waiting period once a qualifying amendment exists. Venue is the court that granted the original expungement.

## Route decision

Custom pleading, drafted **as a container with two empty slots**. `outputStrategy: custom_pleading`, `compositionMode: null`, `units[]` empty. `packetSet.components` lists three required components, all `custom_pleading` with `officialFormId: null`:

1. `in_supplemental_order-primary-filing-1` - the petition. **Drafted**, with the amendment and the relief sought left empty.
2. `in_supplemental_order-proposed-order-2` - proposed order. **Drafted**, relief consistent with the amendment, amendment and relief left empty.
3. `in_supplemental_order-attachment-3` - the attachment. **Not drafted**: the certified copy of the original expungement order, obtained by the participant.

The empty slots are the design, not an omission. The scope restriction is explicit: "Which amendment provides greater relief must be settled for the current cycle before this track is offered. Indiana amends the chapter nearly every year." Naming an amendment would be inventing the answer to an open release blocker.

## What is deliberately absent

- **Any named amendment.** Nowhere in the config, fixtures, instructions or proposed order. `P.L.77-2025` appears only in counsel flags and in the negative fixture's failure statement, as the open question - never as a ground.
- **A relief verb.** `reliefActionVerb` is "grant relief consistent with the amendment", not "expunge", "seal" or "mark". Which act the amendment provides is exactly what is unsettled.
- **Any fee statement.** `feeStatement` is null. Fee and fee waiver are both recorded as "Unresolved", and the registry simultaneously lists a required `pay_fee` action carrying that same sentence. No figure, and no "there is no fee", is asserted.
- **Verification statute citation.** `null`, handled the way the ND config handles its missing verification statute.
- **Record custodian list in the proposed order.** No source enumerates custodians for a 9(l) order, and what such an order directs depends on the amendment.
- **I.C. 35-38-9-9(i).** Deliberately excluded from the statutory basis; see the one-petition flag.
- **Notice document, response window, hearing procedure.** "The review does not state a distinct notice rule for a supplemental petition."
- **Cover sheet.** None recorded.

## What is included, and why

**Certificate of service.** Unlike the sibling collateral-action track, service here is stated: "Follow the ordinary Trial Rules service on the prosecuting attorney." It is corroborated twice in the compiled profile - the CCA petition text ("Petitioner has served a copy of this petition upon the Prosecuting Attorney in accordance with the Indiana Rules of Trial Procedure") and the conviction pathway rule clause ("The petition must be served on the prosecutor"). The block asserts no completed service; date, method and recipient address are participant-supplied.

## Open counsel flags (21)

Release blockers: the amendment must be settled for the cycle; what P.L.77-2025 changed and whether the 2026 session amended the chapter again; whether any statewide form exists; the fee/fee-waiver contradiction; the caption and cause-number convention.

Scope restrictions carried as flags: the relief sought is participant-authored and the amendment counsel-settled; entitlement is the court's finding; never say records are destroyed; disclose that the case file is public until the order is granted - which bites hardest here, because the participant already has relief and filing reopens a public file; the thirteen self-help stop conditions.

Source conflicts: the attachment component is marked `custom_pleading` although nothing is drafted for it; `I.C. 35-38-9-0.6(c)` is cited with no description anywhere; the profile treats Indiana expungement filings as verified petitions while the track states only a signature.

Gates: `legalStatus: legal_review_pending`; output, visual and technical-proof review all outstanding; every official source lacks a sha256; the compiled profile is silent on this mechanism.

Product routing: run as a periodic sweep of past participants after each legislative session, not as an on-demand consumer route.

## F-review pointers

- **F / source freshness, sharpened:** four official sources with `sha256: null` on a track whose entire premise is that the chapter changes yearly. This is the worst possible pairing. I.C. 35-38-9 needs a hash and an annual post-session re-read, and that re-read is the trigger for the sweep this track is supposed to run.
- **F / profile coverage gap:** `IN-indiana.json` has **zero** occurrences of `supplemental` and zero of `0.6`. Its four pathways are the section 35-38-9-2 through -7 routes. The registry entry is the sole procedural source.
- **F / normalizer defect in the IN profile:** `pathways[].exclusionRules[]` contains raw OCR-style form text - the AFFIRMATION and CERTIFICATE OF SERVICE block of CCA-XP-0220-7007, the Form ACR caption, the Notice of Exclusion of Confidential Information and the Confidential Information Form XP - dumped into a field meant for exclusion rules. Fix upstream; a rule engine reading those strings will misbehave.
- **F / open legal question worth escalating:** whether a 9(l) supplemental petition counts against the one-petition limitation in 9(i). The profile records that limitation for conviction petitions and the track's stop conditions include having already filed a Sections 2 through 5 petition. If a supplemental petition burns the one petition, the sweep this track proposes could cost participants more than it gains them. This is the highest-value question in the Indiana C1 set.
- **F / source conflict on fees:** `rules.fees` and `rules.feeWaiver` both say "Unresolved", yet `packetSet.participantActionRequired` carries a `pay_fee` entry marked required before filing. One of the two is wrong.
- **F / possible missing component:** the profile records Indiana Access to Court Records forms (Notice of Exclusion of Confidential Information from Public Access, Confidential Information Form XP) within the arrest/charge expungement packet, used where a full Social Security number is filed. No source attaches them to a 9(l) petition; counsel should confirm whether the ACR rules pull them in.

## Evidence

- `src/lib/rcap/state-packs/indiana/all50-build-metadata.ts`, `src/lib/rcap/state-packs/indiana/index.ts`
- `src/lib/rcap-engine/compiled/profiles/IN-indiana.json` (sha256 `0202d536113b16be9e02f1ea2bbd925c60d0b8a94d57cb972bf50831a0e22982`)
- Pinned registry entry `tracks[trackId=in_supplemental_order]`

The committed Indiana state pack carries build metadata and the Nationwide inventory only and records no track-level filing text. Participant filing steps in `participant-instructions.md` were taken from the track's `rules.filing`, `rules.service`, `rules.notice`, `rules.fees`, `packetInstructions` and `packetSet.participantActionRequired`, plus the state pack's `filingDestinationGuidance` and `feesCopiesServiceNotes` for the "check current local requirements" line.
