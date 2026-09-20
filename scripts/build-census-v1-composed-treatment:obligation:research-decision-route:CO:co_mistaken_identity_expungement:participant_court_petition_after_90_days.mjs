#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — Colorado mistaken-identity
 * expungement, participant petition after the 90-day agency deadline.
 *
 *   node "scripts/build-census-v1-composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one route:
 *
 *   obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * The controlling 2026-08-28 research-track decision (Colorado —
 * co_mistaken_identity_expungement) records the mechanism: "C.R.S.
 * § 24-72-702 creates a mandatory agency-first procedure." Where a
 * law-enforcement investigation finds a person was arrested because of
 * mistaken identity and no charges were filed, the ARRESTING AGENCY must
 * petition the district court within 90 days; "If the arresting agency fails
 * to file within that period, the person may file the petition in the same
 * district court. No filing fee or other expungement cost may be charged."
 * This family is exactly that participant branch. The decision resolves the
 * output in terms — "No dedicated statewide JDF form was located. Use a
 * custom civil petition" — and lists the petition's required contents: the
 * agency's mistaken-identity finding; proof that no charges were filed;
 * arrest date, agency, identifiers, and case/incident number; the expired
 * 90-day agency deadline; a complete record-custodian list; a proposed
 * mandatory expungement order; and post-order distribution and verification
 * instructions. Custom pleading is therefore the correct deliverable, and
 * this build composes exactly those contents.
 *
 * THE RECORDED BOUNDARIES
 *
 * "This route depends on an actual agency finding of mistaken identity. It
 * is not a general vehicle for litigating innocence where the agency has
 * never made that determination." And: "If there is no agency finding, the
 * first output should be a written request for investigation and finding,
 * not the court petition" — that request is a different branch, and this
 * packet tells a participant without a finding to stop.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading",
  jurisdiction: "CO",
  legalName: "Petition for Mandatory Mistaken-Identity Expungement Under C.R.S. § 24-72-702 (Participant Filing After the Expired 90-Day Agency Deadline)",
  routeName: "expunging a Colorado arrest that a law-enforcement investigation found was a mistaken-identity arrest, where the arresting agency did not petition within its 90-day deadline, under C.R.S. § 24-72-702",
  statutes: ["C.R.S. § 24-72-702"],
  routes: [
    { routeKey: "obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days" }
  ],

  records: [
    {
      recordId: "legal-decision:2026-08-28:research-track:co_mistaken_identity_expungement",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role: "the controlling research-track decision: the agency-first mechanism, the participant branch this family implements, the no-fee rule, the custom petition's required contents, and the recorded boundaries",
      mustContain: [
        "C.R.S. § 24-72-702 creates a mandatory agency-first procedure.",
        "No later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, the arresting agency must petition the district court in the judicial district where the arrest occurred.",
        "If the arresting agency fails to file within that period, the person may file the petition in the same district court. No filing fee or other expungement cost may be charged.",
        "It is not a general vehicle for litigating innocence where the agency has never made that determination.",
        "No dedicated statewide JDF form was located. Use a custom civil petition containing:",
        "proposed mandatory expungement order; and",
        "post-order distribution and verification instructions.",
        "If there is no agency finding, the first output should be a written request for investigation and finding, not the court petition.",
        "CUSTOM NO-FEE DISTRICT-COURT PETITION"
      ]
    }
  ],

  components: [
    "primary_filing",
    "proposed_order",
    "filing_instructions"
  ],
  componentTitles: {
    primary_filing: "Petition for Mandatory Mistaken-Identity Expungement Under C.R.S. Sec. 24-72-702",
    proposed_order: "Proposed Order of Mandatory Expungement Under C.R.S. Sec. 24-72-702",
    filing_instructions: "Filing Instructions, and What Happens After the Order"
  },
  componentConditions: {
    proposed_order:
      "Travels with the petition only; nothing on it is decided, signed or dated by the participant."
  },
  componentDescriptions: {
    primary_filing: "the composed no-fee civil petition to the district court of the judicial district where the arrest occurred, carrying every content item the controlling decision lists, including the record-custodian list",
    proposed_order: "the proposed mandatory expungement order the court may sign; every decision and signature line is the court's and is left blank",
    filing_instructions: "the precondition, the sequence, the post-order distribution and verification steps, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Denver, CO 80202",
      "participant.phone": "303-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Uncompahgre Crossing Road, Apartment 14B, Grand Junction, Colorado 81501-2214",
      "participant.phone": "(970) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling 2026-08-28 research-track decision for co_mistaken_identity_expungement "
    + "(data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json), bound by SHA-256 and "
    + "anchor-verified at build time",

  formIdentityNote:
    "The controlling decision records that no dedicated statewide JDF form was located for a § 24-72-702 "
    + "mistaken-identity expungement and directs a custom civil petition with a listed set of contents. Both "
    + "filing pages are therefore composed by this build from that committed decision, carrying exactly the "
    + "listed contents. Colorado's JDF sealing forms serve other routes and other families; none was substituted "
    + "and none was invented.",

  routeSelectionNote:
    "One route, one instrument set: the petition states the participant-files-after-90-days ground of "
    + "§ 24-72-702 in its own title and body, and no election control exists on any composed page. The "
    + "no-agency-finding fork is a route boundary, not a choice inside this packet: the recorded rule is that "
    + "with no finding the first output is a written request to the agency for investigation and finding, which "
    + "is a different branch's instrument, and this packet tells that participant to stop.",

  instructionsIntro: [
    "The recorded Colorado rule this packet is built on: C.R.S. § 24-72-702 creates a mandatory agency-first procedure. No later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, the ARRESTING AGENCY must petition the district court in the judicial district where the arrest occurred. If the agency fails to file within that period, YOU may file the petition in the same district court — and no filing fee or other expungement cost may be charged.",
    "THE PRECONDITION IS EXACT: this packet depends on an actual agency finding of mistaken identity, with no charges filed. The recorded rule is that it is not a general vehicle for litigating innocence. If the agency has never made that finding, stop — the recorded first output is a written request to the agency for investigation and finding, and that request is not in this packet.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every arrest fact belongs to the record itself, so every one of them is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  instrumentChoice: null,
  documentsToObtain: [
    ["The agency's mistaken-identity finding - the document recording that the investigation found you were arrested because of mistaken identity", "the arresting agency; the petition attaches it"],
    ["Proof that no charges were filed arising from the arrest", "the district attorney's records office for the judicial district, or the court - ask the arresting agency where the no-charge status is recorded; the petition attaches it"],
    ["Your arrest paperwork, showing the arrest date, the agency, the identifiers used, and the case or incident number", "the arresting agency"]
  ],
  steps: [
    "**Confirm the precondition.** You need the agency's actual mistaken-identity finding and proof that no charges were filed. Without the finding, stop: the recorded first output is a written request to the agency, not this petition.",
    "**Establish the expired deadline.** From the finding's date, establish the date 90 days after it. The agency's window to petition has expired only after that date; this petition states that it has.",
    "**Fill in every dotted blank from the records**, including the complete record-custodian list — every office you know of that holds records of the arrest, taken from your arrest paperwork. The proposed order directs the custodians on your list, so a custodian you leave off is one the order may never reach.",
    "**Sign and date the petition yourself.** The platform never signs for you and never dates a signature.",
    "**File the petition, its attachments and the unsigned proposed order** with the district court of the judicial district where the arrest occurred. Pay nothing: the recorded rule is that no filing fee or other expungement cost may be charged, and nothing in this packet asks you to pay one.",
    "**After the order issues, distribute and verify.** Ask the office of the district court how certified copies of the order are obtained, get one for each record custodian on your list, deliver them, and then check with each custodian that its records of the arrest were expunged. Keep dated proof of each delivery and each answer."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of the proposed order that decides anything**, including the court's signature and date. The order is the court's to make.",
    "**The case number of the petition itself.** The court assigns it at filing."
  ],
  notTold: [
    "**How the petition must be delivered, and how certified copies of an order are obtained.** Neither is established by the committed record this packet is built from. The office of the district court of the judicial district where the arrest occurred is the authority that can answer both — ask before you file.",
    "**Where the no-charge status of your arrest is recorded.** The recorded contents require proof that no charges were filed; the arresting agency can tell you where that proof lives."
  ],
  stopConditions: [
    "the agency has never made a mistaken-identity finding — the recorded first output is a written request to the agency for investigation and finding, not this petition;",
    "charges were filed arising from the arrest — the recorded precondition is an arrest with no charges filed;",
    "the 90-day agency deadline has not yet expired — until it does, the recorded duty to petition is the agency's;",
    "the finding, the no-charge status, or anything else about the arrest is disputed — the recorded escalation for a dispute is a lawyer;",
    "you are trying to establish innocence where the agency made no finding — the recorded rule is that this route is not a general vehicle for litigating innocence;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed pleadings for one recorded branch of C.R.S. § 24-72-702. It is not a JDF "
    + "form — the controlling decision records that no dedicated statewide JDF form was located — and it is not "
    + "the written request to the agency for a finding, not a general innocence proceeding, not legal advice, not "
    + "filed for you, and not a promise that the court will act. No fee is asked anywhere in it, because the "
    + "recorded rule is that no filing fee or other expungement cost may be charged.",

  receiptDoesNotEstablish: [
    "that any agency made a mistaken-identity finding in any particular case, or that no charges were filed",
    "that the 90-day agency deadline has expired in any particular case"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: the controlling decision "
        + "records that no dedicated statewide JDF form was located and directs a custom civil petition with a "
        + "listed set of contents.",
      consequence:
        "The petition and proposed order are composed from the committed decision, bound by SHA-256 and "
        + "anchor-verified before composing, and the petition carries every listed content item: the agency's "
        + "finding, the proof no charges were filed, the arrest identifiers, the expired 90-day deadline, the "
        + "record-custodian list, the proposed order, and the post-order distribution and verification "
        + "instructions. No form was substituted and none was invented."
    },
    {
      finding:
        "The recorded precondition is an actual agency finding of mistaken identity with no charges filed, and "
        + "the recorded no-finding output is a written agency request that belongs to a different branch.",
      consequence:
        "The precondition is stated as route-determined text on the petition's face, the no-finding case is a "
        + "stop condition, and no agency-request instrument is carried here."
    },
    {
      finding:
        "The recorded rule is that no filing fee or other expungement cost may be charged on this route.",
      consequence:
        "The petition states the no-fee rule from the record, the instructions repeat it, and nothing in the "
        + "packet asks the participant to pay anything."
    },
    {
      finding:
        "The decision requires a complete record-custodian list but no committed record enumerates the custodians "
        + "of any particular arrest.",
      consequence:
        "The custodian list is a set of labelled required-before-filing blanks, filled from the participant's own "
        + "arrest paperwork, with the instructions explaining that the proposed order directs the custodians on "
        + "the list and that an omitted custodian is one the order may never reach."
    }
  ],
  counselQuestions: [
    "The composed petition asserts the § 24-72-702 participant-filing ground in the committed decision's own words (agency finding; no charges; expired 90-day deadline; same district court; no fee). Confirm the composed instrument is sufficient where no JDF form exists.",
    "The record-custodian list is rendered as participant blanks fed from arrest paperwork. Confirm that presentation, or supply a recorded custodian enumeration.",
    "The post-order distribution and verification instructions direct certified copies to each listed custodian with delegation of copy mechanics to the district court's office. Confirm the delegation or supply the mechanics.",
    "The proposed order is styled as a mandatory expungement order directing the custodians on the petition's list, with every decision line blank. Confirm its wording."
  ],
  reviewersAttention: [
    "source-receipt.json binds a committed repository record rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family serves ONLY the after-90-days participant petition; the no-finding agency request is a different branch with no instrument here."
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
      L.push("DISTRICT COURT, ............................................................ JUDICIAL DISTRICT");
      L.push("COUNTY OF ............................................................, COLORADO");
      L.push("(THE JUDICIAL DISTRICT WHERE THE ARREST OCCURRED, AND ITS COUNTY - the district court's own office can confirm both)", "");
      L.push(`IN RE THE ARREST OF: ${name},`);
      L.push("PETITIONER.", "");
      L.push("Case number: " + DOTS(40) + "  (the court assigns it at filing)", "");
      L.push("PETITION FOR MANDATORY MISTAKEN-IDENTITY EXPUNGEMENT UNDER C.R.S. Sec. 24-72-702");
      L.push("(PARTICIPANT FILING AFTER THE EXPIRED 90-DAY AGENCY DEADLINE - NO FILING FEE OR OTHER EXPUNGEMENT COST MAY BE CHARGED)", "");
      L.push(`1. The petitioner, ${name}, states: a law-enforcement investigation found that the petitioner was arrested because of mistaken identity, and no charges were filed arising from the arrest. Under C.R.S. Sec. 24-72-702, no later than 90 days after that finding the arresting agency was required to petition the district court in the judicial district where the arrest occurred. The agency did not file within that period, and the petitioner therefore files this petition in the same district court, as the statute permits.`, "");
      L.push("2. The petitioner further states:", "");
      L.push(`Petitioner's date of birth: ${dob}`, "");
      L.push("Date of the arrest, exactly as the arrest record states it:");
      L.push(DOTS(), "");
      L.push("Name of the arresting agency:");
      L.push(DOTS(), "");
      L.push("Identifiers used on the arrest record (the name and any other identifiers under which the arrest was recorded):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("Case or incident number of the arrest, from the arrest record:");
      L.push(DOTS(), "");
      L.push("Date of the agency's mistaken-identity finding, from the finding itself:");
      L.push(DOTS(), "");
      L.push("Date 90 days after the finding (the agency's expired deadline):");
      L.push(DOTS(), "");
      L.push("3. Attached to this petition are: the agency's mistaken-identity finding, and proof that no charges were filed arising from the arrest.", "");
      L.push("4. COMPLETE RECORD-CUSTODIAN LIST. The offices known to the petitioner to hold records of the arrest, taken from the arrest paperwork (list every one; the proposed order directs the custodians on this list):");
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("5. The petitioner asks the court to enter the proposed mandatory expungement order filed with this petition, directing expungement of the records of the arrest held by each custodian listed above. No filing fee or other expungement cost may be charged for this petition.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
      L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else if (componentId === "proposed_order") {
      L.push("DISTRICT COURT, ............................................................ JUDICIAL DISTRICT");
      L.push("COUNTY OF ............................................................, COLORADO", "");
      L.push(`IN RE THE ARREST OF: ${name},`);
      L.push("PETITIONER.", "");
      L.push("Case number:");
      L.push(DOTS(), "");
      L.push("PROPOSED ORDER", "");
      L.push("This matter came before the Court on the petition for mandatory mistaken-identity expungement under C.R.S. Sec. 24-72-702. The Court, having considered the petition, the agency's mistaken-identity finding and the proof that no charges were filed,", "");
      L.push("ORDERS that " + DOTS(56), "");
      L.push("(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)", "");
      L.push("DATED " + DOTS(30), "");
      L.push(DOTS(50));
      L.push("(The court signs here if, and only if, it grants the petition.)");
    } else {
      L.push(`This packet is prepared for ${this.routeName}.`, "");
      L.push(`Prepared for: ${name}`, "");
      L.push("THE PRECONDITION, STATED EXACTLY", "");
      L.push("This petition depends on an ACTUAL AGENCY FINDING of mistaken identity, with NO CHARGES FILED, and on the agency's 90-day deadline having EXPIRED. The recorded rule: this route is not a general vehicle for litigating innocence where the agency has never made that determination. If there is no agency finding, the recorded first output is a written request to the agency for investigation and finding - and that request is not in this packet.", "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Get the agency's mistaken-identity finding and proof that no charges were filed. The arresting agency can tell you where the no-charge status is recorded.");
      L.push("STEP TWO. From the finding's date, establish the date 90 days after it. File only after that date has passed with no agency petition.");
      L.push("STEP THREE. Fill in every dotted blank from the records, including the complete record-custodian list from your arrest paperwork. The proposed order directs the custodians on your list - a custodian you leave off is one the order may never reach.");
      L.push("STEP FOUR. Sign and date the petition yourself.");
      L.push("STEP FIVE. File the petition, its attachments and the unsigned proposed order with the district court of the judicial district where the arrest occurred. Pay nothing: the recorded rule is that no filing fee or other expungement cost may be charged. Ask the district court's office how it accepts filings.", "");
      L.push("AFTER THE ORDER: DISTRIBUTION AND VERIFICATION", "");
      L.push("STEP SIX. Ask the office of the district court how certified copies of the order are obtained, and get one for each record custodian on your list.");
      L.push("STEP SEVEN. Deliver a certified copy to each custodian on your list, and keep dated proof of each delivery.");
      L.push("STEP EIGHT. Verify: check with each custodian that its records of the arrest were expunged, and keep each answer. If a custodian does not act on the order, take the order and your proof to a lawyer.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("- the agency has never made a mistaken-identity finding - the recorded first output is a written request to the agency, not this petition;");
      L.push("- charges were filed arising from the arrest;");
      L.push("- the 90-day deadline has not yet expired - until it does, the duty to petition is the agency's;");
      L.push("- the finding or the no-charge status is disputed;");
      L.push("- you are trying to establish innocence without an agency finding;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed pleadings for one recorded branch of C.R.S. Sec. 24-72-702. It is not a JDF form - the controlling decision records that none was located for this route - and it is not the agency request, not a general innocence proceeding, not legal advice, not filed for you, and not a promise that the court will act. No fee is asked anywhere in it.");
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
        h.write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
        h.write("date_of_birth", "Petitioner's date of birth, printed in the petition's statement of facts", "participant.date_of_birth"),
        h.write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
        h.write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
        h.write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
      );
      refusals.push(
        h.rbf("judicial_district", "Judicial district and county named in the caption - where the arrest occurred",
          "the judicial district where the arrest occurred, and its county - the district court's own office can confirm both",
          "where the arrest occurred is a fact of the participant's record, and the statute fixes venue there"),
        h.rbf("arrest_date", "Date of the arrest, exactly as the arrest record states it",
          "the arrest date, copied exactly from the arrest record",
          "no arrest fact is held for a record the platform has not seen"),
        h.rbf("arresting_agency", "Name of the arresting agency, on the petition",
          "the name of the arresting agency, from the arrest record",
          "an agency name is a case fact the participant can obtain, not a field the court owns"),
        h.rbf("identifiers_used", "Identifiers used on the arrest record, listed on the petition",
          "the name and any other identifiers under which the arrest was recorded, copied from the arrest paperwork",
          "what identifiers the arrest was recorded under lives on a record the platform has not seen"),
        h.rbf("case_incident_number", "Case or incident number of the arrest, on the petition",
          "the case or incident number, copied from the arrest record",
          "no record identifier is held for a record the platform has not seen"),
        h.rbf("finding_date", "Date of the agency's mistaken-identity finding, on the petition",
          "the date of the agency's finding, copied from the finding itself",
          "the 90-day deadline runs from a finding the platform has not seen"),
        h.rbf("expired_deadline", "Date 90 days after the finding, on the petition",
          "the calculated date 90 days after the finding - the agency's expired deadline",
          "the deadline is computed from a date the platform does not hold"),
        h.rbf("record_custodian_list", "Complete record-custodian list - the offices known to hold records of the arrest",
          "every office known to hold records of the arrest, taken from your arrest paperwork - the proposed order directs the custodians on this list",
          "which offices hold records of a particular arrest lives in paperwork the platform has not seen"),
        h.clerkBlank("case_number", "Case number of this petition, assigned by the clerk at filing",
          "the clerk assigns the number at filing"),
        h.protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
          "the petitioner signs the petition personally"),
        h.protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
          "a date written before the petition is signed would be false")
      );
    } else if (componentId === "proposed_order") {
      writes.push(h.write("petitioner_name", "Petitioner named in the caption of the proposed order", "participant.full_legal_name"));
      refusals.push(
        h.rbf("order_judicial_district", "Judicial district and county named in the caption of the proposed order",
          "the same judicial district and county you wrote in the petition's caption",
          "the proposed order travels with the petition and carries the same caption the participant establishes"),
        h.rbf("order_case_number", "Case number in the caption of the proposed order",
          "the case number the court assigns at filing, once it exists",
          "no case identifier exists before the court assigns one"),
        h.clerkBlank("order_decision", "The decision line of the proposed order, decided by the court",
          "every decision on the proposed order is the court's"),
        h.clerkBlank("order_signature", "Signature line of the proposed order, for the court",
          "the court signs the order if, and only if, it grants the petition"),
        h.clerkBlank("order_date", "Date line of the proposed order, for the court",
          "the court dates the order when it decides")
      );
    } else {
      writes.push(h.write("petitioner_name", "Person named on this page", "participant.full_legal_name"));
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
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
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
  /* The shared separator-aware splitter, in place of this file's own
   * character-accumulating splitToken. A route key too long for the 468pt
   * column now breaks only after one of its own separators (colon,
   * underscore, slash, dot, hyphen) and never mid-word. hardSplits counts
   * any run with no separator to break on; the assertion below makes that a
   * build failure rather than a shipped split. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
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
  assert.equal(splitToken.hardSplits, 0,
    `composed document "${title}" needed ${splitToken.hardSplits} hard split(s): a token had no separator to break on inside the column. Refusing to ship a mid-word split.`);
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
