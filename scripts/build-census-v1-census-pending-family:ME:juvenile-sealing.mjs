#!/usr/bin/env node
// Route-obligation census v1 — packet family `census-pending-family:ME:juvenile-sealing`.
//
//   node "scripts/build-census-v1-census-pending-family:ME:juvenile-sealing.mjs" [--check] [--no-raster]
//
// Maine, the three-year petition branch of juvenile sealing under
// 15 M.R.S. § 3308-C. Route
// `obligation:runtime-contract-cohort:ME:juvenile-sealing:serious_or_oui_three_year_petition`.
//
// WHICH BRANCH THIS IS, AND WHY THAT IS THE WHOLE POINT
//
// Section 3308-C has two branches and only one of them is a filing. For a
// juvenile adjudicated of a Class D or Class E juvenile crime, or of a juvenile
// crime that would be a civil offense if committed by an adult, the court seals
// the record AUTOMATICALLY within five business days after a Notice of
// Discharge is filed — no petition, no wait, nothing for the participant to
// file. The committed route contract records that in terms: "Qualifying Class
// D, Class E and civil-type juvenile matters enter the automatic branch with no
// separate participant filing wait."
//
// This family is the OTHER branch, and it is narrow: murder, Class A, Class B
// or Class C juvenile crimes, and OUI matters. JV-043 states the same
// restriction on its own printed face. So the first thing this packet's guide
// tells a participant is how to tell whether they need it at all — because a
// participant on the automatic branch who files this petition is paying for a
// filing the statute already gave them.
//
// THE PINNED BINARY IS ENCRYPTED
//
// JV-043 as published is an encrypted PDF: /Filter /Standard, /R 6, AES-256,
// with both streams and strings encrypted. pdf-lib throws in PDFCatalog.Pages
// before it reaches a page, and `ignoreEncryption: true` does not decrypt — it
// only suppresses the throw. The committed corpus index already records the
// consequence: structuralClassObserved "unreadable".
//
// The identity stays the pinned official binary. Its bytes are carried through
// a deterministic pikepdf decryption that is PROVED equivalent to the official
// binary before anything is rendered — page count, page geometry, the terminal
// field set, every field difference, the page content streams and XFA — and the
// family stops rather than rendering if that proof fails. The source's own
// SHA-256 is recomputed from disk before and after the read. The derivative is
// transport: build-time only, never committed, deleted when the build ends.
// This is the treatment already proved on five encrypted California forms and
// on Maine's own CR-218, and it is used here for the same reason and on the
// same terms.
//
// WHAT THIS PACKET WILL NOT SAY
//
// Maine seals; it does not expunge, and sealing does not erase. The compiled
// profile records that courts, criminal justice agencies, the juvenile and the
// juvenile's designee can still reach a sealed juvenile record, and that
// firearm prohibitions are NOT removed by sealing. All three statements are
// carried to the participant in the record's own words. Nothing here promises
// erasure.
//
// A built family is a built family. It is not verified, not approved and not
// sellable, and this builder issues no verdict on its own packets.

const FAMILY_ID = "census-pending-family:ME:juvenile-sealing";
const ROUTE_KEY = "obligation:runtime-contract-cohort:ME:juvenile-sealing:serious_or_oui_three_year_petition";
const PETITION = "petition";

/*
 * THE WORD MAINE'S COMMITTED RECORD FORBIDS IN PARTICIPANT COPY, AND THE ONLY
 * SENTENCES IN WHICH THIS PACKET MAY USE IT.
 *
 * The instruction is jurisdiction-wide, not track-specific: "Maine seals; it
 * does not expunge. The Judicial Branch says in terms that Maine does not have
 * expungement and the record is not completely erased. Never use 'expungement'
 * in Maine participant copy." It is a committed packet instruction on the
 * Maine track registry, and this family binds that record by SHA-256 and
 * re-reads the sentence as an anchor rather than asserting the rule on its own
 * authority.
 *
 * The gate runs over the GENERATED guide before a byte of the overlay directory
 * exists, so a later edit cannot reintroduce the word quietly, and a family
 * that breaches it stops with its directory untouched.
 */
const FORBIDDEN_WORD = "expunge";
const FORBIDDEN_WORD_IS_ALLOWED_ONLY_IN = [
  "Maine seals; it does not expunge",
  "Maine seals and does not expunge"
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-census-pending-family:ME:juvenile-sealing.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill",
  jurisdiction: "ME",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition to Seal Juvenile Case Records, 15 M.R.S. § 3308-C(10)(A)",
  routeName: "petitioning the Maine Juvenile Court to seal juvenile case records on the three-year branch for murder, Class A, B or C juvenile crimes and OUI matters",
  statutes: ["15 M.R.S. § 3308-C", "15 M.R.S. § 3308-C(10)(A)", "29-A M.R.S. § 2411"],
  routes: [{ routeKey: ROUTE_KEY }],

  records: [
    {
      recordId: "route-obligation-census:ME:juvenile-sealing:serious_or_oui_three_year_petition",
      path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      role:
        "the committed route-obligation census entry for this exact route: its statutory authority, its "
        + "participant-facing instrument, the fact that the participant initiates it, and the recorded note "
        + "that the three-year petition branch is limited to murder, Class A, B or C juvenile crimes and OUI "
        + "matters while the qualifying lower-class and civil-type matters enter the automatic branch instead",
      mustContain: [
        ROUTE_KEY,
        "15 M.R.S. § 3308-C",
        "petition under § 3308-C for murder, Class A, B or C juvenile crimes, or OUI matters",
        "Qualifying Class D, Class E and civil-type juvenile matters enter the automatic branch with no separate participant filing wait. The three-year petition branch is limited to murder, Class A, B or C juvenile crimes and OUI matters.",
        "Maine Juvenile Sealing Petition under 15 M.R.S. § 3308-C"
      ]
    },
    {
      recordId: "route-contract:ME:juvenile-sealing",
      path: "src/lib/legal-authority/routes/single-routes.json",
      role:
        "the committed route contract: the mechanism, the statute, the single-stage shape, the "
        + "participant_packet outcome mode, the three-year elapsed-eligibility clock and the fact it is "
        + "anchored to final discharge, the required facts, the exclusions and the two components of the "
        + "packet family",
      mustContain: [
        "\"routeKey\": \"ME:juvenile-sealing\"",
        "Juvenile sealing — petition branch for serious and OUI matters",
        "\"anchorFactId\": \"discharge_date\"",
        "three years from final discharge from the juvenile disposition, subject to the statutory clean-record, no-pending-matter and other conditions",
        "\"packetFamily\": \"Maine Juvenile Sealing Petition under 15 M.R.S. § 3308-C\"",
        "\"Petition under § 3308-C\"",
        "\"Final discharge proof\"",
        "the court acts within this period after final discharge; it is not a prefiling wait"
      ]
    },
    {
      recordId: "track-registry:me-seal-gen:maine-wide-packet-instruction",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed Maine track registry, bound for one jurisdiction-wide packet instruction this family "
        + "is held to as much as any other Maine packet: that Maine seals rather than expunges, that the "
        + "record is not completely erased, and that the word is never used in Maine participant copy. The "
        + "generated guide is gated against that sentence before it is written",
      mustContain: [
        "Maine seals; it does not expunge. The Judicial Branch says in terms that Maine does not have expungement and the record is not completely erased. Never use 'expungement' in Maine participant copy."
      ]
    },
    {
      recordId: "compiled-profile:ME-maine#juvenile-sealing",
      path: "src/lib/rcap-engine/compiled/profiles/ME-maine.json",
      role:
        "the compiled Maine profile's juvenile-sealing pathway: the automatic branch and its five-business-day "
        + "court period, the three petition conditions, the court's discretion and the standard it exercises "
        + "it against, what sealing does and does not do, who can still reach a sealed juvenile record, the "
        + "firearm statement, and the Judicial Branch form number for this petition",
      mustContain: [
        "\"id\": \"juvenile-sealing\"",
        "For juvenile adjudications that would be murder, Class A, Class B, Class C, or OUI if committed by an adult, the person may petition to seal if:",
        "Waiting period At least 3 years after discharge from the juvenile disposition",
        "New juvenile/adult record No later juvenile adjudication or adult conviction since disposition",
        "Pending matters No current juvenile or adult proceedings pending",
        "Juvenile sealing petition JV-043 - Petition to Seal Juvenile Case Records"
      ]
    }
  ],

  officialComponents: {
    [PETITION]: {
      sourceId: "official-form:JV-043",
      documentId: "JV-043",
      formNumber: "JV-043",
      officialTitle: "Petition to Seal Juvenile Case Records",
      revision: "REV-2021-12",
      instrumentKind: "Maine § 3308-C(10)(A) juvenile sealing petition",
      sha256: "79d0e40df56d060a4bd51f9f022cc95b444b5791f486c3e7c92640d76ed095e7",
      acroform: true,
      captionOnly: false,
      /*
       * THE PINNED BINARY IS ENCRYPTED. See the header. The identity below is
       * the official one; this flag says the bytes must be carried through a
       * proven-equivalent decryption before any toolchain can read them, and
       * the family stops if the proof fails.
       */
      transportUnlock: {
        why:
          "the pinned official binary is an encrypted PDF (/Filter /Standard, /R 6, AES-256, /StmF /StdCF "
          + "/StrF /StdCF); pdf-lib throws \"Expected instance of PDFDict, but got instance of undefined\" in "
          + "PDFCatalog.Pages before it reaches a page, and ignoreEncryption: true suppresses the throw "
          + "without decrypting anything, so neither a census nor an ink audit is possible against those "
          + "bytes directly. The committed corpus index already records structuralClassObserved "
          + "\"unreadable\" for this entry.",
        method: "pikepdf.open(exact_pinned_source).save(derivative, deterministic_id=True)",
        equivalenceReader: "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
        precedent:
          "scripts/build-census-v1-me-seal-gen-set.mjs over the encrypted Maine Judicial Branch CR-218, itself "
          + "following scripts/build-census-v1-ca-1203-4-set.mjs over five encrypted California forms"
      },
      /*
       * THE SIGNATURE AND THE DATE BESIDE IT, REFUSED BY ROLE.
       *
       * The signature widget on this form is NAMED "undefined" - the Judicial
       * Branch left it unnamed and the extractor supplies that string - and its
       * caption, "Signature of Juvenile", is printed BELOW the rule it belongs
       * to. A refusal that depends on a name that is not a name, or on a
       * caption the harvester has to find underneath the widget, is a refusal
       * resting on two things that could each move. Role is checked first in
       * the finalizer and is not overridable by any name or caption match, so
       * both are declared here as well as in the field map.
       */
      unwritable: [
        { field: "undefined", class: "participant_signature" },
        { field: "Date mmddyyyy", class: "participant_signature_date" }
      ],
      /*
       * THREE FIELDS THE ORDINARY DESCRIPTOR CHANNEL CANNOT REACH, EACH WRITTEN
       * THROUGH THE FINALIZER'S OWN narrativeAcrossFields CHANNEL - one held
       * fact per field, no caller text of any kind.
       *
       * `Juvenile` is the caption block's name line. Measured on the unlocked
       * derivative: the widget sits at x[31.1,243.1] y[655.8,672.2] and the
       * word "Juvenile" is printed at y=659, BELOW it, as this form prints
       * every caption. Neither the field name nor that caption matches any
       * allowlisted descriptor - "juvenile" is not among the party words the
       * name descriptor knows - so decideBinding has nothing to match and the
       * caption of a petition would ship with no petitioner on it while the
       * platform holds the name.
       *
       * `Mailing Address 1` and `Mailing Address 2` are the two stacked lines
       * of one address block. BOTH match the street-address descriptor, which
       * matches `addr(ess)?\s*(line\s*)?\d`, so the ordinary channel would
       * write the street line onto both of them and deliver a petition whose
       * mailing address has no city, state or ZIP and repeats the street twice.
       * That is the AOC-CV-226 defect this sprint has recorded before. Line one
       * takes participant.street_address and line two takes
       * participant.city_state_zip, both established fact ids in the platform's
       * own vocabulary.
       *
       * The channel resolves each fact from the same facts set as every other
       * write, runs the same protect test on the caption and the field name,
       * fits the value to that widget's own rectangle, and REFUSES IT WHOLE
       * rather than truncating.
       */
      /*
       * THE DATE OF BIRTH, IN THE ORDER THE FORM ASKS FOR IT.
       *
       * The printed caption is "The above-named juvenile, whose date of birth
       * is (mm/dd/yyyy)", and the platform holds the fact as an ISO date. An
       * ISO date on that line is not a shorter answer or a differently
       * formatted one, it is a DIFFERENT DATE to anyone reading the page: a
       * juvenile born on 6 November 2004 would be shown as 2004-11-06 on a
       * line whose own caption says the first number is the month. The
       * finalizer's own printed-order channel renders it 11/06/2004 instead.
       *
       * Named explicitly rather than inferred from the caption: the field name
       * carries "mmddyyyy" and the caption carries "(mm/dd/yyyy)", and a build
       * that guessed the order from either would guess it from a string that
       * could be reworded.
       */
      printedDateOrder: { "The abovenamed juvenile whose date of birth is mmddyyyy": "month_day_year" },
      narrativeLines: [
        { factId: "participant.full_legal_name", fields: ["Juvenile"] },
        { factId: "participant.street_address", fields: ["Mailing Address 1"] },
        { factId: "participant.city_state_zip", fields: ["Mailing Address 2"] }
      ]
    }
  },

  officialCells: {},

  components: [PETITION],
  componentTitles: {
    [PETITION]: "JV-043 — Petition to Seal Juvenile Case Records (15 M.R.S. § 3308-C(10)(A))"
  },
  componentConditions: {},
  componentDescriptions: {
    [PETITION]:
      "the Maine Judicial Branch's own one-page petition, delivered exactly as it publishes it. The caption "
      + "name, the date of birth and your contact block are filled in; the court location, the docket number, "
      + "the gender boxes and your signature are yours"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Casey Lorraine Thibodeau",
      "participant.date_of_birth": "2004-11-06",
      "participant.street_address": "34 Winter Harbor Road",
      "participant.city_state_zip": "Bangor, ME 04401",
      "participant.phone": "207-555-0142",
      "participant.email": "casey.thibodeau@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Jean-Baptiste Ouellette-Michaud III",
      "participant.date_of_birth": "1998-01-09",
      "participant.street_address": "1785 Presque Isle Ridge Road, Apartment 3B",
      "participant.city_state_zip": "Presque Isle, ME 04769-1183",
      "participant.phone": "(207) 555-0199 ext. 4417",
      "participant.email": "jean.baptiste.ouellette.michaud@longmailexample.org"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "JV-043 is the Maine Judicial Branch's own published Petition to Seal Juvenile Case Records, Rev. 12/21, "
    + "one page, bound by exact SHA-256 through the committed corpus index - resolved BY DIGEST rather than by "
    + "form number or filename - and delivered as the Judicial Branch issues it. The pinned binary is an "
    + "encrypted PDF; this build carries it through a deterministic pikepdf decryption proved equivalent to "
    + "the official binary page for page, field for field and content stream for content stream, and stops "
    + "rather than rendering if that proof fails. The bound identity is the official encrypted binary and its "
    + "SHA-256 is recomputed from the file on disk before and after the read. Nothing is composed, substituted "
    + "or invented.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument and by the form's own printed face. JV-043 cites 15 M.R.S. "
    + "§ 3308-C(10)(A) under its title, and its opening sentence restricts itself to a juvenile crime that, if "
    + "the juvenile were an adult, \"would constitute murder or a Class A, B, or C, or operating under the "
    + "influence as defined in Title 29-A, section 2411\" - which is this route's cohort and not the other "
    + "branch's. There is no statutory election anywhere on the form to make: the three checkboxes on the "
    + "caption line are the juvenile's gender, which is a fact about the person and not a choice of route, and "
    + "they are left for the participant with the guide telling them to mark one.",

  routeSelectionsMade: [
    {
      selection: "branch of 15 M.R.S. § 3308-C",
      value: "the three-year petition branch for murder, Class A, B or C juvenile crimes and OUI matters, not the automatic branch",
      determinedBy:
        "the committed route-obligation census note - \"Qualifying Class D, Class E and civil-type juvenile "
        + "matters enter the automatic branch with no separate participant filing wait. The three-year "
        + "petition branch is limited to murder, Class A, B or C juvenile crimes and OUI matters.\" - and the "
        + "form's own printed restriction to the same cohort"
    },
    {
      selection: "instrument",
      value: "JV-043, Petition to Seal Juvenile Case Records, and no proposed order",
      determinedBy:
        "the compiled Maine profile's own form table, \"Juvenile sealing petition JV-043 - Petition to Seal "
        + "Juvenile Case Records\", and the committed route contract, whose packetComponents are the petition "
        + "under § 3308-C and proof of final discharge and which names no order form"
    }
  ],

  instructionsHeading: "What to do — petitioning the Maine Juvenile Court to seal juvenile case records under 15 M.R.S. § 3308-C",

  instructionsIntro: [
    "**Read this first: you may not need to file anything at all.** Section 3308-C has two branches. If the juvenile crime was a Class D or Class E juvenile crime, or a juvenile crime that would be a civil offense if committed by an adult, the court seals the record BY ITSELF — the compiled record states it as: \"the court automatically seals the juvenile court record within 5 business days after a Notice of Discharge is filed with the Juvenile Court.\" There is no petition and no waiting period on that branch. The committed route contract says the same thing: \"Qualifying Class D, Class E and civil-type juvenile matters enter the automatic branch with no separate participant filing wait.\"",
    "This packet is the OTHER branch, and it is narrow. It is for a juvenile adjudication that, if the juvenile were an adult, would be murder, a Class A, Class B or Class C crime, or operating under the influence under 29-A M.R.S. § 2411. JV-043 prints that restriction on its own face. If your matter is not in that group, do not file this petition — find out whether the automatic branch has already sealed your record.",
    "This packet is the Maine Judicial Branch's own form, filled in with what the platform holds about you and left blank everywhere it does not. It filled in your name, your date of birth, your mailing address, your telephone number and your email. The court location, the docket number, the gender boxes and your signature are yours.",
    "**Maine seals; it does not expunge.** Sealing does not erase the juvenile record. The compiled record states who can still reach it: \"Maine courts, criminal justice agencies, the juvenile, and the juvenile's designee can still access sealed juvenile records; the public generally cannot.\""
  ],

  whoDecides: [
    "A judge of the Maine Juvenile Court, on the petition. The compiled record states the standard: \"The court may grant unless the public's right to information substantially outweighs the juvenile's privacy interest.\" That is a discretionary judgment and no packet can make it for you.",
    "The three conditions the compiled record records for this branch are: \"Waiting period At least 3 years after discharge from the juvenile disposition\"; \"New juvenile/adult record No later juvenile adjudication or adult conviction since disposition\"; and \"Pending matters No current juvenile or adult proceedings pending.\"",
    "The three years run from FINAL DISCHARGE, not from the adjudication and not from any release. The committed route contract anchors the clock to the discharge date and words it as \"three years from final discharge from the juvenile disposition, subject to the statutory clean-record, no-pending-matter and other conditions.\""
  ],

  filingDestination: [
    "The Juvenile Court. JV-043's own opening sentence says the juvenile \"hereby petitions the Juvenile Court to seal from public inspection all juvenile case records pertaining to the juvenile crime and its disposition and any prior juvenile case records and their dispositions.\"",
    "**No committed record this packet binds states which court location takes it, and this build does not choose one for you.** The route-obligation census records this route's destination as \"not recorded\". The form prints a Location (Town) line at the head of the caption; write in the town of the District Court that handled your juvenile case, as the caption of your own case names it, and ask a court clerk if you are not sure."
  ],

  feeAndWaiver: [
    "**No committed record this packet binds states a filing fee for this petition, and none states that there is no fee.** Ask the clerk of the court you are filing in what it charges before you go. This packet quotes no figure because no record it binds gives one.",
    "The compiled Maine profile does record the Judicial Branch's fee-waiver instruments — \"Fee waiver CV-067 - Application to Proceed Without Payment of Fees\" and \"Fee waiver financial affidavit CV-191 - Financial Affidavit\". Neither is bound to this family and neither is in this packet. If the clerk tells you there is a fee and you cannot pay it, ask the clerk for CV-067 and CV-191."
  ],

  service: [
    "**No committed record this packet binds states a service requirement for this petition, and JV-043 carries no certificate-of-service block of any kind.** Ask the clerk of the court you are filing in whether anyone must be served and how.",
    "No committed record states a notarization requirement for this petition. JV-043 carries a plain signature line, not a jurat."
  ],

  documentsToObtain: [
    ["Proof of your final discharge from the juvenile disposition", "From the Juvenile Court that handled the case. The committed route contract names this as the second component of this packet family, beside the petition itself, and the three-year clock is measured from the date on it. This platform cannot obtain it for you and does not have it."],
    ["The docket number and court location of the juvenile case", "From the Juvenile Court's own file, or from the paperwork you were given at the time. Both go in the caption at the head of the petition and neither is held by this platform."]
  ],

  steps: [
    "**Check which branch you are on first.** If the juvenile crime was Class D, Class E, or would be a civil offense for an adult, the court seals the record automatically after a Notice of Discharge and this petition is not your route.",
    "**Check the three-year clock against your final discharge date**, not against the adjudication date and not against any release date.",
    "**Get proof of your final discharge** from the Juvenile Court, and the docket number and court location from its file.",
    "**Fill in the blanks listed below** on the petition: the court location, the docket number, and the gender box on the caption line.",
    "**Sign and date the petition personally.** This platform never signs for you and never dates a signing line.",
    "**Ask the clerk what the filing fee is, if any, and whether anyone must be served**, before you file. No record this packet binds answers either question.",
    "**File the petition with the Juvenile Court**, with your proof of final discharge."
  ],

  deliberatelyBlank: [
    "**Your signature and the date beside it.** A signature is yours alone, and a date written before you sign would be false. On this form the signature widget is not even named by the Judicial Branch, and it is refused by role rather than by name so that nothing can reach it.",
    "**The Location (Town) and Docket No. lines in the caption.** They come from your own case file and no committed record establishes them for any particular Maine juvenile matter.",
    "**The gender boxes on the caption line.** They are a fact about you, not a choice this platform may make."
  ],

  notTold: [
    "What the filing fee is, or whether there is one. No committed record this packet binds states a fee for this petition or states that there is none.",
    "Whether anyone must be served. No committed record states a service requirement, and the form carries no certificate-of-service block.",
    "Which court location takes the petition. The route-obligation census records this route's destination as \"not recorded\".",
    "Whether the court will grant it. The standard the compiled record gives is discretionary — the court may grant unless the public's right to information substantially outweighs the juvenile's privacy interest."
  ],

  stopConditions: [
    "The juvenile crime was a Class D or Class E juvenile crime, or would be a civil offense for an adult. That is the automatic branch and this petition is the wrong instrument.",
    "There has been a later juvenile adjudication or an adult conviction since the disposition. The compiled record makes a clean record a condition of this branch.",
    "There is a current juvenile or adult proceeding pending. The compiled record makes the absence of pending matters a condition of this branch.",
    "Three years have not passed since final discharge, or you cannot establish the final-discharge date.",
    "You are relying on sealing to remove a firearm prohibition. The compiled record states in terms that \"firearm prohibitions are not removed by sealing.\"",
    "Anyone tells you sealing erases the record. It does not, and the compiled record names who still has access.",
    "Immigration consequences are in play."
  ],

  whatThisIsNot:
    "This is the Maine Judicial Branch's own petition form, filled in with what the platform holds and left "
    + "blank everywhere it does not. It is not legal advice, it is not filed for you, it does not establish "
    + "that you are on the petition branch rather than the automatic one, and it does not decide whether the "
    + "court will grant it. Maine seals and does not expunge: the compiled record states that Maine courts, "
    + "criminal justice agencies, the juvenile and the juvenile's designee can still access a sealed juvenile "
    + "record, and that firearm prohibitions are not removed by sealing.",

  receiptDoesNotEstablish: [
    "that any juvenile adjudication falls on the three-year petition branch rather than the automatic branch",
    "that three years have run from final discharge, or that any clean-record or no-pending-matter condition is met",
    "that any court location or docket number is the right one for a particular juvenile case"
  ],

  buildFindings: [
    {
      finding:
        "The pinned JV-043 binary is an ENCRYPTED PDF - /Filter /Standard, /R 6, AES-256, /StmF /StdCF /StrF "
        + "/StdCF - and pdf-lib cannot read it. The committed corpus index already records "
        + "structuralClassObserved \"unreadable\" for this entry, and the source-identity sweep's own "
        + "acroFieldCount of 14 was produced by a reader that is not the one every builder in this factory "
        + "uses.",
      consequence:
        "The bytes are carried through the repository's proven transport unlock: pikepdf opens the exact "
        + "pinned source and saves a derivative with deterministic_id, the derivative is proved equivalent to "
        + "the official binary by the repository's own fidelity reader, and the family stops rather than "
        + "rendering if the proof fails. Measured on this build: page count identical, page geometry "
        + "identical, no field only in one side, no field difference, content stream identical on the single "
        + "page, derivative not encrypted, source SHA-256 unchanged before and after. The derivative is "
        + "build-time only and is never committed."
    },
    {
      finding:
        "Three of the fourteen fields cannot bind through the ordinary descriptor channel. `Juvenile` is the "
        + "caption's name line, and neither its field name nor its printed caption is among the party words "
        + "the name descriptor knows. `Mailing Address 1` and `Mailing Address 2` BOTH match the "
        + "street-address descriptor, which matches `addr(ess)?\\s*(line\\s*)?\\d`, so the ordinary channel "
        + "would write the street line onto both and deliver a mailing address with no city, state or ZIP.",
      consequence:
        "All three are written through the finalizer's own opt-in narrativeAcrossFields channel, one held fact "
        + "per field and no caller text of any kind. Reported here for the lane that owns "
        + "scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane does not open."
    },
    {
      finding:
        "The signature widget on this form is NAMED \"undefined\" - the Judicial Branch left it unnamed - and "
        + "its caption \"Signature of Juvenile\" is printed BELOW the rule rather than beside it.",
      consequence:
        "Both the signature and the date beside it are declared unwritable BY ROLE, which the finalizer checks "
        + "first and does not allow any name or caption match to override, as well as being declared protected "
        + "in the field map. A refusal that rested on a name that is not a name would be one rename away from "
        + "signing a petition for somebody."
    },
    {
      finding:
        "This route's destination is recorded as \"not recorded\" in the route-obligation census, and no "
        + "committed record this family binds states a filing fee, a fee-waiver route or a service "
        + "requirement for this petition.",
      consequence:
        "The packet states each of those as an express non-statement and names the office that answers it - "
        + "the clerk of the court being filed in - rather than quoting a figure or a rule no record supports. "
        + "The compiled profile's CV-067 and CV-191 fee-waiver instruments are named to the participant but "
        + "are not bound to this family and are not in the packet."
    },
    {
      finding:
        "READING THE DELIVERED BYTES CAUGHT A DATE IN THE WRONG ORDER. The first build of this family passed "
        + "all nine counters and rendered the date of birth as \"2004-11-06\" onto a line whose own printed "
        + "caption reads \"whose date of birth is (mm/dd/yyyy)\". No counter can see that: the value is "
        + "present, visible, inside its widget and bound to the right fact, and the completeness contract has "
        + "nothing that compares a rendered value against the order the form prints beneath it.",
      consequence:
        "The finalizer's own printedDateOrderByField channel is now declared for that field and the page "
        + "renders 11/06/2004. Named explicitly rather than inferred, because both the field name and the "
        + "caption carry the order as a string that could be reworded. Recorded here because it is a defect "
        + "class the nine counters do not reach, and the only thing that found it was diffing the delivered "
        + "page against the pinned source item by item."
    },
    {
      finding:
        "The committed route contract's packetComponents are two: \"Petition under § 3308-C\" and \"Final "
        + "discharge proof\". Only the first is a document this platform can render.",
      consequence:
        "Proof of final discharge is carried as a document the participant must obtain, named in "
        + "participant-instructions.md with where to get it and why the three-year clock depends on it. It is "
        + "not silently dropped and it is not invented."
    }
  ],

  counselQuestions: [
    "The packet states no filing fee and no service requirement because no committed record it binds states either, and directs the participant to the clerk for both. Confirm that delegation, or supply the content.",
    "The route's destination is recorded as \"not recorded\" and the packet asks the participant to write in the court location. Confirm that is right for a Juvenile Court filing, or supply the venue rule.",
    "The three gender checkboxes on the caption line are left for the participant as required-before-filing items rather than being treated as an election. Confirm that treatment.",
    "The guide opens by telling the participant they may be on the automatic branch and should not file at all. Confirm the wording of that warning against the statute."
  ],

  reviewersAttention: [
    "The pinned source is an ENCRYPTED PDF. The rendered page comes from a build-time pikepdf decryption of those exact bytes, proved equivalent page for page, field for field and content stream for content stream. Please check on the raster that the delivered page is the Judicial Branch's JV-043 Rev. 12/21 as published.",
    "Please check the raster shows the signature line and the date beside it EMPTY. The signature widget is named \"undefined\" on this form and is refused by role rather than by name.",
    "The mailing address occupies two stacked widgets. Please check the raster shows the street line on the first and the city, state and ZIP on the second, and not the street twice.",
    "The BOUNDARY fixture carries a 52-character email address and a 42-character street line to exercise the fitter on this form's narrow contact widgets; the canonical fixture shows ordinary values.",
    "The date of birth renders as 11/06/2004, not as an ISO date, because the form prints \"(mm/dd/yyyy)\" beside the line. Please check the raster shows month first.",
    "One printed line of the source, at y=474, extracts as mojibake (\"Po Yv}}µ...\"). It is a font-encoding artifact of the Judicial Branch's own published file, it is present identically in the source and in the delivered page, and this build neither introduced it nor can repair it without altering the official bytes. It is called out here so a reviewer reading an extraction does not mistake it for damage this build caused."
  ],

  composedBody() {
    throw new Error("this family composes no pages: its only component is the official JV-043 petition");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === PETITION) {
      writes.push(
        h.write("Juvenile", "Juvenile (the caption block at the head of the petition; the form prints this caption BELOW the rule)", "participant.full_legal_name", 1),
        h.write("The abovenamed juvenile whose date of birth is mmddyyyy", "The above-named juvenile, whose date of birth is (mm/dd/yyyy)", "participant.date_of_birth", 1),
        h.write("Printed Name", "Printed Name:", "participant.full_legal_name", 1),
        h.write("Mailing Address 1", "Mailing Address - first line", "participant.street_address", 1),
        h.write("Mailing Address 2", "Mailing Address - second line", "participant.city_state_zip", 1),
        h.write("Telephone", "Telephone:", "participant.phone", 1),
        h.write("Email", "Email:", "participant.email", 1)
      );

      refusals.push(
        h.rbf("Location Town", "Location (Town): in the caption at the head of the petition",
          "the town in which the Juvenile Court that handled your case sits, as the caption of your own case names it. Ask a court clerk if you are not sure",
          "no committed record this family binds establishes the court location for any particular Maine juvenile case, and the route-obligation census records this route's destination as \"not recorded\"", 1),
        h.rbf("Docket No", "Docket No.: in the caption at the head of the petition",
          "the docket number of the juvenile case you want sealed, from the court's own file or from the paperwork you were given",
          "the platform holds no docket number for any juvenile matter, and the shared binder additionally reads a bare \"Docket No.\" caption as a repeating charge-row label demanding an indexed fact this one-case petition does not have", 1),
        h.rbf("Check Box1", "Gender on the caption line - the box for male",
          "mark ONE of the three gender boxes on the caption line: male, female or other. This one is male",
          "the juvenile's gender is a fact about the person and the platform holds no gender fact; this build marks no box on a petition on the participant's behalf", 1),
        h.rbf("Check Box2", "Gender on the caption line - the box for female",
          "mark ONE of the three gender boxes on the caption line: male, female or other. This one is female",
          "the juvenile's gender is a fact about the person and the platform holds no gender fact; this build marks no box on a petition on the participant's behalf", 1),
        h.rbf("Check Box3", "Gender on the caption line - the box for other",
          "mark ONE of the three gender boxes on the caption line: male, female or other. This one is other",
          "the juvenile's gender is a fact about the person and the platform holds no gender fact; this build marks no box on a petition on the participant's behalf", 1),
        h.protectedBlank("Date mmddyyyy", "Date (mm/dd/yyyy) beside the juvenile's signature",
          "a date written before the petition is signed would be false; the field is also declared unwritable by role, which the finalizer checks before any name or caption match", 1),
        h.protectedBlank("undefined", "Signature of Juvenile - the widget the Judicial Branch leaves unnamed, captioned \"Signature of Juvenile\" printed directly beneath it",
          "the juvenile signs the petition personally and this build never signs for anyone; the field is also declared unwritable by role, so no rename and no caption change can reach it", 1)
      );
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
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { isoDateInPrintedOrder } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
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

/* ---- transport: an encrypted official binary, unlocked and PROVED --------------- *
 *
 * The identity is the pinned official binary and stays the pinned official
 * binary. This step exists because the corpus toolchain cannot READ those
 * bytes: CR-218 is encrypted with an empty user password and pdf-lib throws in
 * PDFCatalog.Pages before it reaches a page.
 *
 * pikepdf (libqpdf) opens the exact pinned bytes and saves a decrypted
 * derivative with deterministic_id, so the derivative is a function of the
 * pinned source and two builds agree. The derivative is then PROVED equivalent
 * to the official binary by the repository's own fidelity reader — page count,
 * page geometry, the terminal field set, every field difference, the page
 * content streams and XFA — and the family stops rather than rendering if any
 * of them differ. The source's own SHA-256 is recomputed before and after, so
 * a read that altered the source would be caught rather than assumed away.
 *
 * The derivative is written to a build-time temporary directory, is never
 * committed, and is deleted when the build ends. It is transport, not identity.
 */
const UNLOCK_FIDELITY_READER = "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py";

const UNLOCK_BRIDGE = `
import hashlib, importlib.util, json, os, sys
import pikepdf

request = json.loads(sys.argv[1])

def sha256_file(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

def load_module(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(request["root"], rel))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

fidelity = load_module("pf07_fidelity_reader", request["fidelityReader"])

source = request["sourcePath"]
derived = request["derivedPath"]
pinned = request["pinnedSha256"]

before = sha256_file(source)
if before != pinned:
    print(json.dumps({"ok": False, "why": "the source on disk does not hash to the pinned SHA-256 before the read",
                      "observed": before, "pinned": pinned}))
    sys.exit(0)

with pikepdf.open(source) as pdf:
    source_encrypted = pdf.is_encrypted
    # deterministic_id derives the trailer /ID from the file contents. Without
    # it every save mints a fresh random /ID and the family can never rebuild
    # byte-identically.
    pdf.save(derived, deterministic_id=True)

after = sha256_file(source)

official = fidelity.describe(source)
derivative = fidelity.describe(derived)
delta = fidelity.diff(official, derivative)

with pikepdf.open(derived) as d:
    derived_encrypted = d.is_encrypted

equivalent = (
    delta["pageCount"] is None
    and not delta["pageGeometry"]
    and not delta["fieldsOnlyInOfficial"]
    and not delta["fieldsOnlyInDerivative"]
    and not delta["fieldDifferences"]
    and not delta["contentStreamChangedPages"]
)

print(json.dumps({
    "ok": True,
    "sourceSha256Before": before,
    "sourceSha256After": after,
    "sourceUnchanged": before == after == pinned,
    "sourceEncrypted": source_encrypted,
    "derivedSha256": sha256_file(derived),
    "derivedByteLength": os.path.getsize(derived),
    "derivedEncrypted": derived_encrypted,
    "equivalent": bool(equivalent),
    "delta": delta,
    "pikepdfVersion": pikepdf.__version__,
    "libqpdfVersion": pikepdf.__libqpdf_version__,
    "createdBy": "pikepdf.open(exact_pinned_source).save(derived, deterministic_id=True)",
    "fidelityLogic": request["fidelityReader"],
}))
`;

/**
 * Unlocks one bound document in place and returns the transport record. Throws
 * nothing: an unusable result is returned so the caller stops the family with
 * it rather than rendering.
 */
function unlockBoundDocument(b, scratchDir) {
  const sourcePath = path.join(scratchDir, `${b.doc.documentId}-pinned-source.pdf`);
  const derivedPath = path.join(scratchDir, `${b.doc.documentId}-unlocked-derivative.pdf`);
  fs.writeFileSync(sourcePath, b.bytes);

  let raw;
  try {
    raw = execFileSync("python3", ["-c", UNLOCK_BRIDGE, JSON.stringify({
      root: ROOT, sourcePath, derivedPath,
      pinnedSha256: b.doc.sha256,
      fidelityReader: UNLOCK_FIDELITY_READER
    })], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      /* The bridge imports a module from a directory this lane does not own;
       * without this it leaves a __pycache__ behind in it. */
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });
  } catch (error) {
    return { ok: false, why: `the unlock bridge did not run: ${String(error.stderr ?? error.message).slice(0, 2000)}` };
  }
  let result;
  try { result = JSON.parse(raw.trim().split("\n").pop()); }
  catch { return { ok: false, why: `the unlock bridge returned output this build cannot read: ${raw.slice(0, 800)}` }; }

  if (result.ok !== true) return { ok: false, why: result.why, observed: result.observed ?? null };
  if (result.sourceUnchanged !== true) {
    return { ok: false, why: "the pinned source's SHA-256 did not survive the read unchanged", record: result };
  }
  if (result.derivedEncrypted !== false) {
    return { ok: false, why: "the derivative is still encrypted, so nothing was gained by it", record: result };
  }
  if (result.equivalent !== true) {
    return { ok: false, why: "the unlocked derivative is not equivalent to the official binary", record: result };
  }
  return { ok: true, derivedPath, record: result };
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
 * MEASURED CAPTION CORRECTIONS.
 *
 * CR-218 prints every caption BELOW the rule it captions. The shared capture
 * (rcap-pdf-anchor-capture.mjs) looks above and to the left, so on this form it
 * reaches for the caption of the row ABOVE or finds nothing at all. The
 * finalizer's protect test runs on `effectiveLabel ?? name` before anything
 * else, so a caption that belongs to another blank does not merely mislabel
 * this one -- it decides it.
 *
 * This family writes six blanks and refuses nine. Corrections are recorded only
 * where the capture returns a caption this form does not print at that widget,
 * measured from the unlocked derivative's own page-1 content stream (the
 * derivative is proved equivalent to the pinned binary content stream for
 * content stream, so a position read from it is a position on the official
 * form).
 *
 * A correction that does not correct the caption it names is refused by
 * censusAcroForm below rather than applied, so a capture repaired upstream
 * stops this build instead of being silently overridden. The table is
 * populated from that refusal: this build was run once with it empty, the
 * captures were read from the census, and only the ones that are wrong are
 * corrected here.
 *
 * WHAT THIS DOES NOT DO. It does not disable, weaken or bypass a protect rule.
 * The protect test still runs, on the corrected caption AND on the field name.
 * It does not touch the shared capture, which every builder in the corpus sits
 * on and which this lane may not change; the finding stays reported in
 * build-findings.json for the lane that owns it.
 */
const CAPTION_CORRECTIONS = {
  "CR-218": {
    /*
     * THE MIS-WRITE. The conviction-date blank in paragraph 1 was captured with
     * the OPENING OF THE LINE ABOVE, truncated mid-word at "1.Defendant was c",
     * and the word "Defendant" in it matched the full-name descriptor: the
     * finalizer bound participant.full_legal_name and drew the participant's
     * NAME on the date-of-conviction rule of a sworn motion, so paragraph 1
     * would have read "convicted of the following crime of ____ on Casey
     * Lorraine Thibodeau." Measured on the pinned form: the widget is
     * x[159.50,324.00] y[511.90,525.60], and the words printed on its own line
     * to its left, beginning at x=72.00 y=513.20, are "on (mm/dd/yyyy) ."; the
     * captured string is printed at y=528.00, a whole line above.
     *
     * The correction alone would be enough to stop the wrong fact binding, and
     * it is not relied on alone: the field is ALSO refused by role in the
     * document's `unwritable` list, because a conviction date is a fact no held
     * record establishes for anybody. Role is tested before any caption and is
     * not overridable, so the true reason is the one that decides.
     */
    "on mmddyyyy": {
      capturedLabel: "1.Defendant was c",
      measuredLabel: "on (mm/dd/yyyy)",
      measuredAt: "page 1 rect x[159.50,324.00] y[511.90,525.60]; the form's own content stream prints \"on (mm/dd/yyyy) . This crime is eligible for sealing under 15 M.R.S. \u00a7\" as one run beginning x=72.00 y=513.20, on the widget's own line and to its left. The captured string is the first 17 characters of \"1.Defendant was convicted of the following crime of (name of crime)\", printed at x[54.00,398.69] y=528.00 -- the line above"
    },
    /*
     * THE DOCKET NUMBER, REFUSED ON A CAPTION FROM THE ROW BELOW. Captured
     * "Location (Town", which is printed at y=675.48; nothing matched it and
     * the caption block shipped with no docket number at all.
     */
    Text1: {
      capturedLabel: "Location (Town",
      measuredLabel: "Docket No.:",
      measuredAt: "page 1 rect x[415.50,658.80,581.20,671.30] as (x0,y0,x1,y1) = x[415.50,581.20] y[658.80,671.30]; the form prints \"Docket No.:\" at x[354.96,388.08] y=660.24, on the widget's own line and 27.4pt to its left. The captured \"Location (Town\" is printed at x[354.96,403.59] y=675.48, the row above"
    },
    /*
     * THE COUNTY, which bound correctly through its FIELD NAME while carrying
     * the caption of the row below. Corrected because the map, the disclosure
     * table and the refusal records all quote the effective label, and a
     * caption from another blank is a false statement about the paper.
     */
    County: {
      capturedLabel: "Location (Town",
      measuredLabel: "County:",
      measuredAt: "page 1 rect x[400.60,581.00] y[687.40,701.90]; the form prints \"County:\" at x[354.96,386.26] y=690.60, on the widget's own line and 14.3pt to its left. The captured \"Location (Town\" is printed at y=675.48, the row below"
    },
    "Location Town": {
      capturedLabel: null,
      measuredLabel: "Location (Town):",
      measuredAt: "page 1 rect x[441.50,581.50] y[672.20,686.60]; the form prints \"Location (Town:)\" at x[354.96,403.59] y=675.48, on the widget's own line and to its left. The capture reached nothing"
    },
    Defendant: {
      capturedLabel: null,
      measuredLabel: "Defendant",
      measuredAt: "page 1 rect x[31.70,237.70] y[672.20,686.80]; the form prints \"Defendant\" at x[242.28,280.12] y=675.48, on the widget's own line and 4.6pt to its right -- this form prints its captions after and below the rules they caption. The capture, which looks above and to the left, reached nothing"
    },
    "Defendants DOB mmddyyyy": {
      capturedLabel: "mm/dd/yyyy)",
      measuredLabel: "Defendant's DOB (mm/dd/yyyy):",
      measuredAt: "page 1 rect x[202.60,324.10] y[642.40,656.90]; the form prints the whole caption as one run at x[36.48,198.43] y=645.60, on the widget's own line and ending 4.2pt before it. The capture returned only its last eleven characters, which is why the printed order the field asks for is named explicitly in printedDateOrder rather than inferred from a fragment"
    },
    "1 Defendant was convicted of the following crime of name of crime": {
      capturedLabel: "1.Defendant was convicted of the following crime of (name of",
      measuredLabel: "1. Defendant was convicted of the following crime of (name of crime)",
      measuredAt: "page 1 rect x[401.20,576.10] y[526.70,541.20]; the form prints the whole sentence at x[54.00,398.69] y=528.00, on the widget's own line and ending 2.5pt before it. The capture cut it at 60 characters, which is CAPTION_MAX_CHARS in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    },
    /*
     * THE SIGNATURE LINE THE FORM LEAVES UNNAMED. The widget's field name is
     * the literal string "undefined" and the capture returned a stray
     * two-glyph run, so nothing about it said "signature" and it was refused
     * only because no descriptor happened to match. Corrected so the protect
     * test refuses it as what it is.
     */
    undefined: {
      capturedLabel: "\u0001y",
      measuredLabel: "Defendant's Signature",
      measuredAt: "page 1 rect x[324.00,580.70] y[229.30,243.80]; the form prints \"Defendant's Signature\" at x[329.40,455.53] y=217.10, directly beneath the widget. The captured \"\\u0001y\" is a stray two-glyph run at x[306.96,326.76] y=232.40"
    },
    /*
     * THE TWO MAILING-ADDRESS LINES, REFUSED AS ATTORNEY-PROTECTED. Both were
     * captured with the parenthetical of the attorney line -- "(Having an
     * attorney is not required for filing)" -- which is a protected category,
     * so the narrative pass refused both and the delivered motion carried no
     * address for the defendant while the platform held one.
     */
    1: {
      capturedLabel: "(Having an attorney is not required fo r filing)",
      measuredLabel: "Defendant's Mailing Address",
      measuredAt: "page 1 rect x[324.00,580.70] y[180.10,194.60]; the form prints \"Defendant's Mailing Address\" at x[329.40,491.56] y=153.10, beneath this widget and the one below it, which are the two lines of that block. The captured attorney parenthetical is printed at x[35.76,294.47] y=168.00 -- a different column, ending 29.5pt to the left of this widget"
    },
    2: {
      capturedLabel: "(Having an attorney is not required fo r filing)",
      measuredLabel: "Defendant's Mailing Address",
      measuredAt: "page 1 rect x[324.00,580.70] y[165.00,179.50]; the second line of the same block, captioned by the same printed run at x[329.40,491.56] y=153.10, on the same reasoning as the line above"
    },
    "Defendants Attorney and Maine Bar No": {
      capturedLabel: null,
      measuredLabel: "Defendant's Attorney and Maine Bar No. (Having an attorney is not required for filing)",
      measuredAt: "page 1 rect x[31.40,252.10] y[195.20,209.80]; the form prints \"Defendant's Attorney and Maine Bar No.\" at x[35.76,263.85] y=181.70 and its parenthetical at x[35.76,294.47] y=168.00, both beneath the widget. The capture reached nothing"
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
      /*
       * THE THREE DECLARED CHANNELS THIS BUILDER'S OWN COUNT USED TO DROP.
       *
       * `classifyBlank` reaches NOT_APPLICABLE_ON_THIS_ROUTE only when a named
       * `routeConditionThatMakesItInapplicable` arrives, and it reaches
       * REQUIRED_BEFORE_FILING on a selection control only when
       * `determinedByTheCaseNotTheRoute` arrives with the reason beside it. The
       * shared build core this family copied forwarded neither, so every row
       * using either channel was classified here as if it had declared nothing,
       * while verify-packet-completeness.mjs, which forwards all three, reads
       * exactly the same field map correctly.
       *
       * That is the same defect the repository verifier's own comments record
       * twice ("this reader has silently dropped a key the contract decides
       * on"), arriving in a builder's self-count instead. A self-count that
       * cannot see a declaration the contract honours reports defects a family
       * does not have, and the temptation is then to reword the packet until
       * the wrong reader agrees. Forwarded verbatim; nothing is decided here.
       */
      ...(Object.hasOwn(r, "routeConditionThatMakesItInapplicable")
        ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null } : {}),
      ...(Object.hasOwn(r, "determinedByTheCaseNotTheRoute")
        ? { determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true } : {}),
      ...(Object.hasOwn(r, "whyTheRouteCannotDetermineIt")
        ? { whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null } : {}),
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
/*
 * THE COMMITTED RECORD THIS FAMILY'S GUIDE PRINTS FROM.
 *
 * The build host this family copied read its list out of the committed
 * packet-set manifest, keyed by packetSetId. THIS FAMILY HAS NO PACKET SET. Its
 * route-obligation census entry records `packetSetId: null` and `trackId: null`,
 * there is no legal-design track for ME juvenile sealing, and the packet-set
 * manifest carries nothing for it. A host that insisted on a manifest would
 * report the record as having stopped declaring something it never declared.
 *
 * The controlling record for this route is the committed ROUTE CONTRACT at
 * src/lib/legal-authority/routes/single-routes.json#ME:juvenile-sealing, which
 * is where this route's mechanism, statute, eligibility clock, required facts
 * and packet components actually live, and which this family already binds by
 * SHA-256 with every relied-on statement re-read as an anchor. The guide prints
 * ITS `requiredFacts` and ITS `packetComponents`, word for word, with its path
 * and its digest beside them, on exactly the terms the host applied to the
 * manifest: if the record changes the guide changes with it, and if the record
 * stops declaring either the family is not built.
 */
const ROUTE_CONTRACT_RECORD = "src/lib/legal-authority/routes/single-routes.json";
const ROUTE_CONTRACT_KEY = "ME:juvenile-sealing";

function declaredRequiredBeforeFiling() {
  const abs = path.join(ROOT, ROUTE_CONTRACT_RECORD);
  if (!fs.existsSync(abs)) {
    return { ok: false, why: `the committed route contract is not at ${ROUTE_CONTRACT_RECORD}` };
  }
  const bytes = fs.readFileSync(abs);
  let contracts;
  try { contracts = JSON.parse(bytes.toString("utf8")); }
  catch (error) { return { ok: false, why: `the committed route contract does not parse: ${error.message}` }; }
  const list = Array.isArray(contracts) ? contracts : (contracts.routes ?? Object.values(contracts).find(Array.isArray) ?? []);
  const contract = list.find((r) => r && r.routeKey === ROUTE_CONTRACT_KEY);
  if (!contract) {
    return { ok: false, why: `the committed route contract no longer carries route ${ROUTE_CONTRACT_KEY}` };
  }
  /* The record's own questions, and the anchor sentence its eligibility clock
   * is stated in. Both are printed verbatim; neither is reworded here. */
  const items = [
    ...(contract.requiredFacts ?? []).map((s) => String(s)).filter((s) => s.trim().length > 0),
    ...(contract.timing?.anchorText ? [`The eligibility clock: ${String(contract.timing.anchorText)}`] : []),
    ...(contract.notes ? [String(contract.notes)] : [])
  ];
  if (items.length === 0) {
    return { ok: false, why: `route ${ROUTE_CONTRACT_KEY} no longer declares any required facts, eligibility anchor or notes` };
  }
  const components = (contract.packetComponents ?? []).map((label) => ({
    componentId: String(label),
    role: String(label) === "Petition under \u00a7 3308-C" ? "primary_filing" : "participant_obtained_record",
    requirement: "required",
    outputStrategy: String(label) === "Petition under \u00a7 3308-C" ? "official_pdf_fill" : "obtained_by_the_participant",
    officialFormId: String(label) === "Petition under \u00a7 3308-C" ? "JV-043" : null,
    conditionDescription: null
  }));
  if (components.length === 0) {
    return { ok: false, why: `route ${ROUTE_CONTRACT_KEY} no longer declares any packet components` };
  }
  return {
    ok: true, items, components,
    path: ROUTE_CONTRACT_RECORD, packetSetId: ROUTE_CONTRACT_KEY,
    packetSetVersion: contract.ruleId ?? null,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

/*
 * THE WORD THIS JURISDICTION'S COMMITTED RECORD FORBIDS IN PARTICIPANT COPY.
 *
 * "Maine seals; it does not expunge. The Judicial Branch says in terms that
 * Maine does not have expungement and the record is not completely erased.
 * Never use 'expungement' in Maine participant copy." -- committed track
 * registry, me-seal-gen, packetInstructions.
 *
 * That is a packet instruction, so it is asserted over the generated bytes
 * rather than merely intended by the author. Every occurrence of the word must
 * sit inside one of the sentences that exist to say Maine does not have it; any
 * other occurrence stops the family. A later edit cannot reintroduce it
 * quietly.
 */
function forbiddenWordBreaches(markdown) {
  const breaches = [];
  const hay = String(markdown);
  const needle = new RegExp(FORBIDDEN_WORD, "gi");
  for (const match of hay.matchAll(needle)) {
    const from = Math.max(0, match.index - 160);
    const window = hay.slice(from, match.index + 160);
    if (FORBIDDEN_WORD_IS_ALLOWED_ONLY_IN.some((allowed) => window.includes(allowed))) continue;
    breaches.push({ at: match.index, matched: match[0], context: hay.slice(Math.max(0, match.index - 80), match.index + 80).replace(/\s+/g, " ") });
  }
  return breaches;
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
    `These ${declared.items.length} items are printed word for word from the committed route contract for route `
    + `\`${declared.packetSetId}\` (rule ${declared.packetSetVersion ?? "unruled"}), read from `
    + `\`${declared.path}\` at build time. The file's SHA-256 is \`${declared.sha256}\`. Nothing here is this `
    + "packet's own restatement of the record: if the record changes, this list changes with it, and if the "
    + "record stops declaring it the packet is not built.", "");
  for (const item of declared.items) out.push(`- ${item}`);
  out.push("");

  out.push("### The components the same record declares for this packet", "");
  out.push("| Component | Role | Required | How it is produced | Official form |", "| --- | --- | --- | --- | --- |");
  for (const c of declared.components) {
    out.push(`| \`${c.componentId}\` | ${c.role} | ${c.requirement}${c.conditionDescription ? ` — ${c.conditionDescription}` : ""} | ${c.outputStrategy} | ${c.officialFormId ?? "—"} |`);
  }
  out.push("");
  out.push(
    "The second component, proof of final discharge, is a record you obtain from the Juvenile Court rather "
    + "than a document this platform can produce. It is listed in \"Documents you must obtain first\" above, "
    + "with where to get it and why the three-year clock depends on it. It is not in the PDF and it is not "
    + "silently dropped.", "");

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
  /*
   * TRANSPORT, BEFORE ANY CENSUS. A document whose spec declares transportUnlock
   * is carried through a proved-equivalent decryption; every later step -- the
   * census, the finalizer and the ink audit -- then reads the derivative, which
   * has been proved equal to the official binary rather than assumed to be.
   */
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf07-me-transport-"));
  const transportRecords = [];
  for (const b of bound) {
    if (!b.doc.transportUnlock) continue;
    const unlocked = unlockBoundDocument(b, scratchDir);
    if (!unlocked.ok) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      return {
        familyId: SPEC.familyId, status: "STOPPED",
        stopClass: "UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY",
        why: unlocked.why, sourceId: b.doc.sourceId, pinnedSha256: b.doc.sha256,
        evidence: unlocked.record ?? null,
        overlayDirectoryTouched: false
      };
    }
    b.officialBytes = b.bytes;
    b.bytes = fs.readFileSync(unlocked.derivedPath);
    b.transport = unlocked.record;
    transportRecords.push({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, ...unlocked.record });
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
      record: ROUTE_CONTRACT_RECORD, packetSetId: ROUTE_CONTRACT_KEY,
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

  /*
   * THE GUIDE IS BUILT AND GATED BEFORE ANYTHING IS WRITTEN.
   *
   * The field map, the required-before-filing list and the participant guide
   * are all pure functions of the SPEC and the committed records, so they can
   * be produced -- and refused -- before a single byte of this family's output
   * directory is created. That ordering is the point: a family that stops must
   * leave its overlay directory byte-for-byte unchanged, and a guide checked
   * after the fixtures were rendered would have stopped a family that had
   * already half-written itself.
   */
  const maps = SPEC.components.map((c) => composedMap(c));
  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, declaredRecord);
  const wordBreaches = forbiddenWordBreaches(instructionsText);
  if (wordBreaches.length > 0) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "FORBIDDEN_JURISDICTION_WORD_IN_PARTICIPANT_COPY",
      why:
        "the committed track registry directs that Maine participant copy never use the word "
        + "\"expungement\"; this guide uses it outside the sentences that exist to say Maine does not have it",
      breaches: wordBreaches,
      overlayDirectoryTouched: false
    };
  }

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
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
            /* The digest of the bytes actually handed over. Where a document was
             * carried through transport that is the proved-equivalent
             * derivative; the OFFICIAL identity is b.doc.sha256 and it is what
             * the receipt binds. */
            expectedSha256: b.transport ? b.transport.derivedSha256 : b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            /* One held fact on the ruled line the form prints for it, where no
             * shared descriptor reaches the printed caption. Named per document
             * and empty for every document that does not name it, so the
             * petition is byte-unaffected. See the fee_waiver document's
             * narrativeLines note for the refusal it answers. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
            /* The order the form prints beneath the blank, named per field by
             * this caller because this caller read the printed line. */
            printedDateOrderByField: b.doc.printedDateOrder ?? {},
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
              /*
               * The byte proof looks for the string the page CARRIES, not the
               * string the fact is stored as. Where this build asked for a date
               * in the order the form prints beneath the blank, the ink is
               * "11/06/1990" and a proof that hunted for "1990-11-06" would
               * fail on a correct write -- or, worse, pass on an incorrect one
               * if it were ever relaxed. So the same transformation the
               * finalizer applied is applied here, from the same shared
               * function, and the proof still reads the delivered bytes.
               */
              const order = b.doc.printedDateOrder?.[w.field];
              const drawn = order ? isoDateInPrintedOrder(String(value), order, w.field) : String(value);
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, drawn);
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
    /*
     * TRANSPORT IS RECORDED BESIDE IDENTITY AND NEVER IN PLACE OF IT. Each entry
     * below binds the OFFICIAL binary by its pinned SHA-256, recomputed from the
     * file on disk. Where the official binary had to be carried through a
     * decryption to be readable at all, the derivative's own digest, the method
     * that produced it and the equivalence that was proved of it are recorded
     * under `transport`, which is not an identity and is not a source.
     */
    transport: transportRecords,
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      ...(b.transport ? { transport: {
        why: b.doc.transportUnlock.why,
        method: b.transport.createdBy,
        derivedSha256: b.transport.derivedSha256,
        derivedByteLength: b.transport.derivedByteLength,
        sourceEncrypted: b.transport.sourceEncrypted,
        derivedEncrypted: b.transport.derivedEncrypted,
        officialSha256UnchangedByTheRead: b.transport.sourceUnchanged,
        equivalenceProvedBy: b.transport.fidelityLogic,
        equivalenceDelta: b.transport.delta,
        pikepdfVersion: b.transport.pikepdfVersion,
        libqpdfVersion: b.transport.libqpdfVersion,
        derivativeIsNotAnIdentity:
          "the bound identity is the official binary above; this derivative is a build-time transport copy, "
          + "is not committed, and is deleted when the build ends"
      } } : {}),
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

  fs.rmSync(scratchDir, { recursive: true, force: true });

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
