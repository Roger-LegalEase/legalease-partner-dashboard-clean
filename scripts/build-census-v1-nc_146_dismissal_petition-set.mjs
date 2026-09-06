#!/usr/bin/env node
/**
 * FABLE-PD official-form packet family — North Carolina, expunction of
 * DISMISSED charges under G.S. 15A-146(a) or (a1).
 *
 *   node scripts/build-census-v1-nc_146_dismissal_petition-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-only:NC:nc_146_dismissal_petition
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family. Three documents, all bound by exact SHA-256
 * and delivered as the Administrative Office of the Courts publishes them:
 *
 *   * AOC-CR-287 (Rev. 12/25) -- the Petition and Order of Expunction. Side
 *     One is the petition; Side Two is FINDINGS OF FACT, the ORDER and the
 *     CERTIFICATION BY CLERK, none of which this packet touches.
 *   * AOC-CR-287 instructions -- the AOC's own instruction sheet, delivered
 *     unmodified.
 *   * AOC-CV-226 -- the Civil Affidavit of Indigency, which the packet-set
 *     manifest carries CONDITIONALLY: a true dismissal costs nothing, and the
 *     $175.00 fee applies only where the charge was dismissed pursuant to a
 *     deferred prosecution agreement or a conditional discharge.
 *
 * THE SOURCE-IDENTITY DEFECT THIS FAMILY BINDS AROUND
 *
 * The route census maps `official-form:AOC-CR-287` to the INSTRUCTIONS binary
 * (sha fe222704...), not to the petition. The petition itself is held and is
 * reachable only through its content hash, `source-sha256:a8762293...`. This
 * build binds every document by its own SHA-256, so it delivers the right
 * bytes; the alias is still wrong in the census and is reported in
 * build-findings.json rather than left for a verifier to rediscover.
 *
 * THE OFFENCE TABLE IS DELIBERATELY EMPTY, AND THAT IS THE FINDING
 *
 * Side One's table repeats five columns ten times: File No., Offense
 * Description, Date Of Arrest, Date Of Offense, Date Of Dismissal. Four of the
 * five can be bound. THE FIFTH CANNOT: the shared descriptor list carries
 * `matter.disposition_date` matching /disposition\s*date/ and nothing that
 * matches "date of dismissal", so `DateOfDismissal1` binds nothing, and no
 * explicit mapping can reach it because decideBinding consults explicitMappings
 * only AFTER a descriptor has matched.
 *
 * Writing the other four would produce exactly the defect the completeness
 * contract exists to catch: a row that carries written cells beside a required
 * cell left blank, which reads as finished and is not. So the whole table is
 * left to the participant, every column of row one is declared
 * required-before-filing and disclosed, and the descriptor gap is reported.
 * Closing it means adding a descriptor to
 * scripts/rcap-official-forms/rcap-field-semantics.mjs, which is a shared host
 * carrying 137 builders; a change there could move other families' bytes, and
 * this lane may not make it. It is reported for a lane that owns that host.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "nc_146_dismissal_petition-set";

/* Row 1 of Side One's table, and the nine rows beneath it. Stated once here
 * because the table is the substance of this family's finding. */
const TABLE_COLUMNS = [
  ["FileNumber", "File No. of the charge", "the file number of the dismissed charge, exactly as the clerk's record prints it"],
  ["OffenseDescription", "Offense Description", "the offence description, copied from the clerk's record"],
  ["DateOfArrest", "Date Of Arrest", "the date you were arrested on that charge"],
  ["DateOfOffense", "Date Of Offense", "the date of the offence itself"],
  ["DateOfDismissal", "Date Of Dismissal", "the date the charge was dismissed - check it against your SBI record or the clerk's file before you write it"]
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-nc_146_dismissal_petition-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill",
  jurisdiction: "NC",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition and Order of Expunction Under G.S. 15A-146(a) or G.S. 15A-146(a1) (Charges Dismissed)",
  routeName: "expunging a North Carolina charge that was dismissed, under G.S. 15A-146(a) or (a1)",
  statutes: ["G.S. 15A-146", "G.S. 15A-146(a)", "G.S. 15A-146(a1)", "G.S. 15A-150", "G.S. 15A-1008"],
  routes: [{ routeKey: "obligation:track-only:NC:nc_146_dismissal_petition" }],

  records: [
    {
      recordId: "packet-set-manifest:nc_146_dismissal_petition-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Under DETERMINATION_FEE_AND_WAIVER_"
        + "STANDARD amendment A2 its participantActionRequired entries are a held source, and here they settle "
        + "the filing destination, the fee and when it applies, the indigency waiver, the service position, and "
        + "the records the participant must obtain and keep",
      mustContain: [
        "File the AOC-approved form with the clerk of superior court in the county where the charge was brought. G.S. 15A-146(c) requires any petition under this section to be on a form approved by the Administrative Office of the Courts.",
        "none for a true dismissal. $175 applies where the charge was dismissed pursuant to a deferred prosecution or conditional discharge agreement. Separately, the costs of expunging the records required under G.S. 15A-150 are not taxed against the petitioner.",
        "Indigency waiver available where a fee applies, on AOC-CV-226, including for petitioners receiving SNAP, TANF or SSI or represented by a legal services organization.",
        "none required by the AOC form for dismissals. A DNA expunction application under G.S. 15A-146(b1) is a separate matter and must be served on the district attorney not less than 20 days before the hearing.",
        "Obtain Copies of the charging documents, dismissal orders and judgments. Obtain and keep permanent copies before filing. After an expunction, access to these records is restricted and you may be unable to obtain them if you later need to prove what actually happened, most acutely in an immigration proceeding.",
        "Applies where the district attorney petitions rather than the participant. G.S. 15A-146 permits either."
      ],
      /* The exact object this build relies on, bound separately from the whole
       * file. The manifest is a national record and unrelated central edits move
       * its whole-file digest without touching this packet set; a receipt that
       * pins only the file therefore reports drift about bytes this family never
       * read. The object hash is the one that must not move. */
      exactObject: { kind: "packetSet", id: "nc_146_dismissal_petition-set" }
    },
    {
      /* participant-instructions.md quotes this registry's stop conditions
       * verbatim -- "A felony charge dismissed pursuant to a plea agreement" and
       * the § 15A-145.4 / § 15A-145.6 sequencing stop -- and attributes them to
       * "the committed track registry". A receipt that omits the record the
       * output quotes does not bind what the output actually relies on. */
      recordId: "legal-design-track-registry:nc_146_dismissal_petition",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry. participant-instructions.md quotes this track's "
        + "selfHelpStopConditions verbatim and names the registry as their source, so the stop conditions the "
        + "packet presents are bound to these exact bytes",
      mustContain: [
        "A felony charge dismissed pursuant to a plea agreement.",
        "An incapable-to-proceed dismissal, in either direction given the open question about pre-December 2025 cases.",
        "A deferred prosecution or conditional discharge dismissal, which carries the fee and different rules.",
        "Anyone who may later need G.S. 15A-145.4 or 15A-145.6 relief, because sequencing matters.",
        "DNA expunction, which carries its own service and hearing requirements.",
        "Any immigration matter."
      ],
      exactObject: { kind: "track", id: "nc_146_dismissal_petition" }
    }
  ],

  officialComponents: {
    petition: {
      sourceId: "source-sha256:a876229328f9ee8325890b597633b661711fe606da1be8ddb573cd50791365ed",
      documentId: "AOC-CR-287",
      formNumber: "AOC-CR-287",
      officialTitle: "Petition and Order of Expunction Under G.S. 15A-146(a) or G.S. 15A-146(a1) (Charge(s) Dismissed)",
      revision: "REV-2025-12",
      instrumentKind: "primary_filing",
      sha256: "a876229328f9ee8325890b597633b661711fe606da1be8ddb573cd50791365ed",
      acroform: true,
      captionOnly: false,
      explicitMappings: {},
      unwritable: [
        { field: "PetitionerAddr2", class: "address_continuation_line",
          why: "The second printed line of the petitioner's address block. It BINDS participant.street_address exactly as line one does, so filling both prints the same street address twice on the face of the petition. The platform holds one street address and writes it once." },
        { field: "FileNumber1", class: "offence_table_row_left_whole_to_the_participant",
          why: "Side One's table has five columns and the fifth, Date Of Dismissal, cannot be bound by any family: no descriptor in the shared list matches \"date of dismissal\", and an explicit mapping cannot reach a field that matched no descriptor. Writing four of five would leave a row that carries written cells beside a required cell left blank, which reads as finished and is not. The whole row is therefore the participant's, and every column of it is disclosed." },
        { field: "OffenseDescription1", class: "offence_table_row_left_whole_to_the_participant",
          why: "The same row, the same reason: this table is completed as a row or not at all." },
        { field: "DateOfArrest1", class: "offence_table_row_left_whole_to_the_participant",
          why: "The same row, the same reason." },
        { field: "DateOfOffense1", class: "offence_table_row_left_whole_to_the_participant",
          why: "The same row, the same reason." }
      ]
    },
    instructions: {
      sourceId: "official-form:AOC-CR-287-INSTRUCTIONS",
      documentId: "AOC-CR-287-INSTRUCTIONS",
      formNumber: "AOC-CR-287-INSTRUCTIONS",
      officialTitle: "Instructions for Petition and Order of Expunction Under G.S. 15A-146(a) or G.S. 15A-146(a1)",
      revision: "REV-2025-12",
      instrumentKind: "instructions",
      sha256: "fe22270401aa22ee5c801871aeb1c00f3b98cfb6867f7155681bab4af9c990d7",
      acroform: false
    },
    fee_waiver: {
      sourceId: "official-form:AOC-CV-226",
      documentId: "AOC-CV-226",
      formNumber: "AOC-CV-226",
      officialTitle: "Petition To Proceed As An Indigent / Civil Affidavit Of Indigency",
      revision: "REV-2023-04",
      instrumentKind: "fee_waiver",
      sha256: "74057a13e4bccccbbac785c845b4996b322c6219e1c45f1ab42dca2377755a8f",
      acroform: true,
      captionOnly: false,
      explicitMappings: {},
      unwritable: [
        { field: "ApplicantFullPermanentMailingAddressAddr1", class: "if_different_than_above_block",
          why: "The form marks this whole block \"Full Permanent Mailing Address Of Applicant (if different than above)\". The shared descriptors refuse an if-different block, but the ligature in this form's printed caption comes through as \"di(uerent\", so the refusal does not fire and the block BINDS participant.street_address — writing the participant's only address into the block that exists for a DIFFERENT one, while the Street Number And Street Name line above it stays empty." },
        { field: "ApplicantFullPermanentMailingAddressAddr2", class: "if_different_than_above_block",
          why: "The second line of the same if-different block, on the same reasoning." },
        { field: "ApplicantFullPermanentMailingAddressCity", class: "if_different_than_above_block",
          why: "The city of the same if-different block." },
        { field: "ApplicantFullPermanentMailingAddressState", class: "if_different_than_above_block",
          why: "The state of the same if-different block." },
        { field: "ApplicantFullPermanentMailingAddressZip", class: "if_different_than_above_block",
          why: "The ZIP of the same if-different block." }
      ],
      /*
       * ONE HELD FACT, ON THE LINE THE FORM PRINTS FOR IT.
       *
       * AOC-CV-226's applicant block prints a street line, then a City, State
       * And Zip Code line. This packet has always written the city, the state
       * and the ZIP and left the street line empty, so delivered page 4 carried
       * an applicant address with no street above a city and a ZIP, on a
       * document sworn under G.S. 7A-450 et seq. — while the same street
       * address is written on the petition, delivered page 1. The completeness
       * contract's REQUIRED_BEFORE_FILING_CONDITIONS names that exact case: "A
       * fact written anywhere else in the same packet is available, and
       * refusing it here is a missing known fact." VF01 scored it as this
       * family's one failing obligation, and had already scored the same defect
       * on the sibling family nc_145_5_felony-set against this same binary.
       *
       * WHY THE ORDINARY DESCRIPTOR CHANNEL REFUSES IT, measured here against
       * the live rules rather than inherited. decideBinding tries the field
       * NAME and then, only if the name matches nothing, the printed LABEL:
       *
       *   name  "ApplicantStreetNumberAndStreetNameLine1"     -> [] ;
       *   label as CAPTURED  "... Including Apartment Or Unit N"        -> [] ;
       *   label as PRINTED   "... Including Apartment Or Unit Number If
       *                       Applicable"                               -> [] .
       *
       * so the decision is { writable: false, reason: "no_allowlisted_fact_
       * matches" } on all three subjects, measured in this container. An
       * explicitMappings entry cannot reach it either, because decideBinding
       * returns on the empty match set BEFORE it consults explicitMappings.
       * participant.street_address requires one of street addr | mailing addr |
       * addr line N | ^addr | address and none of the three subjects carries
       * any of them; participant.full_legal_name would match on
       * "Applicant"/"Name" and is correctly refused by its own \bstreet\b
       * clause. So this is NOT a protected-category refusal and NOT a
       * wrong-caption refusal: it is a gap in the SHARED descriptor list, which
       * reaches every builder in the corpus. This lane does not open
       * scripts/rcap-official-forms/rcap-field-semantics.mjs; the gap stays
       * reported in build-findings.json for the lane that owns it, and the
       * caption correction below does not close it.
       *
       * THE CHANNEL USED INSTEAD, and its limits. narrativeAcrossFields is the
       * finalizer's own opt-in channel for one held fact laid out on the ruled
       * line or lines a form prints for it. The caller names a FACT ID and a
       * FIELD and nothing else: the shared module resolves the fact from the
       * same facts set every other write is resolved from, runs the same
       * protect test on the caption AND on the field name, refuses a field
       * already written or classified unwritable by role, fits the value to
       * that widget's own rectangle and refuses it WHOLE rather than
       * truncating. No caller text can reach the page through it. It is named
       * here for ONE field and one fact; ApplicantStreetNumberAndStreetNameLine2
       * is not named and stays optional, and the whole "if different than
       * above" block stays refused by role above, so the address cannot land in
       * the block that exists for a different one.
       *
       * WHERE THE INK GOES, measured on the pinned form at 300 dpi before the
       * write was made. The widget rect is page 1 x[37.241,315.008]
       * y[659.057,675.413]. Its cell prints exactly one caption, "Street Number
       * And Street Name, Including Apartment Or Unit Number If Applicable", at
       * y 685.9-679.7, directly above the rect; the rect's own interior holds
       * no printed word at all — 68 dark pixels at 300 dpi, every one of them
       * the cell's right rule at x 314.88-315.12. The one widget rect that
       * touches it is line two of this same block,
       * x[37.241,315.008] y[643.031,659.387], sharing the cell hairline.
       */
      narrativeLines: [
        { factId: "participant.street_address", fields: ["ApplicantStreetNumberAndStreetNameLine1"] }
      ]
    }
  },

  officialCells: {},

  components: ["petition", "instructions", "fee_waiver"],
  componentTitles: {
    petition: "AOC-CR-287 - Petition and Order of Expunction (Charges Dismissed)",
    instructions: "AOC-CR-287 - The Administrative Office of the Courts' own instructions",
    fee_waiver: "AOC-CV-226 - Civil Affidavit of Indigency"
  },
  componentConditions: {
    fee_waiver:
      "Conditional. A true dismissal carries no fee. The committed packet-set manifest records that the $175.00 "
      + "fee applies only where the charge was dismissed pursuant to a deferred prosecution agreement or a "
      + "conditional discharge, and that the indigency waiver is available on AOC-CV-226 where a fee applies."
  },
  componentDescriptions: {
    petition: "the AOC-approved petition. Side One is yours; Side Two is the court's findings, order and the clerk's certification",
    instructions: "the AOC's own instruction sheet for this form, delivered exactly as published and unmarked",
    fee_waiver: "the indigency affidavit, needed ONLY if a fee applies to your case and you cannot pay it"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street",
      "participant.city": "Raleigh",
      "participant.state": "NC",
      "participant.zip": "27601",
      "participant.phone": "919-555-0142",
      "matter.case_number": "19CR001184",
      "matter.county": "Wake"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Yadkin River Crossing Road, Apartment 14B",
      "participant.city": "Winston-Salem",
      "participant.state": "NC",
      "participant.zip": "27101-2214",
      "participant.phone": "(336) 555-0199 ext. 4417",
      "matter.case_number": "2004CR000000118844-A",
      "matter.county": "New Hanover"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "All three documents are the North Carolina Administrative Office of the Courts' own published forms, bound "
    + "by exact SHA-256 through the committed corpus index and delivered as the AOC issues them. G.S. 15A-146(c) "
    + "requires a petition under this section to be on a form approved by the AOC, so substituting or composing "
    + "one would make the filing refusable on its face; nothing here is composed, substituted or invented.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: AOC-CR-287 is the AOC's form for a G.S. 15A-146(a) or (a1) petition "
    + "on dismissed charges, and its own title says so. Within that route the form carries three elections and "
    + "none of them is one this route decides. Paragraph 3's a/b pair asks whether ALL of the participant's "
    + "charges were dismissed or only some -- a fact about their own record, and the difference between "
    + "subsection (a) and (a1). The civil-revocation box is a fact about their own driving record. And the "
    + "District/Superior division boxes follow the court the charge was brought in. Nothing is marked, and every "
    + "box is recorded as the participant's own election.",

  routeSelectionsMade: [
    {
      selection: "instrument set",
      value: "AOC-CR-287 with the AOC's own instructions, and AOC-CV-226 conditionally",
      determinedBy:
        "the committed packet-set manifest's components, and its file entry: G.S. 15A-146(c) requires any "
        + "petition under this section to be on a form approved by the Administrative Office of the Courts"
    }
  ],

  instructionsHeading: "Filing instructions — expunging a dismissed North Carolina charge (G.S. 15A-146)",

  instructionsIntro: [
    "This packet is the Administrative Office of the Courts' own **AOC-CR-287, Petition and Order of Expunction (Charge(s) Dismissed)**, its own instruction sheet for that form, and — only if a fee applies to your case — **AOC-CV-226, the Civil Affidavit of Indigency**. G.S. 15A-146(c) requires a petition under this section to be on a form the AOC has approved, which is why nothing here is a composed document.",
    "**Side One of AOC-CR-287 is yours. Side Two is not.** Side Two carries the court's FINDINGS OF FACT, the ORDER and the CERTIFICATION BY CLERK; this packet writes nothing anywhere on it, and neither should you.",
    "The platform filled what it holds: on Side One your name, your street address, your city, your state, your ZIP code and your date of birth, the county, and the file number in the caption. On AOC-CV-226 it filled your name, your street address, your city, state and ZIP, your telephone number and your date of birth.",
    "**The offence table on Side One is deliberately left entirely to you, and it is worth knowing why.** The table has five columns — File No., Offense Description, Date Of Arrest, Date Of Offense, Date Of Dismissal. The platform can bind four of them and cannot bind the fifth: nothing in the shared list of facts matches a \"date of dismissal\". Filling four columns and leaving the fifth blank would give you a row that looks finished and is not, which is worse than an empty one. So the row is yours, all five columns of it are listed below, and you copy each from the clerk's record.",
    "**Your ZIP code and your date of birth on Side One are filled in — check them.** They used to be left to you, because on that crowded row the shared caption reader was picking up the neighbouring \"Race\" and \"Full Social Security No.\" captions instead of their own and refusing the write. This build reads those two captions off the printed form itself, so both facts are now written where the form asks for them, as they already were on AOC-CV-226. The blanks beside them — Drivers License No., Drivers License State, Full Social Security No., Race, Sex and Age At Time Of Offense — are still empty, and the table below says which of them you must supply."
  ],

  whoDecides: [
    "**The court decides, on your petition, and the clerk certifies first.** You file Side One with the clerk of superior court; the clerk completes the CERTIFICATION BY CLERK on Side Two; a judge makes the findings and signs the order.",
    "**You may not be the only person who can petition.** The committed packet-set manifest records that G.S. 15A-146 permits either the petitioner or the district attorney to petition, and that where the district attorney petitions instead, the form is AOC-CR-295 rather than this one. That form is not in this packet. If the district attorney has told you they will petition, ask the clerk whether you should file this one as well.",
    "**The clerk sends the order out, not you.** The form's own NOTE TO PETITIONER says the clerk of superior court will send a copy of the granted order to the agencies you list — and says in terms that **the clerk will not provide addresses for you**, which is why the agency blocks are yours to complete.",
    "**Some agencies are notified automatically and must NOT be listed.** The same note says: do not list the courts, the State Bureau of Investigation, the Department of Adult Correction, or the Division of Motor Vehicles. Do not list any private entity either — a private entity required to expunge records is notified by the State or local agencies that distribute criminal justice information to it."
  ],

  filingDestination: [
    "**File with the clerk of superior court in the county where the charge was brought.** That is the committed packet-set manifest's instruction for this packet, and it is the answer — you do not have to work venue out for yourself.",
    "**Check the county the platform wrote into the caption against the county the charge was brought in.** They should be the same; if they are not, the caption is wrong and must be corrected before you file.",
    "**The District / Superior division boxes in the caption are yours.** They follow the court the charge was brought in, and the clerk's office of that county can confirm which applies to your case."
  ],

  feeAndWaiver: [
    "**For a true dismissal there is no fee.** The committed packet-set manifest states it: \"none for a true dismissal.\"",
    "**There is one exception and it is $175.00.** The same record: \"$175 applies where the charge was dismissed pursuant to a deferred prosecution or conditional discharge agreement.\" The form itself carries the switch — Side One has a box reading *No charge listed above was dismissed as the result of compliance with a deferred prosecution agreement or a conditional discharge and dismissal*, with a NOTE TO CLERK beside it: **if this box is checked, do not assess the $175.00 fee.** That box is a statement about your own case and this packet does not tick it for you.",
    "**If the $175.00 does apply and you cannot pay it, AOC-CV-226 is in this packet for exactly that.** The manifest records the waiver as \"available where a fee applies, on AOC-CV-226, including for petitioners receiving SNAP, TANF or SSI or represented by a legal services organization.\" The affidavit is a full financial statement and every money figure on it is yours; the platform writes none of them.",
    "**A separate cost is expressly not yours.** The manifest records that the costs of expunging the records required under G.S. 15A-150 are not taxed against the petitioner. That is the cost of carrying the order out, and it is not charged to you.",
    "**If the clerk asks you for anything else**, that is a question about that office's own practice: **ask the clerk of superior court of the county where the charge was brought**, who is the office that assesses it, before you pay."
  ],

  service: [
    "**Nobody is served on this route.** The committed packet-set manifest records it in terms: \"none required by the AOC form for dismissals.\" There is no certificate of service on AOC-CR-287 and none is needed.",
    "**One neighbouring matter is different, and it is easy to confuse with this one.** The same record says a DNA expunction application under G.S. 15A-146(b1) is a separate matter and **must be served on the district attorney not less than 20 days before the hearing**. That is not this petition. If what you want is a DNA record removed, this is not the instrument and that deadline is real.",
    "**The distribution after the order is the clerk's.** You do not serve or deliver the granted order on any agency; the clerk sends it to the agencies you listed on Side One."
  ],

  documentsToObtain: [
    ["Copies of the charging documents, the dismissal orders and any judgments — obtain and KEEP them permanently before you file", "the clerk of superior court in the county where the charge was brought. The committed manifest warns that after an expunction access to these records is restricted and you may be unable to obtain them if you later need to prove what actually happened, most acutely in an immigration proceeding"],
    ["A right-to-review copy of your own North Carolina criminal history, to confirm the disposition and to check whether the case has already cleared automatically", "the North Carolina Department of Public Safety, State Bureau of Investigation"],
    ["The court file or a certified copy of the disposition, if you need to confirm the file number, the offence description or the dismissal date", "the clerk of superior court in the county where the charge was brought"],
    ["The name and full mailing address of the arresting agency, and of every other State or local government agency that holds a record of your case", "each agency itself. The form's own note says the clerk will not provide addresses for you"]
  ],

  steps: [
    "**Obtain and keep permanent copies of everything about the case before you file.** This is the step people skip and cannot undo: after an expunction, access to those records is restricted.",
    "**Check the dismissal date against your SBI record or the clerk's file.** The committed manifest asks you to confirm that answer before filing.",
    "**Complete the offence table on Side One, all five columns of the row.** File No., Offense Description, Date Of Arrest, Date Of Offense, Date Of Dismissal, copied from the clerk's record. If the case had more than one dismissed charge, use a further row for each.",
    "**If there are more agencies or more charges than the form has room for, attach AOC-CR-285** and tick the box on Side One that says you have — the form provides for it. That attachment is not in this packet.",
    "**List the arresting agency and every other State or local agency with a record of the case, with complete addresses.** Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity.",
    "**Answer paragraph 3 if you were charged with multiple offences**: box a if all of them were dismissed, box b if some resulted in a conviction on the day of dismissal or had not reached final disposition — and if box b, write the file numbers and offence descriptions of the charges that were NOT dismissed on the lines provided.",
    "**Tick the civil-revocation box only if a civil revocation of your driver's licence resulted from the offence.**",
    "**Read the deferred-prosecution box carefully.** Tick it only if no charge listed was dismissed as the result of compliance with a deferred prosecution agreement or a conditional discharge. Ticking it truthfully is what tells the clerk not to assess the $175.00 fee.",
    "**Sign and date the petition where it says Signature Petitioner, and print your name beside it.**",
    "**Only if a fee applies and you cannot pay it, complete AOC-CV-226 in full** — the whole financial statement is yours — and swear it before the officer named on its jurat.",
    "**File with the clerk of superior court in the county where the charge was brought.** Write nothing on Side Two."
  ],

  deliberatelyBlank: [
    "**Everything on Side Two of AOC-CR-287.** The FINDINGS OF FACT, the ORDER, the presiding judge's name, signature and date, and the CERTIFICATION BY CLERK all belong to the court and the clerk.",
    "**The whole offence table on Side One**, for the reason set out above: four of its five columns can be bound and the fifth cannot, and a part-filled row reads as finished when it is not.",
    "**Every agency name and address.** The form's own note makes these the petitioner's, and says the clerk will not provide addresses for you.",
    "**Your driver's licence number, your Social Security number, your race, your sex and your age at the time of the offence.** Government identifiers and personal descriptors the platform does not write onto any form.",
    "**The petitioner's-attorney block.** No representation fact is held for you, and this build never writes participant data into a block the court reads as counsel's.",
    "**Every figure on AOC-CV-226.** The affidavit is a sworn financial statement; the platform invents no number.",
    "**Every signature and every date beside one, on both forms.**"
  ],

  notTold: [
    "**The name and mailing address of any agency that holds a record of your case.** No held record establishes them, and the form's own note says the clerk will not provide them either. Each agency publishes its own address; the clerk of superior court of the county where the charge was brought can tell you which agencies are likely to hold a record.",
    "**Whether your case was dismissed pursuant to a deferred prosecution agreement or a conditional discharge**, which is the only thing that turns the $175.00 fee on. Your own dismissal order says; the clerk of superior court can confirm it.",
    "**Whether the district attorney intends to petition instead of you** on AOC-CR-295. Ask the district attorney's office for the county where the charge was brought.",
    "**Whether the case has already cleared automatically.** An SBI right-to-review copy of your own record is how you find out."
  ],

  stopConditions: [
    "the charge was dismissed under G.S. 15A-1008 for lack of capacity to proceed — paragraph 2 of the petition excludes that dismissal in terms;",
    "what you want expunged is a conviction rather than a dismissal — this form is for dismissed charges and a different AOC form covers a conviction;",
    "what you want is a DNA record removed — that is an application under G.S. 15A-146(b1), a separate matter with a 20-day service requirement on the district attorney before the hearing, and it is not this packet;",
    "you were charged with multiple offences and are not sure whether all of them were dismissed — that is the difference between subsection (a) and (a1) and between paragraph 3's boxes a and b;",
    "you may need these records later to prove what happened — most acutely in an immigration proceeding — and have not yet obtained and kept permanent copies of everything;",
    "the charge you want expunged is a **felony** that was dismissed **pursuant to a plea agreement** — the committed track registry names \"A felony charge dismissed pursuant to a plea agreement\" as a point where self-help stops, and whether a dismissal that came out of a plea agreement is a dismissal this section reaches is a legal characterization of your own disposition that this packet does not make. AOC-CR-287 carries certification entries about exactly that characterization, and they turn on the court record rather than on what you remember;",
    "you may later need relief under **G.S. 15A-145.4 or G.S. 15A-145.6** — the committed track registry names that as a stop condition \"because sequencing matters\". Filing this petition first can spend relief a later petition under one of those sections would have needed. If a conviction of yours might one day be eligible under either section, ask a North Carolina lawyer which petition to file first, before you file this one;",
    "any immigration question is involved at all."
  ],

  whatThisIsNot:
    "This is a prepared set of official North Carolina Administrative Office of the Courts forms, delivered as "
    + "the AOC publishes them. It is not legal advice, it is not filed for you, and it does not decide whether "
    + "your charge can be expunged under G.S. 15A-146. It is not AOC-CR-295, the district attorney's petition; "
    + "it is not AOC-CR-285, the continuation sheet for extra agencies or charges; and it is not an application "
    + "to expunge a DNA record under G.S. 15A-146(b1).",

  receiptDoesNotEstablish: [
    "that these are the current official editions of any of the three AOC forms, or that none has been superseded since the archive was assembled",
    "that any particular North Carolina charge was dismissed, or how it was dismissed",
    "that any fee does or does not apply to any particular case"
  ],

  buildFindings: [
    {
      finding:
        "SOURCE IDENTITY. The route census maps `official-form:AOC-CR-287` to the INSTRUCTIONS binary "
        + "(sha fe222704...), not to the petition. The petition itself is held and is reachable only through "
        + "`source-sha256:a8762293...`. The family's own MASTER_QUEUE row carries custodyClass "
        + "SOURCE_REVISION_STALE.",
      consequence:
        "This build binds every document by its own SHA-256 rather than by census alias, so the right bytes are "
        + "delivered and the receipt records both the alias and the hash. The census alias is still wrong and is "
        + "reported here for whoever owns the census, because a verifier reading the alias will fetch an "
        + "instruction sheet where a petition should be."
    },
    {
      finding:
        "SHARED-SEMANTICS GAP, and the reason Side One's offence table ships empty. The table's fifth column is "
        + "Date Of Dismissal. FACT_DESCRIPTORS carries matter.disposition_date matching /disposition\\s*date/ and "
        + "carries nothing matching \"date of dismissal\", so DateOfDismissal1 returns no_allowlisted_fact_matches "
        + "-- and an explicit mapping cannot reach it, because decideBinding consults explicitMappings only after "
        + "a descriptor has already matched.",
      consequence:
        "The other four columns are refused by role rather than written. Writing them would leave a row carrying "
        + "written cells beside a required cell left blank, which is the incompleteRows defect exactly. The whole "
        + "row is the participant's, all five columns are declared required-before-filing and disclosed, and the "
        + "instructions tell the participant why the table is empty. CLOSING THE GAP IS NOT THIS LANE'S TO DO: "
        + "it needs a descriptor in scripts/rcap-official-forms/rcap-field-semantics.mjs, a shared host carrying "
        + "137 builders, and a change there could move other families' bytes."
    },
    {
      finding:
        "CAPTION-CAPTURE DEFECT on Side One's crowded identifier row, STILL OPEN IN THE SHARED HOST. "
        + "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs reads that row one blank out of step: it returns "
        + "the neighbouring \"Race\" for PetitionerZip and the blob \"Date Of BirthFull Social Security No.Age At "
        + "Time Of O \u00faense\" for DateOfBirth, so the shared semantics refused both -- one as a protected personal "
        + "descriptor and one as a government identifier -- for reasons neither cell's printed caption supports. "
        + "The defect reaches every builder in the corpus and this lane does not open that host.",
      consequence:
        "REPAIRED LOCALLY AND ONLY LOCALLY. This family's own CAPTION_CORRECTIONS table replaces those two captured "
        + "labels with what the pinned AOC-CR-287 prints, each measured on its own 300 dpi raster against the "
        + "page's rule strokes and recorded under captionCorrectionsApplied: PetitionerZip's cell prints no caption "
        + "at all (55 dark pixels inside the rect, all of them the address block's right rule), and DateOfBirth's "
        + "cell prints \"Date Of Birth\" ABOVE the rect with no glyph inside it. With the measured captions in place "
        + "both bind through the ordinary FIELD NAME channel and both are now WRITTEN, as the platform already "
        + "wrote them on AOC-CV-226. No protect rule is disabled: the test still runs on the corrected caption and "
        + "on the field name, and Race, Sex, FullSocialSecurityNumber, AgeAtTimeOfOffense, DriversLicenseNumber and "
        + "DriversLicenseState on those same rows all still return protected_category. The correction throws rather "
        + "than applying if the capture ever stops returning the string it names, so it cannot outlive the defect. "
        + "The shared capture is unchanged and stays reported here for the lane that owns it."
    },
    {
      finding:
        "SHARED-DESCRIPTOR GAP on AOC-CV-226's street line, the same one the sibling family nc_145_5_felony-set "
        + "recorded against this same binary. decideBinding returns no_allowlisted_fact_matches for "
        + "ApplicantStreetNumberAndStreetNameLine1 on all three subjects available to it -- the field name, the "
        + "CAPTURED caption \"Street Number And Street Name, Including Apartment Or Unit N\", and the caption the "
        + "form actually PRINTS, \"Street Number And Street Name, Including Apartment Or Unit Number If "
        + "Applicable\" -- because participant.street_address requires one of street addr | mailing addr | addr "
        + "line N | ^addr | address and none of the three carries any of them. An explicitMappings entry cannot "
        + "reach it either: decideBinding returns on the empty match set BEFORE it consults explicitMappings.",
      consequence:
        "The applicant's street address is now WRITTEN on delivered page 4 through the finalizer's own opt-in "
        + "narrativeAcrossFields channel, naming one fact id and one field, so the affidavit no longer swears an "
        + "address with no street above a city and a ZIP. The report records the write as kind "
        + "\"text_narrative_line\", which is the shared module's word for a held fact laid out on a form's own "
        + "ruled line and not a claim by this family that a street address is a narrative. THE GAP ITSELF IS NOT "
        + "CLOSED: closing it needs a descriptor in scripts/rcap-official-forms/rcap-field-semantics.mjs, a shared "
        + "host carrying 137 builders, and a change there could move other families' bytes. It is reported here "
        + "for the lane that owns that host."
    },
    {
      finding:
        "CAPTION TRUNCATION in the shared capture. rcap-pdf-anchor-capture.mjs caps an effective label at "
        + "CAPTION_MAX_CHARS = 60, and AOC-CV-226's street caption is 78 characters, so the capture returns it cut "
        + "mid-word at \"Unit N\" -- a caption the form does not print.",
      consequence:
        "Corrected in this family's own CAPTION_CORRECTIONS table from the pinned form's 300 dpi raster and "
        + "recorded under captionCorrectionsApplied, because this family's field map, disclosure table and refusal "
        + "records all quote the effective label and a truncated quotation of an official caption is a false "
        + "statement about the paper. The correction changes nothing about binding -- measured with the full "
        + "printed caption in place, decideBinding still returns no_allowlisted_fact_matches -- and the cap itself "
        + "stays reported for the lane that owns the capture."
    },
    {
      finding:
        "TWO DUPLICATE-WRITE mis-bindings refused by role. PetitionerAddr2 on the petition binds "
        + "participant.street_address exactly as line one does. On AOC-CV-226 the whole \"Full Permanent Mailing "
        + "Address Of Applicant (if different than above)\" block binds the participant's address, because the "
        + "form's printed ligature comes through as \"di(uerent\" and the shared if-different refusal therefore "
        + "does not fire -- so the address would be written into the block that exists for a DIFFERENT one while "
        + "the Street Number And Street Name line above it stayed empty.",
      consequence:
        "Both refused by role with the reason stated, and the whole if-different block stays refused. The street "
        + "line ABOVE that block is a different question and is answered differently: it binds no descriptor "
        + "either, and it is now written through the named channel described in the next finding, so the "
        + "participant's one address appears on the line the form prints for it and nowhere else."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against A1-A4. The committed packet-set manifest is a held source under A2 and "
        + "answers this route's fee question with a condition rather than a figure: none for a true dismissal, "
        + "$175 where the dismissal followed a deferred prosecution agreement or a conditional discharge. The "
        + "form itself carries the switch, in a box with a NOTE TO CLERK beside it.",
      consequence:
        "The packet states both limbs, points at the box on the form that turns the fee off, explains that "
        + "AOC-CV-226 is in the packet for the case where the fee applies and cannot be paid, and separately "
        + "states that G.S. 15A-150 expunction costs are not taxed against the petitioner. Per A4 nothing in the "
        + "packet says it does not state an amount, because it does state one."
    },
    {
      finding:
        "SERVICE is a does-not-apply on this route and a real deadline on a neighbouring one: the manifest "
        + "records \"none required by the AOC form for dismissals\", and separately that a DNA expunction "
        + "application under G.S. 15A-146(b1) must be served on the district attorney not less than 20 days "
        + "before the hearing.",
      consequence:
        "Both are stated, and the neighbouring matter is named as a stop condition so a participant who actually "
        + "needs it is not left believing nothing is ever served."
    },
    {
      finding:
        "The packet-set manifest carries two components this build does NOT render as documents: a "
        + "participant_instructions component with outputStrategy process_guidance, and a "
        + "district_attorney_alternative_filing component naming AOC-CR-295, conditional on the district "
        + "attorney petitioning instead. MASTER_QUEUE's packetComponents for this family lists neither.",
      consequence:
        "participant-instructions.md is the first; the second is covered in prose and named as a form this "
        + "packet does not contain, because a document mapped and not rendered is a missing companion form. "
        + "AOC-CR-295 is not bound by this family and no source for it is held."
    }
  ],

  counselQuestions: [
    "Side One's offence table ships empty because its Date Of Dismissal column cannot be bound. Confirm that an empty table with all five columns disclosed is preferable to a four-of-five row, or direct that the four be written.",
    "The petition's ZIP and date-of-birth blanks are now written, on captions this lane measured off the pinned form because the shared capture returns a neighbouring cell's caption for both. Confirm that a family-local caption correction, measured and recorded, is the right way to write a fact the packet already writes elsewhere.",
    "AOC-CV-226's street line is written through the finalizer's named-fact channel rather than the descriptor channel, because no shared descriptor matches the caption the AOC prints. Confirm that writing the applicant's street address on the line the form prints for it is right, and that the \"if different than above\" block below it must stay empty.",
    "AOC-CV-226 is delivered unconditionally in the packet although the manifest makes it conditional on a fee applying. Confirm that delivering it with the condition stated is better than omitting it.",
    "The packet names AOC-CR-295 and AOC-CR-285 as forms the participant may need and does not contain. Confirm that naming without carrying is the right treatment for both.",
    "The AOC instruction sheet is delivered unmodified as a packet component. Confirm that redistributing the AOC's own instructions inside a prepared packet is appropriate."
  ],

  reviewersAttention: [
    "The offence table on Side One is EMPTY BY DECISION, not by omission. build-findings.json records why and names the shared-host change that would close it.",
    "Side Two of AOC-CR-287 is deliberately untouched in full. Please check on the raster that nothing has landed in the FINDINGS OF FACT, the ORDER or the CERTIFICATION BY CLERK.",
    "This family's census alias for official-form:AOC-CR-287 points at the instruction sheet rather than the petition. The build binds by hash and is unaffected; the census is not.",
    "AOC-CV-226 is a sworn financial statement. Every money figure on it is blank by design.",
    "THREE FACTS THAT USED TO BE BLANK ARE NOW WRITTEN. Please check on the raster that Side One carries the ZIP code on the address line and the date of birth under its own \"Date Of Birth\" caption, with Full Social Security No., Age At Time Of Offense, Race and Sex still empty beside them; and that AOC-CV-226's street line carries the address whole, with the second street line and the entire \"Full Permanent Mailing Address Of Applicant (if different than above)\" block below it still empty."
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
        h.write("PetitionerName", "Name Of Petitioner (type or print full name)", "participant.full_legal_name", 1),
        h.write("PetitionerAddr1", "Address Of Petitioner - street line", "participant.street_address", 1),
        h.write("PetitionerCity", "Address Of Petitioner - City", "participant.city", 1),
        h.write("PetitionerState", "Address Of Petitioner - State", "participant.state", 1),
        h.write("CountyName", "County named in the caption of the petition", "matter.county", 1),
        h.write("FileNumber", "File No. in the caption of the petition", "matter.case_number", 1),
        /* Both were declared required-before-filing until FIX78, on a caption
         * the pinned form does not print. See CAPTION_CORRECTIONS: the capture
         * returns the neighbouring "Race" for the ZIP cell and runs three
         * captions together for the date-of-birth cell, and with the measured
         * captions in place both bind through the ordinary FIELD NAME channel
         * (factBasis "field_name"), exactly as the six writes above do. The
         * platform holds both facts and already writes them on AOC-CV-226. */
        h.write("PetitionerZip", "Address Of Petitioner - Zip", "participant.zip", 1),
        h.write("DateOfBirth", "Date Of Birth", "participant.date_of_birth", 1)
      );
      refusals.push(
        h.rbf("DriversLicenseNumber", "Drivers License No.",
          "your driver's licence number, from the licence itself",
          "the shared semantics refuse a government identifier on any form", 1),
        h.rbf("DriversLicenseState", "Drivers License State",
          "the state that issued your driver's licence",
          "part of the same government-identifier block", 1),
        h.rbf("FullSocialSecurityNumber", "Full Social Security No.",
          "your Social Security number, as the form asks",
          "the shared semantics refuse a Social Security number on any form", 1),
        h.rbf("Race", "Race",
          "your race, as the form asks",
          "the platform does not hold or write a race fact", 1),
        h.rbf("Sex", "Sex",
          "your sex, as the form asks",
          "the platform does not hold or write a sex fact", 1),
        h.rbf("AgeAtTimeOfOffense", "Age At Time Of Offense",
          "your age when the offence happened",
          "an age at a past date is computed from an offence date the platform does not hold for this matter", 1),
        h.rbf("ArrestingAgencyName", "Name Of Arresting Agency",
          "the name of the agency that arrested you. The form's own note says the clerk will not provide addresses for you",
          "which agency arrested a participant, and its address, are case facts the platform has not seen", 1),
        h.rbf("ArrestingAgencyAddr1", "Address Of Arresting Agency - street line",
          "the arresting agency's street address, in full - the clerk sends the granted order to the address you write",
          "no committed record holds the address of any particular North Carolina agency", 1),
        h.rbf("ArrestingAgencyCity", "Address Of Arresting Agency - City",
          "the arresting agency's city",
          "no committed record holds it", 1),
        h.rbf("ArrestingAgencyState", "Address Of Arresting Agency - State",
          "the arresting agency's state",
          "no committed record holds it", 1),
        h.rbf("ArrestingAgencyZip", "Address Of Arresting Agency - Zip",
          "the arresting agency's ZIP code",
          "no committed record holds it", 1),
        h.rbf("OtherAgency1Name", "Name Of Other Agency (if any) - first",
          "the name of any other State or local government agency with a record of your case. Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity",
          "which further agencies hold a record of a particular case is a fact the platform has not seen", 1),
        h.rbf("OtherAgency1Addr1", "Address Of Other Agency (if any) - first, street line",
          "that agency's street address, in full",
          "no committed record holds it", 1),
        h.rbf("OtherAgency2Name", "Name Of Other Agency (if any) - second",
          "the name of a further agency, if there is one; use AOC-CR-285 if there are more than the form has room for",
          "which further agencies hold a record of a particular case is a fact the platform has not seen", 1),
        h.rbf("OtherAgency2Addr1", "Address Of Other Agency (if any) - second, street line",
          "that agency's street address, in full",
          "no committed record holds it", 1),
        h.rbf("ChargesLine1", "Paragraph 3(b) - file nos. and offence descriptions of charges that were NOT dismissed, first line",
          "only if you tick paragraph 3's box b: the file numbers and offence descriptions of the charges that resulted in a conviction on the day of dismissal or had not reached final disposition",
          "which of a participant's charges were not dismissed is a fact about their own record", 1),
        h.optional("PetitionerAddr2", "Address Of Petitioner - second street line",
          "used only if your address needs a second line; the platform holds one street address and writes it on the first", 1),
        h.optional("ArrestingAgencyAddr2", "Address Of Arresting Agency - second street line",
          "used only if that agency's address needs a second line", 1),
        h.optional("OtherAgency1Addr2", "Address Of Other Agency (if any) - first, second street line",
          "used only if that agency's address needs a second line", 1),
        h.optional("OtherAgency1City", "Address Of Other Agency (if any) - first, City",
          "that agency's city, if you list a first other agency", 1),
        h.optional("OtherAgency1State", "Address Of Other Agency (if any) - first, State",
          "that agency's state, if you list a first other agency", 1),
        h.optional("OtherAgency1Zip", "Address Of Other Agency (if any) - first, Zip",
          "that agency's ZIP code, if you list a first other agency", 1),
        h.optional("OtherAgency2Addr2", "Address Of Other Agency (if any) - second, second street line",
          "used only if that agency's address needs a second line", 1),
        h.optional("OtherAgency2City", "Address Of Other Agency (if any) - second, City",
          "that agency's city, if you list a second other agency", 1),
        h.optional("OtherAgency2State", "Address Of Other Agency (if any) - second, State",
          "that agency's state, if you list a second other agency", 1),
        h.optional("OtherAgency2Zip", "Address Of Other Agency (if any) - second, Zip",
          "that agency's ZIP code, if you list a second other agency", 1),
        h.optional("ChargesLine2", "Paragraph 3(b) - second line for charges that were NOT dismissed",
          "used only if the first line will not hold the answer", 1),
        h.attorneyBlank("PetitionersAttorneyName", "Name Of Petitioner's Attorney For Expunction Petition",
          "completed only where an attorney files the petition for you", 1),
        h.attorneyBlank("PetitionersAttorneyAddr1", "Address Of Petitioner's Attorney - street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("PetitionersAttorneyAddr2", "Address Of Petitioner's Attorney - second street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("PetitionersAttorneyCity", "Address Of Petitioner's Attorney - City",
          "part of the same attorney block", 1),
        h.attorneyBlank("PetitionersAttorneyState", "Address Of Petitioner's Attorney - State",
          "part of the same attorney block", 1),
        h.attorneyBlank("PetitionersAttorneyZip", "Address Of Petitioner's Attorney - Zip",
          "part of the same attorney block", 1),
        h.election("SuperiorCourtCkBox", "Caption - Superior Court division",
          "which division the charge was brought in is a fact about the participant's own case; the route covers both", 1),
        h.election("DistrictCourtCkBox", "Caption - District Court division",
          "the other half of the same election", 1),
        h.election("CkBox_Attchmt", "Box indicating additional agencies and/or file nos. and offences are listed on an attached AOC-CR-285",
          "whether a continuation sheet is attached depends on how many agencies and charges the participant has, which the platform does not know; AOC-CR-285 is not in this packet", 1),
        h.election("ChargedWithMultipleAndAllDismissedCkBox", "Paragraph 3(a) - charged with multiple offences and ALL were dismissed",
          "whether all of a participant's charges were dismissed is a fact about their own record, and it is the difference between G.S. 15A-146(a) and (a1)", 1),
        h.election("ChargedWithMultipleNotAllDismissedCkBox", "Paragraph 3(b) - charged with multiple offences and some were not dismissed",
          "the other half of the same election", 1),
        h.election("ThereIsACivilRevocationRecordCkBox", "Paragraph 4 - there is a civil revocation record resulting from the offence(s)",
          "whether a civil revocation of the participant's licence resulted is a fact about their own driving record", 1),
        h.election("NoChargeDismissedDeferredProsecutionCkBox", "Box - no charge listed was dismissed as the result of a deferred prosecution agreement or conditional discharge",
          "this box is the $175.00 fee switch and it is a sworn statement about how the participant's own case was dismissed; the NOTE TO CLERK beside it says that if it is checked the fee is not assessed, and no packet may make that statement for a participant", 1),
        h.election("PetitionerCkBox", "Signature block - the signer is the Petitioner",
          "who signs is the participant's own election between signing personally and signing by counsel", 1),
        h.election("PetitionersAttorneyCkBox", "Signature block - the signer is the Petitioner's Attorney",
          "the other half of the same election", 1),
        h.protectedBlank("PetitionSignedDate", "Date beside the petitioner's signature",
          "a date written before the petition is signed would be false", 1),
        h.protectedBlank("PetitionSignedByName", "Name (type or print) beside the petitioner's signature",
          "the printed name that accompanies a signature is part of the signature block and is made when the petition is signed", 1),
        h.agencyBlank("ScanNumbers", "Scan No.(s) in the caption",
          "assigned by the clerk of superior court when the petition is received", 1),
        // ---- Side Two, entire. The court's and the clerk's, without exception.
        h.agencyBlank("FindsAllDismissedCkBox", "FINDINGS OF FACT 3(a) - the court finds all charges were dismissed",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindsNotAllDismissedCkBox", "FINDINGS OF FACT 3(b) - the court finds some charges were not dismissed",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindsThereIsACivilRevocationRecordCkBox", "FINDINGS OF FACT 4 - the court finds there is a civil revocation record",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindsShouldBeGrantedCkBox", "FINDINGS OF FACT 5 - expunction should be granted",
          "the decision is the court's", 2),
        h.agencyBlank("FindsShouldNotBeGrantedCkBox", "FINDINGS OF FACT 5 - expunction should not be granted",
          "the decision is the court's", 2),
        h.agencyBlank("ReasonLine1", "FINDINGS OF FACT 5 - the court's reason, first line",
          "the court states its own reason", 2),
        h.agencyBlank("ReasonCont", "FINDINGS OF FACT 5 - the court's reason, continued",
          "the court states its own reason", 2),
        h.agencyBlank("PetitionIsGrantedCkBox", "ORDER - the petition is granted",
          "the order is the court's", 2),
        h.agencyBlank("PetitionIsDeniedCkBox", "ORDER - the petition is denied",
          "the order is the court's", 2),
        h.agencyBlank("PresidingJudgeName", "ORDER - Name Of Presiding Judge (type or print)",
          "the presiding judge's own block", 2),
        h.protectedBlank("OrderSignedDate", "ORDER - date beside the presiding judge's signature",
          "the court dates its own order", 2),
        h.agencyBlank("CertificationByClerkName", "CERTIFICATION BY CLERK - name of the certifying officer",
          "the clerk of superior court certifies the record", 2),
        h.agencyBlank("CertificationByClerkDate", "CERTIFICATION BY CLERK - date of the certification",
          "the clerk of superior court certifies the record", 2),
        h.agencyBlank("DeputyCSCCkBox", "CERTIFICATION BY CLERK - Deputy CSC",
          "which officer of the clerk's office signs is that office's own", 2),
        h.agencyBlank("AssistantCSCCkBox", "CERTIFICATION BY CLERK - Assistant CSC",
          "which officer of the clerk's office signs is that office's own", 2),
        h.agencyBlank("ClerkOfSuperiorCourtCkBox", "CERTIFICATION BY CLERK - Clerk Of Superior Court",
          "which officer of the clerk's office signs is that office's own", 2)
      );
      // The offence table: row one required-before-filing in every column,
      // rows two to ten optional, because they exist for a case with more than
      // one dismissed charge.
      for (const [field, caption, what] of TABLE_COLUMNS) {
        refusals.push(h.rbf(`${field}1`, `${caption}, table row 1`, what,
          "Side One's table is completed as a ROW: its Date Of Dismissal column cannot be bound by any family, "
          + "and a row carrying written cells beside a required cell left blank reads as finished when it is not", 1));
        for (let n = 2; n <= 10; n += 1) {
          refusals.push(h.optional(`${field}${n}`, `${caption}, table row ${n}`,
            `used only if your case had ${n} or more dismissed charges; the form repeats this table ten times and `
            + "the platform does not invent a charge you did not have", 1));
        }
      }
    } else if (componentId === "fee_waiver") {
      writes.push(
        h.write("ApplicantName", "Name Of Applicant", "participant.full_legal_name", 1),
        h.write("ApplicantCity", "City of the applicant", "participant.city", 1),
        h.write("ApplicantState", "State of the applicant", "participant.state", 1),
        h.write("ApplicantZip", "Zip Code of the applicant", "participant.zip", 1),
        h.write("ApplicantTelephoneNumber", "Telephone Number Of Applicant", "participant.phone", 1),
        h.write("ApplicantDateOfBirth", "Date Of Birth of the applicant", "participant.date_of_birth", 1),
        h.write("CountyName", "County named in the caption of the affidavit", "matter.county", 1),
        h.write("FileNumber", "File No. in the caption of the affidavit", "matter.case_number", 1),
        /* Written through the finalizer's opt-in narrativeAcrossFields channel
         * rather than the descriptor channel, because no shared descriptor
         * matches this caption however it is spelled. The caption below is the
         * one the pinned form PRINTS, measured at 300 dpi; the shared capture
         * cuts it at 60 characters. See officialComponents.fee_waiver. */
        h.write("ApplicantStreetNumberAndStreetNameLine1",
          "Street Number And Street Name, Including Apartment Or Unit Number If Applicable",
          "participant.street_address", 1)
      );
      refusals.push(
        h.optional("ApplicantStreetNumberAndStreetNameLine2", "Street Number And Street Name - second line",
          "used only if your street address needs a second line", 1),
        h.optional("ApplicantFullPermanentMailingAddressAddr1", "Full Permanent Mailing Address Of Applicant (if different than above) - street line",
          "used only if your permanent mailing address is DIFFERENT from the address above; leave the whole block empty if it is the same", 1),
        h.optional("ApplicantFullPermanentMailingAddressAddr2", "Full Permanent Mailing Address Of Applicant (if different than above) - second street line",
          "part of the same if-different block", 1),
        h.optional("ApplicantFullPermanentMailingAddressCity", "Full Permanent Mailing Address Of Applicant (if different than above) - City",
          "part of the same if-different block", 1),
        h.optional("ApplicantFullPermanentMailingAddressState", "Full Permanent Mailing Address Of Applicant (if different than above) - State",
          "part of the same if-different block", 1),
        h.optional("ApplicantFullPermanentMailingAddressZip", "Full Permanent Mailing Address Of Applicant (if different than above) - Zip",
          "part of the same if-different block", 1),
        h.rbf("NumberOfDependents", "Number Of Dependents",
          "how many dependents you have",
          "a dependent count is a household fact the platform does not hold", 1),
        h.rbf("ApplicantsEmployerNameAndAddress", "Name And Address Of Applicant's Employer (if not employed, state reason; if self-employed, state trade)",
          "your employer's name and address, or the reason you are not employed, or your trade if you are self-employed",
          "employment is a fact about the participant and a third party, and the platform holds neither", 1),
        h.rbf("BankNameAndAccountType", "Cash on hand and in bank accounts - bank name and account type (do not list account no.)",
          "the name of your bank and the type of account, without the account number",
          "the platform holds no financial fact for any participant", 1),
        h.rbf("MotorVehicles", "Motor Vehicles (list make, model, year)",
          "the make, model and year of each vehicle you own",
          "the platform holds no asset fact for any participant", 1),
        h.rbf("LastIncomeTaxFiledYearLastTwoDigits", "Last Income Tax Filed 20__",
          "the last two digits of the year you last filed income tax",
          "the platform holds no tax fact for any participant", 1),
        h.optional("OtherMonthlyExpensesDescription", "Other monthly expenses: (specify)",
          "used only if you have a monthly expense the listed categories do not cover", 1),
        h.rbf("GovernmentalAgenciesOrOtherEntitesAuthorizedToBeContactedAndOrToReleaseInformation",
          "Governmental Agencies Or Other Entities Authorized To Be Contacted And/Or To Release Information",
          "the agencies or entities you authorise to be contacted about, or to release, your financial information",
          "an authorisation to release a participant's own information is theirs to give and is not a fact the platform holds", 1),
        h.election("DistrictCourtDivisionCkBox", "Caption - District Court division",
          "which division the matter is in follows the participant's own case", 1),
        h.election("SuperiorCourtDivisionCkBox", "Caption - Superior Court division",
          "the other half of the same election", 1),
        h.election("ApplicantIsPlaintiffCkBox", "The applicant is the Plaintiff",
          "which party the participant is in this matter is a fact about their own case", 1),
        h.election("ApplicantIsDefendantCkBox", "The applicant is the Defendant",
          "the other half of the same election", 1),
        h.election("YesHaveServedInUnitedStatesArmedForcesCkBox", "Have you ever served in the United States Armed Forces? Yes",
          "the form itself marks this question optional, and military service is a fact about the participant that the platform does not hold", 1),
        h.election("NoHaveNotServedInUnitedStatesArmedForcesCkBox", "Have you ever served in the United States Armed Forces? No",
          "the other half of the same optional question", 1),
        h.election("BuyingShelterCkBox", "Shelter - Buying",
          "whether the participant is buying or renting is a household fact the platform does not hold", 1),
        h.election("RentingShelterCkBox", "Shelter - Renting",
          "the other half of the same election", 1),
        h.election("VehicleInstallmentPaymentsCkBox", "Installment Payments - Vehicle",
          "what the participant's installment payments are for is a financial fact the platform does not hold", 1),
        h.election("OtherInstallmentPaymentsCkBox", "Installment Payments - Other",
          "the other half of the same election", 1),
        h.election("LastIncomeTaxFiledRefundCkBox", "Last income tax filed - Refund",
          "whether the participant was owed a refund or owed tax is a financial fact the platform does not hold", 1),
        h.election("LastIncomeTaxFiledOweCkBox", "Last income tax filed - Owe",
          "the other half of the same election", 1),
        h.election("SigningApplicantIsPlaintiffCkBox", "Signature block - the signing applicant is the Plaintiff",
          "which party the participant is, restated at the signature block", 2),
        h.election("SigningApplicantIsDefendantCkBox", "Signature block - the signing applicant is the Defendant",
          "the other half of the same election", 2),
        h.protectedBlank("SignedByApplicantDate", "Date beside the applicant's signature",
          "a date written before the affidavit is sworn would be false", 2),
        h.protectedBlank("SignedByApplicantName", "Signature Of Applicant",
          "the applicant swears and signs the affidavit personally", 2),
        h.agencyBlank("JuratPersonAdministerOathsSignDate", "Jurat - date and signature of the person authorised to administer oaths",
          "the officer who administers the oath completes the jurat", 2),
        h.agencyBlank("JuratDeputyCSCCkBox", "Jurat - Deputy CSC",
          "which officer administers the oath is that office's own", 2),
        h.agencyBlank("JuratAssistantCSCCkBox", "Jurat - Assistant CSC",
          "which officer administers the oath is that office's own", 2),
        h.agencyBlank("JuratClerkOfSuperiorCourtCkBox", "Jurat - Clerk Of Superior Court",
          "which officer administers the oath is that office's own", 2),
        h.agencyBlank("JuratMagistrateCkBox", "Jurat - Magistrate",
          "which officer administers the oath is that office's own", 2),
        h.agencyBlank("JuratNotaryCkBox", "Jurat - Notary",
          "which officer administers the oath is that office's own", 2),
        h.agencyBlank("JuratCommissionExpiresDate", "Jurat - My Commission Expires",
          "a notary's own commission expiry, which only the notary knows", 2),
        h.agencyBlank("JuratCountyWhereNotarized", "Jurat - county where notarised",
          "the county in which the oath is administered is stated by the officer who administers it", 2)
      );
      const MONEY = [
        ["TotalAssets", "Total Assets"],
        ["TotalLiabilities", "Total Liabilities"],
        ["BondType", "Bond Type"],
        ["BondAmount", "Bond Amount"],
        ["ByWhomPosted", "Bond - By Whom Posted"],
        ["ApplicantEmploymentIncomeMonthlyAmount", "Monthly income from the applicant's employment"],
        ["SpouseEmploymentIncomeMonthlyAmount", "Monthly income from the spouse's employment"],
        ["SpousesEmployerNameAndAddress", "Name And Address Of Spouse's Employer"],
        ["OtherIncomeMonthlyAmount", "Other monthly income"],
        ["TotalMonthlyIncome", "Total Monthly Income"],
        ["ShelterMonthlyExpensesAmount", "Monthly expenses - Shelter"],
        ["FoodMonthlyExpensesAmount", "Monthly expenses - Food"],
        ["UtilitiesMonthlyExpensesAmount", "Monthly expenses - Utilities"],
        ["HealthCareMonthlyExpensesAmount", "Monthly expenses - Health Care"],
        ["InstallmentPaymentsMonthlyExpensesAmount", "Monthly expenses - Installment Payments"],
        ["CarMonthlyExpensesAmount", "Monthly expenses - Car Expenses (gas, insurance, etc.)"],
        ["SupportPaymentsMonthlyExpensesAmount", "Monthly expenses - Support Payments"],
        ["OtherMonthlyExpensesAmount", "Monthly expenses - Other"],
        ["TotalMonthlyExpenses", "Total Monthly Expenses"],
        ["CashOnHandAndInBankAccountsAssetsAmount", "Assets - Cash on hand and in bank accounts"],
        ["MoneyOwedToOrHeldForApplicantAssetsAmount", "Assets - Money owed to or held for the applicant"],
        ["MotorVehiclesAssetsAmount", "Assets - Motor Vehicles (fair market value)"],
        ["RealEstateAssetsAmount", "Assets - Real Estate"],
        ["PersonalPropertyAssetsAmount", "Assets - Personal Property"],
        ["IncomeTaxAssetsAmount", "Assets - Income Tax"],
        ["OtherAssetsAmount", "Assets - Other"],
        ["MotorVehiclesLiabilitiesAmount", "Liabilities - Motor Vehicles (balance owed)"],
        ["RealEstateLiabilitiesAmount", "Liabilities - Real Estate"],
        ["PersonalPropertyLiabilitiesAmount", "Liabilities - Personal Property"],
        ["OtherDebtsLiabilitiesAmount", "Liabilities - Other Debts"],
        ["IncomeTaxLiabilitiesAmount", "Liabilities - Income Tax"],
        ["OtherLiabilitiesAmount", "Liabilities - Other"]
      ];
      for (const [field, caption] of MONEY) {
        refusals.push(h.rbf(field, caption,
          "your own figure, which you swear to. This affidavit is a sworn financial statement and the platform invents no number on it",
          "the platform holds no financial fact for any participant, and a figure on a sworn affidavit may only come from the person swearing it", 1));
      }
    } else {
      // The AOC's own instruction sheet, delivered exactly as published.
      // Nothing is written on it and there is nothing on it to write.
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
/* Canonical-object SHA-256: the object's keys sorted recursively, serialised
 * compactly, and terminated with one newline. It is the digest the independent
 * verifier computes, so a receipt written any other way cannot be compared to
 * the verdict that reads it. */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeysDeep(value[k])]));
  }
  return value;
}

function canonicalObjectSha256(value) {
  return crypto.createHash("sha256").update(Buffer.from(`${JSON.stringify(sortKeysDeep(value))}\n`, "utf8")).digest("hex");
}

/* Locate the one object inside a national record that this family relies on.
 * Returns null when the record does not carry it, which resolveRecords treats
 * as a binding failure rather than writing an unbound receipt. */
function selectExactObject(parsed, exactObject) {
  if (exactObject.kind === "packetSet") {
    return (parsed.packetSets ?? []).find((entry) => entry.packetSetId === exactObject.id) ?? null;
  }
  if (exactObject.kind === "track") {
    return (parsed.tracks ?? []).find((entry) => entry.trackId === exactObject.id) ?? null;
  }
  return null;
}

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
    let exactObject = null;
    if (rec.exactObject) {
      const selected = selectExactObject(JSON.parse(text), rec.exactObject);
      if (selected === null) {
        failures.push({
          recordId: rec.recordId, path: rec.path,
          why: `the committed record no longer carries the exact ${rec.exactObject.kind} object this build relies on`,
          missingObject: rec.exactObject
        });
        continue;
      }
      exactObject = {
        kind: rec.exactObject.kind, id: rec.exactObject.id,
        canonicalObjectSha256: canonicalObjectSha256(selected),
        canonicalisation: "keys sorted recursively, JSON.stringify with no spacing, one trailing newline, UTF-8"
      };
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length,
      exactObject
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
    const entry = (index.entries ?? []).find((e) => e.sha256 === doc.sha256);
    if (!entry) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, why: "no committed corpus-index entry carries this SHA-256" });
      continue;
    }
    const file = resolver.resolve(entry);
    if (!fs.existsSync(file)) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, path: entry.path, custody: entry.custody, why: "the corpus index names this document but its bytes are not mounted in this checkout" });
      continue;
    }
    const bytes = fs.readFileSync(file);
    const observed = crypto.createHash("sha256").update(bytes).digest("hex");
    if (observed !== doc.sha256) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, observed, why: "the bytes on disk do not hash to the pinned SHA-256" });
      continue;
    }
    bound.push({ componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path });
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

/* ---- captions this family measured off the pinned paper ---------------------- *
 *
 * WHAT THIS IS, AND WHAT IT IS NOT.
 *
 * The shared capture (scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs)
 * reads AOC-CR-287's crowded identifier rows ONE BLANK OUT OF STEP, and caps an
 * effective label at CAPTION_MAX_CHARS = 60. Both are shared defects reaching
 * every builder in the corpus, and this lane does not open that host: they stay
 * reported in build-findings.json for the lane that owns them. What this table
 * does is narrower — it replaces the captured label of three named fields, on
 * two named documents, with the caption THIS LANE MEASURED on the pinned
 * binary's own 300 dpi raster, so that this family's field map, disclosure
 * table and refusal records quote the paper rather than the capture.
 *
 * IT DISABLES NO PROTECT RULE. decideBinding still runs protectCategoryOf on
 * the corrected caption AND on the field name, and every other blank on those
 * rows is refused exactly as before: Race, Sex, FullSocialSecurityNumber,
 * AgeAtTimeOfOffense, DriversLicenseNumber and DriversLicenseState all still
 * return protected_category, measured after this change.
 *
 * IT CANNOT OUTLIVE THE DEFECT. Each entry states the string the capture
 * returns today, and the census THROWS rather than applying a correction whose
 * capture has changed — a stale correction silently overriding a capture that
 * had already been repaired upstream is worse than no correction at all.
 */
const CAPTION_CORRECTIONS = {
  "AOC-CR-287": {
    /*
     * MEASURED on the pinned AOC-CR-287 (sha256 a876229328f9ee83..) rastered at
     * 300 dpi and read against the page's own rule strokes. The widget rect,
     * read from the pinned form itself, is page 1 x[255.807,315.085]
     * y[641.918,655.164]: the bottom-right cell of the block captioned "Name
     * And Address Of Petitioner (type or print full name)", which prints that
     * one caption at its top and NO zip-specific caption anywhere. Inside the
     * rect there are 55 dark pixels at 300 dpi and every one of them is the
     * block's own right rule at x 314.88-315.12; no caption and no other
     * printed word lies inside it. The printed word "Race" the capture returns
     * is in the NEXT printed row down, below the block's closing rule at
     * y=642.0, inside Race's own rect x[222.868,267.868] y[617.745,633.330].
     * PetitionerCity and PetitionerState sit on this identical line, are
     * already written by this packet and land correctly.
     */
    PetitionerZip: {
      capturedLabel: "Race",
      measuredLabel: null,
      measuredAt:
        "page 1 rect x[255.807,315.085] y[641.918,655.164]; 300 dpi raster of the pinned form shows 55 dark pixels "
        + "inside the rect, all of them the address block's own right rule at x 314.88-315.12, and no printed caption "
        + "of any kind; the printed \"Race\" the capture returns is at x[224.3,240.6] y 623-628, in the row below the "
        + "block's closing rule at y=642.0"
    },
    /*
     * MEASURED on the same raster. The widget rect is page 1
     * x[36.629,109.445] y[593.600,609.185]. Its cell is bounded above by a rule
     * at y 618.0-617.5 and below by one at y 594.0-593.5, and prints exactly
     * one caption, "Date Of Birth", whose glyphs occupy y 615.36-610.56 —
     * ABOVE the rect's top edge at 609.185, clear by 1.375pt. Row by row inside
     * the rect there are exactly two dark pixels per row (the cell's left and
     * right rules at x=36.63 and x=109.44) down to y 594.24, and then the
     * cell's closing rule. No glyph of any caption lies inside the rect. "Full
     * Social Security No." begins at x=110.61, on the far side of the cell
     * divider, inside FullSocialSecurityNumber's own rect x[110.610,221.703],
     * and "Age At Time Of Offense" is further right again in its own cell — the
     * capture runs all three together into one label and refuses the date of
     * birth as a government identifier on the strength of it.
     */
    DateOfBirth: {
      capturedLabel: "Date Of BirthFull Social Security No.Age At Time Of O \u00faense",
      measuredLabel: "Date Of Birth",
      measuredAt:
        "page 1 rect x[36.629,109.445] y[593.600,609.185]; 300 dpi raster of the pinned form shows \"Date Of Birth\" "
        + "printed at y 615.36-610.56 inside the same cell and ABOVE the rect, and shows no glyph inside the rect at "
        + "all — every dark pixel in it is the cell's own left rule at x=36.63, right rule at x=109.44, or its closing "
        + "rule at y 594.0-593.5. \"Full Social Security No.\" begins at x=110.61, inside its own rect"
    }
  },
  /*
   * A THIRD CORRECTION, ON THE OTHER FORM, AND OF A DIFFERENT KIND.
   *
   * The two above are WRONG captions — a neighbour's word, and three captions
   * run together across two cell dividers. This one is a TRUNCATED caption. The
   * shared capture caps an effective label at CAPTION_MAX_CHARS = 60 and
   * AOC-CV-226's street caption is 78 characters, so the capture returns it cut
   * mid-word at "Unit N", which is a caption the form does not print. It is
   * corrected because this family's field map, its disclosure table and its
   * refusal records all quote the effective label, and a truncated quotation of
   * an official form's printed caption is a false statement about the paper.
   *
   * THIS CORRECTION DOES NOT BY ITSELF MAKE THE WRITE POSSIBLE, and saying so
   * is the point. Measured here against the live rules with the corrected
   * caption in place, decideBinding still returns no_allowlisted_fact_matches.
   * The rule that refuses it, and the channel the write is made through
   * instead, are on the fee_waiver document's narrativeLines note above.
   */
  "AOC-CV-226": {
    ApplicantStreetNumberAndStreetNameLine1: {
      capturedLabel: "Street Number And Street Name, Including Apartment Or Unit N",
      measuredLabel: "Street Number And Street Name, Including Apartment Or Unit Number If Applicable",
      measuredAt:
        "page 1 rect x[37.241,315.008] y[659.057,675.413]; 300 dpi raster of the pinned AOC-CV-226 (sha256 "
        + "74057a13e4bccccb..) shows the caption printed once, in italic bold, at y 685.9-679.7 directly above the rect "
        + "and inside the same ruled cell, and shows 68 dark pixels inside the rect itself, every one of them the "
        + "cell's right rule at x 314.88-315.12. The capture cut that caption at 60 characters, which is "
        + "CAPTION_MAX_CHARS in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    }
  }
};

/** Corrections actually applied, so the report states them rather than implying them. */
const captionCorrectionsApplied = [];

async function censusAcroForm(bytes, documentId = null) {
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
  const corrections = (documentId && CAPTION_CORRECTIONS[documentId]) || {};
  const fields = raw.map((f) => {
    const c = labelOf.get(f.name) ?? {};
    const captured = c.effectiveLabel ?? null;
    const fix = Object.prototype.hasOwnProperty.call(corrections, f.name) ? corrections[f.name] : null;
    if (fix) {
      /* A correction that does not correct the caption it names is a stale
       * record, and a stale record is worse than none: it would silently keep
       * overriding a capture that had already been repaired upstream. */
      if (captured !== fix.capturedLabel) {
        throw new Error(
          `caption correction for ${documentId}.${f.name} expected the capture to return `
          + `${JSON.stringify(fix.capturedLabel)} and it returned ${JSON.stringify(captured)}; `
          + "re-measure the printed caption before this correction is used");
      }
      captionCorrectionsApplied.push({
        document: documentId, field: f.name, capturedLabel: fix.capturedLabel,
        measuredLabel: fix.measuredLabel, measuredAt: fix.measuredAt
      });
    }
    return {
      ...f,
      effectiveLabel: fix ? fix.measuredLabel : captured,
      labelBasis: fix
        ? "measured_from_the_pinned_forms_own_300_dpi_raster_and_rule_strokes"
        : (c.labelBasis ?? null),
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
    if (b.doc.acroform === true) censusByComponent.set(b.componentId, await censusAcroForm(b.bytes, b.doc.documentId));
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
            /* Opt-in, and empty for every document of this family but the
             * fee_waiver. See officialComponents.fee_waiver.narrativeLines. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            /* VF08 read 74 of 76 selection-widget rects across canonical.pdf and
             * boundary.pdf as delivering a stroked square that AOC-CR-287 and
             * AOC-CV-226 do not print: at each one the widget's current /AS
             * state has no stream in /AP /N, so a conforming viewer paints
             * nothing there. VF08's zero-write baseline over the same pinned
             * bytes painted the identical pixels, so the ink comes from the
             * shared flattening step and not from this family. Opting in
             * supplies the missing state as an EMPTY appearance, so nothing is
             * synthesized and nothing is flattened there. AOC-CR-288 is shared
             * with nc_146_acquittal, which FIX55 opted in the same way. A widget
             * of a field this run writes, and any widget whose /AS state ships
             * its own appearance, are untouched by this. */
            suppressSynthesizedAppearances: true,
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
      role: r.role, anchorStatementsVerified: r.anchorsVerified,
      exactObject: r.exactObject
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
    findings: SPEC.buildFindings,
    /* Stated rather than implied: the captions this family replaced, what the
     * shared capture returned for each, and the measurement that replaced it. */
    captionCorrectionsApplied
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
