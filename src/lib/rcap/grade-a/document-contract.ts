/**
 * The explicit document contract.
 *
 * A packet specification's `documents[]` entry said what a document IS
 * (`role`), how it is produced (`outputStrategy`) and whether it is needed
 * (`requirement`). It did not say who prepares it, who signs it, who receives
 * it, how it is executed, how it is served, whether it opens a new case, what
 * privacy treatment its identifiers need, or whether a local form controls it.
 * Those distinctions decide whether a document is filing-grade, and without
 * them the renderer inferred them from a template.
 *
 * This is the home for them. It is not a parallel schema: it hangs off the
 * existing `documents[]` entry, reuses `requirement` rather than restating it,
 * and derives what the existing fields already determine.
 *
 * THE TWO RULES THAT ARE NOT NEGOTIABLE
 *
 *   Preparation and signature are different responsibilities. A participant may
 *   be required to submit a proposed order; only a judge signs one.
 *
 *   A document the authority assigns to a court, a prosecutor or an agency is
 *   not the participant's to produce, whatever a template could render.
 *
 * UNRESOLVED IS A VALUE
 *
 * Where a contract attribute is not established by a source, it is recorded as
 * unresolved with the reason, and the component fails closed if that attribute
 * is one its document type needs. An invented value would be worse than a
 * refusal: a refusal is visible, and a wrong execution or service treatment on
 * a filed document is not.
 */

/** What kind of instrument this is, independent of how it is rendered. */
export type InstrumentClass =
  | "participant_filing"
  | "proposed_order"
  | "certificate_of_service"
  | "attachment"
  | "correspondence"
  | "participant_guidance"
  | "court_generated"
  | "prosecutor_generated"
  | "agency_generated";

/** Who produces the document. */
export type PreparedBy = "participant" | "court" | "prosecutor" | "agency";

/** Who signs it. "none" is a positive statement that it carries no signature. */
export type DocumentSigner = "participant" | "judge" | "clerk" | "prosecutor" | "none";

/** Who the finished document is addressed to or filed with. */
export type DocumentRecipient = "court" | "prosecutor" | "agency" | "participant" | "none";

/** Whether an official form controls this component. */
export type FormApplicability =
  | "official_form_required"
  | "custom_document_permitted"
  | "not_a_filing";

/** Whether the document opens a matter or is filed into an existing one. */
export type CaseMode = "existing_case" | "new_case";

/** How the document is executed. */
export type ExecutionType = "signature" | "verified" | "sworn_notarised" | "none";

/** What the component does about service or notice. */
export type ServiceTreatment = "participant_serves" | "clerk_serves" | "no_service" ;

/** What the component does about a proposed order. */
export type OrderTreatment = "submits_proposed_order" | "no_proposed_order";

/** What the component does about sensitive identifiers. */
export type PrivacyTreatment =
  | "no_sensitive_identifiers"
  | "sealed_or_confidential_addendum"
  | "masked_on_public_filing";

export const UNRESOLVED = "unresolved" as const;
export type Unresolved = typeof UNRESOLVED;
export type Resolvable<T> = T | Unresolved;

export interface DocumentContract {
  instrumentClass: Resolvable<InstrumentClass>;
  preparedBy: Resolvable<PreparedBy>;
  signer: Resolvable<DocumentSigner>;
  recipient: Resolvable<DocumentRecipient>;
  formApplicability: Resolvable<FormApplicability>;
  caseMode: Resolvable<CaseMode>;
  executionType: Resolvable<ExecutionType>;
  serviceTreatment: Resolvable<ServiceTreatment>;
  orderTreatment: Resolvable<OrderTreatment>;
  privacyTreatment: Resolvable<PrivacyTreatment>;
  /** Named local form or practice that controls this component, where one does. */
  localVariant: Resolvable<string | null>;
  /** Why each unresolved attribute is unresolved. Keyed by attribute name. */
  unresolvedReasons?: Record<string, string>;
}

/** The specification `documents[]` shape this derives from. */
export interface SpecificationDocument {
  documentId: string;
  role: string;
  outputStrategy: string;
  requirement: string;
  officialFormId?: string;
  documentContract?: Partial<DocumentContract>;
}

/**
 * Roles that are a restatement of instrument class. A role NOT listed here does
 * not get a guessed instrument: it resolves to unresolved and its component
 * fails closed, because "I do not recognise this role" and "this is a filing"
 * are different statements.
 */
const INSTRUMENT_BY_ROLE: Record<string, InstrumentClass> = {
  primary_filing: "participant_filing",
  enforcement_motion: "participant_filing",
  declaration_and_verification: "participant_filing",
  verification: "participant_filing",
  proposed_order: "proposed_order",
  certificate_of_service: "certificate_of_service",
  certificate_of_service_and_attachment_checklist: "certificate_of_service",
  prosecutor_service: "certificate_of_service",
  attachment: "attachment",
  records_checklist: "attachment",
  filing_instructions: "participant_guidance",
  filing_and_service_instructions: "participant_guidance",
  filing_and_next_steps: "participant_guidance",
  instructions: "participant_guidance",
  process_guidance: "participant_guidance",
  referral_instructions: "participant_guidance",
  service_instructions: "participant_guidance",
  record_gathering_instructions: "participant_guidance",
  objection_and_hearing_instructions: "participant_guidance",
  post_order_verification: "participant_guidance",
  legal_effect_explanation: "participant_guidance",
  cover_and_contents: "participant_guidance",
  detection_and_routing: "participant_guidance",
  branch_screen: "participant_guidance",
  discharge_type_screen: "participant_guidance",
  fingerprint_step: "participant_guidance"
};

/** Signature responsibility follows the instrument, and only ever this way. */
const SIGNER_BY_INSTRUMENT: Record<InstrumentClass, DocumentSigner> = {
  participant_filing: "participant",
  // The one that matters: the participant submits it, the court signs it.
  proposed_order: "judge",
  certificate_of_service: "participant",
  attachment: "none",
  correspondence: "participant",
  participant_guidance: "none",
  court_generated: "judge",
  prosecutor_generated: "prosecutor",
  agency_generated: "none"
};

const RECIPIENT_BY_INSTRUMENT: Record<InstrumentClass, DocumentRecipient> = {
  participant_filing: "court",
  proposed_order: "court",
  certificate_of_service: "court",
  attachment: "court",
  correspondence: "agency",
  participant_guidance: "participant",
  court_generated: "participant",
  prosecutor_generated: "court",
  agency_generated: "participant"
};

/** Derives the contract this document's existing fields already determine. */
export function deriveDocumentContract(document: SpecificationDocument): DocumentContract {
  const unresolvedReasons: Record<string, string> = {};
  const instrumentClass: Resolvable<InstrumentClass> = INSTRUMENT_BY_ROLE[document.role] ?? UNRESOLVED;
  if (instrumentClass === UNRESOLVED) {
    unresolvedReasons.instrumentClass =
      `role "${document.role}" is not a recorded instrument class; classify it rather than letting the renderer infer one.`;
  }

  const formApplicability: Resolvable<FormApplicability> =
    document.outputStrategy === "official_pdf_fill" ? "official_form_required"
      : document.outputStrategy === "custom_pleading" ? "custom_document_permitted"
        : document.outputStrategy === "process_guidance" ? "not_a_filing"
          : UNRESOLVED;
  if (formApplicability === UNRESOLVED) {
    unresolvedReasons.formApplicability =
      `outputStrategy "${document.outputStrategy}" does not state whether an official form controls this component.`;
  }

  const signer: Resolvable<DocumentSigner> =
    instrumentClass === UNRESOLVED ? UNRESOLVED : SIGNER_BY_INSTRUMENT[instrumentClass];
  if (signer === UNRESOLVED) unresolvedReasons.signer = "follows instrument class, which is unresolved.";

  const recipient: Resolvable<DocumentRecipient> =
    instrumentClass === UNRESOLVED ? UNRESOLVED : RECIPIENT_BY_INSTRUMENT[instrumentClass];
  if (recipient === UNRESOLVED) unresolvedReasons.recipient = "follows instrument class, which is unresolved.";

  const orderTreatment: Resolvable<OrderTreatment> =
    instrumentClass === UNRESOLVED ? UNRESOLVED
      : instrumentClass === "proposed_order" ? "submits_proposed_order" : "no_proposed_order";
  if (orderTreatment === UNRESOLVED) unresolvedReasons.orderTreatment = "follows instrument class, which is unresolved.";

  // Everything below is NOT determined by any existing field. It is recorded as
  // unresolved rather than guessed, and a component whose type needs it refuses.
  const stillUnresolved = {
    preparedBy: "no source read for this component states who prepares it; the renderer must not assume the participant.",
    caseMode: "no source read states whether this is filed into an existing case or opens a new one.",
    executionType: "no source read states whether this document is signed, verified, or sworn and notarised.",
    serviceTreatment: "no source read states who serves this component, or that no service is required.",
    privacyTreatment: "no source read states how sensitive identifiers are treated on this component.",
    localVariant: "no source read states whether a local form or practice controls this component."
  };
  for (const [key, reason] of Object.entries(stillUnresolved)) unresolvedReasons[key] = reason;

  return {
    instrumentClass,
    preparedBy: UNRESOLVED,
    signer,
    recipient,
    formApplicability,
    caseMode: UNRESOLVED,
    executionType: UNRESOLVED,
    serviceTreatment: UNRESOLVED,
    orderTreatment,
    privacyTreatment: UNRESOLVED,
    localVariant: UNRESOLVED,
    unresolvedReasons
  };
}

/** The contract a document actually carries: recorded values over derived ones. */
export function documentContractFor(document: SpecificationDocument): DocumentContract {
  const derived = deriveDocumentContract(document);
  const recorded = document.documentContract ?? {};
  // Only keys the record actually states override the derived value. Spreading
  // the record whole would let a missing key overwrite a good derivation with
  // undefined, which reads later as "no contract" rather than "not stated here".
  const stated = Object.fromEntries(
    Object.entries(recorded).filter(([, value]) => value !== undefined)
  );
  const merged: DocumentContract = { ...derived, ...stated };
  const reasons = { ...(derived.unresolvedReasons ?? {}), ...(recorded.unresolvedReasons ?? {}) };
  for (const key of Object.keys(reasons)) {
    if ((merged as Record<string, unknown>)[key] !== UNRESOLVED) delete reasons[key];
  }
  merged.unresolvedReasons = reasons;
  return merged;
}

/**
 * Which attributes a document type cannot be released without.
 *
 * Deliberately per-type. A participant guidance page needs no execution type,
 * and demanding one would refuse every instruction sheet in the product for no
 * safety gain. A page filed with a court needs all of them, because each one
 * decides whether what the participant files is the right instrument, executed
 * the right way, served the right way.
 */
const REQUIRED_ATTRIBUTES: Record<InstrumentClass, (keyof DocumentContract)[]> = {
  participant_filing: ["preparedBy", "signer", "recipient", "formApplicability", "caseMode", "executionType", "privacyTreatment"],
  proposed_order: ["preparedBy", "signer", "recipient", "formApplicability", "orderTreatment", "privacyTreatment"],
  certificate_of_service: ["preparedBy", "signer", "recipient", "formApplicability", "serviceTreatment"],
  attachment: ["preparedBy", "recipient", "privacyTreatment"],
  correspondence: ["preparedBy", "signer", "recipient"],
  participant_guidance: [],
  court_generated: ["preparedBy"],
  prosecutor_generated: ["preparedBy"],
  agency_generated: ["preparedBy"]
};

/** True when this component is filed with a court. */
export function isCourtFacing(contract: DocumentContract): boolean {
  return contract.instrumentClass === "participant_filing"
    || contract.instrumentClass === "proposed_order"
    || contract.instrumentClass === "certificate_of_service"
    || contract.instrumentClass === "attachment";
}

/**
 * Why this component cannot be released, or null when it can.
 *
 * Returns every reason rather than the first, so one pass shows a component's
 * whole gap instead of one attribute at a time.
 */
export function documentContractRefusals(
  documentId: string,
  contract: DocumentContract
): string[] {
  const refusals: string[] = [];
  if (contract.instrumentClass === UNRESOLVED) {
    return [`${documentId}: ${contract.unresolvedReasons?.instrumentClass ?? "instrument class is unresolved."}`];
  }

  // The two non-negotiable rules, checked before completeness.
  if (contract.preparedBy !== UNRESOLVED && contract.preparedBy !== "participant") {
    const generated: Record<string, InstrumentClass> = {
      court: "court_generated", prosecutor: "prosecutor_generated", agency: "agency_generated"
    };
    if (contract.instrumentClass !== generated[contract.preparedBy]) {
      refusals.push(
        `${documentId}: prepared by the ${contract.preparedBy} but classed as ${contract.instrumentClass}. `
        + "A document the authority assigns to another actor is not the participant's to produce."
      );
    }
  }
  if (contract.instrumentClass === "proposed_order" && contract.signer !== UNRESOLVED && contract.signer !== "judge") {
    refusals.push(
      `${documentId}: a proposed order signed by ${contract.signer}. The participant submits it; the judge signs it.`
    );
  }
  if (contract.formApplicability === "official_form_required" && contract.instrumentClass !== "attachment") {
    // Recorded here so a later renderer selection cannot quietly substitute a
    // custom document for a component an official form controls.
    if (contract.localVariant === UNRESOLVED && contract.instrumentClass === "participant_filing") {
      // not itself fatal; the completeness pass below decides.
    }
  }

  for (const attribute of REQUIRED_ATTRIBUTES[contract.instrumentClass]) {
    if (contract[attribute] === UNRESOLVED) {
      refusals.push(
        `${documentId}: ${String(attribute)} is unresolved — `
        + `${contract.unresolvedReasons?.[attribute] ?? "no source establishes it."}`
      );
    }
  }
  return refusals;
}

/**
 * Every reason this specification cannot produce a releasable packet.
 *
 * Guidance pages are exempt by construction: they are not filed, so an
 * unresolved execution or service treatment costs nothing. Every court-facing
 * component must be complete.
 */
export function specificationDocumentRefusals(
  specification: { documents?: SpecificationDocument[] }
): string[] {
  const refusals: string[] = [];
  for (const document of specification.documents ?? []) {
    const contract = documentContractFor(document);
    refusals.push(...documentContractRefusals(document.documentId, contract));
  }
  return refusals;
}
