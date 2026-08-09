// Wyoming process guidance — the filing, service and timing sheet.
//
// SCOPE. One component:
//
//   wy_nc_1401-filing-instructions-5    the fifth required component of the
//                                       wy_nc_1401 packet set, declared
//                                       `process_guidance` by the design and
//                                       owned by no lane until now.
//
// The other four components of that packet set — the verified petition, the
// proposed Order for Expungement, the statutory verification and the
// certificate of service — are delivered and integrated custom pleading. They
// belong to another assignment, they are imported here read-only so this sheet
// can be rendered in the packet it actually sits in, and nothing in this module
// edits, re-renders or re-verifies them.
//
// `wy_misd_1501` and `wy_fel_1502` are not touched. Each is blocked on its own
// legal-design question, neither is implemented here, and no sentence in this
// sheet names either section as a route this packet produces.
//
// WHY A SHEET AND NOT A PLEADING. The design puts the filing route, the service
// recipient and the statutory timing in the instructions rather than in the
// petition, and the custom-pleading verifier enforces that split by refusing a
// numeral deadline anywhere in the pleadings. So the twenty-day objection
// window and the one-hundred-and-eighty-day waiting period are stated here, on
// a sheet the participant keeps, and nowhere in the documents they file.
//
// THE NOTICE THIS SHEET CARRIES. The engine's default notice explains a route
// completed outside a court petition. That is the opposite of the truth here:
// this sheet is bound into a packet whose other pages go to a clerk. It
// overrides the notice with one that keeps the engine's required opening
// sentence and then says the true thing — these instructions are not filed, and
// the documents in front of them are.
//
// WHAT THIS SHEET NEVER SAYS. It never gives a street address, a telephone
// number, a filing portal, a copy count, a cover-sheet requirement, a hearing
// date, a filing deadline the memo does not establish, an official form number,
// or a county's own preference. It never states that anything has been filed or
// served, that any period has run — it computes none — that the prosecuting
// attorney has responded, that a victim has been notified, that the Division of
// Criminal Investigation has acted, or that the court has found, signed, dated
// or entered anything. The only amount it prints is the statutory filing fee of
// $0, which is the statute setting no fee rather than a fee anyone has waived.
//
// CASPER. Casper Municipal Court is the only publicly identified Wyoming
// local-form exception, and its packets bind that court alone. No Casper form is
// imported, referenced as usable, or allowed to satisfy this statewide
// component — including in Natrona County Circuit Court and Natrona County
// District Court. A participant who tries to use one outside that court is
// stopped rather than accommodated.
//
// LOCAL PRACTICE. The twenty-three-county survey of unpublished local filing
// preferences is open, is release-level, and is owned by
// `rcap-wy-local-template-and-handout-survey`. No Wyoming county has been
// telephoned. This sheet therefore names the mechanics a clerk decides and
// sends the participant to their own clerk to ask, rather than asserting an
// answer that has not been established.
//
// SOURCES. Every statement is taken from the integrated WY memo, the packet-set
// manifest, the controlling decision `wy-published-source-filing-requirements`
// and the statute. No content is reused from the Wyoming Judicial Branch
// "Expungement Basics" handout, which the design excludes as possibly stale.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import { NOT_A_COURT_FILING_SENTENCE } from "@/lib/rcap/packets/engines/process-guidance";
import { WY_CUSTOM_PLEADING_TRACKS } from "@/lib/rcap/packets/jurisdictions/wyoming/custom-pleading";
import type { PacketComponent, PacketSet, ReliefTrack } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

/** Matches the pleadings this sheet is bound with, so the packet reads as one. */
const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export const WY_GUIDANCE_TRACK_ID = "wy_nc_1401";

export const WY_GUIDANCE_COMPONENT_ID = "wy_nc_1401-filing-instructions-5";

export const WY_FILING_INSTRUCTIONS_TEMPLATE_ID = "wy-nc-1401-filing-instructions";

/** The design role. The engine's own closed role list has no `filing_instructions`. */
export const WY_GUIDANCE_DESIGN_ROLE = "filing_instructions";

/**
 * Design role → engine role.
 *
 * `filing_instructions` is not one of the engine's closed component roles. It
 * maps to `instructions`, which is the engine's role for a sheet that
 * accompanies a filing without being filed, and which the shared fixture packet
 * set already uses for exactly that shape. The design role stays the design's;
 * only the engine value is translated, and the component id keeps the design's
 * own name.
 */
export const WY_GUIDANCE_ROLE: PacketComponent["role"] = "instructions";

/** Tracks this lane does not implement and this sheet never names as a route. */
export const WY_GUIDANCE_EXCLUDED_TRACK_IDS: readonly string[] = [
  "wy_misd_1501",
  "wy_fel_1502"
];

/**
 * Components of this packet set that are another assignment's owned work.
 *
 * Named so the split is checkable rather than remembered: this lane renders
 * them to inspect its own sheet in context and implements none of them.
 */
export const WY_GUIDANCE_FOREIGN_COMPONENT_IDS: readonly string[] = [
  "wy_nc_1401-primary-filing-1",
  "wy_nc_1401-proposed-order-2",
  "wy_nc_1401-verification-3",
  "wy_nc_1401-certificate-of-service-4"
];

/** Instruments the design excludes from this packet, restated by this sheet. */
export const WY_GUIDANCE_EXCLUDED_INSTRUMENTS: readonly string[] = [
  "summons",
  "praecipe",
  "prosecutor notice to victims",
  "prosecutor response",
  "Division of Criminal Investigation action",
  "judicial findings",
  "populated judge signature",
  "populated judicial date",
  "clerk certification",
  "completed proof of service before service occurs",
  "a Casper Municipal Court form"
];

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

/**
 * A material fail-closed branch.
 *
 * Every stop carries a reason, a destination and a next step, and no stop
 * routes the participant back into the step it just closed.
 */
export class WyomingGuidanceStopError extends Error {
  readonly stopId: string;
  readonly componentId: string;
  readonly destination: string;
  readonly nextStep: string;

  constructor(stopId: string, reason: string, destination: string, nextStep: string) {
    super(reason);
    this.name = "WyomingGuidanceStopError";
    this.stopId = stopId;
    this.componentId = WY_GUIDANCE_COMPONENT_ID;
    this.destination = destination;
    this.nextStep = nextStep;
  }
}

/** An answer outside the closed list this sheet declares for that question. */
export class WyomingGuidanceBranchError extends Error {
  readonly key: string;
  readonly value: string;
  readonly permitted: readonly string[];

  constructor(key: string, value: string, permitted: readonly string[]) {
    super(`Answer "${value}" for ${key} is not one of: ${permitted.join(", ")}.`);
    this.name = "WyomingGuidanceBranchError";
    this.key = key;
    this.value = value;
    this.permitted = permitted;
  }
}

/** This module builds one component. Asked for another, it refuses. */
export class WyomingGuidanceComponentError extends Error {
  readonly requested: string;

  constructor(requested: string) {
    super(
      `This module implements ${WY_GUIDANCE_COMPONENT_ID} only, and ${requested} is not it.`
    );
    this.name = "WyomingGuidanceComponentError";
    this.requested = requested;
  }
}

// ---------------------------------------------------------------------------
// Closed lists
//
// Each is this sheet's own option set. An answer outside one is refused rather
// than normalized into the nearest neighbour.
// ---------------------------------------------------------------------------

export const WY_GUIDANCE_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * The guidance-step questions.
 *
 * These are this sheet's gate, not track inputs: none of them is printed into
 * any document, none is an identity fact, and adding one to the delivered
 * track's `requiredInputs` would change another assignment's track. They decide
 * only whether this sheet may be produced at all.
 */
export const WY_GUIDANCE_GATE_KEYS: readonly string[] = [
  "prosecutingAttorneyIdentified",
  "serviceAlreadyCompleted"
];

/**
 * Requests this lane refuses.
 *
 * A participant asking for one of these is not asking for something the design
 * merely lacks — each is a thing the design affirmatively does not do, so each
 * is a stop with somewhere to go rather than a silent omission.
 */
export const WY_GUIDANCE_REFUSED_REQUESTS: Readonly<Record<string, string>> = {
  county_specific_rule: "county_specific_rule",
  casper_form_outside_casper: "casper_form_outside_casper",
  populate_judicial_or_clerk_field: "populate_judicial_or_clerk_field"
};

// ---------------------------------------------------------------------------
// Destinations
//
// Institutions, never addresses. This sheet prints no street address, no
// telephone number and no office for anybody, because none was established and
// an invented one sends a filing to the wrong place.
// ---------------------------------------------------------------------------

export const WY_GUIDANCE_CLERK_DESTINATION =
  "The clerk of the Wyoming court in which the proceeding occurred or would have occurred.";

export const WY_GUIDANCE_PROSECUTOR_DESTINATION =
  "The prosecuting attorney's office for the county in which the case was or would have been handled.";

export const WY_GUIDANCE_LAWYER_DESTINATION =
  "A Wyoming lawyer. The Wyoming State Bar's lawyer referral service and Legal Aid of Wyoming are the two statewide starting points; LegalEase contacts neither of them for you.";

/**
 * A document already in the participant's hands.
 *
 * Not every stop sends someone to an institution. Where the fix is a blank on a
 * page they are holding, saying so beats naming an office that has nothing to
 * do with it.
 */
export const WY_GUIDANCE_CERTIFICATE_DESTINATION =
  "The certificate of service in this packet, which the participant completes by hand when service is actually made.";

/** Every destination a stop on this sheet may send someone to. */
export const WY_GUIDANCE_DESTINATIONS: readonly string[] = [
  WY_GUIDANCE_CLERK_DESTINATION,
  WY_GUIDANCE_PROSECUTOR_DESTINATION,
  WY_GUIDANCE_LAWYER_DESTINATION,
  WY_GUIDANCE_CERTIFICATE_DESTINATION
];

const CLERK_DESTINATION = WY_GUIDANCE_CLERK_DESTINATION;
const PROSECUTOR_DESTINATION = WY_GUIDANCE_PROSECUTOR_DESTINATION;

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const raw = answers[key];
  return typeof raw === "string" ? raw.trim() : raw === undefined || raw === null ? "" : String(raw).trim();
};

const yesNo = (answers: Answers, key: string): boolean | null => {
  const value = str(answers, key).toLowerCase();
  if (value === "") return null;
  if (!Object.prototype.hasOwnProperty.call(WY_GUIDANCE_YES_NO, value)) {
    throw new WyomingGuidanceBranchError(key, value, Object.keys(WY_GUIDANCE_YES_NO));
  }
  return WY_GUIDANCE_YES_NO[value];
};

/**
 * Derives this sheet's facts, or stops.
 *
 * Three of the six material branches fire here, from what the participant has
 * already answered. The other three fire in `refuseWyomingGuidanceRequest`,
 * because they are things a participant asks for rather than things they are.
 */
export function deriveWyomingGuidanceFacts(
  componentId: string,
  answers: Answers
): Record<string, string> {
  if (componentId !== WY_GUIDANCE_COMPONENT_ID) {
    throw new WyomingGuidanceComponentError(componentId);
  }

  const courtName = str(answers, "courtName");
  if (courtName === "") {
    throw new WyomingGuidanceStopError(
      "court_identity_unestablished",
      "The court in which the proceeding occurred, or would have occurred, has not been established, so this sheet cannot say where the petition goes.",
      CLERK_DESTINATION,
      "Identify that court first — where charges were filed it is the court that handled the case, and where no charges were ever filed it is the court that would have had jurisdiction over the matter. Ask the clerk of the court you believe handled it, then return and answer the court question."
    );
  }

  const chargesFiled = yesNo(answers, "chargesFiled");
  const caseNumber = str(answers, "caseNumber");
  if (chargesFiled === true && caseNumber === "") {
    throw new WyomingGuidanceStopError(
      "case_identity_unestablished",
      "Charges were filed on this matter, so an existing case and case number exist, and neither has been established.",
      CLERK_DESTINATION,
      "Ask that clerk for the docket and the case number for the underlying matter, together with the order of dismissal or other disposition, then return and answer the case-number question. Do not file a petition that captions the case wrongly."
    );
  }

  const prosecutorIdentified = yesNo(answers, "prosecutingAttorneyIdentified");
  if (prosecutorIdentified === false) {
    throw new WyomingGuidanceStopError(
      "prosecuting_attorney_unidentified",
      "The prosecuting attorney is the one recipient this route requires service on, and that office has not been identified.",
      PROSECUTOR_DESTINATION,
      "Ask the clerk of your filing court which prosecuting attorney's office handles that court's cases, and ask that office how it accepts service. LegalEase does not name an office or an address for you and does not deliver anything to one."
    );
  }

  const serviceCompleted = yesNo(answers, "serviceAlreadyCompleted");
  if (serviceCompleted === true) {
    throw new WyomingGuidanceStopError(
      "service_represented_as_completed",
      "Service was reported as already made. This packet is prepared before service, and LegalEase does not record a completed service fact for anyone.",
      WY_GUIDANCE_CERTIFICATE_DESTINATION,
      "Leave the service date blank until service is actually made, then write in the date it was made and file the certificate. If service really has been made already, the date still goes on the certificate by hand — nothing generated here states that service occurred."
    );
  }

  return {
    guidanceComponentId: WY_GUIDANCE_COMPONENT_ID,
    guidanceTrackId: WY_GUIDANCE_TRACK_ID,
    courtName
  };
}

/**
 * Refuses a request the design does not answer, with somewhere to go.
 *
 * Always throws. A caller that reaches it has asked for a county's own rule, a
 * Casper form outside Casper Municipal Court, or a field only a judge or a
 * clerk fills in.
 */
export function refuseWyomingGuidanceRequest(request: string): never {
  const kind = WY_GUIDANCE_REFUSED_REQUESTS[request];
  if (!kind) {
    throw new WyomingGuidanceBranchError(
      "request",
      request,
      Object.keys(WY_GUIDANCE_REFUSED_REQUESTS)
    );
  }

  if (kind === "county_specific_rule") {
    throw new WyomingGuidanceStopError(
      "county_specific_rule_requested",
      "That is an unpublished local filing preference. Wyoming publishes no statewide answer to it, no Wyoming county has been surveyed, and LegalEase will not state a county rule it has not established.",
      CLERK_DESTINATION,
      "Call that clerk and ask them directly: cover sheet, how many copies, paper or electronic filing, whether chambers wants a copy, and whether the proposed order goes in with the initial filing or is brought later. Their answer governs how you file. It does not change the petition or the proposed order, which are complete as drafted."
    );
  }

  if (kind === "casper_form_outside_casper") {
    throw new WyomingGuidanceStopError(
      "casper_form_outside_casper",
      "Casper Municipal Court's expungement packets bind that court alone. They are not statewide forms, and they do not apply in this filing court — including in Natrona County Circuit Court and Natrona County District Court.",
      CLERK_DESTINATION,
      "File the statewide packet you have. Wyoming publishes no statewide expungement form, so the petition and proposed order here are drafted and are what this court receives. If you are in fact filing in Casper Municipal Court itself, that is a different court from the one this packet was built for — stop and check which court your matter belongs in before filing anything."
    );
  }

  throw new WyomingGuidanceStopError(
    "judicial_or_clerk_field_population_requested",
    "Those fields belong to the court. The judge's findings, the date of entry and the judge's signature are the judge's; the case number on a new matter, the filing stamp and any certification are the clerk's. LegalEase leaves every one of them blank on purpose, and filling one in would misstate that the court has acted.",
    CLERK_DESTINATION,
    "File the proposed order unexecuted, which is what it is for: it is prepared so the judge has it ready to sign. Leave the blanks alone and let the court complete them. Where a blank is yours — your signature, your verification, the date you actually served the prosecuting attorney — this sheet says so under WHAT TO DO, IN ORDER."
  );
}

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

/**
 * The notice this sheet carries instead of the engine's default.
 *
 * It keeps the engine's required opening sentence — which the renderer asserts
 * — and then says the thing that is true of instructions bound into a filing
 * packet, rather than the default's description of a route completed outside a
 * court petition.
 */
export const WY_FILING_INSTRUCTIONS_NOTICE =
  `${NOT_A_COURT_FILING_SENTENCE} It is the instruction sheet for the petition and the proposed order in this packet. Those documents are filed; these instructions are not, and you do not hand this sheet to the clerk.`;

const WY_FILING_INSTRUCTIONS_TEMPLATE: GuidanceTemplate = {
  templateId: WY_FILING_INSTRUCTIONS_TEMPLATE_ID,
  version: VERSION,
  technicalFixture: true,
  banner: BANNER,
  paginate: true,
  mechanismName:
    "FILING, SERVICE AND TIMING — PETITION FOR EXPUNGEMENT UNDER WYO. STAT. § 7-13-1401",
  notFilingNotice: WY_FILING_INSTRUCTIONS_NOTICE,
  whyNotAFiling:
    "The petition and the proposed Order for Expungement in this packet are what you file. This sheet tells you where they go, who is served, and what the statute says about timing. Keep it; it is for you.",
  processType: "court_adjacent",

  prerequisites: [
    "The verified Petition for Expungement and the proposed Order for Expungement in this packet, read all the way through, with anything that is wrong corrected before you go anywhere.",
    "Your signature and the verification on the petition. Wyo. Stat. § 7-13-1401 requires the petition to be verified by the petitioner, so this is not optional and nobody can sign it for you.",
    "An answer from the clerk of your filing court on whether that court requires the verification to be sworn before a notary. Wyoming does not settle that statewide, so ask before you sign.",
    "The route this packet was built on: at least 180 days since the arrest, or since the date the charges were dismissed where they were dismissed; no criminal charges pending against you; and no deferred disposition under Wyo. Stat. § 7-13-301, § 35-7-1037 or former § 7-13-203 on any charge arising from the incident. LegalEase has not calculated any of those dates for you and states no date as having passed."
  ],

  documentsToObtain: [
    "The docket and the order of dismissal or other disposition for the underlying matter, from the clerk of the court that handled it. Get these where charges were filed, so the caption and the disposition on your petition match the court's own record.",
    "Your Wyoming criminal history record from the Division of Criminal Investigation, Criminal Records Unit, if you do not know whether this arrest reached the state repository. A Wyoming record exists only where an arrest fingerprint card was submitted; where none was submitted the arrest will not appear on the state or FBI record, and the Division cannot create an arrest event from court documents alone.",
    "This is the only role the Division of Criminal Investigation has for you here. It is where you may request your own record. It is not served with your petition."
  ],

  participantDataToGather: [
    "The court in which the proceeding occurred, or would have occurred if no charges were ever filed.",
    "The case number for the underlying matter, where charges were filed. Where none were filed there is no case number: the petition opens a new matter and the clerk assigns one, which is why that space is left blank.",
    "Which prosecuting attorney's office handles cases in that court, and how that office accepts service.",
    "The date you actually serve the prosecuting attorney. It does not exist yet, so it is left blank until service is made."
  ],

  officialDestination: {
    name: "The clerk of the Wyoming court in which the proceeding occurred or would have occurred",
    detail:
      "On your answers, that is {{courtName}}. Where charges were filed this is the court that handled the case. Where no charges were ever filed there is no existing case, and the petition goes to the court that would have had jurisdiction over the matter, which opens a new matter there. LegalEase prints no street address, no telephone number and no filing portal for any Wyoming court, because none is established statewide — that court is where you get its address and its filing method."
  },

  actionSequence: [
    "Read the petition and the proposed Order for Expungement all the way through and correct anything that is wrong. You are the only person who can confirm the facts in them.",
    "Fill in by hand the blanks that are yours: your signature and date, and the verification. Leave alone every blank that is not yours — the judge's findings, the date of entry, the judge's signature, any clerk entry, and any hearing date. Those are blank on purpose because only the court completes them.",
    "Ask the clerk of your filing court whether that court requires the verification to be sworn before a notary. If it does, sign the verification in front of a notary rather than beforehand.",
    "Call that same clerk about that court's own filing mechanics: whether it wants a cover sheet, how many copies, whether it takes paper or electronic filing, whether chambers wants a copy, and whether the proposed order goes in with the initial filing or is brought later. Wyoming publishes no statewide answer to any of those, so the clerk's answer is the only one there is. That call is about how you file, not about whether the documents are right.",
    "File the verified petition and the proposed Order for Expungement with that clerk. There is no statutory filing fee to pay on this route.",
    "Serve the verified petition on the prosecuting attorney, in whatever way that office accepts service.",
    "After service is actually made — not before — write the date of service on the certificate of service and file it. That date is what starts the statutory objection period, which is why it has to be the real one.",
    "Wait. Under § 7-13-1401 no order may be granted before 20 days have expired after service on the prosecuting attorney.",
    "Watch for what the prosecuting attorney does. If that office objects, the court sets a hearing and tells you the date. If no objection is filed, the court may enter the order summarily on finding you eligible. Neither outcome is something this packet predicts or reports."
  ],

  submissionMethod:
    "Wyoming publishes no statewide filing method for this petition. Whether your court takes a filing at the counter, by mail, or through an electronic system is that court's own practice, and its clerk is the one who tells you. LegalEase names no portal and no address, and there is no LegalEase filing service — you or someone acting for you files these documents.",

  fees:
    "There is no statutory filing fee for this petition. Wyo. Stat. § 7-13-1401 sets none, so the amount is $0.",

  feeWaiver:
    "That is the statute setting no fee, not a fee that has been waived for you. There is no fee-waiver application to make on this route and no indigency form to file, and nobody has decided anything about your ability to pay. Copying, certification, postage and record-retrieval costs are separate things from a filing fee; where a court or an agency charges one of those, it is not the statutory filing fee and this sheet does not state its amount.",

  noticeOrService: [
    "The verified petition is served on the prosecuting attorney. That is the service this route requires.",
    "The Division of Criminal Investigation is not served, and no document to the Division is generated for you. On a granted petition the court itself transmits a certified copy of the order to the Division; that is the court's own step afterwards, not a delivery you make and not a party you serve.",
    "No summons is generated and none is required on this route under the statewide statutes and the published statewide guidance.",
    "No praecipe is generated and none is required.",
    "No victim notice is generated. The controlling section prescribes none on this route. Where any other route's prosecutor gives notice to a victim, that is that office's own work and is not a document you file.",
    "No prosecutor response is generated. Whether the prosecuting attorney objects is that office's decision, and nothing here predicts it or reports it.",
    "The certificate of service in this packet is written entirely in the future. It is completed when service is actually made. Nothing generated for you says that service has happened, because it has not."
  ],

  expectedNextStage:
    "No order may be granted before the expiration of 20 days after service on the prosecuting attorney, and that period runs from the date service is actually made — which is the date you fill in. If the prosecuting attorney objects, the court sets a hearing and assigns the date; this packet contains no hearing date and generates no notice of hearing. If no objection is filed, the court may summarily enter the order on finding the petitioner eligible. On a granted petition the court seals the file and transmits a certified copy of the order to the Division of Criminal Investigation. Nothing in this packet says the court has acted, and no date in it has been calculated for you.",

  legalEaseCanPrepare: [
    "The verified petition, the proposed Order for Expungement, the statutory verification and the certificate of service that make up the rest of this packet.",
    "This filing, service and timing sheet.",
    "A plain statement of which blanks you complete and which the court completes."
  ],

  legalEaseCannotPerform: [
    "Filing anything, or delivering anything to a clerk or to a prosecuting attorney.",
    "Serving the prosecuting attorney, or stating that service has been made.",
    "Telling you a particular county's cover sheet, copy count, filing method or local preference. No Wyoming county has been surveyed and none of those is stated here.",
    "Filling in the judge's findings, the date of entry, the judge's signature, a clerk entry, or a hearing date.",
    "Calculating whether a waiting period has run, or telling you that a deadline has passed.",
    "Guaranteeing eligibility or any outcome, or saying whether the prosecuting attorney will object.",
    "Giving legal advice. This sheet describes a process; it does not advise you on your case."
  ],

  escalationTriggers: [
    "The prosecuting attorney files an objection, or the court sets a contested hearing.",
    "Criminal charges are pending against you anywhere.",
    "Any charge arising from this incident ended in a deferred disposition under Wyo. Stat. § 7-13-301, § 35-7-1037 or former § 7-13-203 — including a deferral entered on a different or lesser charge than the one you were arrested for.",
    "The matter involved facts of human trafficking or coercion.",
    "The matter involved an offence subject to sex offender registration.",
    "You are not a United States citizen, or a record could affect your immigration status.",
    "The records are federal, tribal or out-of-state.",
    "The records are from a juvenile matter.",
    "The clerk tells you the court requires a document this packet does not contain.",
    `Where any of these applies: ${WY_GUIDANCE_LAWYER_DESTINATION}`
  ],

  officialSourceReferences: [
    "Wyo. Stat. § 7-13-1401, including § 7-13-1401(j)(i) and § 7-13-1401(j)(ii).",
    "Wyo. Stat. § 7-19-107(a), on the state central repository.",
    "Wyoming publishes no statewide expungement petition form and no statewide proposed-order template. There is no Wyoming statewide form number for either document, so none is cited here and none should be asked for. That is why the petition and the proposed order in this packet are drafted documents rather than an official form filled in, and why they are complete as drafted.",
    "Casper Municipal Court publishes its own expungement packets. Those bind that court alone, they are not statewide forms, and they are not used in this packet — including in Natrona County Circuit Court and Natrona County District Court."
  ]
};

export const WYOMING_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  [WY_FILING_INSTRUCTIONS_TEMPLATE_ID]: WY_FILING_INSTRUCTIONS_TEMPLATE
};

// ---------------------------------------------------------------------------
// The component, and the packet it sits in
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The fifth component of the wy_nc_1401 packet set. */
export const WY_GUIDANCE_COMPONENT: PacketComponent = {
  componentId: WY_GUIDANCE_COMPONENT_ID,
  role: WY_GUIDANCE_ROLE,
  outputStrategy: "process_guidance",
  rendererStrategy: "process_guidance",
  templateId: WY_FILING_INSTRUCTIONS_TEMPLATE_ID,
  sourcePath: null,
  sourceSha256: null,
  geographicScope: "statewide",
  requirement: "required",
  order: 5,
  approval: PENDING_APPROVAL,
  version: VERSION
};

/**
 * The delivered track with this component in place.
 *
 * Returns a new track and a new packet set rather than mutating the imported
 * ones: the custom-pleading module is another assignment's owned path, and a
 * lane that reaches into it in memory is editing it in every way that matters.
 * Every other field of the delivered track is carried through untouched, which
 * is what keeps `technicalFixture`, `runtimeDisabled` and the computed runtime
 * status exactly as that assignment left them — adding a required component
 * does not make a track ready, and nothing here recomputes readiness.
 */
export function withWyomingGuidanceComponent(
  tracks: readonly ReliefTrack[]
): readonly ReliefTrack[] {
  return tracks.map((track) => {
    if (track.trackId !== WY_GUIDANCE_TRACK_ID) return track;
    if (track.packetSet.components.some((c) => c.componentId === WY_GUIDANCE_COMPONENT_ID)) {
      return track;
    }
    const packetSet: PacketSet = {
      ...track.packetSet,
      components: [...track.packetSet.components, WY_GUIDANCE_COMPONENT]
    };
    return { ...track, packetSet };
  });
}

/**
 * The Wyoming packet context this component renders in.
 *
 * The delivered custom-pleading track, plus the one component this lane owns.
 * It is the packet as the design describes it, which is the only context in
 * which this sheet can be read for what it is. It does not assert that the
 * packet is filing-complete, technically approved, packet-ready or production
 * enabled: those are derived after integration, from a regenerated proof and a
 * current technical review, and none of them is this lane's to claim.
 */
export const WY_GUIDANCE_PACKET_TRACKS: readonly ReliefTrack[] =
  withWyomingGuidanceComponent(WY_CUSTOM_PLEADING_TRACKS);
