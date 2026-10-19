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

// GA-17 Q-8105d5d0b28ebd1e4a67 / Q-c8633872a982712e7803 / Q-94c8f0620f0384854d98.
// GA-17 Q-748f73bc4bcf41923fcc / Q-6acd9d8d275e7be59682 / Q-8c94453e5af32f59406d.
// Q-ab7cc6744570b24e17d4 / Q-481c00319478c8236160 / Q-1ee2fb0eca77febaf2b6: the same history-only consumer.
// HI Q-4c4d60127b04b08d3f41 / Q-d6c2af7ef42f979932f3 / Q-50a58ca23c5c2ba26a76: holder/disposition uses do not make these labels exclusive.
// Q-6add858b65f867a82b70 / Q-502bf587f9925e5e6e79 / Q-00caec14a5a59750b527: Kentucky uses separate disposition/statutory facts.
// GA17 Q-46a17f0eb164e9cdcf27 / Q-47d5c5f19e70f0fbcbec / Q-73e3915ed9d087f8b531 / Q-6fce98651a27d2a3b8c6 / Q-65a2e556a51d224b2917: the same source-bound optional history.
export function dcFlPetitionRecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  if (specification != null) return false;
  return profile?.jurisdiction.code === "DC"
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
    || profile?.jurisdiction.code === "MA"
      && ["adult-conviction-sealing-under-m-g-l-c-276-100a", "automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c", "court-requested-sealing-for-dismissal-or-nolle-prosequi-100c"].includes(pathwayId ?? "")
      && contactRepresentationHash(profile) === "f81a71dd750ea489f1c29074b571512bd5cb7c78c5dd924c1f6e7cb7122c0f0d";
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
  const iaCategoryHistory = iaCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);
  const ctCategoryHistory = ctInformationCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId ?? null,
    specification, { ...available, ...input.savedAnswers }, [...input.unresolvedSavedFactIds ?? []]);
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

    if ((arCategoryHistory || alCategoryHistory || hiCategoryHistory || iaCategoryHistory || laCategoryHistory || kyCategoryHistory || ctCategoryHistory || wy1502CategoryHistory || sdSisCategoryHistory || ilProstitutionCategoryHistory || dcCategoryHistory || ilCategoryHistory || msCategoryHistory || gaSb288CategoryHistory || ctPetitionCategoryHistory || nvProgramCategoryHistory) && factId === "offense_category" && !overrideClass
      && !needsHuman.has(factId) && !input.recordOwnQuestionIds?.has(factId)) {
      const retained = needsSavedAnswerClarification || [input.screeningAnswers, input.prefilledAnswers, input.savedAnswers, input.profileFacts]
        .some(answers => answers && Object.hasOwn(answers, factId));
      facts.push({ factId, collection: "conditional", phase: retained ? "render" : "known",
        group: retained ? group : null, active: retained, optional: true,
        source: laCategoryHistory ? "la_three_route_category_history" : kyCategoryHistory ? "ky_three_route_category_history" : arCategoryHistory ? "ar_bound_category_history" : wy1502CategoryHistory ? "wy1502_category_history" : sdSisCategoryHistory ? "sd_sis_category_history" : ilProstitutionCategoryHistory ? "il_prostitution_category_history" : hiCategoryHistory ? "hi_three_route_category_history" : iaCategoryHistory ? "ia_three_route_category_history" : alCategoryHistory ? "al_three_route_category_history" : nvProgramCategoryHistory ? "nv_program_category_history" : ctPetitionCategoryHistory ? "ct_petition_category_history" : gaSb288CategoryHistory ? "ga_sb288_category_history" : msCategoryHistory ? "ms_additional_category_history" : ilCategoryHistory ? "il_identity_category_history" : dcCategoryHistory ? "dc_innocence_category_history" : "ct_information_category_history",
        reason: laCategoryHistory
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
