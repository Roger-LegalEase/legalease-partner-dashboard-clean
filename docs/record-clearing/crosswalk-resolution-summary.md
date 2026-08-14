# Crosswalk resolution — combined disposition of the 38 Milestone 1 item 2 blockers

Integration of four Opus lanes (E4-R1, E4-R2, E4-R3, E4-R4) dispatched from `data/rcap-ledger/crosswalk-resolution-dispatch.json`, each based on `8744a701`.

Build status only. Every resolution carries `reviewStatus: qa_review_pending`; none of this is counsel-reviewed or approved for live.

## Canonicalized — and one lane mapping corrected

The E4 adjudications are now a consumed input to the canonical crosswalk generator, not a document beside it. `data/rcap-ledger/crosswalk-resolution-adjudication.json` carries 38 canonical relationships; `scripts/generate-rcap-track-pathway-crosswalk.mjs` reads them, re-checks every licence and evidence pin on each run, and fails closed on eleven distinct conditions. `scripts/verify-rcap-e4-adjudication-mutations.mjs` proves the dependency: 27 mutations of the input each turn the crosswalk check red.

**The R3 dead-pin finding published in `2e53a327` was wrong and is retracted in `8af8d4b2`.** The nine E4-R3 citations pinning `data/record-clearing/legal-design-track-registry.json@3b6f4c10` are valid. The commit resolves, the blob resolves at 497 tracks, and all five cited records are present. The ancestor requirement that produced the finding was invented by the captain's first verifier and appears in neither the dispatch stop conditions nor the lane brief. E4-R3 was owed no corrective commit. See `data/rcap-ledger/crosswalk-resolution-adjudication.json` for the full retraction and the three verifier errors behind it.

**One lane mapping did not survive substantive adjudication.** `registry_track:MD:md_pardon_expungement` was mapped by E4-R3 to `adult-non-conviction-expungement-under-crim-proc-10-105`. That pathway is expressly scoped to cases that did not end in a conviction and mentions "pardon" zero times, while the track carries the single disposition `pardoned_conviction`. The MD profile refutes the mapping directly: `rule-11-full-and-unconditional-governor-pardon-10-105-route-onl` carries `candidatePathwayIds` of cannabis, automatic, second-chance and juvenile — it routes pardon applicants away from the proposed pathway, and none of the seven committed MD pathways represents the pardon route. The track is held `still_blocked` rather than absorbed into `missing_from_compiled_runtime`, so the blocker stays visible in the unresolved count.

The Maryland, West Virginia and Kentucky collisions were re-examined against the compiled profiles. WV and KY hold: the WV pathway names all three conviction classes in its own text, and the KY pathway is labelled for vacatur and states the pardon predicate. Both keep their exact relationships, with the counsel questions preserved as separate `reviewRequirement` records that carry no launch-ledger effect.

**Unresolved: 3.** `PA:path-k-human-trafficking-vacatur-expungement` and `SC:human-trafficking-survivor-expungement` remain blocked on official primary authority; `MD:md_pardon_expungement` is blocked on a compiled-runtime pathway. Each has an exact job in `docs/record-clearing/official-source-jobs.md`. Milestone 1 item 2 is not closed.

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
