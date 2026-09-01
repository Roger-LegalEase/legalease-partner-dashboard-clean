import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { RETENTION_EXPLANATION, participantUploadPrefix } from "@/lib/expungement-ai/privacy/contract";
import { PACKET_ARTIFACT_BUCKET } from "@/lib/rcap/render/job-contract";

/**
 * The participant's copy of their own data.
 *
 * Two rules shape every query below.
 *
 * FIRST: this runs on the service-role client, which bypasses row-level
 * security. RLS is therefore not what keeps User A out of User B's data here —
 * the explicit owner filter on every single query is. Each read below is scoped
 * by the authenticated user id, and the two reads that cannot be scoped directly
 * (screening sessions, render jobs) are scoped by ids that were themselves read
 * under an owner filter. There is no query in this file without an owner bound.
 *
 * SECOND: an export is a copy of the participant's data, not a copy of ours.
 * Deliberately excluded, and listed here so a later edit has to argue with it:
 *
 *   resume/nudge token hashes, rate-limit counters — security material;
 *   storage object paths, container digests, fencing tokens — internal;
 *   partner caps, contract notes, entitlement balances — partner-confidential;
 *   Wilma safety telemetry — internal safety review, and redacted at rest;
 *   the recent-auth proof hash on a privacy request — security material;
 *   anything keyed to another account — by construction, per the first rule.
 */

export const EXPORT_FORMAT_VERSION = "participant-data-export/v1";

export type ParticipantExportPackage = {
  format: typeof EXPORT_FORMAT_VERSION;
  generatedAt: string;
  aboutThisFile: string[];
  profile: Record<string, unknown>;
  screenings: Array<Record<string, unknown>>;
  matters: Array<Record<string, unknown>>;
  answers: Array<Record<string, unknown>>;
  verificationHistory: Array<Record<string, unknown>>;
  uploads: Array<Record<string, unknown>>;
  packets: Array<Record<string, unknown>>;
  sponsorshipAttribution: Array<Record<string, unknown>>;
  privacyRequests: Array<Record<string, unknown>>;
  retainedRecordExplanation: typeof RETENTION_EXPLANATION;
};

type BriefcaseRow = {
  id: string;
  user_id: string;
  item_type: string;
  jurisdiction: string;
  pathway_label: string | null;
  result_code: string | null;
  packet_type: string | null;
  status: string;
  summary_json: Record<string, unknown> | null;
  next_steps_json: unknown;
  artifact_refs_json: Record<string, unknown> | null;
  payment_status: string;
  packet_status: string;
  amount_cents: number | null;
  currency: string | null;
  receipt_url: string | null;
  payment_recorded_at: string | null;
  reminder_at: string | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function buildParticipantExportPackage(input: {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string;
  now?: Date;
}): Promise<ParticipantExportPackage> {
  const { supabase, userId } = input;
  const generatedAt = (input.now ?? new Date()).toISOString();

  // --- matters (the anchor every other owner-scoped read hangs off) ----------
  const { data: itemRows } = await supabase
    .from("consumer_briefcase_items")
    .select(
      "id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type, status, summary_json, next_steps_json, artifact_refs_json, payment_status, packet_status, amount_cents, currency, receipt_url, payment_recorded_at, reminder_at, source_session_id, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // Second owner check in code. The filter above is the boundary; this is the
  // assertion that the boundary held, and it is cheap.
  const items = ((itemRows as BriefcaseRow[] | null) ?? []).filter((row) => row.user_id === userId);
  const itemIds = items.map((item) => item.id);
  const sessionIds = items.map((item) => item.source_session_id).filter((id): id is string => Boolean(id));

  // --- profile ---------------------------------------------------------------
  const authUser = await readAuthUser(supabase, userId);
  const profile = {
    accountId: userId,
    email: input.userEmail ?? authUser?.email ?? null,
    accountCreatedAt: authUser?.created_at ?? null,
    emailConfirmedAt: authUser?.email_confirmed_at ?? null,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    matterCount: items.length
  };

  // --- screenings and answers ------------------------------------------------
  const screeningRows = sessionIds.length
    ? ((
        await supabase
          .from("screening_sessions")
          .select(
            "session_id, jurisdiction, status, current_question_id, furthest_stage, last_drop_question, answers, created_at, updated_at, partner_slug, flow_mode, resume_email, resume_sent_at, resume_consent_at, resume_consent_text_version, resume_token_rotated_at, nudge_touch1_sent_at, nudge_touch2_sent_at, nudge_opted_out_at"
          )
          .in("session_id", sessionIds)
      ).data as Array<Record<string, unknown>> | null) ?? []
    : [];

  const { data: pendingRows } = await supabase
    .from("consumer_pending_screening_results")
    .select(
      "pending_id, created_at, claimed_at, jurisdiction, result_code, pathway_label, packet_type, summary, next_steps, screening_answers, profile_version, source_session_id"
    )
    .eq("claimed_user_id", userId);

  const pending = ((pendingRows as Array<Record<string, unknown>> | null) ?? []);

  const screenings = [
    ...screeningRows.map((row) => ({
      screeningId: row.session_id,
      source: "saved_screening",
      state: row.jurisdiction,
      status: row.status,
      lastQuestionYouSaw: row.current_question_id ?? null,
      furthestStage: row.furthest_stage ?? null,
      startedAt: row.created_at,
      lastUpdatedAt: row.updated_at
    })),
    ...pending.map((row) => ({
      screeningId: row.pending_id,
      source: "completed_check_attached_to_your_account",
      state: row.jurisdiction,
      status: "completed",
      resultCode: row.result_code,
      pathway: row.pathway_label ?? null,
      summary: row.summary ?? null,
      completedAt: row.created_at,
      attachedToAccountAt: row.claimed_at
    }))
  ];

  const answers = [
    ...screeningRows.map((row) => ({
      screeningId: row.session_id,
      state: row.jurisdiction,
      answers: row.answers ?? {}
    })),
    ...pending.map((row) => ({
      screeningId: row.pending_id,
      state: row.jurisdiction,
      answers: row.screening_answers ?? {}
    }))
  ];

  // --- verification history --------------------------------------------------
  // What we did to confirm it was you, and when. Never the tokens themselves.
  const verificationHistory: Array<Record<string, unknown>> = [];
  if (profile.emailConfirmedAt) {
    verificationHistory.push({
      event: "email_confirmed",
      occurredAt: profile.emailConfirmedAt,
      detail: "You confirmed your email address when creating the account."
    });
  }
  for (const row of screeningRows) {
    if (row.resume_sent_at) {
      verificationHistory.push({
        event: "resume_link_sent",
        screeningId: row.session_id,
        occurredAt: row.resume_sent_at,
        sentTo: row.resume_email ?? null,
        detail: "We emailed you a link to come back to an unfinished check."
      });
    }
    if (row.resume_consent_at) {
      verificationHistory.push({
        event: "resume_email_consent",
        screeningId: row.session_id,
        occurredAt: row.resume_consent_at,
        consentTextVersion: row.resume_consent_text_version ?? null,
        detail: "You agreed to be emailed a link back to your check."
      });
    }
    if (row.nudge_opted_out_at) {
      verificationHistory.push({
        event: "reminder_opt_out",
        screeningId: row.session_id,
        occurredAt: row.nudge_opted_out_at,
        detail: "You asked us to stop sending reminders about this check."
      });
    }
  }
  verificationHistory.sort((a, b) => String(a.occurredAt ?? "").localeCompare(String(b.occurredAt ?? "")));

  // --- uploads ---------------------------------------------------------------
  const uploads = await listParticipantUploads(supabase, userId);

  // --- packets ---------------------------------------------------------------
  const renderJobs = itemIds.length
    ? ((
        await supabase
          .from("packet_render_jobs")
          .select(
            "id, consumer_briefcase_item_id, consumer_auth_user_id, route_id, status, page_count, created_at, delivered_at, error_code"
          )
          .eq("consumer_auth_user_id", userId)
          .in("consumer_briefcase_item_id", itemIds)
      ).data as Array<Record<string, unknown>> | null) ?? []
    : [];

  const packets = [
    ...items
      .filter((item) => item.artifact_refs_json && Object.keys(item.artifact_refs_json).length > 0)
      .map((item) => ({
        matterId: item.id,
        source: "briefcase_artifact",
        packetType: item.packet_type,
        packetStatus: item.packet_status,
        fileName: readString(item.artifact_refs_json, "fileName"),
        generatedAt: readString(item.artifact_refs_json, "generatedAt"),
        downloadPath: readString(item.artifact_refs_json, "downloadPath"),
        note: "Sign in and open this matter to download the packet itself."
      })),
    ...renderJobs.map((job) => ({
      matterId: job.consumer_briefcase_item_id,
      source: "render_job",
      renderJobId: job.id,
      route: job.route_id,
      status: job.status,
      pageCount: job.page_count ?? null,
      requestedAt: job.created_at,
      deliveredAt: job.delivered_at ?? null,
      errorCode: job.error_code ?? null
    }))
  ];

  // --- sponsorship attribution ----------------------------------------------
  // Which organization helped pay for or refer this matter, and nothing about
  // that organization's own arrangements with us.
  const sponsorSlugs = Array.from(
    new Set(
      screeningRows
        .map((row) => (typeof row.partner_slug === "string" ? row.partner_slug : null))
        .filter((slug): slug is string => Boolean(slug))
    )
  );
  const sponsorNames = await readPartnerDisplayNames(supabase, sponsorSlugs);
  const sponsorshipAttribution = screeningRows
    .filter((row) => typeof row.partner_slug === "string" && row.partner_slug)
    .map((row) => {
      const slug = row.partner_slug as string;
      const item = items.find((candidate) => candidate.source_session_id === row.session_id);
      return {
        matterId: item?.id ?? null,
        screeningId: row.session_id,
        sponsorName: sponsorNames.get(slug) ?? slug,
        howYouArrived: row.flow_mode === "dtc" ? "on your own" : "through this organization",
        paidByYou: item ? item.payment_status === "paid" : null
      };
    });

  // --- privacy requests ------------------------------------------------------
  const { data: requestRows } = await supabase
    .from("participant_privacy_requests")
    .select(
      "id, request_type, status, requested_at, completed_at, receipt_code, legal_hold_active, legal_hold_reason, retention_treatment, target_matter_item_id"
    )
    .eq("user_id", userId)
    .order("requested_at", { ascending: true });

  const privacyRequests = ((requestRows as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    requestId: row.id,
    type: row.request_type,
    status: row.status,
    requestedAt: row.requested_at,
    completedAt: row.completed_at ?? null,
    receiptCode: row.receipt_code ?? null,
    heldForLegalReason: row.legal_hold_active === true ? row.legal_hold_reason : null,
    matterId: row.target_matter_item_id ?? null
  }));

  return {
    format: EXPORT_FORMAT_VERSION,
    generatedAt,
    aboutThisFile: [
      "This is a copy of the information Expungement.ai holds about you.",
      "It is a JSON file. You can open it in any text editor, or upload it to a JSON viewer.",
      "Downloading a copy does not delete anything. Deleting is a separate choice in Settings, under Privacy and data.",
      "If a section is empty, we hold nothing of that kind for you.",
      "This file does not include our internal security records, another person's information, or anything confidential to a partner organization."
    ],
    profile,
    screenings,
    matters: items.map((item) => ({
      matterId: item.id,
      type: item.item_type,
      state: item.jurisdiction,
      pathway: item.pathway_label,
      result: item.result_code,
      packetType: item.packet_type,
      status: item.status,
      summary: readString(item.summary_json, "text"),
      nextSteps: Array.isArray(item.next_steps_json) ? item.next_steps_json : [],
      paymentStatus: item.payment_status,
      amountPaidCents: item.payment_status === "paid" ? item.amount_cents : null,
      currency: item.payment_status === "paid" ? item.currency : null,
      receiptUrl: item.receipt_url,
      paidAt: item.payment_recorded_at,
      reminderSetFor: item.reminder_at,
      startedAt: item.created_at,
      lastUpdatedAt: item.updated_at
    })),
    answers,
    verificationHistory,
    uploads,
    packets,
    sponsorshipAttribution,
    privacyRequests,
    retainedRecordExplanation: RETENTION_EXPLANATION
  };
}

function readString(source: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = source?.[key];
  return typeof value === "string" ? value : null;
}

async function readAuthUser(supabase: SupabaseClient, userId: string) {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    const user = data?.user;
    if (!user || user.id !== userId) return null;
    return {
      email: user.email ?? null,
      created_at: user.created_at ?? null,
      email_confirmed_at: (user as { email_confirmed_at?: string }).email_confirmed_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null
    };
  } catch {
    return null;
  }
}

/**
 * Files the participant added themselves. There is no participant upload route
 * in the product today, so this reads the reserved prefix and legitimately
 * returns an empty list — the code path is real so that the day an upload
 * surface ships, export and deletion already cover it.
 */
export async function listParticipantUploads(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase.storage
      .from(PACKET_ARTIFACT_BUCKET)
      .list(participantUploadPrefix(userId), { limit: 1000 });
    if (error || !data) return [];
    return data
      .filter((object) => object.name && object.name !== ".emptyFolderPlaceholder")
      .map((object) => ({
        fileName: object.name,
        sizeBytes: (object.metadata as { size?: number } | null)?.size ?? null,
        contentType: (object.metadata as { mimetype?: string } | null)?.mimetype ?? null,
        uploadedAt: object.created_at ?? null
      }));
  } catch {
    return [];
  }
}

async function readPartnerDisplayNames(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (slugs.length === 0) return names;
  // Name only. A partner's caps, contract terms and internal notes are that
  // partner's, and a participant export is not where they belong.
  const { data } = await supabase
    .from("partner_records")
    .select("partner_slug, partner_name")
    .in("partner_slug", slugs);
  for (const row of (data as Array<{ partner_slug: string; partner_name: string | null }> | null) ?? []) {
    if (row.partner_name) names.set(row.partner_slug, row.partner_name);
  }
  return names;
}
