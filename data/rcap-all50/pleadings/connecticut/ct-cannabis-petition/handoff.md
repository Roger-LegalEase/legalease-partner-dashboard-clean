# Handoff — ct-cannabis-petition (CT, lane C1, controlled pleading)

Job `T-C-CT-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| C.G.S. § 54-142v | The petition vehicle for cannabis conviction erasure |
| C.G.S. § 54-142v(a)(1) | The three eligible conviction categories (§ 21a-279, § 21a-267(a), § 21a-277(b)) |
| C.G.S. § 54-142v(a)(2) | Required content: a copy of the arrest record **or** a supporting affidavit |
| C.G.S. § 54-142v(a)(3) | The court shall direct erasure if the petition is in order |
| C.G.S. § 54-142v(a)(4) | No fee |
| C.G.S. § 54-142v(b) | The multi-count bar |
| C.G.S. § 54-142a | Erasure mechanics |

Official sources recorded on the track: § 54-142v (findlaw), the Clean Slate Connecticut cannabis-erasure petition page (the authority for the no-official-form finding), § 54-142a (findlaw). All three carry `sha256: null`.

## Mechanism

There is no official form. The Clean Slate portal states plainly that a petition must be filed under § 54-142v or § 54-142d and that no official form exists, and the statute specifies exactly what the petition must contain. Relief is mandatory once the papers are in order.

## Route decision

Custom pleading, drafted. The registry declares `outputStrategy: custom_pleading` and `compositionMode: null`, and `packetSet.components` lists two custom-pleading components with no `officialFormId`:

1. `ct-cannabis-petition-primary-filing-1` — required primary filing (the petition).
2. `ct-cannabis-petition-supporting-affidavit-2` — conditional supporting affidavit, used where the arrest record does not establish the quantity or the paraphernalia-use fact.

No official-form dependency exists for this track, so nothing is blocked on lane D/E for the filing itself.

## What is deliberately absent

- **Proposed order.** Recommended in the source review, but no form exists and clerk acceptance is unconfirmed. Not drafted.
- **Certificate of service.** No service requirement was found in § 54-142v. Not drafted; `serviceNote` records the unresolved state verbatim.
- **Notice.** No notice requirement stated.
- **Cover sheet.** Neither source records one.
- **Verification statute citation.** `null`, handled the way the ND config handles its missing verification statute.
- **Record custodian list, sovereign party role, county line.** Null or suppressed; no source supplies them.

## Open counsel flags (11)

Release blockers: accepted caption/format for a § 54-142v petition (no statewide form; G.A. practice varies); service and proposed order.

Scope restrictions carried as flags: never generate the quantity, the paraphernalia-use characterization, an all-counts-erasable assertion the participant has not confirmed, or any assertion that the offense has been decriminalized (that is § 54-142d and carries case law). Erasure only — never expungement or sealing.

Gates: `legalStatus: legal_review_pending`; output, visual and technical-proof review all outstanding; every official source lacks a sha256, so staleness cannot be detected.

## F-review pointers

- **F / source freshness:** three official sources with `sha256: null` — § 54-142v, the Clean Slate cannabis-petition page, § 54-142a. Capture hashes before release.
- **F / source conflict:** the compiled profile's `terminology.primaryConsumerTerm` is `expungement` while `avoidUniversalExpungementLabel` is true and the track scope restriction requires *erasure*. The track scope restriction governs; the profile field is a normalizer artefact worth correcting upstream.
- **F / source conflict:** the compiled profile describes cannabis erasure as automatic for § 21a-279(c) possession convictions from 2000–2015 that took effect in January 2023. This track is the *petition* remedy for the wider § 54-142v categories, including convictions before 1 January 2000 and § 21a-267(a) / § 21a-277(b) convictions. The two are different remedies; the profile's "cannabis erasure is its own lane" quirk should not be read as covering this petition.
- **F / release:** the profile's fee table lists cannabis erasure at $0 under § 54-142a; the track cites § 54-142v(a)(4) for the same result. Consistent, but the citation used in participant copy should be the track's.

## Evidence

- `src/lib/rcap/state-packs/connecticut/all50-build-metadata.ts`, `src/lib/rcap/state-packs/connecticut/index.ts`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json` (sha256 `47a86bd5edec245949664a3302aecd1d077bafe11dad2876d866158c7437cdb7`)
- Pinned registry entry `tracks[trackId=ct-cannabis-petition]`

The committed Connecticut state pack records build metadata and the Nationwide inventory only; it carries no track-level filing text. Participant filing steps were taken from the track's `rules.filing`, `packetInstructions` and `packetSet.participantActionRequired`, corroborated against the profile's filing-instruction and fee sections.
