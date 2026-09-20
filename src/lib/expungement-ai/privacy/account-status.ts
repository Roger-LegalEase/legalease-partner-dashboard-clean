import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Is this account frozen or erased?
 *
 * Revoking sessions at the identity provider is the primary control; this is the
 * one that holds when that is not enough. A refresh token minted seconds before
 * the revocation, a cached access token still inside its lifetime, or an
 * environment restored from a backup taken before the erasure all produce a
 * request that looks authenticated. Checking the tombstone on the way into every
 * authenticated participant surface is what turns those into a refusal.
 *
 * Fails OPEN when Supabase is unconfigured, and only then: a local shell with no
 * database has no tombstones, and locking every developer out of the Briefcase
 * would be a worse answer than the one honest fact available. Anywhere the admin
 * client exists — which is everywhere an account can actually be deleted — a
 * tombstone is authoritative.
 */
export async function isParticipantAccountBlocked(userId: string): Promise<boolean> {
  if (!userId) return false;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("participant_account_is_blocked", { p_user_id: userId });
  if (error) return false;
  return data === true;
}
