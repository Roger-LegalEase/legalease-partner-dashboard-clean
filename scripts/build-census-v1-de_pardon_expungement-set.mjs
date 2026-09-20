#!/usr/bin/env node
/**
 * PF02 official-form packet family — Delaware, petition for expungement of an
 * adult record AFTER AN UNCONDITIONAL PARDON, 11 Del. C. § 4375.
 *
 *   node scripts/build-census-v1-de_pardon_expungement-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-pathway:DE:de_pardon_expungement:pardon-based-discretionary-expungement-under-11-del-c-4375
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family with two official documents and one composed
 * one, exactly as its committed packet-set manifest declares:
 *
 *   de_pardon_expungement-primary-filing-1   official_pdf_fill  CIV_EXP_02_A
 *   de_pardon_expungement-proposed-order-2   official_pdf_fill  CIV_EXP_08_A
 *   de_pardon_expungement-cover-sheet-3      custom_pleading    (no official form)
 *
 * MASTER_QUEUE.json lists only TWO packetComponents for this family and omits
 * the cover sheet, while the same row's own `instrumentKinds` lists three --
 * cover_sheet, primary_filing, proposed_order -- and both controlling records,
 * the committed packet-set manifest and the committed track registry, declare
 * all three. The controlling records govern and the queue is a summary, so
 * three components are built and the queue is left alone.
 *
 * BOTH BINARIES ARE ENCRYPTED, AND THAT IS TRANSPORT, NOT SUBSTITUTION
 *
 * CIV_EXP_02_A and CIV_EXP_08_A are AES-256 encrypted (V=5, R=6, StdCF) with an
 * empty user password. pdf-lib has no security handler; `ignoreEncryption: true`
 * suppresses the throw and then parses ciphertext, which surfaces as "Expected
 * instance of PDFDict, but got instance of undefined". The bound identity stays
 * the pinned official binary, byte for byte, its SHA-256 is recomputed from the
 * file on disk before and after the read, and the readable copy is a build-time
 * pikepdf derivative proved equivalent to the official binary page for page,
 * field for field and content stream for content stream by the repository's own
 * fidelity reader. If any of that differs the family STOPS with stopClass
 * UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY and nothing is
 * rendered. See scripts/census-v1-de-expungement/de-expungement-core.mjs.
 *
 * The review derivative sitting at
 * data/rcap-all50/overlays/rescued-encrypted-pdfs/delaware-download-aspx-rescued.pdf
 * is NOT used. Its digest appears in no committed source record and in no
 * corpus-index entry; binding it would satisfy one identity with the bytes of
 * another.
 *
 * THE FORM IS CAPTIONED TO § 4374 AND THIS ROUTE IS § 4375
 *
 * That is the committed record's own finding, carried as build_blocker DE-5 on
 * the eligibility branch, and it is visible on the paper: CIV_EXP_02_A prints
 * "Pursuant to 11 Del. C. § 4374". The committed track registry's answer is a
 * manual completion item -- "Statement of the § 4375 basis in the body of the
 * petition ... The form is captioned to § 4374 only, so the § 4375 basis has to
 * be stated in the body" -- so this build writes no § 4375 recital onto a form
 * that prints § 4374, and carries the statement into the participant guide as a
 * required-before-filing item and into the approval request as a counsel
 * question. Under the build-first review model a build_blocker on an
 * eligibility branch is a review gate on `approved_for_live`, not a stop on
 * `state_built`.
 */
import { makeFamily } from "./census-v1-de-expungement/de-expungement-core.mjs";
import {
  DE_CAPTION_CORRECTIONS, CIV_EXP_02_A, CIV_EXP_08_A,
  petitionMap, orderMap, coverSheetBody, coverSheetMap
} from "./census-v1-de-expungement/de-superior-court-forms.mjs";

const FAMILY_ID = "de_pardon_expungement-set";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

const MANIFEST_INJUSTICE = (n) =>
  `line ${n} of your own explanation, in your own words, of how the continued existence and possible `
  + "dissemination of this record harms you. On this route the same four lines are also where the committed "
  + "record requires you to state the 11 Del. C. § 4375 basis, because the form is captioned to § 4374 only";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-de_pardon_expungement-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill",
  jurisdiction: "DE",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Petition for Expungement After a Pardon, 11 Del. C. § 4375",
  routeName: "expungement of a Delaware adult record after an unconditional pardon by the Governor",
  statutes: ["11 Del. C. § 4375", "11 Del. C. § 4374(c) through (h) and (j)", "11 Del. C. § 4372(e)(1)", "11 Del. C. § 4372(l)", "11 Del. C. § 4376(a)"],
  routes: [{ routeKey: "obligation:track-pathway:DE:de_pardon_expungement:pardon-based-discretionary-expungement-under-11-del-c-4375" }],

  records: [
    {
      recordId: "packet-set-manifest:de_pardon_expungement-set",
      path: PACKET_SET_MANIFESTS,
      role:
        "the committed packet-set manifest for this exact packet set. Its components list settles that this "
        + "family has three components and which two are official forms; its participantActionRequired "
        + "entries settle the pardon prerequisite, the certified-history prerequisite, the notarization "
        + "position, the fee position, the fee-waiver position and the service position; and its "
        + "requiredBeforeFiling list is read from these bytes at build time and printed verbatim into "
        + "participant-instructions.md",
      mustContain: [
        "de_pardon_expungement-set",
        "Obtain Unconditional pardon from the Governor. The pardon itself is a separate process before the Board of Pardons and the Governor, and is outside this track's scope.",
        "Statement of the § 4375 basis in the body of the petition",
        "$75, per the § 4374(j) fee schedule.",
        "The petitioner serves the Attorney General, who may object or answer within 120 days."
      ]
    },
    {
      recordId: "track-registry:de_pardon_expungement",
      path: TRACK_REGISTRY,
      role:
        "the committed legal-design track registry entry for this track. It settles the mechanism this route "
        + "runs on, the venue and destination this packet states, the manifest-injustice standard, the "
        + "instruction that the packet is generated without collecting or reviewing the certified SBI "
        + "history, the classification of the manifest-injustice explanation as untemplatable participant "
        + "content, and the DE-5 build blocker about the form's statutory caption",
      mustContain: [
        "A person convicted of any crime other than the six excluded, who has since been unconditionally pardoned by the Governor, may petition.",
        "The form is captioned to § 4374 only, so the § 4375 basis has to be stated in the body.",
        "Superior or Family Court for the county where the most recent case was terminated, following the § 4374(c) venue rule.",
        "Generate the court packet without collecting or reviewing the certified SBI history. The current certified history is required before filing.",
        "The substance of the petition and must not be templated.",
        "The participant supplies any manifest-injustice facts through approved prompts, and LegalEase does not decide whether the showing is sufficient."
      ]
    }
  ],

  officialComponents: { primary_filing: CIV_EXP_02_A, proposed_order: CIV_EXP_08_A },
  officialTables: { primary_filing: CIV_EXP_02_A.table, proposed_order: CIV_EXP_08_A.table },
  officialCells: {},
  captionCorrections: DE_CAPTION_CORRECTIONS,
  declaredNotExercised: {},

  components: ["primary_filing", "proposed_order", "cover_sheet"],
  componentTitles: {
    primary_filing: "CIV_EXP_02_A - Petition for Expungement of Adult Record (updated 6/12/2024)",
    proposed_order: "CIV_EXP_08_A - Expungement New Order Granting after Pardon (updated 05/30/2024)",
    cover_sheet: "Filing cover sheet"
  },
  componentConditions: {},
  componentDescriptions: {
    primary_filing:
      "the Superior Court's own petition form, delivered exactly as the Court publishes it. Your name, "
      + "address, date of birth, telephone number and criminal case number are filled in; the charge table, "
      + "the manifest-injustice explanation, the county box, the interpreter election and your sworn "
      + "signature are yours",
    proposed_order:
      "the Superior Court's own proposed order for an expungement after a pardon, with the same caption "
      + "details filled in. The charge table, paragraph 5 and the judge's date and signature are not yours "
      + "to complete",
    cover_sheet:
      "a cover sheet identifying you and listing what is in the filing. It asserts nothing about your "
      + "eligibility and carries no signature"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Marcus Elijah Whitfield",
      "participant.date_of_birth": "1978-03-14",
      "participant.street_address": "412 South Harmony Street",
      "participant.city_state_zip": "Wilmington, DE 19801",
      "participant.phone": "(302) 555-0147",
      "matter.case_number": "1804009823"
    },
    boundary: {
      "participant.full_legal_name": "Anastasia Wolodymyrivna Okonkwo-Ferreira",
      "participant.date_of_birth": "1955-12-02",
      "participant.street_address": "1187 Bayside Terrace Road, Apartment 14C",
      "participant.city_state_zip": "Rehoboth Beach, DE 19971-2284",
      "participant.phone": "(302) 555-0192 ext. 4471",
      "matter.case_number": "S23-06-0148-01"
    }
  },

  mapFor(componentId, h) {
    if (componentId === "primary_filing") {
      return petitionMap(componentId, h, { manifestInjusticeLine: MANIFEST_INJUSTICE });
    }
    if (componentId === "proposed_order") {
      return orderMap(componentId, h, { orderDocument: CIV_EXP_08_A });
    }
    return coverSheetMap(componentId, h);
  },

  composedBody(componentId, facts) {
    return coverSheetBody(facts, {
      legalName: SPEC.legalName,
      procedureAuthority: ["Procedure under 11 Del. C. § 4374(c) through (h) and (j)"],
      documentsInOrder: [
        "CIV_EXP_02_A - Petition for Expungement of Adult Record (updated 6/12/2024).",
        "CIV_EXP_08_A - Expungement New Order Granting after Pardon (updated 05/30/2024), proposed order."
      ]
    });
  },

  composedFromNote:
    "authored by this build from the participant facts the platform holds and from the committed packet-set "
    + "manifest's own component list; it recites no statute beyond the two this track's committed authority "
    + "list names, and states no fee, deadline, clerk's practice or service rule",

  formIdentityNote:
    "CIV_EXP_02_A is the Superior Court of the State of Delaware's own Petition for Expungement of Adult "
    + "Record, updated 6/12/2024, one page, forty-four AcroForm blanks, and CIV_EXP_08_A its own Expungement "
    + "New Order Granting after Pardon, updated 05/30/2024, one page, thirty-six AcroForm blanks. Both are "
    + "bound by exact SHA-256 through the committed corpus index and delivered as the Court publishes them. "
    + "Both pinned binaries are AES-256 encrypted with an empty user password; this build carries each "
    + "through a deterministic pikepdf decryption proved equivalent to the official binary page for page, "
    + "field for field and content stream for content stream, and stops rather than rendering if that proof "
    + "fails. The bound identity is the official encrypted binary and its SHA-256 is recomputed from the "
    + "file on disk before and after the read. CIV_EXP_02_A is held under the filename download.aspx.pdf, "
    + "which is what the Delaware Courts download endpoint produced; it is resolved by digest and never by "
    + "that name.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the committed records rather than by the instrument, because the instrument does "
    + "not distinguish the two Superior Court routes: CIV_EXP_02_A is the petition for BOTH the § 4374 "
    + "discretionary route and this § 4375 after-pardon route, and it prints § 4374 in its recital. What "
    + "separates them is the proposed order, and Delaware publishes a separate one: CIV_EXP_08_A, "
    + "Expungement New Order Granting after Pardon, which recites § 4375 (expungement after pardon) in its "
    + "own WHEREAS clause. The committed packet-set manifest names CIV_EXP_08_A as this family's "
    + "proposed_order and CIV_EXP_04_A as the other family's, so the order is what carries the route and "
    + "this build makes no election of its own on the petition. The three county boxes at the head of both "
    + "forms are a venue election the route does not determine and are left to the participant.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "CIV_EXP_02_A as the petition and CIV_EXP_08_A as the proposed order",
      determinedBy:
        "the committed packet-set manifest for de_pardon_expungement-set, whose two official_pdf_fill "
        + "components name officialFormId CIV_EXP_02_A (primary_filing) and CIV_EXP_08_A (proposed_order)"
    },
    {
      selection: "the statutory recital on the petition",
      value: "none written; the form's own printed § 4374 recital is left as the Court prints it",
      determinedBy:
        "the committed track registry's manual completion item, which records that the form is captioned to "
        + "§ 4374 only and that the § 4375 basis has to be stated in the body by the petitioner"
    },
    {
      selection: "the charge table",
      value: "left entirely to the participant on both forms",
      determinedBy:
        "the committed track registry's instruction to generate the court packet without collecting or "
        + "reviewing the certified SBI history, together with the shared field semantics, under which a "
        + "disposition is a court fact this factory does not write on any form"
    },
    {
      selection: "venue",
      value: "no county box marked",
      determinedBy:
        "the committed track registry's venue rule, which keys venue to the county where the most recent "
        + "case was terminated -- a fact about the participant's own history that no held record establishes"
    }
  ],

  instructionsHeading: "Filing instructions - expungement after a pardon in Delaware Superior Court (11 Del. C. § 4375)",

  instructionsIntro: [
    "This packet is the Superior Court of the State of Delaware's own **CIV_EXP_02_A, Petition for Expungement of Adult Record** (updated 6/12/2024) and **CIV_EXP_08_A, Expungement New Order Granting after Pardon** (updated 05/30/2024), delivered exactly as the Court publishes them, filled in with what the platform holds about you and left blank everywhere else, with a cover sheet identifying the filing.",
    "**This route exists only because you have already been unconditionally pardoned by the Governor.** The pardon itself is a separate process before the Board of Pardons and the Governor, and the committed record records that it is outside this track's scope. If you have not been pardoned, this is not your packet.",
    "**The petition form prints \"Pursuant to 11 Del. C. § 4374\" and you are filing under § 4375.** That is the form, not a mistake in this packet, and the committed record's answer is that you state the § 4375 basis in the body of the petition yourself. The four ruled lines under the manifest-injustice heading are where you write it. This is an open question counsel has been asked to settle, and it is recorded in this packet's approval request."
  ],

  whoDecides: [
    "A judge of the Superior Court decides this, on the papers by default. The Attorney General is served and may object or answer within 120 days.",
    "This platform does not decide whether you are eligible and does not decide whether your manifest-injustice showing is sufficient. The committed record says so in terms: the participant supplies any manifest-injustice facts, and LegalEase does not decide whether the showing is sufficient."
  ],

  filingDestination: [
    "The committed record's venue rule for this route is the Superior or Family Court for the county where your **most recent** case was terminated, following the § 4374(c) venue rule. It is the most recent termination that decides, not the county of each conviction.",
    "The petition carries three county boxes at its head - New Castle, Kent and Sussex. This packet leaves all three unmarked, because which one is yours is a fact about your own case history and not a choice this route makes. Mark the one your venue rule gives you."
  ],

  feeAndWaiver: [
    "The committed packet-set manifest records the fee as **$75, per the § 4374(j) fee schedule**.",
    "It also records a waiver: under § 4372(l), the court may waive fines or fees or convert them to a civil judgment where non-payment is not wilful. That entry is conditional and applies only where you cannot pay the filing fee."
  ],

  service: [
    "You serve the Attorney General, who may object or answer within 120 days. If the Attorney General opposes, you have 30 days to file a response.",
    "The petition pre-prints the Attorney General's three county addresses on its own face; that block is the Court's printing and this packet does not alter it."
  ],

  documentsToObtain: [
    ["Unconditional pardon from the Governor", "The Board of Pardons and the Governor. The pardon is a separate process and is outside this track's scope."],
    ["Certified criminal history, dated within 45 days", "IdentoGo, service code 27S23V, at about $72."]
  ],

  steps: [
    "Read the petition and the proposed order through before you write anything on them.",
    "Fill in the charge table on the petition from your certified criminal history, one charge per printed row, and copy the same charges onto the proposed order's table.",
    "Write your explanation of how the continued existence and possible dissemination of this record harms you on the four ruled lines, and state your 11 Del. C. § 4375 basis there as well. Attach additional pages if you need them; the form says so.",
    "Mark the county box for the county where your most recent case was terminated, and the interpreter election if you need one.",
    "Do not sign the petition yet if you are filing in person. Take it unsigned, with identification, and sign it in front of the notary.",
    "Attach your certified criminal history, dated within 45 days.",
    "File it, pay the $75 fee or ask about the § 4372(l) waiver, and serve the Attorney General."
  ],

  deliberatelyBlank: [
    "The whole charge table on both forms. This platform does not collect or review your certified criminal history and does not represent that it has confirmed charge-level eligibility.",
    "The manifest-injustice explanation. The committed record records it as the substance of the petition, which must not be templated.",
    "The county boxes on both forms, which are a venue election keyed to your most recent case termination.",
    "The interpreter election and the language line on both forms.",
    "The attorney block on both forms. This packet is prepared for a self-represented petitioner and the platform holds no representation fact.",
    "The P.O. Box line on both forms; the platform holds one mailing address for you and it is already on the street line.",
    "Your signature and the jurat, which the clerk of court or notary completes.",
    "The Civil Petition No. and Civil Action No., which the Court assigns.",
    "Paragraph 5 of the proposed order and the judicial officer's date and signature."
  ],

  notTold: [
    "Whether your record qualifies. The committed record carries an open question about how far § 4375 escapes § 4374's exclusions in practice, and counsel has been asked to settle it.",
    "What the Attorney General will do. The Attorney General contacts the victim and reports the victim's position in its answer."
  ],

  stopConditions: [
    "The Attorney General files an objection or an answer opposing the petition.",
    "A victim opposes.",
    "The court sets a hearing.",
    "Your pardon is conditional, or you are not sure whether it was unconditional.",
    "Your manifest-injustice showing depends on facts somebody disputes.",
    "You want to attack the underlying conviction rather than expunge it.",
    "Immigration, firearm, professional licensing, registry, or law enforcement employment consequences are in play."
  ],

  whatThisIsNot:
    "This packet is not legal advice, not a representation that you are eligible, and not a filing. Nothing "
    + "in it has been reviewed by counsel or approved for participant delivery, and a rendered packet "
    + "authorizes no fulfillment and opens no commercial route.",

  receiptDoesNotEstablish: [
    "that CIV_EXP_08_A is the proposed order the Prothonotary expects on this route; the committed track "
    + "registry carries that as an open release blocker for the sibling § 4374 family and it is asked again here",
    "that a § 4375 basis stated in the body of a form captioned to § 4374 is sufficient; that is the DE-5 "
    + "build blocker and it is counsel's to settle"
  ],

  buildFindings: [
    {
      finding: "MASTER_QUEUE.packetComponents understates this family by one component.",
      detail:
        "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json lists two packetComponents for "
        + "de_pardon_expungement-set -- primary-filing-1 and proposed-order-2 -- while the same row's own "
        + "instrumentKinds lists three (cover_sheet, primary_filing, proposed_order) and both controlling "
        + "records, the committed packet-set manifest and the committed track registry, declare "
        + "de_pardon_expungement-cover-sheet-3 with role cover_sheet and outputStrategy custom_pleading. The "
        + "records govern; three components are built and the queue was not edited.",
      owner: "the lane that owns MASTER_QUEUE.json"
    },
    {
      finding: "SOURCE_READY_BUILDABILITY.json reports this family's sources as not present in any mounted custody. In this container they are all present and all hash exactly.",
      detail:
        "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json records "
        + "de_pardon_expungement-set as verdict NOT_MEASURABLE_HERE, custodyClass SOURCE_GENUINELY_MISSING, "
        + "documentSourcesResolved 0, and marks official-form:CIV_EXP_08_A "
        + "\"not_present_in_a_custody_mounted_here\". Measured here: "
        + "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/"
        + "source-acquisition-2026-09-04/civ_exp_08_a-sc-new-order-granting-expungement-after-pardon-form.pdf "
        + "hashes to 0f7666ac6877b4d482a71c5303ecb199792f713e3c728adb2308b86945505d5b, its declared digest, "
        + "and the committed corpus index carries it under custody nationwide_recovery_pool_2026_09_02 at "
        + "that exact path. The same record also contradicts itself for CIV_EXP_02_A, which it lists as "
        + "kind \"held_pdf\" resolved by content hash while reporting documentSourcesResolved 0.",
      owner: "the lane that owns SOURCE_READY_BUILDABILITY.json"
    },
    {
      finding: "The committed packet-set manifest's notarize entry for this family is the bare word \"Required.\"",
      detail:
        "participant-instructions.md prints the manifest's requiredBeforeFiling list word for word, and one "
        + "of this family's eleven items is the single word \"Required.\" -- the description of the "
        + "`notarize` participantActionRequired entry. The sibling family de_discretionary_superior_court-set "
        + "carries a full sentence in the same slot (\"Required. Filing in person means bringing the "
        + "petition unsigned and signing in front of the notary at the Prothonotary's office. Filing by mail "
        + "means notarizing first.\"). The record is printed as it stands rather than repaired here, and the "
        + "guide's own step 5 carries the substance, but a participant reading the verbatim list reads one "
        + "line that says nothing.",
      owner: "the lane that owns data/record-clearing/legal-design-packet-set-manifests.json"
    },
    {
      finding: "Neither Delaware form prints a date order beside its date blanks, so held dates are written in stored ISO form.",
      detail:
        "CIV_EXP_02_A prints \"Date of Birth\" and CIV_EXP_08_A prints \"Date of Birth\" with no (mm/dd/yyyy) "
        + "or any other order beneath or beside the blank, and the shared finalizer never guesses an order "
        + "from a field name, a locale or a jurisdiction -- printedDateOrderByField is a caller declaration "
        + "and this caller has no printed line to declare from. The delivered bytes therefore read "
        + "\"1978-03-14\" on the canonical fixture and \"1955-12-02\" on the boundary. That is unambiguous "
        + "and is not contradicted by anything the form prints, and inventing mm/dd/yyyy would be the "
        + "inference the module exists to refuse; it is raised for visual review rather than decided here.",
      owner: "visual review, and counsel if the Prothonotary has a stated convention"
    },
    {
      finding: "The repository's own extractTextItems does not read these Delaware binaries in printed order.",
      detail:
        "Measured on the unlocked derivative of CIV_EXP_02_A: the form prints \"Pursuant to 11 Del. C. "
        + "§ 4374,\" and scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs returns \"Pursuant to 11 "
        + "Del. C. § 7443,\". The form draws \"43\" at x=144.36 and \"74\" at x=144.31, two runs whose "
        + "declared advance widths are 0.07pt and which therefore overlap, so an x-ordered read of them is "
        + "undetermined; whole lines come back scrambled the same way (\"uperSior Court\", \"crminali "
        + "record\"). poppler's pdftotext reads the same bytes correctly. This build does not depend on the "
        + "scrambled reading -- the ink audit subtracts source items from output items by position and "
        + "content, which a scrambling both sides share does not affect, and the table-geometry gate reads "
        + "the page with pdftotext -- but any family that harvests a caption or an anchor sentence from "
        + "these forms through the shared capture is reading noise.",
      owner: "the lane that owns scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    },
    {
      finding: "The shared caption capture binds facts across the Attorney General address column on CIV_EXP_02_A.",
      detail:
        "The petition prints a two-column caption block whose right-hand column is the Attorney General's "
        + "three county addresses. captureWidgetContext reaches across it: it captions the Date of Birth "
        + "blank \"%\\u00a1 Sussex County\", the P.O. Box line \"Wilmington, DE 19801\", the street address "
        + "line \"%\\u00a1 New Castle County Crim. Case No\", the Telephone blank \"Attorney Name (if any)\" "
        + "and the Civil Petition No. blank \"Georgetown, DE 19947\". A caption is matched against the "
        + "protect rules and the descriptor registry before a field name is, so those are bindings and not "
        + "mislabels: on the proposed orders the P.O. Box line's captured caption contains \"Kent County\", "
        + "which matches the matter.county descriptor. Every caption on every censused form in this family "
        + "is corrected against the printed page, and a correction whose recorded capture no longer matches "
        + "stops this build.",
      owner: "the lane that owns scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    }
  ],

  counselQuestions: [
    "DE-5, carried in the committed track registry as a build_blocker on the eligibility branch: how far § 4375 escapes § 4374's exclusions in practice, given that CIV_EXP_02_A is captioned to § 4374 and a separate after-pardon order form exists. The registry directs that Cornette and Gieck be read in full and that Lawrence's position be obtained. This build wrote no § 4375 recital onto the § 4374-captioned form and left the statement to the participant, which is what the registry's manual completion item directs; whether that is sufficient is counsel's.",
    "Whether CIV_EXP_08_A is the proposed order the Prothonotary expects on the after-pardon route. The committed track registry carries the equivalent question for the § 4374 route as a release blocker on packet_components, noting that all five Superior Court orders are published as court forms and the instructions say only \"Proposed Order\".",
    "What the committed record means by the \"SBI cover letter\" named third in the § 4374 filing order. No committed record states its addressee or its content, so this build composed a filing cover sheet that identifies the petitioner and lists the filing's contents and asserts nothing else. If an SBI cover letter is a distinct instrument with required content, it is not built here.",
    "Whether a date of birth written in ISO form (1978-03-14) is acceptable to the Prothonotary on these two forms. Neither form prints a date order beside the blank, so this build wrote the held value unchanged rather than inferring mm/dd/yyyy; if Delaware practice requires mm/dd/yyyy, the printed line that would justify it does not exist on the paper and the instruction has to come from counsel.",
    "Whether leaving the entire charge table to the participant is right for this route. It follows the committed track registry's counsel classification for the sibling § 4374 family (\"History-dependent fields may be left as manual completion items\") and the shared field semantics, under which a disposition is a court fact. The pardon track's own registry entry carries no equivalent classification, so the sibling's is being relied on."
  ],

  reviewersAttention: [
    "Read the delivered PDFs, not this report. Both fixtures are one page per official form plus a composed cover sheet.",
    "The charge tables on both official forms are delivered entirely blank, by design and on the committed record's instruction. A reviewer expecting a filled table should read the buildFindings and the routeSelectionsMade before treating it as a gap.",
    "The petition prints \"Pursuant to 11 Del. C. § 4374\" on a packet built for the § 4375 route. That is the Court's own form and is left as printed.",
    "The proposed order CIV_EXP_08_A carries the petitioner's caption details and nothing else; paragraph 5, the date and the judicial officer's signature line are untouched.",
    "Dates are delivered in ISO form because neither form prints a date order beside its date blank. Read the delivered page and say whether that is acceptable in Delaware Superior Court.",
    "One line of the verbatim requiredBeforeFiling list reads only \"Required.\" That is the committed manifest's own text for this family's notarize entry, printed as it stands rather than repaired here; see build-findings.json."
  ],

  componentCarriageNotes: [
    "The cover sheet is the `custom_pleading` component the committed packet-set manifest declares as "
    + "`de_pardon_expungement-cover-sheet-3`. It is composed by this build from held participant facts and "
    + "the manifest's own component list. It carries no signature block, states no fee, deadline, clerk's "
    + "practice or service rule, and asserts nothing about eligibility."
  ]
};

const { runFamily } = makeFamily(SPEC);
export { runFamily, SPEC };

if (process.argv[1] && process.argv[1].endsWith("build-census-v1-de_pardon_expungement-set.mjs")) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
