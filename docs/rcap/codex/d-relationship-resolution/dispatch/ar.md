# DREL-AR-EDGE-MATERIALIZATION

Owner: D1A source-materialization and captain relationship-metadata owner

Objective: Import seven exact proposed edges and materialize the one remaining exact live misdemeanor petition.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `ar-act531` — all_component_relationships_exact_but_nonrelationship_gates_remain
- `ar-cs-possession-seal` — all_component_relationships_exact_but_nonrelationship_gates_remain
- `ar-misdemeanor-seal` — partial_exact_relationships_remaining_component_actions
- `ar-nonconviction-seal` — all_component_relationships_exact_but_nonrelationship_gates_remain

## Component actions

### ar-act531

- `ar-act531-primary-filing-1`: `exact_required_component`.
  Proposed family: `AR:ar-acic-petition-to-seal-under-community-punishment-act-531-and-ac-source-gated-`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
- `ar-act531-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `AR:ar-acic-order-to-seal-under-community-punishment-act-531-and-act-1-source-gated-`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.

### ar-cs-possession-seal

- `ar-cs-possession-seal-primary-filing-1`: `exact_required_component`.
  Proposed family: `AR:ar-acic-petition-to-seal-controlled-or-counterfeit-substance-posse-source-gated-`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
- `ar-cs-possession-seal-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `AR:ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.

### ar-misdemeanor-seal

- `ar-misdemeanor-seal-primary-filing-1`: `metadata_relationship_missing`.
  Missing evidence: A D family/source record and canonical edge for the already identified live ACIC misdemeanor petition, printed revision 2023-10-25, sha256 63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23.
  Next action: Materialize the byte-identical official ACIC petition as a D1A family, render/review it, and bind ACIC-UNIFORM-PETITION-TO-SEAL to that family using the committed identity receipt.
  Terminal alternative: none supported; remain fail-closed.
- `ar-misdemeanor-seal-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `AR:ar-acic-order-to-seal-misdemeanors-under-act-1460-source-gated-en`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.

### ar-nonconviction-seal

- `ar-nonconviction-seal-primary-filing-1`: `exact_required_component`.
  Proposed family: `AR:ar-acic-petition-to-seal-nolle-prosequi-dismissal-acquittal-or-no-source-gated-e`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
- `ar-nonconviction-seal-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `AR:ar-acic-order-to-seal-nolle-prosequi-dismissal-acquittal-or-no-cha-source-gated-`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.
