# Operating responsibility correction acceptance

Base release: `9cf86117b80966827b8bce71e446627c700e8830` (PR #262).

The released external-rights evaluator treated active partner-administrator access and
`recorded_by` on a `not_required` agreement as independent operating authority. The
authenticated Program Setup reproduction returned 403 and preserved the blocked
partner-managed workspace. Neither agreement contained a finalized document or
signature receipt.

The correction removes those proxies. Existing finalized/executed/approved agreement
records, document/signature references, affirmative partner operating approvals and
commercial authority still refuse conversion. Historical affirmative authority is
preserved conservatively; this change does not adjudicate or extinguish contractual
rights. Pending agreement administration alone does not establish executed rights.

Selecting LegalEase-managed and saving on Program Setup is the explicit Platform Admin
operation. The same atomic configuration event now records the actor, timestamp,
responsibility basis, old/new operator and external-rights evaluation. Existing role,
tenant, revision, idempotency and live-scope protections remain. No memberships,
agreement history, approvals, financial data or entitlements are rewritten by the
conversion. No additional button, agreement form or funding operation is required.

## Verified behavior

Eight authenticated functional checks passed in the existing isolated Next application,
GoTrue, PostgREST and PostgreSQL infrastructure, with no browser errors:

- An existing partner-managed workspace has an active partner administrator and two
  recorded Not Required agreements, without executed documents or signature receipts.
- One normal save persists LegalEase-managed, Not Required and Screening Only. A
  refresh preserves those values, memberships, agreement/approval history and money.
- The responsibility decision is audited once; the identical request replays safely.
- An existing fixture with a verified signature receipt and external authority is
  refused through authenticated Program Setup. Its reason is displayed and records
  remain unchanged.
- The converted program generates the two current materials and shows the real preview.
  Agreement/procurement and partner-review requirements do not block this operation.
- One Platform Admin confirmation completes the actual protected publication sequence:
  `prepared → publication_staged → public_verified → complete`. The published program
  covers DC/MD/VA, creates no partner launch approval and authorizes no sponsored packets.

`scripts/sql/rcap-operating-rights-regression.sql` also passed against a dedicated
isolated fixture, with every transaction rolled back. It tests nonexecuted metadata,
finalized/executed/approved agreement refusal, document and signature evidence,
affirmative partner authority, existing commercial rights, unauthorized actors,
atomic preservation and the audit decision.

`scripts/test-rcap-operating-rights.mjs` runs inside the existing credential-free
real-launch database gate. It reproduces the released failure, applies the actual
correction, and verifies conversion, genuine-rights refusal, same-tenant partner and
cross-tenant denial, preserved rows, idempotency and service-only execution.

The disposable PostgreSQL migration rehearsal preserved both replaced functions'
ACLs and security/search-path settings. The new evidence helper denies anonymous and
authenticated execution. The existing onboarding verifiers, focused lint, typecheck
and launch-readiness checks passed. The initial copy-check failure was corrected;
the check was not relaxed. Clean-checkout CI supplies the final repository lint and
credential-free Production build.

Structured results: [OPERATING_RESPONSIBILITY_CORRECTION_20261010.json](OPERATING_RESPONSIBILITY_CORRECTION_20261010.json).
Local raw evidence is retained under `artifacts/rcap-operating-rights-correction/`.
Credentials and browser sessions are not committed. Isolated fixture corrections
and a locally misconfigured release-authorization refusal remain in those diagnostics;
neither was treated as a passing launch. The accepted run used the protected release
binding and produced its receipts through the application.

## Release boundary

This PR contains one new migration:
`20261010074948_rcap_operating_responsibility_rights.sql`, SHA256
`6b293060e3bcf65e9b1264c6c150f25583192c4c5b902fdf44a89eb5e49d1c03`.
It replaces function definitions and adds one service-only evaluator; it performs no
workspace data migration. The previously released migration remains unchanged.

Production has not been modified for this correction. Any authorized release must
use the exact merged commit, apply only this reviewed migration, stage without alias
assignment, and verify identity, health and routes before assigning only
`legaleasepartner.com` and `www.legaleasepartner.com`. Preserve the currently verified
PR #262 deployment `dpl_EHNd9i5VwDtKMN6AZMPMBjznB7No` as the rollback target, verify its
readiness at release time, and leave all other brand mappings unchanged. A rollback
must preserve legitimate saved decisions; do not rewrite operating models or erase
audit history. Authenticated Production owner acceptance remains a release-stage task.
