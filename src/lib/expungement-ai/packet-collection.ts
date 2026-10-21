import { vaPardonLocationApplies } from "@/lib/expungement-ai/va-pardon-location-context";
import { wy1502Context } from "@/lib/rcap-engine/wyoming-1502-facts";
import { southDakotaSisContext } from "@/lib/rcap-engine/south-dakota-sis-facts";
import { illinoisProstitutionContext } from "@/lib/rcap-engine/illinois-prostitution-facts";
import { CA_SAFE_AT_HOME_ID } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { NEVADA_176A_ROUTE_KEY } from "@/lib/rcap-engine/nevada-176a-branch";
import { ctPetitionContext } from "@/lib/rcap-engine/connecticut-clean-slate-petition-facts";
import { georgiaSb288Context } from "@/lib/rcap-engine/georgia-sb288-facts";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { MD_JUVENILE_COUNTY_SOURCE_PURPOSE, type MdJuvenileCountySourcePurpose } from "@/lib/expungement-ai/md-juvenile-county-source-purpose";
import { ksMunicipalCategoryIsContext } from "@/lib/expungement-ai/ks-municipal-category-context";
import { msFirstOffenderSourceContract, MS_FIRST_OFFENDER_SOURCE } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";
import { MS_FIRST_OFFENDER_COLLECTION_IDS, msFirstOffenderSourceQuestions } from "@/lib/expungement-ai/ms-first-offender-source-questions";
import { ohJuvenileSourceContract, ohJuvenileStageFactIds, ohJuvenileStageFacts } from "@/lib/rcap-engine/ohio-juvenile-source-stage";
import { OH_JUVENILE_STAGE_IDS } from "@/lib/expungement-ai/oh-juvenile-stage-questions";
import { mnTwoCountyFactIds, mnTwoCountyQuestions, MN_PROSECUTOR_KIND, MN_PROSECUTING_CITY, MN_TWO_COUNTY_SOURCE, mnProtectedStageContext } from "@/lib/expungement-ai/mn-two-county-source-facts";
import { mdPoliceContext, mdPoliceFactIds, MD_POLICE_IDS } from "@/lib/rcap-engine/maryland-police-record-facts";
import { moXivCourtIsContext } from "@/lib/expungement-ai/mo-xiv-court-context";
import { MO_MARIJUANA_CUSTODY_FACT } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import { mnCannabisLocationIsContext } from "@/lib/expungement-ai/mn-cannabis-location-context";
import { mn609a017LocationIsContext } from "@/lib/expungement-ai/mn-609a017-location-context";
import { mn299c11LocationIsContext } from "@/lib/expungement-ai/mn-299c11-location-context";
import { mn609a015LocationIsContext } from "@/lib/expungement-ai/mn-609a015-location-context";
import { mo610122CourtIsContext } from "@/lib/expungement-ai/mo-610122-court-context";
import { mo610105CourtIsContext } from "@/lib/expungement-ai/mo-610105-court-context";
import { virginiaVictimQuestionContract, VA_VICTIM_STATUS_ID } from "@/lib/rcap-engine/virginia-victim-question";
import { texasGuidanceFinancialApplies } from "@/lib/rcap-engine/texas-nondisclosure-facts";
import { westVirginiaGuidanceFinancialApplies } from "@/lib/rcap-engine/west-virginia-guidance-financial";
import { southDakotaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-dakota-guidance-financial";
import { southCarolinaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-carolina-guidance-financial";
import { newJerseyMarijuanaStatusFinancialApplies } from "@/lib/rcap-engine/new-jersey-marijuana-status-financial";
import { oklahomaCleanSlateFinancialApplies } from "@/lib/rcap-engine/oklahoma-clean-slate-financial";
import { ohTraffickingCourtIsContext } from "@/lib/expungement-ai/oh-trafficking-court-context";
import {WY_1501_FACT_IDS,wy1501Context,wy1501QuestionApplies} from "@/lib/rcap-engine/wyoming-1501-facts";
import { WY_1401_FACT_IDS, wy1401Context, wy1401QuestionApplies } from "@/lib/rcap-engine/wyoming-1401-facts";
import { newMexicoGuidanceFinancialApplies } from "@/lib/rcap-engine/new-mexico-guidance-financial";
import { montanaRecordFinancialApplies } from "@/lib/rcap-engine/montana-record-correction-financial";
import { caAutomaticRecordIsContext } from "@/lib/expungement-ai/ca-automatic-record-context";
import { ca12034RecordIsContext } from "@/lib/expungement-ai/ca-1203-4-record-context";
import { ca12034QuestionApplies } from "@/lib/rcap-engine/california-1203-4-facts";
import { ca12034aRecordIsContext } from "@/lib/expungement-ai/ca-1203-4a-record-context";
import { arFelonyRecordIsContext } from "@/lib/expungement-ai/ar-felony-record-context";
import { arNonconvictionRecordIsContext } from "@/lib/expungement-ai/ar-nonconviction-record-context";
import { alRecordIsContext } from "@/lib/expungement-ai/al-record-context";
import { alRedeemerClassificationContract, AL_REDEEMER_CLASSIFICATION_IDS } from "@/lib/expungement-ai/al-redeemer-classification";
import { ND_FIRST_OFFENSE_FACT_IDS } from "@/lib/rcap-engine/north-dakota-first-offense-facts";
import { akPardonRecordIsContext, akJuvenileRecordIsContext, akAgencyOrSisRecordIsContext } from "@/lib/expungement-ai/ak-pardon-record-context";
import { akCourtviewRecordIsContext, AK_LEGACY_RECORD_TYPE } from "@/lib/expungement-ai/ak-courtview-record-context";
import { dcInnocenceLocationIsContext, DC_LEGACY_LOCATION } from "@/lib/rcap-engine/dc-innocence-location-context";
import { ndFirstOffenseRecordIsContext, ND_LEGACY_RECORD_TYPE } from "@/lib/expungement-ai/nd-first-offense-record-context";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { ctAutomaticInformationContext } from "@/lib/rcap-engine/connecticut-automatic-source-guidance";
import { ctCannabisGeneralInformationContext } from "@/lib/rcap-engine/connecticut-cannabis-automatic-guidance";
import { isKsMunicipalContact } from "@/lib/expungement-ai/ks-municipal-contact";
import { maineNonconvictionQuestionApplies } from "@/lib/rcap-engine/maine-nonconviction-facts";
import { louisianaAutomationStatusQuestionApplies } from "@/lib/rcap-engine/louisiana-automation-status";
import { nebraskaNonconvictionQuestionApplies } from "@/lib/rcap-engine/nebraska-nonconviction-facts";
import { georgiaPardonCategoryIsContext } from "@/lib/expungement-ai/ga-pardon-category-context";
import { fullSsnLastFour } from "@/lib/expungement-ai/sensitive-packet-facts";
import { answerValueIsKnown, uncertaintyState, isCalendarDate, questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { PacketSpecificationFact, RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";

/**
 * The collection-policy layer: what a packet needs, and how each of those facts
 * is actually obtained.
 *
 * A packet specification states what the finished packet and filing workflow
 * must know. It does not state which of those facts deserves its own
 * participant prompt. `packetInformationModelFor` used to treat the two as the
 * same thing — every unresolved required input became one mandatory sequential
 * question — and the Mississippi non-conviction route rendered 54 of them.
 *
 * Nothing here weakens a specification. Every required fact still has a
 * disposition; this module only decides which of `already known`, `derived`,
 * `prepay confirmation`, `render required`, `conditional`, `filing readiness`
 * and `external actor` that disposition is. A fact with no defensible
 * disposition is reported as unresolved rather than quietly dropped, and a
 * route whose legal authority cannot be read at all is a hard blocker.
 *
 * The classification is derived from authority that already exists in this
 * repository — the specification's own `fieldOwnership` and per-fact `use`
 * statements, the profile's question lifecycle, and the evaluator's own
 * route-relevant fact set. It introduces no new legal content and asks no new
 * legal question.
 */

export const PACKET_COLLECTION_CLASSES = [
  "already_known",
  "derived",
  "prepay_confirmation",
  "render_required",
  "conditional",
  "filing_readiness",
  "external_actor",
  "unresolved"
] as const;
export type PacketCollectionClass = (typeof PACKET_COLLECTION_CLASSES)[number];

/**
 * When the fact is obtained, which is a different question from who owns it.
 * `prepay_confirmation` is the only phase that may stand between a participant
 * and Checkout.
 */
export const PACKET_COLLECTION_PHASES = [
  "known",
  "derived",
  "prepay_confirmation",
  "render",
  "filing",
  "external"
] as const;
export type PacketCollectionPhase = (typeof PACKET_COLLECTION_PHASES)[number];

export type PacketCollectionSectionId =
  | "about_you"
  | "your_case"
  | "court_and_case_number"
  | "outcome_and_dates"
  | "sentence_or_program_completion"
  | "financial_obligations"
  | "other_cases_and_prior_relief"
  | "required_documents"
  | "filing_details";

/**
 * The packet-information sections, named by the Product Contract.
 *
 * docs/PRODUCT_CONTRACT.md Stage 6 states them exactly:
 *
 *   About you - Your case - Court and case number - Outcome and dates -
 *   Sentence or program completion - Financial obligations - Other cases and
 *   prior relief - Required documents - Filing details
 *
 * They are not a grouping invented for this correction, and they are not
 * negotiable: AGENTS.md makes the contract the authority for product
 * behaviour, and where an implementation and the contract disagree the
 * implementation is the defect.
 *
 * Note where "Required documents" and "Filing details" sit — inside Stage 6,
 * ahead of the Stage 8 verification and the Stage 9 payment. Filing-readiness
 * facts belong in packet information, before Checkout. Moving them past
 * payment would contradict the contract, not merely the current implementation.
 *
 * Every fact keeps its own control, its own id and its own stored value.
 * Nothing here merges two legally distinct facts.
 *
 * The Spanish heading lives beside the English one so a section cannot ship
 * without its translation.
 */
export const PACKET_COLLECTION_SECTIONS: ReadonlyArray<{
  id: PacketCollectionSectionId;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
}> = [
  {
    id: "about_you",
    heading: "About you",
    description: "Your name, identity details and contact information, as the record and the court use them.",
    translations: {
      es: {
        heading: "Sobre usted",
        description: "Su nombre, datos de identidad e información de contacto, tal como los usan el expediente y el tribunal."
      }
    }
  },
  {
    id: "your_case",
    heading: "Your case",
    description: "What the record says about the charge and the arrest.",
    translations: {
      es: {
        heading: "Su caso",
        description: "Lo que el expediente dice sobre el cargo y el arresto."
      }
    }
  },
  {
    id: "court_and_case_number",
    heading: "Court and case number",
    description: "The court that handled the case and how the case is identified.",
    translations: {
      es: {
        heading: "Tribunal y número de caso",
        description: "El tribunal que atendió el caso y cómo se identifica el caso."
      }
    }
  },
  {
    id: "outcome_and_dates",
    heading: "Outcome and dates",
    description: "How the case ended, in the words the certified record uses.",
    translations: {
      es: {
        heading: "Resultado y fechas",
        description: "Cómo terminó el caso, con las palabras que usa el expediente certificado."
      }
    }
  },
  {
    id: "sentence_or_program_completion",
    heading: "Sentence or program completion",
    description: "Whether everything the court ordered is finished.",
    translations: {
      es: {
        heading: "Cumplimiento de la sentencia o del programa",
        description: "Si está terminado todo lo que ordenó el tribunal."
      }
    }
  },
  {
    id: "financial_obligations",
    heading: "Financial obligations",
    description: "Payments, remaining balances and any court orders changing financial requirements.",
    translations: {
      es: {
        heading: "Obligaciones económicas",
        description: "Pagos, saldos pendientes y cualquier orden judicial que modifique los requisitos económicos."
      }
    }
  },
  {
    id: "other_cases_and_prior_relief",
    heading: "Other cases and prior relief",
    description: "Anything else on your record that changes which relief this packet asks for.",
    translations: {
      es: {
        heading: "Otros casos y recursos anteriores",
        description: "Cualquier otra cosa en su expediente que cambie qué recurso pide este paquete."
      }
    }
  },
  {
    id: "required_documents",
    heading: "Required documents",
    description: "The records that go with the packet, and who else keeps a copy.",
    translations: {
      es: {
        heading: "Documentos requeridos",
        description: "Los expedientes que acompañan al paquete y quién más conserva una copia."
      }
    }
  },
  {
    id: "filing_details",
    heading: "Filing details",
    description: "Who receives a copy, and anything the court asked you to do a particular way.",
    translations: {
      es: {
        heading: "Detalles para presentar",
        description: "Quién recibe una copia y todo lo que el tribunal le pidió hacer de una manera determinada."
      }
    }
  }
];

/**
 * The section statuses the contract requires, in Stage 6: "Each section shows
 * one of: Not started - In progress - Complete - Needs attention."
 */
export const PACKET_SECTION_STATUSES = ["not_started", "in_progress", "complete", "needs_attention"] as const;
export type PacketSectionStatus = (typeof PACKET_SECTION_STATUSES)[number];

export type ResolvedPacketFact = {
  factId: string;
  /** Source purpose only; never overrides classification, requiredness or authority. */
  sourcePurpose?: MdJuvenileCountySourcePurpose;
  collection: PacketCollectionClass;
  phase: PacketCollectionPhase;
  /** The participant section this fact is asked in, where it is asked at all. */
  group: PacketCollectionSectionId | null;
  /** Where the value comes from, or who owns it. Never a guess. */
  source: string;
  /** Present for `already_known` and `derived` only. */
  value?: AnswerValue;
  /** A planned derivation is not a usable output or a second participant prompt. */
  derivation?: { state: "pending" | "valid"; inputFactIds: string[] };
  /** A retained independent answer needs one informed replacement, not a silent merge. */
  reconciliation?: "contact_components";
  /** Present for `external_actor` only: the actor who fills this field, later. */
  actor?: string;
  /** Source permits an unknown participant value without blocking generation. */
  optional?: true;
  /** Present for `conditional`: the fact that decides whether this is asked. */
  condition?: { factId: string; satisfiedWhen: "affirmative" | "equals"; value?: string };
  /** For a conditional fact, whether the condition currently makes it relevant. */
  active?: boolean;
  /** Why this fact landed in this class. Carried into the audit artifact. */
  reason: string;
};

export type PacketCollectionSection = {
  id: PacketCollectionSectionId;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
  factIds: string[];
};

export type PacketCollectionResolution = {
  routeKey: string;
  jurisdiction: string;
  pathwayId: string | null;
  /** Every required fact, exactly once. The zero-fact-loss invariant is read off this. */
  facts: ResolvedPacketFact[];
  knownFacts: Record<string, AnswerValue>;
  derivedFacts: Record<string, AnswerValue>;
  prepayQuestions: string[];
  renderQuestions: string[];
  groupedParticipantSections: PacketCollectionSection[];
  conditionalQuestions: Array<{ factId: string; condition: { factId: string; satisfiedWhen: "affirmative" | "equals"; value?: string }; active: boolean }>;
  filingReadinessItems: string[];
  externalActorFields: Array<{ factId: string; actor: string }>;
  unresolvedRequiredFacts: string[];
  pendingDerivations: Array<{ factId: string; inputFactIds: string[] }>;
  contactReconciliation?: { canUseComponents: boolean };
  hardBlockers: Array<{ factId: string; reason: string }>;
};

export type PacketCollectionInput = {
  mdJuvenileCountySourcePurpose?: MdJuvenileCountySourcePurpose;
  jurisdiction: string;
  pathwayId: string | null;
  requiredInputIds: string[];
  /** Route facts the server owns outright. */
  serverFacts: Record<string, AnswerValue>;
  /** The participant's own screening answers, by their screening ids. */
  screeningAnswers: Record<string, AnswerValue>;
  /**
   * Values already carried forward or computed for this matter and stored as
   * prefilled. These are NOT the participant's own builder entries, so they
   * retire a question exactly as a screening answer does.
   */
  prefilledAnswers?: Record<string, AnswerValue>;
  /**
   * The participant's own saved builder answers. They inform derivations and
   * conditions but never retire a question: answering something is not a
   * reason to stop showing it.
   */
  savedAnswers?: Record<string, AnswerValue>;
  /** Account/profile facts the participant has already given elsewhere. */
  profileFacts?: Record<string, AnswerValue>;
  /** Operational input contracts; invalid nonempty values cannot retire a control. */
  questionById?: ReadonlyMap<string, ProfileQuestion>;
  /** The registered packet specification for this route, where one exists. */
  specification?: RegisteredSpecification | null;
  /** Fact ids the evaluator or a route-safety gate actually reads for this route. */
  routeDecidingFactIds?: ReadonlySet<string>;
  /** Rule fields whose route ownership cannot be established; never waive them. */
  unresolvedRouteFactIds?: ReadonlySet<string>;
  /** Existing evaluator/ambiguity inputs protected against newly synthesized values. */
  materializationProtectedFactIds?: ReadonlySet<string>;
  /**
   * Facts the accepted baseline already materialised without asking.
   *
   * This exists to make route drift impossible by construction. A value this
   * layer writes into `prefilledAnswers` is read back by the authoritative
   * re-evaluation, so synthesising a fact the evaluator consumes could change
   * the route, the result code or payment authority — which the correction is
   * required not to do. A fact the evaluator reads is therefore only ever
   * materialised when the participant answered it under that same id (the
   * evaluator already had it, so nothing changes) or when the accepted
   * baseline already carried it. Anything else is asked.
   */
  baselineCarriedFactIds?: ReadonlySet<string>;
  /** Original record controls whose meanings cannot safely be inferred from another fact. */
  recordOwnQuestionIds?: ReadonlySet<string>;
  /** An incompatible protected answer exists; absence in its safe projection is not permission to infer a replacement. */
  unresolvedSavedFactIds?: ReadonlySet<string>;
  /** Set only by the exact reviewed route/specification/consumer predicate. */
  reviewedContactRepresentation?: boolean;
  /** Server-checked exact JD-CR-202 profile; does not change any legal predicate. */
  ctCleanSlateSeparateContact?: boolean;
  ksMunicipalSeparateContact?: boolean;
  /** Exact current ND profile/source family; historical service/caption prose is not a canonical fact. */
  ndFirstOffenseSourceOwnedInputs?: boolean;
  /** Active legal corrections; the identical filing slots remain source handbacks. */
  ndFirstOffenseStatutoryFactIds?: ReadonlySet<string>;
  /** Set only by the exact adopted MO status/source contract, never participant data. */
  missouriClosureStatusOnly?: boolean;
  missouriMarijuanaStatusOnly?: boolean;
  montanaDeferredFinancialFacts?: boolean;
  /** Per-route corrections, used only where the generic policy cannot be right. */
  override?: RouteCollectionOverride | null;
};

/**
 * A per-route correction. It may move a fact between classes and it may declare
 * a condition; it may never remove a fact, which is why there is no shape here
 * that could express removal.
 */
export type RouteCollectionOverride = {
  routeKey: string;
  note: string;
  classes?: Record<string, PacketCollectionClass>;
  groups?: Record<string, PacketCollectionSectionId>;
  conditions?: Record<string, string>;
  conditionValues?: Record<string, string>;
  /** Facts a human must classify. They resolve as `unresolved`, never as asked-by-default. */
  needsHumanClassification?: string[];
};

// ---------------------------------------------------------------------------
// Generic policy. Everything below is keyed on identities and on statements the
// specification already makes; none of it is per-state.
// ---------------------------------------------------------------------------

/**
 * Sections by fact identity. A fact matches the first pattern that accepts it,
 * so the order is the specificity order, not an alphabetical one.
 */
/**
 * Which contract section a fact belongs to, by the fact's own identity. The
 * first pattern that accepts a fact wins, so the order is specificity order.
 */
const SECTION_RULES: ReadonlyArray<{ section: PacketCollectionSectionId; test: RegExp }> = [
  { section: "about_you", test: /^mcic_identifier_(delivery_method|method_confirmation_source)$/ },
  { section: "required_documents", test: /exhibit|attachment|certified|docket_sheet|recordkeeping|record_source|criminal_history/ },
  { section: "filing_details", test: /prosecut|service_address|service_method|_service_|identifier_delivery|_delivery_method|identifier_method|personal_impact|filing_fee|fee_waiver|narrative|hardship/ },
  { section: "financial_obligations", test: /financial_obligation|restitution|fines|fees_paid|costs_paid/ },
  { section: "sentence_or_program_completion", test: /sentence_completion|program_completion|probation|parole|supervision|discharge_date|nonadjudication|diversion|court_requirements/ },
  { section: "other_cases_and_prior_relief", test: /pending_cases|prior_relief|co_defendant|new_convictions|eligible_conviction|pardon|exclusion|traffick|special_preconditions/ },
  { section: "outcome_and_dates", test: /disposition|case_outcome|outcome|acquit|dismiss|conviction_date|last_conviction/ },
  { section: "court_and_case_number", test: /court|county|case_number|case_caption|filing_location|jurisdiction|docket|cause|waiting_rule/ },
  { section: "your_case", test: /charge|offense|record_type|arrest|release|agency_case_number|arresting/ },
  { section: "about_you", test: /name|alias|date_of_birth|dob|race|sex|gender|social_security|^age_|identity|address|phone|email|contact|residenc|mailing/ }
];

/**
 * Facts whose NAME suggests a readiness state of an external record or office
 * rather than information the participant simply knows.
 *
 * A guess from the shape of an identifier, and it yields to the specification.
 * Where the specification states what a fact is FOR, that statement decides the
 * class and this pattern is not consulted: `service_details` reads like a
 * readiness state and is the prosecutor and DCI identity, addresses, dates and
 * manners of service printed on Wyoming's service page;
 * `certified_disposition_exhibit_status` reads like one and is what makes
 * Mississippi's verified petition able to say "A certified copy of the
 * disposition is attached as Exhibit A" truthfully. Naming a fact after a
 * status does not move it out of the document.
 */
const FILING_READINESS_IDENTITY = /_exhibit_status$|^certified_|_confirmation_status$|_confirmation_source$|_delivery_method$|^service_|_service_address$|^other_recordkeeping_agencies$|^filing_fee|^fee_waiver/;

/** Statements a specification makes about a fact that decide its class outright. */
const USE_RULES: ReadonlyArray<{ collection: PacketCollectionClass; test: RegExp; reason: string }> = [
  {
    collection: "filing_readiness",
    // NOT "before filing". That phrase appears in a `use` statement as an
    // instruction about WHEN the participant should check a value — "charge
    // wording copied from the court record before filing", "how each recipient
    // was actually served ... confirmed with the clerk before filing" — and
    // says nothing about whether the document needs it. Reading it as a class
    // signal put thirteen facts that the renderer refuses to compose without
    // into the filing-readiness class, which is the one class that claims a
    // fact is NOT needed to produce the packet.
    //
    // NOT the MCIC identifier-channel phrases either. The delivery method and
    // its confirmation source decide what the confidential MCIC processing
    // addendum IS and which channel carries a full Social Security number, so
    // the packet cannot be produced without them. They are render facts that
    // happen to be confirmed with the court, which is a different thing from a
    // record the participant fetches.
    test: /filing-readiness gate|assembly and filing|prevents an unverified/,
    reason: "the specification describes this fact as a filing-readiness state"
  },
  {
    collection: "prepay_confirmation",
    test: /route-safety|statutory eligibility gate|eligibility gate|detect ambiguous/,
    reason: "the specification describes this fact as a route-safety or eligibility gate"
  },
  {
    collection: "conditional",
    test: /optional |included only after|controls the optional/,
    reason: "the specification describes this fact as conditional on another answer"
  }
];

/**
 * Derivations. Each names the facts it reads and the function that normalises
 * them. A derivation runs only when every fact it reads is known, and it never
 * invents a value: where the inputs do not determine the output it returns
 * null and the fact stays a question.
 */
type Derivation = { from: string[]; derive: (values: Record<string, string>) => string | null };

/** The reviewed graph reads leaf facts only. Reject new chains/cycles before any value can be trusted. */
export function assertLeafPacketDerivationGraph(graph: Readonly<Record<string, { from: readonly string[] }>>): void {
  for (const [factId, rule] of Object.entries(graph)) {
    if (rule.from.some((inputId) => Object.prototype.hasOwnProperty.call(graph, inputId))) {
      throw new Error(`packet_derivation_contract_requires_review:${factId}`);
    }
  }
}

// GA-12: the three source-bound CT information consumers establish no personal
// erasure eligibility. Their inherited category remains literal saved history.
export function ctInformationCategoryIsHistory(
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined,
  answers: Record<string, unknown>, unresolvedSavedFactIds: readonly string[] = []
): boolean {
  if (!profile || profile.jurisdiction.code !== "CT" || !pathwayId || specification
    || profile.questions.some(question => question.id === "offense_category")) return false;
  const context = Object.fromEntries(["ownership_scope", "jurisdiction_scope", "case_outcome", "offense_level"]
    .map(id => [id, unresolvedSavedFactIds.includes(id) || !answerValueIsKnown(answers[id]) ? "" : scalarAnswerText(answers[id]) ?? ""]));
  return ctAutomaticInformationContext(profile, pathwayId, context) !== null
    || ctCannabisGeneralInformationContext(profile, pathwayId, context);
}

// GA-12 / Q-b5cb31d59f48190f9e12: the retained §16-803 consumer uses
// actual_innocence_basis and exact charge/level facts, not an offense category.
// Pin the complete reviewed profile/specification: new consumers fail closed.
export function dcInnocenceCategoryIsHistory(
  profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined
): boolean {
  return profile?.jurisdiction.code === "DC" && pathwayId === "dc_actual_innocence_expungement_16_803"
    && specification?.routeKey === `DC:${pathwayId}`
    && contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830"
    && contactRepresentationHash(specification) === "e996552f778a29335da79c309cf319b8fcd4560a47c6db15b4a77a454372dc83";
}

// GA-12 / Q-c1c8e2c369e81fbe1caf: LD-IL-04 identity correction uses
// the report/mismatched identifiers and arrest circuit, not generic categories.
export function ilIdentityCategoryIsHistory(
  profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined
): boolean {
  return profile?.jurisdiction.code === "IL" && pathwayId === "criminal-identity-theft-mistaken-identity-relief"
    && specification?.routeKey === `IL:${pathwayId}`
    && contactRepresentationHash(profile) === "b16978a1748ee80363763340a864f5ea8a2a5160bb8f76093440c02beda70afd"
    && contactRepresentationHash(specification) === "e2407963972350e6bca336f1efd55d1e26a2eb51055f8f3cb4c6696ecd474c2b";
}

// GA-12 / Q-02b21081ef9ffebfc474 and Q-59616e6bc8916f7a961f:
// the distinct lower-court branches use conviction lists and last-conviction
// facts; their registered shared specification has no category consumer.
export function msAdditionalCategoryIsHistory(
  profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined
): boolean {
  return profile?.jurisdiction.code === "MS" && (
    pathwayId === "additional-justice-court-misdemeanor-relief-9-11-15-3"
    || pathwayId === "additional-municipal-court-misdemeanor-relief-21-23-7-6")
    && specification?.routeKey === "MS:additional-justice-court-misdemeanor-relief-9-11-15-3"
    && contactRepresentationHash(profile) === "da85c0c5994978a437454ef5d4d4f039c317ce619742d842751446d39e79178f"
    && contactRepresentationHash(specification) === "a2a384540b85d58b1033d01e2edf782b951603dec0a0509302b15f1182895c7e";
}

// Exact reviewed category consumer scope; a new source/specification needs review.
export function gaSb288CategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return georgiaSb288Context(profile, pathwayId)
    && specification?.routeKey === `GA:${pathwayId}`
    && contactRepresentationHash(profile) === "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef"
    && contactRepresentationHash(specification) === "7a568c20fa4099ee03bceb3cafd31b306e534d0a3b306c37afb1bb72a65c8ec3";
}

// GA-12 Q-d33e933319baaaaf750b: category history only for the reviewed CT consumer.
export function ctPetitionCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return ctPetitionContext(profile, pathwayId)
    && specification?.routeKey === `CT:${pathwayId}`
    && contactRepresentationHash(profile) === "7a0dadd32497d4be04bfad21e8ee8cf3b735168a84a3cd5baf70dcd7039f348c"
    && contactRepresentationHash(specification) === "63847c550055ffc14860252999bba536044b66e3de120f4db638815da928a7f8";
}

// GA-12 Q-f739580167b3303bcdcf / QD-bd6b15fff22cbe1501cb: exact adopted program consumer.
export function nvProgramCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "NV" && `NV:${pathwayId}` === NEVADA_176A_ROUTE_KEY
    && specification?.routeKey === NEVADA_176A_ROUTE_KEY
    && contactRepresentationHash(profile) === "964eecfe7a5c3ffd4bae54636520141ff20d25c904401b4eab6941de5d3dd651"
    && contactRepresentationHash(specification) === "94ed0589dab1e02886759605f2eac2afd4baf7bb3f0a1f6d4f18fcb24603182c";
}

// GA-12 Q-3ab8bb479903ec6dc680: retain broad categories without classifying the final conviction.
export function ilProstitutionCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return illinoisProstitutionContext(profile, pathwayId)
    && specification?.routeKey === `IL:${pathwayId}`
    && contactRepresentationHash(profile) === "b16978a1748ee80363763340a864f5ea8a2a5160bb8f76093440c02beda70afd"
    && contactRepresentationHash(specification) === "57a02cd4a796ba6f76f15dcb54b72d57ef89260e89d4b8e55178b096f244af66";
}

// GA-12 Q-cde3ef0a5bed58e60545: category text cannot establish SIS or the separate drug track.
export function sdSisCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return southDakotaSisContext(profile, pathwayId) && specification?.routeKey === `SD:${pathwayId}`
    && contactRepresentationHash(profile) === "a1d4f1e781a618726d83137b3905ec17ab394dbc31f94aee23273746ec8331c1"
    && contactRepresentationHash(specification) === "7a6064a51c32017d01888cce0e439f3f3d7fe946bdaac5900a866319dee4e2df";
}

// GA-12 Q-51b8ea53b02426f2f685: final citations and distinct 1502 facts replace category inference.
export function wy1502CategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): boolean {
  return wy1502Context(profile, pathwayId) && specification?.routeKey === `WY:${pathwayId}`
    && contactRepresentationHash(profile) === "6cacd0640d00892a2779a57d824e1da655ae9cb6c71293b3869e5799b6f00804"
    && contactRepresentationHash(specification) === "4c0c72b00eaa4af52be06af1b674ee67c2d4995907fdacd44b6f78dc23a691af";
}

// GA-17 Q-4466b7cd2b8cfb099728: compiled metadata does not authorize an exclusive record taxonomy.
export function caTool3RecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "CA" && pathwayId === "tool-3-petition-based-felony-sealing"
    && specification == null && contactRepresentationHash(profile) === "754b7bb08f3b9010549c686c1571eeeb850afc8ac256cf28b20f25a1c6ef4a0f";
}

// GA-17 Q-a5553f6ecf41c327337e: compiled metadata does not authorize an exclusive record taxonomy.
export function caTool4RecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "CA" && pathwayId === "tool-4-arrest-record-sealing"
    && specification == null && contactRepresentationHash(profile) === "754b7bb08f3b9010549c686c1571eeeb850afc8ac256cf28b20f25a1c6ef4a0f";
}

// GA-17 Q-b2e5abdea1cd7427e7ac / Q-34595b6432c5e669f38b: overlapping labels are not a disposition.
export function coPetitionRecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "CO"
    && (pathwayId === "petition-based-conviction-sealing-jdf-612-24-72-706"
      || pathwayId === "petition-based-non-conviction-sealing-jdf-417-24-72-704")
    && specification == null && contactRepresentationHash(profile) === "1e74ae18e3815426ae28001f741a954826a985d08164d8ab77820cda0d90d909";
}

// GA-17 Q-3c3fc0993c643dd02cf7: overlapping history cannot classify this unsupported petition route.
export function dcFelonyRecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "DC" && pathwayId === "dc_motion_seal_felony_conviction_8yr_16_806"
    && specification == null && contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830";
}

// GA12/GA17: exact source-bound consumers keep generic labels as literal history.
export function okCategoryAndRecordAreHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "OK" && [
    "acquittal-dismissal-or-other-no-conviction-expungement", // GA12 Q-7c344b62b8005b8c0856 / GA17 Q-1af92bac0be9e8f1d3c1
    "arrest-with-no-charges-filed", // GA12 Q-64ac71408f9198d6c6bb / GA17 Q-c2eae6c2aea996936af8
    "conviction-reversed-and-case-dismissed", // GA12 Q-44758205328791de54b2 / GA17 Q-b2307423d9b47d9a1af7
    "deferred-sentence-court-record-expungement-under-991-c", // GA12 Q-c7f7c05e9424141d43d5 / GA17 Q-bd410275cf3de6c271db
    "dna-factual-innocence-expungement", // GA12 Q-3e40c600977518a9ad95 / GA17 Q-694560c7c95fb47ca5ac
    "felony-reclassified-as-a-misdemeanor", // GA12 Q-d3ad0203b6c3121ae86e / GA17 Q-606eea91d3a3a9d1820d
    "fine-only-misdemeanor-conviction-expungement", // GA12 Q-5733847ce93786556162 / GA17 Q-4932a2b1edb791de2454
    "human-trafficking-survivor-relief", // GA12 Q-c54f700a248b3499c184 / GA17 Q-82571d80cc42abd806af
    "juvenile-record-expungement", // GA12 Q-ef76f429778c93c43b10 / GA17 Q-b1d0bc75d75f9113d995
    "misdemeanor-deferred-dismissal-expungement", // GA12 Q-bdf0e7619ddfad13d1b8 / GA17 Q-572c0c7e28831927a19a
    "nonviolent-felony-deferred-dismissal-expungement", // GA12 Q-41b39b9d0aa40bacd744 / GA17 Q-77a18d8e1ed50ccabe51
    "not-more-than-two-eligible-felony-convictions-expungement", // GA12 Q-7e9846761b731ed1bd35 / GA17 Q-5036cbc1e622a9444933
    "one-eligible-nonviolent-felony-conviction-expungement", // GA12 Q-1b4a5930987a37b89ca1 / GA17 Q-302b485d17fcef854e84
    "other-eligible-misdemeanor-conviction-expungement", // GA12 Q-c0893100ce168c61ea41 / GA17 Q-88799b7d454677674402
    "pardon-based-expungement", // GA12 Q-fba22f7979e46d7aa914 / GA17 Q-ea6b30056ceb463744bb
    "up-to-two-felony-deferred-dismissal-expungement", // GA12 Q-d61d0fbc71aad09c6bb0 / GA17 Q-5abc61f83ae56e7779f7
    "victim-protective-order-record-relief", // GA12 Q-cf5ae343b7ff13b09400 / GA17 Q-69fdf8d958deae680d72
  ].includes(pathwayId ?? "") && specification == null
    && contactRepresentationHash(profile) === "d0c3f020cc38d939c56585e3f03227b08e865f4fa56377fddd71d0e7359a76c9";
}

// GA12/GA17 R1: per-state exact source-bound consumers, pinned to the profile hash, one route list per finding. Earlier
// offense_category / record_type answers stay optional literal history; they never select a route, classify an offense or
// change a payment decision.
const R1_SOURCE_BOUND_HISTORY: Readonly<Record<string, { profileHash: string; categoryReason: string;
  category: readonly string[]; record: readonly string[] }>> = {
  UT: {
    profileHash: "bd35a941b0354dd73ca8ca57741a5afc5da7824dd66571d97abb6ff45534ee49",
    categoryReason: "Earlier Utah categories remain optional literal history. Offense-type facts are asked through separate answers, including the charge-and-statute, offense-class, domestic-violence/assault/sex-related and traffic-rule answers; a category is not evaluated as one, and the route's existing result and payment decision are unchanged.",
    category: [
      "path-a-automatic-clean-slate-expungement", // GA12 Q-252e5eaceeb14868ecfd
      "path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice", // GA12 Q-fa8ce3d47b028a9a9297
      "path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals", // GA12 Q-2333bc4d3b484d36fdbc
      "path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility", // GA12 Q-e9f3971de039d6458dcc
      "path-e-petition-based-non-conviction-expungement", // GA12 Q-cf0b883c11fa0a6f2fc3
      "path-f-petition-based-conviction-expungement", // GA12 Q-650fb69353356a405ac7
      "path-i-traffic-offense-expungement-or-deletion", // GA12 Q-6f5514279e5ffa50cb3e
      "path-j-cannabis-possession-petition-without-a-bci-certificate", // GA12 Q-313866182a1e4777029e
      "path-k-pardon-based-expungement", // GA12 Q-906056c11b74201b4da6
      "path-l-vacatur-human-trafficking-related-expungement", // GA12 Q-d9d380005932a99444a6
      "path-m-juvenile-expungement", // GA12 Q-2fe99c51c62078f670e8
    ],
    record: [
      "path-a-automatic-clean-slate-expungement", // GA17 Q-5e88cc7ea97bd8745c1f
      "path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice", // GA17 Q-3784a90b21f601fc7637
      "path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals", // GA17 Q-24585f480025fdf4a4cb
      "path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility", // GA17 Q-d8cf948f1c17c4bffa64
      "path-e-petition-based-non-conviction-expungement", // GA17 Q-ef44181a41b9119ee4e6
      "path-f-petition-based-conviction-expungement", // GA17 Q-8ab80724ffff8845f3bd
      "path-i-traffic-offense-expungement-or-deletion", // GA17 Q-a3934d2a19074726f573
      "path-j-cannabis-possession-petition-without-a-bci-certificate", // GA17 Q-bd3410d058530b0a0f26
      "path-k-pardon-based-expungement", // GA17 Q-958937ed725e4ea87169
      "path-l-vacatur-human-trafficking-related-expungement", // GA17 Q-53b2acc2f8354df04528
      "path-m-juvenile-expungement", // GA17 Q-2ef0ec2a33a7e70da1e7
    ],
  },
  PA: {
    profileHash: "9691756c4a25ce87afb297bd809fb5dd5c39cce33ebfdcb85d9e9afb0662d12e",
    categoryReason: "Earlier Pennsylvania categories remain optional literal history. Offense-type facts are asked through separate answers, including the charge-and-statute answer and the charge-type check; a category is not evaluated as one, and the route stays guidance only or needs review, unpaid.",
    category: [
      "path-a-non-conviction-expungement", // GA12 Q-6303976ad4b8ae1e924f
      "path-b-complete-acquittal-not-guilty-expungement", // GA12 Q-bbf51562519786068cc5
      "path-c-summary-conviction-expungement", // GA12 Q-ebfada9e873528bccd38
      "path-d-ard-expungement", // GA12 Q-f82ac89b0b9cd5a6f0b0
      "path-e-age-70-expungement", // GA12 Q-ad80963961e658f9a1e4
      "path-f-deceased-person-expungement", // GA12 Q-a106d2f89ee5932928db
      "path-g-underage-drinking-conviction-expungement", // GA12 Q-7f0b7762d5aeefdbac2b
      "path-h-pardon-based-expungement", // GA12 Q-7731018f38b0d5c7398e
      "path-i-petition-for-limited-access", // GA12 Q-bcbdcf2105073c71d90d
      "path-j-clean-slate-automatic-limited-access", // GA12 Q-3b3c3e699bffa01de277
      "path-k-human-trafficking-vacatur-expungement", // GA12 Q-d4df0578591f1bba6c6c
    ],
    record: [
      "path-a-non-conviction-expungement", // GA17 Q-5164c6e021bfd0897e7a
      "path-b-complete-acquittal-not-guilty-expungement", // GA17 Q-e770b2de507acec4924c
      "path-c-summary-conviction-expungement", // GA17 Q-0ebc9cb4212495acdc33
      "path-d-ard-expungement", // GA17 Q-c28384c7cb8b3f5bf23f
      "path-e-age-70-expungement", // GA17 Q-9aed0f34c9788d7a3f09
      "path-f-deceased-person-expungement", // GA17 Q-26bf101779eb24857f29
      "path-g-underage-drinking-conviction-expungement", // GA17 Q-f99c455f93cd674c4b2a
      "path-h-pardon-based-expungement", // GA17 Q-14a06d05525bfd19ea98
      "path-i-petition-for-limited-access", // GA17 Q-1d329de7345b39063b5e
      "path-j-clean-slate-automatic-limited-access", // GA17 Q-79a7e977aac71c792fae
      "path-k-human-trafficking-vacatur-expungement", // GA17 Q-afd2b456ce01f7e7429e
    ],
  },
  LA: {
    profileHash: "a0bf1a76b91c555e5b0cca05b96d6b9a34721db466c7beffdc20fbd86f1e36e6",
    categoryReason: "Earlier Louisiana categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "felony-article-893-e-set-aside-followed-by-expungement", // GA12 Q-b30729ed956e8d23062e
      "felony-ten-year-clean-period-expungement", // GA12 Q-b233741a48310919da10
      "first-offender-pardon-felony-expungement", // GA12 Q-a2228520d97dcc903ff3
      "first-offense-marijuana-expungement-after-90-days-art-998", // GA12 Q-028a5d4a6e578c29a060
      "human-trafficking-survivor-expungement-fee-exempt-route", // GA12 Q-1f0e7d0488d670e692cd
      "immediate-expungement-after-successful-court-program-completion-art-985-3", // GA12 Q-22065414a244c656a67f
      "interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction", // GA12 Q-7500ec895a5603e69c15
      "misdemeanor-article-894-b-set-aside-followed-by-expungement", // GA12 Q-c2f2a4248850b31ea8ca
      "misdemeanor-five-year-clean-period-expungement", // GA12 Q-8063c22833109ea3d94e
    ],
    record: [
      "felony-article-893-e-set-aside-followed-by-expungement", // GA17 Q-4d1424ca5f2137df7aa0
      "felony-ten-year-clean-period-expungement", // GA17 Q-5f8172fac27c22dd9f75
      "first-offender-pardon-felony-expungement", // GA17 Q-abcb2d7a03cf6b8b18a2
      "first-offense-marijuana-expungement-after-90-days-art-998", // GA17 Q-94f70a6bc5afb8db8b2e
      "human-trafficking-survivor-expungement-fee-exempt-route", // GA17 Q-ffc39f9d7d89d27baba6
      "immediate-expungement-after-successful-court-program-completion-art-985-3", // GA17 Q-836fc9f1ee674d99ab75
      "interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction", // GA17 Q-695fc1058b1ca3cd5828
      "misdemeanor-article-894-b-set-aside-followed-by-expungement", // GA17 Q-ee9e78ee9b492f5731fa
      "misdemeanor-five-year-clean-period-expungement", // GA17 Q-c3d27d726a5efb8a9e60
    ],
  },
  TX: {
    profileHash: "cbe146b80419cf03a0c7f7edd62da33f59177cea243dc9fd2b1e516d548dc49a",
    categoryReason: "Earlier Texas categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07", // GA12 Q-97bc2a5f998b912adda8
      "expunction-after-pardon-or-actual-innocence-relief", // GA12 Q-ece677b818ab583b0a14
      "expunction-for-arrest-with-no-charge-filed-after-the-limitations-period", // GA12 Q-b8b91c5dff89cb0adb64
      "first-offense-dwi-nondisclosure", // GA12 Q-7b044f8b2d70a8798aca
      "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725", // GA12 Q-ecdc2323b7eb7e9089ba
      "petitioned-nondisclosure-for-an-eligible-conviction-411-0735", // GA12 Q-2e0fbd26cd239ff0d6e4
    ],
    record: [
      "automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07", // GA17 Q-824a1ba5bd22b494dfa1
      "expunction-after-pardon-or-actual-innocence-relief", // GA17 Q-c51c4a1d5b7aa734511a
      "expunction-for-arrest-with-no-charge-filed-after-the-limitations-period", // GA17 Q-8d122cfbc96cf12d60cb
      "first-offense-dwi-nondisclosure", // GA17 Q-35df6f53ee29fa1c90ec
      "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725", // GA17 Q-714293c4107f4534661e
      "petitioned-nondisclosure-for-an-eligible-conviction-411-0735", // GA17 Q-e6978babce1a46e17b47
    ],
  },
  NE: {
    profileHash: "2ff06c3e6b7fbcf4f82df41c0c7eb9315555fc3c535dfab28fa0c53a9f7fffbb",
    categoryReason: "Earlier Nebraska categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "automatic-nonconviction-sealing", // GA12 Q-4a545ab85a94be27c95b
      "juvenile-automatic-sealing", // GA12 Q-7d6e2953ebba7db1eb72
      "juvenile-petition-backstop", // GA12 Q-d75d629d50ebb8c87426
      "law-enforcement-error-expungement", // GA12 Q-5032ace2532c76a61e7c
      "pardon-then-seal", // GA12 Q-f90e4e8ab93ba8a7096e
      "set-aside-incarceration-one-year-or-less", // GA12 Q-17df472e8ea9aa127584
      "set-aside-probation-fine-community-service", // GA12 Q-eea669c83c89361f4041
      "trafficking-survivor-set-aside-and-seal", // GA12 Q-1fd3143f4dbee8014955
    ],
    record: [
      "automatic-nonconviction-sealing", // GA17 Q-831f2f441d10e55f7960
      "juvenile-automatic-sealing", // GA17 Q-acf1a4e859aaaf8006c4
      "juvenile-petition-backstop", // GA17 Q-e093af789f1c7c7cfb0f
      "law-enforcement-error-expungement", // GA17 Q-66dcd1e23c263ba19cbc
      "pardon-then-seal", // GA17 Q-b8fdccd39b9b0190574f
      "set-aside-incarceration-one-year-or-less", // GA17 Q-5f04b326441400689e07
      "set-aside-probation-fine-community-service", // GA17 Q-d772db95899d4a74d3a0
      "trafficking-survivor-set-aside-and-seal", // GA17 Q-d641e93e73955b0b8ca2
    ],
  },
  RI: {
    profileHash: "ddb5d94750f7e7586b38f99656b486c96fbad392938b32179dbf25eb95f54a8a",
    categoryReason: "Earlier Rhode Island categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "path-a-first-offender-conviction-expungement", // GA12 Q-50cca60f5c7926124ba7
      "path-b-multiple-misdemeanor-expungement", // GA12 Q-cb04a7aa485b8e2b72d8
      "path-c-deferred-sentence-expungement", // GA12 Q-953071a0940638aa4080
      "path-d-non-conviction-sealing-expungement", // GA12 Q-f267c2dff27842604000
      "path-e-filed-complaint-relief-under-12-10-12", // GA12 Q-4eb0e509dabbd52d3833
      "path-f-marijuana-possession-expungement", // GA12 Q-6ee35861d87c035055aa
      "path-g-decriminalized-offense-expungement", // GA12 Q-6657da2a38a7cc5786a2
      "path-h-commercial-sexual-activity-related-expungement", // GA12 Q-882f1028ec5db3a1c041
    ],
    record: [
      "path-a-first-offender-conviction-expungement", // GA17 Q-b76d3d226ef90e273467
      "path-b-multiple-misdemeanor-expungement", // GA17 Q-be9c68444b00deaf3e53
      "path-c-deferred-sentence-expungement", // GA17 Q-231f7301ba7ec275311f
      "path-d-non-conviction-sealing-expungement", // GA17 Q-315bc91f871d66169b51
      "path-e-filed-complaint-relief-under-12-10-12", // GA17 Q-837bf7efc9ddfbb653af
      "path-f-marijuana-possession-expungement", // GA17 Q-e90b9851defd241b9ab1
      "path-g-decriminalized-offense-expungement", // GA17 Q-b9ef500f7b5744a20048
      "path-h-commercial-sexual-activity-related-expungement", // GA17 Q-0cf26464d2bc85c7c351
    ],
  },
  VT: {
    profileHash: "71969bc9d553a1d480853d84082cb411d322de47b1e8fb6c5a180e5c0bd61806",
    categoryReason: "Earlier Vermont categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-conviction-expungement-narrow-statutory-route", // GA12 Q-08b43436b06a0f4e805b
      "adult-felony-conviction-sealing", // GA12 Q-8d42db81cba3d83cdfc8
      "adult-misdemeanor-conviction-sealing", // GA12 Q-547a6af68b039d5a2147
      "dui-sealing", // GA12 Q-327fabab0a5a937c065b
      "juvenile-sealing", // GA12 Q-43f2d3e844b38b09b29d
      "non-conviction-sealing", // GA12 Q-91a7d389265ef74bef51
      "offense-before-age-25-sealing-under-33-v-s-a-5119-g", // GA12 Q-f1e29e900cf226e0d754
      "young-adult-sealing-for-offenses-committed-at-ages-18-21", // GA12 Q-66970ef1355d84b71232
    ],
    record: [
      "adult-conviction-expungement-narrow-statutory-route", // GA17 Q-03287db45ca3c582b999
      "adult-felony-conviction-sealing", // GA17 Q-b96f19af50622e1a38f4
      "adult-misdemeanor-conviction-sealing", // GA17 Q-5ac4b30089f77daf6cd5
      "dui-sealing", // GA17 Q-ff9eafce80b006b84c5c
      "juvenile-sealing", // GA17 Q-d38163b0b33fc71c05bc
      "non-conviction-sealing", // GA17 Q-59aa1c6c9dcbb615627a
      "offense-before-age-25-sealing-under-33-v-s-a-5119-g", // GA17 Q-ab8e14fa6d2ff40f35f4
      "young-adult-sealing-for-offenses-committed-at-ages-18-21", // GA17 Q-552b6abf121201bf126a
    ],
  },
  IL: {
    profileHash: "b16978a1748ee80363763340a864f5ea8a2a5160bb8f76093440c02beda70afd",
    categoryReason: "Earlier Illinois categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-conviction-sealing", // GA12 Q-5694f465c734a658c0e0
      "adult-non-conviction-expungement", // GA12 Q-1dd94e9fab0cba0e0454
      "cannabis-specific-automatic-or-petition-expungement", // GA12 Q-59face7f29c93d412462
      "clean-slate-automatic-sealing", // GA12 Q-59f40e6c5a862593cb34
      "expungement-after-eligible-supervision-or-qualified-probation", // GA12 Q-e875b077b30fe51dbdf1
      "human-trafficking-survivor-vacatur-and-expungement", // GA12 Q-c7f7280000e453756a1d
      "juvenile-automatic-or-petition-expungement", // GA12 Q-bd7baa2e2c96bc9547a0
    ],
    record: [
      "adult-conviction-sealing", // GA17 Q-905b302c690c688a50ef
      "adult-non-conviction-expungement", // GA17 Q-a1b55e7d832957cab52a
      "cannabis-specific-automatic-or-petition-expungement", // GA17 Q-39fc9cec1bf95bfe925e
      "clean-slate-automatic-sealing", // GA17 Q-37b8f5e80e350bcca952
      "expungement-after-eligible-supervision-or-qualified-probation", // GA17 Q-5a68c2f8e2d58b0f5222
      "human-trafficking-survivor-vacatur-and-expungement", // GA17 Q-4093022f362ef2861280
      "juvenile-automatic-or-petition-expungement", // GA17 Q-4e2e79db0f82f00c9d5a
    ],
  },
  NV: {
    profileHash: "964eecfe7a5c3ffd4bae54636520141ff20d25c904401b4eab6941de5d3dd651",
    categoryReason: "Earlier Nevada categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "controlled-substance-possession-sealing-under-nrs-453-3365", // GA12 Q-c5b04053ad25b6bdc48e
      "deferred-judgment-dismissal-and-sealing-under-nrs-176-211", // GA12 Q-d37e8d6c0c587f910f10
      "general-conviction-record-sealing-under-nrs-179-245", // GA12 Q-f64352d6d095968af4a5
      "non-conviction-record-sealing", // GA12 Q-649e80666a379d07874e
      "reentry-program-sealing-under-nrs-179-259", // GA12 Q-21a4729656d009a44472
      "removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160", // GA12 Q-f23bb2e343320420f6d4
      "trafficking-victim-vacatur-and-sealing-under-nrs-179-247", // GA12 Q-79bc94877bba645c5ce8
    ],
    record: [
      "controlled-substance-possession-sealing-under-nrs-453-3365", // GA17 Q-1db73533e210d247511c
      "deferred-judgment-dismissal-and-sealing-under-nrs-176-211", // GA17 Q-6044b0d44312184fef47
      "general-conviction-record-sealing-under-nrs-179-245", // GA17 Q-0b3068e00a728e8e9b5f
      "non-conviction-record-sealing", // GA17 Q-1c93db2c1e3b044f4da9
      "reentry-program-sealing-under-nrs-179-259", // GA17 Q-7fa963ef89606c0195de
      "removal-of-a-record-from-the-central-repository-after-a-favourable-disposition-under-179a-160", // GA17 Q-3eeb7101599cd4ef082d
      "trafficking-victim-vacatur-and-sealing-under-nrs-179-247", // GA17 Q-48f6f067fc1af171781c
    ],
  },
  OH: {
    profileHash: "10d16893413374ee1d2e37059f4d17ec1f15e8cd2329d5d22096396c142e9f68",
    categoryReason: "Earlier Ohio categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32", // GA12 Q-789e93d63ae1e416ca52
      "adult-non-conviction-sealing-or-expungement-under-2953-33", // GA12 Q-765489a449327996fbe9
      "certain-firearm-carry-conviction-expungement-under-2953-35", // GA12 Q-bb5520a0a7519366f9e1
      "human-trafficking-survivor-conviction-expungement-under-2953-36", // GA12 Q-2e36d0b5c1a1925c7c98
      "human-trafficking-survivor-non-conviction-expungement-under-2953-521", // GA12 Q-daf300450ee87dd55597
      "marijuana-hashish-possession-expungement-under-2953-321", // GA12 Q-99864a8cfd6d49f59819
    ],
    record: [
      "adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32", // GA17 Q-d4ce8aeb5628508912d2
      "adult-non-conviction-sealing-or-expungement-under-2953-33", // GA17 Q-e0332e8dc4c98130d8d9
      "certain-firearm-carry-conviction-expungement-under-2953-35", // GA17 Q-d87c7a2a4e6ba8df8a86
      "human-trafficking-survivor-conviction-expungement-under-2953-36", // GA17 Q-5d9ed4f45d2af7006e2f
      "human-trafficking-survivor-non-conviction-expungement-under-2953-521", // GA17 Q-7c86feef8f3c97e28642
      "marijuana-hashish-possession-expungement-under-2953-321", // GA17 Q-463c45ad2785b6a60935
    ],
  },
  SC: {
    profileHash: "f722ee8e20a8a3f4838ba18888efd96a1e094005bfec54c7971a2c89f8bfb97d",
    categoryReason: "Earlier South Carolina categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "diversion-or-program-completion-expungement", // GA12 Q-3628876a599f755ccb08
      "eligible-conviction-expungement", // GA12 Q-a01dc251d4bc64a25e86
      "general-sessions-non-conviction-expungement", // GA12 Q-1e95aceea3b46b97ce1b
      "human-trafficking-survivor-expungement", // GA12 Q-4e381f7c25da41b693e3
      "juvenile-expungement", // GA12 Q-66245d5d32703c1edee8
      "pardon-guidance-for-otherwise-ineligible-convictions", // GA12 Q-732e7580dcb62e76f411
      "summary-court-non-conviction-expungement", // GA12 Q-599b985661fec0558c4b
    ],
    record: [
      "diversion-or-program-completion-expungement", // GA17 Q-90d4deac639927da1ee2
      "eligible-conviction-expungement", // GA17 Q-087283881934291ebe40
      "general-sessions-non-conviction-expungement", // GA17 Q-c26c3f6e7a42b5682710
      "human-trafficking-survivor-expungement", // GA17 Q-cdfeecfbc806454a636f
      "juvenile-expungement", // GA17 Q-4c98ca2da751837b69f7
      "pardon-guidance-for-otherwise-ineligible-convictions", // GA17 Q-f369ae40853cc743fee6
      "summary-court-non-conviction-expungement", // GA17 Q-b10be642c5fc30e77202
    ],
  },
  SD: {
    profileHash: "a1d4f1e781a618726d83137b3905ec17ab394dbc31f94aee23273746ec8331c1",
    categoryReason: "Earlier South Dakota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-arrest-record-expungement-under-sdcl-23a-3-27", // GA12 Q-e3265ba918c0807bc1d4
      "automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases", // GA12 Q-0dd3d4a648d6ab2cace7
      "controlled-substance-deferred-disposition-route", // GA12 Q-6ff783980d482acdedd8
      "diversion-expungement", // GA12 Q-8283a2d886845701d5c8
      "juvenile-delinquency-sealing", // GA12 Q-0fbe5c9baccd5dfb2743
      "juvenile-trafficking-expungement", // GA12 Q-544a83f317e6925639ae
      "pardon-based-sealing", // GA12 Q-0f015c8e313a541231b9
    ],
    record: [
      "adult-arrest-record-expungement-under-sdcl-23a-3-27", // GA17 Q-022baee1cde486a164d3
      "automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases", // GA17 Q-a39273de8f45dd093a92
      "controlled-substance-deferred-disposition-route", // GA17 Q-6d14ac2fd7b6bddcc5b7
      "diversion-expungement", // GA17 Q-e6106fb50b4129355c03
      "juvenile-delinquency-sealing", // GA17 Q-d42a33c8cf47f037e46b
      "juvenile-trafficking-expungement", // GA17 Q-3419f0242f9669240a3b
      "pardon-based-sealing", // GA17 Q-3118da38c8786644c46e
    ],
  },
  WA: {
    profileHash: "a694f14abf3cddb6c7e8f3fac74c1ab396ab8e75c1d9f6b1cce533ff70887eb9",
    categoryReason: "Earlier Washington categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-felony-vacation-under-rcw-9-94a-640", // GA12 Q-3b110b6ae08bd64d6bf3
      "adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060", // GA12 Q-10152501470126ecc07d
      "blake-drug-possession-vacation-and-refund-route", // GA12 Q-adb77e291db09ef1d5d2
      "juvenile-record-sealing-under-rcw-13-50-260", // GA12 Q-f58e57c144f081be3514
      "misdemeanor-cannabis-conviction-vacation", // GA12 Q-4adaa2604fd09aa8f9b5
      "non-conviction-record-deletion-under-rcw-10-97-060", // GA12 Q-9b41697713dead823c63
      "victim-survivor-conviction-vacation-route", // GA12 Q-90c7165ec4b0da2c49d5
    ],
    record: [
      "adult-felony-vacation-under-rcw-9-94a-640", // GA17 Q-97a9721e9b2e5b381d81
      "adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060", // GA17 Q-533e5e90f9eccd58ca69
      "blake-drug-possession-vacation-and-refund-route", // GA17 Q-635048ef673d9cd2d5ec
      "juvenile-record-sealing-under-rcw-13-50-260", // GA17 Q-1dc982540657d27bf12d
      "misdemeanor-cannabis-conviction-vacation", // GA17 Q-268df1f07d1a37b0e808
      "non-conviction-record-deletion-under-rcw-10-97-060", // GA17 Q-015e34cce8bfcc53bbeb
      "victim-survivor-conviction-vacation-route", // GA17 Q-221e47610111f5c92642
    ],
  },
  WV: {
    profileHash: "4579631e506c34764e4c9b13ed1041a381fa980597b798c184226d8879b6284c",
    categoryReason: "Earlier West Virginia categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a", // GA12 Q-cf92b9ddf3aa29535066
      "first-offense-drug-possession-conditional-discharge-relief", // GA12 Q-e09c22572076696b75e9
      "juvenile-record-relief", // GA12 Q-8b168b02120d28ec1967
      "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication", // GA12 Q-4788db0474a27ceae315
      "pardon-based-expungement", // GA12 Q-438edd691f440307e9c6
      "sex-trafficking-victim-vacatur-and-expungement", // GA12 Q-766aea3d3342bf31ebfe
    ],
    record: [
      "accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a", // GA17 Q-14029ec451f45aebd6e8
      "first-offense-drug-possession-conditional-discharge-relief", // GA17 Q-50f3c1d6f0353c4b697c
      "juvenile-record-relief", // GA17 Q-567a8b11142b92bae28f
      "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication", // GA17 Q-e4b313c5e14f1c28f895
      "pardon-based-expungement", // GA17 Q-58b3c0d9234aef3a26f6
      "sex-trafficking-victim-vacatur-and-expungement", // GA17 Q-bdb22ef6c8161084b37f
    ],
  },
  MD: {
    profileHash: "758b4fde34401e6a8778e6fe15dc64184f3319cdb336d24055c0fe9265544207",
    categoryReason: "Earlier Maryland categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-non-conviction-expungement-under-crim-proc-10-105", // GA12 Q-1ac39767ebd38f67205f
      "automatic-expungement-under-crim-proc-10-105-1", // GA12 Q-8bceb546e5c92b856e55
      "cannabis-specific-expungement", // GA12 Q-1bfea6abba26156d604b
      "eligible-conviction-expungement-under-crim-proc-10-110", // GA12 Q-490cfd616dd97bfc8df2
      "second-chance-act-shielding", // GA12 Q-2366ddaaf367add0a243
    ],
    record: [
      "adult-non-conviction-expungement-under-crim-proc-10-105", // GA17 Q-435bcf23d31f9f1a474c
      "automatic-expungement-under-crim-proc-10-105-1", // GA17 Q-764036348a0a72c4295a
      "cannabis-specific-expungement", // GA17 Q-f4d5d773c2868e5c9d1a
      "eligible-conviction-expungement-under-crim-proc-10-110", // GA17 Q-3c0d28cff0082c9af2fc
      "second-chance-act-shielding", // GA17 Q-7d682e0e897adec4533e
    ],
  },
  MN: {
    profileHash: "f779704436f10e0aabf0949877f3213af1900d5bf51729cec8397006e6a3f8bf",
    categoryReason: "Earlier Minnesota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11", // GA12 Q-0428789b04a87e050967
      "automatic-clean-slate-expungement-under-609a-015", // GA12 Q-3767c02a7587f8046157
      "automatic-mistaken-identity-expungement-under-609a-017", // GA12 Q-f23035e3845a362b111f
      "cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06", // GA12 Q-5578048f10653c4f1989
      "petition-based-expungement-under-609a-02-03", // GA12 Q-522adeef09ebd5543747
      "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025", // GA12 Q-afb8d1d88357accba349
    ],
    record: [
      "arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11", // GA17 Q-3bf293e8afaf34a905aa
      "automatic-clean-slate-expungement-under-609a-015", // GA17 Q-8fef10d89ea0c2b64a74
      "automatic-mistaken-identity-expungement-under-609a-017", // GA17 Q-cbbe48ecde268a32426c
      "cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06", // GA17 Q-c22e1092356ba2ea7e93
      "petition-based-expungement-under-609a-02-03", // GA17 Q-19a56b6841c424eebb18
      "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025", // GA17 Q-6f38f38e670d74cd9f54
    ],
  },
  NH: {
    profileHash: "f303b2822fac4b59e05e668d19072afe1c0aad0e4d0b728d04f5dde6cadc2cbd",
    categoryReason: "Earlier New Hampshire categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "annulment-after-dismissal-acquittal-or-nonprosecution", // GA12 Q-10e00b3dc3d3a2d6e6bf
      "annulment-of-a-vacated-conviction", // GA12 Q-55c5c19af69a1a529308
      "conviction-annulment-under-rsa-651-5", // GA12 Q-1a87b0c3031a018211ec
      "dwi-dui-annulment", // GA12 Q-c357f9bda99fc69890dd
      "marijuana-possession-annulment-under-rsa-651-5-b", // GA12 Q-4a033a26b88ca399c1b7
      "out-of-state-federal-or-military-record-guidance", // GA12 Q-f1b376edb928d6bb9bb7
    ],
    record: [
      "annulment-after-dismissal-acquittal-or-nonprosecution", // GA17 Q-1735257e90ac2bfb3c6a
      "annulment-of-a-vacated-conviction", // GA17 Q-01ccb87d2e863f142655
      "conviction-annulment-under-rsa-651-5", // GA17 Q-0a954234cb7748a24bd4
      "dwi-dui-annulment", // GA17 Q-0c1146198fffb005bd14
      "marijuana-possession-annulment-under-rsa-651-5-b", // GA17 Q-fe987ba5e321b5de2ee2
      "out-of-state-federal-or-military-record-guidance", // GA17 Q-cb9e54430db70d1e9208
    ],
  },
  MT: {
    profileHash: "29fe1b28e59f36a8ecdba6457b518b1d8e01a795042be695ed015b59e5254326",
    categoryReason: "Earlier Montana categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "doj-record-removal-update-request", // GA12 Q-c3d85e5a096e9c1c35d6
      "marijuana-related-redesignation-expungement-under-mmrta", // GA12 Q-7766060fdc5de774fcb8
      "misdemeanor-conviction-expungement-under-mont-code-46-18-1104", // GA12 Q-aa23f3177f750603d156
      "non-conviction-criminal-history-removal-through-criss", // GA12 Q-844547836228a5b71b3b
    ],
    record: [
      "doj-record-removal-update-request", // GA17 Q-219950124033a90a3eec
      "marijuana-related-redesignation-expungement-under-mmrta", // GA17 Q-22874003e3f9b4e789ff
      "misdemeanor-conviction-expungement-under-mont-code-46-18-1104", // GA17 Q-2f14507f0aba274692a5
      "non-conviction-criminal-history-removal-through-criss", // GA17 Q-95a3a1762360ab9abf6e
    ],
  },
  NM: {
    profileHash: "568a77e849af1c0f77b6c7cf241e4cbbfabf84935a7842991bcdd2b45e0b5574",
    categoryReason: "Earlier New Mexico categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "cannabis-expungement", // GA12 Q-6c78059e8c67886152fc
      "cannabis-sentence-dismissal-incarcerated-person-pathway", // GA12 Q-f87eb843a48c8089d84a
      "conviction", // GA12 Q-eaa848b04cf6df34c042
      "dna-sample-profile-expungement", // GA12 Q-df5dcb4a980a8c1c18c2
      "no-conviction-released-without-conviction", // GA12 Q-3c6e09d127f9c6c1e013
    ],
    record: [
      "cannabis-expungement", // GA17 Q-e67dc0c4b23494d95b29
      "cannabis-sentence-dismissal-incarcerated-person-pathway", // GA17 Q-d062bdab12a7d79d248a
      "conviction", // GA17 Q-18feadfb9d64e38eb940
      "dna-sample-profile-expungement", // GA17 Q-9469d5272b630c1e42f2
      "no-conviction-released-without-conviction", // GA17 Q-396bbe202b3656e21e7c
    ],
  },
  WI: {
    profileHash: "1cc5bd3d938f6ff6a011f93c73b859f0e364dfd2490ef1477a286758d88c57c8",
    categoryReason: "Earlier Wisconsin categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "adult-conviction-expungement-under-wis-stat-973-015", // GA12 Q-afbb3e3a97066d42db43
      "adult-non-conviction-arrest-only-record-correction-or-removal", // GA12 Q-245b2c9539e69e175c1f
      "executive-pardon-guidance", // GA12 Q-54b1f6c15bc185d39267
      "human-trafficking-prostitution-relief-under-973-015-2m", // GA12 Q-2c27ce8de5fd655f67f3
      "juvenile-adjudication-expungement-under-wis-stat-938-355-4m", // GA12 Q-17faa85a04ca540acf7f
    ],
    record: [
      "adult-conviction-expungement-under-wis-stat-973-015", // GA17 Q-169832628a42d7562d0e
      "adult-non-conviction-arrest-only-record-correction-or-removal", // GA17 Q-9f304de00959559d37a2
      "executive-pardon-guidance", // GA17 Q-17f9b61ca88492af4a91
      "human-trafficking-prostitution-relief-under-973-015-2m", // GA17 Q-481509abad98bb2a76be
      "juvenile-adjudication-expungement-under-wis-stat-938-355-4m", // GA17 Q-779bb8134eda85585a64
    ],
  },
  ND: {
    profileHash: "02161fac85c2f585313ccdfaa9b91bc58054646a4356e2d486b5d7acc20f322f",
    categoryReason: "Earlier North Dakota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "deferred-imposition-dismissal-and-sealing", // GA12 Q-f2f665a3691cd1692e1a
      "dui-record-sealing-under-the-separate-dui-statute", // GA12 Q-361173ac9d6a8a6b4ea9
      "general-conviction-sealing-under-n-d-c-c-chapter-12-60-1", // GA12 Q-2dcdf911e205525ea73c
      "marijuana-specific-summary-pardon-or-sealing-relief", // GA12 Q-6e7be452bdd8e0dc1b8e
      "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05", // GA12 Q-e78b8e4321d54496b5b4
    ],
    record: [
      "deferred-imposition-dismissal-and-sealing", // GA17 Q-7287e95f205449d12a41
      "dui-record-sealing-under-the-separate-dui-statute", // GA17 Q-2d838c58e640f6cae2a4
      "general-conviction-sealing-under-n-d-c-c-chapter-12-60-1", // GA17 Q-b736e32042467f9b12ec
      "marijuana-specific-summary-pardon-or-sealing-relief", // GA17 Q-45897cb3546575c003a8
      "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05", // GA17 Q-5eade38bbd184e137187
    ],
  },
  GA: {
    profileHash: "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef",
    categoryReason: "Earlier Georgia categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions", // GA12 Q-6bdd80f723dafb6905e9
      "non-conviction-record-restriction-through-the-agency-prosecutor-process", // GA12 Q-e8573d34e2f642eadbfc
      "retroactive-first-offender-treatment-under-42-8-66", // GA12 Q-bd2e702c83d3b1c90cdc
      "youthful-first-offender-restriction-route", // GA12 Q-0a405fcc19ade62c2b36
    ],
    record: [
      "non-conviction-record-restriction-through-the-agency-prosecutor-process", // GA17 Q-38c9b3d2a65f7b3cf0cf
      "retroactive-first-offender-treatment-under-42-8-66", // GA17 Q-7c543453ac4a3b2df3c2
      "youthful-first-offender-restriction-route", // GA17 Q-b16fc9a9eaf374ee138e
    ],
  },
  CO: {
    profileHash: "1e74ae18e3815426ae28001f741a954826a985d08164d8ab77820cda0d90d909",
    categoryReason: "Earlier Colorado categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "automatic-clean-slate-sealing-13-3-117", // GA12 Q-f1db160874208d5020cc
      "petition-based-conviction-sealing-jdf-612-24-72-706", // GA12 Q-6494b446a54f2fa4132f
      "petition-based-non-conviction-sealing-jdf-417-24-72-704", // GA12 Q-fa4052b5baf06ea52e36
    ],
    record: [
      "automatic-clean-slate-sealing-13-3-117", // GA17 Q-b716564db24866ec8d11
    ],
  },
  HI: {
    profileHash: "9b1a121be377fa34e6425d96f7edb82428321b60a757870f8dc4878ebfb27ece",
    categoryReason: "Earlier Hawaii categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
    ],
    record: [
      "deferred-acceptance-one-year", // GA17 Q-379aef0fc804f8efff6f
      "deferred-prostitution-three-year", // GA17 Q-caf00f0814d58e104534
    ],
  },
  FL: {
    profileHash: "aca558d3077491f0c09abe838d08b926c0cbe8b194ac1c4500d93520d9a32034",
    categoryReason: "Earlier Florida categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "administrative-expunction-mistaken-or-unlawful-arrest", // GA12 Q-ff18c7ee7b5fc259855e
      "automatic-sealing-943-0595", // GA12 Q-98941b8960c7c23861d8
      "court-ordered-expunction-943-0585", // GA12 Q-3504135ef3a69720b765
      "court-ordered-sealing-943-059", // GA12 Q-69e6932abb2280cfa2c9
      "early-juvenile-expunction-943-0515", // GA12 Q-9244c44aa7d1cdae8c2d
      "human-trafficking-victim-expunction-943-0583", // GA12 Q-28e8d29ebfb9bb1afee2
      "juvenile-diversion-expunction-943-0582", // GA12 Q-e005e138022a5690c504
      "lawful-self-defense-expunction-943-0578", // GA12 Q-e347bf63d9f2603594b8
    ],
    record: [
    ],
  },
  MO: {
    profileHash: "88e33a1958a25c8bd1082df4fccc1ebcba24938d8a4545af68c1a65820c8a750",
    categoryReason: "Earlier Missouri categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "closed-record-outcome-under-rsmo-610-105", // GA12 Q-5daf517e434f5c47aed1
      "false-information-or-qualifying-arrest-record-expungement-under-610-122-123", // GA12 Q-7b31b30a82048af5c44f
      "first-intoxication-related-traffic-or-boating-expungement-under-610-130", // GA12 Q-35247ec81e17ad80e20c
      "first-minor-in-possession-alcohol-expungement-under-311-326", // GA12 Q-95e16f98859d4d7d2f75
      "general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140", // GA12 Q-1b0ddb33a01cb171b540
      "stolen-or-mistaken-identity-expungement-under-610-145", // GA12 Q-a83f973c4465e019063d
    ],
    record: [
    ],
  },
  DC: {
    profileHash: "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830",
    categoryReason: "Earlier District of Columbia categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "dc_auto_expungement_16_802", // GA12 Q-17b01d9289e67bead5a9
      "dc_auto_sealing_16_805", // GA12 Q-43bad379c984bdcec522
      "dc_motion_seal_felony_conviction_8yr_16_806", // GA12 Q-02ab2e4e6d22bdbcddbd
      "dc_motion_seal_misdemeanor_conviction_5yr_16_806", // GA12 Q-49ff4137a70f901c59b5
      "dc_motion_seal_nonconviction_16_806", // GA12 Q-9a6bf799e24f4f09737a
    ],
    record: [
    ],
  },
  CT: {
    profileHash: "7a0dadd32497d4be04bfad21e8ee8cf3b735168a84a3cd5baf70dcd7039f348c",
    categoryReason: "Earlier Connecticut categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "absolute-pardon-resulting-in-erasure", // GA12 Q-98e4ea3ca807af2b1e75
      "petition-for-erasure-of-cannabis-conviction-records-under-54-142v", // GA12 Q-bb10b9d5904f136c12c5
    ],
    record: [
    ],
  },
  ID: {
    profileHash: "fbbdbd3f1afc5fb7c0959d8a31d56c142bea295096255e8ec3e6392a87f913f0",
    categoryReason: "Earlier Idaho categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "clean-slate-shielding-under-idaho-code-67-3004-11", // GA12 Q-234d22947f5845d3fb3b
      "human-trafficking-survivor-vacatur-and-expungement", // GA12 Q-275dc80a4ba3c3029744
      "juvenile-expungement", // GA12 Q-03d858e3c437c0fa52eb
      "non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10", // GA12 Q-8e441ae51aae8b376f39
      "withheld-judgment-idaho-code-19-2604-review-branch", // GA12 Q-07c6204e128727e33eef
    ],
    record: [
    ],
  },
  MI: {
    profileHash: "46b14de0bcfed90bedbd1e0e6c9b45d687a4170d5e75c4d009a237c6cbea994c",
    categoryReason: "Earlier Michigan categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "automatic-clean-slate-set-aside-under-mcl-780-621g", // GA12 Q-9aaca77e5f49d2191a69
      "first-offense-owi-set-aside-by-application", // GA12 Q-46ab6cce80afe155d987
      "human-trafficking-related-set-aside-application", // GA12 Q-22de798715cd8ab7e2eb
      "misdemeanor-marijuana-set-aside-under-mcl-780-621e", // GA12 Q-1c27ca54464512e7687e
      "set-aside-by-application-under-mcl-780-621", // GA12 Q-5899a8341678d8dc28c8
    ],
    record: [
    ],
  },
  AZ: {
    profileHash: "299af842ba17587b84de282328c27e8bed1d82a4dfa51146341b42338b296300",
    categoryReason: "Earlier Arizona categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "notation-of-clearance-after-a-wrongful-arrest-under-13-4051", // GA12 Q-b4234bcc40a7d7afbefc
      "remedy-1-record-sealing", // GA12 Q-cd08f58b55c2f888c0f8
      "remedy-2-set-aside-of-a-conviction", // GA12 Q-d86918b7cb375888f00b
      "remedy-3-marijuana-expungement", // GA12 Q-d70b1ab1ce0903873c7d
    ],
    record: [
    ],
  },
  DE: {
    profileHash: "b37cab84b2a00c572d170364992fc81cfd6014f954086e8b7257fd798a5b84d7",
    categoryReason: "Earlier Delaware categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "juvenile-expungement-under-10-del-c-1017-1019-1017a", // GA12 Q-1263e1e37b54b9879d32
      "mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a", // GA12 Q-9be76a8f976a01629777
      "pardon-based-discretionary-expungement-under-11-del-c-4375", // GA12 Q-0a2fc8c16d3075f2aa20
    ],
    record: [
    ],
  },
  NJ: {
    profileHash: "c205f7ccca0671e3599268180f9e1286fd9b65f82703d6c39d0ebcd7fb1f1b6d",
    categoryReason: "Earlier New Jersey categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6", // GA12 Q-d29d1dfeccfe728d2d8b
      "clean-slate-petition-under-n-j-s-a-2c-52-5-3", // GA12 Q-e4dd744eac889810ece9
      "marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1", // GA12 Q-6571bc7f5a310ff68fa8
      "regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3", // GA12 Q-a27a84dcca35f0a9d3ae
    ],
    record: [
    ],
  },
  TN: {
    profileHash: "e598683f4fe1b7336e959b3295dd9cd6f9212a1207ab89f365193d9b61d21e4c",
    categoryReason: "Earlier Tennessee categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged.",
    category: [
      "pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106", // GA12 Q-c6c9fa03230c555ef82d
      "pathway-2-diversion-expunction-under-40-15-105-40-35-313", // GA12 Q-8246dcb76f286d8cf5e6
      "pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107", // GA12 Q-3a3ab9bd323f2a1da3b0
      "pathway-4-two-offense-expunction-under-40-32-101-k", // GA12 Q-b1f1233251db03f8dc14
    ],
    record: [
    ],
  },
};

function r1SourceBoundHistoryEntry(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined, list: "category" | "record") {
  const code = profile?.jurisdiction.code ?? "";
  const entry = Object.hasOwn(R1_SOURCE_BOUND_HISTORY, code) ? R1_SOURCE_BOUND_HISTORY[code] : undefined;
  return entry && entry[list].includes(pathwayId ?? "") && specification == null
    && contactRepresentationHash(profile) === entry.profileHash ? entry : undefined;
}

export function r1CategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return r1SourceBoundHistoryEntry(profile, pathwayId, specification, "category") !== undefined;
}

export function r1RecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return r1SourceBoundHistoryEntry(profile, pathwayId, specification, "record") !== undefined;
}

// GA-17 Q-8105d5d0b28ebd1e4a67 / Q-c8633872a982712e7803 / Q-94c8f0620f0384854d98.
// GA-17 Q-748f73bc4bcf41923fcc / Q-6acd9d8d275e7be59682 / Q-8c94453e5af32f59406d.
// Q-ab7cc6744570b24e17d4 / Q-481c00319478c8236160 / Q-1ee2fb0eca77febaf2b6: the same history-only consumer.
// HI Q-4c4d60127b04b08d3f41 / Q-d6c2af7ef42f979932f3 / Q-50a58ca23c5c2ba26a76: holder/disposition uses do not make these labels exclusive.
// Q-6add858b65f867a82b70 / Q-502bf587f9925e5e6e79 / Q-00caec14a5a59750b527: Kentucky uses separate disposition/statutory facts.
// GA17 Q-46a17f0eb164e9cdcf27 / Q-47d5c5f19e70f0fbcbec / Q-73e3915ed9d087f8b531 / Q-6fce98651a27d2a3b8c6 / Q-65a2e556a51d224b2917: the same source-bound optional history.
export function dcFlPetitionRecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  if (specification != null) return false;
  return okCategoryAndRecordAreHistory(profile, pathwayId, specification)
    || r1RecordIsHistory(profile, pathwayId, specification)
    || profile?.jurisdiction.code === "DC"
    && ["dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_nonconviction_16_806", "dc_auto_expungement_16_802", "dc_auto_sealing_16_805", "dc_juvenile_sealing_16_2335"].includes(pathwayId ?? "")
    && contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830"
    || profile?.jurisdiction.code === "FL"
      && ["court-ordered-expunction-943-0585", "court-ordered-sealing-943-059", "early-juvenile-expunction-943-0515", "human-trafficking-victim-expunction-943-0583", "juvenile-diversion-expunction-943-0582", "lawful-self-defense-expunction-943-0578", "administrative-expunction-mistaken-or-unlawful-arrest", "automatic-sealing-943-0595"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "aca558d3077491f0c09abe838d08b926c0cbe8b194ac1c4500d93520d9a32034"
    || profile?.jurisdiction.code === "GA" && pathwayId === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"
      && contactRepresentationHash(profile) === "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef"
    || profile?.jurisdiction.code === "HI"
      && ["dui-under-21-conviction", "first-time-drug-conviction", "nonconviction-arrest-expungement"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "9b1a121be377fa34e6425d96f7edb82428321b60a757870f8dc4878ebfb27ece"
    // GA17 Q-213a19004dbda41dfce2 / Q-e7a0b9cbb9047649e8e0 / Q-6b16d8ce7d8fc029c19e: literal record history, no exclusive type consumer.
    || profile?.jurisdiction.code === "LA"
      && ["automated-expungement-status-verification-art-985-2", "expungement-by-redaction-for-multi-person-records",
        "non-conviction-arrest-expungement"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "a0bf1a76b91c555e5b0cca05b96d6b9a34721db466c7beffdc20fbd86f1e36e6"
    // GA17 Q-f998590180601fe00713 / Q-30353f219d82ca7eeb62: existing guidance collection also keeps overlapping labels as history.
    || profile?.jurisdiction.code === "KY"
      && ["misdemeanor-violation-traffic-conviction", "nonconviction-431076", "void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276", "juvenile-automatic-dismissal", "juvenile-petition-610330"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "4e84c6d8ba6469a095c50f09cacfb5518c4132d049fbf068513c6eb925e6a364"
    // GA17 Q-50dcf8b1a91162a70705 / Q-5ec575d17ded0b87051d / Q-79e780778f4a487dd39b: preserve overlapping labels without a record-type consumer.
    // GA17 Q-fb2109e5a0379589fe4c / Q-9026faa3fca7a143a0df / Q-bf040ed86c19172840d6: preserve overlapping labels without a record-type consumer.
    // GA17 Q-0c86d50a75c852085df7 / Q-f66a6b6b457285d85751 / Q-8a323b249717d2c2b890: preserve literal history without a record-type consumer.
    || profile?.jurisdiction.code === "MA"
      && ["adult-conviction-sealing-under-m-g-l-c-276-100a", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c", "juvenile-record-sealing-under-100b", "marijuana-only-expungement", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k", "time-based-expungement-under-100f-100j"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d"
    // GA17 Q-688bf057ef651e46a54b / Q-6e06a84342a41f34e1d2 / Q-7ed646d227c26f9acc32: preserve literal history without a record-type consumer.
    || profile?.jurisdiction.code === "ME"
      && ["adult-conviction-sealing", "adult-non-conviction-record-relief", "juvenile-sealing", "pardon-route", "sex-trafficking-sexual-exploitation-survivor-sealing"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "d49e7b9cb025700b9c352d78e1e9044c41b99bd0695b61eda373215034d78f5a";
}

// GA12 Q-afb21e87bf5f515361d3 / Q-e5235e1dd8cc84bbc183 / Q-85cf769eef915fa16dd9: no category value or document binding.
export function kyThreeRouteCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "KY" && ["misdemeanor-violation-traffic-conviction", "nonconviction-431076", "void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "4e84c6d8ba6469a095c50f09cacfb5518c4132d049fbf068513c6eb925e6a364";
}

// GA12 Q-b650af1f0c8e9cd60954 / Q-a98c1c42d4ca2dc87de6 / Q-6e194b7a829b9e9d00ba: no category value or document binding.
export function laThreeRouteCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "LA" && ["automated-expungement-status-verification-art-985-2", "expungement-by-redaction-for-multi-person-records", "non-conviction-arrest-expungement"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "a0bf1a76b91c555e5b0cca05b96d6b9a34721db466c7beffdc20fbd86f1e36e6";
}

// GA12 Q-91fa41f53170662c08a0 / Q-5b36a34a7c948611ee95 / Q-bcaeae1f794e7c817c9e: no category value or document binding.
export function maThreeRouteCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "MA" && ["adult-conviction-sealing-under-m-g-l-c-276-100a", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d";
}

// GA12 Q-22a8ba63fd3f2a4e8e45 / Q-8f92be5a3cad6117e157 / Q-afe18f299b99e2718082: no category value or document binding.
export function maAdditionalCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "MA" && ["juvenile-record-sealing-under-100b", "marijuana-only-expungement", "non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d";
}

// GA12 Q-7196d0f90cccd5e9538c / Q-c2da947c5919f3b48951 / Q-524a1f85273abc4b97d0: no category value or document binding.
export function maMeCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  if (specification != null) return false;
  return profile?.jurisdiction.code === "MA" && pathwayId === "time-based-expungement-under-100f-100j"
      && contactRepresentationHash(profile) === "f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d"
    || profile?.jurisdiction.code === "ME" && ["adult-conviction-sealing", "adult-non-conviction-record-relief"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "d49e7b9cb025700b9c352d78e1e9044c41b99bd0695b61eda373215034d78f5a";
}

// GA12 Q-377830ef29f46987d4b3 / Q-da97aa3887af5a623b94: the same source-bound literal history.
// GA12 Q-954756996d44111dd6f6 / Q-11a00e1e894ff5efe5f9 / Q-91de493bf957b599962f: no category document binding.
export function iaCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "IA" && ["minor-prostitution-7251", "misdemeanor-901c3",
    "nonconviction-901c2", "public-intoxication-12346", "underage-alcohol-12347"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "ffdbac49e5a1e96f22cb8cd6f4842e9b9c367b988901fa061091fc6d9107ed9e";
}

// GA-12 Q-ce34aa2230f68728a3ca / Q-71b990754b6c4d4ab55b / Q-1c1d81d2035e0ec75e0f: no category document binding.
export function alThreeRouteCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "AL" && ["human-trafficking-victim-expungement",
    "non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a",
    "pardoned-felony-expungement-under-ala-code-15-27-2-c"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "ca219c1a1419f8b2900fd6368ac7202ba779ac084dae7e4dd507be943a29011c";
}

// GA-12 / Q-5669a607a2c263da9210, Q-3ab723a5bbe4701b2309:
// the retained Arkansas consumers use specific case facts, not a generic category.
export function arBoundCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return arNonconvictionRecordIsContext(profile, pathwayId ?? null, specification)
    || arFelonyRecordIsContext(profile, pathwayId ?? null, specification);
}

// GA12 Q-49c293131f5eba7089d9 / Q-4fbcf8810b325d290849 / Q-6a2e1331cb59164e4634: no generic category document consumer.
// GA12 Q-4b42a49baff24e9dcae6 / Q-8a28b159789e3e372c69: the attached court order, not a category, decides these conviction routes.
export function hiThreeRouteCategoryIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  return profile?.jurisdiction.code === "HI"
    && ["deferred-acceptance-one-year", "deferred-prostitution-three-year", "nonconviction-arrest-expungement",
      "dui-under-21-conviction", "first-time-drug-conviction"].includes(pathwayId ?? "")
    && specification == null && contactRepresentationHash(profile) === "9b1a121be377fa34e6425d96f7edb82428321b60a757870f8dc4878ebfb27ece";
}

const DERIVATIONS: Readonly<Record<string, Derivation>> = {
  // The last four digits are a projection of the number itself, never a
  // separate thing to ask for.
  social_security_number_last_four: {
    from: ["social_security_number"],
    derive: ({ social_security_number: ssn }) => fullSsnLastFour(ssn)
  },
  // Deliberately NOT derived, though each looks inferable:
  //
  //   case_caption_defendant_name — the specification asks for the DOCKET-EXACT
  //     caption name, which is not reliably the participant's legal name.
  //   name_used_at_arrest — the arrest record may carry another name, which is
  //     the whole reason `aliases` is a separate fact.
  //   mailing_address — `contact_information` is free text that may hold a
  //     phone number or an email instead of an address.
  //
  // Each of those would be a guess wearing the authority of a derivation, so
  // each stays a participant-supplied fact.

  // The classification printed on the record is the charge level the
  // participant already identified; the two are the same fact under two names.
  offense_category: {
    from: ["offense_level"],
    derive: ({ offense_level: level }) => (level && !/not sure/i.test(level) ? level : null)
  },
  charge_classification: {
    from: ["offense_level"],
    derive: ({ offense_level: level }) => (level && !/not sure/i.test(level) ? level : null)
  },
  // Age at the offence is arithmetic on two dates the route already collects.
  // It resolves only when both are real calendar dates, so a partial or
  // unparseable answer computes nothing and the question is asked.
  age_at_offense: {
    from: ["date_of_birth", "offense_date"],
    derive: ({ date_of_birth: birth, offense_date: offense }) => {
      const born = isoDate(birth);
      const offended = isoDate(offense);
      if (!born || !offended || offended < born) return null;
      let age = offended.getUTCFullYear() - born.getUTCFullYear();
      const beforeBirthday = offended.getUTCMonth() < born.getUTCMonth()
        || (offended.getUTCMonth() === born.getUTCMonth() && offended.getUTCDate() < born.getUTCDate());
      if (beforeBirthday) age -= 1;
      return age >= 0 && age < 130 ? String(age) : null;
    }
  },
  // The caption's filing location is the county the court sits in.
  filing_location: {
    from: ["county"],
    derive: ({ county }) => county || null
  },
  // A court named in full already states its type; where the participant gave
  // a bare court name, nothing is derived and the question is asked.
  court_type: {
    from: ["court"],
    derive: ({ court }) => {
      const match = /(justice|municipal|county|circuit|youth|district|superior|magistrate)\s+court/i.exec(court);
      return match ? `${match[1].replace(/^./, (c) => c.toUpperCase())} Court` : null;
    }
  },
  // Only when the answer already IS a full court name. A bare "Hinds" carries
  // nothing, and the question is asked.
  court_name: {
    from: ["court"],
    derive: ({ court }) => (/\bcourt\b/i.test(court) ? court : null)
  },
  // The generic contact fact is the specific contact facts, written out. A
  // participant who has given a mailing address, a phone number and an email
  // has already said everything this fact holds, and asking for "contact
  // information" afterwards is asking the same thing a second time. This
  // composes rather than infers: no part of it is guessed.
  contact_information: {
    from: ["mailing_address", "phone_number", "email_address"],
    derive: ({ mailing_address: address, phone_number: phone, email_address: email }) => {
      const parts = [address, phone, email].map((part) => part.trim()).filter(Boolean);
      return parts.length === 3 ? parts.join(" | ") : null;
    }
  }
};
assertLeafPacketDerivationGraph(DERIVATIONS);

/**
 * Screening ids that already carry a packet fact's answer. This is a naming
 * crosswalk and nothing more: the participant's own answer is reused under the
 * id the packet knows it by.
 */
const SCREENING_CROSSWALK: Readonly<Record<string, string[]>> = {
  case_outcome: ["case_outcome"],
  offense_level: ["offense_level"],
  jurisdiction: ["jurisdiction_scope"],
  pending_cases: ["pending_cases"],
  prior_relief: ["prior_relief"],
  financial_obligations: ["financial_obligations", "court_requirements_completed"],
  sentence_completion_date: ["sentence_completion_date", "court_requirements_completed"],
  trafficking_status: ["trafficking_status"],
  criminal_history: ["criminal_history"],
  pardon_status: ["pardon_status"],
  arrest_date: ["arrest_date"],
  disposition_date: ["disposition_date"]
};

/** Conditions generic across routes: a detail fact governed by its own gate fact. */
const GENERIC_CONDITIONS: Readonly<Record<string, string>> = {
  personal_impact_statement: "personal_impact_confirmed",
  release_date_or_record_source: "release_confirmed",
  arrest_date: "actual_arrest",
  arrest_location: "actual_arrest",
  arresting_agency: "actual_arrest",
  agency_case_number: "actual_arrest"
};

const EXTERNAL_ACTOR_BY_OWNERSHIP_KEY: Readonly<Record<string, string>> = {
  participantCompletesBeforeFilingFields: "participant_before_filing",
  participantAtSigningFields: "participant_at_signing",
  participantAtServiceFields: "participant_at_service",
  notaryOwnedFields: "notary",
  prosecutorOwnedFields: "prosecutor",
  courtOwnedFields: "court"
};

// ---------------------------------------------------------------------------

export function packetCollectionRouteKey(jurisdiction: string, pathwayId: string | null) {
  return `${jurisdiction}:${pathwayId ?? ""}`;
}

/**
 * Resolve every required fact of one route to exactly one collection class.
 *
 * The order of the checks is the order of authority: what the server owns,
 * then what another actor owns, then what the participant has already said,
 * then what follows deterministically from it, then what a condition makes
 * irrelevant, then what actually gates payment, then what the packet needs at
 * render time, and only then the report that a fact could not be placed.
 */
export function resolvePacketCollection(input: PacketCollectionInput): PacketCollectionResolution {
  const routeKey = packetCollectionRouteKey(input.jurisdiction, input.pathwayId);
  const specification = input.specification ?? null;
  const factById = specificationFactIndex(specification);
  const externalActorById = externalActorIndex(specification);
  const serverOwned = new Set(specificationStringList(specification, "serverOwnedRouteFacts"));
  const override = input.override ?? null;
  const needsHuman = new Set(override?.needsHumanClassification ?? []);

  const known: Record<string, AnswerValue> = {};
  const derived: Record<string, AnswerValue> = {};
  const facts: ResolvedPacketFact[] = [];
  let contactReconciliation: PacketCollectionResolution["contactReconciliation"];
  const validValue = (id: string, value: AnswerValue | undefined) => {
    const question = input.questionById?.get(id);
    return question ? questionAnswerState(question, value) === "known_valid" : valueIsKnown(value);
  };

  /**
   * Values that make a fact ALREADY KNOWN — that is, known from somewhere
   * other than this builder.
   *
   * Answers the participant has already saved in the builder are deliberately
   * absent. Answering a question is not a reason to stop showing it: the
   * participant has to be able to walk back through their own answers and
   * change one. Saved answers still inform derivations and conditions below;
   * they just never retire a question.
   */
  const available: Record<string, AnswerValue> = {
    ...input.screeningAnswers,
    ...(input.profileFacts ?? {}),
    ...(input.prefilledAnswers ?? {}),
    ...input.serverFacts
  };

  /** Everything resolved so far, for reading a derivation's or a condition's inputs. */
  const resolvedText = (factId: string): string => {
    if (input.unresolvedSavedFactIds?.has(factId)) return "";
    const saved = input.savedAnswers?.[factId];
    // An explicitly edited invalid/unknown answer cannot fall back to an older
    // valid value and silently feed a calculation or condition.
    if (input.savedAnswers && factId in input.savedAnswers) return validValue(factId, saved) ? answerString(saved) : "";
    if (factId in derived) return answerString(derived[factId]);
    if (factId in known) return answerString(known[factId]);
    return validValue(factId, available[factId]) ? answerString(available[factId]) : "";
  };

  const ohTraffickingCourtContext = input.jurisdiction === "OH"
    && ohTraffickingCourtIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const arNonconvictionRecordContext = input.jurisdiction === "AR"
    && arNonconvictionRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ca12034RecordContext = input.jurisdiction === "CA"
    && ca12034RecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ca12034aRecordContext = input.jurisdiction === "CA"
    && ca12034aRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const caTool3RecordHistory = caTool3RecordIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const caTool4RecordHistory = caTool4RecordIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const coPetitionRecordHistory = coPetitionRecordIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const dcFlPetitionRecordHistory = dcFlPetitionRecordIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const dcFelonyRecordHistory = dcFelonyRecordIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const caAutomaticRecordContext = input.jurisdiction === "CA"
    && caAutomaticRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const arFelonyRecordContext = input.jurisdiction === "AR"
    && arFelonyRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const alClassification = input.jurisdiction === "AL"
    && alRedeemerClassificationContract(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const alRecordContext = input.jurisdiction === "AL"
    && alRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const dcLocationContext = input.jurisdiction === "DC"
    && dcInnocenceLocationIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const akAgencyOrSisContext = input.jurisdiction === "AK"
    && akAgencyOrSisRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const akJuvenileContext = input.jurisdiction === "AK"
    && akJuvenileRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const akPardonContext = input.jurisdiction === "AK"
    && akPardonRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const akRecordContext = input.jurisdiction === "AK"
    && akCourtviewRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ndRecordContext = input.jurisdiction === "ND"
    && ndFirstOffenseRecordIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const retainedDcLocation = dcLocationContext && [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
    .some(answers => answers && Object.hasOwn(answers, DC_LEGACY_LOCATION));
  const mnCannabisLocationContext = input.jurisdiction === "MN" && mnCannabisLocationIsContext(getProfileByJurisdiction("MN"), input.pathwayId, specification);
  const mn609a017LocationContext = input.jurisdiction === "MN" && mn609a017LocationIsContext(getProfileByJurisdiction("MN"), input.pathwayId, specification);
  const mn299c11LocationContext = input.jurisdiction === "MN" && mn299c11LocationIsContext(getProfileByJurisdiction("MN"), input.pathwayId, specification);
  const mn609a015LocationContext = input.jurisdiction === "MN" && mn609a015LocationIsContext(getProfileByJurisdiction("MN"), input.pathwayId, specification);
  const moXivCourtContext = input.jurisdiction === "MO" && moXivCourtIsContext(getProfileByJurisdiction("MO"), input.pathwayId, specification, resolvedText(MO_MARIJUANA_CUSTODY_FACT));
  const mo610122CourtContext = input.jurisdiction === "MO" && mo610122CourtIsContext(getProfileByJurisdiction("MO"), input.pathwayId, specification);
  const mo610105CourtContext = input.jurisdiction === "MO" && mo610105CourtIsContext(getProfileByJurisdiction("MO"), input.pathwayId, specification);
  const vaVictimContext = input.jurisdiction === "VA" && virginiaVictimQuestionContract(getProfileByJurisdiction("VA"), input.pathwayId, { specification });
  const ohJuvenileContext = ohJuvenileSourceContract(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ohJuvenileAnswers = Object.fromEntries(OH_JUVENILE_STAGE_IDS.map(id => [id, resolvedText(id)]));
  const ohJuvenileActiveIds = ohJuvenileStageFactIds(ohJuvenileAnswers);
  const mdPoliceSourceContext = input.jurisdiction === "MD" && specification == null
    && mdPoliceContext(getProfileByJurisdiction("MD"), input.pathwayId);
  const mdPoliceAnswers = Object.fromEntries(["arrest_date", ...MD_POLICE_IDS].map(id => [id, resolvedText(id)]));
  const mdPoliceActiveIds = mdPoliceFactIds(mdPoliceAnswers);
  // Saved edits control applicability; an explicit clear/unknown/unresolved
  // value cannot reactivate an older screening value.
  const mnStageAnswers = { ...available, ...(input.savedAnswers ?? {}) };
  for (const id of input.unresolvedSavedFactIds ?? []) delete mnStageAnswers[id];
  const mnStageContext = mnProtectedStageContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId,
    specification, mnStageAnswers, [...input.unresolvedSavedFactIds ?? []]);
  const mnTwoCountyContext = mnStageContext !== null;
  const mnTwoCountyQuestionsById = new Map(mnTwoCountyContext ? mnTwoCountyQuestions(input.pathwayId!).map(question => [question.id, question]) : []);
  const mnTwoCountyIds = mnTwoCountyContext ? mnTwoCountyFactIds(input.pathwayId!) : [];
  const mnStageQuestions = mnStageContext?.questions ?? [];
  const mnStageQuestionsById = new Map(mnStageQuestions.map(question => [question.id, question]));
  const mnStageCandidate = mnStageContext?.candidate ?? null;

  const ksMunicipalCategoryContext = ksMunicipalCategoryIsContext(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const wy1502CategoryHistory = wy1502CategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const sdSisCategoryHistory = sdSisCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ilProstitutionCategoryHistory = ilProstitutionCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const nvProgramCategoryHistory = nvProgramCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ctPetitionCategoryHistory = ctPetitionCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const gaSb288CategoryHistory = gaSb288CategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const msCategoryHistory = msAdditionalCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ilCategoryHistory = ilIdentityCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const dcCategoryHistory = dcInnocenceCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const arCategoryHistory = arBoundCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const alCategoryHistory = alThreeRouteCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const hiCategoryHistory = hiThreeRouteCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const kyCategoryHistory = kyThreeRouteCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const laCategoryHistory = laThreeRouteCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const maCategoryHistory = maThreeRouteCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const maAdditionalCategoryHistory = maAdditionalCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const okCategoryHistory = okCategoryAndRecordAreHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const r1CategoryHistory = r1SourceBoundHistoryEntry(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification, "category");
  const maMeCategoryHistory = maMeCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const iaCategoryHistory = iaCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ctCategoryHistory = ctInformationCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId ?? null,
    specification, { ...available, ...input.savedAnswers }, [...input.unresolvedSavedFactIds ?? []]);
  const vaPardonLocationContext = vaPardonLocationApplies(getProfileByJurisdiction(input.jurisdiction), input.pathwayId ?? null, specification,
    { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, [...input.unresolvedSavedFactIds ?? []]);
  const msFirstContext = msFirstOffenderSourceContract(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const msFirstQuestions = new Map(msFirstContext ? msFirstOffenderSourceQuestions().map(question => [question.id, question]) : []);
  const requiredInputIds = dedupe([...(isCaProp64Pathway(input.jurisdiction, input.pathwayId) ? [CA_SAFE_AT_HOME_ID] : []), ...input.requiredInputIds, ...(msFirstContext ? MS_FIRST_OFFENDER_COLLECTION_IDS : []), ...(ohJuvenileContext ? OH_JUVENILE_STAGE_IDS : []), ...mnTwoCountyIds, ...mnStageQuestions.map(question => question.id), ...(retainedDcLocation ? [DC_LEGACY_LOCATION] : [])]);
  const decidesRouteFor = (factId: string) => input.routeDecidingFactIds?.has(factId) === true;
  const unresolvedScopeFor = (factId: string) => input.unresolvedRouteFactIds?.has(factId) === true;
  const baselineCarried = input.baselineCarriedFactIds ?? new Set<string>();
  /**
   * Whether a value may be written into the prefilled map for this fact.
   * `sameId` means the participant answered this exact fact already, so the
   * evaluator has seen that value and reusing it changes nothing.
   */
  const mayMaterialize = (factId: string, sameId: boolean) =>
    sameId || baselineCarried.has(factId) || (
      !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.materializationProtectedFactIds?.has(factId)
    );

  for (const factId of requiredInputIds) {
    const needsSavedAnswerClarification = input.unresolvedSavedFactIds?.has(factId) === true;
    const specFact = factById.get(factId);
    const overrideClass = override?.classes?.[factId];
    const group = sectionFor(factId, override?.groups?.[factId]);

    // CA-CAPTION-CONTACT-01: participant-reported privacy context never decides eligibility or prepay.
    if (factId === CA_SAFE_AT_HOME_ID && isCaProp64Pathway(input.jurisdiction, input.pathwayId)) {
      facts.push({ factId, collection: "conditional", phase: "render", group: "about_you", active: true, optional: true,
        source: "ca_participant_address_privacy_context", reason: "Optional participant-reported address context; no enrollment verification, account address or electronic-service consent." });
      continue;
    }
    // 1. Server-owned route facts.
    if (factId in input.serverFacts || serverOwned.has(factId)) {
      const value = input.serverFacts[factId] ?? available[factId] ?? null;
      known[factId] = value;
      facts.push({
        factId,
        collection: "already_known",
        phase: "known",
        group: null,
        source: "server_route_fact",
        value,
        reason: "the server owns this route fact; it is never asked"
      });
      continue;
    }

    if ((r1CategoryHistory || okCategoryHistory || arCategoryHistory || alCategoryHistory || hiCategoryHistory || iaCategoryHistory || maMeCategoryHistory || maAdditionalCategoryHistory || maCategoryHistory || laCategoryHistory || kyCategoryHistory || ctCategoryHistory || wy1502CategoryHistory || sdSisCategoryHistory || ilProstitutionCategoryHistory || dcCategoryHistory || ilCategoryHistory || msCategoryHistory || gaSb288CategoryHistory || ctPetitionCategoryHistory || nvProgramCategoryHistory) && factId === "offense_category" && !overrideClass
      && !needsHuman.has(factId) && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: r1CategoryHistory ? "r1_category_history" : okCategoryHistory ? "ok_category_history" : maMeCategoryHistory ? "ma_me_category_history" : maAdditionalCategoryHistory ? "ma_additional_category_history" : maCategoryHistory ? "ma_three_route_category_history" : laCategoryHistory ? "la_three_route_category_history" : kyCategoryHistory ? "ky_three_route_category_history" : arCategoryHistory ? "ar_bound_category_history" : wy1502CategoryHistory ? "wy1502_category_history" : sdSisCategoryHistory ? "sd_sis_category_history" : ilProstitutionCategoryHistory ? "il_prostitution_category_history" : hiCategoryHistory ? "hi_three_route_category_history" : iaCategoryHistory ? "ia_three_route_category_history" : alCategoryHistory ? "al_three_route_category_history" : nvProgramCategoryHistory ? "nv_program_category_history" : ctPetitionCategoryHistory ? "ct_petition_category_history" : gaSb288CategoryHistory ? "ga_sb288_category_history" : msCategoryHistory ? "ms_additional_category_history" : ilCategoryHistory ? "il_identity_category_history" : dcCategoryHistory ? "dc_innocence_category_history" : "ct_information_category_history",
        reason: r1CategoryHistory ? r1CategoryHistory.categoryReason
        : okCategoryHistory
          ? "Earlier Oklahoma categories remain optional literal history. Charge and statute, disposition, offense level, timing, court and applicable record-specific facts remain separate; a category does not establish statutory classification or eligibility."
        : maMeCategoryHistory
          ? "These source-bound consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility."
        : maAdditionalCategoryHistory
          ? "These source-bound Massachusetts consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility."
        : maCategoryHistory
          ? "These source-bound Massachusetts consumers use separate disposition, offense-level, timing and court facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility."
        : laCategoryHistory
          ? "These source-bound Louisiana consumers use separate disposition, charge, timing, redaction and automation-status facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility."
        : kyCategoryHistory
          ? "These source-bound Kentucky consumers use separate charge, disposition, offense-level and timing facts. Earlier categories remain optional literal history and establish neither statutory classification nor eligibility."
          : arCategoryHistory
          ? "These source-bound Arkansas consumers do not bind a generic offense category to a document or a value-level rule. Earlier answers remain optional literal history; record origin, disposition, offense level, timing and exclusion facts remain separate."
          : wy1502CategoryHistory
          ? "Earlier categories remain literal history. They establish neither the final conviction statute, a completed deferral, the ten-year clock, grouping nor any 1502 exclusion or permission."
          : sdSisCategoryHistory
          ? "The SIS order, discharge and dismissal, public status, prior history and conditional licence facts are separate inputs. Earlier categories remain literal history and establish neither SIS nor the deferred drug procedure."
          : ilProstitutionCategoryHistory
          ? "The final conviction record fact is separate from earlier broad categories. Retained categories establish neither Class 4 prostitution, trafficking circumstances, sentence completion nor eligibility."
          : hiCategoryHistory
          ? "These source-bound Hawaii consumers use separate disposition, charge and court-order facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility."
          : iaCategoryHistory
          ? "These source-bound Iowa consumers use separate charge, disposition, age and timing facts. Earlier offense categories remain optional literal history and establish neither statutory classification nor eligibility."
          : alCategoryHistory
          ? "These source-bound Alabama guidance consumers do not bind an offense category to a document. Earlier category answers remain optional literal history; disposition, pardon, trafficking and exclusion facts remain separate."
          : nvProgramCategoryHistory
          ? "This program family uses its separate named-charge, final-disposition and subsection 3 facts. Earlier broad categories remain optional literal history; they establish neither program participation, the branch, a statutory bar nor the waiting period."
          : ctPetitionCategoryHistory
          ? "Final per-count citations, conduct dates and recorded historical class/maximum are separate review inputs. Earlier categories remain optional literal history and establish no eligibility, exclusions or waiting period."
          : gaSb288CategoryHistory
          ? "The final conviction citations, count and specific arrest-age and four-year facts are separate review inputs. Earlier broad categories remain optional literal history and establish no statutory classification."
          : msCategoryHistory
          ? "These source-bound lower-court branches use the target court, conviction list and last-conviction facts. Earlier category answers remain optional literal history; they establish neither the court branch, good conduct, timing nor a discretionary finding."
          : ilCategoryHistory
          ? "This source-bound mistaken-identity petition uses the separate identity report, mismatched identifiers and arrest circuit. Earlier category answers remain optional literal history; they establish neither identity theft nor ordinary expungement eligibility."
          : dcCategoryHistory ? "This source-bound actual-innocence motion uses the separate innocence basis and exact charge/level facts. Earlier category answers remain optional literal history with no document binding or innocence finding."
          : "This source-bound consumer gives general erasure information, not an individual classification or filing. Earlier category answers remain optional literal history; exact statutory, count, date and exclusion facts remain unestablished." });
      continue;
    }
    if (ksMunicipalCategoryContext && factId === "offense_category" && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !needsSavedAnswerClarification) {
      facts.push({ factId, collection: "conditional", phase: "render", active: true, optional: true, group,
        source: "ks_municipal_literal_category_context",
        reason: "The category is optional literal context with no document mapping. It supplies no ordinance, statutory ground or state-equivalent offense finding; those source requirements remain separate." });
      continue;
    }
    if (msFirstContext && !overrideClass && !needsHuman.has(factId) && !unresolvedScopeFor(factId)) {
      // GA-16-M01514 / Q-7aaf83fbc78f127f31d1: preserve literal history without supplying source facts.
      if (factId === "residency_or_location" && !decidesRouteFor(factId) && !input.recordOwnQuestionIds?.has(factId)) {
        const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
          .some(answers => answers && Object.hasOwn(answers, factId));
        facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
          group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
          source: "ms_first_location_history",
          reason: "Earlier generic location remains optional literal context. Separate jurisdiction, conviction-court, county or municipality, mailing and prosecutor-service facts retain their own meanings." });
        continue;
      }
      if (factId === "offense_category") {
        facts.push({ factId, collection: "conditional", phase: "known", active: false, optional: true, group,
          source: "ms_first_offender_legacy_category_context",
          reason: "The exact offense and separate source facts supply this procedure's classification. Retain the category literally; it supplies no traffic, history, finality or official-duty finding and has no document mapping." });
        continue;
      }
      const question = msFirstQuestions.get(factId);
      if (question) {
        const saved = input.savedAnswers && Object.hasOwn(input.savedAnswers, factId);
        const raw = saved ? input.savedAnswers![factId] : available[factId];
        const value = !needsSavedAnswerClarification && questionAnswerState(question, raw) === "known_valid" ? scalarAnswerText(raw) : null;
        if (value && !saved && mayMaterialize(factId, true)) known[factId] = value;
        facts.push({ factId, collection: value && !saved ? "already_known" : "prepay_confirmation",
          phase: value && !saved ? "known" : "prepay_confirmation", group, active: true,
          ...(value ? { value } : {}), source: "ms_first_offender_source_fact", reason: MS_FIRST_OFFENDER_SOURCE + "; participant facts for this conviction; no platform certification, signing, upload or fulfillment authority" });
        continue;
      }
    }
    if (ohJuvenileContext && !overrideClass && !needsHuman.has(factId)) {
      if (factId === "court" && ohJuvenileStageFacts(ohJuvenileAnswers).code === "information") {
        facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
          source: "oh_juvenile_information_court_context", reason: "The explicit information request retains the generic court answer without treating it as a juvenile court, filing destination or application fact. Application timing, venue and documents remain unresolved." });
        continue;
      }
      if ((OH_JUVENILE_STAGE_IDS as readonly string[]).includes(factId)) {
        const active = ohJuvenileActiveIds.includes(factId);
        const value = resolvedText(factId);
        facts.push({ factId, collection: active ? value ? "already_known" : "prepay_confirmation" : "conditional",
          phase: active ? value ? "known" : "prepay_confirmation" : "known", group: active ? group : null,
          active, ...(active ? { optional: true as const } : {}), ...(value ? { value } : {}), source: "oh_juvenile_requested_stage",
          reason: "The requested service, actual record forum and existing sealing order are distinct participant facts. Saving them does not establish eligibility, timing, venue, rehabilitation, a prepared application or payment authority." });
        continue;
      }
    }
    if (mdPoliceSourceContext && !overrideClass && !needsHuman.has(factId)) {
      if (["county", "court", "financial_obligations", "sentence_completion_date", "court_requirements_completed", "resolved_timing_bucket"].includes(factId)) {
        facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
          source: "md_police_retained_context", reason: "Earlier generic context is retained without selecting an agency, denial court, new request, filing venue or individual relief. The adopted source stages do not require this fact for their current information or help consumer." });
        continue;
      }
      if (["arrest_date", ...MD_POLICE_IDS].includes(factId)) {
        const active = mdPoliceActiveIds.includes(factId);
        const value = resolvedText(factId);
        if (active && value && mayMaterialize(factId, true)) known[factId] = value;
        facts.push({ factId, collection: active ? value ? "already_known" : "prepay_confirmation" : "conditional",
          phase: active ? value ? "known" : "prepay_confirmation" : "known", group: active ? group : null,
          active, ...(value ? { value } : {}), source: "md_police_source_stage",
          reason: "Source-stage facts distinguish current automatic police-record information from the closed historical request window; ordinary claims do not establish verified relief, timeliness, agency compliance or any filing authority." });
        continue;
      }
    }
    // Protected source-stage controls use the same supported choice/date state
    // and saved precedence; never parse old narrative source questions.
    const mnStageQuestion = mnStageQuestionsById.get(factId);
    if (mnTwoCountyContext && mnStageQuestion && !overrideClass && !needsHuman.has(factId)
      && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)) {
      const saved = input.savedAnswers && Object.hasOwn(input.savedAnswers, factId);
      const raw = saved ? input.savedAnswers![factId] : available[factId];
      const value = !input.unresolvedSavedFactIds?.has(factId) && questionAnswerState(mnStageQuestion, raw) === "known_valid" ? answerString(raw) : "";
      if (value && !saved && mayMaterialize(factId, true)) known[factId] = value;
      facts.push({ factId, collection: value && !saved ? "already_known" : "render_required",
        phase: value && !saved ? "known" : "render", group: "court_and_case_number", active: true,
        ...(value ? { value } : {}), source: "mn_protected_source_stage_fact",
        reason: "Explicit participant record/stage fact; held candidate only. " + (mnStageCandidate?.holds.join("; ") ?? "source stage unresolved") });
      continue;
    }
    // The adopted source requires distinct case-county/prosecutor inputs.
    // No legacy location/county/city answer is an attestation of these facts.
    if (mnTwoCountyContext && !overrideClass && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)) {
      if (factId === "residency_or_location" && mnTwoCountyIds.every(id => requiredInputIds.includes(id))) {
        facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
          source: "mn_two_county_legacy_context", reason: "Legacy location is retained unchanged. Distinct required case-county and prosecuting-authority facts replace its destination purpose; this value does not establish record origin, venue, agreement or a programme." });
        continue;
      }
      const sourceQuestion = mnTwoCountyQuestionsById.get(factId);
      if (sourceQuestion) {
        const saved = input.savedAnswers && Object.hasOwn(input.savedAnswers, factId);
        const raw = saved ? input.savedAnswers![factId] : available[factId];
        const value = !input.unresolvedSavedFactIds?.has(factId) && questionAnswerState(sourceQuestion, raw) === "known_valid" ? answerString(raw) : "";
        const kindRaw = input.savedAnswers && Object.hasOwn(input.savedAnswers, MN_PROSECUTOR_KIND)
          ? input.savedAnswers[MN_PROSECUTOR_KIND] : available[MN_PROSECUTOR_KIND];
        const active = factId !== MN_PROSECUTING_CITY || kindRaw === "city_attorney" && !input.unresolvedSavedFactIds?.has(MN_PROSECUTOR_KIND);
        if (active && value && !saved && mayMaterialize(factId, true)) known[factId] = value;
        facts.push({ factId, collection: !active ? "conditional" : value && !saved ? "already_known" : "render_required",
          phase: !active || value && !saved ? "known" : "render", group: active ? "court_and_case_number" : null,
          active, ...(value ? { value } : {}), source: "mn_two_county_source_fact",
          reason: MN_TWO_COUNTY_SOURCE + "; collection for review only, not an authority directory, source-stage selection, prosecutor agreement or document mapping" });
        continue;
      }
    }
    if (mnCannabisLocationContext && factId === "residency_or_location" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mn_cannabis_location_retained_context",
        reason: "Generic location is optional retained context. The BCA automatic cannabis and Cannabis Expungement Board stages have no participant application or filing venue; this value does not establish the source stage, actor, cannabis record facts or qualification." });
      continue;
    }
    if (mn609a017LocationContext && factId === "residency_or_location" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mn_609a017_location_retained_context",
        reason: "Generic location is optional retained context. Identity-correction guidance has no participant filing venue; this value does not identify the court record, ID-data agency, source track or legal determination." });
      continue;
    }
    if (mn299c11LocationContext && factId === "residency_or_location" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mn_299c11_location_retained_context",
        reason: "Generic location is optional retained context. The agency demand has no court venue; this value does not identify the arresting agency, actual records custodians or an independent filing destination." });
      continue;
    }
    if (mn609a015LocationContext && factId === "residency_or_location" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mn_609a015_location_retained_context",
        reason: "Generic location is optional retained context. This automatic track has no participant filing or venue; the value does not supply record origin or an independent petition destination." });
      continue;
    }
    if (moXivCourtContext && factId === "court" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mo_xiv_court_retained_context",
        reason: "Generic court text is optional record-location context for this completed-incarceration-and-supervision status check; it does not establish a conditional CR375 filing destination or per-conviction court." });
      continue;
    }
    if (mo610122CourtContext && factId === "court" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mo_610122_court_retained_context",
        reason: "Generic historical court text is optional retained context in this held, unmapped consumer; it does not establish the county-of-arrest civil-division filing destination or distinct source-form court fields." });
      continue;
    }
    if (mo610105CourtContext && factId === "court" && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "mo_610105_court_retained_context",
        reason: "Generic court text is optional context for locating the originating record. This status-guidance route has no participant court filing or mapped filing destination." });
      continue;
    }
    if (vaVictimContext && factId === VA_VICTIM_STATUS_ID && !overrideClass && !needsHuman.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "va_three_routes_victim_status_retained_context",
        reason: "Victim status is not an offense classification or a required fact of these exact procedures. Saved answers remain context without supplying a charge, exclusion, statutory qualification or authority." });
      continue;
    }

    if (input.ndFirstOffenseSourceOwnedInputs === true && input.jurisdiction === "ND"
      && input.pathwayId === "first-offense-possession-sealing"
      && ["contact_information", "residency_or_location"].includes(factId)
      && !input.routeDecidingFactIds?.has(factId) && !input.unresolvedRouteFactIds?.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "nd_first_offense_existing_family_owned_destinations",
        reason: factId === "contact_information"
          ? "The adopted first-offense motion has separate optional participant contact destinations, with no service duty stated by the subsection. Earlier service-address prose remains history and is not treated as mailing address."
          : "The adopted motion has distinct county and court-type blanks for completion before filing. Earlier county-or-district prose remains history; it supplies neither fact and creates no new intake gate." });
      continue;
    }

    if (input.ctCleanSlateSeparateContact === true && input.jurisdiction === "CT"
      && input.pathwayId === "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202"
      && factId === "contact_information" && !input.routeDecidingFactIds?.has(factId) && !input.unresolvedRouteFactIds?.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "ct_jdcr202_separate_defendant_contact_fields",
        reason: "JD-CR-202 has separate defendant address, phone and email fields. The earlier aggregate remains history, is never parsed, and is not an eligibility predicate." });
      continue;
    }

    if (input.ksMunicipalSeparateContact === true && isKsMunicipalContact(input.jurisdiction, input.pathwayId)
      && factId === "contact_information" && !input.routeDecidingFactIds?.has(factId) && !input.unresolvedRouteFactIds?.has(factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null, active: false,
        source: "ks_municipal_separate_petitioner_contact_fields",
        reason: "The existing municipal pleading map has separate petitioner address, phone and email fields. The earlier aggregate remains history, is never parsed, and is not an eligibility predicate." });
      continue;
    }

    // §29-3523(3)(c)(iii), (7) has no payment predicate for an adult
    // acquittal's automatic record process. The separately guarded juvenile
    // routing-only guidance node likewise asks no financial input. Keep raw history;
    // its inactive disposition supplies no paid/waived value or authority.
    if (!nebraskaNonconvictionQuestionApplies(input.jurisdiction, input.pathwayId, {
      case_outcome: resolvedText("case_outcome"), age_at_offense: resolvedText("age_at_offense")
    }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: input.pathwayId === "juvenile-automatic-sealing"
          ? "ne_juvenile_routing_guidance_no_financial_input" : "ne_adult_acquittal_no_financial_predicate", active: false,
        reason: input.pathwayId === "juvenile-automatic-sealing"
          ? "The exact juvenile routing-only guidance node asks no financial input; retain the saved payment answer without inferring completion or sealing eligibility."
          : "The exact adult acquittal automatic route has no financial predicate; the saved payment answer is retained without inference." });
      continue;
    }

    const wyProfile=input.jurisdiction==="WY"?getProfileByJurisdiction("WY"):null;
    if(wyProfile&&wy1501Context(wyProfile,input.pathwayId,{...available,...input.savedAnswers})) {
      if(!wy1501QuestionApplies(wyProfile,input.pathwayId,{...available,...input.savedAnswers},factId)) {
        facts.push({factId,collection:"conditional",phase:"known",group:null,source:"wy_1501_inactive_fact_history",active:false,optional:true,reason:"The exact sentence-term expiration facts control this petition. Generic historical payment/completion answers remain unchanged and establish no paid, waived or expired condition."});continue;
      }
      if(WY_1501_FACT_IDS.includes(factId)) {
        facts.push({factId,collection:"prepay_confirmation",phase:"prepay_confirmation",group:"about_you",source:"wy_1501_source_facts",active:true,reason:"Source-owned statute, disposition and expiration facts for this verified petition; no filing, output approval or payment authority is inferred."});continue;
      }
    }
    if(wyProfile && wy1401Context(wyProfile,input.pathwayId,{...available,...input.savedAnswers})) {
      if(!wy1401QuestionApplies(wyProfile,input.pathwayId,{...available,...input.savedAnswers},factId)) {
        facts.push({factId,collection:"conditional",phase:"known",group:null,source:"wy_1401_inactive_fact_history",active:false,optional:true,
          reason:"This fact is not active for the current incident branch. Its original raw answer remains history without inferred payment, completion, waiver or disposition."});
        continue;
      }
      if(WY_1401_FACT_IDS.includes(factId)) {
        facts.push({factId,collection:"prepay_confirmation",phase:"prepay_confirmation",group:"about_you",source:"wy_1401_incident_facts",active:true,
          reason:"The participant may correct the actual incident facts for the source-bound verified-petition review; this does not complete a document or grant authority."});
        continue;
      }
    }

    const okGuidanceProfile = input.jurisdiction === "OK" && factId === "financial_obligations"
      ? getProfileByJurisdiction("OK") : null;
    if (okGuidanceProfile && !oklahomaCleanSlateFinancialApplies(okGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "ok_clean_slate_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness is not a prerequisite to this exact noncommercial guidance. Saved payment remains history; victim-restitution objections, source categories and operational limitations remain separate." });
      continue;
    }

    const txGuidanceProfile = input.jurisdiction === "TX" && factId === "financial_obligations"
      ? getProfileByJurisdiction("TX") : null;
    if (txGuidanceProfile && !texasGuidanceFinancialApplies(txGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "tx_informational_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness does not gate this status/correction guidance. Placement, actual discharge, exclusions and the separate $28/Rule145 issuance procedure remain distinct; no completed order or payment authority is inferred." });
      continue;
    }

    const wvGuidanceProfile = input.jurisdiction === "WV" && factId === "financial_obligations"
      ? getProfileByJurisdiction("WV") : null;
    if (wvGuidanceProfile && !westVirginiaGuidanceFinancialApplies(wvGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "wv_informational_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness does not gate this status/correction guidance. Full pardon, separate pardon/discharge clocks, exclusions and publication/service costs remain separate; no completed relief or universal nondisclosure is inferred." });
      continue;
    }

    const sdGuidanceProfile = input.jurisdiction === "SD" && factId === "financial_obligations"
      ? getProfileByJurisdiction("SD") : null;
    if (sdGuidanceProfile && !southDakotaGuidanceFinancialApplies(sdGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "sd_informational_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness does not gate this status/correction guidance. Highest charge, all court conditions, five years/no further convictions and Chapter 24-14 pardon scope/certificate remain separate; no completed relief is inferred." });
      continue;
    }

    const scGuidanceProfile = input.jurisdiction === "SC" && factId === "financial_obligations"
      ? getProfileByJurisdiction("SC") : null;
    if (scGuidanceProfile && !southCarolinaGuidanceFinancialApplies(scGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "sc_informational_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness does not gate this status/correction guidance. Distinct program completion/fees and pardon conditions remain separate; no statutory branch, eligibility, erasure or sealing is inferred." });
      continue;
    }

    const njStatusProfile = input.jurisdiction === "NJ" && factId === "financial_obligations"
      ? getProfileByJurisdiction("NJ") : null;
    if (njStatusProfile && !newJerseyMarijuanaStatusFinancialApplies(njStatusProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "nj_marijuana_status_guidance_no_payment_predicate", active: false,
        reason: "Generic payment completeness does not gate this status/correction guidance. Saved assessments and completion facts remain separate; no statutory branch, eligibility or sealing is inferred." });
      continue;
    }

    const nmGuidanceProfile = input.jurisdiction === "NM" && factId === "financial_obligations"
      ? getProfileByJurisdiction("NM") : null;
    if (nmGuidanceProfile && !newMexicoGuidanceFinancialApplies(nmGuidanceProfile, input.pathwayId,
      { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "nm_source_guidance_no_payment_predicate", active: false,
        reason: "Payment completeness is not required for this exact guidance scope. Saved payment remains history, without completion, waiver, restitution, eligibility or agency-action inference." });
      continue;
    }

    const mtRecordProfile = input.jurisdiction === "MT" && factId === "financial_obligations"
      ? getProfileByJurisdiction("MT") : null;
    if (mtRecordProfile && !input.unresolvedSavedFactIds?.has("case_outcome")
      && !montanaRecordFinancialApplies(mtRecordProfile, input.pathwayId,
        { ...available, ...input.savedAnswers }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "mt_nonconviction_record_correction_no_payment_predicate", active: false,
        reason: "The exact nonconviction administrative record process has no literal-payment prerequisite. The original payment answer remains history and supplies no completion, waiver, restitution status, or authority." });
      continue;
    }

    if (input.montanaDeferredFinancialFacts === true && input.jurisdiction === "MT"
      && input.pathwayId === "deferred-sentence-dismissal-or-confidentiality-route" && factId === "financial_obligations") {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "mt_deferred_current_order_financial_facts", active: false,
        reason: "Exact deferred-order facts use the current court-order financial status; the historical paid-only answer remains preserved." });
      continue;
    }
    if (input.missouriMarijuanaStatusOnly === true && input.jurisdiction === "MO"
      && input.pathwayId === "marijuana-expungement-under-missouri-constitution-article-xiv" && factId === "financial_obligations") {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "mo_article_xiv_nonincarcerated_status_no_financial_predicate", active: false,
        reason: "The exact nonincarcerated Article XIV status branch has no financial predicate; the original answer is retained without inference." });
      continue;
    }

    if (input.missouriClosureStatusOnly === true && input.jurisdiction === "MO"
      && input.pathwayId === "closed-record-outcome-under-rsmo-610-105" && factId === "financial_obligations") {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "mo_closure_status_no_financial_predicate", active: false,
        reason: "The adopted selected Missouri closure-status guidance has no financial predicate; the original payment answer is retained without inference." });
      continue;
    }

    if (!maineNonconvictionQuestionApplies(input.jurisdiction, input.pathwayId, {
      case_outcome: resolvedText("case_outcome"), age_at_offense: resolvedText("age_at_offense")
    }, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "me_adult_acquittal_no_financial_predicate", active: false,
        reason: "The adult acquittal record-information guidance has no financial predicate; the original payment answer is retained without inference." });
      continue;
    }

    if (!louisianaAutomationStatusQuestionApplies(input.jurisdiction, input.pathwayId, factId)) {
      facts.push({ factId, collection: "conditional", phase: "known", group: null,
        source: "la_985_2_operationally_gated_status_guidance", active: false,
        reason: "Payment is not required to read the operationally gated status guidance; the original financial answer is retained without inference." });
      continue;
    }

    // 2. Fields another actor fills, later. Never a participant question.
    const actor = externalActorById.get(factId);
    if (input.ndFirstOffenseSourceOwnedInputs === true
      && input.jurisdiction === "ND" && input.pathwayId === "first-offense-possession-sealing"
      && input.ndFirstOffenseStatutoryFactIds?.has(factId)
      && ND_FIRST_OFFENSE_FACT_IDS.includes(factId) && actor === "participant_before_filing" && !overrideClass) {
      facts.push({ factId, collection: "prepay_confirmation", phase: "prepay_confirmation", group,
        source: "nd_first_offense_statutory_correction",
        reason: "The participant may correct this source-defined legal fact. Its filing slot remains a separate before-filing handback; collection does not populate the document or authorize payment." });
      continue;
    }
    if (actor || overrideClass === "external_actor") {
      facts.push({
        factId,
        collection: "external_actor",
        phase: "external",
        group: null,
        source: "packet_specification_field_ownership",
        actor: actor ?? "external",
        reason: `the specification assigns this field to ${actor ?? "an external actor"}`
      });
      continue;
    }

    if (alClassification && !overrideClass && !needsHuman.has(factId)) {
      if (factId === "offense_category") {
        const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
          .some(answers => answers && Object.hasOwn(answers, factId));
        facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
          group: retained ? group : null, active: retained, optional: true,
          source: "al_redeemer_category_history",
          reason: "Separate source-defined classifications cannot be supplied by an old generic category or charge grade. Preserve that answer only as optional history; no form condition or route authority is inferred." });
        continue;
      }
      if (AL_REDEEMER_CLASSIFICATION_IDS.includes(factId)) {
        facts.push({ factId, collection: "prepay_confirmation", phase: "prepay_confirmation", group,
          source: "al_redeemer_participant_classification",
          reason: "A participant-supplied statutory classification with its own conditional meaning. Unknown answers remain unresolved; this collection neither selects CR-65 conditions nor establishes eligibility or commercial authority." });
        continue;
      }
    }

    if (factId === "record_type" && alRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "al_four_route_record_type_history",
        reason: "The exact retained Alabama families have no destination for the overlapping generic record-type menu. Saved answers remain optional history; specific disposition, conviction, pardon and trafficking facts and current route authority remain separate." });
      continue;
    }

    if (factId === "court" && ohTraffickingCourtContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "oh_trafficking_court_history",
        reason: "The exact adopted survivor guidance prepares no court application. Earlier court answers remain optional context, not a filing prerequisite, trafficking finding or authorization." });
      continue;
    }

    if (factId === "record_type" && arNonconvictionRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ar_nonconviction_record_type_history",
        reason: "The exact retained Arkansas nonconviction family has no destination for the overlapping generic record-type menu. Saved answers remain optional history; disposition, record origin, filing facts and current route authority remain separate." });
      continue;
    }

    if (factId === "record_type" && arFelonyRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ar_felony_record_type_history",
        reason: "The exact retained Arkansas felony family has no destination for the overlapping generic record-type menu. Saved answers remain optional history; conviction, record origin, sentencing facts and current route authority remain separate." });
      continue;
    }

    if (ca12034RecordContext
      && !overrideClass && !needsHuman.has(factId)
      && (factId === "record_type" || !ca12034QuestionApplies(getProfileByJurisdiction(input.jurisdiction)!, input.pathwayId,
        {...input.screeningAnswers,...input.prefilledAnswers,...input.savedAnswers},factId))) {
      const retained = [input.screeningAnswers,input.prefilledAnswers,input.savedAnswers,input.profileFacts]
        .some(map=>map && Object.hasOwn(map,factId));
      facts.push({factId,collection:"conditional",phase:factId === "record_type" && retained ? "render":"known",
        group:factId === "record_type" && retained ? group:null,
        active:factId === "record_type" && retained,optional:true,source:"ca_12034_specific_probation_facts",
        reason:"The specific conviction, probation, current-status and requested-election facts govern this procedure. Earlier taxonomy and broad completion answers remain history, not substitutes or debt gates."});
      continue;
    }

    if (factId === "record_type" && caTool4RecordHistory && !overrideClass && !needsHuman.has(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ca_tool4_record_type_history",
        reason: "The earlier overlapping labels do not select an arrest-sealing procedure or establish a final disposition. They remain optional history; current route results and fulfillment authority remain separate." });
      continue;
    }

    if (factId === "record_type" && coPetitionRecordHistory && !overrideClass && !needsHuman.has(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "co_petition_record_type_history",
        reason: "Earlier overlapping labels do not establish a disposition or select a sealing procedure. They remain optional history; the existing petition result and fulfillment authority remain separate." });
      continue;
    }

    if (factId === "record_type" && dcFlPetitionRecordHistory && !overrideClass && !needsHuman.has(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "dc_fl_petition_record_type_history",
        reason: "Earlier overlapping labels do not establish a disposition or select a procedure. They remain optional history; the existing route result and fulfillment refusal remain unchanged." });
      continue;
    }

    if (factId === "record_type" && dcFelonyRecordHistory && !overrideClass && !needsHuman.has(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "dc_felony_record_type_history",
        reason: "Earlier overlapping labels do not establish a disposition or select a sealing procedure. They remain optional history; the intentional unsupported-route result and fulfillment refusal remain unchanged." });
      continue;
    }

    if (factId === "record_type" && caTool3RecordHistory && !overrideClass && !needsHuman.has(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ca_tool3_record_type_history",
        reason: "This exact held route has no registered record-type destination or exclusive taxonomy consumer. Earlier overlapping labels remain literal history; case disposition and current authority remain separate." });
      continue;
    }

    if (factId === "record_type" && caAutomaticRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ca_automatic_record_type_history",
        reason: "The exact California automatic no-filing guidance does not consume the overlapping generic taxonomy. Saved answers remain optional history, not recordTypeSought, relief status or a selection of the separate DOJ correction branch." });
      continue;
    }

    if (factId === "record_type" && ca12034aRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ca_12034a_record_type_history",
        reason: "The exact retained California section 1203.4a family has no destination for the overlapping generic record-type menu. Saved answers remain optional history; probation, conviction, sentence and relief facts and current route authority remain separate." });
      continue;
    }

    if (factId === AK_LEGACY_RECORD_TYPE && akAgencyOrSisContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ak_agency_sis_record_type_history",
        reason: "The exact retained agency/SIS family has no destination for the overlapping generic record-type menu. Saved answers remain optional history without establishing identity-error or SIS facts or changing current route authority." });
      continue;
    }

    if (factId === AK_LEGACY_RECORD_TYPE && akJuvenileContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ak_juvenile_record_type_history",
        reason: "The exact adopted juvenile guidance uses the distinct juvenileRecord fact, not the overlapping generic record-type menu. Saved answers remain optional history without establishing juvenile status or changing the unsupported filing scope." });
      continue;
    }

    if (factId === AK_LEGACY_RECORD_TYPE && akPardonContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ak_pardon_record_type_history",
        reason: "The exact adopted pardon guidance consumes conviction details and specific source facts, not the overlapping generic record-type menu. Saved answers remain optional history without selecting a remedy or application." });
      continue;
    }

    if (factId === AK_LEGACY_RECORD_TYPE && akRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: "ak_courtview_record_type_history",
        reason: "The exact retained TF-810 source map does not consume the generic record-type menu. Earlier answers remain optional history; no removal ground, disposition or document value is inferred." });
      continue;
    }

    if (factId === ND_LEGACY_RECORD_TYPE && ndRecordContext && !overrideClass && !needsHuman.has(factId)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "nd_first_offense_record_type_history",
        reason: "The exact adopted four-component packet does not consume the inherited record-type menu. An earlier independent answer remains optional history; no answer, disposition or eligibility is inferred." });
      continue;
    }

    // GA-16-M01616 / Q-a2f3f43ff3e49ae2ce48: court/county are separate later-actor fields.
    if (factId === "residency_or_location" && sdSisCategoryHistory && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "sd_sis_location_history",
        reason: "Earlier generic location remains optional literal context, never the original court, county, mailing address or a document value. Court/county handbacks and conditional enforcement retain their separate source ownership." });
      continue;
    }

    // GA-16-M01571 / Q-3243544293c0222d2708: the exact NV family has separate court/contact facts.
    if (factId === "residency_or_location" && nvProgramCategoryHistory && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "nv_program_location_history",
        reason: "Earlier generic location remains optional literal context, never a court, county, mailing address, agency or document value. Exact court and agency handbacks retain their separate source ownership." });
      continue;
    }

    // GA-16-M01461 / Q-39a50c13c26e2446fc45: the arrest circuit is a separate source fact.
    if (factId === "residency_or_location" && ilCategoryHistory && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "il_identity_location_history",
        reason: "Earlier generic location remains optional literal context, never the arrest circuit, mailing address or a document value. The circuit-court handbacks retain their separate source ownership." });
      continue;
    }

    // GA-16-M01508 / Q-1fd626b49f5c694da45b and M01510 / Q-8da4428f5701a867dcca.
    if (factId === "residency_or_location" && msCategoryHistory && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "ms_additional_location_history",
        reason: "Earlier generic location remains optional literal context, never the conviction court, its county or municipality, mailing address or service address. The two statutory branches and source-owned handbacks remain separate." });
      continue;
    }

    // GA-16-M01455 / Q-921725114b8166900e39: jurisdiction and caption facts have separate consumers.
    if (factId === "residency_or_location" && gaSb288CategoryHistory && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "ga_sb288_location_history",
        reason: "Earlier generic location remains optional literal context. The existing case-jurisdiction gate and separate convicting-court, county, mailing and prosecutor-service facts retain their own meanings." });
      continue;
    }

    // GA-16-M01643 / Q-aae46f53eb742ee526b6: a known record origin is not a receiving court.
    if (factId === "residency_or_location" && vaPardonLocationContext && !overrideClass
      && !needsHuman.has(factId) && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "va_pardon_location_history",
        reason: "Earlier generic location remains optional literal context. The adopted record-origin fact, actual pardon and receiving-court/case facts stay separate; this context supplies no court form or fulfillment authority." });
      continue;
    }

    if (factId === DC_LEGACY_LOCATION && dcLocationContext && !overrideClass && !needsHuman.has(factId)
      && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)) {
      facts.push({ factId, collection: "conditional", phase: retainedDcLocation ? "render" : "known",
        group: retainedDcLocation ? group : null, active: retainedDcLocation,
        ...(retainedDcLocation ? { optional: true } : {}), source: "dc_fixed_caption_location_context",
        reason: "The motion has a fixed court caption and separate mailing and prosecutor-service facts; an earlier generic location remains optional editable context, never a document value." });
      continue;
    }

    // GA-02 replaced a broad category inference with exact conviction and
    // exception questions. Retain every old category answer without making
    // a new participant answer a gate, or deriving it from offense_level.
    if (factId === "offense_category" && !overrideClass && !needsHuman.has(factId)
      && georgiaPardonCategoryIsContext(input.jurisdiction, input.pathwayId, specification)) {
      const retained = [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.prototype.hasOwnProperty.call(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, ...(retained ? { optional: true } : {}),
        source: "ga_pardon_exact_record_category_context",
        reason: "The exact final citation and specific statutory facts decide this pardon route; an earlier independent category remains optional editable context, never a derived legal classification." });
      continue;
    }

    // 3. A fact a human must still classify is reported, never guessed at.
    if (needsHuman.has(factId)) {
      facts.push({
        factId,
        collection: "unresolved",
        phase: "render",
        group,
        source: "route_override",
        reason: override?.note ?? "the route override defers this fact to human classification"
      });
      continue;
    }

    // Only an explicit source declaration can make a visible participant
    // control optional. A route predicate or mandatory document consumer wins.
    const mandatoryConsumer = specFact?.requiredForGeneration === false && input.specification?.documents.some(document => (document.sections ?? []).some(section =>
      (section.fields?.includes(factId) && section.fieldTreatments?.[factId] !== "value_or_ruled_blank")
      || JSON.stringify(section).includes(`{{${factId}}}`)
      || section.assertions?.some(assertion => assertion.facts.includes(factId))
      || section.captionContract?.court === factId || section.captionContract?.caseNumber === factId
      || section.captionContract?.courtLines?.some(line => line.field === factId)));
    if (specFact?.requiredForGeneration === false && specFact.ownership === "participant"
      && !mandatoryConsumer && !decidesRouteFor(factId) && !unresolvedScopeFor(factId)
      && !input.materializationProtectedFactIds?.has(factId) && !overrideClass) {
      facts.push({ factId, collection: "conditional", phase: "render", group, optional: true,
        source: "packet_specification_optional_generation",
        reason: "the source permits an unknown value; the participant may supply or edit it without blocking generation" });
      continue;
    }

    // The aggregate is only a representation on these reviewed contracts. All
    // three participant-owned components remain independently required/editable.
    if (factId === "contact_information" && input.reviewedContactRepresentation === true
      && !decidesRouteFor(factId) && !unresolvedScopeFor(factId) && overrideClass !== "prepay_confirmation") {
      const rule = DERIVATIONS.contact_information;
      const components = Object.fromEntries(rule.from.map((id) => [id, resolvedText(id)]));
      const value = rule.from.every((id) => components[id] && !isUnknownText(components[id])) ? rule.derive(components) : null;
      const retained = input.savedAnswers && factId in input.savedAnswers ? input.savedAnswers[factId] : available[factId];
      if (needsSavedAnswerClarification || retained !== undefined && retained !== null && retained !== ""
        && (!validValue(factId, retained) || !value || answerString(retained) !== value)) {
        contactReconciliation = { canUseComponents: value !== null };
        facts.push({ factId, collection: "prepay_confirmation", phase: "prepay_confirmation", group,
          source: "legacy_contact_conflict", reconciliation: "contact_components",
          reason: "the earlier contact answer differs; retain it until the participant explicitly chooses the component values" });
      } else {
        if (value) derived[factId] = value;
        facts.push({ factId, collection: "derived", phase: "derived", group: null,
          source: "derived_from:mailing_address+phone_number+email_address", ...(value ? { value } : {}),
          derivation: { state: value ? "valid" : "pending", inputFactIds: [...rule.from] },
          reason: "the reviewed document contract uses these three contact components; the legacy aggregate is their exact representation" });
      }
      continue;
    }

    if (input.recordOwnQuestionIds?.has(factId)) {
      facts.push({ factId, collection: "prepay_confirmation", phase: "prepay_confirmation", group,
        source: "distinct_record_question_contract", reason: "the original record question has a distinct meaning; preserve its answer and require scoped review when its source changes" });
      continue;
    }

    // 4. Something the participant has already told us, under this id or a
    //    screening id that carries the same answer.
    const candidateCarry = needsSavedAnswerClarification || factId === "social_security_number_last_four" && requiredInputIds.includes("social_security_number") || input.savedAnswers && factId in input.savedAnswers
      ? null : carriedValue(factId, available, input.screeningAnswers);
    const carried = candidateCarry && validValue(factId, candidateCarry.value) ? candidateCarry : null;
    if (unresolvedScopeFor(factId) && !decidesRouteFor(factId) && !carried?.sameId) {
      // A reviewed route-specific document consumer can establish collection
      // purpose without resolving the source rule as an eligibility predicate.
      // Keep this before cross-fact carry/derivation: the original unresolved
      // materialization guard still applies even when the purpose is known.
      const reviewedRender = overrideClass === "render_required" && Boolean(override?.note?.trim());
      facts.push({
        factId,
        collection: reviewedRender ? "render_required" : "unresolved",
        phase: reviewedRender ? "render" : "prepay_confirmation",
        group,
        source: reviewedRender ? "route_override" : "unresolved_route_rule_scope",
        reason: reviewedRender ? override!.note! : "a rule references this required fact without an established route consumer; collect it without inferring a value or claiming it decides this route"
      });
      continue;
    }
    if (carried && carried.sameId === false && !mayMaterialize(factId, false)) {
      // A route fact this layer would have to synthesise from a different
      // answer. It is asked instead, so the evaluator only ever sees values
      // the participant actually gave.
      facts.push({
        factId,
        collection: "prepay_confirmation",
        phase: "prepay_confirmation",
        group,
        source: decidesRouteFor(factId) ? "route_decision_facts" : "materialization_protection",
        reason: decidesRouteFor(factId)
          ? "the evaluator reads this fact, so it is asked rather than carried across from a differently worded answer"
          : "this fact is protected against inference, so it is asked rather than carried across from a differently worded answer"
      });
      continue;
    }
    if (carried && overrideClass !== "prepay_confirmation") {
      known[factId] = carried.value;
      facts.push({
        factId,
        collection: "already_known",
        phase: "known",
        group: null,
        source: carried.source,
        value: carried.value,
        reason: carried.reason
      });
      continue;
    }

    // 5. Something that follows deterministically from a fact already resolved,
    //    or from facts this route is certain to collect.
    //
    //    The second case matters as much as the first. If every input a
    //    derivation reads is itself a required fact of this route, the answer
    //    is guaranteed to arrive, so asking for the derived fact as well is
    //    asking the same thing twice — which is precisely the defect being
    //    corrected. Such a fact is never asked; its value materialises when
    //    its inputs do, and completeness is carried by the inputs, which stay
    //    in the gate. A derivation whose inputs are NOT all collected here
    //    resolves only when it actually can, and otherwise the fact is asked.
    const derivation = needsSavedAnswerClarification ? undefined : DERIVATIONS[factId];
    if (derivation && !mayMaterialize(factId, false)) {
      facts.push({
        factId,
        collection: "prepay_confirmation",
        phase: "prepay_confirmation",
        group,
        source: decidesRouteFor(factId) ? "route_decision_facts" : "materialization_protection",
        reason: decidesRouteFor(factId)
          ? "the evaluator reads this fact, so it is asked rather than computed"
          : "this fact is protected against inference, so it is asked rather than computed"
      });
      continue;
    }
    if (derivation && overrideClass !== "prepay_confirmation") {
      const inputs: Record<string, string> = {};
      const complete = derivation.from.every((id) => {
        const text = resolvedText(id);
        inputs[id] = text;
        return text.length > 0 && !isUnknownText(text);
      });
      const value = complete ? derivation.derive(inputs) : null;
      const inputsAreCollectedHere = derivation.from.every((id) => requiredInputIds.includes(id));
      if (value) {
        derived[factId] = value;
        facts.push({
          factId,
          collection: "derived",
          phase: "derived",
          group: null,
          source: `derived_from:${derivation.from.join("+")}`,
          value,
          derivation: { state: "valid", inputFactIds: [...derivation.from] },
          reason: `this fact follows deterministically from ${derivation.from.join(" and ")}`
        });
        continue;
      }
      if (inputsAreCollectedHere) {
        facts.push({
          factId,
          collection: "derived",
          phase: "derived",
          group: null,
          source: `derived_from:${derivation.from.join("+")}`,
          derivation: { state: "pending", inputFactIds: [...derivation.from] },
          reason: `this fact follows deterministically from ${derivation.from.join(" and ")},`
            + " which this route collects, so it is computed rather than asked for a second time"
        });
        continue;
      }
    }

    // 6. A fact another answer makes irrelevant. It is not asked, and the
    //    disposition records why rather than leaving a hole.
    const conditionFactId = override?.conditions?.[factId] ?? GENERIC_CONDITIONS[factId];
    if (conditionFactId && requiredInputIds.includes(conditionFactId)) {
      const gate = resolvedText(conditionFactId);
      const expected = override?.conditionValues?.[factId];
      const active = gate.length === 0 || (expected === undefined ? isAffirmativeText(gate) : gate === expected);
      facts.push({
        factId,
        collection: "conditional",
        phase: active ? "render" : "known",
        group: active ? group : null,
        source: `conditional_on:${conditionFactId}`,
        condition: expected === undefined ? { factId: conditionFactId, satisfiedWhen: "affirmative" }
          : { factId: conditionFactId, satisfiedWhen: "equals", value: expected },
        active,
        reason: expected !== undefined ? `asked only when ${conditionFactId} is ${expected}; currently ${active ? "active" : "inactive"}` : active
          ? `asked only while ${conditionFactId} is affirmative, which it currently is or is not yet answered`
          : `${conditionFactId} is not affirmative, so this fact does not apply to this matter`
      });
      continue;
    }

    // 7. A filing-readiness state of an external record or office.
    const useText = String(specFact?.use ?? "");
    const useRule = USE_RULES.find((rule) => rule.test.test(useText));

    // Before it is classified: is this a question about whether an outside
    // chore is done? We already know a certified disposition has to be
    // fetched and inserted; making the participant confirm that they have not
    // fetched it yet, before we will build their petition, is intake friction
    // that buys the product nothing. The instruction belongs on the filing
    // checklist, not in packet information.
    //
    // The value still has to exist, because the specification prints these on
    // the attachment checklist and inside the certificate's service-address
    // sentence. It comes from the specification's OWN wording for the state of
    // not having been to the courthouse — "Not attached", "Not inserted", "To
    // be confirmed before filing or service" — and never from anything this
    // module makes up. That wording is also the conservative reading: the
    // product holds no confirmation, so it states none.
    const notYetAnswer = useRule?.collection === "filing_readiness"
      ? (specFact?.options ?? []).find((option) => typeof option === "string" && /^(not |to be )/i.test(option))
      : undefined;
    if (notYetAnswer && !overrideClass) {
      derived[factId] = notYetAnswer;
      facts.push({
        factId,
        collection: "derived",
        phase: "derived",
        group: null,
        source: "packet_specification_not_yet_state",
        value: notYetAnswer,
        reason: "the specification calls this an outside filing-readiness task and supplies its own wording for"
          + " the not-yet state, so the packet states that rather than asking the participant to report a chore"
          + " they have not done; the task itself is carried on the filing checklist"
      });
      continue;
    }
    // The specification outranks the name-shape guess: a fact the specification
    // describes is classified from what it says, never from how it is spelled.
    const filingByIdentity = !specFact && FILING_READINESS_IDENTITY.test(factId);
    if (overrideClass === "filing_readiness"
      || (!overrideClass && (useRule?.collection === "filing_readiness" || (filingByIdentity && useRule?.collection !== "prepay_confirmation")))) {
      facts.push({
        factId,
        collection: "filing_readiness",
        phase: "filing",
        // Its own section, chosen the same way every other fact's is. Being a
        // readiness state changes what the fact is called, not where in the
        // packet it belongs.
        group,
        source: useRule?.collection === "filing_readiness" ? "packet_specification_use" : "fact_identity",
        reason: useRule?.collection === "filing_readiness"
          ? useRule.reason
          : "this fact is the readiness state of an external record or office, needed before filing rather than before payment"
      });
      continue;
    }

    // 8. A fact that genuinely decides the paid route.
    const decidesRoute = input.routeDecidingFactIds?.has(factId) === true;
    if (overrideClass === "prepay_confirmation" || (!overrideClass && (useRule?.collection === "prepay_confirmation" || decidesRoute))) {
      facts.push({
        factId,
        collection: "prepay_confirmation",
        phase: "prepay_confirmation",
        group,
        source: useRule?.collection === "prepay_confirmation" ? "packet_specification_use" : "route_decision_facts",
        reason: useRule?.collection === "prepay_confirmation"
          ? useRule.reason
          : "the evaluator or a route-safety gate reads this fact, so it confirms the paid route"
      });
      continue;
    }

    // 9. A fact the specification marks conditional but whose gate this route
    //    does not carry. It is asked, in its section, and recorded as such.
    if (!overrideClass && useRule?.collection === "conditional") {
      facts.push({
        factId,
        collection: "render_required",
        phase: "render",
        group,
        source: "packet_specification_use",
        reason: "the specification calls this fact optional but names no gate this route carries, so it is asked in its section"
      });
      continue;
    }

    // 10. Information the packet needs in order to be produced.
    if (overrideClass === "render_required" || specFact || !overrideClass) {
      facts.push({
        factId,
        collection: overrideClass === "unresolved" ? "unresolved" : "render_required",
        phase: "render",
        group,
        source: specFact ? "packet_specification_required_fact" : "profile_required_input",
        reason: specFact
          ? "participant information the packet needs at render time"
          : "a profile-required packet input with no specification statement; asked in its section"
      });
      continue;
    }

    facts.push({
      factId,
      collection: "unresolved",
      phase: "render",
      group,
      source: "none",
      reason: "no existing authority classifies this fact"
    });
  }

  // Attach only after classification. Known values and unresolved source scope
  // are different dimensions; neither is changed by this source-purpose bridge.
  if (input.jurisdiction === "MD" && input.pathwayId === "juvenile-expungement"
    && specification == null && input.unresolvedRouteFactIds?.has("county")
    && !input.routeDecidingFactIds?.has("county") && !needsHuman.has("county")
    && override?.classes?.county == null
    && JSON.stringify(input.mdJuvenileCountySourcePurpose) === JSON.stringify(MD_JUVENILE_COUNTY_SOURCE_PURPOSE)) {
    const county = facts.find(fact => fact.factId === "county");
    if (county) county.sourcePurpose = input.mdJuvenileCountySourcePurpose;
  }

  const sections = PACKET_COLLECTION_SECTIONS
    .map((section) => ({
      ...section,
      factIds: facts
        .filter((fact) => fact.group === section.id && isAskedClass(fact.collection) && fact.active !== false)
        .map((fact) => fact.factId)
    }))
    .filter((section) => section.factIds.length > 0);

  return {
    routeKey,
    jurisdiction: input.jurisdiction,
    pathwayId: input.pathwayId,
    facts,
    knownFacts: known,
    derivedFacts: derived,
    prepayQuestions: facts.filter((fact) => fact.collection === "prepay_confirmation").map((fact) => fact.factId),
    renderQuestions: facts
      .filter((fact) => (fact.collection === "render_required" || (fact.collection === "conditional" && fact.active !== false)))
      .map((fact) => fact.factId),
    groupedParticipantSections: sections,
    conditionalQuestions: facts
      .filter((fact): fact is ResolvedPacketFact & { condition: NonNullable<ResolvedPacketFact["condition"]> } => Boolean(fact.condition))
      .map((fact) => ({ factId: fact.factId, condition: fact.condition, active: fact.active === true })),
    filingReadinessItems: facts.filter((fact) => fact.collection === "filing_readiness").map((fact) => fact.factId),
    externalActorFields: facts
      .filter((fact) => fact.collection === "external_actor")
      .map((fact) => ({ factId: fact.factId, actor: fact.actor ?? "external" })),
    unresolvedRequiredFacts: facts.filter((fact) => fact.collection === "unresolved").map((fact) => fact.factId),
    pendingDerivations: facts
      .filter((fact) => fact.derivation?.state === "pending")
      .map((fact) => ({ factId: fact.factId, inputFactIds: [...fact.derivation!.inputFactIds] })),
    ...(contactReconciliation ? { contactReconciliation } : {}),
    hardBlockers: input.requiredInputIds.length === 0
      ? [{ factId: "*", reason: "the route publishes no required packet inputs" }]
      : []
  };
}

/**
 * The facts that must be answered before Checkout may open.
 *
 * FILING READINESS IS NOT IN THIS GATE
 *
 * A document Expungement.ai cannot produce — a certified disposition, a docket
 * sheet, a criminal-history report, a fingerprint card, an agency letter — is
 * the participant's to obtain before they FILE. It is not a condition of
 * eligibility, packet completion, Checkout, payment, generation, sponsored
 * generation or Briefcase readiness, and the participant is never asked to
 * scan, photograph or upload it so the product can hand it back to them.
 *
 * Where such a record contains a fact one of OUR documents needs, we ask for
 * the fact — "What disposition date appears on your court record?" — and never
 * for the record. Evidence custody is not a questionnaire requirement.
 *
 * This is why a pleading may say "A certified copy of the disposition is
 * attached as Exhibit A" while the product holds no exhibit. That sentence
 * describes the filing package the participant is instructed to assemble, not
 * a claim that we possess it, and the instructions say so in terms: obtain it,
 * attach it behind the petition, do not file without it. The alternative —
 * refusing to generate until the participant has fetched a certified copy —
 * blocks a purchase on a county clerk.
 *
 * WHAT THAT DOES AND DOES NOT TAKE OUT OF THIS GATE
 *
 * It takes out the DOCUMENT. It does not take out a fact one of our own
 * documents prints. Mississippi's attachment checklist has an assembly-status
 * row per exhibit, and its certificate states whether the prosecutor's service
 * address is confirmed; those rows are our text, and the participant answers
 * them in one click from where they are sitting — "Not attached", "To be
 * confirmed before filing or service" are answers the specification itself
 * authored for exactly the state of not having been to the courthouse yet.
 *
 * So the question stays in the gate and NO PARTICULAR ANSWER IS EVER REQUIRED.
 * That is the whole distinction: demanding "Attached as Exhibit A" makes a
 * clerk's counter a condition of buying a packet, while asking whether it is
 * attached yet costs nothing and keeps the printed row truthful. Dropping the
 * question instead would print a blank where a status belongs, which is the
 * other failure the rule names — a filing requirement nobody is told about.
 *
 * THE RULE THIS GATE IS HELD TO
 *
 *   Checkout may be blocked by an unresolved eligibility fact, and by a
 *   participant-owned fact actually required to produce the promised packet.
 *   It may NOT be blocked merely by a later filing-readiness task, an external
 *   document, post-filing work, or another actor's responsibility. Showing a
 *   participant their filing checklist before they pay is not the same as
 *   demanding they complete it before they pay.
 *
 * This returns every fact the participant still owns, filing-readiness ones
 * included, and that is only defensible while each of those actually earns its
 * place. It is not a licence: a filing-readiness classification says where a
 * fact is asked and what it is called, and it cannot by itself justify
 * standing in front of a payment.
 *
 * So the justification is measured rather than asserted.
 * `scripts/verify-rcap-prepurchase-render-facts.mjs` takes every fact in this
 * gate that is not `prepay_confirmation` or `render_required`, drops it, and
 * asks the real renderer whether the packet still composes. A fact the
 * composer refuses to proceed without has earned the gate whatever it is
 * called; a fact the packet composes happily without is a later task blocking
 * a payment, and the check fails. At the last run that was 18 filing-readiness
 * and 6 live-conditional facts, every one of them named by the composer as
 * missing. Add a fact here that the renderer does not need and that check goes
 * red, which is the point of it.
 *
 * What legitimately leaves this gate is only what stops being the
 * participant's to answer: a fact the server owns, a fact that follows
 * deterministically from another, a fact another actor fills later, and a
 * conditional fact whose own gate says it does not apply to this matter. Each
 * of those keeps a recorded disposition; none of them is dropped.
 */
export function prepayGateFactIds(resolution: PacketCollectionResolution): string[] {
  return resolution.facts
    .filter((fact) => participantOwesFact(fact) && fact.optional !== true)
    .map((fact) => fact.factId);
}

/**
 * Filing-readiness tasks: shown, tracked, never a condition of Checkout.
 *
 * Separate from the gate so the two cannot be confused again, and so a control
 * can assert that none of these blocks a payment while every one of them still
 * reaches the participant's instructions.
 */
export function filingReadinessFactIds(resolution: PacketCollectionResolution): string[] {
  return resolution.facts
    .filter((fact) => fact.collection === "filing_readiness")
    .map((fact) => fact.factId);
}

/**
 * The facts that must be answered before the packet may be rendered. Identical
 * to the Checkout gate today, and separate so that the render boundary remains
 * expressible on its own if the two ever diverge.
 */
export function renderGateFactIds(resolution: PacketCollectionResolution): string[] {
  return prepayGateFactIds(resolution);
}

/** True while this fact is still something the participant has to supply. */
export function participantOwesFact(fact: ResolvedPacketFact): boolean {
  if (fact.collection === "already_known" || fact.collection === "derived") return false;
  if (fact.collection === "external_actor") return false;
  if (fact.collection === "conditional") return fact.active !== false;
  return true;
}

/** Values the resolver established without asking, for seeding prefilled answers. */
export function resolvedFactValues(resolution: PacketCollectionResolution): Record<string, AnswerValue> {
  return { ...resolution.knownFacts, ...resolution.derivedFacts };
}

/**
 * Classes the participant is actually shown a control for. Filing readiness is
 * among them: classifying a fact as filing readiness moves it to its own
 * section and its own language, it does not stop the participant answering it.
 */
function isAskedClass(collection: PacketCollectionClass) {
  return collection === "prepay_confirmation"
    || collection === "render_required"
    || collection === "conditional"
    || collection === "filing_readiness"
    || collection === "unresolved";
}

function sectionFor(factId: string, overrideSection?: PacketCollectionSectionId): PacketCollectionSectionId {
  if (overrideSection) return overrideSection;
  const rule = SECTION_RULES.find((entry) => entry.test.test(factId));
  return rule?.section ?? "your_case";
}

function carriedValue(
  factId: string,
  available: Record<string, AnswerValue>,
  screeningAnswers: Record<string, AnswerValue>
): { value: AnswerValue; source: string; reason: string; sameId: boolean } | null {
  const direct = available[factId];
  if (valueIsKnown(direct)) {
    return {
      sameId: true,
      value: direct,
      source: factId in screeningAnswers ? "screening_answer" : "carried_forward_or_account_fact",
      reason: factId in screeningAnswers
        ? "the participant already answered this fact during the guided check"
        : "this fact is already carried forward or held on the participant's account"
    };
  }
  for (const screeningId of SCREENING_CROSSWALK[factId] ?? []) {
    const value = screeningAnswers[screeningId];
    if (!valueIsKnown(value)) continue;
    // A completion question answers a completion fact only when it is a yes.
    if (screeningId === "court_requirements_completed") {
      if (!isAffirmativeText(answerString(value))) continue;
      return {
        sameId: false,
        value: "Yes",
        source: `screening_answer:${screeningId}`,
        reason: `carried forward from the participant's own ${screeningId} answer`
      };
    }
    return {
      sameId: screeningId === factId,
      value,
      source: `screening_answer:${screeningId}`,
      reason: `carried forward from the participant's own ${screeningId} answer`
    };
  }
  return null;
}

function specificationFactIndex(specification: RegisteredSpecification | null) {
  const index = new Map<string, PacketSpecificationFact>();
  const requiredFacts = (specification as { requiredFacts?: PacketSpecificationFact[] } | null)?.requiredFacts ?? [];
  for (const fact of requiredFacts) index.set(fact.factId, fact);
  return index;
}

function externalActorIndex(specification: RegisteredSpecification | null) {
  const index = new Map<string, string>();
  const ownership = (specification as { fieldOwnership?: Record<string, unknown> } | null)?.fieldOwnership;
  if (!ownership) return index;
  for (const [key, actor] of Object.entries(EXTERNAL_ACTOR_BY_OWNERSHIP_KEY)) {
    const entries = ownership[key];
    if (!Array.isArray(entries)) continue;
    for (const factId of entries) if (typeof factId === "string") index.set(factId, actor);
  }
  return index;
}

function specificationStringList(specification: RegisteredSpecification | null, key: string): string[] {
  const ownership = (specification as { fieldOwnership?: Record<string, unknown> } | null)?.fieldOwnership;
  const entries = ownership?.[key];
  return Array.isArray(entries) ? entries.filter((entry): entry is string => typeof entry === "string") : [];
}

function answerString(value: AnswerValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ").trim();
  if (typeof value === "object") return String((value as { value?: unknown }).value ?? "").trim();
  return String(value).trim();
}

/** A calendar date, or null where the text is not one. */
function isoDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const value = new Date(`${match[0]}T00:00:00.000Z`);
  return isCalendarDate(text.trim()) ? value : null;
}

function isUnknownText(text: string) {
  return uncertaintyState(text) !== null;
}

function isAffirmativeText(text: string) {
  return /^(yes|y|true)\b/i.test(text.trim());
}

const valueIsKnown = answerValueIsKnown;

function dedupe(values: string[]) {
  return [...new Set(values)];
}
