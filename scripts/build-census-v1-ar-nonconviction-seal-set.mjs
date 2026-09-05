#!/usr/bin/env node
/**
 * FABLE-PD official-form packet family — Arkansas, sealing a NON-CONVICTION
 * under Act 1460 of 2013 (A.C.A. Sec. 16-90-1401 et seq.).
 *
 *   node scripts/build-census-v1-ar-nonconviction-seal-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-only:AR:ar-nonconviction-seal
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family: implementationStrategy official_pdf_fill,
 * two ACIC forms bound by exact SHA-256 and delivered as the Arkansas Crime
 * Information Center publishes them.
 *
 *   * the ACIC Petition to Seal Records of Nolle Prosequi, Dismissals,
 *     Judgments of Acquittal, and Charges Not Filed -- what the participant
 *     files; and
 *   * the matching ACIC Order -- the proposed order the COURT signs. It is
 *     captionOnly: its findings, its decree, the judge's signature and the
 *     date beside it are the court's alone and this packet writes nothing
 *     there.
 *
 * THREE MIS-BINDINGS THIS FAMILY REFUSES BY ROLE
 *
 * The shared semantics decide what MAY be written; this file supplies the
 * classification only a caller can supply, and on this form that classification
 * stops three writes that would otherwise be made and would each be wrong:
 *
 *   1. `Sex`, on the petition's identification block, BINDS
 *      participant.date_of_birth. Its own name matches no descriptor, so the
 *      binder falls back to the printed label -- and the caption capture on
 *      this page returns "DOB" for it, because the block prints
 *      "Sex ____ SID No." and "DOB ____ FBI No." one line apart. A date of
 *      birth in the sex box is a wrong answer to an identification question
 *      that the form says is required for the state and national record
 *      systems.
 *   2. `COUNTY/CITY`, the county in the caption "IN THE ______ COURT OF
 *      ________, ARKANSAS", BINDS participant.city. That is the county of the
 *      court where the order was entered, not where the participant lives, and
 *      the two are routinely different. On the ORDER the same field is stopped
 *      today only because a court-issued order takes caption facts only and
 *      participant.city is not one; a refusal that depends on another rule is
 *      not this family's refusal, so it is stated on both documents.
 *   3. `Petitioner`, in the petition's VERIFICATION block, carries TWO widgets:
 *      the blank inside "Comes the Petitioner, ____, under oath" AND the
 *      signature rule above the printed word "Petitioner" at the foot of the
 *      notarised jurat. Filling the field fills both, so a legitimate caption
 *      write would put the participant's name on a notarised signature line.
 *      One widget cannot be filled without the other, so the field is refused
 *      whole and the sentence blank becomes the participant's.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "ar-nonconviction-seal-set";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-ar-nonconviction-seal-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill",
  jurisdiction: "AR",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition and Order to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed Under Act 1460 of 2013 (A.C.A. Sec. 16-90-1401 et seq.)",
  routeName: "sealing an Arkansas record that ended in a nolle prosequi, a dismissal, an acquittal, or charges never filed, under Act 1460 of 2013",
  statutes: ["A.C.A. § 16-90-1401 et seq.", "A.C.A. § 16-90-1410", "A.C.A. § 16-90-1413", "A.C.A. § 16-90-1419"],
  routes: [{ routeKey: "obligation:track-only:AR:ar-nonconviction-seal" }],

  records: [
    {
      recordId: "packet-set-manifest:ar-nonconviction-seal-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Under DETERMINATION_FEE_AND_WAIVER_"
        + "STANDARD amendment A2 its participantActionRequired entries are a held source, and here they settle "
        + "the filing destination, the service rule and its three-day deadline, the prosecutor's objection "
        + "window, and the two records steps that precede the petition",
      mustContain: [
        "File the ACIC non-conviction petition and order pair in the court where the nolle prosequi or dismissal order was entered.",
        "Serve the prosecuting attorney within three days of filing. The prosecuting attorney has 30 days to object.",
        "Obtain Fingerprint card. Have fingerprints taken and submit the card with the petition.",
        "Obtain Arkansas criminal history, via the ACIC Authorization for Review of Criminal History Information.",
        "The source review does not state a filing fee for this petition."
      ]
    },
    {
      recordId: "compiled-profile:AR-arkansas",
      path: "src/lib/rcap-engine/compiled/profiles/AR-arkansas.json",
      role:
        "the compiled Arkansas profile, a held source for this jurisdiction under amendment A2. Its fee lines "
        + "are keyed to ACT 1460 SEALING, which is the act this petition is filed under and printed on the form's "
        + "own face, so under amendment A3 they answer THIS route's fee question rather than a sibling's. It also "
        + "records the opposition window class-dependently and the real, non-filing costs of the route",
      mustContain: [
        "Act 1460 eliminated sealing filing fees",
        "Sealing petition filing fee $0 Filing fees eliminated by the 2019 amendments",
        "File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing.",
        "ACIC criminal-history record ACIC fee To confirm offenses, classes, dispositions",
        "30 days (misdemeanor) or 90 days (felony) to file a notice of opposition stating reasons"
      ]
    }
  ],

  officialComponents: {
    petition: {
      sourceId: "official-form:ACIC-PETITION-TO-SEAL-NONCONVICTION",
      documentId: "AR-ACIC-PETITION-TO-SEAL-NONCONVICTION",
      formNumber: "AR-ACIC-PETITION-TO-SEAL-NONCONVICTION",
      officialTitle: "Petition to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed Under Act 1460 of 2013",
      revision: "REV-2020-04-22",
      instrumentKind: "primary_filing",
      sha256: "09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61",
      acroform: true,
      captionOnly: false,
      explicitMappings: {
        "First Middle and Last name": "participant.full_legal_name",
        1: "matter.charge"
      },
      unwritable: [
        { field: "Sex", class: "identification_block_descriptor",
          why: "The identification block's SEX entry. Its own name matches no descriptor, so the binder falls back to the printed label, and the caption capture returns \"DOB\" for it — the block prints Sex and DOB one line apart. It therefore BINDS participant.date_of_birth, which would write a date of birth into the sex box of a block the form says is required for identification in the state and national record systems. The participant states their own sex here." },
        { field: "COUNTY/CITY", class: "caption_venue_county",
          why: "The county in the caption \"IN THE ______ COURT OF ________, ARKANSAS\". It BINDS participant.city, because the field name carries the word city and the caption capture offers nothing better. This blank is the county of the court where the nolle prosequi or dismissal order was entered; the participant's own city is a different fact and is written in the address block on page 2." },
        { field: "Petitioner", class: "notarised_signature_line_shared_with_a_caption_blank",
          why: "This ONE field carries TWO widgets: the blank inside \"Comes the Petitioner, ____, under oath and states\" and the signature rule above the printed word \"Petitioner\" at the foot of the notarised jurat. A field is filled as a whole, so writing the caption blank would also write the participant's name onto a notarised signature line. The field is refused entire, and the sentence blank is the participant's to complete." },
        { field: "COUNTY OF", class: "notarial_jurat_county",
          why: "The county in the VERIFICATION block's \"STATE OF ARKANSAS / COUNTY OF ____\". That is the county in which the oath is administered before the notary, not the county of the case; the platform does not know where the participant will be sworn." },
        { field: "in violation of ACA", class: "statutory_section_of_the_offence",
          why: "The \"in violation of A.C.A. § ______\" blank. Its printed caption carries the word violation, so it binds matter.charge — but the blank holds the Arkansas Code SECTION, not the name of the offence, and writing the charge there would state a section number that is not one. The participant copies the section from their own paperwork." },
        { field: "ADDRESS 2", class: "address_continuation_line",
          why: "The second printed rule of the two-line street block. The platform holds one street address and writes it on the first rule; filling both prints the same address twice. It is refused today by geometry as well, because the caption capture reaches the Defendant's Signature rule beside it — but that is a refusal for the wrong reason, and this is the right one." },
        { field: "DAY 1", class: "arrest_date_component",
          why: "Day component of paragraph 1's arrest date. The platform holds an arrest date as a whole and holds no day fact, so there is nothing correct to write here." },
        { field: "MONTH 1", class: "arrest_date_component",
          why: "Month component of the same date, on the same footing. This is the blank class that on the sibling arrest-seal form was proved to receive the participant's own name through the printed-label fallback; the shared binder now refuses a date-component name, and this states the family's own reason underneath it." },
        { field: "YEAR 1", class: "arrest_date_component",
          why: "Year component of the same date. The trio is one fact the platform does not hold in component form." },
        { field: "DEFENDANT", class: "certificate_of_service_attestation",
          why: "The certifying party's name in the page 4 Certificate of Service's \"I, ____, do hereby certify that a true and correct copy ... has been provided\". That is a sworn statement about an act of service, made after mailing, not a caption." },
        { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
          why: "The ATN is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of; the participant copies it from their arrest paperwork or their ACIC record." }
      ]
    },
    order: {
      sourceId: "official-form:ACIC-ORDER-TO-SEAL-NONCONVICTION",
      documentId: "AR-ACIC-ORDER-TO-SEAL-NONCONVICTION",
      formNumber: "AR-ACIC-ORDER-TO-SEAL-NONCONVICTION",
      officialTitle: "Order to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed Under Act 1460 of 2013",
      revision: "REV-2023-10-25",
      instrumentKind: "proposed_order",
      sha256: "4ca0a57a56f7662dd6590e9bfbbe7b96fcf2d39df8ca84253c53e9bd0f07605a",
      acroform: true,
      captionOnly: true,
      explicitMappings: {
        "First Middle and Last name": "participant.full_legal_name"
      },
      unwritable: [
        { field: "COUNTY/CITY", class: "caption_venue_county",
          why: "The county in the order's caption, on the same reasoning as the petition's. It binds participant.city, which is the wrong fact. On this document it is ALSO stopped because a court-issued order accepts caption facts only and participant.city is not one — but a refusal that depends on another rule is not this family's refusal, and the classification is stated here so it survives whatever that rule does next." },
        { field: "Judge", class: "court_only_signature",
          why: "The judge's signature line on the order. Court-only." },
        { field: "Date", class: "court_only_signature_date",
          why: "The date beside the judge's signature. The court dates its own order." },
        { field: "DAY 1", class: "arrest_date_component",
          why: "Day component of the arrest date in the court's own findings. The platform holds no day fact." },
        { field: "MONTH 1", class: "arrest_date_component",
          why: "Month component of the same finding, on the same footing." },
        { field: "YEAR 1", class: "arrest_date_component",
          why: "Year component of the same finding, on the same footing." },
        { field: "ACA NO", class: "statutory_section_of_the_offence",
          why: "The order's \"in violation of A.C.A. §\" blank, which binds matter.charge through its printed caption and holds a code section rather than an offence name — the same defect as on the petition, in the court's findings." },
        { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
          why: "ACIC-assigned arrest identifier in the order's identification block; the agency's number to state." }
      ]
    }
  },

  officialCells: {},

  components: ["petition", "order"],
  componentTitles: {
    petition: "ACIC Petition to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed",
    order: "ACIC Order to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed"
  },
  componentConditions: {},
  componentDescriptions: {
    petition: "the ACIC petition you file, with a verification page for a notary and a certificate of service on its last page",
    order: "the matching proposed order you hand the court to sign; every finding, the decree, the judge's signature and the date beside it are the court's alone"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street",
      "participant.city": "Little Rock",
      "participant.state": "AR",
      "participant.zip": "72201",
      "matter.case_number": "60CR-19-1184",
      "matter.charges": [{ charge: "Theft of property" }]
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Ouachita Crossing Road, Apartment 14B",
      "participant.city": "Fayetteville",
      "participant.state": "AR",
      "participant.zip": "72701-2214",
      "matter.case_number": "72CR-2004-000000118844-A",
      "matter.charges": [{ charge: "Breaking or entering a vehicle, and criminal mischief in the first degree" }]
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "Both documents are the Arkansas Crime Information Center's own published forms, bound by exact SHA-256 "
    + "through the committed corpus index and delivered as ACIC issues them. Nothing is composed, substituted or "
    + "invented, and no page of this packet was authored by this build.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: this is the ACIC non-conviction pair, and its own title names the "
    + "four endings it serves. Which of those four ended the participant's case is NOT determined by the route — "
    + "the committed packet-set manifest asks the participant that question in terms (\"How did the case end — "
    + "nolle prosequi, dismissal, acquittal, or were charges never filed?\") and directs them to check the answer "
    + "against their ACIC record. Paragraph 2's four boxes are therefore genuine participant elections about "
    + "their own case, and so are paragraph 4's pending-felony pair and paragraph 5's sex-offender-registration "
    + "pair. No box is marked, and no election on either document is one this route decides.",

  routeSelectionsMade: [
    {
      selection: "instrument set",
      value: "the ACIC non-conviction petition and its matching order, filed as a pair",
      determinedBy:
        "the committed packet-set manifest's two components and its file entry: \"File the ACIC non-conviction "
        + "petition and order pair in the court where the nolle prosequi or dismissal order was entered.\""
    }
  ],

  instructionsHeading: "Filing instructions — sealing an Arkansas non-conviction under Act 1460 of 2013",

  instructionsIntro: [
    "This packet is two ACIC forms, filed together: the **Petition to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed**, and the matching **Order**. The petition is what you file. The order is what you hand the court to sign — its findings, its decree, the judge's signature and the date beside it are the court's alone, and this packet writes nothing there.",
    "**The petition's own paragraph 2 states the four situations this packet covers**, and you must tick exactly one: an Order of Nolle Prosequi entered more than one year ago that the prosecuting or city attorney has not refiled; an Order of Dismissal; a Judgment of Acquittal that was not for reason of mental disease or defect; or the prosecuting or city attorney never filing charges at all. If none of those is true of your case, this is the wrong packet.",
    "The platform filled what it holds about you and your case: your name in the caption, in the prayer and in the order's decree; the case number; your street address, city, state and ZIP on the petition's address block; your date of birth in both identification blocks; and the first offence line on the petition. Every other blank is deliberate and every one is listed below.",
    "**Three blanks are refused on purpose and are worth knowing about**, because each would otherwise be filled with a wrong answer rather than left empty. The identification block's **Sex** entry is refused because the form's own layout makes it bind a date of birth. The caption's **county** is refused because it binds the city you live in rather than the county of the court. And the verification block's **Petitioner** blank is refused because that one field also controls the notarised signature line above the word \"Petitioner\", and no packet may put your name on a signature line."
  ],

  whoDecides: [
    "**The court decides, on your petition.** You file; the prosecuting attorney may object; the judge signs the order or does not.",
    "**The order is the court's instrument and you complete nothing on it below the caption.** Its recitals mirror the petition's, and the caption facts — your name, the case number, your date of birth in the identification block — are filled to match. When you file, ask the clerk of the filing court whether that court wants the order's recital blanks completed to match your petition, and complete exactly those if the clerk says so.",
    "**After the order is signed, the distribution is the CLERK's, not yours.** The order's own text directs it: the Clerk is directed to mail or transmit a certified copy of the order to the Arkansas Crime Information Center, the Administrative Office of the Courts, the prosecuting and/or city attorney as the case may be, the District Court Clerk if applicable, and the arresting agency, and each of those agencies must comply with A.C.A. § 16-90-1413 as it pertains to them. You do not have to serve the sealed order on the record-holders yourself."
  ],

  // Paragraph 2 of the ACIC petition offers FOUR dispositions and this packet
  // ships all four. The repository answers venue for TWO of them and records the
  // other two as unresolved, in three places: the route census row's
  // destination.detail, the track registry's venue field, and that entry's
  // unresolvedQuestions[0] at impact build_blocker. So the destination is stated
  // where the record establishes it and refused where the record does not, per
  // disposition. The sentence "it is the answer: you do not have to work out
  // venue for yourself" is gone: it was the specific clause that was false for
  // half the dispositions, and for a never-filed charge there is no court that
  // entered any order for the rule to point at.
  filingDestination: [
    "**Where this goes depends on which of paragraph 2's four situations is yours, and this packet can answer that for two of the four.**",
    "**If the case ended in a nolle prosequi, or in an order of dismissal: file the petition and the unsigned order together in the court where that order was entered.** A.C.A. § 16-90-1410(b) states venue that way, and the committed packet-set manifest gives this packet the same instruction.",
    "**If you were acquitted, or if charges were never filed, no record held here states where the petition goes — and this packet will not guess it.** The committed track record for this route says so in terms: venue for an acquittal and for charges never filed is not stated in § 16-90-1410(b), and it is carried there as an unresolved question rather than as an answer. For charges that were never filed there is no court that entered any order at all, so the rule above has nothing to point at. **Ask the circuit clerk's office of the county where the arrest happened, or where the charge would have been brought, which court takes an Act 1460 non-conviction petition on your facts — and do not file until you have that answer.**",
    "**Check the county printed in the caption before you file.** The caption's county blank is one this packet deliberately leaves to you. Where the case ended in a nolle prosequi or a dismissal, write the county of the court that entered the order. Where it ended in an acquittal, or charges were never filed, write the county the clerk's office tells you under the paragraph above. Either way it is the county of the court you file in, not the county you live in unless those are the same.",
    "**Which of the two Arkansas courts it is — circuit or district — is open in every one of the four situations, and the clerk answers it.** The compiled Arkansas profile records the rule as \"File in the circuit or district court that handled the case\", and the order's own distribution paragraph contemplates both, directing certified copies to \"the District Court Clerk, if applicable\". **Ask the circuit clerk's office of the county you identified above which of the two takes an Act 1460 non-conviction petition**, and write the answer in the caption's \"IN THE ______ COURT OF\" blank.",
    "**The DIVISION blank in the caption is yours too, and only if that court has divisions.** The same clerk's office can tell you."
  ],

  feeAndWaiver: [
    "**There is no filing fee for this petition.** The compiled Arkansas profile records it three ways, and every one of them is keyed to ACT 1460 — the act printed on the face of both of these forms: \"Act 1460 eliminated sealing filing fees\"; \"Sealing petition filing fee $0 — Filing fees eliminated by the 2019 amendments\"; and, in its filing rule, \"File in the circuit or district court that handled the case. Act 1460 eliminated filing fees for sealing.\"",
    "**What that means for paragraph 3, which you are signing.** Paragraph 3 of the petition is a statement that you \"ha[ve] paid all filing fees required to be paid with the filing of this Petition mandated by A.C.A § 16-90-1419\". The printed form still recites that statute and prints no amount anywhere. Where no filing fee is required, there is none left to have paid, and the sentence is true as printed. So do not read paragraph 3 as a bill. **If the clerk of the court where you file nevertheless asks you to pay something, that is a question about that court's own practice rather than about this packet — ask the clerk of that court what the charge is for and whether it can be waived or reduced, and settle it before you sign, because paragraph 3 is part of what you sign.**",
    "**There is no fee-waiver form in this packet because there is no filing fee to waive.** The committed packet-set manifest records the same thing from the other direction: its pay_fee entry says the source review does not state a filing fee for this petition, and its apply_fee_waiver entry says the review does not address a waiver.",
    "**The costs this route does carry are records costs, not filing fees**, and the same compiled profile names them: the ACIC criminal-history record carries an ACIC fee, a copy of a Judgment and Commitment Order carries a small clerk fee from the sentencing court, and counsel costs whatever counsel costs — which is not required here, and which legal-aid organisations and sealing clinics assist with at no charge.",
    "**One cost is not money.** The verification page must be sworn before a notary, and a notary may charge for the acknowledgement. Ask whoever notarises it."
  ],

  service: [
    "**Serve the prosecuting attorney within THREE DAYS of filing.** That is the committed packet-set manifest's rule for this packet — \"Serve the prosecuting attorney within three days of filing\" — and nothing on the printed forms tells you to look for a deadline, because the certificate of service sits inside the petition and prints none. Three days from the day you file.",
    "**Who you serve, and how, is on the petition's own last page.** The Certificate of Service states it in full: a true and correct copy of the petition goes to **either the Prosecuting Attorney for the county in which the petition has been filed or to the City Attorney, depending on which office prosecuted the case**, **and to the arresting agency** — by placing a copy in the United States mail, postage prepaid, or by hand delivering a copy to that office.",
    "**Complete the Certificate of Service only after you have actually served both.** Your name in the \"I, ______\" line, the signature line and the date beside it are all left blank by this packet, because service has not happened yet and a signed certificate of a mailing that never occurred is a false statement to the court.",
    "**Then expect an objection, or expect silence.** The committed manifest gives the prosecuting attorney **30 days to object**. The compiled Arkansas profile records the window class-dependently for Act 1460 sealing generally — \"30 days (misdemeanor) or 90 days (felony) to file a notice of opposition stating reasons\" — so if the offence in paragraph 1 is a felony the longer window may apply to you. **Ask the clerk of the court where you file which window that court runs.** If no objection is filed, many Arkansas courts grant a sealing petition on the papers.",
    "**You do not serve the signed order on anyone.** The clerk distributes it — see *Who decides this* above."
  ],

  documentsToObtain: [
    ["A fingerprint card. The committed packet-set manifest requires it before filing: \"Have fingerprints taken and submit the card with the petition.\" LegalEase does not collect fingerprints and this packet contains no card", "a law enforcement agency or an authorised fingerprint vendor"],
    ["Your Arkansas criminal history, obtained on the ACIC Authorization for Review of Criminal History Information. This is the records step that comes before the petition, and it is what you check the case against", "the Arkansas Crime Information Center; the compiled profile records that an ACIC fee applies"],
    ["The order that ended the case — the nolle prosequi, the dismissal or the judgment of acquittal — or whatever shows charges were never filed", "the clerk of the court that entered it"],
    ["Your arrest paperwork, for the arrest date, the offence, the Arkansas Code section and the arrest tracking number", "the arresting agency, or your ACIC record"]
  ],

  steps: [
    "**Check paragraph 2 against your own record.** Exactly one of its four boxes must be true of your case. The committed manifest asks the same question — how did the case end — and directs you to check your answer against your ACIC criminal history before you file.",
    "**Obtain your ACIC criminal history and your fingerprint card.** Both come before filing; the card goes in with the petition.",
    "**Fill in every blank listed in the table below**, on both documents, from the records rather than from memory.",
    "**Tick exactly one box in paragraph 2, one in paragraph 4 and one in paragraph 5.** Each is a statement about your own record and this packet marks none of them.",
    "**Take the petition to a notary and swear the verification on page 3.** The notary completes the jurat, the seal, the commission expiry and the notary signature; you complete your own name in \"Comes the Petitioner, ____\" and sign where the notary directs.",
    "**Sign and date the petition on page 2.** Paragraph 6 makes the whole petition a statement that the information is true and correct to the best of your knowledge.",
    "**File the petition, the fingerprint card and the UNSIGNED order** in the court identified under \"Where this goes\" — for a nolle prosequi or a dismissal that is the court where the order was entered, and for an acquittal or a never-filed charge it is whatever the circuit clerk's office tells you, because no record held here states it. Pay nothing: Act 1460 eliminated the filing fee.",
    "**Serve the prosecuting or city attorney and the arresting agency within three days of filing**, then complete and sign the Certificate of Service on the petition's last page.",
    "**Wait out the objection window** — 30 days under the committed manifest, possibly 90 for a felony under the compiled profile. Ask the clerk which the court runs.",
    "**If the order is signed, the clerk distributes it.** You do not have to deliver certified copies to ACIC, the Administrative Office of the Courts, the prosecutor, the district court clerk or the arresting agency; the order directs the clerk to do it."
  ],

  deliberatelyBlank: [
    "**Your signature on the petition and the date beside it**, and the whole Certificate of Service — name, signature and date. Service has not happened yet.",
    "**Everything on the order below its caption.** The findings, the paragraph boxes, the decree, the judge's signature and the date are the court's.",
    "**The entire notary block** — the jurat day, month and year, the seal, the notary's signature and the commission expiry. A notary completes it in your presence.",
    "**The identification block's Sex entry**, refused because the form's own layout makes it bind a date of birth; **the caption's county**, refused because it binds the city you live in; and **the verification block's \"Comes the Petitioner, ____\" blank**, refused because that one field also controls the notarised signature line above it.",
    "**The arrest date's day, month and year blanks.** The platform holds an arrest date as a whole and holds no day, month or year fact.",
    "**Race, Arrest Tracking Number, SID and FBI number.** The form itself marks the FBI number \"if known\"; the rest are identification facts the platform does not hold."
  ],

  notTold: [
    "**Whether the circuit or the district court takes your petition.** The compiled profile records that Act 1460 sealing is filed \"in the circuit or district court that handled the case\", and which of the two varies by county. The circuit clerk's office of the county identified under \"Where this goes\" is the office that answers it.",
    "**Whether the objection window on your case is 30 days or 90.** The committed manifest says 30; the compiled profile records 30 for a misdemeanour and 90 for a felony under Act 1460 generally. Both are held and they are keyed differently, so both are disclosed here rather than one being chosen for you. Ask the clerk of the court where you file which window that court runs.",
    "**What the ACIC criminal-history record costs, and what a notary charges.** The compiled profile records that an ACIC fee applies and states no amount; ACIC publishes it. A notary's charge is the notary's.",
    "**Whether your court has divisions.** The caption's DIVISION blank is completed only if it does, and the clerk's office of that court answers it.",
    "**Where an acquittal or a never-filed charge is filed.** § 16-90-1410(b) states venue for a nolle prosequi and for a dismissal and says nothing about the other two, and the committed track record for this route carries that gap as an unresolved question rather than an answer. The circuit clerk's office of the county named under \"Where this goes\" is the office to ask, and it is a question to settle before you file."
  ],

  stopConditions: [
    "none of paragraph 2's four situations is true of your case — this petition is for a nolle prosequi, a dismissal, an acquittal, or charges never filed, and a case that ended in a conviction or a diversion is a different ACIC form family;",
    "the acquittal was for reason of mental disease or defect under A.C.A. § 5-2-301 et seq. — paragraph 2's acquittal box excludes it in terms;",
    "you have a pending felony charge in any state or federal court, so paragraph 4's second box is yours — whether the petition can be granted while it is pending is a question this packet does not answer;",
    "you are required to register under the Sex Offender Registration Act of 1997, so paragraph 5 reads IS — what that means for sealing this record is a question this packet does not answer;",
    "the prosecuting attorney files a notice of opposition — the petition is contested from that point and goes to a hearing;",
    "the court sets a contested hearing;",
    "you cannot work out which offence, class or A.C.A. section to copy and your paperwork does not show them — your ACIC criminal-history record is where they are;",
    // The registry's condition 4, absent entirely before this repair, and the
    // one condition the earlier destination text affirmatively reassured
    // against. It is stated here and in "Where this goes" alike.
    "your disposition is an acquittal or a charge that was never filed, and venue is unresolved — no record held here states which court takes an Act 1460 non-conviction petition on those two facts, and \"Where this goes\" above says so; ask the circuit clerk's office before you file anything;",
    // The registry's condition 3 carried on all three of its limbs. Licensing
    // and firearm consequences appeared nowhere in this packet before.
    "immigration, licensing or firearm consequences are in play — this packet does not tell you what sealing this record does, or does not do, to any of the three, and a lawyer is the place to ask;",
    "a nolle prossed charge may have been refiled — a nolle prosequi is not always the end of the matter, and whether yours can be refiled is not a question this packet answers."
  ],

  whatThisIsNot:
    "This is a prepared set of official Arkansas Crime Information Center forms, delivered as ACIC publishes "
    + "them. It is not legal advice, it is not filed for you, and it does not decide whether your record can be "
    + "sealed under A.C.A. Sec. 16-90-1401 et seq. It is not the ACIC form family for a conviction or a "
    + "diversion, and it is not the ACIC arrest-sealing petition, which is a different route and a different "
    + "packet.",

  receiptDoesNotEstablish: [
    "that these are the current official editions of either ACIC form, or that neither has been superseded since the archive was assembled",
    "that any particular Arkansas case ended in a nolle prosequi, a dismissal, an acquittal, or with no charges filed"
  ],

  buildFindings: [
    {
      finding:
        "THREE writes the shared semantics would have made are refused by role, and each would have been wrong "
        + "rather than merely unhelpful: `Sex` binds participant.date_of_birth through the printed-label "
        + "fallback because the identification block prints Sex and DOB one line apart; `COUNTY/CITY` binds "
        + "participant.city although it is the county of the filing court; and `Petitioner` carries two widgets, "
        + "one of them the notarised signature rule at the foot of the jurat.",
      consequence:
        "All three are declared unwritable with the reason stated, are classified required-before-filing, and "
        + "are disclosed by name in participant-instructions.md — including a paragraph explaining to the "
        + "participant why each is empty, so a refusal does not read as an oversight."
    },
    {
      finding:
        "The `COUNTY/CITY` mis-binding is stopped on the ORDER today by a different rule: a court-issued order "
        + "accepts caption facts only, and participant.city is not one.",
      consequence:
        "It is refused by role on both documents anyway. A refusal that depends on another rule is not this "
        + "family's refusal and would disappear the moment that rule moved."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against DETERMINATION_FEE_AND_WAIVER_STANDARD A1-A4. The compiled Arkansas "
        + "profile is a held source under A2 and its three fee statements are keyed to ACT 1460 SEALING — the "
        + "act printed on the face of both bound forms — so under A3 they answer this route rather than a "
        + "sibling's, and A1 forbids substituting a named authority for an answer the repository holds.",
      consequence:
        "The packet states that there is no filing fee and quotes all three lines; explains what that means for "
        + "paragraph 3's sworn fee averment, which the form still recites; names the clerk of the filing court "
        + "for the residual question of a particular court's own practice; and separately names the records "
        + "costs the same profile records, so that a participant does not read \"no filing fee\" as \"free\"."
    },
    {
      finding:
        "SERVICE is answered by two held records that agree on the recipients and differ on the objection "
        + "window: the committed packet-set manifest sets three days to serve and 30 days to object, and the "
        + "compiled profile records the window class-dependently as 30 for a misdemeanour and 90 for a felony.",
      consequence:
        "Both are disclosed rather than one being chosen, with the clerk of the filing court named for which "
        + "window that court runs. The recipients and the method are taken from the petition's own printed "
        + "Certificate of Service."
    },
    {
      finding:
        "The order's own text directs the CLERK to distribute certified copies to ACIC, the Administrative "
        + "Office of the Courts, the prosecuting or city attorney, the District Court Clerk if applicable, and "
        + "the arresting agency.",
      consequence:
        "The packet states that this step is the clerk's and not the participant's, in the order's own terms, "
        + "so that nobody sets out to deliver sealed orders by hand."
    },
    {
      finding:
        "Paragraph 2's four boxes, paragraph 4's pair and paragraph 5's pair are elections about the "
        + "participant's own record, and the committed packet-set manifest asks the participant paragraph 2's "
        + "question in terms rather than resolving it.",
      consequence:
        "All eight are recorded as genuine participant elections rather than as route-determined selections "
        + "left unmade, with the reasoning in routeSelectionNote. No box is marked on either document."
    }
  ],

  counselQuestions: [
    "The `Petitioner` field is refused whole because one of its two widgets is the notarised signature rule. That leaves the \"Comes the Petitioner, ____\" blank empty on a page the participant swears. Confirm that leaving it to the participant is right, against the alternative of a form-level repair.",
    "The order is treated as captionOnly and this packet writes the participant's name into its decree sentence (\"the Petition of the Defendant, ____\") as a caption fact. Confirm that writing a name inside the court's ORDERED paragraph is acceptable, or say that the whole paragraph should be left blank.",
    "The packet states there is no filing fee from the compiled profile's Act 1460 lines while paragraph 3 of the petition still recites A.C.A. § 16-90-1419. Confirm the reading that the averment is true as printed where no fee is required.",
    "Two held records give different objection windows (manifest: 30 days; profile: 30 misdemeanour / 90 felony). The packet discloses both and names the clerk. Confirm, or settle which governs.",
    "The identification block's Sex entry is refused because of a caption-capture defect rather than because it is the participant's to state. Confirm that leaving it to the participant is the right disposition.",
    "SCOPE, RAISED BY VF09 AND NOT SETTLED HERE. The committed track record's scopeRestrictions[1] told the build to 'Resolve venue for acquittals and uncharged matters before shipping those two dispositions; ship dismissal and nolle prosequi first.' This packet ships all four of paragraph 2's dispositions. This repair scoped the venue statement so that the two unresolved dispositions are told, on the packet's face, that no held record states where they file and who to ask instead — it did not narrow the packet's scope and did not answer the venue question. Either the acquittal and never-filed boxes come out of scope until venue is resolved, or that scopeRestriction is superseded on the record. Both are decisions for Captain or counsel; a repair lane may not make either, and may not answer venue by inference."
  ],

  reviewersAttention: [
    "Three role refusals on this family stop writes that would have been WRONG, not merely absent. They are the substance of this build; please check each against the printed page.",
    "The order is captionOnly. Everything below its caption is deliberately empty and must stay that way on the raster.",
    "The petition's page 3 is a notarial jurat. Nothing in the whole block is filled, including the day, month and year of the oath."
  ],

  composedBody() {
    throw new Error("this family composes no pages: every component is an official ACIC form");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "petition") {
      writes.push(
        h.write("First Middle and Last name", "Defendant named in the caption of the petition (First, Middle and Last name)", "participant.full_legal_name", 1),
        h.write("Case No", "Case No. in the caption of the petition", "matter.case_number", 1),
        h.write("1", "Paragraph 1 - the offence(s) the Defendant was charged with, first printed rule", "matter.charge", 1),
        h.write("Defendant", "Defendant named in the WHEREFORE prayer on page 2", "participant.full_legal_name", 2),
        h.write("ADDRESS 1", "Defendant's Address - street line", "participant.street_address", 2),
        h.write("City", "Defendant's Address - City", "participant.city", 2),
        h.write("State", "Defendant's Address - State", "participant.state", 2),
        h.write("Zip code", "Defendant's Address - Zip code", "participant.zip", 2),
        h.write("DOB", "DOB in the identification block on page 3", "participant.date_of_birth", 3)
      );
      refusals.push(
        h.rbf("COURT TYPE", "Caption - the type of court in \"IN THE ______ COURT OF\"",
          "which Arkansas court takes an Act 1460 non-conviction petition where your order was entered - circuit or district; the circuit clerk's office of that county answers it",
          "the compiled profile records that Act 1460 sealing is filed in the circuit or district court that handled the case, and which of the two varies by county", 1),
        h.rbf("COUNTY/CITY", "Caption - the county in \"COURT OF ________, ARKANSAS\"",
          "the county of the court where the nolle prosequi, dismissal or judgment of acquittal was entered - not the county you live in",
          "this blank binds participant.city through its own field name, which is the wrong fact; the county of the filing court is a case fact the participant establishes", 1),
        h.rbf("DAY 1", "Paragraph 1 - the DAY of the arrest date",
          "the day of the month you were arrested, copied from your arrest paperwork",
          "the platform holds an arrest date as a whole and holds no day fact", 1),
        h.rbf("MONTH 1", "Paragraph 1 - the MONTH of the arrest date",
          "the month you were arrested, copied from the same paperwork",
          "the platform holds no month fact, and this blank class was proved on the sibling ACIC form to take a participant name through the printed-label fallback", 1),
        h.rbf("YEAR 1", "Paragraph 1 - the YEAR of the arrest date",
          "the year you were arrested, copied from the same paperwork",
          "the platform holds no year fact", 1),
        h.rbf("in violation of ACA", "Paragraph 1 - \"in violation of A.C.A. Sec. ______\"",
          "the Arkansas Code section of the offence, copied from your arrest or court paperwork or from your ACIC record",
          "this blank binds matter.charge through its printed caption, but it holds a code section rather than an offence name", 1),
        h.rbf("Petitioner", "Verification - \"Comes the Petitioner, ______, under oath and states\"",
          "your own name, written on the page you swear before the notary",
          "this one field also controls the notarised signature rule at the foot of the jurat, and a packet may never put a name on a signature line, so the field is refused whole", 3),
        h.rbf("COUNTY OF", "Verification - \"STATE OF ARKANSAS / COUNTY OF ______\"",
          "the county in which you swear the verification before the notary - the notary can tell you, and it need not be the county of the court",
          "the county of a notarial oath is where the participant happens to be sworn, which the platform does not know", 3),
        h.rbf("Race", "Identification block - Race",
          "your race, as the form asks; the form states this block is required for proper identification of the Defendant in the state and national record systems",
          "the platform does not hold or write a race fact", 3),
        h.rbf("Sex", "Identification block - Sex",
          "your sex, as the form asks, in the same identification block",
          "this blank binds participant.date_of_birth through the printed-label fallback, because the block prints Sex and DOB one line apart; a date of birth in the sex box is a wrong answer rather than a missing one", 3),
        h.rbf("Arrest Tracking Number", "Identification block - Arrest Tracking Number",
          "the ATN, copied from your arrest paperwork or your ACIC criminal-history record",
          "the ATN is assigned by Arkansas ACIC when an arrest is processed and identifies the arrest through a system the platform has no knowledge of", 3),
        h.rbf("SID", "Identification block - SID No.",
          "your State Identification number, from your arrest paperwork or your ACIC criminal-history record",
          "the platform holds no SID, and the shared semantics refuse a government identifier on any form", 3),
        h.optional("DIVISION", "Caption - the DIVISION blank",
          "completed only if the court you file in has divisions; the clerk's office of that court answers whether it does", 1),
        h.optional("2", "Paragraph 1 - the second printed rule of the offence list",
          "used only if the same arrest carried a further offence; the first rule is filled from what you gave", 1),
        h.optional("CHARGES 1", "Paragraph 4 - status of pending felony charge(s), first printed rule",
          "used only if you tick paragraph 4's second box: the court, case number and current status of each pending felony charge", 2),
        h.optional("CHARGES 2", "Paragraph 4 - status of pending felony charge(s), second printed rule",
          "used only if the first rule will not hold the answer", 2),
        h.optional("ADDRESS 2", "Defendant's Address - second street line",
          "used only if your address needs a second line; the platform holds one street address and writes it on the first rule", 2),
        h.optional("FBI No if known", "Identification block - FBI No. (if known)",
          "the form itself marks this blank \"(if known)\"; leave it empty if you do not know it", 3),
        h.election("Check Box1", "Paragraph 2 - Order of Nolle Prosequi entered more than one year ago and not refiled",
          "which of paragraph 2's four situations ended the case is a fact about the participant's own record; the committed packet-set manifest asks the participant that question in terms rather than resolving it", 1),
        h.election("Check Box2", "Paragraph 2 - Order of Dismissal has been entered",
          "the same election, second of four", 1),
        h.election("Check Box3", "Paragraph 2 - Judgment of Acquittal, not for reason of mental disease or defect",
          "the same election, third of four", 1),
        h.election("Check Box4", "Paragraph 2 - the prosecuting or city attorney did not file charges",
          "the same election, fourth of four", 1),
        h.election("Check Box5", "Paragraph 4 - no pending felony charges in any state or federal court",
          "a sworn statement about the participant's own record which the route does not determine", 2),
        h.election("Check Box6", "Paragraph 4 - one or more pending felony charges",
          "the other half of the same sworn election", 2),
        h.election("Check Box7", "Paragraph 5 - IS required to register under the Sex Offender Registration Act of 1997",
          "a sworn statement about the participant's own status which the route does not determine", 2),
        h.election("Check Box8", "Paragraph 5 - IS NOT required to register",
          "the other half of the same sworn election", 2),
        h.protectedBlank("Defendants Signature", "Defendant's Signature on page 2",
          "paragraph 6 makes the petition a statement that the information is true and correct; the participant signs it", 2),
        h.protectedBlank("Date", "Date beside the Defendant's Signature on page 2",
          "a date written before the petition is signed would be false", 2),
        h.protectedBlank("DEFENDANT", "Certificate of Service - the certifying party's name in \"I, ______, do hereby certify\"",
          "a sworn statement about an act of service, made after mailing and not before", 4),
        h.protectedBlank("Defendant or Defendants Attorney", "Certificate of Service - signature line",
          "signed by the participant, or their attorney, after service has actually happened", 4),
        h.protectedBlank("Date_2", "Certificate of Service - date line",
          "the date of service, written after service has happened", 4),
        h.agencyBlank("Notary Public", "Verification - the Notary Public signature line",
          "a notary signs their own jurat", 3),
        h.agencyBlank("DAY 2", "Verification - the DAY of \"Subscribed and sworn to before me on this ___\"",
          "the notary completes the jurat when the oath is administered", 3),
        h.agencyBlank("MONTH 2", "Verification - the MONTH of the jurat",
          "the notary completes the jurat when the oath is administered", 3),
        h.agencyBlank("YEAR 2", "Verification - the YEAR of the jurat",
          "the notary completes the jurat when the oath is administered", 3),
        h.agencyBlank("EXPIRE DATE", "Verification - \"My Commission expires\"",
          "the notary's own commission expiry, which only the notary knows", 3)
      );
    } else {
      writes.push(
        h.write("First Middle and Last name", "Defendant named in the caption of the order (First, Middle and Last name)", "participant.full_legal_name", 1),
        h.write("Case No", "Case No. in the caption of the order", "matter.case_number", 1),
        h.write("DEFENDANT NAME", "Defendant named in the order's decree sentence, matching the petition", "participant.full_legal_name", 2),
        h.write("DOB", "DOB in the order's identification block", "participant.date_of_birth", 3)
      );
      refusals.push(
        h.rbf("COURT TYPE", "Order caption - the type of court, which must match the petition's",
          "the same court you wrote in the petition's caption",
          "the order travels with the petition and carries the same caption the participant establishes", 1),
        h.rbf("COUNTY/CITY", "Order caption - the county, which must match the petition's",
          "the same county you wrote in the petition's caption - the county of the court you file in, established under \"Where this goes\"",
          "this blank binds participant.city through its own field name, which is the wrong fact", 1),
        h.optional("DIVISION", "Order caption - the DIVISION blank",
          "completed only if that court has divisions, to match the petition", 1),
        h.agencyBlank("Judge", "The order's signature line, for the Judge",
          "the court signs its own order, if and only if it grants the petition", 2),
        h.agencyBlank("Date", "The date beside the Judge's signature",
          "the court dates its own order", 2),
        h.rbf("DAY 1", "Order paragraph 1 - the DAY of the arrest date in the court's findings",
          "nothing unless the clerk asks you to complete the order's recitals to match your petition; then the day of the arrest, as on the petition",
          "the platform holds no day fact, and the recitals below the caption are the court's", 1),
        h.rbf("MONTH 1", "Order paragraph 1 - the MONTH of the arrest date in the court's findings",
          "nothing unless the clerk asks you to complete the recitals; then the month, as on the petition",
          "the platform holds no month fact, and the recitals below the caption are the court's", 1),
        h.rbf("YEAR 1", "Order paragraph 1 - the YEAR of the arrest date in the court's findings",
          "nothing unless the clerk asks you to complete the recitals; then the year, as on the petition",
          "the platform holds no year fact, and the recitals below the caption are the court's", 1),
        h.rbf("1", "Order paragraph 1 - the offence(s) in the court's findings, first printed rule",
          "nothing unless the clerk asks you to complete the recitals; then the offence, as on the petition",
          "the order is the court's instrument and accepts caption facts only; its findings are not caption facts", 1),
        h.rbf("CLASS", "Order paragraph 1 - the \"A Class ______\" blank in the court's findings",
          "nothing unless the clerk asks you to complete the recitals; then the class letter of the offence",
          "the platform holds no offence-class fact, and the findings are the court's", 1),
        h.rbf("ACA NO", "Order paragraph 1 - \"in violation of A.C.A. Sec.\" in the court's findings",
          "nothing unless the clerk asks you to complete the recitals; then the Arkansas Code section, as on the petition",
          "this blank binds matter.charge through its printed caption but holds a code section, and the findings are the court's", 1),
        h.rbf("Race", "Order identification block - Race",
          "the same race entry you wrote on the petition",
          "the platform does not hold or write a race fact", 3),
        h.rbf("Sex", "Order identification block - Sex",
          "the same sex entry you wrote on the petition",
          "the platform does not hold a sex fact", 3),
        h.rbf("Arrest Tracking Number", "Order identification block - Arrest Tracking Number",
          "the same ATN you wrote on the petition",
          "the ATN is assigned by Arkansas ACIC and is the agency's identifier", 3),
        h.rbf("SID", "Order identification block - SID No.",
          "the same SID you wrote on the petition",
          "the platform holds no SID, and the shared semantics refuse a government identifier", 3),
        h.optional("2", "Order paragraph 1 - the second printed rule of the offence list in the court's findings",
          "nothing unless the clerk asks you to complete the recitals and the same arrest carried a further offence", 1),
        h.optional("CHARGES 1", "Order paragraph 4 - status of pending felony charge(s), first printed rule",
          "nothing unless the clerk asks you to complete the recitals and paragraph 4's second box is yours", 2),
        h.optional("CHARGES 2", "Order paragraph 4 - status of pending felony charge(s), second printed rule",
          "nothing unless the first rule will not hold the answer", 2),
        h.optional("FBI No if known", "Order identification block - FBI No. (if known)",
          "the form itself marks this blank \"(if known)\"", 3),
        h.election("Check BoxF", "Order paragraph 1 - felony box in the court's findings",
          "the court makes its own findings; where a clerk asks for the recitals to be completed to match the petition, which box is true is read off the participant's own paperwork and the route does not determine it", 1),
        h.election("Check BoxM", "Order paragraph 1 - misdemeanor box in the court's findings",
          "the other half of the same election", 1),
        h.election("Check Box1", "Order paragraph 2 - Order of Nolle Prosequi entered more than one year ago and not refiled",
          "the same election as the petition's paragraph 2, in the court's findings", 1),
        h.election("Check Box2", "Order paragraph 2 - Order of Dismissal has been entered",
          "the same election, second of four", 1),
        h.election("Check Box3", "Order paragraph 2 - Judgment of Acquittal, not for reason of mental disease or defect",
          "the same election, third of four", 1),
        h.election("Check Box4", "Order paragraph 2 - the prosecuting or city attorney did not file charges",
          "the same election, fourth of four", 1),
        h.election("Check Box5", "Order paragraph 4 - no pending felony charges",
          "the same sworn election as the petition's paragraph 4", 2),
        h.election("Check Box6", "Order paragraph 4 - one or more pending felony charges",
          "the other half of the same election", 2),
        h.election("Check Box7", "Order paragraph 5 - IS required to register as a sex offender",
          "the same sworn election as the petition's paragraph 5", 2),
        h.election("Check Box8", "Order paragraph 5 - IS NOT required to register",
          "the other half of the same election", 2)
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
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
