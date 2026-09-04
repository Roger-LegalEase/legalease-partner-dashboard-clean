# RCAP 28-family source-acquisition results

This directory is the repository-visible evidence package for the owner-assigned 28-family acquisition batch dated 2026-09-04.

## What is here

- `primary-ledger/`: the exact lightweight ledger artifact from successful run `33866926858`, including the 28-family manifest, acquisition summary, YAML/CSV ledgers, family-source bindings, source receipts, and extracted text.
- `supplement-ledger/`: the non-binary evidence from corrected successful supplement run `33868246348`.
- `artifact-custody.json`: immutable run, artifact, digest, size, and expiration identifiers for retrieving the issuer-original bytes.

## What is deliberately not here

The issuer-original PDFs and DOCX files remain in authenticated GitHub Actions artifact custody. This repository is public, while the owner assignment required owner-only source custody. No original source binary may be copied into the public Git tree without a separate owner decision.

## Fail-closed reading rule

A successful workflow run proves that the workflow completed and produced a receipt for every planned source record. It does **not** prove that every source was acquired. Read `primary-ledger/acquisition-summary.json`, each source receipt, and the supplement disposition summary together. Preserve `unresolved`, `not_acquired`, `issuer_binary_blocked_http_403`, and `no_public_binary_exposed` as distinct outcomes. Never convert one into `acquired` merely because a neighboring source succeeded.

## Corrected supplement

Run `33868246348` is the controlling supplement. It supersedes failed run `33867794063`. Its verification gate required the San Diego CRM-307 source and the Texas § 411.0736 model petition and model order to be acquired, while Missouri CR301 remained an explicit OSCA HTTP-403 issuer-host block and Delaware mandatory expungement remained a no-public-binary agency-process disposition.
