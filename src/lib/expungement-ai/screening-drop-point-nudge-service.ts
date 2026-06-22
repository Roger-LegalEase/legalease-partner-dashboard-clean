import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateResumeToken,
  hashResumeToken,
  previousTokenGraceExpiry,
  resumeExpiry
} from "@/lib/expungement-ai/screening-resume-security";
import { screeningResumeUrl } from "@/lib/expungement-ai/screening-resume-email";
import {
  screeningDropPointNudgeOptOutUrl,
  sendScreeningDropPointNudgeEmail,
  type ScreeningDropPointNudgeTouch
} from "@/lib/expungement-ai/screening-drop-point-nudge-email";
import { emitNudgeWindowEvent, type NudgeWindowEventMetrics } from "@/lib/expungement-ai/nudge-os-events";
import { logSecurityWarn } from "@/lib/observability/logger";

export type ScreeningNudgeStatus = "in_progress" | "resumed" | "completed" | "abandoned";

export type ScreeningNudgeRow = {
  session_id: string;
  jurisdiction: string;
  current_question_id: string | null;
  last_drop_question: string | null;
  furthest_stage: string | null;
  status: ScreeningNudgeStatus;
  resume_email_normalized: string | null;
  resume_token_hash: string | null;
  resume_sent_at: string | null;
  resume_consent_at: string | null;
  resume_token_expires_at: string | null;
  nudge_touch1_sent_at: string | null;
  nudge_touch2_sent_at: string | null;
  nudge_touch1_claimed_at: string | null;
  nudge_touch2_claimed_at: string | null;
  nudge_opted_out_at: string | null;
};

export type ScreeningNudgeStorage = {
  listDueNudgeCandidates(input: { touch: ScreeningDropPointNudgeTouch; now: string; limit: number }): Promise<ScreeningNudgeRow[]>;
  claimNudgeTouch(input: NudgeClaimInput): Promise<ScreeningNudgeRow | null>;
  releaseNudgeClaim(input: { sessionId: string; touch: ScreeningDropPointNudgeTouch; claimedAt: string; releasedAt: string }): Promise<void>;
  markNudgeSent(input: { sessionId: string; touch: ScreeningDropPointNudgeTouch; sentAt: string }): Promise<void>;
  rotateResumeToken(input: NudgeTokenRotation): Promise<ScreeningNudgeRow>;
  optOutByTokenHash(input: { tokenHash: string; optedOutAt: string }): Promise<boolean>;
};

export type NudgeClaimInput = {
  sessionId: string;
  touch: ScreeningDropPointNudgeTouch;
  claimedAt: string;
  now: string;
};

export type NudgeTokenRotation = {
  sessionId: string;
  tokenHash: string;
  tokenExpiresAt: string;
  previousTokenHash: string | null;
  previousTokenGraceExpiresAt: string | null;
  rotatedAt: string;
};

export type SendDueNudgesResult = {
  considered: number;
  sent: number;
  skipped: number;
  failures: number;
};

export const nudgeTouch1DelayMs = 24 * 60 * 60 * 1000;
export const nudgeTouch2DelayMs = 72 * 60 * 60 * 1000;
const defaultLimit = 100;

export async function sendDueScreeningDropPointNudges({
  storage,
  now = Date.now(),
  limit = defaultLimit
}: {
  storage: ScreeningNudgeStorage;
  now?: number;
  limit?: number;
}): Promise<SendDueNudgesResult> {
  const result: SendDueNudgesResult = { considered: 0, sent: 0, skipped: 0, failures: 0 };
  const windowEnd = new Date(now).toISOString();
  const runRows: ScreeningNudgeRow[] = [];
  let touch1Sent = 0;
  let touch2Sent = 0;

  for (const touch of [1, 2] as const) {
    const candidates = await storage.listDueNudgeCandidates({ touch, now: new Date(now).toISOString(), limit });
    runRows.push(...candidates);
    for (const candidate of candidates) {
      result.considered += 1;
      if (!isInsideNudgeSendWindow(candidate.jurisdiction, now)) {
        result.skipped += 1;
        continue;
      }
      const sent = await sendScreeningDropPointNudge(storage, candidate.session_id, touch, now);
      if (sent === "sent") {
        result.sent += 1;
        if (touch === 1) touch1Sent += 1;
        if (touch === 2) touch2Sent += 1;
      }
      if (sent === "skipped") result.skipped += 1;
      if (sent === "failed") result.failures += 1;
    }
  }

  await emitNudgeWindowEventAfterRun(buildNudgeWindowMetricsForRun({
    rows: runRows,
    touch1Sent,
    touch2Sent,
    windowEnd
  }));

  return result;
}

export async function sendScreeningDropPointNudge(
  storage: ScreeningNudgeStorage,
  sessionId: string,
  touch: ScreeningDropPointNudgeTouch,
  now = Date.now()
): Promise<"sent" | "skipped" | "failed"> {
  const claimedAt = new Date(now).toISOString();
  const row = await storage.claimNudgeTouch({ sessionId, touch, claimedAt, now: new Date(now).toISOString() });
  if (!row || !isSendableNudgeRow(row, touch, now)) return "skipped";
  if (!isInsideNudgeSendWindow(row.jurisdiction, now)) {
    await storage.releaseNudgeClaim({ sessionId: row.session_id, touch, claimedAt, releasedAt: new Date(now).toISOString() });
    return "skipped";
  }

  const rawToken = generateResumeToken();
  const tokenHash = hashResumeToken(rawToken);
  const rotated = await storage.rotateResumeToken({
    sessionId: row.session_id,
    tokenHash,
    tokenExpiresAt: resumeExpiry(now),
    previousTokenHash: row.resume_token_hash,
    previousTokenGraceExpiresAt: row.resume_token_hash ? previousTokenGraceExpiry(now) : null,
    rotatedAt: new Date(now).toISOString()
  });

  if (!isSendableNudgeRow(rotated, touch, now) || !rotated.resume_email_normalized) {
    await storage.releaseNudgeClaim({ sessionId: row.session_id, touch, claimedAt, releasedAt: new Date(now).toISOString() });
    return "skipped";
  }

  const email = await sendScreeningDropPointNudgeEmail({
    to: rotated.resume_email_normalized,
    touch,
    dropQuestionId: rotated.last_drop_question ?? rotated.current_question_id,
    resumeUrl: screeningResumeUrl(rawToken),
    optOutUrl: screeningDropPointNudgeOptOutUrl(rawToken)
  });

  if (!email.ok) {
    await storage.releaseNudgeClaim({ sessionId: row.session_id, touch, claimedAt, releasedAt: new Date(now).toISOString() });
    return "failed";
  }
  await storage.markNudgeSent({ sessionId: rotated.session_id, touch, sentAt: new Date(now).toISOString() });
  return "sent";
}

export function isSendableNudgeRow(row: ScreeningNudgeRow, touch: ScreeningDropPointNudgeTouch, now = Date.now()) {
  if (row.status === "resumed" || row.status === "completed") return false;
  if (!row.resume_email_normalized || !row.resume_consent_at || !row.resume_sent_at) return false;
  if (row.nudge_opted_out_at) return false;
  if (touch === 1 && row.nudge_touch1_sent_at) return false;
  if (touch === 2 && (!row.nudge_touch1_sent_at || row.nudge_touch2_sent_at)) return false;
  const resumeSentAt = Date.parse(row.resume_sent_at);
  if (!Number.isFinite(resumeSentAt)) return false;
  return now - resumeSentAt >= (touch === 1 ? nudgeTouch1DelayMs : nudgeTouch2DelayMs);
}

export function isInsideNudgeSendWindow(jurisdiction: string | null, now = Date.now()) {
  const offsetHours = jurisdictionUtcOffsetHours(jurisdiction);
  const localHour = new Date(now + offsetHours * 60 * 60 * 1000).getUTCHours();
  return localHour >= 9 && localHour < 18;
}

export function nudgeRecordShieldAggregate(rows: ScreeningNudgeRow[]) {
  const savedDarkRows = rows.filter((row) => row.resume_sent_at && row.status !== "resumed" && row.status !== "completed");
  const recordReadinessRows = savedDarkRows.filter((row) => isRecordReadinessQuestion(row.last_drop_question ?? row.current_question_id));
  const touch2Rows = rows.filter((row) => row.nudge_touch2_sent_at);
  const touch2ReturnedRows = touch2Rows.filter((row) => row.status === "resumed" || row.status === "completed");
  return {
    saved_dark_count: savedDarkRows.length,
    record_readiness_dark_count: recordReadinessRows.length,
    record_readiness_dark_rate: savedDarkRows.length === 0 ? 0 : recordReadinessRows.length / savedDarkRows.length,
    touch2_sent_count: touch2Rows.length,
    touch2_returned_count: touch2ReturnedRows.length,
    touch2_returned_rate: touch2Rows.length === 0 ? 0 : touch2ReturnedRows.length / touch2Rows.length
  };
}

export function buildNudgeWindowMetricsForRun({
  rows,
  touch1Sent,
  touch2Sent,
  windowEnd
}: {
  rows: ScreeningNudgeRow[];
  touch1Sent: number;
  touch2Sent: number;
  windowEnd: string;
}): NudgeWindowEventMetrics {
  const aggregate = nudgeRecordShieldAggregate(rows);
  const sentTotal = touch1Sent + touch2Sent;
  return {
    window_start: windowStartForRun(rows, windowEnd),
    window_end: windowEnd,
    dark_session_count: aggregate.saved_dark_count,
    touch_1_sent: touch1Sent,
    touch_2_sent: touch2Sent,
    return_rate: aggregate.saved_dark_count === 0 ? 0 : sentTotal / aggregate.saved_dark_count,
    touch_2_return_rate: aggregate.touch2_returned_rate,
    record_readiness_dark_driver_rate: aggregate.record_readiness_dark_rate
  };
}

async function emitNudgeWindowEventAfterRun(metrics: NudgeWindowEventMetrics) {
  try {
    const emitted = await emitNudgeWindowEvent(metrics);
    if (!emitted.sent && emitted.skipped_reason !== "disabled") {
      logSecurityWarn({
        event: "screening_nudge_window_event_not_sent",
        route: "sendDueScreeningDropPointNudges",
        outcome: emitted.skipped_reason ?? "unknown"
      });
    }
  } catch (error) {
    logSecurityWarn({
      event: "screening_nudge_window_event_failed",
      route: "sendDueScreeningDropPointNudges",
      outcome: "non_blocking_failure",
      error
    });
  }
}

function windowStartForRun(rows: ScreeningNudgeRow[], fallback: string) {
  let earliest = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const value = row.resume_sent_at ? Date.parse(row.resume_sent_at) : NaN;
    if (Number.isFinite(value) && value < earliest) earliest = value;
  }
  return Number.isFinite(earliest) ? new Date(earliest).toISOString() : fallback;
}

export async function optOutScreeningDropPointNudges(storage: ScreeningNudgeStorage, rawToken: string, now = Date.now()) {
  if (!rawToken) return false;
  return storage.optOutByTokenHash({
    tokenHash: hashResumeToken(rawToken),
    optedOutAt: new Date(now).toISOString()
  });
}

export class SupabaseScreeningNudgeStorage implements ScreeningNudgeStorage {
  constructor(private readonly supabase: SupabaseClient) {}

  async listDueNudgeCandidates(input: { touch: ScreeningDropPointNudgeTouch; now: string; limit: number }): Promise<ScreeningNudgeRow[]> {
    const nowMs = Date.parse(input.now);
    const cutoff = new Date(nowMs - (input.touch === 1 ? nudgeTouch1DelayMs : nudgeTouch2DelayMs)).toISOString();
    const query = this.supabase
      .from("screening_sessions")
      .select(nudgeSelectColumns)
      .not("resume_sent_at", "is", null)
      .not("resume_email_normalized", "is", null)
      .not("resume_consent_at", "is", null)
      .is("nudge_opted_out_at", null)
      .in("status", ["in_progress", "abandoned"])
      .lte("resume_sent_at", cutoff)
      .limit(input.limit);

    const { data, error } = input.touch === 1
      ? await query.is("nudge_touch1_sent_at", null).is("nudge_touch1_claimed_at", null)
      : await query.not("nudge_touch1_sent_at", "is", null).is("nudge_touch2_sent_at", null).is("nudge_touch2_claimed_at", null);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ScreeningNudgeRow[];
  }

  async claimNudgeTouch(input: NudgeClaimInput): Promise<ScreeningNudgeRow | null> {
    const claimedColumn = input.touch === 1 ? "nudge_touch1_claimed_at" : "nudge_touch2_claimed_at";
    const nowMs = Date.parse(input.now);
    const cutoff = new Date(nowMs - (input.touch === 1 ? nudgeTouch1DelayMs : nudgeTouch2DelayMs)).toISOString();
    const query = this.supabase
      .from("screening_sessions")
      .update({ [claimedColumn]: input.claimedAt, updated_at: input.claimedAt })
      .eq("session_id", input.sessionId)
      .not("resume_sent_at", "is", null)
      .not("resume_email_normalized", "is", null)
      .not("resume_consent_at", "is", null)
      .is("nudge_opted_out_at", null)
      .in("status", ["in_progress", "abandoned"])
      .lte("resume_sent_at", cutoff);

    const { data, error } = input.touch === 1
      ? await query.is("nudge_touch1_sent_at", null).is("nudge_touch1_claimed_at", null).select(nudgeSelectColumns).maybeSingle()
      : await query.not("nudge_touch1_sent_at", "is", null).is("nudge_touch2_sent_at", null).is("nudge_touch2_claimed_at", null).select(nudgeSelectColumns).maybeSingle();
    if (error) throw new Error(error.message);
    return data as unknown as ScreeningNudgeRow | null;
  }

  async releaseNudgeClaim(input: { sessionId: string; touch: ScreeningDropPointNudgeTouch; claimedAt: string; releasedAt: string }): Promise<void> {
    const claimedColumn = input.touch === 1 ? "nudge_touch1_claimed_at" : "nudge_touch2_claimed_at";
    const { error } = await this.supabase
      .from("screening_sessions")
      .update({ [claimedColumn]: null, updated_at: input.releasedAt })
      .eq("session_id", input.sessionId)
      .eq(claimedColumn, input.claimedAt);
    if (error) throw new Error(error.message);
  }

  async markNudgeSent(input: { sessionId: string; touch: ScreeningDropPointNudgeTouch; sentAt: string }): Promise<void> {
    const sentColumn = input.touch === 1 ? "nudge_touch1_sent_at" : "nudge_touch2_sent_at";
    const { error } = await this.supabase
      .from("screening_sessions")
      .update({ [sentColumn]: input.sentAt, updated_at: input.sentAt })
      .eq("session_id", input.sessionId);
    if (error) throw new Error(error.message);
  }

  async rotateResumeToken(input: NudgeTokenRotation): Promise<ScreeningNudgeRow> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .update({
        resume_token_hash: input.tokenHash,
        resume_token_expires_at: input.tokenExpiresAt,
        resume_token_rotated_at: input.rotatedAt,
        previous_resume_token_hash: input.previousTokenHash,
        previous_resume_token_grace_expires_at: input.previousTokenGraceExpiresAt,
        updated_at: input.rotatedAt
      })
      .eq("session_id", input.sessionId)
      .in("status", ["in_progress", "abandoned"])
      .select(nudgeSelectColumns)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Unable to rotate nudge resume token.");
    return data as unknown as ScreeningNudgeRow;
  }

  async optOutByTokenHash(input: { tokenHash: string; optedOutAt: string }): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("screening_sessions")
      .update({ nudge_opted_out_at: input.optedOutAt, updated_at: input.optedOutAt })
      .or(`resume_token_hash.eq.${input.tokenHash},previous_resume_token_hash.eq.${input.tokenHash}`)
      .select("session_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
}

const nudgeSelectColumns = [
  "session_id",
  "jurisdiction",
  "current_question_id",
  "last_drop_question",
  "furthest_stage",
  "status",
  "resume_email_normalized",
  "resume_token_hash",
  "resume_sent_at",
  "resume_consent_at",
  "resume_token_expires_at",
  "nudge_touch1_sent_at",
  "nudge_touch2_sent_at",
  "nudge_touch1_claimed_at",
  "nudge_touch2_claimed_at",
  "nudge_opted_out_at"
].join(",");

function isRecordReadinessQuestion(questionId: string | null) {
  const normalized = questionId?.trim().toLowerCase() ?? "";
  return normalized === "record_documents" || normalized === "criminal_history";
}

function jurisdictionUtcOffsetHours(jurisdiction: string | null) {
  switch ((jurisdiction ?? "").toUpperCase()) {
    case "HI":
      return -10;
    case "AK":
      return -9;
    case "CA":
    case "NV":
    case "OR":
    case "WA":
      return -8;
    case "AZ":
    case "CO":
    case "ID":
    case "MT":
    case "NM":
    case "UT":
    case "WY":
      return -7;
    case "AL":
    case "AR":
    case "IL":
    case "IA":
    case "KS":
    case "LA":
    case "MN":
    case "MS":
    case "MO":
    case "NE":
    case "ND":
    case "OK":
    case "SD":
    case "TN":
    case "TX":
    case "WI":
      return -6;
    default:
      return -5;
  }
}
