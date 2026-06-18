import "server-only";

import crypto from "node:crypto";
import type { WilmaContext } from "@/lib/expungement-ai/wilma-context";
import type { WilmaGuardFlag, WilmaGuardResult } from "@/lib/expungement-ai/wilma-safety";
import { wilmaModelVersion, wilmaSystemPromptVersion } from "@/lib/expungement-ai/wilma";

export type WilmaTelemetryRecord = {
  exchange_id: string;
  session_id: string;
  timestamp: string;
  state: string;
  user_message: string;
  wilma_response: string;
  injected_state_content_ids: string[];
  case_context_present: boolean;
  disposition_type?: string;
  guard_flags: WilmaGuardFlag[];
  redirect_occurred: boolean;
  redirect_target: "screening_tool" | "human_help" | "none";
  model_version: string;
  system_prompt_version: string;
};

const telemetryRecords: WilmaTelemetryRecord[] = [];

export function redactWilmaText(input: string) {
  return input
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
    .replace(/\b\d{9}\b/g, "[SSN]")
    .replace(/\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b/g, "[DOB]")
    .replace(/\b(?:19|20)\d{2}[/-](?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])\b/g, "[DOB]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b\.?/g, "[ADDRESS]")
    .replace(/\b(?:my name is|i am|i'm)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/gi, (match) => match.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/i, "[NAME]"));
}

export function createWilmaTelemetryRecord({
  sessionId,
  state,
  userMessage,
  wilmaResponse,
  context,
  guardResult
}: {
  sessionId: string;
  state: string;
  userMessage: string;
  wilmaResponse: string;
  context: WilmaContext;
  guardResult: WilmaGuardResult;
}): WilmaTelemetryRecord {
  return {
    exchange_id: crypto.randomUUID(),
    session_id: pseudonymousSessionId(sessionId),
    timestamp: new Date().toISOString(),
    state,
    user_message: redactWilmaText(userMessage),
    wilma_response: redactWilmaText(wilmaResponse),
    injected_state_content_ids: context.injectedStateContentIds,
    case_context_present: Boolean(context.caseContext && Object.keys(context.caseContext).length > 0),
    disposition_type: context.caseContext.dispositionType,
    guard_flags: guardResult.flags,
    redirect_occurred: guardResult.redirectOccurred,
    redirect_target: guardResult.redirectTarget,
    model_version: wilmaModelVersion,
    system_prompt_version: wilmaSystemPromptVersion
  };
}

export async function logWilmaExchange(record: WilmaTelemetryRecord) {
  telemetryRecords.push(record);
  return record;
}

export function listWilmaGuardFlags() {
  return telemetryRecords.flatMap((record) => record.guard_flags);
}

function pseudonymousSessionId(sessionId: string) {
  return crypto.createHash("sha256").update(`wilma:${sessionId}`).digest("hex").slice(0, 24);
}
