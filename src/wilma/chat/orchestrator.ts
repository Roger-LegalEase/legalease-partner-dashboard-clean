import {
  evaluateWilmaServiceFit,
  wilmaSupportedStates,
  type SupportedState,
  type WilmaDecisionStatus,
  type WilmaDocumentTarget,
  type WilmaEligibilityFacts,
  type WilmaServiceFitDecision
} from "@/wilma/chat/rules";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";
import type { WilmaAnalyticsBackend } from "@/wilma/analytics/types";
import { enforceWilmaAbuseRateLimits } from "@/wilma/abuse/rateLimit";
import { enforceWilmaSessionLimits } from "@/wilma/abuse/sessionLimits";
import type { WilmaAbuseBackend, WilmaAbuseBlockReason } from "@/wilma/abuse/types";
import { riskFlagForWilmaAbuseReason } from "@/wilma/adapters/abuseBackend";

export { WILMA_RULE_FLAGS, wilmaSupportedStates } from "@/wilma/chat/rules";
export type { SupportedState, WilmaDecisionStatus, WilmaDocumentTarget, WilmaEligibilityFacts } from "@/wilma/chat/rules";

export type WilmaSupportedState = SupportedState;
export type WilmaChatStatus = WilmaDecisionStatus;
export type WilmaChatFacts = WilmaEligibilityFacts;

export type WilmaChatDecisionSnapshot = {
  status: WilmaChatStatus;
  documentTarget: WilmaDocumentTarget;
  ruleVersion: string;
  reasonCodes: string[];
  evaluatedAt: string;
};

export type WilmaChatSession = {
  id: string;
  userId: string;
  email?: string | null;
  facts: WilmaChatFacts;
  decision?: WilmaServiceFitDecision | WilmaChatDecisionSnapshot | null;
};

export type WilmaChatRequest = {
  sessionId?: string;
  userId: string;
  email?: string;
  message: string;
  state?: string;
  ip?: string | null;
  deviceId?: string | null;
};

export type WilmaChatResponse = {
  sessionId: string;
  assistantMessage: string;
  status: WilmaChatStatus;
  documentTarget: WilmaDocumentTarget;
  requiresEmailGate: boolean;
  allowPaidCta: boolean;
  emailCaptured: boolean;
  showEmailGate: boolean;
  showPaidCta: boolean;
  nextQuestion?: string;
  reasonCodes: string[];
};

export type WilmaChatMessageRole = "user" | "assistant";

export type WilmaChatBackend = WilmaAnalyticsBackend & WilmaAbuseBackend & {
  loadSession(input: { sessionId: string; userId: string }): Promise<WilmaChatSession | null>;
  createSession(input: { userId: string; email?: string; facts?: WilmaChatFacts }): Promise<WilmaChatSession>;
  saveMessage(input: {
    sessionId: string;
    userId: string;
    role: WilmaChatMessageRole;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  updateSession(input: {
    sessionId: string;
    userId: string;
    email?: string;
    facts: WilmaChatFacts;
    decision?: WilmaServiceFitDecision | WilmaChatDecisionSnapshot | null;
  }): Promise<WilmaChatSession>;
  captureLead(input: { sessionId: string; email: string; consent: boolean }): Promise<WilmaChatSession>;
};

export type WilmaFactExtractionResult = {
  facts: WilmaChatFacts;
};

export type WilmaFactExtractor = {
  extractFacts(input: {
    message: string;
    state: WilmaSupportedState;
    existingFacts: WilmaChatFacts;
  }): Promise<WilmaFactExtractionResult>;
};

export type WilmaOrchestratorDependencies = {
  backend: WilmaChatBackend;
  extractor: WilmaFactExtractor;
  now?: () => Date;
};

const safeBoundaryMessage =
  "I can help screen whether this appears to fit LegalEase's self-help document-preparation workflow, but I cannot give legal advice, legal strategy, guarantees, or predictions about what a court will do. Tell me the disposition, court system, county, and whether anything is still pending.";

const unsupportedStateMessage =
  "Wilma is currently available for Illinois, Pennsylvania, Maryland, DC, Mississippi, and Texas. This record is outside the supported scope for this screening.";

export async function runWilmaChat(
  request: WilmaChatRequest,
  dependencies: WilmaOrchestratorDependencies
): Promise<WilmaChatResponse> {
  const message = request.message.trim();
  if (!message) {
    throw new Error("Message is required.");
  }

  const selectedState = normalizeState(request.state);
  const now = dependencies.now?.() ?? new Date();
  const isNewSession = !request.sessionId;
  const abuseDecision = await enforceWilmaAbuseRateLimits({
    backend: dependencies.backend,
    identity: {
      ip: request.ip,
      email: request.email,
      deviceId: request.deviceId
    },
    isNewSession,
    now
  });
  if (!abuseDecision.allowed) {
    return abuseBlockedResponse(request, dependencies.backend, request.sessionId ?? "wilma_blocked", abuseDecision.reason, abuseDecision.assistantMessage);
  }

  const session = await loadOrCreateSession(request, dependencies.backend);
  const initialFacts = mergeFacts(session.facts, { state: normalizeSupportedState(request.state) });
  const sessionLimit = await enforceWilmaSessionLimits({
    backend: dependencies.backend,
    sessionId: request.sessionId,
    now
  });
  if (!sessionLimit.allowed) {
    return abuseBlockedResponse(request, dependencies.backend, session.id, sessionLimit.reason, sessionLimit.assistantMessage, initialFacts);
  }

  if (isNewSession) {
    await trackWilmaEvent(dependencies.backend, {
      event: "wilma_chat_started",
      wilmaSessionId: session.id,
      actorUserId: request.userId,
      actorEmail: request.email,
      state: initialFacts.state,
      facts: initialFacts,
      metadata: { source: "wilma_chat" }
    });
  }
  if (request.state) {
    await trackWilmaEvent(dependencies.backend, {
      event: "wilma_state_selected",
      wilmaSessionId: session.id,
      actorUserId: request.userId,
      actorEmail: request.email,
      state: request.state,
      facts: initialFacts
    });
  }

  await dependencies.backend.saveMessage({
    sessionId: session.id,
    userId: request.userId,
    role: "user",
    content: message,
    metadata: { state: request.state, email: request.email }
  });

  const legalBoundaryReason = detectLegalAdviceRequest(message);
  if (legalBoundaryReason) {
    return saveAssistantTurn(request, dependencies.backend, session.id, initialFacts, boundaryDecision(legalBoundaryReason), {
      assistantMessage: safeBoundaryMessage,
      status: "collecting_information",
      documentTarget: "none",
      requiresEmailGate: false,
      allowPaidCta: false,
      ...visibility(false, false),
      nextQuestion: nextQuestionForFacts(initialFacts),
      reasonCodes: [legalBoundaryReason, "no_guarantee_language"]
    });
  }

  if (selectedState && !isWilmaSupportedState(selectedState)) {
    return saveAssistantTurn(request, dependencies.backend, session.id, initialFacts, unsupportedDecision(now), {
      assistantMessage: unsupportedStateMessage,
      status: "outside_supported_scope",
      documentTarget: "none",
      requiresEmailGate: false,
      allowPaidCta: false,
      ...visibility(false, false),
      reasonCodes: ["unsupported_state"]
    });
  }

  const normalizedState = initialFacts.state;
  if (!normalizedState) {
    return saveAssistantTurn(request, dependencies.backend, session.id, initialFacts, null, {
      assistantMessage: "What state is the record in? Wilma currently supports IL, PA, MD, DC, MS, and TX.",
      status: "collecting_information",
      documentTarget: "none",
      requiresEmailGate: false,
      allowPaidCta: false,
      ...visibility(false, false),
      nextQuestion: "What state is the record in?",
      reasonCodes: ["missing_state"]
    });
  }

  const extraction = await dependencies.extractor.extractFacts({
    message,
    state: normalizedState,
    existingFacts: initialFacts
  });
  const facts = mergeFacts(initialFacts, extraction.facts, { state: normalizedState });
  await trackWilmaEvent(dependencies.backend, {
    event: "wilma_facts_extracted",
    wilmaSessionId: session.id,
    actorUserId: request.userId,
    actorEmail: request.email,
    state: facts.state,
    facts,
    metadata: { extractedFields: Object.keys(extraction.facts) }
  });
  const decision = evaluateWilmaServiceFit(facts, now);
  const response = responseForDecision(session.id, facts, decision, Boolean(session.email));

  return saveAssistantTurn(request, dependencies.backend, session.id, facts, decision, response);
}

export async function captureWilmaLead(
  input: { sessionId: string; email: string; consent: boolean },
  dependencies: { backend: WilmaChatBackend }
): Promise<Pick<WilmaChatResponse, "sessionId" | "emailCaptured" | "showEmailGate" | "showPaidCta">> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("A valid email address is required.");
  }
  if (!input.consent) {
    throw new Error("Consent is required.");
  }

  const session = await dependencies.backend.captureLead({ sessionId: input.sessionId, email, consent: input.consent });
  await trackWilmaEvent(dependencies.backend, {
    event: "wilma_email_captured",
    wilmaSessionId: session.id,
    actorEmail: email,
    state: session.facts.state,
    decisionStatus: session.decision?.status,
    documentTarget: session.decision?.documentTarget,
    ruleVersion: session.decision?.ruleVersion,
    reasonCodes: session.decision?.reasonCodes,
    facts: session.facts,
    metadata: { consent: input.consent }
  });
  const showPaidCta = session.decision?.status === "likely_eligible_for_document_prep" && Boolean(session.email);
  if (showPaidCta) {
    await trackWilmaEvent(dependencies.backend, {
      event: "wilma_paid_cta_shown",
      wilmaSessionId: session.id,
      actorEmail: email,
      state: session.facts.state,
      decisionStatus: session.decision?.status,
      documentTarget: session.decision?.documentTarget,
      ruleVersion: session.decision?.ruleVersion,
      reasonCodes: session.decision?.reasonCodes,
      facts: session.facts
    });
  }
  return {
    sessionId: session.id,
    emailCaptured: Boolean(session.email),
    showEmailGate: false,
    showPaidCta
  };
}

export function isWilmaSupportedState(state: string): state is WilmaSupportedState {
  return (wilmaSupportedStates as readonly string[]).includes(state);
}

export function detectLegalAdviceRequest(message: string): string | null {
  const normalized = message.toLowerCase();
  if (/\b(legal advice|advise me|should i plead|should i file|what should i do in court|strategy|legal strategy|court strategy|guarantee|guaranteed|promise me|will definitely|predict|prediction|will the judge|will the court|court outcome|win in court)\b/.test(normalized)) {
    return "legal_advice_request_redirected";
  }
  if (/\b(immigration|firearm|licensing|custody|employment law)\b/.test(normalized)) {
    return "collateral_consequence_warning";
  }
  return null;
}

export function createOpenAIWilmaFactExtractor(input: {
  apiKey?: string;
  model: string;
  fetcher?: typeof fetch;
}): WilmaFactExtractor {
  return {
    async extractFacts({ message, state, existingFacts }) {
      if (!input.apiKey) {
        return { facts: {} };
      }
      const response = await (input.fetcher ?? fetch)("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          input: [
            {
              role: "system",
              content:
                "Extract factual Wilma service-fit fields only. Do not decide eligibility and do not give legal advice."
            },
            { role: "user", content: JSON.stringify({ message, state, existingFacts }) }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "wilma_facts",
              strict: false,
              schema: { type: "object" }
            }
          }
        })
      });
      if (!response.ok) {
        return { facts: {} };
      }
      const data = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
      const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
      return text ? { facts: sanitizeFacts(JSON.parse(text) as WilmaChatFacts) } : { facts: {} };
    }
  };
}

async function abuseBlockedResponse(
  request: WilmaChatRequest,
  backend: WilmaChatBackend,
  sessionId: string,
  reason: WilmaAbuseBlockReason,
  assistantMessage: string,
  facts: WilmaChatFacts = {}
): Promise<WilmaChatResponse> {
  await trackWilmaEvent(backend, {
    event: "wilma_session_flagged",
    wilmaSessionId: sessionId,
    actorUserId: request.userId,
    actorEmail: request.email,
    state: facts.state ?? normalizeSupportedState(request.state),
    decisionStatus: "collecting_information",
    reasonCodes: [reason],
    facts,
    riskFlags: [riskFlagForWilmaAbuseReason(reason)],
    metadata: {
      reason,
      deviceId: request.deviceId ? "present" : "missing",
      ip: request.ip ? "present" : "missing"
    }
  });

  return {
    sessionId,
    assistantMessage,
    status: "collecting_information",
    documentTarget: "none",
    requiresEmailGate: false,
    allowPaidCta: false,
    emailCaptured: false,
    showEmailGate: false,
    showPaidCta: false,
    reasonCodes: [reason]
  };
}

async function loadOrCreateSession(request: WilmaChatRequest, backend: WilmaChatBackend): Promise<WilmaChatSession> {
  if (request.sessionId) {
    const existing = await backend.loadSession({ sessionId: request.sessionId, userId: request.userId });
    if (existing) {
      return existing;
    }
  }
  return backend.createSession({
    userId: request.userId,
    email: request.email,
    facts: { state: normalizeSupportedState(request.state) }
  });
}

async function saveAssistantTurn(
  request: WilmaChatRequest,
  backend: WilmaChatBackend,
  sessionId: string,
  facts: WilmaChatFacts,
  decision: WilmaServiceFitDecision | WilmaChatDecisionSnapshot | null,
  response: Omit<WilmaChatResponse, "sessionId">
): Promise<WilmaChatResponse> {
  await backend.updateSession({ sessionId, userId: request.userId, email: request.email, facts, decision });
  await backend.saveMessage({
    sessionId,
    userId: request.userId,
    role: "assistant",
    content: response.assistantMessage,
    metadata: {
      decisionStatus: response.status,
      documentTarget: response.documentTarget,
      ruleVersion: decision?.ruleVersion,
      reasonCodes: response.reasonCodes,
      requiresEmailGate: response.requiresEmailGate,
      allowPaidCta: response.allowPaidCta,
      showEmailGate: response.showEmailGate,
      showPaidCta: response.showPaidCta
    }
  });
  if (decision) {
    await trackWilmaEvent(backend, {
      event: "wilma_decision_created",
      wilmaSessionId: sessionId,
      actorUserId: request.userId,
      actorEmail: request.email,
      state: facts.state,
      decisionStatus: response.status,
      documentTarget: response.documentTarget,
      ruleVersion: decision.ruleVersion,
      reasonCodes: response.reasonCodes,
      facts,
      metadata: {
        documentTarget: response.documentTarget,
        allowPaidCta: response.allowPaidCta,
        requiresEmailGate: response.requiresEmailGate
      }
    });
    if (response.status === "likely_eligible_for_document_prep") {
      if (response.showEmailGate) {
        await trackWilmaEvent(backend, {
          event: "wilma_email_gate_shown",
          wilmaSessionId: sessionId,
          actorUserId: request.userId,
          actorEmail: request.email,
          state: facts.state,
          decisionStatus: response.status,
          documentTarget: response.documentTarget,
          ruleVersion: "ruleVersion" in decision ? decision.ruleVersion : undefined,
          reasonCodes: response.reasonCodes,
          facts,
          metadata: { documentTarget: response.documentTarget }
        });
      }
      if (response.showPaidCta) {
        await trackWilmaEvent(backend, {
          event: "wilma_paid_cta_shown",
          wilmaSessionId: sessionId,
          actorUserId: request.userId,
          actorEmail: request.email,
          state: facts.state,
          decisionStatus: response.status,
          documentTarget: response.documentTarget,
          ruleVersion: "ruleVersion" in decision ? decision.ruleVersion : undefined,
          reasonCodes: response.reasonCodes,
          facts,
          metadata: { documentTarget: response.documentTarget }
        });
      }
      await trackWilmaEvent(backend, {
        event: "wilma_session_flagged",
        wilmaSessionId: sessionId,
        actorUserId: request.userId,
        actorEmail: request.email,
        state: facts.state,
        decisionStatus: response.status,
        documentTarget: response.documentTarget,
        ruleVersion: "ruleVersion" in decision ? decision.ruleVersion : undefined,
        reasonCodes: response.reasonCodes,
        facts,
        metadata: { documentTarget: response.documentTarget }
      });
    }
  }
  return { sessionId, ...response };
}

function responseForDecision(
  sessionId: string,
  facts: WilmaChatFacts,
  decision: WilmaServiceFitDecision,
  emailCaptured: boolean
): WilmaChatResponse {
  const isLikely = decision.status === "likely_eligible_for_document_prep";
  const visibilityFields = visibility(isLikely, emailCaptured);

  if (isLikely) {
    return {
      sessionId,
      assistantMessage: emailCaptured
        ? "Based on what you shared, you may be a good fit for LegalEase's self-help petition-preparation service. For $50, LegalEase can prepare your petition packet, best-practices guide, resources, and tracking workspace."
        : "I have enough information to prepare your eligibility summary. Where should I send a copy?",
      status: decision.status,
      documentTarget: decision.documentTarget,
      requiresEmailGate: decision.requiresEmailGate,
      allowPaidCta: decision.allowPaidCta,
      ...visibilityFields,
      reasonCodes: decision.reasonCodes
    };
  }

  const nextQuestion = nextQuestionForFacts(facts);
  return {
    sessionId,
    assistantMessage:
      decision.status === "not_a_fit_for_this_service" || decision.status === "outside_supported_scope"
        ? "Based on these answers, this does not look like a fit for the automated document-prep flow right now."
        : nextQuestion
          ? `Thanks. ${nextQuestion}`
          : "Thanks. I need a little more information to screen this.",
    status: decision.status,
    documentTarget: decision.documentTarget,
    requiresEmailGate: decision.requiresEmailGate,
    allowPaidCta: decision.allowPaidCta,
    ...visibilityFields,
    nextQuestion,
    reasonCodes: decision.reasonCodes
  };
}

function boundaryDecision(reasonCode: string): WilmaChatDecisionSnapshot {
  return {
    status: "collecting_information",
    documentTarget: "none",
    ruleVersion: "wilma_chat_boundary_v1",
    reasonCodes: [reasonCode, "no_guarantee_language"],
    evaluatedAt: new Date().toISOString()
  };
}

function unsupportedDecision(evaluatedAt: Date): WilmaChatDecisionSnapshot {
  return {
    status: "outside_supported_scope",
    documentTarget: "none",
    ruleVersion: "wilma_supported_states_v1",
    reasonCodes: ["unsupported_state"],
    evaluatedAt: evaluatedAt.toISOString()
  };
}

function visibility(isLikelyEligible: boolean, emailCaptured: boolean) {
  return {
    emailCaptured,
    showEmailGate: isLikelyEligible && !emailCaptured,
    showPaidCta: isLikelyEligible && emailCaptured
  };
}

function nextQuestionForFacts(facts: WilmaChatFacts): string | undefined {
  if (!facts.state) return "What state is the record in?";
  if (!facts.disposition || facts.disposition === "unknown") {
    return "What was the disposition: dismissed, not guilty, acquitted, conviction, deferred adjudication, pending, or something else?";
  }
  if (!facts.courtSystem || facts.courtSystem === "unknown") {
    return "Was this in state court, federal court, juvenile court, or municipal court?";
  }
  if (facts.disposition === "conviction" && (!facts.offenseLevel || facts.offenseLevel === "unknown")) {
    return "Was the offense a misdemeanor, felony, summary offense, or another level?";
  }
  return undefined;
}

function mergeFacts(...factSets: Array<WilmaChatFacts | undefined>): WilmaChatFacts {
  return factSets.reduce<WilmaChatFacts>((merged, facts) => {
    const sanitized = sanitizeFacts(facts ?? {});
    for (const [key, value] of Object.entries(sanitized) as Array<[keyof WilmaChatFacts, WilmaChatFacts[keyof WilmaChatFacts]]>) {
      if (value !== undefined && value !== "" && (value !== "unknown" || merged[key] === undefined)) {
        merged[key] = value as never;
      }
    }
    return merged;
  }, {});
}

function sanitizeFacts(facts: WilmaChatFacts): WilmaChatFacts {
  return {
    ...facts,
    state: normalizeSupportedState(facts.state),
    caseState: normalizeState(facts.caseState),
    county: cleanString(facts.county),
    courtName: cleanString(facts.courtName),
    caseNumber: cleanString(facts.caseNumber),
    offenseCategory: cleanString(facts.offenseCategory),
    offenseStatute: cleanString(facts.offenseStatute)
  };
}

function normalizeSupportedState(state: string | undefined): SupportedState | undefined {
  const normalized = normalizeState(state);
  return normalized && isWilmaSupportedState(normalized) ? normalized : undefined;
}

function normalizeState(state: string | undefined): string | undefined {
  const normalized = state?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeEmail(email: string | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function cleanString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
