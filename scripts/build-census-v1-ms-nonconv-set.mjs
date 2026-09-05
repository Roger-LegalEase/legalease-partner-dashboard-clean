#!/usr/bin/env node
/**
 * The Mississippi non-conviction expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-nonconv-set.mjs [--check]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   ms-nonconv   Miss. Code Ann. § 99-19-71(4), expungement of the record of a
 *                case in which an arrest was made, the person was released and
 *                the case was dismissed or the charges were dropped or there
 *                was no disposition, or the person was found not guilty at trial
 *
 * WHY EVERY PAGE IS COMPOSED
 *
 * Mississippi has no statewide expungement form. The MASTER_QUEUE row binds no
 * source (officialFormFamily NONE, sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT)
 * and the family's own legal-design record — data/record-clearing/legal-design-intake/
 * MS.memo.json, track ms-nonconv — resolves the strategy to custom_pleading. The
 * petition quotes § 99-19-71(4) directly, including the mandatory 'shall
 * expunge', which is safe because it is the statute rather than a
 * characterization; the disposition is pleaded in the statute's own four
 * categories and ONLY the one that is true is pleaded, which is why the four
 * categories are the participant's own marks and never a platform selection.
 * No 'with prejudice' qualifier is added unless the participant's own order
 * says so, because the Fourth District model's qualifier is narrower than the
 * statute requires.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform writes only the participant's own identity and contact facts.
 * Every case fact is a labelled dotted blank declared REQUIRED_BEFORE_FILING
 * and disclosed in participant-instructions.md with the records office of the
 * court that heard the case named as the checkable authority. No signature,
 * no judicial, prosecutor or clerk field is ever written, and no fee amount is
 * published: whether § 99-19-72's fee reaches a subsection (4) petition at all
 * is a recorded open question.
 */
import {
  mapHelpers, composedMapOf, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "ms-nonconv-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: ["obligation:track-pathway:MS:ms-nonconv:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal"],
  legalName: "Non-Conviction Expungement, Miss. Code Ann. § 99-19-71(4)",
  routeName: "expunging the record of a Mississippi case that did not end in a conviction, under Miss. Code Ann. § 99-19-71(4)",
  statutes: ["Miss. Code Ann. § 99-19-71(4)", "Miss. Code Ann. § 99-19-71(3)", "Miss. Code Ann. § 99-19-72"]
});

const COMPONENTS = [
  { id: "primary_filing", role: "primary_filing", title: "Petition for Expungement of Criminal Record Under Miss. Code Ann. Sec. 99-19-71(4)" },
  { id: "proposed_order", role: "proposed_order", title: "Proposed Order of Expungement" },
  { id: "certificate_of_service", role: "certificate_of_service", title: "Certificate of Service" },
  { id: "attachment", role: "attachment", title: "Exhibit Checklist" },
  { id: "instructions", role: "instructions", title: "Filing Instructions" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Latoya Renee Jefferson",
    "participant.date_of_birth": "1988-02-21",
    "participant.street_address": "907 Magnolia Row, Jackson, MS 39202",
    "participant.phone": "601-555-0163",
    "participant.email": "latoya.jefferson@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Bartholomew-Emmanuel de la Cruz-Featherstone",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "15522 Lower Delta Bottomland Access Road, Building 7, Unit 41-B, Greenwood, Mississippi 38930-6604",
    "participant.phone": "(769) 555-0102 ext. 8846",
    "participant.email": "bartholomew.emmanuel.de.la.cruz.featherstone@longmailexample.org"
  }
};

/* ---- composed bodies ------------------------------------------------------------ *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/MS.memo.json, track ms-nonconv
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json, ms-nonconv-set
 */
function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const component = COMPONENTS.find((c) => c.id === componentId);
  const L = [];
  L.push(component.title.toUpperCase(), "");
  const caption = (partyLine) => {
    L.push("IN THE .......................................... COURT OF .......................................... , MISSISSIPPI");
    L.push("(WRITE THE COURT IN WHICH THE CASE WAS PENDING - JUSTICE, COUNTY, CIRCUIT OR MUNICIPAL - AND ITS COUNTY, OR FOR A MUNICIPAL COURT ITS CITY)", "");
    L.push("STATE OF MISSISSIPPI");
    L.push("v.");
    L.push(`${name}, ${partyLine}`, "");
    L.push("Cause No. " + DOTS(44));
    L.push("(copy the cause number from the court record; where the court assigns a new number for the expungement it is supplied at filing)", "");
  };
  if (componentId === "primary_filing") {
    caption("PETITIONER");
    L.push("PETITION FOR EXPUNGEMENT OF CRIMINAL RECORD UNDER MISS. CODE ANN. Sec. 99-19-71(4)", "");
    L.push(`The petitioner, ${name}, petitions this Court for an order expunging the record of the case described below, and states:`, "");
    L.push("FIRST. Miss. Code Ann. Sec. 99-19-71(4) provides: 'Upon petition therefor, a justice, county, circuit or municipal court shall expunge the record of any case in which an arrest was made, the person arrested was released and the case was dismissed or the charges were dropped or there was no disposition of such case, or the person was found not guilty at trial.'", "");
    L.push("SECOND. The identifying facts of the case, each taken from the court record:", "");
    L.push(`Petitioner's date of birth: ${dob}`, "");
    L.push("What the petitioner was charged with, worded as the court record words it, with the Mississippi Code section where the record states one:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Date of the offence alleged:");
    L.push(DOTS(), "");
    L.push("Date of arrest or citation:");
    L.push(DOTS(), "");
    L.push("Agency that made the arrest or issued the citation:");
    L.push(DOTS(), "");
    L.push("That agency's own case or citation number, where the record states one:");
    L.push(DOTS(), "");
    L.push("Date on which the case ended, from the record:");
    L.push(DOTS(), "");
    L.push("THIRD. The case ended without a conviction, in the statutory category marked below. Mark EXACTLY ONE, and only the one your own court paperwork shows; nothing is marked for you, and an entry such as 'passed to the file' or 'retired to the file' is a reason to stop and get advice rather than to mark any box:", "");
    L.push("[  ]  An arrest was made, the petitioner was released, and the case was dismissed.");
    L.push("[  ]  The charges were dropped.");
    L.push("[  ]  There was no disposition of the case.");
    L.push("[  ]  The petitioner was found not guilty at trial.", "");
    L.push("FOURTH. Where a grand jury returned an indictment in the case, and only then, its date and court are stated here from the record (leave blank where the case was never indicted; most are not):");
    L.push(DOTS(), "");
    L.push("FIFTH. Subsection (4) imposes no waiting period, no completion requirement and no first-offender requirement, and none is asserted here. The one-felony-per-lifetime cap of subsection (2)(a) applies to felony conviction expungement only and is not spent by this petition.", "");
    L.push("SIXTH. The petitioner therefore requests that the Court enter an order expunging the record of the case described above, as Sec. 99-19-71(4) directs, with a nonpublic record retained by the Mississippi Criminal Information Center solely for the purpose Sec. 99-19-71(3) states.", "");
    L.push("I declare that the facts stated in this petition are true and correct.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(36), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "proposed_order") {
    caption("PETITIONER");
    L.push("PROPOSED ORDER OF EXPUNGEMENT", "");
    L.push("(This order is tendered with the petition for the Court's consideration, which is Mississippi practice. Every finding below is a proposal for the Court to make; nothing in it is an assertion of fact by the preparer, and nothing on this page is completed for the Court.)", "");
    L.push(`THIS CAUSE came before the Court on the petition of ${name} for expungement of the record of a case under Miss. Code Ann. Sec. 99-19-71(4), and the Court, having considered the petition, would find that the case falls within Sec. 99-19-71(4): an arrest was made, the person arrested was released, and the case was dismissed or the charges were dropped or there was no disposition of the case, or the person was found not guilty at trial.`, "");
    L.push("IT IS THEREFORE ORDERED that the record of the case described in the petition is expunged, and that every person and agency keeping an official record of the arrest or the case shall expunge it, including the following, each named by the petitioner from the case record:", "");
    L.push("Agency that made the arrest or issued the citation, as the order must direct it:");
    L.push(DOTS(), "");
    L.push("Sheriff's department of the county, where its records carry the case:");
    L.push(DOTS(), "");
    L.push("Any other person or agency keeping an official record of the case:");
    L.push(DOTS(), "");
    L.push("PROVIDED that the existing records of fingerprints are excepted from this order, as Miss. Code Ann. Sec. 99-19-71 provides; that the Mississippi Criminal Information Center shall retain a nonpublic record solely for the purpose of determining, in subsequent proceedings, whether the person is a first offender; and that upon entry of this order the petitioner is restored, in contemplation of law, to the status the petitioner occupied before the arrest, and shall not be held thereafter guilty of perjury for failure to recite the arrest, except as Sec. 99-19-71(3) provides for first-offender determinations.", "");
    /* The machine trailer closes the preparer's half of the order here, above
     * the execution and approval band, instead of printing after it. It used to
     * be the last ink on the order's second page, below "JUDICIAL OFFICER OF THE
     * COURT", below "(the Court alone completes, signs and enters this order)" and
     * below "APPROVED AS TO FORM, for the prosecuting authority:" -- machine text
     * inside a band the page itself assigns to the Court. Placement only: the line
     * is the same line, and no word of the decretal block, the findings, the entry
     * date or either signature block is touched. FIX35 made the same move on the
     * Rhode Island host. */
    L.push(`Route: ${ROUTE.routeKeys[0]}`, "");
    L.push("SO ORDERED.", "");
    L.push("ENTERED, this the " + DOTS(12) + " day of " + DOTS(20) + ", " + DOTS(8), "");
    L.push("JUDICIAL OFFICER OF THE COURT " + DOTS(44));
    L.push("(the Court alone completes, signs and enters this order)", "");
    L.push("APPROVED AS TO FORM, for the prosecuting authority:");
    L.push(DOTS());
    L.push("(some districts expect the prosecuting authority to approve the order as to form before it is presented; this block is never completed by the preparer and is never pre-signed)");
  } else if (componentId === "certificate_of_service") {
    caption("PETITIONER");
    L.push("CERTIFICATE OF SERVICE", "");
    L.push(`I, ${name}, certify that a true and correct copy of the Petition for Expungement of Criminal Record and of the proposed Order of Expungement in this cause was delivered to the prosecuting authority named below, contemporaneously with the filing of the petition:`, "");
    L.push("Prosecuting authority served - for a circuit court case the district attorney for the circuit district, for a county, justice or municipal court case the county or municipal prosecuting attorney (write the office as the court record names it):");
    L.push(DOTS(), "");
    L.push("Mailing address at which that office was served:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Manner of delivery (mark the one used):");
    L.push("[  ]  By United States mail");
    L.push("[  ]  By hand delivery", "");
    L.push("DATE OF DELIVERY OF THE COPY " + DOTS(48), "");
    L.push("SIGNATURE OF PETITIONER " + DOTS(52), "");
    L.push("(This page is completed and signed by the petitioner when the copy actually goes out. A date or a signature written before the copy goes out would be false.)");
  } else if (componentId === "attachment") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Attach these exhibits to the petition. Each is named here and obtained by you; nothing is obtained, inspected or authenticated for you.", "");
    L.push("EXHIBIT A - IN EVERY CASE. A certified copy of the disposition or sentencing order showing how the case ended, from the records office of the court that heard the case. Mississippi has no central portal and each court holds its own file, so identify the right court first.", "");
    L.push("EXHIBIT B - ONLY WHERE THE CASE WAS INDICTED. A copy of the indictment, from the circuit records office of the county. Attach it only if a grand jury actually returned an indictment; most cases are never indicted, and the petition pleads an indictment only where one exists.", "");
    L.push("ADVISABLE:", "");
    L.push("- The docket sheet for the case, from the records office of the court that heard the case. It shows exactly how the case ended, and its wording matters: 'passed to the file' or 'retired to the file' is a reason to stop and get advice.");
    L.push("- Your own Mississippi criminal history record, from the Mississippi Criminal Information Center, so you can see every case on your record before you file.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("STEP ONE. Identify the correct court and county first. Mississippi has four trial court levels - justice, county, circuit and municipal - and the petition goes to the court in which the case was pending.");
    L.push("STEP TWO. Ask that court's records office for the case file, the docket sheet, and a certified copy of the order showing how the case ended. Copy the docket wording exactly; do not paraphrase it.");
    L.push("STEP THREE. Call that records office before filing and ask whether that court has its own preferred petition or order form or any additional requirement. Mississippi has no statewide form and practice varies by county and circuit district.");
    L.push("STEP FOUR. Fill in every dotted blank this packet's participant instructions list, from the records, and mark exactly one statutory disposition category - only the one your paperwork shows.");
    L.push("STEP FIVE. Sign and date the petition yourself.");
    L.push("STEP SIX. File the petition, with the proposed order and the certificate of service, with the court in which the case was pending, and confirm the filing fee first. No fee amount is published in this packet: whether Sec. 99-19-72's fee reaches a subsection (4) petition at all is a recorded open question - there is no conviction to expunge - and county practice differs, so ask the court's records office for the amount, and for any pauper's-affidavit route if you cannot pay.");
    L.push("STEP SEVEN. Deliver a copy of the petition and the proposed order to the prosecuting authority contemporaneously with filing - for a municipal court case the city prosecutor, not the district attorney - and complete the certificate of service when the copy actually goes out. The ten days' written notice in Sec. 99-19-71(2)(b) belongs to the felony conviction subsection and is not imported here, but some districts expect notice and prosecutor approval as local practice.");
    L.push("STEP EIGHT. Expect that some districts want the district attorney to approve the order as to form before the judicial officer signs. That is a negotiation this packet does not conduct for you.");
    L.push("STEP NINE. After the order issues, obtain certified copies and deliver them to every agency named in the order.", "");
    L.push("WHAT THE ORDER DOES, FROM THE RECORD", "");
    L.push("- Relief under subsection (4) is mandatory on the statute's own words - 'shall expunge' - once the case falls in a statutory category.");
    L.push("- Fingerprint records are excepted from expungement.");
    L.push("- The Mississippi Criminal Information Center keeps a nonpublic record solely for first-offender determinations in subsequent proceedings.");
    L.push("- An employer may still ask whether an order of expunction has been entered.");
    L.push("- This petition does not spend the one-felony-per-lifetime cap, which belongs to felony conviction expungement under subsection (2)(a).", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- the disposition is ambiguous on the docket - particularly 'passed to the file', 'retired to the file', or a remand;");
    L.push("- the case moved between courts and it is unclear where it was pending;");
    L.push("- this was a nonadjudication, a pretrial intervention programme, or an intervention or drug court, which end differently and route differently;");
    L.push("- a charge arising from the same events is still pending;");
    L.push("- anyone charged with you has a case that is still open;");
    L.push("- the district attorney declines to approve the order as to form;");
    L.push("- you are not a United States citizen - a non-conviction disposition can still carry immigration consequences.", "");
    L.push("WHAT THIS PACKET DOES NOT TELL YOU", "");
    L.push("- The filing fee amount, and whether Sec. 99-19-72's fee reaches a subsection (4) petition in this court. The records office of the court that heard the case is the authority that can answer both.");
    L.push("- Whether your court requires verification or notarization of the petition. Neither archived model is verified or notarized and the question is unresolved, so the petition carries a simple truth statement; the same office can say whether that court expects more.");
    L.push("- Your court's own preferred forms or local requirements, which vary by county and district. Ask before you file.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared set of composed pleadings and process pages. Mississippi publishes no statewide expungement form, which is why these pages are composed. It is not legal advice, it is not filed for you, and it does not decide the classification of an ambiguous docket entry.");
  }
  if (componentId !== "proposed_order") L.push("", `Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

/* ---- the field maps -------------------------------------------------------------- */
function maps() {
  const out = [];
  {
    const h = mapHelpers("primary_filing");
    const writes = [
      h.write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
      h.write("date_of_birth", "Petitioner's date of birth, printed in the petition's identifying block", "participant.date_of_birth"),
      h.write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      h.write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      h.write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    ];
    const refusals = [
      h.rbf("pending_court", "Court in which the case was pending, named in the caption with its county or city",
        "which court the case was pending in - justice, county, circuit or municipal - and its county, or for a municipal court its city; the records office of that court can confirm both",
        "the court the case was pending in is a case fact the participant establishes from the record"),
      h.rbf("cause_number", "Cause number of the case, copied from the court record",
        "the cause or case number, checked against the certified copy of the disposition order - correct the packet if they disagree; where the court assigns a new number for the expungement it is supplied at filing",
        "no case identifier is held for this record"),
      h.rbf("charge_description", "What the petitioner was charged with, worded as the court record words it",
        "the charge, worded exactly as the court record words it, with the Mississippi Code section where the record states one",
        "no charge fact is held for this record"),
      h.rbf("offense_date", "Date of the offence alleged, from the record",
        "the date of the offence alleged, taken from the case papers",
        "no offence fact is held for this record"),
      h.rbf("arrest_date", "Date of arrest or citation, from the record",
        "the date of arrest or citation, taken from the case papers",
        "no arrest fact is held for this record"),
      h.rbf("arresting_agency", "Agency that made the arrest or issued the citation",
        "the name of the agency that arrested or cited you, taken from the case papers",
        "an agency name is a case fact the participant obtains from the record, not a field the court owns"),
      h.rbf("agency_case_number", "That agency's own case or citation number, where the record states one",
        "the arresting agency's case or citation number, copied from the record where one is stated",
        "no agency identifier is held for this record"),
      h.rbf("case_end_date", "Date on which the case ended, from the record",
        "the date the case ended, taken from the certified copy of the disposition order",
        "no disposition fact is held for this record"),
      h.rbf("indictment_statement", "Where a grand jury returned an indictment, its date and court, stated from the record",
        "the indictment's date and court, ONLY where a grand jury actually returned an indictment - leave the line blank where the case was never indicted; most are not",
        "the archived models plead an indictment in every case, which is wrong for most misdemeanours and for cases dismissed before indictment; the packet pleads one only where it exists"),
      h.electionBox("disposition_dismissed", "[  ] An arrest was made, the petitioner was released, and the case was dismissed. (statutory category, mark exactly one)",
        "which statutory ending is true belongs to the participant's own record; only the true one is pleaded and no qualifier such as 'with prejudice' is added unless the order itself says so"),
      h.electionBox("disposition_dropped", "[  ] The charges were dropped. (statutory category, mark exactly one)",
        "which statutory ending is true belongs to the participant's own record"),
      h.electionBox("disposition_none", "[  ] There was no disposition of the case. (statutory category, mark exactly one)",
        "which statutory ending is true belongs to the participant's own record; whether a case 'passed to the file' counts as no disposition is a recorded open question and routes to advice"),
      h.electionBox("disposition_not_guilty", "[  ] The petitioner was found not guilty at trial. (statutory category, mark exactly one)",
        "which statutory ending is true belongs to the participant's own record"),
      h.protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
        "the petitioner signs the petition personally"),
      h.protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
        "a date written before the petition is signed would be false")
    ];
    out.push(composedMapOf("primary_filing", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("proposed_order");
    const writes = [h.write("petitioner_name", "Petitioner named in the caption of this proposed order", "participant.full_legal_name")];
    const refusals = [
      h.rbf("order_court", "Court named in the caption of the proposed order, with its county or city",
        "the same court and county (or city) as the petition's caption",
        "the court the case was pending in is a case fact the participant establishes from the record"),
      h.rbf("order_cause_number", "Cause number in the caption of the proposed order",
        "the same cause number as the petition's caption",
        "no case identifier is held for this record"),
      h.rbf("order_arresting_agency", "Agency that made the arrest or issued the citation, as the order must direct it",
        "the arresting or citing agency's name, from the case papers, so the order reaches its records",
        "the agency list of the order is a set of fillable fields from the participant's own record, never hardcoded"),
      h.rbf("order_sheriff", "Sheriff's department of the county, where its records carry the case",
        "the county sheriff's department, where its records carry the case",
        "which county's records carry the case is a case fact from the participant's own record"),
      h.rbf("order_other_agencies", "Any other person or agency keeping an official record of the case, to be named in the order",
        "any other office the case papers show keeping an official record of the arrest or the case",
        "the agency list of the order is participant data from the record"),
      h.courtBlank("entry_date", "Entered, this the day of - the entry line of the order",
        "the Court alone dates and enters the order"),
      h.courtBlank("judicial_signature", "Judicial officer of the Court - the signing block of the order",
        "the order is the Court's; it is never completed, signed or entered by the preparer"),
      h.courtBlank("approved_as_to_form", "Approved as to form block for the prosecuting authority",
        "some districts expect the prosecuting authority to approve the order as to form; the block is never pre-signed or pre-filled")
    ];
    out.push(composedMapOf("proposed_order", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("certificate_of_service");
    const writes = [h.write("petitioner_name", "Petitioner named on the certificate of service", "participant.full_legal_name")];
    const refusals = [
      h.rbf("service_court", "Court named in the caption of the certificate of service, with its county or city",
        "the same court and county (or city) as the petition's caption",
        "the court the case was pending in is a case fact the participant establishes from the record"),
      h.rbf("service_cause_number", "Cause number in the caption of the certificate of service",
        "the same cause number as the petition's caption",
        "no case identifier is held for this record"),
      h.rbf("prosecuting_authority_name", "Prosecuting authority served, written as the court record names the office",
        "which prosecuting authority handled the case - the district attorney for the circuit district, or the county or municipal prosecuting attorney; for a municipal court case it is the city prosecutor, and the court's records office can confirm the office",
        "the prosecuting authority is participant data and is never defaulted; the archived model's fixed address is deliberately not reused"),
      h.rbf("prosecuting_authority_address", "Mailing address at which the prosecuting authority was served",
        "the mailing address of that office, confirmed with the court's records office before service",
        "no address for the prosecuting authority is held, and a guessed address on a certificate would be false"),
      h.electionBox("service_by_mail", "[  ] By United States mail (manner of delivery)",
        "the manner of delivery is the participant's own act and is marked when the copy actually goes out"),
      h.electionBox("service_by_hand", "[  ] By hand delivery (manner of delivery)",
        "the manner of delivery is the participant's own act and is marked when the copy actually goes out"),
      h.protectedBlank("service_date", "Date of delivery of the copy",
        "a date written before the copy actually goes out would be false"),
      h.protectedBlank("service_signature", "Signature of the petitioner on the certificate of service",
        "the petitioner signs the certificate when the copy actually goes out")
    ];
    out.push(composedMapOf("certificate_of_service", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("attachment");
    out.push(composedMapOf("attachment", FAMILY,
      [h.write("petitioner_name", "Participant named on the exhibit checklist", "participant.full_legal_name")], []));
  }
  {
    const h = mapHelpers("instructions");
    out.push(composedMapOf("instructions", FAMILY,
      [h.write("petitioner_name", "Participant named on the filing instructions", "participant.full_legal_name")], []));
  }
  return out;
}

/* ---- participant instructions ----------------------------------------------------- */
function participantInstructions(rbf) {
  const titles = Object.fromEntries(COMPONENTS.map((c) => [c.id, c.title]));
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Relief on this route is **mandatory on the statute's own words** — 'shall expunge' — once your case falls in one of the four statutory categories, and subsection (4) imposes no waiting period, no completion requirement and no first-offender requirement. Mississippi publishes no statewide form, so the pages here are composed pleadings, and districts maintain their own preferences: **call the records office of the court that heard the case before filing**.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact is a labelled dotted blank listed below, and you fill it from the record itself, never from memory. The four statutory disposition categories are marked by you alone — only the one your paperwork shows.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed petition under § 99-19-71(4), quoting the statute's own mandatory words |");
  out.push("| `proposed_order` | the proposed order tendered with the petition; the Court alone completes it |");
  out.push("| `certificate_of_service` | the record of delivery of a copy to the prosecuting authority, contemporaneous with filing |");
  out.push("| `attachment` | the exhibit checklist — the disposition order in every case, the indictment only where one exists |");
  out.push("| `instructions` | what you do, in order, and when to stop and get help |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Certified copy of the disposition or sentencing order showing how the case ended — check your cause number against it, and correct the packet if they disagree | the records office of the court that heard the case |");
  out.push("| Copy of the indictment — only where a grand jury actually returned one; check your answer about the indictment against it | the circuit records office of the county |");
  out.push("| Docket sheet for the case — copy its exact wording; 'passed to the file' or 'retired to the file' is a reason to stop and get advice | the records office of the court that heard the case |");
  out.push("| Your own Mississippi criminal history record — advisable, so you see every case before you file | Mississippi Criminal Information Center |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one from the records.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${titles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **The four statutory disposition marks.** Only you know how your case ended, only the true category is pleaded, and no 'with prejudice' qualifier is added unless your order itself says so.");
  out.push("- **Your signature and every date beside a signature.**");
  out.push("- **The finding paragraph's adoption, the entry line, and the judicial signing block of the proposed order.** The order is the Court's.");
  out.push("- **The APPROVED AS TO FORM block.** Some districts expect prosecutor sign-off; it is never pre-signed.");
  out.push("- **The certificate of service's date, manner marks and signature**, completed only when the copy actually goes out.");
  out.push("- **Any fee amount.** Whether § 99-19-72's fee reaches a subsection (4) petition at all is a recorded open question; the records office of the court that heard the case confirms the amount and any pauper's-affidavit route.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- the disposition is ambiguous on the docket — particularly 'passed to the file', 'retired to the file', or a remand;");
  out.push("- the case moved between courts and venue is unclear;");
  out.push("- this was a nonadjudication, a pretrial intervention programme, or an intervention or drug court;");
  out.push("- a charge arising from the same events is still pending;");
  out.push("- a co-defendant's case is still open;");
  out.push("- the district attorney declines to approve the order as to form;");
  out.push("- you are not a United States citizen.", "");

  out.push("## What this packet is not", "");
  out.push("A prepared set of composed pleadings and process pages, not an official form (Mississippi publishes none), not legal advice, not filed for you, and no classification of an ambiguous docket entry.", "");
  out.push(`_Route: ${ROUTE.routeKeys[0]}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-ms-nonconv-set.mjs",
  jurisdiction: "MS",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-nonconv, "
    + "reading the enrolled text of 2026 Miss. HB 1546) and the packet-set manifest "
    + "(data/record-clearing/legal-design-packet-set-manifests.json, ms-nonconv-set)",
  compositionSources: [
    "data/record-clearing/legal-design-intake/MS.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "Mississippi publishes no statewide expungement form; the MASTER_QUEUE row binds no source (officialFormFamily "
    + "NONE, sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT) and the legal-design record resolves the strategy to "
    + "custom_pleading with localFormOverride. The petition quotes § 99-19-71(4) directly, including the mandatory "
    + "'shall expunge', which is safe because it is the statute rather than a characterization.",
  routeSelectionNote:
    "The four statutory disposition categories of § 99-19-71(4) are rendered as the participant's own marks and "
    + "exactly one is marked, because which non-conviction ending is true lives on the participant's own record "
    + "and the route does not determine it — the route covers all four. No 'with prejudice' qualifier is added "
    + "unless the participant's own order says so, because the archived Fourth District model's qualifier is "
    + "narrower than the statute requires. The certificate's manner-of-delivery marks are the participant's own "
    + "act at service time.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that any case falls within Miss. Code Ann. § 99-19-71(4), particularly a case 'passed to the file' or 'retired to the file'",
    "the amount of any filing fee, or whether § 99-19-72's fee reaches a subsection (4) petition at all",
    "any district's local petition or order preference, which the participant confirms with the clerk"
  ],
  buildFindings: [
    {
      finding:
        "Section 99-19-71(4) is mandatory on its face — 'a justice, county, circuit or municipal court shall "
        + "expunge' — with no offence list, no waiting period, no completion requirement and no first-offender "
        + "requirement, and the one-felony-per-lifetime cap sits in subsection (2)(a) and is not spent here.",
      consequence:
        "The petition quotes the subsection verbatim and pleads the statutory category alone; the instructions "
        + "state the mandatory character and that the lifetime cap is not spent, both from the record."
    },
    {
      finding:
        "Which of the four statutory endings is true — dismissed after arrest and release, charges dropped, no "
        + "disposition, or not guilty at trial — lives on the participant's own record, and Mississippi dockets "
        + "carry ambiguous entries ('passed to the file', 'retired to the file') whose subsection (4) status is a "
        + "recorded open question.",
      consequence:
        "The four categories are the participant's own marks, exactly one is marked, an ambiguous entry is a "
        + "printed stop-and-get-help condition, and the participant copies the docket wording rather than "
        + "characterizing it. No 'with prejudice' qualifier is added unless the order itself says so."
    },
    {
      finding:
        "Whether Miss. Code Ann. § 99-19-72's $150 fee reaches a subsection (4) petition is a recorded open "
        + "question in both directions: a non-conviction petition is arguably not 'a petition to expunge an "
        + "offense', and the collection mechanism names the circuit clerk, which does not map onto justice or "
        + "municipal courts.",
      consequence:
        "The packet publishes no fee figure anywhere; the participant confirms the fee and any pauper's-affidavit "
        + "route with the records office of the court that heard the case, a named checkable authority."
    },
    {
      finding:
        "The ten days' written notice to the district attorney sits in § 99-19-71(2)(b), inside the felony "
        + "conviction subsection, and subsection (4) contains no notice provision; the archived models nonetheless "
        + "show districts expecting prosecutor approval as local practice.",
      consequence:
        "The felony notice rule is not imported. The certificate of service recites contemporaneous delivery to "
        + "the prosecuting authority, and the instructions tell the participant that some districts expect more, "
        + "with the clerk named to confirm local practice."
    },
    {
      finding:
        "The archived Fourth District models make the indictment allegation mandatory, which is wrong for most "
        + "misdemeanours and for cases dismissed before indictment.",
      consequence:
        "The petition pleads an indictment only where one exists, as a labelled blank the participant completes "
        + "from the record, and the exhibit checklist attaches the indictment only in that case."
    }
  ],
  counselQuestions: [
    "Does Miss. Code Ann. § 99-19-72's $150 fee, levied on 'each petition to expunge an offense under Section 99-19-71' and collected by the circuit clerk, reach a § 99-19-71(4) non-conviction petition, and does it reach a petition filed in justice or municipal court?",
    "Does a Mississippi case 'passed to the file' or 'retired to the file' fall within § 99-19-71(4)'s 'there was no disposition of such case'?",
    "Does the ten days' written notice to the district attorney in § 99-19-71(2)(b) apply outside the felony conviction subsection, and is contemporaneous service on the prosecuting authority the right treatment for subsection (4)?",
    "Whether any Mississippi district requires verification or notarization of an expungement petition, where neither archived model is verified or notarized and the petition carries a simple truth statement.",
    "Whether the composed petition, proposed order and certificate of service are sufficient in form for the least standardized courts (justice and municipal), given localFormOverride."
  ],
  reviewerAttention: [
    "The four statutory disposition categories are participant marks with a printed mark-exactly-one rule; confirm that presentation is legible on the paper and that an ambiguous docket entry visibly routes to advice.",
    "The petition quotes § 99-19-71(4) verbatim including 'shall expunge'; confirm the quotation treatment.",
    "No fee amount is published anywhere in the packet; every money question delegates to the records office of the court that heard the case by name."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
