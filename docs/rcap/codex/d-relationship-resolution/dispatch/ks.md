# DREL-KS-FORM-SET

Owner: Kansas source identity/currentness/materialization owner, with captain edge import

Objective: Correct three cross-applied relationship SHA pins and import their exact diversion edges; resolve cover-sheet identity, materialize the retained diversion petition and denial order, acquire the absent arrest-order cover sheet, and verify arrest-petition currentness.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `ks-21-6614-diversion` — partial_exact_relationships_remaining_component_actions
- `ks-22-2410-arrest` — no_exact_family_relationship_yet

## Component actions

### ks-21-6614-diversion

- `ks-21-6614-diversion-cover-sheet-1`: `identity_ambiguous`.
  Missing evidence: A reconciled form identity/revision. The pinned ID asserts 10/14/2025, the retained file is named Criminal Cover Sheet 102025.pdf with sha256 6384f934..., and three issuer pages identify the published form as 12-2014; no committed evidence joins those claims.
  Next action: Resolve the 2025-versus-2014 revision conflict through an attended issuer retrieval or written Council confirmation, record the authorized-use position, and then build one exact cover-sheet family reusable on both tracks only if the digest/revision matches.
  Terminal alternative: none supported; remain fail-closed.
- `ks-21-6614-diversion-primary-filing-2`: `metadata_relationship_missing`.
  Missing evidence: A D family/source receipt and edge for the retained Kansas Judicial Council Petition for Expungement of Conviction or Diversion 82022.pdf, sha256 1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c. The binary is present; it is not a source-acquisition gap.
  Next action: Materialize the retained 08-2022 petition from its compiled-profile digest, create/review the D family, and bind this primary-filing component; separately preserve the Council authorized-use gate.
  Terminal alternative: none supported; remain fail-closed.
- `ks-21-6614-diversion-notice-3`: `exact_supporting_component`.
  Proposed family: `KS:ks-notice-of-hearing-on-petition-for-expungem-source-gated-en`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
  Import prerequisite: Correct this component pin from petition sha256 1113f7b6... to notice sha256 a960c857... in the captain-owned relationship table before importing the family edge.
- `ks-21-6614-diversion-cover-sheet-4`: `exact_supporting_component`.
  Proposed family: `KS:ks-order-of-expungement-of-conviction-or-dive-source-gated-en`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
  Import prerequisite: Correct this component pin from petition sha256 1113f7b6... to cover-sheet sha256 d4171396... in the captain-owned relationship table before importing the family edge.
- `ks-21-6614-diversion-proposed-order-5`: `exact_proposed_order_component`.
  Proposed family: `KS:ksjc-source-gated-en`. Captain imports the edge without clearing `source_or_currentness_gate_open` or any other gate.
  Import prerequisite: Correct this component pin from petition sha256 1113f7b6... to proposed-order sha256 104c4018... in the captain-owned relationship table before importing the family edge.
- `ks-21-6614-diversion-proposed-order-6`: `metadata_relationship_missing`.
  Missing evidence: A D family/source record and edge for retained Order Denying Expungement of Conviction or Diversion 122016.pdf, sha256 b29254fb58433d496041c185fc69ec864ba1beff1e5e9722738c3b1ebedfe2ba.
  Next action: Materialize the retained exact order-denying source into the D family corpus, preserve court-only findings/signature ownership, render/review, and add the proposed-order edge.
  Terminal alternative: none supported; remain fail-closed.

### ks-22-2410-arrest

- `ks-22-2410-arrest-cover-sheet-1`: `identity_ambiguous`.
  Missing evidence: A reconciled form identity/revision. The pinned ID asserts 10/14/2025, the retained file is named Criminal Cover Sheet 102025.pdf with sha256 6384f934..., and three issuer pages identify the published form as 12-2014; no committed evidence joins those claims.
  Next action: Resolve the 2025-versus-2014 revision conflict through an attended issuer retrieval or written Council confirmation, record the authorized-use position, and then build one exact cover-sheet family reusable on both tracks only if the digest/revision matches.
  Terminal alternative: none supported; remain fail-closed.
- `ks-22-2410-arrest-primary-filing-2`: `currentness_unverified`.
  Missing evidence: Issuer confirmation that the February 2013 arrest-record petition remains current after the 2025 K.S.A. 22-2410 amendments, or a newer issuer revision with digest and legal-effect comparison.
  Next action: Use an authorized attended Council retrieval or written issuer response to identify the current arrest petition; compare the mandatory-expungement and fee language changed in 2025, then retain/build/link only the current revision.
  Terminal alternative: none supported; remain fail-closed.
- `ks-22-2410-arrest-cover-sheet-3`: `source_binary_missing`.
  Missing evidence: The exact Kansas Judicial Council Order of Expungement of Arrest Record Cover Sheet, revision 12-2016, has no retained binary/digest or D family.
  Next action: Perform an authorized attended retrieval, capture revision/digest and permitted-use evidence, materialize the exact cover sheet, then build/review/link it.
  Terminal alternative: none supported; remain fail-closed.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.

Human boundary: Authorized-use permission is an issuer/counsel gate; no relationship is inferred from it.
