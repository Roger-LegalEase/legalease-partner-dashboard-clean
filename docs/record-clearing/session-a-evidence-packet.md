# Session A evidence packet

One record for each of the **284** intended-paid pathways in Session A's canonical
pathway-family graph. The graph is consumed as-is: every pathway key, registry track list
and disposition is Session A's. Nothing here recomputes a disposition, maintains a rival
denominator, changes runtime, or issues an approval.

## Inputs, pinned

| Input | Source | sha256 |
|---|---|---|
| `sessionAPathwayFamilyGraph` | session_a_commit @ `4072b618` | `78b7c7142cb6d655…` |
| `packetFamilyBridge` | session_a_commit @ `4072b618` | `527fd4baa11dee8e…` |
| `trackSourceRelationships` | session_a_commit @ `4072b618` | `8376337488a0e07e…` |
| `extAdopt01` | session_a_commit @ `4072b618` | `7bea6b4c78cde50a…` |
| `publicWitnessAnswerSets` | working_tree | `c6e1566d491b4fde…` |
| `problematicPdfRegister` | working_tree | `c00596c6cecfbccb…` |
| `completedOutputPacketProofs` | session_a_commit | 57 file(s) |

## 1 — The packet-family bridge, imported and reconciled

Session A's join reads `data/rcap-codex/d-track-terminalization/track-family-map.json`, which is
lane-D scoped and marked `proposed_noncanonical_analysis`. The repository also carries
`data/record-clearing/legal-design-packet-set-manifests.json`, a packet set for **all 497**
registry tracks with every component's role, requirement, output strategy and official form id.

| Session A disposition | Pathways | After importing the bridge |
|---|---|---|
| `family_bridge_missing_no_family` | 165 | **165** now carry an exact packet set |
| `covered_design_but_output_review_pending` | 76 | unchanged |
| `family_bridge_missing_no_track` | 41 | unchanged |
| `legal_action_required` | 2 | unchanged |

**165** pathways move from "no track-to-family bridge" to a named packet set.
This changes the **reason**, never the coverage answer. A bridged pathway is one whose
family can now be named — not one an adoption has been shown to cover.

## 2 — Registry-gap classification

| Classification | Pathways |
|---|---|
| `exact_track_and_packet_set` | 243 |
| `registry_gap_no_track` | 41 |

Nothing is left as "unknown": every pathway is an exact track-and-packet-set, or an
explicitly named registry gap.

## 3 — EXT-ADOPT-01 and completed-output evidence

- Adoption `EXT-ADOPT-01-standing-external-counsel-adoption`, adopted **2026-08-08**, scope `packet_family`, sha256 `7bea6b4c78cde50a…`
- Bound families: **57** across **45** jurisdictions
- Completed-output packet proofs read: **57**
- Pathways carrying completed-output evidence by exact track id: **76**

Each record carries the assembled artifact filename, sha256, page count, the verifier that
passed it, whether its family is adopted, and whether that family carries a superseded
technical result.

## 4 — Deterministic public witness

Answer sets live in `data/rcap-ledger/public-witness-answer-sets.json` — no randomness,
re-running reproduces the file byte for byte, and `--check` proves it.

- Settled on a terminal evaluation: **271** of 284
- Landed on their own pathway: **132**
- Payment allowed at the evaluator: **17**

## 5 — Genuine new counsel exceptions

**25** of 284.

| Reason | Pathways |
|---|---|
| `no_bound_family_in_this_jurisdiction` | 23 |
| `session_a_recorded_legal_action_required` | 2 |

The other **259** are not exceptions. Their jurisdiction carries a bound family in
EXT-ADOPT-01, so an existing counsel record exists; whether it reaches the pathway is a
determination for counsel and Session A. Calling those exceptions would manufacture counsel
work that may already be covered, so this packet does not.

Jurisdictions with no bound family at all: `AL`, `AZ`, `IA`, `ID`, `OR`, `WY`.

Regenerate with `npm run rcap:generate-session-a-packet`; verify with `npm run rcap:verify-session-a-packet`.
