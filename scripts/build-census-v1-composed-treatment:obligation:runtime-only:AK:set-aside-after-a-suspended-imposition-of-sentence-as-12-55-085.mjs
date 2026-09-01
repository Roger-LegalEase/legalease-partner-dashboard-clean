#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — Alaska belated SIS set-aside.
 *
 *   node "scripts/build-census-v1-composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * The MASTER_QUEUE row is SOURCE_READY with sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE and no bound
 * binary — which is not a gap: the route contract
 * (src/lib/legal-authority/routes/national-report-batch-b.json,
 * AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085,
 * decision NATIONAL-2026-08-28-B-AK-01) records that "no Alaska Court System
 * form specific to a post-discharge request was located", and the controlling
 * 2026-08-28 national legal decision (Alaska — ak-set-aside) resolves the
 * product in terms: OUTPUT: CUSTOM ORIGINAL-CASE MOTION, destination the
 * sentencing court, service on the prosecutor, contested case to counsel.
 * The correct deliverable is therefore a composed motion packet — "the custom
 * motion, filed in the original sentencing criminal case and not as a new
 * civil petition" — and this build composes exactly the components the route
 * contract names: the motion, the subsection (f) exclusions statement, the
 * compliance-and-rehabilitation-at-discharge statement, prosecutor service,
 * the proposed order, and instructions carrying the recorded warning that a
 * set-aside does not physically erase the historical court file.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those. Every case fact — the original criminal case number, the
 * sentencing court, the SIS order date, the discharge date, the offense — is
 * a labelled dotted blank declared REQUIRED_BEFORE_FILING, disclosed by its
 * printed label, with the office of the court that sentenced the participant
 * named as the checkable authority for the case papers. No signature, no
 * signature date, no judicial field is ever written. The proposed order is
 * rendered with every decision and signature line blank, because the order is
 * the court's to make. Service mechanics beyond "serve the prosecuting
 * attorney's office" are recorded nowhere, so they are delegated to the
 * office of the sentencing court by name rather than guessed.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading",
  jurisdiction: "AK",
  legalName: "Motion for Belated Determination and Set-Aside Under AS 12.55.085(e)",
  routeName: "asking the original Alaska sentencing court for a belated set-aside determination after a suspended imposition of sentence, under AS 12.55.085(e)",
  statutes: ["AS 12.55.085(e)", "AS 12.55.085(f)"],
  routes: [{ routeKey: "obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085" }],

  records: [
    {
      recordId: "route-contract:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
      path: "src/lib/legal-authority/routes/national-report-batch-b.json",
      role: "the committed route contract: mechanism, timing, exclusions, the packet components this build composes, and the recorded absence of an official form",
      mustContain: [
        "Motion for Belated Determination and Set-Aside Under AS 12.55.085(e)",
        "the custom motion, filed in the original sentencing criminal case and not as a new civil petition",
        "where discharge occurred without a set-aside decision, Alaska appellate law permits a belated determination focused on the circumstances that existed when probation was discharged",
        "An offense within the AS 12.55.085(f) exclusions is outside this route",
        "A set-aside already determined at discharge is not re-litigated here",
        "the subsection (f) exclusions statement",
        "prosecutor service instructions",
        "the proposed order",
        "the instruction that a set-aside does not physically erase the historical court file",
        "pending: no Alaska Court System form specific to a post-discharge request was located"
      ]
    },
    {
      recordId: "legal-decision:2026-08-28:ak-set-aside",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role: "the controlling 2026-08-28 legal decision resolving the product to a custom original-case motion with prosecutor service and attorney handoff for contested cases",
      mustContain: [
        "CUSTOM ORIGINAL-CASE MOTION",
        "instructions explaining that a set-aside does not physically erase the historical court file",
        "Use counsel where the State alleges probation violations, the court previously denied set-aside relief, the discharge status is disputed, the offense may fall within subsection (f)"
      ]
    }
  ],

  components: [
    "primary_filing",
    "subsection_f_exclusions_statement",
    "compliance_at_discharge_statement",
    "prosecutor_service",
    "proposed_order",
    "filing_instructions"
  ],
  componentTitles: {
    primary_filing: "Motion for Belated Determination and Set-Aside Under AS 12.55.085(e)",
    subsection_f_exclusions_statement: "Statement Addressing the Exclusions in AS 12.55.085(f)",
    compliance_at_discharge_statement: "Statement of Compliance and Rehabilitation as of Discharge",
    prosecutor_service: "Copy for the Prosecuting Attorney's Office",
    proposed_order: "Proposed Order Setting Aside the Conviction Under AS 12.55.085(e)",
    filing_instructions: "Filing Instructions"
  },
  componentConditions: {},
  componentDescriptions: {
    primary_filing: "the composed motion, filed in the original sentencing criminal case and not as a new civil petition",
    subsection_f_exclusions_statement: "your statement addressing the AS 12.55.085(f) exclusions, filed with the motion",
    compliance_at_discharge_statement: "your statement of compliance and rehabilitation as of the date probation was discharged, filed with the motion",
    prosecutor_service: "the copy that goes to the prosecuting attorney's office for the case",
    proposed_order: "the proposed order the court may sign; every decision and signature line is the court's and is left blank",
    filing_instructions: "where each page goes, in what order, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Denali Street, Anchorage, AK 99501",
      "participant.phone": "907-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Turnagain Crossing Road, Apartment 14B, Fairbanks, Alaska 99701-2214",
      "participant.phone": "(907) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the committed route contract (src/lib/legal-authority/routes/national-report-batch-b.json, "
    + "AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085) and the controlling 2026-08-28 national "
    + "legal decision (data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json, Alaska ak-set-aside), "
    + "both bound by SHA-256 and anchor-verified at build time",

  formIdentityNote:
    "No official Alaska Court System form exists for a post-discharge set-aside request: the committed route "
    + "contract records 'pending: no Alaska Court System form specific to a post-discharge request was located', "
    + "and the controlling 2026-08-28 legal decision resolves the output to a CUSTOM ORIGINAL-CASE MOTION. Every "
    + "page in this packet is therefore composed by this build from those committed records; no form was "
    + "substituted and none was invented. The motion is captioned for the ORIGINAL sentencing criminal case, "
    + "because the recorded rule is that producing it as a new civil petition would file it in the wrong proceeding.",

  routeSelectionNote:
    "One route, one instrument set: every component belongs to the single AS 12.55.085(e) belated set-aside "
    + "route, and the motion states its statutory basis in its own title and body. No election control exists on "
    + "any composed page and no route choice is left to the participant.",

  instructionsIntro: [
    "Alaska law lets a person who received a suspended imposition of sentence (SIS), and who was discharged from probation without the set-aside decision being made, ask the original sentencing court for a belated determination. The recorded rule this packet is built on: \"where discharge occurred without a set-aside decision, Alaska appellate law permits a belated determination focused on the circumstances that existed when probation was discharged.\" The motion is filed in your ORIGINAL criminal case, in the court that sentenced you — never as a new civil case.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to your court record, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory."
  ],
  instrumentChoice: null,
  documentsToObtain: [
    ["Your discharge order and probation-completion record", "the office of the court that sentenced you (the original criminal case file)"],
    ["The judgment and sentencing documents from the original case", "the office of the court that sentenced you"],
    ["Evidence concerning your compliance and rehabilitation as of the date of discharge", "your own records; the route contract makes this a named attachment, and what to include is yours to decide from what you have"]
  ],
  steps: [
    "**Gather the case records** listed above. The motion is decided on the circumstances that existed when probation was discharged, so the discharge order and probation-completion record are the heart of the filing.",
    "**Fill in every dotted blank** this packet's instructions list, from those records. Do not guess a date, a case number or an offense wording.",
    "**Write your two statements yourself** — the AS 12.55.085(f) exclusions statement and the compliance-and-rehabilitation statement. The packet prints labelled lines and asserts nothing on your behalf.",
    "**Sign and date the motion and each statement yourself.** The platform never signs for you and never dates a signature.",
    "**File in the original criminal case** with the court that sentenced you. This packet states no filing fee because no committed record this packet is built from states one; ask the office of the sentencing court whether one applies.",
    "**Serve the prosecuting attorney's office** with a copy, using the service page. The committed records name the prosecutor as the office served but record no delivery method; ask the office of the sentencing court how service must be made, and use that method.",
    "**Keep the proposed order unsigned.** It travels with the motion for the court's convenience; every decision on it is the court's."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually served — would be false.",
    "**Every line of the proposed order that decides anything**, including the court's signature and date. The order is the court's to make.",
    "**Both statements' content lines.** The packet prints your own account and asserts nothing about your compliance, your rehabilitation, or whether the offense falls within AS 12.55.085(f)."
  ],
  notTold: [
    "**Whether a filing fee applies, and how service on the prosecuting attorney's office must be made.** Neither is established by the committed records this packet is built from. The office of the court that sentenced you is the authority that can answer both — ask before you file or serve.",
    "**Whether your offense falls within the AS 12.55.085(f) exclusions.** The recorded rule is only that an offense within those exclusions is outside this route; whether yours is within them is a legal question this packet does not answer."
  ],
  stopConditions: [
    "the State alleges probation violations — the recorded self-help boundary says a contested compliance record is advocacy about the facts at discharge, not a form to fill in;",
    "the court previously denied set-aside relief;",
    "your discharge status is disputed or unclear;",
    "the offense may fall within the AS 12.55.085(f) exclusions;",
    "you want to litigate constitutional or collateral consequences beyond the statutory set-aside;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed pleadings and process pages. It is not an official Alaska Court System "
    + "form — the committed records this packet is built from record that none exists for a post-discharge "
    + "request, which is why these pages are composed — and it is not legal advice, it is not filed for you, and "
    + "it does not decide whether the court will grant the set-aside. A set-aside does not physically erase the "
    + "historical court file: that instruction is carried from the committed route contract, and this packet "
    + "promises no erasure.",

  receiptDoesNotEstablish: [
    "that any particular offense is outside the AS 12.55.085(f) exclusions",
    "that a set-aside erases or removes the historical court file — the committed records state it does not"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: the committed route "
        + "contract records that no Alaska Court System form specific to a post-discharge request was located, and "
        + "the controlling 2026-08-28 legal decision resolves the output to a CUSTOM ORIGINAL-CASE MOTION.",
      consequence:
        "Every component is composed by this build from the two committed records, each bound by SHA-256 and "
        + "anchor-verified before composing. No form was substituted and none was invented."
    },
    {
      finding:
        "The recorded rule places the motion in the ORIGINAL sentencing criminal case: 'the custom motion, filed "
        + "in the original sentencing criminal case and not as a new civil petition'.",
      consequence:
        "The motion's caption carries the original criminal case number as a required-before-filing blank, and the "
        + "instructions repeat the recorded warning that filing it as a new civil petition would put it in the "
        + "wrong proceeding."
    },
    {
      finding:
        "The committed records name the prosecutor as the office served but record no delivery method, no filing "
        + "fee and no local formatting rule.",
      consequence:
        "The service page names its recipient class from the record and delegates the mechanics to the office of "
        + "the sentencing court by name. No method, no fee figure and no local requirement was guessed."
    },
    {
      finding:
        "The route contract names 'evidence concerning compliance and rehabilitation as of discharge' and a "
        + "statement addressing the subsection (f) exclusions as packet components, and both are participant "
        + "assertions the platform cannot make.",
      consequence:
        "Both are rendered as labelled statement pages whose content lines are entirely the participant's, "
        + "declared REQUIRED_BEFORE_FILING and disclosed in participant-instructions.md. The packet asserts "
        + "nothing about compliance, rehabilitation, or the (f) exclusions."
    }
  ],
  counselQuestions: [
    "The composed motion asserts the AS 12.55.085(e) belated-determination ground in the committed records' own words (discharge occurred without a set-aside decision; the determination focuses on the circumstances at discharge). Confirm the composed instrument is sufficient where no official form exists.",
    "The route contract names Journey v. State, 895 P.2d 955 (Alaska 1995) context via the compiled profile ('set-aside is NOT expungement'), and the instructions carry the recorded no-erasure warning. Confirm the warning's wording is sufficient.",
    "No committed record states a filing fee or a service method for the original-case motion; the packet delegates both to the office of the sentencing court. Confirm the delegation or supply the content.",
    "The subsection (f) exclusions statement is left entirely to the participant with a stop condition where the offense may fall within (f). Confirm that presentation."
  ],
  reviewersAttention: [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const dob = facts["participant.date_of_birth"];
    const address = facts["participant.street_address"];
    const phone = facts["participant.phone"];
    const email = facts["participant.email"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "primary_filing") {
      L.push("IN THE ............................................................ COURT FOR THE STATE OF ALASKA");
      L.push("AT ..........................................................");
      L.push("(THE COURT THAT SENTENCED YOU IN THE ORIGINAL CRIMINAL CASE, AND ITS LOCATION - the office of that court can confirm both)", "");
      L.push("STATE OF ALASKA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Original criminal case number:");
      L.push(DOTS(), "");
      L.push("MOTION FOR BELATED DETERMINATION AND SET-ASIDE UNDER AS 12.55.085(e)", "");
      L.push(`1. The defendant, ${name}, received a suspended imposition of sentence under AS 12.55.085 in this case, and states that discharge from probation occurred without a set-aside determination being made.`, "");
      L.push("Offense in this case, worded exactly as the judgment words it:");
      L.push(DOTS(), "");
      L.push("Date of the order suspending imposition of sentence, from the court record:");
      L.push(DOTS(), "");
      L.push("Date probation was discharged, from the discharge order:");
      L.push(DOTS(), "");
      L.push(`2. This motion is filed in the original sentencing criminal case, and not as a new civil petition, because that is where the recorded rule places it.`, "");
      L.push("3. Where discharge occurred without a set-aside decision, Alaska appellate law permits a belated determination focused on the circumstances that existed when probation was discharged. The defendant asks this Court to make that belated determination and to set aside the conviction under AS 12.55.085(e), on the circumstances that existed when probation was discharged.", "");
      L.push("4. Filed with this motion are: the statement addressing the exclusions in AS 12.55.085(f); the statement of compliance and rehabilitation as of discharge; the discharge order and probation-completion record; the judgment and sentencing documents; and a proposed order. This motion asks nothing that was already determined: a set-aside already determined at discharge is not re-litigated here.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(The defendant signs and dates this motion personally. Nothing on this page is signed or dated for the defendant.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`DATE OF BIRTH: ${dob}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else if (componentId === "subsection_f_exclusions_statement") {
      L.push(`For: ${name}`);
      L.push("Filed with: the Motion for Belated Determination and Set-Aside Under AS 12.55.085(e) in this packet.", "");
      L.push("The recorded rule this packet is built on states: an offense within the AS 12.55.085(f) exclusions is outside this route. This page is your own statement addressing those exclusions. The packet asserts nothing about whether your offense falls within AS 12.55.085(f); if you believe it may, stop and take this packet to a lawyer instead of filing.", "");
      L.push("Your own statement addressing the exclusions in AS 12.55.085(f) (state only what you know first-hand; nothing on these lines is written for you):");
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(You sign and date this statement personally.)");
    } else if (componentId === "compliance_at_discharge_statement") {
      L.push(`For: ${name}`);
      L.push("Filed with: the Motion for Belated Determination and Set-Aside Under AS 12.55.085(e) in this packet.", "");
      L.push("The belated determination focuses on the circumstances that existed when probation was discharged. This page is your own statement of compliance and rehabilitation as of that date, and the place to list the evidence you attach - the route contract names 'evidence concerning compliance and rehabilitation as of discharge' as a component of this packet, and what to include is yours to decide from what you have.", "");
      L.push("Your own statement of compliance and rehabilitation as of the date probation was discharged:");
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("List of the evidence you attach in support (attach copies, never originals):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(You sign and date this statement personally.)");
    } else if (componentId === "prosecutor_service") {
      L.push("To: the prosecuting attorney's office for the original criminal case.", "");
      L.push(`Enclosed is a copy of the Motion for Belated Determination and Set-Aside Under AS 12.55.085(e) filed by ${name} in the original criminal case, with its statements and proposed order.`, "");
      L.push("HOW THIS COPY MUST BE DELIVERED IS NOT STATED HERE. The committed records this packet is built from name the prosecutor as the office served and record no delivery method, and a guessed mechanic in a filing instruction is worse than none. Before you serve this copy, ask the office of the court that sentenced you how service on the prosecuting attorney's office must be made, and use that method.", "");
      L.push("NAME AND MAILING ADDRESS OF THE PROSECUTING OFFICE SERVED");
      L.push("(you write it here before service; the office of the sentencing court can provide it)");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("DATE OF SERVICE OF THE COPY " + DOTS(48));
      L.push("SIGNATURE OF DEFENDANT " + DOTS(52), "");
      L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed by the defendant when the copy actually goes out, in the manner the office of the sentencing court directs. A date or a signature written before the copy goes out would be false.");
    } else if (componentId === "proposed_order") {
      L.push("IN THE ............................................................ COURT FOR THE STATE OF ALASKA");
      L.push("AT ..........................................................", "");
      L.push("STATE OF ALASKA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Original criminal case number:");
      L.push(DOTS(), "");
      L.push("PROPOSED ORDER", "");
      L.push("This matter came before the Court on the defendant's Motion for Belated Determination and Set-Aside Under AS 12.55.085(e). The Court, having considered the motion and the circumstances that existed when probation was discharged,", "");
      L.push("ORDERS that the determination is made and the conviction is " + DOTS(24) + " under AS 12.55.085(e).", "");
      L.push("(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the motion for the Court's convenience; nothing on it is completed, decided, signed or dated by the defendant or by this packet.)", "");
      L.push("DATED " + DOTS(30), "");
      L.push(DOTS(50));
      L.push("(The court signs here if, and only if, it grants the motion.)");
    } else {
      L.push(`This packet is prepared for ${this.routeName}.`, "");
      L.push(`Prepared for: ${name}`, "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Gather the case records: the discharge order and probation-completion record, and the judgment and sentencing documents, from the office of the court that sentenced you. The belated determination focuses on the circumstances that existed when probation was discharged, so those records are the heart of the filing.");
      L.push("STEP TWO. Fill in every dotted blank this packet's participant instructions list, from those records. Do not guess a date, a case number or an offense wording.");
      L.push("STEP THREE. Write your two statements yourself: the AS 12.55.085(f) exclusions statement and the compliance-and-rehabilitation statement. Attach copies of your supporting evidence, never originals.");
      L.push("STEP FOUR. Sign and date the motion and each statement yourself.");
      L.push("STEP FIVE. File in the ORIGINAL criminal case with the court that sentenced you - never as a new civil case. This packet states no filing fee because no committed record it is built from states one; ask the office of the sentencing court whether one applies.");
      L.push("STEP SIX. Serve the prosecuting attorney's office with a copy, using the service page, in the manner the office of the sentencing court directs.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("Stop, and take this packet to a lawyer, if any of these is true:");
      L.push("- the State alleges probation violations - a contested compliance record is advocacy about the facts at discharge, not a form to fill in;");
      L.push("- the court previously denied set-aside relief;");
      L.push("- your discharge status is disputed or unclear;");
      L.push("- the offense may fall within the AS 12.55.085(f) exclusions;");
      L.push("- you want to litigate constitutional or collateral consequences beyond the statutory set-aside;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT A SET-ASIDE IS, AND IS NOT", "");
      L.push("A set-aside does not physically erase the historical court file. That instruction is carried from the committed route contract this packet is built from, and this packet promises no erasure. What further effect a set-aside has on any particular background check is not stated here, because no committed record this packet is built from states it.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed pleadings and process pages. It is not an official Alaska Court System form - the committed records record that none exists for a post-discharge request, which is why these pages are composed - and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant the set-aside.");
    }
    L.push("", `Route: ${this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "primary_filing") {
      writes.push(
        h.write("defendant_name", "Defendant named in the caption of this motion", "participant.full_legal_name"),
        h.write("date_of_birth", "Defendant's date of birth in the contact block at the foot of the motion", "participant.date_of_birth"),
        h.write("mailing_address", "Mailing address of the defendant in the contact block at the foot of the motion", "participant.street_address"),
        h.write("telephone", "Telephone number of the defendant in the contact block at the foot of the motion", "participant.phone"),
        h.write("email", "Email address of the defendant in the contact block at the foot of the motion", "participant.email")
      );
      refusals.push(
        h.rbf("sentencing_court", "Court named in the caption - the court that sentenced you in the original criminal case, and its location",
          "the name and location of the court that sentenced you - the office of that court can confirm both",
          "the original case lives in the sentencing court's file, and which court that is belongs to the participant's record"),
        h.rbf("original_case_number", "Original criminal case number in the caption of the motion",
          "the case number of the original criminal case, copied from the judgment or the discharge order",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("offense_description", "Offense in this case, worded exactly as the judgment words it",
          "the offense, worded exactly as the judgment words it",
          "no offense fact is held for a record the platform has not seen"),
        h.rbf("sis_order_date", "Date of the order suspending imposition of sentence, from the court record",
          "the date of the SIS order, copied from the court record",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("discharge_date", "Date probation was discharged, from the discharge order",
          "the date probation was discharged, copied from the discharge order",
          "no disposition fact is held for a record the platform has not seen"),
        h.protectedBlank("defendant_signature", "Signature of the defendant on the motion",
          "the defendant signs the motion personally"),
        h.protectedBlank("signature_date", "Date beside the defendant's signature on the motion",
          "a date written before the motion is signed would be false")
      );
    } else if (componentId === "subsection_f_exclusions_statement") {
      writes.push(h.write("defendant_name", "Defendant named on this statement page", "participant.full_legal_name"));
      refusals.push(
        h.rbf("exclusions_statement", "Your own statement addressing the exclusions in AS 12.55.085(f)",
          "your own first-hand statement addressing the AS 12.55.085(f) exclusions - if you believe the offense may fall within them, stop and get legal help instead of filing",
          "whether an offense falls within the (f) exclusions is an assertion the platform cannot make for the participant"),
        h.protectedBlank("statement_signature", "Signature of the defendant on the statement",
          "the defendant signs the statement personally"),
        h.protectedBlank("statement_signature_date", "Date beside the defendant's signature on the statement",
          "a date written before the statement is signed would be false")
      );
    } else if (componentId === "compliance_at_discharge_statement") {
      writes.push(h.write("defendant_name", "Defendant named on this statement page", "participant.full_legal_name"));
      refusals.push(
        h.rbf("compliance_statement", "Your own statement of compliance and rehabilitation as of the date probation was discharged",
          "your own first-hand account of compliance and rehabilitation as of the discharge date",
          "the platform prints the participant's own account and asserts nothing about compliance or rehabilitation"),
        h.rbf("evidence_list", "List of the evidence you attach in support",
          "a list of the evidence you attach - the route contract names evidence concerning compliance and rehabilitation as of discharge as a component, and what to include is yours to decide",
          "what evidence exists is a fact of the participant's own records, which the platform has not seen"),
        h.protectedBlank("statement_signature", "Signature of the defendant on the statement",
          "the defendant signs the statement personally"),
        h.protectedBlank("statement_signature_date", "Date beside the defendant's signature on the statement",
          "a date written before the statement is signed would be false")
      );
    } else if (componentId === "prosecutor_service") {
      writes.push(h.write("defendant_name", "Defendant named on this service page", "participant.full_legal_name"));
      refusals.push(
        h.rbf("prosecuting_office_address", "Name and mailing address of the prosecuting office served",
          "the name and mailing address of the prosecuting attorney's office for the original case - the office of the sentencing court can give it to you",
          "the platform holds no address for the prosecuting office and the participant writes it before service"),
        h.protectedBlank("service_date", "Date of service of the copy",
          "a date written before the copy is actually served would be false"),
        h.protectedBlank("service_signature", "Signature of the defendant on the service page",
          "the defendant signs this page when the copy actually goes out")
      );
    } else if (componentId === "proposed_order") {
      writes.push(h.write("defendant_name", "Defendant named in the caption of the proposed order", "participant.full_legal_name"));
      refusals.push(
        h.rbf("order_court_name", "Court named in the caption of the proposed order, and its location",
          "the same court name and location you wrote in the motion's caption",
          "the proposed order travels with the motion and carries the same caption the participant establishes"),
        h.rbf("order_case_number", "Original criminal case number in the caption of the proposed order",
          "the same original criminal case number you wrote in the motion's caption",
          "no case identifier is held for a record the platform has not seen"),
        h.clerkBlank("order_determination", "The determination line of the proposed order, decided by the court",
          "every decision on the proposed order is the court's"),
        h.clerkBlank("order_signature", "Signature line of the proposed order, for the court",
          "the court signs the order if, and only if, it grants the motion"),
        h.clerkBlank("order_date", "Date line of the proposed order, for the court",
          "the court dates the order when it decides")
      );
    } else {
      writes.push(h.write("defendant_name", "Defendant named on this page", "participant.full_legal_name"));
    }
    return { writes, refusals };
  }
};

/* ============================================================================
 * SHARED COMPOSED-TREATMENT BUILD CORE (identical across the FABLE-B12
 * composed-treatment builders; adapted from the working pattern in
 * scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs).
 *
 * Everything above this line is the family's own: its committed-record
 * bindings, its composed bodies, its field maps, its instructions content.
 * Everything below is family-independent plumbing: deterministic rendering,
 * byte proof, the builder's own count of the nine completeness counters, and
 * the census-v1 output records.
 * ========================================================================== */
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

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
export const DOTS = (n = 84) => ".".repeat(n);

/* ---- committed-record binding ------------------------------------------------ *
 * This family binds no Master Library binary: its sourceStatus is
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT and its authority is a set of COMMITTED
 * repository records — the route contract, the controlling legal decision and
 * the legal-design record named in SPEC.records. Each is bound by exact
 * SHA-256 at build time, and each anchor string is a statement this build
 * RELIES ON, re-read from the committed bytes before anything is composed.
 * The build refuses if a record is missing or an anchor is no longer there.
 */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing });
      continue;
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length
    });
  }
  return { resolved, failures };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
export function sanitizePdfText(text) {
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

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    clerkBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why) => ({
      ...base(id, label),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const h = mapHelpers(componentId);
  const { writes, refusals } = SPEC.mapFor(componentId, h);
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: SPEC.composedFromNote,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------- *
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

/* ---- the builder's own count of the nine counters ----------------------------- */
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

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
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
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  if (SPEC.instrumentChoice) {
    out.push(`## ${SPEC.instrumentChoice.heading}`, "");
    for (const p of SPEC.instrumentChoice.intro) out.push(p, "");
    out.push("| Instrument | When it is yours |", "| --- | --- |");
    for (const [instr, when] of SPEC.instrumentChoice.rows) out.push(`| ${instr} | ${when} |`);
    out.push("");
    for (const p of SPEC.instrumentChoice.footnotes ?? []) out.push(p, "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain before filing", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${SPEC.componentTitles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help instead of filing", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeKey).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveRecords();
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = SPEC.components.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of SPEC.components) {
      const body = SPEC.composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
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
      documents, components: SPEC.components
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
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod: "committed repository records bound by exact SHA-256 at build time, with every relied-on statement re-read from the committed bytes as an anchor before composing",
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    /* Bound as committedRecords, not documents: these are the AUTHORITY this
     * family composes from, not documents of the packet, and no rendered
     * artifact should be expected to carry them. */
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role,
      anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family composes for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey), renderStrategy: "composed_pleading",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — this family composes from committed records; no official binary is bound and none is included",
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: SPEC.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundReferenceSource: null,
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent.",
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
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
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
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: SPEC.buildFindings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    components: SPEC.components,
    documents: SPEC.components,
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
