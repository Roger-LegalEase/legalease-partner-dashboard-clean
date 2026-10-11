import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Financial authority is separate from immutable Clinic acquisition. A cap
 * decision grants checkout eligibility only, never payment or packet access. */
export async function clinicPacketDtcAuthorized(userId: string, itemId: string): Promise<boolean> {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Packet funding authority is unavailable.");
  const { data, error } = await db.rpc("clinic_packet_dtc_authorized", { p_item: itemId, p_owner: userId });
  if (error || typeof data !== "boolean") throw new Error("Packet funding authority is unavailable.");
  return data;
}

/** Same protected funding interpretation used by payment recording. This is a
 * read-only classification, never a payment or a sponsored packet entitlement. */
export async function rcapConsumerPacketAuthorized(userId: string, itemId: string): Promise<boolean> {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Packet funding authority is unavailable.");
  const { data, error } = await db.rpc("rcap_consumer_packet_authorized", { p_item: itemId, p_owner: userId });
  if (error || typeof data !== "boolean") throw new Error("Packet funding authority is unavailable.");
  return data;
}

export class SponsorCapacityRequiresCheckoutError extends Error {
  constructor() { super("Sponsor capacity is exhausted. Continue with checkout for this same verified matter."); }
}

export async function reserveClinicPacketFunding(userId: string, itemId: string, verificationHash: string) {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("Packet funding authority is unavailable.");
  const { data, error } = await db.rpc("allocate_clinic_packet_funding", {
    p_briefcase_item_id: itemId, p_consumer_auth_user_id: userId, p_expected_verification_hash: verificationHash
  });
  const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (error || !row || !["sponsored", "dtc"].includes(row.funding_mode)) {
    throw new Error("Packet funding authority could not be confirmed.");
  }
  if (row.funding_mode === "dtc") throw new SponsorCapacityRequiresCheckoutError();
}
