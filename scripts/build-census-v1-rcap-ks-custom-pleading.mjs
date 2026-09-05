#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — Kansas municipal-court expungement, K.S.A. 12-4516
 * (ordinance conviction or diversion) and K.S.A. 12-4516a (ordinance arrest).
 *
 *   node "scripts/build-census-v1-rcap-ks-custom-pleading.mjs" [--check] [--no-raster] [--route-artifacts-only]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * TWO STATUTORY ROUTES IN ONE FAMILY, both participant-filed, both built as
 * custom pleadings: the committed specifications record a composed primary
 * filing and a composed proposed order for each, and name no official form.
 *
 * The two are NOT interchangeable. K.S.A. 12-4516 reaches a city ordinance
 * CONVICTION or DIVERSION; K.S.A. 12-4516a reaches an ARREST on a city
 * ordinance charge. Each set of pages states its own route in its own title,
 * body and footer, and the participant instructions carry a table saying
 * which set is whose. No election box is printed anywhere: the route is
 * determined by the participant's own record, not by a checkbox.
 *
 * A LOCAL-VARIATION FACT THE RECORD HOLDS, AND THE PACKET STATES. The census
 * records that some cities, including Wichita, govern expungement by charter
 * ordinance and publish their own instrument, and that where they do, that
 * instrument and that court's process govern. The registry asks the
 * participant, as a required generation input, whether their municipal court
 * publishes its own form. Both are carried.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-ks-custom-pleading",
  "worklistGroupId": "rcap-ks-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-ks-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading",
  "jurisdiction": "KS",
  "legalName": "Kansas Municipal-Court Expungement Petitions, K.S.A. 12-4516 and K.S.A. 12-4516a",
  "routeName": "asking a Kansas municipal court to expunge a city ordinance conviction or diversion under K.S.A. 12-4516, or an arrest on a city ordinance charge under K.S.A. 12-4516a",
  "statutes": [
    "K.S.A. 12-4516(a)",
    "K.S.A. 12-4516(b)",
    "K.S.A. 12-4516(c)",
    "K.S.A. 12-4516(d)",
    "K.S.A. 12-4516(e)",
    "K.S.A. 12-4516(f)",
    "K.S.A. 12-4516(g)",
    "K.S.A. 12-4516(h)",
    "K.S.A. 12-4516(i)",
    "K.S.A. 12-16,134",
    "K.S.A. 12-4516a(a)",
    "K.S.A. 12-4516a(b)",
    "K.S.A. 12-4516a(c)",
    "K.S.A. 12-4516a(d)",
    "K.S.A. 12-4516a(e)",
    "K.S.A. 12-4516a(f)",
    "K.S.A. 12-4516a(g)",
    "K.S.A. 12-4516a(h)",
    "K.S.A. 21-6107"
  ],
  /*
   * Two identities per route, and they are not the same thing.
   *
   * routeKey is the machine id the census carries. It is 108 and 105 characters
   * long, it is what every manifest, wiring and acceptance record binds to, and
   * it must never be weakened or abbreviated in any of them.
   *
   * routeLabel is what a person reads. When the census rewrote the two keys from
   * track-only to track-pathway form the printed `Route:` footer went from one
   * line to three hard-wrapped lines, breaking mid-token across a page boundary,
   * and that is not something to hand a participant or a municipal clerk. Roger
   * Roman decided on 2026-09-02 that the packet page prints the short human
   * label and the machine id stays in the manifests and the wiring. This is a
   * Kansas decision; no other family's route line is touched by it.
   *
   * The label is asserted below to be short, to be free of any machine-key
   * substring, and to fit the composed page on one line.
   */
  "routes": [
    {
      "routeKey": "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
      "routeLabel": "Municipal conviction or diversion expungement - K.S.A. 12-4516"
    },
    {
      "routeKey": "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
      "routeLabel": "Municipal arrest record expungement - K.S.A. 12-4516a"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:ks-12-4516-municipal+ks-12-4516a-municipal-arrest",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"ks-12-4516-municipal\"",
        "Petition for Expungement of a Kansas Municipal Court Conviction or Diversion under K.S.A. 12-4516",
        "A person convicted of a violation of a city ordinance may petition the convicting municipal court to expunge the convict",
        "Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516(a)(1) directs a con",
        "K.S.A. 12-4516(a)",
        "K.S.A. 12-4516(b)",
        "K.S.A. 12-4516(c)",
        "K.S.A. 12-4516(d)",
        "K.S.A. 12-4516(e)",
        "K.S.A. 12-4516(f)",
        "K.S.A. 12-4516(g)",
        "K.S.A. 12-4516(h)",
        "K.S.A. 12-4516(i)",
        "K.S.A. 12-16,134",
        "Which Kansas city's municipal court handled the case, and what is the case number?",
        "What is your full legal name?",
        "What was your full name at the time of the arrest, conviction or diversion, if different from your name now?",
        "What sex, race and date of birth should the petition state?",
        "Were you convicted of the ordinance violation, or did you complete a diversion agreement?",
        "Which city ordinance were you convicted of violating, or diverted for?",
        "Would that ordinance violation also have been a violation of a Kansas statute — for example driving under the influence, driving while suspended, or no insurance? The waiting period depends on the answer.",
        "On what date was the offence committed?",
        "On what date were you convicted, or on what date did you enter the diversion agreement?",
        "On what date did you satisfy the sentence, get discharged from probation, parole or a suspended sentence, or fulfil the diversion terms, whichever came last?",
        "Which law enforcement agency arrested you?",
        "Which authority granted the diversion?",
        "Have you been convicted of a felony in the past two years, or is any felony proceeding pending or being instituted against you?",
        "Have all court costs and fines in the case been paid? Some municipal courts require you to say so in the petition.",
        "Does that municipal court publish its own expungement form or require its own process? Its clerk can tell you.",
        "In your own words: what has changed in your circumstances and behaviour since the case, and why does expungement matter to you now?",
        "A municipal court may prescribe a fee to be charged as costs for a person petitioning for an order of expungement, K.S.A",
        "The court causes notice to be given. The participant does not serve.",
        "File with the clerk of the convicting municipal court. Confirm first whether that court publishes its own expungement fo",
        "\"trackId\": \"ks-12-4516a-municipal-arrest\"",
        "Petition for Expungement of a City Ordinance Arrest Record under K.S.A. 12-4516a",
        "Any person who has been arrested on a violation of a city ordinance may petition the court to expunge the arrest record.",
        "Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516a(a) directs the pet",
        "K.S.A. 12-4516a(a)",
        "K.S.A. 12-4516a(b)",
        "K.S.A. 12-4516a(c)",
        "K.S.A. 12-4516a(d)",
        "K.S.A. 12-4516a(e)",
        "K.S.A. 12-4516a(f)",
        "K.S.A. 12-4516a(g)",
        "K.S.A. 12-4516a(h)",
        "K.S.A. 21-6107",
        "Which Kansas city's municipal court handled the charge, and what is the case number if one exists?",
        "What was your full name at the time of the arrest, if different from your name now?",
        "On what date were you arrested?",
        "Which city ordinance were you arrested for violating?",
        "Which one of these applies to you: the arrest happened because of mistaken identity; a court found there was no probable cause; you were found not guilty; the arrest was for an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before 1 July 2014; or expungement would be in the best interests of justice and charges have been dismissed or none have been or are likely to be filed?",
        "Were you convicted, or did you complete a diversion, on this ordinance charge? If so the municipal conviction route applies instead.",
        "Were you arrested as a result of being a victim of identity theft? If so the municipal court may not charge you a fee.",
        "If you are relying on the best-interests-of-justice ground, tell us in your own words why expungement matters to you.",
        "A municipal court may prescribe a fee to be charged as costs, K.S.A. 12-4516a(b), except that no fee may be charged to a",
        "File with the clerk of the municipal court where the ordinance charge was brought. Confirm first whether that court publ"
      ]
    },
    {
      "recordId": "legal-design-specifications:ks-12-4516-municipal+ks-12-4516a-municipal-arrest",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"ks-12-4516-municipal-primary-filing-1\"",
        "\"componentId\": \"ks-12-4516-municipal-proposed-order-2\"",
        "\"componentId\": \"ks-12-4516a-municipal-arrest-primary-filing-1\"",
        "\"componentId\": \"ks-12-4516a-municipal-arrest-proposed-order-2\""
      ]
    },
    {
      "recordId": "route-obligation-census:2-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
        "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a"
      ]
    }
  ],
  "components": [
    {
      "id": "ks-12-4516-municipal-primary-filing-1",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
      "title": "Petition - Expunging a city ordinance conviction or diversion",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Expunging a city ordinance conviction or diversion)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The convicting Kansas municipal court - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION FOR EXPUNGEMENT OF A KANSAS MUNICIPAL COURT CONVICTION OR DIVERSION UNDER K.S.A. 12-4516",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under K.S.A. 12-4516(a); K.S.A. 12-4516(b); K.S.A. 12-4516(c); K.S.A. 12-4516(d); K.S.A. 12-4516(e); K.S.A. 12-4516(f); K.S.A. 12-4516(g); K.S.A. 12-4516(h); K.S.A. 12-4516(i); K.S.A. 12-16,134 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person convicted of a violation of a city ordinance may petition the convicting municipal court to expunge the conviction and related arrest records once three or more years have elapsed since satisfying the sentence imposed or discharge from probation, parole or a suspended sentence; a person who has fulfilled the terms of a diversion agreement based on a city ordinance violation may petition once three or more years have elapsed since those terms were fulfilled. Longer five-year and ten-year periods apply to the offences listed in (d) and to DUI-equivalent ordinance violations under (e), and a one-year period applies under (c) to a prostitution-equivalent ordinance violation where the petitioner can prove coercion. The court sets a hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, and shall order expungement on three findings: no felony conviction in the past two years with no such proceeding pending or being instituted, that the petitioner's circumstances and behaviour warrant expungement, and that expungement is consistent with the public welfare. There is no firearms finding, because a municipal ordinance conviction is not a felony.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - city and court] Which Kansas city's municipal court handled the case, and what is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - name used when the case was brought] What was your full name at the time of the arrest, conviction or diversion, if different from your name now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sex race date of birth] What sex, race and date of birth should the petition state?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - disposition type] Were you convicted of the ordinance violation, or did you complete a diversion agreement?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - ordinance violation] Which city ordinance were you convicted of violating, or diverted for?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - state equivalent offense] Would that ordinance violation also have been a violation of a Kansas statute — for example driving under the influence, driving while suspended, or no insurance? The waiting period depends on the answer.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - offense committed date] On what date was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - conviction or diversion date] On what date were you convicted, or on what date did you enter the diversion agreement?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - completion date] On what date did you satisfy the sentence, get discharged from probation, parole or a suspended sentence, or fulfil the diversion terms, whichever came last?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - arresting agency] Which law enforcement agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - diverting authority] Which authority granted the diversion?",
        "(Asked only where the disposition was a diversion, because K.S.A. 12-4516(g)(1)(F) requires the petition to identify the diverting authority.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - felony last two years] Have you been convicted of a felony in the past two years, or is any felony proceeding pending or being instituted against you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - costs and fines paid] Have all court costs and fines in the case been paid? Some municipal courts require you to say so in the petition.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - local form published] Does that municipal court publish its own expungement form or require its own process? Its clerk can tell you.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - participant account] In your own words: what has changed in your circumstances and behaviour since the case, and why does expungement matter to you now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under K.S.A. 12-4516(a); K.S.A. 12-4516(b); K.S.A. 12-4516(c); K.S.A. 12-4516(d); K.S.A. 12-4516(e); K.S.A. 12-4516(f); K.S.A. 12-4516(g); K.S.A. 12-4516(h); K.S.A. 12-4516(i); K.S.A. 12-16,134.",
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
          "id": "fact_cityAndCourt",
          "label": "Item C1 - city and court",
          "supply": "Which Kansas city's municipal court handled the case, and what is the case number?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_fullLegalName",
          "label": "Item C2 - full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_nameAtTimeOfCase",
          "label": "Item C3 - name used when the case was brought",
          "supply": "What was your full name at the time of the arrest, conviction or diversion, if different from your name now?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sexRaceDateOfBirth",
          "label": "Item C4 - sex race date of birth",
          "supply": "What sex, race and date of birth should the petition state?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionType",
          "label": "Item C5 - disposition type",
          "supply": "Were you convicted of the ordinance violation, or did you complete a diversion agreement?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ordinanceViolation",
          "label": "Item C6 - ordinance violation",
          "supply": "Which city ordinance were you convicted of violating, or diverted for?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateEquivalentOffense",
          "label": "Item C7 - state equivalent offense",
          "supply": "Would that ordinance violation also have been a violation of a Kansas statute — for example driving under the influence, driving while suspended, or no insurance? The waiting period depends on the answer.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCommittedDate",
          "label": "Item C8 - offense committed date",
          "supply": "On what date was the offence committed?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionOrDiversionDate",
          "label": "Item C9 - conviction or diversion date",
          "supply": "On what date were you convicted, or on what date did you enter the diversion agreement?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_completionDate",
          "label": "Item C10 - completion date",
          "supply": "On what date did you satisfy the sentence, get discharged from probation, parole or a suspended sentence, or fulfil the diversion terms, whichever came last?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestingAgency",
          "label": "Item C11 - arresting agency",
          "supply": "Which law enforcement agency arrested you?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_divertingAuthority",
          "label": "Item C12 - diverting authority",
          "supply": "Which authority granted the diversion? (Asked only where the disposition was a diversion, because K.S.A. 12-4516(g)(1)(F) requires the petition to identify the diverting authority.)",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_felonyLastTwoYears",
          "label": "Item C13 - felony last two years",
          "supply": "Have you been convicted of a felony in the past two years, or is any felony proceeding pending or being instituted against you?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_costsAndFinesPaid",
          "label": "Item C14 - costs and fines paid",
          "supply": "Have all court costs and fines in the case been paid? Some municipal courts require you to say so in the petition.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_localFormPublished",
          "label": "Item C15 - local form published",
          "supply": "Does that municipal court publish its own expungement form or require its own process? Its clerk can tell you.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_participantAccount",
          "label": "Item C16 - participant account",
          "supply": "In your own words: what has changed in your circumstances and behaviour since the case, and why does expungement matter to you now?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516-municipal, and the platform holds no value for it"
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
      "id": "ks-12-4516-municipal-proposed-order-2",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
      "title": "Proposed Order - Expunging a city ordinance conviction or diversion",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Expunging a city ordinance conviction or diversion)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The convicting Kansas municipal court)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under K.S.A. 12-4516(a); K.S.A. 12-4516(b); K.S.A. 12-4516(c); K.S.A. 12-4516(d); K.S.A. 12-4516(e); K.S.A. 12-4516(f); K.S.A. 12-4516(g); K.S.A. 12-4516(h); K.S.A. 12-4516(i); K.S.A. 12-16,134. The Court, having considered the petition and anything filed with it,",
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
      "id": "ks-12-4516-municipal-process-guidance-3",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
      "role": "process_guidance",
      "title": "Filing Instructions - Expunging a city ordinance conviction or diversion",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Expunging a city ordinance conviction or diversion)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition for Expungement of a Kansas Municipal Court Conviction or Diversion under K.S.A. 12-4516.",
        "",
        "A person convicted of a violation of a city ordinance may petition the convicting municipal court to expunge the conviction and related arrest records once three or more years have elapsed since satisfying the sentence imposed or discharge from probation, parole or a suspended sentence; a person who has fulfilled the terms of a diversion agreement based on a city ordinance violation may petition once three or more years have elapsed since those terms were fulfilled. Longer five-year and ten-year periods apply to the offences listed in (d) and to DUI-equivalent ordinance violations under (e), and a one-year period applies under (c) to a prostitution-equivalent ordinance violation where the petitioner can prove coercion. The court sets a hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, and shall order expungement on three findings: no felony conviction in the past two years with no such proceeding pending or being instituted, that the petitioner's circumstances and behaviour warrant expungement, and that expungement is consistent with the public welfare. There is no firearms finding, because a municipal ordinance conviction is not a felony.",
        "",
        "WHERE IT GOES",
        "",
        "The convicting Kansas municipal court",
        "Filed with the municipal court clerk. Some cities, including Wichita, govern expungement by charter ordinance and publish their own instrument; where they do, that instrument and that court's process govern.",
        "Venue: Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516(a)(1) directs a conviction petition to the convicting court, which is the municipal court of the city whose ordinance was violated, and (a)(2) directs a diversion petition to the court. Kansas has hundreds of municipal courts and no unified municipal forms regime, so the instrument is court-specific even though the mechanism is statewide.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A municipal court may prescribe a fee to be charged as costs for a person petitioning for an order of expungement, K.S.A. 12-4516(g)(2). Amounts vary by court and there is no statewide figure. Fee waiver as recorded: None identified in K.S.A. 12-4516. Any relief is a matter of local municipal court practice.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The court causes notice to be given. The participant does not serve. Notice as recorded: The court sets a date for hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, K.S.A. 12-4516(g)(1). Any person who may have relevant information may testify and the court may inquire into the petitioner's background.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The packet must tell the participant to confirm with the municipal court clerk, before filing, whether that court publishes its own form, what it charges as costs, and how many copies it wants.",
        "- The municipal findings are three, not four. K.S.A. 12-4516(h) requires no felony conviction in the past two years with no such proceeding pending or being instituted, that the petitioner's circumstances and behaviour warrant expungement, and that expungement is consistent with the public welfare. There is no firearms-safety finding, because an ordinance conviction is not a felony conviction.",
        "- The disclosure carve-outs apply here too. K.S.A. 12-4516(i) tracks the district court effect: the petitioner is treated as not having been arrested, convicted or diverted, subject to an enumerated list of contexts in which the arrest, conviction or diversion must still be disclosed.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The city prosecutor opposes the petition.",
        "- The municipal court sets a contested evidentiary hearing.",
        "- The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516, as Wichita does.",
        "- Whether the ordinance violation would also have constituted a listed state offence, which sets the waiting period, is disputed.",
        "- The participant is currently required to register under the Kansas Offender Registration Act.",
        "- Immigration consequences are in play.",
        "- Generation is complete when the packet is produced. Self-help stops when the city prosecutor opposes, the municipal court sets a contested evidentiary hearing, or a factual ground is disputed.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- ks-12-4516-municipal-primary-filing-1: the composed petition, on this route's own statutory ground (Expunging a city ordinance conviction or diversion)",
        "- ks-12-4516-municipal-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Expunging a city ordinance conviction or diversion)"
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
      "id": "ks-12-4516a-municipal-arrest-primary-filing-1",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
      "title": "Petition - Expunging an arrest on a city ordinance charge",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Expunging an arrest on a city ordinance charge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The Kansas municipal court where the ordinance charge was brought - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION FOR EXPUNGEMENT OF A CITY ORDINANCE ARREST RECORD UNDER K.S.A. 12-4516A",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under K.S.A. 12-4516a(a); K.S.A. 12-4516a(b); K.S.A. 12-4516a(c); K.S.A. 12-4516a(d); K.S.A. 12-4516a(e); K.S.A. 12-4516a(f); K.S.A. 12-4516a(g); K.S.A. 12-4516a(h); K.S.A. 21-6107; K.S.A. 12-16,134 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Any person who has been arrested on a violation of a city ordinance may petition the court to expunge the arrest record. When the petition is filed the court sets a hearing date and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, and the official court file is separated from other court records and disclosed only to a judge, designated court staff, the prosecuting attorney, the arresting agency or others by court order. A municipal court may prescribe a fee as costs, except that no fee may be charged to a person arrested as a result of being a victim of identity theft. At the hearing the court shall order the arrest record and subsequent court proceedings expunged on finding mistaken identity; that a court found no probable cause for the arrest; that the petitioner was found not guilty; that the arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before July 1, 2014; or that expungement would be in the best interests of justice and charges have been dismissed or no charges have been or are likely to be filed.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - city and court] Which Kansas city's municipal court handled the charge, and what is the case number if one exists?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - name used when the arrest happened] What was your full name at the time of the arrest, if different from your name now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - sex race date of birth] What sex, race and date of birth should the petition state?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - arrest date] On what date were you arrested?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arresting agency] Which law enforcement agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - ordinance charged] Which city ordinance were you arrested for violating?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - statutory ground] Which one of these applies to you: the arrest happened because of mistaken identity; a court found there was no probable cause; you were found not guilty; the arrest was for an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before 1 July 2014; or expungement would be in the best interests of justice and charges have been dismissed or none have been or are likely to be filed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - convicted or diverted] Were you convicted, or did you complete a diversion, on this ordinance charge? If so the municipal conviction route applies instead.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - identity theft victim] Were you arrested as a result of being a victim of identity theft? If so the municipal court may not charge you a fee.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - local form published] Does that municipal court publish its own expungement form or require its own process? Its clerk can tell you.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - participant account] If you are relying on the best-interests-of-justice ground, tell us in your own words why expungement matters to you.",
        "(Asked only where the participant selects the best-interests-of-justice ground, because the court then weighs public welfare under K.S.A. 12-4516a(e).)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under K.S.A. 12-4516a(a); K.S.A. 12-4516a(b); K.S.A. 12-4516a(c); K.S.A. 12-4516a(d); K.S.A. 12-4516a(e); K.S.A. 12-4516a(f); K.S.A. 12-4516a(g); K.S.A. 12-4516a(h); K.S.A. 21-6107; K.S.A. 12-16,134.",
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
          "id": "fact_cityAndCourt",
          "label": "Item C1 - city and court",
          "supply": "Which Kansas city's municipal court handled the charge, and what is the case number if one exists?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_fullLegalName",
          "label": "Item C2 - full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_nameAtTimeOfArrest",
          "label": "Item C3 - name used when the arrest happened",
          "supply": "What was your full name at the time of the arrest, if different from your name now?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sexRaceDateOfBirth",
          "label": "Item C4 - sex race date of birth",
          "supply": "What sex, race and date of birth should the petition state?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C5 - arrest date",
          "supply": "On what date were you arrested?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestingAgency",
          "label": "Item C6 - arresting agency",
          "supply": "Which law enforcement agency arrested you?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ordinanceCharged",
          "label": "Item C7 - ordinance charged",
          "supply": "Which city ordinance were you arrested for violating?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_statutoryGround",
          "label": "Item C8 - statutory ground",
          "supply": "Which one of these applies to you: the arrest happened because of mistaken identity; a court found there was no probable cause; you were found not guilty; the arrest was for an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before 1 July 2014; or expungement would be in the best interests of justice and charges have been dismissed or none have been or are likely to be filed?",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictedOrDiverted",
          "label": "Item C9 - convicted or diverted",
          "supply": "Were you convicted, or did you complete a diversion, on this ordinance charge? If so the municipal conviction route applies instead.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_identityTheftVictim",
          "label": "Item C10 - identity theft victim",
          "supply": "Were you arrested as a result of being a victim of identity theft? If so the municipal court may not charge you a fee.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_localFormPublished",
          "label": "Item C11 - local form published",
          "supply": "Does that municipal court publish its own expungement form or require its own process? Its clerk can tell you.",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_participantAccount",
          "label": "Item C12 - participant account",
          "supply": "If you are relying on the best-interests-of-justice ground, tell us in your own words why expungement matters to you. (Asked only where the participant selects the best-interests-of-justice ground, because the court then weighs public welfare under K.S.A. 12-4516a(e).)",
          "why": "the committed track registry records this as a required generation input for ks-12-4516a-municipal-arrest, and the platform holds no value for it"
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
      "id": "ks-12-4516a-municipal-arrest-proposed-order-2",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
      "title": "Proposed Order - Expunging an arrest on a city ordinance charge",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Expunging an arrest on a city ordinance charge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The Kansas municipal court where the ordinance charge was brought)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under K.S.A. 12-4516a(a); K.S.A. 12-4516a(b); K.S.A. 12-4516a(c); K.S.A. 12-4516a(d); K.S.A. 12-4516a(e); K.S.A. 12-4516a(f); K.S.A. 12-4516a(g); K.S.A. 12-4516a(h); K.S.A. 21-6107; K.S.A. 12-16,134. The Court, having considered the petition and anything filed with it,",
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
      "id": "ks-12-4516a-municipal-arrest-process-guidance-3",
      "routeKey": "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
      "role": "process_guidance",
      "title": "Filing Instructions - Expunging an arrest on a city ordinance charge",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Expunging an arrest on a city ordinance charge)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition for Expungement of a City Ordinance Arrest Record under K.S.A. 12-4516a.",
        "",
        "Any person who has been arrested on a violation of a city ordinance may petition the court to expunge the arrest record. When the petition is filed the court sets a hearing date and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, and the official court file is separated from other court records and disclosed only to a judge, designated court staff, the prosecuting attorney, the arresting agency or others by court order. A municipal court may prescribe a fee as costs, except that no fee may be charged to a person arrested as a result of being a victim of identity theft. At the hearing the court shall order the arrest record and subsequent court proceedings expunged on finding mistaken identity; that a court found no probable cause for the arrest; that the petitioner was found not guilty; that the arrest was for a violation of an ordinance prohibited by K.S.A. 12-16,134(a) or (b) adopted before July 1, 2014; or that expungement would be in the best interests of justice and charges have been dismissed or no charges have been or are likely to be filed.",
        "",
        "WHERE IT GOES",
        "",
        "The Kansas municipal court where the ordinance charge was brought",
        "Filed with the municipal court clerk. On filing, the official court file is separated from other court records and access is limited under K.S.A. 12-4516a(b).",
        "Venue: Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516a(a) directs the petition to the court, meaning the municipal court of the city whose ordinance was charged. The mechanism is statewide; the instrument is court-specific.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A municipal court may prescribe a fee to be charged as costs, K.S.A. 12-4516a(b), except that no fee may be charged to a person who was arrested as a result of being a victim of identity theft under K.S.A. 21-6107 or former K.S.A. 21-4018. Amounts vary by court and there is no statewide figure. Fee waiver as recorded: No discretionary waiver. The relief is the statutory identity-theft exemption, which applies by its own terms.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: The court causes notice to be given. The participant does not serve. Notice as recorded: The court sets a date for hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, K.S.A. 12-4516a(b). Any person who may have relevant information may testify and the court may inquire into the petitioner's background.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The packet must state the identity-theft fee exemption: no fee may be charged to a person who was arrested as a result of being a victim of identity theft under K.S.A. 21-6107 or its predecessor, even though the municipal court may otherwise prescribe a fee as costs.",
        "- The packet must say that on filing the petition the official court file is separated from other municipal court records and is disclosed only to a judge, designated court staff, the prosecuting attorney, the arresting agency or others by court order, and that after expungement the records may still be released to a criminal justice agency with a legitimate need.",
        "- Where the best-interests-of-justice ground is used, K.S.A. 12-4516a(e) requires the court to determine whether the records should nonetheless remain available for eight enumerated purposes. The packet must say so.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The city prosecutor opposes the petition.",
        "- The municipal court sets a contested evidentiary hearing.",
        "- The mistaken-identity or no-probable-cause ground is disputed on the facts.",
        "- The participant was convicted or completed a diversion on the ordinance charge, which puts them on the municipal conviction route instead.",
        "- The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516a.",
        "- Immigration consequences are in play.",
        "- Generation is complete when the packet is produced. Self-help stops when the city prosecutor opposes, the municipal court sets a contested evidentiary hearing, or a factual ground is disputed.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- ks-12-4516a-municipal-arrest-primary-filing-1: the composed petition, on this route's own statutory ground (Expunging an arrest on a city ordinance charge)",
        "- ks-12-4516a-municipal-arrest-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Expunging an arrest on a city ordinance charge)"
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
      "routeKey": "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
      "statute": "K.S.A. 12-4516(a); K.S.A. 12-4516(b); K.S.A. 12-4516(c); K.S.A. 12-4516(d); K.S.A. 12-4516(e); K.S.A. 12-4516(f); K.S.A. 12-4516(g); K.S.A. 12-4516(h); K.S.A. 12-4516(i); K.S.A. 12-16,134",
      "instrument": "primary_filing: ks-12-4516-municipal-primary-filing-1; proposed_order: ks-12-4516-municipal-proposed-order-2",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
      "statute": "K.S.A. 12-4516a(a); K.S.A. 12-4516a(b); K.S.A. 12-4516a(c); K.S.A. 12-4516a(d); K.S.A. 12-4516a(e); K.S.A. 12-4516a(f); K.S.A. 12-4516a(g); K.S.A. 12-4516a(h); K.S.A. 21-6107; K.S.A. 12-16,134",
      "instrument": "primary_filing: ks-12-4516a-municipal-arrest-primary-filing-1; proposed_order: ks-12-4516a-municipal-arrest-proposed-order-2",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Expunging a city ordinance conviction or diversion",
      "The committed track registry records the destination as **The convicting Kansas municipal court**. Filed with the municipal court clerk. Some cities, including Wichita, govern expungement by charter ordinance and publish their own instrument; where they do, that instrument and that court's process govern. Venue as recorded: Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516(a)(1) directs a conviction petition to the convicting court, which is the municipal court of the city whose ordinance was violated, and (a)(2) directs a diversion petition to the court. Kansas has hundreds of municipal courts and no unified municipal forms regime, so the instrument is court-specific even though the mechanism is statewide. Filing as recorded: File with the clerk of the convicting municipal court. Confirm first whether that court publishes its own expungement form or requires its own process; where it does, use the local instrument."
    ],
    [
      "FEE_AND_WAIVER — Expunging a city ordinance conviction or diversion",
      "Fee as recorded: A municipal court may prescribe a fee to be charged as costs for a person petitioning for an order of expungement, K.S.A. 12-4516(g)(2). Amounts vary by court and there is no statewide figure. Fee waiver as recorded: None identified in K.S.A. 12-4516. Any relief is a matter of local municipal court practice."
    ],
    [
      "SERVICE — Expunging a city ordinance conviction or diversion",
      "Service as recorded: The court causes notice to be given. The participant does not serve. Notice as recorded: The court sets a date for hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, K.S.A. 12-4516(g)(1). Any person who may have relevant information may testify and the court may inquire into the petitioner's background."
    ],
    [
      "SELF_HELP_STOP — Expunging a city ordinance conviction or diversion",
      "**Stop and get help if:** The city prosecutor opposes the petition. **Stop and get help if:** The municipal court sets a contested evidentiary hearing. **Stop and get help if:** The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516, as Wichita does. **Stop and get help if:** Whether the ordinance violation would also have constituted a listed state offence, which sets the waiting period, is disputed. **Stop and get help if:** The participant is currently required to register under the Kansas Offender Registration Act. **Stop and get help if:** Immigration consequences are in play. **Stop and get help if:** Generation is complete when the packet is produced. Self-help stops when the city prosecutor opposes, the municipal court sets a contested evidentiary hearing, or a factual ground is disputed."
    ],
    [
      "FILING_DESTINATION — Expunging an arrest on a city ordinance charge",
      "The committed track registry records the destination as **The Kansas municipal court where the ordinance charge was brought**. Filed with the municipal court clerk. On filing, the official court file is separated from other court records and access is limited under K.S.A. 12-4516a(b). Venue as recorded: Statewide statute available in every Kansas municipal court, executed court by court. K.S.A. 12-4516a(a) directs the petition to the court, meaning the municipal court of the city whose ordinance was charged. The mechanism is statewide; the instrument is court-specific. Filing as recorded: File with the clerk of the municipal court where the ordinance charge was brought. Confirm first whether that court publishes its own expungement form or requires its own process."
    ],
    [
      "FEE_AND_WAIVER — Expunging an arrest on a city ordinance charge",
      "Fee as recorded: A municipal court may prescribe a fee to be charged as costs, K.S.A. 12-4516a(b), except that no fee may be charged to a person who was arrested as a result of being a victim of identity theft under K.S.A. 21-6107 or former K.S.A. 21-4018. Amounts vary by court and there is no statewide figure. Fee waiver as recorded: No discretionary waiver. The relief is the statutory identity-theft exemption, which applies by its own terms."
    ],
    [
      "SERVICE — Expunging an arrest on a city ordinance charge",
      "Service as recorded: The court causes notice to be given. The participant does not serve. Notice as recorded: The court sets a date for hearing and causes notice to be given to the prosecuting attorney and the arresting law enforcement agency, K.S.A. 12-4516a(b). Any person who may have relevant information may testify and the court may inquire into the petitioner's background."
    ],
    [
      "SELF_HELP_STOP — Expunging an arrest on a city ordinance charge",
      "**Stop and get help if:** The city prosecutor opposes the petition. **Stop and get help if:** The municipal court sets a contested evidentiary hearing. **Stop and get help if:** The mistaken-identity or no-probable-cause ground is disputed on the facts. **Stop and get help if:** The participant was convicted or completed a diversion on the ordinance charge, which puts them on the municipal conviction route instead. **Stop and get help if:** The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516a. **Stop and get help if:** Immigration consequences are in play. **Stop and get help if:** Generation is complete when the packet is produced. Self-help stops when the city prosecutor opposes, the municipal court sets a contested evidentiary hearing, or a factual ground is disputed."
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
        "Expunging a city ordinance conviction or diversion",
        "A person convicted of a violation of a city ordinance may petition the convicting municipal court to expunge the conviction and related arrest records once three or more years have elapsed since satisfying the sentence imposed or discharge from probation, parole or a suspended sentence; a person who has fulfilled the terms of a diversion agreement based on a city ordinance violation may petition once three or more years have elapsed since those terms were fulfilled."
      ],
      [
        "Expunging an arrest on a city ordinance charge",
        "Any person who has been arrested on a violation of a city ordinance may petition the court to expunge the arrest record."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Your own municipal case information. Ask the municipal court clerk for the case number, the ordinance violated, the disposition, the completion date, and whether all costs and fines are paid. LegalEase never collects, inspects or authenticates these records.",
      "The municipal court clerk"
    ],
    [
      "Obtain The municipal court's own expungement form, where it publishes one. Ask the clerk whether the court has its own form. Wichita and Topeka both publish their own.",
      "The municipal court clerk or the city's website"
    ],
    [
      "Obtain The municipal filing fee, where the court charges one. Ask the clerk what that court charges.",
      "The participant, paid to the municipal court clerk"
    ],
    [
      "Obtain Any municipal court record showing the disposition of the ordinance charge. Ask the municipal court clerk for the docket or the order. LegalEase never collects, inspects or authenticates it.",
      "The municipal court clerk"
    ],
    [
      "Obtain The municipal court's own expungement form, where it publishes one. Ask the clerk whether the court has its own form.",
      "The municipal court clerk or the city's website"
    ],
    [
      "Obtain The municipal filing fee, where the court charges one and no exemption applies. Ask the clerk what that court charges and tell them if you were arrested as a result of identity theft.",
      "The participant, paid to the municipal court clerk"
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
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "recordSays": [
    [
      "Expunging a city ordinance conviction or diversion",
      "The packet must tell the participant to confirm with the municipal court clerk, before filing, whether that court publishes its own form, what it charges as costs, and how many copies it wants."
    ],
    [
      "Expunging a city ordinance conviction or diversion",
      "The municipal findings are three, not four. K.S.A. 12-4516(h) requires no felony conviction in the past two years with no such proceeding pending or being instituted, that the petitioner's circumstances and behaviour warrant expungement, and that expungement is consistent with the public welfare. There is no firearms-safety finding, because an ordinance conviction is not a felony conviction."
    ],
    [
      "Expunging a city ordinance conviction or diversion",
      "The disclosure carve-outs apply here too. K.S.A. 12-4516(i) tracks the district court effect: the petitioner is treated as not having been arrested, convicted or diverted, subject to an enumerated list of contexts in which the arrest, conviction or diversion must still be disclosed."
    ],
    [
      "Expunging an arrest on a city ordinance charge",
      "The packet must state the identity-theft fee exemption: no fee may be charged to a person who was arrested as a result of being a victim of identity theft under K.S.A. 21-6107 or its predecessor, even though the municipal court may otherwise prescribe a fee as costs."
    ],
    [
      "Expunging an arrest on a city ordinance charge",
      "The packet must say that on filing the petition the official court file is separated from other municipal court records and is disclosed only to a judge, designated court staff, the prosecuting attorney, the arresting agency or others by court order, and that after expungement the records may still be released to a criminal justice agency with a legitimate need."
    ],
    [
      "Expunging an arrest on a city ordinance charge",
      "Where the best-interests-of-justice ground is used, K.S.A. 12-4516a(e) requires the court to determine whether the records should nonetheless remain available for eight enumerated purposes. The packet must say so."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "The city prosecutor opposes the petition.",
    "The municipal court sets a contested evidentiary hearing.",
    "The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516, as Wichita does.",
    "Whether the ordinance violation would also have constituted a listed state offence, which sets the waiting period, is disputed.",
    "The participant is currently required to register under the Kansas Offender Registration Act.",
    "Immigration consequences are in play.",
    "Generation is complete when the packet is produced. Self-help stops when the city prosecutor opposes, the municipal court sets a contested evidentiary hearing, or a factual ground is disputed.",
    "The mistaken-identity or no-probable-cause ground is disputed on the facts.",
    "The participant was convicted or completed a diversion on the ordinance charge, which puts them on the municipal conviction route instead.",
    "The municipal court governs expungement by charter ordinance with terms that differ from K.S.A. 12-4516a."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official KS form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any particular Kansas municipal court accepts a composed petition rather than its own charter-ordinance instrument"
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
      "finding": "The census records that some Kansas cities, including Wichita, govern expungement by charter ordinance and publish their own instrument, and that where they do that instrument governs.",
      "consequence": "The packet states this on the filing instructions page and carries the registry's own required question about it as a required-before-filing item, rather than presenting a composed petition as the only possible paper."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 2 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
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

/* ---- the two names of a route ------------------------------------------------ *
 * ROUTE_LABEL maps the machine route key to the short human label. The label is
 * the only one of the two that is ever PRINTED; the key is the only one that is
 * ever BOUND. Both are emitted in every manifest so the mapping is auditable and
 * a reader never has to guess which page belongs to which key.
 *
 * The refusals below are the guard on that separation. A label that carried a
 * machine key, or that could not be read at a glance, would defeat the point of
 * having one, and a build that printed a label it never declared would be a
 * silent packet change.
 */
const ROUTE_LABEL = Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel]));
for (const route of SPEC.routes) {
  const label = route.routeLabel;
  assert.ok(typeof label === "string" && label.trim().length > 0,
    `${route.routeKey}: declares no human-readable routeLabel, and the packet page prints the label`);
  assert.ok(!label.includes("obligation:"),
    `${route.routeKey}: routeLabel "${label}" carries a machine route key; the label is what a person reads`);
  assert.ok(label.length <= 72,
    `${route.routeKey}: routeLabel is ${label.length} characters and would wrap on the composed page`);
  assert.ok(label === sanitizePdfText(label),
    `${route.routeKey}: routeLabel would be rewritten by the page sanitizer, so the manifest and the page would disagree`);
}
assert.strictEqual(new Set(Object.values(ROUTE_LABEL)).size, SPEC.routes.length,
  "two routes share one label; a reader could not tell the two packets apart");

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
  /* Standard Times is not embedded, so a PDF viewer may substitute glyphs
   * wider than pdf-lib's nominal Times metrics. Wrap against the larger of
   * those metrics and the standard-font 500-unit fallback used when a PDF has
   * no /Widths array. This keeps the visible substitute inside the same
   * 72-point margins without changing the font size or any packet content. */
  const renderedWidth = (text) => Math.max(
    font.widthOfTextAtSize(text, fontSize),
    [...text].length * fontSize * 0.5
  );
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
      if (current && renderedWidth(`${current}${ch}`) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => renderedWidth(w) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (renderedWidth(candidate) <= maxWidth) current = candidate;
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
    for (const renderedPage of pdf.getPages()) {
      renderedPage.drawText(routeFooter, { x: margin, y: 40, size: 9, font, color: rgb(0, 0, 0) });
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
  /* The human label, never the machine key. See ROUTE_LABEL above. */
  const label = ROUTE_LABEL[c.routeKey];
  assert.ok(label, `${componentId}: carries route ${c.routeKey}, for which no label is declared`);
  lines.push("", `Route: ${label}`);
  return lines.join("\n");
}

async function runFocusedRepairSelfTest() {
  const requiredGuidanceIds = [
    "ks-12-4516-municipal-process-guidance-3",
    "ks-12-4516a-municipal-arrest-process-guidance-3"
  ];
  for (const componentId of requiredGuidanceIds) {
    assert.equal(COMPONENT[componentId]?.role, "process_guidance",
      `${componentId}: the authoritative component must exist with role process_guidance`);
  }

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const componentId of COMPONENT_IDS) {
      const routeLine = `Route: ${ROUTE_LABEL[COMPONENT[componentId].routeKey]}`;
      const bytes = await renderComposedPdf(composedBody(componentId, facts), COMPONENT[componentId].title);
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [pageIndex, page] of pdf.getPages().entries()) {
        const lines = groupIntoLines(extractTextItems(page)).map((line) => line.text.trim()).filter(Boolean);
        assert.ok(lines.includes(routeLine),
          `${fixtureName}/${componentId} page ${pageIndex + 1}: route footer is missing`);
        assert.ok(lines.some((line) => line !== routeLine),
          `${fixtureName}/${componentId} page ${pageIndex + 1}: route footer is orphaned`);
      }
    }
  }
  return { familyId: SPEC.familyId, status: "SELF_TEST_PASS", assertions: 4 };
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
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeLabel).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
export async function runFamily(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return runFocusedRepairSelfTest();
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const routeArtifactsOnly = argv.includes("--route-artifacts-only");

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

  for (const fixtureName of routeArtifactsOnly ? [] : ["canonical", "boundary"]) {
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
      documents, components: COMPONENT_IDS,
      role: "family_assembly_of_every_route",
      deliveryRole: SPEC.routes.length === 1
        ? "participant_deliverable"
        : "build_and_review_evidence_only_not_a_participant_deliverable"
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

  /* ---- the per-route artifacts, which are what a participant actually receives ----
   *
   * The unit of delivery is a ROUTE, not a family. The assembly above concatenates
   * every route's components into one packet; on a family carrying more than one
   * statutory route that packet is nobody's deliverable, because it would hand a
   * participant the pages of remedies they did not ask for and cannot use. It is
   * retained as build and review evidence — see deliveryRole on each entry — and
   * it is not a participant deliverable.
   *
   * What a participant receives is the artifact for their own route: only that
   * route's components, in the order this family's own component declarations
   * carry them. The pages are the same pages. Each component is rendered by
   * renderComposedPdf from its own declared body alone, and no composed page
   * carries a packet page number, a running header or any other value that
   * depends on what else sits in the packet — so this is an assembly change and
   * not new packet content.
   */
  const routeSlug = (routeKey) => String(routeKey).split(":")[3];
  for (const c of SPEC.components) {
    assert.ok(SPEC.routes.some((r) => r.routeKey === c.routeKey),
      `${c.id}: carries route ${c.routeKey}, which this family does not declare`);
  }
  const routeArtifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const route of SPEC.routes) {
      const routeComponentIds = SPEC.components.filter((c) => c.routeKey === route.routeKey).map((c) => c.id);
      assert.ok(routeComponentIds.length > 0, `${route.routeKey}: a declared route carries no component`);
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
        const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
        for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
          packet.addPage(p);
          pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
        }
      }

      const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
      const dir = `${OUT}/fixtures/routes/${slug}`;
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      const file = `${dir}/${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), packetBytes);

      /* The same byte proof the family assembly gets, over this route's maps only:
       * every fact this route's components write must be readable back out of the
       * route artifact's own saved bytes. */
      const routeMaps = maps.filter((m) => routeComponentIds.includes(m.formNumber));
      const routeProof = await byteProof(packetBytes, pageManifest, routeMaps, facts, `${fixtureName}/${slug}`);

      routeArtifacts.push({
        routeKey: route.routeKey, routeLabel: route.routeLabel, route: slug, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
        byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
        documents: routeComponentIds, components: routeComponentIds,
        role: "route_packet_of_composed_pleadings",
        deliveryRole: "participant_deliverable_for_this_route_only",
        valuesReadBackFromTheseBytes: routeProof.actualWrites.length,
        rasterPending: true,
        independentVerificationPending: true
      });
    }
  }

  if (routeArtifactsOnly) {
    const renderedArtifactsPath = `${OUT}/reports/rendered-artifacts.json`;
    const renderedArtifacts = JSON.parse(fs.readFileSync(path.join(ROOT, renderedArtifactsPath), "utf8"));
    assert.strictEqual(renderedArtifacts.familyId, SPEC.familyId,
      `${renderedArtifactsPath}: belongs to a different family`);
    assert.strictEqual(renderedArtifacts.routeArtifacts?.length, routeArtifacts.length,
      `${renderedArtifactsPath}: does not declare exactly the four route artifacts this repair rebuilds`);
    renderedArtifacts.routeArtifacts = routeArtifacts;
    writeJson(renderedArtifactsPath, renderedArtifacts);
    return {
      familyId: SPEC.familyId,
      status: "ROUTE_ARTIFACTS_REBUILT",
      routeArtifactHashes: routeArtifacts.map((a) => ({
        fixture: a.fixture,
        route: a.route,
        packetSha256: a.sha256,
        byteLength: a.byteLength,
        pages: a.pageCount
      })),
      familyAssemblyWritten: false,
      metadataWritten: [renderedArtifactsPath],
      productionTouched: false
    };
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
    /* The machine key is what this receipt binds. The label is what the page
     * prints, recorded here so the two are never inferred from one another. */
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    /* Derived, not asserted. Every record in SPEC.records must have resolved
     * exactly — present at its committed path, carrying every anchor statement
     * this build relies on — and its sha256 and byteLength below are the bytes
     * read in THIS run, not a pin carried forward from an earlier one. */
    allSourcesExact: failures.length === 0 && resolved.length === SPEC.records.length,
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
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
    renderStrategy: "composed_pleading",
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
    /* The family assembly. On a family carrying more than one route this is build
     * and review evidence, not something a participant receives; routeArtifacts
     * below carries the deliverables. */
    familyAssemblyIsAParticipantDeliverable: SPEC.routes.length === 1,
    familyAssemblyRole: SPEC.routes.length === 1
      ? "single-route family: the assembly and the route artifact carry the same components"
      : "build and review evidence only — it concatenates every route's components and is not a participant deliverable",
    routeArtifacts,
    routeArtifactRoutes: SPEC.routes.map((r) => r.routeKey),
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
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
    routeArtifactHashes: routeArtifacts.map((a) => ({ fixture: a.fixture, route: a.route, routeKey: a.routeKey, routeLabel: a.routeLabel, packetSha256: a.sha256, pages: a.pageCount })),
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
