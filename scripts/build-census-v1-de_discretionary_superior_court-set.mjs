#!/usr/bin/env node
/**
 * PF02 official-form packet family — Delaware, discretionary expungement of an
 * adult record in Superior Court, 11 Del. C. § 4374.
 *
 *   node scripts/build-census-v1-de_discretionary_superior_court-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-pathway:DE:de_discretionary_superior_court:discretionary-court-expungement-under-11-del-c-4374
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family. Its current packet-set decision declares
 * three components:
 *
 *   de_discretionary_superior_court-primary-filing-1  required     CIV_EXP_02_A
 *   de_discretionary_superior_court-continuation-2    conditional  CIV_EXP_02_B
 *   de_discretionary_superior_court-proposed-order-3  required     CIV_EXP_04_A
 *
 * TWO ARE RENDERED. THE CONTINUATION SHEET IS BOUND, PROVED AND NOT RENDERED,
 * AND THE REASON IS ON THE PAPER.
 *
 * CIV_EXP_02_B's condition, in the manifest's own words, is "When charges
 * exceed the table on the petition." The petition's table holds four printed
 * rows. The PROPOSED ORDER's table also holds four printed rows, and Delaware
 * publishes no continuation sheet for an order -- CIV_EXP_02_B is captioned
 * "PETITION FOR EXPUNGEMENT OF CRIMINAL RECORD" and is a continuation of the
 * petition alone. So a packet built for more than four charges would carry a
 * complete charge list on the petition and a proposed order that could not
 * hold it, and the overflow would be silent: the order's four rows would fill
 * and the rest would have nowhere to go on the instrument the judge signs.
 *
 * This build does not manufacture that packet. Both fixtures are within the
 * four printed rows, the continuation sheet's condition is therefore unmet, and
 * it is not delivered blank -- a continuation sheet attached to a petition that
 * has no continuation says the petitioner has more charges than the petition
 * lists. It is still bound by exact SHA-256 and carried through the same proved
 * equivalent unlock as every rendered document, so the receipt can say the
 * source is held here and readable here, and the four-row ceiling on the order
 * is raised to counsel as a question about the form set rather than answered
 * here.
 *
 * BOTH RENDERED BINARIES ARE ENCRYPTED
 *
 * CIV_EXP_02_A, CIV_EXP_02_B and CIV_EXP_04_A are AES-256 encrypted (V=5, R=6,
 * StdCF) with an empty user password, and pdf-lib cannot open any of them. The
 * bound identity stays the pinned official binary; the readable copy is a
 * build-time pikepdf derivative proved equivalent to it before it is read, and
 * the family stops rather than rendering if that proof fails. See
 * scripts/census-v1-de-expungement/de-expungement-core.mjs.
 *
 * THE PETITION IS SHARED WITH THE PARDON FAMILY AND IS READ ONCE
 *
 * CIV_EXP_02_A is the required primary filing of BOTH this family and
 * de_pardon_expungement-set, and the acquisition receipt for DE-CIV-EXP-02-A
 * records it: "Shared parent petition; acquire once and bind to two families."
 * Its census, its caption corrections, its table geometry and its field map are
 * in scripts/census-v1-de-expungement/de-superior-court-forms.mjs and are used
 * by both builders, so a 44-blank sworn petition is classified once rather than
 * twice.
 */
import { makeFamily } from "./census-v1-de-expungement/de-expungement-core.mjs";
import {
  DE_CAPTION_CORRECTIONS, CIV_EXP_02_A, CIV_EXP_02_B, CIV_EXP_04_A,
  petitionMap, orderMap
} from "./census-v1-de-expungement/de-superior-court-forms.mjs";

const FAMILY_ID = "de_discretionary_superior_court-set";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

const MANIFEST_INJUSTICE = (n) =>
  `line ${n} of your own explanation, in your own words, of how the continued existence and possible `
  + "dissemination of this record harms you. The form says this section must be completed for the Court to "
  + "consider the petition, and you may attach additional pages";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-de_discretionary_superior_court-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill",
  jurisdiction: "DE",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition for Expungement of Adult Record, Superior Court, 11 Del. C. § 4374",
  routeName: "discretionary expungement of a Delaware adult record in Superior Court on a showing of manifest injustice",
  appearanceDispositions: {
    /* These are the only source widgets in this family that ship with no
     * /AP /N. They are unwritten participant inputs; dropping their empty
     * widgets before appearance generation preserves the printed form without
     * manufacturing empty finalizer appearances. */
    primary_filing: {
      Language: "render_participant_value_only_when_written"
    },
    proposed_order: {
      "Attorney Name (if any)": "render_participant_value_only_when_written",
      Language: "render_participant_value_only_when_written"
    }
  },
  statutes: ["11 Del. C. § 4374", "85 Del. Laws, c. 142, § 10", "11 Del. C. § 4372(e)(1)", "11 Del. C. § 4372(l)", "11 Del. C. § 4373(b)", "11 Del. C. § 4376(a)", "11 Del. C. § 9414(a)"],
  routes: [{ routeKey: "obligation:track-pathway:DE:de_discretionary_superior_court:discretionary-court-expungement-under-11-del-c-4374" }],

  records: [
    {
      recordId: "packet-set-manifest:de_discretionary_superior_court-set",
      path: PACKET_SET_MANIFESTS,
      role:
        "the committed packet-set manifest for this exact packet set. Its components list settles the two "
        + "rendered official forms and the conditional continuation source; its "
        + "participantActionRequired entries settle the certified-history prerequisite, the notarization "
        + "position, the fee position, the fee-waiver position, the service position and the assembly order; "
        + "and its requiredBeforeFiling list is read from these bytes at build time and printed verbatim "
        + "into participant-instructions.md",
      mustContain: [
        "de_discretionary_superior_court-set",
        "Obtain Certified criminal history, dated within 45 days. Request the certified criminal history through IdentoGo, service code 27S23V, at about $72. Save the PDF at first opening; it can only be opened once. The court shall summarily reject any petition without it.",
        "Obtain and attach the SBI Cover Letter issued by the State Bureau of Identification after its review of the certified criminal history. The Superior Court filing instructions require this letter with the petition, proposed order, and qualifying certified criminal history.",
        "Manifest-injustice assertion checkbox and explanation — Petition CIV_EXP_02_A, manifest-injustice section. Review the required assertion and mark the checkbox only if the statement is true; complete your own explanation on the ruled lines or attached pages.",
        "$75 filing fee, per CIV_EXP_07_A. Set by the courts under § 4374(j).",
        "Assemble the packet in the prescribed order: petition, proposed order, SBI cover letter, then the certified criminal history dated within 45 days. One original plus one copy.",
        "The petitioner serves the Attorney General, who may object or answer within 120 days."
      ]
    },
    {
      recordId: "track-registry:de_discretionary_superior_court",
      path: TRACK_REGISTRY,
      role:
        "the committed legal-design track registry entry for this track. It settles the venue rule this "
        + "packet states, the manifest-injustice standard, the instruction that LegalEase must not represent "
        + "that it confirmed charge-level eligibility, the counsel classification of the history-dependent "
        + "fields as items the participant completes, the notice and service positions, the Title 21 "
        + "exclusion, and the open question about which proposed order the petitioner is expected to lodge",
      mustContain: [
        "Superior Court for the county where the most recent case was terminated. Venue keys to the most recent termination, not the county of each conviction.",
        "LegalEase must not represent that it confirmed charge-level eligibility.",
        "The certified criminal history must be dated within 45 days. The court shall summarily reject any petition without it.",
        "Generate the court packet without collecting or reviewing the certified SBI history. The current certified history is required before filing.",
        "History-dependent fields may be left as manual completion items.",
        "The substance of the petition and must not be templated.",
        "The expungement clerk emails a copy of the filing to the Attorney General once a case number is assigned.",
        "Filing in person means bringing the petition unsigned and signing in front of the notary at the Prothonotary's office.",
        "Which proposed order the petitioner is expected to lodge.",
        "No Title 21 motor vehicle offense may be expunged under this subchapter except driving after judgment prohibited",
        "The participant supplies any manifest-injustice facts through approved prompts, and LegalEase does not decide whether the showing is sufficient."
      ]
    },
    {
      recordId: "legal-decision:DE-DISCRETIONARY-SUPERIOR-CURRENT-PACKET",
      path: "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
      role:
        "the controlling legal-clear packet decision for this exact family. It overrides stale component "
        + "metadata for the packet contents and requires the participant-owned manifest-injustice branch "
        + "to remain a participant assertion",
      mustContain: [
        "DE-DISCRETIONARY-SUPERIOR-CURRENT-PACKET",
        "Current Superior Court instructions control. Use Petition + Proposed Order + SBI Cover Letter + qualifying certified criminal history in the prescribed filing order. Do not add a generic cover sheet merely because stale metadata says so. Manifest-injustice facts remain participant-owned."
      ]
    }
  ],

  officialComponents: { primary_filing: CIV_EXP_02_A, proposed_order: CIV_EXP_04_A },
  officialTables: { primary_filing: CIV_EXP_02_A.table, proposed_order: CIV_EXP_04_A.table },
  officialCells: {},
  captionCorrections: DE_CAPTION_CORRECTIONS,
  declaredNotExercised: {
    continuation: {
      ...CIV_EXP_02_B,
      componentId: "de_discretionary_superior_court-continuation-2",
      declaredRequirement: "conditional",
      conditionDescription: "When charges exceed the table on the petition.",
      whyUnmet:
        "Both fixtures are within the four printed rows of the petition's own table, so the manifest's "
        + "condition is not met and a continuation sheet is not part of either packet. It is not delivered "
        + "blank: a continuation sheet attached to a petition that has no continuation asserts that the "
        + "petitioner has more charges than the petition lists. The reason this family does not simply build "
        + "a five-charge fixture is on the paper -- the PROPOSED ORDER CIV_EXP_04_A also prints exactly four "
        + "rows and Delaware publishes no continuation sheet for an order, so a packet above four charges "
        + "would carry a complete list on the petition and an order that could not hold it. That is raised "
        + "as a counsel question about the form set rather than answered here."
    }
  },

  /*
   * The current packet decision expressly disallows a generic cover sheet.
   * The SBI cover letter and qualifying certified history are external
   * participant-supplied documents, so only the two official Delaware forms
   * are generated here.
   */
  components: ["primary_filing", "proposed_order"],
  componentTitles: {
    primary_filing: "CIV_EXP_02_A - Petition for Expungement of Adult Record (updated 6/12/2024)",
    proposed_order: "CIV_EXP_04_A - Expungement Order Granting (updated 05/29/2024)"
  },
  componentConditions: {},
  componentDescriptions: {
    primary_filing:
      "the Superior Court's own petition form, delivered exactly as the Court publishes it. Your name, "
      + "address, date of birth, telephone number and criminal case number are filled in; the charge table, "
      + "the manifest-injustice explanation, the county box, the interpreter election and your sworn "
      + "signature are yours",
    proposed_order:
      "the Superior Court's own proposed order granting expungement, with the same caption details filled "
      + "in. The charge table, paragraph 5 and the judge's date and signature are not yours to complete"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Danielle Rose Hargrove",
      "participant.date_of_birth": "1992-07-22",
      "participant.street_address": "88 Loockerman Street",
      "participant.city_state_zip": "Dover, DE 19901",
      "participant.phone": "(302) 555-0163",
      "matter.case_number": "K21-03-0455"
    },
    boundary: {
      "participant.full_legal_name": "Bartholomew Nkemdirim Vandergrift-Ashworth Jr.",
      "participant.date_of_birth": "1949-01-30",
      "participant.street_address": "2604 Old Capitol Trail, Building 7, Unit 219",
      "participant.city_state_zip": "Wilmington, DE 19808-4417",
      "participant.phone": "(302) 555-0138 ext. 22",
      "matter.case_number": "N19-11-0032-01"
    }
  },

  mapFor(componentId, h) {
    if (componentId === "primary_filing") {
      return petitionMap(componentId, h, { manifestInjusticeLine: MANIFEST_INJUSTICE });
    }
    if (componentId === "proposed_order") {
      return orderMap(componentId, h, { orderDocument: CIV_EXP_04_A });
    }
    throw new Error(`unexpected DE component ${componentId}`);
  },

  formIdentityNote:
    "CIV_EXP_02_A is the Superior Court of the State of Delaware's own Petition for Expungement of Adult "
    + "Record, updated 6/12/2024, one page, forty-four AcroForm blanks; CIV_EXP_04_A its own Expungement "
    + "Order Granting, updated 05/29/2024, one page, thirty-six AcroForm blanks; and CIV_EXP_02_B its own "
    + "Expungement Petition Form Additional Charges Extension Sheet, updated 06/12/2024, one page, one "
    + "hundred and thirty-six AcroForm blanks. All three are bound by exact SHA-256 through the committed "
    + "corpus index. All three pinned binaries are AES-256 encrypted with an empty user password, and each "
    + "is carried through a deterministic pikepdf decryption proved equivalent to the official binary page "
    + "for page, field for field and content stream for content stream; the family stops rather than "
    + "rendering if that proof fails. The bound identity is the official encrypted binary and its SHA-256 "
    + "is recomputed from the file on disk before and after the read. CIV_EXP_02_A is held under the "
    + "filename download.aspx.pdf, which is what the Delaware Courts download endpoint produced; it is "
    + "resolved by digest and never by that name. CIV_EXP_02_B is bound and proved but is in neither packet, "
    + "because its condition is unmet in both fixtures.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the committed records rather than by the instrument, because CIV_EXP_02_A is the "
    + "petition for BOTH Superior Court expungement routes -- this § 4374 discretionary route and the § 4375 "
    + "after-pardon route -- and prints § 4374 in its own recital. What separates them is the proposed "
    + "order: this family's committed manifest names CIV_EXP_04_A, Expungement Order Granting, whose "
    + "WHEREAS clause recites § 4374, and the pardon family's names CIV_EXP_08_A, whose WHEREAS clause "
    + "recites § 4375 (expungement after pardon). This build makes no election of its own on the petition. "
    + "The three county boxes at the head of both forms are a venue election the route does not determine "
    + "and are left to the participant.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "CIV_EXP_02_A as the petition and CIV_EXP_04_A as the proposed order",
      determinedBy:
        "the committed packet-set manifest for de_discretionary_superior_court-set, whose official_pdf_fill "
        + "components name officialFormId CIV_EXP_02_A (primary_filing), CIV_EXP_02_B (continuation, "
        + "conditional) and CIV_EXP_04_A (proposed_order)"
    },
    {
      selection: "the continuation sheet",
      value: "not delivered; its condition is unmet in both fixtures",
      determinedBy:
        "the committed packet-set manifest, which declares CIV_EXP_02_B conditional on \"When charges exceed "
        + "the table on the petition\", together with a measurement of the paper: the petition prints four "
        + "charge rows, both fixtures are within them, and the proposed order prints four rows with no "
        + "continuation sheet published for it"
    },
    {
      selection: "the charge table",
      value: "left entirely to the participant on both forms",
      determinedBy:
        "the committed track registry's counsel classification -- \"History-dependent fields may be left as "
        + "manual completion items. Counsel classified this as an item the participant completes\" -- its "
        + "instruction that \"LegalEase must not represent that it confirmed charge-level eligibility\", and "
        + "the shared field semantics, under which a disposition is a court fact this factory does not write "
        + "on any form"
    },
    {
      selection: "venue",
      value: "no county box marked",
      determinedBy:
        "the committed track registry's venue rule: \"Superior Court for the county where the most recent "
        + "case was terminated. Venue keys to the most recent termination, not the county of each "
        + "conviction.\" That is a fact about the participant's own history that no held record establishes"
    }
  ],

  instructionsHeading: "Filing instructions - discretionary expungement in Delaware Superior Court (11 Del. C. § 4374)",

  instructionsIntro: [
    "This packet is the Superior Court of the State of Delaware's own **CIV_EXP_02_A, Petition for Expungement of Adult Record** (updated 6/12/2024) and **CIV_EXP_04_A, Expungement Order Granting** (updated 05/29/2024), delivered exactly as the Court publishes them, filled in with what the platform holds about you and left blank everywhere else. The qualifying SBI cover letter and certified criminal history are external documents you must obtain and attach; this packet does not create either one.",
    "**This route is discretionary.** You have to show the court, by a preponderance, that the continued existence and possible dissemination of the record causes or may cause circumstances that constitute a manifest injustice to you. The State is a party defendant.",
    "**The charge table on both forms is left blank on purpose.** The committed record directs that this packet be generated without collecting or reviewing your certified criminal history, and that LegalEase must not represent that it confirmed charge-level eligibility. You fill the table in from your own certified history, which the court requires to be dated within 45 days and without which it shall summarily reject the petition."
  ],

  whoDecides: [
    "A judge of the Superior Court decides this, on the papers by default; there is no hearing unless the court believes one is necessary. The Attorney General is served and may object or answer within 120 days.",
    "This platform does not decide whether you are eligible and does not decide whether your manifest-injustice showing is sufficient. The committed record says so in terms: the participant supplies any manifest-injustice facts, and LegalEase does not decide whether the showing is sufficient."
  ],

  filingDestination: [
    "The Superior Court for the county where your **most recent** case was terminated. The committed record is explicit that venue keys to the most recent termination and not to the county of each conviction.",
    "File in person at the Prothonotary with the petition unsigned and identification, signing before the notary, or by mail with the petition already notarized. The committed record records both.",
    "The petition carries three county boxes at its head - New Castle, Kent and Sussex. This packet leaves all three unmarked, because which one is yours is a fact about your own case history and not a choice this route makes."
  ],

  feeAndWaiver: [
    "The committed packet-set manifest records the fee as **$75, per CIV_EXP_07_A**, set by the courts under § 4374(j).",
    "It also records a waiver: under § 4372(l), if an outstanding fine or fee is unpaid for reasons other than wilful noncompliance and you are otherwise eligible, the court may grant the expungement and waive the fines or fees or convert them to a civil judgment. That entry is conditional and applies only where you cannot pay the filing fee."
  ],

  service: [
    "You serve the Attorney General, who may object or answer within 120 days. If the Attorney General opposes, you have 30 days to file a response.",
    "The committed record also records that the expungement clerk emails a copy of the filing to the Attorney General once a case number is assigned, and that the Attorney General contacts the victim under § 9414(a) and reports the victim's position in the answer.",
    "The petition pre-prints the Attorney General's three county addresses on its own face; the committed record calls that block the service list, and this packet does not alter it."
  ],

  documentsToObtain: [
    ["Certified criminal history, dated within 45 days", "IdentoGo, service code 27S23V, at about $72. Save the PDF at first opening; it can only be opened once."],
    ["Qualifying SBI cover letter", "Obtain the qualifying letter from the State Bureau of Identification. The original letter is required in the prescribed filing order. This packet does not create or replace it."]
  ],

  steps: [
    "Read the petition and the proposed order through before you write anything on them.",
    "Fill in the charge table on the petition from your certified criminal history, one charge per printed row, and copy the same charges onto the proposed order's table. Note that the two tables do not run the same columns: the petition's fourth column is Disposition Date and its fifth is Disposition, and the order's fourth column is Disposition and Disposition Date and its fifth is Court.",
    "If you have more than four charges, stop and ask for help before filing: the petition has a published continuation sheet (CIV_EXP_02_B) and the proposed order does not.",
    "Read the manifest-injustice checkbox above the ruled lines. Decide for yourself whether the continued existence and possible dissemination of these criminal records causes, or may cause, circumstances constituting a manifest injustice to you; mark that checkbox only if your sworn assertion is true, then write your explanation in your own words on the four ruled lines. Attach additional pages if you need them; the form says so.",
    "Mark the county box for the county where your most recent case was terminated, and the interpreter election if you need one.",
    "Do not sign the petition yet if you are filing in person. Take it unsigned, with identification, and sign it in front of the notary. If you are filing by mail, notarize it first.",
    "Assemble it in the order the controlling Superior Court instruction prescribes: petition, proposed order, required SBI cover letter, then your qualifying certified criminal history dated within 45 days. Include the original SBI letter and one original plus one copy of the assembled packet.",
    "File it, pay the $75 fee or ask about the § 4372(l) waiver, and serve the Attorney General."
  ],

  deliberatelyBlank: [
    "The whole charge table on both forms. This platform does not collect or review your certified criminal history and does not represent that it has confirmed charge-level eligibility.",
    "The manifest-injustice explanation. The committed record records it as the substance of the petition, which must not be templated.",
    "The manifest-injustice checkbox above that explanation. The form marks this section as information that MUST be completed for the Court to consider the petition; the participant must make this sworn assertion and the packet never marks it.",
    "The county boxes on both forms, which are a venue election keyed to your most recent case termination.",
    "The interpreter election and the language line on both forms.",
    "The attorney block on both forms. This packet is prepared for a self-represented petitioner and the platform holds no representation fact.",
    "The P.O. Box line on both forms; the platform holds one mailing address for you and it is already on the street line.",
    "Your signature and the jurat, which the clerk of court or notary completes.",
    "The Civil Petition No. and Civil Action No., which the Court assigns. The order form prints \"(Leave Blank - Court will assign)\" beside its own.",
    "Paragraph 5 of the proposed order and the judicial officer's date and signature."
  ],

  notTold: [
    "Whether your record qualifies. No Title 21 motor vehicle offense may be expunged under this subchapter except driving after judgment prohibited (21 Del. C. § 2810), reckless driving (§ 4175) and operation of a motor vehicle causing death (§ 4176A); a DUI under 21 Del. C. § 4177 is not expungeable on this route.",
    "Whether a case that mixes Title 21 charges with expungeable charges can be partially expunged. The committed record carries that as an open question after Cornette and Gieck.",
    "What the Attorney General will do. The Attorney General contacts the victim and reports the victim's position in its answer."
  ],

  stopConditions: [
    "The Attorney General files an objection or an answer opposing the petition.",
    "A victim opposes.",
    "The court sets a hearing.",
    "The manifest-injustice showing depends on contested facts.",
    "You have pending criminal charges outside the three carve-outs, or you are currently serving incarceration, parole, or probation.",
    "A prior expungement was granted within ten years, or a felony conviction post-dates a prior felony expungement.",
    "The offense may be a § 4373(b) crime of domestic violence or involve a child or vulnerable adult victim.",
    "The record involves a § 4201(c) felony or a Beau Biden Act offense, where the only route is a pardon.",
    "The case mixes Title 21 charges with expungeable charges.",
    "Venue is unclear because charges were disposed of in more than one court.",
    "You have more than four charges to list. The petition has a published continuation sheet and the proposed order does not.",
    "Fines, fees, or restitution are unpaid and you need the § 4372(l) waiver or conversion.",
    "Immigration, firearm, professional licensing, registry, or law enforcement employment consequences are in play.",
    "You want to attack the underlying conviction rather than expunge it."
  ],

  whatThisIsNot:
    "This packet is not legal advice, not a representation that you are eligible, and not a filing. Nothing "
    + "in it has been reviewed by counsel or approved for participant delivery, and a rendered packet "
    + "authorizes no fulfillment and opens no commercial route.",

  receiptDoesNotEstablish: [
    "that CIV_EXP_04_A is the proposed order the Prothonotary expects on this route; the committed track "
    + "registry carries that as an open release blocker on packet_components",
    "that the packet is complete for a matter with more than four charges; the proposed order's table holds "
    + "four printed rows and Delaware publishes no continuation sheet for an order"
  ],

  buildFindings: [
    {
      finding: "The two charge tables in this family's own form set run different columns for the same charge list.",
      detail:
        "CIV_EXP_02_A prints Case ID # or Criminal Case #, Charge, Offense Date, Disposition Date, "
        + "Disposition. CIV_EXP_04_A prints Case ID# or Criminal Case #, Charge, Offense Date, Disposition "
        + "and Disposition Date, Court. CIV_EXP_02_B -- the continuation sheet for the petition's own "
        + "charges -- prints Case ID Number or Criminal Case Number, Charge, Disposition, Disposition Date, "
        + "Court of Record, which is a THIRD order in which the disposition and its date swap places. A "
        + "builder that read one table's order and applied it to the others would put a disposition in the "
        + "disposition-date box. Each table's columns here are read from its own printed page by "
        + "x-position over that column's own cells, and the reading is published in "
        + "production-field-map.json under chargeTableGeometry.",
      owner: "recorded for reviewers and for any later family that binds these forms"
    },
    {
      finding: "The proposed order's charge table holds four rows and Delaware publishes no continuation sheet for an order.",
      detail:
        "CIV_EXP_02_A prints four charge rows and CIV_EXP_02_B extends it to twenty-six more. CIV_EXP_04_A "
        + "prints four rows and there is no equivalent extension sheet: CIV_EXP_02_B is captioned \"PETITION "
        + "FOR EXPUNGEMENT OF CRIMINAL RECORD\" and continues the petition alone. A matter above four "
        + "charges therefore has a complete list on the petition and an order that cannot hold it. This "
        + "build does not manufacture that packet; both fixtures are within four charges, the continuation "
        + "sheet's condition is unmet, and the ceiling is raised to counsel.",
      owner: "counsel, and the lane that owns the Delaware form set"
    },
    {
      finding: "The current packet decision separates the two generated court forms from external participant attachments.",
      detail:
        "The current legal-clear decision for this exact family says to use Petition + Proposed Order + SBI "
        + "Cover Letter + qualifying certified criminal history and says not to add a generic cover sheet. "
        + "This builder therefore renders only CIV_EXP_02_A and CIV_EXP_04_A. The SBI letter and certified "
        + "history remain required external participant documents, and CIV_EXP_02_B remains bound but "
        + "conditional and unexercised in both fixtures.",
      owner: "the packet-set record and the lane that owns its manifest"
    },
    {
      finding: "SOURCE_READY_BUILDABILITY.json reports this family's sources as not present in any mounted custody. In this container they are all present and all hash exactly.",
      detail:
        "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json records "
        + "de_discretionary_superior_court-set as verdict NOT_MEASURABLE_HERE, custodyClass "
        + "SOURCE_GENUINELY_MISSING, documentSourcesResolved 0, and marks official-form:CIV_EXP_02_B and "
        + "official-form:CIV_EXP_04_A \"not_present_in_a_custody_mounted_here\". Measured here, under "
        + "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/: "
        + "download.aspx.pdf hashes to f2820f713b9f8e0f..., "
        + "source-acquisition-2026-09-04/civ_exp_02_b-expungement-petition-form-additional-charges-extension-sheet.pdf "
        + "to 39b2dd77619f8872..., and "
        + "source-acquisition-2026-09-04/civ_exp_04_a-sc-new-order-granting-expungement-form.pdf to "
        + "59c3665bbcbf0d22... -- each its declared digest, each carried by the committed corpus index under "
        + "custody nationwide_recovery_pool_2026_09_02 at that exact path. The same record also contradicts "
        + "itself for CIV_EXP_02_A, which it lists as kind \"held_pdf\" resolved by content hash while "
        + "reporting documentSourcesResolved 0.",
      owner: "the lane that owns SOURCE_READY_BUILDABILITY.json"
    },
    {
      finding: "The repository's own extractTextItems does not read these Delaware binaries in printed order.",
      detail:
        "Measured on the unlocked derivative of CIV_EXP_02_A: the form prints \"Pursuant to 11 Del. C. "
        + "§ 4374,\" and scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs returns \"Pursuant to 11 "
        + "Del. C. § 7443,\". The form draws \"43\" at x=144.36 and \"74\" at x=144.31, two runs whose "
        + "declared advance widths are 0.07pt and which therefore overlap, so an x-ordered read of them is "
        + "undetermined; whole lines come back scrambled the same way. poppler's pdftotext reads the same "
        + "bytes correctly. This build does not depend on the scrambled reading, but any family that "
        + "harvests a caption or an anchor sentence from these forms through the shared capture is reading "
        + "noise.",
      owner: "the lane that owns scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    },
    {
      finding: "The shared caption capture binds facts across the Attorney General address column on CIV_EXP_02_A.",
      detail:
        "The petition prints a two-column caption block whose right-hand column is the Attorney General's "
        + "three county addresses, and captureWidgetContext reaches across it: it captions the Date of Birth "
        + "blank \"%\\u00a1 Sussex County\", the P.O. Box line \"Wilmington, DE 19801\", the street address "
        + "line \"%\\u00a1 New Castle County Crim. Case No\", the Telephone blank \"Attorney Name (if any)\" "
        + "and the Civil Petition No. blank \"Georgetown, DE 19947\". On CIV_EXP_04_A the P.O. Box line's "
        + "captured caption contains \"Kent County\", which matches the matter.county descriptor. A caption "
        + "is matched against the protect rules and the descriptor registry before a field name is, so those "
        + "are bindings and not mislabels. Every caption on every censused form in this family is corrected "
        + "against the printed page, and a correction whose recorded capture no longer matches stops this "
        + "build.",
      owner: "the lane that owns scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    },
    {
      finding: "Neither Delaware form prints a date order beside its date blanks, so held dates are written in stored ISO form.",
      detail:
        "CIV_EXP_02_A and CIV_EXP_04_A both print \"Date of Birth\" with no (mm/dd/yyyy) or any other order "
        + "beneath or beside the blank, and the shared finalizer never guesses an order from a field name, a "
        + "locale or a jurisdiction. The delivered bytes therefore read \"1992-07-22\" on the canonical "
        + "fixture and \"1949-01-30\" on the boundary. That is unambiguous and is not contradicted by "
        + "anything the form prints, and inventing mm/dd/yyyy would be the inference the module exists to "
        + "refuse; it is raised for visual review rather than decided here.",
      owner: "visual review, and counsel if the Prothonotary has a stated convention"
    }
  ],

  counselQuestions: [
    "Which proposed order the petitioner is expected to lodge. This is the committed track registry's own release blocker on packet_components: all five Superior Court orders are published as court forms and the instructions say only \"Proposed Order\". This build lodged CIV_EXP_04_A because the committed packet-set manifest names it as this family's proposed_order, and the registry directs that the Prothonotary confirm it.",
    "What to do for a matter with more than four charges. The petition extends to CIV_EXP_02_B; the proposed order does not extend at all. This build's participant guide tells the participant to stop and ask for help above four charges, which is a self-help boundary this build invented for a gap in the form set rather than one the committed record states.",
    "The participant must supply the actual SBI cover letter required by the current packet decision. This builder generates no SBI letter and no cover-sheet substitute; confirm the participant's original letter is included before filing.",
    "Whether a date of birth written in ISO form (1992-07-22) is acceptable to the Prothonotary on these two forms. Neither form prints a date order beside the blank, so this build wrote the held value unchanged rather than inferring mm/dd/yyyy.",
    "What 85 Del. Laws, c. 142, § 10 changed in § 4374. The committed track registry carries this as a release blocker on the governing mechanism and records that the amendment was not read in the review this packet's copy descends from."
  ],

  reviewersAttention: [
    "Read the delivered PDFs, not this report. Both fixtures contain only the petition and proposed order, in that order; the participant's required SBI cover letter and certified criminal history are external attachments that must be assembled before filing.",
    "The charge tables on both official forms are delivered entirely blank, by design and on the committed record's counsel classification. A reviewer expecting a filled table should read the buildFindings and the routeSelectionsMade before treating it as a gap.",
    "CIV_EXP_02_B is bound, hashed and proved equivalent to its pinned binary, and is in neither packet. The receipt records it under conditionalDocumentsBoundButNotExercised with the reason.",
    "The proposed order CIV_EXP_04_A carries the petitioner's caption details and nothing else; paragraph 5, the date and the judicial officer's signature line are untouched.",
    "Dates are delivered in ISO form because neither form prints a date order beside its date blank. Read the delivered page and say whether that is acceptable in Delaware Superior Court.",
    "This family and de_pardon_expungement-set share CIV_EXP_02_A. Their packets are not clones: they differ in the proposed order they carry and in every participant fact."
  ],

  componentCarriageNotes: [
    "The controlling legal-clear decision says not to add a generic cover sheet. This build renders only the "
    + "two official court forms; the participant must obtain and attach the required SBI cover letter and "
    + "qualifying certified criminal history in the prescribed order. The builder does not invent either "
    + "external document or make an eligibility assertion.",
    "The `continuation` component the same record declares, CIV_EXP_02_B, is conditional on \"When charges "
    + "exceed the table on the petition\". Neither fixture exceeds it, so the continuation sheet is not part "
    + "of either packet. It is bound and proved all the same, and the reason it is not delivered blank is in "
    + "source-receipt.json under conditionalDocumentsBoundButNotExercised."
  ]
};

const { runFamily } = makeFamily(SPEC);
export { runFamily, SPEC };

if (process.argv[1] && process.argv[1].endsWith("build-census-v1-de_discretionary_superior_court-set.mjs")) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
