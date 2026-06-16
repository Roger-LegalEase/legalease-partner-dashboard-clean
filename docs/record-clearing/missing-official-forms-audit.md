# Missing Official Forms Audit

Generated: 2026-06-16T16:40:00.000Z

This audit is documentation-only. It does not alter legal content, does not approve visual placement, does not mark any artifact as `replacement_candidate` or `verified_replacement`, does not make anything production ready, and does not wire any form to live routes. It did not modify `private/`.

This revision rescans the real private Nationwide state folders after the second missing-forms batch was copied into the real California, Colorado, North Carolina, Oklahoma, Wisconsin, and Wyoming folders. The temporary `Missing Forms/`, `Missing Folder 2 Extracted/`, `Missing Folder 2/`, and `__MACOSX/` extraction/staging folders are excluded from state-folder counts. The duplicate trailing-space folder `LegalEase California ` is also excluded from the state-folder count and file totals; its older California HTML/reference files remain noted as supplemental local evidence to reconcile in a later private-folder cleanup task.

## Executive Summary

- State folders scanned: 51
- States with reference docs: 49
- States with Wilma/reference RTFs: 27
- States with likely blank official PDFs: 47
- States with official-source HTML captures: 30
- States with only modeled/reference/source material and no likely blank official PDF: 4
- States using custom-pleading/statutory strategy pending official-source confirmation: 2
- States needing local inspection rescan because files changed: 11
- States needing official source confirmation: 10
- States still needing true web research: 0
- Files found in counted state folders: 291 PDFs, 86 HTML files, 27 RTF files, 7 DOCX files
- High-priority missing forms after rescan: 0

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
- `custom_pleading_strategy_source_supported`: Local statute/reference/handout material supports a custom pleading or statutory petition strategy for the current shadow-stage audit, but the file set does not prove from an official source that no statewide official blank form exists.

## Downloaded Since Last Audit

| State | Files now present |
| --- | --- |
| Florida | LegalEase Florida/se (1).pdf; LegalEase Florida/se (2).pdf; LegalEase Florida/se (3).pdf; LegalEase Florida/se (4).pdf; LegalEase Florida/se (5).pdf; LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf |
| Maryland | LegalEase Maryland/ccdccr078.pdf; LegalEase Maryland/dccr071.pdf |
| Minnesota | LegalEase Minnesota/EXP103_Current.pdf |
| Missouri | LegalEase Missouri/Judgment and Order of Expungement - Section 610.140 RSMo CR370.pdf |
| Massachusetts | LegalEase massachusetts/jud-Petition-for-Expungement-of-Marijuana-Offenses-2022-11-08-final.pdf |
| California | LegalEase California/cr180.pdf; LegalEase California/cr181.pdf; LegalEase California/Instructions-for-Filling-Out-a-Petition-for-Dismissal.pdf |
| Colorado | LegalEase Colorado/JDF302.pdf; LegalEase Colorado/JDF304.pdf; LegalEase Colorado/JDF324.pdf; LegalEase Colorado/JDF326.pdf; LegalEase Colorado/JDF477.pdf; LegalEase Colorado/JDF478.pdf; LegalEase Colorado/JDF492.pdf; LegalEase Colorado/JDF493.pdf; LegalEase Colorado/JDF611.pdf; LegalEase Colorado/JDF612.pdf; LegalEase Colorado/JDF614.pdf; LegalEase Colorado/JDF615.pdf; LegalEase Colorado/JDF641.pdf; LegalEase Colorado/JDF642.pdf; LegalEase Colorado/JDF682.pdf; LegalEase Colorado/JDF683.pdf; LegalEase Colorado/JDF686.pdf; LegalEase Colorado/JDF2370.pdf; LegalEase Colorado/JDF2371.pdf; LegalEase Colorado/JDF2374.pdf; LegalEase Colorado/JDF 2361 - Z Rem.pdf; LegalEase Colorado/JDF 419 Order and Notice of Hearing.pdf; LegalEase Colorado/JDF 435 order denying petition to seal.pdf; LegalEase Colorado/JDF 684 Order Denying Petition to Seal Criminal Conviction Municipal Records.pdf; LegalEase Colorado/JDF 685 Order and Notice of Hearing on Petition to Seal Criminal Conviction Municipal Records.pdf |
| North Carolina | LegalEase North Carolina/cr287_1.pdf; LegalEase North Carolina/cr287-instr_3.pdf; LegalEase North Carolina/cr297.pdf; LegalEase North Carolina/cr297-instr_2.pdf; LegalEase North Carolina/cr298_1.pdf; LegalEase North Carolina/cr298-instr_7.pdf |
| Oklahoma | LegalEase Oklahoma/Oklahoma Statutes §22-18a (2025) - Petition to Expunge Records and Order to Expunge Records. : 2025.html; LegalEase Oklahoma/Oklahoma Expungement Reference for Wilma.rtf; LegalEase Oklahoma/Facets of Expungement of Criminal Records in Oklahoma - Oklahoma Bar Association.html |
| Wisconsin | LegalEase Wisconsin/CR-266.pdf; LegalEase Wisconsin/CR-266_summary.pdf; LegalEase Wisconsin/CR-267.pdf; LegalEase Wisconsin/CR-267_summary.pdf; LegalEase Wisconsin/forms-download/CR-266_en.pdf; LegalEase Wisconsin/forms-download/CR-266_summary_en.pdf |
| Wyoming | LegalEase Wyoming/Wyoming Expungement-Handout_05.01.25.pdf; LegalEase Wyoming/Wyoming Expungement — Wilma Agent Training Reference.rtf |

## States Moved Out Of `needs_web_research`

| State | Why |
| --- | --- |
| Florida | The copied se (1)-se (5) PDFs now provide local blank-form candidates for the previously missing Florida seal/expunge packet components; remaining work is official-source confirmation and title normalization. |
| Maryland | ccdccr078.pdf and dccr071.pdf are now in the Maryland folder, satisfying two previously high-priority missing Judiciary forms. |
| Massachusetts | The marijuana expungement petition PDF is now in the Massachusetts folder; the remaining time-based expungement item needs local/source confirmation, not broad web research. |
| Minnesota | EXP103_Current.pdf is now in the Minnesota folder, completing the EXP101-EXP107 local family captured by the state-pack catalog. |
| Missouri | CR370 judgment/order is now in the Missouri folder, satisfying the previously high-priority missing order form for the 610.140 packet. |
| California | CR-180 and CR-181 blank PDFs plus the Judicial Council instruction PDF are now locally present in `LegalEase California/`; remaining work is source/title/revision confirmation because the older HTML captures live in the separate `LegalEase California ` folder. |
| Colorado | The JDF sealing/expungement PDF family is now locally present in `LegalEase Colorado/`; remaining work is route-by-route source/title/revision confirmation and currentness review. |
| North Carolina | AOC-CR-287, AOC-CR-297, and AOC-CR-298 PDFs and instruction PDFs are now locally present in `LegalEase North Carolina/`; remaining work is source/title/revision confirmation and deciding whether AOC-CR-288 is in scope. |
| Oklahoma | Local statute/reference material includes Petition to Expunge Records and Order to Expunge Records text and supports a custom pleading/statutory strategy for the current shadow-stage audit. The local files do not prove from an official source that no statewide blank form exists, so remaining work is official-source confirmation rather than true web research. |
| Wisconsin | CR-266/CR-267 PDFs and summaries are now locally present in `LegalEase Wisconsin/`; remaining work is source/title/revision confirmation and whether both forms are required for supported workflows. |
| Wyoming | Local handout/reference material supports a petition/proposed-order custom pleading strategy and warns that local templates may exist. The local files do not prove from an official source that no statewide blank form exists, so remaining work is official-source confirmation rather than true web research. |

## Remaining True `needs_web_research` States

None after this local-only rescan.

## Updated High-Priority Missing Forms

None. California, Colorado, North Carolina, and Wisconsin now have local blank PDF candidates for the previously high-priority gaps. Oklahoma and Wyoming are kept out of high-priority missing because local materials support a custom pleading/statutory strategy for the current shadow-stage audit, but that is not a final no-statewide-form determination.

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
| California | CR-180 / CR-181 | Petition for Dismissal and Order for Dismissal | Blank PDFs are now present locally, but the new PDF folder and older HTML/reference folder are separate; title, source URL, revision date, and hash metadata still need consolidation before catalog or mapping use. | medium | Inspect the local PDFs, match them to the California Courts captures, and record source/revision metadata. |
| Colorado | JDF family | Colorado sealing and expungement forms packet | The JDF PDFs are now present locally, but currentness and route scope must be confirmed across the Colorado Judicial Branch captures before catalog or mapping use. | medium | Map each local JDF PDF to supported routes and record source/revision metadata. |
| North Carolina | AOC-CR-287 / AOC-CR-297 / AOC-CR-298 | Expunction petition/order forms and instructions | The AOC PDFs are now present locally, but source titles/currentness and whether AOC-CR-288 is in scope remain confirmation items. | medium | Match local PDFs to North Carolina Judicial Branch form captures and record source/revision metadata. |
| Wisconsin | CR-266 / CR-267 | Wisconsin expungement forms and summaries | CR-266/CR-267 PDFs and summaries are now present locally, but currentness and packet completeness must be confirmed before field-map or catalog use. | medium | Confirm local PDFs against Wisconsin Court System form metadata and decide which forms are required for supported workflows. |
| Oklahoma |  | Statutory/custom pleading petition and order strategy | Local statute/reference material supports a custom pleading/statutory packet strategy, but the local files do not prove from an official source that no statewide blank form exists. | medium | Confirm against official Oklahoma statute/court sources before treating the strategy as final. |
| Wyoming |  | Custom pleading petition and proposed order strategy | Local handout/reference material supports petition/proposed-order drafting and possible local templates, but the local files do not prove from an official source that no statewide blank form exists. | medium | Confirm against official Wyoming Judicial Branch/court sources before treating the strategy as final. |

## State-by-State Table

| State | Folder | PDF/HTML/RTF/DOCX | Likely official PDFs | Classifications |
| --- | --- | --- | --- | --- |
| Alabama | LegalEase Alabama | 3/3/0/0 | 2 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Alaska | LegalEase Alaska | 2/2/0/0 | 1 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Arizona | LegalEase Arizona | 5/1/0/0 | 4 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| Arkansas | LegalEase Arkanasa | 4/2/0/0 | 3 | has_reference_doc, has_official_blank_pdfs, has_official_source_html |
| California | LegalEase California | 3/0/0/0 | 2 | has_official_blank_pdfs, downloaded_since_last_audit, needs_official_source_confirmation, needs_local_rescan |
| Colorado | LegalEase Colorado | 33/10/0/0 | 25 | has_reference_doc, has_official_blank_pdfs, has_official_source_html, downloaded_since_last_audit, needs_official_source_confirmation, needs_local_rescan |
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
| North Carolina | LegalEase North Carolina | 7/8/0/0 | 6 | has_reference_doc, has_official_blank_pdfs, has_official_source_html, downloaded_since_last_audit, needs_official_source_confirmation, needs_local_rescan |
| North Dakota | LegalEase North Dakota | 11/0/1/0 | 9 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Ohio | LegalEase Ohio | 5/0/1/0 | 5 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs |
| Oklahoma | LegalEase Oklahoma | 0/2/1/0 | 0 | has_reference_doc, has_wilma_reference, has_official_source_html, has_modeled_forms_only, custom_pleading_strategy_source_supported, needs_official_source_confirmation, complete_enough_for_current_shadow_stage, downloaded_since_last_audit, needs_local_rescan |
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
| Wisconsin | LegalEase Wisconsin | 7/0/1/0 | 6 | has_reference_doc, has_wilma_reference, has_official_blank_pdfs, downloaded_since_last_audit, needs_official_source_confirmation, needs_local_rescan |
| Wyoming | LegalEase Wyoming | 1/1/1/0 | 0 | has_reference_doc, has_wilma_reference, has_official_source_html, has_modeled_forms_only, custom_pleading_strategy_source_supported, needs_official_source_confirmation, complete_enough_for_current_shadow_stage, downloaded_since_last_audit, needs_local_rescan |
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
| 8 | California | CR-180 / CR-181 | Petition for Dismissal and Order for Dismissal | Inspect local PDFs, match them to the California Courts captures, and record source/revision metadata. |
| 9 | Colorado | JDF family | Colorado sealing and expungement forms packet | Map each local JDF PDF to supported routes and record source/revision metadata. |
| 10 | North Carolina | AOC-CR-287 / AOC-CR-297 / AOC-CR-298 | Expunction petition/order forms and instructions | Match local PDFs to North Carolina Judicial Branch form captures and record source/revision metadata. |

## Recommended Next 10 Web-Research Targets

None. The second missing-forms batch and local source evidence resolved the remaining true web-research bucket for this audit. Follow-up work is official-source confirmation, title/currentness normalization, local rescan/inspection artifacts, and visual review before any lifecycle or renderer work.

## Notes And Constraints

- This audit used local rescan only. It did not search the web or download anything.
- This audit does not download, edit, or normalize files in `private/`.
- This audit does not change state packs, field maps, lifecycle gates, renderers, routes, migrations, package metadata, billing/auth/admin/Stripe/RLS/Supabase, or deployment configuration.
- `needs_web_research` now means local files remain insufficient after the rescan and external official-source checking is actually needed. A Wilma/reference doc alone does not trigger `needs_web_research`.
- The 52-folder raw scan was caused by a duplicate `LegalEase California ` folder with a trailing space. The corrected audit counts 51 jurisdictions and excludes that duplicate from file totals.
- Oklahoma is classified as `custom_pleading_strategy_source_supported` and `needs_official_source_confirmation`, not `official_source_confirms_no_statewide_form`; the local statute/reference files support a custom pleading/statutory strategy but do not prove from an official source that no statewide blank form exists.
- Wyoming is classified as `custom_pleading_strategy_source_supported` and `needs_official_source_confirmation`, not `official_source_confirms_no_statewide_form`; the local handout/reference files support petition/proposed-order drafting but do not prove from an official source that no statewide blank form exists.
- Newly copied forms still need source URL, access date, revision date if available, blank PDF hash, source freshness review, filled-data visual review, and counsel confirmation before production use.
