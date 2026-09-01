# C5 post-order enforcement branch identities

This lane separates ten retained Category B stages from participant-facing Category A enforcement branches. The retained stage always files nothing, uses `process_guidance`, and is never sellable. Every A branch has a distinct selector, output strategy, product outcome, and commercial treatment; it remains closed unless an exact route-and-packet-family Grade-A fulfilment record later authorizes it.

## Result

| Measure | Count |
| --- | ---: |
| Assigned route records | 10 |
| Completed route identities | 3 |
| Stopped and reported | 7 |
| Confirmed reuse crosswalks | 2 |
| New participant A identities created | 1 |
| Commercial routes opened | 0 |

Completed routes are Maryland's evidence-backed timing split across two existing filing routes, Maine's new § 1902 custom-pleading identity with explicit self-help stops, and Wisconsin's evidence-backed two-scenario reuse. The other rows stop where a generated form match leaves part of a composite enforcement branch uncovered or where creating a new identity would duplicate a committed Category A petition route.

## What each participant branch files

| Route | Status | Filing | Destination / named custodian | Trigger | Deadline |
| --- | --- | --- | --- | --- | --- |
| `KY:ky_diversion_disposition_routing` | **STOPPED — partial crosswalk** | Corrective motion or request, then participant-filed AOC-497.2 where applicable. AOC-497.3 is court-generated, not participant-filed. | Court that approved and supervised diversion; Circuit Court Clerk. | Diversion completed but dismissal, coding, or expected expungement failed. | Promptly after expected dismissal; KRS 431.076 timing then applies. |
| `MD:md_10104_pre_service` | **COMPLETED — timing split** | Ordinary timing: CC-DC-CR-072A. Early filing instead of waiting three years: CC-DC-CR-072C with CC-DC-CR-078. | Clerk of the court where the charging document was filed. | Pre-service nolle entered but no § 10-104 order, or participant elects § 10-105 relief. | Use the ordinary route after the applicable waiting period; use the existing early-filing and waiver route when filing before three years. |
| `ME:me-deferred` | **COMPLETED — § 1902 identity; counsel stops** | § 1902 application or motion to modify, add, or obtain relief from deferred-disposition requirements. No form number is asserted. | Court that ordered the deferred disposition. | During deferment, a condition becomes impossible or unreasonably burdensome. | File during the deferment period. A contested hearing, adverse sentencing, plea-withdrawal issue, or appeal stops for counsel/manual review. |
| `MI:mi_auto_misd92` | **STOPPED — partial crosswalk** | MSP missing-record/correction request; separately MC 227 when independently eligible. | Michigan State Police; clerk of convicting court. | Eligible lower misdemeanor remains visible or application relief is elected. | MCL 780.621g / 780.621d; no short correction deadline stated. |
| `MI:mi_auto_misd93` | **STOPPED — partial crosswalk** | MSP correction/missing-case request; separately MC 227. | Michigan State Police; clerk of court of conviction. | Automatic system omitted an eligible higher-level misdemeanor or application relief is elected. | MCL 780.621g / 780.621d; no short correction deadline stated. |
| `MI:mi_deferral_status` | **STOPPED — partial crosswalk** | Corrective motion; administrative correction request; or MC 227 for an independently eligible remaining conviction. | Sentencing/diversion court, reporting agency, MSP, or clerk of court of conviction. | Completed deferral was not entered/transmitted correctly, or a conviction remains. | Promptly after completion/discovery; MC 227 follows MCL 780.621d. |
| `MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g` | **STOPPED — partial crosswalk** | MSP correction/missing-case submission; separately MC 227. | Michigan State Police; clerk of convicting court. | Eligible felony was not processed, data is wrong, or application relief is elected. | MCL 780.621g / 780.621d; no short correction deadline stated. |
| `VA:va_auto_seal_without_order` | **STOPPED — existing-route overlap** | VSP/AOC correction request; separately a petition under § 19.2-392.12 or § 19.2-392.12:1. | Virginia State Police, Office of the Executive Secretary/court clerk, or clerk of court of conviction/disposition. | Covered record remains public, or relief is sought beyond the no-order cohort. | Correction upon discovery; petition timing follows the applicable statute and operative date. |
| `VT:vt_diversion_post_charge` | **STOPPED — existing-route overlap** | § 164(f)(5) application, failed-deletion correction request, or § 7603 petition. | Diversion program, State's Attorney, or Criminal Division that handled the charge. | Older record, failed automatic expungement, or independent petition eligibility. | Modern automation commonly two years after dismissal; other timing depends on disposition/offense. |
| `WI:wi_exp_certificate_of_discharge` | **COMPLETED — scenario split** | Supervised case: written certificate follow-up. No probation/incarceration: CR-266 with proposed CR-267. | DOC or other supervising/detaining authority and circuit clerk; sentencing court for CR-266/267. | Ordered expungement and successful completion, but missing certificate; or CR-266 scenario applies. | Promptly after completion; eligibility must have been ordered at sentencing. |

## Confirmed crosswalks

- Maryland binds by timing scenario: `obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105` for ordinary `CC-DC-CR-072A` filing, and `obligation:track-pathway:MD:md_10105_early:adult-non-conviction-expungement-under-crim-proc-10-105` for early `CC-DC-CR-072C` plus `CC-DC-CR-078` filing.
- Wisconsin binds by sentence scenario: `obligation:track-only:WI:wi_exp_certificate_of_discharge_followup` for a supervised-case missing certificate, and `obligation:track-only:WI:wi_exp_cr266` for the no-probation/no-incarceration CR-266 route.

## Stops that prevent silent coverage loss

- Kentucky's existing A route covers AOC-497.2 but not the preceding corrective motion. The committed census says AOC-497.3 is generated by AOC and signed by the judge.
- Maine's new self-help output is limited to the identified § 1902 motion/application. Section 1903 hearing participation is not described as a filing, and contested hearings, adverse sentencing, plea-withdrawal issues, and § 1904 appeals stop for counsel or manual review.
- The four Michigan rows bind universally only to generic `mi_setaside_application` for MC 227. That route does not cover the MSP/court correction component. The other generated matches are not universal: first OWI uses MC 227 item 2.c, marijuana uses MC 227a, and trafficking uses MC 227b.
- Virginia already has Category A CC-1201 petition routes under the cited petition statutes. A new VSP/AOC correction identity must be split from them before creation.
- Vermont already has Category A § 7603 petition identities with forms 200-00130 and 200-00132. A new § 164 application/correction identity must be split from them before creation.

## Evidence and authority boundary

The filing, destination, trigger, and deadline facts come from committed revalidation results and the frozen census. No official form is inferred where those records name none. The dispatch manifest is read from commit `1fa0f3328a614f73330256bee5df75fc655e9d79`, whose required worker base is `227f095d5d1493feca56779cf60c6f177caebd61`.

The seven implicated packet families are named only. Nothing here creates a family, proves a packet, changes the census, opens checkout or delivery, or touches production.
