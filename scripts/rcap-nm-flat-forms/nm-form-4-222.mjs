/**
 * Form 4-222 NMRA — Application for Free Process and Affidavit of Indigency.
 *
 * Governed statewide blank-caption source adopted on 2026-09-11. It is a
 * five-page flat PDF. The former 809c66a7… binary was a seven-page AcroForm
 * bundle that printed "SIXTH JUDICIAL DISTRICT COURT". It is deliberately
 * absent here. All 147 underscore blanks in the statewide source are measured
 * and classified on every build. The seven empty-parenthesis controls in the
 * household table are separately inventoried below because they are controls,
 * not writing lines.
 *
 * This is a sworn financial affidavit. The platform writes only held identity,
 * address, and caption facts. It does not invent finances, mark choices, sign,
 * notarize, or complete the attorney certificate.
 */
import {
  WRITE, WRITE_BOUND_AS, SUPPLY, PROTECT, ELECTION, ATTORNEY, INAPPLICABLE,
  SIGNATURE, COURT_OWNED
} from "./nm-packet-host.mjs";

export const FORM_4_222 = Object.freeze({
  sourceId: "official-form:4-222",
  documentId: "NM-4-222",
  formNumber: "4-222",
  title: "Application for Free Process and Affidavit of Indigency",
  sha256: "ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de",
  strategy: "measured_flat_overlay",
  pages: 5,
  additionalPrintedControls: Object.freeze([
    { key: "p3-household-support-1", page: 3, y: 106.92, section: "F. Household", label: "Household member 1, I Support" },
    { key: "p4-household-support-2", page: 4, y: 708.72, section: "F. Household", label: "Household member 2, I Support" },
    { key: "p4-household-support-3", page: 4, y: 680.76, section: "F. Household", label: "Household member 3, I Support" },
    { key: "p4-household-support-4", page: 4, y: 652.80, section: "F. Household", label: "Household member 4, I Support" },
    { key: "p4-household-support-5", page: 4, y: 624.84, section: "F. Household", label: "Household member 5, I Support" },
    { key: "p4-household-support-6", page: 4, y: 596.88, section: "F. Household", label: "Household member 6, I Support" },
    { key: "p4-household-support-7", page: 4, y: 568.92, section: "F. Household", label: "Household member 7, I Support" }
  ].map((control, index) => Object.freeze({
    ...control,
    printedLine: "(   )",
    policy: "election",
    refusalClass: "participant_sworn_narrative_or_legal_election",
    what: `mark this only if you support household member ${index + 1}`,
    why: `the participant decides whether they support household member ${index + 1}; the build holds no household-support answer and makes no financial selection`
  })))
});

export const STATEWIDE_CAPTION_FINDING = Object.freeze({
  severity: "resolved_by_governed_source_replacement",
  finding:
    "The governed Form 4-222 source prints STATE OF NEW MEXICO, a blank COUNTY OF line, and a blank court line. "
    + "The county and full judicial-district designation can therefore be written from held matter facts without "
    + "district-local page content beneath them.",
  measuredFrom: "the pinned statewide binary at ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de",
  supersedes:
    "The historical 809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a source printed SIXTH JUDICIAL DISTRICT COURT."
});

const CAPTION = "Caption of the application";
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

const BOX = (section, label, what) => ({
  section, label, ...ELECTION(`the applicant marks this sworn choice by hand: ${what}`)
});
const MONEY = (section, label, what) => ({ section, label, ...SUPPLY(what) });
const NOTARY = (label) => ({
  section: JURAT, label,
  ...PROTECT(SIGNATURE, "the notary completes this certificate when the applicant signs; no build signs, dates, or notarizes")
});
const ATTORNEY_FIELD = (label) => ({
  section: ATTORNEY_CERT, label,
  ...ATTORNEY("page 5 applies only when the applicant is represented by an attorney; this packet is prepared for a self-represented petitioner")
});
const HOUSEHOLD_FIELD = (row, label, what) => ({
  section: HOUSEHOLD, label: `Household member ${row}, ${label}`,
  ...SUPPLY(`${what} for household member ${row}, if you have that many household members`)
});

const dictionary = {};
const put = (key, entry) => { dictionary[key] = entry; };

/* Page 1 — caption, status, interpretation, and public assistance. */
put("p1-y63840-x14364", { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") });
put("p1-y62436-x7200", {
  section: CAPTION,
  label: "Full judicial district designation in the statewide Form 4-222 caption",
  ...WRITE_BOUND_AS("matter.fee_waiver_court_caption", {
    factId: "matter.court",
    label: "Judicial district of the district court in the caption",
    why:
      "the statewide form prints one blank followed only by COURT, so the written value includes the held ordinal "
      + "and the words Judicial District; the shared court descriptor supplies the governing matter fact"
  })
});
put("p1-y58248-x7200", { section: CAPTION, label: "Name of the Petitioner in the caption", ...WRITE("participant.full_legal_name") });
put("p1-y55452-x38066", {
  section: CAPTION, label: "New civil case number assigned at filing",
  ...PROTECT(COURT_OWNED, "the district court clerk assigns this new case number when the petition is filed")
});
put("p1-y54054-x7200", {
  section: CAPTION, label: "Name of the Respondent in the caption",
  ...INAPPLICABLE(
    "Rule 1-077.1 NMRA styles this expungement proceeding with a petitioner and no respondent",
    "there is no respondent on this route, so the general civil respondent line stays empty"
  )
});

[
  ["p1-y42864-x20709", "Single", "you are single"],
  ["p1-y42864-x27582", "Married", "you are married"],
  ["p1-y42864-x35056", "Divorced", "you are divorced"],
  ["p1-y42864-x42196", "Separated", "you are separated"],
  ["p1-y42864-x49560", "Widowed", "you are widowed"]
].forEach(([key, label, what]) => put(key, BOX(STATUS, `Marital status: ${label}`, what)));
put("p1-y40068-x24495", BOX(STATUS, "Interpretation services: yes", "you need interpretation services"));
put("p1-y40068-x29269", BOX(STATUS, "Interpretation services: no", "you do not need interpretation services"));
put("p1-y38670-x7200", { section: STATUS, label: "Interpretation services needed, first line", ...SUPPLY("what interpretation you need and the language") });
put("p1-y37272-x7200", { section: STATUS, label: "Interpretation services needed, second line", ...SUPPLY("the second line of that description, if needed") });
put("p1-y35874-x7200", { section: STATUS, label: "Interpretation services needed, third line", ...SUPPLY("the third line of that description, if needed") });

put("p1-y28872-x7200", BOX(ASSISTANCE, "I do not receive public assistance", "you receive no public assistance"));
put("p1-y26076-x7200", BOX(ASSISTANCE, "I currently receive public assistance", "you currently receive public assistance"));
put("p1-y26076-x37055", { section: ASSISTANCE, label: "County in which public assistance is received", ...SUPPLY("the county in which you receive public assistance") });
[
  ["p1-y23280-x10800", "Temporary Assistance for Needy Families (TANF)"],
  ["p1-y21882-x10800", "Food Stamps"],
  ["p1-y20484-x10800", "Medicaid (for myself)"],
  ["p1-y19086-x10800", "General Assistance (GA)"],
  ["p1-y17688-x10800", "Supplemental Security Income (SSI)"],
  ["p1-y16290-x10800", "Public Housing"],
  ["p1-y14892-x10800", "Disability Security Income (DSI)"],
  ["p1-y13494-x10800", "Department of Health Case Management Services (DHMS)"],
  ["p1-y12096-x10800", "Other public assistance"]
].forEach(([key, label]) => put(key, BOX(ASSISTANCE, label, `you receive ${label}`)));
put("p1-y12096-x23640", { section: ASSISTANCE, label: "Other public assistance, description", ...SUPPLY("a description of any other public assistance you receive") });

/* Page 2 — employment and other income. */
put("p2-y70872-x7200", BOX(EMPLOYMENT, "I am currently unemployed", "you are currently unemployed"));
put("p2-y70872-x39379", { section: EMPLOYMENT, label: "Months unemployed in the past year", ...SUPPLY("how many months you have been unemployed in the past year") });
put("p2-y69474-x22882", { section: EMPLOYMENT, label: "Why I am unemployed", ...SUPPLY("why you are unemployed") });
put("p2-y68076-x10800", BOX(EMPLOYMENT, "I receive unemployment benefits", "you receive unemployment benefits"));
put("p2-y68076-x37764", MONEY(EMPLOYMENT, "Unemployment benefits per month", "how much you receive in unemployment benefits each month"));
put("p2-y66678-x10800", BOX(EMPLOYMENT, "I have no income because I am unemployed", "you have no income because you are unemployed"));
put("p2-y63882-x7200", BOX(EMPLOYMENT, "I am employed", "you are employed"));
put("p2-y63882-x24315", MONEY(EMPLOYMENT, "My hourly pay", "what you are paid per hour"));
put("p2-y63882-x37358", { section: EMPLOYMENT, label: "My hours per week", ...SUPPLY("how many hours you work each week") });
put("p2-y61086-x10800", { section: EMPLOYMENT, label: "My employer, first line", ...SUPPLY("your employer's name") });
put("p2-y59688-x10800", { section: EMPLOYMENT, label: "My employer, second line", ...SUPPLY("your employer's address") });
put("p2-y58290-x10800", { section: EMPLOYMENT, label: "My employer, third line", ...SUPPLY("your employer's phone number") });
put("p2-y55494-x7200", BOX(EMPLOYMENT, "My spouse is unemployed", "you are married and your spouse is unemployed"));
put("p2-y55494-x46576", { section: EMPLOYMENT, label: "Months my spouse was unemployed", ...SUPPLY("how many months your spouse has been unemployed in the past year") });
put("p2-y52698-x10800", { section: EMPLOYMENT, label: "Why my spouse is unemployed", ...SUPPLY("why your spouse is unemployed") });
put("p2-y51282-x10800", BOX(EMPLOYMENT, "My spouse receives unemployment benefits", "your spouse receives unemployment benefits"));
put("p2-y51282-x43070", MONEY(EMPLOYMENT, "My spouse's unemployment benefits per month", "how much your spouse receives in unemployment benefits each month"));
put("p2-y48480-x7200", BOX(EMPLOYMENT, "My spouse is employed", "you are married and your spouse is employed"));
put("p2-y48480-x40922", MONEY(EMPLOYMENT, "My spouse's hourly pay", "what your spouse is paid per hour"));
put("p2-y47082-x10800", { section: EMPLOYMENT, label: "My spouse's hours per week", ...SUPPLY("how many hours your spouse works each week") });
put("p2-y44286-x10800", { section: EMPLOYMENT, label: "My spouse's employer, first line", ...SUPPLY("your spouse's employer's name") });
put("p2-y42888-x10800", { section: EMPLOYMENT, label: "My spouse's employer, second line", ...SUPPLY("your spouse's employer's address") });
put("p2-y41490-x10800", { section: EMPLOYMENT, label: "My spouse's employer, third line", ...SUPPLY("your spouse's employer's phone number") });

put("p2-y35880-x7200", BOX(OTHER_INCOME, "I have other income", "you have income from another source"));
const incomeRows = [
  ["p2-y34482", "My child support", "x21774"],
  ["p2-y33084", "My alimony", "x19261"],
  ["p2-y31686", "My investment income", "x20799"],
  ["p2-y30288", "My community-property income", "x36596"]
];
for (const [prefix, label, amountX] of incomeRows) {
  put(`${prefix}-x10800`, BOX(OTHER_INCOME, `${label}, selected`, `${label.toLowerCase()} applies`));
  put(`${prefix}-${amountX}`, MONEY(OTHER_INCOME, `${label}, amount`, `the monthly amount for ${label.toLowerCase()}`));
}
put("p2-y28890-x10800", BOX(OTHER_INCOME, "My other income, selected", "you have another kind of income"));
put("p2-y28890-x17134", { section: OTHER_INCOME, label: "My other income, description", ...SUPPLY("a description of your other income") });
put("p2-y28890-x36601", MONEY(OTHER_INCOME, "My other income, amount", "the monthly amount of that other income"));
put("p2-y26094-x7200", BOX(OTHER_INCOME, "I have no other income", "you have no other sources of income"));
put("p2-y23298-x7200", BOX(OTHER_INCOME, "My spouse has other income", "your spouse has income from another source"));
const spouseIncomeRows = [
  ["p2-y21900", "My spouse's child support", "x21774"],
  ["p2-y20502", "My spouse's alimony", "x19261"],
  ["p2-y19104", "My spouse's investment income", "x20799"]
];
for (const [prefix, label, amountX] of spouseIncomeRows) {
  put(`${prefix}-x10800`, BOX(OTHER_INCOME, `${label}, selected`, `${label.toLowerCase()} applies`));
  put(`${prefix}-${amountX}`, MONEY(OTHER_INCOME, `${label}, amount`, `the monthly amount for ${label.toLowerCase()}`));
}
for (const [prefix, ordinal] of [["p2-y17706", "first"], ["p2-y16308", "second"]]) {
  put(`${prefix}-x10800`, BOX(OTHER_INCOME, `My spouse's ${ordinal} other income, selected`, `your spouse has this ${ordinal} other source of income`));
  put(`${prefix}-x17134`, { section: OTHER_INCOME, label: `My spouse's ${ordinal} other income, description`, ...SUPPLY(`a description of your spouse's ${ordinal} other income`) });
  put(`${prefix}-x36601`, MONEY(OTHER_INCOME, `My spouse's ${ordinal} other income, amount`, `the monthly amount of your spouse's ${ordinal} other income`));
}
put("p2-y13512-x7200", BOX(OTHER_INCOME, "My spouse has no other income", "your spouse has no other sources of income"));
put("p2-y10716-x7200", BOX(OTHER_INCOME, "Another adult contributes to household income", "another adult contributes to your household income"));
put("p2-y10716-x46493", MONEY(OTHER_INCOME, "Another adult's household contribution", "how much another adult contributes to your household each month"));

/* Page 3 — assets, expenses, household address, and first household row. */
put("p3-y65250-x25800", MONEY(ASSETS, "Cash on hand", "how much cash you have on hand"));
put("p3-y63852-x25798", MONEY(ASSETS, "Bank accounts", "how much you have in bank accounts"));
put("p3-y62454-x25798", MONEY(ASSETS, "Income tax refund", "how much income tax refund you expect"));
put("p3-y59658-x7200", { section: ASSETS, label: "Other asset 1, description", ...SUPPLY("a description of another asset you or your spouse can turn into cash") });
put("p3-y59658-x25800", MONEY(ASSETS, "Other asset 1, amount", "what that asset is worth"));
put("p3-y58260-x7200", { section: ASSETS, label: "Other asset 2, description", ...SUPPLY("a description of a second other asset") });
put("p3-y58260-x25800", MONEY(ASSETS, "Other asset 2, amount", "what that second asset is worth"));
[
  ["p3-y52656-x7200", "first"], ["p3-y51258-x7200", "second"],
  ["p3-y49860-x7200", "third"], ["p3-y48462-x7200", "fourth"]
].forEach(([key, ordinal]) => put(key, { section: ASSETS, label: `Why income or assets are inaccessible, ${ordinal} line`, ...SUPPLY(`the ${ordinal} line explaining why you cannot access your or your spouse's income or assets`) }));

const expenseRows = [
  ["p3-y42864-x29400", "House payment or rent"],
  ["p3-y41466-x29390", "Utilities"],
  ["p3-y40068-x29399", "Telephone"],
  ["p3-y38670-x29395", "Groceries after food stamps"],
  ["p3-y37272-x29398", "Car payments"],
  ["p3-y35874-x29397", "Gasoline"],
  ["p3-y34476-x29396", "Insurance"],
  ["p3-y33078-x29401", "Child care"],
  ["p3-y31680-x29397", "Student and consumer loans"],
  ["p3-y30282-x29395", "Court-ordered family support"],
  ["p3-y28884-x29394", "Other court-ordered payments"],
  ["p3-y27486-x29394", "Medical expenses"]
];
expenseRows.forEach(([key, label]) => put(key, MONEY(EXPENSES, `Monthly expense: ${label}`, `what you pay each month for ${label.toLowerCase()}`)));
put("p3-y26070-x9936", { section: EXPENSES, label: "Monthly expense: other, description", ...SUPPLY("a description of any other monthly expense") });
put("p3-y26070-x29400", MONEY(EXPENSES, "Monthly expense: other, amount", "what that other monthly expense costs each month"));

put("p3-y20478-x11168", {
  section: HOUSEHOLD, label: "I live at, full mailing address on one line",
  ...WRITE_BOUND_AS("participant.full_mailing_address", {
    factId: "participant.street_address", label: "Mailing Address",
    why: "the form asks for the whole address on one line; the platform holds and composes its street, city, state, and ZIP parts"
  })
});
put("p3-y19080-x22971", { section: HOUSEHOLD, label: "Head of the household", ...SUPPLY("the name of the head of your household") });
put("p3-y10692-x7200", HOUSEHOLD_FIELD(1, "name", "the name"));
put("p3-y10692-x28804", HOUSEHOLD_FIELD(1, "age", "the age"));
put("p3-y10692-x36005", HOUSEHOLD_FIELD(1, "employment", "the employment"));

/* Page 4 — remaining household rows, oath, identity, and jurat. */
const householdBaselines = ["p4-y70872", "p4-y68076", "p4-y65280", "p4-y62484", "p4-y59688", "p4-y56892"];
householdBaselines.forEach((prefix, i) => {
  const row = i + 2;
  put(`${prefix}-x7200`, HOUSEHOLD_FIELD(row, "name", "the name"));
  put(`${prefix}-x28804`, HOUSEHOLD_FIELD(row, "age", "the age"));
  put(`${prefix}-x36005`, HOUSEHOLD_FIELD(row, "employment", "the employment"));
});
/* The source draws support controls as empty parentheses, not measured blanks. */

put("p4-y41556-x28800", { section: OATH, label: "Signature of the applicant", ...PROTECT(SIGNATURE, "the applicant signs this sworn statement; no build signs it") });
put("p4-y37380-x28800", { section: OATH, label: "Printed name of the applicant", ...WRITE("participant.full_legal_name") });
put("p4-y33222-x28800", {
  section: OATH,
  label: "The applicant is the Petitioner",
  policy: "route_selection",
  why: "Rule 1-077.1 NMRA fixes the applicant's role as Petitioner on this route"
});
put("p4-y33222-x37208", {
  section: OATH, label: "The applicant is the Respondent",
  ...INAPPLICABLE(
    "Rule 1-077.1 NMRA makes the applicant the petitioner and has no respondent on this route",
    "the Respondent choice does not apply to this expungement proceeding"
  )
});
put("p4-y29064-x28800", { section: OATH, label: "Street Address of the applicant", ...WRITE("participant.street_address") });
put("p4-y24906-x28800", { section: OATH, label: "City, State, Zip Code of the applicant", ...WRITE("participant.city_state_zip") });
put("p4-y20748-x28800", { section: OATH, label: "Telephone of the applicant", ...SUPPLY("your telephone number") });
put("p4-y16572-x11200", NOTARY("State in the notarial jurat"));
put("p4-y13776-x12333", NOTARY("County in the notarial jurat"));

/* Page 5 — balance of jurat and attorney-only certificate. */
put("p5-y70872-x30444", NOTARY("Date signed and sworn before the notary"));
put("p5-y69474-x8700", NOTARY("Name of the applicant in the notarial jurat"));
put("p5-y65280-x28800", NOTARY("Signature of the notary"));
put("p5-y62484-x40961", NOTARY("Notary commission expiration"));
put("p5-y55482-x11801", ATTORNEY_FIELD("Name of attorney"));
put("p5-y51300-x14905", ATTORNEY_FIELD("Name of applicant in the attorney certificate"));
put("p5-y41514-x28800", ATTORNEY_FIELD("Attorney signature"));
put("p5-y37332-x28800", ATTORNEY_FIELD("Attorney address"));
put("p5-y33150-x28800", ATTORNEY_FIELD("Attorney city, state, and ZIP code"));
put("p5-y28968-x28800", ATTORNEY_FIELD("Attorney telephone or fax number"));

export const DICTIONARY_4_222 = Object.freeze(dictionary);
