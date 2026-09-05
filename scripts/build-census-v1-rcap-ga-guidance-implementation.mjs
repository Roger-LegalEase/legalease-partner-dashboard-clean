#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Georgia retroactive First Offender
 * treatment, O.C.G.A. § 42-8-66: process guidance and the participant's own
 * factual record.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS, AND WHY THIS PACKET
 * CONTAINS NO PETITION AND NOTHING THAT IS FILED
 *
 * The committed process-guidance specification for this track answers the
 * question in its own words, twice:
 *
 *   “Nothing may be filed until the prosecuting attorney's advance consent
 *    is obtained... LegalEase does not obtain consent and does not file.”
 *
 *   “Not reached on this route as currently offered. No participant document
 *    is generated.”
 *
 * And it states what the product IS: identify the candidate, explain the
 * gate, and prepare the participant's factual record. That is the two pages
 * in this packet.
 *
 * THE GATE. The committed route contract makes written prosecutorial consent
 * a condition that must exist BEFORE the individual files, and records that
 * absence is never satisfaction — silence, refusal, an unanswered request
 * and 'no known objection' each leave it unmet. The self-help boundary is
 * recorded as 'always, at the consent stage', because obtaining consent is
 * negotiation with an opposing party.
 *
 * THE ONE OBLIGATION THE REPOSITORY ANSWERS OUTRIGHT. The fee: there shall be
 * no filing fee for a § 42-8-66 petition, per § 42-8-66(h). Under
 * DET-FEE-AND-WAIVER-001-A1 an answer the repository holds is STATED, never
 * delegated to an office to ask, so the packet says it plainly.
 *
 * AND THE GATE THIS BUILD DOES NOT CLOSE. The committed route contract
 * records that the § 42-8-66 PETITION family does not exist yet, that this
 * route does not inherit rcap-ga-guidance-implementation, and that the gate
 * must not be closed by pointing at the guidance family. This build composes
 * guidance under the guidance family's own id, asserts nothing about the
 * petition family, and says so in its receipt.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-ga-guidance-implementation",
  "worklistGroupId": "rcap-ga-guidance-implementation",
  "buildScript": "scripts/build-census-v1-rcap-ga-guidance-implementation.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading",
  "jurisdiction": "GA",
  "legalName": "Georgia retroactive First Offender treatment, O.C.G.A. § 42-8-66 — process guidance and participant factual record",
  "routeName": "understanding the Georgia § 42-8-66 retroactive First Offender route, whose first step is the prosecuting attorney's written consent and not a filing",
  "statutes": [
    "O.C.G.A. § 42-8-66",
    "O.C.G.A. § 42-8-66(h)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-pathway:GA:ga-rfo:retroactive-first-offender-treatment-under-42-8-66"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-specifications:processGuidance#ga-rfo",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed process-guidance specification for this route: that nothing is filed without the prosecuting attorney's advance consent, that no participant document is generated, that the statute prohibits a filing fee, that nothing is served, the required participant inputs, the self-help stop conditions and the named Georgia referral desks",
      "mustContain": [
        "\"trackId\": \"ga-rfo\"",
        "There shall be no filing fee charged for a petition filed pursuant to O.C.G.A. § 42-8-66, per § 42-8-66(h).",
        "Nothing may be filed until the prosecuting attorney's advance consent is obtained. Once it is, the petition is filed in the court in which the individual was convicted. LegalEase does not obtain consent and does not file.",
        "Not reached on this route as currently offered. No participant document is generated.",
        "Not reached. Nothing is served because nothing is filed without consent.",
        "Always, at the consent stage. Obtaining the prosecuting attorney's advance consent is negotiation with an opposing party and is outside self-help.",
        "Where self-help stops, route the participant to a Georgia expungement desk: Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice \\\"The Desk\\\".",
        "Were you actually sentenced under Georgia's First Offender Act in the original case? If you were, this is not your route.",
        "Which court convicted you, in which county, and what is the case number?",
        "On what date were you sentenced?",
        "Which O.C.G.A. Code section were you convicted under?",
        "Had you ever been given First Offender treatment before this case?",
        "Were you told at the time that you could be sentenced as a first offender?",
        "Were you sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less?",
        "Was the case prosecuted by the District Attorney or by the Solicitor-General for that county?",
        "In your own words: what do you remember about the sentencing, and what were you told about your options?"
      ]
    },
    {
      "recordId": "route-contract:GA:retroactive-first-offender-treatment-under-42-8-66",
      "path": "src/lib/legal-authority/routes/national-report-2026-08-28.json",
      "role": "the committed route contract: that written prosecutorial consent is a filing prerequisite rather than the relief, that absence is never satisfaction, that the statute imposes no filing fee, and that this route names its own petition family which the guidance family does not become",
      "mustContain": [
        "\"routeKey\": \"GA:retroactive-first-offender-treatment-under-42-8-66\"",
        "§ 42-8-66 imposes no elapsed wait and no filing fee",
        "Written prosecutorial consent is a filing prerequisite, not the relief itself",
        "A phone call, an unanswered request, prosecutor silence or 'no known objection' is not written consent",
        "A contested evidentiary hearing leaves self-help",
        "this route names its own family, Georgia § 42-8-66 Retroactive First Offender Petition, and does not inherit rcap-ga-guidance-implementation"
      ]
    },
    {
      "recordId": "route-obligation-census:GA-rfo",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this route's exact key and its recorded destination, the prosecuting attorney first and then the convicting court",
      "mustContain": [
        "obligation:track-pathway:GA:ga-rfo:retroactive-first-offender-treatment-under-42-8-66",
        "The prosecuting attorney first, then the convicting court",
        "Consent is sought from the prosecuting attorney before anything is filed."
      ]
    }
  ],
  "components": [
    {
      "id": "ga-rfo-participant-factual-record-1",
      "routeKey": "obligation:track-pathway:GA:ga-rfo:retroactive-first-offender-treatment-under-42-8-66",
      "role": "participant_factual_record",
      "title": "Your factual record for a Georgia § 42-8-66 retroactive First Offender request",
      "description": "the participant's own record of the facts an attorney or legal-aid desk will need; it is not a filing and it goes to no court",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "YOUR FACTUAL RECORD - GEORGIA RETROACTIVE FIRST OFFENDER, O.C.G.A. Sec. 42-8-66",
        "",
        "THIS PAGE IS NOT FILED ANYWHERE. The committed guidance specification records this route's role in one sentence: LegalEase's role is to identify the candidate, explain the gate, and prepare the participant's factual record. This page is that record. It goes to whoever helps you - a lawyer, or one of the expungement desks named in the guidance page - and not to a court.",
        "",
        "Name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "Mailing address: {{participant.street_address}}",
        "Telephone: {{participant.phone}}",
        "Email: {{participant.email}}",
        "",
        "THE FACTS, IN THE COMMITTED RECORD'S OWN WORDS",
        "",
        "[C1 - sentenced under first offender act] Were you actually sentenced under Georgia's First Offender Act in the original case? If you were, this is not your route.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - convicting court and county] Which court convicted you, in which county, and what is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - sentencing date] On what date were you sentenced?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense code section] Which O.C.G.A. Code section were you convicted under?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - first offender ever used] Had you ever been given First Offender treatment before this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - informed of eligibility] Were you told at the time that you could be sentenced as a first offender?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - historical category] Were you sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - prosecuting office that handled the case] Was the case prosecuted by the District Attorney or by the Solicitor-General for that county?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - participant account] In your own words: what do you remember about the sentencing, and what were you told about your options?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(You sign and date your own record. Nothing on this page is signed or dated for you, and nothing on it is filed.)"
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
          "id": "fact_sentencedUnderFirstOffenderAct",
          "label": "Item C1 - sentenced under first offender act",
          "supply": "Were you actually sentenced under Georgia's First Offender Act in the original case? If you were, this is not your route.",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictingCourtAndCounty",
          "label": "Item C2 - convicting court and county",
          "supply": "Which court convicted you, in which county, and what is the case number?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentencingDate",
          "label": "Item C3 - sentencing date",
          "supply": "On what date were you sentenced?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCodeSection",
          "label": "Item C4 - offense code section",
          "supply": "Which O.C.G.A. Code section were you convicted under?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_firstOffenderEverUsed",
          "label": "Item C5 - first offender ever used",
          "supply": "Had you ever been given First Offender treatment before this case?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_informedOfEligibility",
          "label": "Item C6 - informed of eligibility",
          "supply": "Were you told at the time that you could be sentenced as a first offender?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_historicalCategory",
          "label": "Item C7 - historical category",
          "supply": "Were you sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_prosecutingAttorneyOffice",
          "label": "Item C8 - prosecuting office that handled the case",
          "supply": "Was the case prosecuted by the District Attorney or by the Solicitor-General for that county?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_participantAccount",
          "label": "Item C9 - participant account",
          "supply": "In your own words: what do you remember about the sentencing, and what were you told about your options?",
          "why": "the committed guidance specification records this as a required input for this route, and the platform holds no value for it"
        },
        {
          "kind": "protected",
          "id": "record_signature",
          "label": "Signature of the person named in the caption, on the factual record",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "record_signature_date",
          "label": "Date beside the signature on the factual record",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ga-rfo-process-guidance-2",
      "routeKey": "obligation:track-pathway:GA:ga-rfo:retroactive-first-offender-treatment-under-42-8-66",
      "role": "filing_instructions",
      "title": "What the Georgia § 42-8-66 route is, who runs it, and why nothing here is filed",
      "description": "what the process is, who runs it, what you do, what you do NOT do, what it costs, and where to go when self-help stops",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "GEORGIA RETROACTIVE FIRST OFFENDER TREATMENT, O.C.G.A. § 42-8-66",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "**NOTHING IN THIS PACKET IS FILED, AND NO PETITION IS GENERATED.** The committed guidance specification says both in terms: \"Nothing may be filed until the prosecuting attorney's advance consent is obtained. Once it is, the petition is filed in the court in which the individual was convicted. LegalEase does not obtain consent and does not file.\" and \"Not reached on this route as currently offered. No participant document is generated.\"",
        "",
        "What the route is: a petition for retroactive First Offender treatment, exoneration and discharge, which the committed route contract records can convert a conviction into a first-offender discharge.",
        "",
        "What stands in front of it: the prosecuting attorney's ADVANCE WRITTEN CONSENT. The committed route contract records that consent is a condition that must exist BEFORE the individual files, and records that absence is never satisfaction — silence, refusal, an unanswered request and 'no known objection' each leave the precondition unmet.",
        "",
        "What happens if it is granted: the committed guidance records that a grant converts the conviction into a first offender discharge which is not a conviction and makes the record restrictable and sealable, and that the court sends the order to the petitioner, the prosecuting attorney, GCIC and the Department of Driver Services, both of which must modify their records.",
        "",
        "Who runs it: The prosecuting attorney first, then the convicting court. The committed record's own words: consent is sought from the prosecuting attorney before anything is filed; only after consent is obtained may the petition be filed in the convicting court.",
        "",
        "WHAT YOU DO",
        "",
        "- Fill in your factual record — the other page in this packet. The committed guidance records that preparing it is exactly what this route's product is.",
        "- Obtain the sentencing record and plea paperwork from the original case. The committed guidance names the source: the clerk of the convicting court, asking for the sentencing record, the plea transcript or plea paperwork, and the final disposition.",
        "- Take both to a lawyer or to one of the Georgia expungement desks the committed guidance names.",
        "- Check your answers against the sentencing record and correct them if they disagree — the committed guidance records that check as a required step.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- **Do not approach the prosecuting attorney for consent by yourself.** The committed guidance records that obtaining advance consent is negotiation with an opposing party and is outside self-help, and records the handoff as 'always, at the consent stage'.",
        "- **Do not file anything.** The committed guidance records that nothing may be filed until consent is obtained, and that LegalEase does not obtain consent and does not file.",
        "- **Do not treat silence as consent.** The committed route contract records that silence, refusal, an unanswered request and 'no known objection' each leave the precondition unmet.",
        "- **Do not use this route if you were actually sentenced under the First Offender Act already.** The committed guidance's own first question says: if you were, this is not your route.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "**The repository establishes this one, and the answer is that there is no fee.** The committed guidance records it in the statute's own terms: \"There shall be no filing fee charged for a petition filed pursuant to O.C.G.A. § 42-8-66, per § 42-8-66(h).\" The committed route contract records the same thing — § 42-8-66 imposes no elapsed wait and no filing fee. No fee waiver is needed, and the committed guidance says so: none needed, the statute prohibits a filing fee.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "**Nothing is served.** The committed guidance records: \"Not reached. Nothing is served because nothing is filed without consent.\" What the committed record does record about notice is that the prosecuting attorney's consent must be obtained before filing, that it is a threshold requirement to file rather than a notice provision, and that prosecutor silence is not consent.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- **Always, at the consent stage. Obtaining the prosecuting attorney's advance consent is negotiation with an opposing party and is outside self-help.**",
        "- the prosecuting attorney declines or does not respond — the committed guidance records that silence is not consent;",
        "- the eligibility claim turns on what you were or were not told at the original sentencing, which the committed guidance records as requiring assessment of the sentencing record;",
        "- the court requires a contested evidentiary hearing, which the committed route contract records as advocacy rather than document preparation;",
        "- any immigration consequence is in play.",
        "",
        "WHERE TO GO WHEN SELF-HELP STOPS",
        "",
        "Where self-help stops, route the participant to a Georgia expungement desk: Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice \"The Desk\".",
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
  "composedFromNote": "the committed process-guidance specification (data/record-clearing/legal-design-specifications.json, processGuidanceSpecs#ga-rfo), the committed route contract (src/lib/legal-authority/routes/national-report-2026-08-28.json, GA:retroactive-first-offender-treatment-under-42-8-66) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route, and no petition is composed here — the committed guidance specification records that no participant document is generated on this route as currently offered, and the committed route contract records that the § 42-8-66 petition family DOES NOT EXIST YET and that this guidance family must not be used to close that gate. This packet composes the participant's factual record and a process-guidance page, which is what the committed record describes.",
  "routeSelectionNote": "One route and one deliverable, and the deliverable is not a filing. The committed route contract records that this route names its own petition family and does not inherit rcap-ga-guidance-implementation, and that no completed-output approval from this guidance family may be carried into a petition. Nothing here is an election for the participant to make.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:track-pathway:GA:ga-rfo:retroactive-first-offender-treatment-under-42-8-66",
      "statute": "O.C.G.A. § 42-8-66",
      "instrument": "process guidance and the participant's own factual record — no petition, because the committed record generates none on this route",
      "statedOn": "both composed pages, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**The participant does not file this, and neither does the platform.** The committed guidance specification records: “Nothing may be filed until the prosecuting attorney's advance consent is obtained. Once it is, the petition is filed in the court in which the individual was convicted. LegalEase does not obtain consent and does not file.” The committed census records the destination as the prosecuting attorney first, then the convicting court, and records that consent is sought from the prosecuting attorney before anything is filed. So the destination of the route is the convicting court; the destination of anything the participant does FIRST is the prosecuting attorney's office, and the committed record puts that step outside self-help."
    ],
    [
      "FEE_AND_WAIVER",
      "**The repository establishes this one, and it is a no-fee answer, not a delegation.** “There shall be no filing fee charged for a petition filed pursuant to O.C.G.A. § 42-8-66, per § 42-8-66(h).” The committed route contract records the same: § 42-8-66 imposes no elapsed wait and no filing fee. The committed guidance records the waiver question as answered by that: none needed, the statute prohibits a filing fee."
    ],
    [
      "SERVICE",
      "**Nothing is served, because nothing is filed.** The committed guidance records: “Not reached. Nothing is served because nothing is filed without consent.” It records the consent requirement as a threshold requirement to file rather than a notice provision, and records that prosecutor silence is not consent. On a grant, the committed guidance records that the court sends the order to the petitioner, the prosecuting attorney, GCIC and the Department of Driver Services, both of which must modify their records — which is distribution by the court, not service by the participant."
    ],
    [
      "SELF_HELP_STOP",
      "**Always, at the consent stage. Obtaining the prosecuting attorney's advance consent is negotiation with an opposing party and is outside self-help.** **Stop and get help if:** the prosecuting attorney declines or does not respond — silence is not consent. **Stop and get help if:** the eligibility claim turns on what you were or were not told at the original sentencing. **Stop and get help if:** the court requires a contested evidentiary hearing, which the committed route contract records as advocacy rather than document preparation. **Stop and get help if:** any immigration consequence is in play. Where self-help stops, route the participant to a Georgia expungement desk: Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice \"The Desk\"."
    ]
  ],
  "instructionsIntro": [
    "**This packet contains no petition and nothing that gets filed, and that is what the committed record requires.** The committed guidance specification for this route records that nothing may be filed until the prosecuting attorney's advance consent is obtained, that LegalEase does not obtain consent and does not file, and that no participant document is generated on this route as currently offered.",
    "What this packet is: the two things the committed record does describe — your own factual record, and a page explaining the gate. The committed guidance puts it plainly: LegalEase's role is to identify the candidate, explain the gate, and prepare the participant's factual record.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Everything about your own case belongs to the court record, so each item is a labelled dotted blank listed below."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The committed guidance specification",
      "Nothing may be filed until the prosecuting attorney's advance consent is obtained. Once it is, the petition is filed in the court in which the individual was convicted. LegalEase does not obtain consent and does not file."
    ],
    [
      "The committed guidance specification",
      "Not reached on this route as currently offered. No participant document is generated."
    ],
    [
      "The committed guidance specification",
      "The guidance must say that there is no filing fee for a § 42-8-66 petition, that a grant converts the conviction into a first offender discharge which is not a conviction and makes the record restrictable and sealable, and that the court sends the order to the petitioner, the prosecuting attorney, GCIC and the Department of Driver Services, both of which must modify their records."
    ],
    [
      "The committed route contract",
      "Written prosecutorial consent is a filing prerequisite, not the relief itself. A phone call, an unanswered request, prosecutor silence or 'no known objection' is not written consent."
    ],
    [
      "The committed route contract",
      "A contested evidentiary hearing leaves self-help."
    ]
  ],
  "documentsToObtain": [
    [
      "The sentencing record and plea paperwork from the original case — the sentencing record, the plea transcript or plea paperwork, and the final disposition",
      "the clerk of the convicting court"
    ],
    [
      "Your own Georgia criminal history report, where you rely on it or the court expects it",
      "most Georgia sheriff's offices and police departments, or GCIC"
    ]
  ],
  "steps": [
    "**Answer the first question honestly: were you actually sentenced under Georgia's First Offender Act already?** The committed guidance says that if you were, this is not your route.",
    "**Fill in your factual record**, the other page in this packet.",
    "**Ask the clerk of the convicting court for the sentencing record, the plea transcript or plea paperwork, and the final disposition.**",
    "**Check your answers against those documents and correct them if they disagree.** The committed guidance records that check as a required step.",
    "**Take both pages to a lawyer or to one of the Georgia expungement desks named on the guidance page.** Do not approach the prosecuting attorney yourself: the committed guidance puts that step outside self-help, always.",
    "**Do not file anything.** The committed record says nothing is filed until written consent exists, and that this platform neither obtains consent nor files."
  ],
  "deliberatelyBlank": [
    "**Your signing line, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.",
    "**Any court caption.** There is none, because nothing here is filed in a court.",
    "**Anything that would be the prosecuting attorney's written consent.** The committed record makes that a document that must exist before a filing, and it is not something this or any packet can produce."
  ],
  "notTold": [
    "**What the sentencing record, the plea paperwork or a Georgia criminal history report costs.** None is a filing fee, and no committed record this packet binds states any of them. The clerk of the convicting court answers the first two; the committed guidance records that a Georgia criminal history record can be obtained from most sheriff's offices or police departments, with requirements varying by agency.",
    "**Whether any particular prosecuting attorney will consent.** The committed record makes that their decision, and records that this platform does not obtain consent."
  ],
  "stopConditions": [
    "Always, at the consent stage. Obtaining the prosecuting attorney's advance consent is negotiation with an opposing party and is outside self-help.",
    "the prosecuting attorney declines or does not respond — silence is not consent;",
    "the eligibility claim turns on what you were or were not told at the original sentencing;",
    "the court requires a contested evidentiary hearing;",
    "any immigration consequence is in play.",
    "Where self-help stops, route the participant to a Georgia expungement desk: Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice \"The Desk\"."
  ],
  "whatThisIsNot": "This is process guidance and your own factual record. It is NOT a petition: the committed guidance specification records that no participant document is generated on this route as currently offered, and the committed route contract records that the § 42-8-66 petition family does not yet exist and that this guidance family must not be used to close that gate. It is not legal advice, nothing here is filed, and nothing here obtains a prosecuting attorney's consent.",
  "receiptDoesNotEstablish": [
    "that any Georgia conviction is eligible for retroactive First Offender treatment",
    "that any prosecuting attorney will give written consent — the committed record makes consent a precondition that must exist before filing, and this packet neither seeks it nor supplies it",
    "that the § 42-8-66 PETITION family exists — the committed route contract records that it does not, and that this guidance family must not be used to close that gate"
  ],
  "buildFindings": [
    {
      "finding": "The committed guidance specification records that nothing may be filed until the prosecuting attorney's advance consent is obtained, that LegalEase does not obtain consent and does not file, and that no participant document is generated on this route as currently offered.",
      "consequence": "No petition was composed. The packet is the participant's own factual record plus a guidance page, which is what the committed record describes as this route's product: identify the candidate, explain the gate, prepare the factual record."
    },
    {
      "finding": "The committed route contract records that this route names its own petition family, does not inherit rcap-ga-guidance-implementation, and that the § 42-8-66 petition family DOES NOT EXIST YET — with a gate that must not be closed by pointing at the guidance family.",
      "consequence": "This build composes guidance under the guidance family's own id and asserts nothing about the petition family. Nothing here is offered as the petition, and the receipt says so."
    },
    {
      "finding": "The fee answer is HELD, and it is a no-fee answer: 'There shall be no filing fee charged for a petition filed pursuant to O.C.G.A. § 42-8-66, per § 42-8-66(h).'",
      "consequence": "The packet states it rather than naming an office to ask. DET-FEE-AND-WAIVER-001-A1: where the repository establishes the answer, the packet states it, and delegating would substitute a question for an answer the record already has."
    },
    {
      "finding": "The committed guidance names four specific Georgia referral desks by name.",
      "consequence": "All four are carried to the participant. A self-help stop that names nowhere to go is a stop that leaves the participant stuck."
    }
  ],
  "counselQuestions": [
    "This family ships process guidance and a factual record and NO petition, on the ground that the committed guidance specification records that no participant document is generated on this route as currently offered. Confirm.",
    "The committed route contract records that the § 42-8-66 petition family does not exist and must not be closed by pointing at this guidance family. This build asserts nothing about the petition family. Confirm that this guidance family may be built without touching that gate."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "THIS FAMILY SHIPS NO PETITION AND NOTHING THAT IS FILED. Its MASTER_QUEUE implementationStrategy is custom_pleading, which describes how the pages are produced rather than requiring that the output be a pleading.",
    "The committed route contract's delivery gates record that the § 42-8-66 PETITION family does not exist and must not be closed by pointing at this guidance family. This build does not close it and does not claim to."
  ],
  "documentsHeading": "Documents you must obtain before anyone can act — nothing here is filed, by you or by the platform"
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
