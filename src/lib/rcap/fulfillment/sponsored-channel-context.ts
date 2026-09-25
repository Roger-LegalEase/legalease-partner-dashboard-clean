import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SponsoredChannelContext } from "./sponsored-channel-authority";

/** The existing service-only RPC verifies claim, owner, matter, source session,
 * partner, event and active sponsorship. Read registration bytes independently;
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
  if (error || row?.valid !== true || !row.partner_slug || !row.partner_id || !row.clinic_event_id) return null;
  return row as { valid: true; partner_id: string; partner_slug: string; clinic_event_id: string };
}

export async function readSponsoredChannelContext(input: SponsoredIdentity): Promise<
  (SponsoredChannelContext & { partnerId: string; eventId: string }) | null
> {
  const row = await readSponsoredRouteAuthority(input);
  const db = getSupabaseAdminClient();
  if (!row || !db) return null;
  const [event, route] = await Promise.all([
    db.from("clinic_events").select("name,partner_slug").eq("id", row.clinic_event_id).maybeSingle(),
    db.from("sponsored_packet_render_routes").select("packet_specification_sha256,partner_slug,clinic_event_name,active")
      .eq("route_key", input.routeId).maybeSingle()
  ]);
  if (event.error || route.error || !event.data || !route.data || !route.data.active
    || event.data.partner_slug !== row.partner_slug || route.data.partner_slug !== row.partner_slug
    || event.data.name !== route.data.clinic_event_name) return null;
  return { participantUserId: input.authUserId, partnerSlug: row.partner_slug,
    eventName: event.data.name, registeredSpecificationSha256: route.data.packet_specification_sha256,
    partnerId: row.partner_id, eventId: row.clinic_event_id };
}
