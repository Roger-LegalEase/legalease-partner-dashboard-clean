import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import {
  type ScreeningSessionStorage,
  type ScreeningSessionStatus,
  type SerializedAnswerValue,
  type SerializedScreeningSession,
  deserializeScreeningAnswers,
  saveScreeningSession
} from "@/lib/expungement-ai/screening-session-persistence";
import {
  generateResumeToken,
  genericResumeFailureResponse,
  hashResumeToken,
  isAfterNow,
  isValidResumeEmail,
  lockoutUntil,
  maxResumeConfirmFailures,
  normalizeResumeEmail,
  previousTokenGraceExpiry,
  resumeConsentTextVersion,
  resumeExpiry,
  timingSafeTokenHashEqual
} from "@/lib/expungement-ai/screening-resume-security";
import { screeningResumeUrl, sendScreeningResumeEmail } from "@/lib/expungement-ai/screening-resume-email";

export const resumeEmailSentMessage = "Check your email for a saved-progress link.";
export const resumeEmailSendFailureMessage = "We could not send that link right now. You can continue without saving or try again.";

export type ScreeningResumePosition = {
  currentQuestionId: string | null;
  furthestStage: string | null;
  lastDropQuestion: string | null;
};

export type SaveScreeningResumeInput = {
  sessionId?: string;
  jurisdiction: string;
  answers: Record<string, AnswerValue | undefined>;
  email: string;
  position: ScreeningResumePosition;
};

export type ConfirmScreeningResumeResult =
  | ReturnType<typeof genericResumeFailureResponse>
  | {
      ok: true;
      message: "Session resumed.";
      session: {
        sessionId: string;
        jurisdiction: string;
        answers: Record<string, AnswerValue>;
        currentQuestionId: string | null;
        furthestStage: string | null;
        status: ScreeningSessionStatus;
        lastDropQuestion: string | null;
      };
      resumeUrl: string;
    };

export type ScreeningResumeStorage = ScreeningSessionStorage & {
  updateResumeDelivery(input: ResumeDeliveryUpdate): Promise<SerializedResumeSession>;
  findByTokenHash(tokenHash: string): Promise<SerializedResumeSession | null>;
  recordResumeConfirmFailure(input: { sessionId: string; failedAttempts: number; lockedUntil: string | null; failedAt: string }): Promise<void>;
  rotateResumeToken(input: ResumeTokenRotation): Promise<SerializedResumeSession>;
};

export type ResumeDeliveryUpdate = {
  sessionId: string;
  email: string;
  emailNormalized: string;
  tokenHash: string;
  tokenExpiresAt: string;
  sentAt: string;
  consentAt: string;
  consentTextVersion: string;
};

export type ResumeTokenRotation = {
  sessionId: string;
  tokenHash: string;
  tokenExpiresAt: string;
  previousTokenHash: string | null;
  previousTokenGraceExpiresAt: string | null;
  rotatedAt: string;
};

export type SerializedResumeSession = SerializedScreeningSession & {
  resumeEmail: string | null;
  resumeEmailNormalized: string | null;
  resumeTokenHash: string | null;
  resumeTokenExpiresAt: string | null;
  resumeTokenRotatedAt: string | null;
  previousResumeTokenHash: string | null;
  previousResumeTokenGraceExpiresAt: string | null;
  resumeSentAt: string | null;
  resumeConfirmFailedAttempts: number;
  resumeConfirmLockedUntil: string | null;
  resumeLastFailedAt: string | null;
  resumeConsentAt: string | null;
  resumeConsentTextVersion: string | null;
};

type ScreeningSessionRow = {
  session_id: string;
  created_at: string;
  updated_at: string;
  jurisdiction: string;
  answers: Record<string, SerializedAnswerValue> | string;
  current_question_id: string | null;
  furthest_stage: string | null;
  status: ScreeningSessionStatus;
  last_drop_question: string | null;
  resume_email: string | null;
  resume_email_normalized: string | null;
  resume_token_hash: string | null;
  resume_token_expires_at: string | null;
  resume_token_rotated_at: string | null;
  previous_resume_token_hash: string | null;
  previous_resume_token_grace_expires_at: string | null;
  resume_sent_at: string | null;
  resume_confirm_failed_attempts: number;
  resume_confirm_locked_until: string | null;
  resume_last_failed_at: string | null;
  resume_consent_at: string | null;
  resume_consent_text_version: string | null;
};

export async function saveScreeningResumeLink(
  storage: ScreeningResumeStorage,
  input: SaveScreeningResumeInput,
  now = Date.now()
) {
  const emailNormalized = normalizeResumeEmail(input.email);
  if (!isValidResumeEmail(emailNormalized)) {
    throw new Error("A valid resume email is required.");
  }

  const rawToken = generateResumeToken();
  const tokenHash = hashResumeToken(rawToken);
  const saved = await saveScreeningSession(storage, {
    sessionId: input.sessionId,
    jurisdiction: input.jurisdiction,
    answers: input.answers,
    currentQuestionId: input.position.currentQuestionId,
    furthestStage: input.position.furthestStage,
    status: "in_progress",
    lastDropQuestion: input.position.lastDropQuestion
  });
  const sentAt = new Date(now).toISOString();
  await storage.updateResumeDelivery({
    sessionId: saved.sessionId,
    email: input.email.trim(),
    emailNormalized,
    tokenHash,
    tokenExpiresAt: resumeExpiry(now),
    sentAt,
    consentAt: sentAt,
    consentTextVersion: resumeConsentTextVersion
  });

  const resumeUrl = screeningResumeUrl(rawToken);
  const emailResult = await sendScreeningResumeEmail({ to: emailNormalized, resumeUrl });
  if (!emailResult.ok) {
    throw new Error(resumeEmailSendFailureMessage);
  }

  return {
    ok: true as const,
    sessionId: saved.sessionId,
    message: resumeEmailSentMessage
  };
}

export async function confirmScreeningResume(
  storage: ScreeningResumeStorage,
  input: { token: string; email: string },
  now = Date.now()
): Promise<ConfirmScreeningResumeResult> {
  const emailNormalized = normalizeResumeEmail(input.email);
  const tokenHash = hashResumeToken(input.token || "");
  const row = await storage.findByTokenHash(tokenHash);
  if (!row || !isValidResumeEmail(emailNormalized)) return genericResumeFailureResponse();

  const tokenState = matchedTokenState(row, tokenHash, now);
  const locked = isAfterNow(row.resumeConfirmLockedUntil, now);
  const emailMatches = row.resumeEmailNormalized === emailNormalized;
  const unfinished = row.status === "in_progress" || row.status === "resumed";

  if (!tokenState.valid || locked || !emailMatches || !unfinished) {
    await recordFailureIfApplicable(storage, row, now);
    return genericResumeFailureResponse();
  }

  const rawReplacement = generateResumeToken();
  const replacementHash = hashResumeToken(rawReplacement);
  const oldActiveHash = row.resumeTokenHash && timingSafeTokenHashEqual(row.resumeTokenHash, tokenHash)
    ? row.resumeTokenHash
    : row.resumeTokenHash;
  const rotated = await storage.rotateResumeToken({
    sessionId: row.sessionId,
    tokenHash: replacementHash,
    tokenExpiresAt: resumeExpiry(now),
    previousTokenHash: oldActiveHash,
    previousTokenGraceExpiresAt: oldActiveHash ? previousTokenGraceExpiry(now) : null,
    rotatedAt: new Date(now).toISOString()
  });

  return {
    ok: true,
    message: "Session resumed.",
    session: resumeSessionPayload(rotated),
    resumeUrl: screeningResumeUrl(rawReplacement)
  };
}

export async function requestFreshScreeningResumeLink(
  storage: ScreeningResumeStorage,
  input: { token: string; email: string },
  now = Date.now()
) {
  const emailNormalized = normalizeResumeEmail(input.email);
  const row = await storage.findByTokenHash(hashResumeToken(input.token || ""));
  if (!row || row.resumeEmailNormalized !== emailNormalized || !isValidResumeEmail(emailNormalized) || row.status === "completed" || row.status === "abandoned") {
    return { ok: true as const, message: "If that saved session can be resumed, a new link has been sent." };
  }

  const rawToken = generateResumeToken();
  const tokenHash = hashResumeToken(rawToken);
  await storage.rotateResumeToken({
    sessionId: row.sessionId,
    tokenHash,
    tokenExpiresAt: resumeExpiry(now),
    previousTokenHash: row.resumeTokenHash,
    previousTokenGraceExpiresAt: row.resumeTokenHash ? previousTokenGraceExpiry(now) : null,
    rotatedAt: new Date(now).toISOString()
  });
  const emailResult = await sendScreeningResumeEmail({ to: emailNormalized, resumeUrl: screeningResumeUrl(rawToken) });
  if (!emailResult.ok) {
    return { ok: false as const, message: resumeEmailSendFailureMessage };
  }
  return { ok: true as const, message: "Check your email for a new saved-progress link." };
}

export class SupabaseScreeningResumeStorage implements ScreeningResumeStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  async saveSession(input: Parameters<ScreeningSessionStorage["saveSession"]>[0]): Promise<SerializedScreeningSession> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .upsert({
        session_id: input.sessionId ?? crypto.randomUUID(),
        jurisdiction: input.jurisdiction,
        answers: input.answers,
        current_question_id: input.currentQuestionId,
        furthest_stage: input.furthestStage,
        status: input.status,
        last_drop_question: input.lastDropQuestion,
        updated_at: new Date().toISOString()
      }, { onConflict: "session_id" })
      .select("*")
      .single<ScreeningSessionRow>();
    if (error || !data) throw new Error(error?.message ?? "Unable to save screening session.");
    return rowToSerializedResumeSession(data);
  }

  async loadSession(sessionId: string): Promise<SerializedScreeningSession | null> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<ScreeningSessionRow>();
    if (error) throw new Error(error.message);
    return data ? rowToSerializedResumeSession(data) : null;
  }

  async updateResumeDelivery(input: ResumeDeliveryUpdate): Promise<SerializedResumeSession> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .update({
        resume_email: input.email,
        resume_email_normalized: input.emailNormalized,
        resume_token_hash: input.tokenHash,
        resume_token_expires_at: input.tokenExpiresAt,
        previous_resume_token_hash: null,
        previous_resume_token_grace_expires_at: null,
        resume_sent_at: input.sentAt,
        resume_confirm_failed_attempts: 0,
        resume_confirm_locked_until: null,
        resume_last_failed_at: null,
        resume_consent_at: input.consentAt,
        resume_consent_text_version: input.consentTextVersion,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", input.sessionId)
      .select("*")
      .single<ScreeningSessionRow>();
    if (error || !data) throw new Error(error?.message ?? "Unable to update resume delivery.");
    return rowToSerializedResumeSession(data);
  }

  async findByTokenHash(tokenHash: string): Promise<SerializedResumeSession | null> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .select("*")
      .or(`resume_token_hash.eq.${tokenHash},previous_resume_token_hash.eq.${tokenHash}`)
      .maybeSingle<ScreeningSessionRow>();
    if (error) throw new Error(error.message);
    return data ? rowToSerializedResumeSession(data) : null;
  }

  async recordResumeConfirmFailure(input: { sessionId: string; failedAttempts: number; lockedUntil: string | null; failedAt: string }): Promise<void> {
    const { error } = await this.supabase
      .from("screening_sessions")
      .update({
        resume_confirm_failed_attempts: input.failedAttempts,
        resume_confirm_locked_until: input.lockedUntil,
        resume_last_failed_at: input.failedAt,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", input.sessionId);
    if (error) throw new Error(error.message);
  }

  async rotateResumeToken(input: ResumeTokenRotation): Promise<SerializedResumeSession> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .update({
        resume_token_hash: input.tokenHash,
        resume_token_expires_at: input.tokenExpiresAt,
        resume_token_rotated_at: input.rotatedAt,
        previous_resume_token_hash: input.previousTokenHash,
        previous_resume_token_grace_expires_at: input.previousTokenGraceExpiresAt,
        resume_confirm_failed_attempts: 0,
        resume_confirm_locked_until: null,
        resume_last_failed_at: null,
        status: "resumed",
        updated_at: new Date().toISOString()
      })
      .eq("session_id", input.sessionId)
      .select("*")
      .single<ScreeningSessionRow>();
    if (error || !data) throw new Error(error?.message ?? "Unable to rotate resume token.");
    return rowToSerializedResumeSession(data);
  }
}

function matchedTokenState(row: SerializedResumeSession, tokenHash: string, now: number) {
  const activeMatches = row.resumeTokenHash ? timingSafeTokenHashEqual(row.resumeTokenHash, tokenHash) : false;
  if (activeMatches) return { valid: isAfterNow(row.resumeTokenExpiresAt, now) };
  const previousMatches = row.previousResumeTokenHash ? timingSafeTokenHashEqual(row.previousResumeTokenHash, tokenHash) : false;
  return { valid: previousMatches && isAfterNow(row.previousResumeTokenGraceExpiresAt, now) };
}

async function recordFailureIfApplicable(storage: ScreeningResumeStorage, row: SerializedResumeSession, now: number) {
  const failedAttempts = row.resumeConfirmFailedAttempts + 1;
  await storage.recordResumeConfirmFailure({
    sessionId: row.sessionId,
    failedAttempts,
    lockedUntil: failedAttempts >= maxResumeConfirmFailures ? lockoutUntil(now) : row.resumeConfirmLockedUntil,
    failedAt: new Date(now).toISOString()
  });
}

function resumeSessionPayload(row: SerializedResumeSession) {
  return {
    sessionId: row.sessionId,
    jurisdiction: row.jurisdiction,
    answers: deserializeScreeningAnswers(row.answers),
    currentQuestionId: row.currentQuestionId,
    furthestStage: row.furthestStage,
    status: row.status,
    lastDropQuestion: row.lastDropQuestion
  };
}

function rowToSerializedResumeSession(row: ScreeningSessionRow): SerializedResumeSession {
  return {
    sessionId: row.session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    jurisdiction: row.jurisdiction,
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers,
    currentQuestionId: row.current_question_id,
    furthestStage: row.furthest_stage,
    status: row.status,
    lastDropQuestion: row.last_drop_question,
    resumeEmail: row.resume_email,
    resumeEmailNormalized: row.resume_email_normalized,
    resumeTokenHash: row.resume_token_hash,
    resumeTokenExpiresAt: row.resume_token_expires_at,
    resumeTokenRotatedAt: row.resume_token_rotated_at,
    previousResumeTokenHash: row.previous_resume_token_hash,
    previousResumeTokenGraceExpiresAt: row.previous_resume_token_grace_expires_at,
    resumeSentAt: row.resume_sent_at,
    resumeConfirmFailedAttempts: row.resume_confirm_failed_attempts ?? 0,
    resumeConfirmLockedUntil: row.resume_confirm_locked_until,
    resumeLastFailedAt: row.resume_last_failed_at,
    resumeConsentAt: row.resume_consent_at,
    resumeConsentTextVersion: row.resume_consent_text_version
  };
}
