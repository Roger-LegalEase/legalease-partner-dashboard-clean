#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — South Dakota SDCL § 23A-27-17
 * sealing-enforcement instruments (SIS discharge and dismissal).
 *
 *   node "scripts/build-census-v1-composed-treatment:sd_sis_sealing.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, TWO routes:
 *
 *   obligation:decision-branch:SD:sd_sis_sealing:written_implementation_request
 *   obligation:decision-branch:SD:sd_sis_sealing:original_case_enforcement_motion
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * SDCL § 23A-27-17, read at the official publication and recorded in
 * SD.memo.json (track sd_sis_sealing): "Upon the discharge and dismissal a
 * court SHALL order that all official records, other than the nonpublic
 * records retained by the Division of Criminal Investigation, be sealed" —
 * sealing is the court's own mandatory duty on discharge and dismissal after
 * a suspended imposition of sentence, and no participant motion triggers it.
 * The memo left one question open as a release blocker: the remedy where the
 * court did not do what the statute directs. The controlling 2026-08-28
 * decision (Q-044) answers it in terms: "written implementation request in
 * original case → motion to enforce § 23A-27-17 if not corrected → attorney
 * handoff for refusal or mandamus"; "The initial written request should
 * attach the discharge/dismissal order and ask the clerk or sentencing judge
 * to enter and implement the statutorily required sealing order. If judicial
 * relief is needed, file in the original criminal docket." It adds: "an
 * enforcement-motion template may be built", and "Do not use a form designed
 * for a separate arrest-expungement statute as a fallback" — so the UJS
 * arrest-expungement forms are not this family's instruments. Custom
 * pleading is therefore the correct deliverable, and this build composes
 * exactly the two instruments the decision names.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:sd_sis_sealing";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:sd_sis_sealing.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/sd/composed-treatment:sd-sis-sealing--custom-pleading",
  jurisdiction: "SD",
  legalName: "Enforcement Instruments for Mandatory Sealing on Discharge and Dismissal After a Suspended Imposition of Sentence, SDCL § 23A-27-17",
  routeName: "asking the original South Dakota court to enter and implement the mandatory SDCL § 23A-27-17 sealing order it did not enter after your discharge and dismissal",
  statutes: ["SDCL § 23A-27-17", "SDCL § 23A-27-13", "SDCL § 23A-27-14"],
  routes: [
    { routeKey: "obligation:decision-branch:SD:sd_sis_sealing:written_implementation_request" },
    { routeKey: "obligation:decision-branch:SD:sd_sis_sealing:original_case_enforcement_motion" }
  ],
  componentRoutes: {
    implementation_request: "obligation:decision-branch:SD:sd_sis_sealing:written_implementation_request",
    enforcement_motion: "obligation:decision-branch:SD:sd_sis_sealing:original_case_enforcement_motion"
  },

  records: [
    {
      recordId: "legal-decision:2026-08-28:Q-044:sd_sis_sealing",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role: "the controlling Q-044 decision: the mandatory-duty holding, the two-step escalation this family implements, the enforcement-motion authorization, and the prohibition on arrest-expungement-form fallback",
      mustContain: [
        "Sealing under SDCL § 23A-27-17 is the court’s mandatory duty when a person is discharged and the matter dismissed under § 23A-27-14. There is no ordinary participant motion that triggers the initial sealing.",
        "written implementation request in original case",
        "motion to enforce § 23A-27-17 if not corrected",
        "The initial written request should attach the discharge/dismissal order and ask the clerk or sentencing judge to enter and implement the statutorily required sealing order. If judicial relief is needed, file in the original criminal docket.",
        "Do not use a form designed for a separate arrest-expungement statute as a fallback.",
        "an enforcement-motion template may be built, but a contested court refusal is"
      ]
    },
    {
      recordId: "legal-design-intake:SD:sd_sis_sealing",
      path: "data/record-clearing/legal-design-intake/SD.memo.json",
      role: "the legal-design record: the statute's own words on the mandatory sealing order, the DCI carve-out, the restoration and perjury protection, and the teacher-licensing caveat",
      mustContain: [
        "Upon the discharge and dismissal a court SHALL order that all official records, other than the nonpublic records retained by the Division of Criminal Investigation, be sealed along with all records relating to the arrest, indictment or information, trial, finding of guilt, and dismissal and discharge.",
        "The order restores the person to the status occupied before arrest, indictment or information, and the person is not guilty of perjury or of giving a false statement for failing to recite or acknowledge the matter.",
        "a person who received a § 23A-27-13 order for such a conviction who is licensed or seeks licensure as a certified teacher may have the application refused or the licence revoked"
      ]
    }
  ],

  components: [
    "implementation_request",
    "enforcement_motion",
    "filing_instructions"
  ],
  componentTitles: {
    implementation_request: "Written Request to Implement Mandatory Sealing Under SDCL Sec. 23A-27-17",
    enforcement_motion: "Motion in the Original Criminal Case to Enforce SDCL Sec. 23A-27-17",
    filing_instructions: "Filing Instructions"
  },
  componentConditions: {
    enforcement_motion:
      "Used only AFTER the written request: the recorded escalation is the written implementation request in the "
      + "original case first, and the motion to enforce § 23A-27-17 only if the record is not corrected. A "
      + "contested court refusal, and mandamus, are recorded attorney handoffs, not steps in this packet."
  },
  componentDescriptions: {
    implementation_request: "the FIRST step: a written request in the original case asking that the statutorily required sealing order be entered and implemented, with your discharge and dismissal order attached",
    enforcement_motion: "the SECOND step: a motion filed in the original criminal docket to enforce the mandatory sealing duty, used only if the record is not corrected",
    filing_instructions: "the sequence, what sealing does and does not do, what this packet must never be used for, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Coteau Street, Pierre, SD 57501",
      "participant.phone": "605-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Vermillion Crossing Road, Apartment 14B, Sioux Falls, South Dakota 57105-2214",
      "participant.phone": "(605) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling Q-044 decision (data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json) "
    + "and the legal-design record (data/record-clearing/legal-design-intake/SD.memo.json, track sd_sis_sealing), "
    + "both bound by SHA-256 and anchor-verified at build time",

  formIdentityNote:
    "No participant form exists for the initial § 23A-27-17 sealing — the recorded holding is that sealing is the "
    + "court's mandatory duty on discharge and dismissal, with no ordinary participant motion — and the controlling "
    + "decision forbids the available-looking substitution: 'Do not use a form designed for a separate "
    + "arrest-expungement statute as a fallback', which keeps the UJS arrest-expungement packet out of this "
    + "family. Both enforcement instruments are composed by this build from the committed records, under the "
    + "decision's own authorization that 'an enforcement-motion template may be built'. No form was substituted "
    + "and none was invented.",

  routeSelectionNote:
    "Two routes, two instruments, one recorded escalation. The written request serves the "
    + "written_implementation_request route and the motion serves the original_case_enforcement_motion route; "
    + "each instrument names its own step on its face and the motion carries its after-the-request condition. "
    + "Which step a participant has reached turns on what happened to their own request, so the condition is "
    + "printed rather than elected, and neither instrument is selected for them.",

  instructionsIntro: [
    "The recorded South Dakota rule this packet is built on, in the statute's own words: \"Upon the discharge and dismissal a court SHALL order that all official records, other than the nonpublic records retained by the Division of Criminal Investigation, be sealed along with all records relating to the arrest, indictment or information, trial, finding of guilt, and dismissal and discharge.\" Sealing after a suspended imposition of sentence is the court's own duty — you apply for nothing to obtain it. This packet exists for one situation only: your discharge and dismissal issued, and the sealing did not happen.",
    "The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact belongs to your court record, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory."
  ],
  instrumentChoice: {
    heading: "Which page you use, and in what order",
    intro: ["This packet carries two instruments and the recorded escalation uses them in order:"],
    rows: [
      ["`implementation_request` — the written request", "FIRST, always: file it in the original case, with your discharge and dismissal order attached, once a public record search still shows the matter after your discharge and dismissal"],
      ["`enforcement_motion` — the motion in the original criminal docket", "only if the record is not corrected after the written request"]
    ],
    footnotes: [
      "If the court refuses after the motion, the recorded escalation is attorney handoff for refusal or mandamus — a lawyer's work, not another filing from this packet."
    ]
  },
  documentsToObtain: [
    ["The suspended imposition of sentence order, and the order of discharge and dismissal", "the office of the court in the original criminal case - these establish that the sealing duty was triggered, and the request attaches the discharge and dismissal order"],
    ["Evidence that the matter still appears on a public record search", "the public record source that still shows it - keep a dated copy"]
  ],
  steps: [
    "**Confirm the duty was triggered.** The recorded rule requires that you completed the court's conditions and that the court entered the order discharging you and dismissing the case. If the discharge and dismissal has not issued, stop: nothing here applies, and asking for sealing before discharge is asking for something the statute does not yet direct.",
    "**Get the two orders** — the SIS order and the discharge and dismissal order — from the office of the court in the original criminal case.",
    "**Fill in and file the written request in the original case**, attaching a copy of the discharge and dismissal order, exactly as the recorded escalation directs. Ask the office of that court how it accepts delivery, and use that method.",
    "**Only if the record is not corrected, file the enforcement motion** in the original criminal docket.",
    "**Sign and date each page yourself.** The platform never signs for you and never dates a signature.",
    "**Know what sealing does.** The recorded effect: the order restores you to the status you occupied before arrest, indictment or information, and you are not guilty of perjury or of giving a false statement for failing to recite or acknowledge the matter. And what it does not do: the nonpublic records retained by the Division of Criminal Investigation are expressly outside the sealing order — sealed does not mean invisible to law enforcement, prosecutors and courts."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.",
    "**The sealing order itself.** The statute makes it the court's order to enter; this packet drafts no order for the court and decides nothing for it.",
    "**What happened after your request.** Whether the record was corrected is a fact only you can state, and the motion asks you to state it in your own words."
  ],
  notTold: [
    "**Whether a filing fee applies, and how the request or motion must be delivered.** Neither is established by the committed records this packet is built from. The office of the court in the original criminal case is the authority that can answer both — ask before you file or send.",
    "**Whether your case was eligible for the suspended imposition of sentence in the first place.** A dispute about eligibility is a recorded attorney handoff, not a question this packet answers."
  ],
  stopConditions: [
    "the discharge and dismissal has not issued, or your court conditions are not complete, or your discharge status is unclear;",
    "the court refuses after the motion — the recorded escalation is attorney handoff for refusal or mandamus;",
    "eligibility is disputed in any way;",
    "the underlying conviction was under SDCL § 22-22-1 or § 22-22-7 and you hold or seek a South Dakota certified teaching licence — the recorded caveat is that the licensure authority may refuse or revoke notwithstanding the sealing, so get advice before relying on the seal;",
    "you are relying on sealing to erase the matter everywhere — the DCI's nonpublic records are expressly outside the order;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed enforcement instruments for one recorded failure branch. It is not an "
    + "arrest-expungement filing and must never be built from those forms — the recorded rule is 'Do not use a "
    + "form designed for a separate arrest-expungement statute as a fallback' — and it is not legal advice, not "
    + "filed for you, and not a promise that the court will act. Sealing restricts access; it does not erase the "
    + "DCI's nonpublic records, and it is not expungement.",

  receiptDoesNotEstablish: [
    "that any particular discharge and dismissal issued, or that the § 23A-27-17 duty was breached in any particular case",
    "that sealing reaches the DCI's nonpublic records — the statute's recorded words exclude them"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: the initial sealing is "
        + "the court's own mandatory act with no participant motion, and the controlling Q-044 decision resolves "
        + "the failure branch to a composed written request followed by a composed enforcement motion, stating "
        + "that 'an enforcement-motion template may be built'.",
      consequence:
        "Both instruments are composed from the committed records, each bound by SHA-256 and anchor-verified "
        + "before composing. The request attaches the discharge/dismissal order and asks that the statutorily "
        + "required sealing order be entered and implemented, exactly as the decision directs."
    },
    {
      finding:
        "The SD memo's own release-blocker question — the remedy where the discharge issued but the records were "
        + "not sealed — is answered by the committed Q-044 holding this family builds on.",
      consequence:
        "This build treats the question as CLOSED by that decision and composes its recorded answer; nothing here "
        + "rests on this builder's own legal judgment."
    },
    {
      finding:
        "The decision forbids using a form designed for a separate arrest-expungement statute as a fallback, and "
        + "the UJS arrest-expungement packet serves a different family.",
      consequence:
        "No UJS form is referenced as usable anywhere in this packet, and the prohibition is printed in the "
        + "filing instructions."
    },
    {
      finding:
        "The memo records two carve-outs a participant could mistake: the DCI's nonpublic records are expressly "
        + "outside the sealing order, and a § 22-22-1 / § 22-22-7 conviction may still be visible to the teaching "
        + "licensure authority notwithstanding §§ 23A-27-14 and 23A-27-17.",
      consequence:
        "Both are printed: the DCI carve-out in the instructions and the what-sealing-does step, and the "
        + "teacher-licensing caveat as a stop condition telling the participant to get advice before relying on "
        + "the seal."
    }
  ],
  counselQuestions: [
    "Both instruments assert the § 23A-27-17 mandatory duty in the statute's recorded words and follow the Q-044 escalation. Confirm the composed instruments are sufficient where no participant form exists.",
    "The request is styled as a filing in the original case asking that the sealing order be entered and implemented; the motion enforces it in the original criminal docket. Confirm the two-step presentation with the condition printed on the motion's face.",
    "No committed record states a filing fee or delivery method for either instrument; the packet delegates both to the office of the original court. Confirm the delegation or supply the content.",
    "The teacher-licensing caveat is presented as a stop condition rather than an eligibility bar. Confirm that presentation."
  ],
  reviewersAttention: [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family serves ONLY the two decision-branch enforcement routes; the initial sealing itself is the court's act and no instrument exists for it anywhere."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const address = facts["participant.street_address"];
    const phone = facts["participant.phone"];
    const email = facts["participant.email"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "implementation_request") {
      L.push("IN THE ............................................................ COURT");
      L.push("............................................................ COUNTY, SOUTH DAKOTA");
      L.push("(THE COURT IN THE ORIGINAL CRIMINAL CASE, AND ITS COUNTY - that court's own office can confirm both)", "");
      L.push("STATE OF SOUTH DAKOTA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Case number of the original criminal case:");
      L.push(DOTS(), "");
      L.push("WRITTEN REQUEST TO IMPLEMENT MANDATORY SEALING UNDER SDCL Sec. 23A-27-17", "");
      L.push(`1. The defendant, ${name}, received a suspended imposition of sentence in this case, completed the conditions the court ordered, and was discharged, and the case was dismissed. A copy of the order of discharge and dismissal is attached to this request.`, "");
      L.push("Date of the order of discharge and dismissal, from the attached order:");
      L.push(DOTS(), "");
      L.push("2. SDCL Sec. 23A-27-17 provides that upon the discharge and dismissal a court shall order that all official records, other than the nonpublic records retained by the Division of Criminal Investigation, be sealed, along with all records relating to the arrest, indictment or information, trial, finding of guilt, and dismissal and discharge.", "");
      L.push("3. The matter still appears on a public record search. My evidence of that (attach it - for example a dated printout of the public entry):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("4. THE REQUEST: I ask that the statutorily required sealing order be entered and implemented in this case, as SDCL Sec. 23A-27-17 directs. If the position of this court's office is that judicial action is required, please say so in writing.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(The defendant signs and dates this request personally. Nothing on this page is signed or dated for the defendant.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else if (componentId === "enforcement_motion") {
      L.push("USE THIS PAGE ONLY AFTER THE WRITTEN REQUEST. The recorded escalation is: first the written implementation request in the original case; then this motion, only if the record is not corrected. If the court refuses after this motion, the recorded next step is a lawyer - attorney handoff for refusal or mandamus - not another filing from this packet.", "");
      L.push("IN THE ............................................................ COURT");
      L.push("............................................................ COUNTY, SOUTH DAKOTA", "");
      L.push("STATE OF SOUTH DAKOTA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Case number of the original criminal case:");
      L.push(DOTS(), "");
      L.push("MOTION TO ENFORCE SDCL Sec. 23A-27-17", "");
      L.push(`1. The defendant, ${name}, received a suspended imposition of sentence in this case, completed the conditions the court ordered, and was discharged, and the case was dismissed. The order of discharge and dismissal is attached.`, "");
      L.push("Date of the order of discharge and dismissal:");
      L.push(DOTS(), "");
      L.push("2. Upon the discharge and dismissal, SDCL Sec. 23A-27-17 directs that the court shall order the official records sealed, other than the nonpublic records retained by the Division of Criminal Investigation. The matter still appears on a public record search, and a written implementation request was made in this case. What happened after that request (state it in your own words, and attach a copy of your request):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. THE REQUESTED RELIEF: the defendant asks the Court, in the original criminal docket, to enforce SDCL Sec. 23A-27-17 by entering and implementing the sealing order the statute directs.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(The defendant signs and dates this motion personally.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else {
      L.push(`This packet is prepared for ${this.routeName}.`, "");
      L.push(`Prepared for: ${name}`, "");
      L.push("THE ONE SITUATION THIS PACKET IS FOR", "");
      L.push("After a suspended imposition of sentence, when you complete the court's conditions and the court enters the discharge and dismissal, SDCL Sec. 23A-27-17 makes sealing the COURT'S duty: upon the discharge and dismissal a court shall order the official records sealed, other than the nonpublic records retained by the Division of Criminal Investigation. You apply for nothing to obtain it. This packet is only for the case where the discharge and dismissal issued and the sealing did not happen.", "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Confirm the duty was triggered: your conditions are complete and the order of discharge and dismissal issued. If it has not issued, stop - nothing here applies yet.");
      L.push("STEP TWO. Get the SIS order and the order of discharge and dismissal from the office of the court in the original criminal case, and keep dated evidence of the public record entry that still shows the matter.");
      L.push("STEP THREE. Complete and file the WRITTEN REQUEST in the original case, attaching a copy of the discharge and dismissal order. Ask the office of that court how it accepts delivery and whether any fee applies - no committed record this packet is built from states either.");
      L.push("STEP FOUR. Only if the record is not corrected, complete and file the ENFORCEMENT MOTION in the original criminal docket.");
      L.push("STEP FIVE. Sign and date each page yourself.", "");
      L.push("WHAT SEALING DOES, AND DOES NOT DO", "");
      L.push("The recorded effect: the order restores you to the status you occupied before arrest, indictment or information, and you are not guilty of perjury or of giving a false statement for failing to recite or acknowledge the matter. The recorded limits: the nonpublic records retained by the Division of Criminal Investigation are expressly outside the sealing order, and sealing is not expungement. If your underlying conviction was under SDCL Sec. 22-22-1 or Sec. 22-22-7 and you hold or seek a certified teaching licence, the recorded caveat is that the licensure authority may refuse or revoke notwithstanding the sealing - get advice before relying on the seal.", "");
      L.push("WHAT THIS PACKET MUST NEVER BE USED FOR", "");
      L.push("- As an arrest-expungement filing. The recorded rule: do not use a form designed for a separate arrest-expungement statute as a fallback.");
      L.push("- After a refusal, or where eligibility is disputed. The recorded escalation is attorney handoff for refusal or mandamus.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("- the discharge and dismissal has not issued, your conditions are not complete, or your discharge status is unclear;");
      L.push("- the court refuses after the motion, or eligibility is disputed;");
      L.push("- the underlying conviction was under SDCL Sec. 22-22-1 or Sec. 22-22-7 and a teaching licence is in play;");
      L.push("- you are relying on sealing to erase the matter everywhere;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed enforcement instruments for one recorded failure branch. It is not legal advice, it is not filed for you, and it does not decide whether the court will act. Sealing restricts access; it does not erase the DCI's nonpublic records.");
    }
    L.push("", `Route: ${this.componentRoutes[componentId] ?? this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "implementation_request") {
      writes.push(
        h.write("defendant_name", "Defendant named in the caption of this request", "participant.full_legal_name"),
        h.write("mailing_address", "Mailing address of the defendant in the contact block at the foot of the request", "participant.street_address"),
        h.write("telephone", "Telephone number of the defendant in the contact block at the foot of the request", "participant.phone"),
        h.write("email", "Email address of the defendant in the contact block at the foot of the request", "participant.email")
      );
      refusals.push(
        h.rbf("request_court", "Court named in the caption of the request, and its county",
          "the name of the court in the original criminal case, and its county - that court's own office can confirm both",
          "which court holds the original case belongs to the participant's record"),
        h.rbf("request_case_number", "Case number of the original criminal case, in the caption of the request",
          "the case number of the original criminal case, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("discharge_dismissal_date", "Date of the order of discharge and dismissal, on the request",
          "the date of the order of discharge and dismissal, copied from the attached order",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("public_record_evidence", "Your evidence that the matter still appears on a public record search, described on the request",
          "what still shows the matter, in your own words, with dated evidence attached",
          "what a public record search shows is a fact only the participant can state"),
        h.protectedBlank("request_signature", "Signature of the defendant on the request",
          "the defendant signs the request personally"),
        h.protectedBlank("request_signature_date", "Date beside the defendant's signature on the request",
          "a date written before the request is signed would be false")
      );
    } else if (componentId === "enforcement_motion") {
      writes.push(
        h.write("defendant_name", "Defendant named in the caption of this motion", "participant.full_legal_name"),
        h.write("mailing_address", "Mailing address of the defendant in the contact block at the foot of the motion", "participant.street_address"),
        h.write("telephone", "Telephone number of the defendant in the contact block at the foot of the motion", "participant.phone"),
        h.write("email", "Email address of the defendant in the contact block at the foot of the motion", "participant.email")
      );
      refusals.push(
        h.rbf("motion_court", "Court named in the caption of the motion, and its county",
          "the same court and county as the original criminal case",
          "which court holds the original case belongs to the participant's record"),
        h.rbf("motion_case_number", "Case number of the original criminal case, in the caption of the motion",
          "the case number of the original criminal case, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("motion_discharge_date", "Date of the order of discharge and dismissal, on the motion",
          "the date of the order of discharge and dismissal, copied from the attached order",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("after_request", "What happened after your written request, stated on the motion",
          "what happened after your request - whether the record was corrected - in your own words, with a copy of your request attached",
          "what followed the participant's own request is a fact only the participant can state"),
        h.protectedBlank("motion_signature", "Signature of the defendant on the motion",
          "the defendant signs the motion personally"),
        h.protectedBlank("motion_signature_date", "Date beside the defendant's signature on the motion",
          "a date written before the motion is signed would be false")
      );
    } else {
      writes.push(h.write("participant_name", "Person named on this page", "participant.full_legal_name"));
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
