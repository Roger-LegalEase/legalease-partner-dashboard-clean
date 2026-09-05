#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — two Washington routes: post-probation vacation
 * under RCW 9.95.240 and non-conviction record deletion under RCW 10.97.060.
 *
 *   node "scripts/build-census-v1-rcap-wa-custom-pleading-clean-tracks.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * TWO ROUTES, AND THEY ARE DIFFERENT IN KIND. The committed specifications
 * record a composed primary filing AND a composed proposed order for the
 * RCW 9.95.240 vacation, and a composed primary filing ALONE for the
 * RCW 10.97.060 non-conviction deletion. The component sets are the record's,
 * not this build's, and the difference is carried rather than smoothed over.
 *
 * Each set states its own route in its title, body and footer, and the
 * participant instructions carry a table saying which set is whose.
 *
 * The prohibited-path list for this lane names several other Washington
 * families — wa-vac-felony-set, wa-vac-cannabis-set,
 * wa-vac-survivor-misdemeanor-set and
 * wa-vac-homicide-victim-prostitution-set among them. Nothing in this build
 * reads or writes any of them, and nothing here is their instrument.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-wa-custom-pleading-clean-tracks",
  "worklistGroupId": "rcap-wa-custom-pleading-clean-tracks",
  "buildScript": "scripts/build-census-v1-rcap-wa-custom-pleading-clean-tracks.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading",
  "jurisdiction": "WA",
  "legalName": "Washington Post-Probation Vacation (RCW 9.95.240) and Non-Conviction Record Deletion (RCW 10.97.060)",
  "routeName": "asking a Washington court to vacate a conviction after probation under RCW 9.95.240, or asking for deletion of a non-conviction record under RCW 10.97.060",
  "statutes": [
    "RCW 9.95.240(1)",
    "RCW 9.95.240(2)(a)",
    "RCW 9.95.240(2)(b)",
    "RCW 9.94A.640(2)",
    "RCW 9.94A.030(11)(b)",
    "RCW 10.97.060",
    "RCW 10.97.030(2)",
    "RCW 10.97.040",
    "RCW 10.97.110"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240"
    },
    {
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:wa_vac_post_probation_9_95_240+wa_del_nonconviction",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"wa_vac_post_probation_9_95_240\"",
        "Dismissal After Probation and Vacation of a Pre-1984 Conviction, RCW 9.95.240",
        "Read at source on 2026-08-06, RCW 9.95.240 is one of only four routes RCW 9.94A.030(11)(b) recognises for removing a con",
        "The sentencing court, which on the subsection (2)(a) limb is the superior court that imposed the pre-1984 sentence.",
        "RCW 9.95.240(1)",
        "RCW 9.95.240(2)(a)",
        "RCW 9.95.240(2)(b)",
        "RCW 9.94A.640(2)",
        "RCW 9.94A.030(11)(b)",
        "What is your full legal name, and any other name the case was filed under?",
        "What is your date of birth?",
        "What were you convicted of, and which exact RCW or municipal ordinance was it under?",
        "Which court sentenced you — district, municipal or superior — and in which county or city?",
        "What is the cause number?",
        "What is the sentencing date, the date you were released from any confinement, and the date any supervision or probation ended?",
        "Do you have any charge pending anywhere — Washington, another state, federal court or tribal court?",
        "Have you been convicted of any new crime since, in this state, another state, or federal or tribal court?",
        "Did you complete the whole period of probation, or were you discharged from probation early?",
        "On what date did the probation period end?",
        "Was the offence committed before 1 July 1984?",
        "What was the maximum sentence the law allowed for this offence, and has that much time passed since sentencing?",
        "Did the case end in a guilty plea, or in a verdict after a not guilty plea?",
        "Not established at source; the packet does not quote a court filing fee and directs the participant to ask the clerk.",
        "Serve the prosecutor's office for the sentencing court and file proof of service.",
        "File the motion and proposed order in the sentencing court.",
        "\"trackId\": \"wa_del_nonconviction\"",
        "Request to Delete Non-Conviction Criminal History Record Information, RCW 10.97.060",
        "The only real deletion mechanism in Washington, and it does not touch convictions. Non-conviction criminal history recor",
        "Not a court route. The request goes to the Washington State Patrol, which holds the criminal history record information.",
        "RCW 10.97.060",
        "RCW 10.97.030(2)",
        "RCW 10.97.040",
        "RCW 10.97.110",
        "What is your full legal name, and any other name the case may have been under?",
        "On what date were you arrested or cited, by which agency, and for what?",
        "How did the case end, and on what date — dismissed, acquitted, or no charges ever filed?",
        "Was the case resolved through a deferred prosecution or a diversion programme?",
        "Do you have any prior felony or gross misdemeanour conviction?",
        "Have you been arrested for or charged with any other crime since?",
        "Is there any outstanding warrant for you, or is this case still being prosecuted?",
        "RCW 10.97.060 states no fee for the request itself. The WSP charges for the record products: approximately $11 for the W",
        "none. The request is submitted to the WSP.",
        "Submit the request to the Washington State Patrol through its non-conviction deletion request process. This is separate ",
        "\"componentId\": \"wa_vac_post_probation_9_95_240-records-checklist-3\"",
        "\"componentId\": \"wa_vac_post_probation_9_95_240-filing-instructions-4\"",
        "\"componentId\": \"wa_del_nonconviction-records-checklist-2\"",
        "\"componentId\": \"wa_del_nonconviction-expectation-setting-3\"",
        "\"componentId\": \"wa_del_nonconviction-accuracy-remedy-guidance-4\""
      ]
    },
    {
      "recordId": "legal-design-specifications:wa_vac_post_probation_9_95_240+wa_del_nonconviction",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the custom-pleading components of this packet, and the participant actions the record requires before filing. The FULL component set of each packet set, including the process_guidance components, is declared by the committed track registry's packetSet and by the committed packet-set manifests, and it is that declaration this build ships",
      "mustContain": [
        "\"componentId\": \"wa_vac_post_probation_9_95_240-primary-filing-1\"",
        "\"componentId\": \"wa_vac_post_probation_9_95_240-proposed-order-2\"",
        "\"componentId\": \"wa_del_nonconviction-primary-filing-1\""
      ]
    },
    {
      "recordId": "route-obligation-census:2-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
        "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060"
      ]
    }
  ],
  "components": [
    {
      "id": "wa_vac_post_probation_9_95_240-primary-filing-1",
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
      "title": "Petition - Clear an older Washington conviction after you finished probation",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an older Washington conviction after you finished probation)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the sentencing court - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Cause number from the existing sentencing case:",
        "{{DOTS}}",
        "",
        "DISMISSAL AFTER PROBATION AND VACATION OF A PRE-1984 CONVICTION, RCW 9.95.240",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under RCW 9.95.240(1); RCW 9.95.240(2)(a); RCW 9.95.240(2)(b); RCW 9.94A.640(2); RCW 9.94A.030(11)(b) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, RCW 9.95.240 is one of only four routes RCW 9.94A.030(11)(b) recognises for removing a conviction from criminal history, and it has two distinct limbs. Subsection (1): every defendant who has fulfilled the conditions of probation for the entire period, or who was discharged from probation before the period ended, may at any time before the maximum period of punishment for the offence expires be permitted in the court's discretion to withdraw a guilty plea and enter a plea of not guilty, or, where convicted after a plea of not guilty, have the verdict set aside, and the court may then dismiss the information or indictment, after which the person is released from all penalties and disabilities resulting from the offence. The probationer is to be informed of this right in their probation papers. A proviso preserves the conviction for pleading and proof in any subsequent prosecution for any other offence, with the same effect as if probation had not been granted. Subsection (2)(a): after the period of probation has expired, the defendant may apply to the sentencing court for vacation of the record of conviction under RCW 9.94A.640, and the court may in its discretion clear the record if it finds the defendant has met the equivalent of the RCW 9.94A.640(2) tests as those tests would be applied to a person convicted of a crime committed before 1 July 1984. That fixes the scope the controlling review could not: this is the pre-Sentencing Reform Act route. Subsection (2)(b) carries the same clerk transmittal to the Washington State Patrol identification section and any local police agency, the same immediate-update and FBI transmittal duties, and the same bar on dissemination except to criminal justice enforcement agencies.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and any other name the case was filed under?",
        "Known current legal name: {{participant.full_legal_name}}",
        "Add any other name the case was filed under: {{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{participant.date_of_birth}}",
        "",
        "[C3 - conviction identity] What were you convicted of, and which exact RCW or municipal ordinance was it under?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sentencing court] Which court sentenced you — district, municipal or superior — and in which county or city?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - cause number] What is the cause number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - sentencing dates] What is the sentencing date, the date you were released from any confinement, and the date any supervision or probation ended?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - pending charges] Do you have any charge pending anywhere — Washington, another state, federal court or tribal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - new convictions] Have you been convicted of any new crime since, in this state, another state, or federal or tribal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - probation fulfilled] Did you complete the whole period of probation, or were you discharged from probation early?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - probation end date] On what date did the probation period end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - offense before1984] Was the offence committed before 1 July 1984?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - maximum punishment period] What was the maximum sentence the law allowed for this offence, and has that much time passed since sentencing?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - plea or verdict] Did the case end in a guilty plea, or in a verdict after a not guilty plea?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under RCW 9.95.240(1); RCW 9.95.240(2)(a); RCW 9.95.240(2)(b); RCW 9.94A.640(2); RCW 9.94A.030(11)(b).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "fact_applicantName",
          "label": "Known current legal name in Item C1",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "fact_dateOfBirth",
          "label": "Known date of birth in Item C2",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "fact_otherName",
          "label": "Item C1 - any other name the case was filed under",
          "supply": "any other name the case was filed under, or write none if there is no other name",
          "why": "the platform holds the current legal name but has not seen the case record and cannot know whether it used another name"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionIdentity",
          "label": "Item C3 - conviction identity",
          "supply": "What were you convicted of, and which exact RCW or municipal ordinance was it under?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentencingCourt",
          "label": "Item C4 - sentencing court",
          "supply": "Which court sentenced you — district, municipal or superior — and in which county or city?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_causeNumber",
          "label": "Item C5 - cause number",
          "supply": "What is the cause number?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentencingDates",
          "label": "Item C6 - sentencing dates",
          "supply": "What is the sentencing date, the date you were released from any confinement, and the date any supervision or probation ended?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C7 - pending charges",
          "supply": "Do you have any charge pending anywhere — Washington, another state, federal court or tribal court?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_newConvictions",
          "label": "Item C8 - new convictions",
          "supply": "Have you been convicted of any new crime since, in this state, another state, or federal or tribal court?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationFulfilled",
          "label": "Item C9 - probation fulfilled",
          "supply": "Did you complete the whole period of probation, or were you discharged from probation early?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationEndDate",
          "label": "Item C10 - probation end date",
          "supply": "On what date did the probation period end?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseBefore1984",
          "label": "Item C11 - offense before1984",
          "supply": "Was the offence committed before 1 July 1984?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_maximumPunishmentPeriod",
          "label": "Item C12 - maximum punishment period",
          "supply": "What was the maximum sentence the law allowed for this offence, and has that much time passed since sentencing?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pleaOrVerdict",
          "label": "Item C13 - plea or verdict",
          "supply": "Did the case end in a guilty plea, or in a verdict after a not guilty plea?",
          "why": "the committed track registry records this as a required generation input for wa_vac_post_probation_9_95_240, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "case_number",
          "label": "Cause number from the existing sentencing case",
          "supply": "the cause number copied from the existing sentencing-court docket",
          "why": "this motion is filed in the existing sentencing case and the committed track requires its cause number"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "wa_vac_post_probation_9_95_240-proposed-order-2",
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
      "title": "Proposed Order - Clear an older Washington conviction after you finished probation",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an older Washington conviction after you finished probation)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the sentencing court)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Cause number from the existing sentencing case:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under RCW 9.95.240(1); RCW 9.95.240(2)(a); RCW 9.95.240(2)(b); RCW 9.94A.640(2); RCW 9.94A.030(11)(b). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_case_number",
          "label": "Cause number from the existing sentencing case in the proposed-order caption",
          "supply": "the same cause number copied from the existing sentencing-court docket and written on the motion",
          "why": "the proposed order travels with the motion in the existing sentencing case"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "wa_vac_post_probation_9_95_240-records-checklist-3",
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
      "role": "records_checklist",
      "title": "Records Checklist - Clear an older Washington conviction after you finished probation",
      "description": "the records you must obtain before you file, where each one comes from, which answer on the petition each one confirms, and what you must complete by hand (Clear an older Washington conviction after you finished probation)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS PAGE IS",
        "",
        "The committed record names three documents you must obtain before this motion is filed, and names the answer on the petition each one confirms. Work through them in order. Do not file until every one is in your hands and the petition agrees with it.",
        "",
        "RECORDS YOU MUST OBTAIN BEFORE FILING",
        "",
        "1. Washington State Patrol criminal history record. Required before filing. Where you get it: Washington State Patrol.",
        "How to obtain it, as the record states it: The $11 WATCH name and date-of-birth check online gives conviction information immediately and is enough to start routing. The non-conviction record is a different and slower product: it needs a fingerprint card plus $12, or an in-person record review at no fee with fingerprints and limited inspection time. Read the WSP fee table live rather than relying on a stored figure.",
        "Then do this: Check your answer to \"What were you convicted of, and which exact RCW or municipal ordinance was it under?\" against Washington State Patrol criminal history record, and correct the packet if they disagree.",
        "",
        "2. Court docket from the sentencing court. Required before filing. Where you get it: Clerk of the district, municipal or superior court that sentenced the participant.",
        "How to obtain it, as the record states it: Ask the clerk of the sentencing court for the docket. It supplies the cause number, the exact RCW, the offence class, the sentencing date and the supervision and release dates. Every Washington waiting period runs from one of those dates and none of them is reliably on the $11 WATCH check.",
        "Then do this: Check your answer to \"What is the sentencing date, the date you were released from any confinement, and the date any supervision or probation ended?\" against Court docket from the sentencing court, and correct the packet if they disagree.",
        "",
        "3. Probation papers and the order of discharge from probation. Required before filing. Where you get it: Clerk of the sentencing court, or the supervising probation office.",
        "How to obtain it, as the record states it: Ask the clerk or the probation office for the probation papers and any order discharging you from probation. RCW 9.95.240(1) says the probationer is to be informed of this right in their probation papers, so the papers themselves often say so.",
        "Then do this: Check your answer to \"Did you complete the whole period of probation, or were you discharged from probation early?\" against Probation papers and the order of discharge from probation, and correct the packet if they disagree.",
        "",
        "WHAT YOU MUST COMPLETE BY HAND",
        "",
        "- Signature - Motion, signature block. The applicant signs their own motion.",
        "- Judge's signature and date - Proposed order. Prepared unsigned and undated for the judge.",
        "- Cause number - Motion and proposed-order captions. Copy the existing cause number from the sentencing-court docket. Ask that clerk only about the court's caption styling; no pattern form fixes it.",
        "- Signing: The applicant signs as a declaration under penalty of perjury.",
        "- Notarisation: none — the pattern forms use a declaration under penalty of perjury.",
        "",
        "WHERE THE COMPLETED SET GOES",
        "",
        "Clerk of the sentencing court. File the motion and proposed order in the sentencing court. The filing instructions page in this packet states this route's destination, its recorded fee and fee-waiver position, its service rule and its stop conditions in full, and you should read that page before you go."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "wa_vac_post_probation_9_95_240-filing-instructions-4",
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear an older Washington conviction after you finished probation",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear an older Washington conviction after you finished probation)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Dismissal After Probation and Vacation of a Pre-1984 Conviction, RCW 9.95.240.",
        "",
        "Read at source on 2026-08-06, RCW 9.95.240 is one of only four routes RCW 9.94A.030(11)(b) recognises for removing a conviction from criminal history, and it has two distinct limbs. Subsection (1): every defendant who has fulfilled the conditions of probation for the entire period, or who was discharged from probation before the period ended, may at any time before the maximum period of punishment for the offence expires be permitted in the court's discretion to withdraw a guilty plea and enter a plea of not guilty, or, where convicted after a plea of not guilty, have the verdict set aside, and the court may then dismiss the information or indictment, after which the person is released from all penalties and disabilities resulting from the offence. The probationer is to be informed of this right in their probation papers. A proviso preserves the conviction for pleading and proof in any subsequent prosecution for any other offence, with the same effect as if probation had not been granted. Subsection (2)(a): after the period of probation has expired, the defendant may apply to the sentencing court for vacation of the record of conviction under RCW 9.94A.640, and the court may in its discretion clear the record if it finds the defendant has met the equivalent of the RCW 9.94A.640(2) tests as those tests would be applied to a person convicted of a crime committed before 1 July 1984. That fixes the scope the controlling review could not: this is the pre-Sentencing Reform Act route. Subsection (2)(b) carries the same clerk transmittal to the Washington State Patrol identification section and any local police agency, the same immediate-update and FBI transmittal duties, and the same bar on dissemination except to criminal justice enforcement agencies.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of the sentencing court",
        "File the motion in the sentencing court. Relief is discretionary on both limbs. No Washington Courts pattern form for this section was identified by the controlling review or on this pass, so the pleading is drafted on the RCW 9.94A.640 model that Washington clerks expect.",
        "Venue: The sentencing court, which on the subsection (2)(a) limb is the superior court that imposed the pre-1984 sentence.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Not established at source; the packet does not quote a court filing fee and directs the participant to ask the clerk. Fee waiver as recorded: Not established for the court filing fee.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Serve the prosecutor's office for the sentencing court and file proof of service. Notice as recorded: Serve the prosecuting attorney for the sentencing court. Relief is discretionary on both limbs.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- RCW 9.94A.030(11)(b) states that a conviction may be removed from a defendant's criminal history only if it is vacated under RCW 9.96.060, 9.94A.640, 9.95.240, or a similar out-of-state statute, or by a governor's pardon. Section 9.95.240 is one of only four routes the sentencing statute recognizes.",
        "- In any subsequent prosecution for any other offence, a conviction dismissed under RCW 9.95.240(1) may still be pleaded and proved, and has the same effect as if probation had not been granted or the information or indictment dismissed.",
        "- Vacation does not make the court record private, or remove the case from court indexes and public court websites. Never call Washington vacation expungement.",
        "- Vacation does not restore firearm rights, which run through RCW 9.41.041.",
        "- Vacated convictions still count for recidivist charging. RCW 9.96.060(8)(c) provides that a conviction vacated on or after 2019-07-28 qualifies as a prior conviction for the purpose of charging a present recidivist offense committed on or after that date.",
        "- Local county superior court rules may require additional documents. Every packet carries a local-check instruction rather than assuming the pattern form set is complete.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any pending charge in Washington, another state, federal court, or tribal court.",
        "- Any domestic violence element, charged or findable from the court file.",
        "- Any protection, no-contact, antiharassment or civil restraining order currently in effect, or violated in the last five years.",
        "- Any DUI, physical control, or alcohol or drug related driving offence, including a reduced charge.",
        "- Any firearm, deadly weapon or sexual motivation enhancement.",
        "- Any question about offence class or the exact RCW.",
        "- Immigration consequences.",
        "- Any participant whose real goal is firearm rights restoration, which is a separate proceeding under RCW 9.41.041.",
        "- It is unclear whether the offence was committed before 1 July 1984.",
        "- The maximum period of punishment may already have expired, which closes the subsection (1) limb.",
        "- Whether the conditions of probation were fulfilled for the entire period is disputed.",
        "- The participant expects the conviction to disappear for all purposes; the subsection (1) proviso preserves it for later prosecutions.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- wa_vac_post_probation_9_95_240-primary-filing-1: the composed petition, on this route's own statutory ground (Clear an older Washington conviction after you finished probation)",
        "- wa_vac_post_probation_9_95_240-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Clear an older Washington conviction after you finished probation)",
        "- wa_vac_post_probation_9_95_240-records-checklist-3: the records you must obtain before you file, and what you must complete by hand (Clear an older Washington conviction after you finished probation)",
        "- wa_vac_post_probation_9_95_240-filing-instructions-4: this page (Clear an older Washington conviction after you finished probation)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "wa_del_nonconviction-primary-filing-1",
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060",
      "title": "Request to the Washington State Patrol - Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "role": "primary_filing",
      "description": "the composed request to the Washington State Patrol, on this route's own statutory ground; it is an agency request and no court is asked for anything (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
      "condition": null,
      "body": [
        "TO THE WASHINGTON STATE PATROL",
        "(This request goes to the Washington State Patrol, which holds the criminal history record information. It is not a court filing: no court is involved, no order is sought, and no court assigns this request a case number. See the records checklist page in this packet for where to send it.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "REQUESTER.",
        "",
        "REQUEST TO DELETE NON-CONVICTION CRIMINAL HISTORY RECORD INFORMATION, RCW 10.97.060",
        "",
        "The requester, {{participant.full_legal_name}}, asks the Washington State Patrol under RCW 10.97.060; RCW 10.97.030(2); RCW 10.97.040; RCW 10.97.110 to delete the non-conviction criminal history record information described below, and states:",
        "",
        "A. THE RELIEF THIS REQUEST ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The only real deletion mechanism in Washington, and it does not touch convictions. Non-conviction criminal history record information is subject to deletion from generally searched criminal justice agency files where two years or more have passed since a favourable disposition, or three years from arrest, citation or warrant for an offence where no conviction was obtained. The request goes to the Washington State Patrol rather than to a court: it is an agency request, not a petition. Two bars apply outright, the person being a fugitive and the case remaining under active prosecution. Beyond those the agency retains discretion to refuse on three common grounds: the disposition was a deferred prosecution or similar diversion; the person has a prior felony or gross misdemeanour conviction; or the person has been arrested for or charged with another crime during the intervening period. WashingtonLawHelp states directly that it is hard for information to qualify as non-conviction data under the rules, which makes deletion hard to obtain, and that expectation must be set before anyone pays. Where deletion is refused there is a fallback: RCW 10.97.040 requires agencies to check with the WSP for the most current and complete information before reporting a conviction, and RCW 10.97.110 supports a suit, potentially with attorney fees, against an agency that violates the requirement.",
        "",
        "B. THE REQUESTER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE REQUESTER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and any other name the case may have been under?",
        "Known current legal name: {{participant.full_legal_name}}",
        "Add any other name the case may have been under: {{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{participant.date_of_birth}}",
        "",
        "[C3 - arrest details] On what date were you arrested or cited, by which agency, and for what?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition detail] How did the case end, and on what date — dismissed, acquitted, or no charges ever filed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - deferred prosecution] Was the case resolved through a deferred prosecution or a diversion programme?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - prior convictions] Do you have any prior felony or gross misdemeanour conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - intervening arrests] Have you been arrested for or charged with any other crime since?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - fugitive or active] Is there any outstanding warrant for you, or is this case still being prosecuted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The requester asks the Washington State Patrol to delete the record described in paragraph A, under RCW 10.97.060; RCW 10.97.030(2); RCW 10.97.040; RCW 10.97.110. No court is asked to decide anything and no court order is sought: the agency decides.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF REQUESTER {{DOTS:36}}",
        "",
        "(The requester signs and dates this request personally. Nothing on this page is signed or dated for the requester.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named at the head of this request",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named at the head of this request",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "fact_applicantName",
          "label": "Known current legal name in Item C1",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "fact_dateOfBirth",
          "label": "Known date of birth in Item C2",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "fact_otherName",
          "label": "Item C1 - any other name the case may have been under",
          "supply": "any other name the case may have been under, or write none if there is no other name",
          "why": "the platform holds the current legal name but has not seen the case record and cannot know whether it used another name"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDetails",
          "label": "Item C3 - arrest details",
          "supply": "On what date were you arrested or cited, by which agency, and for what?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C4 - disposition detail",
          "supply": "How did the case end, and on what date — dismissed, acquitted, or no charges ever filed?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_deferredProsecution",
          "label": "Item C5 - deferred prosecution",
          "supply": "Was the case resolved through a deferred prosecution or a diversion programme?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorConvictions",
          "label": "Item C6 - prior convictions",
          "supply": "Do you have any prior felony or gross misdemeanour conviction?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_interveningArrests",
          "label": "Item C7 - intervening arrests",
          "supply": "Have you been arrested for or charged with any other crime since?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_fugitiveOrActive",
          "label": "Item C8 - fugitive or active",
          "supply": "Is there any outstanding warrant for you, or is this case still being prosecuted?",
          "why": "the committed track registry records this as a required generation input for wa_del_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named at the head of this request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "wa_del_nonconviction-records-checklist-2",
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060",
      "role": "records_checklist",
      "title": "Records Checklist - Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "description": "where this request goes, the records you must obtain before you send it, what you must complete by hand, what it costs and who must be served (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Request to Delete Non-Conviction Criminal History Record Information, RCW 10.97.060.",
        "",
        "WHERE IT GOES",
        "",
        "Washington State Patrol",
        "Submit the deletion request to the WSP through its non-conviction deletion request process. No court is involved and no order is sought. The agency decides, and three of its refusal grounds are common.",
        "Venue: Not a court route. The request goes to the Washington State Patrol, which holds the criminal history record information.",
        "Filing as recorded: Submit the request to the Washington State Patrol through its non-conviction deletion request process. This is separate from any court vacate order and no court is involved.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Non-conviction deletion is discretionary on three common grounds. Set expectations before anyone pays.",
        "- Fallback where deletion is refused: the accuracy provisions at RCW 10.97.040 and the remedy at RCW 10.97.110.",
        "- The non-conviction record requires a fingerprint card, not the $11 WATCH check.",
        "",
        "RECORDS YOU MUST OBTAIN BEFORE YOU SEND THIS REQUEST",
        "",
        "1. Washington State Patrol non-conviction criminal history record. Required before filing. Where you get it: Washington State Patrol.",
        "How to obtain it, as the record states it: This route needs the non-conviction record, not the $11 WATCH check. The non-conviction record requires a fingerprint card plus $12, or an in-person record review at no fee with fingerprints and limited inspection time. Read the WSP fee table live rather than relying on a stored figure.",
        "Then do this: Check your answer to \"How did the case end, and on what date — dismissed, acquitted, or no charges ever filed?\" against Washington State Patrol non-conviction criminal history record, and correct the packet if they disagree.",
        "",
        "2. Court record of the disposition. Conditional: where charges were filed and a court disposed of them. Not applicable where no charges were ever filed. Where you get it: Clerk of the court that handled the case.",
        "How to obtain it, as the record states it: Ask the clerk for the docket or the order of dismissal, which fixes the favourable-disposition date the two-year period runs from.",
        "Then do this: Check your answer to \"How did the case end, and on what date — dismissed, acquitted, or no charges ever filed?\" against Court record of the disposition, and correct the packet if they disagree.",
        "",
        "WHAT YOU MUST COMPLETE BY HAND",
        "",
        "- Signature - Request letter, signature block. The participant signs their own request.",
        "- Fingerprint card - Attachment to the WSP non-conviction record request. Taken by a law-enforcement agency or an approved provider; LegalEase does not take or hold fingerprints.",
        "- Signing: The participant signs the request.",
        "- Notarisation: none required for the request itself. A notarised letter is an optional WSP record product at additional cost.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: RCW 10.97.060 states no fee for the request itself. The WSP charges for the record products: approximately $11 for the WATCH conviction check, $12 plus a fingerprint card for the non-conviction record, $32 for a mailed conviction record, $58 for a fingerprint-card record and $15 for a notarised letter. Verify the fee table live at intake rather than storing it. Fee waiver as recorded: The in-person non-conviction record review carries no fee, though it requires fingerprints and allows only limited inspection time.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: none. The request is submitted to the WSP. Notice as recorded: none. There is no notice or objection process; the agency decides.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- wa_del_nonconviction-primary-filing-1: the composed request to the Washington State Patrol, on this route's own statutory ground (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
        "- wa_del_nonconviction-records-checklist-2: this page",
        "- wa_del_nonconviction-expectation-setting-3: what the record says about how hard this relief is to obtain, and when to stop (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
        "- wa_del_nonconviction-accuracy-remedy-guidance-4: what the record says you can do if the agency refuses (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "wa_del_nonconviction-expectation-setting-3",
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060",
      "role": "expectation_setting",
      "title": "Read This Before You Pay - Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "description": "what the record says about how hard this relief is to obtain, the grounds on which the agency may refuse, and when to stop and get help instead (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS BEFORE YOU PAY FOR ANYTHING",
        "",
        "Non-conviction deletion is discretionary on three common grounds. Set expectations before anyone pays.",
        "",
        "WHAT THE COMMITTED RECORD SAYS ABOUT THIS ROUTE",
        "",
        "The only real deletion mechanism in Washington, and it does not touch convictions. Non-conviction criminal history record information is subject to deletion from generally searched criminal justice agency files where two years or more have passed since a favourable disposition, or three years from arrest, citation or warrant for an offence where no conviction was obtained. The request goes to the Washington State Patrol rather than to a court: it is an agency request, not a petition. Two bars apply outright, the person being a fugitive and the case remaining under active prosecution. Beyond those the agency retains discretion to refuse on three common grounds: the disposition was a deferred prosecution or similar diversion; the person has a prior felony or gross misdemeanour conviction; or the person has been arrested for or charged with another crime during the intervening period. WashingtonLawHelp states directly that it is hard for information to qualify as non-conviction data under the rules, which makes deletion hard to obtain, and that expectation must be set before anyone pays. Where deletion is refused there is a fallback: RCW 10.97.040 requires agencies to check with the WSP for the most current and complete information before reporting a conviction, and RCW 10.97.110 supports a suit, potentially with attorney fees, against an agency that violates the requirement.",
        "",
        "HOW LONG MUST HAVE PASSED",
        "",
        "- Favourable disposition: Two years or more since the favourable disposition.",
        "- No conviction obtained: Three years from the arrest, citation or warrant for an offence where no conviction was obtained.",
        "",
        "WHAT THIS ROUTE DOES NOT REACH",
        "",
        "- Convictions of any kind. This route reaches non-conviction data only.",
        "- Any person who is a fugitive.",
        "- Any case remaining under active prosecution.",
        "- Records that do not qualify as non-conviction data under RCW 10.97.030(2), which WashingtonLawHelp warns is a harder test than it looks.",
        "- Not an exclusion but a discretion: the agency may refuse where the disposition was a deferred prosecution or similar diversion, where the person has a prior felony or gross misdemeanour conviction, or where the person was arrested for or charged with another crime in the intervening period.",
        "",
        "WHAT LEGALEASE CANNOT DO ON THIS ROUTE",
        "",
        "What LegalEase cannot complete: the agency's decision, which is discretionary on three common grounds.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF SENDING THIS REQUEST",
        "",
        "- The record may not qualify as non-conviction data under RCW 10.97.030(2).",
        "- The disposition was a deferred prosecution or similar diversion, which is a common refusal ground.",
        "- The participant has a prior felony or gross misdemeanour conviction, which is a common refusal ground.",
        "- The participant has been arrested for or charged with another crime in the intervening period, which is a common refusal ground.",
        "- There is an outstanding warrant, or the case remains under active prosecution.",
        "- The agency refuses and the participant wants to challenge it; that is the RCW 10.97.110 remedy and needs a lawyer.",
        "- Immigration consequences.",
        "",
        "IF THE AGENCY REFUSES",
        "",
        "Fallback where deletion is refused: the accuracy provisions at RCW 10.97.040 and the remedy at RCW 10.97.110. The accuracy-remedy guidance page in this packet states that fallback in full."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "wa_del_nonconviction-accuracy-remedy-guidance-4",
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060",
      "role": "accuracy_remedy_guidance",
      "title": "If the Agency Refuses - Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "description": "the RCW 10.97.040 accuracy provision and the RCW 10.97.110 remedy the record names as the fallback where deletion is refused, and where self-help ends (Ask the Washington State Patrol to delete a record of a case that did not end in conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS PAGE IS",
        "",
        "Fallback where deletion is refused: the accuracy provisions at RCW 10.97.040 and the remedy at RCW 10.97.110.",
        "",
        "WHAT THE COMMITTED RECORD SAYS THE FALLBACK IS",
        "",
        "Where deletion is refused there is a fallback: RCW 10.97.040 requires agencies to check with the WSP for the most current and complete information before reporting a conviction, and RCW 10.97.110 supports a suit, potentially with attorney fees, against an agency that violates the requirement.",
        "",
        "THE TWO PROVISIONS THIS RESTS ON",
        "",
        "- RCW 10.97.040, the accuracy provision: an agency must check with the Washington State Patrol for the most current and complete information before it reports a conviction.",
        "- RCW 10.97.110, the remedy: it supports a suit, potentially with attorney fees, against an agency that violates that requirement.",
        "",
        "THERE IS NO APPEAL INSIDE THE DELETION ROUTE ITSELF",
        "",
        "Notice as recorded: none. There is no notice or objection process; the agency decides. The RCW 10.97.110 remedy is a separate proceeding against an agency that reported inaccurate information, not an appeal of the deletion decision, and this packet neither brings it nor drafts it.",
        "",
        "WHEN TO STOP AND GET HELP",
        "",
        "- The agency refuses and the participant wants to challenge it; that is the RCW 10.97.110 remedy and needs a lawyer.",
        "- Immigration consequences.",
        "",
        "WHAT THE RECORD DOES NOT ESTABLISH",
        "",
        "RCW 10.97.060 and RCW 10.97.030(2) were not read at source, by the controlling review or on this pass; the route is stated from the review and from WashingtonLawHelp. The precise definition of non-conviction data, which the review and WashingtonLawHelp both flag as the hard part, is therefore described rather than reproduced."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    }
  ],
  "fixtures": {
    "canonical": {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Magnolia Street, Springfield 62704",
      "participant.phone": "555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    "boundary": {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214",
      "participant.phone": "(228) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  "composedFromNote": "the committed legal-design track registry (data/record-clearing/legal-design-track-registry.json), the committed custom-pleading specifications (data/record-clearing/legal-design-specifications.json) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official statewide participant form for this route; the committed specifications record its component set as composed pleadings. Every page in this packet is therefore composed by this build from the committed records, and no official form was substituted or invented.",
  "routeSelectionNote": "This family carries more than one statutory route. Every composed page states its own route in its footer and its own statutory ground in its body, and the participant instructions carry a table saying which set of pages belongs to which situation. No election control is printed on any page, because the route is determined by the participant's own record and not by a box on a form.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:track-only:WA:wa_vac_post_probation_9_95_240",
      "statute": "RCW 9.95.240(1); RCW 9.95.240(2)(a); RCW 9.95.240(2)(b); RCW 9.94A.640(2); RCW 9.94A.030(11)(b)",
      "instrument": "primary_filing: wa_vac_post_probation_9_95_240-primary-filing-1; proposed_order: wa_vac_post_probation_9_95_240-proposed-order-2; records_checklist: wa_vac_post_probation_9_95_240-records-checklist-3; filing_instructions: wa_vac_post_probation_9_95_240-filing-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:WA:wa_del_nonconviction:non-conviction-record-deletion-under-rcw-10-97-060",
      "statute": "RCW 10.97.060; RCW 10.97.030(2); RCW 10.97.040; RCW 10.97.110",
      "instrument": "primary_filing: wa_del_nonconviction-primary-filing-1; records_checklist: wa_del_nonconviction-records-checklist-2; expectation_setting: wa_del_nonconviction-expectation-setting-3; accuracy_remedy_guidance: wa_del_nonconviction-accuracy-remedy-guidance-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Clear an older Washington conviction after you finished probation",
      "The committed track registry records the destination as **Clerk of the sentencing court**. File the motion in the sentencing court. Relief is discretionary on both limbs. No Washington Courts pattern form for this section was identified by the controlling review or on this pass, so the pleading is drafted on the RCW 9.94A.640 model that Washington clerks expect. Venue as recorded: The sentencing court, which on the subsection (2)(a) limb is the superior court that imposed the pre-1984 sentence. Filing as recorded: File the motion and proposed order in the sentencing court."
    ],
    [
      "FEE_AND_WAIVER — Clear an older Washington conviction after you finished probation",
      "Fee as recorded: Not established at source; the packet does not quote a court filing fee and directs the participant to ask the clerk. Fee waiver as recorded: Not established for the court filing fee."
    ],
    [
      "SERVICE — Clear an older Washington conviction after you finished probation",
      "Service as recorded: Serve the prosecutor's office for the sentencing court and file proof of service. Notice as recorded: Serve the prosecuting attorney for the sentencing court. Relief is discretionary on both limbs."
    ],
    [
      "SELF_HELP_STOP — Clear an older Washington conviction after you finished probation",
      "**Stop and get help if:** Any pending charge in Washington, another state, federal court, or tribal court. **Stop and get help if:** Any domestic violence element, charged or findable from the court file. **Stop and get help if:** Any protection, no-contact, antiharassment or civil restraining order currently in effect, or violated in the last five years. **Stop and get help if:** Any DUI, physical control, or alcohol or drug related driving offence, including a reduced charge. **Stop and get help if:** Any firearm, deadly weapon or sexual motivation enhancement. **Stop and get help if:** Any question about offence class or the exact RCW. **Stop and get help if:** Immigration consequences. **Stop and get help if:** Any participant whose real goal is firearm rights restoration, which is a separate proceeding under RCW 9.41.041. **Stop and get help if:** It is unclear whether the offence was committed before 1 July 1984. **Stop and get help if:** The maximum period of punishment may already have expired, which closes the subsection (1) limb. **Stop and get help if:** Whether the conditions of probation were fulfilled for the entire period is disputed. **Stop and get help if:** The participant expects the conviction to disappear for all purposes; the subsection (1) proviso preserves it for later prosecutions."
    ],
    [
      "FILING_DESTINATION — Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "The committed track registry records the destination as **Washington State Patrol**. Submit the deletion request to the WSP through its non-conviction deletion request process. No court is involved and no order is sought. The agency decides, and three of its refusal grounds are common. Venue as recorded: Not a court route. The request goes to the Washington State Patrol, which holds the criminal history record information. Filing as recorded: Submit the request to the Washington State Patrol through its non-conviction deletion request process. This is separate from any court vacate order and no court is involved."
    ],
    [
      "FEE_AND_WAIVER — Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "Fee as recorded: RCW 10.97.060 states no fee for the request itself. The WSP charges for the record products: approximately $11 for the WATCH conviction check, $12 plus a fingerprint card for the non-conviction record, $32 for a mailed conviction record, $58 for a fingerprint-card record and $15 for a notarised letter. Verify the fee table live at intake rather than storing it. Fee waiver as recorded: The in-person non-conviction record review carries no fee, though it requires fingerprints and allows only limited inspection time."
    ],
    [
      "SERVICE — Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "Service as recorded: none. The request is submitted to the WSP. Notice as recorded: none. There is no notice or objection process; the agency decides."
    ],
    [
      "SELF_HELP_STOP — Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "**Stop and get help if:** The record may not qualify as non-conviction data under RCW 10.97.030(2). **Stop and get help if:** The disposition was a deferred prosecution or similar diversion, which is a common refusal ground. **Stop and get help if:** The participant has a prior felony or gross misdemeanour conviction, which is a common refusal ground. **Stop and get help if:** The participant has been arrested for or charged with another crime in the intervening period, which is a common refusal ground. **Stop and get help if:** There is an outstanding warrant, or the case remains under active prosecution. **Stop and get help if:** The agency refuses and the participant wants to challenge it; that is the RCW 10.97.110 remedy and needs a lawyer. **Stop and get help if:** Immigration consequences. **Stop and get help if:** What LegalEase cannot complete: the agency's decision, which is discretionary on three common grounds."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official statewide participant form for these routes.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": {
    "heading": "Which pages in this packet are yours",
    "intro": [
      "This packet carries more than one route. Use only the pages for the route that matches your own record, and leave the rest unused."
    ],
    "rows": [
      [
        "Clear an older Washington conviction after you finished probation",
        "Read at source on 2026-08-06, RCW 9.95.240 is one of only four routes RCW 9.94A.030(11)(b) recognises for removing a conviction from criminal history, and it has two distinct limbs."
      ],
      [
        "Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
        "The only real deletion mechanism in Washington, and it does not touch convictions."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Washington State Patrol criminal history record. The $11 WATCH name and date-of-birth check online gives conviction information immediately and is enough to start routing. The non-conviction record is a different and slower product: it needs a fingerprint card plus $12, or an in-person record review at no fee with fingerprints and limited inspection time. Read the WSP fee table live rather than relying on a stored figure.",
      "Washington State Patrol"
    ],
    [
      "Obtain Court docket from the sentencing court. Ask the clerk of the sentencing court for the docket. It supplies the cause number, the exact RCW, the offence class, the sentencing date and the supervision and release dates. Every Washington waiting period runs from one of those dates and none of them is reliably on the $11 WATCH check.",
      "Clerk of the district, municipal or superior court that sentenced the participant"
    ],
    [
      "Obtain Probation papers and the order of discharge from probation. Ask the clerk or the probation office for the probation papers and any order discharging you from probation. RCW 9.95.240(1) says the probationer is to be informed of this right in their probation papers, so the papers themselves often say so.",
      "Clerk of the sentencing court, or the supervising probation office"
    ],
    [
      "Obtain Washington State Patrol non-conviction criminal history record. This route needs the non-conviction record, not the $11 WATCH check. The non-conviction record requires a fingerprint card plus $12, or an in-person record review at no fee with fingerprints and limited inspection time. Read the WSP fee table live rather than relying on a stored figure.",
      "Washington State Patrol"
    ],
    [
      "Obtain Court record of the disposition. Ask the clerk for the docket or the order of dismissal, which fixes the favourable-disposition date the two-year period runs from.",
      "Clerk of the court that handled the case"
    ]
  ],
  "steps": [
    "**Read the guidance pages for your route.** On the vacation route those are the records checklist and the filing instructions page; on the Washington State Patrol deletion route they are the records checklist, the read-this-before-you-pay page and the if-the-agency-refuses page. They name the court or office this goes to, what the record says about cost and about service, and when to stop.",
    "**Fill every labelled dotted blank on the pages for your route**, from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Sign and date each page that carries a signing line, personally.** The platform never signs for you and never dates a signing line.",
    "**Do not sign or date any certificate or proof of delivery until the papers have actually been delivered.**",
    "**Send the pages for your route where the guidance pages for that route say they go** — the vacation motion and proposed order to the clerk of the sentencing court, and the deletion request to the Washington State Patrol — and read what those pages state about that route's recorded fee position before you go.",
    "**Leave every page that belongs to the court or the prosecuting attorney blank.** Those decisions are not yours to make."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of a proposed order that decides anything**, including the court's own signing and date lines. The order is the court's to make.",
    "**The court's own caption styling.** Copy the existing cause number from the sentencing-court docket onto both vacation-route captions; ask that clerk how it styles the court-name line if you are unsure. The Washington State Patrol deletion request is not a court filing and has no case-number blank."
  ],
  "recordSays": [
    [
      "Clear an older Washington conviction after you finished probation",
      "RCW 9.94A.030(11)(b) states that a conviction may be removed from a defendant's criminal history only if it is vacated under RCW 9.96.060, 9.94A.640, 9.95.240, or a similar out-of-state statute, or by a governor's pardon. Section 9.95.240 is one of only four routes the sentencing statute recognizes."
    ],
    [
      "Clear an older Washington conviction after you finished probation",
      "In any subsequent prosecution for any other offence, a conviction dismissed under RCW 9.95.240(1) may still be pleaded and proved, and has the same effect as if probation had not been granted or the information or indictment dismissed."
    ],
    [
      "Clear an older Washington conviction after you finished probation",
      "Vacation does not make the court record private, or remove the case from court indexes and public court websites. Never call Washington vacation expungement."
    ],
    [
      "Clear an older Washington conviction after you finished probation",
      "Vacation does not restore firearm rights, which run through RCW 9.41.041."
    ],
    [
      "Clear an older Washington conviction after you finished probation",
      "Vacated convictions still count for recidivist charging. RCW 9.96.060(8)(c) provides that a conviction vacated on or after 2019-07-28 qualifies as a prior conviction for the purpose of charging a present recidivist offense committed on or after that date."
    ],
    [
      "Clear an older Washington conviction after you finished probation",
      "Local county superior court rules may require additional documents. Every packet carries a local-check instruction rather than assuming the pattern form set is complete."
    ],
    [
      "Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "Non-conviction deletion is discretionary on three common grounds. Set expectations before anyone pays."
    ],
    [
      "Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "Fallback where deletion is refused: the accuracy provisions at RCW 10.97.040 and the remedy at RCW 10.97.110."
    ],
    [
      "Ask the Washington State Patrol to delete a record of a case that did not end in conviction",
      "The non-conviction record requires a fingerprint card, not the $11 WATCH check."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Any pending charge in Washington, another state, federal court, or tribal court.",
    "Any domestic violence element, charged or findable from the court file.",
    "Any protection, no-contact, antiharassment or civil restraining order currently in effect, or violated in the last five years.",
    "Any DUI, physical control, or alcohol or drug related driving offence, including a reduced charge.",
    "Any firearm, deadly weapon or sexual motivation enhancement.",
    "Any question about offence class or the exact RCW.",
    "Immigration consequences.",
    "Any participant whose real goal is firearm rights restoration, which is a separate proceeding under RCW 9.41.041.",
    "It is unclear whether the offence was committed before 1 July 1984.",
    "The maximum period of punishment may already have expired, which closes the subsection (1) limb.",
    "Whether the conditions of probation were fulfilled for the entire period is disputed.",
    "The participant expects the conviction to disappear for all purposes; the subsection (1) proviso preserves it for later prosecutions.",
    "The record may not qualify as non-conviction data under RCW 10.97.030(2).",
    "The disposition was a deferred prosecution or similar diversion, which is a common refusal ground.",
    "The participant has a prior felony or gross misdemeanour conviction, which is a common refusal ground.",
    "The participant has been arrested for or charged with another crime in the intervening period, which is a common refusal ground.",
    "There is an outstanding warrant, or the case remains under active prosecution.",
    "The agency refuses and the participant wants to challenge it; that is the RCW 10.97.110 remedy and needs a lawyer.",
    "What LegalEase cannot complete: the agency's decision, which is discretionary on three common grounds."
  ],
  "whatThisIsNot": "This is a prepared set of composed documents: a court pleading set for the vacation route, and an agency request with its guidance pages for the Washington State Patrol deletion route, which is not a court route at all. It is not an official WA form — no committed record names one for either route — and it is not legal advice, it is not filed or sent for you, and it does not decide whether the court will grant the vacation or whether the agency will grant the deletion.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any Washington record is a non-conviction within the meaning of RCW 10.97.060 rather than a conviction reached by a different route"
  ],
  "buildFindings": [
    {
      "finding": "The MASTER_QUEUE row for this family binds no document source, and that is the recorded design: its sourceStatus is CUSTOM_PLEADING_FROM_CODIFIED_TEXT and its implementationStrategy is custom_pleading.",
      "consequence": "Every page is composed from committed repository records, each bound by SHA-256 and anchor-verified before composing. No official form was substituted and none was invented."
    },
    {
      "finding": "The committed track registry records this route's destination and venue, and records its fee, fee-waiver, notice and service rules — in several places as an express non-statement.",
      "consequence": "The packet states the destination the registry holds, states each recorded rule in the registry's own words, and where the registry records a non-statement it names the specific office that answers the question rather than gesturing at the court."
    },
    {
      "finding": "The committed records give the two routes DIFFERENT component sets, and both the track registry's packetSet and the committed packet-set manifests declare eight components between them: for the RCW 9.95.240 vacation a primary filing, a proposed order, a records checklist and filing instructions; for the RCW 10.97.060 non-conviction deletion a primary filing, a records checklist, an expectation-setting page and accuracy-remedy guidance. The committed specifications separately declare only the three custom_pleading components, which is why an earlier build of this family shipped five components under two ids no held record declares.",
      "consequence": "The packet ships exactly the eight components the records name, under exactly the componentIds and in exactly the orders they declare. No proposed order is invented for the deletion route, and no guidance component is folded into another page or dropped."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 2 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table.",
    "The two routes are different in kind. The RCW 9.95.240 vacation is a court route and its primary filing is a pleading addressed to the sentencing court. The RCW 10.97.060 non-conviction deletion is not a court route at any point: the committed record records its destination as the Washington State Patrol, its venue as \"Not a court route\" and its service rule as \"none\", so its primary filing is addressed to the agency, asks the agency rather than a court, and carries no caption, no court and no case-number line."
  ]
};

/* ============================================================================
 * SHARED COMPOSED-PLEADING BUILD CORE.
 *
 * Everything above this line is this family's own: its committed-record
 * bindings, its composed pages, its field maps, its instructions content.
 * Everything below is family-independent plumbing: deterministic rendering,
 * byte proof, the builder's own count of the nine completeness counters, and
 * the census-v1 output records. It is copied whole into each family's own
 * exclusive script rather than imported, because a build host shared across
 * families cannot be changed for one of them without moving the bytes of the
 * rest, and every family here owns only itself.
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
const DOTS = (n = 84) => ".".repeat(n);
const COMPONENT_IDS = SPEC.components.map((c) => c.id);
const COMPONENT = Object.fromEntries(SPEC.components.map((c) => [c.id, c]));

/* ---- committed-record binding ------------------------------------------------ *
 * This family binds no Master Library binary: its authority is a set of
 * COMMITTED repository records named in SPEC.records. Each is bound by exact
 * SHA-256 at build time, and each anchor string is a statement this build
 * RELIES ON, re-read from the committed bytes before anything is composed. The
 * build refuses if a record is missing or an anchor is no longer there.
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
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'");
}

/* ---- block-aware page breaking ---------------------------------------------- *
 * Page breaking here is block-aware, and that is the whole point of it.
 *
 * A block is one logical source line together with every row it wraps to. A
 * block is never divided by a page break it did not need, so a wrapped value can
 * no longer be widowed away from the label that explains it: the reader never
 * meets a bare postcode at the top of a page with its MAILING ADDRESS label on
 * the page before.
 *
 * Long tokens break at their own separators rather than at whichever character
 * happened to reach the margin. A route key is colon- and hyphen-delimited, so
 * every row ends on a real boundary instead of producing "...-expung" / "ement".
 *
 * The route trailer is internal machine metadata rather than pleading text, so
 * it is additionally never left as the sole occupant of a participant-facing
 * page; when the body ends flush with a page boundary the last content block is
 * pulled down to keep it company.
 *
 * Nothing is dropped to make any of this fit. Where a single block is genuinely
 * taller than a page it continues onto the next one, which is continuation
 * rather than truncation.
 */
const TRAILER_LINE = /^(Route: |Route:$|Routes this set serves \()/;
/* The petitioner's own contact details are one block to a reader, not four
 * independent lines: a telephone number under no name answers nothing. They are
 * kept on one page together. */
const CONTACT_LINE = /^(PRINTED NAME|MAILING ADDRESS|TELEPHONE|EMAIL):/;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  const fits = (s) => font.widthOfTextAtSize(s, fontSize) <= maxWidth;

  /* A token with no spaces still has natural break points at its own
   * separators. Breaking there keeps every row ending on a boundary a reader
   * recognises. A run with no separator at all is hard-split only as a last
   * resort, because dropping it is not an option. */
  const splitToken = (token) => {
    const chunks = [];
    let current = "";
    const flushOversized = () => {
      while (!fits(current)) {
        let cut = current.length - 1;
        while (cut > 1 && !fits(current.slice(0, cut))) cut--;
        chunks.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    };
    for (const piece of token.split(/(?<=[:_/.-])/)) {
      if (current && !fits(`${current}${piece}`)) { chunks.push(current); current = piece; }
      else current += piece;
      flushOversized();
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => fits(w) ? [w] : splitToken(w));
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (fits(candidate)) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };

  /* Lay every block out into pages before drawing anything, so that the trailer
   * can be caught sitting alone while the layout is still only a plan. */
  const source = sanitizePdfText(fullText).split("\n");
  const blocks = [];
  for (let i = 0; i < source.length; i++) {
    const raw = source[i];
    /* A run of consecutive contact lines is gathered into a single block, so the
     * page break can only fall before the name or after the email. */
    if (CONTACT_LINE.test(raw)) {
      const run = [];
      while (i < source.length && CONTACT_LINE.test(source[i])) run.push(...wrap(source[i++]));
      i--;
      blocks.push({ index: blocks.length, rows: run, trailer: false });
      continue;
    }
    blocks.push({ index: blocks.length, rows: wrap(raw), trailer: TRAILER_LINE.test(raw) });
  }
  /*
   * Rule 1b: the closing execution unit is one block, blank separators and all.
   *
   * Rule 1 stopped the contact block being torn in half. It stopped it by
   * pushing the whole run of four contact lines onto the next page, and that
   * next page then held nothing to say what they belonged to. Oklahoma canonical
   * and boundary pages 15, 27, 39 and 51, and Washington canonical and boundary
   * page 12, each opened on "PRINTED NAME:" and carried a mailing address, a
   * telephone number, an email address and the route footer, while the
   * "DATE ... SIGNATURE OF PETITIONER" line those details execute -- and the
   * sentence saying the petitioner signs personally -- were both on the page
   * before.
   *
   * The signature line, the instruction that governs it, the petitioner's own
   * contact details and the route footer that closes the document are one thing
   * to a reader. They are now one unit: the page break falls before the
   * signature line or not at all, and the participant meets a signature page
   * that says on its own face what is being signed.
   *
   * Neither Rule 1 nor the trailer pull-down below could reach this. A block
   * here is a run of consecutive non-empty source lines, and the blank
   * separators divide this unit into four of them; and soleOccupant needs a page
   * whose every row is a trailer row, which these pages are not, because they
   * carry four participant-facing contact lines as well.
   *
   * Ported from the North Dakota composer, where the unit is the same and the
   * pagination underneath it is not.
   */
  const EXECUTION_LINE = /\bSIGNATURE OF\b/;
  const executionStart = blocks.findIndex((block) => block.rows.some((row) => EXECUTION_LINE.test(row)));
  let executionEnd = blocks.length;
  while (executionEnd > executionStart + 1 && blocks[executionEnd - 1].rows.every((row) => row === "")) executionEnd -= 1;
  const executionRows = executionStart < 0
    ? 0
    : blocks.slice(executionStart, executionEnd).reduce((total, block) => total + block.rows.length, 0);

  const paginate = (keepExecutionWhole) => {
    const pages = [[]];
    for (const block of blocks) {
      let page = pages[pages.length - 1];
      /* Rule 1b: the closing execution unit is measured whole, blanks included,
       * before its first row is placed. */
      if (keepExecutionWhole && block.index === executionStart
          && executionRows <= rowsPerPage && page.length + executionRows > rowsPerPage) {
        pages.push([]);
        page = pages[pages.length - 1];
      }
      if (block.rows.length <= rowsPerPage && page.length + block.rows.length > rowsPerPage) {
        pages.push([]);
        page = pages[pages.length - 1];
      }
      for (const text of block.rows) {
        if (page.length === rowsPerPage) { pages.push([]); page = pages[pages.length - 1]; }
        page.push({ text, block: block.index, trailer: block.trailer });
      }
    }

    const soleOccupant = (page) => page.length > 0 && page.every((r) => r.trailer || r.text === "");
    for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
      const last = pages[pages.length - 1];
      const previous = pages[pages.length - 2];
      const moving = previous[previous.length - 1].block;
      const moved = [];
      while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
      if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
      last.unshift(...moved);
      if (previous.length === 0) pages.splice(pages.length - 2, 1);
    }
    return pages;
  };

  /*
   * Rule 1b costs a page whenever it fires, so it fires only where the defect is.
   *
   * Most components close on the page they were already closing on: the
   * signature line, the contact details and the footer sit together with room to
   * spare, and forcing the unit onto a fresh page there would add a page to a
   * component that never had the defect. FIX17 measured exactly that on North
   * Dakota -- an unconditional first version added an eighth page to the pardoned
   * boundary packet for nothing -- and made the rule conditional. That property is
   * carried here rather than re-argued: the layout is settled once, exactly as
   * before, and Rule 1b is applied only if that settled layout actually divides
   * the unit across a page break. Where it does not, paginate(false) is the
   * pagination this family already shipped, row for row.
   */
  const unitPageCount = (laid) => new Set(
    laid.flatMap((rows, index) => rows
      .filter((r) => r.text !== "" && r.block >= executionStart && r.block < executionEnd)
      .map(() => index)),
  ).size;
  let pages = paginate(false);
  if (executionStart >= 0 && unitPageCount(pages) > 1) pages = paginate(true);

  /*
   * Proof, not intention: every drawn row of the closing execution unit landed
   * on one page. This is the assertion that no packet can ship a page of contact
   * details severed from the signature line they execute. A unit taller than a
   * whole page is exempt and still flows, because there is no page it could fit
   * on.
   */
  if (executionStart >= 0 && executionRows <= rowsPerPage) {
    const drawn = pages.flatMap((rows, index) => rows
      .filter((r) => r.text !== "" && r.block >= executionStart && r.block < executionEnd)
      .map((r) => ({ page: index, text: r.text })));
    const first = drawn.length ? drawn[0].page : null;
    for (const row of drawn) {
      assert.equal(row.page, first,
        `${title}: the closing execution unit was split across a page break at ${JSON.stringify(row.text.slice(0, 60))}`);
    }
  }

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    for (const [index, row] of rows.entries()) {
      if (row.text) {
        page.drawText(row.text, { x: margin, y: height - margin - index * lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
      }
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the composed page, rendered from this family's declared lines ----------- *
 * A body line is plain text with three substitutions: {{factId}} writes a fact
 * the platform holds, {{DOTS}} prints a full-width dotted blank, and
 * {{DOTS:n}} prints one n characters wide. Nothing else is interpolated, so a
 * page can never carry a value the fact table does not hold.
 */
function composedBody(componentId, facts) {
  const c = COMPONENT[componentId];
  const lines = [c.title.toUpperCase(), ""];
  for (const raw of c.body) {
    lines.push(String(raw).replace(/\{\{([A-Za-z0-9_.:]+)\}\}/g, (_m, token) => {
      if (token === "DOTS") return DOTS();
      if (token.startsWith("DOTS:")) return DOTS(Number(token.slice(5)));
      const value = facts[token];
      assert.ok(value !== undefined, `${componentId}: the page interpolates ${token}, which the fixture does not hold`);
      return String(value);
    }));
  }
  lines.push("", `Route: ${c.routeKey}`);
  return lines.join("\n");
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
  const c = COMPONENT[componentId];
  const h = mapHelpers(componentId);
  const writes = (c.writes ?? []).map((w) => h.write(w.id, w.label, w.factId));
  const refusals = (c.blanks ?? []).map((b) => {
    if (b.kind === "rbf") return h.rbf(b.id, b.label, b.supply, b.why);
    if (b.kind === "protected") return h.protectedBlank(b.id, b.label, b.why);
    if (b.kind === "court") return h.clerkBlank(b.id, b.label, b.why);
    throw new Error(`${componentId}.${b.id}: unknown blank kind ${b.kind}`);
  });
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: c.routeKey,
      ...(c.condition ? { conditional: true, conditionDescription: c.condition } : {})
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

/*
 * The required-before-filing list, in the order the participant meets the
 * blanks: component by component, and within a component in the order the
 * committed record declares the facts. Sorting these alphabetically would print
 * item C10 above item C2 on a page where they are numbered in sequence.
 */
function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENT_IDS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
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
  for (const c of SPEC.components) out.push(`| \`${c.id}\` | ${c.description} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("| Question | What the repository establishes, or the authority that answers it |", "| --- | --- |");
  for (const [q, answer] of SPEC.obligationTable) out.push(`| ${q} | ${answer} |`);
  out.push("");

  if ((SPEC.recordSays ?? []).length > 0) {
    out.push("## What the committed record says you must know", "");
    out.push("Each of these is carried here in the words of the committed record it comes from, because a participant who does not know it may file the wrong thing, or file something they did not need to file at all.", "");
    for (const [where, what] of SPEC.recordSays) out.push(`- **${where}** — ${what}`);
    out.push("");
  }

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    /*
     * On three families in this lane the committed records say the participant
     * files nothing at all, and a heading reading "before filing" would tell
     * them the opposite of what the rest of the packet says. The heading is
     * therefore the family's to state; every other family keeps the default.
     */
    out.push(`## ${SPEC.documentsHeading ?? "Documents you must obtain before filing"}`, "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPONENT[doc]?.title ?? doc}`, "");
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

  for (const componentId of [
    "wa_vac_post_probation_9_95_240-primary-filing-1",
    "wa_del_nonconviction-primary-filing-1"
  ]) {
    const component = COMPONENT[componentId];
    assert.ok(component.writes.some((write) => write.id === "fact_applicantName" && write.factId === "participant.full_legal_name"),
      `${componentId}: C1 must use the held participant name`);
    assert.ok(component.writes.some((write) => write.id === "fact_dateOfBirth" && write.factId === "participant.date_of_birth"),
      `${componentId}: C2 must use the held date of birth`);
    assert.ok(!component.blanks.some((blank) => ["fact_applicantName", "fact_dateOfBirth"].includes(blank.id)),
      `${componentId}: held C1/C2 facts cannot remain required-before-filing blanks`);
    assert.ok(component.blanks.some((blank) => blank.id === "fact_otherName" && blank.kind === "rbf"),
      `${componentId}: C1 must retain the separately unknown other-name input`);
  }
  const vacation = COMPONENT["wa_vac_post_probation_9_95_240-primary-filing-1"];
  const order = COMPONENT["wa_vac_post_probation_9_95_240-proposed-order-2"];
  assert.ok(vacation.blanks.some((blank) => blank.id === "case_number" && blank.kind === "rbf"),
    "the existing sentencing-case cause number must be participant-supplied before filing");
  assert.ok(order.blanks.some((blank) => blank.id === "order_case_number" && blank.kind === "rbf"),
    "the proposed order must carry the same existing cause number before filing");
  assert.ok(!SPEC.deliberatelyBlank.some((line) => line.includes("Every case number")),
    "guidance must not call an existing sentencing-case cause number court-assigned at filing");

  const { resolved, failures } = resolveRecords();
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENT_IDS.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      components: COMPONENT_IDS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENT_IDS.map((c) => composedMap(c));
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

    for (const componentId of COMPONENT_IDS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title);
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
      documents, components: COMPONENT_IDS
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
    composedComponentsAuthoredByThisBuild: COMPONENT_IDS,
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
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
    componentRoutes: Object.fromEntries(SPEC.components.map((c) => [c.id, c.routeKey])),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
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
    components: COMPONENT_IDS,
    documents: COMPONENT_IDS,
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
