// Mississippi guidance templates — implementation Tranche 1.
//
// Two guidance components sit inside each Mississippi petition packet:
//
//   attachment    the records the participant obtains and attaches;
//   instructions  how to file, what to serve, and what happens next.
//
// Neither is a court filing, and both say so on their face. They exist because
// a petition alone is not a packet: the participant still has to get the
// disposition record, pay or ask about a fee, deliver a copy to the prosecuting
// authority and take the proposed order to the judge. Printing that work is the
// difference between a document and a usable packet.
//
// No fee amount appears anywhere. Miss. Code Ann. § 99-19-72 levies $150 on
// each petition to expunge an offence under § 99-19-71 collected by the circuit
// clerk, which neither plainly reaches a subsection (4) non-conviction petition
// nor maps onto a justice or municipal court filing. The participant confirms
// the amount with the clerk, which is what the accepted normalization records.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE";

const FEE_STATEMENT =
  "No fee amount is stated here on purpose. Miss. Code Ann. § 99-19-72 sets a fee for a petition to expunge an offence under § 99-19-71 collected by the circuit clerk, but whether and how much it applies to this court and this kind of petition is not settled. Ask the clerk what the filing fee is before you file.";

const FEE_WAIVER_STATEMENT =
  "If you cannot afford the filing fee, ask the clerk whether the court accepts a pauper's affidavit. Mississippi practice generally allows one, but it is not confirmed for expungement specifically. LegalEase does not prepare that affidavit for you.";

const CANNOT_PERFORM: readonly string[] = [
  "Filing the petition for you. You file it yourself, or a lawyer files it for you.",
  "Obtaining your court records, disposition record or criminal history for you.",
  "Paying the filing fee or applying for a fee waiver on your behalf.",
  "Telling you whether the court will grant your petition.",
  "Appearing in court, speaking to the judge, or negotiating with the prosecuting authority.",
  "Responding to an objection, a contested hearing or a disputed fact."
];

const ESCALATION: readonly string[] = [
  "The prosecuting authority objects to your petition.",
  "The court sets a contested hearing.",
  "The court record disagrees with what you told us about the disposition, the dates or the charge.",
  "You are told you are not eligible and you disagree.",
  "You have more than one case you want cleared and they are not all covered by this petition.",
  "You are asked for legal argument of any kind."
];

function checklist(input: {
  templateId: string;
  mechanismName: string;
  documentsToObtain: readonly string[];
  officialDestination: { name: string; detail: string };
  sources: readonly string[];
  extraPrerequisites?: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: `${input.mechanismName} — records and attachment checklist`,
    whyNotAFiling:
      "This checklist is not a court filing. It lists the records you obtain and attach to the petition. The petition, the proposed order and the certificate of service are the documents you file.",
    processType: "court_adjacent",
    prerequisites: [
      "You have the petition, the proposed order and the certificate of service that were generated with this checklist.",
      "You have read the filing instructions in this packet.",
      ...(input.extraPrerequisites ?? [])
    ],
    documentsToObtain: input.documentsToObtain,
    participantDataToGather: [
      "Your full legal name, and any other name the case is under.",
      "Your date of birth.",
      "Your current address, telephone number and email address.",
      "The cause or case number.",
      "The name of the court, and the county or city it sits in.",
      "The name and address of the prosecuting authority for that court."
    ],
    officialDestination: input.officialDestination,
    actionSequence: [
      "Obtain each record listed above.",
      "Read the petition and check every fact in it against your records.",
      "Correct anything that does not match before you file. Do not file a petition you know to be wrong.",
      "Attach copies of the records to the petition. Keep your originals.",
      "Sign and date the petition where the signature line appears.",
      "Follow the filing instructions in this packet."
    ],
    submissionMethod:
      "These records are attached to the petition when you file it. They are not submitted separately.",
    fees: FEE_STATEMENT,
    feeWaiver: FEE_WAIVER_STATEMENT,
    noticeOrService: [
      "A copy of the petition and the proposed order goes to the prosecuting authority. The certificate of service in this packet records that delivery."
    ],
    expectedNextStage:
      "Once the clerk accepts the petition, the court reviews it. If the court grants it, the court signs an order of expungement.",
    legalEaseCanPrepare: [
      "The petition, the proposed order and the certificate of service.",
      "This checklist and the filing instructions."
    ],
    legalEaseCannotPerform: CANNOT_PERFORM,
    escalationTriggers: ESCALATION,
    officialSourceReferences: input.sources
  };
}

function instructions(input: {
  templateId: string;
  mechanismName: string;
  officialDestination: { name: string; detail: string };
  actionSequence: readonly string[];
  noticeOrService: readonly string[];
  expectedNextStage: string;
  sources: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: `${input.mechanismName} — filing instructions`,
    whyNotAFiling:
      "These instructions are not a court filing. They tell you how to file the documents in this packet and what to do afterwards.",
    processType: "court_adjacent",
    prerequisites: [
      "You have completed the records and attachment checklist in this packet.",
      "You have checked every fact in the petition against your own records.",
      "You have signed and dated the petition."
    ],
    documentsToObtain: [
      "Nothing further. The records you needed are listed in the checklist in this packet."
    ],
    participantDataToGather: [
      "The clerk's filing counter address and hours.",
      "The filing fee amount the clerk gives you.",
      "The hearing date, if the court sets one."
    ],
    officialDestination: input.officialDestination,
    actionSequence: input.actionSequence,
    submissionMethod:
      "In person at the clerk's office, or by mail if that clerk accepts mailed filings. Ask the clerk which they require. Take or send one original and keep a copy of everything for yourself.",
    fees: FEE_STATEMENT,
    feeWaiver: FEE_WAIVER_STATEMENT,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [
      "The petition, the proposed order and the certificate of service in this packet.",
      "This instruction sheet and the records checklist."
    ],
    legalEaseCannotPerform: CANNOT_PERFORM,
    escalationTriggers: ESCALATION,
    officialSourceReferences: input.sources
  };
}

const HB1546 =
  "2026 Mississippi House Bill 1546, enrolled — Chapter 430, Laws of 2026, approved 30 March 2026, effective 1 July 2026.";

export const MISSISSIPPI_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ms-fel
  "ms-fel-records-checklist": checklist({
    templateId: "ms-fel-records-checklist",
    mechanismName: "Felony conviction expungement, Miss. Code Ann. § 99-19-71(2)",
    documentsToObtain: [
      "A certified copy of the judgment of conviction in this cause, from the circuit clerk.",
      "Proof that you completed every term and condition of the sentence — a discharge certificate, a probation completion letter, or a clerk's record showing fines, fees and restitution paid in full.",
      "Your Mississippi criminal history from the Mississippi Criminal Information Center, so you can confirm this is your only felony conviction.",
      "A copy of any earlier expungement order you have received, if you have received one."
    ],
    officialDestination: {
      name: "Circuit court of the county of conviction",
      detail: "Miss. Code Ann. § 99-19-71(2)(a) directs the petition to the court in which the conviction was entered."
    },
    sources: ["Miss. Code Ann. § 99-19-71(2)(a) and (2)(b)", "Miss. Code Ann. § 99-19-71(3)", HB1546],
    extraPrerequisites: [
      "At least three years have passed since you completed all terms and conditions of the sentence. That period was five years before 1 July 2026 and is three years now."
    ]
  }),
  "ms-fel-filing-instructions": instructions({
    templateId: "ms-fel-filing-instructions",
    mechanismName: "Felony conviction expungement, Miss. Code Ann. § 99-19-71(2)",
    officialDestination: {
      name: "Circuit court of the county of conviction",
      detail: "The circuit clerk's office for the county where you were convicted."
    },
    actionSequence: [
      "Take or send the signed petition, the proposed order, the certificate of service and the notice to the district attorney to the circuit clerk.",
      "Ask the clerk what the filing fee is and how they want it paid.",
      "Deliver a copy of the petition, the proposed order and the notice to the district attorney's office for that county. Miss. Code Ann. § 99-19-71(2)(b) requires the district attorney to have ten days' written notice before a hearing.",
      "Fill in the date and the method of delivery on the certificate of service, sign it, and file it with the clerk.",
      "Ask the clerk whether the court will set a hearing and, if so, when.",
      "If a hearing is set, notify the district attorney of the date as soon as the clerk gives it to you.",
      "Attend the hearing if one is set. Take your records with you.",
      "If the court grants the petition, ask the clerk for certified copies of the signed order."
    ],
    noticeOrService: [
      "The district attorney must receive ten days' written notice before a hearing. Miss. Code Ann. § 99-19-71(2)(b).",
      "The notice document in this packet is that notice. Deliver it with the petition and the proposed order."
    ],
    expectedNextStage:
      "The court reviews the petition. If it grants the petition, it signs the order of expungement and the clerk sends certified copies to the agencies named in the order. Ask the clerk how long that usually takes in that county.",
    sources: ["Miss. Code Ann. § 99-19-71(2)(a) and (2)(b)", "Miss. Code Ann. § 99-19-72", HB1546]
  }),

  // ms-misd-1st
  "ms-misd-1st-records-checklist": checklist({
    templateId: "ms-misd-1st-records-checklist",
    mechanismName: "First misdemeanour conviction expungement, Miss. Code Ann. § 99-19-71(1)",
    documentsToObtain: [
      "A certified copy of the judgment or the abstract of conviction in this cause, from the clerk of the court that convicted you.",
      "Proof that any fine, fee or court cost was paid.",
      "Your Mississippi criminal history from the Mississippi Criminal Information Center, so you can confirm this is your first misdemeanour conviction."
    ],
    officialDestination: {
      name: "The convicting court",
      detail:
        "Miss. Code Ann. § 99-19-71(1) directs the petition to the justice, county, circuit or municipal court in which the conviction was entered. People often misidentify which of the four heard their case; the certified copy of the judgment settles it."
    },
    sources: ["Miss. Code Ann. § 99-19-71(1)", "Miss. Code Ann. § 99-19-71(3)"]
  }),
  "ms-misd-1st-filing-instructions": instructions({
    templateId: "ms-misd-1st-filing-instructions",
    mechanismName: "First misdemeanour conviction expungement, Miss. Code Ann. § 99-19-71(1)",
    officialDestination: {
      name: "The convicting court",
      detail: "The clerk of the justice, county, circuit or municipal court that entered the conviction."
    },
    actionSequence: [
      "Confirm from the certified copy of the judgment which court convicted you. File in that court and no other.",
      "Take or send the signed petition, the proposed order and the certificate of service to that clerk.",
      "Ask the clerk what the filing fee is and how they want it paid.",
      "Deliver a copy of the petition and the proposed order to the prosecuting authority for that court — the county prosecuting attorney, the district attorney or the city prosecutor, depending on the court.",
      "Fill in the date and the method of delivery on the certificate of service, sign it, and file it with the clerk.",
      "Ask the clerk whether the court will set a hearing.",
      "If the court grants the petition, ask the clerk for certified copies of the signed order."
    ],
    noticeOrService: [
      "A copy goes to the prosecuting authority for that court. Ask the clerk who that is if you are not sure."
    ],
    expectedNextStage:
      "The court reviews the petition and either grants it or sets it for hearing. Ask the clerk how that court handles expungement petitions.",
    sources: ["Miss. Code Ann. § 99-19-71(1)", "Miss. Code Ann. § 99-19-72"]
  }),

  // ms-misd-addl
  "ms-misd-addl-records-checklist": checklist({
    templateId: "ms-misd-addl-records-checklist",
    mechanismName:
      "Additional justice or municipal court misdemeanour expungement, Miss. Code Ann. §§ 9-11-15(3), 21-23-7(6)",
    documentsToObtain: [
      "A certified copy of the judgment or abstract of conviction from the justice court or municipal court that convicted you.",
      "Proof that all fines, fees and costs were paid, and the date they were paid in full.",
      "Your Mississippi criminal history from the Mississippi Criminal Information Center."
    ],
    officialDestination: {
      name: "The convicting justice court or municipal court",
      detail:
        "Justice court expungements run under Miss. Code Ann. § 9-11-15(3); municipal court expungements run under § 21-23-7(6). The two provisions are word for word identical on every operative element, so the petition is the same document filed in a different court."
    },
    sources: ["Miss. Code Ann. § 9-11-15(3)", "Miss. Code Ann. § 21-23-7(6)"],
    extraPrerequisites: [
      "Two years or more have passed since you satisfied all terms and conditions of the sentence.",
      "The conviction is not a traffic violation."
    ]
  }),
  "ms-misd-addl-filing-instructions": instructions({
    templateId: "ms-misd-addl-filing-instructions",
    mechanismName:
      "Additional justice or municipal court misdemeanour expungement, Miss. Code Ann. §§ 9-11-15(3), 21-23-7(6)",
    officialDestination: {
      name: "The convicting justice court or municipal court",
      detail: "The clerk of the justice court for the county, or the clerk of the municipal court for the city."
    },
    actionSequence: [
      "Confirm from the certified copy of the judgment whether a justice court or a municipal court convicted you. The petition in this packet is captioned for that court.",
      "Take or send the signed petition, the proposed order and the certificate of service to that clerk.",
      "Ask the clerk what the filing fee is and how they want it paid.",
      "Deliver a copy of the petition and the proposed order to the prosecuting authority for that court — the county prosecuting attorney for a justice court, or the city prosecutor for a municipal court.",
      "Fill in the date and the method of delivery on the certificate of service, sign it, and file it with the clerk.",
      "This relief is discretionary. Ask the clerk whether the judge wants to hear from you before ruling.",
      "If the court grants the petition, ask the clerk for certified copies of the signed order."
    ],
    noticeOrService: [
      "A copy goes to the prosecuting authority for that court."
    ],
    expectedNextStage:
      "The judge decides whether to grant the expungement. The statute makes it discretionary, so the judge may grant it, deny it, or ask to hear from you first.",
    sources: ["Miss. Code Ann. § 9-11-15(3)", "Miss. Code Ann. § 21-23-7(6)"]
  }),

  // ms-nonconv
  "ms-nonconv-records-checklist": checklist({
    templateId: "ms-nonconv-records-checklist",
    mechanismName: "Non-conviction expungement, Miss. Code Ann. § 99-19-71(4)",
    documentsToObtain: [
      "The record that shows how the case ended — the order of dismissal, the nolle prosequi entry, the judgment of acquittal, or a clerk's certificate that no charge was ever filed. Get whichever one matches your case.",
      "A copy of the arrest record or the affidavit, if the clerk or the arresting agency will give you one.",
      "Your Mississippi criminal history from the Mississippi Criminal Information Center, so you can confirm the arrest is still showing."
    ],
    officialDestination: {
      name: "The court in which the case was pending",
      detail:
        "Miss. Code Ann. § 99-19-71(4) directs the petition to the court in which the case was pending, or in which the arrest record originated where no case was filed."
    },
    sources: ["Miss. Code Ann. § 99-19-71(4)", "Miss. Code Ann. § 99-19-71(3)", "2019 Miss. HB 1352, § 34"]
  }),
  "ms-nonconv-filing-instructions": instructions({
    templateId: "ms-nonconv-filing-instructions",
    mechanismName: "Non-conviction expungement, Miss. Code Ann. § 99-19-71(4)",
    officialDestination: {
      name: "The court in which the case was pending",
      detail: "The clerk of the court where the charge was pending, or where the arrest record originated."
    },
    actionSequence: [
      "Check that the disposition paragraph in the petition matches your record. If your case ended a different way, do not file it — the petition must match the record.",
      "Take or send the signed petition, the proposed order and the certificate of service to that clerk.",
      "Ask the clerk what the filing fee is. Section 99-19-72 sets a fee for petitions under § 99-19-71, but whether it reaches a non-conviction petition is not settled, and practice differs by county.",
      "Deliver a copy of the petition and the proposed order to the prosecuting authority for that court.",
      "Fill in the date and the method of delivery on the certificate of service, sign it, and file it with the clerk.",
      "Some districts expect notice to the prosecuting attorney and their approval as a matter of local practice, even though subsection (4) does not require a hearing. Ask the clerk what that court expects.",
      "If the court grants the petition, ask the clerk for certified copies of the signed order."
    ],
    noticeOrService: [
      "A copy goes to the prosecuting authority for that court.",
      "The ten days' written notice to the district attorney comes from Miss. Code Ann. § 99-19-71(2)(b), which sits inside the felony conviction subsection. It is not carried over to this subsection here. Some districts nevertheless expect it as local practice."
    ],
    expectedNextStage:
      "Subsection (4) sets no waiting period and requires no hearing. The court reviews the petition and either grants it or sets it for hearing.",
    sources: ["Miss. Code Ann. § 99-19-71(4)", "Miss. Code Ann. § 99-19-72"]
  }),

  // ms-nonadj
  "ms-nonadj-records-checklist": checklist({
    templateId: "ms-nonadj-records-checklist",
    mechanismName: "Expungement after nonadjudication, Miss. Code Ann. § 99-15-26",
    documentsToObtain: [
      "A certified copy of the nonadjudication order the court entered — the order withholding acceptance of your plea and setting the conditions.",
      "The court's order dismissing the charge after you completed the conditions.",
      "Proof that you completed every condition — programme completion certificates, payment receipts, community service records.",
      "Your Mississippi criminal history from the Mississippi Criminal Information Center."
    ],
    officialDestination: {
      name: "The court that entered the nonadjudication order",
      detail: "Miss. Code Ann. § 99-15-26(5) gives that court the power to expunge on successful completion."
    },
    sources: ["Miss. Code Ann. § 99-15-26", "Miss. Code Ann. § 99-15-26(5)"],
    extraPrerequisites: [
      "You completed every condition the court imposed and the court dismissed the charge.",
      "No conviction was entered in this cause."
    ]
  }),
  "ms-nonadj-filing-instructions": instructions({
    templateId: "ms-nonadj-filing-instructions",
    mechanismName: "Expungement after nonadjudication, Miss. Code Ann. § 99-15-26",
    officialDestination: {
      name: "The court that entered the nonadjudication order",
      detail: "The clerk of the court that put you into the nonadjudication programme."
    },
    actionSequence: [
      "Confirm from the nonadjudication order which court entered it. File in that court and no other.",
      "Take or send the signed petition, the proposed order and the certificate of service to that clerk.",
      "Ask the clerk what the filing fee is and how they want it paid.",
      "Deliver a copy of the petition and the proposed order to the prosecuting authority for that court.",
      "Fill in the date and the method of delivery on the certificate of service, sign it, and file it with the clerk.",
      "If the court grants the petition, ask the clerk for certified copies of the signed order."
    ],
    noticeOrService: ["A copy goes to the prosecuting authority for that court."],
    expectedNextStage:
      "The court reviews the petition against its own nonadjudication file. If it grants the petition, it signs the order of expungement.",
    sources: ["Miss. Code Ann. § 99-15-26(5)"]
  })
};
