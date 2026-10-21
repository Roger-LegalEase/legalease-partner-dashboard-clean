# Sept. 11, 2026 user-supplied source bundle

This directory records exact custody for the court/source PDFs supplied directly by the owner on Sept. 11, 2026.

The raw official PDFs are intentionally not force-added here because the repository `.gitignore` explicitly classifies local official PDF forms as non-committed source material. The exact binary bundle is held in Google Drive and is byte-pinned by `manifest.json`.

## Binary custody

- Drive file ID: `1nRGzcS-6P2y2cXdcyp9AEHsowVosnOW-`
- File: `legalease-source-bundle-20260911.zip`
- SHA-256: `6d741583740ba6cdc4daec17d12abcd350257bf3eaea550ecee988bed0cb6d02`
- Bytes: `3669331`

Before any source integration, verify the bundle hash and every individual file hash from `manifest.json`. Do not promote a family merely because a file is present in this bundle; normal source identity, route, packet, review, and admission gates remain controlling.

## Notable exact-byte duplicates

- `JDF206-2(2).pdf` and `JDF206(2).pdf` are byte-identical.
- `4-222-new-2(2).pdf` and `4-222-new(2).pdf` are byte-identical.

## Intended handoff

The bundle includes the newly supplied Colorado JDF materials, California CR-432, New Mexico 4-222 copies, Louisiana statutory-source captures, Arizona R-26-0001 material, and the additional uploaded application/certificate documents. Source identity must be established from the bytes and authoritative context, not inferred solely from the upload filename.

## Captain reconciliation

The archive and all 14 individual PDF hashes and lengths have now been verified locally: 12 unique PDF bodies, with two duplicate aliases. See [local verification](local-verification.json), [document inspection](document-inspection.json), and the [governed adoption](../../source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json).

The active operational source-blocked set drops from eight rows to one: Arizona still lacks the actual R-26-0001 amended Form 31(a)/(b) binaries or attachment bytes. The machine SOURCE_BLOCKED set drops from four rows to one; California, Colorado and Louisiana were already in other machine states while their operational source gaps remained. Current status and next gates are recorded in [Captain blocker status](captain-blocker-status.json).

Eight supplied unique source PDFs are adopted. Existing Colorado JDF492/JDF613 and the newer August 2024 JDF615, plus the existing Louisiana Article 987 HTML, are retained. The supplied July 2023 JDF615 does not replace the newer source. “SC - Application and Order” is actually an old Yuma, Arizona package, not a South Carolina document. The R260001 docket has no embedded amended forms; the Rule 31 certificate is unrelated to these source blockers.

This is source custody and identity reconciliation only. New Mexico packets must replace their old district-local 4-222 binding before raster/review advancement. Colorado still owes packet-component and content repairs. California still needs its builder. Louisiana still owes statutory-form content repair and collection/validation of four participant-specific documents. No family is made terminal by this source adoption.

Original official PDFs remain under ignored `private/source-imports/user-upload-20260911/<SHA256>.pdf`; the exact archive remains in the pinned Drive custody above. No original upload or historical determination record was rewritten. Recheck with `python data/rcap-grade-a/source-custody/user-upload-20260911/verify-custody.py`.
