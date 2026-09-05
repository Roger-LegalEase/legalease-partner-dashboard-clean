#!/usr/bin/env node
/**
 * The Mississippi additional justice-court / municipal-court misdemeanor
 * expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-misd-addl-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, ONE track with TWO
 * VENUE BRANCHES:
 *
 *   ms-misd-addl   Discretionary Expungement of Additional Justice Court or
 *                  Municipal Court Misdemeanors,
 *                  Miss. Code Ann. §§ 9-11-15(3) and 21-23-7(6)
 *
 * WHY TWO SECTIONS ARE ONE FAMILY AND NOT TWO
 *
 * The committed record compared the complete text of both provisions word for
 * word and found every operative element identical: the court may, in its
 * discretion, expunge the record of conviction of any or all misdemeanors in
 * THAT court, on a showing made IN OPEN COURT of (i) rehabilitation,
 * (ii) good conduct for two years since the last conviction in ANY court, and
 * (iii) that the best interest of society would be served. Section 9-11-15(3)
 * was added by Laws 2016 ch. 406 § 1 as a copy of the then-existing municipal
 * provision. The only differences are which court is petitioned, which
 * prosecutor is noticed, clause order and pronoun style.
 *
 * So they are modelled as one node with two venue branches rather than split,
 * and the branch is NOT a route election the packet makes. Which court
 * convicted the participant is a record fact they copy from the judgment, and
 * it is a labelled blank on the caption.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  the clerk of the justice court or municipal court in
 *                       which the convictions were had. Each court expunges
 *                       only its own misdemeanors, so a participant with
 *                       convictions in two courts needs TWO petitions.
 *                       MS.memo track ms-misd-addl rules.filing and destination.
 *   FEE                 NOT established for these sections, and the record says
 *                       why rather than merely being silent: § 99-19-72's fee
 *                       applies by its terms to petitions to expunge an offense
 *                       under § 99-19-71 and DOES NOT REACH §§ 9-11-15(3) or
 *                       21-23-7(6). Whether these courts charge any fee of
 *                       their own is unresolved.
 *   WAIVER              not established for these sections.
 *   SERVICE             the prosecuting authority — the municipal prosecuting
 *                       attorney on the § 21-23-7(6) branch, the equivalent
 *                       prosecutor on the justice-court branch — by United
 *                       States mail or hand delivery, evidenced by the
 *                       certificate of service, with PRIOR notice.
 *
 * A3 DISCIPLINE, AND WHY THE $150 IS NOT PRINTED HERE
 *
 * The compiled Mississippi profile states a $150 filing fee, and this factory
 * has a standing rule that a packet must not deny a figure the repository
 * holds. That rule does not reach this route, and the distinction is the whole
 * point of A3. The profile's line is keyed by section: "Mississippi Code
 * 99-19-72 sets a $150 filing fee for each petition to expunge an offense
 * under 99-19-71." Sections 9-11-15(3) and 21-23-7(6) are not § 99-19-71.
 * The committed legal-design record says so in terms — the fee "applies by its
 * terms to petitions under § 99-19-71 and does not reach these sections" — and
 * records that none of those other sections specifies a fee of its own.
 *
 * Printing $150 here would be the sibling-route inference the standard
 * forbids, and it would overcharge a participant by a figure the law does not
 * levy on them. So the packet states what IS established — that the § 99-19-72
 * fee does not reach these sections — and names the clerk of the convicting
 * justice or municipal court as the authority who answers what that court
 * actually charges. That is a complete deliverable: the participant can act.
 *
 * TWO THINGS THE PARTICIPANT MUST BE TOLD, BOTH FROM THE STATUTORY TEXT
 *
 * The order does NOT apply to the confidential records of law-enforcement
 * agencies, and it has NO EFFECT on the driving record maintained under
 * Title 63. A participant who wants a driving record cleared is not helped by
 * this route, and the committed record makes that a stop condition rather than
 * a footnote.
 *
 * The two-year good-conduct clock runs from the last conviction in ANY court,
 * not merely in the petitioned court, which is why a criminal-history check
 * rather than self-report is required before filing.
 *
 * A HEARING ALWAYS HAPPENS. The showing is made IN OPEN COURT. That is not a
 * contingency on this route, and the guidance says so: the participant will
 * stand up and make a three-element discretionary showing, which the committed
 * record classifies as advocacy and an attorney or advocate handoff.
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

const FAMILY_ID = "ms-misd-addl-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ms-misd-addl-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "MS",
  routeKeys: [
    "obligation:track-pathway:MS:ms-misd-addl:additional-justice-court-misdemeanor-relief-9-11-15-3",
    "obligation:track-pathway:MS:ms-misd-addl:additional-municipal-court-misdemeanor-relief-21-23-7-6"
  ],
  primaryRouteKey: "obligation:track-pathway:MS:ms-misd-addl:additional-justice-court-misdemeanor-relief-9-11-15-3",
  routeSelectionId: "ms-misd-addl-composed-set",
  legalName: "Discretionary Expungement of Additional Justice Court or Municipal Court Misdemeanors (Miss. Code Ann. §§ 9-11-15(3), 21-23-7(6))",
  routeName: "asking the Mississippi justice court or municipal court that convicted you to expunge any or all of its own misdemeanor convictions",
  statute: "Miss. Code Ann. §§ 9-11-15(3) and 21-23-7(6)"
});

const COMPONENTS = [
  "ms-misd-addl-primary-filing-1",
  "ms-misd-addl-proposed-order-2",
  "ms-misd-addl-certificate-of-service-3",
  "ms-misd-addl-attachment-4",
  "ms-misd-addl-instructions-5"
];

const COMPOSED_TITLES = {
  "ms-misd-addl-primary-filing-1": "Petition for Expungement of Misdemeanor Convictions (Miss. Code Ann. Sec. 9-11-15(3) or Sec. 21-23-7(6))",
  "ms-misd-addl-proposed-order-2": "Proposed Order of Expungement",
  "ms-misd-addl-certificate-of-service-3": "Certificate of Service",
  "ms-misd-addl-attachment-4": "Documents to Obtain Before Filing",
  "ms-misd-addl-instructions-5": "Filing Instructions, the Open-Court Showing, and What This Order Does Not Reach"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-misd-addl) and "
  + "the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, ms-misd-addl-set). The "
  + "compiled Mississippi profile was searched for a fee answer for these sections and holds none that addresses "
  + "them: its only fee line is keyed to § 99-19-71 and, per the intake record, § 99-19-72 does not reach "
  + "§§ 9-11-15(3) or 21-23-7(6)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1990-04-17",
    "participant.street_address": "42 Magnolia Street, Hattiesburg, MS 39401",
    "participant.phone": "601-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Bay St. Louis, Mississippi 39520-2214",
    "participant.phone": "(228) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

const CAPTION = (L) => {
  L.push("IN THE ................................ COURT OF ........................, MISSISSIPPI");
  L.push("(the JUSTICE COURT of the county, or the MUNICIPAL COURT of the municipality, in which the convictions were had)", "");
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

  if (componentId === "ms-misd-addl-primary-filing-1") {
    CAPTION(L);
    L.push("PETITION FOR EXPUNGEMENT OF MISDEMEANOR CONVICTIONS", "");
    L.push("STATE THE SECTION THIS PETITION IS BROUGHT UNDER. Both sections say the same thing; which one applies depends on which court convicted you.");
    L.push("  Justice court conviction .... Miss. Code Ann. Sec. 9-11-15(3)");
    L.push("  Municipal court conviction .. Miss. Code Ann. Sec. 21-23-7(6)", "");
    L.push("This petition is brought under Miss. Code Ann. Sec. " + DOTS(30), "");
    L.push(`COMES NOW the Petitioner, ${name}, and petitions this Court, in its discretion, to expunge the record of conviction of the misdemeanors identified below, all of which were had IN THIS COURT, and would show:`, "");
    L.push("1. IDENTIFYING INFORMATION.", "");
    L.push(`Petitioner's name: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("2. THE CONVICTIONS IN THIS COURT. This route reaches ANY OR ALL misdemeanors in this one court, and only in this one court. List each conviction you ask this Court to expunge - the charge, the cause number and the conviction date - copied from the certified judgments:", "");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("(If you have convictions in another justice or municipal court, they are NOT reached by this petition. Each court expunges only its own misdemeanors, and a separate petition goes to that other court.)", "");
    L.push("3. THE THREE-ELEMENT SHOWING. Both sections permit the Court, in its discretion, to expunge on a showing made IN OPEN COURT of the following three things. Petitioner will make that showing in open court; it is not made on this page:", "");
    L.push("   (i)  that Petitioner has been rehabilitated;");
    L.push("   (ii) that Petitioner has been of good behaviour and has not been convicted of any offence in ANY COURT for two (2) years since the last conviction; and");
    L.push("   (iii) that the best interest of society would be served by the expungement.", "");
    L.push("4. THE TWO-YEAR CLOCK RUNS FROM THE LAST CONVICTION IN ANY COURT - not merely in this court. Petitioner has obtained a Mississippi criminal history record to confirm it rather than relying on memory.", "");
    L.push("Date of the last conviction in ANY court, per the Mississippi criminal history record:");
    L.push(DOTS(), "");
    L.push("5. NOTICE TO THE PROSECUTING AUTHORITY. The prosecuting authority for this court receives prior notice of this petition, and the certificate of service evidences it.", "");
    L.push("WHEREFORE, Petitioner asks the Court, in its discretion, to expunge the record of conviction of the misdemeanors identified above.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(40), "");
    L.push("(Petitioner signs and dates this petition. Nothing on this page is signed or dated for Petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}    EMAIL: ${email}`, "");
    L.push("DECLARATION. Petitioner states that the matters set out above are true and correct to the best of Petitioner's knowledge, information and belief.");
  } else if (componentId === "ms-misd-addl-proposed-order-2") {
    CAPTION(L);
    L.push("ORDER OF EXPUNGEMENT", "");
    L.push("THIS DOCUMENT IS A PROPOSED ORDER. It is unexecuted. It records no finding this Court has made and nothing in it asserts that the Court has acted.", "");
    L.push(`THIS CAUSE came before the Court on the Petition of ${name} for expungement of misdemeanor convictions had in this Court, under Miss. Code Ann. Sec. ........................ , and upon the showing made in open court.`, "");
    L.push("The Court FINDS (findings to be made by the Court, on the showing made in open court):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("IT IS THEREFORE ORDERED AND ADJUDGED that the record of conviction of the misdemeanors identified in the Petition, all of which were had in this Court, be and the same is hereby EXPUNGED.", "");
    L.push("IT IS FURTHER ORDERED that this Order does NOT apply to the confidential records of law-enforcement agencies, and has NO EFFECT on the driving record maintained under Title 63 of the Mississippi Code.", "");
    L.push("SO ORDERED AND ADJUDGED this " + DOTS(12) + " day of " + DOTS(20) + ", 20" + DOTS(4) + ".", "");
    L.push("" + DOTS(50));
    L.push("JUDGE", "");
    L.push("APPROVED AS TO FORM:", "");
    L.push("" + DOTS(50));
    L.push("Prosecuting authority", "");
    L.push("(The findings, the date of entry, the judge's signature and the prosecuting authority's approval as to form are all left blank.)");
  } else if (componentId === "ms-misd-addl-certificate-of-service-3") {
    CAPTION(L);
    L.push("CERTIFICATE OF SERVICE", "");
    L.push("This certificate is captioned for THIS petition. The prosecuting authority receives PRIOR notice of the petition, and this certificate is the evidence of it.", "");
    L.push(`I, ${name}, certify that I have this day served a true and correct copy of the Petition for Expungement of Misdemeanor Convictions on the prosecuting authority for this Court, by United States mail, postage prepaid, or by hand delivery, addressed as follows:`, "");
    L.push("Prosecuting authority - the MUNICIPAL PROSECUTING ATTORNEY on the Sec. 21-23-7(6) branch, or the equivalent prosecutor for the justice court on the Sec. 9-11-15(3) branch. Name and office:");
    L.push(DOTS(), "");
    L.push("Address served:");
    L.push(DOTS(), "");
    L.push("Manner of service (United States mail or hand delivery): " + DOTS(30), "");
    L.push("Date served: " + DOTS(30), "");
    L.push("" + DOTS(50));
    L.push(`${name}, Petitioner`);
    L.push("Date: " + DOTS(30), "");
    L.push("(Service dates are written when service is actually made. No prosecutor's name or address is printed here: the platform holds none for any Mississippi justice or municipal court and does not guess one.)");
  } else if (componentId === "ms-misd-addl-attachment-4") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Get these before you write anything on the petition.", "");
    L.push("1. YOUR MISSISSIPPI CRIMINAL HISTORY RECORD - from the Mississippi Criminal Information Center. THIS ONE IS NOT OPTIONAL ON THIS ROUTE. The two-year good-conduct clock runs from your last conviction in ANY COURT, not just this one, so the only reliable way to know whether two years have actually passed is to look at your whole record. Do not rely on memory.", "");
    L.push("2. CERTIFIED COPIES OF EACH JUDGMENT OF CONVICTION IN THAT COURT - from the clerk of the justice court or municipal court. Ask for a certified copy of each conviction you want expunged. You list them all on the petition.", "");
    L.push("3. DOCKET SHEET FOR THE CASE - from the clerk of the court where the case was heard. It shows every court-imposed term and whether each was satisfied.", "");
    L.push("ONE COURT AT A TIME. Each court expunges only its own misdemeanors. If your convictions are spread across two justice or municipal courts, you need a separate petition in each, with its own certified judgments and its own prosecuting authority served.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("GET AN ADVOCATE OR A LAWYER FOR THE HEARING. The committed legal record puts this route in the stop-and-get-help class whenever it is in play, and the reason is specific: the three-element showing is DISCRETIONARY ADVOCACY made in open court, not a form to fill. You will stand up and persuade a judge.", "");
    L.push("WHICH SECTION, AND WHERE THIS IS FILED. Both sections say the same thing and which applies depends only on which court convicted you.");
    L.push("  Convicted in JUSTICE COURT .... Miss. Code Ann. Sec. 9-11-15(3), filed with the clerk of that justice court.");
    L.push("  Convicted in MUNICIPAL COURT .. Miss. Code Ann. Sec. 21-23-7(6), filed with the clerk of that municipal court.", "");
    L.push("File with the CLERK OF THE COURT IN WHICH THE CONVICTIONS WERE HAD. Justice and municipal courts are the least standardized courts in Mississippi, so CALL THAT CLERK BEFORE FILING and ask how that court wants this done.", "");
    L.push("ONE PETITION PER COURT. Each court expunges only its own misdemeanors. Convictions in two courts need two petitions.", "");
    L.push("WHAT IT COSTS, AND WHAT IS ACTUALLY KNOWN.", "");
    L.push("The $150 filing fee you may have read about is levied by Miss. Code Ann. Sec. 99-19-72 on petitions to expunge an offense under Sec. 99-19-71. THIS PETITION IS NOT BROUGHT UNDER SEC. 99-19-71. It is brought under Sec. 9-11-15(3) or Sec. 21-23-7(6), and the Sec. 99-19-72 fee does not reach those sections by its terms. Neither Sec. 9-11-15(3) nor Sec. 21-23-7(6) specifies a fee of its own.", "");
    L.push("So the honest answer is: no fee amount is established for this route in the records this packet is built from, and the $150 figure is not yours to pay unless that court itself charges it for some other reason. ASK THE CLERK OF THE JUSTICE COURT OR MUNICIPAL COURT WHERE YOU ARE FILING what that court charges, before you file.", "");
    L.push("ABOUT A FEE WAIVER. No waiver procedure is established for these sections either. Ask THE SAME CLERK.", "");
    L.push("WHO YOU SERVE. The PROSECUTING AUTHORITY for that court receives PRIOR NOTICE - the municipal prosecuting attorney on the Sec. 21-23-7(6) branch, and the equivalent prosecutor for the justice court on the Sec. 9-11-15(3) branch. Serve by United States mail or hand delivery and file the certificate of service as your evidence.", "");
    L.push("THERE WILL BE A HEARING. This is not a contingency. Both sections require the showing to be made IN OPEN COURT, so a hearing always occurs on this route. Be ready to show three things:", "");
    L.push("  (i)  that you have been rehabilitated;");
    L.push("  (ii) that you have been of good behaviour and have not been convicted of any offence IN ANY COURT for two years since your last conviction; and");
    L.push("  (iii) that the best interest of society would be served by the expungement.", "");
    L.push("THE TWO-YEAR CLOCK COUNTS EVERY COURT. It runs from your last conviction in ANY court, not merely in the court you are petitioning. That is why the Mississippi criminal history record is not optional here: a conviction you forgot, in another court, restarts it.", "");
    L.push("RELIEF IS DISCRETIONARY. Both sections say the court MAY expunge. Meeting all three elements does not entitle you to the order.", "");
    L.push("WHAT THIS ORDER DOES NOT REACH.", "");
    L.push("It does not apply to the confidential records of law-enforcement agencies.", "");
    L.push("IT HAS NO EFFECT ON YOUR DRIVING RECORD. The driving record maintained under Title 63 of the Mississippi Code is untouched by this order. If clearing your driving record is what you are after, this route will not do it, and you should say so to whoever is helping you before you spend the effort.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD.");
    L.push("- Whenever this track is in play. The open-court showing is discretionary advocacy and is an attorney or advocate handoff.");
    L.push("- You have convictions in more than one justice or municipal court.");
    L.push("- You have any conviction in any court within the last two years - the clock has not run.");
    L.push("- You expect the driving record to be cleared. It will not be.");
    L.push("- You are not a United States citizen.", "");
    L.push("Where self-help stops, the clerk of the justice or municipal court answers filing mechanics, and the Mississippi Criminal Information Center issues the criminal history record the two-year element depends on.");
  }
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

const CAPTION_BLANKS = (componentId, rbf) => {
  rbf("caption_court", "Court named in the caption - the justice court or municipal court in which the convictions were had",
    "the justice court or municipal court that convicted you, copied from the certified judgment",
    "which court convicted the participant is a case fact the platform has not seen, and it also decides which of the two sections applies");
  rbf("caption_place", "County or municipality named in the caption",
    "the Mississippi county of the justice court, or the municipality of the municipal court",
    "the place of conviction is a case fact the platform has not seen");
  rbf("caption_petitioner", "Petitioner name line in the STATE OF MISSISSIPPI VS. caption",
    "your name as the record states it in the criminal cause, which may differ from the name you use now",
    "the name as captioned in the criminal cause is a record fact the platform has not seen");
  rbf("caption_cause_number", "Cause number in the caption",
    "the cause number of the criminal case, copied from the certified judgment, or the new number the court assigns",
    "no cause number is held for a record the platform has not seen");
};

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));
  const court = (id, label, why) => refusals.push(mapCourtOwned(componentId, id, label, why));

  if (componentId === "ms-misd-addl-primary-filing-1") {
    w("petitioner_name", "Petitioner named in the body of the petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth in the identifying block", "participant.date_of_birth");
    w("mailing_address", "Mailing address in the identifying block", "participant.street_address");
    w("telephone", "Telephone number in the identifying block", "participant.phone");
    w("email", "Email address in the identifying block", "participant.email");
    CAPTION_BLANKS(componentId, rbf);
    rbf("section_brought_under", "The Mississippi Code section this petition is brought under",
      "Sec. 9-11-15(3) where a justice court convicted you, or Sec. 21-23-7(6) where a municipal court did - copied from the certified judgment, not chosen",
      "which section applies follows from which court convicted the participant, which is a record fact the platform has not seen; the packet makes no election between the two branches");
    rbf("conviction_list", "List of every misdemeanor conviction in this court to be expunged - charge, cause number and conviction date",
      "every misdemeanor conviction in THAT ONE COURT that you want expunged, each with its charge, cause number and conviction date, copied from the certified judgments",
      "no conviction fact is held for records the platform has not seen, and this route reaches any or all misdemeanors in one court");
    rbf("last_conviction_any_court_date", "Date of the last conviction in ANY court",
      "the date of your last conviction in ANY court, taken from your Mississippi criminal history record rather than from memory - the two-year clock runs from it",
      "the two-year clock runs against the participant's entire record across every court, which the platform cannot see");
    prot("signature", "Signature of the petitioner on the petition", "the petition is the participant's own and is signed when actually filed");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is actually signed would be false");
  } else if (componentId === "ms-misd-addl-proposed-order-2") {
    w("petitioner_name", "Petitioner named in the body of the proposed order", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    rbf("order_section", "The Mississippi Code section recited in the proposed order",
      "Sec. 9-11-15(3) or Sec. 21-23-7(6), matching the section on your petition",
      "which section applies follows from which court convicted the participant, which is a record fact the platform has not seen");
    court("order_findings", "The Court's findings paragraph, made on the showing in open court", "the findings are the Court's to make on the open-court showing");
    court("order_entry_date", "Date the order is entered", "the date of entry is the Court's");
    court("judge_signature", "Judge's signature on the proposed order", "only the judge signs the order");
    court("approved_as_to_form", "APPROVED AS TO FORM signature for the prosecuting authority", "the approval as to form is the prosecuting authority's, not the participant's");
  } else if (componentId === "ms-misd-addl-certificate-of-service-3") {
    w("certifying_petitioner_name", "Petitioner named as the person certifying service", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    rbf("prosecutor_identity", "Name and office of the prosecuting authority served",
      "the name and office of the municipal prosecuting attorney, or the equivalent prosecutor for the justice court",
      "the platform holds no prosecuting-authority identity for any Mississippi justice or municipal court and does not guess one");
    rbf("prosecutor_address", "Address at which the prosecuting authority was served",
      "the address at which you served the prosecuting authority",
      "the platform holds no prosecuting-authority address for any Mississippi justice or municipal court and does not guess one");
    rbf("service_manner", "Manner of service - United States mail or hand delivery", "how you served the prosecuting authority", "how service was actually made is known only after it happens");
    rbf("service_date", "Date of service on the prosecuting authority",
      "the date you served the prosecuting authority, which must be before the hearing at which you make your showing",
      "the date of service is known only when service is actually made");
    prot("cos_signature", "Petitioner's signature on the certificate of service", "the certificate is the participant's own and is signed when service has actually been made");
    prot("cos_signature_date", "Date beside the petitioner's signature on the certificate of service", "a certificate of service dated before service happened would be false");
  } else if (componentId === "ms-misd-addl-attachment-4") {
    w("participant_name", "Person the document checklist is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the filing instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/MS.memo.json", track: "ms-misd-addl" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ms-misd-addl-set" },
    { record: "src/lib/rcap-engine/compiled/profiles/MS-mississippi.json", read: "packetGenerator.feeRules, searched for a fee answer for §§ 9-11-15(3) and 21-23-7(6) and holding none: its only fee line is keyed to § 99-19-71" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Miss. Code Ann. § 9-11-15 — Justice court; expungement of misdemeanor convictions (added by Laws 2016 ch. 406 § 1)", url: "https://law.justia.com/codes/mississippi/title-9/chapter-11/section-9-11-15/", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 21-23-7 — Municipal court; expungement of misdemeanor convictions (last amended Laws 2021 ch. 356)", url: "https://law.justia.com/codes/mississippi/title-21/chapter-23/section-21-23-7/", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 99-19-72 — Filing fee levied on petitions under § 99-19-71 (read to confirm it does not reach these sections)", url: "https://law.justia.com/codes/mississippi/title-99/chapter-19/in-general/section-99-19-72/", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "No official form exists for a § 9-11-15(3) or § 21-23-7(6) petition. Mississippi has no statewide expungement "
    + "form and neither section prescribes one. The MASTER_QUEUE row agrees: officialFormFamily NONE, "
    + "implementationStrategy custom_pleading, forms [], boundCount 0. The two sections are modelled as one family "
    + "with two venue branches because the committed record compared their complete text word for word and found "
    + "every operative element identical.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "what, if anything, a given Mississippi justice court or municipal court charges to file this petition — § 99-19-72's fee does not reach these sections and neither section specifies a fee of its own",
    "whether any fee-waiver route exists in these courts, which the committed record records as not established",
    "that the participant meets the two-year good-conduct element, which runs against their entire record in every court",
    "whether notarization is required — the committed record records it as not established and a simple truth statement is used"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One family, two venue branches, and the packet elects between them for nobody. Miss. Code Ann. § 9-11-15(3) "
    + "governs a justice-court conviction and § 21-23-7(6) a municipal-court conviction; the committed record "
    + "established that every operative element of the two is identical and that they differ only in which court is "
    + "petitioned and which prosecutor is noticed. Which branch applies therefore follows from which court "
    + "convicted the participant, which is a record fact copied from the certified judgment. It is rendered as a "
    + "labelled required-before-filing blank on the caption, on the petition's section line and on the proposed "
    + "order's recital, and no election control is drawn."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Get an advocate or a lawyer for the hearing.** The committed legal record puts this route in the stop-and-get-help class whenever it is in play, for a specific reason: the three-element showing is **discretionary advocacy made in open court**, not a form to fill. There will be a hearing, and you will have to persuade a judge.",
    "",
    "**Two sections, one packet.** §§ 9-11-15(3) and 21-23-7(6) say the same thing. Which applies depends only on whether a **justice court** or a **municipal court** convicted you, and you copy that from the certified judgment. This packet chooses for you nowhere.",
    "",
    "**One petition per court.** Each court expunges only its own misdemeanors. Convictions in two courts need two petitions.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on records the platform has not seen, so each is a labelled dotted blank listed below."
  ],
  componentBlurbs: {
    "ms-misd-addl-primary-filing-1": "the petition, with the section line, the list of convictions in that one court, and the two-year date taken from your criminal history record",
    "ms-misd-addl-proposed-order-2": "the proposed Order of Expungement, reciting that it does not reach law-enforcement confidential records and has no effect on the Title 63 driving record. It is unexecuted",
    "ms-misd-addl-certificate-of-service-3": "the certificate of service on the prosecuting authority, captioned for **this** petition",
    "ms-misd-addl-attachment-4": "the three documents to obtain first, and why the criminal history record is not optional here",
    "ms-misd-addl-instructions-5": "which section, where to file, what is actually known about the fee, the open-court showing, and what the order does **not** reach"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your Mississippi criminal history record — **not optional on this route** | Mississippi Criminal Information Center |",
    "| Certified copies of each judgment of conviction in that court | Clerk of the justice court or municipal court |",
    "| Docket sheet for the case | Clerk of the court where the case was heard |"
  ],
  stepsLines: [
    "1. **Get your Mississippi criminal history record first.** The two-year good-conduct clock runs from your last conviction in **any** court, so a conviction you forgot, in another court, restarts it. Memory is not good enough here.",
    "2. **Work out which court and which section** — justice court means § 9-11-15(3), municipal court means § 21-23-7(6) — from the certified judgment.",
    "3. **Get certified copies of each judgment** in that one court, and list every conviction you want expunged.",
    "4. **Call the clerk of that court before filing.** Justice and municipal courts are the least standardized courts in Mississippi, and that clerk will tell you how that court wants this done and what, if anything, it charges.",
    "5. **File the petition, the proposed order and the certificate of service** with the clerk of the court in which the convictions were had.",
    "6. **Serve the prosecuting authority** — the municipal prosecuting attorney, or the equivalent prosecutor for the justice court — by United States mail or hand delivery, and file the certificate of service. Notice is **prior** notice.",
    "7. **Go to the hearing and make the showing.** It is made in open court and it is the whole case: rehabilitation, two years' good behaviour since the last conviction in any court, and the best interest of society."
  ],
  blanksLines: [
    "- **Your signature and the dates beside it**, on the petition and the certificate of service.",
    "- **The court's findings, the date of entry, the judge's signature** and **the prosecuting authority's APPROVED AS TO FORM signature** on the proposed order.",
    "- **The prosecuting authority's name and address.** The platform holds none for any Mississippi justice or municipal court and does not guess.",
    "- **The section this petition is brought under.** It follows from which court convicted you; it is not a choice the packet makes.",
    "- **The open-court showing itself.** It is not generated. You make it in court."
  ],
  stopsLines: [
    "- **whenever this track is in play** — the open-court showing is discretionary advocacy and is an attorney or advocate handoff;",
    "- you have convictions in more than one justice or municipal court;",
    "- you have any conviction in any court within the last two years — the clock has not run;",
    "- **you expect your driving record to be cleared.** It will not be. The order has no effect on the driving record maintained under Title 63;",
    "- you are not a United States citizen.",
    "",
    "Where self-help stops, the clerk of the justice or municipal court answers filing mechanics and what that court charges, and the Mississippi Criminal Information Center issues the criminal history record the two-year element depends on."
  ],
  notLines: [
    "This is a prepared petition, a proposed order, a certificate of service and their process pages. It is not legal advice, it is not filed or served for you, it does not make the open-court showing for you, and relief is discretionary — meeting all three elements does not entitle you to the order.",
    "",
    "**It does not reach the confidential records of law-enforcement agencies, and it has no effect on your driving record** under Title 63 of the Mississippi Code."
  ]
};

const FINDINGS = [
  {
    finding:
      "The committed record compared the complete text of §§ 9-11-15(3) and 21-23-7(6) word for word and found "
      + "every operative element identical, differing only in which court is petitioned, which prosecutor is "
      + "noticed, clause order and pronoun style.",
    consequence:
      "The two sections are built as ONE family with two venue branches rather than split into two. The branch is "
      + "not a route election: which section applies follows from which court convicted the participant, and that is "
      + "rendered as a labelled required-before-filing blank on the caption, the petition's section line and the "
      + "proposed order's recital. No election control is drawn."
  },
  {
    finding:
      "The compiled Mississippi profile states a $150 filing fee, keyed by section to petitions to expunge an "
      + "offense under § 99-19-71. The committed intake record establishes that § 99-19-72's fee applies by its "
      + "terms to § 99-19-71 petitions and DOES NOT REACH §§ 9-11-15(3) or 21-23-7(6), and that neither of those "
      + "sections specifies a fee of its own.",
    consequence:
      "The $150 is NOT printed on this route. Reading it across would be the sibling-route inference the standard "
      + "forbids and would tell a participant to expect a charge the law does not levy on them. The packet instead "
      + "states what is established — that the § 99-19-72 fee does not reach these sections — and names the clerk "
      + "of the convicting justice or municipal court as the authority who answers what that court actually charges."
  },
  {
    finding:
      "The two-year good-conduct element runs from the last conviction in ANY court, not merely in the petitioned "
      + "court, and the committed record requires a criminal-history check rather than self-report.",
    consequence:
      "The Mississippi criminal history record is placed first in the document checklist and marked not optional, "
      + "the two-year date is a required-before-filing blank sourced explicitly to that record rather than to "
      + "memory, and a conviction in any court within the last two years is a named stop condition."
  },
  {
    finding:
      "Both sections provide that the order does not apply to the confidential records of law-enforcement agencies "
      + "and has NO effect on the driving record maintained under Title 63.",
    consequence:
      "Both limitations are recited in the proposed order itself, printed in the process guidance and repeated in "
      + "participant-instructions.md, and a participant who expects the driving record to be cleared is a named "
      + "stop condition rather than a footnote."
  },
  {
    finding:
      "The showing is made IN OPEN COURT, so a hearing always occurs on this route, and relief is expressly "
      + "discretionary — both sections say the court MAY expunge.",
    consequence:
      "The guidance states that the hearing is not a contingency, sets out the three elements the participant must "
      + "be ready to show, and says in terms that meeting all three does not entitle them to the order. The "
      + "open-court showing is declared as not generated by the packet."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the fee treatment. The packet states that § 99-19-72's $150 does not reach §§ 9-11-15(3) or 21-23-7(6), that neither section specifies a fee of its own, and that the participant must ask the clerk of the convicting court what that court charges. Confirm that naming the figure only to exclude it helps rather than confuses a participant who has read about the $150 elsewhere.",
    "Confirm the two sections are correctly built as one family with two venue branches, and that the section line on the petition and the recital on the proposed order are the right places to carry the branch.",
    "Confirm the proposed order is right to recite the law-enforcement-records and Title 63 driving-record limitations on its own face, rather than leaving them to the guidance.",
    "The committed record records notarization as not established and a simple truth statement is used. Confirm that is sufficient for a justice or municipal court, which are described as the least standardized courts in Mississippi.",
    "Confirm the open-court showing is correctly declared as not generated, and that the petition's paragraph 3 invites the showing without appearing to make it."
  ],
  mattersForTheReviewersAttention: [
    "The one-petition-per-court rule appears three times — in the petition's own text, in the document checklist and in the instructions — because a participant with convictions in two courts who files once has done half the job and will not know it.",
    "The two-year date is mapped to the Mississippi criminal history record explicitly rather than to the participant's recollection, because the clock counts convictions in courts this route does not touch.",
    "Neither prosecuting authority's identity nor address is held by the platform for any Mississippi justice or municipal court, and neither is guessed.",
    "The driving-record limitation is treated as a stop condition rather than a caveat, because a participant whose actual goal is a clean driving record gets nothing from this route and should learn that before filing."
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
