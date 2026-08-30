import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Is this deployment actually able to honour a data-rights request?
 *
 * The failure this exists to prevent is a participant clicking "Delete my
 * account and personal data", being told it is running, and having it fail
 * against tables that were never migrated — or worse, partially succeed. A
 * visible control backed by unavailable tables or RPCs is a promise the
 * deployment cannot keep, and the participant has no way to know that.
 *
 * Code can deploy before its migration. So the gate is evaluated at request
 * time against the database this process is actually talking to, not against
 * what the repository contains.
 */
export type PrivacyReadiness = {
  ready: boolean;
  missing: string[];
  checked: {
    migrationPresent: boolean;
    artifactAuthorityPresent: boolean;
    proofSecretPresent: boolean;
    pseudonymSecretPresent: boolean;
  };
};

/** Both secrets are required, and both must be long enough to be worth having. */
function secretPresent(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length >= 24;
}

/**
 * Probes the database rather than trusting a build flag.
 *
 * Each probe is a read that the feature itself performs, so a pass means the
 * thing the feature needs is reachable by the credential the feature uses —
 * not that a file exists in the repository.
 */
export async function participantPrivacyReadiness(): Promise<PrivacyReadiness> {
  const missing: string[] = [];

  const proofSecretPresent = secretPresent("PARTICIPANT_PRIVACY_PROOF_SECRET");
  if (!proofSecretPresent) missing.push("PARTICIPANT_PRIVACY_PROOF_SECRET");

  const pseudonymSecretPresent = secretPresent("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET");
  if (!pseudonymSecretPresent) missing.push("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET");

  let migrationPresent = false;
  let artifactAuthorityPresent = false;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    missing.push("supabase_admin_client");
  } else {
    // The workflow table the whole feature writes to. A head-count read is
    // enough: it fails when the relation does not exist, which is exactly the
    // condition being tested.
    const { error: tableError } = await supabase
      .from("participant_privacy_requests")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    migrationPresent = !tableError;
    if (tableError) missing.push("participant_privacy_requests");

    // The artifact authority the deletion proof depends on. Called with a nil
    // uuid, which returns the absent state rather than anything about a real
    // participant; a missing function returns an error instead.
    const { error: rpcError } = await supabase.rpc("get_consumer_packet_artifact_authority", {
      p_consumer_auth_user_id: "00000000-0000-0000-0000-000000000000",
      p_briefcase_item_id: "00000000-0000-0000-0000-000000000000"
    });
    artifactAuthorityPresent = !rpcError;
    if (rpcError) missing.push("get_consumer_packet_artifact_authority");
  }

  return {
    ready: missing.length === 0,
    missing,
    checked: { migrationPresent, artifactAuthorityPresent, proofSecretPresent, pseudonymSecretPresent }
  };
}
