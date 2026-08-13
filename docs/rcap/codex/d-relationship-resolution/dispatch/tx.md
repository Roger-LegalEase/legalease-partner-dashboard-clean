# DREL-TX-COMPONENT-COMPLETION

Owner: D3A relationship-metadata and Texas source-materialization owners

Objective: Import seven exact OCA edges and acquire only two unique missing assets: the 411.0736 order and shared bilingual fee-waiver statement.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `tx_nd_dwi_conviction` — partial_exact_relationships_remaining_component_actions
- `tx_nd_dwi_deferred` — partial_exact_relationships_remaining_component_actions
- `tx_nd_probation_misdemeanor` — partial_exact_relationships_remaining_component_actions
- `tx_nd_veterans_court` — partial_exact_relationships_remaining_component_actions

## Component actions

### tx_nd_dwi_conviction

- `tx_nd_dwi_conviction-petition-1`: `exact_required_component`.
  Proposed family: `TX:tx-gc-411-0736-form-petition-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_dwi_conviction-proposed-order-2`: `source_binary_missing`.
  Missing evidence: The exact OCA Model Order of Nondisclosure under section 411.0736 from the pinned official URL, with retained digest/source record and D family.
  Next action: Acquire/hash the exact 411.0736 order, build it as a court-order family with protected findings/signature fields, render/review, and add the edge.
  Terminal alternative: none supported; remain fail-closed.
- `tx_nd_dwi_conviction-fee-waiver-statement-4`: `source_binary_missing`.
  Missing evidence: One retained source/family for the Supreme Court of Texas bilingual Statement of Inability to Afford Payment of Court Costs or an Appeal Bond at the shared pinned URL. The four-track reuse is supported by each track's legal-design component.
  Next action: Acquire and hash the shared bilingual statewide statement once, build/review one conditional supporting family, and add four explicit track edges; never substitute CR-63.
  Terminal alternative: none supported; remain fail-closed.

### tx_nd_dwi_deferred

- `tx_nd_dwi_deferred-petition-1`: `exact_required_component`.
  Proposed family: `TX:tx-gc-411-0726-form-petition-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_dwi_deferred-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `TX:tx-gc-411-0726-dwi-order-form-order-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_dwi_deferred-fee-waiver-statement-4`: `source_binary_missing`.
  Missing evidence: One retained source/family for the Supreme Court of Texas bilingual Statement of Inability to Afford Payment of Court Costs or an Appeal Bond at the shared pinned URL. The four-track reuse is supported by each track's legal-design component.
  Next action: Acquire and hash the shared bilingual statewide statement once, build/review one conditional supporting family, and add four explicit track edges; never substitute CR-63.
  Terminal alternative: none supported; remain fail-closed.

### tx_nd_probation_misdemeanor

- `tx_nd_probation_misdemeanor-petition-1`: `exact_required_component`.
  Proposed family: `TX:tx-gc-411-073-411-0732-form-petition-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_probation_misdemeanor-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `TX:tx-gc-411-0725-411-073-411-0735-form-order-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_probation_misdemeanor-fee-waiver-statement-4`: `source_binary_missing`.
  Missing evidence: One retained source/family for the Supreme Court of Texas bilingual Statement of Inability to Afford Payment of Court Costs or an Appeal Bond at the shared pinned URL. The four-track reuse is supported by each track's legal-design component.
  Next action: Acquire and hash the shared bilingual statewide statement once, build/review one conditional supporting family, and add four explicit track edges; never substitute CR-63.
  Terminal alternative: none supported; remain fail-closed.

### tx_nd_veterans_court

- `tx_nd_veterans_court-petition-1`: `exact_required_component`.
  Proposed family: `TX:tx-gc-411-0727-form-petition-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_veterans_court-proposed-order-2`: `exact_proposed_order_component`.
  Proposed family: `TX:tx-gc-411-0727-form-order-en`. Captain imports the edge without clearing `candidate_current_source` or any other gate.
- `tx_nd_veterans_court-fee-waiver-statement-4`: `source_binary_missing`.
  Missing evidence: One retained source/family for the Supreme Court of Texas bilingual Statement of Inability to Afford Payment of Court Costs or an Appeal Bond at the shared pinned URL. The four-track reuse is supported by each track's legal-design component.
  Next action: Acquire and hash the shared bilingual statewide statement once, build/review one conditional supporting family, and add four explicit track edges; never substitute CR-63.
  Terminal alternative: none supported; remain fail-closed.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.
