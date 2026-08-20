# Gate B correction wave

## Release-input classification

| path | in worker image inputs | in application inputs |
| --- | :-: | :-: |
| `scripts/rcap-official-forms/rcap-field-semantics.mjs` | no | no |
| `scripts/rcap-official-forms/rcap-artifact-provenance.mjs` | no | no |
| `scripts/implement-rcap-official-forms-d1.mjs` | no | no |
| `scripts/verify-rcap-official-forms-d1.mjs` | no | no |
| `scripts/verify-rcap-shared-pdf-contract.mjs` | no | no |
| `scripts/verify-rcap-field-semantics-canaries.mjs` | no | no |

All correction paths are outside both sets. Proceed on this branch; no rebuild, no republication, and Gate A Preview and payment acceptance are untouched by construction.

The Dockerfile copies scripts/rcap-render-worker.mjs, scripts/lib/ and src/. Neither scripts/lib/ nor src/ contains any reference to scripts/rcap-official-forms/, so the corrected modules are not reachable from the image even transitively — they run at build time in this repository, not inside the worker.

## The eight escalations

| id | shared module | families | reviewer condition failed | status |
| --- | --- | ---: | --- | --- |
| ESC-GEOMETRY-NOT-AN-INPUT | `scripts/rcap-official-forms/rcap-field-semantics.mjs` | 12 | protection established by geometry where required, not label alone | open |
| ESC-MANUAL-NOT-NEVER-WRITE | `scripts/implement-rcap-official-forms-d1.mjs:151` | 4 | every discovered entry classified exactly once, and no participant value written to a protected area | corrected |
| ESC-NO-SSN-RULE | `scripts/rcap-official-forms/rcap-field-semantics.mjs` | 3 | court, clerk, judge, prosecutor, agency, signature, service, notarization and decision fields protected | corrected |
| ESC-NO-REFUSE-WHEN | `scripts/rcap-official-forms/rcap-field-semantics.mjs` | 9 | participant-writable entries correct | corrected |
| ESC-SERVICE-BLOCK-BY-NAME | `scripts/rcap-official-forms/rcap-field-semantics.mjs` | 3 | service fields protected | corrected |
| ESC-CAPTION-VARIANTS | `scripts/implement-rcap-official-forms-d1.mjs and the shared content-stream geometry module` | 5 | no clipping, no silent truncation, no duplicated preprinted caption | open |
| ESC-VALUE-NOT-VISIBLE | `scripts/rcap-official-forms/rcap-field-semantics.mjs` | 1 | expected participant values visibly present | open |
| ESC-SIDECAR-NONCONFORMANT | `scripts/rcap-official-forms/rcap-artifact-provenance.mjs` | 26 | artifact provenance complete and hash-matched | open |

### ESC-GEOMETRY-NOT-AN-INPUT

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs, scripts/implement-rcap-official-forms-d1.mjs

**Defect** — decideBinding() receives { name, pdfType, effectiveLabel } and effectiveLabel is undefined for every field of every family, so `subject = effectiveLabel ?? name` resolves to the internal AcroForm field name. Widget rects are captured into field-census.json and never passed. Geometry is not an input to protection.

**Smallest shared correction** — The widget rect and the printed caption above it are inputs to decideBinding, and a binding whose rect falls inside a court-owned page region is refused whatever the field is called.

**Family-owned follow-up** — re-derive each field map and re-render; the maps are generated, so no family file is hand-edited

**Mutation that must turn red** — Rename a protected field to an innocuous name and re-derive: the binder must still refuse it on geometry.

**Families** — AK:tf-800-form-en, AK:tf-805-form-en, KY:aoc-334-form-en, KY:aoc-496-3-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-298-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en, NE:dc-1-15-form-en

### ESC-MANUAL-NOT-NEVER-WRITE

**Module** — scripts/implement-rcap-official-forms-d1.mjs:151, scripts/verify-rcap-official-forms-d1.mjs:206

**Defect** — NEVER_WRITE is { prohibited, protected, signature, court_or_agency, outside_party }. `manual` is absent from both sets, so a field the classifier declined to classify can still be bound and written, and the verifier carries the identical omission so it cannot catch what the binder allowed.

**Smallest shared correction** — `manual` is in NEVER_WRITE in both the binder and the verifier.

**Family-owned follow-up** — re-render; any binding onto a `manual` field disappears on its own

**Mutation that must turn red** — Classify a field `manual` and bind it: the binder must refuse, and the verifier must fail if it did not.

**Corrected by** — `manual` added to NEVER_WRITE in the binder and to NEVER_WRITE_CLASSES in the verifier, kept identical

**Families** — KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-form-en, NC:aoc-cr-288-form-en

### ESC-NO-SSN-RULE

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Defect** — PROTECT_RULES carries no SSN pattern, so a Defendant's SSN box is an ordinary writable field and takes the participant's full legal name.

**Smallest shared correction** — \bssn\b|social\s*security is a protect rule.

**Family-owned follow-up** — re-render KY aoc-334, aoc-496, aoc-496-2 and confirm the SSN and Jail ID boxes are empty in the bytes

**Mutation that must turn red** — Offer full_legal_name to a field named `Def.VitalStats.SSN`: it must be refused.

**Corrected by** — a government_identifier protect rule covering SSN, SID, FBI number, jail and booking identifiers, DOC number and driver's licence

**Families** — KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-form-en

### ESC-NO-REFUSE-WHEN

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Defect** — Descriptor matchers are positive-only. street_address matches a City box and a bank-name box; full_legal_name matches an attorney-name line and a street line. The first pattern that hits wins, so the address prints twice and the petitioner is named as their own attorney.

**Smallest shared correction** — Descriptors carry refuseWhen guards: street_address declines city/state/zip subjects, full_legal_name declines street and bank subjects.

**Family-owned follow-up** — re-render the eight affected families; the duplicated address lines and the bank-name fills clear with the binding

**Mutation that must turn red** — Offer street_address to a field named `Def.Address.City`: it must be refused rather than matched.

**Corrected by** — refuseWhen guards on street_address and full_legal_name, and the attorney rule extended to `atty` and `vsb`

**Families** — KY:aoc-496-2-form-en, KY:aoc-497-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-297-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en

### ESC-SERVICE-BLOCK-BY-NAME

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Defect** — The service_block protect rule matches /certificate\s*of\s*service/ against the field NAME, while deterministic.filing_date matches /cert\s*date/. A field called certDate under a printed 'Certificate of Service' heading is therefore filled by the platform, producing a half-completed sworn certification of service dated by a system that does not know when service occurred.

**Smallest shared correction** — service_block fires from the block's printed heading, or cert-date is removed from the filing_date matcher.

**Family-owned follow-up** — re-render AK tf-800 and tf-805 and confirm the certification line is blank

**Mutation that must turn red** — Offer filing_date to `certDate` under a service heading: it must be refused.

**Corrected by** — `cert date`, `cert time` and `certify on` added to the service_block rule

**Families** — AK:tf-800-form-en, AK:tf-805-form-en, NC:aoc-cr-298-form-en

### ESC-CAPTION-VARIANTS

**Module** — scripts/implement-rcap-official-forms-d1.mjs and the shared content-stream geometry module

**Defect** — Every widget in a multi-purpose caption band is bound. After flattening, variants that JavaScript used to show and hide all render at once, overlapping, covering the court's own printed words, and unfilled dropdowns keep their prompt text ('Choose the court') as ink on a filed pleading.

**Smallest shared correction** — Exactly one field per caption slot is bound and the rest refused; an unfilled dropdown's prompt is suppressed at flatten.

**Family-owned follow-up** — re-render the five Nebraska families and read the caption band in the raster

**Mutation that must turn red** — Flatten a form with an unselected dropdown: the prompt string must not appear in the page content stream.

**Families** — NE:cc-6-11-2-form-en, NE:cc-6-11-form-en, NE:cc-6-12-form-en, NE:cc-6-15-1-form-en, NE:dc-1-15-form-en

### ESC-VALUE-NOT-VISIBLE

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Defect** — VT 600-00228 names its fields as bare digits. With only the name channel available every descriptor refuses no_allowlisted_fact_matches, and the finished fee-waiver application carries none of the applicant's information.

**Smallest shared correction** — The printed label is captured into effectiveLabel and matched.

**Family-owned follow-up** — re-render VT 600-00228 and confirm the applicant fields carry values

**Mutation that must turn red** — Offer full_legal_name to a field named `2` sitting under a printed 'Name' caption: it must bind, not refuse.

**Families** — VT:600-00228-support-en

### ESC-SIDECAR-NONCONFORMANT

**Module** — scripts/rcap-official-forms/rcap-artifact-provenance.mjs, scripts/verify-rcap-shared-pdf-contract.mjs

**Defect** — 0 of 27 committed sidecars carry the 20 fields the shared contract requires; 12 fields are null in a typical one. The contract's verifier proves its P-block against a sidecar it synthesises from a canary and never opens a committed one, so nothing had compared them.

**Smallest shared correction** — The provenance module emits all 20 fields, and the contract verifier reads a committed sidecar.

**Family-owned follow-up** — re-render every family; the sidecar is emitted by the shared module, not written per family

**Mutation that must turn red** — Null one field in a committed sidecar: the contract verifier must go red.

**Families** — AK:tf-800-form-en, AK:tf-805-form-en, AK:tf-810-form-en, KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-3-form-en, KY:aoc-496-4-form-en, KY:aoc-496-form-en, KY:aoc-497-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-297-form-en, NC:aoc-cr-298-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en, WI:cr-266-form-en, NE:cc-6-11-2-form-en, NE:cc-6-11-form-en, NE:cc-6-12-form-en, NE:cc-6-15-1-form-en, NE:dc-1-15-form-en, VT:200-00132-form-en, VT:200-00132a-form-en, VT:600-00228-support-en

## The twelve the manifest still names

Eleven are captured .html pages and one is a PDF. That is the mirror image of the eighteen that retired, which were almost all official PDFs — and it is why the retirement had to be derived per asset rather than applied to the batch.

| jurisdiction | asset | surviving manifest reference | remediation |
| --- | --- | --- | --- |
| AK | ak-record-relief-forms.html | `LegalEase Alaska/ak-record-relief-forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| AK | RequestToSealCrimInfo.pdf | `LegalEase Alaska/RequestToSealCrimInfo.pdf` | ordinary remediation path |
| AL | al-expungement-petition.html | `LegalEase Alabama/al-expungement-petition.html` | bind to the official form it links to, or remove the page from the operational tree |
| AL | criminal-forms.html | `LegalEase Alabama/criminal-forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| AL | criminal-record-expungement.html | `LegalEase Alabama/criminal-record-expungement.html` | bind to the official form it links to, or remove the page from the operational tree |
| AR | Arkansas-Petition-Order-Forms.html | `LegalEase Arkanasa/Arkansas-Petition-Order-Forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| KY | Kentucky-Expungement-Forms.html | `LegalEase Kentucky/files-4/Kentucky-Expungement-Forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| NC | expungements.html | `LegalEase Utah/expungements.html` | bind to the official form it links to, or remove the page from the operational tree |
| NC | forms.html | `LegalEase North Carolina/forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| NC | nc-expunction-petition.html | `LegalEase North Carolina/nc-expunction-petition.html` | bind to the official form it links to, or remove the page from the operational tree |
| VA | va-expungement-sealing-forms.html | `LegalEase Virginia /va-expungement-sealing-forms.html` | bind to the official form it links to, or remove the page from the operational tree |
| VT | application-waive-filing-fees-and-service-costs.html | `LegalEase Vermont/application-waive-filing-fees-and-service-costs.html` | bind to the official form it links to, or remove the page from the operational tree |
