# DREL-UT-ROUTE-FORM-SET

Owner: Utah legal-design route owner and D3B source-materialization owner

Objective: Set the judge/commissioner and notice predicates, then acquire/build the resulting exact form branches.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `ut_pet_remove_link` — no_exact_family_relationship_yet

## Component actions

### ut_pet_remove_link

- `ut_pet_remove_link-motion-1`: `identity_ambiguous`.
  Missing evidence: A deterministic route predicate identifying when a Utah district/case category uses judge form 1501CR versus commissioner form 1501CR-C, followed by current digest evidence for both selected variants.
  Next action: The Utah route/legal-design owner records the commissioner-selection rule; source acquisition then retrieves/hashes the current 1501CR variants and D3B builds only the exact conditional edges.
  Terminal alternative: none supported; remain fail-closed.
- `ut_pet_remove_link-motion-commissioner-track-2`: `identity_ambiguous`.
  Missing evidence: A deterministic route predicate identifying when a Utah district/case category uses judge form 1501CR versus commissioner form 1501CR-C, followed by current digest evidence for both selected variants.
  Next action: The Utah route/legal-design owner records the commissioner-selection rule; source acquisition then retrieves/hashes the current 1501CR variants and D3B builds only the exact conditional edges.
  Terminal alternative: none supported; remain fail-closed.
- `ut_pet_remove_link-proposed-order-3`: `source_binary_missing`.
  Missing evidence: The current official 1502CR Order on Motion to Remove Link binary, revision and digest; no D3B family or retained compiled-profile source exists.
  Next action: Retrieve/hash current 1502CR from Utah Courts, materialize it, build a court-owned order family, render/review, and add the proposed-order edge.
  Terminal alternative: none supported; remain fail-closed.
- `ut_pet_remove_link-notice-to-submit-or-notice-of-hearing-4`: `identity_ambiguous`.
  Missing evidence: A condition selecting one exact document identity, 1110GE Notice to Submit or 1111GE Notice of Hearing. The compound '1110GE or 1111GE' value is not a form identity.
  Next action: Record the post-motion event predicate and exact form ID for each branch, then retrieve/hash/build the required branch documents and add conditional edges.
  Terminal alternative: none supported; remain fail-closed.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.
