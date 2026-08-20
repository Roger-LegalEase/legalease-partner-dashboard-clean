# Local source exhaustion

The record of the local search that has to be exhausted before anything is fetched from a publisher. Every candidate file in the tree, hashed against the committed Master Library index and matched against every outstanding form number by alias.

| | count |
| --- | ---: |
| filesScanned | 940 |
| pdfsHashed | 861 |
| masterLibraryFragmentsFoundLocally | 6 |
| reviewedFamilySourcesFoundLocally | 1 |
| reviewedFamilySourcesStillUnreadable | 26 |
| outstandingRows | 39 |
| rowsWithAnAliasHit | 29 |
| rowsWhoseHitsAreAllGeneratedOutput | 29 |
| rowsResolvedToAnOfficialBinary | 0 |

## Search order

| step | search | ran |
| ---: | --- | --- |
| 1 | exact SHA-256 across every committed file | yes |
| 2 | exact SHA-256 duplicates under alternate filenames | yes |
| 3 | exact form number | yes |
| 4 | form-number punctuation and filename aliases | yes |
| 5 | Master Library manifest, through the committed index | yes |
| 6 | record_clearing_forms_links.xlsx | no — the workbook lives in the unmounted corpus |
| 7 | source bundles and multi-form court kits | no — the bundles live in the unmounted corpus |
| 8 | official publisher URL recorded in repository evidence | no — recorded, but retrieval is refused by the environment |
| 9 | official public source retrieval | no — every publisher host returns 403 at the proxy's CONNECT |

## The decoy finding

29 of the 39 outstanding rows have a filename that matches an outstanding form number, and every one of those matches is LegalEase output rather than a court's.

tmp/official-pdf-shadow-batch holds overlay review drafts: the official page content with an 'RCAP all-50 overlay review draft' banner, a live 'Clear All Data' button and painted annotation zones. tmp/review-inbox holds filled sample packets.

Each is named for the form it was built from, so an alias search finds it first. Accepting one would record a source that no court ever issued, with a hash that matches nothing.

Reading a visible revision off the page. The VA CC-1473 draft prints 'FORM CC-1473 MASTER 07/24', while the corpus index holds CC-1473 at REV-2026-07 — which is drift evidence for the source lane, not a source.

## Master Library fragments found locally

| local path | corpus path | reviewed family source |
| --- | --- | :-: |
| `data/rcap-all50/hard-forms/delaware/family-court-form-281/evidence/DE_FORM-1021IP_adult-expungement-instruction-packet_REV-2023-10.pdf` | `STATES/DE/03_INSTRUCTIONS/DE__INSTRUCTIONS__FORM-1021IP__adult-expungement-instruction-packet__REV-2023-10__EN.pdf` | no |
| `data/rcap-all50/hard-forms/maine/cr-289-motion-to-seal-prostitution-conviction/evidence/ME_CR-289_REV-2024-10.pdf` | `STATES/ME/05_SOURCE_GATED/ME__SOURCE-GATED__CR-289__ada-notice-the-maine-judicial-branch-complies-with-the-americans-with-disabilities-act-ada__REV-2024-10__EN.pdf` | no |
| `data/rcap-codex/remaining-tracks/source-receipts/sc-scca-223a1.pdf` | `STATES/SC/02_PACKET_FORMS/SC__FORM__SCCA-223A1__order-for-destruction-of-arrest-records__REV-2026-04__EN.pdf` | no |
| `data/rcap-codex/remaining-tracks/source-receipts/sc-scca-223d1.pdf` | `STATES/SC/05_SOURCE_GATED/SC__SOURCE-GATED__SCCA-223D1__expungement-objection-transmittal__REV-2016-05__EN.pdf` | no |
| `data/rcap-codex/remaining-tracks/source-receipts/wi-cr-266.pdf` | `STATES/WI/02_PACKET_FORMS/WI__FORM__CR-266__cr-266-05-24-petition-to-expunge-criminal-court-record-of-conviction-non-probation-non-inc__REV-2024-05__EN.pdf` | yes |
| `reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf` | `STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-790-PETITION__pa-r-crim-p-790-petition__REV-2009-03__EN.pdf` | no |

## Conclusion

The local material is exhausted and resolves no outstanding row. Steps 6 through 9 need either the corpus mounted or an egress allowance; neither exists here, so no source can be accepted and no row moves.
