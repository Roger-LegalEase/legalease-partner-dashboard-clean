import { resolveSourceDocumentAccess, sourceDocumentAccessIsCurrent, sourceAccessOwnsPacket, sourceMatterIsCurrent, type SourceDocumentAccess } from "@/lib/rcap/documents/source-document-access";
export { resolveSourceDocumentAccess, type SourceDocumentAccess } from "@/lib/rcap/documents/source-document-access";
import "server-only";

import type {
  DcDocumentPacketInput,
  IllinoisDocumentPacketInput,
  MississippiDocumentPacketInput,
  PennsylvaniaDocumentPacketInput,
  RcapDocumentPacket,
  RcapReliefOutcome,
  SourceDocumentPacketInput,
  TexasHarrisDocumentPacketInput
} from "@/lib/rcap/documents/types";
import { rcapReliefOutcomeValues } from "@/lib/rcap/documents/types";
import { getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import { getRcapPersonOutcomeSummary, deriveRcapPersonMatchKey } from "@/lib/rcap/person-identity";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { isParticipantAccountBlocked } from "@/lib/expungement-ai/privacy/account-status";
import type { RenderJobClaim } from "@/lib/rcap/render/job-contract";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const packets = new Map<string, RcapDocumentPacket>();
let fallbackWarningLogged = false;


const packetCacheKey = (userId: string, packetId: string) => JSON.stringify([userId, packetId]);
function forgetPacket(packetId: string) {
  for (const [key, packet] of packets) if (packet.id === packetId) packets.delete(key);
}
function rememberPacket(packet: RcapDocumentPacket, persisted: boolean) {
  forgetPacket(packet.id);
  if (!persisted && packet.userId) packets.set(packetCacheKey(packet.userId, packet.id), packet);
}

type PacketResult = Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }>;
export type ConsumerPacketBinding = { consumerAuthUserId: string; consumerBriefcaseItemId: string };
export const CONSUMER_BINDING_ORIGIN = "2026-11-04T04:40:14Z";
type PacketAuditEvent =
  | { eventType: "created"; fromStatus?: null; toStatus: RcapDocumentPacket["status"]; consumerBinding?: ConsumerPacketBinding }
  | { eventType: "status_changed"; fromStatus: RcapDocumentPacket["status"]; toStatus: RcapDocumentPacket["status"] };
type SourceDocumentClassification = {
  state: string;
  documentType?: string;
  pathway: string;
  status: RcapDocumentPacket["status"];
};

export type RcapReliefOutcomeAdminRow = {
  id: string;
  partnerSlug: string;
  state: string;
  county?: string;
  status: RcapDocumentPacket["status"];
  reliefOutcome: RcapReliefOutcome;
  updatedAt?: string;
  createdAt?: string;
};

export async function createMississippiDocumentPacket(input: MississippiDocumentPacketInput, consumerBinding?: ConsumerPacketBinding): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "MS" }, consumerBinding);
}

export async function createIllinoisDocumentPacket(input: IllinoisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "IL" });
}

export async function createDcDocumentPacket(input: DcDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "DC" });
}

export async function createPennsylvaniaDocumentPacket(input: PennsylvaniaDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "PA" });
}

export async function createTexasHarrisDocumentPacket(input: TexasHarrisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "TX", county: "Harris" });
}

export async function getRcapDocumentPacket(packetId: string, access: SourceDocumentAccess) {
  if (!(await sourceAccessOwnsPacket(packetId, access))) return null;
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind === "supabase") {
    // Primary existence and erasure are authoritative; no process cache serves persisted packets.
    forgetPacket(packetId);
    return readPersistedSourceDocumentPacket(packetId, access.userId, access);
  }
  if (mode.kind !== "fallback") return null;
  const packet = packets.get(packetCacheKey(access.userId, packetId));
  return packet?.userId === access.userId ? packet : null;
}

const SOURCE_INTAKE_STATES = new Set(["MS", "IL", "DC", "PA", "TX"]);
export async function getSourceIntakeDocumentPacketForSession(packetId: string, access: SourceDocumentAccess) {
  const packet = await getRcapDocumentPacket(packetId, access);
  if (!packet || packet.partnerSlug === "expungement-ai-consumer" || !SOURCE_INTAKE_STATES.has(packet.state)) return null;
  const binding = await readSourcePacketConsumerBinding(packet);
  if (binding.kind === "unavailable") return null;
  if (binding.kind === "bound" && (binding.binding.consumerAuthUserId !== packet.userId || !await sourceMatterIsCurrent(packet.userId!, binding.binding.consumerBriefcaseItemId))) return null;
  return packet;
}

/** Worker-only read: validate the live fencing/owner binding before touching participant packets. */
export async function getRcapDocumentPacketForRenderClaim(claim: RenderJobClaim) {
  if (!claim?.id || !claim.packetId || !claim.fencingToken) return null;
  const db = getSupabaseAdminClient();
  if (!db) return null;
  const { data: job, error } = await db.from("packet_render_jobs")
    .select("packet_id,consumer_auth_user_id,consumer_briefcase_item_id,sponsored_consumer_auth_user_id,sponsored_consumer_briefcase_item_id")
    .eq("id", claim.id).eq("packet_id", claim.packetId).eq("route_id", claim.routeId)
    .eq("input_hash", claim.inputHash).eq("fencing_token", claim.fencingToken)
    .eq("status", "rendering").gt("claim_expires_at", new Date().toISOString()).maybeSingle();
  if (error || !job) return null;
  if (job.consumer_auth_user_id && job.sponsored_consumer_auth_user_id && job.consumer_auth_user_id !== job.sponsored_consumer_auth_user_id) return null;
  if (job.consumer_briefcase_item_id && job.sponsored_consumer_briefcase_item_id && job.consumer_briefcase_item_id !== job.sponsored_consumer_briefcase_item_id) return null;
  const owner = job.consumer_auth_user_id || job.sponsored_consumer_auth_user_id;
  const matter = job.consumer_briefcase_item_id || job.sponsored_consumer_briefcase_item_id;
  if (typeof owner !== "string" || !owner || await isParticipantAccountBlocked(owner)) return null;
  if (matter && !await sourceMatterIsCurrent(owner, matter)) return null;
  const packet = await readPersistedSourceDocumentPacket(claim.packetId, owner, undefined, claim);
  if (!packet) return null;
  const binding = await readSourcePacketConsumerBinding(packet);
  if (binding.kind === "unavailable" || (matter && binding.kind !== "bound")) return null;
  if (binding.kind === "bound" && (binding.binding.consumerAuthUserId !== owner || binding.binding.consumerBriefcaseItemId !== matter || binding.binding.partnerSlug !== packet.partnerSlug)) return null;
  return packet;
}

export async function generateSavedMississippiDocumentPacket(packetId: string, access: SourceDocumentAccess): PacketResult {
  return generateSavedSourceDocumentPacket(packetId, access);
}

export async function generateSavedDcDocumentPacket(packetId: string, access: SourceDocumentAccess): PacketResult {
  return generateSavedSourceDocumentPacket(packetId, access);
}

export async function saveMississippiDocumentPacketInputs(packetId: string, input: Partial<MississippiDocumentPacketInput>, access: SourceDocumentAccess): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input, access);
}

export async function saveDcDocumentPacketInputs(packetId: string, input: Partial<DcDocumentPacketInput>, access: SourceDocumentAccess): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input, access);
}

export async function getPartnerDocumentActivitySummary(partnerSlug?: string) {
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind === "supabase") {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      let query = supabase
        .from("rcap_document_packets")
        .select("id, partner_slug, state, county, pathway, status, relief_outcome, person_id, briefcase_id, updated_at, created_at");
      if (partnerSlug) query = query.eq("partner_slug", partnerSlug);
      const { data, error } = await query;
      if (!error && data) {
        const summary = documentActivitySummaryFromPackets((data as DocumentActivityPacketRow[]).map(activityPacketFromRow));
        const personSummary = partnerSlug
          ? await getRcapPersonOutcomeSummary(supabase, partnerSlug)
          : personOutcomeSummaryFromPackets((data as DocumentActivityPacketRow[]).map(activityPacketFromRow));
        return { ...summary, ...personSummary };
      }
    }
  }

  const allPackets = Array.from(packets.values()).filter((packet) => !partnerSlug || packet.partnerSlug === partnerSlug);
  return documentActivitySummaryFromPackets(allPackets);
}

function documentActivitySummaryFromPackets(allPackets: DocumentActivityPacket[]) {
  const personSummary = personOutcomeSummaryFromPackets(allPackets);
  return {
    totalPackets: allPackets.length,
    missingInformationPackets: allPackets.filter((packet) => packet.status === "missing_information").length,
    readyForReviewPackets: allPackets.filter((packet) => packet.status === "ready_for_review").length,
    blockedReviewRequired: allPackets.filter((packet) => packet.status === "blocked_review_required").length,
    briefcaseItems: allPackets.filter((packet) => packet.briefcaseId).length,
    latestPacketDate: allPackets.map((packet) => packet.updatedAt ?? packet.createdAt).filter(Boolean).sort().at(-1) ?? null,
    actualReliefDeliveredPackets: allPackets.filter((packet) => isDeliveredReliefOutcome(packet.reliefOutcome)).length,
    reliefOutcomeBreakdown: countBy(allPackets.map((packet) => packet.reliefOutcome)),
    distinctPeople: personSummary.distinctPeople,
    reliefOutcomePeople: personSummary.reliefOutcomePeople,
    actualReliefDeliveredPeople: personSummary.actualReliefDeliveredPeople,
    pathwayBreakdown: countBy(allPackets.map((packet) => packet.pathway)),
    stateBreakdown: countBy(allPackets.map((packet) => packet.state))
  };
}

export async function getPartnerReliefOutcomeAdminRows(partnerSlug: string, limit = 25): Promise<RcapReliefOutcomeAdminRow[]> {
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind !== "supabase") {
    return Array.from(packets.values())
      .filter((packet) => packet.partnerSlug === partnerSlug)
      .sort((left, right) => String(right.updatedAt ?? right.createdAt).localeCompare(String(left.updatedAt ?? left.createdAt)))
      .slice(0, limit)
      .map(adminRowFromPacket);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rcap_document_packets")
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .eq("partner_slug", partnerSlug)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as ReliefOutcomePacketRow[]).map(adminRowFromReliefOutcomeRow);
}

export async function setRcapDocumentPacketReliefOutcome(input: {
  packetId: string;
  partnerSlug: string;
  reliefOutcome: RcapReliefOutcome;
}): Promise<{ ok: true; packet: RcapReliefOutcomeAdminRow; changed: boolean } | { ok: false; error: string }> {
  if (!isRcapReliefOutcome(input.reliefOutcome)) return { ok: false, error: "Unsupported relief outcome." };
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind !== "supabase") {
    return { ok: false, error: "Relief outcome changes require Supabase audit trail persistence." };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured for RCAP relief outcome persistence." };

  const { data: existing, error: readError } = await supabase
    .from("rcap_document_packets")
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .eq("id", input.packetId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!existing) return { ok: false, error: "Document packet not found." };

  const current = existing as ReliefOutcomePacketRow;
  if (current.partner_slug !== input.partnerSlug) return { ok: false, error: "Document packet does not belong to this partner." };
  if (current.relief_outcome === input.reliefOutcome) {
    return { ok: true, packet: adminRowFromReliefOutcomeRow(current), changed: false };
  }

  const { data: updated, error: updateError } = await supabase
    .from("rcap_document_packets")
    .update({ relief_outcome: input.reliefOutcome })
    .eq("id", input.packetId)
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .single();
  if (updateError) return { ok: false, error: updateError.message };
  const packet = adminRowFromReliefOutcomeRow(updated as ReliefOutcomePacketRow);
  forgetPacket(packet.id);
  return { ok: true, packet, changed: true };
}

export function resolveSourceDocumentClassification(input: SourceDocumentPacketInput): SourceDocumentClassification {
  const state = String(input.state ?? "US").toUpperCase();
  if (state === "MS") return resolveMississippiDocumentClassification(input);
  if (state === "IL") return resolveIllinoisDocumentClassification(input);
  if (state === "DC") return resolveDcDocumentClassification(input);
  if (state === "PA" || state === "TX") {
    return {
      state,
      pathway: "more_information_needed",
      status: "ready_for_review"
    };
  }
  return {
    state,
    pathway: "more_information_needed",
    status: "missing_information"
  };
}

function resolveMississippiDocumentClassification(input: SourceDocumentPacketInput): SourceDocumentClassification {
  const convictionLevel = stringValue(input.convictionLevel);
  if (convictionLevel === "misdemeanor") {
    return {
      state: "MS",
      documentType: "mississippi_misdemeanor_conviction_petition",
      pathway: "misdemeanor_conviction",
      status: "ready_for_review"
    };
  }
  if (convictionLevel === "felony") {
    return {
      state: "MS",
      documentType: "mississippi_felony_conviction_petition",
      pathway: "felony_conviction",
      status: "ready_for_review"
    };
  }
  return {
    state: "MS",
    documentType: "mississippi_non_conviction_petition",
    pathway: "non_conviction",
    status: "ready_for_review"
  };
}

function resolveIllinoisDocumentClassification(input: SourceDocumentPacketInput): SourceDocumentClassification {
  const remedyType = stringValue(input.remedyType);
  if (remedyType === "sealing") {
    return {
      state: "IL",
      documentType: "illinois_request_to_expungeseal_packet",
      pathway: "sealing_conviction",
      status: "ready_for_review"
    };
  }
  if (remedyType === "needs_review") {
    return {
      state: "IL",
      documentType: "illinois_request_to_expungeseal_packet",
      pathway: "excluded_or_needs_review",
      status: "ready_for_review"
    };
  }
  return {
    state: "IL",
    documentType: "illinois_request_to_expungeseal_packet",
    pathway: "expungement_non_conviction",
    status: "ready_for_review"
  };
}

function resolveDcDocumentClassification(input: SourceDocumentPacketInput): SourceDocumentClassification {
  const reliefTrack = stringValue(input.reliefTrack);
  if (reliefTrack === "automatic_expungement") {
    return {
      state: "DC",
      documentType: "dc_filing_instructions",
      pathway: "automatic_expungement",
      status: "ready_for_review"
    };
  }
  if (reliefTrack === "automatic_sealing") {
    return {
      state: "DC",
      documentType: "dc_filing_instructions",
      pathway: "automatic_sealing",
      status: "ready_for_review"
    };
  }
  if (reliefTrack === "actual_innocence_expungement") {
    return {
      state: "DC",
      documentType: "dc_motion_to_expunge",
      pathway: "motion_actual_innocence_expungement",
      status: "ready_for_review"
    };
  }
  if (reliefTrack === "interests_of_justice_sealing") {
    return {
      state: "DC",
      documentType: "dc_motion_to_seal",
      pathway: "motion_interests_of_justice_sealing",
      status: "ready_for_review"
    };
  }
  return {
    state: "DC",
    documentType: "dc_filing_instructions",
    pathway: "needs_review",
    status: "ready_for_review"
  };
}

async function createSourceDocumentPacket(input: SourceDocumentPacketInput, consumerBinding?: ConsumerPacketBinding): PacketResult {
  if (!input.partnerSlug) return { ok: false, error: "A partner slug is required." };
  const session = await resolveSourceDocumentAccess();
  if (!session.ok) return { ok: false, error: session.error };
  if (input.userId && input.userId !== session.access.userId) return { ok: false, error: "Document owner mismatch." };
  if (input.intakeSessionId || input.briefcaseId || input.personId) return { ok: false, error: "Owner-bound legacy source links could not be verified." };
  if (consumerBinding && (consumerBinding.consumerAuthUserId !== session.access.userId
    || !await sourceMatterIsCurrent(consumerBinding.consumerAuthUserId, consumerBinding.consumerBriefcaseItemId))) return { ok: false, error: "Packet matter binding could not be verified." };
  const packet = packetFromInput({ ...input, userId: session.access.userId });
  const persisted = await persistOrFallback(packet, input, {
    eventType: "created",
    toStatus: packet.status, consumerBinding
  }, session.access);
  if (!persisted.ok) return persisted;
  rememberPacket(packet, persisted.persisted);
  return { ok: true, packet, persisted: persisted.persisted };
}

async function generateSavedSourceDocumentPacket(packetId: string, access: SourceDocumentAccess): PacketResult {
  const packet = await getSourceIntakeDocumentPacketForSession(packetId, access);
  if (!packet) return { ok: false, error: "Document packet not found." };
  const generated = {
    ...packet,
    status: "preview_generated" as const,
    completedAt: new Date().toISOString()
  };
  const persisted = await persistOrFallback(generated, undefined, {
    eventType: "status_changed",
    fromStatus: packet.status,
    toStatus: generated.status
  }, access);
  if (!persisted.ok) return persisted;
  rememberPacket(generated, persisted.persisted);
  return { ok: true, packet: generated, persisted: persisted.persisted };
}

async function saveSourceDocumentPacketInputs(packetId: string, input: Partial<SourceDocumentPacketInput>, access: SourceDocumentAccess): PacketResult {
  const packet = await getSourceIntakeDocumentPacketForSession(packetId, access);
  if (!packet) return { ok: false, error: "Document packet not found." };
  if (["userId", "partnerSlug", "intakeSessionId", "briefcaseId", "personId"].some((key) => input[key] !== undefined && input[key] !== packet[key as keyof RcapDocumentPacket])) return { ok: false, error: "Document identity cannot be changed." };
  const updated = packetFromInput({
    ...packet,
    ...input,
    partnerSlug: packet.partnerSlug,
    state: packet.state,
    userId: packet.userId,
    briefcaseId: packet.briefcaseId,
    intakeSessionId: packet.intakeSessionId,
    personId: packet.personId
  });
  const savedPacket = { ...updated, id: packetId, createdAt: packet.createdAt ?? updated.createdAt };
  const persisted = await persistOrFallback(
    savedPacket,
    input,
    packet.status === savedPacket.status
      ? undefined
      : {
          eventType: "status_changed",
          fromStatus: packet.status,
          toStatus: savedPacket.status
        },
    access
  );
  if (!persisted.ok) return persisted;
  rememberPacket(savedPacket, persisted.persisted);
  return { ok: true, packet: savedPacket, persisted: persisted.persisted };
}

export type SourcePacketConsumerBindingRead =
  | { kind: "bound"; binding: ConsumerPacketBinding & { partnerSlug: string } }
  | { kind: "unbound" }
  | { kind: "unavailable" };

/**
 * The binding (and partner) recorded on a packet's single created event. "unbound" is a created
 * event with no consumer keys, no event for a packet stored before CONSUMER_BINDING_ORIGIN, or no
 * persistence; anything unreadable, ambiguous, lost or undatable is "unavailable" and refuses.
 */
export async function readSourcePacketConsumerBinding(packet: Pick<RcapDocumentPacket, "id" | "createdAt">): Promise<SourcePacketConsumerBindingRead> {
  const packetId = packet.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { kind: "unbound" };
  const { data, error } = await supabase
    .from("rcap_record_events")
    .select("partner_slug, metadata")
    .eq("record_type", "document_packet")
    .eq("record_id", packetId)
    .eq("event_type", "created")
    .limit(2);
  if (error || !data) return { kind: "unavailable" };
  if (data.length === 0) {
    const createdAt = Date.parse(packet.createdAt ?? "");
    return Number.isFinite(createdAt) && createdAt < Date.parse(CONSUMER_BINDING_ORIGIN) ? { kind: "unbound" } : { kind: "unavailable" };
  }
  if (data.length !== 1) return { kind: "unavailable" };
  const { partner_slug: partnerSlug, metadata } = data[0] as { partner_slug: string; metadata: Record<string, unknown> | null };
  const consumerAuthUserId = metadata?.consumer_auth_user_id;
  const consumerBriefcaseItemId = metadata?.consumer_briefcase_item_id;
  if (consumerAuthUserId === undefined && consumerBriefcaseItemId === undefined) return { kind: "unbound" };
  return metadata?.source === "rcap_document_packet_repository"
    && typeof consumerAuthUserId === "string" && consumerAuthUserId && typeof consumerBriefcaseItemId === "string" && consumerBriefcaseItemId
    ? { kind: "bound", binding: { consumerAuthUserId, consumerBriefcaseItemId, partnerSlug } }
    : { kind: "unavailable" };
}

async function persistOrFallback(
  packet: RcapDocumentPacket,
  inputPayload: Partial<SourceDocumentPacketInput> | undefined,
  auditEvent: PacketAuditEvent | undefined,
  access: SourceDocumentAccess
): Promise<{ ok: true; persisted: boolean } | { ok: false; error: string }> {
  if (!(await sourceDocumentAccessIsCurrent(access)) || packet.userId !== access.userId) return { ok: false, error: "Document access could not be verified." };
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind === "blocked") return { ok: false, error: mode.error };
  if (mode.kind === "fallback") {
    logPersistenceFallback(mode.reason);
    return { ok: true, persisted: false };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured for RCAP document packet persistence." };

  const { data, error } = await supabase.rpc("persist_authorized_source_document_packet", {
    p_actor_user_id: access.actorUserId, p_clinic_case_id: access.clinicCaseId ?? null,
    p_packet: packetRow(packet),
    p_person_match_key: packet.personId ? null : deriveRcapPersonMatchKey({ partnerSlug: packet.partnerSlug, firstName: packet.petitionerFirstName, lastName: packet.petitionerLastName }),
    p_input: inputPayload ? packetInputRow(packet, inputPayload) : null,
    p_event: auditEvent ? packetAuditEventRow(packet, auditEvent) : null,
    p_briefcase: packet.briefcaseId ? briefcaseItemRow(packet) : null
  });
  if (error || data !== true) return { ok: false, error: "Atomic document persistence could not be verified." };
  return { ok: true, persisted: true };
}

async function sourcePacketPersistenceMode(): Promise<
  | { kind: "supabase" }
  | { kind: "fallback"; reason: string }
  | { kind: "blocked"; error: string }
> {
  const mode = await getPartnerRepositoryMode();
  if (mode === "supabase" && isSupabaseConfigured()) return { kind: "supabase" };

  const reason =
    mode === "local_seeded"
      ? "ENABLE_SUPABASE_PARTNER_DATA is not true."
      : "Supabase service configuration is incomplete.";
  if (process.env.NODE_ENV === "production") {
    return {
      kind: "blocked",
      error: `RCAP document packet persistence is required in production. ${reason}`
    };
  }

  return { kind: "fallback", reason };
}

function logPersistenceFallback(reason: string) {
  if (fallbackWarningLogged) return;
  fallbackWarningLogged = true;
  console.warn(`RCAP document packet persistence fallback active; packets are in-memory only. ${reason}`);
}

async function readPersistedSourceDocumentPacket(packetId: string, userId: string, access?: SourceDocumentAccess, claim?: RenderJobClaim): Promise<RcapDocumentPacket | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("read_authorized_source_document_packet", {
    p_packet_id: packetId, p_actor_user_id: claim ? null : access?.actorUserId ?? null,
    p_clinic_case_id: claim ? null : access?.clinicCaseId ?? null, p_job_claim: claim ?? null
  });
  if (error || !data || data.user_id !== userId) return null;
  return packetFromRow(data as SourceDocumentPacketRow);
}

type SourceDocumentPacketRow = {
  id: string;
  partner_slug: string;
  intake_session_id: string | null;
  user_id: string | null;
  briefcase_id: string | null;
  person_id: string | null;
  state: string;
  county: string | null;
  document_type: string | null;
  pathway: string;
  status: string;
  relief_outcome: string | null;
  petitioner_first_name: string | null;
  petitioner_last_name: string | null;
  petitioner_city: string | null;
  petitioner_county: string | null;
  court_type: string | null;
  court_county: string | null;
  court_name: string | null;
  jurisdiction: string | null;
  cause_number: string | null;
  charge: string | null;
  offense_date: string | null;
  arrest_date: string | null;
  arresting_agency: string | null;
  agency_case_number: string | null;
  disposition_date: string | null;
  conviction_date: string | null;
  sentence_completion_date: string | null;
  has_zero_balance: boolean | null;
  has_court_documents: boolean | null;
  first_offender_signal: boolean | null;
  non_traffic_signal: boolean | null;
  excluded_offense_screening: boolean | null;
  one_felony_expungement_signal: boolean | null;
  needs_record_review: boolean | null;
  generated_html: string | null;
  generated_plain_text: string | null;
  filing_instructions: string[] | null;
  county_court_instructions: string[] | null;
  missing_fields: string[] | null;
  safety_disclaimer: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

type ReliefOutcomePacketRow = {
  id: string;
  partner_slug: string;
  state: string;
  county: string | null;
  status: string;
  relief_outcome: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentActivityPacketRow = {
  id: string;
  partner_slug: string;
  state: string;
  county: string | null;
  pathway: string | null;
  status: string;
  relief_outcome: string | null;
  person_id: string | null;
  briefcase_id: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentActivityPacket = {
  state: string;
  pathway: string;
  status: RcapDocumentPacket["status"];
  reliefOutcome: RcapReliefOutcome;
  personId?: string;
  briefcaseId?: string;
  updatedAt?: string;
  createdAt?: string;
};

function packetRow(packet: RcapDocumentPacket) {
  return {
    id: packet.id,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    user_id: packet.userId ?? null,
    briefcase_id: packet.briefcaseId ?? null,
    person_id: packet.personId ?? null,
    state: packet.state,
    county: packet.county ?? null,
    court_type: packet.courtType ?? null,
    court_county: packet.courtCounty ?? null,
    court_name: packet.courtName ?? null,
    jurisdiction: packet.jurisdiction ?? null,
    document_type: packet.documentType ?? null,
    pathway: packet.pathway,
    status: packet.status,
    relief_outcome: packet.reliefOutcome,
    petitioner_first_name: packet.petitionerFirstName ?? null,
    petitioner_last_name: packet.petitionerLastName ?? null,
    petitioner_city: packet.petitionerCity ?? null,
    petitioner_county: packet.petitionerCounty ?? null,
    cause_number: packet.causeNumber ?? null,
    charge: packet.charge ?? null,
    offense_date: packet.offenseDate ?? null,
    arrest_date: packet.arrestDate ?? null,
    arresting_agency: packet.arrestingAgency ?? null,
    agency_case_number: packet.agencyCaseNumber ?? null,
    disposition_date: packet.dispositionDate ?? null,
    conviction_date: packet.convictionDate ?? null,
    sentence_completion_date: packet.sentenceCompletionDate ?? null,
    has_zero_balance: packet.hasZeroBalance ?? null,
    has_court_documents: packet.hasCourtDocuments ?? null,
    first_offender_signal: packet.firstOffenderSignal ?? null,
    non_traffic_signal: packet.nonTrafficSignal ?? null,
    excluded_offense_screening: packet.excludedOffenseScreening ?? null,
    one_felony_expungement_signal: packet.oneFelonyExpungementSignal ?? null,
    needs_record_review: packet.needsRecordReview,
    generated_html: packet.generatedHtml,
    generated_plain_text: packet.generatedPlainText,
    filing_instructions: packet.filingInstructions,
    county_court_instructions: packet.countyCourtInstructions,
    missing_fields: packet.missingFields,
    safety_disclaimer: packet.safetyDisclaimer,
    created_at: packet.createdAt ?? new Date().toISOString(),
    updated_at: packet.updatedAt ?? new Date().toISOString(),
    completed_at: packet.completedAt ?? null
  };
}

function packetInputRow(packet: RcapDocumentPacket, inputPayload: Partial<SourceDocumentPacketInput>) {
  return {
    document_packet_id: packet.id,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    input_payload: inputPayload
  };
}

function briefcaseItemRow(packet: RcapDocumentPacket) {
  return {
    id: packet.briefcaseId,
    user_id: packet.userId ?? null,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    document_packet_id: packet.id,
    item_type: "document_packet",
    title: `${jurisdictionLabel(packet.state)} record relief packet`,
    status: packet.status,
    state: packet.state,
    county: packet.county ?? null,
    document_type: packet.documentType ?? null,
    last_opened_at: null,
    updated_at: packet.updatedAt ?? new Date().toISOString()
  };
}

function packetAuditEventRow(packet: RcapDocumentPacket, event: PacketAuditEvent) {
  return {
    record_type: "document_packet",
    record_id: packet.id,
    partner_slug: packet.partnerSlug,
    partner_id: null,
    event_type: event.eventType,
    from_status: event.fromStatus ?? null,
    to_status: event.toStatus,
    actor: "system",
    metadata: {
      state: packet.state,
      county: packet.county ?? null,
      document_type: packet.documentType ?? null,
      pathway: packet.pathway,
      has_briefcase_item: Boolean(packet.briefcaseId),
      ...(event.eventType === "created" && event.consumerBinding ? { consumer_auth_user_id: event.consumerBinding.consumerAuthUserId, consumer_briefcase_item_id: event.consumerBinding.consumerBriefcaseItemId } : {}),
      source: "rcap_document_packet_repository"
    }
  };
}

function packetFromRow(row: SourceDocumentPacketRow): RcapDocumentPacket {
  const filingInstructions = row.filing_instructions ?? [];
  const countyCourtInstructions = row.county_court_instructions ?? [];
  const safetyDisclaimer = row.safety_disclaimer ?? "This source-driven packet shell is not legal advice and requires review before filing.";
  const filingNextStepsPacket = buildFilingNextStepsPacket({
    state: row.state,
    county: row.county ?? undefined,
    documentType: row.document_type ?? "packet_information",
    pathway: row.pathway,
    filingInstructions,
    countyCourtInstructions,
    safetyDisclaimer
  });
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    intakeSessionId: row.intake_session_id ?? undefined,
    userId: row.user_id ?? undefined,
    briefcaseId: row.briefcase_id ?? undefined,
    personId: row.person_id ?? undefined,
    state: row.state,
    county: row.county ?? undefined,
    documentType: row.document_type ?? undefined,
    pathway: row.pathway,
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    petitionerFirstName: row.petitioner_first_name ?? undefined,
    petitionerLastName: row.petitioner_last_name ?? undefined,
    petitionerCity: row.petitioner_city ?? undefined,
    petitionerCounty: row.petitioner_county ?? undefined,
    courtType: row.court_type ?? undefined,
    courtCounty: row.court_county ?? undefined,
    courtName: row.court_name ?? undefined,
    jurisdiction: row.jurisdiction ?? undefined,
    causeNumber: row.cause_number ?? undefined,
    charge: row.charge ?? undefined,
    offenseDate: row.offense_date ?? undefined,
    arrestDate: row.arrest_date ?? undefined,
    arrestingAgency: row.arresting_agency ?? undefined,
    agencyCaseNumber: row.agency_case_number ?? undefined,
    dispositionDate: row.disposition_date ?? undefined,
    convictionDate: row.conviction_date ?? undefined,
    sentenceCompletionDate: row.sentence_completion_date ?? undefined,
    hasZeroBalance: row.has_zero_balance ?? undefined,
    hasCourtDocuments: row.has_court_documents ?? undefined,
    firstOffenderSignal: row.first_offender_signal ?? undefined,
    nonTrafficSignal: row.non_traffic_signal ?? undefined,
    excludedOffenseScreening: row.excluded_offense_screening ?? undefined,
    oneFelonyExpungementSignal: row.one_felony_expungement_signal ?? undefined,
    needsRecordReview: row.needs_record_review ?? true,
    generatedHtml: row.generated_html ?? "<p>Source-driven packet plan pending review.</p>",
    generatedPlainText: row.generated_plain_text ?? "Source-driven packet plan pending review.",
    filingInstructions,
    countyCourtInstructions,
    filingNextStepsPacket,
    missingFields: row.missing_fields ?? [],
    safetyDisclaimer,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  };
}

function packetFromInput(input: SourceDocumentPacketInput): RcapDocumentPacket {
  const classification = resolveSourceDocumentClassification(input);
  const state = classification.state;
  const now = new Date().toISOString();
  const filingNextStepsPacket = buildFilingNextStepsPacket({
    state,
    county: typeof input.county === "string" ? input.county : undefined,
    documentType: classification.documentType ?? "packet_information",
    pathway: classification.pathway,
    countyCourtInstructions: ["Confirm court contact and location from the source-driven packet plan."],
    filingInstructions: ["Use the source-driven RCAP engine packet plan for this jurisdiction/pathway."],
    safetyDisclaimer: "This source-driven packet shell is not legal advice and requires review before filing."
  });
  return {
    id: crypto.randomUUID(),
    partnerSlug: input.partnerSlug,
    intakeSessionId: stringValue(input.intakeSessionId),
    userId: stringValue(input.userId),
    briefcaseId: stringValue(input.briefcaseId),
    personId: stringValue(input.personId),
    state,
    county: stringValue(input.county),
    documentType: classification.documentType,
    pathway: classification.pathway,
    status: classification.status,
    reliefOutcome: "not_recorded",
    petitionerFirstName: stringValue(input.petitionerFirstName),
    petitionerLastName: stringValue(input.petitionerLastName),
    courtType: stringValue(input.courtType),
    courtCounty: stringValue(input.courtCounty),
    courtName: stringValue(input.courtName),
    jurisdiction: stringValue(input.jurisdiction),
    causeNumber: stringValue(input.causeNumber ?? input.caseNumber ?? input.docketNumber),
    charge: stringValue(input.charge),
    offenseDate: stringValue(input.offenseDate),
    arrestDate: stringValue(input.arrestDate),
    arrestingAgency: stringValue(input.arrestingAgency),
    agencyCaseNumber: stringValue(input.agencyCaseNumber),
    dispositionDate: stringValue(input.dispositionDate),
    convictionDate: stringValue(input.convictionDate),
    sentenceCompletionDate: stringValue(input.sentenceCompletionDate),
    hasZeroBalance: booleanValue(input.hasZeroBalance),
    hasCourtDocuments: booleanValue(input.hasCourtDocuments),
    firstOffenderSignal: booleanValue(input.firstOffenderSignal),
    nonTrafficSignal: booleanValue(input.nonTrafficSignal),
    excludedOffenseScreening: booleanValue(input.excludedOffenseScreening),
    oneFelonyExpungementSignal: booleanValue(input.oneFelonyExpungementSignal),
    needsRecordReview: true,
    generatedHtml: "<p>Source-driven packet plan pending review.</p>",
    generatedPlainText: "Source-driven packet plan pending review.",
    filingInstructions: filingNextStepsPacket.afterFiling,
    countyCourtInstructions: filingNextStepsPacket.courtContactOrLocationGuidance,
    filingNextStepsPacket,
    missingFields: [],
    safetyDisclaimer: filingNextStepsPacket.safetyDisclaimer,
    createdAt: now,
    updatedAt: now
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function jurisdictionLabel(state: string) {
  if (state === "TX") return "Harris County, Texas";
  if (state === "PA") return "Pennsylvania";
  if (state === "DC") return "District of Columbia";
  if (state === "IL") return "Illinois";
  if (state === "MS") return "Mississippi";
  return state;
}

function adminRowFromPacket(packet: RcapDocumentPacket): RcapReliefOutcomeAdminRow {
  return {
    id: packet.id,
    partnerSlug: packet.partnerSlug,
    state: packet.state,
    county: packet.county,
    status: packet.status,
    reliefOutcome: packet.reliefOutcome,
    updatedAt: packet.updatedAt,
    createdAt: packet.createdAt
  };
}

function adminRowFromReliefOutcomeRow(row: ReliefOutcomePacketRow): RcapReliefOutcomeAdminRow {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    state: row.state,
    county: row.county ?? undefined,
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function activityPacketFromRow(row: DocumentActivityPacketRow): DocumentActivityPacket {
  return {
    state: row.state,
    pathway: row.pathway ?? "unknown",
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    personId: row.person_id ?? undefined,
    briefcaseId: row.briefcase_id ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function personOutcomeSummaryFromPackets(packetsForSummary: DocumentActivityPacket[]) {
  const distinctPeople = new Set<string>();
  const byOutcome = new Map<string, Set<string>>();
  for (const packet of packetsForSummary) {
    if (!packet.personId) continue;
    distinctPeople.add(packet.personId);
    const people = byOutcome.get(packet.reliefOutcome) ?? new Set<string>();
    people.add(packet.personId);
    byOutcome.set(packet.reliefOutcome, people);
  }

  const reliefOutcomePeople = Object.fromEntries(Array.from(byOutcome.entries()).map(([outcome, people]) => [outcome, people.size]));
  return {
    distinctPeople: distinctPeople.size,
    reliefOutcomePeople,
    actualReliefDeliveredPeople: (reliefOutcomePeople.relief_granted ?? 0) + (reliefOutcomePeople.relief_partially_granted ?? 0)
  };
}


function isRcapReliefOutcome(value: unknown): value is RcapReliefOutcome {
  return typeof value === "string" && rcapReliefOutcomeValues.includes(value as RcapReliefOutcome);
}

function isDeliveredReliefOutcome(value: RcapReliefOutcome) {
  return value === "relief_granted" || value === "relief_partially_granted";
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
