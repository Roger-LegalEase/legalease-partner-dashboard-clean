#!/usr/bin/env node
/**
 * The Vermont under-25 sealing packet family builder.
 *
 *   node scripts/build-census-v1-vt_seal_under_25-set.mjs [--check]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   vt_seal_under_25   33 V.S.A. § 5119(g): sealing of records of an offence
 *                      committed before age 25
 *
 * WHY THE APPLICATION IS COMPOSED
 *
 * The Vermont Judiciary publishes no form for a § 5119(g) application — none
 * appears in the expungement page's form list and none was located in the
 * forms library on 2026-08-06 — and the family's own legal-design record
 * (data/record-clearing/legal-design-intake/VT.memo.json, track
 * vt_seal_under_25) resolves the strategy to custom_pleading in terms: the
 * statute supplies the court, the vehicle (an application), the three findings
 * and the relief, so a controlled pleading is supportable, and the absence of
 * a form 'is not a reason to withhold a controlled participant artifact — it
 * is the express condition for drafting one.' Two corrections in that record
 * govern this family: the under-25 route is § 5119(g), NOT 13 V.S.A. § 7609
 * (an 18-to-21 provision) and not chapter 230 at all; and the route is
 * procedurally unlike chapter 230 — an application rather than a petition,
 * dual-initiated, with mandatory notice to all parties of record and a
 * hearing, a two-year clock from final discharge, a ten-year listed-crime
 * lookback, the § 5119(m) restitution bar, and an affirmative rehabilitation
 * burden on the participant.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT REFUSES
 *
 * The platform writes only the participant's identity and contact facts.
 * Every case fact is a labelled dotted blank declared REQUIRED_BEFORE_FILING
 * and disclosed in participant-instructions.md with the checkable authority
 * named — the Criminal Division clerk's office for the discharge record, the
 * Vermont Crime Information Center for the lookback, the Restitution Unit for
 * the § 5119(m) balance. THE REHABILITATION SHOWING IS NEVER COMPOSED: the
 * controlling review lists rehabilitation evidence on the under-25 route
 * among the fields that must not be auto-completed, so the application
 * carries the participant's own account in their own words, prompted but
 * never written. No filing fee arises: 32 V.S.A. § 1431(e) applies the $90
 * fee only to DUI-record sealing and expressly not to a § 5119(g) motion.
 */
import {
  mapHelpers, composedMapOf, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "vt_seal_under_25-set";
const OUT = "data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: ["obligation:track-pathway:VT:vt_seal_under_25:offense-before-age-25-sealing-under-33-v-s-a-5119-g"],
  legalName: "Sealing of Records of an Offence Committed Before Age 25, 33 V.S.A. § 5119(g)",
  routeName: "sealing the record of a Vermont offence you committed before you turned 25, under 33 V.S.A. § 5119(g)",
  statutes: ["33 V.S.A. § 5119(g)", "33 V.S.A. § 5119(k)", "33 V.S.A. § 5119(m)", "13 V.S.A. § 5301", "32 V.S.A. § 1431(e)"]
});

const COMPONENTS = [
  { id: "application_for_sealing", role: "application_for_sealing", title: "Application for Sealing Under 33 V.S.A. Sec. 5119(g)" },
  { id: "rehabilitation_statement_prompts", role: "rehabilitation_statement_prompts", title: "Your Rehabilitation Account - Prompts, Not Words" },
  { id: "hearing_and_notice_instructions", role: "hearing_and_notice_instructions", title: "The Hearing, the Notice, and What Happens After Filing" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Caleb Winslow Tremblay",
    "participant.date_of_birth": "1999-05-02",
    "participant.street_address": "12 Otter Creek Lane, Middlebury, VT 05753",
    "participant.phone": "802-555-0157",
    "participant.email": "caleb.tremblay@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Anastasia-Wilhelmina Beauregard-Kittredge",
    "participant.date_of_birth": "1994-12-31",
    "participant.street_address": "6644 Upper Mad River Notch Common Road, Cabin 9, Waitsfield, Vermont 05673-9902",
    "participant.phone": "(802) 555-0193 ext. 6618",
    "participant.email": "anastasia.wilhelmina.beauregard.kittredge@longmailexample.org"
  }
};

/* ---- composed bodies ------------------------------------------------------------ *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/VT.memo.json, track vt_seal_under_25
 *              (33 V.S.A. § 5119(g) read at source 2026-08-06)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json, vt_seal_under_25-set
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
  if (componentId === "application_for_sealing") {
    L.push("STATE OF VERMONT");
    L.push("SUPERIOR COURT, .......................................... UNIT");
    L.push("CRIMINAL DIVISION");
    L.push("(the county whose court had jurisdiction over the proceeding)", "");
    L.push(`IN RE: ${name},`);
    L.push("APPLICANT.", "");
    L.push("Docket No. " + DOTS(42));
    L.push("(the docket number of the proceeding sought to be sealed)", "");
    L.push("APPLICATION FOR SEALING OF ALL FILES AND RECORDS RELATED TO THE PROCEEDING, 33 V.S.A. Sec. 5119(g)", "");
    L.push(`1. The applicant, ${name}, born ${dob}, applies under 33 V.S.A. Sec. 5119(g) for an order sealing all files and records related to the proceeding identified above, and states:`, "");
    L.push("2. The offence in the proceeding was committed before the applicant attained 25 years of age. The applicant's age at the time of the offence, from the record:");
    L.push(DOTS(), "");
    L.push("3. The applicant's date of final discharge - the day the applicant finished everything the sentence required - shown by the court's record of final discharge:");
    L.push(DOTS(), "");
    L.push("4. Two years have elapsed since that final discharge, as Sec. 5119(g)(1) requires.", "");
    L.push("5. The applicant states, after obtaining the applicant's own Vermont Crime Information Center conviction record: the applicant has not been convicted of a listed crime as defined in 13 V.S.A. Sec. 5301, and has not been adjudicated delinquent for such an offence, in the ten years prior to this application, and no proceeding is now pending seeking such a conviction or adjudication. (If any of that is not true of you, do not file this application; Sec. 5119(g)(2) forecloses it.)", "");
    L.push("6. The applicant states, after obtaining a current balance from the Restitution Unit: no restitution and no surcharges are owed. Sec. 5119(m) bars sealing while either is outstanding. (If anything is owed, do not file until it is resolved.)", "");
    L.push("7. The applicant's own account of rehabilitation since final discharge, in the applicant's own words - Sec. 5119(g)(3) requires the Court to find that rehabilitation has been attained to the satisfaction of the Court, that burden is the applicant's, and NOTHING ON THESE LINES IS WRITTEN FOR THE APPLICANT (the prompts page of this packet may help you decide what to say):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("8. The applicant therefore requests that, after the notice to all parties of record and the hearing that Sec. 5119(g) requires, the Court order the sealing of all files and records related to the proceeding.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF APPLICANT " + DOTS(38), "");
    L.push("(The applicant signs and dates this application personally. Nothing on this page is signed or dated for the applicant. No notarization is required by Sec. 5119(g).)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "rehabilitation_statement_prompts") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Section 5119(g)(3) makes rehabilitation the Court's own finding, to the Court's own satisfaction, and the burden of showing it is yours. This page prompts; it never writes. Nothing here is an argument made for you, no words are supplied, and nothing you gather is received, inspected, reviewed or vouched for.", "");
    L.push("THINGS COURTS COMMONLY HEAR ABOUT - say what is true of you, in your own words, on the application's rehabilitation lines:");
    L.push("- work: where you have worked since discharge, and for how long;");
    L.push("- study: schooling, training or credentials since discharge;");
    L.push("- treatment: programmes you completed, where treatment was part of your path;");
    L.push("- family and community: responsibilities you carry, people who count on you, service you give.", "");
    L.push("MATERIAL SOME APPLICANTS BRING. The statute requires no documents for this showing. Some applicants choose to bring letters from employers, educators, treatment providers or community references. Whether to bring any is your decision; gather whatever supports your own account, from your own people.", "");
    L.push("IF THE SHOWING BECOMES CONTESTED. The Court must hold a hearing, and if the State contests your rehabilitation, arguing it is individualized advocacy rather than form completion. That is a printed stop condition of this packet: take the application and your account to a lawyer or a legal-aid office before the hearing.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("THIS ROUTE IS UNLIKE VERMONT'S CHAPTER 230 PETITIONS, and the differences are the statute's own:");
    L.push("- it is an APPLICATION, filed with the court having jurisdiction over the proceeding - the Criminal Division of the Superior Court in the county that handled the case;");
    L.push("- the court may also act on its own motion, but this packet is the participant-initiated route;");
    L.push("- the Court MUST give notice to all parties of record and hold a HEARING before it may order sealing. Expect the prosecuting office to receive notice and to be heard, and expect to attend;");
    L.push("- rehabilitation is an affirmative burden on you, found to the Court's own satisfaction;");
    L.push("- Sec. 5119(k) obliges the court to provide assistance to persons who seek to file an application under the section - ask the clerk's office of the Criminal Division what assistance that court provides.", "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("STEP ONE. Ask the clerk's office of the Criminal Division of the Superior Court in the county that handled the case for the record of final discharge. It establishes the date the two-year clock ran from, and nothing can be filed until two years have elapsed.");
    L.push("STEP TWO. Request your own statewide conviction record from the Vermont Crime Information Center, and check the ten-year listed-crime statement against it before you file. VCIC charges a fee for the record; no amount is published here - confirm it with VCIC.");
    L.push("STEP THREE. Ask the Restitution Unit of the Vermont Center for Crime Victim Services for a current balance. Sec. 5119(m) bars sealing while restitution or surcharges are owed; if anything is owed, resolve it before filing.");
    L.push("STEP FOUR. Fill in every dotted blank the participant instructions list, from those records, and write your own rehabilitation account on the application's own lines.");
    L.push("STEP FIVE. Sign and date the application yourself, and file it with the Criminal Division of the Superior Court in the county that handled the case. NO FILING FEE is payable: under 32 V.S.A. Sec. 1431(e) the $90 fee applies only to a motion to seal a DUI record and expressly does not apply to a motion under 33 V.S.A. Sec. 5119(g).");
    L.push("STEP SIX. The notice to all parties of record is the Court's step under the section, not yours; this packet carries no service page because the statute assigns the notice to the Court. Expect the hearing, and attend it.", "");
    L.push("AFTER SEALING. Sealed records may still appear in a federal criminal background check: Vermont relief does not reach federal records, even though VCIC notifies the FBI's National Crime Information Center.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- the Court sets the hearing and your rehabilitation showing is contested - that is individualized advocacy, not form completion;");
    L.push("- there is any listed-crime conviction or delinquency adjudication in the ten-year lookback, or any such proceeding pending;");
    L.push("- restitution or surcharges remain owed;");
    L.push("- you are unsure whether an offence on your record is a listed crime under 13 V.S.A. Sec. 5301;");
    L.push("- any immigration question is involved.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a composed application with prompts and instructions. The Vermont Judiciary publishes no form for a Sec. 5119(g) application, which is why the application is composed. It is not legal advice, it is not filed for you, it argues nothing for you, and it does not decide whether the Court will be satisfied of your rehabilitation.");
  }
  L.push("", `Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

/* ---- the field maps -------------------------------------------------------------- */
function maps() {
  const out = [];
  {
    const h = mapHelpers("application_for_sealing");
    const writes = [
      h.write("applicant_name", "Applicant named in the caption of this application", "participant.full_legal_name"),
      h.write("date_of_birth", "Applicant's date of birth, printed in the application's first paragraph", "participant.date_of_birth"),
      h.write("mailing_address", "Mailing address of the applicant in the contact block at the foot of the application", "participant.street_address"),
      h.write("telephone", "Telephone number of the applicant in the contact block at the foot of the application", "participant.phone"),
      h.write("email", "Email address of the applicant in the contact block at the foot of the application", "participant.email")
    ];
    const refusals = [
      h.rbf("court_unit", "Superior Court unit named in the caption - the county whose court had jurisdiction over the proceeding",
        "which county's Superior Court, Criminal Division, handled the case - the Criminal Division clerk's office there can confirm it",
        "the court having jurisdiction is a case fact the participant establishes from the record"),
      h.rbf("docket_number", "Docket number of the proceeding sought to be sealed",
        "the docket number, copied from the court record",
        "no case identifier is held for this record"),
      h.rbf("age_at_offence", "Applicant's age at the time of the offence, from the record",
        "how old you were when you committed the offence - this route is only open where it was before you turned 25",
        "the age at the offence is the route's threshold fact and lives on the participant's own record"),
      h.rbf("final_discharge_date", "Date of final discharge, shown by the court's record of final discharge",
        "the date of your final discharge - the day you finished everything the sentence required - checked against the record of final discharge from the Criminal Division; it establishes the date the two-year clock ran from",
        "no discharge fact is held for this record, and the two-year requirement of Sec. 5119(g)(1) runs from it"),
      h.rbf("rehabilitation_account", "The applicant's own account of rehabilitation since final discharge, on the application's own lines",
        "your own account, in your own words, of what you have done since discharge - work, study, treatment, family, community; the Court has to be satisfied about rehabilitation, the burden is yours, and the prompts page may help you decide what to say; check what you say against whatever material you choose to gather",
        "the controlling review lists rehabilitation evidence on the under-25 route among the fields that must not be auto-completed; the platform prompts and never writes"),
      h.protectedBlank("applicant_signature", "Signature of the applicant on the application",
        "the applicant signs the application personally"),
      h.protectedBlank("signature_date", "Date beside the applicant's signature on the application",
        "a date written before the application is signed would be false")
    ];
    out.push(composedMapOf("application_for_sealing", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("rehabilitation_statement_prompts");
    out.push(composedMapOf("rehabilitation_statement_prompts", FAMILY,
      [h.write("participant_name", "Participant named on the prompts page", "participant.full_legal_name")], []));
  }
  {
    const h = mapHelpers("hearing_and_notice_instructions");
    out.push(composedMapOf("hearing_and_notice_instructions", FAMILY,
      [h.write("participant_name", "Participant named on the hearing and notice instructions", "participant.full_legal_name")], []));
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
  out.push("The Vermont Judiciary publishes no form for a § 5119(g) application — none was located on 2026-08-06 — so the application in this packet is a composed, controlled pleading: the statute itself supplies the court, the vehicle, the three findings the Court must make, and the relief. This route sits outside chapter 230 and is unlike it: notice to all parties of record and a **hearing** are mandatory, the rehabilitation burden is yours, and the Court is obliged by § 5119(k) to provide assistance to applicants.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact is a labelled dotted blank listed below, and you fill it from the record itself, never from memory. **Your rehabilitation account is yours alone** — prompted, never written.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `application_for_sealing` | the composed § 5119(g) application |");
  out.push("| `rehabilitation_statement_prompts` | prompts for your own account — no words are supplied |");
  out.push("| `hearing_and_notice_instructions` | the mandatory notice and hearing, the no-fee rule, and what happens after filing |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| The record of final discharge — it establishes the date the two-year clock ran from; check the discharge date you write against it, and correct the packet if they disagree | the Criminal Division of the Superior Court in the county that handled the case |");
  out.push("| Your Vermont Crime Information Center conviction record — it establishes the ten-year listed-crime lookback statewide; check the lookback statement against it; VCIC charges a fee, confirmed with VCIC | Vermont Crime Information Center |");
  out.push("| A Restitution Unit statement showing nothing is owed — § 5119(m) bars sealing while restitution or surcharges are outstanding; check your answer about what is owed against it | the Restitution Unit of the Vermont Center for Crime Victim Services |");
  out.push("| Whatever you choose to put before the Court on rehabilitation — nothing is required by the statute, and nothing you gather is received, inspected or vouched for | your own employers, educators, treatment providers or community references |");
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
  out.push("- **Your rehabilitation account.** § 5119(g)(3) makes rehabilitation the Court's own finding and your own burden; the controlling review lists it among the fields that must not be auto-completed. The prompts page helps you decide what to say; the words are yours.");
  out.push("- **Your signature and the date beside it.** No notarization is required by § 5119(g).");
  out.push("- **Any service page.** The notice to all parties of record is the Court's step under the section, so the packet invents no service mechanic.");
  out.push("- **Every fee figure.** No filing fee is payable (32 V.S.A. § 1431(e)); VCIC's record fee is confirmed with VCIC.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- the Court sets the hearing and your rehabilitation showing is contested — individualized advocacy, not form completion;");
  out.push("- any listed-crime conviction or delinquency adjudication sits in the ten-year lookback, or any such proceeding is pending;");
  out.push("- restitution or surcharges remain owed;");
  out.push("- you are unsure whether an offence is a listed crime under 13 V.S.A. § 5301;");
  out.push("- any immigration question is involved.", "");

  out.push("## After sealing", "");
  out.push("Sealed records may still appear in a federal criminal background check: Vermont relief does not reach federal records, even though VCIC notifies the FBI's National Crime Information Center.", "");

  out.push("## What this packet is not", "");
  out.push("A composed application, prompts and instructions — not an official form (Vermont publishes none for this), not legal advice, not filed for you, and no argument made for you.", "");
  out.push(`_Route: ${ROUTE.routeKeys[0]}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-vt_seal_under_25-set.mjs",
  jurisdiction: "VT",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/VT.memo.json, track vt_seal_under_25, "
    + "33 V.S.A. § 5119(g) read at source 2026-08-06) and the packet-set manifest "
    + "(data/record-clearing/legal-design-packet-set-manifests.json, vt_seal_under_25-set)",
  compositionSources: [
    "data/record-clearing/legal-design-intake/VT.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "The Vermont Judiciary publishes no form for a 33 V.S.A. § 5119(g) application — none appears in the "
    + "expungement page's form list and none was located in the forms library on 2026-08-06 — and the legal-design "
    + "record resolves the strategy to custom_pleading in terms: the statute supplies the court, the vehicle, the "
    + "findings and the relief, and the absence of a form is the express condition for drafting a controlled "
    + "pleading. The route is § 5119(g), not 13 V.S.A. § 7609 (an 18-to-21 provision) and not chapter 230; the "
    + "record documents that source correction with provenance.",
  routeSelectionNote:
    "The composed pages carry no route election: the application names § 5119(g) in its own title and body. The "
    + "statutory conditions — two years since final discharge, the ten-year listed-crime lookback with nothing "
    + "pending, the § 5119(m) restitution bar — are stated in the application as the applicant's own statements, "
    + "each checked against a named record (the discharge record, the VCIC record, the Restitution Unit balance) "
    + "with a printed do-not-file direction where one fails. The rehabilitation showing is the participant's own "
    + "account and is never auto-completed.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that any record is eligible for sealing under 33 V.S.A. § 5119(g), or that the Court will be satisfied of rehabilitation",
    "the Vermont Crime Information Center's current record fee, which is read live rather than stored",
    "how Vermont courts discharge the § 5119(k) assistance duty in practice"
  ],
  buildFindings: [
    {
      finding:
        "The Vermont Judiciary publishes no form for a § 5119(g) application, and the controlling review recorded "
        + "the missing form as a blocker; the legal-design record carries it as a release blocker rather than a "
        + "build blocker because the statute supplies the court, the vehicle, the three findings and the relief, "
        + "making a controlled pleading supportable rather than a guess.",
      consequence:
        "The application is composed to the statute's own conditions and ends at state_built; whether the packet "
        + "should instead be a completed official form, should the Judiciary publish one, travels with the family "
        + "as a counsel question."
    },
    {
      finding:
        "The under-25 route is 33 V.S.A. § 5119(g) — an application, dual-initiated, with mandatory notice to all "
        + "parties of record and a hearing, a two-year clock from final discharge, a ten-year listed-crime "
        + "lookback, and the § 5119(m) restitution bar — not 13 V.S.A. § 7609 and not chapter 230. The record "
        + "documents this source correction with provenance.",
      consequence:
        "The packet is built on § 5119(g) alone; the instructions state the chapter-230 differences plainly, and "
        + "the notice step is left to the Court because the statute assigns it there — no service mechanic is "
        + "invented."
    },
    {
      finding:
        "Section 5119(g)(3) places an affirmative rehabilitation burden on the applicant, found to the Court's own "
        + "satisfaction, and the controlling review lists rehabilitation evidence on the under-25 route among the "
        + "fields that must not be auto-completed.",
      consequence:
        "The rehabilitation account is a labelled blank on the application's own face, prompted by a dedicated "
        + "page that supplies structure but no words; a contested showing is a printed stop condition routing to "
        + "counsel before the hearing."
    },
    {
      finding:
        "Under 32 V.S.A. § 1431(e) the $90 sealing fee applies only to a motion to seal a DUI record and expressly "
        + "not to a § 5119(g) motion, while VCIC charges a fee for the participant's own conviction record whose "
        + "amount the record directs be read live rather than stored.",
      consequence:
        "The packet states the no-filing-fee rule from the statute and publishes no VCIC figure, naming VCIC as "
        + "the authority for its own current amount."
    },
    {
      finding:
        "Section 5119(k) obliges the court to provide assistance to persons who seek to file an application under "
        + "the section, and how courts discharge that duty in practice is a recorded open question.",
      consequence:
        "The instructions tell the participant to ask the Criminal Division clerk's office what assistance the "
        + "court provides, and the open question travels with the family rather than being answered by guess."
    }
  ],
  counselQuestions: [
    "Whether the composed § 5119(g) application is sufficient where the Judiciary publishes no form — and, should the Judiciary publish one, whether the packet should become a completed official form instead (the recorded release blocker).",
    "Whether the application's statement structure for the three § 5119(g) findings — two years since final discharge, the ten-year listed-crime lookback with nothing pending, and the rehabilitation account left wholly to the applicant — matches how Criminal Division judges expect the showing to be made.",
    "How Vermont courts discharge the § 5119(k) assistance duty in practice, and whether that assistance changes what this self-help packet should contain or hand off.",
    "Confirmation that no notice or service step belongs to the applicant, given that § 5119(g) assigns notice to all parties of record to the Court."
  ],
  reviewerAttention: [
    "The rehabilitation lines are never auto-completed and the prompts page supplies no words; confirm that boundary is legible on the paper.",
    "The application prints do-not-file directions beside the lookback and restitution statements; confirm those read as participant checks, not platform certifications.",
    "The packet carries no service page by design — § 5119(g) assigns the notice to the Court; confirm no reviewer expects one.",
    "Sealed records may still appear in federal background checks; the disclosure is printed in the instructions."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
