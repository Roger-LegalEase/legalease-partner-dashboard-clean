# Source identity resolution sweep

**Lane:** SRC1 (measurement). **Measured:** 2026-09-09. Built no packet, claimed no family, edited no manifest.

## The number

Of the 30 families whose declared source identities did not resolve in the custody record, **11 are in custody and 19 are not**. **9 can be opened by a build lane today** — every bound source resolves byte-exact and every bound source is a PDF.

```
la-977d-marijuana-first-offense-set
la-985-1-interim-expungement-set
ar-misdemeanor-seal-set
census-pending-family:ME:juvenile-sealing
la-976-arrest-no-conviction-set
ma-expunge-k-set
wv_acc_treatment_job_readiness-set
ma-seal-court-set
ut_pet_special_certificate-set
```

Two more resolve completely but bind Word documents rather than PDFs (`mt_mmrta_completed-set`, `mt_mmrta_serving-set`). They are in custody; they have no PDF to fill.

`ut_pet_special_certificate-set` carries a caveat: it resolves 9 of 9, but two of the nine were found only under `/home/user/captain-worktree/reference/`, a working reference directory rather than a durable custody. Materialize them before binding.

## How much of this was a records defect

| Measurement | Count |
|---|---|
| Families where every declared source was held all along | 11 |
| Families where at least one declared source was held all along but the row said otherwise | 20 of 30 |
| Declared sources held all along | 51 |
| Declared sources genuinely not in any mounted custody | 30 |

The resolution gate returns at tier custody_reconciliation whenever a family has a custody row at all, and never reaches the digest fallback. A family with a custody row therefore reports that it names no resolved document source even when the bytes are sitting in a mounted tree under a different filename. This sweep resolves by digest first and consults no custody row, so it is not subject to that ordering.

Twenty of the thirty families had at least one document sitting in a mounted tree that the record called unresolved. That is a records defect, not a missing document.

## Why the other 30 bound sources are absent

| Absence class | Bound sources | Recoverable how |
|---|---|---|
| Behind an external locator (`google-drive:`, `github-actions-artifact:`) that is not a mounted custody | 20 | Mount the locator custody, or re-acquire |
| Acquired on receipt 2026-09-04, never materialized | 7 | The bytes were fetched at exactly the declared digest. Materialize them. |
| Indexed but absent from the mounted tree | 2 | Recorded as held; file not on disk |
| Recorded in the unmounted custody `src05_worker_materialization_2026_09_02` | 1 | Mount the custody |

### The nine missing recovery-pool files

The mounted Nationwide_Recovery_Pool_2026-09-02 tree carries 371 of the 380 entries the committed index attributes to it. The nine absent entries are exactly the source-acquisition-2026-09-04 subtree, and that subtree does not exist anywhere under the mounted pool. Seven of the nine have acquisition receipts recording those exact digests fetched on 2026-09-04.

Per-custody completeness against the committed index: `master_library` 336/336, `d_source_packs` 253/253, `human_source_returns` 1/1, `nationwide_recovery_pool_2026_09_02` 371/380, `src05_worker_materialization_2026_09_02` 3/14.

The chunked corpus recovery pool at private/corpus-recovery-parts (POOL_INDEX.json, 876 hash-addressed files) contains none of the nine digests, so they cannot be reconstructed from it either.

## Candidates that are not matches

Six families hold an instrument bearing the declared form number or printed title at a **different digest** — Florida FDLE 40-021 and 40-025, Iowa Rule 2.86 Forms 2 and 3, and the four North Dakota AR 41 prohibit-public-access pleadings. A different digest is a different rendition or revision. None is recorded as a match, because binding one in place of the declared source would put a false source binding into a packet. Each is recorded in the JSON with its measured digest, page count and first-page text so an owner can decide whether to rebind.

## The MASTER_QUEUE contradiction

**55 rows** carry it, not one: `sourceStatus: SOURCE_BOUND_BY_HELD_BYTES` and `sourceBound: true` alongside a nested `sourceReadiness.custodyClass` of `SOURCE_GENUINELY_MISSING` or `SOURCE_IDENTITY_UNRESOLVED`. Every one of the 55 also reads `sourceReadiness.ready: true` with no reasons.

Thirty are the families measured here. The rest span every queue state, including rows that read `COMPLETE_PACKET_PROVEN`. A lane dispatched from the top-level fields of any of these rows is told the source is bound and ready while the nested field says the opposite. The full list is in the JSON. `MASTER_QUEUE.json` was not modified by this lane.

## Three families whose bound source is not a PDF or is a locator

### `mt_deferred_dismissal-set`

**What is held:** A Word document (.docx, 84539 bytes, sha256 4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7). Its text opens "Expungement/Removal Request Form  PLEASE CHOOSE APPROPRIATE REQUEST TYPE" and offers checkboxes for Misdemeanor Conviction Expungement, Marijuana Conviction Expungement and Non-Conviction Removal.

**What it actually is:** An administrative submission form addressed to the Montana Department of Justice, Division of Criminal Investigation, Criminal Records and Identification Services. It is the request you mail to the state repository AFTER a court has already ordered relief - it lists the court judgment and the court order among its required enclosures. It is not the court filing that obtains the relief.

**Is a real instrument behind it:** Partly. The agency form is real and is held. What is NOT held is any court-filing instrument for a deferred-imposition dismissal: no petition, no proposed order, in any mounted custody. The family binds the downstream agency form and nothing upstream of it.

### `mt_misdemeanor_expungement-set`

**What is held:** The same Word document as mt_deferred_dismissal-set (sha256 4606815523c3d2a77d1874ca3de8909250abd9349f2973230473116c962109a7). Both families bind the one agency form and nothing else.

**What it actually is:** The Montana DOJ/DCI Expungement/Removal Request Form, an agency submission, not a court filing.

**Is a real instrument behind it:** Yes, and it is held. srmisexp2025.pdf is a 22-page Montana misdemeanor-expungement self-help packet whose own contents page lists Instructions, Petition for Expungement of Misdemeanor Records, Order Expunging Misdemeanor Records and Sealing Record of this Proceeding, Statement of Inability to Pay Court Costs and Fees, and Order Regarding Statement of Inability to Pay. That is the court-filing instrument set this family lacks.

### `rcap-mo-custom-pleading`

**What is held:** Two bound sources, both resolving byte-exact. official-form:FI-05 is a 4-page AcroForm PDF with 111 fields (sha256 53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e), printed title "Confidential Case Filing Information Sheet - Non-Domestic Relations". official-form:GN10 is a Word document (39193 bytes, sha256 13ff25147df2c70eec85b2d498f486aae9c2b46c535f9f9d7992b6247480421e), text "Motion and Affidavit in Support of Request to Proceed As a Poor Person".

**What it actually is:** Neither bound source is the expungement pleading. FI-05 is a court cover sheet and GN10 is a fee-waiver motion. Both are ancillary filings that accompany a petition.

**Is a real instrument behind it:** Not in a mounted custody. The family is a custom_pleading route, so the operative petition is meant to be drafted from codified text rather than from an official form; the two bound sources are the accompanying documents only. Note separately that Missouri form CR370 is recorded in the committed index under custody src05_worker_materialization_2026_09_02, which is not mounted here.

## What this does not establish

- It is not a state change, not a source determination and not a rebind. No family state, count, claim or treatment is altered by it.
- RESOLVED_BY_CONTENT means the declared bytes are openable in this container. It does not mean the instrument is the legally correct one for the route, and it does not mean the packet is buildable: format and coverage blockers are recorded separately per family.
- Where a same-titled instrument is held at a digest other than the declared one, this file records it as a candidate and refuses it as a match. Rebinding a family to different bytes is an owner decision.

Machine-readable findings, one entry per family with every digest and path: `data/rcap-grade-a/source-wave-integration/SOURCE_IDENTITY_RESOLUTION_SWEEP.json`.
