// Maryland guidance templates — implementation Tranche 2.
//
// One guidance component sits inside the Maryland shielding packet: the
// participant guide that closes the assembled PDF. The two documents in front of
// it are the filing. This is everything the participant still has to do —
// sign, check, take it to the right counter, and know what the next thirty days
// look like.
//
// Three things this file is careful about, all of them from the accepted
// Maryland legal design rather than from drafting preference.
//
// It never says expungement or sealing. Shielding removes a conviction from
// public view. The participant generally cannot say the conviction never
// happened, and law enforcement, courts and certain agencies keep access. The
// review is explicit that blurring the two is the failure mode here.
//
// It states no fee amount. The Judiciary shielding page and CC-DC-CR-148A state
// $0, and that is unverified at build time, so it is an open release blocker.
// The participant asks the clerk. A printed $0 that turns out to be wrong sends
// someone to a counter without money.
//
// It says plainly that this is once in a lifetime, in one court, in one county.
// That is the whole risk of the route: the election is unrecoverable, and a
// participant with convictions in a second court needs a lawyer before they
// choose, not after.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE";

export const MARYLAND_SHIELDING_GUIDE_TEMPLATE_ID = "md-second-chance-shielding-participant-guide";

const MARYLAND_SHIELDING_PARTICIPANT_GUIDE: GuidanceTemplate = {
  templateId: MARYLAND_SHIELDING_GUIDE_TEMPLATE_ID,
  version: VERSION,
  technicalFixture: true,
  banner: BANNER,
  mechanismName: "Maryland Second Chance Act shielding — how to sign, file and follow up",
  paginate: true,
  notFilingNotice:
    "This document is not a court filing. It is the instructions for the two Maryland court forms printed ahead of it, and those two forms are what you file.",
  whyNotAFiling:
    "These instruction pages are not a court filing and are not part of what you hand to the clerk. What you file is the two completed Maryland Judiciary forms printed ahead of them: the Petition for Shielding Under the Maryland Second Chance Act (CC-DC-CR-148) and the Notice Regarding Restricted Information Pursuant to Rule 20-201.1 (MDJ-008). Keep these pages for yourself.",
  processType: "court_adjacent",

  // 6 and 7 of the assembled packet: execution instructions and the
  // required-before-filing checklist.
  prerequisites: [
    "Understand what shielding does before you file. Shielding removes these convictions from public view. It is not expungement. You generally cannot say the conviction never happened, and courts, law enforcement and certain agencies keep access to the record.",
    "Understand that this is once. Maryland grants one shielding petition in a lifetime, in one court, in one county. Filing this petition uses it.",
    "You are filing in the {{courtLevelLabel}} for {{courtCityCounty}}. Every conviction on this petition must be from that one court. If you have a shieldable conviction in any other Maryland court or county, stop and talk to a lawyer before you file — it will not be covered and you cannot come back for it.",
    "SIGN THE PETITION. The signature line on CC-DC-CR-148 next to \"Signature of Petitioner\" is blank on purpose. You sign it yourself, by hand, and write the date next to it. LegalEase does not and will not sign anything for you.",
    "SIGN THE NOTICE. MDJ-008 has its own signature line and its own date line, both blank. Sign and date that one too.",
    "The attorney blocks on both forms are blank on purpose. Leave them blank unless a lawyer is actually representing you, in which case they complete their own block.",
    "Read every box that is checked on CC-DC-CR-148. Each one is a statement you are making to a judge. Paragraphs 2 through 6 are printed statements you adopt by signing: that no ineligible offence came out of the same incident, that three years have passed since you satisfied every sentence and you have not been convicted since, that you have no pending criminal charges, that you have never been granted shielding before, and that the petition itself is to be shielded by the clerk.",
    "Check the case numbers on this petition against the court record, offence by offence: {{selectedOffenceSummary}}.",
    "Check that the date you gave us for satisfying your sentence — {{sentenceSatisfiedDate}} — is right, including any parole, probation or mandatory supervision. The three-year clock runs from the last one of those to end, not from the conviction.",
    "Make a copy of both signed forms for yourself before you file."
  ],

  // 11 of the assembled packet: the supporting-document checklist.
  documentsToObtain: [
    "Your case record from Maryland Judiciary Case Search, printed or on your phone. It is free. Use it to confirm the court, the case numbers, the charges and the dispositions on this petition.",
    "Proof that your sentence is satisfied, if you have it — a discharge from probation, a parole discharge, or a receipt showing fines paid. The form does not require you to attach it. Bring it in case the clerk or the court asks.",
    "Photo identification, if you are filing in person.",
    "The court's own docket entries for each case listed, if Case Search and your own record disagree about anything."
  ],

  participantDataToGather: [
    "Confirm your name is printed the same way on both forms and matches the name on the court record.",
    "Confirm the court address and telephone number in the caption match the courthouse you are actually filing in. Court locations move.",
    "Confirm the case number in the caption — {{firstCaseNumber}} — is the first case listed in the body of the petition. That is what the caption asks for.",
    "Confirm your mailing address is one where you will still receive post in three months. The court and the clerk write to you at it."
  ],

  // 8 of the assembled packet: filing destination.
  officialDestination: {
    name: "Clerk of the {{courtLevelLabel}} for {{courtCityCounty}}",
    detail:
      "{{courtAddress}}. Both forms go to the same clerk, at the same time, in the one court that entered these convictions. Md. Code, Crim. Proc. § 10-303."
  },

  actionSequence: [
    "Sign and date CC-DC-CR-148 by hand where it says Signature of Petitioner.",
    "Sign and date MDJ-008 by hand.",
    "Put MDJ-008 with the petition. CC-DC-CR-148 prints the requirement on its own face: the notice must be filed with the submission. A petition filed without it can be rejected at the counter.",
    "Take or send both forms to the clerk named above.",
    "Ask the clerk what the filing fee is, and pay it if there is one. See the fee section below before you go.",
    "Keep your copy, and keep the receipt or the stamped copy the clerk gives you.",
    "Watch your post for thirty days. The State's Attorney has that long to object, and every victim listed on these cases has the right to be heard."
  ],

  // 8 of the assembled packet: filing method.
  submissionMethod:
    "In person at the clerk's counter, by mail to the same address, or through MDEC e-filing if that county is on MDEC and you have an MDEC account. In person is the surest, because the clerk can tell you immediately if something is missing.",

  // 9 of the assembled packet: fee and fee-verification instructions.
  fees:
    "Ask the clerk what the filing fee is before you file. No amount is printed here on purpose. The Maryland Judiciary's shielding page and form CC-DC-CR-148A both indicate there is no fee for a shielding petition, and that has not been confirmed against the current fee schedule, so LegalEase will not print a figure you might rely on at the counter.",
  feeWaiver:
    "If the clerk does tell you there is a fee and you cannot pay it, ask for the Request for Waiver of Prepaid Costs. It is a Maryland Judiciary form the clerk can give you. It is not included in this packet, because on the information available this route carries no fee to waive.",

  // 10 of the assembled packet: who serves whom.
  noticeOrService: [
    "You do not serve anyone. The court does. Do not fill in a certificate of service and do not mail a copy to the State's Attorney yourself.",
    "The court serves the State's Attorney, who then has 30 days to object.",
    "Every victim on the cases you listed has the right to offer objections or additional information. That notice is printed on the face of CC-DC-CR-148 and the court handles it.",
    "If the State's Attorney does object, the court sets a hearing. That is the point at which this stops being a self-help matter."
  ],

  // 12 of the assembled packet: the post-filing timeline.
  expectedNextStage:
    "The clerk dockets the petition and the court serves the State's Attorney. The State has 30 days from service to object, and the court may act as soon as 30 days after the petition is served. If nobody objects, the court can rule on the papers and you will receive the order by post. If the State objects, the court sets a hearing and you will receive a notice with a date. Either way you do nothing further until you hear from the court — except tell the clerk in writing if your address changes.",

  legalEaseCanPrepare: [
    "The completed Petition for Shielding Under the Maryland Second Chance Act (CC-DC-CR-148) in this packet.",
    "The completed Notice Regarding Restricted Information Pursuant to Rule 20-201.1 (MDJ-008) in this packet.",
    "These instructions, the checklist above and the filing information."
  ],

  legalEaseCannotPerform: [
    "Signing either form. Both signature lines are yours and are left blank.",
    "Filing at the counter, by post or through MDEC for you.",
    "Deciding which court and county you should choose. You get one petition, and that choice is a legal judgment about your whole record.",
    "Deciding whether two charges are part of the same incident. That is a legal judgment and Maryland's unit rule can defeat a whole petition.",
    "Telling you whether the court will grant this petition.",
    "Responding to an objection from the State's Attorney, appearing at a hearing, or arguing anything to a judge.",
    "Telling you that you may say a shielded conviction never happened. Shielding is not expungement, and you generally may not."
  ],

  // 13 of the assembled packet: stop conditions and attorney handoff.
  escalationTriggers: [
    "You have a shieldable conviction in more than one Maryland court, or in more than one county. Stop. Maryland Volunteer Lawyers Service, Maryland Legal Aid or a Court Help Center can help you decide which court to use before you spend your one petition.",
    "You have filed a shielding petition before, or you are not sure whether you have.",
    "Any of these convictions might be domestically related.",
    "Any of these charges came out of the same incident as a charge that is not on the shieldable list.",
    "The State's Attorney files an objection, or the court sets a hearing.",
    "The court record disagrees with what you told us about a case number, a charge or a date.",
    "You are still unsure about the difference between shielding and expungement.",
    "Anyone asks you for legal argument of any kind.",
    "Free help: Maryland Court Help Centers, Maryland Legal Aid, and the Maryland Volunteer Lawyers Service."
  ],

  officialSourceReferences: [
    "Md. Code, Criminal Procedure §§ 10-301 through 10-306 — the Maryland Second Chance Act.",
    "Md. Code, Criminal Procedure § 10-303 — one petition per lifetime, and the court you file in.",
    "Md. Code, Criminal Procedure § 10-305 — a shielded conviction is not a conviction for the subsequent-conviction rule.",
    "Md. Rule 16-934 and Md. Rule 16-941 — shielding procedure.",
    "Md. Rule 20-201.1 — the restricted-information notice that must accompany this petition.",
    "Maryland Judiciary self-help: expungement and shielding — mdcourts.gov/legalhelp/expungement.",
    "Maryland Judiciary Case Search — casesearch.courts.state.md.us."
  ]
};

export const MARYLAND_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  [MARYLAND_SHIELDING_GUIDE_TEMPLATE_ID]: MARYLAND_SHIELDING_PARTICIPANT_GUIDE
};
