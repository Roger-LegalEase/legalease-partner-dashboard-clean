import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Person and matter identity for a direct-to-consumer render job.
 *
 * `packet_render_jobs` was built for the partner journey, where a person is
 * resolved from partner intake and a matter is a partner's case reference. It
 * requires both, as UUIDs, and Phase 53 refuses a consumer job that supplies
 * neither. The consumer journey has neither:
 *
 *   * `rcap_persons` is keyed `(partner_slug, match_key)` with `partner_slug`
 *     NOT NULL, and a direct-to-consumer user has no partner;
 *   * the consumer `matterId` is generated in the browser and stored as
 *     truncated text, so it is neither a UUID nor server-authoritative.
 *
 * That mismatch is why the render pipeline has never had a production caller.
 * Both halves are closed here without a migration, because neither column needs
 * one: `rcap_persons.partner_slug` is plain text with no foreign key, and
 * `packet_render_jobs.matter_id` is a bare UUID with no foreign key. The tables
 * that DO constrain `partner_slug` against `partner_records` — the credit ledger
 * and consumption rows — are never written for a consumer job, which takes the
 * `zero_charge` path with a null partner.
 */

/**
 * A reserved namespace, not a partner. It exists so consumer persons get their
 * own `(partner_slug, match_key)` keyspace and can never collide with, or be
 * counted as, a real partner's people. Verified against `partner_records` so it
 * cannot silently become a real slug later.
 */
export const CONSUMER_PERSON_NAMESPACE = "expungement-ai-consumer";

/** Fixed namespace seeds. Changing either would re-identify existing rows. */
const MATTER_NAMESPACE = "rcap:consumer-matter:v1";
const PERSON_MATCH_NAMESPACE = "rcap:consumer-person:v1";

function deterministicUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  // Shaped as a v4-looking UUID: the version and variant nibbles are pinned so
  // the value is well-formed for a uuid column, while the rest stays derived.
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * The matter for a consumer packet is the Briefcase item.
 *
 * Deriving it from the item — rather than accepting the browser's `matterId` —
 * does two things at once. It keeps identity server-authoritative, and it makes
 * the Phase 52 accounting rule fall out for free: one paid item is one matter,
 * so a retry of the same item is idempotent, and the application has no way to
 * spend one payment across two matters. The database still enforces that
 * independently; this just means the route can never be the thing that tries.
 */
export function consumerMatterIdForItem(briefcaseItemId: string): string {
  return deterministicUuid(`${MATTER_NAMESPACE}:${briefcaseItemId}`);
}

export type ConsumerPersonResolution =
  | { ok: true; personId: string }
  | { ok: false; reason: string };

/**
 * Resolves the stable `rcap_persons` row for an authenticated consumer.
 *
 * Keyed on the auth user id, so it is stable across sessions and packets and
 * carries no new PII: the match key is an opaque identifier we already hold, not
 * an email or a name.
 */
/**
 * The match key is a digest, not the user id.
 *
 * `rcap_persons` carries no row-level security of its own and no explicit
 * grants — it has always relied on whatever default privileges the project
 * gives `authenticated`. That was tolerable while it held partner intake
 * identities; putting consumer rows beside them means a reader of that table
 * should not learn WHICH account each row belongs to. A digest keeps resolution
 * deterministic while making the stored value carry no account identifier.
 *
 * This is a mitigation, not a substitute for table-level RLS on `rcap_persons`,
 * which is Roger's to authorize.
 */
export function consumerPersonMatchKey(authUserId: string): string {
  return `consumer:${createHash("sha256").update(`${PERSON_MATCH_NAMESPACE}:${authUserId}`).digest("hex")}`;
}

export async function resolveConsumerPersonId(authUserId: string): Promise<ConsumerPersonResolution> {
  if (!authUserId) return { ok: false, reason: "an authenticated user id is required" };

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "the service-role Supabase client is not configured" };

  // The reserved namespace is only reserved if nothing else claims it. A real
  // partner registered under this slug would put consumer people inside a
  // partner's keyspace, where partner-scoped queries would find them — so this
  // fails closed rather than trusting the name to stay unused.
  const collision = await supabase
    .from("partner_records")
    .select("partner_slug")
    .eq("partner_slug", CONSUMER_PERSON_NAMESPACE)
    .maybeSingle<{ partner_slug: string }>();

  if (collision.data?.partner_slug) {
    return {
      ok: false,
      reason: `the reserved consumer namespace ${CONSUMER_PERSON_NAMESPACE} collides with a registered partner slug`
    };
  }

  const matchKey = consumerPersonMatchKey(authUserId);

  const existing = await supabase
    .from("rcap_persons")
    .select("id")
    .eq("partner_slug", CONSUMER_PERSON_NAMESPACE)
    .eq("match_key", matchKey)
    .maybeSingle<{ id: string }>();

  if (existing.data?.id) return { ok: true, personId: existing.data.id };

  const inserted = await supabase
    .from("rcap_persons")
    .insert({ partner_slug: CONSUMER_PERSON_NAMESPACE, match_key: matchKey })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (inserted.data?.id) return { ok: true, personId: inserted.data.id };

  // Losing an insert race is expected under concurrent requests, and the unique
  // index on (partner_slug, match_key) is what makes the retry correct rather
  // than a second person for the same human.
  const afterRace = await supabase
    .from("rcap_persons")
    .select("id")
    .eq("partner_slug", CONSUMER_PERSON_NAMESPACE)
    .eq("match_key", matchKey)
    .maybeSingle<{ id: string }>();

  if (afterRace.data?.id) return { ok: true, personId: afterRace.data.id };

  return { ok: false, reason: inserted.error?.message ?? "could not resolve a consumer person identity" };
}
