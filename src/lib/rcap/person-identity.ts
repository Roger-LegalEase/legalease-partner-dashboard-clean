import type { getSupabaseAdminClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type RcapPersonIdentityInput = {
  partnerSlug: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
};

export type RcapPersonOutcomeSummary = {
  distinctPeople: number;
  reliefOutcomePeople: Record<string, number>;
  actualReliefDeliveredPeople: number;
};

export type RcapPersonOutcomeSummaryOptions = {
  startAt?: string;
  endAt?: string;
  state?: string;
};

export function deriveRcapPersonMatchKey(input: RcapPersonIdentityInput): string | null {
  const email = normalizeEmail(input.email);
  if (email) return `email:${email}`;

  const name = normalizeName(input.displayName ?? [input.firstName, input.lastName].filter(Boolean).join(" "));
  return name ? `name:${name}` : null;
}

export async function resolveRcapPersonId(
  supabase: SupabaseClient,
  input: RcapPersonIdentityInput
): Promise<{ personId?: string; matchKey?: string } | { error: string }> {
  const matchKey = deriveRcapPersonMatchKey(input);
  if (!matchKey) return {};

  const { data, error } = await supabase
    .from("rcap_persons")
    .upsert(
      {
        partner_slug: input.partnerSlug,
        match_key: matchKey
      },
      { onConflict: "partner_slug,match_key" }
    )
    .select("id, match_key")
    .single();

  if (error || !data) return { error: error?.message ?? "Unable to resolve RCAP person identity." };
  const row = data as { id: string; match_key: string };
  return { personId: row.id, matchKey: row.match_key };
}

export async function getRcapPersonOutcomeSummary(
  supabase: SupabaseClient,
  partnerSlug: string,
  options: RcapPersonOutcomeSummaryOptions = {}
): Promise<RcapPersonOutcomeSummary> {
  let query = supabase
    .from("rcap_document_packets")
    .select("person_id, relief_outcome, state, created_at")
    .eq("partner_slug", partnerSlug)
    .not("person_id", "is", null);
  if (options.startAt) query = query.gte("created_at", options.startAt);
  if (options.endAt) query = query.lte("created_at", options.endAt);
  if (options.state && options.state !== "All States") query = query.eq("state", options.state);

  const { data, error } = await query;

  if (error || !data) {
    return {
      distinctPeople: 0,
      reliefOutcomePeople: {},
      actualReliefDeliveredPeople: 0
    };
  }

  const distinctPeople = new Set<string>();
  const byOutcome = new Map<string, Set<string>>();
  for (const row of data as Array<{ person_id: string | null; relief_outcome: string | null }>) {
    if (!row.person_id) continue;
    distinctPeople.add(row.person_id);
    const outcome = row.relief_outcome ?? "not_recorded";
    const people = byOutcome.get(outcome) ?? new Set<string>();
    people.add(row.person_id);
    byOutcome.set(outcome, people);
  }

  const reliefOutcomePeople = Object.fromEntries(Array.from(byOutcome.entries()).map(([outcome, people]) => [outcome, people.size]));
  return {
    distinctPeople: distinctPeople.size,
    reliefOutcomePeople,
    actualReliefDeliveredPeople: (reliefOutcomePeople.relief_granted ?? 0) + (reliefOutcomePeople.relief_partially_granted ?? 0)
  };
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function normalizeName(value: string | null | undefined) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized && normalized.length >= 2 ? normalized : null;
}
