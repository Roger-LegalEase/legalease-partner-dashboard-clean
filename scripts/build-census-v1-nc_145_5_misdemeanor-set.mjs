#!/usr/bin/env node
/**
 * PF07 official-form packet family — North Carolina, expunction of NONVIOLENT
 * MISDEMEANOR convictions under G.S. 15A-145.5.
 *
 *   node scripts/build-census-v1-nc_145_5_misdemeanor-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-only:NC:nc_145_5_misdemeanor
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family. Three documents, each bound by exact SHA-256
 * and delivered as the Administrative Office of the Courts publishes them:
 *
 *   * AOC-CR-298 (Rev. 7/25) — the Petition and Order of Expunction under
 *     G.S. 15A-145.5 (Nonviolent Misdemeanor(s)). Side One carries the
 *     petition, a CERTIFICATE OF SERVICE on the district attorney and the
 *     judge's REQUEST to the SBI; Side Two carries the SBI's certification,
 *     the AOC records officer's report, twelve FINDINGS OF FACT, the ORDER and
 *     the CERTIFICATION BY CLERK. This packet writes on none of those.
 *   * AOC-CR-298 instructions — the AOC's own instruction sheet, delivered
 *     unmodified.
 *   * AOC-CV-226 — the Civil Affidavit of Indigency, which the committed
 *     packet-set manifest carries CONDITIONALLY: this petition costs $175.00
 *     per petition and the waiver is available on this form.
 *
 * THE FELONY FORM AND THE MISDEMEANOR FORM ARE NOT INTERCHANGEABLE
 *
 * AOC-CR-297 and AOC-CR-298 sit on the same statute and differ only by offence
 * class. The committed track registry's packetInstructions say so in terms and
 * call a transposed number a live rejection risk. AOC-CR-298's own face prints
 * "For expunction of nonviolent felonies under G.S. 15A-145.5, use form
 * AOC-CR-297." This family is the MISDEMEANOR one and states that on the first
 * screen of its instructions.
 *
 * A FIELD NAME ON THIS FORM IS NOT A STATEMENT ABOUT THIS FORM
 *
 * Measured here from the pinned binary: AOC-CR-298's two waiting-period boxes
 * are named OneNonviolentFelonyWaitingPeriodCkBox and
 * TwoOrThreeNonviolentFeloniesWaitingPeriodCkBox — the FELONY form's field
 * names, carried over into the misdemeanor form. What AOC-CR-298 actually
 * prints beside them is "For expunction of one nonviolent misdemeanor, at
 * least three (3) years ..." and "For expunction of more than one nonviolent
 * misdemeanor ... at least seven (7) years ...". A builder that took the field
 * names for the branches would print felony counts and felony tiers on a
 * misdemeanor petition. Every caption in this map is quoted from the printed
 * page, and build-findings.json records the mismatch for the reviewer.
 *
 * WHY SO LITTLE IS WRITTEN ON A 107-FIELD FORM
 *
 * Eight blanks are written and 99 are not. Most of AOC-CR-298 does not belong
 * to the petitioner: an entire side is the SBI's, the AOC records officer's,
 * the court's and the clerk's, and Side One carries a certificate of service
 * that is false if it is completed before service happens and a judge's
 * request block that is the judge's. Of what does belong to the petitioner,
 * the substance is conviction facts — offence class, disposition,
 * sentence-completion date, restitution, prior expunctions — that no record
 * this platform holds establishes for anybody. The committed packet-set
 * manifest names each of them as something the participant must obtain and
 * confirm against the SBI record, the court file, the sentence-completion
 * documentation and an FBI Identity History Summary. They are declared
 * required-before-filing and disclosed, one by one.
 *
 * THE ELECTION THIS ROUTE DOES NOT MAKE, AND WHY THAT IS NOT A ROUTE DEFECT
 *
 * Paragraph 2 offers two waiting-period branches: three years for ONE
 * nonviolent misdemeanor, seven years for MORE THAN ONE. The route is the same
 * statute and the same form either way; which branch applies turns on how many
 * nonviolent misdemeanor convictions this participant is asking to expunge and
 * when the last sentence finished. That is a fact about a person's record, not
 * a fork in the route, and this packet does not tick it for them.
 *
 * THE AFFIDAVITS THIS PACKET DOES NOT CONTAIN
 *
 * Paragraph 3 certifies that the affidavits required by G.S. 15A-145.5(c1) are
 * attached. They are third parties' sworn statements of the petitioner's good
 * character, not the petitioner's own, and no form in this packet is one. The
 * committed track registry says in terms: "Good-character affidavits are
 * participant-supplied third-party documents. Build the request, do not draft
 * the content." The manifest carries a good_character_affidavit_request
 * component as process guidance; the instructions carry it, and the fact that
 * the packet does not contain the affidavits is stated rather than left to be
 * discovered at the clerk's counter.
 *
 * WHAT THE PARTICIPANT INSTRUCTIONS PRINT, AND WHERE IT COMES FROM
 *
 * The committed packet-set manifest carries an eighteen-line
 * requiredBeforeFiling list for this packet set. It is READ FROM THE COMMITTED
 * RECORD AT BUILD TIME and printed verbatim into participant-instructions.md,
 * and the build REFUSES if the record stops carrying it. A guide that restates
 * a record from memory drifts away from it silently; this one cannot.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "nc_145_5_misdemeanor-set";

/* The committed packet-set manifest, and the exact packet set inside it whose
 * requiredBeforeFiling list this family's participant instructions print. */
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const PACKET_SET_ID = "nc_145_5_misdemeanor-set";

/* The six columns of Side One's offence table, and its two rows. Every caption
 * is quoted from the printed page of the pinned AOC-CR-298. */
const TABLE_COLUMNS = [
  ["FileNumber", "File No.(s)", "the file number of the nonviolent misdemeanor conviction, exactly as the clerk's record prints it"],
  ["ArrestDate", "Date Of Arrest", "the date you were arrested on that charge"],
  ["OffenseDescription", "Offense Description", "the offence description and its CLASS, copied from the official record - paragraph 1 certifies that no offence listed is a Class A1 misdemeanor"],
  ["DateOfOffense", "Date Of Offense", "the date of the offence itself"],
  ["Disposition", "Disposition", "how the charge ended - a plea of guilty, or a finding of guilty"],
  ["DispositionDate", "Date Of Disposition/Conviction", "the date of the conviction. The waiting period runs from this date or from the completion of the whole sentence, whichever is later"]
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-nc_145_5_misdemeanor-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill",
  jurisdiction: "NC",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition and Order of Expunction of Nonviolent Misdemeanor Convictions under G.S. 15A-145.5",
  routeName: "expunging one or more North Carolina nonviolent misdemeanor convictions under G.S. 15A-145.5",
  statutes: ["N.C. Gen. Stat. § 15A-145.5", "N.C. Gen. Stat. § 15A-145.5(a)", "N.C. Gen. Stat. § 15A-145.5(c)", "N.C. Gen. Stat. § 15A-145.5(c1)", "N.C. Gen. Stat. § 15A-145.5(c4)", "N.C. Gen. Stat. § 15A-145.5(c5)", "N.C. Gen. Stat. § 15A-150", "N.C. Gen. Stat. § 15A-151(a1)", "N.C. Gen. Stat. § 15A-153"],
  routes: [{ routeKey: "obligation:track-only:NC:nc_145_5_misdemeanor" }],

  records: [
    {
      recordId: "packet-set-manifest:nc_145_5_misdemeanor-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Under DETERMINATION_FEE_AND_WAIVER_"
        + "STANDARD amendment A2 its participantActionRequired entries are a held source, and here they settle "
        + "the filing destination, the fee and its amount, the indigency waiver, the service position, and "
        + "every record the participant must obtain and confirm before filing. Its requiredBeforeFiling list "
        + "is read from these bytes at build time and printed verbatim into participant-instructions.md",
      mustContain: [
        "File AOC-CR-298 with the clerk of superior court in the county where the charge was brought.",
        "$175 per petition. The costs of expunging the records required under G.S. 15A-150 are separate and are not taxed against the petitioner.",
        "Indigency waiver available on AOC-CV-226, including for petitioners receiving SNAP, TANF or SSI or represented by a legal services organization.",
        "none stated by the review beyond the district attorney notice, which the statute provides for. Confirm against the current AOC-CR-298 before release.",
        "Obtain Good-character affidavits from third parties. Ask people who know you to complete the affidavit section of the form. These are their statements, not yours. LegalEase prepares the request package but cannot supply the content and cannot state that you are of good character.",
        "Obtain Proof of restitution satisfaction. Ask the clerk for confirmation that the restitution has been paid in full.",
        "Applies where the petitioner seeks an indigency waiver of the $175 filing fee.",
        "The nonviolent classification entries — AOC-CR-298, findings and petition entries describing the offence and its class.",
        "The certification of no other non-traffic conviction — AOC-CR-298, petitioner certification entries.",
        "The no-prior-expunction certification — AOC-CR-298, petitioner certification entries."
      ]
    },
    {
      recordId: "track-registry:nc_145_5_misdemeanor",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry entry for this track. It settles the venue and destination "
        + "this packet states, the waiting-period tiers it explains, and it is the source of the exclusions and "
        + "the stop conditions the packet carries word for word",
      mustContain: [
        "Superior Court of the county where the charge was brought.",
        "Clerk of superior court, county where the charge was brought",
        "The waiting period is three years for one nonviolent misdemeanor conviction, for petitions filed on or after July 9, 2025, and seven years for more than one, each measured from the conviction and completion of any active, probationary or post-release sentence, whichever is later.",
        "Any non-traffic conviction at any time other than the offense or offenses being expunged bars relief on this track.",
        "Impaired driving under G.S. 20-138.1 and related offenses. DWI is the classic trap.",
        "Any Class A1 misdemeanor.",
        "Outstanding restitution on the conviction to be expunged, until satisfied.",
        "Good-character affidavits, which require third parties.",
        "This track uses AOC-CR-298. Any archive metadata that crosses the two is corrected against this record.",
        "Good-character affidavits are participant-supplied third-party documents. Build the request, do not draft the content."
      ]
    }
  ],

  officialComponents: {
    petition: {
      sourceId: "official-form:AOC-CR-298",
      documentId: "AOC-CR-298",
      formNumber: "AOC-CR-298",
      officialTitle: "Petition And Order Of Expunction Under G.S. 15A-145.5 (Nonviolent Misdemeanor(s))",
      revision: "REV-2025-07",
      instrumentKind: "primary_filing",
      sha256: "8f526257102e5a5f59bed531e227a2d263d4ef192aaf99fd808a1a866385872b",
      acroform: true,
      captionOnly: false,
      explicitMappings: {},
      unwritable: [
        { field: "PetitionerMailAddress", class: "address_continuation_line",
          why: "The second printed line of the petitioner's address block. It binds participant.street_address exactly as the line above it does, so filling both prints the same street address twice on the face of the petition. The platform holds one street address and writes it once." }
      ]
    },
    instructions: {
      sourceId: "official-form:AOC-CR-298-INSTRUCTIONS",
      documentId: "AOC-CR-298-INSTRUCTIONS",
      formNumber: "AOC-CR-298-INSTRUCTIONS",
      officialTitle: "Instructions For Petition And Order Of Expunction Under G.S. 15A-145.5 (Nonviolent Misdemeanor(s))",
      revision: "REV-2025-07",
      instrumentKind: "instructions",
      sha256: "5d648de001ff725135f8b83eb38a8c45fc5001ae2dd1d2edb2e6e34044117d5c",
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
          why: "The form marks this whole block \"Full Permanent Mailing Address Of Applicant (if different than above)\". The shared descriptors refuse an if-different block, but the ligature in this form's printed caption comes through as \"di(uerent\", so the refusal does not fire and the block BINDS participant.street_address — writing the participant's only address into the block that exists for a DIFFERENT one. The Street Number And Street Name line above it is where that address belongs, and this build writes it there through the narrativeLines channel below." },
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
       * THE APPLICANT'S STREET ADDRESS, ON THE LINE THE FORM PRINTS FOR IT.
       *
       * The platform holds participant.street_address and writes it on
       * AOC-CR-298 page 1. Declaring the same fact required-before-filing on
       * AOC-CV-226 would deliver a sworn affidavit whose applicant block
       * carries City, State and Zip with the street line empty: an address with
       * no street. The completeness contract's REQUIRED_BEFORE_FILING_CONDITIONS
       * names that exact case — "A fact written anywhere else in the same
       * packet is available, and refusing it here is a missing known fact".
       *
       * The ordinary descriptor channel does not reach this caption. The
       * sibling family nc_145_5_felony-set measured it against the live rules
       * and recorded the finding: descriptorsMatching() returns [] for the
       * field name "ApplicantStreetNumberAndStreetNameLine1", for the captured
       * caption and for the caption the form actually prints, because
       * participant.street_address requires one of street addr | mailing addr |
       * addr line N | ^addr | address and none of the three carries any of
       * them; decideBinding therefore returns no_allowlisted_fact_matches
       * before it ever consults explicitMappings. That gap is in
       * scripts/rcap-official-forms/rcap-field-semantics.mjs, which every
       * builder in the corpus shares and this lane does not open. It stays
       * reported in build-findings.json for the lane that owns it.
       *
       * narrativeAcrossFields is the finalizer's own opt-in channel for one
       * held fact laid out on the ruled line a form prints for it. The caller
       * names a FACT ID and a FIELD and nothing else: the module resolves the
       * fact from the same facts set every other write is resolved from, runs
       * the same protect test on the caption and on the field name, refuses if
       * the field is already written or classified unwritable by role, fits the
       * value to that field's own widget rectangle, and REFUSES IT WHOLE rather
       * than truncating if it will not fit at a readable size. No caller text
       * can reach the page through it. It is named here for ONE field and one
       * fact; ApplicantStreetNumberAndStreetNameLine2 is not named and stays
       * optional, and the whole "if different than above" block stays refused
       * by role above.
       *
       * MEASURED HERE on the pinned AOC-CV-226 (sha256 74057a13..) from the
       * document's own content stream rather than from a raster: the caption
       * "Street Number And Street Name, Including Apartment Or Unit Number If
       * Applicable" is printed once, at y 677.4-686.0 across x[38.50,303.60],
       * directly above the widget rect x[37.24,315.01] y[659.06,675.41], and no
       * printed text item lies inside that rect. See CAPTION_CORRECTIONS for
       * the truncation the shared capture returns for the same caption.
       */
      narrativeLines: [
        { factId: "participant.street_address", fields: ["ApplicantStreetNumberAndStreetNameLine1"] }
      ]
    }
  },

  officialCells: {},

  components: ["petition", "instructions", "fee_waiver"],
  componentTitles: {
    petition: "AOC-CR-298 - Petition and Order of Expunction (Nonviolent Misdemeanor(s))",
    instructions: "AOC-CR-298 - The Administrative Office of the Courts' own instructions",
    fee_waiver: "AOC-CV-226 - Civil Affidavit of Indigency"
  },
  componentConditions: {
    fee_waiver:
      "Conditional. The committed packet-set manifest records the fee as \"$175 per petition\" and the waiver as "
      + "\"available on AOC-CV-226, including for petitioners receiving SNAP, TANF or SSI or represented by a "
      + "legal services organization\", and makes the component conditional with the words \"Applies where the "
      + "petitioner seeks an indigency waiver of the $175 filing fee.\" It is used only where the petitioner "
      + "seeks that waiver."
  },
  componentDescriptions: {
    petition: "the AOC-approved petition. The petition on Side One is yours; the certificate of service, the judge's request, and the whole of Side Two are not",
    instructions: "the AOC's own instruction sheet for this form, delivered exactly as published and unmarked",
    fee_waiver: "the indigency affidavit, needed only if you cannot pay the $175.00 filing fee"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Dana Marie Okafor",
      "participant.date_of_birth": "1994-08-03",
      "participant.street_address": "708 Cedar Fork Lane",
      "participant.city": "Greensboro",
      "participant.state": "NC",
      "participant.zip": "27401",
      "participant.phone": "336-555-0173",
      "matter.case_number": "21CR704118",
      "matter.county": "Guilford"
    },
    boundary: {
      "participant.full_legal_name": "Marguerite-Antoinette Vanderhoeven-Castellanos",
      "participant.date_of_birth": "1959-02-28",
      "participant.street_address": "12417 Old Fayetteville Plank Road, Building C, Apartment 2210",
      "participant.city": "Fayetteville",
      "participant.state": "NC",
      "participant.zip": "28306-4471",
      "participant.phone": "(910) 555-0188 ext. 20114",
      "matter.case_number": "1998CR000000704118-B",
      "matter.county": "Cumberland"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "All three documents are the North Carolina Administrative Office of the Courts' own published forms, bound "
    + "by exact SHA-256 through the committed corpus index and delivered as the AOC issues them. AOC-CR-298 "
    + "replaced AOC-CR-281 for nonviolent misdemeanor petitions and says so on its own face; its face also says "
    + "that for expunction of nonviolent FELONIES under the same section the form is AOC-CR-297, which this "
    + "packet is not. The committed track registry pins both identities and records that a transposed number "
    + "between them is a live rejection risk.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: AOC-CR-298 is the AOC's form for a G.S. 15A-145.5 petition on "
    + "nonviolent MISDEMEANOR convictions, and its own title says so. Within that route the form carries "
    + "elections and none of them is one this route decides. Paragraph 2's three-year and seven-year branches "
    + "turn on how many nonviolent misdemeanor convictions the participant is asking to expunge and when the "
    + "last sentence finished — a characterization of their own record that the committed track registry names "
    + "as a point where self-help stops. The District / Superior division boxes follow the court the conviction "
    + "was entered in. The AOC-CR-285 attachment box depends on how many agencies and charges they have. And "
    + "the Petitioner / Petitioner's Attorney boxes are the participant's own election about who signs. Nothing "
    + "is marked, and every box is recorded as the participant's own.",

  routeSelectionsMade: [
    {
      selection: "instrument set",
      value: "AOC-CR-298 with the AOC's own instructions, and AOC-CV-226 conditionally",
      determinedBy:
        "the committed packet-set manifest's components and its file entry — File AOC-CR-298 with the clerk of "
        + "superior court in the county where the charge was brought — together with its apply_fee_waiver entry, "
        + "which names AOC-CV-226 as the waiver instrument"
    },
    {
      selection: "misdemeanor rather than felony instrument under the same section",
      value: "AOC-CR-298, not AOC-CR-297",
      determinedBy:
        "the form's own face, which says that for expunction of nonviolent felonies under G.S. 15A-145.5 the "
        + "form is AOC-CR-297, and the committed track registry's packetInstructions, which pin both identities "
        + "and say in terms \"This track uses AOC-CR-298\""
    }
  ],

  instructionsHeading: "Filing instructions — expunging North Carolina nonviolent misdemeanor convictions (G.S. 15A-145.5)",

  instructionsIntro: [
    "This packet is the Administrative Office of the Courts' own **AOC-CR-298, Petition And Order Of Expunction Under G.S. 15A-145.5 (Nonviolent Misdemeanor(s))**, the AOC's own instruction sheet for that form, and — only if you cannot pay the filing fee — **AOC-CV-226, the Civil Affidavit of Indigency**.",
    "**This is the MISDEMEANOR form.** AOC-CR-298's own face says that for expunction of nonviolent FELONIES under the same section the form is AOC-CR-297. If what you want cleared is a felony, this is the wrong form, and the two are easy to transpose because they sit on the same statute.",
    "**Most of this form is not yours, and that is why so little of it is filled in.** Side One carries the petition, but it also carries a CERTIFICATE OF SERVICE that is only true once the district attorney has actually been served, and a REQUEST BY JUDGE block addressed to the State Bureau of Investigation. The whole of Side Two is the SBI's certification, the AOC records officer's report, twelve FINDINGS OF FACT, the ORDER and the CERTIFICATION BY CLERK. This packet writes nothing on any of them, and neither should you.",
    "The platform filled what it holds and nothing else: your name, your street address, your city, your state, your ZIP code and your date of birth in the petitioner block on Side One, the county in the caption, and the file number in the caption's File No. box. On AOC-CV-226 it filled your name, your street address, your city, state and ZIP, your telephone number and your date of birth.",
    "**The offence table on Side One is left entirely to you.** Its six columns — File No.(s), Date Of Arrest, Offense Description, Date Of Offense, Disposition, Date Of Disposition/Conviction — are conviction facts about your own record, and paragraph 1 asks you to certify that no offence listed is a Class A1 misdemeanor and that none is an exception G.S. 15A-145.5 identifies as ineligible. Those are characterizations of the official record, not of your memory, and the table below tells you which record each column comes from.",
    "**This packet does not contain the affidavits paragraph 3 certifies you have attached.** G.S. 15A-145.5(c1) requires affidavits, and they are other people's sworn statements about you rather than your own. You obtain them; nothing in this packet is one, and the committed legal record for this track says in terms that LegalEase builds the request and does not draft the content."
  ],

  whoDecides: [
    "**The court decides, after a hearing, and three other offices report first.** The district attorney is given notice and may be heard. The State Bureau of Investigation certifies your criminal record and any outstanding warrants or pending cases. The AOC's records officer reports whether you have a prior expunction. Only then does a judge make the twelve findings on Side Two and sign the order.",
    "**The hearing cannot be early.** The form's own NOTE TO CLERK says that regardless of when the SBI and NCAOC reports come back, **the hearing may not be scheduled earlier than 30 days after service of the petition on the district attorney**.",
    "**The district attorney may object.** The committed track record names a district attorney objection as a point where self-help stops. If one is filed, get a North Carolina lawyer before the hearing.",
    "**The clerk sends the order out, not you — with one exception on this form.** Side Two's NOTE TO CLERK says that if the petition is granted the clerk sends a certified copy of the order to you, to the SBI, the Department of Adult Correction, the DMV, the NCAOC and the agencies you list. But the ORDER's own paragraph 1(b) says any OTHER State or local government agency expunges its records **upon receipt of a copy of this Order from the petitioner** — so on this route there is something you may have to deliver, and it is not on the certificate of service.",
    "**Some agencies are notified automatically and must NOT be listed.** The form's own NOTE TO PETITIONER says: do not list the courts, the State Bureau of Investigation, the Department of Adult Correction, or the Division of Motor Vehicles, and do not list any private entity.",
    "**Keep the clerk's office informed of your address.** Side Two's NOTE TO CLERK says the certified copy goes to the petitioner at the address listed on Side One or an updated address as provided by the petitioner."
  ],

  filingDestination: [
    "**File with the clerk of superior court in the county where the charge was brought.** That is the committed packet-set manifest's instruction for this packet, and the committed track record names the same office and the same venue: \"Superior Court of the county where the charge was brought.\"",
    "**Check the county the platform wrote into the caption against the county the conviction was entered in.** They should be the same; if they are not, the caption is wrong and must be corrected before you file.",
    "**The District / Superior division boxes in the caption are yours.** The clerk's office of that county can confirm which applies to your case.",
    "**If your nonviolent misdemeanors are in more than one county**, G.S. 15A-145.5(c4) contemplates petitions filed in separate counties, and paragraph 2's seven-year branch refers to them. That is a sequencing question this packet does not answer; ask a North Carolina lawyer before you file the first one."
  ],

  feeAndWaiver: [
    "**The fee is $175.00 per petition.** The committed packet-set manifest states it in those words, and AOC-CR-298's own face carries the same warning: *NOTE: This petition requires the payment of a filing fee unless the petitioner is an indigent.*",
    "**If you cannot pay it, AOC-CV-226 is in this packet for exactly that.** The manifest records the waiver as \"available on AOC-CV-226, including for petitioners receiving SNAP, TANF or SSI or represented by a legal services organization.\" The affidavit is a full sworn financial statement and every money figure on it is yours; the platform writes none of them.",
    "**A separate cost is expressly not yours.** The manifest records that the costs of expunging the records required under G.S. 15A-150 are separate and are not taxed against the petitioner. That is the cost of carrying the order out.",
    "**Note the words \"per petition\".** If G.S. 15A-145.5(c4) means you file in more than one county, the fee is charged in each. **Ask the clerk of superior court of each county** before you pay."
  ],

  service: [
    "**The district attorney is served, and you certify it on the form itself.** AOC-CR-298 carries a CERTIFICATE OF SERVICE on Side One offering four methods: delivering a copy personally to the district attorney, leaving a copy at the office of the district attorney with an associate or employee, depositing a copy in a postpaid properly addressed envelope with the U.S. Postal Service, and email from ICMS/OFS to the district attorney's email address of record with the court.",
    "**This packet completes none of it, on purpose.** A certificate of service states that service HAS been made. Completing it before you serve would make it untrue on the day you sign it, so every box, the email address, the date served and the signature are left for the moment service actually happens.",
    "**The committed manifest records no other service on this route**: \"none stated by the review beyond the district attorney notice, which the statute provides for\", and asks that this be confirmed against the current AOC-CR-298 before release.",
    "**The 30-day clock starts at service.** The form's NOTE TO CLERK says the hearing may not be scheduled earlier than 30 days after service on the district attorney, so the date you write on the certificate matters.",
    "**After a grant, paragraph 1(b) of the ORDER may require you to deliver a copy.** Any other State or local government agency expunges its records on receiving a copy of the order **from the petitioner**. Ask the clerk for certified copies for that purpose."
  ],

  documentsToObtain: [
    ["A right-to-review copy of your own North Carolina criminal history — the committed manifest says this is what fixes the offence classes that drive the nonviolent analysis, the dispositions and the sentence-completion dates", "the North Carolina Department of Public Safety, State Bureau of Investigation"],
    ["The court file for each conviction", "the clerk of superior court in the county where the charge was brought"],
    ["Documentation that the whole sentence is complete, including any active time, probation and post-release supervision", "the clerk of superior court, or the supervising probation office"],
    ["Proof that any restitution has been paid in full, where restitution was ordered on the conviction to be expunged", "the clerk of superior court in the county of the conviction. Outstanding restitution is an exclusion under the committed track record until it is satisfied"],
    ["The good-character affidavits G.S. 15A-145.5(c1) requires — these are other people's sworn statements, not yours, and none of them is in this packet", "third parties you recruit. The committed record says LegalEase prepares the request package but cannot supply the content and cannot state that you are of good character"],
    ["An FBI Identity History Summary, where the record may extend beyond North Carolina", "the Federal Bureau of Investigation. The committed track record notes that out-of-state and federal convictions are not expungeable here but DO count toward eligibility"]
  ],

  steps: [
    "**Obtain your SBI record, the court file, the sentence-completion documentation, the restitution confirmation and, where your record may extend beyond North Carolina, your FBI Identity History Summary first.** The committed manifest asks you to check your answers about the offence class, the conviction date, the sentence-completion date, the restitution and any out-of-state convictions against those records, and to correct the packet if they disagree.",
    "**Get the good-character affidavits G.S. 15A-145.5(c1) requires.** They take other people's time, they are not in this packet, and paragraph 3 certifies you have attached them.",
    "**Tick District or Superior in the caption**, following the court the conviction was entered in.",
    "**Complete the offence table on Side One, all six columns of each row.** Copy every entry from the official record, not from memory. If there are more convictions than the form has room for, attach AOC-CR-285 and tick the box that says you have; that attachment is not in this packet.",
    "**Read paragraph 1 before you sign anything.** It certifies that no offence listed is a Class A1 misdemeanor and that none is an exception G.S. 15A-145.5 identifies as ineligible. The committed track record adds that impaired driving under G.S. 20-138.1 is the classic trap. If you are not certain of the class of every offence, stop and get a North Carolina lawyer.",
    "**Tick ONE branch of paragraph 2** — one nonviolent misdemeanor at three (3) years, or more than one at seven (7) years — and read the acknowledgement in the first branch: except as G.S. 15A-145.5(c5) provides, expunging one nonviolent misdemeanor before the seven-year period has run will preclude you from expunging additional ones that might otherwise be eligible.",
    "**Write your driver's licence number and state, your race, your sex and your Social Security number yourself.** Your ZIP code and your date of birth are already filled in on the petitioner block; check them against your own records. The table below says which blank each of the rest goes in.",
    "**List the arresting agency and every other State or local agency with a record of your case, with complete addresses.** Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity.",
    "**Tick Petitioner or Petitioner's Attorney in the signature block**, then sign and date the petition and print your name beside it.",
    "**Only if you cannot pay the $175.00 fee, complete AOC-CV-226 in full** — the whole financial statement is yours — and swear it before the officer named on its jurat.",
    "**Serve the district attorney, and only THEN complete the CERTIFICATE OF SERVICE**, ticking the method you actually used and writing the date you actually served. The hearing cannot be set until 30 days after that date.",
    "**File with the clerk of superior court in the county where the charge was brought.** Write nothing on Side Two, nothing in the REQUEST BY JUDGE block, and nothing in the SBI or AOC report blocks."
  ],

  deliberatelyBlank: [
    "**The whole of Side Two of AOC-CR-298.** The SBI's certification, the AOC records officer's report, the twelve FINDINGS OF FACT, the ORDER and the CERTIFICATION BY CLERK all belong to those offices and the court.",
    "**The REQUEST BY JUDGE block on Side One.** It is the presiding judge's direction to the State Bureau of Investigation and the AOC records officer.",
    "**Every part of the CERTIFICATE OF SERVICE, including the service-method boxes, the district attorney's email address of record, the date served and both signature blocks.** A certificate of service is a statement that service has happened; it is completed when it has.",
    "**The whole offence table on Side One**, because every cell in it is a conviction fact from the official record and paragraph 1 turns those cells into a certification about offence class.",
    "**Both branches of paragraph 2**, which turn on how many nonviolent misdemeanors you are asking to expunge and when the last sentence finished.",
    "**Every agency name and address.** The form's own note makes these the petitioner's, and says the clerk will not provide addresses for you.",
    "**Your driver's licence number and state, your race and your sex, and your Social Security number.** The licence number and the Social Security number are government identifiers this build does not write onto any form, and the platform holds no race or sex fact for you. Your ZIP code and your date of birth are NOT in this list: the platform holds both and writes both, on the petitioner block of AOC-CR-298 and on AOC-CV-226.",
    "**The petitioner's-attorney block.** No representation fact is held for you, and this build never writes participant data into a block the court reads as counsel's.",
    "**Every figure on AOC-CV-226.** The affidavit is a sworn financial statement; the platform invents no number.",
    "**Every signature, every date beside one, and every printed name in a signature block, on both forms.**"
  ],

  notTold: [
    "**The class of any offence on your record, or whether it is one of the statute's exceptions.** Paragraph 1 asks you to certify both. The official record answers it; the committed track record names any offence that might be a Class A1 misdemeanor, a Class A through G felony, a DWI, a sex offence, or on the enumerated exclusion list as a point where self-help stops, and records that the full enumerated exclusion list has not been read at the official source and is therefore not encoded anywhere in this packet.",
    "**Whether any other non-traffic conviction anywhere on your record bars you.** The committed track record calls this bar absolute on this track and says it must be screened against the SBI record and not against your recall.",
    "**Whether any restitution is still outstanding.** Outstanding restitution is an exclusion until it is satisfied. Ask the clerk of superior court of the county of the conviction for confirmation that it is paid in full.",
    "**Whether you have a prior expunction under G.S. 15A-145.5.** The AOC's records officer reports it to the court on Side Two, and the committed track record names any prior expunction under that section as a point where self-help stops.",
    "**The name and mailing address of any agency that holds a record of your case.** The form's own note says the clerk will not provide them.",
    "**Whether an out-of-state or federal conviction affects your eligibility.** It is not expungeable here and it does count; the committed track record calls the equivalency analysis a point where self-help stops.",
    "**The session law number for the 2025 change that reduced the one-misdemeanor waiting period to three years.** The committed track record records the July 9, 2025 effective date as corroborated and the session law number as not, and holds it as a release blocker for any citation in participant-facing material. This packet therefore states the three-year period and the effective date and cites no session law for it."
  ],

  stopConditions: [
    "any offence that might be a Class A1 misdemeanor, a Class A through G felony, a DWI, a sex offence, or on the enumerated exclusion list — the committed track record names it, and paragraph 1 of the petition certifies the opposite;",
    "any other non-traffic conviction anywhere on your record, which the committed track record calls an absolute bar on this track;",
    "any prior G.S. 15A-145.5 expunction — the committed track record names it, and generally there is one such expunction in a lifetime;",
    "outstanding restitution;",
    "pending charges;",
    "a district attorney objection;",
    "the good-character affidavits, which require third parties and are not in this packet;",
    "out-of-state or federal convictions requiring equivalency analysis;",
    "any immigration matter — the committed track record notes that an expunction can harm an immigration case by destroying record access;",
    "offence classification itself, which the committed track record names as a point where self-help stops."
  ],

  whatThisIsNot:
    "This is a prepared set of official North Carolina Administrative Office of the Courts forms, delivered as "
    + "the AOC publishes them. It is not legal advice, it is not filed for you, and it does not decide whether "
    + "any conviction of yours is a nonviolent misdemeanor eligible under G.S. 15A-145.5. It is not AOC-CR-297, "
    + "the nonviolent FELONY petition under the same section; it is not AOC-CR-285, the continuation sheet for "
    + "extra agencies or charges; and it contains none of the affidavits G.S. 15A-145.5(c1) requires.",

  receiptDoesNotEstablish: [
    "that these are the current official editions of any of the three AOC forms, or that none has been superseded since the archive was assembled",
    "that any particular North Carolina conviction is a nonviolent misdemeanor within G.S. 15A-145.5",
    "that the enumerated exclusion list of G.S. 15A-145.5(a) is encoded anywhere in this packet — the committed track record holds that list as unread at source and as a build blocker for any eligibility branch, and this packet contains no eligibility branch",
    "that any waiting period has run, or that any restitution has been satisfied"
  ],

  buildFindings: [
    {
      finding:
        "EIGHT WRITES ON A 107-FIELD FORM, and the ratio is the finding rather than a gap. An entire side of "
        + "AOC-CR-298 belongs to the SBI, the AOC records officer, the court and the clerk; Side One carries a "
        + "certificate of service that would be untrue if completed before service and a REQUEST BY JUDGE block "
        + "that is the judge's. Of the remainder, the substance is conviction facts — offence class, "
        + "disposition, sentence completion, restitution, prior expunctions — that no held record establishes "
        + "for any participant.",
      consequence:
        "99 blanks are classified rather than written: protected where the field is the court's, the clerk's, "
        + "the SBI's or a certificate of service; attorney-only where it is counsel's; a genuine participant "
        + "election where the form offers a choice this route does not make; and required-before-filing, with "
        + "the record it is copied from named, for every conviction fact. Each of the manifest's own "
        + "obtain_document and confirm_answer items is carried into participant-instructions.md, and the "
        + "manifest's own eighteen-line requiredBeforeFiling list is printed there verbatim from the committed "
        + "bytes."
    },
    {
      finding:
        "AOC-CR-298 CARRIES THE FELONY FORM'S FIELD NAMES ON ITS TWO WAITING-PERIOD BOXES. Read from the "
        + "pinned binary (sha256 8f526257..), the boxes beside paragraph 2 are named "
        + "OneNonviolentFelonyWaitingPeriodCkBox and TwoOrThreeNonviolentFeloniesWaitingPeriodCkBox. What the "
        + "page prints beside them, read from the same bytes, is \"For expunction of one nonviolent "
        + "misdemeanor, at least three (3) years after the date of conviction listed above or when any active "
        + "sentence, period of probation, and post-release supervision has been served, whichever occurred "
        + "later\" and \"For expunction of more than one nonviolent misdemeanor ... at least seven (7) years "
        + "after my last conviction ...\".",
      consequence:
        "Every caption in this family's map is quoted from the printed page and not from the field name, so "
        + "the disclosure table, the participant instructions and the refusal records all state the three-year "
        + "and seven-year MISDEMEANOR branches. Nothing is ticked either way: which branch applies is a fact "
        + "about the participant's record. The name/caption mismatch is recorded here because a later builder "
        + "or reviewer reading the field names alone would state felony counts and felony tiers on a "
        + "misdemeanor petition, and because the committed track registry already names a transposed "
        + "AOC-CR-297/AOC-CR-298 identity as a live rejection risk."
    },
    {
      finding:
        "CAPTION-CAPTURE DEFECT on Side One's identifier row, the same shared-host defect this jurisdiction's "
        + "other families report, measured here on AOC-CR-298's own bytes. PetitionerZip is captured as "
        + "\"Race\"; DLNo and DLState as \"Drivers License No.StateRaceSex\"; Race as \"State\"; Sex, "
        + "AttorneyMailAddress and AttorneyCity as \"Full Social Security No\"; DOB as \"Date Of BirthFull "
        + "Social Security No\"; SSN as \"NOTE TO PETITIONER\"; and AttorneyState as the opening of the whole "
        + "NOTE TO PETITIONER paragraph.",
      consequence:
        "On THIS form the defect produces no mis-write. It cannot: finalizeOfficialForm resolves a field by "
        + "NAME through form.getField() and fits the value to that field's own widget /Rect, so a captured "
        + "caption selects a fact and tests a protected category but never positions ink. TWO of the affected "
        + "blanks are therefore WRITTEN rather than refused — PetitionerZip and DOB, both facts the platform "
        + "holds and both also written on AOC-CV-226 — after each rect was proved from the pinned form's own "
        + "content stream to sit in its own printed cell. PetitionerZip's rect is x[255.81,315.08] "
        + "y[633.38,646.63], the bottom-right cell of the block captioned \"Name And Address Of Petitioner "
        + "(type or print full name)\" at y=685.56; the printed word \"Race\" is at x[224.28,240.62] y=625.56, "
        + "which is 7.8pt BELOW that rect's lower edge and 15.2pt to the left of it, in the next printed row "
        + "down beside the Race widget x[222.87,267.87] y[609.21,624.79]. DOB's rect is x[36.63,175.30] "
        + "y[585.07,600.65] and the only caption printed above it is \"Date Of Birth\" at x[38.50,78.96] "
        + "y=601.56; \"Full Social Security No.\" begins at x=177.80, 2.50pt clear of DOB's right edge and "
        + "inside SSN's own rect x[177.21,315.08]. The remaining affected blanks stay refused, each declared "
        + "required-before-filing or attorney-only with the true reason stated. Reported for the lane that "
        + "owns scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs."
    },
    {
      finding:
        "THE CERTIFICATE OF SERVICE. AOC-CR-298 carries one on Side One, with four method boxes, the district "
        + "attorney's email address of record, a date served, a signature of the person serving, and an "
        + "acceptance block for the district attorney.",
      consequence:
        "Every field of it is left blank and classified protected, on the completeness contract's own ground "
        + "that a certificate of mailing before mailing has happened must remain blank. The instructions tell "
        + "the participant to serve FIRST and complete it after, and state that the 30-day hearing clock in the "
        + "form's own NOTE TO CLERK runs from the date they write there."
    },
    {
      finding:
        "PARAGRAPH 2's TWO BRANCHES are a case characterization rather than a route election. The three-year "
        + "and seven-year tiers turn on how many nonviolent misdemeanor convictions the participant is asking "
        + "to expunge and when the last sentence finished; the committed track registry records the same two "
        + "tiers and the same measuring point, and names offence classification and the absolute "
        + "any-non-traffic-conviction bar as points where self-help stops.",
      consequence:
        "Both boxes are classified as genuine participant elections with that reason stated, and neither is "
        + "ticked. The route determines the statute and the instrument, and states both; it does not determine "
        + "how many misdemeanors a person has."
    },
    {
      finding:
        "PetitionerMailAddress, the second line of the petitioner's address block, binds "
        + "participant.street_address exactly as PetitionerStreetAddress does.",
      consequence:
        "Refused by role. The platform holds one street address and writes it once; filling both would print "
        + "the same street address twice on the face of the petition."
    },
    {
      finding:
        "AOC-CV-226's \"Full Permanent Mailing Address Of Applicant (if different than above)\" block binds the "
        + "participant's address, because the form's printed ligature comes through as \"di(uerent\" and the "
        + "shared if-different refusal therefore does not fire. The sibling family nc_145_5_felony-set records "
        + "the same finding against the same binary.",
      consequence:
        "The whole block is refused by role, so the address is never written into the block that exists for a "
        + "DIFFERENT one. The Street Number And Street Name line above it is where the address belongs, and it "
        + "is written there through the finalizer's own narrativeAcrossFields channel — see the next finding."
    },
    {
      finding:
        "THE SHARED DESCRIPTOR LIST DOES NOT REACH A STREET-ADDRESS CAPTION WRITTEN THE WAY THE AOC WRITES "
        + "THIS ONE. The sibling family nc_145_5_felony-set measured it against the live rules: "
        + "descriptorsMatching returns [] for the field name \"ApplicantStreetNumberAndStreetNameLine1\", for "
        + "the captured caption and for the caption the form actually prints, because participant."
        + "street_address requires one of street addr | mailing addr | addr line N | ^addr | address and none "
        + "of the three carries any of them; decideBinding returns no_allowlisted_fact_matches before it "
        + "consults explicitMappings, so an explicit mapping cannot reach it either.",
      consequence:
        "Reported for the lane that owns scripts/rcap-official-forms/rcap-field-semantics.mjs, which every "
        + "builder in the corpus shares and this family does not open. In this family the fact is written "
        + "through the finalizer's own opt-in narrativeAcrossFields channel, naming one fact id and one field: "
        + "the module resolves participant.street_address from the same facts set as every other write, runs "
        + "the same protect test on the caption and on the field name, fits it to that widget's own rectangle "
        + "and refuses it whole rather than truncating. The write is recorded in reports/actual-writes.json "
        + "with kind text_narrative_line. Without it the delivered affidavit would carry City, State and ZIP "
        + "with the street line empty — an address with no street on a sworn document."
    },
    {
      finding:
        "CAPTION-CAPTURE TRUNCATION on AOC-CV-226. The shared capture caps an effective label at "
        + "CAPTION_MAX_CHARS = 60; this form's street caption is 78 characters, so the capture returns it cut "
        + "mid-word at \"Unit N\", a caption the form does not print. Nothing binds to it either way, but this "
        + "family's field map, disclosure table and refusal records all quote the effective label.",
      consequence:
        "Corrected in this family's own CAPTION_CORRECTIONS table, measured from the pinned form's own content "
        + "stream, and recorded under captionCorrectionsApplied exactly as the two AOC-CR-298 corrections are. "
        + "The shared capture is untouched."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against A1-A4. The committed packet-set manifest is a held source under A2 and "
        + "answers with a figure: \"$175 per petition\", with the indigency waiver on AOC-CV-226. The form's "
        + "own face carries the same warning.",
      consequence:
        "The packet states the amount, carries the waiver instrument, states separately that G.S. 15A-150 "
        + "expunction costs are not taxed against the petitioner, and draws attention to the words \"per "
        + "petition\" where G.S. 15A-145.5(c4) may mean petitions in more than one county. Per A4 nothing in "
        + "the packet says it does not state an amount, because it does state one."
    },
    {
      finding:
        "THE AFFIDAVITS THE PETITION CERTIFIES ARE ATTACHED ARE NOT IN THIS PACKET. Paragraph 3 certifies that "
        + "the affidavits required by G.S. 15A-145.5(c1) are attached. The packet-set manifest carries a "
        + "good_character_affidavit_request component with outputStrategy process_guidance, and two further "
        + "process_guidance components — record_gathering_guidance and filing_and_followthrough_guidance — "
        + "that this build does not render as separate documents. The committed track registry records why "
        + "the last two are not separate units: \"The record-gathering step is preparation before filing and "
        + "the follow-through step is ordinary post-filing handoff, so neither is a legally distinct unit. "
        + "Both survive as required components and packet instructions on a single official_pdf_fill route.\"",
      consequence:
        "All three are carried in participant-instructions.md, and the absence of the affidavits is stated in "
        + "terms rather than left to be discovered at the clerk's counter. A document mapped and not rendered "
        + "is a missing companion form; a process-guidance component rendered as guidance is not."
    },
    {
      finding:
        "THE GUIDE IS PRINTED FROM THE RECORD, NOT FROM THE BUILDER. The committed packet-set manifest carries "
        + "an eighteen-line requiredBeforeFiling list for this packet set. Three Illinois builders in this "
        + "sprint printed none of their own packet set's list because they never referenced the registry, and "
        + "nine zero counters never saw it.",
      consequence:
        "This build reads legal-design-packet-set-manifests.json at build time, locates packet set "
        + "nc_145_5_misdemeanor-set, and prints its requiredBeforeFiling list verbatim into a dedicated "
        + "section of participant-instructions.md, with the count and the record's SHA-256 stated beside it. "
        + "If the record stops declaring that list — the packet set gone, or the list empty — the build STOPS "
        + "with stopClass RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS rather than printing a guide the "
        + "record no longer supports."
    },
    {
      finding:
        "SIXTY SYNTHESIZED CHECKBOX SQUARES, refused before they were drawn. pdf-lib's default appearance "
        + "provider paints a stroked square sized to the widget /Rect for any check box whose current /AS "
        + "state has no /AP /N entry, and flatten() stamps it. AOC-CR-298 and AOC-CV-226 both ship their "
        + "unmarked boxes as /AS /Off with /Yes the only state in /AP /N, so a conforming viewer paints "
        + "nothing for the current state and the form prints its own smaller box at each position.",
      consequence:
        "suppressSynthesizedAppearances is passed to the finalizer, which installs an EMPTY appearance for the "
        + "state the source omitted so nothing is synthesized and nothing is flattened there. Verified on the "
        + "delivered bytes by scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs."
    },
    {
      finding:
        "SOURCE RESOLUTION. All three of this family's binaries appear more than once in the committed corpus "
        + "index at the same SHA-256 — under master_library, under d_source_packs and, for AOC-CV-226, in the "
        + "nationwide recovery pool — and not every custody is mounted in every container.",
      consequence:
        "This build resolves an index entry by preferring one whose bytes are present AND hash to the pinned "
        + "digest, rather than taking the first entry that carries the hash. The binding is still exact "
        + "SHA-256 and the receipt records which custody supplied the bytes."
    }
  ],

  counselQuestions: [
    "Paragraph 2's three-year and seven-year branches are classified as genuine participant elections rather than route selections, on the ground that the count and the sentence-completion date are facts about the participant's record. Confirm.",
    "The whole CERTIFICATE OF SERVICE is left blank as a certificate of mailing before mailing. Confirm that this, rather than pre-ticking a method, is right.",
    "The packet states the three-year waiting period and the July 9, 2025 effective date but cites no session law for it, because the committed track record holds the session law number as an unverified release blocker. Confirm that stating the period without the citation is right, rather than omitting the period.",
    "The committed track record holds the full G.S. 15A-145.5(a) exclusion list as unread at source and as a build blocker for any eligibility branch. This packet contains no eligibility branch and says so in its receipt. Confirm that building the instrument without the branch is right.",
    "The packet states that ORDER paragraph 1(b) may require the PETITIONER to deliver a copy of the granted order to other State or local agencies, alongside Side Two's NOTE TO CLERK that the clerk sends certified copies. Confirm that stating both is right.",
    "AOC-CV-226 is delivered unconditionally although the manifest makes it conditional on the participant seeking a waiver. Confirm that delivering it with the condition stated is better than omitting it.",
    "The packet names AOC-CR-297, AOC-CR-285 and the G.S. 15A-145.5(c1) affidavits as things the participant may need and this packet does not contain. Confirm that naming without carrying is the right treatment.",
    "The AOC instruction sheet is delivered unmodified as a packet component. Confirm that redistributing the AOC's own instructions inside a prepared packet is appropriate."
  ],

  reviewersAttention: [
    "Eight blanks are written on a 107-field form. The ratio is deliberate and build-findings.json says why for each group.",
    "AOC-CR-298's two waiting-period checkboxes carry the FELONY form's field names. Every caption in this packet is quoted from the printed page instead; please check on the raster that the participant-facing text says three years and seven years for MISDEMEANORS, and that neither box is ticked.",
    "Side Two of AOC-CR-298 and the REQUEST BY JUDGE block on Side One are deliberately untouched in full. Please check on the raster that nothing has landed in the SBI certification, the AOC report, the twelve FINDINGS OF FACT, the ORDER or the CERTIFICATION BY CLERK.",
    "The CERTIFICATE OF SERVICE is entirely blank by design, including the district attorney's email address of record.",
    "AOC-CV-226 is a sworn financial statement. Every money figure on it is blank by design.",
    "The applicant's street address is written on AOC-CV-226's \"Street Number And Street Name\" line through the finalizer's narrativeAcrossFields channel, because no shared descriptor matches that printed caption. Please check on the raster that the street line carries the address, that the second line and the whole \"if different than above\" block below it are empty, and that nothing else on that page moved.",
    "The boundary fixture carries a 60-character street address, a 46-character name and a 20-character file number. Nothing in this build shortens a value: a value that will not fit is refused whole and reported as unfittable. Please check on the raster that no value is clipped at a cell edge.",
    "This packet does not contain the G.S. 15A-145.5(c1) good-character affidavits, and says so.",
    "participant-instructions.md prints the committed packet-set manifest's own eighteen-line requiredBeforeFiling list verbatim, under its own heading, with the record's SHA-256 beside it."
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
        h.write("PetitionerStreetAddress", "Address Of Petitioner - street line", "participant.street_address", 1),
        h.write("PetitionerCity", "Address Of Petitioner - City", "participant.city", 1),
        h.write("PetitionerState", "Address Of Petitioner - State", "participant.state", 1),
        /*
         * THE ZIP AND THE DATE OF BIRTH ARE WRITTEN, AND THE MEASUREMENT IS WHY.
         *
         * Both are affected by the caption-capture defect recorded in
         * build-findings.json. The defect is real and it is still recorded, but
         * it cannot reach a write: finalizeOfficialForm resolves the field by
         * NAME through form.getField() and fits the value to that field's own
         * widget /Rect. The captured caption selects a fact and tests a
         * protected category; it does not position ink.
         *
         * Measured on the pinned AOC-CR-298 (sha256 8f526257..) from the
         * document's own content stream:
         *   DOB  x[36.63,175.30] y[585.07,600.65]. The only caption printed
         *     above it is "Date Of Birth" at x[38.50,78.96] y=601.56. "Full
         *     Social Security No." begins at x=177.80 -- 2.50pt clear of DOB's
         *     right edge -- and sits above SSN's own rect x[177.21,315.08].
         *   PetitionerZip x[255.81,315.08] y[633.38,646.63], the bottom-right
         *     cell of the address block whose one printed caption, "Name And
         *     Address Of Petitioner (type or print full name)", is at y=685.56.
         *     The printed word "Race" is at x[224.28,240.62] y=625.56: 7.8pt
         *     below this rect's lower edge and 15.2pt to its left, in the next
         *     printed row beside the Race widget x[222.87,267.87]
         *     y[609.21,624.79]. PetitionerCity and PetitionerState sit on this
         *     same line and are already written here.
         */
        h.write("PetitionerZip", "Address Of Petitioner - Zip", "participant.zip", 1),
        h.write("DOB", "Date Of Birth on the petition", "participant.date_of_birth", 1),
        h.write("County", "County named in the caption of the petition", "matter.county", 1),
        h.write("FileNumber", "File No. in the caption of the petition", "matter.case_number", 1)
      );

      refusals.push(
        // ---- the caption
        h.agencyBlank("ScanNumbers", "Scan No.(s) in the caption",
          "assigned by the clerk of superior court when the petition is received", 1),
        h.election("DistrictCourtDivisionCkBox", "Caption - District Court division",
          "which division the conviction was entered in is a fact about the participant's own case; the route covers both", 1),
        h.election("SuperiorCourtDivisionCkBox", "Caption - Superior Court division",
          "the other half of the same election", 1),

        // ---- the petitioner block
        h.optional("PetitionerMailAddress", "Address Of Petitioner - second street line",
          "used only if your address needs a second line; the platform holds one street address and writes it on the first", 1),
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
        h.rbf("SSN", "Full Social Security No.",
          "your Social Security number, as the form asks",
          "the shared semantics refuse a Social Security number on any form", 1),

        // ---- the petitioner's attorney block
        h.attorneyBlank("AttorneyName", "Name Of Petitioner's Attorney For Expunction Petition",
          "completed only where an attorney files the petition for you", 1),
        h.attorneyBlank("AttorneyStreetAddress", "Address Of Petitioner's Attorney - street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("AttorneyMailAddress", "Address Of Petitioner's Attorney - second street line",
          "part of the same attorney block", 1),
        h.attorneyBlank("AttorneyCity", "Address Of Petitioner's Attorney - City",
          "part of the same attorney block", 1),
        h.attorneyBlank("AttorneyState", "Address Of Petitioner's Attorney - State",
          "part of the same attorney block", 1),
        h.attorneyBlank("AttorneyZip", "Address Of Petitioner's Attorney - Zip",
          "part of the same attorney block", 1),

        // ---- the attachment box
        h.election("AttachmentCkBox", "Check here to indicate that additional agencies and/or additional file nos. and offenses are listed on an AOC-CR-285 form that is attached to this petition",
          "whether there are more agencies or more offences than this form has room for is a fact about the participant's own case, and AOC-CR-285 is not in this packet", 1),

        // ---- paragraph 2's two waiting-period branches
        /*
         * The FIELD NAMES here are the felony form's, carried over into the
         * misdemeanor form; the captions below are quoted from what
         * AOC-CR-298 actually prints. See build-findings.json.
         */
        h.election("OneNonviolentFelonyWaitingPeriodCkBox",
          "Paragraph 2 - for expunction of ONE nonviolent misdemeanor, at least three (3) years after the date of conviction listed above or when any active sentence, period of probation, and post-release supervision has been served, whichever occurred later",
          "how many nonviolent misdemeanor convictions the participant is asking to expunge, and when the last sentence finished, are facts about their own record; the committed track registry carries the same two tiers and names offence classification as a point where self-help stops", 1),
        h.election("TwoOrThreeNonviolentFeloniesWaitingPeriodCkBox",
          "Paragraph 2 - for expunction of MORE THAN ONE nonviolent misdemeanor, either listed above or listed in this and another petition(s) filed in separate counties pursuant to G.S. 15A-145.5(c4), at least seven (7) years after the last conviction or after any active sentence, period of probation, and post-release supervision has been served, whichever occurred later",
          "the other half of the same case characterization, including misdemeanors listed in a further petition filed in another county under G.S. 15A-145.5(c4)", 1),

        // ---- the petition signature block
        h.election("PetitionerCkBox", "Signature block - the signer is the Petitioner",
          "who signs is the participant's own election between signing personally and signing by counsel", 1),
        h.election("PetitionersAttorneyCkBox", "Signature block - the signer is the Petitioner's Attorney",
          "the other half of the same election", 1),
        h.protectedBlank("PetitionerPetitionersAttorneySignedDate", "Date beside the petitioner's signature",
          "a date written before the petition is signed would be false", 1),
        h.protectedBlank("PetitionerPetitionersAttorneySignedName", "Name (type or print) beside the petitioner's signature",
          "the printed name that accompanies a signature is part of the signature block and is made when the petition is signed", 1),

        // ---- the CERTIFICATE OF SERVICE. Blank until service has happened.
        h.protectedBlank("DeliveringCopyCkBox", "CERTIFICATE OF SERVICE - served by delivering a copy personally to the district attorney",
          "a certificate of service states that service HAS been made; every part of it is completed at the moment service actually happens, and not before", 1),
        h.protectedBlank("LeavingCopyCkBox", "CERTIFICATE OF SERVICE - served by leaving a copy at the office of the district attorney with an associate or employee",
          "part of the same certificate, completed when service is made", 1),
        h.protectedBlank("DepositingCopyCkBox", "CERTIFICATE OF SERVICE - served by depositing a copy in a postpaid properly addressed envelope with the U.S. Postal Service",
          "part of the same certificate, completed when service is made", 1),
        h.protectedBlank("EmailCkBox", "CERTIFICATE OF SERVICE - served by email to the district attorney",
          "part of the same certificate, completed when service is made", 1),
        h.protectedBlank("ICMS/OFSCkBox", "CERTIFICATE OF SERVICE - the email was sent from ICMS/OFS",
          "part of the same certificate, completed when service is made", 1),
        h.protectedBlank("EmailAddressOfRecord", "CERTIFICATE OF SERVICE - the district attorney's email address of record with this court",
          "part of the same certificate, completed when service is made, and it is a third party's address of record with the court rather than a fact about the participant", 1),
        h.protectedBlank("PersonServingSignedDate", "CERTIFICATE OF SERVICE - Date Served",
          "the date of service is the date service happened, and the hearing may not be set earlier than 30 days after it", 1),
        h.protectedBlank("PersonServingSignedName", "CERTIFICATE OF SERVICE - Name Of Person With Whom Copy Left (type or print), beside the signature of the person serving",
          "the printed name accompanies the signature of the person who made service", 1),
        h.agencyBlank("ServiceAcceptedCkBox", "CERTIFICATE OF SERVICE - service accepted by the district attorney",
          "acceptance of service is the prosecuting office's own act", 1),
        h.agencyBlank("PersonAcceptingServiceSignedDate", "CERTIFICATE OF SERVICE - Date Service Accepted",
          "acceptance of service is the prosecuting office's own act, dated by that office", 1),
        h.agencyBlank("PersonAcceptingServiceSignedName", "CERTIFICATE OF SERVICE - Name Of Person Accepting Service (type or print)",
          "acceptance of service is the prosecuting office's own act", 1),

        // ---- the REQUEST BY JUDGE block
        h.protectedBlank("RequestByJudgeSignedDate", "REQUEST BY JUDGE - date beside the presiding judge's signature",
          "the presiding judge dates the request to the SBI and the AOC records officer", 1),
        h.agencyBlank("RequestByJudgeSignedName", "REQUEST BY JUDGE - Name Of Presiding Judge (type or print)",
          "the presiding judge's own block", 1),

        // ---- Side Two: the SBI's certification
        h.agencyBlank("SBIThereIsNoRecordCkBox", "SBI CERTIFICATION - there is no criminal record and no record of outstanding warrants or pending cases",
          "the State Bureau of Investigation certifies its own search", 2),
        h.agencyBlank("SBIThereIsARecordCkBox", "SBI CERTIFICATION - the attached Criminal History Record Information is true and accurate",
          "the State Bureau of Investigation certifies its own search", 2),
        h.agencyBlank("SBISignedDate", "SBI CERTIFICATION - date beside the SBI official's signature",
          "the State Bureau of Investigation dates its own certification", 2),
        h.agencyBlank("SIDNumber", "SBI CERTIFICATION - SID No.",
          "the State Identification number is assigned and written by the State Bureau of Investigation", 2),
        h.agencyBlank("SBISignedName", "SBI CERTIFICATION - Name Of SBI Official (type or print)",
          "the State Bureau of Investigation names its own certifying official", 2),

        // ---- Side Two: the AOC records officer's report
        h.agencyBlank("ThereIsNoRecordCkBox", "REPORT BY AOC - there is no record of any prior expunction under the petitioner's name",
          "the Administrative Office of the Courts reports on its own confidential file", 2),
        h.agencyBlank("ThereIsARecordCkBox", "REPORT BY AOC - there is a record under the petitioner's name and it is attached",
          "the Administrative Office of the Courts reports on its own confidential file", 2),
        h.agencyBlank("RecordsOfficerSignedDate", "REPORT BY AOC - date beside the records officer's signature",
          "the records officer dates their own report", 2),

        // ---- Side Two: the twelve findings, the order, the clerk
        h.agencyBlank("FindingsItem1CkBox", "FINDINGS OF FACT 1 - petitioner was convicted of the nonviolent misdemeanor(s) listed and in the file number(s) shown on Side One",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem2CkBox", "FINDINGS OF FACT 2 - each offence of conviction listed on Side One is eligible for expunction under G.S. 15A-145.5",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem3CkBox", "FINDINGS OF FACT 3 - the applicable three-year or seven-year waiting period has run",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem4CkBox", "FINDINGS OF FACT 4 - the prior-expunction finding",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem4aCkBox", "FINDINGS OF FACT 4(a) - petitioner has not previously been granted an expunction for one or more nonviolent misdemeanors under G.S. 15A-145.5",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem4bCkBox", "FINDINGS OF FACT 4(b) - a prior expunction does not prohibit the relief sought, under subsection (c4) or (c5)",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem4bGoodCauseCkBox", "FINDINGS OF FACT 4(b) - good cause, notwithstanding filing more than 120 days apart from another (c4) petition",
          "a finding of good cause is the court's", 2),
        h.agencyBlank("FindingsItem5CkBox", "FINDINGS OF FACT 5 - petitioner is of good moral character",
          "a finding of fact is the court's, and this platform never states that a participant is of good character", 2),
        h.agencyBlank("FindingsItem6CkBox", "FINDINGS OF FACT 6 - no outstanding warrants, pending cases, indictment or finding of probable cause",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem7CkBox", "FINDINGS OF FACT 7 - petitioner is not free on bond or personal recognizance pending trial, appeal or sentencing",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem8CkBox", "FINDINGS OF FACT 8 - other than a traffic violation not listed on Side One, no other felony or misdemeanor convictions during the applicable waiting period",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem9CkBox", "FINDINGS OF FACT 9 - no convictions for a misdemeanor or felony listed as an exception to \"nonviolent misdemeanor\" or \"nonviolent felony\" in G.S. 15A-145.5(a)",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem10CkBox", "FINDINGS OF FACT 10 - no outstanding restitution orders or civil judgments for restitution",
          "a finding of fact is the court's", 2),
        h.agencyBlank("FindingsItem11CkBox", "FINDINGS OF FACT 11 - the court has reviewed all other information it deems relevant, including affidavits or testimony from law enforcement, district attorneys and victims",
          "a finding of fact is the court's", 2),
        h.agencyBlank("EligibleCkBox", "FINDINGS OF FACT 12 - the petitioner is eligible",
          "the decision is the court's", 2),
        h.agencyBlank("NotEligibleCkBox", "FINDINGS OF FACT 12 - the petitioner is not eligible",
          "the decision is the court's", 2),
        h.agencyBlank("NotEligibleReason", "FINDINGS OF FACT 12 - the court's reason where the petitioner is not eligible",
          "the court states its own reason", 2),
        h.agencyBlank("PetitionIsGrantedCkBox", "ORDER 1 - the petition is granted",
          "the order is the court's", 2),
        h.agencyBlank("PetitionIsDeniedCkBox", "ORDER 2 - for the reason(s) identified in Finding No. 12, the petition is denied",
          "the order is the court's", 2),
        h.protectedBlank("JudgeSignedDate", "ORDER - date beside the presiding judge's signature",
          "the court dates its own order", 2),
        h.agencyBlank("JudgeSignedName", "ORDER - Name Of Presiding Judge (type or print)",
          "the presiding judge's own block", 2),
        h.protectedBlank("ClerkSignedDate", "CERTIFICATION BY CLERK - date beside the certifying officer's signature",
          "the certification is dated when it is made, by the officer who makes it", 2),
        h.agencyBlank("ClerkSignedName", "CERTIFICATION BY CLERK - name of the certifying officer",
          "the clerk of superior court certifies the record", 2),
        h.agencyBlank("DepCSCCkBox", "CERTIFICATION BY CLERK - the certifying officer is a Deputy CSC",
          "which clerk's officer certifies is the clerk's office's own record", 2),
        h.agencyBlank("AsstCSCCkBox", "CERTIFICATION BY CLERK - the certifying officer is an Assistant CSC",
          "which clerk's officer certifies is the clerk's office's own record", 2),
        h.agencyBlank("CSCCkBox", "CERTIFICATION BY CLERK - the certifying officer is the Clerk Of Superior Court",
          "which clerk's officer certifies is the clerk's office's own record", 2)
      );

      // ---- the three agency blocks
      const AGENCIES = [
        ["1", "Arresting Agency", "the name of the agency that arrested you. The form's own note says the clerk will not provide addresses for you"],
        ["2", "Other Agency (if any) - first", "the name of any other State or local government agency with a record of your case. Do NOT list the courts, the SBI, the Department of Adult Correction, the DMV, or any private entity"],
        ["3", "Other Agency (if any) - second", "the name of a further agency, if there is one; use AOC-CR-285 if there are more than the form has room for"]
      ];
      for (const [n, block, whatName] of AGENCIES) {
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
          h.optional(n === "2" ? "Stateagency2" : `StateAgency${n}`, `Address Of ${block} - State`,
            "that agency's state, if you list this agency", 1),
          h.optional(`ZipAgency${n}`, `Address Of ${block} - Zip`,
            "that agency's ZIP code, if you list this agency", 1)
        );
      }

      // ---- the offence table, two rows of six columns
      for (const [field, caption, what] of TABLE_COLUMNS) {
        refusals.push(h.rbf(`${field}:1`, `${caption} - conviction table, row 1`, what,
          "no held record establishes any participant's own conviction, arrest, offence or disposition facts, and a table row completed in part reads as finished when it is not", 1));
        refusals.push(h.optional(`${field}:2`, `${caption} - conviction table, row 2`,
          "the form's own second row, used only if more than one nonviolent misdemeanor conviction is listed on this petition", 1));
      }
    } else if (componentId === "fee_waiver") {
      writes.push(
        h.write("ApplicantName", "Name Of Applicant", "participant.full_legal_name", 1),
        /*
         * The street line of the applicant's address block, written on the line
         * the form prints for it. The fact is the one AOC-CR-298 page 1 already
         * carries; the caption above the rect is quoted here as the pinned form
         * prints it rather than as the capture truncates it; and the channel
         * that carries the write, with the measurement and the refusal it
         * answers, is the narrativeLines note on the fee_waiver document above.
         */
        h.write("ApplicantStreetNumberAndStreetNameLine1",
          "Street Number And Street Name, Including Apartment Or Unit Number If Applicable",
          "participant.street_address", 1),
        h.write("ApplicantCity", "City of the applicant", "participant.city", 1),
        h.write("ApplicantState", "State of the applicant", "participant.state", 1),
        h.write("ApplicantZip", "Zip Code of the applicant", "participant.zip", 1),
        h.write("ApplicantTelephoneNumber", "Telephone Number Of Applicant", "participant.phone", 1),
        h.write("ApplicantDateOfBirth", "Date Of Birth of the applicant", "participant.date_of_birth", 1),
        h.write("CountyName", "County named in the caption of the affidavit", "matter.county", 1),
        h.write("FileNumber", "File No. in the caption of the affidavit", "matter.case_number", 1)
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
        h.election("DistrictCourtDivisionCkBox", "Affidavit caption - District Court division",
          "which division the matter is in follows the participant's own case", 1),
        h.election("SuperiorCourtDivisionCkBox", "Affidavit caption - Superior Court division",
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
        h.election("SigningApplicantIsPlaintiffCkBox", "Affidavit signature block - the signing applicant is the Plaintiff",
          "which party the participant is, restated at the signature block", 2),
        h.election("SigningApplicantIsDefendantCkBox", "Affidavit signature block - the signing applicant is the Defendant",
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

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

/*
 * MEASURED CAPTION CORRECTIONS, AND WHY THEY ARE NOT A WAY ROUND A PROTECT RULE.
 *
 * The shared capture (rcap-pdf-anchor-capture.mjs) reads AOC-CR-298's crowded
 * identifier rows one blank out of step, exactly as it reads AOC-CR-297's. The
 * finalizer's protect test runs on `effectiveLabel ?? name` BEFORE anything
 * else, so a false caption does not merely mislabel a blank -- it decides it.
 * Two blanks are decided wrongly:
 *
 *   PetitionerZip is captured as "Race"      -> protected_category race
 *   DOB is captured as "Date Of BirthFull Social Security No"
 *                                            -> protected_category government_identifier
 *
 * Both facts are held by the platform and both are written on AOC-CV-226, so
 * the contract counts each refusal as a known fact not written. The captions
 * these refusals rest on are not what the form prints.
 *
 * MEASURED HERE, on the pinned AOC-CR-298 (sha256 8f526257..), by walking the
 * page's own content stream rather than a raster -- the same walker that
 * produces the capture, so the caption and the widget rectangle are measured
 * in one coordinate space:
 *
 *   DOB x[36.63,175.30] y[585.07,600.65]. The only caption printed above it is
 *     "Date Of Birth" at x[38.50,78.96] y=601.56. "Full Social Security No."
 *     begins at x=177.80 -- 2.50pt clear of the DOB rect's right edge -- and
 *     lies above SSN's own rect x[177.21,315.08]. The captured label runs the
 *     two together across the cell divider; only the first belongs to DOB.
 *   PetitionerZip x[255.81,315.08] y[633.38,646.63] is the bottom-right cell of
 *     the petitioner address block. NO text item is printed inside that rect.
 *     The block prints one caption, "Name And Address Of Petitioner (type or
 *     print full name)", at x=38.50 y=685.56, and the form prints no
 *     ZIP-specific caption anywhere. The printed word "Race" is at
 *     x[224.28,240.62] y=625.56: 7.80pt BELOW this rect's lower edge and
 *     15.19pt to the left of it, in the next printed row, above the Race widget
 *     x[222.87,267.87] y[609.21,624.79]. "Sex" is at x[270.78,282.84] on the
 *     same printed row, above the Sex widget x[269.46,315.08].
 *
 * So the corrections state what the page shows: "Date Of Birth" for DOB, and
 * no caption for PetitionerZip -- which is exactly what the capture already
 * returns for PetitionerCity and PetitionerMailAddress on the same block.
 *
 * WHAT THIS DOES NOT DO. It does not disable, weaken or bypass a protect rule.
 * The protect test still runs, on the corrected caption AND on the field name,
 * and every other blank on those rows is refused exactly as before: Race
 * (protected by its name), Sex, SSN and DLNo/DLState all still return
 * protected_category. It does not touch the shared capture, which every builder
 * in the corpus sits on and which this lane may not change; the defect stays
 * reported in build-findings.json for the lane that owns it. And it binds no
 * fact by caption: with the correction in place both fields bind through the
 * FIELD NAME channel, so the caption's only remaining job is the one it was
 * failing -- telling the truth about what the form prints.
 *
 * A correction that does not correct the caption it names is refused by
 * censusAcroForm below rather than applied, so a capture repaired upstream
 * stops this build instead of being silently overridden.
 */
const CAPTION_CORRECTIONS = {
  "AOC-CR-298": {
    PetitionerZip: {
      capturedLabel: "Race",
      measuredLabel: null,
      measuredAt: "page 1 rect x[255.81,315.08] y[633.38,646.63]; walking the pinned form's own page-1 content stream returns no text item inside the rect. The rect lies in the block whose single printed caption, \"Name And Address Of Petitioner (type or print full name)\", is at x=38.50 y=685.56. The printed \"Race\" is at x[224.28,240.62] y=625.56 -- 7.80pt below this rect's lower edge and 15.19pt to its left -- above the Race widget x[222.87,267.87] y[609.21,624.79]"
    },
    DOB: {
      capturedLabel: "Date Of BirthFull Social Security No",
      measuredLabel: "Date Of Birth",
      measuredAt: "page 1 rect x[36.63,175.30] y[585.07,600.65]; the pinned form's own page-1 content stream prints \"Date Of Birth\" at x[38.50,78.96] y=601.56 directly above the rect, and \"Full Social Security No.\" at x[177.80,250.15] y=601.56, which begins 2.50pt beyond this rect's right edge and stands above SSN's own rect x[177.21,315.08]"
    }
  },
  /*
   * A THIRD CORRECTION, ON THE OTHER FORM, AND OF A DIFFERENT KIND.
   *
   * The two above are WRONG captions -- a neighbour's word, and two captions
   * run together across a cell divider. This one is a TRUNCATED caption. The
   * shared capture caps an effective label at CAPTION_MAX_CHARS = 60 and
   * AOC-CV-226's street caption is 78 characters, so the capture returns it cut
   * mid-word at "Unit N", which is a caption the form does not print. It is
   * corrected for the same reason as the other two: this family's field map,
   * its disclosure table and its refusal records all quote the effective label,
   * and a truncated quotation of an official form's printed caption is a false
   * statement about the paper.
   *
   * MEASURED HERE on the pinned AOC-CV-226 (sha256 74057a13..) from the
   * document's own content stream: the caption is printed once, at y 677.4-686.0
   * spanning x[38.50,303.60], directly above and inside the same ruled cell as
   * the ApplicantStreetNumberAndStreetNameLine1 widget rect x[37.24,315.01]
   * y[659.06,675.41], and no text item lies inside that rect. The only widget
   * rect that touches it is ApplicantStreetNumberAndStreetNameLine2
   * x[37.24,315.01] y[643.03,659.39] -- the second line of this same captioned
   * block -- which is two stacked lines of one address block rather than a
   * different blank.
   *
   * THIS CORRECTION DOES NOT BY ITSELF MAKE THE WRITE POSSIBLE, and saying so
   * is the point. With the corrected caption in place decideBinding still
   * returns no_allowlisted_fact_matches. The rule that refuses it, and the
   * channel the write is made through instead, are on the fee_waiver document's
   * narrativeLines note above.
   */
  "AOC-CV-226": {
    ApplicantStreetNumberAndStreetNameLine1: {
      capturedLabel: "Street Number And Street Name, Including Apartment Or Unit N",
      measuredLabel: "Street Number And Street Name, Including Apartment Or Unit Number If Applicable",
      measuredAt: "page 1 rect x[37.24,315.01] y[659.06,675.41]; the pinned form's own page-1 content stream prints the caption once at y 677.4-686.0 spanning x[38.50,303.60], directly above the rect and inside the same ruled cell, and prints no text item inside the rect itself. The capture cut that caption at 60 characters, which is CAPTION_MAX_CHARS in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
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
          `caption correction for ${documentId}.${f.name} expected the capture to return ` +
          `${JSON.stringify(fix.capturedLabel)} and it returned ${JSON.stringify(captured)}; ` +
          `re-measure the printed caption before this correction is used`);
      }
      captionCorrectionsApplied.push({
        document: documentId, field: f.name, capturedLabel: fix.capturedLabel,
        measuredLabel: fix.measuredLabel, measuredAt: fix.measuredAt
      });
    }
    return {
      ...f,
      effectiveLabel: fix ? fix.measuredLabel : captured,
      labelBasis: fix ? "measured_from_the_pinned_forms_own_300_dpi_raster_and_rule_strokes" : (c.labelBasis ?? null),
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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

/*
 * WHAT THE COMMITTED RECORD ITSELF DECLARES MUST BE DONE BEFORE FILING.
 *
 * Read from the committed packet-set manifest AT BUILD TIME, by packet set id,
 * and printed verbatim. Three Illinois builders in this sprint printed none of
 * their own packet set's requiredBeforeFiling list because they never
 * referenced the record, and nine zero counters never saw it: the completeness
 * verifier reads canonical-side records and does not read
 * participant-instructions.md against the controlling record at all.
 *
 * So this is not a copy of the list. It IS the list, resolved from the bytes
 * whose SHA-256 the source receipt records, and a build whose record has
 * stopped declaring it STOPS rather than printing a guide the record no longer
 * supports.
 */
function declaredRequiredBeforeFiling() {
  const abs = path.join(ROOT, PACKET_SET_MANIFESTS);
  if (!fs.existsSync(abs)) {
    return { ok: false, why: `the committed packet-set manifest is not at ${PACKET_SET_MANIFESTS}` };
  }
  const bytes = fs.readFileSync(abs);
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); }
  catch (error) { return { ok: false, why: `the committed packet-set manifest does not parse: ${error.message}` }; }
  const set = (manifest.packetSets ?? []).find((s) => s.packetSetId === PACKET_SET_ID);
  if (!set) {
    return { ok: false, why: `the committed packet-set manifest no longer carries packet set ${PACKET_SET_ID}` };
  }
  const items = (set.requiredBeforeFiling ?? []).map((s) => String(s)).filter((s) => s.trim().length > 0);
  if (items.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares a requiredBeforeFiling list` };
  }
  const components = (set.components ?? []).map((c) => ({
    componentId: c.componentId, role: c.role, requirement: c.requirement,
    outputStrategy: c.outputStrategy, officialFormId: c.officialFormId ?? null,
    conditionDescription: c.conditionDescription ?? null
  }));
  if (components.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares any components` };
  }
  return {
    ok: true, items, components,
    path: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
    packetSetVersion: set.version ?? null,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

function participantInstructions(maps, rbf, declared) {
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

  out.push("## Everything the committed record requires before you file", "");
  out.push(
    `These ${declared.items.length} items are printed word for word from the committed packet-set manifest for `
    + `packet set \`${declared.packetSetId}\` (version ${declared.packetSetVersion ?? "unversioned"}), read from `
    + `\`${declared.path}\` at build time. The file's SHA-256 is \`${declared.sha256}\`. Nothing here is this `
    + "packet's own restatement of the record: if the record changes, this list changes with it, and if the "
    + "record stops declaring it the packet is not built.", "");
  for (const item of declared.items) out.push(`- ${item}`);
  out.push("");

  out.push("### The components the same record declares for this packet set", "");
  out.push("| Component | Role | Required | How it is produced | Official form |", "| --- | --- | --- | --- | --- |");
  for (const c of declared.components) {
    out.push(`| \`${c.componentId}\` | ${c.role} | ${c.requirement}${c.conditionDescription ? ` — ${c.conditionDescription}` : ""} | ${c.outputStrategy} | ${c.officialFormId ?? "—"} |`);
  }
  out.push("");
  out.push(
    "The three `process_guidance` components are carried in this document rather than as separate PDFs. The "
    + "committed track registry records why: the record-gathering step is preparation before filing and the "
    + "follow-through step is ordinary post-filing handoff, so neither is a legally distinct unit. The "
    + "good-character affidavit request is guidance for the same reason — the affidavits are third parties' "
    + "sworn statements and this platform builds the request and does not draft the content.", "");

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

  /*
   * THE RECORD THE GUIDE PRINTS FROM, RESOLVED BEFORE ANYTHING IS RENDERED.
   *
   * participant-instructions.md prints the committed packet-set manifest's own
   * requiredBeforeFiling list and its own component table. If the record has
   * stopped declaring either, the guide would silently become this builder's
   * own account of a record that no longer says it. That is a stop, not a
   * degraded build, and it is taken here so that a family which stops leaves
   * its overlay directory untouched.
   */
  const declaredRecord = declaredRequiredBeforeFiling();
  if (!declaredRecord.ok) {
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS",
      why: declaredRecord.why,
      record: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
      overlayDirectoryTouched: false
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
            /* One held fact on the ruled line the form prints for it, where no
             * shared descriptor reaches the printed caption. Named per document
             * and empty for every document that does not name it, so the
             * petition is byte-unaffected. See the fee_waiver document's
             * narrativeLines note for the refusal it answers. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
            unwritableFields: (b.doc.unwritable ?? []).map((u) => ({ field: u.field, class: u.class })),
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            /*
             * SYNTHESIZED CHECKBOX SQUARES, REFUSED BEFORE THEY ARE DRAWN.
             *
             * pdf-lib's default appearance provider paints a black stroked
             * square sized to the widget /Rect for any check box whose CURRENT
             * /AS state has no /AP /N entry, and flatten() stamps it into page
             * content. VF03 measured exactly that on the delivered bytes of the
             * sibling family nc_145_5_felony-set: 60 such squares across
             * AOC-CR-297 and AOC-CV-226, reproduced by a zero-write baseline,
             * so the ink was the sanitizer's and not the family's.
             *
             * The same condition holds on THIS family's binaries: read from the
             * pinned AOC-CR-298 (sha256 8f526257..) and AOC-CV-226 (sha256
             * 74057a13..), the unmarked selection widgets are /AS /Off with
             * /Yes the only state in /AP /N and /MK carrying no /BC and no /BG,
             * so under ISO 32000-1 12.5.5 a conforming viewer paints nothing
             * for the current state. Both AOC forms print their own smaller box
             * at each of those positions, so a synthesized square would hand
             * the participant a doubled outline where the court prints one.
             *
             * Opting in installs an EMPTY appearance for the state the source
             * omitted, so nothing is synthesized and nothing is flattened
             * there. It never touches a widget that ships its own appearance
             * for its current state, a widget of a field this run wrote, a
             * widget with no /AS, or a widget whose /AP /N is a bare stream.
             * Every intended mark and every write is unchanged. The delivered
             * bytes are scanned afterwards by
             * scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs,
             * which is the measurement rather than this note.
             */
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
  const instructionsText = participantInstructions(maps, rbf, declaredRecord);
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
      /*
       * WHAT WAS ACTUALLY DONE TO THIS DOCUMENT'S PAGES, which is not the same
       * question as whether the family declared measured cells for it. This
       * read "delivered_unmodified" for every AcroForm document in the packet,
       * including the ones this build writes onto and flattens -- a false
       * statement about the delivered bytes sitting in the source receipt,
       * where it is exactly the sentence a reviewer would rely on.
       */
      renderStrategy: (SPEC.officialCells?.[b.componentId] ?? []).length > 0
        ? "measured_flat_overlay"
        : b.doc.acroform === true
          ? `acroform_filled_and_flattened_by_the_shared_official_form_finalizer${b.transport ? "_after_a_proven_equivalent_unlock" : ""}`
          : "delivered_unmodified"
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
    /* Stated, not implied: every caption this build corrected before the shared
     * protect test read it, with the capture it replaced and the measurement it
     * rests on. Two entries per fixture build, one per official AcroForm pass. */
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
