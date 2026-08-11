# Crosswalk resolution — combined disposition of the 38 Milestone 1 item 2 blockers

Integration of four Opus lanes (E4-R1, E4-R2, E4-R3, E4-R4) dispatched from `data/rcap-ledger/crosswalk-resolution-dispatch.json`, each based on `8744a701`.

Build status only. Every resolution carries `reviewStatus: qa_review_pending`; none of this is counsel-reviewed or approved for live.

## Totals

| Outcome | Count |
| --- | ---: |
| resolved | 30 |
| terminalized | 6 |
| still_blocked | 2 |
| **total** | **38** |

## By lane

| Lane | Jurisdictions | Jobs | resolved | terminalized | still_blocked |
| --- | --- | ---: | ---: | ---: | ---: |
| E4-R1 | IL, MT, NH, VT | 9 | 5 | 4 | 0 |
| E4-R2 | CT, MA, TX, UT | 9 | 9 | 0 | 0 |
| E4-R3 | DE, MD, PA, WV | 10 | 8 | 1 | 1 |
| E4-R4 | KY, MN, ND, SC | 10 | 8 | 1 | 1 |

## Carried defects — must clear before `approved_for_live`

### Unreachable evidence pins (9 citations, lane E4-R3)

9 citations pin `data/record-clearing/legal-design-track-registry.json` to commit `3b6f4c103d`, which is **not an ancestor of the integration base**. That file exists only on `origin/feat/record-clearing-production-integration` and is absent from `main` and from this branch, so a generator cannot re-check those citations from here — which stop condition 3 requires.

Each affected subject also carries 3–6 in-tree citations that do resolve, so no mapping rests on the unreachable pin alone. The mappings stand; the citation list needs the dead pin dropped or re-pinned to in-tree authority.

| Lane | Subject |
| --- | --- |
| E4-R3 | `compiled_pathway:DE:discretionary-court-expungement-under-11-del-c-4374` |
| E4-R3 | `compiled_pathway:MD:juvenile-expungement` |
| E4-R3 | `compiled_pathway:MD:second-chance-act-shielding` |
| E4-R3 | `compiled_pathway:WV:first-offense-drug-possession-conditional-discharge-relief` |
| E4-R3 | `registry_track:MD:md_10105_favorable` |
| E4-R3 | `registry_track:MD:md_pardon_expungement` |
| E4-R3 | `registry_track:WV:wv_conv_multiple_misdemeanors` |
| E4-R3 | `registry_track:WV:wv_conv_nonviolent_felony` |
| E4-R3 | `registry_track:WV:wv_conv_single_misdemeanor` |

### Counterpart id format is not uniform across lanes

17 counterparts are written qualified (`registry_track:CT:ct-cannabis-auto`) and 13 bare (`vt_seal_dui`). Both resolve to real ids, but a consumer must normalise on the last `:`-separated segment. The dispatch contract did not pin the format; that is a gap in the contract, not a lane error.

### Many-to-one counterparts

Several subjects share a counterpart. This is expected where one statute carries several registry tracks, but each pairing needs an attorney eye:

| Counterpart | Subjects |
| --- | --- |
| `tx_exp_dismissed` | `compiled_pathway:TX:expunction-after-qualifying-class-c-deferred-disposition`<br>`compiled_pathway:TX:expunction-after-qualifying-dismissal-or-quash` |
| `adult-non-conviction-expungement-under-crim-proc-10-105` | `registry_track:MD:md_10105_favorable`<br>`registry_track:MD:md_pardon_expungement` |
| `eligible-conviction-expungement-under-w-va-code-61-11-26` | `registry_track:WV:wv_conv_multiple_misdemeanors`<br>`registry_track:WV:wv_conv_nonviolent_felony`<br>`registry_track:WV:wv_conv_single_misdemeanor` |
| `felony-conviction-431073` | `registry_track:KY:ky_felony_expungement_after_pardon`<br>`registry_track:KY:ky_felony_vacatur_expungement` |

## Still blocked

- `compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement` (E4-R3) — retrieval packet: `docs/record-clearing/retrieval-packets/compiled_pathway_PA_path-k-human-trafficking-vacatur-expungement.md`
- `compiled_pathway:SC:human-trafficking-survivor-expungement` (E4-R4) — retrieval packet: `docs/record-clearing/retrieval-packets/compiled_pathway_SC_human-trafficking-survivor-expungement.md`

## Network posture

Every lane reported no outbound access; the agent proxy refused HTTPS. All authority cited is repository-committed, as the dispatch intended. That is also why the 2 still-blocked subjects cannot be closed here — both are human-trafficking vacatur remedies whose operative text is not committed, and both already have a retrieval packet waiting on someone with outbound access.
