# DREL-KY-IDENTITY-SCOPE

Owner: Kentucky source-identity/acquisition owner and D1B implementation owner

Objective: Resolve RU-009 identity through ordinary source work; separately obtain Roger's protective-order scope decision before acquiring AOC-275.18.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `ky_expungement_certification` — no_exact_family_relationship_yet
- `ky_protective_order_record_expungement` — no_exact_family_relationship_yet

## Component actions

### ky_expungement_certification

- `ky_expungement_certification-primary-filing-1`: `identity_ambiguous`.
  Missing evidence: A face/digest comparison proving whether participant request form AOC-RU-009 is related to D family AOC-009. The latter is recorded as an ORDER titled RECORDS UNIT with unknown revision, which is insufficient to equate the identities.
  Next action: Retrieve current RU-009 from Kentucky Courts, inspect role/form number/revision, hash it, and either build a new participant-request family or publish an exact identity receipt before adding an edge.
  Terminal alternative: none supported; remain fail-closed.

### ky_protective_order_record_expungement

- `ky_protective_order_record_expungement-primary-filing-1`: `source_binary_missing`.
  Missing evidence: A Roger product-scope decision plus, if retained, the current official AOC-275.18 binary with revision/digest and a D family. No current retained source exists.
  Next action: Roger first decides whether civil protective-order records remain in RCAP scope. If retained, source acquisition retrieves/hashes AOC-275.18 and D1B builds/reviews/links it; if excluded, the owner records an explicit deliberate-scope decision rather than inferring one here.
  Terminal alternative: none supported; remain fail-closed.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.

Human boundary: Roger decides only the protective-order scope question; ordinary source work remains with the source owner.
