import "server-only";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type {
  ConsumerBriefcaseItem,
  CreateConsumerBriefcaseItemInput,
  ExpungementAiEligibilityResult
} from "@/lib/expungement-ai/types";

// Production-ready path: use the request user's Supabase auth client and consumer_briefcase_items RLS.
// Safe fallback path: local/unconfigured shells return deterministic items without service-role writes.
const startedAt = "2026-06-17T00:00:00.000Z";
const fallbackItemsByUser = new Map<string, ConsumerBriefcaseItem[]>();

type ConsumerBriefcaseRow = {
  id: string;
  user_id: string;
  item_type: ConsumerBriefcaseItem["type"];
  jurisdiction: string;
  pathway_label: string | null;
  result_code: ExpungementAiEligibilityResult["resultCode"] | null;
  packet_type: ExpungementAiEligibilityResult["packetType"] | null;
  payment_allowed: boolean;
  status: ConsumerBriefcaseItem["status"];
  summary_json: Record<string, unknown>;
  next_steps_json: string[];
  artifact_refs_json: Record<string, unknown>;
  payment_status: ConsumerBriefcaseItem["paymentStatus"] | null;
  packet_status: ConsumerBriefcaseItem["packetStatus"] | null;
  reminder_at: string | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function createBriefcaseItem(input: CreateConsumerBriefcaseItemInput): Promise<ConsumerBriefcaseItem> {
  const fallbackItem = fallbackItemFromCreateInput(input);
  const supabase = await getConsumerBriefcaseClient();

  if (!supabase) {
    rememberFallbackItem(input.userId, fallbackItem);
    return fallbackItem;
  }

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .insert({
      user_id: input.userId,
      item_type: input.itemType,
      jurisdiction: input.jurisdiction,
      pathway_label: input.pathwayLabel ?? null,
      result_code: input.resultCode ?? null,
      packet_type: input.packetType ?? null,
      payment_allowed: input.paymentAllowed,
      status: input.status,
      summary_json: { text: input.summary },
      next_steps_json: input.nextSteps,
      artifact_refs_json: input.artifactRefs ?? {},
      payment_status: input.paymentStatus ?? (input.paymentAllowed ? "unpaid" : "not_applicable"),
      packet_status: input.packetStatus ?? "not_started",
      reminder_at: input.reminderAt ?? null,
      source_session_id: input.sourceSessionId ?? null
    })
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) {
    rememberFallbackItem(input.userId, fallbackItem);
    return fallbackItem;
  }

  return rowToBriefcaseItem(data);
}

export async function listBriefcaseItems(userId: string): Promise<ConsumerBriefcaseItem[]> {
  const supabase = await getConsumerBriefcaseClient();
  if (!supabase) return fallbackItemsForUser(userId);

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ConsumerBriefcaseRow[]>();

  if (error || !data) return fallbackItemsForUser(userId);
  return data.map(rowToBriefcaseItem);
}

export async function getBriefcaseItem(userId: string, itemId: string): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();
  if (!supabase) return fallbackItemsForUser(userId).find((item) => item.id === itemId) ?? null;

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export async function updateBriefcaseItemStatus(
  userId: string,
  itemId: string,
  status: ConsumerBriefcaseItem["status"]
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();

  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = { ...items[index], status };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export function saveEligibilityCheckToBriefcase(state: string, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: consumerBriefcaseId("check", state, "started"),
    type: "eligibility_check" as const,
    title: `${state} record check`,
    state,
    status: "check_saved" as const,
    createdAt: startedAt,
    summary: "Eligibility check started and saved to Briefcase.",
    nextSteps: ["Finish the screening questions.", "Return here any time to continue."],
    paymentAllowed: false,
    packetReady: false
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function saveEligibilityResultToBriefcase(result: ExpungementAiEligibilityResult, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: result.briefcaseItemId ?? consumerBriefcaseId("result", result.state, result.resultCode),
    type: "result" as const,
    title: result.pathwayLabel ?? `${result.state} record-clearing result`,
    state: result.state,
    status: statusForResult(result.resultCode),
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: result.userLabel,
    nextSteps: result.nextSteps,
    paymentAllowed: result.paymentAllowed,
    packetReady: result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution",
    pathwayLabel: result.pathwayLabel,
    packetType: result.packetType
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function saveGeneratedPacketToBriefcase(result: ExpungementAiEligibilityResult, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: consumerBriefcaseId("packet", result.state, result.resultCode),
    type: "packet" as const,
    title: `${result.state} self-help packet`,
    state: result.state,
    status: "packet_ready" as const,
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: "Generated packet saved to Briefcase.",
    nextSteps: ["Download your packet.", "Review the filing checklist before you file."],
    paymentAllowed: false,
    packetReady: true,
    pathwayLabel: result.pathwayLabel,
    packetType: result.packetType,
    packetStatus: "ready" as const
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function getConsumerBriefcaseItems(userId = "local-preview-user"): ConsumerBriefcaseItem[] {
  const saved = fallbackItemsForUser(userId);
  if (saved.length > 0) return saved;

  return [
    saveEligibilityResultToBriefcase({
      resultCode: "packet_ready",
      userLabel: "Your self-help packet is ready to prepare.",
      state: "PA",
      pathwayLabel: "Pennsylvania non-conviction review",
      confidence: "high",
      paymentAllowed: true,
      priceCents: 5000,
      packetType: "custom_pleading",
      reasons: ["The engine found a packet-ready path."],
      nextSteps: ["Review the result.", "Pay once to generate the packet.", "Follow the filing checklist."],
      emailCaptureRecommended: false,
      disclaimer: consumerDisclaimer()
    }, userId),
    saveEligibilityResultToBriefcase({
      resultCode: "guidance_only",
      userLabel: "We saved guidance for this path.",
      state: "IL",
      pathwayLabel: "Illinois guidance matter",
      confidence: "medium",
      paymentAllowed: false,
      packetType: "guidance_packet",
      reasons: ["This in-scope path currently returns guidance instead of a packet."],
      nextSteps: ["Read the next steps.", "Gather your court record.", "Ask Wilma to explain the checklist."],
      emailCaptureRecommended: true,
      disclaimer: consumerDisclaimer()
    }, userId),
    {
      id: "wilma-conversation-sample",
      type: "wilma_conversation",
      title: "Wilma conversation",
      state: "PA",
      status: "check_saved",
      createdAt: startedAt,
      summary: "Wilma explained what a filing checklist is and pointed back to the tool for eligibility.",
      nextSteps: ["Continue the check from Briefcase."],
      paymentAllowed: false,
      packetReady: false
    }
  ];
}

export function consumerDisclaimer() {
  return "Expungement.ai is self-help software, not a law firm. Court approval is not guaranteed. Review all documents before filing.";
}

async function getConsumerBriefcaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createServerSupabaseAuthClient();
}

function fallbackItemFromCreateInput(input: CreateConsumerBriefcaseItemInput): ConsumerBriefcaseItem {
  return {
    id: consumerBriefcaseId(input.itemType, input.jurisdiction, input.resultCode ?? input.status),
    type: input.itemType,
    title: input.pathwayLabel ?? `${input.jurisdiction} Briefcase item`,
    state: input.jurisdiction,
    status: input.status,
    resultCode: input.resultCode,
    createdAt: startedAt,
    summary: input.summary,
    nextSteps: input.nextSteps,
    paymentAllowed: input.paymentAllowed,
    packetReady: input.status === "packet_ready",
    pathwayLabel: input.pathwayLabel,
    packetType: input.packetType,
    artifactRefs: input.artifactRefs,
    paymentStatus: input.paymentStatus ?? (input.paymentAllowed ? "unpaid" : "not_applicable"),
    packetStatus: input.packetStatus,
    reminderAt: input.reminderAt,
    sourceSessionId: input.sourceSessionId
  };
}

function rowToBriefcaseItem(row: ConsumerBriefcaseRow): ConsumerBriefcaseItem {
  const summaryText = typeof row.summary_json?.text === "string" ? row.summary_json.text : "Saved Briefcase item.";

  return {
    id: row.id,
    type: row.item_type,
    title: row.pathway_label ?? `${row.jurisdiction} Briefcase item`,
    state: row.jurisdiction,
    status: row.status,
    resultCode: row.result_code ?? undefined,
    createdAt: row.created_at,
    summary: summaryText,
    nextSteps: Array.isArray(row.next_steps_json) ? row.next_steps_json : [],
    paymentAllowed: row.payment_allowed,
    packetReady: row.status === "packet_ready",
    pathwayLabel: row.pathway_label ?? undefined,
    packetType: row.packet_type ?? undefined,
    artifactRefs: row.artifact_refs_json,
    paymentStatus: row.payment_status ?? undefined,
    packetStatus: row.packet_status ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    sourceSessionId: row.source_session_id ?? undefined
  };
}

function fallbackItemsForUser(userId: string) {
  return fallbackItemsByUser.get(userId) ?? [];
}

function rememberFallbackItem(userId: string, item: ConsumerBriefcaseItem) {
  const existing = fallbackItemsForUser(userId).filter((candidate) => candidate.id !== item.id);
  fallbackItemsByUser.set(userId, [item, ...existing]);
}

function statusForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]): ConsumerBriefcaseItem["status"] {
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "packet_ready";
  if (resultCode === "guidance_only" || resultCode === "not_covered_yet") return "guidance_saved";
  if (resultCode === "needs_more_info") return "needs_info";
  if (resultCode === "needs_review") return "needs_review";
  if (resultCode === "not_yet") return "waiting";
  if (resultCode === "likely_not_eligible") return "not_eligible";
  return "hard_stop";
}

function consumerBriefcaseId(kind: string, state: string, value: string) {
  return `expai-${kind}-${state.toLowerCase()}-${value.replaceAll("_", "-")}`;
}
