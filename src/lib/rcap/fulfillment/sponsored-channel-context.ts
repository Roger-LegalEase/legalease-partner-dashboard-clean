import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SponsoredChannelContext } from "./sponsored-channel-authority";

/** The existing service-only RPC verifies claim, owner, matter, source session,
 * partner, acquisition scope and active sponsorship. Read registration bytes independently;
 * none of this manufactures an entitlement or changes participant state. */
type SponsoredIdentity = { routeId: string; sourceSessionId: string; briefcaseItemId: string; authUserId: string };
export async function readSponsoredRouteAuthority(input: SponsoredIdentity) {
  const db = getSupabaseAdminClient();
  if (!db) return null;
  const { data, error } = await db.rpc("sponsored_packet_render_authority", {
    p_route_key: input.routeId, p_session_id: input.sourceSessionId,
    p_briefcase_item_id: input.briefcaseItemId, p_consumer_auth_user_id: input.authUserId
  });
  const row = Array.isArray(data) ? data.length === 1 ? data[0] : null : data;
  if (error || row?.valid !== true || !row.partner_slug || !row.partner_id
    || !(row.clinic_event_id === null || typeof row.clinic_event_id === "string")) return null;
  return row as { valid: true; partner_id: string; partner_slug: string; clinic_event_id: string | null };
}

export async function readSponsoredChannelContext(input: SponsoredIdentity): Promise<
  (SponsoredChannelContext & { partnerId: string }) | null
> {
  const row = await readSponsoredRouteAuthority(input);
  const db = getSupabaseAdminClient();
  if (!row || !db) return null;
  const routeRead = db.from("sponsored_packet_render_routes")
    .select("packet_specification_sha256,partner_slug,clinic_event_name,active")
    .eq("route_key", input.routeId).maybeSingle();
  if (row.clinic_event_id === null) {
    const [route, registration] = await Promise.all([routeRead, db.from("ordinary_sponsored_packet_routes")
      .select("packet_specification_sha256,active")
      .eq("route_key", input.routeId).eq("partner_slug", row.partner_slug).maybeSingle()]);
    if (route.error || !route.data?.active || registration.error || !registration.data?.active
      || registration.data.packet_specification_sha256 !== route.data.packet_specification_sha256) return null;
    return { participantUserId: input.authUserId, partnerSlug: row.partner_slug,
      acquisitionMode: "partner", eventName: null, eventId: null,
      registeredSpecificationSha256: registration.data.packet_specification_sha256, partnerId: row.partner_id };
  }
  const [route, event] = await Promise.all([routeRead, db.from("clinic_events").select("name,partner_slug")
    .eq("id", row.clinic_event_id).maybeSingle()]);
  if (route.error || !route.data?.active || event.error || !event.data || event.data.partner_slug !== row.partner_slug
    || route.data.partner_slug !== row.partner_slug || event.data.name !== route.data.clinic_event_name) return null;
  return { participantUserId: input.authUserId, partnerSlug: row.partner_slug,
    acquisitionMode: "clinic", eventName: event.data.name,
    registeredSpecificationSha256: route.data.packet_specification_sha256,
    partnerId: row.partner_id, eventId: row.clinic_event_id };
}
