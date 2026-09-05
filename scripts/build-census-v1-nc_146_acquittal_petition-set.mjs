#!/usr/bin/env node
/**
 * PF-B official-form packet family — North Carolina, expunction of a charge
 * disposed of by a finding of NOT GUILTY or NOT RESPONSIBLE, G.S. 15A-146(a2).
 *
 *   node scripts/build-census-v1-nc_146_acquittal_petition-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-pathway:NC:nc_146_acquittal_petition:dismissal-and-not-guilty-expunction-under-g-s-15a-146
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family. Two documents, both bound by exact SHA-256
 * and delivered as the Administrative Office of the Courts publishes them:
 *
 *   * AOC-CR-288 (Rev. 3/25) — the Petition and Order of Expunction under
 *     G.S. 15A-146(a2). Side One is the petition; Side Two is FINDINGS OF
 *     FACT, the ORDER and the CERTIFICATION BY CLERK, none of which this
 *     packet touches.
 *   * AOC-CR-288 instructions — the AOC's own instruction sheet, delivered
 *     unmodified.
 *
 * NO FEE-WAIVER FORM IS CARRIED, AND THAT IS THE RECORD'S ANSWER
 *
 * The committed packet-set manifest for this exact set records the fee as
 * "none for a true acquittal" and the waiver as "none needed, because no
 * filing fee applies to a true acquittal". A packet that shipped an indigency
 * affidavit here would be inventing a cost the record says does not exist.
 * The dismissal family next door does carry AOC-CV-226, because its own
 * manifest records a $175.00 fee on one branch; this one does not.
 *
 * THE MIS-WRITE THIS BUILD REFUSES BY NAME
 *
 * AOC-CR-288's identifier row prints five captions in one strip — Date Of
 * Birth, Full Social Security No., Age At Time Of Offense — and the shared
 * caption capture reads them one blank to the left. The consequence is not
 * cosmetic: the capture hands the field NAMED `SNN`, which is the FULL SOCIAL
 * SECURITY NUMBER blank, the caption "Date Of Birth", and the shared semantics
 * then bind the participant's date of birth to it and write it there. A date
 * of birth printed in the box a clerk reads as a Social Security number is a
 * false statement on the face of a petition.
 *
 * So `SNN` is declared UNWRITABLE by role. The refusal is the finding, it is
 * reported in build-findings.json rather than left for a verifier to
 * rediscover, and the same capture defect is why ZipCode, DLNo, DLState, Race,
 * Sex, DOB and Age are all left to the participant with the true reason stated
 * rather than a pretence that the platform lacks the facts.
 *
 * THE OFFENCE TABLE IS DELIBERATELY EMPTY, AND THAT IS THE FINDING
 *
 * Side One's table repeats six columns eleven times: File No.(s), Date Of
 * Arrest, Offense Description, Date Of Offense, Disposition, Date Of
 * Disposition. Five of the six are case facts no held record establishes for
 * any particular participant, and the sixth — the file number — is held only
 * as the caption's single case number, which is not the same thing as the
 * per-charge file numbers this table asks for. Writing one column and leaving
 * five would produce exactly the defect the completeness contract exists to
 * catch: a row that carries written cells beside required cells left blank,
 * which reads as finished and is not.
 *
 * So the whole table is left to the participant, every column of row one is
 * declared required-before-filing and disclosed, and rows two through eleven
 * are the form's own continuation rows.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "nc_146_acquittal_petition-set";

/* The six columns of Side One's offence table, stated once because the table is
 * the substance of this family's largest disclosure. */
const TABLE_COLUMNS = [
  ["Fileno", "File No.(s)", "the file number of the charge you were found not guilty of, exactly as the clerk's record prints it"],
  ["ArrestDate", "Date Of Arrest", "the date you were arrested on that charge"],
  ["Description", "Offense Description", "the offence description, copied from the clerk's record"],
  ["DOOF", "Date Of Offense", "the date of the offence itself"],
  ["Disposition", "Disposition", "how the charge ended - a finding of not guilty, or a finding of not responsible"],
  ["DispositionDate", "Date Of Disposition", "the date the finding was entered - check it against your SBI record or the clerk's file before you write it"]
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-nc_146_acquittal_petition-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill",
  jurisdiction: "NC",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition and Order of Expunction Under G.S. 15A-146(a2) (Not Guilty or Not Responsible)",
  routeName: "expunging a North Carolina charge that was disposed of by a finding of not guilty or not responsible, under G.S. 15A-146(a2)",
  statutes: ["G.S. 15A-146", "G.S. 15A-146(a2)", "G.S. 15A-146(a6)", "G.S. 15A-146(c)", "G.S. 15A-150", "G.S. 15A-153"],
  /*
   * The route this family serves, named as the canonical route universe names
   * it.
   *
   * This declared `obligation:track-only:NC:nc_146_acquittal_petition`, which
   * is not a route: the canonical universe carries no such key. A track-only
   * obligation is the shape a legal track takes when it has NO mapped runtime
   * pathway -- the sibling dismissal track really does have
   * `obligation:track-only:NC:nc_146_dismissal_petition` for that reason -- but
   * `track:NC:nc_146_acquittal_petition` maps to the runtime pathway
   * `pathway:NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146`, so its
   * one canonical obligation is the track-pathway edge between them. That is
   * the key every record outside this builder already used, including this
   * family's own product-wiring, so the family was contradicting itself.
   *
   * Nothing about the packet changes. The route is the same route, under the
   * same statutes, for the same participant; only the key that names it was
   * wrong, and no route was opened, closed or re-scoped by correcting it.
   */
  routes: [{ routeKey: "obligation:track-pathway:NC:nc_146_acquittal_petition:dismissal-and-not-guilty-expunction-under-g-s-15a-146" }],

  records: [
    {
      recordId: "packet-set-manifest:nc_146_acquittal_petition-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Under DETERMINATION_FEE_AND_WAIVER_"
        + "STANDARD amendment A2 its participantActionRequired entries are a held source, and here they settle "
        + "the filing destination, the fee, the waiver, the service position, and the records the participant "
        + "must obtain and keep",
      mustContain: [
        "File the AOC-approved form with the clerk of superior court in the county where the charge was brought. G.S. 15A-146(c) requires any petition under this section to be on a form approved by the Administrative Office of the Courts.",
        "none for a true acquittal. The costs of expunging the records required under G.S. 15A-150 are not taxed against the petitioner.",
        "none needed, because no filing fee applies to a true acquittal.",
        "none required by the AOC form.",
        "Obtain Copies of the charging documents and judgments. Obtain and keep permanent copies before filing. After an expunction, access to these records is restricted and you may be unable to obtain them if you later need to prove what actually happened.",
        "Applies where the district attorney petitions rather than the participant. G.S. 15A-146 permits either."
      ]
    },
    {
      recordId: "track-registry:nc_146_acquittal_petition",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry entry for this track. It settles the venue and the "
        + "destination this packet states, and it is the source of the stop conditions the packet carries "
        + "word for word",
      mustContain: [
        "Superior Court of the county where the charge was brought.",
        "Clerk of superior court, county where the charge was brought",
        "Any case where related charges have not all reached final disposition.",
        "Anyone who may later need G.S. 15A-145.4 or 15A-145.6 relief, because sequencing matters."
      ]
    }
  ],

  officialComponents: {
    petition: {
      sourceId: "official-form:AOC-CR-288",
      documentId: "AOC-CR-288",
      formNumber: "AOC-CR-288",
      officialTitle: "Petition and Order of Expunction Under G.S. 15A-146(a2) (Not Guilty Or Not Responsible)",
      revision: "REV-2025-03",
      instrumentKind: "primary_filing",
      sha256: "776210116d1ee07a2a53aab41cd3f0a51e382fd3c6f5a7bba9798fc667246a08",
      acroform: true,
      captionOnly: false,
      explicitMappings: {},
      unwritable: [
        { field: "SNN", class: "government_identifier_reached_by_a_miscaptured_caption",
          why: "The field NAMED SNN is Side One's FULL SOCIAL SECURITY NO. blank. The shared caption capture reads this crowded identifier strip one blank to the left and hands it the printed caption \"Date Of Birth\", so the shared semantics bind participant.date_of_birth to it and write a date of birth into the box a clerk reads as a Social Security number. Refused by role. The participant's date of birth is not written anywhere in this packet, and the DOB blank beside it is declared required-before-filing with the true reason stated." },
        { field: "MailAddr", class: "address_continuation_line",
          why: "The second printed line of the petitioner's address block. The platform holds one street address and writes it on line one; filling both would print the same street address twice on the face of the petition." }
      ]
    },
    instructions: {
      sourceId: "official-form:AOC-CR-288-INSTRUCTIONS",
      documentId: "AOC-CR-288-INSTRUCTIONS",
      formNumber: "AOC-CR-288-INSTRUCTIONS",
      officialTitle: "Instructions for Petition and Order of Expunction Under G.S. 15A-146(a2) (Not Guilty Or Not Responsible)",
      revision: "REV-2025-03",
      instrumentKind: "instructions",
      sha256: "19f5aa4b45457a811c5b38ededee861af36d1088a3ef7380f00f5d1b277a0ade",
      acroform: false
    }
  },

  officialCells: {},

  components: ["petition", "instructions"],
  componentTitles: {
    petition: "AOC-CR-288 - Petition and Order of Expunction (Not Guilty or Not Responsible)",
    instructions: "AOC-CR-288 - The Administrative Office of the Courts' own instructions"
  },
  componentConditions: {},
  componentDescriptions: {
    petition: "the AOC-approved petition. Side One is yours; Side Two is the court's findings, order and the clerk's certification",
    instructions: "the AOC's own instruction sheet for this form, delivered exactly as published and unmarked"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.street_address": "42 Larkspur Street",
      "participant.city": "Raleigh",
      "participant.state": "NC",
      "matter.case_number": "19CR001184",
      "matter.county": "Wake"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.street_address": "1188 Upper Yadkin River Crossing Road, Apartment 14B",
      "participant.city": "Winston-Salem",
      "participant.state": "NC",
      "matter.case_number": "2004CR000000118844-A",
      "matter.county": "New Hanover"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "Both documents are the North Carolina Administrative Office of the Courts' own published forms, bound by "
    + "exact SHA-256 through the committed corpus index and delivered as the AOC issues them. G.S. 15A-146(c) "
    + "requires a petition under this section to be on a form approved by the AOC, so substituting or composing "
    + "one would make the filing refusable on its face; nothing here is composed, substituted or invented. "
    + "AOC-CR-288 replaced AOC-CR-264 for G.S. 15A-146(a2) petitions and says so on its own face.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: AOC-CR-288 is the AOC's form for a G.S. 15A-146(a2) petition on a "
    + "finding of not guilty or not responsible, and its own title says so. Within that route the form carries "
    + "four elections and none of them is one this route decides. The District / Superior division boxes follow "
    + "the court the charge was brought in. The civil-revocation box in paragraph 4 is a fact about the "
    + "participant's own driving record. The AOC-CR-285 attachment box depends on how many agencies and charges "
    + "they have. And the Petitioner / Petitioner's Attorney boxes in the signature block are the participant's "
    + "own election about who signs. Nothing is marked, and every box is recorded as the participant's own.",

  routeSelectionsMade: [
    {
      selection: "instrument set",
      value: "AOC-CR-288 with the AOC's own instructions, and no fee-waiver form",
      determinedBy:
        "the committed packet-set manifest's components, its file entry — G.S. 15A-146(c) requires any petition "
        + "under this section to be on a form approved by the Administrative Office of the Courts — and its "
        + "apply_fee_waiver entry, which records that none is needed because no filing fee applies to a true "
        + "acquittal"
    },
    {
      selection: "statutory subsection",
      value: "G.S. 15A-146(a2), a finding of not guilty or not responsible",
      determinedBy:
        "the committed track registry entry nc_146_acquittal_petition, which records that this is a separate "
        + "track from the dismissal petition because it is a different subsection with a different official "
        + "form, and that using AOC-CR-287 for an acquittal is a rejection risk"
    }
  ],

  instructionsHeading: "Filing instructions — expunging a North Carolina charge you were found not guilty of (G.S. 15A-146(a2))",

  instructionsIntro: [
    "This packet is the Administrative Office of the Courts' own **AOC-CR-288, Petition and Order of Expunction Under G.S. 15A-146(a2) (Not Guilty Or Not Responsible)**, together with the AOC's own instruction sheet for that form. G.S. 15A-146(c) requires a petition under this section to be on a form the AOC has approved, which is why nothing here is a composed document.",
    "**This is the acquittal form, and it is not the dismissal form.** The committed track record for this route says in terms that this is a separate track from a dismissal petition because it is a different subsection with a different official form, and that using AOC-CR-287 for an acquittal is a rejection risk. If your charge was dismissed rather than tried and found not guilty, this is the wrong form.",
    "**Side One of AOC-CR-288 is yours. Side Two is not.** Side Two carries the court's FINDINGS OF FACT, the ORDER and the CERTIFICATION BY CLERK; this packet writes nothing anywhere on it, and neither should you.",
    "The platform filled what it holds and nothing else: your name, your street address, your city and your state in the petitioner block on Side One, the county in the caption, and the file number in the caption's File No. box.",
    "**The offence table on Side One is deliberately left entirely to you, and it is worth knowing why.** The table has six columns — File No.(s), Date Of Arrest, Offense Description, Date Of Offense, Disposition, Date Of Disposition. Five of the six are facts about your own case that no record the platform holds establishes, and the sixth is a per-charge file number rather than the single case number in the caption. Filling one column and leaving five would give you a row that looks finished and is not, which is worse than an empty one. So the row is yours, all six columns of it are listed below, and you copy each from the clerk's record.",
    "**One blank on Side One is left empty for a reason you should know about.** The row that prints Date Of Birth, Full Social Security No. and Age At Time Of Offense side by side is read one blank out of step by the shared rules, and the blank the form calls Full Social Security No. would have received a date of birth. This build refuses that write outright. Your date of birth, your Social Security number and your age at the time of the offence are all yours to write, and none of them appears anywhere in this packet."
  ],

  whoDecides: [
    "**The court decides, on your petition, and the clerk certifies first.** You file Side One with the clerk of superior court; the clerk completes the CERTIFICATION BY CLERK on Side Two; a judge makes the findings and signs the order.",
    "**You may not be the only person who can petition.** The committed packet-set manifest records that G.S. 15A-146 permits either the petitioner or the district attorney to petition, and that where the district attorney petitions instead, the form is AOC-CR-296 rather than this one. That form is not in this packet. If the district attorney has told you they will petition, ask the clerk whether you should file this one as well.",
    "**The clerk sends the order out, not you.** The form's own NOTE TO PETITIONER says the clerk of superior court will send a copy of the granted order to the agencies you list — and says in terms that **the clerk will not provide addresses for you**, which is why the agency blocks are yours to complete.",
    "**Some agencies are notified automatically and must NOT be listed.** The same note says: do not list the courts, the State Bureau of Investigation, the Department of Adult Correction, or the Division of Motor Vehicles. Do not list any private entity either — a private entity required to expunge records is notified by the State or local agencies that distribute criminal justice information to it.",
    "**Keep the clerk's office informed of your address.** Side Two's NOTE TO PETITIONER says that if the petition is granted the clerk sends the certified copy to the address on Side One, that you must notify the clerk in writing if you move, and that after the case is expunged the clerk will have no record of it and cannot give you documentation of it — including the expunction order itself, which is destroyed with the case file."
  ],

  filingDestination: [
    "**File with the clerk of superior court in the county where the charge was brought.** That is the committed packet-set manifest's instruction for this packet, and the committed track record names the same office. You do not have to work venue out for yourself.",
    "**Check the county the platform wrote into the caption against the county the charge was brought in.** They should be the same; if they are not, the caption is wrong and must be corrected before you file.",
    "**The District / Superior division boxes in the caption are yours.** They follow the court the charge was brought in, and the clerk's office of that county can confirm which applies to your case."
  ],

  feeAndWaiver: [
    "**There is no filing fee.** The committed packet-set manifest states it for this packet: \"none for a true acquittal.\"",
    "**There is no waiver form in this packet, and none is missing.** The same record says: \"none needed, because no filing fee applies to a true acquittal.\" The dismissal petition next door carries an indigency affidavit because its own record puts a $175.00 fee on one branch of it. This route has no such branch.",
    "**A separate cost is expressly not yours.** The manifest records that the costs of expunging the records required under G.S. 15A-150 are not taxed against the petitioner. That is the cost of carrying the order out, and it is not charged to you.",
    "**If the clerk asks you for money anyway**, that is a question about that office's own practice: **ask the clerk of superior court of the county where the charge was brought**, who is the office that assesses it, before you pay."
  ],

  service: [
    "**Nobody is served on this route.** The committed packet-set manifest records it in terms: \"none required by the AOC form.\" There is no certificate of service on AOC-CR-288 and none is needed.",
    "**The distribution after the order is the clerk's.** You do not serve or deliver the granted order on any agency; the clerk sends it to the agencies you listed on Side One, and to the SBI, the Department of Adult Correction, the Division of Motor Vehicles and the AOC, which you must not list."
  ],

  documentsToObtain: [
    ["Copies of the charging documents and any judgments — obtain and KEEP them permanently before you file", "the clerk of superior court in the county where the charge was brought. The committed manifest warns that after an expunction access to these records is restricted and you may be unable to obtain them if you later need to prove what actually happened"],
    ["A right-to-review copy of your own North Carolina criminal history, to confirm the finding and to check whether the case has already cleared automatically", "the North Carolina Department of Public Safety, State Bureau of Investigation"],
    ["The court file or a certified copy of the disposition, if you need to confirm the file number, the offence description or the date the finding was entered", "the clerk of superior court in the county where the charge was brought"],
    ["The name and full mailing address of the arresting agency, and of every other State or local government agency that holds a record of your case", "each agency itself. The form's own note says the clerk will not provide addresses for you"]
  ],

  steps: [
    "**Obtain and keep permanent copies of everything about the case before you file.** This is the step people skip and cannot undo: after an expunction, access to those records is restricted and the clerk will have no record of the case.",
    "**Check the date the finding was entered against your SBI record or the clerk's file.** The committed manifest asks you to confirm that answer before filing, and to correct the packet if the two disagree.",
    "**Tick District or Superior in the caption**, following the court the charge was brought in.",
    "**Complete the offence table on Side One, all six columns of the row.** File No.(s), Date Of Arrest, Offense Description, Date Of Offense, Disposition, Date Of Disposition, copied from the clerk's record. If more than one charge was disposed of by a finding of not guilty or not responsible, use a further row for each.",
    "**Write your ZIP code, your driver's licence number and state, your race, your sex, your date of birth, your Social Security number and your age at the time of the offence yourself** — see the table below for exactly which blank each goes in, and read the note about the Full Social Security No. blank before you write in it.",
    "**List the arresting agency and every other State or local agency with a record of the case, with complete addresses.** Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity.",
    "**If there are more agencies or more charges than the form has room for, attach AOC-CR-285** and tick the box on Side One that says you have — the form provides for it. That attachment is not in this packet.",
    "**Tick the paragraph 4 civil-revocation box only if a civil revocation of your driver's licence resulted from the offence you are seeking to expunge.**",
    "**Tick Petitioner or Petitioner's Attorney in the signature block**, then sign and date the petition and print your name beside it.",
    "**File Side One with the clerk of superior court in the county where the charge was brought.** Write nothing on Side Two.",
    "**Tell the clerk in writing if you move**, so the certified copy of the granted order reaches you."
  ],

  deliberatelyBlank: [
    "**Everything on Side Two of AOC-CR-288.** The FINDINGS OF FACT, the ORDER, the presiding judge's name, signature and date, and the CERTIFICATION BY CLERK all belong to the court and the clerk.",
    "**The whole offence table on Side One**, for the reason set out above: one of its six columns could be reached and five could not, and a part-filled row reads as finished when it is not.",
    "**The Full Social Security No. blank, refused by this build by name.** The shared caption capture reads Side One's identifier strip one blank out of step and would have written your date of birth into it. Nothing is written there, and the blank is yours.",
    "**Every agency name and address.** The form's own note makes these the petitioner's, and says the clerk will not provide addresses for you.",
    "**Your ZIP code, your driver's licence number and state, your race, your sex, your date of birth and your age at the time of the offence.** Government identifiers and personal descriptors this build does not write onto any form, on a row the shared rules cannot read reliably in any case.",
    "**The petitioner's-attorney block.** No representation fact is held for you, and this build never writes participant data into a block the court reads as counsel's.",
    "**The Scan No.(s) box in the caption.** The clerk of superior court assigns it when the petition is received.",
    "**Every signature, every date beside one, and every printed name in a signature block.**"
  ],

  notTold: [
    "**The name and mailing address of any agency that holds a record of your case.** No held record establishes them, and the form's own note says the clerk will not provide them either. Each agency publishes its own address; the clerk of superior court of the county where the charge was brought can tell you which agencies are likely to hold a record.",
    "**Whether the district attorney intends to petition instead of you** on AOC-CR-296. Ask the district attorney's office for the county where the charge was brought.",
    "**Whether the case has already cleared automatically.** An SBI right-to-review copy of your own record is how you find out.",
    "**Whether every related charge has reached final disposition.** Paragraph 3 of the petition certifies that it has, and the committed track record names a case where they have not as a point where self-help stops. The clerk's file for the case is what answers it."
  ],

  stopConditions: [
    "any case where related charges have not all reached final disposition — the committed track record names it as a point where self-help stops, and paragraph 3 of the petition certifies the opposite;",
    "anyone who may later need G.S. 15A-145.4 or G.S. 15A-145.6 relief, because sequencing matters — the committed track record names it in those words, and filing this petition first can spend relief a later petition would have needed;",
    "any immigration matter — the committed track record names it, and it is the case where losing access to the underlying records hurts most;",
    "what you want expunged was DISMISSED rather than disposed of by a finding of not guilty or not responsible — that is G.S. 15A-146(a) or (a1) on AOC-CR-287, and using this form for it is a rejection risk in the other direction;",
    "the charge is an out-of-state or federal one — the committed track record records that this relief reaches North Carolina records only;",
    "you may need these records later to prove what happened and have not yet obtained and kept permanent copies of everything."
  ],

  whatThisIsNot:
    "This is a prepared set of official North Carolina Administrative Office of the Courts forms, delivered as "
    + "the AOC publishes them. It is not legal advice, it is not filed for you, and it does not decide whether "
    + "your charge can be expunged under G.S. 15A-146(a2). It is not AOC-CR-287, the petition for a dismissed "
    + "charge; it is not AOC-CR-296, the district attorney's petition on this subsection; and it is not "
    + "AOC-CR-285, the continuation sheet for extra agencies or charges.",

  receiptDoesNotEstablish: [
    "that these are the current official editions of either AOC form, or that neither has been superseded since the archive was assembled",
    "that any particular North Carolina charge was disposed of by a finding of not guilty or not responsible",
    "that every charge related to any particular case has reached final disposition"
  ],

  buildFindings: [
    {
      finding:
        "ROUTE IDENTITY CORRECTED. This family built and stamped its outputs with "
        + "obligation:track-only:NC:nc_146_acquittal_petition, which names no route: the canonical route "
        + "universe at data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json "
        + "carries no such key. A track-only obligation is what a legal track gets when it has no mapped "
        + "runtime pathway, and the sibling dismissal track legitimately has one for that reason; "
        + "track:NC:nc_146_acquittal_petition maps to pathway:NC:dismissal-and-not-guilty-expunction-under-"
        + "g-s-15a-146, so its single canonical obligation is the track-pathway edge "
        + "obligation:track-pathway:NC:nc_146_acquittal_petition:dismissal-and-not-guilty-expunction-under-"
        + "g-s-15a-146. Every record outside this builder already used that key, this family's own "
        + "product-wiring.json included, so the family contradicted itself. The declared key is now the "
        + "canonical one and the wrong key appears nowhere in the family. Both fixture PDFs are byte-identical: "
        + "the route key was never drawn into their bytes, so this correction moved no packet page and no "
        + "raster receipt.",
      whatThisIsNot:
        "This is not a route change. The same route, the same statutes and the same participant are served; "
        + "only the key that names the route was wrong. No route was opened, closed, re-scoped or promoted, "
        + "and no commercial authority follows from it."
    },
    {
      finding:
        "PROTECTED MIS-WRITE REFUSED BY NAME. AOC-CR-288's identifier strip prints Date Of Birth, Full Social "
        + "Security No. and Age At Time Of Offense in one run, and captureWidgetContext reads it one blank out "
        + "of step: the field named SNN — the FULL SOCIAL SECURITY NUMBER blank — is captured with the caption "
        + "\"Date Of Birth\", the field named DOB is captured with the run \"Date Of BirthFull Social Security "
        + "No.Age At T i m e   O f   O ú e n s e\", and the field named Age is captured with \"Full Social "
        + "Security No\". Run against the shared semantics with no refusal supplied, the finalizer WRITES "
        + "participant.date_of_birth into SNN.",
      consequence:
        "SNN is declared unwritable by role, so nothing is written there. A date of birth printed in the box a "
        + "clerk reads as a Social Security number is a false statement on the face of a petition, and it is "
        + "the exact defect the protectedWrites counter exists for. Reported for the lane that owns "
        + "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs; this lane may not change a shared host that "
        + "137 builders sit on."
    },
    {
      finding:
        "THE SAME CAPTURE DEFECT, without the mis-write, on six neighbouring blanks. ZipCode is captured as "
        + "\"Race\", DLNo and DLState as \"Drivers License No.StateRaceSex\", Race as \"State\", Sex as "
        + "\"Age\", and Age as \"Full Social Security No\". Each is refused rather than mis-written, which is "
        + "safe, but each is refused for the wrong reason.",
      consequence:
        "All are declared required-before-filing with the TRUE reason stated to the participant — the capture "
        + "is out of step on this row — rather than presented as facts the platform lacks. The platform does "
        + "hold the ZIP code in its fact set; it is written nowhere in this packet, so no blank hides a fact "
        + "the packet demonstrably holds."
    },
    {
      finding:
        "THE OFFENCE TABLE. Side One's table is six columns by eleven rows. Of row one, only File No.(s) could "
        + "be reached at all, and only by re-using the caption's single case number, which is not what a "
        + "per-charge file number column asks for.",
      consequence:
        "The entire table is left to the participant. Row one's six columns are declared required-before-filing "
        + "and disclosed with the record each is copied from; rows two through eleven are the form's own "
        + "continuation rows and are classified as optional participant content. No cell is written, so no row "
        + "carries written cells beside blank required ones."
    },
    {
      finding:
        "MailAddr, the second line of the petitioner's address block, binds participant.street_address exactly "
        + "as StreetAddr does.",
      consequence:
        "Refused by role. The platform holds one street address and writes it once; filling both would print "
        + "the same street address twice on the face of the petition."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against A1-A4. The committed packet-set manifest is a held source under A2 and "
        + "answers this route's fee question with a figure of none: \"none for a true acquittal\", and "
        + "\"none needed, because no filing fee applies to a true acquittal\" for the waiver.",
      consequence:
        "The packet states both, states separately that G.S. 15A-150 expunction costs are not taxed against "
        + "the petitioner, and carries no indigency affidavit — because carrying one would imply a cost the "
        + "held record says does not exist. It also names the office to ask if the clerk seeks money anyway."
    },
    {
      finding:
        "SERVICE is a does-not-apply on this route: the manifest records \"none required by the AOC form.\" "
        + "AOC-CR-288 carries no certificate of service.",
      consequence:
        "The packet states it, and states what the clerk does with the granted order instead, so a participant "
        + "is not left believing they must deliver it."
    },
    {
      finding:
        "The packet-set manifest carries two components this build does NOT render as documents: a "
        + "participant_instructions component with outputStrategy process_guidance, and a "
        + "district_attorney_alternative_filing component naming AOC-CR-296, conditional on the district "
        + "attorney petitioning instead.",
      consequence:
        "participant-instructions.md is the first; the second is covered in prose and named as a form this "
        + "packet does not contain, because a document mapped and not rendered is a missing companion form. "
        + "AOC-CR-296 is not bound by this family and no source for it is held."
    },
    {
      finding:
        "SOURCE RESOLUTION. Both of this family's documents appear TWICE in the committed corpus index at the "
        + "same SHA-256 — once under the master_library custody and once under d_source_packs — and this "
        + "container mounts only the first.",
      consequence:
        "This build resolves an index entry by preferring one whose bytes are present AND hash to the pinned "
        + "digest, rather than taking the first entry that carries the hash. The binding is still exact "
        + "SHA-256 and the receipt records which custody supplied the bytes."
    }
  ],

  counselQuestions: [
    "Side One's offence table ships empty because five of its six columns are case facts no held record establishes. Confirm that an empty table with all six columns disclosed is preferable to a one-of-six row built from the caption's case number.",
    "The petition's ZIP, licence, race, sex, date-of-birth, Social Security and age blanks are left to the participant because of a caption-capture defect, not because the platform lacks the facts. Confirm that disclosing the true reason to the participant is right.",
    "No fee-waiver form is carried, on the strength of the committed manifest's \"none needed, because no filing fee applies to a true acquittal\". Confirm that omitting it — rather than carrying it conditionally as the dismissal family does — is right for this route.",
    "The packet names AOC-CR-296 and AOC-CR-285 as forms the participant may need and does not contain. Confirm that naming without carrying is the right treatment for both.",
    "The AOC instruction sheet is delivered unmodified as a packet component. Confirm that redistributing the AOC's own instructions inside a prepared packet is appropriate."
  ],

  reviewersAttention: [
    "The Full Social Security No. blank (field SNN) is refused BY NAME because the shared semantics would otherwise write a date of birth into it. Please check on the raster that it is empty.",
    "The offence table on Side One is EMPTY BY DECISION, not by omission. build-findings.json records why.",
    "Side Two of AOC-CR-288 is deliberately untouched in full. Please check on the raster that nothing has landed in the FINDINGS OF FACT, the ORDER or the CERTIFICATION BY CLERK.",
    "This family carries no indigency affidavit, and that is the committed manifest's answer rather than an omission."
  ],

  composedBody() {
    throw new Error("this family composes no pages: every component is an official AOC form");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "petition") {
      writes.push(
        h.write("NamePetitioner", "Name Of Petitioner (type or print full name)", "participant.full_legal_name", 1),
        h.write("StreetAddr", "Address Of Petitioner - street line", "participant.street_address", 1),
        h.write("City", "Address Of Petitioner - City", "participant.city", 1),
        h.write("State", "Address Of Petitioner - State", "participant.state", 1),
        h.write("County", "County named in the caption of the petition", "matter.county", 1),
        h.write("ConsJdgmntFileNum", "File No. in the caption of the petition", "matter.case_number", 1)
      );

      refusals.push(
        // ---- the caption
        h.agencyBlank("ScanNumbers", "Scan No.(s) in the caption",
          "assigned by the clerk of superior court when the petition is received", 1),
        h.election("District", "Caption - District Court division",
          "which division the charge was brought in is a fact about the participant's own case; the route covers both", 1),
        h.election("Superior", "Caption - Superior Court division",
          "the other half of the same election", 1),

        // ---- the petitioner block
        h.optional("MailAddr", "Address Of Petitioner - second street line",
          "used only if your address needs a second line; the platform holds one street address and writes it on the first", 1),
        h.rbf("ZipCode", "Address Of Petitioner - Zip",
          "your ZIP code",
          "the shared caption capture reads this crowded row one blank out of step and returns the printed word \"Race\" for this blank, so the shared semantics refuse it as a protected personal descriptor; the refusal withholds rather than mis-writes, but the reason is wrong and the participant is told so", 1),
        h.rbf("DLNo", "Drivers License No.",
          "your driver's licence number, from the licence itself",
          "the shared semantics refuse a government identifier on any form, and on this row the caption capture is out of step in any case", 1),
        h.rbf("DLState", "Drivers License State",
          "the state that issued your driver's licence",
          "part of the same government-identifier block, on the same out-of-step row", 1),
        h.rbf("Race", "Race",
          "your race, as the form asks",
          "the platform does not hold or write a race fact", 1),
        h.rbf("Sex", "Sex",
          "your sex, as the form asks",
          "the platform does not hold or write a sex fact", 1),
        h.rbf("DOB", "Date Of Birth on the petition",
          "your date of birth. It is written nowhere in this packet",
          "the caption capture returns the whole run \"Date Of BirthFull Social Security No.Age At Time Of Offense\" for this blank, so the shared semantics refuse it as a government identifier; the fact is held and the refusal is a capture defect", 1),
        h.rbf("SNN", "Full Social Security No.",
          "your Social Security number, as the form asks. Check twice that what you write here is a Social Security number and not a date of birth: this is the blank the shared rules would have got wrong",
          "REFUSED BY NAME. The caption capture hands this blank the caption \"Date Of Birth\" and the shared semantics would write a date of birth into the Social Security number box; this build declares the field unwritable so that nothing is written there at all", 1),
        h.rbf("Age", "Age At Time Of Offense",
          "your age when the offence happened",
          "an age at a past date is computed from an offence date the platform does not hold for this matter, and the caption capture is out of step on this row", 1),

        // ---- the petitioner's attorney block
        h.attorneyBlank("NameAtty", "Name Of Petitioner's Attorney For Expunction Petition",
          "completed only where an attorney files the petition for you", 1),
        h.attorneyBlank("StAddrAtty", "Address Of Petitioner's Attorney - street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("MailAddrAtty", "Address Of Petitioner's Attorney - second street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("CityAtty", "Address Of Petitioner's Attorney - City",
          "part of the same attorney block", 1),
        h.attorneyBlank("StateAtty", "Address Of Petitioner's Attorney - State",
          "part of the same attorney block", 1),
        h.attorneyBlank("ZipCodeAtty", "Address Of Petitioner's Attorney - Zip",
          "part of the same attorney block", 1),

        // ---- the attachment box
        h.election("CkBox_Attchmt", "Box indicating additional agencies and/or additional file nos. and offenses are listed on an attached AOC-CR-285",
          "whether a continuation sheet is attached depends on how many agencies and charges the participant has, which the platform does not know; AOC-CR-285 is not in this packet", 1),

        // ---- paragraph 4 and the signature block
        h.election("SeekingExpunge15A-146Cbx", "Paragraph 4 - there is a civil revocation record that resulted from the offence(s) I am seeking to expunge",
          "whether a civil revocation of the participant's licence resulted is a fact about their own driving record", 1),
        h.election("PetitionerCbx", "Signature block - the signer is the Petitioner",
          "who signs is the participant's own election between signing personally and signing by counsel", 1),
        h.election("PetitionerAttorneyCbx", "Signature block - the signer is the Petitioner's Attorney",
          "the other half of the same election", 1),
        h.protectedBlank("PetitionNotFiledSignDate", "Date beside the petitioner's signature",
          "a date written before the petition is signed would be false", 1),
        h.protectedBlank("PetitionNotFiledSignName", "Name (type or print) beside the petitioner's signature",
          "the printed name that accompanies a signature is part of the signature block and is made when the petition is signed", 1),

        // ---- Side Two, entire. The court's and the clerk's, without exception.
        h.agencyBlank("PetitionerNotConvictedFelonyMisdemeanorCbx", "FINDINGS OF FACT 3 - the court finds all related charges have reached final disposition",
          "a finding of fact is the court's", 2),
        h.agencyBlank("PetitionerIsEligibleCbx", "FINDINGS OF FACT 5 - the court finds the petitioner is eligible",
          "the decision is the court's", 2),
        h.agencyBlank("PetitionerIsNotEligibleCbx", "FINDINGS OF FACT 5 - the court finds the petitioner is not eligible",
          "the decision is the court's", 2),
        h.agencyBlank("PetitionerIsEligibleBecauseText1", "FINDINGS OF FACT 5 - the court's reason, first line",
          "the court states its own reason", 2),
        h.agencyBlank("PetitionerIsEligibleBecauseText2", "FINDINGS OF FACT 5 - the court's reason, continued",
          "the court states its own reason", 2),
        h.agencyBlank("PetitionGrantedCbx", "ORDER - the petition is granted",
          "the order is the court's", 2),
        h.agencyBlank("PetitionDeniedCbx", "ORDER - the petition is denied",
          "the order is the court's", 2),
        h.agencyBlank("PresidingJudgeOrderSignName", "ORDER - Name Of Presiding Judge (type or print)",
          "the presiding judge's own block", 2),
        h.protectedBlank("PresidingJudgeOrderSignDate", "ORDER - date beside the presiding judge's signature",
          "the court dates its own order", 2),
        h.agencyBlank("CertifyClerkName", "CERTIFICATION BY CLERK - name of the certifying officer",
          "the clerk of superior court certifies the record", 2),
        h.protectedBlank("CertifyClerkDate", "CERTIFICATION BY CLERK - date beside the certifying officer's signature",
          "the certification is dated when it is made, by the officer who makes it", 2),
        h.agencyBlank("DeputyCSCCbx", "CERTIFICATION BY CLERK - the certifying officer is a Deputy CSC",
          "which clerk's officer certifies is the clerk's office's own record", 2),
        h.agencyBlank("AssistantCSCCbx", "CERTIFICATION BY CLERK - the certifying officer is an Assistant CSC",
          "which clerk's officer certifies is the clerk's office's own record", 2),
        h.agencyBlank("ClerkOfSuperiorCourtCbx", "CERTIFICATION BY CLERK - the certifying officer is the Clerk Of Superior Court",
          "which clerk's officer certifies is the clerk's office's own record", 2)
      );

      // ---- the three agency blocks. Name and street line are required before
      // filing; the rest of each block follows the block the participant fills.
      const AGENCIES = [
        ["1", "Arresting Agency", "the name of the agency that arrested you. The form's own note says the clerk will not provide addresses for you"],
        ["2", "Other Agency (if any) - first", "the name of any other State or local government agency with a record of your case. Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity"],
        ["3", "Other Agency (if any) - second", "the name of a further agency, if there is one; use AOC-CR-285 if there are more than the form has room for"]
      ];
      for (const [n, block, whatName] of AGENCIES) {
        const stateField = n === "2" ? "Stateagency2" : `State${n === "1" ? "Agency1" : `Agency${n}`}`;
        refusals.push(
          h.rbf(`NameAgency${n}`, `Name Of ${block}`, whatName,
            "which agency holds a record of a particular case, and its address, are case facts the platform has not seen", 1),
          h.rbf(`AddrAgency${n}`, `Address Of ${block} - street line`,
            "that agency's street address, in full - the clerk sends the granted order to the address you write",
            "no committed record holds the address of any particular North Carolina agency", 1),
          h.optional(`MailAgency${n}`, `Address Of ${block} - second street line`,
            "used only if that agency's address needs a second line", 1),
          h.optional(`CityAgency${n}`, `Address Of ${block} - City`,
            "that agency's city, if you list this agency", 1),
          h.optional(stateField, `Address Of ${block} - State`,
            "that agency's state, if you list this agency", 1),
          h.optional(`ZipAgency${n}`, `Address Of ${block} - Zip`,
            "that agency's ZIP code, if you list this agency", 1)
        );
      }

      // ---- the offence table. Row one is the participant's, all six columns of
      // it; rows two to eleven are the form's own continuation rows.
      for (const [field, caption, what] of TABLE_COLUMNS) {
        refusals.push(h.rbf(`${field}:1`, `${caption} - offence table, row 1`, what,
          "no held record establishes any participant's own charge, arrest, offence or disposition facts, and a table row completed in part reads as finished when it is not", 1));
      }
      for (let r = 2; r <= 11; r += 1) {
        for (const [field, caption] of TABLE_COLUMNS) {
          refusals.push(h.optional(`${field}:${r}`, `${caption} - offence table, row ${r}`,
            "the form's own continuation row, used only if more than one charge was disposed of by a finding of not guilty or not responsible", 1));
        }
      }
    }
    return { writes, refusals };
  }
};
/* ============================================================================
 * SHARED AGENCY-APPLICATION / COMPOSED BUILD CORE.
 *
 * Everything above this line is the family's own: its committed-record
 * bindings, its official-document bindings, its composed bodies, its field
 * maps and its instructions content. Everything below is family-independent
 * plumbing: deterministic rendering, byte proof, the builder's own count of
 * the nine completeness counters, and the census-v1 output records.
 *
 * It is a direct descendant of the composed-treatment core proven by the
 * FABLE-B12 builders, with ONE addition: a component may be an OFFICIAL
 * AGENCY DOCUMENT rather than a composed page. An agency application is not a
 * court filing, and the participant applies on the agency's own published
 * form; so where the agency publishes one, this core binds it by exact
 * SHA-256, writes only into measured boxes read from the document's own rule
 * strokes, and copies its pages into the packet. Where the agency publishes
 * none, no form is invented and the deliverable is the composed route sheet.
 *
 * DETERMINISM. Every PDFDocument.create() here is stamped through
 * stampDeterministic before it is saved, because pdf-lib writes the wall clock
 * into a created document and save({updateMetadata:false}) does not remove a
 * stamp that is already there. An overlaid official document keeps the source
 * document's own dates through carryDates() inside the finalizer. Two builds
 * of this family from the same inputs are therefore byte-identical, which is
 * what a hash-bound raster receipt depends on.
 * ========================================================================== */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
export const DOTS = (n = 84) => ".".repeat(n);

const STRATEGY = SPEC.implementationStrategy ?? "participant_agency_application";
const OFFICIAL = SPEC.officialComponents ?? {};
const isOfficial = (componentId) => Object.hasOwn(OFFICIAL, componentId);

/* ---- committed-record binding ------------------------------------------------ *
 * The authority this family composes from is a set of COMMITTED repository
 * records, each bound by exact SHA-256 at build time, and each anchor string a
 * statement this build RELIES ON, re-read from the committed bytes before
 * anything is composed. The build refuses if a record is missing or an anchor
 * is no longer there. */
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
      failures.push({
        recordId: rec.recordId, path: rec.path,
        why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`,
        missingAnchors: missing
      });
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

/* ---- official-document binding ------------------------------------------------ *
 * Resolved through the committed corpus index and its declared custody roots,
 * never by joining a path onto a guessed root: the index carries more than one
 * custody now and every custody but the Master Library writes
 * repository-relative paths. The pinned SHA-256 is what decides these are the
 * document's bytes, and it is re-computed from the file on disk. */
function resolveOfficialDocuments() {
  const bound = [];
  const failures = [];
  if (Object.keys(OFFICIAL).length === 0) return { bound, failures };
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: path.join(ROOT, MASTER_LIBRARY)
  });
  for (const [componentId, doc] of Object.entries(OFFICIAL)) {
    /*
     * One document, several custodies, and only some of them mounted.
     *
     * Both of this family's binaries appear TWICE in the committed index at
     * the same SHA-256: once under master_library and once under
     * d_source_packs, which is a pinned release this container does not carry.
     * Taking the FIRST entry that carries the hash makes the binding depend on
     * the index's row order rather than on the bytes, and reports a document
     * as unmounted while its identical bytes sit on disk under another
     * custody.
     *
     * So every candidate entry is tried, and the one that binds is the one
     * whose bytes are PRESENT and hash to the pinned digest. That is a
     * stricter test than the original, not a looser one: identity is still the
     * SHA-256 and nothing is accepted on a path alone. The receipt records
     * which custody actually supplied the bytes.
     */
    const candidates = (index.entries ?? []).filter((e) => e.sha256 === doc.sha256);
    if (candidates.length === 0) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, why: "no committed corpus-index entry carries this SHA-256" });
      continue;
    }
    let boundHere = null;
    const tried = [];
    for (const entry of candidates) {
      const file = resolver.resolve(entry);
      if (file === null || !fs.existsSync(file)) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "not mounted in this checkout" });
        continue;
      }
      const bytes = fs.readFileSync(file);
      const observed = crypto.createHash("sha256").update(bytes).digest("hex");
      if (observed !== doc.sha256) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "the bytes on disk do not hash to the pinned SHA-256", observed });
        continue;
      }
      boundHere = { componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path };
      break;
    }
    if (!boundHere) {
      failures.push({
        sourceId: doc.sourceId, componentId, sha256: doc.sha256, custodiesTried: tried,
        why: "the corpus index names this document in one or more custodies and none of them supplies bytes here that hash to the pinned SHA-256"
      });
      continue;
    }
    bound.push(boundHere);
  }
  return { bound, failures };
}

/* ---- measured write boxes, read from the document's own strokes ---------------- *
 * A write box is four strokes read from the page content stream — the rule
 * above, the rule below, and a vertical divider on each side — and never a
 * constant offset from a caption. The top of the box is measured too: it
 * begins a fixed clearance under the LOWEST printed line inside the cell, so a
 * caption that wraps to two lines cannot have a value drawn over its second
 * line. A cell that does not measure is recorded as geometry drift and nothing
 * is drawn in it. */
const RULE_TOLERANCE = 1.6;
const SPAN_OVERLAP = 0.55;
const CELL_INSET = 3;
const WRITE_BOX_LIFT = 3.5;
const CAPTION_CLEARANCE = 2.5;
const MIN_WRITE_BOX_HEIGHT = 7.5;
const MAX_WRITE_BOX_HEIGHT = 12;

/*
 * The second measured shape: a RULED BLANK.
 *
 * Not every official form draws a cell grid. Alaska's DPS CRI-103 draws a
 * printed caption followed by a single horizontal stroke, and there is no
 * vertical divider on either side of it — so the four-stroke cell test above
 * finds nothing and would report the whole form as geometry drift. The stroke
 * IS the measurement here: its own x and endX give the horizontal extent the
 * form intends for the value, and the value sits on it, which is why the
 * finalizer's protected-rule test is expressed in the same terms.
 *
 * The ceiling is still measured rather than assumed: the box stops a fixed
 * clearance below the lowest printed baseline that sits above this stroke
 * inside its own span, so a value can never be drawn over the caption of the
 * line above. Where nothing is printed above inside the span, the box takes
 * the maximum height and the fitter decides the rest.
 */
const BASELINE_ABOVE_RULE = 2;

function measureRuledBlank(page, cell) {
  const candidates = page.horizontal
    .filter((r) => Math.abs(r.y - cell.ruleY) <= RULE_TOLERANCE
      && Math.abs(r.x - cell.ruleFromX) <= RULE_TOLERANCE
      && Math.abs(r.endX - cell.ruleToX) <= RULE_TOLERANCE)
    .sort((a, b) => Math.abs(a.y - cell.ruleY) - Math.abs(b.y - cell.ruleY));
  const rule = candidates[0];
  if (!rule) return null;
  const boxBottom = rule.y + BASELINE_ABOVE_RULE;
  const above = page.items
    .filter((t) => String(t.text).trim() && t.x >= rule.x - 2 && t.x <= rule.endX + 2 && t.y > boxBottom + 2)
    .map((t) => t.y);
  const ceiling = above.length > 0 ? Math.min(...above) - CAPTION_CLEARANCE : boxBottom + MAX_WRITE_BOX_HEIGHT;
  const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
  const writeBox = {
    x: Number((rule.x + CELL_INSET).toFixed(2)),
    y: Number(boxBottom.toFixed(2)),
    width: Number((rule.endX - rule.x - CELL_INSET * 2).toFixed(2)),
    height: Math.max(0, height)
  };
  return {
    writeBox,
    tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
    rectBasis:
      "measured_ruled_blank: one horizontal stroke read from the page content stream — the rule the value is "
      + "written on — matched on its own y, start x and end x against the pinned binary, with the box ceiling "
      + "taken from the lowest printed baseline above it inside its own span",
    measuredCell: {
      ruleY: rule.y, ruleFromX: rule.x, ruleToX: rule.endX,
      ruleThickness: rule.height ?? null,
      lowestPrintedBaselineAboveInsideSpan: above.length > 0 ? Math.min(...above) : null
    }
  };
}

async function measureCells(bytes, cells) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const perPage = new Map();
  for (const [i, page] of pages.entries()) {
    const rules = await rulesOfPage(page);
    perPage.set(i + 1, {
      horizontal: rules.horizontal ?? [], vertical: rules.vertical ?? [],
      items: extractTextItems(page),
      size: page.getSize()
    });
  }
  const measured = [];
  const drift = [];
  for (const cell of cells) {
    const here = perPage.get(cell.page) ?? { horizontal: [], vertical: [], items: [] };
    if (Object.hasOwn(cell, "ruleY")) {
      const ruled = measureRuledBlank(here, cell);
      if (!ruled) {
        drift.push({
          cell: cell.key, page: cell.page, shape: "ruled_blank",
          expected: { ruleY: cell.ruleY, ruleFromX: cell.ruleFromX, ruleToX: cell.ruleToX },
          nearest: here.horizontal
            .filter((r) => Math.abs(r.y - cell.ruleY) <= 6)
            .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4)
        });
        continue;
      }
      measured.push({ ...cell, ...ruled, rect: ruled.writeBox });
      continue;
    }
    const cellHeight = cell.top - cell.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, cell.top) - Math.max(y0, cell.bottom)) / cellHeight;
    };
    const hRule = (y) => here.horizontal
      .filter((r) => Math.abs(r.y - y) <= RULE_TOLERANCE)
      .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];
    const top = hRule(cell.top);
    const bottom = hRule(cell.bottom);
    const left = vRule(cell.left);
    const right = vRule(cell.right);
    if (!top || !bottom || !left || !right) {
      drift.push({
        cell: cell.key, page: cell.page,
        expected: { top: cell.top, bottom: cell.bottom, left: cell.left, right: cell.right },
        found: { top: top?.y ?? null, bottom: bottom?.y ?? null, left: left?.x ?? null, right: right?.x ?? null }
      });
      continue;
    }
    const printedInCell = here.items
      .filter((t) => String(t.text).trim() && t.x >= left.x - 2 && t.x <= right.x + 2 && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0 ? Math.min(...printedInCell.map((t) => t.y)) : null;
    /*
     * Where in a measured cell the value sits.
     *
     * By default it sits on the cell's bottom rule, which is where a person
     * writing on paper puts it: the caption is printed at the top of the cell
     * and the line beneath is the line you write on.
     *
     * `writeUnderCaption` is for a TALL cell -- Alaska's DPS mailing-address
     * box is 80 points deep because it expects two or three lines -- where the
     * default would leave a single-line value floating sixty points below its
     * own caption. It places the box directly under the lowest printed line
     * inside the cell instead. BOTH rules are still measured, and the box is
     * still required to sit above the cell's own bottom rule; the flag moves
     * the value inside a measured cell and can never move it out of one.
     */
    const floor = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const boxBottom = cell.writeUnderCaption === true
      ? Math.max(floor, ceiling - MAX_WRITE_BOX_HEIGHT)
      : floor;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    measured.push({
      ...cell, writeBox, rect: writeBox,
      tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
      placedUnderCaption: cell.writeUnderCaption === true,
      sitsAboveTheCellsOwnBottomRule: boxBottom >= bottom.y,
      lowestPrintedLineInCell: lowestPrintedLine,
      rectBasis:
        "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, "
        + "and the vertical divider on each side, each re-checked against the pinned binary",
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y, leftDividerX: left.x, rightDividerX: right.x,
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      printedTextInThisCell: printedInCell.slice(0, 10).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }
  return { measured, drift, pageCount: pages.length };
}

/* ---- an AcroForm document's own census, read from the document ---------------- *
 * Every write box is the widget's own /Rect, read from the binary. No box is
 * derived from a caption position; the caption is captured separately and
 * decides only what a blank MEANS, never where it is.
 */
const FIELD_TYPE = (f) => {
  const n = f.constructor?.name ?? "";
  if (n === "PDFTextField") return "text";
  if (n === "PDFCheckBox") return "checkbox";
  if (n === "PDFRadioGroup") return "radio";
  if (n === "PDFDropdown") return "dropdown";
  if (n === "PDFOptionList") return "optionlist";
  return "unknown";
};

async function censusAcroForm(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageIndexOfRef = new Map(pages.map((p, i) => [p.ref, i + 1]));
  const form = doc.getForm();
  const raw = form.getFields().map((f) => {
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOfRef.get(w.P()) ?? null,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    });
    return {
      name: f.getName(),
      type: FIELD_TYPE(f),
      multiline: (() => { try { return f.isMultiline?.() === true; } catch { return false; } })(),
      maxLength: (() => { try { return f.getMaxLength?.() ?? null; } catch { return null; } })(),
      widgets
    };
  });
  // Captions, page by page, so a widget's printed label comes from the page it
  // actually sits on.
  const byPage = new Map();
  for (const f of raw) for (const w of f.widgets) {
    if (!w.page) continue;
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push({ name: f.name, rect: w.rect });
  }
  const labelOf = new Map();
  for (const [pageNo, widgets] of byPage) {
    const context = captureWidgetContext(pages[pageNo - 1], widgets, { isFirstPage: pageNo === 1 });
    for (const c of context) if (!labelOf.has(c.name)) labelOf.set(c.name, c);
  }
  const fields = raw.map((f) => {
    const c = labelOf.get(f.name) ?? {};
    return {
      ...f,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      regionIsDocumentTitle: c.regionIsDocumentTitle ?? false
    };
  });
  const documentTextLines = pages.flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text));
  return { fields, documentTextLines, pageCount: pages.length };
}

/* ---- what the official page actually carries, read from its own bytes -------- *
 * The finalizer's report says what this build BELIEVES it wrote. This says what
 * the paper shows, and it is the only channel that can catch the two failures
 * the report structurally cannot: ink that landed outside every box this family
 * measured, and ink sitting on a blank the map refused.
 *
 * The source's own printed text is subtracted first, by position and content,
 * because an official form prints captions inside and beside the very boxes it
 * strokes — counting those as our ink would report every form as defective.
 * What remains is exactly what this build added.
 */
const INK_TOLERANCE = 2.5;

async function itemsOfDocument(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => extractTextItems(page).map((t) => ({
    x: t.x, y: t.y, text: String(t.text ?? ""), width: t.width ?? 0
  })));
}

const inkKey = (t) => `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
const insideBox = (t, box) =>
  t.x >= box.x - INK_TOLERANCE && t.x <= box.x + box.width + INK_TOLERANCE
  && t.y >= box.y - INK_TOLERANCE && t.y <= box.y + box.height + INK_TOLERANCE;

async function auditOfficialInk(sourceBytes, outputBytes, boxes) {
  const source = await itemsOfDocument(sourceBytes);
  const output = await itemsOfDocument(outputBytes);
  const added = [];
  for (const [i, page] of output.entries()) {
    const before = new Map();
    for (const t of source[i] ?? []) before.set(inkKey(t), (before.get(inkKey(t)) ?? 0) + 1);
    for (const t of page) {
      const key = inkKey(t);
      const seen = before.get(key) ?? 0;
      if (seen > 0) { before.set(key, seen - 1); continue; }
      added.push({ page: i + 1, ...t });
    }
  }
  let glyphsOutsideMeasuredWriteBoxes = 0;
  const refusedFieldsWithInk = [];
  const written = boxes.filter((b) => b.written);
  const refused = boxes.filter((b) => !b.written);
  for (const t of added) {
    const glyphs = t.text.replace(/\s+/g, "").length;
    if (glyphs === 0) continue;
    /*
     * Ink is attributed to a WRITTEN box first, and ink a written box
     * accounts for is never also charged to a neighbour.
     *
     * AOC-CR-287 is why. Its petitioner block stacks four widgets 13pt tall
     * at 12pt intervals, so PetitionerAddr1 (y 667-680) and PetitionerAddr2
     * (y 655-668) OVERLAP by a point, and the street address drawn correctly
     * on line one has its origin inside line two's rectangle as well. Charged
     * to both, that reported a refused field carrying ink on a page where
     * nothing had gone wrong -- a false protected-write on a correct build,
     * which is the worst kind of finding because it teaches a reader to
     * distrust the counter.
     *
     * The real defect this test exists for survives the change intact: ink on
     * a refused blank that NO written box explains is still ink nobody
     * accounted for, and is still reported.
     */
    const explainedBy = written.filter((b) => b.page === t.page && insideBox(t, b.rect));
    if (explainedBy.length > 0) continue;
    glyphsOutsideMeasuredWriteBoxes += glyphs;
    for (const b of refused) {
      if (b.page === t.page && b.rect && insideBox(t, b.rect)) {
        refusedFieldsWithInk.push({ fieldId: b.key, drawnText: t.text, page: t.page });
      }
    }
  }
  return {
    addedTextItems: added.length,
    addedGlyphs: added.reduce((n, t) => n + t.text.replace(/\s+/g, "").length, 0),
    glyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk,
    method:
      "every text item of the finished document compared against the pinned source document's own items by "
      + "position and content; what remains is what this build added, and each added item is tested against "
      + "every measured box"
  };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
export function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("Φ", "-");
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
  const base = (id, label, page = 1) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: isOfficial(componentId)
      ? "measured_table_cell_read_from_the_official_documents_own_rule_strokes"
      : "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId, page = 1) => ({ ...base(id, label, page), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    agencyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "court, clerk, prosecutor, agency, or hearing field; the agency completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A control the reader marks, which THIS ROUTE does not determine.
     *
     * Only ever for an election that is genuinely the participant's: a route
     * that determines its own election must state it, and a packet built for
     * one statutory route may never hand that choice back. Every use of this
     * helper carries the reason the route leaves the choice open.
     */
    election: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      isSelectionControl: true, kind: "selection_control",
      reason: "a sworn assertion or legal election the route does not determine",
      category: "participant_sworn_narrative_or_legal_election",
      completenessClass: "participant_sworn_narrative_or_legal_election",
      class: "participant_sworn_narrative_or_legal_election",
      requiredBeforeFiling: false, routeDetermined: false, document: componentId, why
    }),
    /*
     * An ATTORNEY block on a form a self-represented participant files.
     * The platform holds no representation fact, and writing participant
     * data into a block the court reads as counsel's would tell the court
     * something untrue about who is appearing.
     */
    attorneyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `attorney-only, and no representation fact is held for this participant: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A blank the FORM ITSELF marks optional or conditional: a second address
     * line, a second offence rule, a number the form prints "(if known)".
     * Never for a blank the filing needs — that is a required fact wearing a
     * softer word, and the reason it may stay empty is the form's own, stated
     * here so a reader can check it against the printed page.
     */
    optional: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `optional participant-authored content, and the platform does not invent it: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why, page = 1) => ({
      ...base(id, label, page),
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
    formNumber: OFFICIAL[componentId]?.documentId ?? componentId,
    documentId: OFFICIAL[componentId]?.documentId ?? componentId,
    documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: isOfficial(componentId) ? "official_flat_document_with_measured_overlay" : "composed_document",
    composedFrom: isOfficial(componentId) ? null : SPEC.composedFromNote,
    officialSource: isOfficial(componentId)
      ? { sourceId: OFFICIAL[componentId].sourceId, sha256: OFFICIAL[componentId].sha256 } : null,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the writes ------------------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. For an overlaid official document
 * that is the page's own drawn text, which is where a flat overlay puts it. */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues) {
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
    const componentId = map.documentRole;
    const componentText = String(textOfComponent.get(componentId) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      // An official document's value is what the overlay actually drew, which
      // the fitter may have shrunk but never rewrites; a composed page's value
      // is the fact itself. A field the overlay REFUSED is not asserted here,
      // because the refusal is the record and inventing ink to match it would
      // be the defect this proof exists to catch.
      const drawn = drawnValues.get(`${componentId} ${w.field}`);
      if (isOfficial(componentId) && drawn === undefined) continue;
      const value = sanitizePdfText(String(drawn ?? facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${componentId}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: componentId, factId: w.factId,
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
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: r.fieldId ?? r, why: "a field the map refused carries ink in the output" });
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
      document: m.documentRole, documentId: m.documentId, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${SPEC.instructionsHeading}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## Who decides this, and what you do not file", "");
  for (const p of SPEC.whoDecides) out.push(p, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  out.push("## Where this goes", "");
  for (const p of SPEC.filingDestination) out.push(p, "");

  out.push("## What it costs", "");
  for (const p of SPEC.feeAndWaiver) out.push(p, "");

  out.push("## Who else has to be told", "");
  for (const p of SPEC.service) out.push(p, "");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain first", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is a labelled blank on the page named beside it. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
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
    out.push("## What this packet does not tell you, and who does", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help", "");
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
  const { bound, failures: sourceFailures } = resolveOfficialDocuments();
  if (failures.length > 0 || sourceFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: [...failures, ...sourceFailures],
      why: "a committed record or a bound official document this family builds from is missing, unmounted, or no longer carries what this build relies on; nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  const boundByComponent = new Map(bound.map((b) => [b.componentId, b]));

  // Every cell this family writes into is measured from the official
  // document's own strokes before anything is drawn. A cell that does not
  // measure stops the family rather than being drawn at a guessed rectangle.
  // An AcroForm document is censused once, from the document itself, and the
  // census is reused for both fixtures: the geometry is a property of the form,
  // not of the facts written onto it.
  const censusByComponent = new Map();
  for (const b of bound) {
    if (b.doc.acroform === true) censusByComponent.set(b.componentId, await censusAcroForm(b.bytes));
  }

  const cellsByComponent = new Map();
  const allDrift = [];
  for (const b of bound) {
    const cells = SPEC.officialCells?.[b.componentId] ?? [];
    if (cells.length === 0) { cellsByComponent.set(b.componentId, []); continue; }
    const { measured, drift } = await measureCells(b.bytes, cells);
    cellsByComponent.set(b.componentId, measured);
    for (const d of drift) allDrift.push({ component: b.componentId, ...d });
  }
  if (allDrift.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", geometryDrift: allDrift,
      why: "a write box could not be measured from the official document's own rule strokes; nothing is drawn at a guessed rectangle",
      overlayDirectoryTouched: false
    };
  }

  /*
   * Every censused field of every AcroForm document appears in the field map
   * exactly once, as a write or as a classified blank.
   *
   * The completeness audit reads the MAP, not the form: a field left out of
   * the map is a field nothing asks about, and a hundred and nineteen-field
   * petition could pass on nine declared rows. So the map is checked against
   * the document's own census before anything is rendered, and a family that
   * does not cover its own form stops rather than shipping a partial audit.
   */
  const coverageFailures = [];
  for (const b of bound) {
    if (b.doc.acroform !== true) continue;
    const census = censusByComponent.get(b.componentId);
    const { writes, refusals } = SPEC.mapFor(b.componentId, mapHelpers(b.componentId));
    const prefix = `${b.componentId}.`;
    const declared = [...writes, ...refusals].map((r) => String(r.field).slice(prefix.length));
    const seen = new Set();
    const twice = [];
    for (const d of declared) { if (seen.has(d)) twice.push(d); seen.add(d); }
    const censused = new Set(census.fields.map((f) => f.name));
    const missing = [...censused].filter((n) => !seen.has(n));
    const unknown = [...seen].filter((n) => !censused.has(n));
    if (missing.length || unknown.length || twice.length) {
      coverageFailures.push({
        component: b.componentId, documentId: b.doc.documentId,
        censusedFields: censused.size, declaredRows: declared.length,
        censusedButNotDeclared: missing, declaredButNotOnTheForm: unknown, declaredTwice: twice
      });
    }
  }
  if (coverageFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "FIELD_MAP_DOES_NOT_COVER_THE_FORM",
      why:
        "the completeness audit reads the field map rather than the form, so a censused field missing from "
        + "the map is a blank nothing asks about; this family does not cover its own document and nothing was "
        + "rendered",
      coverageFailures, overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, sha256: b.doc.sha256, custody: b.custody })),
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      cellsMeasured: [...cellsByComponent.values()].reduce((n, c) => n + c.length, 0),
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = SPEC.components.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  const overlayReports = [];
  const inkAudits = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];
    const drawnValues = new Map();

    for (const componentId of SPEC.components) {
      let componentBytes;
      let sourceSha = null;
      if (isOfficial(componentId)) {
        const b = boundByComponent.get(componentId);
        sourceSha = b.doc.sha256;
        let bytes;
        let report;
        let boxes;
        if (b.doc.acroform === true) {
          // An AcroForm document. Every decision about what MAY be written is
          // the shared semantics'; this supplies only the family's own explicit
          // mappings and its role classification, and then proves the result
          // from the artifact bytes rather than from the finalizer's report.
          const census = censusByComponent.get(componentId);
          const result = await finalizeOfficialForm({
            sourceBytes: b.bytes,
            expectedSha256: b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            unwritableFields: (b.doc.unwritable ?? []).map((u) => ({ field: u.field, class: u.class })),
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenNames = new Set(report.written.map((w) => w.field));
          boxes = census.fields.flatMap((f) => (f.widgets ?? []).map((w) => ({
            key: f.name, page: w.page, rect: w.rect, written: writtenNames.has(f.name)
          })));
          for (const w of report.written) {
            const value = resolveFact(facts, w.factId);
            if (value !== undefined && value !== null && String(value) !== "") {
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, String(value));
            }
          }
        } else {
          // A flat document. Every value sits on a stroke the form itself drew.
          const cells = cellsByComponent.get(componentId) ?? [];
          const writable = cells.filter((c) => c.fact && !c.tooShallowToWriteIn);
          const result = await finalizeFlatOverlay({
            sourceBytes: b.bytes,
            expectedSha256: b.doc.sha256,
            anchors: writable.map((c) => ({
              label: c.bindingLabel ?? c.label, page: c.page, writeBox: c.writeBox,
              factId: c.fact, protectedRules: []
            })),
            explicitMappings: Object.fromEntries(writable.map((c) => [c.bindingLabel ?? c.label, c.fact])),
            facts,
            documentTextLines: [],
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenAnchors = new Set(report.written.map((w) => w.anchor));
          for (const w of report.written) {
            const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
            if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(facts[cell.fact] ?? ""));
          }
          boxes = cells.map((c) => ({
            key: c.key, page: c.page, rect: c.writeBox,
            written: writtenAnchors.has(c.bindingLabel ?? c.label)
          }));
        }
        const ink = await auditOfficialInk(b.bytes, bytes, boxes);
        inkAudits.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...ink });
        overlayReports.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...report });
        componentBytes = Buffer.from(bytes);
      } else {
        const body = SPEC.composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        componentBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
      }
      const component = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(component, component.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: componentId,
          documentId: OFFICIAL[componentId]?.documentId ?? componentId,
          sourcePage: i + 1, sourceSha256: sourceSha
        });
      }
      documents.push(OFFICIAL[componentId]?.documentId ?? componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    if (blocked.has(sha256)) {
      return { familyId: SPEC.familyId, status: "STOPPED", stopClass: "RENDERED_TO_A_BLOCKED_HASH", sha256 };
    }

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues);
    // The ink audit is per OFFICIAL document and is the only channel that can
    // see ink outside a measured box, or ink sitting on a blank the map
    // refused. A composed page raises no such question: this build authored
    // every mark on it.
    const inkHere = inkAudits.filter((a) => a.fixture === fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod:
        "every written fact value read back from the extracted text of its component's own pages in the saved "
        + "packet bytes, and every official document's finished text compared item by item against the pinned "
        + "source document's own text so that only what this build added is measured",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      flattenedWidgetNote:
        "zero by construction rather than by failure: an AcroForm document is flattened into page content "
        + "before it is copied into the packet, and a flat overlay draws into page content to begin with, so "
        + "every mark this family makes is counted as a glyph in the column beside this one",
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
        inkHere.reduce((n, a) => n + a.glyphsOutsideMeasuredWriteBoxes, 0),
      refusedFieldsWithInk: inkHere.flatMap((a) => a.refusedFieldsWithInk.map((r) => ({ ...r, documentId: a.documentId }))),
      officialInkAudits: inkHere,
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: SPEC.assembledPacketRole ?? "assembled_agency_application_packet",
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
    jurisdiction: SPEC.jurisdiction, implementationStrategy: STRATEGY,
    custodyClass: SPEC.custodyClass, acquisitionCommissioned: false,
    bindingMethod:
      "committed repository records bound by exact SHA-256 at build time with every relied-on statement re-read "
      + "from the committed bytes as an anchor"
      + (bound.length > 0 ? ", and every official agency document bound by exact SHA-256 resolved through the committed corpus index and its declared custody roots" : ""),
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    agencyTreatmentNote: SPEC.agencyTreatmentNote,
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      corpusIndexAgrees: b.entry.sha256 === b.doc.sha256 && b.entry.byteLength === b.bytes.length,
      pageCount: b.entry.pageCount, acroFieldCount: b.entry.acroFieldCount,
      structuralClassObserved: b.entry.structuralClassObserved,
      instrumentKind: b.doc.instrumentKind ?? "participant_agency_application_form",
      renderStrategy: (SPEC.officialCells?.[b.componentId] ?? []).length > 0 ? "measured_flat_overlay" : "delivered_unmodified"
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components.filter((c) => !isOfficial(c)),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family prepares for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    renderStrategy: bound.length > 0 ? "measured_flat_overlay_and_composed_pages" : "composed_agency_application",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: STRATEGY,
    agencyTreatmentNote: SPEC.agencyTreatmentNote ?? null,
    officialForm: bound.length > 0 ? bound.map((b) => b.doc.documentId) : null,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    measuredCells: Object.fromEntries([...cellsByComponent.entries()].map(([k, v]) => [k, v.map((c) => ({
      key: c.key, page: c.page, label: c.label, fact: c.fact ?? null, rect: c.rect,
      rectBasis: c.rectBasis, measuredCell: c.measuredCell, tooShallowToWriteIn: c.tooShallowToWriteIn
    }))])),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundOfficialDocuments: bound.map((b) => ({ documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
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
    overlayReports: overlayReports.map((r) => ({
      fixture: r.fixture, component: r.component, documentId: r.documentId,
      sourceSha256: r.sourceSha256, outputSha256: r.outputSha256,
      written: r.written, refused: r.refused, unfittable: r.unfittable
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.documentRole, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
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
    implementationStrategy: STRATEGY,
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
    implementationStrategy: STRATEGY,
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
    implementationStrategy: STRATEGY,
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    components: SPEC.components,
    documents: artifacts[0]?.documents ?? [],
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, bytes: a.byteLength, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
