import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { selectComposedRoute } from "@/lib/rcap-engine/composed-route-selector";
import { evaluateExpungementAiMatter } from "@/lib/rcap-engine/expungement-ai-adapter";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";

/**
 * Server-authored route identity for a saved screening session.
 *
 * The save endpoint must not take a participant's word for which legal route
 * their result belongs to. `screening_sessions` deliberately stores inputs only
 * — no resultCode, no packet plan — so identity is re-derived here from the
 * stored answers by re-running the same engine, then handed to the
 * composed-route selector. Nothing is read from the request body.
 *
 * Every failure mode is reported rather than swallowed, because the caller
 * treats "could not resolve" differently from "resolved to no composed route".
 */

export type SessionRouteIdentity =
  | { status: "no_session"; jurisdiction: null; trackId: null }
  | { status: "session_unavailable"; jurisdiction: null; trackId: null }
  | { status: "jurisdiction_mismatch"; jurisdiction: string; trackId: null }
  | { status: "identity_unavailable"; jurisdiction: string; trackId: null }
  | { status: "resolved"; jurisdiction: string; trackId: string | null };

export async function resolveSessionRouteIdentity(
  sourceSessionId: string | undefined,
  claimedJurisdiction: string
): Promise<SessionRouteIdentity> {
  if (!sourceSessionId) return { status: "no_session", jurisdiction: null, trackId: null };

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { status: "session_unavailable", jurisdiction: null, trackId: null };

  const { data, error } = await supabase
    .from("screening_sessions")
    .select("session_id, jurisdiction, answers")
    .eq("session_id", sourceSessionId)
    .maybeSingle<{ session_id: string; jurisdiction: string; answers: Record<string, ScreeningAnswerValue> }>();

  if (error || !data) return { status: "session_unavailable", jurisdiction: null, trackId: null };

  const jurisdiction = String(data.jurisdiction ?? "").toUpperCase();
  if (jurisdiction !== String(claimedJurisdiction ?? "").trim().toUpperCase()) {
    return { status: "jurisdiction_mismatch", jurisdiction, trackId: null };
  }

  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) return { status: "resolved", jurisdiction, trackId: null };

  let pathwayId: string | null = null;
  try {
    const evaluation = evaluateExpungementAiMatter({
      jurisdiction,
      profileVersion: profile.profileVersion,
      matterId: data.session_id,
      answers: data.answers ?? {}
    });
    pathwayId = evaluation.pathwayId ?? null;
  } catch {
    // A session whose stored answers no longer evaluate cannot assert an
    // identity. Fail closed rather than guessing at the route.
    return { status: "identity_unavailable", jurisdiction, trackId: null };
  }

  const selection = selectComposedRoute({ jurisdiction, pathwayId });
  if (selection.status === "identity_unavailable") {
    return { status: "identity_unavailable", jurisdiction, trackId: null };
  }
  return { status: "resolved", jurisdiction, trackId: selection.trackId };
}
