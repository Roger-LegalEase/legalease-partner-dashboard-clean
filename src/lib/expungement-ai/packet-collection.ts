import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
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
    description: "Whether the fines, fees, costs and restitution on this case are paid or waived.",
    translations: {
      es: {
        heading: "Obligaciones económicas",
        description: "Si las multas, cuotas, costos y restitución de este caso están pagados o exonerados."
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
  collection: PacketCollectionClass;
  phase: PacketCollectionPhase;
  /** The participant section this fact is asked in, where it is asked at all. */
  group: PacketCollectionSectionId | null;
  /** Where the value comes from, or who owns it. Never a guess. */
  source: string;
  /** Present for `already_known` and `derived` only. */
  value?: AnswerValue;
  /** Present for `external_actor` only: the actor who fills this field, later. */
  actor?: string;
  /** Present for `conditional`: the fact that decides whether this is asked. */
  condition?: { factId: string; satisfiedWhen: "affirmative" };
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
  conditionalQuestions: Array<{ factId: string; condition: { factId: string; satisfiedWhen: "affirmative" }; active: boolean }>;
  filingReadinessItems: string[];
  externalActorFields: Array<{ factId: string; actor: string }>;
  unresolvedRequiredFacts: string[];
  hardBlockers: Array<{ factId: string; reason: string }>;
};

export type PacketCollectionInput = {
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
  /** The registered packet specification for this route, where one exists. */
  specification?: RegisteredSpecification | null;
  /** Fact ids the evaluator or a route-safety gate actually reads for this route. */
  routeDecidingFactIds?: ReadonlySet<string>;
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
 * Facts that are a readiness state of an external record or of an external
 * office, rather than information the participant simply knows. These are
 * needed before filing and are never a mandatory prepayment question.
 */
const FILING_READINESS_IDENTITY = /_exhibit_status$|^certified_|_confirmation_status$|_confirmation_source$|_delivery_method$|^service_|_service_address$|^other_recordkeeping_agencies$|^filing_fee|^fee_waiver/;

/** Statements a specification makes about a fact that decide its class outright. */
const USE_RULES: ReadonlyArray<{ collection: PacketCollectionClass; test: RegExp; reason: string }> = [
  {
    collection: "filing_readiness",
    test: /filing-readiness gate|assembly and filing|prevents an unverified|before filing|court-approved channel|source and date of the court-specific/,
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

const DERIVATIONS: Readonly<Record<string, Derivation>> = {
  // The last four digits are a projection of the number itself, never a
  // separate thing to ask for.
  social_security_number_last_four: {
    from: ["social_security_number"],
    derive: ({ social_security_number: ssn }) => {
      const digits = ssn.replace(/\D/g, "");
      return digits.length >= 4 ? digits.slice(-4) : null;
    }
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
    if (factId in derived) return answerString(derived[factId]);
    if (factId in known) return answerString(known[factId]);
    const saved = input.savedAnswers?.[factId];
    if (valueIsKnown(saved)) return answerString(saved);
    return answerString(available[factId]);
  };

  const requiredInputIds = dedupe(input.requiredInputIds);
  const decidesRouteFor = (factId: string) => input.routeDecidingFactIds?.has(factId) === true;
  const baselineCarried = input.baselineCarriedFactIds ?? new Set<string>();
  /**
   * Whether a value may be written into the prefilled map for this fact.
   * `sameId` means the participant answered this exact fact already, so the
   * evaluator has seen that value and reusing it changes nothing.
   */
  const mayMaterialize = (factId: string, sameId: boolean) =>
    sameId || !decidesRouteFor(factId) || baselineCarried.has(factId);

  for (const factId of requiredInputIds) {
    const specFact = factById.get(factId);
    const overrideClass = override?.classes?.[factId];
    const group = sectionFor(factId, override?.groups?.[factId]);

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

    // 2. Fields another actor fills, later. Never a participant question.
    const actor = externalActorById.get(factId);
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

    // 4. Something the participant has already told us, under this id or a
    //    screening id that carries the same answer.
    const carried = carriedValue(factId, available, input.screeningAnswers);
    if (carried && carried.sameId === false && !mayMaterialize(factId, false)) {
      // A route fact this layer would have to synthesise from a different
      // answer. It is asked instead, so the evaluator only ever sees values
      // the participant actually gave.
      facts.push({
        factId,
        collection: "prepay_confirmation",
        phase: "prepay_confirmation",
        group,
        source: "route_decision_facts",
        reason: "the evaluator reads this fact, so it is asked rather than carried across from a differently worded answer"
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
    const derivation = DERIVATIONS[factId];
    if (derivation && !mayMaterialize(factId, false)) {
      facts.push({
        factId,
        collection: "prepay_confirmation",
        phase: "prepay_confirmation",
        group,
        source: "route_decision_facts",
        reason: "the evaluator reads this fact, so it is asked rather than computed"
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
      const active = gate.length === 0 || isAffirmativeText(gate);
      facts.push({
        factId,
        collection: "conditional",
        phase: active ? "render" : "known",
        group: active ? group : null,
        source: `conditional_on:${conditionFactId}`,
        condition: { factId: conditionFactId, satisfiedWhen: "affirmative" },
        active,
        reason: active
          ? `asked only while ${conditionFactId} is affirmative, which it currently is or is not yet answered`
          : `${conditionFactId} is not affirmative, so this fact does not apply to this matter`
      });
      continue;
    }

    // 7. A filing-readiness state of an external record or office.
    const useText = String(specFact?.use ?? "");
    const useRule = USE_RULES.find((rule) => rule.test.test(useText));
    const filingByIdentity = FILING_READINESS_IDENTITY.test(factId);
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
    hardBlockers: input.requiredInputIds.length === 0
      ? [{ factId: "*", reason: "the route publishes no required packet inputs" }]
      : []
  };
}

/**
 * The facts that must be answered before Checkout may open.
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
    .filter((fact) => participantOwesFact(fact))
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
  return Number.isNaN(value.getTime()) ? null : value;
}

function isUnknownText(text: string) {
  const normalized = text.toLowerCase();
  return normalized === "i am not sure"
    || normalized === "i'm not sure"
    || normalized === "not sure"
    || normalized === "unknown"
    || normalized === "prefer not to say";
}

function isAffirmativeText(text: string) {
  return /^(yes|y|true)\b/i.test(text.trim());
}

function valueIsKnown(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "object" && !Array.isArray(value)) {
    if ((value as { unknown?: boolean }).unknown === true) return false;
    return valueIsKnown((value as { value?: AnswerValue }).value);
  }
  const text = answerString(value);
  return text.length > 0 && !isUnknownText(text);
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}
