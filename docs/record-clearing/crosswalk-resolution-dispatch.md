# Crosswalk resolution dispatch — the 38 Milestone 1 item 2 blockers

Generated from `data/rcap-ledger/e3-job-graph.json` (crosswalk contentHash `964a9ac4463c31df2298862c2dbd261bcddec6988155867eee0a2a9d6acfb4d1`).

**38 blockers** — 30 compiled pathways and 8 registry tracks — across 4 Opus lanes. This is not a new evidence wave; the 363-job E2 wave is complete and superseded.

| Lane | Jobs | Jurisdictions |
| --- | ---: | --- |
| E4-R1 | 9 | IL, MT, NH, VT |
| E4-R2 | 9 | CT, MA, TX, UT |
| E4-R3 | 10 | DE, MD, PA, WV |
| E4-R4 | 10 | KY, MN, ND, SC |

Partitioned by jurisdiction so a state's blockers stay together: the discriminator for a state's ambiguous track is usually that same state's pathway, and splitting a jurisdiction would make two lanes derive the same reading and risk disagreement.

## Stop conditions

- A subject is resolved when a registry track (or compiled pathway) is named on cited authority committed in this repository.
- A subject is terminalized when it is shown that no such counterpart exists, with the blocker published.
- 'No citation available' is not an outcome. Neither is a mapping proposed without a license the generator can re-check.
- A subject blocked on primary authority that this repository does not contain is returned as still-blocked, naming the retrieval packet — not guessed.

## Paths no lane may write

- `data/rcap-ledger/track-pathway-crosswalk.json`
- `data/rcap-ledger/registry-crosswalk-projection.json`
- `data/rcap-ledger/crosswalk-adjudications.json`
- `data/rcap-ledger/e3-job-graph.json`
- `data/rcap-ledger/e2-evidence-jobs.json`
- `data/rcap-ledger/e2-dispatch-assignment.json`
- `data/rcap-crosswalk-enrichment/e2-source-support-audit.json`
- `data/rcap-ledger/e2-evidence/`
- `package.json`
- `supabase/`
- `scripts/`

Each lane writes only its own resolution file and report. Integration is a single captain pass afterwards, exactly as with the eight E2 lanes.

## Jobs by lane

### E4-R1 (9)

- `compiled_pathway:IL:criminal-identity-theft-mistaken-identity-relief`
- `compiled_pathway:IL:human-trafficking-survivor-vacatur-and-expungement`
- `compiled_pathway:MT:marijuana-related-redesignation-expungement-under-mmrta`
- `compiled_pathway:NH:dwi-dui-annulment`
- `compiled_pathway:NH:out-of-state-federal-or-military-record-guidance`
- `compiled_pathway:VT:adult-conviction-expungement-narrow-statutory-route`
- `compiled_pathway:VT:adult-misdemeanor-conviction-sealing`
- `compiled_pathway:VT:dui-sealing`
- `compiled_pathway:VT:juvenile-sealing`

### E4-R2 (9)

- `compiled_pathway:CT:cannabis-conviction-erasure`
- `compiled_pathway:MA:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k`
- `compiled_pathway:TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a`
- `compiled_pathway:TX:expunction-after-pardon-or-actual-innocence-relief`
- `compiled_pathway:TX:expunction-after-qualifying-class-c-deferred-disposition`
- `compiled_pathway:TX:expunction-after-qualifying-dismissal-or-quash`
- `compiled_pathway:UT:path-a-automatic-clean-slate-expungement`
- `compiled_pathway:UT:path-e-petition-based-non-conviction-expungement`
- `compiled_pathway:UT:path-f-petition-based-conviction-expungement`

### E4-R3 (10)

- `compiled_pathway:DE:discretionary-court-expungement-under-11-del-c-4374`
- `compiled_pathway:MD:juvenile-expungement`
- `compiled_pathway:MD:second-chance-act-shielding`
- `compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement`
- `compiled_pathway:WV:first-offense-drug-possession-conditional-discharge-relief`
- `registry_track:MD:md_10105_favorable`
- `registry_track:MD:md_pardon_expungement`
- `registry_track:WV:wv_conv_multiple_misdemeanors`
- `registry_track:WV:wv_conv_nonviolent_felony`
- `registry_track:WV:wv_conv_single_misdemeanor`

### E4-R4 (10)

- `compiled_pathway:KY:felony-conviction-431073`
- `compiled_pathway:KY:juvenile-automatic-dismissal`
- `compiled_pathway:MN:automatic-mistaken-identity-expungement-under-609a-017`
- `compiled_pathway:MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06`
- `compiled_pathway:ND:marijuana-specific-summary-pardon-or-sealing-relief`
- `compiled_pathway:SC:diversion-or-program-completion-expungement`
- `compiled_pathway:SC:human-trafficking-survivor-expungement`
- `registry_track:KY:ky_expungement_certification`
- `registry_track:KY:ky_felony_expungement_after_pardon`
- `registry_track:KY:ky_felony_vacatur_expungement`

