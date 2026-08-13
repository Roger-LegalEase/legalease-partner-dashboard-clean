# D relationship resolution

This Codex-owned proposal resolves the canonical 25-track no-family set at `fe354ffcb05f25a3a503874008ceef07c9ce6c6b`. It does not modify the canonical map, source corpus, runtime, ledger, or review dispositions.

## Result

| Measure | Count |
| --- | ---: |
| Canonical D tracks | 67 |
| Current no-exact-family tracks | 25 |
| Relationship rows audited | 62 |
| Proposed exact component/family edges | 19 |
| Captain-ready exact edges | 16 |
| Exact Kansas edges awaiting pin correction | 3 |
| Remaining executable relationship rows | 43 |
| Owner jobs | 13 |
| Guidance candidates | 0 |
| Exact deferral candidates | 0 |
| Scope exclusions | 0 |

The 62 rows are 59 canonical pinned components plus three treaty-specific Washington source rows already present in the imported map. The exact edges reach 11 tracks; four tracks have all relationship rows resolved exactly and seven are partial. Fourteen tracks still have no exact family.

## Classification

| Outcome | Rows |
| --- | ---: |
| `currentness_unverified` | 1 |
| `exact_proposed_order_component` | 8 |
| `exact_required_component` | 9 |
| `exact_supporting_component` | 2 |
| `identity_ambiguous` | 10 |
| `metadata_relationship_missing` | 13 |
| `source_binary_missing` | 9 |
| `source_not_required` | 4 |
| `stale/superseded` | 4 |
| `unsupported` | 2 |

An exact edge is an identity conclusion only. The output preserves source/currentness, legal-design, legal-adoption, participant-treatment, runtime, payment, checkout, credit, staging, and technical gates independently. The allowed `source_not_required` outcome means only that no standalone binary is needed for that component remap; it does not authorize a terminal treatment.

## Track queue

| Jurisdiction | Track | Exact | Remaining | Posture | Owner jobs |
| --- | --- | ---: | ---: | --- | --- |
| AL | `al-pardon` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-AL-ABPP3-IDENTITY` |
| AR | `ar-act531` | 2 | 0 | `all_component_relationships_exact_but_nonrelationship_gates_remain` | captain exact-edge import |
| AR | `ar-cs-possession-seal` | 2 | 0 | `all_component_relationships_exact_but_nonrelationship_gates_remain` | captain exact-edge import |
| AR | `ar-misdemeanor-seal` | 1 | 1 | `partial_exact_relationships_remaining_component_actions` | `DREL-AR-EDGE-MATERIALIZATION` |
| AR | `ar-nonconviction-seal` | 2 | 0 | `all_component_relationships_exact_but_nonrelationship_gates_remain` | captain exact-edge import |
| AZ | `az_certificate_second_chance` | 0 | 2 | `no_exact_family_relationship_yet` | `DREL-AZ-FORM-IDENTITY` |
| AZ | `az_marijuana_expungement_limited_jurisdiction` | 1 | 1 | `partial_exact_relationships_remaining_component_actions` | `DREL-AZ-FORM-IDENTITY` |
| AZ | `az_marijuana_expungement_superior_court` | 1 | 0 | `all_component_relationships_exact_but_nonrelationship_gates_remain` | captain exact-edge import |
| FL | `fl-expunction` | 0 | 4 | `no_exact_family_relationship_yet` | `DREL-FL-SOURCE-AND-RULE-TEXT` |
| IA | `ia-dci77` | 0 | 2 | `no_exact_family_relationship_yet` | `DREL-IA-COMBINED-PACKET` |
| KS | `ks-21-6614-diversion` | 3 | 3 | `partial_exact_relationships_remaining_component_actions` | `DREL-KS-FORM-SET` |
| KS | `ks-22-2410-arrest` | 0 | 3 | `no_exact_family_relationship_yet` | `DREL-KS-FORM-SET` |
| KY | `ky_expungement_certification` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-KY-IDENTITY-SCOPE` |
| KY | `ky_protective_order_record_expungement` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-KY-IDENTITY-SCOPE` |
| LA | `la-987-set-aside-and-dismiss` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-LA-FILING-VEHICLE` |
| MA | `ma-seal-decrim` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-MA-OCP-MATERIALIZATION` |
| ND | `nd-nonconviction-close-petition` | 0 | 3 | `no_exact_family_relationship_yet` | `DREL-ND-SOURCE-MATERIALIZATION` |
| ND | `nd-prohibit-remote-public-access` | 0 | 4 | `no_exact_family_relationship_yet` | `DREL-ND-SOURCE-MATERIALIZATION` |
| ND | `nd-regular-pardon` | 0 | 1 | `no_exact_family_relationship_yet` | `DREL-ND-SOURCE-MATERIALIZATION` |
| TX | `tx_nd_dwi_conviction` | 1 | 2 | `partial_exact_relationships_remaining_component_actions` | `DREL-TX-COMPONENT-COMPLETION` |
| TX | `tx_nd_dwi_deferred` | 2 | 1 | `partial_exact_relationships_remaining_component_actions` | `DREL-TX-COMPONENT-COMPLETION` |
| TX | `tx_nd_probation_misdemeanor` | 2 | 1 | `partial_exact_relationships_remaining_component_actions` | `DREL-TX-COMPONENT-COMPLETION` |
| TX | `tx_nd_veterans_court` | 2 | 1 | `partial_exact_relationships_remaining_component_actions` | `DREL-TX-COMPONENT-COMPLETION` |
| UT | `ut_pet_remove_link` | 0 | 4 | `no_exact_family_relationship_yet` | `DREL-UT-ROUTE-FORM-SET` |
| WA | `wa_vac_treaty_fishing` | 0 | 5 | `no_exact_family_relationship_yet` | `DREL-WA-TREATY-FORM-SET` |

## Terminal-treatment boundary

No track has a repository-supported complete bilingual guidance, exact deferral, or deliberate scope-exclusion candidate. A pinned scan of 36 committed treatment-corpus JSON files found 76 distinct trackId values and zero intersection with these 25; the prior canonical candidate record also marks every one terminal:false and held_on_source_or_design. All 25 remain held, with payment prohibited, checkout suppressed, unchanged Briefcase behavior, no authored participant treatment, and zero packet and partner credit. The absence of a source binary is not itself a referral treatment.

## Dispatch

The `dispatch/` directory contains one state-sized executable job per owner group. Metadata jobs do not go to counsel. Roger receives only the Kentucky protective-order scope decision. A later substantive Rule 3.989 output, route change, legal predicate, protected-field change, or licensing conflict may create a separate human/counsel gate.

## Reproduce

Run:

    node docs/rcap/codex/d-relationship-resolution/build-and-verify.mjs

The build pins input SHA-256 values, validates the 25/59/3/62 denominators, classifies every row once, rejects unsupported family acceptance, validates commercial fail-closed behavior, and writes deterministic JSON and Markdown. Run the same command with `--check` for byte-for-byte and exact-path-set verification without writing.
