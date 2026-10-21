#!/usr/bin/env node
/**
 * PF07 official-form packet family — Maine, motion to seal the criminal history
 * record information of one eligible criminal conviction, 15 M.R.S. ch. 310-A.
 *
 *   node scripts/build-census-v1-me-seal-gen-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-pathway:ME:me-seal-gen:adult-conviction-sealing
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family with ONE official document: the Maine Judicial
 * Branch's CR-218, Motion to Seal Criminal History, Rev. 7/24, one page,
 * fifteen AcroForm fields, bound by exact SHA-256 and delivered as the Judicial
 * Branch publishes it. The committed packet-set manifest declares a second
 * component, `me-seal-gen-instructions-2`, whose outputStrategy is
 * process_guidance rather than an official form; it is carried in
 * participant-instructions.md, which is what a process-guidance component is.
 *
 * THE SOURCE IS ENCRYPTED, AND THAT IS HANDLED BY TRANSPORT AND NOT BY
 * SUBSTITUTION
 *
 * The pinned CR-218 binary is an encrypted PDF with an empty user password.
 * pdf-lib cannot open it at all -- its xref names object numbers that do not
 * resolve and PDFCatalog.Pages throws -- so no census, no write and no audit is
 * possible against those bytes directly.
 *
 * This build does NOT answer that by binding some other file. The identity
 * stays the pinned official binary, byte-for-byte, and the SHA-256 is
 * recomputed from it before and after the read. What changes is transport: at
 * build time the module opens the exact pinned bytes with pikepdf (libqpdf) and
 * saves a decrypted derivative with deterministic_id, so two builds of the same
 * pinned source produce the same derivative; then it PROVES the derivative
 * equivalent to the official binary using the repository's own fidelity reader,
 * scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py, comparing page
 * count, page geometry, the terminal field set, every field difference, the page
 * content streams and XFA. If any of those differ the family STOPS with
 * stopClass UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY and
 * nothing is rendered.
 *
 * That is the pattern census-v1-ca-1203-4-set already proved on five encrypted
 * California forms, where the field map records
 * renderStrategy "pikepdf_unlocked_derivative_then_official_form_finalizer" and
 * measurementSurface "exact official encrypted binaries". The derivative is a
 * transport step. It is not committed, it is deleted when the build ends, and
 * it is never the bound identity.
 *
 * There is a decrypted derivative already sitting in the repository at
 * data/rcap-all50/overlays/rescued-encrypted-pdfs/maine-mjb-form-cr-218-rescued.pdf.
 * This build does not use it. Its digest appears in no committed source record
 * and in no corpus-index entry, the rescue report calls it a review derivative,
 * and binding it would satisfy one identity with the binary of another.
 *
 * MAINE SEALS. IT DOES NOT EXPUNGE.
 *
 * The committed track registry says so in terms and requires it of every piece
 * of participant copy: "Maine seals; it does not expunge. The Judicial Branch
 * says in terms that Maine does not have expungement and the record is not
 * completely erased. Never use 'expungement' in Maine participant copy." The
 * word does not appear in this family's instructions except to say that Maine
 * does not have it. The build ASSERTS that, over its own generated guide, so a
 * later edit cannot reintroduce it silently.
 *
 * PARAGRAPH 3 SAYS MORE THAN THE STATUTE DOES, AND THIS PACKET DOES NOT ANSWER
 * IT
 *
 * CR-218 paragraph 3 reads, on the pinned form: "Defendant has no other adult
 * criminal convictions in Maine and has not had a case dismissed as the result
 * of a deferred disposition since completing their sentence for this offense."
 * The committed track registry records the defect: the trailing time limit
 * governs the deferred-disposition clause but not the convictions clause, so
 * the form asks the participant to assert an unbounded absence of Maine
 * convictions while § 2262(3) bars only a conviction SINCE the person fully
 * satisfied the sentence for their most recent eligible criminal conviction. A
 * participant with an old prior that predates the completion date is not
 * disqualified by the statute but reads as disqualified on the form.
 *
 * Paragraphs 2 to 5 of CR-218 are PRINTED ASSERTIONS, not fields: the form
 * carries no checkbox and no blank for any of them, and the defendant makes
 * them by signing. So there is nothing here for a build to tick or to leave
 * unticked, and the treatment is the only one available and also the right one:
 * the packet sets out both readings in plain terms, tells the participant that
 * they and not this platform answer paragraph 3, and names an older Maine prior
 * as a point to take advice on before filing. The registry's own words are
 * carried into the guide.
 *
 * WHAT THE PARTICIPANT INSTRUCTIONS PRINT, AND WHERE IT COMES FROM
 *
 * The committed packet-set manifest carries this packet set's own
 * requiredBeforeFiling list. It is READ FROM THE COMMITTED RECORD AT BUILD TIME
 * and printed verbatim, and the build REFUSES if the record stops carrying it.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "me-seal-gen-set";

const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const PACKET_SET_ID = "me-seal-gen-set";

/*
 * The word this jurisdiction's committed record forbids in participant copy,
 * and the only sentence in which it may appear. Asserted over the generated
 * guide before it is written, because a packet instruction that is only a
 * comment is a packet instruction that drifts.
 */
const FORBIDDEN_WORD = "expunge";
const FORBIDDEN_WORD_IS_ALLOWED_ONLY_IN = [
  "Maine does not have expungement",
  "never uses the word \"expungement\"",
  "is not expungement",
  "The word \"expunge\""
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-me-seal-gen-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill",
  jurisdiction: "ME",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Motion to Seal Criminal History Record Information (15 M.R.S. ch. 310-A, §§ 2262-2264)",
  routeName: "sealing one eligible Maine criminal conviction under 15 M.R.S. ch. 310-A",
  statutes: ["15 M.R.S. § 2261", "15 M.R.S. § 2262", "15 M.R.S. § 2263", "15 M.R.S. § 2264", "15 M.R.S. § 2265", "15 M.R.S. § 2266", "15 M.R.S. § 2267", "15 M.R.S. § 2269", "16 M.R.S. § 705", "16 M.R.S. § 708", "17-A M.R.S. § 1502(2)", "PL 2021, c. 674", "PL 2023, c. 409", "PL 2023, c. 666", "PL 2025, c. 513", "Me. Admin. Order JB-05-26 (A. 3-26)"],
  routes: [{ routeKey: "obligation:track-pathway:ME:me-seal-gen:adult-conviction-sealing" }],

  records: [
    {
      recordId: "packet-set-manifest:me-seal-gen-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Its participantActionRequired entries "
        + "settle the filing destination, the fee position, the fee-waiver position, the service position and "
        + "every record the participant is advised to obtain and confirm; its requiredBeforeFiling list is read "
        + "from these bytes at build time and printed verbatim into participant-instructions.md",
      mustContain: [
        "File the completed and signed CR-218 with the clerk of the court in which the conviction was entered, in the underlying criminal proceeding (§ 2264(1)). One motion per conviction.",
        "No fee is expected. Administrative Order JB-05-26 (A. 3-26), effective 9 March 2026, lists no fee for a criminal post-judgment motion",
        "Do not route the participant to CV-067 or CV-191.",
        "No service obligation is imposed on the movant by the statute or by CR-218, and the form carries no certificate-of-service block.",
        "The defendant signs CR-218. There is an optional attorney line; having an attorney is not required. LegalEase leaves the signature and date blank.",
        "Paragraph 3 of CR-218 — the assertion of no other adult criminal convictions in Maine — CR-218, numbered paragraph 3.",
        "Paragraph 1's assertion that the crime is eligible for sealing under 15 M.R.S. § 2261(6) — CR-218, numbered paragraph 1."
      ]
    },
    {
      recordId: "track-registry:me-seal-gen",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry entry for this track. It settles the venue and destination "
        + "this packet states, the four-year waiting period and the point it is measured from, the exclusion "
        + "set, the paragraph 3 defect, the § 2264(7) self-reporting duty and the stop conditions the packet "
        + "carries word for word",
      mustContain: [
        "The court in which the conviction was entered, in the underlying criminal proceeding (§ 2264(1)). CR-218 carries checkboxes for Superior Court, District Court and the Unified Criminal Docket.",
        "Clerk of the court in which the conviction was entered",
        "Four years from the date the person fully satisfied EACH of the sentencing alternatives imposed under 17-A M.R.S. § 1502(2)",
        "The clock does not start at conviction and does not start at release, and an unpaid restitution or fine balance means it has not started at all.",
        "Maine seals; it does not expunge. The Judicial Branch says in terms that Maine does not have expungement and the record is not completely erased. Never use 'expungement' in Maine participant copy.",
        "Automatic sealing did not happen.",
        "Maine has no clean-slate mechanism.",
        "Every Class A, Class B and Class C crime. Chapter 310-A does not reach them.",
        "A non-conviction disposition. § 2262 reaches a specific criminal conviction only, and filing this motion on a non-conviction is affirmatively wrong",
        "Build the § 2264(7) self-reporting duty into post-grant participant instructions.",
        "The trailing time limit governs the deferred-disposition clause but not the convictions clause",
        "Treat as no fee, confirm with the clerk, and do not promise a refund."
      ]
    }
  ],

  officialComponents: {
    motion: {
      sourceId: "official-form:CR-218",
      documentId: "CR-218",
      formNumber: "CR-218",
      officialTitle: "Motion to Seal Criminal History",
      revision: "REV-2024-07",
      instrumentKind: "Maine § 2264 Adult Conviction Sealing Motion",
      sha256: "82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4",
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
          "the pinned official binary is an encrypted PDF with an empty user password; pdf-lib cannot open it "
          + "and throws in PDFCatalog.Pages, so neither a census nor an ink audit is possible against those "
          + "bytes directly",
        method: "pikepdf.open(exact_pinned_source).save(derivative, deterministic_id=True)",
        equivalenceReader: "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
        precedent: "scripts/build-census-v1-ca-1203-4-set.mjs, renderStrategy pikepdf_unlocked_derivative_then_official_form_finalizer over five encrypted California forms"
      },
      explicitMappings: {},
      /* mm/dd/yyyy is what the form prints beneath the blank; the fact is
       * stored ISO. The caller names the field and the order because the caller
       * is the one that read the printed line. */
      printedDateOrder: { "Defendants DOB mmddyyyy": "month_day_year" },
      unwritable: [
        {
          field: "on mmddyyyy", class: "participant_conviction_fact",
          why:
            "The date of conviction in paragraph 1. No record this platform holds establishes any participant's "
            + "own conviction date, and the committed packet-set manifest names it as something the participant "
            + "must confirm against the certified judgment. It is refused by ROLE as well as by caption because "
            + "role is tested before any caption and is not overridable: the caption capture bound the "
            + "participant's NAME to this blank on an earlier build of this family, and a correct caption is "
            + "not the only thing standing between that and a sworn motion."
        }
      ],
      /*
       * THE DEFENDANT'S MAILING ADDRESS, ON THE TWO RULED LINES THE FORM PRINTS
       * FOR IT.
       *
       * Measured on the unlocked derivative of the pinned CR-218: the caption
       * "Defendants Mailing Address" is printed at x=329.4 y=153.1, BELOW the
       * two widgets it captions -- this form prints every caption under its
       * rule -- and those widgets are the fields named "1" (x[324.0,580.7]
       * y[180.1,194.6]) and "2" (x[324.0,580.7] y[165.0,179.5]), two stacked
       * lines of one address block.
       *
       * Neither binds through the ordinary descriptor channel: the field names
       * are the bare strings "1" and "2" and the captured caption is the block
       * caption below them, so decideBinding has nothing to match. Leaving them
       * blank would deliver a motion with no address for the defendant while
       * the platform holds one, which is the AOC-CV-226 defect this sprint
       * already recorded once.
       *
       * They are written through the finalizer's own narrativeAcrossFields
       * channel, one held fact per field and no caller text of any kind: line
       * one takes participant.street_address and line two takes
       * participant.city_state_zip, both of them established fact ids in the
       * platform's own vocabulary. The channel resolves each from the same
       * facts set as every other write, runs the same protect test on the
       * caption and the field name, fits the value to that widget's own
       * rectangle, and REFUSES IT WHOLE rather than truncating.
       */
      narrativeLines: [
        { factId: "participant.street_address", fields: ["1"] },
        { factId: "participant.city_state_zip", fields: ["2"] },
        /*
         * THE DOCKET NUMBER OF THE CASE THIS MOTION IS FILED IN.
         *
         * This is a motion in an existing criminal proceeding -- § 2264(1)
         * requires it to be filed in the court that entered the conviction, in
         * that case -- so the caption's Docket No. is the single most important
         * identifier on the page, and the platform holds it.
         *
         * It does not bind through the ordinary channel, and the reason is a
         * shared-module one measured here: with the caption corrected to what
         * the form prints, decideBinding returns
         * { writable: false, reason: "repeating_row_without_indexed_fact",
         *   category: "charge_row", factId: "matter.case_number", rowIndex: 0 }
         * -- the descriptor reads "Docket No." as a REPEATING CHARGE-ROW label
         * and demands matter.charges[0].case_number, an indexed fact. On a
         * one-conviction motion with a single caption block there is no charge
         * table and no indexed fact, so a document that holds exactly one
         * docket number can never write it. Passing availableChargeRows: 1
         * would make it bind matter.charges[0].case_number, which would be
         * asserting a charge row this family does not have.
         *
         * Reported in build-findings.json for the lane that owns
         * scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane
         * does not open. Here the held fact is written through the finalizer's
         * own opt-in narrative channel, one fact and one field: it resolves
         * matter.case_number from the same facts set as every other write, runs
         * the same protect test on the caption and the field name
         * (protectCategoryOf("Docket No.:") is null, so nothing is bypassed),
         * fits it to that widget's own rectangle, and refuses it whole rather
         * than truncating.
         */
        { factId: "matter.case_number", fields: ["Text1"] }
      ]
    }
  },

  officialCells: {},

  components: ["motion"],
  componentTitles: {
    motion: "CR-218 - Motion to Seal Criminal History (15 M.R.S. §§ 2263-2264)"
  },
  componentConditions: {},
  componentDescriptions: {
    motion: "the Maine Judicial Branch's own motion form, delivered exactly as it publishes it. The caption block and your own details are filled in; the crime, the conviction date, the court election and your signature are yours"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Casey Lorraine Thibodeau",
      "participant.date_of_birth": "1990-11-06",
      "participant.street_address": "34 Winter Harbor Road",
      "participant.city_state_zip": "Bangor, ME 04401",
      "matter.case_number": "PENCD-CR-2016-00742",
      "matter.county": "Penobscot"
    },
    boundary: {
      "participant.full_legal_name": "Jean-Baptiste Ouellette-Michaud III",
      "participant.date_of_birth": "1962-01-09",
      "participant.street_address": "1785 Presque Isle Ridge Road, Apartment 3B",
      "participant.city_state_zip": "Presque Isle, ME 04769-1183",
      "matter.case_number": "AROCD-CR-1998-00000112",
      "matter.county": "Aroostook"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "CR-218 is the Maine Judicial Branch's own published Motion to Seal Criminal History, Rev. 7/24, one page, "
    + "bound by exact SHA-256 through the committed corpus index and delivered as the Judicial Branch issues "
    + "it. The pinned binary is encrypted with an empty user password; this build carries it through a "
    + "deterministic pikepdf decryption proved equivalent to the official binary page for page, field for "
    + "field and content stream for content stream, and stops rather than rendering if that proof fails. The "
    + "bound identity is the official encrypted binary and its SHA-256 is recomputed from the file on disk "
    + "before and after the read.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: CR-218 is the Judicial Branch's form for a motion under 15 M.R.S. "
    + "§§ 2263-2264 to seal the criminal history record information of one eligible criminal conviction, and "
    + "the form's own title and statutory citation say so. Within that route CR-218 carries exactly ONE "
    + "election, the court-for-filing box at the head of the form -- Superior Court, District Court or the "
    + "Unified Criminal Docket -- and it is not an election this route decides: § 2264(1) requires the motion "
    + "to be filed in the court in which the conviction was entered, which is a fact about the participant's "
    + "own case. It is left unmarked and recorded as the participant's own. The form's numbered paragraphs 2 "
    + "to 5 are printed assertions with no field of any kind, so there is nothing on them for this route to "
    + "select.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "CR-218, Motion to Seal Criminal History, and no proposed order",
      determinedBy:
        "the committed packet-set manifest, whose only official_pdf_fill component names officialFormId "
        + "CR-218, together with the committed track registry's record that 15 M.R.S. § 2264(5) requires the "
        + "COURT to issue its own written order with findings of fact and that no proposed-order form is "
        + "published by the Judicial Branch for any chapter 310-A motion"
    },
    {
      selection: "sealing rather than any non-conviction route",
      value: "a chapter 310-A motion on one specific criminal CONVICTION",
      determinedBy:
        "the committed track registry, which records that § 2262 reaches a specific criminal conviction only, "
        + "that filing this motion on a non-conviction is affirmatively wrong, and that non-conviction records "
        + "are handled by operation of law under 16 M.R.S. § 703(2)"
    },
    {
      selection: "no fee-waiver instrument",
      value: "none carried",
      determinedBy:
        "the committed packet-set manifest's apply_fee_waiver entry, which records that no fee is expected and "
        + "says in terms \"Do not route the participant to CV-067 or CV-191\""
    }
  ],

  instructionsHeading: "Filing instructions — sealing one Maine criminal conviction (15 M.R.S. ch. 310-A)",

  instructionsIntro: [
    "This packet is the Maine Judicial Branch's own **CR-218, Motion to Seal Criminal History**, Rev. 7/24, one page, filled in with what the platform holds about you and left blank everywhere else.",
    "**Maine seals. Maine does not have expungement.** The committed legal record for this track is explicit about the word and about the thing: the Judicial Branch says Maine does not have expungement and that the record is not completely erased. A sealing order restricts what criminal justice agencies may disseminate and what shows on a State Bureau of Identification background check. It does not make the court case disappear.",
    "**There is no automatic sealing in Maine.** The committed record notes that LD 1911 passed both chambers on 14 April 2026, was vetoed on 24 April, and the Senate override failed on 29 April, and that four narrower sealing bills failed in the same session. Nothing is going to clear this record for you on its own.",
    "**Most Maine convictions do not qualify, and knowing that early is worth more than filing.** Chapter 310-A reaches a current or former **Class E** crime other than one under 17-A M.R.S. ch. 11, plus five specifically listed marijuana offences committed before 30 January 2017. Every Class A, Class B and Class C crime is outside it, and so is every Class D crime except those five.",
    "The platform filled what it holds and nothing else: your name, your date of birth, the county, the docket number, and your mailing address on the two lines the form prints for it. **The crime, the date of conviction, the court election and your signature are yours.**",
    "**One motion per conviction.** The committed manifest says so. If you want more than one conviction sealed, that is more than one motion, and where several are filed the court consolidates them to one location."
  ],

  whoDecides: [
    "**A judge decides, after a hearing.** 15 M.R.S. § 2264(1) has the clerk set the matter for hearing once the motion is filed. § 2264(4) provides that a hearing is required and that the Maine Rules of Evidence do not apply.",
    "**The relief is mandatory once you prove it.** § 2264(5) directs that the court SHALL grant the motion where the person establishes each prerequisite by a preponderance of the evidence. That is a real advantage and it puts the burden on you: bring the paperwork.",
    "**The State is heard.** § 2264(3) directs notice to the prosecutorial office that represented the State in the underlying proceeding. There is no written objection procedure and no fixed response period; the State appears at the hearing.",
    "**The court writes its own order.** § 2264(5) requires a written order with findings of fact, and the committed record notes that no proposed-order form is published by the Judicial Branch for any chapter 310-A motion. There is no proposed order in this packet and you should not draft one.",
    "**Denials happen.** The committed record names a previous denial as a point where self-help stops: a second filing on the same facts is not a do-it-yourself matter."
  ],

  filingDestination: [
    "**File with the clerk of the court in which the conviction was entered, in the underlying criminal proceeding.** That is § 2264(1) and it is what the committed manifest and the committed track record both say. It is not a new case; it is a motion in the old one.",
    "**Tick the right court at the head of the form.** CR-218 offers Superior Court, District Court and the Unified Criminal Docket. Which one applies is a fact about your own case — it is the court that entered the conviction — so the platform has left all three unticked. The docket number the platform wrote into the caption should tell you, and the clerk can confirm it.",
    "**Filing is in person or by mail.** eFiling availability depends on where your county sits in the Maine eCourts rollout; the committed record notes this is unresolved and moving, so ask the clerk rather than assuming.",
    "**Check the county and the docket number the platform wrote into the caption** against the judgment. If either is wrong the caption is wrong and must be corrected before you file."
  ],

  feeAndWaiver: [
    "**No fee is expected.** The committed manifest states the position in full: Administrative Order JB-05-26 (A. 3-26), effective 9 March 2026, lists no fee for a criminal post-judgment motion, and provides \"Filing a Criminal Action, Traffic Infraction, or Civil Violation: No fee\" in both Superior and District Court.",
    "**The $60 figure some sources quote does not reach this motion.** That line is tied by its own terms to M.R. Civ. P. 55(b)(2), 59, 60(b), 62 and 66, which are civil rules; a chapter 310-A motion is filed in the underlying CRIMINAL proceeding.",
    "**Confirm with the clerk, and do not expect a refund.** The committed manifest says exactly that, and the committed record holds \"whether any clerk assesses a fee for a chapter 310-A motion in practice\" as an unresolved question.",
    "**There is no fee-waiver form in this packet, and that is deliberate.** The committed manifest says in terms: do not route the participant to CV-067 or CV-191. Those are civil in-forma-pauperis forms. If a clerk does assess a fee, ask the clerk what to do and take advice; the application of M.R. Civ. P. 91 to a criminal motion is unresolved."
  ],

  service: [
    "**CR-218 carries no certificate of service, and this packet adds none.** The committed manifest records that no service obligation is imposed on the movant by the statute or by the form.",
    "**Notice is understood to be the court's.** § 2264(3) directs notice to the prosecutorial office that represented the State but does not assign the act to you. The committed record holds this as an open question and the packet fails closed rather than guessing.",
    "**So do this: ask the clerk at the counter whether you need to give the prosecutor a copy, and offer a courtesy copy for the prosecutorial office if the clerk asks for one.** That costs you nothing and closes the gap either way.",
    "**Do not treat this as settled.** If a clerk tells you that you must serve the office yourself, do it and keep proof; the committed record flags this as a question counsel must answer before release."
  ],

  documentsToObtain: [
    ["A certified copy of the judgment and the docket record for the conviction — you carry the burden of proving the conviction, its class and the date you finished the sentence, so bring the paperwork to the hearing", "the clerk of the court in which the conviction was entered. Copy fees apply under the Judicial Branch fee schedule"],
    ["Proof that every fine and every dollar of restitution was paid in full — the committed record says the four-year clock does not start until the last dollar is paid, so this is the document that most often decides the case", "the clerk of the court of conviction, or the collections office that received payment"],
    ["Your own Maine criminal history record, so you can see every case the State has on you before you file", "the Maine State Police, State Bureau of Identification. A fee applies; confirm the current amount with the Bureau rather than relying on a figure quoted elsewhere"]
  ],

  steps: [
    "**Check that the conviction is eligible at all before you do anything else.** It must be a current or former Class E crime other than one under 17-A M.R.S. ch. 11, or one of the five listed marijuana offences committed before 30 January 2017. If it is a Class A, B or C crime, chapter 310-A does not reach it.",
    "**Work out the date you fully satisfied EVERY sentencing alternative** — imprisonment, probation, administrative release, licence suspension, fine payments, restitution and community service. The four-year clock runs from the LAST of them. It does not run from the conviction and it does not run from release, and if any fine or restitution balance is still owed it has not started at all.",
    "**Get the certified judgment and the payment history.** You carry the burden of proof at the hearing and these are the documents that discharge it.",
    "**Tick ONE court at the head of the form** — Superior Court, District Court or Unified Criminal Docket — matching the court that entered the conviction.",
    "**Write the name of the crime, exactly as the judgment names it, and the date of conviction in mm/dd/yyyy**, in paragraph 1. The platform does not fill these: whether a crime is a current or former Class E crime, or matches one of the five marijuana subparagraphs, is a legal conclusion drawn from the judgment and the historical statute.",
    "**Write the town where the court sits** on the Location (Town) line.",
    "**Read numbered paragraphs 2 to 5 before you sign.** They are printed assertions with no boxes: you make every one of them by signing the form. Paragraph 3 is the one to slow down on — see the section below.",
    "**Check your name, date of birth, county, docket number and mailing address**, all of which the platform filled in, against the judgment and against your own records.",
    "**Sign and date the motion.** Having an attorney is not required; the attorney line is optional and this packet leaves it blank.",
    "**File it with the clerk of the court of conviction, in the old criminal case.** Ask at the counter whether the court gives notice to the prosecutor or whether you should hand over a courtesy copy.",
    "**Go to the hearing and take your documents.** The Maine Rules of Evidence do not apply, the State will be there, and the court grants the motion if you prove each prerequisite by a preponderance of the evidence.",
    "**After a grant, remember the reporting duty.** If you are ever convicted of a new crime, § 2264(7) requires the record to be unsealed and requires you to file a written notice promptly in this same criminal proceeding, naming the new conviction, its jurisdiction, court and docket number. If you do not and the court finds out, the burden flips to clear and convincing evidence, and failing to request that hearing results in automatic unsealing."
  ],

  deliberatelyBlank: [
    "**The court-for-filing election at the head of the form** — Superior Court, District Court and the Unified Criminal Docket are all left unticked, because which court entered your conviction is a fact about your own case and § 2264(1) requires the motion to be filed there.",
    "**The name of the crime and the date of conviction in paragraph 1.** Paragraph 1 also asserts that the crime is eligible for sealing under 15 M.R.S. § 2261(6), which is a legal conclusion the committed record assigns to the participant.",
    "**The Location (Town) line**, which names the town where the court sits.",
    "**Your signature and the date you sign it.** The platform never signs for you and never dates a signature that has not been made.",
    "**The attorney and Maine Bar No. line.** No representation fact is held for you, and having an attorney is not required.",
    "**Everything the court writes.** § 2264(5) requires the court to issue its own written order with findings of fact, and no proposed order is published or included."
  ],

  notTold: [
    "**Whether your crime is a current or former Class E crime, or matches one of the five listed pre-2017 marijuana offences.** The committed record assigns that to you and names it as a point where self-help stops when the class is not clear from your documents.",
    "**The date you fully satisfied every sentencing alternative.** Only your judgment, your probation records and your payment history establish it, and an unpaid fine or restitution balance means the four-year clock has not started.",
    "**Whether an older Maine prior disqualifies you.** CR-218 paragraph 3 and 15 M.R.S. § 2262(3) do not agree, and the committed record says the answer is outcome-determinative. See the section on paragraph 3.",
    "**Whether a chapter 310-A sealing order removes the case from Maine's public court record search.** The committed record holds this as an unresolved question, so this packet does not promise it.",
    "**What sealing does to an immigration case.** Maine sealing does not bind federal immigration authorities and the record remains available for fingerprint-based federal checks. If you are not a US citizen the committed record names this as a point to stop and get advice.",
    "**Whether sealing restores firearm rights.** It does not, and the committed record names a participant asking about firearm rights as a point where self-help stops."
  ],

  stopConditions: [
    "the offence class at the time of conviction is not clear from your documents;",
    "the conviction is a Class D marijuana offence and mapping it to one of the five listed subparagraphs requires reading the former statute;",
    "any sentencing-alternative completion date is uncertain, in particular a fine or restitution balance;",
    "you have any post-completion criminal case in any jurisdiction;",
    "you had a deferred disposition after completing the sentence for the eligible conviction;",
    "you have an older Maine prior that predates the completion date, because CR-218 paragraph 3 and § 2262(3) do not agree and the answer is outcome-determinative;",
    "you are not a US citizen — Maine sealing does not bind federal immigration authorities and the record remains available for fingerprint-based federal checks;",
    "you want to challenge the underlying conviction rather than seal it;",
    "the State signals opposition;",
    "you have already been denied once — denials are common in Maine and a second filing on the same facts is not a self-help matter;",
    "you are asking about firearm rights, because sealing does not restore them."
  ],

  whatThisIsNot:
    "This is the Maine Judicial Branch's own CR-218, prepared with the details the platform holds and delivered "
    + "as the Judicial Branch publishes it. It is not legal advice, it is not filed for you, and it does not "
    + "decide whether any conviction of yours is an eligible criminal conviction under 15 M.R.S. § 2261(6). It "
    + "is not expungement: Maine does not have expungement, and a sealing order restricts dissemination rather "
    + "than erasing the record. It is not a proposed order — the court writes its own under § 2264(5) — and it "
    + "is not a motion for a non-conviction record, which chapter 310-A does not reach at all.",

  receiptDoesNotEstablish: [
    "that this is the current official edition of CR-218, or that the Judicial Branch has not superseded it since the archive was assembled",
    "that any particular Maine conviction is an eligible criminal conviction within 15 M.R.S. § 2261(6)",
    "that the four-year period of § 2262(2) has run, or that every sentencing alternative has been fully satisfied",
    "that the movant has or has not a service obligation to the prosecutorial office, which the committed record holds open"
  ],

  buildFindings: [
    {
      finding:
        "THE PINNED SOURCE IS AN ENCRYPTED PDF AND pdf-lib CANNOT OPEN IT. Read from the pinned CR-218 (sha256 "
        + "82a9e808..), pikepdf reports is_encrypted true, one page, an AcroForm with fifteen fields and no "
        + "XFA. pdf-lib, which every builder in this corpus uses, fails on the same bytes before it reaches a "
        + "page: its parser reports a series of invalid object references and PDFCatalog.Pages throws "
        + "\"Expected instance of PDFDict, but got instance of undefined\". ignoreEncryption: true does not "
        + "help, because the failure is in resolving the xref rather than in the security handler.",
      consequence:
        "The family is built through a TRANSPORT step and not through a substitution. At build time the exact "
        + "pinned bytes are opened with pikepdf and saved with deterministic_id so the derivative is "
        + "reproducible, and the derivative is then proved equivalent to the official binary by the "
        + "repository's own fidelity reader — page count, page geometry, the terminal field set, every field "
        + "difference, the page content streams and XFA. The family STOPS with "
        + "UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY if any of those differ. The bound "
        + "identity remains the official encrypted binary; its SHA-256 is recomputed from disk before and "
        + "after the read and recorded in the receipt, and the derivative's own digest is recorded beside it "
        + "as transport rather than as identity. The derivative is written to a build-time temporary "
        + "directory and deleted when the build ends. The pattern is the one census-v1-ca-1203-4-set proved "
        + "on five encrypted California forms."
    },
    {
      finding:
        "A DECRYPTED DERIVATIVE ALREADY EXISTS IN THE REPOSITORY AND THIS BUILD DOES NOT USE IT. "
        + "data/rcap-all50/overlays/encrypted-pdf-rescue-report.json records this exact source as rescued by "
        + "qpdf_decrypt to "
        + "data/rcap-all50/overlays/rescued-encrypted-pdfs/maine-mjb-form-cr-218-rescued.pdf, sha256 "
        + "ca66d3b984a58999f0cd0164d09c3f8875f3119ec09b6556472a10fe50ee17b9.",
      consequence:
        "Not bound. That digest appears in no committed source record and in no entry of the committed corpus "
        + "index, and the rescue report and scripts/raster/unlock-encrypted-pdf.py both describe it as a "
        + "review derivative. Binding it would satisfy one identity with the binary of another, which the "
        + "captain source-identity rule forbids in terms. This build derives its own transport copy from the "
        + "pinned bytes at build time and proves it, which is a measurement this lane may make rather than a "
        + "determination it may not."
    },
    {
      finding:
        "CR-218 PRINTS ITS CAPTIONS BELOW THE RULES THEY CAPTION, which is the opposite of the convention the "
        + "shared capture assumes. Measured from the form's own content stream: \"Defendants Signature\" is "
        + "printed at y=217.1 beneath the widget named \"undefined\" at y[229.3,243.8]; \"Defendants Mailing "
        + "Address\" at y=153.1 beneath the widgets named \"1\" (y[180.1,194.6]) and \"2\" (y[165.0,179.5]); "
        + "\"Defendants Attorney and Maine Bar No.\" at y=181.7 beneath the attorney widget at "
        + "y[195.2,209.8]; and \"Docket No:.\" at y=660.2 beneath the widget named \"Text1\" at "
        + "y[658.8,671.3].",
      consequence:
        "Every caption in this family's map is quoted from the printed page and positioned by measurement, "
        + "not by the capture's above-the-rule assumption. Two consequences are load-bearing: the field named "
        + "\"undefined\" is the DEFENDANT'S SIGNATURE line and is classified protected rather than treated as "
        + "an unnamed spare box, and the fields named \"1\" and \"2\" are the two lines of the mailing-address "
        + "block rather than paragraph numbers."
    },
    {
      finding:
        "THE MAILING-ADDRESS LINES BIND NOTHING THROUGH THE ORDINARY CHANNEL. The two widgets are named \"1\" "
        + "and \"2\" and the only caption near them is the block caption printed below, so decideBinding has "
        + "no field name and no caption to match and returns no_allowlisted_fact_matches. Left as it found "
        + "them, the delivered motion would carry no address for the defendant while the platform holds one — "
        + "the same defect this sprint recorded on AOC-CV-226's street line.",
      consequence:
        "Written through the finalizer's opt-in narrativeAcrossFields channel, one held fact per field: "
        + "participant.street_address on line one and participant.city_state_zip on line two, both "
        + "established fact ids in the platform's own vocabulary. No caller text reaches the page through "
        + "that channel — it resolves fact ids from the same facts set as every other write — and a value "
        + "that will not fit its widget is refused whole rather than truncated."
    },
    {
      finding:
        "THE FORM PRINTS mm/dd/yyyy AND THE FACT IS STORED ISO. CR-218 prints \"Defendant DOB (mm/dd/yyyy)\" "
        + "beneath the date-of-birth blank, and a date fact is stored YYYY-MM-DD. Rendering the stored string "
        + "would put 1990-11-06 on a rule that reads month/day/year.",
      consequence:
        "printedDateOrder names the field \"Defendants DOB mmddyyyy\" and the order month_day_year, so the "
        + "finalizer renders 11/06/1990. The order is named by this caller because this caller read the "
        + "printed line; the shared module never infers an order from a field name, a locale or a "
        + "jurisdiction."
    },
    {
      finding:
        "PARAGRAPHS 2 TO 5 OF CR-218 CARRY NO FIELD OF ANY KIND. The form has fifteen AcroForm fields and "
        + "three of them are the court-for-filing checkboxes; the numbered assertions about the four-year "
        + "period, other Maine convictions and deferred dispositions, out-of-state convictions and pending "
        + "charges are printed text with a printed mark beside each. The defendant makes all four by signing.",
      consequence:
        "There is nothing for this build to tick or to leave unticked on any of them, so none appears in the "
        + "field map as a control. Paragraph 3's defect — the committed record's finding that its trailing "
        + "time limit governs the deferred-disposition clause but not the convictions clause, so the form "
        + "asks for an unbounded assertion the statute does not require — is carried into "
        + "participant-instructions.md in its own section, with both readings set out and an older Maine "
        + "prior named as a point to take advice on before filing."
    },
    {
      finding:
        "MAINE SEALS AND DOES NOT EXPUNGE, and the committed track registry makes that a packet instruction "
        + "rather than a preference: \"Never use 'expungement' in Maine participant copy.\"",
      consequence:
        "Asserted rather than intended. The build scans its own generated participant-instructions.md for the "
        + "string \"expunge\" and STOPS with stopClass FORBIDDEN_JURISDICTION_WORD_IN_PARTICIPANT_COPY unless "
        + "every occurrence sits inside one of the four sentences that exist to say Maine does not have it. A "
        + "later edit that reintroduces the word cannot pass silently."
    },
    {
      finding:
        "NO FEE INSTRUMENT AND NO FEE-WAIVER INSTRUMENT ARE CARRIED, and both absences are the record's "
        + "decision rather than an omission. The committed manifest records that no fee is expected under "
        + "Administrative Order JB-05-26 (A. 3-26) and says in terms \"Do not route the participant to CV-067 "
        + "or CV-191.\"",
      consequence:
        "The packet states the fee position in full, states why the $60 civil post-judgment figure does not "
        + "reach a criminal motion, tells the participant to confirm with the clerk, and promises no refund. "
        + "Per fee-and-waiver A4 nothing in the packet says it does not state a position, because it states "
        + "one."
    },
    {
      finding:
        "THE SECOND COMPONENT THE MANIFEST DECLARES IS PROCESS GUIDANCE AND NOT A FORM. The committed "
        + "packet-set manifest declares me-seal-gen-instructions-2 with outputStrategy process_guidance and "
        + "officialFormId null.",
      consequence:
        "Carried in participant-instructions.md rather than rendered as a separate PDF, and named there in "
        + "the component table read from the record. A document mapped and not rendered is a missing "
        + "companion form; a process-guidance component rendered as guidance is not."
    },
    {
      finding:
        "THE GUIDE IS PRINTED FROM THE RECORD, NOT FROM THE BUILDER. The committed packet-set manifest "
        + "carries this packet set's own requiredBeforeFiling list. Three Illinois builders in this sprint "
        + "printed none of their own packet set's list because they never referenced the record, and nine "
        + "zero counters never saw it.",
      consequence:
        "This build reads legal-design-packet-set-manifests.json at build time, locates packet set "
        + "me-seal-gen-set, and prints its requiredBeforeFiling list verbatim into a dedicated section of "
        + "participant-instructions.md with the count and the record's SHA-256 beside it. If the record stops "
        + "declaring that list the build STOPS with "
        + "RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS rather than printing a guide the record no longer "
        + "supports."
    }
  ],

  counselQuestions: [
    "The court-for-filing election is left unmarked on the ground that § 2264(1) fixes the court by the participant's own case rather than by the route. Confirm.",
    "CR-218 paragraph 3 is left to the participant with both readings set out, rather than being answered or the packet being withheld. Confirm that setting out the conflict is the right treatment.",
    "The packet tells the participant that notice is understood to be the court's, to confirm at the counter and to offer a courtesy copy. The committed record holds this as a release blocker. Confirm the fail-closed wording.",
    "The packet states that no fee is expected and explains why the $60 civil post-judgment figure does not reach this motion, and carries no fee-waiver form. Confirm.",
    "The pinned CR-218 binary is encrypted and unreadable by the corpus toolchain; the build renders through a deterministic pikepdf decryption proved equivalent to the official binary and stops if the proof fails. Confirm that this transport treatment, rather than a source re-acquisition, is right for a Judicial Branch form.",
    "The § 2264(7) post-grant self-reporting duty is carried in the participant instructions as the committed record directs. Confirm the wording, in particular the consequence that failing to request the hearing results in automatic unsealing.",
    "No proposed order is included, on the committed record's ground that § 2264(5) requires the court to write its own and that none is published. Confirm."
  ],

  reviewersAttention: [
    "The pinned source is an ENCRYPTED PDF. The rendered pages come from a build-time pikepdf decryption of those exact bytes, proved equivalent page for page, field for field and content stream for content stream. Please check on the raster that the delivered page is the Judicial Branch's CR-218 Rev. 7/24 as published.",
    "The word \"expungement\" must not appear in Maine participant copy except to say Maine does not have it. The build asserts this over its own guide and stops if it is breached; please confirm on reading.",
    "CR-218 prints its captions BELOW the rules they caption. The field named \"undefined\" is the defendant's signature line and is left blank by design; the fields named \"1\" and \"2\" are the two lines of the mailing-address block and carry the participant's address.",
    "Paragraphs 2 to 5 carry no field at all. Please check on the raster that no mark of any kind has been added beside any of them.",
    "The three court-for-filing boxes are all unticked by design.",
    "The date of birth is rendered mm/dd/yyyy because that is what the form prints beneath the blank; every other date on the form is the participant's.",
    "The boundary fixture carries a 42-character street address, a 35-character name and a 22-character docket number on a one-page form with short rules. Nothing in this build shortens a value: a value that will not fit is refused whole and reported as unfittable. Please check on the raster that no value is clipped at a rule end.",
    "participant-instructions.md prints the committed packet-set manifest's own requiredBeforeFiling list verbatim, with the record's SHA-256 beside it, plus its two-component table."
  ],

  composedBody() {
    throw new Error("this family composes no pages: its only component is the official CR-218");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "motion") {
      writes.push(
        h.write("Defendant", "Defendant (the caption block at the head of the form)", "participant.full_legal_name", 1),
        h.write("County", "County: (the caption block)", "matter.county", 1),
        h.write("Text1", "Docket No.: (the caption block; the form prints this caption BELOW the rule)", "matter.case_number", 1),
        h.write("Defendants DOB mmddyyyy", "Defendant DOB (mm/dd/yyyy)", "participant.date_of_birth", 1),
        /*
         * The two ruled lines of the mailing-address block, written through the
         * narrativeAcrossFields channel. See the officialComponents note above
         * for the measurement and for the refusal it answers.
         */
        h.write("1", "Defendants Mailing Address - first line", "participant.street_address", 1),
        h.write("2", "Defendants Mailing Address - second line", "participant.city_state_zip", 1)
      );

      refusals.push(
        // ---- the court-for-filing election
        h.election("Superior Court", "\"X\" the court for filing - Superior Court",
          "§ 2264(1) requires the motion to be filed in the court in which the conviction was entered, which is a fact about the participant's own case; the route covers all three courts", 1),
        h.election("District Court", "\"X\" the court for filing - District Court",
          "the second of the same three-way election", 1),
        h.election("Unified Criminal Docket", "\"X\" the court for filing - Unified Criminal Docket",
          "the third of the same three-way election", 1),

        // ---- the caption
        h.rbf("Location Town", "Location (Town):",
          "the town in which the court sits, as the caption of your own case names it",
          "the platform holds the county but no committed record establishes the court's town for any particular Maine case", 1),

        // ---- paragraph 1
        h.rbf("1 Defendant was convicted of the following crime of name of crime",
          "Paragraph 1 - Defendant was convicted of the following crime of (name of crime)",
          "the name of the crime exactly as the judgment names it. Paragraph 1 also asserts that the crime is eligible for sealing under 15 M.R.S. § 2261(6), and whether a crime is a current or former Class E crime, or matches one of the five listed pre-2017 marijuana offences, is a legal conclusion drawn from the judgment and the historical statute",
          "the committed record assigns the eligibility characterisation to the participant and names an unclear offence class as a point where self-help stops; no held record establishes any participant's own conviction", 1),
        h.rbf("on mmddyyyy", "Paragraph 1 - on (mm/dd/yyyy), the date of the conviction",
          "the date you were convicted, in mm/dd/yyyy, from the judgment rather than from memory",
          "no held record establishes any participant's own conviction date, and the committed manifest asks that it be checked against the certified judgment", 1),

        // ---- the signature block. The form prints each caption BELOW its rule.
        h.protectedBlank("Date mmddyyyy", "Date (mm/dd/yyyy) beside the defendant's signature",
          "a date written before the motion is signed would be false", 1),
        h.protectedBlank("undefined", "Defendants Signature - the widget the form leaves unnamed, captioned \"Defendants Signature\" printed directly beneath it",
          "the defendant signs the motion personally, and the committed record says in terms that LegalEase leaves the signature and date blank", 1),
        h.attorneyBlank("Defendants Attorney and Maine Bar No", "Defendants Attorney and Maine Bar No. (Having an attorney is not required for filing)",
          "completed only where an attorney appears for you; no representation fact is held for this participant and the form itself marks the line optional", 1)
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
