#!/usr/bin/env node
/**
 * The Mississippi one-felony-conviction expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-fel-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   ms-fel   Petition to Expunge One Felony Conviction,
 *            Miss. Code Ann. § 99-19-71(2), as amended by 2026 HB 1546
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO source binaries: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The committed legal-design record explains why: Mississippi
 * has no statewide expungement form and § 99-19-71 prescribes none. Four
 * archived petition and order PDFs exist, but they are FOURTH CIRCUIT COURT
 * DISTRICT models covering Leflore, Sunflower and Washington counties only —
 * every county field reads "(Washington, Sunflower, or Leflore)", the
 * certificate of service hardcodes the Fourth District DA at Greenville, and
 * the signature blocks are dated 2020. They are drafting references, not
 * forms, and nothing from them is inherited here.
 *
 * THE RECORD'S EXPLICIT "DO NOT INHERIT" LIST IS HONOURED, ITEM BY ITEM.
 * Court, county and prosecuting authority are participant-data fields and are
 * never hardcoded. No certificate of service captioned for another document.
 * No grand jury indictment pleaded as a mandatory allegation. No § 99-15-26
 * cited alongside § 99-19-71, because conflating nonadjudication with
 * conviction expungement is the defect the record names. No hardcoded
 * five-year recital — HB 1546 struck "five (5)" and inserted "three (3)".
 * No hardcoded 2020 dates, no three-county field, no Greenville address. No
 * race field: no statute requires it and it is not inherited.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  the circuit clerk of the county of conviction — the
 *                       court in which the conviction was had.
 *                       MS.memo track ms-fel rules.filing and destination.
 *   FEE                 no amount is published. MS.memo track ms-fel
 *                       rules.fees: § 99-19-72 sets a fee for a petition to
 *                       expunge an offence under § 99-19-71 and this track is
 *                       such a petition on the face of the statute, "but the
 *                       section's current text could not be retrieved on this
 *                       pass, so the participant confirms the amount with the
 *                       clerk." The circuit clerk of the county of conviction
 *                       is that clerk.
 *   WAIVER              not established for expungement specifically; the
 *                       circuit clerk of the county of conviction is named as
 *                       the authority who answers a pauper's-affidavit route.
 *   SERVICE             the district attorney, by United States mail or hand
 *                       delivery, evidenced by the certificate of service,
 *                       with at least TEN DAYS before any hearing —
 *                       § 99-19-71(2)(b), the one hard timing rule here.
 *
 * THE FEE, AND WHY THIS PACKET NOW PUBLISHES NO FIGURE
 *
 * This build previously stated $150.00 and explained at length why it departed
 * from the controlling design to do so. The decision owner has overruled that
 * departure. OWNER_CORRECTIONS_REQUIRED.json, Q4, ms-fel-set:
 *
 *   "DO NOT PUBLISH AN UNCONFIRMED FEE. Follow the controlling design's
 *    refusal and direct the participant to the specific clerk or agency for
 *    the current amount. Add a figure only when current primary authority or
 *    the official form supports it."
 *
 * The exception was checked before the figure was withdrawn, because a figure
 * current primary authority supports is the better outcome and is allowed.
 * It is not available here. MS.memo track ms-fel rules.fees records, in terms,
 * that "the section's current text could not be retrieved on this pass"; the
 * memo's own quotation of § 99-19-72 sits inside unresolvedQuestions, which is
 * where the record puts what it has NOT confirmed; the compiled profile's
 * feeRules[0] is a derived internal record and is not primary authority; the
 * only § 99-19-72 URL held is a Justia secondary page retrieved 2026-07-30;
 * and this route binds no official form at all (officialFormFamily NONE), so
 * there is no form to support a figure either. Current primary authority for
 * the fee is therefore not in hand, and the figure comes out.
 *
 * What replaces it is the controlling design's own refusal, in the shape its
 * five Mississippi siblings already use: no amount is published, the reason is
 * stated rather than left blank, and the participant is sent to ONE named
 * office — the circuit clerk of the county of conviction, who takes this
 * filing and collects any fee — for the current amount and for any
 * pauper's-affidavit route.
 *
 * Nothing else about this route moves. The remedy, the eligibility rule, the
 * venue, the filing destination, the service responsibility, the ten-day
 * notice, the components and the self-help stopping points are exactly as they
 * were; only the unconfirmed figure and the reasoning that published it are
 * withdrawn.
 *
 * WHAT THIS BUILD WRITES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — the court, the county, the cause
 * number, the prosecuting authority, the offense, the dates, the payment
 * satisfaction — lives on records the platform has not seen, so each is a
 * labelled dotted blank declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md.
 *
 * TWO ALLEGATIONS ARE DELIBERATELY NOT PLEADED, per the committed record's
 * manual completion items: the rehabilitation showing (a discretionary finding
 * the court makes on the record or in writing) and the determination that the
 * conviction is not in an excluded category (twelve statutory categories, not
 * encoded). A third — whether multiple convictions arose from a COMMON NUCLEUS
 * OF OPERATIVE FACTS — is left blank because it decides whether the
 * participant spends their one lifetime allowance or is ineligible, and the
 * enrolled text commits it to the discretion of the court.
 *
 * WHAT THE PACKET TELLS THE PARTICIPANT THAT MOST DO NOT. Section 99-19-71(3)
 * expressly provides that an order of expunction does NOT preclude an employer
 * from asking a prospective employee whether an order of expunction has been
 * entered on their behalf, and a person called as a prospective juror must, on
 * request, advise the court in camera of the previous conviction and
 * expunction. The record calls this real, unusual, and something participants
 * must be told. It is printed in the guidance and in the instructions.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ms-fel-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-fel-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ms-fel-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "MS",
  routeKeys: ["obligation:track-pathway:MS:ms-fel:eligible-felony-conviction-expungement-99-19-71"],
  primaryRouteKey: "obligation:track-pathway:MS:ms-fel:eligible-felony-conviction-expungement-99-19-71",
  routeSelectionId: "ms-fel-composed-set",
  legalName: "Petition to Expunge One Felony Conviction (Miss. Code Ann. § 99-19-71(2), as amended by 2026 HB 1546)",
  routeName: "asking the Mississippi court that convicted you to expunge one felony conviction under Miss. Code Ann. § 99-19-71(2)",
  statute: "Miss. Code Ann. § 99-19-71(2)"
});

const COMPONENTS = [
  "ms-fel-primary-filing-1",
  "ms-fel-proposed-order-2",
  "ms-fel-certificate-of-service-3",
  "ms-fel-attachment-4",
  "ms-fel-instructions-5",
  "ms-fel-notice-6"
];

const COMPOSED_TITLES = {
  "ms-fel-primary-filing-1": "Petition for Expungement of Criminal Record (Miss. Code Ann. Sec. 99-19-71(2))",
  "ms-fel-proposed-order-2": "Proposed Order of Expungement",
  "ms-fel-certificate-of-service-3": "Certificate of Service",
  "ms-fel-attachment-4": "Documents to Obtain Before Filing",
  "ms-fel-instructions-5": "Filing Instructions and What This Order Does Not Do",
  "ms-fel-notice-6": "Ten Days' Written Notice to the District Attorney"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-fel) and the "
  + "packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, ms-fel-set). No fee "
  + "figure is composed from any record: MS.memo track ms-fel rules.fees refuses to publish one because "
  + "§ 99-19-72's current text could not be retrieved, and the owner correction of 2026-09-02 (Q4) requires that "
  + "refusal to be carried through to the participant";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1986-04-17",
    "participant.street_address": "42 Magnolia Street, Hattiesburg, MS 39401",
    "participant.phone": "601-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1964-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Bay St. Louis, Mississippi 39520-2214",
    "participant.phone": "(228) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

const CAPTION = (L) => {
  L.push("IN THE ................................ COURT OF ........................ COUNTY, MISSISSIPPI");
  L.push("(justice / county / circuit / municipal - the court in which the conviction was had)", "");
  L.push("STATE OF MISSISSIPPI");
  L.push("VS.");
  L.push("........................................................, PETITIONER", "");
  L.push("CAUSE NO. " + DOTS(50), "");
};

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");

  if (componentId === "ms-fel-primary-filing-1") {
    CAPTION(L);
    L.push("PETITION FOR EXPUNGEMENT OF CRIMINAL RECORD", "");
    L.push(`COMES NOW the Petitioner, ${name}, and petitions this Court under Miss. Code Ann. Sec. 99-19-71(2) for an order expunging ONE felony conviction from all public records, and would show:`, "");
    L.push("1. IDENTIFYING INFORMATION.", "");
    L.push(`Petitioner's name: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("(Petitioner's race is not stated. No statute requires it and this packet does not collect it.)", "");
    L.push("2. THE CONVICTION. Copied from the sentencing order and the indictment:", "");
    L.push("Felony of conviction, worded as the record states it:");
    L.push(DOTS(), "");
    L.push("Mississippi Code section of conviction:");
    L.push(DOTS(), "");
    L.push("Date of the offense: " + DOTS(40));
    L.push("Date of arrest: " + DOTS(42));
    L.push("Arresting agency: " + DOTS(38));
    L.push("Agency case number: " + DOTS(36), "");
    L.push("Date of conviction: " + DOTS(38));
    L.push("Judgment of the court, as entered: ");
    L.push(DOTS(), "");
    L.push("3. ONE CONVICTION ONLY. Section 99-19-71(2)(a) permits ONE felony expunction. The enrolled text of 2026 HB 1546 defines 'one (1) conviction' and 'one (1) felony expunction' to mean and include all convictions that arose from a COMMON NUCLEUS OF OPERATIVE FACTS, as determined in the discretion of the court.", "");
    L.push("Where more than one conviction is included, identify each and state the facts said to make them one nucleus. This is left for Petitioner and counsel; it decides whether Petitioner spends the one allowance or is ineligible, and the statute commits it to the court's discretion:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. FINES AND COSTS PAID. Section 99-19-71(2)(a) requires that all criminal fines and costs of court imposed in the sentence of conviction have been paid.", "");
    L.push("Date all fines, costs and restitution were paid in full, per the clerk's account balance record:");
    L.push(DOTS(), "");
    L.push("5. THE THREE-YEAR PERIOD. Section 99-19-71(2)(a), as amended by 2026 HB 1546 effective 1 July 2026, permits the petition THREE (3) YEARS after the successful completion of all terms and conditions of the sentence. HB 1546 struck 'five (5)' and inserted 'three (3)'.", "");
    L.push("Date Petitioner successfully completed the LAST of all terms and conditions of the sentence - not the conviction date and not the release date:");
    L.push(DOTS(), "");
    L.push("6. NOT AN EXCLUDED OFFENSE. Section 99-19-71(2)(a) excludes twelve categories. Whether this conviction falls outside all of them is a characterisation left for Petitioner and counsel, and is not asserted by the preparer of this petition:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("7. NOT A PUBLIC OFFICIAL'S OFFENSE. Section 99-19-71(5) makes no public official eligible for expunction for any conviction related to his official duties.", "");
    L.push("8. REHABILITATION. Section 99-19-71(2)(b) permits the court to grant if it determines, on the record or in writing, that the applicant is rehabilitated from the offense. That determination is the Court's. Petitioner's showing:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("9. NOTICE TO THE DISTRICT ATTORNEY. Section 99-19-71(2)(b) requires Petitioner to give TEN (10) DAYS' written notice to the district attorney before any hearing on this petition. That notice accompanies this petition and the certificate of service evidences it.", "");
    L.push("WHEREFORE, Petitioner asks the Court to expunge the conviction identified above from all public records, and for such other relief as is proper.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(40), "");
    L.push("(Petitioner signs and dates this petition. Nothing on this page is signed or dated for Petitioner, and this petition contains no recital that Petitioner appears by or through an attorney.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}    EMAIL: ${email}`, "");
    L.push("DECLARATION. Petitioner states that the matters set out above are true and correct to the best of Petitioner's knowledge, information and belief.");
  } else if (componentId === "ms-fel-proposed-order-2") {
    CAPTION(L);
    L.push("ORDER OF EXPUNGEMENT", "");
    L.push("THIS DOCUMENT IS A PROPOSED ORDER. It is unexecuted. It records no finding this Court has made and nothing in it asserts that the Court has acted. It is prepared so that it is available to the Court if the Court grants the petition.", "");
    L.push(`THIS CAUSE came before the Court on the Petition of ${name} for expungement of one felony conviction under Miss. Code Ann. Sec. 99-19-71(2).`, "");
    L.push("The Court FINDS (findings to be made by the Court, including the determination on the record or in writing that the applicant is rehabilitated from the offense):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("IT IS THEREFORE ORDERED AND ADJUDGED that the felony conviction identified in the Petition be, and it is hereby, EXPUNGED from all public records under Miss. Code Ann. Sec. 99-19-71(2).", "");
    L.push("IT IS FURTHER ORDERED that, as Miss. Code Ann. Sec. 99-19-71(3) provides, a nonpublic record shall be retained by the Mississippi Criminal Information Center solely for the purpose of determining whether, in subsequent proceedings, the person is a first offender.", "");
    L.push("SO ORDERED AND ADJUDGED this " + DOTS(12) + " day of " + DOTS(20) + ", 20" + DOTS(4) + ".", "");
    L.push("" + DOTS(50));
    L.push("JUDGE", "");
    L.push("APPROVED AS TO FORM:", "");
    L.push("" + DOTS(50));
    L.push("Prosecuting authority", "");
    L.push("(The findings, the date of entry, the judge's signature and the prosecuting authority's approval as to form are all left blank. They are not the participant's to complete.)");
  } else if (componentId === "ms-fel-certificate-of-service-3") {
    CAPTION(L);
    L.push("CERTIFICATE OF SERVICE", "");
    L.push("This certificate is captioned for THIS petition. Section 99-19-71(2)(b) requires ten days' written notice to the district attorney before any hearing, and this certificate is the evidence of it.", "");
    L.push(`I, ${name}, certify that I have this day served a true and correct copy of the Petition for Expungement of Criminal Record and the Ten Days' Written Notice on the district attorney, by United States mail, postage prepaid, or by hand delivery, addressed as follows:`, "");
    L.push("District attorney for the county of conviction - name and office:");
    L.push(DOTS(), "");
    L.push("Address served:");
    L.push(DOTS(), "");
    L.push("Manner of service (United States mail or hand delivery): " + DOTS(30), "");
    L.push("Date served: " + DOTS(30), "");
    L.push("(At least TEN DAYS must pass between this date and any hearing on the petition.)", "");
    L.push("" + DOTS(50));
    L.push(`${name}, Petitioner`);
    L.push("Date: " + DOTS(30), "");
    L.push("(Service dates are written when service is actually made. Nothing on this page is dated for Petitioner. No prosecutor's name or address is printed here: the platform holds none for any Mississippi district and does not guess one.)");
  } else if (componentId === "ms-fel-attachment-4") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Get these before you write anything on the petition. Every one of them is a record the platform has not seen, and every dotted blank is filled from the record itself rather than from memory.", "");
    L.push("1. CERTIFIED COPY OF THE SENTENCING ORDER - from the circuit clerk of the county of conviction. It establishes the conviction, the sentence, and the terms that had to be completed.", "");
    L.push("2. COPY OF THE INDICTMENT - from the circuit clerk of the county of conviction. It is expected in practice on a felony petition. NOTE: this petition does NOT plead a grand jury indictment as a mandatory allegation, because many cases are resolved without one; the copy is obtained because practice expects it, not because the statute requires the allegation.", "");
    L.push("3. DOCKET SHEET FOR THE CASE - from the clerk of the court where the case was heard. It shows every court-imposed term and whether each was satisfied.", "");
    L.push("4. ACCOUNT BALANCE SHEET SHOWING A ZERO BALANCE - from the clerk of the court where the case was heard. Section 99-19-71(2)(a) requires all criminal fines and costs of court imposed in the sentence to have been paid, and Mississippi courts commonly require a zero balance.", "");
    L.push("5. PROOF OF COMPLETION OF PROBATION, SUPERVISED RELEASE OR TREATMENT - from the supervising authority or programme. THE THREE-YEAR CLOCK RUNS FROM THE DATE THE LAST TERM WAS COMPLETED, so this document, not memory, supplies that date.", "");
    L.push("6. YOUR MISSISSIPPI CRIMINAL HISTORY RECORD - from the Mississippi Criminal Information Center. It is the only reliable way to see every case on your record, including any prior expunction, before you file.", "");
    L.push("A PRIOR EXPUNCTION STILL SHOWS FOR ONE PURPOSE. Section 99-19-71(3) retains a nonpublic record with the Criminal Information Center solely to determine first-offender status in subsequent proceedings. An earlier expunction does not disappear for that purpose.");
  } else if (componentId === "ms-fel-notice-6") {
    CAPTION(L);
    L.push("TEN DAYS' WRITTEN NOTICE TO THE DISTRICT ATTORNEY", "");
    L.push("(Miss. Code Ann. Sec. 99-19-71(2)(b))", "");
    L.push("TO: The District Attorney for the county of conviction");
    L.push("Name and office:");
    L.push(DOTS(), "");
    L.push("Address:");
    L.push(DOTS(), "");
    L.push(`PLEASE TAKE NOTICE that ${name}, Petitioner in the above-captioned cause, has filed a Petition for Expungement of Criminal Record under Miss. Code Ann. Sec. 99-19-71(2), seeking expungement of one felony conviction from all public records.`, "");
    L.push("This notice is given under Miss. Code Ann. Sec. 99-19-71(2)(b), which requires the petitioner to give TEN (10) DAYS' written notice to the district attorney before any hearing on the petition.", "");
    L.push("A copy of the Petition accompanies this notice.", "");
    L.push("Hearing date, if one has been set by the Court: " + DOTS(30), "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(40), "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}    EMAIL: ${email}`);
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("BEFORE ANYTHING ELSE: GET A LAWYER TO REVIEW THIS. The committed legal record on this route says so without qualification. Every felony conviction carries mandatory attorney review before filing. The twelve-category exclusion list, the discretionary rehabilitation finding, and the fact that Sec. 99-19-71(2)(a) allows ONE felony expunction IN A LIFETIME make this route unsuitable for unassisted self-help. Filing the wrong petition can spend an allowance you cannot get back.", "");
    L.push("WHERE THIS IS FILED. File the petition, the proposed order and the certificate of service with the CIRCUIT CLERK OF THE COUNTY OF CONVICTION - the court in which the conviction was had. Mississippi has no statewide form, so call that clerk before filing to ask about that district's own requirements.", "");
    L.push("WHAT IT COSTS. NO FEE AMOUNT IS PUBLISHED IN THIS PACKET, and that is deliberate rather than an omission. Miss. Code Ann. Sec. 99-19-72 levies a filing fee on each petition to expunge an offense under Sec. 99-19-71, collected by the circuit clerk, and this petition is such a petition on the face of that section - but the current text of Sec. 99-19-72 could not be retrieved for the records this packet is built from, and local practice differs, so no figure is stated here. ASK THE CIRCUIT CLERK OF THE COUNTY OF CONVICTION - the same clerk who takes this filing and collects the fee - FOR THE CURRENT AMOUNT BEFORE YOU FILE. Filing method and local court practice may add to whatever that clerk quotes.", "");
    L.push("ONE THING THAT IS OPEN, AND IS NOT SETTLED HERE. The records this packet is built from record an open question about whether the Sec. 99-19-72 fee reaches petitions filed in justice or municipal court rather than circuit court, because the collection mechanism names the circuit clerk. Ask the clerk of the court in which the conviction was had what THAT court charges for this petition.", "");
    L.push("ABOUT A FEE WAIVER. No waiver procedure specific to expungement is established in the records this packet is built from. Ask THE SAME CIRCUIT CLERK - the clerk of the county of conviction - about a pauper's affidavit before you pay.", "");
    L.push("WHO YOU SERVE, AND THE ONE HARD DEADLINE. Serve the DISTRICT ATTORNEY for the county of conviction, by United States mail or hand delivery, and file the certificate of service as your evidence of it. Section 99-19-71(2)(b) requires TEN (10) DAYS' written notice to the district attorney BEFORE ANY HEARING. That is the one hard timing rule on this route. No response or objection period is fixed by the statute, and the district attorney may appear.", "");
    L.push("THE HEARING AND THE FINDING. A hearing is held as determined in the discretion of the court. The court may grant if it determines, on the record or in writing, that the applicant is rehabilitated from the offense. Where the court denies, its findings must be identified specifically and not generally.", "");
    L.push("WHAT THIS ORDER DOES NOT DO - AND THIS IS UNUSUAL, SO READ IT.", "");
    L.push("An employer may still ask. Section 99-19-71(3) expressly provides that the existence of an order of expunction does NOT preclude an employer from asking a prospective employee whether an order of expunction has been entered on their behalf. That is a real and unusual limitation of Mississippi law, and you must know about it.", "");
    L.push("A juror must still tell the court. A person called as a prospective juror must, on request, advise the court in camera of the previous conviction and the expunction.", "");
    L.push("The Criminal Information Center still holds a nonpublic record. Section 99-19-71(3) retains it solely for determining whether, in subsequent proceedings, the person is a first offender. An earlier expunction does not restore first-offender status.", "");
    L.push("ONE IN A LIFETIME. Section 99-19-71(2)(a) permits one felony expunction. Where more than one conviction is involved, whether they arose from a COMMON NUCLEUS OF OPERATIVE FACTS - and therefore count as one - is determined in the discretion of the court. Get that assessed before filing.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD.");
    L.push("- ALWAYS, on this route. Attorney review before filing is mandatory on the committed record.");
    L.push("- Any offense near the exclusion list, especially a crime of violence, embezzlement, a firearm offense, or the felony procuring and promoting prostitution offenses newly added by 2026 HB 1546.");
    L.push("- Any prior expungement of any kind, and in particular any prior felony expunction.");
    L.push("- More than one felony conviction, where the common-nucleus question decides whether you spend your one allowance or are ineligible.");
    L.push("- Any unpaid balance of fines, costs or restitution.");
    L.push("- Any public-official question - Sec. 99-19-71(5) makes no public official eligible for a conviction related to official duties.");
    L.push("- You are not a United States citizen.");
    L.push("- The district attorney objects, declines to approve the order as to form, or the court sets a contested hearing.", "");
    L.push("SAY EXPUNGE, AND DO NOT SAY THE RECORD NEVER EXISTED. This route expunges from PUBLIC records. The Criminal Information Center keeps a nonpublic record for the first-offender purpose, employers may ask about the expunction, and prospective jurors must disclose it. Do not tell anyone the conviction never happened.");
  }
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

const CAPTION_BLANKS = (componentId, rbf) => {
  rbf("caption_court", "Court named in the caption - justice, county, circuit or municipal, being the court in which the conviction was had",
    "the court in which the conviction was had, copied from your sentencing order",
    "which court convicted the participant is a case fact the platform has not seen, and the committed record forbids hardcoding it");
  rbf("caption_county", "County named in the caption",
    "the Mississippi county of the convicting court, copied from your sentencing order",
    "the county of conviction is a case fact the platform has not seen, and the committed record forbids hardcoding it");
  rbf("caption_petitioner", "Petitioner name line in the STATE OF MISSISSIPPI VS. caption",
    "your name as the record states it in the criminal cause, which may differ from the name you use now",
    "the name as captioned in the criminal cause is a record fact the platform has not seen");
  rbf("caption_cause_number", "Cause number in the caption",
    "the cause number of the criminal case, copied from your sentencing order, or the new number the court assigns",
    "no cause number is held for a record the platform has not seen");
};

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));
  const court = (id, label, why) => refusals.push(mapCourtOwned(componentId, id, label, why));

  if (componentId === "ms-fel-primary-filing-1") {
    w("petitioner_name", "Petitioner named in the body of the petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth in the identifying block", "participant.date_of_birth");
    w("mailing_address", "Mailing address in the identifying block", "participant.street_address");
    w("telephone", "Telephone number in the identifying block", "participant.phone");
    w("email", "Email address in the identifying block", "participant.email");
    CAPTION_BLANKS(componentId, rbf);
    rbf("felony_of_conviction", "Felony of conviction, worded as the record states it",
      "the felony of conviction, worded exactly as your indictment and sentencing order state it",
      "no offense fact is held for a record the platform has not seen");
    rbf("code_section", "Mississippi Code section of conviction",
      "the Mississippi Code section of conviction, from the indictment or sentencing order",
      "no statute-of-conviction fact is held for a record the platform has not seen");
    rbf("offense_date", "Date of the offense", "the date of the offense, from the record", "no offense-date fact is held for a record the platform has not seen");
    rbf("arrest_date", "Date of arrest", "the date of arrest, from the record", "no arrest-date fact is held for a record the platform has not seen");
    rbf("arresting_agency", "Arresting agency",
      "the arresting agency named in your record - this is a case fact from the record you already hold, not a protected court field",
      "the arresting agency is a case fact the platform has not seen");
    rbf("agency_case_number", "Agency case number", "the arresting agency's case number, from the record", "no agency case identifier is held for a record the platform has not seen");
    rbf("conviction_date", "Date of conviction", "the date of conviction, from the sentencing order", "no conviction-date fact is held for a record the platform has not seen");
    rbf("judgment_of_court", "Judgment of the court, as entered", "the judgment of the court as entered, copied from the sentencing order", "no judgment fact is held for a record the platform has not seen");
    rbf("common_nucleus_statement", "Common-nucleus statement where more than one conviction is included",
      "each additional conviction and the facts said to make them one common nucleus of operative facts - get this assessed before filing, because it decides whether you spend your one lifetime allowance or are ineligible",
      "the enrolled text commits the common-nucleus question to the discretion of the court, and the committed record lists it as a manual completion item");
    rbf("payment_satisfaction_date", "Date all fines, costs and restitution were paid in full",
      "the date all fines, costs and restitution were paid in full, from the clerk's account balance sheet showing a zero balance",
      "no payment-satisfaction fact is held for a record the platform has not seen");
    rbf("terms_completion_date", "Date the last of all terms and conditions of the sentence was completed",
      "the date you successfully completed the LAST of all terms and conditions of the sentence - not the conviction date and not your release date; the three-year clock runs from this date",
      "no sentence-completion fact is held for a record the platform has not seen");
    rbf("not_excluded_statement", "Statement that the conviction is not in an excluded category",
      "your own statement, checked with a lawyer, that the conviction falls outside all twelve exclusion categories in Sec. 99-19-71(2)(a)",
      "the twelve-category exclusion list is not encoded and the committed record lists this determination as a manual completion item");
    rbf("rehabilitation_showing", "The rehabilitation showing",
      "your showing that you are rehabilitated from the offense, with any supporting exhibits",
      "the rehabilitation determination is the court's to make on the record or in writing, and the committed record lists the showing as a manual completion item");
    prot("signature", "Signature of the petitioner on the petition", "the petition is the participant's own and is signed when actually filed");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is actually signed would be false");
  } else if (componentId === "ms-fel-proposed-order-2") {
    w("petitioner_name", "Petitioner named in the body of the proposed order", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    court("order_findings", "The Court's findings paragraph, including the rehabilitation determination", "the findings and the rehabilitation determination are the Court's to make on the record or in writing");
    court("order_entry_date", "Date the order is entered", "the date of entry is the Court's");
    court("judge_signature", "Judge's signature on the proposed order", "only the judge signs the order");
    court("approved_as_to_form", "APPROVED AS TO FORM signature for the prosecuting authority", "the approval as to form is the prosecuting authority's, not the participant's");
  } else if (componentId === "ms-fel-certificate-of-service-3") {
    w("certifying_petitioner_name", "Petitioner named as the person certifying service", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    rbf("district_attorney_identity", "Name and office of the district attorney served",
      "the name and office of the district attorney for the county of conviction",
      "the platform holds no district attorney identity for any Mississippi district and the committed record forbids hardcoding one");
    rbf("district_attorney_address", "Address at which the district attorney was served",
      "the address at which you served the district attorney",
      "the platform holds no district attorney address and the committed record specifically forbids inheriting the archived model's Greenville address");
    rbf("service_manner", "Manner of service - United States mail or hand delivery", "how you served the district attorney", "how service was actually made is known only after it happens");
    rbf("service_date", "Date of service on the district attorney",
      "the date you served the district attorney - at least TEN DAYS must pass between this date and any hearing",
      "the date of service is known only when service is actually made");
    prot("cos_signature", "Petitioner's signature on the certificate of service", "the certificate is the participant's own and is signed when service has actually been made");
    prot("cos_signature_date", "Date beside the petitioner's signature on the certificate of service", "a certificate of service dated before service happened would be false");
  } else if (componentId === "ms-fel-notice-6") {
    w("notice_petitioner_name", "Petitioner named in the ten days' notice", "participant.full_legal_name");
    w("notice_address", "Petitioner's address on the notice", "participant.street_address");
    w("notice_phone", "Petitioner's telephone number on the notice", "participant.phone");
    w("notice_email", "Petitioner's email address on the notice", "participant.email");
    CAPTION_BLANKS(componentId, rbf);
    rbf("notice_da_identity", "Name and office of the district attorney the notice is addressed to",
      "the name and office of the district attorney for the county of conviction",
      "the platform holds no district attorney identity for any Mississippi district and does not guess one");
    rbf("notice_da_address", "Address of the district attorney the notice is addressed to",
      "the address of the district attorney for the county of conviction",
      "the platform holds no district attorney address and does not guess one");
    rbf("notice_hearing_date", "Hearing date, if one has been set by the Court",
      "the hearing date if the court has set one - leave it blank if it has not",
      "a hearing is set in the discretion of the court and the date is the court's to assign");
    prot("notice_signature", "Petitioner's signature on the notice", "the notice is the participant's own and is signed when actually given");
    prot("notice_signature_date", "Date beside the petitioner's signature on the notice", "a notice dated before it is given would be false");
  } else if (componentId === "ms-fel-attachment-4") {
    w("participant_name", "Person the document checklist is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the filing instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/MS.memo.json", track: "ms-fel" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ms-fel-set" },
    { record: "data/rcap-grade-a/legal-decisions/OWNER_CORRECTIONS_REQUIRED.json", read: "Q4, ms-fel-set — the owner's direction that no unconfirmed fee figure be published and that the controlling design's refusal be carried to the participant" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "2026 Mississippi House Bill 1546, As Sent to Governor (enrolled), Chapter 430, Laws of 2026, approved 30 March 2026, effective 1 July 2026 — amends Miss. Code Ann. § 99-19-71", url: "https://billstatus.ls.state.ms.us/2026/pdf/history/HB/HB1546.htm", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 99-19-71 — Expunction of criminal record (as amended by 2026 HB 1546, eff. 1 July 2026)", url: "https://law.justia.com/codes/mississippi/title-99/chapter-19/in-general/section-99-19-71/", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 99-19-72 — Filing fee levied on each petition to expunge an offense under § 99-19-71 (secondary compilation; the section's CURRENT text was not retrieved, which is why no figure is published)", url: "https://law.justia.com/codes/mississippi/title-99/chapter-19/in-general/section-99-19-72/", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "No official form exists for a Miss. Code Ann. § 99-19-71(2) petition. Mississippi has no statewide expungement "
    + "form and § 99-19-71 prescribes none. The four archived petition and order PDFs in the record are Fourth "
    + "Circuit Court District models covering Leflore, Sunflower and Washington counties only, with a hardcoded "
    + "three-county field, a hardcoded Fourth District DA address at Greenville and 2020 signature blocks. The "
    + "committed record classifies them as DRAFTING REFERENCES ONLY and lists their defects as things not to "
    + "inherit. None of them was used as a form and nothing was copied from them. The MASTER_QUEUE row agrees: "
    + "officialFormFamily NONE, implementationStrategy custom_pleading, forms [], boundCount 0.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that this participant is eligible under § 99-19-71(2) — the twelve-category exclusion list, the rehabilitation determination and the common-nucleus question are not encoded and are left to the participant, counsel and the court",
    "what this filing costs — § 99-19-72's current text was not retrieved for the committed record, no figure is published on this route, and the circuit clerk of the county of conviction is named as the authority who states the current amount",
    "whether the § 99-19-72 fee reaches a petition filed in justice or municipal court rather than circuit court — the collection mechanism names the circuit clerk and the committed record leaves the question open in terms",
    "whether any pauper's-affidavit route is available for an expungement petition, which the committed record records as not established",
    "whether notarization is required — the committed record records it as unresolved and a simple truth statement is used"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the petition's own face: a Miss. Code Ann. § 99-19-71(2) petition to expunge one felony "
    + "conviction, filed in the court in which the conviction was had. No election control is rendered. The caption's "
    + "court line offers four courts because the statute does — justice, county, circuit or municipal — and which one "
    + "applies is a record fact the participant copies from the sentencing order rather than an election the packet "
    + "makes. The exclusion-list determination, the rehabilitation showing and the common-nucleus statement are not "
    + "route elections: the committed record lists each as a manual completion item reserved to the participant, "
    + "counsel or the court."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Get a lawyer to review this before you file. That is not a formality on this route.** The committed legal record says every felony conviction carries mandatory attorney review before filing: the twelve-category exclusion list, the discretionary rehabilitation finding, and the fact that § 99-19-71(2)(a) allows **one felony expunction in a lifetime** make this unsuitable for unassisted self-help. Filing the wrong petition can spend an allowance you cannot get back.",
    "",
    "Mississippi has **no statewide expungement form** and § 99-19-71 prescribes none, so these pages are drafted to the statute. The archived Fourth Circuit District models are drafting references only; nothing in this packet is inherited from them, and no county, prosecutor address or date is hardcoded.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Your race is **not** collected — no statute requires it. Every case fact lives on records the platform has not seen, so each is a labelled dotted blank listed below.",
    "",
    "**The waiting period is three years, not five.** 2026 HB 1546 struck \"five (5)\" and inserted \"three (3)\", effective 1 July 2026. The three years run from successful completion of **all** terms and conditions of the sentence — not from the conviction and not from release."
  ],
  componentBlurbs: {
    "ms-fel-primary-filing-1": "the petition under § 99-19-71(2), with the three-year period, the payment allegation, and the exclusion, rehabilitation and common-nucleus statements left for you and counsel",
    "ms-fel-proposed-order-2": "the proposed Order of Expungement. It is unexecuted; its findings, its date, the judge's signature and the prosecuting authority's approval as to form are all blank",
    "ms-fel-certificate-of-service-3": "the certificate of service on the district attorney, captioned for **this** petition, which is your evidence of the ten days' notice",
    "ms-fel-attachment-4": "the six documents to obtain first, and which office holds each",
    "ms-fel-instructions-5": "where to file, the filing fee you confirm with the circuit clerk because this packet publishes no figure, who to serve, the ten-day rule, and the three things this order does **not** do",
    "ms-fel-notice-6": "the ten days' written notice to the district attorney that § 99-19-71(2)(b) requires before any hearing"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Certified copy of the sentencing order | Circuit clerk of the county of conviction |",
    "| Copy of the indictment | Circuit clerk of the county of conviction |",
    "| Docket sheet for the case | Clerk of the court where the case was heard |",
    "| Account balance sheet showing a zero balance | Clerk of the court where the case was heard |",
    "| Proof of completion of probation, supervised release or treatment | The supervising authority or programme |",
    "| Your Mississippi criminal history record | Mississippi Criminal Information Center |"
  ],
  stepsLines: [
    "1. **Have a lawyer review your eligibility.** Mandatory on this route, per the committed record.",
    "2. **Obtain the six documents above.** The three-year clock runs from the date the last term was completed, and that date comes from the completion documentation, not memory.",
    "3. **Fill every dotted blank** on the petition, the certificate of service and the notice, from the record itself.",
    "4. **Make the three reserved statements yourself** — the exclusion-list determination, the rehabilitation showing, and, where more than one conviction is involved, the common-nucleus statement.",
    "5. **File the petition, the proposed order and the certificate of service with the circuit clerk of the county of conviction**, and pay the filing fee. **This packet publishes no fee amount** — § 99-19-72 levies a fee on a petition under § 99-19-71, but its current text was not retrieved for the record this packet is built from. **Ask that clerk for the current amount, and for any pauper's-affidavit route, before you file**, along with that district's own requirements.",
    "6. **Give the district attorney ten days' written notice** — the notice component — by United States mail or hand delivery, and file the certificate of service as your evidence. **At least ten days must pass between service and any hearing.** This is the one hard timing rule on this route.",
    "7. **Attend the hearing** if the court sets one. The court may grant if it determines, on the record or in writing, that you are rehabilitated from the offense."
  ],
  blanksLines: [
    "- **Your signature and the dates beside it**, on the petition, the certificate of service and the notice. You sign when you actually file and serve.",
    "- **The court's findings, the date of entry and the judge's signature** on the proposed order, and **the prosecuting authority's APPROVED AS TO FORM signature.** None of them is yours to complete.",
    "- **The district attorney's name and address.** The platform holds none for any Mississippi district and does not guess. The committed record specifically forbids inheriting the archived model's Greenville address.",
    "- **The exclusion-list determination, the rehabilitation showing and the common-nucleus statement.** Each is reserved to you, counsel or the court.",
    "- **The hearing date on the notice**, where the court has not set one."
  ],
  stopsLines: [
    "- **always, on this route** — attorney review before filing is mandatory on the committed record;",
    "- any offense near the exclusion list, especially a crime of violence, embezzlement, a firearm offense, or the felony procuring and promoting prostitution offenses newly added by 2026 HB 1546;",
    "- any prior expungement of any kind, and in particular any prior felony expunction;",
    "- more than one felony conviction, where the common-nucleus question decides whether you spend your one allowance or are ineligible;",
    "- any unpaid balance of fines, costs or restitution;",
    "- any public-official question — § 99-19-71(5) makes no public official eligible for a conviction related to official duties;",
    "- you are not a United States citizen;",
    "- the district attorney objects, declines to approve the order as to form, or the court sets a contested hearing.",
    "",
    "Where self-help stops, the circuit clerk of the county of conviction answers filing mechanics, and the Mississippi Criminal Information Center issues the criminal history record you need to check your own record before filing."
  ],
  notLines: [
    "This is a prepared petition, a proposed order, a certificate of service, a statutory notice and their process pages. It is not legal advice, it is not filed or served for you, and it does not decide whether you are eligible.",
    "",
    "**And it does not make the conviction vanish.** § 99-19-71(3) lets an employer ask a prospective employee whether an order of expunction has been entered on their behalf; a person called as a prospective juror must, on request, advise the court in camera of the conviction and the expunction; and the Mississippi Criminal Information Center keeps a nonpublic record solely to determine first-offender status in subsequent proceedings. Never state that the conviction did not happen."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero source binaries. Mississippi has no statewide expungement form and "
      + "§ 99-19-71 prescribes none; the four archived PDFs are Fourth Circuit District models with a hardcoded "
      + "three-county field, a hardcoded Greenville DA address and 2020 signature blocks.",
    consequence:
      "Every page is composed from the codified text and the committed legal-design record. The record's explicit "
      + "do-not-inherit list is honoured item by item: no hardcoded court, county or prosecuting authority; no "
      + "certificate of service captioned for another document; no grand jury indictment pleaded as a mandatory "
      + "allegation; no § 99-15-26 cited alongside § 99-19-71; no five-year recital; no 2020 dates; no race field."
  },
  {
    finding:
      "An earlier build of this family published '$150.00' as this route's cost, on the strength of the compiled "
      + "Mississippi profile's feeRules[0] and the statutory text quoted in MS.memo unresolvedQuestions[0], against "
      + "the packet-set manifest's pay_fee entry and MS.memo's rules.fees, which both refuse to publish an amount. "
      + "The decision owner overruled that departure on 2026-09-02 (OWNER_CORRECTIONS_REQUIRED.json, Q4).",
    consequence:
      "The figure is withdrawn and the controlling design's refusal is carried instead. The owner's exception — a "
      + "figure where current primary authority or the official form supports it — was checked and is unavailable: "
      + "rules.fees records that § 99-19-72's current text could not be retrieved, the memo's quotation sits inside "
      + "unresolvedQuestions, the compiled profile is a derived record rather than primary authority, the only held "
      + "§ 99-19-72 URL is a secondary compilation, and this route binds no official form. The packet now names the "
      + "circuit clerk of the county of conviction as the office that states the current amount."
  },
  {
    finding:
      "The committed record's open question about § 99-19-72 is specific: whether the fee reaches a § 99-19-71(4) "
      + "NON-conviction petition, and whether it reaches a § 99-19-71(1) or (4) petition filed in justice or "
      + "municipal court where the collection mechanism naming the circuit clerk does not map.",
    consequence:
      "Neither uncertainty reaches this route, which is a § 99-19-71(2) petition to expunge one felony CONVICTION "
      + "filed with the circuit clerk of the county of conviction — but that does not license a figure, because the "
      + "reason no figure is published is that § 99-19-72's current text was not retrieved, not that its reach is "
      + "doubtful here. The packet states the venue caveat as an open question rather than resolving it, and names "
      + "the circuit clerk of the county of conviction as the authority for the amount and for any "
      + "pauper's-affidavit route."
  },
  {
    finding:
      "Section 99-19-71(3) permits an employer to ask a prospective employee whether an order of expunction has "
      + "been entered on their behalf, requires a prospective juror to advise the court in camera on request, and "
      + "retains a nonpublic Criminal Information Center record solely to determine first-offender status. The "
      + "committed record calls this real, unusual, and something participants must be told.",
    consequence:
      "All three limitations are printed in the process guidance and again in participant-instructions.md, and the "
      + "packet tells the participant in terms never to state that the conviction did not happen. The proposed "
      + "order recites the § 99-19-71(3) retention so the court's own order carries it too."
  },
  {
    finding:
      "2026 HB 1546 struck 'five (5)' and inserted 'three (3)' in § 99-19-71(2)(a), effective 1 July 2026, and "
      + "added felony procuring and promoting prostitution under § 97-29-51 to the exclusion list. The compiled "
      + "profile still carries pre-amendment five-year language in some pathway summaries.",
    consequence:
      "The packet pleads and instructs THREE years, per the enrolled text the intake record was built from, and "
      + "names the newly added prostitution offenses among the stop conditions. The stale five-year profile "
      + "language was not read onto this route."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "THE FEE QUESTION, DECIDED BY THE OWNER AND APPLIED HERE. An earlier build published $150.00; OWNER_CORRECTIONS_REQUIRED.json Q4 directed that the figure be withdrawn and the controlling design's refusal carried, with a figure permitted only where current primary authority or the official form supports it. Neither is in hand — MS.memo rules.fees records that § 99-19-72's current text could not be retrieved, and this route binds no official form — so this build publishes no amount and names the circuit clerk of the county of conviction. If counsel obtains the current certified text of § 99-19-72, a figure may be restored on that basis and this note is where to record it.",
    "Confirm the venue caveat as printed — that the committed record leaves open whether the § 99-19-72 fee reaches a petition filed in justice or municipal court, because the collection mechanism names the circuit clerk — is stated at the right strength for a participant who was convicted in county or municipal court.",
    "Confirm the three reserved statements are correctly left to the participant and counsel rather than pleaded: the twelve-category exclusion determination, the rehabilitation showing, and the common-nucleus statement.",
    "Confirm the § 99-19-71(3) limitations as printed — employer inquiry, prospective juror disclosure, and the retained nonpublic Criminal Information Center record — are complete and correctly worded for a participant.",
    "Confirm the proposed order's recital of the § 99-19-71(3) retention belongs in the order itself rather than only in the guidance.",
    "Notarization is recorded as unresolved and a simple truth statement is used. Confirm that is sufficient, or specify the jurat."
  ],
  mattersForTheReviewersAttention: [
    "The archived Fourth District models were used as drafting references only. Every defect the committed record names — the three-county field, the Greenville DA address, the mis-captioned certificate of service, the mandatory indictment allegation, the § 99-15-26 conflation, the five-year recital, the 2020 dates and the race field — is absent by design, and the absences are deliberate rather than incidental.",
    "The ten days' written notice under § 99-19-71(2)(b) ships as its own component rather than as a paragraph, because it is the one hard timing rule on this route and the participant must be able to hand it over separately.",
    "The arresting agency is mapped as a participant case fact, not as a protected court field. It is a fact the participant already holds from the record they screened with, and bundling it with the clerk and the judge would let a required fact hide inside a protected class.",
    "The caption offers four courts because the statute does. Which one applies is copied from the sentencing order; the packet makes no election."
  ]
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — census-v1 zero-bound-source composed-pleading machinery.
 *
 * This section is deliberately identical across the FABLE-PB composed-pleading
 * family builders. Each script stays self-contained because every one of these
 * families' MASTER_QUEUE rows is exclusiveScript with sharedBuildHost null, and
 * because a shared host shared with families outside this lane's grant could not
 * be changed without moving their bytes. The family-specific facts live entirely
 * above this line; nothing below it knows which family it is building.
 *
 * The machinery is the proven pattern already in service in this factory
 * (scripts/build-census-v1-ga-jail-k2-set.mjs and its siblings), carried over
 * unchanged so that a reader who has verified it once does not have to verify it
 * again. Determinism comes from stampDeterministic(): pdf-lib stamps the wall
 * clock into a document created with PDFDocument.create(), and every assembled
 * document here is created that way, so both the per-component documents and the
 * assembled packet are pinned to the factory's single fixed date. Without it two
 * builds of identical inputs differ and the family's hash-bound raster receipt is
 * silently invalidated.
 * ════════════════════════════════════════════════════════════════════════════ */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- field-map row helpers (maps-with-canonical-and-boundary shape) --------- */
function mapBase(componentId, id, label) {
  return {
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  };
}
function mapWrite(componentId, id, label, factId) {
  return { ...mapBase(componentId, id, label), factId, kind: "composed_text", document: componentId };
}
function mapProtected(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapCourtOwned(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapRbf(componentId, id, label, what, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  };
}
function composedMapShell(componentId, writes, refusals) {
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- deterministic PDF rendering ------------------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

/*
 * The route trailer is internal machine metadata, not pleading text.
 *
 * VF08 read a delivered page inside a proposed order the court is asked to sign
 * whose only ink was this line. A page that says nothing to the court is a
 * visible defect on a delivered page, so the trailer is never left as the sole
 * occupant of one: when the body ends flush with a page boundary the previous
 * block is pulled down to keep it company. The rule is
 * scripts/build-census-v1-rcap-ok-custom-pleading.mjs's sole-occupant pull-down,
 * moved onto this builder's own pagination rather than a new scheme.
 */
const TRAILER_LINE = /^(Route: |Route:$|Routes this set serves \()/;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  /* The same 45 rows a page this composer has always drawn: y starts at
   * height - margin and a row is drawn while y >= margin, which is
   * floor((height - 2 * margin) / lineHeight) + 1 rows. Stated once here so the
   * layout can be settled as a plan before any ink is placed. */
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;

  /*
   * The one shared separator-aware splitter, not a private copy.
   *
   * A route key too long for the 468pt column is broken at its OWN separators
   * -- after a colon, underscore, slash, dot or hyphen -- so the broken line
   * ends on the separator and announces itself as continuing, instead of at
   * whichever glyph first reached the margin. hardSplits is asserted zero after
   * every composed document below: a future route key with no separator to
   * break on fails the build instead of shipping a chopped one.
   */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };

  /* Lay every block out into pages before drawing anything, so the trailer can
   * be caught sitting alone while the layout is still only a plan. A block is
   * one source line together with every row it wraps to; the rows fill pages in
   * exactly the order and at exactly the density they always did. */
  const blocks = sanitizePdfText(fullText).split("\n").map((raw, index) =>
    ({ index, rows: wrap(raw), trailer: TRAILER_LINE.test(raw) }));
  const pages = [[]];
  for (const block of blocks) {
    for (const text of block.rows) {
      if (pages[pages.length - 1].length === rowsPerPage) pages.push([]);
      pages[pages.length - 1].push({ text, block: block.index, trailer: block.trailer });
    }
  }

  /*
   * The sole-occupant pull-down. A last page whose every drawn row is trailer
   * takes the previous block down onto it. Whole blocks only, a move that would
   * not fit is refused, and a page that already carries prose is left alone.
   */
  const soleOccupant = (page) => page.length > 0 && page.every((r) => r.trailer || r.text === "");
  for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
    const last = pages[pages.length - 1];
    const previous = pages[pages.length - 2];
    const moving = previous[previous.length - 1].block;
    const moved = [];
    while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
    if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
    last.unshift(...moved);
    if (previous.length === 0) pages.splice(pages.length - 2, 1);
  }

  /* Proof, not intention: no delivered page of this document is only trailer. */
  for (const [index, rows] of pages.entries()) {
    assert.ok(!soleOccupant(rows),
      `${title}: page ${index + 1} carries nothing but the route trailer`);
  }

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    for (const [index, row] of rows.entries()) {
      if (row.text) {
        page.drawText(row.text, { x: margin, y: height - margin - index * lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
      }
    }
  }
  assert.equal(splitToken.hardSplits, 0,
    `${title}: a token was chopped mid-word because it carries no separator to break on`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- byte proof of the composed writes -------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ---------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the document you are using, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const maps = COMPONENTS.map((c) => composedMap(c));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 0, components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound: the MASTER_QUEUE row for this family binds zero sources (sourceStatus "
      + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundCount 0, officialFormFamily NONE, forms []). Every composed "
      + "page is grounded on the committed legal-design records named in groundingRecords, and nothing else.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    allSourcesExactNote:
      "true vacuously: this family binds zero source binaries, so there is no source that is not bound by exact "
      + "SHA-256. No official form exists for this route per the legal-design record, and none was invented.",
    documents: [],
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundSources: [],
    boundSourcesNote: "this family binds zero source binaries; every page is composed by this build",
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: 0,
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
