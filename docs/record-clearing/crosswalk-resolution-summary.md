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

### Off-branch pinned evidence (9 citations) — accepted

9 citations pin `data/record-clearing/legal-design-track-registry.json@3b6f4c103d`. Off-branch immutable evidence is a supported input: each pin resolves to a full commit, the blob resolves, and the cited records are present, so a generator can re-check them offline. The pinned commit is **not** required to be an ancestor of the lane base.

An earlier captain pass wrongly called these unreachable and published that as a defect in commit `2e53a327`. That finding is retracted; see `data/rcap-ledger/crosswalk-resolution-adjudication.json`.

No unreachable evidence pins.

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
