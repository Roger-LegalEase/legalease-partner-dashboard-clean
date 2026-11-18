An existing workspace with an active partner administrator and recorded `not_required` agreements could not become LegalEase-managed, even without executed documents or signature receipts. The external-rights evaluator incorrectly treated administrative access and metadata as independent authority.

This correction permits an authorized Platform Admin to select LegalEase-managed, Not Required and Screening Only in Program Setup and save once. The same atomic save records the responsibility decision and preserves memberships, agreement history, approvals and financial records. Genuine agreement evidence, affirmative partner operating approvals and commercial authority still refuse conversion, with a specific explanation. No agreement, procurement, funding or diagnostics workflow is added.

Validation:
- Reproduced the released 403 through the authenticated browser using the exact existing-workspace state.
- All eight isolated authenticated functional checks passed: save, refresh, audit/idempotency, genuine signed-rights refusal, current materials and preview, and one-confirmation protected launch through `prepared → publication_staged → public_verified → complete`. No partner review or packet funding was created.
- Actual PostgreSQL transactions verified genuine-rights refusals, authorization, preservation, and DC/MD/VA screening claims with out-of-scope and unfunded-packet denial; transactions rolled back.
- Disposable migration rehearsal preserved existing function ACL/security settings; the new evaluator is service-only.
- Added the credential-free baseline/correction regression to the existing real-launch CI gate. All 37 onboarding verifiers, focused lint, typecheck and launch readiness passed. Both clean-checkout CI checks passed on `e8ef8cdeff68d0b98c009f761abd860d5c7ffe51`, including full repository lint, typecheck, the expanded SQL regression gate, launch readiness, the credential-free Production build and worker-image acceptance.

Acceptance: `docs/rcap/onboarding/OPERATING_RESPONSIBILITY_CORRECTION_20261010.md` and its structured JSON companion.

Release boundary: one additive migration, `20261010074948_rcap_operating_responsibility_rights.sql` (SHA256 `6b293060e3bcf65e9b1264c6c150f25583192c4c5b902fdf44a89eb5e49d1c03`), with no workspace data migration. Production is unchanged. Any authorized release must use the exact merged SHA, stage without aliases, verify identity/health/routes, and assign only the two RCAP domains. Preserve the current PR #262 deployment `dpl_EHNd9i5VwDtKMN6AZMPMBjznB7No` as rollback and leave other brand domains unchanged. Production owner acceptance remains pending that release.
