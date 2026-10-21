#!/usr/bin/env node
/**
 * The Mississippi first-offender misdemeanour expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-misd-1st-set.mjs [--check]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   ms-misd-1st   Miss. Code Ann. § 99-19-71(1), first-offender nontraffic
 *                 misdemeanour conviction expungement
 *
 * WHY EVERY PAGE IS COMPOSED
 *
 * Mississippi has no statewide expungement form. The MASTER_QUEUE row binds no
 * source (officialFormFamily NONE, sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT)
 * and the family's own legal-design record — data/record-clearing/legal-design-intake/
 * MS.memo.json, track ms-misd-1st — resolves the strategy to custom_pleading:
 * a petition drafted to the statute, a proposed order tendered with it (which is
 * Mississippi practice), and a certificate of service on the prosecuting
 * authority. Every Mississippi track carries localFormOverride and a mandatory
 * clerk-contact instruction, because districts maintain their own petition and
 * order preferences.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the court, the county, the cause number, the charge, the
 * dates, the arresting agency, the disposition — is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING, disclosed by its printed label in
 * participant-instructions.md, with the clerk of the convicting court named as
 * the checkable authority. The first-offender and nontraffic assertions are the
 * participant's own, made by their own initials after checking their
 * Mississippi criminal history — never a platform certification. No signature,
 * no signature date, no judicial, prosecutor or clerk field is ever written,
 * and no fee amount is published: § 99-19-72's reach is a recorded open
 * question and the participant confirms the fee with the clerk.
 */
import {
  mapHelpers, composedMapOf, runComposedFamily, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "ms-misd-1st-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: ["obligation:track-pathway:MS:ms-misd-1st:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1"],
  legalName: "First-Offender Misdemeanor Conviction Expungement, Miss. Code Ann. § 99-19-71(1)",
  routeName: "expunging a first-offender Mississippi misdemeanour conviction that is not a traffic violation, under Miss. Code Ann. § 99-19-71(1)",
  statutes: ["Miss. Code Ann. § 99-19-71(1)", "Miss. Code Ann. § 99-19-71(3)", "Miss. Code Ann. § 99-19-72"]
});

const COMPONENTS = [
  { id: "primary_filing", role: "primary_filing", title: "Petition for Expungement of Criminal Record Under Miss. Code Ann. Sec. 99-19-71(1)" },
  { id: "proposed_order", role: "proposed_order", title: "Proposed Order of Expungement" },
  { id: "certificate_of_service", role: "certificate_of_service", title: "Certificate of Service" },
  { id: "attachment", role: "attachment", title: "Exhibit Checklist" },
  { id: "instructions", role: "instructions", title: "Filing Instructions" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Marcus Deshawn Whitfield",
    "participant.date_of_birth": "1993-06-08",
    "participant.street_address": "218 Pinehurst Avenue, Tupelo, MS 38801",
    "participant.phone": "662-555-0148",
    "participant.email": "marcus.whitfield@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Genevieve-Charlotte St. Pierre-Okonkwo",
    "participant.date_of_birth": "1959-12-31",
    "participant.street_address": "4471 Old Natchez Trace Parkway Extended, Apartment 22C, Hattiesburg, Mississippi 39402-8841",
    "participant.phone": "(228) 555-0177 ext. 3319",
    "participant.email": "genevieve.charlotte.st.pierre.okonkwo@longmailexample.org"
  }
};

/* ---- composed bodies ------------------------------------------------------------ *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/MS.memo.json, track ms-misd-1st
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json, ms-misd-1st-set
 * No service mechanic, no fee figure and no local rule is invented; where a
 * held record states none, the clerk of the convicting court is named instead.
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
    L.push("(WRITE THE COURT THAT ENTERED THE CONVICTION - JUSTICE, COUNTY, CIRCUIT OR MUNICIPAL - AND ITS COUNTY, OR FOR A MUNICIPAL COURT ITS CITY)", "");
    L.push("STATE OF MISSISSIPPI");
    L.push("v.");
    L.push(`${name}, ${partyLine}`, "");
    L.push("Cause No. " + DOTS(44));
    L.push("(copy the cause number from the court record; where the court assigns a new number for the expungement it is supplied at filing)", "");
  };
  if (componentId === "primary_filing") {
    caption("PETITIONER");
    L.push("PETITION FOR EXPUNGEMENT OF CRIMINAL RECORD UNDER MISS. CODE ANN. Sec. 99-19-71(1)", "");
    L.push(`The petitioner, ${name}, petitions this Court, as the court in which the conviction was had, for an order expunging the misdemeanour conviction described below from all public records, pursuant to Miss. Code Ann. Sec. 99-19-71(1), and states:`, "");
    L.push("FIRST. The identifying facts of the conviction, each taken from the court record:", "");
    L.push(`Petitioner's date of birth: ${dob}`, "");
    L.push("Offence of which the petitioner was convicted, worded as the court record words it, with the Mississippi Code section where the record states one:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Date of the offence:");
    L.push(DOTS(), "");
    L.push("Date of arrest or citation:");
    L.push(DOTS(), "");
    L.push("Agency that made the arrest or issued the citation:");
    L.push(DOTS(), "");
    L.push("That agency's own case or citation number, where the record states one:");
    L.push(DOTS(), "");
    L.push("Date of the conviction, from the judgment:");
    L.push(DOTS(), "");
    L.push("SECOND. The offence is a misdemeanour, and the judgment of this Court is the disposition of the case.", "");
    L.push("THIRD. The following two statements are the petitioner's own, made after the petitioner has reviewed the petitioner's own Mississippi criminal history record. Each is made by the petitioner's initials beside it, and nothing is initialled for the petitioner:", "");
    L.push("PETITIONER'S INITIALS " + DOTS(16) + "  The offence is not a traffic violation, and is not a DUI.");
    L.push("PETITIONER'S INITIALS " + DOTS(16) + "  I am a first offender. I have no conviction for any other offence, in Mississippi or anywhere else, and I have never had a conviction expunged before.", "");
    L.push("FOURTH. Section 99-19-71(1) states no waiting period for this petition, and none is asserted or required here.", "");
    L.push("FIFTH. The petitioner therefore requests that the Court enter an order expunging the conviction described above from all public records, with a nonpublic record retained by the Mississippi Criminal Information Center solely for the purpose Miss. Code Ann. Sec. 99-19-71(3) states.", "");
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
    L.push(`THIS CAUSE came before the Court on the petition of ${name} for expungement of a misdemeanour conviction under Miss. Code Ann. Sec. 99-19-71(1), and the Court, having considered the petition, would find that the petitioner meets the criteria of Sec. 99-19-71(1): the offence is a misdemeanour that is not a traffic violation, and the petitioner is a first offender.`, "");
    L.push("IT IS THEREFORE ORDERED that the conviction described in the petition is expunged from all public records, and that every person and agency keeping an official record of the arrest or the conviction shall expunge it, including the following, each named by the petitioner from the case record:", "");
    L.push("Agency that made the arrest or issued the citation, as the order must direct it:");
    L.push(DOTS(), "");
    L.push("Sheriff's department of the county, where its records carry the case:");
    L.push(DOTS(), "");
    L.push("Any other person or agency keeping an official record of the case:");
    L.push(DOTS(), "");
    L.push("PROVIDED that the existing records of fingerprints are excepted from this order, as Miss. Code Ann. Sec. 99-19-71 provides; that the Mississippi Criminal Information Center shall retain a nonpublic record solely for the purpose of determining, in subsequent proceedings, whether the person is a first offender; and that upon entry of this order the petitioner is restored, in contemplation of law, to the status the petitioner occupied before the arrest, and shall not be held thereafter guilty of perjury for failure to recite the arrest or conviction, except as Sec. 99-19-71(3) provides for first-offender determinations.", "");
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
    L.push(`I, ${name}, certify that a true and correct copy of the Petition for Expungement of Criminal Record and of the proposed Order of Expungement in this cause was delivered to the prosecuting authority named below:`, "");
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
    L.push("EXHIBIT A - IN EVERY CASE. A certified copy of the judgment of conviction, from the office that keeps the records of the convicting court. It establishes the court, the offence and the conviction date.", "");
    L.push("ADVISABLE, AND EXPECTED IN PRACTICE IN MANY COURTS, THOUGH SUBSECTION (1) DOES NOT REQUIRE THEM:", "");
    L.push("- The docket sheet for the case, from the same office. It shows every court-imposed term and whether each was satisfied.");
    L.push("- An account balance sheet for the case showing a zero balance, from the same office. Subsection (1) does not require payment, but courts commonly require a zero balance in practice.");
    L.push("- Your own Mississippi criminal history record, from the Mississippi Criminal Information Center. It is the only reliable way to check first-offender status across all courts, and self-report is not enough.", "");
    L.push("Do NOT attach an indictment on this track unless the case was actually indicted; most misdemeanour cases are not, and pleading an indictment that does not exist would be false.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("STEP ONE. Identify the correct court and county first. Mississippi has four trial court levels - justice, county, circuit and municipal - that all handle expungements, and people routinely misidentify which one heard their case. The office that keeps the records of the court that entered the conviction can confirm it.");
    L.push("STEP TWO. Ask that office for the case file, the docket sheet, an account balance sheet, and a certified copy of the judgment of conviction. Request your own Mississippi criminal history record from the Mississippi Criminal Information Center, and check the first-offender statement against it before you initial it.");
    L.push("STEP THREE. Call that court's records office before filing and ask whether that court has its own preferred petition or order form or any additional requirement. Mississippi has no statewide form, practice varies by county and circuit district, and this packet defers to the local form wherever one is preferred.");
    L.push("STEP FOUR. Fill in every dotted blank this packet's participant instructions list, from the records. Do not guess a date or a charge wording. Initial the two statements in the petition only if each is true.");
    L.push("STEP FIVE. Sign and date the petition yourself.");
    L.push("STEP SIX. File the petition, with the proposed order and the certificate of service, with the court in which the conviction was had, and pay the filing fee. No fee amount is published in this packet: Miss. Code Ann. Sec. 99-19-72 levies a fee on petitions to expunge an offence under Sec. 99-19-71, but its reach and its collection in lower courts are recorded open questions, so confirm the amount - and any pauper's-affidavit route if you cannot pay - with the court's records office before filing.");
    L.push("STEP SEVEN. Deliver a copy of the petition and the proposed order to the prosecuting authority - for a municipal court case the city prosecutor, not the district attorney - by United States mail or hand delivery, and complete the certificate of service when the copy actually goes out.");
    L.push("STEP EIGHT. Expect that some districts want the district attorney to approve the order as to form before the judicial officer signs. That is a negotiation this packet does not conduct for you.");
    L.push("STEP NINE. After the order issues, obtain certified copies and deliver them to every agency named in the order.", "");
    L.push("WHAT THE ORDER DOES, FROM THE RECORD", "");
    L.push("- Fingerprint records are excepted from expungement.");
    L.push("- The Mississippi Criminal Information Center keeps a nonpublic record solely for determining, in subsequent proceedings, whether you are a first offender - so an expunged conviction can still defeat first-offender status later.");
    L.push("- An employer may still ask whether an order of expunction has been entered.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- your first-offender status is uncertain, or you have any prior conviction anywhere;");
    L.push("- you have any prior expunged case - an earlier expungement does not restore first-offender status;");
    L.push("- the offence may be a traffic violation - many Mississippi misdemeanours sit close to that line;");
    L.push("- the offence is a DUI, which has its own separate route and is never handled here;");
    L.push("- the conviction is in municipal court and you also have justice court convictions, which may be better handled on the additional-misdemeanours track;");
    L.push("- you are not a United States citizen - expungement does not resolve immigration consequences.", "");
    L.push("WHAT THIS PACKET DOES NOT TELL YOU", "");
    L.push("- The filing fee amount, and whether Sec. 99-19-72's fee reaches this petition in this court. The records office of the convicting court is the authority that can answer both.");
    L.push("- Whether your court requires verification or notarization of the petition. No held record establishes a notarization requirement, so the petition carries a simple truth statement; the same office can say whether that court expects more.");
    L.push("- Your court's own preferred forms or local requirements, which vary by county and district. Ask before you file.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared set of composed pleadings and process pages. Mississippi publishes no statewide expungement form, which is why these pages are composed. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.");
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
      h.rbf("convicting_court", "Court that entered the conviction, named in the caption with its county or city",
        "which court entered the conviction - justice, county, circuit or municipal - and its county, or for a municipal court its city; the records office of that court can confirm both",
        "Mississippi has four trial court levels that all handle expungements and the convicting court is a case fact the participant establishes from the record"),
      h.rbf("cause_number", "Cause number of the case, copied from the court record",
        "the cause or case number, copied from the court record; where the court assigns a new number for the expungement it is supplied at filing",
        "no case identifier is held for this record"),
      h.rbf("offense_description", "Offence of which the petitioner was convicted, worded as the court record words it",
        "the offence, worded exactly as the court record words it, with the Mississippi Code section where the record states one",
        "no charge fact is held for this record"),
      h.rbf("offense_date", "Date of the offence, from the record",
        "the date of the offence, taken from the case papers",
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
      h.rbf("conviction_date", "Date of the conviction, from the judgment",
        "the conviction date, checked against the certified copy of the judgment of conviction - correct the packet if they disagree",
        "no disposition fact is held for this record"),
      h.rbf("nontraffic_initials", "Petitioner's initials beside the statement that the offence is not a traffic violation and is not a DUI",
        "your own initials beside the nontraffic statement, only if it is true - many Mississippi misdemeanours sit near that line, and an uncertain classification is a reason to stop and get advice, not to initial",
        "the nontraffic classification is the participant's own assertion and is never certified by the platform"),
      h.rbf("first_offender_initials", "Petitioner's initials beside the first-offender statement",
        "your own initials beside the first-offender statement, only after you have checked your Mississippi criminal history record from the Mississippi Criminal Information Center and it shows no other conviction and no prior expungement",
        "first-offender status is the whole eligibility test on this track and the platform does not certify it; a prior conviction or prior expungement routes to advice instead"),
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
        "the convicting court is a case fact the participant establishes from the record"),
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
        "any other office the case papers show keeping an official record of the arrest or the conviction",
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
        "the convicting court is a case fact the participant establishes from the record"),
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
  out.push("Mississippi publishes no statewide expungement form, so the pages in this packet are composed pleadings drafted to the statute: the petition, the proposed order tendered with it (which is Mississippi practice), and the certificate of service on the prosecuting authority. Districts maintain their own petition and order preferences, so **call the records office of the convicting court before filing** and use that court's preferred form wherever one exists.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed petition under § 99-19-71(1) |");
  out.push("| `proposed_order` | the proposed order tendered with the petition; the Court alone completes it |");
  out.push("| `certificate_of_service` | the record of delivery of a copy to the prosecuting authority |");
  out.push("| `attachment` | the exhibit checklist — what you attach and where you get it |");
  out.push("| `instructions` | what you do, in order, and when to stop and get help |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Certified copy of the judgment of conviction — check your conviction date against it, and correct the packet if they disagree | the records office of the convicting court |");
  out.push("| Docket sheet for the case — advisable on every track, expected in practice on conviction tracks | the records office of the convicting court |");
  out.push("| Account balance sheet showing a zero balance — subsection (1) does not require payment, but courts commonly require a zero balance in practice; check your answer about fines and costs against it | the records office of the convicting court |");
  out.push("| Your own Mississippi criminal history record — the only reliable way to check first-offender status across all courts; check the first-offender statement against it before you initial it | Mississippi Criminal Information Center |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank or an initials line. Fill every one from the records.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${titles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, your initials, and every date beside a signature.** The two statements in the petition — nontraffic and first offender — are yours alone, initialled only if true.");
  out.push("- **The finding paragraph's adoption, the entry line, and the judicial signing block of the proposed order.** The order is the Court's.");
  out.push("- **The APPROVED AS TO FORM block.** Some districts expect prosecutor sign-off; it is never pre-signed.");
  out.push("- **The certificate of service's date, manner marks and signature**, completed only when the copy actually goes out.");
  out.push("- **Any fee amount.** § 99-19-72's reach is a recorded open question; the records office of the convicting court confirms the amount and any pauper's-affidavit route.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- your first-offender status is uncertain, or you have any prior conviction anywhere;");
  out.push("- you have any prior expunged case — an earlier expungement does not restore first-offender status;");
  out.push("- the offence may be a traffic violation;");
  out.push("- the offence is a DUI, which has its own route;");
  out.push("- the conviction is in municipal court and you also have justice court convictions;");
  out.push("- you are not a United States citizen.", "");

  out.push("## What this packet is not", "");
  out.push("A prepared set of composed pleadings and process pages, not an official form (Mississippi publishes none for this), not legal advice, not filed for you, and no promise that the court will grant expungement.", "");
  out.push(`_Route: ${ROUTE.routeKeys[0]}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-ms-misd-1st-set.mjs",
  jurisdiction: "MS",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-misd-1st, "
    + "reading the enrolled text of 2026 Miss. HB 1546) and the packet-set manifest "
    + "(data/record-clearing/legal-design-packet-set-manifests.json, ms-misd-1st-set)",
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
    + "custom_pleading with localFormOverride: every district may prefer its own petition and order, so the "
    + "instructions carry a mandatory clerk-contact step and the composed pages defer to any local form.",
  routeSelectionNote:
    "The composed pages carry no route election. The statutory route is stated in the petition's own title and "
    + "body — § 99-19-71(1). The first-offender and nontraffic statements are the participant's own assertions, "
    + "made by their own initials after checking their Mississippi criminal history, because neither is certified "
    + "by the platform and neither is route-determined. The certificate's manner-of-delivery marks are the "
    + "participant's own act at service time.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that any conviction is eligible for expungement under Miss. Code Ann. § 99-19-71(1)",
    "the amount of any filing fee, or whether § 99-19-72's fee reaches this petition in a given court",
    "any district's local petition or order preference, which the participant confirms with the clerk"
  ],
  buildFindings: [
    {
      finding:
        "Mississippi has no statewide expungement form, and both the MASTER_QUEUE row (officialFormFamily NONE) and "
        + "the legal-design record resolve this track to custom_pleading with localFormOverride. Districts maintain "
        + "their own petition and order preferences, and some expect the district attorney to approve the order as "
        + "to form before the judge signs.",
      consequence:
        "The petition, proposed order and certificate of service are composed to the statute; the instructions "
        + "carry a mandatory clerk-contact step before filing, and the APPROVED AS TO FORM block is retained on the "
        + "proposed order because it costs nothing where it is not expected, and it is never pre-signed."
    },
    {
      finding:
        "First-offender status is the whole eligibility test on § 99-19-71(1), the statute does not define how it "
        + "is measured, and § 99-19-71(3)'s nonpublic Criminal Information Center record exists precisely to defeat "
        + "it in subsequent proceedings — a prior expungement does not restore it.",
      consequence:
        "The first-offender and nontraffic statements are printed as the participant's own assertions, made by "
        + "their own initials only after checking their Mississippi criminal history record; any prior conviction, "
        + "prior expungement or uncertain traffic classification is a printed stop-and-get-help condition."
    },
    {
      finding:
        "Miss. Code Ann. § 99-19-72 levies a $150 fee on 'each petition to expunge an offense under Section "
        + "99-19-71' collected by the circuit clerk, but whether it reaches petitions filed in justice or municipal "
        + "court is a recorded open question, and the legal-design record directs that no fee amount be published "
        + "on any Mississippi track.",
      consequence:
        "The packet publishes no fee figure. The participant confirms the filing fee, and any pauper's-affidavit "
        + "route, with the records office of the convicting court before filing — a named checkable authority "
        + "rather than a guessed amount."
    },
    {
      finding:
        "Subsection (1) states no waiting period and no payment condition — the payment condition sits in "
        + "subsection (2)(a), the felony track — but practice reportedly requires a zero balance anyway, and "
        + "whether any district requires verification or notarization of the petition is unresolved.",
      consequence:
        "The petition asserts no waiting period and pleads no payment element; the account balance sheet is an "
        + "advisable exhibit rather than a pleaded fact, and the petition carries a simple truth statement rather "
        + "than a notarized verification, with the clerk named for any local requirement beyond it."
    }
  ],
  counselQuestions: [
    "Does Miss. Code Ann. § 99-19-72's $150 fee, levied on 'each petition to expunge an offense under Section 99-19-71' and collected by the circuit clerk, reach a § 99-19-71(1) petition filed in justice or municipal court?",
    "Is 'first offender' under Miss. Code Ann. § 99-19-71(1) measured against the person's statewide record, or only against convictions in the petitioned court?",
    "How is 'a traffic violation' distinguished from an ordinary misdemeanour for § 99-19-71(1) purposes, where the statute does not define it?",
    "Whether courts may require proof of payment of fines and costs on a subsection (1) petition where the subsection does not impose it, and whether the advisable zero-balance exhibit is the right treatment.",
    "Whether the composed petition, proposed order and certificate of service are sufficient in form for the least standardized courts (justice and municipal), given localFormOverride and the unresolved notarization question."
  ],
  reviewerAttention: [
    "The first-offender and nontraffic allegations are participant-initialled assertions, never platform certifications; confirm that presentation is legible on the paper.",
    "The proposed order's agency list is fillable participant data with no hardcoded county names; confirm the three agency blanks cover the § 99-19-71 direction adequately.",
    "No fee amount is published anywhere in the packet; every money question delegates to the records office of the convicting court by name."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
