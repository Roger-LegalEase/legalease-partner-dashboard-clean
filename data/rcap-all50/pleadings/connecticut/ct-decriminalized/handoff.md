# Handoff — ct-decriminalized (CT, lane C1, controlled pleading)

Job `T-C-CT-production-packet` · treatment `production_packet` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| C.G.S. § 54-142d | The petition vehicle. Where a person was convicted of an offense that has since been decriminalized, the person may petition the Superior Court and the court **shall** direct the records to be physically destroyed. |
| State v. Menditto, 315 Conn. (2015) | Recorded as authority. The current scope of "decriminalized" after Menditto is unresolved; not read in full. |
| State v. Dudley | Recorded as authority. Held § 54-142d did not compel erasure of a violation of probation finding premised on a later-decriminalized offense; not read in full, no reporter citation recorded. |

Official sources on the track: § 54-142d (findlaw) and Menditto (findlaw caselaw), both with `sha256: null`. Dudley has no source record.

## Mechanism

The remedy is **physical destruction**, not erasure, and the trigger is decriminalization generally rather than the specific cannabis categories. No official form was located, so the filing vehicle is a custom pleading.

## Route decision

Custom pleading, drafted, with three open build blockers carried as counsel flags. `outputStrategy: custom_pleading`, `compositionMode: null`, and `packetSet.components` lists exactly one required custom-pleading primary filing — `ct-decriminalized-primary-filing-1`. There is no official form to depend on, so nothing here is a lane-D/E form handoff.

The build blockers govern **whether and what to file**, not the container:

1. The current scope of "decriminalized" after Menditto (eligibility_branch).
2. Whether the § 54-142a(k) fee bar reaches § 54-142d — it is a different section (filing_process).
3. The accepted filing practice, and whether the Judicial Branch has any form or practice note (filing_process).

Because of (1), the eligible offense set is stated nowhere in this artifact. Because of (2), no fee statement of any kind appears — not "no fee", not a waiver route. Because of (3), the caption is a token pattern only.

## What is deliberately absent

- **Proposed order, certificate of service, notice, affidavit, cover sheet** — no source records any of them for this track.
- **Verification statute** — `null`. The stated rule is that the source review does not state a notarization requirement, yet the registry lists a required `notarize` participant action. That conflict is flagged, not resolved.
- **Fee and fee-waiver text** — absent entirely; see blocker (2).
- **Sovereign party role, verification verb** — null; not stated anywhere.

## Open counsel flags (12)

Three build blockers above; the never-assert-decriminalization scope restriction; destruction-not-erasure terminology; the Dudley violation-of-probation stop condition; service, notice and notarization all unstated; court identity kept blank; `legal_review_pending` with four legal-design blockers open; and the source-freshness gate.

## F-review pointers

- **F / source freshness:** § 54-142d and Menditto both carry `sha256: null`. Dudley is cited as authority with no source entry, no reporter citation and no retrieval date — the weakest link on this track.
- **F / source gap:** the compiled CT profile (`sha256 47a86bd5…`) does not mention § 54-142d anywhere. It covers automatic erasure, Clean Slate, JD-CR-202, cannabis erasure and pardons only. Every § 54-142d fact in this artifact rests on the pinned registry entry alone, with no second source to corroborate it. That is the single most important thing for F review to know about this track.
- **F / source conflict:** the profile's fee section states flatly that "Connecticut erasure is free" and lists $0 across the board under § 54-142a. That statement must not be carried into this track — § 54-142d is a different section and the fee question is expressly open.
- **F / terminology:** the profile treats "erasure" as Connecticut's single term for record clearing. This track is the exception: its remedy is destruction. QA prohibited terms for this track therefore include "erasure".

## Evidence

- `src/lib/rcap/state-packs/connecticut/all50-build-metadata.ts`, `src/lib/rcap/state-packs/connecticut/index.ts`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json` (sha256 `47a86bd5edec245949664a3302aecd1d077bafe11dad2876d866158c7437cdb7`) — corroborates nothing on this track; recorded for completeness.
- Pinned registry entry `tracks[trackId=ct-decriminalized]`
