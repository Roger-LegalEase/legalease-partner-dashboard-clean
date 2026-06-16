# Missing Official Forms Audit

Generated: 2026-06-16T13:32:02.404Z

This audit is documentation-only. It does not alter legal content, does not approve visual placement, does not mark any artifact as `replacement_candidate` or `verified_replacement`, does not make anything production ready, and does not wire any form to live routes. It did not modify `private/`.

This revision rescans the real private Nationwide state folders after the copied missing forms were placed into Florida, Maryland, Massachusetts, Minnesota, and Missouri. The temporary `Missing Forms/` extraction folder is excluded from state-folder counts.

## Executive Summary

- State folders scanned: 51
- States with reference docs: 50
- States with Wilma/reference RTFs: 27
- States with likely blank official PDFs: 44
- States with official-source HTML captures: 31
- States with only modeled/reference/source material and no likely blank official PDF: 7
- States needing local inspection rescan because files changed: 5
- States needing official source confirmation: 4
- States still needing true web research: 6
- Files found in state folders: 246 PDFs, 82 HTML files, 27 RTF files, 7 DOCX files
- High-priority missing forms after rescan: 3

## Taxonomy

- `has_reference_doc`: Folder includes an agent/reference PDF or similar reference material.
- `has_wilma_reference`: Folder includes a Wilma/reference RTF or Wilma-named reference.
- `has_official_blank_pdfs`: Folder includes at least one likely blank official PDF, excluding reference/instruction-only PDFs.
- `has_official_source_html`: Folder includes captured official-source HTML pages.
- `has_modeled_forms_only`: Folder has references/HTML/RTF/DOC/DOCX but no likely blank official PDF.
- `missing_official_pdf`: A referenced form or family is not identifiable as a local blank official PDF.
- `missing_form_family`: A broader form family remains absent locally.
- `source_reference_mentions_form_not_present`: A local source, state-pack catalog, or captured HTML implies a form that is not clearly present.
- `downloaded_since_last_audit`: Newly copied missing-form PDFs are present in the real state folder.
- `needs_local_rescan`: Inspection artifacts should be regenerated because private files changed since the last inspection report.
- `needs_official_source_confirmation`: Local files may satisfy the gap but need title/source/revision confirmation before catalog or mapping use.
- `needs_web_research`: Local files remain insufficient after this rescan and external official-source checking is needed.

## Downloaded Since Last Audit

| State | Files now present |
| --- | --- |
| Florida | LegalEase Florida/se (1).pdf; LegalEase Florida/se (2).pdf; LegalEase Florida/se (3).pdf; LegalEase Florida/se (4).pdf; LegalEase Florida/se (5).pdf; LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf |
| Maryland | LegalEase Maryland/ccdccr078.pdf; LegalEase Maryland/dccr071.pdf |
| Minnesota | LegalEase Minnesota/EXP103_Current.pdf |
| Missouri | LegalEase Missouri/Judgment and Order of Expungement - Section 610.140 RSMo CR370.pdf |
| Massachusetts | LegalEase massachusetts/jud-Petition-for-Expungement-of-Marijuana-Offenses-2022-11-08-final.pdf |

## States Moved Out Of `needs_web_research`

| State | Why |
| --- | --- |
| Florida | The copied se (1)-se (5) PDFs now provide local blank-form candidates for the previously missing Florida seal/expunge packet components; remaining work is official-source confirmation and title normalization. |
| Maryland | ccdccr078.pdf and dccr071.pdf are now in the Maryland folder, satisfying two previously high-priority missing Judiciary forms. |
| Massachusetts | The marijuana expungement petition PDF is now in the Massachusetts folder; the remaining time-based expungement item needs local/source confirmation, not broad web research. |
| Minnesota | EXP103_Current.pdf is now in the Minnesota folder, completing the EXP101-EXP107 local family captured by the state-pack catalog. |
| Missouri | CR370 judgment/order is now in the Missouri folder, satisfying the previously high-priority missing order form for the 610.140 packet. |

## Remaining True `needs_web_research` States

- California
- Colorado
- North Carolina
- Oklahoma
- Wisconsin
- Wyoming

## Updated High-Priority Missing Forms

| State | Form number | Likely title | Why local files remain insufficient | Next action |
| --- | --- | --- | --- | --- |
| California | CR-180 / CR-181 | Petition and Order for Dismissal | Local folder has CR-180/CR-181 HTML captures and a reference PDF, but no blank official PDFs. | External official-source check is needed to collect current Judicial Council PDFs. |
| Colorado | JDF family | Colorado sealing forms packet | Local folder has source HTML/reference material but no blank JDF PDFs. | External official-source check is needed to identify and collect current JDF forms by route. |
| North Carolina |  | AOC-CR expunction petition/order forms for G.S. 15A-145.5 and 15A-146 routes | Local folder has HTML pages naming expunction routes but only an agent-reference PDF, no blank official AOC PDFs. | External official-source check is needed to collect current AOC-CR PDFs. |

## Needs Official Source Confirmation

| State | Form number | Likely title | Why confirmation is needed | Priority | Next action |
| --- | --- | --- | --- | --- | --- |
| Florida |  | Florida seal/expunge packet PDFs se (1)-se (5) | Previously missing packet forms are now locally present, but filenames are generic and must be matched to official titles/rules before catalog use. | medium | Inspect the five local se PDFs, map each to official title/form role, and record source URL/access/revision metadata. |
| Florida |  | FDLE Application for Certificate of Eligibility | The new Florida folder has court rule and se packet PDFs, but no clearly named FDLE certificate application PDF; local source HTML may point to it. | medium | Use local Florida source HTML/reference first to confirm whether an FDLE application PDF is already represented or still needs manual collection. |
| Maryland | CC-DC-CR-148 | Petition for Shielding Under Maryland Second Chance Act | The newly copied Maryland files satisfy CC-DC-CR-078 and DC-CR-071; CC-DC-CR-148 is still referenced by the catalog but not locally present by filename. | medium | Confirm from local Maryland source HTML/reference whether shielding is in current scope and collect/record source metadata if needed. |
| Maryland | CC-DC-CR-072G2 | List of Expungeable Charges Under Criminal Procedure § 10-110 | Still referenced by the catalog and not present as a local PDF by filename after the copied forms. | low | Confirm whether this support form is required for generated packets before collecting. |
| Massachusetts |  | Petition to Expunge Form (time-based) | The marijuana expungement PDF was copied in, but the catalog also references a separate time-based expungement petition not clearly present by filename. | medium | Inspect local Massachusetts PDFs/reference to determine whether jud-Petition-for-Expungement.pdf covers this role or a separate form remains needed. |
| Missouri | CR300 | Petition for Correction of Arrest Court Records — Identity Theft | CR370 was copied in, but CR300 remains referenced with no local matching PDF. | medium | Confirm CR300 current availability and whether it is in scope for supported filing packets. |
| Missouri | CR375 | Petition for Expungement — Marijuana-Related Offense(s) | CR370 was copied in, but CR375 remains referenced with no local matching PDF. | medium | Confirm CR375 current availability and whether it is superseded or locally represented by another PDF. |

## State-by-State Table

| State | Folder | PDF/HTML/RTF/DOCX | Likely official PDFs | Classifications |
| --- | --- | --- | --- | --- |
| Alabama | LegalEase Alabama | 3/3/0/0 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Alaska | LegalEase Alaska | 2/2/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Arizona | LegalEase Arizona | 5/1/0/0 | 4 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Arkansas | LegalEase Arkanasa | 4/2/0/0 | 3 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| California | LegalEase California  | 1/4/0/0 | 0 | has_reference_doc, has_official_source_html, has_modeled_forms_only, needs_web_research, missing_official_pdf, missing_form_family, source_reference_mentions_form_not_present |
| Colorado | LegalEase Colorado | 1/3/0/0 | 0 | has_reference_doc, has_official_source_html, has_modeled_forms_only, needs_web_research, missing_official_pdf, missing_form_family, source_reference_mentions_form_not_present |
| Connecticut | LegalEase Connecticut | 3/4/0/0 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| DC | LegalEase DC | 2/0/1/0 | 2 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Delaware | LegalEase Delaware | 2/2/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Florida | LegalEase Florida | 7/1/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, has_official_source_html, downloaded_since_last_audit, needs_official_source_confirmation, missing_official_pdf, source_reference_mentions_form_not_present, needs_local_rescan |
| Georgia | LegalEase Georgia | 2/4/0/0 | 0 | has_reference_doc, has_official_source_html, has_modeled_forms_only |
| Hawaii | LegalEase Hawaii | 3/3/0/0 | 3 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Idaho | LegalEase Idaho | 4/2/0/0 | 3 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Illinois | LegalEase Illinois | 18/0/1/0 | 14 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Indiana | LegalEase Indiana | 2/3/0/4 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Iowa | LegalEase Iowa | 6/2/0/0 | 6 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Kansas | LegalEase Kansas | 7/2/0/0 | 6 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Kentucky | LegalEase Kentucky | 7/2/0/0 | 7 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Louisiana | LegalEase Louisiana | 0/7/1/0 | 0 | has_reference_doc, has_wilma_reference, has_official_source_html, has_modeled_forms_only |
| Maine | LegalEase Maine | 3/0/1/0 | 3 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Maryland | LegalEase Maryland | 7/1/1/0 | 6 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, has_official_source_html, downloaded_since_last_audit, needs_official_source_confirmation, missing_official_pdf, source_reference_mentions_form_not_present, needs_local_rescan |
| Michigan | LegalEase Michigan | 6/1/0/0 | 5 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Minnesota | LegalEase Minnesota | 10/0/1/0 | 10 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, downloaded_since_last_audit, needs_local_rescan |
| Mississippi | LegalEase Mississippi | 4/0/1/0 | 4 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Missouri | LegalEase Missouri | 7/0/1/0 | 7 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, downloaded_since_last_audit, needs_official_source_confirmation, source_reference_mentions_form_not_present, needs_local_rescan |
| Montana | LegalEase Montana | 3/0/1/3 | 2 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Nebraska | LegalEase Nebraska | 3/0/0/0 | 3 | has_official_blank_pdfs |
| Nevada | LegalEase Nevada | 6/0/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| New Hampshire | LegalEase New Hampshire | 6/0/1/0 | 6 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| New Jersey | LegalEase New Jersey | 3/4/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| New Mexico | LegalEase New Mexico | 8/0/1/0 | 8 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| New York | LegalEase New York | 2/7/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| North Carolina | LegalEase North Carolina | 1/8/0/0 | 0 | has_reference_doc, has_official_source_html, has_modeled_forms_only, needs_web_research, missing_official_pdf, missing_form_family, source_reference_mentions_form_not_present |
| North Dakota | LegalEase North Dakota | 11/0/1/0 | 9 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Ohio | LegalEase Ohio | 5/0/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Oklahoma | LegalEase Oklahoma | 0/1/1/0 | 0 | has_reference_doc, has_wilma_reference, has_official_source_html, has_modeled_forms_only, needs_web_research, missing_form_family, source_reference_mentions_form_not_present |
| Oregon | LegalEase Oregon | 2/1/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Pennsylvania | LegalEase Pennsylvania | 14/3/1/0 | 14 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, has_official_source_html |
| Rhode Island | LegalEase Rhode Island | 4/0/1/0 | 4 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| South Carolina | LegalEase South Carolina  | 6/0/1/0 | 6 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| South Dakota | LegalEase South Dakota | 7/0/1/0 | 6 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Tennessee | LegalEase Tennesee | 3/3/0/0 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Texas | LegalEase Texas | 2/1/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Utah | LegalEase Utah | 12/2/1/0 | 12 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, has_official_source_html |
| Vermont | LegalEase Vermont | 7/1/1/0 | 7 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, has_official_source_html |
| Virginia | LegalEase Virginia  | 3/1/0/0 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Washington | LegalEase Washington | 10/0/1/0 | 10 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| West Virginia | LegalEase West Virginia | 5/0/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Wisconsin | LegalEase Wisconsin | 2/0/1/0 | 2 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, needs_web_research, missing_official_pdf, missing_form_family, source_reference_mentions_form_not_present |
| Wyoming | LegalEase Wyoming | 0/1/1/0 | 0 | has_reference_doc, has_wilma_reference, has_official_source_html, has_modeled_forms_only, needs_web_research, missing_form_family, source_reference_mentions_form_not_present |
| Massachusetts | LegalEase massachusetts | 5/0/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, downloaded_since_last_audit, needs_official_source_confirmation, source_reference_mentions_form_not_present, needs_local_rescan |

## Recommended Next 10 Official Source Confirmation Targets

| Rank | State | Form number | Likely title | Next action |
| --- | --- | --- | --- | --- |
| 1 | Florida |  | Florida seal/expunge packet PDFs se (1)-se (5) | Inspect the five local se PDFs, map each to official title/form role, and record source URL/access/revision metadata. |
| 2 | Florida |  | FDLE Application for Certificate of Eligibility | Use local Florida source HTML/reference first to confirm whether an FDLE application PDF is already represented or still needs manual collection. |
| 3 | Maryland | CC-DC-CR-148 | Petition for Shielding Under Maryland Second Chance Act | Confirm from local Maryland source HTML/reference whether shielding is in current scope and collect/record source metadata if needed. |
| 4 | Maryland | CC-DC-CR-072G2 | List of Expungeable Charges Under Criminal Procedure § 10-110 | Confirm whether this support form is required for generated packets before collecting. |
| 5 | Massachusetts |  | Petition to Expunge Form (time-based) | Inspect local Massachusetts PDFs/reference to determine whether jud-Petition-for-Expungement.pdf covers this role or a separate form remains needed. |
| 6 | Missouri | CR300 | Petition for Correction of Arrest Court Records — Identity Theft | Confirm CR300 current availability and whether it is in scope for supported filing packets. |
| 7 | Missouri | CR375 | Petition for Expungement — Marijuana-Related Offense(s) | Confirm CR375 current availability and whether it is superseded or locally represented by another PDF. |

## Recommended Next 10 Web-Research Targets

| Rank | State | Form number | Likely title | Next action |
| --- | --- | --- | --- | --- |
| 1 | California | CR-180 / CR-181 | Petition and Order for Dismissal | External official-source check is needed to collect current Judicial Council PDFs. |
| 2 | Colorado | JDF family | Colorado sealing forms packet | External official-source check is needed to identify and collect current JDF forms by route. |
| 3 | North Carolina |  | AOC-CR expunction petition/order forms for G.S. 15A-145.5 and 15A-146 routes | External official-source check is needed to collect current AOC-CR PDFs. |
| 4 | Oklahoma |  | Petition to Expunge Records and Order to Expunge Records | External official-source check is needed to determine whether forms are statutory text, local forms, or statewide PDFs. |
| 5 | Wyoming |  | Wyoming expungement forms/packet | External official-source check is needed to determine current court form availability. |
| 6 | Wisconsin |  | Wisconsin expungement petition/order forms | External official-source check is needed to determine whether statewide circuit court forms exist. |

## Notes And Constraints

- This audit used local rescan only. It did not search the web or download anything.
- This audit does not download, edit, or normalize files in `private/`.
- This audit does not change state packs, field maps, lifecycle gates, renderers, routes, migrations, package metadata, billing/auth/admin/Stripe/RLS/Supabase, or deployment configuration.
- `needs_web_research` now means local files remain insufficient after the rescan and external official-source checking is actually needed. A Wilma/reference doc alone does not trigger `needs_web_research`.
- Newly copied forms still need source URL, access date, revision date if available, blank PDF hash, source freshness review, filled-data visual review, and counsel confirmation before production use.

