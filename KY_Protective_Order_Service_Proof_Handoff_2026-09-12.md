# Kentucky protective-order expungement: service-proof source and proposed companion

Research date: 2026-09-12
Family: `ky_protective_order_record_expungement-set`
Route: `obligation:track-only:KY:ky_protective_order_record_expungement`
Repository snapshot: `1ee151721eceb46d50428cb489a9d1440f9c2114`
Status: **SOURCE-BACKED RECOMMENDATION / NEW DRAFT, NOT OWNER-ADOPTED**

This is not a recovered AOC form, adopted owner amendment, counsel opinion, completed service record, verifier PASS, or permission for terminal promotion. No repository or packet changes were made in preparing it.

## What was established

1. The checked `data/record-clearing/legal-design-intake/KY.memo.json`, in the protective-order track's required `service_instructions` component, expressly promises instructions and a certificate. Its service rule allows movant mailing or clerk service when the movant has not served. That existing coverage must not silently disappear.
2. The currently published AOC-275.18, Rev. 1-16, is one page. Its lower block schedules an expungement hearing and carries clerk/deputy-clerk signature fields. The footer lists copies for the court file, petitioner, and respondent. It does not itself certify when, how, or to whom service actually occurred.
3. No adopted protective-order certificate-equivalence amendment was located in the checked legal-resolution mechanism or targeted prior-file searches. The existing KY-AOC-496-2-COMPANION-CHARGES decision concerns misdemeanor expungement, not this route.
4. Kentucky CR 5.03 supplies a source for actual proof of service: a bar member's certificate, the server's affidavit, or other proof satisfactory to the court. It requires the time and manner of service and identifies the persons served. It does not designate a blank distribution list as proof.
5. CR 5.01 addresses service of written motions and notices; CR 5.02 addresses the recipient and method, including service on counsel for represented parties unless the court orders otherwise. Do not copy a criminal-route certificate naming a prosecutor into this civil protective-order case.

The current Clerks' Manual PDF link returned HTTP 403 in this research. Its movant/clerk workflow is reported above from the checked KY memo, not represented as newly verified manual text.

## Proposed implementation treatment

Preserve both notice/service guidance and a separate proof-of-service capability. Do not equate AOC-275.18's hearing block or copies list with that capability.

For an actual nonlawyer server, the expressly supported CR 5.03 route is a sworn affidavit. For an attorney server, use the appropriate attorney certificate. Other proof is acceptable only as the court permits; do not assume a generic unsigned statement or printed distribution list qualifies.

Generate the companion as an original LegalEase-prepared document, not as an official AOC instrument. Keep the existing AOC-275.18 source unchanged. This recommendation supplies a proposed way to fulfill the existing service-proof promise; it does not declare a new filing component already adopted or accepted.

Collect the exact document served, actual date and method, named recipients, service destinations where lawfully available, and actual server. For mailed hearing notice, identify the version containing the clerk-assigned hearing details. Do not assert that an undated/unscheduled form was the completed notice. A future intended mailing is not completed service. Leave execution, oath, and jurat blank until the relevant acts occur.

Where the clerk serves, do not have the participant swear to an act the clerk performed. Obtain or identify the clerk's actual service record or other proof accepted by the court. Preserve the service requirement while distinguishing it from the obligation to supply an unexecuted companion for the movant-service branch. The court's acceptance of a particular clerk record must not be inferred from the blank hearing block.

Do not expose protected addresses, guess service recipients, assume that sending the court-file copy serves another party, or instruct contact contrary to an existing order. Unresolved recipient/address restrictions require clerk or legal confirmation of the service channel.

## Draft companion for the nonlawyer-server branch

**Draft for legal-owner review and implementation. Not a court-issued form. Complete only with actual service facts.**

```text
COMMONWEALTH OF KENTUCKY
____________________________ COURT
____________________________ COUNTY / DIVISION
CASE NO. ___________________

________________________________________, PETITIONER
v.
________________________________________, RESPONDENT

PROOF OF SERVICE — AFFIDAVIT OF PERSON WHO SERVED PAPERS
Kentucky CR 5.03

I, ________________________________________, being first duly sworn, state:

1. I personally served a true copy of the following document(s):
   ________________________________________________________________
   ________________________________________________________________
   [Identify the motion and any completed hearing notice actually served.]

2. Service occurred on ____________________, at ____________________.
   I served the document(s) by _____________________________________
   ________________________________________________________________.
   [Describe the actual permitted method. For first-class mail, state
   that the properly addressed, postage-prepaid copy was deposited
   in the United States mail, and where.]

3. I served the following person(s), in the indicated capacity:

   Recipient name: ________________________________________________
   Capacity / represented party, if applicable: ____________________
   Service destination actually used: _____________________________
   ________________________________________________________________

   [Repeat for each recipient; preserve applicable address confidentiality.]

4. These statements describe service I actually performed.

________________________________________
Signature of person who served the papers

________________________________________
Printed name

STATE OF ____________________
COUNTY OF ___________________

Subscribed and sworn to before me by ______________________________
on __________________________.

________________________________________
Notary or other officer authorized to administer the oath

Title / commission information, as applicable: _____________________
```

This draft does not decide the applicable recipients, permitted service method, deadline, local formatting, or confidentiality treatment for a particular case. Those must match the governing procedure and case instructions. Do not pre-execute it, use it to certify clerk service, or substitute it for the official motion.

## Focused acceptance requirements

- Keep the official motion and the separate service-proof capability distinct.
- Reject a candidate that counts only a copies list as a completed certificate.
- Exercise the actual movant-service and clerk-service pathways without fictional attestations.
- Check completeness of document identity, actual date/method, recipients, and server; keep unsigned/unperformed steps honestly pending.
- Preserve clerk-controlled scheduling and signature fields and confidential information.
- Have the authorized legal owner decide any explicit amendment to the memorandum's component wording. Record issuer, scope, and real approval date; do not label this draft adopted.
- Reverify affected packet content independently. Changed PDF bytes require new applicable raster evidence. This document grants no acceptance or terminal transition.

## Sources

S1. Checked KY governing memorandum:
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/1ee151721eceb46d50428cb489a9d1440f9c2114/data/record-clearing/legal-design-intake/KY.memo.json
Relevant location: `tracks[trackId=ky_protective_order_record_expungement]`, `components[role=service_instructions]`, `manualCompletionItems`, and `rules.service`.

S2. AOC-275.18, Rev. 1-16, official one-page PDF, inspected as text and rendered page:
https://www.kycourts.gov/Legal-Forms/Legal%20Forms/275.18.pdf

S3. Kentucky CR 5.03, Service; proof of, court-linked Westlaw rules publication; displayed currentness through July 1, 2026:
https://govt.westlaw.com/kyrules/Document/N5CA09590A91B11DA8F5EE32367A250AE?contextData=%28sc.Default%29&originationContext=documenttoc&transitionType=CategoryPageItem&viewType=FullText
The indexed rule text was accessible; a subsequent direct page open returned an error. This handoff does not claim a downloaded/hash-pinned copy of the rules page.

S4. Kentucky CR 5.01, Service; when required:
https://govt.westlaw.com/kyrules/Document/N5B5CA3E0A91B11DA8F5EE32367A250AE?contextData=%28sc.Default%29&originationContext=documenttoc&transitionType=CategoryPageItem&viewType=FullText

S5. Kentucky CR 5.02, Service; how made:
https://govt.westlaw.com/kyrules/Document/N5BF2F070A91B11DA8F5EE32367A250AE?contextData=%28sc.Default%29&originationContext=documenttoc&transitionType=CategoryPageItem&viewType=FullText

S6. Existing Kentucky decision, different family:
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/1ee151721eceb46d50428cb489a9d1440f9c2114/data/rcap-grade-a/legal-decisions/KY_COMPANION_CHARGES_RESOLUTION_2026-09-11.json

S7. Current checked legal-resolution loader:
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/1ee151721eceb46d50428cb489a9d1440f9c2114/scripts/grade-a-packet-factory-24h/legal-block-resolution.mjs
