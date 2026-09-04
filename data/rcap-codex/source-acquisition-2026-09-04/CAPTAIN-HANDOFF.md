# Captain handoff — drive all 28 source families to terminal production readiness

**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Branch:** `claude/source-acquisition-28-20260904`  
**PR:** `#223`  
**Owner authorization:** `OWNER-PRODUCTION-AUTHORIZATION-2026-09-04.md`

## Current controlling posture

All source obligations in the owner-assigned 28-family batch are resolved for authoritative integration.

- 27 families have every required downloadable source verified.
- `de_mandatory_expungement-set` is correctly a no-public-binary SBI process-guidance/source-identity route.
- Missouri `CR301` is verified, hash-matched, and available to the LegalEase team.
- No family remains blocked on source acquisition.
- The primary archive, corrected supplement archive, and CR301 are readable by the `legalease.com` Google Workspace domain.
- The captain is authorized to extract and commit the blank official source forms needed by runtime, using the repository's established source paths or Git LFS.
- No additional owner approval is required.

The earlier owner-only, no-binary-in-Git, whole-batch stop, and separate promotion-approval rules are superseded. Earlier receipts remain historical evidence, not current execution limits.

## Access

Drive files:

- primary archive: `1xWvjkwl3ev-vx8b56PubDwJyHqulV9Nu`
- corrected supplement: `1iLYGgg-vZUMGB5F5iR94e1EAVeibmOOt`
- Missouri CR301: `1kcIjR2gMH-jj-rMHJe9zqS37vi6957xL`

Each file is shared read-only with the `legalease.com` domain and is not discoverable in domain search.

Codespace access to the immutable workflow artifacts:

```bash
gh run download 33866926858 \
  -n rcap-targeted-source-acquisition-28-33866926858 \
  -D /tmp/rcap-source-primary

gh run download 33868246348 \
  -n rcap-targeted-source-supplement-28-33868246348 \
  -D /tmp/rcap-source-supplement
```

## Read first

1. `data/rcap-codex/source-acquisition-2026-09-04/OWNER-PRODUCTION-AUTHORIZATION-2026-09-04.md`
2. `data/rcap-codex/source-acquisition-2026-09-04/results/owner-production-authorization.json`
3. `data/rcap-codex/source-acquisition-2026-09-04/results/final-source-resolution.json`
4. `data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json`
5. `data/rcap-codex/source-acquisition-2026-09-04/results/corrections/DE-FORM-281-date-provenance.json`
6. `data/rcap-codex/source-acquisition-2026-09-04/results/corrections/MO-CR301-owner-supplied-source-completion.json`
7. primary and supplement source ledgers and per-source receipts under `results/`

## Source facts to adopt

### Missouri

- `FI-05` is one shared source for six families.
- `CR301` is `Petition for Expungement – Mistaken Identity`, `OSCA (07-17)`, one-page AcroForm, 952,015 bytes, SHA-256 `5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8`.
- The OSCA endpoint's HTTP 403 is provenance, not a release hold.

### Delaware

- `281E` is a continuation/charge-extension sheet to Form 281, not a standalone filing.
- Form 281 has three separate date fields: catalog revision `2025-11-26`, printed revision `Rev 11/25`, and issuer filename date `2025-11-19`.
- Mandatory expungement is an SBI contact and eligibility-letter process, not a downloadable court form.

### Massachusetts

- `ma-seal-admin-set` and `ma-seal-decrim-set` share one `PETITION TO SEAL` parent PDF.
- Part A, box 4 is a route election inside that PDF.

### Colorado

- `JDF 683` is the petition.
- `JDF 684` is the denial order.
- `JDF 686` is the granting/sealing order.

### California

- `SDSC CRM-307` is San Diego County-local and must stay local.

### Georgia

- The GBI/GCIC request is expressly for arrests before July 1, 2013.

### Maine

- The supplied hash `c72e74f191a1bddb48453e3094e8a657baabf552299f353acd8bf0d8a418fed1` belongs to `CR-307`.
- `CR-308` is a separate current order with SHA-256 `b2e78f24cb33d52c692d20b5bff3f0ab58115da9f26363df99cf2970f0a645f5`.

### West Virginia

- `SCA-C906` SHA-256: `43b5606c9faf6fcf4d6f73c1d97cf1bd87798158dee1b6f3381c8a0472b4b64c`.
- `SCA-C907` SHA-256: `2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222`.
- The queue had the expected hashes cross-assigned.

### Montana

Preserve five distinct state-issued documents: Form A, Form B, Proposed Order, Certificate of Service, and the DOJ/CRISS request. Do not retain a colliding document ID for the Proposed Order and Certificate of Service.

### North Dakota and Texas

- `SFN 14859` is the regular North Dakota pardon application.
- Texas uses three distinct components: § 411.0736 petition, § 411.0736 order, and the inability-to-afford statement.

## Production mission

Do not stop at source-record integration. Carry each family through the actual product path.

For every family:

1. Put the verified blank source binary where the repository's runtime or packet builder expects it.
2. Correct the authoritative source identity, revision, hash, scope, component relationship, and shared-family binding.
3. Resolve the route-to-family and component-to-document mapping.
4. Build or repair the field map, overlay, renderer, packet composition, filing instructions, and conditional components.
5. Preserve official forms where official forms exist; do not replace them with generated lookalikes.
6. Implement the correct terminal treatment for non-form routes, including Delaware SBI process guidance.
7. Generate a representative participant packet or guidance output.
8. Raster or visually inspect every produced page.
9. Run targeted source, binding, field-map, renderer, packet, legal-design, security, terminalization, and launch-readiness verifiers.
10. Fix failures in the lane. Do not create another queue item for ordinary engineering work.
11. Update the authoritative sources of truth, regenerate derived artifacts, commit bounded changes, push, and update PR #223.

## What no longer blocks work

Do not stop because:

- a file was previously owner-only;
- a blank official form would need to enter Git or Git LFS;
- an acquisition-time receipt shows an earlier HTTP failure;
- the Drive folder itself is not shared while each required file is shared;
- a resolvable catalog, printed, filename, or metadata date differs;
- another family in the batch has a separate issue;
- a generator output needs to be rebuilt after its source of truth changes;
- the work crosses acquisition, mapping, field-map, renderer, packet, or verification lanes.

## Real stop conditions

Stop only for a genuine issue that cannot be safely resolved in the lane:

- conflicting controlling primary legal authority requiring counsel;
- a source whose actual printed identity cannot be reconciled to the intended route;
- an actual license or court restriction that bars the proposed use;
- participant PII, credentials, secrets, or private case records would be exposed;
- a county-local source would be used statewide;
- a production test or security control fails and cannot be repaired without a broader decision.

## Required return

```text
CAPTAIN PRODUCTION INTEGRATION RESULT

BRANCH:
STARTING SHA:
FINAL SHA(S):
PR:

FAMILIES TERMINAL:
FAMILIES PRODUCTION READY:
FAMILIES WITH REAL REMAINING HOLDS:

SOURCE BINARIES INTEGRATED:
AUTHORITATIVE SOURCE RECORDS UPDATED:
ROUTE/FAMILY BINDINGS UPDATED:
FIELD MAPS OR OVERLAYS BUILT:
RENDERERS OR PACKET BUILDERS BUILT:
GUIDANCE ROUTES IMPLEMENTED:
REPRESENTATIVE OUTPUTS GENERATED:
RASTER/VISUAL REVIEWS PASSED:

GENERATORS RUN:
TARGETED VERIFIERS RUN:
RESULTS:
COMMITS PUSHED:
PR #223 UPDATED: YES / NO

REAL REMAINING HOLDS ONLY:
```
