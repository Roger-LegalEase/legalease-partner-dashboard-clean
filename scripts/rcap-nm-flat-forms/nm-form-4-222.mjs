/**
 * Form 4-222 NMRA — Application for Free Process and Affidavit of Indigency,
 * bound together with Form 4-223 NMRA, Order on Application for Free Process.
 *
 * The fee-waiver component of all three New Mexico district-court expungement
 * families, at the identical digest
 * 809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a. Seven
 * pages, 158 AcroForm fields on 161 widgets: pages 1 to 5 are the application
 * and the affidavit, pages 6 and 7 are Form 4-223, the order a judge signs on
 * it. Three fields -- the three segments of the case number -- carry two
 * widgets each, one on the application's caption and one on the order's.
 *
 * TWO THINGS ABOUT THIS BINARY A REVIEWER MUST SEE
 *
 * 1. THE CAPTION NAMES A DISTRICT, IN PRINTED TEXT, WITH NO FIELD OVER IT.
 *    Both captions read "SIXTH JUDICIAL DISTRICT COURT". That is printed page
 *    content, not a field value and not a field default: no widget covers those
 *    coordinates, so nothing this build can do will change it. Every other form
 *    in these packets prints "_______________JUDICIAL DISTRICT COURT" and
 *    leaves the district blank. The copy the Master Library holds was harvested
 *    from the New Mexico Courts self-representation site
 *    (selfrepresentation.nmcourts.gov), so it is the state's own published
 *    fillable copy rather than a district's -- and it still names one district.
 *    A participant filing anywhere but the Sixth Judicial District receives a
 *    sworn affidavit captioned for a court that is not theirs. This build does
 *    not paper over it: it is a blocking finding in build-findings.json, it is
 *    named for visual review, and the participant is told in plain words in
 *    participant-instructions.md to correct the court line by hand or to obtain
 *    their own district's copy.
 *
 * 2. THE CASE NUMBER IS PRINTED AS A TEMPLATE. The caption reads "No. D- - -"
 *    with three small fields between the dashes. On an expungement petition
 *    there is no case number until the clerk assigns one at filing, so all
 *    three are left to the court.
 *
 * WHAT THE PLATFORM HOLDS FOR THIS FORM, AND WHAT IT DOES NOT
 *
 * Almost nothing. This is a sworn financial affidavit: marital status, public
 * assistance, employment, income, assets, monthly expenses, household members.
 * The platform holds none of it, and inventing any of it would be putting a
 * false statement on a document made under oath. What it holds is the caption
 * and the applicant's identity and address, and that is what it writes.
 *
 * Every one of the 49 checkboxes is left for the participant to mark. The
 * shared AcroForm finalizer writes text values only, and that is the right
 * behaviour here for a reason beyond the mechanism: each of these boxes is a
 * sworn assertion about the applicant's own finances.
 */
import { WRITE, SUPPLY, PROTECT, ELECTION, ATTORNEY, INAPPLICABLE, COURT_OWNED, SIGNATURE } from "./nm-packet-host.mjs";

export const FORM_4_222 = Object.freeze({
  sourceId: "official-form:4-222",
  documentId: "NM-4-222",
  formNumber: "4-222",
  title: "Application for Free Process and Affidavit of Indigency (with Form 4-223, Order on Application for Free Process)",
  sha256: "809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a",
  strategy: "acroform_fill",
  pages: 7
});

/**
 * The district this binary's caption names in printed text, and cannot be made
 * to stop naming. Exported so each family's instructions and findings quote one
 * value rather than three copies of a sentence.
 */
export const PRINTED_DISTRICT_IN_THE_CAPTION = "SIXTH JUDICIAL DISTRICT COURT";

export const PRINTED_DISTRICT_FINDING = Object.freeze({
  severity: "blocking_for_release",
  finding:
    "Form 4-222's caption, and the caption of Form 4-223 bound with it on pages 6 and 7, print "
    + `"${PRINTED_DISTRICT_IN_THE_CAPTION}" as page content. No AcroForm widget covers those coordinates -- the field list `
    + "was read first hand from the pinned binary and the nearest fields are COUNTY OF at y632.6 and Petitioner at y578.7 "
    + "-- so the district cannot be set, cleared or corrected by filling the form. Every other form in this packet prints "
    + "\"_______________JUDICIAL DISTRICT COURT\" and leaves the district blank.",
  consequence:
    "A participant filing outside the Sixth Judicial District (Grant, Hidalgo and Luna counties) would receive a fee-waiver "
    + "application and a proposed order captioned for a court that is not theirs, on a document sworn under oath. The build "
    + "does not alter the court's PDF and does not hide the defect: it is recorded here, listed for visual review, and "
    + "stated to the participant in participant-instructions.md, which tells them to strike the printed line and write "
    + "their own district or to obtain their district's copy of Form 4-222 NMRA. Counsel should decide whether the "
    + "fee-waiver component may ship statewide on this binary at all, or whether it must be conditioned on the Sixth "
    + "Judicial District the way the retained local order is conditioned on the district that published it.",
  measuredFrom: "the pinned binary at 809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a"
});

const CAPTION = "Caption of the application";
const ORDER_CAPTION = "Caption of Form 4-223, Order on Application for Free Process";
const STATUS = "Marital status and interpretation";
const ASSISTANCE = "A. Public assistance";
const EMPLOYMENT = "B. Employment / unemployment";
const OTHER_INCOME = "C. Other sources of income";
const ASSETS = "D. Other assets";
const EXPENSES = "E. Monthly expenses";
const HOUSEHOLD = "F. Household";
const OATH = "The applicant's oath";
const JURAT = "Notarial certificate";
const ATTORNEY_CERT = "Attorney's certificate (page 5)";

const NOTARY = (label) => ({
  section: JURAT, label,
  ...PROTECT(SIGNATURE, "part of the notarial certificate, completed by the notary at the moment the applicant signs; signature or date field, and this build completes none of it")
});

const MONEY = (section, label, what) => ({ section, label, ...SUPPLY(what) });

const BOX = (section, label, what) => ({
  section, label,
  ...ELECTION(
    `a sworn assertion about the applicant's own finances, marked by the applicant. The control is a form checkbox and `
    + `the shared finalizer writes text values only, so the participant marks it: ${what}`
  )
});

const HOUSEHOLD_ROW = (n, part, label) => ({
  section: HOUSEHOLD,
  label: `Household member ${n}, ${label}`,
  ...SUPPLY(`the ${label.toLowerCase()} of household member ${n}, if you have that many`)
});

const HOUSEHOLD_BOX = (n) => ({
  section: HOUSEHOLD,
  label: `Household member ${n}, whether you support them`,
  ...ELECTION(`marked by the applicant to say whether they support household member ${n}. The control is a form checkbox and the shared finalizer writes text values only`)
});

export const DICTIONARY_4_222 = Object.freeze({
  /* ---- page 1, the caption ------------------------------------------------ */
  "COUNTY OF": { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") },
  "Petitioner": { section: CAPTION, label: "Name of the Petitioner in the caption", ...WRITE("participant.full_legal_name") },
  "Respondent": {
    section: CAPTION, label: "Name of the Respondent in the caption",
    ...INAPPLICABLE(
      "Rule 1-077.1 NMRA styles an expungement action \"In re [petitioner]\" with a single party and no respondent -- every "
      + "petition form in this packet prints \"In re ____, Petitioner.\" and none of them prints a respondent. Form 4-222 is "
      + "the general civil application for free process and its caption is the two-party civil caption; the respondent half "
      + "of it belongs to the ordinary civil case this form is usually filed in and not to an expungement petition.",
      "there is no respondent in a Rule 1-077.1 expungement proceeding, so this half of the general civil caption is left "
      + "empty and the packet says why"
    )
  },
  "Text1": {
    section: CAPTION, label: "Case number, first segment of No. D-__-__-____",
    ...PROTECT(COURT_OWNED, "the district court clerk assigns the case number when the petition is filed; this application is filed with the petition, so no number exists yet. The same field appears again on the caption of Form 4-223 on page 6")
  },
  "Text2": {
    section: CAPTION, label: "Case number, second segment of No. D-__-__-____",
    ...PROTECT(COURT_OWNED, "the district court clerk assigns the case number when the petition is filed. The same field appears again on the caption of Form 4-223 on page 6")
  },
  "Text3": {
    section: CAPTION, label: "Case number, third segment of No. D-__-__-____",
    ...PROTECT(COURT_OWNED, "the district court clerk assigns the case number when the petition is filed. The same field appears again on the caption of Form 4-223 on page 6")
  },

  /* ---- page 1, marital status and interpretation -------------------------- */
  "Check Box4": BOX(STATUS, "Marital status: Single", "mark it if you are single"),
  "Check Box5": BOX(STATUS, "Marital status: Married", "mark it if you are married"),
  "Check Box6": BOX(STATUS, "Marital status: Divorced", "mark it if you are divorced"),
  "Check Box7": BOX(STATUS, "Marital status: Separated", "mark it if you are separated"),
  "Check Box8": BOX(STATUS, "Marital status: Widowed", "mark it if you are widowed"),
  "Check Box9": BOX(STATUS, "I request interpretation services: yes", "mark it if you need an interpreter at the hearing"),
  "Check Box10": BOX(STATUS, "I request interpretation services: no", "mark it if you do not need an interpreter"),
  "I request interpretation services 1": { section: STATUS, label: "Interpretation services needed, first line", ...SUPPLY("what interpretation you need, and in what language, if you asked for an interpreter") },
  "I request interpretation services 2": { section: STATUS, label: "Interpretation services needed, second line", ...SUPPLY("the second line of what interpretation you need, if the first line is not enough") },
  "I request interpretation services 3": { section: STATUS, label: "Interpretation services needed, third line", ...SUPPLY("the third line of what interpretation you need, if you need it") },

  /* ---- page 1, section A -------------------------------------------------- */
  "Check Box11": BOX(ASSISTANCE, "I do not receive public assistance", "mark it if you receive no public assistance, and then go straight to section B"),
  "Check Box12": BOX(ASSISTANCE, "I currently receive public assistance", "mark it if you do receive public assistance"),
  "County please": { section: ASSISTANCE, label: "The county in which you receive public assistance", ...SUPPLY("the county in which you receive public assistance, which may not be the county your case is in") },
  "Check Box13": BOX(ASSISTANCE, "Temporary Assistance for Needy Families (TANF)", "mark it if you receive TANF"),
  "Check Box14": BOX(ASSISTANCE, "Food Stamps", "mark it if you receive food stamps"),
  "Check Box15": BOX(ASSISTANCE, "Medicaid (for myself)", "mark it if you receive Medicaid for yourself"),
  "Check Box16": BOX(ASSISTANCE, "General Assistance (GA)", "mark it if you receive General Assistance"),
  "Check Box17": BOX(ASSISTANCE, "Supplemental Security Income (SSI)", "mark it if you receive SSI"),
  "Check Box18": BOX(ASSISTANCE, "Public Housing", "mark it if you receive public housing"),
  "Check Box19": BOX(ASSISTANCE, "Disability Security Income (DSI)", "mark it if you receive DSI"),
  "Check Box20": BOX(ASSISTANCE, "Department of Health Case Management Services (DHMS)", "mark it if you receive DHMS case management"),
  "Check Box21": BOX(ASSISTANCE, "Other public assistance", "mark it if you receive some other public assistance and describe it on the line beside the box"),
  "undefined_2": { section: ASSISTANCE, label: "Other public assistance, description", ...SUPPLY("a description of any other public assistance you receive") },

  /* ---- page 2, section B -------------------------------------------------- */
  "Check Box22": BOX(EMPLOYMENT, "I am currently unemployed", "mark it if you are unemployed"),
  "months in the past year I": { section: EMPLOYMENT, label: "Months unemployed in the past year", ...SUPPLY("how many months you have been unemployed in the past year") },
  "undefined_3": { section: EMPLOYMENT, label: "Why you are unemployed", ...SUPPLY("why you are unemployed") },
  "Check Box26": BOX(EMPLOYMENT, "I receive unemployment benefits", "mark it if you receive unemployment benefits"),
  "per month": { section: EMPLOYMENT, label: "Unemployment benefits received per month", ...SUPPLY("how much you receive in unemployment benefits each month") },
  "Check Box27": BOX(EMPLOYMENT, "I have no income because I am unemployed", "mark it if you have no income at all"),
  "Check Box23": BOX(EMPLOYMENT, "I am employed", "mark it if you are employed"),
  "per hour and work": { section: EMPLOYMENT, label: "Your hourly pay", ...SUPPLY("what you are paid per hour") },
  "hours per week": { section: EMPLOYMENT, label: "Your hours per week", ...SUPPLY("how many hours a week you work") },
  "My employers name address and phone number is 1": { section: EMPLOYMENT, label: "Your employer's name, address and phone number, first line", ...SUPPLY("your employer's name") },
  "My employers name address and phone number is 2": { section: EMPLOYMENT, label: "Your employer's name, address and phone number, second line", ...SUPPLY("your employer's address") },
  "My employers name address and phone number is 3": { section: EMPLOYMENT, label: "Your employer's name, address and phone number, third line", ...SUPPLY("your employer's phone number") },
  "Check Box24": BOX(EMPLOYMENT, "I am married and my spouse is unemployed", "mark it if you are married and your spouse is unemployed"),
  "months": { section: EMPLOYMENT, label: "Months your spouse has been unemployed in the past year", ...SUPPLY("how many months your spouse has been unemployed in the past year") },
  "undefined_4": { section: EMPLOYMENT, label: "Why your spouse is unemployed", ...SUPPLY("why your spouse is unemployed") },
  "Check Box28": BOX(EMPLOYMENT, "My spouse receives unemployment benefits", "mark it if your spouse receives unemployment benefits"),
  "per month_2": { section: EMPLOYMENT, label: "Your spouse's unemployment benefits per month", ...SUPPLY("how much your spouse receives in unemployment benefits each month") },
  "Check Box25": BOX(EMPLOYMENT, "I am married and my spouse is employed", "mark it if you are married and your spouse is employed"),
  "per hour and": { section: EMPLOYMENT, label: "Your spouse's hourly pay", ...SUPPLY("what your spouse is paid per hour") },
  "hours per week_2": { section: EMPLOYMENT, label: "Your spouse's hours per week", ...SUPPLY("how many hours a week your spouse works") },
  "My spouses employers name address and phone number is 1": { section: EMPLOYMENT, label: "Your spouse's employer's name, address and phone number, first line", ...SUPPLY("your spouse's employer's name") },
  "My spouses employers name address and phone number is 2": { section: EMPLOYMENT, label: "Your spouse's employer's name, address and phone number, second line", ...SUPPLY("your spouse's employer's address") },
  "My spouses employers name address and phone number is 3": { section: EMPLOYMENT, label: "Your spouse's employer's name, address and phone number, third line", ...SUPPLY("your spouse's employer's phone number") },

  /* ---- page 2, section C -------------------------------------------------- */
  "Check Box1": BOX(OTHER_INCOME, "I have income from another source", "mark it if you have income from a source not already listed"),
  "Check Box2": BOX(OTHER_INCOME, "My other income: Child Support", "mark it if you receive child support"),
  "undefined_5": MONEY(OTHER_INCOME, "Your child support, amount", "how much child support you receive"),
  "Check Box3": BOX(OTHER_INCOME, "My other income: Alimony", "mark it if you receive alimony"),
  "undefined_6": MONEY(OTHER_INCOME, "Your alimony, amount", "how much alimony you receive"),
  "Check Box29": BOX(OTHER_INCOME, "My other income: Investments", "mark it if you have investment income"),
  "undefined_7": MONEY(OTHER_INCOME, "Your investment income, amount", "how much investment income you receive"),
  "Check Box30": BOX(OTHER_INCOME, "My other income: Community property from my spouse", "mark it if you receive community property income from your spouse"),
  "undefined_8": MONEY(OTHER_INCOME, "Your community property income, amount", "how much community property income you receive from your spouse"),
  "Check Box31": BOX(OTHER_INCOME, "My other income: Other", "mark it if you have other income of some other kind, and describe it"),
  "undefined_9": { section: OTHER_INCOME, label: "Your other income, description", ...SUPPLY("what your other income is") },
  "undefined_10": MONEY(OTHER_INCOME, "Your other income, amount", "how much that other income is"),
  "Check Box32": BOX(OTHER_INCOME, "I do not have any other sources of income", "mark it if you have no other income"),
  "Check Box33": BOX(OTHER_INCOME, "My spouse has income from another source", "mark it if your spouse has income from a source not already listed"),
  "Check Box34": BOX(OTHER_INCOME, "Spouse's other income: Child Support", "mark it if your spouse receives child support"),
  "undefined_11": MONEY(OTHER_INCOME, "Your spouse's child support, amount", "how much child support your spouse receives"),
  "Check Box35": BOX(OTHER_INCOME, "Spouse's other income: Alimony", "mark it if your spouse receives alimony"),
  "undefined_12": MONEY(OTHER_INCOME, "Your spouse's alimony, amount", "how much alimony your spouse receives"),
  "Check Box36": BOX(OTHER_INCOME, "Spouse's other income: Investments", "mark it if your spouse has investment income"),
  "undefined_13": MONEY(OTHER_INCOME, "Your spouse's investment income, amount", "how much investment income your spouse receives"),
  "Check Box37": BOX(OTHER_INCOME, "Spouse's other income: Other, first line", "mark it if your spouse has other income of some other kind, and describe it"),
  "1": { section: OTHER_INCOME, label: "Your spouse's other income, first description", ...SUPPLY("what your spouse's other income is") },
  "undefined_14": MONEY(OTHER_INCOME, "Your spouse's other income, first amount", "how much that other income of your spouse's is"),
  "Check Box38": BOX(OTHER_INCOME, "Spouse's other income: Other, second line", "mark it if your spouse has a second kind of other income, and describe it"),
  "2": { section: OTHER_INCOME, label: "Your spouse's other income, second description", ...SUPPLY("what your spouse's second other income is") },
  "undefined_15": MONEY(OTHER_INCOME, "Your spouse's other income, second amount", "how much that second other income of your spouse's is"),
  "Check Box39": BOX(OTHER_INCOME, "My spouse does not have any other sources of income", "mark it if your spouse has no other income"),
  "Check Box40": BOX(OTHER_INCOME, "Another adult contributes to household income", "mark it if another adult contributes to your household income"),
  "undefined_16": MONEY(OTHER_INCOME, "Amount another adult contributes to household income", "how much another adult contributes to your household each month"),

  /* ---- page 3, section D -------------------------------------------------- */
  "undefined_17": MONEY(ASSETS, "Cash on hand", "how much cash you have on hand"),
  "undefined_18": MONEY(ASSETS, "Bank accounts", "how much you have in bank accounts"),
  "undefined_19": MONEY(ASSETS, "Income tax refund", "how much income tax refund you expect"),
  "Other assets describe below": { section: ASSETS, label: "Other asset, first description", ...SUPPLY("a description of another asset you or your spouse own that can be turned into cash, not counting retirement accounts") },
  "undefined_20": MONEY(ASSETS, "Other asset, first amount", "what that asset is worth"),
  "IF YOU DO NOT HAVE ACCESS TO YOUR OWN OR YOUR SPOUSES INCOME OR": { section: ASSETS, label: "Other asset, second description", ...SUPPLY("a description of a second other asset, if you have one") },
  "undefined_21": MONEY(ASSETS, "Other asset, second amount", "what that second asset is worth"),
  "ASSETS EXPLAIN WHY 1": { section: ASSETS, label: "If you do not have access to your own or your spouse's income or assets, explain why, first line", ...SUPPLY("why you cannot get at your own or your spouse's income or assets, if that is your situation") },
  "ASSETS EXPLAIN WHY 2": { section: ASSETS, label: "If you do not have access to your own or your spouse's income or assets, explain why, second line", ...SUPPLY("the second line of that explanation") },
  "ASSETS EXPLAIN WHY 3": { section: ASSETS, label: "If you do not have access to your own or your spouse's income or assets, explain why, third line", ...SUPPLY("the third line of that explanation") },
  "ASSETS EXPLAIN WHY 4": { section: ASSETS, label: "If you do not have access to your own or your spouse's income or assets, explain why, fourth line", ...SUPPLY("the fourth line of that explanation") },

  /* ---- page 3, section E -------------------------------------------------- */
  "undefined_22": MONEY(EXPENSES, "Monthly expense: House Payment or Rent", "what you pay each month in rent or house payments"),
  "undefined_23": MONEY(EXPENSES, "Monthly expense: Utilities", "what you pay each month for utilities"),
  "undefined_24": MONEY(EXPENSES, "Monthly expense: Telephone", "what you pay each month for telephone"),
  "undefined_25": MONEY(EXPENSES, "Monthly expense: Groceries (after food stamps)", "what you spend each month on groceries after food stamps"),
  "undefined_26": MONEY(EXPENSES, "Monthly expense: Car Payments", "what you pay each month on your car"),
  "undefined_27": MONEY(EXPENSES, "Monthly expense: Gasoline", "what you spend each month on gasoline"),
  "undefined_28": MONEY(EXPENSES, "Monthly expense: Insurance", "what you pay each month for insurance"),
  "undefined_29": MONEY(EXPENSES, "Monthly expense: Child Care", "what you pay each month for child care"),
  "undefined_30": MONEY(EXPENSES, "Monthly expense: Student and Consumer Loans", "what you pay each month on student and consumer loans"),
  "undefined_31": MONEY(EXPENSES, "Monthly expense: Court-ordered family support obligations", "what you pay each month in court-ordered family support"),
  "undefined_32": MONEY(EXPENSES, "Monthly expense: Other court-ordered payments", "what you pay each month on other court-ordered obligations"),
  "undefined_33": MONEY(EXPENSES, "Monthly expense: Medical expenses", "what you pay each month in medical expenses"),
  "Other_4": { section: EXPENSES, label: "Monthly expense: Other, description", ...SUPPLY("a description of any other monthly expense") },
  "undefined_34": MONEY(EXPENSES, "Monthly expense: Other, amount", "what that other monthly expense costs"),

  /* ---- page 3, section F -------------------------------------------------- */
  "I live at": {
    section: HOUSEHOLD, label: "I live at, your full mailing address on one line",
    ...SUPPLY("your full address on one line: street, city, state and ZIP. It is the same address written out in parts on page 4", "the shared fact registry has no one-line mailing-address fact; its only address descriptor is the street line. Reported to the owner of the registry in build-findings.json.")
  },
  "and the head of the household is": { section: HOUSEHOLD, label: "The head of the household is", ...SUPPLY("who the head of your household is, which may be you") },
  "Name 1": HOUSEHOLD_ROW(1, "name", "Name"),
  "Age 1": HOUSEHOLD_ROW(1, "age", "Age"),
  "Employment 1": HOUSEHOLD_ROW(1, "employment", "Employment"),
  "Check Box41": HOUSEHOLD_BOX(1),
  "Name 2": HOUSEHOLD_ROW(2, "name", "Name"),
  "Age 2": HOUSEHOLD_ROW(2, "age", "Age"),
  "Employment 2": HOUSEHOLD_ROW(2, "employment", "Employment"),
  "Check Box42": HOUSEHOLD_BOX(2),
  "undefined_35": HOUSEHOLD_ROW(3, "name", "Name"),
  "undefined_36": HOUSEHOLD_ROW(3, "age", "Age"),
  "undefined_37": HOUSEHOLD_ROW(3, "employment", "Employment"),
  "Check Box43": HOUSEHOLD_BOX(3),
  "1_2": HOUSEHOLD_ROW(4, "name", "Name"),
  "1_3": HOUSEHOLD_ROW(4, "age", "Age"),
  "1_4": HOUSEHOLD_ROW(4, "employment", "Employment"),
  "Check Box45": HOUSEHOLD_BOX(4),
  "2_2": HOUSEHOLD_ROW(5, "name", "Name"),
  "2_3": HOUSEHOLD_ROW(5, "age", "Age"),
  "2_4": HOUSEHOLD_ROW(5, "employment", "Employment"),
  "Check Box46": HOUSEHOLD_BOX(5),
  "3": HOUSEHOLD_ROW(6, "name", "Name"),
  "3_2": HOUSEHOLD_ROW(6, "age", "Age"),
  "3_3": HOUSEHOLD_ROW(6, "employment", "Employment"),
  "Check Box47": HOUSEHOLD_BOX(6),
  "4": HOUSEHOLD_ROW(7, "name", "Name"),
  "4_2": HOUSEHOLD_ROW(7, "age", "Age"),
  "4_3": HOUSEHOLD_ROW(7, "employment", "Employment"),
  "Check Box48": HOUSEHOLD_BOX(7),

  /* ---- page 4, the oath and the jurat ------------------------------------- */
  "Signature": { section: OATH, label: "Signature of the applicant", ...PROTECT(SIGNATURE, "signature or date field; the applicant signs this statement under oath and no build signs it for them") },
  "Print Name": { section: OATH, label: "Print Name of the applicant", ...WRITE("participant.full_legal_name") },
  "Check Box50": {
    section: OATH, label: "The applicant is the Petitioner",
    ...ELECTION(
      "the applicant marks which party they are. On this route they are the Petitioner -- an expungement petition under "
      + "Rule 1-077.1 NMRA has a petitioner and no respondent -- and participant-instructions.md tells them to mark this "
      + "box. The control is a form checkbox and the shared finalizer writes text values only"
    )
  },
  "Check Box51": {
    section: OATH, label: "The applicant is the Respondent",
    ...INAPPLICABLE(
      "Rule 1-077.1 NMRA styles an expungement action \"In re [petitioner]\" with a single party and no respondent, so the "
      + "applicant on this route is always the Petitioner and never the Respondent. This box is the other half of Form "
      + "4-222's general two-party civil caption.",
      "there is no respondent in a Rule 1-077.1 expungement proceeding, so this box is never the one to mark on this route "
      + "and the packet says so"
    )
  },
  "Street Address": { section: OATH, label: "Street Address of the applicant", ...WRITE("participant.street_address") },
  "City State Zip Code": { section: OATH, label: "City, State, Zip Code of the applicant", ...WRITE("participant.city_state_zip") },
  "Telephone": { section: OATH, label: "Telephone of the applicant", ...SUPPLY("your telephone number") },
  "State of": NOTARY("State of, in the notarial jurat"),
  "County of": NOTARY("County of, in the notarial jurat"),
  "name of applicant": NOTARY("Date the applicant signed and swore to the affidavit before the notary"),
  "by": NOTARY("Name of the applicant, as recorded by the notary"),
  "Notary": NOTARY("Signature of the notary"),
  "My commission expires": NOTARY("The notary's commission expiry"),

  /* ---- page 5, the attorney's certificate --------------------------------- */
  "Name of attorney": {
    section: ATTORNEY_CERT, label: "Name of attorney certifying that no attorney fee was received",
    ...ATTORNEY("page 5 is headed \"IF YOU ARE REPRESENTED BY AN ATTORNEY, YOUR ATTORNEY MUST SIGN THE FOLLOWING CERTIFICATE\"; no attorney-representation fact is held for this participant and this packet is prepared for a self-represented petitioner")
  },
  "Name of applicant that I shall pay to the court clerk from such": {
    section: ATTORNEY_CERT, label: "Name of the applicant the attorney represents, in the attorney's certificate",
    ...ATTORNEY("part of the attorney's certificate on page 5; no attorney-representation fact is held for this participant")
  },
  "Attorney Signature": {
    section: ATTORNEY_CERT, label: "Attorney signature",
    ...ATTORNEY("signature field inside the attorney's certificate; no attorney-representation fact is held for this participant and no build signs for an attorney")
  },
  "Address": {
    section: ATTORNEY_CERT, label: "Address of the attorney",
    ...ATTORNEY("part of the attorney's certificate on page 5; no attorney-representation fact is held for this participant")
  },
  "City State Zip Code_2": {
    section: ATTORNEY_CERT, label: "City, State, Zip Code of the attorney",
    ...ATTORNEY("part of the attorney's certificate on page 5; no attorney-representation fact is held for this participant")
  },
  "TelephoneFax Number": {
    section: ATTORNEY_CERT, label: "Telephone or fax number of the attorney",
    ...ATTORNEY("part of the attorney's certificate on page 5; no attorney-representation fact is held for this participant")
  },

  /* ---- pages 6 and 7, Form 4-223 ------------------------------------------ */
  /*
   * The two caption fields of Form 4-223, whose AUTHORED NAMES are the lines
   * printed above them rather than what they hold.
   *
   * "STATE OF NEW MEXICO" is the COUNTY blank and "SIXTH JUDICIAL DISTRICT
   * COURT" is the PETITIONER blank -- the form's author named every field on
   * pages 6 and 7 after the text above it, exactly as on page 1 where "COUNTY
   * OF" is the county blank and "Petitioner" is the petitioner blank. On page 1
   * that accident lands on the right fact and the caption is written. Here it
   * does not: the shared semantics reads the authored field name first, and
   * resolves "STATE OF NEW MEXICO" to the participant's STATE and "SIXTH
   * JUDICIAL DISTRICT COURT" to the COURT. Both are the wrong fact for the
   * blank, and the guard that refuses a conflicting explicit mapping is doing
   * its job. This build does not go round it. The two blanks are left to the
   * applicant with the reason stated, rather than filled with a fact the
   * registry and the build disagree about.
   */
  "STATE OF NEW MEXICO": {
    section: ORDER_CAPTION, label: "COUNTY OF, in the caption of the order for free process",
    ...SUPPLY("the same county as page 1, on the caption of the order you give the judge", "the author of Form 4-223 named every field on pages 6 and 7 after the line printed ABOVE it, so the shared fact registry reads this one as the applicant's STATE rather than as a county. The guard that refuses an explicit mapping the field name contradicts is doing its job, and this build does not go round it.")
  },
  "SIXTH JUDICIAL DISTRICT COURT": {
    section: ORDER_CAPTION, label: "Name of the Petitioner in the caption of the order for free process",
    ...SUPPLY("your name, the same as page 1, on the caption of the order you give the judge", "the author of Form 4-223 named every field on pages 6 and 7 after the line printed ABOVE it, so the shared fact registry reads this one as a COURT rather than as a person's name. The guard that refuses an explicit mapping the field name contradicts is doing its job, and this build does not go round it.")
  },
  "v": {
    section: ORDER_CAPTION, label: "Name of the Respondent in the caption of the order for free process",
    ...INAPPLICABLE(
      "the same two-party civil caption as page 1. Rule 1-077.1 NMRA styles an expungement action \"In re [petitioner]\" "
      + "with a single party and no respondent.",
      "there is no respondent in a Rule 1-077.1 expungement proceeding, so this half of the order's caption is left empty"
    )
  }
});

/**
 * The blanks Form 4-223 PRINTS on pages 6 and 7, which no widget covers.
 *
 * The order a judge signs on the application is bound into the same binary and
 * is not fillable: its findings boxes, its decretal blanks and its signature
 * line are printed characters with no field behind them. Twenty-seven of them,
 * every one the court's. They are carried here so the packet classifies every
 * blank on paper the participant receives, and they are keyed by page, baseline
 * and position along the printed line because this binary's absolute glyph x
 * cannot be measured -- see PRINTED_DISTRICT_FINDING and the glyph-metrics note
 * in the field census.
 */
const ORDER_FINDINGS = "Form 4-223, the court's findings";
const ORDER_DECREE = "Form 4-223, what the court orders";
const ORDER_SIGNATURE = "Form 4-223, the judge's signature";

const JUDGE = (section, label, why) => ({
  section, label,
  ...PROTECT(COURT_OWNED, `court, clerk, prosecutor, agency, or hearing field: ${why}`)
});

export const PRINTED_BLANKS_4_223 = Object.freeze({
  "p6-y46056-n1": JUDGE(ORDER_FINDINGS, "Finding: the applicant is entitled to free process under Rule 23-114(B)(2) NMRA", "a finding only the court makes, on the court's own order"),
  "p6-y43296-n1": JUDGE(ORDER_FINDINGS, "Finding: the applicant receives public assistance and is entitled to free process", "a finding only the court makes"),
  "p6-y41916-n1": JUDGE(ORDER_FINDINGS, "Finding: the applicant's annual gross income does not exceed a stated share of the federal poverty guidelines", "a finding only the court makes"),
  "p6-y41916-n2": JUDGE(ORDER_FINDINGS, "The share of the federal poverty guidelines the applicant's income does not exceed", "the court states the figure in its own finding"),
  "p6-y39156-n1": JUDGE(ORDER_FINDINGS, "Finding: the applicant's annual gross income exceeds a stated share of the guidelines but they cannot reasonably pay", "a finding only the court makes"),
  "p6-y39156-n2": JUDGE(ORDER_FINDINGS, "The share of the federal poverty guidelines the applicant's income exceeds", "the court states the figure in its own finding"),
  "p6-y35016-n1": JUDGE(ORDER_FINDINGS, "Finding: the applicant is not entitled to free process", "a finding only the court makes"),
  "p6-y30276-n1": JUDGE(ORDER_DECREE, "Order: the filing fee is waived", "a decretal paragraph only a judge may make"),
  "p6-y28896-n1": JUDGE(ORDER_DECREE, "Order: the filing fee is waived except for the alternative dispute resolution fee", "a decretal paragraph only a judge may make"),
  "p6-y28896-n2": JUDGE(ORDER_DECREE, "The alternative dispute resolution fee that is not waived", "the court states the amount inside its own decree"),
  "p6-y26136-n1": JUDGE(ORDER_DECREE, "Order: free service of process by the Sheriff", "a decretal paragraph only a judge may make"),
  "p6-y26136-n2": JUDGE(ORDER_DECREE, "The county whose Sheriff is to serve process free", "the court names the county inside its own decree"),
  "p6-y24756-n1": JUDGE(ORDER_DECREE, "The number of summonses covered by free service", "the court states the number inside its own decree"),
  "p6-y21996-n1": JUDGE(ORDER_DECREE, "Order: free service by the Sheriff of a temporary restraining order", "a decretal paragraph only a judge may make"),
  "p6-y21996-n2": JUDGE(ORDER_DECREE, "The county whose Sheriff is to serve the restraining order free", "the court names the county inside its own decree"),
  "p6-y20616-n1": JUDGE(ORDER_DECREE, "What else the Sheriff is to serve free, besides a temporary restraining order", "the court states it inside its own decree"),
  "p6-y19236-n1": JUDGE(ORDER_DECREE, "Order: the applicant is to pay the filing fee on a stated date", "a decretal paragraph only a judge may make"),
  "p6-y19236-n2": JUDGE(ORDER_DECREE, "The date by which the applicant is to pay the filing fee", "the court sets the date inside its own decree"),
  "p6-y19236-n3": JUDGE(ORDER_DECREE, "The year by which the applicant is to pay the filing fee", "the court sets the year inside its own decree"),
  "p6-y17856-n1": JUDGE(ORDER_DECREE, "Order: interpretation services shall be provided", "a decretal paragraph only a judge may make"),
  "p6-y16476-n1": JUDGE(ORDER_DECREE, "Order: free process is denied", "a decretal paragraph only a judge may make"),
  "p6-y15096-n1": JUDGE(ORDER_DECREE, "Order: Other", "a decretal paragraph only a judge may make"),
  "p6-y13716-n1": JUDGE(ORDER_DECREE, "Other orders, first line", "the court writes its own other orders here"),
  "p6-y11736-n1": JUDGE(ORDER_DECREE, "Other orders, second line", "the court writes its own other orders here"),
  "p6-y9756-n1": JUDGE(ORDER_DECREE, "Other orders, third line", "the court writes its own other orders here"),
  "p6-y7788-n1": JUDGE(ORDER_DECREE, "Other orders, fourth line", "the court writes its own other orders here"),
  "p7-y56400-n1": {
    section: ORDER_SIGNATURE, label: "Signature of the JUDGE on the order for free process",
    ...PROTECT(SIGNATURE, "signature or date field; the judge signs the order and no build signs for a judge")
  }
});
