/**
 * THE DELAWARE SUPERIOR COURT EXPUNGEMENT FORMS, READ ONCE.
 *
 * `de_pardon_expungement-set` and `de_discretionary_superior_court-set` are two
 * routes with two different proposed orders and one shared required primary
 * filing: CIV_EXP_02_A, the Superior Court's Petition for Expungement of Adult
 * Record, updated 6/12/2024. Both families' committed manifests name it, both
 * MASTER_QUEUE rows bind it at the same digest
 * f2820f713b9f8e0fb1c0095886e7184d56fda06eef7f65af014ab48922b7839a, and the
 * acquisition receipt for DE-CIV-EXP-02-A records the relationship in terms:
 * "Shared parent petition; acquire once and bind to two families."
 *
 * So it is read once, here. Two builders reading a 44-blank sworn petition
 * independently is two chances to classify the same blank two ways, and the
 * blank most likely to be classified two ways is the one that matters most:
 * the four ruled lines of the manifest-injustice statement, whose printed
 * caption contains the word "Petitioner" and therefore matches the full-name
 * descriptor in the shared registry. A builder that let that caption decide
 * would print the participant's own name four times where the substance of
 * their petition belongs. That is the WV defect PF04 recorded
 * (DEFECTS_NO_COUNTER_CAN_SEE `map-honest-writes-not`) arriving on a different
 * form, and it is refused here once for both families, by ROLE, which is tested
 * before any caption and cannot be overridden by one.
 *
 * WHAT THIS BUILD WRITES ON A SWORN PETITION, AND WHAT IT WILL NOT
 *
 * It writes the caption block and nothing else: the petitioner's name, street
 * address, city/state/zip, date of birth, telephone number, the criminal case
 * number, and the petitioner's name again in the recital sentence the form
 * prints as "Pursuant to 11 Del. C. § 4374, ______ (Petitioner), hereby
 * petitions Superior Court for expungement of the following case(s)".
 *
 * IT LEAVES THE ENTIRE CHARGE TABLE BLANK, and that is the committed record's
 * own instruction rather than a shortfall. The track registry for
 * de_discretionary_superior_court records, as a counsel classification,
 * "History-dependent fields may be left as manual completion items. Counsel
 * classified this as an item the participant completes"; its packetInstructions
 * say "LegalEase must not represent that it confirmed charge-level
 * eligibility", "The certified criminal history must be dated within 45 days.
 * The court shall summarily reject any petition without it", and "Generate the
 * court packet without collecting or reviewing the certified SBI history."
 * Both families' packet-set manifests require the participant to check their
 * charge answers against that certified history and correct the packet if they
 * disagree.
 *
 * The shared field semantics reach the same answer from the other direction:
 * `protectCategoryOf("Disposition")` and `protectCategoryOf("Disposition
 * Date")` are both `disposition_or_hearing`, so a disposition is a court fact
 * this factory does not write on any form. A table filled with case numbers,
 * charges and offence dates over two empty disposition columns would be a
 * half-completed sworn list, which is worse than an empty one: the completeness
 * contract calls a written row with a missing REQUIRED_KNOWN cell an incomplete
 * row, and a court reads it as an assertion about charges whose outcomes the
 * petitioner declined to state.
 *
 * THE FORM'S STATUTORY CAPTION AND THE § 4375 ROUTE
 *
 * CIV_EXP_02_A is captioned to 11 Del. C. § 4374. `de_pardon_expungement-set`
 * files under § 4375. That is not this build's inference: the committed track
 * registry carries it as a build_blocker on the eligibility branch (DE-5) and
 * as a manual completion item -- "Statement of the § 4375 basis in the body of
 * the petition ... The form is captioned to § 4374 only, so the § 4375 basis
 * has to be stated in the body." Under the build-first review model a
 * build_blocker on an eligibility branch is not a stop; it is carried into the
 * approval request as a counsel question and into the participant guide as a
 * required-before-filing item, and this build does not write a § 4375 recital
 * onto a form that prints § 4374.
 */

/*
 * THE PRINTED CAPTION OF EVERY FILLABLE BLANK ON EACH PINNED DELAWARE BINARY.
 *
 * Every blank of every form this build censuses appears here, not only the ones
 * whose capture is wrong. A caption is not decoration: rcap-field-semantics
 * matches it against the protect rules AND against the descriptor registry
 * before it matches a field name, so a caption belonging to another blank does
 * not merely mislabel this one -- it decides it. Pinning all of them means a
 * later change in the shared capture stops this build instead of quietly
 * rebinding a blank on a sworn petition.
 *
 * capturedLabel is what scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs
 * returns for that widget today, and the core refuses to apply a correction
 * whose recorded capture no longer matches. measuredLabel is what the form
 * prints, read with pdftotext -layout and located by word box with
 * pdftotext -bbox-layout over the unlocked derivative, which is proved content
 * stream for content stream identical to the pinned official binary.
 */
export const DE_CAPTION_CORRECTIONS = {
  /* CIV_EXP_02_A: 44 blanks; the shared capture agrees with the printed page on 3 of them. */
  "CIV_EXP_02_A": {
    "Petitioner": {
      capturedLabel: null,
      measuredLabel: "Petitioner",
      measuredAt:
        "page 1 widget rect x[44.40,263.52] y[703.80,720.48]; the form's own printed text reads 'Petitioner' at x[50.64,84.51] y[717.87,728.84]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "New Castle County": {
      capturedLabel: null,
      measuredLabel: "New Castle County",
      measuredAt:
        "page 1 widget rect x[278.04,288.00] y[704.64,714.60]; the form's own printed text reads 'New Castle County' at x[291.96,382.45] y[702.22,716.48]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Kent County": {
      capturedLabel: "Wilmington, DE 19801",
      measuredLabel: "Kent County",
      measuredAt:
        "page 1 widget rect x[278.04,288.00] y[667.44,677.40]; the form's own printed text reads 'Kent County' at x[291.96,351.37] y[665.02,679.28]; the shared capture returned \"Wilmington, DE 19801\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Sussex County": {
      capturedLabel: "Telephone #",
      measuredLabel: "Sussex County",
      measuredAt:
        "page 1 widget rect x[278.04,288.00] y[630.36,640.32]; the form's own printed text reads 'Sussex County' at x[291.96,364.09] y[627.94,642.20]; the shared capture returned \"Telephone #\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Street Address including Apt": {
      capturedLabel: "%¡ New Castle County Crim. Case No",
      measuredLabel: "Street Address (including Apt)",
      measuredAt:
        "page 1 widget rect x[44.40,263.52] y[679.08,695.76]; the form's own printed text reads 'Street Address (including Apt)' at x[50.64,156.99] y[693.15,704.12]; the shared capture returned \"%¡ New Castle County Crim. Case No\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Crim Case No": {
      capturedLabel: null,
      measuredLabel: "Crim. Case No.",
      measuredAt:
        "page 1 widget rect x[466.32,566.52] y[677.76,706.56]; the form's own printed text reads 'Crim. Case No.' at x[485.52,547.18] y[704.24,716.52]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "PO Box Number": {
      capturedLabel: "Wilmington, DE 19801",
      measuredLabel: "P.O. Box Number",
      measuredAt:
        "page 1 widget rect x[44.40,263.52] y[654.36,671.04]; the form's own printed text reads 'P.O. Box Number' at x[50.64,113.43] y[668.43,679.40]; the shared capture returned \"Wilmington, DE 19801\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CityStateZip Code": {
      capturedLabel: "102 W. Water Street",
      measuredLabel: "City/State/Zip Code",
      measuredAt:
        "page 1 widget rect x[44.40,263.52] y[629.52,646.32]; the form's own printed text reads 'City/State/Zip Code' at x[50.64,120.14] y[643.71,654.68]; the shared capture returned \"102 W. Water Street\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Civil Petition No": {
      capturedLabel: "Georgetown, DE 19947",
      measuredLabel: "Civil Petition No.",
      measuredAt:
        "page 1 widget rect x[466.56,566.28] y[603.60,664.92]; the form's own printed text reads 'Civil Petition No.' at x[483.36,549.47] y[662.60,674.88]; the shared capture returned \"Georgetown, DE 19947\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Attorney Name if any": {
      capturedLabel: "Georgetown, DE 19947",
      measuredLabel: "Attorney Name (if any)",
      measuredAt:
        "page 1 widget rect x[44.40,263.52] y[579.96,596.76]; the form's own printed text reads 'Attorney Name (if any)' at x[50.64,130.84] y[594.15,605.12]; the shared capture returned \"Georgetown, DE 19947\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Date of Birth": {
      capturedLabel: "%¡ Sussex County",
      measuredLabel: "Date of Birth",
      measuredAt:
        "page 1 widget rect x[44.40,143.71] y[605.72,621.48]; the form's own printed text reads 'Date of Birth' at x[50.64,95.18] y[618.87,629.84]; the shared capture returned \"%¡ Sussex County\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Telephone": {
      capturedLabel: "Attorney Name (if any)",
      measuredLabel: "Telephone #",
      measuredAt:
        "page 1 widget rect x[158.22,262.10] y[604.30,621.89]; the form's own printed text reads 'Telephone #' at x[160.80,198.62] y[618.87,629.84]; the shared capture returned \"Attorney Name (if any)\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Yes": {
      capturedLabel: "Interpreter needed?",
      measuredLabel: "Interpreter needed?",
      measuredAt:
        "page 1 widget rect x[138.10,152.14] y[568.63,577.99]; the form's own printed text reads 'Interpreter needed?' at x[46.44,134.16] y[566.52,580.12]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "No": {
      capturedLabel: "Interpreter needed?  %¡  Yes",
      measuredLabel: "Interpreter needed?",
      measuredAt:
        "page 1 widget rect x[182.91,196.95] y[568.63,577.99]; the form's own printed text reads 'Interpreter needed?' at x[46.44,134.16] y[566.52,580.12]; the shared capture returned \"Interpreter needed?  %¡  Yes\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Language": {
      capturedLabel: "Interpreter",
      measuredLabel: "Language",
      measuredAt:
        "page 1 widget rect x[93.28,262.10] y[554.00,568.85]; the form's own printed text reads 'Language' at x[46.44,90.85] y[554.64,568.24]; the shared capture returned \"Interpreter\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "expungement of the following cases and the charge or set of charges related to that cases from his or her criminal record Each": {
      capturedLabel: ",",
      measuredLabel: "Pursuant to 11 Del. C.",
      measuredAt:
        "page 1 widget rect x[174.96,373.08] y[532.20,544.56]; the form's own printed text reads 'Pursuant to 11 Del. C.' at x[45.72,134.38] y[531.32,543.60]; the shared capture returned \",\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID  or Criminal Case Row1": {
      capturedLabel: "Case ID # or Criminal Case # Charge Offense Date Disposition",
      measuredLabel: "Case ID # or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[40.92,174.60] y[476.40,490.20]; the form's own printed text reads 'Case ID # or Criminal Case #' at x[45.96,155.61] y[490.27,502.56]; the shared capture returned \"Case ID # or Criminal Case # Charge Offense Date Disposition\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "ChargeRow1": {
      capturedLabel: "Case ID # or Criminal Case #",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[175.92,296.16] y[476.40,490.20]; the form's own printed text reads 'Charge' at x[176.04,203.49] y[161.48,173.76]; the shared capture returned \"Case ID # or Criminal Case #\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow1": {
      capturedLabel: "Case ID # or Criminal Case # Charge Offense Date Disposition",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[297.48,381.60] y[476.40,490.20]; the form's own printed text reads 'Offense Date' at x[302.40,355.52] y[490.27,502.56]; the shared capture returned \"Case ID # or Criminal Case # Charge Offense Date Disposition\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition DateRow1": {
      capturedLabel: "Offense Date",
      measuredLabel: "Disposition Date",
      measuredAt:
        "page 1 widget rect x[382.92,467.16] y[476.40,490.20]; the form's own printed text reads 'Disposition Date' at x[387.96,453.56] y[490.27,502.56]; the shared capture returned \"Offense Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "DispositionRow1": {
      capturedLabel: "Disposition Date",
      measuredLabel: "Disposition",
      measuredAt:
        "page 1 widget rect x[468.48,588.60] y[476.40,490.20]; the form's own printed text reads 'Disposition' at x[387.96,432.08] y[490.27,502.56]; the shared capture returned \"Disposition Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID  or Criminal Case Row2": {
      capturedLabel: null,
      measuredLabel: "Case ID # or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[40.92,174.60] y[461.40,475.32]; the form's own printed text reads 'Case ID # or Criminal Case #' at x[45.96,155.61] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow2": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[175.92,296.16] y[461.40,475.32]; the form's own printed text reads 'Charge' at x[176.04,203.49] y[161.48,173.76]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow2": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[297.48,381.60] y[461.40,475.32]; the form's own printed text reads 'Offense Date' at x[302.40,355.52] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition DateRow2": {
      capturedLabel: null,
      measuredLabel: "Disposition Date",
      measuredAt:
        "page 1 widget rect x[382.92,467.16] y[461.40,475.32]; the form's own printed text reads 'Disposition Date' at x[387.96,453.56] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "DispositionRow2": {
      capturedLabel: null,
      measuredLabel: "Disposition",
      measuredAt:
        "page 1 widget rect x[468.48,588.60] y[461.40,475.32]; the form's own printed text reads 'Disposition' at x[387.96,432.08] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID  or Criminal Case Row3": {
      capturedLabel: null,
      measuredLabel: "Case ID # or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[40.92,174.60] y[446.52,460.32]; the form's own printed text reads 'Case ID # or Criminal Case #' at x[45.96,155.61] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow3": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[175.92,296.16] y[446.52,460.32]; the form's own printed text reads 'Charge' at x[176.04,203.49] y[161.48,173.76]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow3": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[297.48,381.60] y[446.52,460.32]; the form's own printed text reads 'Offense Date' at x[302.40,355.52] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition DateRow3": {
      capturedLabel: null,
      measuredLabel: "Disposition Date",
      measuredAt:
        "page 1 widget rect x[382.92,467.16] y[446.52,460.32]; the form's own printed text reads 'Disposition Date' at x[387.96,453.56] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "DispositionRow3": {
      capturedLabel: null,
      measuredLabel: "Disposition",
      measuredAt:
        "page 1 widget rect x[468.48,588.60] y[446.52,460.32]; the form's own printed text reads 'Disposition' at x[387.96,432.08] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID  or Criminal Case Row4": {
      capturedLabel: null,
      measuredLabel: "Case ID # or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[40.92,174.60] y[431.64,445.44]; the form's own printed text reads 'Case ID # or Criminal Case #' at x[45.96,155.61] y[490.27,502.56]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow4": {
      capturedLabel: "The following information MU",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[175.92,296.16] y[431.64,445.44]; the form's own printed text reads 'Charge' at x[176.04,203.49] y[161.48,173.76]; the shared capture returned \"The following information MU\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow4": {
      capturedLabel: "The following information MUST be completed for the Cou",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[297.48,381.60] y[431.64,445.44]; the form's own printed text reads 'Offense Date' at x[302.40,355.52] y[490.27,502.56]; the shared capture returned \"The following information MUST be completed for the Cou\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition DateRow4": {
      capturedLabel: "The following information MUST be completed for the Court to",
      measuredLabel: "Disposition Date",
      measuredAt:
        "page 1 widget rect x[382.92,467.16] y[431.64,445.44]; the form's own printed text reads 'Disposition Date' at x[387.96,453.56] y[490.27,502.56]; the shared capture returned \"The following information MUST be completed for the Court to\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "DispositionRow4": {
      capturedLabel: "The following information MUST be completed for the Court to",
      measuredLabel: "Disposition",
      measuredAt:
        "page 1 widget rect x[468.48,588.60] y[431.64,445.44]; the form's own printed text reads 'Disposition' at x[387.96,432.08] y[490.27,502.56]; the shared capture returned \"The following information MUST be completed for the Court to\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "The continued existence and possible dissemination of criminal records relating to Petitioner causes or may cause circumstances": {
      capturedLabel: "The following information MUST be completed for the Court to",
      measuredLabel: "The continued existence and possible dissemination of criminal records relating to Petitioner causes, or may cause, circumstances which constitute a manifest injustice to the Petitioner.",
      measuredAt:
        "page 1 widget rect x[46.68,55.44] y[400.56,409.32]; the form's own printed text reads 'The continued existence and possible dissemination of criminal records relating to Petitioner causes, or may cause, circumstances which constitute a manifest injustice to the Petitioner.' at x[45.96,580.63] y[388.27,411.00]; the shared capture returned \"The following information MUST be completed for the Court to\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "records attach additional pages if necessary 1": {
      capturedLabel: "records (attach additional pages if necessary)",
      measuredLabel: "You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):",
      measuredAt:
        "page 1 widget rect x[40.20,593.88] y[347.04,359.40]; the form's own printed text reads 'You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):' at x[45.96,561.32] y[359.00,381.74]; the shared capture returned \"records (attach additional pages if necessary)\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "records attach additional pages if necessary 2": {
      capturedLabel: "records (attach additional pages if necessary)",
      measuredLabel: "You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):",
      measuredAt:
        "page 1 widget rect x[40.20,593.88] y[334.08,346.44]; the form's own printed text reads 'You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):' at x[45.96,561.32] y[359.00,381.74]; the shared capture returned \"records (attach additional pages if necessary)\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "records attach additional pages if necessary 3": {
      capturedLabel: null,
      measuredLabel: "You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):",
      measuredAt:
        "page 1 widget rect x[40.20,593.88] y[321.12,333.48]; the form's own printed text reads 'You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):' at x[45.96,561.32] y[359.00,381.74]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "records attach additional pages if necessary 4": {
      capturedLabel: null,
      measuredLabel: "You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):",
      measuredAt:
        "page 1 widget rect x[40.20,593.88] y[308.16,320.52]; the form's own printed text reads 'You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):' at x[45.96,561.32] y[359.00,381.74]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "day of": {
      capturedLabel: "Sworn to and subscribed before me this",
      measuredLabel: "Sworn to and subscribed before me this",
      measuredAt:
        "page 1 widget rect x[261.00,312.96] y[85.44,97.80]; the form's own printed text reads 'Sworn to and subscribed before me this' at x[48.60,242.49] y[86.05,101.12]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "undefined": {
      capturedLabel: "day of",
      measuredLabel: "day of",
      measuredAt:
        "page 1 widget rect x[359.88,482.52] y[85.44,97.80]; the form's own printed text reads 'day of' at x[319.41,349.47] y[86.05,101.12]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "undefined_2": {
      capturedLabel: ",",
      measuredLabel: "Clerk of Court/Notary Public",
      measuredAt:
        "page 1 widget rect x[501.36,558.00] y[85.44,97.80]; the form's own printed text reads 'Clerk of Court/Notary Public' at x[339.48,463.37] y[57.24,70.84]; the shared capture returned \",\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
  },
  /* CIV_EXP_04_A: 36 blanks; the shared capture agrees with the printed page on 7 of them. */
  "CIV_EXP_04_A": {
    "Petitioner": {
      capturedLabel: "Petitioner",
      measuredLabel: "Petitioner",
      measuredAt:
        "page 1 widget rect x[61.76,229.68] y[708.96,722.87]; the form's own printed text reads 'Petitioner' at x[61.68,92.81] y[721.50,728.73]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Street Address including Apt": {
      capturedLabel: "Street Address (including Apt.)",
      measuredLabel: "Street Address (including Apt.)",
      measuredAt:
        "page 1 widget rect x[61.56,229.20] y[674.71,700.62]; the form's own printed text reads 'Street Address (including Apt.)' at x[61.68,162.28] y[700.38,707.61]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "New Castle County": {
      capturedLabel: "Street Address (including Apt.)",
      measuredLabel: "New Castle County",
      measuredAt:
        "page 1 widget rect x[235.92,244.80] y[699.36,706.32]; the form's own printed text reads 'New Castle County' at x[247.32,324.59] y[697.20,706.16]; the shared capture returned \"Street Address (including Apt.)\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Kent County": {
      capturedLabel: "Wilmington, DE 19801",
      measuredLabel: "Kent County",
      measuredAt:
        "page 1 widget rect x[235.92,244.80] y[658.56,665.52]; the form's own printed text reads 'Kent County' at x[247.44,298.28] y[656.40,665.36]; the shared capture returned \"Wilmington, DE 19801\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Sussex County": {
      capturedLabel: "Dover, DE 19904",
      measuredLabel: "Sussex County",
      measuredAt:
        "page 1 widget rect x[235.92,244.80] y[617.88,624.84]; the form's own printed text reads 'Sussex County' at x[247.28,306.14] y[615.61,624.57]; the shared capture returned \"Dover, DE 19904\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Leave Blank  Court will assign": {
      capturedLabel: "820 N. French Street Civil Action No",
      measuredLabel: "Civil Action No.",
      measuredAt:
        "page 1 widget rect x[412.56,531.60] y[669.84,681.36]; the form's own printed text reads 'Civil Action No.' at x[412.56,492.96] y[684.40,695.20]; the shared capture returned \"820 N. French Street Civil Action No\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "PO Box Number": {
      capturedLabel: "P.O. Box Number  Kent County (Leave Blank  Court will assi",
      measuredLabel: "P.O. Box Number",
      measuredAt:
        "page 1 widget rect x[62.69,229.20] y[630.75,653.92]; the form's own printed text reads 'P.O. Box Number' at x[61.68,119.56] y[659.58,666.81]; the shared capture returned \"P.O. Box Number  Kent County (Leave Blank  Court will assi\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CityStateZip Code": {
      capturedLabel: "City/State/Zip Code",
      measuredLabel: "City/State/Zip Code",
      measuredAt:
        "page 1 widget rect x[61.44,229.20] y[589.95,617.17]; the form's own printed text reads 'City/State/Zip Code' at x[61.68,126.11] y[618.78,626.01]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Date of Birth": {
      capturedLabel: "Date of Birth",
      measuredLabel: "Date of Birth",
      measuredAt:
        "page 1 widget rect x[61.30,224.75] y[566.75,579.47]; the form's own printed text reads 'Date of Birth' at x[61.68,103.99] y[578.10,585.33]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Telephone Number": {
      capturedLabel: "Telephone Number",
      measuredLabel: "Telephone Number",
      measuredAt:
        "page 1 widget rect x[60.87,224.98] y[544.95,557.02]; the form's own printed text reads 'Telephone Number' at x[61.68,123.76] y[556.86,564.09]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Attorney Name (if any)": {
      capturedLabel: "Attorney Name (if any)",
      measuredLabel: "Attorney Name (if any)",
      measuredAt:
        "page 1 widget rect x[60.22,225.63] y[523.35,536.73]; the form's own printed text reads 'Attorney Name (if any)' at x[61.68,136.95] y[535.74,542.97]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Language": {
      capturedLabel: "Interpreter N",
      measuredLabel: "Language:",
      measuredAt:
        "page 1 widget rect x[102.76,222.36] y[497.17,510.54]; the form's own printed text reads 'Language:' at x[61.68,103.24] y[497.52,506.48]; the shared capture returned \"Interpreter N\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Yes": {
      capturedLabel: "Interpreter Needed?",
      measuredLabel: "Interpreter Needed?",
      measuredAt:
        "page 1 widget rect x[134.84,144.80] y[513.02,522.98]; the form's own printed text reads 'Interpreter Needed?' at x[61.80,124.50] y[514.50,521.73]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "No": {
      capturedLabel: "Interpreter Needed?       Yes",
      measuredLabel: "Interpreter Needed?",
      measuredAt:
        "page 1 widget rect x[172.80,182.76] y[512.37,522.33]; the form's own printed text reads 'Interpreter Needed?' at x[61.80,124.50] y[514.50,521.73]; the shared capture returned \"Interpreter Needed?       Yes\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID or Criminal Case Row1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.24,139.92] y[414.36,425.40]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.04,113.38] y[426.60,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "ChargeRow1": {
      capturedLabel: "Criminal Case #",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.00,237.12] y[414.36,425.40]; the form's own printed text reads 'Charge' at x[145.80,174.58] y[438.00,446.96]; the shared capture returned \"Criminal Case #\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.20,306.48] y[414.36,425.40]; the form's own printed text reads 'Offense Date' at x[243.00,295.91] y[438.00,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition and Disposition DateRow1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[307.56,432.48] y[414.36,425.40]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.24,423.89] y[426.60,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CourtRow1": {
      capturedLabel: "Case ID# or Charge Offense Date Disposition and Disposition ",
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[433.56,558.48] y[414.36,425.40]; the form's own printed text reads 'Court' at x[463.43,490.90] y[658.41,666.51]; the shared capture returned \"Case ID# or Charge Offense Date Disposition and Disposition \", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID or Criminal Case Row2": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.24,139.92] y[402.36,413.40]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.04,113.38] y[426.60,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "ChargeRow2": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.00,237.12] y[402.36,413.40]; the form's own printed text reads 'Charge' at x[145.80,174.58] y[438.00,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow2": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.20,306.48] y[402.36,413.40]; the form's own printed text reads 'Offense Date' at x[243.00,295.91] y[438.00,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition and Disposition DateRow2": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[307.56,432.48] y[402.36,413.40]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.24,423.89] y[426.60,446.96]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CourtRow2": {
      capturedLabel: null,
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[433.56,558.48] y[402.36,413.40]; the form's own printed text reads 'Court' at x[463.43,490.90] y[658.41,666.51]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID or Criminal Case Row3": {
      capturedLabel: null,
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.24,139.92] y[390.36,401.40]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.04,113.38] y[426.60,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow3": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.00,237.12] y[390.36,401.40]; the form's own printed text reads 'Charge' at x[145.80,174.58] y[438.00,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow3": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.20,306.48] y[390.36,401.40]; the form's own printed text reads 'Offense Date' at x[243.00,295.91] y[438.00,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition and Disposition DateRow3": {
      capturedLabel: null,
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[307.56,432.48] y[390.36,401.40]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.24,423.89] y[426.60,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "CourtRow3": {
      capturedLabel: null,
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[433.56,558.48] y[390.36,401.40]; the form's own printed text reads 'Court' at x[463.43,490.90] y[658.41,666.51]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID or Criminal Case Row4": {
      capturedLabel: null,
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.24,139.92] y[378.24,389.40]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.04,113.38] y[426.60,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow4": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.00,237.12] y[378.24,389.40]; the form's own printed text reads 'Charge' at x[145.80,174.58] y[438.00,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow4": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.20,306.48] y[378.24,389.40]; the form's own printed text reads 'Offense Date' at x[243.00,295.91] y[438.00,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition and Disposition DateRow4": {
      capturedLabel: null,
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[307.56,432.48] y[378.24,389.40]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.24,423.89] y[426.60,446.96]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "CourtRow4": {
      capturedLabel: null,
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[433.56,558.48] y[378.24,389.40]; the form's own printed text reads 'Court' at x[463.43,490.90] y[658.41,666.51]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Other": {
      capturedLabel: "Del. C",
      measuredLabel: "Other:",
      measuredAt:
        "page 1 widget rect x[116.88,472.08] y[95.52,107.04]; the form's own printed text reads 'Other:' at x[86.38,111.82] y[94.38,103.35]; the shared capture returned \"Del. C\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "DATE": {
      capturedLabel: null,
      measuredLabel: "DATE",
      measuredAt:
        "page 1 widget rect x[86.40,290.40] y[59.04,70.56]; the form's own printed text reads 'DATE' at x[61.68,76.89] y[578.10,585.33]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
  },
  /* CIV_EXP_08_A: 36 blanks; the shared capture agrees with the printed page on 5 of them. */
  "CIV_EXP_08_A": {
    "Petitioner": {
      capturedLabel: "Petitioner",
      measuredLabel: "Petitioner",
      measuredAt:
        "page 1 widget rect x[61.64,229.62] y[702.17,715.43]; the form's own printed text reads 'Petitioner' at x[62.40,92.81] y[713.21,724.04]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Street Address including Apt": {
      capturedLabel: "Street Address (including Apt.)",
      measuredLabel: "Street Address (including Apt.)",
      measuredAt:
        "page 1 widget rect x[60.84,230.46] y[665.42,692.52]; the form's own printed text reads 'Street Address (including Apt.)' at x[62.40,161.67] y[692.09,702.92]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "New Castle County": {
      capturedLabel: "Department of Justice",
      measuredLabel: "New Castle County",
      measuredAt:
        "page 1 widget rect x[236.76,245.64] y[691.68,698.64]; the form's own printed text reads 'New Castle County' at x[236.76,326.98] y[688.62,702.04]; the shared capture returned \"Department of Justice\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Kent County": {
      capturedLabel: "Wilmington, DE 19801",
      measuredLabel: "Kent County",
      measuredAt:
        "page 1 widget rect x[236.76,245.64] y[651.36,658.32]; the form's own printed text reads 'Kent County' at x[236.76,298.82] y[648.30,661.72]; the shared capture returned \"Wilmington, DE 19801\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Sussex County": {
      capturedLabel: "Dover, DE 19904",
      measuredLabel: "Sussex County",
      measuredAt:
        "page 1 widget rect x[236.76,245.64] y[610.68,617.64]; the form's own printed text reads 'Sussex County' at x[236.76,306.86] y[607.62,621.04]; the shared capture returned \"Dover, DE 19904\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Leave Blank  Court will assign": {
      capturedLabel: "820 N. French Street Civil Action No",
      measuredLabel: "Civil Action No.",
      measuredAt:
        "page 1 widget rect x[414.48,533.64] y[661.44,672.72]; the form's own printed text reads 'Civil Action No.' at x[413.28,492.96] y[675.88,692.04]; the shared capture returned \"820 N. French Street Civil Action No\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "PO Box Number": {
      capturedLabel: "P.O. Box Number  Kent County (Leave Blank – Court will assi",
      measuredLabel: "P.O. Box Number",
      measuredAt:
        "page 1 widget rect x[61.39,230.45] y[629.98,651.18]; the form's own printed text reads 'P.O. Box Number' at x[62.40,119.56] y[651.29,662.12]; the shared capture returned \"P.O. Box Number  Kent County (Leave Blank – Court will assi\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CityStateZip Code": {
      capturedLabel: "City/State/Zip Code",
      measuredLabel: "City/State/Zip Code",
      measuredAt:
        "page 1 widget rect x[59.29,229.14] y[584.60,611.82]; the form's own printed text reads 'City/State/Zip Code' at x[62.40,125.49] y[610.61,621.44]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "Date of Birth": {
      capturedLabel: null,
      measuredLabel: "Date of Birth",
      measuredAt:
        "page 1 widget rect x[60.05,225.35] y[558.24,572.80]; the form's own printed text reads 'Date of Birth' at x[62.40,103.86] y[569.93,580.76]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Telephone Number": {
      capturedLabel: "Telephone Number GRANTED",
      measuredLabel: "Telephone Number",
      measuredAt:
        "page 1 widget rect x[60.05,224.69] y[537.77,550.38]; the form's own printed text reads 'Telephone Number' at x[62.40,123.40] y[548.69,559.52]; the shared capture returned \"Telephone Number GRANTED\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Language": {
      capturedLabel: "WHEREAS,",
      measuredLabel: "Language:",
      measuredAt:
        "page 1 widget rect x[105.34,229.16] y[490.50,505.93]; the form's own printed text reads 'Language:' at x[62.40,103.96] y[489.90,503.32]; the shared capture returned \"WHEREAS,\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Yes": {
      capturedLabel: "Interpreter Needed?",
      measuredLabel: "Interpreter Needed?",
      measuredAt:
        "page 1 widget rect x[134.25,148.29] y[506.26,515.62]; the form's own printed text reads 'Interpreter Needed?' at x[62.40,125.01] y[506.33,517.16]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
    "No": {
      capturedLabel: "Interpreter Needed? Yes",
      measuredLabel: "Interpreter Needed?",
      measuredAt:
        "page 1 widget rect x[171.38,185.41] y[507.01,516.38]; the form's own printed text reads 'Interpreter Needed?' at x[62.40,125.01] y[506.33,517.16]; the shared capture returned \"Interpreter Needed? Yes\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID or Criminal Case Row1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.72,140.40] y[407.64,418.68]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.76,113.86] y[419.82,444.04]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "ChargeRow1": {
      capturedLabel: "Criminal Case #",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.48,237.72] y[407.64,418.68]; the form's own printed text reads 'Charge' at x[97.31,127.83] y[220.98,234.39]; the shared capture returned \"Criminal Case #\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.80,307.08] y[407.64,418.68]; the form's own printed text reads 'Offense Date' at x[243.84,295.78] y[430.62,444.04]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition and Disposition DateRow1": {
      capturedLabel: "Criminal Case # Date",
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[308.16,433.08] y[407.64,418.68]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.96,422.82] y[419.82,444.04]; the shared capture returned \"Criminal Case # Date\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CourtRow1": {
      capturedLabel: "Case ID# or Charge Offense Date Disposition and Disposition ",
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[434.16,559.20] y[407.64,418.68]; the form's own printed text reads 'Court' at x[463.81,490.90] y[649.08,661.20]; the shared capture returned \"Case ID# or Charge Offense Date Disposition and Disposition \", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Case ID or Criminal Case Row2": {
      capturedLabel: null,
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.72,140.40] y[395.64,406.68]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.76,113.86] y[419.82,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow2": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.48,237.72] y[395.64,406.68]; the form's own printed text reads 'Charge' at x[97.31,127.83] y[220.98,234.39]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow2": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.80,307.08] y[395.64,406.68]; the form's own printed text reads 'Offense Date' at x[243.84,295.78] y[430.62,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition and Disposition DateRow2": {
      capturedLabel: null,
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[308.16,433.08] y[395.64,406.68]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.96,422.82] y[419.82,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "CourtRow2": {
      capturedLabel: null,
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[434.16,559.20] y[395.64,406.68]; the form's own printed text reads 'Court' at x[463.81,490.90] y[649.08,661.20]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID or Criminal Case Row3": {
      capturedLabel: null,
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.72,140.40] y[383.64,394.68]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.76,113.86] y[419.82,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow3": {
      capturedLabel: null,
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.48,237.72] y[383.64,394.68]; the form's own printed text reads 'Charge' at x[97.31,127.83] y[220.98,234.39]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Offense DateRow3": {
      capturedLabel: null,
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.80,307.08] y[383.64,394.68]; the form's own printed text reads 'Offense Date' at x[243.84,295.78] y[430.62,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Disposition and Disposition DateRow3": {
      capturedLabel: null,
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[308.16,433.08] y[383.64,394.68]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.96,422.82] y[419.82,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "CourtRow3": {
      capturedLabel: null,
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[434.16,559.20] y[383.64,394.68]; the form's own printed text reads 'Court' at x[463.81,490.90] y[649.08,661.20]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Case ID or Criminal Case Row4": {
      capturedLabel: null,
      measuredLabel: "Case ID# or Criminal Case #",
      measuredAt:
        "page 1 widget rect x[51.72,140.40] y[371.64,382.68]; the form's own printed text reads 'Case ID# or Criminal Case #' at x[56.76,113.86] y[419.82,444.04]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "ChargeRow4": {
      capturedLabel: "WHEREAS, it appear",
      measuredLabel: "Charge",
      measuredAt:
        "page 1 widget rect x[141.48,237.72] y[371.64,382.68]; the form's own printed text reads 'Charge' at x[97.31,127.83] y[220.98,234.39]; the shared capture returned \"WHEREAS, it appear\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Offense DateRow4": {
      capturedLabel: "WHEREAS, it appears that the Attorney Gener",
      measuredLabel: "Offense Date",
      measuredAt:
        "page 1 widget rect x[238.80,307.08] y[371.64,382.68]; the form's own printed text reads 'Offense Date' at x[243.84,295.78] y[430.62,444.04]; the shared capture returned \"WHEREAS, it appears that the Attorney Gener\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Disposition and Disposition DateRow4": {
      capturedLabel: "WHEREAS, it appears that the Attorney General was served w",
      measuredLabel: "Disposition and Disposition Date",
      measuredAt:
        "page 1 widget rect x[308.16,433.08] y[371.64,382.68]; the form's own printed text reads 'Disposition and Disposition Date' at x[312.96,422.82] y[419.82,444.04]; the shared capture returned \"WHEREAS, it appears that the Attorney General was served w\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "CourtRow4": {
      capturedLabel: "WHEREAS, it appears that the Attorney General was served wit",
      measuredLabel: "Court",
      measuredAt:
        "page 1 widget rect x[434.16,559.20] y[371.64,382.68]; the form's own printed text reads 'Court' at x[463.81,490.90] y[649.08,661.20]; the shared capture returned \"WHEREAS, it appears that the Attorney General was served wit\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "Other": {
      capturedLabel: "5.Other",
      measuredLabel: "Other:",
      measuredAt:
        "page 1 widget rect x[116.40,474.24] y[101.04,112.32]; the form's own printed text reads 'Other:' at x[86.40,111.97] y[99.06,112.48]; the shared capture returned \"5.Other\", which the form prints elsewhere on the page and which is not this blank's caption"
    },
    "DATE": {
      capturedLabel: null,
      measuredLabel: "DATE",
      measuredAt:
        "page 1 widget rect x[86.40,290.52] y[63.72,75.00]; the form's own printed text reads 'DATE' at x[62.40,77.61] y[569.93,580.76]; the shared capture, which looks above and to the left, reached nothing at this widget"
    },
    "Attorney Name if any": {
      capturedLabel: "Attorney Name (if any)",
      measuredLabel: "Attorney Name (if any)",
      measuredAt:
        "page 1 widget rect x[60.71,225.35] y[516.53,528.60]; the form's own printed text reads 'Attorney Name (if any)' at x[62.40,136.36] y[527.57,538.40]; the shared capture returned this same caption, pinned here so that a change in the capture stops this build rather than silently rebinding the blank"
    },
  },
};

/* =============================================================================
 * THE PINNED BINARIES.
 *
 * Identity is the SHA-256 of the official encrypted binary and nothing else.
 * Every one of these is AES-256 encrypted (V=5, R=6, StdCF) with an empty user
 * password, so every one carries transportUnlock and every one is proved
 * equivalent to its own unlocked derivative before it is read. CIV_EXP_02_A is
 * stored in the Nationwide recovery pool under the name `download.aspx.pdf`,
 * which is the filename the Delaware Courts download endpoint produced; it is
 * resolved by digest through the committed corpus index and never by that name.
 * ========================================================================== */

const UNLOCK = {
  why:
    "the pinned official binary is an AES-256 encrypted PDF (V=5, R=6, StdCF) with an empty user password; "
    + "pdf-lib has no security handler, so ignoreEncryption:true suppresses the throw and then parses "
    + "ciphertext, which surfaces as \"Expected instance of PDFDict, but got instance of undefined\", and "
    + "neither a census nor an ink audit is possible against those bytes directly",
  method: "pikepdf.open(exact_pinned_source).save(derivative, deterministic_id=True)",
  equivalenceReader: "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
  precedent:
    "scripts/build-census-v1-ca-1203-4-set.mjs, renderStrategy "
    + "pikepdf_unlocked_derivative_then_official_form_finalizer over five encrypted California forms, and "
    + "scripts/build-census-v1-me-seal-gen-set.mjs, which carried the same pattern to a terminal family on "
    + "Maine's encrypted CR-218"
};

export const CIV_EXP_02_A = {
  sourceId: "official-form:CIV_EXP_02_A",
  documentId: "CIV_EXP_02_A",
  formNumber: "CIV_EXP_02_A",
  officialTitle: "Petition for Expungement of Adult Record",
  revision: "Updated 6/12/2024",
  instrumentKind: "Delaware Superior Court petition for expungement of an adult record",
  sha256: "f2820f713b9f8e0fb1c0095886e7184d56fda06eef7f65af014ab48922b7839a",
  acroform: true,
  captionOnly: false,
  transportUnlock: UNLOCK,
  explicitMappings: {},
  printedDateOrder: {},
  /*
   * REFUSED BY ROLE, WHICH IS TESTED BEFORE ANY CAPTION AND CANNOT BE
   * OVERRIDDEN BY ONE.
   *
   * The four ruled lines of the manifest-injustice statement. The form prints
   * over them "You must explain how the Petitioner is negatively affected by
   * the continued existence and possible dissemination of the criminal records
   * (attach additional pages if necessary):" -- and `descriptorsMatching` on
   * that sentence returns participant.full_legal_name, because the registry's
   * full-name descriptor matches the bare word "petitioner". The field names
   * ("records attach additional pages if necessary 1" .. "4") match no
   * descriptor at all, so the caption is what would decide, and it would decide
   * to write the participant's own name on all four lines of the substance of
   * their own sworn petition.
   *
   * Both committed records name this as the participant's: the track registry's
   * manualCompletionItems say the manifest-injustice explanation is "The
   * substance of the petition and must not be templated", and the packet-set
   * manifest's own requiredBeforeFiling list carries it. So it is refused by
   * role, and the caption is corrected as well, and the map declares all four
   * blank -- three independent statements that have to agree before anything is
   * rendered, which is what the finalizer-versus-map gate in the core checks.
   */
  unwritable: [1, 2, 3, 4].map((n) => ({
    field: `records attach additional pages if necessary ${n}`,
    class: "participant_sworn_narrative_that_must_not_be_templated",
    why:
      "line " + n + " of the manifest-injustice statement. The committed track registry records it as \"The "
      + "substance of the petition and must not be templated\" and the form itself prints \"The following "
      + "information MUST be completed for the Court to consider the petition\" over the section. The printed "
      + "caption contains the word \"Petitioner\" and matches the full-name descriptor in the shared registry, "
      + "so without this refusal the participant's own name would be written across all four lines"
  })),
  /*
   * THE PETITIONER'S NAME IN THE RECITAL SENTENCE, on the one ruled blank the
   * form prints inside it.
   *
   * The form prints "Pursuant to 11 Del. C. § 4374, ______________ (Petitioner),
   * hereby petitions Superior Court for expungement of the following case(s)".
   * The blank is the widget named "expungement of the following cases and the
   * charge or set of charges related to that cases from his or her criminal
   * record Each" -- the form generator took the field name from the text that
   * FOLLOWS the blank, not from the text that names it -- and that name matches
   * no descriptor. Its printed caption, corrected above to "Pursuant to 11 Del.
   * C.", matches none either. So the ordinary channel cannot reach it, and a
   * petition would go out with the recital naming nobody while the platform
   * holds the name and has already written it in the caption block above.
   *
   * It is written through the finalizer's own narrative channel, one held fact
   * and one field, no caller text of any kind: the channel resolves
   * participant.full_legal_name from the same facts set as every other write,
   * runs the same protect test on the caption and the field name, fits the
   * value to that widget's own rectangle, and refuses it whole rather than
   * truncating.
   */
  narrativeLines: [{
    factId: "participant.full_legal_name",
    fields: ["expungement of the following cases and the charge or set of charges related to that cases from his or her criminal record Each"]
  }],
  /*
   * The charge table, declared for the geometry gate in the core. Column order
   * on this form is Case ID, Charge, Offense Date, Disposition Date,
   * Disposition -- which is NOT the order of the same charge list on the
   * continuation sheet CIV_EXP_02_B (Case ID, Charge, Disposition, Disposition
   * Date, Court of Record). The gate reads both from the page rather than from
   * either name.
   */
  table: {
    page: 1,
    headerBand: [488, 505],
    columnGapTolerance: 1.5,
    columns: [
      { columnId: "case_id", printedHeading: "Case ID # or Criminal Case #" },
      { columnId: "charge", printedHeading: "Charge" },
      { columnId: "offense_date", printedHeading: "Offense Date" },
      { columnId: "disposition_date", printedHeading: "Disposition Date" },
      { columnId: "disposition", printedHeading: "Disposition" }
    ],
    rows: [1, 2, 3, 4].map((n) => ({
      case_id: `Case ID  or Criminal Case Row${n}`,
      charge: `ChargeRow${n}`,
      offense_date: `Offense DateRow${n}`,
      disposition_date: `Disposition DateRow${n}`,
      disposition: `DispositionRow${n}`
    }))
  }
};

const orderTable = (headerBand) => ({
  page: 1,
  headerBand,
  columnGapTolerance: 1.5,
  columns: [
    { columnId: "case_id", printedHeading: "Case ID# or Criminal Case #" },
    { columnId: "charge", printedHeading: "Charge" },
    { columnId: "offense_date", printedHeading: "Offense Date" },
    { columnId: "disposition", printedHeading: "Disposition and Disposition Date" },
    { columnId: "court", printedHeading: "Court" }
  ],
  rows: [1, 2, 3, 4].map((n) => ({
    case_id: `Case ID or Criminal Case Row${n}`,
    charge: `ChargeRow${n}`,
    offense_date: `Offense DateRow${n}`,
    disposition: `Disposition and Disposition DateRow${n}`,
    court: `CourtRow${n}`
  }))
});

export const CIV_EXP_04_A = {
  sourceId: "official-form:CIV_EXP_04_A",
  documentId: "CIV_EXP_04_A",
  formNumber: "CIV_EXP_04_A",
  officialTitle: "Expungement Order Granting",
  revision: "Updated 05/29/2024",
  instrumentKind: "Delaware Superior Court proposed order granting expungement under 11 Del. C. § 4374",
  sha256: "59c3665bbcbf0d22fcf50d7fd1cd9ca688a3c1e3b8e0bea26434f3a389955940",
  acroform: true,
  captionOnly: false,
  transportUnlock: UNLOCK,
  explicitMappings: {},
  printedDateOrder: {},
  unwritable: [],
  narrativeLines: [],
  table: orderTable([424, 448])
};

export const CIV_EXP_08_A = {
  sourceId: "official-form:CIV_EXP_08_A",
  documentId: "CIV_EXP_08_A",
  formNumber: "CIV_EXP_08_A",
  officialTitle: "Expungement New Order Granting after Pardon",
  revision: "Updated 05/30/2024",
  instrumentKind: "Delaware Superior Court proposed order granting expungement after a pardon under 11 Del. C. § 4375",
  sha256: "0f7666ac6877b4d482a71c5303ecb199792f713e3c728adb2308b86945505d5b",
  acroform: true,
  captionOnly: false,
  transportUnlock: UNLOCK,
  explicitMappings: {},
  printedDateOrder: {},
  unwritable: [],
  narrativeLines: [],
  table: orderTable([417, 445])
};

export const CIV_EXP_02_B = {
  sourceId: "official-form:CIV_EXP_02_B",
  documentId: "CIV_EXP_02_B",
  formNumber: "CIV_EXP_02_B",
  officialTitle: "Expungement Petition Form Additional Charges Extension Sheet",
  revision: "Updated 06/12/2024",
  instrumentKind: "Delaware Superior Court continuation sheet for additional charges",
  sha256: "39b2dd77619f887236be7ebffebc0fa602a2bb1681b1c0aa0f7e4bf5ba92973c",
  acroform: true,
  transportUnlock: UNLOCK
};

/* =============================================================================
 * THE FIELD MAPS.
 *
 * Every censused blank of every rendered form appears exactly once, as a write
 * or as a classified blank; the core refuses to render a family whose map does
 * not cover its own document, because the completeness audit reads the map and
 * a blank left out of it is a blank nothing asks about.
 * ========================================================================== */

const CERTIFIED_HISTORY =
  "the entry for this charge on your certified criminal history, dated within 45 days";

const HISTORY_IS_THE_PARTICIPANT_S =
  "The committed track registry classifies the charge table as the participant's own: \"History-dependent "
  + "fields may be left as manual completion items. Counsel classified this as an item the participant "
  + "completes.\" Its packet instructions add \"LegalEase must not represent that it confirmed charge-level "
  + "eligibility\" and \"Generate the court packet without collecting or reviewing the certified SBI "
  + "history.\" The shared field semantics reach the same place from the other side: a disposition is a "
  + "court fact and protectCategoryOf refuses it on every form in this factory, so a table filled in every "
  + "column but the two disposition columns would be a half-completed sworn list.";

const VENUE_RULE =
  "Venue is the county where the MOST RECENT case was terminated, not the county of each conviction, and "
  + "the committed track registry says so in terms: \"Superior Court for the county where the most recent "
  + "case was terminated. Venue keys to the most recent termination, not the county of each conviction.\" "
  + "That is a fact about the participant's own case history rather than a choice this route makes, and the "
  + "platform holds no fact that establishes it, so the box is left for the participant to mark.";

/** The shared petition, CIV_EXP_02_A, for either route. */
export function petitionMap(componentId, h, ctx) {
  const writes = [
    h.write("Petitioner", "Petitioner", "participant.full_legal_name"),
    h.write("Street Address including Apt", "Street Address (including Apt)", "participant.street_address"),
    h.write("CityStateZip Code", "City/State/Zip Code", "participant.city_state_zip"),
    h.write("Date of Birth", "Date of Birth", "participant.date_of_birth"),
    h.write("Telephone", "Telephone #", "participant.phone"),
    h.write("Crim Case No", "Crim. Case No.", "matter.case_number"),
    h.write(
      "expungement of the following cases and the charge or set of charges related to that cases from his or her criminal record Each",
      "Pursuant to 11 Del. C.", "participant.full_legal_name")
  ];

  const refusals = [
    h.election("New Castle County", "New Castle County",
      `The Superior Court venue election. ${VENUE_RULE}`),
    h.election("Kent County", "Kent County",
      `The Superior Court venue election. ${VENUE_RULE}`),
    h.election("Sussex County", "Sussex County",
      `The Superior Court venue election. ${VENUE_RULE}`),
    h.optional("PO Box Number", "P.O. Box Number",
      "the form prints a P.O. Box line beside, not instead of, the street address line, and the platform "
      + "holds one mailing address for this participant, which is already written on the street line above. "
      + "A second address invented to fill a second line is a second address asserted"),
    h.agencyBlank("Civil Petition No", "Civil Petition No.",
      "the civil petition number is assigned by the Prothonotary when the petition is filed. The Superior "
      + "Court's own order forms print \"(Leave Blank - Court will assign)\" beside the same number"),
    h.attorneyBlank("Attorney Name if any", "Attorney Name (if any)",
      "this packet is prepared for a self-represented petitioner and the platform holds no representation "
      + "fact. protectCategoryOf(\"Attorney Name (if any)\") is \"attorney\" in the shared registry, so the "
      + "finalizer refuses it as well; writing the participant's name into a block the Prothonotary reads as "
      + "counsel's would tell the court something untrue about who is appearing"),
    h.agencyBlank("day of", "Sworn to and subscribed before me this",
      "the day of the jurat, completed by the clerk of court or notary before whom the petition is sworn. "
      + "The committed record's notarization rule is that filing in person means bringing the petition "
      + "UNSIGNED and signing in front of the notary at the Prothonotary's office"),
    h.agencyBlank("undefined", "day of",
      "the month of the jurat, completed by the clerk of court or notary. The widget the form names "
      + "\"undefined\" sits between the printed words \"day of\" and the printed comma"),
    h.agencyBlank("undefined_2", "Clerk of Court/Notary Public",
      "the year of the jurat, completed by the clerk of court or notary. The widget the form names "
      + "\"undefined_2\" sits after the printed comma and above the printed \"Clerk of Court/Notary Public\" rule"),
    h.optional("Language", "Language",
      "the form asks for a language only where an interpreter is needed, which is the election on the line "
      + "above; the platform holds no interpreter or language fact for any participant"),
    h.election("Yes", "Interpreter needed?",
      "whether the participant needs an interpreter, and in which language, is theirs to state; the platform "
      + "holds no fact that answers it"),
    h.election("No", "Interpreter needed?",
      "whether the participant needs an interpreter, and in which language, is theirs to state; the platform "
      + "holds no fact that answers it"),
  ];

  const column = {
    case_id: ["Case ID # or Criminal Case #", "the case ID or criminal case number for this charge, exactly as " + CERTIFIED_HISTORY + " states it"],
    charge: ["Charge", "the charge as " + CERTIFIED_HISTORY + " states it, with its statute section"],
    offense_date: ["Offense Date", "the offence date for this charge, from " + CERTIFIED_HISTORY],
    disposition_date: ["Disposition Date", "the disposition date for this charge, from " + CERTIFIED_HISTORY],
    disposition: ["Disposition", "the disposition of this charge, from " + CERTIFIED_HISTORY]
  };
  for (const [rowIndex, row] of CIV_EXP_02_A.table.rows.entries()) {
    for (const [columnId, name] of Object.entries(row)) {
      const [printed, supply] = column[columnId];
      refusals.push(h.rbf(name, printed, `${supply}, on printed row ${rowIndex + 1} of the table`,
        `${HISTORY_IS_THE_PARTICIPANT_S} The row is printed row ${rowIndex + 1}, resolved from the widget's `
        + "own rectangle rather than from the digit in its field name, and the column is the one the page "
        + "prints over that cell, read by x-position."));
    }
  }

  /*
   * THE ASSERTION BOX THE FORM ITSELF MARKS MUST.
   *
   * Its widget is at x[46.68,55.44] y[400.56,409.32], between the charge table
   * (y 431-490) and the four ruled lines (y 308-359), and it is declared here
   * so the participant guide reads down the printed page.
   *
   * The form prints "The following information MUST be completed for the Court
   * to consider the petition" immediately above it. It was declared through
   * `h.election` and therefore carried requiredBeforeFiling false, which is the
   * classification for a box the form leaves optional -- and because
   * requiredBeforeFiling false is also what keeps a blank out of the guide's
   * "items you must supply" table, the participant was handed a petition
   * carrying a box the Court says must be completed and told nothing about it
   * anywhere in the packet. The four narrative lines beneath it were disclosed;
   * the assertion they explain was not.
   *
   * A blank the form marks MUST is requiredBeforeFiling true. It stays the
   * participant's to make -- nothing here ticks it, and the packet still makes
   * no manifest-injustice assertion on anyone's behalf -- but the packet now
   * names it, says what ticking it asserts, and says that the decision is the
   * participant's.
   */
  refusals.push(h.requiredElection(
    "The continued existence and possible dissemination of criminal records relating to Petitioner causes or may cause circumstances",
    "The continued existence and possible dissemination of criminal records relating to Petitioner causes, or may cause, circumstances which constitute a manifest injustice to the Petitioner.",
    "your own decision on the sworn assertion this box makes. Tick it only if it is true of you: that the "
    + "continued existence and possible dissemination of these criminal records causes, or may cause, "
    + "circumstances which constitute a manifest injustice to you. The form prints \"The following "
    + "information MUST be completed for the Court to consider the petition\" directly above this box, so "
    + "the Court will not consider the petition with it left blank. This packet does not tick it and does "
    + "not decide it for you; the four ruled lines under it are where you explain it",
    "a sworn assertion of manifest injustice, which is the substantive test the petition must satisfy and "
    + "is the participant's to make. The committed track registry records that LegalEase \"does not decide "
    + "whether the showing is sufficient\". The form marks it required: it prints \"The following "
    + "information MUST be completed for the Court to consider the petition\" as the section heading "
    + "immediately above this widget, which sits at x[46.68,55.44] y[400.56,409.32] on page 1",
    "the route is a statutory pathway and this is a fact about this participant's own life. Whether the "
    + "continued existence and possible dissemination of these records causes, or may cause, circumstances "
    + "constituting a manifest injustice is decided by the participant's circumstances, not by which "
    + "expungement statute the petition travels under, and both Superior Court routes that use this form "
    + "put the same assertion to the petitioner. The committed track registry records that LegalEase "
    + "\"does not decide whether the showing is sufficient\", so the platform may not answer it either"));

  /* Declared last because the four ruled lines are printed last: the charge
   * table sits at y 431-490 on this page and the manifest-injustice lines at
   * y 308-359, and the participant guide lists these in declaration order so
   * that it reads down the page the participant is holding. */
  for (const n of [1, 2, 3, 4]) {
    refusals.push(h.rbf(
      `records attach additional pages if necessary ${n}`,
      "You must explain how the Petitioner is negatively affected by the continued existence and possible dissemination of the criminal records (attach additional pages if necessary):",
      ctx.manifestInjusticeLine(n),
      "line " + n + " of four ruled lines the form prints for the manifest-injustice explanation. The "
      + "committed track registry records it as \"The substance of the petition and must not be templated\", "
      + "and the form prints over the section \"The following information MUST be completed for the Court to "
      + "consider the petition\". It is refused by role as well as by this map, because the printed caption "
      + "matches the full-name descriptor in the shared registry and a caption is tested before a field name"));
  }
  return { writes, refusals };
}

/** Either proposed order, CIV_EXP_04_A (§ 4374) or CIV_EXP_08_A (§ 4375). */
export function orderMap(componentId, h, ctx) {
  const doc = ctx.orderDocument;
  const attorneyField = doc.documentId === "CIV_EXP_04_A" ? "Attorney Name (if any)" : "Attorney Name if any";
  const writes = [
    h.write("Petitioner", "Petitioner", "participant.full_legal_name"),
    h.write("Street Address including Apt", "Street Address (including Apt.)", "participant.street_address"),
    h.write("CityStateZip Code", "City/State/Zip Code", "participant.city_state_zip"),
    h.write("Date of Birth", "Date of Birth", "participant.date_of_birth"),
    h.write("Telephone Number", "Telephone Number", "participant.phone")
  ];

  const refusals = [
    h.election("New Castle County", "New Castle County", `The Superior Court venue election. ${VENUE_RULE}`),
    h.election("Kent County", "Kent County", `The Superior Court venue election. ${VENUE_RULE}`),
    h.election("Sussex County", "Sussex County", `The Superior Court venue election. ${VENUE_RULE}`),
    h.agencyBlank("Leave Blank  Court will assign", "Civil Action No.",
      "the form prints \"(Leave Blank - Court will assign)\" directly beneath this blank. It is the court's "
      + "own instruction on its own order, and it is followed"),
    h.optional("PO Box Number", "P.O. Box Number",
      "the form prints a P.O. Box line beside, not instead of, the street address line, and the platform "
      + "holds one mailing address for this participant, which is already written on the street line above"),
    h.attorneyBlank(attorneyField, "Attorney Name (if any)",
      "this packet is prepared for a self-represented petitioner and the platform holds no representation "
      + "fact; protectCategoryOf(\"Attorney Name (if any)\") is \"attorney\" in the shared registry"),
    h.optional("Language", "Language:",
      "the form asks for a language only where an interpreter is needed, which is the election on the line "
      + "above; the platform holds no interpreter or language fact for any participant"),
    h.election("Yes", "Interpreter Needed?",
      "whether the participant needs an interpreter, and in which language, is theirs to state"),
    h.election("No", "Interpreter Needed?",
      "whether the participant needs an interpreter, and in which language, is theirs to state"),
    h.agencyBlank("Other", "Other:",
      "numbered paragraph 5 of the order, which is the court's own space for any further direction it "
      + "chooses to give. A proposed order that arrived with paragraph 5 already written would be telling "
      + "the judge what else to order"),
    h.agencyBlank("DATE", "DATE",
      "the date the judicial officer signs the order. It sits on the same rule as the printed \"JUDICIAL "
      + "OFFICER'S SIGNATURE\" line, and neither the date nor the signature is the petitioner's to supply")
  ];

  const column = {
    case_id: ["Case ID# or Criminal Case #", "the case ID or criminal case number for this charge, exactly as " + CERTIFIED_HISTORY + " states it"],
    charge: ["Charge", "the charge as " + CERTIFIED_HISTORY + " states it, with its statute section"],
    offense_date: ["Offense Date", "the offence date for this charge, from " + CERTIFIED_HISTORY],
    disposition: ["Disposition and Disposition Date", "the disposition of this charge and its date, from " + CERTIFIED_HISTORY],
    court: ["Court", "the court of record for this charge, from " + CERTIFIED_HISTORY]
  };
  for (const [rowIndex, row] of doc.table.rows.entries()) {
    for (const [columnId, name] of Object.entries(row)) {
      const [printed, supply] = column[columnId];
      refusals.push(h.rbf(name, printed,
        `${supply}, on printed row ${rowIndex + 1} of the order's table, matching the same charge on the same printed row of the petition`,
        `${HISTORY_IS_THE_PARTICIPANT_S} The order's table lists the same charges as the petition's and this `
        + "build leaves both to the participant for the same reason. Note that the two tables do NOT run the "
        + "same columns: the petition prints Case ID, Charge, Offense Date, Disposition Date, Disposition, "
        + "and the order prints Case ID, Charge, Offense Date, Disposition and Disposition Date, Court. Each "
        + "column here is the one the order's own page prints over that cell, read by x-position."));
    }
  }
  return { writes, refusals };
}

/* =============================================================================
 * THE COVER SHEET.
 *
 * Both committed packet-set manifests declare a fourth (Superior Court) or
 * third (pardon) component with role `cover_sheet` and outputStrategy
 * `custom_pleading`. MASTER_QUEUE.packetComponents lists neither of them --
 * two components for de_pardon_expungement-set where its own instrumentKinds
 * and both controlling records list three -- and the controlling records
 * govern, so it is built.
 *
 * WHAT IT SAYS, AND WHAT IT REFUSES TO SAY. The de_discretionary_superior_court
 * track's filing rule names the third item in the prescribed order an "SBI
 * cover letter". No committed record in this repository states what an SBI
 * cover letter says -- not its addressee, not its content, not whether the
 * Prothonotary or the State Bureau of Identification is its reader -- so this
 * build does not compose one. What it composes is a filing cover sheet: the
 * petitioner's own identifying details, which the platform holds and which the
 * two official forms already carry, and a list of what is in the filing. It
 * recites no statute it has not been given, states no fee, no deadline, no
 * clerk's practice and no service rule, carries no signature block because
 * there is nothing on it to swear, and asserts nothing about eligibility. The
 * gap is carried to counsel in the approval request rather than filled here.
 *
 * It also carries none of the committed records' own words about the build.
 * DEFECTS_NO_COUNTER_CAN_SEE `internal-record-text-printed-on-a-filing`: a
 * proposed order in this sprint recited its legal-design record's analysis
 * verbatim, including a sentence telling its own builder what the packet may
 * not say, and every check passed because the text was present, non-empty, in
 * its box and quoted from a controlling record. Filings recite statute and rule
 * text only.
 * ========================================================================== */

export function coverSheetBody(facts, ctx) {
  const out = [];
  out.push("IN THE SUPERIOR COURT OF THE STATE OF DELAWARE");
  out.push("");
  out.push("FILING COVER SHEET");
  out.push("");
  /* The route's own name and the authority the committed track registry lists
   * for it, and nothing else. No fee, no deadline, no clerk's practice, no
   * service rule, and no statute this build was not given. */
  out.push(ctx.legalName);
  for (const s of ctx.procedureAuthority) out.push(s);
  out.push("");
  out.push("PETITIONER");
  out.push("");
  out.push(`Name: ${facts["participant.full_legal_name"]}`);
  out.push(`Date of birth: ${facts["participant.date_of_birth"]}`);
  out.push(`Address: ${facts["participant.street_address"]}`);
  out.push(`City, State, ZIP: ${facts["participant.city_state_zip"]}`);
  out.push(`Telephone: ${facts["participant.phone"]}`);
  out.push(`Criminal case no.: ${facts["matter.case_number"]}`);
  out.push("");
  out.push("DOCUMENTS IN THIS FILING, IN ORDER");
  out.push("");
  for (const [i, d] of ctx.documentsInOrder.entries()) out.push(`${i + 1}. ${d}`);
  out.push(`${ctx.documentsInOrder.length + 1}. This cover sheet.`);
  out.push("");
  out.push("ATTACHED BY THE PETITIONER");
  out.push("");
  out.push("Certified criminal history, dated within 45 days.");
  return out.join("\n");
}


export function coverSheetMap(componentId, h) {
  return {
    writes: [
      h.write("petitioner_name", "Name", "participant.full_legal_name"),
      h.write("petitioner_date_of_birth", "Date of birth", "participant.date_of_birth"),
      h.write("petitioner_street_address", "Address", "participant.street_address"),
      h.write("petitioner_city_state_zip", "Address", "participant.city_state_zip"),
      h.write("petitioner_telephone", "Telephone", "participant.phone"),
      h.write("criminal_case_number", "Criminal case no.", "matter.case_number")
    ],
    refusals: []
  };
}
