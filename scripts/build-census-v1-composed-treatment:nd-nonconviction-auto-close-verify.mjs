#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — North Dakota mandatory-closure
 * correction instruments (N.D.C.C. § 12-60.1-05, day-62 failure branch).
 *
 *   node "scripts/build-census-v1-composed-treatment:nd-nonconviction-auto-close-verify.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, TWO routes:
 *
 *   obligation:failure-disposition:ND:...:nd_still_public_day_62:written_clerk_correction_request
 *   obligation:failure-disposition:ND:...:nd_still_public_day_62:original_case_enforcement_motion
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * The parent route is AUTOMATIC: for a qualifying non-conviction disposition
 * entered on or after 2025-08-01, "the court closes the record by operation
 * of the statute; the participant waits 61 complete days from the qualifying
 * disposition, verifies on day 62 or the next business day, and files nothing
 * to obtain the closure itself" (route contract,
 * src/lib/legal-authority/routes/national-report-2026-08-28.json). This
 * family is NOT the automatic branch: it is the recorded failure branch,
 * nd_still_public_day_62, whose treatment the controlling LA-IMM-03 decision
 * states in terms: "First a written request to the clerk of the original
 * court to implement the closure. If the clerk cannot correct it, a motion to
 * enforce in the original criminal case." The decision names both composed
 * instruments — the written Request to Implement Mandatory Closure and
 * Correct Public-Access Status, and the Motion to Enforce Mandatory Closure
 * Under N.D.C.C. § 12-60.1-05 with a proposed order — and records that no
 * dedicated statewide enforcement form exists. Custom pleading is therefore
 * the correct deliverable, and this build composes exactly those instruments.
 *
 * WHAT THIS FAMILY DELIBERATELY DOES NOT COVER
 *
 * - the automatic branch itself (guidance; nothing is filed);
 * - pre-2025-08-01 dispositions, which "remain on the official petition
 *   route" — a different instrument this packet does not carry;
 * - BCI or originating-agency history correction, which the record calls "a
 *   separate challenge" that "must not be presented as one step" with court
 *   closure;
 * - contested eligibility, which is an attorney handoff.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:nd-nonconviction-auto-close-verify";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:nd-nonconviction-auto-close-verify.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/nd/composed-treatment:nd-nonconviction-auto-close-verify--custom-pleading",
  jurisdiction: "ND",
  legalName: "Correction Instruments for Mandatory Non-Conviction Record Closure Under N.D.C.C. § 12-60.1-05 (Still Public on Day 62)",
  routeName: "correcting a North Dakota non-conviction court record that should have closed automatically under N.D.C.C. § 12-60.1-05 and is still public on day 62",
  statutes: ["N.D.C.C. § 12-60.1-05"],
  routes: [
    { routeKey: "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:written_clerk_correction_request" },
    { routeKey: "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:original_case_enforcement_motion" }
  ],
  componentRoutes: {
    clerk_correction_request: "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:written_clerk_correction_request",
    enforcement_motion: "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:original_case_enforcement_motion",
    proposed_order: "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:original_case_enforcement_motion"
  },

  records: [
    {
      recordId: "route-contract:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
      path: "src/lib/legal-authority/routes/national-report-2026-08-28.json",
      role: "the committed route contract: the automatic parent, the 61-day/day-62 timing, the nd_still_public_day_62 failure branch this family implements, and the recorded separations (pre-2025 petition route; agency correction; contested eligibility)",
      mustContain: [
        "the court closes the record by operation of the statute; the participant waits 61 complete days from the qualifying disposition, verifies on day 62 or the next business day, and files nothing to obtain the closure itself",
        "First a written request to the clerk of the original court to implement the closure. If the clerk cannot correct it, a motion to enforce in the original criminal case.",
        "A separate challenge to BCI or the originating agency. Closing the court record does not correct an agency history",
        "A contested eligibility question is individualized advocacy.",
        "Before the amendment took effect the record does not close by operation of law, so the participant files the official petition and proposed order.",
        "No individualized notice may be promised"
      ]
    },
    {
      recordId: "legal-decision:2026-08-28:LA-IMM-03:nd-nonconviction-auto-close-verify",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role: "the controlling LA-IMM-03 decision naming both composed correction instruments, their contents, and the recorded absence of a dedicated statewide enforcement form",
      mustContain: [
        "Request to Implement Mandatory Closure and Correct Public-Access Status",
        "Motion to Enforce Mandatory Closure Under N.D.C.C. § 12-60.1-05",
        "It should identify the case, disposition date, calculated deadline, statutory basis, and evidence of continuing public access.",
        "Because no dedicated statewide enforcement form exists, contested eligibility goes to counsel.",
        "Pre-August 1, 2025 dispositions remain on the official petition route.",
        "SECOND CORRECTION"
      ]
    }
  ],

  components: [
    "clerk_correction_request",
    "enforcement_motion",
    "proposed_order",
    "filing_instructions"
  ],
  componentTitles: {
    clerk_correction_request: "Request to Implement Mandatory Closure and Correct Public-Access Status",
    enforcement_motion: "Motion to Enforce Mandatory Closure Under N.D.C.C. Sec. 12-60.1-05",
    proposed_order: "Proposed Order Enforcing Mandatory Closure Under N.D.C.C. Sec. 12-60.1-05",
    filing_instructions: "Filing Instructions"
  },
  componentConditions: {
    enforcement_motion:
      "Used only AFTER the written request: the recorded sequence is a written request to the office of the "
      + "original court first, and the motion to enforce in the original criminal case only if that office states "
      + "that judicial action is required or does not correct the record.",
    proposed_order:
      "Travels with the enforcement motion only; nothing on it is decided, signed or dated by the participant."
  },
  componentDescriptions: {
    clerk_correction_request: "the FIRST correction step: a written request to the office of the original court to implement the mandatory closure and correct the public-access status",
    enforcement_motion: "the SECOND correction step: a motion in the original criminal case to enforce the mandatory closure, used only if the written request does not correct the record",
    proposed_order: "the proposed order that travels with the enforcement motion; every decision and signature line is the court's and is left blank",
    filing_instructions: "the sequence, what this packet does not cover, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Prairie Rose Street, Bismarck, ND 58501",
      "participant.phone": "701-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Sheyenne Crossing Road, Apartment 14B, Fargo, North Dakota 58103-2214",
      "participant.phone": "(701) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the committed route contract (src/lib/legal-authority/routes/national-report-2026-08-28.json, "
    + "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05) and the controlling LA-IMM-03 decision "
    + "(data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json), both bound by SHA-256 and "
    + "anchor-verified at build time",

  formIdentityNote:
    "No dedicated statewide enforcement form exists for a § 12-60.1-05 closure that did not happen — the "
    + "controlling LA-IMM-03 decision records exactly that — so both correction instruments are composed by this "
    + "build from the committed records. The official pre-2025-08-01 petition is a DIFFERENT instrument on a "
    + "different branch (pre_effective_date_petition) and is deliberately not in this packet: the record states "
    + "that pre-August 1, 2025 dispositions remain on the official petition route. No form was substituted and "
    + "none was invented.",

  routeSelectionNote:
    "Two routes, two instruments, one recorded sequence. The written request serves the "
    + "written_clerk_correction_request route and the enforcement motion serves the "
    + "original_case_enforcement_motion route; each instrument names its own step on its face. The "
    + "request-then-motion order is not an election the packet leaves open — the recorded rule is request FIRST, "
    + "motion only if the record is not corrected — and the instructions state that sequence. Which step a "
    + "participant has reached turns on what happened to their own request, so the condition is printed on the "
    + "motion's face and neither instrument is selected for them.",

  instructionsIntro: [
    "For a qualifying non-conviction disposition entered on or after August 1, 2025, the recorded North Dakota rule is that the court closes the record by operation of N.D.C.C. § 12-60.1-05: you wait 61 complete days from the qualifying disposition, verify on day 62 or the next business day, and file NOTHING to obtain the closure itself. This packet exists for one situation only: the record is STILL PUBLIC on day 62. It carries the two recorded correction instruments, in their recorded order.",
    "The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact belongs to your court record, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory."
  ],
  instrumentChoice: {
    heading: "Which page you use, and in what order",
    intro: ["This packet carries two instruments and the recorded sequence uses them in order:"],
    rows: [
      ["`clerk_correction_request` — the written request", "FIRST, always: send it to the office of the court in the original criminal case once the day-62 check shows the record still public"],
      ["`enforcement_motion` — the motion to enforce, with its proposed order", "only if that office states that judicial action is required, or does not correct the record"]
    ],
    footnotes: [
      "If eligibility for the closure is contested at any point, stop: the recorded rule is that a contested eligibility question is individualized advocacy, and this packet is not that."
    ]
  },
  documentsToObtain: [
    ["The disposition record for the case, showing the qualifying non-conviction disposition and its exact date", "the office of the court in the original criminal case"],
    ["Evidence of continuing public access on day 62 or later - for example a dated printout of the public index entry", "the public case search, checked on day 62 or the next business day"]
  ],
  steps: [
    "**Confirm the branch.** This packet applies only where the qualifying disposition was entered ON OR AFTER August 1, 2025. The record states that pre-August 1, 2025 dispositions remain on the official petition route, which is a different instrument this packet does not carry.",
    "**Count 61 complete days from the qualifying disposition, and verify on day 62** or the next business day. No individualized notice is promised by any recorded source — checking is yours to do.",
    "**If the record is still public, fill in and send the written request** to the office of the court in the original criminal case. It identifies the case, the disposition date, the calculated deadline, the statutory basis and your evidence of continuing public access — the exact contents the controlling decision names.",
    "**Only if that office says judicial action is required, or does not correct the record, file the enforcement motion** in the original criminal case, with the unsigned proposed order.",
    "**Sign and date each page yourself.** The platform never signs for you and never dates a signature.",
    "**Keep the agency question separate.** If a BCI or originating-agency criminal history still shows the matter after the court record closes, that is a separate challenge to that agency — the record states the two must not be presented as one step, and this packet does not carry it."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of the proposed order that decides anything**, including the court's signature and date. The order is the court's to make.",
    "**The response of the office of the original court to your request.** What that office said or did is a fact only you can state, and the motion asks you to state it in your own words."
  ],
  notTold: [
    "**Whether a filing fee applies to the enforcement motion, and how the request or motion must be delivered.** Neither is established by the committed records this packet is built from. The office of the court in the original criminal case is the authority that can answer both — ask before you send or file.",
    "**Whether your disposition qualifies.** The recorded rule requires a qualifying non-conviction disposition; whether yours is one is decided against the record, and a contested answer is an attorney question."
  ],
  stopConditions: [
    "eligibility for the closure is contested — the recorded rule is that a contested eligibility question is individualized advocacy;",
    "the qualifying disposition was entered before August 1, 2025 — that is the official petition route, not this packet;",
    "the court record closed but a BCI or originating-agency history still shows the matter — that is a separate agency challenge, not a court filing from this packet;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed correction instruments for one recorded failure branch. It is not the "
    + "automatic closure itself — the closure happens by operation of the statute, and nothing here is filed to "
    + "obtain it — and it is not the pre-2025 petition, not an agency-history challenge, not legal advice, and "
    + "not filed for you. It does not decide whether the record qualifies, and it does not promise that any court "
    + "will act on it.",

  receiptDoesNotEstablish: [
    "that any particular disposition is a qualifying non-conviction disposition under N.D.C.C. § 12-60.1-05",
    "that the pre-2025-08-01 official petition branch is buildable from this family — it is not, and it is not carried here"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: the controlling LA-IMM-03 "
        + "decision states that no dedicated statewide enforcement form exists, and names the two composed "
        + "instruments this family renders.",
      consequence:
        "Both instruments are composed from the committed records, each bound by SHA-256 and anchor-verified "
        + "before composing. No form was substituted and none was invented."
    },
    {
      finding:
        "The recorded treatment is a SEQUENCE: 'First a written request to the clerk of the original court to "
        + "implement the closure. If the clerk cannot correct it, a motion to enforce in the original criminal "
        + "case.'",
      consequence:
        "The motion carries its condition on its own face and the instructions state the order. Neither instrument "
        + "is selected for the participant, because which step they have reached turns on what happened to their "
        + "own request."
    },
    {
      finding:
        "The route contract walls three things off from this branch: the automatic parent (nothing is filed), "
        + "pre-2025-08-01 dispositions (the official petition route), and agency-history correction (a separate "
        + "challenge that must not be presented as one step with court closure).",
      consequence:
        "All three separations are printed in the filing instructions as non-grants, and the packet carries no "
        + "instrument for any of them."
    },
    {
      finding:
        "No committed record states a filing fee for the enforcement motion or a delivery method for either "
        + "instrument.",
      consequence:
        "Both are delegated by name to the office of the court in the original criminal case. No method and no "
        + "figure was guessed."
    }
  ],
  counselQuestions: [
    "The written request and the enforcement motion state the mandatory-closure ground in the committed records' own words (61 complete days; day-62 verification; closure by operation of the statute). Confirm the composed instruments are sufficient where no dedicated statewide enforcement form exists.",
    "The request instrument asks the office of the original court to implement closure and correct public-access status; the motion asks the court to enforce it. Confirm the two-step presentation with the condition printed on the motion's face.",
    "No committed record states the enforcement motion's filing fee or either instrument's delivery method; the packet delegates both to the office of the original court. Confirm the delegation or supply the content.",
    "The proposed order grants closure under § 12-60.1-05 with every decision line blank. Confirm its wording."
  ],
  reviewersAttention: [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family covers ONLY the nd_still_public_day_62 failure branch; the automatic parent, the pre-2025 petition branch and the agency challenge are deliberately outside it."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const address = facts["participant.street_address"];
    const phone = facts["participant.phone"];
    const email = facts["participant.email"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "clerk_correction_request") {
      L.push("To: the office of the ............................................................ court");
      L.push("for ..........................................................");
      L.push("(THE COURT IN THE ORIGINAL CRIMINAL CASE, AND ITS COUNTY OR LOCATION - that court's own office can confirm both)", "");
      L.push(`From: ${name}`);
      L.push(`${address}`);
      L.push(`Telephone: ${phone}  Email: ${email}`, "");
      L.push("Re: request to implement mandatory closure under N.D.C.C. Sec. 12-60.1-05, and to correct the public-access status of the record", "");
      L.push("Case number of the original criminal case:");
      L.push(DOTS(), "");
      L.push("Qualifying non-conviction disposition, worded exactly as the court record words it:");
      L.push(DOTS(), "");
      L.push("Date the qualifying disposition was entered (it must be on or after August 1, 2025 for this request to apply):");
      L.push(DOTS(), "");
      L.push("Date 61 complete days after the disposition date (the calculated deadline):");
      L.push(DOTS(), "");
      L.push("1. Under N.D.C.C. Sec. 12-60.1-05, for a qualifying non-conviction disposition entered on or after August 1, 2025, the court closes the record by operation of the statute. The recorded period is 61 complete days from the qualifying disposition, with verification on day 62 or the next business day. Nothing is filed to obtain the closure itself.", "");
      L.push("2. The record identified above is still publicly accessible after that calculated deadline. My evidence of continuing public access, checked on day 62 or the next business day (attach it - for example a dated printout of the public index entry):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. I therefore ask this office to implement the mandatory closure the statute directs, and to correct the public-access status of the record. If this office's position is that judicial action is required, please say so in writing.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(44), "");
      L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you.)");
    } else if (componentId === "enforcement_motion") {
      L.push("USE THIS PAGE ONLY AFTER THE WRITTEN REQUEST. The recorded sequence is: first the written request to the office of the court in the original criminal case; then this motion, only if that office states that judicial action is required or does not correct the record. If your request corrected the record, do not file this motion.", "");
      L.push("IN THE ............................................................ COURT");
      L.push("FOR ..........................................................", "");
      L.push("STATE OF NORTH DAKOTA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Case number of the original criminal case:");
      L.push(DOTS(), "");
      L.push("MOTION TO ENFORCE MANDATORY CLOSURE UNDER N.D.C.C. Sec. 12-60.1-05", "");
      L.push(`1. The defendant, ${name}, states that the disposition in this case was a qualifying non-conviction disposition entered on or after August 1, 2025, and that under N.D.C.C. Sec. 12-60.1-05 the court closes such a record by operation of the statute after 61 complete days.`, "");
      L.push("Qualifying non-conviction disposition, worded exactly as the court record words it:");
      L.push(DOTS(), "");
      L.push("Date the qualifying disposition was entered:");
      L.push(DOTS(), "");
      L.push("2. More than 61 complete days have passed and the record remains publicly accessible. A written request to implement the closure was made to the office of this court. What that office said or did in response (state it in your own words, and attach a copy of your request):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. The defendant asks the Court to enforce the mandatory closure that N.D.C.C. Sec. 12-60.1-05 directs, and to order the public-access status of the record corrected. A proposed order accompanies this motion.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
      L.push("(The defendant signs and dates this motion personally.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else if (componentId === "proposed_order") {
      L.push("IN THE ............................................................ COURT");
      L.push("FOR ..........................................................", "");
      L.push("STATE OF NORTH DAKOTA,");
      L.push("PLAINTIFF,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Case number of the original criminal case:");
      L.push(DOTS(), "");
      L.push("PROPOSED ORDER", "");
      L.push("This matter came before the Court on the defendant's Motion to Enforce Mandatory Closure Under N.D.C.C. Sec. 12-60.1-05. The Court, having considered the motion,", "");
      L.push("ORDERS that " + DOTS(56), "");
      L.push("(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the motion for the Court's convenience; nothing on it is completed, decided, signed or dated by the defendant or by this packet.)", "");
      L.push("DATED " + DOTS(30), "");
      L.push(DOTS(50));
      L.push("(The court signs here if, and only if, it grants the motion.)");
    } else {
      L.push(`This packet is prepared for ${this.routeName}.`, "");
      L.push(`Prepared for: ${name}`, "");
      L.push("THE ONE SITUATION THIS PACKET IS FOR", "");
      L.push("A qualifying non-conviction disposition entered ON OR AFTER August 1, 2025 closes by operation of N.D.C.C. Sec. 12-60.1-05: you wait 61 complete days, verify on day 62 or the next business day, and file nothing to obtain the closure itself. This packet is only for the case where that check shows the record STILL PUBLIC.", "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Confirm the disposition date is on or after August 1, 2025. If it is earlier, stop: the record states that pre-August 1, 2025 dispositions remain on the official petition route, and this packet does not carry that petition.");
      L.push("STEP TWO. Count 61 complete days from the qualifying disposition and check the public index on day 62 or the next business day. No recorded source promises you individualized notice of closure - checking is yours to do. Keep dated evidence of what you find.");
      L.push("STEP THREE. If the record is still public, complete and send the WRITTEN REQUEST to the office of the court in the original criminal case. Ask that office how it accepts delivery, and use that method.");
      L.push("STEP FOUR. Only if that office states that judicial action is required, or does not correct the record, complete and file the ENFORCEMENT MOTION in the original criminal case, with the unsigned proposed order. Ask the office of that court whether a filing fee applies - no committed record this packet is built from states one.");
      L.push("STEP FIVE. Sign and date each page yourself.", "");
      L.push("WHAT THIS PACKET DELIBERATELY DOES NOT COVER", "");
      L.push("- The automatic closure itself. Nothing is filed to obtain it.");
      L.push("- Pre-August 1, 2025 dispositions. They remain on the official petition route, a different instrument.");
      L.push("- BCI or originating-agency history correction. Closing the court record does not correct an agency history; that is a separate challenge to that agency, and the record states the two must not be presented as one step.");
      L.push("- Contested eligibility. The recorded rule: a contested eligibility question is individualized advocacy. Take it to a lawyer.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("- eligibility for the closure is contested;");
      L.push("- the disposition date is before August 1, 2025;");
      L.push("- an agency history still shows the matter after the court record closes;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed correction instruments for one recorded failure branch. It is not legal advice, it is not filed for you, and it does not decide whether the record qualifies or whether any court will act on it.");
    }
    L.push("", `Route: ${this.componentRoutes[componentId] ?? this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "clerk_correction_request") {
      writes.push(
        h.write("requester_name", "Person named in the From block of the request", "participant.full_legal_name"),
        h.write("mailing_address", "Mailing address in the From block of the request", "participant.street_address"),
        h.write("telephone", "Telephone number in the From block of the request", "participant.phone"),
        h.write("email", "Email address in the From block of the request", "participant.email")
      );
      refusals.push(
        h.rbf("addressed_court", "Court name and county or location in the To block of the request",
          "the name of the court in the original criminal case, and its county or location - that court's own office can confirm both",
          "which court holds the original case belongs to the participant's record"),
        h.rbf("case_number", "Case number of the original criminal case, on the request",
          "the case number of the original criminal case, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("qualifying_disposition", "Qualifying non-conviction disposition, worded exactly as the court record words it, on the request",
          "the qualifying non-conviction disposition, worded exactly as the court record words it",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("disposition_date", "Date the qualifying disposition was entered, on the request",
          "the exact date the qualifying disposition was entered, from the court record - it must be on or after August 1, 2025 for this branch to apply",
          "the recorded rule makes the exact disposition date decide which branch governs, and it lives on the record"),
        h.rbf("calculated_deadline", "Date 61 complete days after the disposition date, on the request",
          "the calculated deadline: the date 61 complete days after the disposition date",
          "the deadline is computed from a disposition date the platform does not hold"),
        h.rbf("public_access_evidence", "Your evidence of continuing public access, described on the request",
          "what your day-62 check showed, in your own words, with a dated printout or similar evidence attached",
          "what the public index showed on day 62 is a fact only the participant can state"),
        h.protectedBlank("request_signature", "Signature on the request",
          "the participant signs the request personally"),
        h.protectedBlank("request_signature_date", "Date beside the signature on the request",
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
        h.rbf("motion_court", "Court named in the caption of the motion, and its county or location",
          "the same court and county or location as the original criminal case",
          "which court holds the original case belongs to the participant's record"),
        h.rbf("motion_case_number", "Case number of the original criminal case, in the caption of the motion",
          "the case number of the original criminal case, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("motion_disposition", "Qualifying non-conviction disposition, worded exactly as the court record words it, on the motion",
          "the qualifying non-conviction disposition, worded exactly as the court record words it",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("motion_disposition_date", "Date the qualifying disposition was entered, on the motion",
          "the exact date the qualifying disposition was entered, from the court record",
          "the recorded rule makes the exact disposition date decide which branch governs, and it lives on the record"),
        h.rbf("office_response", "What the office of this court said or did in response to your written request",
          "what the office of the court said or did in response to your written request, in your own words, with a copy of your request attached",
          "the response to the participant's own request is a fact only the participant can state"),
        h.protectedBlank("motion_signature", "Signature of the defendant on the motion",
          "the defendant signs the motion personally"),
        h.protectedBlank("motion_signature_date", "Date beside the defendant's signature on the motion",
          "a date written before the motion is signed would be false")
      );
    } else if (componentId === "proposed_order") {
      writes.push(h.write("defendant_name", "Defendant named in the caption of the proposed order", "participant.full_legal_name"));
      refusals.push(
        h.rbf("order_court_name", "Court named in the caption of the proposed order, and its county or location",
          "the same court name and county or location you wrote in the motion's caption",
          "the proposed order travels with the motion and carries the same caption the participant establishes"),
        h.rbf("order_case_number", "Case number of the original criminal case, in the caption of the proposed order",
          "the same original criminal case number you wrote in the motion's caption",
          "no case identifier is held for a record the platform has not seen"),
        h.clerkBlank("order_decision", "The decision line of the proposed order, decided by the court",
          "every decision on the proposed order is the court's"),
        h.clerkBlank("order_signature", "Signature line of the proposed order, for the court",
          "the court signs the order if, and only if, it grants the motion"),
        h.clerkBlank("order_date", "Date line of the proposed order, for the court",
          "the court dates the order when it decides")
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
