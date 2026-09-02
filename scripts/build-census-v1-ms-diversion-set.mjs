#!/usr/bin/env node
/**
 * The Mississippi post-diversion expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-diversion-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, ONE track that the
 * committed record splits into TWO LEGALLY DISTINCT BRANCHES:
 *
 *   ms-diversion   Expungement After Pretrial Intervention or Intervention
 *                  Court Completion, Miss. Code Ann. §§ 99-15-123 and 9-23-23
 *
 * THE TWO BRANCHES ARE NOT THE SAME ROUTE WEARING TWO NAMES
 *
 * The committed record obtained the complete text of both provisions and found
 * they split this slot rather than share it:
 *
 *   PRETRIAL INTERVENTION, § 99-15-123. Subsection (1) makes the DISPOSITION
 *   automatic — on successful completion "the court shall make a noncriminal
 *   disposition of the charge or charges". But subsection (3) makes the
 *   EXPUNGEMENT PETITION-BASED: "Upon petition therefor, the court shall
 *   expunge the record...". The court's duty is mandatory ONCE PETITIONED, and
 *   no order enters without the petition. Something is filed.
 *
 *   INTERVENTION COURT, § 9-23-23. "If the participant completes all
 *   requirements imposed upon him by the intervention court, including the
 *   payment of fines and fees assessed and not waived by the court, the charge
 *   and prosecution shall be dismissed. If the defendant or participant was
 *   sentenced at the time of entry of plea of guilty, the successful completion
 *   ... will result in the record of the criminal conviction or adjudication
 *   being expunged." That section contains NO petition language, no
 *   application requirement, no fee, no hearing, no notice and no waiting
 *   period — unlike §§ 99-19-71, 99-15-26(5), 99-15-123(3), 41-29-150(d)(2)
 *   and 63-11-30(13), every one of which expressly requires a petition or
 *   application. The committed record calls its expungement language the most
 *   self-executing in the Mississippi scheme. NOTHING IS FILED.
 *
 * SO THE PACKET IS BUILT WITH CONDITIONAL COMPONENTS. The petition, the
 * proposed order and the certificate of service belong to the PTI branch only
 * and are marked conditional on it. The process-guidance component carries the
 * intervention-court branch, whose entire deliverable is telling the
 * participant that there is nothing to file and what to obtain instead. A
 * packet that made an intervention-court participant file a petition would be
 * inventing a requirement the statute does not impose.
 *
 * WHAT THE REPOSITORY ESTABLISHES, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  PTI branch: the clerk of the court that made the
 *                       noncriminal disposition. Intervention-court branch:
 *                       nothing is filed; the participant obtains a certified
 *                       copy of whatever order was entered from the clerk of
 *                       the administering court.
 *                       MS.memo track ms-diversion rules.filing and destination.
 *   FEE                 NOT established for either section, and the record says
 *                       why rather than being silent: § 99-19-72's fee is
 *                       levied on petitions to expunge an offense under
 *                       § 99-19-71 and does not reach § 99-15-123 or § 9-23-23
 *                       by its terms, and neither section specifies a fee.
 *   WAIVER              not established for either section.
 *   SERVICE             PTI branch: the prosecuting authority receives a copy
 *                       as ordinary practice, by United States mail or hand
 *                       delivery, evidenced by the certificate of service.
 *                       Neither section prescribes notice, an objection period
 *                       or a hearing for the relief. NOTHING is served on the
 *                       verification branch.
 *
 * A3 DISCIPLINE. The compiled Mississippi profile's $150 line is keyed to
 * § 99-19-71. Neither § 99-15-123 nor § 9-23-23 is § 99-19-71, and the intake
 * record says the fee does not reach them. The figure is therefore not printed
 * as this route's answer; the clerk of the administering court is named
 * instead. The same discipline keeps § 99-19-71(4)'s text off this packet:
 * § 99-15-123(3) OMITS the "found not guilty at trial" limb that § 99-19-71(4)
 * contains, and the two are not interchangeable.
 *
 * THREE THINGS THE PARTICIPANT MUST BE TOLD
 *
 * A noncriminal disposition under § 99-15-103 is a dismissal WITHOUT PREJUDICE
 * to reinstatement on the district attorney's motion. That is not the same as
 * a case that can never come back, and the packet says so.
 *
 * Section 9-23-23 expressly bars expunction of any implied consent violation.
 * That routes to the DUI track and is a named stop condition.
 *
 * Many people already have relief entered and simply do not hold a copy. The
 * committed record makes checking that a required participant action before
 * anything is filed, because filing a petition for relief you already have
 * wastes the filing.
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

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ms-diversion-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ms-diversion-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "MS",
  routeKeys: [
    "obligation:unit:MS:ms-diversion:ms-diversion-intervention-court-verification",
    "obligation:unit:MS:ms-diversion:ms-diversion-pti-expungement-petition"
  ],
  primaryRouteKey: "obligation:unit:MS:ms-diversion:ms-diversion-pti-expungement-petition",
  routeSelectionId: "ms-diversion-composed-set",
  legalName: "Expungement After Pretrial Intervention or Intervention Court Completion (Miss. Code Ann. §§ 99-15-123 and 9-23-23)",
  routeName: "clearing the record after you completed a Mississippi pretrial intervention programme or an intervention court",
  statute: "Miss. Code Ann. §§ 99-15-123(3) and 9-23-23"
});

const COMPONENTS = [
  "ms-diversion-primary-filing-1",
  "ms-diversion-proposed-order-2",
  "ms-diversion-certificate-of-service-3",
  "ms-diversion-attachment-4",
  "ms-diversion-instructions-5",
  "ms-diversion-process-guidance-6"
];

const COMPOSED_TITLES = {
  "ms-diversion-primary-filing-1": "Petition to Expunge After Pretrial Intervention (Miss. Code Ann. Sec. 99-15-123(3))",
  "ms-diversion-proposed-order-2": "Proposed Order of Expungement",
  "ms-diversion-certificate-of-service-3": "Certificate of Service",
  "ms-diversion-attachment-4": "Documents to Obtain First, on Either Branch",
  "ms-diversion-instructions-5": "Which Branch You Are On, and What Each One Requires",
  "ms-diversion-process-guidance-6": "The Intervention Court Branch: Why Nothing Is Filed"
};

const COMPONENT_CONDITIONS = {
  "ms-diversion-primary-filing-1": "Used ONLY on the pretrial intervention branch under § 99-15-123(3), where the expungement is petition-based. Not used on the intervention court branch under § 9-23-23, which requires no petition.",
  "ms-diversion-proposed-order-2": "Used ONLY on the pretrial intervention branch under § 99-15-123(3). Not used on the intervention court branch.",
  "ms-diversion-certificate-of-service-3": "Used ONLY on the pretrial intervention branch under § 99-15-123(3). Nothing is served on the intervention court branch.",
  "ms-diversion-process-guidance-6": "Carries the intervention court branch under § 9-23-23, where the relief follows completion by operation of the statute and nothing is filed."
};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-diversion) and "
  + "the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, ms-diversion-set). The "
  + "compiled Mississippi profile was searched for a fee answer for §§ 99-15-123 and 9-23-23 and holds none that "
  + "addresses them: its only fee line is keyed to § 99-19-71";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1993-04-17",
    "participant.street_address": "42 Magnolia Street, Hattiesburg, MS 39401",
    "participant.phone": "601-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1971-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Bay St. Louis, Mississippi 39520-2214",
    "participant.phone": "(228) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

const CAPTION = (L) => {
  L.push("IN THE ................................ COURT OF ........................ COUNTY, MISSISSIPPI");
  L.push("(the court that made the noncriminal disposition of the charge)", "");
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

  if (componentId === "ms-diversion-primary-filing-1") {
    L.push("USE THIS PAGE ONLY IF YOU COMPLETED A PRETRIAL INTERVENTION PROGRAMME under Miss. Code Ann. Sec. 99-15-123. If you completed an INTERVENTION COURT under Sec. 9-23-23, do not file this - see the intervention court page in this packet.", "");
    CAPTION(L);
    L.push("PETITION TO EXPUNGE AFTER PRETRIAL INTERVENTION", "");
    L.push(`COMES NOW the Petitioner, ${name}, and petitions this Court under Miss. Code Ann. Sec. 99-15-123(3) to expunge the record of the case identified below, and would show:`, "");
    L.push("1. IDENTIFYING INFORMATION.", "");
    L.push(`Petitioner's name: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("2. THE CASE. Copied from the programme completion order and the final disposition:", "");
    L.push("Charge or charges as the record states them:");
    L.push(DOTS(), "");
    L.push("Date of arrest: " + DOTS(42));
    L.push("Arresting agency: " + DOTS(38), "");
    L.push("Date the pretrial intervention programme was successfully completed:");
    L.push(DOTS(), "");
    L.push("Date of the noncriminal disposition, and how the record words it:");
    L.push(DOTS(), "");
    L.push("3. THE STATUTORY GROUND. Section 99-15-123(3) provides: 'Upon petition therefor, the court shall expunge the record of any case in which an arrest was made, the person arrested was released and the case was dismissed or the charges were dropped or there was no disposition of such case.' The Court's duty is MANDATORY once petitioned. Petitioner is within that provision because:", "");
    L.push("State which limb applies - an arrest was made and Petitioner was released and the case was dismissed, or the charges were dropped, or there was no disposition. Copy the docket wording rather than characterising it:");
    L.push(DOTS(), "");
    L.push("(Note: Sec. 99-15-123(3) does NOT contain the 'found not guilty at trial' limb that Sec. 99-19-71(4) contains. Do not plead an acquittal here.)", "");
    L.push("4. THE DISPOSITION FOLLOWED SUCCESSFUL COMPLETION. Section 99-15-123(1) provides that on successful completion the court shall make a noncriminal disposition of the charge or charges, which Sec. 99-15-103 defines as dismissal of the charge.", "");
    L.push("5. NO ORDER HAS ALREADY BEEN ENTERED. Petitioner has asked the clerk whether any order dismissing or expunging this case has already been entered, and:");
    L.push(DOTS(), "");
    L.push("WHEREFORE, Petitioner asks the Court to expunge the record of the case identified above under Miss. Code Ann. Sec. 99-15-123(3).", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(40), "");
    L.push("(Petitioner signs and dates this petition. Nothing on this page is signed or dated for Petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}    EMAIL: ${email}`, "");
    L.push("DECLARATION. Petitioner states that the matters set out above are true and correct to the best of Petitioner's knowledge, information and belief.");
  } else if (componentId === "ms-diversion-proposed-order-2") {
    L.push("USE THIS PAGE ONLY ON THE PRETRIAL INTERVENTION BRANCH.", "");
    CAPTION(L);
    L.push("ORDER OF EXPUNGEMENT", "");
    L.push("THIS DOCUMENT IS A PROPOSED ORDER. It is unexecuted. It records no finding this Court has made and nothing in it asserts that the Court has acted.", "");
    L.push(`THIS CAUSE came before the Court on the Petition of ${name} under Miss. Code Ann. Sec. 99-15-123(3).`, "");
    L.push("The Court FINDS (findings to be made by the Court):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("IT IS THEREFORE ORDERED AND ADJUDGED that the record of the case identified in the Petition be, and it is hereby, EXPUNGED under Miss. Code Ann. Sec. 99-15-123(3).", "");
    L.push("SO ORDERED AND ADJUDGED this " + DOTS(12) + " day of " + DOTS(20) + ", 20" + DOTS(4) + ".", "");
    L.push("" + DOTS(50));
    L.push("JUDGE", "");
    L.push("APPROVED AS TO FORM:", "");
    L.push("" + DOTS(50));
    L.push("Prosecuting authority", "");
    L.push("(The findings, the date of entry, the judge's signature and the prosecuting authority's approval as to form are all left blank.)");
  } else if (componentId === "ms-diversion-certificate-of-service-3") {
    L.push("USE THIS PAGE ONLY ON THE PRETRIAL INTERVENTION BRANCH. Nothing is served on the intervention court branch.", "");
    CAPTION(L);
    L.push("CERTIFICATE OF SERVICE", "");
    L.push("Neither Sec. 99-15-123 nor Sec. 9-23-23 prescribes notice, an objection period or a hearing for this relief. On the petition branch the prosecuting authority receives a copy as ordinary practice, and this certificate evidences it.", "");
    L.push(`I, ${name}, certify that I have this day served a true and correct copy of the Petition to Expunge After Pretrial Intervention on the prosecuting authority, by United States mail, postage prepaid, or by hand delivery, addressed as follows:`, "");
    L.push("Prosecuting authority - name and office:");
    L.push(DOTS(), "");
    L.push("Address served:");
    L.push(DOTS(), "");
    L.push("Manner of service (United States mail or hand delivery): " + DOTS(30), "");
    L.push("Date served: " + DOTS(30), "");
    L.push("" + DOTS(50));
    L.push(`${name}, Petitioner`);
    L.push("Date: " + DOTS(30), "");
    L.push("(Service dates are written when service is actually made. No prosecutor's name or address is printed here: the platform holds none and does not guess one.)");
  } else if (componentId === "ms-diversion-attachment-4") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Get these first, whichever branch you are on. On the intervention court branch they may be the ONLY thing you need.", "");
    L.push("1. CERTIFIED COPY OF THE PROGRAMME COMPLETION ORDER - from the clerk of the administering court. It records that you completed the programme successfully. On the intervention court branch, successful completion is the whole trigger, so this document is the evidence of your relief.", "");
    L.push("2. CERTIFIED COPY OF THE FINAL DISPOSITION, AND OF ANY DISMISSAL OR EXPUNGEMENT ORDER ALREADY ENTERED - from the clerk of the administering court. ASK THE CLERK WHAT THE FINAL DISPOSITION WAS AND WHETHER ANY ORDER HAS ALREADY BEEN ENTERED. Many people already have relief and simply do not hold a copy of it. Finding that out first can end the matter here.", "");
    L.push("3. YOUR MISSISSIPPI CRIMINAL HISTORY RECORD - from the Mississippi Criminal Information Center. It shows what the state's record actually says about this case now, which is the thing you are trying to fix.", "");
    L.push("COMPLETED, NOT TERMINATED. Both branches turn on SUCCESSFUL completion. If the programme was terminated rather than completed, the Sec. 99-15-115 waiver is void and prosecution resumes. That is a stop condition, not a paperwork problem.");
  } else if (componentId === "ms-diversion-process-guidance-6") {
    L.push(`Prepared for: ${name}`, "");
    L.push("IF YOU COMPLETED AN INTERVENTION COURT UNDER MISS. CODE ANN. SEC. 9-23-23, THERE IS NOTHING TO FILE. That is not this packet being unhelpful. It is what the statute says, and filing a petition you do not need can cost you money and time for no benefit.", "");
    L.push("WHAT SEC. 9-23-23 ACTUALLY SAYS. 'If the participant completes all requirements imposed upon him by the intervention court, including the payment of fines and fees assessed and not waived by the court, the charge and prosecution shall be dismissed. If the defendant or participant was sentenced at the time of entry of plea of guilty, the successful completion of the intervention court order and other requirements of probation or suspension of sentence will result in the record of the criminal conviction or adjudication being expunged. However, no expunction of any implied consent violation shall be allowed.'", "");
    L.push("WHY THAT MEANS NO PETITION. Section 9-23-23 contains no petition language, no application requirement, no fee, no hearing, no notice and no waiting period. Every other Mississippi record-clearing provision that requires you to ask - Secs. 99-19-71, 99-15-26(5), 99-15-123(3), 41-29-150(d)(2) and 63-11-30(13) - says so expressly. This one does not. The relief follows completion by operation of the statute.", "");
    L.push("SO WHAT DO YOU ACTUALLY DO?", "");
    L.push("STEP ONE. Ask the clerk of the administering court for a CERTIFIED COPY of the order recording your successful completion, and for a certified copy of the final disposition and of any dismissal or expungement order already entered.", "");
    L.push("STEP TWO. Read what the clerk gives you. If an order has already been entered, you have your relief; keep the certified copy, because that document is what you show anyone who asks.", "");
    L.push("STEP THREE. Get your Mississippi criminal history record from the Mississippi Criminal Information Center and check that it matches. The statute operating in your favour and the state's record actually reflecting it are two different things.", "");
    L.push("STEP FOUR. If the record does not reflect the relief and the clerk cannot confirm what was entered, STOP AND GET HELP. That is a stop condition on this route, not something to solve by filing a petition under a section that does not require one.", "");
    L.push("THE ONE THING SEC. 9-23-23 WILL NOT DO. No expunction of any IMPLIED CONSENT VIOLATION is allowed. If your case involved one, this route is barred for it and it routes to the DUI track instead.", "");
    L.push("FINES AND FEES. Completion under Sec. 9-23-23 includes the payment of fines and fees assessed AND NOT WAIVED by the court. If the court waived them, they are not owed for this purpose. If it did not and they are unpaid, completion is not successful.", "");
    L.push("AND IF YOU WERE ON PRETRIAL INTERVENTION INSTEAD. Then you are on the other branch, and a petition IS required: Sec. 99-15-123(3) says 'Upon petition therefor'. The court's duty is mandatory once you petition, but no order enters until you do. Use the petition, proposed order and certificate of service in this packet.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("FIRST, WORK OUT WHICH BRANCH YOU ARE ON. The two look similar and the law treats them completely differently.", "");
    L.push("PRETRIAL INTERVENTION under Sec. 99-15-123 - a district attorney's pretrial intervention programme. A PETITION IS REQUIRED. Subsection (3) says 'Upon petition therefor, the court shall expunge'. The court's duty is mandatory once you ask, but no order enters until you do. Use the petition, the proposed order and the certificate of service in this packet.", "");
    L.push("INTERVENTION COURT under Sec. 9-23-23 - a drug court or other intervention court. NOTHING IS FILED. The relief follows successful completion by operation of the statute. See the intervention court page in this packet.", "");
    L.push("IF YOU ARE NOT SURE WHICH ONE YOU COMPLETED, ask the clerk of the administering court before you file anything.", "");
    L.push("BEFORE EITHER BRANCH: FIND OUT WHAT HAS ALREADY HAPPENED. Ask the clerk what the final disposition was and whether any order dismissing or expunging the case has already been entered. Many people already have relief entered and simply do not hold a copy of it. If that is you, the matter may end there.", "");
    L.push("WHERE THE PETITION IS FILED, ON THE PRETRIAL INTERVENTION BRANCH. File the petition, the proposed order and the certificate of service with the CLERK OF THE COURT THAT MADE THE NONCRIMINAL DISPOSITION.", "");
    L.push("WHAT IT COSTS, AND WHAT IS ACTUALLY KNOWN.", "");
    L.push("The $150 filing fee you may have read about is levied by Miss. Code Ann. Sec. 99-19-72 on petitions to expunge an offense under Sec. 99-19-71. NEITHER SECTION IN THIS PACKET IS SEC. 99-19-71. The fee does not reach Sec. 99-15-123 or Sec. 9-23-23 by its terms, and neither of those sections specifies a fee of its own.", "");
    L.push("So no fee amount is established for this route in the records this packet is built from. ASK THE CLERK OF THE ADMINISTERING COURT what that court charges, before you file. Ask the same clerk about any waiver: none is established for either section either.", "");
    L.push("Separately, Sec. 9-23-23 requires that fines and fees assessed AND NOT WAIVED by the court have been paid for completion to count as successful. That is a condition of the relief, not a filing fee.", "");
    L.push("WHO YOU SERVE. Neither section prescribes notice, an objection period or a hearing for this relief. On the petition branch the prosecuting authority receives a copy as ordinary practice, by United States mail or hand delivery, evidenced by the certificate of service. NOTHING IS SERVED on the intervention court branch.", "");
    L.push("A DISMISSAL WITHOUT PREJUDICE IS NOT A CASE THAT CAN NEVER COME BACK. A noncriminal disposition under Sec. 99-15-103 is a dismissal of the charge WITHOUT PREJUDICE to reinstatement on the district attorney's motion. Know that before you rely on it.", "");
    L.push("DO NOT PLEAD AN ACQUITTAL HERE. Section 99-15-123(3) reaches a case where an arrest was made, the person was released, and the case was dismissed, or the charges were dropped, or there was no disposition. It does NOT contain the 'found not guilty at trial' limb that Sec. 99-19-71(4) contains. Copy your docket wording rather than characterising it.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD.");
    L.push("- The programme was TERMINATED rather than completed. That voids the Sec. 99-15-115 waiver and prosecution resumes.");
    L.push("- The completion order is missing and the clerk cannot confirm what was entered.");
    L.push("- It is unclear whether an intervention court expungement already occurred.");
    L.push("- The case involved an IMPLIED CONSENT VIOLATION, which Sec. 9-23-23 bars from expunction and which routes to the DUI track.");
    L.push("- You are not a United States citizen.", "");
    L.push("Where self-help stops, the clerk of the administering court answers what was entered and what that court charges, and the Mississippi Criminal Information Center issues the criminal history record that shows what the state's record says now.");
  }
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

const CAPTION_BLANKS = (componentId, rbf) => {
  rbf("caption_court", "Court named in the caption - the court that made the noncriminal disposition",
    "the court that made the noncriminal disposition of your charge, from the disposition record",
    "which court made the disposition is a case fact the platform has not seen");
  rbf("caption_county", "County named in the caption",
    "the Mississippi county of that court",
    "the county of the disposition is a case fact the platform has not seen");
  rbf("caption_petitioner", "Petitioner name line in the STATE OF MISSISSIPPI VS. caption",
    "your name as the record states it in the criminal cause, which may differ from the name you use now",
    "the name as captioned in the criminal cause is a record fact the platform has not seen");
  rbf("caption_cause_number", "Cause number in the caption",
    "the cause number of the case, copied from the disposition record, or the new number the court assigns",
    "no cause number is held for a record the platform has not seen");
};

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));
  const court = (id, label, why) => refusals.push(mapCourtOwned(componentId, id, label, why));

  if (componentId === "ms-diversion-primary-filing-1") {
    w("petitioner_name", "Petitioner named in the body of the petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth in the identifying block", "participant.date_of_birth");
    w("mailing_address", "Mailing address in the identifying block", "participant.street_address");
    w("telephone", "Telephone number in the identifying block", "participant.phone");
    w("email", "Email address in the identifying block", "participant.email");
    CAPTION_BLANKS(componentId, rbf);
    rbf("charges", "Charge or charges as the record states them",
      "the charge or charges, worded exactly as the record states them",
      "no charge fact is held for a record the platform has not seen");
    rbf("arrest_date", "Date of arrest", "the date of arrest, from the record", "no arrest-date fact is held for a record the platform has not seen");
    rbf("arresting_agency", "Arresting agency",
      "the arresting agency named in your record - this is a case fact from the record you already hold, not a protected court field",
      "the arresting agency is a case fact the platform has not seen");
    rbf("programme_completion_date", "Date the pretrial intervention programme was successfully completed",
      "the date you successfully completed the pretrial intervention programme, from the certified completion order",
      "no completion fact is held for a record the platform has not seen");
    rbf("disposition_wording", "Date of the noncriminal disposition, and how the record words it",
      "the date of the noncriminal disposition and the record's own wording of it, copied rather than characterised",
      "no disposition fact is held for a record the platform has not seen");
    rbf("statutory_limb", "Which limb of Sec. 99-15-123(3) applies, in the docket's own wording",
      "the docket wording showing that an arrest was made and you were released and the case was dismissed, or the charges were dropped, or there was no disposition - copied, not characterised, and never pleaded as an acquittal",
      "which limb applies is read from docket wording the platform has not seen, and the committed record directs failing closed where the entry is ambiguous rather than characterising it");
    rbf("prior_order_answer", "Whether any order dismissing or expunging this case has already been entered",
      "what the clerk told you when you asked whether any order dismissing or expunging this case has already been entered",
      "whether relief has already been entered is a court-record fact the platform has not seen, and the committed record makes asking a required action because many people already have relief and do not hold a copy");
    prot("signature", "Signature of the petitioner on the petition", "the petition is the participant's own and is signed when actually filed");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is actually signed would be false");
  } else if (componentId === "ms-diversion-proposed-order-2") {
    w("petitioner_name", "Petitioner named in the body of the proposed order", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    court("order_findings", "The Court's findings paragraph", "the findings are the Court's to make");
    court("order_entry_date", "Date the order is entered", "the date of entry is the Court's");
    court("judge_signature", "Judge's signature on the proposed order", "only the judge signs the order");
    court("approved_as_to_form", "APPROVED AS TO FORM signature for the prosecuting authority", "the approval as to form is the prosecuting authority's, not the participant's");
  } else if (componentId === "ms-diversion-certificate-of-service-3") {
    w("certifying_petitioner_name", "Petitioner named as the person certifying service", "participant.full_legal_name");
    CAPTION_BLANKS(componentId, rbf);
    rbf("prosecutor_identity", "Name and office of the prosecuting authority served",
      "the name and office of the prosecuting authority for that court",
      "the platform holds no prosecuting-authority identity for any Mississippi court and does not guess one");
    rbf("prosecutor_address", "Address at which the prosecuting authority was served",
      "the address at which you served the prosecuting authority",
      "the platform holds no prosecuting-authority address and does not guess one");
    rbf("service_manner", "Manner of service - United States mail or hand delivery", "how you served the prosecuting authority", "how service was actually made is known only after it happens");
    rbf("service_date", "Date of service on the prosecuting authority", "the date you served the prosecuting authority", "the date of service is known only when service is actually made");
    prot("cos_signature", "Petitioner's signature on the certificate of service", "the certificate is the participant's own and is signed when service has actually been made");
    prot("cos_signature_date", "Date beside the petitioner's signature on the certificate of service", "a certificate of service dated before service happened would be false");
  } else if (componentId === "ms-diversion-attachment-4") {
    w("participant_name", "Person the document checklist is prepared for", "participant.full_legal_name");
  } else if (componentId === "ms-diversion-process-guidance-6") {
    w("participant_name", "Person the intervention court guidance is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the branch instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/MS.memo.json", track: "ms-diversion" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ms-diversion-set" },
    { record: "src/lib/rcap-engine/compiled/profiles/MS-mississippi.json", read: "packetGenerator.feeRules, searched for a fee answer for §§ 99-15-123 and 9-23-23 and holding none that addresses them" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Miss. Code Ann. § 99-15-123 — Pretrial intervention; noncriminal disposition and expungement (last amended Laws 2008 ch. 444 § 1)", url: "https://law.justia.com/codes/mississippi/title-99/chapter-15/in-general/section-99-15-123/", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 9-23-23 — Intervention court; completion, dismissal and expungement (amended by 2019 HB 1352 § 13)", url: "https://law.justia.com/codes/mississippi/title-9/chapter-23/section-9-23-23/", retrievedOn: "2026-07-30" },
    { title: "Miss. Code Ann. § 99-15-103 — Definitions, including noncriminal disposition", url: "https://law.justia.com/codes/mississippi/title-99/chapter-15/in-general/section-99-15-103/", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "No official form exists for a § 99-15-123(3) petition, and § 9-23-23 requires no document at all. Mississippi "
    + "has no statewide expungement form and neither section prescribes one. The MASTER_QUEUE row agrees: "
    + "officialFormFamily NONE, implementationStrategy custom_pleading, forms [], boundCount 0. The petition, "
    + "proposed order and certificate of service are marked CONDITIONAL on the pretrial intervention branch, "
    + "because building a filing for the intervention court branch would invent a requirement § 9-23-23 does not "
    + "impose.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "what, if anything, a Mississippi court charges to file a § 99-15-123(3) petition — § 99-19-72's fee does not reach that section and the section specifies none",
    "whether any fee-waiver route exists, which the committed record records as not established for either section",
    "whether relief has already been entered in a given participant's case, which the committed record makes a required participant enquiry of the clerk rather than an assumption",
    "whether a given docket entry falls within § 99-15-123(3) — the committed record directs failing closed and routing an ambiguous entry to advice rather than pleading a characterisation"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "Two route keys and two legally distinct branches, and the packet elects between them for nobody. The pretrial "
    + "intervention branch under § 99-15-123(3) is PETITION-BASED — 'Upon petition therefor' — so it carries a "
    + "petition, a proposed order and a certificate of service, each marked conditional on that branch. The "
    + "intervention court branch under § 9-23-23 requires NO petition, no application, no fee, no hearing, no notice "
    + "and no waiting period; its deliverable is the process-guidance component, which tells the participant there "
    + "is nothing to file and what to obtain instead. Which branch a participant is on is a record fact they "
    + "confirm with the clerk of the administering court, not an election this build makes, and no election control "
    + "is drawn."
};

const INSTRUCTIONS = {
  title: `What you must do — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Work out which branch you are on first. The two look similar and the law treats them completely differently.**",
    "",
    "- **Pretrial intervention, § 99-15-123** — a district attorney's programme. **A petition is required.** Subsection (3) says \"Upon petition therefor, the court shall expunge\": the court's duty is mandatory once you ask, but no order enters until you do.",
    "- **Intervention court, § 9-23-23** — a drug court or other intervention court. **Nothing is filed.** The relief follows successful completion by operation of the statute. That section contains no petition language, no application requirement, no fee, no hearing, no notice and no waiting period.",
    "",
    "If you are not sure which one you completed, **ask the clerk of the administering court before you file anything**.",
    "",
    "**Before either branch: find out what has already happened.** Ask the clerk what the final disposition was and whether any order dismissing or expunging the case has already been entered. Many people already have relief entered and simply do not hold a copy of it.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on records the platform has not seen."
  ],
  componentBlurbs: {
    "ms-diversion-primary-filing-1": "the § 99-15-123(3) petition — **pretrial intervention branch only**",
    "ms-diversion-proposed-order-2": "the proposed Order of Expungement — **pretrial intervention branch only**. It is unexecuted",
    "ms-diversion-certificate-of-service-3": "the certificate of service on the prosecuting authority — **pretrial intervention branch only**; nothing is served on the intervention court branch",
    "ms-diversion-attachment-4": "the three documents to obtain first, on either branch",
    "ms-diversion-instructions-5": "which branch you are on, where the petition is filed, what is actually known about the fee, and the dismissal-without-prejudice warning",
    "ms-diversion-process-guidance-6": "the intervention court branch — why nothing is filed, and what to do instead"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Certified copy of the programme completion order | Clerk of the administering court |",
    "| Certified copy of the final disposition, and of any dismissal or expungement order already entered | Clerk of the administering court |",
    "| Your Mississippi criminal history record | Mississippi Criminal Information Center |"
  ],
  stepsLines: [
    "1. **Ask the clerk of the administering court which programme you completed** — a district attorney's pretrial intervention programme, or an intervention court — and **whether any order has already been entered**.",
    "2. **Get the certified copies** of the completion order and the final disposition.",
    "3. **If you are on the intervention court branch (§ 9-23-23): stop here and read the intervention court page.** There is nothing to file. Keep the certified copy, and check your criminal history record reflects the relief.",
    "4. **If you are on the pretrial intervention branch (§ 99-15-123): fill every dotted blank** on the petition and the certificate of service, copying the docket wording rather than characterising it.",
    "5. **Ask the clerk what that court charges.** No fee is established for either section in the records this packet is built from, and the $150 you may have read about is levied on § 99-19-71 petitions, which these are not.",
    "6. **File the petition, the proposed order and the certificate of service** with the clerk of the court that made the noncriminal disposition, and serve the prosecuting authority a copy.",
    "7. **Check your Mississippi criminal history record afterwards** to confirm the state's record now reflects the relief."
  ],
  blanksLines: [
    "- **Your signature and the dates beside it**, on the petition and the certificate of service.",
    "- **The court's findings, the date of entry, the judge's signature** and **the prosecuting authority's APPROVED AS TO FORM signature** on the proposed order.",
    "- **The prosecuting authority's name and address.** The platform holds none and does not guess.",
    "- **Which limb of § 99-15-123(3) applies.** Copy your docket's own wording. Do not characterise it, and **do not plead an acquittal** — § 99-15-123(3) does not contain the \"found not guilty at trial\" limb that § 99-19-71(4) contains. If the entry is ambiguous, that routes to advice rather than to a pleaded allegation.",
    "- **What the clerk told you about any order already entered.**"
  ],
  stopsLines: [
    "- the programme was **terminated rather than completed** — that voids the § 99-15-115 waiver and prosecution resumes;",
    "- the completion order is missing and the clerk cannot confirm what was entered;",
    "- it is unclear whether an intervention court expungement already occurred;",
    "- the case involved an **implied consent violation**, which § 9-23-23 bars from expunction and which routes to the DUI track;",
    "- you are not a United States citizen.",
    "",
    "Where self-help stops, the clerk of the administering court answers what was entered and what that court charges, and the Mississippi Criminal Information Center issues the criminal history record that shows what the state's record says now."
  ],
  notLines: [
    "This is a prepared petition, a proposed order, a certificate of service and their process pages, of which **only some apply to you** depending on your branch. It is not legal advice, and it is not filed or served for you.",
    "",
    "**A noncriminal disposition under § 99-15-103 is a dismissal without prejudice to reinstatement on the district attorney's motion.** It is not a case that can never come back, and you should know that before you rely on it."
  ]
};

const FINDINGS = [
  {
    finding:
      "The committed record obtained the complete text of both provisions and established that they are legally "
      + "distinct rather than one route: § 99-15-123(3) is petition-based ('Upon petition therefor'), while "
      + "§ 9-23-23 contains no petition language, no application requirement, no fee, no hearing, no notice and no "
      + "waiting period, and is described as the most self-executing expungement language in the Mississippi scheme.",
    consequence:
      "The petition, proposed order and certificate of service are marked CONDITIONAL on the pretrial intervention "
      + "branch, and the intervention court branch is carried by a process-guidance component whose whole content is "
      + "that nothing is filed and what to obtain instead. Building a filing for the § 9-23-23 branch would have "
      + "invented a requirement the statute does not impose and cost the participant a fee and a filing for nothing."
  },
  {
    finding:
      "The compiled Mississippi profile's only fee line is keyed to § 99-19-71. The committed record establishes "
      + "that § 99-19-72's fee does not reach § 99-15-123 or § 9-23-23 by its terms and that neither section "
      + "specifies a fee of its own.",
    consequence:
      "The $150 is not printed as this route's answer. The packet names the figure only to exclude it — because a "
      + "participant who has read about it elsewhere needs to know it is not theirs to pay — and names the clerk of "
      + "the administering court as the authority who answers what that court actually charges. The separate "
      + "§ 9-23-23 condition that fines and fees assessed and not waived must have been paid is stated as a "
      + "condition of the relief rather than as a filing fee."
  },
  {
    finding:
      "Section 99-15-123(3) OMITS the 'found not guilty at trial' limb that § 99-19-71(4) contains, and the "
      + "committed record directs failing closed where a docket entry such as 'passed to the file' or 'retired to "
      + "the file' is ambiguous, routing it to advice rather than to a pleaded allegation.",
    consequence:
      "The petition asks the participant to copy the docket wording rather than characterise it, says in terms not "
      + "to plead an acquittal on this section, and the ambiguity is disclosed in the instructions as something "
      + "that routes to advice. The two sections' texts are not treated as interchangeable anywhere in the packet."
  },
  {
    finding:
      "A noncriminal disposition under § 99-15-103 is a dismissal of the charge WITHOUT PREJUDICE to reinstatement "
      + "on the district attorney's motion, and § 9-23-23 expressly bars expunction of any implied consent "
      + "violation.",
    consequence:
      "The without-prejudice character is printed in the instructions and repeated in the closing section, so a "
      + "participant does not over-rely on the disposition. The implied-consent bar is a named stop condition "
      + "routing to the DUI track, and is stated on the intervention court page where the statutory text carrying "
      + "it is quoted."
  },
  {
    finding:
      "The committed record makes asking the clerk whether relief has already been entered a required participant "
      + "action, noting that many people have relief already entered and simply do not hold a copy.",
    consequence:
      "That enquiry is placed first in the instructions, first in the document checklist, given its own allegation "
      + "on the petition, and made a stop condition where the clerk cannot confirm what was entered. A participant "
      + "who already has their relief is told how to find that out before spending a filing on it."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the branch split is right: that § 9-23-23 requires no petition and that supplying one would be wrong, and that the packet is correct to ship the § 99-15-123(3) petition as conditional rather than as the family's unconditional primary filing.",
    "Confirm the fee treatment — naming the $150 only to exclude it, on the ground that § 99-19-72 does not reach these sections — reads correctly to a participant, and that no Mississippi court charges a generally applicable fee for a § 99-15-123(3) petition that the record simply does not carry.",
    "Confirm the packet is right to instruct copying the docket wording rather than characterising the limb, and that the 'passed to the file' / 'retired to the file' ambiguity is correctly routed to advice rather than pleaded either way.",
    "Confirm the dismissal-without-prejudice warning under § 99-15-103 is at the right strength, given that the participant is being told their relief is real while also being told the case can be reinstated on the district attorney's motion.",
    "Confirm that the intervention court page's instruction to keep the certified completion order as the operative document is sufficient, where the statute operates automatically but the state's record may not reflect it."
  ],
  mattersForTheReviewersAttention: [
    "Three of the six components are conditional on one branch, and each says so on its own first line as well as in the field map's componentConditions, so a participant on the § 9-23-23 branch cannot mistake the petition for something they must file.",
    "The intervention court page quotes § 9-23-23 in full rather than summarising it, because the whole deliverable on that branch is the participant being able to see that the statute imposes no filing.",
    "The arresting agency is mapped as a participant case fact, not as a protected court field.",
    "The enquiry about relief already entered appears in four places, because a participant who files a petition for relief they already hold has spent a filing for nothing."
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

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
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
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
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
