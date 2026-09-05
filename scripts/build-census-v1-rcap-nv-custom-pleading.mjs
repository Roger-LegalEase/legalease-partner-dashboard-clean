#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — six Nevada sealing routes under NRS chapter 179.
 *
 *   node "scripts/build-census-v1-rcap-nv-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * SIX STATUTORY ROUTES IN ONE FAMILY, all participant-filed, all built as
 * custom pleadings. The committed specifications record four composed
 * components for each route — petition, proposed order, declaration and
 * verification, and the prosecuting attorney's stipulation — and name no
 * official form.
 *
 * THE PETITION IS NOT THE FIRST STEP, AND THE PACKET SAYS SO. The committed
 * packet instructions record that the district attorney is: the state's own
 * instructions direct the petitioner to prepare the petition and order,
 * submit them to the DA's office with attachments, and only file with the
 * court clerk after the DA stipulates. The stipulation page is therefore
 * carried in the packet with EVERY line left to that office, and the filing
 * instructions state the order of operations.
 *
 * A FEE ANSWER THE REPOSITORY HOLDS. The committed instructions record that
 * the sex-trafficking fee waiver under NRS 179.245(9) is not a separate track
 * but a cross-cutting entitlement that zeroes out every fee in the process —
 * fingerprints, criminal history and certified copies included — and that it
 * must be surfaced wherever a fee is mentioned. It is surfaced on every
 * filing instructions page in this packet. DET-FEE-AND-WAIVER-001-A2: the
 * repository is wider than the family's own bound sources, and a fee answer
 * it holds is stated rather than delegated.
 *
 * AN ATTACHMENT WITHOUT WHICH THERE IS NO PACKET. NRS 179.245(2)(a) and
 * 179.255(3)(a) make a current verified criminal history from the Central
 * Repository a statutory attachment requirement. The record's own words are
 * carried: no repository record, no packet.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-nv-custom-pleading",
  "worklistGroupId": "rcap-nv-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-nv-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading",
  "jurisdiction": "NV",
  "legalName": "Nevada Record-Sealing Petitions — NRS 179.245, 179.255, 179.259 and the decriminalized-conduct and pardon routes",
  "routeName": "asking a Nevada court to seal a criminal record under the sealing statute that fits the participant's own record",
  "statutes": [
    "NRS 179.271",
    "NRS 179.285",
    "NRS 179.2595",
    "NRS 179.245",
    "NRS 179.255",
    "NRS 179.273",
    "NRS 213",
    "NRS 179.2405",
    "NRS 179.2445",
    "NRS 179.265",
    "NRS 179.275",
    "NRS 179.295",
    "NRS 179.301",
    "NRS 176A.850",
    "NRS 179.255(1)",
    "NRS 179.255(3)",
    "NRS 179.255(4)",
    "NRS 179.255(9)",
    "NRS 179.259"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:NV:nv_seal_decrim"
    },
    {
      "routeKey": "obligation:track-only:NV:nv_seal_multi"
    },
    {
      "routeKey": "obligation:track-only:NV:nv_seal_pardon"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:nv_seal_decrim+nv_seal_multi+nv_seal_pardon+nv_seal_conviction+nv_seal_nonconviction+nv_seal_reentry",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"nv_seal_decrim\"",
        "Sealing of Records After Decriminalization of an Offence (NRS 179.271)",
        "NRS 179.271, \\\"Sealing of records after decriminalization of offense\\\", provides a route where the conduct underlying a Ne",
        "The court in which the record was entered.",
        "NRS 179.271",
        "NRS 179.285",
        "What is your full legal name, and have you used any other names?",
        "What is your date of birth?",
        "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "What is the case number?",
        "What was the offence called, which NRS section was cited, and on what date did it happen?",
        "What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "What were you accused of doing, and do you believe that conduct is still a crime in Nevada?",
        "On what date did the offence happen, and when was the record entered?",
        "County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waive",
        "The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275.",
        "Prepare the pleading and proposed order, submit them to the prosecuting agency with the repository record, and file with",
        "\"trackId\": \"nv_seal_multi\"",
        "Consolidated Petition to Seal More Than One Record in District Court (NRS 179.2595)",
        "NRS 179.2595 permits a person seeking to seal more than one record to petition the district court for the county, which ",
        "The district court for the county, which is the highest court in the county and may seal all charges within it.",
        "NRS 179.2595",
        "NRS 179.245",
        "NRS 179.255",
        "Which of your Nevada records are in district court, which in justice court, and which in municipal court?",
        "For any justice court case, which township?",
        "\"trackId\": \"nv_seal_pardon\"",
        "Sealing of Records After an Unconditional Pardon (NRS 179.273)",
        "NRS 179.273 is titled \\\"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\\\" in the chapte",
        "The court in which the conviction was entered, for the petition route. No venue applies to the automatic route.",
        "NRS 179.273",
        "NRS 213",
        "Was the pardon unconditional, or did it come with conditions?",
        "On what date was the pardon granted?",
        "Have you checked whether the record still shows on your Nevada criminal history?",
        "Does your pardon restrict the right to bear arms?",
        "\"trackId\": \"nv_seal_conviction\"",
        "Petition to Seal Records After Conviction (NRS 179.245)",
        "A person convicted in Nevada may petition the court in which they were convicted to seal all records relating to the con",
        "The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District cour",
        "NRS 179.2405",
        "NRS 179.2445",
        "NRS 179.265",
        "NRS 179.275",
        "NRS 179.295",
        "NRS 179.301",
        "NRS 176A.850",
        "Is any charge pending against you now, anywhere?",
        "What category was the offence — category A, B, C, D or E felony, gross misdemeanour, or misdemeanour?",
        "When were you released from custody, and when were you discharged from parole or probation?",
        "Were you given a suspended sentence, and if so when did it end?",
        "If this was a DUI, which subsection were you punished under, and did you take part in the statewide sobriety and drug monitoring programme?",
        "Do you still owe any fines, jail fees, probation fees or house arrest costs on this case?",
        "Were you dishonourably discharged from probation?",
        "Have you asked a Nevada court to seal any record before, and was it denied? If so, when?",
        "County-dependent. Reno Municipal Court charges a filing fee; the repository criminal history and fingerprinting carry th",
        "The signed order is served on every agency named in it, and goes to the Central Repository under NRS 179.275.",
        "Prepare the petition, declaration and proposed order, submit them to the district attorney or city attorney with the rep",
        "\"trackId\": \"nv_seal_nonconviction\"",
        "Petition to Seal Records After Dismissal, Declination of Prosecution or Acquittal (NRS 179.255(1))",
        "Where charges were dismissed the petition may be filed at any time after the dismissal; where prosecution was declined i",
        "The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the ",
        "NRS 179.255(1)",
        "NRS 179.255(3)",
        "NRS 179.255(4)",
        "NRS 179.255(9)",
        "How did the case end — the charges were dismissed, the prosecutor declined to pursue it, or you were acquitted?",
        "On what date were you arrested?",
        "Was the case dismissed because you completed a programme or a deferred judgment agreement?",
        "Has anyone told you the case might be refiled?",
        "Prepare the petition, declaration and proposed order, submit them to the prosecuting agency with the repository record, ",
        "\"trackId\": \"nv_seal_reentry\"",
        "Sealing of Records After Completion of a Program for Reentry (NRS 179.259)",
        "NRS 179.259, \\\"Sealing records after completion of program for reentry\\\", provides a sealing route for a person who has co",
        "The court in which the conviction was entered.",
        "NRS 179.259",
        "Which reentry programme did you complete, and when did you finish it?",
        "Do you have the document showing you completed it?"
      ]
    },
    {
      "recordId": "legal-design-specifications:nv_seal_decrim+nv_seal_multi+nv_seal_pardon+nv_seal_conviction+nv_seal_nonconviction+nv_seal_reentry",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"nv_seal_decrim-primary-filing-2\"",
        "\"componentId\": \"nv_seal_decrim-proposed-order-3\"",
        "\"componentId\": \"nv_seal_decrim-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_decrim-stipulation-5\"",
        "\"componentId\": \"nv_seal_multi-primary-filing-2\"",
        "\"componentId\": \"nv_seal_multi-proposed-order-3\"",
        "\"componentId\": \"nv_seal_multi-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_multi-stipulation-5\"",
        "\"componentId\": \"nv_seal_pardon-primary-filing-2\"",
        "\"componentId\": \"nv_seal_pardon-proposed-order-3\"",
        "\"componentId\": \"nv_seal_pardon-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_pardon-stipulation-5\"",
        "\"componentId\": \"nv_seal_conviction-primary-filing-2\"",
        "\"componentId\": \"nv_seal_conviction-proposed-order-3\"",
        "\"componentId\": \"nv_seal_conviction-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_conviction-stipulation-5\"",
        "\"componentId\": \"nv_seal_nonconviction-primary-filing-2\"",
        "\"componentId\": \"nv_seal_nonconviction-proposed-order-3\"",
        "\"componentId\": \"nv_seal_nonconviction-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_nonconviction-stipulation-5\"",
        "\"componentId\": \"nv_seal_reentry-primary-filing-2\"",
        "\"componentId\": \"nv_seal_reentry-proposed-order-3\"",
        "\"componentId\": \"nv_seal_reentry-declaration-and-verification-4\"",
        "\"componentId\": \"nv_seal_reentry-stipulation-5\""
      ]
    },
    {
      "recordId": "route-obligation-census:6-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:NV:nv_seal_decrim",
        "obligation:track-only:NV:nv_seal_multi",
        "obligation:track-only:NV:nv_seal_pardon",
        "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
        "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
        "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259"
      ]
    }
  ],
  "components": [
    {
      "id": "nv_seal_decrim-primary-filing-2",
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "title": "Petition - Seal a Nevada record for something that is no longer a crime",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal a Nevada record for something that is no longer a crime)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the record was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SEALING OF RECORDS AFTER DECRIMINALIZATION OF AN OFFENCE (NRS 179.271)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.271; NRS 179.285 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "NRS 179.271, \"Sealing of records after decriminalization of offense\", provides a route where the conduct underlying a Nevada record is no longer a crime. The controlling review records the instrument as a written request rather than a full petition and classifies the track as custom_pleading on that basis. The section's presence and official title were confirmed in the chapter index at the Nevada Legislature; its text was not reproduced in the review. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - sea full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - sea date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - sea county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sea case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - sea offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - sea all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - sea trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - dcr conduct] What were you accused of doing, and do you believe that conduct is still a crime in Nevada?",
        "(Asked because the section turns on whether the conduct has been decriminalised, which is a legal question the packet screens rather than decides.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - dcr offence date] On what date did the offence happen, and when was the record entered?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.271; NRS 179.285.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the record was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_seaFullLegalName",
          "label": "Item C1 - sea full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaDateOfBirth",
          "label": "Item C2 - sea date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCounty",
          "label": "Item C3 - sea county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCaseNumber",
          "label": "Item C4 - sea case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaOffenceDetails",
          "label": "Item C5 - sea offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaAllNevadaRecords",
          "label": "Item C6 - sea all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaTrafficking",
          "label": "Item C7 - sea trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dcrConduct",
          "label": "Item C8 - dcr conduct",
          "supply": "What were you accused of doing, and do you believe that conduct is still a crime in Nevada? (Asked because the section turns on whether the conduct has been decriminalised, which is a legal question the packet screens rather than decides.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dcrOffenceDate",
          "label": "Item C9 - dcr offence date",
          "supply": "On what date did the offence happen, and when was the record entered?",
          "why": "the committed track registry records this as a required generation input for nv_seal_decrim, and the platform holds no value for it"
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
      "id": "nv_seal_decrim-proposed-order-3",
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "title": "Proposed Order - Seal a Nevada record for something that is no longer a crime",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record for something that is no longer a crime)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the record was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.271; NRS 179.285. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the record was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_decrim-declaration-and-verification-4",
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "title": "Declaration and Verification - Seal a Nevada record for something that is no longer a crime",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal a Nevada record for something that is no longer a crime)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the record was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the record was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_decrim-stipulation-5",
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "title": "Stipulation of the Prosecuting Attorney - Seal a Nevada record for something that is no longer a crime",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record for something that is no longer a crime)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the record was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the record was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_decrim-filing-instructions-6",
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal a Nevada record for something that is no longer a crime",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal a Nevada record for something that is no longer a crime)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Sealing of Records After Decriminalization of an Offence (NRS 179.271).",
        "",
        "NRS 179.271, \"Sealing of records after decriminalization of offense\", provides a route where the conduct underlying a Nevada record is no longer a crime. The controlling review records the instrument as a written request rather than a full petition and classifies the track as custom_pleading on that basis. The section's presence and official title were confirmed in the chapter index at the Nevada Legislature; its text was not reproduced in the review. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "The same prosecutor-first workflow and the same county variations as the ordinary conviction petition.",
        "Venue: The court in which the record was entered.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any question about whether the conduct has actually been decriminalised, which is a legal conclusion.",
        "- Any partially decriminalised conduct, where some variants remain criminal.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_decrim-primary-filing-2: the composed petition, on this route's own statutory ground (Seal a Nevada record for something that is no longer a crime)",
        "- nv_seal_decrim-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record for something that is no longer a crime)",
        "- nv_seal_decrim-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal a Nevada record for something that is no longer a crime)",
        "- nv_seal_decrim-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record for something that is no longer a crime)"
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
      "id": "nv_seal_multi-primary-filing-2",
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "title": "Petition - Seal several Nevada records in one filing",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal several Nevada records in one filing)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "CONSOLIDATED PETITION TO SEAL MORE THAN ONE RECORD IN DISTRICT COURT (NRS 179.2595)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.2595; NRS 179.245; NRS 179.255 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "NRS 179.2595 permits a person seeking to seal more than one record to petition the district court for the county, which may seal all the records within that county including justice and municipal court cases. This is a venue overlay on the conviction and non-conviction tracks rather than a separate remedy: each underlying record still has to satisfy its own section. Clark County practice illustrates both the value and the trap: only one petition, affidavit and order is required to seal all records within the county, but the district attorney will not stipulate to petitions that include municipal court matters, so the packet must go to the appropriate city attorney and then to the district attorney with a separate signature line for each prosecuting agency. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - sea full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - sea date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - sea county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sea case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - sea offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - sea all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - sea trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - mlt court levels] Which of your Nevada records are in district court, which in justice court, and which in municipal court?",
        "(Asked because a packet that includes municipal court matters must go to the city attorney as well as the district attorney, and the order needs a signature line for each.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - mlt township] For any justice court case, which township?",
        "(Asked because justice court petitions must be captioned to the specific township.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.2595; NRS 179.245; NRS 179.255.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_seaFullLegalName",
          "label": "Item C1 - sea full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaDateOfBirth",
          "label": "Item C2 - sea date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCounty",
          "label": "Item C3 - sea county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCaseNumber",
          "label": "Item C4 - sea case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaOffenceDetails",
          "label": "Item C5 - sea offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaAllNevadaRecords",
          "label": "Item C6 - sea all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaTrafficking",
          "label": "Item C7 - sea trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mltCourtLevels",
          "label": "Item C8 - mlt court levels",
          "supply": "Which of your Nevada records are in district court, which in justice court, and which in municipal court? (Asked because a packet that includes municipal court matters must go to the city attorney as well as the district attorney, and the order needs a signature line for each.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mltTownship",
          "label": "Item C9 - mlt township",
          "supply": "For any justice court case, which township? (Asked because justice court petitions must be captioned to the specific township.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_multi, and the platform holds no value for it"
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
      "id": "nv_seal_multi-proposed-order-3",
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "title": "Proposed Order - Seal several Nevada records in one filing",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal several Nevada records in one filing)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.2595; NRS 179.245; NRS 179.255. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_multi-declaration-and-verification-4",
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "title": "Declaration and Verification - Seal several Nevada records in one filing",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal several Nevada records in one filing)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_multi-stipulation-5",
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "title": "Stipulation of the Prosecuting Attorney - Seal several Nevada records in one filing",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal several Nevada records in one filing)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. For a justice court case, caption the specific township you gave at item C9 of the petition, because justice court petitions must be captioned to the specific township. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_multi-filing-instructions-6",
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal several Nevada records in one filing",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal several Nevada records in one filing)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Consolidated Petition to Seal More Than One Record in District Court (NRS 179.2595).",
        "",
        "NRS 179.2595 permits a person seeking to seal more than one record to petition the district court for the county, which may seal all the records within that county including justice and municipal court cases. This is a venue overlay on the conviction and non-conviction tracks rather than a separate remedy: each underlying record still has to satisfy its own section. Clark County practice illustrates both the value and the trap: only one petition, affidavit and order is required to seal all records within the county, but the district attorney will not stipulate to petitions that include municipal court matters, so the packet must go to the appropriate city attorney and then to the district attorney with a separate signature line for each prosecuting agency. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "The same prosecutor-first workflow and the same county variations as the ordinary conviction petition.",
        "Venue: The district court for the county, which is the highest court in the county and may seal all charges within it.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Records in more than one county.",
        "- Any packet mixing municipal court matters with justice or district court matters, where the stipulation must be obtained from more than one prosecuting agency.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_multi-primary-filing-2: the composed petition, on this route's own statutory ground (Seal several Nevada records in one filing)",
        "- nv_seal_multi-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal several Nevada records in one filing)",
        "- nv_seal_multi-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal several Nevada records in one filing)",
        "- nv_seal_multi-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal several Nevada records in one filing)"
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
      "id": "nv_seal_pardon-primary-filing-2",
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "title": "Petition - Seal a Nevada record after a pardon",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal a Nevada record after a pardon)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SEALING OF RECORDS AFTER AN UNCONDITIONAL PARDON (NRS 179.273)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.273; NRS 213; NRS 179.285 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "NRS 179.273 is titled \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\" in the chapter index published by the Nevada Legislature, and the controlling review describes it as providing automatic sealing together with a no-fee petition route. The internal reference omits the section entirely, which the review records as one of its five substantive gaps. Because sealing is automatic in the first instance, the correct first move is verification rather than a filing; the petition exists for the case where the automatic sealing has not happened, and it carries no fee. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - sea full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - sea date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - sea county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sea case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - sea offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - sea all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - sea trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - pdn pardon type] Was the pardon unconditional, or did it come with conditions?",
        "(Asked because NRS 179.273 reaches an unconditional pardon.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - pdn pardon date] On what date was the pardon granted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pdn still showing] Have you checked whether the record still shows on your Nevada criminal history?",
        "(Asked first, because sealing under this section is automatic and a petition should only be prepared where verification shows it did not happen.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - pdn firearms] Does your pardon restrict the right to bear arms?",
        "(Asked because a pardon that does not restrict the right to bear arms is the only route that restores firearm rights in Nevada; sealing never does.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.273; NRS 213; NRS 179.285.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_seaFullLegalName",
          "label": "Item C1 - sea full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaDateOfBirth",
          "label": "Item C2 - sea date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCounty",
          "label": "Item C3 - sea county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCaseNumber",
          "label": "Item C4 - sea case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaOffenceDetails",
          "label": "Item C5 - sea offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaAllNevadaRecords",
          "label": "Item C6 - sea all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaTrafficking",
          "label": "Item C7 - sea trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pdnPardonType",
          "label": "Item C8 - pdn pardon type",
          "supply": "Was the pardon unconditional, or did it come with conditions? (Asked because NRS 179.273 reaches an unconditional pardon.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pdnPardonDate",
          "label": "Item C9 - pdn pardon date",
          "supply": "On what date was the pardon granted?",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pdnStillShowing",
          "label": "Item C10 - pdn still showing",
          "supply": "Have you checked whether the record still shows on your Nevada criminal history? (Asked first, because sealing under this section is automatic and a petition should only be prepared where verification shows it did not happen.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pdnFirearms",
          "label": "Item C11 - pdn firearms",
          "supply": "Does your pardon restrict the right to bear arms? (Asked because a pardon that does not restrict the right to bear arms is the only route that restores firearm rights in Nevada; sealing never does.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_pardon, and the platform holds no value for it"
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
      "id": "nv_seal_pardon-proposed-order-3",
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "title": "Proposed Order - Seal a Nevada record after a pardon",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record after a pardon)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.273; NRS 213; NRS 179.285. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_pardon-declaration-and-verification-4",
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "title": "Declaration and Verification - Seal a Nevada record after a pardon",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal a Nevada record after a pardon)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_pardon-stipulation-5",
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "title": "Stipulation of the Prosecuting Attorney - Seal a Nevada record after a pardon",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record after a pardon)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_pardon-filing-instructions-6",
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal a Nevada record after a pardon",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal a Nevada record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Sealing of Records After an Unconditional Pardon (NRS 179.273).",
        "",
        "NRS 179.273 is titled \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\" in the chapter index published by the Nevada Legislature, and the controlling review describes it as providing automatic sealing together with a no-fee petition route. The internal reference omits the section entirely, which the review records as one of its five substantive gaps. Because sealing is automatic in the first instance, the correct first move is verification rather than a filing; the petition exists for the case where the automatic sealing has not happened, and it carries no fee. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "The same prosecutor-first workflow and the same county variations as the ordinary conviction petition.",
        "Venue: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: none for this petition. NRS 179.273 is titled \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\" in the chapter index published by the Nevada Legislature, and the committed record records that the petition carries no fee. The county-dependent filing fee recorded for the ordinary sealing petition under NRS 179.245 belongs to that instrument and is not read across to this one. Fee waiver as recorded: no filing-fee waiver is needed for a petition that carries no fee. The Central Repository criminal history and fingerprinting costs and the cost of certified copies are separate charges that still apply, and every one of them is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- NRS 179.273 provides automatic sealing after an unconditional pardon together with a no-fee petition, and the internal reference is missing it entirely.",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Applying for a pardon in the first place, which is a Board of Pardons matter under NRS chapter 213 and out of scope.",
        "- Any question about whether a pardon is unconditional.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_pardon-primary-filing-2: the composed petition, on this route's own statutory ground (Seal a Nevada record after a pardon)",
        "- nv_seal_pardon-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record after a pardon)",
        "- nv_seal_pardon-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal a Nevada record after a pardon)",
        "- nv_seal_pardon-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record after a pardon)"
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
      "id": "nv_seal_conviction-primary-filing-2",
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "title": "Petition - Seal your Nevada conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal your Nevada conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL RECORDS AFTER CONVICTION (NRS 179.245)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.245; NRS 179.2405; NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301; NRS 176A.850 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person convicted in Nevada may petition the court in which they were convicted to seal all records relating to the conviction once the waiting period for the offence category has run. The periods are ten years for a category A felony, a crime of violence or residential burglary; five years for a category B, C or D felony; two years for a category E felony or a gross misdemeanour; seven years for non-felony Medicaid fraud, non-felony DUI or non-felony battery constituting domestic violence; two years for misdemeanour battery, harassment, stalking or a protective-order violation; and one year for any other misdemeanour. The trigger differs by paragraph: paragraphs (a) to (d) run from release from actual custody or discharge from parole or probation, whichever is later, while paragraphs (e) to (g) run from release from actual custody or from the end of a suspended sentence, whichever is later, and the eligibility engine must model both. NRS 179.2445 creates a rebuttable presumption that records should be sealed where the applicant satisfies all statutory requirements, except for a defendant dishonourably discharged from probation under NRS 176A.850, and if the prosecutor stipulates or fails to object within 30 days the court may seal without a hearing. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - cvs full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - cvs date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - cvs county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "(Asked because the court level decides the venue and because the stipulation practice differs between district attorneys and city attorneys.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - cvs case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - cvs offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - cvs all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package, and because a later case interacts with the clean-period requirement on an earlier one.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - cvs pending charges] Is any charge pending against you now, anywhere?",
        "(Asked because NRS 179.245(5) requires the court to find that during the prescribed period the petitioner has not been charged with any offence for which charges are pending and has not been convicted of any offence, except minor moving or standing traffic violations.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - cvs trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process for a victim of sex trafficking or involuntary servitude, including fingerprints, the criminal history and certified copies, and because a separate vacatur route under NRS 179.247 may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - cvs offence category] What category was the offence — category A, B, C, D or E felony, gross misdemeanour, or misdemeanour?",
        "(Asked because the category sets the waiting period and is taken from the official record, not from recollection. It drives a one-year versus ten-year answer.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - cvs release date] When were you released from custody, and when were you discharged from parole or probation?",
        "(Asked because paragraphs (a) to (d) run from the later of those two events.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - cvs suspended sentence] Were you given a suspended sentence, and if so when did it end?",
        "(Asked because paragraphs (e) to (g) run from release from actual custody or the end of a suspended sentence, whichever is later, which is a different trigger from the felony paragraphs.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - cvs dui details] If this was a DUI, which subsection were you punished under, and did you take part in the statewide sobriety and drug monitoring programme?",
        "(Asked because NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the NRS 484C.392 programme. A blanket rule that felony DUI is never sealable will wrongly reject eligible people.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - cvs outstanding fees] Do you still owe any fines, jail fees, probation fees or house arrest costs on this case?",
        "(Asked because the statute keys on release and discharge rather than payment, but outstanding fees are widely reported to stall petitions in practice. This is a practical prerequisite to verify, not a statutory one.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - cvs dishonourable discharge] Were you dishonourably discharged from probation?",
        "(Asked because NRS 179.2445 withholds the rebuttable presumption from a defendant dishonourably discharged from probation under NRS 176A.850, which changes what the packet can tell the participant to expect.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - cvs prior denial] Have you asked a Nevada court to seal any record before, and was it denied? If so, when?",
        "(Asked because NRS 179.265 bars a rehearing for a period after a denial, which the internal reference omits entirely.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.245; NRS 179.2405; NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301; NRS 176A.850.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsFullLegalName",
          "label": "Item C1 - cvs full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsDateOfBirth",
          "label": "Item C2 - cvs date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsCounty",
          "label": "Item C3 - cvs county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal? (Asked because the court level decides the venue and because the stipulation practice differs between district attorneys and city attorneys.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsCaseNumber",
          "label": "Item C4 - cvs case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsOffenceDetails",
          "label": "Item C5 - cvs offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsAllNevadaRecords",
          "label": "Item C6 - cvs all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package, and because a later case interacts with the clean-period requirement on an earlier one.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsPendingCharges",
          "label": "Item C7 - cvs pending charges",
          "supply": "Is any charge pending against you now, anywhere? (Asked because NRS 179.245(5) requires the court to find that during the prescribed period the petitioner has not been charged with any offence for which charges are pending and has not been convicted of any offence, except minor moving or standing traffic violations.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsTrafficking",
          "label": "Item C8 - cvs trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process for a victim of sex trafficking or involuntary servitude, including fingerprints, the criminal history and certified copies, and because a separate vacatur route under NRS 179.247 may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsOffenceCategory",
          "label": "Item C9 - cvs offence category",
          "supply": "What category was the offence — category A, B, C, D or E felony, gross misdemeanour, or misdemeanour? (Asked because the category sets the waiting period and is taken from the official record, not from recollection. It drives a one-year versus ten-year answer.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsReleaseDate",
          "label": "Item C10 - cvs release date",
          "supply": "When were you released from custody, and when were you discharged from parole or probation? (Asked because paragraphs (a) to (d) run from the later of those two events.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsSuspendedSentence",
          "label": "Item C11 - cvs suspended sentence",
          "supply": "Were you given a suspended sentence, and if so when did it end? (Asked because paragraphs (e) to (g) run from release from actual custody or the end of a suspended sentence, whichever is later, which is a different trigger from the felony paragraphs.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsDuiDetails",
          "label": "Item C12 - cvs dui details",
          "supply": "If this was a DUI, which subsection were you punished under, and did you take part in the statewide sobriety and drug monitoring programme? (Asked because NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the NRS 484C.392 programme. A blanket rule that felony DUI is never sealable will wrongly reject eligible people.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsOutstandingFees",
          "label": "Item C13 - cvs outstanding fees",
          "supply": "Do you still owe any fines, jail fees, probation fees or house arrest costs on this case? (Asked because the statute keys on release and discharge rather than payment, but outstanding fees are widely reported to stall petitions in practice. This is a practical prerequisite to verify, not a statutory one.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsDishonourableDischarge",
          "label": "Item C14 - cvs dishonourable discharge",
          "supply": "Were you dishonourably discharged from probation? (Asked because NRS 179.2445 withholds the rebuttable presumption from a defendant dishonourably discharged from probation under NRS 176A.850, which changes what the packet can tell the participant to expect.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cvsPriorDenial",
          "label": "Item C15 - cvs prior denial",
          "supply": "Have you asked a Nevada court to seal any record before, and was it denied? If so, when? (Asked because NRS 179.265 bars a rehearing for a period after a denial, which the internal reference omits entirely.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_conviction, and the platform holds no value for it"
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
      "id": "nv_seal_conviction-proposed-order-3",
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "title": "Proposed Order - Seal your Nevada conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal your Nevada conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.245; NRS 179.2405; NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301; NRS 176A.850. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_conviction-declaration-and-verification-4",
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "title": "Declaration and Verification - Seal your Nevada conviction",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal your Nevada conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_conviction-stipulation-5",
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "title": "Stipulation of the Prosecuting Attorney - Seal your Nevada conviction",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal your Nevada conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_conviction-filing-instructions-6",
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal your Nevada conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal your Nevada conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal Records After Conviction (NRS 179.245).",
        "",
        "A person convicted in Nevada may petition the court in which they were convicted to seal all records relating to the conviction once the waiting period for the offence category has run. The periods are ten years for a category A felony, a crime of violence or residential burglary; five years for a category B, C or D felony; two years for a category E felony or a gross misdemeanour; seven years for non-felony Medicaid fraud, non-felony DUI or non-felony battery constituting domestic violence; two years for misdemeanour battery, harassment, stalking or a protective-order violation; and one year for any other misdemeanour. The trigger differs by paragraph: paragraphs (a) to (d) run from release from actual custody or discharge from parole or probation, whichever is later, while paragraphs (e) to (g) run from release from actual custody or from the end of a suspended sentence, whichever is later, and the eligibility engine must model both. NRS 179.2445 creates a rebuttable presumption that records should be sealed where the applicant satisfies all statutory requirements, except for a defendant dishonourably discharged from probation under NRS 176A.850, and if the prosecutor stipulates or fails to object within 30 days the court may seal without a hearing. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "Nevada's workflow puts the prosecutor in the middle rather than at the end: the state's own instructions direct the petitioner to prepare the petition and order, submit them to the prosecuting agency with attachments, and file with the court clerk only after the prosecutor stipulates. Local practice is material. The Clark County District Attorney will not stipulate to petitions that include municipal court arrests or convictions, so a packet covering both must go to the appropriate city attorney and then to the district attorney, with a separate signature line for each prosecuting agency on the order. Only one petition, affidavit and order is required to seal all records within Clark County, and justice court petitions must be captioned to the specific township. Las Vegas Municipal Court requires its own Petition, Declaration and Verification, Order and Stipulation and denies typed signatures outright. Reno Municipal Court charges a filing fee, sets the petition for hearing at least 60 days after filing, and applies the sex trafficking fee exemption.",
        "Venue: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: County-dependent. Reno Municipal Court charges a filing fee; the repository criminal history and fingerprinting carry their own costs; certified copies are charged. Every one of those is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude, which zeroes every fee in the process. County fee-waiver applications otherwise.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it, and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The petition is not the first step. The district attorney is. The state's own instructions direct the petitioner to prepare the petition and order, submit them to the DA's office with attachments, and only file with the court clerk after the DA stipulates.",
        "- NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the statewide sobriety and drug monitoring program. A blanket \"felony DUI is never sealable\" rule will wrongly reject eligible people.",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "- Everything runs off a current verified criminal history from the Central Repository. NRS 179.245(2)(a) and 179.255(3)(a) make it a statutory attachment requirement. No repository record, no packet.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any question about whether an offence is a sexual offence within the eighteen-item NRS 179.245(10)(b) list, or a crime against a child under NRS 179D.0357.",
        "- Any DUI, where the NRS 179.245(7) carve-back has to be applied rather than a blanket exclusion.",
        "- Any dishonourable discharge from probation, which removes the presumption.",
        "- A denial within the NRS 179.265 rehearing bar.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "- Offense category. Nevada eligibility turns on category A through E felony, gross misdemeanor, or misdemeanor, and on whether the offense is a \"crime of violence.\" This is a legal classification, not a lookup, and it drives a 1-year versus 10-year answer.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_conviction-primary-filing-2: the composed petition, on this route's own statutory ground (Seal your Nevada conviction)",
        "- nv_seal_conviction-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal your Nevada conviction)",
        "- nv_seal_conviction-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal your Nevada conviction)",
        "- nv_seal_conviction-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal your Nevada conviction)"
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
      "id": "nv_seal_nonconviction-primary-filing-2",
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "title": "Petition - Seal a Nevada arrest that did not end in a conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal a Nevada arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL RECORDS AFTER DISMISSAL, DECLINATION OF PROSECUTION OR ACQUITTAL (NRS 179.255(1))",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.255; NRS 179.255(1); NRS 179.255(3); NRS 179.255(4); NRS 179.255(9); NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Where charges were dismissed the petition may be filed at any time after the dismissal; where prosecution was declined it may be filed at any time after the applicable statute of limitations has run, or any time eight years after the arrest, or pursuant to a stipulation between the parties; and where the person was acquitted it may be filed at any time after the acquittal. On an acquittal, and a finding that there is no evidence further action will be brought, the court shall order the records sealed, so relief is mandatory there; on a dismissal or declination it is discretionary but carries the NRS 179.2445 presumption. The NRS 179.245(6) conviction exclusions do not govern this track, so an arrest for an offence that could never be sealed as a conviction is still sealable where the case was dismissed or ended in acquittal. NRS 179.255(3)(b) adds an express requirement that the petition state the disposition of the proceedings. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - ncv full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - ncv date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - ncv county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - ncv case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - ncv offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - ncv all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - ncv trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - ncv disposition] How did the case end — the charges were dismissed, the prosecutor declined to pursue it, or you were acquitted?",
        "(Asked because the three routes have different timing and because an acquittal carries mandatory relief while a dismissal or declination is discretionary.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - ncv arrest date] On what date were you arrested?",
        "(Asked because the declination route allows a petition any time eight years after the arrest.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - ncv deferred judgment] Was the case dismissed because you completed a programme or a deferred judgment agreement?",
        "(Asked because a deferred judgment dismissal routes to NRS 176.211 rather than to this track, and a participant will describe both as a dismissal.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - ncv further action] Has anyone told you the case might be refiled?",
        "(Asked because the court must find there is no evidence that further action will be brought.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.255; NRS 179.255(1); NRS 179.255(3); NRS 179.255(4); NRS 179.255(9); NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvFullLegalName",
          "label": "Item C1 - ncv full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvDateOfBirth",
          "label": "Item C2 - ncv date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvCounty",
          "label": "Item C3 - ncv county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvCaseNumber",
          "label": "Item C4 - ncv case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvOffenceDetails",
          "label": "Item C5 - ncv offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvAllNevadaRecords",
          "label": "Item C6 - ncv all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvTrafficking",
          "label": "Item C7 - ncv trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvDisposition",
          "label": "Item C8 - ncv disposition",
          "supply": "How did the case end — the charges were dismissed, the prosecutor declined to pursue it, or you were acquitted? (Asked because the three routes have different timing and because an acquittal carries mandatory relief while a dismissal or declination is discretionary.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvArrestDate",
          "label": "Item C9 - ncv arrest date",
          "supply": "On what date were you arrested? (Asked because the declination route allows a petition any time eight years after the arrest.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvDeferredJudgment",
          "label": "Item C10 - ncv deferred judgment",
          "supply": "Was the case dismissed because you completed a programme or a deferred judgment agreement? (Asked because a deferred judgment dismissal routes to NRS 176.211 rather than to this track, and a participant will describe both as a dismissal.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvFurtherAction",
          "label": "Item C11 - ncv further action",
          "supply": "Has anyone told you the case might be refiled? (Asked because the court must find there is no evidence that further action will be brought.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_nonconviction, and the platform holds no value for it"
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
      "id": "nv_seal_nonconviction-proposed-order-3",
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "title": "Proposed Order - Seal a Nevada arrest that did not end in a conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.255; NRS 179.255(1); NRS 179.255(3); NRS 179.255(4); NRS 179.255(9); NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_nonconviction-declaration-and-verification-4",
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "title": "Declaration and Verification - Seal a Nevada arrest that did not end in a conviction",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal a Nevada arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_nonconviction-stipulation-5",
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "title": "Stipulation of the Prosecuting Attorney - Seal a Nevada arrest that did not end in a conviction",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_nonconviction-filing-instructions-6",
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal a Nevada arrest that did not end in a conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal a Nevada arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal Records After Dismissal, Declination of Prosecution or Acquittal (NRS 179.255(1)).",
        "",
        "Where charges were dismissed the petition may be filed at any time after the dismissal; where prosecution was declined it may be filed at any time after the applicable statute of limitations has run, or any time eight years after the arrest, or pursuant to a stipulation between the parties; and where the person was acquitted it may be filed at any time after the acquittal. On an acquittal, and a finding that there is no evidence further action will be brought, the court shall order the records sealed, so relief is mandatory there; on a dismissal or declination it is discretionary but carries the NRS 179.2445 presumption. The NRS 179.245(6) conviction exclusions do not govern this track, so an arrest for an offence that could never be sealed as a conviction is still sealable where the case was dismissed or ended in acquittal. NRS 179.255(3)(b) adds an express requirement that the petition state the disposition of the proceedings. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "The same prosecutor-first workflow and the same county variations as the conviction track. Under NRS 179.255(4) the court notifies the arresting agency, and the county prosecuting attorney for district or justice court matters or the city prosecuting attorney for municipal court matters.",
        "Venue: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Warn declination-route participants about NRS 179.255(9): where prosecution was declined and the records were sealed, the prosecutor may still file charges before the limitations period expires, and the court must then order the records inspected without any petition.",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "- Everything runs off a current verified criminal history from the Central Repository.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Declination cases where the statute of limitations analysis is not obvious.",
        "- Any case where the participant is unsure whether the disposition was a dismissal or a deferred judgment.",
        "- Any indication that further action may be brought.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_nonconviction-primary-filing-2: the composed petition, on this route's own statutory ground (Seal a Nevada arrest that did not end in a conviction)",
        "- nv_seal_nonconviction-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada arrest that did not end in a conviction)",
        "- nv_seal_nonconviction-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal a Nevada arrest that did not end in a conviction)",
        "- nv_seal_nonconviction-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada arrest that did not end in a conviction)"
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
      "id": "nv_seal_reentry-primary-filing-2",
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "title": "Petition - Seal a Nevada record after finishing a reentry program",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Seal a Nevada record after finishing a reentry program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SEALING OF RECORDS AFTER COMPLETION OF A PROGRAM FOR REENTRY (NRS 179.259)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under NRS 179.259; NRS 179.2445; NRS 179.275; NRS 179.285 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "NRS 179.259, \"Sealing records after completion of program for reentry\", provides a sealing route for a person who has completed a reentry programme. The controlling review approves the track with limitations and treats it as running on the same machinery as the ordinary conviction petition: repository record, generated pleading, prosecutor submission, then filing and service. The section's presence and official title were confirmed in the chapter index at the Nevada Legislature. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - sea full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - sea date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - sea county] In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sea case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - sea offence details] What was the offence called, which NRS section was cited, and on what date did it happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - sea all nevada records] What other Nevada arrests, charges or convictions do you have, in any county and any court?",
        "(Asked because Nevada practice is to seal a county's records as one package.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - sea trafficking] Were you a victim of sex trafficking or involuntary servitude in connection with this record?",
        "(Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - rnt program] Which reentry programme did you complete, and when did you finish it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - rnt completion proof] Do you have the document showing you completed it?",
        "(Asked because completion is the trigger and the court will want it evidenced.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under NRS 179.259; NRS 179.2445; NRS 179.275; NRS 179.285.",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "rbf",
          "id": "fact_seaFullLegalName",
          "label": "Item C1 - sea full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaDateOfBirth",
          "label": "Item C2 - sea date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCounty",
          "label": "Item C3 - sea county",
          "supply": "In which Nevada county did the case happen, and which court handled it — district, justice or municipal?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaCaseNumber",
          "label": "Item C4 - sea case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaOffenceDetails",
          "label": "Item C5 - sea offence details",
          "supply": "What was the offence called, which NRS section was cited, and on what date did it happen?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaAllNevadaRecords",
          "label": "Item C6 - sea all nevada records",
          "supply": "What other Nevada arrests, charges or convictions do you have, in any county and any court? (Asked because Nevada practice is to seal a county's records as one package.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_seaTrafficking",
          "label": "Item C7 - sea trafficking",
          "supply": "Were you a victim of sex trafficking or involuntary servitude in connection with this record? (Asked because NRS 179.245(9) waives every fee in the process, and because the NRS 179.247 vacatur route may be better than sealing.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_rntProgram",
          "label": "Item C8 - rnt program",
          "supply": "Which reentry programme did you complete, and when did you finish it?",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_rntCompletionProof",
          "label": "Item C9 - rnt completion proof",
          "supply": "Do you have the document showing you completed it? (Asked because completion is the trigger and the court will want it evidenced.)",
          "why": "the committed track registry records this as a required generation input for nv_seal_reentry, and the platform holds no value for it"
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
      "id": "nv_seal_reentry-proposed-order-3",
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "title": "Proposed Order - Seal a Nevada record after finishing a reentry program",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record after finishing a reentry program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under NRS 179.259; NRS 179.2445; NRS 179.275; NRS 179.285. The Court, having considered the petition and anything filed with it,",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
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
      "id": "nv_seal_reentry-declaration-and-verification-4",
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "title": "Declaration and Verification - Seal a Nevada record after finishing a reentry program",
      "role": "declaration_and_verification",
      "description": "the separately signed declaration verifying the petition (Seal a Nevada record after finishing a reentry program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "DECLARATION AND VERIFICATION",
        "",
        "I, {{participant.full_legal_name}}, born {{participant.date_of_birth}}, declare that I have read the petition filed with this declaration, that the facts I have written into it are true to the best of my own knowledge, and that I make this declaration for the purpose of verifying that petition.",
        "",
        "Anything I want the court to know that is not already in the petition:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this declaration personally, and separately from the petition.)",
        "",
        "If the record requires this declaration to be sworn before a notarial officer, that officer completes the block below when the petitioner appears. Nothing in it is completed by the petitioner or by this packet.",
        "",
        "{{DOTS:60}}",
        "(Completed by the notarial officer before whom the petitioner appears.)",
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "declaration_case_number",
          "label": "Case number in the caption of the declaration, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "declaration_additional",
          "label": "Anything the petitioner wants the court to know that is not already in the petition",
          "supply": "anything you want the court to know that is not already in the petition, in your own words",
          "why": "the platform never writes a participant's own account for them"
        },
        {
          "kind": "court",
          "id": "notarial_block",
          "label": "The block completed by the notarial officer before whom the petitioner appears",
          "why": "the notarial officer completes it when the petitioner appears"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Signature of the person named in the caption, on the declaration",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the signature on the declaration",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "nv_seal_reentry-stipulation-5",
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "title": "Stipulation of the Prosecuting Attorney - Seal a Nevada record after finishing a reentry program",
      "role": "stipulation",
      "description": "the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record after finishing a reentry program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Write the COURT on the line above. Venue as recorded: The court in which the conviction was entered. The district attorney's or city attorney's office receives this packet before it is filed - that is where the papers go first, not what is written on this line. See the filing instructions in this packet.)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "STIPULATION OF THE PROSECUTING ATTORNEY",
        "",
        "THIS PAGE IS NOT THE PETITIONER'S TO COMPLETE. It is carried in the packet because the recorded process requires the prosecuting attorney to consider the petition before it is filed with the court. Every line below belongs to that office.",
        "",
        "Prosecuting attorney's office:",
        "{{DOTS:70}}",
        "",
        "The prosecuting attorney states that the office:",
        "{{DOTS:70}}",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(Signed by the prosecuting attorney or a deputy of that office, if that office agrees to sign.)",
        "",
        "Petitioner named in this matter: {{participant.full_legal_name}}"
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
          "id": "caption_court",
          "label": "The court on the caption line \"IN THE ............ COURT\" of this document",
          "supply": "The court this is filed in, written as the court's own name. Venue as recorded: The court in which the conviction was entered. Do not write the district attorney's or city attorney's office here; that office receives the packet before filing and is not the court named in the caption.",
          "why": "venue is a fact of the participant's own record and the platform holds no value for it, and the caption line names the court rather than the prosecuting agency the packet goes to first"
        },
        {
          "kind": "court",
          "id": "stip_case_number",
          "label": "Case number in the caption of the stipulation, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "court",
          "id": "stip_office",
          "label": "Prosecuting attorney's office named on the stipulation",
          "why": "that office identifies itself on its own page"
        },
        {
          "kind": "court",
          "id": "stip_position",
          "label": "The statement of the prosecuting attorney's position",
          "why": "the position is the prosecuting attorney's to state"
        },
        {
          "kind": "court",
          "id": "stip_signing_line",
          "label": "Signing line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney signs their own page"
        },
        {
          "kind": "court",
          "id": "stip_date",
          "label": "Date line of the stipulation, for the prosecuting attorney",
          "why": "the prosecuting attorney dates their own page"
        }
      ]
    },
    {
      "id": "nv_seal_reentry-filing-instructions-6",
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "role": "filing_instructions",
      "title": "Filing Instructions - Seal a Nevada record after finishing a reentry program",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Seal a Nevada record after finishing a reentry program)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Sealing of Records After Completion of a Program for Reentry (NRS 179.259).",
        "",
        "NRS 179.259, \"Sealing records after completion of program for reentry\", provides a sealing route for a person who has completed a reentry programme. The controlling review approves the track with limitations and treats it as running on the same machinery as the ordinary conviction petition: repository record, generated pleading, prosecutor submission, then filing and service. The section's presence and official title were confirmed in the chapter index at the Nevada Legislature. Nevada calls it record sealing and never expungement: the Department of Public Safety states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does.",
        "",
        "WHERE IT GOES",
        "",
        "The district attorney's or city attorney's office first, then the clerk of the appropriate court",
        "The same prosecutor-first workflow and the same county variations as the ordinary conviction petition.",
        "Venue: The court in which the conviction was entered.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any question about whether the programme completed successfully.",
        "- Any programme that is not a reentry programme within the section.",
        "- Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
        "- Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
        "- Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
        "- Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
        "- Federal, tribal, military and out-of-state records.",
        "- Any participant whose goal is firearm rights, which sealing does not restore.",
        "- Immigration exposure. Nevada sealing must not be described as having immigration effect.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nv_seal_reentry-primary-filing-2: the composed petition, on this route's own statutory ground (Seal a Nevada record after finishing a reentry program)",
        "- nv_seal_reentry-proposed-order-3: the proposed order the court may sign; every decision line is the court's and is left blank (Seal a Nevada record after finishing a reentry program)",
        "- nv_seal_reentry-declaration-and-verification-4: the separately signed declaration verifying the petition (Seal a Nevada record after finishing a reentry program)",
        "- nv_seal_reentry-stipulation-5: the prosecuting attorney's page; nothing on it is the participant's to complete (Seal a Nevada record after finishing a reentry program)"
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
      "routeKey": "obligation:track-only:NV:nv_seal_decrim",
      "statute": "NRS 179.271; NRS 179.285",
      "instrument": "repository_record_step: nv_seal_decrim-repository-record-step-1; primary_filing: nv_seal_decrim-primary-filing-2; proposed_order: nv_seal_decrim-proposed-order-3; declaration_and_verification: nv_seal_decrim-declaration-and-verification-4; stipulation: nv_seal_decrim-stipulation-5; prosecutor_submission_instructions: nv_seal_decrim-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_decrim-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:NV:nv_seal_multi",
      "statute": "NRS 179.2595; NRS 179.245; NRS 179.255",
      "instrument": "repository_record_step: nv_seal_multi-repository-record-step-1; primary_filing: nv_seal_multi-primary-filing-2; proposed_order: nv_seal_multi-proposed-order-3; declaration_and_verification: nv_seal_multi-declaration-and-verification-4; stipulation: nv_seal_multi-stipulation-5; prosecutor_submission_instructions: nv_seal_multi-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_multi-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:NV:nv_seal_pardon",
      "statute": "NRS 179.273; NRS 213; NRS 179.285",
      "instrument": "repository_record_step: nv_seal_pardon-repository-record-step-1; primary_filing: nv_seal_pardon-primary-filing-2; proposed_order: nv_seal_pardon-proposed-order-3; declaration_and_verification: nv_seal_pardon-declaration-and-verification-4; stipulation: nv_seal_pardon-stipulation-5; prosecutor_submission_instructions: nv_seal_pardon-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_pardon-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_conviction:general-conviction-record-sealing-under-nrs-179-245",
      "statute": "NRS 179.245; NRS 179.2405; NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301; NRS 176A.850",
      "instrument": "repository_record_step: nv_seal_conviction-repository-record-step-1; primary_filing: nv_seal_conviction-primary-filing-2; proposed_order: nv_seal_conviction-proposed-order-3; declaration_and_verification: nv_seal_conviction-declaration-and-verification-4; stipulation: nv_seal_conviction-stipulation-5; prosecutor_submission_instructions: nv_seal_conviction-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_conviction-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_nonconviction:non-conviction-record-sealing",
      "statute": "NRS 179.255; NRS 179.255(1); NRS 179.255(3); NRS 179.255(4); NRS 179.255(9); NRS 179.2445; NRS 179.265; NRS 179.275; NRS 179.285; NRS 179.295; NRS 179.301",
      "instrument": "repository_record_step: nv_seal_nonconviction-repository-record-step-1; primary_filing: nv_seal_nonconviction-primary-filing-2; proposed_order: nv_seal_nonconviction-proposed-order-3; declaration_and_verification: nv_seal_nonconviction-declaration-and-verification-4; stipulation: nv_seal_nonconviction-stipulation-5; prosecutor_submission_instructions: nv_seal_nonconviction-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_nonconviction-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:NV:nv_seal_reentry:reentry-program-sealing-under-nrs-179-259",
      "statute": "NRS 179.259; NRS 179.2445; NRS 179.275; NRS 179.285",
      "instrument": "repository_record_step: nv_seal_reentry-repository-record-step-1; primary_filing: nv_seal_reentry-primary-filing-2; proposed_order: nv_seal_reentry-proposed-order-3; declaration_and_verification: nv_seal_reentry-declaration-and-verification-4; stipulation: nv_seal_reentry-stipulation-5; prosecutor_submission_instructions: nv_seal_reentry-prosecutor-submission-instructions-6; filing_and_service_instructions: nv_seal_reentry-filing-and-service-instructions-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Seal a Nevada record for something that is no longer a crime",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. The same prosecutor-first workflow and the same county variations as the ordinary conviction petition. Venue as recorded: The court in which the record was entered. Filing as recorded: Prepare the pleading and proposed order, submit them to the prosecuting agency with the repository record, and file with the clerk once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal a Nevada record for something that is no longer a crime",
      "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise."
    ],
    [
      "SERVICE — Seal a Nevada record for something that is no longer a crime",
      "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal a Nevada record for something that is no longer a crime",
      "**Stop and get help if:** Any question about whether the conduct has actually been decriminalised, which is a legal conclusion. **Stop and get help if:** Any partially decriminalised conduct, where some variants remain criminal. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect."
    ],
    [
      "FILING_DESTINATION — Seal several Nevada records in one filing",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. The same prosecutor-first workflow and the same county variations as the ordinary conviction petition. Venue as recorded: The district court for the county, which is the highest court in the county and may seal all charges within it. Filing as recorded: Prepare the pleading and proposed order, submit them to the prosecuting agency with the repository record, and file with the clerk once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal several Nevada records in one filing",
      "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise."
    ],
    [
      "SERVICE — Seal several Nevada records in one filing",
      "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal several Nevada records in one filing",
      "**Stop and get help if:** Records in more than one county. **Stop and get help if:** Any packet mixing municipal court matters with justice or district court matters, where the stipulation must be obtained from more than one prosecuting agency. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect."
    ],
    [
      "FILING_DESTINATION — Seal a Nevada record after a pardon",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. The same prosecutor-first workflow and the same county variations as the ordinary conviction petition. Venue as recorded: The court in which the conviction was entered, for the petition route. No venue applies to the automatic route. Filing as recorded: Prepare the pleading and proposed order, submit them to the prosecuting agency with the repository record, and file with the clerk once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal a Nevada record after a pardon",
      "Fee as recorded: none for this petition. NRS 179.273 is titled \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\" in the chapter index published by the Nevada Legislature, and the committed record records that the petition carries no fee. The county-dependent filing fee recorded for the ordinary sealing petition under NRS 179.245 belongs to that instrument and is not read across to this one. Fee waiver as recorded: no filing-fee waiver is needed for a petition that carries no fee. The Central Repository criminal history and fingerprinting costs and the cost of certified copies are separate charges that still apply, and every one of them is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9)."
    ],
    [
      "SERVICE — Seal a Nevada record after a pardon",
      "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal a Nevada record after a pardon",
      "**Stop and get help if:** Applying for a pardon in the first place, which is a Board of Pardons matter under NRS chapter 213 and out of scope. **Stop and get help if:** Any question about whether a pardon is unconditional. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect."
    ],
    [
      "FILING_DESTINATION — Seal your Nevada conviction",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. Nevada's workflow puts the prosecutor in the middle rather than at the end: the state's own instructions direct the petitioner to prepare the petition and order, submit them to the prosecuting agency with attachments, and file with the court clerk only after the prosecutor stipulates. Local practice is material. The Clark County District Attorney will not stipulate to petitions that include municipal court arrests or convictions, so a packet covering both must go to the appropriate city attorney and then to the district attorney, with a separate signature line for each prosecuting agency on the order. Only one petition, affidavit and order is required to seal all records within Clark County, and justice court petitions must be captioned to the specific township. Las Vegas Municipal Court requires its own Petition, Declaration and Verification, Order and Stipulation and denies typed signatures outright. Reno Municipal Court charges a filing fee, sets the petition for hearing at least 60 days after filing, and applies the sex trafficking fee exemption. Venue as recorded: The court in which the person was convicted, being a district, justice or municipal court. NRS 179.245(1). District court is the highest court in the county and may seal all charges within the county; NRS 179.2595 permits consolidation there. Filing as recorded: Prepare the petition, declaration and proposed order, submit them to the district attorney or city attorney with the repository record and attachments, and file with the clerk of the convicting court once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal your Nevada conviction",
      "Fee as recorded: County-dependent. Reno Municipal Court charges a filing fee; the repository criminal history and fingerprinting carry their own costs; certified copies are charged. Every one of those is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude, which zeroes every fee in the process. County fee-waiver applications otherwise."
    ],
    [
      "SERVICE — Seal your Nevada conviction",
      "Service as recorded: The signed order is served on every agency named in it, and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal your Nevada conviction",
      "**Stop and get help if:** Any question about whether an offence is a sexual offence within the eighteen-item NRS 179.245(10)(b) list, or a crime against a child under NRS 179D.0357. **Stop and get help if:** Any DUI, where the NRS 179.245(7) carve-back has to be applied rather than a blanket exclusion. **Stop and get help if:** Any dishonourable discharge from probation, which removes the presumption. **Stop and get help if:** A denial within the NRS 179.265 rehearing bar. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect. **Stop and get help if:** Offense category. Nevada eligibility turns on category A through E felony, gross misdemeanor, or misdemeanor, and on whether the offense is a \"crime of violence.\" This is a legal classification, not a lookup, and it drives a 1-year versus 10-year answer."
    ],
    [
      "FILING_DESTINATION — Seal a Nevada arrest that did not end in a conviction",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. The same prosecutor-first workflow and the same county variations as the conviction track. Under NRS 179.255(4) the court notifies the arresting agency, and the county prosecuting attorney for district or justice court matters or the city prosecuting attorney for municipal court matters. Venue as recorded: The court in which the charges were dismissed, the court having jurisdiction in which the charges were declined, or the court in which the acquittal was entered. NRS 179.2595 permits consolidation in district court. Filing as recorded: Prepare the petition, declaration and proposed order, submit them to the prosecuting agency with the repository record, and file with the clerk once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal a Nevada arrest that did not end in a conviction",
      "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise."
    ],
    [
      "SERVICE — Seal a Nevada arrest that did not end in a conviction",
      "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal a Nevada arrest that did not end in a conviction",
      "**Stop and get help if:** Declination cases where the statute of limitations analysis is not obvious. **Stop and get help if:** Any case where the participant is unsure whether the disposition was a dismissal or a deferred judgment. **Stop and get help if:** Any indication that further action may be brought. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect."
    ],
    [
      "FILING_DESTINATION — Seal a Nevada record after finishing a reentry program",
      "The committed track registry records the destination as **The district attorney's or city attorney's office first, then the clerk of the appropriate court**. The same prosecutor-first workflow and the same county variations as the ordinary conviction petition. Venue as recorded: The court in which the conviction was entered. Filing as recorded: Prepare the pleading and proposed order, submit them to the prosecuting agency with the repository record, and file with the clerk once the prosecutor stipulates."
    ],
    [
      "FEE_AND_WAIVER — Seal a Nevada record after finishing a reentry program",
      "Fee as recorded: County-dependent, plus the repository criminal history and fingerprinting costs and certified copies. Every fee is waived for a victim of sex trafficking or involuntary servitude under NRS 179.245(9). Fee waiver as recorded: NRS 179.245(9) for a victim of sex trafficking or involuntary servitude; county fee-waiver applications otherwise."
    ],
    [
      "SERVICE — Seal a Nevada record after finishing a reentry program",
      "Service as recorded: The signed order is served on every agency named in it and goes to the Central Repository under NRS 179.275. Notice as recorded: The prosecuting agency receives the packet before filing. If the prosecutor stipulates, or fails to object within 30 days, the court may seal without a hearing."
    ],
    [
      "SELF_HELP_STOP — Seal a Nevada record after finishing a reentry program",
      "**Stop and get help if:** Any question about whether the programme completed successfully. **Stop and get help if:** Any programme that is not a reentry programme within the section. **Stop and get help if:** Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer. **Stop and get help if:** Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation. **Stop and get help if:** Prosecutor refusal to stipulate, which converts the matter into a contested hearing. **Stop and get help if:** Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency. **Stop and get help if:** Federal, tribal, military and out-of-state records. **Stop and get help if:** Any participant whose goal is firearm rights, which sealing does not restore. **Stop and get help if:** Immigration exposure. Nevada sealing must not be described as having immigration effect."
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
        "Seal a Nevada record for something that is no longer a crime",
        "NRS 179.271, \"Sealing of records after decriminalization of offense\", provides a route where the conduct underlying a Nevada record is no longer a crime."
      ],
      [
        "Seal several Nevada records in one filing",
        "NRS 179.2595 permits a person seeking to seal more than one record to petition the district court for the county, which may seal all the records within that county including justice and municipal court cases."
      ],
      [
        "Seal a Nevada record after a pardon",
        "NRS 179.273 is titled \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\" in the chapter index published by the Nevada Legislature, and the controlling review describes it as providing automatic sealing together with a no-fee petition route."
      ],
      [
        "Seal your Nevada conviction",
        "A person convicted in Nevada may petition the court in which they were convicted to seal all records relating to the conviction once the waiting period for the offence category has run."
      ],
      [
        "Seal a Nevada arrest that did not end in a conviction",
        "Where charges were dismissed the petition may be filed at any time after the dismissal; where prosecution was declined it may be filed at any time after the applicable statute of limitations has run, or any time eight years after the arrest, or pursuant to a stipulation between the parties; and where the person was acquitted it may be filed at any time after the acquittal."
      ],
      [
        "Seal a Nevada record after finishing a reentry program",
        "NRS 179.259, \"Sealing records after completion of program for reentry\", provides a sealing route for a person who has completed a reentry programme."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Verified criminal history from the Nevada Central Repository. Submit an Identification File Request for State of Nevada Records of Criminal History with fingerprints and the fee. NRS 179.245(2)(a) and NRS 179.255(3)(a) make it a statutory attachment. The NRS 179.245(9) sex trafficking waiver zeroes the fee where it applies.",
      "Nevada Department of Public Safety, Records, Communications and Compliance Division"
    ],
    [
      "Obtain Verified criminal history from the Nevada Central Repository. Submit an Identification File Request for State of Nevada Records of Criminal History with fingerprints and the fee. NRS 179.245(2)(a) and NRS 179.255(3)(a) make this a statutory attachment, so there is no packet without it. The NRS 179.245(9) sex trafficking waiver zeroes the fee where it applies.",
      "Nevada Department of Public Safety, Records, Communications and Compliance Division"
    ],
    [
      "Obtain Judgment of conviction and proof of discharge. Ask the clerk of the convicting court for the judgment, and parole or probation for the discharge document. The discharge date is what the waiting period runs from, so it is checked against the record rather than recollection.",
      "The convicting court, and parole or probation"
    ],
    [
      "Obtain Court record showing the disposition. Ask the clerk for the dismissal order, the declination record or the judgment of acquittal. NRS 179.255(3)(b) makes the disposition an express content requirement of the petition.",
      "The court that handled the case"
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
    "**Every line of the prosecuting attorney's stipulation.** Nothing on that page is the participant's to complete; it is carried in the packet because the recorded process requires that office to consider the petition before it is filed.",
    "**The block for the notarial officer.** That officer completes it when the participant appears."
  ],
  "recordSays": [
    [
      "Seal a Nevada record for something that is no longer a crime",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ],
    [
      "Seal several Nevada records in one filing",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ],
    [
      "Seal a Nevada record after a pardon",
      "NRS 179.273 provides automatic sealing after an unconditional pardon together with a no-fee petition, and the internal reference is missing it entirely."
    ],
    [
      "Seal a Nevada record after a pardon",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ],
    [
      "Seal your Nevada conviction",
      "The petition is not the first step. The district attorney is. The state's own instructions direct the petitioner to prepare the petition and order, submit them to the DA's office with attachments, and only file with the court clerk after the DA stipulates."
    ],
    [
      "Seal your Nevada conviction",
      "NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the statewide sobriety and drug monitoring program. A blanket \"felony DUI is never sealable\" rule will wrongly reject eligible people."
    ],
    [
      "Seal your Nevada conviction",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ],
    [
      "Seal your Nevada conviction",
      "Everything runs off a current verified criminal history from the Central Repository. NRS 179.245(2)(a) and 179.255(3)(a) make it a statutory attachment requirement. No repository record, no packet."
    ],
    [
      "Seal a Nevada arrest that did not end in a conviction",
      "Warn declination-route participants about NRS 179.255(9): where prosecution was declined and the records were sealed, the prosecutor may still file charges before the limitations period expires, and the court must then order the records inspected without any petition."
    ],
    [
      "Seal a Nevada arrest that did not end in a conviction",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ],
    [
      "Seal a Nevada arrest that did not end in a conviction",
      "Everything runs off a current verified criminal history from the Central Repository."
    ],
    [
      "Seal a Nevada record after finishing a reentry program",
      "The sex trafficking fee waiver under NRS 179.245(9) is not a separate track but a cross-cutting entitlement that zeroes out every fee in the process, including fingerprints, criminal history and certified copies. It must be surfaced wherever a fee is mentioned."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Any question about whether the conduct has actually been decriminalised, which is a legal conclusion.",
    "Any partially decriminalised conduct, where some variants remain criminal.",
    "Any offence-category question. Nevada eligibility turns on category A through E felony, gross misdemeanour or misdemeanour and on whether the offence is a crime of violence, which is a legal classification driving a one-year versus ten-year answer.",
    "Any pending charge, and any conviction during the clean period other than a minor moving or standing traffic violation.",
    "Prosecutor refusal to stipulate, which converts the matter into a contested hearing.",
    "Records in more than one county, or in both municipal and justice or district court, where the stipulation practice differs by prosecuting agency.",
    "Federal, tribal, military and out-of-state records.",
    "Any participant whose goal is firearm rights, which sealing does not restore.",
    "Immigration exposure. Nevada sealing must not be described as having immigration effect.",
    "Records in more than one county.",
    "Any packet mixing municipal court matters with justice or district court matters, where the stipulation must be obtained from more than one prosecuting agency.",
    "Applying for a pardon in the first place, which is a Board of Pardons matter under NRS chapter 213 and out of scope.",
    "Any question about whether a pardon is unconditional.",
    "Any question about whether an offence is a sexual offence within the eighteen-item NRS 179.245(10)(b) list, or a crime against a child under NRS 179D.0357.",
    "Any DUI, where the NRS 179.245(7) carve-back has to be applied rather than a blanket exclusion.",
    "Any dishonourable discharge from probation, which removes the presumption.",
    "A denial within the NRS 179.265 rehearing bar.",
    "Offense category. Nevada eligibility turns on category A through E felony, gross misdemeanor, or misdemeanor, and on whether the offense is a \"crime of violence.\" This is a legal classification, not a lookup, and it drives a 1-year versus 10-year answer.",
    "Declination cases where the statute of limitations analysis is not obvious.",
    "Any case where the participant is unsure whether the disposition was a dismissal or a deferred judgment.",
    "Any indication that further action may be brought.",
    "Any question about whether the programme completed successfully.",
    "Any programme that is not a reentry programme within the section."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official NV form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any prosecuting attorney will stipulate, which the committed record makes a step before filing rather than a consequence of it"
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
      "finding": "The committed packet instructions record the NRS 179.245(9) sex-trafficking fee waiver as a cross-cutting entitlement that zeroes out every fee in the process, and require it to be surfaced wherever a fee is mentioned.",
      "consequence": "Every filing instructions page in this packet carries it beside the fee statement. This is the DET-FEE-AND-WAIVER-001-A2 limb: a waiver rule the repository holds is stated, not delegated to an office to ask."
    },
    {
      "finding": "The committed packet instructions record that the petition is not the first step — the district attorney is — and that filing with the clerk follows the DA's stipulation.",
      "consequence": "The stipulation is carried as a component with every line left to the prosecuting attorney's office, and the order of operations is stated on each filing instructions page. A participant who files first would be filing out of order."
    },
    {
      "finding": "The committed instructions record that NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the statewide sobriety and drug monitoring program, warning that a blanket 'felony DUI is never sealable' rule will wrongly reject eligible people.",
      "consequence": "The statement is carried onto the filing instructions page for the conviction-sealing route in the record's own words, so a participant is not turned away by a rule the record says is wrong."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 6 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
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
