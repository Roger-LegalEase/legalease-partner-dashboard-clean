#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Oklahoma juvenile record expungement,
 * 10A O.S. § 2-6-109.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * A COMPOSED TREATMENT that IS a court filing, and one whose destination the
 * repository holds: the compiled profile says the petition goes to the
 * district court where the juvenile record is located. The census records the
 * route's own destination field as not recorded, so a lane reading only the
 * census would have delegated an answer the repository has.
 *
 * The record is careful about what a grant DOES, and so is the packet: the
 * records are sealed rather than destroyed, and juvenile and criminal-justice
 * actors keep access for later proceedings. Promising destruction would be
 * promising something the record says does not happen.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement",
  "worklistGroupId": "composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading",
  "jurisdiction": "OK",
  "legalName": "Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109",
  "routeName": "asking the Oklahoma district court where the juvenile record is located to expunge it under 10A O.S. § 2-6-109",
  "statutes": [
    "10A O.S. § 2-6-109"
  ],
  "routes": [
    {
      "routeKey": "obligation:runtime-only:OK:juvenile-record-expungement"
    }
  ],
  "records": [
    {
      "recordId": "route-contract:OK:juvenile-record-expungement",
      "path": "src/lib/legal-authority/routes/route-splits.json",
      "role": "the committed route contract: this route's mechanism, statute, outcome mode, timing anchor, recorded conditions, required facts and packet components",
      "mustContain": [
        "\"routeKey\": \"OK:juvenile-record-expungement\"",
        "Juvenile record expungement",
        "10A O.S. § 2-6-109",
        "Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109",
        "available at final review, or after successful informal adjustment or closure, when the statutory conditions are met; no generic clock applies",
        "Current Oklahoma law effective July 1, 2026",
        "Exact remedy, offense class, disposition, completion, and operational availability",
        "Excluded offenses and clean-record rules apply",
        "Petition under § 2-6-109",
        "Disposition or closure record"
      ]
    },
    {
      "recordId": "compiled-profile:OK-oklahoma#juvenile-record-expungement",
      "path": "src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json",
      "role": "the compiled state profile's own pathway for this route, carrying the recorded substance of the statute and, where it exists, the recorded self-help boundary",
      "mustContain": [
        "\"id\": \"juvenile-record-expungement\"",
        "A juvenile record subject, parent, guardian, or attorney may petition the district court where the juvenile record is located. The person must have completed the informal adjustment, deferred adjudication, probation, or custody requirements; the case must be dismissed/closing; there must be no adult arrest, charge, indictment, or information pending; and all court costs, restitution, fines, and ordered requirements must be completed. (\\\"https://law.justia.com/codes/oklahoma/title-10a/section-10a-2-6-109/\\\")",
        "If granted, the court orders juvenile court records and related law-enforcement files sealed. The record is deemed never to have occurred, and employers, schools, landlords, and government agencies may not require disclosure. However, juvenile/criminal justice actors may access the records for later juvenile/adult proceedings, sentencing, or placement, and records are not physically destroyed by default. (\\\"https://law.justia.com/codes/oklahoma/title-10a/section-10a-2-6-109/\\\")"
      ]
    },
    {
      "recordId": "route-obligation-census:obligation:runtime-only:OK:juvenile-record-expungement",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this route's exact key, its statutory authority, its recorded destination and its participant-facing instrument",
      "mustContain": [
        "obligation:runtime-only:OK:juvenile-record-expungement",
        "Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109"
      ]
    }
  ],
  "components": [
    {
      "id": "ok-juvenile-expungement-2-6-109-primary-filing-1",
      "routeKey": "obligation:runtime-only:OK:juvenile-record-expungement",
      "role": "primary_filing",
      "title": "Petition - Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109",
      "description": "the composed petition, on this route's own statutory ground",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(the Oklahoma district court where the juvenile record is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "OKLAHOMA JUVENILE EXPUNGEMENT PETITION UNDER 10A O.S. § 2-6-109",
        "",
        "A. WHAT THE COMMITTED RECORD ESTABLISHES ABOUT THIS ROUTE",
        "",
        "This petition is brought on the route the committed route contract records as \"Juvenile record expungement\", under 10A O.S. § 2-6-109.",
        "",
        "The compiled Oklahoma profile records the substance of this route as follows. A juvenile record subject, parent, guardian, or attorney may petition the district court where the juvenile record is located. The person must have completed the informal adjustment, deferred adjudication, probation, or custody requirements; the case must be dismissed/closing; there must be no adult arrest, charge, indictment, or information pending; and all court costs, restitution, fines, and ordered requirements must be completed. (\"https://law.justia.com/codes/oklahoma/title-10a/section-10a-2-6-109/\")",
        "",
        "The committed contract records the timing of this route as: available at final review, or after successful informal adjustment or closure, when the statutory conditions are met; no generic clock applies.",
        "",
        "The committed contract records these conditions on the route: Current Oklahoma law effective July 1, 2026; Exact remedy, offense class, disposition, completion, and operational availability; Excluded offenses and clean-record rules apply.",
        "",
        "B. THE PETITIONER",
        "",
        "Name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is a fact 10A O.S. Sec. 2-6-109 turns on, as the committed records for this route state it. Fill each one from the court or agency document named for it in the participant instructions, never from memory. Nothing in this section is filled in for the petitioner, because the platform holds no juvenile court record.",
        "",
        "[C1 - court and county where the juvenile record is located] The Oklahoma district court, and the county, where the juvenile record is located. The compiled Oklahoma profile records that the petition goes to that court.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - juvenile case number] The case number of the juvenile case whose record is to be sealed.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - nature of the disposition] Which of these the juvenile case ended in: informal adjustment, deferred adjudication, probation, or custody.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - date of the disposition] The date that disposition was entered.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - date the requirements were completed] The date every requirement of that informal adjustment, deferred adjudication, probation or custody was completed. The compiled profile records completion of those requirements as a condition of this route.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - date the case was dismissed or closed] The date the juvenile case was dismissed or closed. The compiled profile records that the case must be dismissed or closing.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - adult matters pending] Whether any adult arrest, charge, indictment or information is pending against the petitioner, and if so, what and where. The compiled profile records that there must be none pending.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - court costs, restitution, fines and ordered requirements] Whether all court costs, restitution, fines and ordered requirements in the juvenile case are completed, and the date the last of them was satisfied. The compiled profile records that all of them must be completed.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - law-enforcement agency holding the related file] The law-enforcement agency or agencies holding the files related to this juvenile record. The compiled profile records that a grant seals the juvenile court records AND the related law-enforcement files, so the order has to name the agency that holds them.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the Court to seal the juvenile court records and the related law-enforcement files described above, under 10A O.S. § 2-6-109.",
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
          "id": "fact_court_and_county",
          "label": "Item C1 - court and county where the juvenile record is located",
          "supply": "the Oklahoma district court and county where the juvenile record is located - copy it from the juvenile court's own disposition, dismissal or closure order, or ask the clerk of that court",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_juvenile_case_number",
          "label": "Item C2 - juvenile case number",
          "supply": "the case number of the juvenile case whose record is to be sealed - copy it from the juvenile court's disposition, dismissal or closure order",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_disposition_nature",
          "label": "Item C3 - nature of the disposition",
          "supply": "which of informal adjustment, deferred adjudication, probation or custody the juvenile case ended in - copy it from the juvenile court's disposition order",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_disposition_date",
          "label": "Item C4 - date of the disposition",
          "supply": "the date the disposition was entered - copy it from the juvenile court's disposition order",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_requirements_completed_date",
          "label": "Item C5 - date the requirements were completed",
          "supply": "the date every requirement of the informal adjustment, deferred adjudication, probation or custody was completed - copy it from the completion or discharge record, or from the written confirmation of the office that supervised it",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_dismissed_or_closed_date",
          "label": "Item C6 - date the case was dismissed or closed",
          "supply": "the date the juvenile case was dismissed or closed - copy it from the juvenile court's dismissal or closure order, which the committed contract names as a component of this packet",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_adult_matters_pending",
          "label": "Item C7 - adult matters pending",
          "supply": "whether any adult arrest, charge, indictment or information is pending, and if so what and where - check it against a current Oklahoma State Bureau of Investigation criminal history record rather than answering from memory",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_costs_and_restitution",
          "label": "Item C8 - court costs, restitution, fines and ordered requirements",
          "supply": "whether all court costs, restitution, fines and ordered requirements are completed, and the date the last was satisfied - copy it from the clerk's payment history or receipt for the juvenile case",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "rbf",
          "id": "fact_law_enforcement_agency",
          "label": "Item C9 - law-enforcement agency holding the related file",
          "supply": "the law-enforcement agency or agencies holding the files related to this juvenile record - copy the agency name from the arrest or referral paperwork in the juvenile court file, or ask the clerk of that court",
          "why": "10A O.S. Sec. 2-6-109 turns on this fact as the compiled Oklahoma profile records the route, and it lives on a court or agency record the platform has never seen"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
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
      "id": "ok-juvenile-expungement-2-6-109-filing-instructions-2",
      "routeKey": "obligation:runtime-only:OK:juvenile-record-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109",
      "description": "what this set is, where it goes, what it costs, who is notified, and when to stop",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "FILING INSTRUCTIONS - OKLAHOMA JUVENILE EXPUNGEMENT PETITION UNDER 10A O.S. § 2-6-109",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "The committed route contract records this route as \"Juvenile record expungement\", under 10A O.S. § 2-6-109, with outcome mode \"participant_packet\".",
        "",
        "The committed contract names the packet components for this route as: Petition under § 2-6-109; Disposition or closure record. This packet composes the filing pages; anything on that list that is a RECORD rather than a pleading is a document you obtain and file with the petition.",
        "",
        "Who runs it: The participant petitions and the district court decides. The compiled profile records who may bring it: \"A juvenile record subject, parent, guardian, or attorney may petition the district court where the juvenile record is located. The person must have completed the informal adjustment, deferred adjudication, probation, or custody requirements; the case must be dismissed/closing; there must be no adult arrest, charge, indictment, or information pending; and all court costs, restitution, fines, and ordered requirements must be completed. (\"https://law.justia.com/codes/oklahoma/title-10a/section-10a-2-6-109/\")\"",
        "",
        "WHAT YOU DO",
        "",
        "- Check every condition the compiled record states, because they are cumulative: the requirements completed, the case dismissed or closing, no adult arrest, charge, indictment or information pending, and all court costs, restitution, fines and ordered requirements completed.",
        "- Obtain the disposition or closure record; the committed contract names it as a component of this packet.",
        "- Fill every labelled item from the record, and sign and date the petition personally.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- Do not expect the record to be destroyed. The compiled profile records that the records are SEALED and are not physically destroyed by default, and that juvenile and criminal-justice actors may still access them for later proceedings, sentencing or placement.",
        "- Do not file while an adult arrest, charge, indictment or information is pending. The compiled record makes that an express condition.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "No committed record this packet binds states a filing fee, or a fee waiver, for this route. The office that answers both is the office of the court clerk of the Oklahoma district court where the juvenile record is located. Ask before you go, because a filing you cannot pay for is a filing you cannot make. What the compiled record DOES state about money is a condition rather than a price: all court costs, restitution, fines and ordered requirements must be completed before this relief is available.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the court clerk of the Oklahoma district court where the juvenile record is located.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- any adult arrest, charge, indictment or information is pending — the compiled record makes that an express bar;",
        "- court costs, restitution, fines or ordered requirements are outstanding;",
        "- the case has not been dismissed or closed;",
        "- what you want is destruction of the record rather than sealing — the compiled record states that records are not physically destroyed by default and remain reachable by juvenile and criminal-justice actors;",
        "- any immigration question is involved.",
        ""
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
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
  "composedFromNote": "the committed route contract (src/lib/legal-authority/routes/route-splits.json, OK:juvenile-record-expungement), the compiled Oklahoma profile pathway (src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json#juvenile-record-expungement) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route, and the committed contract's own packet components are a composed petition together with records the participant obtains. Every page in this packet is therefore composed by this build from the committed records; no official form was substituted and none was invented.",
  "routeSelectionNote": "One route, one instrument set: the petition states this route's statutory ground in its own title, body and footer, and no election control exists on any composed page. Where a neighbouring section of the same statute is a different route, the packet says so and tells the participant to stop rather than printing a box to tick.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-only:OK:juvenile-record-expungement",
      "statute": "10A O.S. § 2-6-109",
      "instrument": "Oklahoma Juvenile Expungement Petition under 10A O.S. § 2-6-109",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**The repository establishes this one.** The compiled Oklahoma profile records that the petition goes to \"the district court where the juvenile record is located\". That is the destination this packet states. The census records the route's own destination field as not recorded; the compiled profile answers it for this section, and DET-FEE-AND-WAIVER-001-A2 makes the compiled profile part of the repository this packet must ask first."
    ],
    [
      "FEE_AND_WAIVER",
      "No committed record this packet binds states a filing fee, or a fee waiver, for this route. The office that answers both is the office of the court clerk of the Oklahoma district court where the juvenile record is located. Ask before you go, because a filing you cannot pay for is a filing you cannot make. What the compiled record DOES state about money is a condition rather than a price: all court costs, restitution, fines and ordered requirements must be completed before this relief is available."
    ],
    [
      "SERVICE",
      "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the court clerk of the Oklahoma district court where the juvenile record is located."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** any adult arrest, charge, indictment or information is pending — the compiled record makes that an express bar; **Stop and get help if:** court costs, restitution, fines or ordered requirements are outstanding; **Stop and get help if:** the case has not been dismissed or closed; **Stop and get help if:** what you want is destruction of the record rather than sealing — the compiled record states that records are not physically destroyed by default and remain reachable by juvenile and criminal-justice actors; **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official Oklahoma participant form for this route.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The compiled Oklahoma profile",
      "If granted, the court orders juvenile court records and related law-enforcement files sealed. The record is deemed never to have occurred, and employers, schools, landlords, and government agencies may not require disclosure. However, juvenile/criminal justice actors may access the records for later juvenile/adult proceedings, sentencing, or placement, and records are not physically destroyed by default. (\"https://law.justia.com/codes/oklahoma/title-10a/section-10a-2-6-109/\")"
    ],
    [
      "The committed route contract",
      "This route runs on current Oklahoma law effective July 1, 2026, and the excluded offenses and clean-record rules apply."
    ]
  ],
  "documentsToObtain": [
    [
      "The disposition or closure record — the committed contract names it as a component of this packet",
      "the court clerk of the district court where the juvenile record is located"
    ]
  ],
  "steps": [
    "**Read the filing instructions page.** It says what this route is, who runs it, what the record establishes about cost and notice, and when to stop.",
    "**Fill every labelled item on the petition** from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Obtain every document the filing instructions page lists**, and file them with the petition.",
    "**Sign and date the petition personally.** The platform never signs for you and never dates a signing line.",
    "**File it with the office of the court clerk of the Oklahoma district court where the juvenile record is located**, and ask that office what it charges and how it accepts filings before you go."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "notTold": [],
  "stopConditions": [
    "any adult arrest, charge, indictment or information is pending — the compiled record makes that an express bar;",
    "court costs, restitution, fines or ordered requirements are outstanding;",
    "the case has not been dismissed or closed;",
    "what you want is destruction of the record rather than sealing — the compiled record states that records are not physically destroyed by default and remain reachable by juvenile and criminal-justice actors;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is a composed petition on one Oklahoma route. It is not an official Oklahoma form — no committed record names one for this route — it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any Oklahoma juvenile case has been dismissed or closed, or that every ordered requirement has been completed"
  ],
  "buildFindings": [
    {
      "finding": "The census records this route's destination as not recorded; the compiled Oklahoma profile names it outright as the district court where the juvenile record is located.",
      "consequence": "The packet states the destination rather than delegating it. DET-FEE-AND-WAIVER-001-A2 and A1 together: ask the repository first, and where it answers, say so."
    },
    {
      "finding": "An earlier build printed the route contract's requiredFacts array on the face of the petition as this route's fact set - fourteen items running 'Exact route?', 'Arrest/charge limitations?', 'Prosecutor declination?', 'Reversal/dismissal?', 'DNA innocence?', 'Pardon?', 'Deferred order and dismissal?', 'Full-record versus court-record relief?', 'Reclassification date?', 'Fine amount/payment?', 'Trafficking nexus?', 'Juvenile completion?', 'VPO hearing/vacatur/death?' and 'Portal/automatic status?'. That array is not this route's fact set. All ELEVEN Oklahoma routes in src/lib/legal-authority/routes/route-splits.json carry it identically under ruleId OK-SB2030-2026-ELEVEN-ROUTE-TRANSITION-MAP: it is one question per sibling route plus generic ones, an analyst checklist for choosing between the eleven, not the facts a Sec. 2-6-109 juvenile petition alleges.",
      "consequence": "Printing it on the filing the participant signs was the sibling-route read-across DET-FEE-AND-WAIVER-001-A3 forbids, on the face of a court document, and it asked the participant fourteen questions they cannot answer while never asking for the facts the section turns on. Section C is now the nine facts the compiled Oklahoma profile records this route as turning on - the court and county where the juvenile record is located, the juvenile case number, the nature and date of the disposition, the date its requirements were completed, the date the case was dismissed or closed, whether any adult matter is pending, whether costs, restitution, fines and ordered requirements are completed, and the law-enforcement agency holding the related file - and each blank names the court or agency document to copy it from. The fourteen strings are removed from the route contract's mustContain anchors, because this build no longer reads them."
    },
    {
      "finding": "Correcting the route contract's requiredFacts array itself is NOT done here. That array is shared by eleven Oklahoma routes under one ruleId, and changing it in src/lib/legal-authority/routes/route-splits.json would move ten routes this repair does not hold.",
      "consequence": "The array is left exactly as it stands and this packet simply stops reading it as a participant fact set. If it is to be corrected, that is a separate change against eleven routes."
    },
    {
      "finding": "The compiled profile records the effect of a grant precisely, including that records are NOT physically destroyed by default and that juvenile and criminal-justice actors retain access.",
      "consequence": "That is carried to the participant. A packet that promised destruction would be promising something the record says does not happen."
    }
  ],
  "counselQuestions": [
    "The petition is addressed to the district court where the juvenile record is located, from the compiled profile's own words. Confirm."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT."
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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
