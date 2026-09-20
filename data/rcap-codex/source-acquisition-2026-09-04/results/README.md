# RCAP 28-family source results — final source posture

This directory contains the evidence, corrections, custody records, and owner authorization for the 28-family source batch dated 2026-09-04.

## Final accounting

- owner-assigned families: `28`
- families with every required downloadable source verified: `27/27`
- no-public-binary process families: `1` — `de_mandatory_expungement-set`
- families still source-blocked: `0`
- required downloadable source records verified: `32/32`
- binary-bearing source records verified or owner-supplied: `33/33`
- all source records resolved: `34/34`

This is source resolution, not an automatic claim that every family is field-mapped, rendered, legally released, or production ready. The captain is authorized to complete those remaining steps.

## Current controlling records

- `final-source-resolution.json`
- `owner-production-authorization.json`
- `artifact-custody.json`
- `corrections/DE-FORM-281-date-provenance.json`
- `corrections/MO-CR301-owner-supplied-source-completion.json`
- `../OWNER-PRODUCTION-AUTHORIZATION-2026-09-04.md`
- `../CAPTAIN-HANDOFF.md`

The primary and supplement ledgers and acquisition-time receipts remain under `primary-ledger/` and `supplement-ledger/` as historical evidence.

## Team access

The primary archive, corrected supplement archive, and CR301 are shared read-only with the `legalease.com` Google Workspace domain and are not discoverable in domain search. The captain may also download the immutable workflow artifacts directly through `gh run download` from Codespace.

The owner has approved extracting and committing the individual blank official source forms into the repository's established source locations or Git LFS where runtime and packet generation need them. No additional custody or owner approval is required.

## Reading rule

Use the latest controlling correction, completion, final-resolution, custody, and owner-authorization records for current status. Do not let an older acquisition-time `not_acquired`, HTTP failure, owner-only instruction, or stop report override later verified evidence.

Preserve real distinctions:

- Delaware mandatory expungement is SBI process guidance, not a downloadable form.
- California CRM-307 remains San Diego County-local.
- Missouri CR301's automated OSCA HTTP 403 remains provenance, not a source hold.
- Actual legal, license, PII, security, rendering, and acceptance failures must still be fixed before production release.
