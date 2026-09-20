#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — South Carolina § 17-22-950(A)
 * summary-court enforcement instruments.
 *
 *   node "scripts/build-census-v1-composed-treatment:sc_17_22_950_summary.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, TWO routes:
 *
 *   obligation:decision-branch:SC:sc_17_22_950_summary:written_implementation_request
 *   obligation:decision-branch:SC:sc_17_22_950_summary:original_case_enforcement_motion
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * Under S.C. Code § 17-22-950(A), where summary-court charges ended in a not
 * guilty verdict, dismissal or nolle prosequi and the person WAS
 * fingerprinted, "the summary court shall immediately issue an expungement
 * order at no cost" and distributes it itself — the participant files
 * nothing (SC.memo.json, track sc_17_22_950_summary, read at source
 * 2026-08-06). This family is the recorded failure branch: the automatic
 * order did not issue. The controlling 2026-08-28 decision (Q-035) resolves
 * its treatment in terms: "written implementation request to summary-court
 * clerk/judge → motion in original summary case to enforce § 17-22-950(A) →
 * attorney handoff for mandamus or disputed eligibility", and it forbids the
 * obvious substitution: "SCCA 223E is the subsection (B) application for the
 * non-fingerprinted branch and should not be repurposed when the court
 * simply failed to enter the automatic order", and "Do not open a new
 * solicitor application merely because the summary court missed its duty."
 * Custom pleading is therefore the correct deliverable, and this build
 * composes exactly the two instruments the decision names, each identifying
 * "the original docket, disposition, fingerprinted status, statutory
 * deadline, and requested order" as the decision directs.
 *
 * The existing sc_17_22_950_summary-set official_pdf_fill family covers the
 * unit-a/unit-b routes (the automatic branch and the SCCA 223E application);
 * its routeKeys do not include these two decision-branch routes, so nothing
 * here is covered by another family.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:sc_17_22_950_summary";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:sc_17_22_950_summary.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading",
  jurisdiction: "SC",
  legalName: "Enforcement Instruments for the Mandatory Summary-Court Expungement Under S.C. Code § 17-22-950(A)",
  routeName: "asking a South Carolina summary court to issue the mandatory § 17-22-950(A) expungement order it did not issue",
  statutes: ["S.C. Code § 17-22-950(A)", "S.C. Code § 17-22-950(C)", "S.C. Code § 17-22-950(F)"],
  routes: [
    { routeKey: "obligation:decision-branch:SC:sc_17_22_950_summary:written_implementation_request" },
    { routeKey: "obligation:decision-branch:SC:sc_17_22_950_summary:original_case_enforcement_motion" }
  ],
  componentRoutes: {
    implementation_request: "obligation:decision-branch:SC:sc_17_22_950_summary:written_implementation_request",
    enforcement_motion: "obligation:decision-branch:SC:sc_17_22_950_summary:original_case_enforcement_motion"
  },

  records: [
    {
      recordId: "legal-decision:2026-08-28:Q-035:sc_17_22_950_summary",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role: "the controlling Q-035 decision: the two-step escalation, the contents both instruments must identify, and the recorded prohibition on repurposing SCCA 223E or opening a solicitor application",
      mustContain: [
        "written implementation request to summary-court clerk/judge",
        "motion in original summary case to enforce § 17-22-950(A)",
        "The request or motion should identify the original docket, disposition, fingerprinted status, statutory deadline, and requested order.",
        "SCCA 223E is the subsection (B) application for the non-fingerprinted branch and should not be repurposed when the court simply failed to enter the automatic order.",
        "Do not open a new solicitor application merely because the summary court missed its duty.",
        "the statute places a mandatory duty on the summary court"
      ]
    },
    {
      recordId: "legal-design-intake:SC:sc_17_22_950_summary",
      path: "data/record-clearing/legal-design-intake/SC.memo.json",
      role: "the legal-design record: the fingerprinted (A) branch's automatic no-cost order, the § 17-22-950(C) timing window, the (F) objection path, and the statutory bars",
      mustContain: [
        "the person WAS fingerprinted, the summary court shall immediately issue an expungement order at no cost",
        "The expungement must occur no sooner than the appeal expiration date and no later than thirty days after the appeal expiration date, § 17-22-950(C).",
        "A prosecution or law enforcement agency must give written notice of objection no later than thirty days after the person is found not guilty or the charges are dismissed or nolle prossed, § 17-22-950(F).",
        "The dismissal occurred at a preliminary hearing.",
        "arising from the same course of events"
      ]
    }
  ],

  components: [
    "implementation_request",
    "enforcement_motion",
    "filing_instructions"
  ],
  componentTitles: {
    implementation_request: "Written Implementation Request Under S.C. Code Sec. 17-22-950(A)",
    enforcement_motion: "Motion in the Original Summary Case to Enforce S.C. Code Sec. 17-22-950(A)",
    filing_instructions: "Filing Instructions"
  },
  componentConditions: {
    enforcement_motion:
      "Used only AFTER the written implementation request: the recorded escalation is the written request to the "
      + "summary court first, and the motion in the original summary case only if the request does not result in "
      + "the order. Mandamus and disputed eligibility are recorded attorney handoffs, not steps in this packet."
  },
  componentDescriptions: {
    implementation_request: "the FIRST step: a written request to the summary court in which the charges were brought, asking it to issue the mandatory expungement order the statute directs",
    enforcement_motion: "the SECOND step: a motion in the original summary case to enforce the mandatory duty, used only if the written request does not result in the order",
    filing_instructions: "the sequence, the statutory bars, what this packet must never be used for, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Palmetto Street, Columbia, SC 29201",
      "participant.phone": "803-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Ashley Crossing Road, Apartment 14B, Charleston, South Carolina 29407-2214",
      "participant.phone": "(843) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling Q-035 decision (data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json) "
    + "and the legal-design record (data/record-clearing/legal-design-intake/SC.memo.json, track "
    + "sc_17_22_950_summary), both bound by SHA-256 and anchor-verified at build time",

  formIdentityNote:
    "No official form exists for a § 17-22-950(A) order the summary court failed to enter, and the controlling "
    + "decision forbids the substitutions that look available: SCCA 223E is the subsection (B) application for the "
    + "non-fingerprinted branch 'and should not be repurposed when the court simply failed to enter the automatic "
    + "order', and no new solicitor application is opened 'merely because the summary court missed its duty'. Both "
    + "instruments are therefore composed by this build from the committed records. The existing "
    + "sc_17_22_950_summary-set official_pdf_fill family serves the unit-a/unit-b routes, not these two "
    + "decision-branch routes; nothing here duplicates it and nothing was substituted.",

  routeSelectionNote:
    "Two routes, two instruments, one recorded escalation. The written request serves the "
    + "written_implementation_request route and the motion serves the original_case_enforcement_motion route; "
    + "each instrument names its own step on its face and the motion carries its after-the-request condition. This "
    + "family is built for the FINGERPRINTED § 17-22-950(A) branch, and both instruments state that ground as "
    + "route-determined text rather than leaving it as an election; the instructions tell a participant who was "
    + "not fingerprinted to stop, because the subsection (B) application is a different route this packet does "
    + "not carry.",

  instructionsIntro: [
    "The recorded South Carolina rule this packet is built on: where summary-court charges ended in a not guilty verdict, dismissal or nolle prosequi and you WERE fingerprinted, the summary court itself must immediately issue an expungement order at no cost — you apply for nothing. The statute also fixes the window: the expungement must occur no sooner than the appeal expiration date and no later than thirty days after it (§ 17-22-950(C)). This packet exists for one situation only: that window has passed and the order did not issue.",
    "The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact belongs to your court record, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory."
  ],
  instrumentChoice: {
    heading: "Which page you use, and in what order",
    intro: ["This packet carries two instruments and the recorded escalation uses them in order:"],
    rows: [
      ["`implementation_request` — the written request", "FIRST, always: send it to the summary court in which the charges were brought, once the thirty-day window after the appeal expiration date has passed with no order"],
      ["`enforcement_motion` — the motion in the original summary case", "only if the written request does not result in the order"]
    ],
    footnotes: [
      "If the court refuses, or eligibility is disputed, stop: the recorded escalation sends mandamus and disputed eligibility to a lawyer, not to another filing from this packet."
    ]
  },
  documentsToObtain: [
    ["The disposition record for the summary-court charge, showing how it ended and on what date", "the summary court in which the charges were brought"],
    ["Evidence that the record is still unexpunged after the statutory window - for example a dated background-check result or public index entry", "the record source that still shows the charge"]
  ],
  steps: [
    "**Confirm this packet is yours.** It is only for a summary-court charge that ended in a not guilty verdict, dismissal or nolle prosequi, where you WERE fingerprinted. If you were NOT fingerprinted, stop: the subsection (B) application (SCCA 223E) is a different route, and the recorded rule forbids repurposing either route for the other.",
    "**Check the statutory bars.** The recorded bars: the dismissal occurred at a preliminary hearing, or related charges from the same course of events are still pending. If either is true, stop and get legal help.",
    "**Establish the window.** From the court record, establish the disposition date and the appeal expiration date; the order was due no later than thirty days after the appeal expiration date. Also ask whether a prosecution or law-enforcement agency gave written notice of objection within thirty days of the disposition (§ 17-22-950(F)) — if one did, the matter belongs to a General Sessions judge and to a lawyer, not to this packet.",
    "**Fill in and send the written request** to the summary court in which the charges were brought. Ask that court's office how it accepts delivery, and use that method. The order issues at no cost to you — the recorded rule says so, and nothing in this packet asks you to pay for it.",
    "**Only if the request does not result in the order, file the enforcement motion** in the original summary case.",
    "**Sign and date each page yourself.** The platform never signs for you and never dates a signature."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.",
    "**The expungement order itself.** The recorded duty is the summary court's: it issues the order and obtains and verifies the signatures and distributes the copies. This packet drafts no order for it.",
    "**The response of the summary court to your request.** What that court said or did is a fact only you can state, and the motion asks you to state it in your own words."
  ],
  notTold: [
    "**How the request or motion must be delivered to the summary court.** No committed record this packet is built from states a delivery method. The office of the summary court in which the charges were brought is the authority that can answer — ask before you send or file.",
    "**Whether an objection was transmitted in your case.** Only the summary court can say; the instructions tell you to ask, because an objection sends the matter to a General Sessions judge."
  ],
  stopConditions: [
    "you were NOT fingerprinted in connection with the charge — the subsection (B) application is a different route, and this packet must not be used for it;",
    "the dismissal occurred at a preliminary hearing — a recorded statutory bar;",
    "related charges arising from the same course of events are still pending — a recorded statutory bar;",
    "a prosecution or law-enforcement agency objected under § 17-22-950(F) — a General Sessions judge decides, and that is a lawyer's setting;",
    "the summary court refuses after the motion, or eligibility is disputed — the recorded escalation is mandamus or disputed-eligibility advocacy, which is a lawyer's work;",
    "the charge was dismissed on completion of a diversion programme — the recorded rule sends that to the solicitor route, not here;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed enforcement instruments for one recorded failure branch. It is not SCCA "
    + "223E and must never be used in its place — the recorded rule is that the subsection (B) application is for "
    + "the non-fingerprinted branch and 'should not be repurposed when the court simply failed to enter the "
    + "automatic order' — and it is not a solicitor application, not legal advice, not filed for you, and not a "
    + "promise that the summary court will act. No fee is asked anywhere in it, because the recorded rule is that "
    + "the § 17-22-950(A) order issues at no cost.",

  receiptDoesNotEstablish: [
    "that any particular disposition is within § 17-22-950(A), or that the participant was fingerprinted",
    "that the summary court's duty was in fact breached in any particular case"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: the § 17-22-950(A) order "
        + "is the summary court's own act with no participant form, and the controlling Q-035 decision resolves "
        + "the failure branch to a composed written request followed by a composed motion in the original summary "
        + "case.",
      consequence:
        "Both instruments are composed from the committed records, each bound by SHA-256 and anchor-verified "
        + "before composing. Each identifies the original docket, disposition, fingerprinted status, statutory "
        + "deadline and requested order, exactly as the decision directs."
    },
    {
      finding:
        "The decision forbids the two available-looking substitutions: repurposing SCCA 223E, and opening a new "
        + "solicitor application.",
      consequence:
        "Neither instrument references either path as usable, and the instructions carry both prohibitions as "
        + "stop conditions. The existing sc_17_22_950_summary-set official_pdf_fill family serves the unit-a and "
        + "unit-b routes; these two decision-branch routes are served only here."
    },
    {
      finding:
        "The fingerprinted-versus-not fork selects between § 17-22-950(A) and (B), and this family is built for "
        + "the (A) branch alone.",
      consequence:
        "Both instruments state the fingerprinted ground as route-determined text on their face, no election "
        + "control exists, and a participant who was not fingerprinted is told to stop. The (B) application is a "
        + "different family's instrument."
    },
    {
      finding:
        "The § 17-22-950(F) objection path routes a contested matter to a General Sessions judge, and the "
        + "recorded escalation ends at attorney handoff for mandamus or disputed eligibility.",
      consequence:
        "The instructions tell the participant to ask the summary court whether an objection was transmitted, and "
        + "both the objection and the post-motion refusal are stop conditions naming counsel."
    }
  ],
  counselQuestions: [
    "Both instruments assert the § 17-22-950(A) mandatory duty and the § 17-22-950(C) window in the committed records' own words. Confirm the composed instruments are sufficient where no official enforcement form exists.",
    "The request asks the summary court to issue and distribute the order the statute directs; the motion asks the original summary case to enforce it. Confirm the two-step presentation with the condition printed on the motion's face.",
    "No committed record states a delivery method for either instrument; the packet delegates it to the office of the summary court. Confirm the delegation or supply the content.",
    "The instruments state the fingerprinted ground as route-determined text. Confirm that presentation against the (B) application boundary."
  ],
  reviewersAttention: [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family serves ONLY the two decision-branch enforcement routes; the automatic unit-a branch and the SCCA 223E unit-b application belong to the existing official_pdf_fill family."
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
      L.push("To: the ............................................................ court");
      L.push("(THE SUMMARY COURT - MAGISTRATE OR MUNICIPAL - IN WHICH THE CHARGES WERE BROUGHT, AND ITS LOCATION; that court's own office can confirm both)");
      L.push("At: ..........................................................", "");
      L.push(`From: ${name}`);
      L.push(`${address}`);
      L.push(`Telephone: ${phone}  Email: ${email}`, "");
      L.push("Re: written implementation request - mandatory expungement order under S.C. Code Sec. 17-22-950(A)", "");
      L.push("Original docket or case number of the summary-court charge:");
      L.push(DOTS(), "");
      L.push("Charge, worded exactly as the court record words it:");
      L.push(DOTS(), "");
      L.push("How the charge ended (not guilty, dismissed, or nolle prossed), worded exactly as the record words it, and the date it ended:");
      L.push(DOTS(), "");
      L.push("Appeal expiration date for that disposition, from the court record:");
      L.push(DOTS(), "");
      L.push("Date thirty days after the appeal expiration date (the statutory deadline under Sec. 17-22-950(C)):");
      L.push(DOTS(), "");
      L.push("1. I was the accused person in the matter identified above. The charge was brought in this summary court, it ended in a not guilty verdict, dismissal or nolle prosequi as stated above, and I was fingerprinted in connection with it. This request is made on that ground; it is not a subsection (B) application and no application fee attaches to it.", "");
      L.push("2. Under S.C. Code Sec. 17-22-950(A), on such a disposition the summary court shall immediately issue an expungement order at no cost, obtain and verify the necessary signatures, and distribute the copies. Under Sec. 17-22-950(C) the expungement must occur no sooner than the appeal expiration date and no later than thirty days after it. That deadline has passed and the record remains unexpunged. My evidence that it remains unexpunged (attach it - for example a dated background-check result):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. THE REQUESTED ORDER: I ask this court to issue the expungement order Sec. 17-22-950(A) directs for the matter identified above, at no cost, and to distribute it as the statute directs. If an objection was transmitted under Sec. 17-22-950(F) in this matter, please tell me so in writing.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(44), "");
      L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you.)");
    } else if (componentId === "enforcement_motion") {
      L.push("USE THIS PAGE ONLY AFTER THE WRITTEN REQUEST. The recorded escalation is: first the written implementation request to the summary court; then this motion in the original summary case, only if the request does not result in the order. If the court refuses after this motion, or eligibility is disputed, the recorded next step is a lawyer - not another filing from this packet.", "");
      L.push("IN THE ............................................................ COURT");
      L.push("AT ..........................................................", "");
      L.push("(THE SAME SUMMARY COURT, IN THE ORIGINAL SUMMARY CASE)", "");
      L.push("STATE OF SOUTH CAROLINA,", "");
      L.push("v.", "");
      L.push(`${name},`);
      L.push("DEFENDANT.", "");
      L.push("Original docket or case number:");
      L.push(DOTS(), "");
      L.push("MOTION TO ENFORCE S.C. CODE Sec. 17-22-950(A)", "");
      L.push(`1. The defendant, ${name}, states: the charge in this matter was brought in this summary court; it ended in a not guilty verdict, dismissal or nolle prosequi; and the defendant was fingerprinted in connection with it.`, "");
      L.push("How the charge ended, worded exactly as the court record words it, and the date it ended:");
      L.push(DOTS(), "");
      L.push("Appeal expiration date, and the date thirty days after it (the statutory deadline):");
      L.push(DOTS(), "");
      L.push("2. Under S.C. Code Sec. 17-22-950(A) the summary court shall immediately issue an expungement order at no cost on such a disposition, and under Sec. 17-22-950(C) the expungement must occur no later than thirty days after the appeal expiration date. The deadline has passed, the record remains unexpunged, and a written implementation request was made to this court. What this court's office said or did in response (state it in your own words, and attach a copy of your request):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. THE REQUESTED ORDER: the defendant asks this court, in the original summary case, to enforce Sec. 17-22-950(A) by issuing the expungement order the statute directs for this matter, at no cost, and distributing it as the statute directs.", "");
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
      L.push("A summary-court charge that ended in a not guilty verdict, dismissal or nolle prosequi, where you WERE fingerprinted: the summary court itself must immediately issue an expungement order at no cost, no later than thirty days after the appeal expiration date. This packet is only for the case where that deadline passed and the order did not issue.", "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Confirm this packet is yours. If you were NOT fingerprinted, stop: the subsection (B) application (form SCCA 223E) is a different route, and the recorded rule forbids using either route in place of the other.");
      L.push("STEP TWO. Check the recorded statutory bars: a dismissal at a preliminary hearing, or related charges from the same course of events still pending. If either is true, stop and get legal help.");
      L.push("STEP THREE. From the court record, establish the disposition date, the appeal expiration date, and the date thirty days after it. Ask the summary court whether a prosecution or law-enforcement agency gave written notice of objection within thirty days of the disposition - if one did, a General Sessions judge decides, and that is a lawyer's setting.");
      L.push("STEP FOUR. Complete and send the WRITTEN IMPLEMENTATION REQUEST to the summary court in which the charges were brought. Ask that court's office how it accepts delivery, and use that method. Pay nothing: the recorded rule is that the order issues at no cost.");
      L.push("STEP FIVE. Only if the request does not result in the order, complete and file the ENFORCEMENT MOTION in the original summary case.");
      L.push("STEP SIX. Sign and date each page yourself.", "");
      L.push("WHAT THIS PACKET MUST NEVER BE USED FOR", "");
      L.push("- As a subsection (B) application. SCCA 223E belongs to the non-fingerprinted branch, and the recorded rule is that it must not be repurposed when the court simply failed to enter the automatic order.");
      L.push("- To open a new solicitor application. The recorded rule: do not open one merely because the summary court missed its duty.");
      L.push("- After an objection under Sec. 17-22-950(F), or after a refusal, or where eligibility is disputed. Those belong to a lawyer.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("- you were not fingerprinted in connection with the charge;");
      L.push("- the dismissal occurred at a preliminary hearing;");
      L.push("- related charges arising from the same course of events are still pending;");
      L.push("- an agency objected under Sec. 17-22-950(F), or the court refuses after the motion, or eligibility is disputed;");
      L.push("- the charge was dismissed on completion of a diversion programme - that belongs to the solicitor route;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed enforcement instruments for one recorded failure branch. It is not an official form, not legal advice, not filed for you, and not a promise that the summary court will act. No fee is asked anywhere in it.");
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
        h.write("requester_name", "Person named in the From block of the request", "participant.full_legal_name"),
        h.write("mailing_address", "Mailing address in the From block of the request", "participant.street_address"),
        h.write("telephone", "Telephone number in the From block of the request", "participant.phone"),
        h.write("email", "Email address in the From block of the request", "participant.email")
      );
      refusals.push(
        h.rbf("addressed_court", "Court name and location in the To block of the request",
          "the name and location of the summary court - magistrate or municipal - in which the charges were brought; that court's own office can confirm both",
          "which summary court heard the charge belongs to the participant's record"),
        h.rbf("docket_number", "Original docket or case number of the summary-court charge, on the request",
          "the original docket or case number, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("charge_description", "Charge, worded exactly as the court record words it, on the request",
          "the charge, worded exactly as the court record words it",
          "no charge fact is held for a record the platform has not seen"),
        h.rbf("disposition_and_date", "How the charge ended, worded exactly as the record words it, and the date it ended, on the request",
          "how the charge ended - not guilty, dismissed, or nolle prossed - in the record's own words, and the date",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("appeal_expiration_date", "Appeal expiration date for that disposition, on the request",
          "the appeal expiration date, established from the court record - the summary court's office can confirm it",
          "the statutory window runs from a date on the participant's record"),
        h.rbf("statutory_deadline", "Date thirty days after the appeal expiration date, on the request",
          "the calculated statutory deadline: thirty days after the appeal expiration date",
          "the deadline is computed from a date the platform does not hold"),
        h.rbf("unexpunged_evidence", "Your evidence that the record remains unexpunged, described on the request",
          "what still shows the charge, in your own words, with dated evidence attached",
          "what a record source still shows is a fact only the participant can state"),
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
        h.rbf("motion_court", "Court named in the caption of the motion, and its location",
          "the same summary court and location as the original summary case",
          "which summary court heard the charge belongs to the participant's record"),
        h.rbf("motion_docket_number", "Original docket or case number, in the caption of the motion",
          "the original docket or case number, copied from the court record",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("motion_disposition", "How the charge ended, worded exactly as the court record words it, and the date it ended, on the motion",
          "how the charge ended, in the record's own words, and the date",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("motion_deadline", "Appeal expiration date, and the date thirty days after it, on the motion",
          "the appeal expiration date and the calculated statutory deadline thirty days after it",
          "the statutory window runs from a date on the participant's record"),
        h.rbf("court_response", "What this court's office said or did in response to your written request",
          "what the summary court's office said or did in response to your request, in your own words, with a copy of your request attached",
          "the response to the participant's own request is a fact only the participant can state"),
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
