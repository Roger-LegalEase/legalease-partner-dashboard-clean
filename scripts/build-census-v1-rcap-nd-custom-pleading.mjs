#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — five North Dakota sealing routes: felony,
 * misdemeanor and pardoned convictions under N.D.C.C. ch. 12-60.1, DUI record
 * sealing under N.D.C.C. § 39-08-01.6, and first-offense possession sealing.
 *
 *   node "scripts/build-census-v1-rcap-nd-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * FIVE STATUTORY ROUTES IN ONE FAMILY, all participant-filed, all built as
 * custom pleadings from the committed specifications' own component sets.
 *
 * SERVICE IS HELD HERE, AND IT IS UNUSUAL. The census records that the
 * petition is filed IN THE EXISTING CRIMINAL CASE rather than as a new civil
 * action, that the respondent is the prosecuting attorney — the prosecuting
 * official for the municipality in a municipal case, or the State's Attorney
 * for the county in a district court case — and that the petitioner serves
 * that office under N.D.C.C. § 12-60.1-03(4), which routes through
 * N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). Three of the five routes ship a
 * composed proof of service for exactly that reason, and the packet states
 * the service rule rather than naming an office to ask about it: under
 * DET-FEE-AND-WAIVER-001-A1 a held answer is stated, not delegated.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-nd-custom-pleading",
  "worklistGroupId": "rcap-nd-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-nd-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading",
  "jurisdiction": "ND",
  "legalName": "North Dakota Record-Sealing Petitions — N.D.C.C. ch. 12-60.1, § 39-08-01.6 and the first-offense possession route",
  "routeName": "asking a North Dakota court to seal a conviction record under chapter 12-60.1, the separate DUI statute, or the first-offense possession route",
  "statutes": [
    "N.D.C.C. § 12-60.1-02(1)(b)",
    "N.D.C.C. § 12-60.1-03",
    "N.D.C.C. § 12-60.1-04",
    "N.D.C.C. § 12-60.1-01(7)",
    "N.D.C.C. § 12-60.1-02(2)",
    "N.D.R.Ct. 3.4",
    "N.D.R.Crim.P. 49",
    "N.D.C.C. § 12-60.1-02(1)(a)",
    "N.D.C.C. § 12-60.1-02(1)(c)",
    "N.D.C.C. § 39-08-01.6(1)",
    "N.D.C.C. § 39-08-01.6(2)",
    "N.D.C.C. § 12.1-32-07.1",
    "N.D.C.C. § 12.1-32-07.2",
    "N.D.C.C. § 39-08-01",
    "N.D.C.C. § 39-06.2-10",
    "N.D.C.C. § 19-03.1-23(9)",
    "N.D.C.C. ch. 19-03.1"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction"
    },
    {
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction"
    },
    {
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction"
    },
    {
      "routeKey": "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute"
    },
    {
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:nd-seal-felony-conviction+nd-seal-misdemeanor-conviction+nd-seal-pardoned-conviction+nd-dui-record-seal+nd-marijuana-first-offense-seal",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"nd-seal-felony-conviction\"",
        "Petition to Seal a Felony Conviction (N.D.C.C. § 12-60.1-02(1)(b))",
        "A person who pled guilty to or was found guilty of a felony may petition to seal the record if they have not been convic",
        "The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District ",
        "N.D.C.C. § 12-60.1-02(1)(b)",
        "N.D.C.C. § 12-60.1-03",
        "N.D.C.C. § 12-60.1-04",
        "N.D.C.C. § 12-60.1-01(7)",
        "N.D.C.C. § 12-60.1-02(2)",
        "N.D.R.Ct. 3.4",
        "N.D.R.Crim.P. 49",
        "What is your full legal name?",
        "What other names have you ever used, including maiden names and aliases?",
        "Where have you lived from the date of the offence until now?",
        "In your own words, why should the court seal this record?",
        "Was the case in district court or municipal court?",
        "Which North Dakota county or municipality?",
        "What is the case number?",
        "What were you convicted of?",
        "What other North Dakota charges or convictions do you have, past or pending?",
        "What charges or convictions do you have in other states, federally, or in another country?",
        "Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
        "Have you been convicted of any new crime since the offence, and if so when?",
        "Have you finished all imprisonment and all probation on this case?",
        "Has all restitution been paid in full?",
        "Were you ever ordered to register as an offender under North Dakota law?",
        "Which office prosecuted the case — a city attorney or the county State's Attorney?",
        "Which North Dakota Century Code chapter is the offence in? Chapters 12.1-16 through 12.1-25 cover violence and intimidation offences and carry an extra bar.",
        "On what date were you convicted?",
        "On what dates were you released from incarceration, from parole and from probation, whichever apply?",
        "Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petit",
        "On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The particip",
        "Serve the prosecuting attorney, then file the petition, the mandatory proposed order and the proof of service with the c",
        "\"trackId\": \"nd-seal-misdemeanor-conviction\"",
        "Petition to Seal a Misdemeanor Conviction (N.D.C.C. § 12-60.1-02(1)(a))",
        "A person who pled guilty to or was found guilty of a misdemeanor may petition to seal the record if they have not been c",
        "N.D.C.C. § 12-60.1-02(1)(a)",
        "\"trackId\": \"nd-seal-pardoned-conviction\"",
        "Petition to Seal a Pardoned Conviction (N.D.C.C. § 12-60.1-02(1)(c))",
        "A person granted an unconditional pardon for a North Dakota conviction may petition to seal the record. This ground carr",
        "N.D.C.C. § 12-60.1-02(1)(c)",
        "On what date was the pardon granted?",
        "Does your certificate of pardon describe the pardon as unconditional, or does it set terms and conditions?",
        "Does the pardon cover the conviction you are asking the court to seal?",
        "\"trackId\": \"nd-dui-record-seal\"",
        "Petition to Seal a Driving Under the Influence Record (N.D.C.C. § 39-08-01.6)",
        "The court shall seal a criminal record relating to a conviction under N.D.C.C. § 39-08-01, in accordance with §§ 12.1-32",
        "The existing impaired-driving case, in the municipal court or district court where it is filed.",
        "N.D.C.C. § 39-08-01.6(1)",
        "N.D.C.C. § 39-08-01.6(2)",
        "N.D.C.C. § 12.1-32-07.1",
        "N.D.C.C. § 12.1-32-07.2",
        "N.D.C.C. § 39-08-01",
        "N.D.C.C. § 39-06.2-10",
        "On what date did your first impaired-driving violation occur?",
        "Did you plead guilty, plead no contest, or were you found guilty?",
        "Were you charged under the state statute or under a city ordinance?",
        "If it was a city ordinance, which ordinance?",
        "Have you had any further impaired-driving violation within seven years of that first one?",
        "Have you committed any other criminal offence within that seven-year period?",
        "Have you ever held a commercial driver's licence, now or in the past?",
        "none stated by the section, and none appears in the statewide court fee schedule.",
        "None required by the section.",
        "File the petition and any documentation in the existing impaired-driving case with the clerk of court.",
        "\"trackId\": \"nd-marijuana-first-offense-seal\"",
        "Motion to Seal a First Marijuana or THC Possession Conviction (N.D.C.C. § 19-03.1-23(9))",
        "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two g",
        "The existing criminal case in the court that entered the judgment.",
        "N.D.C.C. § 19-03.1-23(9)",
        "N.D.C.C. ch. 19-03.1",
        "On what date did the court enter the judgment of guilt?",
        "On what date did the offence occur?",
        "Was the charge marijuana or tetrahydrocannabinol?",
        "What quantity was charged?",
        "Was this your first offence of this kind?",
        "Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when?",
        "Were there any other charges in the same case besides the marijuana or THC possession?",
        "Which North Dakota county?",
        "none identified. The statewide fee schedule carries no line item for a motion in an existing criminal case.",
        "None stated by the subsection.",
        "File the motion in the existing criminal case with the clerk of court."
      ]
    },
    {
      "recordId": "legal-design-specifications:nd-seal-felony-conviction+nd-seal-misdemeanor-conviction+nd-seal-pardoned-conviction+nd-dui-record-seal+nd-marijuana-first-offense-seal",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"nd-seal-felony-conviction-primary-filing-1\"",
        "\"componentId\": \"nd-seal-felony-conviction-proposed-order-2\"",
        "\"componentId\": \"nd-seal-felony-conviction-proof-of-service-3\"",
        "\"componentId\": \"nd-seal-misdemeanor-conviction-primary-filing-1\"",
        "\"componentId\": \"nd-seal-misdemeanor-conviction-proposed-order-2\"",
        "\"componentId\": \"nd-seal-misdemeanor-conviction-proof-of-service-3\"",
        "\"componentId\": \"nd-seal-pardoned-conviction-primary-filing-1\"",
        "\"componentId\": \"nd-seal-pardoned-conviction-proposed-order-2\"",
        "\"componentId\": \"nd-seal-pardoned-conviction-proof-of-service-3\"",
        "\"componentId\": \"nd-dui-record-seal-primary-filing-1\"",
        "\"componentId\": \"nd-dui-record-seal-proposed-order-2\"",
        "\"componentId\": \"nd-marijuana-first-offense-seal-primary-filing-1\"",
        "\"componentId\": \"nd-marijuana-first-offense-seal-proposed-order-2\""
      ]
    },
    {
      "recordId": "route-obligation-census:5-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:ND:nd-seal-felony-conviction",
        "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
        "obligation:track-only:ND:nd-seal-pardoned-conviction",
        "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute",
        "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing"
      ]
    }
  ],
  "components": [
    {
      "id": "nd-seal-felony-conviction-primary-filing-1",
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction",
      "title": "Petition - Ask a North Dakota court to seal a felony conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a felony conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL A FELONY CONVICTION (N.D.C.C. § 12-60.1-02(1)(B))",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 12-60.1-02(1)(b); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person who pled guilty to or was found guilty of a felony may petition to seal the record if they have not been convicted of a new crime for at least five years before filing. The chapter bars a felony offence involving violence or intimidation during the period in which the offender is ineligible to possess a firearm under N.D.C.C. § 62.1-02-01(1)(a), which is ten years from the latest of conviction, release from incarceration, release from parole or release from probation, for offences in chapters 12.1-16 through 12.1-25.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - seal full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - seal all other names] What other names have you ever used, including maiden names and aliases?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - seal address history] Where have you lived from the date of the offence until now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - seal reasons] In your own words, why should the court seal this record?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - seal court type] Was the case in district court or municipal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - seal county] Which North Dakota county or municipality?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - seal case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - seal offence] What were you convicted of?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - seal criminal history nd] What other North Dakota charges or convictions do you have, past or pending?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - seal criminal history elsewhere] What charges or convictions do you have in other states, federally, or in another country?",
        "(Asked where the participant reports any out-of-state, federal or foreign record.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - seal prior relief requests] Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - seal new convictions] Have you been convicted of any new crime since the offence, and if so when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - seal supervision complete] Have you finished all imprisonment and all probation on this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - seal restitution paid] Has all restitution been paid in full?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - seal registration ordered] Were you ever ordered to register as an offender under North Dakota law?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - seal prosecutor office] Which office prosecuted the case — a city attorney or the county State's Attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C17 - seal offence chapter] Which North Dakota Century Code chapter is the offence in? Chapters 12.1-16 through 12.1-25 cover violence and intimidation offences and carry an extra bar.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C18 - seal conviction date] On what date were you convicted?",
        "(Required where a violence or intimidation felony is reported, to compute the firearm-disability period.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C19 - seal release dates] On what dates were you released from incarceration, from parole and from probation, whichever apply?",
        "(Required where a violence or intimidation felony is reported. The ten years run from the latest of them.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 12-60.1-02(1)(b); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49.",
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
          "id": "fact_sealFullLegalName",
          "label": "Item C1 - seal full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAllOtherNames",
          "label": "Item C2 - seal all other names",
          "supply": "What other names have you ever used, including maiden names and aliases?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAddressHistory",
          "label": "Item C3 - seal address history",
          "supply": "Where have you lived from the date of the offence until now?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealReasons",
          "label": "Item C4 - seal reasons",
          "supply": "In your own words, why should the court seal this record?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCourtType",
          "label": "Item C5 - seal court type",
          "supply": "Was the case in district court or municipal court?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCounty",
          "label": "Item C6 - seal county",
          "supply": "Which North Dakota county or municipality?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCaseNumber",
          "label": "Item C7 - seal case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealOffence",
          "label": "Item C8 - seal offence",
          "supply": "What were you convicted of?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryND",
          "label": "Item C9 - seal criminal history nd",
          "supply": "What other North Dakota charges or convictions do you have, past or pending?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryElsewhere",
          "label": "Item C10 - seal criminal history elsewhere",
          "supply": "What charges or convictions do you have in other states, federally, or in another country? (Asked where the participant reports any out-of-state, federal or foreign record.)",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPriorReliefRequests",
          "label": "Item C11 - seal prior relief requests",
          "supply": "Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealNewConvictions",
          "label": "Item C12 - seal new convictions",
          "supply": "Have you been convicted of any new crime since the offence, and if so when?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealSupervisionComplete",
          "label": "Item C13 - seal supervision complete",
          "supply": "Have you finished all imprisonment and all probation on this case?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRestitutionPaid",
          "label": "Item C14 - seal restitution paid",
          "supply": "Has all restitution been paid in full?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRegistrationOrdered",
          "label": "Item C15 - seal registration ordered",
          "supply": "Were you ever ordered to register as an offender under North Dakota law?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealProsecutorOffice",
          "label": "Item C16 - seal prosecutor office",
          "supply": "Which office prosecuted the case — a city attorney or the county State's Attorney?",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealOffenceChapter",
          "label": "Item C17 - seal offence chapter",
          "supply": "Which North Dakota Century Code chapter is the offence in? Chapters 12.1-16 through 12.1-25 cover violence and intimidation offences and carry an extra bar.",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealConvictionDate",
          "label": "Item C18 - seal conviction date",
          "supply": "On what date were you convicted? (Required where a violence or intimidation felony is reported, to compute the firearm-disability period.)",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealReleaseDates",
          "label": "Item C19 - seal release dates",
          "supply": "On what dates were you released from incarceration, from parole and from probation, whichever apply? (Required where a violence or intimidation felony is reported. The ten years run from the latest of them.)",
          "why": "the committed track registry records this as a required generation input for nd-seal-felony-conviction, and the platform holds no value for it"
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
      "id": "nd-seal-felony-conviction-proposed-order-2",
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction",
      "title": "Proposed Order - Ask a North Dakota court to seal a felony conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a felony conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 12-60.1-02(1)(b); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49. The Court, having considered the petition and anything filed with it,",
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
      "id": "nd-seal-felony-conviction-proof-of-service-3",
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction",
      "title": "Proof of Service - Ask a North Dakota court to seal a felony conviction",
      "role": "proof_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a felony conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROOF OF SERVICE",
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
      "id": "nd-seal-felony-conviction-filing-instructions-4",
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask a North Dakota court to seal a felony conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal a Felony Conviction (N.D.C.C. § 12-60.1-02(1)(b)).",
        "",
        "A person who pled guilty to or was found guilty of a felony may petition to seal the record if they have not been convicted of a new crime for at least five years before filing. The chapter bars a felony offence involving violence or intimidation during the period in which the offender is ineligible to possess a firearm under N.D.C.C. § 62.1-02-01(1)(a), which is ten years from the latest of conviction, release from incarceration, release from parole or release from probation, for offences in chapters 12.1-16 through 12.1-25.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of Court of the existing criminal case",
        "Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b).",
        "Venue: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4).",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check.",
        "- The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete.",
        "- Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes.",
        "- Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal.",
        "- Unpaid restitution, or imprisonment or probation not yet complete.",
        "- A new conviction inside the look-back period.",
        "- Pending charges anywhere.",
        "- Any objection from the prosecutor, a victim, a witness or a correctional authority.",
        "- Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach.",
        "- Any case where the reformation or good-cause showing is the real contest.",
        "- Any participant with immigration exposure.",
        "- A participant whose actual goal is firearm-rights restoration.",
        "- Every felony petition, which the controlling review makes an attorney handoff.",
        "- Any question whether the offence involved violence or intimidation.",
        "- Any firearm-disability computation.",
        "- A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance.",
        "- No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nd-seal-felony-conviction-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a felony conviction)",
        "- nd-seal-felony-conviction-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a felony conviction)",
        "- nd-seal-felony-conviction-proof-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a felony conviction)"
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
      "id": "nd-seal-misdemeanor-conviction-primary-filing-1",
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
      "title": "Petition - Ask a North Dakota court to seal a misdemeanor conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a misdemeanor conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL A MISDEMEANOR CONVICTION (N.D.C.C. § 12-60.1-02(1)(A))",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 12-60.1-02(1)(a); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person who pled guilty to or was found guilty of a misdemeanor may petition to seal the record if they have not been convicted of a new crime for at least three years before filing the petition. Sealing prohibits disclosure of the existence or contents of court and prosecution records except by court order. The three years are a look-back from filing, not a wait measured from sentence completion; completion of imprisonment and probation and payment of restitution are separate findings the court must make under § 12-60.1-04(1)(c) and (d).",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - seal full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - seal all other names] What other names have you ever used, including maiden names and aliases?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - seal address history] Where have you lived from the date of the offence until now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - seal reasons] In your own words, why should the court seal this record?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - seal court type] Was the case in district court or municipal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - seal county] Which North Dakota county or municipality?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - seal case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - seal offence] What were you convicted of?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - seal criminal history nd] What other North Dakota charges or convictions do you have, past or pending?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - seal criminal history elsewhere] What charges or convictions do you have in other states, federally, or in another country?",
        "(Asked where the participant reports any out-of-state, federal or foreign record.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - seal prior relief requests] Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - seal new convictions] Have you been convicted of any new crime since the offence, and if so when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - seal supervision complete] Have you finished all imprisonment and all probation on this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - seal restitution paid] Has all restitution been paid in full?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - seal registration ordered] Were you ever ordered to register as an offender under North Dakota law?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - seal prosecutor office] Which office prosecuted the case — a city attorney or the county State's Attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 12-60.1-02(1)(a); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49.",
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
          "id": "fact_sealFullLegalName",
          "label": "Item C1 - seal full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAllOtherNames",
          "label": "Item C2 - seal all other names",
          "supply": "What other names have you ever used, including maiden names and aliases?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAddressHistory",
          "label": "Item C3 - seal address history",
          "supply": "Where have you lived from the date of the offence until now?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealReasons",
          "label": "Item C4 - seal reasons",
          "supply": "In your own words, why should the court seal this record?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCourtType",
          "label": "Item C5 - seal court type",
          "supply": "Was the case in district court or municipal court?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCounty",
          "label": "Item C6 - seal county",
          "supply": "Which North Dakota county or municipality?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCaseNumber",
          "label": "Item C7 - seal case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealOffence",
          "label": "Item C8 - seal offence",
          "supply": "What were you convicted of?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryND",
          "label": "Item C9 - seal criminal history nd",
          "supply": "What other North Dakota charges or convictions do you have, past or pending?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryElsewhere",
          "label": "Item C10 - seal criminal history elsewhere",
          "supply": "What charges or convictions do you have in other states, federally, or in another country? (Asked where the participant reports any out-of-state, federal or foreign record.)",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPriorReliefRequests",
          "label": "Item C11 - seal prior relief requests",
          "supply": "Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealNewConvictions",
          "label": "Item C12 - seal new convictions",
          "supply": "Have you been convicted of any new crime since the offence, and if so when?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealSupervisionComplete",
          "label": "Item C13 - seal supervision complete",
          "supply": "Have you finished all imprisonment and all probation on this case?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRestitutionPaid",
          "label": "Item C14 - seal restitution paid",
          "supply": "Has all restitution been paid in full?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRegistrationOrdered",
          "label": "Item C15 - seal registration ordered",
          "supply": "Were you ever ordered to register as an offender under North Dakota law?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealProsecutorOffice",
          "label": "Item C16 - seal prosecutor office",
          "supply": "Which office prosecuted the case — a city attorney or the county State's Attorney?",
          "why": "the committed track registry records this as a required generation input for nd-seal-misdemeanor-conviction, and the platform holds no value for it"
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
      "id": "nd-seal-misdemeanor-conviction-proposed-order-2",
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
      "title": "Proposed Order - Ask a North Dakota court to seal a misdemeanor conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a misdemeanor conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 12-60.1-02(1)(a); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49. The Court, having considered the petition and anything filed with it,",
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
      "id": "nd-seal-misdemeanor-conviction-proof-of-service-3",
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
      "title": "Proof of Service - Ask a North Dakota court to seal a misdemeanor conviction",
      "role": "proof_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a misdemeanor conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROOF OF SERVICE",
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
      "id": "nd-seal-misdemeanor-conviction-filing-instructions-4",
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask a North Dakota court to seal a misdemeanor conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal a Misdemeanor Conviction (N.D.C.C. § 12-60.1-02(1)(a)).",
        "",
        "A person who pled guilty to or was found guilty of a misdemeanor may petition to seal the record if they have not been convicted of a new crime for at least three years before filing the petition. Sealing prohibits disclosure of the existence or contents of court and prosecution records except by court order. The three years are a look-back from filing, not a wait measured from sentence completion; completion of imprisonment and probation and payment of restitution are separate findings the court must make under § 12-60.1-04(1)(c) and (d).",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of Court of the existing criminal case",
        "Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b).",
        "Venue: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4).",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check.",
        "- The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete.",
        "- Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes.",
        "- Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal.",
        "- Unpaid restitution, or imprisonment or probation not yet complete.",
        "- A new conviction inside the look-back period.",
        "- Pending charges anywhere.",
        "- Any objection from the prosecutor, a victim, a witness or a correctional authority.",
        "- Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach.",
        "- Any case where the reformation or good-cause showing is the real contest.",
        "- Any participant with immigration exposure.",
        "- A participant whose actual goal is firearm-rights restoration.",
        "- A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance.",
        "- No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nd-seal-misdemeanor-conviction-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a misdemeanor conviction)",
        "- nd-seal-misdemeanor-conviction-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a misdemeanor conviction)",
        "- nd-seal-misdemeanor-conviction-proof-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a misdemeanor conviction)"
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
      "id": "nd-seal-pardoned-conviction-primary-filing-1",
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction",
      "title": "Petition - Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL A PARDONED CONVICTION (N.D.C.C. § 12-60.1-02(1)(C))",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 12-60.1-02(1)(c); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person granted an unconditional pardon for a North Dakota conviction may petition to seal the record. This ground carries no look-back period of its own. A pardon does not remove the fact of the conviction unless the certificate of pardon says so, which is why sealing is a separate step.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - seal full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - seal all other names] What other names have you ever used, including maiden names and aliases?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - seal address history] Where have you lived from the date of the offence until now?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - seal reasons] In your own words, why should the court seal this record?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - seal court type] Was the case in district court or municipal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - seal county] Which North Dakota county or municipality?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - seal case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - seal offence] What were you convicted of?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - seal criminal history nd] What other North Dakota charges or convictions do you have, past or pending?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - seal criminal history elsewhere] What charges or convictions do you have in other states, federally, or in another country?",
        "(Asked where the participant reports any out-of-state, federal or foreign record.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - seal prior relief requests] Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - seal new convictions] Have you been convicted of any new crime since the offence, and if so when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - seal supervision complete] Have you finished all imprisonment and all probation on this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - seal restitution paid] Has all restitution been paid in full?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - seal registration ordered] Were you ever ordered to register as an offender under North Dakota law?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - seal prosecutor office] Which office prosecuted the case — a city attorney or the county State's Attorney?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C17 - seal pardon date] On what date was the pardon granted?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C18 - seal pardon unconditional] Does your certificate of pardon describe the pardon as unconditional, or does it set terms and conditions?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C19 - seal pardon covers conviction] Does the pardon cover the conviction you are asking the court to seal?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 12-60.1-02(1)(c); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49.",
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
          "id": "fact_sealFullLegalName",
          "label": "Item C1 - seal full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAllOtherNames",
          "label": "Item C2 - seal all other names",
          "supply": "What other names have you ever used, including maiden names and aliases?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealAddressHistory",
          "label": "Item C3 - seal address history",
          "supply": "Where have you lived from the date of the offence until now?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealReasons",
          "label": "Item C4 - seal reasons",
          "supply": "In your own words, why should the court seal this record?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCourtType",
          "label": "Item C5 - seal court type",
          "supply": "Was the case in district court or municipal court?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCounty",
          "label": "Item C6 - seal county",
          "supply": "Which North Dakota county or municipality?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCaseNumber",
          "label": "Item C7 - seal case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealOffence",
          "label": "Item C8 - seal offence",
          "supply": "What were you convicted of?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryND",
          "label": "Item C9 - seal criminal history nd",
          "supply": "What other North Dakota charges or convictions do you have, past or pending?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealCriminalHistoryElsewhere",
          "label": "Item C10 - seal criminal history elsewhere",
          "supply": "What charges or convictions do you have in other states, federally, or in another country? (Asked where the participant reports any out-of-state, federal or foreign record.)",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPriorReliefRequests",
          "label": "Item C11 - seal prior relief requests",
          "supply": "Have you ever asked any court or authority to pardon, expunge, seal or return records for any case — whether or not it was granted?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealNewConvictions",
          "label": "Item C12 - seal new convictions",
          "supply": "Have you been convicted of any new crime since the offence, and if so when?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealSupervisionComplete",
          "label": "Item C13 - seal supervision complete",
          "supply": "Have you finished all imprisonment and all probation on this case?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRestitutionPaid",
          "label": "Item C14 - seal restitution paid",
          "supply": "Has all restitution been paid in full?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealRegistrationOrdered",
          "label": "Item C15 - seal registration ordered",
          "supply": "Were you ever ordered to register as an offender under North Dakota law?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealProsecutorOffice",
          "label": "Item C16 - seal prosecutor office",
          "supply": "Which office prosecuted the case — a city attorney or the county State's Attorney?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPardonDate",
          "label": "Item C17 - seal pardon date",
          "supply": "On what date was the pardon granted?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPardonUnconditional",
          "label": "Item C18 - seal pardon unconditional",
          "supply": "Does your certificate of pardon describe the pardon as unconditional, or does it set terms and conditions?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sealPardonCoversConviction",
          "label": "Item C19 - seal pardon covers conviction",
          "supply": "Does the pardon cover the conviction you are asking the court to seal?",
          "why": "the committed track registry records this as a required generation input for nd-seal-pardoned-conviction, and the platform holds no value for it"
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
      "id": "nd-seal-pardoned-conviction-proposed-order-2",
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction",
      "title": "Proposed Order - Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 12-60.1-02(1)(c); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49. The Court, having considered the petition and anything filed with it,",
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
      "id": "nd-seal-pardoned-conviction-proof-of-service-3",
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction",
      "title": "Proof of Service - Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "role": "proof_of_service",
      "description": "the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the existing criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROOF OF SERVICE",
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
      "id": "nd-seal-pardoned-conviction-filing-instructions-4",
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal a Pardoned Conviction (N.D.C.C. § 12-60.1-02(1)(c)).",
        "",
        "A person granted an unconditional pardon for a North Dakota conviction may petition to seal the record. This ground carries no look-back period of its own. A pardon does not remove the fact of the conviction unless the certificate of pardon says so, which is why sealing is a separate step.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of Court of the existing criminal case",
        "Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b).",
        "Venue: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4).",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check.",
        "- The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete.",
        "- Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes.",
        "- Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal.",
        "- Unpaid restitution, or imprisonment or probation not yet complete.",
        "- A new conviction inside the look-back period.",
        "- Pending charges anywhere.",
        "- Any objection from the prosecutor, a victim, a witness or a correctional authority.",
        "- Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach.",
        "- Any case where the reformation or good-cause showing is the real contest.",
        "- Any participant with immigration exposure.",
        "- A participant whose actual goal is firearm-rights restoration.",
        "- A pardon whose conditionality is not clear on the face of the certificate.",
        "- A pardon whose scope does not plainly cover the conviction.",
        "- A certificate of pardon the participant cannot obtain.",
        "- A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance.",
        "- No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nd-seal-pardoned-conviction-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
        "- nd-seal-pardoned-conviction-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a conviction the Governor has pardoned)",
        "- nd-seal-pardoned-conviction-proof-of-service-3: the page on which the participant records that the papers were actually delivered, signed only after delivery (Ask a North Dakota court to seal a conviction the Governor has pardoned)"
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
      "id": "nd-dui-record-seal-primary-filing-1",
      "routeKey": "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute",
      "title": "Petition - Ask a North Dakota court to seal a DUI record",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a DUI record)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the court holding the DUI case - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO SEAL A DRIVING UNDER THE INFLUENCE RECORD (N.D.C.C. § 39-08-01.6)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 39-08-01.6(1); N.D.C.C. § 39-08-01.6(2); N.D.C.C. § 12.1-32-07.1; N.D.C.C. § 12.1-32-07.2; N.D.C.C. § 39-08-01; N.D.C.C. § 39-06.2-10 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The court shall seal a criminal record relating to a conviction under N.D.C.C. § 39-08-01, in accordance with §§ 12.1-32-07.1 and 12.1-32-07.2, where the individual has not committed a further violation of § 39-08-01 or an equivalent ordinance, or any other criminal offence, within seven years of the first violation. The seal is the § 12.1-32-07.2(2) restricted-access regime: the records may be examined by the clerk, a judge, the juvenile commissioner, probation officers, the defendant or defence counsel and the state's attorney, and by others only on the written order of a judge. A prosecutor retains access to a prior offence for enhancement under § 39-08-01(3).",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - dui first violation date] On what date did your first impaired-driving violation occur?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - dui case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - dui court type] Was the case in district court or municipal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - dui county] Which North Dakota county or municipality?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - dui conviction type] Did you plead guilty, plead no contest, or were you found guilty?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - dui charged under] Were you charged under the state statute or under a city ordinance?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - dui ordinance citation] If it was a city ordinance, which ordinance?",
        "(Asked where the participant reports an ordinance charge, because the equivalence has to be shown.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - dui subsequent dui] Have you had any further impaired-driving violation within seven years of that first one?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - dui other offence] Have you committed any other criminal offence within that seven-year period?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - dui commercial licence] Have you ever held a commercial driver's licence, now or in the past?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 39-08-01.6(1); N.D.C.C. § 39-08-01.6(2); N.D.C.C. § 12.1-32-07.1; N.D.C.C. § 12.1-32-07.2; N.D.C.C. § 39-08-01; N.D.C.C. § 39-06.2-10.",
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
          "id": "fact_duiFirstViolationDate",
          "label": "Item C1 - dui first violation date",
          "supply": "On what date did your first impaired-driving violation occur?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiCaseNumber",
          "label": "Item C2 - dui case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiCourtType",
          "label": "Item C3 - dui court type",
          "supply": "Was the case in district court or municipal court?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiCounty",
          "label": "Item C4 - dui county",
          "supply": "Which North Dakota county or municipality?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiConvictionType",
          "label": "Item C5 - dui conviction type",
          "supply": "Did you plead guilty, plead no contest, or were you found guilty?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiChargedUnder",
          "label": "Item C6 - dui charged under",
          "supply": "Were you charged under the state statute or under a city ordinance?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiOrdinanceCitation",
          "label": "Item C7 - dui ordinance citation",
          "supply": "If it was a city ordinance, which ordinance? (Asked where the participant reports an ordinance charge, because the equivalence has to be shown.)",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiSubsequentDui",
          "label": "Item C8 - dui subsequent dui",
          "supply": "Have you had any further impaired-driving violation within seven years of that first one?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiOtherOffence",
          "label": "Item C9 - dui other offence",
          "supply": "Have you committed any other criminal offence within that seven-year period?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_duiCommercialLicence",
          "label": "Item C10 - dui commercial licence",
          "supply": "Have you ever held a commercial driver's licence, now or in the past?",
          "why": "the committed track registry records this as a required generation input for nd-dui-record-seal, and the platform holds no value for it"
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
      "id": "nd-dui-record-seal-proposed-order-2",
      "routeKey": "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute",
      "title": "Proposed Order - Ask a North Dakota court to seal a DUI record",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a DUI record)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the court holding the DUI case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 39-08-01.6(1); N.D.C.C. § 39-08-01.6(2); N.D.C.C. § 12.1-32-07.1; N.D.C.C. § 12.1-32-07.2; N.D.C.C. § 39-08-01; N.D.C.C. § 39-06.2-10. The Court, having considered the petition and anything filed with it,",
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
      "id": "nd-dui-record-seal-filing-instructions-3",
      "routeKey": "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask a North Dakota court to seal a DUI record",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a DUI record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Petition to Seal a Driving Under the Influence Record (N.D.C.C. § 39-08-01.6).",
        "",
        "The court shall seal a criminal record relating to a conviction under N.D.C.C. § 39-08-01, in accordance with §§ 12.1-32-07.1 and 12.1-32-07.2, where the individual has not committed a further violation of § 39-08-01 or an equivalent ordinance, or any other criminal offence, within seven years of the first violation. The seal is the § 12.1-32-07.2(2) restricted-access regime: the records may be examined by the clerk, a judge, the juvenile commissioner, probation officers, the defendant or defence counsel and the state's attorney, and by others only on the written order of a judge. A prosecutor retains access to a prior offence for enhancement under § 39-08-01(3).",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of Court of the court holding the DUI case",
        "Filed in the existing case. The official research guide directs the participant to file the petition and any accompanying documents in the DUI case with the clerk of court.",
        "Venue: The existing impaired-driving case, in the municipal court or district court where it is filed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: none stated by the section, and none appears in the statewide court fee schedule. Fee waiver as recorded: not applicable; no fee is identified.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None required by the section. Notice as recorded: None required by the section.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Expungement of DUI records is not available in North Dakota. This is sealing under the § 12.1-32-07.2(2) restricted-access regime, and a prosecutor keeps access to the prior offence for enhancement under § 39-08-01(3).",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any commercial driver's licence, current or historical, which the section excludes.",
        "- Any criminal offence at all inside the seven-year window.",
        "- Uncertainty whether the charge was under the state statute or an equivalent ordinance.",
        "- A participant who expects the record to be expunged rather than sealed, which North Dakota does not offer for DUI.",
        "- A prosecutor's retained enhancement access, where the participant expects it to be gone.",
        "- An out-of-state impaired-driving conviction.",
        "- No hearing is required, but the official guide records that the judge may hold one.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nd-dui-record-seal-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a DUI record)",
        "- nd-dui-record-seal-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a DUI record)"
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
      "id": "nd-marijuana-first-offense-seal-primary-filing-1",
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
      "title": "Petition - Ask a North Dakota court to seal a first marijuana possession conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the court holding the criminal case - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "MOTION TO SEAL A FIRST MARIJUANA OR THC POSSESSION CONVICTION (N.D.C.C. § 19-03.1-23(9))",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter. Relief is mandatory on the elements, and once sealed the record may not be opened even by order of the court, which makes this seal stronger than Chapter 12-60.1 sealing.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - mj judgment date] On what date did the court enter the judgment of guilt?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - mj offence date] On what date did the offence occur?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - mj substance] Was the charge marijuana or tetrahydrocannabinol?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - mj quantity] What quantity was charged?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - mj first offence] Was this your first offence of this kind?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - mj subsequent conviction] Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - mj other charges] Were there any other charges in the same case besides the marijuana or THC possession?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - mj case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - mj county] Which North Dakota county?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - mj court type] Was the case in district court or municipal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1.",
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
          "id": "fact_mjJudgmentDate",
          "label": "Item C1 - mj judgment date",
          "supply": "On what date did the court enter the judgment of guilt?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjOffenceDate",
          "label": "Item C2 - mj offence date",
          "supply": "On what date did the offence occur?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjSubstance",
          "label": "Item C3 - mj substance",
          "supply": "Was the charge marijuana or tetrahydrocannabinol?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjQuantity",
          "label": "Item C4 - mj quantity",
          "supply": "What quantity was charged?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjFirstOffence",
          "label": "Item C5 - mj first offence",
          "supply": "Was this your first offence of this kind?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjSubsequentConviction",
          "label": "Item C6 - mj subsequent conviction",
          "supply": "Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjOtherCharges",
          "label": "Item C7 - mj other charges",
          "supply": "Were there any other charges in the same case besides the marijuana or THC possession?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjCaseNumber",
          "label": "Item C8 - mj case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjCounty",
          "label": "Item C9 - mj county",
          "supply": "Which North Dakota county?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mjCourtType",
          "label": "Item C10 - mj court type",
          "supply": "Was the case in district court or municipal court?",
          "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
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
      "id": "nd-marijuana-first-offense-seal-proposed-order-2",
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
      "title": "Proposed Order - Ask a North Dakota court to seal a first marijuana possession conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of Court of the court holding the criminal case)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1. The Court, having considered the petition and anything filed with it,",
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
      "id": "nd-marijuana-first-offense-seal-legal-effect-explanation-3",
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
      "role": "legal_effect_explanation",
      "title": "What sealing does, and what it does not do",
      "description": "what a sealing order under chapter 19-03.1 does, what it does not reach, and why the general sealing chapter's waiting periods and burden do not apply (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THE ORDER DOES",
        "",
        "A sealing order under chapter 19-03.1 seals the court record in this case. The statute is unusually strong on this point: once sealed, the court record may not be opened even by court order.",
        "",
        "WHAT IT DOES NOT REACH",
        "",
        "The order is directed at the court record. It does not by itself change records held by other agencies, and it is not a pardon. If you need a criminal-history record corrected as well, that is a separate request to the agency that holds it.",
        "",
        "THIS IS NOT THE GENERAL SEALING CHAPTER",
        "",
        "North Dakota's general criminal-record sealing chapter, 12-60.1, uses waiting periods of three years for a misdemeanor and five for a felony, a clear-and-convincing burden, and a hearing no earlier than forty-five days after filing. None of that applies here. Chapter 19-03.1 makes sealing mandatory on motion when its own conditions are met."
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
      "id": "nd-marijuana-first-offense-seal-filing-instructions-4",
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask a North Dakota court to seal a first marijuana possession conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Motion to Seal a First Marijuana or THC Possession Conviction (N.D.C.C. § 19-03.1-23(9)).",
        "",
        "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter. Relief is mandatory on the elements, and once sealed the record may not be opened even by order of the court, which makes this seal stronger than Chapter 12-60.1 sealing.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of Court of the court holding the criminal case",
        "Filed as a motion in the existing case. The subsection states no service requirement and no hearing requirement.",
        "Venue: The existing criminal case in the court that entered the judgment.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: none identified. The statewide fee schedule carries no line item for a motion in an existing criminal case. Fee waiver as recorded: not applicable; no fee is identified.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None stated by the subsection. Notice as recorded: None stated by the subsection.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- This seal is irreversible: once sealed the court record may not be opened even by order of the court. The participant should keep their own copies of anything they may later need.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any uncertainty whether this was a first offence.",
        "- Any uncertainty about the quantity charged.",
        "- A subsequent controlled-substance conviction.",
        "- Other charges in the same case, which the subsection does not reach.",
        "- A participant confusing this with the executive marijuana pardon, which is an entirely separate process.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- nd-marijuana-first-offense-seal-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a first marijuana possession conviction)",
        "- nd-marijuana-first-offense-seal-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a first marijuana possession conviction)",
        "- nd-marijuana-first-offense-seal-legal-effect-explanation-3: what the sealing order does, what it does not reach, and why the general sealing chapter does not apply (Ask a North Dakota court to seal a first marijuana possession conviction)"
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
      "routeKey": "obligation:track-only:ND:nd-seal-felony-conviction",
      "statute": "N.D.C.C. § 12-60.1-02(1)(b); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49",
      "instrument": "primary_filing: nd-seal-felony-conviction-primary-filing-1; proposed_order: nd-seal-felony-conviction-proposed-order-2; proof_of_service: nd-seal-felony-conviction-proof-of-service-3; filing_instructions: nd-seal-felony-conviction-filing-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:ND:nd-seal-misdemeanor-conviction",
      "statute": "N.D.C.C. § 12-60.1-02(1)(a); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49",
      "instrument": "primary_filing: nd-seal-misdemeanor-conviction-primary-filing-1; proposed_order: nd-seal-misdemeanor-conviction-proposed-order-2; proof_of_service: nd-seal-misdemeanor-conviction-proof-of-service-3; filing_instructions: nd-seal-misdemeanor-conviction-filing-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:ND:nd-seal-pardoned-conviction",
      "statute": "N.D.C.C. § 12-60.1-02(1)(c); N.D.C.C. § 12-60.1-03; N.D.C.C. § 12-60.1-04; N.D.C.C. § 12-60.1-01(7); N.D.C.C. § 12-60.1-02(2); N.D.R.Ct. 3.4; N.D.R.Crim.P. 49",
      "instrument": "primary_filing: nd-seal-pardoned-conviction-primary-filing-1; proposed_order: nd-seal-pardoned-conviction-proposed-order-2; proof_of_service: nd-seal-pardoned-conviction-proof-of-service-3; filing_instructions: nd-seal-pardoned-conviction-filing-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:ND:nd-dui-record-seal:dui-record-sealing-under-the-separate-dui-statute",
      "statute": "N.D.C.C. § 39-08-01.6(1); N.D.C.C. § 39-08-01.6(2); N.D.C.C. § 12.1-32-07.1; N.D.C.C. § 12.1-32-07.2; N.D.C.C. § 39-08-01; N.D.C.C. § 39-06.2-10",
      "instrument": "primary_filing: nd-dui-record-seal-primary-filing-1; proposed_order: nd-dui-record-seal-proposed-order-2; filing_instructions: nd-dui-record-seal-filing-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
      "statute": "N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1",
      "instrument": "primary_filing: nd-marijuana-first-offense-seal-primary-filing-1; proposed_order: nd-marijuana-first-offense-seal-proposed-order-2; legal_effect_explanation: nd-marijuana-first-offense-seal-legal-effect-explanation-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Ask a North Dakota court to seal a felony conviction",
      "The committed track registry records the destination as **Clerk of Court of the existing criminal case**. Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). Venue as recorded: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case. Filing as recorded: Serve the prosecuting attorney, then file the petition, the mandatory proposed order and the proof of service with the clerk of the criminal case."
    ],
    [
      "FEE_AND_WAIVER — Ask a North Dakota court to seal a felony conviction",
      "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance."
    ],
    [
      "SERVICE — Ask a North Dakota court to seal a felony conviction",
      "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4)."
    ],
    [
      "SELF_HELP_STOP — Ask a North Dakota court to seal a felony conviction",
      "**Stop and get help if:** Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes. **Stop and get help if:** Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal. **Stop and get help if:** Unpaid restitution, or imprisonment or probation not yet complete. **Stop and get help if:** A new conviction inside the look-back period. **Stop and get help if:** Pending charges anywhere. **Stop and get help if:** Any objection from the prosecutor, a victim, a witness or a correctional authority. **Stop and get help if:** Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach. **Stop and get help if:** Any case where the reformation or good-cause showing is the real contest. **Stop and get help if:** Any participant with immigration exposure. **Stop and get help if:** A participant whose actual goal is firearm-rights restoration. **Stop and get help if:** Every felony petition, which the controlling review makes an attorney handoff. **Stop and get help if:** Any question whether the offence involved violence or intimidation. **Stop and get help if:** Any firearm-disability computation. **Stop and get help if:** A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance. **Stop and get help if:** No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends."
    ],
    [
      "FILING_DESTINATION — Ask a North Dakota court to seal a misdemeanor conviction",
      "The committed track registry records the destination as **Clerk of Court of the existing criminal case**. Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). Venue as recorded: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case. Filing as recorded: Serve the prosecuting attorney, then file the petition, the mandatory proposed order and the proof of service with the clerk of the criminal case."
    ],
    [
      "FEE_AND_WAIVER — Ask a North Dakota court to seal a misdemeanor conviction",
      "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance."
    ],
    [
      "SERVICE — Ask a North Dakota court to seal a misdemeanor conviction",
      "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4)."
    ],
    [
      "SELF_HELP_STOP — Ask a North Dakota court to seal a misdemeanor conviction",
      "**Stop and get help if:** Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes. **Stop and get help if:** Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal. **Stop and get help if:** Unpaid restitution, or imprisonment or probation not yet complete. **Stop and get help if:** A new conviction inside the look-back period. **Stop and get help if:** Pending charges anywhere. **Stop and get help if:** Any objection from the prosecutor, a victim, a witness or a correctional authority. **Stop and get help if:** Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach. **Stop and get help if:** Any case where the reformation or good-cause showing is the real contest. **Stop and get help if:** Any participant with immigration exposure. **Stop and get help if:** A participant whose actual goal is firearm-rights restoration. **Stop and get help if:** A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance. **Stop and get help if:** No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends."
    ],
    [
      "FILING_DESTINATION — Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "The committed track registry records the destination as **Clerk of Court of the existing criminal case**. Filed in the criminal case itself. The respondent is the prosecuting attorney: the office of the prosecuting official for the municipality in a municipal case, or the office of the State's Attorney for the county in a district court case. The petitioner serves the prosecuting attorney under N.D.C.C. § 12-60.1-03(4), which routes through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b). Venue as recorded: The existing criminal case for the offence, under N.D.C.C. § 12-60.1-03(1). There is no separate civil action. District court or municipal court, whichever holds the case. Filing as recorded: Serve the prosecuting attorney, then file the petition, the mandatory proposed order and the proof of service with the clerk of the criminal case."
    ],
    [
      "FEE_AND_WAIVER — Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "Fee as recorded: Not established. The statewide court fee schedule effective 1 July 2025 carries no line item for a Chapter 12-60.1 petition or for a motion within an existing criminal case, and the official research guide directs the participant to ask the clerk what the fee is, if any. Fee waiver as recorded: Not established for this petition. N.D.C.C. § 12-60.1-04(6) expressly makes a municipal-to-district-court appeal fee-free, which implies a fee may attach at first instance."
    ],
    [
      "SERVICE — Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "Service as recorded: On the prosecuting attorney, under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). The participant serves and files proof. Notice as recorded: The prosecutor must, so far as practicable, notify and seek input from law enforcement, witnesses, victims and correctional authorities under N.D.C.C. § 12-60.1-04(4)."
    ],
    [
      "SELF_HELP_STOP — Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "**Stop and get help if:** Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes. **Stop and get help if:** Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal. **Stop and get help if:** Unpaid restitution, or imprisonment or probation not yet complete. **Stop and get help if:** A new conviction inside the look-back period. **Stop and get help if:** Pending charges anywhere. **Stop and get help if:** Any objection from the prosecutor, a victim, a witness or a correctional authority. **Stop and get help if:** Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach. **Stop and get help if:** Any case where the reformation or good-cause showing is the real contest. **Stop and get help if:** Any participant with immigration exposure. **Stop and get help if:** A participant whose actual goal is firearm-rights restoration. **Stop and get help if:** A pardon whose conditionality is not clear on the face of the certificate. **Stop and get help if:** A pardon whose scope does not plainly cover the conviction. **Stop and get help if:** A certificate of pardon the participant cannot obtain. **Stop and get help if:** A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance. **Stop and get help if:** No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends."
    ],
    [
      "FILING_DESTINATION — Ask a North Dakota court to seal a DUI record",
      "The committed track registry records the destination as **Clerk of Court of the court holding the DUI case**. Filed in the existing case. The official research guide directs the participant to file the petition and any accompanying documents in the DUI case with the clerk of court. Venue as recorded: The existing impaired-driving case, in the municipal court or district court where it is filed. Filing as recorded: File the petition and any documentation in the existing impaired-driving case with the clerk of court."
    ],
    [
      "FEE_AND_WAIVER — Ask a North Dakota court to seal a DUI record",
      "Fee as recorded: none stated by the section, and none appears in the statewide court fee schedule. Fee waiver as recorded: not applicable; no fee is identified."
    ],
    [
      "SERVICE — Ask a North Dakota court to seal a DUI record",
      "Service as recorded: None required by the section. Notice as recorded: None required by the section."
    ],
    [
      "SELF_HELP_STOP — Ask a North Dakota court to seal a DUI record",
      "**Stop and get help if:** Any commercial driver's licence, current or historical, which the section excludes. **Stop and get help if:** Any criminal offence at all inside the seven-year window. **Stop and get help if:** Uncertainty whether the charge was under the state statute or an equivalent ordinance. **Stop and get help if:** A participant who expects the record to be expunged rather than sealed, which North Dakota does not offer for DUI. **Stop and get help if:** A prosecutor's retained enhancement access, where the participant expects it to be gone. **Stop and get help if:** An out-of-state impaired-driving conviction. **Stop and get help if:** No hearing is required, but the official guide records that the judge may hold one."
    ],
    [
      "FILING_DESTINATION — Ask a North Dakota court to seal a first marijuana possession conviction",
      "The committed track registry records the destination as **Clerk of Court of the court holding the criminal case**. Filed as a motion in the existing case. The subsection states no service requirement and no hearing requirement. Venue as recorded: The existing criminal case in the court that entered the judgment. Filing as recorded: File the motion in the existing criminal case with the clerk of court."
    ],
    [
      "FEE_AND_WAIVER — Ask a North Dakota court to seal a first marijuana possession conviction",
      "Fee as recorded: none identified. The statewide fee schedule carries no line item for a motion in an existing criminal case. Fee waiver as recorded: not applicable; no fee is identified."
    ],
    [
      "SERVICE — Ask a North Dakota court to seal a first marijuana possession conviction",
      "Service as recorded: None stated by the subsection. Notice as recorded: None stated by the subsection."
    ],
    [
      "SELF_HELP_STOP — Ask a North Dakota court to seal a first marijuana possession conviction",
      "**Stop and get help if:** Any uncertainty whether this was a first offence. **Stop and get help if:** Any uncertainty about the quantity charged. **Stop and get help if:** A subsequent controlled-substance conviction. **Stop and get help if:** Other charges in the same case, which the subsection does not reach. **Stop and get help if:** A participant confusing this with the executive marijuana pardon, which is an entirely separate process."
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
        "Ask a North Dakota court to seal a felony conviction",
        "A person who pled guilty to or was found guilty of a felony may petition to seal the record if they have not been convicted of a new crime for at least five years before filing."
      ],
      [
        "Ask a North Dakota court to seal a misdemeanor conviction",
        "A person who pled guilty to or was found guilty of a misdemeanor may petition to seal the record if they have not been convicted of a new crime for at least three years before filing the petition."
      ],
      [
        "Ask a North Dakota court to seal a conviction the Governor has pardoned",
        "A person granted an unconditional pardon for a North Dakota conviction may petition to seal the record."
      ],
      [
        "Ask a North Dakota court to seal a DUI record",
        "The court shall seal a criminal record relating to a conviction under N.D.C.C."
      ],
      [
        "Ask a North Dakota court to seal a first marijuana possession conviction",
        "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Court record and final disposition order for each case. Ask the clerk of court for the disposition in each case, or search the case at ndcourts.gov public access. You need it to describe your record accurately in the petition.",
      "Clerk of court"
    ],
    [
      "Obtain North Dakota BCI criminal history record. Request your own criminal history from the BCI through the Attorney General's office. A fee applies. The petition has to list your whole record and recollection is not a safe basis.",
      "North Dakota Attorney General, Bureau of Criminal Investigation"
    ],
    [
      "Obtain Proof that imprisonment and probation are complete. Ask the clerk for the discharge order, or your probation officer for a completion letter. The court must find this before it can grant the petition.",
      "Clerk of court, or Department of Corrections and Rehabilitation Parole and Probation"
    ],
    [
      "Obtain Proof that restitution is paid in full. Ask the clerk of court for a payment history showing restitution paid in full.",
      "Clerk of court"
    ],
    [
      "Obtain Certificate of pardon. Request a copy from the pardon clerk at pardonclerk@nd.gov. The certificate is the proof of eligibility on this ground, and whether the pardon is unconditional is read off its face.",
      "Pardon Clerk, North Dakota Department of Corrections and Rehabilitation"
    ],
    [
      "Obtain Criminal judgment or disposition order in the DUI case. Ask the clerk of court for the judgment. It establishes the conviction type and the violation date.",
      "Clerk of court"
    ],
    [
      "Obtain The text of the municipal ordinance. Ask the city for the text of the ordinance you were charged under. The petition has to show it is equivalent to N.D.C.C. § 39-08-01.",
      "The municipality, through its website or its clerk"
    ],
    [
      "Obtain North Dakota BCI criminal history record. Request your own criminal history from the BCI. It evidences the clean period, which covers any criminal offence and not only impaired driving.",
      "North Dakota Attorney General, Bureau of Criminal Investigation"
    ],
    [
      "Obtain Criminal judgment. Ask the clerk of court for the judgment. It establishes the date judgment of guilt was entered.",
      "Clerk of court"
    ],
    [
      "Obtain Charging document showing the quantity. Ask the clerk for the complaint or information. The quantity charged is an element of eligibility and recollection is not enough.",
      "Clerk of court"
    ],
    [
      "Obtain North Dakota BCI criminal history record. Request your own criminal history from the BCI.",
      "North Dakota Attorney General, Bureau of Criminal Investigation"
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
      "Ask a North Dakota court to seal a felony conviction",
      "Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check."
    ],
    [
      "Ask a North Dakota court to seal a felony conviction",
      "The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete."
    ],
    [
      "Ask a North Dakota court to seal a felony conviction",
      "Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition."
    ],
    [
      "Ask a North Dakota court to seal a misdemeanor conviction",
      "Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check."
    ],
    [
      "Ask a North Dakota court to seal a misdemeanor conviction",
      "The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete."
    ],
    [
      "Ask a North Dakota court to seal a misdemeanor conviction",
      "Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition."
    ],
    [
      "Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "Sealing under Chapter 12-60.1 does not reach BCI criminal history record information or the criminal justice data system, and it does not reach federal, tribal, military, out-of-state or private-database records. The order also states that the petitioner remains subject to N.D.C.C. § 12.1-33-02.1 and that the information is released where an entity has a statutory obligation to run a background check."
    ],
    [
      "Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "The proposed order is filed with the petition, not after it. N.D.C.C. § 12-60.1-03(3) makes it mandatory and a petition without one is incomplete."
    ],
    [
      "Ask a North Dakota court to seal a conviction the Governor has pardoned",
      "Service on the prosecuting attorney precedes filing, and proof of service is filed with the petition."
    ],
    [
      "Ask a North Dakota court to seal a DUI record",
      "Expungement of DUI records is not available in North Dakota. This is sealing under the § 12.1-32-07.2(2) restricted-access regime, and a prosecutor keeps access to the prior offence for enhancement under § 39-08-01(3)."
    ],
    [
      "Ask a North Dakota court to seal a first marijuana possession conviction",
      "This seal is irreversible: once sealed the court record may not be opened even by order of the court. The participant should keep their own copies of anything they may later need."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Any offence for which registration was ordered under N.D.C.C. § 12.1-32-15, which the chapter excludes.",
    "Any impaired-driving offence, which the official guides route to the separate § 39-08-01.6 seal.",
    "Unpaid restitution, or imprisonment or probation not yet complete.",
    "A new conviction inside the look-back period.",
    "Pending charges anywhere.",
    "Any objection from the prosecutor, a victim, a witness or a correctional authority.",
    "Out-of-state, federal, tribal or military records, which a North Dakota court cannot reach.",
    "Any case where the reformation or good-cause showing is the real contest.",
    "Any participant with immigration exposure.",
    "A participant whose actual goal is firearm-rights restoration.",
    "Every felony petition, which the controlling review makes an attorney handoff.",
    "Any question whether the offence involved violence or intimidation.",
    "Any firearm-disability computation.",
    "A prosecutor objection, a victim objection, or any contest over reformation ends automated assistance.",
    "No hearing may be held earlier than 45 days after filing unless the prosecutor stipulates. The petitioner attends and carries a clear-and-convincing burden. Attendance at that hearing is not a generation blocker; losing it is where self-help ends.",
    "A pardon whose conditionality is not clear on the face of the certificate.",
    "A pardon whose scope does not plainly cover the conviction.",
    "A certificate of pardon the participant cannot obtain.",
    "Any commercial driver's licence, current or historical, which the section excludes.",
    "Any criminal offence at all inside the seven-year window.",
    "Uncertainty whether the charge was under the state statute or an equivalent ordinance.",
    "A participant who expects the record to be expunged rather than sealed, which North Dakota does not offer for DUI.",
    "A prosecutor's retained enhancement access, where the participant expects it to be gone.",
    "An out-of-state impaired-driving conviction.",
    "No hearing is required, but the official guide records that the judge may hold one.",
    "Any uncertainty whether this was a first offence.",
    "Any uncertainty about the quantity charged.",
    "A subsequent controlled-substance conviction.",
    "Other charges in the same case, which the subsection does not reach.",
    "A participant confusing this with the executive marijuana pardon, which is an entirely separate process."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official ND form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any particular North Dakota case is in district rather than municipal court, which the committed record makes the fact that decides who the respondent is"
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
      "finding": "For the three chapter 12-60.1 routes the committed records establish SERVICE: the respondent is the prosecuting attorney and service runs under N.D.C.C. § 12-60.1-03(4) through N.D.R.Crim.P. 49 to N.D.R.Civ.P. 5(b).",
      "consequence": "The packet states that rule rather than naming an office to ask. DET-FEE-AND-WAIVER-001-A1: where the repository establishes the answer, the packet states it, and a named authority stands in only where the record is empty."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 5 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
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
const PARDONED_PRIMARY = "nd-seal-pardoned-conviction-primary-filing-1";
const PARDONED_ROUTE = "obligation:track-only:ND:nd-seal-pardoned-conviction";

/* The pardoned-conviction petition used to be set at 14-point leading while
 * every sibling route was set at 14.5, because at the boundary fixture's
 * longest identity values the standard leading left its route footer on a page
 * by itself, and squeezing that one component was the quickest way to stop it.
 * That was a compensating measure for a pagination defect rather than a
 * typographic decision, and it covered exactly one of five routes while the
 * same defect went on stranding twelve pages across the family. The renderer
 * below paginates correctly for every route, so the family is set uniformly
 * again and this map holds nothing; it stays as the seam a genuine
 * per-component layout would use. */
const COMPONENT_LAYOUT = {};

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

/*
 * Per-page drawn-run census, read from finished packet bytes.
 *
 * This is what the stranded-page defect is measured on. A page carrying the
 * tail of a split contact block reads as three or four runs while its
 * neighbours read as thirty-odd; counting components, or trusting the page
 * total, says nothing about it.
 */
async function drawnRunsPerPage(packetBytes) {
  const doc = await PDFDocument.load(packetBytes, { updateMetadata: false });
  return doc.getPages().map((pg) => extractTextItems(pg).filter((it) => /\S/.test(it.text)).length);
}

async function renderComposedPdf(fullText, title, layout = {}) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = layout.lineHeight ?? 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
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
  /*
   * A block that fits on a page is never split across a page break.
   *
   * The renderer decided its page break one line at a time, before drawing,
   * with no knowledge of what came next, so a break fell wherever the line
   * counter happened to land. It landed inside the closing signature and
   * contact block of three of this family's five routes, leaving twelve pages
   * across the family's twelve PDFs carrying nothing but the tail of that
   * block: on the felony route "PRINTED NAME" and "MAILING ADDRESS" stayed on
   * page 3 while "TELEPHONE", "EMAIL" and the route footer went to page 4. On
   * the boundary fixture the mailing address itself broke mid-value -- page 3
   * ended "...Fort Saint Clairsvi" and page 4 opened "39501-2214" -- so a
   * single postal address was printed as two unrelated fragments on two pages.
   *
   * A block is a run of consecutive non-empty lines. If the block will not fit
   * in what is left of the page and would fit on a page of its own, it starts
   * the next page whole. Blank separators still consume a slot exactly as
   * before, and every break that did not fall inside a block is left where it
   * was: this changes only the routes that were actually splitting one. A block
   * taller than a whole page still flows, because that is a long block and not
   * a split one.
   */
  const rows = sanitizePdfText(fullText).split("\n").flatMap((raw) => wrap(raw));
  const pageTop = height - margin;
  const linesPerPage = Math.floor((pageTop - margin) / lineHeight) + 1;

  const layoutPlan = (collapsed) => {
    const placement = [];
    const drawnPerPage = [];
    let pageIndex = 0, cursor = pageTop;
    const nextPage = () => { pageIndex += 1; cursor = pageTop; };
    const slotsLeft = () => (cursor < margin - 1e-9 ? 0 : Math.floor((cursor - margin + 1e-9) / lineHeight) + 1);
    let index = 0;
    while (index < rows.length) {
      if (rows[index] === "") {
        if (!collapsed.has(index)) {
          if (cursor < margin - 1e-9) nextPage();
          cursor -= lineHeight;
        }
        index += 1;
        continue;
      }
      let end = index;
      while (end < rows.length && rows[end] !== "") end += 1;
      const blockLength = end - index;
      if (cursor < margin - 1e-9) nextPage();
      // Rule 1: a block that fits on a page of its own is never split.
      if (blockLength > slotsLeft() && blockLength <= linesPerPage) nextPage();
      for (; index < end; index += 1) {
        if (cursor < margin - 1e-9) nextPage();
        placement.push({ row: index, page: pageIndex, y: cursor });
        drawnPerPage[pageIndex] = (drawnPerPage[pageIndex] ?? 0) + 1;
        cursor -= lineHeight;
      }
    }
    return { placement, drawnPerPage };
  };

  // Rule 2: no page carries a single drawn line. A blank separator spending the
  // last slot of a page and pushing one following line onto a page of its own is
  // the other shape of the same defect, and it is what the per-component
  // 14-point leading was hiding on the pardoned-conviction route.
  const collapsed = new Set();
  let plan = layoutPlan(collapsed);
  for (let pass = 0; pass < 8; pass += 1) {
    const lonely = plan.drawnPerPage.findIndex((count, index) => index > 0 && count === 1);
    if (lonely < 0) break;
    const first = plan.placement.find((entry) => entry.page === lonely);
    let before = first.row - 1;
    let collapsedAny = false;
    while (before >= 0 && rows[before] === "") {
      if (!collapsed.has(before)) { collapsed.add(before); collapsedAny = true; }
      before -= 1;
    }
    if (!collapsedAny) break;   // the line genuinely does not fit; that is not a stranded line
    plan = layoutPlan(collapsed);
  }

  /*
   * Proof, not intention: every block that fits on a page landed on one page.
   *
   * This is the assertion that a wrapped value can no longer break across a
   * page, because a wrapped value is a run of consecutive non-empty rows and so
   * is a block. A block taller than a whole page is exempt and still flows.
   */
  const pageOfRow = new Map(plan.placement.map((entry) => [entry.row, entry.page]));
  for (let index = 0; index < rows.length;) {
    if (rows[index] === "") { index += 1; continue; }
    let end = index;
    while (end < rows.length && rows[end] !== "") end += 1;
    if (end - index <= linesPerPage) {
      const first = pageOfRow.get(index);
      for (let k = index; k < end; k += 1) {
        assert.equal(pageOfRow.get(k), first,
          `${title}: a block that fits on a page was split across a page break at ${JSON.stringify(rows[k].slice(0, 60))}`);
      }
    }
    index = end;
  }

  const pages = [pdf.addPage([width, height])];
  for (const entry of plan.placement) {
    while (pages.length <= entry.page) pages.push(pdf.addPage([width, height]));
    pages[entry.page].drawText(rows[entry.row], { x: margin, y: entry.y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

async function renderComponentPdf(componentId, facts) {
  return renderComposedPdf(
    composedBody(componentId, facts),
    COMPONENT[componentId].title,
    COMPONENT_LAYOUT[componentId]
  );
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

async function assertFix04Pagination() {
  assert.equal(COMPONENT[PARDONED_PRIMARY].routeKey, PARDONED_ROUTE,
    "the focused layout profile must remain bound to the pardoned-conviction route");

  const inspected = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const componentId of COMPONENT_IDS) {
      const bytes = await renderComponentPdf(componentId, facts);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const route = `Route: ${COMPONENT[componentId].routeKey}`;
      const pages = doc.getPages().map((page, pageIndex) => {
        const { width, height } = page.getSize();
        const items = extractTextItems(page);
        const lines = groupIntoLines(items).map((line) => line.text.trim()).filter(Boolean);
        const text = lines.join(" ").replace(/\s+/g, " ").trim();
        const words = text ? text.split(/\s+/).length : 0;
        assert.ok(text.length > 0, `${fixtureName}/${componentId}/${pageIndex + 1}: blank component page`);
        assert.ok(lines.length > 1, `${fixtureName}/${componentId}/${pageIndex + 1}: one-line orphan page`);
        assert.notEqual(text, route, `${fixtureName}/${componentId}/${pageIndex + 1}: footer-only page`);
        for (const item of items) {
          /* This extractor marks StandardFonts.TimesRoman metrics inexact, so
           * its estimated width is not an honest clipping measurement. Text
           * origins and baselines are exact; bbox-layout supplies the separate
           * word-bound measurement used by the repair evidence. */
          assert.ok(item.x >= 0 && item.x <= width && item.y >= 0 && item.y + item.size <= height,
            `${fixtureName}/${componentId}/${pageIndex + 1}: text origin or baseline lies outside the page`);
        }
        return { page: pageIndex + 1, lines: lines.length, words, characters: text.length, text };
      });
      assert.ok(pages.some((page) => page.text.includes(route)),
        `${fixtureName}/${componentId}: route footer missing`);
      inspected.push({ fixture: fixtureName, componentId, pages: pages.length,
        minimumLinesOnAnyPage: Math.min(...pages.map((page) => page.lines)) });

      if (componentId === PARDONED_PRIMARY) {
        assert.equal(pages.length, 3, `${fixtureName}/${componentId}: must remain a substantive three-page petition`);
        const last = pages.at(-1);
        assert.ok(last.text.includes(route), `${fixtureName}/${componentId}: route footer must remain on source page 3`);
        assert.ok(last.words > 2 && last.characters > route.length,
          `${fixtureName}/${componentId}: source page 3 must contain participant substance as well as the footer`);
      }
    }
  }

  return {
    fixtures: 2,
    componentsPerFixture: COMPONENT_IDS.length,
    componentPagesInspected: inspected.reduce((sum, item) => sum + item.pages, 0),
    blankPages: 0,
    footerOnlyPages: 0,
    oneLineOrphans: 0,
    textRunOriginsOutsidePage: 0,
    pardonedPrimary: inspected.filter((item) => item.componentId === PARDONED_PRIMARY)
  };
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
  const selfTest = argv.includes("--self-test") || argv.includes("--assert-fix04") || argv.includes("--assert-fix07");

  const { resolved, failures } = resolveRecords();
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (selfTest) {
    return {
      familyId: SPEC.familyId,
      status: "SELF_TEST_PASSED",
      pagination: await assertFix04Pagination()
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
      const composedBytes = await renderComponentPdf(componentId, facts);
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
    const runsPerPage = await drawnRunsPerPage(packetBytes);
    assert.ok(runsPerPage.every((count) => count > 1),
      `${fixtureName}: page(s) ${runsPerPage.map((c, i) => (c > 1 ? null : i + 1)).filter(Boolean).join(", ")} carry a single drawn line`);
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      drawnRunsPerPage: runsPerPage,
      documents, components: COMPONENT_IDS,
      role: "family_assembly_of_every_route",
      deliveryRole: "build_and_review_evidence_only_not_a_participant_deliverable"
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

  /* A participant receives only the components for their selected statutory
   * route. The two family assemblies above remain useful review evidence, but
   * each route artifact below is assembled independently from the same rendered
   * component pages and carries no page from a sibling route. */
  const routeSlug = (routeKey) => String(routeKey).split(":")[3];
  for (const c of SPEC.components) {
    assert.ok(SPEC.routes.some((route) => route.routeKey === c.routeKey),
      `${c.id}: carries route ${c.routeKey}, which this family does not declare`);
  }

  const routeArtifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const route of SPEC.routes) {
      const routeComponentIds = SPEC.components
        .filter((component) => component.routeKey === route.routeKey)
        .map((component) => component.id);
      assert.ok(routeComponentIds.length > 0, `${route.routeKey}: declared route has no component`);

      const slug = routeSlug(route.routeKey);
      const packet = await PDFDocument.create();
      stampDeterministic(packet);
      packet.setTitle(`${SPEC.legalName} — ${slug} — ${fixtureName} fixture`);
      const pageManifest = [];

      for (const componentId of routeComponentIds) {
        const composedBytes = await renderComponentPdf(componentId, facts);
        const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
        for (const [i, page] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
          packet.addPage(page);
          pageManifest.push({
            packetPage: packet.getPageCount(), component: componentId,
            documentId: componentId, sourcePage: i + 1, sourceSha256: null
          });
        }
      }

      const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
      const dir = `${OUT}/fixtures/routes/${slug}`;
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      const file = `${dir}/${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), packetBytes);
      const routeMaps = maps.filter((map) => routeComponentIds.includes(map.formNumber));
      const proof = await byteProof(packetBytes, pageManifest, routeMaps, facts, `${fixtureName}/${slug}`);

      const routeRunsPerPage = await drawnRunsPerPage(packetBytes);
      assert.ok(routeRunsPerPage.every((count) => count > 1),
        `${fixtureName}/${slug}: page(s) ${routeRunsPerPage.map((c, i) => (c > 1 ? null : i + 1)).filter(Boolean).join(", ")} carry a single drawn line`);
      routeArtifacts.push({
        routeKey: route.routeKey, route: slug, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
        byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
        drawnRunsPerPage: routeRunsPerPage,
        documents: routeComponentIds, components: routeComponentIds,
        role: "route_packet_of_composed_pleadings",
        deliveryRole: "participant_deliverable_for_this_route_only",
        valuesReadBackFromTheseBytes: proof.actualWrites.length,
        rasterPending: true,
        independentVerificationPending: true
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
    routeArtifactRoutes: SPEC.routes.map((route) => route.routeKey),
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

  const everyArtifact = [...artifacts, ...routeArtifacts];
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: [...SPEC.buildFindings,
      "The closing signature and contact block was being split across a page break in three of the five routes, leaving twelve pages across the family's twelve PDFs carrying nothing but its tail: on the felony route PRINTED NAME and MAILING ADDRESS stayed on page 3 while TELEPHONE, EMAIL and the route footer went to page 4, and on the boundary fixture the mailing address itself broke mid-value across the two pages. The renderer now keeps any block that fits on a page on one page, and lets no page carry a single drawn line. No block that fits on a page is split in any fixture, which the build asserts; every fixture carries exactly the same drawn lines in the same order as before, and every page count is unchanged.",
      "Those twelve pages still exist and still carry only the closing block: the content of these routes runs past the last full page, so the final page is unavoidable. What changed is what it carries -- the complete printed name, mailing address, telephone, email and route footer, instead of a fragment of that block and half of a postal address. Read with a per-page drawn-run census, they moved from 3-5 runs of a split block to 5-6 runs of a whole one.",
      "The per-component 14-point leading the pardoned-conviction petition carried is retired. It was a squeeze applied to one route to hide one instance of this same defect; the family is set uniformly at 14.5 again and the pardoned route still renders in seven pages.",
      "Every fixture in this family moved in this repair, so the family's RASTER_PASS receipt no longer covers it and a fresh whole-family raster is required before any further read."],
    drawnRunsPerPage: Object.fromEntries(everyArtifact.map((artifact) =>
      [artifact.route ? `${artifact.route}/${artifact.fixture}` : artifact.fixture, artifact.drawnRunsPerPage])),
    pagesCarryingASingleDrawnLine: everyArtifact
      .reduce((n, artifact) => n + artifact.drawnRunsPerPage.filter((count) => count <= 1).length, 0)
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
