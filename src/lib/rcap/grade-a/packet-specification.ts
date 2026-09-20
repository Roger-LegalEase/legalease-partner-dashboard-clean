import specification from "@/../data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json";
import oregonSetAside from "@/../data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";
import kansasMunicipalConvictionOrDiversion from "@/../data/record-clearing/packet-specifications/KS-municipal-conviction-or-diversion-expungement-under-12-4516.v1.json";
import kansasMunicipalArrestRecord from "@/../data/record-clearing/packet-specifications/KS-municipal-arrest-record-expungement-under-12-4516a.v1.json";
import mississippiNonConviction from "@/../data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
import virginiaAbsolutePardon from "@/../data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json";
import nevadaProbationSpecialtyCourt from "@/../data/record-clearing/packet-specifications/NV-probation-specialty-court-dismissal-set-aside-sealing.v1.json";
import illinoisFelonyProstitutionRelief from "@/../data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json";
import dcActualInnocenceExpungement from "@/../data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json";
import mississippiAdditionalMisdemeanorRelief from "@/../data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json";
import wyomingFelonyConvictionExpungement from "@/../data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json";
import connecticutCleanSlatePetition from "@/../data/record-clearing/packet-specifications/CT-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202.v1.json";
import dcCorrectMisattributedArrest from "@/../data/record-clearing/packet-specifications/DC-correct-misattributed-arrest.v1.json";
import mississippiFirstOffenderMisdemeanor from "@/../data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json";
import illinoisMistakenIdentityRelief from "@/../data/record-clearing/packet-specifications/IL-criminal-identity-theft-mistaken-identity-relief.v1.json";
import georgiaSb288MisdemeanorRestriction from "@/../data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json";
import georgiaPardonedFelonyRestriction from "@/../data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json";
import southDakotaSisSealing from "@/../data/record-clearing/packet-specifications/SD-suspended-imposition-of-sentence-sealing.v1.json";

/**
 * A packet specification is the exact statement of what one packet family
 * contains, versioned and hashed.
 *
 * The point of hashing it is not integrity in the security sense. It is that a
 * fulfillment record grants commercial authority to a route, and the thing the
 * record is vouching for has to be pinned to something. Without a hash, "this
 * route delivers a complete packet" is a claim about whatever the composer
 * happens to produce today. With one, the claim is about an exact document set,
 * and changing that set is visible as a changed hash rather than as nothing.
 *
 * Everything a document says about the law comes from here. The composer's job
 * is to place facts into the structure this file describes; it has no legal
 * statements of its own and must never acquire any, because a statement that
 * lives in the composer is a statement no legal review can see.
 */

export type PacketSpecificationFact = {
  factId: string;
  use: string;
  inRegistryRequiredInputs: boolean;
  gapNote?: string;
  ownership?: "participant" | "server";
  prompt?: string;
  helperText?: string;
  questionType?: string;
  options?: string[];
};

export type PacketSpecificationSection = {
  heading: string;
  kind: string;
  body?: string;
  jurat?: string;
  fields?: string[];
  fieldLabels?: Record<string, string>;
  /**
   * How each field is presented, declared per field.
   *
   * Ownership and presentation are separate contracts. Ownership answers who
   * supplies a value; it does not answer what the page draws. A participant
   * filing blank is a ruled line, a participant signature is a signature
   * structure, a judge's signature is a judicial one, a notary field is a
   * jurat, and a court-owned value is the court's own space — and none of those
   * follows from the single fact that the platform does not hold the value.
   *
   * So a field that the platform does not supply must say here how it is drawn.
   * Where it says nothing and nobody else supplies it, the composer refuses
   * rather than guessing a shape.
   *
   *   value              the platform's fact, printed.
   *   ruled_blank        a labelled line the participant completes before filing.
   *   court_owned_space  a labelled space the court itself completes.
   */
  fieldTreatments?: Record<string, "value" | "ruled_blank" | "court_owned_space">;
  /**
   * An explicit caption, for a filing whose caption is not the generic
   * two-party one and whose caption values the participant writes on the page.
   *
   * Without it a `pleading_caption` reads four fixed fact ids — court_name,
   * case_caption_plaintiff_name, case_caption_defendant_name, case_number — and
   * a family that does not use those ids gets a caption of empty strings and a
   * bare "CASE NO." with nothing after it. That is a silent blank, which is
   * exactly what the caption-token work removed everywhere else.
   *
   * `court` and `caseNumber` name the fact each slot reads. Where that fact is
   * declared in `participantCompletesBeforeFilingFields` the slot is drawn as a
   * line with its instruction beneath, never as an empty value and never as a
   * placeholder token.
   */
  /**
   * Whether this section's heading is PRINTED on the page or is the
   * specification's own internal label for the part.
   *
   * Declared, because the document contract decides structure. Illinois's
   * mistaken-identity petition prints A. REQUEST FOR MISTAKEN-IDENTITY
   * CORRECTION through E. CERTIFICATION UNDER 735 ILCS 5/1-109 — its own
   * filing instructions send the participant to "Complete C1, C2 and C6"
   * against those markers — while "Caption" and "The conviction" are labels
   * for whoever reads the file and belong nowhere near a filed page.
   *
   * An earlier attempt decided this by how the heading was spelt, which made
   * renaming an internal label enough to publish it and rewording a printed
   * one enough to delete it. Absent, a pleading section's heading stays
   * internal, which is what every route but Illinois relies on.
   */
  headingPresentation?: "printed" | "internal";
  /**
   * The label above a signature block's date rule, where the adopted page
   * rules one. Absent where the page has only a signature line.
   */
  signatureDateLabel?: string;
  captionContract?: {
    court: string;
    courtInstruction?: string;
    /**
     * The adopted caption's court lines, where it takes more than one.
     *
     * Wyoming's runs "IN THE DISTRICT COURT OF THE ____ JUDICIAL DISTRICT" and
     * "COUNTY OF ____, STATE OF WYOMING": two lines, two blanks, and a shape the
     * single `court` slot cannot hold. Forcing it into one would move the county
     * out of the caption, which is a change to the adopted structure rather than
     * a rendering detail. Each entry draws its prefix, a rule where it names a
     * participant-completable field, then its suffix.
     */
    courtLines?: Array<{ prefix?: string; field?: string; suffix?: string }>;
    /** The adopted label before the number, where it is not "CASE NO.". */
    caseNumberLabel?: string;
    /** Replaces PLAINTIFF / VS. / DEFENDANT for an in-the-matter-of caption. */
    matterTitle?: string;
    /**
     * Where the party line sits relative to the cause number.
     *
     * Wyoming and Nevada print the docket line and then the matter; Mississippi
     * prints the party line and then "Cause No.". Both are ordinary captions,
     * so the adopted page says which it is instead of the renderer assuming.
     * Absent, the order is the one every caption already drawn uses.
     */
    captionOrder?: "case_number_first" | "matter_title_first";
    caseNumber: string;
    caseNumberInstruction?: string;
    documentTitle?: string;
  };
  fieldValueTemplates?: Record<string, string>;
  assertions?: Array<{ id: string; text: string; facts: string[] }>;
  notarisationRequired?: boolean;
};

/**
 * The fact id this route uses for the case or matter identifier.
 *
 * `captionContract.caseNumber` already declares it for every family that draws
 * a contract caption, and that declaration is the authority. This exists for
 * the families still on the older `fields` caption form, which names the fact
 * but not its role, and it is the smallest thing that turns "one of these
 * likely names" into "the one this route declares".
 *
 * The guide's CASE / MATTER panel read `cause_number` and this route calls it
 * `case_number`, so the cover printed "not established" for the number on every
 * pleading behind it. Replacing one guessed name with a priority list of
 * guessed names would still be guessing: a snapshot carrying two of them for
 * unrelated reasons would decide the panel by the order someone happened to
 * write.
 *
 * Populated per route as routes come through the build, never inferred. A route
 * that declares none is answered honestly as not established.
 */
export type SpecificationCaseIdentifier = string;

export type PacketSpecificationDocument = {
  documentId: string;
  role: string;
  title: string;
  order: number;
  outputStrategy: "custom_pleading" | "process_guidance";
  officialFormId?: string | null;
  presentation?: "guidance" | "pleading";
  /**
   * Whether the route's own source makes this component's inclusion a
   * requirement, a decidable condition, or the participant's choice.
   *
   *   required     the source requires it. Always included.
   *   conditional  the source states a condition. Included when `includeWhen`
   *                evaluates true; UNRESOLVED, never "no", when it cannot be
   *                evaluated — the planner reports it and composition refuses.
   *   optional     the source states no condition the platform may evaluate,
   *                because the only condition is the participant's own choice
   *                or the court's expectation. The separator and its
   *                instructions are PROVIDED; nothing is demanded.
   *
   * WHY `optional` EXISTS, AND WHAT IT IS NOT
   *
   * Georgia's four participant-supplied exhibits were `conditional` with no
   * `includeWhen`, which the planner reads as undecidable and correctly omits
   * — from every packet, permanently. Four components existed, composed and
   * rendered, and no participant could receive any of them.
   *
   * Neither available answer was true. Marking them `required` asserts the
   * source requires an exhibit it expressly does not: the Georgia memorandum
   * carries them at `requiredBeforeFiling: false`, and two of them appear in no
   * source at all beyond the adopted separator. Writing a condition would mean
   * asking whether the participant HAS the outside record, and a document
   * Expungement.ai cannot produce is never a condition of anything.
   *
   * So `optional` says the third true thing: the component is provided, its
   * inclusion asserts nothing about whether the participant needs it, and it
   * gates nothing. It adds no fact, no question, and no completeness
   * precondition. It is not a softer `required` and never carries an
   * `includeWhen`.
   */
  requirement: "required" | "conditional" | "optional";
  conditionDescription?: string;
  /**
   * What the route's own source says about this component's inclusion, cited.
   *
   * Recorded wherever the requirement is anything but `required`, because the
   * classification is the decision a reviewer most needs to see: a component
   * that is optional because the memorandum says the participant chooses is a
   * different thing from one that is optional because nobody has decided yet.
   */
  requirementBasis?: string;
  /**
   * The `attachments[]` entry this component is the cover sheet for.
   *
   * Written down rather than inferred from a title, because it is what decides
   * how far the component's own requirement may go: an attachment the source
   * records at `requiredBeforeFiling: false` cannot have a cover the packet
   * calls required. Without the link, "mark every exhibit required" is a
   * one-word edit that no check can see -- the component still selects, still
   * renders, still pairs with its instructions, and now tells a participant
   * that a record the source says is optional is something they must produce.
   */
  attachmentId?: string;
  includeWhen?: string;
  manifestComponentId?: string;
  /**
   * A component the shared §7 participant guide replaces.
   *
   * Marked rather than deleted while both exist: the guide is not shipping yet,
   * and removing the page first would leave the packet short. `supersessionNote`
   * says what happens when it does ship. The point of recording it is that a
   * legacy guidance page should not quietly become permanent furniture beside
   * the guide that was built to replace it.
   */
  supersededBy?: "supplemental_guide";
  supersessionNote?: string;
  /**
   * Where this component's text came from, when it was carried into the
   * specification by a derivation repair rather than authored here.
   *
   * Per COMPONENT, not per family. A family whose shipping bytes drifted after
   * adoption may still be a safe source for one component and an unsafe source
   * for another: a characterisation proves what changed, and a change elsewhere
   * in the packet certifies nothing about this page. So the binding records the
   * adopted digest, what was used, and — where the family drifted — the evidence
   * that this particular component's substance was untouched.
   *
   * `componentEquivalence`:
   *   exact_adopted_bytes    the source reproduces the adopted artifact exactly,
   *                          so no per-component argument is needed.
   *   untouched_by_drift     the family drifted, and the recorded change does not
   *                          reach this component at all.
   *   drift_outside_substance the recorded change reaches this component but not
   *                          the substance carried — a machine footer, a page
   *                          break — and the record says so in terms.
   *   recovered_from_adopted the drift reaches this component's substance, so the
   *                          text was recovered from the adopted version rather
   *                          than copied from current bytes.
   *   adopted_substance_split the adopted component mixed filed content with
   *                          participant instruction on one page; its lines are
   *                          carried verbatim across two documents that together
   *                          hold the component's substance, and
   *                          `artifactBoundarySplit` records the division.
   *   recovered_from_recorded_repair
   *                          independent review read the ADOPTED bytes and
   *                          failed them on named obligations; a recorded repair
   *                          lane corrected those findings; the substance is
   *                          carried from the repaired artifact.
   *
   * WHY THE LAST ONE EXISTS
   *
   * "Transcribe the adopted substance" assumes the adopted substance is the
   * better of the two versions. Illinois is where that stopped being true. VF07
   * read the adopted mistaken-identity bytes and returned FAIL_REPAIR_REQUIRED
   * on five obligations: a petition calling itself VERIFIED with no
   * certification, oath or penalty-of-perjury language anywhere in it;
   * unconditional demands for prostitution statute and class, sentence
   * completion and trafficking facts from a participant correcting a record
   * someone else created in their name; implementation identifiers printed on
   * court deliverables; and an unsupported inability-to-pay prohibition.
   * FIXILCAP repaired exactly those findings.
   *
   * Recovering "the adopted version" would have carried every one of them into
   * production wearing the adoption's authority. So the state is named for what
   * it is: the text comes from the repair, the failing verdict and the repair
   * are both committed records, and this claims NO owner adoption for the
   * repaired bytes. Traceability, not approval — and the repair's own
   * independent re-verification is a separate matter this does not assert.
   *
   * A characterisation is evidence about what changed. It is never an owner
   * re-approval, and nothing here claims one.
   */
  transcriptionProvenance?: {
    adoptedDigest: string;
    sourceUsed: string;
    componentEquivalence:
      | "exact_adopted_bytes"
      | "untouched_by_drift"
      | "drift_outside_substance"
      | "recovered_from_adopted"
      | "adopted_substance_split"
      | "recovered_from_recorded_repair";
    evidence: string;
    /**
     * Where the failing review of the adopted bytes and the repair that
     * answered it are recorded. Required by `recovered_from_recorded_repair`,
     * which is otherwise just a claim that the newer bytes are better.
     */
    repairRecord?: {
      /** The lane row recording the repair and the digest it produced. */
      repairRow: string;
      /** The independent review that failed the adopted bytes. */
      failingReview: string;
      /** The obligations that review returned FAIL on. */
      obligationsFailed: string[];
    };
  };
  /**
   * How one adopted component was divided between what the court receives and
   * what the participant reads.
   *
   * WHY A COMPONENT IS EVER SPLIT
   *
   * Georgia's adopted exhibit cover sheets carry four things on one page: the
   * exhibit designation, the document identification, how to obtain the record,
   * and the platform's own statement that it never collects or authenticates
   * it. The first two are filing content. The last two are participant
   * instruction and product disclaimer — and because the page is an
   * `attachment` whose recipient is the court, a court-only download handed
   * them to the clerk. Classifying a page as a supporting page settles its
   * caption treatment; it does not make a product disclaimer appropriate
   * filing content.
   *
   * WHAT THIS RECORD IS FOR
   *
   * A split is the one operation that can lose adopted substance without
   * looking like a deletion: each half is complete on its own terms, and
   * nothing in either document reports that a line went missing between them.
   * So the division is written down line by line, as the same object on both
   * halves, and the control reads the ADOPTED ARTIFACT — not this record — to
   * prove every adopted line is accounted for on one side or the other.
   *
   * `linesEdited` is for relocational rewording ONLY: an "attach behind this
   * page" has to name the cover page once it no longer sits on it. The adopted
   * original is kept beside the new wording. Nothing here authorises a change
   * of substance; a legal or procedural statement is carried verbatim or not
   * at all.
   */
  artifactBoundarySplit?: {
    /** The adopted component whose single page carried both halves. */
    adoptedComponentId: string;
    /** The half the court receives. */
    filedDocumentId: string;
    /** The half the participant reads, which is never court-facing. */
    participantDocumentId: string;
    why: string;
    /**
     * The adopted component's own lines, in the order the adopted page prints
     * them. This is what the halves are measured against: the control reads the
     * adopted fixture at the digest `transcriptionProvenance` names and requires
     * this sequence to appear in it contiguously, so the list is evidence rather
     * than an assertion about itself.
     */
    adoptedLines: string[];
    /** Adopted lines that stay on the filed page, verbatim. */
    linesFiled: string[];
    /** Adopted lines that move to the participant page, verbatim. */
    linesMovedToParticipant: string[];
    /** Adopted lines whose wording changed only because they moved. */
    linesEdited?: Array<{ adoptedText: string; participantText: string; why: string }>;
  };
  /**
   * Sentences taken off this FILED page because they instruct the preparer
   * rather than state the case, with where the participant reads them instead.
   *
   * Narrower than `artifactBoundarySplit`, and for a different shape of
   * defect: nothing is divided into two documents here, one sentence simply
   * does not belong on a page a judge reads. Illinois's relief request ended
   * "An unknown offender name must not be invented." -- a drafting rule
   * addressed to whoever fills the petition in, printed inside the relief the
   * court is being asked to grant.
   *
   * `destinationText` is what the participant actually reads, which may be a
   * sentence the guidance already carried. Recording the destination rather
   * than duplicating the line is the point: the instruction has to survive,
   * and saying it twice in one packet is its own defect.
   */
  linesMovedToParticipantGuidance?: Array<{
    text: string;
    destinationDocumentId: string;
    destinationText: string;
    why: string;
  }>;
  /** One rendered document may intentionally cover multiple manifest components. */
  manifestComponentIds?: string[];
  sections: PacketSpecificationSection[];
};

/**
 * A legal section a packet may print as fact. It is either bound -- decided by a
 * legal-design owner and carrying the statement -- or unbound, carrying the
 * decision that would bind it and no statement at all.
 *
 * The distinction exists because a specification is the ONLY place a document's
 * legal statements may live, so that legal review can see them. A specification
 * derived from an approved packet set can be perfectly real about its documents,
 * components, sources and field maps while still having no approved answer for
 * which court a motion is filed in. Writing a plausible answer into the gap
 * would put an unreviewed statement into a participant's packet wearing the
 * authority of a versioned record; leaving the section out entirely would let
 * the packet compose without it. So the gap is declared instead, and
 * `legalSectionsBound` is what the composer and the authority read.
 */
export type UnboundLegalSection = {
  bound: false;
  boundBy: null;
  decisionRequired: string;
};

export type PacketSpecificationLegalApprovalEvidence = {
  legalApprovalResult: "ADOPT";
  legalDecisionRecordId: string;
  legalDecisionOwner: string;
  legalDecisionEffectiveDate: string;
  requiresSignature: false;
  approvalSource: string;
  approvalCurrent: true;
  ownerQualification: string;
  shippingArtifactDigestPins: Array<{
    fixture: "canonical" | "boundary";
    file: string;
    sha256: string;
  }>;
};

export type PacketSpecification = {
  schemaVersion: number;
  specificationId: string;
  specificationVersion: string;
  /**
   * Every runtime route that delivers this exact family. Most specifications
   * have one route and omit this in favour of `routeKey`; a shared family must
   * enumerate its aliases here so registration remains an explicit server-side
   * crosswalk rather than a jurisdiction or label inference.
   */
  routeKeys?: string[];
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  pathwayLabel: string;
  /**
   * The route's own label in Spanish, where a reviewer has written one.
   *
   * The guide is bilingual and its cover prints this as the remedy, so an
   * English-only label put an English remedy name on an otherwise Spanish page.
   * Absent, the guide says the remedy is not established in this language
   * rather than printing the English or inventing a translation: naming a legal
   * remedy in Spanish is reviewed content, not a rendering decision.
   */
  pathwayLabelEs?: string;
  /** See `SpecificationCaseIdentifier`. Declared per route, never inferred. */
  caseIdentifierFactId?: string;
  packetFamily: string;
  packetFamilyLabel: string;
  trackId: string;
  packetSetId: string;
  packetSetVersion: string;
  profileId: string;
  profileVersion: string;
  specificationNote: string;
  legalSectionsBoundBy?: {
    ownerDecisionRecordId: string;
    postApprovalAuditVerdict: string;
    scope: string;
  };
  /** Hash of the specification with this field omitted. New artifact-bound specifications carry it. */
  specificationSha256?: string;
  /** Exact already-approved shipping artifacts this specification describes. */
  approvedArtifacts?: Array<{
    fixture: "canonical" | "boundary";
    file: string;
    sha256: string;
    byteLength: number;
    pageCount: number;
    components: string[];
  }>;
  statutoryAuthority: {
    primary: string;
    sourceUrl: string;
    ruleStatement: string;
    reliefIsMandatoryOnMotion: boolean;
    doNotImport: string[];
  };
  sourceIdentities: Array<{
    sourceId: string;
    kind: string;
    verification: "present_in_repository" | "asserted_by_ingestion";
    location?: string;
    note?: string;
  }>;
  requiredFacts: PacketSpecificationFact[];
  finalVerificationRequirements: string[];
  legalSectionsBound?: true;
  fieldOwnership?: {
    participantOwnedFacts: string[];
    serverOwnedRouteFacts: string[];
    participantAtSigningFields: string[];
    participantAtServiceFields: string[];
    notaryOwnedFields?: string[];
    prosecutorOwnedFields: string[];
    courtOwnedFields: string[];
    /**
     * Values the document prints as a labelled blank line for the participant to
     * complete from their own court paperwork before filing.
     *
     * A distinct bucket because it is a distinct answer to "who supplies this".
     * These are NOT facts the platform holds, asks for, or prefills: a packet
     * design may deliberately leave the court, the docket number or the charge
     * wording as a line on the page, because the participant reads them off
     * their own papers at the moment of filing and a value typed weeks earlier
     * into a screening form is more likely to be wrong than blank.
     *
     * Naming them here is what keeps that a decision rather than an accident.
     * Without the bucket the composer sees a section field, demands a fact, and
     * the only ways out are to ask the participant for it before Checkout or to
     * drop the component — the first turns an approved blank into an unnecessary
     * question, the second ships a packet missing a page.
     */
    participantCompletesBeforeFilingFields?: string[];
  };
  documents: PacketSpecificationDocument[];
  filingDestination: { statement: string; office: string; newCaseOrExisting: string; sourceOfRule: string };
  feeAndWaiver: {
    feeIdentified: boolean;
    statement: string;
    waiverApplicable: boolean;
    waiverStatement: string;
    sourceOfRule: string;
  };
  serviceAndNotice: {
    serviceRequired: boolean;
    statement: string;
    certificateOfServiceIncluded: boolean;
    whyNoCertificate?: string;
    sourceOfRule: string;
  };
  copyRequirements: { statement: string; originalPlusCopies: string; sourceOfRule: string };
  postFilingTimeline: Array<{ step: string; timing: string }>;
  hearingAndObjectionStops: Array<{ situation: string; whatItMeans: string; stopAndGetHelp: boolean }>;
  attachments: Array<{
    attachmentId: string;
    title: string;
    requirement: "required" | "conditional";
    conditionDescription?: string;
    obtainedFrom: string;
    whyNeeded: string;
    requiredBeforeFiling: boolean;
  }>;
  participantChecklist: Array<{
    id: string;
    text: string;
    requiredBeforeFiling: boolean;
    requirement?: string;
    kind?: string;
  }>;
};

/**
 * A specification whose legal sections are not yet decided. It is registered --
 * so the family binding is a real, independently resolvable fact rather than a
 * null agreeing with a null -- and it can never compose a packet or prove a
 * route while `legalSectionsBound` is false.
 */
export type DerivedPacketSpecification = {
  schemaVersion: number;
  specificationId: string;
  specificationVersion: string;
  obligationRouteKey?: string;
  routeKeys?: string[];
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  pathwayLabel: string;
  packetFamily: string;
  packetFamilyLabel: string;
  trackId: string;
  packetSetId: string;
  packetSetVersion: string;
  profileId: string;
  profileVersion: string;
  specificationSha256: string;
  legalSectionsBound: boolean;
  unboundLegalSections: string[];
  legalSections: Record<string, UnboundLegalSection | { bound: true }>;
  legalApproval?: PacketSpecificationLegalApprovalEvidence | null;
  postApprovalChangeAudit?: null;
  nextGate?: string;
  sourceIdentities: Array<{
    sourceId: string;
    kind?: string;
    verification?: "present_in_repository" | "asserted_by_ingestion";
    location?: string;
    sha256: string;
    byteLength?: number;
    instrumentKind?: string;
    shippedAsPacketComponent?: false;
    note?: string;
    fieldMap?: { overlayProfileSha256: string };
  }>;
  requiredFacts?: PacketSpecificationFact[];
  finalVerificationRequirements?: string[];
  documents: Array<{
    documentId: string;
    role: string;
    title?: string;
    order: number;
    outputStrategy?: "official_pdf_fill" | "custom_pleading" | "process_guidance";
    presentation?: "guidance" | "pleading";
    requirement?: "required" | "conditional";
    officialFormId?: string | null;
    manifestComponentId?: string;
  /**
   * A component the shared §7 participant guide replaces.
   *
   * Marked rather than deleted while both exist: the guide is not shipping yet,
   * and removing the page first would leave the packet short. `supersessionNote`
   * says what happens when it does ship. The point of recording it is that a
   * legacy guidance page should not quietly become permanent furniture beside
   * the guide that was built to replace it.
   */
  supersededBy?: "supplemental_guide";
  supersessionNote?: string;
  /**
   * Where this component's text came from, when it was carried into the
   * specification by a derivation repair rather than authored here.
   *
   * Per COMPONENT, not per family. A family whose shipping bytes drifted after
   * adoption may still be a safe source for one component and an unsafe source
   * for another: a characterisation proves what changed, and a change elsewhere
   * in the packet certifies nothing about this page. So the binding records the
   * adopted digest, what was used, and — where the family drifted — the evidence
   * that this particular component's substance was untouched.
   *
   * `componentEquivalence`:
   *   exact_adopted_bytes    the source reproduces the adopted artifact exactly,
   *                          so no per-component argument is needed.
   *   untouched_by_drift     the family drifted, and the recorded change does not
   *                          reach this component at all.
   *   drift_outside_substance the recorded change reaches this component but not
   *                          the substance carried — a machine footer, a page
   *                          break — and the record says so in terms.
   *   recovered_from_adopted the drift reaches this component's substance, so the
   *                          text was recovered from the adopted version rather
   *                          than copied from current bytes.
   *
   * A characterisation is evidence about what changed. It is never an owner
   * re-approval, and nothing here claims one.
   */
  transcriptionProvenance?: {
    adoptedDigest: string;
    sourceUsed: string;
    componentEquivalence:
      | "exact_adopted_bytes"
      | "untouched_by_drift"
      | "drift_outside_substance"
      | "recovered_from_adopted";
    evidence: string;
  };
    sections?: PacketSpecificationSection[];
  }>;
  /** Exact rendered bytes used as technical evidence; the name deliberately grants no approval. */
  artifactEvidence?: Array<{
    fixture: "canonical" | "boundary";
    file: string;
    sha256: string;
    byteLength: number;
    pageCount: number;
    components: string[];
    authority: "technical_evidence_only";
  }>;
};

export type RegisteredSpecification = PacketSpecification | DerivedPacketSpecification;

const SPECIFICATIONS: ReadonlyMap<string, RegisteredSpecification> = new Map<string, RegisteredSpecification>([
  [(specification as PacketSpecification).routeKey, specification as PacketSpecification],
  [(oregonSetAside as unknown as DerivedPacketSpecification).routeKey, oregonSetAside as unknown as DerivedPacketSpecification],
  // The two Kansas municipal routes. Registered so `resolvePacketFamilyId` has an
  // independent server-side statement of the family each route delivers, and
  // unbound so neither can compose a packet or prove a route: Kansas municipal
  // filing practice is court by court, and the approved memorandum yields to a
  // municipal court's own published instrument wherever one exists.
  [(kansasMunicipalConvictionOrDiversion as unknown as DerivedPacketSpecification).routeKey, kansasMunicipalConvictionOrDiversion as unknown as DerivedPacketSpecification],
  [(kansasMunicipalArrestRecord as unknown as DerivedPacketSpecification).routeKey, kansasMunicipalArrestRecord as unknown as DerivedPacketSpecification],
  [(mississippiNonConviction as unknown as PacketSpecification).routeKey, mississippiNonConviction as unknown as PacketSpecification],
  [(virginiaAbsolutePardon as unknown as PacketSpecification).routeKey, virginiaAbsolutePardon as unknown as PacketSpecification],
  [(nevadaProbationSpecialtyCourt as unknown as PacketSpecification).routeKey, nevadaProbationSpecialtyCourt as unknown as PacketSpecification],
  [(illinoisFelonyProstitutionRelief as unknown as PacketSpecification).routeKey, illinoisFelonyProstitutionRelief as unknown as PacketSpecification],
  [(dcActualInnocenceExpungement as unknown as PacketSpecification).routeKey, dcActualInnocenceExpungement as unknown as PacketSpecification],
  ["MS:additional-justice-court-misdemeanor-relief-9-11-15-3", mississippiAdditionalMisdemeanorRelief as unknown as PacketSpecification],
  ["MS:additional-municipal-court-misdemeanor-relief-21-23-7-6", mississippiAdditionalMisdemeanorRelief as unknown as PacketSpecification],
  [(wyomingFelonyConvictionExpungement as unknown as PacketSpecification).routeKey, wyomingFelonyConvictionExpungement as unknown as PacketSpecification],
  [(connecticutCleanSlatePetition as unknown as DerivedPacketSpecification).routeKey, connecticutCleanSlatePetition as unknown as DerivedPacketSpecification],
  [(dcCorrectMisattributedArrest as unknown as DerivedPacketSpecification).routeKey, dcCorrectMisattributedArrest as unknown as DerivedPacketSpecification],
  // Five proven families given a route-scoped specification by the PROD-D
  // route-productization lane. Each binds one exact runtime route to one exact
  // family and the shipping digests OWN-ADOPT-2026-09-02-BATCH-53 adopted. All
  // carry legalSectionsBoundBy.postApprovalAuditVerdict =
  // NO_POST_APPROVAL_CHANGE_AUDIT_ROW_YET, so the fulfillment-authority
  // generator and the factory-v2 migration path, which require
  // COVERED_BY_EXISTING_APPROVAL, still refuse them. Registration creates no
  // fulfillment record and opens no route. The two Georgia routes are each
  // also claimed by the ga-seal-m obligation; this map admits one family per
  // route, so ga-seal-m-set is deliberately not registered here.
  [(mississippiFirstOffenderMisdemeanor as unknown as PacketSpecification).routeKey, mississippiFirstOffenderMisdemeanor as unknown as PacketSpecification],
  [(illinoisMistakenIdentityRelief as unknown as PacketSpecification).routeKey, illinoisMistakenIdentityRelief as unknown as PacketSpecification],
  [(georgiaSb288MisdemeanorRestriction as unknown as PacketSpecification).routeKey, georgiaSb288MisdemeanorRestriction as unknown as PacketSpecification],
  [(georgiaPardonedFelonyRestriction as unknown as PacketSpecification).routeKey, georgiaPardonedFelonyRestriction as unknown as PacketSpecification],
  [(southDakotaSisSealing as unknown as PacketSpecification).routeKey, southDakotaSisSealing as unknown as PacketSpecification]
]);

/**
 * True when every legal section a document may print is decided. A
 * specification that does not say is treated as bound only if it predates the
 * field, which is why the check is for an explicit `false` rather than a
 * falsy value.
 */
export function specificationLegalSectionsBound(spec: RegisteredSpecification): boolean {
  return (spec as DerivedPacketSpecification).legalSectionsBound !== false;
}

/**
 * The canonical content digest a fulfillment record pins. A specification that
 * carries one uses it; one that does not is not yet hashed over its content and
 * says so with the empty string rather than with a hash of something narrower.
 */
export function specificationContentSha256(spec: RegisteredSpecification): string {
  return (spec as DerivedPacketSpecification).specificationSha256 ?? "";
}

export function packetSpecificationFor(routeKey: string): RegisteredSpecification | undefined {
  return SPECIFICATIONS.get(routeKey);
}

/**
 * The route-and-track crosswalk used when more than one legal-design track
 * shares a runtime pathway. A route match alone is insufficient in that case:
 * the packet specification must also name the exact server-owned track.
 */
export function packetSpecificationForTrack(
  routeKey: string,
  trackId: string
): RegisteredSpecification | undefined {
  const specification = SPECIFICATIONS.get(routeKey);
  const normalizedTrackId = String(trackId ?? "").trim();
  if (!specification || !normalizedTrackId || specification.trackId !== normalizedTrackId) return undefined;
  return specification;
}

/**
 * The composable subset. A specification with unbound legal sections resolves
 * for identity -- family, version, content hash -- and is deliberately not
 * returned here, so no caller can compose from it by forgetting to check.
 */
export function composablePacketSpecificationFor(routeKey: string): PacketSpecification | undefined {
  const spec = SPECIFICATIONS.get(routeKey);
  if (!spec || !specificationLegalSectionsBound(spec)) return undefined;
  return spec as PacketSpecification;
}

/** Packet-completion facts supplied by the exact registered document set. */
export function packetSpecificationRequiredFactIdsFor(routeKey: string): string[] {
  return composablePacketSpecificationFor(routeKey)?.requiredFacts.map((fact) => fact.factId) ?? [];
}

/** Presentation metadata for one exact packet fact, when the specification owns it. */
export function packetSpecificationFactFor(
  routeKey: string,
  factId: string
): PacketSpecificationFact | undefined {
  return composablePacketSpecificationFor(routeKey)?.requiredFacts.find((fact) => fact.factId === factId);
}

/**
 * The fact id that holds this route's case or matter identifier, as the route
 * declares it.
 *
 * Preference order is by authority, not by likelihood: a caption contract is
 * the adopted page's own statement of which fact prints as the case number, so
 * it wins over the specification-level declaration, which exists only for the
 * families whose captions predate that contract.
 */
export function specificationCaseIdentifierFactId(
  specification: Pick<PacketSpecification, "documents"> & { caseIdentifierFactId?: string }
): string | undefined {
  for (const document of specification.documents ?? []) {
    for (const section of document.sections ?? []) {
      const declared = (section as { captionContract?: { caseNumber?: string } }).captionContract?.caseNumber;
      if (typeof declared === "string" && declared.trim()) return declared;
    }
  }
  const fallback = specification.caseIdentifierFactId;
  return typeof fallback === "string" && fallback.trim() ? fallback : undefined;
}

export function packetSpecificationRouteKeys(): string[] {
  return [...SPECIFICATIONS.keys()].sort();
}
