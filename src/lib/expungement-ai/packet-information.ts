import { VA_RECORD_CONTEXT_IDS, VA_RECORD_CONTEXT_QUESTIONS, virginiaRecordContextApplies } from "@/lib/expungement-ai/virginia-record-context";
import { VA_RECORD_ORIGIN_ID, VA_RECORD_ORIGIN_SOURCE, virginiaRecordOrigin, virginiaRecordOriginApplies } from "@/lib/rcap-engine/virginia-record-origin";
import { MD_JUVENILE_DOCUMENT_QUESTIONS } from "@/lib/expungement-ai/md-juvenile-document-questions";
import { WY_1502_FACT_IDS, wy1502Context, wy1502QuestionApplies } from "@/lib/rcap-engine/wyoming-1502-facts";
import { SD_SIS_FACT_IDS, southDakotaSisContext, southDakotaSisQuestionApplies } from "@/lib/rcap-engine/south-dakota-sis-facts";
import { IL_PROSTITUTION_FACT_ID, illinoisProstitutionContext } from "@/lib/rcap-engine/illinois-prostitution-facts";
import { CT_PETITION_FACT_IDS, CT_PETITION_MULTILINE_IDS, ctPetitionFacts, ctPetitionContext, ctPetitionQuestionApplies, ctPetitionDateQuestion } from "@/lib/rcap-engine/connecticut-clean-slate-petition-facts";
import { GA_SB288_FACT_IDS, GA_SB288_SOURCE, georgiaSb288Facts, georgiaSb288Context, georgiaSb288QuestionApplies } from "@/lib/rcap-engine/georgia-sb288-facts";
import { VA_PARDON_ROUTE, VA_PARDON_TYPE_ID, vaPardonTypeContract, vaPardonTypeQuestion, vaPardonTypeReportedState } from "@/lib/expungement-ai/va-pardon-type-source";
import { mdJuvenileCountySourcePurpose, MD_JUVENILE_CAPTION_ROUTE, mdJuvenileCaptionQuestion } from "@/lib/expungement-ai/md-juvenile-county-source-purpose";
import { ksMunicipalCategoryIsContext, ksMunicipalCategoryContextQuestion } from "@/lib/expungement-ai/ks-municipal-category-context";
import { MS_FIRST_OFFENDER_COLLECTION_IDS, msFirstOffenderSourceQuestions } from "@/lib/expungement-ai/ms-first-offender-source-questions";
import { MS_FIRST_OFFENDER_ROUTE, MS_FIRST_OFFENDER_IDS, projectMsFirstOffenderSourceFacts, msFirstOffenderSourceContract } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";
import { ohJuvenileSourceContract, ohJuvenileStageFactIds } from "@/lib/rcap-engine/ohio-juvenile-source-stage";
import { OH_JUVENILE_ROUTE, OH_JUVENILE_STAGE_QUESTIONS } from "@/lib/expungement-ai/oh-juvenile-stage-questions";
import { mnTwoCountySourceContract, mnTwoCountyQuestions, mnTwoCountyFactIds, MN_TARGET_ORIGIN_ID, mnTargetOriginQuestion, mnTargetOriginRule18Entry, mnProtectedStageQuestions, mnProtectedStageFactIds, mnProtectedStageContext, type MnHeldSourceStage } from "@/lib/expungement-ai/mn-two-county-source-facts";
import { MD_POLICE_IDS, MD_POLICE_ROUTE, MD_POLICE_SOURCE, mdPoliceContext, mdPoliceFactIds } from "@/lib/rcap-engine/maryland-police-record-facts";
import { moXivCourtContextQuestion } from "@/lib/expungement-ai/mo-xiv-court-context";
import { mnCannabisLocationContextQuestion } from "@/lib/expungement-ai/mn-cannabis-location-context";
import { mn609a017LocationContextQuestion } from "@/lib/expungement-ai/mn-609a017-location-context";
import { mn299c11LocationContextQuestion } from "@/lib/expungement-ai/mn-299c11-location-context";
import { mn609a015LocationContextQuestion } from "@/lib/expungement-ai/mn-609a015-location-context";
import { mo610122CourtContextQuestion } from "@/lib/expungement-ai/mo-610122-court-context";
import { mo610105CourtContextQuestion } from "@/lib/expungement-ai/mo-610105-court-context";
import { virginiaVictimQuestionContract, VA_VICTIM_STATUS_ID } from "@/lib/rcap-engine/virginia-victim-question";
import { ny16059PriorClockStatus } from "@/lib/expungement-ai/ny-16059-prior-clock";
import {WY_1501_ROUTE,WY_1501_SOURCE,WY_1501_FACT_IDS,WY_1501_QUESTIONS,wy1501Contract,wy1501Context,wy1501FactIds,wy1501Facts,wy1501QuestionApplies} from "@/lib/rcap-engine/wyoming-1501-facts";
import { texasGuidanceFinancialApplies, texasGuidanceFinancialContract, TX_GUIDANCE_FINANCIAL_ROUTES, texasNondisclosureTimingContract, texasNondisclosureFactIds, texasNondisclosureClock, TX_ND_FACT_IDS, TX_ND_ROUTES } from "@/lib/rcap-engine/texas-nondisclosure-facts";
import { westVirginiaGuidanceFinancialApplies, westVirginiaGuidanceFinancialContract, WV_GUIDANCE_FINANCIAL_ROUTES } from "@/lib/rcap-engine/west-virginia-guidance-financial";
import { southDakotaGuidanceFinancialApplies, southDakotaGuidanceFinancialContract, SD_GUIDANCE_FINANCIAL_ROUTES } from "@/lib/rcap-engine/south-dakota-guidance-financial";
import { southCarolinaGuidanceFinancialApplies, southCarolinaGuidanceFinancialContract, SC_GUIDANCE_FINANCIAL_ROUTES } from "@/lib/rcap-engine/south-carolina-guidance-financial";
import { newJerseyMarijuanaStatusFinancialApplies, newJerseyMarijuanaStatusFinancialContract, NJ_MARIJUANA_STATUS_ROUTE } from "@/lib/rcap-engine/new-jersey-marijuana-status-financial";
import { oklahomaCleanSlateFinancialApplies, oklahomaCleanSlateFinancialContract, OK_CLEAN_SLATE_ROUTE } from "@/lib/rcap-engine/oklahoma-clean-slate-financial";
import { ohTraffickingCourtIsContext, ohTraffickingCourtContextQuestion } from "@/lib/expungement-ai/oh-trafficking-court-context";
import { WY_1401_ROUTE, WY_1401_SOURCE, WY_1401_FACT_IDS, WY_1401_NEW_IDS, WY_1401_IRRELEVANT_IDS, WY_1401_QUESTIONS, wy1401Contract, wy1401Context, wy1401Facts, wy1401QuestionApplies } from "@/lib/rcap-engine/wyoming-1401-facts";
import { newMexicoGuidanceFinancialApplies, newMexicoGuidanceFinancialContract, NM_GUIDANCE_FINANCIAL_ROUTES } from "@/lib/rcap-engine/new-mexico-guidance-financial";
import { montanaRecordFinancialApplies, montanaRecordFinancialContract, MT_RECORD_FINANCIAL_ROUTES } from "@/lib/rcap-engine/montana-record-correction-financial";
import { caAutomaticRecordIsContext, caAutomaticRecordContextQuestion } from "@/lib/expungement-ai/ca-automatic-record-context";
import { ca12034RecordIsContext, ca12034RecordContextQuestion } from "@/lib/expungement-ai/ca-1203-4-record-context";
import { CA_12034_ROUTE, CA_12034_SOURCE, CA_12034_FACT_IDS, ca12034Context, ca12034Facts, ca12034QuestionApplies } from "@/lib/rcap-engine/california-1203-4-facts";
import { ca12034aRecordIsContext, ca12034aRecordContextQuestion } from "@/lib/expungement-ai/ca-1203-4a-record-context";
import { arFelonyRecordIsContext, arFelonyRecordContextQuestion } from "@/lib/expungement-ai/ar-felony-record-context";
import { arNonconvictionRecordIsContext, arNonconvictionRecordContextQuestion } from "@/lib/expungement-ai/ar-nonconviction-record-context";
import { alRecordIsContext, alRecordContextQuestion } from "@/lib/expungement-ai/al-record-context";
import { AL_REDEEMER_CLASSIFICATION_IDS, alRedeemerClassificationConflicts, alRedeemerClassificationContract, alRedeemerClassificationIds, alRedeemerClassificationQuestions, alRedeemerCategoryQuestion } from "@/lib/expungement-ai/al-redeemer-classification";
import { ND_FIRST_OFFENSE_FACT_IDS, ndFirstOffenseFactApplies, ndFirstOffenseAnswerState } from "@/lib/rcap-engine/north-dakota-first-offense-facts";
import { akPardonRecordIsContext, akPardonRecordContextQuestion, akJuvenileRecordIsContext, akJuvenileRecordContextQuestion, akAgencyOrSisRecordIsContext, akAgencyOrSisRecordContextQuestion } from "@/lib/expungement-ai/ak-pardon-record-context";
import { AK_LEGACY_RECORD_TYPE, akCourtviewRecordIsContext, akCourtviewRecordContextQuestion } from "@/lib/expungement-ai/ak-courtview-record-context";
import { delawareProtectedCorrectionContract, delawareProtectedCorrectionIds, delawareProtectedExclusionQuestion } from "@/lib/expungement-ai/delaware-protected-corrections";
import { OR_CONTACT_IDS, oregonContactContract, oregonContactQuestions, oregonContactInputs, oregonContactConflictingIds } from "@/lib/expungement-ai/oregon-disposition-contact";
import { ND_LEGACY_RECORD_TYPE, ndFirstOffenseRecordIsContext, ndFirstOffenseRecordContextQuestion } from "@/lib/expungement-ai/nd-first-offense-record-context";
import { oregonDispositionConfigurationSourceMatches } from "@/lib/rcap-engine/composed-route-selector";
import { OR_DISPOSITION_SOURCE, OR_DISPOSITION_CONFIGURATIONS, OR_DISPOSITION_FACT_IDS, oregonDispositionIdentity, oregonDispositionQuestionApplies } from "@/lib/rcap-engine/oregon-disposition-identity";
import { ND_FIRST_OFFENSE_FAMILY, ND_FIRST_OFFENSE_CONTACT_FIELDS, ND_FIRST_OFFENSE_CONTACT_IDS, isNdFirstOffenseFamily, ndFirstOffenseContactQuestions, ndFirstOffenseFamilyInputs } from "@/lib/expungement-ai/nd-first-offense-family-inputs";
import { dcInnocenceLocationIsContext, DC_LEGACY_LOCATION } from "@/lib/rcap-engine/dc-innocence-location-context";
import { KS_MUNICIPAL_CONTACT_FIELDS, KS_MUNICIPAL_CONTACT_IDS, KS_MUNICIPAL_CONTACT_SOURCE, isKsMunicipalContact, ksMunicipalContactQuestions, ksMunicipalContactInputs } from "@/lib/expungement-ai/ks-municipal-contact";
import { CT_CLEAN_SLATE_CONTACT_FIELDS, CT_CLEAN_SLATE_CONTACT_IDS, CT_CLEAN_SLATE_CONTACT_SOURCE, isCtCleanSlateContact, ctCleanSlateContactQuestions, ctCleanSlateContactInputs } from "@/lib/expungement-ai/ct-clean-slate-contact";
import { akCourtviewContactQuestions, akCourtviewContactIds, akCourtviewContactInputs, akCourtviewContactAnswerState, isAkCourtviewContact, AK_TF810_CONTACT_FIELDS, AK_TF810_GROUND_IDS, AK_TF810_PUBLIC_ID } from "@/lib/expungement-ai/ak-courtview-contact";
import { caProp64JuvenilePreparationScope } from "@/lib/expungement-ai/ca-prop64-juvenile-document-preparation";
import { caProp64JuvenileDocumentQuestions, caProp64JuvenileAdditionalCount } from "@/lib/expungement-ai/ca-prop64-juvenile-document-questions";
import { montanaDeferredDocumentInputs, montanaDeferredAliasDisplay, MT_DEFERRED_PARTICIPANT_ALIASES, MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT } from "@/lib/expungement-ai/mt-deferred-document-inputs";
import { montanaDeferredDocumentQuestions, montanaDeferredDocumentReviewNotices } from "@/lib/expungement-ai/mt-deferred-document-questions";
import { MT_DEFERRED_ROUTE, MT_DEFERRED_FACT_IDS, montanaDeferredFactApplies, montanaDeferredLegacyFinancialApplies, isMontanaDeferredContract } from "@/lib/rcap-engine/montana-deferred-facts";
import { MO_MARIJUANA_STATUS_ROUTE, MO_MARIJUANA_CUSTODY_FACT, MO_MARIJUANA_FACT_IDS, missouriMarijuanaFactApplies, missouriMarijuanaStatusQuestionApplies, isMissouriMarijuanaStatusContract } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import { missouriClosedRecordQuestionApplies, isMissouriClosureGuidanceWithoutIdentityForm, MO_CLOSED_RECORD_ROUTE } from "@/lib/rcap-engine/missouri-closed-record-facts";
import { maineNonconvictionQuestionApplies, maineNonconvictionCorrectionApplies, maineMissingFinancialCorrectionPathway, isMaineNonconvictionGuidanceWithoutCr218, ME_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/maine-nonconviction-facts";
import { louisianaAutomationStatusQuestionApplies, LA_AUTOMATION_STATUS_ROUTE } from "@/lib/rcap-engine/louisiana-automation-status";
import { nebraskaNonconvictionQuestionApplies, nebraskaAdultNonconvictionCorrectionApplies, nebraskaMissingFinancialCorrectionPathway } from "@/lib/rcap-engine/nebraska-nonconviction-facts";
import { AR_RECORD_ORIGIN_ID, arkansasRecordOrigin, arkansasRecordOriginApplies } from "@/lib/rcap-engine/arkansas-record-origin";
import { KS_REGISTRATION_ROUTE } from "@/lib/rcap-engine/kansas-district-facts";
import { NY_FUTURE_ID, NY_FUTURE_FACT_IDS } from "@/lib/expungement-ai/ny-16059-future-applications";
import { ny16059CurrentDocumentQuestions, NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS } from "@/lib/expungement-ai/ny-16059-current-document-questions";
import { NY_TRANSACTION_ASSOCIATIONS_ID, nyTransactionAssociationsQuestion, nyTransactionFactsFromAnswers } from "@/lib/expungement-ai/ny-16059-transaction-facts";
import { preserveNySeparateDeclaration, nyProtectedTransactionInputIssues } from "@/lib/expungement-ai/ny-16059-transaction-associations";
import { isNy16059Packet, NY_PACKET_QUESTIONS, NY_PACKET_FACT_IDS } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { NY_CASE_FACT_IDS, NY_HISTORY_FACT_IDS, nyCasePreparationQuestions, nyCaseAssociationIssues } from "@/lib/expungement-ai/ny-16059-case-questions";
import convictionFallbackPrior from "@/lib/expungement-ai/conviction-fallback-prior-contracts.json";
import { GA_PARDON_ROUTE, GA_PARDON_FACT_IDS, georgiaPardonQuestionApplies, georgiaPardonRequested } from "@/lib/rcap-engine/georgia-pardon-facts";
import { convictionReliefRequest, convictionReliefQuestionApplies, convictionReliefQuestions, isAdultConvictionAnswer } from "@/lib/rcap-engine/conviction-relief-request";
import { msExactCalendarDate, msExactTimingQuestionIds, MS_MIP_ROUTE, MS_MIP_LEGACY_DATE_ID, MS_MIP_BOTH_DATE_ID } from "@/lib/rcap-engine/mississippi-exact-timing";
import { caSafeAtHomeQuestion, caProp64ContactQuestions } from "@/lib/expungement-ai/ca-prop64-contact-questions";
import { CA_SAFE_AT_HOME_ID, CA_FILER_CONTACT, CA_CONTACT_IDS, CA_CONTACT_CONTRACT } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { CA_PROP64_CAPTION_QUESTIONS, CA_PROP64_CAPTION_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-caption-facts";
import { GA_FIRST_OFFENDER_FACT_IDS, GA_ORIGINAL_FIRST_OFFENDER_PATHWAY, georgiaFirstOffenderQuestionApplies } from "@/lib/rcap-engine/georgia-first-offender";
import { IL_CANNABIS_FACT_IDS, IL_CANNABIS_PATHWAY, illinoisCannabisQuestionApplies } from "@/lib/rcap-engine/illinois-cannabis-facts";
import { pathwayExcludedByKnownFacts } from "@/lib/rcap-engine/factual-pathway-exclusions";
import { CA_PROP64_FACT_IDS, CA_PROP64_FACT_QUESTIONS, CA_PROP64_REASON_COPY, caProp64ActiveFactIds } from "@/lib/rcap-engine/california-prop64-facts";
import { ny16059CustodyRemovalAvailable } from "@/lib/expungement-ai/ny-custody-correction";
import { NY_16059_FACT_IDS, NY_16059_ROUTE, ny16059QuestionApplies, ny16059History, NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID } from "@/lib/rcap-engine/new-york-16059-facts";
import { CA_PROP64_QUESTIONS, CA_PROP64_COMPLETED, isCaProp64Pathway, caProp64Choice } from "@/lib/expungement-ai/ca-prop64-choices";
import { caProp64RecordQuestions } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { caProp64RecordAnswerState, CA_PROP64_RECORD_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-record-answer";
import { isAffirmative, isNegative, isExplicitUnknownAnswer } from "@/lib/rcap-engine/answer-normalization";
import { recordFactOwnQuestionIds, recordFactConfirmationFor, vaPardonTypeConfirmationsAfterChange, mnTargetOriginConfirmationsAfterChange, mdJuvenileCaptionConfirmationsAfterChange, unresolvedRecordFactConfirmations, recordFactCourtConflict, type RecordFactConfirmations } from "@/lib/expungement-ai/record-fact-clarification";
import { georgiaPardonPreparationFactIds } from "@/lib/expungement-ai/ga-pardon-preparation";
import { fullSsnLastFour, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import { reviewedContactRepresentation, contactRepresentationHash, contactRepresentationProvenance, isProvenContactOutput } from "@/lib/expungement-ai/contact-representation";
import { courtCompletionContractsFor, refreshCourtCompletionImplications } from "@/lib/expungement-ai/court-completion-reuse";
import { isIndependentPaidFinancialFact } from "@/lib/expungement-ai/court-completion-fact-meaning";
import { reviewedPacketQuestion } from "@/lib/expungement-ai/reviewed-question-copy";
import { reviewedPacketContractSuccessor, preserveAmbiguousMsAnswer, MS_CHARGED_CONDUCT_FACT } from "@/lib/expungement-ai/packet-contract-successors";
import { answerValueIsKnown, questionAnswerState, scalarAnswerText, normalizeQuestionChoices, sameKnownQuestionAnswer } from "@/lib/expungement-ai/question-answer-state";
import { inspectProtectedLegacyShapes, preserveProtectedLegacyShapes, archiveExplicitLegacyShapeReplacements, legacyShapeQuestionMetadata } from "@/lib/expungement-ai/protected-legacy-answers";
import "server-only";

import { createHash } from "node:crypto";

import type {
  ConsumerBriefcaseItem,
  PacketVerificationRecord,
  PacketVerificationSnapshot
} from "@/lib/expungement-ai/types";
import type { AnswerValue, PacketPlan, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { isMarylandAutomaticWithoutCounty, packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { isGeorgiaAgencyWithoutCounty } from "@/lib/rcap-engine/georgia-agency-county-context";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { compareAtProtectedSnapshotTime, InvalidAnswerError, normalizeCaseOutcome } from "@/lib/rcap-engine/evaluator";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import {
  readProtectedPacketVerification,
  type ProtectedPacketDraftSnapshot,
  type ProtectedPacketVerificationRecord,
  type ProtectedPacketVerificationTransition
} from "@/lib/expungement-ai/verification-cas";
import {
  packetSpecificationFactFor,
  packetSpecificationFor,
  composablePacketSpecificationFor,
  type PacketSpecificationFact
} from "@/lib/rcap/grade-a/packet-specification";
import { MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS, mississippiParticipantDeliverySafety, routeSafetyGateFactIds } from "@/lib/expungement-ai/packet-route-safety";
import { baselineCarriedFactIds, routeCollectionOverrideFor } from "@/lib/expungement-ai/packet-collection-overrides";
import {
  prepayGateFactIds,
  caTool3RecordIsHistory,
  wy1502CategoryIsHistory,
  sdSisCategoryIsHistory,
  ilProstitutionCategoryIsHistory,
  caTool4RecordIsHistory,
  coPetitionRecordIsHistory,
  dcFlPetitionRecordIsHistory,
  dcFelonyRecordIsHistory,
  nvProgramCategoryIsHistory,
  ctPetitionCategoryIsHistory,
  gaSb288CategoryIsHistory,
  ctInformationCategoryIsHistory,
  alThreeRouteCategoryIsHistory,
  kyThreeRouteCategoryIsHistory,
  laThreeRouteCategoryIsHistory,
  maThreeRouteCategoryIsHistory,
  maAdditionalCategoryIsHistory,
  maMeCategoryIsHistory,
  iaCategoryIsHistory,
  arBoundCategoryIsHistory,
  hiThreeRouteCategoryIsHistory,
  dcInnocenceCategoryIsHistory,
  ilIdentityCategoryIsHistory,
  msAdditionalCategoryIsHistory,
  resolvePacketCollection,
  resolvedFactValues,
  type PacketCollectionResolution
} from "@/lib/expungement-ai/packet-collection";
import { pathwayRelevantFactIds, routeDecidingFactScope } from "@/lib/rcap-engine/route-fact-relevance";

export type PacketInformationStage = "not_started" | "in_progress" | "facts_complete" | "ready_to_generate";

export type PacketVerificationSummaryFact = {
  key: string;
  id: string;
  label: string;
  value: unknown;
  source: "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts";
  /** Jurisdiction and selected-pathway ids are display context, not participant answers. */
  systemContext: boolean;
  /** Display purpose only; never an answer, form binding or authority grant. */
  purpose?: { en: string; es: string };
};

// GA15 / VA-01 adopted v3 section7: preserve seven saved facts without creating court fields.
const VA_PARDON_FACT_PURPOSES: Record<string, { en: string; es: string }> = {
  "date_of_birth": {
    "en": "Saved only if needed to match the pardon and case identity. It is not added to CC-1474.",
    "es": "Se conserva solo si hace falta para cotejar la identidad con el indulto y el caso. No se añade al formulario CC-1474."
  },
  "mailing_address": {
    "en": "Saved as correspondence information. This adds no CC-1474 field or participant filing requirement.",
    "es": "Se conserva como información para correspondencia. Esto no añade un campo al formulario CC-1474 ni un requisito de presentación para usted."
  },
  "phone_number": {
    "en": "Saved as contact information, not an eligibility condition. It is not added to CC-1474.",
    "es": "Se conserva como información de contacto, no como condición de elegibilidad. No se añade al formulario CC-1474."
  },
  "email_address": {
    "en": "Saved as your independent contact choice. This gives no consent to electronic service and adds no CC-1474 field.",
    "es": "Se conserva como su elección independiente de contacto. Esto no otorga consentimiento para la notificación procesal electrónica ni añade un campo al formulario CC-1474."
  },
  "full_name_at_time_of_arrest": {
    "en": "Saved to match the actual pardon and case identity, including needed aliases. An earlier name is not automatically used as the CC-1474 subject name.",
    "es": "Se conserva para cotejar la identidad con el indulto y el caso, incluidos los alias necesarios. Un nombre anterior no se usa automáticamente como nombre de la persona en el formulario CC-1474."
  },
  "charges_to_be_expunged": {
    "en": "Saved to identify the actual offenses and case numbers covered by the pardon. This does not confirm that a court order has been prepared.",
    "es": "Se conserva para identificar los delitos y números de caso que realmente abarca el indulto. Esto no confirma que se haya preparado una orden judicial."
  },
  "final_disposition_dates_and_courts": {
    "en": "Saved to confirm the proper receiving court and case. An original conviction or disposition date is not the new court-order or clerk-forwarding date.",
    "es": "Se conserva para confirmar el tribunal receptor y el caso correctos. La fecha original de condena o resolución no es la fecha de la nueva orden judicial ni la fecha de envío por la secretaría del tribunal."
  }
};

export type PacketVerificationContextFact = {
  key: string;
  label: string;
  value: unknown;
  /** Display-only server context. It is never participant answer authority. */
  systemContext: true;
};

export type PacketVerificationManifest = {
  schemaVersion: "expungement-ai/verification-review-manifest/v1";
  factKeys: string[];
  systemContextKeys: string[];
};

/**
 * One participant section of the builder, carrying the questions it asks.
 *
 * The heading travels with its Spanish translation because the section is
 * authored here rather than in the component, and a heading that reached the
 * participant without one would be an English-only surface.
 */
export type PacketInformationSection = {
  id: string;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
  questionIds: string[];
};

export type PacketInformationModel = {
  stateCode: string;
  stateName: string;
  pathwayId: string | null;
  pathwayLabel: string;
  packetPlan: PacketPlan | null;
  questions: ProfileQuestion[];
  builderQuestions: ProfileQuestion[];
  /** The grouping the builder renders. Empty where the route cannot be resolved. */
  builderSections: PacketInformationSection[];
  initialAnswers: Record<string, AnswerValue>;
  screeningAnswers: Record<string, AnswerValue>;
  /** Explicit protected-authority facts; arbitrary persisted serverFacts are discarded. */
  serverFacts: Record<string, AnswerValue>;
  /** Canonical review surface for every fact map covered by the verification hash. */
  verificationSummary: PacketVerificationSummaryFact[];
  /** Completeness surface for every non-participant snapshot dependency. */
  verificationContext: PacketVerificationContextFact[];
  verificationManifest: PacketVerificationManifest;
  requiredInputIds: string[];
  missingInputIds: string[];
  pendingDerivations: PacketCollectionResolution["pendingDerivations"];
  contactReconciliation?: PacketCollectionResolution["contactReconciliation"];
  recordOwnQuestionIds?: string[];
  recordClarificationIds?: string[];
  courtRecordConflict?: boolean;
  nyCaseIssues?: ReturnType<typeof nyCaseAssociationIssues>;
  stage: PacketInformationStage;
  updatedAt: string | null;
  reviewedAt: string | null;
};

export type ProtectedPacketInformationModel = Pick<
  PacketInformationModel,
  | "stateCode"
  | "pathwayId"
  | "packetPlan"
  | "questions"
  | "builderQuestions"
  | "builderSections"
  | "initialAnswers"
  | "screeningAnswers"
  | "serverFacts"
  | "requiredInputIds"
  | "missingInputIds"
  | "pendingDerivations"
  | "contactReconciliation"
  | "recordOwnQuestionIds"
  | "recordClarificationIds"
  | "courtRecordConflict"
  | "nyCaseIssues"
  | "stage"
  | "reviewedAt"
  | "verificationSummary"
  | "verificationContext"
  | "verificationManifest"
> & {
  /** Validated current result, including a narrowly admitted held successor. */
  resultCode: ProtectedPacketDraftSnapshot["resultCode"];
  /** Owner correction surface only; never legal/packet/payment authority. */
  caProp64Clarification?: boolean;
  /** Original factual controls recovered from validated protected history only. */
  heldFactualCorrectionIds?: string[];
  gaPardonPreparationAvailable?: boolean;
  mtDeferredPreparationAvailable?: boolean;
  caJuvenilePreparationAvailable?: boolean;
  caJuvenilePreparationFactIds?: string[];
  caJuvenilePreparationActiveFactIds?: string[];
  mtDeferredPreparationFactIds?: string[];
  mtDeferredPreparationActiveFactIds?: string[];
  mtDeferredPreparationReviewRequired?: boolean;
  mtDeferredPreparationNotices?: Array<{ en: string; es: string }>;
  /** Explicit preparation editor only; never additions to the protected plan. */
  mdJuvenilePreparationFactIds?: string[];
  gaPardonPreparationFactIds?: string[];
  recordFactConfirmations?: RecordFactConfirmations;
  /** Reported document wording plus adopted checklist; no qualification or court finding. */
  vaPardonTypeHeldContext?: {
    status: "HELD_CONTEXT";
    reportedState: ReturnType<typeof vaPardonTypeReportedState>;
    participantChecklistItem: { id: string; text: string; requiredBeforeFiling: boolean };
    languageHold: "es_translation_not_adopted";
  };
  /** Held source-stage information only, never a client-supplied route/track. */
  mnSourceStageCandidate?: MnHeldSourceStage;
  revision: number;
  prefilledAnswers: Record<string, AnswerValue>;
  packetAnswers: Record<string, AnswerValue>;
  capturedAt: string;
  reviewSafety: { safe: boolean; reason: string };
  expectedComponents: string[];
};

type CommercialFlow = {
  version?: unknown;
  entitlementSource?: unknown;
  productId?: unknown;
  screening?: {
    profileVersion?: unknown;
    screeningMatterId?: unknown;
    pathwayId?: unknown;
    pathwayLabel?: unknown;
    resultCode?: unknown;
    paymentAllowed?: unknown;
    packetType?: unknown;
    packetPlan?: unknown;
    answers?: unknown;
  };
  packetInformation?: {
    stage?: unknown;
    requiredInputIds?: unknown;
    serverFacts?: unknown;
    prefilledAnswers?: unknown;
    answers?: unknown;
    missingInputIds?: unknown;
    updatedAt?: unknown;
    reviewedAt?: unknown;
  };
  verification?: unknown;
};

/** Build the exact state/pathway questionnaire from the server-saved packet plan. */
export function packetInformationModelFor(item: ConsumerBriefcaseItem): PacketInformationModel | null {
  const profile = getProfileByJurisdiction(item.state);
  if (!profile) return null;
  const flow = commercialFlowForItem(item, profile);
  if (!flow) return null;

  const publicProfile = projectPublicProfile(profile);
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const progress = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  const packetPlan = readPacketPlan(screening.packetPlan);
  let requiredInputIds = packetPlan?.requiredInputIds
    ?? stringArray(progress.requiredInputIds);
  const pathwayId = typeof screening.pathwayId === "string"
    ? screening.pathwayId
    : packetPlan?.pathwayId ?? null;
  // These exact former MD automatic / GA agency plans inherited one unrelated
  // participant county input. This is collection compatibility only: retain
  // the stored plan, authority and raw answers. A prosecutor's GA Section Three
  // county is still theirs to complete. Other plan differences need review.
  if (pathwayId && screening.pathwayId === pathwayId
    && (isMarylandAutomaticWithoutCounty(profile, pathwayId) || isGeorgiaAgencyWithoutCounty(profile, pathwayId))
    && isRecord(screening.packetPlan) && Array.isArray(screening.packetPlan.requiredInputIds)
    && screening.packetPlan.requiredInputIds.filter(id => id === "county").length === 1) {
    const currentPlan = packetPlanForPathway(profile, pathwayId);
    const candidate = { ...screening.packetPlan,
      requiredInputIds: screening.packetPlan.requiredInputIds.filter(id => id !== "county") };
    if (currentPlan && canonicalEqual(candidate, currentPlan)) requiredInputIds = currentPlan.requiredInputIds;
  }
  if (pathwayId && screening.pathwayId === pathwayId
    && dcInnocenceLocationIsContext(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))
    && isRecord(screening.packetPlan) && Array.isArray(screening.packetPlan.requiredInputIds)
    && screening.packetPlan.requiredInputIds.filter(id => id === DC_LEGACY_LOCATION).length === 1) {
    const currentPlan = packetPlanForPathway(profile, pathwayId);
    const candidate = { ...screening.packetPlan,
      requiredInputIds: screening.packetPlan.requiredInputIds.filter(id => id !== DC_LEGACY_LOCATION) };
    if (currentPlan && canonicalEqual(candidate, currentPlan)) requiredInputIds = currentPlan.requiredInputIds;
  }
  if (msFirstOffenderSourceContract(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))) {
    requiredInputIds = [...new Set([...requiredInputIds, ...MS_FIRST_OFFENDER_COLLECTION_IDS])];
  }
  if (mnTwoCountySourceContract(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))) {
    requiredInputIds = [...new Set([...requiredInputIds, ...mnTwoCountyFactIds(pathwayId!), MN_TARGET_ORIGIN_ID])];
  }
  const serverFacts = canonicalServerFacts(profile.jurisdiction.code, pathwayId);
  const screeningAnswers = answerRecord(screening.answers);
  const prefilledAnswers = answerRecord(progress.prefilledAnswers);
  const savedAnswers = answerRecord(progress.answers);
  const initialAnswers: Record<string, AnswerValue> = {
    ...Object.fromEntries(requiredInputIds.filter((id) => id in screeningAnswers).map((id) => [id, screeningAnswers[id]])),
    ...prefilledAnswers,
    ...savedAnswers
  };

  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket", "court_requirements_completed"]) {
      if (!(id in initialAnswers) && id in screeningAnswers) initialAnswers[id] = screeningAnswers[id];
    }
    if (!("offense_category" in initialAnswers) && "offense_level" in initialAnswers) initialAnswers.offense_category = initialAnswers.offense_level;
    if (!("sentence_completion_date" in initialAnswers) && answerIsKnown(screeningAnswers.court_requirements_completed)
      && answerText(screeningAnswers.court_requirements_completed) === "yes") {
      initialAnswers.sentence_completion_date = "Yes";
    }
    if (!("court_requirements_completed" in initialAnswers) && screeningAnswers.court_requirements_completed) {
      initialAnswers.court_requirements_completed = screeningAnswers.court_requirements_completed;
    }
  }

  // The collection policy, applied to every route rather than to one. It only
  // ever ADDS a value the participant already gave or that follows
  // deterministically from one; an id already present keeps whatever it has,
  // so nothing above this line is overwritten and no saved answer is touched.
  const collection = packetCollectionFor({
    jurisdiction: profile.jurisdiction.code,
    pathwayId,
    requiredInputIds,
    serverFacts,
    screeningAnswers,
    prefilledAnswers,
    savedAnswers
  });
  if (collection) {
    for (const [id, value] of Object.entries(resolvedFactValues(collection))) {
      if (!(id in serverFacts) && !answerIsKnown(initialAnswers[id])) initialAnswers[id] = value;
    }
  }

  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(publicProfile)) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, profile.jurisdiction.code, pathwayId, requiredInputIds, initialAnswers);

  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  if (mississippiNonConviction) {
    const owner = knownParticipantOwner(questionById, screeningAnswers.ownership_scope);
    questions = questions.map((question) => question.id === "pending_cases"
      ? { ...question, prompt: owner ? "Do you currently have any pending criminal charges?" : "Does this person currently have any pending criminal charges?" }
      : question.id === "residency_or_location"
        ? { ...question, prompt: "What city do you currently live in?", helperText: "This is used for the petitioner city in the packet." }
        : question.id === "offense_category"
          ? { ...question, prompt: "How is the offense classified on the court record?", helperText: "Use the classification printed on the record; for this route it is carried forward from the charge level when they match." }
          : question);
    const courtCompletion = questionById.get("court_requirements_completed")
      ?? packetQuestion("court_requirements_completed", owner ? "Have you completed everything the court ordered in this case?" : "Has this person completed everything the court ordered in this case?", "yes_no_unsure");
    questions.push({ ...courtCompletion, required: true, contextOnly: false });
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"]) {
      const known = questionById.get(id);
      if (known && !questions.some((question) => question.id === id)) questions.push({ ...known, required: true, contextOnly: false });
    }
  }
  if (collection?.facts.some(fact => fact.factId === DC_LEGACY_LOCATION && fact.source === "dc_fixed_caption_location_context" && fact.optional)
    && !questions.some(question => question.id === DC_LEGACY_LOCATION)) questions.push(fallbackPacketQuestion(DC_LEGACY_LOCATION));
  questions = questions.map((question) => reviewedPacketQuestion(question, { state: profile.jurisdiction.code, pathwayId, participantOwnsRecord: knownParticipantOwner(questionById, screeningAnswers.ownership_scope), participantHelpingRecord: knownParticipantHelper(questionById, screeningAnswers.ownership_scope) }));
  questions = questions.map(question => ndFirstOffenseRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akCourtviewRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akPardonRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akJuvenileRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akAgencyOrSisRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => alRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => arNonconvictionRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => collection?.facts.some(fact => fact.factId === question.id && ["wy1502_category_history", "sd_sis_category_history", "il_prostitution_category_history", "ma_me_category_history", "ma_additional_category_history", "ma_three_route_category_history", "la_three_route_category_history", "ky_three_route_category_history", "ia_three_route_category_history", "hi_three_route_category_history", "ar_bound_category_history", "al_three_route_category_history", "nv_program_category_history", "ct_petition_category_history", "ga_sb288_category_history", "ct_information_category_history", "dc_innocence_category_history", "il_identity_category_history", "ms_additional_category_history"].includes(fact.source))
    ? { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const } : question);
  questions = questions.map(question => ohTraffickingCourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mo610105CourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mo610122CourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => collection?.facts.some(fact => fact.factId === question.id && fact.source === "md_police_retained_context")
    || mdPoliceContext(profile, pathwayId) && packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`) == null && ["county", "court"].includes(question.id)
    ? { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const } : question);
  questions = questions.map(question => moXivCourtContextQuestion(question, collection?.facts.some(fact => fact.factId === "court" && fact.source === "mo_xiv_court_retained_context") === true));
  questions = questions.map(question => mn609a015LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mn299c11LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mn609a017LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mnCannabisLocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => {
    const fact = collection?.facts.find(fact => fact.factId === question.id);
    if (fact?.source === "mn_two_county_legacy_context" && fact.active === false) return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const };
    if (fact?.source === "mn_two_county_source_fact" && fact.active === false) return { ...question, required: false };
    return question;
  });
  questions = questions.map(question => arFelonyRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => ca12034RecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => ca12034aRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => caAutomaticRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => caTool3RecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "ca_tool3_record_type_history") === true));
  questions = questions.map(question => ctPetitionDateQuestion(question, ctPetitionContext(profile, pathwayId)));
  questions = questions.map(question => caTool4RecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "ca_tool4_record_type_history") === true));
  questions = questions.map(question => coPetitionRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "co_petition_record_type_history") === true));
  questions = questions.map(question => dcFelonyRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "dc_felony_record_type_history") === true));
  questions = questions.map(question => dcFlPetitionRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "dc_fl_petition_record_type_history") === true));
  questions = questions.map(question => delawareProtectedExclusionQuestion(question, profile, pathwayId, initialAnswers));
  for (const question of questions) questionById.set(question.id, question);
  if (alRedeemerClassificationContract(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))) {
    questions = questions.map(alRedeemerCategoryQuestion);
    for (const question of alRedeemerClassificationQuestions(initialAnswers)) {
      if (!questions.some(existing => existing.id === question.id)) questions.push(question);
    }
    for (const question of questions) questionById.set(question.id, question);
  }
  const builderQuestions = builderQuestionsFor(questions, collection, requiredInputIds, serverFacts);
  const missingInputIds = missingRequiredInputs(
    collectionGateInputIds(collection, requiredInputIds, serverFacts),
    serverFacts,
    initialAnswers,
    new Map(questions.map((question) => [question.id, question]))
  );
  if (collection?.contactReconciliation && !missingInputIds.includes("contact_information")) missingInputIds.push("contact_information");
  const verificationSummary = verificationSummaryFor(flow, questionById, serverFacts);
  const verificationContext = verificationContextFor(
    verificationContextSourceFor(item, flow, profile, pathwayId)
  );
  const verificationManifest: PacketVerificationManifest = {
    schemaVersion: "expungement-ai/verification-review-manifest/v1",
    factKeys: verificationSummary.map((fact) => fact.key),
    systemContextKeys: verificationContext.map((entry) => entry.key)
  };

  return {
    stateCode: profile.jurisdiction.code,
    stateName: profile.jurisdiction.name,
    pathwayId,
    pathwayLabel: typeof screening.pathwayLabel === "string"
      ? screening.pathwayLabel
      : item.pathwayLabel ?? `${profile.jurisdiction.name} record-clearing`,
    packetPlan,
    questions,
    builderQuestions,
    builderSections: builderSectionsFor(collection, builderQuestions),
    initialAnswers,
    screeningAnswers,
    serverFacts,
    verificationSummary,
    verificationContext,
    verificationManifest,
    requiredInputIds,
    missingInputIds,
    pendingDerivations: collection?.pendingDerivations ?? [],
    contactReconciliation: collection?.contactReconciliation,
    stage: packetInformationStage(progress.stage),
    updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : null,
    reviewedAt: typeof progress.reviewedAt === "string" ? progress.reviewedAt : null
  };
}

export function reviewedPacketInputHash(item: ConsumerBriefcaseItem) {
  const verification = packetVerificationState(item);
  return verification.status === "verified" ? verification.hash : null;
}

export function missingRequiredInputs(
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>,
  answers: Record<string, AnswerValue>,
  questionById?: ReadonlyMap<string, ProfileQuestion>
) {
  return requiredInputIds.filter((id) => {
    if (answerIsKnown(serverFacts[id])) return false;
    const question = questionById?.get(id);
    return question ? questionAnswerState(question, answers[id]) !== "known_valid" : !answerIsKnown(answers[id]);
  });
}

export function expectedPacketComponents(plan: PacketPlan | null): string[] {
  if (plan?.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    return [
      "Petition for Expungement",
      "Proposed Order",
      "Certificate of Service",
      "Attachment and Records Checklist",
      "Filing Instructions and Attorney Handoff Conditions"
    ];
  }
  if (plan?.mode === "official_form_overlay_or_source_form_set") {
    return [
      "Completed self-help court forms for this matter",
      "A filing-preparation checklist",
      "Plain-language filing and next-step instructions"
    ];
  }
  return [
    "A personalized self-help court-filing packet for this matter",
    "A filing-preparation checklist",
    "Plain-language filing and next-step instructions"
  ];
}

/** A display suggestion, never a fact or a profile-based derivation. Caller has checked exact matter ownership. */
export function packetAccountEmailSuggestion(model: Pick<PacketInformationModel, "stateCode" | "pathwayId" | "questions" | "screeningAnswers" | "initialAnswers" | "serverFacts" | "requiredInputIds">, accountEmail: string | null | undefined): string | null {
  const email = accountEmail?.trim();
  const profile = getProfileByJurisdiction(model.stateCode);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !profile || !model.pathwayId) return null;
  // The exact ND collector continues to ask for the participant's own
  // matter-specific contact. A document-contract successor adds no account source.
  if (ndFirstOffenseFamilyContract(profile, model.pathwayId)) return null;
  const questionById = new Map(allPublicQuestions(projectPublicProfile(profile)).map((question) => [question.id, toProfileQuestion(question)]));
  if (!knownParticipantOwner(questionById, model.screeningAnswers.ownership_scope)) return null;
  const specification = composablePacketSpecificationFor(`${model.stateCode}:${model.pathwayId}`);
  const fact = specification?.requiredFacts.find((fact) => fact.factId === "email_address");
  const question = model.questions.find((question) => question.id === "email_address");
  if (!fact || fact.ownership !== "participant" || !specification?.fieldOwnership?.participantOwnedFacts.includes("email_address")
    || !question || !model.requiredInputIds.includes("email_address") || "email_address" in model.serverFacts
    || questionAnswerState(question, email) !== "known_valid") return null;
  const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId, requiredInputIds: model.requiredInputIds,
    serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, savedAnswers: model.initialAnswers });
  const disposition = collection?.facts.find((fact) => fact.factId === "email_address");
  if (!disposition || ["external_actor", "derived", "unresolved"].includes(disposition.collection)
    || disposition.collection === "conditional" && disposition.active === false) return null;
  return email;
}

export function packetInformationPatch(input: {
  existingItem: ConsumerBriefcaseItem;
  answers: Record<string, AnswerValue>;
  verify?: boolean;
  mdJuvenilePreparation?: boolean;
  gaPardonPreparation?: boolean;
  mtDeferredPreparation?: boolean;
  caJuvenilePreparation?: boolean;
  useContactComponents?: boolean;
  clearInactiveCustodyFacts?: boolean;
  confirmRecordFacts?: string[];
  /** Server-authenticated owner's email, only after an explicit client adoption request. Never client profile data. */
  accountEmailSource?: string;
  /** Service-role protected state read immediately before deriving this transition. */
  protectedVerification: ProtectedPacketVerificationRecord;
  /** Compatibility only. Saving the final fact is never verification. */
  reviewed?: boolean;
}) {
  const priorProtected = input.protectedVerification;
  if ([input.mdJuvenilePreparation, input.gaPardonPreparation, input.mtDeferredPreparation, input.caJuvenilePreparation].filter(Boolean).length > 1) return null;
  const current = input.mdJuvenilePreparation ? mdJuvenilePreparationModelFor(priorProtected) : input.caJuvenilePreparation ? caProp64JuvenilePreparationModelFor(priorProtected) : input.mtDeferredPreparation ? montanaDeferredPreparationModelFor(priorProtected) : input.gaPardonPreparation ? gaPardonPreparationModelFor(priorProtected) : protectedPacketInformationModelFor(priorProtected);
  if (!current) return null;
  if ((input.mdJuvenilePreparation || input.gaPardonPreparation || input.mtDeferredPreparation || input.caJuvenilePreparation) && input.verify) return null;
  const allowedIds = editablePacketInputIds(current, true);
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const priorSnapshot = protectedAuthoritySnapshotFor(priorProtected)!;
  const sourceProfile = getProfileByJurisdiction(current.stateCode);
  const gaCtFactIds = georgiaSb288Context(sourceProfile, current.pathwayId) ? ["case_outcome", ...GA_SB288_FACT_IDS]
    : ctPetitionContext(sourceProfile, current.pathwayId) ? ["case_outcome", ...CT_PETITION_FACT_IDS] : [];
  const savedSourceFacts = { ...priorSnapshot.screeningAnswers, ...priorSnapshot.prefilledAnswers, ...priorSnapshot.packetAnswers };
  const answerDelta = Object.fromEntries(
    Object.entries(acceptedAnswers).filter(([id, answer]) => {
      const question = current.questions.find((candidate) => candidate.id === id);
      // A hidden invalid display value is not a new answer when its saved raw value is unchanged.
      if (gaCtFactIds.includes(id) && Object.hasOwn(savedSourceFacts, id) && canonicalEqual(savedSourceFacts[id], answer)) return false;
      return !canonicalEqual(current.initialAnswers[id], answer)
        && !(question && sameKnownQuestionAnswer(question, current.initialAnswers[id], answer));
    })
  );
  const storedIds = new Set([...current.requiredInputIds.filter((id) => !(id in current.serverFacts)), ...routeFactualCorrectionIds(current, true), ...(current.mtDeferredPreparationFactIds ?? []), ...(current.caJuvenilePreparationFactIds ?? []), ...(current.mdJuvenilePreparationFactIds ?? []),
    ...(current.stateCode === "MD" && current.pathwayId === "juvenile-expungement" ? Object.keys(current.packetAnswers) : []),
    ...(current.stateCode === "NY" && current.pathwayId === NY_16059_ROUTE ? Object.keys(current.packetAnswers) : [])]);
  // Losing a packet plan does not discard the owner's other saved packet facts.
  // They remain protected while the one existing financial fact is corrected.
  const retainedFinancialAnswers = !current.packetPlan && routeFactualCorrectionIds(current).length > 0
    ? answerRecord(protectedAuthoritySnapshotFor(priorProtected)?.packetAnswers) : undefined;
  const savedAnswers = { ...retainedFinancialAnswers, ...answerRecordForIds(current.packetAnswers, storedIds), ...answerDelta };
  const clearCustody = input.clearInactiveCustodyFacts === true;
  if (clearCustody && (!ny16059CustodyRemovalAvailable(current.stateCode, current.pathwayId, current.initialAnswers)
    || Object.keys(answerDelta).length || input.verify === true)) return null;
  const contactChoice = input.useContactComponents === true;
  const confirmations = input.confirmRecordFacts ?? [];
  const accountEmail = input.accountEmailSource === undefined ? null : packetAccountEmailSuggestion(current, input.accountEmailSource);
  if (input.accountEmailSource !== undefined && (!accountEmail || !sameKnownQuestionAnswer(
    current.questions.find((question) => question.id === "email_address")!, accountEmail, { ...current.initialAnswers, ...answerDelta }.email_address))) return null;
  if (confirmations.some((id) => !current.recordClarificationIds?.includes(id)
    || !answerValueIsKnown({ ...current.initialAnswers, ...answerDelta }[id])
    || questionAnswerState(current.questions.find((question) => question.id === id)!, { ...current.initialAnswers, ...answerDelta }[id]) !== "known_valid")) return null;
  const materialFactChange = clearCustody || Object.keys(answerDelta).length > 0 || contactChoice || confirmations.length > 0 || accountEmail !== null;
  const legacy = protectedLegacyAnswerProjection(priorSnapshot);
  const freshSensitiveMaps = refreshedSensitiveFactMaps(priorSnapshot.jurisdiction, priorSnapshot.pathwayId, priorSnapshot.requiredInputIds,
    ...participantMapArguments(legacy.maps));
  const freshContact = refreshedProtectedPacketFactMaps(priorSnapshot, freshSensitiveMaps);
  // A held legacy OR answer is not a request to rederive completion facts.
  // Read/no-op preserves its protected record; only a material explicit save
  // may produce a new draft, and never fills the both-events successor itself.
  const preserveMsMipLegacyNoop = priorSnapshot.jurisdiction === "MS" && priorSnapshot.pathwayId === MS_MIP_ROUTE
    && current.missingInputIds.includes(MS_MIP_BOTH_DATE_ID)
    && [priorSnapshot.screeningAnswers, priorSnapshot.prefilledAnswers, priorSnapshot.packetAnswers].some(map => Object.hasOwn(map, MS_MIP_LEGACY_DATE_ID))
    && ![priorSnapshot.screeningAnswers, priorSnapshot.prefilledAnswers, priorSnapshot.packetAnswers].some(map => Object.hasOwn(map, MS_MIP_BOTH_DATE_ID));
  const derivedRepairRequired = !preserveMsMipLegacyNoop && !canonicalEqual(preserveProtectedLegacyShapes(freshContact.maps, legacy.inspection, new Set()), {
    screeningAnswers: priorSnapshot.screeningAnswers, prefilledAnswers: priorSnapshot.prefilledAnswers, packetAnswers: priorSnapshot.packetAnswers
  });
  const currentVerification = packetVerificationStateForRecord(input.existingItem, priorProtected, true);
  if (!materialFactChange && !derivedRepairRequired && (input.verify !== true || currentVerification.status === "verified")) {
    const ready = currentVerification.status === "verified" && current.reviewSafety.safe;
    const packetInformation = {
      stage: ready ? "ready_to_generate" as const : current.stage,
      requiredInputIds: current.requiredInputIds,
      serverFacts: current.serverFacts,
      prefilledAnswers: current.prefilledAnswers,
      answers: current.packetAnswers,
      missingInputIds: current.missingInputIds,
      updatedAt: current.capturedAt,
      reviewedAt: current.reviewedAt,
      reviewSafety: { safe: ready, reason: ready ? "authoritative_route_confirmed" : currentVerification.reason }
    };
    const protectedTransition: ProtectedPacketVerificationTransition = {
      expectedPriorHash: priorProtected.status === "verified" ? priorProtected.hash ?? null : null,
      expectedPriorRevision: priorProtected.revision,
      answerDelta,
      packetInformationMetadata: packetInformationMetadata(packetInformation),
      nextVerification: priorProtected
    };
    return {
      patch: {
        commercialFlow: {
          packetInformation,
          verification: priorProtected
        }
      },
      protectedTransition,
      missingInputIds: current.missingInputIds,
      readyToGenerate: ready,
      reviewReason: ready ? "current_verification_preserved" : "semantic_noop_preserved"
    };
  }
  const now = new Date().toISOString();
  // MN target-origin meaning needs the existing explicit confirmation action.
  // A bare edit/restoration must not auto-confirm a historical generic scalar.
  const mnOriginRequiresExplicitConfirmation = mnTargetOriginQuestion(getProfileByJurisdiction(current.stateCode), current.pathwayId,
    packetSpecificationFor(`${current.stateCode}:${current.pathwayId ?? ""}`)) !== null;
  const mdCaptionRequiresExplicitConfirmation = mdJuvenileCaptionQuestion(getProfileByJurisdiction(current.stateCode), current.pathwayId,
    packetSpecificationFor(`${current.stateCode}:${current.pathwayId ?? ""}`)) !== null;
  const vaPardonRequiresExplicitConfirmation = `${current.stateCode}:${current.pathwayId}` === VA_PARDON_ROUTE;
  const automaticConfirmationIds = Object.keys(answerDelta)
    .filter(id => !(mnOriginRequiresExplicitConfirmation && id === MN_TARGET_ORIGIN_ID)
      && !(mdCaptionRequiresExplicitConfirmation && id === "county")
      && !(vaPardonRequiresExplicitConfirmation && id === VA_PARDON_TYPE_ID));
  const nextDraft = !materialFactChange && !derivedRepairRequired && canonicalEqual(priorSnapshot.packetPlan, current.packetPlan) && priorProtected.draftSnapshot
    ? priorProtected.draftSnapshot
    : deriveProtectedPacketDraftSnapshot(priorProtected, savedAnswers, now, contactChoice, [...new Set([...automaticConfirmationIds, ...confirmations])], new Set(Object.keys(answerDelta)), clearCustody, input.gaPardonPreparation === true, input.mtDeferredPreparation === true, input.caJuvenilePreparation === true, input.mdJuvenilePreparation === true);
  if (!nextDraft) return null;
  if (accountEmail) {
    nextDraft.dependencies = { ...nextDraft.dependencies, accountContactSources: { email_address: {
      version: 1, source: "same_owner_account_email", purpose: "this_packet_contact",
      valueSha256: createHash("sha256").update(accountEmail).digest("hex"), confirmedAt: now, status: "adopted"
    } } };
  } else if ("email_address" in answerDelta && nextDraft.dependencies.accountContactSources) {
    nextDraft.dependencies = { ...nextDraft.dependencies, accountContactSources: { email_address: {
      ...nextDraft.dependencies.accountContactSources.email_address, status: "superseded"
    } } };
  }
  const nextDraftHash = protectedPacketDraftHash(nextDraft);
  const draftRecord: ProtectedPacketVerificationRecord = {
    ...priorProtected,
    status: "invalidated",
    reason: "draft_rederived_pending_verification",
    hash: undefined,
    snapshot: undefined,
    draftHash: nextDraftHash,
    draftSnapshot: nextDraft
  };
  const evaluatedModel = input.mdJuvenilePreparation ? mdJuvenilePreparationModelFor(draftRecord) ?? protectedPacketInformationModelFor(draftRecord) : input.caJuvenilePreparation ? caProp64JuvenilePreparationModelFor(draftRecord) ?? protectedPacketInformationModelFor(draftRecord) : input.mtDeferredPreparation ? montanaDeferredPreparationModelFor(draftRecord) ?? protectedPacketInformationModelFor(draftRecord) : input.gaPardonPreparation ? gaPardonPreparationModelFor(draftRecord) ?? protectedPacketInformationModelFor(draftRecord) : protectedPacketInformationModelFor(draftRecord);
  const nextModel = evaluatedModel?.packetPlan ? evaluatedModel : caProp64ClarificationModelFor(draftRecord) ?? evaluatedModel;
  if (!nextModel) return null;
  const review = input.verify === true && nextModel.missingInputIds.length === 0
    ? protectedPacketDraftReviewSafety(nextDraft, now)
    : {
      safe: false,
      reason: nextModel.missingInputIds.length === 0 ? "final_verification_required" : "packet_information_incomplete"
    };
  const stage: PacketInformationStage = !nextModel.packetPlan ? "in_progress" : review.safe
    ? "ready_to_generate"
    : nextModel.missingInputIds.length === 0 && nextModel.pendingDerivations.length === 0 ? "facts_complete" : "in_progress";
  const packetInformation = {
    stage,
    requiredInputIds: nextDraft.requiredInputIds,
    serverFacts: nextModel.serverFacts,
    prefilledAnswers: nextModel.caProp64Clarification ? answerRecord(nextDraft.prefilledAnswers) : nextModel.prefilledAnswers,
    answers: nextModel.caProp64Clarification ? answerRecord(nextDraft.packetAnswers) : nextModel.packetAnswers,
    missingInputIds: nextModel.missingInputIds,
    updatedAt: now,
    reviewedAt: review.safe ? now : null,
    reviewSafety: review
  };
  const verification = review.safe
    ? verifiedPacketRecordFromDraft(nextDraft, now)
    : unverifiedOrInvalidatedPacketRecord(priorProtected, now, input.verify === true
      ? review.reason
      : "facts_saved_after_verification");
  const nextVerification: ProtectedPacketVerificationRecord = {
    ...verification,
    draftHash: nextDraftHash,
    draftSnapshot: nextDraft,
    revision: priorProtected.revision + 1
  };
  const protectedTransition: ProtectedPacketVerificationTransition = {
    expectedPriorHash: priorProtected.status === "verified" ? priorProtected.hash ?? null : null,
    expectedPriorRevision: priorProtected.revision,
    answerDelta,
    packetInformationMetadata: packetInformationMetadata(packetInformation),
    nextVerification
  };

  return {
    patch: {
      commercialFlow: {
        packetInformation,
        verification: nextVerification
      }
    },
    protectedTransition,
    missingInputIds: nextModel.missingInputIds,
    readyToGenerate: review.safe,
    reviewReason: review.reason
  };
}

export function packetVerificationState(item: ConsumerBriefcaseItem): PacketVerificationRecord {
  const flow = readCommercialFlow(item.artifactRefs);
  const stored = readVerificationRecord(flow?.verification);
  return packetVerificationStateForRecord(item, stored);
}

/** Pure authority check used after a protected service-role read. JSON verification is ignored. */
export function requireCurrentPacketVerificationRecord(
  item: ConsumerBriefcaseItem,
  protectedVerification: ProtectedPacketVerificationRecord | null
): {
  hash: string;
  snapshot: PacketVerificationSnapshot;
  revision: number;
  draftHash: string;
  draftSnapshot: ProtectedPacketDraftSnapshot;
} {
  if (!protectedVerification) {
    throw new CurrentPacketVerificationRequiredError("protected_verification_missing");
  }
  const verification = packetVerificationStateForRecord(item, protectedVerification, true);
  if (verification.status !== "verified" || !verification.hash || !verification.snapshot) {
    throw new CurrentPacketVerificationRequiredError(verification.reason);
  }
  return {
    hash: verification.hash,
    snapshot: verification.snapshot,
    revision: protectedVerification.revision,
    draftHash: protectedVerification.draftHash,
    draftSnapshot: protectedVerification.draftSnapshot
  };
}

/** Every commerce boundary reloads protected authority and then rederives it. */
export async function requireCurrentPacketVerification(
  consumerAuthUserId: string,
  item: ConsumerBriefcaseItem
): Promise<ReturnType<typeof requireCurrentPacketVerificationRecord>> {
  const protectedRead = await readProtectedPacketVerification({
    consumerAuthUserId,
    briefcaseItemId: item.id
  });
  if (!protectedRead.ok) {
    throw new CurrentPacketVerificationRequiredError(protectedRead.reason);
  }
  return requireCurrentPacketVerificationRecord(item, protectedRead.value);
}

function packetVerificationStateForRecord(
  item: ConsumerBriefcaseItem,
  stored: PacketVerificationRecord | ProtectedPacketVerificationRecord | null,
  protectedAuthority = false
): PacketVerificationRecord {
  if (protectedAuthority && stored) {
    const model = protectedPacketInformationModelFor(stored as ProtectedPacketVerificationRecord);
    return model && (stored.status !== "verified" || model.reviewSafety.safe)
      ? stored
      : { status: "invalidated", reason: "protected_verification_dependencies_changed" };
  }
  const flow = readCommercialFlow(item.artifactRefs);
  if (!flow || !stored || stored.status !== "verified" || !stored.hash || !stored.snapshot) {
    return stored ?? { status: "unverified", reason: "final_verification_missing" };
  }
  const model = packetInformationModelFor(item);
  if (!model || model.stage !== "ready_to_generate" || model.missingInputIds.length > 0 || !model.reviewedAt) {
    return { status: "invalidated", reason: "packet_information_not_ready" };
  }
  if (!packetInformationReviewSafety(item).safe) {
    return { status: "invalidated", reason: "authoritative_verification_failed" };
  }
  const currentSnapshot = buildPacketVerificationSnapshot(item, flow, stored.snapshot.verifiedAt);
  const currentHash = currentSnapshot ? packetVerificationHash(currentSnapshot) : null;
  if (!currentSnapshot || currentHash !== stored.hash) {
    return { status: "invalidated", reason: "verification_dependencies_changed" };
  }
  return stored;
}

/**
 * Reconstruct the exact reviewed packet facts from protected authority alone.
 * The participant JSON commercialFlow is a compatibility mirror and is never
 * required after the protected snapshot exists.
 */
/** Narrow recovery for an authenticated owner's source-valid CA snapshot rejected by the corrected input gates.
 * This is deliberately separate from protectedPacketInformationModelFor: no caller may use it as legal authority.
 */
export function caProp64ClarificationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  let snapshot = protectedAuthoritySnapshotFor(verification);
  if (!snapshot || !isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId)) return null;
  if (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))) return null;
  if (!canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] })) return null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (profile) snapshot = reviewedPacketContractSuccessor(snapshot, packetPlanForPathway(profile, snapshot.pathwayId!)) ?? snapshot;
  if (!profile || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.requiredInputIds, snapshot.packetPlan?.requiredInputIds ?? [])
    || snapshot.packetPlan && !canonicalEqual(snapshot.packetPlan, packetPlanForPathway(profile, snapshot.pathwayId!))) return null;
  const authoritative = evaluateProtectedPacketFacts(snapshot);
  const evaluation = authoritative?.evaluation;
  if (!authoritative || (authoritative.selectedTrackId ?? null) !== snapshot.selectedTrackId
    || (evaluation?.treatmentClassification ?? null) !== snapshot.treatmentClassification
    || !canonicalEqual(evaluation?.deferralComponentIds ?? [], snapshot.deferralComponentIds)) return null;
  const clarificationReasons = new Set(["ca.ca_prop64_currently_serving_branch_not_confirmed", "ca.ca_prop64_completed_sentence_branch_not_confirmed", "ca.ca_prop64_relief_requested_missing",
    "ca.ca_prop64_record_details_unconfirmed", "ca.ca_prop64_sentence_status_conflict",
    ...Object.keys(CA_PROP64_REASON_COPY).map(code => `ca.ca_prop64_${code}`)]);
  const scopedIds = snapshot.pathwayId === CA_PROP64_COMPLETED ? ["ca_prop64_branch", "ca_prop64_relief_requested"] : ["ca_prop64_branch", "sentence_completion_date"];
  if (!evaluation || evaluation.pathwayId !== snapshot.pathwayId || !["needs_review", "needs_more_info"].includes(evaluation.resultCode)
    || evaluation.paymentAllowed || evaluation.packetPlan || !evaluation.reasons.some((reason) => clarificationReasons.has(reason.code)
      || reason.code === "ca.source_fact_unknown" && scopedIds.some((id) => reason.text === `${id} is uncertain and requires source review.`))) return null;
  const allAnswers = { ...answerRecord(snapshot.screeningAnswers), ...answerRecord(snapshot.prefilledAnswers), ...answerRecord(snapshot.packetAnswers) };
  const activeFacts = caProp64ActiveFactIds(allAnswers);
  const questions = [...CA_PROP64_QUESTIONS.filter((question) => question.id === "ca_prop64_branch" || snapshot.pathwayId === CA_PROP64_COMPLETED),
    ...CA_PROP64_FACT_QUESTIONS.filter(question => activeFacts.includes(question.id))]
    .map((question) => ({ ...toProfileQuestion(question), required: true }));
  questions.push(...caProp64RecordQuestions(profile, profile.questions, snapshot.pathwayId).map(toProfileQuestion));
  for (const id of ["offense_level", "case_outcome"]) {
    const fact = allPublicQuestions(projectPublicProfile(profile)).find(question => question.id === id);
    if (fact) questions.push({ ...toProfileQuestion(fact), required: true });
  }
  // Preserve the existing completion fact; do not infer or rewrite it from the
  // selected branch. A same-case contradiction needs an explicit owner edit.
  const completionConflict = snapshot.pathwayId === CA_PROP64_COMPLETED
    ? isNegative(toScreeningAnswers(allAnswers).sentence_completion_date)
    : isAffirmative(toScreeningAnswers(allAnswers).sentence_completion_date);
  const completionUnknown = isExplicitUnknownAnswer(toScreeningAnswers(allAnswers).sentence_completion_date);
  if (completionConflict || completionUnknown) {
    const completion = allPublicQuestions(projectPublicProfile(profile)).find((question) => question.id === "sentence_completion_date");
    if (!completion) return null;
    const question = { ...toProfileQuestion(completion), required: true };
    if (questionAnswerState(question, allAnswers.sentence_completion_date) === "invalid") {
      question.legacyAnswerText = JSON.stringify(allAnswers.sentence_completion_date);
    }
    questions.push(question);
  }
  const ids = questions.map((question) => question.id);
  const screeningAnswers = answerRecordForIds(snapshot.screeningAnswers, new Set(ids));
  const prefilledAnswers = answerRecordForIds(snapshot.prefilledAnswers, new Set(ids));
  const packetAnswers = answerRecordForIds(snapshot.packetAnswers, new Set(ids));
  const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  for (const question of questions) {
    if (!CA_PROP64_RECORD_FACT_IDS.some((id) => id === question.id)
      || caProp64RecordAnswerState(question.id, raw[question.id]) !== "invalid") continue;
    // An invalid stored shape is evidence to review, not a new editable answer.
    // Omitting all shadowed representations prevents a lower-precedence value
    // from appearing to cure the invalid effective fact.
    question.legacyAnswerText = JSON.stringify(raw[question.id]);
    delete screeningAnswers[question.id]; delete prefilledAnswers[question.id]; delete packetAnswers[question.id];
  }
  const initialAnswers = { ...screeningAnswers, ...prefilledAnswers, ...packetAnswers };
  const missingInputIds = questions.filter((question) => questionAnswerState(question, initialAnswers[question.id]) !== "known_valid").map((question) => question.id);
  // A supported choice for the other branch is still unresolved for this saved route.
  const expectedBranch = snapshot.pathwayId === CA_PROP64_COMPLETED ? "completed-sentence application" : "currently-serving petition";
  if (caProp64Choice("ca_prop64_branch", initialAnswers.ca_prop64_branch) !== expectedBranch && !missingInputIds.includes("ca_prop64_branch")) missingInputIds.push("ca_prop64_branch");
  if (expectedBranch === "currently-serving petition" && caProp64Choice("ca_prop64_branch", initialAnswers.ca_prop64_branch) === expectedBranch
    && completionConflict && !missingInputIds.includes("sentence_completion_date")) missingInputIds.push("sentence_completion_date");
  return {
    caProp64Clarification: true, resultCode: evaluation.resultCode, stateCode: snapshot.jurisdiction, pathwayId: snapshot.pathwayId, revision: verification.revision,
    packetPlan: null, questions, builderQuestions: questions, builderSections: [], initialAnswers, screeningAnswers, prefilledAnswers, packetAnswers,
    serverFacts: canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId), requiredInputIds: ids, missingInputIds, pendingDerivations: [],
    stage: "in_progress", reviewedAt: null, capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt,
    verificationSummary: [], verificationContext: [], verificationManifest: { schemaVersion: "expungement-ai/verification-review-manifest/v1", factKeys: [], systemContextKeys: [] },
    reviewSafety: { safe: false, reason: "ca_prop64_choice_clarification_required" }, expectedComponents: []
  };
}

function caProp64AnswerHistory(base: ProtectedPacketAuthoritySnapshot, changedIds: ReadonlySet<string>) {
  const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
  // Preserve the exact old values, including malformed and shadowed facts.
  for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) for (const factId of new Set(["ca_prop64_branch", "ca_prop64_relief_requested", ...CA_PROP64_RECORD_FACT_IDS, "sentence_completion_date", ...changedIds])) {
    if (!(factId in base[source])) continue;
    const meaning = CA_PROP64_FACT_IDS.includes(factId) ? "ca_prop64_prior_conduct_answer" as const : factId === "sentence_completion_date" ? "ca_prop64_prior_completion_answer" as const
      : CA_PROP64_RECORD_FACT_IDS.some((id) => id === factId) ? "ca_prop64_prior_record_detail" as const : "ca_prop64_prior_choice_wording" as const;
    const entry = { factId, value: base[source][factId], source, meaning,
      routeKey: `${base.jurisdiction}:${base.pathwayId}`, profileVersion: base.profileVersion,
      profileSourceFingerprint: base.profileSourceFingerprint, profileAuthorityFingerprint: base.profileAuthorityFingerprint };
    if (!history.some((priorEntry) => canonicalEqual(priorEntry, entry))) history.push(entry);
  }
  return history;
}

/** Seeding must preserve every untouched source value, including inactive and unrecognized raw facts. */
function preserveUnchangedProtectedFacts<T extends ProtectedPacketAuthoritySnapshot>(next: T, prior: ProtectedPacketAuthoritySnapshot, changedIds: ReadonlySet<string>): T {
  const maps = { screeningAnswers: { ...next.screeningAnswers }, prefilledAnswers: { ...next.prefilledAnswers }, packetAnswers: { ...next.packetAnswers } };
  for (const id of new Set([...Object.keys(prior.screeningAnswers), ...Object.keys(prior.prefilledAnswers), ...Object.keys(prior.packetAnswers)])) {
    if (changedIds.has(id)) continue;
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      delete maps[source][id];
      if (Object.hasOwn(prior[source], id)) maps[source][id] = prior[source][id];
    }
  }
  return { ...next, ...maps };
}

/** Explicit scoped correction only. Original words survive before source precedence is applied; no final attestation. */
export function caProp64ClarificationPatch(input: {
  protectedVerification: ProtectedPacketVerificationRecord; answers: Record<string, AnswerValue>; verify?: boolean;
}): ReturnType<typeof packetInformationPatch> {
  if (input.verify) return null;
  const prior = input.protectedVerification;
  const model = caProp64ClarificationModelFor(prior);
  const base = protectedAuthoritySnapshotFor(prior);
  if (!model || !base) return null;
  const allowed = new Set(model.requiredInputIds);
  if (Object.keys(input.answers).some((id) => !allowed.has(id))) return null;
  if (Object.entries(input.answers).some(([id, value]) => questionAnswerState(model.questions.find((question) => question.id === id)!, value) === "invalid" && !canonicalEqual(value, model.initialAnswers[id]))) return null;
  const maps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const history = caProp64AnswerHistory(base, new Set(Object.keys(input.answers)));
  const answerDelta = Object.fromEntries(Object.entries(input.answers).filter(([id, value]) => !canonicalEqual(model.initialAnswers[id], value)
    && !sameKnownQuestionAnswer(model.questions.find((question) => question.id === id)!, model.initialAnswers[id], value)));
  // Preserve a current held draft on an unchanged save. An old permissively
  // evaluated snapshot must still be re-evaluated and invalidated below.
  if (Object.keys(answerDelta).length === 0 && protectedPacketInformationModelFor(prior)) {
    const packetInformation = { stage: "in_progress" as const, requiredInputIds: base.requiredInputIds,
      serverFacts: answerRecord(base.serverFacts), prefilledAnswers: answerRecord(base.prefilledAnswers), answers: answerRecord(base.packetAnswers),
      missingInputIds: model.missingInputIds, updatedAt: model.capturedAt, reviewedAt: null, reviewSafety: model.reviewSafety };
    return {
      patch: { commercialFlow: { packetInformation, verification: prior } },
      protectedTransition: { expectedPriorHash: prior.status === "verified" ? prior.hash ?? null : null, expectedPriorRevision: prior.revision,
        answerDelta, packetInformationMetadata: packetInformationMetadata(packetInformation), nextVerification: prior },
      missingInputIds: model.missingInputIds, readyToGenerate: false, reviewReason: "semantic_noop_preserved"
    };
  }
  maps.packetAnswers = { ...maps.packetAnswers, ...answerDelta };
  const changedIds = new Set(Object.keys(answerDelta));
  const candidate = preserveUnchangedProtectedFacts({ ...base, ...maps }, base, changedIds);
  const authoritative = evaluateProtectedPacketFacts(candidate);
  // Clarification never rewrites the saved pathway hint or selects a replacement route.
  if (!authoritative || authoritative.evaluation.pathwayId !== base.pathwayId) return null;
  const now = new Date().toISOString();
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, ...maps,
    dependencies: { ...base.dependencies, semanticAnswerHistory: history }, capturedAt: now });
  if (!seeded) return null;
  seeded.snapshot = preserveUnchangedProtectedFacts(seeded.snapshot, base, changedIds);
  seeded.hash = protectedPacketDraftHash(seeded.snapshot);
  const nextVerification: ProtectedPacketVerificationRecord = {
    status: "invalidated", reason: "ca_prop64_choice_clarified_pending_verification", invalidatedAt: now,
    draftHash: seeded.hash, draftSnapshot: seeded.snapshot, revision: prior.revision + 1
  };
  const normal = protectedPacketInformationModelFor(nextVerification);
  // A truthful clarification can expose a separate legal refusal. Persist that
  // answer and its held evaluation; it is not a reason to lose the owner's edit.
  const next = normal?.packetPlan ? normal : caProp64ClarificationModelFor(nextVerification) ?? normal;
  if (!next) return null;
  const packetInformation = { stage: !next.packetPlan ? "in_progress" as const : next.stage, requiredInputIds: seeded.snapshot.requiredInputIds,
    serverFacts: answerRecord(seeded.snapshot.serverFacts), prefilledAnswers: answerRecord(seeded.snapshot.prefilledAnswers), answers: answerRecord(seeded.snapshot.packetAnswers),
    missingInputIds: next.missingInputIds, updatedAt: now, reviewedAt: null, reviewSafety: { safe: false, reason: next.caProp64Clarification ? "ca_prop64_choice_clarification_required" : next.packetPlan ? "final_verification_required" : next.reviewSafety.reason } };
  return {
    patch: { commercialFlow: { packetInformation, verification: nextVerification } },
    protectedTransition: { expectedPriorHash: prior.status === "verified" ? prior.hash ?? null : null, expectedPriorRevision: prior.revision,
      answerDelta, packetInformationMetadata: packetInformationMetadata(packetInformation), nextVerification },
    missingInputIds: next.missingInputIds, readyToGenerate: false, reviewReason: packetInformation.reviewSafety.reason
  };
}

/** A held result may require new factual details; this never grants readiness. */
export function ny16059HeldDetailSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  return snapshot.jurisdiction === "NY" && snapshot.pathwayId === NY_16059_ROUTE
    && snapshot.resultCode === "needs_review" && evaluation.resultCode === "needs_more_info"
    && !snapshot.paymentAllowed && !evaluation.paymentAllowed && !snapshot.packetPlan && !evaluation.packetPlan
    && ["16058_components_missing", "grouping_facts_missing"].includes(ny16059History(toScreeningAnswers(answerRecord({ ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers }))).code ?? "");
}

/** Recover a prior permissive financial-shape result without granting authority. */
export function financialAnswerHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  if (!["packet_ready", "packet_ready_with_caution"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || !evaluation.reasons.some(entry => entry.code.endsWith(".court_requirements_unknown"))
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)) return false;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  if (!legacy.inspection.effectiveInvalidIds.includes("financial_obligations")) return false;
  // Require the exact former interpretation too; unrelated result/authority
  // mismatches are not a financial-answer successor.
  const previous = evaluateProtectedPacketFacts({ ...snapshot, ...legacy.maps });
  return previous !== null && protectedRouteAuthorityMatches(snapshot, previous);
}

/** A source-matched former OR draft may tighten to the new both-events hold.
 * The hypothetical date reproduces the former result only; it is never stored
 * or treated as an answer to the successor question. Verified authority stays stale. */
export function msMipBothEventsHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const profile = getProfileByJurisdiction("MS"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "MS" || snapshot.pathwayId !== MS_MIP_ROUTE
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "459d9c5d3774787130ceb3ab2a5b980f71fe18e6ee214a7066288dadd6ccd991"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "96fa0eb82cc3bad379e0d3aa4c06de50d05bd4c0d7f35b042a89b684126e3b6a"
    || profileAuthorityFingerprint(profile, MS_MIP_ROUTE) !== snapshot.profileAuthorityFingerprint
    || !["packet_ready", "packet_ready_with_caution", "not_yet"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "ms.waiting_anchor_missing"
    || !canonicalEqual(evaluation.missingQuestionIds, [MS_MIP_BOTH_DATE_ID])
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MS", MS_MIP_ROUTE))) return false;
  const plan = packetPlanForPathway(profile, MS_MIP_ROUTE);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, MS_MIP_BOTH_DATE_ID))) return false;
  const answers = protectedPacketScreeningAnswers(snapshot), raw = answers?.[MS_MIP_LEGACY_DATE_ID];
  if (!answers || typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const former = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(former.getTime())) return false;
  const hypothetical = { ...snapshot, packetAnswers: { ...snapshot.packetAnswers, [MS_MIP_BOTH_DATE_ID]: former.toISOString().slice(0, 10) } };
  const previous = compareAtProtectedSnapshotTime(snapshot.capturedAt, () => evaluateProtectedPacketFacts(hypothetical));
  return previous !== null && protectedRouteAuthorityMatches(snapshot, previous);
}

/** Prove the former calendar-rollover interpretation before tightening a saved
 * MS result into a nonpayable hold. This hypothetical comparison never rewrites the owner's date. */
export function msTimingAnswerHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const evaluation = authoritative.evaluation;
  if (snapshot.jurisdiction !== "MS" || !["needs_review", "not_yet", "packet_ready", "packet_ready_with_caution"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || !evaluation.reasons.some(reason => reason.code === "ms.waiting_anchor_missing")
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)) return false;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const plan = snapshot.pathwayId && profile ? packetPlanForPathway(profile, snapshot.pathwayId) : null;
  if (!profile || !plan || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))) return false;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return false;
  const normalized: Record<string, AnswerValue> = {};
  for (const id of msExactTimingQuestionIds("MS", snapshot.pathwayId, answers)) {
    const raw = answers[id];
    if (id === "ms_mip_fine_imposed" || msExactCalendarDate(raw) || typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
    const former = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isFinite(former.getTime())) normalized[id] = former.toISOString().slice(0, 10);
  }
  if (!Object.keys(normalized).length || !evaluation.missingQuestionIds.length
    || evaluation.missingQuestionIds.some(id => !Object.hasOwn(normalized, id))) return false;
  const normalizedSnapshot = { ...snapshot, packetAnswers: { ...snapshot.packetAnswers, ...normalized } };
  const previous = evaluateProtectedPacketFacts(normalizedSnapshot);
  if (previous !== null && protectedRouteAuthorityMatches(snapshot, previous)) return true;
  // A previously unelapsed wait may have expired since capture. Reproduce the
  // exact former tuple at its trusted saved time; current authority stays held.
  const capturedAt = "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt;
  const atCapture = compareAtProtectedSnapshotTime(capturedAt, () => evaluateProtectedPacketFacts(normalizedSnapshot));
  return atCapture !== null && protectedRouteAuthorityMatches(snapshot, atCapture);
}

/** An absent original origin answer is not an Arkansas answer. Prove the
 * exact previous held tuple with the former unqualified interpretation only
 * for comparison; never persist that hypothetical answer or grant readiness. */
export function arkansasRecordOriginHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const evaluation = authoritative.evaluation;
  const maps = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  if (!snapshot.pathwayId || !arkansasRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId)
    || Object.hasOwn(maps, AR_RECORD_ORIGIN_ID) || snapshot.paymentAllowed
    || !["not_covered_yet", "guidance_only", "needs_review"].includes(snapshot.resultCode ?? "")
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "ar.record_origin_unknown"
    || !canonicalEqual(evaluation.missingQuestionIds, [AR_RECORD_ORIGIN_ID])
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false,
      packetType: authoritative.packetType ?? null }, authoritative)) return null;
  const previous = evaluateProtectedPacketFacts({ ...snapshot, packetAnswers: { ...snapshot.packetAnswers, [AR_RECORD_ORIGIN_ID]: "arkansas" } });
  if (previous === null || !protectedRouteAuthorityMatches(snapshot, previous)) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** A missing origin tightens only an unverified source-bound predecessor. The
 * hypothetical Virginia answer reproduces its old tuple; it is never saved. */
export function virginiaRecordOriginHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>,
  status: ProtectedPacketVerificationRecord["status"]): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("VA"), evaluation = authoritative.evaluation;
  const maps = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  if (!["unverified", "invalidated"].includes(status) || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || !snapshot.pathwayId || !virginiaRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId)
    || Object.hasOwn(maps, VA_RECORD_ORIGIN_ID) || !profile
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("VA", snapshot.pathwayId))
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] })
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || !evaluation.reasons.some(reason => reason.code === "va.record_origin_unknown" && reason.sourceRef === VA_RECORD_ORIGIN_SOURCE)
    || !evaluation.missingQuestionIds.includes(VA_RECORD_ORIGIN_ID)
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)) return null;
  const previous = evaluateProtectedPacketFacts({ ...snapshot, packetAnswers: { ...snapshot.packetAnswers, [VA_RECORD_ORIGIN_ID]: "virginia" } });
  if (!previous || !protectedRouteAuthorityMatches(snapshot, previous)) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : (snapshot as { verifiedAt: string }).verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Source-reproduced unverified predecessor; withdrawing readiness never rewrites its raw answers. */
export function wyoming1502HeldDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>, status: string): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("WY"), evaluation = authoritative.evaluation;
  if (status !== "unverified" || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || !((snapshot.resultCode === "packet_ready_with_caution" && snapshot.paymentAllowed === true)
      || (snapshot.resultCode === "needs_review" && snapshot.paymentAllowed === false))
    || snapshot.packetType !== "custom_pleading" || snapshot.selectedTrackId !== null
    || snapshot.jurisdiction !== "WY" || !wy1502CategoryIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`WY:${snapshot.pathwayId}`))
    || snapshot.profileVersion !== profile?.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== "7e725ca292d4e7d9b8d076a740abfe5462a4d678ba0b8cb849f45d7faf69dc0e"
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || evaluation.jurisdiction !== "WY" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== snapshot.pathwayId || evaluation.resultCode !== "needs_review" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId !== snapshot.selectedTrackId
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => WY_1502_FACT_IDS.some(id => Object.hasOwn(map, id)))
    || evaluation.reasons.length !== 1 || !["wy.felony1502_missing", "wy.felony1502_disposition", "wy.felony1502_trafficking"].includes(evaluation.reasons[0].code)) return null;
  const plan = packetPlanForPathway(profile, snapshot.pathwayId!);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("WY", snapshot.pathwayId))) return null;
  const seed = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers),
    dependencies: snapshot.dependencies, capturedAt: (snapshot as ProtectedPacketDraftSnapshot).capturedAt });
  return seed ? preserveUnchangedProtectedFacts(seed.snapshot, snapshot, new Set()) : null;
}

/** Source-reproduced unverified predecessor; withdrawing readiness never rewrites its raw answers. */
export function illinoisProstitutionHeldDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>, status: string): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("IL"), evaluation = authoritative.evaluation;
  if (status !== "unverified" || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.resultCode !== "packet_ready_with_caution" || snapshot.paymentAllowed !== true
    || snapshot.packetType !== "official_pdf_overlay" || snapshot.selectedTrackId !== "il-prostitution-j-vacate"
    || snapshot.jurisdiction !== "IL" || !ilProstitutionCategoryIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`IL:${snapshot.pathwayId}`))
    || snapshot.profileVersion !== profile?.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== "92d1161fb1d9c6234123ea4c222494855e3bd0cb7000c8b4ff76fcf7ee65793e"
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || evaluation.jurisdiction !== "IL" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== snapshot.pathwayId || evaluation.resultCode !== "needs_review" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId !== snapshot.selectedTrackId
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, IL_PROSTITUTION_FACT_ID))
    || evaluation.reasons.length !== 1 || !["il.prostitution_missing", "il.prostitution_trafficking"].includes(evaluation.reasons[0].code)) return null;
  const plan = packetPlanForPathway(profile, snapshot.pathwayId!);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("IL", snapshot.pathwayId))) return null;
  const seed = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers),
    dependencies: snapshot.dependencies, capturedAt: (snapshot as ProtectedPacketDraftSnapshot).capturedAt });
  return seed ? preserveUnchangedProtectedFacts(seed.snapshot, snapshot, new Set()) : null;
}

/** Exact pre-correction contracts at bd4f9715b. This proves historical held
 * ownership only; the contradicted plan is never carried into current authority. */
export function factualPathwayHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const historical = snapshot.jurisdiction === "IL" ? {
    route: "cannabis-specific-automatic-or-petition-expungement", type: "official_pdf_overlay",
    source: "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630",
    authority: "fd2f928d24a4d0d56fd8ff5abda2e8a865d1c164a43d448cbf32fd7225af52d0"
  } : snapshot.jurisdiction === "GA" ? {
    route: "youthful-first-offender-restriction-route", type: "custom_pleading",
    source: "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812",
    authority: "203fdfa7f45347041d9aba3acacddd8e0ae02c7349256c1c3ba6c2bdb3a191ef"
  } : null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const evaluation = authoritative.evaluation;
  if (!historical || !profile || snapshot.pathwayId !== historical.route
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== historical.source || profile.source?.sourceCorpusSha256 !== historical.source
    || snapshot.profileAuthorityFingerprint !== historical.authority || profileAuthorityFingerprint(profile, historical.route) !== historical.authority
    || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed || snapshot.packetType !== historical.type
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !pathwayExcludedByKnownFacts(snapshot.jurisdiction, protectedPacketScreeningAnswers(snapshot) ?? {}, historical.route)
    || evaluation.jurisdiction !== snapshot.jurisdiction || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.resultCode !== "needs_review" || evaluation.pathwayId || evaluation.packetPlan || evaluation.paymentAllowed
    || authoritative.packetType || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== `${snapshot.jurisdiction.toLowerCase()}.pathway_conflicts_with_saved_fact`) return null;
  const plan = packetPlanForPathway(profile, historical.route);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, historical.route))) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

// GA14 M01059: exact 4a390f301 juvenile and no-route held drafts; preserve history without restoring a plan.
export function ohioDiversionDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const held = snapshot.pathwayId === null, route = held ? null : OH_JUVENILE_ROUTE;
  if (snapshot.jurisdiction !== "OH" || !held && snapshot.pathwayId !== OH_JUVENILE_ROUTE) return null;
  const profile = getProfileByJurisdiction("OH"), evaluation = authoritative.evaluation;
  const plan = profile && !held ? packetPlanForPathway(profile, OH_JUVENILE_ROUTE) : null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!profile || !held && !plan || !answers || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== "0109b1358bbee282e159113ced5f86734a6c0cf281c51aca4c3703dedb4552e7"
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || !held && snapshot.profileAuthorityFingerprint !== "ac5c89aed9ec935710e83d43c1e2896cd2b7bda498a1752e8f92a4c40952f97a"
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, route)
    || snapshot.resultCode !== (held ? "needs_review" : "guidance_only") || snapshot.paymentAllowed || snapshot.packetType !== (held ? null : "guidance_packet")
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan?.requiredInputIds ?? [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan?.mode ?? null, sourceFormIds: plan?.sourceFormIds ?? [] })
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("OH", route))
    || normalizeCaseOutcome(answers.case_outcome) !== "diversion_or_deferred"
    || answers.possible_pathway_context && !(held && answers.possible_pathway_context === "None of these / I am not sure")
    || evaluation.jurisdiction !== "OH" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId || evaluation.packetPlan || evaluation.paymentAllowed || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length || evaluation.reasons.length !== 1
    || !(evaluation.resultCode === "guidance_only" && evaluation.reasons[0].code === "oh.diversion_guidance"
      && authoritative.packetType === "guidance_packet" && evaluation.missingQuestionIds.length === 0
      || evaluation.resultCode === "needs_more_info" && evaluation.reasons[0].code === "oh.missing_required_facts"
      && !authoritative.packetType && canonicalEqual(evaluation.missingQuestionIds, ["age_at_offense"]))) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

function ohioDiversionCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): string[] {
  return snapshot.jurisdiction === "OH" && snapshot.pathwayId === null && !snapshot.paymentAllowed
    && normalizeCaseOutcome(protectedPacketScreeningAnswers(snapshot)?.case_outcome) === "diversion_or_deferred"
    && authoritative.evaluation.reasons.some(reason => ["oh.diversion_guidance", "oh.missing_required_facts"].includes(reason.code))
    ? ["age_at_offense"] : [];
}

/** Exact pre-correction nonconviction tuples at706dfe818. Reading a saved
 * matter preserves its raw history and grants no current packet authority. */
export function convictionFallbackHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const answers = protectedPacketScreeningAnswers(snapshot);
  const evaluation = authoritative.evaluation;
  if (!profile || !answers || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || convictionReliefRequest(profile, answers).status !== "clarification"
    || evaluation.resultCode !== "needs_more_info" || evaluation.pathwayId || evaluation.packetPlan || evaluation.paymentAllowed
    || authoritative.packetType || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== `${snapshot.jurisdiction.toLowerCase()}.conviction_relief_missing`) return null;
  // Independently reproduced for all four adult-conviction wires in each
  // exact state route, with/without previous program/cannabis answers. New
  // discriminators did not exist in the predecessor contract.
  if (!isAdultConvictionAnswer(answers.case_outcome)
    || convictionReliefQuestions(snapshot.jurisdiction).some(q => Object.hasOwn(answers, q.id))) return null;
  if (!convictionFallbackPrior.contracts.some(contract => Object.entries(contract).every(([key, value]) =>
    canonicalEqual(snapshot[key as keyof ProtectedPacketAuthoritySnapshot] ?? null, value)))) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact source-valid held KS tuples captured at 5b233b03. The adopted petition
 * correction withdraws the old automatic plan, never the participant's answers.
 * Only a draft successor is produced; historical verified authority is refused. */
export function kansasRegistrationHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("KS"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "KS" || snapshot.pathwayId !== KS_REGISTRATION_ROUTE
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "c0bbc9c540a680f360113b8aee2ee5ac0f19ffda4958c8f3974366f68c150362"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "94be04b0a5c3a7649364e162c8186c460604e3f4a2787aa15c5519d712a8c89b"
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("KS", KS_REGISTRATION_ROUTE))
    || evaluation.jurisdiction !== "KS" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== KS_REGISTRATION_ROUTE || evaluation.resultCode !== "needs_review" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1
    || !["ks.registration_statutory_facts_review", "ks.source_fact_unknown"].includes(evaluation.reasons[0].code)) return null;
  const financialUnknown = evaluation.reasons[0].code === "ks.source_fact_unknown";
  if (financialUnknown && !canonicalEqual(evaluation.missingQuestionIds, ["financial_obligations"])) return null;
  if (snapshot.resultCode === "guidance_only") {
    if (financialUnknown || snapshot.packetType !== "guidance_packet" || !snapshot.packetPlan
      || createHash("sha256").update(JSON.stringify(canonicalize(snapshot.packetPlan))).digest("hex") !== "178b92b19f90dd10f9a5421df83fba006e4da8ee0b9382e94252d2d92b3bac95"
      || !canonicalEqual(snapshot.requiredInputIds, snapshot.packetPlan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: "automatic_relief_verification_and_guidance", sourceFormIds: [] })) return null;
  } else if (snapshot.resultCode !== "needs_review" || !financialUnknown || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies,
    capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Only an elapsed, previously proven OR sixty-day hold may refresh its result.
 * The authoritative saved-time comparison proves the former tuple; the current
 * result still has no packet, payment, verification or fulfillment authority. */
export function oregonDispositionTimingHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const profile = getProfileByJurisdiction("OR"), evaluation = authoritative.evaluation;
  if (!profile || !oregonDispositionConfigurationSourceMatches(profile.profileVersion, profile.source?.sourceCorpusSha256)
    || snapshot.jurisdiction !== "OR" || snapshot.pathwayId !== OR_DISPOSITION_CONFIGURATIONS.never_charged.pathwayId
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || snapshot.resultCode !== "not_yet" || snapshot.paymentAllowed || snapshot.packetPlan !== null
    || snapshot.packetType !== null || snapshot.requiredInputIds.length !== 0
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("OR", snapshot.pathwayId))
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.resultCode !== "needs_review" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "or.disposition_disposition_facts_supported"
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode }, authoritative)) return false;
  const capturedAt = "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt;
  const prior = compareAtProtectedSnapshotTime(capturedAt, () => evaluateProtectedPacketFacts(snapshot));
  return prior !== null && prior.evaluation.reasons.length === 1
    && prior.evaluation.reasons[0].code === "or.disposition_sixty_days"
    && protectedRouteAuthorityMatches(snapshot, prior);
}

/** Exact published098 predecessor reproduction: the public OR profile omitted
 * its required exclusion descriptor, leaving these nonconviction records at a
 * null route. This projects only that nonpayable, no-plan source shape. It is
 * not authority for an arbitrary retired-route plan or a captured owner record.
 * Reads/no-ops retain original bytes; an explicit correction uses normal history.
 */
export function oregonDispositionDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("OR"), evaluation = authoritative.evaluation;
  if (!profile || !oregonDispositionConfigurationSourceMatches(profile.profileVersion, profile.source?.sourceCorpusSha256)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "OR" || snapshot.pathwayId !== null
    || snapshot.profileVersion !== OR_DISPOSITION_SOURCE.profileVersion || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== OR_DISPOSITION_SOURCE.sourceFingerprint
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "d5ec711228fb53641c040ea7cea781cb9230f555645027c1ad23b97c7b286308"
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)
    || snapshot.resultCode !== "needs_more_info" || snapshot.paymentAllowed || snapshot.selectedTrackId !== null
    || snapshot.packetPlan !== null || snapshot.packetType !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.requiredInputIds, []) || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("OR", null))
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "OR" || evaluation.profileVersion !== snapshot.profileVersion
    || !["needs_more_info", "needs_review"].includes(evaluation.resultCode)
    || evaluation.paymentAllowed || evaluation.packetPlan || authoritative.packetType
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  if (maps.some(map => [...OR_DISPOSITION_FACT_IDS, "state_exclusion_categories"].some(id => Object.hasOwn(map, id)))) return null;
  const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  if (!["Yes", "I am helping someone complete their own check"].includes(String(raw.ownership_scope))
    || raw.jurisdiction_scope !== "State or local"
    || !["Arrest or citation with no charge filed", "Acquitted or found not guilty", "Dismissed, no-billed, nolle prosequi, or not prosecuted"].includes(String(raw.case_outcome))) return null;
  // No precedence choice can establish a route from conflicting protected copies.
  for (const id of ["ownership_scope", "jurisdiction_scope", "case_outcome"]) {
    const values = maps.filter(map => Object.hasOwn(map, id)).map(map => map[id]);
    if (values.some(value => typeof value !== "string" || !canonicalEqual(value, values[0]))) return null;
  }
  const identity = oregonDispositionIdentity(raw);
  if (identity.status === "identified") {
    if (evaluation.pathwayId !== identity.configuration.pathwayId || authoritative.selectedTrackId !== identity.configuration.trackId) return null;
  } else if (identity.status !== "clarification" || evaluation.pathwayId || authoritative.selectedTrackId) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Fresh exact717 reproduction: recover only the old Montana deferred guidance or
 * financial hold into a actual deferred-order clarification. No old map is rewritten and no
 * eligibility, form, payment or verification authority is added. */
export function montanaDeferredDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("MT"), route = MT_DEFERRED_ROUTE, evaluation = authoritative.evaluation;
  if (!profile || !isMontanaDeferredContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1" || snapshot.jurisdiction !== "MT"
    || ![route, null].includes(snapshot.pathwayId) || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === route
      ? "d6ea2cb9d87223ce1da5999f41e54b0e655d519606230b1af5fcd2ce8817c75c"
      : "fa71f837ff7586bd3096aa9e9f818411ab2aad7be651e228b818a5b436654a4c")
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MT", snapshot.pathwayId))
    || evaluation.jurisdiction !== "MT" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || !canonicalEqual(evaluation.missingQuestionIds, ["mt_deferred_order_type"])
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "mt.deferred_facts_unresolved") return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || MT_DEFERRED_FACT_IDS.some(id => Object.hasOwn(answers, id))) return null;
  if (snapshot.resultCode === "guidance_only") {
    const currentPlan = packetPlanForPathway(profile, route);
    const compiledPlan = profile.packetGenerator.pathways.find(path => path.pathwayId === route);
    const plan = currentPlan && compiledPlan ? { ...currentPlan, formMappingStatus: compiledPlan.formMappingStatus,
      sourceFormIds: (compiledPlan.formCandidates ?? []).map(form => `MT:${form.relativePath}:${form.sha256}`) } : undefined;
    if (snapshot.pathwayId !== route || snapshot.packetType !== "guidance_packet" || !plan
      || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })) return null;
  } else {
    const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review" && isExplicitUnknownAnswer(answers.financial_obligations);
    const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info" && !Object.hasOwn(answers, "financial_obligations");
    if ((!unknown && !missing) || snapshot.packetPlan !== null || snapshot.packetType !== null
      || !canonicalEqual(snapshot.requiredInputIds, [])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })) return null;
  }
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Fresh exact bfc reproduction: recover only the old Article XIV guidance or
 * financial hold into a custody clarification. No old map is rewritten and no
 * eligibility, form, payment or verification authority is added. */
export function missouriMarijuanaDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("MO"), route = MO_MARIJUANA_STATUS_ROUTE, evaluation = authoritative.evaluation;
  if (!profile || !isMissouriMarijuanaStatusContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1" || snapshot.jurisdiction !== "MO"
    || ![route, null].includes(snapshot.pathwayId) || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === route
      ? "3172d53e1953eb6fa5f2bd2a09f1e18df8b1a92aa77753748d02cbc2914bde76"
      : "548cc539e137295ac70787377765a3aa271eefc6b3fce30a9f78df2c01eb0ba4")
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MO", snapshot.pathwayId))
    || evaluation.jurisdiction !== "MO" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || !canonicalEqual(evaluation.missingQuestionIds, [MO_MARIJUANA_CUSTODY_FACT])
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "mo.marijuana_custody_missing") return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || MO_MARIJUANA_FACT_IDS.some(id => Object.hasOwn(answers, id))) return null;
  if (snapshot.resultCode === "guidance_only") {
    const plan = packetPlanForPathway(profile, route);
    if (snapshot.pathwayId !== route || snapshot.packetType !== "guidance_packet" || !plan
      || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })) return null;
  } else {
    const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review" && isExplicitUnknownAnswer(answers.financial_obligations);
    const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info" && !Object.hasOwn(answers, "financial_obligations");
    if ((!unknown && !missing) || snapshot.packetPlan !== null || snapshot.packetType !== null
      || !canonicalEqual(snapshot.requiredInputIds, [])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })) return null;
  }
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Fresh exact-575237025 reproduction, not a captured prior production record. Only
 * the exact nonpayable mistaken-identity plan or status-only financial hold may project current guidance.
 * Reads and semantic no-ops leave the original protected record untouched. */
export function missouriClosureDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const route = MO_CLOSED_RECORD_ROUTE;
  const profile = getProfileByJurisdiction("MO"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "MO" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "ddb1a8ea6c0d878f5a81d59e2a7e32cd7927436e9fb6fee8e8e8629ba7c62304"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === route
      ? "028ee32dc68172d23dcd0a871354a6c8175ac3ca38cc58a01179ec7cdb5f7252"
      : "548cc539e137295ac70787377765a3aa271eefc6b3fce30a9f78df2c01eb0ba4")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MO", snapshot.pathwayId))
    || !isMissouriClosureGuidanceWithoutIdentityForm(profile, route)
    || evaluation.jurisdiction !== "MO" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "guidance_only" || evaluation.paymentAllowed
    || authoritative.packetType !== "guidance_packet" || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "mo.lawrence_hold_guidance_only"
    || !canonicalEqual(evaluation.missingQuestionIds, [])
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return null;
  if (snapshot.resultCode === "guidance_only") {
    const priorPlan = { ...evaluation.packetPlan!, formMappingStatus: "source_candidate_identified",
      sourceFormIds: ["MO:LegalEase Missouri/petition-for-expungement-mistaken-identity.pdf:5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8"] };
    if (snapshot.pathwayId !== route || snapshot.packetType !== "guidance_packet"
      || !canonicalEqual(snapshot.packetPlan, priorPlan) || !canonicalEqual(snapshot.requiredInputIds, priorPlan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: priorPlan.mode, sourceFormIds: priorPlan.sourceFormIds })) return null;
  } else {
    if (missouriClosedRecordQuestionApplies("MO", route, answers, "financial_obligations", profile)) return null;
    const exactUnknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
      && isExplicitUnknownAnswer(answers.financial_obligations);
    const exactMissing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
      && !Object.hasOwn(answers, "financial_obligations");
    if ((!exactUnknown && !exactMissing) || snapshot.packetType !== null || snapshot.packetPlan !== null
      || !canonicalEqual(snapshot.requiredInputIds, [])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })) return null;
  }
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact f2a source-reproduced financial-only draft holds. This changes the
 * current correction view, never the stored record on read/no-op or verified authority. */
export function montanaRecordFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("MT"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !montanaRecordFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "MT" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "fa71f837ff7586bd3096aa9e9f818411ab2aad7be651e228b818a5b436654a4c"
      : route === MT_RECORD_FINANCIAL_ROUTES[0]
        ? "852ad67fae4987a5ff7820cd313fdd6b662dded3a326ae61606f7dde6bfe9a98"
        : "370d5f8c614749314e556c10d5ac5cd29c554b2dfe665177a4814edae48a5744")
    || !matchesDeclaredMetadataPredecessor(profile, snapshot.pathwayId, snapshot.profileAuthorityFingerprint)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MT", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "MT" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || montanaRecordFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only the same held administrative view or existing noncommercial guidance;
  // neither this compatibility path nor a paid answer can authorize a packet.
  if (route === MT_RECORD_FINANCIAL_ROUTES[0]
    ? evaluation.resultCode !== "needs_review" || authoritative.packetType !== "official_pdf_overlay"
      || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "mt.waiting_rule_not_executed"
    : evaluation.resultCode !== "guidance_only" || authoritative.packetType !== "guidance_packet"
      || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "mt.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

// Owner Item 11: exact metadata-only predecessor pairs; no future profile change is covered.
const LEGAL_AUTHORITY_METADATA_SUCCESSORS = [
  {
    "jurisdiction": "GA",
    "pathwayId": "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions",
    "priorSha256": "3fc05cf0288443f5da21a2040f27b2ce9af949b48e94c00f93b1420b974bb6b5",
    "newSha256": "91e04b6f576b0455b0a8f21f6ab6f7c1b6a0b7f72ebb3bc75316da20f68f9e3d"
  },
  {
    "jurisdiction": "MD",
    "pathwayId": "police-record-expungement-when-no-charge-was-filed-under-10-103",
    "priorSha256": "439ccffe2dbfe611cc84b1f87273fc49ddf8d245caef0dcd0ff5dad21a437747",
    "newSha256": "7a3f882d2b04e3dc94e7bd642c795d77e21d04f271cd30997375dc4f12cd1530"
  },
  {
    "jurisdiction": "MT",
    "pathwayId": "non-conviction-criminal-history-removal-through-criss",
    "priorSha256": "370d5f8c614749314e556c10d5ac5cd29c554b2dfe665177a4814edae48a5744",
    "newSha256": "e79f11747aa54073db122c87328332a16d8342b8206a6ee320d72b9816cf756f"
  },
  {
    "jurisdiction": "ND",
    "pathwayId": "non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
    "priorSha256": "d3334073152e346d17a6bb09ca90abac924b499d57ee4190ecec746528ae7143",
    "newSha256": "c43b1f34f41c932ec2cc83102f79b4cbb127fb9cf5a39bb5a975e7aae2d7f8fc"
  },
  {
    "jurisdiction": "OK",
    "pathwayId": "clean-slate-automatic-expungement",
    "priorSha256": "a9afc32a44fa6be09b395340ec6f73e967e1e557db67580fae4b56a0a33eaa01",
    "newSha256": "3811fdef961bf59176a8c1847bd25c45d77025c89bd4f38cfd76a9ad6b3f0a97"
  },
  {
    "jurisdiction": "SC",
    "pathwayId": "diversion-or-program-completion-expungement",
    "priorSha256": "0f3be57f27ddba121b5d9998e924079e5dbd99acad5d2cb79a3aa9d7ff3a588f",
    "newSha256": "ff5acc6ef34950c0ae0ce5205af29cedb51cc025cb9dde6b02b654b8cb13f0c6"
  }
] as const;

function matchesDeclaredMetadataPredecessor(profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>, pathwayId: string | null, fingerprint: string | null) {
  const current = profileAuthorityFingerprint(profile, pathwayId);
  return current === fingerprint || LEGAL_AUTHORITY_METADATA_SUCCESSORS.some(row => row.jurisdiction === profile.jurisdiction.code
    && row.pathwayId === pathwayId && row.priorSha256 === fingerprint && row.newSha256 === current);
}

/** Only a draft's declared metadata fingerprint moves. Raw maps/history and all
 * downstream route checks remain intact; final verification cannot carry over. */
export function legalAuthorityMetadataDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>,
  status: ProtectedPacketVerificationRecord["status"]): ProtectedPacketDraftSnapshot | null {
  const profile = authoritative.profile, evaluation = authoritative.evaluation;
  if (!["unverified", "invalidated"].includes(status)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== profile.jurisdiction.code || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.pathwayId !== evaluation.pathwayId || snapshot.paymentAllowed || evaluation.paymentAllowed) return null;
  const pair = LEGAL_AUTHORITY_METADATA_SUCCESSORS.find(row => row.jurisdiction === snapshot.jurisdiction
    && row.pathwayId === snapshot.pathwayId && row.priorSha256 === snapshot.profileAuthorityFingerprint);
  if (!pair || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== pair.newSha256) return null;
  return { ...snapshot, profileAuthorityFingerprint: pair.newSha256 } as ProtectedPacketDraftSnapshot;
}

/** Exact source-reproduced absent-payment draft. Projects only the already
 * approved noncommercial guidance; reads/no-ops retain the original record. */
export function oklahomaCleanSlateFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("OK"), evaluation = authoritative.evaluation;
  if (!profile || !oklahomaCleanSlateFinancialContract(profile, evaluation.pathwayId)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "OK" || snapshot.pathwayId !== null || snapshot.resultCode !== "needs_more_info"
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== "08444132fa9ff9ac99279856ab17010c0d56008c9d704b6aa1cef3b6f5a7ff18"
    || !matchesDeclaredMetadataPredecessor(profile, null, snapshot.profileAuthorityFingerprint)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("OK", null))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "OK" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== OK_CLEAN_SLATE_ROUTE || evaluation.resultCode !== "guidance_only"
    || evaluation.paymentAllowed || authoritative.selectedTrackId !== null
    || authoritative.packetType !== "guidance_packet" || evaluation.treatmentClassification !== "exact_supported_deferral"
    || evaluation.selectedTrackId !== "ok_clean_slate" || evaluation.deferralComponentIds?.length
    || evaluation.missingQuestionIds.length || evaluation.packetPlan != null
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "ok.guidance_only_no_user_filed_court_petition") return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || Object.hasOwn(answers, "financial_obligations")) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact pre-clock unverified TX tuples, with no newly collected event facts.
 * Read-time projection never persists or upgrades their original authority. */
export function texasNondisclosureClockDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile=getProfileByJurisdiction("TX"), route=snapshot.pathwayId, e=authoritative.evaluation;
  if (!profile || !route || route === TX_ND_ROUTES[0] || !texasNondisclosureTimingContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1" || snapshot.jurisdiction !== "TX"
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile,route)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds,[]) || !canonicalEqual(snapshot.serverFacts,canonicalServerFacts("TX",route))
    || e.pathwayId !== route || e.paymentAllowed || authoritative.selectedTrackId || e.treatmentClassification || e.deferralComponentIds?.length
    || e.resultCode !== "needs_more_info" || e.reasons.length !== 1 || e.reasons[0].code !== "tx.nondisclosure_exact_facts_missing"
    || !canonicalEqual(e.missingQuestionIds,["tx_nd_supervision_type"])) return null;
  const plan=packetPlanForPathway(profile,route), facts={...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers};
  if (!plan || !canonicalEqual(snapshot.packetPlan,plan) || !canonicalEqual(snapshot.requiredInputIds,plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:plan.mode,sourceFormIds:plan.sourceFormIds})
    || TX_ND_FACT_IDS.some(id=>Object.hasOwn(facts,id))
    || snapshot.resultCode !== (route === TX_ND_ROUTES[1] ? "guidance_only" : "needs_review")
    || snapshot.packetType !== (route === TX_ND_ROUTES[1] ? "guidance_packet" : "official_pdf_overlay")) return null;
  const seeded=protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answerRecord(snapshot.screeningAnswers),
    prefilledAnswers:answerRecord(snapshot.prefilledAnswers),packetAnswers:answerRecord(snapshot.packetAnswers),dependencies:snapshot.dependencies,capturedAt:snapshot.capturedAt});
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot,snapshot,new Set()) : null;
}

/** Exact 69ee577dc source-reproduced payment-only status-guidance draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function texasGuidanceFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("TX"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !texasGuidanceFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "TX" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "937b2ace4b0728c766cc7b5e73f270f1052777cc3f6c4342deabf47f002a3f93"
      : "e5ed9c15b2400ef18e653289fd5966c683b8117a64a6ebaa7a0d0cab76a716c5")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("TX", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "TX" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || texasGuidanceFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (!TX_GUIDANCE_FINANCIAL_ROUTES.some(id => id === route) || evaluation.resultCode !== "guidance_only"
    || authoritative.packetType !== "guidance_packet" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "tx.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact b3ae11fbb source-reproduced payment-only status-guidance draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function westVirginiaGuidanceFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("WV"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !westVirginiaGuidanceFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "WV" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "bee818c8965da796a3fbb0f93cfdeb9143e540c41f7dfea30440858b80bc33e9"
      : "df5720db0b70edaccb3c6f0255fb4393147974a7e5290542c14122bcc0575866")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("WV", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "WV" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || westVirginiaGuidanceFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (!WV_GUIDANCE_FINANCIAL_ROUTES.some(id => id === route) || evaluation.resultCode !== "guidance_only"
    || authoritative.packetType !== "guidance_packet" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "wv.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact 4f158a0cc source-reproduced payment-only status-guidance draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function southDakotaGuidanceFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("SD"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !southDakotaGuidanceFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "SD" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "52a49254e8d4861564136dfc77895928937bb5a70fce1f75968d56fda32eb21d"
      : (snapshot.pathwayId === SD_GUIDANCE_FINANCIAL_ROUTES[0] ? "31c75b3b6795390ac9ecf8758c7c2bcee04ee9a8185d893c2299fc9fbb9e52d0" : "30da11a3845e9d13fd8a405599899c53d5bc20aefbce8a75adbfe9ffe6467cee"))
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("SD", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "SD" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || southDakotaGuidanceFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (!SD_GUIDANCE_FINANCIAL_ROUTES.some(id => id === route) || evaluation.resultCode !== "guidance_only"
    || authoritative.packetType !== "guidance_packet" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "sd.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact 272d source-reproduced payment-only status-guidance draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function southCarolinaGuidanceFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("SC"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !southCarolinaGuidanceFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "SC" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "367d1f5a8799c844c95a51e6d46e32d66053c944e345a2fe8fe5f1a3ce1ca932"
      : (snapshot.pathwayId === SC_GUIDANCE_FINANCIAL_ROUTES[0] ? "0f3be57f27ddba121b5d9998e924079e5dbd99acad5d2cb79a3aa9d7ff3a588f" : "ae55614609867d71e9cfc67879d2b0d454fbc07cf5e6968a75b29553c506f2b2"))
    || !matchesDeclaredMetadataPredecessor(profile, snapshot.pathwayId, snapshot.profileAuthorityFingerprint)
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("SC", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "SC" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || southCarolinaGuidanceFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (!SC_GUIDANCE_FINANCIAL_ROUTES.some(id => id === route) || evaluation.resultCode !== "guidance_only"
    || authoritative.packetType !== "guidance_packet" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "sc.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact c09 source-reproduced payment-only status-guidance draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function newJerseyMarijuanaStatusFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("NJ"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !newJerseyMarijuanaStatusFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "NJ" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "d03982264bae0b4325b373019d36080a31c6d8926508d6c2f5767d9b490d812c"
      : "a16e1fe80806ecf87b83de3cde64b1831655e92d237993e0f98e56a7ab3114d2")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("NJ", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "NJ" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || newJerseyMarijuanaStatusFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (route !== NJ_MARIJUANA_STATUS_ROUTE || evaluation.resultCode !== "guidance_only"
    || authoritative.packetType !== "guidance_packet" || evaluation.reasons.length !== 1
    || evaluation.reasons[0].code !== "nj.guidance_only_no_user_filed_court_petition") return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact cb8 source-reproduced payment-only draft holds. Current view only;
 * stored read/no-op bytes and all verified-authority boundaries stay intact. */
export function newMexicoGuidanceFinancialDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("NM"), evaluation = authoritative.evaluation;
  const route = evaluation.pathwayId;
  if (!profile || !route || !newMexicoGuidanceFinancialContract(profile, route)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "NM" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === null
      ? "a38e12b14a3da3527b7058883a6157c3fc4df2b0739e22d63ac28d5a511ec69e"
      : route === NM_GUIDANCE_FINANCIAL_ROUTES[0]
        ? "cee709a91bac2fb36891a7753eb0f80aabb5499a9d93021a8e70f95ab122069b"
        : "5de76ae5c8c5f3c3de1e81f8f5673ec51239101f52a02aeb9bf604da1dfaa99a")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("NM", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null
    || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "NM" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification
    || evaluation.deferralComponentIds?.length || evaluation.missingQuestionIds.length
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || newMexicoGuidanceFinancialApplies(profile, route, answers, "financial_obligations")) return null;
  const unknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && isExplicitUnknownAnswer(answers.financial_obligations);
  const missing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
    && !Object.hasOwn(answers, "financial_obligations");
  if (!unknown && !missing) return null;
  // Only noncommercial guidance; the old payment hold grants no authority.
  if (evaluation.resultCode !== "guidance_only" || evaluation.reasons.length !== 1
    || (route === NM_GUIDANCE_FINANCIAL_ROUTES[0]
      ? authoritative.packetType !== "guidance_packet" || evaluation.reasons[0].code !== "nm.guidance_only_no_user_filed_court_petition"
      : authoritative.packetType !== "guidance_packet" || evaluation.reasons[0].code !== "nm.lawrence_hold_guidance_only")) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Fresh exact-f20 reproduction, not a captured prior production record. Only
 * the exact nonpayable CR-218 plan or acquittal financial hold may project current guidance.
 * Reads and semantic no-ops leave the original protected record untouched. */
export function maineNonconvictionDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const route = ME_NONCONVICTION_ROUTE;
  const profile = getProfileByJurisdiction("ME"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "ME" || ![route, null].includes(snapshot.pathwayId)
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "807065d4f7af52ad4f58e107f776833df6cd828ece6ab950f81c4efe3e5ac577"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== (snapshot.pathwayId === route
      ? "1c9a3f7ab58685156c7f42960807427898b0681005190b779bdb1a8a865d6f78"
      : "2397844dc55bc722946fbfbaeda0f7706dade4168005ea7665347bc66f855036")
    || profileAuthorityFingerprint(profile, snapshot.pathwayId) !== snapshot.profileAuthorityFingerprint
    || snapshot.paymentAllowed || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("ME", snapshot.pathwayId))
    || !isMaineNonconvictionGuidanceWithoutCr218(profile, route)
    || evaluation.jurisdiction !== "ME" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "guidance_only" || evaluation.paymentAllowed
    || authoritative.packetType !== "guidance_packet" || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "me.lawrence_hold_guidance_only"
    || !canonicalEqual(evaluation.missingQuestionIds, [])
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return null;
  if (snapshot.resultCode === "guidance_only") {
    const priorPlan = { ...evaluation.packetPlan!, formMappingStatus: "source_candidate_identified",
      sourceFormIds: ["ME:LegalEase Maine/MJB-Form-cr-218.pdf:82a9e8084346aa736cf25dc6c663d511e96e7205900b97a7dc2adc4ceec905d4"] };
    if (snapshot.pathwayId !== route || snapshot.packetType !== "guidance_packet"
      || !canonicalEqual(snapshot.packetPlan, priorPlan) || !canonicalEqual(snapshot.requiredInputIds, priorPlan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: priorPlan.mode, sourceFormIds: priorPlan.sourceFormIds })) return null;
  } else {
    if (maineNonconvictionQuestionApplies("ME", route, answers, "financial_obligations")) return null;
    const exactUnknown = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
      && isExplicitUnknownAnswer(answers.financial_obligations);
    const exactMissing = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info"
      && !Object.hasOwn(answers, "financial_obligations");
    if ((!exactUnknown && !exactMissing) || snapshot.packetType !== null || snapshot.packetPlan !== null
      || !canonicalEqual(snapshot.requiredInputIds, [])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })) return null;
  }
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Fresh exact-a74 reproduction established this prior financial-only hold.
 * Restore the current guidance draft and raw history, never verified authority. */
export function nebraskaAcquittalHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const route = "automatic-nonconviction-sealing";
  const profile = getProfileByJurisdiction("NE"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "NE" || snapshot.pathwayId !== route
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "348743ce6772f30a06c98e56c29662bee0794763e76e43687804f8eb4d6534bd"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "6f59f9b5c4d857dfbee66a541d10ae9580f100ac036c50708e8c0fddeacfdb45"
    || profileAuthorityFingerprint(profile, route) !== snapshot.profileAuthorityFingerprint
    || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed
    || snapshot.packetType !== null || snapshot.packetPlan !== null || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("NE", route))
    || evaluation.jurisdiction !== "NE" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "guidance_only" || evaluation.paymentAllowed
    || authoritative.packetType !== "guidance_packet" || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "ne.guidance_only_no_user_filed_court_petition"
    || !canonicalEqual(evaluation.missingQuestionIds, [])
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))
    || evaluation.packetPlan?.mode !== "automatic_relief_verification_and_guidance"
    || evaluation.packetPlan.formMappingStatus !== "not_required" || evaluation.packetPlan.sourceFormIds.length !== 0) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || !isExplicitUnknownAnswer(answers.financial_obligations)
    || nebraskaNonconvictionQuestionApplies("NE", route, answers, "financial_obligations")) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Exact predecessor recovery for operational status guidance; never activation. */
export function louisianaAutomationStatusHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const route = LA_AUTOMATION_STATUS_ROUTE;
  const profile = getProfileByJurisdiction("LA"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "LA" || snapshot.pathwayId !== route
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "aa83d703e56d1ee4964a1cb360a32e226d13feb58c24522eea9ade21517f0ff5"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "dfbbb05f57ebc95472146cf367a8a625facbaa1f2a68eb9bdc772c7016522bcc"
    || profileAuthorityFingerprint(profile, route) !== snapshot.profileAuthorityFingerprint
    || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed
    || snapshot.packetType !== null || snapshot.packetPlan !== null || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds, [])
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("LA", route))
    || evaluation.jurisdiction !== "LA" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== route || evaluation.resultCode !== "guidance_only" || evaluation.paymentAllowed
    || authoritative.packetType !== "guidance_packet" || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "la.guidance_only_no_user_filed_court_petition"
    || !canonicalEqual(evaluation.missingQuestionIds, [])
    || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))
    || evaluation.packetPlan?.mode !== "automatic_relief_verification_and_guidance"
    || evaluation.packetPlan.formMappingStatus !== "not_required" || evaluation.packetPlan.sourceFormIds.length !== 0) return null;
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers || !isExplicitUnknownAnswer(answers.financial_obligations)
    || louisianaAutomationStatusQuestionApplies("LA", route, "financial_obligations")) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: snapshot.capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

function maineUnselectedCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot): string[] {
  if (snapshot.jurisdiction !== "ME" || snapshot.pathwayId !== null
    || !["needs_more_info", "needs_review"].includes(snapshot.resultCode ?? "")
    || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || snapshot.requiredInputIds.length !== 0) return [];
  const profile = getProfileByJurisdiction("ME");
  if (!profile || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)) return [];
  const route = ME_NONCONVICTION_ROUTE;
  const priorAuthority = profileAuthorityFingerprint(profile, route);
  const history = snapshot.dependencies.semanticAnswerHistory;
  const prior = Array.isArray(history) && history.some(entry =>
    isRecord(entry) && ["screeningAnswers", "prefilledAnswers", "packetAnswers"].includes(entry.source)
    && profile.questions.some(question => question.id === entry.factId && questionAnswerState(question, entry.value) === "known_valid")
    && entry.meaning === "prior_factual_pathway_answer" && ["case_outcome", "age_at_offense"].includes(entry.factId)
    && entry.routeKey === `ME:${route}` && entry.profileVersion === profile.profileVersion
    && entry.profileSourceFingerprint === profile.source?.sourceCorpusSha256
    && entry.profileAuthorityFingerprint === priorAuthority);
  // A former protected route establishes correction provenance, not a current
  // route. Never populate optional pathway hints or change the held evaluation.
  return prior ? ["case_outcome", "age_at_offense"] : [];
}

function nebraskaUnselectedCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot): string[] {
  if (snapshot.jurisdiction !== "NE" || snapshot.pathwayId !== null
    || !["needs_more_info", "needs_review"].includes(snapshot.resultCode ?? "")
    || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || snapshot.requiredInputIds.length !== 0) return [];
  const profile = getProfileByJurisdiction("NE");
  if (!profile || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)) return [];
  const route = "automatic-nonconviction-sealing";
  const priorAuthority = profileAuthorityFingerprint(profile, route);
  const history = snapshot.dependencies.semanticAnswerHistory;
  const prior = Array.isArray(history) && history.some(entry =>
    isRecord(entry) && ["screeningAnswers", "prefilledAnswers", "packetAnswers"].includes(entry.source)
    && profile.questions.some(question => question.id === entry.factId && questionAnswerState(question, entry.value) === "known_valid")
    && entry.meaning === "prior_factual_pathway_answer" && ["case_outcome", "age_at_offense"].includes(entry.factId)
    && entry.routeKey === `NE:${route}` && entry.profileVersion === profile.profileVersion
    && entry.profileSourceFingerprint === profile.source?.sourceCorpusSha256
    && entry.profileAuthorityFingerprint === priorAuthority);
  // A former protected route establishes correction provenance, not a current
  // route. Never populate optional pathway hints or change the held evaluation.
  return prior ? ["case_outcome", "age_at_offense"] : [];
}

function oregonUnselectedCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot): string[] {
  if (snapshot.jurisdiction !== "OR" || snapshot.pathwayId !== null
    || !["needs_more_info", "needs_review"].includes(snapshot.resultCode ?? "")
    || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || snapshot.requiredInputIds.length !== 0) return [];
  const profile = getProfileByJurisdiction("OR");
  if (!profile || !oregonDispositionConfigurationSourceMatches(profile.profileVersion, profile.source?.sourceCorpusSha256)
    || snapshot.profileVersion !== OR_DISPOSITION_SOURCE.profileVersion
    || snapshot.profileSourceFingerprint !== OR_DISPOSITION_SOURCE.sourceFingerprint
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)) return [];
  const prior = snapshot.dependencies.semanticAnswerHistory?.some(entry =>
    entry.meaning === "prior_factual_pathway_answer" && entry.factId === "case_outcome"
    && ["screeningAnswers", "prefilledAnswers", "packetAnswers"].includes(entry.source)
    && entry.profileVersion === profile.profileVersion && entry.profileSourceFingerprint === snapshot.profileSourceFingerprint
    && Object.values(OR_DISPOSITION_CONFIGURATIONS).some(config => entry.routeKey === `OR:${config.pathwayId}`
      && entry.profileAuthorityFingerprint === profileAuthorityFingerprint(profile, config.pathwayId)));
  // History offers a correction to an unknown current outcome; it never selects
  // the old route or substitutes an old answer for the owner's current answer.
  return prior ? ["case_outcome"] : [];
}

function missouriUnselectedCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot): string[] {
  if (snapshot.jurisdiction !== "MO" || snapshot.pathwayId !== null
    || !["needs_more_info", "needs_review"].includes(snapshot.resultCode ?? "")
    || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || snapshot.requiredInputIds.length !== 0) return [];
  const profile = getProfileByJurisdiction("MO");
  if (!profile || !isMissouriClosureGuidanceWithoutIdentityForm(profile, MO_CLOSED_RECORD_ROUTE) || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)) return [];
  const route = MO_CLOSED_RECORD_ROUTE;
  const priorAuthority = profileAuthorityFingerprint(profile, route);
  const history = snapshot.dependencies.semanticAnswerHistory;
  const prior = Array.isArray(history) && history.some(entry =>
    isRecord(entry) && ["screeningAnswers", "prefilledAnswers", "packetAnswers"].includes(entry.source)
    && profile.questions.some(question => question.id === entry.factId && questionAnswerState(question, entry.value) === "known_valid")
    && entry.meaning === "prior_factual_pathway_answer" && entry.factId === "case_outcome"
    && entry.routeKey === `MO:${route}` && entry.profileVersion === profile.profileVersion
    && entry.profileSourceFingerprint === profile.source?.sourceCorpusSha256
    && entry.profileAuthorityFingerprint === priorAuthority);
  // A former protected route establishes correction provenance, not a current
  // route. Never populate optional pathway hints or change the held evaluation.
  return prior ? ["case_outcome"] : [];
}

function louisianaUnselectedCorrectionIds(snapshot: ProtectedPacketAuthoritySnapshot): string[] {
  if (snapshot.jurisdiction !== "LA" || snapshot.pathwayId !== null
    || !["needs_more_info", "needs_review"].includes(snapshot.resultCode ?? "")
    || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || snapshot.requiredInputIds.length !== 0) return [];
  const profile = getProfileByJurisdiction("LA");
  if (!profile || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, null)) return [];
  const route = LA_AUTOMATION_STATUS_ROUTE;
  const priorAuthority = profileAuthorityFingerprint(profile, route);
  const history = snapshot.dependencies.semanticAnswerHistory;
  const prior = Array.isArray(history) && history.some(entry =>
    isRecord(entry) && ["screeningAnswers", "prefilledAnswers", "packetAnswers"].includes(entry.source)
    && profile.questions.some(question => question.id === entry.factId && questionAnswerState(question, entry.value) === "known_valid")
    && entry.meaning === "prior_factual_pathway_answer" && entry.factId === "case_outcome"
    && entry.routeKey === `LA:${route}` && entry.profileVersion === profile.profileVersion
    && entry.profileSourceFingerprint === profile.source?.sourceCorpusSha256
    && entry.profileAuthorityFingerprint === priorAuthority);
  // A former protected route establishes correction provenance, not a current
  // route. Never populate optional pathway hints or change the held evaluation.
  return prior ? ["case_outcome"] : [];
}

/** Fresh a386 source-pinned predecessor: tighten only the exact old Tool 1
 * draft. Reads/no-ops preserve the stored row; material edits archive original facts.
 * Neither this projection nor the retained source plan grants verification. */
export function californiaProbationDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile=getProfileByJurisdiction("CA"), evaluation=authoritative.evaluation;
  if (!profile || !ca12034RecordIsContext(profile,CA_12034_ROUTE,packetSpecificationFor(`CA:${CA_12034_ROUTE}`))
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1" || snapshot.jurisdiction !== "CA"
    || snapshot.pathwayId !== CA_12034_ROUTE || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== "1a4fd9b42cb43b5f118210c6b97450ec237e770fad790c92a2519f301c3cfd49"
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile,CA_12034_ROUTE)
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null || !canonicalEqual(snapshot.deferralComponentIds,[])
    || !canonicalEqual(snapshot.serverFacts,canonicalServerFacts("CA",CA_12034_ROUTE))
    || evaluation.jurisdiction !== "CA" || evaluation.profileVersion !== profile.profileVersion
    || ![undefined,CA_12034_ROUTE].includes(evaluation.pathwayId) || evaluation.paymentAllowed
    || !["needs_review","needs_more_info","not_yet"].includes(evaluation.resultCode)
    || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.reasons.length !== 1 || !evaluation.reasons[0].code.startsWith("ca.probation_")
    || evaluation.reasons[0].sourceRef !== CA_12034_SOURCE) return null;
  const raw={...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers};
  if (CA_12034_FACT_IDS.some(id=>Object.hasOwn(raw,id))) return null;
  if (snapshot.resultCode === "packet_ready_with_caution" && snapshot.paymentAllowed) {
    const plan=packetPlanForPathway(profile,CA_12034_ROUTE);
    if (snapshot.packetType !== "official_pdf_overlay" || !plan || !canonicalEqual(snapshot.packetPlan,plan)
      || contactRepresentationHash(plan) !== "14214fde1756c27f2d9cff6e567ceff8563dd639178656befbcabd370b61ff7f"
      || !canonicalEqual(snapshot.requiredInputIds,plan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:plan.mode,sourceFormIds:plan.sourceFormIds})) return null;
  } else if (snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed || snapshot.packetPlan !== null || snapshot.packetType !== null
    || raw.case_outcome !== "I am not sure" || !canonicalEqual(snapshot.requiredInputIds,[])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:null,sourceFormIds:[]})) return null;
  const seeded=protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answerRecord(snapshot.screeningAnswers),
    prefilledAnswers:answerRecord(snapshot.prefilledAnswers),packetAnswers:answerRecord(snapshot.packetAnswers),dependencies:snapshot.dependencies,capturedAt:snapshot.capturedAt});
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot,snapshot,new Set()) : null;
}

/** Exact source-reproduced legacy guidance drafts, never verified records.
 * The old automatic classification supplies provenance only. Current incident
 * facts are still missing, and the retained commercial hold remains closed. */
export function wyoming1401DraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile=getProfileByJurisdiction("WY"), evaluation=authoritative.evaluation;
  if(!profile || !wy1401Contract(profile) || snapshot.schemaVersion!=="expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction!=="WY" || ![WY_1401_ROUTE,null].includes(snapshot.pathwayId)
    || snapshot.profileVersion!==profile.profileVersion || snapshot.profileSourceFingerprint!==profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint!==(snapshot.pathwayId===null?"13fab8f11de1b10b38b0c9e796eaab926e77d11a7e787a624248c4a5bb2ff889":"5920885fa4e4e10a2eb8f92d6cc6156f2ce4bf4d551ea78e4d9197f105a5bd90")
    || snapshot.paymentAllowed || snapshot.selectedTrackId!==null || snapshot.treatmentClassification!==null
    || !canonicalEqual(snapshot.deferralComponentIds,[]) || !canonicalEqual(snapshot.serverFacts,canonicalServerFacts("WY",snapshot.pathwayId))
    || evaluation.jurisdiction!=="WY" || evaluation.profileVersion!==snapshot.profileVersion || evaluation.pathwayId!==WY_1401_ROUTE
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.resultCode!=="needs_more_info" || evaluation.reasons.length!==1
    || evaluation.reasons[0].code!=="wy.nonconviction_missing" || evaluation.reasons[0].sourceRef!==WY_1401_SOURCE
    || !canonicalEqual(evaluation.missingQuestionIds,["wy_1401_listed_deferral"])
    || !canonicalEqual(evaluation.packetPlan,packetPlanForPathway(profile,WY_1401_ROUTE)))return null;
  const raw={...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers};
  if(WY_1401_NEW_IDS.some(id=>Object.hasOwn(raw,id)) || !["Dismissed, no-billed, nolle prosequi, or not prosecuted","Arrest or citation with no charge filed","Acquitted"].includes(String(raw.case_outcome)))return null;
  if(snapshot.resultCode==="guidance_only" && snapshot.pathwayId===WY_1401_ROUTE) {
    if(snapshot.packetType!=="guidance_packet" || !snapshot.packetPlan
      || contactRepresentationHash(snapshot.packetPlan)!=="97fd3f52897a2cef28e51f5fa9397b1268211ef014604359384e8f8f72bab07f"
      || !canonicalEqual(snapshot.requiredInputIds,snapshot.packetPlan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:"automatic_relief_verification_and_guidance",sourceFormIds:[]}))return null;
  } else {
    if(snapshot.packetType!==null || snapshot.packetPlan!==null || !canonicalEqual(snapshot.requiredInputIds,[])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:null,sourceFormIds:[]}))return null;
    if(snapshot.pathwayId===WY_1401_ROUTE ? snapshot.resultCode!=="needs_review" || !isExplicitUnknownAnswer(toScreeningAnswers(answerRecord(raw)).financial_obligations)
      : snapshot.resultCode!=="needs_more_info" || Object.hasOwn(raw,"financial_obligations"))return null;
  }
  const seeded=protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answerRecord(snapshot.screeningAnswers),
    prefilledAnswers:answerRecord(snapshot.prefilledAnswers),packetAnswers:answerRecord(snapshot.packetAnswers),dependencies:snapshot.dependencies,capturedAt:snapshot.capturedAt});
  return seeded?preserveUnchangedProtectedFacts(seeded.snapshot,snapshot,new Set()):null;
}

/** Exact b704 source-reproduced automatic-plan/financial-only1501 predecessors. No verified authority or stored read/no-op mutation. */
export function wyoming1501DraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): ProtectedPacketDraftSnapshot | null {
  const profile=getProfileByJurisdiction("WY"), evaluation=authoritative.evaluation;
  if(!profile || !wy1501Contract(profile) || snapshot.schemaVersion!=="expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction!=="WY" || ![WY_1501_ROUTE,null].includes(snapshot.pathwayId)
    || snapshot.profileVersion!==profile.profileVersion || snapshot.profileSourceFingerprint!==profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint!==(snapshot.pathwayId===null?"13fab8f11de1b10b38b0c9e796eaab926e77d11a7e787a624248c4a5bb2ff889":"16387f1ab367c7924016577d275e06cf440b9360ead57ac14097aef24cddab36")
    || snapshot.paymentAllowed || snapshot.selectedTrackId!==null || snapshot.treatmentClassification!==null
    || !canonicalEqual(snapshot.deferralComponentIds,[]) || !canonicalEqual(snapshot.serverFacts,canonicalServerFacts("WY",snapshot.pathwayId))
    || evaluation.jurisdiction!=="WY" || evaluation.profileVersion!==snapshot.profileVersion || evaluation.pathwayId!==WY_1501_ROUTE
    || evaluation.paymentAllowed || authoritative.selectedTrackId || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.resultCode!=="needs_more_info" || evaluation.reasons.length!==1
    || evaluation.reasons[0].code!=="wy.misdemeanor_missing" || evaluation.reasons[0].sourceRef!==WY_1501_SOURCE
    || !canonicalEqual(evaluation.missingQuestionIds,["wy_1501_record_origin","wy_1501_disposition"])
    || !canonicalEqual(evaluation.packetPlan,packetPlanForPathway(profile,WY_1501_ROUTE)))return null;
  const raw={...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers};
  if(WY_1501_FACT_IDS.some(id=>Object.hasOwn(raw,id)) || !["Misdemeanor conviction"].includes(String(raw.case_outcome)))return null;
  if(snapshot.resultCode==="guidance_only" && snapshot.pathwayId===WY_1501_ROUTE) {
    if(snapshot.packetType!=="guidance_packet" || !snapshot.packetPlan
      || contactRepresentationHash(snapshot.packetPlan)!=="159a71c08a68d7846f23c6885612245e757761479f81109da76dee641e4addee"
      || !canonicalEqual(snapshot.requiredInputIds,snapshot.packetPlan.requiredInputIds)
      || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:"automatic_relief_verification_and_guidance",sourceFormIds:[]}))return null;
  } else {
    if(snapshot.packetType!==null || snapshot.packetPlan!==null || !canonicalEqual(snapshot.requiredInputIds,[])
      || !canonicalEqual(snapshot.packetFamilyIdentifiers,{mode:null,sourceFormIds:[]}))return null;
    if(snapshot.pathwayId===WY_1501_ROUTE ? snapshot.resultCode!=="needs_review" || !isExplicitUnknownAnswer(toScreeningAnswers(answerRecord(raw)).financial_obligations)
      : snapshot.resultCode!=="needs_more_info" || Object.hasOwn(raw,"financial_obligations"))return null;
  }
  const seeded=protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answerRecord(snapshot.screeningAnswers),
    prefilledAnswers:answerRecord(snapshot.prefilledAnswers),packetAnswers:answerRecord(snapshot.packetAnswers),dependencies:snapshot.dependencies,capturedAt:snapshot.capturedAt});
  return seeded?preserveUnchangedProtectedFacts(seeded.snapshot,snapshot,new Set()):null;
}

/** Tighten only the retained NY clock tuple; no read creates the newly required attestations. */
export function ny16059AdoptedClockHeldSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>): boolean {
  const profile = getProfileByJurisdiction("NY"), evaluation = authoritative.evaluation;
  if (!profile || snapshot.jurisdiction !== "NY" || snapshot.pathwayId !== NY_16059_ROUTE
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1" || profile.profileVersion !== snapshot.profileVersion
    || snapshot.profileSourceFingerprint !== "f69c70a88cf5d810cb49b83d572b070cade4a7e039b92b25f82cc68f647d4d99"
    || profile.source?.sourceCorpusSha256 !== snapshot.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== "aeaa5c3b9d1071ad418c72da56ec63a0bf4fb6f8838293dd6dd9e3d5c106bf12"
    || profileAuthorityFingerprint(profile, NY_16059_ROUTE) !== snapshot.profileAuthorityFingerprint
    || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "ny.ny_16059_clock_missing"
    || !evaluation.missingQuestionIds.length || evaluation.missingQuestionIds.some(id => ![NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID].includes(id))
    || !protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false }, authoritative)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("NY", NY_16059_ROUTE))) return false;
  const plan = packetPlanForPathway(profile, NY_16059_ROUTE);
  if (!plan || !canonicalEqual(snapshot.packetPlan, plan) || !canonicalEqual(snapshot.requiredInputIds, plan.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: plan.mode, sourceFormIds: plan.sourceFormIds })
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map =>
      [NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID].some(id => Object.hasOwn(map, id)))) return false;
  const answers = protectedPacketScreeningAnswers(snapshot), captured = ("capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt)?.slice(0, 10);
  if (!answers || !captured || !/^\d{4}-\d{2}-\d{2}$/.test(captured)) return false;
  const former = ny16059PriorClockStatus(answers, captured);
  return former === "satisfied" ? snapshot.resultCode === "packet_ready_with_caution" && snapshot.paymentAllowed
    : former === "not_yet" ? snapshot.resultCode === "not_yet" && !snapshot.paymentAllowed
      : former === "review" && snapshot.resultCode === "needs_review" && !snapshot.paymentAllowed;
}

/** Read-only successor for exact historical compulsory-victim draft holds.
 * Keep their original route/result and null plan; current ready facts cannot
 * upgrade an old held record or infer the absent record's route. */
export function virginiaVictimHeldDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>,
  status: ProtectedPacketVerificationRecord["status"]): NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>> | null {
  // Reproduce the former comparison tuple only for an already-planless hold;
  // the inferred origin is neither persisted nor returned as participant data.
  if (["unverified", "invalidated"].includes(status) && snapshot.jurisdiction === "VA" && snapshot.packetPlan === null
    && ![snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, VA_RECORD_ORIGIN_ID))
    && authoritative.evaluation.reasons.some(reason => reason.code === "va.record_origin_unknown" && reason.sourceRef === VA_RECORD_ORIGIN_SOURCE)) {
    const previous = evaluateProtectedPacketFacts({ ...snapshot, packetAnswers: { ...snapshot.packetAnswers, [VA_RECORD_ORIGIN_ID]: "virginia" } });
    return previous ? virginiaVictimHeldDraftSuccessor(snapshot, previous, status) : null;
  }
  const profile = getProfileByJurisdiction("VA"), evaluation = authoritative.evaluation, route = evaluation.pathwayId;
  if (!["unverified", "invalidated"].includes(status) || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "VA" || !profile || !route || !virginiaVictimQuestionContract(profile, route)
    || !virginiaVictimQuestionContract(authoritative.profile, route)
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("VA", snapshot.pathwayId))
    || snapshot.packetType !== null || snapshot.packetPlan !== null || snapshot.paymentAllowed
    || snapshot.selectedTrackId !== null || snapshot.treatmentClassification !== null
    || !canonicalEqual(snapshot.deferralComponentIds, []) || !canonicalEqual(snapshot.requiredInputIds, [])
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    || evaluation.jurisdiction !== "VA" || evaluation.profileVersion !== snapshot.profileVersion
    || authoritative.selectedTrackId !== null || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || evaluation.missingQuestionIds.length || !canonicalEqual(evaluation.packetPlan, packetPlanForPathway(profile, route))) return null;
  const automatic = route === "automatic-sealing-no-filing";
  if (evaluation.resultCode !== (automatic ? "guidance_only" : "packet_ready_with_caution")
    || evaluation.paymentAllowed !== !automatic || authoritative.packetType !== (automatic ? "guidance_packet" : "custom_pleading")) return null;
  const copies = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers]
    .filter(map => Object.hasOwn(map, VA_VICTIM_STATUS_ID)).map(map => map[VA_VICTIM_STATUS_ID]);
  const uncertain = snapshot.pathwayId === route && snapshot.resultCode === "needs_review"
    && copies.length > 0 && copies.every(value => isAnswerValue(value) && isExplicitUnknownAnswer(toScreeningAnswers({ [VA_VICTIM_STATUS_ID]: value })[VA_VICTIM_STATUS_ID]));
  const absent = snapshot.pathwayId === null && snapshot.resultCode === "needs_more_info" && copies.length === 0;
  if (!uncertain && !absent) return null;
  return { ...authoritative, pathwayLabel: snapshot.pathwayId ? authoritative.pathwayLabel : null,
    packetType: undefined, selectedTrackId: null,
    evaluation: { ...evaluation, resultCode: uncertain ? "needs_review" : "needs_more_info",
      pathwayId: snapshot.pathwayId ?? undefined, pathwayLabel: snapshot.pathwayId ? evaluation.pathwayLabel : undefined,
      userLabel: "Your eligibility result is saved. A packet is not available for this route yet.",
      paymentAllowed: false, packetPlan: undefined, selectedTrackId: null,
      treatmentClassification: null, deferralComponentIds: [], reasons: [], missingQuestionIds: [], cautions: [], nextSteps: [] } };
}

/** Exact captured original120/B predecessor, not a generic planless migration.
 * Only the old unverified draft may open a current source-facts held view.
 * No read/no-op changes stored maps, and a final envelope gains no authority. */
const MD_POLICE_OLD_DRAFT = {"schemaVersion":"expungement-ai/protected-packet-draft/v1","jurisdiction":"MD","profileVersion":"2026-06-19-source-conversion-1","profileSourceFingerprint":"a88bc998d56cda93130e6f3db92e2545c7a98f87bd4940975c85b68ec664f64c","profileAuthorityFingerprint":"439ccffe2dbfe611cc84b1f87273fc49ddf8d245caef0dcd0ff5dad21a437747","pathwayId":"police-record-expungement-when-no-charge-was-filed-under-10-103","resultCode":"needs_more_info","paymentAllowed":false,"packetType":"custom_pleading","packetPlan":{"formMappingStatus":"custom_or_manual_mapping_required","mode":"state_specific_custom_packet_from_source_rules","packetReadyWhen":["backend result is packet_ready or packet_ready_with_caution","every source-defined pathway fact is answered","all waiting and completion conditions are satisfied","no exclusion, ambiguity, or required-review flag remains","the selected form revision and filing location pass source-freshness checks"],"pathwayId":"police-record-expungement-when-no-charge-was-filed-under-10-103","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","county","court","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","record_type","residency_or_location","sentence_completion_date","arrest_date"],"sourceFormIds":[],"sourceRuleRefs":["section:181-196","section:9-28","section:39-52","overview:9-28","corpus-unit:9","corpus-unit:29","corpus-unit:66","corpus-unit:4","corpus-unit:19","corpus-unit:20"]},"requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","county","court","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","record_type","residency_or_location","sentence_completion_date","arrest_date"],"packetFamilyIdentifiers":{"mode":"state_specific_custom_packet_from_source_rules","sourceFormIds":[]},"selectedTrackId":null,"treatmentClassification":null,"deferralComponentIds":[],"serverFacts":{"jurisdiction":"MD","pathway_id":"police-record-expungement-when-no-charge-was-filed-under-10-103"}};
export function marylandPoliceHeldDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>,
  status: ProtectedPacketVerificationRecord["status"]): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("MD"), evaluation = authoritative.evaluation;
  if (!["unverified", "invalidated"].includes(status) || !mdPoliceContext(profile, snapshot.pathwayId)
    || !mdPoliceContext(authoritative.profile, snapshot.pathwayId)
    || !Object.entries(MD_POLICE_OLD_DRAFT).every(([key, value]) => canonicalEqual(snapshot[key as keyof ProtectedPacketAuthoritySnapshot], value))
    || !matchesDeclaredMetadataPredecessor(profile!, MD_POLICE_ROUTE, snapshot.profileAuthorityFingerprint)
    || !canonicalEqual(snapshot.packetPlan, packetPlanForPathway(profile!, MD_POLICE_ROUTE))
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => MD_POLICE_IDS.some(id => Object.hasOwn(map, id)))
    || evaluation.jurisdiction !== "MD" || evaluation.profileVersion !== snapshot.profileVersion
    || evaluation.pathwayId !== MD_POLICE_ROUTE || evaluation.resultCode !== "needs_more_info" || evaluation.paymentAllowed
    || evaluation.packetPlan || authoritative.packetType || authoritative.selectedTrackId
    || evaluation.treatmentClassification || evaluation.deferralComponentIds?.length
    || !canonicalEqual(evaluation.missingQuestionIds, ["arrest_date"])
    || evaluation.reasons.length !== 1 || evaluation.reasons[0].code !== "md.police_source_missing"
    || evaluation.reasons[0].sourceRef !== MD_POLICE_SOURCE) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({ authoritative,
    screeningAnswers: answerRecord(snapshot.screeningAnswers), prefilledAnswers: answerRecord(snapshot.prefilledAnswers),
    packetAnswers: answerRecord(snapshot.packetAnswers), dependencies: snapshot.dependencies, capturedAt: (snapshot as ProtectedPacketDraftSnapshot).capturedAt });
  return seeded ? preserveUnchangedProtectedFacts(seeded.snapshot, snapshot, new Set()) : null;
}

/** Original GA14 MN2 collection successor. Only exact historical draft plans
 * from diagnostic85572 are admitted. Read-time metadata recovery synthesizes
 * no county/prosecutor answer and cannot preserve final verification. */
export function mnTwoCountyDraftSuccessor(snapshot: ProtectedPacketAuthoritySnapshot,
  authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>,
  status: ProtectedPacketVerificationRecord["status"]): ProtectedPacketDraftSnapshot | null {
  const profile = getProfileByJurisdiction("MN"), route = snapshot.pathwayId;
  if (!profile || !route || !["unverified", "invalidated"].includes(status)
    || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "MN"
    || !mnTwoCountySourceContract(profile, route, packetSpecificationFor(`MN:${route}`))
    || snapshot.profileVersion !== profile.profileVersion
    || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, route)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts("MN", route))) return null;
  const current = packetPlanForPathway(profile, route), prior = snapshot.packetPlan;
  // These full-plan digests were independently measured in original diagnostic
  // 85572 and reproduced by the preserved preimage target, not guessed from new code.
  const priorHash = route === "petition-based-expungement-under-609a-02-03"
    ? "a4e006c84bd7a905534b433193d32538e8a98ee6b662aa3278a019b1b803cbda"
    : "3d6434cb149341f4c8d5150a0d0e5322bf54b663d5105371fd95e70606936c54";
  if (!prior || !current || contactRepresentationHash(prior) !== priorHash
    || !canonicalEqual(snapshot.requiredInputIds, prior.requiredInputIds)
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: prior.mode, sourceFormIds: prior.sourceFormIds })
    || !canonicalEqual(authoritative.evaluation.packetPlan, current)
    || !canonicalEqual({ ...current, requiredInputIds: current.requiredInputIds.filter(id => !mnTwoCountyFactIds(route).includes(id)) }, prior)) return null;
  const next = { ...snapshot, packetPlan: current, requiredInputIds: current.requiredInputIds };
  return protectedRouteAuthorityMatches(next, authoritative) ? next as ProtectedPacketDraftSnapshot : null;
}

export function protectedPacketInformationModelFor(
  verification: ProtectedPacketVerificationRecord
): ProtectedPacketInformationModel | null {
  let snapshot = protectedAuthoritySnapshotFor(verification);
  if (!snapshot) return null;
  const mdAuthority = snapshot.jurisdiction === "MD" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (mdAuthority) snapshot = marylandPoliceHeldDraftSuccessor(snapshot, mdAuthority, verification.status) ?? snapshot;
  const wyAuthority=snapshot.jurisdiction==="WY"?evaluateProtectedPacketFacts(snapshot):null;
  if(wyAuthority)snapshot=wyoming1501DraftSuccessor(snapshot,wyAuthority)??wyoming1401DraftSuccessor(snapshot,wyAuthority)??snapshot;
  const caAuthority=snapshot.jurisdiction === "CA" && snapshot.pathwayId === CA_12034_ROUTE ? evaluateProtectedPacketFacts(snapshot) : null;
  if(caAuthority) snapshot=californiaProbationDraftSuccessor(snapshot,caAuthority) ?? snapshot;
  const orAuthority = snapshot.jurisdiction === "OR" && snapshot.pathwayId === null ? evaluateProtectedPacketFacts(snapshot) : null;
  if (orAuthority) snapshot = oregonDispositionDraftSuccessor(snapshot, orAuthority) ?? snapshot;
  const okFinancialAuthority = snapshot.jurisdiction === "OK" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (okFinancialAuthority) snapshot = oklahomaCleanSlateFinancialDraftSuccessor(snapshot, okFinancialAuthority) ?? snapshot;
  const txFinancialAuthority = snapshot.jurisdiction === "TX" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (txFinancialAuthority) snapshot = texasNondisclosureClockDraftSuccessor(snapshot, txFinancialAuthority) ?? texasGuidanceFinancialDraftSuccessor(snapshot, txFinancialAuthority) ?? snapshot;
  const wvFinancialAuthority = snapshot.jurisdiction === "WV" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (wvFinancialAuthority) snapshot = westVirginiaGuidanceFinancialDraftSuccessor(snapshot, wvFinancialAuthority) ?? snapshot;
  const sdFinancialAuthority = snapshot.jurisdiction === "SD" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (sdFinancialAuthority) snapshot = southDakotaGuidanceFinancialDraftSuccessor(snapshot, sdFinancialAuthority) ?? snapshot;
  const scFinancialAuthority = snapshot.jurisdiction === "SC" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (scFinancialAuthority) snapshot = southCarolinaGuidanceFinancialDraftSuccessor(snapshot, scFinancialAuthority) ?? snapshot;
  const njFinancialAuthority = snapshot.jurisdiction === "NJ" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (njFinancialAuthority) snapshot = newJerseyMarijuanaStatusFinancialDraftSuccessor(snapshot, njFinancialAuthority) ?? snapshot;
  const nmFinancialAuthority = snapshot.jurisdiction === "NM" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (nmFinancialAuthority) snapshot = newMexicoGuidanceFinancialDraftSuccessor(snapshot, nmFinancialAuthority) ?? snapshot;
  const mtFinancialAuthority = snapshot.jurisdiction === "MT" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (mtFinancialAuthority) snapshot = montanaRecordFinancialDraftSuccessor(snapshot, mtFinancialAuthority) ?? snapshot;
  const mtAuthority = snapshot.jurisdiction === "MT" && [MT_DEFERRED_ROUTE, null].includes(snapshot.pathwayId)
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (mtAuthority) snapshot = montanaDeferredDraftSuccessor(snapshot, mtAuthority) ?? snapshot;
  const moMarijuanaAuthority = snapshot.jurisdiction === "MO" && [MO_MARIJUANA_STATUS_ROUTE, null].includes(snapshot.pathwayId)
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (moMarijuanaAuthority) snapshot = missouriMarijuanaDraftSuccessor(snapshot, moMarijuanaAuthority) ?? snapshot;
  const moAuthority = snapshot.jurisdiction === "MO" && [MO_CLOSED_RECORD_ROUTE, null].includes(snapshot.pathwayId)
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (moAuthority) snapshot = missouriClosureDraftSuccessor(snapshot, moAuthority) ?? snapshot;
  const meAuthority = snapshot.jurisdiction === "ME" ? evaluateProtectedPacketFacts(snapshot) : null;
  if (meAuthority) snapshot = maineNonconvictionDraftSuccessor(snapshot, meAuthority) ?? snapshot;
  const ksAuthority = snapshot.jurisdiction === "KS" && snapshot.pathwayId === KS_REGISTRATION_ROUTE
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (ksAuthority) snapshot = kansasRegistrationHeldSuccessor(snapshot, ksAuthority) ?? snapshot;
  const laAuthority = snapshot.jurisdiction === "LA" && snapshot.pathwayId === LA_AUTOMATION_STATUS_ROUTE
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (laAuthority) snapshot = louisianaAutomationStatusHeldSuccessor(snapshot, laAuthority) ?? snapshot;
  const neAuthority = snapshot.jurisdiction === "NE" && snapshot.pathwayId === "automatic-nonconviction-sealing"
    ? evaluateProtectedPacketFacts(snapshot) : null;
  if (neAuthority) snapshot = nebraskaAcquittalHeldSuccessor(snapshot, neAuthority) ?? snapshot;
  if ((isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId) || isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) || snapshot.jurisdiction === "MS" && snapshot.pathwayId === MS_MIP_ROUTE || arkansasRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId) || virginiaRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId))
    && (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] }))) return null;
  if (LEGAL_AUTHORITY_METADATA_SUCCESSORS.some(row => row.jurisdiction === snapshot!.jurisdiction
    && row.pathwayId === snapshot!.pathwayId && row.priorSha256 === snapshot!.profileAuthorityFingerprint)) {
    const metadataAuthority = evaluateProtectedPacketFacts(snapshot);
    if (metadataAuthority) snapshot = legalAuthorityMetadataDraftSuccessor(snapshot, metadataAuthority, verification.status) ?? snapshot;
  }
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  if (snapshot.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)) return null;
  const currentAuthoritative = evaluateProtectedPacketFacts(snapshot);
  if (!currentAuthoritative) return null;
  const vaHeldSuccessor = virginiaVictimHeldDraftSuccessor(snapshot, currentAuthoritative, verification.status);
  const authoritative = vaHeldSuccessor ?? currentAuthoritative;
  const evaluation = authoritative.evaluation;
  const gaCtSourceFactReview = georgiaSb288Context(profile, snapshot.pathwayId) || ctPetitionContext(profile, snapshot.pathwayId);
  // Tighten an unverified held draft only; its source, plan, route, raw maps and payment refusal must still match.
  if (gaCtSourceFactReview && ["unverified", "invalidated"].includes(verification.status) && snapshot.resultCode === "needs_review" && !snapshot.paymentAllowed
    && evaluation.resultCode === "needs_more_info" && !evaluation.paymentAllowed
    && ["ga.sb288_missing", "ga.sb288_classification"].includes(evaluation.reasons[0]?.code)
    && evaluation.reasons[0]?.sourceRef === GA_SB288_SOURCE && evaluation.missingQuestionIds.length > 0
    && evaluation.missingQuestionIds.every(id => id === "case_outcome" || GA_SB288_FACT_IDS.includes(id))
    && protectedRouteAuthorityMatches({ ...snapshot, resultCode: evaluation.resultCode }, authoritative)) {
    snapshot = { ...snapshot, resultCode: evaluation.resultCode };
  }
  const factualSuccessor = wyoming1502HeldDraftSuccessor(snapshot, authoritative, verification.status) ?? illinoisProstitutionHeldDraftSuccessor(snapshot, authoritative, verification.status) ?? ohioDiversionDraftSuccessor(snapshot, authoritative) ?? factualPathwayHeldSuccessor(snapshot, authoritative) ?? convictionFallbackHeldSuccessor(snapshot, authoritative) ?? arkansasRecordOriginHeldSuccessor(snapshot, authoritative) ?? virginiaRecordOriginHeldSuccessor(snapshot, authoritative, verification.status);
  if (factualSuccessor) snapshot = factualSuccessor;
  const contractSuccessor = !canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan)
    ? mnTwoCountyDraftSuccessor(snapshot, authoritative, verification.status) ?? reviewedPacketContractSuccessor(snapshot, evaluation.packetPlan) : null;
  if (contractSuccessor) snapshot = contractSuccessor;
  if (!protectedRouteAuthorityMatches(snapshot, authoritative) && ny16059HeldDetailSuccessor(snapshot, authoritative)) {
    // Newly required details may tighten an old held result. Keep all protected
    // maps and dependencies; this read grants no readiness or verification.
    snapshot = { ...snapshot, resultCode: evaluation.resultCode };
  }
  if (!protectedRouteAuthorityMatches(snapshot, authoritative) && (financialAnswerHeldSuccessor(snapshot, authoritative) || ny16059AdoptedClockHeldSuccessor(snapshot, authoritative) || msMipBothEventsHeldSuccessor(snapshot, authoritative) || msTimingAnswerHeldSuccessor(snapshot, authoritative) || oregonDispositionTimingHeldSuccessor(snapshot, authoritative))) {
    snapshot = { ...snapshot, resultCode: evaluation.resultCode, paymentAllowed: false };
  }
  if (!protectedRouteAuthorityMatches(snapshot, authoritative)) return null;
  const packetPlan = readPacketPlan(snapshot.packetPlan);
  if (packetPlan && packetPlan.pathwayId !== snapshot.pathwayId) return null;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  const {
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts
  } = sourceDisjointFactMaps({
    ...refreshedProtectedPacketFactMaps(snapshot, refreshedSensitiveFactMaps(snapshot.jurisdiction, snapshot.pathwayId, snapshot.requiredInputIds,
      ...participantMapArguments(legacy.maps))).maps,
    serverFacts: snapshot.serverFacts
  });
  // Malformed historical context stays in the protected raw maps. Expose the
  // existing optional repair control as uncertain, never stringify an object.
  if (dcInnocenceLocationIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, DC_LEGACY_LOCATION))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, DC_LEGACY_LOCATION))) {
    packetAnswers[DC_LEGACY_LOCATION] = { unknown: true };
  }
  if (ndFirstOffenseRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, ND_LEGACY_RECORD_TYPE))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, ND_LEGACY_RECORD_TYPE))) {
    // Display-only uncertainty exposes the existing historical correction.
    // The original typed value stays in its protected map on read/no-op.
    packetAnswers[ND_LEGACY_RECORD_TYPE] = { unknown: true };
  }
  if ((akCourtviewRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || akPardonRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || akJuvenileRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || akAgencyOrSisRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`)))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, AK_LEGACY_RECORD_TYPE))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, AK_LEGACY_RECORD_TYPE))) {
    // Display-only recovery; no read/no-op rewrite of retained raw history.
    packetAnswers[AK_LEGACY_RECORD_TYPE] = { unknown: true };
  }
  if (alRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "record_type"))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, "record_type"))) {
    // Display-only clarification of retained context; read/no-op preserves raw maps.
    packetAnswers.record_type = { unknown: true };
  }
  if (ohTraffickingCourtIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "court"))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, "court"))) {
    // Display-only retained context; raw maps remain unchanged on read/no-op.
    packetAnswers.court = { unknown: true };
  }
  if (arNonconvictionRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "record_type"))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, "record_type"))) {
    // Display-only clarification of retained context; read/no-op preserves raw maps.
    packetAnswers.record_type = { unknown: true };
  }
  if (arFelonyRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "record_type"))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, "record_type"))) {
    // Display-only clarification of retained context; read/no-op preserves raw maps.
    packetAnswers.record_type = { unknown: true };
  }
  if (ca12034RecordIsContext(profile,snapshot.pathwayId,packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
    && [snapshot.screeningAnswers,snapshot.prefilledAnswers,snapshot.packetAnswers].some(map=>Object.hasOwn(map,"record_type"))
    && ![screeningAnswers,prefilledAnswers,packetAnswers].some(map=>Object.hasOwn(map,"record_type"))) packetAnswers.record_type={unknown:true};
  if ((caTool3RecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || dcFlPetitionRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || dcFelonyRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || coPetitionRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || caTool4RecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || ca12034aRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || caAutomaticRecordIsContext(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`)))
    && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "record_type"))
    && ![screeningAnswers, prefilledAnswers, packetAnswers].some(map => Object.hasOwn(map, "record_type"))) {
    // Display-only clarification of retained context; read/no-op preserves raw maps.
    packetAnswers.record_type = { unknown: true };
  }
  if (alRedeemerClassificationContract(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))) {
    for (const id of alRedeemerClassificationConflicts(snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers)) {
      // Display-only uncertainty: ordinary no-op keeps every raw copy. Only
      // explicit correction may archive them through the existing history path.
      delete screeningAnswers[id];
      delete prefilledAnswers[id];
      packetAnswers[id] = { unknown: true };
    }
  }
  // Earlier-map ground values are history, never a preselected packet-stage answer.
  if (isAkCourtviewContact(snapshot.jurisdiction, snapshot.pathwayId)) for (const id of AK_TF810_GROUND_IDS) {
    delete screeningAnswers[id];
    delete prefilledAnswers[id];
  }
  const initialAnswers = { ...screeningAnswers, ...prefilledAnswers, ...packetAnswers };
  let requiredInputIds = stringArray(snapshot.requiredInputIds);
  if (!canonicalEqual(requiredInputIds, packetPlan?.requiredInputIds ?? [])) return null;
  if (msFirstOffenderSourceContract(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))) {
    requiredInputIds = [...new Set([...requiredInputIds, ...MS_FIRST_OFFENDER_COLLECTION_IDS])];
  }
  const vaPardonSpecification = packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`);
  const vaPardonQuestion = vaPardonTypeQuestion(profile, snapshot.pathwayId, vaPardonSpecification, initialAnswers, legacy.inspection.effectiveInvalidIds);
  const vaPardonChecklist = vaPardonQuestion && vaPardonSpecification && "participantChecklist" in vaPardonSpecification
    ? vaPardonSpecification.participantChecklist.find(item => item.id === "implementation-check-1") : undefined;
  if (vaPardonQuestion) {
    requiredInputIds = [...new Set([...requiredInputIds, VA_PARDON_TYPE_ID])];
  }
  const mnStageContext = mnProtectedStageContext(profile, snapshot.pathwayId,
    packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`), initialAnswers, legacy.inspection.effectiveInvalidIds);
  if (mnStageContext) {
    requiredInputIds = [...new Set([...requiredInputIds, ...mnTwoCountyFactIds(snapshot.pathwayId!), ...mnStageContext.questions.map(question => question.id), MN_TARGET_ORIGIN_ID,
      ...([snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "residency_or_location")) ? ["residency_or_location"] : [])])];
  }
  const ohDiversionCorrections = ohioDiversionCorrectionIds(snapshot, authoritative);
  const heldFactualCorrectionIds = [...oregonUnselectedCorrectionIds(snapshot), ...missouriUnselectedCorrectionIds(snapshot), ...maineUnselectedCorrectionIds(snapshot), ...nebraskaUnselectedCorrectionIds(snapshot), ...louisianaUnselectedCorrectionIds(snapshot), ...ohDiversionCorrections];
  const questionSurface = protectedPacketQuestionSurface(
    profile,
    snapshot.pathwayId,
    screeningAnswers,
    requiredInputIds,
    serverFacts,
    prefilledAnswers,
    packetAnswers,
    [...recordFactOwnQuestionIds(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, snapshot.dependencies.recordFactConfirmations, legacy.inspection.effectiveInvalidIds)],
    legacy.inspection.effectiveInvalidIds,
    heldFactualCorrectionIds, snapshot.dependencies.recordFactConfirmations
  );
  if (vaHeldSuccessor) {
    // Previously accepted planless holds remain readable without a new editor.
    const hiddenIds = new Set([VA_RECORD_ORIGIN_ID, ...VA_RECORD_CONTEXT_IDS]);
    questionSurface.questions = questionSurface.questions.filter(question => !hiddenIds.has(question.id));
    questionSurface.builderQuestions = questionSurface.builderQuestions.filter(question => !hiddenIds.has(question.id));
    questionSurface.builderSections = questionSurface.builderSections.filter(section => section.id !== "va_optional_record_context");
    for (const id of hiddenIds) questionSurface.questionById.delete(id);
  }
  questionSurface.questions = legacyShapeQuestionMetadata(questionSurface.questions, legacy.inspection.effectiveInvalidIds);
  questionSurface.builderQuestions = legacyShapeQuestionMetadata(questionSurface.builderQuestions, legacy.inspection.effectiveInvalidIds);
  if (!packetPlan || arkansasRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId) || virginiaRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId)) for (const id of factualPathwayCorrectionIds(snapshot.jurisdiction, snapshot.pathwayId, initialAnswers)) {
    const question = questionSurface.questions.find(candidate => candidate.id === id);
    if (question && !questionSurface.builderQuestions.some(candidate => candidate.id === id)) questionSurface.builderQuestions.push(question);
  }
  for (const question of questionSurface.questions) questionSurface.questionById.set(question.id, question);
  const recordOwnQuestionIds = [...recordFactOwnQuestionIds(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, snapshot.dependencies.recordFactConfirmations, legacy.inspection.effectiveInvalidIds)];
  const recordClarificationIds = unresolvedRecordFactConfirmations(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers, questionSurface.questionById, snapshot.dependencies.recordFactConfirmations, legacy.inspection.effectiveInvalidIds);
  const legacySemanticAnswers = snapshot.dependencies.semanticAnswerHistory?.filter((entry) => entry.factId === "trafficking_status"
    && entry.meaning === "ambiguous_victimhood_or_charged_conduct" && entry.routeKey === `${snapshot.jurisdiction}:${snapshot.pathwayId}`) ?? [];
  const chargedQuestion = questionSurface.questions.find((question) => question.id === MS_CHARGED_CONDUCT_FACT);
  if (chargedQuestion && legacySemanticAnswers.length && !Object.prototype.hasOwnProperty.call(snapshot.packetAnswers, chargedQuestion.id)) {
    const previous = [...new Set(legacySemanticAnswers.map((entry) => {
      const value = entry.value;
      return typeof value === "string" || typeof value === "number" ? String(value)
        : isRecord(value) && value.unknown !== true && (typeof value.value === "string" || typeof value.value === "number") ? String(value.value) : null;
    }).filter((value): value is string => value !== null))];
    const note = "We need to clarify this answer because an earlier question may have referred to being a victim of human trafficking. Your earlier answer is saved, but it will not answer this question for you.";
    const noteEs = "Necesitamos aclarar esta respuesta porque una pregunta anterior pudo haberse referido a ser víctima de trata de personas. Su respuesta anterior está guardada, pero no se usará para responder esta pregunta por usted.";
    const clarified = { ...chargedQuestion, helperText: `${chargedQuestion.helperText ?? ""}\n\n${note}${previous.length ? `\nEarlier saved answer: ${previous.join(" / ")}` : ""}`,
      translations: { ...chargedQuestion.translations, es: { ...chargedQuestion.translations?.es,
        helperText: `${chargedQuestion.translations?.es?.helperText ?? ""}\n\n${noteEs}${previous.length ? `\nRespuesta guardada anteriormente: ${previous.join(" / ")}` : ""}` } } };
    questionSurface.questions = questionSurface.questions.map((question) => question.id === clarified.id ? clarified : question);
    questionSurface.builderQuestions = questionSurface.builderQuestions.map((question) => question.id === clarified.id ? clarified : question);
    questionSurface.questionById.set(clarified.id, clarified);
  }
  // What the participant still owes, which is what "missing" has always meant.
  // Where the route cannot be resolved this is every required input the server
  // does not own -- the behaviour this line had before the collection policy.
  const missingInputIds = missingRequiredInputs(
    collectionGateInputIds(questionSurface.collection, requiredInputIds, serverFacts),
    serverFacts,
    initialAnswers,
    new Map(questionSurface.questions.map((question) => [question.id, question]))
  );
  if (gaCtSourceFactReview || ohDiversionCorrections.length > 0) for (const id of evaluation.missingQuestionIds) {
    if (!missingInputIds.includes(id)) missingInputIds.push(id);
    // A source-invalid value is not an equivalent known answer when the owner explicitly corrects it.
    delete initialAnswers[id];
    const question = questionSurface.questionById.get(id);
    if (question && [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, id))) {
      const correction = { ...question, savedAnswerNeedsClarification: true };
      questionSurface.questionById.set(id, correction);
      questionSurface.questions = questionSurface.questions.map(q => q.id === id ? correction : q);
      questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === id ? correction : q);
      if (!questionSurface.builderQuestions.some(q => q.id === id)) questionSurface.builderQuestions.push(correction);
    }
  }
  if (arkansasRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId) && arkansasRecordOrigin(initialAnswers) === "unknown"
    && !missingInputIds.includes(AR_RECORD_ORIGIN_ID)) missingInputIds.push(AR_RECORD_ORIGIN_ID);
  if (!vaHeldSuccessor && virginiaRecordOriginApplies(snapshot.jurisdiction, snapshot.pathwayId) && virginiaRecordOrigin(initialAnswers) === "unknown"
    && !missingInputIds.includes(VA_RECORD_ORIGIN_ID)) missingInputIds.push(VA_RECORD_ORIGIN_ID);
  // Current source completion facts do not alter the evaluator's route/result
  // or stored plan.
  const ctContact = ctCleanSlateContactInputs(snapshot);
  if (ctContact) for (const field of CT_CLEAN_SLATE_CONTACT_FIELDS) {
    if (ctContact.unresolvedIds.includes(field.id) && !missingInputIds.includes(field.id)) missingInputIds.push(field.id);
    if (ctContact.conflictingIds.includes(field.id)) {
      // Read-time projection only. An explicit replacement is the ordinary
      // semantic-history transition; neither read nor no-op chooses a copy.
      delete initialAnswers[field.id];
      const originalQuestion = questionSurface.questionById.get(field.id);
      if (originalQuestion) {
        const question = { ...originalQuestion, savedAnswerNeedsClarification: true,
          helperText: `${originalQuestion.helperText ?? ""}\nSaved copies disagree. Enter the correct current detail explicitly. Original answers remain saved in your history.`,
          translations: { ...originalQuestion.translations, es: { ...originalQuestion.translations?.es,
            helperText: `${originalQuestion.translations?.es?.helperText ?? ""}\nLas copias guardadas no coinciden. Ingrese expresamente el dato actual correcto. Las respuestas originales se conservan en su historial.` } } };
        questionSurface.questionById.set(field.id, question);
        questionSurface.questions = questionSurface.questions.map(q => q.id === field.id ? question : q);
        questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === field.id ? question : q);
      }
    }
  }
  const ksContact = ksMunicipalContactInputs(snapshot);
  if (ksContact) for (const field of KS_MUNICIPAL_CONTACT_FIELDS) {
    // The approved map defines destinations, not a universal contact triple.
    // Unknown or absent modes remain unprinted without creating intake gates.
    if (ksContact.conflictingIds.includes(field.id)) {
      // Read-time projection only. An explicit replacement is the ordinary
      // semantic-history transition; neither read nor no-op chooses a copy.
      delete initialAnswers[field.id];
      const originalQuestion = questionSurface.questionById.get(field.id);
      if (originalQuestion) {
        const question = { ...originalQuestion, savedAnswerNeedsClarification: true,
          helperText: `${originalQuestion.helperText ?? ""}\nSaved copies disagree. Enter the correct current detail explicitly. Original answers remain saved in your history.`,
          translations: { ...originalQuestion.translations, es: { ...originalQuestion.translations?.es,
            helperText: `${originalQuestion.translations?.es?.helperText ?? ""}\nLas copias guardadas no coinciden. Ingrese expresamente el dato actual correcto. Las respuestas originales se conservan en su historial.` } } };
        questionSurface.questionById.set(field.id, question);
        questionSurface.questions = questionSurface.questions.map(q => q.id === field.id ? question : q);
        questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === field.id ? question : q);
      }
    }
  }
  const ndContact = ndFirstOffenseFamilyContract(profile, snapshot.pathwayId) ? ndFirstOffenseFamilyInputs(snapshot) : null;
  if (ndContact) for (const field of ND_FIRST_OFFENSE_CONTACT_FIELDS) {
    // The approved map defines destinations, not a universal contact triple.
    // Unknown or absent modes remain unprinted without creating intake gates.
    if (ndContact.conflictingIds.includes(field.id)) {
      // Read-time projection only. An explicit replacement is the ordinary
      // semantic-history transition; neither read nor no-op chooses a copy.
      delete initialAnswers[field.id];
      const originalQuestion = questionSurface.questionById.get(field.id);
      if (originalQuestion) {
        const question = { ...originalQuestion, savedAnswerNeedsClarification: true,
          helperText: `${originalQuestion.helperText ?? ""}\nSaved copies disagree. Enter the correct current detail explicitly. Original answers remain saved in your history.`,
          translations: { ...originalQuestion.translations, es: { ...originalQuestion.translations?.es,
            helperText: `${originalQuestion.translations?.es?.helperText ?? ""}\nLas copias guardadas no coinciden. Ingrese expresamente el dato actual correcto. Las respuestas originales se conservan en su historial.` } } };
        questionSurface.questionById.set(field.id, question);
        questionSurface.questions = questionSurface.questions.map(q => q.id === field.id ? question : q);
        questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === field.id ? question : q);
      }
    }
  }
  const orContact = oregonContactInputs(snapshot);
  if (orContact?.conflictingIds.length) {
    // A read cannot choose between saved copies. Blank only disputed display
    // values so an explicit replacement uses ordinary semantic history.
    for (const id of orContact.conflictingIds) delete initialAnswers[id];
    const activeIds = new Set(oregonContactQuestions(initialAnswers, false, orContact.conflictingIds).map(q => q.id));
    for (const descriptor of oregonContactQuestions(initialAnswers, true, orContact.conflictingIds)) {
      const original = questionSurface.questionById.get(descriptor.id);
      if (!original) continue;
      const question = { ...original, helperText: descriptor.helperText, translations: descriptor.translations };
      if (orContact.conflictingIds.includes(question.id)) {
        question.savedAnswerNeedsClarification = true;
        question.helperText += "\nSaved copies disagree. Enter the correct current detail explicitly. Original answers remain saved in your history.";
        question.translations = { ...question.translations, es: { ...question.translations?.es,
          helperText: `${question.translations?.es?.helperText ?? ""}\nLas copias guardadas no coinciden. Ingrese expresamente el dato actual correcto. Las respuestas originales se conservan en su historial.` } };
      }
      questionSurface.questionById.set(question.id, question);
      questionSurface.questions = questionSurface.questions.map(q => q.id === question.id ? question : q);
      questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === question.id ? question : q);
    }
    questionSurface.builderQuestions = questionSurface.builderQuestions.filter(q => !(OR_CONTACT_IDS as readonly string[]).includes(q.id) || activeIds.has(q.id));
  }
  // TF-810 explicitly makes email optional; it is never a missing input.
  const activeAkIds = new Set(akCourtviewContactIds(snapshot.jurisdiction, snapshot.pathwayId, initialAnswers));
  for (const field of AK_TF810_CONTACT_FIELDS) {
    const question = questionSurface.questionById.get(field.id);
    if (activeAkIds.has(field.id) && !field.optional && question && akCourtviewContactAnswerState(snapshot.jurisdiction, snapshot.pathwayId, field.id, initialAnswers[field.id], questionAnswerState(question, initialAnswers[field.id])) !== "known_valid"
      && !missingInputIds.includes(field.id)) missingInputIds.push(field.id);
  }
  const akInputs = akCourtviewContactInputs(snapshot);
  for (const id of akInputs?.unresolvedIds ?? []) if (!missingInputIds.includes(id)) missingInputIds.push(id);
  // Display maps are source-disjoint; the raw saved copies decide whether TF-810 answers disagree.
  for (const question of akCourtviewContactQuestions(snapshot.jurisdiction, snapshot.pathwayId, initialAnswers, false, snapshot)) {
    const existing = questionSurface.questionById.get(question.id);
    if (question.id !== AK_TF810_PUBLIC_ID || !existing) continue;
    // Keep a clarification the legacy-shape projection already set on this question.
    if (existing.savedAnswerNeedsClarification) question.savedAnswerNeedsClarification = true;
    questionSurface.questionById.set(question.id, question);
    questionSurface.questions = questionSurface.questions.map(q => q.id === question.id ? question : q);
    questionSurface.builderQuestions = questionSurface.builderQuestions.map(q => q.id === question.id ? question : q);
  }
  if (isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId)) for (const field of NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS) {
    const question = questionSurface.questionById.get(field.id);
    if (!field.optional && question && questionAnswerState(question, initialAnswers[field.id]) !== "known_valid"
      && !missingInputIds.includes(field.id)) missingInputIds.push(field.id);
  }
  if (isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId)
    && (["connected", "other_groups"].includes(String(initialAnswers.ny_16059_grouping)) || Object.hasOwn(initialAnswers, NY_TRANSACTION_ASSOCIATIONS_ID))) {
    const facts = nyTransactionFactsFromAnswers(toScreeningAnswers(initialAnswers));
    if ((!facts.complete || nyProtectedTransactionInputIssues(snapshot).length) && !missingInputIds.includes(NY_TRANSACTION_ASSOCIATIONS_ID)) missingInputIds.push(NY_TRANSACTION_ASSOCIATIONS_ID);
  }
  const nyCaseIssues = isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) ? nyCaseAssociationIssues(initialAnswers) : [];
  for (const issue of nyCaseIssues) {
    if (!missingInputIds.includes(issue.id)) missingInputIds.push(issue.id);
    const originalQuestion = questionSurface.questionById.get(issue.id);
    if (originalQuestion) {
      const question = { ...originalQuestion, required: true, contextOnly: false };
      questionSurface.questionById.set(issue.id, question);
      questionSurface.questions = questionSurface.questions.map(candidate => candidate.id === issue.id ? question : candidate);
      if (!questionSurface.builderQuestions.some(candidate => candidate.id === issue.id)) questionSurface.builderQuestions.push(question);
      else questionSurface.builderQuestions = questionSurface.builderQuestions.map(candidate => candidate.id === issue.id ? question : candidate);
    }
  }
  if (questionSurface.collection?.contactReconciliation && !missingInputIds.includes("contact_information")) missingInputIds.push("contact_information");
  if (!packetPlan && routeFactualCorrectionIds({ stateCode: snapshot.jurisdiction, pathwayId: snapshot.pathwayId,
    screeningAnswers, prefilledAnswers, packetAnswers }).includes("financial_obligations")) {
    const financial = questionSurface.questionById.get("financial_obligations");
    if (financial) {
      const unresolved = questionAnswerState(financial, initialAnswers.financial_obligations) !== "known_valid";
      if (unresolved && !missingInputIds.includes(financial.id)) missingInputIds.push(financial.id);
      if ((unresolved || isNegative(answerTextRaw(initialAnswers.financial_obligations)))
        && !questionSurface.builderQuestions.some(question => question.id === financial.id)) {
        questionSurface.builderQuestions.push(financial);
      }
    }
  }
  if (wy1401Context(profile,snapshot.pathwayId,initialAnswers)) {
    for (const id of wy1401Facts(initialAnswers,new Date().toISOString().slice(0,10)).ids) if(questionSurface.questionById.has(id) && !missingInputIds.includes(id)) missingInputIds.push(id);
  }
  if (ca12034Context(profile,snapshot.pathwayId,initialAnswers)) {
    for (const id of ca12034Facts(initialAnswers).ids) {
      if (questionSurface.questionById.has(id) && !missingInputIds.includes(id)) missingInputIds.push(id);
    }
  }
  if (ndFirstOffenseFamilyContract(profile, snapshot.pathwayId)) for (const id of ND_FIRST_OFFENSE_FACT_IDS) {
    const question = questionSurface.questionById.get(id);
    if (question && ndFirstOffenseFactApplies(profile, snapshot.pathwayId, initialAnswers, id)
      && ndFirstOffenseAnswerState(snapshot.jurisdiction, snapshot.pathwayId, id, initialAnswers[id], initialAnswers,
        questionAnswerState(question, initialAnswers[id])) !== "known_valid" && !missingInputIds.includes(id)) missingInputIds.push(id);
  }
  if(wy1501Context(profile,snapshot.pathwayId,initialAnswers)) {
    const facts=wy1501Facts(initialAnswers,new Date().toISOString().slice(0,10));
    for(const id of wy1501FactIds(initialAnswers)) {
      const question=questionSurface.questionById.get(id);
      if(question&&!questionSurface.builderQuestions.some(q=>q.id===id))questionSurface.builderQuestions.push(question);
      if(facts.ids.includes(id)&&!missingInputIds.includes(id))missingInputIds.push(id);
    }
  }
  const txClock = texasNondisclosureClock(profile, snapshot.pathwayId, initialAnswers, new Date().toISOString().slice(0,10));
  for (const id of texasNondisclosureFactIds(profile, snapshot.pathwayId, initialAnswers)) {
    const question = questionSurface.questionById.get(id);
    if (question && !questionSurface.builderQuestions.some(q => q.id === id)) questionSurface.builderQuestions.push(question);
    if (snapshot.pathwayId !== TX_ND_ROUTES[0] && txClock?.ids.includes(id) && !missingInputIds.includes(id)) missingInputIds.push(id);
  }
  for (const id of msExactTimingQuestionIds(snapshot.jurisdiction, snapshot.pathwayId, toScreeningAnswers(initialAnswers))) {
    const question = questionSurface.questionById.get(id);
    const valid = id === "ms_mip_fine_imposed" ? question && questionAnswerState(question, initialAnswers[id]) === "known_valid"
      : msExactCalendarDate(toScreeningAnswers(initialAnswers)[id]);
    if (!valid && !missingInputIds.includes(id)) missingInputIds.push(id);
    if (question && (!valid || !packetPlan) && !questionSurface.builderQuestions.some(candidate => candidate.id === id)) questionSurface.builderQuestions.push(question);
  }
  for (const id of recordClarificationIds) if (!missingInputIds.includes(id)) missingInputIds.push(id);
  const summaryFlow: CommercialFlow = {
    screening: { answers: screeningAnswers },
    packetInformation: {
      prefilledAnswers,
      answers: packetAnswers,
      serverFacts
    }
  };
  const verificationSummary = verificationSummaryFor(summaryFlow, questionSurface.questionById, serverFacts);
  if (vaPardonTypeReportedState(vaPardonQuestion, initialAnswers[VA_PARDON_TYPE_ID]) === "known_both") {
    for (const fact of verificationSummary) {
      const purpose = Object.hasOwn(VA_PARDON_FACT_PURPOSES, fact.id) ? VA_PARDON_FACT_PURPOSES[fact.id] : undefined;
      if (purpose) fact.purpose = { ...purpose };
    }
  }
  // The guarded pardonType question already belongs to this current review, not the historical snapshot.
  const verificationContext = verificationContextFor((vaPardonQuestion ? { ...snapshot, requiredInputIds } : snapshot) as unknown as Record<string, unknown>);
  const verificationManifest: PacketVerificationManifest = {
    schemaVersion: "expungement-ai/verification-review-manifest/v1",
    factKeys: verificationSummary.map((fact) => fact.key),
    systemContextKeys: verificationContext.map((entry) => entry.key)
  };
  const reviewSafety = vaHeldSuccessor ? { safe: false, reason: "historical_context_draft_held" }
    : contractSuccessor ? { safe: false, reason: "packet_contract_clarification_required" }
    : protectedPacketDraftReviewSafety(snapshot, "verifiedAt" in snapshot ? snapshot.verifiedAt : new Date().toISOString());
  const mnStage = mnStageContext?.candidate ?? null;
  // Existing unsafe reasons win. A held candidate never revives verification.
  if (mnStage && reviewSafety.safe) { reviewSafety.safe = false; reviewSafety.reason = "mn_source_stage_document_binding_required"; }
  const currentlyVerified = verification.status === "verified" && reviewSafety.safe;
  const gaPreparation = snapshot.jurisdiction === "GA" && snapshot.pathwayId === GA_PARDON_ROUTE
    && canonicalEqual(snapshot.serverFacts, canonicalServerFacts("GA", GA_PARDON_ROUTE))
    ? georgiaPardonPreparationFactIds(snapshot, { profile, profileAuthorityFingerprint: profileAuthorityFingerprint(profile, snapshot.pathwayId), today: new Date().toISOString().slice(0, 10) }) : null;
  return {
    resultCode: snapshot.resultCode,
    ...(vaPardonChecklist ? { vaPardonTypeHeldContext: {
      status: "HELD_CONTEXT" as const,
      reportedState: vaPardonTypeReportedState(vaPardonQuestion, initialAnswers[VA_PARDON_TYPE_ID]),
      participantChecklistItem: { ...vaPardonChecklist },
      languageHold: "es_translation_not_adopted" as const
    } } : {}),
    ...(mnStage ? { mnSourceStageCandidate: mnStage } : {}),
    ...(heldFactualCorrectionIds.length ? { heldFactualCorrectionIds } : {}),
    ...(gaPreparation ? { gaPardonPreparationAvailable: true } : {}),
    ...(snapshot.schemaVersion === "expungement-ai/protected-packet-draft/v1" && caProp64JuvenilePreparationScope(snapshot) ? { caJuvenilePreparationAvailable: true } : {}),
    ...(snapshot.schemaVersion === "expungement-ai/protected-packet-draft/v1" && montanaDeferredDocumentInputs(snapshot, { profile, profileAuthorityFingerprint: profileAuthorityFingerprint(profile, snapshot.pathwayId), contract: MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT }).status !== "not_applicable" ? { mtDeferredPreparationAvailable: true } : {}),
    stateCode: snapshot.jurisdiction,
    revision: verification.revision,
    pathwayId: snapshot.pathwayId,
    packetPlan,
    questions: questionSurface.questions,
    builderQuestions: questionSurface.builderQuestions,
    builderSections: questionSurface.builderSections,
    initialAnswers,
    screeningAnswers,
    prefilledAnswers,
    packetAnswers,
    serverFacts,
    requiredInputIds,
    missingInputIds,
    pendingDerivations: questionSurface.collection?.pendingDerivations ?? [],
    contactReconciliation: questionSurface.collection?.contactReconciliation,
    recordOwnQuestionIds, recordClarificationIds,
    ...((mnTargetOriginQuestion(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || mdJuvenileCaptionQuestion(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))
      || vaPardonQuestion) ? { recordFactConfirmations: snapshot.dependencies.recordFactConfirmations } : {}),
    nyCaseIssues,
    courtRecordConflict: recordFactCourtConflict(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, initialAnswers),
    stage: !packetPlan ? "in_progress" : currentlyVerified
      ? "ready_to_generate"
      : missingInputIds.length === 0 && !questionSurface.collection?.pendingDerivations.length ? "facts_complete" : "in_progress",
    reviewedAt: currentlyVerified && "verifiedAt" in snapshot ? snapshot.verifiedAt : null,
    capturedAt: "capturedAt" in snapshot ? snapshot.capturedAt : snapshot.verifiedAt,
    verificationSummary,
    verificationContext,
    verificationManifest,
    reviewSafety,
    expectedComponents: expectedPacketComponents(packetPlan)
  };
}

type ProtectedPacketAuthoritySnapshot = PacketVerificationSnapshot | ProtectedPacketDraftSnapshot;

/** Exact held juvenile source preparation, separate from the ordinary county
 * correction. A participant statement never makes this route payable. */
export function mdJuvenilePreparationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  const model = protectedPacketInformationModelFor(verification);
  const snapshot = protectedAuthoritySnapshotFor(verification);
  if (!model || !snapshot || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || snapshot.jurisdiction !== "MD" || snapshot.pathwayId !== "juvenile-expungement"
    || snapshot.resultCode !== "not_covered_yet" || snapshot.paymentAllowed !== false
    || snapshot.profileVersion !== "2026-06-19-source-conversion-1"
    || snapshot.profileSourceFingerprint !== "a88bc998d56cda93130e6f3db92e2545c7a98f87bd4940975c85b68ec664f64c"
    || snapshot.profileAuthorityFingerprint !== "1d793bff0dd23998a3644752fc1f9cca01072caaa69b05dfaec6f0de70628e07"
    || model.stateCode !== snapshot.jurisdiction || model.pathwayId !== snapshot.pathwayId
    || model.resultCode !== "not_covered_yet") return null;
  const county = mdJuvenileCaptionQuestion(getProfileByJurisdiction("MD"), snapshot.pathwayId,
    packetSpecificationFor(MD_JUVENILE_CAPTION_ROUTE));
  if (!county) return null;
  const questions = [county, ...MD_JUVENILE_DOCUMENT_QUESTIONS];
  const conflicts = questions.filter(question => {
    const values = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers]
      .filter(map => Object.hasOwn(map, question.id)).map(map => map[question.id]);
    return values.some(value => !canonicalEqual(value, values[0]));
  }).map(question => question.id);
  const initialAnswers = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers } as Record<string, AnswerValue>;
  const recordClarificationIds = [...new Set([...conflicts, ...(model.recordClarificationIds ?? []).filter(id => id === "county")])];
  return { ...model, mdJuvenilePreparationFactIds: questions.map(q => q.id),
    questions, builderQuestions: questions, builderSections: [], initialAnswers,
    recordClarificationIds, missingInputIds: [...new Set([...recordClarificationIds,
      ...questions.filter(q => questionAnswerState(q, initialAnswers[q.id]) !== "known_valid").map(q => q.id)])],
    pendingDerivations: [], stage: "in_progress", reviewedAt: null,
    reviewSafety: { safe: false, reason: "participant_document_preparation_only" } };
}

/** Explicit participant-directed editing only; the held plan and its required
 * inputs remain unchanged. This surface cannot verify or generate a packet. */
export function gaPardonPreparationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  const model = protectedPacketInformationModelFor(verification);
  const snapshot = protectedAuthoritySnapshotFor(verification);
  if (!model?.gaPardonPreparationAvailable || !snapshot) return null;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction)!;
  const scope = georgiaPardonPreparationFactIds(snapshot, { profile,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, snapshot.pathwayId), today: new Date().toISOString().slice(0, 10) });
  if (!scope) return null;
  const ids = [...scope.requiredFactIds, ...scope.optionalFactIds];
  const surface = protectedPacketQuestionSurface(profile, snapshot.pathwayId, model.screeningAnswers, ids,
    model.serverFacts, model.prefilledAnswers, model.packetAnswers, model.recordOwnQuestionIds ?? []);
  const questions = surface.questions.filter(question => ids.includes(question.id));
  const questionById = new Map(questions.map(question => [question.id, question]));
  const recordClarificationIds = unresolvedRecordFactConfirmations(`${snapshot.jurisdiction}:${snapshot.pathwayId}`,
    model.initialAnswers, questionById, snapshot.dependencies.recordFactConfirmations);
  return { ...model, gaPardonPreparationFactIds: ids,
    questions, builderQuestions: questions, builderSections: [], recordClarificationIds,
    missingInputIds: [...new Set([...missingRequiredInputs(scope.requiredFactIds, model.serverFacts, model.initialAnswers, questionById), ...recordClarificationIds])],
    pendingDerivations: [], stage: "in_progress", reviewedAt: null,
    reviewSafety: { safe: false, reason: "participant_document_preparation_only" }
  };
}

/** Explicit document preparation retains the original nonpayable route and all
 * owner/CAS checks. No prepared fact changes the evaluator's legal authority. */
export function montanaDeferredPreparationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  const model = protectedPacketInformationModelFor(verification);
  let snapshot = protectedAuthoritySnapshotFor(verification);
  if (!model?.mtDeferredPreparationAvailable || !snapshot || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1") return null;
  const currentAuthority = evaluateProtectedPacketFacts(snapshot);
  if (!currentAuthority) return null;
  snapshot = montanaDeferredDraftSuccessor(snapshot, currentAuthority) ?? snapshot;
  if (snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1") return null;
  const profile = getProfileByJurisdiction("MT")!;
  const mapping = montanaDeferredDocumentInputs(snapshot, { profile, profileAuthorityFingerprint: profileAuthorityFingerprint(profile, snapshot.pathwayId), contract: MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT });
  if (mapping.status === "not_applicable") return null;
  const allQuestions = montanaDeferredDocumentQuestions(profile, model.initialAnswers, mapping.stage, true);
  const questions = montanaDeferredDocumentQuestions(profile, model.initialAnswers, mapping.stage);
  return { ...model, mtDeferredPreparationFactIds: allQuestions.map(question => question.id),
    mtDeferredPreparationActiveFactIds: questions.map(question => question.id),
    questions: allQuestions, builderQuestions: questions, builderSections: [],
    recordClarificationIds: mapping.reviewReasons.filter(reason => reason.startsWith("conflicting_protected_fact:")).map(reason => reason.slice("conflicting_protected_fact:".length)),
    initialAnswers: { ...model.initialAnswers, ...answerRecord(montanaDeferredAliasDisplay(snapshot)) },
    mtDeferredPreparationReviewRequired: mapping.status === "source_review",
    mtDeferredPreparationNotices: montanaDeferredDocumentReviewNotices(mapping.reviewReasons),
    missingInputIds: mapping.missingFactIds, pendingDerivations: [], stage: "in_progress", reviewedAt: null,
    reviewSafety: { safe: false, reason: "participant_document_preparation_only" } };
}

/** Juvenile source facts are explicitly requested by the owner. The ordinary
 * held route stays unchanged, and this surface cannot verify a filing packet. */
export function caProp64JuvenilePreparationModelFor(verification: ProtectedPacketVerificationRecord): ProtectedPacketInformationModel | null {
  const model = protectedPacketInformationModelFor(verification);
  const snapshot = protectedAuthoritySnapshotFor(verification);
  if (!model?.caJuvenilePreparationAvailable || !snapshot || snapshot.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || !caProp64JuvenilePreparationScope(snapshot)) return null;
  const contextQuestions = CA_PROP64_CAPTION_QUESTIONS.map(question => question.id === "participant_full_legal_name" ? { ...question,
    prompt: "Whose full name should the filing-contact declaration identify for this juvenile request?",
    helperText: "Enter the actual applicant's name explicitly. A saved adult-case or account name is not a substitute for confirming this juvenile filing context.",
    translations: { es: { prompt: "¿Qué nombre completo debe identificar la declaración de contacto de esta solicitud de menores?", helperText: "Indique expresamente el nombre real del solicitante. Un nombre guardado de un caso de adultos o de la cuenta no sustituye la confirmación del contexto de esta presentación de menores." } }
  } : question.id === "ca_prop64_court_case_number" ? { ...question,
    prompt: "Which juvenile case number should the filing-contact declaration identify?",
    helperText: "Enter this juvenile case number explicitly. It must agree with the case number you separately supply for JV-744.",
    translations: { es: { prompt: "¿Qué número de caso de menores debe identificar la declaración de contacto?", helperText: "Indique expresamente este número de caso de menores. Debe coincidir con el número que proporcione por separado para JV-744." } }
  } : question.id === "ca_prop64_filer_representation" ? { ...question,
    optionDisplay: { ...question.optionDisplay,
      self_represented: { label: "The applicant, without an attorney", translations: { es: { label: "El solicitante, sin abogado" } } },
      attorney: { label: "An attorney representing the applicant", translations: { es: { label: "Un abogado que representa al solicitante" } } } }
  } : question);
  const context = [...contextQuestions, ...caProp64ContactQuestions(model.initialAnswers)];
  const questions = [...caProp64JuvenileDocumentQuestions(model.initialAnswers), ...context];
  const allQuestions = [...caProp64JuvenileDocumentQuestions(model.initialAnswers, true), ...context];
  const conflicts = allQuestions.filter(question => {
    const found = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers]
      .filter(map => Object.hasOwn(map, question.id)).map(map => map[question.id]);
    return found.some(raw => !canonicalEqual(raw, found[0]));
  }).map(question => question.id);
  return { ...model, caJuvenilePreparationFactIds: allQuestions.map(q => q.id),
    caJuvenilePreparationActiveFactIds: questions.map(q => q.id), questions: allQuestions,
    builderQuestions: questions, builderSections: [], recordClarificationIds: conflicts,
    missingInputIds: questions.filter(q => q.required && (q.id === "ca_prop64_juvenile_additional_count"
      ? caProp64JuvenileAdditionalCount(model.initialAnswers[q.id]) === undefined
      : questionAnswerState(q, model.initialAnswers[q.id]) !== "known_valid")).map(q => q.id),
    pendingDerivations: [], stage: "in_progress", reviewedAt: null,
    reviewSafety: { safe: false, reason: "participant_document_preparation_only" } };
}

/**
 * Resolve one route's required facts to their collection classes.
 *
 * This is the single point where packet authority ("what the finished packet
 * must know") meets collection policy ("how each of those facts is obtained").
 * It returns null only where the route itself cannot be read, which every
 * caller treats as it always has: fail closed, ask everything.
 */
/** Server-only exact profile guard; the shared contact decoder carries no authority. */
export function ctCleanSlateContactContract(profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>, pathwayId: string | null) {
  // The historical full-profile hash remains recorded with the contact source.
  // Another CT route's reviewed authority successor does not change JD-CR-202.
  return isCtCleanSlateContact(profile.jurisdiction.code, pathwayId)
    && profile.profileVersion === CT_CLEAN_SLATE_CONTACT_SOURCE.profileVersion
    && profile.source?.sourceCorpusSha256 === CT_CLEAN_SLATE_CONTACT_SOURCE.profileSourceFingerprint
    && profileAuthorityFingerprint(profile, pathwayId) === CT_CLEAN_SLATE_CONTACT_SOURCE.profileAuthorityFingerprint;
}
export function ksMunicipalContactContract(profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>, pathwayId: string | null) {
  return isKsMunicipalContact(profile.jurisdiction.code, pathwayId)
    && contactRepresentationHash(profile) === KS_MUNICIPAL_CONTACT_SOURCE.profileSha256;
}

export function ndFirstOffenseFamilyContract(profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>, pathwayId: string | null,
  specification = packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId ?? ""}`)) {
  return isNdFirstOffenseFamily(profile.jurisdiction.code, pathwayId)
    && contactRepresentationHash(profile) === ND_FIRST_OFFENSE_FAMILY.profileSha256
    && [ND_FIRST_OFFENSE_FAMILY.legacySpecificationCanonicalSha256, ND_FIRST_OFFENSE_FAMILY.successorSpecificationCanonicalSha256]
      .some(hash => hash === contactRepresentationHash(specification));
}

export function packetCollectionFor(input: {
  jurisdiction: string;
  pathwayId: string | null;
  requiredInputIds: string[];
  serverFacts: Record<string, AnswerValue>;
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers?: Record<string, AnswerValue>;
  savedAnswers?: Record<string, AnswerValue>;
  recordOwnQuestionIds?: string[];
  unresolvedSavedFactIds?: readonly string[];
  recordFactConfirmations?: RecordFactConfirmations;
}): PacketCollectionResolution | null {
  const profile = getProfileByJurisdiction(input.jurisdiction);
  if (!profile) return null;
  const pathway = profile.pathways.find((candidate) => candidate.id === input.pathwayId) ?? null;
  const scope = pathway ? routeDecidingFactScope(profile, pathway) : null;
  const decidingFactIds = new Set<string>([
    ...(scope?.factIds ?? []),
    ...routeSafetyGateFactIds(input.jurisdiction, input.pathwayId)
  ]);
  if(wy1501Context(profile,input.pathwayId,{...input.screeningAnswers,...input.prefilledAnswers,...input.savedAnswers}))for(const id of wy1501FactIds({...input.screeningAnswers,...input.prefilledAnswers,...input.savedAnswers}))decidingFactIds.add(id);
  for (const id of texasNondisclosureFactIds(profile, input.pathwayId, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers })) decidingFactIds.add(id);
  const specification = packetSpecificationFor(`${input.jurisdiction}:${input.pathwayId ?? ""}`) ?? null;
  const originQuestion = mnTargetOriginQuestion(profile, input.pathwayId, specification);
  const originAnswers = { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers };
  const originConfirmed = originQuestion && !input.unresolvedSavedFactIds?.includes(MN_TARGET_ORIGIN_ID)
    && scalarAnswerText(originAnswers[MN_TARGET_ORIGIN_ID]) === "State or local"
    && !unresolvedRecordFactConfirmations(`${input.jurisdiction}:${input.pathwayId}`, originAnswers,
      new Map([[MN_TARGET_ORIGIN_ID, originQuestion]]), input.recordFactConfirmations).includes(MN_TARGET_ORIGIN_ID);
  const unresolvedRules = scope?.unresolvedRules.filter(rule => !(originConfirmed && mnTargetOriginRule18Entry(rule))) ?? [];
  const unresolvedFactIds = new Set(unresolvedRules.flatMap(rule => rule.factIds));
  const contactContract = reviewedContactRepresentation({ profile, pathwayId: input.pathwayId, specification,
    requiredInputIds: input.requiredInputIds, decidingFactIds, unresolvedFactIds });
  const questionById = new Map(allPublicQuestions(projectPublicProfile(profile))
    .filter(question => wy1501QuestionApplies(profile,input.pathwayId,{...input.screeningAnswers,...input.prefilledAnswers,...input.savedAnswers},question.id))
    .filter(question => wy1401QuestionApplies(profile,input.pathwayId,{...input.screeningAnswers,...input.prefilledAnswers,...input.savedAnswers},question.id))
    .filter(question => ndFirstOffenseFactApplies(profile, input.pathwayId, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, question.id))
    .map((question) => [question.id, toProfileQuestion(question)]));
  installPacketSpecificationQuestions(questionById, input.jurisdiction, input.pathwayId, input.requiredInputIds, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, input.unresolvedSavedFactIds);
  const juvenileCaptionQuestion = mdJuvenileCaptionQuestion(profile, input.pathwayId, specification);
  if (juvenileCaptionQuestion) questionById.set("county", juvenileCaptionQuestion);
  for (const id of input.requiredInputIds) {
    if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  }
  return resolvePacketCollection({
    jurisdiction: input.jurisdiction,
    pathwayId: input.pathwayId,
    requiredInputIds: vaPardonTypeQuestion(profile, input.pathwayId, specification, originAnswers, input.unresolvedSavedFactIds)
      ? [...new Set([...input.requiredInputIds, VA_PARDON_TYPE_ID])]
      : alRedeemerClassificationContract(profile, input.pathwayId, specification)
      ? [...new Set([...input.requiredInputIds, ...alRedeemerClassificationIds({ ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers })])]
      : originQuestion ? [...new Set([...input.requiredInputIds, MN_TARGET_ORIGIN_ID])] : input.requiredInputIds,
    serverFacts: input.serverFacts,
    screeningAnswers: input.screeningAnswers,
    prefilledAnswers: input.prefilledAnswers,
    savedAnswers: input.savedAnswers,
    unresolvedSavedFactIds: new Set(input.unresolvedSavedFactIds ?? []),
    questionById,
    specification,
    routeDecidingFactIds: decidingFactIds,
    unresolvedRouteFactIds: unresolvedFactIds,
    mdJuvenileCountySourcePurpose: mdJuvenileCountySourcePurpose(profile, input.pathwayId, { specification, requiredInputIds: input.requiredInputIds, decidingFactIds, unresolvedFactIds }),
    reviewedContactRepresentation: Boolean(contactContract),
    ndFirstOffenseSourceOwnedInputs: ndFirstOffenseFamilyContract(profile, input.pathwayId),
    ndFirstOffenseStatutoryFactIds: ndFirstOffenseFamilyContract(profile, input.pathwayId)
      ? new Set(ND_FIRST_OFFENSE_FACT_IDS.filter(id => ndFirstOffenseFactApplies(profile, input.pathwayId,
        { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, id))) : undefined,
    ctCleanSlateSeparateContact: ctCleanSlateContactContract(profile, input.pathwayId)
      && !decidingFactIds.has("contact_information") && !unresolvedFactIds.has("contact_information"),
    ksMunicipalSeparateContact: ksMunicipalContactContract(profile, input.pathwayId)
      && !decidingFactIds.has("contact_information") && !unresolvedFactIds.has("contact_information"),
    missouriClosureStatusOnly: isMissouriClosureGuidanceWithoutIdentityForm(profile, input.pathwayId ?? ""),
    montanaDeferredFinancialFacts: !montanaDeferredLegacyFinancialApplies(profile, input.pathwayId, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, "financial_obligations"),
    missouriMarijuanaStatusOnly: !missouriMarijuanaStatusQuestionApplies(input.jurisdiction, input.pathwayId, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, "financial_obligations", profile),
    recordOwnQuestionIds: new Set([...recordFactOwnQuestionIds(`${input.jurisdiction}:${input.pathwayId}`, { ...input.screeningAnswers, ...input.prefilledAnswers, ...input.savedAnswers }, undefined, input.unresolvedSavedFactIds), ...(input.recordOwnQuestionIds ?? [])]),
    // Narrowing confirmation must not synthesize new evaluator inputs. Preserve
    // the accepted materialization guard independently of route identity.
    materializationProtectedFactIds: pathway ? pathwayRelevantFactIds(profile, pathway) : undefined,
    baselineCarriedFactIds: baselineCarriedFactIds(`${input.jurisdiction}:${input.pathwayId ?? ""}`),
    override: routeCollectionOverrideFor(`${input.jurisdiction}:${input.pathwayId ?? ""}`)
  });
}

/** Edit links and direct saves share collection ownership; later/external facts stay in their actual stage. */
/** Eligibility corrections are distinct from document-required fields. They use
 * the existing protected revision/hash transition and never change the plan. */
/** Existing route facts remain editable through an exclusion and subsequent
 * clarification. A saved fact identifies its control, never a replacement route. */
export function factualPathwayCorrectionIds(state: string, pathway: string | null, answers: Record<string, unknown>, includeInactive = false): string[] {
  const profile = getProfileByJurisdiction(state);
  if (msFirstOffenderSourceContract(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))) return [...MS_FIRST_OFFENDER_COLLECTION_IDS];
  if (ohJuvenileSourceContract(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))) return ohJuvenileStageFactIds(answers, includeInactive);
  if (state === "DE") return delawareProtectedCorrectionIds(profile ?? undefined, pathway, answers, includeInactive);
  if (mnTwoCountySourceContract(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))) return [
    MN_TARGET_ORIGIN_ID, "case_outcome", ...mnProtectedStageFactIds(profile, pathway!, answers, includeInactive), ...mnTwoCountyFactIds(pathway!).filter(id => includeInactive || id !== "mn_prosecuting_city" || answers.mn_prosecuted_by === "city_attorney"),
    ...(Object.hasOwn(answers, "residency_or_location") ? ["residency_or_location"] : [])];
  if (mdPoliceContext(profile, pathway) && packetSpecificationFor(`${state}:${pathway}`) == null) return [
    ...mdPoliceFactIds(answers, includeInactive), "case_outcome",
    ...(includeInactive ? ["county", "court", ...["financial_obligations", "sentence_completion_date", "court_requirements_completed", "resolved_timing_bucket"].filter(id => Object.hasOwn(answers, id))] : [])];
  const relief = profile ? convictionReliefRequest(profile, answers) : null;
  const extra = profile && relief && relief.status !== "not_applicable"
    ? [...convictionReliefQuestions(state).filter(q => includeInactive || convictionReliefQuestionApplies(profile, answers, q.id)).map(q => q.id),
      "case_outcome", ...(state === "GA" ? ["ga_original_first_offender", "pardon_status"] : [])] : [];
  if (includeInactive && Object.hasOwn(answers, "residency_or_location")
    && (nvProgramCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || sdSisCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)))) extra.push("residency_or_location");
  if (includeInactive && Object.hasOwn(answers, "offense_category")
    && (ilProstitutionCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || nvProgramCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || ctPetitionCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || gaSb288CategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || ctInformationCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`), answers)
      || arBoundCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || alThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || hiThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || kyThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || laThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || maThreeRouteCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || maAdditionalCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || maMeCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || iaCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || dcInnocenceCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || ilIdentityCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || msAdditionalCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)))) extra.push("offense_category");

  if (profile && texasNondisclosureTimingContract(profile,pathway)) extra.push(...texasNondisclosureFactIds(profile, pathway, answers, includeInactive), "case_outcome", "offense_level");
  if (profile && wy1501Context(profile,pathway,answers)) return [...extra,...wy1501FactIds(answers,includeInactive),"case_outcome","offense_level",...(includeInactive?["financial_obligations","sentence_completion_date","court_requirements_completed","resolved_timing_bucket"].filter(id=>Object.hasOwn(answers,id)):[])];
  if (profile && wy1401Context(profile,pathway,answers)) return [...extra,"case_outcome","possible_pathway_context",
    ...WY_1401_FACT_IDS.filter(id=>includeInactive || wy1401QuestionApplies(profile,pathway,answers,id)),
    ...(includeInactive ? WY_1401_IRRELEVANT_IDS.filter(id=>Object.hasOwn(answers,id)):[])];
  if (profile && ca12034Context(profile, pathway, answers)) return [...extra,"case_outcome","possible_pathway_context",
    ...CA_12034_FACT_IDS.filter(id=>includeInactive || ca12034QuestionApplies(profile,pathway,answers,id)),
    ...(Object.hasOwn(answers,"record_type") && ca12034RecordIsContext(profile,pathway,packetSpecificationFor(`${state}:${pathway}`)) ? ["record_type"] : [])];
  if (profile && state === "OR" && oregonDispositionConfigurationSourceMatches(profile.profileVersion, profile.source?.sourceCorpusSha256)
    && (pathway === null || Object.values(OR_DISPOSITION_CONFIGURATIONS).some(config => config.pathwayId === pathway))
    && (pathway !== null || oregonDispositionIdentity(answers).status !== "not_applicable"
      || OR_DISPOSITION_FACT_IDS.some(id => Object.hasOwn(answers, id)))) {
    return [...extra, "case_outcome", "pending_cases", "state_exclusion_categories",
      ...OR_DISPOSITION_FACT_IDS.filter(id => includeInactive || oregonDispositionQuestionApplies(state, answers, id)),
      ...(oregonContactContract(profile, pathway) ? oregonContactQuestions(answers, includeInactive).map(q => q.id) : [])];
  }
  if (dcInnocenceLocationIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
    && Object.hasOwn(answers, DC_LEGACY_LOCATION)) return [...extra, DC_LEGACY_LOCATION];
  if (profile && ndFirstOffenseFamilyContract(profile, pathway)) return [...extra, ...ND_FIRST_OFFENSE_CONTACT_IDS,
    ...ND_FIRST_OFFENSE_FACT_IDS.filter(id => includeInactive || ndFirstOffenseFactApplies(profile, pathway, answers, id)),
    ...(ND_FIRST_OFFENSE_FACT_IDS.some(id => Object.hasOwn(answers, id)) ? ["case_outcome"] : []),
    ...(ndFirstOffenseRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      && Object.hasOwn(answers, ND_LEGACY_RECORD_TYPE) ? [ND_LEGACY_RECORD_TYPE] : []),
    // Ordinary explicit corrections to saved legacy context retain their raw
    // history, without offering those obsolete purposes as active intake.
    ...(includeInactive ? ["contact_information", "residency_or_location"].filter(id => Object.hasOwn(answers, id)) : [])];
  if (ctPetitionContext(profile, pathway)) return [...extra, "case_outcome", ...CT_PETITION_FACT_IDS.filter(id => includeInactive || ctPetitionQuestionApplies(profile, pathway, answers, id)),
    ...(profile && ctCleanSlateContactContract(profile, pathway) ? CT_CLEAN_SLATE_CONTACT_IDS : [])];
  if (profile && ctCleanSlateContactContract(profile, pathway)) return [...extra, ...CT_CLEAN_SLATE_CONTACT_IDS];
  if (profile && ksMunicipalContactContract(profile, pathway)) return [...extra, ...KS_MUNICIPAL_CONTACT_IDS];
  if (includeInactive && alRedeemerClassificationContract(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))) return [...extra,
    ...AL_REDEEMER_CLASSIFICATION_IDS.filter(id => Object.hasOwn(answers, id) || alRedeemerClassificationIds(answers).includes(id)),
    ...["record_type", "offense_category"].filter(id => Object.hasOwn(answers, id))];
  if (alRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
    && Object.hasOwn(answers, "record_type")) return [...extra, "record_type"];
  if ((akPardonRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || akJuvenileRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || akAgencyOrSisRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)))
    && Object.hasOwn(answers, AK_LEGACY_RECORD_TYPE)) return [...extra, AK_LEGACY_RECORD_TYPE];
  if (isAkCourtviewContact(state, pathway)) return [...extra, ...akCourtviewContactIds(state, pathway, answers, includeInactive),
    ...(akCourtviewRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      && Object.hasOwn(answers, AK_LEGACY_RECORD_TYPE) ? [AK_LEGACY_RECORD_TYPE] : [])];
  // Source-approved OH referrals prepare no court filing. Earlier court data
  // participates only in explicit inactive-history saves, not a held editor.
  if (includeInactive && ohTraffickingCourtIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
    && Object.hasOwn(answers, "court")) return [...extra, "court"];
  // Retained CA taxonomy is editable history only; it does not create a held editor.
  if (includeInactive && (ca12034aRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || caAutomaticRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)))
    && Object.hasOwn(answers, "record_type")) return [...extra, "record_type"];
  // Felony taxonomy participates in explicit history persistence, not the held editor.
  if (virginiaRecordOriginApplies(state, pathway)) return [...extra, VA_RECORD_ORIGIN_ID,
    ...VA_RECORD_CONTEXT_IDS.filter(id => virginiaRecordContextApplies(state, pathway, answers)
      || includeInactive && Object.hasOwn(answers, id))];
  if (arkansasRecordOriginApplies(state, pathway)) return [...extra, AR_RECORD_ORIGIN_ID,
    ...((arNonconvictionRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))
      || includeInactive && arFelonyRecordIsContext(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)))
      && Object.hasOwn(answers, "record_type") ? ["record_type"] : [])];
  if (includeInactive && profile && !texasGuidanceFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !westVirginiaGuidanceFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !southDakotaGuidanceFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !southCarolinaGuidanceFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !newJerseyMarijuanaStatusFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !newMexicoGuidanceFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (includeInactive && profile && !montanaRecordFinancialApplies(profile, pathway, answers, "financial_obligations")
    && Object.hasOwn(answers, "financial_obligations")) return [...extra, "financial_obligations"];
  if (profile && state === "MT" && isMontanaDeferredContract(profile, pathway)) return [...extra, ...MT_DEFERRED_FACT_IDS.filter(id => includeInactive || montanaDeferredFactApplies(profile, pathway, answers, id)), "case_outcome"];
  if (profile && state === "MO" && isMissouriMarijuanaStatusContract(profile, pathway)) return [...extra, ...MO_MARIJUANA_FACT_IDS.filter(id => includeInactive || missouriMarijuanaFactApplies(profile, pathway, answers, id)), "case_outcome"];
  if (state === "MO" && pathway === MO_CLOSED_RECORD_ROUTE) return [...extra, "case_outcome"];
  if (state === "ME" && pathway === ME_NONCONVICTION_ROUTE) return [...extra, "case_outcome", "age_at_offense"];
  if (state === "LA" && pathway === LA_AUTOMATION_STATUS_ROUTE) return [...extra, "case_outcome"];
  if (state === "NE" && pathway === "automatic-nonconviction-sealing") return [...extra, "case_outcome", "age_at_offense"];
  if (wy1502Context(profile, pathway)) return [...extra, ...WY_1502_FACT_IDS.filter(id => includeInactive || wy1502QuestionApplies(profile, pathway, answers, id)), "case_outcome",
    ...(Object.hasOwn(answers, "offense_category") && wy1502CategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)) ? ["offense_category"] : [])];
  if (southDakotaSisContext(profile, pathway)) return [...extra, ...SD_SIS_FACT_IDS.filter(id => includeInactive || southDakotaSisQuestionApplies(profile, pathway, answers, id)), "offense_level", "court_requirements_completed",
    ...(Object.hasOwn(answers, "offense_category") && sdSisCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)) ? ["offense_category"] : [])];
  if (illinoisProstitutionContext(profile, pathway)) return [...extra, IL_PROSTITUTION_FACT_ID, "court_requirements_completed", "case_outcome",
    ...(Object.hasOwn(answers, "offense_category") && ilProstitutionCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`)) ? ["offense_category"] : [])];
  if (georgiaSb288Context(profile, pathway)) return [...extra, ...GA_SB288_FACT_IDS.filter(id => includeInactive || georgiaSb288QuestionApplies(profile, pathway, answers, id)), "case_outcome"];
  if (state === "GA" && (pathway === GA_PARDON_ROUTE || georgiaPardonRequested(answers, pathway))) {
    return [...extra, ...GA_PARDON_FACT_IDS.filter(id => includeInactive || georgiaPardonQuestionApplies(state, answers, id, pathway)), "pending_cases", "case_outcome"];
  }
  if (state === "GA" && (pathway === GA_ORIGINAL_FIRST_OFFENDER_PATHWAY || pathway === null && Object.hasOwn(answers, "ga_original_first_offender"))) {
    return [...extra, ...GA_FIRST_OFFENDER_FACT_IDS.filter(id => includeInactive || georgiaFirstOffenderQuestionApplies(state, answers, id)),
      ...(answers.ga_original_first_offender === "yes" ? ["case_outcome"] : [])];
  }
  if (state === "IL" && (pathway === IL_CANNABIS_PATHWAY || pathway === null && Object.hasOwn(answers, "il_cannabis_next_step"))) {
    return [...extra, ...IL_CANNABIS_FACT_IDS.filter(id => includeInactive || illinoisCannabisQuestionApplies(state, answers, id)),
      ...(["status_check", "vacate_conviction"].includes(String(answers.il_cannabis_next_step)) ? ["case_outcome"] : [])];
  }
  return extra;
}

function routeFactualCorrectionIds(model: { stateCode: string; pathwayId: string | null; requiredInputIds?: string[]; screeningAnswers: Record<string, AnswerValue>; prefilledAnswers: Record<string, AnswerValue>; packetAnswers: Record<string, AnswerValue>; heldFactualCorrectionIds?: string[] }, includeInactive = false): string[] {
  if (isCaProp64Pathway(model.stateCode, model.pathwayId)) {
    const answers = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers };
    return [...(includeInactive ? CA_PROP64_FACT_IDS : caProp64ActiveFactIds(answers)),
      "offense_level", "case_outcome", "court", "charge", "ca_prop64_branch", "sentence_completion_date",
      ...(model.pathwayId === CA_PROP64_COMPLETED ? ["ca_prop64_relief_requested"] : []),
      ...(model.requiredInputIds?.length === 0 ? [...CA_PROP64_CAPTION_FACT_IDS, ...CA_CONTACT_IDS, CA_SAFE_AT_HOME_ID].filter(id => Object.hasOwn(answers, id)) : [CA_SAFE_AT_HOME_ID])];
  }
  const facts = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers };
  const factual = [...factualPathwayCorrectionIds(model.stateCode, model.pathwayId, facts, includeInactive), ...msExactTimingQuestionIds(model.stateCode, model.pathwayId, facts, includeInactive), ...(model.heldFactualCorrectionIds ?? [])];
  const profile = getProfileByJurisdiction(model.stateCode);
  const financial = model.pathwayId
    && !(model.stateCode === "OR" && Object.values(OR_DISPOSITION_CONFIGURATIONS).some(config => config.pathwayId === model.pathwayId))
    && (includeInactive || nebraskaNonconvictionQuestionApplies(model.stateCode, model.pathwayId, facts, "financial_obligations")
      && louisianaAutomationStatusQuestionApplies(model.stateCode, model.pathwayId, "financial_obligations")
      && maineNonconvictionQuestionApplies(model.stateCode, model.pathwayId, facts, "financial_obligations")
      && missouriClosedRecordQuestionApplies(model.stateCode, model.pathwayId, facts, "financial_obligations", profile ?? undefined)
      && missouriMarijuanaStatusQuestionApplies(model.stateCode, model.pathwayId, facts, "financial_obligations", profile ?? undefined)
      && (!profile || montanaRecordFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || newMexicoGuidanceFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || newJerseyMarijuanaStatusFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || texasGuidanceFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || westVirginiaGuidanceFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || southDakotaGuidanceFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || southCarolinaGuidanceFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || oklahomaCleanSlateFinancialApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || wy1501QuestionApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || wy1401QuestionApplies(profile, model.pathwayId, facts, "financial_obligations"))
      && (!profile || montanaDeferredLegacyFinancialApplies(profile, model.pathwayId, facts, "financial_obligations")))
    && isIndependentPaidFinancialFact(`${model.stateCode}:${model.pathwayId}`,
    profile?.questions.find(question => question.id === "financial_obligations")) ? ["financial_obligations"] : [];
  if (model.stateCode !== "NY" || model.pathwayId !== NY_16059_ROUTE) return [...financial, ...factual];
  const answers = toScreeningAnswers({ ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers });
  const eligibility = [...financial, ...NY_16059_FACT_IDS.filter(id => id !== "ny_16059_request"), "ny_16059_later_conviction_entered", "ny_16059_undisposed_arrest", "ny_16059_pending_charge", "ny_16059_sex_offender_registration"]
    .filter(id => includeInactive || ny16059QuestionApplies(answers, id)
      && (id !== "release_date" || answers.ny_16059_sentence_incarceration === "Yes")
      && (id !== "ny_16059_incarceration_periods" || answers.ny_16059_incarceration_history === "released"));
  // A truthful adverse eligibility answer can remove the packet plan. Saved
  // case details still belong to this owner and must remain correctable. This
  // exposes existing answers plus the source-specific prior-order facts needed
  // to resolve held history review. It never restores a plan or an approval.
  return [...eligibility, ...NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS.map(field => field.id),
    ...(["connected", "other_groups"].includes(String(answers.ny_16059_grouping)) || Object.hasOwn(facts, NY_TRANSACTION_ASSOCIATIONS_ID) ? [NY_TRANSACTION_ASSOCIATIONS_ID] : []), ...(model.requiredInputIds?.length === 0
    ? [...NY_PACKET_FACT_IDS, ...NY_CASE_FACT_IDS].filter(id => Object.hasOwn(facts, id) || NY_HISTORY_FACT_IDS.includes(id) || NY_FUTURE_FACT_IDS.includes(id)) : [])];
}

export function editablePacketInputIds(model: Pick<ProtectedPacketInformationModel, "stateCode" | "pathwayId" | "requiredInputIds" | "serverFacts" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "recordOwnQuestionIds" | "questions" | "heldFactualCorrectionIds" | "mdJuvenilePreparationFactIds" | "gaPardonPreparationFactIds" | "mtDeferredPreparationFactIds" | "mtDeferredPreparationActiveFactIds" | "caJuvenilePreparationFactIds" | "caJuvenilePreparationActiveFactIds" | "recordFactConfirmations">, includeInactive = false): Set<string> {
  if (model.caJuvenilePreparationFactIds) return new Set((includeInactive ? model.caJuvenilePreparationFactIds : model.caJuvenilePreparationActiveFactIds ?? []).filter(id => !(id in model.serverFacts)));
  if (model.mtDeferredPreparationFactIds) return new Set((includeInactive ? model.mtDeferredPreparationFactIds : model.mtDeferredPreparationActiveFactIds ?? []).filter(id => !(id in model.serverFacts)));
  if (model.mdJuvenilePreparationFactIds) return new Set(model.mdJuvenilePreparationFactIds.filter(id => !(id in model.serverFacts)));
  if (model.gaPardonPreparationFactIds) return new Set(model.gaPardonPreparationFactIds.filter(id => !(id in model.serverFacts)));
  const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId, requiredInputIds: model.requiredInputIds,
    serverFacts: model.serverFacts, screeningAnswers: model.screeningAnswers, prefilledAnswers: model.prefilledAnswers, savedAnswers: model.packetAnswers, recordOwnQuestionIds: model.recordOwnQuestionIds, recordFactConfirmations: model.recordFactConfirmations,
    unresolvedSavedFactIds: model.questions.filter(question => question.savedAnswerNeedsClarification).map(question => question.id) });
  const excluded = new Set(collection?.facts.filter((fact) => fact.source === "server_route_fact"
    || ["external_actor", "derived"].includes(fact.collection)
    || !includeInactive && fact.collection === "conditional" && fact.active === false).map((fact) => fact.factId) ?? []);
  const factualIds = [...factualPathwayCorrectionIds(model.stateCode, model.pathwayId, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, includeInactive), ...msExactTimingQuestionIds(model.stateCode, model.pathwayId, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, includeInactive)];
  const corrections = routeFactualCorrectionIds(model, includeInactive).filter(id => id !== "financial_obligations" && !factualIds.includes(id)
    || !(id in model.serverFacts) && !excluded.has(id) && model.questions.some(question => question.id === id));
  const orProfile = model.stateCode === "OR" ? getProfileByJurisdiction("OR") : null;
  const activeOrContact = orProfile && oregonContactContract(orProfile, model.pathwayId)
    ? new Set(oregonContactQuestions({ ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, includeInactive,
      [...oregonContactConflictingIds([model.screeningAnswers, model.prefilledAnswers, model.packetAnswers]),
        ...model.questions.filter(q => q.savedAnswerNeedsClarification).map(q => q.id)]).map(q => q.id)) : null;
  return new Set([...model.requiredInputIds.filter((id) => !(id in model.serverFacts) && !excluded.has(id)), ...corrections]
    .filter(id => !activeOrContact || !(OR_CONTACT_IDS as readonly string[]).includes(id) || activeOrContact.has(id)));
}

/** Reused completion answers leave intake, but retain their existing correction control. */
export function reviewEditablePacketInputIds(model: Parameters<typeof editablePacketInputIds>[0]
  & Pick<ProtectedPacketInformationModel, "builderQuestions" | "questions">): Set<string> {
  const reviewIds = new Set([...model.builderQuestions.map((question) => question.id), ...routeFactualCorrectionIds(model)]);
  const allowed = editablePacketInputIds(model);
  const questionIds = new Set(model.questions.map((question) => question.id));
  for (const contract of courtCompletionContractsFor(`${model.stateCode}:${model.pathwayId ?? ""}`)) {
    if (allowed.has(contract.targetFactId) && questionIds.has(contract.targetFactId)) reviewIds.add(contract.targetFactId);
  }
  return reviewIds;
}

/** Existing completion edits remain correctable when their saved answer holds the route. */
export function heldCourtCompletionInputIds(model: Parameters<typeof editablePacketInputIds>[0]
  & Pick<ProtectedPacketInformationModel, "questions" | "packetPlan">, resultCode: string | null): Set<string> {
  const ids = new Set<string>();
  if (!model.packetPlan || !["not_yet", "needs_more_info", "needs_review"].includes(resultCode ?? "")) return ids;
  const allowed = editablePacketInputIds(model);
  for (const contract of courtCompletionContractsFor(`${model.stateCode}:${model.pathwayId ?? ""}`)) {
    const id = contract.targetFactId;
    const question = model.questions.find((candidate) => candidate.id === id);
    if (!question || !allowed.has(id)) continue;
    // Incompatible saved values are intentionally absent from the display maps.
    // The protected question metadata retains the existing owner's correction
    // obligation without putting the malformed value back into a control.
    if (question.savedAnswerNeedsClarification === true && !Object.hasOwn(model.packetAnswers, id)) {
      ids.add(id);
      continue;
    }
    if (!Object.hasOwn(model.packetAnswers, id)) continue;
    const value = model.packetAnswers[id];
    const state = questionAnswerState(question, value);
    if (state === "uncertain" || isRecord(value) && value.unknown === true
      || state === "known_valid" && isNegative(answerTextRaw(value))) ids.add(id);
  }
  return ids;
}

/** Preserve the existing completion correction, and keep NY factual corrections
 * reachable after a saved edit puts the route into review or exclusion. */
export function isMaineNonconvictionGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("ME");
  return resultCode === "guidance_only" && model.stateCode === "ME"
    && model.pathwayId === ME_NONCONVICTION_ROUTE && Boolean(profile)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId))
    && maineNonconvictionCorrectionApplies(model.stateCode, model.pathwayId,
      { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers });
}

export function isNebraskaNonconvictionGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("NE");
  return resultCode === "guidance_only" && model.stateCode === "NE"
    && model.pathwayId === "automatic-nonconviction-sealing" && Boolean(profile)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId))
    && nebraskaAdultNonconvictionCorrectionApplies(model.stateCode, model.pathwayId,
      { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers });
}

/** Status guidance retains its original disposition correction, without granting
 * filing, verification, payment or automated-request authority. */
export function isMontanaDeferredGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("MT");
  return resultCode === "guidance_only" && model.stateCode === "MT" && Boolean(profile)
    && isMontanaDeferredContract(profile!, model.pathwayId)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId!));
}

export function isMissouriMarijuanaGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("MO");
  return resultCode === "guidance_only" && model.stateCode === "MO" && Boolean(profile)
    && isMissouriMarijuanaStatusContract(profile!, model.pathwayId)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId!));
}

export function isMissouriClosureGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("MO");
  return resultCode === "guidance_only" && model.stateCode === "MO"
    && model.pathwayId === MO_CLOSED_RECORD_ROUTE && Boolean(profile)
    && isMissouriClosureGuidanceWithoutIdentityForm(profile!, MO_CLOSED_RECORD_ROUTE)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId));
}

export function isLouisianaAutomationStatusGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile = getProfileByJurisdiction("LA");
  return resultCode === "guidance_only" && model.stateCode === "LA"
    && model.pathwayId === LA_AUTOMATION_STATUS_ROUTE && Boolean(profile)
    && canonicalEqual(model.packetPlan, packetPlanForPathway(profile!, model.pathwayId));
}

export function isTexasNondisclosureGuidanceCorrection(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): boolean {
  const profile=getProfileByJurisdiction("TX");
  return resultCode === "guidance_only" && model.stateCode === "TX" && model.pathwayId === TX_ND_ROUTES[0]
    && Boolean(profile && texasNondisclosureTimingContract(profile,model.pathwayId))
    && canonicalEqual(model.packetPlan,packetPlanForPathway(profile!,model.pathwayId));
}

export function heldPacketCorrectionInputIds(model: Parameters<typeof heldCourtCompletionInputIds>[0], resultCode: string | null): Set<string> {
  const ids = heldCourtCompletionInputIds(model, resultCode);
  // GA-16-M01616: the held SIS page still owns an earlier optional location correction.
  if (resultCode === "guidance_only"
    && sdSisCategoryIsHistory(getProfileByJurisdiction(model.stateCode), model.pathwayId,
      packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`))
    && model.questions.some(question => question.id === "residency_or_location" && question.required === false)
    && editablePacketInputIds(model).has("residency_or_location")) ids.add("residency_or_location");
  const mdCaptionQuestion = mdJuvenileCaptionQuestion(getProfileByJurisdiction(model.stateCode), model.pathwayId,
    packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`));
  if (resultCode === "not_covered_yet" && mdCaptionQuestion
    && model.questions.some(question => question.id === "county" && question.prompt === mdCaptionQuestion.prompt)
    && editablePacketInputIds(model).has("county")) {
    const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId,
      requiredInputIds: model.requiredInputIds, serverFacts: model.serverFacts,
      screeningAnswers: model.screeningAnswers, prefilledAnswers: model.prefilledAnswers, savedAnswers: model.packetAnswers });
    if (collection?.facts.find(fact => fact.factId === "county")?.sourcePurpose) ids.add("county");
  }
  if (["needs_review", "needs_more_info", "not_yet"].includes(resultCode ?? "")
    && ksMunicipalCategoryIsContext(getProfileByJurisdiction(model.stateCode), model.pathwayId,
      packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`))
    && model.questions.some(question => question.id === "offense_category")
    && editablePacketInputIds(model).has("offense_category")) {
    // Exact original municipal category context remains correctable while held.
    // No other held fact, route, eligibility or commercial authority is added.
    ids.add("offense_category");
  }

  if (["needs_review", "needs_more_info", "not_yet"].includes(resultCode ?? "")
    && msFirstOffenderSourceContract(getProfileByJurisdiction(model.stateCode), model.pathwayId, packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`))) {
    const allowed = editablePacketInputIds(model);
    for (const id of MS_FIRST_OFFENDER_COLLECTION_IDS) if (allowed.has(id) && model.questions.some(question => question.id === id)) ids.add(id);
  }
  if (resultCode === "guidance_only" && ohJuvenileSourceContract(getProfileByJurisdiction(model.stateCode), model.pathwayId, packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`))) {
    const allowed = editablePacketInputIds(model);
    for (const id of routeFactualCorrectionIds(model)) if (allowed.has(id) && model.questions.some(question => question.id === id)) ids.add(id);
  }
  if (mnTwoCountySourceContract(getProfileByJurisdiction(model.stateCode), model.pathwayId,
    packetSpecificationFor(`${model.stateCode}:${model.pathwayId}`))) {
    const allowed = editablePacketInputIds(model);
    for (const id of [MN_TARGET_ORIGIN_ID, "case_outcome", ...mnProtectedStageFactIds(getProfileByJurisdiction(model.stateCode), model.pathwayId!, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }), ...mnTwoCountyFactIds(model.pathwayId!)]) if (allowed.has(id) && model.questions.some(question => question.id === id)) ids.add(id);
  }
  if (mdPoliceContext(getProfileByJurisdiction(model.stateCode), model.pathwayId)
    && ["guidance_only", "needs_more_info", "needs_review"].includes(resultCode ?? "")) {
    const allowed = editablePacketInputIds(model);
    for (const id of routeFactualCorrectionIds(model)) if (allowed.has(id) && model.questions.some(q => q.id === id)) ids.add(id);
  }
  if (isTexasNondisclosureGuidanceCorrection(model,resultCode)) {
    const allowed=editablePacketInputIds(model);
    for(const id of routeFactualCorrectionIds(model)) if (id.startsWith("tx_nd_") && allowed.has(id)) ids.add(id);
  }
  if (resultCode === "guidance_only" && model.stateCode === "DE"
    && model.pathwayId !== null && delawareProtectedCorrectionContract(getProfileByJurisdiction("DE"), model.pathwayId)) {
    const allowed = editablePacketInputIds(model);
    for (const id of routeFactualCorrectionIds(model)) if (allowed.has(id) && model.questions.some(q => q.id === id)) ids.add(id);
  }
  if (isMissouriMarijuanaGuidanceCorrection(model, resultCode) || isMontanaDeferredGuidanceCorrection(model, resultCode)) {
    const allowed = editablePacketInputIds(model);
    for (const id of routeFactualCorrectionIds(model)) if (id !== "financial_obligations" && allowed.has(id) && model.questions.some(q => q.id === id)) ids.add(id);
  }
  if ((isLouisianaAutomationStatusGuidanceCorrection(model, resultCode) || isMissouriClosureGuidanceCorrection(model, resultCode))
    && editablePacketInputIds(model).has("case_outcome")
    && model.questions.some(question => question.id === "case_outcome")) ids.add("case_outcome");
  // Exact nonpayable adult nonconviction guidance retains its factual controls.
  // Acquittal's inactive financial answer remains excluded by collection policy;
  // dismissal's active payment answer stays independently correctable.
  if (isNebraskaNonconvictionGuidanceCorrection(model, resultCode) || isMaineNonconvictionGuidanceCorrection(model, resultCode)) {
    const allowed = editablePacketInputIds(model);
    for (const id of ["case_outcome", "age_at_offense", "financial_obligations"]) {
      if (allowed.has(id) && model.questions.some(question => question.id === id)) ids.add(id);
    }
  }
  if (virginiaRecordOriginApplies(model.stateCode, model.pathwayId)
    && ["guidance_only", "not_covered_yet"].includes(resultCode ?? "")
    && editablePacketInputIds(model).has(VA_RECORD_ORIGIN_ID)) {
    ids.add(VA_RECORD_ORIGIN_ID);
  }
  if (virginiaRecordContextApplies(model.stateCode, model.pathwayId, { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers })) {
    const allowed = editablePacketInputIds(model);
    for (const id of VA_RECORD_CONTEXT_IDS) if (allowed.has(id)) ids.add(id);
  }
  // These Arkansas guidance holds still own an explicit record-origin fact.
  // Keep that correction reachable without opening other guidance inputs or
  // changing the route's packet, verification or commercial authority.
  if (arkansasRecordOriginApplies(model.stateCode, model.pathwayId)
    && ["guidance_only", "not_covered_yet"].includes(resultCode ?? "")
    && editablePacketInputIds(model).has(AR_RECORD_ORIGIN_ID)) ids.add(AR_RECORD_ORIGIN_ID);
  if (["not_yet", "needs_more_info", "needs_review", "likely_not_eligible"].includes(resultCode ?? "")) {
    for (const id of routeFactualCorrectionIds(model)) {
      if ([VA_RECORD_ORIGIN_ID, ...VA_RECORD_CONTEXT_IDS].includes(id) && !model.questions.some(question => question.id === id)) continue;
      if (id === "financial_obligations") {
        const question = model.questions.find(candidate => candidate.id === id);
        const value = { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }[id];
        if (!question || id in model.serverFacts || !editablePacketInputIds(model).has(id)
          || !(question.savedAnswerNeedsClarification || questionAnswerState(question, value) === "uncertain"
            || isNegative(answerTextRaw(value))
            || resultCode === "needs_more_info" && questionAnswerState(question, value) === "unanswered"
              && (nebraskaMissingFinancialCorrectionPathway(model.stateCode, model.pathwayId,
                { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, ["financial_obligations"])
              || maineMissingFinancialCorrectionPathway(model.stateCode, model.pathwayId,
                { ...model.screeningAnswers, ...model.prefilledAnswers, ...model.packetAnswers }, ["financial_obligations"])))) continue;
      }
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Packet inputs a route carries forward instead of asking again.
 *
 * This used to be one hand-written Mississippi rule. It is now the collection
 * policy's own answer for every route: a fact the participant already gave in
 * screening is reused under the id the packet knows it by, and a fact that
 * follows deterministically from another is computed. The two Mississippi
 * carries this function used to perform are both still performed, by the
 * general rule rather than by a special case —
 *
 *   offense_category, which has no question of its own and is the
 *   classification of the offense the participant already chose as the charge
 *   level, and which carries nothing when that answer is unsure or absent;
 *
 *   sentence_completion_date, which the profile defines as a completion STATUS
 *   rather than a date, and which carries only from an explicit "yes" to
 *   everything the court ordered. "No", "not sure" and "not applicable" are
 *   about obligations this fact does not cover, so none of them carries and
 *   the builder asks the profile's own question.
 *
 * Nothing is invented anywhere: where the inputs do not determine the answer,
 * nothing carries and the fact stays a question.
 */
export function carriedForwardPacketAnswers(
  jurisdiction: string,
  pathwayId: string | null,
  screeningAnswers: Record<string, AnswerValue>,
  savedAnswers: Record<string, AnswerValue> = {},
  requiredInputIds?: string[],
  unresolvedSavedFactIds: readonly string[] = []
): Record<string, AnswerValue> {
  const serverFacts = canonicalServerFacts(jurisdiction, pathwayId);
  const required = requiredInputIds
    ?? packetRequiredInputIdsFor(jurisdiction, pathwayId);
  if (required.length === 0) return {};
  const resolution = packetCollectionFor({
    jurisdiction,
    pathwayId,
    requiredInputIds: required,
    serverFacts,
    screeningAnswers,
    savedAnswers,
    unresolvedSavedFactIds
  });
  if (!resolution) return {};
  // Server facts travel in their own map and are stripped from the prefilled
  // one anyway; carrying them here would only make two maps disagree.
  return Object.fromEntries(
    Object.entries(resolvedFactValues(resolution)).filter(([id]) => !(id in serverFacts))
  );
}

/**
 * The questions the builder actually renders, in section order.
 *
 * A question survives here only while its fact is still the participant's to
 * answer, and the order follows the participant sections rather than the order
 * the packet plan happens to list its inputs in. Questions the review surface
 * needs but the builder never asked — the route facts appended for
 * verification — are not required inputs and so are never included, which is
 * the behaviour they already had.
 *
 * Without a resolution this falls back to exactly what the builder rendered
 * before: every required input the server does not own.
 */
function builderQuestionsFor(
  questions: ProfileQuestion[],
  collection: PacketCollectionResolution | null,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>
): ProfileQuestion[] {
  const requiredOfParticipant = new Set(requiredInputIds.filter((id) => !(id in serverFacts)));
  if (!collection) return questions.filter((question) => requiredOfParticipant.has(question.id));

  const owed = new Set(prepayGateFactIds(collection));
  const optional = new Set(collection.facts.filter(fact => fact.optional === true
    && !(["wy1502_category_history", "sd_sis_category_history", "il_prostitution_category_history", "ma_me_category_history", "ma_additional_category_history", "ma_three_route_category_history", "la_three_route_category_history", "ky_three_route_category_history", "ia_three_route_category_history", "hi_three_route_category_history", "ar_bound_category_history", "al_three_route_category_history", "nv_program_category_history", "ct_petition_category_history", "ga_sb288_category_history", "ms_additional_category_history", "il_identity_category_history", "dc_innocence_category_history", "ct_information_category_history", "oh_juvenile_information_court_context", "oh_trafficking_court_history", "ak_courtview_record_type_history", "ak_pardon_record_type_history", "ak_juvenile_record_type_history", "ak_agency_sis_record_type_history", "al_four_route_record_type_history", "al_redeemer_category_history", "ar_nonconviction_record_type_history", "ar_felony_record_type_history", "ca_12034a_record_type_history", "ca_tool3_record_type_history", "ca_automatic_record_type_history", "ca_12034_specific_probation_facts", "wy_1401_inactive_fact_history", "wy_1501_inactive_fact_history", "ca_tool4_record_type_history", "co_petition_record_type_history", "dc_fl_petition_record_type_history", "dc_felony_record_type_history"].includes(fact.source) && fact.active === false)).map(fact => fact.factId));
  const order = new Map<string, number>();
  let position = 0;
  for (const section of collection.groupedParticipantSections) {
    for (const factId of section.factIds) order.set(factId, position++);
  }
  return questions
    .filter((question) => owed.has(question.id) || optional.has(question.id))
    .map(question => optional.has(question.id) ? { ...question, required: false } : question)
    .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
}

/** The participant sections, carrying only the facts the builder still asks. */
function builderSectionsFor(
  collection: PacketCollectionResolution | null,
  builderQuestions: ProfileQuestion[]
): PacketInformationSection[] {
  if (!collection) return [];
  const rendered = new Set(builderQuestions.map((question) => question.id));
  return collection.groupedParticipantSections
    .map((section) => ({
      id: section.id,
      heading: section.heading,
      description: section.description,
      translations: section.translations,
      questionIds: section.factIds.filter((factId) => rendered.has(factId)).sort((left, right) => {
        const priority = (id: string) => id === "mcic_identifier_delivery_method" ? -2 : id === "mcic_identifier_method_confirmation_source" ? -1 : 0;
        return priority(left) - priority(right);
      })
    }))
    .filter((section) => section.questionIds.length > 0);
}

function packetRequiredInputIdsFor(jurisdiction: string, pathwayId: string | null): string[] {
  if (!pathwayId) return [];
  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) return [];
  return packetPlanForPathway(profile, pathwayId)?.requiredInputIds ?? [];
}

/**
 * The facts the participant still owes on this route, which is what "missing"
 * has always meant. A fact leaves this set only by ceasing to be theirs to
 * answer — the server owns it, it follows deterministically from another
 * answer, another actor fills it later, or its own gate says it does not apply
 * to this matter — and each of those keeps a recorded disposition.
 *
 * Where the route cannot be resolved, every required input is owed, which is
 * exactly the behaviour this function had before the collection policy existed.
 */
function collectionGateInputIds(
  resolution: PacketCollectionResolution | null,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>
): string[] {
  if (!resolution) return requiredInputIds.filter((id) => !(id in serverFacts));
  return prepayGateFactIds(resolution);
}

/** Wording follows a valid ownership answer, never an uncertain wrapper or guessed consent. */
function knownParticipantOwner(questionById: ReadonlyMap<string, ProfileQuestion>, value: unknown): boolean {
  const question = questionById.get("ownership_scope");
  return Boolean(question && questionAnswerState(question, value) === "known_valid"
    && (value === true || answerTextRaw(value as AnswerValue).trim() === "Yes"));
}

/** A wording audience only; this does not grant consent, ownership, or access. */
function knownParticipantHelper(questionById: ReadonlyMap<string, ProfileQuestion>, value: unknown): boolean {
  const question = questionById.get("ownership_scope");
  return Boolean(question && questionAnswerState(question, value) === "known_valid"
    && answerTextRaw(value as AnswerValue).trim() === "I am helping someone complete their own check");
}

function protectedPacketQuestionSurface(
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null,
  screeningAnswers: Record<string, AnswerValue>,
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>,
  prefilledAnswers: Record<string, AnswerValue> = {},
  savedAnswers: Record<string, AnswerValue> = {},
  recordOwnQuestionIds: string[] = [],
  unresolvedSavedFactIds: readonly string[] = [],
  heldFactualCorrectionIds: string[] = [],
  recordFactConfirmations?: RecordFactConfirmations
) {
  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(projectPublicProfile(profile))) {
    if (!ndFirstOffenseFactApplies(profile, pathwayId, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers }, question.id)) continue;
    if (WY_1501_FACT_IDS.includes(question.id) && !wy1501QuestionApplies(profile,pathwayId,{...screeningAnswers,...prefilledAnswers,...savedAnswers},question.id)) continue;
    if (WY_1401_FACT_IDS.includes(question.id) && !wy1401QuestionApplies(profile,pathwayId,{...screeningAnswers,...prefilledAnswers,...savedAnswers},question.id)) continue;
    if (CA_12034_FACT_IDS.includes(question.id) && !ca12034QuestionApplies(profile,pathwayId,{...screeningAnswers,...prefilledAnswers,...savedAnswers},question.id)) continue;
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, profile.jurisdiction.code, pathwayId, requiredInputIds, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers }, unresolvedSavedFactIds);
  const juvenileCaptionQuestion = mdJuvenileCaptionQuestion(profile, pathwayId,
    packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`));
  if (juvenileCaptionQuestion) questionById.set("county", juvenileCaptionQuestion);
  let questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    const owner = knownParticipantOwner(questionById, screeningAnswers.ownership_scope);
    questions = questions.map((question) => question.id === "pending_cases"
      ? { ...question, prompt: owner ? "Do you currently have any pending criminal charges?" : "Does this person currently have any pending criminal charges?" }
      : question.id === "residency_or_location"
        ? { ...question, prompt: "What city do you currently live in?", helperText: "This is used for the petitioner city in the packet." }
        : question.id === "offense_category"
          ? { ...question, prompt: "How is the offense classified on the court record?", helperText: "Use the classification printed on the record; for this route it is carried forward from the charge level when they match." }
          : question);
    const courtCompletion = questionById.get("court_requirements_completed")
      ?? packetQuestion("court_requirements_completed", owner ? "Have you completed everything the court ordered in this case?" : "Has this person completed everything the court ordered in this case?", "yes_no_unsure");
    if (!questions.some((question) => question.id === courtCompletion.id)) {
      questions.push({ ...courtCompletion, required: true, contextOnly: false });
    }
    for (const id of ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket"]) {
      const known = questionById.get(id);
      if (known && !questions.some((question) => question.id === id)) {
        questions.push({ ...known, required: true, contextOnly: false });
      }
    }
  }
  const correctionIds = routeFactualCorrectionIds({ stateCode: profile.jurisdiction.code, pathwayId, requiredInputIds, screeningAnswers, prefilledAnswers, packetAnswers: savedAnswers, heldFactualCorrectionIds });
  for (const id of [...correctionIds, ...(mdPoliceContext(profile, pathwayId) && packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`) == null ? ["county", "court"] : [])]) {
    const question = questionById.get(id) ?? (id === "offense_category"
      && (ilProstitutionCategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))
        || sdSisCategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))
        || wy1502CategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)))
      ? fallbackPacketQuestion(id) : undefined);
    if (question && !questions.some(q => q.id === id)) questions.push({ ...question, required: false, contextOnly: false });
  }
  const mnOrigin = mnTargetOriginQuestion(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`));
  if (mnOrigin) {
    const index = questions.findIndex(question => question.id === MN_TARGET_ORIGIN_ID);
    if (index >= 0) questions[index] = mnOrigin; else questions.push(mnOrigin);
    questionById.set(MN_TARGET_ORIGIN_ID, mnOrigin);
  }
  // Which of these the builder actually asks, and in what grouping, is the
  // collection policy's decision. A fact leaves the builder only by ceasing to
  // be the participant's to answer, and a fact that could not be carried
  // forward is asked, so a matter can never be stuck as incomplete on a
  // question it never shows.
  const collection = packetCollectionFor({
    jurisdiction: profile.jurisdiction.code,
    pathwayId,
    requiredInputIds,
    serverFacts,
    screeningAnswers,
    prefilledAnswers,
    savedAnswers,
    recordOwnQuestionIds,
    unresolvedSavedFactIds,
    recordFactConfirmations
  });
  if (collection?.facts.some(fact => fact.factId === DC_LEGACY_LOCATION && fact.source === "dc_fixed_caption_location_context" && fact.optional)
    && !questions.some(question => question.id === DC_LEGACY_LOCATION)) questions.push(fallbackPacketQuestion(DC_LEGACY_LOCATION));
  questions = questions.map((question) => reviewedPacketQuestion(question, { state: profile.jurisdiction.code, pathwayId, participantOwnsRecord: knownParticipantOwner(questionById, screeningAnswers.ownership_scope), participantHelpingRecord: knownParticipantHelper(questionById, screeningAnswers.ownership_scope) }));
  questions = questions.map(question => ndFirstOffenseRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akCourtviewRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akPardonRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akJuvenileRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => akAgencyOrSisRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => alRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => arNonconvictionRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => ksMunicipalCategoryContextQuestion(question,
    ksMunicipalCategoryIsContext(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`) ?? null)
    && collection?.facts.some(fact => fact.factId === question.id && fact.source === "ks_municipal_literal_category_context" && fact.optional === true) === true));
  questions = questions.map(question => collection?.facts.some(fact => fact.factId === question.id && fact.source === "oh_juvenile_information_court_context")
    ? { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const } : question);
  questions = questions.map(question => collection?.facts.some(fact => fact.factId === question.id && ["wy1502_category_history", "sd_sis_category_history", "il_prostitution_category_history", "ma_me_category_history", "ma_additional_category_history", "ma_three_route_category_history", "la_three_route_category_history", "ky_three_route_category_history", "ia_three_route_category_history", "hi_three_route_category_history", "ar_bound_category_history", "al_three_route_category_history", "nv_program_category_history", "ct_petition_category_history", "ga_sb288_category_history", "ct_information_category_history", "dc_innocence_category_history", "il_identity_category_history", "ms_additional_category_history"].includes(fact.source))
    ? { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const } : question);
  questions = questions.map(question => ohTraffickingCourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mo610105CourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mo610122CourtContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => collection?.facts.some(fact => fact.factId === question.id && fact.source === "md_police_retained_context")
    || mdPoliceContext(profile, pathwayId) && packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`) == null && ["county", "court"].includes(question.id)
    ? { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const } : question);
  questions = questions.map(question => moXivCourtContextQuestion(question, collection?.facts.some(fact => fact.factId === "court" && fact.source === "mo_xiv_court_retained_context") === true));
  questions = questions.map(question => mn609a015LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mn299c11LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mn609a017LocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => mnCannabisLocationContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => {
    const fact = collection?.facts.find(fact => fact.factId === question.id);
    if (fact?.source === "mn_two_county_legacy_context" && fact.active === false) return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" as const };
    if (fact?.source === "mn_two_county_source_fact" && fact.active === false) return { ...question, required: false };
    return question;
  });
  questions = questions.map(question => arFelonyRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => ca12034RecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => ca12034aRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => caAutomaticRecordContextQuestion(question, profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`)));
  questions = questions.map(question => caTool3RecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "ca_tool3_record_type_history") === true));
  questions = questions.map(question => ctPetitionDateQuestion(question, ctPetitionContext(profile, pathwayId)));
  questions = questions.map(question => caTool4RecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "ca_tool4_record_type_history") === true));
  questions = questions.map(question => coPetitionRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "co_petition_record_type_history") === true));
  questions = questions.map(question => dcFelonyRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "dc_felony_record_type_history") === true));
  questions = questions.map(question => dcFlPetitionRecordHistoryQuestion(question, collection?.facts.some(fact => fact.factId === question.id && fact.source === "dc_fl_petition_record_type_history") === true));
  questions = questions.map(question => delawareProtectedExclusionQuestion(question, profile, pathwayId, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers }));
  for (const question of questions) questionById.set(question.id, question);
  if (alRedeemerClassificationContract(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))) {
    questions = questions.map(alRedeemerCategoryQuestion);
    for (const question of alRedeemerClassificationQuestions({ ...screeningAnswers, ...prefilledAnswers, ...savedAnswers })) {
      if (!questions.some(existing => existing.id === question.id)) questions.push(question);
    }
    for (const question of questions) questionById.set(question.id, question);
  }
  const builderQuestions = builderQuestionsFor(questions, collection, requiredInputIds, serverFacts);
  const builderSections = builderSectionsFor(collection, builderQuestions);
  if (wy1401Context(profile,pathwayId,{...screeningAnswers,...prefilledAnswers,...savedAnswers})) {
    const currentAnswers={...screeningAnswers,...prefilledAnswers,...savedAnswers};
    const ids=correctionIds.filter(id=>["case_outcome","possible_pathway_context"].includes(id)||WY_1401_FACT_IDS.includes(id));
    const unresolved=new Set(wy1401Facts(currentAnswers,new Date().toISOString().slice(0,10)).ids);
    for(const id of ids) {
      const descriptor=WY_1401_QUESTIONS.find(q=>q.id===id);
      const original=descriptor?toProfileQuestion(descriptor):questionById.get(id);
      if(!original)continue;
      const q={...original,...(WY_1401_FACT_IDS.includes(id)?{required:true}:{}),
        ...(unresolved.has(id)&&questionAnswerState(original,currentAnswers[id])==="known_valid"?{savedAnswerNeedsClarification:true as const}:{})};
      questionById.set(id,q);
      const i=questions.findIndex(q=>q.id===id);if(i>=0)questions[i]=q;else questions.push(q);
      const b=builderQuestions.findIndex(q=>q.id===id);if(b>=0)builderQuestions[b]=q;else builderQuestions.push(q);
    }
    for(const section of builderSections)section.questionIds=section.questionIds.filter(id=>!ids.includes(id));
    for(let i=builderSections.length-1;i>=0;i--)if(!builderSections[i].questionIds.length)builderSections.splice(i,1);
    builderSections.push({id:"wy_1401_incident_facts",heading:"Non-conviction incident facts",description:"Confirm the entire incident and the date for the 180-day period. A verified petition requires review; relief is not automatic.",translations:{es:{heading:"Hechos del incidente sin condena",description:"Confirme todo el incidente y la fecha para el plazo de 180 días. Una petición verificada requiere revisión; la reparación no es automática."}},questionIds:ids.filter(id=>questionById.has(id))});
  }
  if (ca12034Context(profile,pathwayId,{...screeningAnswers,...prefilledAnswers,...savedAnswers})) {
    const ids=correctionIds.filter(id=>["case_outcome","possible_pathway_context"].includes(id) || CA_12034_FACT_IDS.includes(id));
    const currentAnswers={...screeningAnswers,...prefilledAnswers,...savedAnswers};
    const unresolved=new Set(ca12034Facts(currentAnswers).ids);
    for (const id of ids) {
      const original=questionById.get(id);
      if(!original) continue;
      const q=CA_12034_FACT_IDS.includes(id) ? {...original,
        required: true,
        ...(unresolved.has(id) && questionAnswerState(original,currentAnswers[id]) === "known_valid" ? {savedAnswerNeedsClarification:true as const}: {})} : original;
      questionById.set(id,q);
      const index=questions.findIndex(x=>x.id===id);if(index>=0)questions[index]=q;else questions.push(q);
      const builderIndex=builderQuestions.findIndex(x=>x.id===id);if(builderIndex>=0)builderQuestions[builderIndex]=q;else builderQuestions.push(q);
    }
    for (const section of builderSections) section.questionIds=section.questionIds.filter(id=>!ids.includes(id));
    for (let i=builderSections.length-1;i>=0;i--) if(!builderSections[i].questionIds.length) builderSections.splice(i,1);
    builderSections.push({id:"ca_12034_probation_facts",heading:"Conviction and probation facts",
      description:"Confirm the actual facts and the basis you request. These answers do not decide every statutory exclusion or what the court will grant.",
      translations:{es:{heading:"Hechos de la condena y la libertad condicional",description:"Confirme los hechos reales y el fundamento que solicita. Estas respuestas no deciden todas las exclusiones legales ni lo que concederá el tribunal."}},questionIds:ids.filter(id=>questionById.has(id))});
  }

  if (ctCleanSlateContactContract(profile, pathwayId)) {
    const descriptors = ctCleanSlateContactQuestions({ ...screeningAnswers, ...prefilledAnswers, ...savedAnswers });
    for (const descriptor of descriptors) {
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    const legacy = questions.find(question => question.id === "contact_information");
    if (legacy) { legacy.required = false; legacy.contextOnly = true; legacy.prompt = "Earlier contact answer (history only)";
      legacy.translations = { es: { prompt: "Respuesta de contacto anterior (solo historial)" } }; }
    builderSections.push({ id: "ct_jdcr202_defendant_contact", heading: "Defendant contact details for JD-CR-202",
      description: "These details complete existing form fields; they do not decide eligibility. Earlier contact text is retained as history.",
      translations: { es: { heading: "Datos de contacto de la persona acusada para JD-CR-202", description: "Estos datos completan campos existentes del formulario; no determinan la elegibilidad. El texto de contacto anterior se conserva como historial." } },
      questionIds: descriptors.map(question => question.id) });
  }
  if (ksMunicipalContactContract(profile, pathwayId)) {
    const descriptors = ksMunicipalContactQuestions({ ...screeningAnswers, ...prefilledAnswers, ...savedAnswers });
    for (const descriptor of descriptors) {
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    const legacy = questions.find(question => question.id === "contact_information");
    if (legacy) { legacy.required = false; legacy.contextOnly = true; legacy.prompt = "Earlier contact answer (history only)";
      legacy.translations = { es: { prompt: "Respuesta de contacto anterior (solo historial)" } }; }
    builderSections.push({ id: "ks_municipal_petitioner_contact", heading: "Petitioner contact details for the municipal petition",
      description: "These details complete existing form fields; they do not decide eligibility. Earlier contact text is retained as history.",
      translations: { es: { heading: "Datos de contacto de la persona solicitante para la petición municipal", description: "Estos datos completan campos existentes del formulario; no determinan la elegibilidad. El texto de contacto anterior se conserva como historial." } },
      questionIds: descriptors.map(question => question.id) });
  }
  if (ndFirstOffenseFamilyContract(profile, pathwayId)) {
    const descriptors = ndFirstOffenseContactQuestions({ ...screeningAnswers, ...prefilledAnswers, ...savedAnswers });
    for (const descriptor of descriptors) {
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    for (const id of ["contact_information", "residency_or_location"]) {
      const legacy = questions.find(question => question.id === id);
      if (legacy) { legacy.required = false; legacy.contextOnly = true; legacy.prompt = id === "contact_information" ? "Earlier contact answer (history only)" : "Earlier location answer (history only)";
        legacy.translations = { es: { prompt: id === "contact_information" ? "Respuesta de contacto anterior (solo historial)" : "Respuesta de ubicación anterior (solo historial)" } }; }
    }
    // The source-owned contact section is their single navigation owner.
    // Generic collection may already include these optional fields in an
    // earlier section of the current protected question surface.
    const contactIds = new Set(descriptors.map(question => question.id));
    const retainedSections = builderSections.map(section => ({ ...section,
      questionIds: section.questionIds.filter(id => !contactIds.has(id))
    })).filter(section => section.questionIds.length > 0);
    builderSections.splice(0, builderSections.length, ...retainedSections);
    builderSections.push({ id: "nd_first_offense_participant_contact", heading: "Participant contact details for the first-offense possession motion",
      description: "These details complete existing form fields; they do not decide eligibility. Earlier contact text is retained as history.",
      translations: { es: { heading: "Datos de contacto para la moción por una primera infracción de posesión", description: "Estos datos completan campos existentes del formulario; no determinan la elegibilidad. El texto de contacto anterior se conserva como historial." } },
      questionIds: descriptors.map(question => question.id) });
  }
  if (oregonContactContract(profile, pathwayId)) {
    const descriptors = oregonContactQuestions({ ...screeningAnswers, ...prefilledAnswers, ...savedAnswers });
    for (const descriptor of descriptors) {
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    builderSections.push({ id: "or_disposition_contact_preparation", heading: "Optional contact details for Oregon forms",
      description: "Keep the court form and separate OSP request distinct. These answers do not decide eligibility or authorize a packet. Earlier contact and location answers remain unchanged.",
      translations: { es: { heading: "Datos de contacto opcionales para formularios de Oregon", description: "Mantenga separados el formulario judicial y la solicitud a OSP. Estas respuestas no determinan la elegibilidad ni autorizan un paquete. Las respuestas anteriores de contacto y ubicación se conservan sin cambios." } },
      questionIds: descriptors.map(question => question.id) });
  }
  const currentAk = akCourtviewContactQuestions(profile.jurisdiction.code, pathwayId, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers });
  if (currentAk.length) {
    for (const descriptor of currentAk) {
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    builderSections.push({ id: "ak_tf810_requester_contact", heading: "Contact details for a TF-810 request",
      description: "Only for a case still appearing on CourtView. These answers do not establish a legal ground or authorize filing. Email is optional and permits court-document delivery.",
      translations: { es: { heading: "Datos de contacto para una solicitud TF-810", description: "Solo para un caso que todavía aparece en CourtView. Estas respuestas no establecen un fundamento legal ni autorizan la presentación. El correo electrónico es opcional y permite el envío de documentos judiciales." } },
      questionIds: currentAk.map(question => question.id) });
  }
  const currentNy = ny16059CurrentDocumentQuestions(profile.jurisdiction.code, pathwayId, [...questionById.values()]);
  if (currentNy) {
    for (const supplied of currentNy.questions) {
      const descriptor = { ...supplied, required: supplied.id !== "email_address" };
      const index = questions.findIndex(question => question.id === descriptor.id);
      if (index >= 0) questions[index] = descriptor; else questions.push(descriptor);
      questionById.set(descriptor.id, descriptor);
      if (!builderQuestions.some(question => question.id === descriptor.id)) builderQuestions.push(descriptor);
    }
    builderSections.push({ id: "ny_current_applicant_details", heading: "Applicant details for the current court form",
      description: "These facts complete the application; they do not determine eligibility. Email is optional.",
      translations: { es: { heading: "Datos de la persona solicitante para el formulario judicial actual", description: "Estos datos completan la solicitud; no determinan la elegibilidad. El correo electrónico es opcional." } },
      questionIds: currentNy.questions.map(question => question.id) });
  }
  if (isNy16059Packet(profile.jurisdiction.code, pathwayId)) {
    const question = questionById.get(NY_TRANSACTION_ASSOCIATIONS_ID);
    if (question && !builderQuestions.some(q => q.id === question.id)) builderQuestions.push(question);
  }
  if (wy1501Context(profile, pathwayId, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers })) {
    // Keep conditional descriptors available to the existing atomic-save boundary.
    // Only active source facts enter the builder; historical values stay intact.
    for (const descriptor of WY_1501_QUESTIONS) {
      if (!questions.some(question => question.id === descriptor.id)) {
        const question = toProfileQuestion(descriptor);
        questions.push(question);
        questionById.set(question.id, question);
      }
    }
  }
  if (virginiaRecordContextApplies(profile.jurisdiction.code, pathwayId, { ...screeningAnswers, ...prefilledAnswers, ...savedAnswers })) {
    for (const question of VA_RECORD_CONTEXT_QUESTIONS) {
      questionById.set(question.id, question);
      questions.push(question);
      builderQuestions.push(question);
    }
    builderSections.push({ id: "va_optional_record_context", heading: "Optional Virginia record context",
      description: "The county or city and court level describe this record, not a future filing destination.",
      translations: { es: { heading: "Contexto opcional del expediente de Virginia", description: "El condado o la ciudad y el nivel del tribunal describen este expediente, no el lugar de una presentación futura." } },
      questionIds: VA_RECORD_CONTEXT_IDS });
  }
  return { questionById, questions, builderQuestions, builderSections, collection };
}

function protectedAuthoritySnapshotFor(
  verification: ProtectedPacketVerificationRecord
): ProtectedPacketAuthoritySnapshot | null {
  if (verification.status === "verified") {
    if (!verification.snapshot || !verification.hash
      || packetVerificationHash(verification.snapshot) !== verification.hash) return null;
    if (!verification.draftSnapshot || !verification.draftHash
      || protectedPacketDraftHash(verification.draftSnapshot) !== verification.draftHash
      || !protectedDraftMatchesFinal(verification.draftSnapshot, verification.snapshot)) return null;
    return verification.snapshot;
  }
  if (!verification.draftSnapshot || !verification.draftHash
    || protectedPacketDraftHash(verification.draftSnapshot) !== verification.draftHash) return null;
  return verification.draftSnapshot;
}

function protectedDraftMatchesFinal(
  draft: ProtectedPacketDraftSnapshot,
  finalSnapshot: PacketVerificationSnapshot
) {
  const draftFacts = Object.fromEntries(
    Object.entries(draft).filter(([key]) => key !== "capturedAt" && key !== "schemaVersion")
  );
  const finalFacts = Object.fromEntries(
    Object.entries(finalSnapshot).filter(([key]) => key !== "verifiedAt" && key !== "schemaVersion")
  );
  return canonicalEqual(draftFacts, finalFacts);
}

type LegacyAnswerSource = Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "profileVersion"
  | "profileSourceFingerprint" | "profileAuthorityFingerprint" | "requiredInputIds"
  | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">;

/** Current question contracts decide shape; the original protected maps remain the storage authority. */
function protectedLegacyAnswerProjection(snapshot: LegacyAnswerSource) {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  const questionById = new Map<string, ProfileQuestion>();
  if (profile) for (const question of allPublicQuestions(projectPublicProfile(profile))) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  installPacketSpecificationQuestions(questionById, snapshot.jurisdiction, snapshot.pathwayId, snapshot.requiredInputIds, { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers });
  for (const id of snapshot.requiredInputIds) if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  const serverFacts = canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId);
  // Ownership classification only. These normalized values are not evaluated
  // or displayed until incompatible shapes and shadowed values are removed.
  const collection = packetCollectionFor({ jurisdiction: snapshot.jurisdiction, pathwayId: snapshot.pathwayId,
    requiredInputIds: snapshot.requiredInputIds, serverFacts, screeningAnswers: answerRecord(snapshot.screeningAnswers),
    prefilledAnswers: answerRecord(snapshot.prefilledAnswers), savedAnswers: answerRecord(snapshot.packetAnswers) });
  const excluded = new Set(collection?.facts.filter(fact => fact.source === "server_route_fact"
    || fact.collection === "external_actor" || fact.source === "packet_specification_not_yet_state").map(fact => fact.factId) ?? []);
  // The full identifier owns this projection; its malformed last-four mirror
  // never becomes a second participant question.
  if (snapshot.requiredInputIds.includes("social_security_number")) excluded.add("social_security_number_last_four");
  const questions = [...questionById.values()].filter(question => !(question.id in serverFacts) && !excluded.has(question.id)
    // CA's stricter record contracts retain their existing recovery/history.
    && !(isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId) && CA_PROP64_RECORD_FACT_IDS.some(id => id === question.id))
    // This exact controlled editor can show the original malformed string[] for
    // explicit replacement. Its strict answer contract still refuses readiness;
    // factual history archives the entire original value on explicit save.
    && !(isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId) && CA_CONTACT_IDS.includes(question.id) && question.type === "filing_contact" && question.answerContract === CA_CONTACT_CONTRACT)
    && !(isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) && question.id === NY_FUTURE_ID && question.type === "future_applications" && question.answerContract === "ny_16059_future_applications_v1")
    && !(isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) && question.id === "ny_16059_prior_sealing_records" && question.type === "sealing_history" && question.answerContract === "ny_16059_sealing_history_v1")
    && !(isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) && question.id === "ny_16059_covered_case_records"
      && question.type === "court_case_records" && question.answerContract === "ny_16059_case_records_v2"));
  const inspection = inspectProtectedLegacyShapes(snapshot, snapshot, questions);
  const maps = { screeningAnswers: answerRecord(inspection.projected.screeningAnswers),
    prefilledAnswers: answerRecord(inspection.projected.prefilledAnswers), packetAnswers: answerRecord(inspection.projected.packetAnswers) };
  return { inspection, maps };
}

function participantMapArguments(maps: ParticipantFactMaps): [Record<string, AnswerValue>, Record<string, AnswerValue>, Record<string, AnswerValue>] {
  return [maps.screeningAnswers, maps.prefilledAnswers, maps.packetAnswers];
}

/** Reuse the protected answer interpretation when presenting a saved matter. */
export function protectedPacketScreeningAnswers(snapshot: ProtectedPacketAuthoritySnapshot) {
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (!profile || profile.profileVersion !== snapshot.profileVersion) return null;
  if ((isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId) || snapshot.jurisdiction === "MS" && snapshot.pathwayId === MS_MIP_ROUTE)
    && (!canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
      || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] }))) return null;
  const legacy = protectedLegacyAnswerProjection(snapshot);
  const projected = legacy.maps;
  const raw = { ...projected.screeningAnswers, ...projected.prefilledAnswers, ...projected.packetAnswers };
  // These source facts travel separately through the internal evaluator. They
  // are never public screening answers or promoted old category narratives.
  const answers = toScreeningAnswers(Object.fromEntries(Object.entries(raw)
    .filter(([id]) => snapshot.jurisdiction !== "MS" || snapshot.pathwayId !== MS_FIRST_OFFENDER_ROUTE
      || !(MS_FIRST_OFFENDER_IDS as readonly string[]).includes(id))));
  const savedSourceFacts = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  const sourceFacts = georgiaSb288Context(profile, snapshot.pathwayId) ? georgiaSb288Facts(savedSourceFacts)
    : ctPetitionContext(profile, snapshot.pathwayId) ? ctPetitionFacts(savedSourceFacts) : null;
  if (sourceFacts?.code === "missing") {
    const questions = projectPublicProfile(profile).questions;
    for (const id of sourceFacts.ids) {
      const question = questions.find(q => q.id === id);
      // Preserve the wire value in storage; a generic conversion cannot make an invalid source fact known.
      if (question && questionAnswerState(question, savedSourceFacts[id]) === "known_valid"
        && (question.type === "number_or_range" || question.type === "single_choice")) answers[id] = null;
    }
  }
  // A malformed saved payment answer is unresolved, not an absent optional
  // fact. Preserve its raw value and correction metadata, while preventing
  // omission from bypassing the existing financial-completion check.
  if (legacy.inspection.effectiveInvalidIds.includes("financial_obligations")) {
    answers.financial_obligations = "I am not sure";
  }
  if (isCaProp64Pathway(snapshot.jurisdiction, snapshot.pathwayId)) {
    const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
    for (const question of caProp64RecordQuestions(profile, profile.questions, snapshot.pathwayId)) {
      if (caProp64RecordAnswerState(question.id, raw[question.id]) !== "known_valid") {
        // Evaluation gets an explicit unresolved fact. The protected raw maps
        // stay unchanged and remain available for owner correction/history.
        answers[question.id] = "I am not sure";
      }
    }
  }
  if (nyProtectedTransactionInputIssues(snapshot).length) {
    // Only the evaluation projection becomes unresolved. Preserve all original
    // map copies and server-linked history for an explicit owner correction.
    answers[NY_TRANSACTION_ASSOCIATIONS_ID] = [];
  }
  return answers;
}

export function evaluateProtectedPacketFacts(snapshot: ProtectedPacketAuthoritySnapshot,
  evaluate: typeof evaluateAuthoritativeScreeningResult = evaluateAuthoritativeScreeningResult,
  matterId = `protected:${snapshot.pathwayId ?? "no-pathway"}`) {
  const answers = protectedPacketScreeningAnswers(snapshot);
  if (!answers) return null;
  const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  const hasMsFacts = MS_FIRST_OFFENDER_IDS.some(id => Object.hasOwn(raw, id));
  const msRoute = snapshot.jurisdiction === "MS" && snapshot.pathwayId === MS_FIRST_OFFENDER_ROUTE;
  const profile = getProfileByJurisdiction(snapshot.jurisdiction);
  if (hasMsFacts && !msRoute) return null;
  if (msRoute && (!profile || snapshot.profileSourceFingerprint !== profile.source?.sourceCorpusSha256
    || snapshot.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, snapshot.pathwayId)
    || !canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
    || !canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: snapshot.packetPlan?.mode ?? null, sourceFormIds: snapshot.packetPlan?.sourceFormIds ?? [] }))) return null;
  const msQuestions = new Map(msRoute ? msFirstOffenderSourceQuestions().map(question => [question.id, question]) : []);
  const msUnconfirmed = msRoute ? unresolvedRecordFactConfirmations(`${snapshot.jurisdiction}:${snapshot.pathwayId}`, raw, msQuestions, snapshot.dependencies.recordFactConfirmations) : [];
  // Only the evaluation projection loses an unconfirmed dependent fact. Raw
  // copies/history stay intact; an explicit fresh answer reconfirms it through
  // the existing input/value-hash machinery after an amended charge.
  const msRaw = { ...raw, ...Object.fromEntries(msUnconfirmed.map(id => [id, undefined])) };
  const msSource = msRoute && profile ? projectMsFirstOffenderSourceFacts(profile, snapshot.pathwayId, msRaw, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`)) : undefined;
  if (msRoute && !msSource) return null;
  try {
    return evaluate({
      jurisdiction: snapshot.jurisdiction,
      profileVersion: snapshot.profileVersion,
      matterId,
      answers
    }, msSource ?? undefined);
  } catch (error) {
    if (!(error instanceof InvalidAnswerError)) return null;
    for (const id of error.invalidQuestionIds) delete answers[id];
    try {
      return evaluate({
        jurisdiction: snapshot.jurisdiction,
        profileVersion: snapshot.profileVersion,
        matterId,
        answers
      }, msSource ?? undefined);
    } catch {
      return null;
    }
  }
}

function deriveProtectedPacketDraftSnapshot(
  verification: ProtectedPacketVerificationRecord,
  packetAnswers: Record<string, AnswerValue>,
  capturedAt: string,
  useContactComponents = false,
  confirmRecordFacts: string[] = [],
  explicitChangedIds: ReadonlySet<string> = new Set(),
  clearInactiveCustodyFacts = false,
  gaPardonPreparation = false,
  mtDeferredPreparation = false,
  caJuvenilePreparation = false,
  mdJuvenilePreparation = false
): ProtectedPacketDraftSnapshot | null {
  let base = protectedAuthoritySnapshotFor(verification);
  if (!base) return null;
  const currentAuthority = evaluateProtectedPacketFacts(base);
  if (!currentAuthority) return null;
  const originalBase = base;
  const mdJuvenileIds = mdJuvenilePreparation ? mdJuvenilePreparationModelFor(verification)?.mdJuvenilePreparationFactIds : undefined;
  if (mdJuvenilePreparation && !mdJuvenileIds) return null;
  const gaPreparationIds = gaPardonPreparation ? gaPardonPreparationModelFor(verification)?.gaPardonPreparationFactIds : undefined;
  if (gaPardonPreparation && !gaPreparationIds) return null;
  const mtPreparationIds = mtDeferredPreparation ? montanaDeferredPreparationModelFor(verification)?.mtDeferredPreparationFactIds : undefined;
  if (mtDeferredPreparation && !mtPreparationIds) return null;
  const caJuvenileIds = caJuvenilePreparation ? caProp64JuvenilePreparationModelFor(verification)?.caJuvenilePreparationFactIds : undefined;
  if (caJuvenilePreparation && !caJuvenileIds) return null;
  base = wyoming1502HeldDraftSuccessor(base, currentAuthority, verification.status) ?? illinoisProstitutionHeldDraftSuccessor(base, currentAuthority, verification.status) ?? ohioDiversionDraftSuccessor(base, currentAuthority) ?? mnTwoCountyDraftSuccessor(base, currentAuthority, verification.status) ?? marylandPoliceHeldDraftSuccessor(base, currentAuthority, verification.status) ?? wyoming1501DraftSuccessor(base,currentAuthority) ?? texasNondisclosureClockDraftSuccessor(base, currentAuthority) ?? texasGuidanceFinancialDraftSuccessor(base, currentAuthority) ?? westVirginiaGuidanceFinancialDraftSuccessor(base, currentAuthority) ?? southDakotaGuidanceFinancialDraftSuccessor(base, currentAuthority) ?? southCarolinaGuidanceFinancialDraftSuccessor(base, currentAuthority) ?? newJerseyMarijuanaStatusFinancialDraftSuccessor(base, currentAuthority) ?? wyoming1401DraftSuccessor(base,currentAuthority) ?? newMexicoGuidanceFinancialDraftSuccessor(base, currentAuthority) ?? montanaRecordFinancialDraftSuccessor(base, currentAuthority) ?? californiaProbationDraftSuccessor(base,currentAuthority) ?? oregonDispositionDraftSuccessor(base, currentAuthority) ?? montanaDeferredDraftSuccessor(base, currentAuthority) ?? missouriMarijuanaDraftSuccessor(base, currentAuthority) ?? missouriClosureDraftSuccessor(base, currentAuthority) ?? maineNonconvictionDraftSuccessor(base, currentAuthority) ?? louisianaAutomationStatusHeldSuccessor(base, currentAuthority) ?? nebraskaAcquittalHeldSuccessor(base, currentAuthority) ?? kansasRegistrationHeldSuccessor(base, currentAuthority) ?? base;
  base = legalAuthorityMetadataDraftSuccessor(base, currentAuthority, verification.status) ?? base;
  const factualIds = [...factualPathwayCorrectionIds(base.jurisdiction, base.pathwayId, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, true), ...msExactTimingQuestionIds(base.jurisdiction, base.pathwayId, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, true), ...oregonUnselectedCorrectionIds(base), ...missouriUnselectedCorrectionIds(base), ...maineUnselectedCorrectionIds(base), ...nebraskaUnselectedCorrectionIds(base), ...louisianaUnselectedCorrectionIds(base), ...ohioDiversionCorrectionIds(base, currentAuthority)];
  if (gaPreparationIds) factualIds.push(...gaPreparationIds);
  if (mtPreparationIds) factualIds.push(...mtPreparationIds);
  if (caJuvenileIds) factualIds.push(...caJuvenileIds);
  if (mdJuvenileIds) factualIds.push(...mdJuvenileIds);
  if (isNy16059Packet(base.jurisdiction, base.pathwayId)) factualIds.push(...NY_PACKET_FACT_IDS, ...NY_CASE_FACT_IDS,
    ...routeFactualCorrectionIds({ stateCode: base.jurisdiction, pathwayId: base.pathwayId,
      screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) }, true));
  if (!canonicalEqual(currentAuthority.evaluation.packetPlan ?? null, base.packetPlan)) {
    base = factualPathwayHeldSuccessor(base, currentAuthority) ?? convictionFallbackHeldSuccessor(base, currentAuthority) ?? reviewedPacketContractSuccessor(base, currentAuthority.evaluation.packetPlan);
    if (!base) return null;
  }
  if (factualIds.some(id => explicitChangedIds.has(id) || (mtPreparationIds || caJuvenileIds || mdJuvenileIds) && confirmRecordFacts.includes(id))) {
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    for (const factId of factualIds.filter(id => explicitChangedIds.has(id) || (mtPreparationIds || caJuvenileIds || mdJuvenileIds) && confirmRecordFacts.includes(id))) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!Object.hasOwn(originalBase[source], factId)) continue;
      const entry = { factId, value: originalBase[source][factId], source, meaning: "prior_factual_pathway_answer" as const,
        routeKey: `${originalBase.jurisdiction}:${originalBase.pathwayId}`, profileVersion: originalBase.profileVersion,
        profileSourceFingerprint: originalBase.profileSourceFingerprint, profileAuthorityFingerprint: originalBase.profileAuthorityFingerprint };
      if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
    }
    base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: history } };
  }
  if (base.jurisdiction === "MS" && base.pathwayId === MS_MIP_ROUTE && explicitChangedIds.has(MS_MIP_BOTH_DATE_ID)) {
    // An explicit successor entry can equal the old date, but it is a new
    // attestation. Keep every original OR copy both raw and in source history.
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!Object.hasOwn(originalBase[source], MS_MIP_LEGACY_DATE_ID)) continue;
      const entry = { factId: MS_MIP_LEGACY_DATE_ID, value: originalBase[source][MS_MIP_LEGACY_DATE_ID], source,
        meaning: "prior_factual_pathway_answer" as const, routeKey: `MS:${MS_MIP_ROUTE}`, profileVersion: originalBase.profileVersion,
        profileSourceFingerprint: originalBase.profileSourceFingerprint, profileAuthorityFingerprint: originalBase.profileAuthorityFingerprint };
      if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
    }
    base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: history } };
  }
  if (mtPreparationIds) {
    const changedAliases = Object.entries(MT_DEFERRED_PARTICIPANT_ALIASES).filter(([id]) => explicitChangedIds.has(id) || confirmRecordFacts.includes(id));
    if (changedAliases.length) {
      const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
      base = { ...base, screeningAnswers: { ...base.screeningAnswers }, prefilledAnswers: { ...base.prefilledAnswers }, packetAnswers: { ...base.packetAnswers } };
      packetAnswers = { ...packetAnswers };
      for (const [, alias] of changedAliases) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
        if (!Object.hasOwn(originalBase[source], alias)) continue;
        const entry = { factId: alias, value: originalBase[source][alias], source, meaning: "prior_factual_pathway_answer" as const,
          routeKey: `${originalBase.jurisdiction}:${originalBase.pathwayId}`, profileVersion: originalBase.profileVersion,
          profileSourceFingerprint: originalBase.profileSourceFingerprint, profileAuthorityFingerprint: originalBase.profileAuthorityFingerprint };
        if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
        delete base[source][alias];
        delete packetAnswers[alias];
        // The newly supplied owned fact remains the sole current value. The
        // original alias survives exactly in protected semantic history.
      }
      base.dependencies = { ...base.dependencies, semanticAnswerHistory: history };
    }
  }
  if (clearInactiveCustodyFacts) {
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    base = { ...base, screeningAnswers: { ...base.screeningAnswers }, prefilledAnswers: { ...base.prefilledAnswers }, packetAnswers: { ...base.packetAnswers } };
    packetAnswers = { ...packetAnswers };
    for (const factId of ["release_date", "ny_16059_incarceration_periods", NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID]) {
      for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
        if (!Object.prototype.hasOwnProperty.call(base[source], factId)) continue;
        const entry = { factId, value: base[source][factId], source, meaning: "ny_16059_custody_entered_in_error" as const,
          routeKey: `${base.jurisdiction}:${base.pathwayId}`, profileVersion: base.profileVersion,
          profileSourceFingerprint: base.profileSourceFingerprint, profileAuthorityFingerprint: base.profileAuthorityFingerprint };
        if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
        delete base[source][factId];
      }
      delete packetAnswers[factId];
    }
    base.dependencies = { ...base.dependencies, semanticAnswerHistory: history };
  }
  if (isCaProp64Pathway(base.jurisdiction, base.pathwayId)) {
    const before = { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers };
    const after = { ...base.screeningAnswers, ...base.prefilledAnswers, ...packetAnswers };
    if (["ca_prop64_branch", "ca_prop64_relief_requested", ...CA_PROP64_RECORD_FACT_IDS, "sentence_completion_date", ...CA_PROP64_FACT_IDS, ...CA_PROP64_CAPTION_FACT_IDS, ...CA_CONTACT_IDS, CA_SAFE_AT_HOME_ID].some((id) => !canonicalEqual(before[id], after[id]))) {
      base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: caProp64AnswerHistory(base, explicitChangedIds) } };
    }
  }
  if (isNy16059Packet(base.jurisdiction, base.pathwayId) && explicitChangedIds.has(NY_TRANSACTION_ASSOCIATIONS_ID)
    && base.dependencies.ny16059SeparateDeclaration) {
    base = { ...base, dependencies: { ...base.dependencies, ny16059SeparateDeclaration: {
      ...base.dependencies.ny16059SeparateDeclaration, supersededByAnswerSha256: contactRepresentationHash(packetAnswers[NY_TRANSACTION_ASSOCIATIONS_ID])
    } } };
  }
  if (mdJuvenileCaptionQuestion(getProfileByJurisdiction(base.jurisdiction), base.pathwayId,
    packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`))
    && (explicitChangedIds.has("county") || confirmRecordFacts.includes("county"))) {
    const history = [...(base.dependencies.semanticAnswerHistory ?? [])];
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!Object.hasOwn(originalBase[source], "county")) continue;
      const entry = { factId: "county", value: originalBase[source].county, source,
        meaning: "prior_factual_pathway_answer" as const, routeKey: MD_JUVENILE_CAPTION_ROUTE,
        profileVersion: originalBase.profileVersion, profileSourceFingerprint: originalBase.profileSourceFingerprint,
        profileAuthorityFingerprint: originalBase.profileAuthorityFingerprint };
      if (!history.some(old => canonicalEqual(old, entry))) history.push(entry);
    }
    base = { ...base, dependencies: { ...base.dependencies, semanticAnswerHistory: history } };
  }
  const legacy = protectedLegacyAnswerProjection(base);
  const replacedLegacyIds = new Set([...explicitChangedIds, ...(useContactComponents ? ["contact_information"] : [])]);
  const blockedLegacyFacts = new Set(legacy.inspection.effectiveInvalidIds.filter(id => !replacedLegacyIds.has(id)));
  const refreshed = refreshedProtectedPacketFactMaps(base, { ...legacy.maps, packetAnswers }, useContactComponents, blockedLegacyFacts);
  if (useContactComponents && !refreshed.adopted) return null;
  const answers = { ...refreshed.maps.screeningAnswers, ...refreshed.maps.prefilledAnswers, ...refreshed.maps.packetAnswers };
  const routeKey = `${base.jurisdiction}:${base.pathwayId}`;
  const own = new Set([...recordFactOwnQuestionIds(routeKey, answers, base.dependencies.recordFactConfirmations, [...blockedLegacyFacts]),
    ...recordFactOwnQuestionIds(routeKey, { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, base.dependencies.recordFactConfirmations, [...blockedLegacyFacts])]);
  const surface = protectedPacketQuestionSurface(getProfileByJurisdiction(base.jurisdiction)!, base.pathwayId,
    refreshed.maps.screeningAnswers, gaPreparationIds ?? base.requiredInputIds, answerRecord(base.serverFacts), refreshed.maps.prefilledAnswers, refreshed.maps.packetAnswers, [...own], [...blockedLegacyFacts], [], base.dependencies.recordFactConfirmations);
  for (const id of confirmRecordFacts) {
    if (!own.has(id)) continue;
    const marker = recordFactConfirmationFor(routeKey, id, answers, surface.questionById.get(id), [...blockedLegacyFacts]);
    const history = [...(base.dependencies.recordFactConfirmations?.[id]?.legacyValues ?? [])];
    for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!(id in base[source])) continue;
      const entry = { source, value: base[source][id], meaning: "unconfirmed_record_fact" as const, profileVersion: base.profileVersion, routeKey };
      if (!history.some((old) => canonicalEqual(old, entry))) history.push(entry);
    }
    refreshed.dependencies = { ...refreshed.dependencies, recordFactConfirmations: { ...refreshed.dependencies.recordFactConfirmations,
      [id]: { ...(marker ?? { version: 1, routeKey, status: "unconfirmed" }), ...(history.length ? { legacyValues: history } : {}) } } };
  }
  const candidate: ProtectedPacketAuthoritySnapshot = { ...base,
    ...preserveProtectedLegacyShapes(refreshed.maps, legacy.inspection, replacedLegacyIds), dependencies: refreshed.dependencies };
  const authoritative = evaluateProtectedPacketFacts(candidate);
  if (!authoritative) return null;
  const seeded = protectedPacketDraftSeedFromAuthoritative({
    authoritative,
    ...preserveProtectedLegacyShapes(refreshed.maps, legacy.inspection, replacedLegacyIds),
    dependencies: refreshed.dependencies,
    capturedAt
  })?.snapshot;
  if (!seeded) return null;
  const history = archiveExplicitLegacyShapeReplacements(seeded.dependencies.semanticAnswerHistory, legacy.inspection, replacedLegacyIds);
  const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);
  const preserveFinancialFacts = (!base.packetPlan || explicitChangedIds.has("financial_obligations"))
    && isIndependentPaidFinancialFact(`${base.jurisdiction}:${base.pathwayId}`,
    getProfileByJurisdiction(base.jurisdiction)?.questions.find(question => question.id === "financial_obligations"));
  // These administrative successors retire a payment prerequisite, not the
  // original screening provenance. A projected plan must not make an unrelated
  // material save normalize away the prior null-plan source maps.
  const preserveMontanaRecordFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !montanaRecordFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveNewMexicoGuidanceFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !newMexicoGuidanceFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveTexasClockFacts = texasNondisclosureTimingContract(currentAuthority.profile, base.pathwayId)
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile,base.pathwayId);
  const preserveTexasGuidanceFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !texasGuidanceFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveWestVirginiaGuidanceFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !westVirginiaGuidanceFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveSouthDakotaGuidanceFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !southDakotaGuidanceFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveSouthCarolinaGuidanceFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !southCarolinaGuidanceFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveNebraskaJuvenileRoutingFacts = base.jurisdiction === "NE"
    && base.pathwayId === "juvenile-automatic-sealing"
    && base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !nebraskaNonconvictionQuestionApplies("NE", base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserveNewJerseyStatusFacts = base.profileVersion === currentAuthority.profile.profileVersion
    && base.profileSourceFingerprint === currentAuthority.profile.source?.sourceCorpusSha256
    && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
    && !newJerseyMarijuanaStatusFinancialApplies(currentAuthority.profile, base.pathwayId,
      { ...base.screeningAnswers, ...base.prefilledAnswers, ...base.packetAnswers }, "financial_obligations");
  const preserved = isCaProp64Pathway(base.jurisdiction, base.pathwayId) || preserveFinancialFacts || preserveMontanaRecordFacts || preserveNewMexicoGuidanceFacts || preserveNewJerseyStatusFacts || preserveTexasClockFacts || preserveTexasGuidanceFacts || preserveWestVirginiaGuidanceFacts || preserveSouthDakotaGuidanceFacts || preserveSouthCarolinaGuidanceFacts || preserveNebraskaJuvenileRoutingFacts || factualIds.length > 0
    ? preserveUnchangedProtectedFacts(shapesPreserved, base, new Set([...explicitChangedIds, ...confirmRecordFacts]))
    : shapesPreserved;
  // These exact source-bound successors remove inherited collection dependencies,
  // not saved context. Never turn the old value into a form or agency fact.
  const retainedContextIds = vaPardonTypeContract(currentAuthority.profile, base.pathwayId,
    packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`)) ? [VA_PARDON_TYPE_ID, ...Object.keys(VA_PARDON_FACT_PURPOSES)]
    : base.pathwayId && isGeorgiaAgencyWithoutCounty(currentAuthority.profile, base.pathwayId) ? ["county"]
    : dcInnocenceLocationIsContext(currentAuthority.profile, base.pathwayId,
      packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`)) ? [DC_LEGACY_LOCATION] : [];
  for (const retainedContextId of retainedContextIds) {
    if (retainedContextId
      && base.profileVersion === currentAuthority.profile.profileVersion
      && base.profileSourceFingerprint === (currentAuthority.profile.source?.sourceCorpusSha256 ?? null)
      && base.profileAuthorityFingerprint === profileAuthorityFingerprint(currentAuthority.profile, base.pathwayId)
      && canonicalEqual(base.packetPlan, currentAuthority.evaluation.packetPlan ?? null)
      && !explicitChangedIds.has(retainedContextId) && !confirmRecordFacts.includes(retainedContextId)) {
      for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
        preserved[source] = { ...preserved[source] };
        delete preserved[source][retainedContextId];
        if (Object.hasOwn(base[source], retainedContextId)) preserved[source][retainedContextId] = base[source][retainedContextId];
      }
    }
  }
  return preserveNySeparateDeclaration(verification, { ...preserved, dependencies: history.length
    ? { ...preserved.dependencies, semanticAnswerHistory: history } : preserved.dependencies });
}

/** Reconcile a computable identifier projection without changing the protected source or its verification. */
function refreshedSensitiveFactMaps(state: string, pathwayId: string | null, requiredInputIds: string[], screening: Record<string, AnswerValue>, prefilled: Record<string, AnswerValue>, packet: Record<string, AnswerValue>) {
  const screeningAnswers = { ...screening }, prefilledAnswers = { ...prefilled }, packetAnswers = { ...packet };
  if (requiresMcicIdentifierAuthority(state, pathwayId) && requiredInputIds.includes("social_security_number")) {
    const lastFour = fullSsnLastFour({ ...screening, ...prefilled, ...packet }.social_security_number);
    delete screeningAnswers.social_security_number_last_four;
    delete prefilledAnswers.social_security_number_last_four;
    delete packetAnswers.social_security_number_last_four;
    if (lastFour) prefilledAnswers.social_security_number_last_four = lastFour;
  }
  return { screeningAnswers, prefilledAnswers, packetAnswers };
}

type ParticipantFactMaps = { screeningAnswers: Record<string, AnswerValue>; prefilledAnswers: Record<string, AnswerValue>; packetAnswers: Record<string, AnswerValue> };

/** The reviewed GA selector adds an identity to an already-held, source-valid
 * pardon draft. A read must not rewrite its raw answers or create verification.
 * This exception cannot select a sibling, repair conflicting facts, or open a plan.
 */
function georgiaPardonHeldTrackCompatible(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>) {
  return snapshot.jurisdiction === "GA" && snapshot.pathwayId === GA_PARDON_ROUTE
    && snapshot.selectedTrackId === null && authoritative.selectedTrackId === "ga-pardon-j7"
    && snapshot.resultCode === "needs_review" && snapshot.paymentAllowed === false
    && snapshot.packetPlan === null && canonicalEqual(snapshot.requiredInputIds, [])
    && canonicalEqual(snapshot.serverFacts, canonicalServerFacts(snapshot.jurisdiction, snapshot.pathwayId))
    && canonicalEqual(snapshot.packetFamilyIdentifiers, { mode: null, sourceFormIds: [] })
    && georgiaPardonPreparationFactIds(snapshot, {
      profile: authoritative.profile,
      profileAuthorityFingerprint: profileAuthorityFingerprint(authoritative.profile, snapshot.pathwayId),
      today: new Date().toISOString().slice(0, 10)
    }) !== null;
}

function protectedRouteAuthorityMatches(snapshot: ProtectedPacketAuthoritySnapshot, authoritative: NonNullable<ReturnType<typeof evaluateProtectedPacketFacts>>) {
  const evaluation = authoritative.evaluation;
  return (evaluation.pathwayId ?? null) === snapshot.pathwayId
    && evaluation.resultCode === snapshot.resultCode
    && evaluation.paymentAllowed === snapshot.paymentAllowed
    && (authoritative.packetType ?? null) === (snapshot.packetType ?? null)
    && ((authoritative.selectedTrackId ?? null) === snapshot.selectedTrackId || georgiaPardonHeldTrackCompatible(snapshot, authoritative))
    && (evaluation.treatmentClassification ?? null) === snapshot.treatmentClassification
    && canonicalEqual(evaluation.deferralComponentIds ?? [], snapshot.deferralComponentIds)
    && canonicalEqual(evaluation.packetPlan ?? null, snapshot.packetPlan);
}

/** Reviewed status implications run after authority exists, never in the route selector. */
function refreshedCourtCompletionFactMaps(base: ProtectedPacketAuthoritySnapshot, incoming: ParticipantFactMaps,
  dependencies: PacketVerificationSnapshot["dependencies"] = base.dependencies, blockedLegacyFacts: ReadonlySet<string> = new Set()) {
  const contracts = courtCompletionContractsFor(`${base.jurisdiction}:${base.pathwayId ?? ""}`);
  if (!contracts.length) return { maps: incoming, dependencies };
  const marked = contracts.some(contract => dependencies.courtCompletionImplications?.[contract.targetFactId]);
  if (!marked && (incoming.screeningAnswers.court_requirements_completed !== "yes"
    || contracts.every(contract => Object.values(incoming).some(map => Object.prototype.hasOwnProperty.call(map, contract.targetFactId))))) return { maps: incoming, dependencies };
  const profile = getProfileByJurisdiction(base.jurisdiction);
  if (!profile || profile.profileVersion !== base.profileVersion
    || base.profileSourceFingerprint !== (profile.source?.sourceCorpusSha256 ?? null)
    || base.profileAuthorityFingerprint !== profileAuthorityFingerprint(profile, base.pathwayId)) return { maps: incoming, dependencies };
  const pathway = profile.pathways.find(entry => entry.id === base.pathwayId);
  const plan = readPacketPlan(base.packetPlan);
  if (!pathway || !plan || plan.pathwayId !== base.pathwayId
    || !canonicalEqual(base.requiredInputIds, plan.requiredInputIds)) return { maps: incoming, dependencies };
  const source = projectPublicProfile(profile).questions.find(question => question.id === "court_requirements_completed");
  const specification = packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`);
  const scope = routeDecidingFactScope(profile, pathway);
  const surface = protectedPacketQuestionSurface(profile, base.pathwayId, incoming.screeningAnswers, base.requiredInputIds,
    answerRecord(base.serverFacts), incoming.prefilledAnswers, incoming.packetAnswers);
  const hash = contactRepresentationHash;
  const currentContractIds = new Set(contracts.filter(contract => {
    const target = surface.questionById.get(contract.targetFactId);
    const disposition = surface.collection?.facts.find(fact => fact.factId === contract.targetFactId);
    return source && target && !blockedLegacyFacts.has(target.id) && source.id === contract.sourceFactId && target.type === "yes_no_unsure"
      && base.requiredInputIds.includes(target.id) && disposition?.active !== false
      && disposition?.collection !== "external_actor" && disposition?.collection !== "unresolved"
      && !scope.unresolvedRules.some(rule => rule.factIds.includes(target.id))
      && base.profileVersion === contract.profileVersion && base.profileSourceFingerprint === contract.profileSourceFingerprint
      && base.profileAuthorityFingerprint === contract.profileAuthorityFingerprint
      && canonicalEqual(base.requiredInputIds, contract.requiredInputIds)
      && hash(source) === contract.sourceDescriptorSha256
      && [contract.targetDescriptorSha256, contract.assistedTargetDescriptorSha256].includes(hash(target))
      && hash(pathway) === contract.pathwayCanonicalSha256 && hash(base.packetPlan) === contract.expectedPlanCanonicalSha256
      && (specification?.specificationId ?? null) === contract.registeredSpecificationId
      && (specification ? hash(specification) : null) === contract.registeredSpecificationCanonicalSha256;
  }).map(contract => contract.contractId));
  const original = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const authority = evaluateProtectedPacketFacts(base);
  const authorityValue = (value: NonNullable<typeof authority>) => ({ evaluation: value.evaluation, packetType: value.packetType ?? null, selectedTrackId: value.selectedTrackId });
  const refreshed = refreshCourtCompletionImplications({ contracts, currentContractIds, original, incoming,
    provenance: dependencies.courtCompletionImplications,
    authorityUnchanged: maps => {
      if (!authority || !protectedRouteAuthorityMatches(base, authority)) return false;
      const next = evaluateProtectedPacketFacts({ ...base, ...maps });
      return next !== null && protectedRouteAuthorityMatches(base, next) && canonicalEqual(authorityValue(authority), authorityValue(next));
    } });
  if (!Object.keys(refreshed.provenance).length && !dependencies.courtCompletionImplications) return { maps: refreshed.maps, dependencies };
  return { maps: refreshed.maps, dependencies: { ...dependencies, courtCompletionImplications: refreshed.provenance } };
}

function refreshedProtectedPacketFactMaps(base: ProtectedPacketAuthoritySnapshot, incoming: ParticipantFactMaps, adoptContact = false,
  blockedLegacyFacts: ReadonlySet<string> = new Set(protectedLegacyAnswerProjection(base).inspection.effectiveInvalidIds)) {
  const existing = refreshedPacketFactMaps(base, incoming, adoptContact, blockedLegacyFacts);
  return { ...existing, ...refreshedCourtCompletionFactMaps(base, existing.maps, existing.dependencies, blockedLegacyFacts) };
}

/** Existing collection rules only; their route/materialization guards still decide whether each can run. */
const REFRESHABLE_PACKET_DERIVATIONS = ["court_type", "court_name", "filing_location", "age_at_offense", "offense_category", "charge_classification"];

type PacketDerivationSource = Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "profileVersion" | "requiredInputIds" | "dependencies" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">;

function refreshedPacketFactMaps(base: PacketDerivationSource, incoming: ParticipantFactMaps, adoptContact = false,
  blockedLegacyFacts: ReadonlySet<string> = new Set()) {
  const contact = blockedLegacyFacts.has("contact_information") && !adoptContact
    ? { maps: { screeningAnswers: { ...incoming.screeningAnswers }, prefilledAnswers: { ...incoming.prefilledAnswers }, packetAnswers: { ...incoming.packetAnswers } }, dependencies: base.dependencies, adopted: false }
    : refreshedContactFactMaps(base, incoming, adoptContact);
  const maps = contact.maps;
  let dependencies = contact.dependencies;
  const current = { ...maps.screeningAnswers, ...maps.prefilledAnswers, ...maps.packetAnswers };
  const priorMaps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const prior = { ...priorMaps.screeningAnswers, ...priorMaps.prefilledAnswers, ...priorMaps.packetAnswers };
  const withoutTarget = (answers: Record<string, AnswerValue>, target: string) => Object.fromEntries(Object.entries(answers).filter(([id]) => id !== target));
  const candidates = (source: ParticipantFactMaps, target: string) => packetCollectionFor({ jurisdiction: base.jurisdiction, pathwayId: base.pathwayId,
    requiredInputIds: base.requiredInputIds, serverFacts: canonicalServerFacts(base.jurisdiction, base.pathwayId),
    screeningAnswers: withoutTarget(source.screeningAnswers, target), prefilledAnswers: withoutTarget(source.prefilledAnswers, target), savedAnswers: withoutTarget(source.packetAnswers, target) });
  const routeKey = `${base.jurisdiction}:${base.pathwayId ?? ""}`;
  const vaConfirmations = vaPardonTypeConfirmationsAfterChange(routeKey, prior, current, dependencies.recordFactConfirmations);
  if (vaConfirmations !== dependencies.recordFactConfirmations) dependencies = { ...dependencies, recordFactConfirmations: vaConfirmations };
  const mnConfirmations = mnTargetOriginConfirmationsAfterChange(routeKey, prior, current, dependencies.recordFactConfirmations);
  if (mnConfirmations !== dependencies.recordFactConfirmations) dependencies = { ...dependencies, recordFactConfirmations: mnConfirmations };
  const mdConfirmations = mdJuvenileCaptionConfirmationsAfterChange(routeKey, prior, current, dependencies.recordFactConfirmations);
  if (mdConfirmations !== dependencies.recordFactConfirmations) dependencies = { ...dependencies, recordFactConfirmations: mdConfirmations };
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
  const own = recordFactOwnQuestionIds(routeKey, current, dependencies.recordFactConfirmations);
  for (const id of REFRESHABLE_PACKET_DERIVATIONS) {
    if (own.has(id) || blockedLegacyFacts.has(id)) continue;
    const nextCandidates = candidates(maps, id), priorCandidates = candidates(priorMaps, id);
    const fact = nextCandidates?.facts.find((entry) => entry.factId === id && entry.derivation);
    if (!fact?.derivation) continue;
    const output = nextCandidates?.derivedFacts[id], retained = current[id];
    const oldOutput = priorCandidates?.derivedFacts[id];
    const recorded = dependencies.packetDerivations?.[id];
    const proven = recorded?.version === 1 && recorded.routeKey === routeKey
      && canonicalEqual(recorded.inputFactIds, fact.derivation.inputFactIds) && /^[a-f0-9]{64}$/.test(recorded.inputSha256)
      && retained !== undefined && recorded.outputSha256 === hash(retained);
    const question = fallbackPacketQuestion(id);
    const exact = output !== undefined && sameKnownQuestionAnswer(question, retained, output);
    const previousExact = oldOutput !== undefined && canonicalEqual(retained, prior[id]) && sameKnownQuestionAnswer(question, retained, oldOutput);
    const absent = retained === undefined || retained === null || retained === "";
    if (!(absent || proven || previousExact) || exact && !proven) continue;
    const history = [...(recorded?.legacyValues ?? [])];
    if (previousExact && !proven && !exact && !absent) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
      if (!(id in maps[source])) continue;
      const entry = { source, value: maps[source][id], meaning: "exact_prior_derived_representation" as const, profileVersion: base.profileVersion, routeKey };
      if (!history.some((old) => canonicalEqual(old, entry))) history.push(entry);
    }
    for (const source of Object.values(maps)) delete source[id];
    if (output !== undefined) maps.prefilledAnswers[id] = output;
    // A missing output has explicit pending dependencies, not an invented value.
    dependencies = { ...dependencies, packetDerivations: { ...dependencies.packetDerivations, [id]: {
      version: 1, routeKey, inputFactIds: [...fact.derivation.inputFactIds],
      inputSha256: hash(fact.derivation.inputFactIds.map((sourceId) => current[sourceId] ?? null)), outputSha256: hash(output ?? null),
      ...(history.length ? { legacyValues: history } : {})
    } } };
  }
  return { ...contact, maps, dependencies };
}

/** Refresh only a proven representation; independent legacy text stays intact until informed adoption. */
function refreshedContactFactMaps(base: Pick<ProtectedPacketAuthoritySnapshot, "jurisdiction" | "pathwayId" | "requiredInputIds" | "dependencies" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers">, incoming: ParticipantFactMaps, adopt = false) {
  const maps = { screeningAnswers: { ...incoming.screeningAnswers }, prefilledAnswers: { ...incoming.prefilledAnswers }, packetAnswers: { ...incoming.packetAnswers } };
  let dependencies = base.dependencies;
  const profile = getProfileByJurisdiction(base.jurisdiction);
  const pathway = profile?.pathways.find((candidate) => candidate.id === base.pathwayId);
  if (!profile || !pathway) return { maps, dependencies, adopted: false };
  const scope = routeDecidingFactScope(profile, pathway);
  const contract = reviewedContactRepresentation({ profile, pathwayId: base.pathwayId, specification: packetSpecificationFor(`${base.jurisdiction}:${base.pathwayId}`) ?? null,
    requiredInputIds: base.requiredInputIds, decidingFactIds: new Set([...scope.factIds, ...routeSafetyGateFactIds(base.jurisdiction, base.pathwayId)]),
    unresolvedFactIds: new Set(scope.unresolvedRules.flatMap((rule) => rule.factIds)) });
  if (!contract) return { maps, dependencies, adopted: false };
  const merge = (source: ParticipantFactMaps) => ({ ...source.screeningAnswers, ...source.prefilledAnswers, ...source.packetAnswers });
  const all = merge(maps);
  const computed = (source: ParticipantFactMaps) => {
    const withoutAggregate = (answers: Record<string, AnswerValue>) => Object.fromEntries(Object.entries(answers).filter(([id]) => id !== "contact_information"));
    return packetCollectionFor({ jurisdiction: base.jurisdiction, pathwayId: base.pathwayId, requiredInputIds: base.requiredInputIds,
      serverFacts: canonicalServerFacts(base.jurisdiction, base.pathwayId), screeningAnswers: withoutAggregate(source.screeningAnswers),
      prefilledAnswers: withoutAggregate(source.prefilledAnswers), savedAnswers: withoutAggregate(source.packetAnswers) })?.derivedFacts.contact_information;
  };
  const output = computed(maps);
  const retained = all.contact_information;
  const priorMaps = { screeningAnswers: answerRecord(base.screeningAnswers), prefilledAnswers: answerRecord(base.prefilledAnswers), packetAnswers: answerRecord(base.packetAnswers) };
  const priorOutput = computed(priorMaps);
  const priorRetained = merge(priorMaps).contact_information;
  const absent = retained === undefined || retained === null || retained === "";
  const exact = output !== undefined && sameKnownQuestionAnswer(fallbackPacketQuestion("contact_information"), retained, output);
  // Exact prior component composition is a bounded legacy proof. A changed
  // independent aggregate, a marker alone, or a source timestamp is not proof.
  const previouslyExact = priorOutput !== undefined && canonicalEqual(retained, priorRetained)
    && sameKnownQuestionAnswer(fallbackPacketQuestion("contact_information"), priorRetained, priorOutput);
  const proven = isProvenContactOutput(contract, retained, dependencies.contactRepresentation);
  if (!(absent || exact || previouslyExact || proven || adopt && output !== undefined)) return { maps, dependencies, adopted: false };
  if (adopt && output === undefined) return { maps, dependencies, adopted: false };
  // Equal legacy representations are already usable. Reading or saving them
  // without a material source change must not rewrite raw values/verification.
  if (exact && !adopt && !proven) return { maps, dependencies, adopted: false };
  const priorProvenance = dependencies.contactRepresentation;
  const preserveLegacy = !absent && (adopt && !exact || previouslyExact && !proven && !exact);
  const history = [...(priorProvenance?.legacyAnswers ?? [])];
  if (preserveLegacy) for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
    const value = incoming[source].contact_information;
    if (value === undefined) continue;
    const entry = { value, source, meaning: adopt ? "independent_legacy_contact_information" as const : "exact_prior_component_composition" as const,
      profileVersion: profile.profileVersion, routeKey: contract.routeKey, valueSha256: contactRepresentationHash(value) };
    if (!history.some((prior) => canonicalEqual(prior, entry))) history.push(entry);
  }
  for (const answers of Object.values(maps)) delete answers.contact_information;
  if (output !== undefined || history.length) {
    if (output !== undefined) maps.prefilledAnswers.contact_information = output;
    const provenance = contactRepresentationProvenance(contract, all, output ?? null, priorProvenance);
    if (history.length) provenance.legacyAnswers = history;
    if (adopt && !absent && !exact) {
      provenance.replacedAnswerSha256 = contactRepresentationHash(retained);
    }
    dependencies = { ...dependencies, contactRepresentation: provenance };
  }
  return { maps, dependencies, adopted: adopt && output !== undefined };
}

export function protectedPacketDraftSeedFromAuthoritative(input: {
  authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers?: Record<string, AnswerValue>;
  packetAnswers?: Record<string, AnswerValue>;
  dependencies: PacketVerificationSnapshot["dependencies"];
  capturedAt: string;
}): { snapshot: ProtectedPacketDraftSnapshot; hash: string } | null {
  const { evaluation } = input.authoritative;
  const profile = getProfileByJurisdiction(evaluation.jurisdiction);
  if (!profile || profile.profileVersion !== evaluation.profileVersion) return null;
  const packetPlan = evaluation.packetPlan ?? null;
  // Archive ambiguous wire values before source precedence removes overlapping maps.
  const semantic = preserveAmbiguousMsAnswer({ jurisdiction: evaluation.jurisdiction, pathwayId: evaluation.pathwayId ?? null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [], profileVersion: evaluation.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null, profileAuthorityFingerprint: profileAuthorityFingerprint(profile, evaluation.pathwayId ?? null),
    screeningAnswers: input.screeningAnswers, prefilledAnswers: input.prefilledAnswers ?? {}, packetAnswers: input.packetAnswers ?? {}, dependencies: input.dependencies });
  const legacy = protectedLegacyAnswerProjection(semantic);
  const blockedLegacyFacts = new Set(legacy.inspection.effectiveInvalidIds);
  const sensitiveMaps = refreshedSensitiveFactMaps(evaluation.jurisdiction, evaluation.pathwayId ?? null, packetPlan?.requiredInputIds ?? [], ...participantMapArguments(legacy.maps));
  const contact = refreshedPacketFactMaps({ jurisdiction: evaluation.jurisdiction, pathwayId: evaluation.pathwayId ?? null, profileVersion: evaluation.profileVersion,
    requiredInputIds: packetPlan?.requiredInputIds ?? [], dependencies: semantic.dependencies, ...sensitiveMaps }, sensitiveMaps, false, blockedLegacyFacts);
  const { screeningAnswers: incomingScreening, prefilledAnswers: incomingPrefilled, packetAnswers: incomingPacketAnswers } = contact.maps;
  const factMaps = sourceDisjointFactMaps({
    screeningAnswers: incomingScreening,
    prefilledAnswers: {
      ...carriedForwardPacketAnswers(
        evaluation.jurisdiction,
        evaluation.pathwayId ?? null,
        incomingScreening,
        incomingPacketAnswers,
        packetPlan?.requiredInputIds,
        [...blockedLegacyFacts]
      ),
      ...incomingPrefilled
    },
    packetAnswers: incomingPacketAnswers,
    serverFacts: canonicalServerFacts(evaluation.jurisdiction, evaluation.pathwayId ?? null)
  });
  const snapshot = canonicalize({
    schemaVersion: "expungement-ai/protected-packet-draft/v1",
    capturedAt: input.capturedAt,
    jurisdiction: evaluation.jurisdiction,
    profileVersion: evaluation.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, evaluation.pathwayId ?? null),
    pathwayId: evaluation.pathwayId ?? null,
    resultCode: evaluation.resultCode,
    paymentAllowed: evaluation.paymentAllowed,
    packetType: input.authoritative.packetType ?? null,
    packetPlan: packetPlan ? { ...packetPlan } : null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: packetPlan?.mode ?? null,
      sourceFormIds: packetPlan?.sourceFormIds ?? []
    },
    selectedTrackId: input.authoritative.selectedTrackId,
    treatmentClassification: evaluation.treatmentClassification ?? null,
    deferralComponentIds: [...(evaluation.deferralComponentIds ?? [])].sort(),
    screeningAnswers: factMaps.screeningAnswers,
    packetAnswers: factMaps.packetAnswers,
    serverFacts: factMaps.serverFacts,
    prefilledAnswers: factMaps.prefilledAnswers,
    dependencies: canonicalize(contact.dependencies)
  }) as ProtectedPacketDraftSnapshot;
  const preservedSource = preserveAmbiguousMsAnswer(snapshot);
  const completion = refreshedCourtCompletionFactMaps(preservedSource, {
    screeningAnswers: answerRecord(preservedSource.screeningAnswers), prefilledAnswers: answerRecord(preservedSource.prefilledAnswers), packetAnswers: answerRecord(preservedSource.packetAnswers)
  }, preservedSource.dependencies, blockedLegacyFacts);
  const preserved = preserveProtectedLegacyShapes({ ...preservedSource, ...completion.maps, dependencies: completion.dependencies }, legacy.inspection, new Set());
  return { snapshot: preserved, hash: protectedPacketDraftHash(preserved) };
}

function protectedPacketDraftReviewSafety(draft: ProtectedPacketAuthoritySnapshot, verifiedAt: string) {
  const legacy = protectedLegacyAnswerProjection(draft);
  const originalMaps = legacy.maps;
  if (!canonicalEqual(refreshedProtectedPacketFactMaps(draft, originalMaps).maps, originalMaps)) return { safe: false, reason: "stale_packet_derivation" };
  const authoritative = evaluateProtectedPacketFacts(draft);
  if (!authoritative) return { safe: false, reason: "authoritative_reevaluation_failed" };
  const { evaluation } = authoritative;
  if ((evaluation.resultCode !== "packet_ready" && evaluation.resultCode !== "packet_ready_with_caution")
    || !evaluation.paymentAllowed
    || !evaluation.packetPlan) return { safe: false, reason: "authoritative_route_changed" };
  const answers = {
    ...originalMaps.screeningAnswers,
    ...originalMaps.prefilledAnswers,
    ...originalMaps.packetAnswers,
    ...answerRecord(draft.serverFacts)
  };
  if (draft.jurisdiction === "MS" && draft.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    const safety = mississippiNonConvictionPacketSafety(answers, verifiedAt);
    if (!safety.safe) return safety;
  }
  const publicProfile = projectPublicProfile(getProfileByJurisdiction(draft.jurisdiction)!);
  const questionById = new Map(allPublicQuestions(publicProfile).map((question) => [question.id, toProfileQuestion(question)]));
  installPacketSpecificationQuestions(questionById, draft.jurisdiction, draft.pathwayId, draft.requiredInputIds, answers, legacy.inspection.effectiveInvalidIds);
  for (const id of draft.requiredInputIds) if (!questionById.has(id)) questionById.set(id, fallbackPacketQuestion(id));
  const recordOwnQuestionIds = [...recordFactOwnQuestionIds(`${draft.jurisdiction}:${draft.pathwayId}`, answers, draft.dependencies.recordFactConfirmations, legacy.inspection.effectiveInvalidIds)];
  if (isNy16059Packet(draft.jurisdiction, draft.pathwayId) && nyCaseAssociationIssues(answers).length) return { safe: false, reason: "ny_case_association_required" };
  if (recordFactCourtConflict(`${draft.jurisdiction}:${draft.pathwayId}`, answers)) return { safe: false, reason: "court_record_conflict" };
  if (unresolvedRecordFactConfirmations(`${draft.jurisdiction}:${draft.pathwayId}`, answers, questionById, draft.dependencies.recordFactConfirmations, legacy.inspection.effectiveInvalidIds).length) return { safe: false, reason: "record_fact_clarification_required" };
  const collection = packetCollectionFor({
    jurisdiction: draft.jurisdiction,
    pathwayId: draft.pathwayId,
    requiredInputIds: draft.requiredInputIds,
    serverFacts: answerRecord(draft.serverFacts),
    screeningAnswers: originalMaps.screeningAnswers,
    prefilledAnswers: originalMaps.prefilledAnswers,
    savedAnswers: originalMaps.packetAnswers,
    recordOwnQuestionIds,
    unresolvedSavedFactIds: legacy.inspection.effectiveInvalidIds,
    recordFactConfirmations: draft.dependencies.recordFactConfirmations
  });
  if (collection?.pendingDerivations.length) {
    return { safe: false, reason: `pending_packet_derivation:${collection.pendingDerivations[0].factId}` };
  }
  if (collection?.contactReconciliation) return { safe: false, reason: "contact_reconciliation_required" };
  for (const id of draft.requiredInputIds) {
    if (id in draft.serverFacts) continue;
    const disposition = collection?.facts.find((fact) => fact.factId === id);
    if (disposition?.collection === "external_actor"
      || (disposition?.collection === "conditional" && disposition.active === false)) continue;
    const validation = validatePacketAnswer(questionById.get(id) ?? fallbackPacketQuestion(id), answers[id], disposition?.optional === true);
    if (!validation.safe) return validation;
  }
  return { safe: true, reason: "authoritative_route_confirmed" };
}

export function protectedPacketDraftHash(snapshot: ProtectedPacketDraftSnapshot) {
  return createHash("sha256").update(JSON.stringify(canonicalize(snapshot))).digest("hex");
}

export class CurrentPacketVerificationRequiredError extends Error {
  constructor(readonly reason: string) {
    super(`A current final verification is required: ${reason}`);
    this.name = "CurrentPacketVerificationRequiredError";
  }
}

function verifiedPacketRecordFromDraft(
  draft: ProtectedPacketDraftSnapshot,
  verifiedAt: string
): PacketVerificationRecord {
  const facts = Object.fromEntries(
    Object.entries(draft).filter(([key]) => key !== "capturedAt" && key !== "schemaVersion")
  ) as Omit<PacketVerificationSnapshot, "schemaVersion" | "verifiedAt">;
  const snapshot: PacketVerificationSnapshot = {
    ...facts,
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt
  };
  return {
    status: "verified",
    reason: "explicit_final_verification",
    snapshot,
    hash: packetVerificationHash(snapshot)
  };
}

function unverifiedOrInvalidatedPacketRecord(
  existing: unknown,
  now: string,
  reason: string
): PacketVerificationRecord {
  const prior = readVerificationRecord(existing);
  if (prior?.status === "verified" || prior?.status === "invalidated" || reason !== "facts_saved_after_verification") {
    return invalidatedPacketRecord(now, reason);
  }
  return { status: "unverified", reason: "final_verification_not_completed" };
}

function invalidatedPacketRecord(now: string, reason: string): PacketVerificationRecord {
  return {
    status: "invalidated",
    reason,
    invalidatedAt: now
  };
}

function packetInformationMetadata(packetInformation: Record<string, unknown>): Record<string, unknown> {
  return {
    stage: packetInformation.stage,
    requiredInputIds: packetInformation.requiredInputIds,
    serverFacts: packetInformation.serverFacts,
    prefilledAnswers: packetInformation.prefilledAnswers,
    missingInputIds: packetInformation.missingInputIds,
    updatedAt: packetInformation.updatedAt,
    reviewedAt: packetInformation.reviewedAt,
    reviewSafety: packetInformation.reviewSafety
  };
}

function answerRecordForIds(value: unknown, allowedIds: ReadonlySet<string>): Record<string, AnswerValue> {
  return Object.fromEntries(Object.entries(answerRecord(value)).filter(([id]) => allowedIds.has(id)));
}

function buildPacketVerificationSnapshot(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  verifiedAt: string
): PacketVerificationSnapshot | null {
  const authority = authoritativePacketContext(item, undefined, flow, verifiedAt);
  if (!authority.safe) return null;
  const { profile, evaluation, packetType, selectedTrackId } = authority.authoritative;
  const packetPlan = evaluation.packetPlan ?? null;
  const factDependencies = verificationFactDependencies(
    flow,
    canonicalServerFacts(profile.jurisdiction.code, evaluation.pathwayId ?? null)
  );
  return canonicalize({
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt,
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, packetPlan?.pathwayId ?? null),
    pathwayId: evaluation.pathwayId ?? null,
    resultCode: evaluation.resultCode,
    paymentAllowed: evaluation.paymentAllowed,
    packetType: packetType ?? null,
    packetPlan: packetPlan ? { ...packetPlan } : null,
    requiredInputIds: packetPlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: packetPlan?.mode ?? null,
      sourceFormIds: packetPlan?.sourceFormIds ?? []
    },
    selectedTrackId,
    treatmentClassification: item.treatmentClassification ?? null,
    deferralComponentIds: [...(item.deferralComponentIds ?? [])].sort(),
    ...factDependencies,
    dependencies: {
      commercialFlowVersion: typeof flow.version === "number" ? flow.version : null,
      entitlementSource: typeof flow.entitlementSource === "string" ? flow.entitlementSource : null,
      productId: typeof flow.productId === "string" ? flow.productId : null
    }
  }) as PacketVerificationSnapshot;
}

function packetVerificationHash(snapshot: PacketVerificationSnapshot) {
  // jsonb does not preserve JavaScript insertion order. Final verification must
  // survive a protected database round trip, just like the draft hash does.
  return createHash("sha256").update(JSON.stringify(canonicalize(snapshot))).digest("hex");
}

function profileAuthorityFingerprint(
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null
) {
  const selectedPathway = profile.pathways.find((pathway) => pathway.id === pathwayId) ?? null;
  const selectedPacketPathway = profile.packetGenerator.pathways.find((pathway) => pathway.pathwayId === pathwayId) ?? null;
  const applicableRules = profile.orderedDecisionRules.filter((rule) => {
    if (rule.when.backendPathwayId && rule.when.backendPathwayId !== pathwayId) return false;
    if (rule.candidatePathwayIds?.length && pathwayId && !rule.candidatePathwayIds.includes(pathwayId)) return false;
    return true;
  });
  const authority = canonicalize({
    schemaVersion: profile.schemaVersion,
    jurisdiction: profile.jurisdiction.code,
    flowStages: profile.flowStages,
    questionLifecycle: profile.questionLifecycle ?? null,
    questionMachineSurface: profile.questions.map((question) => ({
      id: question.id,
      stage: question.stage,
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly ?? false,
      lifecyclePhase: question.lifecyclePhase ?? null,
      options: question.options ?? null
    })),
    selectedPathway,
    applicableRules,
    waitingPeriodRules: profile.waitingPeriodRules ?? [],
    exclusionRules: profile.exclusionRules ?? [],
    packetGenerator: {
      architecture: profile.packetGenerator.architecture,
      legacyGeneratorAllowed: profile.packetGenerator.legacyGeneratorAllowed,
      genericLegalFallbackAllowed: profile.packetGenerator.genericLegalFallbackAllowed,
      requiredInputs: profile.packetGenerator.requiredInputs,
      selectedPathway: selectedPacketPathway
    }
  });
  return createHash("sha256").update(JSON.stringify(authority)).digest("hex");
}

function readVerificationRecord(value: unknown): PacketVerificationRecord | null {
  if (!isRecord(value)
    || (value.status !== "unverified" && value.status !== "verified" && value.status !== "invalidated")
    || typeof value.reason !== "string") return null;
  return value as PacketVerificationRecord;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function verificationFactDependencies(
  flow: CommercialFlow,
  serverFacts: Record<string, AnswerValue>
) {
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const packetInformation = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  return sourceDisjointFactMaps({
    screeningAnswers: screening.answers,
    prefilledAnswers: packetInformation.prefilledAnswers,
    packetAnswers: packetInformation.answers,
    serverFacts
  });
}

function sourceDisjointFactMaps(input: {
  screeningAnswers: unknown;
  prefilledAnswers: unknown;
  packetAnswers: unknown;
  serverFacts: unknown;
}) {
  const serverFacts = answerRecord(input.serverFacts);
  const serverIds = new Set(Object.keys(serverFacts));
  const packetAnswers = omitAnswerIds(answerRecord(input.packetAnswers), serverIds);
  const packetOrServerIds = new Set([...serverIds, ...Object.keys(packetAnswers)]);
  const prefilledAnswers = omitAnswerIds(answerRecord(input.prefilledAnswers), packetOrServerIds);
  const effectiveIds = new Set([...packetOrServerIds, ...Object.keys(prefilledAnswers)]);
  const screeningAnswers = omitAnswerIds(answerRecord(input.screeningAnswers), effectiveIds);
  return { screeningAnswers, prefilledAnswers, packetAnswers, serverFacts };
}

function omitAnswerIds(
  answers: Record<string, AnswerValue>,
  omittedIds: ReadonlySet<string>
): Record<string, AnswerValue> {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => !omittedIds.has(id)));
}

function verificationSummaryFor(
  flow: CommercialFlow,
  questionById: Map<string, ProfileQuestion>,
  serverFacts: Record<string, AnswerValue>
): PacketVerificationSummaryFact[] {
  const factDependencies = verificationFactDependencies(flow, serverFacts);
  const sources: PacketVerificationSummaryFact["source"][] = [
    "screeningAnswers",
    "prefilledAnswers",
    "packetAnswers",
    "serverFacts"
  ];
  return sources.flatMap((source) => Object.keys(factDependencies[source]).sort().map((id) => ({
    key: `${source}:${id}`,
    id,
    label: questionById.get(id)?.prompt ?? answerLabel(id),
    value: factDependencies[source][id],
    source,
    systemContext: source === "serverFacts" && (id === "jurisdiction" || id === "pathway_id")
  })));
}

const VERIFICATION_FACT_KEYS = new Set([
  "screeningAnswers",
  "prefilledAnswers",
  "packetAnswers",
  "serverFacts"
]);

function verificationContextFor(source: Record<string, unknown>): PacketVerificationContextFact[] {
  return Object.keys(source)
    .filter((key) => !VERIFICATION_FACT_KEYS.has(key))
    .sort()
    .map((key) => ({
      key,
      label: answerLabel(key),
      value: source[key],
      systemContext: true as const
    }));
}

function verificationContextSourceFor(
  item: ConsumerBriefcaseItem,
  flow: CommercialFlow,
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>,
  pathwayId: string | null
): Record<string, unknown> {
  const stored = readVerificationRecord(flow.verification);
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const authoritativePlan = pathwayId ? packetPlanForPathway(profile, pathwayId) : null;
  return canonicalize({
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt: stored?.status === "verified" && stored.snapshot?.verifiedAt
      ? stored.snapshot.verifiedAt
      : null,
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    profileSourceFingerprint: profile.source?.sourceCorpusSha256 ?? null,
    profileAuthorityFingerprint: profileAuthorityFingerprint(profile, pathwayId),
    pathwayId,
    resultCode: typeof screening.resultCode === "string" ? screening.resultCode : item.resultCode ?? null,
    paymentAllowed: typeof screening.paymentAllowed === "boolean" ? screening.paymentAllowed : item.paymentAllowed,
    packetType: typeof screening.packetType === "string" ? screening.packetType : item.packetType ?? null,
    packetPlan: authoritativePlan ? { ...authoritativePlan } : null,
    requiredInputIds: authoritativePlan?.requiredInputIds ?? [],
    packetFamilyIdentifiers: {
      mode: authoritativePlan?.mode ?? null,
      sourceFormIds: authoritativePlan?.sourceFormIds ?? []
    },
    selectedTrackId: item.selectedTrackId
      ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null),
    treatmentClassification: item.treatmentClassification ?? null,
    deferralComponentIds: [...(item.deferralComponentIds ?? [])].sort(),
    dependencies: {
      commercialFlowVersion: typeof flow.version === "number" ? flow.version : null,
      entitlementSource: typeof flow.entitlementSource === "string" ? flow.entitlementSource : null,
      productId: typeof flow.productId === "string" ? flow.productId : null
    }
  }) as Record<string, unknown>;
}

/**
 * Re-check packet-builder facts before payment. Screening owns the route; the
 * builder may complete it, but it may not quietly contradict it and continue
 * selling the old packet.
 */
export function packetInformationReviewSafety(
  item: ConsumerBriefcaseItem,
  answerOverride?: Record<string, AnswerValue>
): { safe: boolean; reason: string } {
  const result = authoritativePacketContext(item, answerOverride);
  return { safe: result.safe, reason: result.reason };
}

export function mississippiNonConvictionPacketSafety(
  answers: Record<string, AnswerValue>,
  verifiedAt = new Date().toISOString()
): { safe: true; reason: string } | { safe: false; reason: string } {
  // The same list the collection policy reads, so a fact this gate decides on
  // can never be classified as one the participant is not asked before
  // Checkout. The gate and its thresholds are unchanged.
  const requiredNeutralFacts = MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS;
  for (const [id, expected] of requiredNeutralFacts) {
    if (answerText(answers[id]) !== expected.toLowerCase()) {
      return { safe: false, reason: `route_changing_answer:${id}` };
    }
  }

  const dispositionWording = answerText(answers.disposition_record_wording);
  const ambiguous = /passed\s+to\s+(?:the\s+)?file|retired\s+to\s+(?:the\s+)?file|remand|non.?adjudication|diversion|intervention\s+court|drug\s+court/;
  const statutoryEnding = /dismiss|charges?\s+dropped|no\s+disposition|not\s+guilty|acquit|no.?bill|nolle|not\s+prosecuted/;
  if (!dispositionWording || ambiguous.test(dispositionWording) || !statutoryEnding.test(dispositionWording)) {
    return { safe: false, reason: "route_changing_answer:disposition_record_wording" };
  }
  const filing = mississippiParticipantDeliverySafety(
    answers, verifiedAt);
  return filing.safe
    ? { safe: true, reason: "route_safety_confirmed" }
    : { safe: false, reason: "participant_delivery_facts_require_verification" };
}

/** A supplied contradiction differs from an unanswered prerequisite. */
export function packetDraftStopReason(model: Pick<ProtectedPacketInformationModel, "stateCode" | "pathwayId" | "initialAnswers" | "questions">): string | null {
  if (model.stateCode !== "MS" || model.pathwayId !== "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") return null;
  const questions = new Map(model.questions.map((question) => [question.id, question]));
  for (const [id, expected] of MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS) {
    const question = questions.get(id);
    if (question && questionAnswerState(question, model.initialAnswers[id]) === "known_valid"
      && answerText(model.initialAnswers[id]) !== expected.toLowerCase()) return `route_changing_answer:${id}`;
  }
  const wording = model.initialAnswers.disposition_record_wording;
  if (answerIsKnown(wording)) {
    const probe = mississippiNonConvictionPacketSafety({
      ...model.initialAnswers,
      ...Object.fromEntries(MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS)
    });
    if (probe.reason === "route_changing_answer:disposition_record_wording") return probe.reason;
  }
  return null;
}

type AuthoritativePacketContext =
  | { safe: false; reason: string }
  | {
    safe: true;
    reason: string;
    authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  };

function authoritativePacketContext(
  item: ConsumerBriefcaseItem,
  answerOverride?: Record<string, AnswerValue>,
  flowOverride?: CommercialFlow,
  verifiedAt = new Date().toISOString()
): AuthoritativePacketContext {
  const model = packetInformationModelFor(item);
  const flow = flowOverride ?? readCommercialFlow(item.artifactRefs);
  const screening = isRecord(flow?.screening) ? flow.screening : {};
  const packetInformation = isRecord(flow?.packetInformation) ? flow.packetInformation : {};
  const currentProfile = getProfileByJurisdiction(item.state);
  if (!model || !flow || !currentProfile || typeof screening.profileVersion !== "string") {
    return { safe: false, reason: "authoritative_screening_context_missing" };
  }
  if (screening.profileVersion !== currentProfile.profileVersion) {
    return { safe: false, reason: "authoritative_profile_changed" };
  }

  const answers = {
    ...model.initialAnswers,
    ...answerRecord(packetInformation.answers),
    ...answerOverride
  };
  const collection = packetCollectionFor({ jurisdiction: model.stateCode, pathwayId: model.pathwayId,
    requiredInputIds: model.requiredInputIds, serverFacts: model.serverFacts,
    screeningAnswers: model.screeningAnswers, savedAnswers: answers });
  for (const question of model.questions) {
    const optional = collection?.facts.find(fact => fact.factId === question.id)?.optional === true;
    const validation = validatePacketAnswer(question, answers[question.id], optional);
    if (!validation.safe) return { safe: false, reason: validation.reason };
  }

  // These Mississippi facts are source-rule inputs. A contradictory answer
  // cannot remain attached to the ordinary non-conviction packet.
  if (model.stateCode === "MS" && model.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    const routeSafety = mississippiNonConvictionPacketSafety(answers, verifiedAt);
    if (!routeSafety.safe) return routeSafety;
  }

  const screeningAnswers = answerRecord(screening.answers);
  const evaluationAnswers = toScreeningAnswers({ ...screeningAnswers, ...answers });
  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: model.stateCode,
      profileVersion: currentProfile.profileVersion,
      matterId: item.id,
      answers: evaluationAnswers
    });
  } catch (error) {
    // Some packet-only form fields intentionally are not evaluator questions.
    // Remove only the ids the authoritative evaluator explicitly identifies;
    // all recognized route facts remain and are re-evaluated.
    if (!(error instanceof InvalidAnswerError)) return { safe: false, reason: "authoritative_reevaluation_failed" };
    for (const id of error.invalidQuestionIds) delete evaluationAnswers[id];
    try {
      authoritative = evaluateAuthoritativeScreeningResult({
        jurisdiction: model.stateCode,
        profileVersion: currentProfile.profileVersion,
        matterId: item.id,
        answers: evaluationAnswers
      });
    } catch {
      return { safe: false, reason: "authoritative_reevaluation_failed" };
    }
  }

  const { evaluation } = authoritative;
  const packetReady = evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution";
  if (!packetReady || !evaluation.paymentAllowed) {
    return { safe: false, reason: "authoritative_route_changed" };
  }
  const storedPlan = readPacketPlan(screening.packetPlan);
  const authoritativePlan = evaluation.packetPlan ?? null;
  if (typeof screening.pathwayId !== "string" || screening.pathwayId !== evaluation.pathwayId) {
    return { safe: false, reason: "stored_pathway_mismatch" };
  }
  const storedServerFacts = answerRecord(packetInformation.serverFacts);
  if (("jurisdiction" in storedServerFacts
      && answerTextRaw(storedServerFacts.jurisdiction) !== currentProfile.jurisdiction.code)
    || ("pathway_id" in storedServerFacts
      && answerTextRaw(storedServerFacts.pathway_id) !== (evaluation.pathwayId ?? ""))) {
    return { safe: false, reason: "stored_server_fact_mismatch" };
  }
  if (screening.resultCode !== evaluation.resultCode || item.resultCode !== evaluation.resultCode) {
    return { safe: false, reason: "stored_result_mismatch" };
  }
  const expectedMatterPaymentAllowed = flow.entitlementSource === "partner_sponsorship"
    ? false
    : evaluation.paymentAllowed;
  if (screening.paymentAllowed !== evaluation.paymentAllowed || item.paymentAllowed !== expectedMatterPaymentAllowed) {
    return { safe: false, reason: "stored_payment_authority_mismatch" };
  }
  if (screening.packetType !== (authoritative.packetType ?? null) || item.packetType !== authoritative.packetType) {
    return { safe: false, reason: "stored_packet_type_mismatch" };
  }
  if (!canonicalEqual(comparableStoredPacketPlan(storedPlan), comparableStoredPacketPlan(authoritativePlan))) {
    return { safe: false, reason: "stored_packet_plan_mismatch" };
  }
  if (!canonicalEqual(stringArray(packetInformation.requiredInputIds), authoritativePlan?.requiredInputIds ?? [])) {
    return { safe: false, reason: "stored_required_inputs_mismatch" };
  }
  const storedTrackId = item.selectedTrackId
    ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null);
  if (storedTrackId !== authoritative.selectedTrackId
    || (item.treatmentClassification ?? null) !== (evaluation.treatmentClassification ?? null)
    || !canonicalEqual(item.deferralComponentIds ?? [], evaluation.deferralComponentIds ?? [])) {
    return { safe: false, reason: "stored_treatment_mismatch" };
  }
  return { safe: true, reason: "authoritative_route_confirmed", authoritative };
}

function canonicalEqual(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function validatePacketAnswer(question: ProfileQuestion, value: AnswerValue | undefined, sourceOptional = false) {
  const state = questionAnswerState(question, value);
  if (sourceOptional && value !== undefined && value !== null && typeof value !== "string"
    && !(isRecord(value) && (value.unknown === true || value.unknown === false && typeof value.value === "string"))) {
    return { safe: false, reason: `invalid_packet_answer:${question.id}` };
  }
  return state === "known_valid" || sourceOptional && (state === "unanswered" || state === "uncertain") ? { safe: true, reason: "valid" }
    : { safe: false, reason: `invalid_packet_answer:${question.id}` };
}

function answerTextRaw(value: AnswerValue | undefined) {
  if (isRecord(value)) return String(value.value ?? "").trim();
  return String(value ?? "").trim();
}

function answerText(value: AnswerValue | undefined) {
  return answerTextRaw(value).toLowerCase();
}

export function answerLabel(id: string) {
  return FALLBACK_PACKET_QUESTIONS[id]?.prompt ?? id
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
}

function readCommercialFlow(refs: Record<string, unknown> | undefined): CommercialFlow | null {
  const value = refs?.commercialFlow;
  return isRecord(value) ? value as CommercialFlow : null;
}

function commercialFlowForItem(
  item: ConsumerBriefcaseItem,
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>
): CommercialFlow | null {
  const persisted = readCommercialFlow(item.artifactRefs);
  if (persisted) return persisted;
  if (item.resultCode !== "packet_ready" && item.resultCode !== "packet_ready_with_caution") return null;

  const pathway = profile.packetGenerator.pathways.find((candidate) => (
    candidate.pathwayLabel === item.pathwayLabel
    || `${profile.jurisdiction.code}:${candidate.pathwayLabel}` === item.pathwayLabel
  ));
  if (!pathway) return null;
  const packetPlan = packetPlanForPathway(profile, pathway.pathwayId);
  if (!packetPlan) return null;

  const serverFacts = canonicalServerFacts(profile.jurisdiction.code, pathway.pathwayId);
  return {
    screening: {
      profileVersion: profile.profileVersion,
      pathwayId: pathway.pathwayId,
      pathwayLabel: pathway.pathwayLabel,
      packetPlan,
      answers: {}
    },
    packetInformation: {
      stage: "not_started",
      requiredInputIds: packetPlan.requiredInputIds,
      serverFacts,
      prefilledAnswers: {},
      answers: {},
      missingInputIds: packetPlan.requiredInputIds.filter((id) => !(id in serverFacts)),
      updatedAt: null,
      reviewedAt: null
    }
  };
}

function canonicalServerFacts(jurisdiction: string, pathwayId: string | null): Record<string, AnswerValue> {
  return {
    jurisdiction,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
}

function readPacketPlan(value: unknown): PacketPlan | null {
  if (!isRecord(value)
    || typeof value.pathwayId !== "string"
    || typeof value.mode !== "string"
    || typeof value.formMappingStatus !== "string") return null;
  return {
    pathwayId: value.pathwayId,
    mode: value.mode as PacketPlan["mode"],
    formMappingStatus: value.formMappingStatus as PacketPlan["formMappingStatus"],
    sourceFormIds: stringArray(value.sourceFormIds),
    requiredInputIds: stringArray(value.requiredInputIds),
    sourceRuleRefs: stringArray(value.sourceRuleRefs),
    // The compiled plan always carries packetReadyWhen and the protected
    // snapshot stores the plan as evaluated. Dropping it here made the model's
    // plan differ from the stored verification context, so verificationSummary
    // returned null and the review page rendered "Final verification is not
    // available" for every matter. Read it back exactly when it is stored.
    ...(Array.isArray(value.packetReadyWhen) ? { packetReadyWhen: stringArray(value.packetReadyWhen) } : {})
  };
}

function comparableStoredPacketPlan(value: PacketPlan | null): PacketPlan | null {
  if (!value) return null;
  return {
    pathwayId: value.pathwayId,
    mode: value.mode,
    formMappingStatus: value.formMappingStatus,
    sourceFormIds: [...value.sourceFormIds],
    requiredInputIds: [...value.requiredInputIds],
    sourceRuleRefs: [...value.sourceRuleRefs]
  };
}

function allPublicQuestions(profile: ReturnType<typeof projectPublicProfile>) {
  const groups = profile.postPaymentPacketCompletion;
  return [
    ...profile.questions,
    ...(groups?.requiredPacketCompletionFields ?? []),
    ...(groups?.officialFormFields ?? []),
    ...(groups?.customPleadingFields ?? []),
    ...(groups?.externalDocumentChecklist ?? []),
    ...(groups?.filingReadinessFields ?? []),
    ...(groups?.serviceOrMailingFields ?? []),
    ...(groups?.narrativeFields ?? []),
    ...(groups?.optionalFields ?? [])
  ];
}

// Supplemental EN/ES optional-history copy; qualified review pending.
function caTool4RecordHistoryQuestion<T extends ProfileQuestion>(question: T, history: boolean): T {
  if (!history || question.id !== "record_type" || question.stage !== "packet_information"
    || question.type !== "single_choice" || question.prompt !== "What type of record is this?"
    || !canonicalEqual(question.options, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "These labels can overlap. Your earlier answer is optional history. It does not choose an arrest-sealing procedure, replace the final disposition, or show that any record has been sealed.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Estas categorías pueden coincidir. Su respuesta anterior es un historial opcional. No selecciona un procedimiento de sellado de arrestos, no sustituye la resolución final ni demuestra que se haya sellado algún expediente."
    } } };
}

// Supplemental EN/ES optional-history copy; qualified review pending.
function coPetitionRecordHistoryQuestion<T extends ProfileQuestion>(question: T, history: boolean): T {
  if (!history || question.id !== "record_type" || question.stage !== "packet_information"
    || question.type !== "single_choice" || question.prompt !== "What type of record is this?"
    || !canonicalEqual(question.options, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "These labels can overlap. Your earlier answer is optional history. It does not choose a sealing procedure, replace the final disposition, or show that any record has been sealed.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Estas categorías pueden coincidir. Su respuesta anterior es un historial opcional. No selecciona un procedimiento de sellado, no sustituye la resolución final ni demuestra que se haya sellado algún expediente."
    } } };
}

// Optional-history copy reused from CO; Spanish for lead review.
function dcFelonyRecordHistoryQuestion<T extends ProfileQuestion>(question: T, history: boolean): T {
  if (!history || question.id !== "record_type" || question.stage !== "packet_information"
    || question.type !== "single_choice" || question.prompt !== "What type of record is this?"
    || !canonicalEqual(question.options, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "These labels can overlap. Your earlier answer is optional history. It does not choose a sealing procedure, replace the final disposition, or show that any record has been sealed.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Estas categorías pueden coincidir. Su respuesta anterior es un historial opcional. No selecciona un procedimiento de sellado, no sustituye la resolución final ni demuestra que se haya sellado algún expediente."
    } } };
}

// Retained labels may overlap; this optional history does not classify the case.
function caTool3RecordHistoryQuestion<T extends ProfileQuestion>(question: T, history: boolean): T {
  if (!history || question.id !== "record_type" || question.stage !== "packet_information"
    || question.type !== "single_choice" || question.prompt !== "What type of record is this?"
    || !canonicalEqual(question.options, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "These labels can overlap. Your earlier answer is optional history. It does not determine whether this record can be sealed or replace its final disposition. This case still needs review.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Estas categorías pueden coincidir. Su respuesta anterior es un historial opcional. No determina si este expediente puede sellarse ni sustituye su resolución final. Este caso aún requiere revisión."
    } } };
}

// Spanish for lead review; optional retained history conveys no relief finding.
function dcFlPetitionRecordHistoryQuestion<T extends ProfileQuestion>(question: T, history: boolean): T {
  if (!history || question.id !== "record_type" || question.stage !== "packet_information"
    || question.type !== "single_choice" || question.prompt !== "What type of record is this?"
    || !canonicalEqual(question.options, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "These labels can overlap. Your earlier answer is optional history. It does not establish the final disposition, choose a procedure, or show that a record has been cleared.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Estas categorías pueden coincidir. Su respuesta anterior es un historial opcional. No establece la resolución final, no selecciona un procedimiento ni demuestra que algún expediente haya quedado sellado, restringido o eliminado."
    } } };
}


function toProfileQuestion(question: PublicQuestion): ProfileQuestion {
  return {
    id: question.id,
    stage: question.stage,
    prompt: question.prompt,
    helperText: question.helperText,
    ...((question.id === "wy1502_citations" || question.id === "ga_sb288_final_citations" || CT_PETITION_MULTILINE_IDS.includes(question.id)) && question.multiline ? { multiline: true } : {}),
    type: question.id === "date_of_birth" && ["text", "text_or_unknown"].includes(question.type)
      ? question.type === "text_or_unknown" ? "date_or_unknown" : "date" : question.type,
    required: question.required,
    contextOnly: question.contextOnly === true,
    lifecyclePhase: question.lifecyclePhase,
    answerContract: question.answerContract,
    contactContext: question.contactContext,
    ...normalizeQuestionChoices(question.options, question.optionDisplay),
    exclusiveOptions: question.exclusiveOptions,
    translations: question.translations
  };
}

const FALLBACK_PACKET_QUESTIONS: Record<string, ProfileQuestion> = {
  date_of_birth: packetQuestion("date_of_birth", "Date of birth", "date_or_unknown", "Enter the wording from your court or agency record when possible."),
  participant_full_legal_name: packetQuestion("participant_full_legal_name", "What is your full legal name?", "text"),
  contact_information: packetQuestion("contact_information", "What contact information should appear with this matter?", "text", "Include the mailing address, phone number, or email the court form requests."),
  county: packetQuestion("county", "Which county handled this matter?", "text_or_unknown"),
  court: packetQuestion("court", "Which court handled this matter?", "text_or_unknown"),
  charge: packetQuestion("charge", "What charge or offense appears on the court record?", "text_or_unknown"),
  criminal_history: packetQuestion("criminal_history", "What does your criminal-history record show for this matter?", "text_or_unknown", "Use the record wording when you can. You can say that you need help finding it."),
  offense_category: packetQuestion("offense_category", "What category does the court record use for this offense?", "text_or_unknown"),
  record_type: packetQuestion("record_type", "What type of record is this?", "single_choice", undefined, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"]),
  residency_or_location: packetQuestion("residency_or_location", "What city or location belongs with this matter?", "text_or_unknown"),
  age_at_offense: packetQuestion("age_at_offense", "How old were you when this happened?", "number_or_range"),
  pardon_status: packetQuestion("pardon_status", "Have you received a pardon or similar official relief for this matter?", "yes_no_unsure"),
  trafficking_status: packetQuestion("trafficking_status", "Was this matter connected to force, fraud, coercion, or human trafficking?", "yes_no_prefer_not_to_say"),
  disposition_date: packetQuestion("disposition_date", "What date did the case end or get resolved?", "date_or_unknown", "Use the date shown on the dismissal, disposition, or court docket."),
  prior_relief: packetQuestion("prior_relief", "Have you previously received expungement, sealing, or similar relief for another record?", "yes_no_unsure")
};

function fallbackPacketQuestion(id: string): ProfileQuestion {
  return FALLBACK_PACKET_QUESTIONS[id]
    ?? packetQuestion(id, answerLabel(id), "text_or_unknown", "Enter the wording from your court or agency record when possible.");
}

function installPacketSpecificationQuestions(
  questions: Map<string, ProfileQuestion>,
  jurisdiction: string,
  pathwayId: string | null,
  requiredInputIds: string[],
  answers: Readonly<Record<string, unknown>> = {},
  unresolvedSavedFactIds: readonly string[] = []
) {
  const routeKey = `${jurisdiction}:${pathwayId ?? ""}`;
  const vaPardonQuestion = vaPardonTypeQuestion(getProfileByJurisdiction(jurisdiction), pathwayId, packetSpecificationFor(routeKey), answers, unresolvedSavedFactIds);
  if (vaPardonQuestion) questions.set(vaPardonQuestion.id, vaPardonQuestion);
  if (msFirstOffenderSourceContract(getProfileByJurisdiction(jurisdiction), pathwayId, packetSpecificationFor(routeKey))) {
    for (const question of msFirstOffenderSourceQuestions()) questions.set(question.id, question);
  }
  if (ohJuvenileSourceContract(getProfileByJurisdiction(jurisdiction), pathwayId, packetSpecificationFor(routeKey))) {
    for (const question of OH_JUVENILE_STAGE_QUESTIONS) questions.set(question.id, question);
  }
  if (mnTwoCountySourceContract(getProfileByJurisdiction(jurisdiction), pathwayId, packetSpecificationFor(routeKey))) {
    for (const question of [...mnTwoCountyQuestions(pathwayId!), ...mnProtectedStageQuestions(getProfileByJurisdiction(jurisdiction), pathwayId!, answers)]) questions.set(question.id, question);
  }
  for (const factId of requiredInputIds) {
    const fact = packetSpecificationFactFor(routeKey, factId);
    if (!fact?.prompt) continue;
    const question = packetQuestionFromSpecification(fact);
    if (factId === "social_security_number_last_four" && requiresMcicIdentifierAuthority(jurisdiction, pathwayId)) {
      question.prompt = "Last four digits calculated from the protected Social Security number";
      question.helperText = "These digits are calculated from the full number for masked identification. To correct them, edit the protected Social Security number after confirming the court-approved delivery method. Do not enter a second value.";
      question.translations = { es: { prompt: "Últimos cuatro dígitos calculados a partir del número de Seguro Social protegido", helperText: "Estos dígitos se calculan a partir del número completo para mostrar una identificación parcial. Para corregirlos, edite el número de Seguro Social protegido después de confirmar el método de entrega aprobado por el tribunal. No ingrese un segundo valor." } };
    }
    questions.set(factId, question);
  }
  if (isNy16059Packet(jurisdiction, pathwayId)
    && (["connected", "other_groups"].includes(String(answers.ny_16059_grouping)) || Object.hasOwn(answers, NY_TRANSACTION_ASSOCIATIONS_ID))) {
    const question = nyTransactionAssociationsQuestion(answers.ny_16059_covered_case_records);
    questions.set(question.id, question);
  }
  const alProfile = jurisdiction === "AL" ? getProfileByJurisdiction("AL") : null;
  if (alRedeemerClassificationContract(alProfile ?? undefined, pathwayId, packetSpecificationFor(routeKey))) {
    for (const question of alRedeemerClassificationQuestions(answers, true)) questions.set(question.id, question);
  }
  const ctProfile = jurisdiction === "CT" ? getProfileByJurisdiction("CT") : null;
  if (ctProfile && ctCleanSlateContactContract(ctProfile, pathwayId)) for (const question of ctCleanSlateContactQuestions(answers)) questions.set(question.id, question);
  const orProfile = jurisdiction === "OR" ? getProfileByJurisdiction("OR") : null;
  if (orProfile && oregonContactContract(orProfile, pathwayId)) for (const question of oregonContactQuestions(answers, true)) questions.set(question.id, question);
  const ndProfile = jurisdiction === "ND" ? getProfileByJurisdiction("ND") : null;
  if (ndProfile && ndFirstOffenseFamilyContract(ndProfile, pathwayId)) for (const question of ndFirstOffenseContactQuestions(answers)) questions.set(question.id, question);
  const ksProfile = jurisdiction === "KS" ? getProfileByJurisdiction("KS") : null;
  if (ksProfile && ksMunicipalContactContract(ksProfile, pathwayId)) for (const question of ksMunicipalContactQuestions(answers)) questions.set(question.id, question);
  for (const question of akCourtviewContactQuestions(jurisdiction, pathwayId, answers, true)) questions.set(question.id, question);
  const currentNy = ny16059CurrentDocumentQuestions(jurisdiction, pathwayId, [...questions.values()]);
  if (currentNy) for (const question of currentNy.questions) questions.set(question.id, question);
  if (isNy16059Packet(jurisdiction, pathwayId)) for (const question of NY_PACKET_QUESTIONS) {
    if (requiredInputIds.includes(question.id) || Object.hasOwn(answers, question.id)) questions.set(question.id, structuredClone(question));
  }
  if (isNy16059Packet(jurisdiction, pathwayId)) for (const question of nyCasePreparationQuestions(answers)) {
    if (requiredInputIds.includes(question.id) || Object.hasOwn(answers, question.id) || !requiredInputIds.length && [...NY_HISTORY_FACT_IDS, ...NY_FUTURE_FACT_IDS].includes(question.id)) questions.set(question.id, question);
  }
  if (isCaProp64Pathway(jurisdiction, pathwayId)) {
    if (requiredInputIds.includes(CA_FILER_CONTACT) || Object.hasOwn(answers, CA_FILER_CONTACT) || Object.hasOwn(answers, CA_SAFE_AT_HOME_ID)) {
      questions.set(CA_SAFE_AT_HOME_ID, caSafeAtHomeQuestion(answers));
    }
    for (const question of caProp64ContactQuestions(answers)) {
      if (requiredInputIds.includes(question.id) || Object.hasOwn(answers, question.id)) questions.set(question.id, question);
    }
    for (const question of CA_PROP64_CAPTION_QUESTIONS) {
      if (requiredInputIds.includes(question.id) || Object.hasOwn(answers, question.id)) questions.set(question.id, structuredClone(question));
    }
    const profile = getProfileByJurisdiction(jurisdiction);
    if (!profile) throw new Error("California Proposition 64 profile unavailable.");
    for (const question of caProp64RecordQuestions(profile, [...questions.values()] as PublicQuestion[], pathwayId)) {
      questions.set(question.id, toProfileQuestion(question));
    }
  }
}

function packetQuestionFromSpecification(fact: PacketSpecificationFact): ProfileQuestion {
  return packetQuestion(
    fact.factId,
    fact.prompt ?? answerLabel(fact.factId),
    fact.factId === "date_of_birth"
      ? fact.questionType === "text_or_unknown" ? "date_or_unknown" : "date"
      : fact.questionType ?? "text",
    fact.helperText,
    fact.options ?? null
  );
}

function packetQuestion(
  id: string,
  prompt: string,
  type: ProfileQuestion["type"],
  helperText?: string,
  options: string[] | null = null
): ProfileQuestion {
  return {
    id,
    stage: "packet_information",
    prompt,
    helperText,
    type,
    required: true,
    contextOnly: false,
    lifecyclePhase: "postpay_packet_field",
    options
  };
}

function packetInformationStage(value: unknown): PacketInformationStage {
  if (value === "in_progress" || value === "facts_complete" || value === "ready_to_generate") return value;
  return "not_started";
}

function answerRecord(value: unknown): Record<string, AnswerValue> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry === "boolean") return [[key, entry ? "Yes" : "No"]];
    return isAnswerValue(entry) ? [[key, entry]] : [];
  }));
}

const answerIsKnown = answerValueIsKnown;

function isAnswerValue(value: unknown): value is AnswerValue {
  if (value === null || typeof value === "string" || typeof value === "number") return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  if (isRecord(value)) {
    return (value.value === undefined || value.value === null || typeof value.value === "string" || typeof value.value === "number")
      && (value.unknown === undefined || typeof value.unknown === "boolean");
  }
  return false;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
