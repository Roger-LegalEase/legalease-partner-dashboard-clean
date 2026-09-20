# C1 split automatic correction/status lane handoff

Scope/noncommercial boundary: this lane preserves each automatic or agency-controlled stage as permanently noncommercial Category B process guidance and records only the identity of a separate participant-filed Category A branch. It does not build, approve, publish, or commercially open a packet or route.

Summary: 9 routes assessed; 8 branch identities completed; 1 route stopped unresolved; 0 `REUSE_AS_IS` crosswalks. The completed routes are CA, MD, MN, MN, MT, VT, DE, and IL. NY is stopped.

Packet families are **NAMED, not created**:

- `rcap-ca-official-pdf-fill`
- `rcap-de-participant-agency-application`
- `rcap-il-participant-agency-application`
- `rcap-md-participant-agency-application`
- `rcap-mn-participant-agency-application`
- `rcap-mt-participant-agency-application`
- `rcap-ny-official-pdf-fill`
- `rcap-vt-participant-agency-application`

The generic `participant_agency_application` identities below name written requests, applications, demands, or challenges supported by the lane record. They are not guessed official forms or invented form numbers.

## `obligation:track-only:CA:ca-auto-conviction`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** DOJ identifies electronic records and adds § 1203.425 relief notations without a participant petition.
- **What the C1 branch files:** **BCIA 8706 Claim of Alleged Inaccuracy or Incompleteness after DOJ record review only**. Dismissal, reduction, sealing, and other superior-court remedies require a separate route and are not part of this identity.
- **Destination:** California DOJ Record Review Unit.
- **Trigger:** After DOJ record review, the § 1203.425 notation is missing or the record is inaccurate or incomplete.
- **Deadline:** No special limitations period is stated for BCIA 8706.
- **Output identity/family:** `obligation:track-only:CA:ca-auto-conviction::participant-branch`; `official_pdf_fill`; `rcap-ca-official-pdf-fill`; named instrument `BCIA 8706`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no packet was created or approved.

## `obligation:track-only:MD:md_10103_1_automatic`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** For post-October 1, 2007 incidents, the law-enforcement unit must purge within 60 days without a filing.
- **What the C1 branch files:** Written police-record expungement request for pre-October 1, 2007 incidents under § 10-103; written compliance/correction request for a missed § 10-103.1 purge. These are named written requests, not guessed forms.
- **Destination:** The law-enforcement unit that made the arrest or confinement; related correction may be directed to the Central Repository.
- **Trigger:** The person was released without charge and the agency did not purge within 60 days, or the incident predates October 1, 2007.
- **Deadline:** Automatic purge is due within 60 days for post-October 1, 2007 incidents. The § 10-103 request for an older incident must generally be submitted within eight years, subject to statutory exceptions.
- **Output identity/family:** `obligation:track-only:MD:md_10103_1_automatic::participant-branch`; `participant_agency_application`; `rcap-md-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-only:MN:mn_ceb_felony_cannabis`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** The Board conducts baseline review of eligible felony cannabis records without an application.
- **What the C1 branch files:** Cannabis Expungement Board Case Review Request. A district-court petition under Chapter 609A is a separate judicial route and is not part of this identity; no form number is inferred.
- **Destination:** Cannabis Expungement Board.
- **Trigger:** The Board has not reviewed the case, or the participant believes the record or eligibility data used for Board review is wrong.
- **Deadline:** No fixed deadline is stated for a Case Review Request.
- **Output identity/family:** `obligation:track-only:MN:mn_ceb_felony_cannabis::participant-branch`; `participant_agency_application`; `rcap-mn-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-only:MN:mn_mistaken_identity_iddata`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** The agency must destroy or return data once mistaken identity is established.
- **What the C1 branch files:** Written demand under § 299C.11 for return or destruction of identification data; BCA criminal-history challenge. Any Chapter 609A court petition is a separate judicial route and is not part of this identity; no form number is inferred.
- **Destination:** The holding law-enforcement agency and BCA.
- **Trigger:** The person was booked under another identity, was not the person charged, or remains linked to the wrong record.
- **Deadline:** No short limitations period for the demand or BCA challenge; submit promptly after discovery.
- **Output identity/family:** `obligation:track-only:MN:mn_mistaken_identity_iddata::participant-branch`; `participant_agency_application`; `rcap-mn-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-only:MT:mt_auto_nonconviction`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** The repository and originating agencies remove or restrict designated nonconviction data under the statutory rules.
- **What the C1 branch files:** Written request to inspect and challenge criminal-history record information; request to the originating agency and Montana DOJ to correct, remove, or restrict a nonconviction record. These are named written requests/challenges, not guessed forms.
- **Destination:** The criminal-justice agency that originated the information and the Montana Department of Justice criminal-history repository.
- **Trigger:** A qualifying nonconviction record remains publicly disseminated, is inaccurate, or was not removed/restricted when required.
- **Deadline:** No short limitations period for the record challenge; submit after the qualifying disposition or discovery.
- **Output identity/family:** `obligation:track-only:MT:mt_auto_nonconviction::participant-branch`; `participant_agency_application`; `rcap-mt-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-only:NY:ny_clean_slate_dwai`

- **Status:** `STOPPED_UNRESOLVED` — the split is required, but no Category A branch identity was created.
- **Retained automatic stage:** Eligible DWAI violations are to be sealed automatically after the statutory period, subject to the statewide implementation window.
- **What the C1 branch files:** Nothing. The contemplated branch is a Clean Slate manual-review request under CPL 160.57(e) once the Unified Court System publishes the form/process, or a DCJS Record Review challenge for inaccurate criminal-history data. No UCS manual-review form/process can be identified from the committed record, and CPL 160.57 is a statute, not a form ID; therefore no identity, packet, or PDF was created.
- **Destination:** The court of disposition/UCS Clean Slate review process; DCJS Record Review Unit for repository inaccuracies.
- **Trigger:** An eligible VTL § 1192(1) violation is not sealed after the three-year clock and statewide implementation, or the criminal-history data is inaccurate.
- **Deadline:** Clean Slate took effect November 16, 2024, and statewide implementation may continue through November 16, 2027. The UCS manual-review form is not yet identifiable from committed evidence and must not be used until published; DCJS correction has no short limitations period.
- **Output identity/family:** Proposed route `obligation:track-only:NY:ny_clean_slate_dwai::participant-branch`; unresolved intended strategy `official_pdf_fill`; intended family `rcap-ny-official-pdf-fill`, named only; `no_branch_identity_created`.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The participant branch is blocked unresolved and commercially closed; no identity, packet, PDF, or approval exists.

## `obligation:track-only:VT:vt_diversion_pre_charge`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** Custodians delete qualifying pre-charge diversion records after completion without a petition.
- **What the C1 branch files:** Written request to the diversion program, State’s Attorney, law-enforcement agency, or Vermont Crime Information Center to correct or delete a pre-charge diversion record. Any Chapter 230 court petition is a separate judicial route and is not part of this identity; no form number is inferred.
- **Destination:** Diversion program, State’s Attorney, arresting agency, and VCIC.
- **Trigger:** Successful pre-charge diversion should have produced deletion but arrest/referral information remains or is inaccurate.
- **Deadline:** Deletion follows the statutory completion event; correction may be requested when noncompliance is discovered.
- **Output identity/family:** `obligation:track-only:VT:vt_diversion_pre_charge::participant-branch`; `participant_agency_application`; `rcap-vt-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** SBI identifies and expunges mandatory-eligible cases through a monthly automated process.
- **What the C1 branch files:** Mandatory-expungement application to the State Bureau of Identification under § 4373. A discretionary-expungement petition under § 4374 is a separate judicial route and is not part of this identity; no form number is inferred.
- **Destination:** State Bureau of Identification.
- **Trigger:** Automatic expungement has not occurred for a mandatory-eligible record.
- **Deadline:** SBI’s monthly automatic process began August 1, 2024. The individual may apply after the applicable statutory eligibility period whenever automation has not occurred.
- **Output identity/family:** `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a::participant-branch`; `participant_agency_application`; `rcap-de-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## `obligation:track-pathway:IL:il-cannabis-auto:cannabis-specific-automatic-or-petition-expungement`

- **Status:** `COMPLETED` — `SPLIT_B_STAGE_AND_A_BRANCH`.
- **Retained automatic stage:** ISP and law-enforcement agencies automatically expunge qualifying minor-cannabis arrest/nonconviction records.
- **What the C1 branch files:** ISP Access and Review challenge. The statewide circuit-court expungement/sealing request is a separate judicial route and is not part of this identity; no form number is inferred.
- **Destination:** ISP and the originating law-enforcement agency.
- **Trigger:** A qualifying cannabis record was not automatically cleared, or the criminal-history record is inaccurate.
- **Deadline:** No general outside deadline is stated for an ISP Access and Review challenge; submit after discovering the uncleared or inaccurate record.
- **Output identity/family:** `obligation:track-pathway:IL:il-cannabis-auto:cannabis-specific-automatic-or-petition-expungement::participant-branch`; `participant_agency_application`; `rcap-il-participant-agency-application`; identity only.
- **Scope boundary:** The retained stage remains excluded from participant filing and permanently noncommercial. The branch remains commercially closed pending Grade A fulfillment; no form, packet, or approval is claimed.

## Evidence sources and release boundary

- Base commit: `227f095d5d1493feca56779cf60c6f177caebd61`.
- Branch identities: `data/rcap-grade-a/category-b-integration/c1-split-automatic-correction-status/branch-identities.json`.
- Revalidation results: `data/rcap-grade-a/launch-control/category-b-revalidation/results.json`.
- Integration delta: `data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`.
- Reuse result: 9 `NO_EXISTING_WORK`; 0 `REUSE_AS_IS`; `crosswalks` is empty.
- Commercial routes opened: **0**. Production touched: **NO**. No packet was built or approved.
