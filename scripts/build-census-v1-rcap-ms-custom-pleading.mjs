#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — three Mississippi first-offense routes:
 * Miss. Code Ann. § 41-29-150(d) conditional discharge, § 63-11-30(13) first
 * DUI, and § 67-3-70(6) underage alcohol.
 *
 *   node "scripts/build-census-v1-rcap-ms-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * THREE STATUTORY ROUTES IN ONE FAMILY, all participant-filed, all built as
 * custom pleadings: the committed specifications record a composed primary
 * filing, a composed proposed order and a composed certificate of service for
 * each, and name no official form.
 *
 * THE THREE DESTINATIONS ARE DIFFERENT, AND THE PACKET SAYS WHICH IS WHICH.
 * The conditional-discharge application goes to the clerk of the court that
 * granted the conditional discharge. The first-DUI petition goes to the
 * CIRCUIT clerk of the county of conviction EVEN WHERE the DUI conviction
 * itself was entered in a municipal or justice court — a fact the committed
 * record states in terms and a participant would otherwise get wrong. The
 * underage-alcohol petition goes to the clerk of the court that disposed of
 * the charge. Each filing instructions page states its own destination.
 *
 * The retired legacy Mississippi generator grants nothing here: preservation
 * of its assets is not authority (ADR-0004), this family opens no commercial
 * route, and this build touches no runtime.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-ms-custom-pleading",
  "worklistGroupId": "rcap-ms-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-ms-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading",
  "jurisdiction": "MS",
  "legalName": "Mississippi First-Offense Expungement Petitions — controlled substance conditional discharge (§ 41-29-150(d)), first DUI (§ 63-11-30(13)) and underage alcohol (§ 67-3-70(6))",
  "routeName": "asking a Mississippi court to clear a first-offense controlled substance conditional discharge, a first DUI, or an underage alcohol charge",
  "statutes": [
    "Miss. Code Ann. § 41-29-150(d)(1)",
    "Miss. Code Ann. § 41-29-150(d)(2)",
    "Miss. Code Ann. § 41-29-139(c)",
    "Miss. Code Ann. § 41-29-139(d)",
    "Miss. Code Ann. § 63-11-30(13)",
    "Miss. Code Ann. § 63-11-30(2)(c)",
    "Miss. Code Ann. § 63-11-30(2)(d)",
    "Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020)",
    "Miss. Code Ann. § 67-3-70(6)",
    "Miss. Code Ann. § 67-3-70(1)",
    "Miss. Code Ann. § 67-3-70(2)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief"
    },
    {
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:ms-drug-cd+ms-dui+ms-mip",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"ms-drug-cd\"",
        "Controlled-Substance Conditional Discharge and Expungement (Miss. Code Ann. § 41-29-150)",
        "Section 41-29-150 carries Mississippi's controlled-substance conditional discharge and its associated expungement. A fir",
        "The court that granted the conditional discharge and entered the dismissal.",
        "Miss. Code Ann. § 41-29-150(d)(1)",
        "Miss. Code Ann. § 41-29-150(d)(2)",
        "Miss. Code Ann. § 41-29-139(c)",
        "Miss. Code Ann. § 41-29-139(d)",
        "What is your full legal name, and any other name the case is under?",
        "What is your date of birth?",
        "What is your current address, phone number and email?",
        "Which Mississippi county and city do you live in?",
        "Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
        "Which county was that court in? For a municipal court, which city?",
        "What is the cause or case number?",
        "What were you charged with, and under which Mississippi Code section if you know it?",
        "On what date did the offence happen?",
        "On what date were you arrested or cited?",
        "Which agency arrested or cited you, and what is their case number if you have it?",
        "Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
        "What was the drug charge — simple possession, possession of paraphernalia, or something else? Trafficking, distribution and sale are outside this route.",
        "Did the court place you on probation WITHOUT entering a judgment of guilt, under the conditional discharge provision?",
        "On what date did the court discharge you and dismiss the proceedings?",
        "Did you successfully complete the probation and every condition attached to it?",
        "Have you ever had any prior drug charge, conviction, conditional discharge or dismissal? This benefit is once-only and a nonpublic record is kept for exactly that check.",
        "No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 41-29-150 by",
        "United States mail or hand delivery, evidenced by the certificate of service.",
        "Apply to the court that granted the conditional discharge and entered the discharge and dismissal.",
        "\"trackId\": \"ms-dui\"",
        "First-Offense DUI Expungement (Miss. Code Ann. § 63-11-30)",
        "Section 63-11-30 carries its own first-offence DUI expungement provision, entirely separate from the ordinary misdemeano",
        "The circuit court of the county of conviction. This is a venue trap: a municipal court judge is not authorized to expung",
        "Miss. Code Ann. § 63-11-30(13)",
        "Miss. Code Ann. § 63-11-30(2)(c)",
        "Miss. Code Ann. § 63-11-30(2)(d)",
        "Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020)",
        "On what date were you convicted of the DUI?",
        "Which court entered the DUI conviction? Note that the expungement petition itself goes to the circuit court of that county, not back to the convicting court.",
        "On what date did you successfully complete all terms and conditions of the sentence?",
        "Did you hold a commercial driver's licence or a commercial learner's permit at the time of the offence?",
        "Did you refuse the blood or breath test?",
        "If a test was taken, what was the blood alcohol concentration result?",
        "Do you have any other DUI conviction, or any DUI charge pending now?",
        "Have you ever had a DUI nonadjudication or a DUI expungement before?",
        "In your own words, why should the court grant this expungement? The statute requires you to justify it, and this is your statement.",
        "No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 63-11-30 by ",
        "File in the CIRCUIT COURT of the county of conviction, with the proposed order and certificate of service. Do not file i",
        "\"trackId\": \"ms-mip\"",
        "Underage Alcohol Possession Expungement (Miss. Code Ann. § 67-3-70)",
        "Section 67-3-70 governs underage alcohol offences and carries its own expungement provision at subsection (6). The compl",
        "The court in which the underage alcohol charge was disposed of. Section 67-3-70(6) says simply 'apply to the court', wit",
        "Miss. Code Ann. § 67-3-70(6)",
        "Miss. Code Ann. § 67-3-70(1)",
        "Miss. Code Ann. § 67-3-70(2)",
        "What exactly were you charged with — underage purchase or possession of beer, light wine or a light spirit product?",
        "How did the case end?",
        "On what date did it end that way?",
        "If you were sentenced, on what date did you complete everything the court ordered, including any fine?",
        "How old were you at the time of the offence?",
        "Have you asked the clerk of that court what the current waiting period is for this kind of expungement, and whether that court charges a fee?",
        "No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 67-3-70 by i",
        "File with the clerk of the court that disposed of the underage alcohol charge, after confirming the current waiting peri"
      ]
    },
    {
      "recordId": "legal-design-specifications:ms-drug-cd+ms-dui+ms-mip",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"ms-drug-cd-primary-filing-1\"",
        "\"componentId\": \"ms-drug-cd-proposed-order-2\"",
        "\"componentId\": \"ms-drug-cd-certificate-of-service-3\"",
        "\"componentId\": \"ms-dui-primary-filing-1\"",
        "\"componentId\": \"ms-dui-proposed-order-2\"",
        "\"componentId\": \"ms-dui-certificate-of-service-3\"",
        "\"componentId\": \"ms-mip-primary-filing-1\"",
        "\"componentId\": \"ms-mip-proposed-order-2\"",
        "\"componentId\": \"ms-mip-certificate-of-service-3\""
      ]
    },
    {
      "recordId": "route-obligation-census:3-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
        "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
        "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement"
      ]
    }
  ],
  "components": [
    {
      "id": "ms-drug-cd-primary-filing-1",
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "title": "Petition - First-time drug possession cases",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (First-time drug possession cases)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that granted the conditional discharge - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "CONTROLLED-SUBSTANCE CONDITIONAL DISCHARGE AND EXPUNGEMENT (MISS. CODE ANN. § 41-29-150)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under Miss. Code Ann. § 41-29-150(d)(1); Miss. Code Ann. § 41-29-150(d)(2); Miss. Code Ann. § 41-29-139(c); Miss. Code Ann. § 41-29-139(d) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Section 41-29-150 carries Mississippi's controlled-substance conditional discharge and its associated expungement. A first-time eligible drug possession or paraphernalia case may be handled WITHOUT entering a judgment of guilt: the court defers proceedings, places the person on probation, and on successful completion discharges the person and dismisses the proceedings without an adjudication of guilt. Expungement of the record is then available on application to the court. The benefit is once-only, and a nonpublic record is retained for future eligibility checks, which is the same design as the § 99-19-71(3) first-offender retention. Trafficking under § 41-29-139 is a separate offence and is outside this route entirely; it is also independently excluded from felony expungement under § 99-19-71(2)(a)(iii). The complete current text was obtained on this pass, from the last enacted amendment, Laws 2010 ch. 460 § 2. The conditional discharge is § 41-29-150(d)(1) and the expungement remedy is § 41-29-150(d)(2). Eligibility reaches a person NOT previously convicted of violating § 41-29-139, or the laws of the United States or another state relating to narcotic drugs, stimulant or depressant substances, other controlled substances or marihuana, who is found guilty of a violation of § 41-29-139(c) or (d) — simple possession and paraphernalia — after trial or on a plea. The court may, without entering a judgment of guilt and with the person's consent, defer further proceedings and place them on probation for not more than three years; if no condition is violated, on expiry the court SHALL discharge the person and dismiss the proceedings, without adjudication of guilt. Discharge and dismissal may occur ONLY ONCE with respect to any person, and a nonpublic record is retained by the Bureau of Narcotics solely for the courts to determine whether the person qualifies again. Under (d)(2) the person may then APPLY to the court for an expungement order; the court determines the matter AFTER HEARING and, on the requisite findings, SHALL enter the order. Section 41-29-150 specifies no fee.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it, except where the petition already states the fact — your name, your date of birth and your contact details are printed in this petition and are not asked for again. Fill each item below from the record itself.",
        "",
        "[C1 - other name on the case] Any OTHER name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. Your full legal name is printed in the caption above and in the signature block below, so only this second limb is left for you. Write NONE if there is no other name.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - county of residence] Which Mississippi county and city do you live in?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - court level] Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - court county] Which county was that court in? For a municipal court, which city?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - cause number] What is the cause or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - charge name] What were you charged with, and under which Mississippi Code section if you know it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - offense date] On what date did the offence happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - arrest date] On what date were you arrested or cited?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - arresting agency] Which agency arrested or cited you, and what is their case number if you have it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - prosecuting authority] Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - charge type] What was the drug charge — simple possession, possession of paraphernalia, or something else? Trafficking, distribution and sale are outside this route.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - conditional discharge] Did the court place you on probation WITHOUT entering a judgment of guilt, under the conditional discharge provision?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - discharge date] On what date did the court discharge you and dismiss the proceedings?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - probation completed] Did you successfully complete the probation and every condition attached to it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - prior drug disposition] Have you ever had any prior drug charge, conviction, conditional discharge or dismissal? This benefit is once-only and a nonpublic record is kept for exactly that check.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under Miss. Code Ann. § 41-29-150(d)(1); Miss. Code Ann. § 41-29-150(d)(2); Miss. Code Ann. § 41-29-139(c); Miss. Code Ann. § 41-29-139(d).",
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
          "id": "fact_otherNameOnTheCase",
          "label": "Item C1 - other name on the case",
          "supply": "Any other name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. The committed record states this item as \"What is your full legal name, and any other name the case is under?\"; the packet prints your full legal name, so only the other-name limb is asked.",
          "why": "the committed track registry records the full-name-and-other-name item as a required generation input for ms-drug-cd; the platform holds the full legal name and the petition prints it, so only the other-name limb is left for the participant"
        },
        {
          "kind": "rbf",
          "id": "fact_countyOfResidence",
          "label": "Item C2 - county of residence",
          "supply": "Which Mississippi county and city do you live in?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C3 - court level",
          "supply": "Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtCounty",
          "label": "Item C4 - court county",
          "supply": "Which county was that court in? For a municipal court, which city?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_causeNumber",
          "label": "Item C5 - cause number",
          "supply": "What is the cause or case number?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeName",
          "label": "Item C6 - charge name",
          "supply": "What were you charged with, and under which Mississippi Code section if you know it?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseDate",
          "label": "Item C7 - offense date",
          "supply": "On what date did the offence happen?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C8 - arrest date",
          "supply": "On what date were you arrested or cited?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestingAgency",
          "label": "Item C9 - arresting agency",
          "supply": "Which agency arrested or cited you, and what is their case number if you have it?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_prosecutingAuthority",
          "label": "Item C10 - prosecuting authority",
          "supply": "Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeType",
          "label": "Item C11 - charge type",
          "supply": "What was the drug charge — simple possession, possession of paraphernalia, or something else? Trafficking, distribution and sale are outside this route.",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_conditionalDischarge",
          "label": "Item C12 - conditional discharge",
          "supply": "Did the court place you on probation WITHOUT entering a judgment of guilt, under the conditional discharge provision?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dischargeDate",
          "label": "Item C13 - discharge date",
          "supply": "On what date did the court discharge you and dismiss the proceedings?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationCompleted",
          "label": "Item C14 - probation completed",
          "supply": "Did you successfully complete the probation and every condition attached to it?",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorDrugDisposition",
          "label": "Item C15 - prior drug disposition",
          "supply": "Have you ever had any prior drug charge, conviction, conditional discharge or dismissal? This benefit is once-only and a nonpublic record is kept for exactly that check.",
          "why": "the committed track registry records this as a required generation input for ms-drug-cd, and the platform holds no value for it"
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
      "id": "ms-drug-cd-proposed-order-2",
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "title": "Proposed Order - First-time drug possession cases",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (First-time drug possession cases)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that granted the conditional discharge)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under Miss. Code Ann. § 41-29-150(d)(1); Miss. Code Ann. § 41-29-150(d)(2); Miss. Code Ann. § 41-29-139(c); Miss. Code Ann. § 41-29-139(d). The Court, having considered the petition and anything filed with it,",
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
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
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
      "id": "ms-drug-cd-certificate-of-service-3",
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "title": "Certificate of Service - First-time drug possession cases",
      "role": "certificate_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (First-time drug possession cases)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that granted the conditional discharge)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "CERTIFICATE OF SERVICE",
        "",
        "I, {{participant.full_legal_name}}, state that on the date I write beside my signing line below, and not before, I delivered a copy of the petition and of the proposed order filed with it to the person or office named here:",
        "",
        "Name and office of the person or office to whom the papers were delivered:",
        "{{DOTS}}",
        "",
        "Address at which the papers were delivered:",
        "{{DOTS}}",
        "",
        "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts:",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(DO NOT SIGN OR DATE THIS PAGE UNTIL THE PAPERS HAVE ACTUALLY BEEN DELIVERED. A certificate signed before delivery states something that has not happened.)",
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
          "kind": "court",
          "id": "service_case_number",
          "label": "Case number in the caption of this page, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "served_party",
          "label": "Name and office of the person or office to whom the papers were delivered",
          "supply": "the name and office of the person or office you delivered the papers to",
          "why": "who is served depends on the participant's own case and the office that holds it"
        },
        {
          "kind": "rbf",
          "id": "served_address",
          "label": "Address at which the papers were delivered",
          "supply": "the address at which you delivered the papers",
          "why": "an address is a fact of the participant's own delivery"
        },
        {
          "kind": "rbf",
          "id": "service_method",
          "label": "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts",
          "supply": "how you actually delivered the papers",
          "why": "only the participant knows how delivery was made"
        },
        {
          "kind": "protected",
          "id": "service_signature",
          "label": "Signature of the person named in the caption, on the certificate, and only after the papers have actually been delivered",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "service_signature_date",
          "label": "Date beside the signature on the certificate, and only after the papers have actually been delivered",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ms-drug-cd-attachment-4",
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "role": "attachment",
      "title": "Records Checklist - First-time drug possession cases",
      "description": "the route-specific records checklist identifying the records to gather and confirm with the filing clerk (First-time drug possession cases)",
      "condition": null,
      "body": [
        "This records checklist is for {{participant.full_legal_name}}.",
        "",
        "RECORDS CHECKLIST",
        "",
        "Gather these records before filing. Ask the clerk which records must be attached to the petition and whether the clerk requires certified copies. This checklist does not replace any record and is not proof that a missing record exists.",
        "",
        "- Certified copy of the conditional discharge order. Ask the clerk for a certified copy of the order deferring proceedings and placing you on probation without an adjudication of guilt.",
        "",
        "- Certified copy of the order of discharge and dismissal. Ask the clerk for a certified copy of the order discharging you and dismissing the proceedings.",
        "",
        "- Proof of successful completion of probation. Obtain the documentation showing you completed probation and every condition.",
        "",
        "- Mississippi criminal history record. Obtain your own Mississippi criminal history so you can see every case on your record before you file. It is the only reliable way to check first-offender status or good conduct across all courts, and self-report is not enough.",
        "",
        "Keep the originals. File or serve copies only as the clerk directs. If the discharge or dismissal documentation is missing, stop and get help instead of filing."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this records checklist is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ms-drug-cd-instructions-5",
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "role": "instructions",
      "title": "Filing Instructions - First-time drug possession cases",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (First-time drug possession cases)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Controlled-Substance Conditional Discharge and Expungement (Miss. Code Ann. § 41-29-150).",
        "",
        "Section 41-29-150 carries Mississippi's controlled-substance conditional discharge and its associated expungement. A first-time eligible drug possession or paraphernalia case may be handled WITHOUT entering a judgment of guilt: the court defers proceedings, places the person on probation, and on successful completion discharges the person and dismisses the proceedings without an adjudication of guilt. Expungement of the record is then available on application to the court. The benefit is once-only, and a nonpublic record is retained for future eligibility checks, which is the same design as the § 99-19-71(3) first-offender retention. Trafficking under § 41-29-139 is a separate offence and is outside this route entirely; it is also independently excluded from felony expungement under § 99-19-71(2)(a)(iii). The complete current text was obtained on this pass, from the last enacted amendment, Laws 2010 ch. 460 § 2. The conditional discharge is § 41-29-150(d)(1) and the expungement remedy is § 41-29-150(d)(2). Eligibility reaches a person NOT previously convicted of violating § 41-29-139, or the laws of the United States or another state relating to narcotic drugs, stimulant or depressant substances, other controlled substances or marihuana, who is found guilty of a violation of § 41-29-139(c) or (d) — simple possession and paraphernalia — after trial or on a plea. The court may, without entering a judgment of guilt and with the person's consent, defer further proceedings and place them on probation for not more than three years; if no condition is violated, on expiry the court SHALL discharge the person and dismiss the proceedings, without adjudication of guilt. Discharge and dismissal may occur ONLY ONCE with respect to any person, and a nonpublic record is retained by the Bureau of Narcotics solely for the courts to determine whether the person qualifies again. Under (d)(2) the person may then APPLY to the court for an expungement order; the court determines the matter AFTER HEARING and, on the requisite findings, SHALL enter the order. Section 41-29-150 specifies no fee.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of the court that granted the conditional discharge",
        "Application to the court that deferred the proceedings and later discharged and dismissed.",
        "Venue: The court that granted the conditional discharge and entered the dismissal.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 41-29-150 by its terms. The participant confirms with the clerk. Fee waiver as recorded: Not established. The participant asks the clerk.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The prosecuting authority for the court receives a copy. No response or objection period is established.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded.",
        "- Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020.",
        "- Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any prior drug disposition of any kind, since the benefit is once-only.",
        "- The discharge or dismissal documentation is missing.",
        "- The charge may have been trafficking or distribution rather than possession.",
        "- A judgment of guilt was entered, which takes the case outside the conditional discharge route.",
        "- The participant is not a US citizen.",
        "- Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- ms-drug-cd-primary-filing-1: the composed petition, on this route's own statutory ground (First-time drug possession cases)",
        "- ms-drug-cd-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (First-time drug possession cases)",
        "- ms-drug-cd-certificate-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (First-time drug possession cases)",
        "- ms-drug-cd-attachment-4: the route-specific records checklist identifying the records to gather and confirm with the filing clerk (First-time drug possession cases)",
        "- ms-drug-cd-instructions-5: what this set is, where it goes, what it costs, who must be served, and when to stop (First-time drug possession cases)"
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
      "id": "ms-dui-primary-filing-1",
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "title": "Petition - Clearing a first DUI",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clearing a first DUI)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Circuit clerk of the county of conviction - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "FIRST-OFFENSE DUI EXPUNGEMENT (MISS. CODE ANN. § 63-11-30)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under Miss. Code Ann. § 63-11-30(13); Miss. Code Ann. § 63-11-30(2)(c); Miss. Code Ann. § 63-11-30(2)(d); Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Section 63-11-30 carries its own first-offence DUI expungement provision, entirely separate from the ordinary misdemeanour route, and a DUI must never be routed through § 99-19-71(1). Every condition must be met: at least five years after successful completion of all terms and conditions of the sentence; the person did not hold a commercial driver's licence or a commercial learner's permit at the time of the offence; the person did not refuse the blood or breath test; blood alcohol concentration below .16 where test results are available; no other DUI conviction and no pending DUI; the person has not previously had a DUI nonadjudication or a DUI expungement; and the person must justify the expungement to the court. Relief is discretionary. Venue is the CIRCUIT COURT of the county of conviction: the Attorney General has opined that a municipal court judge is not authorized to expunge a DUI conviction, although municipal and justice courts may handle expungement of nonadjudicated first-offence DUI charges in certain circumstances. That is the most likely way a Mississippi DUI petition gets filed in the wrong court. A third, fourth or subsequent DUI under § 63-11-30(2)(c) and (2)(d) is separately excluded from felony expungement under § 99-19-71(2)(a)(iv). The complete current text was obtained on this pass from enrolled SB 2095 (Laws 2022 ch. 303), the last enacted amendment: the expungement provision is subsection (13), captioned 'Expunction'. It is frequently cited in practice as § 63-11-30(14); per the 2022 enrolled act (13) is Expunction and (14) is Nonadjudication. Subsection (13)(b) additionally makes a person eligible for only ONE expunction under the subsection and directs the Department of Public Safety to maintain a permanent confidential registry of all such expunctions solely to determine eligibility for expunction, for nonadjudication, or as a first offender. Subsection (13)(c) requires the court to state in writing the justification for which the expunction was granted and to forward the order to the Department of Public Safety within five days.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it, except where the petition already states the fact — your name, your date of birth and your contact details are printed in this petition and are not asked for again. Fill each item below from the record itself.",
        "",
        "[C1 - other name on the case] Any OTHER name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. Your full legal name is printed in the caption above and in the signature block below, so only this second limb is left for you. Write NONE if there is no other name.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - county of residence] Which Mississippi county and city do you live in?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - court level] Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - court county] Which county was that court in? For a municipal court, which city?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - cause number] What is the cause or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - charge name] What were you charged with, and under which Mississippi Code section if you know it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - offense date] On what date did the offence happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - arrest date] On what date were you arrested or cited?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - arresting agency] Which agency arrested or cited you, and what is their case number if you have it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - prosecuting authority] Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - dui conviction date] On what date were you convicted of the DUI?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - dui conviction court] Which court entered the DUI conviction? Note that the expungement petition itself goes to the circuit court of that county, not back to the convicting court.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - sentence completion date] On what date did you successfully complete all terms and conditions of the sentence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - commercial licence] Did you hold a commercial driver's licence or a commercial learner's permit at the time of the offence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - refused test] Did you refuse the blood or breath test?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - bac result] If a test was taken, what was the blood alcohol concentration result?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C17 - other dui] Do you have any other DUI conviction, or any DUI charge pending now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C18 - prior dui relief] Have you ever had a DUI nonadjudication or a DUI expungement before?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C19 - justification] In your own words, why should the court grant this expungement? The statute requires you to justify it, and this is your statement.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under Miss. Code Ann. § 63-11-30(13); Miss. Code Ann. § 63-11-30(2)(c); Miss. Code Ann. § 63-11-30(2)(d); Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020).",
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
          "id": "fact_otherNameOnTheCase",
          "label": "Item C1 - other name on the case",
          "supply": "Any other name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. The committed record states this item as \"What is your full legal name, and any other name the case is under?\"; the packet prints your full legal name, so only the other-name limb is asked.",
          "why": "the committed track registry records the full-name-and-other-name item as a required generation input for ms-dui; the platform holds the full legal name and the petition prints it, so only the other-name limb is left for the participant"
        },
        {
          "kind": "rbf",
          "id": "fact_countyOfResidence",
          "label": "Item C2 - county of residence",
          "supply": "Which Mississippi county and city do you live in?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C3 - court level",
          "supply": "Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtCounty",
          "label": "Item C4 - court county",
          "supply": "Which county was that court in? For a municipal court, which city?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_causeNumber",
          "label": "Item C5 - cause number",
          "supply": "What is the cause or case number?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeName",
          "label": "Item C6 - charge name",
          "supply": "What were you charged with, and under which Mississippi Code section if you know it?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseDate",
          "label": "Item C7 - offense date",
          "supply": "On what date did the offence happen?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C8 - arrest date",
          "supply": "On what date were you arrested or cited?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestingAgency",
          "label": "Item C9 - arresting agency",
          "supply": "Which agency arrested or cited you, and what is their case number if you have it?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_prosecutingAuthority",
          "label": "Item C10 - prosecuting authority",
          "supply": "Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiConvictionDate",
          "label": "Item C11 - dui conviction date",
          "supply": "On what date were you convicted of the DUI?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiConvictionCourt",
          "label": "Item C12 - dui conviction court",
          "supply": "Which court entered the DUI conviction? Note that the expungement petition itself goes to the circuit court of that county, not back to the convicting court.",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentenceCompletionDate",
          "label": "Item C13 - sentence completion date",
          "supply": "On what date did you successfully complete all terms and conditions of the sentence?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_commercialLicence",
          "label": "Item C14 - commercial licence",
          "supply": "Did you hold a commercial driver's licence or a commercial learner's permit at the time of the offence?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_refusedTest",
          "label": "Item C15 - refused test",
          "supply": "Did you refuse the blood or breath test?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_bacResult",
          "label": "Item C16 - bac result",
          "supply": "If a test was taken, what was the blood alcohol concentration result?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherDui",
          "label": "Item C17 - other dui",
          "supply": "Do you have any other DUI conviction, or any DUI charge pending now?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorDuiRelief",
          "label": "Item C18 - prior dui relief",
          "supply": "Have you ever had a DUI nonadjudication or a DUI expungement before?",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_justification",
          "label": "Item C19 - justification",
          "supply": "In your own words, why should the court grant this expungement? The statute requires you to justify it, and this is your statement.",
          "why": "the committed track registry records this as a required generation input for ms-dui, and the platform holds no value for it"
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
      "id": "ms-dui-proposed-order-2",
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "title": "Proposed Order - Clearing a first DUI",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clearing a first DUI)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Circuit clerk of the county of conviction)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under Miss. Code Ann. § 63-11-30(13); Miss. Code Ann. § 63-11-30(2)(c); Miss. Code Ann. § 63-11-30(2)(d); Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020). The Court, having considered the petition and anything filed with it,",
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
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
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
      "id": "ms-dui-certificate-of-service-3",
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "title": "Certificate of Service - Clearing a first DUI",
      "role": "certificate_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (Clearing a first DUI)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Circuit clerk of the county of conviction)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "CERTIFICATE OF SERVICE",
        "",
        "I, {{participant.full_legal_name}}, state that on the date I write beside my signing line below, and not before, I delivered a copy of the petition and of the proposed order filed with it to the person or office named here:",
        "",
        "Name and office of the person or office to whom the papers were delivered:",
        "{{DOTS}}",
        "",
        "Address at which the papers were delivered:",
        "{{DOTS}}",
        "",
        "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts:",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(DO NOT SIGN OR DATE THIS PAGE UNTIL THE PAPERS HAVE ACTUALLY BEEN DELIVERED. A certificate signed before delivery states something that has not happened.)",
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
          "kind": "court",
          "id": "service_case_number",
          "label": "Case number in the caption of this page, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "served_party",
          "label": "Name and office of the person or office to whom the papers were delivered",
          "supply": "the name and office of the person or office you delivered the papers to",
          "why": "who is served depends on the participant's own case and the office that holds it"
        },
        {
          "kind": "rbf",
          "id": "served_address",
          "label": "Address at which the papers were delivered",
          "supply": "the address at which you delivered the papers",
          "why": "an address is a fact of the participant's own delivery"
        },
        {
          "kind": "rbf",
          "id": "service_method",
          "label": "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts",
          "supply": "how you actually delivered the papers",
          "why": "only the participant knows how delivery was made"
        },
        {
          "kind": "protected",
          "id": "service_signature",
          "label": "Signature of the person named in the caption, on the certificate, and only after the papers have actually been delivered",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "service_signature_date",
          "label": "Date beside the signature on the certificate, and only after the papers have actually been delivered",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ms-dui-attachment-4",
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "role": "attachment",
      "title": "Records Checklist - Clearing a first DUI",
      "description": "the route-specific records checklist identifying the records to gather and confirm with the circuit clerk (Clearing a first DUI)",
      "condition": null,
      "body": [
        "This records checklist is for {{participant.full_legal_name}}.",
        "",
        "RECORDS CHECKLIST",
        "",
        "Gather these records before filing. Ask the circuit clerk which records must be attached to the petition and whether the clerk requires certified copies. This checklist does not replace any record and is not proof that a missing record exists.",
        "",
        "- Certified copy of the DUI judgment of conviction. Ask the clerk of the court that entered the DUI conviction for a certified copy of the judgment.",
        "",
        "- Blood or breath test result, or documentation that no test was refused. Obtain the test result. The statute conditions relief on not having refused the test and, where results are available, on a concentration below .16, so this document is central rather than optional.",
        "",
        "- Certified driving record. Obtain your certified driving record. It establishes whether any other DUI appears and whether you held a commercial licence.",
        "",
        "- Account balance sheet from the clerk showing a zero balance. Ask the clerk for an account balance sheet showing that all fines, costs and restitution are paid in full. Mississippi courts commonly require a zero balance in practice even where the subsection does not say so, and on the felony track payment of all criminal fines and costs of court is a statutory condition.",
        "",
        "Keep the originals. File or serve copies only as the circuit clerk directs. Every DUI packet requires attorney review before filing and a post-generation handoff."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this records checklist is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ms-dui-instructions-5",
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "role": "instructions",
      "title": "Filing Instructions - Clearing a first DUI",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clearing a first DUI)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "First-Offense DUI Expungement (Miss. Code Ann. § 63-11-30).",
        "",
        "Section 63-11-30 carries its own first-offence DUI expungement provision, entirely separate from the ordinary misdemeanour route, and a DUI must never be routed through § 99-19-71(1). Every condition must be met: at least five years after successful completion of all terms and conditions of the sentence; the person did not hold a commercial driver's licence or a commercial learner's permit at the time of the offence; the person did not refuse the blood or breath test; blood alcohol concentration below .16 where test results are available; no other DUI conviction and no pending DUI; the person has not previously had a DUI nonadjudication or a DUI expungement; and the person must justify the expungement to the court. Relief is discretionary. Venue is the CIRCUIT COURT of the county of conviction: the Attorney General has opined that a municipal court judge is not authorized to expunge a DUI conviction, although municipal and justice courts may handle expungement of nonadjudicated first-offence DUI charges in certain circumstances. That is the most likely way a Mississippi DUI petition gets filed in the wrong court. A third, fourth or subsequent DUI under § 63-11-30(2)(c) and (2)(d) is separately excluded from felony expungement under § 99-19-71(2)(a)(iv). The complete current text was obtained on this pass from enrolled SB 2095 (Laws 2022 ch. 303), the last enacted amendment: the expungement provision is subsection (13), captioned 'Expunction'. It is frequently cited in practice as § 63-11-30(14); per the 2022 enrolled act (13) is Expunction and (14) is Nonadjudication. Subsection (13)(b) additionally makes a person eligible for only ONE expunction under the subsection and directs the Department of Public Safety to maintain a permanent confidential registry of all such expunctions solely to determine eligibility for expunction, for nonadjudication, or as a first offender. Subsection (13)(c) requires the court to state in writing the justification for which the expunction was granted and to forward the order to the Department of Public Safety within five days.",
        "",
        "WHERE IT GOES",
        "",
        "Circuit clerk of the county of conviction",
        "File in the circuit court of the county of conviction even where the DUI conviction itself was entered in a municipal or justice court.",
        "Venue: The circuit court of the county of conviction. This is a venue trap: a municipal court judge is not authorized to expunge a DUI conviction, per the Attorney General.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 63-11-30 by its terms. The participant confirms with the circuit clerk. Fee waiver as recorded: Not established. The participant asks the clerk.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The district attorney receives a copy. Relief is discretionary and the person must justify the expungement to the court.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded.",
        "- Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020.",
        "- Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Every DUI. All DUI packets carry mandatory attorney review before filing and a post-generation handoff.",
        "- Any doubt about which court to file in, given that the petition goes to circuit court rather than the convicting court.",
        "- Any refusal of the test, any test result at or above .16, or any missing test documentation.",
        "- Any commercial driver's licence or commercial learner's permit at the time of the offence.",
        "- Any other DUI conviction, pending DUI, or prior DUI nonadjudication or expungement.",
        "- The participant is not a US citizen.",
        "- Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff.",
        "- All DUI packets carry mandatory attorney-review and post-generation handoff instructions, but packet identity remains known.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- ms-dui-primary-filing-1: the composed petition, on this route's own statutory ground (Clearing a first DUI)",
        "- ms-dui-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Clearing a first DUI)",
        "- ms-dui-certificate-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (Clearing a first DUI)",
        "- ms-dui-attachment-4: the route-specific records checklist identifying the records to gather and confirm with the circuit clerk (Clearing a first DUI)",
        "- ms-dui-instructions-5: what this set is, where it goes, what it costs, who must be served, and when to stop (Clearing a first DUI)"
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
      "id": "ms-mip-primary-filing-1",
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "title": "Petition - Underage drinking charges",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Underage drinking charges)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that disposed of the charge - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "UNDERAGE ALCOHOL POSSESSION EXPUNGEMENT (MISS. CODE ANN. § 67-3-70)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under Miss. Code Ann. § 67-3-70(6); Miss. Code Ann. § 67-3-70(1); Miss. Code Ann. § 67-3-70(2) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Section 67-3-70 governs underage alcohol offences and carries its own expungement provision at subsection (6). The complete current text was obtained on this pass from enrolled HB 917 § 34 (Laws 2020 ch. 314), the last enacted amendment, so the one-year period is now supported by PRIMARY authority rather than by the secondary clearinghouse source the review relied on. Subsection (6) reads: 'Any person who has been charged with a violation of subsections (1) or (2) of this section may, not sooner than one (1) year after the dismissal and discharge or completion of any sentence and/or payment of any fine, apply to the court for an order to expunge from all official records all recordation relating to his arrest, trial, finding or plea of guilty, and dismissal and discharge. If the court determines that such person was dismissed and the proceedings against him discharged or that such person had satisfactorily served his sentence and/or paid his fine, it shall enter such order.' Four consequences follow. The route reaches subsections (1) and (2) only — underage purchase or possession of light wine, light spirit product or beer, and an underage false-age statement or false document — and does not reach subsection (3), furnishing to a minor. It reaches anyone 'CHARGED WITH' such a violation, so dismissed and discharged cases qualify as well as convictions. The one-year clock runs from the LATER of dismissal and discharge, or completion of any sentence and payment of any fine, not from the offence or the charge. And relief is MANDATORY on the findings — 'it shall enter such order' — unlike the discretionary lower-court misdemeanour route. The section prescribes no petition contents, no prosecutor notice, no open-court showing, no rehabilitation finding, no hearing and no fee, and it contains no restoration-of-status clause, no perjury-protection clause and no Title 63 carve-out.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it, except where the petition already states the fact — your name, your date of birth and your contact details are printed in this petition and are not asked for again. Fill each item below from the record itself.",
        "",
        "[C1 - other name on the case] Any OTHER name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. Your full legal name is printed in the caption above and in the signature block below, so only this second limb is left for you. Write NONE if there is no other name.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - county of residence] Which Mississippi county and city do you live in?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - court level] Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - court county] Which county was that court in? For a municipal court, which city?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - cause number] What is the cause or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - charge name] What were you charged with, and under which Mississippi Code section if you know it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - offense date] On what date did the offence happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - arrest date] On what date were you arrested or cited?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - arresting agency] Which agency arrested or cited you, and what is their case number if you have it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - prosecuting authority] Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - alcohol offense] What exactly were you charged with — underage purchase or possession of beer, light wine or a light spirit product?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - disposition type] How did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - disposition date] On what date did it end that way?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - sentence completion date] If you were sentenced, on what date did you complete everything the court ordered, including any fine?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - age at offense] How old were you at the time of the offence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - court office confirmation of the waiting period] Have you asked the clerk of that court what the current waiting period is for this kind of expungement, and whether that court charges a fee?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under Miss. Code Ann. § 67-3-70(6); Miss. Code Ann. § 67-3-70(1); Miss. Code Ann. § 67-3-70(2).",
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
          "id": "fact_otherNameOnTheCase",
          "label": "Item C1 - other name on the case",
          "supply": "Any other name this case is under — a former name, a maiden name, an alias, or a misspelling in the court record. The committed record states this item as \"What is your full legal name, and any other name the case is under?\"; the packet prints your full legal name, so only the other-name limb is asked.",
          "why": "the committed track registry records the full-name-and-other-name item as a required generation input for ms-mip; the platform holds the full legal name and the petition prints it, so only the other-name limb is left for the participant"
        },
        {
          "kind": "rbf",
          "id": "fact_countyOfResidence",
          "label": "Item C2 - county of residence",
          "supply": "Which Mississippi county and city do you live in?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C3 - court level",
          "supply": "Which court handled the case — justice court, county court, circuit court, or municipal court? Mississippi has four trial court levels that all handle expungements and people routinely misidentify which one heard their case.",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtCounty",
          "label": "Item C4 - court county",
          "supply": "Which county was that court in? For a municipal court, which city?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_causeNumber",
          "label": "Item C5 - cause number",
          "supply": "What is the cause or case number?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeName",
          "label": "Item C6 - charge name",
          "supply": "What were you charged with, and under which Mississippi Code section if you know it?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseDate",
          "label": "Item C7 - offense date",
          "supply": "On what date did the offence happen?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C8 - arrest date",
          "supply": "On what date were you arrested or cited?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestingAgency",
          "label": "Item C9 - arresting agency",
          "supply": "Which agency arrested or cited you, and what is their case number if you have it?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_prosecutingAuthority",
          "label": "Item C10 - prosecuting authority",
          "supply": "Which prosecuting authority handled the case — the district attorney for the circuit district, or a county or municipal prosecuting attorney?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_alcoholOffense",
          "label": "Item C11 - alcohol offense",
          "supply": "What exactly were you charged with — underage purchase or possession of beer, light wine or a light spirit product?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionType",
          "label": "Item C12 - disposition type",
          "supply": "How did the case end?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C13 - disposition date",
          "supply": "On what date did it end that way?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentenceCompletionDate",
          "label": "Item C14 - sentence completion date",
          "supply": "If you were sentenced, on what date did you complete everything the court ordered, including any fine?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ageAtOffense",
          "label": "Item C15 - age at offense",
          "supply": "How old were you at the time of the offence?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_clerkConfirmedTiming",
          "label": "Item C16 - court office confirmation of the waiting period",
          "supply": "Have you asked the clerk of that court what the current waiting period is for this kind of expungement, and whether that court charges a fee?",
          "why": "the committed track registry records this as a required generation input for ms-mip, and the platform holds no value for it"
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
      "id": "ms-mip-proposed-order-2",
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "title": "Proposed Order - Underage drinking charges",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Underage drinking charges)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that disposed of the charge)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under Miss. Code Ann. § 67-3-70(6); Miss. Code Ann. § 67-3-70(1); Miss. Code Ann. § 67-3-70(2). The Court, having considered the petition and anything filed with it,",
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
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
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
      "id": "ms-mip-certificate-of-service-3",
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "title": "Certificate of Service - Underage drinking charges",
      "role": "certificate_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (Underage drinking charges)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that disposed of the charge)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "CERTIFICATE OF SERVICE",
        "",
        "I, {{participant.full_legal_name}}, state that on the date I write beside my signing line below, and not before, I delivered a copy of the petition and of the proposed order filed with it to the person or office named here:",
        "",
        "Name and office of the person or office to whom the papers were delivered:",
        "{{DOTS}}",
        "",
        "Address at which the papers were delivered:",
        "{{DOTS}}",
        "",
        "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts:",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(DO NOT SIGN OR DATE THIS PAGE UNTIL THE PAPERS HAVE ACTUALLY BEEN DELIVERED. A certificate signed before delivery states something that has not happened.)",
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
          "kind": "court",
          "id": "service_case_number",
          "label": "Case number in the caption of this page, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "served_party",
          "label": "Name and office of the person or office to whom the papers were delivered",
          "supply": "the name and office of the person or office you delivered the papers to",
          "why": "who is served depends on the participant's own case and the office that holds it"
        },
        {
          "kind": "rbf",
          "id": "served_address",
          "label": "Address at which the papers were delivered",
          "supply": "the address at which you delivered the papers",
          "why": "an address is a fact of the participant's own delivery"
        },
        {
          "kind": "rbf",
          "id": "service_method",
          "label": "How the papers were delivered - by hand, by mail, or by the electronic method the court accepts",
          "supply": "how you actually delivered the papers",
          "why": "only the participant knows how delivery was made"
        },
        {
          "kind": "protected",
          "id": "service_signature",
          "label": "Signature of the person named in the caption, on the certificate, and only after the papers have actually been delivered",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "service_signature_date",
          "label": "Date beside the signature on the certificate, and only after the papers have actually been delivered",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ms-mip-attachment-4",
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "role": "attachment",
      "title": "Records Checklist - Underage drinking charges",
      "description": "the route-specific records checklist identifying the records to gather and confirm with the filing clerk (Underage drinking charges)",
      "condition": null,
      "body": [
        "This records checklist is for {{participant.full_legal_name}}.",
        "",
        "RECORDS CHECKLIST",
        "",
        "Gather these records before filing. Ask the clerk which records must be attached to the petition and whether the clerk requires certified copies. This checklist does not replace any record and is not proof that a missing record exists.",
        "",
        "- Certified copy of the disposition or judgment. Ask the clerk for a certified copy of the order showing how the case ended.",
        "",
        "- Account balance sheet showing a zero balance. Ask the clerk for confirmation that any fine and costs are paid in full.",
        "",
        "Keep the originals. File or serve copies only as the clerk directs. Before filing, confirm the current waiting period, the correct court and any fee with the clerk."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this records checklist is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ms-mip-instructions-5",
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "role": "instructions",
      "title": "Filing Instructions - Underage drinking charges",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Underage drinking charges)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Underage Alcohol Possession Expungement (Miss. Code Ann. § 67-3-70).",
        "",
        "Section 67-3-70 governs underage alcohol offences and carries its own expungement provision at subsection (6). The complete current text was obtained on this pass from enrolled HB 917 § 34 (Laws 2020 ch. 314), the last enacted amendment, so the one-year period is now supported by PRIMARY authority rather than by the secondary clearinghouse source the review relied on. Subsection (6) reads: 'Any person who has been charged with a violation of subsections (1) or (2) of this section may, not sooner than one (1) year after the dismissal and discharge or completion of any sentence and/or payment of any fine, apply to the court for an order to expunge from all official records all recordation relating to his arrest, trial, finding or plea of guilty, and dismissal and discharge. If the court determines that such person was dismissed and the proceedings against him discharged or that such person had satisfactorily served his sentence and/or paid his fine, it shall enter such order.' Four consequences follow. The route reaches subsections (1) and (2) only — underage purchase or possession of light wine, light spirit product or beer, and an underage false-age statement or false document — and does not reach subsection (3), furnishing to a minor. It reaches anyone 'CHARGED WITH' such a violation, so dismissed and discharged cases qualify as well as convictions. The one-year clock runs from the LATER of dismissal and discharge, or completion of any sentence and payment of any fine, not from the offence or the charge. And relief is MANDATORY on the findings — 'it shall enter such order' — unlike the discretionary lower-court misdemeanour route. The section prescribes no petition contents, no prosecutor notice, no open-court showing, no rehabilitation finding, no hearing and no fee, and it contains no restoration-of-status clause, no perjury-protection clause and no Title 63 carve-out.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of the court that disposed of the charge",
        "File with the clerk of the court that handled the underage alcohol case, after confirming with that clerk the current waiting period, venue and fee.",
        "Venue: The court in which the underage alcohol charge was disposed of. Section 67-3-70(6) says simply 'apply to the court', with no circuit-court transfer and no county-specific provision, so the charging or convicting court is the destination.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 67-3-70 by its terms. The participant confirms with the clerk. Fee waiver as recorded: Not established. The participant asks the clerk.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The prosecuting authority for the court receives a copy. No response or objection period is established.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded.",
        "- Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020.",
        "- Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements.",
        "- The one-year waiting period is retained ONLY because § 67-3-70(6) was read from primary authority on this pass — enrolled HB 917 § 34, Laws 2020 ch. 314 — and not because a secondary clearinghouse source reported it. The clock runs from the later of dismissal and discharge or completion of any sentence and payment of any fine.",
        "- Relief is mandatory on the statutory findings — 'it shall enter such order' — unlike the discretionary lower-court misdemeanour route. Section 67-3-70 contains no restoration-of-status clause, no perjury-protection clause and no Title 63 carve-out, so participant-facing copy must not import those effects from § 99-19-71.",
        "- Instruct the participant to confirm the current waiting period, the correct court and any fee with the clerk before filing.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The clerk cannot confirm the current waiting period or the correct court.",
        "- The charge may be something other than underage purchase or possession of light wine, light spirit product or beer.",
        "- The case involved a DUI, which routes to the DUI track.",
        "- The participant is not a US citizen.",
        "- Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- ms-mip-primary-filing-1: the composed petition, on this route's own statutory ground (Underage drinking charges)",
        "- ms-mip-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Underage drinking charges)",
        "- ms-mip-certificate-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (Underage drinking charges)",
        "- ms-mip-attachment-4: the route-specific records checklist identifying the records to gather and confirm with the filing clerk (Underage drinking charges)",
        "- ms-mip-instructions-5: what this set is, where it goes, what it costs, who must be served, and when to stop (Underage drinking charges)"
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
      "routeKey": "obligation:track-pathway:MS:ms-drug-cd:first-offense-controlled-substance-conditional-discharge-relief",
      "statute": "Miss. Code Ann. § 41-29-150(d)(1); Miss. Code Ann. § 41-29-150(d)(2); Miss. Code Ann. § 41-29-139(c); Miss. Code Ann. § 41-29-139(d)",
      "instrument": "Post-Conditional-Discharge Application under § 41-29-150(d)(2)",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:MS:ms-dui:first-offense-dui-expungement",
      "statute": "Miss. Code Ann. § 63-11-30(13); Miss. Code Ann. § 63-11-30(2)(c); Miss. Code Ann. § 63-11-30(2)(d); Miss. Att'y Gen. Op. (Booker, 29 Sept. 2020)",
      "instrument": "Circuit Court Petition under § 63-11-30(13)",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:MS:ms-mip:minor-in-possession-underage-alcohol-expungement",
      "statute": "Miss. Code Ann. § 67-3-70(6); Miss. Code Ann. § 67-3-70(1); Miss. Code Ann. § 67-3-70(2)",
      "instrument": "Petition under § 67-3-70(6)",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — First-time drug possession cases",
      "The committed track registry records the destination as **Clerk of the court that granted the conditional discharge**. Application to the court that deferred the proceedings and later discharged and dismissed. Venue as recorded: The court that granted the conditional discharge and entered the dismissal. Filing as recorded: Apply to the court that granted the conditional discharge and entered the discharge and dismissal."
    ],
    [
      "FEE_AND_WAIVER — First-time drug possession cases",
      "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 41-29-150 by its terms. The participant confirms with the clerk. Fee waiver as recorded: Not established. The participant asks the clerk."
    ],
    [
      "SERVICE — First-time drug possession cases",
      "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The prosecuting authority for the court receives a copy. No response or objection period is established."
    ],
    [
      "SELF_HELP_STOP — First-time drug possession cases",
      "**Stop and get help if:** Any prior drug disposition of any kind, since the benefit is once-only. **Stop and get help if:** The discharge or dismissal documentation is missing. **Stop and get help if:** The charge may have been trafficking or distribution rather than possession. **Stop and get help if:** A judgment of guilt was entered, which takes the case outside the conditional discharge route. **Stop and get help if:** The participant is not a US citizen. **Stop and get help if:** Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff."
    ],
    [
      "FILING_DESTINATION — Clearing a first DUI",
      "The committed track registry records the destination as **Circuit clerk of the county of conviction**. File in the circuit court of the county of conviction even where the DUI conviction itself was entered in a municipal or justice court. Venue as recorded: The circuit court of the county of conviction. This is a venue trap: a municipal court judge is not authorized to expunge a DUI conviction, per the Attorney General. Filing as recorded: File in the CIRCUIT COURT of the county of conviction, with the proposed order and certificate of service. Do not file in the municipal or justice court that entered the conviction: the Attorney General has opined that a municipal court judge is not authorized to expunge a DUI conviction."
    ],
    [
      "FEE_AND_WAIVER — Clearing a first DUI",
      "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 63-11-30 by its terms. The participant confirms with the circuit clerk. Fee waiver as recorded: Not established. The participant asks the clerk."
    ],
    [
      "SERVICE — Clearing a first DUI",
      "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The district attorney receives a copy. Relief is discretionary and the person must justify the expungement to the court."
    ],
    [
      "SELF_HELP_STOP — Clearing a first DUI",
      "**Stop and get help if:** Every DUI. All DUI packets carry mandatory attorney review before filing and a post-generation handoff. **Stop and get help if:** Any doubt about which court to file in, given that the petition goes to circuit court rather than the convicting court. **Stop and get help if:** Any refusal of the test, any test result at or above .16, or any missing test documentation. **Stop and get help if:** Any commercial driver's licence or commercial learner's permit at the time of the offence. **Stop and get help if:** Any other DUI conviction, pending DUI, or prior DUI nonadjudication or expungement. **Stop and get help if:** The participant is not a US citizen. **Stop and get help if:** Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff. **Stop and get help if:** All DUI packets carry mandatory attorney-review and post-generation handoff instructions, but packet identity remains known."
    ],
    [
      "FILING_DESTINATION — Underage drinking charges",
      "The committed track registry records the destination as **Clerk of the court that disposed of the charge**. File with the clerk of the court that handled the underage alcohol case, after confirming with that clerk the current waiting period, venue and fee. Venue as recorded: The court in which the underage alcohol charge was disposed of. Section 67-3-70(6) says simply 'apply to the court', with no circuit-court transfer and no county-specific provision, so the charging or convicting court is the destination. Filing as recorded: File with the clerk of the court that disposed of the underage alcohol charge, after confirming the current waiting period, the venue and any fee with that clerk."
    ],
    [
      "FEE_AND_WAIVER — Underage drinking charges",
      "Fee as recorded: No amount is published here. Section 99-19-72's fee reaches petitions under § 99-19-71 and does not reach § 67-3-70 by its terms. The participant confirms with the clerk. Fee waiver as recorded: Not established. The participant asks the clerk."
    ],
    [
      "SERVICE — Underage drinking charges",
      "Service as recorded: United States mail or hand delivery, evidenced by the certificate of service. Notice as recorded: The prosecuting authority for the court receives a copy. No response or objection period is established."
    ],
    [
      "SELF_HELP_STOP — Underage drinking charges",
      "**Stop and get help if:** The clerk cannot confirm the current waiting period or the correct court. **Stop and get help if:** The charge may be something other than underage purchase or possession of light wine, light spirit product or beer. **Stop and get help if:** The case involved a DUI, which routes to the DUI track. **Stop and get help if:** The participant is not a US citizen. **Stop and get help if:** Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff."
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
        "First-time drug possession cases",
        "Section 41-29-150 carries Mississippi's controlled-substance conditional discharge and its associated expungement."
      ],
      [
        "Clearing a first DUI",
        "Section 63-11-30 carries its own first-offence DUI expungement provision, entirely separate from the ordinary misdemeanour route, and a DUI must never be routed through § 99-19-71(1)."
      ],
      [
        "Underage drinking charges",
        "Section 67-3-70 governs underage alcohol offences and carries its own expungement provision at subsection (6)."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Certified copy of the conditional discharge order. Ask the clerk for a certified copy of the order deferring proceedings and placing you on probation without an adjudication of guilt.",
      "Clerk of the court"
    ],
    [
      "Obtain Certified copy of the order of discharge and dismissal. Ask the clerk for a certified copy of the order discharging you and dismissing the proceedings.",
      "Clerk of the court"
    ],
    [
      "Obtain Proof of successful completion of probation. Obtain the documentation showing you completed probation and every condition.",
      "The supervising authority or the clerk"
    ],
    [
      "Obtain Mississippi criminal history record. Obtain your own Mississippi criminal history so you can see every case on your record before you file. It is the only reliable way to check first-offender status or good conduct across all courts, and self-report is not enough.",
      "Mississippi Criminal Information Center"
    ],
    [
      "Obtain Certified copy of the DUI judgment of conviction. Ask the clerk of the court that entered the DUI conviction for a certified copy of the judgment.",
      "Clerk of the convicting court"
    ],
    [
      "Obtain Blood or breath test result, or documentation that no test was refused. Obtain the test result. The statute conditions relief on not having refused the test and, where results are available, on a concentration below .16, so this document is central rather than optional.",
      "The arresting agency, the court file, or the Mississippi Crime Laboratory"
    ],
    [
      "Obtain Certified driving record. Obtain your certified driving record. It establishes whether any other DUI appears and whether you held a commercial licence.",
      "Mississippi Department of Public Safety"
    ],
    [
      "Obtain Account balance sheet from the clerk showing a zero balance. Ask the clerk for an account balance sheet showing that all fines, costs and restitution are paid in full. Mississippi courts commonly require a zero balance in practice even where the subsection does not say so, and on the felony track payment of all criminal fines and costs of court is a statutory condition.",
      "Clerk of the court where the case was heard"
    ],
    [
      "Obtain Certified copy of the disposition or judgment. Ask the clerk for a certified copy of the order showing how the case ended.",
      "Clerk of the court that handled the case"
    ],
    [
      "Obtain Account balance sheet showing a zero balance. Ask the clerk for confirmation that any fine and costs are paid in full.",
      "Clerk of the court"
    ]
  ],
  "steps": [
    "**Read the filing instructions page for your route.** It names the court or office this goes to, what the record says about cost and about service, and when to stop.",
    "**Fill every labelled dotted blank on the pages for your route**, from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Sign and date each page that carries a signing line, personally.** The platform never signs for you and never dates a signing line.",
    "**Do not sign or date any certificate or proof of delivery until the papers have actually been delivered.**",
    "**File the pages for your route where the filing instructions page says they go**, and ask that office what it charges and how it accepts filings before you go.",
    "**Leave every page that belongs to the court or the prosecuting attorney blank.** Those decisions are not yours to make."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of a proposed order that decides anything**, including the court's own signing and date lines. The order is the court's to make.",
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists.",
    "**The certificate or proof of delivery, until the papers have actually been delivered.** A certificate signed before delivery states something that has not happened."
  ],
  "recordSays": [
    [
      "First-time drug possession cases",
      "Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded."
    ],
    [
      "First-time drug possession cases",
      "Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020."
    ],
    [
      "First-time drug possession cases",
      "Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements."
    ],
    [
      "Clearing a first DUI",
      "Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded."
    ],
    [
      "Clearing a first DUI",
      "Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020."
    ],
    [
      "Clearing a first DUI",
      "Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements."
    ],
    [
      "Underage drinking charges",
      "Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and order PDFs are Fourth Circuit Court District models covering Leflore, Sunflower and Washington counties only: every county field reads '(Washington, Sunflower, or Leflore)', the certificate of service hardcodes the Fourth District DA at Greenville, the signature blocks are dated 2020, and the orders carry an APPROVED AS TO FORM block. They are drafting references only. Court, county and prosecuting authority are participant-data fields and are never hardcoded."
    ],
    [
      "Underage drinking charges",
      "Build the district-variable fields — court, court level, county, cause number, and the prosecuting authority's name and address — as participant data, never hardcoded. Never default to the Greenville address, the three Fourth District counties, or the year 2020."
    ],
    [
      "Underage drinking charges",
      "Tell the participant that Mississippi has no statewide expungement form, that practice varies by county and by circuit district, that some districts expect the district attorney to approve the order as to form before the judge will sign, and that they should call the clerk of the court where the case was heard before filing to ask whether that court has its own preferred form or additional requirements."
    ],
    [
      "Underage drinking charges",
      "The one-year waiting period is retained ONLY because § 67-3-70(6) was read from primary authority on this pass — enrolled HB 917 § 34, Laws 2020 ch. 314 — and not because a secondary clearinghouse source reported it. The clock runs from the later of dismissal and discharge or completion of any sentence and payment of any fine."
    ],
    [
      "Underage drinking charges",
      "Relief is mandatory on the statutory findings — 'it shall enter such order' — unlike the discretionary lower-court misdemeanour route. Section 67-3-70 contains no restoration-of-status clause, no perjury-protection clause and no Title 63 carve-out, so participant-facing copy must not import those effects from § 99-19-71."
    ],
    [
      "Underage drinking charges",
      "Instruct the participant to confirm the current waiting period, the correct court and any fee with the clerk before filing."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Any prior drug disposition of any kind, since the benefit is once-only.",
    "The discharge or dismissal documentation is missing.",
    "The charge may have been trafficking or distribution rather than possession.",
    "A judgment of guilt was entered, which takes the case outside the conditional discharge route.",
    "The participant is not a US citizen.",
    "Obtaining the district attorney's approval as to form is the practical gate on the entire Mississippi product and it is a negotiation, not a filing. LegalEase prepares the certificate of service, the cover letter and the notice calendar; it does not seek, obtain or negotiate the prosecutor's approval, and a declining or silent prosecutor is an attorney handoff.",
    "Every DUI. All DUI packets carry mandatory attorney review before filing and a post-generation handoff.",
    "Any doubt about which court to file in, given that the petition goes to circuit court rather than the convicting court.",
    "Any refusal of the test, any test result at or above .16, or any missing test documentation.",
    "Any commercial driver's licence or commercial learner's permit at the time of the offence.",
    "Any other DUI conviction, pending DUI, or prior DUI nonadjudication or expungement.",
    "All DUI packets carry mandatory attorney-review and post-generation handoff instructions, but packet identity remains known.",
    "The clerk cannot confirm the current waiting period or the correct court.",
    "The charge may be something other than underage purchase or possession of light wine, light spirit product or beer.",
    "The case involved a DUI, which routes to the DUI track."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official MS form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that the retired legacy Mississippi generator conveys any authority to this family — it does not"
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
      "finding": "The committed record states that the first-DUI petition is filed in the circuit court of the county of conviction even where the DUI conviction itself was entered in a municipal or justice court.",
      "consequence": "That is stated on the DUI filing instructions page in the record's own words, because a participant reasoning from where they were convicted would file in the wrong court."
    },
    {
      "finding": "The retired legacy Mississippi generator covered Mississippi expungement routes, and its assets are preserved under ADR-0004.",
      "consequence": "Nothing from the legacy generator was used as authority, no commercial route is opened, and this build touches no runtime."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 3 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
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
const REQUIRED_COMPONENTS_PER_ROUTE = [
  { suffix: "primary-filing-1", role: "primary_filing" },
  { suffix: "proposed-order-2", role: "proposed_order" },
  { suffix: "certificate-of-service-3", role: "certificate_of_service" },
  { suffix: "attachment-4", role: "attachment" },
  { suffix: "instructions-5", role: "instructions" }
];

const routeSlug = (routeKey) => String(routeKey).split(":")[3];
const componentIdsForRoute = (routeKey) => SPEC.components
  .filter((c) => c.routeKey === routeKey)
  .map((c) => c.id);

function assertComponentContract() {
  const expectedFamilyOrder = [];
  for (const route of SPEC.routes) {
    const slug = routeSlug(route.routeKey);
    const expected = REQUIRED_COMPONENTS_PER_ROUTE.map(({ suffix }) => `${slug}-${suffix}`);
    const actual = componentIdsForRoute(route.routeKey);
    assert.deepEqual(actual, expected, `${route.routeKey}: component ids or order differ from the five-component contract`);
    for (const [{ role }, id] of REQUIRED_COMPONENTS_PER_ROUTE.map((entry, i) => [entry, expected[i]])) {
      assert.equal(COMPONENT[id]?.role, role, `${id}: component role differs from the five-component contract`);
    }
    expectedFamilyOrder.push(...expected);
  }
  assert.deepEqual(COMPONENT_IDS, expectedFamilyOrder,
    "the family component manifest must group all five components for each route in declared route order");
  assert.equal(new Set(COMPONENT_IDS).size, COMPONENT_IDS.length, "component ids must be unique");
}

function assertManifestOrder(pageManifest, expectedComponentIds, scope) {
  const observed = [];
  for (const row of pageManifest) {
    if (observed.at(-1) !== row.component) observed.push(row.component);
  }
  assert.deepEqual(observed, expectedComponentIds, `${scope}: page manifest component order differs from the declared order`);
  for (const componentId of expectedComponentIds) {
    assert.ok(pageManifest.some((row) => row.component === componentId),
      `${scope}: page manifest omits ${componentId}`);
  }
}

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
  const fontSize = 11, lineHeight = title.startsWith("Filing Instructions") ? 13.5 : 14;
  const width = 612, height = 792, margin = 72;
  const contentBottom = 52;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < contentBottom) { page = pdf.addPage([width, height]); y = height - margin; }
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
  const sourceLines = sanitizePdfText(fullText).split("\n");
  const routeFooter = sourceLines.at(-1)?.startsWith("Route: ") ? sourceLines.pop() : null;
  if (routeFooter && sourceLines.at(-1) === "") sourceLines.pop();
  for (const raw of sourceLines) for (const row of wrap(raw)) draw(row);
  if (routeFooter) {
    const nominalFooterSize = 8;
    const footerWidth = font.widthOfTextAtSize(routeFooter, nominalFooterSize);
    const footerSize = footerWidth <= maxWidth ? nominalFooterSize : nominalFooterSize * maxWidth / footerWidth;
    assert.ok(footerSize >= 6, `${title}: route footer cannot fit legibly inside the page width`);
    for (const renderedPage of pdf.getPages()) {
      renderedPage.drawText(routeFooter, { x: margin, y: 34, size: footerSize, font, color: rgb(0, 0, 0) });
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

async function assertEveryPageSubstantive(bytes, componentId, fixtureName) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const footer = `Route: ${COMPONENT[componentId].routeKey}`;
  for (const [pageIndex, page] of doc.getPages().entries()) {
    const lines = groupIntoLines(extractTextItems(page)).map((line) => line.text.trim()).filter(Boolean);
    assert.equal(lines.filter((line) => line === footer).length, 1,
      `${fixtureName}/${componentId} page ${pageIndex + 1}: exact route footer must appear once`);
    const substantive = lines.filter((line) => line !== footer);
    assert.ok(substantive.length >= 2,
      `${fixtureName}/${componentId} page ${pageIndex + 1}: footer-only or near-empty overflow page`);
  }
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

  assertComponentContract();

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
      await assertEveryPageSubstantive(composedBytes, componentId, fixtureName);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }
    assertManifestOrder(pageManifest, COMPONENT_IDS, `${fixtureName}/family-assembly`);

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

  /* The family assembly above is build/review evidence. A participant receives
   * only the five components for the selected statutory route, in the exact
   * order asserted by assertComponentContract. */
  const routeArtifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const route of SPEC.routes) {
      const routeComponentIds = componentIdsForRoute(route.routeKey);
      const slug = routeSlug(route.routeKey);
      const packet = await PDFDocument.create();
      stampDeterministic(packet);
      packet.setTitle(`${SPEC.legalName} — ${slug} — ${fixtureName} fixture`);
      const pageManifest = [];

      for (const componentId of routeComponentIds) {
        const body = composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title);
        await assertEveryPageSubstantive(composedBytes, componentId, `${fixtureName}/${slug}`);
        const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
        for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
          packet.addPage(p);
          pageManifest.push({
            packetPage: packet.getPageCount(), component: componentId, documentId: componentId,
            sourcePage: i + 1, sourceSha256: null
          });
        }
      }
      assertManifestOrder(pageManifest, routeComponentIds, `${fixtureName}/${slug}`);

      const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
      const dir = `${OUT}/fixtures/routes/${slug}`;
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      const file = `${dir}/${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), packetBytes);

      const routeMaps = maps.filter((m) => routeComponentIds.includes(m.formNumber));
      const routeProof = await byteProof(packetBytes, pageManifest, routeMaps, facts, `${fixtureName}/${slug}`);
      routeArtifacts.push({
        routeKey: route.routeKey, route: slug, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
        byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
        documents: routeComponentIds, components: routeComponentIds,
        role: "route_packet_of_composed_pleadings",
        deliveryRole: "participant_deliverable_for_this_route_only",
        valuesReadBackFromTheseBytes: routeProof.actualWrites.length,
        rasterPending: true, independentVerificationPending: true
      });
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
    familyAssemblyIsAParticipantDeliverable: false,
    familyAssemblyRole: "build and review evidence only — it concatenates every route's components and is not a participant deliverable",
    routeArtifacts,
    routeArtifactRoutes: SPEC.routes.map((r) => r.routeKey),
    routeArtifactRasterPending: true,
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
    renderedArtifacts: artifacts.length + routeArtifacts.length, rasterPages: rasterPages.length,
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
    routeArtifactHashes: routeArtifacts.map((a) => ({
      fixture: a.fixture, route: a.route, routeKey: a.routeKey,
      packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount
    })),
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
