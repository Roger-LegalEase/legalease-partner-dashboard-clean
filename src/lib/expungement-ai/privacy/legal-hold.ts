import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type LegalHold = {
  id: string;
  matterScopeItemId: string | null;
  reason: string;
  placedAt: string;
};

export type LegalHoldCheck = {
  /** An account-wide hold. Blocks account deletion outright. */
  accountHolds: LegalHold[];
  /** Matter-scoped holds, keyed by the Briefcase item they preserve. */
  matterHolds: LegalHold[];
  checkedAt: string;
};

/**
 * A hold outranks an erasure request, and the check is recorded whether or not
 * it finds anything. "We looked and there was nothing" is a different fact from
 * "nobody looked", and only one of them is a defensible answer later.
 */
export async function checkLegalHolds(
  supabase: SupabaseClient,
  userId: string
): Promise<LegalHoldCheck> {
  const { data, error } = await supabase
    .from("participant_legal_holds")
    .select("id, matter_scope_item_id, reason, placed_at")
    .eq("user_id", userId)
    .is("released_at", null);

  if (error) {
    // Fail closed. A hold table we cannot read is treated as a hold, because the
    // alternative is deleting records we may have been ordered to preserve.
    throw new Error(`the legal-hold check could not be completed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    matter_scope_item_id: string | null;
    reason: string;
    placed_at: string;
  }>;

  const holds = rows.map((row) => ({
    id: row.id,
    matterScopeItemId: row.matter_scope_item_id,
    reason: row.reason,
    placedAt: row.placed_at
  }));

  return {
    accountHolds: holds.filter((hold) => hold.matterScopeItemId === null),
    matterHolds: holds.filter((hold) => hold.matterScopeItemId !== null),
    checkedAt: new Date().toISOString()
  };
}

export function holdCoveringMatter(check: LegalHoldCheck, matterItemId: string): LegalHold | null {
  return (
    check.accountHolds[0] ??
    check.matterHolds.find((hold) => hold.matterScopeItemId === matterItemId) ??
    null
  );
}

export function summarizeHolds(holds: LegalHold[]): string {
  if (holds.length === 0) return "No preservation obligation applies to this account.";
  return holds.map((hold) => hold.reason).join(" ");
}
