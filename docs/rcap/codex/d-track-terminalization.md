# D track map and terminal-treatment plan

Status: **captain queue ready; analysis only; no family approval, track promotion, canonical-ledger regeneration, runtime change, or D implementation-branch change.**

## Result

The canonical lane-D job graph contains exactly **67 unique tracks in 27 jobs**. All 67 appear exactly once in the machine-readable map. The captain handoff's “55 derived / 12 unaccounted” result is not a canonical-set reconciliation: only 23 of those 55 IDs are canonical D IDs, 32 are state-local/noncanonical IDs, and 44 canonical D IDs are absent.

The map accepts only explicit pinned track/component relationships joined to a corrected family by the same jurisdiction and exact `officialFormId === documentId`. Similar names, state-only matches, punctuation normalization, substring matching, and silent revision succession are excluded. The sole exact-looking exception is fail-closed: Washington treaty-fishing has a generic CrRLJ pair in the relationship file but a more specific, unreconciled CR-09.0500/.0600/.0700 set in the D2A state index and compiled profile.

## Counts

| Measure | Count |
|---|---:|
| Expected canonical D tracks | 67 |
| Derived / unique | 67 / 67 |
| Canonical D jobs | 27 |
| Tracks with at least one exact family | 42 |
| Tracks with no exact family | 25 |
| Tracks with unresolved form relationships | 46 |
| Pinned component relationships | 179 |
| Exact-mapped component relationships | 78 |
| Explicitly blocked pinned component relationships | 101 |
| D2A assigned tracks recovered | 17 |
| Production packet candidates | 0 |
| Complete guidance candidates | 0 |
| Exact deferral candidates | 0 |
| Deliberate scope-exclusion candidates | 0 |
| Correction required | 7 |
| Held on source or design | 60 |

Every candidate remains `terminal: false`. Every track has source/authority, legal-adoption, participant-treatment, staging, current-proof, and runtime gates open in the standing authority ledger. A production-packet candidate would require exact, current, technically approved D families plus closed standing source, authority, design, adoption, proof, and participant-treatment gates. None meets that threshold; technical readiness is retained only as a separate signal.

## D2A reconstruction

D2A owns **17**, not 12, canonical tracks. The five canonical summaries are absent because the D2A regeneration driver writes only `state-index.json`; it neither imports the canonical graph nor writes `jurisdiction-summary.json`. The correction tip does not repair that persistence gap.

| Jurisdiction | Assigned tracks | Tracks with exact family edge | Tracks without exact family edge | Proposed summary |
|---|---:|---:|---:|---|
| AZ | 5 | 2 | 3 | `dispatch/d2a-proposed-jurisdiction-summaries/az.json` |
| IL | 4 | 4 | 0 | `dispatch/d2a-proposed-jurisdiction-summaries/il.json` |
| KS | 2 | 0 | 2 | `dispatch/d2a-proposed-jurisdiction-summaries/ks.json` |
| MN | 2 | 2 | 0 | `dispatch/d2a-proposed-jurisdiction-summaries/mn.json` |
| WA | 4 | 3 | 1 | `dispatch/d2a-proposed-jurisdiction-summaries/wa.json` |

The proposed summaries live only under this Codex-owned dispatch directory. Candidate/near-match families are explicitly labeled non-edges. In particular:

- Arizona CREM punctuation variants and RSA revision changes are not silently aliased.
- Illinois normalized family IDs do not replace the pinned issuer labels without a committed crosswalk; only FW-CIV-APPLICATION joins exactly.
- Kansas's generic `KSJC` family is not substring-matched to arrest or diversion forms.
- Minnesota's FEE102 support joins exactly, while the core EXP102/104/106 set remains absent.
- Washington treaty-fishing remains unresolved against the specific legacy CR-09.0500/.0600/.0700 set.

The eight summaries described by the handoff as having “empty arrays” actually omit the `tracks` property: FL, IA, LA, MA, NJ, NM, OR, and UT.

## Held-form treatment assessment

Committed evidence does **not** support a complete-guidance or exact-supported-deferral candidate for any D track. No candidate supplies the full track-specific reason, destination, next step, gather/do-not-file instructions, Briefcase handoff, payment prohibition, checkout suppression, zero packet/partner credit, and substantive English and Spanish. No substitute participant treatment was inferred from incomplete evidence.

This plan changes no runtime, checkout, payment, packet-credit, or partner-credit behavior.

## Nontechnical and execution gates

- Source/currentness/authority: 67/67 nonterminal; current owner `source_acquisition`; execute the exact per-track `nextExecutableAction` from the authority ledger.
- Track-level legal design: 67/67 terminal in the standing authority ledger (5 approved, 62 approved with limitations). Family implementation holds are preserved separately and not treated as track promotion.
- Legal adoption: 67/67 pending; owner **Roger** under `DEC-GLOBAL-COUNSEL-REVIEW`.
- Participant treatment and current packet proof: 67/67 nonterminal; owner **RCAP product owner** after prerequisite gaps close.
- Staging: 67/67 not accepted; owner **RCAP Captain**.
- Runtime wiring: 67/67 required and disabled; owner **Terminal A** after staging and worker publication/re-fingerprint.
- Technical corrections: 7 tracks; exact lane-owner/family assignments are in `dispatch/owner-assignments.json`.

## Complete track queue

| # | Jur. | Track | Exact required family IDs | Family technical disposition(s) | Component coverage | Proposed treatment | Current owner |
|---:|---|---|---|---|---:|---|---|
| 1 | AK | `ak-tf800` | `AK:tf-800-form-en` | technical_approved | 1/1 | `held_on_source_or_design` | `source_acquisition` |
| 2 | AK | `ak-tf805` | `AK:tf-805-form-en` | technical_approved | 3/3 | `held_on_source_or_design` | `source_acquisition` |
| 3 | AL | `al-felony-dwop` | `AL:c-10-criminal-form-en` | technical_approved | 1/3 | `held_on_source_or_design` | `source_acquisition` |
| 4 | AL | `al-felony-nonconviction-90` | `AL:c-10-criminal-form-en` | technical_approved | 1/3 | `held_on_source_or_design` | `source_acquisition` |
| 5 | AL | `al-misd-dwop` | `AL:c-10-criminal-form-en` | technical_approved | 1/3 | `held_on_source_or_design` | `source_acquisition` |
| 6 | AL | `al-misd-nonconviction-90` | `AL:c-10-criminal-form-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 7 | AL | `al-pardon` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 8 | AR | `ar-act531` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 9 | AR | `ar-cs-possession-seal` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 10 | AR | `ar-misdemeanor-seal` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 11 | AR | `ar-nonconviction-seal` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 12 | AZ | `az_certificate_second_chance` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 13 | AZ | `az_marijuana_expungement_limited_jurisdiction` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 14 | AZ | `az_marijuana_expungement_superior_court` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 15 | AZ | `az_record_sealing_conviction` | `AZ:aoccrsl1f-050825-form-en`<br>`AZ:aoccrsl2f-050825-form-en` | technical_approved | 2/3 | `held_on_source_or_design` | `source_acquisition` |
| 16 | AZ | `az_record_sealing_dismissal_not_guilty` | `AZ:aoccrsl1f-050825-form-en`<br>`AZ:aoccrsl2f-050825-form-en` | technical_approved | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 17 | CO | `co_decriminalized_conduct_seal` | `CO:jdf-2371-form-motion-en`<br>`CO:jdf-2374-form-order-en` | technical_approved, held_on_source_or_design | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 18 | CO | `co_motion_seal_nonconviction` | `CO:jdf-477-form-motion-en`<br>`CO:jdf-478-form-order-en` | technical_approved | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 19 | CO | `co_multiple_conviction_seal` | `CO:jdf-641-form-motion-en`<br>`CO:jdf-642-form-order-en` | technical_approved | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 20 | CO | `co_municipal_conviction_seal` | `CO:jdf-683-form-petition-en` | held_on_source_or_design | 1/2 | `held_on_source_or_design` | `source_acquisition` |
| 21 | CO | `co_pardoned_conviction_seal` | `CO:jdf-680-form-motion-en`<br>`CO:jdf-681-form-order-en` | held_on_source_or_design, technical_approved | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 22 | FL | `fl-expunction` | None (explicit relationships remain unresolved) | n/a | 0/4 | `held_on_source_or_design` | `source_acquisition` |
| 23 | IA | `ia-dci77` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 24 | IL | `il-exp-pardon` | `IL:fw-civ-application-form-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 25 | IL | `il-exp-precompletion` | `IL:fw-civ-application-form-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 26 | IL | `il-seal-edu` | `IL:fw-civ-application-form-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 27 | IL | `il-seal-nonconv` | `IL:fw-civ-application-form-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 28 | KS | `ks-21-6614-diversion` | None (explicit relationships remain unresolved) | n/a | 0/6 | `held_on_source_or_design` | `source_acquisition` |
| 29 | KS | `ks-22-2410-arrest` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 30 | KY | `ky_expungement_certification` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 31 | KY | `ky_protective_order_record_expungement` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 32 | LA | `la-987-set-aside-and-dismiss` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 33 | MA | `ma-seal-decrim` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 34 | MN | `mn_petition_15218` | `MN:fee102-support-en` | held_on_source_or_design | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 35 | MN | `mn_petition_juvenile_as_adult` | `MN:fee102-support-en` | held_on_source_or_design | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 36 | MO | `mo-575-120-identity-theft-correction` | `MO:cr300-source-gated-petition-en`<br>`MO:gn10-source-gated-motion-en` | correction_required, held_on_source_or_design | 2/4 | `correction_required` | `source_acquisition` |
| 37 | MO | `mo-610-140-arrest` | `MO:cr360-form-petition-en`<br>`MO:gn10-source-gated-motion-en` | technical_approved, held_on_source_or_design | 3/5 | `held_on_source_or_design` | `source_acquisition` |
| 38 | NC | `nc_145_5_misdemeanor` | `NC:aoc-cr-298-form-en`<br>`NC:aoc-cr-298-instructions-en`<br>`NC:aoc-cv-226-support-en`<br>`NC:aoc-cv-226-support-es`<br>`NC:aoc-cv-226-support-vi` | technical_approved, held_on_source_or_design | 2/3 | `held_on_source_or_design` | `source_acquisition` |
| 39 | NC | `nc_146_dismissal_petition` | `NC:aoc-cr-287-form-en`<br>`NC:aoc-cr-287-form-es`<br>`NC:aoc-cr-287-form-vi`<br>`NC:aoc-cr-287-instructions-en`<br>`NC:aoc-cr-287-instructions-es`<br>`NC:aoc-cr-287-instructions-vi`<br>`NC:aoc-cv-226-support-en`<br>`NC:aoc-cv-226-support-es`<br>`NC:aoc-cv-226-support-vi` | technical_approved, held_on_source_or_design | 2/3 | `held_on_source_or_design` | `source_acquisition` |
| 40 | ND | `nd-nonconviction-close-petition` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 41 | ND | `nd-prohibit-remote-public-access` | None (explicit relationships remain unresolved) | n/a | 0/4 | `held_on_source_or_design` | `source_acquisition` |
| 42 | ND | `nd-regular-pardon` | None (explicit relationships remain unresolved) | n/a | 0/1 | `held_on_source_or_design` | `source_acquisition` |
| 43 | NE | `ne-seal-pre2017` | `NE:cc-6-12-form-en`<br>`NE:cc-6-12-instructions-en`<br>`NE:cc-6-15-1-form-en` | technical_approved | 2/3 | `held_on_source_or_design` | `source_acquisition` |
| 44 | NH | `nh_conviction_streamlined` | `NH:nhjb-2311-support-fee-waiver-en`<br>`NH:nhjb-2328-support-affidavit-en`<br>`NH:nhjb-2956-support-record-request-en` | technical_approved, correction_required | 3/4 | `correction_required` | `source_acquisition` |
| 45 | NH | `nh_petition_nonconviction_pre2019` | `NH:nhjb-2311-support-fee-waiver-en`<br>`NH:nhjb-2328-support-affidavit-en`<br>`NH:nhjb-2956-support-record-request-en` | technical_approved, correction_required | 3/4 | `correction_required` | `source_acquisition` |
| 46 | NH | `nh_petition_vacated` | `NH:nhjb-2311-support-fee-waiver-en`<br>`NH:nhjb-2328-support-affidavit-en`<br>`NH:nhjb-2956-support-record-request-en` | technical_approved, correction_required | 3/4 | `correction_required` | `source_acquisition` |
| 47 | NJ | `nj_indictable_conviction` | `NJ:cn-10557-en` | technical_approved | 4/4 | `held_on_source_or_design` | `source_acquisition` |
| 48 | NJ | `nj_ordinance` | `NJ:cn-10557-en` | technical_approved | 4/4 | `held_on_source_or_design` | `source_acquisition` |
| 49 | NM | `nm_identity_theft` | `NM:nm-local-identity-theft-order-en` | technical_approved | 1/4 | `held_on_source_or_design` | `source_acquisition` |
| 50 | OR | `or_arrest_no_charges` | `OR:or-ojd-adult-set-aside-packet-motion-and-declaration`<br>`OR:or-osp-set-aside-criminal-history-request-and-instructions` | technical_approved | 3/3 | `held_on_source_or_design` | `source_acquisition` |
| 51 | OR | `or_dismissed_charge` | `OR:or-ojd-adult-set-aside-packet-motion-and-declaration`<br>`OR:or-osp-set-aside-criminal-history-request-and-instructions` | technical_approved | 3/3 | `held_on_source_or_design` | `source_acquisition` |
| 52 | TX | `tx_nd_dwi_conviction` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 53 | TX | `tx_nd_dwi_deferred` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 54 | TX | `tx_nd_probation_misdemeanor` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 55 | TX | `tx_nd_veterans_court` | None (explicit relationships remain unresolved) | n/a | 0/3 | `held_on_source_or_design` | `source_acquisition` |
| 56 | UT | `ut_pet_remove_link` | None (explicit relationships remain unresolved) | n/a | 0/4 | `held_on_source_or_design` | `source_acquisition` |
| 57 | VA | `va_exp_nonconviction` | `VA:cc-1473-form-en` | correction_required | 1/1 | `correction_required` | `source_acquisition` |
| 58 | VA | `va_seal_enumerated_seven_year` | `VA:cc-1201-form-en` | technical_approved | 1/1 | `held_on_source_or_design` | `source_acquisition` |
| 59 | VA | `va_seal_petition_felony` | `VA:cc-1201-form-en` | technical_approved | 1/1 | `held_on_source_or_design` | `source_acquisition` |
| 60 | VA | `va_seal_petition_misdemeanor` | `VA:cc-1201-form-en` | technical_approved | 1/1 | `held_on_source_or_design` | `source_acquisition` |
| 61 | VT | `vt_seal_pardon` | `VT:200-00130-form-en`<br>`VT:200-00132-form-en`<br>`VT:600-00228-support-en` | technical_approved, correction_required | 3/3 | `correction_required` | `source_acquisition` |
| 62 | WA | `wa_vac_homicide_victim_prostitution` | `WA:crrlj-09-0100-form-en`<br>`WA:crrlj-09-0200-form-en` | held_on_source_or_design | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 63 | WA | `wa_vac_misdemeanor_ordinary` | `WA:crrlj-09-0100-form-en`<br>`WA:crrlj-09-0200-form-en` | held_on_source_or_design | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 64 | WA | `wa_vac_substance_use_disorder` | `WA:crrlj-09-0100-form-en`<br>`WA:crrlj-09-0200-form-en` | held_on_source_or_design | 2/2 | `held_on_source_or_design` | `source_acquisition` |
| 65 | WA | `wa_vac_treaty_fishing` | None (explicit relationships remain unresolved) | n/a | 0/2 | `held_on_source_or_design` | `source_acquisition` |
| 66 | WI | `wi_exp_cr266` | `WI:cr-266-form-en`<br>`WI:cr-267-form-en` | technical_approved, correction_required | 2/2 | `correction_required` | `source_acquisition` |
| 67 | WI | `wi_nc_doj_challenge` | `WI:dj-le-247-support-en` | technical_approved | 1/1 | `held_on_source_or_design` | `source_acquisition` |

## Evidence and reproducibility

The canonical job universe and track gates come from `d324b897a8342d81f1a73d62cd529c87b8408feb` ledger artifacts. Track/component/form edges come from the registry-pinned `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` relationship file at recorded SHA-256 `8376337488a0e07eb0b476f7623bfbb623272d167ecd15b23c93cbb47922b826`. Family identities, source SHAs, revisions, route artifacts, and final technical dispositions come from the corrected manifest, immutable correction tips, and captain handoff.

Run:

`node docs/rcap/codex/d-track-terminalization/dispatch/build-and-verify.mjs --verify`

The command regenerates deterministic outputs and verifies cardinality, uniqueness, exact-edge evidence, D2A coverage, treatment vocabulary, bilingual deferral policy, safety posture, and output scope.
