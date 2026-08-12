# Handoff — ct-missed-erasure (CT, lane C1, composed route)

Job `T-C-CT-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| C.G.S. § 54-142t(g) | The remedy, available on and after 1 January 2024. Submission to DESPP in a form and manner the department determines; DESPP determines the matter following a contested hearing. |
| C.G.S. § 54-142a(e) | The erasure the record should have received by operation of law. |
| UAPA, chapter 54 | The DESPP determination is a final decision under the Uniform Administrative Procedure Act. |
| DESPP form DPS-0846-C (Rev. 12/01/17) | The official form for the criminal history record search the statute requires the submission to include. |

## Mechanism and route decision

Sequential composed route with **no court document at all** — there is no court venue; the destination is DESPP. Three units:

1. **Obtain the record** — official form dependency (DPS-0846-C). Mandatory official-form handoff to lane D/E.
2. **Read the record and decide whether there is a case** — the one deliverable, `process-guidance.md`. The registry marks this stage `available: true` and says explicitly that it is "not held back by the unresolved submission vehicle downstream".
3. **Submission to DESPP** — blocked. DESPP's form and manner is not in the statute and was not located.

Registry `units[]` records two stages; this route splits stage 1 into its two distinct legal units because obtaining the record runs through an official DESPP form and reading it does not. `omissionProof` in `route.json` records that split and enumerates every registry and profile passage behind it.

No `agency_request_letter` unit was written even though the destination is an agency. Drafting a letter for the § 54-142t(g) submission would be exactly the invented DESPP filing document that the legal-design blocker prohibits.

## Open counsel flags (11)

The build blocker (DESPP form and manner); two release blockers (stale SPBI fees and process; the disputed "dated on or after 1 January 2024" report rule); the contested-hearing attorney handoff; never-collect-the-record; no court venue; never-assume-auto-erasure; immigration stop; `legal_review_pending`; source-freshness gate; terminology.

## F-review pointers

- **F / source conflict — highest value on this track.** The compiled CT profile asserts twice that the SPBI check must be "dated on/after 1/1/2024" (`sourceSections[5]` Required forms, `sourceSections[11]` SPBI request process). The pinned registry says that is probably a misreading of when the § 54-142t(g) remedy became available, and instructs that it be treated as unresolved rather than as a rule. Nothing in this route states a report-date rule. This conflict should be resolved at the profile, not worked around per-track.
- **F / source freshness:** DPS-0846-C on file is Rev. 12/01/17; its `officialSources` URL is only the DESPP portal root, and § 54-142t carries `sha256: null`. The Nationwide copy does carry a hash (`8db6e31c…`), so the file identity is fixed even though the revision is stale.
- **F / source gap:** the compiled profile never mentions § 54-142t(g) by name. It refers to the SPBI record "supporting a hearing request" and stops there. The statutory mechanism, the contested hearing and the UAPA final-decision status all rest on the pinned registry alone.
- **F / fee policy:** the registry records SPBI figures ($36 / $75 / $75 + $15) drawn from the 12/01/17 form. The profile's fee section says in terms to verify the current fee rather than quoting a fixed figure. This route quotes none, in either the participant instructions or the guidance component. If F review wants figures published, that decision needs a fresh source.

## Mandatory official-form handoffs

- `DPS-0846-C` — current revision and official URL, plus the current SPBI fee schedule. Component `ct-missed-erasure-spbi-record-request-0`.
- **DESPP's § 54-142t(g) submission vehicle** — unlocated; no form ID exists to name. Component `ct-missed-erasure-despp-submission-2`.

## Evidence

- `src/lib/rcap/state-packs/connecticut/all50-build-metadata.ts` (DPS-0846-C file identity and hash), `src/lib/rcap/state-packs/connecticut/index.ts`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json` (sha256 `47a86bd5edec245949664a3302aecd1d077bafe11dad2876d866158c7437cdb7`)
- Pinned registry entry `tracks[trackId=ct-missed-erasure]`
