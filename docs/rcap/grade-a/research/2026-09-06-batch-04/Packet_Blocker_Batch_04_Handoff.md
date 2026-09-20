# LegalEase packet blockers — Batch 04

**Research date:** September 6, 2026  
**Reviewer:** ChatGPT, legal research and implementation analysis; not counsel of record.  
**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Instructions examined at:** `ca6158a5314c277594c63ee0619fd0787163b49a`  
**Later head checked:** `babf7257080866f25cfa84d56298827eae28bb62`

## Outcome and scope

Four current participant guides were compared with official statutes, court rules, court guidance, and visually inspected official forms. This is a targeted research handoff, not a full PDF acceptance review. No repository file, approval, claim, route, or Production setting was changed. No new family pass is claimed.

The later GitHub comparison showed no change to the four instructions examined. It did show the prior Batch 03 research being incorporated and Delaware FIX111 being integrated. Do not reopen completed Batch 01–03 work or replace newer shared records wholesale.

| Family | Bounded finding | Recommended engineering consequence |
|---|---|---|
| `nc_146_dismissal_petition-set` | AOC-G-106 is the official linked expunction indigency petition; the guide names only CV-226. | Implement the correct conditional indigency petition and explicitly scope any supplemental affidavit. |
| `va_exp_nonconviction-set` | The blanket deferred-disposition prohibition misses current §19.2-298.02(D). | Preserve a documented statutory-exception branch rather than exclude every deferred dismissal. |
| `ma-bmc-multi-set` | The guide overstates eligible dispositions, omits the petitioner's 30-day DA notice, and treats a preliminary hearing as inevitable. | Correct the narrow consolidation scope and process; retain the separate filing-vehicle question. |
| `pa_790_nonconviction-set` | Published rules supply service methods; the order is optional; the requested IFP motion is held but not delivered. | Use the actual rule, distinguish optional order from required process, and render the selected IFP branch. |

These are proposed corrections for the existing legal-design/implementation mechanism. Any genuine owner/counsel adoption and current-output acceptance remain separate.

## 1. North Carolina — correct the fee-waiver component

### Repository finding

`data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill/participant-instructions.md` calls AOC-CV-226 the conditional indigency vehicle for the $175 branch. Its component table contains the petition, its instructions, and that affidavit; it does not identify AOC-G-106 as the operative indigency petition.

### Official evidence

The Judicial Branch's **expunction-specific** fee answer links directly to **AOC-G-106, Petition to Proceed as an Indigent** [NC1]. The actual form is **Rev. 11/24**, two pages, and contains a distinct expunction election, an affidavit, legal-services certification, and court-order blocks [NC2].

CV-226 is not simply nonexistent or universally forbidden: the general Court Costs page links it as supplementary financial information used in many counties [NC4]. However, the published **Rev. 4/23** form's sworn wording concerns arbitration fees [NC3]. Do not silently make an expunction participant swear to an unrelated arbitration allegation, and do not claim this supplemental form is the entire indigency application.

Section 15A-146(d) imposes $175 in its deferred-prosecution/conditional-discharge category and excludes indigent petitions [NC5]. The CR-287 guide distinguishes fee-bearing dismissals from other dismissals [NC7].

### Proposed participant copy

> **Filing fee and inability to pay.** An ordinary dismissal petition under this route has no filing fee. The $175 fee applies when the dismissal resulted from the specified deferred-prosecution or conditional-discharge process. If that fee applies and you cannot afford it, submit the Petition to Proceed as an Indigent with your expunction petition. Complete only truthful answers and sign its affidavit before an official authorized to administer the oath. The court decides your request. Provide additional financial information if the court requests it.

### Implementation

See `North_Carolina_Indigency_Component_Contract.md`. Preserve the original sources and historical receipts; do not change an official form's sworn text or promote a candidate download as the already-pinned source. Limit initial changes to this assigned family's fee-bearing branch and its explicit dependencies. Shared use elsewhere calls for coordinated ownership, not an unscheduled corpus audit.

**Remaining narrow input:** where a court requires CV-226 as supplemental evidence, confirm the accepted expunction-specific treatment of its arbitration wording or the accepted local substitute. This does not block locating, binding, or implementing G-106.

## 2. Virginia — do not exclude a statutory deferred-disposition exception

### Repository finding

`data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/participant-instructions.md` calls any stipulated/facts-sufficient/deferred/first-offender disposition a hard exclusion and tells the participant to use sealing, not expungement. That is broader than the current statute permits.

### Official evidence and conclusion

Under the version in force on this research date, §19.2-298.02(D) permits a dismissal under that section to be treated as otherwise dismissed **by agreement of all parties**, including specified reduced-charge or plea/stipulation situations [VA1]. It is not permission for every deferred or first-offender case. Eligibility is not an order granting expungement.

The published **CC-1473, Rev. 07/26**, explicitly includes the §19.2-298.02 category in its dismissal election [VA3]. The current §19.2-392.2 supplies the separate expungement procedure [VA2]. Its December 1, 2026 replacement must not be applied prematurely.

### Proposed participant copy

> **A deferred dismissal needs a closer check.** A dismissal after a plea, a stipulation, or deferred proceedings does not automatically qualify. A dismissal under Virginia Code §19.2-298.02 may qualify where all parties agreed to the treatment described in subsection D. Check the court record and the agreement before selecting the dismissal ground. If the legal basis or agreement is unclear, obtain legal review before filing. Do not assume the same rule covers a dismissal under another first-offender statute.

### Implementation

See `Virginia_Deferred_Disposition_Exception_Contract.md`. Update the controlling instruction and its corresponding eligibility decision together through the existing owner. Do not merely erase the stop condition. Do not infer all-party agreement from the word dismissed, or from the prosecutor's later silence on an expungement petition. Preserve all remaining §19.2-392.2 requirements and opposition stops.

**Remaining narrow input:** adoption of the corrected branch and the evidence acceptable for recording the required agreement. The statute says the agreement may appear in the final order; do not turn that into an unsupported rule that the final order is the only legally possible evidence.

## 3. Massachusetts — complete the BMC consolidation procedure

### Repository finding

`data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/participant-instructions.md` lists acquittal and no-probable-cause dispositions along with dismissals/nolle prosequi, omits an express petitioner-to-DA deadline, and says a preliminary hearing follows filing. It also records uncertainty over a consolidated form versus separate TC0057 forms.

### Official evidence

The **May 10, 2024 amended Standing Order 1-09** limits this consolidation procedure to at least three dismissal/nolle-prosequi criminal records from at least two BMC divisions under §100C's second paragraph. Venue is the BMC division covering the resident's address, or, for a nonresident, the most recent applicable criminal record's division. A preliminary hearing is discretionary; the court may proceed to a single final hearing. The petitioner sends the petition to the Suffolk County DA at least 30 days before the final hearing unless the DA waives the full period [MA1].

The Judiciary guide states that requesting sealing has no fee, recommends rather than universally requires criminal records/certified dockets, and confirms the DA-notice step [MA2]. The other dispositions arise under a different paragraph of §100C; this batch does not decide their separate procedural/case-law treatment [MA3]. Do not call those records ineligible for every form of relief.

### Proposed participant copy

> **Scope.** Use this consolidated route for at least three criminal records ending in dismissal or nolle prosequi across at least two BMC divisions. Other dispositions require their own treatment. Confirm the proper filing division and list each applicable docket.
>
> **Fee and notice.** There is no filing fee to request sealing. Send a copy of this petition to the Suffolk County District Attorney's Office at least 30 days before the final hearing unless that office waives the full notice period. Keep proof of what you sent and when. Court notice to the Commonwealth does not eliminate your separate obligation. Follow the hearing notice; a separate preliminary hearing is not always held.

### Implementation and what remains

Correct the scope and notice before another review. Include any evidence-of-service fields only as proposed product completion fields, not a claim that a separately named statutory certificate is universally required.

The Standing Order authorizes one petition and says a form is available, but an exact current dedicated consolidated form was not retrieved here. Do not perpetuate either unsupported universal assertion: that no such court form exists, or that a TC0057 must accompany every case. Confirm the accepted instrument and whether any per-case forms are required for the selected court.

The guide's stop when any hearing is set is a **product boundary**. Do not remove it silently. A decision to support an ordinary uncontested hearing is separate from correctly explaining the published process.

## 4. Pennsylvania — use the actual service rule and deliver the selected waiver branch

### Repository finding

`data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/participant-instructions.md` says the service method is not established, directs filing of a blank order, and says the IFP motion is held only as source evidence and is not generated. The conditional waiver branch therefore cannot be treated as a delivered motion merely because its source hash exists.

### Official evidence

Rule 790 treats its petition as a motion for Rules 575–577 and expressly points to Rule 576 for service. It requires service on the Commonwealth with filing and generally a PSP criminal history obtained within the preceding 60 days unless waived by the Commonwealth [PA1].

Rule 576 supplies actual methods, including mailing a copy to the party's attorney. It also requires service on the court administrator and a signed certificate identifying service details and recipient contact information; e-filing has its separate rule [PA2].

The AOPC forms page expressly says the blank expungement order is **not mandatory**. It also publishes the Common Pleas IFP motion [PA3]. The inspected motion, **CPCMS 2046**, has two pages, financial questions and an unsworn-falsification verification, not a notary block [PA4].

### Proposed participant copy

> **Filing and service.** File the Rule 790 petition with the clerk of courts in the judicial district where the charges were disposed. Serve the attorney for the Commonwealth at the same time. Follow Rule 576 for the method, service on the court administrator, and the certificate documenting actual service. Mailing to the proper attorney's office is an available paper-service method. Confirm the recipients' current addresses; follow the applicable electronic-filing rule when filing electronically.
>
> **Order and costs.** The blank proposed order is optional, not a filing prerequisite. Confirm the filing charge with the filing office. When requesting permission to proceed without paying because you cannot afford the fee, complete and submit the Common Pleas Motion to Proceed In Forma Pauperis. Use your actual financial information. The judge decides the request; submitting it is not an approval.

### Implementation

Render the IFP motion when the participant selects that branch. Do not invent financial zeros, execute a verification for the participant, or mark public-access-policy compliance without performing the applicable checks. If no waiver is requested, preserve the conditional exclusion. An optional proposed order may remain in a convenience packet, correctly labeled.

Update the existing service certificate rather than create a competing one. Rule 576 requires the date/manner and recipient names, addresses and telephone numbers. Service facts are completed after service, not pre-certified. Preserve the current source and component identity. A specimen is supplied in `Pennsylvania_Rule_790_Service_Copy.md`.

**Still outstanding:** actual county fee and address data, any applicable electronic-filing choice, current source binding, and acceptance of the changed outputs. Do not fabricate a statewide filing price or remove an artifact-specific approval hold on this research alone.

## Handoff boundary

These findings should become bounded corrections in existing work, not four new audit campaigns. Compare against newer records, keep the current owner of each shared builder, and fix all known in-scope issues before rerendering. Changed artifacts receive the existing current-byte acceptance. Research status, implementation status, and acceptance status remain distinct.

No original issuer PDF was acquired into this package: browser PDF text/images were inspected, but the working container's download attempts failed DNS resolution. `Download_Attempts.json` records those failures. No issuer hash is invented. The source index provides exact URLs and printed revisions to support reuse or acquisition through the Captain's existing source mechanism.

## Source index

- **NC1**: [NC Judicial Branch: Expunctions, filing fee question and linked indigency petition](https://www.nccourts.gov/help-topics/court-records/expunctions). Official webpage retrieved; its fee-waiver link followed to AOC-G-106.
- **NC2**: [AOC-G-106, Petition to Proceed as an Indigent, Rev. 11/24](https://www.nccourts.gov/assets/documents/forms/g106ff%2010-25-2024.pdf?VersionId=pWEgUyskv7C0ph8Hpo.ql0cZ16GxWaPs). Official PDF text and screenshots of both pages inspected.
- **NC3**: [AOC-CV-226, Civil Affidavit of Indigency, Rev. 4/23](https://www.nccourts.gov/assets/documents/forms/cv226_1.pdf?VersionId=fyKKNw_0bAqHtDZYoFe.WzU5Ya1oDibo). Official PDF text and screenshots of both pages inspected. Arbitration-fee wording appears on side two.
- **NC4**: [NC Judicial Branch: Court Costs, additional financial information](https://www.nccourts.gov/help-topics/fees-and-payments/court-costs). Official webpage retrieved; supplemental affidavit link followed to AOC-CV-226. General noncriminal-cost guidance, not a universal expunction-specific mandate.
- **NC5**: [N.C.G.S. 15A-146](https://www.ncleg.gov/enactedlegislation/statutes/html/bysection/chapter_15a/gs_15a-146.html). Current official statutory text retrieved.
- **NC6**: [AOC-CR-287, Petition and Order of Expunction, Rev. 12/25](https://www.nccourts.gov/assets/documents/forms/cr287_5.pdf?VersionId=i8vcDwdQdPLKFLV9zLnYz8xmj2zMLajv). Official PDF text and screenshots of both pages inspected.
- **NC7**: [AOC-CR-287 instructions, Rev. 12/25](https://www.nccourts.gov/assets/documents/forms/cr287-instr_3.pdf?VersionId=KdBrjd7dOC8zgSkKoCyOfwRvHvg93ilX). Official PDF text and page screenshot inspected.
- **VA1**: [Va. Code 19.2-298.02(D), current and December 1, 2026 versions](https://law.lis.virginia.gov/vacodeupdates/title19.2/section19.2-298.02/). Both official versions retrieved; current September 6, 2026 wording distinguished from future text.
- **VA2**: [Va. Code 19.2-392.2, current and December 1, 2026 versions](https://law.lis.virginia.gov/vacodeupdates/title19.2/section19.2-392.2/). Both official versions retrieved; current September 6, 2026 wording controls this batch.
- **VA3**: [CC-1473, Petition for Expungement Filed in a Circuit Court, Rev. 07/26](https://www.vacourts.gov/forms/circuit/cc1473.pdf). Official PDF text and screenshots of both pages inspected.
- **MA1**: [BMC Amended Standing Order 1-09, effective May 10, 2024](https://www.mass.gov/districtmunicipal-court-rules/boston-municipal-court-amended-standing-order-1-09-sealing-three-or-more-eligible-criminal-records). Full official-source text returned through indexed search, including sections I-III.F. Direct open failed; no original webpage bytes downloaded.
- **MA2**: [Massachusetts Court System: Request to seal your criminal record](https://www.mass.gov/how-to/request-to-seal-your-criminal-record). Full official-source text returned through indexed search, including fees and BMC process. Direct open failed.
- **MA3**: [G.L. c. 276, section 100C](https://malegislature.gov/Laws/GeneralLaws/PartIV/TitleII/Chapter276/Section100C). Official statutory text retrieved. No independent disposition of first-paragraph case-law procedure is made in this batch.
- **PA1**: [Pa.R.Crim.P. 790](https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/234/chapter7/s790.html). Current official rule and Comment retrieved.
- **PA2**: [Pa.R.Crim.P. 576](https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/234/chapter5/s576.html). Current official rule and Comment retrieved.
- **PA3**: [AOPC public forms: Expungements and In Forma Pauperis](https://www.pacourts.us/forms/for-the-public). Official forms index retrieved; note explaining proposed orders are optional read; Common Pleas IFP link followed.
- **PA4**: [CPCMS 2046, Motion to Proceed In Forma Pauperis](https://www.pacourts.us/Storage/media/pdfs/20210515/215517-file-6679.pdf). Official PDF text and screenshots of both pages inspected. No new printed revision date asserted.
