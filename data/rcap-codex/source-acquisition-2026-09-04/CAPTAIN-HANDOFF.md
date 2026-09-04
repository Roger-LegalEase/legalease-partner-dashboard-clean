# Captain handoff — 28-family source acquisition

**Batch:** `source-acquisition-28-families-2026-09-04`  
**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Controlling branch:** `claude/source-acquisition-28-20260904`  
**Ledger-promotion commit:** `0e7adc7ea7da43ddae8a585cdbae6c083c0b9fd9`  
**Ledger-promotion run:** `33870717231` — success  
**Primary acquisition run:** `33866926858` — success  
**Corrected supplement run:** `33868246348` — success  
**Superseded supplement run:** `33867794063` — failed; do not use as controlling evidence

## Executive disposition

The owner assigned exactly 28 acquisition/currentness families. The primary run emitted one receipt for each of 34 distinct source records, acquired 28 of them, and fully supplied 24 families. The corrected supplement then acquired the four direct sources missed by the primary run: San Diego `SDSC CRM-307`, Colorado `JDF 686` for identity reconciliation, and the Texas § 411.0736 model petition and model order.

Combined, fail-closed accounting is:

| Result | Count |
| --- | ---: |
| Owner-assigned families | 28 |
| Families with every required downloadable source acquired | 26 |
| Family resolved to no-public-binary agency process | 1 — `de_mandatory_expungement-set` |
| Family still blocked on issuer-host acquisition | 1 — `mo-610-145-mistaken-identity-set` |
| Required distinct downloadable sources acquired | 31/33 |
| Distinct source records acquired, including reconciliation-only `JDF 686` | 32/34 |

Do not convert the last two rows into a blanket “28/28 acquired” statement. Delaware is a source-identity/process-guidance disposition, not a PDF. Missouri `CR301` remains a real missing original binary.

## Repository-visible evidence

Read these before changing any source record or family status:

1. `data/rcap-codex/source-acquisition-2026-09-04/results/README.md`
2. `data/rcap-codex/source-acquisition-2026-09-04/results/artifact-custody.json`
3. `data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/acquisition-summary.json`
4. `data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/source-ledger.yaml`
5. `data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/family-source-bindings.csv`
6. `data/rcap-codex/source-acquisition-2026-09-04/results/primary-ledger/sources/*/receipt.json`
7. `data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/acquisition-summary.json`
8. `data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/supplement-disposition-summary.json`
9. `data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/sources/*/receipt.json`
10. `data/rcap-codex/source-acquisition-2026-09-04/local-attempt/acquisition.log`

The local-attempt log is failure evidence only. It records DNS failures and unavailable browser tooling. It is not an acquisition receipt and must never be interpreted as proof that Missouri `FI-05` or `CR301` was downloaded locally.

## Original-byte custody

This repository is public. The owner assignment required the issuer-original PDFs and DOCX files to remain in owner-only custody. For that reason, Git contains manifests, receipts, extracted text, hashes, bindings, dispositions, and artifact identifiers, but deliberately excludes the original binaries.

Download the authenticated artifacts before **October 4, 2026**, verify them, and move validated originals into durable owner-only source custody:

```bash
gh run download 33866926858 \
  -n rcap-targeted-source-acquisition-28-33866926858 \
  -D /tmp/rcap-source-primary

gh run download 33868246348 \
  -n rcap-targeted-source-supplement-28-33868246348 \
  -D /tmp/rcap-source-supplement
```

Artifact controls:

| Artifact | ID | Size | Artifact digest | Expires |
| --- | ---: | ---: | --- | --- |
| `rcap-targeted-source-acquisition-28-33866926858` | `9934370357` | 16,154,170 bytes | `sha256:7e30f1b2e49c6fa47714b24c18d88cd764e554fe22a6072bd6faf429fef0f813` | 2026-10-04 11:15:29Z |
| `rcap-targeted-source-ledger-28-33866926858` | `9934370956` | 268,484 bytes | `sha256:a895e8d198a8375dd3046b3cb6c9b4b7783d0bff4b108bcce078a8b71a8f7b17` | 2026-10-04 11:15:30Z |
| `rcap-targeted-source-supplement-28-33868246348` | `9934849936` | 794,519 bytes | `sha256:2390f30919ab7eecda2c384023900f9f45cd983e86fb2b7a468510b354e38b90` | 2026-10-04 11:31:30Z |

Do not add those original binaries to the public Git tree without a separate owner decision.

## Controlling source-identity findings

### Missouri

- `FI-05` was acquired once and binds to six families. The bytes are 298,649 bytes with SHA-256 `53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e`, matching the historical repository hash.
- The acquired `FI-05` bytes came through the St. Louis County Courts form endpoint. Preserve that provenance. If the release gate requires OSCA-origin transport rather than byte identity plus an official court mirror, keep a provenance/currentness review open.
- `CR301` remains `issuer_binary_blocked_http_403`. The official OSCA binary is file ID `116396`. The inventory records historical SHA-256 `5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8` and 952,015 bytes, but no fresh original binary was retained.
- The exact stop is a normal interactive-browser download of OSCA file `116396`. Do not substitute `CR310`, `CR311`, or any other Missouri form.

### Delaware

- `FORM-281E` is a continuation/charge-extension sheet attached to Form 281, not a standalone initiating filing. Its text expressly says the listed charges continue the petition to which the sheet is attached.
- `DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION` is a repository description, not a verified issuer-assigned public form identity. Current official materials expose no downloadable mandatory-expungement application. Treat the family as `SOURCE_IDENTITY / PROCESS_GUIDANCE`: contact SBI; if eligible, SBI supplies an eligibility letter and further instructions.
- Do not substitute a Superior Court or Family Court expungement form for the SBI process.

### Massachusetts

- `ma-seal-admin-set` and `ma-seal-decrim-set` share one current `PETITION TO SEAL` parent PDF.
- Part A, box 4 is printed in that parent form and is the election for an offense that is no longer a crime. It is not a separate PDF or a second source family.

### Colorado

- `JDF 683` is the participant petition.
- `JDF 684` is **Order Denying Petition to Seal Criminal Conviction Municipal Records**. It is not the granting/proposed sealing order.
- `JDF 686` is **Order to Seal Municipal Conviction Records**, revision `R: February 8, 2023`, and is the granting/sealing-order component.
- Correct any repository mapping that pairs JDF 683 with JDF 684 as the proposed grant order. Preserve JDF 684 only as the denial-order component.

### California

- `SDSC CRM-307` was acquired by browser download in the corrected supplement.
- Its scope is San Diego County Superior Court only. Never promote it to a statewide California form.

### Georgia

- The acquired GBI/GCIC source is the combined instructions and request form expressly limited to arrests **prior to July 1, 2013**.
- Do not substitute or generalize the post-July 1, 2013 prosecutor-controlled process.

### Maine hash reconciliation

- The supplied family-level expected hash `c72e74f191a1bddb48453e3094e8a657baabf552299f353acd8bf0d8a418fed1` matches current `CR-307`.
- Current `CR-308` is a distinct, identity-verified order with SHA-256 `b2e78f24cb33d52c692d20b5bff3f0ab58115da9f26363df99cf2970f0a645f5`.
- Do not reject `CR-308` merely because the one family-level expected hash belongs to `CR-307`.

### West Virginia hash reconciliation

The queue’s two expected hashes were cross-assigned to the form labels:

- Current, identity-verified `SCA-C906` SHA-256: `43b5606c9faf6fcf4d6f73c1d97cf1bd87798158dee1b6f3381c8a0472b4b64c`.
- Current, identity-verified `SCA-C907` SHA-256: `2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222`.

Correct the hash-to-form mapping. Do not treat the current issuer files as stale simply because each hash was recorded against the other form number.

### Montana

The repository labels do not represent a one-label/one-file relationship. Preserve five actual state-issued documents:

- MMRTA Form A — currently serving.
- MMRTA Form B — completed sentence.
- Proposed Order.
- Certificate of Service.
- DOJ/CRISS Expungement/Removal Request Form.

The Proposed Order and Certificate of Service are separate files with separate hashes even where the old repository label `MT-OCA-MMRTA` collided. Assign distinct document identities. All four supplied expected hash values were reconciled to the correct actual files, and the CRISS form matched its recorded hash.

### North Dakota and Texas

- `SFN 14859` was acquired as the regular North Dakota Pardon Advisory Board application. Do not substitute the summary-marijuana pardon form.
- The Texas § 411.0736 model petition and model order were acquired in the corrected supplement. The Statement of Inability to Afford Payment of Court Costs or an Appeal Bond was acquired in the primary run. Treat them as three distinct components.

## Captain integration mission

1. Check out the controlling branch and verify the branch head contains this handoff and promotion commit `0e7adc7ea7da43ddae8a585cdbae6c083c0b9fd9`.
2. Download both original-byte artifacts and verify the artifact digests plus every per-source SHA-256 in the receipts.
3. Move issuer-original binaries into durable owner-only custody before artifact expiration. Record the durable custody locator without exposing credentials or private URLs in Git.
4. Reconcile each family’s source record from the receipt and family-binding tables. Update source identity, exact title, printed number, revision, URL, final URL, filename, MIME type, page count, byte length, SHA-256, scope, and component relationship.
5. Apply the identity corrections above. Do not preserve stale descriptive labels where the issuer uses another identity.
6. Keep `MO-CR301` open under source acquisition with the exact interactive-browser stop. Keep Delaware mandatory expungement out of the PDF queue and move it to process guidance/source identity.
7. Do not let source acquisition decide legal suitability, supersession without issuer evidence, field-map compatibility, or reproduction permission.
8. Regenerate the authoritative source queue/register and every derived readiness artifact. The resulting diff must show exactly which holds cleared and which one remains.
9. Run the targeted source, shared-PDF, family-binding, terminalization, and launch-readiness verifiers already present in the repository. Do not run the entire monolithic test suite unless a targeted verifier exposes a wider dependency.
10. Commit the integration in bounded commits and report exact SHAs, commands, pass/fail counts, cleared family IDs, and remaining blockers.

## Fail-closed stop conditions

Stop and report rather than guessing when:

- artifact digest or source SHA-256 verification fails;
- a downloaded file’s printed identity conflicts with its receipt;
- an issuer URL now resolves to different bytes without a currentness/supersession determination;
- a source would be broadened from county-local to statewide scope;
- two different files would retain one colliding document ID;
- a process-guidance disposition is being converted into a nonexistent PDF;
- a public repository write would expose owner-only source bytes.

## Required captain return

```text
CAPTAIN SOURCE INTEGRATION RESULT

BRANCH:
STARTING SHA:
FINAL SHA(S):
PRIMARY ARTIFACT DIGEST VERIFIED: YES / NO
SUPPLEMENT ARTIFACT DIGEST VERIFIED: YES / NO
PER-SOURCE HASH VERIFICATION: <passed>/<checked>
DURABLE OWNER-ONLY CUSTODY LOCATOR RECORDED: YES / NO

FAMILIES CLEARED:
FAMILIES RECLASSIFIED:
FAMILIES STILL BLOCKED:

IDENTITY CORRECTIONS APPLIED:
- DE 281E continuation:
- DE mandatory SBI process:
- MA shared parent / box 4:
- CO JDF 684 vs JDF 686:
- GA pre-2013 scope:
- ME hash assignment:
- WV hash assignment:
- MT distinct document identities:
- CA San Diego scope:

VERIFIERS RUN:
RESULTS:
REMAINING EXACT BLOCKERS:
```
