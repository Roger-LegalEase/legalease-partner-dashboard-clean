# Source population reconciliation

Across all four handoffs, zero binaries were acquired and zero SHA-256 digests were recomputed from newly retrieved bytes. The source-resolution lane resolved 19 assets to official hosts and states acquiredHere = 0; the direct lane searched 2 of 18 and states acquired = 0. Those are identity findings, and identity is not possession. retained_missing counts assets whose pinned binary is absent from this clone, so it does not move.

| state | assets |
| --- | ---: |
| packable_from_master_library | 13 |
| direct_url_resolved | 3 |
| landing_page_resolved | 8 |
| contaminated_source | 0 |
| html_capture_not_a_form | 6 |
| publisher_searched_no_binary | 0 |
| never_searched | 7 |

## Retirement

No asset earned retirement or a repoint, so retired stays where it is. Every assigned asset still carries a surviving operational dependency, which is the one condition that forbids retirement.

## Packability

A pack manifest is a specification, not bytes. No ZIP was built, because no Master Library was mounted where the packs were generated. The manifests say what each pack must contain; Session 5 owns building them.

## packable_from_master_library — 13

| jur | form | next executable action |
| --- | --- | --- |
| AK | RequestToSealCrimInfo.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| AR | 7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| AR | Felony-Petition-Form-f.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| KY | 496.2.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| KY | 496.3.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| NE | CC-6-11-2.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| NE | CC-6-12.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00129 – Petition to Expunge Criminal History.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00130A - Filing a Petition to Expunge or Seal a Criminal Record.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00131.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00132 – Stipulation to Seal Criminal History Record + Order.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00132A – Stipulation to Expunge Criminal History Record + Order.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |
| VT | 200-00631.pdf | Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP |

## direct_url_resolved — 3

| jur | form | next executable action |
| --- | --- | --- |
| NC | cr297.pdf | fetch the direct URL in an egress-permitted container and record the SHA-256 of the retrieved bytes |
| NE | CC-6-11.pdf | fetch the direct URL in an egress-permitted container and record the SHA-256 of the retrieved bytes |
| VA | cc1473.pdf | fetch the direct URL in an egress-permitted container and record the SHA-256 of the retrieved bytes |

## landing_page_resolved — 8

| jur | form | next executable action |
| --- | --- | --- |
| NC | expungements.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| NC | forms-2.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| NC | forms.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| NC | nc-expunction-petition.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| VA | cc1473inst.pdf | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| VA | va-expungement-sealing-forms.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| VT | 400-00171.pdf | follow the landing page to the form binary, retrieve it, and record its SHA-256 |
| VT | application-waive-filing-fees-and-service-costs.html | follow the landing page to the form binary, retrieve it, and record its SHA-256 |

## html_capture_not_a_form — 6

| jur | form | next executable action |
| --- | --- | --- |
| AK | ak-record-relief-forms.html | discard the capture and search the publisher of record for the form binary |
| AL | al-expungement-petition.html | discard the capture and search the publisher of record for the form binary |
| AL | criminal-forms.html | discard the capture and search the publisher of record for the form binary |
| AL | criminal-record-expungement.html | discard the capture and search the publisher of record for the form binary |
| AR | Arkansas-Petition-Order-Forms.html | discard the capture and search the publisher of record for the form binary |
| KY | Kentucky-Expungement-Forms.html | discard the capture and search the publisher of record for the form binary |

## never_searched — 7

| jur | form | next executable action |
| --- | --- | --- |
| AL | cr-65-expunge-petition-10-2024.pdf | search the publisher of record for this jurisdiction and form number |
| AL | cr-65a-order-on-petition-for-expungement-10-2024.pdf | search the publisher of record for this jurisdiction and form number |
| AR | 3-Misdemeanor-Petition-8_01_2023.pdf | search the publisher of record for this jurisdiction and form number |
| KY | 497.2.pdf | search the publisher of record for this jurisdiction and form number |
| KY | JV-29.1.pdf | search the publisher of record for this jurisdiction and form number |
| KY | JV-29.pdf | search the publisher of record for this jurisdiction and form number |
| KY | JV-30.pdf | search the publisher of record for this jurisdiction and form number |
