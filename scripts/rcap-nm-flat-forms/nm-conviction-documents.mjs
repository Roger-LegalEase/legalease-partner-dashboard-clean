/**
 * The four documents that belong to the New Mexico conviction track alone.
 *
 *   4-953 NMRA                 Petition to expunge; upon conviction    (5 pages, 113 blanks)
 *   4-956 NMRA                 Certificate of service; upon conviction (2 pages,  26 blanks)
 *   4-960 NMRA                 Notice of completion of briefing        (3 pages,  44 blanks)
 *   4-960.3 NMRA               Affirmation in support; upon conviction (2 pages,  22 blanks)
 *   NM-LOCAL-CONVICTION-ORDER  Order on petition to expunge            (4 pages,  70 blanks)
 *
 * WHY THE CERTIFICATE OF SERVICE IS WRITTEN ONLY IN ITS CAPTION
 *
 * Form 4-956 is a certificate of service from end to end: everything below its
 * caption is the petitioner certifying, under penalty of perjury, the day they
 * mailed the petition and to whom. Service has not happened when this packet is
 * prepared, and the platform has no knowledge of it. The shared field semantics
 * protect a service block for exactly this reason -- the comment in the
 * finalizer names AK TF-800's certDate and NE DC 1:15's printedname, where a
 * platform filled a sworn statement about service it knew nothing about -- and
 * this build agrees with it rather than working round it. The caption is not a
 * certification; it names the case. So the caption is written and nothing else
 * is, on Form 4-956 and on the certificate of service printed at the foot of
 * Form 4-960.
 *
 * WHY THE SECOND-STAGE FORMS SAY THINGS ONLY THE PARTICIPANT CAN SAY
 *
 * Form 4-960 asserts that sixty-three days have passed since mailing and states,
 * for each of the three responding parties, whether it filed a non-objection, an
 * objection, or nothing. Form 4-960.3 affirms under penalty of perjury that no
 * charge is pending and that there has been no conviction in the relevant
 * period. None of that is knowable when the packet is prepared -- the whole
 * point of the second stage is that it happens sixty-three days later -- so
 * every one of those controls and lines is the participant's.
 */
import { WRITE, SUPPLY, PROTECT, DECRETAL, ELECTION, ATTORNEY, OPTIONAL, NOT_A_BLANK, COURT_OWNED, SIGNATURE }
  from "./nm-packet-host.mjs";

/* ------------------------------------------------------------------ *
 * Shared shapes.
 * ------------------------------------------------------------------ */

/** A printed control the participant marks by hand. */
export const HAND_BOX = (section, label, what) => ({
  section, label,
  ...ELECTION(
    "the participant marks this. The form draws the control as a printed character rather than as a stroked box or a "
    + `form field, so there is no measured control for this build to mark and no geometry to invent one from; `
    + `participant-instructions.md names it and says when to mark it: ${what}`
  )
});

/** A blank inside the court's own order. */
export const COURT_LINE = (section, label, why) => ({ section, label, ...PROTECT(COURT_OWNED, why) });
export const COURT_CONTROL = (section, label, why) => ({
  section, label,
  ...PROTECT(COURT_OWNED, `${why}. The form draws the control as a symbol-font glyph rather than as a stroked box or a form field, so there is nothing measured for this build to mark even if it were this build's to mark`)
});

const CAPTION = "Caption";

/** The caption every one of these forms prints, identically. */
const captionRows = (keys) => ({
  [keys.county]: { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") },
  [keys.district]: { section: CAPTION, label: "Judicial district of the district court in the caption", ...WRITE("matter.court") },
  [keys.name]: { section: CAPTION, label: "In re, the petitioner's name", ...WRITE("participant.full_legal_name") }
});

/**
 * The alias lines, which the shared fact registry cannot bind.
 *
 * The intake for every one of these tracks collects the participant's other
 * names, and the registry has no descriptor for an alias: the only name
 * descriptor whose pattern reaches a line like this is the petitioner's own
 * FULL LEGAL NAME, and writing that on an alias line of a petition sworn under
 * penalty of perjury would be a false statement. The gap is recorded in each
 * family's build-findings.json rather than worked round.
 */
const ALIAS_LINES = (section, keys) => ({
  [keys[0]]: {
    section, label: "Other names or aliases by which Petitioner has been known, first line",
    ...SUPPLY("every other name your records might be under: a former name, a nickname, an alias", "the shared fact registry has no descriptor for other names or aliases: the only name descriptor whose pattern reaches a line like this is the petitioner's own FULL LEGAL NAME, so binding it would put the petitioner's legal name on the alias line of a petition sworn under penalty of perjury. Reported to the owner of the registry in build-findings.json.")
  },
  [keys[1]]: { section, label: "Other names or aliases, second line", ...OPTIONAL("the second of three lines the form gives for a list of unknown length") },
  [keys[2]]: { section, label: "Other names or aliases, third line", ...OPTIONAL("the third of three lines the form gives for a list of unknown length") }
});

/* ------------------------------------------------------------------ *
 * 4-953 NMRA — Petition to expunge arrest records and public records;
 * upon conviction.
 * ------------------------------------------------------------------ */

export const FORM_4_953 = Object.freeze({
  sourceId: "official-form:4-953", documentId: "NM-4-953", formNumber: "4-953",
  title: "Petition to expunge arrest records and public records; upon conviction",
  sha256: "2ee3d41243e0a7e807ed52e77ac08fda9e0c55c7abdef3195a53de29a0f90c40",
  strategy: "measured_flat_overlay", pages: 5, instrumentKind: "primary_filing"
});

const P1 = "1. Information about Petitioner";
const P2 = "2. Pending expungement cases";
const P3 = "3. Prior expungement applications";
const P4 = "4. The cases and records to be expunged";
const P5 = "5. Related appellate cases";
const P6 = "6. The convictions to be expunged";
const P7 = "7. Related cases";
const P8 = "8. Other pending charges";
const P9 = "9. Time since the last conviction";
const P10 = "10. Fines, fees and restitution";
const P11 = "11. Excluded offences";
const P12 = "12. Why justice will be served";
const P13 = "13. Agencies holding the records";
const P14 = "14. Where the charges were disposed of or originated";
const P15 = "15. Who the petition will be mailed to";
const P16 = "16. RAP sheets attached";
const P17 = "17. Additional documentation attached";
const P18 = "18. Telephonic or electronic appearance";
const SIGN = "Signature section";
const ATTY = "Attorney block (page 5)";

export const DICTIONARY_4_953 = {
  ...captionRows({ county: "p1-y62820-x14328", district: "p1-y61236-x7200", name: "p1-y55512-x9720" }),

  "p1-y43092-x13476": {
    section: CAPTION, label: "Petitioner is unrepresented by counsel",
    ...ELECTION("whether the petitioner is represented by counsel is a fact about them that the platform does not hold, and the attorney block on page 5 is left empty for the same reason. The form draws the control as a printed \"[ ]\" character, so there is no measured control to mark; participant-instructions.md tells the participant to mark this box if they are filing without a lawyer")
  },
  "p1-y43092-x27804": {
    section: CAPTION, label: "Petitioner is represented by counsel",
    ...ELECTION("the other half of the same election. No attorney-representation fact is held for this participant, and the form draws the control as a printed \"[ ]\" character with no measured geometry to mark")
  },
  "p1-y40584-x18840": NOT_A_BLANK(
    "an amendment underline beneath the printed statutory citation on the paragraph above; it carries printed words and "
    + "is one of the marks the 2025 amendments left on this form, not a place anyone writes"
  ),

  "p1-y33036-x15960": { section: P1, label: "Date of Birth", ...WRITE("participant.date_of_birth") },
  "p1-y31644-x21636": { section: P1, label: "Current Mailing Address", ...WRITE("participant.street_address") },
  "p1-y29856-x11700": { section: P1, label: "City", ...WRITE("participant.city") },
  "p1-y29856-x28536": { section: P1, label: "State", ...WRITE("participant.state") },
  "p1-y29856-x45036": { section: P1, label: "Zip Code", ...WRITE("participant.zip") },
  "p1-y30048-x50400": NOT_A_BLANK(
    "the tail of the Zip Code rule, drawn a second time as underscore glyphs. Measured at x504 to x534 on the same "
    + "printed line as the Zip Code stroke, which spans x450.36 to x534, so it sits INSIDE that rule rather than beside "
    + "it. The ZIP is written on the rule and this is the same blank, not a second one"
  ),
  "p1-y28272-x16764": { section: P1, label: "Home Phone #", ...SUPPLY("your home telephone number, if you have one", "the intake for this track asks for no telephone number and no e-mail address. Home, work and cell are three different facts, and writing one held number into any of them would assert on a petition sworn under penalty of perjury which kind of number it is.") },
  "p1-y28464-x33072": { section: P1, label: "Work Phone #", ...SUPPLY("your work telephone number, if you have one") },
  "p1-y28464-x45012": { section: P1, label: "Cell #", ...SUPPLY("your mobile telephone number, if you have one") },
  ...ALIAS_LINES(P1, ["p1-y22116-x9000", "p1-y20532-x9000", "p1-y18948-x9000"]),

  "p1-y15972-x9000": HAND_BOX(P2, "Petitioner has no pending expungement cases", "mark it if you have no other expungement case pending in this judicial district"),
  "p1-y15972-x35520": { section: P2, label: "Judicial district in which Petitioner has no pending expungement cases", ...WRITE("matter.court") },
  "p1-y14592-x9000": HAND_BOX(P2, "Petitioner has the following pending expungement cases", "mark it instead if you do have other expungement cases pending, and list their case numbers"),
  "p1-y14592-x44556": { section: P2, label: "Judicial district in which Petitioner has pending expungement cases", ...WRITE("matter.court") },
  "p1-y11832-x30888": { section: P2, label: "Judicial district court the pending expungement cases are before", ...WRITE("matter.court") },
  "p1-y10452-x12540": { section: P2, label: "Pending expungement case numbers, first line", ...SUPPLY("the case number of any other expungement case of yours pending in this judicial district") },
  "p1-y9072-x9000": { section: P2, label: "Pending expungement case numbers, second line", ...SUPPLY("a second pending expungement case number, if you have one") },

  "p2-y70344-x9000": HAND_BOX(P3, "Petitioner has never applied for expungement and been denied", "mark it if you have never been denied an expungement"),
  "p2-y68964-x9000": HAND_BOX(P3, "Petitioner has applied for expungement and been denied", "mark it instead if you have been denied, and give the case numbers"),
  "p2-y67584-x32184": { section: P3, label: "Expungement case numbers in which Petitioner was denied, first line", ...SUPPLY("the case number of any expungement you were denied") },
  "p2-y66204-x9000": { section: P3, label: "Expungement case numbers in which Petitioner was denied, second line", ...SUPPLY("a second case number in which you were denied, if there is one") },
  "p2-y64824-x9000": { section: P3, label: "Expungement case numbers in which Petitioner was denied, third line", ...SUPPLY("a third case number in which you were denied, if there is one") },

  "p2-y60684-x23388": { section: P4, label: "District Court case number(s) that are the subject of the petition", ...WRITE("matter.case_number") },
  "p2-y59304-x37188": { section: P4, label: "Metropolitan, Magistrate or Municipal Court case number(s)", ...SUPPLY("the case number in any metropolitan, magistrate or municipal court, if the case was there too") },
  "p2-y57924-x29880": { section: P4, label: "Law Enforcement Agency case number(s)", ...SUPPLY("the case number the law enforcement agency gave this matter, from your records", "the platform's shared field semantics protect every agency, sheriff, police and law-enforcement line from being written by a build, because a slot naming agencies is more often a court's list of who must seal than a participant's statement of who holds. The value is in the participant's intake.") },
  "p2-y56544-x17856": { section: P4, label: "Arrest number(s)", ...SUPPLY("the arrest number from your fingerprint card or RAP sheet") },

  "p2-y52404-x25488": { section: P5, label: "Court of Appeals case number(s) related to the petition", ...OPTIONAL("most petitions have no related appellate case; the participant fills this only if theirs does, and the platform holds no appellate record") },
  "p2-y51024-x24516": { section: P5, label: "Supreme Court case number(s) related to the petition", ...OPTIONAL("most petitions have no related Supreme Court case; the participant fills this only if theirs does") },

  "p2-y42744-x21732": { section: P6, label: "Date of offense or arrest for the first conviction", ...SUPPLY("the date of the offence or the arrest for the first conviction you are asking to expunge, from the record", "the intake collects an approximate date and this line goes on a petition sworn under penalty of perjury.") },
  "p2-y41364-x31824": { section: P6, label: "Name and statute or ordinance number of the first offence", ...SUPPLY("the name of the offence and the statute or ordinance number, exactly as the record states them") },
  "p2-y39984-x21636": { section: P6, label: "Date the sentence for the first conviction was completed", ...SUPPLY("the date you completed the sentence for that conviction — this is what the waiting period in paragraph 9 runs from") },
  "p2-y38604-x21168": { section: P6, label: "Date the fines and fees for the first conviction were paid", ...SUPPLY("the date you finished paying the fines and fees for that conviction") },
  "p2-y35844-x9000": HAND_BOX(P6, "Additional pages of convictions are attached", "mark it if you are asking to expunge more than one conviction and have attached a page for each"),

  "p2-y33084-x10404": HAND_BOX(P7, "Petitioner has no cases related to the charges sought to be expunged", "mark it if no other case was joined with this one"),
  "p2-y31704-x9000": HAND_BOX(P7, "The following cases are related to the charges sought to be expunged", "mark it instead if a case was joined with a co-defendant or as the result of a plea, and list them"),
  "p2-y27564-x9000": { section: P7, label: "Related cases, first line", ...SUPPLY("the name and number of any case joined with yours, whether with a co-defendant or as the result of a plea") },
  "p2-y26184-x9000": { section: P7, label: "Related cases, second line", ...SUPPLY("a second related case, if there is one") },
  "p2-y24804-x9000": { section: P7, label: "Related cases, third line", ...SUPPLY("a third related case, if there is one") },

  "p2-y22044-x10404": HAND_BOX(P8, "There is currently no other charge or proceeding pending against Petitioner", "mark it if nothing is pending against you anywhere. Section 29-3A-5 requires it, and if something IS pending you are not eligible on this track"),

  "p2-y15144-x10800": HAND_BOX(P9, "No other criminal conviction for two years", "mark the one period that matches the most serious charge you are asking to expunge: two years for a municipal ordinance violation or a misdemeanour"),
  "p2-y13764-x10800": HAND_BOX(P9, "No other criminal conviction for four years", "four years for a misdemeanour aggravated battery under Section 30-3-5(B) or a fourth degree felony"),
  "p2-y12384-x10800": HAND_BOX(P9, "No other criminal conviction for six years", "six years for a third degree felony"),
  "p2-y11004-x10800": HAND_BOX(P9, "No other criminal conviction for eight years", "eight years for a second degree felony"),
  "p2-y9624-x10800": HAND_BOX(P9, "No other criminal conviction for ten or more years", "ten years for a first degree felony or any offence under the Crimes Against Household Members Act"),

  "p3-y70344-x11052": HAND_BOX(P10, "Petitioner has paid all fines and fees and fulfilled all victim restitution", "mark it if you have paid everything ordered for the charges you are asking to expunge. Section 29-3A-5 requires it"),
  "p3-y66204-x11604": HAND_BOX(P11, "Petitioner is not seeking to expunge any excluded conviction", "mark it if none of the convictions you are asking to expunge is an offence against a child, an offence causing great bodily harm or death, a sex offence under Section 29-11A-3, embezzlement under Section 30-16-8, or a DWI"),
  "p3-y66456-x7608": NOT_A_BLANK("a printed bullet mark in the list of excluded offences, not a place anyone writes"),
  "p3-y62064-x43764": NOT_A_BLANK("an amendment underline beneath printed words in the list of excluded offences"),
  "p3-y53604-x7608": NOT_A_BLANK("a printed bullet mark in the list of excluded offences, not a place anyone writes"),

  "p3-y47832-x7200": { section: P12, label: "Why justice will be served by granting the petition, first line", ...SUPPLY("why you are asking for expungement — employment, licensing, housing — and what has happened or will happen to you if it is refused. This is the heart of the petition and only you can write it") },
  "p3-y46452-x7200": { section: P12, label: "Why justice will be served, second line", ...SUPPLY("the second line of that explanation") },
  "p3-y45072-x7200": { section: P12, label: "Why justice will be served, third line", ...SUPPLY("the third line of that explanation") },
  "p3-y43692-x7200": { section: P12, label: "Why justice will be served, fourth line", ...SUPPLY("the fourth line of that explanation") },
  "p3-y42312-x7200": { section: P12, label: "Why justice will be served, fifth line", ...SUPPLY("the fifth line of that explanation") },
  "p3-y40932-x9000": HAND_BOX(P12, "Additional pages of explanation are attached", "mark it if you have written more than fits on these five lines and attached the rest"),
  "p3-y38424-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),

  "p3-y35412-x9000": HAND_BOX(P13, "Agency holding records: District Court", "mark it if the district court holds records of this case"),
  "p3-y35412-x20340": { section: P13, label: "Judicial district of the District Court holding the records", ...WRITE("matter.court") },
  "p3-y34032-x9000": HAND_BOX(P13, "Agency holding records: County Sheriff's Department", "mark it if the county sheriff holds records of this case"),
  "p3-y34032-x10416": { section: P13, label: "County of the Sheriff's Department holding the records", ...SUPPLY("the county whose sheriff's department holds records of this case, which need not be the county you are filing in", "the platform's shared field semantics protect every agency, sheriff, police and law-enforcement line from being written by a build, because a slot naming agencies is more often a court's list of who must seal than a participant's statement of who holds. The value is in the participant's intake.") },
  "p3-y32652-x9000": HAND_BOX(P13, "Agency holding records: District Attorney", "mark it if the district attorney holds records of this case"),
  "p3-y32652-x22320": { section: P13, label: "Judicial district of the prosecuting office that holds the records", ...SUPPLY("the judicial district of the district attorney who holds records of this case", "the platform's shared field semantics protect every district-attorney and prosecutor line from being written by a build.") },
  "p3-y31272-x9000": HAND_BOX(P13, "Agency holding records: New Mexico Department of Public Safety", "mark it if the Department of Public Safety holds records of this case. On this track it is served with the petition, so it almost certainly does"),
  "p3-y29892-x9000": HAND_BOX(P13, "Agency holding records: Law Enforcement Agency that arrested Petitioner", "mark it if a law enforcement agency holds records of this case, and write the agency's name on the line beside the box"),
  "p3-y29892-x43848": { section: P13, label: "Name of the Law Enforcement Agency that arrested Petitioner, first line", ...SUPPLY("the law enforcement agency that arrested you, which is the agency you named when you answered our questions", "the platform's shared field semantics protect every agency, sheriff, police and law-enforcement line from being written by a build, because a slot naming agencies is more often a court's list of who must seal than a participant's statement of who holds. The value is in the participant's intake.") },
  "p3-y28512-x9000": { section: P13, label: "Name of the Law Enforcement Agency that arrested Petitioner, second line", ...SUPPLY("the rest of the agency's name and its address, if the line above is not enough") },
  "p3-y27132-x9000": HAND_BOX(P13, "Agency holding records: Metropolitan, Magistrate or Municipal Court", "mark it if a metropolitan, magistrate or municipal court holds records of this case"),
  "p3-y27132-x31968": { section: P13, label: "Location of the Metropolitan, Magistrate or Municipal Court holding the records", ...SUPPLY("the town or city that court sits in — the intake collects the court and not the place it sits") },
  "p3-y25752-x9000": HAND_BOX(P13, "Agency holding records: New Mexico State Police Investigations Bureau", "mark it if the State Police Investigations Bureau holds records of this case"),
  "p3-y24372-x9000": HAND_BOX(P13, "Agency holding records: Other", "mark it if some other agency holds records of this case, and name it"),
  "p3-y24372-x14076": { section: P13, label: "Other agency holding the records", ...SUPPLY("the name and address of any other agency that holds records of this case") },
  "p3-y21864-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),

  "p3-y20244-x13524": HAND_BOX(P14, "Charges were disposed of or originated in the District Court", "mark the one court the charges were disposed of or originated in"),
  "p3-y20244-x24864": { section: P14, label: "Judicial district of the District Court the charges were disposed of or originated in", ...WRITE("matter.court") },
  "p3-y18864-x9000": HAND_BOX(P14, "Charges were disposed of or originated in the Metropolitan Court", "mark it instead if they were in a metropolitan court"),
  "p3-y18864-x21228": { section: P14, label: "Location of the Metropolitan Court the charges were disposed of or originated in", ...SUPPLY("the town or city that metropolitan court sits in") },
  "p3-y17484-x9000": HAND_BOX(P14, "Charges were disposed of or originated in the Magistrate Court", "mark it instead if they were in a magistrate court"),
  "p3-y17484-x20100": { section: P14, label: "Location of the Magistrate Court the charges were disposed of or originated in", ...SUPPLY("the town or city that magistrate court sits in") },
  "p3-y16104-x9000": HAND_BOX(P14, "Charges were disposed of or originated in the Municipal Court", "mark it instead if they were in a municipal court"),
  "p3-y16104-x19908": { section: P14, label: "Location of the Municipal Court the charges were disposed of or originated in", ...SUPPLY("the town or city that municipal court sits in") },
  "p3-y13596-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),

  "p3-y13344-x11604": HAND_BOX(P15, "A copy of this Petition will be mailed to the three responding parties", "mark it, and then actually mail it. On this track service is required: you mail the petition and everything attached to it, by first-class United States mail, to the district attorney, the Department of Public Safety and the agency that arrested you"),
  "p3-y10584-x30036": { section: P15, label: "Judicial district of the prosecuting office the petition will be mailed to", ...SUPPLY("the judicial district of the district attorney where your charge originated", "the platform's shared field semantics protect every district-attorney and prosecutor line from being written by a build.") },
  "p4-y70344-x16404": { section: P15, label: "Address of the prosecuting office the petition will be mailed to", ...SUPPLY("the street address of that district attorney's office, which you get from the court or from the office itself") },
  "p4-y64824-x16392": { section: P15, label: "Name of the law enforcement agency that arrested Petitioner, in the mailing list", ...SUPPLY("the name of the agency that arrested you", "the platform's shared field semantics protect every agency, sheriff, police and law-enforcement line from being written by a build, because a slot naming agencies is more often a court's list of who must seal than a participant's statement of who holds. The value is in the participant's intake.") },
  "p4-y62064-x16656": { section: P15, label: "Address of the law enforcement agency that arrested Petitioner", ...SUPPLY("the street address of that agency") },
  "p4-y58176-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),
  "p4-y57924-x12276": HAND_BOX(P16, "FBI and DPS RAP sheets are attached", "mark it once you have attached your FBI and DPS Record of Arrest and Prosecution sheets. They must be dated no more than ninety days before you file"),
  "p4-y54036-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),
  "p4-y35844-x13716": { section: P17, label: "Other documentation attached", ...SUPPLY("a list of any other documents you are attaching beyond the sentence, fines, fees and restitution paperwork the form already lists") },
  "p4-y31956-x7608": NOT_A_BLANK("a printed bullet mark, not a place anyone writes"),
  "p4-y31704-x11604": HAND_BOX(P18, "Petitioner wishes to attend any hearings by telephonic or other electronic means", "mark it if you want to attend the hearing by telephone or video. Rule 1-077.1(J) NMRA allows it on this form and no separate motion is needed. On this track there is a hearing in every case"),

  "p4-y24804-x7200": NOT_A_BLANK(
    "a full-width printed divider immediately above the heading \"SIGNATURE SECTION\". It runs the whole text column, "
    + "sits under no prompt and has no caption; writing on it would put a value across the head of the signature section"
  ),
  "p4-y16524-x7200": { section: SIGN, label: "Printed name of Petitioner", ...WRITE("participant.full_legal_name") },
  "p4-y16524-x36000": { section: SIGN, label: "Date beside the printed name of Petitioner", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The petition is affirmed under penalty of perjury under the laws of the State of New Mexico, and the date it is affirmed is the date the participant signs it") },
  "p4-y13764-x7200": { section: SIGN, label: "Signature of Petitioner", ...PROTECT(SIGNATURE, "signature or date field; the participant signs their own petition and no build signs it for them") },
  "p4-y11004-x7200": { section: SIGN, label: "Mailing Address of the Petitioner on page 4", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP. It is the same address you gave us, written out in parts in paragraph 1", "the shared fact registry has no one-line mailing-address fact; its only address descriptor is the street line, and a street with no city on the line the court writes to is worse than a line the participant completes. Reported to the owner of the registry in build-findings.json.") },
  "p4-y8244-x7200": { section: SIGN, label: "Telephone Number of the Petitioner on page 4", ...SUPPLY("your telephone number, so the court can reach you") },
  "p4-y8244-x36000": { section: SIGN, label: "Email of the Petitioner on page 4", ...SUPPLY("your e-mail address, if you have one") },

  "p5-y67584-x7200": { section: ATTY, label: "Attorney Name (if applicable)", ...ATTORNEY("the form marks this block \"if applicable\"; no attorney-representation fact is held for this participant and this packet is prepared for a self-represented petitioner") },
  "p5-y67584-x36000": { section: ATTY, label: "Date beside the attorney's name", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant, and a date on a signature block is never completed by this build") },
  "p5-y64824-x7200": { section: ATTY, label: "Attorney Signature", ...ATTORNEY("signature field in the attorney block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p5-y62064-x7200": { section: ATTY, label: "Mailing Address of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p5-y58896-x7200": { section: ATTY, label: "Telephone Number of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p5-y58896-x36000": { section: ATTY, label: "Email of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") }
};

/* ------------------------------------------------------------------ *
 * 4-956 NMRA — Certificate of service; expungement of records upon
 * conviction. Caption written; nothing else.
 * ------------------------------------------------------------------ */

export const FORM_4_956 = Object.freeze({
  sourceId: "official-form:4-956", documentId: "NM-4-956", formNumber: "4-956",
  title: "Certificate of service; expungement of records upon conviction",
  sha256: "a6a01d6853d6ae3199bf81a355065ecf40cf20e76a8d1131d9bc5b56527b4c0e",
  strategy: "measured_flat_overlay", pages: 2, instrumentKind: "certificate_of_service"
});

const CERT = "The certificate, completed after you have mailed";
const CERT_SIGN = "The certificate's signature block";
const CERT_ATTY = "The certificate's attorney block";

const AFTER_MAILING = (label, what) => ({
  section: CERT, label, ...SUPPLY(what, "everything below the caption of a certificate of service is the petitioner certifying under penalty of perjury when they posted the petition and to whom. Service has not happened when the packet is prepared and the platform has no knowledge of it; the shared field semantics protect a service block for the same reason.")
});

export const DICTIONARY_4_956 = {
  ...captionRows({ county: "p1-y62820-x14328", district: "p1-y61236-x7200", name: "p1-y55512-x9720" }),

  "p1-y44472-x23856": AFTER_MAILING("The day of the month you mailed the petition", "the day of the month on which you posted the petition"),
  "p1-y44472-x32184": AFTER_MAILING("The month you mailed the petition", "the month in which you posted the petition"),
  "p1-y44472-x40860": AFTER_MAILING("The year you mailed the petition", "the year in which you posted the petition"),
  "p1-y41712-x26232": AFTER_MAILING("The date the petition was filed", "the date the court clerk stamped your petition as filed, which is not the date you posted it"),
  "p1-y37572-x10800": HAND_BOX(CERT, "Mailed to the New Mexico Department of Public Safety", "mark it once you have posted a copy to the Department of Public Safety at P.O. Box 1628, Santa Fe, New Mexico 87504-1628, which the form prints for you"),
  "p1-y34812-x10800": HAND_BOX(CERT, "Mailed to the district attorney", "mark it once you have posted a copy to the district attorney"),
  "p1-y34812-x27420": AFTER_MAILING("Judicial district of the prosecuting office you mailed to", "the judicial district of the district attorney you posted to"),
  "p1-y33432-x14400": AFTER_MAILING("Address of the prosecuting office you mailed to", "the street address you posted it to"),
  "p1-y30672-x10800": HAND_BOX(CERT, "Mailed to the law enforcement agency that arrested Petitioner", "mark it once you have posted a copy to the agency that arrested you"),
  "p1-y29292-x14400": AFTER_MAILING("Address of the law enforcement agency you mailed to", "the street address you posted it to"),
  "p1-y25140-x7200": HAND_BOX(CERT, "Petitioner is pro se", "mark it if you are filing without a lawyer"),
  "p1-y25140-x36000": HAND_BOX(CERT, "Petitioner is represented by counsel", "mark it instead if a lawyer is representing you"),

  "p1-y16872-x6300": AFTER_MAILING("Petitioner Printed Name in the certificate", "your name, printed, beneath the declaration that the statements in the certificate are true"),
  "p1-y14112-x6300": AFTER_MAILING("Petitioner Address in the certificate", "your mailing address"),
  "p1-y11352-x6300": AFTER_MAILING("Petitioner Telephone Number in the certificate", "your telephone number"),
  "p1-y8592-x6300": { section: CERT_SIGN, label: "Petitioner Signature in the certificate", ...PROTECT(SIGNATURE, "signature or date field; the certificate is declared under penalty of perjury and the participant signs it themselves, after they have posted the petition") },
  "p2-y68964-x6300": { section: CERT_SIGN, label: "Date of Signature beneath the Petitioner's signature", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. It is the date the participant signs a statement made under penalty of perjury") },

  "p1-y19632-x30600": { section: CERT_ATTY, label: "Attorney Printed Name in the certificate", ...ATTORNEY("the right-hand column of this certificate is the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y16872-x30600": { section: CERT_ATTY, label: "Attorney Address in the certificate", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y14112-x30600": { section: CERT_ATTY, label: "Attorney Telephone Number in the certificate", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y11352-x30600": { section: CERT_ATTY, label: "A second Petitioner Telephone Number, printed in the attorney's column", ...ATTORNEY("the form prints this line inside the attorney's column; no attorney-representation fact is held for this participant, and the participant's own telephone number goes in the left-hand column") },
  "p1-y8592-x30600": { section: CERT_ATTY, label: "Attorney Signature in the certificate", ...ATTORNEY("signature field in the attorney's block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p2-y70344-x30600": { section: CERT_ATTY, label: "Date of Signature beneath the attorney's signature", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") }
};

/* ------------------------------------------------------------------ *
 * 4-960 NMRA — Notice of completion of briefing; upon conviction.
 * ------------------------------------------------------------------ */

export const FORM_4_960 = Object.freeze({
  sourceId: "official-form:4-960", documentId: "NM-4-960", formNumber: "4-960",
  title: "Notice of completion of briefing; upon conviction",
  sha256: "79c8556655ee6e36a5a5516309e869637401f753c70172ecd78bfa138655d4de",
  strategy: "measured_flat_overlay", pages: 3, instrumentKind: "second_stage_notice"
});

const NOTICE = "What the notice states";
const NOTICE_SIGN = "The notice's signature block";
const NOTICE_ATTY = "The notice's attorney block";
const NOTICE_CERT = "The certificate of service at the foot of the notice";

const SECOND_STAGE = (section, label, what) => ({
  section, label, ...SUPPLY(what, "this form is filed sixty-three days or more after the petition is served and states what happened in that period. None of it is knowable when the packet is prepared.")
});

export const DICTIONARY_4_960 = {
  ...captionRows({ county: "p1-y62820-x14328", district: "p1-y61236-x7200", name: "p1-y55512-x9720" }),

  "p1-y37500-x10800": HAND_BOX(NOTICE, "Notice of the Petition has been provided by first-class mail", "mark it once you have posted the petition to all three responding parties"),
  "p1-y35208-x14400": HAND_BOX(NOTICE, "Notice was provided to the District Attorney", "mark it once you have posted a copy to the district attorney"),
  "p1-y35208-x29400": SECOND_STAGE(NOTICE, "Judicial district of the prosecuting office the notice was provided to", "the judicial district of the district attorney you posted to"),
  "p1-y33828-x14400": HAND_BOX(NOTICE, "Notice was provided to the New Mexico Department of Public Safety", "mark it once you have posted a copy to the Department of Public Safety"),
  "p1-y32448-x14400": HAND_BOX(NOTICE, "Notice was provided to the law enforcement agency that arrested Petitioner", "mark it once you have posted a copy to the agency that arrested you"),
  "p1-y29868-x10800": HAND_BOX(NOTICE, "At least sixty-three days have passed since Petitioner mailed the Petition", "mark it only when sixty-three days have actually passed. Rule 1-077.1(G) gives the responding parties sixty days from service and Rule 1-006(C) adds three for service by mail"),
  "p1-y26088-x10800": HAND_BOX(NOTICE, "The District Attorney's response", "mark the heading, then mark one of the three lines below it"),
  "p1-y23796-x14400": HAND_BOX(NOTICE, "The District Attorney has filed a Notice of Non-Objection", "mark it if the district attorney filed a non-objection"),
  "p1-y22416-x14400": HAND_BOX(NOTICE, "The District Attorney has filed an objection", "mark it if the district attorney objected"),
  "p1-y21036-x14400": HAND_BOX(NOTICE, "The District Attorney has not filed a response", "mark it if the district attorney did nothing"),
  "p1-y18276-x10800": HAND_BOX(NOTICE, "The New Mexico Department of Public Safety's response", "mark the heading, then mark one of the three lines below it"),
  "p1-y15996-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has filed a Notice of Non-Objection", "mark it if the Department filed a non-objection"),
  "p1-y14616-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has filed an objection", "mark it if the Department objected"),
  "p1-y13236-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has not filed a response", "mark it if the Department did nothing"),
  "p1-y10476-x10800": HAND_BOX(NOTICE, "The arresting agency's response", "mark the heading, then mark one of the three lines below it"),
  "p1-y8184-x14400": HAND_BOX(NOTICE, "The arresting agency has filed a Notice of Non-Objection", "mark it if the agency filed a non-objection"),
  "p2-y70344-x14400": HAND_BOX(NOTICE, "The arresting agency has filed an objection", "mark it if the agency objected"),
  "p2-y68964-x14400": HAND_BOX(NOTICE, "The arresting agency has not filed a response", "mark it if the agency did nothing"),
  "p2-y66204-x10800": HAND_BOX(NOTICE, "An Affirmation in Support of Expungement (Form 4-960.3) is included", "mark it, and attach the completed Form 4-960.3 that is in this packet"),

  "p2-y61044-x7200": { section: NOTICE_SIGN, label: "Printed name of Petitioner on the notice", ...WRITE("participant.full_legal_name") },
  "p2-y58284-x7200": { section: NOTICE_SIGN, label: "Signature of Petitioner on the notice", ...PROTECT(SIGNATURE, "signature or date field; the participant signs their own notice") },
  "p2-y55524-x7200": { section: NOTICE_SIGN, label: "Mailing Address of the Petitioner on the notice", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP", "the shared fact registry has no one-line mailing-address fact; its only address descriptor is the street line, and a street with no city on the line the court writes to is worse than a line the participant completes. Reported to the owner of the registry in build-findings.json.") },
  "p2-y52764-x7200": { section: NOTICE_SIGN, label: "Telephone Number of the Petitioner on the notice", ...SUPPLY("your telephone number") },
  "p2-y50004-x7200": { section: NOTICE_SIGN, label: "Date beneath the Petitioner's signature on the notice", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. It is the date the participant signs the notice, which is at least sixty-three days after this packet is prepared") },

  "p2-y45864-x32400": { section: NOTICE_ATTY, label: "Attorney Name (if applicable) on the notice", ...ATTORNEY("the form marks this block \"if applicable\"; no attorney-representation fact is held for this participant") },
  "p2-y43104-x32400": { section: NOTICE_ATTY, label: "Attorney Signature on the notice", ...ATTORNEY("signature field in the attorney block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p2-y40344-x32400": { section: NOTICE_ATTY, label: "Mailing Address of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p2-y37584-x32400": { section: NOTICE_ATTY, label: "Telephone Number of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p2-y34824-x32400": { section: NOTICE_ATTY, label: "Email of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },

  "p2-y20988-x22332": AFTER_MAILING("The day of the month you mailed this notice", "the day of the month on which you posted this notice"),
  "p2-y20988-x31944": AFTER_MAILING("The month you mailed this notice", "the month in which you posted this notice"),
  "p2-y20988-x40956": AFTER_MAILING("The year you mailed this notice", "the year in which you posted this notice"),
  "p2-y16836-x7200": AFTER_MAILING("Name of the prosecuting office this notice was mailed to", "the district attorney's office you posted this notice to"),
  "p2-y15456-x22164": AFTER_MAILING("Judicial district of that prosecuting office", "the judicial district of that district attorney"),
  "p2-y14076-x7200": AFTER_MAILING("Address of the prosecuting office this notice was mailed to", "the street address you posted it to"),
  "p2-y11316-x7200": AFTER_MAILING("Telephone of the prosecuting office this notice was mailed to", "the telephone number of that office"),
  "p3-y64824-x10092": AFTER_MAILING("Telephone number of the New Mexico Department of Public Safety, after the printed area code", "the rest of the Department of Public Safety's telephone number; the form prints the area code (505) for you"),
  "p3-y59304-x7200": AFTER_MAILING("Name of the law enforcement agency this notice was mailed to", "the agency that arrested you"),
  "p3-y56544-x7200": AFTER_MAILING("Address of the law enforcement agency this notice was mailed to", "the street address you posted it to"),
  "p3-y56352-x7200": NOT_A_BLANK("a printed rule drawn under the address line above it; the address is written on the underscore run, and this stroke is the same line drawn twice by the form"),
  "p3-y53784-x7200": AFTER_MAILING("Telephone of the law enforcement agency this notice was mailed to", "the telephone number of that agency"),
  "p3-y48264-x32496": { section: NOTICE_CERT, label: "Signature of the person sending the notice", ...PROTECT(SIGNATURE, "signature or date field; whoever posts the notice signs this certificate themselves") },
  "p3-y45504-x32496": { section: NOTICE_CERT, label: "Date of signature of the person sending the notice", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build") }
};

/* ------------------------------------------------------------------ *
 * 4-960.3 NMRA — Affirmation in support of expungement; upon conviction.
 * ------------------------------------------------------------------ */

export const FORM_4_960_3 = Object.freeze({
  sourceId: "official-form:4-960.3", documentId: "NM-4-960.3", formNumber: "4-960.3",
  title: "Affirmation in support of expungement; upon conviction",
  sha256: "14d16b83fe55e3b872f233118305fecac27a7c48e839cba323db2d8bd48c2226",
  strategy: "measured_flat_overlay", pages: 2, instrumentKind: "second_stage_affirmation"
});

const AFF = "What the affirmation states";
const AFF_SIGN = "The affirmation's signature block";

const AFFIRMED = (label, what) => ({
  section: AFF, label,
  ...SUPPLY(`${what} -- as it is on the day you sign, which is at least sixty-three days after this packet was prepared`,
    "the affirmation is sworn under penalty of perjury and describes the participant's situation on the day they sign it. Nothing in it is knowable when the packet is prepared.")
});

export const DICTIONARY_4_960_3 = {
  ...captionRows({ county: "p1-y62820-x14328", district: "p1-y61236-x7200", name: "p1-y55512-x9720" }),

  "p1-y47232-x8196": { section: AFF, label: "I, (Petitioner name), am requesting the expungement", ...WRITE("participant.full_legal_name") },
  "p1-y39312-x10800": HAND_BOX(AFF, "No charge or criminal proceeding is pending against me in any state or federal court", "mark it only if nothing at all is pending against you anywhere on the day you sign"),
  "p1-y31764-x10800": HAND_BOX(AFF, "The following charges are pending against me, first entry", "mark it instead if something is pending, and describe it on the two lines below"),
  "p1-y28596-x10800": AFFIRMED("First pending charge or proceeding, first line", "the charge or proceeding pending against you, and where"),
  "p1-y27000-x10800": AFFIRMED("First pending charge or proceeding, second line", "the rest of that description"),
  "p1-y25416-x10800": HAND_BOX(AFF, "The following charges are pending against me, second entry", "mark it if a second charge or proceeding is pending"),
  "p1-y22248-x10800": AFFIRMED("Second pending charge or proceeding, first line", "the second charge or proceeding pending against you"),
  "p1-y20652-x10800": AFFIRMED("Second pending charge or proceeding, second line", "the rest of that description"),
  "p1-y19068-x10800": HAND_BOX(AFF, "The following charges are pending against me, third entry", "mark it if a third charge or proceeding is pending"),
  "p1-y15900-x10800": AFFIRMED("Third pending charge or proceeding, first line", "the third charge or proceeding pending against you"),
  "p1-y14304-x10800": AFFIRMED("Third pending charge or proceeding, second line", "the rest of that description"),
  "p1-y7572-x10800": HAND_BOX(AFF, "I have had no criminal convictions in the last ten years", "mark it if you have had none. If you have, mark the line on page 2 instead and give the details"),
  "p2-y67764-x10800": HAND_BOX(AFF, "My most recent criminal conviction was", "mark it if you have had a conviction, and give the date, the offence and the court on the two lines below"),
  "p2-y63624-x12600": AFFIRMED("Your most recent conviction, first line", "the date of your most recent conviction, the offence and the court"),
  "p2-y62244-x12600": AFFIRMED("Your most recent conviction, second line", "the rest of that description"),

  "p2-y53964-x7200": { section: AFF_SIGN, label: "Printed name of Petitioner on the affirmation", ...WRITE("participant.full_legal_name") },
  "p2-y53964-x36000": { section: AFF_SIGN, label: "Date beside the printed name on the affirmation", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The affirmation is made under penalty of perjury and the date is the date the participant signs it") },
  "p2-y51204-x7200": { section: AFF_SIGN, label: "Signature of Petitioner on the affirmation", ...PROTECT(SIGNATURE, "signature or date field; the participant affirms and signs this themselves") },
  "p2-y48444-x7200": { section: AFF_SIGN, label: "Mailing Address of the Petitioner on the affirmation", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP", "the shared fact registry has no one-line mailing-address fact; its only address descriptor is the street line, and a street with no city on the line the court writes to is worse than a line the participant completes. Reported to the owner of the registry in build-findings.json.") }
};

/* ------------------------------------------------------------------ *
 * The retained local Order on Petition to Expunge (conviction).
 *
 * Caption written; everything else is the court's, on the same ground as the
 * identity-theft order: the New Mexico Judiciary's instruction packet directs
 * the petitioner to complete only the caption and states that the court
 * completes the rest of the form.
 * ------------------------------------------------------------------ */

export const NM_LOCAL_CONVICTION_ORDER = Object.freeze({
  sourceId: "official-form:NM-LOCAL-CONVICTION-ORDER", documentId: "NM-LOCAL-CONVICTION-ORDER",
  formNumber: "NM-LOCAL-CONVICTION-ORDER",
  title: "Order on Petition to Expunge Arrest Records and Public Records Pursuant to NMSA 1978, Section 29-3A-5 (Conviction)",
  sha256: "b8f2e017a71ca73d8d9f0aed104882c99cb2c1e77e43e07c1042d18aed8a51c4",
  strategy: "measured_flat_overlay", pages: 4, instrumentKind: "proposed_order"
});

const O_CAPTION = "Caption of the order";
const O_FIND = "The court's findings";
const O_DECREE = "What the court orders";
const O_SIGN = "The judge's signature";

export const DICTIONARY_CONVICTION_ORDER = {
  "p1-y69300-x14652": { section: O_CAPTION, label: "COUNTY OF in the order's caption", ...WRITE("matter.county") },
  "p1-y67716-x7200": { section: O_CAPTION, label: "Judicial district of the district court in the order's caption", ...WRITE("matter.court") },
  "p1-y60600-x9996": { section: O_CAPTION, label: "In re, the petitioner's name in the order's caption", ...WRITE("participant.full_legal_name") },

  "p1-y34644-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner was convicted, completed the sentence, owes nothing, has nothing pending, justice will be served, and restitution is fulfilled", "a finding only the court makes, on the court's own order, and the New Mexico Judiciary's instruction packet says the petitioner completes only the caption"),
  "p1-y25164-x10800": COURT_CONTROL(O_FIND, "Finding: no other conviction for two years", "the court checks the applicable time period"),
  "p1-y22404-x10800": COURT_CONTROL(O_FIND, "Finding: no other conviction for four years", "the court checks the applicable time period"),
  "p1-y18264-x10800": COURT_CONTROL(O_FIND, "Finding: no other conviction for six years", "the court checks the applicable time period"),
  "p1-y15504-x10800": COURT_CONTROL(O_FIND, "Finding: no other conviction for eight years", "the court checks the applicable time period"),
  "p1-y12144-x10800": COURT_CONTROL(O_FIND, "Finding: no other conviction for ten years", "the court checks the applicable time period"),

  "p2-y70908-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner's request is denied for all charges sought to be expunged", "a finding only the court makes"),
  "p2-y65388-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner's request is denied for the following offences", "a finding only the court makes"),
  "p2-y64008-x9000": COURT_LINE(O_FIND, "Offences for which the request is denied, first line", "the court writes the offences it is denying inside its own finding"),
  "p2-y62628-x9000": COURT_LINE(O_FIND, "Offences for which the request is denied, second line", "the court writes the offences it is denying inside its own finding"),
  "p2-y61248-x9000": COURT_LINE(O_FIND, "Offences for which the request is denied, third line", "the court writes the offences it is denying inside its own finding"),
  "p2-y56508-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner failed to provide the required information and the petition is summarily dismissed without prejudice", "a finding only the court makes"),
  "p2-y53148-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner's records are not legally eligible for expungement", "a finding only the court makes"),
  "p2-y51168-x10800": COURT_CONTROL(O_FIND, "Finding: there is a charge or proceeding pending against Petitioner", "a finding only the court makes"),
  "p2-y49188-x10800": COURT_CONTROL(O_FIND, "Finding: Petitioner has not fulfilled victim restitution", "a finding only the court makes"),
  "p2-y45828-x10800": COURT_CONTROL(O_FIND, "Finding: Petitioner has had another criminal conviction within the time period", "a finding only the court makes"),
  "p2-y42468-x9000": COURT_CONTROL(O_FIND, "Finding: venue is improper because the charges did not originate in this district", "a finding only the court makes"),
  "p2-y40488-x9000": COURT_CONTROL(O_FIND, "Finding: taking the statutory considerations into account, justice will not be served by expungement", "a finding only the court makes, weighing the nature and gravity of the offence, the petitioner's age, criminal history and employment history, the time since the offence and the consequences of refusal"),
  "p2-y36348-x26340": COURT_LINE(O_FIND, "The court's specific reasons why justice will not be served, first line", "the court writes its own reasons inside its own finding"),
  "p2-y34968-x10800": COURT_LINE(O_FIND, "The court's specific reasons, second line", "the court writes its own reasons inside its own finding"),
  "p2-y33588-x10800": COURT_LINE(O_FIND, "The court's specific reasons, third line", "the court writes its own reasons inside its own finding"),
  "p2-y32208-x10800": COURT_LINE(O_FIND, "The court's specific reasons, fourth line", "the court writes its own reasons inside its own finding"),
  "p2-y30828-x10800": COURT_LINE(O_FIND, "The court's specific reasons, fifth line", "the court writes its own reasons inside its own finding"),
  "p2-y26688-x9000": COURT_CONTROL(O_FIND, "Finding: Other", "a finding only the court makes"),
  "p2-y26688-x13860": COURT_LINE(O_FIND, "The court's other reason, first line", "the court writes its own reason inside its own finding"),
  "p2-y25308-x10800": COURT_LINE(O_FIND, "The court's other reason, second line", "the court writes its own reason inside its own finding"),
  "p2-y23928-x10800": COURT_LINE(O_FIND, "The court's other reason, third line", "the court writes its own reason inside its own finding"),
  "p2-y22548-x10800": COURT_LINE(O_FIND, "The court's other reason, fourth line", "the court writes its own reason inside its own finding"),
  "p2-y20136-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner's request to expunge is granted for all charges requested", "a finding only the court makes"),
  "p2-y12228-x7200": NOT_A_BLANK("the footnote separator at the foot of page 2, above the four footnotes explaining when paragraphs 1 to 4 are used. It is a printed rule in the page margin and not a place anyone writes"),

  "p3-y70908-x9000": COURT_CONTROL(O_FIND, "Finding: Petitioner's request to expunge is granted only for the following charges", "a finding only the court makes"),
  "p3-y69528-x9000": COURT_LINE(O_FIND, "Charges for which the request is granted, first line", "the court writes the charges it is granting inside its own finding"),
  "p3-y68148-x9000": COURT_LINE(O_FIND, "Charges for which the request is granted, second line", "the court writes the charges it is granting inside its own finding"),
  "p3-y66768-x9000": COURT_LINE(O_FIND, "Charges for which the request is granted, third line", "the court writes the charges it is granting inside its own finding"),
  "p3-y55728-x7200": COURT_CONTROL(O_DECREE, "It is ordered that the Petition is DENIED", "a decretal paragraph only a judge may make"),
  "p3-y52944-x7200": COURT_CONTROL(O_DECREE, "It is ordered that the Petition is GRANTED", "a decretal paragraph only a judge may make"),
  "p3-y50184-x7200": COURT_CONTROL(O_DECREE, "It is ordered that the Petition is GRANTED IN PART AND DENIED IN PART", "a decretal paragraph only a judge may make"),
  "p3-y44688-x7200": COURT_CONTROL(O_DECREE, "It is further ordered that the arrest records and public records relating to the charges shall be expunged", "a decretal paragraph only a judge may make"),
  "p3-y39168-x7200": COURT_CONTROL(O_DECREE, "The records expunged are those for all the charges requested in the Petition", "a decretal paragraph only a judge may make"),
  "p3-y36408-x7200": COURT_CONTROL(O_DECREE, "The records expunged are those for the following charges", "a decretal paragraph only a judge may make"),
  "p3-y33648-x9000": COURT_LINE(O_DECREE, "Charges whose records shall be expunged, first line", "the court writes the charges inside its own decree"),
  "p3-y32268-x9000": COURT_LINE(O_DECREE, "Charges whose records shall be expunged, second line", "the court writes the charges inside its own decree"),
  "p3-y30888-x9000": COURT_LINE(O_DECREE, "Charges whose records shall be expunged, third line", "the court writes the charges inside its own decree"),
  "p3-y29508-x9000": COURT_LINE(O_DECREE, "Charges whose records shall be expunged, fourth line", "the court writes the charges inside its own decree"),
  "p3-y23976-x22596": COURT_LINE(O_DECREE, "District Court case number in the court's decree", "the court states the case numbers its own order reaches; the petitioner completes only the caption of this form"),
  "p3-y22104-x32400": COURT_LINE(O_DECREE, "Metropolitan Court case number in the court's decree, printed run", "the court states the case numbers its own order reaches"),
  "p3-y21912-x25560": COURT_LINE(O_DECREE, "Metropolitan Court case number in the court's decree, ruled line before the run", "the court states the case numbers its own order reaches"),
  "p3-y21912-x36600": COURT_LINE(O_DECREE, "Metropolitan Court case number in the court's decree, ruled line after the run", "the court states the case numbers its own order reaches"),
  "p3-y20028-x23664": COURT_LINE(O_DECREE, "Appellate Court case number in the court's decree", "the court states the case numbers its own order reaches"),
  "p3-y17964-x39600": COURT_LINE(O_DECREE, "Magistrate or Municipal Court case number in the court's decree, printed run", "the court states the case numbers its own order reaches"),
  "p3-y17772-x29388": COURT_LINE(O_DECREE, "Magistrate or Municipal Court case number in the court's decree, ruled line before the run", "the court states the case numbers its own order reaches"),
  "p3-y17772-x43800": COURT_LINE(O_DECREE, "Magistrate or Municipal Court case number in the court's decree, ruled line after the run", "the court states the case numbers its own order reaches"),
  "p3-y15696-x28620": DECRETAL("this line sits inside the decretal paragraph of a proposed order, where the court states the law enforcement agency case number its own order reaches. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption of the Order on Petition to Expunge and states that the court completes the rest of the form"),
  "p3-y13632-x27828": COURT_LINE(O_DECREE, "Arrest number from the fingerprint card, in the court's decree", "the court states the arrest number its own order reaches"),
  "p3-y13632-x43104": COURT_LINE(O_DECREE, "Date beside the arrest number, in the court's decree", "the court states the date its own order reaches"),
  "p3-y8772-x7200": NOT_A_BLANK("the footnote separator at the foot of page 3, above the footnote explaining when paragraph 5 is used. It is a printed rule in the page margin and not a place anyone writes"),

  "p4-y67644-x7200": COURT_CONTROL(O_DECREE, "It is further ordered that the following agencies shall expunge the necessary records", "a decretal paragraph only a judge may make"),
  "p4-y64884-x10692": COURT_LINE(O_DECREE, "The number of days the agencies have to expunge the records", "the court sets the period inside its own decree, and Section 29-3A-5 requires it to allow a minimum of sixty days"),
  "p4-y56604-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: District Attorney", "the court directs its own order to the agencies it chooses"),
  "p4-y56604-x22296": COURT_LINE(O_DECREE, "Judicial district of the District Attorney the court directs its order to", "the court names the district inside its own decree"),
  "p4-y55008-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: New Mexico Department of Public Safety", "the court directs its own order to the agencies it chooses"),
  "p4-y53424-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: Arresting agency", "the court directs its own order to the agencies it chooses"),
  "p4-y53424-x18888": DECRETAL("this line sits inside the decretal paragraph of a proposed order, where the court names the arresting agency its own order directs. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption and states that the court completes the rest of the form. The agency the participant's intake gave belongs on Form 4-953 paragraph 13, which is the petitioner's own statement of who holds the records"),
  "p4-y51840-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: Other, first", "the court directs its own order to the agencies it chooses"),
  "p4-y51648-x13740": DECRETAL("the first ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption and states that the court completes the rest of the form"),
  "p4-y50256-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: Other, second", "the court directs its own order to the agencies it chooses"),
  "p4-y50256-x13728": DECRETAL("the second ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption and states that the court completes the rest of the form"),
  "p4-y48660-x9000": COURT_CONTROL(O_DECREE, "Agency ordered to expunge: Other, third", "the court directs its own order to the agencies it chooses"),
  "p4-y48660-x13728": DECRETAL("the third ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption and states that the court completes the rest of the form"),
  "p4-y45492-x7200": COURT_CONTROL(O_DECREE, "It is further ordered that the court clerk shall expunge the necessary records", "a decretal paragraph only a judge may make"),
  "p4-y42732-x18912": COURT_CONTROL(O_DECREE, "The clerk directed is that of the District Court", "the court names the clerk its own order directs"),
  "p4-y42732-x30312": COURT_LINE(O_DECREE, "Judicial district of the District Court clerk the order directs", "the court names the district inside its own decree"),
  "p4-y42732-x46440": COURT_CONTROL(O_DECREE, "The clerk directed is that of the Metropolitan Court", "the court names the clerk its own order directs"),
  "p4-y39972-x11448": COURT_LINE(O_DECREE, "Location of the Metropolitan Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y39972-x26040": COURT_CONTROL(O_DECREE, "The clerk directed is that of the Magistrate Court", "the court names the clerk its own order directs"),
  "p4-y39972-x37056": COURT_LINE(O_DECREE, "Location of the Magistrate Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y39972-x52920": COURT_CONTROL(O_DECREE, "The clerk directed is that of the Municipal Court", "the court names the clerk its own order directs"),
  "p4-y37212-x17064": COURT_LINE(O_DECREE, "Location of the Municipal Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y34452-x7200": COURT_LINE(O_DECREE, "The number of days the court clerk has to expunge the records", "the court sets the period inside its own decree, and may not expunge court records earlier than thirty days from entry of the order"),
  "p4-y21840-x9804": { section: O_SIGN, label: "Date the District Court Judge signs the order", ...PROTECT(SIGNATURE, "signature or date field; the judge dates their own order") },
  "p4-y21840-x32400": { section: O_SIGN, label: "Signature of the District Court Judge", ...PROTECT(SIGNATURE, "signature or date field; the judge signs their own order and no build signs for a judge") }
};
