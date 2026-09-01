import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  privacyConfigReady,
  type PrivacyProcessorConfigName
} from "@/lib/expungement-ai/privacy/processor-config";

export const PARTICIPANT_ACCOUNT_DELETION_CONTRACT_VERSION =
  "20260901180000.partial-deletion.v3";

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
  /** Account deletion is the strict superset and remains the legacy alias. */
  ready: boolean;
  baseReady: boolean;
  accountDeletionReady: boolean;
  missing: string[];
  baseMissing: string[];
  checked: {
    migrationPresent: boolean;
    partialStateContractPresent: boolean;
    artifactAuthorityPresent: boolean;
    proofSecretPresent: boolean;
    pseudonymSecretPresent: boolean;
    processorConfigPresent: boolean;
    processorConfig: Record<PrivacyProcessorConfigName, boolean>;
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
  const baseMissing: string[] = [];

  const proofSecretPresent = secretPresent("PARTICIPANT_PRIVACY_PROOF_SECRET");
  if (!proofSecretPresent) baseMissing.push("PARTICIPANT_PRIVACY_PROOF_SECRET");

  const pseudonymSecretPresent = secretPresent("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET");
  if (!pseudonymSecretPresent) baseMissing.push("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET");

  const processorConfig = privacyConfigReady();

  let migrationPresent = false;
  let partialStateContractPresent = false;
  let artifactAuthorityPresent = false;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    baseMissing.push("supabase_admin_client");
  } else {
    // The workflow table the whole feature writes to. A head-count read is
    // enough: it fails when the relation does not exist, which is exactly the
    // condition being tested.
    const { error: tableError } = await supabase
      .from("participant_privacy_requests")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    migrationPresent = !tableError;
    if (tableError) baseMissing.push("participant_privacy_requests");

    // The table and generic step recorder both existed before resumable partial
    // deletion. Only this exact service-role RPC proves that the matching
    // status transition, live indexes and resume semantics are installed.
    const { data: contractVersion, error: contractError } = await supabase.rpc(
      "participant_account_deletion_contract_version"
    );
    partialStateContractPresent =
      !contractError && contractVersion === PARTICIPANT_ACCOUNT_DELETION_CONTRACT_VERSION;
    // The artifact authority the deletion proof depends on. Called with a nil
    // uuid, which returns the absent state rather than anything about a real
    // participant; a missing function returns an error instead.
    const { error: rpcError } = await supabase.rpc("get_consumer_packet_artifact_authority", {
      p_consumer_auth_user_id: "00000000-0000-0000-0000-000000000000",
      p_briefcase_item_id: "00000000-0000-0000-0000-000000000000"
    });
    artifactAuthorityPresent = !rpcError;
    if (rpcError) baseMissing.push("get_consumer_packet_artifact_authority");
  }

  const missing = [...baseMissing];
  // Account deletion alone needs the partial-state/resume contract. Export and
  // single-matter deletion keep using the base privacy ledger.
  if (!partialStateContractPresent) {
    missing.push(`participant_account_deletion_contract:${PARTICIPANT_ACCOUNT_DELETION_CONTRACT_VERSION}`);
  }
  missing.push(...processorConfig.missing);
  const baseReady = baseMissing.length === 0;
  const accountDeletionReady = missing.length === 0;

  return {
    ready: accountDeletionReady,
    baseReady,
    accountDeletionReady,
    missing,
    baseMissing,
    checked: {
      migrationPresent,
      partialStateContractPresent,
      artifactAuthorityPresent,
      proofSecretPresent,
      pseudonymSecretPresent,
      processorConfigPresent: processorConfig.ready,
      processorConfig: processorConfig.checked
    }
  };
}
