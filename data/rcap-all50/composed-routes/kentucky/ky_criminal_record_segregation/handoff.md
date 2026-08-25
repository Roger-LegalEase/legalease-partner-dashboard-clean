# Handoff — ky_criminal_record_segregation (KY, lane C1, composed route)

Job `T-C-KY-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| KRS 17.142(1) | The agency duty: segregate on the arrestee's written request, where the person was found innocent or all charges relating to the offence were dismissed or withdrawn |
| KRS 17.142(2) | The court route: the person may apply to the court, which **shall forthwith** issue an order to all law enforcement agencies |
| KRS 17.142(3) | What segregation means — separate file from convicted persons, downstream notification duty on each agency, segregated record must show the disposition |
| KRS 17.142(4) | The limit: records subject to KRS 431.076 or KRS 431.078 are sealed under those statutes instead |
| Clerks' Manual, glossary code SG | Court records are not records which may be segregated |

Official sources recorded on the track: KRS 17.142, and the Kentucky Circuit Court Clerks' Manual, July 2026 (recorded only as the Circuit Court portal root). **Both carry `sha256: null`.**

## Mechanism

Two independent participant-initiated routes to the same relief. Either obtains segregation; a participant may use both. Relief on the court route is mandatory on receipt of the application. Segregation moves records into a separate file — it deletes nothing, and the segregated record must show how the case ended.

## Route decision

Composed route, `compositionMode: alternative`, **three units, all implemented, none blocked on an official form.**

| # | Unit | Output | Component | State |
| --- | --- | --- | --- | --- |
| 1 | `ky_seg_court_application` | `pleading_document` | `…-primary-filing-1` | **Drafted** (config + 4 fixtures) |
| 2 | `ky_seg_agency_written_request` | `agency_request_letter` | `…-agency-written-request-2` | **Drafted** (letter + 4 fixtures) |
| 3 | `ky_seg_routing_guidance` | `participant_instruction` | `…-routing-guidance-3` | **Drafted** (guidance + 4 fixtures) |

Units 1 and 2 are the registry's own two `units[]` entries, carried through with their unitIds unchanged. Unit 3 is the registry's third packetSet component (`routing_guidance`, the only *required* one) rather than a registry legal unit; it is marked `registryUnitIndex: null` in `route.json` and justified in the omission proof.

**No official-form dependency exists on this route.** No packetSet component carries an `officialFormId`, neither official source is a form, and the registry states directly: "No official form exists, so the application is drafted." Nothing here is blocked on lane D/E.

## What is deliberately absent

- **Proposed order.** KRS 17.142(2) makes the order the court's own forthwith act; no form is recorded and no source says one is tendered. Drafting it would invent the terms of an order binding every law enforcement agency in the Commonwealth.
- **Certificate of service, notice.** KRS 17.142 provides for no notice to a prosecutor or any other party; no service on the court route.
- **Verification.** No source addresses whether the application must be verified. `verificationStatute.citation` is `null` and no block is rendered — the ND handling.
- **Court level.** The recorded venue is functional ("the court in which the case was tried, or in which it would have been tried had charges been filed") and never names a level. The circuit court clerk serves both District and Circuit Court, so the filing destination does not resolve it either. `presentation.courtName` is a single unresolved token.
- **Agency names and addresses.** No source read for this track names a single Kentucky agency. Everything comes from `segAgencies`.
- **Any fee statement, in either direction.** See below.
- **Cover sheet.** Not recorded anywhere.

## Open counsel flags (15 at route level, 10 on the application component)

**Build blocker — the defining issue on this track.** The controlling review classifies KRS 17.142 as an agency-level mechanism retained for completeness and *expressly not a product track*, supplying no output strategy, filing actor or destination. The statute contains two participant-initiated routes, one with mandatory relief, so the product rule points the other way. This route is drafted as a container and the departure is flagged, not concealed. Note the shape of this blocker: it asks *whether this should be a product*, not *what the instruments say*. Nothing about either instrument's vehicle, venue or content is unknown — which is why drafting proceeded, in contrast to a blocked-vehicle case where drafting would be invention.

**Release blocker.** The legal propositions both instruments assert about the effect of segregation — the KRS 17.142(3) duty, the downstream notification duty, the disposition-showing requirement — are unratified.

**Release blocker.** Whether any court filing fee attaches to a KRS 17.142(2) application. None was identified. This is an absence of evidence, not evidence of absence, and the route treats it that way: **no fee figure and no no-fee promise appears anywhere**, and the participant is told to ask the clerk. Note the contrast with the two Kentucky void-and-seal tracks, where the Clerks' Manual affirmatively records no fee.

Scope and self-help boundaries: route to KRS 431.076 / KRS 431.078 first (this is the big one — KRS 17.142(4) sends most acquittals and dismissals there, leaving withdrawn charges as the clearest residue); court records cannot be segregated; segregation is not expungement and does not clean a background check; whether *all* charges ended favourably is the participant's own fact; no agency identity prefilled; no notice or service; both routes may be used.

Gates: `legalStatus: legal_review_pending`, `legalDesignStatus: legal_design_approved_with_limitations`, `implementationQueue: D_composed_or_process_guidance`; output, visual and technical-proof review outstanding; two official sources with no hash.

## F-review pointers

- **F / product classification, highest value on this track.** The build blocker is a genuine conflict between the controlling review and the current statutory text, and it is the one question that decides whether these three components ship or are deleted. It should be answered before any further work is spent here.
- **F / source freshness.** Two sources, `sha256: null` on both. The Clerks' Manual is the *sole* authority for the court-records-cannot-be-segregated scope restriction — a restriction that materially narrows what this route can promise — and it is cited only as `https://www.kycourts.gov/Courts/Circuit-Court/Pages/default.aspx`, a portal root. That is the weakest load-bearing citation in this jurisdiction.
- **F / source gap.** The compiled KY profile does not record this mechanism: the strings `17.142` and `segregat` appear nowhere in the 87 KB profile, and the Kentucky Nationwide corpus behind it is six expungement-side AOC PDFs plus one PDF and two HTML reference files. The profile's one relevant contribution is negative and is honoured here — KRS 431.076 and KRS 431.078 *are* live pathways in it, which is exactly where KRS 17.142(4) sends most candidate records.
- **F / practical scope.** What survives KRS 17.142(4) is an open research note. The clearest residue is charges withdrawn, which KRS 431.076 does not name. If that residue turns out to be empty, the product answer to the build blocker follows from it.
- **F / no recourse recorded.** No source read for this track states what an agency must do on receipt of a written request, in what time, or what the participant's recourse is if nothing happens. The letters therefore state no deadline and no consequence. Worth confirming whether any exists.

## Evidence

- `src/lib/rcap/state-packs/kentucky/index.ts`, `src/lib/rcap/state-packs/kentucky/all50-build-metadata.ts`
- `src/lib/rcap-engine/compiled/profiles/KY-kentucky.json` (sha256 `441a89c697a0443e6b429e4f3be750d26af5e1bb31afbabd61800f020394b438`)
- Pinned registry entry `tracks[trackId=ky_criminal_record_segregation]`

The committed Kentucky state pack records build metadata and the Nationwide inventory only. Every filing step in `participant-instructions.md` comes from the track's `rules`, `packetInstructions`, `packetSet.participantActionRequired` and `selfHelpStopConditions`.

## Renderer-compatibility findings (observed, not theoretical)

A rendered sample of this track's canonical fixture was produced in this worktree against `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`. Three defects showed up. All are renderer/adapter defects; no source-faithful field was changed to hide them.

1. **`usesCounty: true` is Pennsylvania mode.** The flag is documented as a county-line switch, but its true branch hardcodes *"the Court of Common Pleas of {county} County, Pennsylvania"* into the jurisdiction and venue paragraphs and *"The Pennsylvania State Police, {county} County Court of Common Pleas"* into the custodian line. The first sample put Pennsylvania into a Kentucky filing. **Fixed in the config**: `usesCounty` is now `false` and the county rides the `{county}` token in `courtName` / `venueDescriptor`, the way the ND config handles it. The renderer should separate "uses a county line" from "is Pennsylvania".
2. **Nulls are stringified.** Fields deliberately left `null` under the sourced-content-only rule printed as the literal word `null` — in the caption party role, in the parties block, and inside the verification clause. `null` is the convention this artifact set is required to use for unsourced values, so the adapter must omit the line or clause instead of stringifying it.
3. **A verification section was emitted anyway.** On this track verification is *unaddressed* by every source rather than affirmatively excluded, so the correct output is no verification clause and a visible gap — not a clause built from a null verb. See `rendererCompatibility.adapterDefects` in the config for the exact required behaviour.

`rendererCompatibility` in the pleading config records all of this in machine-readable form.

A fourth defect is specific to this route: the renderer's fixed clauses *"where the proceedings occurred"* and *"the criminal proceedings that are the subject of this application"* are false on the no-charges-filed branch, where the recorded venue is the court in which the matter *would* have been tried and there were no proceedings at all. The sourced venue rule has not been bent to fit the renderer's sentence; the adapter needs a no-proceedings variant.
