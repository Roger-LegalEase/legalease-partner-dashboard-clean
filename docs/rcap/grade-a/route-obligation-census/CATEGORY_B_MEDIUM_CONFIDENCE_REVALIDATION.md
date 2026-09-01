# Category B — medium-confidence exclusions, for revalidation

55 routes. The exact Category B exclusions the census flagged at medium confidence — it excluded them and said it was not sure. Handed over as rows rather than as a filter over a 694-row ledger.

**Source:** `data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json` at blob `0673c2e3ca934ff7e20fd5abc3214eebf7bb6148`
**Captain head:** `1b0ce4de0c56ce88853e53bbed42016e33a91227`

This is a packaging record. It makes no legal determination. It opens no route and closes none. It changes no commercial state. It does not alter the source ledger.

> Not the 86-question unresolved-legal-review queue, which is a separate assignment with a different population. No row here comes from it, and no synthetic QUESTION-n key is used: every row is keyed by its own routeKey.

## AK

### Agency Confidentiality Of Non-Conviction Records

- **routeKey:** `obligation:track-only:AK:ak-nonconviction-confidential`
- **Authority:** AS 12.62.160(b)(8); 13 AAC 68.310
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

## CA

### Check whether your conviction was already relieved

- **routeKey:** `obligation:track-only:CA:ca-auto-conviction`
- **Authority:** Cal. Penal Code § 1203.425; AB 1076 (2019), effective 1 July 2022, records back to 1 January 2021; AB 145 (2021), effective 1 July 2022, records back to 1 January 1973; SB 731 (2022) and AB 567 (2023), made effective 1 October 2024 by AB 168 (2024); Cal. Penal Code § 1203.425(b), the prosecutor block
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Check whether your arrest was already sealed

- **routeKey:** `obligation:track-pathway:CA:ca-auto-arrest:tool-2-automatic-relief`
- **Authority:** Cal. Penal Code § 851.93; Cal. Penal Code § 851.93(e), the saving clause preserving the petition routes; SB 393 (Lara, 2017)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## CO

### Automatic Sealing, Arrest With No Charges Filed

- **routeKey:** `obligation:track-only:CO:co_auto_seal_arrest`
- **Authority:** C.R.S. § 24-72-704(1.5) and (2)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Automatic Sealing At Disposition, Non-Convictions

- **routeKey:** `obligation:track-only:CO:co_auto_seal_nonconviction`
- **Authority:** C.R.S. § 24-72-705(1)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## CT

### Records erased after a dismissal or a not guilty finding

- **routeKey:** `obligation:track-only:CT:ct-nonconviction-auto`
- **Authority:** C.G.S. § 54-142a(a), cases on or after 1 October 1969; C.G.S. § 54-142a(b), cases before 1 October 1969; C.G.S. § 54-142a(g)(2), legal effect of erasure
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Clean Slate erasure for offenses from 2000 onward

- **routeKey:** `obligation:track-pathway:CT:ct-cleanslate-auto:automatic-clean-slate-erasure-for-eligible-post-2000-convictions`
- **Authority:** C.G.S. § 54-142a(e)(1)(A)(i)(I) and (ii)(I); C.G.S. § 54-142t(a), the automation duty; C.G.S. § 54-142a(e)(1)(B), classification under the law in effect when the offense was committed; C.G.S. § 54-142a(e)(2), exclusions; C.G.S. § 54-142a(e)(3), completion requirements; C.G.S. § 54-142a(e)(4), cannabis carve-out from the clock; C.G.S. § 54-142a(i)(1), the multi-count and multi-defendant bar; Public Act 21-42, amended by P.A. 23-134
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Records erased after finishing a diversionary program

- **routeKey:** `obligation:track-pathway:CT:ct-diversion:automatic-non-conviction-erasure-under-conn-gen-stat-54-142a`
- **Authority:** C.G.S. § 54-142a(a), erasure following the dismissal; C.G.S. § 54-56e, Accelerated Rehabilitation; C.G.S. § 46b-38c, Family Violence Education Program; C.G.S. § 54-56g, Impaired Driver Intervention Program; C.G.S. § 54-56l, supervised diversionary program
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## DC

### Automatic Expungement

- **routeKey:** `obligation:track-pathway:DC:dc_auto_expungement:dc_auto_expungement_16_802`
- **Authority:** D.C. Code § 16-802, as enacted by the Second Chance Amendment Act of 2022 (D.C. Law 24-284) and amended by D.C. Law 25-175
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Automatic sealing, non-convictions and 10-year misdemeanor convictions

- **routeKey:** `obligation:track-pathway:DC:dc_auto_sealing:dc_auto_sealing_16_805`
- **Authority:** D.C. Code § 16-805, as amended by D.C. Law 25-175 and D.C. Law 26-52
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## DE

### Automatic Expungement

- **routeKey:** `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a`
- **Authority:** 11 Del. C. § 4373A, added by the Clean Slate Act
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## IL

### Checking whether your old cannabis arrest was already cleared automatically

- **routeKey:** `obligation:track-pathway:IL:il-cannabis-auto:cannabis-specific-automatic-or-petition-expungement`
- **Authority:** 20 ILCS 2630/5.2(i)(1); 20 ILCS 2630/5.2(a)(2.5); 20 ILCS 2630/5.2(a)(1)(G-5); 20 ILCS 2630/5.2(i)(8); 20 ILCS 2630/5.2(i)(11); 410 ILCS 705/10-5
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Automatic sealing of Class 4 felony prostitution records by January 2028

- **routeKey:** `obligation:track-pathway:IL:il-prostitution-j-auto:felony-prostitution-relief`
- **Authority:** 20 ILCS 2630/5.2(j)(1); 20 ILCS 2630/5.2(j)(2); 20 ILCS 2630/5.2(j)(6); 20 ILCS 2630/5.2(c)(2); 20 ILCS 2630/5.2(a)(3)(C)(i)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## IN

### Automatic clearing of a case that ended without a conviction

- **routeKey:** `obligation:track-only:IN:in_auto_expungement`
- **Authority:** I.C. 35-38-9-1(b); I.C. 35-38-9-1(a); I.C. 35-38-9-1(e); I.C. 35-38-9-1(f); I.C. 35-38-9-1(k)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## KY

### Check whether your dismissed or acquitted Kentucky case already cleared itself

- **routeKey:** `obligation:track-only:KY:ky_automatic_nonconviction_expungement_verification`
- **Authority:** KRS 431.076(1)(a); KRS 431.076(4); KRS 431.076(5)(a); KRS 431.076(6); KRS 431.076(8)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Work out what your diverted Kentucky case counts as

- **routeKey:** `obligation:track-only:KY:ky_diversion_disposition_routing`
- **Authority:** KRS 533.258(1); KRS 533.258(2); KRS 533.258(3); KRS 533.250(1)(f); KRS 431.076
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## MD

### Automatic clearing of police records after you were released without being charged

- **routeKey:** `obligation:track-only:MD:md_10103_1_automatic`
- **Authority:** Md. Code, Crim. Proc. § 10-103.1
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Clearing a case the State dropped before you were ever served

- **routeKey:** `obligation:track-only:MD:md_10104_pre_service`
- **Authority:** Md. Code, Crim. Proc. § 10-104
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

### Checking whether the one-time cannabis clearing already covered your case

- **routeKey:** `obligation:track-only:MD:md_10112_dpscs_cannabis`
- **Authority:** Md. Code, Crim. Proc. § 10-112
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

### Automatic clearing of a case that ended without a conviction

- **routeKey:** `obligation:track-pathway:MD:md_10105_1_automatic:automatic-expungement-under-crim-proc-10-105-1`
- **Authority:** Md. Code, Crim. Proc. § 10-105.1; Md. Code, Crim. Proc. § 10-105.2
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## ME

### Cases resolved through a deferred disposition

- **routeKey:** `obligation:track-only:ME:me-deferred`
- **Authority:** 17-A M.R.S. ch. 67, subch. 4; 17-A M.R.S. § 1901; 17-A M.R.S. § 1903; 17-A M.R.S. former ch. 54-F; 15 M.R.S. § 2262(3); 16 M.R.S. § 703
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

## MI

### Clearing fingerprints and an arrest card after a case ended in your favour

- **routeKey:** `obligation:track-only:MI:mi_arrest_acquittal_dismissal`
- **Authority:** MCL 28.243(8); MCL 28.243(9); MCL 28.243(10); MCL 28.243(14); MCL 769.16a
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Clearing fingerprints and an arrest card when you were never charged

- **routeKey:** `obligation:track-only:MI:mi_arrest_no_charge`
- **Authority:** MCL 28.243
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

### Lower-level misdemeanours that clear on their own

- **routeKey:** `obligation:track-only:MI:mi_auto_misd92`
- **Authority:** MCL 780.621g(1); MCL 780.621g(3); MCL 780.621g(5); MCL 780.621h
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Higher-level misdemeanours that clear on their own

- **routeKey:** `obligation:track-only:MI:mi_auto_misd93`
- **Authority:** MCL 780.621g(4); MCL 780.621g(5); MCL 780.621g(10); MCL 780.621h
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### What a completed deferral means for clearing your record

- **routeKey:** `obligation:track-only:MI:mi_deferral_status`
- **Authority:** MCL 333.7411; MCL 762.11 to 762.15; MCL 769.4a; MCL 436.1703; MCL 600.1070; MCL 600.1209; MCL 750.350a; MCL 750.430; MCL 780.621(2); MCL 780.621d(7)(d)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

### Felony convictions that clear on their own

- **routeKey:** `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g`
- **Authority:** MCL 780.621g(2); MCL 780.621g(5); MCL 780.621g(10); MCL 780.621h
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## MN

### Cannabis Expungement Board review of a felony cannabis record

- **routeKey:** `obligation:track-only:MN:mn_ceb_felony_cannabis`
- **Authority:** Minn. Stat. ch. 609A; Laws 2023, ch. 63
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Destroying fingerprints and photographs taken under someone else's identity

- **routeKey:** `obligation:track-only:MN:mn_mistaken_identity_iddata`
- **Authority:** Minn. Stat. § 299C.11
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Records that clear automatically after a pardon

- **routeKey:** `obligation:track-only:MN:mn_pardon_auto_expungement`
- **Authority:** Minn. Stat. ch. 638; Minn. Stat. ch. 609A
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## MO

### Drug records that clear themselves

- **routeKey:** `obligation:track-pathway:MO:mo-610-141-automatic-drug:state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141`
- **Authority:** Mo. Rev. Stat. § 610.141 (enacted 2026); Mo. Rev. Stat. § 610.143 (enacted 2026); Mo. Rev. Stat. § 610.144 (enacted 2026); Mo. Rev. Stat. § 610.120; Mo. Rev. Stat. § 610.140; Mo. Rev. Stat. § 195.202 (as it existed prior to 1 January 2017); Mo. Rev. Stat. § 195.233 (as it existed prior to 1 January 2017); Mo. Rev. Stat. § 579.015; Mo. Rev. Stat. § 579.074; Mo. Rev. Stat. §§ 43.500 to 43.530; CCS SS SB 1421, 103rd General Assembly, Second Regular Session (2026), file 5940S.07T
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## MT

### Automatic non-conviction removal

- **routeKey:** `obligation:track-only:MT:mt_auto_nonconviction`
- **Authority:** Mont. Code Ann. § 44-5-202; Mont. Code Ann. § 44-5-213; Ch. 321, L. 2017
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## NC

### Your dismissed North Carolina case may have cleared itself

- **routeKey:** `obligation:track-only:NC:nc_auto_146_a4`
- **Authority:** N.C. Gen. Stat. § 15A-146(a4); N.C. Gen. Stat. § 15A-150; N.C. Gen. Stat. § 15A-151(a1); N.C. Gen. Stat. § 15A-153
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## NE

### Where to go about restoring firearm rights in Nebraska

- **routeKey:** `obligation:track-only:NE:ne-firearm-restoration-routing`
- **Authority:** Neb. Rev. Stat. § 83-1,130(2); Neb. Rev. Stat. § 29-2264(5)(c); Neb. Rev. Stat. § 29-2264(6)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

### Where to go about a record from outside Nebraska

- **routeKey:** `obligation:track-only:NE:ne-out-of-jurisdiction-routing`
- **Authority:** Neb. Rev. Stat. § 29-3523
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

### Where to go about a Nebraska juvenile record

- **routeKey:** `obligation:track-pathway:NE:ne-juvenile-sealing-routing:juvenile-automatic-sealing`
- **Authority:** Neb. Rev. Stat. § 43-2,108.01; Neb. Rev. Stat. § 43-2,108.03; Neb. Rev. Stat. § 43-2,108.05
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Check whether your Nebraska non-conviction record came off the public record

- **routeKey:** `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing`
- **Authority:** Neb. Rev. Stat. § 29-3523(1); Neb. Rev. Stat. § 29-3523(2); Neb. Rev. Stat. § 29-3523(3); Neb. Rev. Stat. § 29-3523(7); Neb. Rev. Stat. § 29-3523(8); Neb. Rev. Stat. § 29-3527; State v. Coble, 299 Neb. 434 (2018)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## NH

### Your vacated New Hampshire conviction should clear itself

- **routeKey:** `obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction`
- **Authority:** RSA 651:5, II-a(b); RSA 651:5, X; RSA 651:5, XI(b)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## NJ

### New Jersey's automatic record clearing, and where it stands

- **routeKey:** `obligation:track-only:NJ:nj_automated_clean_slate`
- **Authority:** N.J.S.A. 2C:52-5.4; N.J.S.A. 2C:52-5.3; N.J.S.A. 2C:52-2(b); N.J.S.A. 2C:52-2(c); P.L.2019, c.269
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## NY

### New York DWAI records and Clean Slate

- **routeKey:** `obligation:track-only:NY:ny_clean_slate_dwai`
- **Authority:** N.Y. Crim. Proc. Law § 160.57(1)(a); N.Y. Veh. & Traf. Law § 1192(1); N.Y. Crim. Proc. Law § 160.55
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### New York Clean Slate

- **routeKey:** `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57`
- **Authority:** N.Y. Crim. Proc. Law § 160.57(1)(b); N.Y. Correct. Law § 168-a; N.Y. Penal Law art. 220; L.2023 ch.631
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

## PA

### Check whether Clean Slate has sealed your record automatically

- **routeKey:** `obligation:track-pathway:PA:pa_9122_2_clean_slate:path-j-clean-slate-automatic-limited-access`
- **Authority:** 18 Pa.C.S. § 9122.2; 18 Pa.C.S. § 9122.3; 18 Pa.C.S. § 9102; 18 Pa.C.S. § 9122.5
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## UT

### Utah clears acquittals and dismissals automatically

- **routeKey:** `obligation:track-pathway:UT:ut_auto_nonconviction:path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice`
- **Authority:** Utah Code 77-40a-206; Utah Code 77-40a-204; Utah Code 77-40a-204(3)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Utah deletes old traffic cases automatically

- **routeKey:** `obligation:track-pathway:UT:ut_auto_traffic:path-i-traffic-offense-expungement-or-deletion`
- **Authority:** Utah Code 77-40a-202; Utah Code 77-40a-101; Utah Code 77-40a-204
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## VA

### A Virginia misdemeanour charge that ended without a conviction, for someone with no other record

- **routeKey:** `obligation:track-only:VA:va_auto_seal_clean_record`
- **Authority:** Va. Code § 19.2-392.11; Va. Code § 17.1-502(B1); Va. Code § 19.2-392.13
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Virginia charges that ended without a conviction can seal themselves

- **routeKey:** `obligation:track-only:VA:va_auto_seal_nonconvictions`
- **Authority:** Va. Code § 19.2-392.8; Va. Code § 19.2-392.10; Va. Code § 19.2-392.13; Va. Code § 19.2-392.2
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Old Virginia marijuana possession charges and traffic infractions are already sealed

- **routeKey:** `obligation:track-only:VA:va_auto_seal_without_order`
- **Authority:** Va. Code § 19.2-392.6:1; Va. Code § 19.2-392.17; Va. Code § 19.2-392.12:1(B); Va. Code § 19.2-392.13
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Clearing a Virginia conviction vacated by a writ of actual innocence

- **routeKey:** `obligation:track-only:VA:va_exp_actual_innocence`
- **Authority:** Va. Code § 19.2-392.2(J); Va. Code § 19.2-392.2(K); Va. Code § 19.2-327.5; Va. Code § 19.2-327.13
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

### Some minor Virginia convictions seal themselves after seven clean years

- **routeKey:** `obligation:track-pathway:VA:va_auto_seal_convictions:automatic-sealing-no-filing`
- **Authority:** Va. Code § 19.2-392.6(A); Va. Code § 19.2-392.6(B); Va. Code § 19.2-392.6(C); Va. Code § 19.2-392.6(D); Va. Code § 19.2-392.7; Va. Code § 19.2-390(A); Va. Code § 19.2-392.13
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## VT

### Records cleared after completing court diversion on a charge

- **routeKey:** `obligation:track-only:VT:vt_diversion_post_charge`
- **Authority:** 3 V.S.A. § 164; 3 V.S.A. § 164(f); 3 V.S.A. § 164(f)(5)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

### Records deleted after completing pre-charge diversion

- **routeKey:** `obligation:track-only:VT:vt_diversion_pre_charge`
- **Authority:** 3 V.S.A. § 164; 3 V.S.A. § 164(f)(1); 3 V.S.A. § 164(f)(4)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

## WI

### Complete an expungement the judge already ordered

- **routeKey:** `obligation:track-only:WI:wi_exp_certificate_of_discharge`
- **Authority:** Wis. Stat. § 973.015(1m); Wis. Stat. § 973.015(1m)(b)
- **Process actor:** agency · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AGENCY_CONTROLLED

## WV

### Before you file: what West Virginia checks on a non-conviction expungement

- **routeKey:** `obligation:track-only:WV:wv_common_nc_procedure`
- **Authority:** W. Va. Code § 61-11-25(a); W. Va. Code § 61-11-25(b); W. Va. Code § 61-11-25(c); W. Va. Code § 61-11-25(d); W. Va. Code § 61-11-25(e); W. Va. Code § 61-11-25(f); W. Va. Code § 61-11-25(g); W. Va. Code § 61-11-22; W. Va. Code § 61-11-22a; W. Va. Code § 17C-5-2b
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### An under-21 first alcohol-driving charge that the court clears itself when you finish the test and lock program

- **routeKey:** `obligation:track-only:WV:wv_dui_test_and_lock_dismissal`
- **Authority:** W. Va. Code § 17C-5-2(j)(1); W. Va. Code § 17C-5-2(a)(5); W. Va. Code § 17C-5A-3a; W. Va. Code § 17C-5-2(j)(3); W. Va. Code § 61-11-26b
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** AUTOMATIC

### Before you file: West Virginia gives you one conviction expungement, ever

- **routeKey:** `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26`
- **Authority:** W. Va. Code § 61-11-26(a); W. Va. Code § 61-11-26(b); W. Va. Code § 61-11-26(c); W. Va. Code § 61-11-26(d); W. Va. Code § 61-11-26(e); W. Va. Code § 61-11-26(f); W. Va. Code § 61-11-26(g); W. Va. Code § 61-11-26(h); W. Va. Code § 61-11-26(i); W. Va. Code § 61-11-26(j); W. Va. Code § 61-11-26(k); W. Va. Code § 61-11-26(l); W. Va. Code § 61-11-26(n); W. Va. Code § 61-11-26(o); W. Va. Code § 61-11-26(p); W. Va. Code § 61-11-26a; W. Va. Code § 61-11-26b; W. Va. Code § 59-1-11(a)(1)
- **Process actor:** court · **participant can initiate:** false
- **Destination:** [object Object]
- **Current output strategy:** process_guidance
- **Why excluded (medium confidence):** COURT_INITIATED

