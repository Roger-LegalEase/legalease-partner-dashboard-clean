# Expungement.ai / RCAP — Petition / Application-Route Inventory

> **Audit / report only. No runtime behavior changed by this script.** No route moved between control sets.
> Head commit `d42c0155403ab8cdf7520de7d19292aa0b1f33a7`. Ground truth = the live evaluator payment gate. No payment inferred from legal possibility.

## Headline totals

| Metric | Value |
| --- | --- |
| Total pathways classified | 324 (compiled 324) |
| Jurisdictions | 51 |
| **paid_now** routes | **71** |
| paid_now jurisdictions | 27 |
| Buildable paid-capable routes | 195 |
| Zero-paid jurisdictions with a buildable route | 24 |
| legal_action_required routes | 2 |
| Legal Action Required items | 197 |

## Bucket counts (12-bucket taxonomy)

| Bucket | Count |
| --- | --- |
| paid_now | 71 |
| paid_after_legal_reconfirmation | 34 |
| paid_after_route_metadata_fix | 68 |
| paid_after_gate_build | 42 |
| paid_after_intake_fix | 18 |
| paid_after_wait_anchor_fix | 33 |
| paid_after_packet_form_work | 0 |
| gate_built_wait_pending | 0 |
| permanent_guidance_not_a_paid_product | 53 |
| not_currently_operational | 2 |
| discard_or_duplicate | 1 |
| legal_action_required | 2 |

## Summary 1 — all paid_now routes

`AR:situation-a-non-convictions`, `AR:situation-b-misdemeanor-convictions`, `AR:situation-c-felony-convictions`, `CA:prop-64-completed-sentence-application-11361-8`, `CA:prop-64-currently-serving-petition-11361-8`, `CA:tool-1-dismissal-set-aside`, `CA:tool-3-petition-based-felony-sealing`, `CA:tool-4-arrest-record-sealing`, `CO:petition-based-non-conviction-sealing-jdf-417-24-72-704`, `CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202`, `DC:dc_actual_innocence_expungement_16_803`, `DC:dc_motion_seal_felony_conviction_8yr_16_806`, `DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806`, `DC:dc_motion_seal_nonconviction_16_806`, `GA:sb-288-misdemeanor-conviction-restriction-and-sealing`, `HI:dui-under-21-conviction`, `HI:first-time-drug-conviction`, `HI:nonconviction-arrest-expungement`, `IA:nonconviction-901c2`, `ID:withheld-judgment-idaho-code-19-2604-review-branch`, `IL:adult-conviction-sealing`, `IL:adult-non-conviction-expungement`, `IL:cannabis-specific-automatic-or-petition-expungement`, `IL:criminal-identity-theft-mistaken-identity-relief`, `IL:expungement-after-eligible-supervision-or-qualified-probation`, `IL:felony-prostitution-relief`, `IL:juvenile-automatic-or-petition-expungement`, `KS:specialty-court-accelerated`, `KY:misdemeanor-violation-traffic-conviction`, `LA:felony-article-893-e-set-aside-followed-by-expungement`, `LA:felony-ten-year-clean-period-expungement`, `LA:first-offense-marijuana-expungement-after-90-days-art-998`, `LA:misdemeanor-article-894-b-set-aside-followed-by-expungement`, `LA:misdemeanor-five-year-clean-period-expungement`, `LA:non-conviction-arrest-expungement`, `MD:adult-non-conviction-expungement-under-crim-proc-10-105`, `ME:adult-conviction-sealing`, `MN:petition-based-expungement-under-609a-02-03`, `MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130`, `MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140`, `MO:stolen-or-mistaken-identity-expungement-under-610-145`, `MS:additional-justice-or-municipal-court-misdemeanor-relief`, `MS:dui-nonadjudication`, `MS:eligible-felony-conviction-expungement-99-19-71`, `MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1`, `MS:first-offense-controlled-substance-conditional-discharge-relief`, `MS:first-offense-dui-expungement`, `MS:human-trafficking-survivor-vacatur-and-expungement`, `MS:intervention-court-completion-expungement`, `MS:minor-in-possession-underage-alcohol-expungement`, `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`, `MS:nonadjudication-under-99-15-26`, `MS:pretrial-intervention-or-diversion-expungement`, `MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59`, `MT:deferred-sentence-dismissal-or-confidentiality-route`, `MT:marijuana-related-redesignation-expungement-under-mmrta`, `MT:misdemeanor-conviction-expungement-under-mont-code-46-18-1104`, `ND:first-offense-possession-sealing`, `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`, `ND:marijuana-specific-summary-pardon-or-sealing-relief`, `NE:set-aside-incarceration-one-year-or-less`, `NE:set-aside-probation-fine-community-service`, `NJ:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6`, `NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1`, `NM:cannabis-sentence-dismissal-incarcerated-person-pathway`, `NM:no-conviction-released-without-conviction`, `NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59`, `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`, `VA:petition-based-sealing`, `VA:regime-1-expungement-available-now`, `WI:adult-conviction-expungement-under-wis-stat-973-015`

## Summary 2 — all paid jurisdictions now

AR Arkansas, CA California, CO Colorado, CT Connecticut, DC District of Columbia, GA Georgia, HI Hawaii, IA Iowa, ID Idaho, IL Illinois, KS Kansas, KY Kentucky, LA Louisiana, MD Maryland, ME Maine, MN Minnesota, MO Missouri, MS Mississippi, MT Montana, ND North Dakota, NE Nebraska, NJ New Jersey, NM New Mexico, NY New York, OR Oregon, VA Virginia, WI Wisconsin

## Summary 3 — zero-paid jurisdictions with a buildable paid route

AK Alaska, AL Alabama, AZ Arizona, DE Delaware, FL Florida, IN Indiana, MA Massachusetts, MI Michigan, NC North Carolina, NH New Hampshire, NV Nevada, OH Ohio, OK Oklahoma, PA Pennsylvania, RI Rhode Island, SC South Carolina, SD South Dakota, TN Tennessee, TX Texas, UT Utah, VT Vermont, WA Washington, WV West Virginia, WY Wyoming

## Summary 4 — routes needing only legal reconfirmation

`FL:court-ordered-expunction-943-0585`, `GA:youthful-first-offender-restriction-route`, `IN:conviction-expungement-with-records-marked-expunged`, `IN:conviction-expungement-with-sealed-confidential-access`, `IN:juvenile-allegation-expungement`, `IN:non-conviction-arrest-or-criminal-charge-expungement`, `KY:nonconviction-431076`, `LA:expungement-by-redaction-for-multi-person-records`, `LA:interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction`, `MA:adult-conviction-sealing-under-m-g-l-c-276-100a`, `MA:court-requested-sealing-for-dismissal-or-nolle-prosequi-100c`, `MA:juvenile-record-sealing-under-100b`, `MA:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k`, `MA:time-based-expungement-under-100f-100j`, `MD:juvenile-expungement`, `ME:adult-non-conviction-record-relief`, `MO:closed-record-outcome-under-rsmo-610-105`, `MO:false-information-or-qualifying-arrest-record-expungement-under-610-122-123`, `MO:first-minor-in-possession-alcohol-expungement-under-311-326`, `MO:marijuana-expungement-under-missouri-constitution-article-xiv`, `ND:deferred-imposition-dismissal-and-sealing`, `ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05`, `NE:law-enforcement-error-expungement`, `NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3`, `NM:dna-sample-profile-expungement`, `NY:conditional-treatment-sealing-under-cpl-160-58`, `OR:marijuana-specific-set-aside-redesignation`, `PA:path-a-non-conviction-expungement`, `PA:path-b-complete-acquittal-not-guilty-expungement`, `SD:diversion-expungement`, `SD:juvenile-delinquency-sealing`, `TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106`, `TN:pathway-2-diversion-expunction-under-40-15-105-40-35-313`, `WI:juvenile-adjudication-expungement-under-wis-stat-938-355-4m`

## Summary 5 — routes needing only route metadata fix

`AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180`, `AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085`, `AL:eligible-conviction-expungement-under-the-redeemer-act`, `AL:human-trafficking-victim-expungement`, `AL:non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a`, `AL:pardoned-felony-expungement-under-ala-code-15-27-2-c`, `AZ:remedy-1-record-sealing`, `AZ:remedy-2-set-aside-of-a-conviction`, `AZ:remedy-3-marijuana-expungement`, `DE:discretionary-court-expungement-under-11-del-c-4374`, `DE:juvenile-expungement-under-10-del-c-1017-1019-1017a`, `FL:administrative-expunction-mistaken-or-unlawful-arrest`, `FL:early-juvenile-expunction-943-0515`, `FL:juvenile-diversion-expunction-943-0582`, `GA:non-conviction-record-restriction-through-the-agency-prosecutor-process`, `ID:clean-slate-shielding-under-idaho-code-67-3004-11`, `ID:non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10`, `LA:immediate-expungement-after-successful-court-program-completion-art-985-3`, `MA:marijuana-only-expungement`, `ME:juvenile-sealing`, `MI:misdemeanor-marijuana-set-aside-under-mcl-780-621e`, `MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06`, `MN:prosecutor-agreed-sealing-without-a-full-petition-under-609a-025`, `NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146`, `NC:youthful-pre-raise-the-age-expunction-under-g-s-15a-145-8a-and-related-statutes`, `NE:juvenile-petition-backstop`, `NH:annulment-after-dismissal-acquittal-or-nonprosecution`, `NH:dwi-dui-annulment`, `NV:controlled-substance-possession-sealing-under-nrs-453-3365`, `NV:reentry-program-sealing-under-nrs-179-259`, `OH:adult-non-conviction-sealing-or-expungement-under-2953-33`, `OH:juvenile-sealing-and-expungement`, `OK:acquittal-dismissal-or-other-no-conviction-expungement`, `OK:arrest-with-no-charges-filed`, `OK:conviction-reversed-and-case-dismissed`, `OK:deferred-sentence-court-record-expungement-under-991-c`, `OK:dna-factual-innocence-expungement`, `OK:felony-reclassified-as-a-misdemeanor`, `OK:fine-only-misdemeanor-conviction-expungement`, `OK:misdemeanor-deferred-dismissal-expungement`, `OK:nonviolent-felony-deferred-dismissal-expungement`, `OK:victim-protective-order-record-relief`, `PA:path-c-summary-conviction-expungement`, `PA:path-d-ard-expungement`, `PA:path-e-age-70-expungement`, `PA:path-f-deceased-person-expungement`, `PA:path-g-underage-drinking-conviction-expungement`, `PA:path-i-petition-for-limited-access`, `RI:path-f-marijuana-possession-expungement`, `SC:diversion-or-program-completion-expungement`, `SC:general-sessions-non-conviction-expungement`, `SC:human-trafficking-survivor-expungement`, `SD:controlled-substance-deferred-disposition-route`, `TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a`, `TX:expunction-after-pardon-or-actual-innocence-relief`, `TX:expunction-after-qualifying-class-c-deferred-disposition`, `TX:expunction-after-qualifying-dismissal-or-quash`, `UT:path-i-traffic-offense-expungement-or-deletion`, `UT:path-j-cannabis-possession-petition-without-a-bci-certificate`, `UT:path-l-vacatur-human-trafficking-related-expungement`, `UT:path-m-juvenile-expungement`, `VT:dui-sealing`, `VT:non-conviction-sealing`, `WA:non-conviction-record-deletion-under-rcw-10-97-060`, `WI:adult-non-conviction-arrest-only-record-correction-or-removal`, `WV:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a`, `WY:human-trafficking-victim-vacatur-w-s-6-2-708`, `WY:juvenile-minor-expungement-w-s-14-6-241`

## Summary 6 — routes needing gate build

`CO:petition-based-conviction-sealing-jdf-612-24-72-706`, `FL:court-ordered-sealing-943-059`, `FL:lawful-self-defense-expunction-943-0578`, `GA:restriction-and-sealing-of-a-pardoned-felony`, `IA:minor-prostitution-7251`, `IA:misdemeanor-901c3`, `IA:public-intoxication-12346`, `IA:underage-alcohol-12347`, `IL:human-trafficking-survivor-vacatur-and-expungement`, `KS:conviction-or-diversion-216614`, `KY:felony-conviction-431073`, `MD:cannabis-specific-expungement`, `MD:eligible-conviction-expungement-under-crim-proc-10-110`, `MD:second-chance-act-shielding`, `MI:set-aside-by-application-under-mcl-780-621`, `NC:nonviolent-conviction-expunction-under-g-s-15a-145-5`, `ND:dui-record-sealing-under-the-separate-dui-statute`, `NH:conviction-annulment-under-rsa-651-5`, `NJ:regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3`, `NV:general-conviction-record-sealing-under-nrs-179-245`, `OH:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32`, `OK:not-more-than-two-eligible-felony-convictions-expungement`, `OK:one-eligible-nonviolent-felony-conviction-expungement`, `OK:other-eligible-misdemeanor-conviction-expungement`, `OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a`, `RI:path-a-first-offender-conviction-expungement`, `RI:path-b-multiple-misdemeanor-expungement`, `SC:eligible-conviction-expungement`, `SD:suspended-imposition-of-sentence-sealing`, `TN:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107`, `TN:pathway-4-two-offense-expunction-under-40-32-101-k`, `TX:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725`, `TX:petitioned-nondisclosure-for-an-eligible-conviction-411-0735`, `UT:path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility`, `UT:path-e-petition-based-non-conviction-expungement`, `UT:path-f-petition-based-conviction-expungement`, `VT:adult-conviction-expungement-narrow-statutory-route`, `VT:adult-felony-conviction-sealing`, `VT:adult-misdemeanor-conviction-sealing`, `WA:adult-felony-vacation-under-rcw-9-94a-640`, `WA:adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060`, `WV:eligible-conviction-expungement-under-w-va-code-61-11-26`

## Summary 7 — routes needing intake fix

`FL:human-trafficking-victim-expunction-943-0583`, `ID:human-trafficking-survivor-vacatur-and-expungement`, `ID:juvenile-expungement`, `KS:prostitution-coercion`, `LA:human-trafficking-survivor-expungement-fee-exempt-route`, `ME:sex-trafficking-sexual-exploitation-survivor-sealing`, `MI:human-trafficking-related-set-aside-application`, `NE:trafficking-survivor-set-aside-and-seal`, `NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247`, `OH:human-trafficking-survivor-conviction-expungement-under-2953-36`, `OH:human-trafficking-survivor-non-conviction-expungement-under-2953-521`, `OK:human-trafficking-survivor-relief`, `PA:path-k-human-trafficking-vacatur-expungement`, `RI:path-h-commercial-sexual-activity-related-expungement`, `SD:juvenile-trafficking-expungement`, `WA:victim-survivor-conviction-vacation-route`, `WI:human-trafficking-prostitution-relief-under-973-015-2m`, `WV:sex-trafficking-victim-vacatur-and-expungement`

## Summary 8 — routes needing wait/anchor fix

`CO:juvenile-expungement-19-1-306`, `MD:police-record-expungement-when-no-charge-was-filed-under-10-103`, `MI:first-offense-owi-set-aside-by-application`, `MT:non-conviction-criminal-history-removal-through-criss`, `NH:annulment-of-a-vacated-conviction`, `NH:marijuana-possession-annulment-under-rsa-651-5-b`, `NM:conviction`, `NV:deferred-judgment-dismissal-and-sealing-under-nrs-176-211`, `NV:non-conviction-record-sealing`, `NV:probation-or-specialty-court-dismissal-set-aside-sealing`, `OH:certain-firearm-carry-conviction-expungement-under-2953-35`, `OH:marijuana-hashish-possession-expungement-under-2953-321`, `OK:juvenile-record-expungement`, `OK:up-to-two-felony-deferred-dismissal-expungement`, `RI:path-c-deferred-sentence-expungement`, `RI:path-d-non-conviction-sealing-expungement`, `RI:path-e-filed-complaint-relief-under-12-10-12`, `RI:path-g-decriminalized-offense-expungement`, `SC:juvenile-expungement`, `SC:summary-court-non-conviction-expungement`, `SD:adult-arrest-record-expungement-under-sdcl-23a-3-27`, `TX:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period`, `TX:first-offense-dwi-nondisclosure`, `VT:juvenile-sealing`, `VT:offense-before-age-25-sealing-under-33-v-s-a-5119-g`, `VT:young-adult-sealing-for-offenses-committed-at-ages-18-21`, `WA:blake-drug-possession-vacation-and-refund-route`, `WA:juvenile-record-sealing-under-rcw-13-50-260`, `WA:misdemeanor-cannabis-conviction-vacation`, `WV:first-offense-drug-possession-conditional-discharge-relief`, `WV:juvenile-record-relief`, `WV:no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication`, `WY:felony-conviction-expungement-w-s-7-13-1502`

## Summary 9 — routes needing packet/form work

_none_

## Summary 10 — permanent-guidance / no-paid-product routes

53 routes (see per-route table).

## Summary 11 — not-currently-operational routes

`DC:dc_auto_expungement_16_802`, `DC:dc_auto_sealing_16_805`

## Summary 12 — discard / duplicate routes

`CA:tool-5-proposition-64-marijuana-relief`

## Summary 13 — legal-action-required routes

`HI:deferred-acceptance-one-year`, `HI:deferred-prostitution-three-year`

## Summary 14 — missing legal materials needed from Roger / legal team

197 items — see `docs/expungement-ai/LEGAL_ACTION_REQUIRED.md`.

## Summary 15 — Target 51 first paid route queue

| # | Juris | Route | Current status | Primary blocker | Expected paid gain |
| --- | --- | --- | --- | --- | --- |
| 1 | FL | `court-ordered-expunction-943-0585` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 2 | IN | `conviction-expungement-with-records-marked-expunged` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 3 | MA | `adult-conviction-sealing-under-m-g-l-c-276-100a` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 4 | PA | `path-a-non-conviction-expungement` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 5 | SD | `diversion-expungement` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 6 | TN | `pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | paid_after_legal_reconfirmation | legal_reconfirmation | yes |
| 7 | AK | `sealing-for-mistaken-identity-or-false-accusation-as-12-62-180` | paid_after_route_metadata_fix | route_metadata | yes |
| 8 | AL | `eligible-conviction-expungement-under-the-redeemer-act` | paid_after_route_metadata_fix | route_metadata | yes |
| 9 | AZ | `remedy-1-record-sealing` | paid_after_route_metadata_fix | route_metadata | yes |
| 10 | DE | `discretionary-court-expungement-under-11-del-c-4374` | paid_after_route_metadata_fix | route_metadata | yes |
| 11 | MI | `misdemeanor-marijuana-set-aside-under-mcl-780-621e` | paid_after_route_metadata_fix | route_metadata | yes |
| 12 | NC | `dismissal-and-not-guilty-expunction-under-g-s-15a-146` | paid_after_route_metadata_fix | route_metadata | yes |
| 13 | NH | `annulment-after-dismissal-acquittal-or-nonprosecution` | paid_after_route_metadata_fix | route_metadata | yes |
| 14 | NV | `controlled-substance-possession-sealing-under-nrs-453-3365` | paid_after_route_metadata_fix | route_metadata | yes |
| 15 | OH | `adult-non-conviction-sealing-or-expungement-under-2953-33` | paid_after_route_metadata_fix | route_metadata | yes |
| 16 | OK | `acquittal-dismissal-or-other-no-conviction-expungement` | paid_after_route_metadata_fix | route_metadata | yes |
| 17 | RI | `path-f-marijuana-possession-expungement` | paid_after_route_metadata_fix | route_metadata | yes |
| 18 | SC | `diversion-or-program-completion-expungement` | paid_after_route_metadata_fix | route_metadata | yes |
| 19 | TX | `expunction-after-acquittal-not-guilty-disposition-chapter-55a` | paid_after_route_metadata_fix | route_metadata | yes |
| 20 | UT | `path-i-traffic-offense-expungement-or-deletion` | paid_after_route_metadata_fix | route_metadata | yes |
| 21 | VT | `dui-sealing` | paid_after_route_metadata_fix | route_metadata | yes |
| 22 | WA | `non-conviction-record-deletion-under-rcw-10-97-060` | paid_after_route_metadata_fix | route_metadata | yes |
| 23 | WV | `accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a` | paid_after_route_metadata_fix | route_metadata | yes |
| 24 | WY | `human-trafficking-victim-vacatur-w-s-6-2-708` | paid_after_route_metadata_fix | route_metadata | yes |

## Summary 16 — post-51 route-depth queue

171 routes (see JSON report).

## Full per-route inventory

| Route | Juris | Product route type | Forum | Operative | User-files | Ever paid | Tier | Bucket | Primary blocker | LAR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` | AK | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `executive-pardon-backstop` | AK | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `juvenile-record-sealing-as-47-12-300` | AK | court_petition | court | y | y | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `sealing-for-mistaken-identity-or-false-accusation-as-12-62-180` | AK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-002 |
| `set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085` | AK | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-001 |
| `eligible-conviction-expungement-under-the-redeemer-act` | AL | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-004 |
| `human-trafficking-victim-expungement` | AL | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-006 |
| `non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a` | AL | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-003 |
| `pardoned-felony-expungement-under-ala-code-15-27-2-c` | AL | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-005 |
| `situation-a-non-convictions` | AR | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `situation-b-misdemeanor-convictions` | AR | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `situation-c-felony-convictions` | AR | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `remedy-1-record-sealing` | AZ | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-007 |
| `remedy-2-set-aside-of-a-conviction` | AZ | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-008 |
| `remedy-3-marijuana-expungement` | AZ | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-009 |
| `prop-64-completed-sentence-application-11361-8` | CA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `prop-64-currently-serving-petition-11361-8` | CA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `tool-1-dismissal-set-aside` | CA | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `tool-2-automatic-relief` | CA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `tool-3-petition-based-felony-sealing` | CA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `tool-4-arrest-record-sealing` | CA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `tool-5-proposition-64-marijuana-relief` | CA | automatic_relief | automatic | y | n | n | HELD_GUIDANCE | discard_or_duplicate | duplicate | - |
| `automatic-clean-slate-sealing-13-3-117` | CO | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `juvenile-expungement-19-1-306` | CO | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-011 |
| `petition-based-conviction-sealing-jdf-612-24-72-706` | CO | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-010 |
| `petition-based-non-conviction-sealing-jdf-417-24-72-704` | CO | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `absolute-pardon-resulting-in-erasure` | CT | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `automatic-clean-slate-erasure-for-eligible-post-2000-convictions` | CT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `automatic-non-conviction-erasure-under-conn-gen-stat-54-142a` | CT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `cannabis-conviction-erasure` | CT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202` | CT | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `dc_actual_innocence_expungement_16_803` | DC | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `dc_auto_expungement_16_802` | DC | automatic_relief | automatic | n | n | n | other / unclassified | not_currently_operational | not_operational | - |
| `dc_auto_sealing_16_805` | DC | automatic_relief | automatic | n | n | n | other / unclassified | not_currently_operational | not_operational | - |
| `dc_juvenile_sealing_16_2335` | DC | guidance_only | none | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `dc_motion_seal_felony_conviction_8yr_16_806` | DC | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `dc_motion_seal_misdemeanor_conviction_5yr_16_806` | DC | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `dc_motion_seal_nonconviction_16_806` | DC | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `discretionary-court-expungement-under-11-del-c-4374` | DE | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-012 |
| `juvenile-expungement-under-10-del-c-1017-1019-1017a` | DE | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-013 |
| `mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a` | DE | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `pardon-based-discretionary-expungement-under-11-del-c-4375` | DE | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `administrative-expunction-mistaken-or-unlawful-arrest` | FL | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-020 |
| `automatic-sealing-943-0595` | FL | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `court-ordered-expunction-943-0585` | FL | court_petition | court | y | y | y | other / unclassified | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-014 |
| `court-ordered-sealing-943-059` | FL | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-015 |
| `early-juvenile-expunction-943-0515` | FL | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-019 |
| `human-trafficking-victim-expunction-943-0583` | FL | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-016 |
| `juvenile-diversion-expunction-943-0582` | FL | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-018 |
| `lawful-self-defense-expunction-943-0578` | FL | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-017 |
| `automatic-restriction-of-qualifying-post-july-1-2013-non-convictions` | GA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `non-conviction-record-restriction-through-the-agency-prosecutor-process` | GA | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-021 |
| `restriction-and-sealing-of-a-pardoned-felony` | GA | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-022 |
| `sb-288-misdemeanor-conviction-restriction-and-sealing` | GA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `youthful-first-offender-restriction-route` | GA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-023 |
| `deferred-acceptance-one-year` | HI | unknown | unknown | y | n | n | other / unclassified | legal_action_required | legal_action_required | LAR-024 |
| `deferred-prostitution-three-year` | HI | unknown | unknown | y | n | n | other / unclassified | legal_action_required | legal_action_required | LAR-025 |
| `dui-under-21-conviction` | HI | administrative_application | agency | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-time-drug-conviction` | HI | administrative_application | agency | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `nonconviction-arrest-expungement` | HI | administrative_application | agency | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `minor-prostitution-7251` | IA | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-029 |
| `misdemeanor-901c3` | IA | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-026 |
| `nonconviction-901c2` | IA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `public-intoxication-12346` | IA | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-027 |
| `underage-alcohol-12347` | IA | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-028 |
| `clean-slate-shielding-under-idaho-code-67-3004-11` | ID | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-031 |
| `human-trafficking-survivor-vacatur-and-expungement` | ID | court_motion | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-033 |
| `juvenile-expungement` | ID | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-032 |
| `non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10` | ID | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-030 |
| `withheld-judgment-idaho-code-19-2604-review-branch` | ID | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-conviction-sealing` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-non-conviction-expungement` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `cannabis-specific-automatic-or-petition-expungement` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `clean-slate-automatic-sealing` | IL | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `criminal-identity-theft-mistaken-identity-relief` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `expungement-after-eligible-supervision-or-qualified-probation` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `felony-prostitution-relief` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `human-trafficking-survivor-vacatur-and-expungement` | IL | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-034 |
| `juvenile-automatic-or-petition-expungement` | IL | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `conviction-expungement-with-records-marked-expunged` | IN | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-038 |
| `conviction-expungement-with-sealed-confidential-access` | IN | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-037 |
| `juvenile-allegation-expungement` | IN | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-036 |
| `non-conviction-arrest-or-criminal-charge-expungement` | IN | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-035 |
| `conviction-or-diversion-216614` | KS | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-039 |
| `drug-registration-relief-coordination` | KS | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `prostitution-coercion` | KS | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-040 |
| `specialty-court-accelerated` | KS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `felony-conviction-431073` | KY | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-041 |
| `juvenile-automatic-dismissal` | KY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `juvenile-petition-610330` | KY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `misdemeanor-violation-traffic-conviction` | KY | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `nonconviction-431076` | KY | court_petition | court | y | y | y | other / unclassified | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-042 |
| `automated-expungement-status-verification-art-985-2` | LA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `expungement-by-redaction-for-multi-person-records` | LA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-044 |
| `felony-article-893-e-set-aside-followed-by-expungement` | LA | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `felony-ten-year-clean-period-expungement` | LA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-offender-pardon-felony-expungement` | LA | board_or_pardon | board | y | n | n | HELD_GUIDANCE | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `first-offense-marijuana-expungement-after-90-days-art-998` | LA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `human-trafficking-survivor-expungement-fee-exempt-route` | LA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-045 |
| `immediate-expungement-after-successful-court-program-completion-art-985-3` | LA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-046 |
| `interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction` | LA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-043 |
| `misdemeanor-article-894-b-set-aside-followed-by-expungement` | LA | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `misdemeanor-five-year-clean-period-expungement` | LA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `non-conviction-arrest-expungement` | LA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-conviction-sealing-under-m-g-l-c-276-100a` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-047 |
| `automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c` | MA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `court-requested-sealing-for-dismissal-or-nolle-prosequi-100c` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-048 |
| `juvenile-record-sealing-under-100b` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-049 |
| `marijuana-only-expungement` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-052 |
| `non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-051 |
| `time-based-expungement-under-100f-100j` | MA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-050 |
| `adult-non-conviction-expungement-under-crim-proc-10-105` | MD | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `automatic-expungement-under-crim-proc-10-105-1` | MD | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `cannabis-specific-expungement` | MD | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-055 |
| `eligible-conviction-expungement-under-crim-proc-10-110` | MD | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-054 |
| `juvenile-expungement` | MD | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-057 |
| `police-record-expungement-when-no-charge-was-filed-under-10-103` | MD | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-053 |
| `second-chance-act-shielding` | MD | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-056 |
| `adult-conviction-sealing` | ME | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-non-conviction-record-relief` | ME | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-059 |
| `juvenile-sealing` | ME | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-060 |
| `pardon-route` | ME | board_or_pardon | board | y | n | n | HELD_GUIDANCE | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `sex-trafficking-sexual-exploitation-survivor-sealing` | ME | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-058 |
| `automatic-clean-slate-set-aside-under-mcl-780-621g` | MI | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `first-offense-owi-set-aside-by-application` | MI | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-063 |
| `human-trafficking-related-set-aside-application` | MI | court_motion | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-064 |
| `misdemeanor-marijuana-set-aside-under-mcl-780-621e` | MI | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-062 |
| `set-aside-by-application-under-mcl-780-621` | MI | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-061 |
| `arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11` | MN | prosecutor_or_agency | prosecutor | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `automatic-clean-slate-expungement-under-609a-015` | MN | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `automatic-mistaken-identity-expungement-under-609a-017` | MN | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06` | MN | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-065 |
| `petition-based-expungement-under-609a-02-03` | MN | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `prosecutor-agreed-sealing-without-a-full-petition-under-609a-025` | MN | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-066 |
| `closed-record-outcome-under-rsmo-610-105` | MO | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-067 |
| `false-information-or-qualifying-arrest-record-expungement-under-610-122-123` | MO | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-068 |
| `first-intoxication-related-traffic-or-boating-expungement-under-610-130` | MO | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-minor-in-possession-alcohol-expungement-under-311-326` | MO | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-070 |
| `general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140` | MO | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `marijuana-expungement-under-missouri-constitution-article-xiv` | MO | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-069 |
| `stolen-or-mistaken-identity-expungement-under-610-145` | MO | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `additional-justice-or-municipal-court-misdemeanor-relief` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `dui-nonadjudication` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `eligible-felony-conviction-expungement-99-19-71` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-offense-controlled-substance-conditional-discharge-relief` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `first-offense-dui-expungement` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `human-trafficking-survivor-vacatur-and-expungement` | MS | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `intervention-court-completion-expungement` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `minor-in-possession-underage-alcohol-expungement` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `nonadjudication-under-99-15-26` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `pretrial-intervention-or-diversion-expungement` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59` | MS | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `deferred-sentence-dismissal-or-confidentiality-route` | MT | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `doj-record-removal-update-request` | MT | prosecutor_or_agency | prosecutor | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `marijuana-related-redesignation-expungement-under-mmrta` | MT | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `misdemeanor-conviction-expungement-under-mont-code-46-18-1104` | MT | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `non-conviction-criminal-history-removal-through-criss` | MT | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-071 |
| `dismissal-and-not-guilty-expunction-under-g-s-15a-146` | NC | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-072 |
| `nonviolent-conviction-expunction-under-g-s-15a-145-5` | NC | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-073 |
| `youthful-pre-raise-the-age-expunction-under-g-s-15a-145-8a-and-related-statutes` | NC | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-074 |
| `deferred-imposition-dismissal-and-sealing` | ND | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-077 |
| `dui-record-sealing-under-the-separate-dui-statute` | ND | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-076 |
| `first-offense-possession-sealing` | ND | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | ND | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `marijuana-specific-summary-pardon-or-sealing-relief` | ND | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` | ND | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-075 |
| `automatic-nonconviction-sealing` | NE | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `juvenile-automatic-sealing` | NE | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `juvenile-petition-backstop` | NE | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-080 |
| `law-enforcement-error-expungement` | NE | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-079 |
| `pardon-then-seal` | NE | board_or_pardon | board | y | n | n | HELD_GUIDANCE | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `set-aside-incarceration-one-year-or-less` | NE | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `set-aside-probation-fine-community-service` | NE | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `trafficking-survivor-set-aside-and-seal` | NE | court_motion | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-078 |
| `annulment-after-dismissal-acquittal-or-nonprosecution` | NH | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-081 |
| `annulment-of-a-vacated-conviction` | NH | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-082 |
| `conviction-annulment-under-rsa-651-5` | NH | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-083 |
| `dwi-dui-annulment` | NH | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-085 |
| `marijuana-possession-annulment-under-rsa-651-5-b` | NH | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-084 |
| `out-of-state-federal-or-military-record-guidance` | NH | unknown | unknown | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6` | NJ | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `clean-slate-petition-under-n-j-s-a-2c-52-5-3` | NJ | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-087 |
| `marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1` | NJ | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3` | NJ | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-086 |
| `cannabis-expungement` | NM | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `cannabis-sentence-dismissal-incarcerated-person-pathway` | NM | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `conviction` | NM | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-088 |
| `dna-sample-profile-expungement` | NM | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-089 |
| `no-conviction-released-without-conviction` | NM | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `controlled-substance-possession-sealing-under-nrs-453-3365` | NV | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-095 |
| `deferred-judgment-dismissal-and-sealing-under-nrs-176-211` | NV | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-091 |
| `general-conviction-record-sealing-under-nrs-179-245` | NV | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-090 |
| `non-conviction-record-sealing` | NV | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-096 |
| `probation-or-specialty-court-dismissal-set-aside-sealing` | NV | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-092 |
| `reentry-program-sealing-under-nrs-179-259` | NV | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-093 |
| `trafficking-victim-vacatur-and-sealing-under-nrs-179-247` | NV | court_motion | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-094 |
| `automatic-clean-slate-sealing-under-cpl-160-57` | NY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `automatic-non-conviction-sealing-under-cpl-160-50-160-55` | NY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `conditional-treatment-sealing-under-cpl-160-58` | NY | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-097 |
| `discretionary-conviction-sealing-by-petition-under-cpl-160-59` | NY | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `marijuana-record-destruction-under-the-mrta` | NY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32` | OH | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-098 |
| `adult-non-conviction-sealing-or-expungement-under-2953-33` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-099 |
| `certain-firearm-carry-conviction-expungement-under-2953-35` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-103 |
| `human-trafficking-survivor-conviction-expungement-under-2953-36` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-101 |
| `human-trafficking-survivor-non-conviction-expungement-under-2953-521` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-102 |
| `juvenile-sealing-and-expungement` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-104 |
| `marijuana-hashish-possession-expungement-under-2953-321` | OH | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-100 |
| `acquittal-dismissal-or-other-no-conviction-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-106 |
| `arrest-with-no-charges-filed` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-105 |
| `clean-slate-automatic-expungement` | OK | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `conviction-reversed-and-case-dismissed` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-107 |
| `deferred-sentence-court-record-expungement-under-991-c` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-117 |
| `dna-factual-innocence-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-108 |
| `felony-reclassified-as-a-misdemeanor` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-116 |
| `fine-only-misdemeanor-conviction-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-112 |
| `human-trafficking-survivor-relief` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-118 |
| `juvenile-record-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-120 |
| `misdemeanor-deferred-dismissal-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-109 |
| `nonviolent-felony-deferred-dismissal-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-110 |
| `not-more-than-two-eligible-felony-convictions-expungement` | OK | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-115 |
| `one-eligible-nonviolent-felony-conviction-expungement` | OK | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-114 |
| `other-eligible-misdemeanor-conviction-expungement` | OK | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-113 |
| `pardon-based-expungement` | OK | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `up-to-two-felony-deferred-dismissal-expungement` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-111 |
| `victim-protective-order-record-relief` | OK | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-119 |
| `marijuana-specific-set-aside-redesignation` | OR | court_motion | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-122 |
| `set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` | OR | court_motion | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `set-aside-of-eligible-convictions-under-ors-137-225-1-a` | OR | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-121 |
| `path-a-non-conviction-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-123 |
| `path-b-complete-acquittal-not-guilty-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-124 |
| `path-c-summary-conviction-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-125 |
| `path-d-ard-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-126 |
| `path-e-age-70-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-127 |
| `path-f-deceased-person-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-128 |
| `path-g-underage-drinking-conviction-expungement` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-129 |
| `path-h-pardon-based-expungement` | PA | board_or_pardon | board | y | n | n | HELD_GUIDANCE | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `path-i-petition-for-limited-access` | PA | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_route_metadata_fix | route_metadata | LAR-130 |
| `path-j-clean-slate-automatic-limited-access` | PA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `path-k-human-trafficking-vacatur-expungement` | PA | court_motion | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-131 |
| `path-a-first-offender-conviction-expungement` | RI | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-132 |
| `path-b-multiple-misdemeanor-expungement` | RI | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-133 |
| `path-c-deferred-sentence-expungement` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-134 |
| `path-d-non-conviction-sealing-expungement` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-135 |
| `path-e-filed-complaint-relief-under-12-10-12` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-136 |
| `path-f-marijuana-possession-expungement` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-137 |
| `path-g-decriminalized-offense-expungement` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-138 |
| `path-h-commercial-sexual-activity-related-expungement` | RI | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-139 |
| `diversion-or-program-completion-expungement` | SC | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-142 |
| `eligible-conviction-expungement` | SC | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-143 |
| `general-sessions-non-conviction-expungement` | SC | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-140 |
| `human-trafficking-survivor-expungement` | SC | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-144 |
| `juvenile-expungement` | SC | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-145 |
| `pardon-guidance-for-otherwise-ineligible-convictions` | SC | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `summary-court-non-conviction-expungement` | SC | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-141 |
| `adult-arrest-record-expungement-under-sdcl-23a-3-27` | SD | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-146 |
| `automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases` | SD | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `controlled-substance-deferred-disposition-route` | SD | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-149 |
| `diversion-expungement` | SD | court_petition | court | y | y | y | other / unclassified | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-147 |
| `juvenile-delinquency-sealing` | SD | court_petition | court | y | y | y | other / unclassified | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-150 |
| `juvenile-trafficking-expungement` | SD | court_petition | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-151 |
| `pardon-based-sealing` | SD | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `suspended-imposition-of-sentence-sealing` | SD | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-148 |
| `pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | TN | court_petition | court | y | y | y | CORRECTED_AWAITING_RECONFIRM | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-152 |
| `pathway-2-diversion-expunction-under-40-15-105-40-35-313` | TN | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-153 |
| `pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107` | TN | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-154 |
| `pathway-4-two-offense-expunction-under-40-32-101-k` | TN | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-155 |
| `automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07` | TX | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `expunction-after-acquittal-not-guilty-disposition-chapter-55a` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-156 |
| `expunction-after-pardon-or-actual-innocence-relief` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-159 |
| `expunction-after-qualifying-class-c-deferred-disposition` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-160 |
| `expunction-after-qualifying-dismissal-or-quash` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-158 |
| `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-157 |
| `first-offense-dwi-nondisclosure` | TX | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-163 |
| `petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725` | TX | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-161 |
| `petitioned-nondisclosure-for-an-eligible-conviction-411-0735` | TX | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-162 |
| `path-a-automatic-clean-slate-expungement` | UT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice` | UT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals` | UT | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility` | UT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-164 |
| `path-e-petition-based-non-conviction-expungement` | UT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-165 |
| `path-f-petition-based-conviction-expungement` | UT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-166 |
| `path-i-traffic-offense-expungement-or-deletion` | UT | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-167 |
| `path-j-cannabis-possession-petition-without-a-bci-certificate` | UT | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-168 |
| `path-k-pardon-based-expungement` | UT | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `path-l-vacatur-human-trafficking-related-expungement` | UT | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-169 |
| `path-m-juvenile-expungement` | UT | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-170 |
| `automatic-sealing-no-filing` | VA | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `petition-based-sealing` | VA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `regime-1-expungement-available-now` | VA | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-conviction-expungement-narrow-statutory-route` | VT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-171 |
| `adult-felony-conviction-sealing` | VT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-173 |
| `adult-misdemeanor-conviction-sealing` | VT | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-172 |
| `dui-sealing` | VT | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-174 |
| `juvenile-sealing` | VT | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-178 |
| `non-conviction-sealing` | VT | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-175 |
| `offense-before-age-25-sealing-under-33-v-s-a-5119-g` | VT | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-177 |
| `young-adult-sealing-for-offenses-committed-at-ages-18-21` | VT | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-176 |
| `adult-felony-vacation-under-rcw-9-94a-640` | WA | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-180 |
| `adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060` | WA | court_motion | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-179 |
| `blake-drug-possession-vacation-and-refund-route` | WA | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-182 |
| `juvenile-record-sealing-under-rcw-13-50-260` | WA | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-185 |
| `misdemeanor-cannabis-conviction-vacation` | WA | court_motion | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-183 |
| `non-conviction-record-deletion-under-rcw-10-97-060` | WA | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-181 |
| `victim-survivor-conviction-vacation-route` | WA | court_motion | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-184 |
| `adult-conviction-expungement-under-wis-stat-973-015` | WI | court_petition | court | y | y | y | RATIFIED_DEPLOYABLE | paid_now | none | - |
| `adult-non-conviction-arrest-only-record-correction-or-removal` | WI | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-186 |
| `executive-pardon-guidance` | WI | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `human-trafficking-prostitution-relief-under-973-015-2m` | WI | court_petition | court | y | y | y | HELD_GUIDANCE | paid_after_intake_fix | intake_fix | LAR-187 |
| `juvenile-adjudication-expungement-under-wis-stat-938-355-4m` | WI | court_petition | court | y | y | y | other / unclassified | paid_after_legal_reconfirmation | legal_reconfirmation | LAR-188 |
| `accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a` | WV | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-191 |
| `eligible-conviction-expungement-under-w-va-code-61-11-26` | WV | court_petition | court | y | y | y | HARD_GATE_PENDING | paid_after_gate_build | gate_build | LAR-190 |
| `first-offense-drug-possession-conditional-discharge-relief` | WV | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-192 |
| `juvenile-record-relief` | WV | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-194 |
| `no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication` | WV | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-189 |
| `pardon-based-expungement` | WV | board_or_pardon | board | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | not_paid_product | - |
| `sex-trafficking-victim-vacatur-and-expungement` | WV | court_motion | court | y | y | y | other / unclassified | paid_after_intake_fix | intake_fix | LAR-193 |
| `adult-non-conviction-expungement-w-s-7-13-1401` | WY | automatic_relief | automatic | y | n | n | CORRECTED_AWAITING_RECONFIRM | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |
| `felony-conviction-expungement-w-s-7-13-1502` | WY | court_petition | court | y | y | y | other / unclassified | paid_after_wait_anchor_fix | wait_anchor_fix | LAR-195 |
| `human-trafficking-victim-vacatur-w-s-6-2-708` | WY | court_motion | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-196 |
| `juvenile-minor-expungement-w-s-14-6-241` | WY | court_petition | court | y | y | y | other / unclassified | paid_after_route_metadata_fix | route_metadata | LAR-197 |
| `misdemeanor-conviction-expungement-w-s-7-13-1501` | WY | automatic_relief | automatic | y | n | n | other / unclassified | permanent_guidance_not_a_paid_product | automatic_relief_mode | - |

_Full structured detail is in `data/expungement-ai/reports/petition-route-inventory.json` and `data/expungement-ai/route-product-metadata.json`._
